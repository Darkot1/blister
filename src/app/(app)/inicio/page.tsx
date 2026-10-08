import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Pila, Rejilla } from "@/components/ui/disposicion";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { aInstante, hoyLocal, partesLocales, sumarDias } from "@/lib/calendario";
import { Tablero, type CitaInicio } from "./tablero";

export const metadata: Metadata = { title: "Inicio" };

export default function PaginaInicio() {
  return (
    <>
      <Encabezado
        titulo="Inicio"
        acciones={
          <>
            <EnlaceBoton href="/calendario" variante="secundario">
              <CalendarPlus aria-hidden /> Agendar
            </EnlaceBoton>
            <EnlaceBoton href="/alumnos/nuevo">
              <Plus aria-hidden /> Nuevo alumno
            </EnlaceBoton>
          </>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Resumen />
      </Suspense>
    </>
  );
}

function Cargando() {
  return (
    <Rejilla columnas="principal" espacio={6} role="status" aria-label="Cargando">
      <Pila espacio={4}>
        <Esqueleto alto="var(--texto-2xl)" ancho="6rem" />
        <EsqueletoLista filas={4} />
      </Pila>
      <Pila espacio={6}>
        <Esqueleto alto="9rem" ancho="100%" />
        <EsqueletoLista filas={3} conAvatar />
      </Pila>
    </Rejilla>
  );
}

/** Milisegundos actuales; solo después de un acceso dinámico. */
const instanteActual = () => Date.now();

async function Resumen() {
  const { supabase } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const hoy = hoyLocal();
  const ahora = instanteActual();
  const [{ count: activos }, { data: recientes }, { data: citas, error }, { data: alumnos }] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase
      .from("alumnos")
      .select("id, nombres, apellidos, creado_en")
      .neq("estado", "archivado")
      .order("creado_en", { ascending: false })
      .limit(5),
    supabase
      .from("citas")
      .select("id, alumno_id, tipo, estado, inicia_en, termina_en")
      .gte("inicia_en", aInstante(hoy, "00:00"))
      .lt("inicia_en", aInstante(sumarDias(hoy, 8), "00:00"))
      .not("estado", "in", "(cancelada,reprogramada)")
      .order("inicia_en")
      .limit(50),
    supabase.from("alumnos").select("id, nombres, apellidos"),
  ]);

  const nombre = new Map((alumnos ?? []).map((a) => [a.id, `${a.nombres} ${a.apellidos}`]));
  const vista: CitaInicio[] = (citas ?? []).map((c) => ({
    id: c.id,
    alumno: nombre.get(c.alumno_id) ?? "Alumno",
    tipo: c.tipo,
    estado: c.estado,
    iniciaEn: c.inicia_en,
    terminaEn: c.termina_en,
  }));
  const esDeHoy = (c: CitaInicio) => partesLocales(c.iniciaEn).fecha === hoy;

  return (
    <Tablero
      hoy={hoy}
      ahora={ahora}
      citasHoy={vista.filter(esDeHoy)}
      proximas={vista.filter((c) => !esDeHoy(c)).slice(0, 6)}
      errorCitas={Boolean(error)}
      activos={activos ?? 0}
      recientes={(recientes ?? []).map((a) => ({
        id: a.id,
        nombres: a.nombres,
        apellidos: a.apellidos,
        creadoEn: a.creado_en,
      }))}
    />
  );
}
