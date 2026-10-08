import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { iniciales } from "@/lib/formato";

async function datosUsuario() {
  const perfil = await obtenerPerfil();
  return {
    nombre: perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "",
    siglas: perfil ? iniciales(perfil.nombres || "?", perfil.apellidos || "") : "?",
  };
}

function Avatar({ siglas, className = "" }: { siglas: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-[linear-gradient(160deg,var(--app-alumnos),var(--app-progreso))] font-semibold text-white ${className}`}
    >
      {siglas}
    </span>
  );
}

/** Tarjeta de la cuenta para el menú en rejilla. */
export async function TarjetaCuenta() {
  const { nombre, siglas } = await datosUsuario();
  return (
    <div className="flex items-center gap-3 rounded-[1.25rem] bg-tinta/[0.04] p-3">
      <Avatar siglas={siglas} className="size-12 text-base" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nombre || "Mi cuenta"}</p>
        <p className="text-sm text-tenue">Entrenador</p>
      </div>
      <form action={salir}>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-peligro/10 px-3.5 text-sm font-semibold text-peligro hover:bg-peligro/15"
        >
          <LogOut aria-hidden className="size-4" />
          Salir
        </button>
      </form>
    </div>
  );
}

/** Avatar del riel lateral con el botón de cerrar sesión. */
export async function AvatarCuenta() {
  const { nombre, siglas } = await datosUsuario();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span title={nombre || "Mi cuenta"}>
        <Avatar siglas={siglas} className="size-10 text-sm" />
      </span>
      <form action={salir}>
        <button
          type="submit"
          className="grid size-8 place-items-center rounded-full text-tenue hover:bg-peligro/10 hover:text-peligro"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function CuentaCargando({ compacta = false }: { compacta?: boolean }) {
  return compacta ? (
    <div className="size-10 animate-pulse rounded-full bg-tinta/[0.06]" aria-hidden />
  ) : (
    <div className="h-[4.5rem] animate-pulse rounded-[1.25rem] bg-tinta/[0.04]" aria-hidden />
  );
}
