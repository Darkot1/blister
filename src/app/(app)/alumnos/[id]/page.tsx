import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { edad, fechaCorta, fechaHora, numero } from "@/lib/formato";
import type { MedicionFila } from "@/lib/supabase/tipos-bd";
import { agregarNota, cambiarEstadoAlumno, registrarMedicion } from "../acciones";
import { BotonCambioEstado, FormularioMedicion, FormularioNota } from "./componentes";

export const metadata: Metadata = { title: "Alumno" };

export default function PaginaAlumno({ params }: PageProps<"/alumnos/[id]">) {
  return (
    <Suspense fallback={<CargandoPerfil />}>
      <PerfilAlumno params={params} />
    </Suspense>
  );
}

function CargandoPerfil() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando alumno">
      <Esqueleto className="h-12 w-72" />
      <Esqueleto className="h-28 w-full" />
      <EsqueletoLista filas={3} />
    </div>
  );
}

const COLUMNAS: { clave: keyof MedicionFila; titulo: string }[] = [
  { clave: "peso_kg", titulo: "Peso (kg)" },
  { clave: "grasa_corporal_pct", titulo: "Grasa (%)" },
  { clave: "cintura_cm", titulo: "Cintura" },
  { clave: "cadera_cm", titulo: "Cadera" },
  { clave: "pecho_cm", titulo: "Pecho" },
  { clave: "brazo_izq_cm", titulo: "Brazo izq." },
  { clave: "brazo_der_cm", titulo: "Brazo der." },
  { clave: "muslo_izq_cm", titulo: "Muslo izq." },
  { clave: "muslo_der_cm", titulo: "Muslo der." },
  { clave: "estatura_cm", titulo: "Estatura" },
];

async function PerfilAlumno({ params }: { params: PageProps<"/alumnos/[id]">["params"] }) {
  const { id } = await params;
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

  const historial = mediciones ?? [];
  const conPeso = historial.filter((m) => m.peso_kg !== null);
  const pesoActual = conPeso[0]?.peso_kg ?? null;
  const pesoInicial = conPeso.at(-1)?.peso_kg ?? null;
  const cambioPeso = pesoActual !== null && pesoInicial !== null && conPeso.length > 1 ? pesoActual - pesoInicial : null;
  const anios = edad(alumno.fecha_nacimiento);
  const columnas = COLUMNAS.filter((c) => historial.some((m) => m[c.clave] !== null));
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const archivado = alumno.estado === "archivado";

  return (
    <>
      <Encabezado
        volver={<Link href="/alumnos" className="text-sm text-tenue hover:text-tinta">Alumnos</Link>}
        titulo={`${alumno.nombres} ${alumno.apellidos}`}
        descripcion={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <InsigniaEstado estado={alumno.estado} />
            {alumno.telefono && <a href={`tel:${alumno.telefono}`} className="hover:text-tinta">{alumno.telefono}</a>}
            {alumno.correo && <a href={`mailto:${alumno.correo}`} className="hover:text-tinta">{alumno.correo}</a>}
          </div>
        }
        acciones={
          <>
            <EnlaceBoton href={`/alumnos/${alumno.id}/editar`} variante="secundario">
              <Pencil aria-hidden className="size-4" /> Editar
            </EnlaceBoton>
            {archivado ? (
              <BotonCambioEstado accion={cambiarEstadoAlumno.bind(null, alumno.id, "activo")} texto="Reactivar" />
            ) : (
              <BotonCambioEstado
                accion={cambiarEstadoAlumno.bind(null, alumno.id, "archivado")}
                texto="Archivar"
                variante="peligro"
                confirmacion={`¿Archivar a ${alumno.nombres}? Su historial se conserva y podrás reactivarlo cuando quieras.`}
              />
            )}
          </>
        }
      />

      {/* Las cifras clave, grandes y en condensada: lo primero que el entrenador busca. */}
      <section aria-label="Resumen" className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-linea bg-linea md:grid-cols-4">
        <Cifra etiqueta="Peso actual" valor={numero(pesoActual)} unidad={pesoActual !== null ? "kg" : undefined}
          detalle={cambioPeso !== null ? `${cambioPeso > 0 ? "+" : ""}${numero(cambioPeso)} kg desde la primera medición` : conPeso.length ? `Medido el ${fechaCorta(conPeso[0].medido_en)}` : "Sin mediciones"} />
        <Cifra etiqueta="Edad" valor={anios !== null ? String(anios) : "—"} unidad={anios !== null ? "años" : undefined}
          detalle={alumno.fecha_nacimiento ? fechaCorta(alumno.fecha_nacimiento) : "Sin fecha de nacimiento"} />
        <Cifra etiqueta="Entrena contigo desde" valor={fechaCorta(alumno.fecha_inicio)} pequena />
        <Cifra etiqueta="Objetivo principal" valor={objetivo?.nombre ?? "Sin definir"} pequena
          detalle={objetivo?.fecha_meta ? `Meta: ${fechaCorta(objetivo.fecha_meta)}` : undefined} />
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="titulo-mediciones">
          <h2 id="titulo-mediciones" className="mb-4 font-titulo text-2xl font-semibold">Mediciones</h2>
          {!archivado && <div className="mb-5"><FormularioMedicion accion={registrarMedicion.bind(null, alumno.id)} hoy={hoy} /></div>}
          {historial.length === 0 ? (
            <p className="text-tenue">Todavía no hay mediciones. La primera servirá como punto de partida para ver el progreso.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
              <table className="w-full text-sm">
                <thead className="border-b border-linea text-left text-tenue">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Fecha</th>
                    {columnas.map((c) => (
                      <th key={c.clave} scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {historial.map((m) => (
                    <tr key={m.id}>
                      <th scope="row" className="px-3 py-2 text-left font-normal whitespace-nowrap">{fechaCorta(m.medido_en)}</th>
                      {columnas.map((c) => (
                        <td key={c.clave} className="cifra px-3 py-2 text-right text-base">{numero(m[c.clave] as number | null)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="titulo-notas">
          <h2 id="titulo-notas" className="mb-4 font-titulo text-2xl font-semibold">Notas</h2>
          <div className="mb-6"><FormularioNota accion={agregarNota.bind(null, alumno.id)} /></div>
          {notas?.length ? (
            <ol className="space-y-4">
              {notas.map((n) => (
                <li key={n.id} className="border-l-2 border-linea pl-4">
                  <p className="whitespace-pre-line">{n.contenido}</p>
                  <p className="mt-1 text-sm text-tenue">
                    {fechaHora(n.creado_en)}{autores.get(n.autor_id) ? `, ${autores.get(n.autor_id)}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-tenue">Sin notas todavía.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Cifra({
  etiqueta,
  valor,
  unidad,
  detalle,
  pequena = false,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  detalle?: string;
  pequena?: boolean;
}) {
  return (
    <div className="bg-superficie px-5 py-4">
      <p className="text-sm text-tenue">{etiqueta}</p>
      <p className={`cifra mt-1 leading-none font-semibold ${pequena ? "text-2xl" : "text-5xl"}`}>
        {valor}
        {unidad && <span className="ml-1 text-lg font-medium text-tenue">{unidad}</span>}
      </p>
      {detalle && <p className="mt-2 text-sm text-tenue">{detalle}</p>}
    </div>
  );
}
