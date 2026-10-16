import asyncio
import hashlib
import logging
import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.schemas.prediccion import RespuestaPrediccion
from app.security.auth import Usuario
from app.security.rate_limit import limitar_por_usuario
from app.security.validacion import leer_imagen_segura
from app.services.historial import registrar_analisis
from app.services.inferencia import predecir
from app.services.modelo import obtener_modelo

router = APIRouter(tags=["diagnóstico"])
log = logging.getLogger("api.prediccion")


@router.post("/predict", response_model=RespuestaPrediccion)
async def predict(imagen: UploadFile = File(...), usuario: Usuario = Depends(limitar_por_usuario)):
    estado = obtener_modelo()
    if estado is None:
        raise HTTPException(503, "El modelo aún no está disponible.")

    t0 = time.perf_counter()
    img, datos = await leer_imagen_segura(imagen)
    imagen_sha256 = hashlib.sha256(datos).hexdigest()

    resultado = await asyncio.to_thread(predecir, estado, img)
    tiempo_ms = int((time.perf_counter() - t0) * 1000)

    if not resultado["admitida"]:
        # Imagen fuera de dominio: no se diagnostica ni se guarda en el historial
        log.info("usuario=%s RECHAZADA motivo=%s p_cultivo=%.3f img=%s", usuario.id,
                 resultado["motivo_rechazo"], resultado["prob_cultivo_soportado"], imagen_sha256[:12])
        return RespuestaPrediccion(imagen_sha256=imagen_sha256, modelo_sha256=estado.sha256,
                                   tiempo_ms=tiempo_ms, **resultado)

    id_analisis = await registrar_analisis(usuario, resultado, imagen_sha256,
                                           estado.sha256, imagen.filename)
    log.info("usuario=%s clase=%s conf=%.3f img=%s", usuario.id, resultado["clase"],
             resultado["confianza"], imagen_sha256[:12])

    return RespuestaPrediccion(id_analisis=id_analisis, imagen_sha256=imagen_sha256,
                               modelo_sha256=estado.sha256, tiempo_ms=tiempo_ms, **resultado)
