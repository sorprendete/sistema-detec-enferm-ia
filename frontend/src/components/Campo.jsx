import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

// Campo de formulario con icono a la izquierda y, en contraseñas, botón para mostrarla
export default function Campo({ etiqueta, icono: Icono, type = 'text', ...props }) {
  const [visible, setVisible] = useState(false)
  const esClave = type === 'password'
  return (
    <label className="campo">
      {etiqueta}
      <span className="campo-caja">
        {Icono && <Icono size={17} className="campo-icono" aria-hidden="true" />}
        <input type={esClave && visible ? 'text' : type} {...props} />
        {esClave && (
          <button type="button" className="campo-ojo" onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={visible ? 'Ocultar' : 'Mostrar'}>
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
    </label>
  )
}
