"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./wheel.module.css";

const sample = "米饭套餐\n面条\n饺子\n自己做饭";
function parse(text: string): { options: string[]; error: string } {
  if (text.length > 1500) return { options: [], error: "名单总长度不能超过1500字符。" };
  const options = text.split(/\r?\n/).map(s => s.trim().normalize("NFKC"));
  let error = "";
  if (options.length < 2 || options.length > 20) error = "请填写2–20个选项，每行一个。";
  else if (options.some(s => !s)) error = "存在空行，请填好或删除空选项。";
  else if (options.some(s => Array.from(s).length > 24)) error = "每个选项最多24个字符，请缩短后重试。";
  else if (options.some(s => /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/.test(s))) error = "选项不能包含控制字符或隐藏方向字符。";
  else if (new Set(options.map(s => s.toLocaleLowerCase())).size !== options.length) error = "有重复选项，请合并；首尾空格、大小写和全半角差异视为同一项。";
  return { options: error ? [] : options, error };
}
type Result = { index: number; landedIndex: number; rotation: number; options: string[]; selected: string };

export default function WheelTool() {
  const [text, setText] = useState(sample);
  const [round, setRound] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("转盘准备中…");
  const [failure, setFailure] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef(1);
  const locked = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { options, error } = parse(text);

  function clearTimers() {
    if (readyTimer.current !== null) clearTimeout(readyTimer.current);
    if (resultTimer.current !== null) clearTimeout(resultTimer.current);
    readyTimer.current = null; resultTimer.current = null;
  }
  function fail(message: string) {
    clearTimers(); current.current++; locked.current = false;
    setReady(false); setBusy(false); setResult(null); setUrl(""); setFailure(message); setStatus(message);
  }

  useEffect(() => {
    function initialize() {
      frame.current?.contentWindow?.postMessage({ tool: "daily-wheel", type: "init", id: current.current, options }, location.origin);
    }
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.tool !== "daily-wheel") return;
      if (event.data.type === "boot") { initialize(); return; }
      if (event.data.id !== current.current) return;
      const message = event.data;
      if (message.type === "ready") { if (readyTimer.current !== null) clearTimeout(readyTimer.current); readyTimer.current = null; setReady(true); setStatus("准备好了。点击转动，让转盘帮你做个小决定。"); }
      if (message.type === "result" && locked.current) {
        if (resultTimer.current !== null) clearTimeout(resultTimer.current); resultTimer.current = null;
        locked.current = false; setBusy(false);
        if (!Number.isInteger(message.index) || message.index < 0 || message.index >= options.length || message.landedIndex !== message.index || !Number.isFinite(message.rotation)) { fail("落点校验失败，本轮已停止。请点击重试转盘。"); return; }
        setResult({ index: message.index, landedIndex: message.landedIndex, rotation: message.rotation, options, selected: options[message.index] });
        setStatus("转盘已停下，顶部指针所指的选项就是本轮结果。");
      }
    }
    addEventListener("message", receive);
    const token = current.current;
    if (!error) readyTimer.current = setTimeout(() => { if (current.current === token) fail("转盘加载超时，本轮已停止。请点击重试转盘。"); }, 8000);
    initialize();
    return () => { removeEventListener("message", receive); clearTimers(); };
  }, [text, round]);
  useEffect(() => {
    if (!result) { setUrl(""); return; }
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, generator: "lucky-canvas", version: "1.7.26", options: result.options, result: { index: result.index, number: result.index + 1, text: result.selected }, landing: { index: result.landedIndex, rotationDegrees: result.rotation, pointer: "top" }, use: "本机生活小决定，非密码学公平证明" }, null, 2)], { type: "application/json;charset=utf-8" }));
    setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl);
  }, [result]);

  function invalidate(nextText = text) {
    clearTimers(); setFailure("");
    locked.current = false; current.current++; setRound(current.current);
    setText(nextText); setReady(false); setBusy(false); setResult(null); setUrl("");
    setStatus("旧动画和结果已清除，正在准备新一轮。");
  }
  function spin() {
    if (locked.current || !ready || error) return;
    locked.current = true; setBusy(true); setResult(null); setUrl(""); setStatus("正在转动…稍等片刻。");
    const token = current.current;
    resultTimer.current = setTimeout(() => { if (current.current === token && locked.current) fail("转盘未能正常结束，本轮已停止且未记录结果。请点击重试转盘。"); }, 8000);
    frame.current?.contentWindow?.postMessage({ tool: "daily-wheel", type: "spin", id: current.current }, location.origin);
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a href="/">生活小助手</a><a href="/discover">← 回到日常工具</a></nav>
    <p className={styles.kicker}>生活里的小决定</p><h1>今天选什么</h1>
    <p className={styles.intro}>午饭吃什么、周末做什么？写下选项，让转盘给你一个灵感。</p>
    <p className={styles.privacy}>文字与转动均留在本机 · 不上传 · 无远程图片</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 写下备选</h2>
      <label htmlFor="wheel-options">每行一个选项</label>
      <textarea id="wheel-options" name="wheel_options" value={text} maxLength={1501} rows={9} spellCheck={false} onChange={event => invalidate(event.target.value)} aria-describedby="wheel-help" />
      <p id="wheel-help" className={styles.hint}>2–20项，每项最多24字符；不接受空项或重复项。最多8项时显示序号和短名，更多选项时仅显示序号；完整文字见转盘下方名单。</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button id="wheel-spin" disabled={!ready || busy || !!error} onClick={spin}>{busy ? "转动中…" : result ? "再转一次" : "转动，帮我选"}</button><button className={styles.secondary} onClick={() => invalidate()} id="wheel-reset">{failure ? "重试转盘" : "重置本轮"}</button><button className={styles.secondary} onClick={() => invalidate(sample)}>恢复示例</button></div>
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 看看落在哪</h2>
      {error || failure ? <div className={styles.empty}>{failure || "请先整理好左侧选项。"}</div> : <iframe key={round} ref={frame} title="文字选择转盘" className={styles.frame} src="/vendor/lucky-canvas/wheel-frame.html" onLoad={() => { frame.current?.contentWindow?.postMessage({ tool: "daily-wheel", type: "init", id: current.current, options }, location.origin); }} />}
      <p className={styles.hint}>顶部箭头为固定指针，每项等角度。旋转结束后才记录结果。</p>
      {result && <div id="wheel-result" className={styles.result} data-index={result.index} data-landed-index={result.landedIndex} data-rotation={result.rotation}><span>本轮选择 · 第{result.index + 1}项</span><strong>{result.selected}</strong>{url && <a id="wheel-json" href={url} download="今天选什么-选项与结果.json">保存选项与结果 JSON</a>}</div>}
      <ol className={styles.list} aria-label="当前完整选项">{options.map((option, index) => <li key={index} aria-current={result?.index === index ? "true" : undefined}>{option}</li>)}</ol>
    </section></div>
    <footer className={styles.footer}>基于 <a href="https://github.com/buuing/lucky-canvas" target="_blank" rel="noreferrer">lucky-canvas 1.7.26</a> 的中文网页封装，仅使用其转盘库。<a href="/vendor/lucky-canvas/LICENSE">Apache-2.0许可</a> · <a href="/vendor/lucky-canvas/SOURCE.md">来源与限制</a><br />仅供生活小决定；使用浏览器普通伪随机数，不提供密码学公平保证。不用于金钱、奖品或营销开奖。刷新或离开会清空本轮，想保留请下载JSON。</footer>
  </main>;
}
