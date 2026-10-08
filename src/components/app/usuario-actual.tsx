import { LogOut } from "lucide-react";
import { obtenerPerfil } from "@/lib/sesion";
import { salir } from "@/app/(auth)/acciones";
import { iniciales } from "@/lib/formato";
import { Avatar } from "@/components/ui/avatar";
import css from "./usuario-actual.module.css";

export async function UsuarioActual() {
  const perfil = await obtenerPerfil();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  return <TarjetaUsuario nombre={nombre} iniciales={perfil ? iniciales(perfil.nombres || "?", perfil.apellidos || "") : "?"} />;
}

/**
 * La cuenta en la barra superior: iniciales, nombre (solo en escritorio ancho, lo decide el shell
 * con `data-nombre-usuario`) y cerrar sesión. Separada para poder previsualizarla sin sesión.
 */
export function TarjetaUsuario({ nombre, iniciales }: { nombre: string; iniciales: string }) {
  return (
    <div className={css.usuario}>
      <Avatar iniciales={iniciales} tamano="pequeno" tono="acento" />
      <span className={css.nombre} data-nombre-usuario>
        {nombre || "Mi cuenta"}
      </span>
      <form action={salir}>
        <button type="submit" className={css.salir} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function UsuarioActualCargando() {
  return <div className={css.cargando} aria-hidden />;
}
