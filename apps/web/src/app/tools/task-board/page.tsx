"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import common from "../avatar/tool.module.css";
import styles from "./task-board.module.css";

type Column = "plan" | "doing" | "done";
type Card = { id: string; text: string };
type Board = Record<Column, Card[]>;
type SortEvent = { item: HTMLElement; from: HTMLElement; to: HTMLElement; newDraggableIndex?: number };
type SortableInstance = { destroy(): void };
type SortableLibrary = { version: string; create(element: HTMLElement, options: Record<string, unknown>): SortableInstance };
const columns: [Column, string][] = [["plan", "计划"], ["doing", "进行"], ["done", "完成"]];
const initial = (): Board => ({ plan: [{ id: "task-1", text: "整理今天想做的事" }, { id: "task-2", text: "给自己留一点空闲" }], doing: [{ id: "task-3", text: "试着移动这张卡片" }], done: [] });
const limits = ["本机临时任务板，刷新、关闭或离开页面不会保存；请主动导出记录。", "最多50张卡片，每张1–120字符；仅纯文字，不导入文件、账户或云端协作。", "拖住卡片左侧把手排序；也可用卡片里的按钮移动。手机实际设备与所有辅助技术尚未逐一验证。"];

export default function TaskBoardTool() {
  const [board, setBoard] = useState<Board>(initial), current = useRef<Board>(board);
  const [text, setText] = useState(""), [destination, setDestination] = useState<Column>("plan");
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("本地拖动组件准备中…"), [output, setOutput] = useState<{ json: string; txt: string } | null>(null);
  const lists = useRef<Partial<Record<Column, HTMLUListElement>>>({}), instances = useRef<SortableInstance[]>([]), urls = useRef<string[]>([]);
  const nextId = useRef(4), dragging = useRef(false), snapshots = useRef<HTMLElement[][]>([]);
  const total = columns.reduce((sum, [key]) => sum + board[key].length, 0);
  function clearOutput() { urls.current.splice(0).forEach(url => URL.revokeObjectURL(url)); setOutput(null); }
  function update(value: Board, message: string) { clearOutput(); current.current = value; setBoard(value); setStatus(message); }
  function restoreDOM() { columns.forEach(([key], index) => snapshots.current[index]?.forEach(node => lists.current[key]?.appendChild(node))); snapshots.current = []; }
  useEffect(() => {
    let live = true, settled = false;
    const script = document.createElement("script"); script.src = "/vendor/sortable/Sortable.min.js"; script.async = true;
    setReady(false); setFailed(false);
    const fail = () => { if (!live || settled) return; settled = true; instances.current.splice(0).forEach(instance => instance.destroy()); setReady(false); setFailed(true); setStatus("本地拖动组件加载失败。卡片未丢失，请点击重新加载；当前仍可保存记录。"); };
    const clock = window.setTimeout(fail, 8000);
    script.onerror = fail;
    script.onload = () => {
      if (!live || settled) return;
      const library = (window as Window & { Sortable?: SortableLibrary }).Sortable;
      if (library?.version !== "1.15.6" || typeof library.create !== "function") { fail(); return; }
      try {
        columns.forEach(([key]) => {
          const list = lists.current[key]; if (!list) throw Error("missing task list");
          instances.current.push(library.create(list, {
            group: "life-task-board", animation: 120, handle: ".task-board-handle", draggable: "[data-card-id]", ghostClass: styles.ghost,
            onStart: () => { dragging.current = true; snapshots.current = columns.map(([column]) => Array.from(lists.current[column]?.children ?? []).filter((node): node is HTMLElement => node instanceof HTMLElement && !!node.dataset.cardId)); },
            onEnd: (event: SortEvent) => {
              const id = event.item.dataset.cardId, from = event.from.dataset.column as Column, to = event.to.dataset.column as Column;
              const index = event.newDraggableIndex;
              // Sortable temporarily changes the DOM. Restore React's original tree before setting the next board.
              restoreDOM(); dragging.current = false;
              if (!id || !columns.some(([key]) => key === from) || !columns.some(([key]) => key === to) || !Number.isInteger(index) || index! < 0) { setStatus("此次拖动未生效，原卡片已保留。"); return; }
              const before = current.current, card = before[from].find(card => card.id === id); if (!card) { setStatus("卡片状态已变化，此次移动未接受。"); return; }
              const after: Board = { plan: [...before.plan], doing: [...before.doing], done: [...before.done] };
              after[from] = after[from].filter(card => card.id !== id); after[to].splice(Math.min(index!, after[to].length), 0, card);
              update(after, "卡片已移动。之前的导出已清除，请保存最新记录。");
            },
          }));
        });
        settled = true; clearTimeout(clock); setReady(true); setStatus("拖动把手或使用移动按钮，安排自己的节奏。");
      } catch { fail(); }
    };
    document.body.appendChild(script);
    return () => { live = false; clearTimeout(clock); if (dragging.current) restoreDOM(); dragging.current = false; instances.current.splice(0).forEach(instance => instance.destroy()); script.remove(); urls.current.splice(0).forEach(url => URL.revokeObjectURL(url)); };
  }, [attempt]);
  function add() {
    if (dragging.current) return;
    clearOutput(); const value = text.trim();
    if (!value || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)) { setStatus("卡片请填写1–120字符的单行文字，不接受控制字符。"); return; }
    if (columns.reduce((n, [key]) => n + current.current[key].length, 0) >= 50) { setStatus("最多50张卡片，请先删除不需要的卡片。"); return; }
    update({ ...current.current, [destination]: [...current.current[destination], { id: `task-${nextId.current++}`, text: value }] }, "新卡片已加入，可以拖动排序。"); setText("");
  }
  function move(from: Column, id: string, to: Column, offset?: number) {
    if (dragging.current) return;
    const before = current.current, index = before[from].findIndex(card => card.id === id); if (index < 0) return;
    const after: Board = { plan: [...before.plan], doing: [...before.doing], done: [...before.done] }, [card] = after[from].splice(index, 1);
    after[to].splice(offset === undefined ? after[to].length : Math.max(0, Math.min(index + offset, after[to].length)), 0, card); update(after, "卡片已移动，请保存最新记录。");
  }
  function remove(column: Column, id: string) { if (!dragging.current) update({ ...current.current, [column]: current.current[column].filter(card => card.id !== id) }, "卡片已删除，请保存最新记录。"); }
  function save() {
    if (dragging.current) return; clearOutput();
    try {
      const data = { schemaVersion: 1, library: "SortableJS 1.15.6", columns: columns.map(([key, label]) => ({ key, label, cards: current.current[key] })), limitations: limits };
      const json = JSON.stringify(data, null, 2), txt = ["生活小助手 · 临时任务板", ...data.columns.flatMap(column => ["", `【${column.label}】`, ...column.cards.map((card, index) => `${index + 1}. ${card.text} (${card.id})`)]), "", ...limits].join("\n") + "\n";
      if (new Blob([json]).size > 128 * 1024 || new Blob([txt]).size > 128 * 1024) throw Error("export too large");
      const jsonURL = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8" })); urls.current.push(jsonURL);
      const txtURL = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" })); urls.current.push(txtURL);
      setOutput({ json: jsonURL, txt: txtURL }); setStatus("最新记录已生成，请点击保存JSON或TXT。刷新前记得下载。");
    } catch { clearOutput(); setStatus("导出失败，卡片仍保留在页面中，请重试保存。"); }
  }
  return <main className={common.shell}>
    <nav className={common.nav}><a className={common.brand} href="/">生活小助手</a><Link className={common.back} href="/#daily-tools">← 回到新发现</Link></nav>
    <p className={common.eyebrow}>把日子理出一点头绪 / 本机小工具</p><h1 className={common.title}>一张卡片，一件小事</h1><p className={common.intro}>把待办放进计划、进行和完成。拖住把手排序，也能用按钮一步步移动。</p><p className={common.privacy}>文字仅留在当前页面，不上传；刷新或离开即清除，请主动保存。</p>
    <section className={`${common.panel} ${styles.inputPanel}`}><h2>添一件想做的事 <small>（{total}/50）</small></h2><div className={styles.addRow}><label className={common.field}>卡片文字<input id="task-board-text" className={common.input} value={text} placeholder="例如：给家人打个电话" onChange={event => { if (dragging.current) return; clearOutput(); if (event.target.value.length > 120) { setStatus("最多120字符，本次修改未接受，原文字保留。"); return; } setText(event.target.value); }}/></label><label className={common.field}>放到哪一列<select id="task-board-column" className={common.select} value={destination} onChange={event => { clearOutput(); setDestination(event.target.value as Column); }}>{columns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button id="task-board-add" className={common.primary} onClick={add}>＋ 添加卡片</button></div><p role="status" aria-live="polite" className={common.status}>{status}</p>{failed && <button id="task-board-retry" className={common.secondary} onClick={() => { clearOutput(); setStatus("本地拖动组件重新加载中…"); setAttempt(n => n + 1); }}>重新加载拖动组件</button>}</section>
    <div id="task-board-columns" className={styles.columns} data-ready={ready}>
      {columns.map(([key, label]) => <section key={key} className={`${common.panel} ${styles.column}`}><h2>{label}<small> {board[key].length}</small></h2><ul data-column={key} id={`task-board-${key}`} className={styles.list} ref={element => { if (element) lists.current[key] = element; }} aria-label={`${label}卡片`}>
        {board[key].map((card, index) => <li key={card.id} data-card-id={card.id} className={styles.card}><div className={styles.cardTop}><span className={`task-board-handle ${styles.handle}`} aria-hidden="true" title="拖住这里移动">⠿</span><span className={styles.cardText}>{card.text}</span></div><div className={styles.actions}><button type="button" disabled={index === 0} onClick={() => move(key, card.id, key, -1)} aria-label={`${card.text}上移`}>↑ 上移</button><button type="button" disabled={index === board[key].length - 1} onClick={() => move(key, card.id, key, 1)} aria-label={`${card.text}下移`}>↓ 下移</button>{columns.filter(([to]) => to !== key).map(([to, name]) => <button type="button" key={to} onClick={() => move(key, card.id, to)} aria-label={`将${card.text}移到${name}`}>到{name}</button>)}<button type="button" onClick={() => remove(key, card.id)} aria-label={`删除${card.text}`}>删除</button></div></li>)}
      </ul>{!board[key].length && <p className={styles.empty}>这一列暂时空着，拖一张卡片过来。</p>}</section>)}
    </div>
    <section className={`${common.panel} ${styles.export}`}><h2>带走今天的安排</h2><div className={common.buttons}><button id="task-board-save" className={common.primary} onClick={save}>生成最新记录</button>{output && <><a id="task-board-json" className={common.secondary} href={output.json} download="我的任务板.json">↓ 保存JSON</a><a id="task-board-txt" className={common.secondary} href={output.txt} download="我的任务板.txt">↓ 保存TXT</a></>}</div></section>
    <footer className={common.footer}>{limits.map(limit => <p key={limit}>{limit}</p>)}<details className={common.source}><summary>开源来源与范围</summary><p>中文任务板由平台编写，实际拖动使用<a href="https://github.com/SortableJS/Sortable">SortableJS 1.15.6</a>。原MIT及内联Babel辅助代码MIT声明保留；不是完整项目管理系统。<a href="/vendor/sortable/SOURCE.md">固定版本、原许可和接入说明</a>。</p></details></footer>
  </main>;
}
