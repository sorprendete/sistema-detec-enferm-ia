"""Validación de imágenes subidas: tipo real (magic bytes), tamaño y contenido."""
import io
import warnings

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.config import get_settings

# Firmas binarias de los formatos permitidos (no se confía en la extensión ni en el Content-Type)
FIRMAS = {
    b"\xff\xd8\xff": "JPEG",
    b"\x89PNG\r\n\x1a\n": "PNG",
}


def _formato_por_firma(datos: bytes) -> str | None:
    for firma, fmt in FIRMAS.items():
        if datos.startswith(firma):
            return fmt
    if datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return "WEBP"
    return None


def _error(msg: str, code=status.HTTP_400_BAD_REQUEST):
    return HTTPException(status_code=code, detail=msg)


async def leer_imagen_segura(archivo: UploadFile) -> tuple[Image.Image, bytes]:
    s = get_settings()
    limite = int(s.max_image_mb * 1024 * 1024)

    datos = await archivo.read(limite + 1)  # nunca se lee más del límite
    if not datos:
        raise _error("El archivo está vacío.")
    if len(datos) > limite:
        raise _error(f"La imagen supera el máximo de {s.max_image_mb:g} MB.",
                     status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    formato = _formato_por_firma(datos)
    if formato is None:
        raise _error("Formato no permitido. Usa JPG, PNG o WebP.",
                     status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    Image.MAX_IMAGE_PIXELS = s.max_image_pixels
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            # 1) verify() detecta archivos truncados o manipulados
            Image.open(io.BytesIO(datos)).verify()
            # 2) se vuelve a abrir y decodificar por completo (verify invalida el objeto)
            img = Image.open(io.BytesIO(datos))
            if img.format != formato:
                raise _error("El contenido del archivo no coincide con su tipo.")
            img.load()
    except HTTPException:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise _error("La imagen tiene demasiados píxeles.")
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise _error("La imagen está dañada o no es válida.")

    return img, datos
