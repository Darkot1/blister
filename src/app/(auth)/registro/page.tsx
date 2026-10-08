import type { Metadata } from "next";
import Link from "next/link";
import { AccesoGoogle, FormularioRegistro } from "../formularios";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <>
      <h1 className="text-[1.9rem] leading-tight font-bold tracking-[-0.03em]">Crear cuenta</h1>
      <p className="mt-1.5 mb-7 text-tenue">Tu espacio de trabajo se crea automáticamente.</p>
      <AccesoGoogle />
      <FormularioRegistro />
      <p className="mt-7 text-center text-sm text-tenue">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-acento hover:underline">Ingresa</Link>
      </p>
    </>
  );
}
