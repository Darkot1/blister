import { Disco, type TonoDisco } from "@/components/ui/disco";
import { Insignia } from "@/components/ui/insignia";
import { ETIQUETA_ESTADO_CITA } from "@/lib/formato";

/**
 * Cómo se presenta cada estado de cita, con el código de los discos:
 * programada = disco vacío, confirmada = azul, completada = verde, no asistió = rojo.
 * El color nunca va solo: la insignia lleva el texto y el bloque de la rejilla, además,
 * un patrón de borde (discontinuo si está programada) y el nombre tachado si no asistió.
 */
export const PRESENTACION_ESTADO_CITA: Record<string, { tono: TonoDisco }> = {
  programada: { tono: "vacio" },
  confirmada: { tono: "azul" },
  completada: { tono: "verde" },
  no_asistio: { tono: "rojo" },
};

/** Estados que se muestran en la agenda (las canceladas y reprogramadas no se consultan). */
export const ESTADOS_VISIBLES = Object.keys(PRESENTACION_ESTADO_CITA);

export const tonoEstadoCita = (estado: string) =>
  (PRESENTACION_ESTADO_CITA[estado] ?? PRESENTACION_ESTADO_CITA.programada).tono;

/** Disco del estado de una cita (decorativo: el texto de al lado dice el estado). */
export function DiscoEstadoCita({ estado, className }: { estado: string; className?: string }) {
  return <Disco tono={tonoEstadoCita(estado)} tamano="pequeno" className={className} />;
}

export const IconoEstadoCita = DiscoEstadoCita;

/** Disco + texto del estado de una cita. */
export function InsigniaCita({ estado, className }: { estado: string; className?: string }) {
  return (
    <Insignia tono={tonoEstadoCita(estado)} className={className}>
      {ETIQUETA_ESTADO_CITA[estado] ?? estado}
    </Insignia>
  );
}
