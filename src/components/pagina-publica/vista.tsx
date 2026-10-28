import Image from "next/image";
import { ArrowRight, AtSign, Award, Clock, MapPin, MessageCircle, MonitorSmartphone } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { Aparece } from "@/components/ui/movimiento";
import {
  ETIQUETA_MODALIDAD,
  enlaceWhatsapp,
  listaCertificaciones,
  normalizarDiseno,
  urlFoto,
  type Diseno,
  type Seccion,
} from "@/lib/pagina-publica/contenido";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";

/**
 * Fondo de la portada. Sin foto es su color; con foto, el velo encima de ella (para que el texto se lea),
 * orientado según dónde va el texto. `claro`: el texto va en blanco.
 */
const FONDO: Record<Diseno["fondo"], { solido: string; velo: Record<Diseno["portada"], string>; claro: boolean }> = {
  suave: {
    solido: "border border-linea bg-superficie",
    velo: {
      izquierda: "bg-gradient-to-r from-superficie via-superficie/85 to-superficie/20",
      centrada: "bg-superficie/80",
      abajo: "bg-gradient-to-t from-superficie via-superficie/80 to-superficie/5",
    },
    claro: false,
  },
  oscuro: {
    solido: "bg-[#12121b]",
    velo: {
      izquierda: "bg-gradient-to-r from-black/85 via-black/55 to-black/10",
      centrada: "bg-black/60",
      abajo: "bg-gradient-to-t from-black/90 via-black/45 to-black/5",
    },
    claro: true,
  },
  color: {
    solido: "bg-acento",
    velo: {
      izquierda: "bg-gradient-to-r from-acento via-acento/75 to-acento/15",
      centrada: "bg-acento/75",
      abajo: "bg-gradient-to-t from-acento via-acento/60 to-acento/5",
    },
    claro: true,
  },
};

/** Posición del texto dentro de la portada según el estilo. */
const POSICION: Record<Diseno["portada"], { caja: string; texto: string; centrado: boolean }> = {
  izquierda: { caja: "min-h-[18rem] items-center sm:min-h-[21rem]", texto: "max-w-2xl", centrado: false },
  centrada: { caja: "min-h-[18rem] items-center justify-center text-center sm:min-h-[21rem]", texto: "mx-auto max-w-3xl", centrado: true },
  abajo: { caja: "min-h-[20rem] items-end sm:min-h-[24rem]", texto: "max-w-2xl", centrado: false },
};

/**
 * La página pública de un espacio. La usan /e/<slug> y la vista previa del editor, así que lo que se
 * edita es exactamente lo que se publica. El diseño (orden, ancho y visibilidad de secciones, color,
 * estilo y fondo de portada, texto del botón) viene de `datos.diseno`; cada sección sale solo si tiene
 * contenido.
 */
export function VistaPaginaPublica({
  datos,
  formulario,
  extremo,
}: {
  datos: PaginaPublica;
  formulario: React.ReactNode;
  /** Algo más en la cabecera, a la derecha (el cambio de tema en la página real). */
  extremo?: React.ReactNode;
}) {
  const diseno = normalizarDiseno(datos.diseno);
  const [principal] = datos.entrenadores;
  const nombre = principal ? `${principal.nombres} ${principal.apellidos}`.trim() : datos.nombre;
  const quien = principal?.nombres || "tu entrenador";
  // El color elegido reemplaza al cobalto en toda la página (botones, números, detalles).
  const estilo = {
    "--acento": diseno.acento,
    "--acento-hover": `color-mix(in oklab, ${diseno.acento} 85%, white)`,
  } as React.CSSProperties;

  const contenido: Record<Seccion, React.ReactNode> = {
    sobre: <SobreMi datos={datos} />,
    metodos: <Metodos datos={datos} />,
    contacto: <Contacto datos={datos} quien={quien} formulario={formulario} />,
  };
  // Una sección vacía no ocupa su celda de la rejilla.
  const tieneContenido: Record<Seccion, boolean> = {
    sobre: Boolean(datos.presentacion) || listaCertificaciones(datos.certificaciones).length > 0,
    metodos: datos.metodos.some((m) => m.titulo.trim()),
    contacto: true,
  };
  const secciones = diseno.secciones
    // El formulario no se oculta: es adonde lleva el botón principal.
    .filter((s) => (s.visible || s.id === "contacto") && tieneContenido[s.id]);

  return (
    <div style={estilo} className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-4 sm:py-5">
        <p className="titulo-display truncate text-lg sm:text-xl">{nombre}</p>
        <div className="flex shrink-0 items-center gap-2">
          {extremo}
          <a href="#empezar" className="inline-flex h-9 items-center rounded-full bg-acento px-4 text-sm font-semibold text-sobre-acento transition-colors hover:bg-acento-hover">
            {diseno.boton}
          </a>
        </div>
      </header>

      <Portada datos={datos} diseno={diseno} nombre={nombre} />

      {/* Rejilla de dos columnas: cada sección ocupa una ("mitad") o las dos ("completo"). */}
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:mt-12 sm:gap-y-12 lg:grid-cols-2">
        {secciones.map((s, i) => (
          <Aparece key={s.id} retraso={0.15 + i * 0.05} className={`@container min-w-0 ${s.ancho === "completo" ? "lg:col-span-2" : ""}`}>
            {contenido[s.id]}
          </Aparece>
        ))}
      </div>

      <footer className="mt-12 flex items-center justify-center gap-2 border-t border-linea py-6 text-xs text-tenue">
        Con la tecnología de <Marca className="scale-90" />
      </footer>
    </div>
  );
}

