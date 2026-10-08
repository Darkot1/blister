import {
  CalendarDays,
  Dumbbell,
  House,
  LineChart,
  ListChecks,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Seccion = {
  href: string;
  texto: string;
  /** Una línea para el menú en rejilla. */
  resumen: string;
  icono: LucideIcon;
  /** Variable CSS del color de la sección (ver globals.css). */
  tono: string;
};

export const SECCIONES: Seccion[] = [
  { href: "/inicio", texto: "Inicio", resumen: "Tu día de un vistazo", icono: House, tono: "var(--app-inicio)" },
  { href: "/alumnos", texto: "Alumnos", resumen: "Perfiles, notas y medidas", icono: Users, tono: "var(--app-alumnos)" },
  { href: "/calendario", texto: "Calendario", resumen: "Citas de la semana", icono: CalendarDays, tono: "var(--app-calendario)" },
  { href: "/entrenamiento", texto: "Entrenamiento", resumen: "Rutinas y planes", icono: ListChecks, tono: "var(--app-entrenamiento)" },
  { href: "/ejercicios", texto: "Ejercicios", resumen: "Biblioteca por músculo", icono: Dumbbell, tono: "var(--app-ejercicios)" },
  { href: "/progreso", texto: "Progreso", resumen: "Gráficas y resultados", icono: LineChart, tono: "var(--app-progreso)" },
  { href: "/configuracion", texto: "Ajustes", resumen: "Cuenta y preferencias", icono: Settings, tono: "var(--app-configuracion)" },
];

/** Las que caben en la barra inferior del móvil; el resto vive en el menú en rejilla. */
export const SECCIONES_DOCK = ["/inicio", "/alumnos", "/calendario", "/ejercicios"];

export const seccion = (href: string) => SECCIONES.find((s) => s.href === href)!;

export const esActiva = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);
