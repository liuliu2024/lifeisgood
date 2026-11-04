"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
type Position = { x: number; y: number; direction: "horizontal" | "vertical" };
type Result = {
  library: string;
  size: number;
  alphabet: string;
  words: string[];
  grid: string[][];
  answers: { word: string; positions: Position[] }[];
  showAnswer: boolean;
  limitations: string;
};
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
function svgOf(r: Result) {
  const p = 24,
    c = 36,
    top = 56,
    w = 48 + r.size * c,
    h = top + r.size * c + 40 + Math.ceil(r.words.length / 2) * 24 + 20;
  let body = "";
  if (r.showAnswer)
    for (const a of r.answers) {
      const pos = a.positions[0],
        x = p + pos.x * c + c / 2,
        y = top + pos.y * c + c / 2;
      body += `<path d="M${x} ${y}l${pos.direction === "horizontal" ? (a.word.length - 1) * c : 0} ${pos.direction === "vertical" ? (a.word.length - 1) * c : 0}" stroke="#b1d2bb" stroke-width="26" stroke-linecap="round"/>`;
    }
  for (let y = 0; y < r.size; y++)
    for (let x = 0; x < r.size; x++) {
      const a = p + x * c,
        b = top + y * c;
      body += `<rect x="${a}" y="${b}" width="${c}" height="${c}" fill="none" stroke="#cad7ce"/><text x="${a + c / 2}" y="${b + c / 2 + 8}" text-anchor="middle" font-size="22" fill="#18251e">${xml(r.grid[y][x])}</text>`;
    }
  for (let i = 0; i < r.words.length; i++)
    body += `<text x="${p + (i % 2) * ((w - 48) / 2)}" y="${top + r.size * c + 40 + Math.floor(i / 2) * 24}" font-size="16" fill="#18251e">${xml(r.words[i])}</text>`;
  return {
    w,
    h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/><text x="24" y="30" font-size="18" fill="#18251e">从左向右、从上向下找词</text>${body}</svg>`,
  };
}
export default function WordSearch() {
  const [text, T] = useState("春天\n花朵\n朋友\n快乐"),
    [size, S] = useState("10"),
    [showAnswer, A] = useState(false),
    [busy, B] = useState(false),
    [status, M] = useState("每行一个词，用自己的词语做一张找词纸。"),
    [output, O] = useState<{
      r: Result;
      svg: string;
      png: string;
      json: string;
    } | null>(null);
  const job = useRef(0),
    worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    encoding = useRef<(() => void) | null>(null),
    urls = useRef<string[]>([]),
    live = useRef(true);
  function stopWorker() {
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function cancel() {
    job.current++;
    stopWorker();
    encoding.current?.();
    encoding.current = null;
  }
  function clear() {
    urls.current.splice(0).forEach(URL.revokeObjectURL);
    O(null);
  }
  function edit() {
    cancel();
    clear();
    B(false);
    M("词表或设置已修改，旧结果已清除。");
  }
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      cancel();
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, []);
  function pngOf(svg: string, w: number, h: number) {
    return new Promise<Blob>((resolve, reject) => {
      const image = new Image();
      let u: string | null = null,
        settled = false;
      const timeout = setTimeout(
        () => finish(Error("图片导出超过8秒，请重试。")),
        8000,
      );
      function finish(e?: Error, b?: Blob) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        image.src = "";
        if (u) URL.revokeObjectURL(u);
        encoding.current = null;
        e ? reject(e) : resolve(b!);
      }
      encoding.current = () => finish(Error("已取消。"));
      try {
        u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw Error("此浏览器无法导出图片。");
            ctx.drawImage(image, 0, 0);
            canvas.toBlob(
              (b) =>
                b ? finish(undefined, b) : finish(Error("PNG导出失败。")),
              "image/png",
            );
          } catch {
            finish(Error("PNG导出失败，请重试。"));
          }
        };
        image.onerror = () => finish(Error("图片预览失败，请重试。"));
        image.src = u;
      } catch {
        finish(Error("图片导出准备失败。"));
      }
    });
  }
  function generate() {
    cancel();
    clear();
    const id = job.current;
    B(true);
    M("正在本机生成找词纸…");
    const fail = (s: string) => {
      if (!live.current || id !== job.current) return;
      cancel();
      clear();
      B(false);
      M(s);
    };
    try {
      const w = new Worker("/vendor/wordfind/word-search-worker.js");
      worker.current = w;
      timer.current = setTimeout(
        () => fail("生成超过2秒，已终止。请重试或减少词语。"),
        2000,
      );
      w.onerror = (e) => {
        e.preventDefault();
        fail("本机找词组件加载失败，请重试。");
      };
      w.onmessage = async (e) => {
        if (!live.current || id !== job.current) return;
        if (!e.data.ok) {
          fail(e.data.error);
          return;
        }
        stopWorker();
        try {
          const r = e.data.result as Result,
            v = svgOf(r),
            png = await pngOf(v.svg, v.w, v.h);
          if (!live.current || id !== job.current) return;
          const a = URL.createObjectURL(
            new Blob([v.svg], { type: "image/svg+xml;charset=utf-8" }),
          );
          urls.current.push(a);
          const b = URL.createObjectURL(png);
          urls.current.push(b);
          const c = URL.createObjectURL(
            new Blob([JSON.stringify(r, null, 2)], {
              type: "application/json;charset=utf-8",
            }),
          );
          urls.current.push(c);
          O({ r, svg: a, png: b, json: c });
          B(false);
          M("找词纸已生成；每个词至少能找到一次。");
        } catch (e) {
          fail(
            e instanceof Error && /^(图片|PNG|已取消|此浏览器)/.test(e.message)
              ? e.message
              : "导出准备失败，请重试。",
          );
        }
      };
      w.postMessage({ text, size, showAnswer });
    } catch {
      fail("本机找词组件不可用，请重试。");
    }
  }
  return (
    <main className={styles.shell}>
      <nav className={styles.nav}>
        <Link className={styles.brand} href="/">
          生活小助手
        </Link>
        <Link className={styles.back} href="/#daily-tools">
          ← 回到新发现
        </Link>
      </nav>
      <h1 className={styles.title}>把自己的词藏进格子里</h1>
      <p className={styles.intro}>
        每行一个词，横着竖着找。自己玩，或下载后和朋友一起找。
      </p>
      <section className={styles.panel}>
        <label className={styles.field}>
          词语（每行一个）
          <textarea
            id="word-search-input"
            className={styles.input}
            rows={7}
            value={text}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 256) {
                M("词表超过256字符，原内容保留。");
                return;
              }
              T(e.target.value);
            }}
          />
        </label>
        <p>
          2–8个词，每词2–6字，总计不超过40字；一局只用常用汉字或英文字母，英文统一大写。不分词，不支持emoji或扩展汉字。
        </p>
        <label className={styles.field}>
          每边格数（8–16）
          <input
            id="word-search-size"
            className={styles.input}
            value={size}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 2) {
                M("格数过长，原值保留。");
                return;
              }
              S(e.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          <span>
            <input
              id="word-search-answer"
              type="checkbox"
              checked={showAnswer}
              onChange={(e) => {
                edit();
                A(e.target.checked);
              }}
            />{" "}
            图片显示一组参考答案
          </span>
        </label>
        <div className={styles.buttons}>
          <button
            id="word-search-generate"
            className={styles.primary}
            disabled={busy}
            onClick={generate}
          >
            生成找词纸
          </button>
          <button
            id="word-search-cancel"
            className={styles.secondary}
            onClick={() => {
              cancel();
              clear();
              B(false);
              M("已取消。");
            }}
          >
            取消
          </button>
        </div>
        <p role="status">{status}</p>
        {output && (
          <div id="word-search-output">
            <p>要找的词：{output.r.words.join("、")}</p>
            <img
              id="word-search-preview"
              src={output.png}
              alt="本机生成的找词格子和词语清单"
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
            <div className={styles.buttons}>
              <a
                id="word-search-png"
                className={styles.primary}
                download="word-search.png"
                href={output.png}
              >
                下载PNG
              </a>
              <a
                id="word-search-svg"
                className={styles.secondary}
                download="word-search.svg"
                href={output.svg}
              >
                下载SVG
              </a>
              <a
                id="word-search-json"
                className={styles.secondary}
                download="word-search.json"
                href={output.json}
              >
                下载JSON
              </a>
            </div>
          </div>
        )}
      </section>
      <footer className={styles.footer}>
        <p>
          输入和图纸只在本机。每词至少出现一次，随机填字可能出现额外答案；JSON包含全部横竖匹配位置。未保证专业难度、跨设备字体或真实打印效果。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            原Wordfind.js固定源码，MIT，平台中文界面与图纸导出。
            <a href="/vendor/wordfind/SOURCE.md">固定来源</a> ·{" "}
            <a href="/vendor/wordfind/LICENSE">原许可</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
