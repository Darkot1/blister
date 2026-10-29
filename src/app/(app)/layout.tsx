import type { Metadata } from "next";
import { Suspense } from "react";
import { EnlaceAdmin, Navegacion } from "@/components/app/navegacion";
import { UsuarioActual, UsuarioActualCargando } from "@/components/app/usuario-actual";
import { esSuperadmin } from "@/lib/sesion";

// Detrás del inicio de sesión: nada aquí debe aparecer en buscadores.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** `modal`: slot para rutas abiertas como modal sobre la página actual (ver `@modal/`). */
export default function LayoutApp({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <Navegacion
        admin={
          <Suspense fallback={null}>
            <SoloSuperadmin />
          </Suspense>
        }
        cuenta={
          <Suspense fallback={<UsuarioActualCargando />}>
            <UsuarioActual />
          </Suspense>
        }
      />
      <main id="contenido" className="min-w-0 flex-1 px-4 pt-6 pb-[calc(var(--alto-barra-inferior)+1.5rem)] sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[78rem]">{children}</div>
      </main>
      {modal}
    </div>
  );
}

async function SoloSuperadmin() {
  return (await esSuperadmin()) ? <EnlaceAdmin /> : null;
}
