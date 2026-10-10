import { Esqueleto } from "@/components/ui/esqueleto";

export function CargandoConstructor() {
  return (
    <div role="status" aria-label="Cargando" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="space-y-4">
        <Esqueleto className="h-40" />
        <Esqueleto className="h-10 w-2/3" />
        <Esqueleto className="h-64" />
      </div>
      <Esqueleto className="hidden h-[32rem] lg:block" />
    </div>
  );
}
