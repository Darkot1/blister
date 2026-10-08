import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccesoGoogle, FormularioIngreso } from "../formularios";
import { Aviso } from "@/components/ui/aviso";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <h1 className="font-titulo text-4xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 mb-8 text-tenue">Usa el correo y la contraseña de tu cuenta.</p>
      <Suspense fallback={<><AccesoGoogle /><FormularioIngreso /></>}>
        <IngresoConDestino searchParams={searchParams} />
      </Suspense>
      <p className="mt-8 text-sm text-tenue">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-acento hover:underline">Crea una</Link>
      </p>
    </>
  );
}

async function IngresoConDestino({ searchParams }: { searchParams: PageProps<"/ingresar">["searchParams"] }) {
  const { siguiente, error } = await searchParams;
  const destino = typeof siguiente === "string" ? siguiente : undefined;
  const mensaje = typeof error === "string" ? ERRORES[error] ?? ERRORES.google : null;
  return (
    <>
      {mensaje && <div className="mb-6"><Aviso>{mensaje}</Aviso></div>}
      <AccesoGoogle siguiente={destino} />
      <FormularioIngreso siguiente={destino} />
    </>
  );
}

const ERRORES: Record<string, string> = {
  google: "No se pudo ingresar con Google. Inténtalo de nuevo.",
  enlace: "El enlace no es válido o ya expiró. Pide uno nuevo.",
  registro_desactivado: "No hay una cuenta asociada a ese correo de Google y el registro de cuentas nuevas está desactivado.",
};
