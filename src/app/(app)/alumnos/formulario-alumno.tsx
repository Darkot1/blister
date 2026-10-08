"use client";

import { useActionState } from "react";
import { Campo, Selector } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { EnlaceBoton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/aviso";
import { Grupo, Rejilla } from "@/components/ui/disposicion";
import type { AlumnoFila } from "@/lib/supabase/tipos-bd";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import css from "./formulario-alumno.module.css";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

/** "Revisa el campo marcado" / "Revisa los 2 campos marcados". */
export function resumenErrores(errores: EstadoFormulario["errores"]) {
  const n = Object.values(errores ?? {}).filter((e) => e?.length).length;
  if (!n) return null;
  return n === 1 ? "Revisa el campo marcado en rojo para poder guardar." : `Revisa los ${n} campos marcados en rojo para poder guardar.`;
}

/** Alta y edición de un alumno, agrupado en datos personales, contacto y entrenamiento. */
export function FormularioAlumno({
  accion,
  alumno,
  textoBoton,
  cancelarHref,
  estadoInicial = {},
}: {
  accion: Accion;
  alumno?: Pick<AlumnoFila, "nombres" | "apellidos" | "correo" | "telefono" | "fecha_nacimiento" | "fecha_inicio" | "estado">;
  textoBoton: string;
  cancelarHref: string;
  /** Solo para vistas previas: errores y valores ya cargados. */
  estadoInicial?: EstadoFormulario;
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial);
  const v = (campo: keyof NonNullable<typeof alumno>) =>
    estado.valores?.[campo] ?? (alumno?.[campo] as string | null | undefined) ?? "";
  const e = estado.errores ?? {};
  const resumen = resumenErrores(estado.errores);

  return (
    <form action={enviar} className={css.formulario} noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      {resumen && <Aviso>{resumen}</Aviso>}

      <fieldset className={css.grupo}>
        <legend className={css.leyenda}>Datos personales</legend>
        <Rejilla columnas={2} espacio={4}>
          <Campo etiqueta="Nombre" nombre="nombres" required autoComplete="off" autoCapitalize="words" enterKeyHint="next" defaultValue={v("nombres")} errores={e.nombres} />
          <Campo etiqueta="Apellido" nombre="apellidos" required autoComplete="off" autoCapitalize="words" enterKeyHint="next" defaultValue={v("apellidos")} errores={e.apellidos} />
          <Campo
            etiqueta="Fecha de nacimiento"
            nombre="fecha_nacimiento"
            type="date"
            opcional
            ayuda="Con ella calculamos su edad."
            defaultValue={v("fecha_nacimiento")}
            errores={e.fecha_nacimiento}
          />
        </Rejilla>
      </fieldset>

      <fieldset className={css.grupo}>
        <legend className={css.leyenda}>Contacto</legend>
        <Rejilla columnas={2} espacio={4}>
          <Campo etiqueta="Teléfono" nombre="telefono" type="tel" inputMode="tel" autoComplete="off" opcional placeholder="300 123 4567" defaultValue={v("telefono")} errores={e.telefono} />
          <Campo etiqueta="Correo" nombre="correo" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" opcional placeholder="nombre@correo.com" defaultValue={v("correo")} errores={e.correo} />
        </Rejilla>
      </fieldset>

      <fieldset className={css.grupo}>
        <legend className={css.leyenda}>Entrenamiento</legend>
        <Rejilla columnas={2} espacio={4}>
          <Campo
            etiqueta="Entrena contigo desde"
            nombre="fecha_inicio"
            type="date"
            opcional
            defaultValue={v("fecha_inicio")}
            errores={e.fecha_inicio}
          />
          {/* Un alumno nuevo siempre empieza activo: el estado solo se elige al editar. */}
          {alumno && (
            <Selector
              etiqueta="Estado"
              nombre="estado"
              defaultValue={v("estado") || "activo"}
              ayuda="Inactivo lo pone en pausa: sale de tus activos y conserva todo su historial."
              opciones={[
                { valor: "activo", texto: "Activo" },
                { valor: "inactivo", texto: "Inactivo (en pausa)" },
                ...(alumno.estado === "archivado" ? [{ valor: "archivado", texto: "Archivado" }] : []),
              ]}
            />
          )}
        </Rejilla>
      </fieldset>

      <Grupo espacio={3}>
        <BotonEnvio textoPendiente="Guardando…">{textoBoton}</BotonEnvio>
        <EnlaceBoton href={cancelarHref} variante="fantasma">
          Cancelar
        </EnlaceBoton>
      </Grupo>
    </form>
  );
}
