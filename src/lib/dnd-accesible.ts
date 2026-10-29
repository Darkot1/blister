import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from "@dnd-kit/core";

/*
  Textos de @dnd-kit para lectores de pantalla, en español (por defecto vienen en inglés:
  "Picked up draggable item…"). `nombre` traduce el id de cada elemento a lo que el entrenador ve.
*/

export const instruccionesDnd: ScreenReaderInstructions = {
  draggable:
    "Para mover un elemento, pulsa Espacio o Intro. Mientras lo mueves, usa las flechas para cambiarlo de lugar. Pulsa Espacio o Intro otra vez para soltarlo, o Escape para cancelar.",
};

export function anunciosDnd(nombre: (id: UniqueIdentifier) => string): Announcements {
  return {
    onDragStart: ({ active }) => `Tomaste ${nombre(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nombre(active.id)} está sobre ${nombre(over.id)}.` : `${nombre(active.id)} ya no está sobre ningún lugar.`),
    onDragEnd: ({ active, over }) => (over ? `Soltaste ${nombre(active.id)} en el lugar de ${nombre(over.id)}.` : `Soltaste ${nombre(active.id)}.`),
    onDragCancel: ({ active }) => `Cancelaste. ${nombre(active.id)} volvió a su lugar.`,
  };
}
