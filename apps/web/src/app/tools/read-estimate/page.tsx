"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
type Result = {
  library: string;
  units: number;
  speedUnitsPerMinute: number;
  minutes: number;
  milliseconds: number;
  upstreamDisplayText: string;
  text: string;
  definition: string;
  punctuationBoundaries: string;
  limitations: string;
};
export default function ReadEstimate() {
  const [text, T] = useState("你好，世界！\nHello world."),
    [speed, S] = useState("200"),
    [busy, B] = useState(false),
    [status, M] = useState("贴入自己的纯文字，按你选择的速度估算。"),
    [output, O] = useState<{ r: Result; txt: string; json: string } | null>(
      null,
    );
  const round = useRef(0),
    worker = useRef<Worker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
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
    M("输入已修改，旧结果已清除。");
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
    const id = round.current;
    B(true);
    M("正在本机估算…");
    const fail = (s: string) => {
      if (!live.current || id !== round.current) return;
      stop();
      clear();
      B(false);
      M(s);
    };
    try {
      const w = new Worker("/vendor/reading-time/estimate-worker.js");
      worker.current = w;
      timer.current = setTimeout(
        () => fail("估算超过2秒，已终止。请缩短文字后重试。"),
        2000,
      );
      w.onerror = (e) => {
        e.preventDefault();
        fail("本机估时组件加载失败，请重试。");
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
          const txt = `阅读估时\n计数单位：${r.units}\n速度：${r.speedUnitsPerMinute}单位/分钟\n约${r.milliseconds / 1000}秒（${r.minutes}分钟）\n${r.definition}\n${r.limitations}\n\n原文：\n${r.text}`;
          const a = URL.createObjectURL(
            new Blob([txt], { type: "text/plain;charset=utf-8" }),
          );
          urls.current.push(a);
          const b = URL.createObjectURL(
            new Blob([JSON.stringify(r, null, 2)], {
              type: "application/json;charset=utf-8",
            }),
          );
          urls.current.push(b);
          O({ r, txt: a, json: b });
          B(false);
          M("已按所填速度估算。结果不是实际阅读能力评估。");
        } catch {
          clear();
          B(false);
          M("导出准备失败，请重新估算。");
        }
      };
      w.postMessage({ text, speed });
    } catch {
      fail("本机估时组件不可用，请重试。");
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
      <h1 className={styles.title}>这段文字，大约要读多久？</h1>
      <p className={styles.intro}>
        按你填写的速度做一个时间估计。文字只在本机处理。
      </p>
      <section className={styles.panel}>
        <label className={styles.field}>
          自己的纯文字（最多20000字符）
          <textarea
            id="read-estimate-input"
            className={styles.input}
            rows={9}
            value={text}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 20000) {
                M("文字超过20000字符，原文保留。");
                return;
              }
              T(e.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          速度（100–1000计数单位/分钟）
          <input
            id="read-estimate-speed"
            className={styles.input}
            value={speed}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 4) {
                M("速度过长，原值保留。");
                return;
              }
              S(e.target.value);
            }}
          />
        </label>
        <p>
          中文近似按字、英文近似按空白片段计数，不做分词。常见中文标点作为分隔；空文字算0。速度是你自己选择的假设。
        </p>
        <div className={styles.buttons}>
          <button
            id="read-estimate-generate"
            className={styles.primary}
            disabled={busy}
            onClick={generate}
          >
            估算时间
          </button>
          <button
            id="read-estimate-cancel"
            className={styles.secondary}
            onClick={() => {
              stop();
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
          <div id="read-estimate-output" style={{ overflowWrap: "anywhere" }}>
            <p>
              约{" "}
              <strong>
                {(output.r.milliseconds / 1000)
                  .toFixed(3)
                  .replace(/\.?0+$/, "")}{" "}
                秒
              </strong>{" "}
              · {output.r.units} 个计数单位
            </p>
            <p>按{output.r.speedUnitsPerMinute}单位/分钟；这只是算术估计。</p>
            <details>
              <summary>本次原文与计数口径</summary>
              <p>{output.r.definition}</p>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {output.r.text}
              </pre>
            </details>
            <div className={styles.buttons}>
              <a
                id="read-estimate-txt"
                className={styles.primary}
                download="reading-estimate.txt"
                href={output.txt}
              >
                下载文字记录
              </a>
              <a
                id="read-estimate-json"
                className={styles.secondary}
                download="reading-estimate.json"
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
          只支持常用BMP汉字、ASCII英文数字与常见中文标点；不支持emoji、扩展汉字、片假名和全角字母数字。结果不评估阅读能力、智力或学习效率，不代替实际计时。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            reading-time稳定1.5.0原函数，MIT。平台固定中文标点分隔，不解析HTML或抓取网址。
            <a href="/vendor/reading-time/SOURCE.md">固定来源</a> ·{" "}
            <a href="/vendor/reading-time/LICENSE">原许可</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
