// Métricas del modelo en uso (entrenado en Colab con PlantVillage + PlantDoc).
// Fuente: entrenamiento/metricas_v2.json. Orden de clases idéntico a backend/modelo/clases.json.
export const RESUMEN = {
  accuracy: 0.9648,
  precision: 0.9657,
  recall: 0.9648,
  f1: 0.9647,
  imagenes: 4122,
  sha256: '117a7cbe272f0a9cd26cc419cf153138ae3043c50b5a23d1cf288bf45ca51aab',
  arquitectura: 'MobileNetV2 (transfer learning + ajuste fino)',
  entrada: '224 × 224 px',
}

// Evaluación con fotos reales de campo (carpeta test de PlantDoc, no usada para entrenar)
export const CAMPO = {
  accuracy: 0.4804,
  precision: 0.4803,
  recall: 0.4804,
  f1: 0.4567,
  imagenes: 102,
}

// Características del modelo en uso
export const FICHA = [
  ['Arquitectura', 'MobileNetV2 preentrenada en ImageNet'],
  ['Técnica', 'Transfer learning + ajuste fino de las últimas 40 capas'],
  ['Entrada', 'Imagen RGB de 224 × 224 px'],
  ['Salida', '15 condiciones en 3 cultivos (pimiento, papa y tomate)'],
  ['Datos de entrenamiento', 'PlantVillage (fotos de laboratorio) + PlantDoc (fotos reales de campo)'],
  ['Aumento de datos', 'Giros, rotación, zoom, brillo, contraste y saturación'],
  ['Accuracy en laboratorio', '96.5 % (4,122 fotos)'],
  ['Accuracy en campo', '48.0 % (102 fotos reales)'],
  ['Formato', 'Keras 3 (.keras), verificado con SHA-256 al arrancar'],
]

export const CLASES = [
  'Pepper__bell___Bacterial_spot',
  'Pepper__bell___healthy',
  'Potato___Early_blight',
  'Potato___Late_blight',
  'Potato___healthy',
  'Tomato_Bacterial_spot',
  'Tomato_Early_blight',
  'Tomato_Late_blight',
  'Tomato_Leaf_Mold',
  'Tomato_Septoria_leaf_spot',
  'Tomato_Spider_mites_Two_spotted_spider_mite',
  'Tomato__Target_Spot',
  'Tomato__Tomato_YellowLeaf__Curl_Virus',
  'Tomato__Tomato_mosaic_virus',
  'Tomato_healthy',
]

// Filas = clase real, columnas = predicción del modelo (fotos de laboratorio)
export const MATRIZ_CONFUSION = [
  [198, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 295, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 194, 1, 0, 0, 3, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 0, 0, 29, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 420, 0, 3, 0, 1, 0, 0, 0, 0, 0],
  [1, 0, 2, 1, 0, 6, 168, 9, 0, 2, 1, 9, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 1, 367, 4, 1, 0, 2, 0, 1, 2],
  [0, 0, 0, 0, 0, 1, 0, 1, 184, 2, 0, 2, 0, 0, 0],
  [0, 0, 2, 0, 0, 6, 2, 1, 0, 334, 0, 9, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 314, 17, 0, 0, 3],
  [1, 0, 0, 0, 0, 1, 1, 0, 0, 2, 3, 265, 0, 0, 7],
  [0, 0, 0, 0, 0, 5, 0, 1, 1, 0, 5, 1, 628, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 10, 0, 0, 63, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 318],
]

// Matriz con fotos de campo (PlantDoc no tiene fotos de papa sana, araña roja ni mancha diana)
export const MATRIZ_CAMPO = [
  [7, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [2, 4, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 2, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 1, 1, 1, 0, 4, 0, 0, 0, 0, 0],
  [1, 0, 1, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 0, 0, 1, 6, 1, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 2, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 1, 0, 0, 8, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 3, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 3, 6, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 4],
]

// Precision, recall y F1 por clase calculados a partir de la matriz
export const POR_CLASE = CLASES.map((clase, i) => {
  const tp = MATRIZ_CONFUSION[i][i]
  const real = MATRIZ_CONFUSION[i].reduce((a, b) => a + b, 0)
  const predicho = MATRIZ_CONFUSION.reduce((a, fila) => a + fila[i], 0)
  const precision = tp / predicho
  const recall = tp / real
  return { clase, precision, recall, f1: (2 * precision * recall) / (precision + recall), soporte: real }
})
