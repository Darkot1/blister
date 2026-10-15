import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/source-serif-4/opsz.css";
import "./globals.css";
import { SCRIPT_TEMA } from "@/components/app/selector-tema";

export const metadata: Metadata = {
  title: { default: "Blister Fitness", template: "%s | Blister Fitness" },
  description: "Gestión de alumnos y entrenamiento personalizado.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1e1c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // El script de tema pone data-tema antes de hidratar: por eso se ignora esa diferencia.
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
