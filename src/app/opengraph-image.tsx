import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Distillr - YouTube research library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#09090b",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
        padding: "80px",
      }}
    >
      {/* Logo/wordmark */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 700,
          color: "#fafafa",
          letterSpacing: "-2px",
          marginBottom: 28,
        }}
      >
        Distillr
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 32,
          color: "#a1a1aa",
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.4,
        }}
      >
        Your YouTube research, finally searchable.
      </div>

      {/* Sub tagline */}
      <div
        style={{
          fontSize: 20,
          color: "#52525b",
          marginTop: 24,
          textAlign: "center",
        }}
      >
        Add your sources. Ask anything. Get cited answers with timestamp links.
      </div>
    </div>,
    { ...size }
  );
}
