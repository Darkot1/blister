import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarPlus, Mail, Pencil, Phone } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { LineaTendencia } from "@/components/datos/linea-tendencia";
import { EnlaceBoton } from "@/components/ui/boton";
import { Avatar } from "@/components/ui/avatar";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { CabeceraTarjeta, Lista, Tarjeta } from "@/components/ui/tarjeta";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { ETIQUETA_TIPO_OBJETIVO, edad, fechaCorta, fechaHora, numero } from "@/lib/formato";
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
      <Esqueleto className="h-20 w-80" />
      <Esqueleto className="h-36 w-full" />
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
      .select("tipo, nombre, fecha_meta")
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
        volver={{ href: "/alumnos", texto: "Alumnos" }}
        figura={<Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="xl" />}
        titulo={`${alumno.nombres} ${alumno.apellidos}`}
        descripcion={
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <InsigniaEstado estado={alumno.estado} />
            {alumno.telefono && (
              <a href={`tel:${alumno.telefono}`} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 font-mono text-xs hover:border-tinta/30 hover:text-tinta">
                <Phone aria-hidden className="size-3" /> {alumno.telefono}
              </a>
            )}
            {alumno.correo && (
              <a href={`mailto:${alumno.correo}`} className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 font-mono text-xs hover:border-tinta/30 hover:text-tinta">
                <Mail aria-hidden className="size-3 shrink-0" /> <span className="truncate">{alumno.correo}</span>
              </a>
            )}
          </span>
        }
        acciones={
          <>
            {!archivado && (
              <EnlaceBoton href={`/calendario?alumno=${alumno.id}`} variante="secundario">
                <CalendarPlus aria-hidden className="size-4" /> Agendar
              </EnlaceBoton>
            )}
            <EnlaceBoton href={`/alumnos/${alumno.id}/editar`}>
              <Pencil aria-hidden className="size-4" /> Editar
            </EnlaceBoton>
          </>
        }
      />

      {/* Bento de cifras clave: lo primero que el entrenador busca. */}
      <section aria-label="Resumen" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col rounded-[var(--radius-tarjeta)] bg-panel p-4 text-white lg:col-span-1">
          <p className="etiqueta text-white/50">Peso actual</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            <p className="cifra text-5xl leading-none font-semibold">
              {numero(pesoActual)}
              {pesoActual !== null && <span className="ml-1 text-base font-normal tracking-normal text-white/50">kg</span>}
            </p>
            <LineaTendencia
              valores={[...conPeso].reverse().map((m) => m.peso_kg as number)}
              etiqueta={`Tendencia de peso en ${conPeso.length} mediciones`}
              className="text-white"
            />
          </div>
          <p className="mt-2 text-xs text-white/55">
            {cambioPeso !== null
              ? `${cambioPeso > 0 ? "+" : ""}${numero(cambioPeso)} kg desde la primera medición`
              : conPeso.length ? `Medido el ${fechaCorta(conPeso[0].medido_en)}` : "Sin mediciones"}
          </p>
        </div>
        <Cifra etiqueta="Edad" valor={anios !== null ? String(anios) : "—"} unidad={anios !== null ? "años" : undefined}
          detalle={alumno.fecha_nacimiento ? fechaCorta(alumno.fecha_nacimiento) : "Sin fecha de nacimiento"} />
        <Cifra etiqueta="Desde" valor={fechaCorta(alumno.fecha_inicio)} pequena detalle="Entrena contigo" />
        <Cifra etiqueta="Objetivo principal" valor={objetivo?.nombre ?? "Sin definir"} pequena className="col-span-2 lg:col-span-1"
          detalle={
            objetivo
              ? [
                  objetivo.nombre !== ETIQUETA_TIPO_OBJETIVO[objetivo.tipo] ? ETIQUETA_TIPO_OBJETIVO[objetivo.tipo] : null,
                  objetivo.fecha_meta ? `Meta: ${fechaCorta(objetivo.fecha_meta)}` : null,
                ].filter(Boolean).join(" · ") || undefined
              : archivado ? undefined : "Defínelo en Editar"
          } />
      </section>

      <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Tarjeta className="min-w-0 overflow-hidden">
          <section aria-labelledby="titulo-mediciones">
            <CabeceraTarjeta
              id="titulo-mediciones"
              titulo={`Mediciones${historial.length ? ` · ${historial.length}` : ""}`}
            />
            {!archivado && <div className="border-b border-linea p-4"><FormularioMedicion accion={registrarMedicion.bind(null, alumno.id)} hoy={hoy} /></div>}
            {historial.length === 0 ? (
              <p className="px-4 py-6 text-sm text-tenue">
                Todavía no hay mediciones. La primera servirá como punto de partida para ver el progreso.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="etiqueta bg-fondo/60 text-left">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">Fecha</th>
                      {columnas.map((c) => (
                        <th key={c.clave} scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{c.titulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {historial.map((m) => (
                      <tr key={m.id} className="hover:bg-fondo/50">
                        <th scope="row" className="px-4 py-2.5 text-left font-medium whitespace-nowrap">{fechaCorta(m.medido_en)}</th>
                        {columnas.map((c) => (
                          <td key={c.clave} className="cifra px-3 py-2.5 text-right font-mono text-[0.8rem] tracking-normal">{numero(m[c.clave] as number | null)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Tarjeta>

        <Tarjeta className="min-w-0 overflow-hidden">
          <section aria-labelledby="titulo-notas">
            <CabeceraTarjeta id="titulo-notas" titulo={`Notas${notas?.length ? ` · ${notas.length}` : ""}`} />
            <div className="border-b border-linea p-4"><FormularioNota accion={agregarNota.bind(null, alumno.id)} /></div>
            {notas?.length ? (
              <Lista ordenada>
                {notas.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <p className="text-sm whitespace-pre-line">{n.contenido}</p>
                    <p className="mt-1.5 font-mono text-[0.7rem] text-tenue">
                      {fechaHora(n.creado_en)}{autores.get(n.autor_id) ? ` · ${autores.get(n.autor_id)}` : ""}
                    </p>
                  </li>
                ))}
              </Lista>
            ) : (
              <p className="px-4 py-6 text-sm text-tenue">Sin notas todavía.</p>
            )}
          </section>
        </Tarjeta>
      </div>

      {/* Zona de riesgo aparte, al final. */}
      <Tarjeta className="mt-8 flex flex-wrap items-center justify-between gap-4 border-dashed p-4">
        <div>
          <p className="text-sm font-medium">{archivado ? "Alumno archivado" : "Archivar alumno"}</p>
          <p className="text-sm text-tenue">
            {archivado ? "Reactívalo para volver a agendar y registrar mediciones." : "Deja de aparecer en tus listas; su historial se conserva."}
          </p>
        </div>
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
      </Tarjeta>
    </>
  );
}

function Cifra({
  etiqueta,
  valor,
  unidad,
  detalle,
  pequena = false,
  className = "",
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  detalle?: string;
  pequena?: boolean;
  className?: string;
}) {
  return (
    <Tarjeta className={`flex flex-col p-4 ${className}`}>
      <p className="etiqueta">{etiqueta}</p>
      <p className={`mt-auto pt-5 leading-tight ${pequena ? "text-lg font-semibold tracking-tight" : "cifra text-5xl leading-none font-semibold"}`}>
        {valor}
        {unidad && <span className="ml-1 text-base font-normal tracking-normal text-tenue">{unidad}</span>}
      </p>
      {detalle && <p className="mt-2 text-xs text-tenue">{detalle}</p>}
    </Tarjeta>
  );
}
