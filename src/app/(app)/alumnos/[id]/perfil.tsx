import { CalendarDays, CalendarPlus, Dumbbell, Mail, Pencil, Phone, Ruler } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Enlace } from "@/components/ui/enlace";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { Aviso } from "@/components/ui/aviso";
import { Cifra, GrupoCifras } from "@/components/ui/cifra";
import { Grupo, Pila, Rejilla } from "@/components/ui/disposicion";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { ListaDatos } from "@/components/ui/lista-datos";
import { Tabla } from "@/components/ui/tabla";
import { Texto } from "@/components/ui/texto";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { edad, fechaCorta, fechaHora, numero } from "@/lib/formato";
import type { AlumnoFila, MedicionFila, NotaFila, ObjetivoFila } from "@/lib/supabase/tipos-bd";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { BotonCambioEstado, FormularioMedicion, FormularioNota } from "./componentes";
import { Pestanas } from "@/components/ui/pestanas";
import css from "./perfil.module.css";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export const VISTAS = [
  { valor: "resumen", texto: "Resumen" },
  { valor: "entrenamiento", texto: "Entrenamiento" },
  { valor: "progreso", texto: "Progreso" },
  { valor: "historial", texto: "Historial" },
] as const;

export type Vista = (typeof VISTAS)[number]["valor"];

/** Pestaña de la URL (?vista=): un valor desconocido vuelve al resumen. */
export function vistaPerfil(valor: unknown): Vista {
  return VISTAS.find((v) => v.valor === valor)?.valor ?? "resumen";
}

type ClaveMedida = Exclude<
  keyof MedicionFila,
  "id" | "alumno_id" | "registrado_por" | "medido_en" | "notas" | "creado_en"
>;

const MEDIDAS: { clave: ClaveMedida; titulo: string; unidad: string; corto?: string }[] = [
  { clave: "peso_kg", titulo: "Peso", unidad: "kg" },
  { clave: "grasa_corporal_pct", titulo: "Grasa corporal", unidad: "%", corto: "Grasa" },
  { clave: "cintura_cm", titulo: "Cintura", unidad: "cm" },
  { clave: "cadera_cm", titulo: "Cadera", unidad: "cm" },
  { clave: "pecho_cm", titulo: "Pecho", unidad: "cm" },
  { clave: "brazo_izq_cm", titulo: "Brazo izq.", unidad: "cm" },
  { clave: "brazo_der_cm", titulo: "Brazo der.", unidad: "cm" },
  { clave: "muslo_izq_cm", titulo: "Muslo izq.", unidad: "cm" },
  { clave: "muslo_der_cm", titulo: "Muslo der.", unidad: "cm" },
  { clave: "estatura_cm", titulo: "Estatura", unidad: "cm" },
];

/** Diferencia con signo y menos tipográfico: "+1,2", "−0,8". */
const conSigno = (valor: number) => `${valor > 0 ? "+" : valor < 0 ? "−" : "±"}${numero(Math.abs(valor))}`;

/** "Hace 8 meses", "Hace 1 año y 3 meses" a partir de dos fechas YYYY-MM-DD. */
function tiempoDesde(desde: string, hoy: string) {
  const [a1, m1, d1] = desde.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = hoy.split("-").map(Number);
  const meses = (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 0) return "Empieza más adelante";
  if (meses < 1) return "Empezó este mes";
  if (meses < 12) return `Hace ${meses === 1 ? "1 mes" : `${meses} meses`}`;
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  return `Hace ${anios === 1 ? "1 año" : `${anios} años`}${resto ? ` y ${resto === 1 ? "1 mes" : `${resto} meses`}` : ""}`;
}

export type DatosPerfil = {
  alumno: AlumnoFila;
  /** Mediciones de la más reciente a la más antigua. */
  mediciones: MedicionFila[];
  notas: Pick<NotaFila, "id" | "contenido" | "creado_en" | "autor_id">[];
  objetivo: Pick<ObjetivoFila, "nombre" | "fecha_meta"> | null;
  autores: Map<string, string>;
  vista: Vista;
  /** Fecha de hoy en Bogotá (YYYY-MM-DD). */
  hoy: string;
  acciones: {
    registrarMedicion: Accion;
    agregarNota: Accion;
    archivar: () => Promise<void>;
    reactivar: () => Promise<void>;
  };
};

