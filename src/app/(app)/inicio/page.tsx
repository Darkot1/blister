import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarPlus, ChevronRight, UserPlus } from "lucide-react";
import { SECCIONES, seccion } from "@/components/app/secciones";
import { Avatar } from "@/components/ui/avatar";
import { Esqueleto } from "@/components/ui/esqueleto";
import { IconoApp } from "@/components/ui/icono-app";
import { EnlaceGrupo, ListaAgrupada, Tarjeta, TituloGrupo } from "@/components/ui/tarjeta";
import { obtenerContexto, obtenerPerfil } from "@/lib/sesion";
import { aInstante, etiquetaDiaLarga, hoyLocal, partesLocales, sumarDias } from "@/lib/calendario";
import { fechaCorta } from "@/lib/formato";
import { FilaCita } from "../calendario/fila-cita";

export const metadata: Metadata = { title: "Inicio" };

export default function PaginaInicio() {
  return (
    <Suspense fallback={<Cargando />}>
      <Resumen />
    </Suspense>
  );
}

function Cargando() {
  return (
    <div role="status" aria-label="Cargando">
      <Esqueleto className="mb-8 h-16 w-72 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Esqueleto className="col-span-2 h-80 lg:row-span-2" />
        <Esqueleto className="h-40" />
        <Esqueleto className="h-40" />
        <Esqueleto className="col-span-2 h-36" />
      </div>
    </div>
  );
}

function saludo(minutos: number) {
  if (minutos < 12 * 60) return "Buenos días";
  if (minutos < 19 * 60) return "Buenas tardes";
  return "Buenas noches";
}

