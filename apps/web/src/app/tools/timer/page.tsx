"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./timer.module.css";

type Mode = "stopwatch" | "countdown";
type Phase = "idle" | "running" | "paused" | "finished";
type Instance = { start(config?: unknown): void; pause(): void; stop(): void; isRunning(): boolean; getTotalTimeValues(): { secondTenths: number }; addEventListener(name: string, callback: () => void): void; removeAllEventListeners(): void };
type Factory = { new(): Instance };
type Reading = { elapsedTenths: number; remainingTenths: number | null; shownTenths: number };
type Entry = Reading & { number: number; recordedAt: string };
type Session = { mode: Mode; countdownSeconds: number | null; startedAt: string };
const limit = 864000;
const empty: Reading = { elapsedTenths: 0, remainingTenths: null, shownTenths: 0 };
const phaseNames = { idle: "尚未开始", running: "计时中", paused: "已暂停", finished: "本轮已结束" };
function display(tenths: number) { const value = Math.max(0, Math.floor(tenths)), seconds = Math.floor(value / 10); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${value % 10}`; }
function parseDuration(minutes: string, seconds: string) {
  if (!/^\d{1,4}$/.test(minutes) || !/^\d{1,2}$/.test(seconds) || Number(minutes) > 1440 || Number(seconds) > 59) throw new Error("分钟请填0–1440的整数，秒请填0–59的整数，不接受小数或表达式。");
  const total = Number(minutes) * 60 + Number(seconds);
  if (total < 1 || total > 86400) throw new Error("倒计时总时长请设为1秒至24小时；1440分钟时秒数须为0。");
  return total;
}

export default function TimerTool() {
  const [mode, setMode] = useState<Mode>("stopwatch"), [minutes, setMinutes] = useState("5"), [seconds, setSeconds] = useState("0");
  const [phase, setPhase] = useState<Phase>("idle"), [reading, setReading] = useState<Reading>(empty);
  const [records, setRecords] = useState<Entry[]>([]), [output, setOutput] = useState<{ json: string; txt: string } | null>(null);
  const [ready, setReady] = useState(false), [attempt, setAttempt] = useState(0), [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("计时组件准备中…");
  const timer = useRef<Instance | null>(null), currentPhase = useRef<Phase>("idle"), currentReading = useRef<Reading>(empty);
  const session = useRef<Session | null>(null), entries = useRef<Entry[]>([]), generation = useRef(0), urls = useRef<string[]>([]);
  function changePhase(value: Phase) { currentPhase.current = value; setPhase(value); }
  function clearOutput() { urls.current.splice(0).forEach(url => URL.revokeObjectURL(url)); setOutput(null); }
  function destroy() { if (timer.current) { const previous = timer.current; timer.current = null; previous.removeAllEventListeners(); previous.stop(); } }
  function invalidate() { generation.current++; destroy(); clearOutput(); entries.current = []; session.current = null; setRecords([]); currentReading.current = empty; setReading(empty); changePhase("idle"); setStatus("本轮计时与记录已清除，可以重新开始。"); }
  function getReading(): Reading {
    const active = session.current;
    if (!active || !timer.current) return currentReading.current;
    const raw = timer.current.getTotalTimeValues().secondTenths;
    if (!Number.isFinite(raw)) throw new Error("计时读数异常，请重置后重试。");
    if (active.mode === "countdown") { const total = active.countdownSeconds! * 10, remaining = Math.max(0, Math.min(total, raw)); return { remainingTenths: remaining, elapsedTenths: total - remaining, shownTenths: remaining }; }
    const elapsed = Math.max(0, Math.min(limit, raw)); return { elapsedTenths: elapsed, remainingTenths: null, shownTenths: elapsed };
  }
  function updateReading(value: Reading) { currentReading.current = value; setReading(value); }
  function freezeOutput(state: "paused" | "finished", value: Reading) {
    clearOutput();
    if (!session.current) return false;
    try {
    const serialize = (item: Reading) => ({ elapsedSeconds: item.elapsedTenths / 10, remainingSeconds: item.remainingTenths === null ? null : item.remainingTenths / 10, displayed: display(item.shownTenths) });
    const data = { schemaVersion: 1, generator: "EasyTimer.js", version: "4.6.0", session: { ...session.current, maximumSeconds: 86400 }, state, snapshot: { capturedAt: new Date().toISOString(), ...serialize(value) }, records: entries.current.map(entry => ({ number: entry.number, recordedAt: entry.recordedAt, ...serialize(entry) })), limitations: ["仅当前前台页面计时；检测到页面隐藏会自动暂停", "后台节流、休眠、系统时钟变化可能影响精度或结束时机", "离开/刷新/关闭不保活，不是系统闹钟或通知", "展示0.1秒不代表0.1秒测量保证，暂停期间不累计"] };
    const txt = [`生活计时器 · EasyTimer.js 4.6.0`, `模式：${data.session.mode === "stopwatch" ? "秒表" : "倒计时"}`, `开始：${data.session.startedAt}`, `状态：${state === "paused" ? "已暂停" : "已结束"}`, `本次读数：${data.snapshot.displayed}；已用${data.snapshot.elapsedSeconds}秒${data.snapshot.remainingSeconds === null ? "" : `；剩余${data.snapshot.remainingSeconds}秒`}`, `倒计时设定：${data.session.countdownSeconds === null ? "无" : `${data.session.countdownSeconds}秒`}`, "", ...data.records.map(entry => `记录${entry.number}：${entry.displayed}；已用${entry.elapsedSeconds}秒${entry.remainingSeconds === null ? "" : `；剩余${entry.remainingSeconds}秒`}；${entry.recordedAt}`), "", ...data.limitations].join("\n") + "\n";
    const json = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })); urls.current.push(json);
    const text = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); urls.current.push(text); setOutput({ json, txt: text }); return true;
    } catch {
      clearOutput(); setStatus("记录文件生成失败，计时已保持暂停或结束。请点击重新生成记录文件。"); return false;
    }
  }
  function finish() {
    if (currentPhase.current !== "running" || !session.current) return;
    const value: Reading = session.current.mode === "countdown" ? { elapsedTenths: session.current.countdownSeconds! * 10, remainingTenths: 0, shownTenths: 0 } : { elapsedTenths: limit, remainingTenths: null, shownTenths: limit };
    generation.current++; destroy(); updateReading(value); changePhase("finished");
    if (freezeOutput("finished", value)) setStatus(session.current.mode === "countdown" ? "倒计时已到零，已停止。没有声音或系统通知，请保持前台查看。" : "秒表已达到24小时上限并停止。可先保存本轮记录，再开始新一轮。");
  }
  function pause(hidden = false) {
    if (currentPhase.current !== "running" || !timer.current) return;
    timer.current.pause(); const value = getReading(); updateReading(value); changePhase("paused");
    if (freezeOutput("paused", value)) setStatus(hidden ? "页面进入后台，计时已自动暂停。回到前台后请点击继续。" : "已暂停，暂停期间不累计。可以保存记录或继续计时。");
  }
  useEffect(() => {
    let mounted = true; setReady(false); setLoadError(""); setStatus("计时组件准备中…");
    const script = document.createElement("script"), deadline = setTimeout(() => fail("计时组件加载超时，请重试。"), 8000);
    function fail(message: string) { if (mounted) { mounted = false; clearTimeout(deadline); script.remove(); setLoadError(message); setStatus(message); } }
    script.src = "/vendor/easytimer/easytimer.js"; script.async = true;
    script.onload = () => { if (!mounted) return; if (typeof (window as unknown as { easytimer?: { Timer?: Factory } }).easytimer?.Timer !== "function") { fail("计时组件不可用，请重试。"); return; } clearTimeout(deadline); setReady(true); setStatus("选择秒表或设置倒计时，开始一段专注时间。"); };
    script.onerror = () => fail("计时组件加载失败，请重试。"); document.head.appendChild(script);
    return () => { mounted = false; clearTimeout(deadline); script.remove(); };
  }, [attempt]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) pause(true); };
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); generation.current++; destroy(); urls.current.splice(0).forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  function start() {
    if (!ready || currentPhase.current === "running") return;
    try {
      if (currentPhase.current === "paused" && timer.current) { clearOutput(); timer.current.start(); if (!timer.current.isRunning()) throw new Error("计时未能继续，请重置后重试。"); changePhase("running"); setStatus("已继续，暂停期间的时间不计入本轮。"); return; }
      invalidate();
      if (!["stopwatch", "countdown"].includes(mode)) throw new Error("请选择秒表或倒计时。");
      const total = mode === "countdown" ? parseDuration(minutes, seconds) : null;
      const Timer = (window as unknown as { easytimer?: { Timer?: Factory } }).easytimer?.Timer;
      if (typeof Timer !== "function") { setReady(false); setLoadError("计时组件不可用，请重新加载。"); throw new Error("计时组件不可用，请重新加载。"); }
      const instance = new Timer(), token = ++generation.current; timer.current = instance;
      session.current = { mode, countdownSeconds: total, startedAt: new Date().toISOString() };
      updateReading(mode === "countdown" ? { elapsedTenths: 0, remainingTenths: total! * 10, shownTenths: total! * 10 } : empty);
      instance.addEventListener("secondTenthsUpdated", () => {
        if (generation.current !== token || timer.current !== instance || currentPhase.current !== "running") return;
        try { const value = getReading(); updateReading(value); if (session.current?.mode === "countdown" ? value.remainingTenths === 0 : value.elapsedTenths >= limit) finish(); }
        catch (error) { invalidate(); setStatus(error instanceof Error ? error.message : "计时失败，请重新开始。"); }
      });
      instance.addEventListener("targetAchieved", () => { if (generation.current === token && timer.current === instance) finish(); });
      changePhase("running");
      instance.start({ precision: "secondTenths", countdown: mode === "countdown", ...(mode === "countdown" ? { startValues: { seconds: total }, target: { seconds: 0 } } : { target: { seconds: 86400 } }) });
      if (!instance.isRunning()) throw new Error("计时未能开始，请重置后重试。");
      setStatus("正在计时。保持当前页面在前台；可记录读数、暂停和继续。");
    } catch (error) { generation.current++; destroy(); changePhase("idle"); clearOutput(); setStatus(error instanceof Error ? error.message : "启动失败，请重试。"); }
  }
  function record() {
    if (!["running", "paused"].includes(currentPhase.current) || !timer.current || entries.current.length >= 20) return;
    const value = getReading(); const next = [...entries.current, { ...value, number: entries.current.length + 1, recordedAt: new Date().toISOString() }]; entries.current = next; setRecords(next); updateReading(value);
    if (currentPhase.current === "paused" && !freezeOutput("paused", value)) return;
    setStatus(next.length === 20 ? "已记录第20条，达到本轮记录上限；仍可暂停、继续或保存。" : "当前读数已记下。暂停或结束后可保存本轮JSON和TXT。");
  }
  let shown: string;
  try { shown = phase === "idle" ? display(mode === "countdown" ? parseDuration(minutes, seconds) * 10 : 0) : display(reading.shownTenths); } catch { shown = "--:--:--.-"; }
  return <main className={styles.shell}>
    <nav className={styles.nav}><Link href="/">生活小助手</Link><Link href="/#daily-tools">← 回到新发现</Link></nav>
    <p className={styles.kicker}>给生活留一段专注时间</p><h1>生活计时器</h1>
    <p className={styles.intro}>散步、拉伸、泡茶，或记录一件小事用了多久。秒表与倒计时，都在当前页面完成。</p>
    <p className={styles.privacy}>本机计时 · 不申请通知或后台权限 · 不上传记录</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 选好计时方式</h2>
      <label className={styles.field}>计时模式<select id="timer-mode" value={mode} onChange={event => { invalidate(); setMode(event.target.value as Mode); }}><option value="stopwatch">秒表 · 从零开始</option><option value="countdown">倒计时 · 等待归零</option></select></label>
      {mode === "countdown" && <div className={styles.row}><label className={styles.field}>分钟<input id="timer-minutes" type="number" min="0" max="1440" step="1" value={minutes} onChange={event => { invalidate(); setMinutes(event.target.value); }} /></label><label className={styles.field}>秒<input id="timer-seconds" type="number" min="0" max="59" step="1" value={seconds} onChange={event => { invalidate(); setSeconds(event.target.value); }} /></label></div>}
      <p className={styles.hint}>倒计时1秒至24小时，秒表最多24小时。修改模式或时长、重置、开始新一轮都会清空当前读数、记录与下载。</p>
      <div className={styles.actions}><button id="timer-start" className={styles.primary} disabled={!ready || phase === "running"} onClick={start}>{phase === "paused" ? "继续计时" : phase === "finished" ? "开始新一轮" : "开始计时"}</button><button id="timer-pause" className={styles.secondary} disabled={phase !== "running"} onClick={() => pause()}>暂停</button><button id="timer-reset" className={styles.secondary} onClick={invalidate}>重置本轮</button></div>
      {loadError && <button id="timer-retry" className={styles.secondary} onClick={() => { invalidate(); setAttempt(value => value + 1); }}>重试加载组件</button>}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 当前读数</h2>
      <p id="timer-phase" className={styles.phase} data-phase={phase}>{phaseNames[phase]}</p><output id="timer-display" role="timer" aria-live="off" aria-label="当前计时读数" className={styles.clock} data-tenths={phase === "idle" ? "" : reading.shownTenths}>{shown}</output>
      <p className={styles.clockHint}>小时 : 分钟 : 秒 . 十分之一秒</p>
      <button id="timer-record" className={styles.recordButton} disabled={!["running", "paused"].includes(phase) || records.length >= 20} onClick={record}>记录当前读数（{records.length}/20）</button>
      <p className={styles.hint}>读数最多20条。暂停或结束时生成可保存快照；继续计时会清除旧下载，暂停后再保存最新状态。</p>
      {records.length > 0 && <div className={styles.tableWrap}><table><caption>本轮手动记录</caption><thead><tr><th>序号</th><th>读数</th><th>已用秒数</th></tr></thead><tbody>{records.map(entry => <tr key={entry.number}><td>{entry.number}</td><td>{display(entry.shownTenths)}</td><td>{entry.elapsedTenths / 10}</td></tr>)}</tbody></table></div>}
      {output && <div id="timer-output" className={styles.downloads}><a id="timer-json" href={output.json} download="本轮生活计时记录.json">保存JSON</a><a id="timer-txt" href={output.txt} download="本轮生活计时记录.txt">保存TXT</a></div>}
      {!output && (phase === "paused" || phase === "finished") && <button id="timer-save-retry" className={styles.secondary} onClick={() => { const state = currentPhase.current; if ((state === "paused" || state === "finished") && freezeOutput(state, currentReading.current)) setStatus("记录文件已重新生成，可以保存JSON或TXT。"); }}>重新生成记录文件</button>}
    </section></div>
    <aside className={styles.limits}><h2>请保持页面在前台</h2><p>检测到页面隐藏时会自动暂停，回来后手动继续。浏览器后台节流、电脑休眠或系统时钟改变仍可能影响精度和结束时机；十分之一秒的显示不是精度保证。离开此工具会停止计时，刷新或关闭不保留本轮。没有声音、系统闹钟或通知，不能依赖它在后台准时提醒。</p></aside>
    <footer className={styles.footer}>基于 <a href="https://github.com/albert-gonzalez/easytimer.js" target="_blank" rel="noreferrer">EasyTimer.js 4.6.0</a> 的中文本机封装。<a href="/vendor/easytimer/LICENSE.md">MIT许可</a> · <a href="/vendor/easytimer/SOURCE.md">来源与内联辅助函数许可</a>。本轮记录仅留在当前页面，需要保留请先暂停并保存。</footer>
  </main>;
}
