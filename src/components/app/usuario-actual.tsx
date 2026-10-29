import Link from "next/link";
import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { Pulso } from "@/components/ui/movimiento";
import { FotoPerfil } from "./foto-perfil";
import { SelectorTema } from "./selector-tema";

/** Cuenta al pie del menú: foto (o iniciales), nombre con enlace a Ajustes y, en una cápsula, tema y salida. */
export async function UsuarioActual() {
  const perfil = await obtenerPerfil();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  return (
    <div className="flex items-center gap-2.5 px-1">
      <Link href="/configuracion" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg hover:opacity-80" title="Mi perfil">
        <FotoPerfil url={perfil?.avatar_url} nombres={perfil?.nombres ?? ""} apellidos={perfil?.apellidos ?? ""} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{nombre || "Mi cuenta"}</p>
          <p className="etiqueta text-[0.6rem]">Mi perfil</p>
        </div>
      </Link>
      {/* Menú plegado: la cápsula se pone en vertical bajo la foto. */}
      <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-hueso/70 p-0.5 in-data-[menu=plegado]:flex-col">
        <SelectorTema className="size-7 hover:bg-superficie [&_svg]:size-4" />
        <form action={salir} className="contents">
          <button
            type="submit"
            className="grid size-7 place-items-center rounded-full text-tenue transition-colors hover:bg-peligro/[0.12] hover:text-peligro"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function UsuarioActualCargando() {
  return <Pulso className="h-10 rounded-lg bg-tinta/[0.05]" />;
}
