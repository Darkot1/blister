import { ETIQUETA_ESTADO_ALUMNO } from "@/lib/formato";

const colores: Record<string, string> = {
  activo: "bg-exito",
  inactivo: "bg-aviso",
  archivado: "bg-tenue/60",
};

/** Estado del alumno: punto de color + texto, en una pastilla discreta. */
export function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${colores[estado] ?? colores.archivado}`} />
      {ETIQUETA_ESTADO_ALUMNO[estado] ?? estado}
    </span>
  );
}
