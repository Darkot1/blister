import { CalendarCheck, CircleCheck, Clock, UserX, type LucideIcon } from "lucide-react";
import { ETIQUETA_ESTADO_CITA } from "@/lib/formato";

/** Estados que se dibujan en la agenda (canceladas y reprogramadas no ocupan horario). */
export const ESTADOS_VISIBLES = ["programada", "confirmada", "completada", "no_asistio"] as const;

const ESTILOS: Record<string, { bloque: string; insignia: string; icono: LucideIcon }> = {
  programada: {
    bloque: "bg-app-calendario/10 text-tinta shadow-[inset_3px_0_0_var(--app-calendario)]",
    insignia: "bg-app-calendario/10 text-app-calendario",
    icono: Clock,
  },
  confirmada: {
    bloque: "bg-app-calendario text-white",
    insignia: "bg-app-calendario text-white",
    icono: CalendarCheck,
  },
  completada: {
    bloque: "bg-exito/10 text-tinta shadow-[inset_3px_0_0_var(--exito)]",
    insignia: "bg-exito/10 text-exito",
    icono: CircleCheck,
  },
  no_asistio: {
    bloque: "bg-tinta/[0.05] text-tenue line-through",
    insignia: "bg-tinta/[0.06] text-tenue",
    icono: UserX,
  },
};

const estilo = (estado: string) => ESTILOS[estado] ?? ESTILOS.programada;

/** Clases de fondo y texto del bloque de una cita en la agenda. */
export const tonoEstadoCita = (estado: string) => estilo(estado).bloque;

export function IconoEstadoCita({ estado, className = "size-3.5" }: { estado: string; className?: string }) {
  const Icono = estilo(estado).icono;
  return <Icono aria-hidden className={className} strokeWidth={2.3} />;
}

export function InsigniaCita({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold ${estilo(estado).insignia}`}>
      <IconoEstadoCita estado={estado} className="size-3.5" />
      {ETIQUETA_ESTADO_CITA[estado] ?? estado}
    </span>
  );
}
