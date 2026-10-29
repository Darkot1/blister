"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Rocket, Trash2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { VistaPaginaPublica } from "@/components/pagina-publica/vista";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar";
import { Tarjeta, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { nombrePublico, urlFoto } from "@/lib/pagina-publica/contenido";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";
import { eliminarPagina, enlaceSubidaPortada, guardarPagina, type EstadoPagina } from "../acciones";
import { AjustarFoto } from "./ajustar-foto";
import { PASOS, aEntrada, aPagina, desdeInicial, esPaso, pasoCompleto, pasoDeError, serializar, type Borrador, type Inicial, type Paso } from "./modelo";
import { PasoConfianza, PasoContacto, PasoDiseno, PasoOferta, PasoPortada, PasoPublicar, type PropsPaso } from "./pasos";

const sinSuscripcion = () => () => {};

/**
 * Crear y editar la página pública, por pasos: portada → qué ofreces → confianza → contacto → diseño →
 * publicar. Mientras la página no está publicada es un asistente (cada paso se guarda como borrador al
 * seguir y el último la publica); ya publicada, los mismos pasos son secciones y los cambios se guardan
 * con la barra de abajo. La vista previa es la página real, en vivo. El paso va en la URL (?paso=).
 */
export function EditorPagina({
  inicial,
  entrenadores,
  editable,
}: {
  inicial: Inicial;
  entrenadores: PaginaPublica["entrenadores"];
  /** Solo propietario o admin pueden cambiarla. */
  editable: boolean;
}) {
  const [b, setB] = useState<Borrador>(() => desdeInicial(inicial));
  const [guardado, setGuardado] = useState(() => serializar(desdeInicial(inicial)));
  const [publicada, setPublicada] = useState(inicial.pagina_publica);
  const [recienPublicada, setRecienPublicada] = useState(false);
  const [estado, setEstado] = useState<EstadoPagina>({});
  const [guardando, iniciar] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pestana, setPestana] = useState<"editar" | "ver">("editar");
  const archivo = useRef<HTMLInputElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  // Foto elegida que aún se está encuadrando (no se sube hasta confirmar el ajuste).
  const [porAjustar, setPorAjustar] = useState<File | null>(null);
  const origen = useSyncExternalStore(sinSuscripcion, () => location.origin, () => "");

  // Creando: se empieza por el primer paso sin completar.
  const parametro = useSearchParams().get("paso");
  const [paso, setPaso] = useState<Paso>(() => {
    if (esPaso(parametro)) return parametro;
    if (inicial.pagina_publica) return "portada";
    const b0 = desdeInicial(inicial);
    return PASOS.slice(0, 4).find((p) => !pasoCompleto(b0, p.id))?.id ?? "diseno";
  });

  const creando = !publicada;
  const indice = PASOS.findIndex((p) => p.id === paso);
  const info = PASOS[indice];
  const sinGuardar = serializar(b) !== guardado;
  const errores = estado.errores ?? {};
  const enlace = `${origen}/e/${publicada ? guardadoSlug(guardado, b.slug) : b.slug}`;
  const quien = entrenadores[0]?.nombres || nombrePublico(entrenadores);

  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => setB((x) => ({ ...x, [campo]: valor }));

  const irA = (destino: Paso) => {
    setPaso(destino);
    setPestana("editar");
    // La URL guarda el paso (recargar o compartir lleva al mismo) sin pedir la página otra vez al servidor.
    window.history.replaceState(null, "", `?paso=${destino}`);
    if (tarjeta.current && tarjeta.current.getBoundingClientRect().top < 0) tarjeta.current.scrollIntoView({ block: "start" });
  };

  /** Guarda el borrador tal cual (o publicándolo). Si algo no valida, lleva al paso del primer error. */
  const guardar = (opciones: { publicar?: boolean; luego?: () => void } = {}) =>
    iniciar(async () => {
      const publicar = opciones.publicar ?? b.pagina_publica;
      const resultado = await guardarPagina(aEntrada(b, publicar));
      setEstado(resultado);
      if (!resultado.ok) {
        const conError = resultado.errores && pasoDeError(resultado.errores);
        if (conError && conError !== paso) irA(conError);
        return;
      }
      const final = { ...b, pagina_publica: publicar };
      setB(final);
      setGuardado(serializar(final));
      if (opciones.publicar) {
        setPublicada(true);
        setRecienPublicada(true);
      }
      opciones.luego?.();
    });

  const siguiente = () => {
    const destino = PASOS[indice + 1]?.id;
    if (!destino) return;
    // Creando, cada paso se guarda como borrador (sin publicar) para no perder nada.
    if (creando && sinGuardar) guardar({ luego: () => irA(destino) });
    else irA(destino);
  };

  /** Sube el recorte ya ajustado (WebP) y lo deja como portada del borrador. */
  const subirFoto = async (recorte: Blob) => {
    setSubiendo(true);
    setEstado({});
    try {
      // El servidor da un enlace firmado y la foto va directo a Storage (sin el cliente de Supabase aquí).
      const destino = await enlaceSubidaPortada();
      if ("error" in destino) throw new Error(destino.error);
      const respuesta = await fetch(destino.url, {
        method: "PUT",
        body: recorte,
        headers: { "content-type": "image/webp", "cache-control": "max-age=3600", "x-upsert": "false" },
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      cambiar("foto_ruta", destino.ruta);
    } catch {
      setEstado({ error: "No se pudo subir la foto. Prueba con otra imagen (JPG, PNG o WebP)." });
    } finally {
      setSubiendo(false);
    }
  };

  /** Volver a encuadrar la portada actual: se descarga y se abre en el ajuste como si se hubiera elegido. */
  const reajustar = async () => {
    try {
      const respuesta = await fetch(urlFoto(b.foto_ruta)!);
      if (!respuesta.ok) throw new Error();
      setPorAjustar(new File([await respuesta.blob()], "portada.webp", { type: "image/webp" }));
    } catch {
      setEstado({ error: "No se pudo abrir la foto para ajustarla. Prueba a subirla de nuevo." });
    }
  };

  if (!editable) {
    return <Tarjeta className="p-5 text-sm text-tenue">Solo el propietario o un administrador del espacio puede editar la página pública.</Tarjeta>;
  }

  const props: PropsPaso = { b, cambiar, actualizar: setB, errores, creando };
  const contenido: Record<Paso, React.ReactNode> = {
    portada: <PasoPortada {...props} foto={{ subiendo, elegir: () => archivo.current?.click(), reajustar }} />,
    oferta: <PasoOferta {...props} />,
    confianza: <PasoConfianza {...props} />,
    contacto: <PasoContacto {...props} />,
    diseno: <PasoDiseno {...props} />,
    publicar: <PasoPublicar {...props} enlace={enlace} quien={quien} publicada={publicada} irA={irA} />,
  };

  return (
    <div className="pb-28">
      <Pasos actual={paso} b={b} irA={irA} />

      <nav aria-label="Editor o vista previa" className={`${claseSegmentado} mb-4 lg:hidden`}>
        {(["editar", "ver"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={pestana === p} onClick={() => setPestana(p)} className={claseSegmento(pestana === p)}>
            {p === "editar" ? "Editar" : "Vista previa"}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <div className={`min-w-0 space-y-4 ${pestana === "ver" ? "hidden lg:block" : ""}`}>
          {estado.error && <Aviso>{estado.error}</Aviso>}
          {recienPublicada && paso === "publicar" && (
            <Aviso tipo="exito">¡Tu página ya está en línea! Compártela donde estén tus futuros alumnos: tu bio, tus estados y tus grupos.</Aviso>
          )}

          <Tarjeta className="scroll-mt-4 overflow-hidden" ref={tarjeta}>
            <section aria-labelledby="titulo-paso">
              <div className="border-b border-linea px-5 pt-5 pb-4">
                <p className="etiqueta tabular-nums">
                  Paso {indice + 1} de {PASOS.length}
                </p>
                <h2 id="titulo-paso" className="titulo-display mt-1 text-xl">
                  {paso === "publicar" && publicada ? "Tu enlace y cómo compartirlo" : info.titulo}
                </h2>
                <p className="mt-1 text-sm text-tenue">{info.texto}</p>
              </div>
              <div className="p-5">{contenido[paso]}</div>
              <div className="flex items-center justify-between gap-2 border-t border-linea px-5 py-4">
                <Boton type="button" variante="fantasma" className="px-3" disabled={indice === 0 || guardando} onClick={() => irA(PASOS[indice - 1].id)}>
                  <ArrowLeft aria-hidden className="size-4" /> Anterior
                </Boton>
                {paso !== "publicar" ? (
                  <Boton type="button" variante={creando ? "primario" : "secundario"} disabled={guardando || subiendo} onClick={siguiente}>
                    {guardando ? "Guardando…" : creando && sinGuardar ? "Guardar y seguir" : "Siguiente"} <ArrowRight aria-hidden className="size-4" />
                  </Boton>
                ) : creando ? (
                  <Boton type="button" disabled={guardando || subiendo} onClick={() => guardar({ publicar: true })}>
                    <Rocket aria-hidden className="size-4" /> {guardando ? "Publicando…" : "Publicar mi página"}
                  </Boton>
                ) : null}
              </div>
            </section>
          </Tarjeta>

          {paso === "publicar" && (publicada || inicial.titular || inicial.presentacion || inicial.foto_ruta) && (
            <section aria-labelledby="sec-eliminar" className="rounded-[var(--radius-tarjeta)] border border-dashed border-linea p-4">
              <h2 id="sec-eliminar" className="text-sm font-semibold">Eliminar página</h2>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xs text-sm text-tenue">La apaga y borra su contenido y su foto. Las solicitudes que ya recibiste se conservan.</p>
                <Boton type="button" variante="peligro" onClick={() => setEliminando(true)}>
                  <Trash2 aria-hidden className="size-4" /> Eliminar
                </Boton>
              </div>
            </section>
          )}
        </div>

        {/* Vista previa: la misma página que verá el visitante, a escala. */}
        <div className={`min-w-0 lg:sticky lg:top-6 ${pestana === "editar" ? "hidden lg:block" : ""}`}>
          <p className="etiqueta mb-2 hidden lg:block">Vista previa en vivo</p>
          <div className="overflow-hidden rounded-[var(--radius-elevada)] border border-linea bg-fondo lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <div className="pointer-events-none origin-top lg:[zoom:0.62]" aria-label="Vista previa de la página pública" role="img">
              <VistaPaginaPublica datos={aPagina(b, entrenadores)} formulario={<FormularioDeMuestra />} />
            </div>
          </div>
        </div>
      </div>

      <input
        ref={archivo}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir foto de portada"
        onChange={(e) => {
          // Primero se ajusta; se sube al confirmar. Limpiar el campo permite elegir la misma foto otra vez.
          if (e.target.files?.[0]) setPorAjustar(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <AjustarFoto
        archivo={porAjustar}
        alCancelar={() => setPorAjustar(null)}
        alConfirmar={(recorte) => {
          setPorAjustar(null);
          void subirFoto(recorte);
        }}
      />

      {/* Ya publicada: barra de guardado siempre a mano mientras haya cambios. */}
      <AnimatePresence>
        {publicada && (sinGuardar || (estado.ok && !recienPublicada)) && (
          <m.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-0 bottom-[calc(var(--alto-barra-inferior)+0.75rem)] z-30 flex justify-center px-4 lg:bottom-6"
          >
            <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-full border border-linea bg-superficie py-2 pr-2 pl-5 shadow-flotante">
              <span role="status" className="text-sm">
                {sinGuardar ? "Tienes cambios sin guardar" : <span className="inline-flex items-center gap-1.5 text-exito"><Check aria-hidden className="size-4" /> Guardado</span>}
              </span>
              <Boton type="button" disabled={!sinGuardar || guardando || subiendo} onClick={() => guardar()}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </Boton>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <DialogoConfirmar
        abierto={eliminando}
        titulo="¿Eliminar tu página pública?"
        textoConfirmar={<><Trash2 aria-hidden className="size-4" /> Eliminar página</>}
        pendiente={guardando}
        alCerrar={() => setEliminando(false)}
        alConfirmar={() =>
          iniciar(async () => {
            const resultado = await eliminarPagina();
            setEliminando(false);
            setEstado(resultado.ok ? {} : resultado);
            if (resultado.ok) {
              const vacia = desdeInicial({
                ...inicial,
                pagina_publica: false,
                titular: null,
                presentacion: null,
                foto_ruta: null,
                metodos: [],
                modalidad: null,
                ubicacion: null,
                experiencia_anos: null,
                certificaciones: null,
                instagram: null,
                whatsapp: null,
                testimonios: [],
                respuesta_horas: null,
                oferta_inicial: null,
                diseno: {},
                slug: b.slug,
              });
              setB(vacia);
              setGuardado(serializar(vacia));
              setPublicada(false);
              setRecienPublicada(false);
              irA("portada");
            }
          })
        }
      >
        <p>Se apagará el enlace y se borrarán la foto, los textos, los testimonios y los métodos. No se puede deshacer.</p>
        <p className="mt-2 text-tenue">Tu enlace y las solicitudes que ya recibiste se conservan.</p>
      </DialogoConfirmar>
    </div>
  );
}

/** El enlace publicado es el guardado, no el que se está escribiendo (aún no existe). */
function guardadoSlug(guardado: string, actual: string) {
  try {
    return (JSON.parse(guardado) as { slug?: string }).slug || actual;
  } catch {
    return actual;
  }
}

/**
 * Los pasos, arriba: dónde estás, qué está completo y salto directo a cualquiera. En el celular se
 * desplazan de lado dentro de su propia franja (sin ensanchar la página).
 * `relative` en la lista: los textos `sr-only` (absolutos) quedan dentro de ella y no ensanchan la página.
 */
function Pasos({ actual, b, irA }: { actual: Paso; b: Borrador; irA: (p: Paso) => void }) {
  const indice = PASOS.findIndex((p) => p.id === actual);
  return (
    <nav aria-label="Pasos de tu página" className="mb-5">
      <div aria-hidden className="mb-3 h-1 overflow-hidden rounded-full bg-hueso">
        <div className="h-full rounded-full bg-acento transition-[width] duration-500" style={{ width: `${((indice + 1) / PASOS.length) * 100}%` }} />
      </div>
      <ol className="relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {PASOS.map((p, i) => {
          const completo = pasoCompleto(b, p.id);
          const esActual = p.id === actual;
          return (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => irA(p.id)}
                aria-current={esActual ? "step" : undefined}
                className={`inline-flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-sm transition-colors ${
                  esActual ? "bg-tinta text-sobre-tinta" : "text-grafito hover:bg-hueso hover:text-tinta"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-6 place-items-center rounded-full text-xs tabular-nums ${
                    esActual ? "bg-sobre-tinta/15" : completo ? "bg-exito/15 text-exito" : "bg-hueso"
                  }`}
                >
                  {completo && !esActual ? <Check className="size-3.5" /> : i + 1}
                </span>
                {p.corto}
                {completo && <span className="sr-only"> (completo)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** El formulario en la vista previa: se ve igual pero no envía nada. */
function FormularioDeMuestra() {
  return (
    <div aria-hidden className="space-y-4">
      <div className="grid grid-cols-2 rounded-full bg-hueso p-1">
        <span className={`${claseSegmento(true)} inline-flex items-center justify-center`}>Quiero entrenar</span>
        <span className={`${claseSegmento(false)} inline-flex items-center justify-center`}>Tengo una pregunta</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {["Nombre", "Apellidos", "Correo", "Teléfono o WhatsApp"].map((e) => (
          <div key={e}>
            <p className="mb-1.5 text-sm font-medium">{e}</p>
            <div className={claseControl} />
          </div>
        ))}
      </div>
      <div className="h-11 rounded-full bg-acento" />
    </div>
  );
}
