import { BrainCircuit, History, LayoutDashboard, Leaf, LogOut, ScanSearch, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InterruptorTema from './InterruptorTema.jsx'

const MENU = [
  { a: '/', icono: LayoutDashboard, texto: 'Panel', fin: true },
  { a: '/diagnostico', icono: ScanSearch, texto: 'Diagnóstico' },
  { a: '/historial', icono: History, texto: 'Historial' },
  { a: '/modelo', icono: BrainCircuit, texto: 'Modelo y métricas' },
]

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const nombre = usuario?.user_metadata?.nombre || usuario?.email || ''

  async function salir() {
    await cerrarSesion()
    navigate('/login')
  }

  return (
    <div className="app">
      <aside className="lateral">
        <div className="logo-fila">
          <NavLink to="/" className="logo">
            <span className="logo-icono"><Leaf size={18} strokeWidth={2.2} /></span>
            <span><strong>FitoScan</strong><small>Detección segura con IA</small></span>
          </NavLink>
          <InterruptorTema />
        </div>
        <div>
          <p className="menu-titulo">Menú</p>
          <nav className="menu">
            {MENU.map(({ a, icono: Icono, texto, fin }) => (
              <NavLink key={a} to={a} end={fin}><Icono size={18} />{texto}</NavLink>
            ))}
          </nav>
        </div>
        <div className="lateral-pie">
          <div className="sello">
            <ShieldCheck size={16} />
            <span>Modelo verificado con SHA-256 y sesión protegida con JWT</span>
          </div>
          <div className="usuario">
            <span className="avatar">{nombre.charAt(0).toUpperCase()}</span>
            <span className="usuario-datos">
              <strong>{nombre}</strong>
              <span title={usuario?.email}>{usuario?.email}</span>
            </span>
            <button className="boton-icono" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="contenido"><Outlet /></main>
    </div>
  )
}
