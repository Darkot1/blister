import type { Metadata } from "next";
import { Proximamente } from "@/components/app/proximamente";

export const metadata: Metadata = { title: "Configuración" };

export default function Pagina() {
  return <Proximamente titulo="Configuración" descripcion="Tu perfil, unidades de medida y preferencias de la cuenta." />;
}
