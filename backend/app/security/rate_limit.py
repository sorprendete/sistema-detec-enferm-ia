"""Límite de peticiones por usuario (ventana deslizante de 60 s, en memoria)."""
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, status

from app.config import get_settings
from app.security.auth import Usuario, usuario_actual

_ventanas: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def permitir(clave: str, limite: int, ventana: float = 60.0) -> tuple[bool, int]:
    ahora = time.monotonic()
    with _lock:
        q = _ventanas[clave]
        while q and ahora - q[0] > ventana:
            q.popleft()
        if len(q) >= limite:
            return False, int(ventana - (ahora - q[0])) + 1
        q.append(ahora)
        return True, 0


def limitar_por_usuario(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    ok, espera = permitir(usuario.id, get_settings().rate_limit_por_minuto)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados análisis seguidos. Intenta de nuevo en {espera} s.",
            headers={"Retry-After": str(espera)},
        )
    return usuario
