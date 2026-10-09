/** Formas del JSON que devuelven las RPC admin_panel y admin_detalle_espacio. */

export type Actividad = {
  creado_en: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  tipo_entidad: string;
  espacio_id: string | null;
  espacio: string | null;
  usuario: string | null;
};

export type Panel = {
  totales: Record<
    | "espacios" | "espacios_activos" | "espacios_suspendidos"
    | "usuarios" | "usuarios_nuevos_30d" | "usuarios_activos_7d"
    | "alumnos" | "alumnos_activos" | "alumnos_nuevos_30d"
    | "plantillas" | "planes_activos" | "sesiones_completadas_30d" | "mediciones_30d"
    | "ejercicios_globales" | "ejercicios_propios",
    number
  >;
  citas_30d: Record<string, number>;
  semanas: { semana: string; usuarios: number; alumnos: number; citas: number }[];
  espacios: {
    id: string;
    nombre: string;
    slug: string;
    estado: string;
    creado_en: string;
    propietario: string | null;
    propietario_correo: string | null;
    ultimo_ingreso: string | null;
    miembros: number;
    alumnos: number;
    alumnos_activos: number;
    planes_activos: number;
    citas_30d: number;
    ultima_actividad: string | null;
  }[];
  actividad: Actividad[];
};

export type Detalle = {
  espacio: { id: string; nombre: string; slug: string; estado: string; zona_horaria: string; creado_en: string };
  miembros: {
    usuario_id: string;
    nombres: string;
    apellidos: string;
    avatar_url: string | null;
    correo: string | null;
    rol: string;
    estado: string;
    creado_en: string;
    ultimo_ingreso: string | null;
    alumnos: number;
    citas_proximas: number;
    citas_completadas_30d: number;
  }[];
  alumnos: {
    id: string;
    nombres: string;
    apellidos: string;
    estado: string;
    fecha_inicio: string | null;
    creado_en: string;
    entrenadores: string[];
    objetivo: string | null;
    planes_activos: number;
    sesiones_completadas: number;
    ultima_sesion: string | null;
    mediciones: number;
    ultima_medicion: string | null;
    proxima_cita: string | null;
  }[];
  citas_30d: Record<string, number>;
  proximas_citas: {
    id: string;
    inicia_en: string;
    termina_en: string;
    tipo: string;
    estado: string;
    alumno: string;
    entrenador: string | null;
  }[];
  planes: {
    id: string;
    nombre: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    tipo_objetivo: string | null;
    alumno: string;
    creado_por: string | null;
  }[];
  plantillas: { id: string; nombre: string; estado: string; tipo_objetivo: string | null; creado_en: string; asignaciones: number }[];
  actividad: Actividad[];
  totales: Record<"plantillas" | "planes" | "sesiones" | "citas" | "mediciones" | "ejercicios_propios" | "musculos_propios", number>;
};
