import { ChevronRight, FlaskConical, HeartPulse, Info, Search, ShieldCheck, Sprout, Stethoscope, TriangleAlert, Zap } from 'lucide-react'
import { AVISO_SEGURIDAD, URGENCIA, tratamientoDe } from '../data/tratamientos'

function Bloque({ titulo, icono: Icono, puntos, abierto = false, tono }) {
  if (!puntos.length) return null
  return (
    <details className={`trat-bloque ${tono ?? ''}`} open={abierto}>
      <summary><ChevronRight size={15} className="chevron" /><Icono size={16} className="trat-icono" />{titulo}</summary>
      <ul>{puntos.map((p) => <li key={p}>{p}</li>)}</ul>
    </details>
  )
}

// posible: el diagnóstico no fue concluyente y se muestra la guía de la opción más probable
export default function GuiaTratamiento({ clase, nombre, posible = false }) {
  const t = tratamientoDe(clase)
  if (!t) return null
  const sana = t.urgencia === 'ninguna'
  const urgencia = URGENCIA[t.urgencia]
  const conProductos = t.quimico.length > 0 || t.organico.length > 0

  return (
    <div className="tratamiento">
      <div className="trat-cab">
        <span className="trat-cab-icono"><Stethoscope size={18} /></span>
        <div>
          <h3>{sana ? 'Cuidados recomendados' : posible ? `Tratamiento si fuera ${nombre}` : 'Tratamiento recomendado'}</h3>
          {!sana && <p className="tenue"><em>Causa: {t.agente}</em></p>}
        </div>
        <span className={`badge ${urgencia.tono}`}>
          {sana ? <HeartPulse size={13} /> : <Zap size={13} />}{urgencia.texto}
        </span>
      </div>

      {posible && (
        <div className="aviso info">
          <Info size={16} />
          <span>El diagnóstico no es seguro. Úsalo solo como referencia y confirma los síntomas antes de aplicar productos.</span>
        </div>
      )}

      <Bloque titulo={sana ? 'Qué hacer' : 'Qué hacer ahora'} icono={Zap} puntos={t.inmediato} abierto />
      {!sana && <Bloque titulo="Cómo reconocerla" icono={Search} puntos={t.sintomas} abierto={posible} />}
      <Bloque titulo="Control químico" icono={FlaskConical} puntos={t.quimico} />
      <Bloque titulo="Control orgánico o biológico" icono={Sprout} puntos={t.organico} />
      <Bloque titulo="Prevención" icono={ShieldCheck} puntos={t.prevencion} abierto={sana} />

      {t.nota && (
        <div className="aviso info"><Info size={16} /><span>{t.nota}</span></div>
      )}
      {conProductos && (
        <Bloque titulo="Antes de aplicar cualquier producto" icono={TriangleAlert} puntos={AVISO_SEGURIDAD} tono="cuidado" />
      )}

      <p className="tenue trat-pie">
        Guía orientativa. Confirma el diagnóstico en campo y, ante dudas, consulta a un ingeniero agrónomo o a la
        agencia agraria de tu zona.
      </p>
    </div>
  )
}
