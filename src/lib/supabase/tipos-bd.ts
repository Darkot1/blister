// Tipos de la base de datos (subconjunto usado por la app).
// Para regenerar el archivo completo:
//   npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn > src/lib/supabase/tipos-bd.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Una junta de la oficina ya terminada: lo que se pidió y el resultado (historial, no se edita). */
export type JuntaFila = {
  id: string;
  organizacion_id: string;
  alumno_id: string | null;
  autor_id: string | null;
  pedido: string;
  /** El CasoJunta tal como lo ve el entrenador (lib/agentes/juntas.ts). */
  resultado: Json;
  modelos: string[];
  creado_en: string;
};

/** Lesión, dolor o limitación de un alumno (la leen los agentes de la oficina). */
export type CondicionFila = {
  id: string;
  alumno_id: string;
  tipo: "lesion" | "limitacion" | "dolor" | "restriccion" | "otro";
  region_corporal_id: string | null;
  articulacion_id: string | null;
  descripcion: string;
  severidad: "leve" | "moderada" | "alta" | null;
  estado: "activo" | "resuelto" | "inactivo";
  fecha_inicio: string | null;
  fecha_resolucion: string | null;
  notas_entrenador: string | null;
  creado_en: string;
  actualizado_en: string;
};

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
  /** /e/<slug> visible y aceptando solicitudes. */
  pagina_publica: boolean;
  presentacion: string | null;
  titular: string | null;
  /** Portada en el bucket paginas-publicas ({organizacion_id}/...). */
  foto_ruta: string | null;
  metodos: MetodoTrabajo[];
  modalidad: "presencial" | "en_linea" | "mixta" | null;
  ubicacion: string | null;
  experiencia_anos: number | null;
  certificaciones: string | null;
  instagram: string | null;
  whatsapp: string | null;
  /** Diseño de la página (orden de secciones, color, portada…). Se lee con normalizarDiseno(). */
  diseno: Json;
  /** Testimonios de alumnos publicados con su permiso (máximo 6). */
  testimonios: Testimonio[];
  /** En cuántas horas responde las solicitudes (1 a 72). */
  respuesta_horas: number | null;
  /** Oferta para empezar, en la portada ("Primera sesión gratis"). */
  oferta_inicial: string | null;
  creado_en: string;
  actualizado_en: string;
};

