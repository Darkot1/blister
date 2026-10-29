"use client";

import { ArrowDown, ArrowUp, Check, Circle, Crop, ImagePlus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from "motion/react";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, claseAreaTexto, claseControl } from "@/components/ui/campo";
import { ETIQUETA_MODALIDAD, HORAS_RESPUESTA, MAX_METODOS, MAX_TESTIMONIOS, urlFoto } from "@/lib/pagina-publica/contenido";
import type { MetodoTrabajo, Testimonio } from "@/lib/supabase/tipos-bd";
import { Consejo, Ejemplos, TextoCopiable } from "./ayudas";
import { Compartir } from "./compartir";
import { PanelDiseno } from "./diseno";
import { lista, nuevaClave, type Borrador, type Paso } from "./modelo";

export type PropsPaso = {
  b: Borrador;
  cambiar: <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => void;
  actualizar: (cambio: (b: Borrador) => Borrador) => void;
  errores: Record<string, string[] | undefined>;
  /** Creando la página: los consejos van abiertos. */
  creando: boolean;
};

/** Bloque de un paso: título del bloque y su contenido (sin la tarjeta exterior, la pone el editor). */
function Bloque({ id, titulo, accion, children }: { id: string; titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3 border-t border-linea pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 id={id} className="min-w-0 font-medium">{titulo}</h3>
        {accion && <span className="shrink-0 whitespace-nowrap">{accion}</span>}
      </div>
      {children}
    </section>
  );
}

/* ---------- 1. Portada ---------- */

const TITULARES = [
  "Te ayudo a ganar fuerza y moverte sin dolor, con 3 sesiones por semana",
  "Entrenamiento para mujeres que quieren volver a entrenar con confianza",
  "Prepárate para tu primera carrera de 10K con un plan hecho para ti",
  "Pierde grasa sin dietas extremas: entrenamiento y hábitos que sí se sostienen",
];

export function PasoPortada({
  b,
  cambiar,
  errores,
  creando,
  foto,
}: PropsPaso & { foto: { subiendo: boolean; elegir: () => void; reajustar: () => void } }) {
  return (
    <div className="space-y-6">
      <Bloque id="b-foto" titulo="Tu foto">
        {b.foto_ruta ? (
          <div className="relative overflow-hidden rounded-2xl border border-linea">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del editor, ya reducida al subirla */}
            <img src={urlFoto(b.foto_ruta)!} alt="Foto de portada" className="aspect-[16/9] w-full object-cover" />
            <div className="grid grid-cols-3 gap-1.5 border-t border-linea p-2 sm:absolute sm:right-2 sm:bottom-2 sm:flex sm:border-0 sm:p-0">
              <Boton type="button" variante="secundario" className="tactil h-8 bg-superficie/90 px-2.5 backdrop-blur" disabled={foto.subiendo} onClick={foto.reajustar}>
                <Crop aria-hidden className="size-4" /> Ajustar
              </Boton>
              <Boton type="button" variante="secundario" className="tactil h-8 bg-superficie/90 px-2.5 backdrop-blur" disabled={foto.subiendo} onClick={foto.elegir}>
                <ImagePlus aria-hidden className="size-4" /> Cambiar
              </Boton>
              <Boton type="button" variante="peligro" className="tactil h-8 bg-superficie/90 px-2.5 backdrop-blur" disabled={foto.subiendo} onClick={() => cambiar("foto_ruta", null)}>
                <Trash2 aria-hidden className="size-4" /> Quitar
              </Boton>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={foto.subiendo}
            onClick={foto.elegir}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-linea-fuerte/70 px-4 text-center text-sm text-tenue transition-colors hover:border-tinta hover:text-tinta disabled:opacity-60"
          >
            <ImagePlus aria-hidden className="size-6" />
            {foto.subiendo ? "Subiendo…" : "Sube una foto tuya entrenando a alguien"}
            <span className="text-xs">JPG, PNG o WebP. Mejor horizontal.</span>
          </button>
        )}
        <Consejo titulo="Qué foto funciona mejor" abierto={creando}>
          <ul>
            <li>Tú, de frente o entrenando a alguien. Una cara genera más confianza que un gimnasio vacío.</li>
            <li>Buena luz y sin filtros fuertes. Una foto real vale más que una de banco de imágenes.</li>
            <li>Horizontal: en el computador va al lado de tu nombre; en el celular, arriba.</li>
          </ul>
        </Consejo>
      </Bloque>

      <Bloque id="b-titular" titulo="Tu promesa">
        <Campo
          etiqueta="Frase bajo tu nombre"
          nombre="titular"
          value={b.titular}
          onChange={(e) => cambiar("titular", e.target.value)}
          maxLength={120}
          placeholder="Ej.: Te ayudo a ganar fuerza y moverte sin dolor"
          errores={errores.titular}
          ayuda={`${b.titular.length}/120. Habla del resultado de tu alumno, no de ti.`}
        />
        <Ejemplos ejemplos={TITULARES} alElegir={(t) => cambiar("titular", t)} />
        <Consejo abierto={creando}>
          <p>Una buena promesa responde «¿qué consigo yo?». Fórmula: <strong className="font-medium text-tinta">a quién ayudas + qué logra + en qué condiciones</strong>.</p>
          <ul>
            <li>Concreta mejor que grandilocuente: «3 sesiones por semana» convence más que «el mejor entrenamiento».</li>
            <li>Háblale de tú a tu alumno ideal.</li>
            <li>Nada de promesas que no puedes cumplir («−10 kg en un mes»).</li>
          </ul>
        </Consejo>
      </Bloque>
    </div>
  );
}

