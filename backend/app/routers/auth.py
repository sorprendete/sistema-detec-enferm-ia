"""Inicio de sesión, registro y cierre de sesión auditados."""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from app.config import get_settings
from app.schemas.auth import Credenciales, NuevoUsuario, RespuestaRegistro, Sesion
from app.security import fuerza_bruta
from app.security.auth import Usuario, usuario_actual
from app.security.rate_limit import permitir
from app.security.red import ip_cliente
from app.services import auditoria, supabase_auth
from app.services.supabase_auth import ErrorAuth

router = APIRouter(prefix="/auth", tags=["autenticación"])
log = logging.getLogger("api.auth")

# Mensajes al usuario según el código de Supabase Auth
_MENSAJES = {
    "invalid_credentials": (401, "Correo o contraseña incorrectos."),
    "email_not_confirmed": (403, "Debes confirmar tu correo antes de iniciar sesión."),
    "user_banned": (403, "Tu cuenta está desactivada. Contacta al administrador."),
}


def _configurado():
    s = get_settings()
    if not (s.supabase_url and s.supabase_anon_key):
        raise HTTPException(503, "La autenticación no está configurada en el servidor.")


def _limitar_ip(request: Request, ruta: str, limite: int = 20):
    ok, espera = permitir(f"{ruta}:{ip_cliente(request)}", limite)
    if not ok:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            f"Demasiados intentos desde tu red. Espera {espera} s.",
                            headers={"Retry-After": str(espera)})


@router.post("/login", response_model=Sesion)
async def login(datos: Credenciales, request: Request):
    _configurado()
    _limitar_ip(request, "login")

    # Los fallos terminan en una excepción, que no ejecuta tareas en segundo plano:
    # por eso el evento se guarda antes de responder.
    async def ev(estado: str, **kw):
        await auditoria.registrar(auditoria.evento(request, "login", estado, email=datos.email, **kw))

    espera = fuerza_bruta.segundos_bloqueado(datos.email)
    if espera:
        await ev("bloqueado", detalle="Cuenta bloqueada temporalmente por intentos fallidos.")
        minutos = max(1, round(espera / 60))
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            f"Demasiados intentos fallidos. Inténtalo de nuevo en {minutos} min.",
                            headers={"Retry-After": str(espera)})
    try:
        r = await supabase_auth.iniciar_sesion(datos.email, datos.password)
    except ErrorAuth as e:
        codigo, mensaje = _MENSAJES.get(e.codigo, (502, "No se pudo iniciar sesión. Inténtalo más tarde."))
        if e.codigo == "invalid_credentials":
            quedan = fuerza_bruta.registrar_fallo(datos.email)
            await ev("fallo", detalle="Correo o contraseña incorrectos.")
            if quedan == 0:
                mensaje = (f"Demasiados intentos fallidos. Tu acceso quedó bloqueado "
                           f"{get_settings().login_bloqueo_minutos} min.")
            elif quedan <= 2:
                mensaje += f" Te quedan {quedan} intento(s) antes del bloqueo temporal."
        elif e.codigo == "user_banned":
            await ev("bloqueado", detalle="Intento de acceso de una cuenta desactivada.")
        else:
            await ev("fallo", detalle=f"{e.codigo}: {e}")
        raise HTTPException(codigo, mensaje)

    fuerza_bruta.limpiar_fallos(datos.email)
    await ev("exito", user_id=r["user"]["id"], detalle="Inicio de sesión correcto.")
    return Sesion(access_token=r["access_token"], refresh_token=r["refresh_token"],
                  expires_in=r.get("expires_in", 3600))


@router.post("/registro", response_model=RespuestaRegistro)
async def registro(datos: NuevoUsuario, request: Request, tareas: BackgroundTasks):
    _configurado()
    _limitar_ip(request, "registro", 5)
    # El enlace de confirmación vuelve al frontend desde el que se registró
    origen = request.headers.get("origin")
    redirigir = origen if origen in get_settings().cors_lista else None
    try:
        r = await supabase_auth.registrar(datos.email, datos.password, datos.nombre.strip(), redirigir)
    except ErrorAuth as e:
        await auditoria.registrar(auditoria.evento(
            request, "registro", "fallo", email=datos.email, detalle=f"{e.codigo}: {e}"))
        if e.codigo in ("user_already_exists", "email_exists"):
            raise HTTPException(409, "Ya existe una cuenta con ese correo.")
        if e.status == 429:
            raise HTTPException(429, "Se enviaron demasiados correos. Inténtalo en unos minutos.")
        raise HTTPException(400, "No se pudo crear la cuenta. Revisa los datos.")

    usuario = r.get("user") or r
    tareas.add_task(auditoria.registrar, auditoria.evento(
        request, "registro", "exito", email=datos.email, user_id=usuario.get("id"),
        detalle="Usuario registrado."))
    if r.get("access_token"):
        return RespuestaRegistro(confirmar_correo=False, sesion=Sesion(
            access_token=r["access_token"], refresh_token=r["refresh_token"],
            expires_in=r.get("expires_in", 3600)))
    return RespuestaRegistro(confirmar_correo=True)


@router.post("/logout", status_code=204)
async def logout(request: Request, tareas: BackgroundTasks, usuario: Usuario = Depends(usuario_actual)):
    tareas.add_task(auditoria.registrar, auditoria.evento(
        request, "logout", "exito", user_id=usuario.id, email=usuario.email,
        detalle="Cierre de sesión."))
