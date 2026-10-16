"""Carga única de los modelos (.keras) y de las clases (.json), siempre después de verificar su SHA-256."""
import json
import logging
from dataclasses import dataclass

from app.config import get_settings
from app.security.integridad import verificar_integridad

log = logging.getLogger("servicios.modelo")


@dataclass
class ModeloCargado:
    modelo: object       # clasificador original de 15 clases
    extractor: object    # mismo modelo con dos salidas: [características 1280, probabilidades 15]
    filtro: object       # filtro de cultivo: pimiento / papa / tomate / otra planta / no planta
    clases: list[str]
    sha256: str
    filtro_sha256: str


_estado: ModeloCargado | None = None


def _leer_clases(ruta) -> list[str]:
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    # Acepta lista ["clase0", ...] o diccionario {"0": "clase0", ...}
    if isinstance(datos, dict):
        datos = [datos[str(i)] for i in range(len(datos))]
    if not isinstance(datos, list) or not all(isinstance(c, str) for c in datos):
        raise ValueError("clases.json debe ser una lista de nombres o un diccionario índice→nombre")
    return datos


def cargar_modelo() -> ModeloCargado:
    """Verifica el SHA-256 de ambos modelos y, solo si son correctos, los carga en memoria."""
    global _estado
    if _estado is not None:
        return _estado

    s = get_settings()
    sha = verificar_integridad(s.modelo_path, s.hash_path)  # lanza error si fue alterado
    sha_filtro = verificar_integridad(s.filtro_path, s.filtro_hash_path)

    import keras  # import tardío: TensorFlow tarda en cargar

    modelo = keras.models.load_model(s.modelo_path, compile=False)
    filtro = keras.models.load_model(s.filtro_path, compile=False)
    clases = _leer_clases(s.clases_path)

    salidas = modelo.output_shape[-1]
    if salidas != len(clases):
        raise ValueError(f"El modelo tiene {salidas} salidas pero clases.json tiene {len(clases)} clases")

    caracteristicas = modelo.get_layer("global_average_pooling2d").output
    extractor = keras.Model(modelo.input, [caracteristicas, modelo.output])

    _estado = ModeloCargado(modelo, extractor, filtro, clases, sha, sha_filtro)
    log.info("Modelos cargados: clasificador de %d clases + filtro de cultivo", len(clases))
    return _estado


def obtener_modelo() -> ModeloCargado | None:
    return _estado
