import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperar } from "../formularios";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em]">Recuperar contraseña</h1>
      <p className="mt-1.5 mb-7 text-tenue">Te enviaremos un enlace para crear una nueva.</p>
      <FormularioRecuperar />
      <p className="mt-7 text-center text-sm text-tenue">
        <Link href="/ingresar" className="font-medium text-tinta underline underline-offset-2 hover:no-underline">Volver a ingresar</Link>
      </p>
    </>
  );
}
