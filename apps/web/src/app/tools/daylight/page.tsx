"use client";

import { useEffect, useRef, useState } from "react";
import { asText, calculate, duration, type Inputs, type Result, type SunCalc } from "./calculate";
import styles from "./daylight.module.css";

const initial: Inputs = { latitude: "31.2304", longitude: "121.4737", date: "2026-06-21", offset: "+08:00" };
type Output = { result: Result; json: string; txt: string };
export default function DaylightTool() {
  const [input, setInput] = useState<Inputs>(initial), [output, setOutput] = useState<Output | null>(null);
  const [ready, setReady] = useState(false), [attempt, setAttempt] = useState(0), [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("日光组件准备中…");
  const urls = useRef<string[]>([]), locked = useRef(false);
  function release() { urls.current.splice(0).forEach(url => URL.revokeObjectURL(url)); }
  function invalidate() { release(); setOutput(null); setStatus("输入已改变，旧结果和下载已清除，请重新计算。"); }
  function change(key: keyof Inputs, value: string) { invalidate(); setInput(current => ({ ...current, [key]: value })); }
  useEffect(() => {
    let mounted = true;
    setReady(false); setLoadError(""); setStatus("日光组件准备中…");
    const script = document.createElement("script");
    const timer = setTimeout(() => fail("日光组件加载超时，请重试。"), 8000);
    function fail(message: string) { if (mounted) { mounted = false; clearTimeout(timer); script.remove(); setLoadError(message); setStatus(message); } }
    script.src = "/vendor/suncalc/suncalc.js"; script.async = true;
    script.onload = () => { if (!mounted) return; const sun = (window as unknown as { SunCalc?: SunCalc }).SunCalc; if (typeof sun?.getTimes !== "function" || typeof sun?.getPosition !== "function") { fail("日光组件不可用，请重试。"); return; } clearTimeout(timer); setReady(true); setStatus("填写坐标、日期和当地固定UTC偏移，查看近似日光时段。"); };
    script.onerror = () => fail("日光组件加载失败，请重试。"); document.head.appendChild(script);
    return () => { mounted = false; clearTimeout(timer); script.remove(); };
  }, [attempt]);
  useEffect(() => () => { release(); }, []);

  function generate() {
    if (locked.current || !ready) return;
    locked.current = true; release(); setOutput(null);
    try {
      const sun = (window as unknown as { SunCalc?: SunCalc }).SunCalc;
      if (typeof sun?.getTimes !== "function" || typeof sun?.getPosition !== "function") { setReady(false); setLoadError("日光组件不可用，请重新加载。"); throw new Error("日光组件不可用，请重新加载。"); }
      const result = calculate(sun, input);
      const json = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" })); urls.current.push(json);
      const txt = URL.createObjectURL(new Blob([asText(result)], { type: "text/plain;charset=utf-8" })); urls.current.push(txt);
      setOutput({ result, json, txt }); setStatus("近似时段已算好。请结合地形、天气和所选日期的实际时区判断。");
    } catch (error) { release(); setStatus(error instanceof Error ? error.message : "计算失败，请重试。"); }
    finally { locked.current = false; }
  }
  const result = output?.result;
  return <main className={styles.shell}>
    <nav className={styles.nav}><a href="/">生活小助手</a><a href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.kicker}>了解一天的明暗变化</p><h1>日出日落时段</h1>
    <p className={styles.intro}>选一个日期，手填经纬度，看看那一天大约何时天亮、日出与日落。</p>
    <p className={styles.privacy}>仅在本机计算 · 不申请定位 · 不连接地图或天气API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 地点与日期</h2>
      <div className={styles.row}><label className={styles.field}>纬度<input id="daylight-latitude" inputMode="decimal" maxLength={20} value={input.latitude} onChange={event => change("latitude", event.target.value)} /><span className={styles.hint}>-90～90，北纬为正</span></label><label className={styles.field}>经度<input id="daylight-longitude" inputMode="decimal" maxLength={20} value={input.longitude} onChange={event => change("longitude", event.target.value)} /><span className={styles.hint}>-180～180，东经为正</span></label></div>
      <div className={styles.row}><label className={styles.field}>本地日期<input id="daylight-date" type="date" min="2000-01-01" max="2099-12-31" value={input.date} onChange={event => change("date", event.target.value)} /></label><label className={styles.field}>固定UTC偏移<input id="daylight-offset" value={input.offset} maxLength={10} placeholder="+08:00" onChange={event => change("offset", event.target.value)} /><span className={styles.hint}>-12:00～+14:00，15分钟一档</span></label></div>
      <p className={styles.hint}>不是自动时区查询。夏令时地区请填写所选日期当地实际偏移，例如冬季-05:00、夏季-04:00。日期2000–2099，坐标最多6位小数。</p>
      <button id="daylight-generate" className={styles.primary} disabled={!ready} onClick={generate}>计算日光时段</button>
      <div className={styles.examples}><button onClick={() => { invalidate(); setInput(initial); }}>上海夏至示例</button><button onClick={() => { invalidate(); setInput({ latitude: "69.6492", longitude: "18.9553", date: "2026-06-21", offset: "+00:00" }); }}>极昼UTC示例</button></div>
      {loadError && <button id="daylight-retry" className={styles.secondary} onClick={() => { invalidate(); setAttempt(value => value + 1); }}>重试加载组件</button>}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 这一天的日光</h2>
      {output && result ? <div id="daylight-output" data-state={result.state}>
        <p className={styles.resultDate}>{result.inputs.date} · UTC{result.inputs.utcOffset}</p><p className={styles.state}>{result.stateLabel}</p><p className={styles.duration}>约 <strong>{duration(result.daylightMinutes)}</strong> 日照</p>
        <div className={styles.timeline} role="img" aria-label={`固定偏移下本地0至24时，黄色表示太阳在日出判定线上方，日照约${duration(result.daylightMinutes)}`}>{result.daylightSegments.map((segment, index) => <span key={index} style={{ left: `${segment.fromMinutes / 14.4}%`, width: `${(segment.toMinutes - segment.fromMinutes) / 14.4}%` }} />)}</div>
        <div className={styles.hours}><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
        <p className={styles.hint}>黄色为近似日照；蓝灰色含夜间及暮光，并不等于完全黑暗。</p>
        {result.state !== "crossings" && <p className={styles.notice}>本民用日期没有日出或日落事件。极夜仍可能有晨光/暮光，下表只列实际可计算的时刻，不用00:00代替不存在的时间。</p>}
        <div className={styles.tableWrap}><table><caption>本地民用日期内的近似事件</caption><thead><tr><th>时段</th><th>当地时间</th><th>UTC日期与时间</th></tr></thead><tbody>{result.events.map(event => <tr key={`${event.key}-${event.utc}`}><th scope="row">{event.label}</th><td>约{event.local.slice(11, 16)}</td><td>{event.utc.slice(0, 16).replace("T", " ")} UTC</td></tr>)}</tbody></table></div>
        <p className={styles.hint}>按当地00:00至次日00:00筛选；UTC列可能落在前一天或后一天。跨午夜的日照会分成两段，日照时长按本民用日内部分累加。</p>
        <div className={styles.downloads}><a id="daylight-json" href={output.json} download="近似日光时段.json">保存JSON</a><a id="daylight-txt" href={output.txt} download="近似日光时段.txt">保存TXT</a></div>
      </div> : <div className={styles.empty}>计算后，近似时刻、日照时段和下载按钮会出现在这里。</div>}
    </section></div>
    <aside className={styles.limits}><h2>使用前请知道</h2><p>假设观察高度0米、平坦无遮挡地平线；不修正地形、建筑遮挡、实际海拔和天气折射。采用标准太阳中心-0.833°日出判定与-6°民用暮光判定，属于近似计算。高纬度与季节交界的误差可能更大；极昼/极夜标签只描述本24小时的判定状态。</p><p>导出保留UTC秒供复核，不代表秒级精度。不承诺晴天、能见度、摄影效果或实际可见太阳时刻，不用于安全或导航决策。</p></aside>
    <footer className={styles.footer}>基于 <a href="https://github.com/mourner/suncalc" target="_blank" rel="noreferrer">SunCalc 1.9.0</a> 的中文本机封装。<a href="/vendor/suncalc/LICENSE">BSD-2-Clause许可</a> · <a href="/vendor/suncalc/SOURCE.md">来源与独立样本说明</a>。不保存输入；离开或刷新即清空，想保留请先下载。</footer>
  </main>;
}
