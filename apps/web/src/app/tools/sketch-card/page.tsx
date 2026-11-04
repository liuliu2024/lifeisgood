"use client";

import { useEffect, useRef, useState } from "react";
import { makeCard, type Rough, type Settings } from "./card";
import styles from "./sketch-card.module.css";

const initial: Settings = { title: "把日子过成喜欢的样子", body: "今天散步二十分钟\n好好吃一顿晚饭\n给自己留一点空白", shape: "circle", count: "3", seed: "24680", stroke: "#305C48", fill: "#DDA154", paper: "#FFF8E8", size: "landscape", fillStyle: "hachure", roughness: "2.2" };
type Output = { png: string; svg: string; width: number; height: number; title: string; seed: number; count: number };

export default function SketchCardTool() {
  const [settings, setSettings] = useState<Settings>(initial);
  const [ready, setReady] = useState(false), [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<Output | null>(null), [status, setStatus] = useState("手绘组件准备中…");
  const generation = useRef(0), locked = useRef(false);
  const urls = useRef<string[]>([]);
  const cancel = useRef<(() => void) | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null), image = useRef<HTMLImageElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function release() {
    cancel.current?.(); cancel.current = null;
    if (timer.current !== null) clearTimeout(timer.current); timer.current = null;
    if (image.current) { image.current.onload = null; image.current.onerror = null; image.current.src = ""; image.current = null; }
    if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; canvas.current = null; }
    urls.current.splice(0).forEach(url => URL.revokeObjectURL(url));
  }
  function invalidate() { generation.current++; locked.current = false; release(); setBusy(false); setOutput(null); setStatus("设置已改变，旧卡片和下载已清除，请重新生成。"); }
  function change(key: keyof Settings, value: string) { invalidate(); setSettings(current => ({ ...current, [key]: value })); }
  useEffect(() => {
    let mounted = true;
    setReady(false); setLoadError(""); setStatus("手绘组件准备中…");
    const script = document.createElement("script");
    const deadline = setTimeout(() => fail("手绘组件加载超时，请重试。"), 8000);
    function fail(message: string) { if (mounted) { mounted = false; clearTimeout(deadline); script.remove(); setLoadError(message); setStatus(message); } }
    script.src = "/vendor/rough/rough.js"; script.async = true;
    script.onload = () => { if (!mounted) return; const rough = (window as unknown as { rough?: Rough }).rough; if (typeof rough?.svg !== "function" || typeof rough?.generator !== "function") { fail("手绘组件不可用，请重试。"); return; } clearTimeout(deadline); setReady(true); setStatus("写下几句话，为今天做一张小卡片。"); };
    script.onerror = () => fail("手绘组件加载失败，请重试。"); document.head.appendChild(script);
    return () => { mounted = false; clearTimeout(deadline); script.remove(); };
  }, [attempt]);
  useEffect(() => () => { generation.current++; locked.current = false; release(); }, []);

  async function generate() {
    if (locked.current || !ready) return;
    const token = ++generation.current; release(); setOutput(null); locked.current = true; setBusy(true);
    try {
      const rough = (window as unknown as { rough?: Rough }).rough;
      if (typeof rough?.svg !== "function") throw new Error("手绘组件不可用，请刷新后重试。");
      const card = makeCard(rough, settings);
      const svgUrl = URL.createObjectURL(new Blob([card.markup], { type: "image/svg+xml;charset=utf-8" })); urls.current.push(svgUrl);
      setStatus("正在本机绘制并生成PNG…");
      const target = document.createElement("canvas"); target.width = card.width; target.height = card.height; canvas.current = target;
      const picture = new Image(); image.current = picture;
      const blob = await new Promise<Blob>((resolve, reject) => {
        cancel.current = () => reject(new Error("本轮已取消。"));
        timer.current = setTimeout(() => reject(new Error("卡片图片生成超时，请重试。")), 8000);
        picture.onload = () => { if (token !== generation.current) return; try { const context = target.getContext("2d"); if (!context) throw new Error("浏览器无法创建画布。"); context.drawImage(picture, 0, 0); target.toBlob(value => value ? resolve(value) : reject(new Error("PNG生成失败，请重试。")), "image/png"); } catch (error) { reject(error); } };
        picture.onerror = () => reject(new Error("卡片图像解析失败，请重试。")); picture.src = svgUrl;
      });
      if (token !== generation.current) return;
      cancel.current = null; if (timer.current !== null) clearTimeout(timer.current); timer.current = null;
      picture.onload = null; picture.onerror = null; picture.src = ""; image.current = null;
      target.width = 0; target.height = 0; canvas.current = null;
      const pngUrl = URL.createObjectURL(blob); urls.current.push(pngUrl);
      setOutput({ ...card, png: pngUrl, svg: svgUrl }); setStatus("卡片已生成。相同设置和种子可复现相同手绘线条，保存SVG或PNG留作纪念。");
    } catch (error) { if (token === generation.current) { release(); setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); } }
    finally { if (token === generation.current) { locked.current = false; setBusy(false); } }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a href="/">生活小助手</a><a href="/discover">← 回到日常工具</a></nav>
    <p className={styles.kicker}>写几句话，画一点心情</p><h1>手绘生活卡片</h1>
    <p className={styles.intro}>把短句、几何装饰和喜欢的颜色组合起来，做一张有随手涂鸦感的生活小卡。</p>
    <p className={styles.privacy}>全部在本机生成 · 不上传 · 无图片或远程字体</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 写字与搭配</h2>
      <label className={styles.field}>卡片标题<input id="sketch-title" value={settings.title} maxLength={33} onChange={event => change("title", event.target.value)} /></label>
      <label className={styles.field}>想写的话<textarea id="sketch-body" value={settings.body} maxLength={201} rows={4} onChange={event => change("body", event.target.value)} /></label>
      <p className={styles.hint}>标题最多16字符；正文1–3行，每行最多20字符。不接受SVG/HTML标签、图片地址或链接，只排版纯文字。</p>
      <div className={styles.row}><label className={styles.field}>几何装饰<select id="sketch-shape" value={settings.shape} onChange={event => change("shape", event.target.value)}><option value="circle">圆圈</option><option value="rectangle">小方块</option><option value="triangle">三角形</option><option value="diamond">菱形</option></select></label><label className={styles.field}>装饰数量<input id="sketch-count" type="number" min="1" max="6" step="1" value={settings.count} onChange={event => change("count", event.target.value)} /></label></div>
      <div className={styles.colors}>{[["stroke", "文字与线条"], ["fill", "装饰填色"], ["paper", "纸张底色"]].map(([key, label]) => <label className={styles.field} key={key}>{label}<input id={`sketch-${key}`} type="color" value={settings[key as keyof Settings]} onChange={event => change(key as keyof Settings, event.target.value)} /></label>)}</div>
      <div className={styles.row}><label className={styles.field}>卡片尺寸<select id="sketch-size" value={settings.size} onChange={event => change("size", event.target.value)}><option value="landscape">横卡 1024 × 768</option><option value="portrait">竖卡 768 × 1024</option></select></label><label className={styles.field}>填色笔触<select id="sketch-fill-style" value={settings.fillStyle} onChange={event => change("fillStyle", event.target.value)}><option value="hachure">排线涂色</option><option value="solid">平涂色块</option></select></label></div>
      <div className={styles.row}><label className={styles.field}>手绘感<select id="sketch-roughness" value={settings.roughness} onChange={event => change("roughness", event.target.value)}><option value="1.2">轻轻一笔</option><option value="2.2">随手涂鸦</option><option value="3.2">活泼笔触</option></select></label><label className={styles.field}>随机种子<input id="sketch-seed" type="number" min="1" max="999999999" step="1" value={settings.seed} onChange={event => change("seed", event.target.value)} /></label></div>
      <p className={styles.hint}>种子1–999999999。保留这个数字和其他设置，就能重现相同线条；换个种子会得到另一版笔触。</p>
      <div className={styles.actions}><button id="sketch-generate" className={styles.primary} disabled={!ready || busy} onClick={generate}>{busy ? "生成中…" : "生成手绘卡片"}</button><button className={styles.secondary} onClick={() => change("seed", String(Math.floor(Math.random() * 999999999) + 1))}>换个种子</button><button className={styles.secondary} onClick={() => { invalidate(); setSettings(initial); }}>恢复示例</button>{loadError && <button id="sketch-retry" className={styles.secondary} onClick={() => { invalidate(); setAttempt(value => value + 1); }}>重试加载组件</button>}</div>
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 看看你的卡片</h2>
      {output ? <div id="sketch-output"><img id="sketch-preview" className={styles.preview} src={output.png} width={output.width} height={output.height} alt={`${output.title}，手绘几何生活卡片`} /><p className={styles.hint}>{output.width} × {output.height}像素 · {output.count}个装饰 · 种子 {output.seed}</p><div className={styles.downloads}><a id="sketch-svg" href={output.svg} download="我的手绘生活卡.svg">保存SVG</a><a id="sketch-png" href={output.png} download="我的手绘生活卡.png">保存PNG</a></div><p className={styles.hint}>SVG保留线条，可放大；文字采用系统字体，在不同设备上字形可能有差异。PNG与当前预览一致。</p></div> : <div className={styles.empty}>卡片将在这里出现。可以写个小计划，或送自己一句鼓励。</div>}
    </section></div><footer className={styles.footer}>基于 <a href="https://github.com/rough-stuff/rough" target="_blank" rel="noreferrer">Rough.js 4.6.6</a> 的中文有限卡片封装。<a href="/vendor/rough/LICENSE">MIT许可</a> · <a href="/vendor/rough/SOURCE.md">依赖许可与来源</a><br />仅排版短文字和固定几何装饰，不导入照片、不编辑任意SVG，也不提供通用图像编辑器功能。字体为普通系统字体，手绘效果来自线条，并非模拟个人笔迹。</footer>
  </main>;
}
