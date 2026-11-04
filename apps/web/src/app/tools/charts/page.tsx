"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./charts.module.css";

type Kind = "bar" | "line" | "doughnut";
type Row = { label: string; value: number };
type ChartInstance = { destroy(): void };
type ChartClass = { new(canvas: HTMLCanvasElement, config: unknown): ChartInstance; version: string; getChart(canvas: HTMLCanvasElement): ChartInstance | undefined };
type Output = { url: string; rows: Row[]; title: string; kind: Kind; width: number; height: number };
const example = "周一,28\n周二,35\n周三,22\n周四,46\n周五,38\n周六,60\n周日,42";
const colors = ["#28765D", "#D98C46", "#628DB3", "#AB6F91", "#8B9853", "#C26959", "#6D78B1"];
const names = { bar: "柱状图", line: "折线图", doughnut: "圆环图" };
const hidden = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/;
function parse(text: string, title: string, kind: string): Row[] {
  if (!Object.hasOwn(names, kind)) throw new Error("请选择支持的图表类型。");
  if (!title.trim() || Array.from(title.trim()).length > 40 || hidden.test(title)) throw new Error("标题请填写1–40个字符，不含控制或隐藏方向字符。");
  if (text.length > 2000) throw new Error("数据总长度不能超过2000字符。");
  const lines = text.split(/\r?\n/);
  if (lines.length < 2 || lines.length > 12) throw new Error("请填写2–12行数据，每行一个标签和数字。");
  const rows = lines.map((line, index) => {
    const cells = line.split(/[,，\t]/).map(s => s.trim());
    if (cells.length !== 2 || !cells[0] || !cells[1]) throw new Error(`第${index + 1}行格式不完整，请使用“标签,数字”，不要留空行。`);
    if (Array.from(cells[0]).length > 12 || hidden.test(cells[0])) throw new Error(`第${index + 1}行标签最多12字符，不能含控制或隐藏方向字符。`);
    if (!/^[+-]?(?:\d+(?:\.\d{1,6})?|\.\d{1,6})$/.test(cells[1])) throw new Error(`第${index + 1}行请填写普通十进制数字，最多6位小数，不支持公式、千分位或科学计数法。`);
    const value = Number(cells[1]);
    if (!Number.isFinite(value) || Math.abs(value) > 1e9) throw new Error(`第${index + 1}行数字必须在-10亿到10亿之间。`);
    return { label: cells[0], value };
  });
  if (new Set(rows.map(row => row.label.normalize("NFKC").toLocaleLowerCase())).size !== rows.length) throw new Error("标签有重复，请合并或改成不同的标签。");
  if (kind === "doughnut" && (rows.some(row => row.value < 0) || rows.every(row => row.value === 0))) throw new Error("圆环图需要非负数字，且至少一项大于0。");
  return rows;
}

