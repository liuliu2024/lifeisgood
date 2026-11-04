"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ComponentCatalog, ComponentCatalogItem, ComponentInput, ComponentToolOption } from "@/lib/component-types";
import styles from "./ComponentManager.module.css";

type Draft = {
  id: string | null;
  title: string;
  description: string;
  module_ids: string[];
  sort_order: string;
  hidden: boolean;
  archived: boolean;
  kind: "tool" | "candidate";
  tool_key: string;
};

class CatalogError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function catalogRequest(method = "GET", itemId?: string, body?: object, signal?: AbortSignal): Promise<ComponentCatalog> {
  const url = "/api/foundation/admin/components" + (itemId ? `/${encodeURIComponent(itemId)}` : "");
  const response = await fetch(url, {
    method, credentials: "same-origin", cache: "no-store", signal: signal ?? AbortSignal.timeout(15000),
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let message = "操作未完成，请稍后重试。";
    if (response.status === 401) message = "登录状态已失效，请重新登录站长账号。";
    else if (response.status === 403) message = "当前账号没有组件管理权限，请使用站长账号。";
    else if (response.status === 409) message = "组件列表已被其他窗口更新。你的编辑仍然保留，请先重新读取列表并核对，再保存。";
    else if (response.status === 404) message = "这个组件已不存在，请重新读取列表。";
    else if (response.status === 422) message = "组件信息未通过校验，请检查名称、模块、工具与排序。";
    throw new CatalogError(message, response.status);
  }
  const result = await response.json();
  if (!Number.isInteger(result?.revision) || result.revision < 0 || !Array.isArray(result.modules) || !Array.isArray(result.items)) {
    throw new Error("组件列表格式异常，请重新读取。 ");
  }
  return result as ComponentCatalog;
}

function inputFrom(item: ComponentCatalogItem, revision: number): ComponentInput {
  return {
    expected_revision: revision, title: item.title, description: item.description,
    module_ids: [...item.module_ids], sort_order: item.sort_order,
    hidden: Boolean(item.hidden), archived: Boolean(item.archived), kind: item.kind,
    ...(item.kind === "tool" && item.tool_key ? { tool_key: item.tool_key } : {}),
  };
}

export default function ComponentManager({ onChanged }: { onChanged?: () => void }) {
  const [catalog, setCatalog] = useState<ComponentCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [moduleId, setModuleId] = useState("__all__");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const busyRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    catalogRequest("GET", undefined, undefined, controller.signal)
      .then(value => { if (mounted.current) { setCatalog(value); setAccessDenied(false); } })
      .catch(reason => {
        if (!controller.signal.aborted && mounted.current) {
          setError(reason instanceof Error ? reason.message : "组件列表读取失败，请重试。");
          setAccessDenied(reason instanceof CatalogError && [401, 403].includes(reason.status));
        }
      })
      .finally(() => { if (!controller.signal.aborted && mounted.current) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, []);

  const editorKey = draft ? draft.id ?? "new" : "closed";
  useEffect(() => { if (draft) titleRef.current?.focus(); }, [editorKey]); // Keep focus while typing.

  const tools = useMemo(() => {
    const options = new Map<string, ComponentToolOption>();
    for (const option of catalog?.tool_options ?? []) options.set(option.key, option);
    if (!catalog?.tool_options) {
      for (const item of catalog?.items ?? []) {
        if (item.kind === "tool" && item.tool_key && item.path) options.set(item.tool_key, { key: item.tool_key, title: item.title, path: item.path });
      }
    }
    return [...options.values()];
  }, [catalog]);
  const moduleNames = useMemo(() => new Map((catalog?.modules ?? []).map(item => [item.id, item.title])), [catalog]);
  const visible = useMemo(() => (catalog?.items ?? []).filter(item =>
    (showArchived || !item.archived) &&
    (moduleId === "__all__" || item.module_ids.includes(moduleId)) &&
    `${item.title} ${item.description} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "zh-CN")), [catalog, moduleId, query, showArchived]);
  const counts = {
    visible: catalog?.items.filter(item => !item.archived && !item.hidden).length ?? 0,
    hidden: catalog?.items.filter(item => !item.archived && item.hidden).length ?? 0,
    archived: catalog?.items.filter(item => item.archived).length ?? 0,
  };

  async function reload() {
    if (busyRef.current) return;
    busyRef.current = true; setLoading(true); setError(""); setMessage("");
    try {
      const value = await catalogRequest();
      if (!mounted.current) return;
      setCatalog(value); setConflict(false); setAccessDenied(false);
      setMessage(draft ? "列表已更新，你的表单仍然保留。请核对最新列表，再决定是否保存。" : "组件列表已更新。");
    } catch (reason) {
      if (mounted.current) { setError(reason instanceof Error ? reason.message : "读取失败，请重试。"); setAccessDenied(reason instanceof CatalogError && [401, 403].includes(reason.status)); }
    } finally { busyRef.current = false; if (mounted.current) setLoading(false); }
  }

  async function mutate(method: "POST" | "PUT" | "DELETE", id: string | undefined, payload: object, success: string, closeEditor = false) {
    if (busyRef.current || conflict || !catalog) return;
    busyRef.current = true; setPending(id ?? "new"); setError(""); setMessage("");
    try {
      const value = await catalogRequest(method, id, payload);
      if (!mounted.current) return;
      setCatalog(value); setConflict(false); setMessage(success);
      if (closeEditor) setDraft(null);
      // A successful server mutation stays successful even if the parent's refresh fails.
      try { onChanged?.(); } catch { setMessage(`${success} 前台列表刷新失败，可重新打开页面查看。`); }
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "操作未完成，请重试。");
        if (reason instanceof CatalogError && reason.status === 409) setConflict(true);
        if (reason instanceof CatalogError && [401, 403].includes(reason.status)) setAccessDenied(true);
      }
    } finally { busyRef.current = false; if (mounted.current) setPending(""); }
  }

  function startNew() {
    setDraft({ id: null, title: "", description: "", module_ids: moduleId === "__all__" ? [] : [moduleId], sort_order: "100", hidden: false, archived: false, kind: "candidate", tool_key: "" });
    setMessage(""); setError("");
  }
  function edit(item: ComponentCatalogItem) {
    setDraft({ id: item.id, title: item.title, description: item.description, module_ids: [...item.module_ids], sort_order: String(item.sort_order), hidden: Boolean(item.hidden), archived: Boolean(item.archived), kind: item.kind, tool_key: item.tool_key ?? "" });
    setMessage(""); setError("");
  }
  function updateDraft(update: Partial<Draft>) { setDraft(current => current ? { ...current, ...update } : current); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !catalog || pending || conflict) return;
    const title = draft.title.trim();
    if (!title) { setError("请填写组件名称。"); titleRef.current?.focus(); return; }
    if (!draft.module_ids.length) { setError("请至少选择一个展示模块。"); return; }
    const sort = Number(draft.sort_order);
    if (!draft.sort_order.trim() || !Number.isInteger(sort) || sort < 0 || sort > 10000) { setError("排序请填写0到10000之间的整数。"); return; }
    if (draft.kind === "tool" && !tools.some(option => option.key === draft.tool_key)) { setError("请选择一个已接入的工具。"); return; }
    const body: ComponentInput = {
      expected_revision: catalog.revision, title, description: draft.description.trim(),
      module_ids: [...draft.module_ids], sort_order: sort, hidden: draft.hidden, kind: draft.kind,
      ...(draft.kind === "tool" ? { tool_key: draft.tool_key } : {}),
      ...(draft.id ? { archived: draft.archived } : {}),
    };
    void mutate(draft.id ? "PUT" : "POST", draft.id ?? undefined, body, draft.id ? "组件已保存，前台展示已更新。" : "组件已添加，前台展示已更新。", true);
  }
  const blocked = loading || Boolean(pending) || conflict || accessDenied;
  const actionBlocked = blocked || Boolean(draft);

  return <section className={styles.manager} aria-labelledby="component-manager-heading" data-testid="component-manager">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>网站内容管理</p><h2 id="component-manager-heading">模块与组件管理</h2><p>决定每个模块展示哪些组件。移除后可以恢复，不会卸载工具或删除用户文件。</p></div>
      <button type="button" className={styles.primary} onClick={startNew} disabled={actionBlocked || !catalog}>添加组件</button>
    </div>
    <div className={styles.stats} aria-label="组件状态统计"><span>展示中 <strong>{counts.visible}</strong></span><span>已隐藏 <strong>{counts.hidden}</strong></span><span>已移除 <strong>{counts.archived}</strong></span></div>
    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p>{conflict && <p>编辑内容没有被替换。重新读取后，请对照最新列表核对。</p>}</div>}
    <div className={styles.toolbar}>
      <label>展示模块<select aria-label="展示模块" value={moduleId} onChange={event => setModuleId(event.target.value)} disabled={!catalog || Boolean(pending)}><option value="__all__">全部模块</option>{catalog?.modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
      <label className={styles.search}>查找组件<input type="search" placeholder="输入名称、用途或编号" value={query} onChange={event => setQuery(event.target.value)} disabled={!catalog} /></label>
      <button type="button" className={styles.secondary} onClick={() => void reload()} disabled={loading || Boolean(pending)}>{loading ? "正在读取…" : draft ? "重新读取列表（保留表单）" : "重新读取列表"}</button>
      <label className={styles.checkbox}><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />显示已移除</label>
    </div>
    {draft && !accessDenied && <form className={styles.editor} onSubmit={save} aria-labelledby="component-editor-heading" aria-describedby={error ? "component-editor-help" : undefined}>
      <div className={styles.editorHeading}><h3 id="component-editor-heading">{draft.id ? "编辑组件" : "添加组件"}</h3><button type="button" className={styles.textButton} onClick={() => setDraft(null)} disabled={Boolean(pending)}>取消编辑</button></div>
      <div className={styles.editorGrid}>
        <label>组件名称<input ref={titleRef} name="component_title" value={draft.title} onChange={event => updateDraft({ title: event.target.value })} maxLength={80} required disabled={Boolean(pending)} /></label>
        <label>展示顺序<input name="component_sort" type="number" min={0} max={10000} step={1} value={draft.sort_order} onChange={event => updateDraft({ sort_order: event.target.value })} required disabled={Boolean(pending)} /><small>数值越小越靠前。</small></label>
        <label className={styles.wide}>用途说明<textarea name="component_description" rows={3} value={draft.description} onChange={event => updateDraft({ description: event.target.value })} maxLength={500} disabled={Boolean(pending)} /></label>
        <label>组件类型<select name="component_kind" value={draft.kind} onChange={event => updateDraft({ kind: event.target.value as Draft["kind"], tool_key: "" })} disabled={Boolean(pending)}><option value="candidate">待接入的功能说明</option><option value="tool" disabled={!tools.length}>已接入的工具</option></select></label>
        {draft.kind === "tool" ? <label>关联工具<select name="component_tool" value={draft.tool_key} onChange={event => updateDraft({ tool_key: event.target.value })} required disabled={Boolean(pending)}><option value="">请选择已接入工具</option>{tools.map(tool => <option key={tool.key} value={tool.key}>{tool.title}</option>)}</select><small>只关联已接入工具，不会安装新软件或启用API。</small></label> : <p className={styles.kindHint}>功能说明只展示用途和待接入状态，不会出现使用按钮。</p>}
      </div>
      <fieldset className={styles.modules} disabled={Boolean(pending)}><legend>所属模块（至少选择一个）</legend><div>{catalog?.modules.map(module => <label className={styles.checkbox} key={module.id}><input type="checkbox" name="component_module" value={module.id} checked={draft.module_ids.includes(module.id)} onChange={event => updateDraft({ module_ids: event.target.checked ? [...draft.module_ids, module.id] : draft.module_ids.filter(id => id !== module.id) })} />{module.title}</label>)}</div></fieldset>
      <label className={styles.checkbox}><input name="component_hidden" type="checkbox" checked={draft.hidden} onChange={event => updateDraft({ hidden: event.target.checked })} disabled={Boolean(pending)} />暂时隐藏，不在前台展示</label>
      {draft.archived && <p className={styles.kindHint}>此组件当前已移除。保存编辑不会恢复展示，可在列表中点击“恢复”。</p>}
      <p id="component-editor-help" className={styles.help}>只管理网站展示，不删除源码、用户资料或历史记录。同一个组件可放在多个模块。</p>
      <button type="submit" className={styles.primary} disabled={blocked}>{pending ? "正在保存…" : "保存组件"}</button>
    </form>}
    {loading && !catalog ? <p className={styles.empty} role="status">正在读取组件列表…</p> : accessDenied ? <p className={styles.empty}>组件管理只向站长开放。请重新登录有权限的账号。</p> : catalog && <>
      <p className={styles.listSummary}>当前筛选共 {visible.length} 个组件。一个组件绑定多个模块时仍只算一个。{draft && " 正在编辑，请先保存或取消，再操作其他组件。"}</p>
      <div className={styles.list} aria-label="组件列表">{visible.map(item => <article className={styles.item} key={item.id} data-component-id={item.id}>
        <div className={styles.itemBody}><div className={styles.itemHeading}><h3>{item.title}</h3><span className={item.archived ? styles.archived : item.hidden ? styles.hidden : styles.shown}>{item.archived ? "已移除" : item.hidden ? "已隐藏" : "展示中"}</span><span className={styles.kind}>{item.kind === "tool" ? "已接入工具" : "待接入说明"}</span></div><p>{item.description || "暂无用途说明"}</p><div className={styles.tags}>{item.module_ids.map(id => <span key={id}>{moduleNames.get(id) ?? id}</span>)}</div><small>顺序 {item.sort_order} · {item.id}</small></div>
        <div className={styles.actions}><button type="button" onClick={() => edit(item)} disabled={actionBlocked} aria-label={`编辑${item.title}`}>编辑</button>{item.archived ? <button type="button" disabled={actionBlocked} onClick={() => void mutate("PUT", item.id, { ...inputFrom(item, catalog.revision), archived: false }, "组件已恢复，可继续调整显示设置。")} aria-label={`恢复${item.title}`}>恢复</button> : <><button type="button" disabled={actionBlocked} onClick={() => void mutate("PUT", item.id, { ...inputFrom(item, catalog.revision), hidden: !item.hidden }, item.hidden ? "组件已显示。" : "组件已隐藏。")} aria-label={`${item.hidden ? "显示" : "隐藏"}${item.title}`}>{item.hidden ? "显示" : "隐藏"}</button><button type="button" className={styles.remove} disabled={actionBlocked} onClick={() => void mutate("DELETE", item.id, { expected_revision: catalog.revision }, "组件已移除，可勾选“显示已移除”后恢复。")} aria-label={`移除${item.title}`}>移除</button></>}</div>
      </article>)}</div>
      {!visible.length && <p className={styles.empty}>还没有符合当前筛选的组件，可以调整筛选或添加组件。</p>}
    </>}
  </section>;
}
