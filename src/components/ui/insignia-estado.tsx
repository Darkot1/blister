import { ETIQUETA_ESTADO_ALUMNO } from "@/lib/formato";

const colores: Record<string, string> = {
  activo: "bg-exito",
  inactivo: "bg-aviso",
  archivado: "bg-tenue",
};

/** Estado con un punto de color, como la pastilla de color de un disco. */
export function InsigniaEstado({ estado }: { estado: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-tenue">
      <span aria-hidden className={`size-2 rounded-full ${colores[estado] ?? "bg-tenue"}`} />
      {ETIQUETA_ESTADO_ALUMNO[estado] ?? estado}
    </span>
  );
}
