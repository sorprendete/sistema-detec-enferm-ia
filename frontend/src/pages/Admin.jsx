import { Ban, CircleCheck, Download, KeyRound, Leaf, LockKeyhole, RefreshCw, ScanSearch, TriangleAlert, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Indicador from '../components/Indicador.jsx'
import { useAuth } from '../context/AuthContext'
import { nombreLargo } from '../data/enfermedades'
import { adminAuditoria, adminCambiarEstado, adminResumen, adminUsuarios } from '../lib/api'

const PAGINA = 100

const ACCIONES = {
  login: 'Inicio de sesión',
  registro: 'Registro',
  logout: 'Cierre de sesión',
  predict: 'Análisis',
  admin: 'Administración',
}
const ESTADOS = {
  exito: { texto: 'Éxito', clase: 'sano' },
  fallo: { texto: 'Fallo', clase: 'enfermo' },
  bloqueado: { texto: 'Bloqueado', clase: 'atencion' },
}

// "Resultado: Tomato_Late_blight (0.92)" -> "Resultado: Tomate · Tizón tardío (92 %)"
function detalle(texto) {
  if (!texto) return '—'
  return texto.replace(/^Resultado: (\S+) \(([\d.]+)\)\.?$/, (_, clase, conf) =>
    `Resultado: ${nombreLargo(clase)} (${Math.round(Number(conf) * 100)} %)`)
}

const fecha = (v) => (v ? new Date(v).toLocaleString('es', { dateStyle: 'short', timeStyle: 'medium' }) : '—')

// Navegador y sistema a partir del User-Agent, solo para lectura rápida
function dispositivo(ua = '') {
  if (!ua) return '—'
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Otro'
  const so = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return so ? `${nav} · ${so}` : nav
}

function exportarCSV(filas) {
  const cab = ['fecha', 'accion', 'estado', 'email', 'ip', 'navegador', 'detalle']
  const lineas = filas.map((f) => [f.fecha, f.accion, f.estado, f.email ?? '', f.ip ?? '', f.agente ?? '', f.detalle ?? '']
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([[cab.join(','), ...lineas].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'auditoria_fitoscan.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function Resumen({ datos }) {
  if (!datos) return <section className="rejilla col-4"><div className="tarjeta vacio">Cargando…</div></section>
  return (
    <>
      <section className="rejilla col-4">
        <Indicador icono={Users} etiqueta="Usuarios registrados" valor={datos.usuarios} />
        <Indicador icono={ScanSearch} etiqueta="Análisis realizados" valor={datos.analisis}
          nota={`${datos.no_concluyentes} sin diagnóstico concluyente`} />
        <Indicador icono={Leaf} etiqueta="Hojas sanas" valor={datos.sanos}
          nota={`${datos.enfermos} con enfermedad`} />
        <Indicador icono={LockKeyhole} etiqueta="Inicios de sesión fallidos" valor={datos.logins_fallidos_24h}
          nota={`Últimas 24 h · ${datos.bloqueos_24h} bloqueo(s)`} />
      </section>
    </>
  )
}

function TablaUsuarios({ filas, error, onCambiar, cambiando, miId }) {
  return (
    <section className="tarjeta">
      <div className="tarjeta-titulo">
        <h2>Usuarios</h2>
        <p>Desactivar una cuenta le impide iniciar sesión; sus datos se conservan.</p>
      </div>
      {error && <p className="error">{error}</p>}
      {!filas && !error && <p className="vacio">Cargando…</p>}
      {filas && (
        <div className="tabla-scroll tabla-tarjetas">
          <table>
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Registrado</th><th>Último acceso</th><th aria-label="Acciones" /></tr>
            </thead>
            <tbody>
              {filas.map((u) => (
                <tr key={u.id}>
                  <td className="celda-principal">
                    <div className="celda-usuario">
                      <span className="avatar">{(u.nombre || u.email || '?').charAt(0).toUpperCase()}</span>
                      <span><strong>{u.nombre || 'Sin nombre'}</strong><span className="tenue">{u.email}</span></span>
                    </div>
                  </td>
                  <td data-label="Rol">{u.rol === 'admin' ? <span className="badge neutro"><KeyRound size={13} />Administrador</span> : 'Usuario'}</td>
                  <td data-label="Estado">
                    <span className="celda-badges">
                      {u.activo
                        ? <span className="badge sano"><CircleCheck size={13} />Activo</span>
                        : <span className="badge enfermo"><Ban size={13} />Desactivado</span>}
                      {u.correo_confirmado === false && <span className="badge atencion">Correo sin confirmar</span>}
                    </span>
                  </td>
                  <td data-label="Registrado">{fecha(u.creado_en)}</td>
                  <td data-label="Último acceso">{fecha(u.ultimo_acceso)}</td>
                  <td className="num celda-acciones">
                    {u.id !== miId && u.rol !== 'admin' && (
                      <button className="boton-sec boton-chico" disabled={cambiando === u.id}
                        onClick={() => onCambiar(u)}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Auditoria() {
  // Desde la tarjeta de la cuenta se puede llegar con el filtro ya puesto (p. ej. solo inicios de sesión)
  const { state } = useLocation()
  const seccion = useRef(null)
  const [accion, setAccion] = useState(state?.accion ?? '')
  const [estado, setEstado] = useState('')
  const [filas, setFilas] = useState(null)
  const [hayMas, setHayMas] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (desde = 0) => {
    setCargando(true)
    setError('')
    try {
      const nuevas = await adminAuditoria({ accion, estado, limite: PAGINA, desde })
      setFilas((prev) => (desde ? [...(prev ?? []), ...nuevas] : nuevas))
      setHayMas(nuevas.length === PAGINA)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [accion, estado])

  useEffect(() => { cargar(0) }, [cargar])
  useEffect(() => { if (state?.accion) setAccion(state.accion) }, [state])
  // Lleva la vista al registro cuando ya se cargó (la página cambia de alto al llegar los datos)
  const desplazado = useRef(null)
  useEffect(() => {
    if (!state?.accion || !filas || desplazado.current === state) return
    desplazado.current = state
    seccion.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
  }, [state, filas])

  return (
    <section className="tarjeta" ref={seccion} id="auditoria">
      <div className="tarjeta-titulo">
        <h2>Registro de auditoría</h2>
        <p>Lo escribe solo el servidor; nadie puede editarlo ni borrarlo desde la aplicación.</p>
      </div>
      <div className="filtros">
        <select value={accion} onChange={(e) => setAccion(e.target.value)} aria-label="Filtrar por acción">
          <option value="">Todas las acciones</option>
          {Object.entries(ACCIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
        </select>
        <button className="boton-sec" onClick={() => cargar(0)} disabled={cargando}><RefreshCw size={15} />Actualizar</button>
        {filas?.length > 0 && <button className="boton-sec" onClick={() => exportarCSV(filas)}><Download size={15} />Exportar CSV</button>}
      </div>
      {error && <p className="error">{error}</p>}
      {!filas && !error && <p className="vacio">Cargando…</p>}
      {filas && filas.length === 0 && <p className="vacio">No hay eventos con esos filtros.</p>}
      {filas?.length > 0 && (
        <div className="tabla-scroll tabla-tarjetas">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Acción</th><th>Estado</th><th>Usuario</th><th>IP</th><th>Navegador</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const est = ESTADOS[f.estado] ?? { texto: f.estado, clase: 'neutro' }
                return (
                  <tr key={f.id}>
                    <td data-label="Fecha">{fecha(f.fecha)}</td>
                    <td className="celda-principal" data-label="Acción">
                      {ACCIONES[f.accion] ?? f.accion}
                      <span className={`badge ${est.clase} solo-movil`}>{est.texto}</span>
                    </td>
                    <td className="oculta-movil" data-label="Estado"><span className={`badge ${est.clase}`}>{est.texto}</span></td>
                    <td data-label="Usuario">{f.email || '—'}</td>
                    <td data-label="IP"><code>{f.ip || '—'}</code></td>
                    <td data-label="Navegador" title={f.agente}>{dispositivo(f.agente)}</td>
                    <td className="celda-detalle" data-label="Detalle" title={f.detalle}>{detalle(f.detalle)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {hayMas && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="boton-sec" onClick={() => cargar(filas.length)} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </section>
  )
}

export default function Admin() {
  const { usuario } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [usuarios, setUsuarios] = useState(null)
  const [errorUsuarios, setErrorUsuarios] = useState('')
  const [cambiando, setCambiando] = useState(null)
  const [aviso, setAviso] = useState('')

  const cargarUsuarios = useCallback(() => {
    adminUsuarios().then(setUsuarios).catch((e) => setErrorUsuarios(e.message))
  }, [])

  useEffect(() => {
    adminResumen().then(setResumen).catch((e) => setAviso(e.message))
    cargarUsuarios()
  }, [cargarUsuarios])

  async function cambiar(u) {
    const accion = u.activo ? 'desactivar' : 'activar'
    if (!window.confirm(`¿Seguro que quieres ${accion} la cuenta ${u.email}?`)) return
    setCambiando(u.id)
    try {
      await adminCambiarEstado(u.id, !u.activo)
      setUsuarios((lista) => lista.map((x) => (x.id === u.id ? { ...x, activo: !u.activo } : x)))
    } catch (e) {
      setAviso(e.message)
    } finally {
      setCambiando(null)
    }
  }

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Administración</h1>
          <p>Usuarios, estadísticas de uso y registro de accesos del sistema.</p>
        </div>
      </header>
      {aviso && <div className="tarjeta aviso-admin"><TriangleAlert size={16} />{aviso}</div>}
      <Resumen datos={resumen} />
      <TablaUsuarios filas={usuarios} error={errorUsuarios} onCambiar={cambiar} cambiando={cambiando} miId={usuario?.id} />
      <div style={{ height: 16 }} />
      <Auditoria />
    </>
  )
}
