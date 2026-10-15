/**
 * Solo permite redirecciones internas (evita redirecciones abiertas).
 * Rechaza "//otro.com" y "/\otro.com": los navegadores tratan la barra invertida como "/",
 * así que "/\otro.com" saldría del sitio. Se comprueba resolviendo la ruta contra un origen ficticio.
 */
export function rutaInterna(valor: unknown, porDefecto = "/inicio") {
  if (typeof valor !== "string" || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return porDefecto;
  try {
    const url = new URL(valor, "http://interno.invalid");
    // Se revisa también la ruta ya normalizada: "/..//otro.com" queda en "//otro.com".
    if (url.origin !== "http://interno.invalid" || url.pathname.startsWith("//")) return porDefecto;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return porDefecto;
  }
}
