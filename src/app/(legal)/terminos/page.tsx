import type { Metadata } from "next";
import Link from "next/link";
import { RESPONSABLE } from "@/lib/sitio";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de Blister Fitness para entrenadores personales y centros de entrenamiento.",
  alternates: { canonical: "/terminos" },
};

export default function PaginaTerminos() {
  return (
    <article>
      <h1 className="titulo-display">Términos y condiciones de uso</h1>
      <p>
        Estos términos regulan el uso de Blister Fitness, una aplicación para que entrenadores personales y centros gestionen su agenda,
        sus alumnos, rutinas y progreso. Al crear una cuenta o usar la app aceptas estos términos y la{" "}
        <Link href="/privacidad">política de privacidad</Link>. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2>1. Quién presta el servicio</h2>
      <p>
        {RESPONSABLE.nombre}, identificado con {RESPONSABLE.identificacion}, con domicilio en {RESPONSABLE.domicilio}. Contacto:{" "}
        {RESPONSABLE.correo}.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes ser mayor de edad y dar datos verdaderos.</li>
        <li>Eres responsable de guardar tu contraseña y de lo que se haga desde tu cuenta. Avísanos si sospechas un uso indebido.</li>
        <li>Al registrarte se crea un espacio de trabajo del que eres propietario.</li>
      </ul>

      <h2>3. Los datos de tus alumnos</h2>
      <p>
        Tú decides qué datos de tus alumnos registras y eres el <strong>responsable</strong> de su tratamiento; Blister Fitness actúa como{" "}
        <strong>encargado</strong> y solo los trata para prestarte el servicio. Por eso te comprometes a:
      </p>
      <ul>
        <li>
          Obtener de cada alumno una autorización previa, expresa e informada para tratar sus datos, en especial los de salud (peso,
          medidas, fotos, lesiones), y conservar la prueba.
        </li>
        <li>Registrar datos de menores de edad solo con autorización de su representante legal.</li>
        <li>Atender las consultas y reclamos de tus alumnos sobre sus datos.</li>
        <li>No subir información de terceros sin derecho a hacerlo ni contenido ilegal u ofensivo.</li>
      </ul>

      <h2>4. Página pública</h2>
      <p>
        Puedes publicar una página con tu presentación y un formulario de contacto. Eres responsable de lo que publiques (textos, fotos,
        certificaciones) y de que sea veraz. Las solicitudes que lleguen por ella son datos de esas personas: trátalas según la ley y
        nuestra política de privacidad.
      </p>

      <h2>5. Sugerencias de inteligencia artificial</h2>
      <p>
        La Oficina ofrece sugerencias generadas por modelos de inteligencia artificial. Son un apoyo para tu criterio profesional:
        pueden contener errores y <strong>no son un diagnóstico ni una prescripción médica</strong>. Revisa siempre lo que propongan antes
        de aplicarlo, sobre todo con alumnos con lesiones o condiciones de salud. La disponibilidad de este servicio depende de terceros
        y puede tener límites de uso.
      </p>

      <h2>6. No sustituye a un profesional de la salud</h2>
      <p>
        Blister Fitness es una herramienta de gestión. No presta servicios médicos, fisioterapéuticos ni nutricionales, y no responde
        por las decisiones de entrenamiento que tomes con base en la información de la app.
      </p>

      <h2>7. Uso aceptable</h2>
      <ul>
        <li>No intentes acceder a datos de otros espacios, vulnerar la seguridad o interferir con el servicio.</li>
        <li>No uses la app para enviar spam ni para fines ilegales.</li>
        <li>No copies, revendas ni hagas ingeniería inversa de la aplicación.</li>
      </ul>
      <p>Podemos suspender un espacio que incumpla estos términos, avisándote el motivo salvo que la ley o la urgencia lo impidan.</p>

      <h2>8. Propiedad</h2>
      <p>
        La aplicación, su diseño, marca y código son nuestros. Los datos y contenidos que subes son tuyos; nos das permiso para
        guardarlos y procesarlos solo para prestarte el servicio.
      </p>

      <h2>9. Disponibilidad y cambios</h2>
      <p>
        Trabajamos para que el servicio esté disponible y tus datos seguros, pero puede haber interrupciones por mantenimiento o fallas
        de terceros. Podemos mejorar, cambiar o retirar funciones. Si cambiamos estos términos de forma importante te avisaremos antes de
        que rijan.
      </p>

      <h2>10. Responsabilidad</h2>
      <p>
        En la medida que lo permita la ley, no respondemos por daños indirectos ni por pérdidas derivadas del uso que hagas de la
        información de la app. Nada de lo anterior limita los derechos que te reconoce el Estatuto del Consumidor (Ley 1480 de 2011)
        cuando te sea aplicable.
      </p>

      <h2>11. Cancelar tu cuenta</h2>
      <p>
        Puedes dejar de usar el servicio cuando quieras y pedir el cierre de tu cuenta escribiendo a {RESPONSABLE.correo}. Antes de
        cerrarla te ayudaremos a exportar tus datos si lo solicitas.
      </p>

      <h2>12. Ley y jurisdicción</h2>
      <p>Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se resolverá ante los jueces colombianos competentes.</p>
    </article>
  );
}
