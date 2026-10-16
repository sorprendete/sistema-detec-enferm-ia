import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CultivosSoportados from '../components/CultivosSoportados.jsx'
import BarrasHorizontales from '../components/graficos/BarrasHorizontales.jsx'
import Columnas from '../components/graficos/Columnas.jsx'
import Indicador from '../components/Indicador.jsx'
import { useAuth } from '../context/AuthContext'
import { Activity, Gauge, Leaf, ScanSearch, TriangleAlert } from 'lucide-react'
import { CULTIVOS, NO_CONCLUYENTE, infoClase, nombreLargo } from '../data/enfermedades'
import { CAMPO, RESUMEN } from '../data/metricas'
import { obtenerHistorial } from '../lib/api'

const pct = (x) => `${(x * 100).toFixed(1)} %`
const DIAS = 14

export default function Panel() {
  const { usuario } = useAuth()
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    obtenerHistorial(200).then(setFilas).catch((e) => setError(e.message))
  }, [])

  const datos = useMemo(() => {
    if (!filas) return null
    const total = filas.length
    const sanas = filas.filter((f) => f.saludable).length
    const dudosas = filas.filter((f) => f.baja_certeza).length
    const confMedia = total ? filas.reduce((a, f) => a + f.confianza, 0) / total : 0

    // Análisis por día (últimos 14 días)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const dias = Array.from({ length: DIAS }, (_, i) => {
      const d = new Date(hoy); d.setDate(hoy.getDate() - (DIAS - 1 - i))
      return { fecha: d, valor: 0 }
    })
    filas.forEach((f) => {
      const d = new Date(f.created_at); d.setHours(0, 0, 0, 0)
      const i = Math.round((d - dias[0].fecha) / 86400000)
      if (i >= 0 && i < DIAS) dias[i].valor += 1
    })
    const porDia = dias.map((d) => ({
      id: d.fecha.toISOString(),
      etiqueta: d.fecha.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      titulo: d.fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }),
      valor: d.valor,
    }))

    // Diagnósticos más frecuentes
    const conteo = {}
    filas.forEach((f) => { conteo[f.clase] = (conteo[f.clase] || 0) + 1 })
    const frecuentes = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([clase, n]) => ({
        id: clase, etiqueta: nombreLargo(clase), valor: n,
        tip: [['Análisis', n], ['% del total', pct(n / total)]],
      }))

    // Por cultivo
    const porCultivo = CULTIVOS.map((c) => {
      const delCultivo = filas.filter((f) => infoClase(f.clase).cultivo === c.id)
      const enfermas = delCultivo.filter((f) => !f.saludable && f.clase !== NO_CONCLUYENTE).length
      return {
        id: c.id, etiqueta: c.nombre, valor: delCultivo.length,
        tip: [['Análisis', delCultivo.length], ['Sanas', delCultivo.length - enfermas], ['Con enfermedad', enfermas]],
      }
    })

    return { total, sanas, dudosas, confMedia, porDia, frecuentes, porCultivo }
  }, [filas])

  const nombre = usuario?.user_metadata?.nombre?.split(' ')[0]

  return (
    <>
      <header className="encabezado">
        <div>
          <h1>Hola{nombre ? `, ${nombre}` : ''}</h1>
          <p>Resumen de tus análisis y del rendimiento del modelo.</p>
        </div>
        <Link className="boton" to="/diagnostico"><ScanSearch size={17} />Nuevo diagnóstico</Link>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="rejilla col-4">
        <Indicador icono={Activity} etiqueta="Análisis realizados" valor={datos ? datos.total : '—'} nota="Últimos 200 registros" />
        <Indicador icono={Leaf} etiqueta="Hojas sanas" valor={datos?.total ? pct(datos.sanas / datos.total) : '—'}
          nota={datos ? `${datos.sanas} de ${datos.total}` : ''} />
        <Indicador icono={TriangleAlert} etiqueta="Con enfermedad" valor={datos?.total ? pct((datos.total - datos.sanas) / datos.total) : '—'}
          nota={datos ? `${datos.total - datos.sanas} hojas` : ''} />
        <Indicador icono={Gauge} etiqueta="Confianza promedio" valor={datos?.total ? pct(datos.confMedia) : '—'}
          nota={datos ? `${datos.dudosas} con baja certeza` : ''} />
      </section>

      <section className="rejilla col-2">
        <div className="tarjeta ancho-2">
          <div className="tarjeta-titulo"><h2>Análisis por día</h2><p>Últimos {DIAS} días</p></div>
          {datos ? <Columnas datos={datos.porDia} /> : <p className="vacio">Cargando…</p>}
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Diagnósticos más frecuentes</h2><p>Número de análisis</p></div>
          {datos ? <BarrasHorizontales datos={datos.frecuentes} anchoEtiqueta={210} /> : <p className="vacio">Cargando…</p>}
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2>Análisis por cultivo</h2><p>Pasa el cursor para ver sanas y enfermas</p></div>
          {datos ? <BarrasHorizontales datos={datos.porCultivo} anchoEtiqueta={120} altoBarra={26} separacion={16} />
            : <p className="vacio">Cargando…</p>}
        </div>
      </section>

      <section className="rejilla col-4">
        <Indicador etiqueta="Accuracy del modelo" valor={pct(RESUMEN.accuracy)} nota={`${RESUMEN.imagenes.toLocaleString('es')} fotos de laboratorio`} />
        <Indicador etiqueta="Precisión ponderada" valor={pct(RESUMEN.precision)} nota="Alertas que son enfermedades reales" />
        <Indicador etiqueta="Accuracy en campo" valor={pct(CAMPO.accuracy)} nota={`${CAMPO.imagenes} fotos reales (PlantDoc)`} />
        <Indicador etiqueta="F1-Score" valor={pct(RESUMEN.f1)} nota="Balance entre ambas" />
      </section>

      <section className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Cultivos que puede analizar</h2>
          <p>Las hojas de otras plantas se rechazan automáticamente</p>
        </div>
        <CultivosSoportados />
      </section>
    </>
  )
}
