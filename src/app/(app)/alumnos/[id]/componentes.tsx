"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { AreaTexto, Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Boton } from "@/components/ui/boton";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { Grupo, Pila } from "@/components/ui/disposicion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { Texto } from "@/components/ui/texto";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import css from "./componentes.module.css";

type Accion = (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

export function FormularioNota({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, {});
  const formulario = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formulario.current?.reset();
  }, [estado]);

  return (
    <form ref={formulario} action={enviar} className={css.nota}>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <AreaTexto
        etiqueta="Nueva nota"
        nombre="contenido"
        placeholder="Observaciones de la sesión, molestias, acuerdos…"
        rows={3}
        defaultValue={estado.valores?.contenido}
        errores={estado.errores?.contenido}
      />
      <Grupo espacio={3}>
        <BotonEnvio variante="secundario" textoPendiente="Guardando…">
          Guardar nota
        </BotonEnvio>
        {estado.ok && (
          <Texto as="span" tamano="sm" tono="exito" role="status">
            Nota guardada.
          </Texto>
        )}
      </Grupo>
    </form>
  );
}

type Medida = { nombre: string; etiqueta: string; unidad: string };

const COMPOSICION: Medida[] = [
  { nombre: "peso_kg", etiqueta: "Peso", unidad: "kg" },
  { nombre: "grasa_corporal_pct", etiqueta: "Grasa corporal", unidad: "%" },
  { nombre: "estatura_cm", etiqueta: "Estatura", unidad: "cm" },
];

const PERIMETROS: Medida[] = [
  { nombre: "pecho_cm", etiqueta: "Pecho", unidad: "cm" },
  { nombre: "cintura_cm", etiqueta: "Cintura", unidad: "cm" },
  { nombre: "cadera_cm", etiqueta: "Cadera", unidad: "cm" },
  { nombre: "brazo_izq_cm", etiqueta: "Brazo izquierdo", unidad: "cm" },
  { nombre: "brazo_der_cm", etiqueta: "Brazo derecho", unidad: "cm" },
  { nombre: "muslo_izq_cm", etiqueta: "Muslo izquierdo", unidad: "cm" },
  { nombre: "muslo_der_cm", etiqueta: "Muslo derecho", unidad: "cm" },
];

export function FormularioMedicion({
  accion,
  hoy,
  abiertoInicial = false,
}: {
  accion: Accion;
  hoy: string;
  /** Solo para vistas previas: muestra el formulario ya desplegado. */
  abiertoInicial?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  // Al guardar con éxito se cierra el formulario (y al desmontarse queda limpio).
  const [estado, enviar] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const resultado = await accion(previo, datos);
    if (resultado.ok) setAbierto(false);
    return resultado;
  }, {});

  if (!abierto) {
    return (
      <Grupo espacio={3}>
        <Boton variante="secundario" onClick={() => setAbierto(true)}>
          <Plus aria-hidden /> Registrar medición
        </Boton>
        {estado.ok && (
          <Texto as="span" tamano="sm" tono="exito" role="status">
            Medición guardada.
          </Texto>
        )}
      </Grupo>
    );
  }

  const campo = (m: Medida, primero = false) => (
    <Campo
      key={m.nombre}
      etiqueta={m.etiqueta}
      nombre={m.nombre}
      unidad={m.unidad}
      inputMode="decimal"
      autoComplete="off"
      autoFocus={primero}
      defaultValue={estado.valores?.[m.nombre]}
      errores={estado.errores?.[m.nombre]}
    />
  );

  return (
    <Tarjeta variante="hundida">
      <form action={enviar} noValidate>
        <Pila espacio={6}>
          <Grupo justificar="entre" alinear="fin" espacio={4}>
            <Pila espacio={1}>
              <h3 className={css.tituloMedicion}>Nueva medición</h3>
              <Texto tamano="sm" tono="tenue">
                Completa solo lo que mediste hoy.
              </Texto>
            </Pila>
            <Campo
              etiqueta="Fecha"
              nombre="medido_en"
              type="date"
              required
              className={css.fecha}
              defaultValue={estado.valores?.medido_en ?? hoy}
              errores={estado.errores?.medido_en}
            />
          </Grupo>

          {estado.error && <Aviso>{estado.error}</Aviso>}

          <fieldset className={css.grupo}>
            <legend className={css.leyenda}>Composición</legend>
            <div className={css.medidas}>{COMPOSICION.map((m, i) => campo(m, i === 0))}</div>
          </fieldset>

          <fieldset className={css.grupo}>
            <legend className={css.leyenda}>Perímetros</legend>
            <div className={css.medidas}>{PERIMETROS.map((m) => campo(m))}</div>
          </fieldset>

          <Campo
            etiqueta="Notas"
            nombre="notas"
            opcional
            placeholder="Condiciones de la medición: en ayunas, después de entrenar…"
            defaultValue={estado.valores?.notas}
          />

          <Grupo espacio={3}>
            <BotonEnvio textoPendiente="Guardando…">Guardar medición</BotonEnvio>
            <Boton variante="fantasma" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
          </Grupo>
        </Pila>
      </form>
    </Tarjeta>
  );
}

/**
 * Cambia el estado del alumno. Con `confirmacion` pide confirmar en un diálogo
 * que explica la consecuencia antes de ejecutar la acción.
 */
export function BotonCambioEstado({
  accion,
  texto,
  confirmacion,
  tituloConfirmacion,
  variante = "secundario",
  className = "w-full",
}: {
  accion: () => Promise<void>;
  texto: string;
  confirmacion?: string;
  /** Título del diálogo: "¿Archivar a Ana?". */
  tituloConfirmacion?: string;
  variante?: "secundario" | "peligro";
  className?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const ejecutar = () => {
    setConfirmando(false);
    iniciar(() => accion());
  };

  return (
    <>
      <Boton variante={variante} disabled={pendiente} onClick={() => (confirmacion ? setConfirmando(true) : ejecutar())}>
        {pendiente ? "Guardando…" : texto}
      </Boton>
      {confirmacion && (
        <Dialogo abierto={confirmando} alCerrar={() => setConfirmando(false)} titulo={tituloConfirmacion ?? `¿${texto}?`}>
          <Pila espacio={6}>
            <Texto>{confirmacion}</Texto>
            <Grupo justificar="fin" espacio={3}>
              <Boton variante="fantasma" onClick={() => setConfirmando(false)}>
                Cancelar
              </Boton>
              <Boton variante={variante} onClick={ejecutar}>
                {texto}
              </Boton>
            </Grupo>
          </Pila>
        </Dialogo>
      )}
    </>
  );
}
