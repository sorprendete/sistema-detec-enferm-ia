import { Gauge, RotateCcw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'

// Confianza mínima para emitir diagnóstico. El backend acepta solo este rango
// (umbral_confianza_min / umbral_confianza_max en backend/app/config.py).
export const EXIGENCIA = { min: 50, max: 95, paso: 5, recomendada: 75 }

const posicion = (v) => ((Math.min(Math.max(v, EXIGENCIA.min), EXIGENCIA.max) - EXIGENCIA.min) / (EXIGENCIA.max - EXIGENCIA.min)) * 100

// Centro del control deslizante (24 px) para el valor v: recorre de 12 px a (ancho - 12 px)
const sobreControl = (v) => ({ left: `calc(12px + (100% - 24px) * ${posicion(v) / 100})` })

const ZONAS = {
  flexible: {
    nombre: 'Flexible', Icono: TriangleAlert,
    texto: 'Da diagnóstico aunque el modelo tenga dudas. Útil con fotos de campo difíciles; revisa siempre las alternativas.',
  },
  equilibrado: {
    nombre: 'Equilibrado', Icono: ShieldCheck,
    texto: 'Equilibrio recomendado entre dar un diagnóstico y evitar errores.',
  },
  estricto: {
    nombre: 'Estricto', Icono: Sparkles,
    texto: 'Solo diagnostica cuando el modelo está muy seguro. Ideal con fotos claras; habrá más resultados no concluyentes.',
  },
}

export const zonaDe = (v) => (v < 65 ? 'flexible' : v <= 80 ? 'equilibrado' : 'estricto')

// confianza: la que obtuvo la última foto analizada (0-1), para verla sobre la barra
export default function NivelExigencia({ valor, onCambio, confianza, deshabilitado }) {
  const zona = zonaDe(valor)
  const { nombre, Icono, texto } = ZONAS[zona]
  const conf = confianza != null ? Math.round(confianza * 100) : null

  return (
    <div className={`exigencia ${zona}`}>
      <div className="exigencia-cab">
        <label htmlFor="exigencia" className="exigencia-titulo"><Gauge size={16} />Nivel de exigencia</label>
        <span className="exigencia-valor"><strong>{valor} %</strong>{nombre}</span>
      </div>

      <div className="exigencia-pista" style={{ '--p': `calc(12px + (100% - 24px) * ${posicion(valor) / 100})` }}>
        <input
          id="exigencia" type="range" min={EXIGENCIA.min} max={EXIGENCIA.max} step={EXIGENCIA.paso}
          value={valor} disabled={deshabilitado}
          onChange={(e) => onCambio(Number(e.target.value))}
          aria-valuetext={`${valor} %, ${nombre}`}
        />
        <span className="exigencia-recomendada" style={sobreControl(EXIGENCIA.recomendada)} aria-hidden="true" />
        {conf != null && (
          <span
            className={`exigencia-foto ${conf >= valor ? 'alcanza' : 'no-alcanza'}`}
            style={sobreControl(conf)}
            title={`La última foto obtuvo ${conf} % de confianza`}
          >
            Foto {conf} %
          </span>
        )}
      </div>

      <div className="exigencia-marcas" aria-hidden="true">
        <span>{EXIGENCIA.min} %</span>
        <span style={sobreControl(EXIGENCIA.recomendada)}>Recomendado</span>
        <span>{EXIGENCIA.max} %</span>
      </div>

      <p className="exigencia-nota">
        <Icono size={15} />
        <span>
          Solo se da diagnóstico si el modelo está al menos {valor} % seguro. {texto}
        </span>
      </p>

      {valor !== EXIGENCIA.recomendada && (
        <button type="button" className="exigencia-restablecer" onClick={() => onCambio(EXIGENCIA.recomendada)} disabled={deshabilitado}>
          <RotateCcw size={14} />Volver al {EXIGENCIA.recomendada} % recomendado
        </button>
      )}
    </div>
  )
}
