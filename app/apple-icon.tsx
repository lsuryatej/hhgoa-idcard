import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b6839",
          color: "#fee101",
          border: "6px solid #000000",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: "0.08em",
            fontFamily: "monospace",
          }}
        >
          GOA
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            background: "#ff0080",
            color: "#fffbe8",
            padding: "4px 14px",
            border: "3px solid #000000",
            fontFamily: "monospace",
          }}
        >
          2026
        </div>
      </div>
    ),
    size
  );
}
