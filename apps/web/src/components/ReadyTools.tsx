"use client";

import type { ComponentCatalog } from "@/lib/component-types";
import { acceptedTool } from "@/lib/usable-tools";
import styles from "./ReadyTools.module.css";

export default function ReadyTools({ catalog, moduleId, query = "", error, retry }: { catalog: ComponentCatalog | null; moduleId?: string; query?: string; error?: string; retry?: () => void }) {
  const matches = (item: ComponentCatalog["items"][number]) => (!moduleId || item.module_ids.includes(moduleId)) && `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase());
  const ready = (catalog?.items || []).filter(item => item.kind === "tool" && acceptedTool(item.tool_key)?.path === item.path && matches(item)).sort((a,b)=>a.sort_order-b.sort_order || a.id.localeCompare(b.id));
  const custom = (catalog?.items || []).filter(item => item.id.startsWith("CUSTOM-") && item.kind === "candidate" && matches(item));
  return <section className={styles.section} aria-label="可以直接使用的小工具">
    <div className={styles.heading}><div><p className={styles.eyebrow}>不用安装，打开就能做</p><h2>现在就能用</h2></div><a href="/discover">看看新发现 ↗</a></div>
    {!catalog ? <p role="status">{error || "正在读取工具目录…"}{error && <button type="button" className={styles.retry} onClick={retry}>重新读取</button>}</p> : <>
      <p className={styles.intro}>照片、文字和文件都在当前浏览器处理。选一个小工具，先把眼前的事做好。</p>
      {ready.length ? <div className={styles.grid}>{ready.map(item => <article className={styles.card} key={item.id} data-component-id={item.id}><span className={styles.tag}>可直接使用</span><h3>{item.title}</h3><p>{item.description}</p><a className={styles.open} href={acceptedTool(item.tool_key)!.path}>打开工具 <span aria-hidden>↗</span></a></article>)}</div> : <p className={styles.empty}>这个分类暂时没有符合当前搜索的已接入工具。</p>}
      {error && <p role="status">目录更新失败，当前显示上次读取的内容。<button className={styles.retry} onClick={retry}>重试</button></p>}
      {custom.length > 0 && <div className={styles.custom}><h3>站长添加的待接入组件</h3><div className={styles.grid}>{custom.map(item=><article className={styles.card} data-component-id={item.id} key={item.id}><span className={styles.pending}>尚未接入</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div>}
    </>}
  </section>;
}
