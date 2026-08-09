// Photo intake. Handles whatever a phone throws at us: HEIC/HEIF from iPhone,
// JPEG with a rotation-only EXIF tag, huge 48MP originals, PNG with alpha.

const MAX_EDGE = 2200; // downscale before we ever touch the canvas, for speed

// A 50MB+ original (uncompressed TIFF, RAW-adjacent export, a burst-mode
// PNG screenshot) can hang the tab for tens of seconds trying to decode
// before we ever get to downscale it. Reject early with a clear reason
// instead of leaving the busy indicator spinning with no explanation.
const MAX_FILE_BYTES = 45 * 1024 * 1024;

export class PhotoError extends Error {}

export type Photo = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
};

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  // iOS sometimes hands over an empty MIME type, so fall back to the extension.
  return /\.(heic|heif)$/i.test(file.name);
}

async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  // `from-image` makes the browser bake EXIF orientation into the pixels, which
  // is what stops portrait iPhone shots from landing sideways.
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

async function decodeViaElement(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downscale(bitmap: ImageBitmap): ImageBitmap | Promise<ImageBitmap> {
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_EDGE) return bitmap;
  const scale = MAX_EDGE / longest;
  return createImageBitmap(bitmap, {
    resizeWidth: Math.round(bitmap.width * scale),
    resizeHeight: Math.round(bitmap.height * scale),
    resizeQuality: "high",
  });
}

export async function loadPhoto(file: File): Promise<Photo> {
  if (file.size > MAX_FILE_BYTES) {
    throw new PhotoError(
      `That photo is ${(file.size / 1024 / 1024).toFixed(0)}MB, too large to ` +
        "read here. Try a screenshot of it or re-export at a smaller size."
    );
  }

  let source: Blob = file;

  if (isHeic(file)) {
    // Safari decodes HEIC natively; everyone else needs the wasm path. Try the
    // cheap route first so iPhone users on Safari never pay the 1.5MB download.
    try {
      const native = await toBitmap(file);
      const scaled = await downscale(native);
      return { bitmap: scaled, width: scaled.width, height: scaled.height };
    } catch {
      const { heicTo } = await import("heic-to");
      source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await toBitmap(source);
  } catch {
    bitmap = await decodeViaElement(source);
  }

  const scaled = await downscale(bitmap);
  return { bitmap: scaled, width: scaled.width, height: scaled.height };
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}
