import { Suspense } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { ModalRuta } from "@/components/ui/modal-ruta";
import { FormularioNuevoEjercicio } from "../../../../maestros/ejercicios/nuevo/formulario-nuevo";

/** "Nuevo ejercicio" abierto desde la app: modal sobre la página actual, con la misma URL que la página completa. */
export default function ModalNuevoEjercicio({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <ModalRuta ruta="/maestros/ejercicios/nuevo" titulo="Nuevo ejercicio" amplio>
      <p className="mb-4 text-sm text-tenue">Será visible solo en tu espacio y aparecerá en las sugerencias del mapa muscular.</p>
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <FormularioNuevoEjercicio searchParams={searchParams} />
      </Suspense>
    </ModalRuta>
  );
}
