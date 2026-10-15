"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronUp, Copy, GripVertical, Minus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { GrupoMenu, MenuAcciones, OpcionMenu } from "@/components/ui/menu";
import { MiniaturaMusculos } from "@/components/anatomia/miniatura-musculos";
import type { RolMuscular } from "@/components/anatomia/mapa-corporal";
import { claseControl, claseSelector } from "@/components/ui/campo";
import type { EjercicioEstado } from "./estado";

export const claseCompacta = `${claseControl.replace("h-10", "h-9")} px-2.5 text-sm`;
export const claseIcono =
  "grid size-8 shrink-0 place-items-center rounded-lg text-tenue transition-colors hover:bg-hueso hover:text-tinta disabled:pointer-events-none disabled:opacity-30";

type Campo = Exclude<keyof EjercicioEstado, "clave" | "ejercicio_id">;

/** Sugerencias del campo de repeticiones (lista nativa del navegador). */
export const ID_SUGERENCIAS_REPS = "sugerencias-repeticiones";
export const SUGERENCIAS_REPS = ["5", "6-8", "8-10", "8-12", "10-12", "12-15", "15-20", "AMRAP", "30 s", "45 s", "1 min", "10 min"];

/** Visible en la fila estrecha; en la ancha la cabecera del bloque nombra las columnas. */
const etiquetaCampo = "mb-1 block text-xs text-tenue @2xl:sr-only";
const etiquetaDetalle = "mb-1 block text-xs text-tenue";

