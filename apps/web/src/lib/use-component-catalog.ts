"use client";

import { useEffect, useState } from "react";
import type { ComponentCatalog } from "./component-types";

export function useComponentCatalog() {
  const [catalog, setCatalog] = useState<ComponentCatalog | null>(null);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const response = await fetch("/api/component-catalog", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("工具目录暂时无法读取，请稍后重试。");
      const value = await response.json() as ComponentCatalog;
      if (!Array.isArray(value.items) || !Array.isArray(value.modules) || !Number.isInteger(value.revision)) throw new Error("工具目录格式无效。");
      setCatalog(previous => previous && previous.revision > value.revision ? previous : value);
      setError("");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "工具目录暂时无法读取。"); }
  }
  useEffect(() => {
    void refresh();
    const focus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, []);
  return { catalog, error, refresh };
}
