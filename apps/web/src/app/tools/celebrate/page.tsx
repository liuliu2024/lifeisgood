"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./celebrate.module.css";

type Cannon = { (options: unknown): Promise<void> | null; reset(): void };
type Confetti = { create(canvas: HTMLCanvasElement, options: unknown): Cannon };
const width = 960, height = 640;
const palettes = { warm: ["#D58B45", "#A35F79", "#34765D", "#E1BD62"], fresh: ["#2E7D78", "#729F45", "#648DB6", "#B9A05B"], bright: ["#B95C67", "#755FA8", "#397B9D", "#D4A045"] };
const defaultGreeting = "今天也值得庆祝";
export default function CelebrateTool() {
  const [greeting, setGreeting] = useState(defaultGreeting), [palette, setPalette] = useState("warm");
  const [ready, setReady] = useState(false), [loadError, setLoadError] = useState(""), [attempt, setAttempt] = useState(0);
  const [running, setRunning] = useState(false), [encoding, setEncoding] = useState(false), [reduced, setReduced] = useState(false);
  const [output, setOutput] = useState<string | null>(null), [status, setStatus] = useState("庆祝组件准备中…");
  const canvas = useRef<HTMLCanvasElement>(null), cannon = useRef<Cannon | null>(null), frameCanvas = useRef<HTMLCanvasElement | null>(null);
  const animationId = useRef(0), encodeId = useRef(0), runningRef = useRef(false), encodingRef = useRef(false), file = useRef<string | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null), stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null), encodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelEncoding = useRef<(() => void) | null>(null);
  function clearFile() { if (file.current) URL.revokeObjectURL(file.current); file.current = null; setOutput(null); }
  function clearEncoding() {
    encodeId.current++; cancelEncoding.current?.(); cancelEncoding.current = null;
    if (encodeTimer.current !== null) clearTimeout(encodeTimer.current); encodeTimer.current = null;
    if (frameCanvas.current) { frameCanvas.current.width = 0; frameCanvas.current.height = 0; frameCanvas.current = null; }
    encodingRef.current = false; setEncoding(false);
  }
  function stop(message?: string) {
    animationId.current++; runningRef.current = false;
    if (captureTimer.current !== null) clearTimeout(captureTimer.current); captureTimer.current = null;
    if (stopTimer.current !== null) clearTimeout(stopTimer.current); stopTimer.current = null;
    cannon.current?.reset(); cannon.current = null; clearEncoding();
    if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
    setRunning(false); if (message) setStatus(message);
  }
  function invalidate() { stop(); clearFile(); setStatus("设置已改变，旧动效与静帧已清除，请重新生成。"); }
  function validate() {
    const value = greeting.trim();
    if (!value || Array.from(value).length > 24 || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f<>]/.test(value) || /https?:\/\/|(?:data|javascript):/i.test(value)) throw new Error("祝福请填写1–24字符的纯文字，不接受标签、链接或隐藏控制字符。");
    if (!Object.hasOwn(palettes, palette)) throw new Error("请选择支持的配色。");
    return value;
  }
  async function capture(value: string) {
    if (encodingRef.current || !canvas.current || !canvas.current.width) return;
    clearFile(); encodingRef.current = true; setEncoding(true); const token = ++encodeId.current;
    try {
      const live = canvas.current, pixels = live.getContext("2d")?.getImageData(0, 0, width, height).data;
      if (!pixels || !pixels.some((channel, index) => index % 4 === 3 && channel > 0)) throw new Error("当前画面暂无色纸，请重新播放后再截取。");
      const target = document.createElement("canvas"); target.width = width; target.height = height; frameCanvas.current = target;
      const context = target.getContext("2d"); if (!context) throw new Error("浏览器无法创建图片画布。");
      context.fillStyle = "#FFF8EC"; context.fillRect(0, 0, width, height); context.drawImage(live, 0, 0);
      context.fillStyle = "#285B40"; context.textAlign = "center"; context.font = "700 44px 'Microsoft YaHei', system-ui, sans-serif";
      const chars = Array.from(value); for (let index = 0; index < Math.ceil(chars.length / 12); index++) context.fillText(chars.slice(index * 12, (index + 1) * 12).join(""), width / 2, 110 + index * 58);
      const blob = await new Promise<Blob>((resolve, reject) => {
        cancelEncoding.current = () => reject(new Error("静帧已取消。"));
        encodeTimer.current = setTimeout(() => reject(new Error("PNG编码超时，请重新生成。")), 8000);
        target.toBlob(value => value ? resolve(value) : reject(new Error("PNG生成失败，请重新生成。")), "image/png");
      });
      if (token !== encodeId.current) return;
      cancelEncoding.current = null; if (encodeTimer.current !== null) clearTimeout(encodeTimer.current); encodeTimer.current = null;
      target.width = 0; target.height = 0; frameCanvas.current = null;
      const url = URL.createObjectURL(blob); file.current = url; setOutput(url);
      if (!runningRef.current && canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
      setStatus(runningRef.current ? "已留住一张色纸静帧；动效仍在播放，可随时停止或再截一张。" : "静态庆祝画面已生成，可以保存PNG。");
    } catch (error) { if (token === encodeId.current) { stop(); clearFile(); setStatus(error instanceof Error ? error.message : "静帧生成失败，请重试。"); } }
    finally { if (token === encodeId.current) { encodingRef.current = false; setEncoding(false); } }
  }
  useEffect(() => {
    let mounted = true; setReady(false); setLoadError(""); setStatus("庆祝组件准备中…");
    const script = document.createElement("script"), timer = setTimeout(() => fail("庆祝组件加载超时，请重试。"), 8000);
    function fail(message: string) { if (mounted) { mounted = false; clearTimeout(timer); script.remove(); setLoadError(message); setStatus(message); } }
    script.src = "/vendor/canvas-confetti/confetti.browser.js"; script.async = true;
    script.onload = () => { if (!mounted) return; if (typeof (window as unknown as { confetti?: Confetti }).confetti?.create !== "function") { fail("庆祝组件不可用，请重试。"); return; } clearTimeout(timer); setReady(true); setStatus("写一句祝福，点击后才会播放；也可以随时停止。"); };
    script.onerror = () => fail("庆祝组件加载失败，请重试。"); document.head.appendChild(script);
    return () => { mounted = false; clearTimeout(timer); script.remove(); };
  }, [attempt]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)"); setReduced(query.matches);
    const motion = () => { setReduced(query.matches); if (query.matches) stop("已切换为减少动态偏好，当前动画已停止；再次生成将只制作静态画面。"); };
    const visibility = () => { if (document.hidden) stop("页面进入后台，动效与待编码已停止。已有静帧会保留。"); };
    query.addEventListener("change", motion); document.addEventListener("visibilitychange", visibility);
    return () => { query.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); animationId.current++; encodeId.current++; cannon.current?.reset(); cannon.current = null; cancelEncoding.current?.(); [captureTimer, stopTimer, encodeTimer].forEach(ref => { if (ref.current !== null) clearTimeout(ref.current); ref.current = null; }); if (frameCanvas.current) { frameCanvas.current.width = 0; frameCanvas.current.height = 0; } if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; } if (file.current) URL.revokeObjectURL(file.current); };
  }, []);

  function generate() {
    if (!ready || runningRef.current || encodingRef.current) return;
    invalidate();
    try {
      const value = validate(), live = canvas.current, confetti = (window as unknown as { confetti?: Confetti }).confetti;
      if (!live || typeof confetti?.create !== "function") { setReady(false); setLoadError("庆祝组件不可用，请重新加载。"); throw new Error("庆祝组件不可用，请重新加载。"); }
      live.width = width; live.height = height;
      const colors = palettes[palette as keyof typeof palettes];
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const context = live.getContext("2d"); if (!context) throw new Error("浏览器无法创建画布。");
        for (let index = 0; index < 60; index++) { const x = 50 + (index * 137 % 850), y = 210 + (index * 79 % 360); context.save(); context.translate(x, y); context.rotate((index % 7 - 3) * .16); context.fillStyle = colors[index % colors.length]; context.fillRect(-8, -5, 16, 10); context.restore(); }
        setStatus("已尊重系统减少动态偏好，正在制作静态色纸画面，不播放动画。"); void capture(value); return;
      }
      const token = ++animationId.current;
      const fire = confetti.create(live, { resize: false, useWorker: false, disableForReducedMotion: true }); cannon.current = fire; runningRef.current = true; setRunning(true);
      const done = fire({ particleCount: 80, spread: 85, origin: { x: .5, y: .83 }, startVelocity: 30, gravity: .7, decay: .92, ticks: 140, scalar: 1.6, shapes: ["square", "circle"], colors, disableForReducedMotion: true });
      captureTimer.current = setTimeout(() => { captureTimer.current = null; if (token === animationId.current) void capture(value); }, 450);
      stopTimer.current = setTimeout(() => { if (token === animationId.current) stop(file.current ? "本次播放已到3秒上限并停止；保存的PNG静帧仍可下载。" : "本次播放已停止，尚未留下静帧，可重新播放。"); }, 3000);
      done?.then(() => { if (token === animationId.current) stop(file.current ? "本次色纸已落下，动效已停止；静帧仍可保存。" : "动效已结束，未留下静帧，可重新播放后截取。"); }).catch(() => { if (token === animationId.current) { stop(); clearFile(); setStatus("动效播放失败，请重新生成。"); } });
      setStatus("正在播放一轮色纸，最多3秒；约半秒时自动留一张静帧，可随时停止。");
    } catch (error) { stop(); clearFile(); setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); }
  }
  const frozen = !!output && !running;
  return <main className={styles.shell}>
    <nav className={styles.nav}><Link href="/">生活小助手</Link><Link href="/#daily-tools">← 回到新发现</Link></nav>
    <p className={styles.kicker}>给小小的好事一点仪式感</p><h1>庆祝一下</h1>
    <p className={styles.intro}>完成一个小目标，也值得撒一点色纸。写下祝福，主动播放一小段，再留一张纪念。</p>
    <p className={styles.privacy}>本机画布 · 无声音、通知或外部素材 · 不是视频/GIF导出</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 写一句祝福</h2>
      <label className={styles.field}>短祝福<input id="celebrate-greeting" value={greeting} maxLength={49} onChange={event => { invalidate(); setGreeting(event.target.value); }} /></label>
      <p className={styles.hint}>1–24个字符，只排版纯文字，不接受标签、图片地址或链接。</p>
      <label className={styles.field}>色纸配色<select id="celebrate-palette" value={palette} onChange={event => { invalidate(); setPalette(event.target.value); }}><option value="warm">暖暖庆祝 · 金色与豆沙</option><option value="fresh">清新时刻 · 绿与蓝</option><option value="bright">愉快相遇 · 紫与珊瑚</option></select></label>
      {reduced && <p id="celebrate-reduced" className={styles.notice}>已开启减少动态偏好：只生成静态色纸画面，不播放动画。</p>}
      <button id="celebrate-generate" className={styles.primary} disabled={!ready || running || encoding} onClick={generate}>{reduced ? "生成静态庆祝画面" : "播放一轮庆祝"}</button>
      <div className={styles.actions}><button id="celebrate-stop" disabled={!running && !encoding} onClick={() => stop("已停止动效和待编码，已有PNG静帧会保留。")} >立即停止</button><button id="celebrate-capture" disabled={!running || encoding} onClick={() => { try { void capture(validate()); } catch (error) { setStatus(error instanceof Error ? error.message : "输入无效。"); } }}>截取当前画面</button></div>
      {loadError && <button id="celebrate-retry" className={styles.secondary} onClick={() => { invalidate(); setAttempt(value => value + 1); }}>重试加载组件</button>}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 看看庆祝画布</h2>
      <div className={styles.stage} id="celebrate-stage" data-running={running} data-encoding={encoding}>
        <canvas id="celebrate-canvas" ref={canvas} width="0" height="0" className={styles.canvas} aria-label="本机色纸粒子画布" />
        {frozen ? <img id="celebrate-preview" className={styles.frozen} src={output!} alt="本次保存的庆祝PNG静帧" /> : <p className={styles.greeting}>{Array.from(greeting.trim()).reduce((text, char, index) => text + (index === 12 ? "\n" : "") + char, "")}</p>}
      </div>
      <p className={styles.hint}>960 × 640固定画布 · 动态一轮最多80粒、约2–3秒。播放前不自动启动，切到后台或离开会停止。</p>
      {encoding && <p className={styles.hint}>正在保存静帧…</p>}
      {output && <a id="celebrate-png" className={styles.download} href={output} download="我的庆祝静帧.png">保存PNG静帧</a>}
      <p className={styles.hint}>PNG是截取时的静止画面，不是动画视频或GIF。停止后会展示已保存静帧；修改文字或配色会清除旧下载。</p>
    </section></div>
    <footer className={styles.footer}>基于 <a href="https://github.com/catdad/canvas-confetti" target="_blank" rel="noreferrer">canvas-confetti 1.9.4</a> 的中文有限庆祝画布。<a href="/vendor/canvas-confetti/LICENSE">ISC许可</a> · <a href="/vendor/canvas-confetti/SOURCE.md">固定来源与边界</a>。字体为本机系统字体；后台节流可能影响停止时机，请保持前台使用。</footer>
  </main>;
}
