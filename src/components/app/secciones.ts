import {
  BookOpen,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Seccion = {
  href: string;
  texto: string;
  /** Una línea para la pantalla "en construcción". */
  resumen: string;
  icono: LucideIcon;
  /** Aún en construcción: el menú lo marca para no llevar a una pantalla vacía por sorpresa. */
  pronto?: boolean;
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
      { href: "/progreso", texto: "Progreso", resumen: "Gráficas y resultados", icono: LineChart, pronto: true },
    ],
  },
  {
    titulo: "Catálogo",
    secciones: [{ href: "/maestros", texto: "Maestros", resumen: "Ejercicios y músculos propios", icono: BookOpen }],
  },
];

export const AJUSTES: Seccion = {
  href: "/configuracion",
  texto: "Ajustes",
  resumen: "Cuenta y preferencias",
  icono: Settings,
};

/** Solo para el superadministrador de la plataforma. */
export const ADMIN: Seccion = {
  href: "/admin",
  texto: "Administración",
  resumen: "Espacios, entrenadores y alumnos de la plataforma",
  icono: ShieldCheck,
};

/** Barra inferior del móvil: lo que el entrenador abre entre sesión y sesión. El resto va en "Más". */
export const PRINCIPALES = ["/inicio", "/alumnos", "/calendario", "/entrenamiento"];

export const SECCIONES = [...GRUPOS.flatMap((g) => g.secciones), AJUSTES];

export const seccion = (href: string) => SECCIONES.find((s) => s.href === href)!;

/** Grupo al que pertenece una sección (para la miga de pan del encabezado). */
export const grupoDe = (href: string) => GRUPOS.find((g) => g.secciones.some((s) => s.href === href))?.titulo;

export const esActiva = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);
