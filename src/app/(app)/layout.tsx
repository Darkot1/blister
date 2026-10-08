import { Suspense } from "react";
import { Navegacion } from "@/components/app/navegacion";
import { UsuarioActual, UsuarioActualCargando } from "@/components/app/usuario-actual";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <Navegacion
        pie={
          <Suspense fallback={<UsuarioActualCargando />}>
            <UsuarioActual />
          </Suspense>
        }
      />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
