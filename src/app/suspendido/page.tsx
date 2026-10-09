import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogOut, PauseCircle } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { EnlaceBoton } from "@/components/ui/boton";
import { salir } from "@/app/(auth)/acciones";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Espacio suspendido" };

/** A donde lleva `obtenerContexto` cuando el espacio del usuario no está activo. */
export default function PaginaSuspendido() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Marca className="mb-8" />
        <Suspense fallback={<div className="h-56 animate-pulse rounded-[var(--radius-tarjeta)] bg-tinta/[0.06]" />}>
          <Estado />
        </Suspense>
      </div>
    </main>
  );
}

async function Estado() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/ingresar");

  const { data: membresia } = await supabase
    .from("miembros_organizacion")
    .select("organizacion_id")
    .eq("usuario_id", usuarioId)
    .eq("estado", "activo")
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: espacio } = membresia
    ? await supabase.from("organizaciones").select("nombre, estado").eq("id", membresia.organizacion_id).maybeSingle()
    : { data: null };

  // Si ya lo reactivaron, de vuelta al panel.
  if (espacio?.estado === "activo") redirect("/inicio");

  return (
    <div className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-6">
      <div className="mb-4 grid size-11 place-items-center rounded-xl border border-linea text-aviso">
        <PauseCircle aria-hidden className="size-5" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {espacio?.estado === "archivado" ? "Este espacio está archivado" : "Tu espacio está suspendido"}
      </h1>
      <p className="mt-2 text-tenue">
        {espacio ? <>El acceso a <strong className="font-medium text-tinta">{espacio.nombre}</strong> está en pausa. </> : null}
        Tus datos siguen guardados y no se ha borrado nada. Escríbenos para reactivarlo.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <EnlaceBoton href="/inicio" variante="secundario">Volver a intentar</EnlaceBoton>
        <form action={salir}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-tenue hover:bg-tinta/[0.06] hover:text-tinta"
          >
            <LogOut aria-hidden className="size-4" /> Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
