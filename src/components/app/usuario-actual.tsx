import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { iniciales } from "@/lib/formato";

/** Cuenta al pie del menú: iniciales, nombre y salida. */
export async function UsuarioActual() {
  const perfil = await obtenerPerfil();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-acento text-xs font-semibold text-tinta">
        {perfil ? iniciales(perfil.nombres || "?", perfil.apellidos || "") : "?"}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium">{nombre || "Mi cuenta"}</p>
        <p className="etiqueta text-[0.6rem]">Entrenador</p>
      </div>
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
