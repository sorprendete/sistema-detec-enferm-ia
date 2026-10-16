import { supabase } from './supabase'

const limpiar = (url) => (url || '').trim().replace(/\/$/, '')

// Servidor principal (Azure Container Apps) y de respaldo (Hugging Face Spaces).
// Si solo se define VITE_API_URL, el sistema funciona con un único servidor.
const SERVIDORES = [
  { nombre: 'Servidor principal', url: limpiar(import.meta.env.VITE_API_URL) || 'http://localhost:8000' },
  { nombre: 'Servidor de respaldo', url: limpiar(import.meta.env.VITE_API_URL_RESPALDO) },
].filter((s, i, lista) => s.url && lista.findIndex((o) => o.url === s.url) === i)

// Tiempo máximo de espera de un servidor antes de pasar al otro
const ESPERA_MS = 20000
// Respuestas que indican servidor caído, reiniciando o dormido: se prueba el otro
const ESTADOS_REINTENTO = new Set([502, 503, 504])

// Si el principal falla se usa el respaldo durante 5 minutos y luego se vuelve a probar el principal
const VOLVER_AL_PRINCIPAL_MS = 5 * 60 * 1000
let preferido = 0
let desde = 0
let ultimoAtendido = null

export const servidorAtendido = () => ultimoAtendido

async function tokenActual() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  return token
}

async function conEspera(url, opciones, ms) {
  const control = new AbortController()
  const reloj = ms ? setTimeout(() => control.abort(), ms) : null
  try {
    return await fetch(url, { ...opciones, signal: control.signal })
  } finally {
    if (reloj) clearTimeout(reloj)
  }
}

// Recorre los servidores empezando por el preferido (normalmente el principal).
// El último de la lista espera sin límite (puede estar despertando).
async function solicitar(ruta, opciones = {}) {
  if (preferido !== 0 && Date.now() - desde > VOLVER_AL_PRINCIPAL_MS) preferido = 0
  const orden = SERVIDORES.map((_, i) => (preferido + i) % SERVIDORES.length)
  let error
  for (const [paso, i] of orden.entries()) {
    const esUltimo = paso === orden.length - 1
    try {
      const resp = await conEspera(`${SERVIDORES[i].url}${ruta}`, opciones, esUltimo ? 0 : ESPERA_MS)
      if (!esUltimo && ESTADOS_REINTENTO.has(resp.status)) continue
      if (i !== preferido) desde = Date.now()
      preferido = i
      ultimoAtendido = SERVIDORES[i].nombre
      return resp
    } catch (e) {
      error = e
    }
  }
  throw error || new Error('Sin servidores configurados')
}

async function pedir(ruta, opciones = {}) {
  const token = await tokenActual()
  let resp
  try {
    resp = await solicitar(ruta, {
      ...opciones,
      headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Si estuvo inactivo, puede tardar ~1 minuto en despertar.')
  }
  const datos = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    if (resp.status === 401) await supabase.auth.signOut()
    throw new Error(datos.detail || `Error ${resp.status}`)
  }
  return datos
}

export async function analizarImagen(archivo) {
  const form = new FormData()
  form.append('imagen', archivo)
  const datos = await pedir('/predict', { method: 'POST', body: form })
  return { ...datos, servidor: ultimoAtendido }
}

export function obtenerHistorial(limite = 50) {
  return pedir(`/historial?limite=${limite}`)
}

export async function estadoServidor() {
  const r = await solicitar('/health')
  return { ...(await r.json()), servidor: ultimoAtendido }
}
