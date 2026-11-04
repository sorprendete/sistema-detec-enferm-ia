// Guía de tratamiento por enfermedad (la misma que usa la app móvil).
// Los ingredientes activos son de uso común y están registrados en el Perú,
// pero las dosis se toman siempre de la etiqueta del producto.

// Qué tan rápido hay que actuar
export const URGENCIA = {
  ninguna: { texto: 'Sin tratamiento', tono: 'sano' },
  media: { texto: 'Actuar esta semana', tono: 'atencion' },
  alta: { texto: 'Actuar en 1 o 2 días', tono: 'enfermo' },
  critica: { texto: 'Actuar hoy', tono: 'enfermo' },
}

export const AVISO_SEGURIDAD = [
  'Usa solo productos con registro de SENASA y respeta la dosis de la etiqueta.',
  'Protégete con guantes, mascarilla, lentes y ropa de manga larga al aplicar.',
  'Respeta el periodo de carencia (días entre la última aplicación y la cosecha).',
  'Alterna productos de distinto grupo (FRAC o IRAC en la etiqueta) para evitar resistencia.',
  'No apliques con viento, lluvia cercana ni en las horas de más calor.',
]

const PREVENCION_GENERAL = [
  'Revisa el cultivo cada semana, mirando también el envés de las hojas.',
  'Riega al pie de la planta y temprano, para que el follaje no pase la noche mojado.',
  'Fertiliza de forma equilibrada; el exceso de nitrógeno vuelve la planta más débil.',
  'Retira malezas y restos de cosecha, que guardan plagas y enfermedades.',
  'Desinfecta las herramientas al pasar de una parcela a otra.',
]

const sana = {
  agente: 'Ninguno',
  urgencia: 'ninguna',
  sintomas: ['Hoja de color uniforme, sin manchas, polvillo ni deformaciones.'],
  inmediato: ['No necesita tratamiento. Sigue con el manejo preventivo.'],
  quimico: [],
  organico: [],
  prevencion: PREVENCION_GENERAL,
}

const manchaBacteriana = {
  agente: 'Bacteria Xanthomonas spp.',
  urgencia: 'media',
  sintomas: [
    'Manchas pequeñas, oscuras y de aspecto aceitoso, a veces con borde amarillo.',
    'Las manchas se secan y la hoja se rompe o cae.',
    'En frutos aparecen costras ásperas y elevadas.',
  ],
  inmediato: [
    'Retira y saca de la parcela las hojas y frutos afectados.',
    'Suspende el riego por aspersión.',
    'No trabajes entre las plantas cuando están mojadas: la bacteria se pega a manos y herramientas.',
  ],
  quimico: [
    'Bactericidas a base de cobre: hidróxido de cobre u oxicloruro de cobre, cada 7 a 10 días si el clima es húmedo.',
    'Cobre mezclado con mancozeb, que mejora el efecto del cobre.',
    'Acibenzolar-S-metil, que activa las defensas de la planta (preventivo).',
  ],
  organico: [
    'Caldo bordelés (sulfato de cobre con cal), permitido en agricultura orgánica.',
    'Productos a base de Bacillus subtilis como apoyo preventivo.',
  ],
  prevencion: [
    'Usa semilla certificada o tratada.',
    'Rota con cultivos que no sean solanáceas durante 2 a 3 años.',
    'Elimina los restos de cosecha al terminar la campaña.',
  ],
  nota: 'Los antibióticos agrícolas no se recomiendan: la bacteria se vuelve resistente rápido.',
}

const tizonTemprano = {
  agente: 'Hongo Alternaria solani',
  urgencia: 'media',
  sintomas: [
    'Manchas marrones con anillos concéntricos, como una diana, rodeadas de un halo amarillo.',
    'Empieza en las hojas de abajo, las más viejas, y sube.',
  ],
  inmediato: [
    'Quita las hojas bajas afectadas y sácalas de la parcela.',
    'Mejora la ventilación entre plantas.',
  ],
  quimico: [
    'Protectores: clorotalonil o mancozeb, cada 7 a 10 días.',
    'Sistémicos cuando avanza: azoxistrobina, difenoconazol o boscalid, alternándolos.',
  ],
  organico: [
    'Productos a base de Bacillus subtilis.',
    'Caldo bordelés como protector.',
  ],
  prevencion: [
    'Rota cultivos al menos 2 años sin solanáceas.',
    'Pon cobertura (mulch) en el suelo para que la lluvia no salpique esporas.',
    'Fertiliza bien: las plantas débiles o con poco nitrógeno se enferman más.',
  ],
}

