import { CircleAlert, CircleCheck } from "lucide-react";

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "exito"; children: React.ReactNode }) {
  const error = tipo === "error";
  const Icono = error ? CircleAlert : CircleCheck;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
        error ? "border-peligro/25 bg-peligro/[0.05] text-peligro" : "border-exito/25 bg-exito/[0.06] text-exito"
      }`}
    >
      <Icono aria-hidden className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
