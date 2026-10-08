import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/** Pie de lista paginada: "21–40 de 82" y enlaces a la página anterior y siguiente. */
export function Paginacion({
  pagina,
  total,
  porPagina,
  href,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  /** URL de una página concreta (conserva los demás filtros). */
  href: (pagina: number) => string;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(total, pagina * porPagina);
  const clase = "inline-flex h-8 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2.5 text-sm font-medium";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 border-t border-linea bg-fondo/60 px-4 py-2.5">
      <p className="font-mono text-xs text-tenue">
        {desde}–{hasta} de {total}
      </p>
      {paginas > 1 && (
        <div className="flex items-center gap-1.5">
          {pagina > 1 ? (
            <Link href={href(pagina - 1)} scroll={false} className={`${clase} hover:border-tinta/30`} aria-label="Página anterior">
              <ArrowLeft aria-hidden className="size-4" /> <span className="hidden sm:inline">Anterior</span>
            </Link>
          ) : (
            <span aria-hidden className={`${clase} text-tenue/50`}><ArrowLeft className="size-4" /> <span className="hidden sm:inline">Anterior</span></span>
          )}
          <span className="px-1 font-mono text-xs text-tenue">{pagina}/{paginas}</span>
          {pagina < paginas ? (
            <Link href={href(pagina + 1)} scroll={false} className={`${clase} hover:border-tinta/30`} aria-label="Página siguiente">
              <span className="hidden sm:inline">Siguiente</span> <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : (
            <span aria-hidden className={`${clase} text-tenue/50`}><span className="hidden sm:inline">Siguiente</span> <ArrowRight className="size-4" /></span>
          )}
        </div>
      )}
    </nav>
  );
}

/** Página pedida en la URL, acotada a las que existen. */
export function leerPagina(valor: unknown, total: number, porPagina: number) {
  const n = typeof valor === "string" ? Number.parseInt(valor, 10) : 1;
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  return Number.isFinite(n) ? Math.min(Math.max(1, n), ultima) : 1;
}

/** Une la ruta con los parámetros no vacíos. */
export function conParametros(ruta: string, parametros: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== "" && !(clave === "pagina" && valor === 1)) p.set(clave, String(valor));
  }
  const consulta = p.toString();
  return consulta ? `${ruta}?${consulta}` : ruta;
}
