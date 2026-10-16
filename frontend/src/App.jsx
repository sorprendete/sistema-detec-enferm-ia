import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Diagnostico from './pages/Diagnostico.jsx'
import Historial from './pages/Historial.jsx'
import Login from './pages/Login.jsx'
import Modelo from './pages/Modelo.jsx'
import Panel from './pages/Panel.jsx'
import Registro from './pages/Registro.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route path="/" element={<Panel />} />
        <Route path="/diagnostico" element={<Diagnostico />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/modelo" element={<Modelo />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
