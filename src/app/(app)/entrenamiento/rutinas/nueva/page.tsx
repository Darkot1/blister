import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { obtenerContexto } from "@/lib/sesion";
import { cargarCatalogo } from "@/lib/entrenamiento/cargar";
import { ConstructorRutina } from "../../constructor/constructor";
import { estadoInicial } from "../../constructor/estado";
import { CargandoConstructor } from "../../constructor/cargando";

export const metadata: Metadata = { title: "Nueva rutina" };

export default function PaginaNuevaRutina() {
  return (
    <>
      <Encabezado
        titulo="Nueva rutina"
        volver={{ href: "/entrenamiento", texto: "Rutinas y planes" }}
        descripcion="Ponle nombre, elige ejercicios y ajusta la prescripción. Guarda cuando quieras."
      />
      <Suspense fallback={<CargandoConstructor />}>
        <Constructor />
      </Suspense>
    </>
  );
}

async function Constructor() {
  const { supabase } = await obtenerContexto();
  const catalogo = await cargarCatalogo(supabase);
  return <ConstructorRutina id={null} inicial={estadoInicial()} catalogo={catalogo} />;
}
