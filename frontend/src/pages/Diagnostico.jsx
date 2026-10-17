import { Leaf, LoaderCircle, ScanSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ChipsCultivos } from '../components/CultivosSoportados.jsx'
import GuiaFoto from '../components/GuiaFoto.jsx'
import NivelExigencia, { EXIGENCIA } from '../components/NivelExigencia.jsx'
import ResultadoDiagnostico from '../components/ResultadoDiagnostico.jsx'
import SubirImagen from '../components/SubirImagen.jsx'
import { analizarImagen } from '../lib/api'

// El nivel elegido se recuerda en este navegador
const CLAVE_EXIGENCIA = 'fitoscan-exigencia'

function exigenciaGuardada() {
  try {
    const v = Number(localStorage.getItem(CLAVE_EXIGENCIA))
    if (v >= EXIGENCIA.min && v <= EXIGENCIA.max && v % EXIGENCIA.paso === 0) return v
  } catch { /* almacenamiento no disponible */ }
  return EXIGENCIA.recomendada
}

export default function Diagnostico() {
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [exigencia, setExigencia] = useState(exigenciaGuardada)

  function cambiarExigencia(v) {
    setExigencia(v)
    try { localStorage.setItem(CLAVE_EXIGENCIA, String(v)) } catch { /* sin almacenamiento */ }
  }

  // Si se mueve la barra después de analizar, el resultado mostrado usa el nivel anterior
  const nivelCambiado = resultado?.umbral != null && Math.round(resultado.umbral * 100) !== exigencia

  useEffect(() => () => vista && URL.revokeObjectURL(vista), [vista])

  function seleccionar(f) {
    setArchivo(f)
    setVista(URL.createObjectURL(f))
    setResultado(null)
    setError('')
  }

  async function analizar() {
    setAnalizando(true)
    setError('')
    try {
      setResultado(await analizarImagen(archivo, exigencia))
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalizando(false)
    }
  }

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Diagnóstico de hojas</h1>
          <p>Sube la foto de una sola hoja y el modelo identificará si está sana o qué enfermedad presenta.</p>
        </div>
      </header>

      <div className="diagnostico">
        <section className="tarjeta">
          <div className="tarjeta-titulo"><h2>Cultivos admitidos</h2></div>
          <ChipsCultivos />
          <p className="tenue" style={{ margin: '10px 0 16px' }}>
            Si subes una hoja de otra planta o una imagen que no es una hoja, el sistema la rechazará.
          </p>
          <SubirImagen onSeleccion={seleccionar} deshabilitado={analizando} />
          {vista && (
            <div className="vista">
              <img src={vista} alt="Hoja seleccionada" />
              <NivelExigencia
                valor={exigencia} onCambio={cambiarExigencia} deshabilitado={analizando}
                confianza={resultado?.admitida ? resultado.confianza : null}
              />
              {nivelCambiado && (
                <p className="exigencia-aviso">Cambiaste el nivel de exigencia. Vuelve a analizar para aplicarlo.</p>
              )}
              <button onClick={analizar} disabled={analizando}>
                {analizando ? <><LoaderCircle size={17} className="girando" />Analizando…</> : <><ScanSearch size={17} />{nivelCambiado ? 'Volver a analizar' : 'Analizar hoja'}</>}
              </button>
            </div>
          )}
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        </section>

        {resultado ? (
          <ResultadoDiagnostico resultado={resultado} />
        ) : (
          // Mientras no hay resultado, este panel muestra cómo tomar la foto
          <section className="tarjeta panel-guia">
            <GuiaFoto />
            <p className="guia-pie"><Leaf size={15} />El diagnóstico aparecerá aquí después de analizar la hoja.</p>
          </section>
        )}
      </div>
    </>
  )
}
