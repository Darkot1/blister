import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { Proximamente } from "@/components/app/proximamente";
import { EnlaceBoton } from "@/components/ui/boton";
import { FuncionesPrevistas } from "../_componentes/funciones-previstas";

export const metadata: Metadata = { title: "Configuración" };

export default function Pagina() {
  return (
    <>
      <Proximamente titulo="Configuración" descripcion="Tu perfil, las unidades de medida y las preferencias de tu cuenta." />
      <FuncionesPrevistas
        funciones={[
          {
            titulo: "Tu perfil",
            descripcion: "Tu nombre, tu foto y tus datos de contacto.",
            cuando: "Sin fecha",
          },
          {
            titulo: "Unidades y preferencias",
            descripcion: "Kilos o libras y centímetros o pulgadas para mediciones y rutinas.",
            cuando: "Sin fecha",
          },
        ]}
        mientras={{
          texto: "Ya puedes cambiar tu contraseña.",
          acciones: (
            <EnlaceBoton variante="secundario" href="/actualizar-clave">
              <KeyRound aria-hidden /> Cambiar contraseña
            </EnlaceBoton>
          ),
        }}
      />
    </>
  );
}
