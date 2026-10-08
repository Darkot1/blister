import { EnlaceBoton } from "@/components/ui/boton";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="cifra text-[7rem] leading-none font-semibold text-tinta/15">404</p>
        <h1 className="mt-3 text-[1.9rem] leading-tight font-bold tracking-[-0.03em]">No encontramos esta página</h1>
        <p className="mt-2 text-tenue">Puede que el enlace esté mal escrito o que el registro ya no exista.</p>
        <EnlaceBoton href="/inicio" className="mt-6">Ir al inicio</EnlaceBoton>
      </div>
    </main>
  );
}
