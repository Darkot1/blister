import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Eye, GraduationCap, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { Avatar } from "@/components/ui/avatar";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { CabeceraTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { fechaCorta, fechaHora } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { InsigniaEspacio, ROL } from "../../comun";
import { CambioEstado } from "./cambio-estado";

export const metadata: Metadata = { title: "Espacio · Administración" };

type Miembro = {
  usuario_id: string;
  nombres: string;
  apellidos: string;
  avatar_url: string | null;
  correo: string | null;
  rol: string;
  estado: string;
  creado_en: string;
  ultimo_ingreso: string | null;
  alumnos: number;
  citas_proximas: number;
};

type Alumno = {
  id: string;
  nombres: string;
  apellidos: string;
  estado: string;
  fecha_inicio: string | null;
  creado_en: string;
  entrenadores: string[];
  planes_activos: number;
  sesiones_completadas: number;
  proxima_cita: string | null;
};

type Detalle = {
  espacio: { id: string; nombre: string; slug: string; estado: string; zona_horaria: string; creado_en: string };
  miembros: Miembro[];
  alumnos: Alumno[];
  totales: Record<"plantillas" | "planes" | "sesiones" | "citas" | "ejercicios_propios" | "musculos_propios", number>;
};

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

const nombreCompleto = (m: { nombres: string; apellidos: string }) => `${m.nombres} ${m.apellidos}`.trim();

async function DetalleEspacio({ params }: { params: PageProps<"/admin/espacios/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, organizacionId } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_detalle_espacio", { p_organizacion_id: id });
  if (error) throw new Error("No se pudo cargar el espacio.");
  if (!data) notFound();
  const { espacio, miembros, alumnos, totales } = data as unknown as Detalle;

  const nombreDe = new Map(miembros.map((m) => [m.usuario_id, nombreCompleto(m) || m.correo || "Sin nombre"]));
  const cifras: [string, number][] = [
    ["Alumnos", alumnos.length],
    ["Plantillas", totales.plantillas],
    ["Planes", totales.planes],
    ["Sesiones", totales.sesiones],
    ["Citas", totales.citas],
    ["Ejercicios propios", totales.ejercicios_propios],
  ];

  return (
    <>
      <Encabezado
        volver={{ href: "/admin", texto: "Administración" }}
        titulo={espacio.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <InsigniaEspacio estado={espacio.estado} />
            <span className="text-sm">Creado el {fechaCorta(espacio.creado_en)} · {espacio.zona_horaria}</span>
          </span>
        }
        acciones={
          <CambioEstado id={espacio.id} nombre={espacio.nombre} estado={espacio.estado} esPropio={espacio.id === organizacionId} />
        }
      />

      <p className="mb-4 flex items-center gap-2 text-sm text-tenue">
        <Eye aria-hidden className="size-4 shrink-0" />
        Vista de solo lectura. Esta consulta quedó registrada en la bitácora y el propietario del espacio puede verla.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-linea sm:grid-cols-3 lg:grid-cols-6">
        {cifras.map(([titulo, valor]) => (
          <div key={titulo} className="bg-superficie p-4">
            <p className="etiqueta">{titulo}</p>
            <p className="cifra mt-2 text-2xl leading-none font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
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
                        {m.estado !== "activo" ? ` · ${m.estado}` : ""} · último ingreso{" "}
                        {m.ultimo_ingreso ? fechaHora(m.ultimo_ingreso) : "nunca"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="cifra text-lg leading-tight font-semibold">{m.alumnos}</p>
                      <p className="etiqueta text-[0.6rem]">Alumnos</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Tarjeta>

        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-alumnos">
            <CabeceraTarjeta id="titulo-alumnos" titulo={`Alumnos · ${alumnos.length}`} />
            {alumnos.length === 0 ? (
              <Vacio icono={<GraduationCap className="size-5" />} titulo="Sin alumnos" texto="Este espacio aún no ha registrado alumnos." className="m-4" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-linea text-left whitespace-nowrap">
                      <th scope="col" className="etiqueta px-4 py-2.5 font-medium">Alumno</th>
                      <th scope="col" className="etiqueta px-4 py-2.5 font-medium">Entrenador</th>
                      <th scope="col" className="etiqueta px-4 py-2.5 text-right font-medium">Planes</th>
                      <th scope="col" className="etiqueta px-4 py-2.5 text-right font-medium">Sesiones</th>
                      <th scope="col" className="etiqueta px-4 py-2.5 font-medium">Próxima cita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {alumnos.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} tamano="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{nombreCompleto(a)}</p>
                              <InsigniaEstado estado={a.estado} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-tenue">
                          {a.entrenadores.length ? a.entrenadores.map((e) => nombreDe.get(e) ?? "Ex miembro").join(", ") : "Sin asignar"}
                        </td>
                        <td className="cifra px-4 py-2.5 text-right">{a.planes_activos}</td>
                        <td className="cifra px-4 py-2.5 text-right">{a.sesiones_completadas}</td>
                        <td className="px-4 py-2.5 text-tenue">{a.proxima_cita ? fechaHora(a.proxima_cita) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Tarjeta>
      </div>
    </>
  );
}
