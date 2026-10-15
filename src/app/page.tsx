import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, Dumbbell, LineChart } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { MapaCorporal } from "@/components/anatomia/mapa-corporal";
import { GraficaLinea } from "@/components/datos/grafica-linea";
import { EnlaceBoton } from "@/components/ui/boton";

export const metadata: Metadata = {
  title: { absolute: "Blister Fitness · Tu día de entrenador, en una sola página" },
  description:
    "Agenda, fichas de alumnos, rutinas por músculo, registro de sesiones y progreso para entrenadores personales. Con tus citas en Google Calendar.",
  openGraph: {
    title: "Blister Fitness",
    description: "Agenda, alumnos, rutinas y progreso para entrenadores personales.",
    type: "website",
    locale: "es_CO",
  },
};

// Datos de ejemplo para la vista del panel (no son de nadie).
const AGENDA = [
  { hora: "6:00 a. m.", alumno: "Laura Gómez", que: "Pierna · Fuerza base", estado: "hecha" },
  { hora: "7:30 a. m.", alumno: "Andrés Restrepo", que: "Empuje · Hipertrofia", estado: "ahora" },
  { hora: "5:00 p. m.", alumno: "Camila Ríos", que: "Evaluación inicial", estado: "luego" },
  { hora: "6:30 p. m.", alumno: "Mateo Vélez", que: "Tirón · Fuerza base", estado: "luego" },
];
const PESO = [68.2, 67.6, 67.4, 66.7, 66.1, 66.3, 65.4, 64.9, 64.2].map((valor, i) => ({
  fecha: new Date(Date.UTC(2026, 5, 2) + i * 13 * 86_400_000).toISOString(),
  valor,
}));
const MUSCULOS = [
  { slug: "cuadriceps", nombre: "Cuádriceps" },
  { slug: "gluteo_mayor", nombre: "Glúteo mayor" },
  { slug: "aductores", nombre: "Aductores" },
  { slug: "recto_abdominal", nombre: "Recto abdominal" },
];
const SERIES = [
  { n: 1, peso: "52,5", reps: "8", hecha: true },
  { n: 2, peso: "52,5", reps: "7", hecha: true },
  { n: 3, peso: "52,5", reps: "", hecha: false },
];

const PASOS = [
  { titulo: "Registra a tus alumnos", texto: "Contacto, objetivo principal y primera medición: su punto de partida." },
  { titulo: "Arma la rutina y asígnala", texto: "Días, bloques y ejercicios por músculo. Cada alumno recibe su propia copia del plan." },
  { titulo: "Agenda y registra", texto: "Cada cita sabe qué día del plan le toca. Al terminar, anotas la sesión y el progreso se actualiza solo." },
];

/** Crestas de montaña a la hora azul: tres capas, de la más lejana (clara) a la más cercana (lienzo). */
function Crestas() {
  return (
    <svg aria-hidden viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[38%] max-h-80 w-full">
      <path d="M0 210 L120 150 L230 190 L360 105 L470 160 L600 90 L720 150 L850 70 L990 140 L1110 95 L1250 160 L1360 120 L1440 150 V320 H0 Z" fill="#2a2d45" opacity="0.55" />
      <path d="M0 250 L140 190 L260 230 L400 165 L540 220 L660 175 L800 235 L930 170 L1080 225 L1220 180 L1340 230 L1440 200 V320 H0 Z" fill="#1f2133" opacity="0.85" />
      <path d="M0 290 L180 245 L330 275 L520 235 L700 280 L880 240 L1060 285 L1250 250 L1440 280 V320 H0 Z" fill="#171721" />
    </svg>
  );
}