/** Lo que llega del formulario de la página pública: el entrenador la acepta (crea el alumno) o la descarta. */
export type SolicitudFila = {
  id: string;
  organizacion_id: string;
  tipo: "registro" | "contacto";
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string | null;
  objetivo: string | null;
  mensaje: string | null;
  fecha_nacimiento: string | null;
  lesiones: string | null;
  estado: "nueva" | "aceptada" | "descartada";
  alumno_id: string | null;
  /** Cuándo autorizó el tratamiento de sus datos; null en solicitudes anteriores a la autorización. */
  autoriza_datos_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

/** Un método de trabajo de la página pública ("Cómo trabajo"). */
export type MetodoTrabajo = { titulo: string; descripcion: string };

/** Un testimonio de la página pública: quién (como el alumno lo autorizó), qué dice y, opcional, su resultado. */
export type Testimonio = { nombre: string; texto: string; resultado: string };

/** Respuesta de la RPC pagina_publica. */
export type PaginaPublica = Pick<
  OrganizacionFila,
  "nombre" | "titular" | "presentacion" | "foto_ruta" | "metodos" | "modalidad" | "ubicacion" | "experiencia_anos" | "certificaciones" | "instagram" | "whatsapp" | "diseno" | "testimonios" | "respuesta_horas" | "oferta_inicial"
> & {
  entrenadores: { nombres: string; apellidos: string; avatar_url: string | null }[];
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

/** Google Calendar conectado por un usuario. Los tokens van cifrados (ver lib/google/calendario.ts). */
export type ConexionGoogleFila = {
  usuario_id: string;
  correo_google: string;
  refresh_token_cifrado: string;
  acceso_cifrado: string | null;
  acceso_expira_en: string | null;
  calendario_id: string;
  conectado_en: string;
  actualizado_en: string;
};

export type ConexionTelegramFila = {
  usuario_id: string;
  chat_id: number | null;
  codigo: string | null;
  codigo_expira_en: string | null;
  vinculado_en: string | null;
  ultimo_resumen: string | null;
  ultimo_resumen_semanal: string | null;
  creado_en: string;
  actualizado_en: string;
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
  /** Evento en el Google Calendar del entrenador (null = sin sincronizar). */
  google_evento_id: string | null;
  /** Último error al sincronizar con Google (null = sin error). */
  google_error: string | null;
  google_pendiente: boolean;
  google_avisar: boolean;
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

/** Ejercicio de una sesión (copiado del plan al agendar, o añadido aparte). */
export type SesionEjercicioFila = {
  id: string;
  sesion_id: string;
  plan_ejercicio_id: string | null;
  ejercicio_id: string;
  orden: number;
  notas: string | null;
};

/** Serie realizada: lo que el alumno hizo de verdad (peso, repeticiones, esfuerzo). */
export type SesionSerieFila = {
  id: string;
  sesion_ejercicio_id: string;
  numero_serie: number;
  peso: number | null;
  unidad_peso: "kg" | "lb";
  repeticiones: number | null;
  duracion_segundos: number | null;
  rpe: number | null;
  rir: number | null;
  completada: boolean;
  notas: string | null;
  creado_en: string;
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
      juntas: Tabla<JuntaFila, Opcional<JuntaFila, "id" | "alumno_id" | "autor_id" | "modelos" | "creado_en">>;
      condiciones_alumno: Tabla<
        CondicionFila,
        Opcional<CondicionFila, "id" | "region_corporal_id" | "articulacion_id" | "severidad" | "estado" | "fecha_inicio" | "fecha_resolucion" | "notas_entrenador" | "creado_en" | "actualizado_en">
      >;
      notas_alumno: Tabla<NotaFila, Opcional<NotaFila, "id" | "creado_en" | "actualizado_en" | "archivado_en">>;
      objetivos_alumno: Tabla<
        ObjetivoFila,
        Opcional<ObjetivoFila, "id" | "descripcion" | "valor_meta" | "unidad" | "es_principal" | "fecha_inicio" | "fecha_meta" | "estado" | "creado_en" | "actualizado_en">
      >;
      perfiles: Tabla<PerfilFila, Opcional<PerfilFila, "nombres" | "apellidos" | "avatar_url" | "telefono" | "creado_en" | "actualizado_en">>;
      organizaciones: Tabla<OrganizacionFila, Opcional<OrganizacionFila, "id" | "zona_horaria" | "estado" | "pagina_publica" | "presentacion" | "titular" | "foto_ruta" | "metodos" | "modalidad" | "ubicacion" | "experiencia_anos" | "certificaciones" | "instagram" | "whatsapp" | "diseno" | "testimonios" | "respuesta_horas" | "oferta_inicial" | "creado_en" | "actualizado_en">>;
      solicitudes: Tabla<
        SolicitudFila,
        Opcional<SolicitudFila, "id" | "apellidos" | "correo" | "telefono" | "objetivo" | "mensaje" | "fecha_nacimiento" | "lesiones" | "estado" | "alumno_id" | "autoriza_datos_en" | "creado_en" | "actualizado_en">
      >;
      miembros_organizacion: Tabla<MiembroFila, Opcional<MiembroFila, "id" | "rol" | "estado" | "creado_en" | "actualizado_en">>;
      conexiones_google: Tabla<
        ConexionGoogleFila,
        Opcional<ConexionGoogleFila, "acceso_cifrado" | "acceso_expira_en" | "calendario_id" | "conectado_en" | "actualizado_en">
      >;
      conexiones_telegram: Tabla<
        ConexionTelegramFila,
        Opcional<ConexionTelegramFila, "chat_id" | "codigo" | "codigo_expira_en" | "vinculado_en" | "ultimo_resumen" | "ultimo_resumen_semanal" | "creado_en" | "actualizado_en">
      >;
      citas: Tabla<
        CitaFila,
        Opcional<CitaFila, "id" | "sesion_id" | "tipo" | "estado" | "notas" | "google_evento_id" | "google_error" | "google_pendiente" | "google_avisar" | "creado_en" | "actualizado_en">
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
      sesion_ejercicios: Tabla<SesionEjercicioFila, Opcional<SesionEjercicioFila, "id" | "plan_ejercicio_id" | "orden" | "notas">>;
      sesion_series: Tabla<
        SesionSerieFila,
        Opcional<SesionSerieFila, "id" | "peso" | "unidad_peso" | "repeticiones" | "duracion_segundos" | "rpe" | "rir" | "completada" | "notas" | "creado_en">
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
      pagina_publica: { Args: { p_slug: string }; Returns: PaginaPublica | null };
      enviar_solicitud: {
        Args: {
          p_slug: string;
          p_tipo: "registro" | "contacto";
          p_nombres: string;
          p_apellidos: string;
          p_correo: string;
          p_telefono: string;
          p_objetivo: string;
          p_mensaje: string;
          p_autoriza: boolean;
          p_fecha_nacimiento: string | null;
          p_lesiones: string;
        };
        Returns: string;
      };
      aceptar_solicitud: { Args: { p_solicitud_id: string }; Returns: string };
      paginas_publicas: { Args: Record<string, never>; Returns: { slug: string; actualizado_en: string }[] };
      preparar_vinculo_telegram: { Args: Record<string, never>; Returns: string };
      desvincular_telegram: { Args: Record<string, never>; Returns: undefined };
      probar_telegram: { Args: Record<string, never>; Returns: boolean };
      telegram_procesar: { Args: { p_secreto: string; p_update: Json }; Returns: string };
      reemplazar_relaciones_ejercicio: {
        Args: { p_ejercicio_id: string; p_musculos: { id: string; rol: string }[]; p_equipos: string[] };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
