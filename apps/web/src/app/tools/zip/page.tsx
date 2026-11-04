"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import { clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type ZipInstance = { file(name: string, value: ArrayBuffer): void; generateAsync(options: { type: "blob"; compression: "DEFLATE"; compressionOptions: { level: number } }, update: (metadata: { percent: number }) => void): Promise<Blob> };
type ZipConstructor = new () => ZipInstance;
type Entry = { file: File; name: string };

function safeEntries(files: File[]): Entry[] {
  const used = new Set<string>();
  return files.map((file, index) => {
    const clean = file.name.normalize("NFC").replace(/[\x00-\x1f\x7f/\\:<>"|?*]/g, "_").replace(/[. ]+$/g, "").trim().slice(0, 180);
    const base = !clean || clean === "." || clean === ".." ? `文件-${index + 1}` : clean;
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const extension = dot > 0 ? base.slice(dot) : "";
    let name = base;
    let suffix = 2;
    while (used.has(name.toLocaleLowerCase("en-US"))) name = `${stem} (${suffix++})${extension}`;
    used.add(name.toLocaleLowerCase("en-US"));
    return { file, name };
  });
}

export default function ZipTool() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("选好文件，把它们打包成一个ZIP，方便保存或发送。");
  const [output, setOutput] = useState<{ url: string; size: number } | null>(null);
  const urls = useRef<string[]>([]);
  const generation = useRef(0);
  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/jszip/jszip.min.js").then(() => { if (mounted) setReady(true); }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; generation.current++; clearUrls(urls.current); };
  }, []);
  function choose(files: File[]) {
    generation.current++;
    clearUrls(urls.current); setOutput(null); setEntries([]);
    if (!files.length) { setStatus("请先选择要打包的文件。"); return; }
    if (files.length > 50) { setStatus("一次最多选择50个文件，请减少数量。"); return; }
    if (files.some(file => file.size > 20 * 1024 * 1024)) { setStatus("单个文件不能超过20MiB，请重新选择。"); return; }
    if (files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) { setStatus("文件合计不能超过30MiB，请重新选择。"); return; }
    setEntries(safeEntries(files)); setStatus(`已选择${files.length}个文件。下方名称是压缩包内的副本名，不会修改原文件。`);
  }
  async function pack() {
    if (!entries.length) { setStatus("请先选择要打包的文件。"); return; }
    const token = ++generation.current;
    clearUrls(urls.current); setOutput(null); setBusy(true);
    try {
      const Library = (window as Window & { JSZip?: ZipConstructor }).JSZip;
      if (!Library) throw new Error("工具尚未准备好，请稍后重试。");
      const zip = new Library();
      for (const entry of entries) zip.file(entry.name, await entry.file.arrayBuffer());
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }, progress => { if (token === generation.current) setStatus(`正在打包 ${Math.floor(progress.percent)}%，请稍等…`); });
      if (token !== generation.current) return;
      setOutput({ url: makeUrl(blob, urls.current), size: blob.size }); setStatus("压缩包准备好了，点击“下载ZIP压缩包”保存。");
    } catch (error) { if (token === generation.current) setStatus(error instanceof Error ? error.message : "打包失败，请减少文件后重试。"); }
    finally { if (token === generation.current) setBusy(false); }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>把零散文件收好 / 浏览器小工具</p><h1 className={styles.title}>一包带走，文件不零散</h1>
    <p className={styles.intro}>照片、文档、表格一起打包。保留中文文件名，也支持空文件。</p><p className={styles.privacy}>只在本机浏览器处理，文件不会上传</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 选择文件</h2>
      <label className={styles.field}>要放进压缩包的文件<input id="zip-files" className={styles.file} type="file" multiple disabled={!ready || busy} onChange={event => choose(Array.from(event.target.files || []))}/><span className={styles.hint}>最多50个；单个≤20MiB，合计≤30MiB。重新选择会替换当前清单，打包时暂时锁定选择。</span></label>
      <button id="zip-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready || busy} onClick={pack}>{busy ? "正在打包…" : "生成ZIP压缩包"}</button>
      <p role="status" aria-live="polite" className={styles.status}>{ready ? status : status.includes("失败") ? status : "正在准备本地打包工具…"}</p>
      {!!entries.length && <ol id="zip-entries" style={{paddingLeft:24,fontSize:13,maxHeight:300,overflowY:"auto",overflowWrap:"anywhere"}}>{entries.map((entry, index) => <li key={index}>{entry.name} <span className={styles.hint}>（{entry.file.size}字节）</span></li>)}</ol>}
    </section><section className={styles.panel}><h2>2. 下载压缩包</h2>{output ? <div id="zip-output"><div className={styles.empty}><div><strong style={{display:"block",fontSize:28,color:"#224d39"}}>ZIP</strong><p>{entries.length}个文件 · {output.size.toLocaleString()}字节</p><p className={styles.hint}>压缩效果因文件类型而异；已经压缩的照片或视频可能不会变小。</p></div></div><div className={styles.buttons}><a id="zip-download" className={styles.primary} href={output.url} download="生活小助手_文件打包.zip">↓ 下载ZIP压缩包</a></div></div> : <div className={styles.empty}>生成后，下载按钮会出现在这里。<br/>本工具只创建ZIP，不读取或解压已有压缩包。</div>}</section></div>
    <footer className={styles.footer}>文件路径符号和控制字符会替换为下划线，重名按“(2)”等添加后缀，全部平铺在包内。仅修改压缩包副本名称，不会改动电脑里的原文件。浏览器需要临时内存，低内存设备请减少文件。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文界面由本平台编写；打包能力使用 <a href="https://github.com/Stuk/jszip" target="_blank" rel="noopener noreferrer">JSZip 3.10.1</a>，本次选择MIT许可。不是完整上游应用。<a href="/vendor/jszip/LICENSE.txt">查看原始许可</a>。</p></details></footer>
  </main>;
}
