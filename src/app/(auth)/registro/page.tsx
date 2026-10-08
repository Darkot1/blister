import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRegistro } from "../formularios";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <>
      <h1 className="font-titulo text-4xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 mb-8 text-tenue">Tu espacio de trabajo se crea automáticamente.</p>
      <FormularioRegistro />
      <p className="mt-8 text-sm text-tenue">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-acento hover:underline">Ingresa</Link>
      </p>
    </>
  );
}
