import { CircleAlert, LoaderCircle, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthHero, { MarcaMovil } from '../components/AuthHero.jsx'
import Campo from '../components/Campo.jsx'
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
    try {
      await iniciarSesion(email.trim(), password)
      navigate(location.state?.desde || '/', { replace: true })
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth-form">
        <div className="auth-barra"><MarcaMovil /><InterruptorTema /></div>
        <form className="formulario auth-tarjeta" onSubmit={enviar}>
          <div className="auth-cabecera">
            <span className="auth-sello"><LockKeyhole size={22} /></span>
            <h2>Iniciar sesión</h2>
            <p className="tenue">Ingresa con tu cuenta para analizar hojas y consultar tu historial.</p>
          </div>
          <Campo etiqueta="Correo electrónico" icono={Mail} type="email" value={email} placeholder="nombre@correo.com"
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          <Campo etiqueta="Contraseña" icono={LockKeyhole} type="password" value={password} placeholder="Tu contraseña"
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <p className="alerta-error" role="alert"><CircleAlert size={16} />{error}</p>}
          <button disabled={enviando}>
            {enviando ? <><LoaderCircle size={17} className="girando" />Verificando…</> : <><LogIn size={17} />Ingresar</>}
          </button>
          <p className="auth-cambio">¿No tienes cuenta? <Link to="/registro">Crear una cuenta</Link></p>
          <p className="auth-nota">
            <ShieldCheck size={15} />
            Conexión cifrada. Cada acceso queda registrado y, tras 5 intentos fallidos, la cuenta se bloquea 15 minutos.
          </p>
        </form>
      </div>
    </div>
  )
}
