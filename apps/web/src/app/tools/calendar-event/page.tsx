"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
type Comp = {
  updatePropertyWithValue(k: string, v: unknown): void;
  addSubcomponent(c: Comp): void;
  toString(): string;
};
type Lib = {
  Component: new (x: string) => Comp;
  Time: { fromJSDate(d: Date, u: boolean): unknown };
};
const E = new TextEncoder();
function fold(s: string) {
  const lines = s
      .replace(/\r\n[ \t]/g, "")
      .split(/\r?\n/)
      .filter(Boolean),
    out: string[] = [];
  for (const line of lines) {
    let cur = "",
      n = 0;
    for (const c of line) {
      const m = E.encode(c).length;
      if (n + m > 75) {
        out.push(cur);
        cur = " " + c;
        n = 1 + m;
      } else {
        cur += c;
        n += m;
      }
    }
    out.push(cur);
  }
  return out.join("\r\n") + "\r\n";
}
function date(s: string, offset: number) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(s))
    throw Error("请按示例填写完整日期时间。");
  const d = new Date(s + ":00Z");
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 16) !== s)
    throw Error("日期时间不存在。");
  const r = new Date(+d - offset * 3600000);
  if (r.getUTCFullYear() < 2000 || r.getUTCFullYear() > 2099)
    throw Error("仅支持UTC结果在2000–2099年。");
  return r;
}
export default function CalendarEvent() {
  const [ready, R] = useState(false),
    [title, T] = useState("店铺例会"),
    [description, D] = useState("整理本周要点。"),
    [place, P] = useState(""),
    [start, S] = useState("2026-11-05T09:00"),
    [end, N] = useState("2026-11-05T10:00"),
    [zone, Z] = useState("8"),
    [msg, M] = useState("正在准备本机日历组件…"),
    [output, O] = useState<{ ics: string; json: string } | null>(null);
  const lib = useRef<Lib | null>(null),
    urls = useRef<string[]>([]);
  function clear() {
    urls.current.splice(0).forEach(URL.revokeObjectURL);
    O(null);
  }
  function edit() {
    clear();
    M("输入已更改，请重新生成。");
  }
  useEffect(() => {
    let live = true,
      settled = false;
    const s = document.createElement("script");
    s.type = "module";
    s.src = "/vendor/icaljs/loader.js";
    const timer = setTimeout(() => {
      if (live && !settled) {
        settled = true;
        M("组件加载超时，请刷新重试。");
      }
    }, 8000);
    s.onload = () => {
      clearTimeout(timer);
      if (live && !settled) {
        settled = true;
        lib.current = (window as Window & { LifeICAL?: Lib }).LifeICAL || null;
        R(!!lib.current);
        M(
          lib.current
            ? "填写事项，下载后自行导入日历。"
            : "组件不可用，请刷新重试。",
        );
      }
    };
    s.onerror = () => {
      clearTimeout(timer);
      if (live && !settled) {
        settled = true;
        M("组件加载失败，请刷新重试。");
      }
    };
    document.head.append(s);
    return () => {
      live = false;
      clearTimeout(timer);
      s.remove();
      urls.current.splice(0).forEach(URL.revokeObjectURL);
    };
  }, []);
  function generate() {
    clear();
    try {
      const l = lib.current;
      if (!l) throw Error("组件未就绪，请刷新。");
      const text = (s: string, max: number) => {
        s = s.replace(/\r\n?/g, "\n");
        if (s.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(s))
          throw Error("文字超长或含不支持的控制字符。");
        return s;
      };
      const a = text(title, 100),
        b = text(description, 1000),
        c = text(place, 200);
      if (!a.trim() || a.includes("\n") || c.includes("\n"))
        throw Error("标题须填写，标题和地点不能换行。");
      if (!["0", "8"].includes(zone)) throw Error("请选择有效固定时差。");
      const ds = date(start, Number(zone)),
        de = date(end, Number(zone));
      if (+de <= +ds || +de - +ds > 7 * 86400000)
        throw Error("结束须晚于开始，单事项最多7天。");
      const cal = new l.Component("vcalendar"),
        ev = new l.Component("vevent");
      cal.updatePropertyWithValue("version", "2.0");
      cal.updatePropertyWithValue("prodid", "-//Life Helper//Local Event//ZH");
      ev.updatePropertyWithValue(
        "uid",
        crypto.randomUUID() + "@life-helper.local",
      );
      ev.updatePropertyWithValue(
        "dtstamp",
        l.Time.fromJSDate(new Date(), true),
      );
      ev.updatePropertyWithValue("dtstart", l.Time.fromJSDate(ds, true));
      ev.updatePropertyWithValue("dtend", l.Time.fromJSDate(de, true));
      ev.updatePropertyWithValue("summary", a);
      ev.updatePropertyWithValue("description", b);
      ev.updatePropertyWithValue("location", c);
      cal.addSubcomponent(ev);
      const ics = fold(cal.toString());
      if (E.encode(ics).length > 16384) throw Error("日历文件超过16KiB。");
      const json = JSON.stringify(
        {
          library: "ical.js2.2.1",
          title: a,
          description: b,
          location: c,
          startUTC: ds.toISOString(),
          endUTC: de.toISOString(),
          inputFixedOffsetHours: Number(zone),
          limitations:
            "仅单事项文件；不通知、不发送邀请，固定偏移不自动处理夏令时。",
        },
        null,
        2,
      );
      const u = URL.createObjectURL(
        new Blob([ics], { type: "text/calendar;charset=utf-8" }),
      );
      urls.current.push(u);
      const j = URL.createObjectURL(
        new Blob([json], { type: "application/json;charset=utf-8" }),
      );
      urls.current.push(j);
      O({ ics: u, json: j });
      M("已生成单事项文件。请自行确认时间并导入日历。");
    } catch (e) {
      clear();
      M(e instanceof Error ? e.message : "生成失败，请重试。");
    }
  }
  function change(v: string, max: number, set: (s: string) => void) {
    edit();
    if (v.length > max) {
      M("本次修改超长，原内容保留。");
      return;
    }
    set(v);
  }
  return (
    <main className={styles.shell}>
      <nav className={styles.nav}>
        <a className={styles.brand} href="/">
          生活小助手
        </a>
        <Link className={styles.back} href="/#daily-tools">
          ← 回到新发现
        </Link>
      </nav>
      <h1 className={styles.title}>把一件事放进自己的日历</h1>
      <p className={styles.intro}>
        本机生成ICS文件，不上传、不通知、不代发邀请。
      </p>
      <section className={styles.panel}>
        {[
          ["标题", title, T, 100, "title"],
          ["说明", description, D, 1000, "description"],
          ["地点", place, P, 200, "location"],
          ["开始 YYYY-MM-DDTHH:mm", start, S, 16, "start"],
          ["结束 YYYY-MM-DDTHH:mm", end, N, 16, "end"],
        ].map(([label, value, set, max, id]) => (
          <label className={styles.field} key={String(id)}>
            {String(label)}
            <textarea
              id={"calendar-event-" + id}
              className={styles.input}
              rows={id === "description" ? 4 : 1}
              value={String(value)}
              onChange={(e) =>
                change(e.target.value, Number(max), set as (s: string) => void)
              }
            />
          </label>
        ))}
        <label className={styles.field}>
          输入时间采用
          <select
            id="calendar-event-zone"
            className={styles.select}
            value={zone}
            onChange={(e) => {
              edit();
              Z(e.target.value);
            }}
          >
            <option value="8">北京时间（固定UTC+8）</option>
            <option value="0">UTC（固定零时差）</option>
          </select>
        </label>
        <button
          id="calendar-event-generate"
          className={styles.primary}
          disabled={!ready}
          onClick={generate}
        >
          生成日历文件
        </button>
        <p role="status">{msg}</p>
        {output && (
          <div id="calendar-event-output" className={styles.buttons}>
            <a
              id="calendar-event-ics"
              className={styles.primary}
              href={output.ics}
              download="my-event.ics"
            >
              下载ICS
            </a>
            <a
              id="calendar-event-json"
              className={styles.secondary}
              href={output.json}
              download="my-event.json"
            >
              下载JSON记录
            </a>
          </div>
        )}
      </section>
      <footer className={styles.footer}>
        <p>
          UTC结果2000–2099，最多7天；固定时差不自动处理夏令时。不同日历客户端兼容性未全部验证，导入前请确认时间。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            ICAL.js2.2.1，MPL-2.0，原库未改；平台提供中文有限输入和UTF8折行适配。
            <a href="/vendor/icaljs/SOURCE.md">固定来源与对应原源码</a> ·{" "}
            <a href="/vendor/icaljs/LICENSE">原许可</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