async function Resumen() {
  const { supabase } = await obtenerContexto();
  // La hora actual se lee después de un acceso dinámico (Cache Components).
  const ahora = partesLocales(new Date().toISOString());
  const hoy = hoyLocal();
  const [perfil, { count: activos }, { data: recientes }, { data: citas }, { data: alumnos }] = await Promise.all([
    obtenerPerfil(),
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("alumnos").select("id, nombres, apellidos, creado_en").neq("estado", "archivado")
      .order("creado_en", { ascending: false }).limit(5),
    supabase
      .from("citas")
      .select("id, alumno_id, tipo, estado, inicia_en")
      .gte("inicia_en", aInstante(hoy, "00:00"))
      .lt("inicia_en", aInstante(sumarDias(hoy, 8), "00:00"))
      .not("estado", "in", "(cancelada,reprogramada)")
      .order("inicia_en")
      .limit(50),
    supabase.from("alumnos").select("id, nombres, apellidos"),
  ]);

  const nombre = new Map((alumnos ?? []).map((a) => [a.id, `${a.nombres} ${a.apellidos}`]));
  const deHoy = (citas ?? []).filter((c) => partesLocales(c.inicia_en).fecha === hoy);
  const proximas = (citas ?? []).filter((c) => partesLocales(c.inicia_en).fecha !== hoy);
  const porAtender = (citas ?? []).filter((c) => c.estado === "programada" || c.estado === "confirmada").length;
  const alumnosApp = seccion("/alumnos");
  const calendarioApp = seccion("/calendario");

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold tracking-wide text-tenue uppercase">{etiquetaDiaLarga(hoy)}</p>
        <h1 className="mt-1 text-[2.125rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[2.6rem]">
          {saludo(ahora.minutos)}{perfil?.nombres ? `, ${perfil.nombres.split(" ")[0]}` : ""}
        </h1>
      </header>

      {/* Widgets, como en la pantalla de inicio del teléfono. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tarjeta className="col-span-2 flex flex-col overflow-hidden lg:row-span-2">
          <section aria-labelledby="titulo-hoy" className="flex flex-1 flex-col">
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              <IconoApp icono={calendarioApp.icono} tono={calendarioApp.tono} tamano="sm" />
              <h2 id="titulo-hoy" className="flex-1 text-[1.15rem] font-bold tracking-tight">Hoy</h2>
              <span className="text-sm text-tenue">
                {deHoy.length ? `${deHoy.length} ${deHoy.length === 1 ? "cita" : "citas"}` : ""}
              </span>
            </div>
            {deHoy.length ? (
              <ol className="lista-agrupada flex-1" style={{ "--sangria": "1rem" } as React.CSSProperties}>
                {deHoy.map((c) => <FilaCita key={c.id} cita={c} alumno={nombre.get(c.alumno_id)} />)}
              </ol>
            ) : (
              <div className="mx-4 mb-4 flex flex-1 flex-col items-center justify-center rounded-2xl bg-tinta/[0.03] px-5 py-10 text-center">
                <p className="font-semibold">Sin citas para hoy</p>
                <p className="mt-1 max-w-xs text-sm text-tenue">Buen momento para revisar planes o agendar la semana.</p>
              </div>
            )}
            <Link
              href="/calendario"
              className="flex items-center justify-between border-t border-linea px-4 py-3 text-sm font-semibold text-acento hover:bg-acento/[0.04]"
            >
              Abrir calendario
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </section>
        </Tarjeta>

        <Link href="/alumnos" className="group rounded-[var(--radius-tarjeta)] bg-superficie p-4 transition-transform active:scale-[0.98]">
          <IconoApp icono={alumnosApp.icono} tono={alumnosApp.tono} tamano="sm" />
          <p className="cifra mt-5 text-6xl leading-none font-semibold">{activos ?? 0}</p>
          <p className="mt-1 text-sm text-tenue">{activos === 1 ? "alumno activo" : "alumnos activos"}</p>
        </Link>

        <Link href="/calendario" className="group rounded-[var(--radius-tarjeta)] bg-superficie p-4 transition-transform active:scale-[0.98]">
          <IconoApp icono={calendarioApp.icono} tono={calendarioApp.tono} tamano="sm" />
          <p className="cifra mt-5 text-6xl leading-none font-semibold">{porAtender}</p>
          <p className="mt-1 text-sm text-tenue">por atender, próximos 7 días</p>
        </Link>

        {/* Accesos rápidos al estilo del centro de control. */}
        <Link
          href="/alumnos/nuevo"
          className="flex flex-col justify-between gap-6 rounded-[var(--radius-tarjeta)] bg-app-alumnos p-4 text-white transition-transform active:scale-[0.98]"
        >
          <span className="grid size-10 place-items-center rounded-full bg-white/20"><UserPlus aria-hidden className="size-5" /></span>
          <span className="leading-tight font-semibold">Nuevo<br />alumno</span>
        </Link>
        <Link
          href="/calendario"
          className="flex flex-col justify-between gap-6 rounded-[var(--radius-tarjeta)] bg-tinta p-4 text-white transition-transform active:scale-[0.98]"
        >
          <span className="grid size-10 place-items-center rounded-full bg-white/15"><CalendarPlus aria-hidden className="size-5" /></span>
          <span className="leading-tight font-semibold">Agendar<br />cita</span>
        </Link>
      </div>

      {/* Menú en rejilla: todas las secciones como apps. */}
      <section aria-labelledby="titulo-apps" className="mt-8">
        <TituloGrupo id="titulo-apps">Secciones</TituloGrupo>
        <Tarjeta className="p-4 sm:p-5">
          <ul className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-6">
            {SECCIONES.filter((s) => s.href !== "/inicio").map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex flex-col items-center gap-2 rounded-2xl text-center">
                  <IconoApp icono={s.icono} tono={s.tono} tamano="lg" className="transition-transform group-active:scale-90" />
                  <span className="text-sm leading-tight font-semibold">{s.texto}</span>
                  <span className="-mt-1.5 hidden text-xs leading-snug text-tenue sm:block">{s.resumen}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="titulo-proximos">
          <TituloGrupo id="titulo-proximos" accion={<EnlaceGrupo href="/calendario">Semana</EnlaceGrupo>}>
            Próximos días
          </TituloGrupo>
          {proximas.length ? (
            <ListaAgrupada ordenada>
              {proximas.slice(0, 6).map((c) => <FilaCita key={c.id} cita={c} alumno={nombre.get(c.alumno_id)} conFecha />)}
            </ListaAgrupada>
          ) : (
            <Tarjeta className="px-4 py-6 text-sm text-tenue">Nada agendado en la próxima semana.</Tarjeta>
          )}
        </section>

        <section aria-labelledby="titulo-recientes">
          <TituloGrupo id="titulo-recientes" accion={<EnlaceGrupo href="/alumnos">Todos</EnlaceGrupo>}>
            Registrados recientemente
          </TituloGrupo>
          {recientes?.length ? (
            <ListaAgrupada sangria="4.25rem">
              {recientes.map((a) => (
                <li key={a.id}>
                  <Link href={`/alumnos/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-tinta/[0.03]">
                    <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} tamano="sm" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{a.nombres} {a.apellidos}</span>
                    <span className="shrink-0 text-sm text-tenue">{fechaCorta(a.creado_en)}</span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-tinta/25" />
                  </Link>
                </li>
              ))}
            </ListaAgrupada>
          ) : (
            <Tarjeta className="px-4 py-6 text-sm text-tenue">Cuando registres alumnos aparecerán aquí.</Tarjeta>
          )}
        </section>
      </div>
    </>
  );
}
