"""Preprocesado, filtro de cultivo y predicción con el modelo MobileNetV2 (entrada 224x224x3)."""
import numpy as np
import tensorflow as tf
from PIL import Image

from app.config import get_settings
from app.services.modelo import ModeloCargado

# Clases con F1 más bajo en la evaluación del modelo v2 (entrenamiento/metricas_v2.json):
# tizón temprano 90.3 % (se confunde con tizón tardío y mancha diana), mancha diana 90.6 %
# y virus del mosaico 91.3 % (se confunde con araña roja; en campo, con moho de la hoja).
CLASES_CONFUNDIBLES = {
    "Tomato_Early_blight",
    "Tomato__Target_Spot",
    "Tomato__Tomato_mosaic_virus",
}

# Clase que se guarda cuando el modelo no alcanza el umbral de confianza
NO_CONCLUYENTE = "No_concluyente"
MENSAJE_NO_CONCLUYENTE = (
    "El modelo no reconoce con seguridad ninguna de las 15 condiciones que conoce. Puede ser un "
    "problema que no está en su entrenamiento (helada, deficiencia de nutrientes, plagas, daño por "
    "herbicida o mecánico) o una foto poco clara. No se emite diagnóstico para evitar un falso positivo."
)

# Salidas del filtro de cultivo (entrenamiento/entrenar_filtro.py)
CATEGORIAS_FILTRO = ["Pimiento", "Papa", "Tomate", "Otra planta", "No es planta"]

MENSAJES_RECHAZO = {
    "otra_planta": (
        "La imagen parece una hoja de otro cultivo. Este sistema solo puede diagnosticar hojas de "
        "pimiento, papa y tomate. Si la hoja sí es de uno de ellos, toma otra foto con la hoja "
        "centrada, buena luz y fondo liso."
    ),
    "no_planta": (
        "La imagen no parece una hoja de planta. Sube una foto de una sola hoja de pimiento, "
        "papa o tomate."
    ),
}


def preprocesar(imagen: Image.Image) -> np.ndarray:
    """RGB, 224x224, float32 en rango 0-255.

    No se normaliza aquí: el modelo ya incluye internamente la capa que
    divide entre 127.5 y resta 1 (preprocesado de MobileNetV2).
    El redimensionado usa tf.image.resize, el mismo que se usó al entrenar en Colab
    (image_dataset_from_directory / tf.data). Con el de Pillow, que suaviza distinto,
    el acierto en fotos de campo baja de 48 % a 43 %.
    """
    tam = get_settings().imagen_tam
    arr = np.asarray(imagen.convert("RGB"), dtype=np.float32)
    arr = tf.image.resize(arr, (tam, tam)).numpy()
    return np.expand_dims(arr, axis=0)


def separar_nombre(clase: str) -> tuple[str, str]:
    """'Tomato_Late_blight' -> ('Tomato', 'Late_blight'); 'Pepper__bell___healthy' -> ('Pepper__bell', 'healthy')."""
    if "___" in clase:
        cultivo, enfermedad = clase.split("___", 1)
    elif clase.startswith("Tomato_"):
        cultivo, enfermedad = "Tomato", clase[len("Tomato_"):].lstrip("_")
    else:
        cultivo, enfermedad = clase.split("_", 1) if "_" in clase else (clase, clase)
    return cultivo, enfermedad


def indice_cultivo(clase: str) -> int:
    """0 Pimiento · 1 Papa · 2 Tomate (mismo orden que las salidas del filtro)."""
    return {"Pepper__bell": 0, "Potato": 1, "Tomato": 2}[separar_nombre(clase)[0]]


def evaluar_filtro(estado: ModeloCargado, caracteristicas: np.ndarray) -> dict:
    p = estado.filtro.predict(caracteristicas, verbose=0)[0]
    prob_cultivos = float(p[:3].sum())
    categoria = int(np.argmax(p))
    admitida = categoria < 3 and prob_cultivos >= get_settings().umbral_filtro
    if admitida:
        motivo = None
    else:
        motivo = "no_planta" if p[4] > p[3] else "otra_planta"
    return {
        "admitida": admitida,
        "motivo_rechazo": motivo,
        "prob_cultivo_soportado": round(prob_cultivos, 4),
        "filtro": {nombre: round(float(v), 4) for nombre, v in zip(CATEGORIAS_FILTRO, p)},
        "_p_cultivo": p[:3] / max(float(p[:3].sum()), 1e-9),
    }


