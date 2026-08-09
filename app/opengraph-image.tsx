import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Hacker House Goa 2026 — Frame & Builder ID Card Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            border: "8px solid #000000",
            background: "#074f2b",
            boxShadow: "0 0 0 8px #fee101",
            padding: 40,
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 58,
              fontWeight: 900,
              color: "#fee101",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              textAlign: "center",
            }}
          >
            HACKER HOUSE GOA 2026
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#fffbe8",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              textAlign: "center",
              background: "#ff0080",
              padding: "12px 28px",
              border: "4px solid #000000",
              boxShadow: "4px 4px 0 #000000",
            }}
          >
            BUILDER PASS & PFP FRAME GENERATOR
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#fffbe8",
              letterSpacing: "0.18em",
              fontFamily: "monospace",
              marginTop: 12,
            }}
          >
            28-31 OCT 2026 · GOA · #FRAMEINGOA
          </div>
        </div>
      </div>
    ),
    size
  );
}
