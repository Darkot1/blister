"use client";

import { useId } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { claseSelector } from "@/components/ui/campo";
import { AYUDA_BLOQUE, ETIQUETA_BLOQUE, TIPOS_BLOQUE, esPorRondas, letraBloque, type TipoBloque } from "@/lib/entrenamiento/prescripcion";
import type { BloqueEstado, EjercicioEstado } from "./estado";
import { FilaEjercicio, claseCompacta, claseIcono } from "./fila-ejercicio";
import { ICONO_BLOQUE } from "./iconos";
import type { RolMuscular } from "@/components/anatomia/mapa-corporal";

/** Al arrastrar, el ejercicio solo se mueve en vertical. */
const soloVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type CampoEjercicio = Exclude<keyof EjercicioEstado, "clave" | "ejercicio_id">;

export function EditorBloque({
  bloque,
  indice,
  total,
  destino,
  infoDe,
  alCambiar,
  alCambiarTipo,
  alMover,
  alQuitar,
  alCambiarEjercicio,
  alMoverEjercicio,
  alDuplicarEjercicio,
  alQuitarEjercicio,
  alAnadir,
}: {
  bloque: BloqueEstado;
  indice: number;
  total: number;
  /** ¿Los ejercicios que se elijan en el catálogo caen en este bloque? */
  destino: boolean;
  infoDe: (ejercicioId: string) => { nombre: string; musculos: string; resaltados: Record<string, RolMuscular> };
  alCambiar: (campo: "nombre" | "rondas" | "descanso_segundos" | "notas", valor: string) => void;
  alCambiarTipo: (tipo: TipoBloque) => void;
  alMover: (direccion: -1 | 1) => void;
  alQuitar: () => void;
  alCambiarEjercicio: (i: number, campo: CampoEjercicio, valor: string) => void;
  alMoverEjercicio: (desde: number, hasta: number) => void;
  alDuplicarEjercicio: (i: number) => void;
  alQuitarEjercicio: (i: number) => void;
  alAnadir: () => void;
}) {
  const idDnd = useId();
  const letra = letraBloque(indice);
  const porRondas = esPorRondas(bloque.tipo);
  const Icono = ICONO_BLOQUE[bloque.tipo];
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const desde = bloque.ejercicios.findIndex((e) => e.clave === active.id);
    const hasta = bloque.ejercicios.findIndex((e) => e.clave === over.id);
    if (desde >= 0 && hasta >= 0) alMoverEjercicio(desde, hasta);
  };

  const id = (campo: string) => `${bloque.clave}-${campo}`;

  return (
    <section
      aria-label={`Bloque ${letra}: ${bloque.nombre}`}
      className={`overflow-hidden rounded-[var(--radius-tarjeta)] border bg-superficie transition-colors ${
        destino ? "border-tinta/50 ring-[3px] ring-tinta/[0.06]" : "border-linea"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-linea bg-fondo/60 px-3 py-2.5 sm:px-4">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-tinta font-mono text-xs font-semibold text-sobre-tinta">
          {letra}
        </span>
        <Icono aria-hidden className="size-4 shrink-0 text-tenue" />
        <label htmlFor={id("nombre")} className="sr-only">
          Nombre del bloque {letra}
        </label>
        <input
          id={id("nombre")}
          value={bloque.nombre}
          onChange={(e) => alCambiar("nombre", e.target.value)}
          maxLength={60}
          className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-sm font-semibold hover:border-linea focus:border-tinta focus:bg-superficie focus:outline-none"
        />
        <label htmlFor={id("tipo")} className="sr-only">
          Tipo de bloque
        </label>
        <select
          id={id("tipo")}
          value={bloque.tipo}
          onChange={(e) => alCambiarTipo(e.target.value as TipoBloque)}
          title={AYUDA_BLOQUE[bloque.tipo]}
          className={`${claseSelector.replace("w-full", "w-auto").replace("h-10", "h-8")} text-sm`}
        >
          {TIPOS_BLOQUE.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_BLOQUE[t]}
            </option>
          ))}
        </select>
        <div className="flex items-center">
          <button type="button" onClick={() => alMover(-1)} disabled={indice === 0} aria-label={`Subir bloque ${letra}`} className={claseIcono}>
            <ArrowUp aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={() => alMover(1)} disabled={indice === total - 1} aria-label={`Bajar bloque ${letra}`} className={claseIcono}>
            <ArrowDown aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={alQuitar}
            aria-label={`Quitar bloque ${letra}`}
            className={`${claseIcono} hover:bg-peligro/[0.08] hover:text-peligro`}
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {porRondas && (
        <div className="flex flex-wrap items-end gap-3 border-b border-linea px-3 py-2.5 sm:px-4">
          <div className="w-24">
            <label htmlFor={id("rondas")} className="mb-1 block text-xs text-tenue">
              Rondas
            </label>
            <input
              id={id("rondas")}
              value={bloque.rondas}
              onChange={(e) => alCambiar("rondas", e.target.value)}
              inputMode="numeric"
              className={`${claseCompacta} font-mono`}
            />
          </div>
          <div className="w-32">
            <label htmlFor={id("descanso")} className="mb-1 block text-xs text-tenue">
              Descanso por ronda
            </label>
            <div className="relative">
              <input
                id={id("descanso")}
                value={bloque.descanso_segundos}
                onChange={(e) => alCambiar("descanso_segundos", e.target.value)}
                inputMode="numeric"
                className={`${claseCompacta} pr-8 font-mono`}
              />
              <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-tenue">
                s
              </span>
            </div>
          </div>
          <p className="min-w-48 flex-1 pb-2 text-xs text-tenue">{AYUDA_BLOQUE[bloque.tipo]}</p>
        </div>
      )}

      {bloque.ejercicios.length > 0 ? (
        <DndContext id={idDnd} sensors={sensores} collisionDetection={closestCenter} modifiers={[soloVertical]} onDragEnd={alSoltar}>
          <SortableContext items={bloque.ejercicios.map((e) => e.clave)} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-linea">
              {bloque.ejercicios.map((e, i) => {
                const info = infoDe(e.ejercicio_id);
                return (
                  <FilaEjercicio
                    key={e.clave}
                    ejercicio={e}
                    codigo={`${letra}${i + 1}`}
                    nombre={info.nombre}
                    musculos={info.musculos}
                    resaltados={info.resaltados}
                    porRondas={porRondas}
                    rondas={bloque.rondas}
                    primero={i === 0}
                    ultimo={i === bloque.ejercicios.length - 1}
                    alCambiar={(campo, valor) => alCambiarEjercicio(i, campo, valor)}
                    alMover={(d) => alMoverEjercicio(i, i + d)}
                    alDuplicar={() => alDuplicarEjercicio(i)}
                    alQuitar={() => alQuitarEjercicio(i)}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-tenue">Este bloque aún no tiene ejercicios.</p>
      )}

      <button
        type="button"
        onClick={alAnadir}
        aria-pressed={destino}
        className={`flex w-full items-center justify-center gap-1.5 border-t border-dashed border-linea px-4 py-2.5 text-sm font-medium transition-colors ${
          destino ? "bg-tinta/[0.04] text-tinta" : "text-tenue hover:bg-fondo/60 hover:text-tinta"
        }`}
      >
        <Plus aria-hidden className="size-4" />
        {destino ? `Añadiendo ejercicios al bloque ${letra}` : `Añadir ejercicio al bloque ${letra}`}
      </button>
    </section>
  );
}
