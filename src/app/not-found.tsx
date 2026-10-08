import { EnlaceBoton } from "@/components/ui/boton";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="etiqueta">Error 404</p>
        <h1 className="mt-2 text-[1.9rem] leading-tight font-semibold tracking-[-0.03em]">No encontramos esta página</h1>
        <p className="mt-2 text-tenue">Puede que el enlace esté mal escrito o que el registro ya no exista.</p>
        <EnlaceBoton href="/inicio" className="mt-6">Ir al panel</EnlaceBoton>
      </div>
    </main>
  );
}
