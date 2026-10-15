import Link from "next/link";
import { ArrowRight, ClipboardList, LineChart, Ruler, Scale, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { GraficaLinea } from "@/components/datos/grafica-linea";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { CabeceraTarjeta, Lista, Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { conParametros } from "@/components/ui/paginacion";
import type { FilaResumen, progresoAlumno } from "@/lib/entrenamiento/progreso";
import { fechaCorta, fechaSinAnio, numero } from "@/lib/formato";
import { BarrasSemanas } from "./barras-semanas";
import { SelectorAlumno } from "./selector-alumno";

export type DatosProgreso = NonNullable<Awaited<ReturnType<typeof progresoAlumno>>>;

/** "+1,2" / "−0,8" / "0": el signo dice la dirección; si es bueno o malo depende del objetivo, así que sin color. */
const conSigno = (v: number, decimales = 1) => (Math.abs(v) < 0.05 ? "0" : `${v > 0 ? "+" : "−"}${numero(Math.abs(v), decimales)}`);

const FILTROS = [
  { valor: "", texto: "Todos", cumple: () => true },
  { valor: "medir", texto: "Sin medir hace 30+ días", cumple: (f: FilaResumen) => f.diasSinMedir === null || f.diasSinMedir >= 30 },
  { valor: "inactivos", texto: "Sin sesiones en 30 días", cumple: (f: FilaResumen) => f.sesiones30 === 0 },
];

/** Todos los alumnos activos, con lo justo para saber a quién atender. */
export function Resumen({ filas, filtro }: { filas: FilaResumen[]; filtro: string }) {
  const elegido = FILTROS.find((f) => f.valor === filtro) ?? FILTROS[0];
  const visibles = filas.filter(elegido.cumple);
  return (
    <>
      <Encabezado
        titulo="Progreso"
        miga="Entrenamiento"
        descripcion="Peso, medidas, constancia y rendimiento de cada alumno. Elige uno para ver el detalle."
      />
      {filas.length === 0 ? (
        <Vacio
          icono={<Users aria-hidden className="size-5" />}
          titulo="Aún no hay alumnos activos"
          texto="Registra a tus alumnos y sus mediciones para empezar a ver su progreso."
          accion={<EnlaceBoton href="/alumnos/nuevo">Registrar alumno</EnlaceBoton>}
        />
      ) : (
        <>
          <nav aria-label="Filtrar alumnos" className={`${claseSegmentado} mb-4 max-w-full overflow-x-auto`}>
            {FILTROS.map((f) => (
              <Link
                key={f.valor}
                href={conParametros("/progreso", { filtro: f.valor })}
                aria-current={f === elegido ? "true" : undefined}
                className={`${claseSegmento(f === elegido)} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
              >
                {f.texto}
                <span className="tabular-nums text-xs text-tenue">{filas.filter(f.cumple).length}</span>
              </Link>
            ))}
          </nav>
          <Tarjeta className="overflow-hidden">
            <div
              aria-hidden
              className="hidden grid-cols-[minmax(0,2fr)_8rem_8rem_7rem_7rem_1rem] gap-4 border-b border-linea bg-hueso/50 px-5 py-2 md:grid"
            >
              <span className="etiqueta">Alumno</span>
              <span className="etiqueta text-right">Peso</span>
              <span className="etiqueta">Última medición</span>
              <span className="etiqueta text-right">Sesiones 30 d</span>
              <span className="etiqueta text-right">Asistencia</span>
              <span />
            </div>
            {visibles.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-tenue">Ningún alumno en este filtro. Buena señal.</p>
            ) : (
              <Lista>
                {visibles.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/progreso?alumno=${f.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-hueso/40 md:grid-cols-[minmax(0,2fr)_8rem_8rem_7rem_7rem_1rem]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar id={f.id} nombres={f.nombres} apellidos={f.apellidos} tamano="sm" />
                        <span className="truncate font-medium">{f.nombre}</span>
                      </span>
                      <span className="text-right tabular-nums">
                        {f.pesoActual !== null ? `${numero(f.pesoActual)} kg` : "—"}
                        {f.cambioPeso !== null && <span className="block text-xs text-tenue">{conSigno(f.cambioPeso)} kg</span>}
                      </span>
                      <span className={`col-span-2 text-sm md:col-span-1 ${f.diasSinMedir === null || f.diasSinMedir >= 30 ? "text-aviso" : "text-tenue"}`}>
                        <span className="md:hidden">Medición: </span>
                        {f.ultimaMedicion ? fechaSinAnio(f.ultimaMedicion) : "Nunca"}
                        {f.diasSinMedir !== null && f.diasSinMedir >= 30 && <span className="block text-xs">hace {f.diasSinMedir} días</span>}
                      </span>
                      <span className="hidden text-right tabular-nums md:block">{f.sesiones30}</span>
                      <span className="hidden text-right tabular-nums md:block">{f.asistencia30 === null ? "—" : `${f.asistencia30} %`}</span>
                      <ArrowRight aria-hidden className="hidden size-4 text-tenue md:block" />
                    </Link>
                  </li>
                ))}
              </Lista>
            )}
            <p className="border-t border-linea bg-hueso/50 px-5 py-2.5 tabular-nums text-xs text-tenue">
              {visibles.length} de {filas.length} alumnos activos · asistencia = citas hechas sobre hechas + faltas
            </p>
          </Tarjeta>
        </>
      )}
    </>
  );
}

export function VistaAlumno({ datos, ejercicioId, filas }: { datos: DatosProgreso; ejercicioId: string | null; filas: FilaResumen[] }) {
  const { alumno, objetivo, peso, grasa, medidas, asistencia90, sesiones, semanas, ejercicios, ultimaMedicion } = datos;
  const nombre = `${alumno.nombres} ${alumno.apellidos}`;
  const pesoActual = peso.at(-1);
  const grasaActual = grasa.at(-1);
  const ultimas4 = semanas.slice(-4).reduce((t, s) => t + s.valor, 0);
  const elegido = ejercicios.find((e) => e.ejercicioId === ejercicioId) ?? ejercicios.find((e) => e.serie.length >= 2) ?? ejercicios[0];
  const metaPeso = objetivo?.valor_meta !== null && objetivo?.valor_meta !== undefined && /kg/i.test(objetivo.unidad ?? "") ? objetivo.valor_meta : null;

  return (
    <>
      <Encabezado
        volver={{ href: "/progreso", texto: "Todos los alumnos" }}
        titulo={nombre}
        figura={<Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="xl" />}
        descripcion={objetivo ? `Objetivo: ${objetivo.nombre}${objetivo.fecha_meta ? ` · meta al ${fechaCorta(objetivo.fecha_meta)}` : ""}` : "Sin objetivo principal definido"}
        acciones={
          <>
            {filas.length > 1 && <SelectorAlumno alumnos={filas.map((f) => ({ id: f.id, nombre: f.nombre }))} actual={alumno.id} />}
            <EnlaceBoton href={`/alumnos/${alumno.id}`} variante="secundario">
              Ficha y mediciones
            </EnlaceBoton>
          </>
        }
      />

      {/* Cifras clave */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Cifra
          etiqueta="Peso actual"
          valor={pesoActual ? numero(pesoActual.valor) : "—"}
          unidad={pesoActual ? "kg" : ""}
          contexto={
            peso.length > 1
              ? `${conSigno(pesoActual!.valor - peso[0].valor)} kg desde el ${fechaSinAnio(peso[0].fecha)}${metaPeso !== null ? ` · meta ${numero(metaPeso)} kg` : ""}`
              : pesoActual
                ? `Medido el ${fechaSinAnio(pesoActual.fecha)}`
                : "Sin mediciones de peso"
          }
          oscura
          ancha
        />
        <Cifra
          etiqueta="Grasa corporal"
          valor={grasaActual ? numero(grasaActual.valor) : "—"}
          unidad={grasaActual ? "%" : ""}
          contexto={grasa.length > 1 ? `${conSigno(grasaActual!.valor - grasa[0].valor)} puntos desde el inicio` : "Sin datos suficientes"}
        />
        <Cifra
          etiqueta="Sesiones"
          valor={String(ultimas4)}
          unidad="en 4 semanas"
          contexto={`${sesiones.length} registradas en total`}
        />
        <Cifra
          etiqueta="Asistencia · 90 días"
          valor={asistencia90.porcentaje === null ? "—" : String(asistencia90.porcentaje)}
          unidad={asistencia90.porcentaje === null ? "" : "%"}
          contexto={
            asistencia90.hechas + asistencia90.faltas
              ? `${asistencia90.hechas} hechas, ${asistencia90.faltas} ${asistencia90.faltas === 1 ? "falta" : "faltas"}`
              : "Sin citas resueltas"
          }
          ancha
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Tarjeta className="overflow-hidden lg:col-span-2">
          <section aria-labelledby="titulo-peso">
            <CabeceraTarjeta
              id="titulo-peso"
              titulo="Peso"
              accion={ultimaMedicion && <span className="text-xs text-tenue">Última medición: {fechaSinAnio(ultimaMedicion)}</span>}
            />
            <div className="p-4 sm:p-5">
              {peso.length >= 2 ? (
                <GraficaLinea puntos={peso} unidad="kg" titulo={`Peso de ${nombre}`} />
              ) : (
                <Vacio
                  icono={<Scale aria-hidden className="size-5" />}
                  titulo="Hacen falta dos mediciones"
                  texto="Con dos o más mediciones de peso verás aquí cómo cambia."
                  accion={<EnlaceBoton href={`/alumnos/${alumno.id}`} variante="secundario">Registrar medición</EnlaceBoton>}
                />
              )}
            </div>
          </section>
        </Tarjeta>
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-constancia">
            <CabeceraTarjeta id="titulo-constancia" titulo="Constancia" accion={<span className="text-xs text-tenue">Sesiones por semana</span>} />
            <div className="p-4 sm:p-5">
              <BarrasSemanas datos={semanas} />
            </div>
          </section>
        </Tarjeta>
      </div>

      {/* Rendimiento por ejercicio */}
      <Tarjeta className="mb-4 overflow-hidden">
        <section aria-labelledby="titulo-rendimiento">
          <CabeceraTarjeta id="titulo-rendimiento" titulo="Rendimiento por ejercicio" accion={<span className="text-xs text-tenue">1RM estimado (Epley)</span>} />
          {ejercicios.length === 0 ? (
            <div className="p-4 sm:p-5">
              <Vacio
                icono={<LineChart aria-hidden className="size-5" />}
                titulo="Aún no hay sesiones registradas"
                texto="Cuando registres lo que hizo en cada sesión (peso y repeticiones), aquí verás cómo progresa en cada ejercicio."
                accion={<EnlaceBoton href="/calendario" variante="secundario">Ir al calendario</EnlaceBoton>}
              />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="border-b border-linea p-4 sm:p-5 lg:border-r lg:border-b-0">
                <h3 className="titulo-serif text-xl">{elegido.nombre}</h3>
                <p className="mt-0.5 mb-3 text-sm text-tenue">
                  {elegido.unoRMActual !== null
                    ? `1RM estimado ${numero(elegido.unoRMActual)} kg${
                        elegido.unoRMInicial !== null && elegido.serie.length > 1
                          ? ` · ${conSigno(((elegido.unoRMActual - elegido.unoRMInicial) / elegido.unoRMInicial) * 100, 0)} % desde el ${fechaSinAnio(elegido.primeraFecha)}`
                          : ""
                      }`
                    : "Sin series con peso y repeticiones para estimar el 1RM."}
                </p>
                {elegido.serie.length >= 2 ? (
                  <GraficaLinea puntos={elegido.serie} unidad="kg" titulo={`1RM estimado en ${elegido.nombre}`} alto={200} />
                ) : (
                  <p className="rounded-lg bg-hueso/60 px-3 py-4 text-sm text-tenue">Con dos sesiones de este ejercicio verás su evolución.</p>
                )}
              </div>
              <div>
                <p className="etiqueta px-4 pt-3 pb-1 sm:px-5">Ejercicios · {ejercicios.length}</p>
                <ul className="max-h-96 divide-y divide-linea overflow-y-auto">
                  {ejercicios.map((e) => {
                    const actual = e.ejercicioId === elegido.ejercicioId;
                    const cambio = e.unoRMActual !== null && e.unoRMInicial !== null && e.serie.length > 1 ? ((e.unoRMActual - e.unoRMInicial) / e.unoRMInicial) * 100 : null;
                    return (
                      <li key={e.ejercicioId}>
                        <Link
                          href={`/progreso?alumno=${alumno.id}&ejercicio=${e.ejercicioId}`}
                          scroll={false}
                          aria-current={actual ? "true" : undefined}
                          className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-2.5 transition-colors sm:px-5 ${actual ? "bg-hueso" : "hover:bg-hueso/40"}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{e.nombre}</span>
                            <span className="block text-xs text-tenue">
                              {e.sesiones} {e.sesiones === 1 ? "sesión" : "sesiones"} · última {fechaSinAnio(e.ultimaFecha)}
                            </span>
                          </span>
                          <span className="text-right tabular-nums text-sm">
                            {e.ultimaMejor.pesoKg !== null ? `${numero(e.ultimaMejor.pesoKg)} × ${e.ultimaMejor.reps ?? "—"}` : "—"}
                            {cambio !== null && <span className="block text-xs text-tenue">{conSigno(cambio, 0)} %</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-medidas">
            <CabeceraTarjeta id="titulo-medidas" titulo="Medidas" />
            {medidas.length === 0 ? (
              <div className="p-4 sm:p-5">
                <Vacio icono={<Ruler aria-hidden className="size-5" />} titulo="Sin perímetros registrados" texto="Cintura, cadera, brazos… se registran junto con el peso en la ficha del alumno." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-linea bg-hueso/50 text-left">
                    <th scope="col" className="etiqueta px-4 py-2 font-medium sm:px-5">Medida</th>
                    <th scope="col" className="etiqueta px-2 py-2 text-right font-medium">Inicio</th>
                    <th scope="col" className="etiqueta px-2 py-2 text-right font-medium">Actual</th>
                    <th scope="col" className="etiqueta px-4 py-2 text-right font-medium sm:px-5">Cambio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {medidas.map((m) => (
                    <tr key={m.clave}>
                      <th scope="row" className="px-4 py-2.5 text-left font-normal sm:px-5">{m.etiqueta}</th>
                      <td className="px-2 py-2.5 text-right tabular-nums text-tenue">{numero(m.inicial)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{numero(m.actual)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium sm:px-5">{m.mediciones > 1 ? `${conSigno(m.actual - m.inicial)} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </Tarjeta>

        <Tarjeta className="overflow-hidden">
          <section aria-labelledby="titulo-historial">
            <CabeceraTarjeta id="titulo-historial" titulo="Historial de sesiones" accion={sesiones.length > 0 && <span className="tabular-nums text-xs text-tenue">{sesiones.length}</span>} />
            {sesiones.length === 0 ? (
              <div className="p-4 sm:p-5">
                <Vacio icono={<ClipboardList aria-hidden className="size-5" />} titulo="Sin sesiones registradas" texto="Abre una cita de entrenamiento en el calendario y usa «Registrar sesión»." />
              </div>
            ) : (
              <Lista className="max-h-96 overflow-y-auto">
                {sesiones.slice(0, 50).map((s) => (
                  <li key={s.id}>
                    <Link href={`/sesiones/${s.id}`} className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hueso/40 sm:px-5">
                      <span className="tabular-nums text-sm text-tenue">{fechaSinAnio(s.fecha)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{s.dia ?? "Sesión libre"}</span>
                        <span className="block text-xs text-tenue">
                          {s.ejercicios.length} {s.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
                          {s.ejercicios.length > 0 && ` · ${numero(s.ejercicios.reduce((t, e) => t + e.volumenKg, 0) / 1000, 1)} t de volumen`}
                        </span>
                      </span>
                      <span className="tabular-nums text-xs text-tenue">{s.rpe !== null ? `RPE ${numero(s.rpe)}` : ""}</span>
                    </Link>
                  </li>
                ))}
              </Lista>
            )}
          </section>
        </Tarjeta>
      </div>
    </>
  );
}

/** Cifra clave del bento: etiqueta, número grande en serif y una línea de contexto. */
function Cifra({
  etiqueta,
  valor,
  unidad,
  contexto,
  oscura = false,
  ancha = false,
}: {
  etiqueta: string;
  valor: string;
  unidad: string;
  contexto: string;
  oscura?: boolean;
  /** En móvil ocupa las dos columnas (la primera y la última del bento). */
  ancha?: boolean;
}) {
  return (
    <div
      className={`${ancha ? "col-span-2 sm:col-span-1" : ""} flex flex-col rounded-[var(--radius-tarjeta)] p-5 ${
        oscura ? "bg-panel text-white" : "border border-linea bg-superficie"
      }`}
    >
      <p className={`etiqueta ${oscura ? "text-white/55" : ""}`}>{etiqueta}</p>
      <p className="mt-auto pt-5 leading-none">
        <span className="cifra-serif text-4xl sm:text-5xl">{valor}</span>
        {unidad && <span className={`ml-1.5 text-sm ${oscura ? "text-white/55" : "text-tenue"}`}>{unidad}</span>}
      </p>
      <p className={`mt-2 text-xs ${oscura ? "text-white/60" : "text-tenue"}`}>{contexto}</p>
    </div>
  );
}
