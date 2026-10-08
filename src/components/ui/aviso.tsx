export function Aviso({ tipo = "error", children }: { tipo?: "error" | "exito"; children: React.ReactNode }) {
  const estilos =
    tipo === "error" ? "border-peligro/30 bg-peligro/5 text-peligro" : "border-exito/30 bg-exito/5 text-exito";
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </p>
  );
}
