import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/ingresar", "/registro", "/recuperar", "/auth"];
const RUTAS_SOLO_INVITADOS = ["/ingresar", "/registro", "/recuperar"];

const empiezaCon = (ruta: string, prefijos: string[]) =>
  prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`));

/** Refresca la sesión en cada petición y protege las rutas privadas. */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAGuardar, cabeceras) {
          for (const { name, value } of cookiesAGuardar) request.cookies.set(name, value);
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesAGuardar) respuesta.cookies.set(name, value, options);
          for (const [clave, valor] of Object.entries(cabeceras ?? {})) respuesta.headers.set(clave, valor);
        },
      },
    },
  );

  // Importante: llamar antes de generar cualquier respuesta.
  const { data } = await supabase.auth.getClaims();
  const hayUsuario = Boolean(data?.claims?.sub);
  const ruta = request.nextUrl.pathname;

  if (!hayUsuario && !empiezaCon(ruta, RUTAS_PUBLICAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = ruta === "/" ? "" : `?siguiente=${encodeURIComponent(ruta)}`;
    return redirigirConCookies(url, respuesta);
  }

  if (hayUsuario && (ruta === "/" || empiezaCon(ruta, RUTAS_SOLO_INVITADOS))) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    url.search = "";
    return redirigirConCookies(url, respuesta);
  }

  respuesta.headers.set("Cache-Control", "private, no-store");
  return respuesta;
}

function redirigirConCookies(url: URL, origen: NextResponse) {
  const redireccion = NextResponse.redirect(url);
  for (const cookie of origen.cookies.getAll()) redireccion.cookies.set(cookie);
  redireccion.headers.set("Cache-Control", "private, no-store");
  return redireccion;
}
