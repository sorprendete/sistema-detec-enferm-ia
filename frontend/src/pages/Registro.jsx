import { Check, Circle, CircleAlert, LoaderCircle, LockKeyhole, Mail, MailCheck, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthHero, { MarcaMovil } from '../components/AuthHero.jsx'
import Campo from '../components/Campo.jsx'
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
    try {
      const r = await registrarse(email.trim(), password, nombre.trim())
      setListo(r.sesion ? 'directo' : 'correo')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth-form">
        <div className="auth-barra"><MarcaMovil /><InterruptorTema /></div>
        {listo ? (
          <div className="formulario auth-tarjeta">
            <div className="auth-cabecera">
              <span className="auth-sello"><MailCheck size={22} /></span>
              <h2>{listo === 'directo' ? 'Cuenta creada' : 'Revisa tu correo'}</h2>
            </div>
            <p className="tenue">
              {listo === 'directo'
                ? 'Ya puedes empezar a analizar hojas.'
                : 'Te enviamos un enlace para confirmar tu cuenta.'}
            </p>
            <Link className="boton" to={listo === 'directo' ? '/' : '/login'}>
              {listo === 'directo' ? 'Ir al panel' : 'Ir a iniciar sesión'}
            </Link>
          </div>
        ) : (
          <form className="formulario auth-tarjeta" onSubmit={enviar}>
            <div className="auth-cabecera">
              <span className="auth-sello"><UserPlus size={22} /></span>
              <h2>Crear cuenta</h2>
              <p className="tenue">Tus análisis quedan guardados solo para ti.</p>
            </div>
            <Campo etiqueta="Nombre" icono={User} value={nombre} placeholder="Tu nombre"
              onChange={(e) => setNombre(e.target.value)} required maxLength={100} autoComplete="name" />
            <Campo etiqueta="Correo electrónico" icono={Mail} type="email" value={email} placeholder="nombre@correo.com"
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Campo etiqueta="Contraseña" icono={LockKeyhole} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <div className="reglas">
              {REGLAS.map(([re, txt]) => (
                <span key={txt} className={re.test(password) ? 'ok' : ''}>{re.test(password) ? <Check size={13} /> : <Circle size={13} />}{txt}</span>
              ))}
            </div>
            <Campo etiqueta="Confirmar contraseña" icono={LockKeyhole} type="password" value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
            {error && <p className="alerta-error" role="alert"><CircleAlert size={16} />{error}</p>}
            <button disabled={enviando}>
              {enviando ? <><LoaderCircle size={17} className="girando" />Creando cuenta…</> : <><UserPlus size={17} />Registrarme</>}
            </button>
            <p className="auth-cambio">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
          </form>
        )}
      </div>
    </div>
  )
}
