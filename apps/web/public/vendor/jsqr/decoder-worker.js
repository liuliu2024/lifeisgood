// Lifeisgood local-only adapter. jsQR itself is retained unmodified alongside it.
let loaded = false;
try { importScripts("./jsQR.js"); loaded = typeof self.jsQR === "function"; } catch {}
self.postMessage({ type: loaded ? "ready" : "load-error" });
self.onmessage = event => {
  if (!loaded) return;
  try {
    const { buffer, width, height } = event.data;
    if (!(buffer instanceof ArrayBuffer) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 8000000 || buffer.byteLength !== width * height * 4) throw Error("无效解码像素。");
    const code = self.jsQR(new Uint8ClampedArray(buffer), width, height, { inversionAttempts: "attemptBoth" });
    if (!code) { self.postMessage({ type: "not-found" }); return; }
    if (typeof code.data !== "string" || code.data.length > 6000 || !Array.isArray(code.binaryData) || code.binaryData.length > 4000) throw Error("二维码内容超出输出上限。");
    self.postMessage({ type: "result", text: code.data, bytes: code.binaryData, version: code.version });
  } catch { self.postMessage({ type: "error", message: "图片解码失败或内容超过限制，请换一张更清楚的图片。" }); }
};
