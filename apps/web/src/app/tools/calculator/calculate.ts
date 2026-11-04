export type D = { plus(n: D | string): D; minus(n: D | string): D; times(n: D | string): D; div(n: D | string): D; floor(): D; mod(n: D | string): D; isZero(): boolean; isNegative(): boolean; gt(n: D | string): boolean; decimalPlaces(): number; toFixed(dp?: number, rounding?: number): string };
export type DecimalClass = { new(n: string): D; clone(config: Record<string, number>): DecimalClass };
export type Input = { mode: string; operator: string; a: string; b: string; places: string; rounding: string };
export type Result = { tool: string; mode: string; input: Input; precision: string; lines: { label: string; value: string }[] };
export function calculate(Decimal: DecimalClass, input: Input): Result {
  const C = Decimal.clone({ precision: 80, rounding: 4, toExpNeg: -100, toExpPos: 100 });
  if (!["arithmetic", "discount", "unit", "split"].includes(input.mode) || !/^(?:[0-9]|1[0-2])$/.test(input.places) || !["half-up", "half-even"].includes(input.rounding)) throw new Error("请选择支持的计算方式、小数位数和舍入规则。");
  const number = (source: string, label: string) => { if (!/^[+-]?\d{1,24}(?:\.\d{1,12})?$/.test(source)) throw new Error(`${label}须为普通十进制：最多24位整数、12位小数，不含空格、公式、千分位或科学计数法。`); return new C(source); };
  const a = number(input.a, "第一个数"), b = number(input.b, "第二个数");
  const places = Number(input.places), rounding = input.rounding === "half-up" ? 4 : 6;
  const lines: Result["lines"] = [];
  const fixed = (value: D) => { const text = value.toFixed(); if (text.length > 160) throw new Error("计算结果超出160字符上限，请缩小数值。"); return text; };
  const rounded = (value: D) => { let text = value.toFixed(places, rounding); if (/^-0(?:\.0+)?$/.test(text)) text = text.slice(1); if (text.length > 64) throw new Error("显示结果超过64字符，请缩小数值。"); return text; };
  const nonnegative = () => { if (a.isNegative() && !a.isZero()) throw new Error("此模式的总额或原价须为非负数。"); };
  if (input.mode === "split") {
    nonnegative();
    if (!/^[+]?[0-9]{1,24}(?:\.[0-9]{1,2})?$/.test(input.a)) throw new Error("分摊总额最多2位小数，以0.01为最小单位，不先舍入总额。");
    if (!/^(?:[1-9]|[1-9][0-9]|100)$/.test(input.b)) throw new Error("分摊人数须为1–100的整数，不带前导0。");
    const cents = a.times("100"), base = cents.div(b).floor(), remainder = cents.mod(b), high = base.plus("1");
    const extra = Number(remainder.toFixed(0));
    lines.push({ label: "总额（保持原值）", value: a.toFixed(2) }, { label: "人数", value: input.b }, { label: "余分数", value: remainder.toFixed(0) }, { label: "前一组人数", value: String(extra) }, { label: "前一组每人", value: high.div("100").toFixed(2) }, { label: "后一组人数", value: String(Number(input.b) - extra) }, { label: "后一组每人", value: base.div("100").toFixed(2) }, { label: "规则", value: "按输入顺序，前余分数个人各多分摊0.01；无余分时前一组人数为0。两组总和严格等于原总额。此模式固定保留2位，不使用显示舍入设置。" });
  } else {
    let raw: D;
    if (input.mode === "arithmetic") {
      if (!["add", "subtract", "multiply", "divide"].includes(input.operator)) throw new Error("请选择加、减、乘或除。");
      if (input.operator === "divide" && b.isZero()) throw new Error("除数不能为0。");
      raw = input.operator === "add" ? a.plus(b) : input.operator === "subtract" ? a.minus(b) : input.operator === "multiply" ? a.times(b) : a.div(b);
    } else if (input.mode === "discount") {
      nonnegative(); if (b.isNegative() || b.gt("10")) throw new Error("折扣须在0–10折之间，例如8.5表示八五折。");
      raw = a.times(b).div("10"); lines.push({ label: "原价", value: fixed(a) }, { label: "折数", value: fixed(b) }, { label: "节省金额（同规则舍入）", value: rounded(a.minus(raw)) });
    } else {
      nonnegative(); if (b.isZero() || b.isNegative()) throw new Error("数量须大于0。"); raw = a.div(b);
    }
    lines.push({ label: "显示结果", value: rounded(raw) }, { label: "计算值（最多80位有效数字）", value: fixed(raw) }, { label: "显示小数位", value: input.places }, { label: "舍入规则", value: input.rounding === "half-up" ? "四舍五入：恰好中点时向远离0方向舍入" : "银行家舍入：恰好中点时取相邻偶数" });
  }
  return { tool: "decimal.js10.6.0 本机有限十进制计算", mode: input.mode, input: { ...input }, precision: "内部80位有效数字；除不尽的计算值为有界近似，显示按0–12小数舍入。分摊按整数分守恒。所有数值以字符串导出，避免JSON浮点精度损失。", lines };
}
