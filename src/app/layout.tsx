import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { SCRIPT_TEMA } from "@/components/app/selector-tema";

export const metadata: Metadata = {
  title: { default: "Blister Fitness", template: "%s | Blister Fitness" },
  description: "Gestión de alumnos y entrenamiento personalizado.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#171721" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // El script de tema pone data-tema antes de hidratar: por eso se ignora esa diferencia.
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-acento px-4 py-2 text-sm text-sobre-acento focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
