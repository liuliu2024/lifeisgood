"use client";

import { useEffect, useRef, useState } from "react";
import common from "../avatar/tool.module.css";
import styles from "./signature.module.css";

type Point = { x: number; y: number; time: number; pressure: number };
type Group = { points: Point[]; minWidth: number; maxWidth: number; dotSize: number; penColor: string; velocityFilterWeight: number; compositeOperation: string };
type Pad = { on(): void; off(): void; clear(): void; toData(): Group[]; fromData(data: Group[]): void; toSVG(): string; addEventListener(name: string, cb: (e: Event) => void): void };
type PadClass = new (canvas: HTMLCanvasElement, options: Record<string, unknown>) => Pad;
type Output = { png: string; svg: string };
const count = (data: Group[]) => data.reduce((n, g) => n + g.points.length, 0);
const convert = (data: Group[], factor: number): Group[] => data.map(g => ({ ...g, minWidth: g.minWidth * factor, maxWidth: g.maxWidth * factor, dotSize: g.dotSize * factor, points: g.points.map(p => ({ ...p, x: p.x * factor, y: p.y * factor })) }));
function valid(data: Group[]) { return data.length <= 100 && count(data) <= 5000 && data.every(g => g.points.length > 0 && g.points.length <= 500 && g.points.every(p => [p.x,p.y,p.time,p.pressure].every(Number.isFinite) && p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 500)); }

