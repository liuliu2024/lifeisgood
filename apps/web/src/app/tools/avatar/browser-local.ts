const scriptLoads = new Map<string, Promise<void>>();

export function loadLocalScript(source: string): Promise<void> {
  if (!scriptLoads.has(source)) {
    scriptLoads.set(source, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); scriptLoads.delete(source); reject(new Error("工具文件加载失败，请刷新后重试。")); };
      document.head.appendChild(script);
    }));
  }
  return scriptLoads.get(source)!;
}

export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("图片导出失败，请重试。")), "image/png"));
}

export function makeUrl(blob: Blob, urls: string[]): string {
  const url = URL.createObjectURL(blob);
  urls.push(url);
  return url;
}

export function clearUrls(urls: string[]): void {
  urls.splice(0).forEach(url => URL.revokeObjectURL(url));
}
