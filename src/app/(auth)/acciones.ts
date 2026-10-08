"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

const MENSAJES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.",
  email_exists: "Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.",
  weak_password: "La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.",
  same_password: "La nueva contraseña debe ser distinta de la anterior.",
  over_email_send_rate_limit: "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  signup_disabled: "El registro de cuentas nuevas está desactivado.",
  provider_disabled: "El ingreso con Google no está activado.",
};

function mensajeError(codigo: string | undefined) {
  return (codigo && MENSAJES[codigo]) || "No se pudo completar la operación. Inténtalo de nuevo.";
}

async function origen() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocolo = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/** Solo permite redirecciones internas (evita redirecciones abiertas). */
function rutaSegura(valor: FormDataEntryValue | null) {
  const ruta = typeof valor === "string" ? valor : "";
  return ruta.startsWith("/") && !ruta.startsWith("//") ? ruta : "/inicio";
}

const correo = z.email("Escribe un correo válido").trim().toLowerCase();
const clave = z.string().min(8, "Usa al menos 8 caracteres");

export async function ingresar(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = z
    .object({ correo, clave: z.string().min(1, "Escribe tu contraseña") })
    .safeParse({ correo: formData.get("correo"), clave: formData.get("clave") });
  const valores = { correo: String(formData.get("correo") ?? "") };
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.clave,
  });
  if (error) return { error: mensajeError(error.code), valores };

  redirect(rutaSegura(formData.get("siguiente")));
}

export async function registrar(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = z
    .object({
      nombres: z.string().trim().min(1, "Escribe tu nombre"),
      apellidos: z.string().trim().min(1, "Escribe tu apellido"),
      correo,
      clave,
    })
    .safeParse(Object.fromEntries(formData));
  const valores = {
    nombres: String(formData.get("nombres") ?? ""),
    apellidos: String(formData.get("apellidos") ?? ""),
    correo: String(formData.get("correo") ?? ""),
  };
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: datos.data.correo,
    password: datos.data.clave,
    options: {
      data: { nombres: datos.data.nombres, apellidos: datos.data.apellidos },
      emailRedirectTo: `${await origen()}/auth/confirmar`,
    },
  });
  if (error) return { error: mensajeError(error.code), valores };

  // Si la confirmación por correo está desactivada, ya hay sesión.
  if (data.session) redirect("/inicio");
  return { ok: true };
}

export async function recuperar(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = z.object({ correo }).safeParse({ correo: formData.get("correo") });
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: { correo: String(formData.get("correo") ?? "") } };
  }

  const supabase = await crearClienteServidor();
  await supabase.auth.resetPasswordForEmail(datos.data.correo, {
    redirectTo: `${await origen()}/auth/confirmar?siguiente=/actualizar-clave`,
  });
  // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
  return { ok: true };
}

export async function actualizarClave(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = z
    .object({ clave, confirmacion: z.string() })
    .refine((d) => d.clave === d.confirmacion, { message: "Las contraseñas no coinciden", path: ["confirmacion"] })
    .safeParse({ clave: formData.get("clave"), confirmacion: formData.get("confirmacion") });
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: datos.data.clave });
  if (error) return { error: mensajeError(error.code) };

  redirect("/inicio");
}

/** Inicia el flujo OAuth con Google. Supabase redirige de vuelta a /auth/confirmar. */
export async function ingresarConGoogle(formData: FormData) {
  const siguiente = rutaSegura(formData.get("siguiente"));
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origen()}/auth/confirmar?siguiente=${encodeURIComponent(siguiente)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/ingresar?error=google");
  redirect(data.url);
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
