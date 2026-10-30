import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { SelectorTema } from "@/components/app/selector-tema";
import { AvisoCookies } from "@/components/app/aviso-cookies";
import { VistaPaginaPublica } from "@/components/pagina-publica/vista";
import { Esqueleto } from "@/components/ui/esqueleto";
import { listaCertificaciones, nombrePublico, urlFoto } from "@/lib/pagina-publica/contenido";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { PaginaPublica as DatosPagina } from "@/lib/supabase/tipos-bd";
import { URL_SITIO } from "@/lib/sitio";
import { FormularioSolicitud } from "./formulario";

const esSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 40;

/** Una sola lectura por petición: la piden los metadatos y la página. */
const leerPagina = cache(async (slug: string) => {
  if (!esSlug(slug)) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.rpc("pagina_publica", { p_slug: slug });
  return data ?? null;
});

// Siempre el nombre del entrenador: el del espacio suele ser el automático ("Espacio de…").
const nombreCompleto = (p: DatosPagina) => nombrePublico(p.entrenadores);

/** Texto plano corto para buscadores y vistas previas al compartir. */
const resumen = (p: DatosPagina) => {
  const texto = (p.titular || p.presentacion || `Entrena con ${nombreCompleto(p)}. Escríbele desde su página.`).replace(/\s+/g, " ").trim();
  return texto.length > 160 ? `${texto.slice(0, 157).trimEnd()}…` : texto;
};

/** Título, descripción e imagen propios de cada entrenador: así se ve en Google y al compartir el enlace. */
export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await leerPagina(slug);
  if (!pagina) return { title: "Página no disponible", robots: { index: false, follow: false } };

  const quien = nombreCompleto(pagina);
  const titulo = `${quien} · Entrenamiento personal${pagina.ubicacion ? ` en ${pagina.ubicacion}` : ""}`;
  const descripcion = resumen(pagina);
  // La imagen al compartir la genera opengraph-image.tsx (la portada de esta página).
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/e/${slug}` },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `/e/${slug}`,
      type: "profile",
      locale: "es_CO",
    },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}

/** Página pública del espacio: quién entrena aquí, cómo trabaja y un formulario para pedir entrenar o escribir. */
export default function PaginaPublica({ params }: PageProps<"/e/[slug]">) {
  return (
    <main id="contenido" className="min-h-dvh">
      {/* Misma forma y ancho que la página: al llegar el contenido no se mueve nada. */}
      <Suspense
        fallback={
          <div>
            <div className="border-b border-linea">
              <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-10">
                <Esqueleto className="h-6 w-40" />
                <Esqueleto className="hidden h-10 w-44 rounded-full sm:block" />
              </div>
            </div>
            <div className="bg-superficie">
              <div className="mx-auto max-w-6xl space-y-5 px-5 pt-12 pb-10 md:px-10 md:py-20">
                <Esqueleto className="h-4 w-48" />
                <Esqueleto className="h-24 w-full max-w-xl md:h-36" />
                <Esqueleto className="h-6 w-full max-w-md" />
                <Esqueleto className="h-12 w-56 rounded-full" />
              </div>
            </div>
          </div>
        }
      >
        <Contenido params={params} />
      </Suspense>
      <AvisoCookies />
    </main>
  );
}

async function Contenido({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  const pagina = await leerPagina(slug);
  if (!pagina) notFound();
  const quien = pagina.entrenadores[0]?.nombres || "Tu entrenador";
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(pagina, slug) }} />
      <VistaPaginaPublica datos={pagina} barraMovil extremo={<SelectorTema />} formulario={<FormularioSolicitud slug={slug} entrenador={quien} />} />
    </>
  );
}

/** Datos estructurados (schema.org ProfilePage + Person), escapados contra inyección de HTML. */
function jsonLd(p: DatosPagina, slug: string) {
  const url = `${URL_SITIO}/e/${slug}`;
  const foto = urlFoto(p.foto_ruta) ?? p.entrenadores[0]?.avatar_url ?? undefined;
  const datos = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    inLanguage: "es-CO",
    mainEntity: {
      "@type": "Person",
      name: nombreCompleto(p),
      jobTitle: "Entrenador personal",
      description: resumen(p),
      ...(foto && { image: foto }),
      ...(p.ubicacion && { address: { "@type": "PostalAddress", addressLocality: p.ubicacion, addressCountry: "CO" } }),
      ...(p.instagram && { sameAs: [`https://instagram.com/${p.instagram}`] }),
      ...(listaCertificaciones(p.certificaciones).length && { hasCredential: listaCertificaciones(p.certificaciones).map((c) => ({ "@type": "EducationalOccupationalCredential", name: c })) }),
    },
  };
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
