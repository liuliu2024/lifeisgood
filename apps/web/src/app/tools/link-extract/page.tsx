"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import styles from "../avatar/tool.module.css";
type Result={urls:{url:string;occurrences:{start:number;end:number;text:string}[]}[];uniqueCount:number;occurrenceCount:number;notice:string};
const sample="整理自己的资料：\nhttps://example.com/products\n稍后再看 https://example.org/about 。\n重复的网址 https://example.com/products 只保留一项，并记录全部位置。";
export default function LinkExtract(){
 const[text,T]=useState(sample),[busy,B]=useState(false),[message,M]=useState("把含有完整网址的文字粘进来，在本机整理成清单。"),[output,O]=useState<{result:Result;txt:string;json:string}|null>(null);
 const worker=useRef<Worker|null>(null),generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),urls=useRef<string[]>([]);
 function stop(){generation.current++;worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;B(false);}
 function clear(){urls.current.splice(0).forEach(URL.revokeObjectURL);O(null);}
 function edit(value:string){stop();clear();if(value.length>20000||new TextEncoder().encode(value).length>65536){M("文字超过20000个UTF16字符或64KiB，原文保留。请分批粘贴。");return;}T(value);M("文字已修改，旧清单与下载已清除。");}
 useEffect(()=>()=>{generation.current++;worker.current?.terminate();if(timer.current)clearTimeout(timer.current);urls.current.splice(0).forEach(URL.revokeObjectURL);},[]);
 function run(){stop();clear();const id=generation.current;B(true);M("正在本机整理网址…");
  function fail(s:string){if(id!==generation.current)return;stop();clear();M(s);}
  try{
   const w=new Worker("/vendor/linkify/extract-worker.js");worker.current=w;timer.current=setTimeout(()=>fail("处理超过2秒，已终止。请分批整理。"),2000);
   w.onerror=e=>{e.preventDefault();fail("本机网址组件加载失败，请重试。");};
   w.onmessage=e=>{if(id!==generation.current)return;w.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;
    try{if(!e.data?.ok)throw Error(e.data?.error||"网址整理失败。");const r=e.data.result as Result;if(!r||!Array.isArray(r.urls)||r.urls.length>100||typeof e.data.txt!=="string")throw Error("结果格式异常。");
     const txt=URL.createObjectURL(new Blob([e.data.txt],{type:"text/plain;charset=utf-8"}));urls.current.push(txt);const json=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:"application/json;charset=utf-8"}));urls.current.push(json);
     O({result:r,txt,json});B(false);M(r.uniqueCount?`整理好了：${r.occurrenceCount}处完整网址，去重后${r.uniqueCount}项。` : "没有符合范围的完整网址。请保留http://或https://协议头。");
    }catch(e){fail(e instanceof Error?e.message:"下载准备失败，请重试。");}
   };w.postMessage({text});
  }catch{fail("当前浏览器无法启动本机处理，请重试。");}
 }
 return <main className={styles.shell}><nav className={styles.nav}><Link href="/" className={styles.brand}>生活小助手</Link><Link href="/#daily-tools" className={styles.back}>← 回到新发现</Link></nav><p className={styles.eyebrow}>复制来的资料 / 本机整理</p><h1 className={styles.title}>整理文字里的完整网址</h1><p className={styles.intro}>把自己的资料粘进来，找出以http://或https://开头的网址。去重保留顺序，保存清单和原文位置。</p><p className={styles.privacy}>不上传、不打开网址、不抓网页、不检查可达性</p><section className={styles.panel}><h2>粘贴含有网址的文字</h2><label className={styles.field}>自己的纯文本<textarea id="links-input" className={styles.input} rows={9} value={text} onChange={e=>edit(e.target.value)}/></label><p className={styles.hint}>最多20000个UTF16字符、64KiB；最多100处完整网址（含重复），单个最多2048字符。只接受显式http://或https://，不收www裸域、无协议域名、邮箱、电话或含账号密码的网址。中文逗号句号、括号等视为边界，网址若需这些符号请先百分号编码。</p><div className={styles.buttons}><button id="links-generate" className={styles.primary} disabled={busy} onClick={run}>整理网址</button><button id="links-cancel" className={styles.secondary} onClick={()=>{stop();clear();M("已取消，旧清单不会恢复。");}}>取消并清除结果</button></div><p role="status" className={styles.status}>{message}</p></section>{output&&<section id="links-output" className={styles.panel} style={{marginTop:24,overflowWrap:"anywhere"}}><h2>去重后的网址清单</h2>{output.result.urls.length?<ol>{output.result.urls.map(item=><li key={item.url} style={{marginBottom:18}}><p style={{whiteSpace:"pre-wrap"}}>{item.url}</p><p className={styles.hint}>出现{item.occurrences.length}次 · 原文位置{item.occurrences.map(x=>`${x.start}–${x.end}`).join("、")}</p></li>)}</ol>:<p>没有符合范围的完整网址。</p>}<div className={styles.buttons}><a id="links-txt" className={styles.primary} href={output.txt} download="我的网址清单.txt">保存TXT清单</a><a id="links-json" className={styles.secondary} href={output.json} download="网址位置说明.json">保存JSON位置</a></div><p className={styles.hint}>{output.result.notice}</p></section>}<footer className={styles.footer}>结果只作纯文本显示，不生成目标网址的可点击链接，不验证网页是否安全、真实、可访问或由谁拥有。HTTP与HTTPS视为不同网址；规范化后的完整地址用于去重，位置按原文UTF16从0起算，末位置不包含。换行与制表可保留，其它控制字符拒绝。离开或刷新会丢失当前文字，请自行保存。<details className={styles.source}><summary>开源来源与收窄范围</summary><p>Linkify4.4.0原MIT及core-js改编原MIT保留。为不分发授权范围未核清的生成TLD数据，只移除两条TLD常量，原识别算法不改，所以不支持裸域名。平台另做URL校验、限额和去重。<a href="/vendor/linkify/SOURCE.md">固定版本与适配说明</a></p></details></footer></main>;
}
