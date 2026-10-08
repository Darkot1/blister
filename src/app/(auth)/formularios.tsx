"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Aviso } from "@/components/ui/aviso";
import { clasesBoton } from "@/components/ui/boton";
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
      className={clasesBoton("secundario", "h-10 w-full")}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
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
      <div className="etiqueta my-6 flex items-center gap-3" role="separator">
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
      <BotonEnvio className="h-10 w-full" textoPendiente="Ingresando…">Ingresar</BotonEnvio>
      <p className="text-center text-sm">
        <Link href="/recuperar" className="text-tenue underline underline-offset-2 hover:text-tinta">¿Olvidaste tu contraseña?</Link>
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
      <BotonEnvio className="h-10 w-full" textoPendiente="Creando cuenta…">Crear cuenta</BotonEnvio>
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
      <BotonEnvio className="h-10 w-full" textoPendiente="Enviando…">Enviar enlace</BotonEnvio>
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
      <BotonEnvio className="h-10 w-full" textoPendiente="Guardando…">Guardar contraseña</BotonEnvio>
    </form>
  );
}
