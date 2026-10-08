import type { Metadata } from "next";
import { Proximamente } from "@/components/app/proximamente";

export const metadata: Metadata = { title: "Ajustes" };

export default function Pagina() {
  return <Proximamente href="/configuracion" descripcion="Tu perfil, unidades de medida y preferencias de la cuenta." />;
}
