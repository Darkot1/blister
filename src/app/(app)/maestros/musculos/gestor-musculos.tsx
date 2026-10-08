"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { actualizarMusculo, crearMusculo, eliminarMusculo } from "../acciones";

type Musculo = { id: string; nombre: string; descripcion: string | null; propio: boolean; ejercicios: number };
type Grupo = { id: string; nombre: string; musculos: Musculo[] };
type Edicion = { modo: "nuevo"; grupoId?: string } | { modo: "editar"; musculo: Musculo; grupoId: string };

export function GestorMusculos({ grupos }: { grupos: Grupo[] }) {
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const propios = grupos.reduce((n, g) => n + g.musculos.filter((m) => m.propio).length, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tenue">
          {propios ? `${propios} ${propios === 1 ? "músculo propio" : "músculos propios"}. ` : ""}
          Los que no tienen dibujo en el mapa aparecen en la lista de “músculos profundos”.
        </p>
        <Boton onClick={() => setEdicion({ modo: "nuevo" })}>
          <Plus aria-hidden className="size-4" /> Nuevo músculo
        </Boton>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => (
          <Tarjeta key={g.id} className="overflow-hidden">
            <section aria-labelledby={`grupo-${g.id}`}>
              <CabeceraTarjeta
                id={`grupo-${g.id}`}
                titulo={`${g.nombre} · ${g.musculos.length}`}
                accion={
                  <button
                    type="button"
                    onClick={() => setEdicion({ modo: "nuevo", grupoId: g.id })}
                    aria-label={`Nuevo músculo en ${g.nombre}`}
                    className="grid size-7 place-items-center rounded-md text-tenue hover:bg-tinta/[0.06] hover:text-tinta"
                  >
                    <Plus aria-hidden className="size-4" />
                  </button>
                }
              />
              {g.musculos.length ? (
                <ul className="divide-y divide-linea">
                  {g.musculos.map((m) => (
                    <li key={m.id} className="flex min-h-11 items-center gap-2 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.nombre}</span>
                        <span className="block font-mono text-[0.7rem] text-tenue">
                          {m.ejercicios ? `${m.ejercicios} ${m.ejercicios === 1 ? "ejercicio" : "ejercicios"}` : "Sin ejercicios"}
                        </span>
                      </span>
                      {m.propio ? (
                        <>
                          <span className="rounded-md bg-acento px-2 py-0.5 text-xs font-medium text-sobre-acento">Propio</span>
                          <button
                            type="button"
                            onClick={() => setEdicion({ modo: "editar", musculo: m, grupoId: g.id })}
                            aria-label={`Editar ${m.nombre}`}
                            className="grid size-8 place-items-center rounded-lg text-tenue hover:bg-tinta/[0.06] hover:text-tinta"
                          >
                            <Pencil aria-hidden className="size-4" />
                          </button>
                        </>
                      ) : (
                        <span className="rounded-md border border-linea px-2 py-0.5 text-xs text-tenue">Global</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-tenue">Sin músculos.</p>
              )}
            </section>
          </Tarjeta>
        ))}
      </div>

      <Dialogo
        abierto={edicion !== null}
        alCerrar={() => setEdicion(null)}
        titulo={edicion?.modo === "editar" ? "Editar músculo" : "Nuevo músculo"}
      >
        {edicion && (
          <FormularioMusculo
            key={edicion.modo === "editar" ? edicion.musculo.id : `nuevo-${edicion.grupoId ?? ""}`}
            edicion={edicion}
            grupos={grupos}
            alTerminar={() => setEdicion(null)}
          />
        )}
      </Dialogo>
    </>
  );
}

function FormularioMusculo({ edicion, grupos, alTerminar }: { edicion: Edicion; grupos: Grupo[]; alTerminar: () => void }) {
  const musculo = edicion.modo === "editar" ? edicion.musculo : null;
  const [estado, enviar] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const resultado = musculo ? await actualizarMusculo(musculo.id, previo, datos) : await crearMusculo(previo, datos);
    if (resultado.ok) alTerminar();
    return resultado;
  }, {});
  const [eliminando, iniciar] = useTransition();
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const v = estado.valores;

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {(estado.error || errorEliminar) && <Aviso>{estado.error ?? errorEliminar}</Aviso>}
      <Campo etiqueta="Nombre" nombre="nombre" required autoComplete="off" placeholder="Ej.: Tibial posterior"
        defaultValue={v?.nombre ?? musculo?.nombre} errores={estado.errores?.nombre} />
      <Selector
        etiqueta="Grupo muscular"
        nombre="grupo_muscular_id"
        defaultValue={v?.grupo_muscular_id ?? edicion.grupoId ?? ""}
        errores={estado.errores?.grupo_muscular_id}
        opciones={[{ valor: "", texto: "Elige el grupo" }, ...grupos.map((g) => ({ valor: g.id, texto: g.nombre }))]}
      />
      <AreaTexto etiqueta="Descripción" nombre="descripcion" rows={2} placeholder="Opcional: ubicación, función…"
        defaultValue={v?.descripcion ?? musculo?.descripcion ?? ""} errores={estado.errores?.descripcion} />
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <BotonEnvio textoPendiente="Guardando…">{musculo ? "Guardar cambios" : "Crear músculo"}</BotonEnvio>
        <Boton type="button" variante="fantasma" onClick={alTerminar}>Cancelar</Boton>
        {musculo && (
          <Boton
            type="button"
            variante="peligro"
            className="ml-auto"
            disabled={eliminando || musculo.ejercicios > 0}
            title={musculo.ejercicios > 0 ? "Está en uso: quítalo antes de los ejercicios que lo usan" : undefined}
            onClick={() => {
              if (!window.confirm(`¿Eliminar "${musculo.nombre}"? No se puede deshacer.`)) return;
              iniciar(async () => {
                const r = await eliminarMusculo(musculo.id);
                if (r.error) setErrorEliminar(r.error);
                else alTerminar();
              });
            }}
          >
            <Trash2 aria-hidden className="size-4" /> Eliminar
          </Boton>
        )}
      </div>
      {musculo && musculo.ejercicios > 0 && (
        <p className="text-sm text-tenue">
          Está en uso en {musculo.ejercicios} {musculo.ejercicios === 1 ? "ejercicio" : "ejercicios"}: para eliminarlo, quítalo primero de ellos.
        </p>
      )}
    </form>
  );
}
