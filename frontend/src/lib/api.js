import { supabase } from './supabase'

// Backend en Azure Container Apps (o http://localhost:8000 en local)
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function tokenActual() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  return token
}

async function pedir(ruta, opciones = {}, { publico = false } = {}) {
  const headers = { ...(opciones.headers || {}) }
  if (!publico) headers.Authorization = `Bearer ${await tokenActual()}`
  let resp
  try {
    resp = await fetch(`${API_URL}${ruta}`, { ...opciones, headers })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Si estuvo inactivo, puede tardar alrededor de un minuto en arrancar; inténtalo de nuevo.')
  }
  const datos = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    if (resp.status === 401 && !publico) await supabase.auth.signOut()
    throw new Error(mensajeError(datos.detail) || `Error ${resp.status}`)
  }
  return datos
}

// FastAPI devuelve una lista cuando falla la validación de los datos enviados
function mensajeError(detalle) {
  if (Array.isArray(detalle)) return detalle.map((d) => String(d.msg || '').replace(/^Value error, /, '')).join('. ')
  return detalle
}

const json = (cuerpo) => ({ method: 'POST', body: JSON.stringify(cuerpo), headers: { 'Content-Type': 'application/json' } })

// ----- Autenticación (pasa por el backend para quedar auditada) -----
export const login = (email, password) => pedir('/auth/login', json({ email, password }), { publico: true })
export const registro = (nombre, email, password) => pedir('/auth/registro', json({ nombre, email, password }), { publico: true })
export const logout = () => pedir('/auth/logout', { method: 'POST' }).catch(() => {})

// ----- Administración (solo rol admin) -----
export const adminResumen = () => pedir('/admin/resumen')
export const adminUsuarios = () => pedir('/admin/usuarios')
export function adminAuditoria({ accion = '', estado = '', limite = 100, desde = 0 } = {}) {
  const q = new URLSearchParams({ limite, desde })
  if (accion) q.set('accion', accion)
  if (estado) q.set('estado', estado)
  return pedir(`/admin/auditoria?${q}`)
}
export const adminCambiarEstado = (id, activo) => pedir(`/admin/usuarios/${id}/estado`, json({ activo }))
export const adminAmenazas = ({ dias = 7, simulado = false } = {}) =>
  pedir(`/admin/amenazas?${new URLSearchParams({ dias, simulado })}`)

export function analizarImagen(archivo, exigencia) {
  const form = new FormData()
  form.append('imagen', archivo)
  // Nivel de exigencia en % (barra de Diagnóstico); el backend espera 0-1
  if (exigencia != null) form.append('umbral', String(exigencia / 100))
  return pedir('/predict', { method: 'POST', body: form })
}

export function obtenerHistorial(limite = 50) {
  return pedir(`/historial?limite=${limite}`)
}

export async function estadoServidor() {
  const r = await fetch(`${API_URL}/health`)
  return r.json()
}
