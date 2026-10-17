import { useState } from 'react'
import { nombreCorto, nombreLargo } from '../../data/enfermedades'
import { FilaTip, useTooltip } from './useTooltip'

// Escala secuencial (un solo tono, claro → oscuro) según el % de la fila
const PASOS = ['--sec-100', '--sec-250', '--sec-400', '--sec-550', '--sec-700']
const colorPara = (p) => (p <= 0 ? 'var(--superficie-2)' : `var(${PASOS[Math.min(4, Math.floor(p * 5))]})`)

export default function MatrizConfusion({ clases, matriz }) {
  const { ref, mostrar, ocultar, nodo } = useTooltip()
  const [celda, setCelda] = useState(null)
  const n = clases.length
  const izq = 150, arriba = 8, lado = 32, abajo = 110
  const W = izq + n * lado + 4
  const H = arriba + n * lado + abajo
  const totales = matriz.map((f) => f.reduce((a, b) => a + b, 0))

  return (
    <div className="grafico" ref={ref} onMouseLeave={() => { ocultar(); setCelda(null) }}>
      <p className="pista-movil">Desliza hacia los lados para ver toda la matriz.</p>
      <div className="matriz-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }} role="img" aria-label="Matriz de confusión">
          {clases.map((c, i) => (
            <text key={`f${c}`} className="g-etiqueta" x={izq - 8} y={arriba + i * lado + lado / 2 + 4} textAnchor="end"
              fontWeight={celda?.[0] === i ? 700 : 400}>{nombreCorto(c)}</text>
          ))}
          {clases.map((c, j) => (
            <text key={`c${c}`} className="g-etiqueta" textAnchor="end" fontWeight={celda?.[1] === j ? 700 : 400}
              transform={`translate(${izq + j * lado + lado / 2 + 4}, ${arriba + n * lado + 8}) rotate(-50)`}>{nombreCorto(c)}</text>
          ))}
          {matriz.map((fila, i) => fila.map((v, j) => {
            const p = totales[i] ? v / totales[i] : 0
            const oscuro = p >= 0.6
            return (
              <g key={`${i}-${j}`}
                onMouseMove={(e) => {
                  setCelda([i, j])
                  mostrar(e, (
                    <>
                      <strong>{i === j ? 'Acierto' : 'Confusión'}</strong>
                      <FilaTip etiqueta="Real" valor={nombreLargo(clases[i])} />
                      <FilaTip etiqueta="Predicho" valor={nombreLargo(clases[j])} />
                      <FilaTip etiqueta="Imágenes" valor={v} />
                      <FilaTip etiqueta="% de la clase" valor={`${(p * 100).toFixed(1)} %`} />
                    </>
                  ))
                }}>
                <rect className={`g-celda ${celda?.[0] === i && celda?.[1] === j ? 'activa' : ''}`}
                  x={izq + j * lado} y={arriba + i * lado} width={lado} height={lado} rx={3}
                  style={{ fill: colorPara(p) }} />
                {v > 0 && (
                  <text x={izq + j * lado + lado / 2} y={arriba + i * lado + lado / 2 + 4} textAnchor="middle"
                    fontSize={v >= 100 ? 9.5 : 10.5} style={{ fill: oscuro ? 'var(--sec-tinta-alta)' : 'var(--texto)', fontVariantNumeric: 'tabular-nums' }}>
                    {v}
                  </text>
                )}
              </g>
            )
          }))}
          <text className="g-eje" x={izq + (n * lado) / 2} y={H - 4} textAnchor="middle">Predicción del modelo →</text>
        </svg>
      </div>
      {nodo}
      <div className="leyenda">
        <span>Filas: clase real</span>
        <span>0 %</span><span className="escala" /><span>100 % de la clase</span>
      </div>
    </div>
  )
}
