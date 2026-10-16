export default function Indicador({ icono: Icono, etiqueta, valor, nota }) {
  return (
    <div className="tarjeta indicador">
      <span className="etiqueta">
        {etiqueta}
        {Icono && <span className="icono"><Icono size={16} /></span>}
      </span>
      <span className="valor">{valor}</span>
      {nota && <span className="nota">{nota}</span>}
    </div>
  )
}
