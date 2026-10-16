import { useState } from 'react'
import { FilaTip, marcasEje, useAncho, useTooltip } from './useTooltip'

/**
 * Barras horizontales de una sola serie.
 * datos: [{ id, etiqueta, valor, tip?: [[etiqueta, valor], ...] }]
 */
export default function BarrasHorizontales({
  datos, max, formato = (v) => v, referencia, anchoEtiqueta = 150, altoBarra = 18, separacion = 10, ticks,
}) {
  const { ref, mostrar, ocultar, nodo } = useTooltip()
  const [activo, setActivo] = useState(null)
  const W = useAncho(ref)

  const anchoValor = 56
  const x0 = anchoEtiqueta
  const ancho = W - x0 - anchoValor
  const eje = marcasEje(Math.max(1, ...datos.map((d) => d.valor)))
  const tope = max ?? eje.tope
  const escala = (v) => (v / tope) * ancho
  const paso = altoBarra + separacion
  const H = datos.length * paso + 22
  const marcas = ticks ?? (max != null ? [0, 0.25, 0.5, 0.75, 1].map((t) => t * tope) : eje.marcas)

  if (!datos.length) return <div ref={ref}><p className="vacio">Sin datos todavía.</p></div>

  return (
    <div className="grafico" ref={ref} onMouseLeave={() => { ocultar(); setActivo(null) }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de barras">
        {marcas.map((t) => (
          <g key={t}>
            <line className="g-rejilla" x1={x0 + escala(t)} x2={x0 + escala(t)} y1={0} y2={H - 20} />
            <text className="g-eje" x={x0 + escala(t)} y={H - 4} textAnchor="middle">{formato(t)}</text>
          </g>
        ))}
        <line className="g-base" x1={x0} x2={x0} y1={0} y2={H - 20} />
        {referencia && (
          <g>
            <line className="g-referencia" x1={x0 + escala(referencia.valor)} x2={x0 + escala(referencia.valor)} y1={0} y2={H - 20} />
          </g>
        )}
        {datos.map((d, i) => {
          const y = i * paso + separacion / 2
          const w = Math.max(escala(d.valor), 2)
          const r = Math.min(4, w / 2, altoBarra / 2)
          return (
            <g key={d.id ?? d.etiqueta}>
              <text className="g-etiqueta" x={x0 - 10} y={y + altoBarra / 2 + 4} textAnchor="end">{d.etiqueta}</text>
              {/* Extremo de datos redondeado (4px), anclado a la línea base */}
              <path
                className={`g-barra ${activo != null && activo !== i ? 'atenuada' : ''}`}
                d={`M${x0},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${altoBarra - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`}
              />
              <text className="g-valor" x={x0 + w + 6} y={y + altoBarra / 2 + 4}>{formato(d.valor)}</text>
              <rect
                className="g-hit" x={0} y={y - separacion / 2} width={W} height={paso}
                onMouseMove={(e) => {
                  setActivo(i)
                  mostrar(e, (
                    <>
                      <strong>{d.titulo ?? d.etiqueta}</strong>
                      {(d.tip ?? [['Valor', formato(d.valor)]]).map(([k, v]) => <FilaTip key={k} etiqueta={k} valor={v} />)}
                    </>
                  ))
                }}
              />
            </g>
          )
        })}
      </svg>
      {nodo}
      {referencia && (
        <div className="leyenda"><span><i className="linea" />{referencia.etiqueta}</span></div>
      )}
    </div>
  )
}
