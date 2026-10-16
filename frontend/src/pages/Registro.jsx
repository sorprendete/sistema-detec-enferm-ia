import { Check, Circle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthHero from '../components/AuthHero.jsx'
import InterruptorTema from '../components/InterruptorTema.jsx'
import { useAuth } from '../context/AuthContext'

// Política de contraseñas: mínimo 8 caracteres con mayúscula, minúscula, número y símbolo
const REGLAS = [
  [/.{8,}/, '8 caracteres o más'],
  [/[A-Z]/, 'Una mayúscula'],
  [/[a-z]/, 'Una minúscula'],
  [/\d/, 'Un número'],
  [/[^A-Za-z0-9]/, 'Un símbolo'],
]

export default function Registro() {
  const { registrarse } = useAuth()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const faltan = REGLAS.filter(([re]) => !re.test(password))

  async function enviar(e) {
    e.preventDefault()
    setError('')
    if (faltan.length) return setError('La contraseña no cumple todos los requisitos.')
    if (password !== confirmar) return setError('Las contraseñas no coinciden.')
    setEnviando(true)
    const { data, error } = await registrarse(email.trim(), password, nombre.trim())
    setEnviando(false)
    if (error) return setError(error.message)
    setListo(data.session ? 'directo' : 'correo')
  }

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth-form">
        <InterruptorTema />
        {listo ? (
          <div className="formulario">
            <h2>{listo === 'directo' ? '¡Cuenta creada!' : 'Revisa tu correo'}</h2>
            <p>
              {listo === 'directo'
                ? 'Ya puedes empezar a analizar hojas.'
                : 'Te enviamos un enlace para confirmar tu cuenta.'}
            </p>
            <Link className="boton" to={listo === 'directo' ? '/' : '/login'}>
              {listo === 'directo' ? 'Ir al panel' : 'Ir a iniciar sesión'}
            </Link>
          </div>
        ) : (
          <form className="formulario" onSubmit={enviar}>
            <div>
              <h2>Crear cuenta</h2>
              <p className="tenue">Tus análisis quedan guardados solo para ti.</p>
            </div>
            <label>Nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={100} />
            </label>
            <label>Correo electrónico
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label>Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </label>
            <div className="reglas">
              {REGLAS.map(([re, txt]) => (
                <span key={txt} className={re.test(password) ? 'ok' : ''}>{re.test(password) ? <Check size={13} /> : <Circle size={13} />}{txt}</span>
              ))}
            </div>
            <label>Confirmar contraseña
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
            </label>
            {error && <p className="error">{error}</p>}
            <button disabled={enviando}>{enviando ? 'Creando…' : 'Registrarme'}</button>
            <p className="tenue">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}
