import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Aviso } from "@/components/ui/aviso";
import { Grupo, Pila } from "@/components/ui/disposicion";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
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

export const metadata: Metadata = { title: "Calendario" };

export default function PaginaCalendario({ searchParams }: PageProps<"/calendario">) {
  return (
    <>
      <Encabezado titulo="Calendario" />
      <Suspense fallback={<Cargando />}>
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
      .select("id, alumno_id, tipo, estado, notas, inicia_en, termina_en")
      .gte("inicia_en", aInstante(lunes, "00:00"))
      .lt("inicia_en", aInstante(sumarDias(lunes, 7), "00:00"))
      .not("estado", "in", "(cancelada,reprogramada)")
      .order("inicia_en"),
    supabase.from("alumnos").select("id, nombres, apellidos, estado").order("nombres").order("apellidos").limit(500),
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
  }));
  const activos = (alumnos ?? [])
    .filter((a) => a.estado === "activo")
    .map((a) => ({ id: a.id, nombre: `${a.nombres} ${a.apellidos}` }));

  if (error) return <Aviso>No se pudieron cargar las citas. Recarga la página.</Aviso>;
  return (
    <CalendarioSemana
      navegacion={{
        rango: etiquetaSemana(lunes),
        anterior: `/calendario?semana=${sumarDias(lunes, -7)}`,
        siguiente: `/calendario?semana=${sumarDias(lunes, 7)}`,
        enCurso: dias.includes(hoy),
      }}
      dias={dias}
      hoy={hoy}
      citas={vista}
      alumnos={activos}
      alumnoInicial={alumnoInicial}
    />
  );
}

/** Forma aproximada de la barra y la agenda mientras cargan las citas. */
function Cargando() {
  return (
    <Pila espacio={5} role="status" aria-label="Cargando calendario">
      <Grupo espacio={3}>
        <Esqueleto alto="var(--alto-control)" ancho="calc(var(--alto-control) * 3.5)" />
        <Esqueleto alto="var(--texto-2xl)" ancho="12rem" />
      </Grupo>
      <Esqueleto alto="40rem" ancho="100%" />
    </Pila>
  );
}
