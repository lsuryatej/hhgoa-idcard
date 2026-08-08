import { head } from "@vercel/blob";

const ID = /^[a-z2-9]{6,32}$/;

/** Resolves a share id to its public blob URL, or null if it does not exist. */
export async function resolveShare(id: string): Promise<string | null> {
  if (!ID.test(id) || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(`f/${id}.png`);
    return meta.url;
  } catch {
    return null;
  }
}
