// Inspect dimensions before asking the browser to decode a potentially huge image.
// This is a bounded header check, not a full image-file validator.
export function rasterDimensions(buffer: ArrayBuffer): { width: number; height: number } {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const text = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  const invalid = () => new Error("图片无法读取尺寸，请重新导出为正常的PNG、JPEG或WebP图片。");
  let width = 0, height = 0;
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 3) === "PNG" && text(12, 4) === "IHDR") {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 255) throw invalid();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) throw invalid();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw invalid();
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 7) throw invalid();
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += length;
    }
  } else if (bytes.length >= 30 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const kind = text(offset, 4), length = view.getUint32(offset + 4, true), data = offset + 8;
      if (data + length > bytes.length) throw invalid();
      if (kind === "VP8X" && length >= 10) {
        if (bytes[data] & 2) throw new Error("暂不处理动态WebP，请先导出为静态图片。");
        width = 1 + bytes[data + 4] + (bytes[data + 5] << 8) + (bytes[data + 6] << 16);
        height = 1 + bytes[data + 7] + (bytes[data + 8] << 8) + (bytes[data + 9] << 16); break;
      }
      if (kind === "VP8 " && length >= 10 && text(data + 3, 3) === "\x9d\x01\x2a") {
        width = view.getUint16(data + 6, true) & 16383; height = view.getUint16(data + 8, true) & 16383; break;
      }
      if (kind === "VP8L" && length >= 5 && bytes[data] === 47) {
        const packed = view.getUint32(data + 1, true);
        width = (packed & 16383) + 1; height = ((packed >>> 14) & 16383) + 1; break;
      }
      offset = data + length + (length & 1);
    }
  }
  if (!width || !height) throw invalid();
  return { width, height };
}
