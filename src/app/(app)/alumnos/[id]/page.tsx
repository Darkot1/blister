import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerContexto } from "@/lib/sesion";
import { agregarNota, cambiarEstadoAlumno, registrarMedicion } from "../acciones";
import { CargandoPerfil, PerfilVista, vistaPerfil } from "./perfil";

export const metadata: Metadata = { title: "Alumno" };

export default function PaginaAlumno({ params, searchParams }: PageProps<"/alumnos/[id]">) {
  return (
    <Suspense fallback={<CargandoPerfil />}>
      <PerfilAlumno params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PerfilAlumno({
  params,
  searchParams,
}: {
  params: PageProps<"/alumnos/[id]">["params"];
  searchParams: PageProps<"/alumnos/[id]">["searchParams"];
}) {
  const [{ id }, { vista }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const [{ data: alumno }, { data: mediciones }, { data: notas }, { data: objetivo }] = await Promise.all([
    supabase.from("alumnos").select("*").eq("id", id).maybeSingle(),
    supabase.from("mediciones").select("*").eq("alumno_id", id).order("medido_en", { ascending: false }).limit(100),
    supabase
      .from("notas_alumno")
      .select("id, contenido, creado_en, autor_id")
      .eq("alumno_id", id)
      .is("archivado_en", null)
      .order("creado_en", { ascending: false })
      .limit(50),
    supabase
      .from("objetivos_alumno")
      .select("nombre, fecha_meta")
      .eq("alumno_id", id)
      .eq("es_principal", true)
      .eq("estado", "activo")
      .maybeSingle(),
  ]);

  // RLS devuelve vacío si el alumno no es de tu espacio: se trata igual que inexistente.
  if (!alumno) notFound();

  const autores = new Map<string, string>();
  const idsAutores = [...new Set((notas ?? []).map((n) => n.autor_id))];
  if (idsAutores.length) {
    const { data: perfiles } = await supabase.from("perfiles").select("id, nombres").in("id", idsAutores);
    for (const p of perfiles ?? []) autores.set(p.id, p.nombres);
  }

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

  return (
    <PerfilVista
      alumno={alumno}
      mediciones={mediciones ?? []}
      notas={notas ?? []}
      objetivo={objetivo ?? null}
      autores={autores}
      vista={vistaPerfil(vista)}
      hoy={hoy}
      acciones={{
        registrarMedicion: registrarMedicion.bind(null, alumno.id),
        agregarNota: agregarNota.bind(null, alumno.id),
        archivar: cambiarEstadoAlumno.bind(null, alumno.id, "archivado"),
        reactivar: cambiarEstadoAlumno.bind(null, alumno.id, "activo"),
      }}
    />
  );
}
