import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthHero from '../components/AuthHero.jsx'
import InterruptorTema from '../components/InterruptorTema.jsx'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { usuario, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await iniciarSesion(email.trim(), password)
    setEnviando(false)
    // Mensaje genérico: no revela si el correo existe o no
    if (error) return setError('Correo o contraseña incorrectos, o correo aún no confirmado.')
    navigate(location.state?.desde || '/', { replace: true })
  }

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth-form">
        <InterruptorTema />
        <form className="formulario" onSubmit={enviar}>
          <div>
            <h2>Iniciar sesión</h2>
            <p className="tenue">Accede para analizar hojas y ver tu historial.</p>
          </div>
          <label>Correo electrónico
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="error">{error}</p>}
          <button disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
          <p className="tenue">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        </form>
      </div>
    </div>
  )
}
