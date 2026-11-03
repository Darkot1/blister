import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { cargarCatalogo, cargarPlan } from "@/lib/entrenamiento/cargar";
import { obtenerContexto } from "@/lib/sesion";
import { guardarPlan } from "../../../acciones";
import { CargandoConstructor } from "../../../constructor/cargando";
import { ConstructorRutina } from "../../../constructor/constructor";
import { estadoInicial } from "../../../constructor/estado";

export const metadata: Metadata = { title: "Editar plan" };

/** Solo se editan los planes que siguen en marcha: los completados y archivados son historial. */
const EDITABLES = ["borrador", "activo"];

export default function PaginaEditarPlan({ params }: PageProps<"/entrenamiento/planes/[id]/editar">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
          <CargandoConstructor />
        </>
      }
    >
      <EditarPlan params={params} />
    </Suspense>
  );
}

async function EditarPlan({ params }: { params: PageProps<"/entrenamiento/planes/[id]/editar">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const [plan, catalogo, { count: agendadas }] = await Promise.all([
    cargarPlan(supabase, id),
    cargarCatalogo(supabase),
    supabase
      .from("sesiones")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", id)
      .eq("estado", "programada")
      .is("iniciada_en", null),
  ]);
  if (!plan) notFound();

  const { data: alumno } = await supabase.from("alumnos").select("nombres").eq("id", plan.alumno_id).maybeSingle();
  const quien = alumno?.nombres ?? "el alumno";
  const volver = { href: `/entrenamiento/planes/${id}`, texto: plan.nombre };

  if (!EDITABLES.includes(plan.estado)) {
    return (
      <>
        <Encabezado titulo="Editar plan" volver={volver} />
        <p className="max-w-xl text-sm text-grafito">
          Este plan está {plan.estado === "archivado" ? "archivado" : "completado"}: se conserva tal cual como historial de {quien}. Para
          cambiar su entrenamiento, asígnale una rutina nueva o{" "}
          <Link href={volver.href} className="font-medium underline underline-offset-2 hover:text-tinta">
            vuelve al plan
          </Link>
          .
        </p>
      </>
    );
  }

  const pendientes = agendadas ?? 0;
  return (
    <>
      <Encabezado
        titulo="Editar plan"
        volver={volver}
        descripcion={
          <>
            Plan de {quien}. Las sesiones ya hechas conservan lo que se les prescribió
            {pendientes > 0
              ? `; ${pendientes === 1 ? "la sesión agendada que aún no empieza toma" : `las ${pendientes} sesiones agendadas que aún no empiezan toman`} los cambios al guardar.`
              : "."}
          </>
        }
      />
      <ConstructorRutina id={id} inicial={estadoInicial(plan)} catalogo={catalogo} plan={{ guardar: guardarPlan.bind(null, id) }} />
    </>
  );
}
