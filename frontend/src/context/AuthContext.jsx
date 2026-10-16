import { createContext, useContext, useEffect, useState } from 'react'
import { login, logout, registro } from '../lib/api'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Rol del usuario (RLS: cada uno solo puede leer su propio perfil)
  const uid = sesion?.user?.id
  useEffect(() => {
    if (!uid) return setPerfil(null)
    supabase.from('perfiles').select('nombre, rol, activo').eq('id', uid).maybeSingle()
      .then(({ data }) => setPerfil(data ?? { rol: 'usuario' }))
  }, [uid])

  // El inicio de sesión y el registro pasan por el backend, que los audita
  // y bloquea los ataques de fuerza bruta; después se guarda la sesión en Supabase.
  async function iniciarSesion(email, password) {
    const s = await login(email, password)
    const { error } = await supabase.auth.setSession(s)
    if (error) throw new Error('No se pudo guardar la sesión.')
  }

  async function registrarse(email, password, nombre) {
    const r = await registro(nombre, email, password)
    if (r.sesion) await supabase.auth.setSession(r.sesion)
    return r
  }

  async function cerrarSesion() {
    await logout()
    await supabase.auth.signOut()
  }

  const valor = {
    sesion,
    usuario: sesion?.user ?? null,
    perfil,
    esAdmin: perfil?.rol === 'admin',
    cargando,
    iniciarSesion,
    registrarse,
    cerrarSesion,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
