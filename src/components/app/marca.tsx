/** Logo: un disco de pesas visto de frente dentro del icono de la app. */
export function Marca({
  conNombre = true,
  oscuro = false,
  className = "",
}: {
  conNombre?: boolean;
  /** Sobre fondo oscuro: icono translúcido y texto claro. */
  oscuro?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className={`icono-app size-9 ${oscuro ? "bg-white/10 shadow-none" : ""}`} style={{ "--tono": "var(--tinta)" } as React.CSSProperties}>
        <svg viewBox="0 0 24 24" className="size-6">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="var(--app-entrenamiento)" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" />
        </svg>
      </span>
      {conNombre && (
        <span className="text-[1.2rem] leading-none font-bold tracking-tight">
          Blister<span className={`font-medium ${oscuro ? "text-white/55" : "text-tenue"}`}> Fitness</span>
        </span>
      )}
    </span>
  );
}
