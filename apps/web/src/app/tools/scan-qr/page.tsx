"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./scan-qr.module.css";
import { dimensions } from "./image";
type Output = { text: string; json: string; txt: string; version: number };
export default function ScanQrTool() {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(""), [output, setOutput] = useState<Output | null>(null), [busy, setBusy] = useState(false), [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("请选择一张含二维码的静态图片。不会访问其中的网址。");
  const generation = useRef(0), worker = useRef<Worker | null>(null), cancel = useRef<(() => void) | null>(null), urls = useRef<string[]>([]);
  function stop() { generation.current++; cancel.current?.(); cancel.current = null; worker.current?.terminate(); worker.current = null; setBusy(false); }
  function clear() { stop(); urls.current.splice(0).forEach(URL.revokeObjectURL); setOutput(null); setPreview(""); }
  useEffect(() => {
    const release = () => { generation.current++; cancel.current?.(); cancel.current = null; worker.current?.terminate(); worker.current = null; urls.current.splice(0).forEach(URL.revokeObjectURL); };
    window.addEventListener("pagehide", release);
    return () => { window.removeEventListener("pagehide", release); release(); };
  }, []);
  async function read() {
    clear(); setFailed(false); const token = generation.current; setBusy(true);
    let bitmap: ImageBitmap | null = null, acceptingBitmap = true;
    const bounded = <T,>(job: Promise<T>, message: string) => new Promise<T>((resolve, reject) => { const timer = setTimeout(() => reject(new Error(message)), 8000); cancel.current = () => { clearTimeout(timer); reject(new Error("本次读取已取消。")); }; job.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); }); });
    try {
      if (!file) throw new Error("请先选择图片。");
      if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("图片不能为空，文件最多8MiB。");
      const buffer = await bounded(file.arrayBuffer().catch(() => { throw new Error("文件读取失败，请重新选择本机图片。"); }), "读取文件超时，请重试。"); if (token !== generation.current) return;
      const info = dimensions(new Uint8Array(buffer)), blob = new Blob([buffer], { type: info.type });
      const decoding = createImageBitmap(blob).catch(() => { throw new Error("图片数据损坏或浏览器不支持此图片，请换图重试。"); }); decoding.then(image => { if (!acceptingBitmap || token !== generation.current) image.close(); }).catch(() => {});
      bitmap = await bounded(decoding, "图片解析超时，请换一张静态图片。"); if (token !== generation.current) return;
      const width = bitmap.width, height = bitmap.height;
      if (!width || !height || width > 4096 || height > 4096 || width * height > 8000000) throw new Error("解码后的图片超过4096边长或800万像素上限。");
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("当前浏览器不能读取图片像素。");
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height); context.drawImage(bitmap, 0, 0); bitmap.close(); bitmap = null;
      const pixels = context.getImageData(0, 0, width, height).data; canvas.width = 0; canvas.height = 0;
      const imageUrl = URL.createObjectURL(blob); urls.current.push(imageUrl); setPreview(imageUrl); setStatus("正在本机Worker中查找一个二维码，最多8秒，可随时取消。");
      const result = await new Promise<{ text: string; bytes: number[]; version: number } | null>((resolve, reject) => {
        const job = new Worker("/vendor/jsqr/decoder-worker.js"); worker.current = job;
        const timer = setTimeout(() => { job.terminate(); setFailed(true); reject(new Error("解码或组件加载超时，Worker已停止。可重新加载后重试。")); }, 8000);
        const fail = (message: string, dependency = false) => { clearTimeout(timer); job.terminate(); if (dependency) setFailed(true); reject(new Error(message)); };
        cancel.current = () => { clearTimeout(timer); job.terminate(); reject(new Error("本次读取已取消。")); };
        job.onerror = event => { event.preventDefault(); if (token === generation.current) fail("二维码组件加载失败，请重新加载后重试。", true); };
        job.onmessage = event => {
          if (token !== generation.current) return;
          const value = event.data;
          if (value?.type === "ready") job.postMessage({ width, height, buffer: pixels.buffer }, [pixels.buffer]);
          else if (value?.type === "load-error") fail("二维码组件加载失败，请重新加载后重试。", true);
          else if (value?.type === "error") fail(String(value.message));
          else if (value?.type === "result" || value?.type === "not-found") { clearTimeout(timer); job.terminate(); resolve(value.type === "result" ? value : null); }
        };
      });
      if (token !== generation.current) return; cancel.current = null; worker.current = null;
      if (!result) { setStatus("没有找到可读二维码。请裁掉多余背景、避免模糊反光后重试；这不代表图片一定没有二维码。"); return; }
      if (typeof result.text !== "string" || result.text.length > 6000 || !Array.isArray(result.bytes) || result.bytes.length > 4000 || !Number.isInteger(result.version) || result.version < 1 || result.version > 40) throw new Error("组件返回了无效结果，请换图重试。");
      const record = { tool: "jsQR1.4.0 本机图片读二维码", file: { name: file.name, width, height, bytes: file.size }, text: result.text, binaryBytes: result.bytes, version: result.version, scope: "一次最多返回一个二维码，不保证发现全部二维码；网址仅为文字，不自动访问。复杂编码文本可能不完整，JSON附原始字节供核对。" };
      const json = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" })); urls.current.push(json);
      const txt = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" })); urls.current.push(txt);
      setOutput({ text: result.text, json, txt, version: result.version }); setStatus("已读出一个二维码。内容仅作文字展示，请自行判断，不会自动打开网址。");
    } catch (error) { if (token === generation.current) { urls.current.splice(0).forEach(URL.revokeObjectURL); setPreview(""); setOutput(null); setStatus(error instanceof Error ? error.message : "图片无法读取，请换一张静态图片。"); } }
    finally { acceptingBitmap = false; bitmap?.close(); if (token === generation.current) { cancel.current = null; worker.current?.terminate(); worker.current = null; setBusy(false); } }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>从图片里，读出一句话 / 本机图片扫码</p><h1 className={styles.title}>二维码在图里，内容在这里。</h1><p className={styles.intro}>选择截图或清晰照片，读取其中一个二维码。不开摄像头、不申请定位、不访问识别到的网址。</p><p className={styles.privacy}>本机读取，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 选择一张图片</h2><label className={styles.field}>静态PNG、JPEG或WebP<input id="scan-qr-file" className={styles.file} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { clear(); setFailed(false); setFile(e.target.files?.[0] || null); setStatus("已更改图片，旧结果已清除，请点击读取。"); }} /></label><p className={styles.hint}>最多8MiB，每边≤4096像素、总计≤800万像素。先检查文件头尺寸再解码，不支持动画或SVG。透明区域按白底识别。</p><button id="scan-qr-generate" className={`${styles.primary} ${styles.full}`} disabled={busy} onClick={read}>读取图片中的二维码</button>{busy && <button id="scan-qr-cancel" className={styles.secondary} onClick={() => { clear(); setStatus("本次读取已取消，Worker已停止，可重新读取。"); }}>取消读取</button>}{failed && <button id="scan-qr-retry" className={styles.secondary} onClick={read}>重新加载并读取</button>}<p role="status" aria-live="polite" className={styles.status}>{status}</p>{preview && <img id="scan-qr-preview" className={local.preview} src={preview} alt="本次本机选择的图片" />}</section>
    <section className={styles.panel}><h2>2. 阅读内容，保存文字</h2>{output ? <div id="scan-qr-output"><pre id="scan-qr-text" className={local.text}>{output.text || "（此二维码的文字为空；JSON含原始字节）"}</pre><p className={styles.hint}>二维码版本{output.version} · 一次只返回一个结果</p><div className={styles.buttons}><a id="scan-qr-txt" className={styles.primary} href={output.txt} download="qr-content.txt">下载TXT</a><a id="scan-qr-json" className={styles.secondary} href={output.json} download="qr-content.json">下载JSON</a></div></div> : <div className={styles.empty}>读取成功后，这里会显示文字和下载。</div>}<p className={styles.hint}>同图多个码时也最多返回一个，可能一个都找不到；不指定顺序，也不能判断是否还有其他码。找不到时可先裁剪或提高清晰度。低清晰度、遮挡、高密度、特殊编码可能无法正确识别；不判断内容或网址安全。</p></section></div><footer className={styles.footer}>基于jsQR1.4.0（Apache-2.0）中文封装 · <a href="/vendor/jsqr/SOURCE.md">来源与许可</a> · 不支持条形码/摄像头实时扫码；未验证物理手机拍摄矩阵</footer>
  </main>;
}
