import { ArrowDown } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { AlVerse } from "@/components/ui/movimiento";
import { listaCertificaciones, nombrePublico, normalizarDiseno, textoSobre, urlFoto, type Seccion } from "@/lib/pagina-publica/contenido";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";
import { BarraMovil } from "./barra-movil";
import { Portada, type Cifra } from "./portada";
import { Contacto, Equipo, Metodos, SobreMi, Testimonios } from "./secciones";

/**
 * La página pública de un espacio, armada como una landing: portada con el nombre en grande, franjas
 * de fondo alterno para cada sección y un cierre con el formulario. La usan /e/<slug> y la vista
 * previa del editor, así que lo que se edita es exactamente lo que se publica.
 *
 * Todo se adapta a su contenedor (`@container`), no a la ventana: la vista previa del editor, más
 * estrecha, se ve como se verá en un celular o en un computador según su ancho real.
 *
 * El diseño (orden, ancho y visibilidad de secciones, color, estilo y tono de portada, texto del botón)
 * viene de `datos.diseno`; cada sección sale solo si tiene contenido.
 */
export function VistaPaginaPublica({
  datos: recibidos,
  formulario,
  extremo,
  barraMovil = false,
}: {
  datos: PaginaPublica;
  formulario: React.ReactNode;
  /** Algo más en la cabecera, a la derecha (el cambio de tema en la página real). */
  extremo?: React.ReactNode;
  /** Botón fijo abajo en el celular hacia el formulario (solo en la página real, no en la vista previa). */
  barraMovil?: boolean;
}) {
  // Lo nuevo puede faltar si la base aún no tiene sus columnas: se lee como vacío.
  const datos: PaginaPublica = {
    ...recibidos,
    testimonios: recibidos.testimonios ?? [],
    respuesta_horas: recibidos.respuesta_horas ?? null,
    oferta_inicial: recibidos.oferta_inicial ?? null,
  };
  const diseno = normalizarDiseno(datos.diseno);
  const nombre = nombrePublico(datos.entrenadores);
  const quien = datos.entrenadores[0]?.nombres || "tu entrenador";
  const certificaciones = listaCertificaciones(datos.certificaciones);

  // El color elegido reemplaza al cobalto en toda la página (botones, números, detalles).
  const estilo = {
    "--acento": diseno.acento,
    // Con un color claro el texto encima va oscuro, y el hover oscurece en vez de aclarar.
    "--sobre-acento": textoSobre(diseno.acento),
    "--acento-hover": `color-mix(in oklab, ${diseno.acento} 85%, ${textoSobre(diseno.acento) === "#ffffff" ? "white" : "black"})`,
    // Texto sobre un botón invertido (fondo `sobre-acento`): siempre el contrario, nunca el acento.
    "--contra-acento": textoSobre(diseno.acento) === "#ffffff" ? "#12121b" : "#ffffff",
  } as React.CSSProperties;

  // Prueba rápida bajo el botón de la portada: solo cifras reales que el entrenador escribió.
  const cifras: Cifra[] = [
    datos.experiencia_anos ? { valor: String(datos.experiencia_anos), texto: datos.experiencia_anos === 1 ? "año de experiencia" : "años de experiencia" } : null,
    certificaciones.length ? { valor: String(certificaciones.length), texto: certificaciones.length === 1 ? "certificación" : "certificaciones" } : null,
    datos.entrenadores.length > 1 ? { valor: String(datos.entrenadores.length), texto: "entrenadores" } : null,
  ].filter((c) => c !== null);

  const contenido: Record<Seccion, React.ReactNode> = {
    sobre: <SobreMi datos={datos} />,
    metodos: <Metodos datos={datos} />,
    testimonios: <Testimonios datos={datos} />,
    equipo: <Equipo entrenadores={datos.entrenadores} />,
    contacto: <Contacto datos={datos} quien={quien} formulario={formulario} />,
  };
  const tieneContenido: Record<Seccion, boolean> = {
    sobre: Boolean(datos.presentacion) || certificaciones.length > 0,
    metodos: datos.metodos.some((m) => m.titulo.trim()),
    testimonios: datos.testimonios.some((t) => t.nombre.trim() && t.texto.trim()),
    // Con un solo entrenador, "el equipo" repetiría la portada.
    equipo: datos.entrenadores.length > 1,
    contacto: true,
  };
  // El formulario no se oculta ni se mueve: va siempre al final, solo y a todo el ancho, para que quien
  // baja buscándolo lo encuentre (a media columna y a mitad de página pasaba de largo).
  const secciones = diseno.secciones.filter((s) => s.id !== "contacto" && s.visible && tieneContenido[s.id]);

  // Franjas: cada sección ocupa la suya, salvo dos "mitad" seguidas, que comparten franja lado a lado.
  const franjas: (typeof secciones)[] = [];
  for (const s of secciones) {
    const ultima = franjas.at(-1);
    if (s.ancho === "mitad" && ultima?.length === 1 && ultima[0].ancho === "mitad") ultima.push(s);
    else franjas.push([s]);
  }
  franjas.push([{ id: "contacto", ancho: "completo", visible: true }]);

  // Un recordatorio a mitad de página, para quien ya se convenció antes de llegar al final: va antes de
  // la tercera franja, si quedan al menos dos más (la última es el formulario).
  const indiceLlamada = franjas.length >= 4 ? 2 : -1;

  return (
    <div style={estilo} className="@container/pagina min-w-0 bg-fondo text-tinta">
      <header className="sticky top-0 z-30 border-b border-linea bg-fondo/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 @3xl:px-10">
          <a href="#portada" className="titulo-display min-w-0 truncate text-lg">
            {nombre}
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {extremo}
            <a
              href="#empezar"
              className="hidden h-10 items-center rounded-full bg-acento px-5 text-sm font-semibold text-sobre-acento transition-colors hover:bg-acento-hover @lg:inline-flex"
            >
              {diseno.boton}
            </a>
          </div>
        </div>
      </header>

      <Portada datos={datos} diseno={diseno} nombre={nombre} foto={urlFoto(datos.foto_ruta)} cifras={cifras} estilo={estilo} />

      {franjas.map((franja, i) => (
        <div key={franja.map((s) => s.id).join("-")}>
          {i === indiceLlamada && <Llamada boton={diseno.boton} oferta={datos.oferta_inicial} horas={datos.respuesta_horas} quien={quien} />}
          <Franja par={i % 2 === 1} pegada={franja.length === 1 && franja[0].id === "contacto"}>
            <div className={`grid gap-14 ${franja.length === 2 ? "@4xl:grid-cols-2 @4xl:gap-12" : ""}`}>
              {franja.map((s, j) => (
                <AlVerse key={s.id} retraso={j * 0.08} className="@container min-w-0">
                  {contenido[s.id]}
                </AlVerse>
              ))}
            </div>
          </Franja>
        </div>
      ))}

      <footer className={`border-t border-linea ${barraMovil ? "pb-24 md:pb-0" : ""}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-tenue @3xl:px-10">
          <p className="min-w-0 truncate">{nombre}</p>
          <p className="flex items-center gap-2">
            Con la tecnología de <Marca className="origin-right scale-90" />
          </p>
        </div>
      </footer>

      {barraMovil && <BarraMovil texto={diseno.boton} whatsapp={datos.whatsapp} />}
    </div>
  );
}

/** Una franja de la página a todo el ancho; las pares van un paso más claras para marcar el ritmo. */
function Franja({ par, pegada = false, children }: { par: boolean; pegada?: boolean; children: React.ReactNode }) {
  // `pegada`: el formulario solo; en el celular va de borde a borde, sin margen arriba ni abajo.
  return (
    <div className={par ? "bg-superficie" : "bg-fondo"}>
      <div className={`mx-auto w-full max-w-6xl px-5 @3xl/pagina:px-10 @3xl/pagina:py-24 ${pegada ? "py-0 @xl/pagina:py-16" : "py-16"}`}>{children}</div>
    </div>
  );
}

/** Franja de color con el botón otra vez: la oferta (o una invitación) y cuándo responde. */
function Llamada({ boton, oferta, horas, quien }: { boton: string; oferta: string | null; horas: number | null; quien: string }) {
  return (
    <div id="llamada" className="bg-acento text-sobre-acento">
      <AlVerse className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-5 py-12 @3xl/pagina:flex-row @3xl/pagina:items-center @3xl/pagina:justify-between @3xl/pagina:px-10">
        <div className="min-w-0">
          <p className="titulo-display text-2xl leading-tight @xl/pagina:text-3xl">{oferta || `¿Empezamos? ${quien} te espera.`}</p>
          <p className="mt-2 text-lg">
            {horas ? `Escribe hoy y te responde en menos de ${horas} horas.` : "Escribe hoy, sin compromiso."}
          </p>
        </div>
        <a
          href="#empezar"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-sobre-acento px-6 text-[0.95rem] font-semibold text-[var(--contra-acento)] transition-opacity hover:opacity-90"
        >
          {boton} <ArrowDown aria-hidden className="size-4" />
        </a>
      </AlVerse>
    </div>
  );
}
