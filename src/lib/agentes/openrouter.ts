import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Cliente mínimo de los agentes: Groq primero, después OpenRouter y Gemini (formato chat completions).
 *
 * Groq (GROQ_API_KEY, plan gratuito: cuota diaria por modelo; no guarda prompts por defecto) va primero:
 * es muy rápido y sus modelos de producción no se saturan como los gratuitos de OpenRouter.
 *
 * Después, OpenRouter (solo servidor, con la clave secreta OPENROUTER_API_KEY). Solo modelos gratuitos (`:free`), nunca de pago: los que OpenRouter ofrece en
 * ese momento (su API pública), con los preferidos de OPENROUTER_MODELOS primero. Plan gratis: 50
 * peticiones al día (1.000 con 10 créditos comprados).
 *
 * Si uno está saturado, responde vacío o falla, se prueba el siguiente (el respaldo propio de OpenRouter
 * con `models` no salta cuando un gratuito está saturado). No se usa "openrouter/free": elige al azar
 * entre todos los gratuitos, incluidos clasificadores de seguridad y modelos de código que no conversan.
 *
 * Último respaldo: Gemini de Google AI Studio (GEMINI_API_KEY, plan gratuito sin facturación). Sin facturación,
 * al pasarse del límite Groq y Gemini responden 429 y no cobran. Los dos tienen endpoint compatible con el
 * mismo formato de chat.
 */

const URL_API = "https://openrouter.ai/api/v1/chat/completions";
const URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
/** Groq (modelos de producción, se prueban primero), cada uno con su propia cuota diaria del plan gratuito. */
const GROQ_POR_DEFECTO = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"];
/**
 * Gemini de respaldo, cada uno con su propia cuota del plan gratuito. Primero los Flash (responden mejor,
 * pero 20 consultas al día: 2 o 3 juntas cada uno); agotados, su 429 llega al instante y siguen los
 * Flash Lite (500 al día cada uno). Sin gemini-3.8-flash: suele estar saturado y tarda en fallar.
 */
const GEMINI_POR_DEFECTO = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
/** Gratuitos que conversan bien en español: se prueban primero (si siguen siendo gratis). */
const PREFERIDOS_POR_DEFECTO = ["nvidia/nemotron-3-ultra-550b-a55b:free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free"];
/** Gratuitos que no sirven para conversar: clasificadores, modelos de código, embeddings y muy pequeños. */
const NO_CONVERSAN = /safety|guard|moderation|code|coder|embed|laguna|lfm-/i;
/** Gratuitos por pregunta: cada intento, aunque falle, gasta una de las peticiones gratuitas del día. */
const MAX_GRATIS = 3;
/** Un agente lento no debe dejar la junta colgada (diseñar una rutina pide más: ver `esperaMs`). */
const ESPERA_MAXIMA_MS = 75_000;
/** Margen para responder al entrenador antes de que la plataforma corte la función. */
const MARGEN_MS = 5_000;
/** Fallos que se arreglan probando otro modelo; los demás (clave, red) no. */
const PASAR_AL_SIGUIENTE = new Set(["saturado", "vacio", "proveedor"]);

const lista = (variable: string | undefined, porDefecto: string[]) => {
  const valores = (variable ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return valores.length ? valores : porDefecto;
};
/** Solo `:free`: un modelo de pago puesto por error en OPENROUTER_MODELOS se ignora (nunca se cobra). */
const modelosGroq = () => (process.env.GROQ_API_KEY ? lista(process.env.GROQ_MODELOS, GROQ_POR_DEFECTO) : []);
const modelosGemini = () => (process.env.GEMINI_API_KEY ? lista(process.env.GEMINI_MODELOS, GEMINI_POR_DEFECTO) : []);
const preferidos = () => lista(process.env.OPENROUTER_MODELOS, PREFERIDOS_POR_DEFECTO).filter((m) => m.endsWith(":free"));

/** Lista de gratuitos en memoria (una hora): la consulta a OpenRouter no se repite en cada pregunta. */
let enMemoria: { modelos: string[]; hasta: number } | null = null;
/** Con la cuota gratuita del día agotada, no se vuelve a intentar con gratuitos hasta su reinicio. */
let gratisAgotados: { hasta: number; hora: string | null } | null = null;

/** Los gratuitos disponibles ahora que conversan, con los preferidos primero. Si la lista no carga, los preferidos. */
export async function modelosGratis(): Promise<string[]> {
  if (enMemoria && enMemoria.hasta > Date.now()) return enMemoria.modelos;
  try {
    const respuesta = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(8_000), cache: "no-store" });
    if (!respuesta.ok) throw new Error();
    const { data } = (await respuesta.json()) as { data: { id: string; context_length?: number }[] };
    const libres = data
      .filter((m) => m.id.endsWith(":free") && !NO_CONVERSAN.test(m.id))
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => m.id);
    const disponibles = new Set(libres);
    const modelos = [...preferidos().filter((m) => disponibles.has(m)), ...libres.filter((m) => !preferidos().includes(m))];
    if (!modelos.length) throw new Error();
    enMemoria = { modelos, hasta: Date.now() + 3_600_000 };
    return modelos;
  } catch {
    return preferidos();
  }
}

