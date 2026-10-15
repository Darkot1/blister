import { iniciales } from "@/lib/formato";

// Fondos apagados con texto oscuro fijo: se leen igual en modo claro y oscuro.
const FONDOS = ["#d9ddf5", "#e3e3ea", "#d8e7e1", "#ece2da", "#e4dcf0", "#dbe5ef"];

const TAMANOS = { sm: "size-8 text-xs rounded-full", md: "size-9 text-[0.8rem] rounded-full", xl: "size-16 text-xl rounded-full" };

/** Avatar con iniciales; el fondo sale del id, así cada alumno conserva siempre el suyo. */
export function Avatar({
  id,
  nombres,
  apellidos,
  tamano = "md",
}: {
  id: string;
  nombres: string;
  apellidos: string;
  tamano?: keyof typeof TAMANOS;
}) {
  let suma = 0;
  for (const c of id) suma = (suma * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-medium ${TAMANOS[tamano]}`}
      // Tinte claro con texto oscuro fijo: se lee igual en los dos temas.
      style={{ background: FONDOS[suma % FONDOS.length], color: "#1e1e2a" }}
    >
      {iniciales(nombres, apellidos)}
    </span>
  );
}
