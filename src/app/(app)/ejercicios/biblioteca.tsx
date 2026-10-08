import Form from "next/form";
import { Aviso } from "@/components/ui/aviso";
import { Boton, EnlaceBoton } from "@/components/ui/boton";
import { CampoBusqueda } from "@/components/ui/campo-busqueda";
import { Grupo, Pila, Rejilla } from "@/components/ui/disposicion";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Chip, GrupoFiltros } from "@/components/ui/filtros";
import { Fila, ListaFilas } from "@/components/ui/lista-filas";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { Texto } from "@/components/ui/texto";
import type { Rol, Sugerencia } from "@/lib/ejercicios/ranking";
import { SelectorMusculos } from "./selector-musculos";
import css from "./biblioteca.module.css";

export const TIPOS: Record<string, string> = {
  fuerza: "Fuerza",
  movilidad: "Movilidad",
  estiramiento: "Estiramiento",
  activacion: "Activación",
  cardio: "Cardio",
  calentamiento: "Calentamiento",
  enfriamiento: "Enfriamiento",
  otro: "Otros",
};

const DIFICULTAD: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

/** "a", "a y b", "a, b y c". */
function enumerar<T extends React.ReactNode>(partes: T[]): React.ReactNode[] {
  return partes.flatMap((p, i) => [
    i === 0 ? "" : i === partes.length - 1 ? " y " : ", ",
    p,
  ]);
}

/** Los nombres de músculo van en minúscula dentro de una frase: "Trabaja tríceps braquial". */
const enFrase = (nombre: string) => nombre.toLocaleLowerCase("es");

export type EjercicioLista = {
  id: string;
  nombre: string;
  tipo: string;
  dificultad: string | null;
};

export function CargandoEjercicios() {
  return (
    <Rejilla columnas="lateral" espacio={8}>
      <Tarjeta relleno="compacto" className={css.panelCargando}>
        <Esqueleto alto="100%" />
      </Tarjeta>
      <Pila espacio={8}>
        <Pila espacio={3}>
          <Esqueleto
            alto="var(--alto-control)"
            className={css.esqueletoBusqueda}
          />
          <Esqueleto alto="var(--alto-control-pequeno)" ancho="60%" />
        </Pila>
        <EsqueletoLista filas={8} />
      </Pila>
    </Rejilla>
  );
}

/**
 * Disposición de la biblioteca: panel del mapa (fijo a la izquierda en escritorio, plegable arriba en móvil)
 * + búsqueda, filtros por tipo y resultados (`children`).
 */
export function VistaEjercicios({
  musculos,
  seleccionados,
  q,
  tipo,
  tiposPresentes,
  error,
  total,
  children,
}: {
  musculos: { slug: string; nombre: string }[];
  seleccionados: string[];
  q: string;
  tipo: string;
  tiposPresentes: string[];
  error: boolean;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Rejilla columnas="lateral" espacio={8}>
      <Tarjeta
        as="aside"
        aria-label="Buscar por músculo"
        relleno="compacto"
        className={css.panel}
      >
        <SelectorMusculos musculos={musculos} seleccionados={seleccionados} />
      </Tarjeta>

      <Pila espacio={8} id="resultados" className={css.resultados}>
        {!error && total > 0 && (
          <Form action="/ejercicios" className={css.filtros}>
            {seleccionados.length > 0 && (
              <input type="hidden" name="m" value={seleccionados.join(",")} />
            )}
            <Grupo espacio={2} envolver={false}>
              <CampoBusqueda
                etiqueta="Buscar ejercicio"
                defaultValue={q}
                placeholder="Sentadilla, remo, plancha…"
              />
              {/* Primer botón de envío: Enter en el campo conserva el tipo elegido. */}
              <Boton
                type="submit"
                variante="secundario"
                name="tipo"
                value={tipo}
              >
                Buscar
              </Boton>
            </Grupo>
            {tiposPresentes.length > 1 && (
              <GrupoFiltros etiqueta="Filtrar por tipo">
                {[
                  ["", "Todos"] as const,
                  ...tiposPresentes.map((t) => [t, TIPOS[t]] as const),
                ].map(([valor, texto]) => (
                  <Chip
                    key={valor || "todos"}
                    type="submit"
                    name="tipo"
                    value={valor}
                    activo={tipo === valor}
                  >
                    {texto}
                  </Chip>
                ))}
              </GrupoFiltros>
            )}
          </Form>
        )}

        {error ? (
          <Aviso>
            No se pudieron cargar los ejercicios. Recarga la página.
          </Aviso>
        ) : total === 0 ? (
          <EstadoVacio
            titulo="Aún no hay ejercicios en la biblioteca"
            descripcion="Cuando se carguen ejercicios podrás buscarlos aquí por nombre o tocando en el mapa los músculos que quieres trabajar."
          />
        ) : (
          children
        )}
      </Pila>
    </Rejilla>
  );
}

