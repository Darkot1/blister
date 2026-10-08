import type { Metadata } from "next";
import { Proximamente } from "@/components/app/proximamente";

export const metadata: Metadata = { title: "Calendario" };

export default function Pagina() {
  return <Proximamente titulo="Calendario" descripcion="Programa citas y sesiones con tus alumnos y consulta tu agenda por día o semana." />;
}
