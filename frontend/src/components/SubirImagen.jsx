import { Camera, ImageUp } from 'lucide-react'
import { useRef, useState } from 'react'
import CamaraModal from './CamaraModal.jsx'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 5
const camaraDisponible = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export default function SubirImagen({ onSeleccion, deshabilitado }) {
  const input = useRef(null)
  const inputCamara = useRef(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [camara, setCamara] = useState(false)
  const [error, setError] = useState('')

  function elegir(archivo) {
    setError('')
    if (!archivo) return
    if (!TIPOS.includes(archivo.type)) return setError('Usa una imagen JPG, PNG o WebP.')
    if (archivo.size > MAX_MB * 1024 * 1024) return setError(`La imagen supera ${MAX_MB} MB.`)
    onSeleccion(archivo)
  }

  function abrirCamara() {
    if (deshabilitado) return
    // Sin getUserMedia (navegadores antiguos o sin HTTPS) se usa la cámara nativa del celular
    if (camaraDisponible()) setCamara(true)
    else inputCamara.current?.click()
  }

  return (
    <div>
      <div
        className={`zona-subida ${arrastrando ? 'activa' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => !deshabilitado && input.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          if (!deshabilitado) elegir(e.dataTransfer.files[0])
        }}
      >
        <div className="grande"><ImageUp size={18} /></div>
        <div>
          <p><strong>Arrastra una foto de la hoja</strong> o haz clic para elegirla</p>
          <p className="tenue">JPG, PNG o WebP · máximo {MAX_MB} MB</p>
        </div>
        <input ref={input} type="file" accept={TIPOS.join(',')} hidden
          onChange={(e) => { elegir(e.target.files[0]); e.target.value = '' }} />
      </div>

      <div className="separador"><span>o</span></div>
      <button type="button" className="boton-sec ancho-completo" onClick={abrirCamara} disabled={deshabilitado}>
        <Camera size={17} />Tomar foto con la cámara
      </button>
      <input ref={inputCamara} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { elegir(e.target.files[0]); e.target.value = '' }} />

      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      {camara && (
        <CamaraModal
          onCerrar={() => setCamara(false)}
          onCaptura={(archivo) => { setCamara(false); elegir(archivo) }}
        />
      )}
    </div>
  )
}
