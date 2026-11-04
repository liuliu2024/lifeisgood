export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PIXELS = 16_000_000;
export type PhotoInfo = { width: number; height: number; mime: "image/png" | "image/jpeg" };
export async function inspectPhoto(file: File): Promise<PhotoInfo> {
  if (!file.size) throw new Error("图片为空，请重新选择。");
  if (file.size > MAX_BYTES) throw new Error("图片超过 10 MiB，请先选择较小的原图。");
  const b = new Uint8Array(await file.arrayBuffer());
  let width = 0, height = 0;
  let mime: PhotoInfo["mime"];
  if (b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[12] === 73 && b[13] === 72 && b[14] === 68 && b[15] === 82) {
    const d = new DataView(b.buffer); width = d.getUint32(16); height = d.getUint32(20); mime = "image/png";
  } else if (b[0] === 255 && b[1] === 216) {
    mime = "image/jpeg";
    let p = 2;
    while (p + 8 < b.length) {
      if (b[p++] !== 255) break;
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const len = (b[p] << 8) | b[p + 1];
      if (len < 2 || p + len > b.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        height = (b[p + 3] << 8) | b[p + 4]; width = (b[p + 5] << 8) | b[p + 6]; break;
      }
      p += len;
    }
  } else throw new Error("目前支持 JPG 和 PNG 静态图片，不支持 SVG、GIF、HEIC 或伪装格式。");
  if (!width || !height) throw new Error("无法读取图片尺寸，文件可能已损坏。");
  if (width * height > MAX_PIXELS || width > 16000 || height > 16000) throw new Error("图片尺寸超过 1600 万像素或单边 16000 像素上限。");
  return { width, height, mime };
}
export function sizeText(n: number) { return n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(2) + " MiB" : Math.max(1, Math.round(n / 1024)) + " KiB"; }
export function canvasBlob(canvas: HTMLCanvasElement, type: string, quality = .9): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("图片导出失败，请换一张图片重试。")), type, quality));
}
export async function decodePhoto(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); return img; }
  catch { throw new Error("浏览器无法打开这张图片，文件可能已损坏。"); }
  finally { URL.revokeObjectURL(url); }
}
