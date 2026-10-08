import Link from "next/link";
import { claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";

const PESTANAS = [
  { href: "/maestros/ejercicios", texto: "Ejercicios" },
  { href: "/maestros/musculos", texto: "Músculos" },
];

export function PestanasMaestros({ activa }: { activa: string }) {
  return (
    <nav aria-label="Maestros" className={`${claseSegmentado} mb-5`}>
      {PESTANAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={activa === p.href ? "page" : undefined}
          className={`inline-flex items-center ${claseSegmento(activa === p.href)}`}
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}
