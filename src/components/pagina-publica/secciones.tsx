import { ArrowUpRight, AtSign, Award, Gift, MessageCircle, Quote } from "lucide-react";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { enlaceWhatsapp, listaCertificaciones } from "@/lib/pagina-publica/contenido";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";

/*
  Secciones de la página pública. Cada una es su propio contenedor (@container): se ven bien a toda
  la fila o a media fila, en la página real y en la vista previa del editor, que es más estrecha.
*/

function Encabezado({ id, antetitulo, titulo, claro = false }: { id: string; antetitulo: string; titulo: string; claro?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-medium ${claro ? "text-white/70" : "text-tenue"}`}>{antetitulo}</p>
      <h2 id={id} className="titulo-display mt-2 text-[2rem] leading-[1.05] @xl:text-[2.6rem]">
        {titulo}
      </h2>
    </div>
  );
}

export function SobreMi({ datos }: { datos: PaginaPublica }) {
  const certificaciones = listaCertificaciones(datos.certificaciones);
  return (
    <section aria-labelledby="titulo-sobre" className="grid gap-8 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:gap-12">
      <Encabezado id="titulo-sobre" antetitulo="Quién soy" titulo="Sobre mí" />
      <div className="min-w-0">
        {datos.presentacion && (
          <p className="text-lg leading-relaxed whitespace-pre-line text-grafito @xl:text-xl @xl:leading-relaxed">{datos.presentacion}</p>
        )}
        {certificaciones.length > 0 && (
          <div className={datos.presentacion ? "mt-10" : ""}>
            <h3 className="text-sm font-medium text-tenue">Formación y certificaciones</h3>
            <ul className="mt-3 grid gap-x-8 @xl:grid-cols-2">
              {certificaciones.map((c) => (
                <li key={c} className="flex items-start gap-3 border-t border-linea py-3.5">
                  <Award aria-hidden className="mt-0.5 size-5 shrink-0 text-acento" />
                  <span className="min-w-0">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function Metodos({ datos }: { datos: PaginaPublica }) {
  const metodos = datos.metodos.filter((m) => m.titulo.trim());
  return (
    <section aria-labelledby="titulo-metodos">
      <Encabezado id="titulo-metodos" antetitulo="Mi método" titulo="Cómo trabajo" />
      <ol className={`mt-10 grid gap-x-8 gap-y-8 @xl:grid-cols-2 ${metodos.length % 3 === 0 ? "@4xl:grid-cols-3" : ""}`}>
        {metodos.map((m, i) => (
          <li key={i} className="min-w-0 border-t border-linea-fuerte/50 pt-5">
            <span aria-hidden className="cifra-display block text-[2.75rem] leading-none text-acento">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="titulo-display mt-5 text-xl leading-snug">{m.titulo}</h3>
            {m.descripcion && <p className="mt-2 leading-relaxed text-grafito">{m.descripcion}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Lo que dicen sus alumnos: la prueba social. El resultado, si lo hay, va primero y en grande. */
export function Testimonios({ datos }: { datos: PaginaPublica }) {
  const testimonios = datos.testimonios.filter((t) => t.nombre.trim() && t.texto.trim());
  return (
    <section aria-labelledby="titulo-testimonios">
      <Encabezado id="titulo-testimonios" antetitulo="Lo que dicen" titulo="Testimonios" />
      <ul className={`mt-10 grid gap-4 @xl:grid-cols-2 ${testimonios.length % 3 === 0 ? "@4xl:grid-cols-3" : ""}`}>
        {testimonios.map((t, i) => (
          <li key={i} className="min-w-0">
            <figure className="flex h-full flex-col rounded-[var(--radius-tarjeta)] bg-hueso/60 p-6">
              <Quote aria-hidden className="size-6 text-acento" />
              {t.resultado && <p className="titulo-display mt-4 text-xl leading-snug text-tinta">{t.resultado}</p>}
              <blockquote className="mt-3 leading-relaxed text-grafito">{t.texto}</blockquote>
              <figcaption className="mt-auto pt-5 text-sm font-medium">{t.nombre}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Equipo({ entrenadores }: { entrenadores: PaginaPublica["entrenadores"] }) {
  return (
    <section aria-labelledby="titulo-equipo">
      <Encabezado id="titulo-equipo" antetitulo="Quiénes te acompañan" titulo="El equipo" />
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 @xl:grid-cols-3 @4xl:grid-cols-4">
        {entrenadores.map((e) => (
          <li key={`${e.nombres} ${e.apellidos}`} className="flex min-w-0 flex-col items-start gap-3">
            <FotoPerfil url={e.avatar_url} nombres={e.nombres} apellidos={e.apellidos} tamano="xl" />
            <span className="min-w-0">
              <span className="block truncate font-medium">{e.nombres}</span>
              <span className="block truncate text-sm text-tenue">{e.apellidos}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Los tres pasos que siguen a la solicitud: quitan miedo a escribir. Con plazo de respuesta, lo promete. */
const pasos = (quien: string, horas: number | null) => [
  { titulo: "Envías tu solicitud", texto: "Te toma un par de minutos." },
  {
    titulo: `${quien} te contacta`,
    texto: horas ? `En menos de ${horas} ${horas === 1 ? "hora" : "horas"}, por correo o WhatsApp.` : "Por correo o WhatsApp, para conocerte.",
  },
  { titulo: "Arrancas con tu plan", texto: "Pensado para tu objetivo y tu horario." },
];

/**
 * El cierre: a un lado qué pasa después de escribir (y WhatsApp como atajo), al otro el formulario.
 * El panel oscuro (`bg-panel`) la distingue del resto de la página en los dos temas.
 */
export function Contacto({ datos, quien, formulario }: { datos: PaginaPublica; quien: string; formulario: React.ReactNode }) {
  const intro = `Deja tus datos y ${quien} se pondrá en contacto contigo. Si solo tienes una duda, también puedes escribir.`;
  return (
    <section
      id="empezar"
      aria-labelledby="titulo-empezar"
      className="-mx-5 grid scroll-mt-20 overflow-hidden bg-superficie ring-1 ring-linea @xl/pagina:mx-0 @xl/pagina:rounded-[var(--radius-elevada)] @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      {/* En el celular va debajo del formulario: primero lo que se busca (los campos), luego qué pasa después. */}
      <div className="order-2 bg-panel px-5 py-8 text-white @xl:p-9 @3xl:order-1">
        <div className="hidden @3xl:block">
          <Encabezado id="titulo-empezar-panel" antetitulo="Empecemos" titulo="Da el primer paso" claro />
          <p className="mt-4 text-white/80">{intro}</p>
        </div>
        {datos.oferta_inicial && (
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium @3xl:mt-5">
            <Gift aria-hidden className="size-4 shrink-0" /> <span className="min-w-0">{datos.oferta_inicial}</span>
          </p>
        )}
        <p className={`text-sm font-medium text-white/70 @3xl:hidden ${datos.oferta_inicial ? "mt-6" : ""}`}>Qué pasa después</p>
        <ol className="mt-4 space-y-5 @3xl:mt-8">
          {pasos(quien, datos.respuesta_horas).map((p, i) => (
            <li key={p.titulo} className="flex gap-4">
              <span aria-hidden className="cifra-display grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-base text-white">
                {i + 1}
              </span>
              <span className="min-w-0 pt-1">
                <span className="block font-medium">{p.titulo}</span>
                <span className="block text-sm text-white/70">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
        {(datos.whatsapp || datos.instagram) && (
          <div className="mt-9 border-t border-white/15 pt-6">
            <p className="text-sm text-white/70">¿Prefieres hablar ya?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {datos.whatsapp && (
                <a
                  href={enlaceWhatsapp(datos.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-sm font-semibold transition-colors hover:bg-white/10"
                >
                  <MessageCircle aria-hidden className="size-4" /> Escribir por WhatsApp
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              )}
              {datos.instagram && (
                <a
                  href={`https://instagram.com/${datos.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 min-w-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <AtSign aria-hidden className="size-4 shrink-0" /> <span className="truncate">{datos.instagram}</span>
                  <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
                  <span className="sr-only">en Instagram (se abre en otra pestaña)</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <div id="formulario" className="order-1 min-w-0 scroll-mt-20 px-5 py-8 @xl:p-9 @3xl:order-2">
        <div className="mb-6 @3xl:hidden">
          <Encabezado id="titulo-empezar" antetitulo="Empecemos" titulo="Da el primer paso" />
          <p className="mt-3 text-grafito">{intro}</p>
        </div>
        <p className="mb-5 text-sm text-tenue">Un minuto: solo lo necesario para contactarte.</p>
        {formulario}
      </div>
    </section>
  );
}
