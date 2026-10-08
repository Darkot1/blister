import { Suspense } from "react";
import { Navegacion } from "@/components/app/navegacion";
import { UsuarioActual, UsuarioActualCargando } from "@/components/app/usuario-actual";
import css from "./layout.module.css";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <div className={css.shell}>
      <a href="#contenido" className={css.saltar}>
        Saltar al contenido
      </a>
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
      <main id="contenido" className={css.contenido}>
        <div className={css.ancho}>{children}</div>
      </main>
    </div>
  );
}
