import type { Metadata } from "next";
import { Enlace } from "@/components/ui/enlace";
import { CabeceraAcceso, PieAcceso } from "../acceso";
import { FormularioRecuperar } from "../formularios";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <>
      <CabeceraAcceso
        titulo="Recuperar contraseña"
        descripcion="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
      />
      <FormularioRecuperar />
      <PieAcceso>
        ¿La recordaste? <Enlace href="/ingresar">Vuelve a ingresar</Enlace>
      </PieAcceso>
    </>
  );
}
