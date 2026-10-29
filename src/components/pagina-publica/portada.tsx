import Image from "next/image";
import { ArrowDown, AtSign, Clock, Gift, MessageCircle, Quote } from "lucide-react";
import { Aparece } from "@/components/ui/movimiento";
import { ETIQUETA_MODALIDAD, enlaceWhatsapp, textoSobre, type Diseno } from "@/lib/pagina-publica/contenido";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";

/**
 * Tonos de la portada (`diseno.fondo`). Sin foto es el color de la franja; con foto, además, el velo
 * que la funde con el texto. `desde` y `via`: el color de la franja, para los degradados que funden la foto.
 */
const TONO: Record<Diseno["fondo"], { franja: string; desde: string; velo: string; via: string; hasta: string }> = {
  suave: { franja: "bg-superficie", desde: "from-superficie", via: "via-superficie/80", hasta: "to-superficie/30", velo: "bg-superficie/80" },
  // Siempre oscura, aunque la página esté en claro: los tokens de dentro pasan al tema oscuro.
  oscuro: { franja: "tema-oscuro bg-[#12121b]", desde: "from-[#12121b]", via: "via-[#12121b]/75", hasta: "to-[#12121b]/30", velo: "bg-[#12121b]/70" },
  color: { franja: "bg-acento text-sobre-acento", desde: "from-acento", via: "via-acento/75", hasta: "to-acento/30", velo: "bg-acento/80" },
};

const CONTENEDOR = "relative mx-auto w-full max-w-6xl px-5 @3xl:px-10";

export type Cifra = { valor: string; texto: string };

/**
 * Portada de la página pública, pensada para que el visitante pida su cupo: el nombre del entrenador en
 * grande, su promesa, la oferta para empezar, el botón al formulario con lo que quita el miedo a escribir
 * (sin compromiso, cuándo responde) y la prueba: un testimonio y las cifras reales. Se adapta a su
 * contenedor (también en la vista previa del editor). Composiciones (`diseno.portada`):
 *
 * - `izquierda`: texto a la izquierda, la foto a sangre a la derecha.
 * - `retrato`: la foto enmarcada en vertical, con la primera cifra encima.
 * - `revista`: el nombre gigante a todo el ancho y debajo la foto apaisada junto a la promesa.
 * - `centrada` / `abajo`: la foto ocupa toda la franja y el texto va encima (centrado o abajo).
 * - `tarjeta`: la foto a toda la franja y el texto en una tarjeta que flota sobre ella.
 * - `testimonio`: el mejor testimonio en grande junto al nombre; la foto, como avatar.
 * - `minimal`: solo tipografía (la foto, si hay, en pequeño): para quien no tiene una buena foto.
 *
 * En estrecho todas se apilan: la foto arriba (salvo `testimonio` y `minimal`) y el texto debajo.
 */