export function Sugeridos({
  sugerencias,
  nombreDe,
  seleccionados,
  quitarFiltros,
}: {
  sugerencias: Sugerencia<EjercicioLista>[];
  nombreDe: Map<string, string>;
  /** Slugs elegidos en el mapa, en el orden en que se eligieron. */
  seleccionados: string[];
  /** URL sin búsqueda ni tipo, si hay alguno aplicado. */
  quitarFiltros?: string;
}) {
  const nombre = (slug: string) => nombreDe.get(slug) ?? slug;
  const total = seleccionados.length;

  if (!sugerencias.length) {
    return (
      <EstadoVacio
        titulo={
          quitarFiltros
            ? "Ningún ejercicio coincide con la búsqueda"
            : total > 1
              ? "Ningún ejercicio trabaja esos músculos"
              : "Aún no hay ejercicios para ese músculo"
        }
        descripcion={
          quitarFiltros
            ? "Quita la búsqueda o el filtro de tipo para ver todos los ejercicios de esos músculos."
            : total > 1
              ? "Quita algún músculo en el mapa para ver más opciones."
              : "Elige un músculo vecino en el mapa o busca el ejercicio por su nombre."
        }
        accion={
          quitarFiltros && (
            <EnlaceBoton variante="secundario" href={quitarFiltros}>
              Quitar búsqueda y filtro
            </EnlaceBoton>
          )
        }
      />
    );
  }

  const titulo =
    total <= 3
      ? `Para ${enumerar(seleccionados.map((s) => enFrase(nombre(s)))).join("")}`
      : `Para tus ${total} músculos`;
  const cantidad =
    sugerencias.length === 1 ? "1 ejercicio" : `${sugerencias.length} ejercicios`;

  return (
    <Seccion
      titulo={titulo}
      descripcion={`${cantidad}. Primero los que los trabajan como motor principal; la barra cargada indica cuánto se ajustan.`}
    >
      <ListaFilas as="ol">
        {sugerencias.map(({ ejercicio: e, relevancia, coincidencias }) => {
          const de = (rol: Rol) =>
            coincidencias.filter((c) => c.rol === rol).map((c) => enFrase(nombre(c.slug)));
          const datos = [
            [TIPOS[e.tipo], e.dificultad && DIFICULTAD[e.dificultad]?.toLocaleLowerCase("es")]
              .filter(Boolean)
              .join(", "),
            total > 1 &&
              (coincidencias.length === total
                ? total === 2
                  ? "Cubre los dos músculos elegidos"
                  : `Cubre los ${total} músculos elegidos`
                : `Cubre ${coincidencias.length} de ${total} músculos elegidos`),
          ].filter(Boolean);
          return (
            <Fila key={e.id}>
              <div className={css.sugerencia}>
                <div className={css.cabeceraSugerencia}>
                  <p className={css.nombre}>{e.nombre}</p>
                  <BarraCargada valor={relevancia} />
                </div>
                <p className={css.trabajo}>
                  <ComoTrabaja
                    principal={de("principal")}
                    secundario={de("secundario")}
                    estabilizador={de("estabilizador")}
                  />
                </p>
                <Texto tamano="sm" tono="tenue">
                  {datos.join(". ")}.
                </Texto>
              </div>
            </Fila>
          );
        })}
      </ListaFilas>
    </Seccion>
  );
}

