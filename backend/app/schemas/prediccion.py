from datetime import datetime

from pydantic import BaseModel


class ClaseProbable(BaseModel):
    indice: int
    clase: str
    confianza: float


class RespuestaPrediccion(BaseModel):
    # Filtro de cultivo
    admitida: bool
    motivo_rechazo: str | None = None  # "otra_planta" | "no_planta"
    mensaje: str | None = None
    prob_cultivo_soportado: float
    filtro: dict[str, float]
    # Diagnóstico (solo si la imagen fue admitida)
    id_analisis: str | None = None
    concluyente: bool | None = None  # False: confianza bajo el umbral, no se emite diagnóstico
    clase: str | None = None
    indice: int | None = None
    cultivo: str | None = None
    cultivo_detectado: str | None = None
    enfermedad: str | None = None
    saludable: bool | None = None
    confianza: float | None = None
    confianza_clasificador: float | None = None  # antes de combinar con el filtro de cultivo
    baja_certeza: bool | None = None
    motivos_baja_certeza: list[str] = []
    top3: list[ClaseProbable] = []
    imagen_sha256: str
    modelo_sha256: str
    tiempo_ms: int


class RespuestaSalud(BaseModel):
    estado: str
    modelo_cargado: bool
    integridad_verificada: bool
    modelo_sha256: str | None
    filtro_sha256: str | None = None
    num_clases: int
    cultivos_soportados: list[str] = []


class Analisis(BaseModel):
    id: str
    created_at: datetime
    clase: str
    cultivo: str | None = None
    saludable: bool
    confianza: float
    baja_certeza: bool
    top3: list[ClaseProbable] | None = None
    imagen_sha256: str
    nombre_archivo: str | None = None
