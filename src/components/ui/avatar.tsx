import { iniciales } from "@/lib/formato";

// Fondos apagados: el avatar identifica sin competir con los datos.
const FONDOS = ["#ffe3d6", "#dfe6f2", "#e8e2f3", "#dcefe6", "#f4ecd9", "#e3e9ee"];

const TAMANOS = { sm: "size-8 text-xs rounded-md", md: "size-9 text-[0.8rem] rounded-lg", xl: "size-16 text-xl rounded-xl" };

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
      className={`grid shrink-0 place-items-center font-semibold text-tinta ${TAMANOS[tamano]}`}
      style={{ background: FONDOS[suma % FONDOS.length] }}
    >
      {iniciales(nombres, apellidos)}
    </span>
  );
}