export type Mensaje = { role: "system" | "user" | "assistant"; content: string };

/** Por qué falló: decide el mensaje que ve el entrenador. */
export class ErrorAgentes extends Error {
  constructor(
    readonly motivo: "sin_clave" | "limite" | "saturado" | "vacio" | "clave" | "proveedor" | "red",
    mensaje: string,
    /** Con la cuota diaria agotada: a qué hora (Colombia) se reinicia. */
    readonly reinicio: string | null = null,
    /** El mismo reinicio en milisegundos, para no reintentar antes. */
    readonly reinicioMs: number | null = null,
  ) {
    super(mensaje);
  }
}

/** Hora límite (ms) de la operación en curso: una junta entera no puede pasarse de su plazo. */
const plazo = new AsyncLocalStorage<number>();

/** Corre `fn` con un tope total: los modelos que falten por probar se saltan al acercarse el límite. */
export const conPlazo = <T>(ms: number, fn: () => Promise<T>) => plazo.run(Date.now() + ms, fn);

export const agentesConfigurados = () => Boolean(process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

type Proveedor = "openrouter" | "groq" | "gemini";

const URLS: Record<Proveedor, string> = { openrouter: URL_API, groq: URL_GROQ, gemini: URL_GEMINI };
const CLAVES: Record<Proveedor, string> = { openrouter: "OPENROUTER_API_KEY", groq: "GROQ_API_KEY", gemini: "GEMINI_API_KEY" };

/**
 * Una respuesta de texto del modelo, con el nombre del modelo que la dio. Prueba los modelos de
 * Groq, después los gratuitos de OpenRouter en orden y por último Gemini (ver arriba). `maxTokens` deja margen: algunos modelos razonan antes de responder y ese
 * razonamiento también cuenta (lo que se guarda se recorta después).
 */
export async function completar(
  mensajes: Mensaje[],
  opciones: {
    maxTokens?: number;
    /** Exige un objeto JSON en la respuesta; si no viene, se prueba otro modelo. */
    json?: boolean;
    /** Cuánto esperar a cada modelo antes de pasar al siguiente. */
    esperaMs?: number;
  } = {},
): Promise<{ texto: string; modelo: string }> {
  if (gratisAgotados && gratisAgotados.hasta <= Date.now()) gratisAgotados = null;
  // Cuota del día agotada: no se gasta tiempo en peticiones que ya se sabe que fallan.
  let limite = gratisAgotados ? new ErrorAgentes("limite", "Cuota gratuita agotada.", gratisAgotados.hora) : null;
  let ultimo: ErrorAgentes | null = null;
  /** Clave o red de OpenRouter fallaron: otro modelo suyo tampoco va a responder, Gemini sí puede. */
  let openRouterCaido = false;
  const intentos: [Proveedor, string][] = [
    ...modelosGroq().map((m): [Proveedor, string] => ["groq", m]),
    ...(process.env.OPENROUTER_API_KEY && !limite ? (await modelosGratis()).slice(0, MAX_GRATIS).map((m): [Proveedor, string] => ["openrouter", m]) : []),
    ...modelosGemini().map((m): [Proveedor, string] => ["gemini", m]),
  ];

  const hasta = plazo.getStore();
  for (const [proveedor, modelo] of intentos) {
    if (proveedor === "openrouter" && (limite || openRouterCaido)) continue;
    const queda = hasta === undefined ? Infinity : hasta - Date.now() - MARGEN_MS;
    if (queda < 3_000) {
      ultimo ??= new ErrorAgentes("vacio", "Se acabó el tiempo de la junta.");
      break;
    }
    try {
      const espera = Math.min(opciones.esperaMs ?? ESPERA_MAXIMA_MS, queda);
      const resultado = await completarUnaVez(mensajes, proveedor, modelo, { ...opciones, esperaMs: espera });
      if (opciones.json && !extraerJson(resultado.texto)) throw new ErrorAgentes("vacio", "La respuesta no trae el formato pedido.");
      return resultado;
    } catch (error) {
      if (!(error instanceof ErrorAgentes)) throw error;
      if (proveedor !== "openrouter") {
        // Su cuota o su clave (cada modelo de Groq y Gemini tiene la suya) no cambian el aviso: el de OpenRouter dice más (p. ej., a qué hora vuelve).
        ultimo ??= error;
        continue;
      }
      if (error.motivo === "limite") {
        gratisAgotados = { hasta: error.reinicioMs ?? Date.now() + 3_600_000, hora: error.reinicio };
        limite = error;
        continue;
      }
      ultimo = error;
      if (!PASAR_AL_SIGUIENTE.has(error.motivo)) openRouterCaido = true;
    }
  }
  throw limite ?? ultimo ?? new ErrorAgentes("sin_clave", "Falta OPENROUTER_API_KEY, GROQ_API_KEY o GEMINI_API_KEY en el entorno.");
}

async function completarUnaVez(
  mensajes: Mensaje[],
  proveedor: Proveedor,
  modelo: string,
  opciones: { maxTokens?: number; esperaMs?: number },
): Promise<{ texto: string; modelo: string }> {
  const clave = process.env[CLAVES[proveedor]];
  if (!clave) throw new ErrorAgentes("sin_clave", "Falta la clave del proveedor en el entorno.");

  let respuesta: Response;
  try {
    respuesta = await fetch(URLS[proveedor], {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
        ...(proveedor === "openrouter" && { "X-OpenRouter-Title": "Blister Fitness" }),
      },
      body: JSON.stringify({
        model: modelo,
        messages: mensajes,
        max_tokens: opciones.maxTokens ?? 1500,
        // Van datos de salud: solo proveedores que no guardan ni entrenan con los prompts.
        ...(proveedor === "openrouter" && { provider: { data_collection: "deny" } }),
        // gpt-oss razona antes de responder: con poco esfuerzo no se come los tokens de la respuesta.
        ...(proveedor === "groq" && modelo.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
      }),
      signal: AbortSignal.timeout(opciones.esperaMs ?? ESPERA_MAXIMA_MS),
      cache: "no-store",
    });
  } catch (error) {
    // Pasarse de tiempo es cosa del modelo (se prueba otro); lo demás, de la conexión.
    if (error instanceof DOMException && error.name === "TimeoutError") throw new ErrorAgentes("vacio", "El modelo tardó demasiado.");
    throw new ErrorAgentes("red", "No se pudo contactar con OpenRouter.");
  }

  if (respuesta.status === 429) {
    // Distinguir tu cuota (día o minuto) de un modelo gratuito saturado para todos.
    const cuerpo = await respuesta.text();
    if (/upstream|shared_pool|temporarily rate-limited/i.test(cuerpo)) throw new ErrorAgentes("saturado", "El modelo gratuito está saturado ahora mismo.");
    // La cuota diaria trae la hora de reinicio (ms desde 1970) en X-RateLimit-Reset.
    const reinicio = Number(respuesta.headers.get("x-ratelimit-reset"));
    const valido = Number.isFinite(reinicio) && reinicio > Date.now() && /per-day/i.test(cuerpo);
    const hora = valido
      ? new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" }).format(new Date(reinicio)).replace(/ | /g, " ")
      : null;
    throw new ErrorAgentes("limite", "Se alcanzó el límite de peticiones gratuitas de OpenRouter.", hora, valido ? reinicio : null);
  }
  if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorAgentes("clave", "OpenRouter rechazó la clave o está deshabilitada.");
  if (!respuesta.ok) throw new ErrorAgentes("proveedor", `OpenRouter respondió ${respuesta.status}.`);

  // El tiempo de espera también corre mientras llega el cuerpo: si se agota aquí, se prueba otro modelo.
  let datos: { model?: string; choices?: { message?: { content?: string } }[] };
  try {
    datos = await respuesta.json();
  } catch {
    throw new ErrorAgentes("vacio", "El modelo tardó demasiado o la respuesta llegó incompleta.");
  }
  const texto = datos.choices?.[0]?.message?.content?.trim();
  // Algunos gratuitos son clasificadores de seguridad ("User Safety: safe"): no conversan.
  if (/safety|guard|moderation/i.test(datos.model ?? "") || /^(user|response)\s+safety\s*:/i.test(texto ?? "")) {
    throw new ErrorAgentes("vacio", "Respondió un modelo que no conversa.");
  }
  // Los modelos de razonamiento pueden gastar todo el margen pensando y no contestar.
  if (!texto) throw new ErrorAgentes("vacio", "El modelo respondió vacío.");
  return { texto, modelo: datos.model ?? modelo };
}

/**
 * Saca el primer objeto JSON de un texto. Los modelos no siempre respetan "responde solo JSON": a veces
 * lo envuelven en ```json``` o añaden una frase antes.
 */
export function extraerJson(texto: string): Record<string, unknown> | null {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  try {
    const valor = JSON.parse(texto.slice(inicio, fin + 1));
    return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
