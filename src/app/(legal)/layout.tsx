import Link from "next/link";
import { Marca } from "@/components/app/marca";
import { SelectorTema } from "@/components/app/selector-tema";
import { EnlacesLegales } from "@/components/app/enlaces-legales";
import { AvisoCookies } from "@/components/app/aviso-cookies";
import { VIGENCIA_LEGAL } from "@/lib/sitio";

/** Textos legales: una columna de lectura cómoda, sin la navegación de la app. */
export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-fondo">
      <header className="mx-auto flex h-20 max-w-[48rem] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-full" aria-label="Blister Fitness, inicio">
          <Marca />
        </Link>
        <SelectorTema />
      </header>
      <main
        id="contenido"
        className={[
          "mx-auto max-w-[48rem] px-4 pt-6 pb-20 leading-relaxed text-grafito sm:px-6",
          "[&_h1]:text-[2.25rem] [&_h1]:leading-[1.15] [&_h1]:text-tinta",
          "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-tinta",
          "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-medium [&_h3]:text-tinta",
          "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
          "[&_a]:font-medium [&_a]:text-tinta [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:no-underline",
          "[&_strong]:font-medium [&_strong]:text-tinta",
          "[&_table]:mt-4 [&_table]:w-full [&_table]:text-left [&_table]:text-sm",
          "[&_th]:border-b [&_th]:border-linea-fuerte [&_th]:py-2 [&_th]:pr-3 [&_th]:font-medium [&_th]:text-tinta",
          "[&_td]:border-b [&_td]:border-linea [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top",
        ].join(" ")}
      >
        {children}
        <p className="!mt-12 text-sm text-tenue">Vigente desde el {VIGENCIA_LEGAL}.</p>
      </main>
      <footer className="border-t border-linea">
        <div className="mx-auto flex max-w-[48rem] flex-col gap-3 px-4 py-8 text-sm text-tenue sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 Blister Fitness</span>
          <EnlacesLegales />
        </div>
      </footer>
      <AvisoCookies />
    </div>
  );
}
