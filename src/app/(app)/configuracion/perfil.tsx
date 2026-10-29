import { LogOut } from "lucide-react";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { salir } from "@/app/(auth)/acciones";

/** La cuenta del entrenador en Ajustes: foto, nombre, datos de acceso y cerrar sesión. */
export function TarjetaPerfil({
  nombre,
  correo,
  perfil,
  filas,
}: {
  nombre: string;
  correo: string | null;
  perfil: { avatar_url: string | null; nombres: string; apellidos: string } | null;
  filas: [string, string][];
}) {
  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="titulo-perfil">
        <CabeceraTarjeta id="titulo-perfil" titulo="Mi perfil" />
        <div className="flex items-center gap-4 p-4">
          <FotoPerfil url={perfil?.avatar_url} nombres={perfil?.nombres ?? ""} apellidos={perfil?.apellidos ?? ""} tamano="xl" />
          <div className="min-w-0">
            <p className="truncate titulo-display text-2xl leading-[1.25]">{nombre || "Sin nombre"}</p>
            <p className="truncate text-sm text-tenue">{correo}</p>
            {!perfil?.avatar_url && (
              <p className="mt-1 text-xs text-tenue">Si ingresas con Google, tu foto aparecerá aquí.</p>
            )}
          </div>
        </div>
        <dl className="divide-y divide-linea border-t border-linea text-sm">
          {filas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt className="text-tenue">{etiqueta}</dt>
              <dd className="truncate">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-linea p-4">
          <form action={salir}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-peligro/30 px-3.5 text-sm font-semibold text-peligro hover:bg-peligro/[0.06]"
            >
              <LogOut aria-hidden className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </section>
    </Tarjeta>
  );
}
