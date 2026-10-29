import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import { SelectorTema } from "@/components/app/selector-tema";
import { AvisoCookies } from "@/components/app/aviso-cookies";
import { VistaPaginaPublica } from "@/components/pagina-publica/vista";
import { Esqueleto } from "@/components/ui/esqueleto";
import { listaCertificaciones, urlFoto } from "@/lib/pagina-publica/contenido";
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

const nombreCompleto = (p: DatosPagina) => {
  const e = p.entrenadores[0];
  return e ? `${e.nombres} ${e.apellidos}`.trim() : p.nombre;
};

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
  const titulo = pagina.nombre && pagina.nombre !== quien ? `${quien} · ${pagina.nombre}` : `${quien} · Entrenador personal`;
  const descripcion = resumen(pagina);
  const foto = urlFoto(pagina.foto_ruta) ?? pagina.entrenadores[0]?.avatar_url ?? undefined;
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
      ...(foto && { images: [{ url: foto, alt: quien }] }),
    },
    twitter: { card: foto ? "summary_large_image" : "summary", title: titulo, description: descripcion },
  };
}

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
      <VistaPaginaPublica datos={pagina} extremo={<SelectorTema />} formulario={<FormularioSolicitud slug={slug} entrenador={quien} />} />
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
      ...(p.nombre && { worksFor: { "@type": "Organization", name: p.nombre } }),
      ...(p.ubicacion && { address: { "@type": "PostalAddress", addressLocality: p.ubicacion, addressCountry: "CO" } }),
      ...(p.instagram && { sameAs: [`https://instagram.com/${p.instagram}`] }),
      ...(listaCertificaciones(p.certificaciones).length && { hasCredential: listaCertificaciones(p.certificaciones).map((c) => ({ "@type": "EducationalOccupationalCredential", name: c })) }),
    },
  };
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
