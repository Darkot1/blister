import { EnlaceBoton } from "@/components/ui/boton";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="cifra text-8xl font-semibold text-tinta/20">404</p>
        <h1 className="mt-2 font-titulo text-3xl font-semibold">No encontramos esta página</h1>
        <p className="mt-2 text-tenue">Puede que el enlace esté mal escrito o que el registro ya no exista.</p>
        <EnlaceBoton href="/inicio" className="mt-6">Ir al inicio</EnlaceBoton>
      </div>
    </main>
  );
}
