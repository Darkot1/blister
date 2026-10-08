import { Suspense } from "react";
import { Navegacion } from "@/components/app/navegacion";
import { AvatarCuenta, CuentaCargando, TarjetaCuenta } from "@/components/app/usuario-actual";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <Navegacion
        avatar={
          <Suspense fallback={<CuentaCargando compacta />}>
            <AvatarCuenta />
          </Suspense>
        }
        cuenta={
          <Suspense fallback={<CuentaCargando />}>
            <TarjetaCuenta />
          </Suspense>
        }
      />
      {/* En móvil, espacio abajo para que el dock no tape el contenido. */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-32 sm:px-8 sm:pt-10 lg:pr-12 lg:pb-14 lg:pl-4">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
