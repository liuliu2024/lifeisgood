"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./barcode.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type Barcode = (target: SVGSVGElement, value: string, options: Record<string, unknown>) => void;
type Output = { svg: string; png: string; value: string; width: number; height: number };
function integer(value: string, min: number, max: number, name: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) throw new Error(`${name}须为${min}–${max}的整数。`);
  return Number(value);
}
function content(value: string, format: string) {
  if (format === "CODE128") {
    if (!value.length || value.length > 48 || !/^[\x20-\x7e]+$/.test(value)) throw new Error("CODE128请输入1–48个可打印ASCII字符（英文字母、数字、半角符号或空格），不支持中文、换行。空格会原样编码。");
    return value;
  }
  if (!/^\d{12,13}$/.test(value)) throw new Error("EAN13只能输入12或13位数字，不含空格。12位自动补校验位，13位核对末位。");
  const checksum = (10 - [...value.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0) % 10) % 10;
  if (value.length === 13 && Number(value[12]) !== checksum) throw new Error(`EAN13校验位错误：此数据末位应为${checksum}。`);
  return value.slice(0, 12) + checksum;
}
export default function BarcodeTool() {
  const [value, setValue] = useState("LIFE-2026-001"), [format, setFormat] = useState("CODE128");
  const [width, setWidth] = useState("2"), [height, setHeight] = useState("100"), [margin, setMargin] = useState("12"), [scale, setScale] = useState("2");
  const [text, setText] = useState(true), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("输入内容后生成条形码。尚未生成预览。"), [output, setOutput] = useState<Output | null>(null);
  const urls = useRef<string[]>([]), generation = useRef(0);
  useEffect(() => { let mounted = true; loadLocalScript("/vendor/jsbarcode/JsBarcode.all.min.js").then(() => { if (mounted) setReady(true); }).catch(e => { if (mounted) setStatus(e.message); }); return () => { mounted = false; generation.current++; clearUrls(urls.current); }; }, []);
  function changed() { generation.current++; clearUrls(urls.current); setOutput(null); setBusy(false); setStatus("内容或参数已更新，请重新生成。"); }
  async function generate() {
    changed(); const token = generation.current; setBusy(true);
    try {
      const encoded = content(value, format), w = integer(width, 2, 4, "条宽"), h = integer(height, 60, 200, "条高"), m = integer(margin, 12, 40, "留白模块数"), s = integer(scale, 1, 3, "PNG清晰度倍数");
      const library = (window as Window & { JsBarcode?: Barcode }).JsBarcode;
      if (!library) throw new Error("工具文件尚未准备好，请稍后重试。");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      library(svg, encoded, { format, width: w, height: h, margin: m * w, displayValue: text, font: "monospace", fontSize: 20, textMargin: 6, background: "#ffffff", lineColor: "#000000" });
      const [,,sw,sh] = svg.getAttribute("viewBox")!.split(" ").map(Number);
      if (sw * s > 8192 || sh * s > 2048 || sw * sh * s * s > 4000000) throw new Error("导出过大（最多8192×2048且400万像素），请降低条宽或清晰度。");
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const temporary = URL.createObjectURL(blob);
      let png: Blob;
      try {
        const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("条形码图像转换失败，请重试。")); image.src = temporary; });
        if (token !== generation.current) return;
        const canvas = document.createElement("canvas"); canvas.width = sw * s; canvas.height = sh * s;
        const context = canvas.getContext("2d"); if (!context) throw new Error("当前浏览器无法导出PNG。");
        context.imageSmoothingEnabled = false; context.drawImage(image, 0, 0, canvas.width, canvas.height); png = await canvasPng(canvas);
      } finally { URL.revokeObjectURL(temporary); }
      if (token !== generation.current) return;
      setOutput({ svg: makeUrl(blob, urls.current), png: makeUrl(png, urls.current), value: encoded, width: sw * s, height: sh * s });
      setStatus("条形码已生成，可下载SVG矢量图或PNG图片。请用目标设备和打印尺寸试扫。");
    } catch (e) { if (token === generation.current) setStatus(e instanceof Error ? e.message : "生成失败，请检查输入。"); }
    finally { if (token === generation.current) setBusy(false); }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>为物品做一个标记 / 本机条形码</p><h1 className={styles.title}>把编号，变成条形码。</h1>
    <p className={styles.intro}>支持CODE128与EAN13。适合整理物品和制作标签；商品编号的分配或注册须自行办理。</p><p className={styles.privacy}>全程在当前浏览器生成，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 填内容，选尺寸</h2>
      <label className={styles.field}>条码类型<select id="barcode-format" className={styles.select} value={format} onChange={e => { changed(); setFormat(e.target.value); }}>{["CODE128", "EAN13"].map(f => <option key={f}>{f}</option>)}</select></label>
      <label className={styles.field}>条码内容<input id="barcode-value" className={styles.input} value={value} maxLength={256} onChange={e => { changed(); setValue(e.target.value); }} /></label>
      <p className={styles.hint}>CODE128：1–48个可打印ASCII字符，空格原样保留。EAN13：12位数字自动补末位；13位必须通过校验。不支持中文。</p>
      <div className={local.parameters}>{[["条宽（像素，2–4）", "barcode-width", width, setWidth, 2, 4], ["条高（像素，60–200）", "barcode-height", height, setHeight, 60, 200], ["四周留白（模块，12–40）", "barcode-margin", margin, setMargin, 12, 40], ["PNG清晰度（倍数，1–3）", "barcode-scale", scale, setScale, 1, 3]].map(([label, id, v, setter, min, max]) => <label className={styles.field} key={String(id)}>{String(label)}<input id={String(id)} className={styles.input} type="number" min={Number(min)} max={Number(max)} step="1" value={String(v)} onChange={e => { changed(); (setter as (v: string) => void)(e.target.value); }} /></label>)}</div>
      <label className={local.check}><input id="barcode-text" type="checkbox" checked={text} onChange={e => { changed(); setText(e.target.checked); }} />显示可读文字</label>
      <p className={styles.hint}>黑条白底；一个模块等于条宽。SVG保持矢量，清晰度倍数只影响PNG。导出最多400万像素，宽8192、高2048。屏幕预览可能缩小，请使用原图打印并保留留白。</p>
      <button id="barcode-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready || busy} onClick={generate}>{busy ? "正在生成…" : "生成条形码"}</button><p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>2. 预览与下载</h2>{output ? <div id="barcode-output"><div className={local.preview}><img id="barcode-preview" src={output.svg} alt={`${format}条形码预览`} /></div><p className={local.encoded}>编码内容：<code id="barcode-encoded">{output.value}</code></p><p className={styles.hint}>PNG：{output.width} × {output.height} 像素</p><div className={styles.row}><a id="barcode-svg" className={styles.primary} href={output.svg} download={`${format}-barcode.svg`}>下载SVG</a><a id="barcode-png" className={styles.secondary} href={output.png} download={`${format}-barcode.png`}>下载PNG</a></div></div> : <div className={styles.empty}>生成后，这里会显示条形码及下载按钮。</div>}
      <p className={styles.hint}>这是条形码生成器。电子图片的独立解码测试不代表所有扫码器和打印机均可识别；真机扫描、打印及行业合规尚未验证。</p>
    </section></div><footer className={styles.footer}>基于JsBarcode 3.12.1（MIT）封装 · <a href="/vendor/jsbarcode/SOURCE.md">来源与许可</a></footer>
  </main>;
}
