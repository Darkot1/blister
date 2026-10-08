import type { Metadata } from "next";
import { Suspense } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Enlace } from "@/components/ui/enlace";
import { CabeceraAcceso, PieAcceso } from "../acceso";
import { AccesoGoogle, FormularioIngreso } from "../formularios";
import css from "../formularios.module.css";

export const metadata: Metadata = { title: "Ingresar" };

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <CabeceraAcceso titulo="Ingresar" descripcion="Entra con tu cuenta de Google o con tu correo y contraseña." />
      <Suspense
        fallback={
          <>
            <AccesoGoogle />
            <FormularioIngreso />
          </>
        }
      >
        <IngresoConDestino searchParams={searchParams} />
      </Suspense>
      <PieAcceso>
        ¿Aún no tienes cuenta? <Enlace href="/registro">Crea una</Enlace>
      </PieAcceso>
    </>
  );
}

async function IngresoConDestino({ searchParams }: { searchParams: PageProps<"/ingresar">["searchParams"] }) {
  const { siguiente, error } = await searchParams;
  const destino = typeof siguiente === "string" ? siguiente : undefined;
  const mensaje = typeof error === "string" ? ERRORES[error] ?? ERRORES.google : null;
  return (
    <>
      {mensaje && <Aviso className={css.avisoPagina}>{mensaje}</Aviso>}
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