export function PerfilVista(datos: DatosPerfil) {
  const { alumno, vista } = datos;
  const archivado = alumno.estado === "archivado";
  const base = `/alumnos/${alumno.id}`;

  return (
    <>
      <Encabezado
        volver={{ href: "/alumnos", texto: "Alumnos" }}
        titulo={`${alumno.nombres} ${alumno.apellidos}`}
        descripcion={
          <Grupo espacio={4} className={css.contacto}>
            <InsigniaEstado estado={alumno.estado} />
            {alumno.telefono && (
              <Enlace href={`tel:${alumno.telefono}`} variante="tenue" className={css.dato}>
                <Phone aria-hidden /> {alumno.telefono}
              </Enlace>
            )}
            {alumno.correo && (
              <Enlace href={`mailto:${alumno.correo}`} variante="tenue" className={css.dato}>
                <Mail aria-hidden /> {alumno.correo}
              </Enlace>
            )}
            {!alumno.telefono && !alumno.correo && (
              <Enlace href={`${base}/editar`} variante="tenue">
                Añadir teléfono o correo
              </Enlace>
            )}
          </Grupo>
        }
        acciones={
          <>
            <EnlaceBoton href={`${base}/editar`} variante="secundario">
              <Pencil aria-hidden /> Editar
            </EnlaceBoton>
            {!archivado && (
              <EnlaceBoton href={`/calendario?alumno=${alumno.id}`}>
                <CalendarPlus aria-hidden /> Agendar sesión
              </EnlaceBoton>
            )}
          </>
        }
      />

      <Pila espacio={8}>
        {archivado && (
          <Aviso tipo="info">
            <Grupo justificar="entre" espacio={3}>
              <span>Este alumno está archivado. Su historial se conserva; reactívalo para volver a registrarle mediciones y agendarle sesiones.</span>
              <BotonCambioEstado accion={datos.acciones.reactivar} texto="Reactivar" />
            </Grupo>
          </Aviso>
        )}

        <Pestanas
          etiqueta={`Secciones de ${alumno.nombres}`}
          pestanas={VISTAS.map((v) => ({
            href: v.valor === "resumen" ? base : `${base}?vista=${v.valor}`,
            texto: v.texto,
            actual: v.valor === vista,
          }))}
        />

        {vista === "resumen" && <Resumen {...datos} />}
        {vista === "entrenamiento" && <Entrenamiento {...datos} />}
        {vista === "progreso" && <Progreso {...datos} />}
        {vista === "historial" && <Historial {...datos} />}
      </Pila>
    </>
  );
}

/* ── Resumen: lo que el entrenador mira antes de cada sesión ──────────────── */

