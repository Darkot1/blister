import { CalendarCheck, CircleCheck, Clock, UserX, type LucideIcon } from "lucide-react";
import { ETIQUETA_ESTADO_CITA } from "@/lib/formato";

/** Estados que se dibujan en la agenda (canceladas y reprogramadas no ocupan horario). */
export const ESTADOS_VISIBLES = ["programada", "confirmada", "completada", "no_asistio"] as const;

const ESTILOS: Record<string, { bloque: string; punto: string; icono: LucideIcon }> = {
  // Pendiente: tinta clara con filo oscuro.
  programada: { bloque: "bg-tinta/[0.06] text-tinta shadow-[inset_3px_0_0_var(--tinta)]", punto: "bg-tinta/40", icono: Clock },
  // Confirmada: bloque oscuro con filo volt, lo que más destaca en la semana.
  confirmada: { bloque: "bg-tinta text-white shadow-[inset_3px_0_0_var(--acento)]", punto: "bg-tinta", icono: CalendarCheck },
  completada: { bloque: "bg-exito/10 text-tinta shadow-[inset_3px_0_0_var(--exito)]", punto: "bg-exito", icono: CircleCheck },
  no_asistio: { bloque: "trama bg-superficie text-tenue line-through shadow-[inset_3px_0_0_var(--peligro)]", punto: "bg-peligro", icono: UserX },
};

const estilo = (estado: string) => ESTILOS[estado] ?? ESTILOS.programada;

/** Clases de fondo y texto del bloque de una cita en la agenda. */
export const tonoEstadoCita = (estado: string) => estilo(estado).bloque;

export function IconoEstadoCita({ estado, className = "size-3.5" }: { estado: string; className?: string }) {
  const Icono = estilo(estado).icono;
  return <Icono aria-hidden className={className} />;
}

/** Estado de la cita: punto de color + texto (nunca solo color). */
export function InsigniaCita({ estado }: { estado: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${estilo(estado).punto}`} />
      {ETIQUETA_ESTADO_CITA[estado] ?? estado}
    </span>
  );
}
