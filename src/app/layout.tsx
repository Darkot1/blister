import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Blister Fitness", template: "%s | Blister Fitness" },
  description: "Gestión de alumnos y entrenamiento personalizado.",
};

export const viewport: Viewport = {
  themeColor: "#f3f2ee",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
