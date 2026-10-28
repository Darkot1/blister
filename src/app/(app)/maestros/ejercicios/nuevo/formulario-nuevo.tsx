import { obtenerContexto } from "@/lib/sesion";
import { crearEjercicio } from "../../acciones";
import { catalogoFormulario } from "../datos";
import { FormularioEjercicio } from "../formulario-ejercicio";

/** Formulario de alta con su catálogo; lo comparten la página y el modal. */
export async function FormularioNuevoEjercicio() {
  const { supabase } = await obtenerContexto();
  const catalogo = await catalogoFormulario(supabase);
  return <FormularioEjercicio accion={crearEjercicio} textoBoton="Crear ejercicio" {...catalogo} />;
}
