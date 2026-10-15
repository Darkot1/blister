import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { Esqueleto } from "@/components/ui/esqueleto";
import { cargarSesion } from "@/lib/entrenamiento/sesiones";
import { etiquetaDiaLarga, partesLocales } from "@/lib/calendario";
import { hora } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { RegistroSesion } from "./registro";

export const metadata: Metadata = { title: "Sesión" };

const ESTADO: Record<string, string> = {
  programada: "Por empezar",
  en_curso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
  omitida: "No asistió",
};

export default function PaginaSesion({ params }: PageProps<"/sesiones/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
          <Esqueleto className="mb-4 h-48" />
          <Esqueleto className="h-48" />
        </>
      }
    >
      <Sesion params={params} />
    </Suspense>
  );
}

async function Sesion({ params }: { params: PageProps<"/sesiones/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await obtenerContexto();
  const datos = await cargarSesion(supabase, id);
  if (!datos) notFound();
  const { sesion, alumno, dia, plan, ejercicios } = datos;
  const cuando = sesion.programada_para;

  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado
        volver={alumno ? { href: `/progreso?alumno=${alumno.id}`, texto: "Progreso del alumno" } : { href: "/calendario", texto: "Calendario" }}
        titulo={dia ? `${dia.nombre}` : "Sesión"}
        figura={alumno && <Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} />}
        descripcion={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {alumno && (
              <Link href={`/alumnos/${alumno.id}`} className="font-medium text-tinta hover:underline">
                {alumno.nombres} {alumno.apellidos}
              </Link>
            )}
            {cuando && (
              <span>
                · {etiquetaDiaLarga(partesLocales(cuando).fecha)}, {hora(cuando)}
              </span>
            )}
            {plan && (
              <span>
                ·{" "}
                <Link href={`/entrenamiento/planes/${plan.id}`} className="underline underline-offset-2 hover:text-tinta">
                  {plan.nombre}
                </Link>
              </span>
            )}
            <span className="rounded-full bg-hueso px-2 py-0.5 text-xs font-medium text-grafito">{ESTADO[sesion.estado] ?? sesion.estado}</span>
          </span>
        }
      />
      <RegistroSesion
        sesionId={sesion.id}
        completada={sesion.estado === "completada"}
        rpe={sesion.rpe_sesion}
        notas={sesion.notas}
        ejercicios={ejercicios}
      />
    </div>
  );
}
