import { Grupo, Pila } from "@/components/ui/disposicion";
import { Insignia } from "@/components/ui/insignia";
import { Fila, ListaFilas } from "@/components/ui/lista-filas";
import { Seccion } from "@/components/ui/seccion";
import css from "./funciones-previstas.module.css";

export type FuncionPrevista = {
  titulo: string;
  descripcion: string;
  /** Cuándo llega según docs/hoja-de-ruta.md: "Siguiente", "Después de los planes"… */
  cuando: string;
};

/**
 * Complemento de `Proximamente`: qué traerá la sección, en qué orden, y qué puede hacer el entrenador mientras tanto.
 * Candidato a fusionarse con `Proximamente` en src/components/app.
 */
export function FuncionesPrevistas({
  funciones,
  mientras,
}: {
  funciones: FuncionPrevista[];
  /** Enlaces a lo que ya existe y cubre parte de la necesidad. */
  mientras?: { texto: React.ReactNode; acciones: React.ReactNode };
}) {
  return (
    <Pila espacio={10} className={css.contenedor}>
      <Seccion titulo="Qué llegará" descripcion="En el orden de la hoja de ruta.">
        <ListaFilas as="ol">
          {funciones.map((f) => (
            <Fila key={f.titulo}>
              <div className={css.funcion}>
                <div className={css.cabecera}>
                  <p className={css.titulo}>{f.titulo}</p>
                  <Insignia>{f.cuando}</Insignia>
                </div>
                <p className={css.descripcion}>{f.descripcion}</p>
              </div>
            </Fila>
          ))}
        </ListaFilas>
      </Seccion>
      {mientras && (
        <Seccion titulo="Mientras tanto" descripcion={mientras.texto} nivel={3}>
          <Grupo espacio={2}>{mientras.acciones}</Grupo>
        </Seccion>
      )}
    </Pila>
  );
}
