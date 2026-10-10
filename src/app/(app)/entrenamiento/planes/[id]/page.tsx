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
import { cargarPlan } from "@/lib/entrenamiento/cargar";
import { ETIQUETA_TIPO_OBJETIVO, fechaCorta } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { cambiarEstadoPlan } from "../../acciones";
import { InsigniaPlan, VistaRutina } from "../../componentes";

export const metadata: Metadata = { title: "Plan" };

export default function PaginaPlan({ params, searchParams }: PageProps<"/entrenamiento/planes/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
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
  const [{ id }, { aviso }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const plan = await cargarPlan(supabase, id);
  if (!plan) notFound();

  const ejercicioIds = [...new Set(plan.dias.flatMap((d) => d.bloques.flatMap((b) => b.ejercicios.map((e) => e.ejercicio_id))))];
  const [{ data: alumno }, { data: ejercicios }, { data: origen }] = await Promise.all([
    supabase.from("alumnos").select("id, nombres, apellidos").eq("id", plan.alumno_id).maybeSingle(),
    ejercicioIds.length ? supabase.from("ejercicios").select("id, nombre").in("id", ejercicioIds) : Promise.resolve({ data: [] }),
    plan.plantilla_origen_id
      ? supabase.from("plantillas").select("id, nombre").eq("id", plan.plantilla_origen_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const nombreDe = new Map((ejercicios ?? []).map((e) => [e.id, e.nombre]));
  const nombreAlumno = alumno ? `${alumno.nombres} ${alumno.apellidos}` : "Alumno";

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
            {plan.estado === "activo" && (
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
        <p className="mb-4 rounded-[var(--radius-tarjeta)] border border-aviso/30 bg-aviso/[0.06] px-4 py-3 text-sm">
          Este plan aún no está activo. Actívalo cuando {alumno?.nombres ?? "el alumno"} vaya a empezarlo; si tiene otro plan activo, ese quedará como
          completado.
        </p>
      )}

      <p className="mb-5 text-sm text-tenue">
        Es una copia independiente
        {origen ? (
          <>
            {" "}
            de la rutina{" "}
            <Link href={`/entrenamiento/rutinas/${origen.id}`} className="font-medium text-tinta hover:underline">
              {origen.nombre}
            </Link>
          </>
        ) : null}
        : si cambias la rutina, este plan no se modifica.
      </p>

      <VistaRutina dias={plan.dias} nombreDe={nombreDe} />

      {plan.estado !== "archivado" && (
        <section aria-labelledby="titulo-archivar" className="mt-10 rounded-[var(--radius-tarjeta)] border border-dashed border-linea p-4 sm:p-5">
          <h2 id="titulo-archivar" className="font-semibold">
            Archivar plan
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-tenue">
              Sale de los planes en curso. Las sesiones que {alumno?.nombres ?? "el alumno"} ya registró con este plan se conservan.
            </p>
            <form action={cambiarEstadoPlan.bind(null, id, "archivado")}>
              <Boton type="submit" variante="peligro">
                <Archive aria-hidden className="size-4" /> Archivar
              </Boton>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
