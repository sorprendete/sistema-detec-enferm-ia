import { useState } from 'react'
import { FilaTip, marcasEje, useAncho, useTooltip } from './useTooltip'

/** Columnas verticales de una sola serie. datos: [{ id, etiqueta, valor, titulo? }] */
export default function Columnas({ datos, nombreValor = 'Análisis' }) {
  const { ref, mostrar, ocultar, nodo } = useTooltip()
  const [activo, setActivo] = useState(null)

  const W = useAncho(ref), H = 220, izq = 34, abajo = 26, arriba = 10
  const { tope, marcas } = marcasEje(Math.max(4, ...datos.map((d) => d.valor)))
  const alto = H - abajo - arriba
  const paso = (W - izq) / datos.length
  const anchoCol = Math.min(28, paso * 0.62)
  const y = (v) => arriba + alto - (v / tope) * alto

  return (
    <div className="grafico" ref={ref} onMouseLeave={() => { ocultar(); setActivo(null) }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Análisis por día">
        {marcas.map((t) => (
          <g key={t}>
            <line className="g-rejilla" x1={izq} x2={W} y1={y(t)} y2={y(t)} />
            <text className="g-eje" x={izq - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        <line className="g-base" x1={izq} x2={W} y1={y(0)} y2={y(0)} />
        {datos.map((d, i) => {
          const cx = izq + paso * i + paso / 2
          const h = (d.valor / tope) * alto
          const r = Math.min(4, h / 2, anchoCol / 2)
          const x = cx - anchoCol / 2
          const base = y(0)
          return (
            <g key={d.id ?? i}>
              {d.valor > 0 && (
                <path
                  className={`g-barra ${activo != null && activo !== i ? 'atenuada' : ''}`}
                  d={`M${x},${base} v-${h - r} a${r},${r} 0 0 1 ${r},-${r} h${anchoCol - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`}
                />
              )}
              {(i % Math.ceil(datos.length / 7) === 0 || i === datos.length - 1) && (
                <text className="g-eje" x={cx} y={H - 6} textAnchor="middle">{d.etiqueta}</text>
              )}
              <rect
                className="g-hit" x={cx - paso / 2} y={0} width={paso} height={H}
                onMouseMove={(e) => {
                  setActivo(i)
                  mostrar(e, <><strong>{d.titulo ?? d.etiqueta}</strong><FilaTip etiqueta={nombreValor} valor={d.valor} /></>)
                }}
              />
            </g>
          )
        })}
      </svg>
      {nodo}
    </div>
  )
}
