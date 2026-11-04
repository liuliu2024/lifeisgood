"use client";

import { useState } from "react";
import { projectIntegrationNotes } from "@/lib/project-integration-notes";
import { dailyProjectsCore } from "@/lib/daily-projects-core";
import { dailyProjectsExtra } from "@/lib/daily-projects-extra";
import { acceptedTool, toolRuntimeSources } from "@/lib/usable-tools";
import { useComponentCatalog } from "@/lib/use-component-catalog";
import styles from "@/components/ReadyTools.module.css";

export default function Discover() {
  const {catalog,error,refresh}=useComponentCatalog();
  const [query,setQuery]=useState("");const [scene,setScene]=useState("all");const [state,setState]=useState("all");
  const projects=[...dailyProjectsCore,...dailyProjectsExtra].flatMap(project=>{const item=catalog?.items.find(x=>x.id===project.id);return item?[{...project,title:item.title,description:item.description,item,ready:item.kind==="tool"&&acceptedTool(item.tool_key)?.path===item.path}]:[];});
  const visible=projects.filter(p=>(scene==="all"||p.item.module_ids.includes(scene))&&(state==="all"||(state==="ready"?p.ready:!p.ready))&&`${p.title} ${p.description} ${p.repo}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>a.item.sort_order-b.item.sort_order);
  const readyCount=new Set(projects.filter(p=>p.ready).map(p=>p.item.tool_key)).size;
  return <main className={styles.shell}><nav className={styles.nav}><a href="/">生活小助手</a><a href="/">← 返回首页</a></nav><p className={styles.eyebrow}>日常，也可以有点新花样</p><h1 className={styles.title}>从一个小工具，发现新可能</h1><p className={styles.lead}>挑几个有趣、实用的开源项目，变成顺手的中文小工具。只有标为“可直接使用”的项目已经接通；研究记录保留来源与限制，等逐项试配。</p>
    <div className={styles.filters}><label>想找什么<input aria-label="搜索新发现" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="头像、配色、照片、笔记…" /></label><label>用途<select aria-label="用途" value={scene} onChange={e=>setScene(e.target.value)}><option value="all">全部用途</option><option value="life">生活</option><option value="creative">创意</option><option value="work">工作</option></select></label><label>状态<select aria-label="状态" value={state} onChange={e=>setState(e.target.value)}><option value="all">全部状态</option><option value="ready">可直接使用</option><option value="research">待试配</option></select></label></div>
    {!catalog?<p role="status">{error||"正在读取工具目录…"}{error&&<button onClick={()=>void refresh()}>重新读取</button>}</p>:<><p className={styles.counter}>{readyCount} 个项目已接通 · {projects.length-readyCount} 个研究记录 · 当前显示 {visible.length} 项</p><div className={styles.grid}>{visible.map(p=><article className={styles.card} key={p.id} data-project-id={p.id}><span className={p.ready?styles.tag:styles.pending}>{p.ready?"可直接使用":projectIntegrationNotes[p.id]?.label||"待试配"}</span><h2 style={{fontSize:18,margin:"16px 0 10px"}}>{p.title}</h2><p>{p.description}</p><p className={styles.meta}>{p.stars===null?(p.repo.includes("github.com/")?"GitHub Star未知":"非GitHub来源 · Star不适用"):`GitHub ★ ${p.stars.toLocaleString("en-US")}`} · 快照 {new Date(p.checkedAt).toLocaleDateString("zh-CN",{timeZone:"Asia/Shanghai"})}</p><p className={styles.meta}>中文：{p.chinese}</p><details className={styles.details}><summary>来源与使用范围</summary>{projectIntegrationNotes[p.id] && <p>{projectIntegrationNotes[p.id].detail}</p>}<p>研究源码许可：{p.license}；具体依赖和素材另核。</p>{p.ready && toolRuntimeSources[p.item.tool_key || ""] && <p>已接入制品：{toolRuntimeSources[p.item.tool_key || ""].version} · {toolRuntimeSources[p.item.tool_key || ""].license}。<a href={toolRuntimeSources[p.item.tool_key || ""].source}>制品固定来源与范围</a>{toolRuntimeSources[p.item.tool_key || ""].scope && <span> 当前接入范围：{toolRuntimeSources[p.item.tool_key || ""].scope}</span>}</p>}<p>{p.maintenance}</p><p>源码研究固定版本：<code>{p.commit.slice(0,12)}</code>。已接通工具的实际制品见各工具页的来源说明，可能与研究HEAD不同。</p><ul>{p.limitations.map(s=><li key={s}>{s}</li>)}</ul><a href={p.repo} target="_blank" rel="noopener noreferrer">查看开源项目 ↗</a>{p.licenseUrl&&<p><a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">固定源码许可</a></p>}</details>{p.ready?<a className={styles.open} href={acceptedTool(p.item.tool_key)!.path}>打开工具 ↗</a>:<span className={styles.meta}>尚未接入，不接收文件或调用服务。</span>}</article>)}</div>{visible.length===0&&<p className={styles.empty}>没有找到符合筛选的项目，换个关键词试试。</p>}</>}
    <p className={styles.notice}>上游项目与中文操作页面分开记录。开源库接入后提供的是本平台封装的限定功能，Stars只代表关注度；不代表全部功能、许可或稳定性已验收。</p>
  </main>;
}
