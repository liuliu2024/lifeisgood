"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import styles from '../avatar/tool.module.css';
type Row={startSeconds:number;endSeconds:number;rms:number;hz:number|null;clarity:number|null;note:string|null;reason:string};
type Result={schema:number;sampleRate:number;channels:number;frames:number;durationSeconds:number;windowFrames:number;rows:Row[]};
const reasons:Record<string,string>={silence:'静音或音量太小',unstable:'无法稳定识别', 'out-of-range':'超出80–1200Hz',ok:'近似单音'};
export default function PitchCheck(){
 const [busy,B]=useState(false),[message,M]=useState('选一段自己的短单音WAV，看看大约是什么音。'),[result,R]=useState<Result|null>(null),[links,L]=useState<string[]>([]);
 const worker=useRef<Worker|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),round=useRef(0),urls=useRef<string[]>([]),live=useRef(true);
 function release(){urls.current.splice(0).forEach(URL.revokeObjectURL);}
 function cancelWork(){round.current++;worker.current?.terminate();worker.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;}
 function clear(){release();R(null);L([]);}
 useEffect(()=>{live.current=true;return()=>{live.current=false;cancelWork();release();};},[]);
 async function choose(file?:File){cancelWork();clear();B(false);if(!file){M('没有选择文件。');return;}if(file.size<44||file.size>1048576){M('文件须为44字节至1MiB，且不超过5秒的PCM16 WAV。');return;}const id=round.current;B(true);M('正在本机分析，最多等待3秒…');
 timer.current=setTimeout(()=>{if(live.current&&round.current===id){cancelWork();clear();B(false);M('分析超过3秒，已终止；可换文件重试。');}},3000);
 try{const buffer=await file.arrayBuffer();if(!live.current||round.current!==id)return;const w=new Worker('/vendor/pitchy/pitch-worker.js',{type:'module'});worker.current=w;
 w.onerror=e=>{e.preventDefault();if(live.current&&round.current===id){cancelWork();clear();B(false);M('音高组件加载失败，请换文件或刷新重试。');}};
 w.onmessage=e=>{if(!live.current||round.current!==id)return;cancelWork();try{if(!e.data.ok)throw Error(e.data.error||'分析失败。');const data=e.data.result as Result;if(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>20)throw Error('分析结果无效。');
 const json=JSON.stringify(data,null,2);const csv='\ufeff'+['开始秒,结束秒,RMS,Hz,clarity,近似音名,结果',...data.rows.map(x=>[x.startSeconds,x.endSeconds,x.rms,x.hz??'',x.clarity??'',x.note??'',reasons[x.reason]||'无法识别'].join(','))].join('\r\n');if(new Blob([json,csv]).size>32768)throw Error('报告超过32KiB，已拒绝。');
 const a=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));urls.current.push(a);const b=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));urls.current.push(b);R(data);L([a,b]);M(`已检查${data.rows.length}个抽样窗，${data.rows.filter(x=>x.reason==='ok').length}个得到近似单音。`);
 }catch(e){clear();M(e instanceof Error?e.message:'报告生成失败，请重试。');}finally{B(false);}};w.postMessage(buffer,[buffer]);
 }catch{if(live.current&&round.current===id){cancelWork();clear();B(false);M('读取文件失败，请重新选择标准WAV。');}}
 }
 return <main className={styles.shell}><nav className={styles.nav}><Link className={styles.brand} href='/'>生活小助手</Link><Link className={styles.back} href='/#daily-tools'>← 回到新发现</Link></nav><p className={styles.eyebrow}>听见一点乐趣 / 本机小工具</p><h1 className={styles.title}>看看这段单音大约多高</h1><p className={styles.intro}>选择自己的短单音WAV，估算频率和接近的音名。不会录音或自动播放。</p><p className={styles.privacy}>文件只在当前浏览器处理，不上传；下载报告不含文件名或声音。</p><section className={styles.panel}><label className={styles.field}>选择PCM16 WAV<input id='pitch-file' type='file' accept='.wav,audio/wav' onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value='';void choose(f);}}/></label><button id='pitch-cancel' className={styles.secondary} disabled={!busy} onClick={()=>{cancelWork();clear();B(false);M('已取消，旧结果已清除。');}}>取消分析</button><p role='status' aria-live='polite'>{message}</p></section>{result&&<section id='pitch-result' className={styles.panel}><h2>抽样结果</h2><p>{result.sampleRate}Hz · {result.channels}声道 · {result.durationSeconds.toFixed(3)}秒</p><div className={styles.buttons}><a id='pitch-json' className={styles.primary} href={links[0]} download='单音估算.json'>保存JSON</a><a id='pitch-csv' className={styles.secondary} href={links[1]} download='单音估算.csv'>保存CSV</a></div><ol style={{paddingLeft:'1.2rem',overflowWrap:'anywhere'}}>{result.rows.map((x,i)=><li key={i} style={{marginTop:'1rem'}}>{x.startSeconds.toFixed(3)}–{x.endSeconds.toFixed(3)}秒：{x.hz===null?'—':`${x.hz.toFixed(2)}Hz`}{x.note?` · ${x.note}`:''}<br/>{reasons[x.reason]||'无法稳定识别'}{x.clarity!==null?`；clarity ${x.clarity.toFixed(3)}（不是概率）`:''}</li>)}</ol></section>}<footer className={styles.footer}><p>仅PCM16 WAV、单/双声道8–48kHz、至少4096帧、最多5秒/1MiB。双声道取平均，反相可能抵消；最多20个4096帧抽样窗，非整段音高曲线。80–1200Hz、A4=440Hz十二平均律近似，噪声、复调或泛音可能误判，不用于专业校准、医疗或身份判断。</p><details className={styles.source}><summary>开源来源与范围</summary><p>Pitchy4.1.0与FFT.js4.0.4原MIT及原件保留，平台只做有限WAV预检、中文报告与音名换算；不是完整录音或调音应用。<a href='/vendor/pitchy/SOURCE.md'>固定来源与许可</a></p></details></footer></main>;
}
