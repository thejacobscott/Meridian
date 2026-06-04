/**
 * Client-side image compression for Memory uploads. Phones produce 3–12 MB
 * photos; the scrapbook only ever shows them a few hundred px wide, so we
 * downscale to a sane max edge and re-encode before anything is stored. Keeps
 * IndexedDB (preview) — and one day Supabase Storage — from filling with
 * full-resolution originals. Everything degrades gracefully: any failure falls
 * back to the original file so an upload never silently disappears.
 */

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
}

const MAX_EDGE = 1600;
const QUALITY = 0.82;

function passthrough(file: File): CompressResult {
  return {
    blob: file,
    width: 0,
    height: 0,
    mime: file.type || "application/octet-stream",
  };
}

export async function compressImage(file: File): Promise<CompressResult> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return passthrough(file);
  }
  try {
    const source = await loadImage(file);
    const sw =
      "naturalWidth" in source ? source.naturalWidth : source.width;
    const sh =
      "naturalHeight" in source ? source.naturalHeight : source.height;
    if (!sw || !sh) {
      closeBitmap(source);
      return passthrough(file);
    }

    const { width, height } = fit(sw, sh, MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      closeBitmap(source);
      return passthrough(file);
    }
    ctx.drawImage(source, 0, 0, width, height);
    closeBitmap(source);

    // Keep WebP as WebP; everything else (incl. PNG screenshots, HEIC the
    // browser decoded) re-encodes to JPEG, which is right for photographs.
    const outMime = file.type === "image/webp" ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outMime, QUALITY);
    if (!blob) return passthrough(file);
    return { blob, width, height, mime: outMime };
  } catch {
    return passthrough(file);
  }
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
    } catch {
      // older engines / unsupported type — fall back to <img>
    }
  }
  return loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

function closeBitmap(source: ImageBitmap | HTMLImageElement): void {
  if ("close" in source && typeof source.close === "function") source.close();
}

/** Scale to fit within `max` on the longest edge; never upscales. */
function fit(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = Math.min(max / w, max / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}
