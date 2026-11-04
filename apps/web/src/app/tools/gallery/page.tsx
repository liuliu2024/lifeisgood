"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadLocalScript, canvasPng } from "../avatar/browser-local";
import { inspectPhoto } from "../crop/photo-utils";
import styles from "./gallery.module.css";

type Photo = { name: string; url: string; width: number; height: number; bytes: number };
type LocalViewer = { view(index: number): void; zoom(ratio: number): void; rotateTo(degrees: number): void; reset(): void; destroy(): void };
type ViewerConstructor = new (element: HTMLElement, options: Record<string, unknown>) => LocalViewer;
declare global { interface Window { Viewer?: ViewerConstructor } }

let viewerStyles: Promise<void> | null = null;
function loadViewerStyles(): Promise<void> {
  if (viewerStyles) return viewerStyles;
  const old = document.querySelector<HTMLLinkElement>("link[data-viewer-local]");
  if (old?.sheet) return Promise.resolve();
  viewerStyles = new Promise<void>((resolve, reject) => {
    const link = old ?? document.createElement("link");
    const cleanup = () => { clearTimeout(timer); link.removeEventListener("load", done); link.removeEventListener("error", failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); link.remove(); viewerStyles = null; reject(new Error("相册样式加载失败，请刷新后重试。")); };
    const timer = setTimeout(failed, 10000);
    link.addEventListener("load", done, { once: true }); link.addEventListener("error", failed, { once: true });
    if (!old) { link.rel = "stylesheet"; link.href = "/vendor/viewer/viewer.min.css"; link.dataset.viewerLocal = "true"; document.head.appendChild(link); }
  });
  return viewerStyles;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [error, setError] = useState("");
  const [download, setDownload] = useState("");
  const [libraryReady, setLibraryReady] = useState(false);
  const source = useRef<HTMLUListElement>(null);
  const viewer = useRef<LocalViewer | null>(null);
  const generation = useRef(0);
  const fileUrls = useRef<string[]>([]);
  const downloadUrl = useRef("");
  const currentAngle = useRef(0);
  const currentIndex = useRef(0);
  const busyRef = useRef(false);

  function clearDownload() {
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    downloadUrl.current = ""; setDownload("");
  }
  useEffect(() => {
    let active = true;
    void Promise.all([loadLocalScript("/vendor/viewer/viewer.min.js"), loadViewerStyles()]).then(() => {
      if (active && window.Viewer) setLibraryReady(true);
    }).catch(problem => { if (active) setError(problem.message); });
    return () => {
      active = false; generation.current++; viewer.current?.destroy(); viewer.current = null;
      fileUrls.current.forEach(url => URL.revokeObjectURL(url));
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!photos.length || !libraryReady || !source.current || !window.Viewer) return;
    let active = true;
    setViewReady(false);
    const instance = new window.Viewer(source.current, {
      inline: true, toolbar: false, navbar: false, title: false, button: false,
      keyboard: false, tooltip: false, transition: false, toggleOnDblclick: false,
      rotatable: true, scalable: false, movable: true, zoomable: true,
      zoomOnWheel: true, minHeight: 380, minWidth: 0,
      viewed(event: CustomEvent<{ index: number }>) {
        if (!active) return;
        currentIndex.current = event.detail.index; currentAngle.current = 0;
        setIndex(event.detail.index); setAngle(0); setViewReady(true); clearDownload();
      },
    });
    viewer.current = instance;
    return () => { active = false; instance.destroy(); if (viewer.current === instance) viewer.current = null; };
  }, [photos, libraryReady]);

  async function selectFiles(files: File[]) {
    const task = ++generation.current;
    busyRef.current = true; setBusy(true); setError(""); setViewReady(false); clearDownload();
    viewer.current?.destroy(); viewer.current = null;
    fileUrls.current.forEach(url => URL.revokeObjectURL(url)); fileUrls.current = [];
    setPhotos([]); setIndex(0); setAngle(0); currentAngle.current = 0; currentIndex.current = 0;
    const staged: string[] = [];
    try {
      if (!files.length) throw new Error("请先选择照片。");
      if (files.length > 12) throw new Error("一次最多选择12张照片。");
      if (files.reduce((n, file) => n + file.size, 0) > 30 * 1024 * 1024) throw new Error("照片合计超过30 MiB，请分批选择。");
      const next: Photo[] = []; let pixels = 0;
      for (const file of files) {
        const info = await inspectPhoto(file);
        if (task !== generation.current) return;
        pixels += info.width * info.height;
        if (pixels > 32_000_000) throw new Error("照片合计超过3200万像素，请分批选择。");
        const url = URL.createObjectURL(file); staged.push(url);
        const image = new Image(); image.src = url;
        try { await image.decode(); } catch { throw new Error("照片无法解码，文件可能已损坏，请换一张照片。"); }
        if (task !== generation.current) return;
        if (image.naturalWidth * image.naturalHeight > 16_000_000) throw new Error("解码后的图片超过1600万像素。");
        next.push({ name: file.name, url, width: image.naturalWidth, height: image.naturalHeight, bytes: file.size });
      }
      if (task !== generation.current) return;
      fileUrls.current = staged.splice(0);
      setPhotos(next);
    } catch (problem) { if (task === generation.current) setError(problem instanceof Error ? problem.message : "照片打开失败，请换一组照片。"); }
    finally {
      staged.forEach(url => URL.revokeObjectURL(url));
      if (task === generation.current) { busyRef.current = false; setBusy(false); }
    }
  }
  function choose(next: number) {
    if (!viewReady || busyRef.current) return;
    clearDownload(); setViewReady(false); viewer.current?.view(next);
  }
  function rotate() {
    if (!viewReady || busyRef.current) return;
    clearDownload(); currentAngle.current = (currentAngle.current + 90) % 360;
    setAngle(currentAngle.current); viewer.current?.rotateTo(currentAngle.current);
  }
  async function exportPhoto() {
    const photo = photos[currentIndex.current];
    if (!photo || !viewReady || busyRef.current) return;
    const task = generation.current, turn = currentAngle.current;
    busyRef.current = true; setBusy(true); setError(""); clearDownload();
    try {
      const image = new Image(); image.src = photo.url;
      try { await image.decode(); } catch { throw new Error("照片无法读取，请重新选择后再导出。"); }
      if (task !== generation.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = turn % 180 ? image.naturalHeight : image.naturalWidth;
      canvas.height = turn % 180 ? image.naturalWidth : image.naturalHeight;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("浏览器无法生成图片。");
      ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(turn * Math.PI / 180);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      const blob = await canvasPng(canvas); canvas.width = 0; canvas.height = 0;
      if (task !== generation.current) return;
      downloadUrl.current = URL.createObjectURL(blob); setDownload(downloadUrl.current);
    } catch (problem) { if (task === generation.current) setError(problem instanceof Error ? problem.message : "导出失败，请重试。"); }
    finally { if (task === generation.current) { busyRef.current = false; setBusy(false); } }
  }
  const selected = photos[index];
  return <main className={styles.page}>
    <Link href="/" className={styles.back}>← 返回生活小助手</Link>
    <header><span className={styles.eyebrow}>生活小工具 · 本机相册</span><h1>把照片放大，慢慢看</h1><p>一次放进几张照片，切换查看、放大拖动，也能把转正的照片保存下来。</p></header>
    <div className={styles.columns}>
      <section className={styles.controls} aria-label="相册设置"><h2>选择自己的照片</h2>
        <label className={styles.file}>选择照片<input aria-label="选择照片" type="file" accept="image/png,image/jpeg" multiple disabled={busy || !libraryReady} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) void selectFiles(files); }} /></label>
        <p className={styles.help}>支持JPG、PNG，每张10 MiB/1600万像素，最多12张，合计30 MiB/3200万像素。照片只在本机浏览器处理。</p>
        {selected && <p className={styles.selected}>{index + 1} / {photos.length} · {selected.name}<br />{selected.width} × {selected.height} · 已旋转{angle}°</p>}
        <div className={styles.buttons}>
          <button disabled={!viewReady || busy || photos.length < 2} onClick={() => choose((index - 1 + photos.length) % photos.length)}>上一张</button>
          <button disabled={!viewReady || busy || photos.length < 2} onClick={() => choose((index + 1) % photos.length)}>下一张</button>
          <button disabled={!viewReady || busy} onClick={() => viewer.current?.zoom(.2)}>放大</button>
          <button disabled={!viewReady || busy} onClick={() => viewer.current?.zoom(-.2)}>缩小</button>
          <button disabled={!viewReady || busy} onClick={rotate}>顺时针旋转90°</button>
          <button disabled={!viewReady || busy} onClick={() => { viewer.current?.reset(); currentAngle.current = 0; setAngle(0); clearDownload(); }}>恢复视图</button>
        </div>
        <button className={styles.primary} disabled={!viewReady || busy} onClick={() => void exportPhoto()}>{busy ? "正在处理…" : "生成当前照片PNG"}</button>
        {download && <a className={styles.download} href={download} download="转正后的照片.png">下载当前照片PNG</a>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.help}>保存所选照片的原始尺寸与旋转结果，放大、拖动仅供查看，不会裁掉画面。导出清理原文件EXIF等信息，JPEG会转换为PNG，可能更大。</p>
      </section>
      <section className={styles.preview} aria-label="照片预览"><div className={styles.frame} data-gallery-frame>
        {photos.length ? <ul ref={source} className={styles.source}>{photos.map((photo, n) => <li key={photo.url}><img src={photo.url} alt={`照片${n + 1}`} /></li>)}</ul> : <div className={styles.empty}><span>▧</span><h2>让照片占满这一块</h2><p>{libraryReady ? "选择照片后，就可以在这里放大、旋转与拖动。" : "正在准备本机相册…"}</p></div>}
      </div>
      {photos.length > 0 && <div className={styles.thumbs} aria-label="照片列表">{photos.map((photo, n) => <button key={photo.url} aria-label={`查看第${n + 1}张照片`} aria-pressed={index === n} disabled={busy || !viewReady || index === n} onClick={() => choose(n)}><img src={photo.url} alt="" /><span>{n + 1}. {photo.name}</span></button>)}</div>}
      </section>
    </div>
    <footer>基于 <a href="https://github.com/fengyuanchen/viewerjs" target="_blank" rel="noreferrer">Viewer.js 1.11.7</a>（MIT）的中文网页封装。不会修改电脑里的原文件；未提供云相册或账号同步。</footer>
  </main>;
}
