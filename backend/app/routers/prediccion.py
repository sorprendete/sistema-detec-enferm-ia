import asyncio
import hashlib
import logging
import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile

from app.config import get_settings
from app.schemas.prediccion import RespuestaPrediccion
from app.security.auth import Usuario
from app.security.rate_limit import limitar_por_usuario
from app.security.validacion import leer_imagen_segura
from app.services import auditoria
from app.services.historial import registrar_analisis
from app.services.inferencia import predecir
from app.services.modelo import obtener_modelo

router = APIRouter(tags=["diagnóstico"])
log = logging.getLogger("api.prediccion")


@router.post("/predict", response_model=RespuestaPrediccion)
async def predict(request: Request, tareas: BackgroundTasks, imagen: UploadFile = File(...),
                  umbral: float | None = Form(None),
                  usuario: Usuario = Depends(limitar_por_usuario)):
    estado = obtener_modelo()
    if estado is None:
        raise HTTPException(503, "El modelo aún no está disponible.")

    # Nivel de exigencia elegido con la barra; el servidor no acepta valores fuera del rango
    ajustes = get_settings()
    if umbral is None:
        umbral = ajustes.umbral_confianza
    if not ajustes.umbral_confianza_min <= umbral <= ajustes.umbral_confianza_max:
        raise HTTPException(422, f"El nivel de exigencia debe estar entre "
                                 f"{ajustes.umbral_confianza_min:.0%} y {ajustes.umbral_confianza_max:.0%}.")

    def auditar(resultado_estado: str, detalle: str):
        tareas.add_task(auditoria.registrar, auditoria.evento(
            request, "predict", resultado_estado, user_id=usuario.id, email=usuario.email, detalle=detalle))

    t0 = time.perf_counter()
    try:
        img, datos = await leer_imagen_segura(imagen)
    except HTTPException as e:
        # La respuesta de error no ejecuta tareas en segundo plano: se registra directamente
        await auditoria.registrar(auditoria.evento(
            request, "predict", "fallo", user_id=usuario.id, email=usuario.email,
            detalle=f"Archivo rechazado: {e.detail}"))
        raise
    imagen_sha256 = hashlib.sha256(datos).hexdigest()

    resultado = await asyncio.to_thread(predecir, estado, img, 3, umbral)
    tiempo_ms = int((time.perf_counter() - t0) * 1000)

    if not resultado["admitida"]:
        # Imagen fuera de dominio: no se diagnostica ni se guarda en el historial
        log.info("usuario=%s RECHAZADA motivo=%s p_cultivo=%.3f img=%s", usuario.id,
                 resultado["motivo_rechazo"], resultado["prob_cultivo_soportado"], imagen_sha256[:12])
        motivo = "es de otra planta" if resultado["motivo_rechazo"] == "otra_planta" else "no parece ser una hoja"
        auditar("fallo", f"Imagen rechazada: {motivo} (p_cultivo={resultado['prob_cultivo_soportado']:.2f}).")
        return RespuestaPrediccion(imagen_sha256=imagen_sha256, modelo_sha256=estado.sha256,
                                   tiempo_ms=tiempo_ms, **resultado)

    id_analisis = await registrar_analisis(usuario, resultado, imagen_sha256,
                                           estado.sha256, imagen.filename)
    log.info("usuario=%s clase=%s conf=%.3f img=%s", usuario.id, resultado["clase"],
             resultado["confianza"], imagen_sha256[:12])
    auditar("exito", f"Resultado: {resultado['clase']} ({resultado['confianza']:.2f}, exigencia {umbral:.0%}).")

    return RespuestaPrediccion(id_analisis=id_analisis, imagen_sha256=imagen_sha256,
                               modelo_sha256=estado.sha256, tiempo_ms=tiempo_ms, **resultado)
