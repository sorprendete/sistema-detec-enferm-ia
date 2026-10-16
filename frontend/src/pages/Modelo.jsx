import { BadgeCheck, CircleCheck, CircleX, Radar, Scale, Target, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import CultivosSoportados from '../components/CultivosSoportados.jsx'
import BarrasHorizontales from '../components/graficos/BarrasHorizontales.jsx'
import MatrizConfusion from '../components/graficos/MatrizConfusion.jsx'
import Indicador from '../components/Indicador.jsx'
import { nombreLargo } from '../data/enfermedades'
import { CAMPO, CLASES, FICHA, MATRIZ_CAMPO, MATRIZ_CONFUSION, POR_CLASE, RESUMEN } from '../data/metricas'
import { estadoServidor } from '../lib/api'

const pct = (x) => `${(x * 100).toFixed(1)} %`

export default function Modelo() {
  const [salud, setSalud] = useState(null)

  useEffect(() => { estadoServidor().then(setSalud).catch(() => setSalud(false)) }, [])

  const f1 = [...POR_CLASE].sort((a, b) => b.f1 - a.f1).map((c) => ({
    id: c.clase, etiqueta: nombreLargo(c.clase), valor: c.f1,
    tip: [['F1-Score', pct(c.f1)], ['Precisión', pct(c.precision)], ['Recall', pct(c.recall)], ['Imágenes de prueba', c.soporte]],
  }))

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Modelo y métricas</h1>
          <p>{RESUMEN.arquitectura} · entrada {RESUMEN.entrada} · evaluado con {RESUMEN.imagenes.toLocaleString('es')} fotos de laboratorio y {CAMPO.imagenes} fotos reales de campo.</p>
        </div>
      </header>

      <section className="rejilla col-4">
        <Indicador icono={Target} etiqueta="Accuracy global" valor={pct(RESUMEN.accuracy)} nota="Fotos de laboratorio (PlantVillage)" />
        <Indicador icono={BadgeCheck} etiqueta="Precisión ponderada" valor={pct(RESUMEN.precision)} nota="Pocas falsas alarmas" />
        <Indicador icono={Radar} etiqueta="Recall ponderado" valor={pct(RESUMEN.recall)} nota="Pasa por alto menos del 4 %" />
        <Indicador icono={Scale} etiqueta="F1-Score" valor={pct(RESUMEN.f1)} nota="Sin sesgo hacia clases grandes" />
      </section>

      <section className="rejilla col-2">
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Características del modelo</h2><p>modelo_plantas.keras</p></div>
          <dl className="ficha">
            {FICHA.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Matriz de confusión · fotos de campo</h2><p>{CAMPO.imagenes} fotos reales · accuracy {pct(CAMPO.accuracy)}</p></div>
          <MatrizConfusion clases={CLASES} matriz={MATRIZ_CAMPO} />
        </div>
      </section>

      <section className="rejilla col-2">
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>F1-Score por condición</h2><p>Ordenado de mayor a menor</p></div>
          <BarrasHorizontales
            datos={f1} max={1} anchoEtiqueta={240} altoBarra={14} separacion={9}
            formato={(v) => `${Math.round(v * 100)} %`}
            referencia={{ valor: RESUMEN.f1, etiqueta: `F1 promedio ponderado (${pct(RESUMEN.f1)})` }}
          />
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Matriz de confusión · laboratorio</h2><p>Pasa el cursor sobre una celda</p></div>
          <MatrizConfusion clases={CLASES} matriz={MATRIZ_CONFUSION} />
        </div>
      </section>

      <section className="rejilla col-2">
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Lectura de los resultados</h2></div>
          <ul className="lista-lectura">
            <li><ChevronRight size={15} /><span><strong>Entrenado</strong> con fotos de laboratorio (PlantVillage) y fotos reales de campo (PlantDoc).</span></li>
            <li><ChevronRight size={15} /><span><strong>Mejores clases:</strong> pimiento sano (99.7 %) y virus del rizado amarillo (99.0 %).</span></li>
            <li><ChevronRight size={15} /><span><strong>Más difíciles:</strong> tizón temprano (90.3 %, se confunde con tizón tardío y mancha diana), mancha diana (90.6 %) y virus del mosaico (91.3 %, en campo se confunde con moho de la hoja).</span></li>
            <li><ChevronRight size={15} /><span>Si el diagnóstico es una de esas tres enfermedades, el sistema lo marca con <strong>baja certeza</strong>.</span></li>
            <li><ChevronRight size={15} /><span>Si la confianza es menor al 75 %, <strong>no emite diagnóstico</strong> (resultado no concluyente) para evitar falsos positivos con problemas que el modelo no conoce, como la helada.</span></li>
            <li><ChevronRight size={15} /><span>En fotos reales acierta aproximadamente <strong>1 de cada 2</strong>: úsalo como apoyo, no como diagnóstico definitivo.</span></li>
            <li><ChevronRight size={15} /><span>Antes de clasificar, un <strong>filtro de cultivo</strong> rechaza hojas que no son de tomate, papa o pimiento.</span></li>
          </ul>
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Integridad y seguridad</h2></div>
          <div style={{ display: 'grid', gap: 10, fontSize: '.9rem' }}>
            <div>
              <span className="tenue">Estado del servidor</span><br />
              {salud === null && 'Consultando…'}
              {salud === false && <span className="badge enfermo"><CircleX size={13} />Sin conexión con el backend</span>}
              {salud && (
                <span className={`badge ${salud.integridad_verificada ? 'sano' : 'enfermo'}`}>
                  {salud.integridad_verificada ? <><CircleCheck size={13} />Modelo íntegro y cargado</> : <><CircleX size={13} />Modelo no cargado</>}
                </span>
              )}
              {salud?.servidor && <div className="tenue" style={{ marginTop: 4 }}>Responde: {salud.servidor}</div>}
            </div>
            {salud?.modelo_sha256 && <div><span className="tenue">SHA-256 del clasificador</span><br /><code>{salud.modelo_sha256}</code></div>}
            {salud?.filtro_sha256 && <div><span className="tenue">SHA-256 del filtro de cultivo</span><br /><code>{salud.filtro_sha256}</code></div>}
            <div className="tenue">El servidor calcula estas huellas al arrancar y se niega a cargar un modelo modificado.</div>
          </div>
        </div>
      </section>

      <section className="tarjeta">
        <div className="tarjeta-titulo"><h2>Cultivos y condiciones que reconoce</h2><p>15 condiciones en 3 cultivos</p></div>
        <CultivosSoportados />
      </section>
    </>
  )
}
