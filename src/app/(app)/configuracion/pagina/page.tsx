import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { EditorPagina } from "./editor";

export const metadata: Metadata = { title: "Página pública" };

export default function PaginaEditor() {
  return (
    <>
      <Encabezado
        titulo="Página pública"
        volver={{ href: "/configuracion", texto: "Ajustes" }}
        descripcion="Lo que ve quien abre tu enlace: tu foto, cómo trabajas y un formulario para pedir entrenar contigo. La vista previa se actualiza mientras escribes."
      />
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-2">
            <Esqueleto className="h-[40rem]" />
            <Esqueleto className="h-[40rem]" />
          </div>
        }
      >
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  const { supabase, usuarioId, organizacionId } = await obtenerContexto();
  const [{ data: espacio }, { data: miembros }] = await Promise.all([
    supabase
      .from("organizaciones")
      .select("nombre, slug, pagina_publica, titular, presentacion, foto_ruta, metodos, modalidad, ubicacion, experiencia_anos, certificaciones, instagram, whatsapp, diseno")
      .eq("id", organizacionId)
      .single(),
    supabase.from("miembros_organizacion").select("usuario_id, rol").eq("organizacion_id", organizacionId).eq("estado", "activo"),
  ]);
  if (!espacio) throw new Error("No se encontró tu espacio de trabajo.");

  // Los mismos entrenadores que muestra la página pública (propietario y entrenadores).
  const quienesEntrenan = (miembros ?? []).filter((m) => m.rol === "propietario" || m.rol === "entrenador");
  const { data: perfiles } = quienesEntrenan.length
    ? await supabase.from("perfiles").select("id, nombres, apellidos, avatar_url").in("id", quienesEntrenan.map((m) => m.usuario_id))
    : { data: [] };
  const esPropietario = (id: string) => quienesEntrenan.some((m) => m.usuario_id === id && m.rol === "propietario");
  const entrenadores = (perfiles ?? [])
    .sort((a, b) => Number(esPropietario(b.id)) - Number(esPropietario(a.id)) || a.nombres.localeCompare(b.nombres, "es"))
    .map(({ nombres, apellidos, avatar_url }) => ({ nombres, apellidos, avatar_url }));

  const rol = (miembros ?? []).find((m) => m.usuario_id === usuarioId)?.rol;
  return (
    <EditorPagina
      organizacionId={organizacionId}
      inicial={espacio}
      entrenadores={entrenadores}
      editable={rol === "propietario" || rol === "admin"}
    />
  );
}
