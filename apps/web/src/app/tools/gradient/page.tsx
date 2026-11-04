"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./gradient.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type ChromaScale = { (position: number): { hex(): string }; mode(value: string): ChromaScale; colors(count: number): string[] };
type Chroma = { scale(colors: string[]): ChromaScale; version: string };
type Output = { colors: string[]; css: string; png: string; json: string; cssUrl: string; mode: string };
const hex = /^#[\da-f]{6}$/i;

export default function GradientTool() {
  const [start, setStart] = useState("#22543D");
  const [end, setEnd] = useState("#F5D887");
  const [middle, setMiddle] = useState("#77BFA3");
  const [useMiddle, setUseMiddle] = useState(false);
  const [steps, setSteps] = useState("7");
  const [mode, setMode] = useState("lab");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [status, setStatus] = useState("工具准备中…");
  const generation = useRef(0);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/chroma/chroma.min.js").then(() => {
      if (mounted) { setReady(true); setStatus("选好起点与终点颜色，生成自己的渐变色卡。"); }
    }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; generation.current++; clearUrls(urls.current); };
  }, []);

  function invalidate() {
    generation.current++;
    clearUrls(urls.current);
    setOutput(null);
    setBusy(false);
    setStatus("设置已改变，请重新生成，避免下载旧的配色。");
  }

  async function generate() {
    const token = ++generation.current;
    clearUrls(urls.current);
    setOutput(null);
    const inputs = useMiddle ? [start.trim(), middle.trim(), end.trim()] : [start.trim(), end.trim()];
    if (!inputs.every(value => hex.test(value))) { setStatus("每个颜色请填写完整的六位HEX，例如 #22543D。"); return; }
    const count = Number(steps);
    if (!Number.isInteger(count) || count < 2 || count > 16) { setStatus("色阶数量请填写2到16之间的整数。"); return; }
    if (!["lab", "rgb", "lch"].includes(mode)) { setStatus("请选择支持的混色方式。"); return; }
    setBusy(true); setStatus("正在本机生成渐变色卡…");
    try {
      const chroma = (window as unknown as { chroma: Chroma }).chroma;
      if (!chroma) throw new Error("配色工具还未就绪，请刷新后重试。");
      const scale = chroma.scale(inputs).mode(mode);
      const colors = scale.colors(count).map(value => value.toUpperCase());
      const stops = colors.map((color, index) => `${color} ${Number((index * 100 / (count - 1)).toFixed(3))}%`).join(", ");
      const css = `background: linear-gradient(90deg, ${stops});`;
      const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 480;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("当前浏览器不支持图片导出。");
      context.fillStyle = "#FFFFFF"; context.fillRect(0, 0, canvas.width, canvas.height);
      const gradient = context.createLinearGradient(0, 0, 1199, 0);
      colors.forEach((color, index) => gradient.addColorStop(index / (count - 1), color));
      context.fillStyle = gradient; context.fillRect(0, 0, 1200, 260);
      colors.forEach((color, index) => {
        const left = Math.round(index * 1200 / count), right = Math.round((index + 1) * 1200 / count);
        context.fillStyle = color; context.fillRect(left, 280, right - left, 120);
        context.fillStyle = "#20392B"; context.font = "14px monospace"; context.textAlign = "center";
        context.fillText(color, (left + right) / 2, 430);
      });
      context.fillStyle = "#53685B"; context.font = "16px sans-serif"; context.textAlign = "left";
      context.fillText(`chroma.js 3.2.0 · ${mode} · ${count} colors`, 20, 465);
      const blob = await canvasPng(canvas);
      if (token !== generation.current) return;
      const data = { schemaVersion: 1, generator: "chroma.js", version: "3.2.0", inputs: inputs.map(value => value.toUpperCase()), mode, steps: count, colors, css, image: { width: 1200, height: 480 }, rendering: "CSS and PNG linearly interpolate RGB between the exported sampled color stops" };
      setOutput({ colors, css, mode, png: makeUrl(blob, urls.current), json: makeUrl(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), urls.current), cssUrl: makeUrl(new Blob([`.my-gradient {\n  ${css}\n}\n`], { type: "text/css" }), urls.current) });
      setStatus("色卡已生成。可下载PNG，也可把CSS或JSON交给设计师使用。");
    } catch (error) { if (token === generation.current) setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); }
    finally { if (token === generation.current) setBusy(false); }
  }

  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a href="/discover">← 回到日常工具</a></nav>
    <p className={styles.eyebrow}>给生活加一点颜色</p><h1>渐变配色工坊</h1>
    <p className={styles.intro}>从两种喜欢的颜色出发，为海报、店铺封面和日常创作搭一组配色。</p>
    <p className={styles.privacy}>全部在本机生成 · 无需上传照片或调用AI</p>
    <div className={styles.grid}><section className={styles.panel} aria-labelledby="gradient-input-title">
      <h2 id="gradient-input-title">01 · 选好颜色</h2>
      <div className={styles.row}>{[["起点颜色", start, setStart], ["终点颜色", end, setEnd]].map(([label, value, setter]) => <label className={styles.field} key={label as string}>{label as string}<input name={label === "起点颜色" ? "gradient_start" : "gradient_end"} className={styles.input} value={value as string} maxLength={20} spellCheck={false} autoComplete="off" onChange={event => { invalidate(); (setter as (value: string) => void)(event.target.value); }} /><span className={styles.hint}>六位HEX，例如 #22543D</span></label>)}</div>
      <label className={styles.check}><input type="checkbox" checked={useMiddle} onChange={event => { invalidate(); setUseMiddle(event.target.checked); }} />加入中间色</label>
      {useMiddle && <label className={styles.field}>中间颜色<input name="gradient_middle" className={styles.input} value={middle} maxLength={20} spellCheck={false} onChange={event => { invalidate(); setMiddle(event.target.value); }} /></label>}
      <div className={styles.row}><label className={styles.field}>色阶数量<input name="gradient_steps" className={styles.input} type="number" min="2" max="16" step="1" value={steps} onChange={event => { invalidate(); setSteps(event.target.value); }} /></label><label className={styles.field}>混色方式<select name="gradient_mode" className={styles.input} value={mode} onChange={event => { invalidate(); setMode(event.target.value); }}><option value="lab">Lab · 柔和平衡</option><option value="rgb">RGB · 屏幕混色</option><option value="lch">LCH · 丰富过渡</option></select></label></div>
      {useMiddle && <p className={styles.hint}>加入中间色后，建议选3个或更多色阶；2个色阶只保留起点与终点。</p>}
      <p className={styles.hint}>2–16个采样色。PNG与网页使用相同采样点；点与点之间按屏幕RGB混合，色阶越多越接近所选混色曲线。</p>
      <button type="button" className={styles.primary} disabled={!ready || busy} onClick={generate}>{busy ? "正在生成…" : "生成渐变色卡"}</button>
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel} aria-labelledby="gradient-preview-title"><h2 id="gradient-preview-title">02 · 看看效果</h2>
      {output ? <div id="gradient-output"><div className={styles.gradient} role="img" aria-label="生成的渐变预览" style={{ background: output.css.replace(/^background: /, "").replace(/;$/, "") }} /><div className={styles.swatches}>{output.colors.map((color, index) => <div key={`${index}-${color}`}><span className={styles.color} style={{ background: color }} /><code>{color}</code></div>)}</div><p className={styles.hint}>1200 × 480 PNG色卡 · {output.colors.length}色 · {output.mode}</p><div className={styles.buttons}><a id="gradient-png" href={output.png} download="我的渐变色卡.png">下载PNG</a><a id="gradient-css" href={output.cssUrl} download="我的渐变.css">下载CSS</a><a id="gradient-json" href={output.json} download="我的配色.json">下载JSON</a></div><pre className={styles.code}>{output.css}</pre></div> : <div className={styles.empty}>生成后，渐变预览、色号和下载按钮会出现在这里。</div>}
    </section></div><footer className={styles.footer}>这是基于 <a href="https://github.com/gka/chroma.js" target="_blank" rel="noreferrer">chroma.js 3.2.0</a> 开源库制作的中文封装，不是安装完整设计软件。与照片提色不同，本工具由你指定颜色生成配色。屏幕显示与印刷会有色差。<br />库许可：BSD-3-Clause及附带色表Apache-2.0，<a href="/vendor/chroma/LICENSE">查看版权与许可</a>。</footer>
  </main>;
}
