import type { Metadata } from "next";
import Link from "next/link";
import { CLAVE_AVISO_COOKIES, CLAVE_MENU, CLAVE_TEMA } from "@/components/app/scripts-iniciales";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Qué cookies y almacenamiento local usa Blister Fitness y para qué.",
  alternates: { canonical: "/cookies" },
};

const NECESARIAS = [
  { nombre: "sb-…-auth-token", tipo: "Cookie", para: "Mantener tu sesión iniciada de forma segura.", dura: "Hasta cerrar sesión" },
  { nombre: "google_estado", tipo: "Cookie", para: "Proteger la conexión con Google Calendar contra suplantación (CSRF).", dura: "10 minutos" },
];

const PREFERENCIAS = [
  { nombre: CLAVE_TEMA, tipo: "Almacenamiento local", para: "Recordar el tema claro u oscuro.", dura: "Hasta que lo borres" },
  { nombre: CLAVE_MENU, tipo: "Almacenamiento local", para: "Recordar si plegaste el menú lateral.", dura: "Hasta que lo borres" },
  { nombre: "oficina-agentes", tipo: "Almacenamiento local", para: "Recordar dónde ubicaste a los agentes en la Oficina.", dura: "Hasta que lo borres" },
  { nombre: CLAVE_AVISO_COOKIES, tipo: "Almacenamiento local", para: "No volver a mostrarte el aviso de cookies.", dura: "Hasta que lo borres" },
];

function Tabla({ filas }: { filas: typeof NECESARIAS }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Tipo</th>
            <th scope="col">Para qué</th>
            <th scope="col">Duración</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre}>
              <td className="font-mono text-xs">{f.nombre}</td>
              <td>{f.tipo}</td>
              <td>{f.para}</td>
              <td>{f.dura}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PaginaCookies() {
  return (
    <article>
      <h1 className="titulo-display">Política de cookies</h1>
      <p>
        Las cookies son pequeños archivos que un sitio guarda en tu navegador; el almacenamiento local es parecido pero no viaja al
        servidor. Blister Fitness <strong>solo usa los necesarios para funcionar y para recordar tus preferencias</strong>. No usamos
        cookies de publicidad, de analítica ni de terceros que te rastreen.
      </p>

      <h2>Necesarias</h2>
      <p>Sin ellas no puedes iniciar sesión ni conectar Google Calendar, por eso no se pueden desactivar desde la app.</p>
      <Tabla filas={NECESARIAS} />

      <h2>Preferencias</h2>
      <p>Se guardan solo en tu navegador y no se envían a nuestros servidores.</p>
      <Tabla filas={PREFERENCIAS} />

      <h2>Cómo borrarlas</h2>
      <p>
        Puedes eliminarlas desde la configuración de tu navegador. Si borras las de sesión, tendrás que volver a ingresar; si borras las
        de preferencias, la app volverá a su apariencia por defecto.
      </p>

      <h2>Cambios</h2>
      <p>
        Si algún día agregamos cookies de analítica o de terceros, actualizaremos esta página y te pediremos permiso antes de usarlas.
        Más información en la <Link href="/privacidad">política de privacidad</Link>.
      </p>
    </article>
  );
}
