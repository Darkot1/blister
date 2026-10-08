import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { seccion } from "@/components/app/secciones";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { Pila } from "@/components/ui/disposicion";
import { obtenerContexto } from "@/lib/sesion";
import { FiltrosAlumnos, ListaAlumnos, filtroEstado } from "./lista-alumnos";

export const metadata: Metadata = { title: "Alumnos" };

type Busqueda = PageProps<"/alumnos">["searchParams"];

export default function PaginaAlumnos({ searchParams }: PageProps<"/alumnos">) {
  return (
    <>
      <Encabezado
        titulo="Alumnos"
        acciones={
          <EnlaceBoton href="/alumnos/nuevo">
            <Plus aria-hidden /> Nuevo alumno
          </EnlaceBoton>
        }
      />
      <Suspense fallback={<CargandoAlumnos />}>
        <Alumnos searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function CargandoAlumnos() {
  return (
    <Pila espacio={6}>
      <Esqueleto alto="var(--alto-control)" ancho="100%" />
      <EsqueletoLista conAvatar />
    </Pila>
  );
}

async function Alumnos({ searchParams }: { searchParams: Busqueda }) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const estado = filtroEstado(parametros.estado);

  const { supabase } = await obtenerContexto();
  let consulta = supabase
    .from("alumnos")
    .select("id, nombres, apellidos, fecha_nacimiento, telefono, fecha_inicio, estado")
    .order("apellidos")
    .order("nombres")
    .limit(200);
  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  if (q) {
    const patron = `%${q.replace(/[%_,()]/g, " ")}%`;
    consulta = consulta.or(`nombres.ilike.${patron},apellidos.ilike.${patron},telefono.ilike.${patron}`);
  }
  const { data: alumnos, error } = await consulta;

  return (
    <Pila espacio={6}>
      <FiltrosAlumnos q={q} estado={estado} />
      <ListaAlumnos alumnos={alumnos ?? []} q={q} estado={estado} error={Boolean(error)} />
    </Pila>
  );
}
