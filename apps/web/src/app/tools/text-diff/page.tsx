"use client";

import {useEffect,useRef,useState} from "react";
import styles from "../avatar/tool.module.css";
import local from "./diff.module.css";
import {clearUrls,makeUrl} from "../avatar/browser-local";

type Change={type:"equal"|"remove"|"add";value:string};
type Result={schema:string;library:string;unit:string;counts:{equal:number;remove:number;add:number};changes:Change[]};
const labels={equal:"不变",remove:"删除",add:"新增"};
function validate(text:string){if(text.length>20000||new TextEncoder().encode(text).length>48*1024||text.split(/\r\n|\r|\n/).length>1000)throw Error("每段最多20000字符、48KiB UTF-8、1000行，请缩短文字。");for(const char of text){const point=char.codePointAt(0)!;if(point===0||(point>=0xd800&&point<=0xdfff))throw Error("文字含空字符或不完整的Unicode字符，请修正后重试。");}}
export default function TextDiffTool(){
  const [oldText,setOldText]=useState(""),[newText,setNewText]=useState("");
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState("正在准备本地文字比较工具…");
  const [result,setResult]=useState<Result|null>(null),[downloads,setDownloads]=useState<{text:string;json:string}|null>(null);
  const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),generation=useRef(0),urls=useRef<string[]>([]);
  function stop(){generation.current++;worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;}
  function invalidate(){stop();clearUrls(urls.current);setResult(null);setDownloads(null);setBusy(false);}
  useEffect(()=>{
    let live=true;let probe:Worker|null=null;let probeTimer:ReturnType<typeof setTimeout>|null=null;
    try{probe=new Worker("/vendor/jsdiff/worker.js",{type:"module"});const fail=()=>{probe?.terminate();if(probeTimer)clearTimeout(probeTimer);if(live)setStatus("工具文件加载失败，请刷新后重试。");};probe.onerror=fail;probe.onmessage=e=>{if(e.data.type==="ready"){probe?.terminate();if(probeTimer)clearTimeout(probeTimer);if(live){setReady(true);setStatus("填入两段文字，查看哪些保留、删除或新增。");}}};probeTimer=setTimeout(fail,2000);}catch{setStatus("浏览器无法启用本地工作线程，请换用支持Worker的浏览器。");}
    return()=>{live=false;probe?.terminate();if(probeTimer)clearTimeout(probeTimer);stop();clearUrls(urls.current);};
  },[]);
  function edit(which:"old"|"new",text:string){invalidate();try{validate(text);}catch(error){setStatus(`${(error as Error).message} 本次修改未接受，原文字保留。`);return;}if(which==="old")setOldText(text);else setNewText(text);setStatus("文字已更改，请重新比较。");}
  function compare(){
    invalidate();const token=generation.current;
    try{validate(oldText);validate(newText);}catch(e){setStatus((e as Error).message);return;}
    setBusy(true);setStatus("正在独立工作线程中比较…");
    try{
      const running=new Worker("/vendor/jsdiff/worker.js",{type:"module"});worker.current=running;
      const fail=(message:string)=>{if(token!==generation.current)return;stop();setBusy(false);setResult(null);setDownloads(null);clearUrls(urls.current);setStatus(message);};
      timer.current=setTimeout(()=>fail("计算超过2秒，已终止工作线程。请缩短文字后重试。"),2000);
      running.onerror=()=>fail("比较工具加载或运行失败，请重试或刷新页面。");
      running.onmessage=e=>{
        if(token!==generation.current)return;
        if(e.data.type==="ready")return;
        if(e.data.type==="error"){fail(e.data.message||"比较失败，请重试。");return;}
        if(e.data.type!=="result"){fail("比较结果格式错误，请重试。");return;}
        try{
          const value:Result=e.data.result;
          if(!Array.isArray(value.changes)||value.changes.length>4001||value.changes.some(c=>!["equal","add","remove"].includes(c.type)||typeof c.value!=="string"))throw Error("比较结果格式错误。");
          const original=value.changes.filter(c=>c.type!=="add").map(c=>c.value).join(""),revised=value.changes.filter(c=>c.type!=="remove").map(c=>c.value).join("");
          if(original!==oldText||revised!==newText)throw Error("结果校验失败，请重新比较。");
          const json=JSON.stringify(value,null,2);
          const text="文字找不同 / 字符比较\n每行：= 不变，- 删除，+ 新增；后面为JSON字符串，转义保留换行。\n\n"+value.changes.map(c=>`${c.type==="add"?"+":c.type==="remove"?"-":"="} ${JSON.stringify(c.value)}`).join("\n")+"\n";
          if(new Blob([json]).size>512*1024||new Blob([text]).size>512*1024)throw Error("结果超过512KiB，请缩短文字。");
          const prepared={json:makeUrl(new Blob([json],{type:"application/json;charset=utf-8"}),urls.current),text:makeUrl(new Blob([text],{type:"text/plain;charset=utf-8"}),urls.current)};stop();setResult(value);setDownloads(prepared);setBusy(false);setStatus(value.counts.add+value.counts.remove===0?"两段文字完全一致，结果也可以下载。":"比较完成。绿色为新增，红色为删除，灰色为未变；各分段同时标明类型。");
        }catch(error){fail(error instanceof Error?error.message:"结果生成失败，请重试。");}
      };
      running.postMessage({oldText,newText});
    }catch{stop();setBusy(false);setStatus("浏览器无法启用比较线程，请刷新或更换浏览器。");}
  }
  return <main className={styles.shell}>
    <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
    <p className={styles.eyebrow}>改了哪里，一眼看见 / 浏览器小工具</p><h1 className={styles.title}>看看两段文字哪里不同</h1>
    <p className={styles.intro}>对照通知、清单或文案，按字符找出新增和删去的内容。空格、大小写与换行也会认真比较。</p><p className={styles.privacy}>只在本机浏览器比较，文字不上传，不连接外部服务</p>
    <section className={styles.panel}><h2>1. 放入前后两版文字</h2><div className={`${styles.row} ${local.inputs}`}>{[["old","原文",oldText],["new","新版",newText]].map(([which,label,value])=><label key={which} className={styles.field}>{label}<textarea id={`diff-${which}`} className={`${styles.input} ${local.input}`} value={value} onChange={e=>edit(which as "old"|"new",e.target.value)} spellCheck={false} placeholder={which==="old"?"粘贴修改前的文字":"粘贴修改后的文字"}/><span className={styles.hint}>{value.length.toLocaleString()} / 20000字符</span></label>)}</div>
      <p className={styles.hint}>每段最多20000字符（部分emoji占2个）、48KiB UTF-8、1000行。差异过多或计算过慢会停止，请缩短内容。</p>
      <div className={styles.buttons}><button id="diff-compare" className={styles.primary} disabled={!ready||busy} onClick={compare}>{busy?"正在比较…":"比较两段文字"}</button><button id="diff-example" className={styles.secondary} onClick={()=>{invalidate();setOldText("周六清单\n买苹果、牛奶🥛\n18:00回家\n");setNewText("周日清单\n买苹果、燕麦奶🥛\n18:30回家\n");setStatus("示例已填入，点击比较查看变化。");}}>试试生活清单</button>{busy&&<button id="diff-cancel" className={styles.secondary} onClick={()=>{invalidate();setStatus("已取消并终止工作线程，可修改后重新比较。");}}>取消比较</button>}</div>
      <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    </section>
    <section className={styles.panel} style={{marginTop:24}}><h2>2. 安全对照与保存</h2>{result&&downloads?<div id="diff-result"><p id="diff-summary" className={styles.hint}>未变{result.counts.equal} · 删除{result.counts.remove} · 新增{result.counts.add}（按Unicode码点计数）</p><div id="diff-preview" className={local.preview}>{result.changes.length?result.changes.map((c,i)=><span key={i} className={`${local.part} ${local[c.type]}`}><span className={local.badge}>{labels[c.type]}</span><span className={local.text}>{c.value}</span></span>):<p>两段都是空文本。</p>}</div><div className={styles.buttons}><a id="diff-text" className={styles.primary} href={downloads.text} download="文字找不同.txt">↓ 下载纯文本对照</a><a id="diff-json" className={styles.secondary} href={downloads.json} download="文字找不同.json">↓ 下载JSON结果</a></div><p className={styles.hint}>纯文本用 = / - / + 标明类型，每段以JSON字符串记录，保留换行、引号和原始文字。JSON按分段保存，可重建两版原文。</p></div>:<div className={styles.empty}>比较后，未变、删除和新增内容会显示在这里。<br/>修改输入会立即清除旧结果与下载。</div>}</section>
    <footer className={styles.footer}>按Unicode码点比较，不进行中文分词、语义判断或Unicode归一化；组合emoji、肤色和组合音标可能被拆成多个比较单位。空文本可以比较，不忽略空格或行尾差异；文本框按浏览器规则将粘贴的行尾统一为换行。每次在独立Worker运行，算法最多1000ms与2000次编辑步数，主页面另设2秒终止期限；最多4001段、每份输出≤512KiB，不发布截断结果。后台页面的计时器可能被浏览器延迟，但算法始终不占主线程，取消/切页会终止Worker。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文界面由本平台编写；字符比较使用<a href="https://github.com/kpdecker/jsdiff">jsdiff 8.0.2</a>的原始字符ESM模块，BSD-3-Clause许可。<a href="/vendor/jsdiff/LICENSE.txt">原始许可证</a> · <a href="/vendor/jsdiff/SOURCE.md">固定来源与依赖</a>。不提供文档格式解析或自动改写。</p></details></footer>
  </main>;
}
