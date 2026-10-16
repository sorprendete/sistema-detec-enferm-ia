import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { aplicarTema, temaActual } from '../lib/tema'

export default function InterruptorTema() {
  const [tema, setTema] = useState(temaActual)
  const oscuro = tema === 'dark'

  function cambiar() {
    const nuevo = oscuro ? 'light' : 'dark'
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  const texto = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  return (
    <button type="button" className="tema" onClick={cambiar} title={texto} aria-label={texto}>
      {oscuro ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
