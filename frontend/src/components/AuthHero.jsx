import { Fingerprint, Leaf, ScanSearch, ShieldCheck } from 'lucide-react'
import { RESUMEN } from '../data/metricas'

// Logo que solo se ve en celulares, encima del formulario (allí el panel verde queda debajo)
export function MarcaMovil() {
  return (
    <div className="logo auth-marca-movil">
      <span className="logo-icono"><Leaf size={18} strokeWidth={2.2} /></span>
      <span><strong>FitoScan</strong><small>Detección segura con IA</small></span>
    </div>
  )
}

export default function AuthHero() {
  return (
    <section className="auth-hero">
      <div className="logo">
        <span className="logo-icono"><Leaf size={18} strokeWidth={2.2} /></span>
        <span><strong>FitoScan</strong><small>Detección segura con IA</small></span>
      </div>
      <div>
        <h1>Diagnóstico de enfermedades en hojas de tomate, papa y pimiento</h1>
        <p>
          Sube una foto de una hoja y una red neuronal MobileNetV2 identifica si está sana o qué enfermedad
          presenta, entre 15 condiciones.
        </p>
        <div className="auth-lista">
          <div><ScanSearch size={18} /><span>Filtro previo que rechaza hojas de otros cultivos e imágenes que no son plantas.</span></div>
          <div><ShieldCheck size={18} /><span>Integridad del modelo verificada con SHA-256 antes de cada arranque.</span></div>
          <div><Fingerprint size={18} /><span>Historial auditable: cada análisis guarda la huella de la imagen y no puede editarse.</span></div>
        </div>
      </div>
      <div className="auth-datos">
        <div><strong>{(RESUMEN.accuracy * 100).toFixed(1)} %</strong><span>Accuracy</span></div>
        <div><strong>15</strong><span>Condiciones</span></div>
        <div><strong>3</strong><span>Cultivos</span></div>
      </div>
    </section>
  )
}
