"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "../avatar/tool.module.css";
import { LIMIT, header, bitmap, png, nativeBusy } from "./runtime";
type Pixel = { pixelate(): Pixel; convertPalette(): Pixel };
type Lib = new (config: {
  from: HTMLCanvasElement;
  to: HTMLCanvasElement;
  scale: number;
  palette: number[][];
}) => Pixel;
type Frame = Window & { LifePixelit?: Lib };
type Result = {
  gridSize: number;
  palette: { number: number; hex: string }[];
  cells: number[][];
  png: { width: number; height: number; cellPixels: number };
  input: { width: number; height: number; format: string };
  transparency: string;
  library: string;
};
export default function PixelGrid() {
  const [file, F] = useState<File | null>(null),
    [grid, G] = useState("32"),
    [colours, C] = useState(
      "#000000\n#FFFFFF\n#E63946\n#457B9D\n#F4A261\n#2A9D8F\n#E9C46A\n#8D5A97",
    ),
    [ready, R] = useState(false),
    [attempt, A] = useState(0),
    [busy, B] = useState(false),
    [status, M] = useState("正在准备本机像素组件…"),
    [output, O] = useState<{ png: string; json: string; r: Result } | null>(
      null,
    );
  const frame = useRef<HTMLIFrameElement | null>(null),
    live = useRef(true),
    round = useRef(0),
    cancelNative = useRef<(() => void) | null>(null),
    reader = useRef<FileReader | null>(null),
    urls = useRef<string[]>([]),
    loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    loadExpired = useRef(false);
  function invalidate() {
    round.current++;
    cancelNative.current?.();
    cancelNative.current = null;
    if (reader.current?.readyState === 1) reader.current.abort();
    reader.current = null;
    urls.current.splice(0).forEach(URL.revokeObjectURL);
    O(null);
    B(false);
  }
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      round.current++;
      cancelNative.current?.();
      if (reader.current?.readyState === 1) reader.current.abort();
      urls.current.splice(0).forEach(URL.revokeObjectURL);
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, []);
  useEffect(() => {
    R(false);
    loadExpired.current = false;
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => {
      loadExpired.current = true;
      R(false);
      M("组件加载超过8秒，请点击重新加载。");
    }, 8000);
    // An SSR iframe can finish before React attaches onLoad. Read its ready constructor too.
    if (
      typeof (frame.current?.contentWindow as Frame | null)?.LifePixelit ===
      "function"
    )
      onFrame();
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, [attempt]);
  function onFrame() {
    if (loadExpired.current || !live.current) return;
    if (loadTimer.current) clearTimeout(loadTimer.current);
    const ok =
      typeof (frame.current?.contentWindow as Frame | null)?.LifePixelit ===
      "function";
    R(ok);
    M(
      ok
        ? "选一张自己的图片，再选网格与调色板。"
        : "组件加载失败，请点击重新加载。",
    );
  }
  function edit() {
    invalidate();
    M("输入已修改，旧结果已清除。");
  }
  function read(f: File) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const r = new FileReader();
      reader.current = r;
      const t = setTimeout(() => {
        r.abort();
      }, 8000);
      r.onload = () => {
        clearTimeout(t);
        if (reader.current === r) reader.current = null;
        r.result instanceof ArrayBuffer
          ? resolve(r.result)
          : reject(Error("文件读取失败。"));
      };
      r.onerror = () => {
        clearTimeout(t);
        if (reader.current === r) reader.current = null;
        reject(Error("文件读取失败。"));
      };
      r.onabort = () => {
        clearTimeout(t);
        if (reader.current === r) reader.current = null;
        reject(Error("文件读取已取消或超过8秒。"));
      };
      r.readAsArrayBuffer(f);
    });
  }
  async function generate() {
    if (nativeBusy()) {
      M(
        "上次图片处理仍在收尾，暂不能重开，请稍后重试；若长时间无响应，可刷新此页。",
      );
      return;
    }
    invalidate();
    const id = round.current;
    let source: ImageBitmap | null = null;
    try {
      if (!file || file.size < 1 || file.size > LIMIT)
        throw Error("请选择不超过5MiB的PNG/JPEG图片。");
      if (!["32", "64"].includes(grid)) throw Error("请选择32或64格。");
      const values = colours
        .trim()
        .toUpperCase()
        .split(/[\s,]+/);
      if (
        values.length < 4 ||
        values.length > 16 ||
        values.some((c) => !/^#[0-9A-F]{6}$/.test(c)) ||
        new Set(values).size !== values.length
      )
        throw Error("请提供4–16个不同的六位HEX颜色。");
      const palette = values.map((s) =>
        [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)),
      );
      const library = (frame.current?.contentWindow as Frame | null)
        ?.LifePixelit;
      if (!library || !ready) throw Error("组件未就绪，请重新加载。");
      B(true);
      M("正在本机做像素格…");
      const bytes = await read(file);
      if (!live.current || id !== round.current) return;
      const info = header(bytes);
      const decode = bitmap(
        new Blob([bytes], {
          type: info.format === "PNG" ? "image/png" : "image/jpeg",
        }),
      );
      cancelNative.current = decode.cancel;
      source = await decode.promise;
      cancelNative.current = null;
      if (!live.current || id !== round.current) {
        source.close();
        source = null;
        return;
      }
      if (
        source.width > 2048 ||
        source.height > 2048 ||
        source.width * source.height > 4000000
      )
        throw Error("实际解码尺寸超出限制。");
      const doc = frame.current?.contentDocument;
      if (!doc) throw Error("像素组件已离开，请重试。");
      const small = doc.createElement("canvas"),
        draw = doc.createElement("canvas");
      small.width = small.height = 128;
      const ctx = small.getContext("2d");
      if (!ctx) throw Error("此浏览器不支持画布。");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 128, 128);
      const scale = Math.min(128 / source.width, 128 / source.height),
        w = source.width * scale,
        h = source.height * scale;
      ctx.drawImage(source, (128 - w) / 2, (128 - h) / 2, w, h);
      source.close();
      source = null;
      const n = Number(grid);
      try {
        const art = new library({
          from: small,
          to: draw,
          scale: (n / 128) * 100,
          palette,
        });
        art.pixelate().convertPalette();
      } finally {
        for (const c of Array.from(doc.body.querySelectorAll("canvas")))
          c.remove();
      }
      if (draw.width !== 128 || draw.height !== 128)
        throw Error("像素组件返回尺寸异常。");
      const artctx = draw.getContext("2d");
      if (!artctx) throw Error("像素画布不可用。");
      const data = artctx.getImageData(0, 0, 128, 128).data,
        step = 128 / n,
        cells: number[][] = [];
      for (let y = 0; y < n; y++) {
        const row: number[] = [];
        for (let x = 0; x < n; x++) {
          const k = ((y * step + step / 2) * 128 + x * step + step / 2) * 4;
          const colour = palette.findIndex(
            (c) =>
              c[0] === data[k] && c[1] === data[k + 1] && c[2] === data[k + 2],
          );
          if (colour < 0 || data[k + 3] !== 255)
            throw Error("像素颜色不在调色板内，请重试。");
          row.push(colour + 1);
        }
        cells.push(row);
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const outctx = canvas.getContext("2d");
      if (!outctx) throw Error("导出画布不可用。");
      outctx.imageSmoothingEnabled = false;
      outctx.drawImage(draw, 0, 0, 512, 512);
      const encode = png(canvas);
      cancelNative.current = encode.cancel;
      const blob = await encode.promise;
      cancelNative.current = null;
      if (!live.current || id !== round.current) return;
      const result: Result = {
        library: "Pixelit fixede19053e",
        gridSize: n,
        palette: values.map((hex, i) => ({ number: i + 1, hex })),
        cells,
        png: { width: 512, height: 512, cellPixels: 512 / n },
        input: info,
        transparency: "原图透明和方形留白先铺白，再配色；结果全部不透明。",
      };
      const a = URL.createObjectURL(blob);
      urls.current.push(a);
      const b = URL.createObjectURL(
        new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json;charset=utf-8",
        }),
      );
      urls.current.push(b);
      O({ png: a, json: b, r: result });
      B(false);
      M("像素格已生成，PNG和每格色号JSON可以下载。");
    } catch (e) {
      if (!live.current || id !== round.current) return;
      urls.current.splice(0).forEach(URL.revokeObjectURL);
      O(null);
      B(false);
      M(
        e instanceof Error && /^(?:[\u4e00-\u9fff]|PNG|JPEG)/.test(e.message)
          ? e.message
          : "图片处理或导出失败，请重试。",
      );
    } finally {
      source?.close();
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
      <h1 className={styles.title}>把照片做成像素格小图</h1>
      <p className={styles.intro}>
        选一张自己的图片，用有限颜色做小格子草图。不上传，不需要模型。
      </p>
      <iframe
        key={attempt}
        ref={frame}
        title="本机像素处理组件"
        src="/vendor/pixelit/frame.html"
        onLoad={onFrame}
        style={{ display: "none" }}
      />
      <section className={styles.panel}>
        <label className={styles.field}>
          自己的静态PNG或JPEG（≤5MiB）
          <input
            id="pixel-grid-file"
            className={styles.input}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              edit();
              F(e.target.files?.[0] || null);
            }}
          />
        </label>
        <label className={styles.field}>
          网格
          <select
            id="pixel-grid-size"
            className={styles.select}
            value={grid}
            onChange={(e) => {
              edit();
              G(e.target.value);
            }}
          >
            <option value="32">32×32格</option>
            <option value="64">64×64格</option>
          </select>
        </label>
        <label className={styles.field}>
          4–16个HEX颜色，每行一个
          <textarea
            id="pixel-grid-palette"
            className={styles.input}
            rows={6}
            value={colours}
            onChange={(e) => {
              edit();
              if (e.target.value.length > 256) {
                M("调色板过长，原值保留。");
                return;
              }
              C(e.target.value);
            }}
          />
        </label>
        <p>
          透明区域和方形留白先铺白，再配色；输出没有透明通道空洞。原图先缩到128×128以内，结果为512×512
          PNG和每格色号。
        </p>
        <div className={styles.buttons}>
          <button
            id="pixel-grid-generate"
            className={styles.primary}
            disabled={!ready || busy}
            onClick={generate}
          >
            做像素格
          </button>
          <button
            id="pixel-grid-cancel"
            className={styles.secondary}
            onClick={() => {
              invalidate();
              M("已取消；原生编码若未结束，需要等待收尾。");
            }}
          >
            取消
          </button>
          <button
            id="pixel-grid-retry"
            className={styles.secondary}
            onClick={() => {
              invalidate();
              A((v) => v + 1);
            }}
          >
            重新加载组件
          </button>
        </div>
        <p role="status">{status}</p>
        {output && (
          <div id="pixel-grid-output">
            <img
              id="pixel-grid-preview"
              src={output.png}
              alt="本机生成的像素格图"
              style={{ maxWidth: "100%", height: "auto", display: "block" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {output.r.palette.map((c) => (
                <span key={c.number} style={{ overflowWrap: "anywhere" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      background: c.hex,
                      border: "1px solid #aaa",
                    }}
                  />
                  {c.number} {c.hex}
                </span>
              ))}
            </div>
            <div className={styles.buttons}>
              <a
                id="pixel-grid-png"
                className={styles.primary}
                href={output.png}
                download="pixel-grid.png"
              >
                下载PNG
              </a>
              <a
                id="pixel-grid-json"
                className={styles.secondary}
                href={output.json}
                download="pixel-grid.json"
              >
                下载每格色号JSON
              </a>
            </div>
          </div>
        )}
      </section>
      <footer className={styles.footer}>
        <p>
          只做有限像素格草图，不用于专业印刷校色或特定拼豆材料认证。不同浏览器缩图效果可能不同；取消后编码可能仍需收尾，旧结果不会恢复。
        </p>
        <details>
          <summary>开源来源与范围</summary>
          <p>
            Pixelit固定e19053e原库，MIT；based-on8bit原MIT一并保留。原pixelate和convertPalette实际参与，平台管理预检、缩图、色号和导出。
            <a href="/vendor/pixelit/SOURCE.md">固定来源</a>
          </p>
        </details>
      </footer>
    </main>
  );
}
