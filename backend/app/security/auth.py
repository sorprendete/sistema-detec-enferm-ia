"""Autenticación: verifica el JWT que Supabase Auth entrega al usuario al iniciar sesión."""
import logging
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

log = logging.getLogger("seguridad.auth")
_bearer = HTTPBearer(auto_error=False)


@dataclass
class Usuario:
    id: str
    email: str | None
    token: str  # se reenvía a Supabase para que se apliquen las políticas RLS


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    url = get_settings().supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)


def decodificar_token(token: str) -> dict:
    s = get_settings()
    opciones = {"require": ["exp", "sub"]}
    if s.supabase_jwt_secret:
        # Proyectos con secreto compartido (Legacy JWT secret, HS256)
        return jwt.decode(token, s.supabase_jwt_secret, algorithms=["HS256"],
                          audience="authenticated", options=opciones)
    # Proyectos con claves asimétricas (ES256/RS256): se valida con la clave pública
    clave = _jwks_client().get_signing_key_from_jwt(token).key
    return jwt.decode(token, clave, algorithms=["ES256", "RS256"],
                      audience="authenticated", options=opciones)


def usuario_actual(cred: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Usuario:
    """Dependencia de FastAPI: rechaza con 401 cualquier petición sin un JWT válido."""
    no_autorizado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada. Inicia sesión nuevamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None or cred.scheme.lower() != "bearer":
        raise no_autorizado
    try:
        datos = decodificar_token(cred.credentials)
    except jwt.ExpiredSignatureError:
        raise no_autorizado
    except (jwt.PyJWTError, jwt.PyJWKClientError) as e:
        log.warning("JWT rechazado: %s", e)
        raise no_autorizado
    return Usuario(id=datos["sub"], email=datos.get("email"), token=cred.credentials)
