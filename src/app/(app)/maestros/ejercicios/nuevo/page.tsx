import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FormularioNuevoEjercicio } from "./formulario-nuevo";

export const metadata: Metadata = { title: "Nuevo ejercicio" };

/** Página completa al entrar por URL o recargar; desde la app se abre como modal (`@modal/(.)maestros/ejercicios/nuevo`). */
export default function PaginaNuevoEjercicio() {
  return (
    <>
      <Encabezado
        titulo="Nuevo ejercicio"
        volver={{ href: "/maestros/ejercicios", texto: "Maestros" }}
        descripcion="Será visible solo en tu espacio y aparecerá en las sugerencias del mapa muscular."
      />
      <Suspense fallback={<Esqueleto className="h-[40rem] max-w-3xl" />}>
        <FormularioNuevoEjercicio />
      </Suspense>
    </>
  );
}
