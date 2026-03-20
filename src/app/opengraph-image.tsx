import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Distillr - YouTube research library";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#fafafa",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          fontSize: 88,
          fontWeight: 700,
          color: "#0a0a0a",
          lineHeight: 1,
        }}
      >
        Distillr
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          color: "#52525b",
          textAlign: "center",
          marginTop: 20,
          fontFamily: "Georgia, serif",
        }}
      >
        Your YouTube research, finally searchable.
      </div>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "36px",
        }}
      >
        {[
          "Cited answers with timestamps",
          "Search across all your videos",
          "Auto-syncing libraries",
        ].map((text) => (
          <div
            key={text}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "9999px",
              padding: "8px 18px",
              fontSize: 15,
              color: "#71717a",
              background: "rgba(255,255,255,0.9)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#d8f999",
                flexShrink: 0,
              }}
            />
            {text}
          </div>
        ))}
      </div>

      {/* URL footer */}
      <div
        style={{
          position: "absolute",
          bottom: "28px",
          fontSize: 16,
          color: "#a1a1aa",
          letterSpacing: "0.5px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        distillr.co
      </div>
    </div>,
    { ...size },
  );
}
