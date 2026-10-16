// Traducción de las 15 clases de clases.json a nombres en español y recomendaciones básicas.
// Las recomendaciones son orientativas; ante dudas consulte a un ingeniero agrónomo.
export const ENFERMEDADES = {
  Pepper__bell___Bacterial_spot: {
    cultivo: 'Pimiento', nombre: 'Mancha bacteriana',
    recomendacion: 'Retire las hojas afectadas, evite el riego por aspersión y aplique bactericidas a base de cobre. Use semilla certificada.',
  },
  Pepper__bell___healthy: {
    cultivo: 'Pimiento', nombre: 'Hoja sana',
    recomendacion: 'La planta se ve saludable. Mantenga el riego regular y revise periódicamente.',
  },
  Potato___Early_blight: {
    cultivo: 'Papa', nombre: 'Tizón temprano (Alternaria)',
    recomendacion: 'Elimine hojas bajas infectadas, rote cultivos y aplique fungicidas protectores (clorotalonil o mancozeb).',
  },
  Potato___Late_blight: {
    cultivo: 'Papa', nombre: 'Tizón tardío (rancha)',
    recomendacion: 'Enfermedad de rápida propagación: retire y destruya las plantas afectadas y aplique fungicidas sistémicos de inmediato.',
  },
  Potato___healthy: {
    cultivo: 'Papa', nombre: 'Hoja sana',
    recomendacion: 'La planta se ve saludable. Continúe con el manejo preventivo.',
  },
  Tomato_Bacterial_spot: {
    cultivo: 'Tomate', nombre: 'Mancha bacteriana',
    recomendacion: 'Retire el follaje afectado, evite mojar las hojas y aplique productos cúpricos.',
  },
  Tomato_Early_blight: {
    cultivo: 'Tomate', nombre: 'Tizón temprano (Alternaria)',
    recomendacion: 'Pode hojas inferiores, mejore la ventilación y aplique fungicidas protectores. Puede confundirse con septoria o mancha diana.',
  },
  Tomato_Late_blight: {
    cultivo: 'Tomate', nombre: 'Tizón tardío',
    recomendacion: 'Retire las plantas afectadas, reduzca la humedad y aplique fungicidas sistémicos lo antes posible.',
  },
  Tomato_Leaf_Mold: {
    cultivo: 'Tomate', nombre: 'Moho de la hoja',
    recomendacion: 'Reduzca la humedad del invernadero, aumente la ventilación y elimine hojas afectadas.',
  },
  Tomato_Septoria_leaf_spot: {
    cultivo: 'Tomate', nombre: 'Mancha foliar por Septoria',
    recomendacion: 'Elimine hojas con manchas, evite el riego por aspersión y aplique fungicidas a base de cobre o clorotalonil.',
  },
  Tomato_Spider_mites_Two_spotted_spider_mite: {
    cultivo: 'Tomate', nombre: 'Ácaro de dos manchas (araña roja)',
    recomendacion: 'Lave el envés de las hojas con agua, use jabón potásico o acaricidas y controle el estrés hídrico.',
  },
  Tomato__Target_Spot: {
    cultivo: 'Tomate', nombre: 'Mancha diana',
    recomendacion: 'Mejore la ventilación, retire residuos de cosecha y aplique fungicidas preventivos.',
  },
  Tomato__Tomato_YellowLeaf__Curl_Virus: {
    cultivo: 'Tomate', nombre: 'Virus del rizado amarillo (TYLCV)',
    recomendacion: 'No tiene cura: elimine plantas infectadas y controle la mosca blanca, que transmite el virus.',
  },
  Tomato__Tomato_mosaic_virus: {
    cultivo: 'Tomate', nombre: 'Virus del mosaico',
    recomendacion: 'Elimine plantas infectadas, desinfecte herramientas y lávese las manos antes de manipular plantas.',
  },
  Tomato_healthy: {
    cultivo: 'Tomate', nombre: 'Hoja sana',
    recomendacion: 'La planta se ve saludable. Mantenga el manejo preventivo.',
  },
}

// Resultado sin diagnóstico (confianza bajo el umbral)
export const NO_CONCLUYENTE = 'No_concluyente'
const INFO_NO_CONCLUYENTE = {
  cultivo: '', nombre: 'No concluyente',
  recomendacion: 'Revise la planta en campo o consulte a un agrónomo.',
}

export const infoClase = (clase) =>
  clase === NO_CONCLUYENTE ? INFO_NO_CONCLUYENTE :
  ENFERMEDADES[clase] ?? { cultivo: '', nombre: clase, recomendacion: 'Consulte a un especialista.' }

// Cultivos que el modelo sabe analizar
export const CULTIVOS = [
  { id: 'Pimiento', nombre: 'Pimiento', cientifico: 'Capsicum annuum' },
  { id: 'Papa', nombre: 'Papa', cientifico: 'Solanum tuberosum' },
  { id: 'Tomate', nombre: 'Tomate', cientifico: 'Solanum lycopersicum' },
]

export const clasesPorCultivo = (cultivo) =>
  Object.entries(ENFERMEDADES)
    .filter(([, v]) => v.cultivo === cultivo)
    .map(([clase, v]) => ({ clase, ...v, sana: clase.toLowerCase().includes('healthy') }))

// Nombres cortos para ejes de gráficos
const CORTOS = {
  Pepper__bell___Bacterial_spot: 'Pim. · Mancha bact.',
  Pepper__bell___healthy: 'Pim. · Sana',
  Potato___Early_blight: 'Papa · Tizón temp.',
  Potato___Late_blight: 'Papa · Tizón tardío',
  Potato___healthy: 'Papa · Sana',
  Tomato_Bacterial_spot: 'Tom. · Mancha bact.',
  Tomato_Early_blight: 'Tom. · Tizón temp.',
  Tomato_Late_blight: 'Tom. · Tizón tardío',
  Tomato_Leaf_Mold: 'Tom. · Moho hoja',
  Tomato_Septoria_leaf_spot: 'Tom. · Septoria',
  Tomato_Spider_mites_Two_spotted_spider_mite: 'Tom. · Ácaros',
  Tomato__Target_Spot: 'Tom. · Mancha diana',
  Tomato__Tomato_YellowLeaf__Curl_Virus: 'Tom. · Rizado amarillo',
  Tomato__Tomato_mosaic_virus: 'Tom. · Mosaico',
  Tomato_healthy: 'Tom. · Sana',
}
export const nombreCorto = (clase) => CORTOS[clase] ?? clase
export const nombreLargo = (clase) => {
  const i = infoClase(clase)
  return i.cultivo ? `${i.cultivo} · ${i.nombre}` : i.nombre
}
