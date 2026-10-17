"""Inicio de sesión auditado, bloqueo por fuerza bruta y acceso al panel de administración."""
import os
import time

os.environ.setdefault("SUPABASE_JWT_SECRET", "secreto-de-prueba-con-32-caracteres!!")

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import admin as admin_router  # noqa: E402
from app.security import fuerza_bruta, roles  # noqa: E402
from app.services import auditoria, supabase_auth  # noqa: E402
from app.services.supabase_auth import ErrorAuth  # noqa: E402

PASSWORD_OK = "Clave-Segura1"


def token(sub):
    datos = {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 3600, "email": f"{sub}@x.com"}
    return jwt.encode(datos, get_settings().supabase_jwt_secret, algorithm="HS256")


@pytest.fixture
def entorno(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "supabase_url", "https://demo.supabase.co")
    monkeypatch.setattr(s, "supabase_anon_key", "anon")
    monkeypatch.setattr(s, "supabase_jwt_secret", "secreto-de-prueba-con-32-caracteres!!")
    eventos = []

    async def registrar(fila):
        eventos.append(fila)

    async def iniciar_sesion(email, password):
        if password != PASSWORD_OK:
            raise ErrorAuth(400, "invalid_credentials", "Invalid login credentials")
        return {"access_token": "a", "refresh_token": "r", "expires_in": 3600, "user": {"id": "u-1"}}

    monkeypatch.setattr(auditoria, "registrar", registrar)
    monkeypatch.setattr(supabase_auth, "iniciar_sesion", iniciar_sesion)
    fuerza_bruta._fallos.clear()
    with TestClient(app) as c:
        yield c, eventos


def test_login_correcto_se_audita(entorno):
    c, eventos = entorno
    r = c.post("/auth/login", json={"email": "Ana@X.com", "password": PASSWORD_OK},
               headers={"X-Forwarded-For": "1.1.1.1, 200.10.20.30"})
    assert r.status_code == 200 and r.json()["access_token"] == "a"
    ev = eventos[-1]
    assert ev["accion"] == "login" and ev["estado"] == "exito" and ev["email"] == "ana@x.com"
    assert ev["ip"] == "200.10.20.30"  # la IP falsificada por el cliente se ignora


def test_contrasena_incorrecta_se_audita_y_bloquea(entorno):
    c, eventos = entorno
    codigos = [c.post("/auth/login", json={"email": "b@x.com", "password": "mal"}).status_code
               for _ in range(get_settings().login_max_fallos)]
    assert codigos == [401] * get_settings().login_max_fallos
    assert [e["estado"] for e in eventos] == ["fallo"] * get_settings().login_max_fallos

    # Bloqueado aunque ahora ponga la contraseña correcta
    r = c.post("/auth/login", json={"email": "b@x.com", "password": PASSWORD_OK})
    assert r.status_code == 429 and eventos[-1]["estado"] == "bloqueado"
    # Otro correo no se ve afectado
    assert c.post("/auth/login", json={"email": "c@x.com", "password": PASSWORD_OK}).status_code == 200


def test_registro_exige_contrasena_segura(entorno):
    c, _ = entorno
    r = c.post("/auth/registro", json={"nombre": "Ana", "email": "a@x.com", "password": "12345678"})
    assert r.status_code == 422


def test_admin_rechaza_usuario_normal(entorno, monkeypatch):
    c, _ = entorno

    async def rol_de(usuario):
        return "usuario"

    monkeypatch.setattr(roles, "rol_de", rol_de)
    r = c.get("/admin/auditoria", headers={"Authorization": f"Bearer {token('u-normal')}"})
    assert r.status_code == 403


def test_admin_sin_token_rechaza(entorno):
    c, _ = entorno
    assert c.get("/admin/resumen").status_code == 401


def test_admin_accede_y_filtra(entorno, monkeypatch):
    c, _ = entorno
    pedido = {}

    async def rol_de(usuario):
        return "admin"

    async def consultar(tok, tabla, params):
        pedido.update(params, tabla=tabla)
        return [{"id": 1, "accion": "login", "estado": "fallo"}]

    monkeypatch.setattr(roles, "rol_de", rol_de)
    monkeypatch.setattr(admin_router, "consultar", consultar)
    r = c.get("/admin/auditoria?accion=login&estado=fallo&limite=10",
              headers={"Authorization": f"Bearer {token('u-admin')}"})
    assert r.status_code == 200 and r.json()[0]["accion"] == "login"
    assert pedido["tabla"] == "auditoria" and pedido["accion"] == "eq.login" and pedido["limit"] == "10"

    # Un filtro inventado no llega a la base de datos
    pedido.clear()
    c.get("/admin/auditoria?accion=drop", headers={"Authorization": f"Bearer {token('u-admin')}"})
    assert "accion" not in pedido


def test_admin_no_puede_desactivarse_a_si_mismo(entorno, monkeypatch):
    c, _ = entorno
    monkeypatch.setattr(get_settings(), "supabase_service_role_key", "servicio")

    async def rol_de(usuario):
        return "admin"

    monkeypatch.setattr(roles, "rol_de", rol_de)
    r = c.post("/admin/usuarios/u-admin/estado", json={"activo": False},
               headers={"Authorization": f"Bearer {token('u-admin')}"})
    assert r.status_code == 400


def test_admin_amenazas_simuladas(entorno, monkeypatch):
    c, _ = entorno

    async def rol_de(usuario):
        return "admin"

    monkeypatch.setattr(roles, "rol_de", rol_de)
    r = c.get("/admin/amenazas?simulado=true", headers={"Authorization": f"Bearer {token('u-admin')}"})
    d = r.json()
    assert r.status_code == 200 and d["fuente"] == "simulado" and d["resumen"]["alto"] >= 3
    # Un usuario normal no puede verlo
    async def rol_usuario(usuario):
        return "usuario"

    monkeypatch.setattr(roles, "rol_de", rol_usuario)
    assert c.get("/admin/amenazas?simulado=true",
                 headers={"Authorization": f"Bearer {token('u-normal')}"}).status_code == 403


def test_admin_amenazas_lee_la_auditoria_paginada(entorno, monkeypatch):
    c, _ = entorno
    pedidos = []

    async def rol_de(usuario):
        return "admin"

    async def consultar(tok, tabla, params):
        pedidos.append(params)
        n = 1000 if len(pedidos) == 1 else 3
        return [{"fecha": "2026-10-01T10:00:00+00:00", "accion": "login", "estado": "exito",
                 "email": "a@b.com", "ip": f"10.0.0.{i % 50}", "agente": "Mozilla/5.0"} for i in range(n)]

    monkeypatch.setattr(roles, "rol_de", rol_de)
    monkeypatch.setattr(admin_router, "consultar", consultar)
    d = c.get("/admin/amenazas?dias=3", headers={"Authorization": f"Bearer {token('u-admin')}"}).json()
    assert d["fuente"] == "real" and d["resumen"]["eventos"] == 1003
    assert [p["offset"] for p in pedidos] == ["0", "1000"]
