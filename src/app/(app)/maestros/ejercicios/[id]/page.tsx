import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Tarjeta } from "@/components/ui/tarjeta";
import { obtenerContexto } from "@/lib/sesion";
import { BotonCambioEstado } from "@/app/(app)/alumnos/[id]/componentes";
import { actualizarEjercicio, cambiarEstadoEjercicio } from "../../acciones";
import { catalogoFormulario } from "../datos";
import { FormularioEjercicio, type EjercicioInicial } from "../formulario-ejercicio";

export const metadata: Metadata = { title: "Editar ejercicio" };

export default function PaginaEditarEjercicio({ params }: PageProps<"/maestros/ejercicios/[id]">) {
  return (
    <Suspense fallback={<Esqueleto className="h-[40rem] max-w-3xl" />}>
      <Edicion params={params} />
    </Suspense>
  );
}

async function Edicion({ params }: { params: PageProps<"/maestros/ejercicios/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const [{ data: ejercicio }, { data: musculos }, { data: equipos }, catalogo] = await Promise.all([
    supabase
      .from("ejercicios")
      .select("id, nombre, tipo, dificultad, es_unilateral, descripcion, instrucciones, es_global, estado")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("ejercicios_musculos").select("musculo_id, rol").eq("ejercicio_id", id),
    supabase.from("ejercicios_equipamiento").select("equipamiento_id").eq("ejercicio_id", id),
    catalogoFormulario(supabase),
  ]);
  // Los globales no se editan: se tratan como inexistentes aquí.
  if (!ejercicio || ejercicio.es_global) notFound();

  const inicial: EjercicioInicial = {
    ...ejercicio,
    musculos: (musculos ?? []).map((m) => ({ id: m.musculo_id, rol: m.rol as EjercicioInicial["musculos"][number]["rol"] })),
    equipos: (equipos ?? []).map((q) => q.equipamiento_id),
  };
  const archivado = ejercicio.estado === "archivado";

  return (
    <>
      <Encabezado titulo="Editar ejercicio" volver={{ href: "/maestros/ejercicios?origen=propios", texto: "Maestros" }} />
      <FormularioEjercicio
        accion={actualizarEjercicio.bind(null, id)}
        inicial={inicial}
        textoBoton="Guardar cambios"
        {...catalogo}
      />
      <Tarjeta className="mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 border-dashed p-4">
        <div>
          <p className="text-sm font-medium">{archivado ? "Ejercicio archivado" : "Archivar ejercicio"}</p>
          <p className="text-sm text-tenue">
            {archivado
              ? "Reactívalo para que vuelva a la biblioteca y a las sugerencias."
              : "Deja de aparecer en la biblioteca y en las sugerencias; los planes que ya lo usan no cambian."}
          </p>
        </div>
        {archivado ? (
          <BotonCambioEstado accion={cambiarEstadoEjercicio.bind(null, id, "activo")} texto="Reactivar" />
        ) : (
          <BotonCambioEstado
            accion={cambiarEstadoEjercicio.bind(null, id, "archivado")}
            texto="Archivar"
            variante="peligro"
            confirmacion={`¿Archivar "${ejercicio.nombre}"? Podrás reactivarlo cuando quieras.`}
          />
        )}
      </Tarjeta>
    </>
  );
}
