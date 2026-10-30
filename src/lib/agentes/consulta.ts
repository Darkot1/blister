import "server-only";
import { AGENTES, LIDER, agentePorId, type Agente } from "./catalogo";
import { ENTREGABLES, type CasoJunta, type Encargo, type EjercicioFaltante, type Entregable, type PasoPlan, type RutinaPropuesta } from "./juntas";
import { completar, extraerJson } from "./openrouter";

/** Lo que un agente devuelve en la junta. */
export type Respuesta = { hallazgo: string; detalle: string; accion: string };

/** Un ejercicio de la biblioteca, para que Rutinas elija solo entre ellos. */
export type EjercicioCatalogo = { id: string; nombre: string };

const REGLAS = [
  "Trabajas en Blister, una app para entrenadores personales. Responde siempre en español neutro, claro y concreto.",
  "Le hablas al entrenador de tú (nunca 'propón al entrenador'). Sugieres; el entrenador decide.",
  "No des diagnósticos médicos: si hay dolor o lesión, recomienda consultar a un profesional de la salud.",
  "Cíñete a los datos que te dan; no inventes cifras que no estén en ellos. Si falta un dato importante, dilo.",
  "Las cifras de tu criterio son referencias generales, no datos del alumno: no las presentes como si fueran suyas.",
].join(" ");

/** Cuál agente lleva cada tipo de pedido (se usa si el líder no lo incluye). */
const PRINCIPAL_DE: Record<Entregable, string> = {
  rutina: "rutinas",
  cargas: "cargas",
  agenda: "agenda",
  mensaje: "coach",
  diagnostico: "progreso",
};

/** Personalidad de cada agente a partir del catálogo: rol, habilidades y forma de trabajar. */
const presentacion = (a: Agente) =>
  `Eres «${a.nombre}», el agente de ${a.rol.toLowerCase()}. ${a.descripcion} Tus habilidades: ${a.habilidades.join(", ")}. Tu forma de trabajar: ${a.cualidad.toLowerCase()}. Tu criterio profesional, que aplicas a los datos: ${a.criterio.join(" ")}`;

const recortar = (texto: unknown, max: number) => (typeof texto === "string" ? texto.trim().slice(0, max) : "");
const numeroO = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Palabras de gimnasio que los modelos suelen dejar en inglés aunque se les pidan los nombres de la
 * biblioteca («Plank frontal» por «Plancha frontal»). Se traducen antes de comparar.
 */
const INGLES: [RegExp, string][] = [
  [/^planks?$/g, "plancha frontal"],
  [/\bplanks?\b/g, "plancha"],
  [/\bromanian\b/g, "rumano"],
  [/\bmountain climbers?\b/g, "escaladores"],
  [/\bjumping jacks?\b/g, "saltos de tijera"],
  [/\bleg press\b/g, "prensa de piernas"],
  [/\blat pull ?downs?\b/g, "jalon al pecho"],
  [/\bfarmers? walk\b/g, "paseo del granjero"],
  [/\bbox jumps?\b/g, "saltos al cajon"],
  [/\bstep ?ups?\b/g, "subida al cajon"],
  [/\bcat cow\b/g, "gato camello"],
  [/\bkettlebell swings?\b/g, "swing con kettlebell"],
  [/\bside\b/g, "lateral"],
  [/\bfront(al)?\b/g, "frontal"],
  [/\bsquats?\b/g, "sentadilla"],
  [/\bdeadlifts?\b/g, "peso muerto"],
  [/\brows?\b/g, "remo"],
  [/\blunges?\b/g, "zancada"],
  [/\bpush ?ups?\b/g, "flexiones"],
  [/\bpull ?ups?\b/g, "dominadas"],
  [/\bchin ?ups?\b/g, "dominadas supinas"],
  [/\bcrunch(es)?\b/g, "crunch"],
  [/\bbench\b/g, "banca"],
  [/\bdumbbells?\b/g, "mancuerna"],
  [/\bbarbell\b/g, "barra"],
  [/\bcable\b/g, "polea"],
  [/\bcalf raises?\b/g, "elevacion de talones"],
  [/\bglute bridge\b/g, "puente de gluteo"],
  [/\bstretch(ing)?\b/g, "estiramiento"],
];

