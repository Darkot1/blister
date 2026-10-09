import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { FotoPerfil } from "@/components/app/foto-perfil";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Tarjeta, Vacio } from "@/components/ui/tarjeta";
import { fechaCorta, fechaHora } from "@/lib/formato";
import { exigirSuperadmin } from "@/lib/sesion";
import { Cifra, InsigniaEspacio, PestanasAdmin, ROL } from "../comun";

export const metadata: Metadata = { title: "Usuarios · Administración" };

const PROVEEDOR: Record<string, string> = { email: "Correo", google: "Google" };

type EspacioDeUsuario = { id: string; nombre: string; estado: string; rol: string };

export default function PaginaUsuarios() {
  return (
    <>
      <Encabezado
        titulo="Usuarios"
        miga="Plataforma"
        descripcion="Todas las cuentas registradas: cómo ingresan, cuándo y en qué espacio trabajan."
        acciones={<PestanasAdmin activa="usuarios" />}
      />
      <Suspense fallback={<EsqueletoLista filas={6} />}>
        <ListaUsuarios />
      </Suspense>
    </>
  );
}

async function ListaUsuarios() {
  const { supabase } = await exigirSuperadmin();
  const { data, error } = await supabase.rpc("admin_usuarios");
  if (error) throw new Error("No se pudieron cargar los usuarios.");
  const usuarios = data ?? [];

  if (usuarios.length === 0) {
    return <Vacio icono={<Users className="size-5" />} titulo="Sin usuarios" texto="Aún no se ha registrado nadie." />;
  }

  // La hora actual se lee después del acceso dinámico (Cache Components).
  const hace7 = new Date().getTime() - 7 * 86400e3;
  const conGoogle = usuarios.filter((u) => u.proveedores.includes("google")).length;
  const activos = usuarios.filter((u) => u.ultimo_ingreso && new Date(u.ultimo_ingreso).getTime() >= hace7).length;
  const sinEspacio = usuarios.filter((u) => (u.espacios as EspacioDeUsuario[]).length === 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-linea lg:grid-cols-4">
        <Cifra titulo="Usuarios" valor={usuarios.length} />
        <Cifra titulo="Activos · 7 días" valor={activos} />
        <Cifra titulo="Con Google" valor={conGoogle} nota={`${usuarios.length - conGoogle} solo con correo`} />
        <Cifra titulo="Sin espacio" valor={sinEspacio} nota="No pertenecen a ningún espacio" />
      </div>

      <Tarjeta className="overflow-hidden">
        <CabeceraTarjeta titulo={`Cuentas · ${usuarios.length}`} />
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-linea text-left whitespace-nowrap">
                <th scope="col" className="etiqueta px-4 py-2.5 font-medium">Usuario</th>
                <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Espacio y rol</th>
                <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Ingresa con</th>
                <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Último ingreso</th>
                <th scope="col" className="etiqueta px-3 py-2.5 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {usuarios.map((u) => {
                const nombre = `${u.nombres} ${u.apellidos}`.trim();
                const espacios = u.espacios as EspacioDeUsuario[];
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FotoPerfil url={u.avatar_url} nombres={u.nombres} apellidos={u.apellidos} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {nombre || "Sin nombre"}
                            {u.es_superadmin && <ShieldCheck aria-label="Superadministrador" className="size-3.5 shrink-0 text-acento" />}
                          </p>
                          <p className="truncate text-tenue">
                            {u.correo ?? "—"}
                            {!u.confirmado && <span className="ml-1.5 text-xs text-aviso">sin confirmar</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {espacios.length === 0 ? (
                        <span className="text-tenue">Sin espacio</span>
                      ) : (
                        <ul className="space-y-1">
                          {espacios.map((e) => (
                            <li key={e.id} className="flex items-center gap-2">
                              <Link href={`/admin/espacios/${e.id}`} className="truncate underline decoration-linea underline-offset-2 hover:decoration-tinta">
                                {e.nombre}
                              </Link>
                              <span className="text-xs text-tenue">{ROL[e.rol] ?? e.rol}</span>
                              {e.estado !== "activo" && <InsigniaEspacio estado={e.estado} />}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3 text-tenue">{u.proveedores.map((p) => PROVEEDOR[p] ?? p).join(" y ") || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-tenue">{u.ultimo_ingreso ? fechaHora(u.ultimo_ingreso) : "Nunca"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-tenue">{fechaCorta(u.creado_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
