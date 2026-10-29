import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { SelectorTema } from "@/components/app/selector-tema";
import { Esqueleto } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { fechaCorta } from "@/lib/formato";
import { obtenerContexto, obtenerCuenta } from "@/lib/sesion";
import { googleConfigurado } from "@/lib/google/calendario";
import { TarjetaGoogle } from "./google";
import { TarjetaPaginaPublica } from "./pagina-publica";
import { TarjetaPerfil } from "./perfil";

export const metadata: Metadata = { title: "Ajustes" };

const ROL: Record<string, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  entrenador: "Entrenador",
  asistente: "Asistente",
};

const PROVEEDOR: Record<string, string> = { email: "Correo y contraseña", google: "Google" };

export default function PaginaAjustes({ searchParams }: PageProps<"/configuracion">) {
  return (
    <>
      <Encabezado titulo="Ajustes" miga="Cuenta" />
      {/* Columnas en minmax(0,…): sin eso, un correo largo ensancha la tarjeta y la página se desplaza de lado en el celular. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <Suspense fallback={<Esqueleto className="h-48" />}>
            <PaginaPublica />
          </Suspense>
          <Suspense fallback={<Esqueleto className="h-80" />}>
            <MiPerfil />
          </Suspense>
        </div>
        <div className="min-w-0 space-y-4">
          <Suspense fallback={<Esqueleto className="h-48" />}>
            <Google searchParams={searchParams} />
          </Suspense>
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="titulo-apariencia">
              <CabeceraTarjeta id="titulo-apariencia" titulo="Apariencia" />
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="text-sm text-tenue">Cambia entre el modo claro y el oscuro.</p>
                <SelectorTema />
              </div>
            </section>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}

async function Google({ searchParams }: { searchParams: PageProps<"/configuracion">["searchParams"] }) {
  const [{ google }, { supabase, usuarioId }] = await Promise.all([searchParams, obtenerContexto()]);
  const { data: conexion } = await supabase
    .from("conexiones_google")
    .select("correo_google, conectado_en")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return <TarjetaGoogle resultado={typeof google === "string" ? google : undefined} conexion={conexion} configurado={googleConfigurado()} />;
}

async function PaginaPublica() {
  const { supabase, usuarioId, organizacionId } = await obtenerContexto();
  const [{ data: espacio }, { data: membresia }] = await Promise.all([
    supabase.from("organizaciones").select("slug, pagina_publica").eq("id", organizacionId).single(),
    supabase.from("miembros_organizacion").select("rol").eq("organizacion_id", organizacionId).eq("usuario_id", usuarioId).maybeSingle(),
  ]);
  if (!espacio) return null;
  return (
    <TarjetaPaginaPublica
      activa={espacio.pagina_publica}
      slug={espacio.slug}
      editable={membresia?.rol === "propietario" || membresia?.rol === "admin"}
    />
  );
}

async function MiPerfil() {
  const { perfil, correo, proveedores, rol, miembroDesde, espacio } = await obtenerCuenta();
  const nombre = perfil ? `${perfil.nombres} ${perfil.apellidos}`.trim() : "";
  const filas: [string, string][] = [
    ["Correo", correo ?? "—"],
    ["Rol", rol ? ROL[rol] ?? rol : "—"],
    ["Espacio de trabajo", espacio ?? "—"],
    ["Ingresa con", proveedores.length ? proveedores.map((p) => PROVEEDOR[p] ?? p).join(" y ") : "—"],
    ["Miembro desde", fechaCorta(miembroDesde)],
  ];

  return <TarjetaPerfil nombre={nombre} correo={correo} perfil={perfil} filas={filas} />;
}
