self.window = self;
self.onmessage = ({ data }) => {
  try {
    try {
      importScripts("./wordfind.js");
    } catch {
      throw Error("本机找词组件加载失败，请重试。");
    }
    const { text, size, showAnswer } = data;
    if (
      typeof text !== "string" ||
      text.length > 256 ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)
    )
      throw Error("词表超长或含控制字符。");
    if (!/^(8|9|1[0-6])$/.test(size)) throw Error("格数须8–16整数。");
    const words = text
      .replace(/\r\n?/g, "\n")
      .trim()
      .split("\n")
      .map((x) => x.trim().toUpperCase());
    if (
      words.length < 2 ||
      words.length > 8 ||
      words.some((w) => w.length < 2 || w.length > 6) ||
      words.reduce((s, w) => s + w.length, 0) > 40
    )
      throw Error("请填2–8个词，每词2–6字，总计不超过40字。");
    const chinese = words.every((w) => /^[\u4e00-\u9fff]+$/.test(w)),
      english = words.every((w) => /^[A-Z]+$/.test(w));
    if (!chinese && !english)
      throw Error("一局只用常用汉字或英文字母，不能混用；不支持emoji。");
    if (new Set(words).size !== words.length)
      throw Error("词语重复，请换成不同的词。");
    const n = Number(size),
      pool = [...new Set(words.join(""))];
    let grid;
    try {
      grid = self.wordfind.newPuzzle(words, {
        width: n,
        height: n,
        orientations: ["horizontal", "vertical"],
        maxAttempts: 5,
        maxGridGrowth: 0,
        fillBlanks: () => pool[Math.floor(Math.random() * pool.length)],
        preferOverlap: true,
      });
    } catch {
      throw Error("这次没有把全部词放好，请重试、减少词语或增大格子。");
    }
    if (
      grid.length !== n ||
      grid.some(
        (row) =>
          row.length !== n ||
          row.some(
            (c) => typeof c !== "string" || c.length !== 1 || !pool.includes(c),
          ),
      )
    )
      throw Error("生成的字表不完整，请重试。");
    const solved = self.wordfind.solve(grid, words);
    if (solved.notFound.length) throw Error("原库未能找全词语，请重试。");
    const answers = words.map((word) => {
      const positions = [];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          for (const [dx, dy, direction] of [
            [1, 0, "horizontal"],
            [0, 1, "vertical"],
          ]) {
            if (
              x + dx * (word.length - 1) >= n ||
              y + dy * (word.length - 1) >= n
            )
              continue;
            if ([...word].every((c, i) => grid[y + dy * i][x + dx * i] === c))
              positions.push({ x, y, direction });
          }
      if (!positions.length) throw Error("没有找到全部横竖词语，请重试。");
      return { word, positions };
    });
    self.postMessage({
      ok: true,
      result: {
        library: "wordfind.js fixed579ef5a",
        size: n,
        alphabet: chinese ? "chinese-bmp" : "english-uppercase",
        words,
        grid,
        answers,
        showAnswer: !!showAnswer,
        limitations:
          "从左向右或从上向下找词。每词至少出现一次，随机填字可能额外出现；JSON包含全部横竖匹配位置，非唯一答案保证。",
      },
    });
  } catch (e) {
    self.postMessage({
      ok: false,
      error: e instanceof Error ? e.message : "生成失败。",
    });
  }
};
