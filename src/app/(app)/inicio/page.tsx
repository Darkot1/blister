import type { Metadata } from "next";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto, obtenerPerfil } from "@/lib/sesion";
import {
  aInstante,
  diasDeSemana,
  etiquetaDia,
  hoyLocal,
  inicioSemana,
  partesLocales,
  sumarDias,
} from "@/lib/calendario";
import { VistaPanel } from "./vista";

export const metadata: Metadata = { title: "Panel" };

export default function PaginaInicio() {
  return (
    <Suspense fallback={<Cargando />}>
      <Panel />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando">
      <Esqueleto className="mb-6 h-14 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Esqueleto className="col-span-2 h-[22rem] lg:row-span-2" />
        <Esqueleto className="h-40" />
        <Esqueleto className="h-40" />
        <Esqueleto className="col-span-2 h-44" />
      </div>
    </div>
  );
}

function saludo(minutos: number) {
  if (minutos < 12 * 60) return "Buenos días";
  if (minutos < 19 * 60) return "Buenas tardes";
  return "Buenas noches";
}

const PENDIENTES = ["programada", "confirmada"];

async function Panel() {
  const { supabase } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const ahora = partesLocales(new Date().toISOString());
  const hoy = hoyLocal();
  const lunes = inicioSemana(hoy);
  const fin = sumarDias(hoy, 8);

  const [perfil, { count: activos }, { count: inactivos }, { count: porAtender }, { data: recientes }, { data: citas }, { data: alumnos }] =
    await Promise.all([
      obtenerPerfil(),
      supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
      supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "inactivo"),
      // Conteo aparte: la lista de citas de abajo está limitada y no sirve para contar.
      supabase
        .from("citas")
        .select("id", { count: "exact", head: true })
        .gte("inicia_en", aInstante(hoy, "00:00"))
        .lt("inicia_en", aInstante(fin, "00:00"))
        .in("estado", PENDIENTES),
      supabase.from("alumnos").select("id, nombres, apellidos, creado_en").neq("estado", "archivado")
        .order("creado_en", { ascending: false }).limit(5),
      // Desde el lunes (para la gráfica de la semana) hasta dentro de 8 días (próximas citas).
      supabase
        .from("citas")
        .select("id, alumno_id, tipo, estado, inicia_en")
        .gte("inicia_en", aInstante(lunes, "00:00"))
        .lt("inicia_en", aInstante(fin, "00:00"))
        .not("estado", "in", "(cancelada,reprogramada)")
        .order("inicia_en")
        .limit(300),
      supabase.from("alumnos").select("id, nombres, apellidos"),
    ]);

  const nombre = new Map((alumnos ?? []).map((a) => [a.id, `${a.nombres} ${a.apellidos}`]));
  const conFecha = (citas ?? []).map((c) => ({ ...c, ...partesLocales(c.inicia_en) }));
  const deHoy = conFecha.filter((c) => c.fecha === hoy);
  const proximas = conFecha.filter((c) => c.fecha > hoy);
  const siguiente = deHoy.find((c) => c.minutos >= ahora.minutos && PENDIENTES.includes(c.estado));
  const semana = diasDeSemana(lunes).map((fecha) => ({
    fecha,
    etiqueta: etiquetaDia(fecha),
    valor: conFecha.filter((c) => c.fecha === fecha).length,
  }));

  return (
    <VistaPanel
      hoy={hoy}
      titulo={`${saludo(ahora.minutos)}${perfil?.nombres ? `, ${perfil.nombres.split(" ")[0]}` : ""}`}
      deHoy={deHoy}
      siguienteId={siguiente?.id}
      nombre={nombre}
      semana={semana}
      proximas={proximas}
      recientes={recientes ?? []}
      activos={activos ?? 0}
      inactivos={inactivos ?? 0}
      porAtender={porAtender ?? 0}
    />
  );
}