export function Portada({
  datos,
  diseno,
  nombre,
  foto,
  cifras,
  estilo,
}: {
  datos: PaginaPublica;
  diseno: Diseno;
  nombre: string;
  foto: string | null;
  cifras: Cifra[];
  /** Variables del color elegido: la franja oscura las reinicia y hay que volver a ponerlas. */
  estilo: React.CSSProperties;
}) {
  const tono = TONO[diseno.fondo];
  const composicion = diseno.portada;
  const enColor = diseno.fondo === "color";
  const oscura = diseno.fondo === "oscuro";
  // Sobre el color elegido, el botón principal se invierte (blanco o casi negro según el color).
  const sobreBlanco = textoSobre(diseno.acento) === "#ffffff";

  const [primerNombre, ...resto] = nombre.split(" ");
  // Qué y dónde, en una línea sobre el nombre. El nombre del espacio no se muestra: suele ser el automático.
  const rotuloTexto = ["Entrenamiento personal", datos.modalidad ? ETIQUETA_MODALIDAD[datos.modalidad] : null, datos.ubicacion].filter(Boolean).join(" · ");
  // El testimonio más fuerte (el que trae un resultado) como prueba junto al botón.
  const testimonios = (datos.testimonios ?? []).filter((t) => t.nombre.trim() && t.texto.trim());
  const destacado = testimonios.find((t) => t.resultado.trim()) ?? testimonios[0];

  const secundario = enColor ? "text-sobre-acento/85" : "text-grafito";
  const texto = enColor ? "text-sobre-acento" : "text-tinta";
  // Sobre la foto de fondo (en ancho) el rótulo tenue se pierde: un paso más fuerte.
  const rotulo = enColor
    ? "text-sobre-acento/80"
    : foto && (composicion === "centrada" || composicion === "abajo")
      ? "text-tenue @3xl:text-grafito"
      : "text-tenue";
  const borde = enColor ? "border-sobre-acento/35" : "border-linea-fuerte/60";
  const secundarioBoton = enColor ? "border-sobre-acento/45 hover:bg-sobre-acento/10" : "border-linea-fuerte hover:bg-hueso";
  // Una superficie un paso distinta del fondo de la franja (tarjetas, marcos).
  const relieve = enColor ? "bg-sobre-acento/10" : "bg-hueso/60";

  const imagen = (sizes: string, clase = "") => (
    // La foto acompaña al nombre del h1: describirla repetiría el texto.
    <Image src={foto!} alt="" fill preload sizes={sizes} className={`object-cover ${clase}`} />
  );

  const avatar = foto && (
    <span className="relative mb-6 block size-16 shrink-0 overflow-hidden rounded-full ring-2 ring-acento/50 ring-offset-2 ring-offset-transparent @3xl:size-20">
      {imagen("80px")}
    </span>
  );

  const titulo = (tamano: "medio" | "grande" | "gigante", centro = false) => (
    <h1
      id="titulo-portada"
      className={`titulo-display leading-[0.95] tracking-[-0.005em] hyphens-auto [overflow-wrap:anywhere] ${centro ? "text-center" : ""} ${
        tamano === "gigante"
          ? "text-[clamp(3rem,15cqi,10.5rem)] leading-[0.88]"
          : tamano === "grande"
            ? "text-[clamp(2.6rem,12cqi,7rem)] @3xl:text-[clamp(3rem,8cqi,7rem)]"
            : "text-[clamp(2.6rem,12cqi,4.6rem)] @3xl:text-[clamp(3rem,6.4cqi,5.6rem)]"
      }`}
    >
      <span className="block">{primerNombre}</span>
      {resto.length > 0 && <span className="block">{resto.join(" ")}</span>}
    </h1>
  );

  const rotuloLinea = (centro = false) => <p className={`text-sm font-medium ${rotulo} ${centro ? "text-center" : ""}`}>{rotuloTexto}</p>;

  /** La promesa, la oferta, los botones y lo que quita el miedo a escribir. */
  const accion = (centro = false) => (
    <div className={`flex flex-col ${centro ? "items-center text-center" : "items-start"}`}>
      <p className={`max-w-xl text-lg leading-snug @3xl:text-xl ${texto}`}>
        {datos.titular || "Entrenamiento a tu medida, con un plan pensado para tu objetivo."}
      </p>

      {/* El gancho para empezar ("Primera sesión gratis"), justo encima del botón que lo cobra. */}
      {datos.oferta_inicial && (
        <p
          className={`mt-6 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            enColor ? "bg-sobre-acento/12 text-sobre-acento" : "bg-acento/12 text-tinta ring-1 ring-acento/30"
          }`}
        >
          <Gift aria-hidden className={`size-4 shrink-0 ${enColor ? "" : "text-acento"}`} />
          <span className="min-w-0">{datos.oferta_inicial}</span>
        </p>
      )}

      <div className={`flex flex-wrap gap-2.5 ${datos.oferta_inicial ? "mt-4" : "mt-7"} ${centro ? "justify-center" : ""}`}>
        <a
          id="boton-portada"
          href="#empezar"
          className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold transition-colors ${
            enColor
              ? sobreBlanco
                ? "bg-white text-[#12121b] hover:bg-white/90"
                : "bg-[#12121b] text-white hover:bg-[#12121b]/90"
              : "bg-acento text-sobre-acento hover:bg-acento-hover"
          }`}
        >
          {diseno.boton} <ArrowDown aria-hidden className="size-4" />
        </a>
        {datos.whatsapp && (
          <a
            href={enlaceWhatsapp(datos.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-12 items-center gap-2 rounded-full border px-5 text-[0.95rem] font-semibold transition-colors ${secundarioBoton}`}
          >
            <MessageCircle aria-hidden className="size-4" /> WhatsApp
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        )}
        {datos.instagram && (
          <a
            href={`https://instagram.com/${datos.instagram}`}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-12 items-center gap-2 rounded-full border px-5 text-[0.95rem] font-semibold transition-colors ${secundarioBoton}`}
          >
            <AtSign aria-hidden className="size-4" /> Instagram
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        )}
      </div>
      {/* Lo que quita el miedo a escribir: sin compromiso y cuándo te responden. */}
      <p className={`mt-3 inline-flex items-center gap-1.5 text-sm ${secundario}`}>
        <Clock aria-hidden className="size-4 shrink-0" />
        {datos.respuesta_horas ? `Sin compromiso. Responde en menos de ${datos.respuesta_horas} horas.` : "Sin compromiso: te escribe para conocerte."}
      </p>
    </div>
  );

  const citaBreve = (centro = false) =>
    destacado && (
      <figure className={`mt-8 max-w-md ${centro ? "mx-auto text-center" : `border-l-2 pl-4 ${enColor ? "border-sobre-acento/40" : "border-acento"}`}`}>
        <blockquote className={`line-clamp-3 text-lg leading-snug ${texto}`}>
          {/* El resultado, si lo hay, dice más en menos palabras que el testimonio entero. */}
          «{destacado.resultado.trim() || destacado.texto.trim()}»
        </blockquote>
        <figcaption className={`mt-1.5 text-sm ${rotulo}`}>{destacado.nombre}</figcaption>
      </figure>
    );

  const listaCifras = (centro = false, clase = "mt-10 max-w-xl") =>
    cifras.length > 0 && (
      <dl
        className={`grid w-full gap-x-6 gap-y-4 border-t pt-5 ${clase} ${borde} ${
          cifras.length === 1 ? "grid-cols-1" : cifras.length === 2 ? "grid-cols-2" : "grid-cols-3"
        } ${centro ? "mx-auto text-center" : ""}`}
      >
        {cifras.map((c) => (
          <div key={c.texto} className="flex min-w-0 flex-col-reverse gap-1">
            <dt className={`text-sm leading-tight ${rotulo}`}>{c.texto}</dt>
            <dd className="cifra-display text-4xl leading-none @3xl:text-5xl">{c.valor}</dd>
          </div>
        ))}
      </dl>
    );

  /** Todo el texto, de arriba abajo: la base de casi todas las composiciones. */
  const completo = (opciones: { tamano: "medio" | "grande"; centro?: boolean; clase?: string }) => (
    <Aparece className={`flex w-full min-w-0 flex-col ${opciones.centro ? "items-center" : ""} ${opciones.clase ?? ""}`}>
      {rotuloLinea(opciones.centro)}
      <div className="mt-3 w-full">{titulo(opciones.tamano, opciones.centro)}</div>
      <div className="mt-5 w-full">{accion(opciones.centro)}</div>
      {citaBreve(opciones.centro)}
      {listaCifras(opciones.centro)}
    </Aparece>
  );

  const seccion = (clase: string, hijos: React.ReactNode, conEstilo = oscura) => (
    <section id="portada" aria-labelledby="titulo-portada" style={conEstilo ? estilo : undefined} className={`relative isolate overflow-hidden ${clase}`}>
      {hijos}
    </section>
  );

  /* --- Solo texto: tipografía grande y aire; la foto, si hay, como avatar. --- */
  if (composicion === "minimal" || (!foto && composicion !== "testimonio" && composicion !== "revista")) {
    const centro = composicion === "centrada";
    return seccion(
      tono.franja,
      <div className={`${CONTENEDOR} flex pt-14 pb-12 @3xl:py-24 ${centro ? "justify-center" : ""} ${composicion === "abajo" ? "@3xl:min-h-[30rem] @3xl:items-end" : ""}`}>
        <div className={`flex w-full flex-col ${centro ? "items-center" : ""}`}>
          {composicion === "minimal" && avatar}
          {completo({ tamano: "grande", centro, clase: "max-w-4xl" })}
        </div>
      </div>,
    );
  }

  /* --- Revista: el nombre gigante a todo el ancho; debajo, la foto apaisada y la promesa. --- */
  if (composicion === "revista") {
    return seccion(
      tono.franja,
      <div className={`${CONTENEDOR} pt-12 pb-12 @3xl:pt-16 @3xl:pb-20`}>
        <Aparece>
          {rotuloLinea()}
          <div className={`mt-4 border-b pb-6 @3xl:pb-8 ${borde}`}>{titulo("gigante")}</div>
        </Aparece>
        <div className={`mt-8 grid gap-8 @3xl:mt-12 @3xl:gap-12 ${foto ? "@3xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : ""}`}>
          {foto && <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-tarjeta)]">{imagen("(min-width: 768px) 58vw, 100vw")}</div>}
          <Aparece retraso={0.08} className="flex min-w-0 flex-col justify-end">
            {accion()}
            {citaBreve()}
            {listaCifras(false, "mt-8")}
          </Aparece>
        </div>
      </div>,
    );
  }

  /* --- Retrato: la foto enmarcada en vertical y la primera cifra encima, como una insignia. --- */
  if (composicion === "retrato") {
    const [primera, ...otras] = cifras;
    return seccion(
      tono.franja,
      <div className={`${CONTENEDOR} grid gap-8 py-10 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] @3xl:items-center @3xl:gap-14 @3xl:py-20`}>
        <div className="relative @3xl:order-2">
          <div aria-hidden className={`absolute inset-0 translate-x-3 translate-y-3 rounded-[var(--radius-elevada)] ${enColor ? "bg-sobre-acento/20" : "bg-acento/25"}`} />
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-elevada)] @3xl:aspect-[4/5]">
            {imagen("(min-width: 768px) 42vw, 100vw")}
            {primera && (
              <div className="absolute bottom-3 left-3 rounded-2xl bg-fondo/90 px-4 py-3 text-tinta backdrop-blur-md">
                <span className="cifra-display block text-3xl leading-none">{primera.valor}</span>
                <span className="mt-1 block text-xs text-grafito">{primera.texto}</span>
              </div>
            )}
          </div>
        </div>
        <Aparece className="flex min-w-0 flex-col @3xl:order-1">
          {rotuloLinea()}
          <div className="mt-3">{titulo("medio")}</div>
          <div className="mt-5">{accion()}</div>
          {citaBreve()}
          {otras.length > 0 && (
            <dl className={`mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t pt-5 ${borde}`}>
              {otras.map((c) => (
                <div key={c.texto} className="flex min-w-0 flex-col-reverse gap-1">
                  <dt className={`text-sm leading-tight ${rotulo}`}>{c.texto}</dt>
                  <dd className="cifra-display text-4xl leading-none">{c.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </Aparece>
      </div>,
    );
  }

  /* --- Tarjeta: la foto a toda la franja y el texto en una tarjeta que flota encima. --- */
  if (composicion === "tarjeta") {
    return seccion(
      "bg-fondo",
      <>
        <div className="relative aspect-[4/3] @3xl:absolute @3xl:inset-0 @3xl:aspect-auto">
          {imagen("100vw", "-z-20")}
          <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-black/35 to-transparent @3xl:block" />
        </div>
        <div className={`${CONTENEDOR} -mt-16 flex pb-10 @3xl:mt-0 @3xl:min-h-[min(46rem,64cqi)] @3xl:items-end @3xl:py-14`}>
          <div
            style={oscura ? estilo : undefined}
            className={`w-full rounded-[var(--radius-elevada)] p-6 ring-1 ring-linea @xl:p-8 @3xl:max-w-xl ${tono.franja}`}
          >
            {completo({ tamano: "medio" })}
          </div>
        </div>
      </>,
      false,
    );
  }

  /* --- Testimonio: el mejor testimonio en grande junto al nombre. Sin testimonios, la foto enmarcada. --- */
  if (composicion === "testimonio") {
    return seccion(
      tono.franja,
      <div className={`${CONTENEDOR} grid gap-10 py-12 @3xl:grid-cols-2 @3xl:items-center @3xl:gap-14 @3xl:py-20`}>
        <Aparece className="flex min-w-0 flex-col">
          {/* Sin testimonio la foto va grande al lado: el avatar la repetiría. */}
          {destacado && avatar}
          {rotuloLinea()}
          <div className="mt-3">{titulo("medio")}</div>
          <div className="mt-5">{accion()}</div>
        </Aparece>
        <Aparece retraso={0.1} className="min-w-0">
          {destacado ? (
            <figure className={`rounded-[var(--radius-elevada)] p-7 @xl:p-9 ${relieve}`}>
              <Quote aria-hidden className={`size-8 ${enColor ? "" : "text-acento"}`} />
              {destacado.resultado.trim() && (
                <p className="titulo-display mt-5 text-[clamp(1.8rem,7cqi,2.8rem)] leading-[1.05] @3xl:text-[clamp(1.8rem,3.6cqi,2.8rem)]">
                  {destacado.resultado}
                </p>
              )}
              <blockquote className={`mt-4 line-clamp-6 text-lg leading-relaxed ${secundario}`}>{destacado.texto}</blockquote>
              <figcaption className="mt-6 text-sm font-medium">{destacado.nombre}</figcaption>
              {listaCifras(false, "mt-8")}
            </figure>
          ) : foto ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-elevada)] @3xl:aspect-[4/5]">{imagen("(min-width: 768px) 46vw, 100vw")}</div>
          ) : (
            listaCifras(false, "mt-0")
          )}
        </Aparece>
      </div>,
    );
  }

  /* --- Clásicas con foto: al lado (`izquierda`) o de fondo (`centrada`, `abajo`). --- */
  const centrada = composicion === "centrada";
  const dividida = composicion === "izquierda";
  const cajaFoto = dividida
    ? "relative aspect-[4/3] @3xl:absolute @3xl:inset-y-0 @3xl:right-0 @3xl:aspect-auto @3xl:w-[54%]"
    : "relative aspect-[4/3] @3xl:absolute @3xl:inset-0 @3xl:aspect-auto";
  /* Velo encima de la foto, solo en ancho cuando el texto va sobre ella. */
  const veloAncho = dividida
    ? `bg-gradient-to-r ${tono.desde} to-transparent to-35%`
    : centrada
      ? tono.velo
      : `bg-gradient-to-t ${tono.desde} ${tono.via} ${tono.hasta}`;

  return seccion(
    tono.franja,
    <>
      <div className={cajaFoto}>
        {imagen(dividida ? "(min-width: 768px) 54vw, 100vw" : "100vw", "-z-20")}
        {/* En estrecho: un borde que funde la foto con la franja de abajo. */}
        <div aria-hidden className={`absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t ${tono.desde} to-transparent @3xl:hidden`} />
        <div aria-hidden className={`absolute inset-0 -z-10 hidden @3xl:block ${veloAncho}`} />
      </div>
      <div
        className={`${CONTENEDOR} flex -mt-6 pb-10 @3xl:mt-0 @3xl:py-16 ${dividida ? "@3xl:min-h-[min(40rem,52cqi)]" : "@3xl:min-h-[min(46rem,64cqi)]"} ${
          centrada ? "justify-center @3xl:items-center" : composicion === "abajo" ? "@3xl:items-end" : "@3xl:items-center"
        }`}
      >
        {completo({ tamano: dividida ? "medio" : "grande", centro: centrada, clase: dividida ? "@3xl:max-w-[44%]" : "max-w-4xl" })}
      </div>
    </>,
  );
}
