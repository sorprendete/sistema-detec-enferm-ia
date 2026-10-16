import { CircleCheck, CircleHelp, Download, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CULTIVOS, NO_CONCLUYENTE, infoClase } from '../data/enfermedades'
import { obtenerHistorial } from '../lib/api'

// Cultivo guardado por el backend (nombre del dataset) → nombre en español
const CULTIVO_ES = { Pepper__bell: 'Pimiento', Potato: 'Papa', Tomato: 'Tomate' }
const cultivoDe = (f) => infoClase(f.clase).cultivo || CULTIVO_ES[f.cultivo] || ''
const esNoConcluyente = (f) => f.clase === NO_CONCLUYENTE

const pct = (x) => `${(x * 100).toFixed(1)} %`

function exportarCSV(filas) {
  const cab = ['fecha', 'cultivo', 'diagnostico', 'saludable', 'confianza', 'baja_certeza', 'imagen_sha256', 'modelo_sha256']
  const lineas = filas.map((f) => {
    const i = infoClase(f.clase)
    return [f.created_at, cultivoDe(f), i.nombre, f.saludable, f.confianza, f.baja_certeza, f.imagen_sha256, f.modelo_sha256 ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const blob = new Blob([[cab.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'historial_fitoscan.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Historial() {
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')
  const [cultivo, setCultivo] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    obtenerHistorial(200).then(setFilas).catch((e) => setError(e.message))
  }, [])

  const visibles = useMemo(() => (filas ?? []).filter((f) => {
    if (cultivo && cultivoDe(f) !== cultivo) return false
    if (estado === 'sana' && !f.saludable) return false
    if (estado === 'enferma' && (f.saludable || esNoConcluyente(f))) return false
    if (estado === 'no_concluyente' && !esNoConcluyente(f)) return false
    if (estado === 'dudosa' && !f.baja_certeza) return false
    return true
  }), [filas, cultivo, estado])

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Historial de análisis</h1>
          <p>Registro de auditoría: cada análisis guarda la huella SHA-256 de la imagen y no puede editarse ni borrarse.</p>
        </div>
        {visibles.length > 0 && <button className="boton-sec" onClick={() => exportarCSV(visibles)}><Download size={16} />Exportar CSV</button>}
      </header>

      <section className="tarjeta">
        <div className="filtros">
          <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} aria-label="Filtrar por cultivo">
            <option value="">Todos los cultivos</option>
            {CULTIVOS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            <option value="sana">Sanas</option>
            <option value="enferma">Con enfermedad</option>
            <option value="dudosa">Baja certeza</option>
            <option value="no_concluyente">No concluyentes</option>
          </select>
          {filas && <span className="tenue" style={{ alignSelf: 'center' }}>{visibles.length} de {filas.length} registros</span>}
        </div>

        {error && <p className="error">{error}</p>}
        {!filas && !error && <p className="vacio">Cargando…</p>}
        {filas && visibles.length === 0 && <p className="vacio">No hay análisis con esos filtros.</p>}
        {visibles.length > 0 && (
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Cultivo</th><th>Diagnóstico</th><th>Estado</th><th className="num">Confianza</th><th>Imagen (SHA-256)</th></tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const info = infoClase(f.clase)
                  return (
                    <tr key={f.id}>
                      <td>{new Date(f.created_at).toLocaleString('es')}</td>
                      <td>{cultivoDe(f)}</td>
                      <td>{info.nombre}</td>
                      <td>
                        {esNoConcluyente(f) ? (
                          <span className="badge neutro"><CircleHelp size={13} />Sin diagnóstico</span>
                        ) : (
                          <>
                            <span className={`badge ${f.saludable ? 'sano' : 'enfermo'}`}>
                              {f.saludable ? <><CircleCheck size={13} />Sana</> : <><TriangleAlert size={13} />Enferma</>}
                            </span>
                            {f.baja_certeza && <span className="badge atencion" style={{ marginLeft: 6 }}>Baja certeza</span>}
                          </>
                        )}
                      </td>
                      <td className="num">{pct(f.confianza)}</td>
                      <td><code title={f.imagen_sha256}>{f.imagen_sha256.slice(0, 16)}…</code></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
