import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OptimizaCRM - CRM con IA para PYMEs · LATAM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "60px 80px",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: "-2px",
            display: "flex",
          }}
        >
          <span style={{ color: "#ea580c" }}>Optimiza</span>
          <span style={{ color: "#ffffff" }}>CRM</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#cbd5e1",
            fontWeight: 400,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          CRM con IA para PYMEs · LATAM
        </div>

        {/* Separator */}
        <div
          style={{
            width: 80,
            height: 4,
            background: "#ea580c",
            borderRadius: 2,
          }}
        />

        {/* Value props */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 8,
          }}
        >
          {["Pipeline Visual", "Lead Scoring IA", "Voz IA 24/7"].map((label) => (
            <div
              key={label}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 12,
                padding: "12px 24px",
                fontSize: 22,
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 80,
            fontSize: 20,
            color: "#475569",
          }}
        >
          optimizacrm.com
        </div>
      </div>
    ),
    { ...size }
  );
}
