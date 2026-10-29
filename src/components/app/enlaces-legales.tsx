import Link from "next/link";

export const PAGINAS_LEGALES = [
  { href: "/privacidad", texto: "Privacidad" },
  { href: "/terminos", texto: "Términos" },
  { href: "/cookies", texto: "Cookies" },
] as const;

/** Enlaces a los textos legales, para los pies de página. */
export function EnlacesLegales({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {PAGINAS_LEGALES.map((p) => (
        <Link key={p.href} href={p.href} className="hover:text-tinta">
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
