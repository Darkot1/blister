"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Copy, Dumbbell, Plus, Save, Trash2 } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { claseControl, claseSelector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { ETIQUETA_TIPO_OBJETIVO } from "@/lib/formato";
import type { Catalogo, EjercicioCatalogo } from "@/lib/entrenamiento/cargar";
import type { RolMuscular } from "@/components/anatomia/mapa-corporal";
import {
  ETIQUETA_BLOQUE,
  NOMBRES_DIA,
  esPorRondas,
  letraBloque,
  musculosSugeridos,
  type TipoBloque,
} from "@/lib/entrenamiento/prescripcion";
import { guardarRutina } from "../acciones";
import { AsignarRutina, type Asignacion } from "./asignar";
import { ElegirEstructura, LineaDia } from "./ayudas";
import { EditorBloque } from "./bloque";
import { CatalogoEjercicios } from "./catalogo";
import {
  aEntrada,
  bloqueVacio,
  conClavesNuevas,
  diaVacio,
  ejercicioNuevo,
  mover,
  ubicarBloque,
  type EstadoRutina,
} from "./estado";
import { ID_SUGERENCIAS_REPS, SUGERENCIAS_REPS, claseIcono } from "./fila-ejercicio";
import { ICONO_BLOQUE } from "./iconos";
import { ResumenRutina } from "./resumen";

const BLOQUES_RAPIDOS: TipoBloque[] = ["calentamiento", "fuerza", "superserie", "circuito", "cardio", "enfriamiento"];
const MAX_DIAS = 7;

