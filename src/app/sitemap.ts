import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos-bd";
import { URL_SITIO } from "@/lib/sitio";

/** Fecha fija: new Date() en un archivo prerenderizado cambiaría en cada build sin que cambie nada. */
const ACTUALIZADO = "2026-10-28";

/** Páginas públicas encendidas (/e/<slug>). Sin cookies: es lo mismo para cualquiera. Se refresca cada hora. */
async function paginasPublicas() {
  "use cache";
  cacheLife("hours");
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.rpc("paginas_publicas");
  return data ?? [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginas = await paginasPublicas();
  return [
    { url: URL_SITIO, lastModified: ACTUALIZADO, changeFrequency: "monthly", priority: 1 },
    { url: `${URL_SITIO}/registro`, lastModified: ACTUALIZADO, changeFrequency: "yearly", priority: 0.8 },
    { url: `${URL_SITIO}/ingresar`, lastModified: ACTUALIZADO, changeFrequency: "yearly", priority: 0.5 },
    ...paginas.map((p) => ({
      url: `${URL_SITIO}/e/${p.slug}`,
      lastModified: p.actualizado_en,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    { url: `${URL_SITIO}/privacidad`, lastModified: ACTUALIZADO, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL_SITIO}/terminos`, lastModified: ACTUALIZADO, changeFrequency: "yearly", priority: 0.3 },
    { url: `${URL_SITIO}/cookies`, lastModified: ACTUALIZADO, changeFrequency: "yearly", priority: 0.2 },
  ];
}
