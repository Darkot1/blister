import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Building2 } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { fechaCorta } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { InsigniaEspacio, PestanasAdmin } from "./comun";

export const metadata: Metadata = { title: "Administración" };

export default function PaginaAdmin() {
  return (
    <>
      <Encabezado
        titulo="Administración"
        miga="Plataforma"
        descripcion="Todos los espacios de trabajo de Blister, en solo lectura."
        acciones={<PestanasAdmin activa="espacios" />}
      />
      <Suspense fallback={<Cargando />}>
        <Espacios />
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
      <EsqueletoLista filas={4} />
    </div>
  );
}

async function Espacios() {
  const { supabase } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_espacios");
  if (error) throw new Error("No se pudieron cargar los espacios.");
  const espacios = data ?? [];

  const suma = (f: (e: (typeof espacios)[number]) => number) => espacios.reduce((t, e) => t + f(e), 0);
  const cifras = [
    { titulo: "Espacios", valor: espacios.length, nota: `${espacios.filter((e) => e.estado === "activo").length} activos` },
    { titulo: "Suspendidos", valor: espacios.filter((e) => e.estado === "suspendido").length, nota: "Sin acceso" },
    { titulo: "Alumnos", valor: suma((e) => e.alumnos), nota: `${suma((e) => e.alumnos_activos)} activos` },
    { titulo: "Citas · 30 días", valor: suma((e) => e.citas_30d), nota: "En toda la plataforma" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cifras.map((c, i) => (
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

      {espacios.length === 0 ? (
        <Vacio icono={<Building2 className="size-5" />} titulo="Aún no hay espacios" texto="Cada entrenador que se registra crea el suyo." />
      ) : (
        <Tarjeta className="overflow-hidden">
          <CabeceraTarjeta titulo="Espacios de trabajo" />
          <ul className="divide-y divide-linea">
            {espacios.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/admin/espacios/${e.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-tinta/[0.03] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_repeat(3,5.5rem)_auto]"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{e.nombre}</span>
                      <InsigniaEspacio estado={e.estado} />
                    </p>
                    <p className="truncate text-sm text-tenue">
                      {e.propietario ?? "Sin propietario"}
                      {e.propietario_correo ? ` · ${e.propietario_correo}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-tenue md:hidden">
                      {e.miembros} miembros · {e.alumnos} alumnos · {e.citas_30d} citas en 30 días
                    </p>
                  </div>
                  <p className="hidden text-sm text-tenue md:block">
                    Creado {fechaCorta(e.creado_en)}
                    <br />
                    Actividad {fechaCorta(e.ultima_actividad)}
                  </p>
                  <Dato valor={e.miembros} texto="Miembros" />
                  <Dato valor={e.alumnos} texto="Alumnos" />
                  <Dato valor={e.citas_30d} texto="Citas 30 d" />
                  <ChevronRight aria-hidden className="size-4 text-tenue group-hover:text-tinta" />
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

function Dato({ valor, texto }: { valor: number; texto: string }) {
  return (
    <p className="hidden text-right md:block">
      <span className="cifra block text-lg leading-tight font-semibold">{valor}</span>
      <span className="etiqueta text-[0.6rem]">{texto}</span>
    </p>
  );
}