export default function Portada() {
  return (
    <div className="min-h-dvh bg-fondo">
      <main id="contenido">
        {/* Hero a ancho completo: siempre oscuro, con la navegación encima. */}
        <section aria-labelledby="titulo-portada" className="tema-oscuro relative isolate overflow-hidden bg-[#12121b]">
          {/* Atmósfera: resplandor frío arriba, crestas abajo y grano muy sutil. */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(82,102,235,0.22),transparent_70%),radial-gradient(ellipse_60%_40%_at_80%_30%,rgba(120,140,220,0.08),transparent_70%)]" />
          <div aria-hidden className="grano pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay" />
          <Crestas />

          <header className="relative z-20">
            <div className="mx-auto flex h-20 max-w-[75rem] items-center justify-between gap-4 px-4 sm:px-6">
              <Link href="/" className="rounded-full" aria-label="Blister Fitness, inicio">
                <Marca />
              </Link>
              <nav aria-label="Portada" className="flex items-center gap-1 sm:gap-2">
                <a href="#funciones" className="hidden h-10 items-center rounded-full px-4 text-[0.9375rem] text-grafito transition-colors hover:text-tinta md:inline-flex">
                  Funciones
                </a>
                <a href="#como-funciona" className="hidden h-10 items-center rounded-full px-4 text-[0.9375rem] text-grafito transition-colors hover:text-tinta md:inline-flex">
                  Cómo funciona
                </a>
                <EnlaceBoton href="/ingresar" variante="secundario" className="border-tinta/70">
                  Ingresar
                </EnlaceBoton>
                <EnlaceBoton href="/registro" className="hidden sm:inline-flex">
                  Crear cuenta
                </EnlaceBoton>
              </nav>
            </div>
          </header>

          <div className="relative z-10 mx-auto flex min-h-[78dvh] max-w-[48rem] flex-col items-center justify-center px-4 pt-10 pb-56 text-center sm:px-6 sm:pb-64">
            <p className="mb-6 inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.06] px-3.5 text-[0.8125rem] text-grafito ring-1 ring-white/10">
              Para entrenadores personales
            </p>
            <h1 id="titulo-portada" className="titulo-display text-[2.6rem] leading-[1.08] text-white sm:text-[4.0625rem] sm:leading-[1.1]">
              Tu día de entrenador, en una sola página.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-[1.45] text-grafito">
              Agenda, alumnos, rutinas y progreso, listos entre sesión y sesión. Sin hojas de cálculo ni mensajes perdidos.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <EnlaceBoton href="/registro" className="h-12 px-6 text-base">
                Crear cuenta gratis <ArrowRight aria-hidden className="size-4" />
              </EnlaceBoton>
              <EnlaceBoton href="/ingresar" variante="secundario" className="h-12 border-tinta/70 px-6 text-base">
                Ya tengo cuenta
              </EnlaceBoton>
            </div>
          </div>
        </section>

        {/* La vista del panel monta sobre el borde del hero: profundidad sin sombras. */}
        <section aria-label="Así se ve el panel" className="tema-oscuro relative z-10 mx-auto -mt-44 max-w-[75rem] px-4 sm:-mt-52 sm:px-6">
          <div className="rounded-[1.25rem] bg-[#1b1b26] p-2 ring-1 ring-white/[0.08] sm:p-3">
            <div className="flex items-center gap-1.5 px-2 pb-2 sm:pb-3" aria-hidden>
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 truncate text-xs text-tenue">Panel · jueves 15 de octubre</span>
            </div>
            <div className="grid gap-2 text-left sm:gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] [&>*]:min-w-0">
              <div className="rounded-[var(--radius-tarjeta)] bg-panel p-5 sm:p-6">
                <p className="etiqueta">Agenda de hoy</p>
                <p className="mt-3 leading-none">
                  <span className="cifra-display text-5xl text-white">4</span>
                  <span className="ml-2 text-sm text-tenue">citas</span>
                </p>
                <ol className="mt-5 space-y-1 border-t border-white/10 pt-3">
                  {AGENDA.map((c) => (
                    <li key={c.hora} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 py-1.5 text-sm">
                      <span className={`tabular-nums text-xs ${c.estado === "ahora" ? "font-medium text-white" : c.estado === "hecha" ? "text-white/40" : "text-white/70"}`}>
                        {c.hora}
                      </span>
                      <span className="min-w-0">
                        <span className={`block truncate ${c.estado === "hecha" ? "text-white/55" : "font-medium text-white"}`}>{c.alumno}</span>
                        <span className="block truncate text-xs text-tenue">{c.que}</span>
                      </span>
                      {c.estado === "ahora" ? (
                        <span className="rounded-full bg-acento px-2.5 py-0.5 text-xs font-medium text-sobre-acento">Ahora</span>
                      ) : c.estado === "hecha" ? (
                        <span className="text-xs text-white/45">Hecha</span>
                      ) : (
                        <span />
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-[var(--radius-tarjeta)] bg-superficie p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="etiqueta">Peso · Laura Gómez</p>
                  <p className="text-xs text-tenue">−4,0 kg en 3 meses</p>
                </div>
                <p className="mt-3 leading-none">
                  <span className="cifra-display text-5xl">64,2</span>
                  <span className="ml-1.5 text-sm text-tenue">kg</span>
                </p>
                <div className="mt-3">
                  <GraficaLinea puntos={PESO} unidad="kg" titulo="Peso de ejemplo de una alumna" alto={200} />
                </div>
              </div>

              <div className="flex flex-col rounded-[var(--radius-tarjeta)] bg-superficie p-5 sm:p-6">
                <p className="etiqueta">Pierna · músculos trabajados</p>
                <div className="mt-2 flex flex-1 items-center justify-center">
                  <MapaCorporal
                    musculos={MUSCULOS}
                    resaltados={{ cuadriceps: "principal", gluteo_mayor: "principal", aductores: "secundario", recto_abdominal: "estabilizador" }}
                    mostrarProfundos={false}
                    className="w-full max-w-44"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Funciones: bento asimétrico, la sesión en el móvil como protagonista. */}
        <section id="funciones" aria-labelledby="titulo-funciones" className="scroll-mt-8">
          <div className="mx-auto max-w-[75rem] px-4 pt-28 pb-[4.5rem] sm:px-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
              <h2 id="titulo-funciones" className="titulo-display text-[2rem] leading-[1.15] sm:text-[2.625rem]">
                Lo que necesitas entre una sesión y la siguiente.
              </h2>
              <p className="max-w-lg text-lg leading-[1.45] text-grafito lg:justify-self-end">
                Cada pantalla responde una pregunta: qué tengo hoy, cómo va este alumno, qué le pongo en la próxima rutina.
              </p>
            </div>

            <ul className="mt-12 grid gap-3 sm:gap-4 lg:grid-cols-3 lg:grid-rows-2">
              <li className="flex flex-col rounded-[var(--radius-tarjeta)] bg-superficie p-8 lg:col-span-2 lg:row-span-2">
                <p className="etiqueta">La sesión, en el móvil</p>
                <h3 className="titulo-display mt-3 max-w-md text-[1.75rem] leading-[1.2]">Cada serie con un toque, viendo lo que hizo la última vez.</h3>
                <p className="mt-3 max-w-md text-grafito">Pensado para usarse entre serie y serie: se guarda solo, y al terminar la cita queda completada.</p>
                <div aria-hidden className="mt-auto pt-10">
                  <div className="max-w-md rounded-2xl bg-fondo p-4 ring-1 ring-linea">
                    <p className="text-sm font-medium">Sentadilla trasera con barra</p>
                    <p className="mt-0.5 text-xs text-tenue">Objetivo 4 × 6-8 · 52,5 kg · Última vez: 50 kg × 8 · 8 · 8</p>
                    <ol className="mt-3 space-y-2">
                      {SERIES.map((s) => (
                        <li key={s.n} className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                          <span className="tabular-nums text-xs text-tenue">{s.n}</span>
                          <span className="grid h-10 place-items-center rounded-full ring-1 ring-linea-fuerte/70 tabular-nums">{s.peso}</span>
                          <span className={`grid h-10 place-items-center rounded-full ring-1 ring-linea-fuerte/70 tabular-nums ${s.reps ? "" : "text-tenue"}`}>{s.reps || "6-8"}</span>
                          <span className={`grid size-10 place-items-center rounded-full ${s.hecha ? "bg-exito text-[#171721]" : "text-tenue ring-1 ring-linea-fuerte/70"}`}>
                            <Check className="size-4" />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </li>
              {[
                { icono: CalendarCheck2, titulo: "Agenda con recordatorios", texto: "Agenda, mueve o cancela citas. Van a tu Google Calendar y el alumno recibe la invitación." },
                { icono: Dumbbell, titulo: "Rutinas por músculo", texto: "Toca los músculos en el mapa y te sugerimos los ejercicios más completos." },
              ].map(({ icono: Icono, titulo, texto }) => (
                <li key={titulo} className="rounded-[var(--radius-tarjeta)] bg-superficie p-8">
                  <span className="grid size-10 place-items-center rounded-full bg-hueso text-tinta">
                    <Icono aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-medium">{titulo}</h3>
                  <p className="mt-1.5 text-grafito">{texto}</p>
                </li>
              ))}
              <li className="rounded-[var(--radius-tarjeta)] bg-superficie p-8 lg:col-span-3 lg:flex lg:items-center lg:gap-10">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-hueso text-tinta">
                  <LineChart aria-hidden className="size-5" />
                </span>
                <div className="mt-6 lg:mt-0">
                  <h3 className="text-lg font-medium">Progreso que se entiende</h3>
                  <p className="mt-1.5 max-w-2xl text-grafito">Peso, medidas, constancia semanal y 1RM estimado por ejercicio. Y quién lleva un mes sin medirse.</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-8">
          <div className="mx-auto max-w-[75rem] px-4 py-[4.5rem] sm:px-6">
            <h2 id="titulo-como" className="titulo-display text-[2rem] leading-[1.15]">
              Cómo funciona
            </h2>
            <ol className="mt-10 grid gap-10 md:grid-cols-3">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="border-t border-linea-fuerte/60 pt-6">
                  <span className="cifra-display text-[2rem] text-tenue">0{i + 1}</span>
                  <h3 className="mt-4 text-lg font-medium">{p.titulo}</h3>
                  <p className="mt-1.5 text-grafito">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="titulo-empezar" className="mx-auto max-w-[75rem] px-4 pb-[4.5rem] sm:px-6">
          <div className="tema-oscuro relative isolate overflow-hidden rounded-[1.25rem] bg-[#12121b] px-6 py-20 text-center ring-1 ring-white/[0.08]">
            <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(82,102,235,0.22),transparent_70%)]" />
            <h2 id="titulo-empezar" className="titulo-display mx-auto max-w-2xl text-[2rem] leading-[1.15] text-white sm:text-[2.625rem]">
              Empieza con tus alumnos de hoy.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-grafito">Crear la cuenta toma un minuto. Puedes entrar con tu cuenta de Google.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <EnlaceBoton href="/registro" className="h-12 px-6 text-base">
                Crear cuenta gratis
              </EnlaceBoton>
              <EnlaceBoton href="/ingresar" variante="secundario" className="h-12 border-tinta/70 px-6 text-base">
                Ingresar
              </EnlaceBoton>
            </div>
          </div>
        </section>
      </main>

      <footer className="tema-oscuro bg-[#12121b] text-grafito">
        <div className="mx-auto flex max-w-[75rem] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Marca oscuro />
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#funciones" className="hover:text-tinta">Funciones</a>
            <a href="#como-funciona" className="hover:text-tinta">Cómo funciona</a>
            <Link href="/ingresar" className="hover:text-tinta">Ingresar</Link>
            <Link href="/registro" className="hover:text-tinta">Crear cuenta</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-[75rem] border-t border-white/[0.06] px-4 py-5 text-xs tracking-[0.01em] text-tenue sm:px-6">
          © 2026 Blister Fitness · Los nombres y cifras de las vistas de ejemplo son ficticios.
        </p>
      </footer>
    </div>
  );
}