const CONSULTA_ESCRITORIO = "(min-width: 1024px)";
const esEscritorio = () => window.matchMedia(CONSULTA_ESCRITORIO).matches;
const suscribirEscritorio = (avisar: () => void) => {
  const consulta = window.matchMedia(CONSULTA_ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
};

export function ConstructorRutina({
  id,
  inicial,
  catalogo,
  asignacion,
}: {
  /** null = rutina nueva (aún sin guardar). */
  id: string | null;
  inicial: EstadoRutina;
  catalogo: Catalogo;
  /** Datos para asignar la rutina guardada a un alumno (solo rutinas ya creadas). */
  asignacion?: Asignacion;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState(inicial);
  const [sucio, setSucio] = useState(false);
  const [diaActual, setDiaActual] = useState(0);
  /** Clave del bloque que recibe los ejercicios; null = según el tipo de ejercicio. */
  const [destino, setDestino] = useState<string | null>(null);
  const [panel, setPanel] = useState<"anadir" | "resumen">("anadir");
  const [catalogoMovil, setCatalogoMovil] = useState(false);
  const [descripcionAbierta, setDescripcionAbierta] = useState(Boolean(inicial.descripcion));
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const [guardando, iniciar] = useTransition();
  const refBusqueda = useRef<HTMLInputElement>(null);
  const refNombre = useRef<HTMLInputElement>(null);
  // El catálogo y el resumen se montan una sola vez: en el panel lateral (escritorio) o en el diálogo y la tarjeta (móvil).
  const escritorio = useSyncExternalStore(suscribirEscritorio, esEscritorio, () => true);

  const dia = estado.dias[Math.min(diaActual, estado.dias.length - 1)];

  const infoEjercicio = useMemo(() => new Map(catalogo.ejercicios.map((e) => [e.id, e])), [catalogo.ejercicios]);
  const principalesDe = useMemo(() => {
    const nombre = new Map(catalogo.musculos.map((m) => [m.slug, m.nombre]));
    const mapa = new Map<string, string[]>();
    for (const r of catalogo.relaciones) {
      if (r.rol !== "principal") continue;
      mapa.set(r.ejercicioId, [...(mapa.get(r.ejercicioId) ?? []), nombre.get(r.slug) ?? r.slug]);
    }
    return new Map([...mapa].map(([k, v]) => [k, v.join(", ")]));
  }, [catalogo]);
  const resaltados = useMemo(() => {
    const mapa = new Map<string, Record<string, RolMuscular>>();
    for (const r of catalogo.relaciones) mapa.set(r.ejercicioId, { ...mapa.get(r.ejercicioId), [r.slug]: r.rol });
    return mapa;
  }, [catalogo.relaciones]);
  const resaltadosDe = useCallback((ejercicioId: string) => resaltados.get(ejercicioId) ?? {}, [resaltados]);
  const infoDe = useCallback(
    (ejercicioId: string) => ({
      nombre: infoEjercicio.get(ejercicioId)?.nombre ?? "Ejercicio no disponible",
      musculos: principalesDe.get(ejercicioId) ?? "",
      resaltados: resaltadosDe(ejercicioId),
    }),
    [infoEjercicio, principalesDe, resaltadosDe],
  );

  const enDia = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const b of dia.bloques) for (const e of b.ejercicios) cuenta.set(e.ejercicio_id, (cuenta.get(e.ejercicio_id) ?? 0) + 1);
    return cuenta;
  }, [dia]);

  /** Aplica un cambio sobre una copia del estado (estilo "borrador"). */
  const cambiar = useCallback((receta: (borrador: EstadoRutina) => void) => {
    setEstado((previo) => {
      const borrador = structuredClone(previo);
      receta(borrador);
      return borrador;
    });
    setSucio(true);
    setGuardado(false);
    setError(null);
  }, []);
  const cambiarDia = (receta: (d: EstadoRutina["dias"][number]) => void) =>
    cambiar((b) => receta(b.dias[Math.min(diaActual, b.dias.length - 1)]));

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [sucio]);

  const guardar = useCallback(() => {
    if (!estado.nombre.trim()) {
      setError("Escribe el nombre de la rutina.");
      refNombre.current?.focus();
      return;
    }
    iniciar(async () => {
      const resultado = await guardarRutina(id, aEntrada(estado));
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setSucio(false);
      setGuardado(true);
      if (!id) router.replace(`/entrenamiento/rutinas/${resultado.id}`);
    });
  }, [estado, id, router]);

  // Ctrl/Cmd + S guarda.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        guardar();
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [guardar]);

  const anadirEjercicio = (ejercicio: EjercicioCatalogo) => {
    const nuevo = ejercicioNuevo(ejercicio, estado.tipo_objetivo);
    const colocar = (d: EstadoRutina["dias"][number]) => {
      let indice = destino ? d.bloques.findIndex((b) => b.clave === destino) : -1;
      if (indice < 0) indice = ubicarBloque(d, ejercicio.tipo);
      d.bloques[indice].ejercicios.push(nuevo);
      return indice;
    };
    // Se ensaya sobre una copia para anunciar dónde cayó (la regla es determinista).
    const muestra = structuredClone(dia);
    const indice = colocar(muestra);
    cambiarDia((d) => void colocar(d));
    setAnuncio(`${ejercicio.nombre} añadido al bloque ${letraBloque(indice)}, ${muestra.bloques[indice].nombre}.`);
  };

  const abrirCatalogo = (bloqueClave: string | null) => {
    setDestino(bloqueClave);
    if (esEscritorio()) {
      setPanel("anadir");
      requestAnimationFrame(() => refBusqueda.current?.focus());
    } else {
      setCatalogoMovil(true);
    }
  };

  const anadirBloque = (tipo: TipoBloque) => {
    const bloque = bloqueVacio(tipo);
    cambiarDia((d) => {
      d.bloques.push(bloque);
    });
    abrirCatalogo(bloque.clave);
  };

  const anadirDia = () => {
    if (estado.dias.length >= MAX_DIAS) return;
    cambiar((b) => {
      b.dias.push(diaVacio(b.dias.length + 1));
    });
    setDiaActual(estado.dias.length);
    setDestino(null);
  };

  const duplicarDia = () => {
    if (estado.dias.length >= MAX_DIAS) return;
    cambiar((b) => {
      const copia = conClavesNuevas(b.dias[diaActual]);
      copia.nombre = `${copia.nombre} (copia)`.slice(0, 60);
      b.dias.splice(diaActual + 1, 0, copia);
    });
    setDiaActual(diaActual + 1);
    setDestino(null);
  };

  const quitarDia = () => {
    const n = dia.bloques.reduce((t, b) => t + b.ejercicios.length, 0);
    if (n > 0 && !window.confirm(`¿Quitar «${dia.nombre}» y sus ${n} ejercicios? Podrás descartarlo sin guardar si te arrepientes.`)) return;
    cambiar((b) => {
      b.dias.splice(diaActual, 1);
      if (!b.dias.length) b.dias.push(diaVacio(1));
    });
    setDiaActual(Math.max(0, diaActual - 1));
    setDestino(null);
  };

  const moverDia = (direccion: -1 | 1) => {
    cambiar((b) => mover(b.dias, diaActual, diaActual + direccion));
    setDiaActual(diaActual + direccion);
  };

  const opcionesDestino = (
    <div>
      <label htmlFor="destino-ejercicios" className="mb-1.5 block text-xs text-tenue">
        Añadir a <span className="font-medium text-tinta">{dia.nombre || "este día"}</span>
      </label>
      <select
        id="destino-ejercicios"
        value={destino && dia.bloques.some((b) => b.clave === destino) ? destino : ""}
        onChange={(e) => setDestino(e.target.value || null)}
        className={`${claseSelector.replace("h-10", "h-9")} text-sm`}
      >
        <option value="">Automático: según el tipo de ejercicio</option>
        {dia.bloques.map((b, i) => (
          <option key={b.clave} value={b.clave}>
            Bloque {letraBloque(i)} · {b.nombre}
          </option>
        ))}
      </select>
    </div>
  );

  const catalogoUI = (
    <CatalogoEjercicios
      catalogo={catalogo}
      principalesDe={principalesDe}
      resaltadosDe={resaltadosDe}
      sugerencia={dia.nombre.trim() ? { dia: dia.nombre.trim(), musculos: musculosSugeridos(dia.nombre) } : null}
      enDia={enDia}
      destino={opcionesDestino}
      alAnadir={anadirEjercicio}
      refBusqueda={refBusqueda}
    />
  );

  const totalEjercicios = estado.dias.reduce((t, d) => t + d.bloques.reduce((s, b) => s + b.ejercicios.length, 0), 0);
  // Rutina nueva y aún vacía: se ofrece una estructura de semana para empezar.
  const enBlanco = !id && totalEjercicios === 0 && estado.dias.length === 1 && dia.bloques.length === 0;
  const nombrePorDefecto = !dia.nombre.trim() || /^d[ií]a \d+$/i.test(dia.nombre.trim());

  return (
    <>
      <datalist id={ID_SUGERENCIAS_REPS}>
        {SUGERENCIAS_REPS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-4">
          {/* Datos generales */}
          <Tarjeta className="space-y-4 p-4 sm:p-5">
            <div>
              <label htmlFor="rutina-nombre" className="etiqueta mb-1.5 block">
                Nombre de la rutina
              </label>
              <input
                ref={refNombre}
                id="rutina-nombre"
                value={estado.nombre}
                onChange={(e) => cambiar((b) => void (b.nombre = e.target.value))}
                placeholder="Ej.: Torso-pierna, 4 días"
                maxLength={120}
                autoFocus={!id}
                className="h-11 w-full rounded-lg border border-transparent bg-transparent px-2 -mx-2 text-xl font-semibold tracking-tight placeholder:font-normal placeholder:text-tenue/70 hover:border-linea focus:border-tinta focus:outline-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-end">
              <div>
                <label htmlFor="rutina-objetivo" className="mb-1.5 block text-sm font-medium">
                  Objetivo
                </label>
                <select
                  id="rutina-objetivo"
                  value={estado.tipo_objetivo}
                  onChange={(e) => cambiar((b) => void (b.tipo_objetivo = e.target.value))}
                  className={claseSelector}
                >
                  <option value="">Sin objetivo definido</option>
                  {Object.entries(ETIQUETA_TIPO_OBJETIVO).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-tenue sm:pb-2.5">
                Las series, repeticiones y descansos de cada ejercicio nuevo se proponen según el objetivo. Puedes cambiarlos.
              </p>
            </div>
            {descripcionAbierta ? (
              <div>
                <label htmlFor="rutina-descripcion" className="mb-1.5 block text-sm font-medium">
                  Descripción
                </label>
                <textarea
                  id="rutina-descripcion"
                  value={estado.descripcion}
                  onChange={(e) => cambiar((b) => void (b.descripcion = e.target.value))}
                  maxLength={1000}
                  placeholder="Para quién es, cómo progresar, qué cuidar…"
                  className={`${claseControl} h-auto min-h-20 py-2`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDescripcionAbierta(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-tenue hover:text-tinta"
              >
                <Plus aria-hidden className="size-4" /> Añadir descripción
              </button>
            )}
          </Tarjeta>

          {enBlanco && (
            <ElegirEstructura
              alElegir={(nombres) => {
                cambiar((b) => {
                  b.dias = nombres.map((nombre, i) => ({ ...diaVacio(i + 1), nombre }));
                });
                setDiaActual(0);
                setDestino(null);
              }}
            />
          )}

          {/* Días */}
          <nav aria-label="Días de la rutina" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {estado.dias.map((d, i) => {
              const n = d.bloques.reduce((t, b) => t + b.ejercicios.length, 0);
              const activo = i === diaActual;
              return (
                <button
                  key={d.clave}
                  type="button"
                  onClick={() => {
                    setDiaActual(i);
                    setDestino(null);
                  }}
                  aria-current={activo ? "true" : undefined}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm transition-colors ${
                    activo
                      ? "border-tinta bg-tinta font-medium text-sobre-tinta"
                      : "border-linea bg-superficie text-tenue hover:border-tinta/30 hover:text-tinta"
                  }`}
                >
                  <span className="max-w-40 truncate">{d.nombre || `Día ${i + 1}`}</span>
                  <span className={`font-mono text-[0.7rem] ${activo ? "opacity-60" : "text-tenue/70"}`}>{n}</span>
                </button>
              );
            })}
            {estado.dias.length < MAX_DIAS && (
              <button
                type="button"
                onClick={anadirDia}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-linea px-3.5 text-sm font-medium text-tenue hover:border-tinta/40 hover:text-tinta"
              >
                <Plus aria-hidden className="size-4" /> Día
              </button>
            )}
          </nav>

          <section aria-labelledby="titulo-dia" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="titulo-dia" className="sr-only">
                {dia.nombre}
              </h2>
              <label htmlFor="dia-nombre" className="sr-only">
                Nombre del día
              </label>
              <input
                id="dia-nombre"
                value={dia.nombre}
                onChange={(e) => cambiarDia((d) => void (d.nombre = e.target.value))}
                placeholder="Ej.: Empuje, Pierna, Full body"
                maxLength={60}
                className={`${claseControl} min-w-0 flex-1 font-medium sm:max-w-xs`}
              />
              <div className="flex items-center">
                <button type="button" onClick={() => moverDia(-1)} disabled={diaActual === 0} aria-label="Mover el día a la izquierda" className={claseIcono}>
                  <ArrowLeft aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moverDia(1)}
                  disabled={diaActual === estado.dias.length - 1}
                  aria-label="Mover el día a la derecha"
                  className={claseIcono}
                >
                  <ArrowRight aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={duplicarDia}
                  disabled={estado.dias.length >= MAX_DIAS}
                  aria-label="Duplicar el día"
                  title="Duplicar el día"
                  className={claseIcono}
                >
                  <Copy aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={quitarDia}
                  aria-label="Quitar el día"
                  title="Quitar el día"
                  className={`${claseIcono} hover:bg-peligro/[0.08] hover:text-peligro`}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </div>

            {nombrePorDefecto && (
              <div className="-mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-tenue">¿Qué se entrena este día?</span>
                {NOMBRES_DIA.map((nombre) => (
                  <button
                    key={nombre}
                    type="button"
                    onClick={() => cambiarDia((d) => void (d.nombre = nombre))}
                    className="h-7 rounded-md border border-linea bg-superficie px-2.5 text-xs font-medium text-tenue hover:border-tinta/30 hover:text-tinta"
                  >
                    {nombre}
                  </button>
                ))}
              </div>
            )}

            <LineaDia bloques={dia.bloques} />

            {dia.bloques.length === 0 ? (
              <Vacio
                icono={<Dumbbell aria-hidden className="size-5" />}
                titulo="Empieza por los ejercicios"
                texto="Búscalos por nombre o por músculo. Cada uno cae en el bloque que le corresponde (calentamiento, fuerza, enfriamiento…) y luego lo ajustas."
                accion={
                  <Boton type="button" onClick={() => abrirCatalogo(null)}>
                    <Plus aria-hidden className="size-4" /> Añadir ejercicios
                  </Boton>
                }
              />
            ) : (
              dia.bloques.map((bloque, i) => (
                <EditorBloque
                  key={bloque.clave}
                  bloque={bloque}
                  indice={i}
                  total={dia.bloques.length}
                  destino={destino === bloque.clave}
                  infoDe={infoDe}
                  alCambiar={(campo, valor) => cambiarDia((d) => void (d.bloques[i][campo] = valor))}
                  alCambiarTipo={(tipo) =>
                    cambiarDia((d) => {
                      const b = d.bloques[i];
                      if (b.nombre === ETIQUETA_BLOQUE[b.tipo]) b.nombre = ETIQUETA_BLOQUE[tipo];
                      if (esPorRondas(tipo) && !esPorRondas(b.tipo)) {
                        // Las rondas parten de las series que ya tenía el primer ejercicio.
                        b.rondas ||= b.ejercicios[0]?.series || "3";
                        b.descanso_segundos ||= "90";
                      }
                      if (!esPorRondas(tipo) && esPorRondas(b.tipo)) {
                        for (const e of b.ejercicios) e.series ||= b.rondas;
                      }
                      b.tipo = tipo;
                    })
                  }
                  alMover={(dir) => cambiarDia((d) => mover(d.bloques, i, i + dir))}
                  alQuitar={() => {
                    if (bloque.ejercicios.length && !window.confirm(`¿Quitar el bloque ${letraBloque(i)} con ${bloque.ejercicios.length} ejercicios?`)) return;
                    cambiarDia((d) => void d.bloques.splice(i, 1));
                    if (destino === bloque.clave) setDestino(null);
                  }}
                  alCambiarEjercicio={(j, campo, valor) =>
                    cambiarDia((d) => {
                      const e = d.bloques[i].ejercicios[j];
                      if (campo === "unidad_peso") e.unidad_peso = valor === "lb" ? "lb" : "kg";
                      else e[campo] = valor;
                    })
                  }
                  alMoverEjercicio={(desde, hasta) => cambiarDia((d) => mover(d.bloques[i].ejercicios, desde, hasta))}
                  alDuplicarEjercicio={(j) =>
                    cambiarDia((d) => void d.bloques[i].ejercicios.splice(j + 1, 0, conClavesNuevas(d.bloques[i].ejercicios[j])))
                  }
                  alQuitarEjercicio={(j) => cambiarDia((d) => void d.bloques[i].ejercicios.splice(j, 1))}
                  alAnadir={() => abrirCatalogo(bloque.clave)}
                />
              ))
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-sm text-tenue">Añadir bloque:</span>
              {BLOQUES_RAPIDOS.map((tipo) => {
                const Icono = ICONO_BLOQUE[tipo];
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => anadirBloque(tipo)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2.5 text-sm text-tenue transition-colors hover:border-tinta/30 hover:text-tinta"
                  >
                    <Icono aria-hidden className="size-3.5" />
                    {ETIQUETA_BLOQUE[tipo]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* En móvil el resumen va debajo del día. */}
          {!escritorio && (
            <Tarjeta>
              <details>
                <summary className="etiqueta flex min-h-12 cursor-pointer items-center px-4">Resumen y músculos trabajados</summary>
                <div className="border-t border-linea">
                  <ResumenRutina dias={estado.dias} diaActual={diaActual} catalogo={catalogo} />
                </div>
              </details>
            </Tarjeta>
          )}

          {/* Barra de guardado */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-linea bg-fondo/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[var(--radius-tarjeta)] lg:border lg:bg-superficie/95 lg:px-4">
            {error && (
              <div className="mb-3">
                <Aviso>{error}</Aviso>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="flex items-center gap-2 text-sm text-tenue">
                <span aria-hidden className={`size-2 rounded-full ${sucio ? "bg-aviso" : guardado || id ? "bg-exito" : "bg-tenue/50"}`} />
                {guardando
                  ? "Guardando…"
                  : sucio
                    ? "Cambios sin guardar"
                    : guardado
                      ? "Guardada"
                      : id
                        ? "Sin cambios"
                        : "Aún no la guardas"}
                <span className="hidden font-mono text-xs sm:inline">
                  · {estado.dias.length} {estado.dias.length === 1 ? "día" : "días"} · {totalEjercicios} ejercicios
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {asignacion && <AsignarRutina {...asignacion} deshabilitado={sucio || !id} />}
                <Boton type="button" onClick={guardar} disabled={guardando || (!sucio && Boolean(id))} title="Ctrl + S">
                  <Save aria-hidden className="size-4" />
                  {guardando ? "Guardando…" : id ? "Guardar cambios" : "Guardar rutina"}
                </Boton>
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral: añadir ejercicios y resumen. */}
        <aside
          aria-label="Ejercicios y resumen"
          className="hidden overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-superficie lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100dvh-3rem)] lg:flex-col"
        >
          <div className="flex border-b border-linea" role="tablist" aria-label="Panel">
            {(
              [
                ["anadir", "Añadir ejercicios"],
                ["resumen", "Resumen"],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={panel === valor}
                aria-controls={`panel-${valor}`}
                onClick={() => setPanel(valor)}
                className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  panel === valor ? "border-tinta text-tinta" : "border-transparent text-tenue hover:text-tinta"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          <div id={`panel-${panel}`} role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {escritorio && (panel === "anadir" ? catalogoUI : <ResumenRutina dias={estado.dias} diaActual={diaActual} catalogo={catalogo} />)}
          </div>
        </aside>
      </div>

      <Dialogo abierto={catalogoMovil && !escritorio} alCerrar={() => setCatalogoMovil(false)} titulo="Añadir ejercicios">
        <div className="-mx-5 -mt-5 max-h-[70dvh] overflow-y-auto">{catalogoUI}</div>
        <Boton type="button" variante="secundario" className="mt-4 w-full" onClick={() => setCatalogoMovil(false)}>
          Listo
        </Boton>
      </Dialogo>
    </>
  );
}
