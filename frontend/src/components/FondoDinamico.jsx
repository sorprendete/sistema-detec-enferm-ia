import { Leaf, Sprout } from 'lucide-react'

// Hojas que suben lentamente: [posición horizontal %, tamaño px, duración s, retraso s, icono]
const HOJAS = [
  [4, 26, 34, 0, Leaf], [13, 18, 28, -12, Sprout], [22, 32, 40, -25, Leaf], [34, 20, 31, -6, Leaf],
  [46, 28, 37, -19, Sprout], [57, 22, 29, -2, Leaf], [66, 34, 42, -30, Leaf], [75, 18, 26, -15, Sprout],
  [84, 28, 35, -9, Leaf], [93, 22, 32, -22, Leaf],
]

// Capa decorativa detrás de toda la interfaz: manchas de color que se desplazan y hojas que flotan.
// No recibe clics y se detiene si el usuario pidió reducir el movimiento.
export default function FondoDinamico() {
  return (
    <div className="fondo-dinamico" aria-hidden="true">
      <span className="mancha m1" />
      <span className="mancha m2" />
      <span className="mancha m3" />
      <span className="mancha m4" />
      <span className="fondo-puntos" />
      {HOJAS.map(([x, tam, dur, retraso, Icono], i) => (
        <span
          key={i}
          className="hoja-flotante"
          style={{ left: `${x}%`, animationDuration: `${dur}s`, animationDelay: `${retraso}s` }}
        >
          <Icono size={tam} strokeWidth={1.6} />
        </span>
      ))}
    </div>
  )
}
