import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/**
 * La app privada ya lleva noindex y redirige sin sesión; aquí solo se apartan rutas técnicas.
 * /e/<slug> no se bloquea: su propia etiqueta noindex debe poder leerse.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/recuperar", "/actualizar-clave", "/suspendido"] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
    host: URL_SITIO,
  };
}
