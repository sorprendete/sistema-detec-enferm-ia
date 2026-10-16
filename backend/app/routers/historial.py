from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.prediccion import Analisis
from app.security.auth import Usuario, usuario_actual
from app.services.historial import listar_analisis

router = APIRouter(tags=["historial"])


@router.get("/historial", response_model=list[Analisis])
async def historial(limite: int = Query(50, ge=1, le=200), usuario: Usuario = Depends(usuario_actual)):
    try:
        return await listar_analisis(usuario, limite)
    except Exception:
        raise HTTPException(502, "No se pudo consultar el historial.")
