import { Ban, ChevronRight, CircleCheck, CircleHelp, ImageOff, Info, Leaf, Lock, Sprout, TriangleAlert } from 'lucide-react'
import { CULTIVOS, infoClase, nombreLargo } from '../data/enfermedades'
import BarrasHorizontales from './graficos/BarrasHorizontales.jsx'
import GuiaFoto from './GuiaFoto.jsx'

const pct = (x) => `${(x * 100).toFixed(1)} %`

function Trazabilidad({ r }) {
  return (
    <details>
      <summary><ChevronRight size={15} className="chevron" /><Lock size={14} />Datos de seguridad y trazabilidad</summary>
      <p>SHA-256 de la imagen: <code>{r.imagen_sha256}</code></p>
      <p>SHA-256 del modelo verificado: <code>{r.modelo_sha256}</code></p>
      <p className="tenue">Tiempo de análisis: {r.tiempo_ms} ms</p>
    </details>
  )
}

function Rechazo({ r }) {
  const otraPlanta = r.motivo_rechazo === 'otra_planta'
  return (
    <section className="tarjeta resultado">
      <div className="resultado-cab">
        <span className="insignia rechazo">{otraPlanta ? <Sprout size={24} /> : <ImageOff size={24} />}</span>
        <div>
          <p className="sobretitulo">Imagen no admitida</p>
          <h2>{otraPlanta ? 'Hoja de un cultivo no soportado' : 'La imagen no parece una hoja'}</h2>
          <span className="badge atencion"><Ban size={13} />No se puede analizar</span>
        </div>
      </div>
      <div className="aviso">
        <Info size={16} />
        <span>{r.mensaje}</span>
      </div>
      <div>
        <h3 style={{ marginBottom: 8 }}>Este sistema solo analiza hojas de:</h3>
        <div className="chips">
          {CULTIVOS.map((c) => <span key={c.id} className="chip"><Sprout size={14} />{c.nombre}</span>)}
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: 8 }}>¿Sí es pimiento, papa o tomate? Prueba así:</h3>
        <GuiaFoto compacta />
      </div>
      <Trazabilidad r={r} />
    </section>
  )
}

function NoConcluyente({ r }) {
  const barras = r.top3.map((c) => ({
    id: c.clase, etiqueta: nombreLargo(c.clase), valor: c.confianza,
    tip: [['Probabilidad', pct(c.confianza)]],
  }))
  return (
    <section className="tarjeta resultado">
      <div className="resultado-cab">
        <span className="insignia neutro"><CircleHelp size={24} /></span>
        <div>
          <p className="sobretitulo">{r.cultivo_detectado}</p>
          <h2>Resultado no concluyente</h2>
          <span className="badge neutro"><CircleHelp size={13} />Sin diagnóstico · confianza {pct(r.confianza)}</span>
        </div>
      </div>
      <div className="aviso">
        <Info size={16} />
        <span>{r.mensaje}</span>
      </div>
      {r.umbral != null && (
        <p className="tenue">
          La confianza ({pct(r.confianza)}) no alcanzó el nivel de exigencia de {Math.round(r.umbral * 100)} %.
          Si la foto es de campo y no puedes tomar otra mejor, puedes bajar el nivel y volver a analizar.
        </p>
      )}
      <div>
        <h3 style={{ marginBottom: 8 }}>Recomendación</h3>
        <p className="recomendacion">
          Revise la planta en campo o consulte a un agrónomo. Si sospecha una enfermedad, tome otra foto de una sola
          hoja, centrada, con buena luz y fondo liso.
        </p>
      </div>
      <GuiaFoto compacta />
      <details>
        <summary><ChevronRight size={15} className="chevron" />Ver lo que el modelo alcanzó a considerar (no confirmado)</summary>
        <div style={{ marginTop: 10 }}>
          <BarrasHorizontales datos={barras} max={1} formato={(v) => `${Math.round(v * 100)} %`} anchoEtiqueta={220} />
        </div>
      </details>
      <Trazabilidad r={r} />
    </section>
  )
}

export default function ResultadoDiagnostico({ resultado: r }) {
  if (r.admitida === false) return <Rechazo r={r} />
  if (r.concluyente === false) return <NoConcluyente r={r} />

  const info = infoClase(r.clase)
  const barras = r.top3.map((c) => ({
    id: c.clase, etiqueta: nombreLargo(c.clase), valor: c.confianza,
    tip: [['Probabilidad', pct(c.confianza)]],
  }))

  return (
    <section className="tarjeta resultado">
      <div className="resultado-cab">
        <span className={`insignia ${r.saludable ? 'sano' : 'enfermo'}`}>{r.saludable ? <Leaf size={24} /> : <TriangleAlert size={24} />}</span>
        <div>
          <p className="sobretitulo">{info.cultivo}</p>
          <h2>{info.nombre}</h2>
          <span className={`badge ${r.saludable ? 'sano' : 'enfermo'}`}>
            {r.saludable ? <><CircleCheck size={13} />Hoja sana</> : <><TriangleAlert size={13} />Enfermedad detectada</>}
          </span>
        </div>
      </div>

      <div className="medidor">
        <div className="medidor-fila"><span>Confianza del diagnóstico</span><strong>{pct(r.confianza)}</strong></div>
        <div className="medidor-barra"><div style={{ width: pct(r.confianza) }} /></div>
        <div className="medidor-fila tenue">
          <span>Cultivo identificado por el filtro: <strong>{r.cultivo_detectado}</strong></span>
          {r.umbral != null && <span>Nivel de exigencia: {Math.round(r.umbral * 100)} %</span>}
          {r.confianza_clasificador != null && Math.abs(r.confianza_clasificador - r.confianza) > 0.05 && (
            <span>Clasificador solo: {pct(r.confianza_clasificador)}</span>
          )}
        </div>
      </div>

      {r.baja_certeza && (
        <div className="aviso">
          <TriangleAlert size={16} />
          <span>
            <strong>Diagnóstico con baja certeza.</strong> {r.motivos_baja_certeza.join('. ')}. Revisa las
            alternativas y, si es posible, toma otra foto de <strong>un solo foliolo</strong> (una hojita suelta),
            de cerca, con buena luz y fondo liso.
          </span>
        </div>
      )}

      <div>
        <h3 style={{ marginBottom: 8 }}>Recomendación</h3>
        <p className="recomendacion">{info.recomendacion}</p>
      </div>

      <div>
        <h3 style={{ marginBottom: 4 }}>Probabilidad por diagnóstico</h3>
        <p className="tenue" style={{ marginBottom: 6 }}>Las 3 opciones más probables según el modelo</p>
        <BarrasHorizontales datos={barras} max={1} formato={(v) => `${Math.round(v * 100)} %`} anchoEtiqueta={220} />
      </div>

      <Trazabilidad r={r} />
    </section>
  )
}
