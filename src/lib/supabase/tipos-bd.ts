// Tipos de la base de datos (subconjunto usado por la app).
// Para regenerar el archivo completo:
//   npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn > src/lib/supabase/tipos-bd.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Fila de la RPC admin_usuarios (superadministrador). */
export type UsuarioAdmin = {
  id: string;
  nombres: string;
  apellidos: string;
  avatar_url: string | null;
  correo: string | null;
  proveedores: string[];
  creado_en: string;
  ultimo_ingreso: string | null;
  confirmado: boolean;
  es_superadmin: boolean;
  espacios: Json;
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

export type PlantillaFila = {
  id: string;
  organizacion_id: string;
  creado_por: string;
  nombre: string;
  descripcion: string | null;
  tipo_objetivo: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type PlanFila = {
  id: string;
  organizacion_id: string;
  alumno_id: string;
  creado_por: string;
  plantilla_origen_id: string | null;
  nombre: string;
  descripcion: string | null;
  tipo_objetivo: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
};

export type SesionFila = {
  id: string;
  organizacion_id: string;
  alumno_id: string;
  plan_id: string | null;
  plan_dia_id: string | null;
  programada_para: string | null;
  iniciada_en: string | null;
  completada_en: string | null;
  estado: string;
  rpe_sesion: number | null;
  notas: string | null;
  creado_en: string;
  actualizado_en: string;
};

/** Común a plantilla_dias y plan_dias. */
type DiaBase = { id: string; nombre: string; orden: number; descripcion: string | null };

export type BloqueFila = {
  id: string;
  nombre: string;
  tipo: string;
  orden: number;
  descanso_segundos: number | null;
  rondas: number | null;
  notas: string | null;
};

export type PrescripcionFila = {
  id: string;
  ejercicio_id: string;
  orden: number;
  series: number | null;
  repeticiones: string | null;
  peso: number | null;
  unidad_peso: string;
  descanso_segundos: number | null;
  tempo: string | null;
  rir: number | null;
  rpe: number | null;
  notas: string | null;
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
      plantillas: Tabla<PlantillaFila, Opcional<PlantillaFila, "id" | "descripcion" | "tipo_objetivo" | "estado" | "creado_en" | "actualizado_en">>;
      plantilla_dias: Tabla<DiaBase & { plantilla_id: string }, Opcional<DiaBase & { plantilla_id: string }, "id" | "descripcion">>;
      plantilla_bloques: Tabla<BloqueFila & { plantilla_dia_id: string }, Partial<BloqueFila> & { plantilla_dia_id: string; nombre: string; tipo: string }>;
      plantilla_ejercicios: Tabla<
        PrescripcionFila & { plantilla_bloque_id: string },
        Partial<PrescripcionFila> & { plantilla_bloque_id: string; ejercicio_id: string }
      >;
      planes: Tabla<PlanFila, Opcional<PlanFila, "id" | "plantilla_origen_id" | "descripcion" | "tipo_objetivo" | "fecha_inicio" | "fecha_fin" | "estado" | "creado_en" | "actualizado_en">>;
      plan_dias: Tabla<
        DiaBase & { plan_id: string; dia_semana: number | null },
        Opcional<DiaBase & { plan_id: string; dia_semana: number | null }, "id" | "descripcion" | "dia_semana">
      >;
      plan_bloques: Tabla<BloqueFila & { plan_dia_id: string }, Partial<BloqueFila> & { plan_dia_id: string; nombre: string; tipo: string }>;
      plan_ejercicios: Tabla<
        PrescripcionFila & { plan_bloque_id: string },
        Partial<PrescripcionFila> & { plan_bloque_id: string; ejercicio_id: string }
      >;
      sesiones: Tabla<
        SesionFila,
        Opcional<SesionFila, "id" | "plan_id" | "plan_dia_id" | "programada_para" | "iniciada_en" | "completada_en" | "estado" | "rpe_sesion" | "notas" | "creado_en" | "actualizado_en">
      >;
      musculos: Tabla<MusculoFila, Opcional<MusculoFila, "id" | "descripcion" | "orden" | "organizacion_id" | "creado_por" | "creado_en">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_panel: { Args: Record<string, never>; Returns: Json };
      admin_usuarios: { Args: Record<string, never>; Returns: UsuarioAdmin[] };
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
      guardar_plantilla: {
        Args: {
          p_plantilla_id: string | null;
          p_organizacion_id: string;
          p_nombre: string;
          p_descripcion: string | null;
          p_tipo_objetivo: string | null;
          p_dias: Json;
        };
        Returns: string;
      };
      activar_plan: { Args: { p_plan_id: string }; Returns: undefined };
      iniciar_sesion_desde_plan: {
        Args: { p_plan_dia_id: string; p_programada_para?: string };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
