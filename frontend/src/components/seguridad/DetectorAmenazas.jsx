import { Activity, BrainCircuit, ChevronRight, Download, FlaskConical, Globe, LoaderCircle, Radar, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { adminAmenazas } from '../../lib/api'
import BarrasHorizontales from '../graficos/BarrasHorizontales.jsx'
import Indicador from '../Indicador.jsx'

const NIVELES = {
  alto: { texto: 'Alto', clase: 'enfermo' },
  medio: { texto: 'Medio', clase: 'atencion' },
  normal: { texto: 'Normal', clase: 'neutro' },
}
const PERIODOS = [[1, 'Últimas 24 h'], [7, 'Últimos 7 días'], [30, 'Últimos 30 días']]

function exportarAlertas(ips) {
  const cab = ['ip', 'nivel', 'puntaje_ml', 'anomalia_ml', 'reglas', 'motivo_ml']
  const lineas = ips.map((r) => [r.ip, r.nivel, r.puntaje, r.anomalia_ml ? 'si' : 'no',
    r.reglas.map((h) => `${h.tipo} (${h.detalle})`).join('; '), r.explicacion.join('; ')]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([[cab.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8' }))
  a.download = 'alertas_fitoscan.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function Motivos({ r }) {
  return (
    <div className="amenaza-motivos">
      {r.reglas.map((h) => (
        <span key={h.tipo} className={`amenaza-regla ${h.grave ? 'grave' : ''}`} title={h.detalle}>
          <ShieldAlert size={13} />{h.tipo}<em>{h.detalle}</em>
        </span>
      ))}
      {r.anomalia_ml && (
        <span className="amenaza-ml">
          <Sparkles size={13} />
          <span>
            <strong>{r.solo_ml ? 'Solo lo detectó el modelo' : 'El modelo también lo marca'}</strong>
            {r.explicacion.length > 0 && <> · {r.explicacion.join(' · ')}</>}
          </span>
        </span>
      )}
    </div>
  )
}

export default function DetectorAmenazas() {
  const [dias, setDias] = useState(7)
  const [simulado, setSimulado] = useState(false)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [verNormales, setVerNormales] = useState(false)

  const analizar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setDatos(await adminAmenazas({ dias, simulado }))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [dias, simulado])

  useEffect(() => { analizar() }, [analizar])

  const alertas = datos?.ips.filter((r) => r.nivel !== 'normal') ?? []
  const umbral = datos?.modelo.umbral_puntaje ?? 55
  const barras = (datos?.ips ?? []).slice(0, 10).map((r) => ({
    id: r.ip, etiqueta: r.ip, valor: r.puntaje,
    tip: [['Puntaje', `${r.puntaje} / 100`], ['Nivel', NIVELES[r.nivel].texto], ['Eventos', r.caracteristicas.eventos]],
  }))
  const tipos = Object.entries(datos?.resumen.por_tipo ?? {}).map(([k, v]) => ({ id: k, etiqueta: k, valor: v }))

  return (
    <>
      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Detección de amenazas con Machine Learning</h2>
          <p>Reglas por umbral + Isolation Forest sobre el registro de auditoría</p>
        </div>
        <p className="tenue" style={{ marginBottom: 14 }}>
          El modelo aprende cómo se comporta una IP normal a partir de la propia auditoría y marca las que se salen
          del patrón, aunque ninguna regla las describa. No necesita ejemplos de ataques y se entrena en segundos
          cada vez que pulsas <strong>Analizar</strong>.
        </p>
        <div className="filtros">
          <div className="segmentado" role="group" aria-label="Origen de los datos">
            <button type="button" className={!simulado ? 'activo' : ''} onClick={() => setSimulado(false)}>
              <Globe size={15} />Auditoría real
            </button>
            <button type="button" className={simulado ? 'activo' : ''} onClick={() => setSimulado(true)}>
              <FlaskConical size={15} />Tráfico simulado
            </button>
          </div>
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
            {PERIODOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <button onClick={analizar} disabled={cargando}>
            {cargando ? <><LoaderCircle size={16} className="girando" />Analizando…</> : <><Radar size={16} />Analizar</>}
          </button>
        </div>
        {simulado && (
          <div className="aviso info">
            <FlaskConical size={16} />
            <span>
              Una semana de uso normal de 40 agricultores con 5 ataques: fuerza bruta, prueba de contraseñas en muchas
              cuentas con un script, sondeo del modelo, creación masiva de cuentas y una IP que entra a 4 cuentas de
              madrugada. No se escribe nada en la base de datos.
            </span>
          </div>
        )}
        {datos && !datos.modelo.entrenado && (
          <div className="aviso" style={{ marginTop: 12 }}>
            <TriangleAlert size={16} />
            <span>
              {datos.modelo.motivo} Por ahora solo se aplican las reglas. Prueba con <strong>Tráfico simulado</strong> para
              ver el modelo en acción.
            </span>
          </div>
        )}
        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      </section>

      {datos && (
        <>
          <section className="rejilla col-4" style={{ marginTop: 16 }}>
            <Indicador icono={Activity} etiqueta="Eventos analizados" valor={datos.resumen.eventos}
              nota={datos.fuente === 'simulado' ? 'Tráfico simulado' : PERIODOS.find(([v]) => v === datos.dias)?.[1]} />
            <Indicador icono={Globe} etiqueta="IPs analizadas" valor={datos.resumen.ips} />
            <Indicador icono={ShieldAlert} etiqueta="Alertas de nivel alto" valor={datos.resumen.alto}
              nota={`${datos.resumen.medio} de nivel medio`} />
            <Indicador icono={BrainCircuit} etiqueta="Detectadas solo por ML" valor={datos.resumen.solo_ml}
              nota="Ninguna regla las habría visto" />
          </section>

          <section className="rejilla col-2">
            <div className="tarjeta">
              <div className="tarjeta-titulo"><h2>Puntaje de anomalía por IP</h2><p>Las 10 más altas · de 0 a 100</p></div>
              {datos.modelo.entrenado
                ? <BarrasHorizontales datos={barras} max={100} anchoEtiqueta={130}
                    referencia={{ valor: umbral, etiqueta: `Umbral de anomalía (${umbral})` }} />
                : <p className="vacio">El modelo necesita más historial.</p>}
            </div>
            <div className="tarjeta">
              <div className="tarjeta-titulo"><h2>Tipos de amenaza detectados</h2><p>Número de IPs</p></div>
              <BarrasHorizontales datos={tipos} anchoEtiqueta={230} />
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-titulo">
              <h2>IPs sospechosas</h2>
              <div className="filtros" style={{ margin: 0 }}>
                <label className="interruptor">
                  <input type="checkbox" checked={verNormales} onChange={(e) => setVerNormales(e.target.checked)} />
                  Mostrar también las normales
                </label>
                {alertas.length > 0 && (
                  <button className="boton-sec" onClick={() => exportarAlertas(alertas)}><Download size={15} />Exportar CSV</button>
                )}
              </div>
            </div>
            {alertas.length === 0 && !verNormales && <p className="vacio">No se detectaron amenazas en este periodo.</p>}
            {(verNormales ? datos.ips : alertas).length > 0 && (
              <div className="tabla-scroll tabla-tarjetas tabla-amenazas">
                <table>
                  <thead><tr><th>IP</th><th>Nivel</th><th>Puntaje ML</th><th>Motivo</th><th>Actividad</th></tr></thead>
                  <tbody>
                    {(verNormales ? datos.ips : alertas).map((r) => {
                      const c = r.caracteristicas
                      return (
                        <tr key={r.ip}>
                          <td className="celda-principal" data-label="IP">
                            <code>{r.ip}</code>
                            <span className={`badge ${NIVELES[r.nivel].clase} solo-movil`}>{NIVELES[r.nivel].texto}</span>
                          </td>
                          <td className="oculta-movil" data-label="Nivel"><span className={`badge ${NIVELES[r.nivel].clase}`}>{NIVELES[r.nivel].texto}</span></td>
                          <td data-label="Puntaje ML">
                            <span className={`puntaje-ml ${r.puntaje >= umbral ? 'alto' : ''}`}>
                              <i style={{ width: `${Math.min(100, r.puntaje)}%` }} />
                              <strong>{datos.modelo.entrenado ? r.puntaje : '—'}</strong>
                            </span>
                          </td>
                          <td className="celda-detalle" data-label="Motivo">
                            {r.nivel === 'normal' ? <span className="tenue">Comportamiento habitual</span> : <Motivos r={r} />}
                          </td>
                          <td data-label="Actividad" className="tenue">
                            {c.eventos} eventos · {c.fallos_login} fallos · {c.correos_distintos} cuenta(s)
                            {c.rechazos > 0 && <> · {c.rechazos} rechazadas</>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <details style={{ marginTop: 14 }}>
              <summary><ChevronRight size={15} className="chevron" />Cómo funciona el detector</summary>
              <div className="como-funciona">
                <p>
                  <strong>1. Reglas por umbral.</strong> {datos.umbrales.fuerza_bruta} o más contraseñas fallidas (fuerza bruta),
                  {' '}{datos.umbrales.correos_distintos} o más cuentas probadas, {datos.umbrales.rechazos} o más imágenes rechazadas,
                  {' '}{datos.umbrales.por_minuto} o más eventos en un minuto, {datos.umbrales.registros} o más cuentas creadas, o un
                  cliente que no es un navegador.
                </p>
                <p>
                  <strong>2. {datos.modelo.algoritmo}.</strong> Resume cada IP en {datos.modelo.caracteristicas.length} números
                  ({datos.modelo.caracteristicas.join(', ')}), los estandariza y entrena {datos.modelo.arboles} árboles que
                  intentan aislar cada IP. Las que se aíslan con pocos cortes son raras: su puntaje sube por encima de {umbral}.
                </p>
                <p>
                  <strong>3. Nivel.</strong> Alto si incumple una regla grave o una regla y el modelo coinciden; medio si solo
                  una de las dos la marca.
                </p>
              </div>
            </details>
          </section>
        </>
      )}
    </>
  )
}