function Resumen({ alumno, mediciones, notas, objetivo, autores, hoy, acciones }: DatosPerfil) {
  const base = `/alumnos/${alumno.id}`;
  const conPeso = mediciones.filter((m) => m.peso_kg !== null);
  const pesoActual = conPeso[0]?.peso_kg ?? null;
  const pesoInicial = conPeso.at(-1)?.peso_kg ?? null;
  const cambioPeso = pesoActual !== null && pesoInicial !== null && conPeso.length > 1 ? pesoActual - pesoInicial : null;
  const anios = edad(alumno.fecha_nacimiento);
  const archivado = alumno.estado === "archivado";

  return (
    <Pila espacio={10}>
      <GrupoCifras etiqueta="Datos clave">
        <Cifra
          tamano="grande"
          etiqueta="Peso actual"
          valor={numero(pesoActual)}
          unidad={pesoActual !== null ? "kg" : undefined}
          detalle={
            cambioPeso !== null
              ? `${conSigno(cambioPeso)} kg desde la primera medición`
              : conPeso.length
                ? `Medido el ${fechaCorta(conPeso[0].medido_en)}`
                : "Sin mediciones de peso"
          }
          href={`${base}?vista=progreso`}
        />
        <Cifra
          tamano="grande"
          etiqueta="Edad"
          valor={anios !== null ? String(anios) : "—"}
          unidad={anios !== null ? "años" : undefined}
          detalle={alumno.fecha_nacimiento ? `Nació el ${fechaCorta(alumno.fecha_nacimiento)}` : "Sin fecha de nacimiento"}
        />
        <Cifra
          tamano="compacta"
          etiqueta="Entrena contigo desde"
          valor={alumno.fecha_inicio ? fechaCorta(alumno.fecha_inicio) : "Sin fecha"}
          detalle={alumno.fecha_inicio ? tiempoDesde(alumno.fecha_inicio, hoy) : undefined}
        />
        <Cifra
          tamano="compacta"
          etiqueta="Objetivo principal"
          valor={objetivo?.nombre ?? "Sin definir"}
          detalle={objetivo?.fecha_meta ? `Meta: ${fechaCorta(objetivo.fecha_meta)}` : objetivo ? "Sin fecha meta" : undefined}
        />
      </GrupoCifras>

      <Rejilla columnas="principal" espacio={10}>
        <Pila espacio={10}>
          <UltimaMedicion mediciones={mediciones} base={base} archivado={archivado} />

          <Seccion titulo="Plan de entrenamiento">
            <EstadoVacio
              compacto
              titulo="Sin plan activo"
              descripcion="Los planes de entrenamiento todavía no están disponibles. Cuando lo estén, aquí verás su rutina de hoy y cómo va la semana."
            />
          </Seccion>
        </Pila>

        <Seccion
          titulo="Notas"
          contador={notas.length || undefined}
          acciones={
            notas.length > 3 ? (
              <Enlace href={`${base}?vista=historial`} scroll={false} className={css.enlaceSeccion}>
                Ver todas
              </Enlace>
            ) : undefined
          }
        >
          <Pila espacio={6}>
            <FormularioNota accion={acciones.agregarNota} />
            <ListaNotas notas={notas.slice(0, 3)} autores={autores} />
          </Pila>
        </Seccion>
      </Rejilla>

      {!archivado && (
        <Tarjeta variante="discontinua" relleno="compacto">
          <Grupo justificar="entre" espacio={4}>
            <Pila espacio={1} className={css.textoArchivar}>
              <Texto peso="semi">¿Ya no entrena contigo?</Texto>
              <Texto tamano="sm" tono="tenue">
                Archívalo para quitarlo de tu día a día. Su historial se conserva y puedes reactivarlo cuando quieras.
              </Texto>
            </Pila>
            <BotonCambioEstado
              accion={acciones.archivar}
              texto="Archivar"
              variante="peligro"
              tituloConfirmacion={`¿Archivar a ${alumno.nombres}?`}
              confirmacion={`${alumno.nombres} dejará de aparecer entre tus alumnos activos y no podrás agendarle sesiones. Su historial, mediciones y notas se conservan, y podrás reactivarlo cuando quieras.`}
            />
          </Grupo>
        </Tarjeta>
      )}
    </Pila>
  );
}

