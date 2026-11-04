"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
type Result = {
  library: string;
  sourcePeople: number;
  targetPeople: number;
  ratio: string;
  rows: {
    name: string;
    originalQuantity: string;
    unit: string;
    exact: string;
    approximate: string;
  }[];
  limitations: string;
};
export default function RecipeScale() {
  const [source, S] = useState("2"),
    [target, T] = useState("3"),
    [text, X] = useState("面粉 | 1/2 | 杯\n牛奶 | 0.25 | 升\n鸡蛋 | 2 | 个"),
    [busy, B] = useState(false),
    [status, M] = useState("按示例填写，每行一种原料。"),
    [output, O] = useState<{
      result: Result;
      txt: string;
      json: string;
    } | null>(null);
  const worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    round = useRef(0),
    urls = useRef<string[]>([]),
    live = useRef(true);
  function stop() {
    round.current++;
    worker.current?.terminate();
    worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function clear() {
    urls.current.splice(0).forEach(URL.revokeObjectURL);
    O(null);
  }
  function edit() {
    stop();
    clear();
    B(false);
    M("内容已修改，旧结果已清除。");
  }
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stop();
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, []);
  function generate() {
    stop();
    clear();
    if (typeof BigInt !== "function") {
      M("此浏览器不支持原生BigInt，无法精确缩放。");
      return;
    }
    const id = round.current;
    B(true);
    M("正在本机精确缩放…");
    const fail = (s: string) => {
      if (!live.current || id !== round.current) return;
      stop();
      clear();
      B(false);
      M(s);
    };
    try {
      const w = new Worker("/vendor/fraction/recipe-worker.js", {
        type: "module",
      });
      worker.current = w;
      timer.current = setTimeout(
        () => fail("处理超过2秒，已终止。请缩短原料后重试。"),
        2000,
      );
      w.onerror = (e) => {
        e.preventDefault();
        fail("本机组件加载失败，请重试。");
      };
      w.onmessage = (e) => {
        if (!live.current || id !== round.current) return;
        if (!e.data.ok) {
          fail(e.data.error);
          return;
        }
        stop();
        try {
          const r = e.data.result as Result;
          const txt =
            `食谱份量缩放\n原人数：${r.sourcePeople}\n目标人数：${r.targetPeople}\n倍率：${r.ratio}\n` +
            r.rows
              .map(
                (a) =>
                  `${a.name}：${a.originalQuantity} → ${a.exact} ${a.unit}（约${a.approximate}）`,
              )
              .join("\n") +
            "\n" +
            r.limitations;
          const t = URL.createObjectURL(
            new Blob([txt], { type: "text/plain;charset=utf-8" }),
          );
          urls.current.push(t);
          const j = URL.createObjectURL(
            new Blob([JSON.stringify(r, null, 2)], {
              type: "application/json;charset=utf-8",
            }),
          );
          urls.current.push(j);
          O({ result: r, txt: t, json: j });
          B(false);
          M("已按人数缩放。小数标作近似，精确值看分数。");
        } catch {
          clear();
          B(false);
          M("导出准备失败，请重新计算。");
        }
      };
      w.postMessage({ source, target, text });
    } catch {
      fail("本机组件不可用，请重试。");
    }
  }
  return (
    <main className={styles.shell}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          生活小助手
        </Link>
        <Link href="/#daily-tools" className={styles.back}>
          ← 回到新发现
        </Link>
      </nav>
      <h1 className={styles.title}>人多一点，食材怎么算？</h1>
      <p className={styles.intro}>
        按人数精确缩放原料份量，保留原单位。输入与结果只在本机。
      </p>
      <section className={styles.panel}>
        <label className={styles.field}>
          原配方人数
          <input
            id="recipe-scale-source"
            className={styles.input}
            value={source}
            onChange={(e) => {
              edit();
              S(e.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          现在做几人份
          <input
            id="recipe-scale-target"
            className={styles.input}
            value={target}
            onChange={(e) => {
              edit();
              T(e.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          每行：原料名称 | 数量 | 单位
          <textarea
            id="recipe-scale-input"
            rows={8}
            className={styles.input}
            value={text}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 12000) {
                M("输入超过12000字符，原内容保留。");
                return;
              }
              X(e.target.value);
            }}
          />
        </label>
        <p>
          最多20行。数量支持正整数、小数（最多6位）或1/3这样的分数；不接受“适量”，不替你换算单位。
        </p>
        <div className={styles.buttons}>
          <button
            id="recipe-scale-generate"
            className={styles.primary}
            onClick={generate}
            disabled={busy}
          >
            按人数算份量
          </button>
          <button
            id="recipe-scale-cancel"
            className={styles.secondary}
            onClick={() => {
              stop();
              clear();
              B(false);
              M("已取消，结果已清除。");
            }}
          >
            取消
          </button>
        </div>
        <p role="status">{status}</p>
        {output && (
          <div id="recipe-scale-output" style={{ overflowWrap: "anywhere" }}>
            <p>倍率：{output.result.ratio}</p>
            {output.result.rows.map((r, i) => (
              <p key={i}>
                {r.name}：{r.originalQuantity} →{" "}
                <strong>
                  {r.exact} {r.unit}
                </strong>
                （约{r.approximate}）
              </p>
            ))}
            <div className={styles.buttons}>
              <a
                id="recipe-scale-txt"
                className={styles.primary}
                href={output.txt}
                download="recipe-scale.txt"
              >
                下载文字
              </a>
              <a
                id="recipe-scale-json"
                className={styles.secondary}
                href={output.json}
                download="recipe-scale.json"
              >
                下载JSON
              </a>
            </div>
          </div>
        )}
      </section>
      <footer className={styles.footer}>
        <p>
          仅按人数做算术缩放；不推断密度、营养、调味口感或食品安全。单位原样保留，近似小数不代替精确分数；不用于药剂量或婴儿喂养。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            Fraction.js5.3.4原库MIT，平台中文食谱封装。
            <a href="/vendor/fraction/SOURCE.md">固定来源</a> ·{" "}
            <a href="/vendor/fraction/LICENSE">原许可</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
