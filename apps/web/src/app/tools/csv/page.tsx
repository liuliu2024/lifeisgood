"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import { clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";

type Parser = { abort(): void };
type Library = { parse(text: string, config: Record<string, unknown>): { meta: { delimiter: string } }; unparse(rows: string[][], config: Record<string, unknown>): string };
const dangerous = /^[\s\u0000-\u001f\u007f]*[=+\-@]|^[\t\r\n]/;
export default function CsvTool() {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null), [delimiter, setDelimiter] = useState("");
  const [rows, setRows] = useState<string[][]>([]), [selected, setSelected] = useState<number[]>([]);
  const [found, setFound] = useState(""), [status, setStatus] = useState("请选择本机UTF-8 CSV文件，再点击解析。");
  const [output, setOutput] = useState<{csv:string;json:string;escaped:number}|null>(null);
  const version = useRef(0), urls = useRef<string[]>([]);
  useEffect(() => { let mounted=true; loadLocalScript("/vendor/papaparse/papaparse.min.js").then(()=>{if(mounted)setReady(true);}).catch(e=>{if(mounted)setStatus(e.message);}); return ()=>{mounted=false;version.current++;clearUrls(urls.current);}; }, []);
  function invalidate(clearRows=false) { version.current++;clearUrls(urls.current);setOutput(null);setBusy(false);if(clearRows){setRows([]);setSelected([]);setFound("");} }
  async function parse() {
    invalidate(true); const token=version.current;
    if(!file){setStatus("请先选择UTF-8 CSV文件。");return;}
    if(file.size>2*1024*1024){setStatus("文件不能超过2MiB。");return;}
    setBusy(true);setStatus("正在本机读取和解析…");
    try {
      const bytes=await file.arrayBuffer(); if(token!==version.current)return;
      let text:string;try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw Error("文件不是有效UTF-8。请在原软件另存为UTF-8 CSV后重试，不会自动猜测编码。");}
      if(!text.length||!text.trim()){throw Error("文件为空，请选择包含数据的CSV。");}
      if(text.includes("\u0000"))throw Error("文件含空字符，可能不是UTF-8 CSV，请检查原文件。");
      const papa=(window as Window & {Papa?:Library}).Papa;
      if(!papa)throw Error("本地CSV工具尚未准备好，请刷新后重试。");
      const data:string[][]=[];let failure="", cells=0;
      const result=papa.parse(text,{delimiter,header:false,dynamicTyping:false,skipEmptyLines:false,worker:false,download:false,
        step:(part:{data:string[];errors:{code:string}[]},parser:Parser)=>{
          if(part.errors.some(e=>e.code!=="UndetectableDelimiter")){failure="CSV引号不完整或格式错误，请修正原文件。";parser.abort();return;}
          if(part.errors.some(e=>e.code==="UndetectableDelimiter")){failure="无法自动识别分隔符，请手动选择（单列表格也请选择逗号）。";parser.abort();return;}
          cells+=part.data.length;
          // One bounded extra record/cell permits the parser's synthetic trailing empty record.
          if(data.length>=10001||part.data.length>100||cells>200001||part.data.some(c=>c.length>20000)){failure="数据超限：最多10000行、100列、20万个单元格，单格最多20000个字符。";parser.abort();return;}
          data.push(part.data);
        }});
      if(failure)throw Error(failure);
      if(/[\r\n]$/.test(text)&&data.at(-1)?.length===1&&data.at(-1)?.[0]==="")data.pop();
      if(data.length>10000||data.reduce((n,r)=>n+r.length,0)>200000)throw Error("数据超限：最多10000行、100列、20万个单元格，单格最多20000个字符。");
      if(!data.length)throw Error("没有可预览的数据。");
      if(token!==version.current)return;
      const width=Math.max(...data.map(r=>r.length));setRows(data);setSelected(Array.from({length:width},(_,i)=>i));setFound(result.meta?.delimiter||delimiter||",");setStatus(`已解析${data.length}行、${width}列（包含首行）。预览前20行；按位置保留列。`);
    } catch(e){if(token===version.current)setStatus(e instanceof Error?e.message:"解析失败，请重新选择文件。");}
    finally{if(token===version.current)setBusy(false);}
  }
  function generate(){invalidate();if(!rows.length||!selected.length){setStatus("请先解析并至少保留一列。");return;}
    try{const data=rows.map(r=>selected.map(i=>r[i]??""));let escaped=0;
      const safe=data.map(r=>r.map(c=>{if(dangerous.test(c)){escaped++;return "'"+c;}return c;}));
      const papa=(window as Window & {Papa?:Library}).Papa;
      if(!papa)throw Error("本地CSV工具尚未准备好，请刷新后重试。");
      setOutput({csv:makeUrl(new Blob(["\uFEFF",papa.unparse(safe,{delimiter:found,newline:"\r\n",quotes:true})],{type:"text/csv;charset=utf-8"}),urls.current),json:makeUrl(new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}),urls.current),escaped});setStatus("两个文件已生成，可分别下载。CSV安全转义数量见下方，JSON保留原始文本。");
    }catch{clearUrls(urls.current);setOutput(null);setStatus("导出失败，请减少数据后重试。");}}
  const width=rows.length?Math.max(...rows.map(r=>r.length)):0;
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>表格收拾整齐 / 浏览器小工具</p><h1 className={styles.title}>CSV留好列，轻松另存</h1>
    <p className={styles.intro}>预览中文表格，勾选需要的列，再保存CSV或JSON。首行也作为普通数据保留，重复列名不会覆盖内容。</p><p className={styles.privacy}>只在本机处理，不上传文件、不连接外部服务</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 读取与选列</h2>
      <label className={styles.field}>UTF-8 CSV文件<input id="csv-file" className={styles.file} type="file" accept=".csv,text/csv" disabled={!ready} onChange={e=>{invalidate(true);setFile(e.target.files?.[0]??null);setStatus("已更换输入，请点击解析。");}}/><span className={styles.hint}>≤2MiB；≤10000行（含首行）、100列、20万格；单格≤20000字符。只支持UTF-8。</span></label>
      <label className={styles.field}>输入分隔符<select id="csv-delimiter" className={styles.select} value={delimiter} onChange={e=>{invalidate(true);setDelimiter(e.target.value);setStatus("分隔符已更改，请重新解析。");}}><option value="">自动识别</option><option value=",">逗号 ,</option><option value=";">分号 ;</option><option value={"\t"}>制表符 Tab</option><option value="|">竖线 |</option></select></label>
      <button id="csv-parse" className={`${styles.primary} ${styles.full}`} disabled={!ready||busy} onClick={parse}>{busy?"正在读取…":"解析与预览"}</button>
      <p role="status" aria-live="polite" className={styles.status}>{ready?status:status.includes("失败")?status:"正在准备本地CSV工具…"}</p>
      {!!width&&<fieldset style={{border:"1px solid #d5e1da",marginTop:20,padding:15,minWidth:0}}><legend>保留的列（按原顺序）</legend><div style={{maxHeight:260,overflow:"auto"}}>{Array.from({length:width},(_,i)=><label key={i} className={styles.check} style={{overflowWrap:"anywhere",marginBottom:10}}><input type="checkbox" data-column={i} checked={selected.includes(i)} onChange={e=>{invalidate();setSelected(prev=>e.target.checked?[...prev,i].sort((a,b)=>a-b):prev.filter(n=>n!==i));setStatus("选列已更改，请重新生成下载。");}}/>{i+1}. {rows[0][i]||"（首行为空）"}</label>)}</div></fieldset>}
    </section><section className={styles.panel}><h2>2. 预览与下载</h2>{rows.length?<><p id="csv-summary" className={styles.hint}>{rows.length}行 · {width}列 · 分隔符：{found==="\t"?"Tab":found} · 保留{selected.length}列</p><div id="csv-preview" style={{overflow:"auto",maxHeight:420,maxWidth:"100%",marginTop:15}}><table style={{borderCollapse:"collapse",fontSize:12}}><thead><tr><th>行</th>{selected.map(i=><th key={i} style={{padding:8,border:"1px solid #d5e1da"}}>第{i+1}列</th>)}</tr></thead><tbody>{rows.slice(0,20).map((r,n)=><tr key={n}><th>{n+1}</th>{selected.map(i=><td key={i} style={{padding:8,border:"1px solid #d5e1da",whiteSpace:"pre-wrap",minWidth:80,maxWidth:200,overflowWrap:"anywhere"}}>{r[i]??""}</td>)}</tr>)}</tbody></table></div><button id="csv-generate" className={styles.primary} style={{marginTop:20}} disabled={!selected.length} onClick={generate}>生成CSV与JSON</button></>:<div className={styles.empty}>解析后在这里预览前20行。</div>}
    {output&&<div id="csv-output"><p className={styles.hint}>CSV为UTF-8 BOM，沿用识别的分隔符；{output.escaped}格添加了安全前缀。JSON为二维文本数组，包含首行。</p><div className={styles.buttons}><a id="csv-download" className={styles.primary} href={output.csv} download="整理后的表格.csv">↓ 下载安全CSV</a><a id="csv-json" className={styles.secondary} href={output.json} download="整理后的表格.json">↓ 下载JSON</a></div></div>}</section></div>
    <footer className={styles.footer}>空行保留，文件末尾换行产生的尾部空记录去除；行长不齐时，缺少的选中列导出为空文本。空列名、同名列按列位置区分。不会转换数字或日期；不支持Excel工作簿、GBK或自动修复坏引号。<br/>CSV导出对以 =、+、-、@（含前置空白/控制字符）或制表/回车/换行开头的单元格添加英文单引号，减少电子表格公式执行风险，负数文本也会转义。这会改变导出副本的文本；原文件与JSON不改。不同表格软件的导入行为仍可能不同，请以文本方式导入不可信数据。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文界面由本平台编写，解析/序列化使用<a href="https://github.com/mholt/PapaParse">PapaParse 5.5.3</a>，MIT许可。<a href="/vendor/papaparse/LICENSE">原始许可证</a> · <a href="/vendor/papaparse/SOURCE.md">固定版本与来源</a>。这是有界CSV整理工具，不是完整表格应用。</p></details></footer>
  </main>;
}
