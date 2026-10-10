"use client";

import { useActionState, useState } from "react";
import { ListChecks } from "lucide-react";
import Link from "next/link";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

/** Asigna una de las rutinas del entrenador a este alumno sin salir de su perfil. */
export function AsignarRutinaAlumno({
  accion,
  rutinas,
  hoy,
  planActivo,
  variante = "secundario",
}: {
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  rutinas: { id: string; nombre: string; detalle: string }[];
  hoy: string;
  planActivo: string | null;
  variante?: "primario" | "secundario";
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const resultado = await accion(previo, datos);
    if (resultado.ok) setAbierto(false);
    return resultado;
  }, {});

  return (
    <>
      <Boton type="button" variante={variante} onClick={() => setAbierto(true)}>
        <ListChecks aria-hidden className="size-4" />
        {planActivo ? "Cambiar rutina" : "Asignar rutina"}
      </Boton>
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={planActivo ? "Cambiar rutina" : "Asignar rutina"}>
        {rutinas.length === 0 ? (
          <div className="space-y-3 text-sm">
            <p className="text-tenue">Aún no tienes rutinas guardadas.</p>
            <Link href="/entrenamiento/rutinas/nueva" className="font-medium underline underline-offset-2 hover:no-underline">
              Crear la primera rutina
            </Link>
          </div>
        ) : (
          <form action={enviar} className="space-y-4">
            <Selector
              etiqueta="Rutina"
              nombre="plantilla_id"
              required
              defaultValue={estado.valores?.plantilla_id ?? ""}
              errores={estado.errores?.plantilla_id}
              opciones={[{ valor: "", texto: "Elige una rutina" }, ...rutinas.map((r) => ({ valor: r.id, texto: `${r.nombre} · ${r.detalle}` }))]}
            />
            <Campo
              etiqueta="Empieza el"
              nombre="fecha_inicio"
              type="date"
              required
              defaultValue={estado.valores?.fecha_inicio ?? hoy}
              errores={estado.errores?.fecha_inicio}
            />
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" name="activar" defaultChecked className="mt-0.5 size-4 accent-[var(--tinta)]" />
              <span>
                Dejarlo como su plan activo
                {planActivo && <span className="block text-tenue">Reemplaza a «{planActivo}», que quedará como completado.</span>}
              </span>
            </label>
            <p className="text-sm text-tenue">Recibe su propia copia: si después cambias la rutina, su plan no se modifica.</p>
            {estado.error && <Aviso>{estado.error}</Aviso>}
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
                Cancelar
              </Boton>
              <BotonEnvio textoPendiente="Asignando…">Asignar</BotonEnvio>
            </div>
          </form>
        )}
      </Dialogo>
    </>
  );
}
