/**
 * Barras de una sola serie (citas por día). Sin leyenda: el título de la tarjeta la nombra.
 * Hoy va en tinta sólida; el resto, en tinta tenue. Cada barra lleva su valor encima y un
 * `title` para el detalle al pasar el ratón; la tabla oculta es la versión accesible.
 */
export function BarrasSemana({
  datos,
  hoy,
}: {
  datos: { fecha: string; etiqueta: string; valor: number }[];
  hoy: string;
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure className="flex flex-col">
      <div aria-hidden className="grid h-28 grid-cols-7 gap-2 sm:gap-3">
        {datos.map((d) => {
          const esHoy = d.fecha === hoy;
          return (
            <div key={d.fecha} className="flex flex-col items-center gap-1.5" title={`${d.etiqueta}: ${d.valor} ${d.valor === 1 ? "cita" : "citas"}`}>
              <span className={`font-mono text-xs ${d.valor ? "text-tinta" : "text-tenue/60"}`}>{d.valor}</span>
              <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                <span
                  className={`w-full max-w-10 rounded-t-[4px] ${esHoy ? "bg-tinta" : "bg-tinta/15"}`}
                  style={{ height: d.valor ? `${(d.valor / maximo) * 100}%` : 2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 grid grid-cols-7 gap-2 border-t border-linea pt-2 sm:gap-3">
        {datos.map((d) => (
          <span key={d.fecha} className={`text-center font-mono text-[0.68rem] uppercase ${d.fecha === hoy ? "font-semibold text-tinta" : "text-tenue"}`}>
            {d.etiqueta.split(" ")[0]}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Citas por día de esta semana</caption>
        <tbody>
          {datos.map((d) => (
            <tr key={d.fecha}><th scope="row">{d.etiqueta}</th><td>{d.valor}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
