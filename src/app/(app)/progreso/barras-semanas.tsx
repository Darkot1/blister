import { fechaSinAnio } from "@/lib/formato";

/**
 * Constancia: sesiones completadas por semana (una sola serie, sin leyenda: el título la nombra).
 * La semana en curso va en tinta sólida; las demás, tenues. Valor encima de cada barra con sesiones,
 * `title` con el detalle y tabla para lectores de pantalla.
 */
export function BarrasSemanas({ datos }: { datos: { lunes: string; valor: number }[] }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const actual = datos.length - 1;
  return (
    <figure className="m-0">
      <div aria-hidden className="flex h-32 items-end gap-1.5">
        {datos.map((d, i) => (
          <div
            key={d.lunes}
            title={`Semana del ${fechaSinAnio(d.lunes)}: ${d.valor} ${d.valor === 1 ? "sesión" : "sesiones"}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            {d.valor > 0 && <span className="tabular-nums text-[11px] text-grafito">{d.valor}</span>}
            <span
              className={`w-full max-w-7 rounded-t-[4px] ${i === actual ? "bg-tinta" : "bg-tinta/20"}`}
              style={{ height: d.valor ? `${(d.valor / maximo) * 85}%` : 2 }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-2 flex justify-between border-t border-linea pt-1.5 text-[11px] text-tenue tabular-nums">
        <span>{fechaSinAnio(datos[0]?.lunes)}</span>
        <span>Esta semana</span>
      </div>
      <table className="sr-only">
        <caption>Sesiones completadas por semana</caption>
        <tbody>
          {datos.map((d) => (
            <tr key={d.lunes}>
              <th scope="row">Semana del {fechaSinAnio(d.lunes)}</th>
              <td>{d.valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
