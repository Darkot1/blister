import type { Metadata, Viewport } from "next";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Blister Fitness", template: "%s | Blister Fitness" },
  description: "Gestión de alumnos y entrenamiento personalizado.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
