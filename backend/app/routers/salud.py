from fastapi import APIRouter

from app.schemas.prediccion import RespuestaSalud
from app.services.modelo import obtener_modelo

router = APIRouter(tags=["salud"])


@router.get("/health", response_model=RespuestaSalud)
def health():
    m = obtener_modelo()
    return RespuestaSalud(
        estado="ok" if m else "iniciando",
        modelo_cargado=m is not None,
        integridad_verificada=m is not None,  # el modelo solo se carga si el hash coincide
        modelo_sha256=m.sha256 if m else None,
        filtro_sha256=m.filtro_sha256 if m else None,
        num_clases=len(m.clases) if m else 0,
        cultivos_soportados=["Pimiento", "Papa", "Tomate"],
    )
