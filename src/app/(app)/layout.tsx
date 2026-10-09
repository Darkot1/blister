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
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-[78rem]">{children}</div>
      </main>
    </div>
  );
}

async function SoloSuperadmin() {
  return (await esSuperadmin()) ? <EnlaceAdmin /> : null;
}
