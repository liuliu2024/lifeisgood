self.onmessage = async ({ data }) => {
  try {
    let generate;
    try {
      ({ default: generate } = await import("./generate-maze.modern.js"));
    } catch {
      throw Error("本机迷宫组件加载失败，请重试。");
    }
    const { width, height, seed, showSolution } = data;
    if (
      !/^([5-9]|1\d|2[0-5])$/.test(width) ||
      !/^([5-9]|1\d|2[0-5])$/.test(height) ||
      !/^\d{1,10}$/.test(seed) ||
      Number(seed) > 2147483647
    )
      throw Error("行列须5–25整数，种子须0–2147483647整数。");
    const w = Number(width),
      h = Number(height),
      s = Number(seed),
      cells = generate(w, h, true, s);
    if (cells.length !== h) throw Error("迷宫结构异常。");
    const next = Array.from({ length: w * h }, () => []);
    let edges = 0;
    for (let y = 0; y < h; y++) {
      if (cells[y].length !== w) throw Error("迷宫结构异常。");
      for (let x = 0; x < w; x++) {
        const c = cells[y][x];
        if (
          c.x !== x ||
          c.y !== y ||
          !["top", "right", "bottom", "left"].every(
            (k) => typeof c[k] === "boolean",
          )
        )
          throw Error("迷宫格子异常。");
        if (
          (y === 0 && !c.top) ||
          (x === 0 && !c.left) ||
          (y === h - 1 && !c.bottom) ||
          (x === w - 1 && !c.right)
        )
          throw Error("边界异常。");
        for (const [dx, dy, k, op] of [
          [1, 0, "right", "left"],
          [0, 1, "bottom", "top"],
        ]) {
          if (x + dx >= w || y + dy >= h) continue;
          const other = cells[y + dy][x + dx];
          if (c[k] !== other[op]) throw Error("相邻墙不一致。");
          if (!c[k]) {
            const a = y * w + x,
              b = (y + dy) * w + x + dx;
            next[a].push(b);
            next[b].push(a);
            edges++;
          }
        }
      }
    }
    const parent = Array(w * h).fill(-1),
      queue = [0];
    parent[0] = 0;
    for (let i = 0; i < queue.length; i++)
      for (const n of next[queue[i]])
        if (parent[n] === -1) {
          parent[n] = queue[i];
          queue.push(n);
        }
    if (queue.length !== w * h || edges !== w * h - 1)
      throw Error("本次迷宫未通过连通树检查，请换种子。");
    const solution = [];
    for (let n = w * h - 1; ; n = parent[n]) {
      solution.push([n % w, Math.floor(n / w)]);
      if (n === 0) break;
    }
    solution.reverse();
    self.postMessage({
      ok: true,
      result: {
        library: "generate-maze1.1.0",
        width: w,
        height: h,
        seed: s,
        showSolution: !!showSolution,
        cells,
        solution,
        limitations:
          "参考路线在JSON中；图片仅打开左上入口和右下出口。固定种子只在当前运行环境复现，不承诺跨引擎一致、专业难度或打印机效果。",
      },
    });
  } catch (e) {
    self.postMessage({
      ok: false,
      error: e instanceof Error ? e.message : "生成失败。",
    });
  }
};
