import type { Metadata } from "next";
import { FormularioNuevaClave } from "../formularios";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function PaginaNuevaClave() {
  return (
    <>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">Nueva contraseña</h1>
      <p className="mt-1.5 mb-7 text-tenue">Elige la contraseña que usarás para ingresar.</p>
      <FormularioNuevaClave />
    </>
  );
}