function UltimaMedicion({ mediciones, base, archivado }: { mediciones: MedicionFila[]; base: string; archivado: boolean }) {
  const ultima = mediciones[0];
  if (!ultima) {
    return (
      <Seccion titulo="Última medición">
        <EstadoVacio
          compacto
          titulo="Todavía no hay mediciones"
          descripcion="La primera servirá como punto de partida para ver su progreso."
          accion={
            !archivado && (
              <EnlaceBoton href={`${base}?vista=progreso`} variante="secundario" scroll={false}>
                <Ruler aria-hidden /> Registrar la primera
              </EnlaceBoton>
            )
          }
        />
      </Seccion>
    );
  }

  // Cada medida de la última medición, comparada con la vez anterior que se midió.
  const datos = MEDIDAS.filter((m) => ultima[m.clave] !== null).map((m) => {
    const valor = ultima[m.clave] as number;
    const anterior = mediciones.slice(1).find((x) => x[m.clave] !== null);
    const diferencia = anterior ? valor - (anterior[m.clave] as number) : null;
    return {
      termino: m.titulo,
      valor: (
        <span className={css.medida}>
          <span className="cifra">
            {numero(valor)} {m.unidad}
          </span>
          {diferencia !== null && (
            <Texto as="span" tamano="sm" tono="tenue">
              {conSigno(diferencia)} vs. {fechaCorta(anterior!.medido_en)}
            </Texto>
          )}
        </span>
      ),
    };
  });

  return (
    <Seccion
      titulo="Última medición"
      descripcion={`${fechaCorta(ultima.medido_en)}${ultima.notas ? ` · ${ultima.notas}` : ""}`}
      acciones={
        <Enlace href={`${base}?vista=progreso`} scroll={false} className={css.enlaceSeccion}>
          Ver progreso
        </Enlace>
      }
    >
      <Tarjeta relleno="compacto">
        <ListaDatos datos={datos} />
      </Tarjeta>
    </Seccion>
  );
}

function ListaNotas({ notas, autores }: { notas: DatosPerfil["notas"]; autores: Map<string, string> }) {
  if (!notas.length) {
    return (
      <EstadoVacio
        compacto
        titulo="Sin notas todavía"
        descripcion="Apunta molestias, acuerdos o cómo se sintió en la sesión para tenerlo a mano la próxima vez."
      />
    );
  }
  return (
    <ol className={css.notas}>
      {notas.map((n) => (
        <li key={n.id} className={css.nota}>
          <p className={css.contenidoNota}>{n.contenido}</p>
          <Texto tamano="sm" tono="tenue">
            <time dateTime={n.creado_en}>{fechaHora(n.creado_en)}</time>
            {autores.get(n.autor_id) ? ` · ${autores.get(n.autor_id)}` : ""}
          </Texto>
        </li>
      ))}
    </ol>
  );
}

/* ── Entrenamiento: plan y sesiones (aún no existen) ──────────────────────── */

function Entrenamiento({ alumno }: DatosPerfil) {
  return (
    <Rejilla columnas="principal" espacio={10}>
      <Seccion titulo="Plan activo">
        <EstadoVacio
          icono={Dumbbell}
          titulo={`${alumno.nombres} no tiene un plan activo`}
          descripcion="El constructor de rutinas y los planes llegan pronto. Cuando estén, aquí verás su plan, la rutina de cada día y qué le toca en la próxima sesión."
        />
      </Seccion>
      <Seccion titulo="Sesiones registradas">
        <EstadoVacio
          compacto
          titulo="Sin sesiones registradas"
          descripcion="Cuando registres sus entrenamientos verás aquí las series, cargas y cómo se sintió."
        />
      </Seccion>
    </Rejilla>
  );
}

/* ── Progreso: mediciones ─────────────────────────────────────────────────── */

