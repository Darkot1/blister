import type { LucideIcon } from "lucide-react";

const TAMANOS = {
  sm: { caja: "size-8", icono: "size-[18px]" },
  md: { caja: "size-11", icono: "size-[22px]" },
  lg: { caja: "size-14", icono: "size-7" },
  xl: { caja: "size-20", icono: "size-10" },
};

/** Icono de app en squircle con el color de su sección. Siempre decorativo: el texto va al lado. */
export function IconoApp({
  icono: Icono,
  tono,
  tamano = "md",
  className = "",
}: {
  icono: LucideIcon;
  tono: string;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  const t = TAMANOS[tamano];
  return (
    <span aria-hidden className={`icono-app ${t.caja} ${className}`} style={{ "--tono": tono } as React.CSSProperties}>
      <Icono className={t.icono} strokeWidth={2.1} />
    </span>
  );
}
