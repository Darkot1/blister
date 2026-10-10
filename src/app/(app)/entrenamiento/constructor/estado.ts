// Estado del constructor de rutinas. Los números se editan como texto ("" = sin valor)
// y se convierten al guardar; así un campo a medio escribir no se pierde.

import type { DiaArbol, EjercicioCatalogo } from "@/lib/entrenamiento/cargar";
import {
  ETIQUETA_BLOQUE,
  bloqueParaEjercicio,
  prescripcionInicial,
  type TipoBloque,
} from "@/lib/entrenamiento/prescripcion";
import type { RutinaEntrada } from "@/lib/validaciones/rutina";

export type EjercicioEstado = {
  clave: string;
  ejercicio_id: string;
  series: string;
  repeticiones: string;
  peso: string;
  unidad_peso: "kg" | "lb";
  descanso_segundos: string;
  tempo: string;
  rir: string;
  rpe: string;
  notas: string;
};

export type BloqueEstado = {
  clave: string;
  nombre: string;
  tipo: TipoBloque;
  rondas: string;
  descanso_segundos: string;
  notas: string;
  ejercicios: EjercicioEstado[];
};

export type DiaEstado = { clave: string; nombre: string; bloques: BloqueEstado[] };

export type EstadoRutina = {
  nombre: string;
  descripcion: string;
  tipo_objetivo: string;
  dias: DiaEstado[];
};

export const nuevaClave = () => crypto.randomUUID();

const texto = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function diaVacio(numero: number): DiaEstado {
  return { clave: nuevaClave(), nombre: `Día ${numero}`, bloques: [] };
}

export function bloqueVacio(tipo: TipoBloque): BloqueEstado {
  const porRondas = tipo === "superserie" || tipo === "circuito";
  return {
    clave: nuevaClave(),
    nombre: ETIQUETA_BLOQUE[tipo],
    tipo,
    rondas: porRondas ? "3" : "",
    descanso_segundos: porRondas ? "90" : "",
    notas: "",
    ejercicios: [],
  };
}

export function ejercicioNuevo(ejercicio: EjercicioCatalogo, objetivo: string): EjercicioEstado {
  const p = prescripcionInicial(ejercicio.tipo, objetivo || null);
  return {
    clave: nuevaClave(),
    ejercicio_id: ejercicio.id,
    series: texto(p.series),
    repeticiones: texto(p.repeticiones),
    peso: "",
    unidad_peso: "kg",
    descanso_segundos: texto(p.descanso_segundos),
    tempo: "",
    rir: texto(p.rir),
    rpe: "",
    notas: "",
  };
}

export function estadoInicial(rutina?: {
  nombre: string;
  descripcion: string | null;
  tipo_objetivo: string | null;
  dias: DiaArbol[];
}, objetivoSugerido?: string | null): EstadoRutina {
  if (!rutina) return { nombre: "", descripcion: "", tipo_objetivo: objetivoSugerido ?? "", dias: [diaVacio(1)] };
  return {
    nombre: rutina.nombre,
    descripcion: rutina.descripcion ?? "",
    tipo_objetivo: rutina.tipo_objetivo ?? "",
    dias: rutina.dias.length
      ? rutina.dias.map((d) => ({
          clave: d.id,
          nombre: d.nombre,
          bloques: d.bloques.map((b) => ({
            clave: b.id,
            nombre: b.nombre,
            tipo: b.tipo as TipoBloque,
            rondas: texto(b.rondas),
            descanso_segundos: texto(b.descanso_segundos),
            notas: b.notas ?? "",
            ejercicios: b.ejercicios.map((e) => ({
              clave: e.id,
              ejercicio_id: e.ejercicio_id,
              // En superseries la serie es la ronda: se muestra la del bloque.
              series: texto(e.series),
              repeticiones: e.repeticiones ?? "",
              peso: texto(e.peso),
              unidad_peso: e.unidad_peso === "lb" ? "lb" : "kg",
              descanso_segundos: texto(e.descanso_segundos),
              tempo: e.tempo ?? "",
              rir: texto(e.rir),
              rpe: texto(e.rpe),
              notas: e.notas ?? "",
            })),
          })),
        }))
      : [diaVacio(1)],
  };
}

/** "" → null; "2,5" → 2.5. Un texto no numérico se envía como NaN y la validación lo rechaza. */
const numero = (v: string) => (v.trim() === "" ? null : Number(v.trim().replace(",", ".")));

export function aEntrada(estado: EstadoRutina): RutinaEntrada {
  return {
    nombre: estado.nombre,
    descripcion: estado.descripcion,
    tipo_objetivo: estado.tipo_objetivo || null,
    dias: estado.dias.map((d) => ({
      nombre: d.nombre,
      bloques: d.bloques.map((b) => ({
        nombre: b.nombre,
        tipo: b.tipo,
        rondas: numero(b.rondas),
        descanso_segundos: numero(b.descanso_segundos),
        notas: b.notas,
        ejercicios: b.ejercicios.map((e) => ({
          ejercicio_id: e.ejercicio_id,
          series: numero(e.series),
          repeticiones: e.repeticiones,
          peso: numero(e.peso),
          unidad_peso: e.unidad_peso,
          descanso_segundos: numero(e.descanso_segundos),
          tempo: e.tempo,
          rir: numero(e.rir),
          rpe: numero(e.rpe),
          notas: e.notas,
        })),
      })),
    })),
  };
}

/**
 * Bloque donde cae un ejercicio añadido en modo automático: el último bloque del día
 * de su mismo tipo; si no hay, uno nuevo (calentamiento al inicio, enfriamiento al final).
 * Devuelve el índice del bloque, creándolo en `dia` si hace falta.
 */
export function ubicarBloque(dia: DiaEstado, tipoEjercicio: string): number {
  const tipo = bloqueParaEjercicio(tipoEjercicio);
  const compatibles = (b: BloqueEstado) =>
    b.tipo === tipo || (tipo === "fuerza" && (b.tipo === "superserie" || b.tipo === "circuito" || b.tipo === "libre"));
  for (let i = dia.bloques.length - 1; i >= 0; i--) if (compatibles(dia.bloques[i])) return i;

  const bloque = bloqueVacio(tipo);
  if (tipo === "calentamiento") {
    dia.bloques.unshift(bloque);
    return 0;
  }
  if (tipo === "enfriamiento") {
    dia.bloques.push(bloque);
    return dia.bloques.length - 1;
  }
  // Antes de los bloques de enfriamiento que cierran el día.
  let posicion = dia.bloques.length;
  while (posicion > 0 && dia.bloques[posicion - 1].tipo === "enfriamiento") posicion--;
  dia.bloques.splice(posicion, 0, bloque);
  return posicion;
}

/** Copia profunda con claves nuevas (para duplicar días, bloques o ejercicios). */
export function conClavesNuevas<T extends { clave: string }>(elemento: T): T {
  const copia = structuredClone(elemento) as T & { bloques?: BloqueEstado[]; ejercicios?: EjercicioEstado[] };
  copia.clave = nuevaClave();
  copia.bloques = copia.bloques?.map(conClavesNuevas);
  copia.ejercicios = copia.ejercicios?.map(conClavesNuevas);
  if (!copia.bloques) delete copia.bloques;
  if (!copia.ejercicios) delete copia.ejercicios;
  return copia;
}

export function mover<T>(lista: T[], desde: number, hasta: number) {
  if (hasta < 0 || hasta >= lista.length) return;
  const [elemento] = lista.splice(desde, 1);
  lista.splice(hasta, 0, elemento);
}
