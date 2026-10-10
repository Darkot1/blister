import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
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
  const { supabase } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const hoy = hoyLocal();
  const lunes = inicioSemana(fechaOHoy(parametros.semana));
  const dias = diasDeSemana(lunes);
  const alumnoInicial = typeof parametros.alumno === "string" ? parametros.alumno : undefined;

  const [{ data: citas, error }, { data: alumnos }] = await Promise.all([
    supabase
      .from("citas")
      .select("id, alumno_id, sesion_id, tipo, estado, notas, inicia_en, termina_en")
      .gte("inicia_en", aInstante(lunes, "00:00"))
      .lt("inicia_en", aInstante(sumarDias(lunes, 7), "00:00"))
      .not("estado", "in", "(cancelada,reprogramada)")
      .order("inicia_en"),
    supabase.from("alumnos").select("id, nombres, apellidos, estado").order("nombres").order("apellidos").limit(500),
  ]);

  const [planes, rutinaDe] = await Promise.all([
    planesActivos(supabase),
    diasDeSesiones(supabase, (citas ?? []).flatMap((c) => (c.sesion_id ? [c.sesion_id] : []))),
  ]);

  const nombres = new Map((alumnos ?? []).map((a) => [a.id, `${a.nombres} ${a.apellidos}`]));
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
    plan: planes.get(c.alumno_id) ?? null,
  }));
  const activos = (alumnos ?? [])
    .filter((a) => a.estado === "activo")
    .map((a) => ({ id: a.id, nombre: `${a.nombres} ${a.apellidos}`, plan: planes.get(a.id) ?? null }));

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
      <h2 className="text-lg font-semibold tracking-tight">{etiquetaSemana(lunes)}</h2>
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
    />
  );
}
