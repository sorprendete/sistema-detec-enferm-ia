"""Bloqueo temporal de un correo tras varios intentos de inicio de sesión fallidos."""
import threading
import time
from collections import defaultdict, deque

from app.config import get_settings

_fallos: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def _limpiar(q: deque, ahora: float, ventana: float) -> None:
    while q and ahora - q[0] > ventana:
        q.popleft()


def segundos_bloqueado(email: str) -> int:
    s = get_settings()
    ventana = s.login_bloqueo_minutos * 60
    ahora = time.monotonic()
    with _lock:
        q = _fallos[email]
        _limpiar(q, ahora, ventana)
        if len(q) >= s.login_max_fallos:
            return int(ventana - (ahora - q[0])) + 1
        return 0


def registrar_fallo(email: str) -> int:
    """Devuelve cuántos intentos le quedan antes del bloqueo."""
    s = get_settings()
    ahora = time.monotonic()
    with _lock:
        q = _fallos[email]
        _limpiar(q, ahora, s.login_bloqueo_minutos * 60)
        q.append(ahora)
        return max(0, s.login_max_fallos - len(q))


def limpiar_fallos(email: str) -> None:
    with _lock:
        _fallos.pop(email, None)