/* ---------- Portada ---------- */

function Portada({ datos, diseno, nombre }: { datos: PaginaPublica; diseno: Diseno; nombre: string }) {
  const foto = urlFoto(datos.foto_ruta);
  const fondo = FONDO[diseno.fondo];
  const posicion = POSICION[diseno.portada];
  const claro = fondo.claro;
  const items = [
    datos.experiencia_anos ? { icono: Clock, texto: `${datos.experiencia_anos} ${datos.experiencia_anos === 1 ? "año" : "años"} de experiencia` } : null,
    datos.modalidad ? { icono: MonitorSmartphone, texto: ETIQUETA_MODALIDAD[datos.modalidad] } : null,
    datos.ubicacion ? { icono: MapPin, texto: datos.ubicacion } : null,
  ].filter((d) => d !== null);

  return (
    <Aparece
      className={`relative isolate flex overflow-hidden rounded-[var(--radius-elevada)] p-6 sm:p-10 ${posicion.caja} ${
        foto ? "bg-[#12121b]" : fondo.solido
      } ${claro ? "text-white" : ""}`}
    >
      {/* La foto siempre detrás del texto, con un velo del color del fondo para que se lea. */}
      {foto && (
        <>
          <Image src={foto} alt="" fill priority sizes="(min-width: 1024px) 64rem, 100vw" className="-z-20 object-cover" />
          <div aria-hidden className={`absolute inset-0 -z-10 ${fondo.velo[diseno.portada]}`} />
        </>
      )}
      <div className={`w-full space-y-4 ${posicion.texto}`}>
        <p className={`etiqueta ${claro ? "text-white/70" : ""}`}>Entrenamiento personalizado</p>
        <h1 className="titulo-display text-[2.1rem] leading-[1.06] sm:text-[2.8rem]">{datos.titular || `Entrena con ${nombre.split(" ")[0]}`}</h1>
        {items.length > 0 && (
          <ul className={`flex flex-wrap gap-x-5 gap-y-2 text-sm ${posicion.centrado ? "justify-center" : ""} ${claro ? "text-white/85" : "text-grafito"}`}>
            {items.map(({ icono: Icono, texto }) => (
              <li key={texto} className="inline-flex items-center gap-1.5">
                <Icono aria-hidden className={`size-4 ${claro ? "text-white/65" : "text-acento"}`} /> {texto}
              </li>
            ))}
          </ul>
        )}
        <div className={`flex flex-wrap gap-2 pt-1 ${posicion.centrado ? "justify-center" : ""}`}>
          <a
            href="#empezar"
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
              claro ? "bg-white text-[#12121b] hover:bg-white/90" : "bg-acento text-sobre-acento hover:bg-acento-hover"
            }`}
          >
            {diseno.boton} <ArrowRight aria-hidden className="size-4" />
          </a>
          {datos.whatsapp && (
            <a
              href={enlaceWhatsapp(datos.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
                claro ? "border-white/40 bg-black/25 backdrop-blur-md hover:bg-black/40" : "border-linea-fuerte bg-superficie/70 backdrop-blur-md hover:bg-hueso"
              }`}
            >
              <MessageCircle aria-hidden className="size-4" /> WhatsApp
            </a>
          )}
          {datos.instagram && (
            <a
              href={`https://instagram.com/${datos.instagram}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Instagram: ${datos.instagram}`}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${
                claro ? "border-white/40 bg-black/25 backdrop-blur-md hover:bg-black/40" : "border-linea-fuerte bg-superficie/70 backdrop-blur-md hover:bg-hueso"
              }`}
            >
              <AtSign aria-hidden className="size-4" /> {datos.instagram}
            </a>
          )}
        </div>
      </div>
    </Aparece>
  );
}

/* ---------- Secciones (se adaptan a su ancho con container queries) ---------- */

function Encabezado({ id, antetitulo, titulo }: { id: string; antetitulo: string; titulo: string }) {
  return (
    <div>
      <p className="etiqueta mb-1.5 text-acento">{antetitulo}</p>
      <h2 id={id} className="titulo-display text-3xl">{titulo}</h2>
    </div>
  );
}

function SobreMi({ datos }: { datos: PaginaPublica }) {
  const certificaciones = listaCertificaciones(datos.certificaciones);
  if (!datos.presentacion && !certificaciones.length) return null;
  return (
    <section aria-labelledby="titulo-sobre" className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @3xl:gap-10">
      <Encabezado id="titulo-sobre" antetitulo="Quién soy" titulo="Sobre mí" />
      <div>
        {datos.presentacion && <p className="whitespace-pre-line text-lg leading-relaxed text-grafito">{datos.presentacion}</p>}
        {certificaciones.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Certificaciones">
            {certificaciones.map((c) => (
              <li key={c} className="inline-flex items-center gap-1.5 rounded-full border border-linea bg-superficie px-3 py-1.5 text-sm">
                <Award aria-hidden className="size-4 text-acento" /> {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Metodos({ datos }: { datos: PaginaPublica }) {
  const metodos = datos.metodos.filter((m) => m.titulo.trim());
  if (!metodos.length) return null;
  return (
    <section aria-labelledby="titulo-metodos">
      <Encabezado id="titulo-metodos" antetitulo="Mi método" titulo="Cómo trabajo" />
      <ol className={`mt-6 grid gap-3 @lg:grid-cols-2 ${metodos.length % 3 === 0 ? "@4xl:grid-cols-3" : ""}`}>
        {metodos.map((m, i) => (
          <li key={i} className="flex flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-5">
            <span className="titulo-display text-2xl leading-none tabular-nums text-acento">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-4 font-semibold">{m.titulo}</h3>
            {m.descripcion && <p className="mt-1.5 text-sm leading-relaxed text-tenue">{m.descripcion}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Contacto({ datos, quien, formulario }: { datos: PaginaPublica; quien: string; formulario: React.ReactNode }) {
  return (
    <section id="empezar" aria-labelledby="titulo-empezar" className="scroll-mt-6">
      <div className="grid gap-8 rounded-[var(--radius-elevada)] border border-linea bg-superficie p-6 sm:p-8 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:gap-10">
        <div>
          <Encabezado id="titulo-empezar" antetitulo="Empecemos" titulo="Da el primer paso" />
          <p className="mt-3 text-tenue">Deja tus datos y {quien} se pondrá en contacto contigo. También puedes escribir solo para preguntar.</p>
          {(datos.instagram || datos.whatsapp) && (
            <ul className="mt-5 space-y-2.5 text-sm">
              {datos.whatsapp && (
                <li>
                  <a href={enlaceWhatsapp(datos.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">
                    <MessageCircle aria-hidden className="size-4 text-acento" /> Escribir por WhatsApp
                  </a>
                </li>
              )}
              {datos.instagram && (
                <li>
                  <a href={`https://instagram.com/${datos.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium hover:underline">
                    <AtSign aria-hidden className="size-4 text-acento" /> {datos.instagram} en Instagram
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
        <div>{formulario}</div>
      </div>
    </section>
  );
}
