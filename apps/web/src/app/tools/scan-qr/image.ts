export function dimensions(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = bytes.length;
  const ascii = (p: number, s: string) => p + s.length <= n && [...s].every((c, i) => bytes[p + i] === c.charCodeAt(0));
  let width = 0, height = 0, type = "";
  if (n >= 33 && bytes[0] === 137 && ascii(1, "PNG\r\n\x1a\n") && v.getUint32(8) === 13 && ascii(12, "IHDR")) {
    width = v.getUint32(16); height = v.getUint32(20); type = "image/png";
    for (let p = 8; p + 12 <= n;) { const length = v.getUint32(p); if (length > n - p - 12) throw new Error("PNG数据不完整。"); if (ascii(p + 4, "acTL")) throw new Error("暂不支持动画PNG，请导出为单张静态图片。"); if (ascii(p + 4, "IDAT")) break; p += length + 12; }
  } else if (n > 4 && bytes[0] === 255 && bytes[1] === 216) {
    type = "image/jpeg";
    let p = 2;
    while (p + 3 < n) {
      if (bytes[p++] !== 255) throw new Error("JPEG标记不完整。");
      while (p < n && bytes[p] === 255) p++;
      const marker = bytes[p++]; if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (p + 2 > n) break; const length = v.getUint16(p); if (length < 2 || p + length > n) throw new Error("JPEG数据不完整。");
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { if (length < 8) break; height = v.getUint16(p + 3); width = v.getUint16(p + 5); break; } p += length;
    }
  } else if (n >= 30 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    type = "image/webp";
    if (v.getUint32(4, true) + 8 > n) throw new Error("WebP数据不完整。");
    if (ascii(12, "VP8X")) { if (bytes[20] & 2) throw new Error("暂不支持动画WebP，请导出单张图片。"); width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16); }
    else if (ascii(12, "VP8 ") && ascii(23, "\x9d\x01\x2a")) { width = v.getUint16(26, true) & 16383; height = v.getUint16(28, true) & 16383; }
    else if (ascii(12, "VP8L") && bytes[20] === 47) { const bits = v.getUint32(21, true); width = (bits & 16383) + 1; height = (bits >>> 14 & 16383) + 1; }
  }
  if (!width || !height || !type) throw new Error("只支持结构完整的静态PNG、JPEG、WebP图片，不支持SVG、GIF或伪装文件。");
  if (width > 4096 || height > 4096 || width * height > 8000000) throw new Error("图片过大：每边最多4096像素，总计800万像素。请先缩小图片。");
  return { width, height, type };
}
