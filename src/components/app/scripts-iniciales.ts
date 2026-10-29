/*
  Preferencias que se aplican en <head>, antes de pintar, para que no parpadeen al recargar.
  Va en un módulo sin "use client": si el texto del script saliera de un componente de cliente,
  en el servidor sería una referencia de cliente y no el script.
*/
export const CLAVE_TEMA = "tema";
export const CLAVE_MENU = "menu";
/** Aviso de cookies ya visto (ver aviso-cookies.tsx). */
export const CLAVE_AVISO_COOKIES = "aviso-cookies";

export const SCRIPT_INICIAL = `try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t==="claro"||t==="sistema")document.documentElement.dataset.tema=t;if(localStorage.getItem("${CLAVE_MENU}")==="plegado")document.documentElement.dataset.menu="plegado"}catch(e){}`;