/**
 * El rol de cada músculo elegido dicho en una frase, sin rótulos:
 * "Trabaja **pectoral esternal**, con ayuda de tríceps braquial, y usa recto abdominal para estabilizar."
 * El motor principal va en negrita y tinta; el resto, en tono tenue.
 */
function ComoTrabaja({
  principal,
  secundario,
  estabilizador,
}: {
  principal: string[];
  secundario: string[];
  estabilizador: string[];
}) {
  const partes: React.ReactNode[] = [];
  if (principal.length) {
    partes.push(
      <span key="p">
        Trabaja{" "}
        {enumerar(principal.map((m) => <strong key={m} className={css.motor}>{m}</strong>))}
      </span>,
    );
  }
  if (secundario.length) {
    partes.push(
      <span key="s">
        {principal.length ? "con ayuda de " : "Trabaja como apoyo "}
        {enumerar(secundario)}
      </span>,
    );
  }
  if (estabilizador.length) {
    partes.push(
      <span key="e">
        {partes.length ? "y usa " : "Usa "}
        {enumerar(estabilizador)} para estabilizar
      </span>,
    );
  }
  return (
    <>
      {partes.flatMap((p, i) => (i === 0 ? [p] : [", ", p]))}.
    </>
  );
}

/**
 * Relevancia de 1 a 5 como el extremo de una barra olímpica: cuantos más discos cargados,
 * mejor se ajusta el ejercicio a los músculos elegidos. Los discos van en tinta: no son un estado.
 */
function BarraCargada({ valor }: { valor: number }) {
  const texto = `Se ajusta ${valor} de 5`;
  return (
    <svg
      viewBox="0 0 40 18"
      role="img"
      aria-label={texto}
      className={css.barra}
    >
      <title>{texto}</title>
      <rect x="0" y="8" width="40" height="2" rx="1" className={css.manga} />
      <rect x="2" y="5" width="2.5" height="8" rx="0.75" className={css.collarin} />
      {Array.from({ length: valor }, (_, i) => (
        <rect key={i} x={7 + i * 6} y="0" width="4.5" height="18" rx="1" className={css.discoCargado} />
      ))}
    </svg>
  );
}

export function PorTipo({
  ejercicios,
  principales,
  quitarFiltros,
}: {
  ejercicios: EjercicioLista[];
  /** id del ejercicio → nombres de sus músculos principales. */
  principales: Map<string, string[]>;
  quitarFiltros?: string;
}) {
  const porTipo = Object.keys(TIPOS)
    .map((tipo) => ({ tipo, lista: ejercicios.filter((e) => e.tipo === tipo) }))
    .filter((g) => g.lista.length);

  if (!porTipo.length) {
    return (
      <EstadoVacio
        titulo="Ningún ejercicio coincide con la búsqueda"
        descripcion="Revisa cómo está escrito, prueba con una parte del nombre o quita el filtro de tipo."
        accion={
          quitarFiltros && (
            <EnlaceBoton variante="secundario" href={quitarFiltros}>
              Quitar búsqueda y filtro
            </EnlaceBoton>
          )
        }
      />
    );
  }

  return (
    <Pila espacio={10}>
      {porTipo.map(({ tipo, lista }) => (
        <Seccion key={tipo} titulo={TIPOS[tipo]} contador={lista.length}>
          <ListaFilas>
            {lista.map((e) => (
              <Fila
                key={e.id}
                titulo={e.nombre}
                detalle={
                  (principales.get(e.id) ?? []).join(", ") ||
                  "Sin músculos asignados"
                }
                fin={e.dificultad ? DIFICULTAD[e.dificultad] : undefined}
              />
            ))}
          </ListaFilas>
        </Seccion>
      ))}
    </Pila>
  );
}
