"use client";

import { useRouter } from "next/navigation";
import { claseSelector } from "@/components/ui/campo";

/** Cambiar de alumno sin volver a la lista. */
export function SelectorAlumno({ alumnos, actual }: { alumnos: { id: string; nombre: string }[]; actual: string }) {
  const router = useRouter();
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="progreso-alumno" className="sr-only">
        Ver el progreso de otro alumno
      </label>
      <select
        id="progreso-alumno"
        value={actual}
        onChange={(e) => router.push(`/progreso?alumno=${e.target.value}`)}
        className={claseSelector.replace("h-10", "h-9")}
      >
        {alumnos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
