import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperar } from "../formularios";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <>
      <h1 className="text-[1.9rem] leading-tight font-bold tracking-[-0.03em]">Recuperar contraseña</h1>
      <p className="mt-1.5 mb-7 text-tenue">Te enviaremos un enlace para crear una nueva.</p>
      <FormularioRecuperar />
      <p className="mt-7 text-center text-sm text-tenue">
        <Link href="/ingresar" className="font-semibold text-acento hover:underline">Volver a ingresar</Link>
      </p>
    </>
  );
}
