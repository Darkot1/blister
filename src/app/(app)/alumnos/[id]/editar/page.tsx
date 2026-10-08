import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { Pila } from "@/components/ui/disposicion";
import { obtenerContexto } from "@/lib/sesion";
import { FormularioAlumno } from "../../formulario-alumno";
import { actualizarAlumno } from "../../acciones";

export const metadata: Metadata = { title: "Editar alumno" };

export default function PaginaEditarAlumno({ params }: PageProps<"/alumnos/[id]/editar">) {
  return (
    <Suspense fallback={<CargandoEdicion />}>
      <Edicion params={params} />
    </Suspense>
  );
}

function CargandoEdicion() {
  return (
    <Pila espacio={8} role="status" aria-label="Cargando alumno">
      <Pila espacio={3}>
        <Esqueleto forma="texto" ancho="8rem" />
        <Esqueleto alto="var(--texto-4xl)" ancho="min(100%, 20rem)" />
      </Pila>
      <Esqueleto alto="24rem" ancho="min(100%, var(--ancho-lectura))" />
    </Pila>
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
        volver={{ href: `/alumnos/${id}`, texto: `${alumno.nombres} ${alumno.apellidos}` }}
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
