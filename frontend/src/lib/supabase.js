import { createClient } from '@supabase/supabase-js'

// Acepta la URL aunque se copie con /rest/v1/ o una barra final
const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/(rest|auth)\/v1\/?$/, '').replace(/\/+$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
}

// La anon key es pública por diseño: la seguridad real la imponen las políticas RLS.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
