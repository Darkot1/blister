import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { aInstante, etiquetaDiaLarga, hoyLocal, partesLocales, sumarDias } from "@/lib/calendario";
import { ETIQUETA_ESTADO_CITA, ETIQUETA_TIPO_CITA, fechaCorta, hora } from "@/lib/formato";

export const metadata: Metadata = { title: "Inicio" };

export default function PaginaInicio() {
  return (
    <>
      <Encabezado
        titulo="Inicio"
        acciones={
          <>
            <EnlaceBoton href="/calendario" variante="secundario"><CalendarPlus aria-hidden className="size-4" /> Agendar</EnlaceBoton>
            <EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo alumno</EnlaceBoton>
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" role="status" aria-label="Cargando">
      <Esqueleto className="h-64 w-full" />
      <Esqueleto className="h-64 w-full" />
    </div>
  );
}

type Cita = { id: string; alumno_id: string; tipo: string; estado: string; inicia_en: string; termina_en: string };

async function Resumen() {
  const { supabase } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const hoy = hoyLocal();
  const [{ count: activos }, { data: recientes }, { data: citas }, { data: alumnos }] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("alumnos").select("id, nombres, apellidos, creado_en").neq("estado", "archivado")
      .order("creado_en", { ascending: false }).limit(5),
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
  const deHoy = (citas ?? []).filter((c) => partesLocales(c.inicia_en).fecha === hoy);
  const proximas = (citas ?? []).filter((c) => partesLocales(c.inicia_en).fecha !== hoy).slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-labelledby="titulo-hoy" className="rounded-lg border border-linea bg-superficie px-6 py-5 lg:row-span-2">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="titulo-hoy" className="font-titulo text-2xl font-semibold">Hoy</h2>
          <span className="text-sm text-tenue">{etiquetaDiaLarga(hoy)}</span>
        </div>
        {deHoy.length ? (
          <ol className="divide-y divide-linea">
            {deHoy.map((c) => <FilaCita key={c.id} cita={c} alumno={nombre.get(c.alumno_id)} />)}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed border-linea px-5 py-8 text-center">
            <p className="font-semibold">Sin citas para hoy</p>
            <p className="mt-1 text-sm text-tenue">
              Buen momento para revisar planes o <Link href="/calendario" className="font-semibold text-acento hover:underline">agendar la semana</Link>.
            </p>
          </div>
        )}

        <h2 className="mt-8 mb-2 font-titulo text-xl font-semibold">Próximos días</h2>
        {proximas.length ? (
          <ol className="divide-y divide-linea">
            {proximas.map((c) => <FilaCita key={c.id} cita={c} alumno={nombre.get(c.alumno_id)} conFecha />)}
          </ol>
        ) : (
          <p className="text-sm text-tenue">Nada agendado en la próxima semana.</p>
        )}
      </section>

      <Link href="/alumnos" className="rounded-lg border border-linea bg-superficie px-6 py-5 hover:border-tinta/30">
        <p className="text-sm text-tenue">Alumnos activos</p>
        <p className="cifra mt-1 text-7xl leading-none font-semibold">{activos ?? 0}</p>
      </Link>

      <section className="rounded-lg border border-linea bg-superficie px-6 py-5" aria-labelledby="titulo-recientes">
        <h2 id="titulo-recientes" className="mb-3 font-titulo text-xl font-semibold">Registrados recientemente</h2>
        {recientes?.length ? (
          <ul className="divide-y divide-linea">
            {recientes.map((a) => (
              <li key={a.id}>
                <Link href={`/alumnos/${a.id}`} className="flex items-center justify-between gap-4 py-2.5 hover:text-acento">
                  <span className="truncate font-medium">{a.nombres} {a.apellidos}</span>
                  <span className="shrink-0 text-sm text-tenue">{fechaCorta(a.creado_en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-tenue">Cuando registres alumnos aparecerán aquí.</p>
        )}
      </section>
    </div>
  );
}

function FilaCita({ cita, alumno, conFecha = false }: { cita: Cita; alumno?: string; conFecha?: boolean }) {
  const fecha = partesLocales(cita.inicia_en).fecha;
  const tachada = cita.estado === "no_asistio";
  return (
    <li>
      <Link
        href={`/calendario?semana=${fecha}`}
        className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5 hover:text-acento"
      >
        <span className="cifra text-lg">{conFecha ? fechaCorta(fecha).replace(/ \d{4}$/, "") : hora(cita.inicia_en)}</span>
        <span className={`min-w-0 truncate ${tachada ? "text-tenue line-through" : "font-medium"}`}>
          {alumno ?? "Alumno"}
          <span className="ml-2 text-sm font-normal text-tenue">
            {conFecha ? `${hora(cita.inicia_en)}, ` : ""}{ETIQUETA_TIPO_CITA[cita.tipo] ?? cita.tipo}
          </span>
        </span>
        <span className={`text-sm ${cita.estado === "completada" ? "text-exito" : "text-tenue"}`}>
          {ETIQUETA_ESTADO_CITA[cita.estado] ?? cita.estado}
        </span>
      </Link>
    </li>
  );
}
