"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, ExternalLink, Globe, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { EnlaceBoton } from "@/components/ui/boton";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";

const sinSuscripcion = () => () => {};

/**
 * Resumen en Ajustes de la página pública: si está visible, su enlace para compartir y el acceso
 * al editor (/configuracion/pagina). Lo que envían los visitantes llega a Alumnos → Solicitudes.
 */
export function TarjetaPaginaPublica({ activa, slug, editable }: { activa: boolean; slug: string; editable: boolean }) {
  const [copiado, setCopiado] = useState(false);
  // El dominio solo se conoce en el navegador; en el servidor se muestra la ruta.
  const origen = useSyncExternalStore(sinSuscripcion, () => location.origin, () => "");
  const enlace = `${origen}/e/${slug}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  };

  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="titulo-pagina">
        <CabeceraTarjeta
          id="titulo-pagina"
          titulo="Página pública"
          accion={
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${activa ? "text-exito" : "text-tenue"}`}>
              <span aria-hidden className={`size-1.5 rounded-full ${activa ? "bg-exito" : "bg-tenue/60"}`} />
              {activa ? "Visible" : "Apagada"}
            </span>
          }
        />
        <div className="space-y-4 p-4">
          <p className="text-sm text-tenue">
            Un enlace para compartir con tu foto, cómo trabajas y un formulario para pedir entrenar contigo. Lo que envíen te llega como
            solicitud y tú decides si lo agregas como alumno.
          </p>

          {activa && (
            <div className="flex items-center gap-1 rounded-2xl bg-hueso py-1.5 pr-1.5 pl-3">
              <Globe aria-hidden className="mr-1 size-4 shrink-0 text-tenue" />
              <span className="min-w-0 flex-1 truncate text-sm tabular-nums">{enlace}</span>
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar enlace"
                className="grid size-8 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie hover:text-tinta"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={copiado ? "si" : "no"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                    {copiado ? <Check aria-hidden className="size-4 text-exito" /> : <Copy aria-hidden className="size-4" />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <a
                href={`/e/${slug}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir la página en otra pestaña"
                className="grid size-8 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie hover:text-tinta"
              >
                <ExternalLink aria-hidden className="size-4" />
              </a>
              <span role="status" className="sr-only">{copiado ? "Enlace copiado" : ""}</span>
            </div>
          )}

          {editable ? (
            <EnlaceBoton href="/configuracion/pagina" variante={activa ? "secundario" : "primario"}>
              <Pencil aria-hidden className="size-4" /> {activa ? "Editar página" : "Crear mi página"}
            </EnlaceBoton>
          ) : (
            <p className="text-sm text-tenue">Solo el propietario o un administrador del espacio puede cambiarla.</p>
          )}
        </div>
      </section>
    </Tarjeta>
  );
}
