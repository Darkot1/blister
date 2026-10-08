import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Proximamente } from "@/components/app/proximamente";
import { EnlaceBoton } from "@/components/ui/boton";
import { FuncionesPrevistas } from "../_componentes/funciones-previstas";

export const metadata: Metadata = { title: "Progreso" };

export default function Pagina() {
  return (
    <>
      <Proximamente
        titulo="Progreso"
        descripcion="Aquí verás cómo evoluciona cada alumno: lo que entrenó frente a lo planificado, su peso y sus medidas."
      />
      <FuncionesPrevistas
        funciones={[
          {
            titulo: "Registro de sesiones",
            descripcion:
              "Anota las series, repeticiones y peso que hizo el alumno, sin perder lo que estaba planificado.",
            cuando: "Después de los planes",
          },
          {
            titulo: "Gráficas de peso y medidas",
            descripcion: "La evolución de las mediciones de cada alumno a lo largo del tiempo.",
            cuando: "Después del registro de sesiones",
          },
          {
            titulo: "Rendimiento por ejercicio",
            descripcion: "Cómo suben las cargas y las repeticiones en cada ejercicio, sesión tras sesión.",
            cuando: "Después del registro de sesiones",
          },
        ]}
        mientras={{
          texto: "Las mediciones (peso, cintura…) ya se registran en el perfil de cada alumno y quedan guardadas para estas gráficas.",
          acciones: (
            <EnlaceBoton variante="secundario" href="/alumnos">
              <Users aria-hidden /> Registrar mediciones
            </EnlaceBoton>
          ),
        }}
      />
    </>
  );
}
