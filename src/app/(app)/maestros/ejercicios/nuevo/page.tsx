import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { crearEjercicio } from "../../acciones";
import { catalogoFormulario } from "../datos";
import { FormularioEjercicio } from "../formulario-ejercicio";

export const metadata: Metadata = { title: "Nuevo ejercicio" };

export default function PaginaNuevoEjercicio() {
  return (
    <>
      <Encabezado
        titulo="Nuevo ejercicio"
        volver={{ href: "/maestros/ejercicios", texto: "Maestros" }}
        descripcion="Será visible solo en tu espacio y aparecerá en las sugerencias del mapa muscular."
      />
      <Suspense fallback={<Esqueleto className="h-[40rem] max-w-3xl" />}>
        <Formulario />
      </Suspense>
    </>
  );
}

async function Formulario() {
  const { supabase } = await obtenerContexto();
  const catalogo = await catalogoFormulario(supabase);
  return <FormularioEjercicio accion={crearEjercicio} textoBoton="Crear ejercicio" {...catalogo} />;
}
