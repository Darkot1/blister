"use client";

import { useFormStatus } from "react-dom";
import { Boton } from "./boton";
import type { ComponentProps } from "react";

/** Botón de envío que se desactiva y cambia su texto mientras el formulario se procesa. */
export function BotonEnvio({
  children,
  textoPendiente,
  ...props
}: ComponentProps<typeof Boton> & { textoPendiente: string }) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? textoPendiente : children}
    </Boton>
  );
}
