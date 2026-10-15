import { EnlaceBoton } from "@/components/ui/boton";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="etiqueta">Error 404</p>
        <h1 className="titulo-serif mt-2 text-[1.875rem] leading-[1.2]">No encontramos esta página</h1>
        <p className="mt-2 text-tenue">Puede que el enlace esté mal escrito o que el registro ya no exista.</p>
        <EnlaceBoton href="/inicio" className="mt-6">Ir al panel</EnlaceBoton>
      </div>
    </main>
  );
}
