import type { Metadata } from "next";
import { Proximamente } from "@/components/app/proximamente";

export const metadata: Metadata = { title: "Entrenamiento" };

export default function Pagina() {
  return <Proximamente titulo="Entrenamiento" descripcion="Aquí estarán el constructor de rutinas, las plantillas reutilizables y los planes asignados a cada alumno." />;
}
