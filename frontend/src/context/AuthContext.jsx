import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const valor = {
    sesion,
    usuario: sesion?.user ?? null,
    cargando,
    iniciarSesion: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    registrarse: (email, password, nombre) =>
      supabase.auth.signUp({ email, password, options: { data: { nombre } } }),
    cerrarSesion: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
