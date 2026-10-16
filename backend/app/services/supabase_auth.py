"""Llamadas a Supabase Auth (GoTrue) desde el backend.

El inicio de sesión y el registro pasan por el backend para poder auditarlos
(incluidos los intentos fallidos, con su IP) y bloquear ataques de fuerza bruta.
"""
import httpx

from app.config import get_settings


class ErrorAuth(Exception):
    def __init__(self, status: int, codigo: str, mensaje: str = ""):
        super().__init__(mensaje or codigo)
        self.status, self.codigo = status, codigo


def _base() -> str:
    return get_settings().supabase_url + "/auth/v1"


def _cabeceras_anon() -> dict:
    return {"apikey": get_settings().supabase_anon_key}


def _cabeceras_servicio() -> dict:
    return get_settings().cabeceras_servicio


async def _pedir(metodo: str, url: str, **kw) -> dict:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.request(metodo, url, **kw)
    datos = r.json() if r.content else {}
    if r.status_code >= 400:
        codigo = datos.get("error_code") or datos.get("code") or datos.get("error") or "error"
        raise ErrorAuth(r.status_code, str(codigo), datos.get("msg") or datos.get("message") or "")
    return datos


async def iniciar_sesion(email: str, password: str) -> dict:
    return await _pedir("POST", _base() + "/token", params={"grant_type": "password"},
                        json={"email": email, "password": password}, headers=_cabeceras_anon())


async def registrar(email: str, password: str, nombre: str, redirigir_a: str | None) -> dict:
    params = {"redirect_to": redirigir_a} if redirigir_a else None
    return await _pedir("POST", _base() + "/signup", params=params, headers=_cabeceras_anon(),
                        json={"email": email, "password": password, "data": {"nombre": nombre}})


async def listar_usuarios() -> list[dict]:
    datos = await _pedir("GET", _base() + "/admin/users", params={"page": 1, "per_page": 500},
                         headers=_cabeceras_servicio())
    return datos.get("users", [])


async def cambiar_bloqueo(user_id: str, bloquear: bool) -> None:
    # Un usuario bloqueado ("baneado") no puede iniciar sesión ni renovar su sesión
    await _pedir("PUT", _base() + f"/admin/users/{user_id}", headers=_cabeceras_servicio(),
                 json={"ban_duration": "876000h" if bloquear else "none"})
