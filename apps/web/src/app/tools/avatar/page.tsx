"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./tool.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "./browser-local";

type Jdenticon = { toSvg(value: string, size: number, config: { backColor: string; padding: number }): string; drawIcon(context: CanvasRenderingContext2D, value: string, size: number, config: { backColor: string; padding: number }): void };

export default function AvatarTool() {
  const [text, setText] = useState("");
  const [size, setSize] = useState("512");
  const [background, setBackground] = useState("#f1f6f3");
  const [transparent, setTransparent] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("输入昵称或一句话，做一个属于自己的几何头像。");
  const [output, setOutput] = useState<{ svg: string; png: string; size: number } | null>(null);
  const urls = useRef<string[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/jdenticon/jdenticon.min.js").then(() => { if (mounted) setReady(true); }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; generation.current++; clearUrls(urls.current); };
  }, []);

  function changed() {
    generation.current++;
    clearUrls(urls.current);
    setOutput(null);
    setBusy(false);
    setStatus("设置已更新，点击生成即可预览新头像。");
  }

  async function generate() {
    changed();
    if (!text.trim()) { setStatus("请先输入昵称或一句话。"); return; }
    if (text.length > 200 || !["256", "512", "1024"].includes(size) || !/^#[0-9a-f]{6}$/i.test(background)) { setStatus("内容最多200个字符，请使用列表中的尺寸和颜色。"); return; }
    const token = generation.current;
    setBusy(true);
    try {
      const library = (window as Window & { jdenticon?: Jdenticon }).jdenticon;
      if (!library) throw new Error("工具尚未准备好，请稍后再试。");
      const width = Number(size);
      const config = { backColor: transparent ? "#ffffff00" : background, padding: 0.08 };
      const value = `生活小助手:${text}`;
      const svg = library.toSvg(value, width, config);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = width;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持图片绘制。");
      library.drawIcon(context, value, width, config);
      const png = await canvasPng(canvas);
      if (token !== generation.current) return;
      setOutput({ svg: makeUrl(new Blob([svg], { type: "image/svg+xml" }), urls.current), png: makeUrl(png, urls.current), size: width });
      setStatus("头像已生成，下方可以下载PNG或SVG。");
    } catch (error) { if (token === generation.current) setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); }
    finally { if (token === generation.current) setBusy(false); }
  }

  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/discover">← 返回生活与创意工具</a></nav>
    <p className={styles.eyebrow}>一点自己的风格</p><h1 className={styles.title}>做一个几何头像</h1>
    <p className={styles.intro}>不用照片，给昵称配一枚独特的小图案。相同文字和设置，会得到相同头像。</p>
    <p className={styles.privacy}>当前浏览器内生成 · 不上传文字 · 无需登录</p>
    <div className={styles.grid}>
      <section className={styles.panel}><h2>写一点内容</h2>
        <label className={styles.field} htmlFor="avatar-text">昵称或一句话<input id="avatar-text" className={styles.input} maxLength={200} value={text} onChange={event => { changed(); setText(event.target.value); }} placeholder="例如：今天也要开心" /><span className={styles.hint}>最多200个字符。文字只用于生成图案，不会印在头像上。</span></label>
        <div className={styles.row}><label className={styles.field} htmlFor="avatar-size">导出尺寸<select id="avatar-size" className={styles.select} value={size} onChange={event => { changed(); setSize(event.target.value); }}><option value="256">256 × 256</option><option value="512">512 × 512</option><option value="1024">1024 × 1024</option></select></label><label className={styles.field} htmlFor="avatar-background">背景颜色<input id="avatar-background" className={styles.colorInput} type="color" disabled={transparent} value={background} onChange={event => { changed(); setBackground(event.target.value); }} /></label></div>
        <label className={styles.check}><input id="avatar-transparent" type="checkbox" checked={transparent} onChange={event => { changed(); setTransparent(event.target.checked); }} />使用透明背景</label>
        <button id="avatar-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready || busy} onClick={generate}>{busy ? "正在生成…" : ready ? "生成我的头像" : "工具准备中…"}</button>
        <p role="status" aria-live="polite" className={styles.status}>{status}</p>
      </section>
      <section className={styles.panel}><h2>预览与下载<span className={styles.tag}>PNG / SVG</span></h2>
        {output ? <><img className={styles.preview} id="avatar-preview" src={output.svg} alt="刚生成的几何头像" /><p className={styles.info}>{output.size} × {output.size} 像素 · {transparent ? "透明背景" : "彩色背景"}</p><div id="avatar-downloads" className={styles.buttons}><a id="avatar-png" className={styles.primary} href={output.png} download="my-avatar.png">下载PNG</a><a id="avatar-svg" className={styles.secondary} href={output.svg} download="my-avatar.svg">下载SVG</a></div><p className={styles.hint}>PNG便于日常使用；SVG可以放大，适合继续设计。</p></> : <div className={styles.empty}>新头像会出现在这里。<br />先写一句话，再点击生成。</div>}
      </section>
    </div>
    <footer className={styles.footer}>这是几何图案生成，不是人脸或AI写真；图案不用于证明身份，也不保证不同文字绝不出现相似图案。<details className={styles.source}><summary>开源来源与使用范围</summary><p>生成核心：<a href="https://github.com/dmester/jdenticon" target="_blank" rel="noreferrer">Jdenticon 3.3.0</a>（MIT）。中文界面及下载流程为本网站整合。<a href="/vendor/jdenticon/LICENSE.txt" target="_blank" rel="noreferrer">查看许可</a>。该项目维护频率较低，本页仅接入当前固定版本。</p></details></footer>
  </main>;
}
