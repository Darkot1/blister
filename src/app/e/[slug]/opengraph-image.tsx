import { createClient } from "@supabase/supabase-js";
import { ImageResponse } from "next/og";
import { nombrePublico, normalizarDiseno, textoSobre, urlFoto } from "@/lib/pagina-publica/contenido";
import type { Database } from "@/lib/supabase/tipos-bd";
import { URL_SITIO } from "@/lib/sitio";

// Lo que se ve al compartir /e/<slug> por WhatsApp o redes: la portada de esa página (nombre, promesa,
// foto, color y botón), no la imagen genérica de Blister.
export const alt = "Página de entrenamiento personal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OSCURO = "#12121b";
const CLARO = "#f5f5f8";

/**
 * Una letra de Google Fonts en TTF (lo que lee Satori; sin un navegador moderno, Google no manda woff2).
 * Completa: con `&text=` Google quita el espacio y Satori lo toma de otra letra. Si falla, usa la suya.
 */
async function letra(familia: string, ejes: string) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${familia}:${ejes}`, {
      signal: AbortSignal.timeout(4000),
    }).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url, { signal: AbortSignal.timeout(4000) }).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** La foto como PNG en data URL: las portadas se suben en WebP y Satori no lo lee. Sin foto (o si falla), null. */
async function fotoPng(url: string | null) {
  if (!url) return null;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!respuesta.ok) return null;
    const { default: sharp } = await import("sharp");
    const png = await sharp(Buffer.from(await respuesta.arrayBuffer()))
      .resize(480, 630, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const recortar = (texto: string, max: number) => (texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto);

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sin sesión: la RPC pública es la misma que lee la página.
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: pagina } = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? await supabase.rpc("pagina_publica", { p_slug: slug }) : { data: null };

  const diseno = normalizarDiseno(pagina?.diseno);
  const nombre = pagina ? nombrePublico(pagina.entrenadores) : "Página no disponible";
  const titular = recortar(pagina?.titular || "Entrenamiento a tu medida, con un plan pensado para tu objetivo.", 110);
  const antetitulo = ["Entrenamiento personal", pagina?.ubicacion].filter(Boolean).join(" · ");
  const oferta = pagina?.oferta_inicial ? recortar(pagina.oferta_inicial, 48) : null;

  // Mismo tono que la portada: en color, la franja es el acento; si no, oscura (la imagen no sabe del tema del visitante).
  const enColor = diseno.fondo === "color";
  const fondo = enColor ? diseno.acento : OSCURO;
  const tinta = enColor ? textoSobre(diseno.acento) : CLARO;
  const boton = enColor ? { fondo: tinta, texto: tinta === "#ffffff" ? OSCURO : "#ffffff" } : { fondo: diseno.acento, texto: textoSobre(diseno.acento) };

  const enlace = `${new URL(URL_SITIO).host}/e/${slug}`;
  // Archivo ancha en el nombre (como `titulo-display`) e Inter en el resto: casi igual a la Geist de la
  // página, que Satori dibuja con espacios dobles.
  const [foto, archivo, inter] = await Promise.all([
    fotoPng(pagina ? urlFoto(pagina.foto_ruta) ?? pagina.entrenadores[0]?.avatar_url ?? null : null),
    letra("Archivo", "wdth,wght@112.5,500"),
    letra("Inter", "wght@500"),
  ]);
  const fuentes = [
    archivo && { name: "Archivo", data: archivo, weight: 500 as const, style: "normal" as const },
    inter && { name: "Inter", data: inter, weight: 500 as const, style: "normal" as const },
  ].filter((f) => f !== null);
  // Con foto la columna de texto es más angosta: el nombre baja un paso.
  const tamNombre = (nombre.length > 22 ? 64 : nombre.length > 14 ? 80 : 96) - (foto ? 12 : 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: fondo,
          // Satori falla con propiedades en undefined: el degradado solo se pone cuando hay.
          ...(!enColor && { backgroundImage: `radial-gradient(ellipse 80% 70% at 0% 0%, ${diseno.acento}55, ${OSCURO} 70%)` }),
          color: tinta,
          ...(inter && { fontFamily: "Inter" }),
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 64px 56px 72px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>
            <span style={{ opacity: 0.75 }}>{antetitulo}</span>
            {!foto && <span style={{ opacity: 0.45, textTransform: "none", letterSpacing: 0 }}>{enlace}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", fontSize: tamNombre, lineHeight: 1.02, ...(archivo && { fontFamily: "Archivo" }), fontWeight: 500 }}>{nombre}</div>
            <div style={{ display: "flex", fontSize: 30, lineHeight: 1.3, opacity: 0.8, maxWidth: 640 }}>{titular}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{ display: "flex", flexShrink: 0, alignItems: "center", height: 64, padding: "0 32px", borderRadius: 32, whiteSpace: "nowrap", background: boton.fondo, color: boton.texto, fontSize: 26, fontWeight: 600 }}
            >
              {diseno.boton} ↓
            </div>
            {oferta && <div style={{ display: "flex", fontSize: 24, opacity: 0.85 }}>{oferta}</div>}
          </div>
        </div>
        {foto && (
          <div style={{ display: "flex", position: "relative", width: 480, height: 630 }}>
            <img src={foto} width={480} height={630} alt="" style={{ objectFit: "cover" }} />
            {/* La foto se funde con la franja, como en la portada. */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 480, height: 630, display: "flex", backgroundImage: `linear-gradient(to right, ${fondo}, ${fondo}00 35%)` }} />
          </div>
        )}
      </div>
    ),
    { ...size, ...(fuentes.length && { fonts: fuentes }) },
  );
}
