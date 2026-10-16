import { CircleCheck, Dot, Sprout } from 'lucide-react'
import { CULTIVOS, clasesPorCultivo } from '../data/enfermedades'

export function ChipsCultivos() {
  return (
    <div className="chips">
      {CULTIVOS.map((c) => <span key={c.id} className="chip"><Sprout size={14} />{c.nombre}</span>)}
    </div>
  )
}

export default function CultivosSoportados({ detalle = true }) {
  return (
    <div className="cultivos">
      {CULTIVOS.map((c) => {
        const clases = clasesPorCultivo(c.id)
        return (
          <div key={c.id} className="cultivo">
            <div className="cultivo-cab">
              <span className="marca-cultivo"><Sprout size={18} /></span>
              <div><strong>{c.nombre}</strong><em>{c.cientifico} · {clases.length} condiciones</em></div>
            </div>
            {detalle && (
              <ul>
                {clases.map((k) => (
                  <li key={k.clase} className={k.sana ? 'sana' : ''}>
                    {k.sana ? <CircleCheck size={14} /> : <Dot size={14} />}{k.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
