import { Camera } from "lucide-react";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { fechaCorta } from "@/lib/formato";
import type { Contexto } from "@/lib/sesion";

/** Las URLs firmadas del bucket privado duran una hora: de sobra para ver la ficha. */
const VIGENCIA_S = 3600;

/**
 * Fotos de progreso del alumno (bucket privado fotos-progreso), de la más reciente a la más vieja.
 * Llegan desde el bot de Telegram: una foto con el nombre del alumno, o «📸 Foto» en su ficha.
 */
export async function FotosProgreso({ supabase, alumnoId, nombre }: { supabase: Contexto["supabase"]; alumnoId: string; nombre: string }) {
  const { data: fotos } = await supabase
    .from("fotos_progreso")
    .select("id, ruta_storage, capturada_en, notas")
    .eq("alumno_id", alumnoId)
    .order("capturada_en", { ascending: false })
    .limit(24);
  const lista = fotos ?? [];
  const { data: firmadas } = lista.length
    ? await supabase.storage.from("fotos-progreso").createSignedUrls(lista.map((f) => f.ruta_storage), VIGENCIA_S)
    : { data: [] };
  const url = new Map((firmadas ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl] as const] : [])));

  return (
    <Tarjeta className="mt-3 min-w-0 overflow-hidden sm:mt-4">
      <section id="fotos" aria-labelledby="titulo-fotos" className="scroll-mt-20">
        <CabeceraTarjeta id="titulo-fotos" titulo={`Fotos de progreso${lista.length ? ` · ${lista.length}` : ""}`} />
        {lista.length ? (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {lista.map((f) => (
              <li key={f.id} className="min-w-0">
                <a
                  href={url.get(f.ruta_storage) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl bg-hueso ring-1 ring-linea focus-visible:ring-2 focus-visible:ring-acento"
                >
                  {url.get(f.ruta_storage) ? (
                    // URL firmada y temporal: next/image no la puede optimizar ni cachear.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url.get(f.ruta_storage)} alt={`${nombre}, ${fechaCorta(f.capturada_en)}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <span className="grid aspect-[3/4] place-items-center text-xs text-tenue">No disponible</span>
                  )}
                </a>
                <p className="mt-1.5 tabular-nums text-xs text-tenue">{fechaCorta(f.capturada_en)}</p>
                {f.notas && <p className="truncate text-xs text-grafito">{f.notas}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-start gap-2.5 px-4 py-6 text-sm text-tenue">
            <Camera aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Aún no hay fotos. Mándalas al bot de Telegram con el nombre de {nombre} en el texto de la foto, o toca «📸 Foto» en su ficha del bot.
            </span>
          </p>
        )}
      </section>
    </Tarjeta>
  );
}