/** Palabras que no distinguen un ejercicio de otro al comparar. */
const VACIAS = new Set(["de", "con", "en", "a", "al", "la", "el", "los", "las", "y", "por", "para", "una", "un"]);

const palabras = (t: string) => {
  let n = normalizar(t);
  for (const [patron, es] of INGLES) n = n.replace(patron, es);
  return new Set(n.split(" ").filter((p) => p && !VACIAS.has(p)));
};

/* ---------- Reparto ---------- */

/**
 * El líder lee el caso y decide qué se pidió (el entregable), quién lo lleva (el principal, primero en
 * la lista) y qué le pide a cada agente presente (como mucho un encargo por agente; los demás apoyan).
 * Si su respuesta no sirve, el principal según el pedido revisa el caso y el resto su especialidad.
 */
export async function repartir(
  pedido: string,
  contexto: string,
  presentes: Agente[],
): Promise<{ titulo: string; entregable: Entregable; encargos: Encargo[] }> {
  const equipo = presentes.map((a) => `- ${a.id}: ${a.rol}. Habilidades: ${a.habilidades.join(", ")}.`).join("\n");
  const { texto } = await completar(
    [
      { role: "system", content: `${presentacion(LIDER)} ${REGLAS}` },
      {
        role: "user",
        content: [
          `El entrenador pide: «${pedido}»`,
          "",
          `Contexto:\n${contexto}`,
          "",
          "Tu equipo presente (id: rol):",
          equipo,
          "",
          `1. Decide qué se pide, con una de estas palabras: ${ENTREGABLES.join(", ")} (rutina = diseñar o rehacer una rutina; cargas = pesos y progresión; agenda = horarios y constancia; mensaje = qué decirle al alumno; diagnostico = entender qué pasa).`,
          "2. Elige al agente principal para eso (va primero) y, si hace falta, a otros que apoyen con algo concreto. No uses a todos por usar.",
          "3. Lo que pidió el entrenador es lo más importante: no lo cambies por otro tema.",
          'Responde SOLO con un objeto JSON: {"titulo": "el caso en menos de 6 palabras", "entregable": "rutina", "encargos": [{"agente": "id", "titulo": "2 o 3 palabras", "tarea": "lo que le pides, en una frase"}]}',
        ].join("\n"),
      },
    ],
    { maxTokens: 1500, json: true },
  );
  const json = extraerJson(texto);
  const entregable = ENTREGABLES.includes(json?.entregable as Entregable) ? (json!.entregable as Entregable) : "diagnostico";
  const ids = new Set(presentes.map((a) => a.id));
  const usados = new Set<string>();
  const encargos: Encargo[] = [];
  for (const e of Array.isArray(json?.encargos) ? (json.encargos as Record<string, unknown>[]) : []) {
    const agente = typeof e?.agente === "string" ? e.agente.trim().toLowerCase() : "";
    const tarea = recortar(e?.tarea, 300);
    if (!ids.has(agente) || usados.has(agente) || !tarea) continue;
    usados.add(agente);
    encargos.push({ agente, titulo: recortar(e.titulo, 30) || agentePorId(agente)!.habilidades[0], tarea, hallazgo: "", accion: "" });
  }

  // El principal del pedido, si está sentado, va siempre y primero (aunque el líder lo olvide).
  const principal = PRINCIPAL_DE[entregable];
  if (ids.has(principal) && !usados.has(principal)) {
    encargos.unshift({ agente: principal, titulo: "Lo que se pidió", tarea: pedido, hallazgo: "", accion: "" });
  }
  encargos.sort((a, b) => Number(b.agente === principal) - Number(a.agente === principal));

  const finales = encargos.length
    ? encargos
    : presentes.map((a) => ({ agente: a.id, titulo: a.habilidades[0], tarea: `Revisa el caso desde tu especialidad: ${a.rol.toLowerCase()}.`, hallazgo: "", accion: "" }));
  return { titulo: recortar(json?.titulo, 60) || "Junta", entregable, encargos: finales };
}