const tizonTardioPapa = {
  agente: 'Oomiceto Phytophthora infestans (rancha)',
  urgencia: 'critica',
  sintomas: [
    'Manchas grandes, oscuras y de aspecto húmedo, que avanzan muy rápido.',
    'Con humedad, se ve un polvillo blanco en el envés de la hoja.',
    'Los tubérculos muestran zonas marrones y duras bajo la cáscara.',
  ],
  inmediato: [
    'Arranca las plantas muy afectadas, ponlas en bolsas y destrúyelas. No las dejes en el campo ni las compostes.',
    'Aplica fungicida a todo el lote de inmediato, no solo a las plantas con síntomas.',
    'Avisa a los vecinos: la rancha se transmite por el viento.',
  ],
  quimico: [
    'Sistémicos al aparecer síntomas: metalaxil-M + mancozeb, cimoxanil + mancozeb, dimetomorf, propamocarb o mandipropamid.',
    'Preventivos en clima frío y húmedo: mancozeb o clorotalonil, cada 5 a 7 días.',
    'No repitas el mismo sistémico más de 2 o 3 veces por campaña (hay rancha resistente al metalaxil).',
  ],
  organico: [
    'Caldo bordelés u otros cúpricos, solo como preventivo; no detienen un ataque fuerte.',
  ],
  prevencion: [
    'Siembra semilla sana y variedades tolerantes a la rancha recomendadas por el INIA para tu zona.',
    'Haz un aporque alto para proteger los tubérculos.',
    'Elimina las plantas que rebrotan solas de la campaña anterior.',
    'Corta el follaje 2 semanas antes de cosechar si hay rancha en el campo.',
  ],
}

const tizonTardioTomate = {
  ...tizonTardioPapa,
  sintomas: [
    'Manchas grandes, oscuras y de aspecto húmedo en hojas y tallos.',
    'Con humedad, se ve un polvillo blanco en el envés de la hoja.',
    'Los frutos muestran manchas marrones, duras y grasosas.',
  ],
  prevencion: [
    'No siembres tomate junto a papa.',
    'Usa variedades tolerantes y deja buena distancia entre plantas.',
    'En invernadero, ventila y evita que el follaje pase la noche mojado.',
  ],
}

const mohoHoja = {
  agente: 'Hongo Passalora fulva (Cladosporium)',
  urgencia: 'media',
  sintomas: [
    'Manchas amarillo pálido en el haz de la hoja.',
    'En el envés, un moho aterciopelado de color verde oliva a marrón.',
  ],
  inmediato: [
    'Baja la humedad: ventila el invernadero y riega solo por la mañana.',
    'Quita las hojas afectadas y deshoja la parte baja.',
  ],
  quimico: [
    'Clorotalonil o mancozeb como protectores.',
    'Difenoconazol o azoxistrobina si avanza.',
  ],
  organico: ['Productos a base de cobre o de Bacillus subtilis.'],
  prevencion: [
    'Mantén la humedad relativa por debajo de 85 %.',
    'Usa variedades resistentes.',
    'Desinfecta el invernadero entre campañas.',
  ],
}

const septoria = {
  agente: 'Hongo Septoria lycopersici',
  urgencia: 'media',
  sintomas: [
    'Muchas manchas pequeñas y redondas, de centro gris claro y borde oscuro.',
    'Dentro de la mancha se ven puntitos negros.',
    'Empieza en las hojas de abajo.',
  ],
  inmediato: [
    'Quita las hojas manchadas y sácalas de la parcela.',
    'Evita el riego por aspersión.',
  ],
  quimico: [
    'Clorotalonil o mancozeb, cada 7 a 10 días.',
    'Azoxistrobina o difenoconazol si avanza, alternándolos.',
  ],
  organico: ['Productos a base de cobre (caldo bordelés).'],
  prevencion: [
    'Rota cultivos 1 a 2 años sin solanáceas.',
    'Elimina las malezas solanáceas cercanas (hierba mora, por ejemplo).',
    'Pon cobertura en el suelo y tutorea las plantas.',
  ],
}

const acaros = {
  agente: 'Ácaro Tetranychus urticae (araña roja)',
  urgencia: 'alta',
  sintomas: [
    'Puntitos amarillos o blancos en la hoja, que luego se ve plateada o bronceada.',
    'Telarañas finas en el envés y en los brotes.',
    'Aumenta con calor y clima seco.',
  ],
  inmediato: [
    'Lava el envés de las hojas con un chorro de agua.',
    'Quita las hojas muy dañadas.',
    'Riega bien: la planta con sed se daña más.',
  ],
  quimico: [
    'Acaricidas: abamectina, spiromesifen, etoxazol o bifenazato, alternando grupos (IRAC).',
    'Azufre mojable, pero no lo apliques con más de 30 °C porque quema la hoja.',
  ],
  organico: [
    'Jabón potásico o aceite de neem, cubriendo bien el envés.',
    'Ácaros depredadores como Phytoseiulus persimilis.',
  ],
  prevencion: [
    'Evita los insecticidas piretroides de amplio espectro: matan a los enemigos naturales de la araña.',
    'Controla las malezas y el polvo en los caminos.',
  ],
}

