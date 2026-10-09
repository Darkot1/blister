import Link from "next/link";
import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { FotoPerfil } from "./foto-perfil";

/** Cuenta al pie del menú: foto (o iniciales), nombre con enlace a Ajustes y salida. */
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
      <form action={salir}>
        <button
          type="submit"
          className="grid size-8 place-items-center rounded-lg text-tenue hover:bg-peligro/[0.08] hover:text-peligro"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function UsuarioActualCargando() {
  return <div className="h-10 animate-pulse rounded-lg bg-tinta/[0.05]" aria-hidden />;
}
