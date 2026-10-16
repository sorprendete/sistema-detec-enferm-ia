import { BrainCircuit, History, LayoutDashboard, Leaf, ScanSearch, ShieldCheck, UserCog } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InterruptorTema from './InterruptorTema.jsx'
import MenuUsuario from './MenuUsuario.jsx'

const MENU = [
  { a: '/', icono: LayoutDashboard, texto: 'Panel', fin: true },
  { a: '/diagnostico', icono: ScanSearch, texto: 'Diagnóstico' },
  { a: '/historial', icono: History, texto: 'Historial' },
  { a: '/modelo', icono: BrainCircuit, texto: 'Modelo y métricas' },
]

export default function Layout() {
  const { esAdmin } = useAuth()

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
          {esAdmin && (
            <>
              <p className="menu-titulo">Administración</p>
              <nav className="menu">
                <NavLink to="/admin"><UserCog size={18} />Usuarios y auditoría</NavLink>
              </nav>
            </>
          )}
        </div>
        <div className="lateral-pie">
          <div className="sello">
            <ShieldCheck size={16} />
            <span>Modelo verificado con SHA-256 y sesión protegida con JWT</span>
          </div>
          <MenuUsuario />
        </div>
      </aside>
      <main className="contenido"><Outlet /></main>
    </div>
  )
}
