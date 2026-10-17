import { Leaf, LoaderCircle, ScanSearch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ChipsCultivos } from '../components/CultivosSoportados.jsx'
import GuiaFoto from '../components/GuiaFoto.jsx'
import ResultadoDiagnostico from '../components/ResultadoDiagnostico.jsx'
import SubirImagen from '../components/SubirImagen.jsx'
import { analizarImagen } from '../lib/api'

export default function Diagnostico() {
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState('')
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [analizando, setAnalizando] = useState(false)

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
      setResultado(await analizarImagen(archivo))
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
          <GuiaFoto />
          <SubirImagen onSeleccion={seleccionar} deshabilitado={analizando} />
          {vista && (
            <div className="vista">
              <img src={vista} alt="Hoja seleccionada" />
              <button onClick={analizar} disabled={analizando}>
                {analizando ? <><LoaderCircle size={17} className="girando" />Analizando…</> : <><ScanSearch size={17} />Analizar hoja</>}
              </button>
            </div>
          )}
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
        </section>

        {resultado ? (
          <ResultadoDiagnostico resultado={resultado} />
        ) : (
          <section className="tarjeta">
            <div className="vacio">
              <div className="vacio-icono"><Leaf size={22} /></div>
              <strong>Sin resultados todavía</strong>
              <p>El diagnóstico aparecerá aquí después de analizar una hoja.</p>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
