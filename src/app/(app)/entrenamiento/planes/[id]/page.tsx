import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Archive, CheckCheck, Play } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Aviso } from "@/components/ui/aviso";
import { Avatar } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { conParametros } from "@/components/ui/paginacion";
import { cargarPlan } from "@/lib/entrenamiento/cargar";
import { ETIQUETA_TIPO_OBJETIVO, fechaCorta } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { cambiarEstadoPlan } from "../../acciones";
import { HojaDia, InsigniaPlan, PorDondeVa, resumenDia } from "../../componentes";

export const metadata: Metadata = { title: "Plan" };

/** Sesiones que marcan por dónde va el alumno (las canceladas no cuentan). */
const ESTADOS_QUE_CUENTAN = ["programada", "en_curso", "completada"];

export default function PaginaPlan({ params, searchParams }: PageProps<"/entrenamiento/planes/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Esqueleto className="h-28" />
            <Esqueleto className="h-28" />
            <Esqueleto className="h-28" />
          </div>
          <Esqueleto className="h-96" />
        </>
      }
    >
      <Plan params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Plan({
  params,
  searchParams,
}: {
  params: PageProps<"/entrenamiento/planes/[id]">["params"];
  searchParams: PageProps<"/entrenamiento/planes/[id]">["searchParams"];
}) {
  const [{ id }, { aviso, dia: diaPedido }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const plan = await cargarPlan(supabase, id);
  if (!plan) notFound();
  const ahora = new Date().toISOString();

  const ejercicioIds = [...new Set(plan.dias.flatMap((d) => d.bloques.flatMap((b) => b.ejercicios.map((e) => e.ejercicio_id))))];
  const [{ data: alumno }, { data: ejercicios }, { data: origen }, { data: sesiones }, { data: citas }] = await Promise.all([
    supabase.from("alumnos").select("id, nombres, apellidos").eq("id", plan.alumno_id).maybeSingle(),
    ejercicioIds.length ? supabase.from("ejercicios").select("id, nombre").in("id", ejercicioIds) : Promise.resolve({ data: [] }),
    plan.plantilla_origen_id
      ? supabase.from("plantillas").select("id, nombre").eq("id", plan.plantilla_origen_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("sesiones")
      .select("id, plan_dia_id, estado, programada_para, completada_en")
      .eq("plan_id", id)
      .in("estado", ESTADOS_QUE_CUENTAN)
      .order("programada_para", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("citas")
      .select("id, inicia_en, sesion_id")
      .eq("alumno_id", plan.alumno_id)
      .eq("tipo", "entrenamiento")
      .in("estado", ["programada", "confirmada"])
      .gte("inicia_en", ahora)
      .order("inicia_en")
      .limit(1),
  ]);
  const nombreDe = new Map((ejercicios ?? []).map((e) => [e.id, e.nombre]));
  const nombreAlumno = alumno ? `${alumno.nombres} ${alumno.apellidos}` : "Alumno";
  const quien = alumno?.nombres ?? "el alumno";

  // Por dónde va: el día siguiente al de la última sesión agendada o hecha (o el primero).
  const indiceDe = new Map(plan.dias.map((d, i) => [d.id, i]));
  const ultima = (sesiones ?? []).find((s) => s.plan_dia_id && indiceDe.has(s.plan_dia_id));
  const indiceUltimo = ultima?.plan_dia_id ? (indiceDe.get(ultima.plan_dia_id) ?? -1) : -1;
  const indiceSiguiente = plan.dias.length ? (indiceUltimo + 1) % plan.dias.length : -1;

  const completadas = (sesiones ?? []).filter((s) => s.estado === "completada");
  const ultimaCompletada = completadas.map((s) => s.completada_en ?? s.programada_para).filter(Boolean).sort().at(-1) ?? null;

  const proxima = citas?.[0] ?? null;
  const sesionProxima = proxima?.sesion_id ? (sesiones ?? []).find((s) => s.id === proxima.sesion_id) : undefined;
  const diaProxima = sesionProxima?.plan_dia_id ? plan.dias[indiceDe.get(sesionProxima.plan_dia_id) ?? -1] : undefined;

  // El día abierto: el pedido en la URL o, por defecto, el que le toca.
  const n = typeof diaPedido === "string" ? Number.parseInt(diaPedido, 10) - 1 : Number.NaN;
  const indiceAbierto = Number.isInteger(n) && n >= 0 && n < plan.dias.length ? n : Math.max(0, indiceSiguiente);
  const diaAbierto = plan.dias[indiceAbierto];
  const resumenAbierto = diaAbierto ? resumenDia(diaAbierto) : { ejercicios: 0, minutos: 0 };
  const enCurso = plan.estado === "activo";

  return (
    <>
      <Encabezado
        titulo={plan.nombre}
        volver={{ href: "/entrenamiento", texto: "Rutinas y planes" }}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {alumno && (
              <Link href={`/alumnos/${alumno.id}`} className="inline-flex items-center gap-2 font-medium text-tinta hover:underline">
                <Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="sm" />
                {nombreAlumno}
              </Link>
            )}
            <InsigniaPlan estado={plan.estado} />
            <span>
              {plan.tipo_objetivo ? `${ETIQUETA_TIPO_OBJETIVO[plan.tipo_objetivo]} · ` : ""}Desde el {fechaCorta(plan.fecha_inicio)}
            </span>
          </span>
        }
        acciones={
          <>
            {plan.estado !== "activo" && plan.estado !== "archivado" && (
              <form action={cambiarEstadoPlan.bind(null, id, "activo")}>
                <Boton type="submit">
                  <Play aria-hidden className="size-4" /> Activar plan
                </Boton>
              </form>
            )}
            {enCurso && (
              <form action={cambiarEstadoPlan.bind(null, id, "completado")}>
                <Boton type="submit" variante="secundario">
                  <CheckCheck aria-hidden className="size-4" /> Marcar como completado
                </Boton>
              </form>
            )}
          </>
        }
      />

      {aviso === "sin-activar" && plan.estado !== "activo" && (
        <div className="mb-4">
          <Aviso>El plan se creó, pero no se pudo activar. Usa «Activar plan» para intentarlo de nuevo.</Aviso>
        </div>
      )}
      {plan.estado === "borrador" && aviso !== "sin-activar" && (
        <p className="mb-6 rounded-[var(--radius-tarjeta)] border border-aviso/30 bg-aviso/[0.06] px-4 py-3 text-sm">
          Aún no está activo. Actívalo cuando {quien} vaya a empezarlo; si tiene otro plan activo, ese quedará como completado.
        </p>
      )}

      {/* Lo primero: por dónde va el alumno. */}
      {plan.estado !== "borrador" && plan.dias.length > 0 && (
        <PorDondeVa
          enCurso={enCurso}
          siguiente={plan.dias[indiceSiguiente]?.nombre ?? null}
          posicion={`Día ${indiceSiguiente + 1} de ${plan.dias.length}`}
          ultimo={ultima?.plan_dia_id ? plan.dias[indiceUltimo].nombre : null}
          proxima={proxima ? { inicia_en: proxima.inicia_en, dia: diaProxima?.nombre ?? null } : null}
          completadas={completadas.length}
          ultimaCompletada={ultimaCompletada}
        />
      )}

      {plan.dias.length === 0 ? (
        <p className="text-sm text-tenue">Este plan no tiene días.</p>
      ) : (
        <section aria-labelledby="titulo-dia">
          {/* Días como pestañas (enlaces): se ve uno a la vez, por defecto el que le toca. */}
          <nav aria-label="Días del plan" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {plan.dias.map((d, i) => {
              const activo = i === indiceAbierto;
              const { ejercicios: total } = resumenDia(d);
              return (
                <Link
                  key={d.id}
                  href={conParametros(`/entrenamiento/planes/${id}`, { dia: i + 1 })}
                  scroll={false}
                  aria-current={activo ? "true" : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm transition-colors ${
                    activo ? "border-tinta bg-tinta font-medium text-sobre-tinta" : "border-linea bg-superficie text-grafito hover:border-linea-fuerte hover:text-tinta"
                  }`}
                >
                  {enCurso && i === indiceSiguiente && (
                    <>
                      <span aria-hidden title="Le toca" className="size-1.5 shrink-0 rounded-full bg-acento" />
                      <span className="sr-only">Le toca:</span>
                    </>
                  )}
                  <span className="max-w-40 truncate">{d.nombre}</span>
                  <span className={`tabular-nums text-[0.7rem] ${activo ? "opacity-60" : "text-tenue"}`}>{total}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="titulo-dia" className="titulo-serif text-2xl leading-[1.25]">
              {diaAbierto.nombre}
            </h2>
            <p className="tabular-nums text-sm text-tenue">
              Día {indiceAbierto + 1} de {plan.dias.length}
              {resumenAbierto.ejercicios > 0 && ` · ${resumenAbierto.ejercicios} ejercicios · ≈${resumenAbierto.minutos} min`}
            </p>
          </div>
          <HojaDia dia={diaAbierto} nombreDe={nombreDe} />
        </section>
      )}

      <footer className="mt-10 space-y-4 border-t border-linea pt-6">
        <p className="text-sm text-tenue">
          Copia independiente
          {origen ? (
            <>
              {" "}
              de la rutina{" "}
              <Link href={`/entrenamiento/rutinas/${origen.id}`} className="font-medium text-grafito underline underline-offset-2 hover:text-tinta">
                {origen.nombre}
              </Link>
            </>
          ) : null}
          : si cambias la rutina, este plan no se modifica.
        </p>
        {plan.estado !== "archivado" && (
          <section
            aria-labelledby="titulo-archivar"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-tarjeta)] border border-dashed border-linea-fuerte/60 p-4"
          >
            <div className="max-w-xl">
              <h2 id="titulo-archivar" className="text-sm font-semibold">
                Archivar plan
              </h2>
              <p className="text-sm text-tenue">Sale de los planes en curso. Las sesiones que {quien} ya registró se conservan.</p>
            </div>
            <form action={cambiarEstadoPlan.bind(null, id, "archivado")}>
              <Boton type="submit" variante="peligro">
                <Archive aria-hidden className="size-4" /> Archivar
              </Boton>
            </form>
          </section>
        )}
      </footer>
    </>
  );
}
