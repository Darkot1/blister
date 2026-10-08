import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { iniciales } from "@/lib/formato";

export async function UsuarioActual() {
  const perfil = await obtenerPerfil();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-acento font-titulo text-sm font-semibold text-white">
        {perfil ? iniciales(perfil.nombres || "?", perfil.apellidos || "") : "?"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-white/80">{nombre || "Mi cuenta"}</span>
      <form action={salir}>
        <button type="submit" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function UsuarioActualCargando() {
  return <div className="h-12 rounded-md bg-white/5" aria-hidden />;
}
