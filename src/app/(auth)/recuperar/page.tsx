import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperar } from "../formularios";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <>
      <h1 className="font-titulo text-4xl font-semibold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-1 mb-8 text-tenue">Te enviaremos un enlace para crear una nueva.</p>
      <FormularioRecuperar />
      <p className="mt-8 text-sm text-tenue">
        <Link href="/ingresar" className="font-medium text-acento hover:underline">Volver a ingresar</Link>
      </p>
    </>
  );
}
