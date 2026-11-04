"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import { rasterDimensions } from "../palette/image-header";

let nativePending = false;
function header(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer), v = new DataView(buffer);
  const png = b.length >= 24 && [137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n);
  const jpg = b.length >= 4 && b[0]===255 && b[1]===216 && b[2]===255;
  if (!png && !jpg) throw Error("只接受静态PNG或JPEG，不接受SVG、GIF或WebP。");
  if (png) {
    let at=8, chunks=0, end=false;
    while(at+12<=b.length) {
      if(++chunks>1024) throw Error("PNG块过多。");
      const size=v.getUint32(at), next=at+12+size;
      if(next>b.length) throw Error("PNG长度损坏。");
      const type=String.fromCharCode(...b.slice(at+4,at+8));
      if(["acTL","fcTL","fdAT"].includes(type)) throw Error("请先将动画PNG导出为静态图片。");
      at=next;
      if(type==="IEND") {end=true; break;}
    }
    if(!end || at!==b.length) throw Error("PNG缺少正确结尾。");
  }
  const d=rasterDimensions(buffer);
  if(d.width<8 || d.height<8 || d.width>2048 || d.height>2048 || d.width*d.height>1000000) throw Error("源图每边须为8至2048像素，总像素最多100万。");
  return {...d, format:png?"PNG":"JPEG"};
}
function inspect(svg: string, width: number, height: number) {
  if(new TextEncoder().encode(svg).length>1048576 || /<!|<\?/.test(svg)) throw Error("SVG结果过大或格式异常。");
  const doc=new DOMParser().parseFromString(svg,"image/svg+xml"), root=doc.documentElement;
  if(root.localName!=="svg" || doc.querySelector("parsererror") || root.namespaceURI!=="http://www.w3.org/2000/svg") throw Error("SVG无法安全读取。");
  const nodes=Array.from(root.querySelectorAll("*"));
  if(!nodes.length || nodes.length>2000) throw Error("路径为空或超过2000条，请使用更简单的小图。");
  let commands=0;
  for(const node of [root,...nodes]) {
    if(node!==root && node.localName!=="path") throw Error("SVG含不支持的元素。");
    for(const a of Array.from(node.attributes)) {
      const allowed=node===root?["xmlns","version","width","height","desc"]:["fill","stroke","stroke-width","opacity","d"];
      if(!allowed.includes(a.name)) throw Error("SVG属性超出白名单。");
      if(["fill","stroke"].includes(a.name) && !/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/.test(a.value)) throw Error("SVG颜色异常。");
      if(["stroke-width","opacity"].includes(a.name) && (!/^\d+(\.\d+)?$/.test(a.value) || Number(a.value)>1)) throw Error("SVG数值异常。");
      if(a.name==="d") {
        if(!/^[MLQZ\d.\s-]+$/.test(a.value)) throw Error("SVG路径异常。");
        commands+=(a.value.match(/[MLQZ]/g)||[]).length;
        if(commands>40000) throw Error("路径节点过多，请使用更简单的小图。");
        for(const n of a.value.match(/-?\d+(?:\.\d+)?/g)||[]) if(!Number.isFinite(Number(n)) || Math.abs(Number(n))>1024) throw Error("SVG路径坐标超限。");
      }
    }
  }
  if(root.getAttribute("width")!==String(width) || root.getAttribute("height")!==String(height)) throw Error("SVG尺寸异常。");
  if(!nodes.some(n=>Number(n.getAttribute("opacity"))>0)) throw Error("没有可见轮廓，请选择不完全透明的图片。");
  return {paths:nodes.length,commands};
}
export default function ImageTrace() {
  const [file,setFile]=useState<File|null>(null),[colors,setColors]=useState("4"),[busy,setBusy]=useState(false),[message,setMessage]=useState("选一张自己的小图，把轮廓描成可缩放路径。"),[result,setResult]=useState<{svg:string;json:string;width:number;height:number;paths:number}|null>(null);
  const generation=useRef(0),worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),urls=useRef<string[]>([]);
  function clear(){urls.current.splice(0).forEach(URL.revokeObjectURL);setResult(null);}
  function stop(){generation.current++;worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;setBusy(false);}
  function edit(){stop();clear();setMessage("选择已变化，旧预览和下载已清除。点击重新描摹。");}
  useEffect(()=>()=>{generation.current++;worker.current?.terminate();if(timer.current)clearTimeout(timer.current);urls.current.splice(0).forEach(URL.revokeObjectURL);},[]);
  function fail(id:number,e:unknown){if(id!==generation.current)return;stop();clear();setMessage(e instanceof Error?e.message:"图片处理失败，请重试。");}
  async function run(){
    stop();clear();const id=generation.current;
    if(!file){setMessage("请先选择图片。");return;}
    if(nativePending){setMessage("上一张图片仍在浏览器解码，请稍后重试；持续等待可刷新本页。");return;}
    if(file.size<12 || file.size>2097152){setMessage("文件大小须为12字节至2MiB。");return;}
    const count=Number(colors);if(!Number.isInteger(count)||count<2||count>8){setMessage("颜色数须为2至8。");return;}
    setBusy(true);setMessage("正在本机读取小图…");timer.current=setTimeout(()=>fail(id,Error("读取或解码超过8秒，已拒收结果，请换一张较小图片。")),8000);
    try{
      const buffer=await file.arrayBuffer();if(id!==generation.current)return;
      const source=header(buffer);nativePending=true;
      let bitmap:ImageBitmap;
      try{bitmap=await createImageBitmap(new Blob([buffer],{type:source.format==="PNG"?"image/png":"image/jpeg"}));}finally{nativePending=false;}
      if(id!==generation.current){bitmap.close();return;}
      let image:ImageData;
      const scale=Math.min(1,256/source.width,256/source.height),width=Math.max(1,Math.round(source.width*scale)),height=Math.max(1,Math.round(source.height*scale));
      try{
        if(bitmap.width!==source.width||bitmap.height!==source.height)throw Error("解码尺寸与图片头不一致；请重新导出不带旋转标记的图片。");
        const c=document.createElement("canvas");c.width=width;c.height=height;const ctx=c.getContext("2d");if(!ctx)throw Error("浏览器无法创建画布。");ctx.drawImage(bitmap,0,0,width,height);image=ctx.getImageData(0,0,width,height);
      }finally{bitmap.close();}
      if(timer.current)clearTimeout(timer.current);
      setMessage("正在描摹轮廓，最多等待3秒…");const w=new Worker(new URL("./worker.js",import.meta.url));worker.current=w;
      timer.current=setTimeout(()=>fail(id,Error("描摹超过3秒，已终止计算。请使用轮廓更简单的小图。")),3000);
      w.onerror=e=>{e.preventDefault();fail(id,Error("描摹组件加载失败，请重试。"));};
      w.onmessage=e=>{
        if(id!==generation.current)return;
        w.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;
        try{
          if(!e.data?.ok)throw Error(e.data?.error||"描摹失败，请重试。");
          const {svg}=e.data;if(typeof svg!=="string")throw Error("描摹结果异常。");const details=inspect(svg,width,height);
          const record={schema:"life-image-trace-v1",source:{...source},output:{width,height,...details},colors:count,approximate:true,notice:"小图经缩小、减色和轮廓近似，不是无损转换；原图未修改。"};
          const svgUrl=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));urls.current.push(svgUrl);
          const json=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:"application/json"}));urls.current.push(json);
          setResult({svg:svgUrl,json,width,height,paths:details.paths});setBusy(false);setMessage("描摹完成。先看轮廓，再保存SVG和说明。");
        }catch(error){fail(id,error);}
      };
      w.postMessage({pixels:image.data.buffer,width,height,colors:count},[image.data.buffer]);
    }catch(e){fail(id,e);}
  }
  return <main className={styles.shell}><nav className={styles.nav}><Link className={styles.brand} href="/">生活小助手</Link><Link className={styles.back} href="/#daily-tools">← 回到新发现</Link></nav><p className={styles.eyebrow}>自己的小图 / 本机描摹</p><h1 className={styles.title}>把小图描成可缩放的SVG</h1><p className={styles.intro}>适合色块、简笔画和清晰轮廓。减成少量颜色，生成真正的曲线路径；照片细节会简化。</p><p className={styles.privacy}>图片留在本机，不上传，不修改原文件</p><div className={styles.grid}><section className={styles.panel}><h2>选图与颜色</h2><label className={styles.field}>自己的PNG或JPEG<input id="trace-file" className={styles.file} type="file" accept="image/png,image/jpeg" onChange={e=>{edit();setFile(e.target.files?.[0]||null);}}/></label><label className={styles.field}>减色数量<select id="trace-colors" className={styles.select} value={colors} onChange={e=>{edit();setColors(e.target.value);}}>{[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}种颜色</option>)}</select></label><p className={styles.hint}>最多2MiB、每边8至2048像素、源图100万像素；描摹前缩至最长边256像素。复杂纹理可能超时，透明边缘也会近似。</p><div className={styles.buttons}><button id="trace-run" className={styles.primary} disabled={busy} onClick={run}>开始描摹</button>{busy&&<button id="trace-cancel" className={styles.secondary} onClick={()=>{stop();clear();setMessage("已取消，旧结果不会恢复。");}}>取消</button>}</div><p role="status" className={styles.status}>{message}</p></section><section className={styles.panel} id="trace-output"><h2>看看描摹轮廓</h2>{result?<><img id="trace-preview" className={styles.preview} src={result.svg} alt="描摹后的SVG轮廓预览"/><p className={styles.info}>{result.width} × {result.height} · {result.paths}条路径 · 近似描摹</p><div className={styles.buttons}><a id="trace-svg" className={styles.primary} href={result.svg} download="我的小图轮廓.svg">保存SVG</a><a id="trace-json" className={styles.secondary} href={result.json} download="小图描摹说明.json">保存说明</a></div></>:<div className={styles.empty}>描摹完成后，预览和下载会出现在这里</div>}</section></div><footer className={styles.footer}>这是小图描摹，不是无损格式转换或完整矢量编辑器。复杂照片、极细线条、文字与品牌标志不保证还原，请只处理有权使用的图片。<details className={styles.source}><summary>开源来源与使用范围</summary><p>ImageTracer.js 1.2.6，原Unlicense。2023年以来低频维护；中文界面与输入输出限制由平台提供。</p><a href="/vendor/imagetracer/SOURCE.md">固定版本与原许可说明</a></details></footer></main>;
}
