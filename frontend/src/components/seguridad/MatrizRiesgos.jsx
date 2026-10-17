import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
// Copia de seguridad/riesgos.json (se sincroniza con seguridad/matriz_riesgos.py --sincronizar)
import DATOS from '../../data/riesgos.json'

const { escala, riesgos } = DATOS
const nivel = (v) => (v >= escala.niveles.alto ? 'alto' : v >= escala.niveles.medio ? 'medio' : 'bajo')
const TEXTO = { alto: 'Alto', medio: 'Medio', bajo: 'Bajo' }
const BADGE = { alto: 'enfermo', medio: 'atencion', bajo: 'sano' }

const pos = (r, residual) => (residual ? r.residual : r)
const conteo = (residual) => riesgos.reduce((acc, r) => {
  const n = nivel(pos(r, residual).probabilidad * pos(r, residual).impacto)
  return { ...acc, [n]: acc[n] + 1 }
}, { alto: 0, medio: 0, bajo: 0 })

export default function MatrizRiesgos() {
  const [residual, setResidual] = useState(false)
  const [activo, setActivo] = useState(null)
  const antes = conteo(false)
  const despues = conteo(true)

  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo">
        <h2>Matriz de riesgos</h2>
        <p>Riesgo = Probabilidad × Impacto · {riesgos.length} riesgos identificados</p>
      </div>

      <div className="riesgo-resumen">
        {['alto', 'medio', 'bajo'].map((n) => (
          <div key={n} className={`riesgo-cifra ${n}`}>
            <span>{TEXTO[n]}</span>
            <strong>{antes[n]}<ArrowRight size={16} />{despues[n]}</strong>
          </div>
        ))}
        <p className="tenue">Sin controles <ArrowRight size={12} /> con los controles que ya tiene FitoScan</p>
      </div>

      <div className="filtros">
        <div className="segmentado" role="group" aria-label="Tipo de riesgo">
          <button type="button" className={!residual ? 'activo' : ''} onClick={() => setResidual(false)}>Riesgo inherente</button>
          <button type="button" className={residual ? 'activo' : ''} onClick={() => setResidual(true)}>
            <ShieldCheck size={15} />Con controles (residual)
          </button>
        </div>
      </div>

      <div className="matriz-riesgos">
        <div className="mr-eje-y"><span>Impacto</span></div>
        <div className="mr-cuerpo">
          {[5, 4, 3, 2, 1].map((i) => (
            <div key={i} className="mr-fila">
              <span className="mr-etiqueta-y" title={escala.impacto[i - 1]}>{i}<em>{escala.impacto[i - 1]}</em></span>
              {[1, 2, 3, 4, 5].map((p) => {
                const aqui = riesgos.filter((r) => pos(r, residual).probabilidad === p && pos(r, residual).impacto === i)
                return (
                  <div key={p} className={`mr-celda ${nivel(p * i)}`}>
                    <span className="mr-valor">{p * i}</span>
                    {aqui.map((r) => (
                      <button key={r.id} type="button" className={`mr-punto ${activo === r.id ? 'activo' : ''}`}
                        onClick={() => setActivo(activo === r.id ? null : r.id)} title={r.amenaza}>
                        {r.id}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          <div className="mr-fila mr-eje-x">
            <span />
            {escala.probabilidad.map((t, k) => <span key={t} title={t}>{k + 1}<em>{t}</em></span>)}
          </div>
          <p className="mr-titulo-x">Probabilidad</p>
        </div>
      </div>

      <div className="tabla-scroll tabla-tarjetas tabla-riesgos" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Riesgo</th><th>Pilar</th><th>Inherente</th><th>Controles en FitoScan</th><th>Residual</th></tr>
          </thead>
          <tbody>
            {[...riesgos].sort((a, b) => b.probabilidad * b.impacto - a.probabilidad * a.impacto).map((r) => {
              const ri = r.probabilidad * r.impacto
              const rr = r.residual.probabilidad * r.residual.impacto
              return (
                <tr key={r.id} className={activo === r.id ? 'fila-activa' : ''} onClick={() => setActivo(r.id)}>
                  <td className="celda-principal" data-label="ID"><strong>{r.id}</strong></td>
                  <td data-label="Riesgo">
                    <strong className="riesgo-amenaza">{r.amenaza}</strong>
                    <span className="tenue">{r.activo} · {r.vulnerabilidad}</span>
                  </td>
                  <td data-label="Pilar">{r.pilar}</td>
                  <td data-label="Inherente">
                    <span className={`badge ${BADGE[nivel(ri)]}`}>{r.probabilidad}×{r.impacto} = {ri} · {TEXTO[nivel(ri)]}</span>
                  </td>
                  <td className="celda-detalle" data-label="Controles">
                    <ul className="riesgo-controles">{r.controles.map((c) => <li key={c}>{c}</li>)}</ul>
                    {r.pendiente && <span className="riesgo-pendiente">Pendiente: {r.pendiente}</span>}
                  </td>
                  <td data-label="Residual">
                    <span className={`badge ${BADGE[nivel(rr)]}`}>{rr} · {TEXTO[nivel(rr)]}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
