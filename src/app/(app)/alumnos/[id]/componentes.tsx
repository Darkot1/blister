"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Boton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/aviso";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export function FormularioNota({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, {});
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={enviar} className="space-y-3">
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <AreaTexto
        etiqueta="Nueva nota"
        nombre="contenido"
        placeholder="Observaciones de la sesión, molestias, acuerdos…"
        rows={3}
        defaultValue={estado.valores?.contenido}
        errores={estado.errores?.contenido}
      />
      <BotonEnvio variante="secundario" textoPendiente="Guardando…">Guardar nota</BotonEnvio>
    </form>
  );
}

const MEDIDAS: { nombre: string; etiqueta: string; unidad: string }[] = [
  { nombre: "peso_kg", etiqueta: "Peso", unidad: "kg" },
  { nombre: "estatura_cm", etiqueta: "Estatura", unidad: "cm" },
  { nombre: "grasa_corporal_pct", etiqueta: "Grasa corporal", unidad: "%" },
  { nombre: "cintura_cm", etiqueta: "Cintura", unidad: "cm" },
  { nombre: "cadera_cm", etiqueta: "Cadera", unidad: "cm" },
  { nombre: "pecho_cm", etiqueta: "Pecho", unidad: "cm" },
  { nombre: "brazo_izq_cm", etiqueta: "Brazo izq.", unidad: "cm" },
  { nombre: "brazo_der_cm", etiqueta: "Brazo der.", unidad: "cm" },
  { nombre: "muslo_izq_cm", etiqueta: "Muslo izq.", unidad: "cm" },
  { nombre: "muslo_der_cm", etiqueta: "Muslo der.", unidad: "cm" },
];

export function FormularioMedicion({ accion, hoy }: { accion: Accion; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  // Al guardar con éxito se cierra el formulario (y al desmontarse queda limpio).
  const [estado, enviar] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const resultado = await accion(previo, datos);
    if (resultado.ok) setAbierto(false);
    return resultado;
  }, {});

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Boton variante="secundario" onClick={() => setAbierto(true)}>Registrar medición</Boton>
        {estado.ok && <span role="status" className="text-sm text-exito">Medición guardada.</span>}
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-4 rounded-lg border border-linea bg-fondo/50 p-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Fecha" nombre="medido_en" type="date" required className="max-w-48"
        defaultValue={estado.valores?.medido_en ?? hoy} errores={estado.errores?.medido_en} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MEDIDAS.map((m) => (
          <Campo
            key={m.nombre}
            etiqueta={`${m.etiqueta} (${m.unidad})`}
            nombre={m.nombre}
            inputMode="decimal"
            autoComplete="off"
            defaultValue={estado.valores?.[m.nombre]}
            errores={estado.errores?.[m.nombre]}
          />
        ))}
      </div>
      <Campo etiqueta="Notas" nombre="notas" placeholder="Opcional: condiciones de la medición"
        defaultValue={estado.valores?.notas} />
      <div className="flex gap-3">
        <BotonEnvio textoPendiente="Guardando…">Guardar medición</BotonEnvio>
        <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Boton>
      </div>
    </form>
  );
}

export function BotonCambioEstado({
  accion,
  texto,
  confirmacion,
  variante = "secundario",
}: {
  accion: () => Promise<void>;
  texto: string;
  confirmacion?: string;
  variante?: "secundario" | "peligro";
}) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      variante={variante}
      disabled={pendiente}
      onClick={() => {
        if (confirmacion && !window.confirm(confirmacion)) return;
        iniciar(() => accion());
      }}
    >
      {pendiente ? "Guardando…" : texto}
    </Boton>
  );
}