/* ---------- Respuesta de cada agente ---------- */

/**
 * Un agente revisa su parte del caso y devuelve un resumen corto (lo que se lee en la junta), su
 * respuesta completa y una acción concreta.
 */
export async function consultarEncargo(caso: CasoJunta, encargo: Encargo): Promise<Respuesta & { modelo: string }> {
  const agente = agentePorId(encargo.agente)!;
  const { texto, modelo } = await completar(
    [
      { role: "system", content: `${presentacion(agente)} ${REGLAS}` },
      {
        role: "user",
        content: [
          `Contexto:\n${caso.contexto}`,
          "",
          `El líder te pide: ${encargo.tarea}`,
          "Usa la situación y, si lo hay, el expediente del alumno; mira sobre todo lo que toca a tu especialidad.",
          "Aplica tu criterio a los datos: apoya cada conclusión en un dato del expediente (con su cifra y su fecha) y, si el dato que necesitas no está, dilo en vez de suponerlo.",
          "",
          'Responde SOLO con un objeto JSON: {"resumen": "tu conclusión en una o dos frases, con la cifra que la sostiene si la hay", "detalle": "tu respuesta completa: qué ves en los datos, qué regla de tu criterio aplicas y por qué (hasta unas 8 frases)", "accion": "una acción concreta para el entrenador, en una frase, con cuándo hacerla y números si los datos los respaldan"}',
        ].join("\n"),
      },
    ],
    { maxTokens: 2500, json: true },
  );
  const json = extraerJson(texto);
  return {
    hallazgo: recortar(json?.resumen, 500) || recortar(texto, 500),
    detalle: recortar(json?.detalle, 3000),
    accion: recortar(json?.accion, 500) || encargo.accion,
    modelo,
  };
}

/**
 * Rutinas diseña la rutina pedida eligiendo SOLO ejercicios de la biblioteca: el servidor los enlaza
 * por nombre para poder crearla como borrador en el constructor. Lo que no encaje se informa aparte.
 */
export async function disenarRutina(
  caso: CasoJunta,
  encargo: Encargo,
  catalogo: EjercicioCatalogo[],
): Promise<Respuesta & { modelo: string; rutina: RutinaPropuesta | null }> {
  const agente = agentePorId("rutinas")!;
  const { texto, modelo } = await completar(
    [
      { role: "system", content: `${presentacion(agente)} ${REGLAS}` },
      {
        role: "user",
        content: [
          `Contexto:\n${caso.contexto}`,
          "",
          `El líder te pide: ${encargo.tarea}`,
          "Diseña la rutina completa. Si el alumno ya tiene una, mejórala (no la ignores). Ten en cuenta su objetivo, sus lesiones o molestias, su constancia y cuántos días entrena de verdad. Si no sabes su nivel o su equipamiento, dilo en el detalle y explica qué supusiste.",
          "Usa SOLO ejercicios de esta biblioteca, con el nombre exacto:",
          catalogo.map((e) => e.nombre).join("; "),
          "",
          'Responde SOLO con un objeto JSON: {"resumen": "la idea de la rutina en una o dos frases", "detalle": "por qué está armada así (hasta unas 6 frases)", "accion": "qué hacer con ella, en una frase", "rutina": {"nombre": "nombre corto", "descripcion": "objetivo y frecuencia", "dias": [{"nombre": "Día A · Torso", "ejercicios": [{"nombre": "nombre exacto de la biblioteca", "series": 3, "repeticiones": "8-10", "rir": 2, "descanso": 90}]}]}}',
          "Entre 2 y 6 días, de 4 a 8 ejercicios por día. descanso en segundos.",
        ].join("\n"),
      },
    ],
    { maxTokens: 4000, json: true, esperaMs: 120_000 },
  );
  const json = extraerJson(texto);
  return {
    hallazgo: recortar(json?.resumen, 500) || recortar(texto, 500),
    detalle: recortar(json?.detalle, 3000),
    accion: recortar(json?.accion, 500) || "Revisa la rutina propuesta y créala como borrador si te sirve.",
    modelo,
    rutina: enlazarRutina(json?.rutina, catalogo),
  };
}

