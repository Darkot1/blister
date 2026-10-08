"use client";

import { useActionState } from "react";
import { Campo, Selector } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { EnlaceBoton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/aviso";
import type { AlumnoFila } from "@/lib/supabase/tipos-bd";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export function FormularioAlumno({
  accion,
  alumno,
  textoBoton,
  cancelarHref,
}: {
  accion: Accion;
  alumno?: Pick<AlumnoFila, "nombres" | "apellidos" | "correo" | "telefono" | "fecha_nacimiento" | "fecha_inicio" | "estado">;
  textoBoton: string;
  cancelarHref: string;
}) {
  const [estado, enviar] = useActionState(accion, {});
  const v = (campo: keyof NonNullable<typeof alumno>) =>
    estado.valores?.[campo] ?? (alumno?.[campo] as string | null | undefined) ?? "";
  const e = estado.errores ?? {};

  return (
    <form action={enviar} className="max-w-2xl space-y-6" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}

      <fieldset className="rounded-[var(--radius-tarjeta)] bg-superficie p-4 sm:p-6">
        <legend className="float-left mb-4 w-full text-[1.15rem] font-bold tracking-tight">Datos personales</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" nombre="nombres" required autoComplete="off" defaultValue={v("nombres")} errores={e.nombres} />
          <Campo etiqueta="Apellido" nombre="apellidos" required autoComplete="off" defaultValue={v("apellidos")} errores={e.apellidos} />
          <Campo etiqueta="Fecha de nacimiento" nombre="fecha_nacimiento" type="date" defaultValue={v("fecha_nacimiento")} errores={e.fecha_nacimiento} />
        </div>
      </fieldset>

      <fieldset className="rounded-[var(--radius-tarjeta)] bg-superficie p-4 sm:p-6">
        <legend className="float-left mb-4 w-full text-[1.15rem] font-bold tracking-tight">Contacto</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Teléfono" nombre="telefono" type="tel" inputMode="tel" placeholder="300 123 4567" defaultValue={v("telefono")} errores={e.telefono} />
          <Campo etiqueta="Correo" nombre="correo" type="email" placeholder="opcional" defaultValue={v("correo")} errores={e.correo} />
        </div>
      </fieldset>

      <fieldset className="rounded-[var(--radius-tarjeta)] bg-superficie p-4 sm:p-6">
        <legend className="float-left mb-4 w-full text-[1.15rem] font-bold tracking-tight">Entrenamiento</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Entrena contigo desde" nombre="fecha_inicio" type="date" defaultValue={v("fecha_inicio")} errores={e.fecha_inicio} />
          <Selector
            etiqueta="Estado"
            nombre="estado"
            defaultValue={v("estado") || "activo"}
            opciones={[
              { valor: "activo", texto: "Activo" },
              { valor: "inactivo", texto: "Inactivo (pausa)" },
              ...(alumno?.estado === "archivado" ? [{ valor: "archivado", texto: "Archivado" }] : []),
            ]}
          />
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <BotonEnvio textoPendiente="Guardando…">{textoBoton}</BotonEnvio>
        <EnlaceBoton href={cancelarHref} variante="fantasma">Cancelar</EnlaceBoton>
      </div>
    </form>
  );
}
