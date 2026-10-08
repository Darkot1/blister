import { CalendarPlus, UserPlus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { Aviso } from "@/components/ui/aviso";
import { EnlaceBoton } from "@/components/ui/boton";
import { Pila, Rejilla } from "@/components/ui/disposicion";
import { Enlace } from "@/components/ui/enlace";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Fila, ListaFilas } from "@/components/ui/lista-filas";
import { Seccion } from "@/components/ui/seccion";
import { etiquetaDiaLarga, partesLocales, sumarDias } from "@/lib/calendario";
import { fechaCorta, hora, iniciales } from "@/lib/formato";
import { FilaCita, hastaLa, type CitaFila } from "../calendario/fila-cita";
import css from "./tablero.module.css";

export type CitaInicio = CitaFila & { id: string };
export type AlumnoReciente = { id: string; nombres: string; apellidos: string; creadoEn: string };

const ATENDIBLE = new Set(["programada", "confirmada"]);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const enlaceSemana = (c: CitaInicio) => `/calendario?semana=${partesLocales(c.iniciaEn).fecha}`;

/** Acciones de la cabecera de Inicio; también las pinta el esqueleto de carga. */
export function AccionesInicio() {
  return (
    <>
      <EnlaceBoton href="/calendario" variante="secundario">
        Ver semana
      </EnlaceBoton>
      <EnlaceBoton href="/calendario?nueva=1">
        <CalendarPlus aria-hidden /> Agendar cita
      </EnlaceBoton>
    </>
  );
}

/**
 * Inicio responde "¿qué tengo hoy?": la agenda de hoy manda; debajo, los próximos días;
 * al lado (debajo en móvil), los alumnos como dato secundario.
 * Recibe los datos ya consultados; `ahora` en milisegundos, leído en el servidor tras el acceso dinámico.
 */
export function Tablero({
  hoy,
  ahora,
  citasHoy,
  proximas,
  errorCitas,
  activos,
  recientes,
}: {
  hoy: string;
  ahora: number;
  citasHoy: CitaInicio[];
  proximas: CitaInicio[];
  errorCitas: boolean;
  activos: number;
  recientes: AlumnoReciente[];
}) {
  const enCurso = citasHoy.find(
    (c) => ATENDIBLE.has(c.estado) && Date.parse(c.iniciaEn) <= ahora && Date.parse(c.terminaEn) > ahora,
  );
  const siguiente = citasHoy.find((c) => ATENDIBLE.has(c.estado) && Date.parse(c.iniciaEn) > ahora);
  const porAtender = citasHoy.filter((c) => ATENDIBLE.has(c.estado)).length;

  // Una frase que contesta "¿qué tengo hoy?" sin tener que leer la lista.
  const frases = [`${etiquetaDiaLarga(hoy)}.`];
  if (!errorCitas) {
    if (!citasHoy.length) frases.push("No tienes citas hoy.");
    else {
      frases.push(
        porAtender
          ? `${plural(citasHoy.length, "cita", "citas")}, ${porAtender} por atender.`
          : `${plural(citasHoy.length, "cita", "citas")}, ya atendiste todas.`,
      );
      if (enCurso) frases.push(`Ahora estás con ${enCurso.alumno} ${hastaLa(enCurso.terminaEn)}.`);
      else if (siguiente) frases.push(`La siguiente es a las ${hora(siguiente.iniciaEn)} con ${siguiente.alumno}.`);
    }
  }

  // Próximos días agrupados por fecha.
  const manana = sumarDias(hoy, 1);
  const dias = new Map<string, CitaInicio[]>();
  for (const c of proximas) {
    const fecha = partesLocales(c.iniciaEn).fecha;
    dias.set(fecha, [...(dias.get(fecha) ?? []), c]);
  }

  return (
    <>
      <Encabezado titulo="Hoy" descripcion={<p className={css.resumen}>{frases.join(" ")}</p>} acciones={<AccionesInicio />} />

      <Rejilla columnas="principal" espacio={12}>
        <Pila espacio={10}>
          {errorCitas ? (
            <Aviso>No se pudieron cargar las citas. Recarga la página; si sigue fallando, revisa tu conexión.</Aviso>
          ) : citasHoy.length ? (
            <ListaFilas as="ol" etiqueta="Citas de hoy">
              {citasHoy.map((c) => (
                <FilaCita
                  key={c.id}
                  cita={c}
                  href={enlaceSemana(c)}
                  marca={c === enCurso ? "ahora" : c === siguiente && !enCurso ? "siguiente" : undefined}
                />
              ))}
            </ListaFilas>
          ) : (
            <EstadoVacio
              compacto
              titulo="Día libre"
              descripcion="Agenda una sesión o aprovecha para revisar los planes de tus alumnos."
            />
          )}

          {!errorCitas && (
            <Seccion titulo="Próximos días">
              {dias.size ? (
                <ol className={css.dias}>
                  {[...dias].map(([fecha, lista]) => {
                    const [nombre, resto] = etiquetaDiaLarga(fecha).split(", ");
                    const idDia = `dia-${fecha}`;
                    return (
                      <li key={fecha} className={css.dia}>
                        <h3 id={idDia} className={css.nombreDia}>
                          {fecha === manana ? "Mañana" : nombre}
                          <span className={css.fechaDia}>
                            {fecha === manana ? `${nombre.toLowerCase()}, ${resto}` : resto}
                          </span>
                        </h3>
                        <ListaFilas as="ol" etiqueta={etiquetaDiaLarga(fecha)}>
                          {lista.map((c) => (
                            <FilaCita key={c.id} cita={c} href={enlaceSemana(c)} />
                          ))}
                        </ListaFilas>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EstadoVacio
                  compacto
                  titulo="Nada agendado en los próximos 7 días"
                  descripcion="Planifica la semana para que cada alumno tenga su sesión."
                  accion={
                    <EnlaceBoton href="/calendario" variante="secundario">
                      Abrir el calendario
                    </EnlaceBoton>
                  }
                />
              )}
            </Seccion>
          )}
        </Pila>

        <Seccion
          titulo="Alumnos"
          descripcion={
            activos
              ? `${plural(activos, "alumno activo", "alumnos activos")}. Estos son los últimos que registraste.`
              : recientes.length
                ? "Ningún alumno activo. Estos son los últimos que registraste."
                : undefined
          }
          acciones={recientes.length ? <Enlace href="/alumnos">Ver todos</Enlace> : undefined}
        >
          {recientes.length ? (
            <Pila espacio={4}>
              <ListaFilas>
                {recientes.map((a) => (
                  <Fila
                    key={a.id}
                    href={`/alumnos/${a.id}`}
                    inicio={<Avatar iniciales={iniciales(a.nombres, a.apellidos)} tamano="pequeno" />}
                    titulo={`${a.nombres} ${a.apellidos}`}
                    detalle={`Registrado el ${fechaCorta(a.creadoEn)}`}
                  />
                ))}
              </ListaFilas>
              <div>
                <EnlaceBoton href="/alumnos/nuevo" variante="fantasma" className={css.nuevoAlumno}>
                  <UserPlus aria-hidden /> Registrar alumno
                </EnlaceBoton>
              </div>
            </Pila>
          ) : (
            <EstadoVacio
              compacto
              titulo="Aún no tienes alumnos"
              descripcion="Registra el primero para agendarle sesiones y armarle su rutina."
              accion={
                <EnlaceBoton href="/alumnos/nuevo" variante="secundario">
                  <UserPlus aria-hidden /> Registrar alumno
                </EnlaceBoton>
              }
            />
          )}
        </Seccion>
      </Rejilla>
    </>
  );
}
