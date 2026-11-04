"use client";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import local from "./collage.module.css";
import { canvasPng, clearUrls, loadLocalScript, makeUrl } from "../avatar/browser-local";
import { decodePhoto, inspectPhoto } from "../crop/photo-utils";

type Point = { x:number; y:number };
type KNode = { add(node:KNode):void; destroy():void; on(event:string,handler:()=>void):void; x():number; x(value:number):KNode; y():number; y(value:number):KNode; width():number; width(value:number):KNode; height():number; height(value:number):KNode; position(value:Point):void; size(value:{width:number;height:number}):void; scale(value:Point):void; fill(value:string):void; hide():void; show():void; batchDraw():void; toCanvas(options:{pixelRatio:number}):HTMLCanvasElement };
type KFactory = new (options:Record<string,unknown>)=>KNode;
type Konva = { Stage:KFactory; Layer:KFactory; Rect:KFactory; Image:KFactory; pixelRatio:number };
type Photo = { image:HTMLImageElement; name:string };
type Placed = { node:KNode; baseWidth:number; baseHeight:number; zoom:number };
const sizes:Record<string,{width:number;height:number}>={square:{width:1000,height:1000},wide:{width:1600,height:900},portrait:{width:900,height:1600},large:{width:2000,height:2000}};

export default function CollageTool(){
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(false),[exporting,setExporting]=useState(false);
 const [photos,setPhotos]=useState<Photo[]>([]),[size,setSize]=useState("square"),[background,setBackground]=useState("#f1f6f3"),[transparent,setTransparent]=useState(false);
 const [selected,setSelected]=useState(-1),[zoom,setZoom]=useState(100),[reset,setReset]=useState(0);
 const [status,setStatus]=useState("选择2–6张自己的照片，先整齐排好，再自由挪一挪。"),[output,setOutput]=useState<string|null>(null);
 const host=useRef<HTMLDivElement>(null),stage=useRef<KNode|null>(null),back=useRef<KNode|null>(null),border=useRef<KNode|null>(null),layer=useRef<KNode|null>(null),placed=useRef<Placed[]>([]);
 const photosRef=useRef<Photo[]>([]),urls=useRef<string[]>([]),revision=useRef(0),loadSequence=useRef(0),displayScale=useRef(1),selectedRef=useRef(-1);
 function invalidate(){revision.current++;clearUrls(urls.current);setOutput(null);setExporting(false);}
 function selection(index:number){selectedRef.current=index;setSelected(index);const item=placed.current[index];if(!item||!border.current)return;setZoom(item.zoom);border.current.position({x:item.node.x()-3,y:item.node.y()-3});border.current.size({width:item.node.width()+6,height:item.node.height()+6});border.current.show();layer.current?.batchDraw();}
 useEffect(()=>{let mounted=true;loadLocalScript("/vendor/konva/konva.min.js").then(()=>{if(mounted)setReady(true);}).catch(error=>{if(mounted)setStatus(error.message);});return()=>{mounted=false;loadSequence.current++;revision.current++;stage.current?.destroy();photosRef.current.forEach(p=>{p.image.src="";});clearUrls(urls.current);};},[]);
 useEffect(()=>{
  if(!ready||photos.length<2||!host.current)return;
  const konva=(window as Window&{Konva?:Konva}).Konva;if(!konva){setStatus("拼贴工具加载不完整，请刷新重试。");return;}
  const dimensions=sizes[size];if(!dimensions)return;
  konva.pixelRatio=1;
  const current=new konva.Stage({container:host.current,width:dimensions.width,height:dimensions.height});stage.current=current;
  const content=new konva.Layer({});current.add(content);layer.current=content;
  const bg=new konva.Rect({x:0,y:0,width:dimensions.width,height:dimensions.height,fill:transparent?"rgba(0,0,0,0)":background,listening:false});back.current=bg;content.add(bg);
  const columns=photos.length<=3?photos.length:3,rows=Math.ceil(photos.length/columns),gap=24;
  const cellWidth=(dimensions.width-gap*(columns+1))/columns,cellHeight=(dimensions.height-gap*(rows+1))/rows;
  placed.current=photos.map((photo,index)=>{const ratio=Math.min(cellWidth/photo.image.naturalWidth,cellHeight/photo.image.naturalHeight);const width=photo.image.naturalWidth*ratio,height=photo.image.naturalHeight*ratio;const node=new konva.Image({image:photo.image,x:gap+(index%columns)*(cellWidth+gap)+(cellWidth-width)/2,y:gap+Math.floor(index/columns)*(cellHeight+gap)+(cellHeight-height)/2,width,height,draggable:true});content.add(node);node.on("mousedown touchstart",()=>selection(index));node.on("dragstart",()=>{invalidate();selection(index);});node.on("dragmove",()=>{node.x(Math.max(24-node.width(),Math.min(dimensions.width-24,node.x())));node.y(Math.max(24-node.height(),Math.min(dimensions.height-24,node.y())));selection(index);});node.on("dragend",()=>{invalidate();setStatus("位置已更新，点击导出保存新的拼贴。");});return{node,baseWidth:width,baseHeight:height,zoom:100};});
  const outline=new konva.Rect({x:0,y:0,width:0,height:0,stroke:"#287956",strokeWidth:2,dash:[7,5],listening:false});border.current=outline;content.add(outline);outline.hide();selectedRef.current=-1;setSelected(-1);setZoom(100);
  const resize=()=>{if(!host.current)return;const width=Math.min(dimensions.width,Math.max(1,host.current.clientWidth));const scale=width/dimensions.width;displayScale.current=scale;current.size({width,height:dimensions.height*scale});current.scale({x:scale,y:scale});current.batchDraw();};
  resize();const observer=new ResizeObserver(resize);observer.observe(host.current);
  return()=>{observer.disconnect();current.destroy();if(stage.current===current)stage.current=null;placed.current=[];};
 // Background changes update only the background node, preserving photo positions.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ready,photos,size,reset]);
 useEffect(()=>{back.current?.fill(transparent?"rgba(0,0,0,0)":background);layer.current?.batchDraw();},[background,transparent]);
 async function choose(files:File[]){
  const token=++loadSequence.current;invalidate();stage.current?.destroy();stage.current=null;photosRef.current.forEach(p=>{p.image.src="";});photosRef.current=[];setPhotos([]);setSelected(-1);selectedRef.current=-1;
  if(files.length<2||files.length>6){setStatus("请选择2–6张JPG或PNG图片，本次选择会替换旧照片。");setLoading(false);return;}
  if(files.reduce((sum,file)=>sum+file.size,0)>30*1024*1024){setStatus("照片合计不能超过30MiB，请减少文件或先压缩。");setLoading(false);return;}
  setLoading(true);setStatus("正在本机检查并读取照片…");const loaded:Photo[]=[];
  try{
   const headers=await Promise.all(files.map(inspectPhoto));
   for(let i=0;i<files.length;i++)if(headers[i].mime==="image/png"){
    const bytes=new Uint8Array(await files[i].arrayBuffer()),view=new DataView(bytes.buffer);
    for(let at=8;at+12<=bytes.length;){const length=view.getUint32(at);if(at+12+length>bytes.length)break;const type=String.fromCharCode(...bytes.subarray(at+4,at+8));if(type==="acTL")throw new Error("暂不支持APNG动态图，请选择静态JPG或PNG。");if(type==="IDAT")break;at+=length+12;}
   }
   if(headers.some(info=>info.width*info.height>8_000_000)||headers.reduce((sum,info)=>sum+info.width*info.height,0)>20_000_000)throw new Error("每张最多800万像素，全部照片合计最多2000万像素，请先缩小原图。");
   for(let i=0;i<files.length;i++){
    const image=await decodePhoto(files[i]);
    if(token!==loadSequence.current){image.src="";loaded.forEach(p=>{p.image.src="";});return;}
    if(image.naturalWidth*image.naturalHeight>8_000_000){image.src="";throw new Error("解码后的图片超过800万像素，请缩小后再试。");}
    loaded.push({image,name:files[i].name});
   }
   if(loaded.reduce((sum,p)=>sum+p.image.naturalWidth*p.image.naturalHeight,0)>20_000_000)throw new Error("解码后的照片合计超过2000万像素。");
   photosRef.current=loaded;setPhotos(loaded);setStatus("照片已排好。点选照片后拖动，或用下方滑杆缩放；画布外部分不会导出。");
  }catch(error){loaded.forEach(p=>{p.image.src="";});if(token===loadSequence.current)setStatus(error instanceof Error?error.message:"照片读取失败，请重试。");}
  finally{if(token===loadSequence.current)setLoading(false);}
 }
 function scalePhoto(value:number){const index=selectedRef.current,item=placed.current[index];if(!item||value<40||value>200)return;invalidate();const cx=item.node.x()+item.node.width()/2,cy=item.node.y()+item.node.height()/2;item.zoom=value;item.node.size({width:item.baseWidth*value/100,height:item.baseHeight*value/100});const dimensions=sizes[size];item.node.position({x:Math.max(24-item.node.width(),Math.min(dimensions.width-24,cx-item.node.width()/2)),y:Math.max(24-item.node.height(),Math.min(dimensions.height-24,cy-item.node.height()/2))});selection(index);setStatus("大小已更新。可拖动微调，再导出。");}
 async function exportPng(){
  const current=stage.current;if(!current||photos.length<2){setStatus("请先选择2–6张照片。");return;}
  invalidate();const token=revision.current;setExporting(true);let canvas:HTMLCanvasElement|null=null;
  try{border.current?.hide();current.batchDraw();canvas=current.toCanvas({pixelRatio:1/displayScale.current});if(selectedRef.current>=0)border.current?.show();layer.current?.batchDraw();
   const expected=sizes[size];if(canvas.width!==expected.width||canvas.height!==expected.height){const fixed=document.createElement("canvas");fixed.width=expected.width;fixed.height=expected.height;const context=fixed.getContext("2d");if(!context)throw new Error("浏览器不能导出画布。");context.drawImage(canvas,0,0,fixed.width,fixed.height);canvas.width=canvas.height=0;canvas=fixed;}
   const blob=await canvasPng(canvas);if(token!==revision.current)return;setOutput(makeUrl(blob,urls.current));setStatus(`拼贴已导出为${expected.width}×${expected.height} PNG，点击下载保存。`);
  }catch(error){if(token===revision.current)setStatus(error instanceof Error?error.message:"导出失败，请重试。");}
  finally{if(canvas)canvas.width=canvas.height=0;if(token===revision.current)setExporting(false);}
 }
 const dimensions=sizes[size];
 return <main className={styles.shell}>
  <nav className={styles.nav}><a className={styles.brand} href="/">生活小助手</a><a className={styles.back} href="/#daily-tools">← 回到新发现</a></nav>
  <p className={styles.eyebrow}>把照片放在一起 / 浏览器小工具</p><h1 className={styles.title}>几张好照片，拼成一段小故事</h1><p className={styles.intro}>先自动排整齐，再自由拖动、缩放。给旅行、生活和小店做一张简单拼贴。</p><p className={styles.privacy}>只用你选择的本机照片，不上传、不调用API</p>
  <div className={local.grid}><section className={styles.panel}><h2>1. 选照片，定画布</h2><label className={styles.field}>选择2–6张自己的JPG或PNG<input id="collage-files" type="file" multiple accept="image/jpeg,image/png" className={styles.file} disabled={!ready||exporting} onChange={event=>choose(Array.from(event.target.files||[]))}/><span className={styles.hint}>单个≤10MiB、合计≤30MiB；单张≤800万像素、合计≤2000万像素。只做静态拼贴，不支持GIF、SVG或动态效果。</span></label>
   <label className={styles.field}>画布尺寸<select id="collage-size" className={styles.select} value={size} onChange={event=>{invalidate();setSize(event.target.value);setStatus("画布尺寸已改变，照片按新尺寸重新整齐排布。");}}><option value="square">方形 · 1000×1000</option><option value="wide">横向 · 1600×900</option><option value="portrait">竖向 · 900×1600</option><option value="large">大方形 · 2000×2000</option></select><span className={styles.hint}>切换尺寸会重新排布，最多输出400万像素。</span></label>
   <label className={styles.field}>背景颜色<input id="collage-background" type="color" className={styles.colorInput} value={background} disabled={transparent} onChange={event=>{invalidate();setBackground(event.target.value);}}/></label><label className={styles.check}><input id="collage-transparent" type="checkbox" checked={transparent} onChange={event=>{invalidate();setTransparent(event.target.checked);}}/>透明背景PNG</label>
   {!!photos.length&&<><label className={styles.field}>当前照片<select id="collage-selected" className={styles.select} value={selected} onChange={event=>selection(Number(event.target.value))}><option value={-1} disabled>点击画布照片或从这里选择</option>{photos.map((photo,index)=><option key={index} value={index}>{index+1}. {photo.name}</option>)}</select></label><label className={styles.field}>选中照片缩放 · {zoom}%<input id="collage-scale" type="range" min={40} max={200} step={1} value={zoom} disabled={selected<0} onChange={event=>scalePhoto(Number(event.target.value))}/></label><button id="collage-reset" className={`${styles.secondary} ${styles.full}`} onClick={()=>{invalidate();setReset(value=>value+1);setStatus("照片已重新排整齐。");}}>重新排整齐</button></>}
   <p role="status" aria-live="polite" className={styles.status}>{ready?status:status.includes("失败")?status:"正在准备本地拼贴工具…"}</p>
  </section><section className={styles.panel}><h2>2. 拖动照片，导出拼贴</h2><p className={styles.hint}>点一下照片会出现虚线选框；拖动改变位置，滑杆调整大小。叠放按初始照片顺序，后面的照片在上层。选框不会导出。</p><div id="collage-workspace" className={local.workspace} style={{marginTop:18}}><div id="collage-stage" ref={host}/>{photos.length<2&&<div className={styles.empty}>{loading?"正在读取照片…":"选择照片后，交互画布会出现在这里。"}</div>}</div><p className={styles.info}>{dimensions.width}×{dimensions.height}像素 · 画布外的部分会裁掉</p><button id="collage-export" className={`${styles.primary} ${styles.full}`} style={{marginTop:20}} disabled={photos.length<2||loading||exporting} onClick={exportPng}>{exporting?"正在导出…":"生成拼贴PNG"}</button>{output&&<div className={styles.buttons}><a id="collage-download" className={styles.primary} href={output} download="生活小助手_照片拼贴.png">↓ 下载拼贴PNG</a></div>}</section></div>
  <footer className={styles.footer}>请使用自有或获授权的照片。本工具是简单拼贴，不是完整PS：没有文字贴纸、抠图、换脸、修图、自动保存或项目文件。导出清晰度受原图与放大比例影响，低内存设备请先缩小照片。透明部分以棋盘格预览，导出保留透明；关闭或刷新页面会丢失未下载编辑。<details className={styles.source}><summary>开源来源与使用说明</summary><p>中文拼贴壳由平台编写，交互画布使用<a href="https://github.com/konvajs/konva" target="_blank" rel="noopener noreferrer">Konva 9.3.18</a>（MIT，含KineticJS原作署名），不是完整上游应用。<a href="/vendor/konva/LICENSE.txt">查看原许可</a>。</p></details></footer>
 </main>;
}
