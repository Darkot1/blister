import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { FormularioAlumno } from "../formulario-alumno";
import { crearAlumno } from "../acciones";

export const metadata: Metadata = { title: "Nuevo alumno" };

export default function PaginaNuevoAlumno() {
  return (
    <>
      <Encabezado
        titulo="Nuevo alumno"
        descripcion="Con el nombre y el apellido basta para empezar; el resto lo puedes completar después."
        volver={{ href: "/alumnos", texto: "Alumnos" }}
      />
      <FormularioAlumno accion={crearAlumno} textoBoton="Crear alumno" cancelarHref="/alumnos" />
    </>
  );
}
