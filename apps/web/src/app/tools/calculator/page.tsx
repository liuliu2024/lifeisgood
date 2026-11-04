"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./calculator.module.css";
import { calculate, type DecimalClass, type Input, type Result } from "./calculate";
const initial: Input = { mode: "arithmetic", operator: "add", a: "0.1", b: "0.2", places: "2", rounding: "half-up" };
export default function CalculatorTool() {
  const [input, setInput] = useState(initial), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("计算工具准备中…"), [output, setOutput] = useState<{ result: Result; json: string; txt: string } | null>(null);
  const urls = useRef<string[]>([]);
  function invalidate() { urls.current.splice(0).forEach(URL.revokeObjectURL); setOutput(null); }
  function change(key: keyof Input, value: string) { invalidate(); setInput(current => ({ ...current, [key]: value })); setStatus("输入已更改，请重新计算，旧结果与下载已清除。"); }
  useEffect(() => {
    let active = true; setReady(false); setFailed(false); setStatus("计算工具准备中…");
    const script = document.createElement("script");
    const fail = () => { if (active) { active = false; clearTimeout(timer); script.remove(); setFailed(true); setStatus("计算工具加载失败或超时，请检查本机服务后重试。"); } };
    const timer = setTimeout(fail, 8000);
    script.src = "/vendor/decimal/decimal.js"; script.async = true; script.onerror = fail;
    script.onload = () => { if (!active) return; const Decimal = (window as Window & { Decimal?: DecimalClass }).Decimal; if (typeof Decimal?.clone !== "function") { fail(); return; } clearTimeout(timer); setReady(true); setStatus("请输入两个普通十进制数，计算在本机完成。"); }; document.head.appendChild(script);
    return () => { active = false; clearTimeout(timer); script.remove(); urls.current.splice(0).forEach(URL.revokeObjectURL); };
  }, [attempt]);
  function generate() {
    invalidate();
    try {
      const Decimal = (window as Window & { Decimal?: DecimalClass }).Decimal;
      if (!Decimal) throw new Error("计算工具尚未准备好，请重新加载。");
      const result = calculate(Decimal, input), json = JSON.stringify(result, null, 2);
      const txt = ["生活小助手 · 精确日常小计算", `模式：${input.mode}；输入A：${input.a}；输入B：${input.b}；运算：${input.operator}`, result.precision, ...result.lines.map(row => `${row.label}：${row.value}`), "仅作日常算术参考，不提供金融、税务或交易建议。"].join("\n");
      if (json.length > 6000 || txt.length > 6000) throw new Error("导出结果过长，请缩小输入。");
      const jsonUrl = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" })); urls.current.push(jsonUrl);
      const txtUrl = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); urls.current.push(txtUrl);
      setOutput({ result, json: jsonUrl, txt: txtUrl }); setStatus("已计算，可下载本次TXT或JSON。输入变化后请重新计算。");
    } catch (error) { invalidate(); setStatus(error instanceof Error ? error.message : "计算失败，请检查输入。"); }
  }
  const split = input.mode === "split";
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>把小数算清楚 / 本机日常计算</p><h1 className={styles.title}>小数相加，也要稳稳当当。</h1><p className={styles.intro}>做四则小计算、算折后价、比单价，或把一笔总额按分摊齐。不解析任意表达式。</p><p className={styles.privacy}>本机计算，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 选择一种小计算</h2><label className={styles.field}>计算方式<select id="calculator-mode" className={styles.select} value={input.mode} onChange={e => change("mode", e.target.value)}><option value="arithmetic">十进制四则</option><option value="discount">折后价格</option><option value="unit">每单位价格</option><option value="split">按分分摊总额</option></select></label>
      {input.mode === "arithmetic" && <label className={styles.field}>运算<select id="calculator-operator" className={styles.select} value={input.operator} onChange={e => change("operator", e.target.value)}><option value="add">加 ＋</option><option value="subtract">减 −</option><option value="multiply">乘 ×</option><option value="divide">除 ÷</option></select></label>}
      <label className={styles.field}>{input.mode === "discount" ? "原价" : input.mode === "unit" || split ? "总额" : "第一个数"}<input id="calculator-a" className={styles.input} inputMode="decimal" value={input.a} maxLength={50} onChange={e => change("a", e.target.value)} /></label>
      <label className={styles.field}>{input.mode === "discount" ? "折数（0–10折，8.5即八五折）" : input.mode === "unit" ? "数量（须大于0）" : split ? "分摊人数（1–100整数）" : "第二个数"}<input id="calculator-b" className={styles.input} inputMode="decimal" value={input.b} maxLength={50} onChange={e => change("b", e.target.value)} /></label>
      <p className={styles.hint}>普通十进制：最多24位整数、12位小数；可以带正负号，不含空格、公式、科学计数法或千分位。分摊总额须非负且最多2位小数，人数1–100。</p>
      {!split && <div className={styles.row}><label className={styles.field}>显示小数位<select id="calculator-places" className={styles.select} value={input.places} onChange={e => change("places", e.target.value)}>{Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i}位</option>)}</select></label><label className={styles.field}>舍入规则<select id="calculator-rounding" className={styles.select} value={input.rounding} onChange={e => change("rounding", e.target.value)}><option value="half-up">四舍五入 · 中点远离0</option><option value="half-even">中点取偶数</option></select></label></div>}
      <button id="calculator-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready} onClick={generate}>计算并生成结果</button>{failed && <button id="calculator-retry" className={styles.secondary} onClick={() => { invalidate(); setAttempt(n => n + 1); }}>重新加载工具</button>}<p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>2. 看结果，保存记录</h2>{output ? <div id="calculator-output"><dl className={local.results}>{output.result.lines.map(row => <div key={row.label}><dt>{row.label}</dt><dd data-label={row.label}>{row.value}</dd></div>)}</dl><div className={styles.buttons}><a id="calculator-txt" className={styles.primary} href={output.txt} download="calculation.txt">下载TXT</a><a id="calculator-json" className={styles.secondary} href={output.json} download="calculation.json">下载JSON</a></div></div> : <div className={styles.empty}>填好数值并计算后，这里会显示结果和下载。</div>}<p className={styles.hint}>内部按80位有效数字计算。除不尽时计算值仍是近似；显示最多12位小数，按所选规则舍入。输出计算值≤160字符、显示结果≤64字符、文件≤6000字符。折扣的“结果”和“节省”分别舍入，两者显示之和可能差最后一位；分摊按整数分保证原总额。仅作日常算术参考，不提供金融、税务或交易建议。</p></section></div><footer className={styles.footer}>基于decimal.js 10.6.0（MIT）中文封装 · <a href="/vendor/decimal/SOURCE.md">来源与许可</a></footer>
  </main>;
}
