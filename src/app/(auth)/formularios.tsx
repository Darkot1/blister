"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Aviso } from "@/components/ui/aviso";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { actualizarClave, ingresar, ingresarConGoogle, recuperar, registrar } from "./acciones";
import { useFormStatus } from "react-dom";

const inicial: EstadoFormulario = {};

function BotonGoogleInterno() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center rounded-md border border-linea bg-superficie px-4 text-[0.95rem] font-semibold text-tinta transition-colors hover:border-tinta/40 disabled:opacity-60"
    >
      {pending ? "Abriendo Google…" : "Continuar con Google"}
    </button>
  );
}

/** Botón de Google + separador. Va arriba del formulario de correo. */
export function AccesoGoogle({ siguiente }: { siguiente?: string }) {
  return (
    <>
      <form action={ingresarConGoogle}>
        {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
        <BotonGoogleInterno />
      </form>
      <div className="my-6 flex items-center gap-3 text-sm text-tenue" role="separator">
        <span className="h-px flex-1 bg-linea" />
        o con tu correo
        <span className="h-px flex-1 bg-linea" />
      </div>
    </>
  );
}

export function FormularioIngreso({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(ingresar, inicial);
  return (
    <form action={accion} className="space-y-4" noValidate>
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <Campo etiqueta="Contraseña" nombre="clave" type="password" autoComplete="current-password" required
        errores={estado.errores?.clave} />
      <BotonEnvio className="w-full" textoPendiente="Ingresando…">Ingresar</BotonEnvio>
      <p className="text-center text-sm">
        <Link href="/recuperar" className="text-acento hover:underline">¿Olvidaste tu contraseña?</Link>
      </p>
    </form>
  );
}

export function FormularioRegistro() {
  const [estado, accion] = useActionState(registrar, inicial);
  if (estado.ok) {
    return (
      <Aviso tipo="exito">
        Te enviamos un correo para confirmar tu cuenta. Abre el enlace y luego ingresa.
      </Aviso>
    );
  }
  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Nombre" nombre="nombres" autoComplete="given-name" required
          defaultValue={estado.valores?.nombres} errores={estado.errores?.nombres} />
        <Campo etiqueta="Apellido" nombre="apellidos" autoComplete="family-name" required
          defaultValue={estado.valores?.apellidos} errores={estado.errores?.apellidos} />
      </div>
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <Campo etiqueta="Contraseña" nombre="clave" type="password" autoComplete="new-password" required
        ayuda="Mínimo 8 caracteres." errores={estado.errores?.clave} />
      <BotonEnvio className="w-full" textoPendiente="Creando cuenta…">Crear cuenta</BotonEnvio>
    </form>
  );
}

export function FormularioRecuperar() {
  const [estado, accion] = useActionState(recuperar, inicial);
  if (estado.ok) {
    return (
      <Aviso tipo="exito">
        Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.
      </Aviso>
    );
  }
  return (
    <form action={accion} className="space-y-4" noValidate>
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <BotonEnvio className="w-full" textoPendiente="Enviando…">Enviar enlace</BotonEnvio>
    </form>
  );
}

export function FormularioNuevaClave() {
  const [estado, accion] = useActionState(actualizarClave, inicial);
  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Nueva contraseña" nombre="clave" type="password" autoComplete="new-password" required
        ayuda="Mínimo 8 caracteres." errores={estado.errores?.clave} />
      <Campo etiqueta="Repite la contraseña" nombre="confirmacion" type="password" autoComplete="new-password" required
        errores={estado.errores?.confirmacion} />
      <BotonEnvio className="w-full" textoPendiente="Guardando…">Guardar contraseña</BotonEnvio>
    </form>
  );
}
