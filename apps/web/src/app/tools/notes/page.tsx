"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./notes.module.css";
import { clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type Token = { attrSet(name: string, value: string): void };
type Markdown = { disable(rules: string[]): void; render(source: string): string; renderer: { rules: Record<string, ((tokens: Token[], index: number, options: unknown, environment: unknown, renderer: { renderToken(tokens: Token[], index: number, options: unknown): string }) => string) | undefined> } };
type MarkdownFactory = (options: { html: boolean; linkify: boolean; typographer: boolean }) => Markdown;

export default function NotesTool() {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("写下想法，点击预览，再把排版好的便签带走。");
  const [output, setOutput] = useState<{ html: string; md: string; document: string } | null>(null);
  const urls = useRef<string[]>([]);
  useEffect(() => {
    let mounted = true;
    loadLocalScript("/vendor/markdown-it/markdown-it.min.js").then(() => { if (mounted) setReady(true); }).catch(error => { if (mounted) setStatus(error.message); });
    return () => { mounted = false; clearUrls(urls.current); };
  }, []);
  function change(value: string) { setText(value); clearUrls(urls.current); setOutput(null); setStatus("内容已更新，请点击预览生成新的下载文件。"); }
  function render() {
    clearUrls(urls.current); setOutput(null);
    if (!text.trim()) { setStatus("请先写一点内容，再生成便签。"); return; }
    if (text.length > 20000) { setStatus("内容最多20000个字符，请精简后重试。"); return; }
    try {
      const factory = (window as Window & { markdownit?: MarkdownFactory }).markdownit;
      if (!factory) throw new Error("工具尚未准备好，请稍后重试。");
      const markdown = factory({ html: false, linkify: false, typographer: false });
      markdown.disable(["image", "html_block", "html_inline"]);
      markdown.renderer.rules.link_open = (tokens, index, options, _environment, renderer) => { tokens[index].attrSet("target", "_blank"); tokens[index].attrSet("rel", "noopener noreferrer"); return renderer.renderToken(tokens, index, options); };
      const html = markdown.render(text);
      const document = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>我的Markdown便签</title><style>body{max-width:800px;margin:40px auto;padding:0 24px;font:16px/1.8 system-ui,sans-serif;color:#22372c;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f1f5f2;padding:16px}table{border-collapse:collapse;display:block;overflow-x:auto}th,td{border:1px solid #ccd6ce;padding:6px 12px}blockquote{border-left:3px solid #91ac9e;margin-left:0;padding-left:20px;color:#52675a}a{color:#216043}code{background:#f1f5f2}hr{border:0;border-top:1px solid #ccd6ce}</style></head><body>${html}</body></html>`;
      setOutput({ html, md: makeUrl(new Blob([text], {type:"text/markdown;charset=utf-8"}), urls.current), document: makeUrl(new Blob([document], {type:"text/html;charset=utf-8"}), urls.current) });
      setStatus("便签排版好了。下载MD保留原文，下载HTML可在浏览器中打开。");
    } catch (error) { setStatus(error instanceof Error ? error.message : "便签生成失败，请重试。"); }
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>写下来，也排好看 / 浏览器小工具</p><h1 className={styles.title}>把小想法，写成好看的便签</h1>
    <p className={styles.intro}>清单、随手记、小计划，用简单的Markdown排版，再下载保存。</p><p className={styles.privacy}>文字只在当前浏览器处理，不上传、不自动保存</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 写点什么</h2><label className={styles.field}>便签内容<textarea id="notes-input" className={`${styles.input} ${local.editor}`} value={text} maxLength={20000} onChange={event => change(event.target.value)} placeholder={"# 今天的小计划\n\n- 散步20分钟\n- 给朋友打个电话\n\n**慢慢来，也很好。**"}/><span className={styles.hint}>{text.length.toLocaleString()} / 20,000 字符 · 用 # 写标题、- 写清单、**文字** 加粗。</span></label><button id="notes-generate" className={`${styles.primary} ${styles.full}`} disabled={!ready} onClick={render}>生成排版预览</button><p role="status" aria-live="polite" className={styles.status}>{ready ? status : status.includes("失败") ? status : "正在准备本地排版工具…"}</p></section>
    <section className={styles.panel}><h2>2. 预览与保存</h2>{output ? <div id="notes-output"><article id="notes-preview" className={local.preview} dangerouslySetInnerHTML={{__html:output.html}}/><div className={styles.buttons}><a id="notes-md" className={styles.primary} href={output.md} download="我的便签.md">↓ 下载MD原文</a><a id="notes-html" className={styles.secondary} href={output.document} download="我的便签.html">↓ 下载HTML便签</a></div></div> : <div className={styles.empty}>你的标题、清单和段落会在这里排版。<br/>修改文字后请重新生成，避免下载旧内容。</div>}</section></div>
    <footer className={styles.footer}>最多20000个字符。只排版文字，不加载Markdown里的图片；HTML标签会作为文字显示。链接需要主动点击才会打开；不自动识别裸网址。关闭或刷新页面会丢失未下载的内容。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文便签界面由本平台编写，排版使用 <a href="https://github.com/markdown-it/markdown-it" target="_blank" rel="noopener noreferrer">markdown-it 14.1.0</a>（MIT），不是完整上游笔记应用。<a href="/vendor/markdown-it/LICENSE.txt">查看原始许可</a>。</p></details></footer>
  </main>;
}
