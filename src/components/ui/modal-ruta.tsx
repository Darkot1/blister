"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialogo } from "./dialogo";

const CerrarModal = createContext<(() => void) | null>(null);

/** Dentro de un {@link ModalRuta}, la función que lo cierra (p. ej. para "Cancelar"); fuera, null. */
export const useCerrarModal = () => useContext(CerrarModal);

/**
 * Página mostrada como modal sobre la actual (ruta interceptada en el slot `@modal` de la app).
 * Cerrar anima la salida y luego vuelve atrás en el historial, así la URL vuelve a la página de fondo.
 * Entrando por URL directa o al recargar, la ruta se ve como página completa y esto no interviene.
 *
 * Un slot paralelo conserva lo último que mostró al navegar a otra URL (p. ej. tras crear y
 * redirigir): por eso el modal se retira solo cuando la URL deja de ser `ruta`. Un comodín
 * `@modal/[...ruta]` haría lo mismo, pero deja sin ruta completa a las páginas fuera de (app).
 */
export function ModalRuta({ ruta, titulo, amplio, children }: { ruta: string; titulo: React.ReactNode; amplio?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const enSuRuta = usePathname() === ruta;
  const [abierto, setAbierto] = useState(true);
  const activo = useRef(true);
  // Fuera de su ruta sigue montado: al volver a ella (abrirlo otra vez) parte abierto.
  const [antes, setAntes] = useState(enSuRuta);
  if (enSuRuta !== antes) {
    setAntes(enSuRuta);
    if (enSuRuta) setAbierto(true);
  }

  // Al navegar, el modal queda oculto (<Activity>) en vez de desmontarse: el cierre que eso provoca
  // no cuenta, y se deja abierto para que "adelante" en el historial lo vuelva a mostrar.
  useEffect(() => {
    activo.current = true;
    return () => {
      activo.current = false;
      setAbierto(true);
    };
  }, []);

  const cerrar = () => {
    if (activo.current) setAbierto(false);
  };

  if (!enSuRuta) return null;
  return (
    <CerrarModal value={cerrar}>
      <Dialogo abierto={abierto} alCerrar={cerrar} titulo={titulo} amplio={amplio} alTerminarSalida={() => router.back()}>
        {children}
      </Dialogo>
    </CerrarModal>
  );
}
