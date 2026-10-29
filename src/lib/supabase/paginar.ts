/** Tamaño de página: el tope de filas por respuesta de PostgREST en Supabase. */
export const FILAS_POR_PAGINA = 1000;

/**
 * Trae todas las filas de una consulta, página por página: PostgREST corta en 1000 sin avisar.
 * `pedir` recibe el rango y debe ordenar por una columna estable para que las páginas no se mezclen.
 * `basta` permite parar antes, cuando lo leído ya alcanza.
 */
export async function todasLasFilas<T>(
  pedir: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  basta?: (filas: T[]) => boolean,
): Promise<{ data: T[] }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
    const { data, error } = await pedir(desde, desde + FILAS_POR_PAGINA - 1);
    if (error || !data) break;
    filas.push(...data);
    if (data.length < FILAS_POR_PAGINA || basta?.(filas)) break;
  }
  return { data: filas };
}
