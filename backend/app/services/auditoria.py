"""Registro de auditoría (tabla public.auditoria).

Solo el backend escribe aquí, con la clave de servicio; desde la aplicación nadie
puede editar ni borrar eventos y únicamente el administrador puede leerlos.
Si la clave no está configurada, el evento se escribe solo en el log del servidor.
"""
import logging

import httpx
from fastapi import Request

from app.config import get_settings
from app.security.red import agente, ip_cliente

log = logging.getLogger("auditoria")


def evento(request: Request, accion: str, estado: str, *, user_id: str | None = None,
           email: str | None = None, detalle: str | None = None) -> dict:
    return {
        "accion": accion,
        "estado": estado,
        "user_id": user_id,
        "email": (email or "")[:254] or None,
        "ip": ip_cliente(request),
        "agente": agente(request),
        "detalle": (detalle or "")[:500] or None,
    }


async def registrar(fila: dict) -> None:
    """Se ejecuta en segundo plano: nunca retrasa ni hace fallar la respuesta."""
    log.info("%s %s email=%s ip=%s %s", fila["accion"], fila["estado"], fila["email"],
             fila["ip"], fila["detalle"] or "")
    s = get_settings()
    if not (s.supabase_url and s.supabase_service_role_key):
        return
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(s.supabase_url + "/rest/v1/auditoria", json=fila,
                             headers=s.cabeceras_servicio | {"Prefer": "return=minimal"})
            r.raise_for_status()
    except Exception as e:
        log.error("No se pudo guardar el evento de auditoría: %s", e)
