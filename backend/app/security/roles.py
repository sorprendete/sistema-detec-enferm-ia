"""Control de acceso por rol: solo el administrador entra a /admin."""
import logging

from fastapi import Depends, HTTPException, status

from app.config import get_settings
from app.security.auth import Usuario, usuario_actual
from app.services.supabase_db import consultar

log = logging.getLogger("seguridad.roles")


async def rol_de(usuario: Usuario) -> str | None:
    if not get_settings().supabase_url:
        return None
    filas = await consultar(usuario.token, "perfiles",
                            {"select": "rol,activo", "id": f"eq.{usuario.id}"})
    if not filas or not filas[0].get("activo"):
        return None
    return filas[0].get("rol")


async def admin_actual(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    # La base de datos lo vuelve a comprobar con RLS (función es_admin): doble barrera.
    try:
        rol = await rol_de(usuario)
    except Exception as e:
        log.error("No se pudo verificar el rol: %s", e)
        rol = None
    if rol != "admin":
        log.warning("Acceso denegado a /admin: usuario=%s", usuario.id)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el administrador puede ver esta sección.")
    return usuario
