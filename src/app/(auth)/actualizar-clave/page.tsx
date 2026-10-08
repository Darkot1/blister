import type { Metadata } from "next";
import { FormularioNuevaClave } from "../formularios";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function PaginaNuevaClave() {
  return (
    <>
      <h1 className="font-titulo text-4xl font-semibold tracking-tight">Nueva contraseña</h1>
      <p className="mt-1 mb-8 text-tenue">Elige la contraseña que usarás para ingresar.</p>
      <FormularioNuevaClave />
    </>
  );
}
