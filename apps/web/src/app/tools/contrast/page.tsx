"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./contrast.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type Color = { isValid(): boolean; toHexString(): string; getAlpha(): number };
type TinyColor = { (source: string): Color; readability(a: string, b: string): number; isReadable(a: string, b: string, options: { level: "AA" | "AAA"; size: "small" | "large" }): boolean };
type Evaluation = { foreground: string; background: string; sample: string; contrastRatio: number; normalAA: boolean; largeAA: boolean; normalAAA: boolean; largeAAA: boolean; scope: string };
type Output = { data: Evaluation; png: string; json: string };

function normalized(source: string, tiny: TinyColor): string {
  const input = source.trim();
  if (/^#[\da-f]{4}$|^#[\da-f]{8}$/i.test(input) || /transparent|rgba|hsla/i.test(input)) throw new Error("本工具只比较不透明纯色，不支持透明或半透明颜色。请用#RGB或#RRGGBB。");
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(input)) throw new Error("请输入#RGB或#RRGGBB格式的颜色，例如#224d39；不支持色名或CSS表达式。");
  const value = tiny(input);
  if (!value.isValid() || value.getAlpha() !== 1) throw new Error("颜色解析失败，请检查HEX值。");
  return value.toHexString();
}

export default function ContrastTool() {
  const [foreground, setForeground] = useState("#224d39");
  const [background, setBackground] = useState("#f1f6f3");
  const [sample, setSample] = useState("让每一句话，都清楚一点。");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("选好文字与背景颜色，看一看它们是不是足够清楚。");
  const [output, setOutput] = useState<Output | null>(null);
  const urls = useRef<string[]>([]);
  const generation = useRef(0);
  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/tinycolor/tinycolor-min.js").then(() => { if (mounted) setReady(true); }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; generation.current++; clearUrls(urls.current); };
  }, []);
  function changed() { generation.current++; clearUrls(urls.current); setOutput(null); setBusy(false); setStatus("颜色或文字已更新，请重新检测以生成新的预览和下载。"); }
  function picker(value: string): string { if (/^#[\da-f]{6}$/i.test(value)) return value; if (/^#[\da-f]{3}$/i.test(value)) return "#" + value.slice(1).split("").map(x => x + x).join(""); return "#000000"; }
  async function evaluate() {
    changed(); const token = generation.current;
    setBusy(true);
    try {
      const tiny = (window as Window & { tinycolor?: TinyColor }).tinycolor;
      if (!tiny) throw new Error("工具尚未准备好，请稍后重试。");
      const fg = normalized(foreground, tiny), bg = normalized(background, tiny);
      if (!sample.trim()) throw new Error("请写一句用于预览的文字，最多100个字符。");
      if (sample.length > 100) throw new Error("预览文字最多100个字符，请精简后再试。");
      const data: Evaluation = {foreground:fg,background:bg,sample,contrastRatio:tiny.readability(fg,bg),normalAA:tiny.isReadable(fg,bg,{level:"AA",size:"small"}),largeAA:tiny.isReadable(fg,bg,{level:"AA",size:"large"}),normalAAA:tiny.isReadable(fg,bg,{level:"AAA",size:"small"}),largeAAA:tiny.isReadable(fg,bg,{level:"AAA",size:"large"}),scope:"不透明sRGB纯色文字与背景的WCAG2对比度参考；不是整页无障碍认证。"};
      const canvas = document.createElement("canvas"); canvas.width=1200; canvas.height=700;
      const context = canvas.getContext("2d"); if (!context) throw new Error("当前浏览器不能导出预览图，请换用新版浏览器。");
      context.fillStyle=bg; context.fillRect(0,0,1200,700); context.fillStyle=fg;
      context.font="bold 34px system-ui,sans-serif"; context.fillText("文字与背景 / 可读性预览",64,76);
      context.font="38px system-ui,sans-serif";
      let line="", y=150;
      for (const character of sample.replace(/[\r\n]/g," ")) { if (context.measureText(line+character).width>1060 && line) { context.fillText(line,64,y);line="";y+=62; } line+=character; }
      if (line) context.fillText(line,64,y);
      context.fillStyle="#ffffff";context.fillRect(0,460,1200,240);context.fillStyle="#22372c";context.font="bold 30px system-ui,sans-serif";context.fillText(`Contrast ${data.contrastRatio.toFixed(2)} : 1`,64,516);
      context.font="22px system-ui,sans-serif";context.fillText(`Text ${fg}   /   Background ${bg}`,64,562);
      context.fillText(`Normal AA ${data.normalAA?"PASS":"FAIL"}   /   Large AA ${data.largeAA?"PASS":"FAIL"}   /   Normal AAA ${data.normalAAA?"PASS":"FAIL"}`,64,604);
      context.font="18px system-ui,sans-serif";context.fillText("Opaque sRGB colors only. Contrast reference, not a full accessibility audit.",64,650);
      const png = await canvasPng(canvas);
      if (token !== generation.current) return;
      setOutput({data,png:makeUrl(png,urls.current),json:makeUrl(new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),urls.current)});
      setStatus(data.normalAA ? "这组纯色达到了普通文字AA的对比度参考线。可下载预览图和结果。" : "这组纯色未达到普通文字AA参考线，可以加深文字或调整背景后重试。");
    } catch(error) { if(token===generation.current) setStatus(error instanceof Error?error.message:"检测失败，请重试。"); }
    finally { if(token===generation.current) setBusy(false); }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>好看，也要看得清 / 浏览器小工具</p><h1 className={styles.title}>这两种颜色，读起来舒服吗？</h1>
    <p className={styles.intro}>做海报、写公告、设计小卡片之前，先检查文字和底色的对比。</p><p className={styles.privacy}>在当前浏览器计算，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 选颜色，写一句话</h2>
      <div className={styles.row}><label className={styles.field}>文字颜色<input aria-label="文字颜色选择器" type="color" className={styles.colorInput} value={picker(foreground)} onChange={event=>{changed();setForeground(event.target.value);}}/><input id="contrast-foreground" aria-label="文字HEX" className={styles.input} value={foreground} maxLength={64} onChange={event=>{changed();setForeground(event.target.value);}}/></label><label className={styles.field}>背景颜色<input aria-label="背景颜色选择器" type="color" className={styles.colorInput} value={picker(background)} onChange={event=>{changed();setBackground(event.target.value);}}/><input id="contrast-background" aria-label="背景HEX" className={styles.input} value={background} maxLength={64} onChange={event=>{changed();setBackground(event.target.value);}}/></label></div>
      <p className={styles.hint}>输入#RGB或#RRGGBB。不支持透明颜色、图片背景或渐变。</p><label className={styles.field} style={{marginTop:22}}>预览文字<input id="contrast-sample" className={styles.input} value={sample} maxLength={100} onChange={event=>{changed();setSample(event.target.value);}}/><span className={styles.hint}>{sample.length}/100字符 · 只是预览，不会发布。</span></label>
      <button id="contrast-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready||busy} onClick={evaluate}>{busy?"正在生成…":"检测并生成预览"}</button><p role="status" aria-live="polite" className={styles.status}>{ready?status:status.includes("失败")?status:"正在准备本地颜色工具…"}</p>
    </section><section className={styles.panel}><h2>2. 看结果，保存参考</h2>{output?<div id="contrast-output"><div id="contrast-preview" className={local.preview} style={{color:output.data.foreground,background:output.data.background}}><span>文字与背景</span><p>{output.data.sample}</p><small>同一组颜色，字号也影响阅读感受。</small></div><div className={local.ratio}><strong id="contrast-ratio">{output.data.contrastRatio.toFixed(2)} : 1</strong><span>对比度参考值</span></div><dl className={local.metrics}><div><dt>普通文字 AA ≥4.5</dt><dd>{output.data.normalAA?"达到":"未达到"}</dd></div><div><dt>大字 AA ≥3</dt><dd>{output.data.largeAA?"达到":"未达到"}</dd></div><div><dt>普通文字 AAA ≥7</dt><dd>{output.data.normalAAA?"达到":"未达到"}</dd></div><div><dt>大字 AAA ≥4.5</dt><dd>{output.data.largeAAA?"达到":"未达到"}</dd></div></dl><div className={styles.buttons}><a id="contrast-png" className={styles.primary} href={output.png} download="文字背景_对比预览.png">↓ 下载预览PNG</a><a id="contrast-json" className={styles.secondary} href={output.json} download="文字背景_检测结果.json">↓ 下载结果JSON</a></div></div>:<div className={styles.empty}>生成后，会出现真实颜色预览、对比值和下载。<br/>修改任一输入会清除旧结果。</div>}</section></div>
    <footer className={styles.footer}>数值仅比较两种不透明sRGB纯色，按WCAG2的文字对比度阈值给出参考；判定使用未四舍五入的数值。大字通常指不小于24px的普通字，或约18.67px的粗体。字号、字体、显示器、印刷、背景图片和视觉差异都会影响实际感受；这不是整页无障碍认证，也不是印刷色彩保证。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文工具壳由本平台编写，颜色解析与对比计算使用 <a href="https://github.com/bgrins/TinyColor" target="_blank" rel="noopener noreferrer">TinyColor 1.6.0</a>（MIT）。不是完整上游应用安装。<a href="/vendor/tinycolor/LICENSE.txt">原许可</a> · <a href="/vendor/tinycolor/SOURCE.md">固定来源</a>。</p></details></footer>
  </main>;
}
