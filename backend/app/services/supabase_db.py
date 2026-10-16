"""Consultas a la base de datos (PostgREST) con el JWT del usuario: se aplica RLS."""
import httpx

from app.config import get_settings


def _cabeceras(token: str) -> dict:
    return {"apikey": get_settings().supabase_anon_key, "Authorization": f"Bearer {token}"}


async def consultar(token: str, tabla: str, params: dict) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{get_settings().supabase_url}/rest/v1/{tabla}", params=params,
                        headers=_cabeceras(token))
        r.raise_for_status()
        return r.json()


async def contar(token: str, tabla: str, filtros: dict | None = None) -> int:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.head(f"{get_settings().supabase_url}/rest/v1/{tabla}",
                         params={"select": "*", **(filtros or {})},
                         headers=_cabeceras(token) | {"Prefer": "count=exact"})
        r.raise_for_status()
    # Content-Range: 0-24/137  ó  */0
    return int(r.headers.get("content-range", "*/0").split("/")[-1])


async def actualizar_como_servicio(tabla: str, filtros: dict, cambios: dict) -> None:
    s = get_settings()
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.patch(f"{s.supabase_url}/rest/v1/{tabla}", params=filtros, json=cambios,
                          headers=s.cabeceras_servicio | {"Prefer": "return=minimal"})
        r.raise_for_status()
