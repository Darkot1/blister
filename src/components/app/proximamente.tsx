import { Construction } from "lucide-react";
import { Encabezado } from "./encabezado";
import { grupoDe, seccion } from "./secciones";
import { EnlaceBoton } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";

export function Proximamente({ href, descripcion }: { href: string; descripcion: string }) {
  const s = seccion(href);
  const Icono = s.icono;
  return (
    <>
      <Encabezado titulo={s.texto} miga={grupoDe(href) ?? "Cuenta"} />
      <Tarjeta className="grid max-w-3xl overflow-hidden sm:grid-cols-[1fr_12rem]">
        <div className="p-6 sm:p-7">
          <p className="etiqueta inline-flex items-center gap-1.5">
            <Construction aria-hidden className="size-3.5" /> En construcción
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight">{s.resumen}</p>
          <p className="mt-1.5 text-tenue">{descripcion}</p>
          <EnlaceBoton href="/inicio" variante="secundario" className="mt-6">Volver al panel</EnlaceBoton>
        </div>
        <div aria-hidden className="trama hidden place-items-center border-l border-linea bg-fondo sm:grid">
          <span className="grid size-16 place-items-center rounded-2xl bg-tinta text-acento">
            <Icono className="size-7" />
          </span>
        </div>
      </Tarjeta>
    </>
  );
}
