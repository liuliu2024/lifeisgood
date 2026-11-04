"use client";

import {useEffect,useRef,useState} from "react";
import styles from "../avatar/tool.module.css";
import {clearUrls,loadLocalScript,makeUrl} from "../avatar/browser-local";

type PdfDocument={getPageCount():number;getPageIndices():number[];copyPages(doc:PdfDocument,pages:number[]):Promise<unknown[]>;addPage(page:unknown):void;save():Promise<Uint8Array<ArrayBuffer>>};
type PdfLibrary={PDFDocument:{load(bytes:ArrayBuffer):Promise<PdfDocument>;create():Promise<PdfDocument>}};
type Preview={name:string;pages:number;url:string};
function rangeIndices(value:string,count:number){
  if(!value.trim())throw Error("请输入取页范围。");
  if(value.length>2000)throw Error("页码范围最多2000个字符。");
  const pages:number[]=[];
  for(const part of value.split(",")){const match=part.trim().match(/^(\d{1,6})(?:\s*-\s*(\d{1,6}))?$/);if(!match)throw Error("页码格式无效，请使用1-3,5；使用英文逗号。");const a=Number(match[1]),b=Number(match[2]||match[1]);if(a<1||b<a||a>count||b>count)throw Error(`页码范围无效，第一份文件共${count}页。`);if(pages.length+b-a+1>400)throw Error("输出超过400页上限。");for(let i=a;i<=b;i++)pages.push(i-1);}
  return pages;
}
export default function PdfTool(){
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[files,setFiles]=useState<(File|null)[]>([null,null]);
  const [range,setRange]=useState("1"),[order,setOrder]=useState("ab"),[status,setStatus]=useState("选择PDF，先查看原页或直接合并、取页。");
  const [previews,setPreviews]=useState<Preview[]>([]);
  const [output,setOutput]=useState<{url:string;pages:number;size:number;name:string}|null>(null);
  const generation=useRef(0),working=useRef(false),urls=useRef<string[]>([]),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;loadLocalScript("/vendor/pdf-lib/pdf-lib.min.js").then(()=>{if(mounted.current)setReady(true);}).catch(e=>{if(mounted.current)setStatus(e.message);});return()=>{mounted.current=false;generation.current++;clearUrls(urls.current);};},[]);
  function clear(){generation.current++;clearUrls(urls.current);setOutput(null);setPreviews([]);}
  function changeFile(index:number,file:File|null){clear();setFiles(prev=>prev.map((f,i)=>i===index?file:f));setStatus("输入已更换，原预览和下载已清除；请重新处理。");}
  async function run(mode:"preview"|"merge"|"extract"){
    if(working.current)return;
    clear();const token=generation.current,snapshot={files:[...files],range,order};working.current=true;setBusy(true);setStatus("正在本机校验和处理…");
    const current=()=>mounted.current&&token===generation.current;
    try{
      const library=(window as Window&{PDFLib?:PdfLibrary}).PDFLib;if(!library)throw Error("本地PDF工具尚未准备好，请刷新后重试。");
      const newPreviews:Preview[]=[];
      async function load(index:number){const file=snapshot.files[index];if(!file)throw Error(index===0?"请选择第一份PDF。":"合并需要选择第二份PDF。");if(!/\.pdf$/i.test(file.name))throw Error("请选择.pdf文件。");if(file.size>20*1024*1024)throw Error("单份文件不能超过20MiB；两份合计最多40MiB。");let doc:PdfDocument;
        try{doc=await library!.PDFDocument.load(await file.arrayBuffer());if(doc.getPageCount()<1)throw Error("empty PDF");}catch(e){throw Error(/encrypt/i.test(String(e))?"暂不支持加密PDF，请先在可信本地工具中解密。":"PDF无法读取，文件可能损坏或格式无效。");}
        if(doc.getPageCount()>200)throw Error("单份文件超过200页上限。");
        if(current())newPreviews.push({name:file.name,pages:doc.getPageCount(),url:makeUrl(file,urls.current)});
        return doc;
      }
      const a=await load(0);if(!current())return;
      let b:PdfDocument|null=null;if(mode==="merge"||(mode==="preview"&&snapshot.files[1])){b=await load(1);if(!current())return;}
      if(mode==="preview"){setPreviews(newPreviews);setStatus("页数校验完成。点击下方“打开原页预览”，在新窗口使用浏览器自带PDF阅读器查看。");return;}
      const result=await library.PDFDocument.create();if(!current())return;
      if(mode==="merge"){if(!b)throw Error("请选择第二份PDF。");if(a.getPageCount()+b.getPageCount()>400)throw Error("输出超过400页上限。");for(const doc of snapshot.order==="ab"?[a,b]:[b,a]){const pages=await result.copyPages(doc,doc.getPageIndices());if(!current())return;for(const page of pages)result.addPage(page);}}
      else{const pages=await result.copyPages(a,rangeIndices(snapshot.range,a.getPageCount()));if(!current())return;for(const page of pages)result.addPage(page);}
      const bytes=await result.save();if(!current())return;
      if(bytes.length>60*1024*1024)throw Error("输出超过60MiB，请减少页数后重试。");
      setPreviews(newPreviews);setOutput({url:makeUrl(new Blob([bytes],{type:"application/pdf"}),urls.current),pages:result.getPageCount(),size:bytes.length,name:mode==="merge"?"合并后的PDF.pdf":"取出的页面.pdf"});setStatus("处理完成，PDF已准备好；可预览或下载。");
    }catch(e){if(current()){clearUrls(urls.current);setOutput(null);setPreviews([]);setStatus(e instanceof Error?e.message:"处理失败，请重新选择PDF。");}}
    finally{working.current=false;if(mounted.current)setBusy(false);}
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>几页刚刚好 / 浏览器小工具</p><h1 className={styles.title}>PDF合成一本，也能只留几页</h1>
    <p className={styles.intro}>两份文件按顺序合并，或从第一份中按页码取页。复制原有页面，保留页面里的中文，不重新排字。</p><p className={styles.privacy}>文件只在本机浏览器处理，不上传、不调用API</p>
    <div className={styles.grid}><section className={styles.panel}><h2>1. 选文件与页码</h2>
      {[0,1].map(i=><label className={styles.field} key={i}>{i===0?"第一份PDF（取页从这里选）":"第二份PDF（仅合并时需要）"}<input id={`pdf-file-${i}`} className={styles.file} type="file" accept=".pdf,application/pdf" disabled={!ready} onChange={e=>changeFile(i,e.target.files?.[0]??null)}/><span id={`pdf-info-${i}`} className={styles.hint} style={{overflowWrap:"anywhere"}}>{files[i]?`${files[i]!.name} · ${previews[i]?previews[i].pages+"页":"等待重新校验"}`:(i===0?"未选择文件":"可不选")}</span></label>)}
      <p className={styles.hint}>每份≤20MiB、200页；仅两份，合计≤40MiB。输出≤400页、60MiB。处理时可换输入，旧任务会停止发布结果；请等待按钮恢复后再处理。</p>
      <button id="pdf-read" className={styles.secondary} style={{marginTop:16}} disabled={!ready||busy} onClick={()=>run("preview")}>校验页数与原页预览</button>
      <label className={styles.field} style={{marginTop:22}}>合并顺序<select id="pdf-order" className={styles.select} value={order} onChange={e=>{clear();setOrder(e.target.value);setStatus("顺序已更新，请重新处理。");}}><option value="ab">第一份 → 第二份</option><option value="ba">第二份 → 第一份</option></select></label>
      <button id="pdf-merge" className={`${styles.primary} ${styles.full}`} disabled={!ready||busy} onClick={()=>run("merge")}>合并两份PDF</button>
      <label className={styles.field} style={{marginTop:24}}>第一份的取页范围<input id="pdf-range" className={styles.input} value={range} maxLength={2000} onChange={e=>{clear();setRange(e.target.value);setStatus("页码已更新，请重新处理。");}}/><span className={styles.hint}>例如1-3,5。页码从1开始，按填写顺序保留；2,1-2会得到第2、1、2页，可重复取页。</span></label>
      <button id="pdf-extract" className={`${styles.primary} ${styles.full}`} disabled={!ready||busy} onClick={()=>run("extract")}>按页码取出PDF</button>
      <p role="status" aria-live="polite" className={styles.status}>{ready?status:status.includes("失败")?status:"正在准备本地PDF工具…"}</p>
    </section><section className={styles.panel}><h2>2. 原页与处理结果</h2>
      {previews.length?<div id="pdf-originals">{previews.map((p,i)=><div key={i} style={{marginBottom:18}}><p className={styles.filename}>{p.name} · {p.pages}页</p><div className={styles.buttons}><a id={`pdf-preview-${i}`} className={styles.secondary} href={p.url} target="_blank" rel="noopener noreferrer">打开原页预览（新窗口）</a></div></div>)}</div>:<div className={styles.empty}>选择文件并校验后，查看原页和页数。<br/>浏览器不支持PDF预览时，请下载后在本机阅读。</div>}
      {output&&<div id="pdf-output"><p id="pdf-summary">{output.pages}页 · {output.size.toLocaleString()}字节</p><div className={styles.buttons}><a id="pdf-download" className={styles.primary} href={output.url} download={output.name}>↓ 下载PDF</a><a id="pdf-open" className={styles.secondary} href={output.url} target="_blank" rel="noopener noreferrer">新窗口打开结果</a></div></div>}
    </section></div><footer className={styles.footer}>只提供有界合并与取页。加密PDF暂不支持；不提供OCR、正文改字、新增中文排版、复杂表单、签名或附件完整性保证。复制页面可能不保留文档级书签、表单或签名，重要文件请保留原件并检查下载副本。容量限制不是内存或性能保证，复杂PDF和低内存手机仍可能失败。预览依赖浏览器自带阅读器，不保证每个浏览器都能显示。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文界面由本平台编写；页面复制使用<a href="https://github.com/Hopding/pdf-lib">pdf-lib 1.17.1</a>（MIT）。<a href="/vendor/pdf-lib/SOURCE.md">固定版本、依赖与全部许可</a>。无新增字体分发，不是完整PDF编辑器。</p></details></footer>
  </main>;
}
