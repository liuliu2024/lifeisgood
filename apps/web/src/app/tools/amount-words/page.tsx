"use client";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./amount-words.module.css";
import { convert, type Converter } from "./convert";
type Result = ReturnType<typeof convert>;
export default function AmountWordsTool() {
  const [input, setInput] = useState("1001.01"), [mode, setMode] = useState("money"), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("数字转换组件准备中…"), [output, setOutput] = useState<{ result: Result; txt: string; json: string } | null>(null);
  const urls = useRef<string[]>([]);
  function clear() { urls.current.splice(0).forEach(URL.revokeObjectURL); setOutput(null); }
  useEffect(() => {
    let active = true; setReady(false); setFailed(false); setStatus("数字转换组件准备中…"); const script = document.createElement("script");
    const fail = () => { if (active) { active = false; clearTimeout(timer); script.remove(); setFailed(true); setStatus("转换组件加载失败或超时，请检查本机服务后重新加载。"); } };
    const timer = setTimeout(fail, 8000); script.src = "/vendor/number-to-chinese-words/number-to-chinese-words.js"; script.async = true; script.onerror = fail;
    script.onload = () => { if (!active) return; if (typeof (window as Window & { index?: { NumberToChineseWords?: Converter } }).index?.NumberToChineseWords?.toWords !== "function") { fail(); return; } clearTimeout(timer); setReady(true); setStatus("填写普通十进制数字，超过2位小数会直接拒绝。"); }; document.head.appendChild(script);
    return () => { active = false; clearTimeout(timer); script.remove(); urls.current.splice(0).forEach(URL.revokeObjectURL); };
  }, [attempt]);
  function generate() {
    clear();
    try {
      const converter = (window as Window & { index?: { NumberToChineseWords?: Converter } }).index?.NumberToChineseWords;
      if (!converter || typeof converter.toWords !== "function") { setReady(false); setFailed(true); throw new Error("转换组件不可用，请重新加载。"); }
      const result = convert(converter, input, mode);
      const json = JSON.stringify(result, null, 2), txt = [`生活小助手 · ${mode === "money" ? "人民币金额大写" : "中文数字"}`, `原输入：${result.originalInput}`, `数值记录：${result.normalizedValue}`, `转换结果：${result.text}`, "", result.limits.moneyRule, result.scope, "来源：number-to-chinese-words1.0.20（MIT）；金额包装与简体映射为平台新增，不使用nzh代码。"].join("\n");
      if (json.length > 4000 || txt.length > 4000) throw new Error("导出超过4000字符上限。");
      const txtUrl = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); urls.current.push(txtUrl);
      const jsonUrl = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" })); urls.current.push(jsonUrl);
      setOutput({ result, txt: txtUrl, json: jsonUrl }); setStatus("已转换，可核对原数值并下载TXT或JSON。");
    } catch (error) { clear(); setStatus(error instanceof Error ? error.message : "转换失败，请检查数值。"); }
  }
  return <main className={styles.shell}><nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav><p className={styles.eyebrow}>让数字换一种写法 / 本机小工具</p><h1 className={styles.title}>把金额，写成中文大写。</h1><p className={styles.intro}>支持有限中文数字与人民币金额大写。保留原输入，方便逐项核对；不解析公式，也不默默舍入。</p><p className={styles.privacy}>本机转换，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 填数字，选写法</h2><label className={styles.field}>转换方式<select id="amount-words-mode" className={styles.select} value={mode} onChange={e => { clear(); setMode(e.target.value); setStatus("写法已改变，旧结果已清除，请重新转换。"); }}><option value="money">人民币金额大写 · 非负数</option><option value="number">中文数字 · 可带负号</option></select></label><label className={styles.field}>普通十进制数字<input id="amount-words-input" className={styles.input} inputMode="decimal" value={input} maxLength={24} onChange={e => { clear(); setInput(e.target.value); setStatus("数值已改变，旧结果和下载已清除。"); }} /></label><p className={styles.hint}>整数0–999999999999，最多2位小数；不带前导0、空格、加号、逗号、指数或公式。金额模式不接受负数。转换结果会核对原数值。中文数字模式逐位保留小数，包括末尾0与负零符号。</p><button id="amount-words-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready} onClick={generate}>转换并生成记录</button>{failed && <button id="amount-words-retry" className={styles.secondary} onClick={() => { clear(); setAttempt(n => n + 1); }}>重新加载工具</button>}<p role="status" aria-live="polite" className={styles.status}>{status}</p></section>
    <section className={styles.panel}><h2>2. 核对文字与原数值</h2>{output ? <div id="amount-words-output"><p id="amount-words-text" className={local.text}>{output.result.text}</p><dl className={local.details}><dt>原输入</dt><dd>{output.result.originalInput}</dd><dt>数值记录（金额补足两位，不舍入）</dt><dd id="amount-words-value">{output.result.normalizedValue}</dd></dl><div className={styles.buttons}><a id="amount-words-txt" className={styles.primary} href={output.txt} download="中文数字记录.txt">下载TXT</a><a id="amount-words-json" className={styles.secondary} href={output.json} download="中文数字记录.json">下载JSON</a></div></div> : <div className={styles.empty}>转换后，中文结果和原数值会一起显示在这里。</div>}<p className={styles.hint}>本平台新增四位组装、简体大写映射和“元角分”包装：分为0时末尾加整；零角有分且元非零时补零；元为0时仍写“零元”。这套有限规则不是原库原生金额接口，不承诺银行、票据或法定格式合规，请在实际场景中另行核对。</p></section></div>
    <footer className={styles.footer}>实际使用digi3studio/number-to-chinese-words1.0.20（MIT）。<a href="/vendor/number-to-chinese-words/SOURCE.md">固定来源、许可与范围</a>。小型老项目：2026-11-04读取35Stars、最近push2018-09-27；未称高Star或活跃。原候选nzh因完整原许可资料缺口未采用，本页不包含其代码。原库完整跨组转换有已知缺位问题，本页仅调用其0–9999小组核心，大数与小数由平台字符串拆分组装；不提供金融或税务建议。</footer>
  </main>;
}
