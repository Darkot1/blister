import Link from "next/link";
import { claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";

const ESTADO: Record<string, { texto: string; color: string }> = {
  activo: { texto: "Activo", color: "bg-exito" },
  suspendido: { texto: "Suspendido", color: "bg-peligro" },
  archivado: { texto: "Archivado", color: "bg-tenue/60" },
};

/** Estado de un espacio de trabajo: punto de color + texto. */
export function InsigniaEspacio({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO.archivado;
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${e.color}`} />
      {e.texto}
    </span>
  );
}

/** Pestañas de la sección de administración. */
export function PestanasAdmin({ activa }: { activa: "espacios" | "accesos" }) {
  return (
    <nav aria-label="Administración" className={claseSegmentado}>
      <Link href="/admin" aria-current={activa === "espacios" ? "page" : undefined} className={`${claseSegmento(activa === "espacios")} inline-flex items-center`}>
        Espacios
      </Link>
      <Link href="/admin/accesos" aria-current={activa === "accesos" ? "page" : undefined} className={`${claseSegmento(activa === "accesos")} inline-flex items-center`}>
        Bitácora de accesos
      </Link>
    </nav>
  );
}

export const ROL: Record<string, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  entrenador: "Entrenador",
  asistente: "Asistente",
};
