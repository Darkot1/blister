"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { MapaCorporal, type MusculoMapa } from "@/components/anatomia/mapa-corporal";
import { Boton } from "@/components/ui/boton";
import { Chip } from "@/components/ui/filtros";
import { cx } from "@/lib/clases";
import css from "./selector-musculos.module.css";

/**
 * Mapa corporal cuya selección vive en la URL (?m=slug,slug) para que la búsqueda sea compartible.
 * En móvil el mapa se pliega: arriba quedan solo los músculos elegidos y los resultados no quedan enterrados.
 * Desde 1024 px el mapa siempre está visible (columna lateral pegajosa).
 */
export function SelectorMusculos({ musculos, seleccionados }: { musculos: MusculoMapa[]; seleccionados: string[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [optimistas, setOptimistas] = useOptimistic(seleccionados);
  const [abierto, setAbierto] = useState(false);
  const idMapa = useId();
  const nombre = new Map(musculos.map((m) => [m.slug, m.nombre]));

  const aplicar = (siguientes: string[]) => {
    iniciar(() => {
      setOptimistas(siguientes);
      const parametros = new URLSearchParams(window.location.search);
      if (siguientes.length) parametros.set("m", siguientes.join(","));
      else parametros.delete("m");
      const consulta = parametros.toString();
      router.replace(consulta ? `/ejercicios?${consulta}` : "/ejercicios", { scroll: false });
    });
  };

  const alternar = (slug: string) =>
    aplicar(optimistas.includes(slug) ? optimistas.filter((s) => s !== slug) : [...optimistas, slug]);

  const verResultados = () => {
    setAbierto(false);
    document.getElementById("resultados")?.scrollIntoView({ block: "start" });
  };

  return (
    <div className={cx(css.selector, abierto && css.abierto)}>
      <div className={css.cabecera}>
        <div className={css.textos}>
          <h2 className={css.titulo}>Músculos</h2>
          <p className={css.resumen}>
            {optimistas.length === 0
              ? "Elige uno o varios para ver ejercicios sugeridos."
              : optimistas.length === 1
                ? "1 elegido"
                : `${optimistas.length} elegidos`}
          </p>
        </div>
        <Boton
          variante="secundario"
          tamano="pequeno"
          aria-expanded={abierto}
          aria-controls={idMapa}
          onClick={() => setAbierto(!abierto)}
          className={css.alternar}
        >
          {abierto ? "Ocultar mapa" : optimistas.length ? "Cambiar" : "Abrir mapa"}
          <ChevronDown aria-hidden className={css.flecha} />
        </Boton>
      </div>

      {optimistas.length > 0 && (
        <div className={css.elegidos}>
          <ul aria-label="Músculos elegidos" className={css.chips}>
            {optimistas.map((slug) => (
              <li key={slug}>
                <Chip quitable onClick={() => alternar(slug)} aria-label={`Quitar ${nombre.get(slug) ?? slug}`}>
                  {nombre.get(slug) ?? slug}
                </Chip>
              </li>
            ))}
            <li>
              <Boton variante="fantasma" tamano="pequeno" onClick={() => aplicar([])}>
                Limpiar
              </Boton>
            </li>
          </ul>
        </div>
      )}

      <div id={idMapa} className={css.mapa}>
        <MapaCorporal musculos={musculos} seleccionados={optimistas} alAlternar={alternar} />
        <Boton variante="secundario" bloque onClick={verResultados} className={css.listo}>
          {optimistas.length ? "Ver ejercicios sugeridos" : "Cerrar mapa"}
        </Boton>
      </div>
    </div>
  );
}
