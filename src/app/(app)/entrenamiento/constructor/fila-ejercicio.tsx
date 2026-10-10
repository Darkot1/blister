"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, Copy, GripVertical, Minus, Plus, Trash2 } from "lucide-react";
import { MiniaturaMusculos } from "@/components/anatomia/miniatura-musculos";
import type { RolMuscular } from "@/components/anatomia/mapa-corporal";
import { claseControl, claseSelector } from "@/components/ui/campo";
import type { EjercicioEstado } from "./estado";

export const claseCompacta = `${claseControl.replace("h-10", "h-9")} px-2.5 text-sm`;
export const claseIcono =
  "grid size-8 shrink-0 place-items-center rounded-lg text-tenue transition-colors hover:bg-tinta/[0.06] hover:text-tinta disabled:pointer-events-none disabled:opacity-30";

type Campo = Exclude<keyof EjercicioEstado, "clave" | "ejercicio_id">;

/** Sugerencias del campo de repeticiones (lista nativa del navegador). */
export const ID_SUGERENCIAS_REPS = "sugerencias-repeticiones";
export const SUGERENCIAS_REPS = ["5", "6-8", "8-10", "8-12", "10-12", "12-15", "15-20", "AMRAP", "30 s", "45 s", "1 min", "10 min"];

const etiquetaCampo = "mb-1 block text-xs text-tenue";

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
          className="grid w-7 shrink-0 place-items-center rounded-l-lg text-tenue hover:bg-tinta/[0.06] hover:text-tinta disabled:opacity-30"
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
          className="w-full min-w-0 bg-transparent text-center font-mono text-sm placeholder:text-tenue/70 focus:outline-none"
        />
        {unidad && <span className="self-center pr-0.5 text-xs text-tenue">{unidad}</span>}
        <button
          type="button"
          onClick={() => ajustar(paso)}
          disabled={!vacio && actual >= max}
          aria-label={`Más ${nombre}`}
          className="grid w-7 shrink-0 place-items-center rounded-r-lg text-tenue hover:bg-tinta/[0.06] hover:text-tinta disabled:opacity-30"
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
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={etiquetaCampo} title={ayuda}>
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
          className={`${claseCompacta} font-mono ${unidad ? "pr-8" : ""}`}
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
  const [extras, setExtras] = useState(Boolean(e.tempo || e.rpe || e.notas || e.unidad_peso === "lb"));
  const id = (campo: string) => `${e.clave}-${campo}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative bg-superficie px-3 py-3 sm:px-4 ${isDragging ? "z-10 rounded-lg shadow-lg ring-1 ring-tinta/20" : ""}`}
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
      <div className="flex items-start gap-2">
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
          className={`relative mt-1 grid h-6 min-w-7 shrink-0 place-items-center rounded-md px-1 font-mono text-xs font-semibold ${
            porRondas ? "bg-tinta text-sobre-tinta" : "bg-tinta/[0.07] text-tinta"
          }`}
        >
          {codigo}
        </span>
        <MiniaturaMusculos resaltados={resaltados} className="-my-0.5 hidden h-11 w-10 sm:block" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-sm font-medium">{nombre}</p>
          {musculos && <p className="truncate text-xs text-tenue">{musculos}</p>}
        </div>
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => alMover(-1)} disabled={primero} aria-label={`Subir ${nombre}`} className={claseIcono}>
            <ArrowUp aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={() => alMover(1)} disabled={ultimo} aria-label={`Bajar ${nombre}`} className={claseIcono}>
            <ArrowDown aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={alDuplicar} aria-label={`Duplicar ${nombre}`} className={claseIcono}>
            <Copy aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={alQuitar}
            aria-label={`Quitar ${nombre}`}
            className={`${claseIcono} hover:bg-peligro/[0.08] hover:text-peligro`}
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem_4.5rem_auto]">
        {porRondas ? (
          <p className="relative z-10 self-end justify-self-start bg-superficie pr-1 pb-2 font-mono text-xs text-tenue">
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
          <span className="hidden sm:block" />
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
        <Dato
          id={id("rir")}
          etiqueta="RIR"
          ayuda="Repeticiones en reserva: cuántas le quedarían antes del fallo"
          valor={e.rir}
          alCambiar={(v) => alCambiar("rir", v)}
          decimal
        />
        <button
          type="button"
          onClick={() => setExtras(!extras)}
          aria-expanded={extras}
          aria-controls={id("extras")}
          className="inline-flex h-9 items-center gap-1 self-end rounded-lg px-2 text-xs font-medium text-tenue hover:bg-tinta/[0.06] hover:text-tinta"
        >
          Más
          <ChevronDown aria-hidden className={`size-3.5 transition-transform ${extras ? "rotate-180" : ""}`} />
        </button>
      </div>

      {extras && (
        <div id={id("extras")} className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
          <Dato id={id("rpe")} etiqueta="RPE" ayuda="Esfuerzo percibido de 1 a 10" valor={e.rpe} alCambiar={(v) => alCambiar("rpe", v)} decimal />
          <Dato
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
            <label htmlFor={id("unidad")} className={etiquetaCampo}>
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
          <div className="col-span-3 min-w-0 sm:col-span-1">
            <label htmlFor={id("notas")} className={etiquetaCampo}>
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
      )}
    </li>
  );
}
