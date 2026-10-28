"use client";

import { motion } from "motion/react";
import { fechaSinAnio } from "@/lib/formato";

/**
 * Constancia: sesiones completadas por semana (una sola serie, sin leyenda: el título la nombra).
 * La semana en curso va en tinta sólida; las demás, tenues. Valor encima de cada barra con sesiones,
 * `title` con el detalle y tabla para lectores de pantalla. Las barras crecen desde la base, una tras otra.
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
            {d.valor > 0 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.03 }}
                className="tabular-nums text-[11px] text-grafito"
              >
                {d.valor}
              </motion.span>
            )}
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.25 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              className={`w-full max-w-7 rounded-t-[4px] ${i === actual ? "bg-tinta" : "bg-tinta/20"}`}
              style={{ height: d.valor ? `${(d.valor / maximo) * 85}%` : 2, originY: 1 }}
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
