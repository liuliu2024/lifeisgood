self.onmessage = async ({ data }) => {
  try {
    if (typeof BigInt !== "function")
      throw Error("此浏览器不支持原生BigInt，不能保证精确分数。");
    let Fraction;
    try {
      ({ default: Fraction } = await import("./fraction.mjs"));
    } catch {
      throw Error("本机组件加载失败，请重试。");
    }
    const { source, target, text } = data;
    if (
      !/^(?:[1-9]|[1-9]\d|100)$/.test(source) ||
      !/^(?:[1-9]|[1-9]\d|100)$/.test(target)
    )
      throw Error("原人数和目标人数须为1–100整数。");
    if (
      typeof text !== "string" ||
      text.length > 12000 ||
      new TextEncoder().encode(text).length > 65536 ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)
    )
      throw Error("原料文字超长或含控制字符。");
    const lines = text.replace(/\r\n?/g, "\n").trim().split("\n");
    if (lines.length < 1 || lines.length > 20)
      throw Error("请填写1–20行原料。");
    const ratio = new Fraction(target).div(source);
    const rows = lines.map((line, i) => {
      const parts = line.split("|").map((x) => x.trim());
      if (parts.length !== 3)
        throw Error(`第${i + 1}行请按名称 | 数量 | 单位填写。`);
      const [name, quantity, unit] = parts;
      if (!name || name.length > 40 || !unit || unit.length > 20)
        throw Error(`第${i + 1}行名称或单位为空或超长。`);
      if (!/^(?:\d{1,7}(?:\.\d{1,6})?|\d{1,7}\/\d{1,7})$/.test(quantity))
        throw Error(`第${i + 1}行数量只支持正整数、6位内小数或a/b。`);
      let q;
      if (quantity.includes("/")) {
        const [a, b] = quantity.split("/").map(BigInt);
        if (a < 1n || a > 1000000n || b < 1n || b > 1000000n)
          throw Error(`第${i + 1}行分子分母须1–1000000。`);
        q = new Fraction(quantity);
      } else {
        q = new Fraction(quantity);
        if (q.compare(0) <= 0 || q.compare(1000000) > 0)
          throw Error(`第${i + 1}行数量须大于0且不超过1000000。`);
      }
      const value = q.mul(ratio);
      const n = value.n,
        d = value.d;
      const scaled = (n * 1000000n * 2n + d) / (2n * d);
      const str = scaled.toString().padStart(7, "0");
      const approx = str.slice(0, -6) + "." + str.slice(-6);
      return {
        name,
        originalQuantity: quantity,
        unit,
        exact: value.toFraction(),
        approximate: approx,
      };
    });
    self.postMessage({
      ok: true,
      result: {
        library: "Fraction.js5.3.4",
        sourcePeople: Number(source),
        targetPeople: Number(target),
        ratio: ratio.toFraction(),
        rows,
        limitations:
          "仅原料份量按人数算术缩放；单位原样保留，不换单位、不推断密度、营养或烹饪安全。六位小数是近似显示，精确值以分数为准。",
      },
    });
  } catch (e) {
    self.postMessage({
      ok: false,
      error: e instanceof Error ? e.message : "处理失败。",
    });
  }
};
