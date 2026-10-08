import { CircleAlert, CircleCheck } from "lucide-react";

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "exito"; children: React.ReactNode }) {
  const error = tipo === "error";
  const Icono = error ? CircleAlert : CircleCheck;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${
        error ? "bg-peligro/10 text-peligro" : "bg-exito/10 text-exito"
      }`}
    >
      <Icono aria-hidden className="mt-px size-[18px] shrink-0" />
      <span>{children}</span>
    </p>
  );
}
