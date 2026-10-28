"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Crop, ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { VistaPaginaPublica } from "@/components/pagina-publica/vista";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Selector, claseAreaTexto, claseControl } from "@/components/ui/campo";
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar";
import { CabeceraTarjeta, Tarjeta, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import {
  BUCKET_PAGINAS,
  ETIQUETA_MODALIDAD,
  MAX_METODOS,
  normalizarDiseno,
  urlFoto,
  type Diseno,
} from "@/lib/pagina-publica/contenido";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import type { MetodoTrabajo, OrganizacionFila, PaginaPublica } from "@/lib/supabase/tipos-bd";
import { eliminarPagina, guardarPagina, type EstadoPagina } from "../acciones";
import { AjustarFoto } from "./ajustar-foto";
import { PanelDiseno } from "./diseno";

type Inicial = Pick<
  OrganizacionFila,
  | "nombre"
  | "slug"
  | "pagina_publica"
  | "titular"
  | "presentacion"
  | "foto_ruta"
  | "metodos"
  | "modalidad"
  | "ubicacion"
  | "experiencia_anos"
  | "certificaciones"
  | "instagram"
  | "whatsapp"
  | "diseno"
>;

/** El formulario guarda texto tal cual se escribe; al guardar se valida y se normaliza en el servidor. */
type Borrador = {
  pagina_publica: boolean;
  slug: string;
  titular: string;
  presentacion: string;
  foto_ruta: string | null;
  metodos: (MetodoTrabajo & { clave: string })[];
  modalidad: string;
  ubicacion: string;
  experiencia_anos: string;
  certificaciones: string;
  instagram: string;
  whatsapp: string;
  diseno: Diseno;
};

const clave = () => crypto.randomUUID();

const desdeInicial = (i: Inicial): Borrador => ({
  pagina_publica: i.pagina_publica,
  slug: i.slug,
  titular: i.titular ?? "",
  presentacion: i.presentacion ?? "",
  foto_ruta: i.foto_ruta,
  // Claves fijas para lo que viene del servidor (iguales al hidratar); aleatorias solo para lo nuevo.
  metodos: (i.metodos ?? []).map((m, n) => ({ ...m, clave: `guardado-${n}` })),
  modalidad: i.modalidad ?? "",
  ubicacion: i.ubicacion ?? "",
  experiencia_anos: i.experiencia_anos === null ? "" : String(i.experiencia_anos),
  certificaciones: i.certificaciones ?? "",
  instagram: i.instagram ?? "",
  whatsapp: i.whatsapp ?? "",
  diseno: normalizarDiseno(i.diseno),
});

/** Ideas para empezar: el entrenador las adapta o las borra. */
const METODOS_SUGERIDOS: MetodoTrabajo[] = [
  { titulo: "Evaluación inicial", descripcion: "Antes de entrenar, medimos tu punto de partida: movilidad, fuerza, historial y objetivos." },
  { titulo: "Plan a tu medida", descripcion: "Una rutina pensada para ti, con progresión semana a semana según cómo respondes." },
  { titulo: "Seguimiento real", descripcion: "Registro cada sesión y tus mediciones para ajustar el plan con datos, no a ojo." },
];

const sinSuscripcion = () => () => {};

export function EditorPagina({
  organizacionId,
  inicial,
  entrenadores,
  editable,
}: {
  organizacionId: string;
  inicial: Inicial;
  entrenadores: PaginaPublica["entrenadores"];
  /** Solo propietario o admin pueden cambiarla. */
  editable: boolean;
}) {
  const [b, setB] = useState<Borrador>(() => desdeInicial(inicial));
  const [guardado, setGuardado] = useState(() => JSON.stringify(desdeInicial(inicial), (k, v) => (k === "clave" ? undefined : v)));
  const [estado, setEstado] = useState<EstadoPagina>({});
  const [guardando, iniciar] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pestana, setPestana] = useState<"editar" | "ver">("editar");
  const [panel, setPanel] = useState<"contenido" | "diseno">("contenido");
  const [copiado, setCopiado] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  // Foto elegida que aún se está encuadrando (no se sube hasta confirmar el ajuste).
  const [porAjustar, setPorAjustar] = useState<File | null>(null);
  const quieto = useReducedMotion();
  const origen = useSyncExternalStore(sinSuscripcion, () => location.origin, () => "");

  const cambiar = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => setB((x) => ({ ...x, [campo]: valor }));
  const cambiarMetodo = (i: number, campo: keyof MetodoTrabajo, valor: string) =>
    setB((x) => ({ ...x, metodos: x.metodos.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)) }));
  const moverMetodo = (i: number, dir: -1 | 1) =>
    setB((x) => {
      const metodos = [...x.metodos];
      [metodos[i], metodos[i + dir]] = [metodos[i + dir], metodos[i]];
      return { ...x, metodos };
    });

  const serializado = JSON.stringify(b, (k, v) => (k === "clave" ? undefined : v));
  const sinGuardar = serializado !== guardado;
  const errores = estado.errores ?? {};
  const enlace = `${origen}/e/${inicial.slug}`;

  /** Sube el recorte ya ajustado (WebP) y lo deja como portada del borrador. */
  const subirFoto = async (recorte: Blob) => {
    setSubiendo(true);
    setEstado({});
    try {
      const ruta = `${organizacionId}/portada-${clave()}.webp`;
      const { error } = await crearClienteNavegador().storage.from(BUCKET_PAGINAS).upload(ruta, recorte, { contentType: "image/webp" });
      if (error) throw error;
      cambiar("foto_ruta", ruta);
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

  const guardar = () =>
    iniciar(async () => {
      const resultado = await guardarPagina({
        ...b,
        modalidad: (b.modalidad || null) as "presencial" | "en_linea" | "mixta" | null,
        experiencia_anos: b.experiencia_anos.trim() === "" ? null : Number(b.experiencia_anos),
        metodos: b.metodos.map(({ titulo, descripcion }) => ({ titulo, descripcion })),
      });
      setEstado(resultado);
      if (resultado.ok) setGuardado(serializado);
    });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  };

  // Lo que ve el visitante, con lo que se está escribiendo ahora mismo.
  const vista: PaginaPublica = {
    nombre: inicial.nombre,
    titular: b.titular.trim() || null,
    presentacion: b.presentacion.trim() || null,
    foto_ruta: b.foto_ruta,
    metodos: b.metodos,
    modalidad: (b.modalidad || null) as PaginaPublica["modalidad"],
    ubicacion: b.ubicacion.trim() || null,
    experiencia_anos: b.experiencia_anos.trim() === "" ? null : Number(b.experiencia_anos) || null,
    certificaciones: b.certificaciones.trim() || null,
    instagram: b.instagram.trim().replace(/^@/, "") || null,
    whatsapp: b.whatsapp.trim() || null,
    diseno: b.diseno,
    entrenadores,
  };

  if (!editable) {
    return (
      <Tarjeta className="p-5 text-sm text-tenue">
        Solo el propietario o un administrador del espacio puede editar la página pública.
      </Tarjeta>
    );
  }

  return (
    <div className="pb-24">
      <nav aria-label="Editor o vista previa" className={`${claseSegmentado} mb-4 lg:hidden`}>
        {(["editar", "ver"] as const).map((p) => (
          <button key={p} type="button" aria-pressed={pestana === p} onClick={() => setPestana(p)} className={claseSegmento(pestana === p)}>
            {p === "editar" ? "Editar" : "Vista previa"}
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className={`space-y-4 ${pestana === "ver" ? "hidden lg:block" : ""}`}>
          {estado.error && <Aviso>{estado.error}</Aviso>}

          <nav aria-label="Qué editar" className="grid grid-cols-2 rounded-full bg-hueso p-1">
            {(["contenido", "diseno"] as const).map((p) => (
              <button key={p} type="button" aria-pressed={panel === p} onClick={() => setPanel(p)} className={claseSegmento(panel === p)}>
                {p === "contenido" ? "Contenido" : "Diseño"}
              </button>
            ))}
          </nav>

          {panel === "diseno" ? (
            <PanelDiseno diseno={b.diseno} errores={errores} alCambiar={(cambio) => setB((x) => ({ ...x, diseno: cambio(x.diseno) }))} />
          ) : (
          <>

          {/* Publicación */}
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="sec-publicacion">
              <CabeceraTarjeta id="sec-publicacion" titulo="Publicación" />
              <div className="space-y-4 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium">Mostrar mi página</span>
                    <span className="block text-xs text-tenue">Apagada, el enlace muestra «no encontrada».</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={b.pagina_publica}
                    onChange={(e) => cambiar("pagina_publica", e.target.checked)}
                    className="peer sr-only"
                  />
                  <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-linea-fuerte transition-colors peer-checked:bg-acento peer-focus-visible:ring-2 peer-focus-visible:ring-acento peer-focus-visible:ring-offset-2">
                    <motion.span
                      className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm"
                      animate={{ x: b.pagina_publica ? 16 : 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 32 }}
                    />
                  </span>
                </label>
                <div>
                  <label htmlFor="slug" className="mb-1.5 block text-sm font-medium">Tu enlace</label>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-sm text-tenue">/e/</span>
                    <input
                      id="slug"
                      value={b.slug}
                      onChange={(e) => cambiar("slug", e.target.value.toLowerCase())}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={40}
                      aria-invalid={Boolean(errores.slug)}
                      aria-describedby="slug-ayuda"
                      className={claseControl}
                    />
                  </div>
                  <p id="slug-ayuda" className={`mt-1.5 text-xs ${errores.slug ? "text-peligro" : "text-tenue"}`}>
                    {errores.slug?.[0] ?? "Ej.: entrena-con-laura. Si lo cambias, el enlace anterior deja de funcionar."}
                  </p>
                </div>
                {inicial.pagina_publica && (
                  <div className="flex items-center gap-1 rounded-2xl bg-hueso py-1.5 pr-1.5 pl-3">
                    <span className="min-w-0 flex-1 truncate text-sm tabular-nums">{enlace}</span>
                    <button type="button" onClick={copiar} aria-label="Copiar enlace" className="grid size-8 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie hover:text-tinta">
                      {copiado ? <Check aria-hidden className="size-4 text-exito" /> : <Copy aria-hidden className="size-4" />}
                    </button>
                    <a href={`/e/${inicial.slug}`} target="_blank" rel="noreferrer" aria-label="Abrir la página en otra pestaña" className="grid size-8 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-superficie hover:text-tinta">
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                    <span role="status" className="sr-only">{copiado ? "Enlace copiado" : ""}</span>
                  </div>
                )}
              </div>
            </section>
          </Tarjeta>

          {/* Portada */}
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="sec-portada">
              <CabeceraTarjeta id="sec-portada" titulo="Portada" />
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1.5 text-sm font-medium">Foto</p>
                  {b.foto_ruta ? (
                    <div className="relative overflow-hidden rounded-2xl border border-linea">
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del editor, ya reducida al subirla */}
                      <img src={urlFoto(b.foto_ruta)!} alt="Foto de portada" className="aspect-[16/9] w-full object-cover" />
                      <div className="absolute right-2 bottom-2 flex gap-1.5">
                        <Boton type="button" variante="secundario" className="h-8 bg-superficie/90 px-3 backdrop-blur" disabled={subiendo} onClick={reajustar}>
                          <Crop aria-hidden className="size-4" /> Ajustar
                        </Boton>
                        <Boton type="button" variante="secundario" className="h-8 bg-superficie/90 px-3 backdrop-blur" disabled={subiendo} onClick={() => archivo.current?.click()}>
                          <ImagePlus aria-hidden className="size-4" /> Cambiar
                        </Boton>
                        <Boton type="button" variante="peligro" className="h-8 bg-superficie/90 px-3 backdrop-blur" disabled={subiendo} onClick={() => cambiar("foto_ruta", null)}>
                          <Trash2 aria-hidden className="size-4" /> Quitar
                        </Boton>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={subiendo}
                      onClick={() => archivo.current?.click()}
                      className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-linea-fuerte/70 text-sm text-tenue transition-colors hover:border-tinta hover:text-tinta disabled:opacity-60"
                    >
                      <ImagePlus aria-hidden className="size-6" />
                      {subiendo ? "Subiendo…" : "Subir una foto tuya entrenando o de tu espacio"}
                      <span className="text-xs">JPG, PNG o WebP. Mejor horizontal.</span>
                    </button>
                  )}
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
                </div>
                <Campo
                  etiqueta="Titular"
                  nombre="titular"
                  value={b.titular}
                  onChange={(e) => cambiar("titular", e.target.value)}
                  maxLength={120}
                  placeholder="Ej.: Fuerza y salud para adultos con poco tiempo"
                  errores={errores.titular}
                  ayuda="La frase grande de la portada. Si la dejas vacía: «Entrena con tu nombre»."
                />
              </div>
            </section>
          </Tarjeta>

          {/* Sobre ti */}
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="sec-sobre">
              <CabeceraTarjeta id="sec-sobre" titulo="Sobre ti" />
              <div className="space-y-4 p-4">
                <AreaTexto
                  etiqueta="Qué haces y para quién"
                  nombre="presentacion"
                  rows={6}
                  maxLength={1500}
                  value={b.presentacion}
                  onChange={(e) => cambiar("presentacion", e.target.value)}
                  placeholder="Ej.: Soy entrenador personal desde 2017. Trabajo con adultos que quieren ganar fuerza, perder grasa o volver a moverse sin dolor…"
                  errores={errores.presentacion}
                  ayuda={`${b.presentacion.length}/1500`}
                />
                <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <Campo
                    etiqueta="Años de experiencia"
                    nombre="experiencia_anos"
                    inputMode="numeric"
                    value={b.experiencia_anos}
                    onChange={(e) => cambiar("experiencia_anos", e.target.value.replace(/\D/g, "").slice(0, 2))}
                    errores={errores.experiencia_anos}
                  />
                  <Campo
                    etiqueta="Certificaciones"
                    nombre="certificaciones"
                    value={b.certificaciones}
                    onChange={(e) => cambiar("certificaciones", e.target.value)}
                    maxLength={400}
                    placeholder="Ej.: NSCA-CPT, Licenciado en Educación Física"
                    errores={errores.certificaciones}
                    ayuda="Sepáralas con comas."
                  />
                </div>
              </div>
            </section>
          </Tarjeta>

          {/* Métodos */}
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="sec-metodos">
              <CabeceraTarjeta id="sec-metodos" titulo="Cómo trabajas" accion={<span className="tabular-nums text-xs text-tenue">{b.metodos.length}/{MAX_METODOS}</span>} />
              <div className="space-y-3 p-4">
                <p className="text-sm text-tenue">Tus métodos o pasos: cómo es empezar contigo y qué te diferencia.</p>
                {errores.metodos && <p className="text-sm text-peligro">{errores.metodos[0]}</p>}
                <ol className="space-y-3">
                  <AnimatePresence initial={false}>
                    {b.metodos.map((m, i) => (
                      <motion.li
                        key={m.clave}
                        layout={!quieto}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: quieto ? 0 : 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 rounded-2xl border border-linea p-3">
                          <div className="flex items-center gap-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acento/10 text-xs font-semibold tabular-nums text-acento">{i + 1}</span>
                            <label className="sr-only" htmlFor={`metodo-${m.clave}`}>Título del método {i + 1}</label>
                            <input
                              id={`metodo-${m.clave}`}
                              value={m.titulo}
                              onChange={(e) => cambiarMetodo(i, "titulo", e.target.value)}
                              maxLength={60}
                              placeholder="Título"
                              className={`${claseControl} h-9`}
                            />
                            <button type="button" disabled={i === 0} onClick={() => moverMetodo(i, -1)} aria-label={`Subir método ${i + 1}`} className="grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30">
                              <ArrowUp aria-hidden className="size-4" />
                            </button>
                            <button type="button" disabled={i === b.metodos.length - 1} onClick={() => moverMetodo(i, 1)} aria-label={`Bajar método ${i + 1}`} className="grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30">
                              <ArrowDown aria-hidden className="size-4" />
                            </button>
                            <button type="button" onClick={() => cambiar("metodos", b.metodos.filter((_, j) => j !== i))} aria-label={`Eliminar método ${i + 1}`} className="grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-peligro/10 hover:text-peligro">
                              <Trash2 aria-hidden className="size-4" />
                            </button>
                          </div>
                          <label className="sr-only" htmlFor={`metodo-desc-${m.clave}`}>Descripción del método {i + 1}</label>
                          <textarea
                            id={`metodo-desc-${m.clave}`}
                            value={m.descripcion}
                            onChange={(e) => cambiarMetodo(i, "descripcion", e.target.value)}
                            maxLength={300}
                            rows={2}
                            placeholder="En qué consiste, en una o dos frases."
                            className={claseAreaTexto}
                          />
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Boton
                    type="button"
                    variante="secundario"
                    disabled={b.metodos.length >= MAX_METODOS}
                    onClick={() => cambiar("metodos", [...b.metodos, { titulo: "", descripcion: "", clave: clave() }])}
                  >
                    <Plus aria-hidden className="size-4" /> Añadir método
                  </Boton>
                  {b.metodos.length === 0 && (
                    <Boton type="button" variante="fantasma" onClick={() => cambiar("metodos", METODOS_SUGERIDOS.map((m) => ({ ...m, clave: clave() })))}>
                      Usar ejemplos para empezar
                    </Boton>
                  )}
                </div>
              </div>
            </section>
          </Tarjeta>

          {/* Dónde y contacto */}
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby="sec-contacto">
              <CabeceraTarjeta id="sec-contacto" titulo="Dónde y contacto" />
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <Selector
                  etiqueta="Modalidad"
                  nombre="modalidad"
                  value={b.modalidad}
                  onChange={(e) => cambiar("modalidad", e.target.value)}
                  opciones={[{ valor: "", texto: "Sin indicar" }, ...Object.entries(ETIQUETA_MODALIDAD).map(([valor, texto]) => ({ valor, texto }))]}
                />
                <Campo
                  etiqueta="Zona"
                  nombre="ubicacion"
                  value={b.ubicacion}
                  onChange={(e) => cambiar("ubicacion", e.target.value)}
                  maxLength={80}
                  placeholder="Ej.: Laureles, Medellín"
                  errores={errores.ubicacion}
                />
                <Campo
                  etiqueta="WhatsApp (opcional)"
                  nombre="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={b.whatsapp}
                  onChange={(e) => cambiar("whatsapp", e.target.value)}
                  placeholder="+57 300 123 4567"
                  errores={errores.whatsapp}
                  ayuda="Será público en la página."
                />
                <Campo
                  etiqueta="Instagram (opcional)"
                  nombre="instagram"
                  value={b.instagram}
                  onChange={(e) => cambiar("instagram", e.target.value)}
                  placeholder="tu_usuario"
                  errores={errores.instagram}
                />
              </div>
            </section>
          </Tarjeta>

          </>
          )}

          {/* Eliminar */}
          <section aria-labelledby="sec-eliminar" className="rounded-[var(--radius-tarjeta)] border border-dashed border-linea p-4">
            <h2 id="sec-eliminar" className="text-sm font-semibold">Eliminar página</h2>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xs text-sm text-tenue">La apaga y borra su contenido y su foto. Las solicitudes que ya recibiste se conservan.</p>
              <Boton type="button" variante="peligro" onClick={() => setEliminando(true)}>
                <Trash2 aria-hidden className="size-4" /> Eliminar
              </Boton>
            </div>
          </section>
        </div>

        {/* Vista previa: la misma página que verá el visitante, a escala. */}
        <div className={`lg:sticky lg:top-6 ${pestana === "editar" ? "hidden lg:block" : ""}`}>
          <p className="etiqueta mb-2 hidden lg:block">Vista previa</p>
          <div className="overflow-hidden rounded-[var(--radius-elevada)] border border-linea bg-fondo lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            <div className="pointer-events-none origin-top lg:[zoom:0.62]" aria-label="Vista previa de la página pública" role="img">
              <VistaPaginaPublica datos={vista} formulario={<FormularioDeMuestra />} />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de guardado: siempre a mano mientras haya cambios. */}
      <AnimatePresence>
        {(sinGuardar || estado.ok) && (
          <motion.div
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
              <Boton type="button" disabled={!sinGuardar || guardando || subiendo} onClick={guardar}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </Boton>
            </div>
          </motion.div>
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
              const vacia = desdeInicial({ ...inicial, pagina_publica: false, titular: null, presentacion: null, foto_ruta: null, metodos: [], modalidad: null, ubicacion: null, experiencia_anos: null, certificaciones: null, instagram: null, whatsapp: null, diseno: {}, slug: b.slug });
              setB(vacia);
              setGuardado(JSON.stringify(vacia, (k, v) => (k === "clave" ? undefined : v)));
            }
          })
        }
      >
        <p>Se apagará el enlace y se borrarán la foto, los textos y los métodos. No se puede deshacer.</p>
        <p className="mt-2 text-tenue">Tu enlace y las solicitudes que ya recibiste se conservan.</p>
      </DialogoConfirmar>
    </div>
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
