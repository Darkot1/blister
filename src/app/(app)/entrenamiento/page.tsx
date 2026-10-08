import type { Metadata } from "next";
import { Users, Dumbbell } from "lucide-react";
import { Proximamente } from "@/components/app/proximamente";
import { EnlaceBoton } from "@/components/ui/boton";
import { FuncionesPrevistas } from "../_componentes/funciones-previstas";

export const metadata: Metadata = { title: "Entrenamiento" };

export default function Pagina() {
  return (
    <>
      <Proximamente
        titulo="Entrenamiento"
        descripcion="Aquí armarás las rutinas de tus alumnos: el constructor, las plantillas reutilizables y los planes asignados."
      />
      <FuncionesPrevistas
        funciones={[
          {
            titulo: "Constructor de rutinas",
            descripcion:
              "Elige músculos en el mapa, agrega los ejercicios sugeridos, ordénalos arrastrando o con botones y define series, repeticiones y peso.",
            cuando: "Siguiente",
          },
          {
            titulo: "Plantillas reutilizables",
            descripcion: "Guarda una rutina como plantilla para usarla con varios alumnos.",
            cuando: "Después del constructor",
          },
          {
            titulo: "Planes asignados",
            descripcion:
              "Asigna una plantilla a un alumno: se crea una copia que puedes ajustar sin tocar la original, y la programas en el calendario.",
            cuando: "Después del constructor",
          },
        ]}
        mientras={{
          texto: "Ya puedes explorar la biblioteca de ejercicios por músculo y completar el perfil de tus alumnos.",
          acciones: (
            <>
              <EnlaceBoton variante="secundario" href="/ejercicios">
                <Dumbbell aria-hidden /> Explorar ejercicios
              </EnlaceBoton>
              <EnlaceBoton variante="secundario" href="/alumnos">
                <Users aria-hidden /> Ver alumnos
              </EnlaceBoton>
            </>
          ),
        }}
      />
    </>
  );
}
