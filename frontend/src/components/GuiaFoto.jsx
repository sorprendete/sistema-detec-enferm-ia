import { CircleCheck, CircleX, Frame, Sun } from 'lucide-react'

// El modelo aprendió con fotos de UN foliolo (una hojita suelta) de cerca.
// Esta guía lo muestra con dos dibujos: lo que sí funciona y lo que conviene evitar.

const HOJA = 'M0,-30 C17,-20 19,10 0,30 C-19,10 -17,-20 0,-30 Z'

function Hoja({ x, y, giro = 0, escala = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <path d={HOJA} className="guia-hoja" />
      <path d="M0,-26 L0,28" className="guia-nervio" />
    </g>
  )
}

function Correcta() {
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true">
      <rect x="22" y="6" width="76" height="78" rx="8" className="guia-marco" />
      <Hoja x={60} y={45} giro={-18} escala={1.25} />
    </svg>
  )
}

function Incorrecta() {
  const pares = [[28, -55], [44, 55], [60, -55], [76, 55]]
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true">
      <path d="M60,86 C60,60 58,30 60,10" className="guia-tallo" />
      {pares.map(([y, giro], i) => (
        <g key={i}>
          <Hoja x={45} y={y + 4} giro={-giro} escala={0.42} />
          <Hoja x={75} y={y + 4} giro={giro} escala={0.42} />
        </g>
      ))}
      <Hoja x={60} y={12} escala={0.45} />
    </svg>
  )
}

export default function GuiaFoto({ compacta = false }) {
  return (
    <div className={`guia-foto ${compacta ? 'compacta' : ''}`}>
      {!compacta && (
        <div className="guia-cabecera">
          <strong>Cómo tomar la foto</strong>
          <span>El modelo aprendió con fotos de una sola hojita. Así el diagnóstico es más confiable.</span>
        </div>
      )}
      <div className="guia-ejemplos">
        <figure className="guia-ejemplo bien">
          <Correcta />
          <figcaption><CircleCheck size={15} />Un solo foliolo, de cerca</figcaption>
        </figure>
        <figure className="guia-ejemplo mal">
          <Incorrecta />
          <figcaption><CircleX size={15} />Evita la rama completa o varias hojas</figcaption>
        </figure>
      </div>
      {!compacta && (
        <ul className="guia-consejos">
          <li><Sun size={15} />Buena luz natural, sin sombras fuertes ni flash.</li>
          <li><Frame size={15} />Hoja centrada sobre un fondo liso, ocupando casi toda la foto.</li>
        </ul>
      )}
    </div>
  )
}