function Progreso({ alumno, mediciones, hoy, acciones }: DatosPerfil) {
  const archivado = alumno.estado === "archivado";
  const columnas = MEDIDAS.filter((c) => mediciones.some((m) => m[c.clave] !== null));
  const conPeso = mediciones.filter((m) => m.peso_kg !== null);
  const pesoActual = conPeso[0]?.peso_kg ?? null;
  const cambioPeso = pesoActual !== null && conPeso.length > 1 ? pesoActual - (conPeso.at(-1)!.peso_kg as number) : null;
  const conGrasa = mediciones.filter((m) => m.grasa_corporal_pct !== null);

  return (
    <Pila espacio={10}>
      {mediciones.length > 0 && (
        <GrupoCifras etiqueta="Resumen de progreso" columnas={4}>
          <Cifra
            etiqueta="Peso actual"
            valor={numero(pesoActual)}
            unidad={pesoActual !== null ? "kg" : undefined}
            detalle={conPeso.length ? `Medido el ${fechaCorta(conPeso[0].medido_en)}` : "Sin mediciones de peso"}
          />
          <Cifra
            etiqueta="Cambio de peso"
            valor={cambioPeso !== null ? conSigno(cambioPeso) : "—"}
            unidad={cambioPeso !== null ? "kg" : undefined}
            detalle={cambioPeso !== null ? `Desde el ${fechaCorta(conPeso.at(-1)!.medido_en)}` : "Hace falta una segunda medición"}
          />
          <Cifra
            etiqueta="Grasa corporal"
            valor={numero(conGrasa[0]?.grasa_corporal_pct)}
            unidad={conGrasa.length ? "%" : undefined}
            detalle={
              conGrasa.length > 1
                ? `${conSigno((conGrasa[0].grasa_corporal_pct as number) - (conGrasa.at(-1)!.grasa_corporal_pct as number))} puntos desde el inicio`
                : conGrasa.length
                  ? `Medida el ${fechaCorta(conGrasa[0].medido_en)}`
                  : "Sin medir"
            }
          />
          <Cifra
            etiqueta="Mediciones"
            valor={String(mediciones.length)}
            detalle={`La última, el ${fechaCorta(mediciones[0].medido_en)}`}
          />
        </GrupoCifras>
      )}

      <Seccion
        titulo="Mediciones"
        contador={mediciones.length || undefined}
        descripcion={mediciones.length ? "De la más reciente a la más antigua." : undefined}
      >
        <Pila espacio={6}>
          {!archivado && <FormularioMedicion accion={acciones.registrarMedicion} hoy={hoy} />}
          {mediciones.length === 0 ? (
            <EstadoVacio
              icono={Ruler}
              titulo="Todavía no hay mediciones"
              descripcion={
                archivado
                  ? "Este alumno está archivado. Reactívalo para registrarle mediciones."
                  : "La primera servirá como punto de partida para ver su progreso. Peso, grasa corporal y perímetros: registra solo lo que midas."
              }
            />
          ) : (
            <Tabla etiqueta="Historial de mediciones">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  {columnas.map((c) => (
                    <th key={c.clave} scope="col" data-numero>
                      {c.corto ?? c.titulo} ({c.unidad})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mediciones.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{fechaCorta(m.medido_en)}</th>
                    {columnas.map((c) => (
                      <td key={c.clave} data-numero>
                        {numero(m[c.clave])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </Pila>
      </Seccion>
    </Pila>
  );
}

/* ── Historial: notas y sesiones ──────────────────────────────────────────── */

function Historial({ notas, autores, acciones }: DatosPerfil) {
  return (
    <Rejilla columnas="principal" espacio={10}>
      <Seccion titulo="Notas" contador={notas.length || undefined}>
        <Pila espacio={6}>
          <FormularioNota accion={acciones.agregarNota} />
          <ListaNotas notas={notas} autores={autores} />
        </Pila>
      </Seccion>
      <Seccion titulo="Sesiones y citas">
        <Pila espacio={4}>
          <EstadoVacio
            compacto
            titulo="Sin sesiones registradas"
            descripcion="El historial de entrenamientos aparecerá aquí cuando empieces a registrarlos."
          />
          <Enlace href="/calendario" className={css.dato}>
            <CalendarDays aria-hidden /> Ver citas en el calendario
          </Enlace>
        </Pila>
      </Seccion>
    </Rejilla>
  );
}

/* ── Cargando ─────────────────────────────────────────────────────────────── */

export function CargandoPerfil() {
  return (
    <Pila espacio={8} role="status" aria-label="Cargando alumno">
      <Pila espacio={3}>
        <Esqueleto forma="texto" ancho="6rem" />
        <Esqueleto alto="var(--texto-4xl)" ancho="min(100%, 22rem)" />
        <Esqueleto forma="texto" ancho="14rem" />
      </Pila>
      <Esqueleto alto="var(--alto-control)" ancho="100%" />
      <Esqueleto alto="9rem" ancho="100%" />
      <Rejilla columnas="principal" espacio={10}>
        <EsqueletoLista filas={3} />
        <Esqueleto alto="12rem" ancho="100%" />
      </Rejilla>
    </Pila>
  );
}
