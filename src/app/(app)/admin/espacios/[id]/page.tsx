import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarDays, ClipboardList, GraduationCap, LayoutTemplate, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { Avatar } from "@/components/ui/avatar";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { CabeceraTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { ETIQUETA_ESTADO_CITA, ETIQUETA_TIPO_CITA, fechaCorta, fechaHora } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { CitasPorEstado, Cifra, InsigniaEspacio, ListaActividad, ROL } from "../../comun";
import type { Detalle } from "../../tipos";
import { CambioEstado } from "./cambio-estado";

export const metadata: Metadata = { title: "Espacio · Administración" };

export default function PaginaEspacio({ params }: PageProps<"/admin/espacios/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <DetalleEspacio params={params} />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div className="space-y-4" role="status" aria-label="Cargando espacio">
      <Esqueleto className="h-20 w-80" />
      <Esqueleto className="h-28 w-full" />
      <EsqueletoLista filas={4} />
    </div>
  );
}

const ESTADO_PLAN: Record<string, string> = { borrador: "Borrador", activo: "Activo", completado: "Completado", archivado: "Archivado" };

const nombreCompleto = (m: { nombres: string; apellidos: string }) => `${m.nombres} ${m.apellidos}`.trim();

const claseTh = "etiqueta px-3 py-2.5 font-medium first:pl-4 last:pr-4";
const claseTd = "px-3 py-2.5 first:pl-4 last:pr-4";

