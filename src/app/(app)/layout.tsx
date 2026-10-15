import { Suspense } from "react";
import { EnlaceAdmin, Navegacion } from "@/components/app/navegacion";
import { UsuarioActual, UsuarioActualCargando } from "@/components/app/usuario-actual";
import { esSuperadmin } from "@/lib/sesion";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
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
    </div>
  );
}

async function SoloSuperadmin() {
  return (await esSuperadmin()) ? <EnlaceAdmin /> : null;
}
