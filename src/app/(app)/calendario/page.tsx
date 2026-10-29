import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { googleConfigurado } from "@/lib/google/calendario";
import { diasDeSesiones, planesActivos } from "@/lib/entrenamiento/planes";
import {
  aInstante,
  diasDeSemana,
  etiquetaSemana,
  fechaOHoy,
  hoyLocal,
  inicioSemana,
  sumarDias,
} from "@/lib/calendario";
import { CalendarioSemana, type CitaVista } from "./semana";
import { RutinasSemana } from "./rutinas-semana";

export const metadata: Metadata = { title: "Calendario" };

export default function PaginaCalendario({ searchParams }: PageProps<"/calendario">) {
  return (
    <>
      <Encabezado titulo="Calendario" miga="Gestión" />
      <Suspense fallback={<Esqueleto className="h-[40rem] w-full" />}>
        <Agenda searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Agenda({ searchParams }: { searchParams: PageProps<"/calendario">["searchParams"] }) {
  const parametros = await searchParams;
  const { supabase, usuarioId } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const hoy = hoyLocal();
  const lunes = inicioSemana(fechaOHoy(parametros.semana));
  const dias = diasDeSemana(lunes);
  const alumnoInicial = typeof parametros.alumno === "string" ? parametros.alumno : undefined;
  // ?nueva=1 (desde el panel): abre el formulario de cita vacío.
  const abrirNueva = parametros.nueva === "1";

  const [{ data: citas, error }, { data: activosBd }, { data: conexion }] = await Promise.all([
    supabase
      .from("citas")
      .select("id, alumno_id, entrenador_id, sesion_id, tipo, estado, notas, inicia_en, termina_en, google_evento_id, google_error")
      .gte("inicia_en", aInstante(lunes, "00:00"))
      .lt("inicia_en", aInstante(sumarDias(lunes, 7), "00:00"))
      .not("estado", "in", "(cancelada,reprogramada)")
      .order("inicia_en"),
    // Para agendar: solo activos. El correo no viaja a la página; solo si lo tiene (para la invitación de Google).
    supabase.from("alumnos").select("id, nombres, apellidos, correo").eq("estado", "activo").order("nombres").order("apellidos").limit(1000),
    supabase.from("conexiones_google").select("correo_google").eq("usuario_id", usuarioId).maybeSingle(),
  ]);
  const google = googleConfigurado() && Boolean(conexion);

  // Nombres de las citas de la semana (pueden ser de alumnos ya inactivos o archivados).
  const idsActivos = new Set((activosBd ?? []).map((a) => a.id));
  const otrosIds = [...new Set((citas ?? []).map((c) => c.alumno_id).filter((id) => !idsActivos.has(id)))];
  const [{ data: otros }, planes, rutinaDe] = await Promise.all([
    otrosIds.length
      ? supabase.from("alumnos").select("id, nombres, apellidos").in("id", otrosIds)
      : Promise.resolve({ data: [] as { id: string; nombres: string; apellidos: string }[] }),
    planesActivos(supabase),
    diasDeSesiones(supabase, (citas ?? []).flatMap((c) => (c.sesion_id ? [c.sesion_id] : []))),
  ]);

  const nombres = new Map([...(activosBd ?? []), ...(otros ?? [])].map((a) => [a.id, `${a.nombres} ${a.apellidos}`]));
  const vista: CitaVista[] = (citas ?? []).map((c) => ({
    id: c.id,
    alumnoId: c.alumno_id,
    alumno: nombres.get(c.alumno_id) ?? "Alumno",
    tipo: c.tipo,
    estado: c.estado,
    notas: c.notas,
    iniciaEn: c.inicia_en,
    terminaEn: c.termina_en,
    rutina: c.sesion_id ? (rutinaDe.get(c.sesion_id) ?? null) : null,
    sesionId: c.sesion_id,
    plan: planes.get(c.alumno_id) ?? null,
    // El estado de Google solo tiene sentido en las citas propias (van a mi calendario).
    google: !google || c.entrenador_id !== usuarioId ? null : c.google_error ? "error" : c.google_evento_id ? "sincronizada" : "pendiente",
    googleError: c.google_error,
  }));
  const activos = (activosBd ?? []).map((a) => ({
    id: a.id,
    nombre: `${a.nombres} ${a.apellidos}`,
    plan: planes.get(a.id) ?? null,
    tieneCorreo: Boolean(a.correo?.trim()),
  }));

  const enCurso = dias.includes(hoy);
  const pendientes = vista.filter((c) => c.estado === "programada" || c.estado === "confirmada").length;

  const barra = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <nav aria-label="Semanas" className="flex items-center gap-1">
        <EnlaceBoton href={`/calendario?semana=${sumarDias(lunes, -7)}`} variante="secundario" className="w-9 px-0!" aria-label="Semana anterior">
          <ArrowLeft aria-hidden className="size-4" />
        </EnlaceBoton>
        <EnlaceBoton href="/calendario" variante={enCurso ? "fantasma" : "secundario"} aria-current={enCurso ? "date" : undefined}>
          Hoy
        </EnlaceBoton>
        <EnlaceBoton href={`/calendario?semana=${sumarDias(lunes, 7)}`} variante="secundario" className="w-9 px-0!" aria-label="Semana siguiente">
          <ArrowRight aria-hidden className="size-4" />
        </EnlaceBoton>
      </nav>
      <h2 className="titulo-display text-[1.375rem] leading-[1.25]">{etiquetaSemana(lunes)}</h2>
      <p className="text-sm text-tenue">
        {vista.length === 0
          ? "Semana libre"
          : `${vista.length} ${vista.length === 1 ? "cita" : "citas"}${pendientes ? `, ${pendientes} por atender` : ""}`}
      </p>
    </div>
  );

  if (error) return <p className="text-peligro">No se pudieron cargar las citas. Recarga la página.</p>;
  return (
    <CalendarioSemana
      barra={barra}
      resumen={<RutinasSemana citas={vista} dias={dias} />}
      dias={dias}
      hoy={hoy}
      citas={vista}
      alumnos={activos}
      alumnoInicial={alumnoInicial}
      abrirNueva={abrirNueva}
      googleConectado={google}
    />
  );
}
