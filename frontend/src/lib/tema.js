// Tema claro/oscuro: se guarda la elección del usuario; si no hay, se sigue al sistema.
const CLAVE = 'fitoscan-tema'

export function temaGuardado() {
  try {
    const t = localStorage.getItem(CLAVE)
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

export function temaActual() {
  return temaGuardado() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema
  try { localStorage.setItem(CLAVE, tema) } catch { /* almacenamiento no disponible */ }
}

export function iniciarTema() {
  const t = temaGuardado()
  if (t) document.documentElement.dataset.theme = t
}
