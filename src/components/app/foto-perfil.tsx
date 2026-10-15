import Image from "next/image";
import { iniciales } from "@/lib/formato";

const TAMANOS = { sm: { caja: "size-8 rounded-full text-xs", px: 32 }, xl: { caja: "size-20 rounded-full text-2xl", px: 80 } };

/** Foto del entrenador (la de Google si ingresó con Google); si no hay, sus iniciales sobre la superficie hueso. */
export function FotoPerfil({
  url,
  nombres,
  apellidos,
  tamano = "sm",
}: {
  url: string | null | undefined;
  nombres: string;
  apellidos: string;
  tamano?: keyof typeof TAMANOS;
}) {
  const t = TAMANOS[tamano];
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={t.px}
        height={t.px}
        // Google rechaza a veces las peticiones con referer de otro dominio.
        referrerPolicy="no-referrer"
        className={`shrink-0 object-cover ${t.caja}`}
      />
    );
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center bg-hueso font-medium text-grafito ${t.caja}`}>
      {iniciales(nombres || "?", apellidos || "")}
    </span>
  );
}
