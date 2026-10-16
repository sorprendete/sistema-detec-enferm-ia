"""Módulo de entrenamiento · filtro de cultivo (detección de imágenes fuera de dominio).

El clasificador de enfermedades siempre elige una de sus 15 clases, aunque la foto sea
de maíz o de un perro. Este filtro decide ANTES si la imagen es una hoja de
pimiento, papa o tomate; si no lo es, el sistema la rechaza.

Cómo funciona:
  1. Pasa cada imagen por modelo_plantas.keras y toma el vector de 1280 características
     de la capa GlobalAveragePooling (la "huella visual" que ya aprendió MobileNetV2).
  2. Entrena una red pequeña (1280 → 128 → 5) que clasifica esa huella en:
     0 Pimiento · 1 Papa · 2 Tomate · 3 Otra planta · 4 No es planta.
  3. Guarda backend/modelo/filtro_cultivos.keras y su SHA-256 en filtro_hash.txt.

Estructura de datos esperada (una carpeta por categoría, subcarpetas libres):
    dataset_filtro/
        pimiento/      hojas de pimiento (PlantVillage + PlantDoc)
        papa/          hojas de papa
        tomate/        hojas de tomate
        otra_planta/   hojas de otros cultivos (manzana, maíz, uva, fresa, soya, cítricos...)
        no_planta/     fotos que no son plantas (p. ej. muestras de ImageNet)

Fuentes usadas en la versión entregada:
  - PlantVillage  https://github.com/spMohanty/PlantVillage-Dataset (60 imágenes por cada una de las 38 clases)
  - PlantDoc      https://github.com/pratikkayal/PlantDoc-Dataset  (fotos de campo, 2,579 imágenes)
  - ImageNet      https://github.com/EliSchwartz/imagenet-sample-images (1 imagen por clase, 1,000 imágenes)

Uso:
    python entrenar_filtro.py --datos dataset_filtro
"""
import argparse
from pathlib import Path

import keras
import numpy as np
import tensorflow as tf
from PIL import Image

from generar_hash import sha256

MODELO_DIR = Path(__file__).resolve().parent.parent / "backend" / "modelo"
CATEGORIAS = ["pimiento", "papa", "tomate", "otra_planta", "no_planta"]
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def extractor():
    m = keras.models.load_model(MODELO_DIR / "modelo_plantas.keras", compile=False)
    return keras.Model(m.input, m.get_layer("global_average_pooling2d").output)


def cargar_caracteristicas(datos: Path, ext, lote=64):
    X, y = [], []
    for c, nombre in enumerate(CATEGORIAS):
        archivos = [p for p in (datos / nombre).rglob("*") if p.suffix.lower() in EXTS]
        print(f"{nombre}: {len(archivos)} imágenes")
        buf = []
        for p in archivos:
            try:
                img = tf.image.resize(np.asarray(Image.open(p).convert("RGB")), (224, 224)).numpy()  # igual que el backend
            except Exception:
                continue
            buf.append(np.asarray(img, dtype=np.float32))
            if len(buf) == lote:
                X.append(ext.predict(np.stack(buf), verbose=0)); y += [c] * len(buf); buf = []
        if buf:
            X.append(ext.predict(np.stack(buf), verbose=0)); y += [c] * len(buf)
    return np.concatenate(X), np.array(y)


def construir(X):
    media, var = X.mean(0), X.var(0) + 1e-6
    reg = keras.regularizers.l2(1e-3)
    entrada = keras.Input((X.shape[1],), name="caracteristicas")
    h = keras.layers.Normalization(mean=media, variance=var)(entrada)
    h = keras.layers.Dense(128, activation="relu", kernel_regularizer=reg)(h)
    h = keras.layers.Dropout(0.3)(h)
    salida = keras.layers.Dense(len(CATEGORIAS), activation="softmax", kernel_regularizer=reg)(h)
    m = keras.Model(entrada, salida, name="filtro_cultivos")
    m.compile(keras.optimizers.Adam(1e-3), "sparse_categorical_crossentropy", metrics=["accuracy"])
    return m


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--datos", type=Path, default=Path(__file__).parent / "dataset_filtro")
    p.add_argument("--epocas", type=int, default=60)
    a = p.parse_args()

    keras.utils.set_random_seed(0)
    X, y = cargar_caracteristicas(a.datos, extractor())
    conteo = np.bincount(y, minlength=len(CATEGORIAS))
    pesos = {i: len(y) / (len(CATEGORIAS) * max(n, 1)) for i, n in enumerate(conteo)}

    modelo = construir(X)
    modelo.fit(X, y, epochs=a.epocas, batch_size=64, class_weight=pesos, verbose=2)

    ruta = MODELO_DIR / "filtro_cultivos.keras"
    modelo.save(ruta)
    (MODELO_DIR / "filtro_hash.txt").write_text(sha256(ruta))
    print("Filtro guardado en", ruta, "· SHA-256", sha256(ruta))


if __name__ == "__main__":
    main()
