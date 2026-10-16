import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Oculta la sección en el frontend; el backend y la base de datos vuelven a comprobar el rol.
export default function RutaAdmin({ children }) {
  const { perfil, esAdmin } = useAuth()
  if (!perfil) return <p className="centro">Cargando…</p>
  if (!esAdmin) return <Navigate to="/" replace />
  return children
}
