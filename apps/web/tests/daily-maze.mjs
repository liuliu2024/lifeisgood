import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out = process.env.MAZE_OUT || "../../../../outputs/maze-evidence";
await fs.mkdir(out, { recursive: true });
const b = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [],
  external = [],
  results = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("request", (r) => {
  if (
    /^https?:/.test(r.url()) &&
    !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.url())
  )
    external.push(r.url());
});
let ordinal = 0;
const check = async (name, f) => {
  ordinal++;
  if (ordinal <= Number(process.env.MAZE_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const f = (id, v) => p.locator("#maze-" + id).fill(v),
  g = () => p.locator("#maze-generate").click(),
  done = () =>
    p.waitForFunction(() => !document.querySelector("#maze-generate").disabled);
const reset = async () => {
  await f("width", "10");
  await f("height", "10");
  await f("seed", "1");
  await p.locator("#maze-solution").uncheck();
};
const save = async (id, name) => {
  const w = p.waitForEvent("download");
  await p.locator("#maze-" + id).click();
  const d = await w;
  await d.saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name);
};
try {
  await p.goto("http://127.0.0.1:3200/tools/maze");
  await p.locator("#maze-generate").waitFor();
  await check("default actual JSON SVG PNG generation", async () => {
    await reset();
    await g();
    await p.locator("#maze-png").waitFor();
    const j = JSON.parse((await save("json", "default.json")).toString());
    await save("svg", "default.svg");
    await save("png", "default.png");
    assert.equal(j.cells.length, 10);
    assert.equal(j.cells[0].length, 10);
  });
  await check("same seed byte exact and changed seed different", async () => {
    await reset();
    await g();
    await p.locator("#maze-png").waitFor();
    const a = await save("json", "same.json");
    assert.deepEqual(a, await fs.readFile(out + "/default.json"));
    await f("seed", "2");
    await g();
    await p.locator("#maze-png").waitFor();
    const c = await save("json", "changed.json");
    assert.notDeepEqual(c, a);
    await save("svg", "changed.svg");
    await save("png", "changed.png");
  });
  await check(
    "5 minimum 25 maximum rectangular and route visible actual outputs",
    async () => {
      for (const [w, h, seed, stem] of [
        ["5", "5", "0", "min"],
        ["25", "25", "2147483647", "max"],
        ["5", "25", "13579", "rect"],
      ]) {
        await f("width", w);
        await f("height", h);
        await f("seed", seed);
        await p.locator("#maze-solution").check();
        await g();
        await p.locator("#maze-png").waitFor();
        await save("json", stem + ".json");
        const s = (await save("svg", stem + ".svg")).toString();
        await save("png", stem + ".png");
        assert.match(s, /<polyline/);
        assert(!/href=|<script|foreignObject|onload=/.test(s));
      }
    },
  );
  await check("strict dimensions seed and overlong values refuse", async () => {
    await reset();
    for (const [id, v] of [
      ["width", "4"],
      ["width", "26"],
      ["width", "5.5"],
      ["height", "-1"],
      ["seed", "2147483648"],
      ["seed", "1e3"],
      ["seed", "-1"],
    ]) {
      await reset();
      await f(id, v);
      await g();
      await done();
      assert.equal(await p.locator("#maze-output").count(), 0);
      assert.match(await p.locator("[role=status]").textContent(), /5–25/);
    }
    await reset();
    await f("seed", "12345678901");
    assert.equal(await p.locator("#maze-seed").inputValue(), "1");
  });
  await check("edit clears stale download", async () => {
    await reset();
    await g();
    await p.locator("#maze-png").waitFor();
    await f("seed", "3");
    assert.equal(await p.locator("#maze-png").count(), 0);
  });
  await check("missing library controlled and retry succeeds", async () => {
    await reset();
    await p.route("**/vendor/generate-maze/generate-maze.modern.js", (r) =>
      r.abort(),
    );
    await g();
    await done();
    assert.match(
      await p.locator("[role=status]").textContent(),
      /组件加载失败/,
    );
    assert.equal(await p.locator("#maze-output").count(), 0);
    await p.unroute("**/vendor/generate-maze/generate-maze.modern.js");
    await g();
    await p.locator("#maze-png").waitFor();
  });
  await check(
    "JSON Blob URL failure releases all partial artifacts and retries",
    async () => {
      await reset();
      await p.evaluate(() => {
        window.__rev = [];
        const c = URL.createObjectURL,
          r = URL.revokeObjectURL;
        URL.createObjectURL = (b) => {
          if (b.type.startsWith("application/json")) throw Error("controlled");
          return c(b);
        };
        URL.revokeObjectURL = (u) => {
          window.__rev.push(u);
          r(u);
        };
        window.__restore = () => {
          URL.createObjectURL = c;
          URL.revokeObjectURL = r;
        };
      });
      await g();
      await done();
      assert.equal(await p.locator("#maze-png").count(), 0);
      assert((await p.evaluate(() => window.__rev.length)) >= 3);
      await p.evaluate(() => window.__restore());
      await g();
      await p.locator("#maze-png").waitFor();
    },
  );
  await check("actual worker 2s deadline terminate and cancel", async () => {
    await reset();
    await p.evaluate(() => {
      window.__term = 0;
      const W = Worker;
      window.Worker = class extends W {
        terminate() {
          window.__term++;
          super.terminate();
        }
      };
    });
    await p.route("**/vendor/generate-maze/maze-worker.js", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: "self.onmessage=()=>{while(true){}}",
      }),
    );
    await g();
    await p.waitForFunction(() =>
      document.querySelector("[role=status]").textContent.includes("超过2秒"),
    );
    assert.equal(await p.evaluate(() => window.__term), 1);
    await g();
    await p.locator("#maze-cancel").click();
    assert.equal(await p.evaluate(() => window.__term), 2);
    await p.unroute("**/vendor/generate-maze/maze-worker.js");
  });
  await check(
    "async PNG Blob null and delayed old encoding canceled",
    async () => {
      await reset();
      await p.evaluate(() => {
        window.__canvas = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (cb) {
          cb(null);
        };
      });
      await g();
      await done();
      assert.equal(await p.locator("#maze-output").count(), 0);
      assert.match(
        await p.locator("[role=status]").textContent(),
        /PNG导出失败/,
      );
      await p.evaluate(() => {
        HTMLCanvasElement.prototype.toBlob = function (cb, ...a) {
          window.__mazeBlobEntered = true;
          window.__canvas.call(this, (b) => setTimeout(() => cb(b), 500), ...a);
        };
      });
      await g();
      await p.waitForFunction(() => window.__mazeBlobEntered === true);
      await f("seed", "4");
      await p.waitForTimeout(700);
      assert.equal(await p.locator("#maze-output").count(), 0);
      await p.evaluate(
        () => (HTMLCanvasElement.prototype.toBlob = window.__canvas),
      );
    },
  );
  await check("390 maximum maze preview downloads no overflow", async () => {
    await reset();
    await f("width", "25");
    await f("height", "25");
    await p.setViewportSize({ width: 390, height: 844 });
    await g();
    await p.locator("#maze-png").waitFor();
    await p.locator("#maze-png").scrollIntoViewIfNeeded();
    assert(await p.locator("#maze-png").isVisible());
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: out + "/mobile.png", fullPage: true });
  });
  await check(
    "actual NextLink unmount revokes all three downloads",
    async () => {
      await p.evaluate(() => {
        window.__gone = [];
        const r = URL.revokeObjectURL;
        URL.revokeObjectURL = (u) => {
          window.__gone.push(u);
          r(u);
        };
      });
      await p.getByRole("link", { name: "← 回到新发现" }).click();
      await p.locator("#maze-generate").waitFor({ state: "detached" });
      assert.equal(await p.evaluate(() => window.__gone.length), 3);
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
} finally {
  await fs.writeFile(
    out + "/browser.json",
    JSON.stringify({ results, errors, external }, null, 2),
  );
  await b.close();
}
console.log(JSON.stringify({ passed: results.length, errors, external }));
