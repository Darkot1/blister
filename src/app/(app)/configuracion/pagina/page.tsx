import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { EditorPagina } from "./editor";

export const metadata: Metadata = { title: "Página pública" };

export default function PaginaEditor() {
  return (
    <Suspense
      fallback={
        <>
          <Encabezado titulo="Página pública" volver={{ href: "/configuracion", texto: "Ajustes" }} />
          <Esqueleto className="mb-5 h-10 rounded-full" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
            <Esqueleto className="h-[36rem]" />
            <Esqueleto className="hidden h-[36rem] lg:block" />
          </div>
        </>
      }
    >
      <Editor />
    </Suspense>
  );
}

async function Editor() {
  const { supabase, usuarioId, organizacionId } = await obtenerContexto();
  const [{ data: espacio }, { data: miembros }] = await Promise.all([
    supabase
      .from("organizaciones")
      .select("slug, pagina_publica, titular, presentacion, foto_ruta, metodos, modalidad, ubicacion, experiencia_anos, certificaciones, instagram, whatsapp, diseno, testimonios, respuesta_horas, oferta_inicial")
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
    <>
      {espacio.pagina_publica ? (
        <Encabezado
          titulo="Tu página pública"
          volver={{ href: "/configuracion", texto: "Ajustes" }}
          descripcion="Lo que ve quien abre tu enlace. Cambia lo que quieras: la vista previa se actualiza mientras escribes."
        />
      ) : (
        <Encabezado
          titulo="Crea tu página para conseguir alumnos"
          volver={{ href: "/configuracion", texto: "Ajustes" }}
          descripcion="Seis pasos cortos, con ejemplos para escribir cada parte. Se guarda mientras avanzas y la publicas al final."
        />
      )}
      <EditorPagina inicial={espacio} entrenadores={entrenadores} editable={rol === "propietario" || rol === "admin"} />
    </>
  );
}
