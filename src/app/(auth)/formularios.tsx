"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Campo } from "@/components/ui/campo";
import { Rejilla } from "@/components/ui/disposicion";
import { Enlace } from "@/components/ui/enlace";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { actualizarClave, ingresar, ingresarConGoogle, recuperar, registrar } from "./acciones";
import css from "./formularios.module.css";

const inicial: EstadoFormulario = {};

/** "G" de Google con sus colores de marca (lo que el entrenador reconoce de un vistazo). */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={css.logoGoogle}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Botón de Google + separador. Va arriba del formulario de correo. */
export function AccesoGoogle({ siguiente }: { siguiente?: string }) {
  return (
    <>
      <form action={ingresarConGoogle}>
        {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
        <BotonEnvio variante="secundario" bloque tamano="grande" textoPendiente="Abriendo Google…">
          <LogoGoogle />
          Continuar con Google
        </BotonEnvio>
      </form>
      <p className={css.separador}>o con tu correo</p>
    </>
  );
}

export function FormularioIngreso({ siguiente }: { siguiente?: string }) {
  const [estado, accion] = useActionState(ingresar, inicial);
  return (
    <form action={accion} className={css.formulario} noValidate>
      {siguiente && <input type="hidden" name="siguiente" value={siguiente} />}
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" inputMode="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <div className={css.clave}>
        <Campo etiqueta="Contraseña" nombre="clave" type="password" autoComplete="current-password" required
          errores={estado.errores?.clave} />
        <Enlace href="/recuperar" className={css.olvido}>¿Olvidaste tu contraseña?</Enlace>
      </div>
      <BotonEnvio bloque tamano="grande" textoPendiente="Ingresando…">Ingresar</BotonEnvio>
    </form>
  );
}

export function FormularioRegistro() {
  const [estado, accion] = useActionState(registrar, inicial);
  if (estado.ok) {
    return (
      <div className={css.formulario}>
        <Aviso tipo="exito">
          Te enviamos un correo para confirmar tu cuenta. Abre el enlace y luego ingresa.
        </Aviso>
        <Enlace href="/ingresar">Ir a ingresar</Enlace>
      </div>
    );
  }
  return (
    <form action={accion} className={css.formulario} noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Rejilla columnas={2} espacio={4}>
        <Campo etiqueta="Nombre" nombre="nombres" autoComplete="given-name" required
          defaultValue={estado.valores?.nombres} errores={estado.errores?.nombres} />
        <Campo etiqueta="Apellido" nombre="apellidos" autoComplete="family-name" required
          defaultValue={estado.valores?.apellidos} errores={estado.errores?.apellidos} />
      </Rejilla>
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" inputMode="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <Campo etiqueta="Contraseña" nombre="clave" type="password" autoComplete="new-password" required
        ayuda="Mínimo 8 caracteres." errores={estado.errores?.clave} />
      <BotonEnvio bloque tamano="grande" textoPendiente="Creando cuenta…">Crear cuenta</BotonEnvio>
    </form>
  );
}

export function FormularioRecuperar() {
  const [estado, accion] = useActionState(recuperar, inicial);
  if (estado.ok) {
    return (
      <div className={css.formulario}>
        <Aviso tipo="exito">
          Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña. Revisa también la
          carpeta de spam.
        </Aviso>
        <Enlace href="/ingresar">Volver a ingresar</Enlace>
      </div>
    );
  }
  return (
    <form action={accion} className={css.formulario} noValidate>
      <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" inputMode="email" required
        defaultValue={estado.valores?.correo} errores={estado.errores?.correo} />
      <BotonEnvio bloque tamano="grande" textoPendiente="Enviando…">Enviar enlace</BotonEnvio>
    </form>
  );
}

export function FormularioNuevaClave() {
  const [estado, accion] = useActionState(actualizarClave, inicial);
  return (
    <form action={accion} className={css.formulario} noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Nueva contraseña" nombre="clave" type="password" autoComplete="new-password" required
        ayuda="Mínimo 8 caracteres." errores={estado.errores?.clave} />
      <Campo etiqueta="Repite la contraseña" nombre="confirmacion" type="password" autoComplete="new-password" required
        errores={estado.errores?.confirmacion} />
      <BotonEnvio bloque tamano="grande" textoPendiente="Guardando…">Guardar contraseña</BotonEnvio>
    </form>
  );
}
