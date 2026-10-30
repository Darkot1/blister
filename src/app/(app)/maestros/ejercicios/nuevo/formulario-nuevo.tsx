import { obtenerContexto } from "@/lib/sesion";
import { crearEjercicio } from "../../acciones";
import { catalogoFormulario } from "../datos";
import { FormularioEjercicio } from "../formulario-ejercicio";

/**
 * Formulario de alta con su catálogo; lo comparten la página y el modal. `?nombre=` lo trae ya escrito
 * (p. ej., desde un ejercicio que la oficina propuso y no está en la biblioteca).
 */
export async function FormularioNuevoEjercicio({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ supabase }, parametros] = await Promise.all([obtenerContexto(), searchParams]);
  const catalogo = await catalogoFormulario(supabase);
  const nombre = typeof parametros?.nombre === "string" ? parametros.nombre.trim().slice(0, 120) : "";
  const inicial = nombre
    ? { nombre, tipo: "fuerza", dificultad: null, es_unilateral: false, descripcion: null, instrucciones: null, musculos: [], equipos: [] }
    : undefined;
  return <FormularioEjercicio accion={crearEjercicio} textoBoton="Crear ejercicio" inicial={inicial} {...catalogo} />;
}
