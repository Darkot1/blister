import { ETIQUETA_ESTADO_ALUMNO } from "@/lib/formato";

const colores: Record<string, string> = {
  activo: "bg-exito/10 text-exito",
  inactivo: "bg-aviso/10 text-aviso",
  archivado: "bg-tinta/[0.06] text-tenue",
};

/** Estado del alumno como pastilla de color. */
export function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${colores[estado] ?? colores.archivado}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {ETIQUETA_ESTADO_ALUMNO[estado] ?? estado}
    </span>
  );
}
