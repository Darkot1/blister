import { iniciales } from "@/lib/formato";

const TONOS = [
  "var(--app-alumnos)",
  "var(--app-entrenamiento)",
  "var(--app-ejercicios)",
  "var(--app-calendario)",
  "var(--app-progreso)",
  "#0e9aa7",
];

const TAMANOS = { sm: "size-9 text-sm", md: "size-11 text-[0.95rem]", xl: "size-24 text-3xl" };

/** Avatar con iniciales; el color sale del id, así cada alumno conserva siempre el suyo. */
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
  const tono = TONOS[suma % TONOS.length];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${TAMANOS[tamano]}`}
      style={{ background: `linear-gradient(165deg, color-mix(in oklab, ${tono} 70%, white), ${tono})` }}
    >
      {iniciales(nombres, apellidos)}
    </span>
  );
}
