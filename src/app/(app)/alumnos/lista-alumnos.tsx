import Form from "next/form";
import { Plus } from "lucide-react";
import { Grupo, Pila } from "@/components/ui/disposicion";
import { CampoBusqueda } from "@/components/ui/campo-busqueda";
import { Chip, GrupoFiltros } from "@/components/ui/filtros";
import { ListaFilas, Fila } from "@/components/ui/lista-filas";
import { Avatar } from "@/components/ui/avatar";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Aviso } from "@/components/ui/aviso";
import { EnlaceBoton } from "@/components/ui/boton";
import { Enlace } from "@/components/ui/enlace";
import { Texto } from "@/components/ui/texto";
import { edad, fechaCorta, iniciales } from "@/lib/formato";
import type { AlumnoFila } from "@/lib/supabase/tipos-bd";
import css from "./lista-alumnos.module.css";

export const FILTROS_ESTADO = [
  { valor: "activo", texto: "Activos" },
  { valor: "inactivo", texto: "Inactivos" },
  { valor: "archivado", texto: "Archivados" },
  { valor: "todos", texto: "Todos" },
] as const;

export type FiltroEstado = (typeof FILTROS_ESTADO)[number]["valor"];

/** Estado de la URL: un valor desconocido se ignora y vuelve a "activo". */
export function filtroEstado(valor: unknown): FiltroEstado {
  return FILTROS_ESTADO.find((f) => f.valor === valor)?.valor ?? "activo";
}

export type AlumnoLista = Pick<
  AlumnoFila,
  "id" | "nombres" | "apellidos" | "fecha_nacimiento" | "telefono" | "fecha_inicio" | "estado"
>;

const NOMBRE_FILTRO: Record<FiltroEstado, string> = {
  activo: "activos",
  inactivo: "inactivos",
  archivado: "archivados",
  todos: "",
};

const hrefFiltro = (estado: FiltroEstado) => (estado === "activo" ? "/alumnos" : `/alumnos?estado=${estado}`);

/** Búsqueda + filtro de estado. Todo vive en la URL (?q=&estado=). */
export function FiltrosAlumnos({ q, estado }: { q: string; estado: FiltroEstado }) {
  return (
    <Form action="/alumnos" className={css.filtros}>
      {/* Botón por defecto del formulario: al pulsar Enter en la búsqueda se conserva el estado elegido. */}
      <button type="submit" name="estado" value={estado} className="sr-only" tabIndex={-1} aria-hidden>
        Buscar
      </button>
      <CampoBusqueda
        etiqueta="Buscar alumno"
        defaultValue={q}
        placeholder="Buscar por nombre, apellido o teléfono"
        className={css.busqueda}
      />
      <GrupoFiltros etiqueta="Filtrar por estado" variante="segmentado" className={css.estados}>
        {FILTROS_ESTADO.map((f) => (
          <Chip key={f.valor} type="submit" name="estado" value={f.valor} activo={estado === f.valor}>
            {f.texto}
          </Chip>
        ))}
      </GrupoFiltros>
    </Form>
  );
}

/** Contenido de la lista: filas, estados vacíos o error. */
export function ListaAlumnos({
  alumnos,
  q,
  estado,
  error = false,
}: {
  alumnos: AlumnoLista[];
  q: string;
  estado: FiltroEstado;
  error?: boolean;
}) {
  if (error) return <Aviso>No se pudieron cargar los alumnos. Recarga la página.</Aviso>;

  if (!alumnos.length) {
    if (q) {
      return (
        <EstadoVacio
          titulo={`Ningún alumno coincide con «${q}»`}
          descripcion={
            estado === "todos"
              ? "Revisa cómo está escrito o busca por el teléfono."
              : `Solo buscaste entre los ${NOMBRE_FILTRO[estado]}. Búscalo en todos o revisa cómo está escrito.`
          }
          accion={
            <>
              {estado !== "todos" && (
                <EnlaceBoton href={`/alumnos?q=${encodeURIComponent(q)}&estado=todos`} variante="secundario">
                  Buscar en todos
                </EnlaceBoton>
              )}
              <EnlaceBoton href={hrefFiltro(estado)} variante="fantasma">
                Limpiar búsqueda
              </EnlaceBoton>
            </>
          }
        />
      );
    }
    if (estado === "inactivo" || estado === "archivado") {
      return (
        <EstadoVacio
          titulo={`No tienes alumnos ${NOMBRE_FILTRO[estado]}`}
          descripcion={
            estado === "inactivo"
              ? "Cuando pongas a un alumno en pausa desde Editar, aparecerá aquí y saldrá de tu lista de activos."
              : "Archiva desde su perfil a quien ya no entrena contigo: su historial se conserva y deja de aparecer en tu día a día."
          }
          accion={
            <EnlaceBoton href="/alumnos" variante="secundario">
              Ver activos
            </EnlaceBoton>
          }
        />
      );
    }
    return (
      <EstadoVacio
        titulo={estado === "todos" ? "Aún no tienes alumnos" : "No tienes alumnos activos"}
        descripcion={
          estado === "todos"
            ? "Registra al primero con su nombre; el resto de sus datos los completas cuando quieras."
            : "Registra a un alumno para empezar a planificar su entrenamiento. Los que pausaste o archivaste siguen en Todos."
        }
        accion={
          <>
            <EnlaceBoton href="/alumnos/nuevo" variante="secundario">
              <Plus aria-hidden /> Registrar alumno
            </EnlaceBoton>
            {estado !== "todos" && (
              <EnlaceBoton href="/alumnos?estado=todos" variante="fantasma">
                Ver todos
              </EnlaceBoton>
            )}
          </>
        }
      />
    );
  }

  const n = alumnos.length;
  const recuento = q
    ? `${n === 1 ? "1 alumno coincide" : `${n} alumnos coinciden`} con «${q}»`
    : `${n === 1 ? "1 alumno" : `${n} alumnos`}${NOMBRE_FILTRO[estado] ? ` ${n === 1 ? NOMBRE_FILTRO[estado].slice(0, -1) : NOMBRE_FILTRO[estado]}` : ""}`;

  return (
    <Pila espacio={2}>
      <Grupo espacio={3} className={css.recuento}>
        <Texto tamano="sm" tono="tenue" role="status">
          {recuento}
        </Texto>
        {q && (
          <Enlace href={hrefFiltro(estado)} variante="acento" className={css.limpiar}>
            Limpiar búsqueda
          </Enlace>
        )}
      </Grupo>
      <ListaFilas etiqueta="Alumnos">
        {alumnos.map((a) => {
          const anios = edad(a.fecha_nacimiento);
          // "34 años, 300 123 4567": frase con comas, sin separadores decorativos.
          const detalle = [anios !== null ? `${anios} años` : null, a.telefono].filter(Boolean).join(", ");
          return (
            <Fila
              key={a.id}
              href={`/alumnos/${a.id}`}
              inicio={<Avatar iniciales={iniciales(a.nombres, a.apellidos)} />}
              titulo={`${a.apellidos}, ${a.nombres}`}
              detalle={detalle || "Sin edad ni teléfono"}
              meta={a.fecha_inicio ? `Desde el ${fechaCorta(a.fecha_inicio)}` : "Sin fecha de inicio"}
              // El estado solo se marca cuando se sale de lo normal (pausa o archivo): entre activos sería ruido
              // repetido en cada fila, y en "Todos" así resaltan las excepciones.
              fin={<span className={css.estado}>{a.estado !== "activo" && <InsigniaEstado estado={a.estado} />}</span>}
            />
          );
        })}
      </ListaFilas>
    </Pila>
  );
}
