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
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, Columns2, Eye, EyeOff, GripVertical, Lock, Pipette, RectangleHorizontal } from "lucide-react";
import { Campo } from "@/components/ui/campo";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { COLORES, ETIQUETA_SECCION, contrasteBajo, textoSobre, type Diseno, type Seccion } from "@/lib/pagina-publica/contenido";
import { anunciosDnd, instruccionesDnd } from "@/lib/dnd-accesible";

type SeccionDiseno = Diseno["secciones"][number];

const PORTADAS: { valor: Diseno["portada"]; nombre: string }[] = [
  { valor: "izquierda", nombre: "Texto a la izquierda" },
  { valor: "centrada", nombre: "Texto centrado" },
  { valor: "abajo", nombre: "Texto abajo" },
];

const FONDOS: { valor: Diseno["fondo"]; nombre: string }[] = [
  { valor: "suave", nombre: "Suave" },
  { valor: "oscuro", nombre: "Oscuro" },
  { valor: "color", nombre: "Color principal" },
];

/**
 * Personalización de la página pública: orden, ancho y visibilidad de las secciones en una rejilla de
 * dos columnas (arrastrando o con el teclado), color principal, estilo y fondo de la portada y texto
 * del botón. Todo se ve al instante en la vista previa.
 */
export function PanelDiseno({
  diseno,
  errores,
  alCambiar,
}: {
  diseno: Diseno;
  errores: Record<string, string[] | undefined>;
  /** Recibe una función sobre el diseño vigente: varios cambios seguidos no se pisan. */
  alCambiar: (cambio: (actual: Diseno) => Diseno) => void;
}) {
  const idDnd = useId();
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const cambiar = <K extends keyof Diseno>(campo: K, valor: Diseno[K] | ((actual: Diseno[K]) => Diseno[K])) =>
    alCambiar((d) => ({ ...d, [campo]: typeof valor === "function" ? (valor as (a: Diseno[K]) => Diseno[K])(d[campo]) : valor }));
  const cambiarSeccion = (id: SeccionDiseno["id"], cambio: Partial<SeccionDiseno>) =>
    cambiar("secciones", (secciones) => secciones.map((x) => (x.id === id ? { ...x, ...cambio } : x)));

  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    cambiar("secciones", (secciones) => {
      const desde = secciones.findIndex((s) => s.id === active.id);
      const hasta = secciones.findIndex((s) => s.id === over.id);
      return desde >= 0 && hasta >= 0 ? arrayMove(secciones, desde, hasta) : secciones;
    });
  };

  /** Alternativa al arrastre (táctil, teclado o sin precisión): subir o bajar un puesto. */
  const mover = (id: Seccion, paso: -1 | 1) =>
    cambiar("secciones", (secciones) => {
      const desde = secciones.findIndex((s) => s.id === id);
      const hasta = desde + paso;
      return desde < 0 || hasta < 0 || hasta >= secciones.length ? secciones : arrayMove(secciones, desde, hasta);
    });

  const propio = !COLORES.some((c) => c.valor === diseno.acento);

  return (
    <div className="space-y-4">
      <Tarjeta className="overflow-hidden">
        <section aria-labelledby="dis-secciones">
          <CabeceraTarjeta id="dis-secciones" titulo="Orden de la página" />
          <div className="space-y-2 p-4">
            <p className="text-sm text-tenue">
              Arrastra los bloques o usa las flechas para ordenarlos. Cada uno ocupa toda la fila o media: dos mitades seguidas quedan lado a lado.
            </p>
            <div className="flex items-center gap-2 rounded-2xl bg-hueso/60 px-3 py-2.5 text-sm text-tenue">
              <Lock aria-hidden className="size-4" /> Portada <span className="ml-auto text-xs">siempre arriba</span>
            </div>
            <DndContext
              id={idDnd}
              sensors={sensores}
              collisionDetection={closestCenter}
              onDragEnd={alSoltar}
              accessibility={{ announcements: anunciosDnd((id) => ETIQUETA_SECCION[id as Seccion] ?? String(id)), screenReaderInstructions: instruccionesDnd }}
            >
              <SortableContext items={diseno.secciones.map((s) => s.id)} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-2 gap-2">
                  {diseno.secciones.map((s, i) => (
                    <BloqueSeccion
                      key={s.id}
                      seccion={s}
                      alSubir={i > 0 ? () => mover(s.id, -1) : undefined}
                      alBajar={i < diseno.secciones.length - 1 ? () => mover(s.id, 1) : undefined}
                      alAlternar={() => cambiarSeccion(s.id, { visible: !s.visible })}
                      alCambiarAncho={() => cambiarSeccion(s.id, { ancho: s.ancho === "completo" ? "mitad" : "completo" })}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </section>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <section aria-labelledby="dis-color">
          <CabeceraTarjeta id="dis-color" titulo="Color principal" />
          <div className="p-4">
            <p className="mb-3 text-sm text-tenue">Botones, números y detalles de la página.</p>
            <div role="radiogroup" aria-label="Color principal" className="flex flex-wrap items-center gap-2.5">
              {COLORES.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  role="radio"
                  aria-checked={diseno.acento === c.valor}
                  aria-label={c.nombre}
                  title={c.nombre}
                  onClick={() => cambiar("acento", c.valor)}
                  style={{ backgroundColor: c.valor }}
                  className="grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-superficie transition-transform hover:scale-110 aria-checked:ring-2 aria-checked:ring-tinta"
                >
                  {diseno.acento === c.valor && <Check aria-hidden className="size-4 text-white" />}
                </button>
              ))}
              {/* Color propio: el selector del sistema dentro de un círculo. */}
              <label
                title="Otro color"
                style={propio ? { backgroundColor: diseno.acento } : undefined}
                className={`relative grid size-9 cursor-pointer place-items-center rounded-full border border-dashed border-linea-fuerte ring-offset-2 ring-offset-superficie has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento ${
                  propio ? "border-transparent ring-2 ring-tinta" : ""
                }`}
              >
                <Pipette aria-hidden className={`size-4 ${propio ? "" : "text-tenue"}`} style={{ color: propio ? textoSobre(diseno.acento) : undefined }} />
                <input
                  type="color"
                  value={diseno.acento}
                  onChange={(e) => cambiar("acento", e.target.value)}
                  aria-label="Elegir otro color"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            {contrasteBajo(diseno.acento) && (
              <p role="status" className="mt-2 text-sm text-aviso">
                Poco contraste: con este color los números y detalles se leerán mal. Los botones ajustan su texto solos.
              </p>
            )}
            {errores["diseno.acento"] && <p className="mt-2 text-sm text-peligro">{errores["diseno.acento"][0]}</p>}
          </div>
        </section>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <section aria-labelledby="dis-portada">
          <CabeceraTarjeta id="dis-portada" titulo="Portada" />
          <div className="space-y-5 p-4">
            <p className="text-sm text-tenue">Tu foto de portada va siempre detrás del texto.</p>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Posición del texto</legend>
              <div className="grid grid-cols-3 gap-2">
                {PORTADAS.map((p) => (
                  <label
                    key={p.valor}
                    className="cursor-pointer rounded-2xl border border-linea p-2 transition-colors hover:border-linea-fuerte has-[:checked]:border-acento has-[:checked]:bg-acento/[0.06] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento"
                  >
                    <input type="radio" name="portada" value={p.valor} checked={diseno.portada === p.valor} onChange={() => cambiar("portada", p.valor)} className="sr-only" />
                    <MiniPortada estilo={p.valor} fondo={diseno.fondo} />
                    <span className="mt-2 block text-xs font-medium leading-snug">{p.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm font-medium">Fondo</legend>
              <p className="mb-2 text-xs text-tenue">Sin foto, es el color de la portada; con foto, el tono que la cubre para que el texto se lea.</p>
              <div className="flex flex-wrap gap-2">
                {FONDOS.map((f) => (
                  <label
                    key={f.valor}
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-linea px-3.5 text-sm transition-colors hover:border-linea-fuerte has-[:checked]:border-acento has-[:checked]:bg-acento/[0.06] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento"
                  >
                    <input type="radio" name="fondo" value={f.valor} checked={diseno.fondo === f.valor} onChange={() => cambiar("fondo", f.valor)} className="sr-only" />
                    <span
                      aria-hidden
                      className={`size-3.5 rounded-full border border-linea-fuerte ${f.valor === "suave" ? "bg-superficie" : f.valor === "oscuro" ? "bg-[#12121b]" : ""}`}
                      style={f.valor === "color" ? { backgroundColor: diseno.acento } : undefined}
                    />
                    {f.nombre}
                  </label>
                ))}
              </div>
            </fieldset>

            <Campo
              etiqueta="Texto del botón principal"
              nombre="boton"
              value={diseno.boton}
              maxLength={30}
              onChange={(e) => cambiar("boton", e.target.value)}
              placeholder="Quiero entrenar"
              errores={errores["diseno.boton"]}
              ayuda="Ej.: Reserva tu evaluación, Empieza hoy."
            />
          </div>
        </section>
      </Tarjeta>
    </div>
  );
}

/** Un bloque de la rejilla: ocupa una o dos columnas, como en la página. */
function BloqueSeccion({
  seccion,
  alAlternar,
  alCambiarAncho,
  alSubir,
  alBajar,
}: {
  seccion: SeccionDiseno;
  alAlternar: () => void;
  alCambiarAncho: () => void;
  /** Sin función: ya está en el extremo. */
  alSubir?: () => void;
  alBajar?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: seccion.id });
  // El formulario no se oculta: es adonde lleva el botón principal.
  const fija = seccion.id === "contacto";
  const visible = seccion.visible || fija;
  const nombre = ETIQUETA_SECCION[seccion.id];
  const completo = seccion.ancho === "completo";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex min-h-20 flex-col justify-between gap-2 rounded-2xl border p-2 text-sm ${completo ? "col-span-2" : ""} ${
        isDragging ? "z-10 border-acento bg-superficie shadow-flotante" : visible ? "border-linea bg-superficie" : "border-dashed border-linea bg-hueso/40 text-tenue"
      }`}
    >
      <div className="flex items-start gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover ${nombre}`}
          className="grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
        <span className={`min-w-0 flex-1 pt-2.5 leading-snug ${visible ? "font-medium" : "line-through"}`}>{nombre}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={alSubir}
          disabled={!alSubir}
          aria-label={`Subir ${nombre}`}
          className="grid size-10 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <ArrowUp aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={alBajar}
          disabled={!alBajar}
          aria-label={`Bajar ${nombre}`}
          className="grid size-10 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <ArrowDown aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={alCambiarAncho}
          aria-label={`${nombre}: ${completo ? "ancho completo" : "media columna"}. Cambiar a ${completo ? "media columna" : "ancho completo"}`}
          title={completo ? "Ancho completo (clic para media columna)" : "Media columna (clic para ancho completo)"}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-xs text-tenue hover:bg-hueso hover:text-tinta"
        >
          {completo ? <RectangleHorizontal aria-hidden className="size-3.5" /> : <Columns2 aria-hidden className="size-3.5" />}
          {completo ? "Completo" : "Mitad"}
        </button>
        {fija ? (
          <span className="px-1.5 text-xs text-tenue" title="El botón principal lleva aquí">Siempre</span>
        ) : (
          <button
            type="button"
            onClick={alAlternar}
            aria-pressed={!seccion.visible}
            aria-label={`${seccion.visible ? "Ocultar" : "Mostrar"} ${nombre}`}
            className="grid size-10 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta"
          >
            {seccion.visible ? <Eye aria-hidden className="size-3.5" /> : <EyeOff aria-hidden className="size-3.5" />}
          </button>
        )}
      </div>
    </li>
  );
}

/** Dibujo de cada posición del texto, con una "foto" de fondo y el tono elegido encima. */
function MiniPortada({ estilo, fondo }: { estilo: Diseno["portada"]; fondo: Diseno["fondo"] }) {
  const claras = fondo !== "suave";
  const velo = fondo === "suave" ? "bg-superficie/75" : fondo === "oscuro" ? "bg-black/55" : "bg-acento/70";
  return (
    <span aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-linea bg-[linear-gradient(135deg,#8a8f98,#4b5058)]">
      <span className={`absolute inset-0 ${velo}`} />
      <span
        className={`relative flex h-full p-2 ${
          estilo === "izquierda" ? "items-center" : estilo === "centrada" ? "items-center justify-center" : "items-end"
        }`}
      >
        <span className={`flex flex-col gap-1 ${estilo === "centrada" ? "items-center" : ""}`}>
          <span className={`h-1.5 w-10 rounded-full ${claras ? "bg-white/90" : "bg-tinta/70"}`} />
          <span className={`h-1.5 w-7 rounded-full ${claras ? "bg-white/60" : "bg-tinta/40"}`} />
          <span className={`mt-0.5 h-2 w-6 rounded-full ${claras ? "bg-white" : "bg-acento"}`} />
        </span>
      </span>
    </span>
  );
}
