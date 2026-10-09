import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, EnlaceTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { fechaCorta, fechaHora } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { CitasPorEstado, Cifra, GraficaSemanas, InsigniaEspacio, ListaActividad, PestanasAdmin } from "./comun";
import type { Panel } from "./tipos";

export const metadata: Metadata = { title: "Administración" };

export default function PaginaAdmin() {
  return (
    <>
      <Encabezado
        titulo="Administración"
        miga="Plataforma"
        descripcion="Todos los espacios de trabajo, entrenadores y alumnos de Blister."
        acciones={<PestanasAdmin activa="resumen" />}
      />
      <Suspense fallback={<Cargando />}>
        <Resumen />
      </Suspense>
    </>
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-28" />)}
      </div>
      <Esqueleto className="h-56" />
      <EsqueletoLista filas={4} />
    </div>
  );
}

async function Resumen() {
  const { supabase } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_panel");
  if (error || !data) throw new Error("No se pudo cargar el resumen de la plataforma.");
  const { totales: t, citas_30d, semanas, espacios, actividad } = data as unknown as Panel;

  const principales = [
    { titulo: "Espacios", valor: t.espacios, nota: `${t.espacios_activos} activos · ${t.espacios_suspendidos} ${t.espacios_suspendidos === 1 ? "suspendido" : "suspendidos"}` },
    { titulo: "Usuarios", valor: t.usuarios, nota: `${t.usuarios_nuevos_30d} nuevos en 30 días` },
    { titulo: "Alumnos", valor: t.alumnos, nota: `${t.alumnos_activos} activos · ${t.alumnos_nuevos_30d} nuevos en 30 días` },
    { titulo: "Activos · 7 días", valor: t.usuarios_activos_7d, nota: "Usuarios que ingresaron esta semana" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {principales.map((c, i) => (
          <div
            key={c.titulo}
            className={`rounded-[var(--radius-tarjeta)] border p-4 ${i === 0 ? "border-panel bg-panel text-white" : "border-linea bg-superficie"}`}
          >
            <p className={`etiqueta ${i === 0 ? "text-white/60" : ""}`}>{c.titulo}</p>
            <p className="cifra mt-3 text-[2.2rem] leading-none font-semibold">{c.valor}</p>
            <p className={`mt-2 text-sm ${i === 0 ? "text-white/60" : "text-tenue"}`}>{c.nota}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-linea sm:grid-cols-3 lg:grid-cols-6">
        <Cifra titulo="Planes activos" valor={t.planes_activos} />
        <Cifra titulo="Plantillas" valor={t.plantillas} />
        <Cifra titulo="Sesiones · 30 d" valor={t.sesiones_completadas_30d} nota="Completadas" />
        <Cifra titulo="Mediciones · 30 d" valor={t.mediciones_30d} />
        <Cifra titulo="Ejercicios globales" valor={t.ejercicios_globales} />
        <Cifra titulo="Ejercicios propios" valor={t.ejercicios_propios} nota="Creados por los espacios" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-crecimiento">
            <CabeceraTarjeta id="titulo-crecimiento" titulo="Registros por semana · 12 semanas" />
            <GraficaSemanas
              titulo="Usuarios y alumnos nuevos por semana"
              semanas={semanas}
              series={[
                { clave: "usuarios", texto: "Usuarios", color: "bg-acento" },
                { clave: "alumnos", texto: "Alumnos", color: "bg-tinta" },
              ]}
            />
          </section>
        </Tarjeta>
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-citas">
            <CabeceraTarjeta id="titulo-citas" titulo="Citas · ±30 días" />
            <CitasPorEstado conteo={citas_30d} />
          </section>
        </Tarjeta>
      </div>

      <Tarjeta className="overflow-hidden">
        <section aria-labelledby="titulo-citas-semana">
          <CabeceraTarjeta id="titulo-citas-semana" titulo="Citas por semana · 12 semanas" />
          <GraficaSemanas
            titulo="Citas por semana"
            semanas={semanas}
            series={[{ clave: "citas", texto: "Citas", color: "bg-tinta/70" }]}
          />
        </section>
      </Tarjeta>

      {espacios.length === 0 ? (
        <Vacio icono={<Building2 className="size-5" />} titulo="Aún no hay espacios" texto="Cada entrenador que se registra crea el suyo." />
      ) : (
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-espacios">
            <CabeceraTarjeta id="titulo-espacios" titulo={`Espacios de trabajo · ${espacios.length}`} />
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-linea text-left whitespace-nowrap">
                    <th scope="col" className="etiqueta px-4 py-2.5 font-medium">Espacio</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 text-right font-medium">Miembros</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 text-right font-medium">Alumnos</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 text-right font-medium">Planes</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 text-right font-medium">Citas 30 d</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Último ingreso</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Actividad</th>
                    <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Creado</th>
                    <th scope="col"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {espacios.map((e) => (
                    <tr key={e.id} className="hover:bg-tinta/[0.03]">
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-2 font-medium">
                          <Link href={`/admin/espacios/${e.id}`} className="truncate hover:underline">
                            {e.nombre}
                          </Link>
                          <InsigniaEspacio estado={e.estado} />
                        </p>
                        <p className="truncate text-tenue">
                          {e.propietario ?? "Sin propietario"}
                          {e.propietario_correo ? ` · ${e.propietario_correo}` : ""}
                        </p>
                      </td>
                      <td className="cifra px-3 py-3 text-right">{e.miembros}</td>
                      <td className="cifra px-3 py-3 text-right">
                        {e.alumnos}
                        <span className="block text-xs text-tenue">{e.alumnos_activos} activos</span>
                      </td>
                      <td className="cifra px-3 py-3 text-right">{e.planes_activos}</td>
                      <td className="cifra px-3 py-3 text-right">{e.citas_30d}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-tenue">{e.ultimo_ingreso ? fechaHora(e.ultimo_ingreso) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-tenue">{e.ultima_actividad ? fechaHora(e.ultima_actividad) : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-tenue">{fechaCorta(e.creado_en)}</td>
                      <td className="pr-4">
                        <Link href={`/admin/espacios/${e.id}`} aria-label={`Abrir ${e.nombre}`} className="grid size-8 place-items-center rounded-lg text-tenue hover:bg-tinta/[0.06] hover:text-tinta">
                          <ChevronRight aria-hidden className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Tarjeta>
      )}

      <Tarjeta className="overflow-hidden">
        <section aria-labelledby="titulo-actividad">
          <CabeceraTarjeta id="titulo-actividad" titulo="Actividad reciente" accion={<EnlaceTarjeta href="/admin/accesos">Bitácora</EnlaceTarjeta>} />
          <ListaActividad actividad={actividad} conEspacio />
        </section>
      </Tarjeta>
    </div>
  );
}
