"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowDown, MessageCircle } from "lucide-react";
import { enlaceWhatsapp } from "@/lib/pagina-publica/contenido";

/**
 * Botón fijo abajo en el celular para llegar al formulario desde cualquier punto de la página.
 * Aparece cuando ya no se ve el botón de la portada y se queda fija en todas las secciones; solo se esconde
 * mientras el formulario está en pantalla (ahí ya no hace falta).
 */
export function BarraMovil({ texto, whatsapp }: { texto: string; whatsapp: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const portada = document.getElementById("boton-portada");
    const formulario = document.getElementById("empezar");
    if (!portada || !formulario) return;
    let botonPasado = false;
    let formularioVisible = false;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          // El botón de la portada ya quedó arriba (no basta con que no se vea: en pantallas bajas empieza debajo).
          if (e.target === portada) botonPasado = !e.isIntersecting && e.boundingClientRect.top < 0;
          else formularioVisible = e.isIntersecting;
        }
        setVisible(botonPasado && !formularioVisible);
      },
      // El hueco de abajo es el de la propia barra: lo que quede debajo de ella no cuenta como visto.
      { rootMargin: "0px 0px -80px 0px" },
    );
    observador.observe(portada);
    observador.observe(formulario);
    return () => observador.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-linea bg-fondo/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
        >
          <a
            href="#empezar"
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-acento px-5 text-[0.95rem] font-semibold text-sobre-acento transition-colors hover:bg-acento-hover"
          >
            <span className="truncate">{texto}</span> <ArrowDown aria-hidden className="size-4 shrink-0" />
          </a>
          {whatsapp && (
            <a
              href={enlaceWhatsapp(whatsapp)}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribir por WhatsApp (se abre en otra pestaña)"
              className="grid size-12 shrink-0 place-items-center rounded-full border border-linea-fuerte transition-colors hover:bg-hueso"
            >
              <MessageCircle aria-hidden className="size-5" />
            </a>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}
