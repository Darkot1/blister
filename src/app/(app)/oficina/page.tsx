import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { Oficina } from "./oficina";

export const metadata: Metadata = { title: "Oficina" };

export default function PaginaOficina() {
  return (
    <>
      <Encabezado
        titulo="Oficina"
        miga="Entrenamiento"
        descripcion="Sienta a tus agentes y convoca juntas: el líder reparte el caso de un alumno, cada agente revisa su parte y te propone una decisión. Aún no están conectados a Claude."
      />
      <Oficina />
    </>
  );
}