/**
 * De lo que propuso el modelo a una rutina con ejercicios de la biblioteca: por nombre (sin tildes ni
 * mayúsculas), luego contenido uno en otro y, por último, por palabras en común (con el inglés traducido).
 */
function enlazarRutina(valor: unknown, catalogo: EjercicioCatalogo[]): RutinaPropuesta | null {
  const r = valor as { nombre?: unknown; descripcion?: unknown; dias?: unknown } | undefined;
  if (!r || !Array.isArray(r.dias)) return null;
  const porNombre = new Map(catalogo.map((e) => [normalizar(e.nombre), e]));
  const conPalabras = catalogo.map((e) => ({ e, p: palabras(e.nombre) }));
  const buscar = (nombre: string) => {
    const clave = normalizar(nombre);
    if (porNombre.has(clave)) return porNombre.get(clave)!;
    // Nombre parecido: el de la biblioteca que lo contiene (o al revés), el más corto.
    const candidatos = catalogo.filter((e) => {
      const n = normalizar(e.nombre);
      return clave.length > 4 && (n.includes(clave) || clave.includes(n));
    });
    if (candidatos.length) return candidatos.sort((a, b) => a.nombre.length - b.nombre.length)[0];
    // Por palabras: todas las del propuesto están en el de la biblioteca (o casi), y gana el que menos
    // sobra. Con empate («Sentadilla con barra»: ¿frontal o trasera?) no se adivina.
    const buscadas = palabras(nombre);
    if (!buscadas.size) return null;
    const [mejor, segundo] = conPalabras
      .map(({ e, p }) => {
        const comunes = [...buscadas].filter((x) => p.has(x)).length;
        return { e, puntaje: comunes / Math.max(buscadas.size, p.size), cubre: comunes / buscadas.size };
      })
      .filter((c) => c.cubre >= 0.75 && c.puntaje >= 0.5)
      .sort((a, b) => b.puntaje - a.puntaje);
    return mejor && mejor.puntaje !== segundo?.puntaje ? mejor.e : null;
  };

  const descartados: string[] = [];
  const faltantes: EjercicioFaltante[] = [];
  const dias = (r.dias as Record<string, unknown>[]).slice(0, 7).flatMap((d, i) => {
    const nombreDia = recortar(d?.nombre, 60) || `Día ${i + 1}`;
    const ejercicios = (Array.isArray(d?.ejercicios) ? (d.ejercicios as Record<string, unknown>[]) : []).slice(0, 12).flatMap((e) => {
      const nombre = recortar(e?.nombre, 120);
      const hallado = nombre ? buscar(nombre) : null;
      if (!hallado) {
        if (nombre) {
          descartados.push(nombre);
          const series = numeroO(e.series, 1, 20);
          faltantes.push({
            nombre,
            dia: nombreDia,
            prescripcion: [series ? `${Math.round(series)}×${recortar(String(e.repeticiones ?? ""), 20) || "?"}` : null, numeroO(e.rir, 0, 10) !== null ? `RIR ${numeroO(e.rir, 0, 10)}` : null]
              .filter(Boolean)
              .join(" · "),
          });
        }
        return [];
      }
      const series = numeroO(e.series, 1, 20);
      const rir = numeroO(e.rir, 0, 10);
      const descanso = numeroO(e.descanso, 0, 900);
      return [
        {
          ejercicioId: hallado.id,
          nombre: hallado.nombre,
          series: series === null ? null : Math.round(series),
          repeticiones: recortar(String(e.repeticiones ?? ""), 20) || null,
          rir,
          descanso: descanso === null ? null : Math.round(descanso),
          notas: recortar(e.notas, 300) || null,
        },
      ];
    });
    return ejercicios.length ? [{ nombre: nombreDia, ejercicios }] : [];
  });
  if (!dias.length) return null;
  return {
    nombre: recortar(r.nombre, 80) || "Rutina propuesta",
    descripcion: recortar(r.descripcion, 600),
    dias,
    descartados: [...new Set(descartados)],
    faltantes,
  };
}

/* ---------- Decisión del líder ---------- */

const CUANDO = new Set<PasoPlan["cuando"]>(["hoy", "semana", "despues"]);

