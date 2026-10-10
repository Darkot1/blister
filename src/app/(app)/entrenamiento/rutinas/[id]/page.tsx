import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Archive, ArchiveRestore, Copy } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Boton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { hoyLocal } from "@/lib/calendario";
import { cargarCatalogo, cargarPlantilla } from "@/lib/entrenamiento/cargar";
import { ETIQUETA_TIPO_OBJETIVO, fechaCorta } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { asignarRutina, cambiarEstadoRutina, duplicarRutina } from "../../acciones";
import { CargandoConstructor } from "../../constructor/cargando";
import { ConstructorRutina } from "../../constructor/constructor";
import { estadoInicial } from "../../constructor/estado";

export const metadata: Metadata = { title: "Rutina" };

export default function PaginaRutina({ params }: PageProps<"/entrenamiento/rutinas/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
          <CargandoConstructor />
        </>
      }
    >
      <Rutina params={params} />
    </Suspense>
  );
}

async function Rutina({ params }: { params: PageProps<"/entrenamiento/rutinas/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await obtenerContexto();
  const [rutina, catalogo, { data: alumnos }, { data: activos }] = await Promise.all([
    cargarPlantilla(supabase, id),
    cargarCatalogo(supabase),
    supabase.from("alumnos").select("id, nombres, apellidos").eq("estado", "activo").order("nombres").order("apellidos"),
    supabase.from("planes").select("alumno_id, nombre").eq("estado", "activo"),
  ]);
  if (!rutina) notFound();

  const planActivo = new Map((activos ?? []).map((p) => [p.alumno_id, p.nombre]));
  const archivada = rutina.estado === "archivado";

  return (
    <>
      <Encabezado
        titulo={rutina.nombre}
        volver={{ href: "/entrenamiento", texto: "Rutinas y planes" }}
        descripcion={
          <>
            {rutina.tipo_objetivo ? ETIQUETA_TIPO_OBJETIVO[rutina.tipo_objetivo] : "Sin objetivo"} · Actualizada el{" "}
            {fechaCorta(rutina.actualizado_en)}
          </>
        }
        acciones={
          <form action={duplicarRutina.bind(null, id)}>
            <Boton type="submit" variante="secundario">
              <Copy aria-hidden className="size-4" /> Duplicar
            </Boton>
          </form>
        }
      />

      {archivada && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-tarjeta)] border border-aviso/30 bg-aviso/[0.06] px-4 py-3 text-sm">
          <p>Esta rutina está archivada: no aparece en la lista de rutinas activas.</p>
          <form action={cambiarEstadoRutina.bind(null, id, "activo")}>
            <Boton type="submit" variante="secundario">
              <ArchiveRestore aria-hidden className="size-4" /> Restaurar
            </Boton>
          </form>
        </div>
      )}

      <ConstructorRutina
        id={id}
        inicial={estadoInicial(rutina)}
        catalogo={catalogo}
        asignacion={{
          accion: asignarRutina.bind(null, id),
          alumnos: (alumnos ?? []).map((a) => ({
            id: a.id,
            nombre: `${a.nombres} ${a.apellidos}`,
            planActivo: planActivo.get(a.id) ?? null,
          })),
          hoy: hoyLocal(),
        }}
      />

      {!archivada && (
        <section aria-labelledby="titulo-archivar" className="mt-10 rounded-[var(--radius-tarjeta)] border border-dashed border-linea p-4 sm:p-5">
          <h2 id="titulo-archivar" className="font-semibold">
            Archivar rutina
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-tenue">
              Deja de aparecer entre tus rutinas activas. Los planes que ya asignaste con ella no cambian, y puedes restaurarla cuando quieras.
            </p>
            <form action={cambiarEstadoRutina.bind(null, id, "archivado")}>
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
