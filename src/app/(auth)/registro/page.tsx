import type { Metadata } from "next";
import Link from "next/link";
import { AccesoGoogle, FormularioRegistro } from "../formularios";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function PaginaRegistro() {
  return (
    <>
      <h1 className="titulo-display text-[1.875rem] leading-[1.2]">Crear cuenta</h1>
      <p className="mt-1.5 mb-7 text-tenue">Tu espacio de trabajo se crea automáticamente.</p>
      <AccesoGoogle />
      <FormularioRegistro />
      <p className="mt-5 text-center text-xs leading-relaxed text-tenue">
        Al crear tu cuenta, también con Google, aceptas los{" "}
        <Link href="/terminos" className="text-tinta underline underline-offset-2 hover:no-underline">términos</Link> y la{" "}
        <Link href="/privacidad" className="text-tinta underline underline-offset-2 hover:no-underline">política de privacidad</Link>.
      </p>
      <p className="mt-7 text-center text-sm text-tenue">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-tinta underline underline-offset-2 hover:no-underline">Ingresa</Link>
      </p>
    </>
  );
}
