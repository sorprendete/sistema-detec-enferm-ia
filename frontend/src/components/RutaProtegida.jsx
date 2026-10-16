import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return <p className="centro">Cargando…</p>
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  return children
}
