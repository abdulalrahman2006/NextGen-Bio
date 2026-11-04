export type Shrunk = { blob: Blob; ext: string; type: string };

const extOf = (f: File) => (f.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));

/**
 * Makes a picture smaller in the browser before it is uploaded: scales the longest side down to maxSide
 * and saves it as WebP (or JPEG where WebP is not available). GIFs are left alone so animations keep working.
 * If anything goes wrong, or the result is not smaller, the original file is used.
 */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<Shrunk> {
  const original: Shrunk = { blob: file, ext: extOf(file), type: file.type };
  if (!file.type.startsWith("image/") || file.type === "image/gif") return original;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bmp, 0, 0, w, h);
    let out = await toBlob(canvas, "image/webp", quality);
    if (!out || out.type !== "image/webp") { // older Safari cannot save WebP
      ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
      out = await toBlob(canvas, "image/jpeg", quality);
    }
    bmp.close?.();
    if (!out || (scale === 1 && out.size >= file.size)) return original;
    return { blob: out, ext: out.type === "image/webp" ? "webp" : "jpg", type: out.type };
  } catch {
    return original;
  }
}
