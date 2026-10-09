import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { SelectorTema } from "@/components/app/selector-tema";
import { Esqueleto } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { salir } from "@/app/(auth)/acciones";
import { fechaCorta } from "@/lib/formato";
import { obtenerCuenta } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ajustes" };

const ROL: Record<string, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  entrenador: "Entrenador",
  asistente: "Asistente",
};

const PROVEEDOR: Record<string, string> = { email: "Correo y contraseña", google: "Google" };

export default function PaginaAjustes() {
  return (
    <>
      <Encabezado titulo="Ajustes" miga="Cuenta" />
      <div className="grid max-w-4xl items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Suspense fallback={<Esqueleto className="h-80" />}>
          <MiPerfil />
        </Suspense>
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-apariencia">
            <CabeceraTarjeta id="titulo-apariencia" titulo="Apariencia" />
            <div className="space-y-2 p-4">
              <SelectorTema />
              <p className="text-sm text-tenue">“Sistema” sigue el modo claro u oscuro de tu dispositivo.</p>
            </div>
          </section>
        </Tarjeta>
      </div>
    </>
  );
}

async function MiPerfil() {
  const { perfil, correo, proveedores, rol, miembroDesde, espacio } = await obtenerCuenta();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  const filas: [string, string][] = [
    ["Correo", correo ?? "—"],
    ["Rol", rol ? ROL[rol] ?? rol : "—"],
    ["Espacio de trabajo", espacio ?? "—"],
    ["Ingresa con", proveedores.length ? proveedores.map((p) => PROVEEDOR[p] ?? p).join(" y ") : "—"],
    ["Miembro desde", fechaCorta(miembroDesde)],
  ];

  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="titulo-perfil">
        <CabeceraTarjeta id="titulo-perfil" titulo="Mi perfil" />
        <div className="flex items-center gap-4 p-4">
          <FotoPerfil url={perfil?.avatar_url} nombres={perfil?.nombres ?? ""} apellidos={perfil?.apellidos ?? ""} tamano="xl" />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight">{nombre || "Sin nombre"}</p>
            <p className="truncate text-sm text-tenue">{correo}</p>
            {!perfil?.avatar_url && (
              <p className="mt-1 text-xs text-tenue">Si ingresas con Google, tu foto aparecerá aquí.</p>
            )}
          </div>
        </div>
        <dl className="divide-y divide-linea border-t border-linea text-sm">
          {filas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 px-4 py-2.5">
              <dt className="text-tenue">{etiqueta}</dt>
              <dd className="truncate">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-linea p-4">
          <form action={salir}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-peligro/30 px-3.5 text-sm font-semibold text-peligro hover:bg-peligro/[0.06]"
            >
              <LogOut aria-hidden className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </section>
    </Tarjeta>
  );
}
