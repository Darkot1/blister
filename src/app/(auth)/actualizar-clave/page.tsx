import type { Metadata } from "next";
import { CabeceraAcceso } from "../acceso";
import { FormularioNuevaClave } from "../formularios";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function PaginaNuevaClave() {
  return (
    <>
      <CabeceraAcceso titulo="Nueva contraseña" descripcion="Elige la contraseña que usarás para ingresar." />
      <FormularioNuevaClave />
    </>
  );
}
