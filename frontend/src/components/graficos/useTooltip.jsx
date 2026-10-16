import { useEffect, useRef, useState } from 'react'

// Tooltip que sigue al puntero dentro del contenedor del gráfico
export function useTooltip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  function mostrar(evento, contenido) {
    const caja = ref.current?.getBoundingClientRect()
    if (!caja) return
    const x = Math.min(Math.max(evento.clientX - caja.left, 80), caja.width - 80)
    setTip({ x, y: evento.clientY - caja.top, contenido })
  }

  const ocultar = () => setTip(null)

  const nodo = tip && (
    <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.contenido}
    </div>
  )

  return { ref, mostrar, ocultar, nodo, activo: tip }
}

export function FilaTip({ etiqueta, valor }) {
  return (
    <div className="fila"><span>{etiqueta}</span><span>{valor}</span></div>
  )
}

// Ancho real del contenedor: el SVG se dibuja a escala 1:1 para que el texto no se deforme
export function useAncho(ref, inicial = 600) {
  const [ancho, setAncho] = useState(inicial)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return ancho
}

// Marcas "redondas" para un eje que empieza en 0
export function marcasEje(maximo, cantidad = 4) {
  const bruto = maximo / cantidad
  const potencia = 10 ** Math.floor(Math.log10(bruto || 1))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? potencia * 10
  const tope = Math.ceil(maximo / paso) * paso || paso
  return { tope, marcas: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => +(i * paso).toFixed(10)) }
}