const manchaDiana = {
  agente: 'Hongo Corynespora cassiicola',
  urgencia: 'media',
  sintomas: [
    'Manchas marrones con anillos y centro claro, parecidas al tizón temprano.',
    'Pueden aparecer también en tallos y frutos.',
  ],
  inmediato: [
    'Quita las hojas afectadas y mejora la ventilación.',
    'Retira los restos de cosecha.',
  ],
  quimico: [
    'Clorotalonil o mancozeb como protectores.',
    'Azoxistrobina o boscalid, alternándolos.',
  ],
  organico: ['Productos a base de cobre o de Bacillus subtilis.'],
  prevencion: [
    'Rota cultivos y elimina restos vegetales.',
    'Deja buena distancia entre plantas.',
  ],
}

const rizadoAmarillo = {
  agente: 'Virus TYLCV, transmitido por la mosca blanca (Bemisia tabaci)',
  urgencia: 'alta',
  sintomas: [
    'Hojas pequeñas, enrolladas hacia arriba y con bordes amarillos.',
    'La planta crece poco y casi no da frutos.',
  ],
  inmediato: [
    'No tiene cura. Arranca las plantas enfermas, ponlas en bolsa y sácalas de la parcela.',
    'Controla de inmediato la mosca blanca, que lleva el virus a las plantas sanas.',
  ],
  quimico: [
    'Contra la mosca blanca: piriproxifen, spirotetramat, acetamiprid o tiametoxam, alternándolos.',
    'Los neonicotinoides (acetamiprid, tiametoxam) dañan a las abejas: no los apliques en floración.',
  ],
  organico: [
    'Jabón potásico o aceite de neem contra la mosca blanca.',
    'Trampas amarillas pegajosas.',
    'Hongos como Beauveria bassiana.',
  ],
  prevencion: [
    'Usa variedades resistentes al TYLCV.',
    'Protege los almácigos con malla antiinsectos.',
    'Elimina malezas que hospedan a la mosca blanca.',
    'Deja un tiempo sin tomate entre campañas.',
  ],
}

const mosaico = {
  agente: 'Virus del mosaico del tomate (ToMV)',
  urgencia: 'alta',
  sintomas: [
    'Mosaico de zonas verde claro y verde oscuro en la hoja.',
    'Hojas deformadas o arrugadas y plantas que crecen poco.',
  ],
  inmediato: [
    'No tiene cura. Arranca las plantas enfermas, ponlas en bolsa y sácalas de la parcela.',
    'Lávate las manos con jabón y desinfecta las herramientas antes de tocar plantas sanas.',
  ],
  quimico: [
    'No hay producto químico que cure el virus.',
    'Desinfecta herramientas con lejía al 10 % o con leche descremada en polvo.',
  ],
  organico: [],
  prevencion: [
    'Usa semilla certificada y variedades resistentes (gen Tm-2²).',
    'No fumes ni manipules tabaco cerca de las plantas.',
    'Trabaja primero en las plantas sanas y al final en las sospechosas.',
  ],
  nota: 'Este virus sobrevive mucho tiempo en restos de plantas, herramientas y ropa.',
}

const POR_CLASE = {
  Pepper__bell___Bacterial_spot: manchaBacteriana,
  Pepper__bell___healthy: sana,
  Potato___Early_blight: tizonTemprano,
  Potato___Late_blight: tizonTardioPapa,
  Potato___healthy: sana,
  Tomato_Bacterial_spot: manchaBacteriana,
  Tomato_Early_blight: tizonTemprano,
  Tomato_Late_blight: tizonTardioTomate,
  Tomato_Leaf_Mold: mohoHoja,
  Tomato_Septoria_leaf_spot: septoria,
  Tomato_Spider_mites_Two_spotted_spider_mite: acaros,
  Tomato__Target_Spot: manchaDiana,
  Tomato__Tomato_YellowLeaf__Curl_Virus: rizadoAmarillo,
  Tomato__Tomato_mosaic_virus: mosaico,
  Tomato_healthy: sana,
}

export const tratamientoDe = (clase) => POR_CLASE[clase] ?? null
