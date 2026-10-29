import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource-variable/geist";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";
import { SCRIPT_INICIAL } from "@/components/app/scripts-iniciales";
import { ProveedorMovimiento } from "@/components/app/proveedor-movimiento";
import { DESCRIPCION_SITIO, NOMBRE_SITIO, URL_SITIO } from "@/lib/sitio";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: { default: NOMBRE_SITIO, template: `%s | ${NOMBRE_SITIO}` },
  description: DESCRIPCION_SITIO,
  applicationName: NOMBRE_SITIO,
  openGraph: { siteName: NOMBRE_SITIO, locale: "es_CO", type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#171721" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Los scripts de tema y de menú ponen data-tema y data-menu antes de hidratar: por eso se ignora esa diferencia.
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_INICIAL }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#contenido"
          className="sr-only z-50 rounded-full bg-acento px-4 py-2 text-sm text-sobre-acento focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Saltar al contenido
        </a>
        <ProveedorMovimiento>{children}</ProveedorMovimiento>
        {/* Visitas y velocidad real de carga en Vercel: sin cookies ni datos personales. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
