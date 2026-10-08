/** Une nombres de clase ignorando los falsos: cx(css.boton, activo && css.activo, className). */
export function cx(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(" ");
}