async function DetalleEspacio({ params }: { params: PageProps<"/admin/espacios/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, organizacionId } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_detalle_espacio", { p_organizacion_id: id });
  if (error) throw new Error("No se pudo cargar el espacio.");
  if (!data) notFound();
  const { espacio, miembros, alumnos, totales, citas_30d, proximas_citas, planes, plantillas, actividad } = data as unknown as Detalle;

  const nombreDe = new Map(miembros.map((m) => [m.usuario_id, nombreCompleto(m) || m.correo || "Sin nombre"]));
  const activos = alumnos.filter((a) => a.estado === "activo").length;

  return (
    <>
      <Encabezado
        volver={{ href: "/admin", texto: "Administración" }}
        titulo={espacio.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <InsigniaEspacio estado={espacio.estado} />
            <span className="text-sm">Creado el {fechaCorta(espacio.creado_en)} · {espacio.zona_horaria} · /{espacio.slug}</span>
          </span>
        }
        acciones={
          <CambioEstado id={espacio.id} nombre={espacio.nombre} estado={espacio.estado} esPropio={espacio.id === organizacionId} />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-linea sm:grid-cols-4 lg:grid-cols-8">
        <Cifra titulo="Miembros" valor={miembros.length} />
        <Cifra titulo="Alumnos" valor={alumnos.length} nota={`${activos} activos`} />
        <Cifra titulo="Planes" valor={totales.planes} />
        <Cifra titulo="Plantillas" valor={totales.plantillas} />
        <Cifra titulo="Sesiones" valor={totales.sesiones} />
        <Cifra titulo="Citas" valor={totales.citas} />
        <Cifra titulo="Mediciones" valor={totales.mediciones} />
        <Cifra titulo="Ejercicios propios" valor={totales.ejercicios_propios} nota={`${totales.musculos_propios} músculos propios`} />
      </div>

      <div className="space-y-4">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-miembros">
              <CabeceraTarjeta id="titulo-miembros" titulo={`Entrenadores y miembros · ${miembros.length}`} />
              {miembros.length === 0 ? (
                <Vacio icono={<Users className="size-5" />} titulo="Sin miembros" texto="Nadie tiene acceso a este espacio." className="m-4" />
              ) : (
                <ul className="divide-y divide-linea">
                  {miembros.map((m) => (
                    <li key={m.usuario_id} className="flex items-start gap-3 px-4 py-3">
                      <FotoPerfil url={m.avatar_url} nombres={m.nombres} apellidos={m.apellidos} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{nombreCompleto(m) || "Sin nombre"}</p>
                        <p className="truncate text-sm text-tenue">{m.correo ?? "—"}</p>
                        <p className="mt-1 text-xs text-tenue">
                          {ROL[m.rol] ?? m.rol}
                          {m.estado !== "activo" ? ` · ${m.estado}` : ""} · desde {fechaCorta(m.creado_en)} · último ingreso{" "}
                          {m.ultimo_ingreso ? fechaHora(m.ultimo_ingreso) : "nunca"}
                        </p>
                      </div>
                      <dl className="grid shrink-0 grid-cols-3 gap-4 text-right">
                        {([["Alumnos", m.alumnos], ["Próximas", m.citas_proximas], ["Hechas 30 d", m.citas_completadas_30d]] as const).map(([t, v]) => (
                          <div key={t}>
                            <dd className="cifra text-lg leading-tight font-semibold">{v}</dd>
                            <dt className="etiqueta text-[0.6rem] whitespace-nowrap">{t}</dt>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Tarjeta>

          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-citas">
              <CabeceraTarjeta id="titulo-citas" titulo="Citas · últimos 30 días" />
              <CitasPorEstado conteo={citas_30d} />
            </section>
          </Tarjeta>
        </div>

        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-alumnos">
            <CabeceraTarjeta id="titulo-alumnos" titulo={`Alumnos · ${alumnos.length}`} />
            {alumnos.length === 0 ? (
              <Vacio icono={<GraduationCap className="size-5" />} titulo="Sin alumnos" texto="Este espacio aún no ha registrado alumnos." className="m-4" />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[60rem] text-sm">
                  <thead>
                    <tr className="border-b border-linea text-left whitespace-nowrap">
                      <th scope="col" className={claseTh}>Alumno</th>
                      <th scope="col" className={claseTh}>Entrenador</th>
                      <th scope="col" className={claseTh}>Objetivo</th>
                      <th scope="col" className={`${claseTh} text-right`}>Planes</th>
                      <th scope="col" className={`${claseTh} text-right`}>Sesiones</th>
                      <th scope="col" className={claseTh}>Última sesión</th>
                      <th scope="col" className={`${claseTh} text-right`}>Medidas</th>
                      <th scope="col" className={claseTh}>Próxima cita</th>
                      <th scope="col" className={claseTh}>Desde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {alumnos.map((a) => (
                      <tr key={a.id}>
                        <td className={claseTd}>
                          <div className="flex items-center gap-2.5">
                            <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} tamano="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{nombreCompleto(a)}</p>
                              <InsigniaEstado estado={a.estado} />
                            </div>
                          </div>
                        </td>
                        <td className={`${claseTd} text-tenue`}>
                          {a.entrenadores.length ? a.entrenadores.map((e) => nombreDe.get(e) ?? "Ex miembro").join(", ") : "Sin asignar"}
                        </td>
                        <td className={`${claseTd} max-w-48 truncate text-tenue`}>{a.objetivo ?? "—"}</td>
                        <td className={`${claseTd} cifra text-right`}>{a.planes_activos}</td>
                        <td className={`${claseTd} cifra text-right`}>{a.sesiones_completadas}</td>
                        <td className={`${claseTd} whitespace-nowrap text-tenue`}>{fechaCorta(a.ultima_sesion)}</td>
                        <td className={`${claseTd} cifra text-right`} title={a.ultima_medicion ? `Última: ${fechaCorta(a.ultima_medicion)}` : undefined}>
                          {a.mediciones}
                        </td>
                        <td className={`${claseTd} whitespace-nowrap text-tenue`}>{a.proxima_cita ? fechaHora(a.proxima_cita) : "—"}</td>
                        <td className={`${claseTd} whitespace-nowrap text-tenue`}>{fechaCorta(a.fecha_inicio ?? a.creado_en)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Tarjeta>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-proximas">
              <CabeceraTarjeta id="titulo-proximas" titulo="Próximas citas" />
              {proximas_citas.length === 0 ? (
                <Vacio icono={<CalendarDays className="size-5" />} titulo="Sin citas próximas" texto="No hay citas programadas ni confirmadas." className="m-4" />
              ) : (
                <ul className="divide-y divide-linea">
                  {proximas_citas.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <time dateTime={c.inicia_en} className="w-36 shrink-0 font-medium whitespace-nowrap">{fechaHora(c.inicia_en)}</time>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{c.alumno}</p>
                        <p className="truncate text-xs text-tenue">
                          {ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo} · con {c.entrenador ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-tenue">{ETIQUETA_ESTADO_CITA[c.estado] ?? c.estado}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Tarjeta>

          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-planes">
              <CabeceraTarjeta id="titulo-planes" titulo={`Planes · ${totales.planes}`} />
              {planes.length === 0 ? (
                <Vacio icono={<ClipboardList className="size-5" />} titulo="Sin planes" texto="Aún no se ha asignado ningún plan." className="m-4" />
              ) : (
                <ul className="divide-y divide-linea">
                  {planes.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.nombre}</p>
                        <p className="truncate text-xs text-tenue">
                          {p.alumno} · {fechaCorta(p.fecha_inicio)}
                          {p.fecha_fin ? ` → ${fechaCorta(p.fecha_fin)}` : ""}
                          {p.creado_por ? ` · por ${p.creado_por}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs ${p.estado === "activo" ? "font-medium text-exito" : "text-tenue"}`}>
                        {ESTADO_PLAN[p.estado] ?? p.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Tarjeta>

          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-plantillas">
              <CabeceraTarjeta id="titulo-plantillas" titulo={`Plantillas · ${totales.plantillas}`} />
              {plantillas.length === 0 ? (
                <Vacio icono={<LayoutTemplate className="size-5" />} titulo="Sin plantillas" texto="Aún no ha creado plantillas de rutina." className="m-4" />
              ) : (
                <ul className="divide-y divide-linea">
                  {plantillas.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.nombre}</p>
                        <p className="truncate text-xs text-tenue">
                          Creada {fechaCorta(t.creado_en)}
                          {t.estado === "borrador" ? " · borrador" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-tenue">
                        <span className="cifra font-medium text-tinta">{t.asignaciones}</span> asignaciones
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Tarjeta>

          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-actividad">
              <CabeceraTarjeta id="titulo-actividad" titulo="Actividad reciente" />
              <ListaActividad actividad={actividad} />
            </section>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
