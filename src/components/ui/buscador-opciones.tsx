"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { claseControl } from "./campo";

export type Opcion = { valor: string; texto: string; detalle?: string };

/** Sin tildes ni mayúsculas: "jose" encuentra a "José". */
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Desplegable con buscador (combobox accesible): se escribe para filtrar, flechas para recorrer,
 * Enter para elegir y Escape para cerrar. Envía el valor elegido en un campo oculto con `nombre`,
 * así funciona dentro de un <form> igual que un <select>.
 */
export function BuscadorOpciones({
  etiqueta,
  nombre,
  opciones,
  valor,
  alCambiar,
  marcador = "Escribe para buscar",
  vacio = "Nada coincide con la búsqueda.",
  errores,
  required,
}: {
  etiqueta: string;
  nombre: string;
  opciones: Opcion[];
  valor: string;
  alCambiar: (valor: string) => void;
  marcador?: string;
  vacio?: string;
  errores?: string[];
  required?: boolean;
}) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const elegida = opciones.find((o) => o.valor === valor);
  const filtradas = texto.trim() ? opciones.filter((o) => normalizar(`${o.texto} ${o.detalle ?? ""}`).includes(normalizar(texto.trim()))) : opciones;
  const idError = errores?.length ? `${id}-error` : undefined;

  const elegir = (o: Opcion) => {
    alCambiar(o.valor);
    setTexto("");
    setAbierto(false);
  };
  const resaltar = (i: number) => {
    setActivo(i);
    lista.current?.children[i]?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-grafito">{etiqueta}</label>
      <input type="hidden" name={nombre} value={valor} required={required} />
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tenue" />
        <input
          ref={campo}
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={abierto && filtradas[activo] ? `${id}-${filtradas[activo].valor}` : undefined}
          aria-invalid={Boolean(idError)}
          aria-describedby={idError}
          autoComplete="off"
          // Cerrado muestra lo elegido; al escribir, busca.
          value={abierto ? texto : (elegida?.texto ?? "")}
          placeholder={elegida ? elegida.texto : marcador}
          onFocus={() => {
            setAbierto(true);
            setActivo(Math.max(0, filtradas.findIndex((o) => o.valor === valor)));
          }}
          onClick={() => setAbierto(true)}
          onBlur={() => {
            setAbierto(false);
            setTexto("");
          }}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
            setActivo(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!abierto) setAbierto(true);
              else resaltar(Math.min(filtradas.length - 1, activo + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              resaltar(Math.max(0, activo - 1));
            } else if (e.key === "Enter" && abierto) {
              // Enter elige; no envía el formulario a medias.
              e.preventDefault();
              if (filtradas[activo]) elegir(filtradas[activo]);
            } else if (e.key === "Escape" && abierto) {
              e.preventDefault();
              setAbierto(false);
              setTexto("");
            }
          }}
          className={`${claseControl} pr-16 pl-10`}
        />
        <span className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center">
          {elegida && !required && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Quitar selección"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => alCambiar("")}
              className="grid size-7 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
          <ChevronDown aria-hidden className={`mr-1.5 size-4 text-tenue transition-transform ${abierto ? "rotate-180" : ""}`} />
        </span>
      </div>

      {abierto && (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          aria-label={etiqueta}
          // Que el clic no quite el foco antes de elegir.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-linea bg-superficie p-1 shadow-flotante"
        >
          {filtradas.length ? (
            filtradas.map((o, i) => (
              <li
                key={o.valor}
                id={`${id}-${o.valor}`}
                role="option"
                aria-selected={o.valor === valor}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(o)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ${i === activo ? "bg-hueso text-tinta" : "text-grafito"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.texto}</span>
                  {o.detalle && <span className="block truncate text-xs text-tenue">{o.detalle}</span>}
                </span>
                {o.valor === valor && <Check aria-hidden className="size-4 shrink-0 text-acento" />}
              </li>
            ))
          ) : (
            <li role="presentation" className="px-3 py-2.5 text-sm text-tenue">{vacio}</li>
          )}
        </ul>
      )}
      {idError && <p id={idError} className="mt-1.5 text-sm text-peligro">{errores![0]}</p>}
    </div>
  );
}