export default function SignatureTool() {
  const canvas = useRef<HTMLCanvasElement>(null), pad = useRef<Pad | null>(null), data = useRef<Group[]>([]), displayWidth = useRef(0), drawing = useRef(false), generation = useRef(0);
  const urls = useRef<string[]>([]), cancelEncoding = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false), [loadError, setLoadError] = useState(false), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [strokes, setStrokes] = useState(0), [points, setPoints] = useState(0), [background, setBackground] = useState("transparent"), [output, setOutput] = useState<Output | null>(null);
  const [status, setStatus] = useState("手写板准备中…");
  function invalidate() { generation.current++; cancelEncoding.current?.(); cancelEncoding.current = null; urls.current.splice(0).forEach(URL.revokeObjectURL); setOutput(null); setBusy(false); }
  function stats() { setStrokes(data.current.length); setPoints(count(data.current)); }
  function redraw() {
    const element = canvas.current, Constructor = (window as Window & { SignaturePad?: PadClass }).SignaturePad;
    if (!element || !Constructor) return;
    pad.current?.off(); drawing.current = false;
    const width = element.getBoundingClientRect().width; if (width < 1) return;
    displayWidth.current = width;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(width * ratio); element.height = Math.round(width / 2 * ratio);
    element.getContext("2d")!.setTransform(element.width / width, 0, 0, element.height / (width / 2), 0, 0);
    const scale = width / 1000;
    const instance = new Constructor(element, { minWidth: 1.5 * scale, maxWidth: 4 * scale, dotSize: 2.5 * scale, penColor: "#172c22", backgroundColor: "rgba(0,0,0,0)", throttle: 0, minDistance: 1.5 * scale });
    pad.current = instance; instance.fromData(convert(data.current, scale));
    instance.addEventListener("beginStroke", event => {
      invalidate();
      if (data.current.length >= 100) { event.preventDefault(); setStatus("最多100笔，请先撤销或清空再画。"); return; }
      drawing.current = true; setStatus("正在书写，抬起后可撤销或导出。");
    });
    instance.addEventListener("afterUpdateStroke", () => {
      if (pad.current !== instance) return;
      const active = instance.toData();
      const last = active.at(-1);
      if ((last?.points.length || 0) > 500 || count(active) > 5000) { redraw(); setStatus("已取消本笔：每笔最多500点、总计5000点。请缩短笔画或先撤销。"); }
    });
    instance.addEventListener("endStroke", () => {
      if (pad.current !== instance) return;
      drawing.current = false;
      const next = convert(instance.toData(), 1000 / displayWidth.current);
      if (!valid(next)) { redraw(); setStatus("本笔超出画布或包含无效坐标，已取消；请在板内书写。"); return; }
      data.current = next; stats(); setStatus("笔画已保留在本机，可继续书写、撤销或导出。");
    });
  }
  useEffect(() => {
    let active = true; setReady(false); setLoadError(false); setStatus("手写板准备中…");
    const script = document.createElement("script");
    const fail = () => { if (!active) return; active = false; clearTimeout(timer); script.remove(); setLoadError(true); setStatus("手写板加载失败或超时，请检查本机服务后重试。"); };
    const timer = setTimeout(fail, 8000);
    const loaded = () => { if (!active) return; if (typeof (window as Window & { SignaturePad?: PadClass }).SignaturePad !== "function") { fail(); return; } clearTimeout(timer); redraw(); setReady(true); setStatus("用鼠标、触控笔或手指在板内画几笔。数据不保存到服务器。"); };
    script.src = "/vendor/signature-pad/signature_pad.umd.min.js"; script.async = true; script.onload = loaded; script.onerror = fail; document.head.appendChild(script);
    const observer = new ResizeObserver(() => { if (active && pad.current && Math.abs((canvas.current?.getBoundingClientRect().width || 0) - displayWidth.current) > 0.5) { const wasDrawing = drawing.current; redraw(); if (wasDrawing) setStatus("画布大小已变化，未抬起的本笔已取消；之前笔画完整保留。"); } });
    if (canvas.current) observer.observe(canvas.current);
    return () => { active = false; clearTimeout(timer); script.remove(); observer.disconnect(); generation.current++; cancelEncoding.current?.(); cancelEncoding.current = null; pad.current?.off(); pad.current = null; urls.current.splice(0).forEach(URL.revokeObjectURL); };
  }, [attempt]);
  function undo(clear = false) { invalidate(); data.current = clear ? [] : data.current.slice(0, -1); redraw(); stats(); setStatus(clear ? "画布已清空，旧下载已清除。" : "已撤销最后一笔，旧下载已清除。"); }
  async function generate() {
    invalidate(); const token = generation.current;
    let exportPad: Pad | null = null; let target: HTMLCanvasElement | null = null;
    setBusy(true);
    try {
      if (!data.current.length) throw new Error("请先在手写板内画几笔，空白画布不能导出。");
      if (drawing.current) throw new Error("请先抬起手指或鼠标，再导出。");
      if (!["transparent", "white"].includes(background) || !valid(data.current)) throw new Error("参数或笔画无效，请清空后重试。");
      const Constructor = (window as Window & { SignaturePad?: PadClass }).SignaturePad;
      if (!Constructor) throw new Error("手写板不可用，请重新加载工具。");
      target = document.createElement("canvas"); target.width = 1000; target.height = 500;
      exportPad = new Constructor(target, { penColor: "#172c22", backgroundColor: background === "white" ? "#ffffff" : "rgba(0,0,0,0)" }); exportPad.off(); exportPad.fromData(convert(data.current, 1));
      const documentSvg = new DOMParser().parseFromString(exportPad.toSVG(), "image/svg+xml"), svg = documentSvg.documentElement;
      svg.setAttribute("width", "1000"); svg.setAttribute("height", "500"); svg.setAttribute("viewBox", "0 0 1000 500");
      if (background === "white") { const rect = documentSvg.createElementNS("http://www.w3.org/2000/svg", "rect"); rect.setAttribute("width", "1000"); rect.setAttribute("height", "500"); rect.setAttribute("fill", "#ffffff"); svg.insertBefore(rect, svg.firstChild); }
      const xml = new XMLSerializer().serializeToString(svg);
      const png = await new Promise<Blob>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("图片编码超时，请重试。")), 8000); cancelEncoding.current = () => { clearTimeout(timer); reject(new Error("已取消本轮导出。")); }; target!.toBlob(blob => { clearTimeout(timer); blob ? resolve(blob) : reject(new Error("PNG生成失败，请重试。")); }, "image/png"); });
      if (token !== generation.current) return;
      cancelEncoding.current = null;
      const pngUrl = URL.createObjectURL(png), svgUrl = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" })); urls.current.push(pngUrl, svgUrl); setOutput({ png: pngUrl, svg: svgUrl }); setStatus("已生成1000×500图片。请妥善保管手迹，离开页面不会保存。");
    } catch (e) { if (token === generation.current) { cancelEncoding.current = null; setStatus(e instanceof Error ? e.message : "生成失败，请重试。"); } }
    finally { exportPad?.off(); if (target) { target.width = 0; target.height = 0; } if (token === generation.current) setBusy(false); }
  }
  return <main className={common.shell}>
    <nav className={common.nav}><a className={common.brand} href="/">生活小助手</a><a className={common.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={common.eyebrow}>随手写，随手存 / 本机手写板</p><h1 className={common.title}>留下一笔手写的温度。</h1><p className={common.intro}>画个小记号、写一句短字，再下载透明或白底图片。仅生成手迹图片，不提供身份验证或法律电子签章。</p><p className={common.privacy}>本机绘制，不上传 · 离开页面不保留</p>
    <section className={common.panel}><h2>1. 在板内写画</h2><div className={styles.board}><canvas id="signature-canvas" ref={canvas} aria-label="手写画布，请使用鼠标、触控笔或触摸操作" /></div><p id="signature-count" className={common.hint}>{strokes}/100笔 · {points}/5000点 · 每笔最多500点</p><p className={common.hint}>画布按2:1显示，导出固定1000×500像素。调整窗口后保留已完成笔画，正在画的本笔会取消。请使用合成手迹，避免输入敏感签名。</p><div className={common.buttons}><button id="signature-undo" className={common.secondary} disabled={!ready} onClick={() => undo()}>撤销最后一笔</button><button id="signature-clear" className={common.secondary} disabled={!ready} onClick={() => undo(true)}>清空画布</button></div></section>
    <div className={`${common.grid} ${styles.lower}`}><section className={common.panel}><h2>2. 选择背景，生成图片</h2><label className={common.field}>导出背景<select id="signature-background" className={common.select} value={background} onChange={e => { invalidate(); setBackground(e.target.value); setStatus("背景已改变，请重新生成。"); }}><option value="transparent">透明底 · 便于叠加</option><option value="white">白底 · 直接分享</option></select></label><button id="signature-generate" className={`${common.primary} ${common.full}`} disabled={!ready || busy} onClick={generate}>{busy ? "正在导出…" : "生成PNG与SVG"}</button>{loadError && <button id="signature-retry" className={common.secondary} onClick={() => { invalidate(); setAttempt(v => v + 1); }}>重新加载工具</button>}<p role="status" aria-live="polite" className={common.status}>{status}</p></section><section className={common.panel}><h2>3. 预览与下载</h2>{output ? <div id="signature-output"><div className={styles.preview}><img src={output.png} alt="手迹图片预览，棋盘格表示透明区域" /></div><div className={common.buttons}><a id="signature-png" className={common.primary} href={output.png} download="handwriting.png">下载PNG</a><a id="signature-svg" className={common.secondary} href={output.svg} download="handwriting.svg">下载SVG</a></div><p className={common.hint}>PNG与SVG使用同一批笔画。两种绘制方式的边缘和笔触可能略有差异。棋盘格仅供预览，不写入图片。</p></div> : <div className={common.empty}>画几笔并生成后，这里会显示预览和下载。</div>}</section></div><footer className={common.footer}>Signature Pad 5.1.3（MIT）中文封装 · <a href="/vendor/signature-pad/SOURCE.md">来源与许可</a> · 未测试真实手机、打印或法律签章流程</footer>
  </main>;
}
