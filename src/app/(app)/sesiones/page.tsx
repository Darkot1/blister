import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, ChevronRight, ClipboardList, ListChecks, Search } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { Aparece } from "@/components/ui/movimiento";
import { Paginacion, conParametros, leerPagina } from "@/components/ui/paginacion";
import { CabeceraTarjeta, Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { planesActivos, type PlanActivo } from "@/lib/entrenamiento/planes";
import { listarSesiones, type FilaSesion } from "@/lib/entrenamiento/sesiones";
import { etiquetaDiaLarga, partesLocales } from "@/lib/calendario";
import { hora, numero } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { DiasRutina } from "./empezar";

export const metadata: Metadata = { title: "Sesiones" };

const FILTROS = [
  { valor: "", texto: "Todas", estados: null },
  { valor: "en_curso", texto: "En curso", estados: ["en_curso"] },
  { valor: "programada", texto: "Por empezar", estados: ["programada"] },
  { valor: "completada", texto: "Completadas", estados: ["completada"] },
] as const;

const ESTADO: Record<string, { texto: string; punto: string }> = {
  programada: { texto: "Por empezar", punto: "bg-tenue/60" },
  en_curso: { texto: "En curso", punto: "bg-acento" },
  completada: { texto: "Completada", punto: "bg-exito" },
  cancelada: { texto: "Cancelada", punto: "bg-tenue/60" },
  omitida: { texto: "No asistió", punto: "bg-aviso" },
};

const POR_PAGINA = 25;
/** Sesiones que muestra cada alumno en la vista general; el resto, en su historial. */
const RECIENTES = 4;

/** Sin tildes ni mayúsculas: "jose" encuentra a "José". */
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Buscador de la página: va en el encabezado para que se vea siempre, en la vista general y en la de un alumno. */
function Buscador({ q, alumnoId, estado, marcador }: { q: string; alumnoId?: string; estado?: string; marcador: string }) {
  return (
    <Form action="/sesiones" className="relative w-full sm:w-72" role="search">
      {alumnoId && <input type="hidden" name="alumno" value={alumnoId} />}
      {estado && <input type="hidden" name="estado" value={estado} />}
      <label>
        <span className="sr-only">{marcador}</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
        <input name="q" type="search" defaultValue={q} placeholder={marcador} className={`${claseControl} pl-9`} />
      </label>
    </Form>
  );
}

const esId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export default function PaginaSesiones({ searchParams }: PageProps<"/sesiones">) {
  return (
    <Suspense fallback={<EsqueletoLista filas={8} />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/sesiones">["searchParams"] }) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const { supabase } = await obtenerContexto();
  const [sesiones, planes, { data: activos }] = await Promise.all([
    listarSesiones(supabase),
    planesActivos(supabase),
    supabase.from("alumnos").select("id, nombres, apellidos").eq("estado", "activo"),
  ]);

  // Alumnos con algo que mostrar: un plan activo (para empezar sesiones) o sesiones registradas.
  const alumnos = new Map((activos ?? []).filter((a) => planes.has(a.id)).map((a) => [a.id, a]));
  for (const s of sesiones) if (s.alumno && !alumnos.has(s.alumnoId)) alumnos.set(s.alumnoId, s.alumno);
  const sesionesDe = Map.groupBy(sesiones, (s) => s.alumnoId);

  if (esId(parametros.alumno)) {
    const alumno = alumnos.get(parametros.alumno);
    if (!alumno) notFound();
    return (
      <HistorialAlumno
        alumno={alumno}
        plan={planes.get(alumno.id) ?? null}
        sesiones={sesionesDe.get(alumno.id) ?? []}
        estado={parametros.estado}
        pagina={parametros.pagina}
        q={q}
      />
    );
  }

  // Primero quien tiene una sesión en curso, luego por su sesión más reciente, y al final los que aún no tienen.
  const enCurso = (id: string) => (sesionesDe.get(id) ?? []).some((s) => s.estado === "en_curso");
  const ultima = (id: string) => sesionesDe.get(id)?.[0]?.fecha ?? "";
  const orden = [...alumnos.values()].sort(
    (a, b) =>
      Number(enCurso(b.id)) - Number(enCurso(a.id)) ||
      ultima(b.id).localeCompare(ultima(a.id)) ||
      `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, "es"),
  );
  // Buscar por nombre del alumno o de su rutina.
  const visibles = q
    ? orden.filter((a) => normalizar(`${a.nombres} ${a.apellidos} ${planes.get(a.id)?.nombre ?? ""}`).includes(normalizar(q)))
    : orden;

  return (
    <>
      <Encabezado
        titulo="Sesiones"
        miga="Entrenamiento"
        descripcion="Por alumno: empieza una sesión de su rutina cuando quieras, sin agendarla, o retoma las que ya tiene."
        acciones={orden.length > 0 && <Buscador q={q} marcador="Buscar alumno o rutina" />}
      />
      {!orden.length ? (
        <Vacio
          icono={<ClipboardList aria-hidden className="size-5" />}
          titulo="Aún no hay sesiones"
          texto="Asigna una rutina a un alumno para empezar sus sesiones desde aquí, o agenda una cita de entrenamiento en el calendario."
          accion={<EnlaceBoton href="/entrenamiento" variante="secundario">Ir a rutinas</EnlaceBoton>}
        />
      ) : (
        <>
          {q && (
            <p className="mb-4 tabular-nums text-sm text-tenue" role="status">
              {visibles.length} de {orden.length} alumnos para «{q}» ·{" "}
              <Link href="/sesiones" className="font-medium text-tinta underline underline-offset-2 hover:no-underline">
                Quitar búsqueda
              </Link>
            </p>
          )}
          {visibles.length ? (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {visibles.map((a, i) => (
                <Aparece key={a.id} retraso={Math.min(i, 8) * 0.05}>
                  <TarjetaAlumno alumno={a} plan={planes.get(a.id) ?? null} sesiones={sesionesDe.get(a.id) ?? []} />
                </Aparece>
              ))}
            </div>
          ) : (
            <Vacio
              icono={<Search aria-hidden className="size-5" />}
              titulo="Nadie coincide con la búsqueda"
              texto="Prueba con otro nombre o con el nombre de la rutina."
              accion={<EnlaceBoton href="/sesiones" variante="secundario">Ver todos</EnlaceBoton>}
            />
          )}
        </>
      )}
    </>
  );
}

type Alumno = { id: string; nombres: string; apellidos: string };

/** Un alumno en la vista general: su rutina para empezar ya y sus sesiones más recientes. */
function TarjetaAlumno({ alumno, plan, sesiones }: { alumno: Alumno; plan: PlanActivo | null; sesiones: FilaSesion[] }) {
  const nombre = `${alumno.nombres} ${alumno.apellidos}`;
  // Las en curso, arriba aunque no sean las más recientes.
  const recientes = [...sesiones.filter((s) => s.estado === "en_curso"), ...sesiones.filter((s) => s.estado !== "en_curso")].slice(0, RECIENTES);
  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby={`alumno-${alumno.id}`}>
        <div className="flex items-center gap-3 border-b border-linea px-4 py-3 sm:px-5">
          <Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} />
          <div className="min-w-0 flex-1">
            <h2 id={`alumno-${alumno.id}`} className="truncate font-semibold">
              <Link href={`/sesiones?alumno=${alumno.id}`} className="hover:underline">
                {nombre}
              </Link>
            </h2>
            <p className="truncate text-xs text-tenue">
              {plan ? (
                <>
                  Rutina:{" "}
                  <Link href={`/entrenamiento/planes/${plan.id}`} className="underline underline-offset-2 hover:text-tinta">
                    {plan.nombre}
                  </Link>
                </>
              ) : (
                "Sin rutina activa"
              )}
            </p>
          </div>
        </div>
        <Rutina alumnoId={alumno.id} plan={plan} />
        <ListaSesiones sesiones={recientes} />
        {sesiones.length > 0 && (
          <Link
            href={`/sesiones?alumno=${alumno.id}`}
            className="flex items-center justify-between border-t border-linea px-4 py-2.5 text-sm font-medium text-grafito transition-colors hover:bg-hueso/40 hover:text-tinta sm:px-5"
          >
            {sesiones.length > RECIENTES ? `Ver las ${sesiones.length} sesiones` : "Ver historial"}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </section>
    </Tarjeta>
  );
}

/** Días de la rutina activa, listos para empezar; sin rutina, cómo conseguir una. */
function Rutina({ alumnoId, plan }: { alumnoId: string; plan: PlanActivo | null }) {
  return (
    <div className="border-b border-linea px-4 py-3 sm:px-5">
      <p className="etiqueta mb-2">Empezar ahora</p>
      {plan?.dias.length ? (
        <DiasRutina dias={plan.dias} siguienteId={plan.siguienteDiaId} />
      ) : (
        <p className="text-sm text-tenue">
          {plan ? "Su rutina no tiene días todavía." : "Asígnale una rutina para empezar sesiones sin agendarlas."}{" "}
          <Link href={plan ? `/entrenamiento/planes/${plan.id}` : `/alumnos/${alumnoId}`} className="inline-flex items-center gap-1 font-medium text-tinta underline underline-offset-2 hover:no-underline">
            <ListChecks aria-hidden className="size-3.5" /> {plan ? "Abrir rutina" : "Asignar rutina"}
          </Link>
        </p>
      )}
    </div>
  );
}

function ListaSesiones({ sesiones, vacio = "Sin sesiones todavía." }: { sesiones: FilaSesion[]; vacio?: string }) {
  if (!sesiones.length) return <p className="px-4 py-4 text-sm text-tenue sm:px-5">{vacio}</p>;
  return (
    <ul className="divide-y divide-linea">
      {sesiones.map((s) => {
        const estado = ESTADO[s.estado] ?? { texto: s.estado, punto: "bg-tenue/60" };
        return (
          <li key={s.id}>
            <Link
              href={`/sesiones/${s.id}`}
              className={`grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-hueso/40 sm:px-5 ${
                s.estado === "en_curso" ? "bg-acento/[0.05]" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{s.dia ?? "Sesión libre"}</span>
                <span className="block truncate tabular-nums text-xs text-tenue">
                  {s.fecha ? `${etiquetaDiaLarga(partesLocales(s.fecha).fecha)}, ${hora(s.fecha)}` : "Sin fecha"}
                  {s.rpe !== null && ` · RPE ${numero(s.rpe)}`}
                </span>
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-hueso px-2.5 text-xs font-medium">
                <span aria-hidden className={`size-1.5 rounded-full ${estado.punto}`} />
                {s.estado === "en_curso" ? "Continuar" : estado.texto}
              </span>
              <ChevronRight aria-hidden className="size-4 text-tinta/25" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Todas las sesiones de un alumno, filtrables por estado, con su rutina arriba. */
function HistorialAlumno({
  alumno,
  plan,
  sesiones,
  estado,
  pagina: paginaParametro,
  q,
}: {
  alumno: Alumno;
  plan: PlanActivo | null;
  sesiones: FilaSesion[];
  estado: string | string[] | undefined;
  pagina: string | string[] | undefined;
  /** Busca por el día de la rutina o la fecha ("pierna", "15 de octubre"). */
  q: string;
}) {
  const elegido = FILTROS.find((f) => f.valor === estado) ?? FILTROS[0];
  const cumple = (f: (typeof FILTROS)[number], e: string) => !f.estados || (f.estados as readonly string[]).includes(e);
  const coincide = (s: FilaSesion) =>
    !q || normalizar(`${s.dia ?? "Sesión libre"} ${s.fecha ? etiquetaDiaLarga(partesLocales(s.fecha).fecha) : ""}`).includes(normalizar(q));
  const filtradas = sesiones.filter((s) => cumple(elegido, s.estado) && coincide(s));
  const pagina = leerPagina(paginaParametro, filtradas.length, POR_PAGINA);
  const url = (cambios: { estado?: string; pagina?: number }) =>
    conParametros("/sesiones", { alumno: alumno.id, q, estado: cambios.estado ?? elegido.valor, pagina: cambios.pagina ?? 1 });

  return (
    <>
      <Encabezado
        volver={{ href: "/sesiones", texto: "Todos los alumnos" }}
        titulo={`${alumno.nombres} ${alumno.apellidos}`}
        figura={<Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="xl" />}
        descripcion={plan ? `Rutina activa: ${plan.nombre}` : "Sin rutina activa"}
        acciones={
          <>
            <Buscador q={q} alumnoId={alumno.id} estado={elegido.valor || undefined} marcador="Buscar por día o fecha" />
            <EnlaceBoton href={`/progreso?alumno=${alumno.id}`} variante="secundario">
              Ver progreso
            </EnlaceBoton>
          </>
        }
      />
      <Aparece className="mb-4">
        <Tarjeta className="overflow-hidden">
          <Rutina alumnoId={alumno.id} plan={plan} />
        </Tarjeta>
      </Aparece>

      <nav aria-label="Filtrar por estado" className={`${claseSegmentado} mb-4 max-w-full overflow-x-auto`}>
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={url({ estado: f.valor })}
            scroll={false}
            aria-current={f === elegido ? "true" : undefined}
            className={`${claseSegmento(f === elegido)} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
          >
            {f.texto}
            <span className="tabular-nums text-xs text-tenue">{sesiones.filter((s) => cumple(f, s.estado) && coincide(s)).length}</span>
          </Link>
        ))}
      </nav>

      <Aparece retraso={0.1}>
        <Tarjeta className="overflow-hidden">
          <CabeceraTarjeta titulo="Sesiones" accion={<span className="tabular-nums text-xs text-tenue">{filtradas.length}</span>} />
          <ListaSesiones
            sesiones={filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)}
            vacio={q ? `Ninguna sesión coincide con «${q}».` : "Sin sesiones en este estado."}
          />
          <Paginacion pagina={pagina} total={filtradas.length} porPagina={POR_PAGINA} href={(n) => url({ pagina: n })} />
        </Tarjeta>
      </Aparece>
    </>
  );
}
