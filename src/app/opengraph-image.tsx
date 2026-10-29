import { ImageResponse } from "next/og";

// Lo que se ve al compartir el enlace (WhatsApp, redes, buscadores). Se genera en el build.
export const alt = "Blister Fitness: agenda, alumnos, rutinas y progreso para entrenadores personales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(82,102,235,0.35), #12121b 70%)",
          backgroundColor: "#12121b",
          color: "#f5f5f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 32, background: "#f5f5f8", alignItems: "center", justifyContent: "center" }}>
            <svg width="36" height="36" viewBox="0 0 20 20" fill="#171721">
              <rect x="2" y="7.5" width="16" height="5" rx="1" opacity="0.35" />
              <rect x="4" y="3" width="3" height="14" rx="1" />
              <rect x="8.5" y="5" width="3" height="10" rx="1" />
              <rect x="13" y="3" width="3" height="14" rx="1" />
            </svg>
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, display: "flex", gap: 14, alignItems: "baseline" }}>
            Blister
            <span style={{ fontSize: 20, letterSpacing: 3, color: "rgba(245,245,248,0.55)" }}>FITNESS</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.08, maxWidth: 900 }}>Tu día de entrenador, en una sola página.</div>
          <div style={{ fontSize: 32, color: "rgba(245,245,248,0.7)" }}>Agenda, alumnos, rutinas y progreso para entrenadores personales.</div>
        </div>
        <div style={{ display: "flex", height: 8, width: 160, borderRadius: 4, background: "#5266eb" }} />
      </div>
    ),
    size,
  );
}
