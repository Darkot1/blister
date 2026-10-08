import {
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Seccion = {
  href: string;
  texto: string;
  /** Una línea para la pantalla "en construcción". */
  resumen: string;
  icono: LucideIcon;
};

/** El menú lateral, agrupado como en un panel de administración. */
export const GRUPOS: { titulo: string; secciones: Seccion[] }[] = [
  {
    titulo: "General",
    secciones: [{ href: "/inicio", texto: "Panel", resumen: "Tu día de un vistazo", icono: LayoutDashboard }],
  },
  {
    titulo: "Gestión",
    secciones: [
      { href: "/alumnos", texto: "Alumnos", resumen: "Perfiles, notas y medidas", icono: Users },
      { href: "/calendario", texto: "Calendario", resumen: "Citas de la semana", icono: CalendarDays },
    ],
  },
  {
    titulo: "Entrenamiento",
    secciones: [
      { href: "/entrenamiento", texto: "Rutinas y planes", resumen: "Constructor de rutinas, plantillas y planes", icono: ListChecks },
      { href: "/ejercicios", texto: "Ejercicios", resumen: "Biblioteca por músculo", icono: Dumbbell },
      { href: "/progreso", texto: "Progreso", resumen: "Gráficas y resultados", icono: LineChart },
    ],
  },
];

export const AJUSTES: Seccion = {
  href: "/configuracion",
  texto: "Ajustes",
  resumen: "Cuenta y preferencias",
  icono: Settings,
};

export const SECCIONES = [...GRUPOS.flatMap((g) => g.secciones), AJUSTES];

export const seccion = (href: string) => SECCIONES.find((s) => s.href === href)!;

/** Grupo al que pertenece una sección (para la miga de pan del encabezado). */
export const grupoDe = (href: string) => GRUPOS.find((g) => g.secciones.some((s) => s.href === href))?.titulo;

export const esActiva = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);
