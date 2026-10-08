import Link from "next/link";
import { partesLocales } from "@/lib/calendario";
import { ETIQUETA_TIPO_CITA, fechaCorta, hora } from "@/lib/formato";
import { InsigniaCita } from "./estado-cita";

export type CitaResumen = { id: string; alumno_id: string; tipo: string; estado: string; inicia_en: string };

/** Fila de cita para listas (inicio): hora grande, alumno y estado; lleva a su semana en el calendario. */
export function FilaCita({ cita, alumno, conFecha = false }: { cita: CitaResumen; alumno?: string; conFecha?: boolean }) {
  const fecha = partesLocales(cita.inicia_en).fecha;
  const tachada = cita.estado === "no_asistio";
  return (
    <li>
      <Link
        href={`/calendario?semana=${fecha}`}
        className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-tinta/[0.03]"
      >
        <span className="cifra text-[1.35rem] leading-none font-semibold">
          {conFecha ? fechaCorta(fecha).replace(/ \d{4}$/, "") : hora(cita.inicia_en)}
        </span>
        <span className="min-w-0">
          <span className={`block truncate ${tachada ? "text-tenue line-through" : "font-semibold"}`}>{alumno ?? "Alumno"}</span>
          <span className="block truncate text-sm text-tenue">
            {conFecha ? `${hora(cita.inicia_en)} · ` : ""}{ETIQUETA_TIPO_CITA[cita.tipo] ?? cita.tipo}
          </span>
        </span>
        <InsigniaCita estado={cita.estado} />
      </Link>
    </li>
  );
}
