import { Encabezado } from "./encabezado";
import { seccion } from "./secciones";
import { IconoApp } from "@/components/ui/icono-app";
import { EnlaceBoton } from "@/components/ui/boton";

export function Proximamente({ href, descripcion }: { href: string; descripcion: string }) {
  const s = seccion(href);
  return (
    <>
      <Encabezado titulo={s.texto} />
      <div className="flex max-w-xl flex-col items-start rounded-[var(--radius-tarjeta)] bg-superficie p-7 sm:p-9">
        <IconoApp icono={s.icono} tono={s.tono} tamano="xl" />
        <p className="mt-6 inline-flex h-6 items-center rounded-full bg-tinta/[0.06] px-2.5 text-xs font-semibold text-tenue">
          En construcción
        </p>
        <p className="mt-3 text-xl font-bold tracking-tight">{s.resumen}</p>
        <p className="mt-1.5 text-tenue">{descripcion}</p>
        <EnlaceBoton href="/inicio" variante="secundario" className="mt-6">Volver al inicio</EnlaceBoton>
      </div>
    </>
  );
}
