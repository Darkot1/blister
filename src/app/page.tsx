import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, ClipboardPen, Dumbbell, LineChart, Users } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { MapaCorporal } from "@/components/anatomia/mapa-corporal";
import { GraficaLinea } from "@/components/datos/grafica-linea";
import { EnlaceBoton } from "@/components/ui/boton";

export const metadata: Metadata = {
  title: { absolute: "Blister Fitness · Tu día de entrenador, en una sola página" },
  description:
    "Agenda, fichas de alumnos, rutinas por músculo, registro de sesiones y progreso para entrenadores personales. Con tus citas en Google Calendar.",
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

const FUNCIONES = [
  {
    icono: CalendarCheck2,
    titulo: "Agenda con recordatorios",
    texto: "Agenda, mueve o cancela citas en segundos. Van a tu Google Calendar y el alumno recibe la invitación y sus recordatorios.",
  },
  {
    icono: Dumbbell,
    titulo: "Rutinas por músculo",
    texto: "Toca los músculos en el mapa corporal y te sugerimos los ejercicios más completos. Series, repeticiones y descansos según el objetivo.",
  },
  {
    icono: ClipboardPen,
    titulo: "La sesión, en el móvil",
    texto: "Peso y repeticiones de cada serie con un toque, viendo lo que hizo la última vez. Pensado para usarse entre serie y serie.",
  },
  {
    icono: LineChart,
    titulo: "Progreso que se entiende",
    texto: "Peso, medidas, constancia semanal y 1RM estimado por ejercicio. Y quién lleva un mes sin medirse.",
  },
];

const PASOS = [
  { titulo: "Registra a tus alumnos", texto: "Contacto, objetivo principal y primera medición. Es su punto de partida." },
  { titulo: "Arma la rutina y asígnala", texto: "Días, bloques y ejercicios. Al asignarla, cada alumno tiene su propia copia del plan." },
  { titulo: "Agenda y registra", texto: "Cada cita sabe qué día del plan le toca. Al terminar, anotas la sesión y el progreso se actualiza solo." },
];

export default function Portada() {
  return (
    <div className="min-h-dvh bg-fondo">
      {/* Navegación: marca a la izquierda, acciones a la derecha. */}
      <header className="sticky top-0 z-30 border-b border-linea/70 bg-fondo/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[75rem] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-lg" aria-label="Blister Fitness, inicio">
            <Marca />
          </Link>
          <nav aria-label="Portada" className="flex items-center gap-1">
            <a href="#funciones" className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-grafito hover:text-tinta md:inline-flex">
              Funciones
            </a>
            <a href="#como-funciona" className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium text-grafito hover:text-tinta md:inline-flex">
              Cómo funciona
            </a>
            <EnlaceBoton href="/ingresar" variante="fantasma">
              Ingresar
            </EnlaceBoton>
            <EnlaceBoton href="/registro" className="hidden sm:inline-flex">
              Crear cuenta
            </EnlaceBoton>
          </nav>
        </div>
      </header>

      <main>
        {/* Portada: titular editorial y la vista del panel. */}
        <section aria-labelledby="titulo-portada" className="mx-auto max-w-[75rem] px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 text-sm text-tenue">
            <span aria-hidden className="size-1.5 rounded-full bg-acento" />
            Para entrenadores personales
          </p>
          <h1 id="titulo-portada" className="titulo-serif mx-auto max-w-3xl text-[2.5rem] leading-[1.1] tracking-[-0.02em] sm:text-[3.75rem]">
            Tu día de entrenador, en una sola página.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-grafito">
            Agenda, alumnos, rutinas y progreso, listos entre sesión y sesión. Sin hojas de cálculo ni mensajes perdidos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <EnlaceBoton href="/registro" className="h-11 px-5 text-[0.9375rem]">
              Crear cuenta gratis <ArrowRight aria-hidden className="size-4" />
            </EnlaceBoton>
            <EnlaceBoton href="/ingresar" variante="secundario" className="h-11 px-5 text-[0.9375rem]">
              Ya tengo cuenta
            </EnlaceBoton>
          </div>
        </section>

        <section aria-label="Así se ve el panel" className="mx-auto max-w-[75rem] px-4 pb-20 sm:px-6">
          <div className="overflow-hidden rounded-[var(--radius-elevada)] border border-linea bg-hueso/60 p-2 shadow-suave sm:p-3">
            <div className="flex items-center gap-1.5 px-2 pb-2 sm:pb-3" aria-hidden>
              <span className="size-2.5 rounded-full bg-linea-fuerte/60" />
              <span className="size-2.5 rounded-full bg-linea-fuerte/60" />
              <span className="size-2.5 rounded-full bg-linea-fuerte/60" />
              <span className="ml-3 truncate text-xs text-tenue">Panel · jueves 15 de octubre</span>
            </div>
            <div className="grid gap-2 text-left sm:gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] [&>*]:min-w-0">
              {/* Agenda de hoy */}
              <div className="rounded-[var(--radius-tarjeta)] bg-panel p-5 text-white">
                <p className="etiqueta text-white/55">Agenda de hoy</p>
                <p className="mt-2 leading-none">
                  <span className="cifra-serif text-5xl">4</span>
                  <span className="ml-2 text-sm text-white/55">citas</span>
                </p>
                <ol className="mt-5 space-y-1 border-t border-white/10 pt-3">
                  {AGENDA.map((c) => (
                    <li key={c.hora} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 py-1.5 text-sm">
                      <span className={`tabular-nums text-xs ${c.estado === "ahora" ? "text-acento" : c.estado === "hecha" ? "text-white/40" : "text-white/70"}`}>
                        {c.hora}
                      </span>
                      <span className="min-w-0">
                        <span className={`block truncate ${c.estado === "hecha" ? "text-white/60" : "font-medium"}`}>{c.alumno}</span>
                        <span className="block truncate text-xs text-white/50">{c.que}</span>
                      </span>
                      {c.estado === "ahora" ? (
                        <span className="rounded-md bg-acento px-2 py-0.5 text-xs font-semibold text-sobre-acento">Ahora</span>
                      ) : c.estado === "hecha" ? (
                        <span className="text-xs text-white/45">Hecha</span>
                      ) : (
                        <span />
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Progreso */}
              <div className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="etiqueta">Peso · Laura Gómez</p>
                  <p className="text-xs text-tenue">−4,0 kg en 3 meses</p>
                </div>
                <p className="mt-2 leading-none">
                  <span className="cifra-serif text-5xl">64,2</span>
                  <span className="ml-1.5 text-sm text-tenue">kg</span>
                </p>
                <div className="mt-3">
                  <GraficaLinea puntos={PESO} unidad="kg" titulo="Peso de ejemplo de una alumna" alto={210} />
                </div>
              </div>

              {/* Músculos */}
              <div className="flex flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-5">
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

        {/* Funciones */}
        <section id="funciones" aria-labelledby="titulo-funciones" className="scroll-mt-20 border-t border-linea bg-superficie">
          <div className="mx-auto max-w-[75rem] px-4 py-20 sm:px-6">
            <h2 id="titulo-funciones" className="titulo-serif max-w-xl text-[2rem] leading-[1.2]">
              Lo que necesitas entre una sesión y la siguiente.
            </h2>
            <p className="mt-3 max-w-xl text-tenue">Cada pantalla responde una pregunta: qué tengo hoy, cómo va este alumno, qué le pongo en la próxima rutina.</p>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {FUNCIONES.map(({ icono: Icono, titulo, texto }) => (
                <li key={titulo} className="rounded-[var(--radius-tarjeta)] border border-linea bg-fondo p-6 sm:p-8">
                  <span className="grid size-10 place-items-center rounded-lg border border-linea bg-superficie text-acento">
                    <Icono aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{titulo}</h3>
                  <p className="mt-1.5 text-grafito">{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" aria-labelledby="titulo-como" className="scroll-mt-20 border-t border-linea">
          <div className="mx-auto max-w-[75rem] px-4 py-20 sm:px-6">
            <h2 id="titulo-como" className="titulo-serif text-[2rem] leading-[1.2]">
              Cómo funciona
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="border-t border-tinta pt-5">
                  <span className="cifra-serif text-3xl text-tenue">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold">{p.titulo}</h3>
                  <p className="mt-1.5 text-grafito">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Llamado final */}
        <section aria-labelledby="titulo-empezar" className="border-t border-linea bg-hueso/60">
          <div className="mx-auto flex max-w-[75rem] flex-col items-center px-4 py-20 text-center sm:px-6">
            <Users aria-hidden className="mb-5 size-6 text-acento" />
            <h2 id="titulo-empezar" className="titulo-serif max-w-2xl text-[2rem] leading-[1.2]">
              Empieza con tus alumnos de hoy.
            </h2>
            <p className="mt-3 max-w-md text-tenue">Crear la cuenta toma un minuto. Puedes entrar con tu cuenta de Google.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <EnlaceBoton href="/registro" className="h-11 px-5 text-[0.9375rem]">
                Crear cuenta gratis
              </EnlaceBoton>
              <EnlaceBoton href="/ingresar" variante="secundario" className="h-11 px-5 text-[0.9375rem]">
                Ingresar
              </EnlaceBoton>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-panel text-white/60">
        <div className="mx-auto flex max-w-[75rem] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Marca oscuro />
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#funciones" className="hover:text-white">Funciones</a>
            <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
            <Link href="/ingresar" className="hover:text-white">Ingresar</Link>
            <Link href="/registro" className="hover:text-white">Crear cuenta</Link>
          </nav>
          <p className="text-xs text-white/45">© 2026 Blister Fitness</p>
        </div>
      </footer>
    </div>
  );
}
