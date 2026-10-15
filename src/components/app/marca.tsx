/** Logo: un disco de pesas de perfil (las franjas) junto al nombre. */
export function Marca({ oscuro = false, className = "" }: { oscuro?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className={`grid size-8 shrink-0 place-items-center rounded-full ${oscuro ? "bg-white text-[#171721]" : "bg-tinta text-sobre-tinta"}`}
      >
        <svg viewBox="0 0 20 20" className="size-[18px]" fill="currentColor">
          <rect x="2" y="7.5" width="16" height="5" rx="1" opacity="0.35" />
          <rect x="4" y="3" width="3" height="14" rx="1" />
          <rect x="8.5" y="5" width="3" height="10" rx="1" />
          <rect x="13" y="3" width="3" height="14" rx="1" />
        </svg>
      </span>
      <span className={`titulo-display text-[1.25rem] leading-none ${oscuro ? "text-white" : ""}`}>
        Blister
        <span className={`ml-1.5 font-sans text-[0.7rem] font-medium tracking-[0.08em] uppercase ${oscuro ? "text-white/50" : "text-tenue"}`}>
          Fitness
        </span>
      </span>
    </span>
  );
}
