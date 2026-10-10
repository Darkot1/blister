"use client";

import { useActionState } from "react";
import { Campo, Selector } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { EnlaceBoton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/aviso";
import type { AlumnoFila } from "@/lib/supabase/tipos-bd";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { ETIQUETA_TIPO_OBJETIVO } from "@/lib/formato";

export type ObjetivoFormulario = { tipo: string; nombre: string; fecha_meta: string | null };

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export function FormularioAlumno({
  accion,
  alumno,
  objetivo,
  textoBoton,
  cancelarHref,
}: {
  accion: Accion;
  alumno?: Pick<AlumnoFila, "nombres" | "apellidos" | "correo" | "telefono" | "fecha_nacimiento" | "fecha_inicio" | "estado">;
  /** Objetivo principal activo, si lo tiene. */
  objetivo?: ObjetivoFormulario | null;
  textoBoton: string;
  cancelarHref: string;
}) {
  const [estado, enviar] = useActionState(accion, {});
  const v = (campo: keyof NonNullable<typeof alumno>) =>
    estado.valores?.[campo] ?? (alumno?.[campo] as string | null | undefined) ?? "";
  const e = estado.errores ?? {};
  // Si el nombre coincide con el del tipo, se deja vacío: así cambia solo al cambiar el tipo.
  const nombreObjetivo =
    objetivo && objetivo.nombre !== ETIQUETA_TIPO_OBJETIVO[objetivo.tipo] ? objetivo.nombre : "";
  const o = (campo: "tipo" | "nombre" | "fecha_meta", inicial: string | null | undefined) =>
    estado.valores?.[`objetivo_${campo}`] ?? inicial ?? "";

  return (
    <form action={enviar} className="max-w-2xl space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}

      <fieldset className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5">
        <legend className="etiqueta float-left mb-4 w-full border-b border-linea pb-3">Datos personales</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" nombre="nombres" required autoComplete="off" defaultValue={v("nombres")} errores={e.nombres} />
          <Campo etiqueta="Apellido" nombre="apellidos" required autoComplete="off" defaultValue={v("apellidos")} errores={e.apellidos} />
          <Campo etiqueta="Fecha de nacimiento" nombre="fecha_nacimiento" type="date" defaultValue={v("fecha_nacimiento")} errores={e.fecha_nacimiento} />
        </div>
      </fieldset>

      <fieldset className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5">
        <legend className="etiqueta float-left mb-4 w-full border-b border-linea pb-3">Contacto</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Teléfono" nombre="telefono" type="tel" inputMode="tel" placeholder="300 123 4567" defaultValue={v("telefono")} errores={e.telefono} />
          <Campo etiqueta="Correo" nombre="correo" type="email" placeholder="opcional" defaultValue={v("correo")} errores={e.correo} />
        </div>
      </fieldset>

      <fieldset className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5">
        <legend className="etiqueta float-left mb-4 w-full border-b border-linea pb-3">Entrenamiento</legend>
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

      <fieldset className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5">
        <legend className="etiqueta float-left mb-4 w-full border-b border-linea pb-3">Objetivo principal</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Selector
            etiqueta="Tipo de objetivo"
            nombre="objetivo_tipo"
            defaultValue={o("tipo", objetivo?.tipo)}
            errores={e.objetivo_tipo}
            opciones={[
              { valor: "", texto: "Sin definir" },
              ...Object.entries(ETIQUETA_TIPO_OBJETIVO).map(([valor, texto]) => ({ valor, texto })),
            ]}
          />
          <Campo
            etiqueta="Fecha meta"
            nombre="objetivo_fecha_meta"
            type="date"
            defaultValue={o("fecha_meta", objetivo?.fecha_meta)}
            errores={e.objetivo_fecha_meta}
            ayuda="Opcional"
          />
          <Campo
            etiqueta="Meta concreta"
            nombre="objetivo_nombre"
            autoComplete="off"
            maxLength={120}
            placeholder="Ej.: bajar a 70 kg, correr 10K en marzo"
            defaultValue={o("nombre", nombreObjetivo)}
            errores={e.objetivo_nombre}
            ayuda="Opcional. Si la dejas vacía se muestra el tipo."
            className="sm:col-span-2"
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
