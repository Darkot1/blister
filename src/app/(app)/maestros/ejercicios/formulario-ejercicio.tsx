"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton, EnlaceBoton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Campo, Selector, claseSelector } from "@/components/ui/campo";
import {
  DIFICULTADES,
  ETIQUETA_DIFICULTAD,
  ETIQUETA_ROL_MUSCULO,
  ETIQUETA_TIPO,
  ROLES_MUSCULO,
  TIPOS_EJERCICIO,
} from "@/lib/ejercicios/etiquetas";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
type Rol = (typeof ROLES_MUSCULO)[number];

export type EjercicioInicial = {
  nombre: string;
  tipo: string;
  dificultad: string | null;
  es_unilateral: boolean;
  descripcion: string | null;
  instrucciones: string | null;
  musculos: { id: string; rol: Rol }[];
  equipos: string[];
};

const claseLeyenda = "etiqueta float-left mb-4 w-full border-b border-linea pb-3";
const claseGrupo = "rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5";

export function FormularioEjercicio({
  accion,
  inicial,
  grupos,
  equipamiento,
  textoBoton,
}: {
  accion: Accion;
  inicial?: EjercicioInicial;
  /** Músculos visibles (globales + propios) agrupados para el selector. */
  grupos: { nombre: string; musculos: { id: string; nombre: string; propio: boolean }[] }[];
  equipamiento: { id: string; nombre: string }[];
  textoBoton: string;
}) {
  const [estado, enviar] = useActionState(accion, {});
  // Músculos y equipamiento como estado: React reinicia los campos no controlados tras enviar.
  const [musculos, setMusculos] = useState(inicial?.musculos ?? []);
  const [equipos, setEquipos] = useState<string[]>(inicial?.equipos ?? []);
  const [porAnadir, setPorAnadir] = useState("");
  const [rolNuevo, setRolNuevo] = useState<Rol>(inicial?.musculos.length ? "secundario" : "principal");

  const nombreDe = new Map(grupos.flatMap((g) => g.musculos.map((m) => [m.id, m.nombre] as const)));
  const elegidos = new Set(musculos.map((m) => m.id));
  const v = (campo: string, base?: string | null) => estado.valores?.[campo] ?? base ?? "";
  const e = estado.errores ?? {};

  const anadir = () => {
    if (!porAnadir || elegidos.has(porAnadir)) return;
    setMusculos([...musculos, { id: porAnadir, rol: rolNuevo }]);
    setPorAnadir("");
    setRolNuevo("secundario");
  };

  return (
    <form action={enviar} className="max-w-3xl space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}

      <fieldset className={claseGrupo}>
        <legend className={claseLeyenda}>Datos del ejercicio</legend>
        <div className="clear-both grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" nombre="nombre" required className="sm:col-span-2" autoComplete="off"
            placeholder="Ej.: Remo con mancuerna en banco inclinado" defaultValue={v("nombre", inicial?.nombre)} errores={e.nombre} />
          <Selector
            etiqueta="Tipo"
            nombre="tipo"
            defaultValue={v("tipo", inicial?.tipo ?? "fuerza")}
            errores={e.tipo}
            opciones={TIPOS_EJERCICIO.map((t) => ({ valor: t, texto: ETIQUETA_TIPO[t] }))}
          />
          <Selector
            etiqueta="Dificultad"
            nombre="dificultad"
            defaultValue={v("dificultad", inicial?.dificultad)}
            opciones={[{ valor: "", texto: "Sin indicar" }, ...DIFICULTADES.map((d) => ({ valor: d, texto: ETIQUETA_DIFICULTAD[d] }))]}
          />
          <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="es_unilateral"
              defaultChecked={estado.valores ? estado.valores.es_unilateral === "on" : inicial?.es_unilateral}
              className="size-4 rounded border-linea accent-[var(--tinta)]"
            />
            Unilateral (se hace con un lado a la vez)
          </label>
        </div>
      </fieldset>

      <fieldset className={claseGrupo} aria-describedby={e.musculos ? "musculos-error" : undefined}>
        <legend className={claseLeyenda}>Músculos que trabaja</legend>
        <div className="clear-both">
          {musculos.length > 0 && (
            <ul className="mb-4 divide-y divide-linea rounded-lg border border-linea">
              {musculos.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <input type="hidden" name="musculo" value={`${m.id}:${m.rol}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{nombreDe.get(m.id) ?? "Músculo"}</span>
                  <label className="sr-only" htmlFor={`rol-${m.id}`}>Rol de {nombreDe.get(m.id)}</label>
                  <select
                    id={`rol-${m.id}`}
                    value={m.rol}
                    onChange={(ev) =>
                      setMusculos(musculos.map((x, j) => (j === i ? { ...x, rol: ev.target.value as Rol } : x)))
                    }
                    className={`${claseSelector.replace("w-full", "w-40 shrink-0")} h-8 text-sm`}
                  >
                    {ROLES_MUSCULO.map((r) => (
                      <option key={r} value={r}>{ETIQUETA_ROL_MUSCULO[r]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setMusculos(musculos.filter((_, j) => j !== i))}
                    aria-label={`Quitar ${nombreDe.get(m.id)}`}
                    className="grid size-8 place-items-center rounded-lg text-tenue hover:bg-peligro/[0.08] hover:text-peligro"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <div>
              <label htmlFor="musculo-nuevo" className="mb-1.5 block text-sm font-medium">Añadir músculo</label>
              <select id="musculo-nuevo" value={porAnadir} onChange={(ev) => setPorAnadir(ev.target.value)} className={claseSelector}>
                <option value="">Elige un músculo</option>
                {grupos.map((g) => (
                  <optgroup key={g.nombre} label={g.nombre}>
                    {g.musculos.map((m) => (
                      <option key={m.id} value={m.id} disabled={elegidos.has(m.id)}>
                        {m.nombre}{m.propio ? " (propio)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rol-nuevo" className="mb-1.5 block text-sm font-medium">Rol</label>
              <select id="rol-nuevo" value={rolNuevo} onChange={(ev) => setRolNuevo(ev.target.value as Rol)} className={claseSelector}>
                {ROLES_MUSCULO.map((r) => (
                  <option key={r} value={r}>{ETIQUETA_ROL_MUSCULO[r]}</option>
                ))}
              </select>
            </div>
            <Boton type="button" variante="secundario" onClick={anadir} disabled={!porAnadir} className="h-10">
              <Plus aria-hidden className="size-4" /> Añadir
            </Boton>
          </div>
          <p className="mt-2 text-sm text-tenue">
            Principal: el que limita la carga (1 o 2). Secundario: ayuda de forma clara. Estabilizador: sostiene la postura.
          </p>
          {e.musculos && <p id="musculos-error" role="alert" className="mt-2 text-sm text-peligro">{e.musculos[0]}</p>}
        </div>
      </fieldset>

      <fieldset className={claseGrupo}>
        <legend className={claseLeyenda}>Equipamiento</legend>
        <div className="clear-both flex flex-wrap gap-1.5">
          {equipamiento.map((q) => {
            const activo = equipos.includes(q.id);
            return (
              <label
                key={q.id}
                className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-tinta ${
                  activo ? "border-tinta bg-tinta font-medium text-sobre-tinta" : "border-linea bg-superficie text-tenue hover:border-tinta/30 hover:text-tinta"
                }`}
              >
                <input
                  type="checkbox"
                  name="equipo"
                  value={q.id}
                  checked={activo}
                  onChange={() => setEquipos(activo ? equipos.filter((x) => x !== q.id) : [...equipos, q.id])}
                  className="sr-only"
                />
                {q.nombre}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={claseGrupo}>
        <legend className={claseLeyenda}>Explicación (opcional)</legend>
        <div className="clear-both grid gap-4">
          <AreaTexto etiqueta="Descripción" nombre="descripcion" rows={2} placeholder="Para qué sirve y cuándo lo usas"
            defaultValue={v("descripcion", inicial?.descripcion)} errores={e.descripcion} />
          <AreaTexto etiqueta="Instrucciones" nombre="instrucciones" rows={4} placeholder="Posición inicial, ejecución, respiración…"
            defaultValue={v("instrucciones", inicial?.instrucciones)} errores={e.instrucciones} />
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <BotonEnvio textoPendiente="Guardando…">{textoBoton}</BotonEnvio>
        <EnlaceBoton href="/maestros/ejercicios?origen=propios" variante="fantasma">Cancelar</EnlaceBoton>
      </div>
    </form>
  );
}
