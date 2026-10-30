import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inbox, Mail, MessageCircle, Phone, Settings } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { Aparece } from "@/components/ui/movimiento";
import { Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { ETIQUETA_TIPO_OBJETIVO, edad, fechaCorta, fechaHora } from "@/lib/formato";
import { enlaceWhatsapp } from "@/lib/pagina-publica/contenido";
import { obtenerContexto } from "@/lib/sesion";
import { aceptarSolicitud, cambiarEstadoSolicitud } from "./acciones";
import { AccionesSolicitud } from "./acciones-solicitud";

export const metadata: Metadata = { title: "Solicitudes" };

const FILTROS = [
  { valor: "nueva", texto: "Nuevas" },
  { valor: "aceptada", texto: "Aceptadas" },
  { valor: "descartada", texto: "Descartadas" },
] as const;

export default function PaginaSolicitudes({ searchParams }: PageProps<"/alumnos/solicitudes">) {
  return (
    <>
      <Encabezado
        titulo="Solicitudes"
        volver={{ href: "/alumnos", texto: "Alumnos" }}
        descripcion="Lo que llega desde tu página pública. Agrega como alumno a quien quieras entrenar; nadie entra sin que lo decidas."
        acciones={
          <EnlaceBoton href="/configuracion" variante="secundario">
            <Settings aria-hidden className="size-4" /> Mi página pública
          </EnlaceBoton>
        }
      />
      <Suspense fallback={<EsqueletoLista filas={4} />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/alumnos/solicitudes">["searchParams"] }) {
  const { estado: parametro } = await searchParams;
  const elegido = FILTROS.find((f) => f.valor === parametro) ?? FILTROS[0];
  const { supabase } = await obtenerContexto();
  const [{ data: solicitudes, error }, { data: estados }] = await Promise.all([
    supabase
      .from("solicitudes")
      .select("id, tipo, nombres, apellidos, correo, telefono, objetivo, mensaje, fecha_nacimiento, lesiones, estado, alumno_id, creado_en")
      .eq("estado", elegido.valor)
      .order("creado_en", { ascending: false })
      .limit(100),
    supabase.from("solicitudes").select("estado"),
  ]);
  const cuenta = (e: string) => (estados ?? []).filter((s) => s.estado === e).length;

  return (
    <>
      <nav aria-label="Filtrar solicitudes" className={`${claseSegmentado} mb-4 max-w-full overflow-x-auto`}>
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={f.valor === "nueva" ? "/alumnos/solicitudes" : `/alumnos/solicitudes?estado=${f.valor}`}
            scroll={false}
            aria-current={f === elegido ? "true" : undefined}
            className={`${claseSegmento(f === elegido)} inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap`}
          >
            {f.texto}
            <span className="tabular-nums text-xs text-tenue">{cuenta(f.valor)}</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="text-peligro">No se pudieron cargar las solicitudes. Recarga la página.</p>
      ) : !solicitudes?.length ? (
        <Vacio
          icono={<Inbox aria-hidden className="size-5" />}
          titulo={elegido.valor === "nueva" ? "No hay solicitudes nuevas" : `No hay solicitudes ${elegido.texto.toLowerCase()}`}
          texto={
            elegido.valor === "nueva"
              ? "Comparte el enlace de tu página pública (en Ajustes): lo que envíen llegará aquí."
              : "Aparecerán aquí cuando las tengas."
          }
          accion={elegido.valor === "nueva" ? <EnlaceBoton href="/configuracion" variante="secundario">Configurar mi página</EnlaceBoton> : undefined}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {solicitudes.map((s, i) => (
            <Aparece key={s.id} como="li" retraso={Math.min(i, 8) * 0.05} className="h-full">
                <Tarjeta className="flex h-full flex-col gap-4 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Avatar id={s.id} nombres={s.nombres} apellidos={s.apellidos} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">
                        {s.nombres} {s.apellidos}
                      </h2>
                      <p className="text-xs text-tenue">{fechaHora(s.creado_en)}</p>
                    </div>
                    <span
                      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium ${
                        s.tipo === "registro" ? "bg-acento/10 text-acento" : "bg-hueso text-grafito"
                      }`}
                    >
                      {s.tipo === "registro" ? "Quiere entrenar" : "Pregunta"}
                    </span>
                  </div>

                  {(s.objetivo || s.mensaje || s.fecha_nacimiento || s.lesiones) && (
                    <div className="space-y-2 text-sm">
                      {s.objetivo && (
                        <p>
                          <span className="text-tenue">Objetivo: </span>
                          {ETIQUETA_TIPO_OBJETIVO[s.objetivo] ?? s.objetivo}
                        </p>
                      )}
                      {s.fecha_nacimiento && (
                        <p>
                          <span className="text-tenue">Nació: </span>
                          {fechaCorta(s.fecha_nacimiento)}
                          {edad(s.fecha_nacimiento) !== null && <span className="text-tenue"> ({edad(s.fecha_nacimiento)} años)</span>}
                        </p>
                      )}
                      {s.lesiones && (
                        <p className="whitespace-pre-line rounded-2xl bg-aviso/10 px-3 py-2.5 text-grafito">
                          <span className="font-medium text-tinta">Lesiones o molestias: </span>
                          {s.lesiones}
                        </p>
                      )}
                      {s.mensaje && <p className="whitespace-pre-line rounded-2xl bg-hueso/60 px-3 py-2.5 text-grafito">{s.mensaje}</p>}
                    </div>
                  )}

                  <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                    {s.correo && (
                      <li>
                        <a href={`mailto:${encodeURIComponent(s.correo)}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
                          <Mail aria-hidden className="size-4 text-tenue" /> {s.correo}
                        </a>
                      </li>
                    )}
                    {s.telefono && (
                      <>
                        <li>
                          <a href={`tel:${s.telefono}`} className="inline-flex items-center gap-1.5 tabular-nums underline-offset-2 hover:underline">
                            <Phone aria-hidden className="size-4 text-tenue" /> {s.telefono}
                          </a>
                        </li>
                        <li>
                          <a href={enlaceWhatsapp(s.telefono)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
                            <MessageCircle aria-hidden className="size-4 text-tenue" /> WhatsApp
                          </a>
                        </li>
                      </>
                    )}
                  </ul>

                  <div className="mt-auto border-t border-linea pt-4">
                    {s.estado === "aceptada" ? (
                      s.alumno_id ? (
                        <EnlaceBoton href={`/alumnos/${s.alumno_id}`} variante="secundario">
                          Ver alumno
                        </EnlaceBoton>
                      ) : (
                        <p className="text-sm text-tenue">El alumno creado ya no existe.</p>
                      )
                    ) : (
                      <AccionesSolicitud
                        estado={s.estado}
                        principal={s.tipo === "registro"}
                        aceptar={aceptarSolicitud.bind(null, s.id)}
                        descartar={cambiarEstadoSolicitud.bind(null, s.id, "descartada")}
                        restaurar={cambiarEstadoSolicitud.bind(null, s.id, "nueva")}
                      />
                    )}
                  </div>
                </Tarjeta>
            </Aparece>
          ))}
        </ul>
      )}
    </>
  );
}
