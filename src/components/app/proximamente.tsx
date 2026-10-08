import { Encabezado } from "./encabezado";

export function Proximamente({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <div className="max-w-xl rounded-lg border border-dashed border-linea bg-superficie/60 p-8">
        <p className="font-titulo text-xl font-semibold">En construcción</p>
        <p className="mt-2 text-tenue">{descripcion}</p>
      </div>
    </>
  );
}
