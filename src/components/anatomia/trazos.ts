// Trazos del mapa corporal. Se dibuja solo la mitad izquierda de cada figura
// (x ≤ 100 en un lienzo de 200 × 420) y se refleja para obtener la otra mitad.
//
// La clave de cada trazo es el `slug` de public.musculos: es el identificador
// estable que une el dibujo con la base de datos. Si se agrega un músculo a la
// base sin trazo aquí, el mapa lo ofrece en la lista de "músculos profundos".

export type Vista = "frontal" | "posterior";

export const ANCHO_FIGURA = 200;
export const ALTO_FIGURA = 420;

/** Contorno de media figura, común a ambas vistas. */
export const SILUETA =
  "M100 46 L92 46 L91 58 C82 62 72 62 66 64 C54 68 49 80 51 96 C51 112 50 124 51 136 " +
  "C48 150 45 162 45 176 C42 184 42 196 48 200 C54 202 58 196 58 186 C62 170 66 152 68 138 " +
  "C70 124 70 112 70 104 L72 112 C72 130 74 150 70 168 C68 190 68 220 72 250 " +
  "C74 270 74 286 74 296 C70 320 72 350 78 392 L76 410 C76 416 90 416 94 410 L92 392 " +
  "C94 360 96 330 94 300 C96 280 98 250 99 210 L100 200 Z";

export const CABEZA = { cx: 100, cy: 26, rx: 15, ry: 19 };

export const TRAZOS: Record<Vista, Record<string, string>> = {
  frontal: {
    esternocleidomastoideo: "M92 47 L95 46 L99 62 L95 63 Z",
    trapecio_superior: "M91 55 L91 60 C84 62 78 63 73 64 C80 60 86 57 91 55 Z",
    deltoides_lateral: "M66 65 C56 68 50 78 51 93 L56 93 C56 82 60 72 69 67 Z",
    deltoides_anterior: "M70 66 C62 72 58 82 57 93 L66 94 C67 84 70 74 76 66 Z",
    pectoral_clavicular: "M77 65 L99 64 L99 79 C89 79 79 82 69 88 C70 78 73 70 77 65 Z",
    pectoral_esternal: "M69 90 C79 84 89 81 99 81 L99 104 C88 108 77 106 69 98 Z",
    serrato_anterior: "M71 102 C75 106 78 110 80 116 L77 121 C74 117 72 113 71 109 Z",
    biceps_braquial: "M58 96 L68 97 C69 110 68 122 66 134 L57 134 C55 120 55 108 58 96 Z",
    braquial: "M52 108 L56 106 C55 118 55 126 56 134 L52 134 C51 124 51 116 52 108 Z",
    braquiorradial: "M51 138 L59 138 C57 150 53 162 49 172 L46 170 C46 158 48 146 51 138 Z",
    flexores_antebrazo: "M60 138 L67 138 C65 152 62 166 58 180 L51 178 C55 164 58 150 60 138 Z",
    recto_abdominal: "M91 108 L99 108 L99 168 L92 166 C91 146 91 126 91 108 Z",
    oblicuos: "M89 108 C84 112 80 116 78 122 C77 136 77 150 79 160 L90 165 C89 146 89 126 89 108 Z",
    gluteo_medio: "M71 162 L79 166 L74 182 C70 178 69 170 71 162 Z",
    psoas_iliaco: "M83 168 L91 170 L95 185 L88 183 Z",
    aductores: "M94 188 L99 190 L99 214 C97 228 95 238 93 246 C90 226 90 204 94 188 Z",
    cuadriceps: "M73 184 C80 182 88 184 92 188 C89 210 89 232 92 254 L91 286 L77 288 C72 262 70 222 73 184 Z",
    gastrocnemio: "M87 302 C93 314 94 330 91 346 L87 346 C86 330 85 316 87 302 Z",
    soleo: "M75 324 L79 326 L80 378 L77 384 C75 364 74 344 75 324 Z",
  },
  posterior: {
    trapecio_superior: "M92 50 L99 49 L99 70 L75 66 C83 62 89 58 92 50 Z",
    erectores_espinales: "M93 118 L99 120 L99 172 L92 172 C93 154 93 136 93 118 Z",
    trapecio_medio_inferior: "M99 71 L81 68 C88 80 93 98 99 124 Z",
    deltoides_lateral: "M66 65 C56 68 50 78 51 93 L55 93 C55 82 59 72 68 67 Z",
    deltoides_posterior: "M72 66 C63 70 57 80 56 93 L65 91 C66 82 70 74 78 68 Z",
    manguito_rotador: "M79 73 L89 80 L87 94 L75 90 C75 84 77 78 79 73 Z",
    romboides: "M91 80 L97 82 L97 104 L90 98 Z",
    redondo_mayor: "M66 92 L76 92 L79 100 L70 103 Z",
    dorsal_ancho: "M71 104 L80 96 L90 100 L92 132 C86 142 80 148 76 152 C73 136 71 120 71 104 Z",
    triceps_braquial: "M52 96 L67 97 C68 112 67 124 65 134 L53 134 C51 120 51 108 52 96 Z",
    extensores_antebrazo: "M51 138 L66 138 C64 152 61 166 57 180 L47 172 C46 158 48 146 51 138 Z",
    gluteo_medio: "M74 164 L95 170 L92 178 C84 178 78 177 73 175 Z",
    gluteo_mayor: "M73 178 C82 180 92 180 99 182 L99 212 C88 218 77 214 72 204 C70 194 70 186 73 178 Z",
    isquiotibiales: "M72 214 C80 220 90 220 97 216 C96 244 94 266 92 288 L78 288 C72 262 70 238 72 214 Z",
    gastrocnemio: "M77 296 C71 310 73 328 79 340 L91 340 C95 326 95 310 91 296 Z",
    soleo: "M79 343 L91 343 C90 358 88 372 86 386 L81 386 C81 372 79 358 79 343 Z",
  },
};

/** Líneas decorativas (no seleccionables): divisiones del recto abdominal. */
export const DETALLES: Record<Vista, string> = {
  frontal: "M91 124 L99 124 M91 139 L99 139 M91 153 L99 153",
  posterior: "",
};

export const SLUGS_DIBUJADOS = new Set(Object.values(TRAZOS).flatMap((t) => Object.keys(t)));
