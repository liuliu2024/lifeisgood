"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
type Cell = {
  x: number;
  y: number;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  set?: number;
};
type Result = {
  library: string;
  width: number;
  height: number;
  seed: number;
  showSolution: boolean;
  cells: Cell[][];
  solution: number[][];
  limitations: string;
};
function svgOf(r: Result) {
  const p = 24,
    c = 32,
    w = r.width * c + 2 * p,
    h = r.height * c + 2 * p;
  let walls = "";
  for (let y = 0; y < r.height; y++)
    for (let x = 0; x < r.width; x++) {
      const a = p + x * c,
        b = p + y * c,
        q = r.cells[y][x];
      if (q.top && !(y === 0 && x === 0)) walls += `M${a} ${b}h${c}`;
      if (q.left) walls += `M${a} ${b}v${c}`;
      if (x === r.width - 1 && q.right) walls += `M${a + c} ${b}v${c}`;
      if (y === r.height - 1 && q.bottom && x !== r.width - 1)
        walls += `M${a} ${b + c}h${c}`;
    }
  const route = r.showSolution
    ? `<polyline points="${r.solution.map(([x, y]) => `${p + x * c + c / 2},${p + y * c + c / 2}`).join(" ")}" fill="none" stroke="#b1d2bb" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";
  return {
    w,
    h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/>${route}<path d="${walls}" fill="none" stroke="#18251e" stroke-width="2"/><path d="M${p + c / 2} 8v8m-4-4 4 4 4-4M${w - p - c / 2} ${h - 16}v8m-4-4 4 4 4-4" fill="none" stroke="#247650" stroke-width="2"/></svg>`,
  };
}
export default function Maze() {
  const [width, W] = useState("10"),
    [height, H] = useState("10"),
    [seed, S] = useState("1"),
    [showSolution, V] = useState(false),
    [busy, B] = useState(false),
    [status, M] = useState("设好大小和种子，做一张自己的迷宫。"),
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
    M("设置已修改，旧迷宫与下载已清除。");
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
    M("正在本机生成迷宫…");
    const fail = (s: string) => {
      if (!live.current || id !== job.current) return;
      cancel();
      clear();
      B(false);
      M(s);
    };
    try {
      const w = new Worker("/vendor/generate-maze/maze-worker.js", {
        type: "module",
      });
      worker.current = w;
      timer.current = setTimeout(
        () => fail("生成超过2秒，已终止。请重试或缩小迷宫。"),
        2000,
      );
      w.onerror = (e) => {
        e.preventDefault();
        fail("本机迷宫组件加载失败，请重试。");
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
          M("迷宫已生成。左上进、右下出；JSON包含参考路线。");
        } catch (e) {
          fail(
            e instanceof Error && /^(图片|PNG|已取消|此浏览器)/.test(e.message)
              ? e.message
              : "导出准备失败，请重试。",
          );
        }
      };
      w.postMessage({ width, height, seed, showSolution });
    } catch {
      fail("本机迷宫组件不可用，请重试。");
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
      <h1 className={styles.title}>做张迷宫，换换脑筋</h1>
      <p className={styles.intro}>
        本机生成，可以下载图片后自行打印。左上入口，右下出口。
      </p>
      <section className={styles.panel}>
        {[
          ["列数（5–25）", width, W, "width"],
          ["行数（5–25）", height, H, "height"],
          ["种子（0–2147483647）", seed, S, "seed"],
        ].map(([label, value, set, id]) => (
          <label className={styles.field} key={String(id)}>
            {String(label)}
            <input
              className={styles.input}
              id={"maze-" + id}
              value={String(value)}
              onChange={(e) => {
                edit();
                if (e.target.value.length > 10) {
                  M("输入过长，原值保留。");
                  return;
                }
                (set as (s: string) => void)(e.target.value);
              }}
            />
          </label>
        ))}
        <label className={styles.field}>
          <span>
            <input
              id="maze-solution"
              type="checkbox"
              checked={showSolution}
              onChange={(e) => {
                edit();
                V(e.target.checked);
              }}
            />{" "}
            图片显示参考路线
          </span>
        </label>
        <div className={styles.buttons}>
          <button
            id="maze-generate"
            className={styles.primary}
            disabled={busy}
            onClick={generate}
          >
            生成迷宫
          </button>
          <button
            id="maze-cancel"
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
          <div id="maze-output">
            <img
              id="maze-preview"
              src={output.png}
              alt="本机生成的迷宫，左上入口右下出口"
              style={{ display: "block", maxWidth: "100%", height: "auto" }}
            />
            <div className={styles.buttons}>
              <a
                id="maze-png"
                className={styles.primary}
                download="my-maze.png"
                href={output.png}
              >
                下载PNG
              </a>
              <a
                id="maze-svg"
                className={styles.secondary}
                download="my-maze.svg"
                href={output.svg}
              >
                下载SVG
              </a>
              <a
                id="maze-json"
                className={styles.secondary}
                download="my-maze.json"
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
          迷宫在本机生成，不上传。种子在当前浏览器环境可复现，不保证跨引擎完全相同；不承诺专业难度分级、打印机或纸张效果。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            generate-maze1.1.0，MIT（含Babel辅助MIT）。原库生成墙数据，平台绘图、中文界面和下载。
            <a href="/vendor/generate-maze/SOURCE.md">固定来源</a> ·{" "}
            <a href="/vendor/generate-maze/LICENSE">原许可</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
