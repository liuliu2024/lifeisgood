"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./qr.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type Options = { width: number; margin: number; errorCorrectionLevel: string; color: { dark: string; light: string } };
type Library = { create(text: string, options: Options): { version: number; modules: { size: number } }; toCanvas(canvas: HTMLCanvasElement, text: string, options: Options): Promise<void>; toString(text: string, options: Options & { type: string }): Promise<string> };
type Output = { png: string; svg: string; size: number; modules: number; version: number; bytes: number };
const source = "/vendor/node-qrcode/qrcode.js";
export default function QrTool() {
  const [text, setText] = useState("把日常的小事，变得简单一点。"), [size, setSize] = useState("384"), [level, setLevel] = useState("M"), [margin, setMargin] = useState("4");
  const [ready, setReady] = useState(false), [loadFailed, setLoadFailed] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("填好文字或网址后，点击生成二维码。"), [output, setOutput] = useState<Output | null>(null);
  const urls = useRef<string[]>([]), generation = useRef(0), mounted = useRef(false);
  function changed() { generation.current++; clearUrls(urls.current); setOutput(null); setBusy(false); setStatus("内容或参数已更改，请重新生成。"); }
  async function load() {
    setLoadFailed(false); setReady(false);
    try { await loadLocalScript(source); if (mounted.current) { setReady(true); setStatus("工具已就绪，请点击生成二维码。"); } }
    catch { if (mounted.current) { setLoadFailed(true); setStatus("二维码工具文件加载失败。请检查本机服务后点击重新加载工具。"); } }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; generation.current++; clearUrls(urls.current); }; }, []);
  async function generate() {
    changed(); const token = generation.current; setBusy(true);
    try {
      if (!text.trim()) throw new Error("请输入非空文字或网址。");
      if (!text.isWellFormed() || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) throw new Error("内容包含无效字符。请移除控制字符；常规换行与空格会保留。");
      const bytes = new TextEncoder().encode(text).length;
      if (bytes > 1200) throw new Error("内容过长：最多1200个UTF-8字节（中文通常每字3字节，表情可能4字节）。");
      if (!["256", "384", "512", "768"].includes(size) || !["4", "6", "8"].includes(margin) || !["L", "M", "Q", "H"].includes(level)) throw new Error("参数无效，请选择列表中的尺寸、纠错等级和留白。");
      const library = (window as Window & { QRCode?: Library }).QRCode;
      if (!library) throw new Error("二维码工具尚未准备好，请重新加载工具。");
      const options: Options = { width: Number(size), margin: Number(margin), errorCorrectionLevel: level, color: { dark: "#000000ff", light: "#ffffffff" } };
      const qr = library.create(text, options);
      if (qr.version > 27) throw new Error("内容过密：本工具只提供版本不超过27的二维码，请缩短内容后重试。");
      if (options.width / (qr.modules.size + options.margin * 2) < 4) throw new Error("当前尺寸下每模块不足4像素。请选择更大的导出尺寸或缩短内容。");
      const canvas = document.createElement("canvas");
      await library.toCanvas(canvas, text, options);
      const png = await canvasPng(canvas), svg = await library.toString(text, { ...options, type: "svg" });
      if (token !== generation.current) return;
      setOutput({ png: makeUrl(png, urls.current), svg: makeUrl(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), urls.current), size: options.width, modules: qr.modules.size, version: qr.version, bytes });
      setStatus("二维码已生成，可下载PNG或SVG。请使用实际设备试扫。");
    } catch (e) { if (token === generation.current) setStatus(e instanceof Error ? e.message : "生成失败，请缩短内容后重试。"); }
    finally { if (token === generation.current) setBusy(false); }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>把文字带走 / 本机二维码</p><h1 className={styles.title}>一段文字，一个二维码。</h1>
    <p className={styles.intro}>输入中文、网址或小便签，生成黑白二维码图片。内容中的网址不会被自动打开。</p><p className={styles.privacy}>在当前浏览器生成，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 填写内容</h2>
      <label className={styles.field}>二维码内容<textarea id="qr-text" className={`${styles.input} ${local.textarea}`} maxLength={2400} value={text} onChange={e => { changed(); setText(e.target.value); }} /></label>
      <p className={styles.hint}>最多1200个UTF-8字节，保留首尾空格、换行及表情。实际容量还受纠错等级与密度限制。</p>
      <div className={local.settings}><label className={styles.field}>导出尺寸<select id="qr-size" className={styles.select} value={size} onChange={e => { changed(); setSize(e.target.value); }}>{[256,384,512,768].map(n => <option key={n} value={n}>{n} × {n} 像素</option>)}</select></label>
      <label className={styles.field}>纠错等级<select id="qr-level" className={styles.select} value={level} onChange={e => { changed(); setLevel(e.target.value); }}>{[["L","L · 较低"],["M","M · 常规"],["Q","Q · 较高"],["H","H · 高"]].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <label className={styles.field}>四周留白<select id="qr-margin" className={styles.select} value={margin} onChange={e => { changed(); setMargin(e.target.value); }}>{[4,6,8].map(n => <option key={n} value={n}>{n}个模块</option>)}</select></label></div>
      <p className={styles.hint}>固定黑码白底。版本≤27、每模块至少4像素；内容过密会拒绝导出。较高纠错会增大码的密度，不能保证任意遮挡都能读取。</p>
      <button id="qr-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready || busy} onClick={generate}>{busy ? "正在生成…" : "生成二维码"}</button>
      {loadFailed && <button id="qr-reload" className={styles.secondary} onClick={() => { changed(); void load(); }}>重新加载工具</button>}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>2. 预览与下载</h2>{output ? <div id="qr-output"><div className={local.preview}><img id="qr-preview" src={output.png} alt="生成的二维码预览" /></div><p id="qr-details" className={styles.hint}>{output.size} × {output.size}像素 · {output.modules}模块 · 版本{output.version} · {output.bytes}字节</p><div className={styles.buttons}><a id="qr-png" className={styles.primary} href={output.png} download="qrcode.png">下载PNG</a><a id="qr-svg" className={styles.secondary} href={output.svg} download="qrcode.svg">下载SVG</a></div></div> : <div className={styles.empty}>生成后，这里会显示二维码和下载按钮。</div>}
      <p className={styles.hint}>不判断网址安全，不提供收款开通。中文以UTF-8字节编码，上游ECI支持不完整，部分读码器可能出现乱码。电子图片回读通过也不代表真机或打印验证；请在目标设备和实际尺寸试扫。</p>
    </section></div><footer className={styles.footer}>基于node-qrcode 1.5.4（MIT）的中文封装 · <a href="/vendor/node-qrcode/SOURCE.md">来源与许可</a></footer>
  </main>;
}
