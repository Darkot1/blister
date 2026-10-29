import "server-only";

// Variables del servidor: TELEGRAM_BOT_USUARIO (sin @) y TELEGRAM_WEBHOOK_SECRETO (el mismo que
// `telegram_webhook_secreto` en Vault). El token del bot vive solo en Vault: lo usa la base para enviar.

/** Nombre del bot, para el enlace t.me/<bot>?start=<codigo>. */
export const botTelegram = () => process.env.TELEGRAM_BOT_USUARIO?.replace(/^@/, "") || null;

export const telegramConfigurado = () => Boolean(botTelegram() && process.env.TELEGRAM_WEBHOOK_SECRETO);
