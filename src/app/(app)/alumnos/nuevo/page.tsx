import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado } from "@/components/app/encabezado";
import { FormularioAlumno } from "../formulario-alumno";
import { crearAlumno } from "../acciones";

export const metadata: Metadata = { title: "Nuevo alumno" };

export default function PaginaNuevoAlumno() {
  return (
    <>
      <Encabezado
        titulo="Nuevo alumno"
        descripcion="Solo el nombre es obligatorio; el resto lo puedes completar después."
        volver={<Link href="/alumnos" className="text-sm text-tenue hover:text-tinta">Alumnos</Link>}
      />
      <FormularioAlumno accion={crearAlumno} textoBoton="Crear alumno" cancelarHref="/alumnos" />
    </>
  );
}
