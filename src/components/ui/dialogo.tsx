"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { animate, useReducedMotion, type AnimationPlaybackControls } from "motion/react";

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * devuelve el foco al elemento que lo abrió. Clic en el fondo también cierra.
 * Centrado en pantallas grandes y como hoja inferior en móvil; con `lateral`,
 * es un cajón que entra por la izquierda (menú en móvil). Entra y sale animado con Motion:
 * al cerrar, el contenido sigue montado hasta que termina la salida.
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  lateral = false,
  amplio = false,
  alTerminarSalida,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: React.ReactNode;
  lateral?: boolean;
  /** Para formularios largos: 48rem en lugar de 32rem. */
  amplio?: boolean;
  /** Cuando el diálogo ya se cerró del todo (tras la animación de salida). */
  alTerminarSalida?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const salida = useRef<AnimationPlaybackControls | null>(null);
  const quieto = useReducedMotion();
  // El contenido se monta al abrir y se desmonta cuando acaba la animación de salida.
  const [visible, setVisible] = useState(abierto);
  if (abierto && !visible) setVisible(true);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const fuera = lateral ? { x: "-100%" } : { opacity: 0, y: 24 };
    const dentro = lateral ? { x: "0%" } : { opacity: 1, y: 0 };
    if (abierto) {
      // Si se reabre a media salida, la salida se abandona y vuelve a entrar desde donde está.
      salida.current?.stop();
      salida.current = null;
      if (!dialogo.open) {
        dialogo.showModal();
        animate(dialogo, fuera, { duration: 0 });
      }
      animate(dialogo, dentro, quieto ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] });
    } else if (dialogo.open) {
      const animacion = animate(dialogo, fuera, quieto ? { duration: 0 } : { duration: 0.16, ease: "easeIn" });
      salida.current = animacion;
      animacion.then(() => {
        if (salida.current !== animacion) return;
        salida.current = null;
        dialogo.close();
        setVisible(false);
        alTerminarSalida?.();
      });
    }
    // alTerminarSalida se lee al terminar: no debe reiniciar la animación si cambia de identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, lateral, quieto]);

  // Con Cache Components, al navegar la página anterior queda oculta (<Activity>) en vez de
  // desmontarse: si el <dialog> sigue con showModal(), deja inerte toda la página nueva.
  useEffect(() => {
    const dialogo = ref.current;
    return () => {
      if (dialogo?.open) dialogo.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      // El evento close llega en otra tarea: si el diálogo ya se volvió a abrir (Strict Mode), se ignora.
      onClose={() => {
        if (ref.current?.open) return;
        setVisible(false);
        alCerrar();
      }}
      // Escape pasa por alCerrar para que también salga animado.
      onCancel={(e) => {
        e.preventDefault();
        alCerrar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
      className={
        lateral
          ? "my-0 mr-auto ml-0 h-dvh max-h-dvh w-[min(18rem,85vw)] border-r border-linea bg-fondo p-0 text-tinta backdrop:bg-black/60"
          : `mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-full rounded-t-[var(--radius-elevada)] border border-linea bg-superficie p-0 text-tinta shadow-flotante backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:m-auto sm:rounded-[var(--radius-elevada)] ${amplio ? "sm:w-[min(48rem,calc(100vw-2rem))]" : "sm:w-[min(32rem,calc(100vw-2rem))]"}`
      }
    >
      {visible && (
        <div className={lateral ? "flex h-full flex-col" : ""}>
          <div className="flex items-center justify-between gap-4 border-b border-linea px-6 py-4">
            <h2 id={idTitulo} className="titulo-display text-xl leading-tight">{titulo}</h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta"
            >
              <X aria-hidden className="size-[18px]" />
            </button>
          </div>
          <div className={lateral ? "min-h-0 flex-1 overflow-y-auto" : "px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"}>
          {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
