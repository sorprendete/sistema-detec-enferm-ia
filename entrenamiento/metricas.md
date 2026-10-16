# Métricas del modelo `modelo_plantas.keras` (v2)

- **Arquitectura:** MobileNetV2 (transfer learning de ImageNet + ajuste fino de las últimas 40 capas) · entrada 224×224×3 · 15 clases
- **Entrenamiento:** notebook `reentrenar_colab.ipynb`, partiendo del modelo v1, con PlantVillage (fotos de laboratorio) + PlantDoc (fotos reales de campo).
- **SHA-256 v2:** `117a7cbe272f0a9cd26cc419cf153138ae3043c50b5a23d1cf288bf45ca51aab`
- **SHA-256 v1 (original):** `53d738e8774efa08fb00ab7e4e343062e35664110d99baa30fa67f369c23f47a`
- **Datos completos:** `metricas_v2.json` (incluye las dos matrices de confusión).

## Resultados

| Conjunto de prueba | Imágenes | Modelo v1 | **Modelo v2** |
|---|---|---|---|
| Laboratorio (PlantVillage, 20 % reservado) | 4,122 | 92.75 % | **96.48 %** |
| Campo (PlantDoc, carpeta `test`) | 102 | 31.37 % | **48.04 %** |

| Métrica (laboratorio) | Valor | Interpretación |
|---|---|---|
| Accuracy | **96.48 %** | Clasifica bien 96 de cada 100 hojas. |
| Precision ponderada | **96.57 %** | Casi todas las alertas de enfermedad corresponden a patologías reales. |
| Recall ponderado | **96.48 %** | Pasa por alto menos del 4 % de las plantas infectadas. |
| F1-Score ponderado | **96.47 %** | Estable, sin sesgo hacia las clases con más fotos. |

En fotos de campo: precision 48.0 %, recall 48.0 %, F1 45.7 %.

## Por clase (laboratorio)

- Mejores: pimiento sano (**99.7 %** F1), virus del rizado amarillo (**99.0 %**), pimiento con mancha bacteriana y papa tizón temprano (**98.8 %**).
- Más difíciles: tizón temprano del tomate (**90.3 %**, se confunde con tizón tardío y mancha diana), mancha diana (**90.6 %**) y virus del mosaico (**91.3 %**, se confunde con araña roja).
- En campo, el virus del mosaico no acertó ninguna de 10 fotos (6 las tomó por moho de la hoja). PlantDoc no tiene fotos de campo de papa sana, araña roja ni mancha diana, así que esas clases no se pudieron medir en campo.

## Lectura honesta

- La carpeta `test` de PlantDoc también se usó para elegir la mejor época (EarlyStopping), y solo tiene 102 fotos. Por eso el 48 % es algo optimista: lo correcto es decir **"alrededor de 45–50 % en fotos reales"**.
- El acierto en laboratorio (96 %) solo vale para fotos parecidas a PlantVillage: una hoja, fondo liso y buena luz.

## Cómo se usan en el sistema

- Umbral de confianza en el backend: **75 %** (`UMBRAL_CONFIANZA`). Por debajo, el sistema **no emite diagnóstico**: responde *resultado no concluyente*, porque puede tratarse de algo que el modelo no conoce (helada, deficiencias, plagas). Así evita falsos positivos.
  - Fotos de laboratorio: responde el 96 % de las veces y acierta el 98 % de esas respuestas.
  - Fotos de campo: responde el 69 % de las veces; el resto queda como no concluyente.
- Si la confianza supera el 75 % pero la predicción es tizón temprano, mancha diana o virus del mosaico, se da el diagnóstico con aviso de *baja certeza* y las 3 clases más probables.
- El backend redimensiona con `tf.image.resize`, igual que en el entrenamiento. Con el redimensionado de Pillow el acierto en campo bajaba de 48 % a 43 %.

---

# Filtro de cultivo `filtro_cultivos.keras`

Decide **antes del diagnóstico** si la imagen es una hoja de pimiento, papa o tomate. Si no lo es, el sistema la rechaza en lugar de forzar una de las 15 clases.

- **Entrada:** las 1280 características que `modelo_plantas.keras` extrae en su capa GlobalAveragePooling.
- **Arquitectura:** Normalización → Dense(128, ReLU) → Dropout(0.3) → Dense(5, softmax).
- **Salidas:** Pimiento · Papa · Tomate · Otra planta · No es planta.
- **Regla:** se admite si la clase ganadora es un cultivo soportado **y** P(pimiento + papa + tomate) ≥ 0.70.
- **Datos:** 5,858 imágenes de PlantVillage (38 clases), PlantDoc (fotos de campo) y muestras de ImageNet. Script: `entrenar_filtro.py`.
- **SHA-256:** `b40ff883818adc182e783812bb81f4e8481dcad5dbdf675811e2baeedabe1912` (en `backend/modelo/filtro_hash.txt`).
- Se reentrenó junto con el modelo v2, porque usa sus características: si cambia el clasificador, hay que volver a ejecutar `entrenar_filtro.py`.

## Evaluación (imágenes que el filtro no vio al entrenar)

| Tipo de imagen | Resultado |
|---|---|
| Hojas de pimiento, papa y tomate (PlantVillage) | **98 %** admitidas |
| Hojas de pimiento, papa y tomate (fotos de campo, PlantDoc) | **87 %** admitidas |
| Imágenes que no son plantas (ImageNet) | **99 %** rechazadas |
| Hojas de cultivos presentes en el entrenamiento (manzana, maíz, durazno, fresa…) | **93–100 %** rechazadas |
| Especies ocultas al filtro en la prueba (uva, cereza, naranja, soya) | **72 %** rechazadas en laboratorio y **83 %** en campo (la soya de laboratorio es la más difícil: 17 %) |

Lectura honesta: el filtro rechaza muy bien imágenes que no son hojas y hojas de los cultivos que conoce. Con especies que nunca vio puede equivocarse; para mejorarlo basta añadir fotos de esas plantas en `dataset_filtro/otra_planta/` y volver a ejecutar `entrenar_filtro.py`. En la versión entregada, esas especies **sí** se incluyeron en el entrenamiento.

## Combinación filtro + clasificador

El diagnóstico final usa P(clase) ∝ P_clasificador(clase) × P_filtro(cultivo de la clase). Así, si el filtro reconoce la hoja como papa, las clases de tomate pierden peso.

| Conjunto de prueba | Cultivo correcto (clasificador solo → combinado) | Clase correcta (clasificador solo → combinado) |
|---|---|---|
| PlantVillage (fondo de laboratorio) | 99.2 % → 99.6 % | 97.2 % → 97.6 % |
| PlantDoc (fotos de campo) | 82.4 % → 85.3 % | 47.1 % → **50.0 %** |

Con el modelo v1 la clase correcta en campo era 31.4 % → 36.3 %.
