"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { clasesBoton } from "@/components/ui/boton";
import { empezarSesion } from "./acciones";

type Dia = { id: string; nombre: string; orden: number };

/**
 * Días de la rutina activa del alumno, cada uno un botón que empieza la sesión ahora mismo
 * (sin cita). El que toca a continuación va resaltado.
 */
export function DiasRutina({ dias, siguienteId }: { dias: Dia[]; siguienteId: string | null }) {
  const [pendiente, iniciar] = useTransition();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {dias.map((d) => {
          const toca = d.id === siguienteId;
          return (
            <li key={d.id}>
              <button
                type="button"
                disabled={pendiente}
                aria-label={`Empezar ahora: día ${d.orden}, ${d.nombre}${toca ? " (le toca)" : ""}`}
                onClick={() => {
                  setEligiendo(d.id);
                  setError(null);
                  iniciar(async () => {
                    // Si sale bien, la acción abre la sesión; aquí solo vuelve un error.
                    const resultado = await empezarSesion(d.id);
                    setError(resultado?.error ?? null);
                    setEligiendo(null);
                  });
                }}
                className={clasesBoton(toca ? "primario" : "secundario", "h-9 max-w-full px-3 text-sm disabled:opacity-60")}
              >
                <Play aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">
                  {pendiente && eligiendo === d.id ? "Preparando…" : `Día ${d.orden} · ${d.nombre}`}
                </span>
                {toca && !(pendiente && eligiendo === d.id) && <span className="text-xs opacity-75">· le toca</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <Aviso>{error}</Aviso>}
    </div>
  );
}
