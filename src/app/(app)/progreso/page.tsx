import type { Metadata } from "next";
import { Proximamente } from "@/components/app/proximamente";

export const metadata: Metadata = { title: "Progreso" };

export default function Pagina() {
  return <Proximamente titulo="Progreso" descripcion="Gráficas de peso, medidas y rendimiento por ejercicio. Mientras tanto, las mediciones se registran en el perfil de cada alumno." />;
}
