import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarPlus, ChevronLeft, Mail, Pencil, Phone, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { ListaAgrupada, Tarjeta, TituloGrupo } from "@/components/ui/tarjeta";
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
    <div className="space-y-4" role="status" aria-label="Cargando alumno">
      <Esqueleto className="h-64 w-full" />
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
      <Link
        href="/alumnos"
        className="-ml-1.5 mb-3 inline-flex items-center gap-0.5 rounded-full py-1 pr-2 text-[0.95rem] font-medium text-acento hover:bg-acento/10"
      >
        <ChevronLeft aria-hidden className="size-5" strokeWidth={2.4} />
        Alumnos
      </Link>

      {/* Ficha de contacto, como en la agenda del teléfono. */}
      <Tarjeta className="mb-4 px-5 pt-7 pb-5 sm:px-7">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="xl" />
          <div className="min-w-0">
            <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.4rem]">
              {alumno.nombres} {alumno.apellidos}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-tenue sm:justify-start">
              <InsigniaEstado estado={alumno.estado} />
              {objetivo?.nombre && <span>Objetivo: <span className="font-medium text-tinta">{objetivo.nombre}</span></span>}
            </div>
          </div>
        </div>

        <nav aria-label="Acciones del alumno" className="mt-6 grid grid-cols-4 gap-2 sm:max-w-md">
          <AccionContacto icono={Phone} texto="Llamar" href={alumno.telefono ? `tel:${alumno.telefono}` : undefined} />
          <AccionContacto icono={Mail} texto="Correo" href={alumno.correo ? `mailto:${alumno.correo}` : undefined} />
          <AccionContacto icono={CalendarPlus} texto="Agendar" href={archivado ? undefined : `/calendario?alumno=${alumno.id}`} />
          <AccionContacto icono={Pencil} texto="Editar" href={`/alumnos/${alumno.id}/editar`} />
        </nav>
      </Tarjeta>

      {/* Las cifras clave en widgets: lo primero que el entrenador busca. */}
      <section aria-label="Resumen" className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Cifra etiqueta="Peso actual" valor={numero(pesoActual)} unidad={pesoActual !== null ? "kg" : undefined}
          detalle={cambioPeso !== null ? `${cambioPeso > 0 ? "+" : ""}${numero(cambioPeso)} kg desde la primera medición` : conPeso.length ? `Medido el ${fechaCorta(conPeso[0].medido_en)}` : "Sin mediciones"} />
        <Cifra etiqueta="Edad" valor={anios !== null ? String(anios) : "—"} unidad={anios !== null ? "años" : undefined}
          detalle={alumno.fecha_nacimiento ? fechaCorta(alumno.fecha_nacimiento) : "Sin fecha de nacimiento"} />
        <Cifra etiqueta="Entrena contigo desde" valor={fechaCorta(alumno.fecha_inicio)} pequena />
        <Cifra etiqueta="Objetivo principal" valor={objetivo?.nombre ?? "Sin definir"} pequena
          detalle={objetivo?.fecha_meta ? `Meta: ${fechaCorta(objetivo.fecha_meta)}` : undefined} />
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="titulo-mediciones" className="min-w-0">
          <TituloGrupo id="titulo-mediciones">Mediciones</TituloGrupo>
          {!archivado && <div className="mb-4"><FormularioMedicion accion={registrarMedicion.bind(null, alumno.id)} hoy={hoy} /></div>}
          {historial.length === 0 ? (
            <Tarjeta className="px-5 py-6 text-tenue">
              Todavía no hay mediciones. La primera servirá como punto de partida para ver el progreso.
            </Tarjeta>
          ) : (
            <Tarjeta className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs tracking-wide text-tenue uppercase">
                  <tr>
                    <th scope="col" className="px-4 pt-4 pb-2 font-semibold">Fecha</th>
                    {columnas.map((c) => (
                      <th key={c.clave} scope="col" className="px-3 pt-4 pb-2 text-right font-semibold whitespace-nowrap">{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((m) => (
                    <tr key={m.id} className="border-t border-linea first:border-t-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{fechaCorta(m.medido_en)}</th>
                      {columnas.map((c) => (
                        <td key={c.clave} className="cifra px-3 py-2.5 text-right text-[1.05rem]">{numero(m[c.clave] as number | null)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Tarjeta>
          )}
        </section>

        <section aria-labelledby="titulo-notas" className="min-w-0">
          <TituloGrupo id="titulo-notas">Notas</TituloGrupo>
          <Tarjeta className="mb-4 p-4"><FormularioNota accion={agregarNota.bind(null, alumno.id)} /></Tarjeta>
          {notas?.length ? (
            <ListaAgrupada ordenada>
              {notas.map((n) => (
                <li key={n.id}>
                  <div className="px-4 py-3">
                    <p className="whitespace-pre-line">{n.contenido}</p>
                    <p className="mt-1 text-xs text-tenue">
                      {fechaHora(n.creado_en)}{autores.get(n.autor_id) ? ` · ${autores.get(n.autor_id)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ListaAgrupada>
          ) : (
            <p className="px-1 text-sm text-tenue">Sin notas todavía.</p>
          )}
        </section>
      </div>

      {/* Acción destructiva aparte, al final, como en los ajustes del teléfono. */}
      <div className="mt-10 max-w-md">
        {archivado ? (
          <BotonCambioEstado accion={cambiarEstadoAlumno.bind(null, alumno.id, "activo")} texto="Reactivar alumno" />
        ) : (
          <BotonCambioEstado
            accion={cambiarEstadoAlumno.bind(null, alumno.id, "archivado")}
            texto="Archivar alumno"
            variante="peligro"
            confirmacion={`¿Archivar a ${alumno.nombres}? Su historial se conserva y podrás reactivarlo cuando quieras.`}
          />
        )}
      </div>
    </>
  );
}

/** Botón redondo de la ficha (llamar, correo…); sin destino se muestra desactivado. */
function AccionContacto({ icono: Icono, texto, href }: { icono: LucideIcon; texto: string; href?: string }) {
  const clase = "flex flex-col items-center gap-1 rounded-2xl bg-tinta/[0.045] py-2.5 text-xs font-semibold";
  const contenido = (
    <>
      <Icono aria-hidden className="size-5" strokeWidth={2.2} />
      {texto}
    </>
  );
  if (!href) {
    return <span aria-disabled className={`${clase} text-tinta/30`}>{contenido}</span>;
  }
  return (
    <Link href={href} className={`${clase} text-acento transition-colors hover:bg-acento/10 active:scale-[0.97]`}>
      {contenido}
    </Link>
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
    <Tarjeta className="flex flex-col p-4">
      <p className="text-sm font-medium text-tenue">{etiqueta}</p>
      <p className={`mt-auto pt-3 leading-none ${pequena ? "text-xl font-bold tracking-tight" : "cifra text-5xl font-semibold"}`}>
        {valor}
        {unidad && <span className="ml-1 font-sans text-base font-medium text-tenue">{unidad}</span>}
      </p>
      {detalle && <p className="mt-2 text-xs text-tenue">{detalle}</p>}
    </Tarjeta>
  );
}
