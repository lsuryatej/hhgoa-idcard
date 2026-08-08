import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

// Short, URL-safe, non-sequential. Enough entropy that share links are not
// guessable, which matters because these carry someone's face.
function makeId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob storage not configured" },
      { status: 503 }
    );
  }

  const body = await request.arrayBuffer();
  if (!body.byteLength) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "image too large" }, { status: 413 });
  }

  // PNG magic number, so this endpoint cannot be used to host arbitrary files.
  const head = new Uint8Array(body.slice(0, 8));
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!PNG.every((b, i) => head[i] === b)) {
    return NextResponse.json({ error: "png required" }, { status: 415 });
  }

  const id = makeId();
  try {
    await put(`f/${id}.png`, body, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
  } catch {
    return NextResponse.json({ error: "upload failed" }, { status: 502 });
  }

  return NextResponse.json({ id });
}
