"""Registro de auditoría en Supabase (tabla public.analisis).

Se usa el JWT del propio usuario (no una clave de servicio), así Postgres aplica
Row Level Security: cada usuario solo puede insertar y leer sus propios análisis.
"""
import logging

import httpx

from app.config import get_settings
from app.security.auth import Usuario

log = logging.getLogger("servicios.historial")


def _headers(usuario: Usuario) -> dict:
    s = get_settings()
    return {
        "apikey": s.supabase_anon_key,
        "Authorization": f"Bearer {usuario.token}",
        "Content-Type": "application/json",
    }


def _url() -> str:
    return get_settings().supabase_url.rstrip("/") + "/rest/v1/analisis"


async def registrar_analisis(usuario: Usuario, resultado: dict, imagen_sha256: str,
                             modelo_sha256: str, nombre_archivo: str | None) -> str | None:
    if not get_settings().supabase_url:
        return None
    fila = {
        "user_id": usuario.id,
        "clase": resultado["clase"],
        "cultivo": resultado["cultivo"],
        "saludable": resultado["saludable"],
        "confianza": resultado["confianza"],
        "baja_certeza": resultado["baja_certeza"],
        "top3": resultado["top3"],
        "imagen_sha256": imagen_sha256,
        "modelo_sha256": modelo_sha256,
        "nombre_archivo": (nombre_archivo or "")[:200],
    }
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(_url(), json=fila,
                             headers=_headers(usuario) | {"Prefer": "return=representation"})
            r.raise_for_status()
            return r.json()[0]["id"]
    except Exception as e:  # el diagnóstico no debe fallar si la auditoría falla
        log.error("No se pudo registrar el análisis: %s", e)
        return None


async def listar_analisis(usuario: Usuario, limite: int = 50) -> list[dict]:
    if not get_settings().supabase_url:
        return []
    params = {"select": "*", "order": "created_at.desc", "limit": str(limite)}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(_url(), params=params, headers=_headers(usuario))
        r.raise_for_status()
        return r.json()