export default function ChartsTool() {
  const [title, setTitle] = useState("一周步行时长（分钟）");
  const [text, setText] = useState(example);
  const [kind, setKind] = useState<Kind>("bar");
  const [size, setSize] = useState("landscape");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<Output | null>(null);
  const [status, setStatus] = useState("图表组件准备中…");
  const token = useRef(0), locked = useRef(false);
  const url = useRef("");
  const resource = useRef<{ chart: ChartInstance | null; canvas: HTMLCanvasElement } | null>(null);
  const encodingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelEncoding = useRef<(() => void) | null>(null);

  function release() {
    cancelEncoding.current?.(); cancelEncoding.current = null;
    if (encodingTimer.current !== null) clearTimeout(encodingTimer.current);
    encodingTimer.current = null;
    if (resource.current) { const active = resource.current; resource.current = null; const Chart = (window as unknown as { Chart?: ChartClass }).Chart; (active.chart || Chart?.getChart?.(active.canvas))?.destroy(); active.canvas.width = 0; active.canvas.height = 0; }
    if (url.current) URL.revokeObjectURL(url.current); url.current = "";
  }
  function invalidate() {
    token.current++; locked.current = false; release(); setOutput(null); setBusy(false);
    setStatus("设置已改变，旧图与下载已清除，请重新生成。");
  }
  useEffect(() => {
    let active = true;
    setReady(false); setLoadError(""); setStatus("图表组件准备中…");
    const script = document.createElement("script");
    const timer = setTimeout(() => fail("图表组件加载超时，请重试。"), 8000);
    function fail(message: string) { if (active) { active = false; clearTimeout(timer); script.remove(); setReady(false); setLoadError(message); setStatus(message); } }
    function loaded() {
      if (!active) return;
      const Chart = (window as unknown as { Chart?: ChartClass }).Chart;
      if (typeof Chart !== "function" || Chart.version !== "4.5.1") { fail("图表组件版本不正确，请重试。"); return; }
      clearTimeout(timer); setReady(true); setStatus("填写自己的数字，生成一张清晰的数据图。");
    }
    if ((window as unknown as { Chart?: ChartClass }).Chart?.version === "4.5.1") loaded();
    else { script.src = "/vendor/chartjs/chart.umd.js"; script.async = true; script.onload = loaded; script.onerror = () => fail("图表组件加载失败，请重试。"); document.head.appendChild(script); }
    return () => { active = false; clearTimeout(timer); script.remove(); };
  }, [attempt]);
  useEffect(() => () => { token.current++; locked.current = false; release(); }, []);

  async function generate() {
    if (locked.current || !ready) return;
    const generation = ++token.current; release(); setOutput(null);
    locked.current = true; setBusy(true);
    try {
      const rows = parse(text, title, kind);
      if (!["landscape", "square"].includes(size)) throw new Error("请选择支持的图表尺寸。");
      const Chart = (window as unknown as { Chart?: ChartClass }).Chart;
      if (typeof Chart !== "function" || Chart.version !== "4.5.1") throw new Error("图表组件不可用，请刷新页面后重试。");
      setStatus("正在本机绘图和编码PNG…");
      const width = size === "square" ? 960 : 1200, height = size === "square" ? 960 : 800;
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      resource.current = { canvas, chart: null };
      const wrap = (value: string, count: number) => { const chars = Array.from(value); return Array.from({ length: Math.ceil(chars.length / count) }, (_, index) => chars.slice(index * count, (index + 1) * count).join("")); };
      const labels = rows.map(row => kind === "doughnut" ? row.label : wrap(row.label, rows.length > 8 ? 4 : 6));
      const whiteBackground = { id: "localWhiteBackground", beforeDraw(chart: { ctx: CanvasRenderingContext2D; width: number; height: number }) { chart.ctx.save(); chart.ctx.globalCompositeOperation = "destination-over"; chart.ctx.fillStyle = "#ffffff"; chart.ctx.fillRect(0, 0, chart.width, chart.height); chart.ctx.restore(); } };
      const chart = new Chart(canvas, {
        type: kind,
        data: { labels, datasets: [{ label: title.trim(), data: rows.map(row => row.value), backgroundColor: kind === "line" ? colors[0] : rows.map((_, index) => colors[index % colors.length]), borderColor: kind === "line" ? colors[0] : "#ffffff", borderWidth: kind === "line" ? 4 : 2, pointRadius: 6, pointBackgroundColor: colors[0], tension: 0, fill: false }] },
        options: { responsive: false, animation: false, devicePixelRatio: 1, events: [], color: "#294236", font: { family: "'Microsoft YaHei', system-ui, sans-serif", size: 17 }, layout: { padding: 36 }, plugins: { title: { display: true, text: wrap(title.trim(), 24), color: "#213b2d", font: { size: 28, weight: "bold" }, padding: { bottom: 32 } }, legend: { display: kind === "doughnut", position: "bottom", labels: { boxWidth: 18, padding: 18, font: { size: 16 } } }, tooltip: { enabled: false } }, ...(kind === "doughnut" ? { cutout: "58%" } : { scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 14 } } }, y: { beginAtZero: true, grid: { color: "#e3eae5" }, ticks: { font: { size: 16 }, maxTicksLimit: 9 } } } }) },
        plugins: [whiteBackground]
      });
      resource.current.chart = chart;
      const blob = await new Promise<Blob>((resolve, reject) => {
        cancelEncoding.current = () => reject(new Error("本轮已取消。"));
        encodingTimer.current = setTimeout(() => reject(new Error("PNG生成超时，请重试。")), 8000);
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG生成失败，请重试。")), "image/png");
      });
      if (generation !== token.current) return;
      cancelEncoding.current = null;
      if (encodingTimer.current !== null) clearTimeout(encodingTimer.current); encodingTimer.current = null;
      chart.destroy(); canvas.width = 0; canvas.height = 0; resource.current = null;
      url.current = URL.createObjectURL(blob);
      setOutput({ url: url.current, rows, title: title.trim(), kind, width, height });
      setStatus("图已生成。预览与下载为同一份PNG，下面保留完整数据供核对。");
    } catch (error) { if (generation === token.current) { release(); setStatus(error instanceof Error ? error.message : "生成失败，请重试。"); } }
    finally { if (generation === token.current) { locked.current = false; setBusy(false); } }
  }

  return <main className={styles.shell}>
    <nav className={styles.nav}><a href="/">生活小助手</a><a href="/discover">← 回到日常工具</a></nav>
    <p className={styles.kicker}>把数字变成一张图</p><h1>简单数据图</h1>
    <p className={styles.intro}>记录一周散步、整理门店的合成示例数字，做一张适合分享的柱状图、折线图或圆环图。</p>
    <p className={styles.privacy}>数据仅在本机绘制 · 不上传 · 无需AI</p>
    <div className={styles.grid}><section className={styles.panel}><h2>01 · 填写标题与数据</h2>
      <label className={styles.field}>图表标题<input id="charts-title" value={title} maxLength={81} onChange={event => { invalidate(); setTitle(event.target.value); }} /></label>
      <label className={styles.field}>每行：标签,数字<textarea id="charts-data" value={text} maxLength={2001} rows={10} spellCheck={false} onChange={event => { invalidate(); setText(event.target.value); }} /></label>
      <p className={styles.hint}>2–12行；标签最多12字符，逗号、中文逗号或Tab分隔。数字范围±10亿，最多6位小数；不支持公式、科学计数法或千分位。圆环图仅接受非负且不全为0的数据。</p>
      <div className={styles.row}><label className={styles.field}>图表形式<select id="charts-kind" value={kind} onChange={event => { invalidate(); setKind(event.target.value as Kind); }}><option value="bar">柱状图 · 对比大小</option><option value="line">折线图 · 按输入顺序连接</option><option value="doughnut">圆环图 · 看各项占比</option></select></label><label className={styles.field}>导出尺寸<select id="charts-size" value={size} onChange={event => { invalidate(); setSize(event.target.value); }}><option value="landscape">横图 1200 × 800</option><option value="square">方图 960 × 960</option></select></label></div>
      <button id="charts-generate" className={styles.primary} disabled={!ready || busy} onClick={generate}>{busy ? "生成中…" : "生成数据图"}</button>
      <button className={styles.secondary} onClick={() => { invalidate(); setText(example); setTitle("一周步行时长（分钟）"); setKind("bar"); setSize("landscape"); }}>恢复合成示例</button>
      {loadError && <button className={styles.secondary} id="charts-retry" onClick={() => { invalidate(); setAttempt(value => value + 1); }}>重试加载组件</button>}
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section><section className={styles.panel}><h2>02 · 看图与下载</h2>
      {output ? <div id="charts-output"><img id="charts-preview" className={styles.preview} src={output.url} width={output.width} height={output.height} alt={`${output.title}，${names[output.kind]}，完整数字见下表`} /><p className={styles.hint}>{names[output.kind]} · {output.width} × {output.height}像素 · 白色背景</p><a id="charts-png" className={styles.download} href={output.url} download="我的数据图.png">下载清晰PNG</a><div className={styles.tableWrap}><table><caption>本图数据 · {output.title}</caption><thead><tr><th scope="col">标签</th><th scope="col">数值</th></tr></thead><tbody>{output.rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></div> : <div className={styles.empty}>生成后，图表、完整数据和下载按钮会显示在这里。</div>}
    </section></div>
    <footer className={styles.footer}>基于 <a href="https://github.com/chartjs/Chart.js" target="_blank" rel="noreferrer">Chart.js 4.5.1</a> 的中文图表库封装，含 @kurkle/color 0.3.2。<a href="/vendor/chartjs/LICENSE.md">Chart.js MIT许可</a> · <a href="/vendor/chartjs/KURKLE_COLOR_LICENSE.md">颜色依赖MIT许可</a> · <a href="/vendor/chartjs/SOURCE.md">来源记录</a><br />这是有限数字列表的可视化，不提供自动商业分析、预测或完整电子表格功能。示例数据为合成；折线严格按输入顺序连接，圆环大小表示相对占比，颜色循环使用。</footer>
  </main>;
}
