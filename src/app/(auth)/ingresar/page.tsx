import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioIngreso } from "../formularios";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <h1 className="font-titulo text-4xl font-semibold tracking-tight">Ingresar</h1>
      <p className="mt-1 mb-8 text-tenue">Usa el correo y la contraseña de tu cuenta.</p>
      <Suspense fallback={<FormularioIngreso />}>
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
  const { siguiente } = await searchParams;
  return <FormularioIngreso siguiente={typeof siguiente === "string" ? siguiente : undefined} />;
}
