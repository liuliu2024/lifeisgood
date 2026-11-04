"use client";
import { useEffect, useRef, useState } from "react";
import { loadLocalScript } from "../avatar/browser-local";
import { EXAMPLE, exportSafeSvg, parseTree, SafeNode } from "./safe-tree";
import styles from "./mindmap.module.css";

type Mindmap = { setData(root: SafeNode): Promise<void>; fit(): Promise<void>; rescale(scale: number): Promise<void>; destroy(): void };
type MarkmapConstructor = { create(svg: SVGSVGElement, options: Record<string, unknown>): Mindmap };

export default function MindmapTool() {
  const [text, setText] = useState(EXAMPLE), [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("工具准备中…"), [download, setDownload] = useState(""), [count, setCount] = useState(0);
  const host = useRef<HTMLDivElement>(null), instance = useRef<Mindmap | null>(null), generation = useRef(0), outputUrl = useRef("");
  function clear() {
    generation.current++; instance.current?.destroy(); instance.current = null; host.current?.replaceChildren();
    if (outputUrl.current) URL.revokeObjectURL(outputUrl.current); outputUrl.current = "";
    setDownload(""); setCount(0); setBusy(false);
  }
  useEffect(() => {
    let active = true;
    loadLocalScript("/vendor/markmap/d3.min.js").then(() => loadLocalScript("/vendor/markmap/markmap-view.js")).then(() => {
      if (active) { setReady(true); setStatus("写一个主题和分支，生成可以展开、拖动的思维导图。"); }
    }).catch(error => { if (active) setStatus(error.message); });
    return () => { active = false; generation.current++; instance.current?.destroy(); instance.current = null; if (outputUrl.current) URL.revokeObjectURL(outputUrl.current); };
  }, []);
  async function generate() {
    clear(); const token = generation.current;
    try {
      const tree = parseTree(text), target = host.current;
      const Markmap = (window as unknown as { markmap?: { Markmap?: MarkmapConstructor } }).markmap?.Markmap;
      if (!target || !Markmap) throw new Error("工具还未就绪，请刷新后再试。");
      setBusy(true); setStatus("正在本机整理主题和分支…");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("aria-label", "交互思维导图"); svg.setAttribute("role", "img"); svg.style.width = "100%"; svg.style.height = "100%"; target.appendChild(svg);
      const map = Markmap.create(svg, { duration: 0, autoFit: false, maxWidth: 0, initialExpandLevel: -1, pan: true, zoom: true }); instance.current = map;
      await map.setData(tree.root);
      if (token !== generation.current) return;
      await map.fit();
      if (token !== generation.current) return;
      const content = exportSafeSvg(svg);
      outputUrl.current = URL.createObjectURL(new Blob([content], { type: "image/svg+xml;charset=utf-8" }));
      setDownload(outputUrl.current); setCount(tree.count); setStatus(`已生成${tree.count}个主题。拖动查看、滚轮缩放，点击分支圆点折叠。下载保留完整导图。`);
    } catch (error) {
      if (token === generation.current) { instance.current?.destroy(); instance.current = null; host.current?.replaceChildren(); setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); }
    } finally { if (token === generation.current) setBusy(false); }
  }
  async function adjust(action: "fit" | "in" | "out") {
    const map = instance.current, token = generation.current; if (!map || busy) return;
    try { if (action === "fit") await map.fit(); else await map.rescale(action === "in" ? 1.25 : .8); }
    catch { if (token === generation.current) setStatus("视图调整失败，可重新生成导图再试。"); }
  }
  return <main className={styles.shell}><nav><a href="/">生活小助手</a><a href="/discover">← 日常工具</a></nav>
    <header><p className={styles.eyebrow}>把想法理清楚</p><h1>文字变成思维导图</h1><p>整理旅行计划、门店活动，或把脑海里的想法分成清楚的几条线。</p><span className={styles.privacy}>只在本机处理，不上传、不加载远程图片</span></header>
    <div className={styles.columns}><section className={styles.panel}><h2>01 · 写下主题与分支</h2><label htmlFor="mindmap-input">每行用#表示层级，后面加空格与纯文字</label><textarea id="mindmap-input" value={text} spellCheck={false} onChange={event => { clear(); setText(event.target.value); setStatus("内容已改变，请重新生成，旧的导图与下载已清除。"); }} />
      <p className={styles.help}>#是总主题，##是分支，###是分支下的小事，最多6层，不要跳级。最多6000字、80个主题，每个主题最多100字。HTML、链接、图片写法只显示为文字，不执行。</p>
      <div className={styles.buttons}><button disabled={!ready || busy} className={styles.primary} onClick={() => void generate()}>{busy ? "正在生成…" : "生成思维导图"}</button><button onClick={() => { clear(); setText(EXAMPLE); setStatus("示例已填入，点击生成即可体验。"); }}>填入生活示例</button></div>
      <p role="status" aria-live="polite" className={styles.status}>{status}</p></section>
      <section className={styles.panel}><h2>02 · 展开看看</h2><div className={styles.toolbar}><button disabled={!count || busy} onClick={() => void adjust("fit")}>适应画面</button><button disabled={!count || busy} onClick={() => void adjust("in")}>放大</button><button disabled={!count || busy} onClick={() => void adjust("out")}>缩小</button></div><div className={styles.stage} ref={host} data-mindmap-stage />{!count && !busy && <p className={styles.empty}>生成后，可在上方拖动、缩放导图。</p>}
      {download && <a className={styles.download} id="mindmap-svg" href={download} download="我的思维导图.svg">下载完整SVG导图</a>}<p className={styles.help}>SVG保留清晰文字与连线，可放大或交给设计师。不保存交互折叠和当前缩放状态；使用系统字体，换电脑字体可能略有变化。</p></section></div>
    <footer>基于 <a href="https://github.com/markmap/markmap" target="_blank" rel="noreferrer">markmap-view 0.18.12</a> 的纯文字中文封装，配合本地D3，不是完整云端应用或Markdown编辑器。导出重新创建安全SVG，不含HTML容器、脚本、事件或外链。<br /><a href="/vendor/markmap/licenses/markmap-view-LICENSE">MIT许可</a> · <a href="/vendor/markmap/SOURCE.md">依赖与其他许可</a></footer>
  </main>;
}
