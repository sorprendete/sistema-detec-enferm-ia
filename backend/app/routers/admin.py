"""Panel de administración: estadísticas, usuarios y registro de auditoría."""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request

from app.config import get_settings
from app.schemas.auth import CambioEstado
from app.security.auth import Usuario
from app.security.roles import admin_actual
from app.services import amenazas, auditoria, simulacion, supabase_auth
from app.services.supabase_db import actualizar_como_servicio, consultar, contar

router = APIRouter(prefix="/admin", tags=["administración"])
log = logging.getLogger("api.admin")

ACCIONES = {"login", "registro", "logout", "predict", "admin"}
ESTADOS = {"exito", "fallo", "bloqueado"}


@router.get("/resumen")
async def resumen(admin: Usuario = Depends(admin_actual)):
    hace_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    t = admin.token
    try:
        usuarios, analisis, sanos, no_conc, fallidos, bloqueos = await asyncio.gather(
            contar(t, "perfiles"),
            contar(t, "analisis"),
            contar(t, "analisis", {"saludable": "eq.true"}),
            contar(t, "analisis", {"clase": "eq.No_concluyente"}),
            contar(t, "auditoria", {"accion": "eq.login", "estado": "eq.fallo", "fecha": f"gte.{hace_24h}"}),
            contar(t, "auditoria", {"estado": "eq.bloqueado", "fecha": f"gte.{hace_24h}"}),
        )
    except Exception as e:
        log.error("Resumen: %s", e)
        raise HTTPException(502, "No se pudieron calcular las estadísticas.")
    return {
        "usuarios": usuarios,
        "analisis": analisis,
        "sanos": sanos,
        "enfermos": analisis - sanos - no_conc,
        "no_concluyentes": no_conc,
        "logins_fallidos_24h": fallidos,
        "bloqueos_24h": bloqueos,
    }


@router.get("/usuarios")
async def usuarios(admin: Usuario = Depends(admin_actual)):
    try:
        perfiles = await consultar(admin.token, "perfiles", {
            "select": "id,nombre,email,rol,activo,creado_en", "order": "creado_en.desc"})
    except Exception as e:
        log.error("Usuarios: %s", e)
        raise HTTPException(502, "No se pudo consultar la lista de usuarios.")

    # Último acceso y correo confirmado vienen de Supabase Auth (requiere la clave de servicio)
    extra = {}
    if get_settings().supabase_service_role_key:
        try:
            extra = {u["id"]: u for u in await supabase_auth.listar_usuarios()}
        except Exception as e:
            log.error("Supabase Auth admin: %s", e)
    return [
        p | {
            "ultimo_acceso": extra.get(p["id"], {}).get("last_sign_in_at"),
            "correo_confirmado": bool(extra.get(p["id"], {}).get("email_confirmed_at")) if extra else None,
        }
        for p in perfiles
    ]


@router.get("/auditoria")
async def registro_auditoria(
    limite: int = Query(100, ge=1, le=500),
    desde: int = Query(0, ge=0),
    accion: str | None = None,
    estado: str | None = None,
    admin: Usuario = Depends(admin_actual),
):
    params = {"select": "id,fecha,accion,estado,email,ip,agente,detalle", "order": "fecha.desc",
              "limit": str(limite), "offset": str(desde)}
    if accion in ACCIONES:
        params["accion"] = f"eq.{accion}"
    if estado in ESTADOS:
        params["estado"] = f"eq.{estado}"
    try:
        return await consultar(admin.token, "auditoria", params)
    except Exception as e:
        log.error("Auditoría: %s", e)
        raise HTTPException(502, "No se pudo consultar el registro de auditoría.")


@router.post("/usuarios/{user_id}/estado")
async def cambiar_estado(user_id: str, datos: CambioEstado, request: Request,
                         tareas: BackgroundTasks, admin: Usuario = Depends(admin_actual)):
    if not get_settings().supabase_service_role_key:
        raise HTTPException(503, "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.")
    if user_id == admin.id:
        raise HTTPException(400, "No puedes desactivar tu propia cuenta de administrador.")
    filas = await consultar(admin.token, "perfiles", {"select": "email,rol", "id": f"eq.{user_id}"})
    if not filas:
        raise HTTPException(404, "Usuario no encontrado.")
    try:
        await supabase_auth.cambiar_bloqueo(user_id, bloquear=not datos.activo)
        await actualizar_como_servicio("perfiles", {"id": f"eq.{user_id}"}, {"activo": datos.activo})
    except Exception as e:
        log.error("Cambio de estado: %s", e)
        raise HTTPException(502, "No se pudo cambiar el estado del usuario.")
    tareas.add_task(auditoria.registrar, auditoria.evento(
        request, "admin", "exito", user_id=admin.id, email=admin.email,
        detalle=f"Cuenta {filas[0]['email']} {'activada' if datos.activo else 'desactivada'}."))
    return {"id": user_id, "activo": datos.activo}


@router.get("/amenazas")
async def detectar_amenazas(
    dias: int = Query(7, ge=1, le=90),
    simulado: bool = False,
    admin: Usuario = Depends(admin_actual),
):
    """Analiza la auditoría con reglas + Isolation Forest y devuelve las IPs sospechosas.

    simulado=true usa tráfico de prueba (services/simulacion.py) sin leer ni escribir la base
    de datos, para la demostración cuando todavía hay poco historial real.
    """
    if simulado:
        eventos = simulacion.generar(dias=dias)
    else:
        desde = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
        eventos, pagina = [], 1000
        try:
            while len(eventos) < 20_000:  # Supabase devuelve como máximo 1000 filas por consulta
                lote = await consultar(admin.token, "auditoria", {
                    "select": "fecha,accion,estado,email,ip,agente", "fecha": f"gte.{desde}",
                    "order": "fecha.asc", "limit": str(pagina), "offset": str(len(eventos))})
                eventos += lote
                if len(lote) < pagina:
                    break
        except Exception as e:
            log.error("Amenazas: %s", e)
            raise HTTPException(502, "No se pudo leer el registro de auditoría.")
    informe = await asyncio.to_thread(amenazas.analizar, eventos)
    return {"fuente": "simulado" if simulado else "real", "dias": dias, **informe}
