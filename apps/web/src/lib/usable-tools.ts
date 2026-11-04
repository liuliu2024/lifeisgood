// Only entries with actual input/output browser evidence are accepted here.
// Library-backed Chinese tools are platform wrappers, not whole upstream apps.
export const usableTools = [
  { key: "avatar", path: "/tools/avatar", title: "做一个专属几何头像", description: "输入昵称，生成自己的图案，下载PNG或SVG。", repo: "https://github.com/dmester/jdenticon", accepted: true },
  { key: "palette", path: "/tools/palette", title: "从照片提取好看的配色", description: "从自己的照片取色，保存色卡和颜色清单。", repo: "https://github.com/lokesh/color-thief", accepted: true },
  { key: "crop", path: "/tools/crop", title: "把照片裁成合适的大小", description: "拖动裁剪框、选比例、旋转，再下载图片。", repo: "https://github.com/fengyuanchen/cropperjs", accepted: true },
  { key: "compress", path: "/tools/compress", title: "让照片小一点、更好发送", description: "调整图片体积和尺寸，查看真实压缩结果。", repo: "https://github.com/Donaldcwl/browser-image-compression", accepted: true },
  { key: "zip", path: "/tools/zip", title: "把几份文件打包发出去", description: "本机选择文件，整理成一个ZIP下载。", repo: "https://github.com/Stuk/jszip", accepted: true },
  { key: "notes", path: "/tools/notes", title: "把小便签排得清清楚楚", description: "用简单标记写清单和笔记，预览后保存。", repo: "https://github.com/markdown-it/markdown-it", accepted: true },
  { key: "gallery", path: "/tools/gallery", title: "把一组照片放大慢慢看", description: "在本机相册放大、拖动、旋转，下载转正后的照片。", repo: "https://github.com/fengyuanchen/viewerjs", accepted: true },
  { key: "gradient", path: "/tools/gradient", title: "做一组自然的渐变配色", description: "指定颜色，生成渐变色卡，下载PNG、CSS和JSON。", repo: "https://github.com/gka/chroma.js", accepted: true },
  { key: "contrast", path: "/tools/contrast", title: "让文字和背景更容易看清", description: "比较文字与背景的纯色对比，下载示例图和结果。", repo: "https://github.com/bgrins/TinyColor", accepted: true },
  { key: "collage", path: "/tools/collage", title: "把几张照片拼成一张", description: "本机选择照片、拖动缩放、保存拼贴PNG。", repo: "https://github.com/konvajs/konva", accepted: true },
  { key: "mindmap", path: "/tools/mindmap", title: "把笔记变成思维导图", description: "用标题层级整理想法，下载完整静态SVG。", repo: "https://github.com/markmap/markmap", accepted: true },
] as const;

export const toolRuntimeSources: Record<string, {version: string; license: string; source: string; scope?: string}> = {
  gallery: {version: "Viewer.js 1.11.7", license: "MIT", source: "/vendor/viewer/SOURCE.md"},
  gradient: {version: "chroma.js 3.2.0", license: "BSD-3-Clause AND Apache-2.0", source: "/vendor/chroma/SOURCE.md"},
  contrast: {version: "TinyColor 1.6.0", license: "MIT", source: "/vendor/tinycolor/SOURCE.md"},
  collage: {version: "Konva 9.3.18", license: "MIT（保留KineticJS与Konva署名）", source: "/vendor/konva/SOURCE.md", scope: "2–6张自有照片拖动、缩放、拼贴PNG；文字和贴纸尚未接入。"},
  mindmap: {version: "markmap-view 0.18.12 + D3 7.9.0", license: "MIT、ISC、WTFPL2（各依赖原文保留）", source: "/vendor/markmap/SOURCE.md", scope: "标题层级的纯文字导图，最多80节点/6层；下载静态SVG，不提供AI总结或云同步。"},
};

export function acceptedTool(key?: string | null) { return usableTools.find(tool => tool.key === key && tool.accepted); }
