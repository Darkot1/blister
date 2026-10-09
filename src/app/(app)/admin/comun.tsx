import Link from "next/link";
import { Activity } from "lucide-react";
import { claseSegmentado, claseSegmento, Vacio } from "@/components/ui/tarjeta";
import { ETIQUETA_ESTADO_CITA, fechaCorta, fechaHora } from "@/lib/formato";
import type { Actividad } from "./tipos";

const ESTADO: Record<string, { texto: string; color: string }> = {
  activo: { texto: "Activo", color: "bg-exito" },
  suspendido: { texto: "Suspendido", color: "bg-peligro" },
  archivado: { texto: "Archivado", color: "bg-tenue/60" },
};

/** Estado de un espacio de trabajo: punto de color + texto. */
export function InsigniaEspacio({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO.archivado;
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${e.color}`} />
      {e.texto}
    </span>
  );
}

const PESTANAS = [
  { clave: "resumen", href: "/admin", texto: "Resumen" },
  { clave: "usuarios", href: "/admin/usuarios", texto: "Usuarios" },
  { clave: "accesos", href: "/admin/accesos", texto: "Bitácora" },
] as const;

/** Pestañas de la sección de administración. */
export function PestanasAdmin({ activa }: { activa: (typeof PESTANAS)[number]["clave"] }) {
  return (
    <nav aria-label="Administración" className={claseSegmentado}>
      {PESTANAS.map((p) => (
        <Link
          key={p.clave}
          href={p.href}
          aria-current={activa === p.clave ? "page" : undefined}
          className={`${claseSegmento(activa === p.clave)} inline-flex items-center`}
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}

export const ROL: Record<string, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  entrenador: "Entrenador",
  asistente: "Asistente",
};

/** Cifra pequeña con su etiqueta, para rejillas de datos. */
export function Cifra({ titulo, valor, nota }: { titulo: string; valor: number | string; nota?: string }) {
  return (
    <div className="bg-superficie p-4">
      <p className="etiqueta">{titulo}</p>
      <p className="cifra mt-2 text-2xl leading-none font-semibold">{valor}</p>
      {nota && <p className="mt-1.5 text-xs text-tenue">{nota}</p>}
    </div>
  );
}

const ACCION: Record<Actividad["accion"], string> = { INSERT: "creó", UPDATE: "editó", DELETE: "eliminó" };
const ENTIDAD: Record<string, string> = {
  alumnos: "un alumno",
  citas: "una cita",
  mediciones: "una medición",
  planes: "un plan",
  plantillas: "una plantilla",
  sesiones: "una sesión",
  condiciones_alumno: "una condición",
  miembros_organizacion: "un miembro",
};

/** Últimos cambios registrados por la auditoría (quién hizo qué y cuándo, sin el contenido). */
export function ListaActividad({ actividad, conEspacio = false }: { actividad: Actividad[]; conEspacio?: boolean }) {
  if (actividad.length === 0) {
    return <Vacio icono={<Activity className="size-5" />} titulo="Sin actividad" texto="Aún no hay cambios registrados." className="m-4" />;
  }
  return (
    <ul className="divide-y divide-linea">
      {actividad.map((a, i) => (
        <li key={i} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
          <span
            aria-hidden
            className={`size-1.5 shrink-0 translate-y-[-1px] rounded-full ${a.accion === "DELETE" ? "bg-peligro" : a.accion === "INSERT" ? "bg-exito" : "bg-tenue/60"}`}
          />
          <p className="min-w-0 flex-1">
            <span className="font-medium">{a.usuario ?? "Sistema"}</span> {ACCION[a.accion]} {ENTIDAD[a.tipo_entidad] ?? a.tipo_entidad}
            {conEspacio && a.espacio_id && (
              <>
                {" "}en{" "}
                <Link href={`/admin/espacios/${a.espacio_id}`} className="underline decoration-linea underline-offset-2 hover:decoration-tinta">
                  {a.espacio}
                </Link>
              </>
            )}
          </p>
          <time dateTime={a.creado_en} className="shrink-0 text-xs text-tenue">{fechaHora(a.creado_en)}</time>
        </li>
      ))}
    </ul>
  );
}

const ORDEN_CITAS = ["completada", "no_asistio", "confirmada", "programada", "cancelada", "reprogramada"];
const COLOR_CITA: Record<string, string> = {
  completada: "bg-exito",
  no_asistio: "bg-peligro",
  confirmada: "bg-tinta",
  programada: "bg-tinta/40",
  cancelada: "bg-tenue/50",
  reprogramada: "bg-aviso",
};

/** Citas por estado: barra apilada + leyenda con cifras, y la tasa de asistencia. */
export function CitasPorEstado({ conteo }: { conteo: Record<string, number> }) {
  const total = Object.values(conteo).reduce((t, n) => t + n, 0);
  const atendidas = (conteo.completada ?? 0) + (conteo.no_asistio ?? 0);
  const asistencia = atendidas ? Math.round(((conteo.completada ?? 0) / atendidas) * 100) : null;
  const estados = ORDEN_CITAS.filter((e) => conteo[e]);

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="cifra text-3xl leading-none font-semibold">{total}</p>
        <p className="text-sm text-tenue">
          Asistencia <span className="cifra font-semibold text-tinta">{asistencia === null ? "—" : `${asistencia} %`}</span>
        </p>
      </div>
      <div aria-hidden className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-tinta/[0.06]">
        {estados.map((e) => (
          <span key={e} className={COLOR_CITA[e]} style={{ width: `${(conteo[e] / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {estados.length === 0 && <li className="col-span-2 text-tenue">Sin citas en este periodo.</li>}
        {estados.map((e) => (
          <li key={e} className="flex items-center gap-2">
            <span aria-hidden className={`size-2 rounded-sm ${COLOR_CITA[e]}`} />
            <span className="flex-1 text-tenue">{ETIQUETA_ESTADO_CITA[e] ?? e}</span>
            <span className="cifra font-medium">{conteo[e]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras agrupadas por semana (12 semanas). La tabla oculta es la versión accesible. */
export function GraficaSemanas({
  semanas,
  series,
  titulo,
}: {
  semanas: { semana: string; [clave: string]: number | string }[];
  series: { clave: string; texto: string; color: string }[];
  titulo: string;
}) {
  const maximo = Math.max(1, ...semanas.flatMap((s) => series.map((x) => Number(s[x.clave]))));
  const etiqueta = (f: string) => fechaCorta(f).replace(/( de)? \d{4}$/, "").replace(/ de /, " ");
  return (
    <figure className="p-4">
      {series.length > 1 && (
        <figcaption className="mb-3 flex gap-4 text-xs text-tenue">
          {series.map((x) => (
            <span key={x.clave} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`size-2 rounded-sm ${x.color}`} />
              {x.texto}
            </span>
          ))}
        </figcaption>
      )}
      <div aria-hidden className="grid h-32 grid-cols-12 items-end gap-1.5 border-b border-linea sm:gap-2.5">
        {semanas.map((s) => (
          <div key={s.semana} className="flex h-full items-end justify-center gap-0.5" title={`Semana del ${etiqueta(s.semana)}: ${series.map((x) => `${s[x.clave]} ${x.texto.toLowerCase()}`).join(", ")}`}>
            {series.map((x) => (
              <span
                key={x.clave}
                className={`w-full max-w-3 rounded-t-[3px] ${x.color}`}
                style={{ height: Number(s[x.clave]) ? `${(Number(s[x.clave]) / maximo) * 100}%` : 2 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1.5 grid grid-cols-12 gap-1.5 sm:gap-2.5">
        {semanas.map((s, i) => (
          <span key={s.semana} className="text-center font-mono text-[0.6rem] whitespace-nowrap text-tenue">
            {i % 3 === 2 ? etiqueta(s.semana) : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr><th scope="col">Semana</th>{series.map((x) => <th key={x.clave} scope="col">{x.texto}</th>)}</tr>
        </thead>
        <tbody>
          {semanas.map((s) => (
            <tr key={s.semana}><th scope="row">{etiqueta(s.semana)}</th>{series.map((x) => <td key={x.clave}>{s[x.clave]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
