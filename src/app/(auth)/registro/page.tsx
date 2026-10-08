import type { Metadata } from "next";
import { Enlace } from "@/components/ui/enlace";
import { CabeceraAcceso, PieAcceso } from "../acceso";
import { AccesoGoogle, FormularioRegistro } from "../formularios";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <>
      <CabeceraAcceso
        titulo="Crear cuenta"
        descripcion="Tu espacio de trabajo se crea automáticamente. Empieza registrando a tus alumnos."
      />
      <AccesoGoogle />
      <FormularioRegistro />
      <PieAcceso>
        ¿Ya tienes cuenta? <Enlace href="/ingresar">Ingresa</Enlace>
      </PieAcceso>
    </>
  );
}
