import { Fila } from "@/components/ui/lista-filas";
import { cx } from "@/lib/clases";
import { ETIQUETA_TIPO_CITA, hora } from "@/lib/formato";
import { InsigniaCita } from "./estado-cita";
import css from "./fila-cita.module.css";

export type CitaFila = { alumno: string; tipo: string; estado: string; iniciaEn: string; terminaEn: string };

/** "hasta las 8:00 a. m." / "hasta la 1:00 p. m." */
export const hastaLa = (instante: string) => {
  const h = hora(instante);
  return `hasta ${h.startsWith("1:") ? "la" : "las"} ${h}`;
};

/** Hora en Big Shoulders con el meridiano pequeño debajo: "7:00" / "a. m.". */
export function HoraCita({ instante, className }: { instante: string; className?: string }) {
  const [reloj, ...meridiano] = hora(instante).split(" ");
  return (
    <span className={cx(css.hora, className)}>
      <span className={css.reloj}>{reloj}</span>
      <span className={css.meridiano}>{meridiano.join(" ")}</span>
    </span>
  );
}

/**
 * Una cita como fila de agenda: hora, alumno, tipo con hora de fin y estado. Se usa en la agenda
 * móvil del calendario (`alPulsar`, abre el detalle) y en Inicio (`href`, lleva a la semana).
 * `marca` señala con la barra amarilla de "aquí estás" la cita en curso o la siguiente.
 */
export function FilaCita({
  cita,
  href,
  alPulsar,
  marca,
}: {
  cita: CitaFila;
  href?: string;
  alPulsar?: () => void;
  marca?: "ahora" | "siguiente";
}) {
  const tipo = ETIQUETA_TIPO_CITA[cita.tipo] ?? cita.tipo;
  return (
    <Fila
      href={href}
      alPulsar={alPulsar}
      className={cx(marca && css.marcada)}
      atenuada={cita.estado === "no_asistio"}
      inicio={<HoraCita instante={cita.iniciaEn} />}
      titulo={cita.alumno}
      detalle={
        marca ? (
          <>
            <strong className={css.nota}>{marca === "ahora" ? "En curso" : "Siguiente"}</strong>,{" "}
            {tipo.toLowerCase()} {hastaLa(cita.terminaEn)}
          </>
        ) : (
          `${tipo} ${hastaLa(cita.terminaEn)}`
        )
      }
      fin={<InsigniaCita estado={cita.estado} />}
      chevron
    />
  );
}
