"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { catalog, categories, stages, industries } from "@/lib/catalog";
import type { CatalogItem } from "@/lib/catalog";

type View =
  | "home"
  | "public"
  | "industry"
  | "favorites"
  | "workspace"
  | "admin";
type Account = {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
};
type PrivateFile = {
  id: string;
  name: string;
  size: number;
  created_at: string;
  download_url: string;
  mime_type: string;
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(15000),
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : response.status === 401
          ? "请先登录，再继续此操作。"
          : response.status === 403
            ? "当前账号没有此操作权限。"
            : "暂时无法完成，请稍后重试。",
    );
  return data as T;
}
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v11H3Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    shop: (
      <>
        <path d="M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 4 6 4 6 0 0 4 6 4 6 0 0 4 6 4 6 0M9 21v-6h6v6" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
    ),
    folder: <path d="M3 7V4h7l3 3h8v13H3Z" />,
    settings: (
      <>
        <path d="M3 7h18M3 17h18" />
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    leaf: (
      <>
        <path d="M4 4c14-2 20 7 14 15C6 22 1 14 4 4Z" />
        <path d="m8 9 8 9m-4-5v-5" />
      </>
    ),
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
export default function Home() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("全部阶段");
  const [industry, setIndustry] = useState("全部行业");
  const [category, setCategory] = useState("全部分类");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const [menu, setMenu] = useState(false);
  const [allStages, setAllStages] = useState(false);
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("我的任务");
  const [accountLoading, setAccountLoading] = useState(true);
  const [settings, setSettings] = useState({
    site_name: "",
    support_email: "",
    announcement: "",
  });
  const [settingsState, setSettingsState] = useState("");
  const [settingsReady, setSettingsReady] = useState(false);
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [jobs, setJobs] = useState<
    { id: string; title?: string; status: string }[]
  >([]);
  const [privateState, setPrivateState] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const authRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("lifeisgood-favorites") || "[]",
      );
      if (Array.isArray(saved))
        setFavorites(saved.filter((x) => typeof x === "string"));
    } catch {
      /* Storage optional. */
    }
  }, []);
  useEffect(() => {
    request<{ authenticated: boolean; user: Account | null }>("/api/account")
      .then((data) => setAccount(data.authenticated ? data.user : null))
      .catch(() => setMessage("账号服务暂时无法连接；你仍可浏览目录。"))
      .finally(() => setAccountLoading(false));
  }, []);
  useEffect(() => {
    if (view === "admin" && account?.role === "owner") {
      setSettingsReady(false);
      setSettingsState("正在读取设置…");
      request<{ settings: typeof settings }>("/api/foundation/admin/settings")
        .then((data) => {
          setSettings(data.settings);
          setSettingsReady(true);
          setSettingsState("");
        })
        .catch((error) => setSettingsState(error.message));
    }
  }, [view, account]);
  useEffect(() => {
    if (!account) {
      setFiles([]);
      setJobs([]);
      return;
    }
    let active = true;
    request<{ capability_ids: string[] }>("/api/favorites")
      .then((data) => {
        if (active) setFavorites(data.capability_ids);
      })
      .catch(() => {
        if (active) setMessage("账号收藏暂时无法读取，请稍后重试。");
      });
    return () => {
      active = false;
    };
  }, [account]);
  useEffect(() => {
    if (!account || view !== "workspace") return;
    let active = true;
    setPrivateState("正在读取个人资料…");
    Promise.all([
      request<{ files: PrivateFile[] }>("/api/files"),
      request<{ jobs: { id: string; title?: string; status: string }[] }>(
        "/api/foundation/jobs",
      ),
    ])
      .then(([fileData, jobData]) => {
        if (active) {
          setFiles(fileData.files);
          setJobs(jobData.jobs);
          setPrivateState("");
        }
      })
      .catch((error) => {
        if (active) setPrivateState(error.message);
      });
    return () => {
      active = false;
    };
  }, [account, view, refresh]);
  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [detail]);
  useEffect(() => {
    if (auth) authRef.current?.showModal();
    else {
      authRef.current?.close();
      authRef.current?.querySelector("form")?.reset();
    }
  }, [auth]);
  function navigate(next: View) {
    setView(next);
    setMenu(false);
    setMessage("");
    setQuery("");
    setCategory("全部分类");
    setStage("全部阶段");
    setIndustry("全部行业");
  }
  async function toggleFavorite(id: string) {
    const selected = !favorites.includes(id);
    if (account) {
      try {
        await request(`/api/favorites/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify({ selected }),
        });
        setFavorites((previous) =>
          selected
            ? [...new Set([...previous, id])]
            : previous.filter((x) => x !== id),
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "收藏未保存，请重试。",
        );
      }
    } else {
      setFavorites((previous) => {
        const next = selected
          ? [...new Set([...previous, id])]
          : previous.filter((x) => x !== id);
        try {
          localStorage.setItem("lifeisgood-favorites", JSON.stringify(next));
        } catch {
          setMessage("浏览器未允许保存收藏；本次打开期间仍可使用。");
        }
        return next;
      });
    }
  }
  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setAuthError("");
    try {
      await request(`/api/auth/${auth}`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const current = await request<{
        authenticated: boolean;
        user: Account | null;
      }>("/api/account");
      if (!current.authenticated || !current.user)
        throw new Error("账号服务尚未确认登录，请重试。");
      setAccount(current.user);
      setAuth(null);
      setMessage(
        auth === "register"
          ? "账号已创建并登录。邮箱尚未验证。"
          : "已登录，继续当前任务。",
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "登录未完成，请重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await request("/api/auth/logout", { method: "POST" });
      setAccount(null);
      setFiles([]);
      setJobs([]);
      setFavorites([]);
      setMessage("已退出当前账号。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "退出失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSettingsState("");
    try {
      const data = await request<{ settings: typeof settings }>(
        "/api/foundation/admin/settings",
        { method: "PUT", body: JSON.stringify({ settings }) },
      );
      setSettings(data.settings);
      setSettingsState("网站基础设置已保存；工具与付费服务仍未启用。");
    } catch (error) {
      setSettingsState(
        error instanceof Error ? error.message : "保存失败，请重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setPrivateState("");
    try {
      await request("/api/files", { method: "POST", body: data });
      form.reset();
      setRefresh((value) => value + 1);
      setMessage("文件已上传到个人文件区；未提交给任何工具或模型服务。");
    } catch (error) {
      setPrivateState(
        error instanceof Error
          ? error.message
          : "上传失败，请保留原文件后重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function deleteFile(id: string) {
    setBusy(true);
    try {
      await request(`/api/files/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setDeleteId(null);
      setRefresh((value) => value + 1);
      setMessage("文件已删除。");
    } catch (error) {
      setPrivateState(
        error instanceof Error ? error.message : "删除未完成，请重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = catalog.filter(
    (tool) =>
      (view !== "favorites" || favorites.includes(tool.id)) &&
      (category === "全部分类" || tool.category === category) &&
      (stage === "全部阶段" || tool.stage === stage) &&
      (industry === "全部行业" ||
        tool.industry.includes(industry) ||
        tool.industry.includes("通用")) &&
      `${tool.title} ${tool.description} ${tool.category} ${tool.candidates.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const stageOptions = [...new Set(["全部阶段", ...stages])];
  const industryOptions = [...new Set(["全部行业", ...industries])];
  const categoryOptions = [...new Set(["全部分类", ...categories])];
  const nav: { id: View; label: string; icon: string }[] = [
    { id: "home", label: "办事首页", icon: "home" },
    { id: "public", label: "公共工具", icon: "grid" },
    { id: "industry", label: "行业专区", icon: "shop" },
    { id: "favorites", label: "我的收藏", icon: "star" },
    { id: "workspace", label: "个人工作台", icon: "folder" },
  ];
  const title = {
    home: "今天，想办成什么事？",
    public: "公共工具",
    industry: "行业专区",
    favorites: "我的收藏",
    workspace: "个人工作台",
    admin: "站长后台",
  }[view];
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <aside className={`sidebar ${menu ? "is-open" : ""}`} aria-label="主导航">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="生活小助手首页"
        >
          <span className="brand-mark">
            <Icon name="leaf" size={25} />
          </span>
          <span>
            生活小助手<small>把经营小事，办得顺一点</small>
          </span>
        </button>
        <div className="sidebar-label">你的经营工具箱</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "favorites" && favorites.length > 0 && (
                <span className="nav-count">{favorites.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="foundation-note">
            <strong>网站基础搭建中</strong>
            <p>先找到要办的事，再选择合适的工具。工具与付费服务尚未开通。</p>
          </div>
          <button
            className={`nav-item ${view === "admin" ? "active" : ""}`}
            onClick={() => navigate("admin")}
          >
            <Icon name="settings" />
            <span>站长后台</span>
          </button>
          <span className="sidebar-foot">生活小助手 · 开源工具门户</span>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="收起导航"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-frame">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label={menu ? "收起导航" : "展开导航"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name="menu" />
          </button>
          <span className="breadcrumb">
            经营工具箱<span>/</span>
            {view === "home" ? "办事首页" : title}
          </span>
          <div className="account-actions">
            {account ? (
              <>
                <span>{account.display_name || account.email}</span>
                <button
                  className="text-button"
                  onClick={logout}
                  disabled={busy}
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <span className="guest-label">
                  {accountLoading ? "正在确认账号…" : "游客浏览"}
                </span>
                <button
                  className="button compact"
                  onClick={() => {
                    setAuthError("");
                    setAuth("login");
                  }}
                >
                  登录 / 注册
                </button>
              </>
            )}
          </div>
        </header>
        <main id="main" className="workspace" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {view === "home"
                  ? "从筹备开店到日常经营，按你要办的事找工具。"
                  : view === "public"
                    ? "图片、文件、宣传与经营记录，跨行业都能找。"
                    : view === "industry"
                      ? "先选你的生意，再看可复用的公共工具。行业专业功能仍待核实。"
                      : view === "favorites"
                        ? account
                          ? "把想了解的任务收在这里，收藏保存在你的账号。"
                          : "把想了解的任务收在这里，游客收藏保存在当前浏览器。"
                        : view === "workspace"
                          ? "集中查看自己的文件、任务与账户状态。"
                          : "由站长决定展示哪些工具，以及每个组件使用哪些服务。"}
              </p>
            </div>
            <span className="phase-state">
              <span />
              工具待接入
            </span>
          </div>
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
          {["home", "public", "industry", "favorites"].includes(view) ? (
            <>
              <section className="search-section" aria-label="查找经营任务">
                <label className="search-field">
                  <Icon name="search" size={22} />
                  <span className="sr-only">搜索你想办的事</span>
                  <input
                    type="search"
                    placeholder="想做什么？例如：整理报价单、处理商品图"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="清空搜索"
                      onClick={() => setQuery("")}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </label>
                <p className="search-hint">直接说要办的事，不用记软件名字。</p>
              </section>
              {view === "home" && (
                <section
                  className="journey-section"
                  aria-labelledby="journey-title"
                >
                  <div className="section-heading">
                    <h2 id="journey-title">从开店到经营</h2>
                    <span>按当前阶段浏览</span>
                  </div>
                  <div
                    id="journey-options"
                    className={`journey-list ${allStages ? "expanded" : ""}`}
                  >
                    {stageOptions
                      .filter((x) => x !== "全部阶段")
                      .map((item) => (
                        <button
                          className={stage === item ? "selected" : ""}
                          key={item}
                          onClick={() =>
                            setStage(stage === item ? "全部阶段" : item)
                          }
                          aria-pressed={stage === item}
                        >
                          <span>{item}</span>
                          <small>查看这个阶段的任务</small>
                          <Icon name="arrow" size={16} />
                        </button>
                      ))}
                  </div>
                  <button
                    className="text-button journey-expand"
                    aria-expanded={allStages}
                    aria-controls="journey-options"
                    onClick={() => setAllStages(!allStages)}
                  >
                    {allStages ? "收起阶段" : "查看全部经营阶段"}
                  </button>
                </section>
              )}
              {view === "industry" && (
                <div className="industry-options" aria-label="选择行业">
                  {industryOptions.map((item) => (
                    <button
                      className={industry === item ? "selected" : ""}
                      key={item}
                      aria-pressed={industry === item}
                      onClick={() => setIndustry(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
              <section
                className="catalog-section"
                aria-labelledby="catalog-title"
              >
                <div className="section-heading">
                  <div>
                    <h2 id="catalog-title">
                      {view === "favorites"
                        ? "收藏的任务"
                        : stage === "全部阶段"
                          ? "任务目录"
                          : stage}
                    </h2>
                    <p>
                      研究候选不等于已经开通。详情会说明输入、结果与接入状态。
                    </p>
                  </div>
                  <span className="result-count" aria-live="polite">
                    {visible.length} 项候选
                  </span>
                </div>
                <div className="filter-row">
                  <label>
                    任务分类
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categoryOptions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  {view !== "home" && (
                    <label>
                      经营阶段
                      <select
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                      >
                        {stageOptions.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span className="catalog-disclaimer">
                    所有候选均待站长选择与接入
                  </span>
                </div>
                {visible.length ? (
                  <div className="tool-grid">
                    {visible.map((tool) => (
                      <article className="tool-card" key={tool.id}>
                        <div className="tool-card-top">
                          <span>{tool.category}</span>
                          <button
                            className={`favorite-button ${favorites.includes(tool.id) ? "saved" : ""}`}
                            aria-label={`${favorites.includes(tool.id) ? "取消收藏" : "收藏"}${tool.title}`}
                            aria-pressed={favorites.includes(tool.id)}
                            onClick={() => toggleFavorite(tool.id)}
                          >
                            <Icon name="star" size={18} />
                          </button>
                        </div>
                        <button
                          className="tool-title"
                          onClick={() => setDetail(tool)}
                        >
                          {tool.title}
                        </button>
                        <p>{tool.description}</p>
                        <div className="tool-card-bottom">
                          <span className="status-pill">待接入</span>
                          <button
                            className="text-button"
                            onClick={() => setDetail(tool)}
                          >
                            查看详情 <Icon name="arrow" size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Icon
                      name={view === "favorites" ? "star" : "search"}
                      size={30}
                    />
                    <h3>
                      {view === "favorites"
                        ? "还没有收藏的任务"
                        : stages.slice(0, 4).includes(stage)
                          ? "这个阶段正在规划"
                          : "暂时没有匹配的任务"}
                    </h3>
                    <p>
                      {view === "favorites"
                        ? "浏览任务时点击收藏，之后可以在这里找回来。"
                        : stages.slice(0, 4).includes(stage)
                          ? "起名、选址、登记与地图资料等筹备任务正在整理。尚未接入官方办理或地图标注，不接收提交、不承诺办理结果。"
                          : "换一个说法，或清除筛选再看看。"}
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        if (view === "favorites") navigate("public");
                        else {
                          setQuery("");
                          setCategory("全部分类");
                          setStage("全部阶段");
                          setIndustry("全部行业");
                        }
                      }}
                    >
                      {view === "favorites" ? "浏览公共工具" : "清除筛选"}
                    </button>
                  </div>
                )}
              </section>
              <section className="how-it-works">
                <h2>先看清楚，再开始</h2>
                <div>
                  <p>
                    <strong>找到任务</strong>
                    <span>按经营阶段、行业或关键词浏览。</span>
                  </p>
                  <p>
                    <strong>了解工具</strong>
                    <span>看清输入、输出与尚未支持的部分。</span>
                  </p>
                  <p>
                    <strong>开通后使用</strong>
                    <span>服务和费用确认后，才会开放提交。</span>
                  </p>
                </div>
              </section>
            </>
          ) : view === "workspace" ? (
            <>
              <div className="tabs" role="tablist" aria-label="工作台内容">
                {["我的任务", "我的文件", "账户与订单"].map((item) => (
                  <button
                    role="tab"
                    aria-selected={workspaceTab === item}
                    className={workspaceTab === item ? "active" : ""}
                    key={item}
                    onClick={() => setWorkspaceTab(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <section className="workspace-panel">
                <h2>{workspaceTab}</h2>
                {!account ? (
                  <div className="empty-state">
                    <Icon name="folder" size={30} />
                    <h3>登录后，回到自己的工作台</h3>
                    <p>
                      个人任务和文件仅向有权限的账号展示。游客浏览不会创建工作记录。
                    </p>
                    <button
                      className="button"
                      onClick={() => {
                        setAuthError("");
                        setAuth("login");
                      }}
                    >
                      登录 / 注册
                    </button>
                  </div>
                ) : (
                  <div>
                    {privateState && (
                      <div className="notice" role="status">
                        {privateState}
                        <button
                          className="text-button"
                          onClick={() => setRefresh((value) => value + 1)}
                        >
                          重新读取
                        </button>
                      </div>
                    )}
                    {workspaceTab === "我的文件" ? (
                      <>
                        <form className="upload-form" onSubmit={uploadFile}>
                          <label>
                            选择要保存的文件
                            <input
                              required
                              type="file"
                              name="file"
                              aria-describedby="upload-help"
                            />
                          </label>
                          <p id="upload-help">
                            仅保存在个人文件区，不发送给任何模型或工具。请保留自己的原始文件。
                          </p>
                          <button
                            className="button"
                            disabled={busy}
                            type="submit"
                          >
                            {busy ? "正在上传…" : "上传文件"}
                          </button>
                        </form>
                        {files.length ? (
                          <div className="file-list">
                            {files.map((file) => (
                              <div className="file-row" key={file.id}>
                                <div>
                                  <strong>{file.name}</strong>
                                  <small>
                                    {(file.size / 1024).toFixed(1)} KB ·{" "}
                                    {new Date(file.created_at).toLocaleString(
                                      "zh-CN",
                                    )}
                                  </small>
                                </div>
                                <a
                                  href={file.download_url}
                                  className="text-button"
                                  download
                                >
                                  下载
                                </a>
                                {deleteId === file.id ? (
                                  <>
                                    <span>确认删除？</span>
                                    <button
                                      className="text-button danger"
                                      disabled={busy}
                                      onClick={() => deleteFile(file.id)}
                                    >
                                      确认
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={() => setDeleteId(null)}
                                    >
                                      保留
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="text-button"
                                    onClick={() => setDeleteId(file.id)}
                                  >
                                    删除
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          !privateState && (
                            <div className="empty-state">
                              <h3>暂时没有文件</h3>
                              <p>
                                上传后可在这里下载或删除；删除前会再次确认。
                              </p>
                            </div>
                          )
                        )}
                      </>
                    ) : workspaceTab === "我的任务" ? (
                      jobs.length ? (
                        <div className="file-list">
                          {jobs.map((job) => (
                            <div className="file-row" key={job.id}>
                              <strong>{job.title || job.id}</strong>
                              <span>{job.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        !privateState && (
                          <div className="empty-state">
                            <h3>还没有提交过任务</h3>
                            <p>工具尚未接入，当前不会创建工具执行任务。</p>
                            <button
                              className="button secondary"
                              onClick={() => navigate("home")}
                            >
                              返回办事首页
                            </button>
                          </div>
                        )
                      )
                    ) : (
                      <div className="empty-state">
                        <h3>支付与额度尚未开通</h3>
                        <p>
                          暂不提供充值或购买；费用将在服务开通前说明。邮箱账号尚未验证。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="admin-section">
              <div className="notice">
                站长后台需要服务端验证权限。展示配置说明不会授予管理权限。
              </div>
              {!account || account.role !== "owner" ? (
                <div className="empty-state">
                  <Icon name="settings" size={30} />
                  <h2>站长专属管理</h2>
                  <p>
                    登录站长账号后，可管理任务展示、组件服务与访问权限。普通账号无法读取配置和密钥。
                  </p>
                  <button
                    className="button"
                    onClick={() => {
                      setAuthError("");
                      setAuth("login");
                    }}
                  >
                    登录站长账号
                  </button>
                </div>
              ) : (
                <>
                  <h2>工具与服务配置</h2>
                  <p>当前没有已启用的模型 API 或支付通道。</p>
                  <form className="admin-form" onSubmit={saveSettings}>
                    <label>
                      网站名称
                      <input
                        required
                        maxLength={80}
                        value={settings.site_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            site_name: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      支持邮箱
                      <input
                        type="email"
                        maxLength={254}
                        value={settings.support_email}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            support_email: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      站内公告
                      <textarea
                        maxLength={1000}
                        rows={4}
                        value={settings.announcement}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            announcement: e.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      className="button"
                      disabled={busy || !settingsReady}
                      type="submit"
                    >
                      {busy ? "正在保存…" : "保存基础设置"}
                    </button>
                    <p role="status">{settingsState}</p>
                  </form>
                </>
              )}
              <div className="settings-rows">
                {[
                  [
                    "任务展示",
                    "选择哪些任务出现在目录；未接入的任务明确标识。",
                  ],
                  [
                    "组件与模型",
                    "每个组件的供应商、模型及服务地址由站长确定。",
                  ],
                  ["密钥与权限", "密钥在服务端保存，前端不展示密钥值。"],
                  ["额度与支付", "尚未开通，不提供充值，不产生真实扣费。"],
                ].map(([label, description]) => (
                  <div className="settings-row" key={label}>
                    <strong>{label}</strong>
                    <p>{description}</p>
                    <span>待配置</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>生活小助手</span>
            <p>工具尚未接入 · 模型 API 未开通 · 支付未开通</p>
            <button
              className="text-button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                })
              }
            >
              回到顶部 ↑
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="detail-dialog"
        onCancel={() => setDetail(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDetail(null);
        }}
      >
        {detail && (
          <>
            <div className="dialog-heading">
              <button className="text-button" onClick={() => setDetail(null)}>
                <Icon name="back" size={17} />
                返回目录
              </button>
              <button
                className="icon-button"
                aria-label="关闭详情"
                onClick={() => setDetail(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            <span className="detail-category">{detail.category}</span>
            <h2>{detail.title}</h2>
            <p>{detail.description}</p>
            <dl className="detail-facts">
              <div>
                <dt>你需要准备</dt>
                <dd>{detail.input}</dd>
              </div>
              <div>
                <dt>期望得到</dt>
                <dd>{detail.output}</dd>
              </div>
              <div>
                <dt>候选开源项目</dt>
                <dd>{detail.candidates.join("、") || "待评估"}</dd>
              </div>
              <div>
                <dt>接入状态</dt>
                <dd>待站长选择与接入；当前不能执行。</dd>
              </div>
              <div>
                <dt>研究证据</dt>
                <dd>{detail.evidence}（不代表已部署或验证通过）</dd>
              </div>
            </dl>
            <h3>开始前需要了解</h3>
            <ul>
              {detail.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => toggleFavorite(detail.id)}
              >
                {favorites.includes(detail.id) ? "取消收藏" : "收藏这个任务"}
              </button>
              <span>工具未接入，暂不接收文件或产生费用。</span>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={authRef}
        className="auth-dialog"
        onCancel={() => setAuth(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAuth(null);
        }}
      >
        <div className="dialog-heading">
          <span>生活小助手</span>
          <button
            className="icon-button"
            aria-label="关闭登录"
            onClick={() => setAuth(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2>{auth === "register" ? "创建你的账号" : "登录你的工作台"}</h2>
        <p>登录后继续当前页面。</p>
        <form onSubmit={submitAuth}>
          {auth === "register" && (
            <label>
              你的称呼
              <input
                name="display_name"
                autoComplete="nickname"
                maxLength={40}
                placeholder="怎么称呼你"
              />
            </label>
          )}
          <label>
            邮箱
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="输入邮箱"
            />
          </label>
          <label>
            密码
            <input
              type="password"
              name="password"
              autoComplete={
                auth === "register" ? "new-password" : "current-password"
              }
              minLength={12}
              maxLength={128}
              required
              aria-describedby="password-help"
            />
          </label>
          <p id="password-help" className="field-help">
            密码至少 12 位。短信与微信登录暂未开通。
          </p>
          {authError && (
            <p className="form-error" role="alert">
              {authError}
            </p>
          )}
          <button className="button full-width" disabled={busy} type="submit">
            {busy ? "正在提交…" : auth === "register" ? "注册账号" : "登录"}
          </button>
        </form>
        <div className="auth-switch">
          {auth === "register" ? "已有账号？" : "还没有账号？"}
          <button
            className="text-button"
            onClick={() => {
              setAuthError("");
              setAuth(auth === "register" ? "login" : "register");
            }}
          >
            {auth === "register" ? "去登录" : "创建账号"}
          </button>
        </div>
        <p className="field-help">
          使用本地邮箱密码账号；邮箱未验证，暂未开通邮件找回。
        </p>
      </dialog>
    </div>
  );
}
