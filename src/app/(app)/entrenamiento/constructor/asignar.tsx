"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

export type AlumnoAsignable = { id: string; nombre: string; planActivo: string | null };

export type Asignacion = {
  accion: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  alumnos: AlumnoAsignable[];
  hoy: string;
};

/** Asigna la rutina guardada a un alumno: se crea su plan como copia independiente. */
export function AsignarRutina({ accion, alumnos, hoy, deshabilitado }: Asignacion & { deshabilitado: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar] = useActionState(accion, {});
  const [alumnoId, setAlumnoId] = useState(estado.valores?.alumno_id ?? "");
  const reemplaza = alumnos.find((a) => a.id === alumnoId)?.planActivo;

  return (
    <>
      <Boton
        type="button"
        variante="secundario"
        onClick={() => setAbierto(true)}
        disabled={deshabilitado}
        title={deshabilitado ? "Guarda la rutina antes de asignarla" : undefined}
      >
        <UserPlus aria-hidden className="size-4" /> Asignar a alumno
      </Boton>
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Asignar a un alumno">
        {alumnos.length === 0 ? (
          <p className="text-sm text-tenue">No tienes alumnos activos. Crea uno desde Alumnos para asignarle esta rutina.</p>
        ) : (
          <form action={enviar} className="space-y-4">
            <p className="text-sm text-tenue">
              El alumno recibe su propia copia de la rutina. Si después cambias la rutina, su plan no se modifica.
            </p>
            <Selector
              etiqueta="Alumno"
              nombre="alumno_id"
              required
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
              opciones={[{ valor: "", texto: "Elige un alumno" }, ...alumnos.map((a) => ({ valor: a.id, texto: a.nombre }))]}
              errores={estado.errores?.alumno_id}
            />
            <Campo
              etiqueta="Empieza el"
              nombre="fecha_inicio"
              type="date"
              required
              defaultValue={estado.valores?.fecha_inicio ?? hoy}
              errores={estado.errores?.fecha_inicio}
            />
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" name="activar" defaultChecked className="mt-0.5 size-4 accent-[var(--color-tinta)]" />
              <span>
                Dejarlo como su plan activo
                {reemplaza && <span className="block text-tenue">Reemplaza a «{reemplaza}», que quedará como completado.</span>}
              </span>
            </label>
            {estado.error && <Aviso>{estado.error}</Aviso>}
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
                Cancelar
              </Boton>
              <BotonEnvio textoPendiente="Asignando…">Asignar rutina</BotonEnvio>
            </div>
          </form>
        )}
      </Dialogo>
    </>
  );
}
