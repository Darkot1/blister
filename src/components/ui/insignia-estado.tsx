import { ETIQUETA_ESTADO_ALUMNO } from "@/lib/formato";
import { Insignia, type TonoInsignia } from "./insignia";

const TONO: Record<string, TonoInsignia> = {
  activo: "verde",
  inactivo: "amarillo",
  archivado: "vacio",
};

/** Estado de un alumno: disco verde (activo), amarillo (en pausa) o vacío (archivado) + el texto. */
export function InsigniaEstado({ estado }: { estado: string }) {
  return <Insignia tono={TONO[estado] ?? "vacio"}>{ETIQUETA_ESTADO_ALUMNO[estado] ?? estado}</Insignia>;
}