/** Número con botones − y + a los lados: se ajusta con un toque, sin teclado. */
function Paso({
  id,
  etiqueta,
  valor,
  alCambiar,
  paso,
  min,
  max,
  unidad,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  paso: number;
  min: number;
  max: number;
  unidad?: string;
}) {
  const actual = Number(valor.replace(",", "."));
  const vacio = valor.trim() === "" || !Number.isFinite(actual);
  // Vacío: el primer toque pone el mínimo.
  const ajustar = (delta: number) => alCambiar(String(vacio ? min : Math.min(max, Math.max(min, actual + delta))));
  const nombre = etiqueta.toLowerCase();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={etiquetaCampo}>
        {etiqueta}
      </label>
      <div className="flex h-9 items-stretch rounded-lg border border-linea bg-superficie transition-[border-color,box-shadow] focus-within:border-tinta focus-within:ring-[3px] focus-within:ring-tinta/10 hover:border-tinta/25">
        <button
          type="button"
          onClick={() => ajustar(-paso)}
          disabled={!vacio && actual <= min}
          aria-label={`Menos ${nombre}`}
          className="grid w-7 shrink-0 place-items-center rounded-l-lg text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <Minus aria-hidden className="size-3.5" />
        </button>
        <input
          id={id}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="—"
          className="w-full min-w-0 bg-transparent text-center tabular-nums text-sm placeholder:text-tenue/70 focus:outline-none"
        />
        {unidad && <span className="self-center pr-0.5 text-xs text-tenue">{unidad}</span>}
        <button
          type="button"
          onClick={() => ajustar(paso)}
          disabled={!vacio && actual >= max}
          aria-label={`Más ${nombre}`}
          className="grid w-7 shrink-0 place-items-center rounded-r-lg text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <Plus aria-hidden className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Campo de texto pequeño con etiqueta encima y unidad opcional a la derecha. */
function Dato({
  id,
  etiqueta,
  valor,
  alCambiar,
  unidad,
  decimal = false,
  ayuda,
  placeholder = "—",
  lista,
  maxLength,
  libre = false,
  conEtiqueta = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  unidad?: string;
  decimal?: boolean;
  ayuda?: string;
  placeholder?: string;
  lista?: string;
  maxLength?: number;
  /** Texto libre (teclado completo), p. ej. el tempo "3-1-1-0". */
  libre?: boolean;
  /** Etiqueta visible también en la fila ancha (fuera de las columnas del bloque). */
  conEtiqueta?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={conEtiqueta ? etiquetaDetalle : etiquetaCampo} title={ayuda}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          inputMode={lista || libre ? undefined : decimal ? "decimal" : "numeric"}
          list={lista}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete="off"
          className={`${claseCompacta} tabular-nums ${unidad ? "pr-8" : ""}`}
        />
        {unidad && (
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-tenue">
            {unidad}
          </span>
        )}
      </div>
    </div>
  );
}

/** Columnas de la prescripción: las comparten la fila y la cabecera del bloque para alinearse. */
export const COLUMNAS_PRESCRIPCION = "@2xl:grid-cols-[5.5rem_5.5rem_5.5rem_6.75rem]";

/** Resumen de los detalles opcionales ya escritos: "RIR 2 · Tempo 3-1-1-0 · Con indicaciones". */
function resumenDetalles(e: EjercicioEstado) {
  return [
    e.rir.trim() && `RIR ${e.rir.trim()}`,
    e.rpe.trim() && `RPE ${e.rpe.trim()}`,
    e.tempo.trim() && `Tempo ${e.tempo.trim()}`,
    e.notas.trim() && "Con indicaciones",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function FilaEjercicio({
  ejercicio: e,
  codigo,
  nombre,
  musculos,
  resaltados,
  porRondas,
  rondas,
  primero,
  ultimo,
  alCambiar,
  alMover,
  alDuplicar,
  alQuitar,
}: {
  ejercicio: EjercicioEstado;
  codigo: string;
  nombre: string;
  musculos: string;
  resaltados: Record<string, RolMuscular>;
  porRondas: boolean;
  rondas: string;
  primero: boolean;
  ultimo: boolean;
  alCambiar: (campo: Campo, valor: string) => void;
  alMover: (direccion: -1 | 1) => void;
  alDuplicar: () => void;
  alQuitar: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: e.clave,
  });
  const [detalles, setDetalles] = useState(false);
  const id = (campo: string) => `${e.clave}-${campo}`;
  const resumen = resumenDetalles(e);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative bg-superficie px-3 py-3 sm:px-4 ${isDragging ? "z-10 rounded-lg shadow-flotante ring-1 ring-linea-fuerte" : ""}`}
    >
      {/* En superseries y circuitos, una línea une los ejercicios que se hacen seguidos. */}
      {porRondas && (
        <span
          aria-hidden
          className={`absolute left-[59px] w-0.5 bg-tinta/25 sm:left-[63px] ${primero ? "top-7" : "top-0"} ${ultimo ? "h-7" : "bottom-0"} ${
            primero && ultimo ? "hidden" : ""
          }`}
        />
      )}
      {/* Estrecho: nombre y menú arriba, prescripción debajo. Ancho: todo en una línea, bajo la cabecera de columnas del bloque. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2.5 @2xl:grid-cols-[minmax(0,1fr)_auto_auto] @2xl:gap-x-3">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Arrastrar ${nombre} para reordenar`}
            className={`${claseIcono} -ml-1.5 cursor-grab touch-none active:cursor-grabbing`}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
          <span
            className={`relative mt-1 grid h-6 min-w-7 shrink-0 place-items-center rounded-md px-1 tabular-nums text-xs font-semibold ${
              porRondas ? "bg-tinta text-sobre-tinta" : "bg-hueso text-tinta"
            }`}
          >
            {codigo}
          </span>
          <MiniaturaMusculos resaltados={resaltados} className="-my-0.5 hidden h-11 w-10 sm:block" />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="line-clamp-2 text-sm leading-snug font-medium">{nombre}</p>
            {musculos && <p className="truncate text-xs text-tenue">{musculos}</p>}
            {resumen && !detalles && (
              <button
                type="button"
                onClick={() => setDetalles(true)}
                aria-expanded={false}
                aria-controls={id("detalles")}
                className="max-w-full truncate rounded text-left text-xs text-tenue underline decoration-linea-fuerte underline-offset-2 hover:text-tinta"
              >
                {resumen}
              </button>
            )}
          </div>
        </div>

        <div className={`col-span-2 row-start-2 grid grid-cols-2 gap-2 @md:grid-cols-4 @2xl:col-span-1 @2xl:col-start-2 @2xl:row-start-1 @2xl:mt-1 ${COLUMNAS_PRESCRIPCION}`}>
          {porRondas ? (
            <p className="relative z-10 self-end justify-self-start bg-superficie pr-1 pb-2 tabular-nums text-xs text-tenue @2xl:self-center @2xl:pb-0">
              {rondas || "—"} {rondas === "1" ? "ronda" : "rondas"}
            </p>
          ) : (
            <Paso id={id("series")} etiqueta="Series" valor={e.series} alCambiar={(v) => alCambiar("series", v)} paso={1} min={1} max={20} />
          )}
          <Dato
            id={id("reps")}
            etiqueta="Repeticiones"
            valor={e.repeticiones}
            alCambiar={(v) => alCambiar("repeticiones", v)}
            placeholder="8-12"
            lista={ID_SUGERENCIAS_REPS}
            maxLength={20}
          />
          <Dato id={id("peso")} etiqueta="Peso" valor={e.peso} alCambiar={(v) => alCambiar("peso", v)} unidad={e.unidad_peso} decimal />
          {porRondas ? (
            <span className="hidden @md:block" />
          ) : (
            <Paso
              id={id("descanso")}
              etiqueta="Descanso"
              valor={e.descanso_segundos}
              alCambiar={(v) => alCambiar("descanso_segundos", v)}
              paso={15}
              min={0}
              max={900}
              unidad="s"
            />
          )}
        </div>

        <MenuAcciones etiqueta={`Acciones de ${nombre}`} className="col-start-2 row-start-1 @2xl:col-start-3 @2xl:mt-1">
          <OpcionMenu icono={SlidersHorizontal} alElegir={() => setDetalles(!detalles)}>
            {detalles ? "Ocultar detalles" : "Detalles: RIR, tempo, notas"}
          </OpcionMenu>
          <OpcionMenu icono={Copy} alElegir={alDuplicar}>Duplicar</OpcionMenu>
          <OpcionMenu icono={ArrowUp} alElegir={() => alMover(-1)} disabled={primero}>Subir</OpcionMenu>
          <OpcionMenu icono={ArrowDown} alElegir={() => alMover(1)} disabled={ultimo}>Bajar</OpcionMenu>
          <GrupoMenu>
            <OpcionMenu icono={Trash2} alElegir={alQuitar} peligro>Quitar de la rutina</OpcionMenu>
          </GrupoMenu>
        </MenuAcciones>
      </div>

      {detalles && (
        <div id={id("detalles")} className="mt-2.5 rounded-lg bg-hueso/50 p-3">
          <div className="grid grid-cols-2 gap-2 @md:grid-cols-4 @2xl:grid-cols-[5rem_5rem_7rem_5.5rem_minmax(0,1fr)]">
            <Dato
              conEtiqueta
              id={id("rir")}
              etiqueta="RIR"
              ayuda="Repeticiones en reserva: cuántas le quedarían antes del fallo"
              valor={e.rir}
              alCambiar={(v) => alCambiar("rir", v)}
              decimal
            />
            <Dato conEtiqueta id={id("rpe")} etiqueta="RPE" ayuda="Esfuerzo percibido de 1 a 10" valor={e.rpe} alCambiar={(v) => alCambiar("rpe", v)} decimal />
            <Dato
              conEtiqueta
              id={id("tempo")}
              etiqueta="Tempo"
              ayuda="Excéntrica-pausa-concéntrica-pausa, en segundos"
              valor={e.tempo}
              alCambiar={(v) => alCambiar("tempo", v)}
              placeholder="3-1-1-0"
              libre
              maxLength={12}
            />
            <div className="min-w-0">
              <label htmlFor={id("unidad")} className={etiquetaDetalle}>
                Unidad
              </label>
              <select
                id={id("unidad")}
                value={e.unidad_peso}
                onChange={(ev) => alCambiar("unidad_peso", ev.target.value)}
                className={`${claseSelector.replace("h-10", "h-9")} text-sm`}
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <div className="col-span-2 min-w-0 @md:col-span-4 @2xl:col-span-1">
              <label htmlFor={id("notas")} className={etiquetaDetalle}>
                Indicaciones
              </label>
              <input
                id={id("notas")}
                value={e.notas}
                onChange={(ev) => alCambiar("notas", ev.target.value)}
                placeholder="Ej.: codos a 45°, pausa abajo"
                maxLength={300}
                className={claseCompacta}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDetalles(false)}
            className="mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-tenue hover:text-tinta"
          >
            <ChevronUp aria-hidden className="size-3.5" /> Ocultar detalles
          </button>
        </div>
      )}
    </li>
  );
}
