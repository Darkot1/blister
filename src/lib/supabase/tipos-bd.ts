// Tipos de la base de datos (subconjunto usado por la app).
// Para regenerar el archivo completo:
//   npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn > src/lib/supabase/tipos-bd.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Fila de la RPC admin_espacios (superadministrador). */
export type EspacioAdmin = {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  creado_en: string;
  propietario: string | null;
  propietario_correo: string | null;
  miembros: number;
  alumnos: number;
  alumnos_activos: number;
  citas_30d: number;
  ultima_actividad: string | null;
};

/** Fila de la RPC admin_accesos (bitácora del superadministrador). */
export type AccesoAdmin = {
  id: string;
  creado_en: string;
  accion: "ver_espacio" | "suspender" | "reactivar";
  motivo: string | null;
  espacio_id: string | null;
  espacio: string | null;
  superadmin: string | null;
};

type Tabla<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AlumnoFila = {
  id: string;
  organizacion_id: string;
  usuario_id: string | null;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  correo: string | null;
  telefono: string | null;
  foto_url: string | null;
  estado: string;
  fecha_inicio: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type MedicionFila = {
  id: string;
  alumno_id: string;
  registrado_por: string | null;
  medido_en: string;
  peso_kg: number | null;
  estatura_cm: number | null;
  grasa_corporal_pct: number | null;
  cintura_cm: number | null;
  cadera_cm: number | null;
  pecho_cm: number | null;
  brazo_izq_cm: number | null;
  brazo_der_cm: number | null;
  muslo_izq_cm: number | null;
  muslo_der_cm: number | null;
  notas: string | null;
  creado_en: string;
};

export type NotaFila = {
  id: string;
  alumno_id: string;
  autor_id: string;
  contenido: string;
  creado_en: string;
  actualizado_en: string;
  archivado_en: string | null;
};

export type ObjetivoFila = {
  id: string;
  alumno_id: string;
  tipo: string;
  nombre: string;
  descripcion: string | null;
  valor_meta: number | null;
  unidad: string | null;
  es_principal: boolean;
  fecha_inicio: string;
  fecha_meta: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type PerfilFila = {
  id: string;
  nombres: string;
  apellidos: string;
  avatar_url: string | null;
  telefono: string | null;
  creado_en: string;
  actualizado_en: string;
};

export type OrganizacionFila = {
  id: string;
  nombre: string;
  slug: string;
  zona_horaria: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type MiembroFila = {
  id: string;
  organizacion_id: string;
  usuario_id: string;
  rol: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type EjercicioFila = {
  id: string;
  organizacion_id: string | null;
  creado_por: string | null;
  nombre: string;
  descripcion: string | null;
  instrucciones: string | null;
  errores_comunes: string | null;
  consejos_entrenador: string | null;
  dificultad: string | null;
  tipo: string;
  es_unilateral: boolean;
  video_url: string | null;
  imagen_url: string | null;
  es_global: boolean;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type MusculoFila = {
  id: string;
  grupo_muscular_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  orden: number;
  /** Vacío = catálogo global; con valor = músculo propio de esa organización. */
  organizacion_id: string | null;
  creado_por: string | null;
  creado_en: string;
};

export type CitaFila = {
  id: string;
  organizacion_id: string;
  entrenador_id: string;
  alumno_id: string;
  sesion_id: string | null;
  tipo: string;
  inicia_en: string;
  termina_en: string;
  estado: string;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

type Opcional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      alumnos: Tabla<
        AlumnoFila,
        Opcional<AlumnoFila, "id" | "usuario_id" | "fecha_nacimiento" | "correo" | "telefono" | "foto_url" | "estado" | "fecha_inicio" | "creado_en" | "actualizado_en">
      >;
      mediciones: Tabla<
        MedicionFila,
        Opcional<MedicionFila, "id" | "registrado_por" | "medido_en" | "peso_kg" | "estatura_cm" | "grasa_corporal_pct" | "cintura_cm" | "cadera_cm" | "pecho_cm" | "brazo_izq_cm" | "brazo_der_cm" | "muslo_izq_cm" | "muslo_der_cm" | "notas" | "creado_en">
      >;
      notas_alumno: Tabla<NotaFila, Opcional<NotaFila, "id" | "creado_en" | "actualizado_en" | "archivado_en">>;
      objetivos_alumno: Tabla<
        ObjetivoFila,
        Opcional<ObjetivoFila, "id" | "descripcion" | "valor_meta" | "unidad" | "es_principal" | "fecha_inicio" | "fecha_meta" | "estado" | "creado_en" | "actualizado_en">
      >;
      perfiles: Tabla<PerfilFila, Opcional<PerfilFila, "nombres" | "apellidos" | "avatar_url" | "telefono" | "creado_en" | "actualizado_en">>;
      organizaciones: Tabla<OrganizacionFila, Opcional<OrganizacionFila, "id" | "zona_horaria" | "estado" | "creado_en" | "actualizado_en">>;
      miembros_organizacion: Tabla<MiembroFila, Opcional<MiembroFila, "id" | "rol" | "estado" | "creado_en" | "actualizado_en">>;
      citas: Tabla<
        CitaFila,
        Opcional<CitaFila, "id" | "sesion_id" | "tipo" | "estado" | "notas" | "creado_en" | "actualizado_en">
      >;
      ejercicios: Tabla<
        EjercicioFila,
        Opcional<EjercicioFila, "id" | "creado_por" | "descripcion" | "instrucciones" | "errores_comunes" | "consejos_entrenador" | "dificultad" | "tipo" | "es_unilateral" | "video_url" | "imagen_url" | "es_global" | "estado" | "creado_en" | "actualizado_en">
      >;
      ejercicios_equipamiento: Tabla<
        { ejercicio_id: string; equipamiento_id: string },
        { ejercicio_id: string; equipamiento_id: string }
      >;
      equipamiento: Tabla<{ id: string; nombre: string; slug: string }, { id?: string; nombre: string; slug: string }>;
      grupos_musculares: Tabla<
        { id: string; nombre: string; slug: string; region_corporal_id: string; orden: number },
        { id?: string; nombre: string; slug: string; region_corporal_id: string; orden?: number }
      >;
      ejercicios_musculos: Tabla<
        { ejercicio_id: string; musculo_id: string; rol: string },
        { ejercicio_id: string; musculo_id: string; rol: string }
      >;
      superadministradores: Tabla<{ usuario_id: string; creado_en: string }, { usuario_id: string; creado_en?: string }>;
      musculos: Tabla<MusculoFila, Opcional<MusculoFila, "id" | "descripcion" | "orden" | "organizacion_id" | "creado_por" | "creado_en">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_espacios: { Args: Record<string, never>; Returns: EspacioAdmin[] };
      admin_detalle_espacio: { Args: { p_organizacion_id: string }; Returns: Json };
      admin_accesos: { Args: { p_limite?: number }; Returns: AccesoAdmin[] };
      admin_cambiar_estado_espacio: {
        Args: { p_organizacion_id: string; p_estado: "activo" | "suspendido"; p_motivo?: string };
        Returns: undefined;
      };
      asignar_plantilla: {
        Args: { p_plantilla_id: string; p_alumno_id: string; p_fecha_inicio?: string; p_nombre?: string };
        Returns: string;
      };
      iniciar_sesion_desde_plan: {
        Args: { p_plan_dia_id: string; p_programada_para?: string };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
