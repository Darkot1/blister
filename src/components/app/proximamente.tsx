import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Encabezado } from "./encabezado";

/** Página de una sección que aún no existe: título y qué va a permitir hacer. */
export function Proximamente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <EstadoVacio titulo="Esta sección aún no está lista" descripcion={descripcion} />
    </>
  );
}
