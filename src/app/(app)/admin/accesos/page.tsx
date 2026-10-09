import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Eye, PauseCircle, PlayCircle, ScrollText } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { fechaHora } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { PestanasAdmin } from "../comun";

export const metadata: Metadata = { title: "Bitácora · Administración" };

const ACCION = {
  ver_espacio: { texto: "Consultó", icono: Eye, color: "text-tenue" },
  suspender: { texto: "Suspendió", icono: PauseCircle, color: "text-peligro" },
  reactivar: { texto: "Reactivó", icono: PlayCircle, color: "text-exito" },
} as const;

export default function PaginaAccesos() {
  return (
    <>
      <Encabezado
        titulo="Bitácora de accesos"
        miga="Plataforma"
        descripcion="Cada vez que un superadministrador abre un espacio o cambia su estado. Solo la ven los superadministradores."
        acciones={<PestanasAdmin activa="accesos" />}
      />
      <Suspense fallback={<EsqueletoLista filas={6} />}>
        <Accesos />
      </Suspense>
    </>
  );
}

async function Accesos() {
  const { supabase } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_accesos", { p_limite: 200 });
  if (error) throw new Error("No se pudo cargar la bitácora.");
  const accesos = data ?? [];

  if (accesos.length === 0) {
    return <Vacio icono={<ScrollText className="size-5" />} titulo="Sin registros" texto="Aquí aparecerá cada consulta o cambio de estado de un espacio." />;
  }

  return (
    <Tarjeta className="overflow-hidden">
      <CabeceraTarjeta titulo={`Últimos ${accesos.length} registros`} />
      <ul className="divide-y divide-linea">
        {accesos.map((a) => {
          const { texto, icono: Icono, color } = ACCION[a.accion];
          return (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <Icono aria-hidden className={`mt-0.5 size-4 shrink-0 ${color}`} />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <span className="font-medium">{a.superadmin ?? "Superadministrador"}</span> {texto.toLowerCase()}{" "}
                  {a.espacio_id ? (
                    <Link href={`/admin/espacios/${a.espacio_id}`} className="font-medium underline decoration-linea underline-offset-2 hover:decoration-tinta">
                      {a.espacio ?? "un espacio"}
                    </Link>
                  ) : (
                    "un espacio eliminado"
                  )}
                </p>
                {a.motivo && <p className="mt-0.5 text-tenue">Motivo: {a.motivo}</p>}
              </div>
              <time dateTime={a.creado_en} className="shrink-0 text-xs text-tenue">{fechaHora(a.creado_en)}</time>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}
