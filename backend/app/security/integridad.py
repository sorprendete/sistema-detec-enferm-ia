"""Módulo de integridad: verifica el hash SHA-256 del modelo antes de cargarlo."""
import hashlib
import hmac
import logging
from pathlib import Path

log = logging.getLogger("seguridad.integridad")


class ModeloAlteradoError(RuntimeError):
    """El archivo del modelo no coincide con su huella SHA-256 registrada."""


def calcular_sha256(ruta: Path, bloque: int = 1024 * 1024) -> str:
    """Calcula el SHA-256 leyendo por bloques (no carga el archivo entero en memoria)."""
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for trozo in iter(lambda: f.read(bloque), b""):
            h.update(trozo)
    return h.hexdigest()


def leer_hash_esperado(ruta_hash: Path) -> str:
    """Lee el hash del .txt. Acepta '<hash>' o '<hash>  nombre_archivo' (formato sha256sum)."""
    contenido = ruta_hash.read_text(encoding="utf-8").strip()
    if not contenido:
        raise ModeloAlteradoError(f"El archivo de hash {ruta_hash.name} está vacío")
    hash_esperado = contenido.split()[0].lower()
    if len(hash_esperado) != 64 or any(c not in "0123456789abcdef" for c in hash_esperado):
        raise ModeloAlteradoError(f"{ruta_hash.name} no contiene un SHA-256 válido")
    return hash_esperado


def verificar_integridad(ruta_modelo: Path, ruta_hash: Path) -> str:
    """Devuelve el hash si el modelo es íntegro; si no, lanza ModeloAlteradoError.

    Usa hmac.compare_digest (comparación en tiempo constante) para no filtrar
    información por diferencias de tiempo.
    """
    if not ruta_modelo.is_file():
        raise ModeloAlteradoError(f"No existe el modelo: {ruta_modelo}")
    if not ruta_hash.is_file():
        raise ModeloAlteradoError(f"No existe el archivo de hash: {ruta_hash}")

    esperado = leer_hash_esperado(ruta_hash)
    calculado = calcular_sha256(ruta_modelo)

    if not hmac.compare_digest(esperado, calculado):
        log.critical("INTEGRIDAD FALLIDA: esperado=%s calculado=%s", esperado, calculado)
        raise ModeloAlteradoError(
            "El hash SHA-256 del modelo no coincide. El archivo pudo ser alterado, "
            "corrompido o reemplazado; se bloquea su carga."
        )
    log.info("Integridad del modelo verificada (SHA-256 %s)", calculado)
    return calculado
