export type Shape = "rectangle" | "circle" | "triangle" | "diamond";
export type Settings = { title: string; body: string; shape: string; count: string; seed: string; stroke: string; fill: string; paper: string; size: string; fillStyle: string; roughness: string };
type Options = { seed: number; stroke: string; strokeWidth: number; roughness: number; fill?: string; fillStyle?: string; hachureGap?: number; fillWeight?: number; fixedDecimalPlaceDigits: number };
type Renderer = { rectangle(x: number, y: number, w: number, h: number, options: Options): SVGGElement; circle(x: number, y: number, size: number, options: Options): SVGGElement; polygon(points: number[][], options: Options): SVGGElement; line(x1: number, y1: number, x2: number, y2: number, options: Options): SVGGElement };
export type Rough = { svg(svg: SVGSVGElement): Renderer; generator(): unknown };
const ns = "http://www.w3.org/2000/svg";
const hidden = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/;
const unsafe = /[<>]|https?:\/\/|www\.|(?:javascript|data):/i;
export function validate(input: Settings) {
  const title = input.title.trim(), lines = input.body.split(/\r?\n/).map(value => value.trim());
  if (!title || Array.from(title).length > 16 || hidden.test(title)) throw new Error("标题请填写1–16字符，不含控制或隐藏方向字符。");
  if (input.body.length > 200 || lines.length < 1 || lines.length > 3 || lines.some(line => !line || Array.from(line).length > 20 || hidden.test(line))) throw new Error("正文请填写1–3个非空行，每行最多20字符，总长度不超过200字符。");
  if ([title, ...lines].some(value => unsafe.test(value))) throw new Error("只接受短文字，不接受HTML/SVG标签、图片地址或链接。");
  if (!/^[1-6]$/.test(input.count)) throw new Error("装饰数量请填写1–6之间的整数。");
  if (!/^[1-9]\d{0,8}$/.test(input.seed)) throw new Error("随机种子请填写1–999999999之间的整数，不带前导0。");
  if (!["rectangle", "circle", "triangle", "diamond"].includes(input.shape)) throw new Error("请选择支持的几何形状。");
  if (!["landscape", "portrait"].includes(input.size) || !["hachure", "solid"].includes(input.fillStyle) || !["1.2", "2.2", "3.2"].includes(input.roughness)) throw new Error("请选择支持的画布或手绘样式。");
  if (![input.stroke, input.fill, input.paper].every(color => /^#[0-9a-f]{6}$/i.test(color))) throw new Error("颜色必须是完整六位HEX色号，例如 #28765D。");
  return { title, lines, count: Number(input.count), seed: Number(input.seed), width: input.size === "portrait" ? 768 : 1024, height: input.size === "portrait" ? 1024 : 768 };
}

export function assertSafeSvg(svg: SVGSVGElement) {
  const attributes: Record<string, Set<string>> = {
    svg: new Set(["xmlns", "width", "height", "viewBox"]),
    rect: new Set(["x", "y", "width", "height", "fill"]),
    g: new Set(),
    path: new Set(["d", "stroke", "stroke-width", "fill", "fill-rule"]),
    text: new Set(["x", "y", "fill", "font-family", "font-size", "font-weight"]),
    desc: new Set()
  };
  const nodes = [svg, ...Array.from(svg.querySelectorAll("*"))];
  if (nodes.length > 100) throw new Error("图形对象超限，请减少装饰。");
  for (const node of nodes) {
    const allowed = attributes[node.localName];
    if (node.namespaceURI !== ns || !allowed) throw new Error("输出包含不支持的SVG元素。");
    for (const attribute of Array.from(node.attributes)) {
      if (!allowed.has(attribute.name) || /url\s*\(|(?:https?|data|javascript):/i.test(attribute.value) && attribute.name !== "xmlns") throw new Error("输出包含不安全的SVG属性。");
      if (attribute.name === "d" && (attribute.value.length > 100000 || !/^[MLCZ0-9eE.,+\-\s]+$/.test(attribute.value))) throw new Error("输出路径超限或无效。");
    }
  }
}

export function makeCard(rough: Rough, input: Settings) {
  const checked = validate(input), { title, lines, count, seed, width, height } = checked;
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("xmlns", ns); svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height)); svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const background = document.createElementNS(ns, "rect");
  background.setAttribute("width", String(width)); background.setAttribute("height", String(height)); background.setAttribute("fill", input.paper); svg.append(background);
  const description = document.createElementNS(ns, "desc"); description.textContent = `Rough.js 4.6.6；种子${seed}；装饰${count}个；${input.shape}`; svg.append(description);
  const renderer = rough.svg(svg);
  let object = 0;
  const options = (filled = false): Options => ({ seed: seed + (++object) * 101, stroke: input.stroke, strokeWidth: 3, roughness: Number(input.roughness), fixedDecimalPlaceDigits: 2, ...(filled ? { fill: input.fill, fillStyle: input.fillStyle, hachureGap: 7, fillWeight: 2.4 } : {}) });
  svg.append(renderer.rectangle(32, 32, width - 64, height - 64, options()));
  const portrait = input.size === "portrait", left = portrait ? 80 : 88;
  function text(value: string, x: number, y: number, size: number, bold = false) {
    const node = document.createElementNS(ns, "text"); node.textContent = value;
    node.setAttribute("x", String(x)); node.setAttribute("y", String(y)); node.setAttribute("fill", input.stroke); node.setAttribute("font-family", "'Microsoft YaHei', system-ui, sans-serif"); node.setAttribute("font-size", String(size)); node.setAttribute("font-weight", bold ? "700" : "400"); svg.append(node);
  }
  const titleChars = Array.from(title), chunk = portrait ? 8 : 14;
  const titleLines = Array.from({ length: Math.ceil(titleChars.length / chunk) }, (_, index) => titleChars.slice(index * chunk, (index + 1) * chunk).join(""));
  titleLines.forEach((line, index) => text(line, left, 128 + index * 60, portrait ? 44 : 50, true));
  const ruleY = 160 + (titleLines.length - 1) * 60;
  svg.append(renderer.line(left, ruleY, width - left, ruleY, options()));
  lines.forEach((line, index) => text(line, left, ruleY + 78 + index * 62, portrait ? 28 : 32));
  const centerY = height - 150, available = width - left * 2;
  for (let index = 0; index < count; index++) {
    const centerX = left + (index + .5) * available / count;
    const radius = Math.min(44, available / count / 2 - 10), filled = options(true);
    if (input.shape === "circle") svg.append(renderer.circle(centerX, centerY, radius * 2, filled));
    else if (input.shape === "rectangle") svg.append(renderer.rectangle(centerX - radius, centerY - radius * .8, radius * 2, radius * 1.6, filled));
    else if (input.shape === "triangle") svg.append(renderer.polygon([[centerX, centerY - radius], [centerX + radius, centerY + radius], [centerX - radius, centerY + radius]], filled));
    else svg.append(renderer.polygon([[centerX, centerY - radius], [centerX + radius, centerY], [centerX, centerY + radius], [centerX - radius, centerY]], filled));
  }
  svg.append(renderer.line(left, height - 76, width - left, height - 76, options()));
  assertSafeSvg(svg);
  const markup = new XMLSerializer().serializeToString(svg);
  if (new Blob([markup]).size > 200000) throw new Error("SVG输出超过200KB，请减少装饰。");
  return { markup, width, height, seed, title, count };
}
