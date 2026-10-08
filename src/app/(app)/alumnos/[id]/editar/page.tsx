import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { FormularioAlumno } from "../../formulario-alumno";
import { actualizarAlumno } from "../../acciones";

export const metadata: Metadata = { title: "Editar alumno" };

export default function PaginaEditarAlumno({ params }: PageProps<"/alumnos/[id]/editar">) {
  return (
    <Suspense fallback={<Esqueleto className="h-96 max-w-2xl" />}>
      <Edicion params={params} />
    </Suspense>
  );
}

async function Edicion({ params }: { params: PageProps<"/alumnos/[id]/editar">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("id, nombres, apellidos, correo, telefono, fecha_nacimiento, fecha_inicio, estado")
    .eq("id", id)
    .maybeSingle();
  if (!alumno) notFound();

  return (
    <>
      <Encabezado
        titulo="Editar alumno"
        volver={<Link href={`/alumnos/${id}`} className="text-sm text-tenue hover:text-tinta">{alumno.nombres} {alumno.apellidos}</Link>}
      />
      <FormularioAlumno
        accion={actualizarAlumno.bind(null, id)}
        alumno={alumno}
        textoBoton="Guardar cambios"
        cancelarHref={`/alumnos/${id}`}
      />
    </>
  );
}
