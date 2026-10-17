import { Camera, RefreshCw, SwitchCamera, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Captura una foto con la cámara del dispositivo (getUserMedia).
// Funciona en localhost y en HTTPS; el navegador pide permiso la primera vez.
export default function CamaraModal({ onCaptura, onCerrar }) {
  const video = useRef(null)
  const flujo = useRef(null)
  const [modo, setModo] = useState('environment') // trasera en celulares
  const [foto, setFoto] = useState(null)          // { url, blob }
  const [error, setError] = useState('')
  const [hayVarias, setHayVarias] = useState(false)

  const detener = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop())
    flujo.current = null
  }, [])

  useEffect(() => {
    if (foto) return undefined
    let cancelado = false
    setError('')
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: modo }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
    }).then(async (s) => {
      if (cancelado) return s.getTracks().forEach((t) => t.stop())
      flujo.current = s
      if (video.current) video.current.srcObject = s
      const dispositivos = await navigator.mediaDevices.enumerateDevices()
      setHayVarias(dispositivos.filter((d) => d.kind === 'videoinput').length > 1)
    }).catch((e) => {
      setError(e.name === 'NotAllowedError'
        ? 'No diste permiso para usar la cámara. Actívalo en el candado de la barra de direcciones.'
        : 'No se encontró una cámara disponible en este dispositivo.')
    })
    return () => { cancelado = true; detener() }
  }, [modo, foto, detener])

  useEffect(() => () => foto && URL.revokeObjectURL(foto.url), [foto])

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  function capturar() {
    const v = video.current
    if (!v?.videoWidth) return
    const lienzo = document.createElement('canvas')
    lienzo.width = v.videoWidth
    lienzo.height = v.videoHeight
    lienzo.getContext('2d').drawImage(v, 0, 0)
    lienzo.toBlob((blob) => {
      if (!blob) return
      detener()
      setFoto({ url: URL.createObjectURL(blob), blob })
    }, 'image/jpeg', 0.92)
  }

  function usar() {
    const archivo = new File([foto.blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
    onCaptura(archivo)
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Tomar foto" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cab">
          <h2>Tomar foto de la hoja</h2>
          <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="camara">
          {error ? (
            <p className="camara-error">{error}</p>
          ) : foto ? (
            <img src={foto.url} alt="Foto capturada" />
          ) : (
            <>
              <video ref={video} autoPlay playsInline muted />
              <div className="camara-guia" aria-hidden="true" />
            </>
          )}
        </div>
        {!error && !foto && <p className="tenue">Acerca la cámara a una sola hojita (foliolo) y céntrala en el recuadro, con buena luz.</p>}

        <div className="modal-acciones">
          {foto ? (
            <>
              <button type="button" className="boton-sec" onClick={() => setFoto(null)}><RefreshCw size={16} />Repetir</button>
              <button type="button" onClick={usar}>Usar esta foto</button>
            </>
          ) : (
            <>
              {hayVarias && (
                <button type="button" className="boton-sec" onClick={() => setModo((m) => (m === 'environment' ? 'user' : 'environment'))}>
                  <SwitchCamera size={16} />Cambiar cámara
                </button>
              )}
              <button type="button" onClick={capturar} disabled={!!error}><Camera size={16} />Capturar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
