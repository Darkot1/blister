import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SelectorTema } from "@/components/app/selector-tema";
import { VistaPaginaPublica } from "@/components/pagina-publica/vista";
import { Esqueleto } from "@/components/ui/esqueleto";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { FormularioSolicitud } from "./formulario";

// Enlace para compartir con conocidos, no para buscadores.
export const metadata: Metadata = { title: "Entrena conmigo", robots: { index: false, follow: false } };

const esSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 40;

/** Página pública del espacio: quién entrena aquí, cómo trabaja y un formulario para pedir entrenar o escribir. */
export default function PaginaPublica({ params }: PageProps<"/e/[slug]">) {
  return (
    <main id="contenido" className="min-h-dvh">
      {/* Misma forma y ancho que la página: al llegar el contenido no se mueve nada. */}
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="flex items-center justify-between py-4 sm:py-6">
              <Esqueleto className="h-6 w-40" />
              <Esqueleto className="h-9 w-36 rounded-full" />
            </div>
            <Esqueleto className="h-[21rem] rounded-[var(--radius-elevada)]" />
          </div>
        }
      >
        <Contenido params={params} />
      </Suspense>
    </main>
  );
}

async function Contenido({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  if (!esSlug(slug)) notFound();
  const supabase = await crearClienteServidor();
  const { data: pagina } = await supabase.rpc("pagina_publica", { p_slug: slug });
  if (!pagina) notFound();
  const quien = pagina.entrenadores[0]?.nombres || "Tu entrenador";
  return <VistaPaginaPublica datos={pagina} extremo={<SelectorTema />} formulario={<FormularioSolicitud slug={slug} entrenador={quien} />} />;
}