/**
 * El líder cruza lo que devolvió el equipo y propone una decisión: responde a lo que se pidió, resuelve
 * las contradicciones (elige y dice por qué), ordena el plan en el tiempo y separa sus preguntas.
 */
export async function decidir(
  caso: CasoJunta,
  pedido: string,
  respuestas: { encargo: Encargo; respuesta: Respuesta }[],
): Promise<CasoJunta["decision"]> {
  const informe = respuestas
    .map(({ encargo, respuesta }) => `- ${agentePorId(encargo.agente)!.nombre}: ${respuesta.hallazgo} ${respuesta.detalle} Propone: ${respuesta.accion}`)
    .join("\n");
  const { texto } = await completar(
    [
      { role: "system", content: `${presentacion(LIDER)} ${REGLAS}` },
      {
        role: "user",
        content: [
          `El entrenador pidió: «${pedido}»${caso.rutina ? " (el equipo ya armó la rutina: preséntala como la respuesta principal)" : ""}`,
          "",
          `Contexto:\n${caso.contexto}`,
          "",
          "Esto te devolvió el equipo:",
          informe,
          "",
          "Propón una decisión que responda a lo que se pidió. Si dos agentes se contradicen, elige una postura y di por qué en el resumen; no pongas las dos.",
          "Ordena el plan en el tiempo, como mucho 5 pasos. Lo que necesitas preguntarle al entrenador va aparte, no como paso.",
          'Responde SOLO con un objeto JSON: {"titulo": "la decisión en menos de 10 palabras", "resumen": "por qué, en dos o tres frases", "pasos": [{"cuando": "hoy | semana | despues", "texto": "qué hacer"}], "preguntas": ["lo que te falta saber del alumno"]}',
        ].join("\n"),
      },
    ],
    { maxTokens: 2000, json: true },
  );
  const json = extraerJson(texto);
  const pasos = (Array.isArray(json?.pasos) ? (json.pasos as Record<string, unknown>[]) : [])
    .flatMap((p) => {
      const textoPaso = recortar(p?.texto, 400);
      const cuando = CUANDO.has(p?.cuando as PasoPlan["cuando"]) ? (p!.cuando as PasoPlan["cuando"]) : "semana";
      return textoPaso ? [{ cuando, texto: textoPaso }] : [];
    })
    .slice(0, 6);
  const preguntas = (Array.isArray(json?.preguntas) ? (json.preguntas as unknown[]) : []).map((p) => recortar(p, 300)).filter(Boolean).slice(0, 4);
  return {
    titulo: recortar(json?.titulo, 120) || caso.decision.titulo || "Propuesta del líder",
    resumen: recortar(json?.resumen, 700) || recortar(texto, 700) || caso.decision.resumen,
    pasos,
    preguntas,
  };
}

/* ---------- Pregunta directa ---------- */

/**
 * Pregunta directa a un agente (o al líder) desde su panel. Con `expediente` (de `expedienteAlumno`,
 * sin nombre ni contacto), responde con los datos de ese alumno.
 */
export async function responder(agenteId: string, pregunta: string, expediente: string | null = null): Promise<{ texto: string; modelo: string }> {
  const agente = agentePorId(agenteId) ?? AGENTES[0];
  const { texto, modelo } = await completar(
    [
      { role: "system", content: `${presentacion(agente)} ${REGLAS} Responde en un máximo de 6 frases, sin listas largas.` },
      {
        role: "user",
        content: expediente
          ? `Pregunta sobre un alumno: ${pregunta}\n\nExpediente del alumno (datos de la app):\n${expediente}\n\nResponde con estos datos, desde tu especialidad.`
          : pregunta,
      },
    ],
    { maxTokens: 2000 },
  );
  return { texto: texto.slice(0, 2000), modelo };
}

/** Aplica `tarea` a cada elemento de dos en dos (los modelos gratuitos se saturan con muchas a la vez), en orden. */
export async function deADos<T, R>(lista: T[], tarea: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < lista.length; i += 2) resultados.push(...(await Promise.all(lista.slice(i, i + 2).map(tarea))));
  return resultados;
}
