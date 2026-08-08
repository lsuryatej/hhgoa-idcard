import { ImageResponse } from "next/og";
import { resolveShare } from "@/lib/blob";

export const runtime = "nodejs";
export const alt = "Hacker House Goa 2026 frame";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deliberately text-free: the generated graphic already carries every word of
// branding, and skipping text means this route needs no font payload at all.
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const url = await resolveShare(id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b6839",
          padding: 26,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            border: "6px solid #000000",
            background: "#074f2b",
            boxShadow: "0 0 0 6px #fee101",
          }}
        >
          {url ? (
            <img
              src={url}
              width={1148}
              height={566}
              style={{ objectFit: "contain" }}
            />
          ) : null}
        </div>
      </div>
    ),
    size
  );
}
