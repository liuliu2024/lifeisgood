"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";
import { rasterDimensions } from "./image-header";

type Color = { hex(): string };
type ColorThief = { getColorSync(image: HTMLCanvasElement, options: { quality: number; ignoreWhite: boolean }): Color; getPaletteSync(image: HTMLCanvasElement, options: { colorCount: number; quality: number; ignoreWhite: boolean }): Color[] };
type Result = { name: string; preview: string; colors: string[]; dominant: string; png: string; json: string; width: number; height: number };

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("图片无法读取，请换一张正常的PNG、JPEG或WebP图片。")); image.src = source; });
}

function supportedImage(bytes: Uint8Array): boolean {
  return (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10)
    || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    || (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
}

export default function PaletteTool() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("工具准备中…");
  const urls = useRef<string[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/color-thief/color-thief.global.js").then(() => { if (mounted) { setReady(true); setStatus("选择一张照片，找到它的主色和配色灵感。"); } }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; generation.current++; clearUrls(urls.current); };
  }, []);

  async function choose(file?: File) {
    const token = ++generation.current;
    clearUrls(urls.current);
    setResult(null);
    setBusy(false);
    if (!file) { setStatus("请选择一张照片。"); return; }
    if (file.size > 10 * 1024 * 1024) { setStatus("图片超过10 MiB，请先选一张较小的图片。"); return; }
    setBusy(true);
    setStatus("正在本机读取照片和提取颜色…");
    try {
      const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (token !== generation.current) return;
      if (!supportedImage(header)) throw new Error("只支持PNG、JPEG和WebP图片，请不要选择SVG或其他文件。");
      const dimensions = rasterDimensions(await file.arrayBuffer());
      if (token !== generation.current) return;
      if (dimensions.width * dimensions.height > 16_000_000) throw new Error("图片超过1600万像素，请先缩小后再试。");
      const source = makeUrl(file, urls.current);
      const image = await loadImage(source);
      if (token !== generation.current) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16_000_000) throw new Error("图片超过1600万像素，请先缩小后再试。");
      const sample = document.createElement("canvas");
      const ratio = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      sample.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      sample.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("当前浏览器不支持读取图片颜色。");
      context.drawImage(image, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let visible = false;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] >= 125) { visible = true; break; }
      if (!visible) throw new Error("图片几乎完全透明，没有足够的可见颜色可提取。");
      const library = (window as Window & { ColorThief?: ColorThief }).ColorThief;
      if (!library) throw new Error("工具尚未准备好，请刷新后重试。");
      const dominant = library.getColorSync(sample, { quality: 1, ignoreWhite: false }).hex();
      const colors = Array.from(new Set(library.getPaletteSync(sample, { colorCount: 5, quality: 1, ignoreWhite: false }).map(color => color.hex())));
      if (!colors.length) throw new Error("没有提取到颜色，请换一张照片重试。");
      const card = document.createElement("canvas");
      card.width = 1000; card.height = 400;
      const cardContext = card.getContext("2d");
      if (!cardContext) throw new Error("当前浏览器不支持导出色卡。");
      cardContext.fillStyle = "#ffffff"; cardContext.fillRect(0, 0, card.width, card.height);
      const band = 1000 / colors.length;
      colors.forEach((color, index) => { cardContext.fillStyle = color; cardContext.fillRect(Math.round(index * band), 0, Math.ceil(band), 300); cardContext.fillStyle = "#17231e"; cardContext.font = "20px monospace"; cardContext.textAlign = "center"; cardContext.fillText(color.toUpperCase(), (index + 0.5) * band, 356); });
      const png = await canvasPng(card);
      if (token !== generation.current) return;
      const data = { sourceName: file.name, width: image.naturalWidth, height: image.naturalHeight, dominant, colors, method: "Color Thief 3.5.0; max-side-512 sample; sRGB; ignoreWhite=false" };
      setResult({ name: file.name, preview: source, colors, dominant, png: makeUrl(png, urls.current), json: makeUrl(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), urls.current), width: image.naturalWidth, height: image.naturalHeight });
      setStatus(`已找到主色和${colors.length}种配色。点击色块可复制，也可下载色卡。`);
    } catch (error) {
      if (token === generation.current) { clearUrls(urls.current); setStatus(error instanceof Error ? error.message : "提取失败，请换一张图片重试。"); }
    } finally { if (token === generation.current) setBusy(false); }
  }

  async function copy(color: string) {
    try { await navigator.clipboard.writeText(color); setStatus(`已复制 ${color.toUpperCase()}`); }
    catch { setStatus(`浏览器暂不允许复制，请手动选取色值 ${color.toUpperCase()}，或下载配色JSON。`); }
  }

  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/discover">← 返回生活与创意工具</a></nav>
    <p className={styles.eyebrow}>从照片里发现灵感</p><h1 className={styles.title}>提取照片的配色</h1>
    <p className={styles.intro}>喜欢一张照片的氛围？把它变成一组色卡，留给穿搭、家居或下一次设计。</p>
    <p className={styles.privacy}>照片只在当前浏览器处理 · 不上传 · 无需登录</p>
    <div className={styles.grid}>
      <section className={styles.panel}><h2>选一张自己的照片</h2>
        <label className={styles.field} htmlFor="palette-file">照片文件<input id="palette-file" className={styles.file} type="file" accept="image/png,image/jpeg,image/webp" disabled={!ready} onChange={event => { void choose(event.target.files?.[0]); }} /><span className={styles.hint}>PNG、JPEG或静态WebP；单张最多10 MiB、1600万像素。不接受SVG或动态WebP，透明区域不作为底色。可以重新选图替换当前结果。</span></label>
        {result ? <><img id="palette-photo" className={styles.photo} src={result.preview} alt="用于提取配色的本机照片" /><p className={styles.hint}><span className={styles.filename}>{result.name}</span><br />{result.width} × {result.height} 像素</p></> : <div className={styles.empty}>{busy ? "正在提取颜色…" : "不必上传到任何网站，\n照片的配色会在这里展开。"}</div>}
        <p role="status" aria-live="polite" className={styles.status}>{status}</p>
      </section>
      <section className={styles.panel}><h2>你的照片色卡<span className={styles.tag}>最多5色</span></h2>
        {result ? <div id="palette-output"><p className={styles.hint}>主色 <strong id="palette-dominant">{result.dominant.toUpperCase()}</strong></p><div className={styles.swatches}>{result.colors.map(color => <button className={styles.swatch} key={color} title={`复制 ${color}`} onClick={() => { void copy(color); }}><span className={styles.color} style={{ backgroundColor: color }} /><span className={styles.hex}>{color.toUpperCase()}</span></button>)}</div><div className={styles.buttons}><a id="palette-png" className={styles.primary} href={result.png} download="photo-palette.png">下载色卡PNG</a><a id="palette-json" className={styles.secondary} href={result.json} download="photo-palette.json">下载配色JSON</a></div><p className={styles.hint}>简单图片可能不足5色；近白色也会保留。JSON记录色值，便于后续使用。</p></div> : <div className={styles.empty}>选好照片后，这里会显示主色、色块和下载按钮。</div>}
      </section>
    </div>
    <footer className={styles.footer}>配色来自缩小采样和颜色聚类，不是精确逐像素统计或专业印刷色彩校准。超大图片可能仍受设备内存影响，真实手机与专业色彩工作流未作全面验证。<details className={styles.source}><summary>开源来源与使用范围</summary><p>颜色提取核心：<a href="https://github.com/lokesh/color-thief" target="_blank" rel="noreferrer">Color Thief 3.5.0</a>（MIT），本页仅使用无Node依赖的浏览器制品。中文界面及下载流程为本网站整合。<a href="/vendor/color-thief/LICENSE.txt" target="_blank" rel="noreferrer">查看许可</a>。</p></details></footer>
  </main>;
}
