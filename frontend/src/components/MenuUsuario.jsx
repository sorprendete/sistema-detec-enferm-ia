import { CircleCheck, Clock, KeyRound, LogOut, Mail, ScrollText, ShieldCheck, TriangleAlert, User, UserCog } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const fecha = (v) => (v ? new Date(v).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

// Tarjeta con los datos de la cuenta que se abre al tocar el avatar
export default function MenuUsuario() {
  const { usuario, perfil, esAdmin, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)

  const nombre = perfil?.nombre || usuario?.user_metadata?.nombre || usuario?.email?.split('@')[0] || ''

  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  function ir(ruta, estado) {
    setAbierto(false)
    navigate(ruta, { state: estado })
  }

  async function salir() {
    setAbierto(false)
    await cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="usuario" ref={caja}>
      <button className="usuario-boton" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        aria-haspopup="dialog" title="Ver mi cuenta">
        <span className="avatar">{nombre.charAt(0).toUpperCase()}</span>
        <span className="usuario-datos">
          <strong>{nombre}</strong>
          <span>{esAdmin ? 'Administrador' : usuario?.email}</span>
        </span>
      </button>
      <button className="boton-icono" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
        <LogOut size={17} />
      </button>

      {abierto && (
        <div className="cuenta" role="dialog" aria-label="Mi cuenta">
          <div className="cuenta-cabecera">
            <span className="avatar avatar-grande">{nombre.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{nombre}</strong>
              {esAdmin
                ? <span className="badge neutro"><KeyRound size={13} />Administrador</span>
                : <span className="badge neutro"><User size={13} />Usuario</span>}
            </div>
          </div>

          <dl className="cuenta-datos">
            <div><dt><Mail size={14} />Correo</dt><dd title={usuario?.email}>{usuario?.email}</dd></div>
            <div>
              <dt><ShieldCheck size={14} />Verificación</dt>
              <dd>{usuario?.email_confirmed_at
                ? <span className="cuenta-ok"><CircleCheck size={13} />Correo confirmado</span>
                : <span className="cuenta-aviso"><TriangleAlert size={13} />Sin confirmar</span>}</dd>
            </div>
            <div><dt><User size={14} />Cuenta creada</dt><dd>{fecha(usuario?.created_at)}</dd></div>
            <div><dt><Clock size={14} />Último acceso</dt><dd>{fecha(usuario?.last_sign_in_at)}</dd></div>
          </dl>

          {esAdmin && (
            <div className="cuenta-acciones">
              <p className="cuenta-titulo">Administración</p>
              <button className="cuenta-enlace" onClick={() => ir('/admin', { accion: 'login' })}>
                <ScrollText size={16} />Ver registros de inicio de sesión
              </button>
              <button className="cuenta-enlace" onClick={() => ir('/admin')}>
                <UserCog size={16} />Usuarios y auditoría completa
              </button>
            </div>
          )}

          <button className="cuenta-enlace cuenta-salir" onClick={salir}><LogOut size={16} />Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}
