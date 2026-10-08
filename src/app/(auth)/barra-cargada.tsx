import css from "./barra-cargada.module.css";

/*
  Barra olímpica de hombre cargada con discos de competición, vista de lado, en milímetros reales:
  barra de 2200 mm (manga de 415 mm, Ø 50; eje de 1310 mm, Ø 28), discos de Ø 450 mm con el grosor
  aproximado de cada peso, un disco de cambio de 2,5 kg (Ø 210 mm) y el seguro.
  Es el único dibujo de la aplicación.
*/
const LARGO = 2200;
const ALTO = 450;
const CENTRO = ALTO / 2;

type Pieza = { clase: string; ancho: number; diametro: number };

/** De adentro hacia afuera, como se cargan: 25, 20, 15, 10, 2,5 kg y el seguro. */
const CARGA: Pieza[] = [
  { clase: css.rojo, ancho: 64, diametro: 450 },
  { clase: css.azul, ancho: 54, diametro: 450 },
  { clase: css.amarillo, ancho: 44, diametro: 450 },
  { clase: css.verde, ancho: 34, diametro: 450 },
  { clase: css.rojo, ancho: 20, diametro: 210 },
  { clase: css.seguro, ancho: 72, diametro: 90 },
];

const INICIO_MANGA = 1785;
const HUECO = 2;

function lado() {
  let x = INICIO_MANGA + HUECO;
  return CARGA.map((p) => {
    const pieza = { ...p, x };
    x += p.ancho + HUECO;
    return pieza;
  });
}

export function BarraCargada({ className }: { className?: string }) {
  const derecha = lado();
  const izquierda = derecha.map((p) => ({ ...p, x: LARGO - p.x - p.ancho }));
  return (
    <svg
      viewBox={`0 0 ${LARGO} ${ALTO}`}
      role="img"
      aria-label="Barra olímpica cargada con discos de competición: rojo de 25, azul de 20, amarillo de 15 y verde de 10 kilos a cada lado."
      className={className}
    >
      {/* Mangas y eje */}
      <rect className={css.manga} x={0} y={CENTRO - 25} width={415} height={50} rx={6} />
      <rect className={css.manga} x={INICIO_MANGA} y={CENTRO - 25} width={415} height={50} rx={6} />
      <rect className={css.eje} x={445} y={CENTRO - 14} width={1310} height={28} />
      <rect className={css.tope} x={415} y={CENTRO - 37} width={30} height={74} rx={4} />
      <rect className={css.tope} x={1755} y={CENTRO - 37} width={30} height={74} rx={4} />
      {[...izquierda, ...derecha].map((p, i) => (
        <rect
          key={i}
          className={p.clase}
          x={p.x}
          y={CENTRO - p.diametro / 2}
          width={p.ancho}
          height={p.diametro}
          rx={p.diametro > 100 ? 8 : 4}
        />
      ))}
    </svg>
  );
}