/* ---------- 2. Qué ofreces ---------- */

const METODOS_SUGERIDOS: MetodoTrabajo[] = [
  { titulo: "Evaluación inicial", descripcion: "Antes de entrenar, medimos tu punto de partida: movilidad, fuerza, historial y objetivos." },
  { titulo: "Plan a tu medida", descripcion: "Una rutina pensada para ti, con progresión semana a semana según cómo respondes." },
  { titulo: "Seguimiento real", descripcion: "Registro cada sesión y tus mediciones para ajustar el plan con datos, no a ojo." },
];

export function PasoOferta({ b, cambiar, actualizar, errores, creando }: PropsPaso) {
  const quieto = useReducedMotion();
  const cambiarMetodo = (i: number, campo: keyof MetodoTrabajo, valor: string) =>
    actualizar((x) => ({ ...x, metodos: x.metodos.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)) }));
  const moverMetodo = (i: number, dir: -1 | 1) =>
    actualizar((x) => {
      const metodos = [...x.metodos];
      [metodos[i], metodos[i + dir]] = [metodos[i + dir], metodos[i]];
      return { ...x, metodos };
    });

  return (
    <div className="space-y-6">
      <Bloque id="b-presentacion" titulo="Para quién es tu entrenamiento">
        <AreaTexto
          etiqueta="Sobre ti"
          nombre="presentacion"
          rows={6}
          maxLength={1500}
          value={b.presentacion}
          onChange={(e) => cambiar("presentacion", e.target.value)}
          placeholder="Ej.: Trabajo con adultos ocupados que quieren ganar fuerza y moverse sin dolor. Muchos llegan después de una lesión o de años sin entrenar…"
          errores={errores.presentacion}
          ayuda={`${b.presentacion.length}/1500`}
        />
        <Consejo abierto={creando}>
          <p>Tres o cuatro frases, en este orden:</p>
          <ul>
            <li><strong className="font-medium text-tinta">Con quién trabajas</strong> y qué les pasa («adultos que llevan años sin entrenar»).</li>
            <li><strong className="font-medium text-tinta">Qué consiguen contigo</strong> («ganar fuerza sin lesionarse»).</li>
            <li><strong className="font-medium text-tinta">Por qué tú</strong>: una prueba concreta (años, especialidad, cuántos alumnos).</li>
          </ul>
          <p>Escribe como hablas. Si un alumno ideal lo lee y piensa «esto es para mí», funciona.</p>
        </Consejo>
      </Bloque>

      <Bloque id="b-donde" titulo="Dónde entrenas">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-grafito">Modalidad</legend>
          <div className="flex flex-wrap gap-2">
            {[["", "Sin indicar"], ...Object.entries(ETIQUETA_MODALIDAD)].map(([valor, texto]) => (
              <label key={valor} className={claseOpcion}>
                <input type="radio" name="modalidad" value={valor} checked={b.modalidad === valor} onChange={() => cambiar("modalidad", valor)} className="sr-only" />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo
          etiqueta="Zona"
          nombre="ubicacion"
          value={b.ubicacion}
          onChange={(e) => cambiar("ubicacion", e.target.value)}
          maxLength={80}
          placeholder="Ej.: Laureles, Medellín"
          errores={errores.ubicacion}
          ayuda="Barrio y ciudad: ayuda a que te encuentren en Google."
        />
      </Bloque>

      <Bloque id="b-metodos" titulo="Cómo trabajas" accion={<span className="text-xs tabular-nums text-tenue">{b.metodos.length}/{MAX_METODOS}</span>}>
        <p className="text-sm text-tenue">Los pasos de empezar contigo. Quitan la incertidumbre de «¿y después qué?».</p>
        {errores.metodos && <p className="text-sm text-peligro">{errores.metodos[0]}</p>}
        {/* Reordenar anima con `layout`, que no viene en el paquete ligero de toda la app. */}
        <LazyMotion features={domMax}>
          <ol className="space-y-3">
            <AnimatePresence initial={false}>
              {b.metodos.map((metodo, i) => (
                <m.li
                  key={metodo.clave}
                  layout={!quieto}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: quieto ? 0 : 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 rounded-2xl border border-linea p-3">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-hueso text-xs font-semibold tabular-nums">{i + 1}</span>
                      <label className="sr-only" htmlFor={`metodo-${metodo.clave}`}>Título del paso {i + 1}</label>
                      <input
                        id={`metodo-${metodo.clave}`}
                        value={metodo.titulo}
                        onChange={(e) => cambiarMetodo(i, "titulo", e.target.value)}
                        maxLength={60}
                        placeholder="Título"
                        aria-invalid={Boolean(errores[`metodos.${i}.titulo`])}
                        className={`${claseControl} h-9 min-w-0`}
                      />
                      <button type="button" disabled={i === 0} onClick={() => moverMetodo(i, -1)} aria-label={`Subir paso ${i + 1}`} className={claseIcono}>
                        <ArrowUp aria-hidden className="size-4" />
                      </button>
                      <button type="button" disabled={i === b.metodos.length - 1} onClick={() => moverMetodo(i, 1)} aria-label={`Bajar paso ${i + 1}`} className={claseIcono}>
                        <ArrowDown aria-hidden className="size-4" />
                      </button>
                      <button type="button" onClick={() => cambiar("metodos", b.metodos.filter((_, j) => j !== i))} aria-label={`Eliminar paso ${i + 1}`} className={`${claseIcono} hover:bg-peligro/10 hover:text-peligro`}>
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                    <label className="sr-only" htmlFor={`metodo-desc-${metodo.clave}`}>Descripción del paso {i + 1}</label>
                    <textarea
                      id={`metodo-desc-${metodo.clave}`}
                      value={metodo.descripcion}
                      onChange={(e) => cambiarMetodo(i, "descripcion", e.target.value)}
                      maxLength={300}
                      rows={2}
                      placeholder="En qué consiste, en una o dos frases."
                      className={claseAreaTexto}
                    />
                    {errores[`metodos.${i}.titulo`] && <p className="text-xs text-peligro">{errores[`metodos.${i}.titulo`]![0]}</p>}
                  </div>
                </m.li>
              ))}
            </AnimatePresence>
          </ol>
        </LazyMotion>
        <div className="flex flex-wrap gap-2">
          <Boton type="button" variante="secundario" disabled={b.metodos.length >= MAX_METODOS} onClick={() => cambiar("metodos", [...b.metodos, { titulo: "", descripcion: "", clave: nuevaClave() }])}>
            <Plus aria-hidden className="size-4" /> Añadir paso
          </Boton>
          {b.metodos.length === 0 && (
            <Boton type="button" variante="fantasma" onClick={() => cambiar("metodos", METODOS_SUGERIDOS.map((m) => ({ ...m, clave: nuevaClave() })))}>
              Empezar con un ejemplo
            </Boton>
          )}
        </div>
      </Bloque>
    </div>
  );
}

/* ---------- 3. Confianza ---------- */

const MENSAJE_TESTIMONIO =
  "Hola, ¿cómo vas? Estoy armando mi página para conseguir nuevos alumnos. ¿Me escribirías 2 o 3 frases sobre cómo te ha ido entrenando conmigo y qué has logrado? ¿Me autorizas a publicarlo con tu nombre y la inicial de tu apellido? ¡Gracias!";

export function PasoConfianza({ b, cambiar, actualizar, errores, creando }: PropsPaso) {
  const cambiarTestimonio = (i: number, campo: keyof Testimonio, valor: string) =>
    actualizar((x) => ({ ...x, testimonios: x.testimonios.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)) }));

  return (
    <div className="space-y-6">
      <Bloque id="b-testimonios" titulo="Lo que dicen tus alumnos" accion={<span className="text-xs tabular-nums text-tenue">{b.testimonios.length}/{MAX_TESTIMONIOS}</span>}>
        <p className="text-sm text-tenue">
          Es lo que más convence a alguien que no te conoce. Publica solo testimonios reales y con permiso, con el nombre como lo autoricen (p. ej., «Laura G.»).
        </p>
        {errores.testimonios && <p className="text-sm text-peligro">{errores.testimonios[0]}</p>}
        <ul className="space-y-3">
          {b.testimonios.map((t, i) => (
            <li key={t.clave} className="space-y-2 rounded-2xl border border-linea p-3">
              <div className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={`testimonio-nombre-${t.clave}`}>Quién lo dice (testimonio {i + 1})</label>
                <input
                  id={`testimonio-nombre-${t.clave}`}
                  value={t.nombre}
                  onChange={(e) => cambiarTestimonio(i, "nombre", e.target.value)}
                  maxLength={40}
                  placeholder="Quién lo dice. Ej.: Laura G."
                  aria-invalid={Boolean(errores[`testimonios.${i}.nombre`])}
                  className={`${claseControl} h-9 min-w-0`}
                />
                <button type="button" onClick={() => cambiar("testimonios", b.testimonios.filter((_, j) => j !== i))} aria-label={`Eliminar testimonio ${i + 1}`} className={`${claseIcono} hover:bg-peligro/10 hover:text-peligro`}>
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
              <label className="sr-only" htmlFor={`testimonio-texto-${t.clave}`}>Testimonio {i + 1}</label>
              <textarea
                id={`testimonio-texto-${t.clave}`}
                value={t.texto}
                onChange={(e) => cambiarTestimonio(i, "texto", e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Lo que dice, con sus palabras."
                aria-invalid={Boolean(errores[`testimonios.${i}.texto`])}
                className={claseAreaTexto}
              />
              <label className="sr-only" htmlFor={`testimonio-resultado-${t.clave}`}>Resultado (testimonio {i + 1}, opcional)</label>
              <input
                id={`testimonio-resultado-${t.clave}`}
                value={t.resultado}
                onChange={(e) => cambiarTestimonio(i, "resultado", e.target.value)}
                maxLength={60}
                placeholder="Resultado (opcional). Ej.: Corrí mis primeros 10K"
                className={`${claseControl} h-9`}
              />
              {(errores[`testimonios.${i}.nombre`] || errores[`testimonios.${i}.texto`]) && (
                <p className="text-xs text-peligro">{(errores[`testimonios.${i}.nombre`] ?? errores[`testimonios.${i}.texto`])![0]}</p>
              )}
            </li>
          ))}
        </ul>
        <Boton
          type="button"
          variante="secundario"
          disabled={b.testimonios.length >= MAX_TESTIMONIOS}
          onClick={() => cambiar("testimonios", [...b.testimonios, { nombre: "", texto: "", resultado: "", clave: nuevaClave() }])}
        >
          <Plus aria-hidden className="size-4" /> Añadir testimonio
        </Boton>
        <Consejo titulo="¿Aún no tienes testimonios? Pídelos así" abierto={creando && b.testimonios.length === 0}>
          <p>Escríbele a dos o tres alumnos contentos. Uno con un resultado concreto («bajé 2 tallas», «volví a correr») vale por diez genéricos.</p>
          <TextoCopiable etiqueta="Mensaje para enviar por WhatsApp" texto={MENSAJE_TESTIMONIO} />
        </Consejo>
      </Bloque>

      <Bloque id="b-experiencia" titulo="Tu experiencia">
        <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Campo
            etiqueta="Años entrenando"
            nombre="experiencia_anos"
            inputMode="numeric"
            value={b.experiencia_anos}
            onChange={(e) => cambiar("experiencia_anos", e.target.value.replace(/\D/g, "").slice(0, 2))}
            errores={errores.experiencia_anos}
          />
          <Campo
            etiqueta="Certificaciones y estudios"
            nombre="certificaciones"
            value={b.certificaciones}
            onChange={(e) => cambiar("certificaciones", e.target.value)}
            maxLength={400}
            placeholder="Ej.: NSCA-CPT, Licenciado en Educación Física"
            errores={errores.certificaciones}
            ayuda="Sepáralas con comas. Salen como cifras junto a tu nombre."
          />
        </div>
      </Bloque>
    </div>
  );
}

/* ---------- 4. Contacto ---------- */

const OFERTAS = ["Primera sesión de valoración gratis", "Semana de prueba sin costo", "Plan de 4 semanas con evaluación incluida", "Primera clase en línea gratis"];

export function PasoContacto({ b, cambiar, errores, creando }: PropsPaso) {
  return (
    <div className="space-y-6">
      <Bloque id="b-oferta" titulo="Un motivo para escribir hoy">
        <Campo
          etiqueta="Oferta para empezar (opcional)"
          nombre="oferta_inicial"
          value={b.oferta_inicial}
          onChange={(e) => cambiar("oferta_inicial", e.target.value)}
          maxLength={80}
          placeholder="Ej.: Primera sesión de valoración gratis"
          errores={errores.oferta_inicial}
          ayuda="Va junto al botón principal y en el formulario."
        />
        <Ejemplos ejemplos={OFERTAS} alElegir={(t) => cambiar("oferta_inicial", t)} />
        <Consejo abierto={creando}>
          <ul>
            <li>Una sola oferta, clara y de bajo riesgo para quien llega: probar sin pagar o con una evaluación incluida.</li>
            <li>Solo lo que de verdad ofreces. Nada de «últimos cupos» si no es cierto: se nota y resta confianza.</li>
          </ul>
        </Consejo>
      </Bloque>

      <Bloque id="b-respuesta" titulo="Cuánto tardas en responder">
        <fieldset>
          <legend className="sr-only">Respondes las solicitudes en</legend>
          <div className="flex flex-wrap gap-2">
            {[["", "Sin indicar"], ...HORAS_RESPUESTA.map((h) => [String(h), `Menos de ${h} h`])].map(([valor, texto]) => (
              <label key={valor} className={claseOpcion}>
                <input type="radio" name="respuesta_horas" value={valor} checked={b.respuesta_horas === valor} onChange={() => cambiar("respuesta_horas", valor)} className="sr-only" />
                {texto}
              </label>
            ))}
          </div>
          {errores.respuesta_horas && <p className="mt-1.5 text-sm text-peligro">{errores.respuesta_horas[0]}</p>}
        </fieldset>
        <p className="text-sm text-tenue">Se promete en la página. Quien escribe y recibe respuesta rápido casi siempre empieza: elige un plazo que puedas cumplir.</p>
      </Bloque>

      <Bloque id="b-canales" titulo="Dónde más te pueden escribir">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="WhatsApp (opcional)"
            nombre="whatsapp"
            type="tel"
            inputMode="tel"
            value={b.whatsapp}
            onChange={(e) => cambiar("whatsapp", e.target.value)}
            placeholder="+57 300 123 4567"
            errores={errores.whatsapp}
            ayuda="Será público. Muchos prefieren escribir por aquí."
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
      </Bloque>
    </div>
  );
}

/* ---------- 5. Diseño ---------- */

export function PasoDiseno({ b, actualizar, errores }: PropsPaso) {
  return <PanelDiseno diseno={b.diseno} errores={errores} alCambiar={(cambio) => actualizar((x) => ({ ...x, diseno: cambio(x.diseno) }))} />;
}

/* ---------- 6. Publicar ---------- */

export function PasoPublicar({
  b,
  cambiar,
  errores,
  enlace,
  quien,
  publicada,
  irA,
}: PropsPaso & {
  enlace: string;
  quien: string;
  /** Ya publicada en la base (no solo marcada en el borrador). */
  publicada: boolean;
  irA: (paso: Paso) => void;
}) {
  const puntos = lista(b);
  const hechos = puntos.filter((p) => p.hecho).length;
  return (
    <div className="space-y-6">
      {publicada && (
        <Bloque id="b-compartir" titulo="Comparte tu página">
          <Compartir enlace={enlace} quien={quien} />
        </Bloque>
      )}

      <Bloque id="b-lista" titulo="Lo que más ayuda a conseguir alumnos" accion={<span className="text-xs tabular-nums text-tenue">{hechos} de {puntos.length}</span>}>
        <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-hueso">
          <div className="h-full rounded-full bg-tinta transition-[width] duration-500" style={{ width: `${(hechos / puntos.length) * 100}%` }} />
        </div>
        <ul className="divide-y divide-linea">
          {puntos.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
              {p.hecho ? <Check aria-hidden className="size-4 shrink-0 text-exito" /> : <Circle aria-hidden className="size-4 shrink-0 text-tenue" />}
              <span className={`min-w-0 flex-1 ${p.hecho ? "text-grafito" : ""}`}>
                {p.texto}
                <span className="sr-only">{p.hecho ? " (listo)" : " (pendiente)"}</span>
              </span>
              {!p.hecho && (
                <button type="button" onClick={() => irA(p.paso)} className="tactil shrink-0 rounded-full px-2 py-1 text-xs font-medium text-grafito underline underline-offset-2 hover:text-tinta">
                  Completar
                </button>
              )}
            </li>
          ))}
        </ul>
        {!publicada && hechos < puntos.length && <p className="text-sm text-tenue">Puedes publicar ya y completar lo demás después.</p>}
      </Bloque>

      <Bloque id="b-enlace" titulo="Tu enlace">
        <div>
          <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-grafito">Dirección de tu página</label>
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
              className={`${claseControl} min-w-0`}
            />
          </div>
          <p id="slug-ayuda" className={`mt-1.5 text-sm ${errores.slug ? "text-peligro" : "text-tenue"}`}>
            {errores.slug?.[0] ?? "Corto y fácil de dictar, p. ej. entrena-con-laura. Si lo cambias después, el enlace anterior deja de funcionar."}
          </p>
        </div>
        {publicada && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-hueso/60 px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Página visible</span>
              <span className="block text-xs text-tenue">Apagada, el enlace muestra «no encontrada» y sale de Google.</span>
            </span>
            <input type="checkbox" role="switch" checked={b.pagina_publica} onChange={(e) => cambiar("pagina_publica", e.target.checked)} className="peer sr-only" />
            <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-linea-fuerte transition-colors peer-checked:bg-acento peer-focus-visible:ring-2 peer-focus-visible:ring-acento peer-focus-visible:ring-offset-2">
              <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${b.pagina_publica ? "translate-x-4" : ""}`} />
            </span>
          </label>
        )}
      </Bloque>
    </div>
  );
}

/** Opción tipo chip (radio): seleccionada en marfil, como los filtros de la app. */
const claseOpcion =
  "inline-flex h-9 cursor-pointer items-center rounded-full border border-linea px-3.5 text-sm text-grafito transition-colors hover:border-linea-fuerte has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-sobre-tinta has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento";

const claseIcono = "tactil grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30";