def predecir(estado: ModeloCargado, imagen: Image.Image, top_k: int = 3, umbral: float | None = None) -> dict:
    """umbral: confianza mínima para emitir diagnóstico; si no se indica, la de la configuración."""
    entrada = preprocesar(imagen)
    caracteristicas, probs = estado.extractor.predict(entrada, verbose=0)

    # 1) ¿Es una hoja de pimiento, papa o tomate?
    filtro = evaluar_filtro(estado, caracteristicas)
    p_cultivo = filtro.pop("_p_cultivo")
    if not filtro["admitida"]:
        return {**filtro, "mensaje": MENSAJES_RECHAZO[filtro["motivo_rechazo"]]}

    # 2) Diagnóstico de la enfermedad combinando las dos opiniones:
    #    P(clase) ∝ P_clasificador(clase) × P_filtro(cultivo de esa clase).
    #    El filtro distingue mejor el cultivo (hoja de papa vs. tomate) y el
    #    clasificador distingue mejor la enfermedad.
    crudo = probs[0]
    cultivos = np.array([indice_cultivo(c) for c in estado.clases])
    probs = crudo * p_cultivo[cultivos]
    probs = probs / max(float(probs.sum()), 1e-9)
    cultivo_clasificador = int(cultivos[int(np.argmax(crudo))])
    orden = np.argsort(probs)[::-1][:top_k]
    top = [
        {"indice": int(i), "clase": estado.clases[i], "confianza": round(float(probs[i]), 4)}
        for i in orden
    ]
    mejor = top[0]
    cultivo, enfermedad = separar_nombre(mejor["clase"])
    if umbral is None:
        umbral = get_settings().umbral_confianza

    motivos = []
    if mejor["confianza"] < umbral:
        motivos.append(f"Confianza menor al {umbral:.0%}")
    if mejor["clase"] in CLASES_CONFUNDIBLES:
        motivos.append("Enfermedad que el modelo puede confundir con lesiones similares")
    if cultivo_clasificador != indice_cultivo(mejor["clase"]):
        motivos.append(
            f"El clasificador dudó del cultivo ({CATEGORIAS_FILTRO[cultivo_clasificador].lower()}); "
            f"el filtro identificó la hoja como {CATEGORIAS_FILTRO[indice_cultivo(mejor['clase'])].lower()}"
        )

    cultivo_filtro = CATEGORIAS_FILTRO[indice_cultivo(mejor["clase"])]

    # 3) Sin confianza suficiente no se emite diagnóstico (evita falsos positivos con
    #    condiciones que el modelo no conoce, como la helada).
    if mejor["confianza"] < umbral:
        return {
            **filtro,
            "concluyente": False,
            "umbral": umbral,
            "mensaje": MENSAJE_NO_CONCLUYENTE,
            "clase": NO_CONCLUYENTE,
            "cultivo": cultivo,
            "saludable": False,
            "confianza": mejor["confianza"],
            "baja_certeza": True,
            "motivos_baja_certeza": motivos,
            "top3": top,
            "cultivo_detectado": cultivo_filtro,
            "confianza_clasificador": round(float(crudo[mejor["indice"]]), 4),
        }

    return {
        **filtro,
        "concluyente": True,
        "umbral": umbral,
        "clase": mejor["clase"],
        "indice": mejor["indice"],
        "cultivo": cultivo,
        "enfermedad": enfermedad,
        "saludable": "healthy" in mejor["clase"].lower(),
        "confianza": mejor["confianza"],
        "baja_certeza": bool(motivos),
        "motivos_baja_certeza": motivos,
        "top3": top,
        "cultivo_detectado": cultivo_filtro,
        "confianza_clasificador": round(float(crudo[mejor["indice"]]), 4),
    }
