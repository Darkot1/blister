---
name: sistema-diseno
description: Sistema de diseño "Disco" de Blister y reglas de UI/UX (identidad, tokens, tipografía, CSS Modules, catálogo de src/components/ui, reglas anti-plantilla, patrones de página, estados, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: Disco

Herramienta de trabajo de un entrenador personal en Colombia. La usa **de pie en el gimnasio** (móvil, una mano, mirada rápida entre series) y **sentado planificando la semana** (escritorio). Tiene que responder rápido: qué tengo hoy, cómo va este alumno, qué le pongo en la próxima rutina.

**La idea.** El mundo del entrenador ya tiene un código de color funcional: los discos olímpicos de competición (rojo 25 kg, azul 20, amarillo 15, verde 10, blanco 5). Blister lo usa **con significado, nunca como decoración**:

- Un **disco** (círculo con agujero central, `<Disco>`) marca el estado de algo. Un disco de caucho negro es también la marca.
- El **amarillo de 15 kg** es la acción principal: botón amarillo con texto en tinta, y la barra que dice "aquí estás" en la navegación. Es la única nota fuerte de la pantalla.
- El **único dibujo** de la app es la barra cargada de las pantallas de acceso. En ningún otro lugar hay ilustración.

El resto es papel frío, tinta azul grisácea y tipografía: **Big Shoulders Display** (rotulación de señalética deportiva, condensada) para títulos, horas y cifras; **Atkinson Hyperlegible Next** (diseñada para máxima legibilidad: el entrenador lee de reojo) para todo lo demás.

Si no tienes la skill `frontend-design` instalada, sus reglas esenciales están en "Principios" y "Prohibido" más abajo.

## Principios

1. **El color significa algo.** Disco = estado; amarillo = la acción que toca ahora; azul = enlace, foco o selección. Si un color no informa, va en tinta o hierro.
2. **La tipografía hace el trabajo.** Jerarquía por tamaño y peso de Big Shoulders/Atkinson, no por cajas, sombras ni rótulos.
3. **Una sola nota fuerte por pantalla** (el botón amarillo o el título).
4. **Planos, no tarjetas.** Las secciones se separan por espacio y por su título. Las listas son filas sobre el papel con una regla fina entre ellas.
5. **Sin decoración.** Sin degradados, sin sombras salvo en lo que flota (diálogos, menús), sin animaciones de entrada. El movimiento solo responde a una acción (abrir, desplegar, confirmar).
6. **Texto útil.** Verbos claros, sentence case, errores que dicen qué pasó y cómo arreglarlo, vacíos que invitan a actuar.

## Prohibido (rasgos de plantilla que Disco eliminó)

| No hagas | Haz |
|---|---|
| Rótulos/eyebrows en MAYÚSCULAS espaciadas ("ALUMNOS ACTIVOS", "VIERNES, 9 DE OCTUBRE") o cualquier `text-transform: uppercase` con `letter-spacing` amplio | Un título de `Seccion`, o texto `sm` en negrita, en sentence case |
| Metadatos unidos con punto medio: "Entrenamiento · hasta 7:00", "10 citas · 7 por atender" | Frases o comas: "Entrenamiento hasta las 7:00 a. m.", "10 citas, 7 por atender" |
| Kit de tarjetas: cada bloque en una caja blanca con el mismo radio y borde; `Seccion tarjeta`; tarjetas-enlace | Planos sobre el papel. Contenedor solo para superficies de trabajo (ver "Cuándo usar contenedor") |
| La cifra gigante con etiqueta pequeña como patrón repetido (tiles de KPI) | `GrupoCifras`: una fila de definiciones en línea, máximo 4, solo si ayudan a decidir |
| "→" (o "»") al final de botones y enlaces | El verbo basta: "Ver agenda" |
| Acentuar una palabra del titular (otro color, cursiva, negrita) | El titular entero en un solo tratamiento |
| Monospace para datos, horas o cifras | Big Shoulders con `tabular-nums` (`.cifra`, `<Texto cifra>`) |
| Sombras decorativas, sombra en hover de tarjetas o botones | Sombra solo en diálogos, hojas y menús (`--sombra-flotante`, `--sombra-dialogo`) |
| Animaciones de entrada (fade/slide al cargar), hover animado en cada bloque | Transiciones cortas de color como respuesta al puntero; nada más |
| Iconos en círculo de color, ilustraciones en estados vacíos | `EstadoVacio` de texto, alineado a la izquierda |
| Numeración decorativa (01 / 02 / 03) cuando el contenido no es una secuencia | Numera solo pasos reales |
| Amarillo como color de texto; texto blanco sobre amarillo | Sobre amarillo siempre tinta |
| Usar un color de disco para decorar (p. ej. un color por sección del menú) | Colores de disco solo para estado |
| Eslóganes y copy que vende ("Todo en un solo lugar") | Describe qué hace: "Registra a tus alumnos y sus mediciones" |

## Color (`src/styles/tokens.css`)

| Token | Hex | Uso |
|---|---|---|
| `--color-papel` | `#f6f7f8` | fondo general (blanco frío, no crema) |
| `--color-superficie` | `#ffffff` | campos, menús, diálogos, superficies de trabajo |
| `--color-superficie-hundida` | `#eceff2` | formulario abierto en línea (`Tarjeta variante="hundida"`), campos desactivados |
| `--color-linea` | `#d8dde2` | reglas entre filas, bordes de superficies |
| `--color-linea-fuerte` | `#8a949f` | borde de campos y botón secundario (3:1 sobre blanco) |
| `--color-tinta` | `#1c2530` | texto, iconos, filtro activo, avatar de la cuenta |
| `--color-tenue` ("hierro") | `#5b6774` | texto secundario (5.6:1 sobre papel) |
| `--color-sutil` | `#8a949f` | placeholders y decoración; **nunca** texto necesario |
| `--disco-amarillo` → `--color-accion` (+ `-hover`, `--color-sobre-accion` = tinta) | `#f2b300` | botón primario, barra de "aquí estás" |
| `--disco-azul` → `--color-acento` (+ `-hover`, `-suave`, `--color-sobre-acento` = blanco) | `#1d56d2` | enlaces, foco, selección, "confirmada" |
| `--disco-verde` → `--color-exito` (+ `-suave`) | `#14824a` | hecho, "completada", alumno activo, tendencia buena |
| `--disco-rojo` → `--color-peligro` (+ `-suave`) | `#c62828` | error, destructivo, "no asistió" |
| `--color-aviso` (+ `-suave`) | `#8a5a00` | texto de advertencia (ámbar oscuro legible); el disco de aviso es amarillo |
| disco blanco | contorno tinta | "programada", "archivado" (`<Disco tono="vacio">`) |

- Usa los **roles** (`--color-accion`, `--color-acento`, `--color-exito`…) en componentes; `--disco-*` solo cuando pintas un disco o la barra.
- El color nunca va solo: el disco siempre lleva texto al lado (o `etiqueta`), el `Aviso` lleva icono.
- Matices: `color-mix(in srgb, var(--color-tinta) 6%, transparent)` (hover neutro) o los `-suave`.
- Solo tema claro.

### Mapa de estados

| Dominio | Estado | Disco |
|---|---|---|
| Alumno | activo / en pausa (inactivo) / archivado | verde / amarillo / vacío (`InsigniaEstado`) |
| Cita | programada / confirmada / completada / no asistió | vacío / azul / verde / rojo |
| Día | hoy | amarillo (`Insignia tono="amarillo"` o `"solida"`) |

## Tipografía

- `--fuente-titulo`: **Big Shoulders Display Variable** (100-900). Títulos de página y sección, horas, cifras, la marca. Grande y apretada: el tipo es el elemento visual.
- `--fuente-texto`: **Atkinson Hyperlegible Next Variable** (200-800). Todo lo demás. Su cero lleva barra para no confundirse con la O: es intencional.
- Ambas se importan una vez en `src/app/layout.tsx` (`@fontsource-variable/...`, raíz del paquete).
- Escala modular **1.25** sobre 16 px: `--texto-base` 1rem · `lg` 1.25 · `xl` 1.5625 · `2xl` 1.953 · `3xl` 2.441 · `4xl` 3.052 · `5xl` 3.815. Pasos intermedios para texto secundario: `sm` 0.875 (14 px), `xs` 0.8 (solo etiquetas de la barra de pestañas).
- Usos fijos:
  - Título de página (`Encabezado`): Big Shoulders `--peso-titulo` (800), `3xl` en móvil → `5xl` desde 1024 px, `--interlineado-titulo` 0.95.
  - Título de sección (`Seccion`): `2xl` (nivel 2) / `xl` (nivel 3).
  - Cifras (`Cifra`): `3xl`; horas en filas: `<Texto as="span" cifra tamano="xl">`.
  - Texto: Atkinson `base`; secundario `sm` en `--color-tenue`; etiquetas de campos `sm` `--peso-semi`.
- Pesos: `--peso-normal` 400 · `medio` 500 · `semi` 650 · `negrita` 750 · `titulo` 800.
- Cifras sueltas en texto: clase global `.cifra` (Big Shoulders + `tabular-nums`). Columnas numéricas de tablas: `data-numero` (Atkinson tabular).
- **Sentence case en todo.** Nada de `text-transform: uppercase`.
- Líneas de lectura ≤ 75 caracteres: `max-width: var(--ancho-lectura)` (40rem).

## Resto de tokens

- Espaciado (base 4 px): `--espacio-0-5` 2 · `1` 4 · `1-5` 6 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64.
- Controles: `--alto-control` 40 px (44 en `pointer: coarse`), `--alto-control-pequeno` 32 (36), `--alto-fila` 56, `--tamano-icono` 18, `--tamano-icono-pequeno` 16.
- Anchos: `--ancho-contenido` 72rem (lo aplica el layout), `--ancho-lectura` 40rem, `--ancho-acceso` 26rem, `--ancho-dialogo` 34rem / `-amplio` 48rem, `--ancho-panel-lateral` 20rem, `--ancho-minimo-tarjeta` 16rem, `--alto-figura` 30rem, `--alto-barra-superior` 4rem, `--alto-barra-inferior` 4rem.
- Bordes: `--ancho-borde` 1px, `--ancho-borde-grueso` 2px, `--ancho-indicador` 4px (barra amarilla de "aquí estás", barra de `Aviso`, barra azul de fila actual).
- Radios (dos, con jerarquía): `--radio-md` 6px en controles (botones, campos, chips, avisos); `--radio-lg` 10px en diálogos, hojas y superficies de trabajo; `--radio-completo` solo discos y avatares. No existe `--radio-sm`.
- Sombras: `--sombra-flotante` (menús, enlace "Saltar al contenido") y `--sombra-dialogo` (diálogos, hoja "Más"). Nada más lleva sombra.
- Foco: `--contorno-foco` (2px azul, global en `:focus-visible`), `--anillo-foco` / `--anillo-foco-peligro` (campos).
- Capas: `--z-elevado` 10 · `pegajoso` 20 · `barra` 30 · `menu` 40 · `dialogo` 50. Movimiento: `--duracion-rapida` 120ms · `normal` 200 · `lenta` 320, `--curva`.
- **Eliminados** respecto a Tarima (no los uses): `--color-fondo` (→ `--color-papel`), `--color-grafito*`, `--color-sobre-grafito*`, `--color-acento-claro`, `--ancho-normal`, `--ancho-titulo`, `--ancho-cifra` (`font-stretch` ya no aplica: usa `font-family: var(--fuente-titulo)`), `--espaciado-mayusculas`, `--ancho-lateral`, `--radio-sm` (→ `--radio-md`), `--sombra-1/2/3` (→ `--sombra-flotante` / `--sombra-dialogo`).

## Breakpoints

Las variables no funcionan dentro de `@media`: escribe los valores **literales**, siempre estos. Móvil primero.

| Media query | Qué cambia |
|---|---|
| (sin media) | 0-639 px: una columna, barra superior compacta + pestañas inferiores |
| `@media (min-width: 640px)` | rejillas de 2 columnas, columna `meta` de `Fila`, `ListaDatos` lado a lado, `GrupoCifras` en una fila |
| `@media (min-width: 1024px)` | barra superior completa (sin pestañas inferiores), rejillas de 3-4 columnas, `principal`/`lateral` |
| `@media (min-width: 1280px)` | nombre del entrenador en la barra; solo si hace falta |
| `@media (max-width: 639px)` | excepciones solo-móvil (p. ej. diálogo como hoja inferior) |
| `@media (pointer: coarse)` | ya resuelto en tokens: controles de 44 px |

## CSS Modules: convenciones

- Archivo `x.module.css` **junto a** `x.tsx`; se importa como `import css from "./x.module.css";`.
- Clases en **español camelCase**. Estados con atributos ARIA (`&[aria-pressed="true"]`, `&[aria-current="page"]`) o clases (`.activo`).
- **Solo tokens**: nada de hex, rgb ni px/rem sueltos. Excepciones: breakpoints, `0`, porcentajes de layout y números de geometría SVG.
- Anidamiento CSS nativo (Lightning CSS). Composición con `cx()` de `@/lib/clases`.
- Todos los componentes de `ui/` aceptan `className` para posición (márgenes, ancho), no para recolorear.
- `base.css` vive en `@layer base`; los módulos ganan sin pelear especificidad. Sin `!important`, sin `:global`.
- Una variable CSS inexistente falla en silencio: tras renombrar, búscala con grep.
- Sin Tailwind.

## Cuándo usar contenedor

Solo lleva fondo blanco + borde (`Tarjeta`) lo que es **un objeto o una superficie de trabajo**, algo que el entrenador manipula:

- campos (ya lo traen), diálogos y la hoja "Más" (ya lo traen);
- la rejilla del calendario semanal;
- el panel del mapa corporal;
- el formulario abierto de una medición o nota en línea (`Tarjeta variante="hundida"`);
- el constructor de rutinas (cada bloque arrastrable);
- un hueco por llenar ("Agregar ejercicio": `variante="discontinua"`).

**No** llevan contenedor: secciones, listas de alumnos/citas/ejercicios, grupos de cifras, fichas de datos, estados vacíos, tablas. Van sobre el papel, separados por espacio y título.

## Catálogo: `src/components/ui/`

Reutiliza antes de crear. Todos son Server Components salvo `Dialogo` y `BotonEnvio` (cliente); los que aceptan funciones (`Fila alPulsar`, `Chip onClick`) se usan desde componentes cliente.

### Disposición: `disposicion.tsx`
`Espacio = 0|1|2|3|4|5|6|8|10|12|16`. Todos aceptan `as`, `className` y atributos HTML.
- `Pila({ espacio = 4 })`: columna con hueco uniforme.
- `Grupo({ espacio = 3, alinear = "centro"|"inicio"|"fin"|"base"|"estirar", justificar = "inicio"|"entre"|"fin"|"centro", envolver = true })`: fila que envuelve.
- `Rejilla({ columnas = 2|3|4|"principal"|"lateral"|"auto", espacio = 6, estirar })`. Siempre 1 columna en móvil.

### Disco y estado
- **Nuevo** `Disco({ tono: "verde"|"azul"|"rojo"|"amarillo"|"vacio", tamano = "pequeno"|"normal"|"grande"|"marca", etiqueta?, className? })` (`disco.tsx`): SVG con agujero real. Con `etiqueta` es `role="img"` + `aria-label`; sin ella, `aria-hidden` (el texto de al lado dice el estado). Tamaños 12/16/24/28 px.
```tsx
<Disco tono="azul" etiqueta="Confirmada" />            {/* solo, en una celda estrecha */}
<Grupo espacio={2}><Disco tono="verde" /> Completada</Grupo>
```
- `Insignia({ tono = "neutro", punto?, children })`: disco pequeño + texto en tinta, **sin pastilla de fondo**. `tono` acepta los nombres de disco (preferidos) o los semánticos de Tarima por compatibilidad: `exito`→verde, `acento`→azul, `peligro`→rojo, `aviso`→amarillo, `solida`→amarillo, `neutro`→sin disco (texto tenue de categoría; con `punto`, disco vacío). Iconos extra en `children` sobran: el disco ya es el icono.
- `InsigniaEstado({ estado })`: alumno activo → verde, inactivo → amarillo, archivado → vacío.
```tsx
<Insignia tono="rojo">No asistió</Insignia>
```

### Cifras
- `Cifra({ etiqueta, valor, unidad?, detalle?, tonoDetalle?: "exito"|"aviso"|"peligro", tamano = "normal"|"compacta"|"grande", href? })`: valor en Big Shoulders `3xl` con su unidad, etiqueta debajo en `sm` tenue. Es un par `<dt>/<dd>`: **va siempre dentro de `GrupoCifras`**. `compacta` (25 px) para textos como objetivos o fechas. `grande` existe por compatibilidad; no lo uses como patrón.
- `GrupoCifras({ etiqueta = "Resumen", columnas? })`: `<dl>` en línea, sin cajas ni divisores; 2 por fila en móvil, una sola fila desde 640 px. Máximo 4 cifras. `columnas={1}` las apila.
```tsx
<GrupoCifras etiqueta="Datos clave">
  <Cifra etiqueta="Peso actual" valor={numero(peso)} unidad="kg" detalle="−2,1 kg desde la primera medición" tonoDetalle="exito" />
  <Cifra etiqueta="Objetivo" valor={objetivo ?? "Sin definir"} tamano="compacta" />
</GrupoCifras>
```

### Contenedores
- `Seccion({ titulo, descripcion?, contador?, acciones?, nivel = 2|3, id? })`: `<section aria-labelledby>` con título Big Shoulders, **sin caja**. `contador` va en texto tenue junto al título. `tarjeta` está **deprecada** y no hace nada.
- `Tarjeta({ as, relleno = "normal"|"compacto"|"ninguno", variante = "superficie"|"hundida"|"discontinua" })`: **solo superficies de trabajo** (ver arriba). `superficie` = blanca, borde, radio 10. `TarjetaEnlace` está **deprecada** (kit de tarjetas): usa `Fila href`.

### Listas y datos
- `ListaFilas({ as = "ul"|"ol", etiqueta? })`: filas sobre el papel con regla fina entre ellas, sin caja. `plana` está **deprecada** (ya no hay caja).
- `Fila({ href? | alPulsar?, inicio?, titulo?, detalle?, meta?, fin?, chevron?, actual?, atenuada?, etiqueta?, children? })`: `href` → enlace en toda la fila; `alPulsar` → botón (`aria-pressed`). El fondo de hover y de `actual` (azul suave + barra azul) sobresale 12 px a cada lado para que el texto quede alineado con la página. `meta` solo ≥640 px; `atenuada` tacha el título.
```tsx
<ListaFilas>
  {alumnos.map((a) => (
    <Fila key={a.id} href={`/alumnos/${a.id}`} inicio={<Avatar iniciales={iniciales(a.nombres, a.apellidos)} />}
      titulo={`${a.apellidos}, ${a.nombres}`} detalle={a.telefono ?? "Sin datos de contacto"}
      meta={`Desde ${fechaCorta(a.fecha_inicio)}`} fin={<InsigniaEstado estado={a.estado} />} />
  ))}
</ListaFilas>
```
- `Tabla({ etiqueta })`: sobre el papel, cabecera en `sm` semi tenue (sin mayúsculas) con regla fuerte debajo, reglas finas entre filas, scroll horizontal propio. Numéricas con `data-numero` en `th` y `td`; la primera columna puede ser `<th scope="row">`.
- `ListaDatos({ datos: { termino, valor }[], disposicion = "lado"|"apilado" })`: `<dl>` para fichas.

### Acciones
- `Boton` / `EnlaceBoton` (`href`) con `{ variante = "primario"|"secundario"|"fantasma"|"peligro", tamano = "normal"|"pequeno"|"grande", soloIcono?, bloque? }`:
  - `primario`: **amarillo con texto tinta**. Uno por vista: la acción que toca ahora.
  - `secundario`: blanco con borde `--color-linea-fuerte`.
  - `fantasma`: sin fondo ("Cancelar", "Editar").
  - `peligro`: blanco, borde y texto rojos (archivar, eliminar), siempre con confirmación.
  - Sin sombras. `Boton` es `type="button"` por defecto; `soloIcono` exige `aria-label`. Iconos lucide como hijos con `aria-hidden`. Nada de "→".
- `clasesBoton(variante, extra?, opciones)`, `BotonEnvio({ textoPendiente, ...Boton })`.
- `Enlace({ href, variante = "acento"|"tenue"|"heredado" })`: `acento` azul **subrayado siempre** (no depende solo del color); `tenue` sin subrayado hasta el hover.

### Formularios y filtros
- `Campo`, `AreaTexto`, `Selector` con `{ etiqueta, nombre, errores?, ayuda?, opcional? }`; `Campo` admite `unidad` dentro del campo. Fondo blanco, borde `--color-linea-fuerte`, foco azul.
- `CampoBusqueda({ etiqueta, nombre = "q", ...input })`.
- `GrupoFiltros({ etiqueta, variante = "chips"|"segmentado" })` + `Chip({ activo?, quitable?, ...button })`. Radio 6 px (no pastillas). Activo = **tinta sólida** (`aria-pressed`). `quitable` = **azul** de selección + ✕ con `aria-label="Quitar …"`. `segmentado`: pieza blanca con borde; el segmento activo en tinta.
- `Pestanas({ etiqueta, pestanas: { href, texto, actual }[] })`: la actual con **barra amarilla** debajo (igual que la barra superior).
- `Dialogo({ abierto, alCerrar, titulo, ancho = "normal"|"amplio" })` (cliente): `<dialog>` nativo, título Big Shoulders, radio 10, `--sombra-dialogo`; hoja inferior en móvil.

### Mensajes y estados
- `Aviso({ tipo = "error"|"exito"|"aviso"|"info" })`: barra de 4 px a la izquierda en el color del tipo, fondo `-suave`, icono del color, texto en tinta. `error` → `role="alert"`, el resto `role="status"`.
- `EstadoVacio({ titulo, descripcion?, accion?, compacto? })`: texto alineado a la izquierda, sin caja ni icono (`icono` está **deprecado** y se ignora).
- `Esqueleto({ alto?, ancho?, forma })`, `EsqueletoLista({ filas, conAvatar })` (misma forma que `ListaFilas`).
- `Avatar({ iniciales, tamano, tono = "neutro"|"acento" })`: `neutro` gris hundido; `acento` = la cuenta del propio entrenador, **tinta sólida** (no color de disco).

### Texto
- `Texto({ as, tamano = "xs"|"sm"|"base"|"lg"|"xl", tono = "tinta"|"tenue"|"acento"|"exito"|"aviso"|"peligro", peso = "normal"|"medio"|"semi", cifra?, truncar?, tachado? })`. `cifra` = Big Shoulders tabular. `rotulo` está **deprecado**: se pinta como `sm` + `semi`, sin mayúsculas.
- Globales: `.sr-only`, `.cifra`.

### Shell y página (`src/components/app/`)
- `Encabezado({ titulo, descripcion?, acciones?, volver? })`: el único h1, Big Shoulders 39 → 61 px. Acciones a la derecha (envuelven en móvil), la primaria al final.
- `Marca({ href?, conNombre? })`: disco de caucho negro + "Blister". (`fondo` deprecado.)
- `Navegacion`, `UsuarioActual`, `Proximamente`: los pone el layout (salvo `Proximamente`).
- `MapaCorporal` (`src/components/anatomia/`): selección y músculo principal en azul. Ver skill `mapa-corporal`.

## El shell

- **Barra superior blanca** con regla inferior. Desde 1024 px: marca, Inicio, Alumnos, Entrenamiento, Ejercicios, Calendario, Progreso; Configuración y la cuenta a la derecha. La sección actual va en tinta con una **barra amarilla de 4 px** pegada al borde inferior (`aria-current="page"`). Los bordes de la barra coinciden con los del contenido (72rem).
- **Menos de 1024 px**: la misma barra, compacta (marca + iniciales + cerrar sesión), y **barra de pestañas inferior fija** con Inicio, Alumnos, Calendario, Ejercicios y "Más" (hoja con Entrenamiento, Progreso y Configuración). La pestaña actual lleva la barra amarilla **arriba** del icono, sin relleno.
- El layout aplica ancho máximo (`--ancho-contenido`), márgenes laterales (16 → 32 → 48 px) y el hueco inferior para las pestañas. **Las páginas no ponen márgenes exteriores ni `max-width` propios** (salvo `--ancho-lectura` para formularios y textos).
- Ruta actual con `usePathname()` dentro de `<Suspense>` (Cache Components); el fallback pinta los enlaces sin resaltar. Enlace "Saltar al contenido" (amarillo) al principio.
- Acceso (`src/app/(auth)`): una sola hoja de papel, sin panel partido ni eslogan. Formulario a la izquierda; a la derecha (debajo en móvil) qué es Blister en dos frases y la barra cargada sobre la tarima. No añadas más ilustración.

## Estructura estándar de página

```tsx
export default function PaginaAlumnos({ searchParams }: PageProps<"/alumnos">) {
  return (
    <>
      <Encabezado titulo="Alumnos" acciones={<EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden /> Nuevo alumno</EnlaceBoton>} />
      <Suspense fallback={<EsqueletoLista conAvatar />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </>
  );
}
// Lista: <Pila espacio={6}> filtros (Form) → ListaFilas | EstadoVacio | Aviso → recuento (<Texto tamano="sm" tono="tenue">)
```

- **Orden**: Encabezado (título + la acción principal amarilla) → lo que el entrenador necesita decidir hoy → el resto en secciones.
- **Ritmo vertical**: entre secciones `Pila espacio={10}` (12 en páginas largas); dentro de una sección `4`; entre campos `4`. El espacio separa, no las cajas.
- **Detalle de una entidad**: `Encabezado` → `GrupoCifras` (≤ 4) → `Pestanas` si hay vistas → secciones planas.
- **Panel + contenido** (mapa corporal, filtros grandes): `Rejilla columnas="lateral"`; el panel en `Tarjeta as="aside"` (es superficie de trabajo) con `position: sticky; top: var(--espacio-8)` desde 1024 px.
- **Metadatos en frases**: "Entrenamiento hasta las 7:00 a. m.", "3 alumnos, 1 sesión hoy". Nunca "·".
- **Estados**:
  - Cargando: `Suspense` con `EsqueletoLista` o `Esqueleto` con la forma del contenido.
  - Vacío: `EstadoVacio` con una frase y la acción para crear ("Aún no tienes alumnos" + "Registrar alumno").
  - Sin resultados: `EstadoVacio` sin crear; sugiere cambiar filtros.
  - Error: `<Aviso>No se pudieron cargar los alumnos. Recarga la página.</Aviso>`.
  - En progreso / éxito: `BotonEnvio textoPendiente="Guardando…"`; `<Aviso tipo="exito">` o `<Texto tono="exito" role="status">`.
- **Formularios**: `Pila` dentro de `<form>` con `max-width: var(--ancho-lectura)`; grupos con `<fieldset>` + `<legend>` (estilo de título de sección nivel 3: Big Shoulders `xl`); campos en `Rejilla columnas={2} espacio={4}`; acciones al final en `Grupo` (primario amarillo + `fantasma` "Cancelar").
- **Formulario en línea** (medición, nota): `Tarjeta variante="hundida"`.
- **Destructivo**: variante `peligro` y confirmación que explique la consecuencia. Preferir archivar a borrar.
- **Drag & drop** (constructor de rutinas, @dnd-kit): siempre con alternativa por botones.

## Responsive

- Diseña primero a 400 px. Nada desborda horizontalmente: `min-width: 0` en hijos de flex/grid, `overflow-wrap: anywhere` o truncado.
- Tablas anchas dentro de `Tabla`. Vistas densas (rejilla semanal) tienen versión móvil propia (agenda por días).
- Barras de acciones con `Grupo`. Botón `bloque` solo en formularios estrechos como los de acceso.

## Accesibilidad (mínimos)

- Un solo `h1` (`Encabezado`). Cada `section` con `aria-labelledby` (`Seccion`).
- Iconos decorativos con `aria-hidden`; botones solo-icono con `aria-label`. Discos sin texto al lado: `etiqueta`.
- Selección con `aria-pressed` / `aria-checked` / `aria-current`, nunca solo color.
- Mensajes asíncronos con `role="status"`; errores con `role="alert"`.
- Foco visible siempre (contorno azul global). Objetivos táctiles ≥ 44 px en táctil.
- `prefers-reduced-motion` resuelto globalmente.
- Contraste: texto ≥ 4.5:1. El amarillo nunca es texto; `--color-sutil` nunca es texto necesario.

## Tono del texto

- Español neutro de Colombia, tuteo, frases cortas: "Registra el primero para empezar a planificar su entrenamiento."
- Dominio del entrenador (alumno, sesión, plan, serie), nunca la técnica (registro, fila, payload).
- Botones con el verbo de lo que pasa: "Agendar sesión", "Guardar medición". La misma acción conserva el nombre en todo el flujo ("Guardar medición" → "Medición guardada").
- Fechas y números con `src/lib/formato.ts` (`fechaCorta`, `hora`, `numero`), nunca `toLocaleString` suelto.
- Sin estadísticas de vanidad: cada cifra debe ayudar a decidir algo hoy.
