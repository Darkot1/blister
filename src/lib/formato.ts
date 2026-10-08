const ZONA = "America/Bogota";

/** "8 oct 2026" */
export function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "—";
  // Las fechas sin hora (YYYY-MM-DD) se interpretan como calendario, no como UTC.
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: ZONA })
    .format(fecha)
    .replace(".", "");
}

/** "8 oct, 3:45 p. m." */
export function fechaHora(valor: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA,
  }).format(new Date(valor));
}

export function edad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(`${fechaNacimiento}T12:00:00`);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) anios -= 1;
  return anios;
}

export function numero(valor: number | null | undefined, decimales = 1) {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: decimales }).format(valor);
}

export function iniciales(nombres: string, apellidos: string) {
  return `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase();
}

export const ETIQUETA_ESTADO_ALUMNO: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  archivado: "Archivado",
};
