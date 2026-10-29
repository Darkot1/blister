import type { Metadata } from "next";
import Link from "next/link";
import { RESPONSABLE } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Blister Fitness trata los datos personales de entrenadores, alumnos y visitantes, y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

/** Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013, Colombia). */
export default function PaginaPrivacidad() {
  return (
    <article>
      <h1 className="titulo-display">Política de tratamiento de datos personales</h1>
      <p>
        En Blister Fitness cuidamos datos delicados: medidas del cuerpo, fotos de progreso, lesiones y hábitos de entrenamiento.
        Esta política explica qué datos tratamos, para qué, con quién los compartimos y cómo puedes ejercer tus derechos, conforme a
        la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas colombianas de protección de
        datos.
      </p>

      <h2>1. Quién es el responsable</h2>
      <ul>
        <li><strong>Responsable:</strong> {RESPONSABLE.nombre}</li>
        <li><strong>Identificación:</strong> {RESPONSABLE.identificacion}</li>
        <li><strong>Domicilio:</strong> {RESPONSABLE.domicilio}</li>
        <li><strong>Correo para temas de datos personales:</strong> {RESPONSABLE.correo}</li>
      </ul>

      <h2>2. Dos papeles distintos: entrenadores y alumnos</h2>
      <p>
        <strong>Datos de quien usa la app (entrenadores y su equipo).</strong> Blister Fitness es el responsable del tratamiento de los
        datos de tu cuenta.
      </p>
      <p>
        <strong>Datos de los alumnos.</strong> Cada entrenador o centro decide qué datos de sus alumnos registra y para qué; frente a esos
        datos el entrenador es el responsable y Blister Fitness actúa como <em>encargado</em>: los guarda y procesa solo para prestarle el
        servicio y siguiendo sus instrucciones. Si eres alumno y quieres ejercer tus derechos, puedes dirigirte a tu entrenador o
        escribirnos y le trasladaremos tu solicitud.
      </p>

      <h2>3. Qué datos tratamos</h2>
      <h3>De los entrenadores</h3>
      <ul>
        <li>Nombre, apellido, correo, foto de perfil (si entras con Google) y teléfono si lo agregas.</li>
        <li>Datos del espacio de trabajo y de su página pública: nombre, presentación, foto, certificaciones, redes y ubicación que decidas publicar.</li>
        <li>Si conectas Google Calendar: un permiso de acceso a tu calendario, guardado cifrado.</li>
        <li>Datos técnicos de uso: inicios de sesión, registro de cambios (auditoría) y datos necesarios para mantener la sesión.</li>
      </ul>
      <h3>De los alumnos (registrados por su entrenador)</h3>
      <ul>
        <li>Identificación y contacto: nombre, correo, teléfono, fecha de nacimiento.</li>
        <li>Objetivos, rutinas, sesiones, asistencia y notas del entrenador.</li>
        <li>
          <strong>Datos sensibles relativos a la salud</strong> (art. 5 de la Ley 1581): peso, medidas corporales, porcentaje de grasa,
          fotos de progreso, lesiones, dolores y condiciones físicas.
        </li>
      </ul>
      <h3>De quien escribe desde una página pública</h3>
      <ul>
        <li>Nombre, correo o teléfono, objetivo y el mensaje que envíes (que puede incluir datos de salud si decides contarlos).</li>
        <li>La fecha en que autorizaste el tratamiento, como prueba de esa autorización.</li>
      </ul>

      <h2>4. Para qué los usamos</h2>
      <ul>
        <li>Crear y administrar tu cuenta y tu espacio de trabajo.</li>
        <li>Prestar el servicio: agenda, fichas de alumnos, rutinas, registro de sesiones, progreso y página pública.</li>
        <li>Sincronizar citas con Google Calendar cuando lo conectas.</li>
        <li>Generar sugerencias con inteligencia artificial cuando un entrenador las pide (ver sección 6).</li>
        <li>Llevar al entrenador las solicitudes que llegan desde su página pública.</li>
        <li>Seguridad, prevención de fraude y abuso, soporte y cumplimiento de obligaciones legales.</li>
      </ul>
      <p>No vendemos datos personales ni los usamos para publicidad.</p>

      <h2>5. Datos sensibles y de menores</h2>
      <p>
        Nadie está obligado a entregar datos sensibles: responder preguntas sobre salud es facultativo. Cuando se tratan, se hace con
        autorización previa, expresa e informada de su titular (art. 6 de la Ley 1581). El entrenador que registra datos de salud de un
        alumno es quien debe obtener esa autorización y conservar su prueba; en el formulario de las páginas públicas la pedimos de
        forma expresa antes de enviar.
      </p>
      <p>
        Los datos de niños, niñas y adolescentes solo pueden registrarse con la autorización de su representante legal, respetando su
        interés superior y sus derechos fundamentales (art. 7 de la Ley 1581).
      </p>

      <h2>6. Con quién los compartimos</h2>
      <p>
        Para funcionar usamos proveedores que tratan datos por cuenta nuestra (transmisión), algunos fuera de Colombia, con medidas de
        seguridad y obligaciones de confidencialidad:
      </p>
      <ul>
        <li><strong>Supabase</strong> (base de datos, autenticación y archivos), con servidores en Estados Unidos.</li>
        <li><strong>El proveedor de alojamiento de la aplicación</strong>, que sirve las páginas.</li>
        <li><strong>Google</strong>, para entrar con Google y para Google Calendar si lo conectas.</li>
        <li>
          <strong>Proveedores de inteligencia artificial</strong> (OpenRouter, Groq y Google AI Studio), solo cuando un entrenador convoca una
          junta o hace una pregunta en la Oficina. Enviamos el caso sin el nombre ni los datos de contacto del alumno, pidiendo que no se
          guarden ni se usen para entrenar modelos cuando el proveedor lo permite. Las respuestas son sugerencias para el entrenador, no
          un diagnóstico médico.
        </li>
      </ul>
      <p>
        Al aceptar esta política autorizas estas transferencias y transmisiones internacionales. También entregaremos datos a
        autoridades cuando una norma o una orden lo exija.
      </p>

      <h2>7. Tus derechos</h2>
      <p>Como titular puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que diste.</li>
        <li>Saber qué uso se les ha dado.</li>
        <li>Revocar la autorización y pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.</li>
        <li>Acceder gratis a tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio, después de haber agotado el trámite con nosotros.</li>
      </ul>

      <h2>8. Cómo ejercerlos</h2>
      <p>
        Escribe a <strong>{RESPONSABLE.correo}</strong> indicando tu nombre, cómo identificarte, qué pides y un medio para responderte.
      </p>
      <ul>
        <li><strong>Consultas:</strong> respondemos en máximo 10 días hábiles, prorrogables 5 más avisándote el motivo.</li>
        <li><strong>Reclamos</strong> (corrección, actualización, supresión o revocatoria): respondemos en máximo 15 días hábiles, prorrogables 8 más avisándote el motivo.</li>
      </ul>
      <p>
        Si tus datos los registró un entrenador, le trasladaremos tu solicitud, pues es quien decide sobre ellos; si no responde,
        te ayudaremos a ejercer tu derecho.
      </p>

      <h2>9. Seguridad y conservación</h2>
      <p>
        Cada espacio de trabajo está aislado de los demás en la base de datos; las conexiones van cifradas; las fotos de progreso se
        guardan en almacenamiento privado y los permisos de Google, cifrados. Ningún sistema es infalible: si ocurre un incidente que
        afecte tus datos, te avisaremos y lo informaremos a la autoridad según la ley.
      </p>
      <p>
        Conservamos los datos mientras la cuenta esté activa o el entrenador los necesite para el servicio. Al cerrar una cuenta, los
        eliminamos o anonimizamos en un plazo razonable, salvo lo que debamos conservar por obligación legal.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Solo usamos cookies y almacenamiento local necesarios para iniciar sesión y recordar tus preferencias. Los detalles están en la{" "}
        <Link href="/cookies">política de cookies</Link>.
      </p>

      <h2>11. Cambios</h2>
      <p>
        Si cambiamos esta política de forma importante te lo avisaremos en la app o por correo antes de que rija. La fecha de vigencia
        está al final de esta página.
      </p>
    </article>
  );
}
