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
  { key: "wheel", path: "/tools/wheel", title: "今天选什么，转一下", description: "用自己的选项转动选择，保存落点与结果JSON。", repo: "https://github.com/buuing/lucky-canvas", accepted: true },
  { key: "csv", path: "/tools/csv", title: "把CSV表格整理清楚", description: "本机预览并选择保留列，保存CSV和二维JSON。", repo: "https://github.com/mholt/PapaParse", accepted: true },
  { key: "barcode", path: "/tools/barcode", title: "做一张清楚的条形码", description: "生成CODE128或EAN13，下载条形码SVG和PNG。", repo: "https://github.com/lindell/JsBarcode", accepted: true },
  { key: "qr", path: "/tools/qr", title: "做个清楚的二维码", description: "本机生成文字或网址二维码，下载PNG与SVG。", repo: "https://github.com/soldair/node-qrcode", accepted: true },
  { key: "pdf", path: "/tools/pdf", title: "把PDF合起来或取出几页", description: "合并两份PDF或按顺序取页，预览并保存新文件。", repo: "https://github.com/Hopding/pdf-lib", accepted: true },
  { key: "charts", path: "/tools/charts", title: "把数字画成一张图", description: "输入自己的数字，制作柱状、折线或圆环图PNG。", repo: "https://github.com/chartjs/Chart.js", accepted: true },
  { key: "signature", path: "/tools/signature", title: "写下自己的手写签名", description: "在本机手写板留下手迹，下载透明或白底PNG/SVG。", repo: "https://github.com/szimek/signature_pad", accepted: true },
  { key: "sketch-card", path: "/tools/sketch-card", title: "做一张手绘风小卡片", description: "用短文字和手绘形状制作生活卡片，保存PNG/SVG。", repo: "https://github.com/rough-stuff/rough", accepted: true },
  { key: "text-diff", path: "/tools/text-diff", title: "看看两段文字哪里不同", description: "在本机对照文字增删，保存纯文本和JSON结果。", repo: "https://github.com/kpdecker/jsdiff", accepted: true },
] as const;

export const toolRuntimeSources: Record<string, {version: string; license: string; source: string; scope?: string}> = {
  signature: {version: "Signature Pad 5.1.3", license: "MIT（无运行依赖）", source: "/vendor/signature-pad/SOURCE.md", scope: "1000×500手迹PNG/SVG；100笔/每笔500点/总5000点，不提供身份验证或法律签章。"},
  "sketch-card": {version: "Rough.js 4.6.6", license: "MIT（内嵌四依赖原文分别保留）", source: "/vendor/rough/SOURCE.md", scope: "两种尺寸、四种形状、1–6装饰与短文字PNG/SVG，不导入照片或任意SVG。"},
  "text-diff": {version: "jsdiff 8.0.2", license: "BSD-3-Clause（字符ESM依赖闭包）", source: "/vendor/jsdiff/SOURCE.md", scope: "每段20000 UTF16/48KiB/1000行，本机Worker字符比较及TXT/JSON；过慢或差异过多终止。"},
  gallery: {version: "Viewer.js 1.11.7", license: "MIT", source: "/vendor/viewer/SOURCE.md"},
  gradient: {version: "chroma.js 3.2.0", license: "BSD-3-Clause AND Apache-2.0", source: "/vendor/chroma/SOURCE.md"},
  contrast: {version: "TinyColor 1.6.0", license: "MIT", source: "/vendor/tinycolor/SOURCE.md"},
  collage: {version: "Konva 9.3.18", license: "MIT（保留KineticJS与Konva署名）", source: "/vendor/konva/SOURCE.md", scope: "2–6张自有照片拖动、缩放、拼贴PNG；文字和贴纸尚未接入。"},
  mindmap: {version: "markmap-view 0.18.12 + D3 7.9.0", license: "MIT、ISC、WTFPL2（各依赖原文保留）", source: "/vendor/markmap/SOURCE.md", scope: "标题层级的纯文字导图，最多80节点/6层；下载静态SVG，不提供AI总结或云同步。"},
  wheel: {version: "lucky-canvas 1.7.26", license: "Apache-2.0（内嵌Microsoft辅助声明保留）", source: "/vendor/lucky-canvas/SOURCE.md", scope: "2–20个文字选项，本机生活小决定与结果JSON；不用于金钱奖品或营销开奖。"},
  csv: {version: "PapaParse 5.5.3", license: "MIT", source: "/vendor/papaparse/SOURCE.md", scope: "UTF-8 CSV、2MiB/10000行；位置选列，危险公式前缀导出为文本，JSON保留字符串。"},
  barcode: {version: "JsBarcode 3.12.1", license: "MIT；ZXing仅验收不随站点", source: "/vendor/jsbarcode/SOURCE.md", scope: "CODE128可打印ASCII或EAN13，PNG/SVG；独立回读已验，真机扫码和打印仍未验。"},
  qr: {version: "node-qrcode 1.5.4", license: "MIT（含dijkstrajs1.0.3原文）", source: "/vendor/node-qrcode/SOURCE.md", scope: "1200 UTF-8字节、版本≤27、每模块≥4px的黑白二维码；PNG/SVG，真机和打印未验。"},
  pdf: {version: "pdf-lib 1.17.1", license: "MIT；附Apache-2.0/Zlib/0BSD/字体度量声明", source: "/vendor/pdf-lib/SOURCE.md", scope: "两份原页合并/按序取页；每输入20MiB/200页，输出400页/60MiB，新窗口预览，不含OCR或新排字。"},
  charts: {version: "Chart.js 4.5.1", license: "MIT（含kurkle/color0.3.2）", source: "/vendor/chartjs/SOURCE.md", scope: "2–12行数字，柱/线/圆环，1200×800或960×960 PNG；不提供自动商业分析。"},
};

export function acceptedTool(key?: string | null) { return usableTools.find(tool => tool.key === key && tool.accepted); }
