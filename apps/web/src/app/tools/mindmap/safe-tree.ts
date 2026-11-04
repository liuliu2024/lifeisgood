export type SafeNode = { content: string; children: SafeNode[] };
export const EXAMPLE = "# 本周生活计划\n## 家庭与生活\n### 整理照片\n### 买一束花\n## 工作安排\n### 准备门店海报\n### 回访老客户\n## 留给自己\n### 散步与阅读";
function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
export function parseTree(source: string): { root: SafeNode; count: number } {
  if (!source.trim()) throw new Error("先写一个主题和几条分支，再生成导图。");
  if (source.length > 6000) throw new Error("文字超过6000字，请精简后再试。");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(source)) throw new Error("文字中含有无法显示的控制字符，请删除后再试。");
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 80) throw new Error("最多80个主题节点，请拆成几张导图。");
  let root: SafeNode | undefined; const stack: SafeNode[] = [];
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (!match) throw new Error(`第${index + 1}个非空行需要用1到6个#加空格表示层级。`);
    const depth = match[1].length, label = match[2].trim();
    if (label.length > 100) throw new Error(`第${index + 1}个主题超过100字，请缩短。`);
    if (index === 0 && depth !== 1) throw new Error("第一行请用一个#开头，作为整张导图的主题。");
    if (index && depth === 1) throw new Error("每张导图只能有一个一级主题，其余分支请用##或更多#。");
    if (depth > stack.length + 1) throw new Error(`第${index + 1}个主题跳过了层级，请按顺序增加#。`);
    const node: SafeNode = { content: escapeHtml(label), children: [] };
    if (!index) root = node; else stack[depth - 2].children.push(node);
    stack[depth - 1] = node; stack.length = depth;
  });
  return { root: root!, count: lines.length };
}

const ns = "http://www.w3.org/2000/svg";
/** Fresh SVG geometry + text nodes only: never serialize the upstream foreignObject DOM. */
export function exportSafeSvg(source: SVGSVGElement): string {
  const main = source.querySelector<SVGGElement>(":scope > g");
  if (!main) throw new Error("导图尚未准备好，请重新生成。");
  const rect = main.getBBox();
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0 || rect.width > 20000 || rect.height > 20000) throw new Error("导图尺寸异常，请减少节点后再试。");
  const doc = document.implementation.createDocument(ns, "svg", null), svg = doc.documentElement;
  const width = Math.ceil(rect.width + 64), height = Math.ceil(rect.height + 64);
  svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height)); svg.setAttribute("viewBox", `${rect.x - 32} ${rect.y - 32} ${width} ${height}`);
  svg.setAttribute("role", "img");
  const title = doc.createElementNS(ns, "title"); title.textContent = "生活小助手 · 文字思维导图"; svg.appendChild(title);
  const background = doc.createElementNS(ns, "rect"); background.setAttribute("x", String(rect.x - 32)); background.setAttribute("y", String(rect.y - 32)); background.setAttribute("width", String(width)); background.setAttribute("height", String(height)); background.setAttribute("fill", "#ffffff"); svg.appendChild(background);
  const color = (value: string | null) => value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : "#377254";
  for (const path of main.querySelectorAll<SVGPathElement>("path.markmap-link")) {
    const d = path.getAttribute("d") || "";
    if (!d || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(d)) throw new Error("导图连线数据异常，请重新生成。");
    const safe = doc.createElementNS(ns, "path"); safe.setAttribute("d", d); safe.setAttribute("fill", "none"); safe.setAttribute("stroke", color(path.getAttribute("stroke"))); safe.setAttribute("stroke-width", "2"); svg.appendChild(safe);
  }
  for (const node of main.querySelectorAll<SVGGElement>("g.markmap-node")) {
    const transform = node.getAttribute("transform") || "";
    if (!/^translate\(\s*[-+\d.eE]+\s*[, ]\s*[-+\d.eE]+\s*\)$/.test(transform)) throw new Error("导图坐标异常，请重新生成。");
    const group = doc.createElementNS(ns, "g"); group.setAttribute("transform", transform);
    const fo = node.querySelector<SVGForeignObjectElement>("foreignObject");
    const text = doc.createElementNS(ns, "text");
    text.setAttribute("x", "8"); text.setAttribute("y", "16"); text.setAttribute("fill", "#213d2d"); text.setAttribute("font-family", "sans-serif"); text.setAttribute("font-size", "16");
    text.textContent = fo?.textContent || ""; group.appendChild(text);
    const underline = node.querySelector("line");
    if (underline) {
      const safe = doc.createElementNS(ns, "line");
      for (const attr of ["x1", "y1", "x2", "y2"]) { const value = underline.getAttribute(attr) || "0"; if (!Number.isFinite(Number(value))) throw new Error("导图线条坐标异常。"); safe.setAttribute(attr, value); }
      safe.setAttribute("stroke", color(underline.getAttribute("stroke"))); safe.setAttribute("stroke-width", "2"); group.appendChild(safe);
    }
    svg.appendChild(group);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
}
