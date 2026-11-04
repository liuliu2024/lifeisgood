export type Converter = { toWords(integer: number): string };
const simple = "零一二三四五六七八九", capital = "零壹贰叁肆伍陆柒捌玖";
const digit = (char: string, table: string) => table[char.charCodeAt(0) - 48];
function decodedInteger(text: string) {
  const digits = "零一二三四五六七八九"; let total = BigInt('0'), group = BigInt('0'), current = BigInt('0'), lastBig = BigInt('1000000000');
  for (const char of text) {
    const index = digits.indexOf(char);
    if (index >= 0) { current = BigInt(index); continue; }
    const unit = ({ 十: BigInt('10'), 百: BigInt('100'), 千: BigInt('1000'), 萬: BigInt('10000'), 億: BigInt('100000000') } as Record<string, bigint>)[char];
    if (!unit) throw new Error("原库返回不支持的字或单位，请换一个数值。");
    if (unit < BigInt('10000')) { group += (current || BigInt('1')) * unit; current = BigInt('0'); }
    else { if (unit >= lastBig) throw new Error("原库返回无法核对的数位顺序。"); total += (group + current) * unit; group = current = BigInt('0'); lastBig = unit; }
  }
  return total + group + current;
}
export function convert(converter: Converter, input: string, mode: string) {
  if (!["number", "money"].includes(mode)) throw new Error("请选择中文数字或人民币金额大写。");
  if (!/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(input)) throw new Error("请输入普通十进制：最多12位整数、2位小数；不带前导0、空格、加号、千分位、指数或公式。超过2位小数会拒绝，不会舍入。");
  const negative = input.startsWith("-"), unsigned = negative ? input.slice(1) : input, [integer, fraction = ""] = unsigned.split(".");
  if (mode === "money" && negative) throw new Error("金额模式只接受非负数；负数请选中文数字模式。");
  const groups: { digits: string; coreWords: string }[] = [];
  for (let end = integer.length; end > 0; end -= 4) groups.unshift({ digits: integer.slice(Math.max(0, end - 4), end), coreWords: "" });
  let raw = "", zeroBridge = false;
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index], value = Number(group.digits);
    const words = converter.toWords(value);
    if (typeof words !== "string" || words.length > 20 || !/^[零一二三四五六七八九十百千]+$/.test(words) || decodedInteger(words) !== BigInt(group.digits)) throw new Error("原库四位小组输出无法保真核对，已拒绝生成。");
    group.coreWords = words;
    if (value === 0) { if (raw) zeroBridge = true; continue; }
    const previous = !!raw;
    if (previous && (zeroBridge || value < 1000)) raw += "零";
    raw += (previous && words.startsWith("十") ? "一" + words : words) + ["", "萬", "億"][groups.length - index - 1]; zeroBridge = false;
  }
  if (!raw) raw = "零";
  if (raw.length > 100 || decodedInteger(raw) !== BigInt(integer)) throw new Error("平台四位组装后无法保真核对，已拒绝生成。");
  let text: string, normalized: string;
  if (mode === "number") {
    text = (negative ? "负" : "") + raw.replace(/萬/g, "万").replace(/億/g, "亿") + (fraction ? "点" + [...fraction].map(c => digit(c, simple)).join("") : ""); normalized = input;
  } else {
    const mapping: Record<string, string> = { 零: "零", 一: "壹", 二: "贰", 三: "叁", 四: "肆", 五: "伍", 六: "陆", 七: "柒", 八: "捌", 九: "玖", 十: "拾", 百: "佰", 千: "仟", 萬: "万", 億: "亿" };
    const whole = [...(raw.startsWith("十") ? "一" + raw : raw)].map(c => mapping[c]).join("");
    const cents = fraction.padEnd(2, "0"), jiao = cents[0], fen = cents[1];
    text = "人民币" + whole + "元";
    if (jiao === "0" && fen === "0") text += "整";
    else { if (jiao !== "0") text += digit(jiao, capital) + "角"; else if (integer !== "0") text += "零"; if (fen !== "0") text += digit(fen, capital) + "分"; else text += "整"; }
    normalized = integer + "." + cents;
  }
  if (text.length > 160) throw new Error("输出超过160字符，请缩小数值。");
  return { tool: "中文数字与金额大写", library: "digi3studio/number-to-chinese-words1.0.20", mode, originalInput: input, normalizedValue: normalized, text, assembledIntegerWords: raw, integerGroups: groups, limits: { integerDigits: 12, fractionalDigits: 2, rounding: "不舍入；超过2位小数拒绝", moneyRule: "平台新增四位组拼接、简体大写及元角分包装；整分为0时加整，零角有分且元非零时加零；元为0时仍保留零元。金额只接受非负数。" }, scope: "原库仅处理0–9999小组；平台按字符串拆最多3组并拼亿/万/零桥，组内及完整值均回读核对。整体大数及小数不转Number。不是银行票据或法定格式合规验证。" };
}
