import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out = process.env.WORD_OUT || "../../../../outputs/word-search-evidence";
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
  if (ordinal <= Number(process.env.WORD_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const f = (id, v) => p.locator("#word-search-" + id).fill(v),
  g = () => p.locator("#word-search-generate").click(),
  done = () =>
    p.waitForFunction(
      () => !document.querySelector("#word-search-generate").disabled,
    );
const reset = async () => {
  await f("input", "春天\n花朵\n朋友\n快乐");
  await f("size", "10");
  await p.locator("#word-search-answer").uncheck();
};
const save = async (id, name) => {
  const w = p.waitForEvent("download");
  await p.locator("#word-search-" + id).click();
  const d = await w;
  await d.saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name);
};
try {
  await p.goto("http://127.0.0.1:3200/tools/word-search");
  await p.locator("#word-search-generate").waitFor();
  await check("default Chinese actual SVG PNG JSON", async () => {
    await reset();
    await g();
    await p.locator("#word-search-png").waitFor();
    const j = JSON.parse((await save("json", "default.json")).toString());
    assert.deepEqual(j.words, ["春天", "花朵", "朋友", "快乐"]);
    await save("svg", "default.svg");
    await save("png", "default.png");
  });
  await check(
    "English normalized max six letters minimum grid two words actual artifacts",
    async () => {
      await reset();
      await f("input", "apple\nbanana");
      await f("size", "8");
      await p.locator("#word-search-answer").check();
      await g();
      await p.locator("#word-search-json").waitFor();
      const j = JSON.parse((await save("json", "english.json")).toString());
      assert.deepEqual(j.words, ["APPLE", "BANANA"]);
      await save("svg", "english.svg");
      await save("png", "english.png");
    },
  );
  await check(
    "eight Chinese words forty characters max grid actual artifacts",
    async () => {
      await reset();
      await f(
        "input",
        "甲乙丙丁戊\n春夏秋冬天\n朋友来家玩\n今天好开心\n一起去公园\n花朵和蝴蝶\n小猫小狗狗\n快乐每一天",
      );
      await f("size", "16");
      await p.locator("#word-search-answer").check();
      await g();
      await p.locator("#word-search-json").waitFor();
      const j = JSON.parse((await save("json", "max.json")).toString());
      assert.equal(j.words.length, 8);
      assert.equal(j.words.join("").length, 40);
      await save("svg", "max.svg");
      await save("png", "max.png");
    },
  );
  await check(
    "mixed emoji extension Han duplicates blank and counts rejected",
    async () => {
      await reset();
      for (const text of [
        "春天\nAPPLE",
        "春天\n😀😀",
        "春天\n𠀀𠀀",
        "春天\n春天",
        "apple\nAPPLE",
        "春天\n\n花朵",
        "春天",
        "春\n花朵",
        "一二三四五六七\n花朵",
        Array(9).fill("春天").join("\n"),
        "春天\n花\u0001朵",
      ]) {
        await f("input", text);
        await g();
        await done();
        assert.equal(await p.locator("#word-search-output").count(), 0);
      }
    },
  );
  await check(
    "strict size total word chars and overlong edit retains content",
    async () => {
      await reset();
      for (const size of ["7", "17", "-1", "ab", "8."]) {
        await f("size", size);
        await g();
        await done();
        assert.match(await p.locator("[role=status]").textContent(), /8–16/);
      }
      await reset();
      await f(
        "input",
        Array.from({ length: 8 }, (_, i) =>
          String.fromCharCode(65 + i).repeat(6),
        ).join("\n"),
      );
      await g();
      await done();
      assert.match(await p.locator("[role=status]").textContent(), /40字/);
      const prev = await p.locator("#word-search-input").inputValue();
      await f("input", "x".repeat(257));
      assert.equal(await p.locator("#word-search-input").inputValue(), prev);
    },
  );
  await check(
    "editing clears downloads and source missing error retry",
    async () => {
      await reset();
      await g();
      await p.locator("#word-search-png").waitFor();
      await f("size", "9");
      assert.equal(await p.locator("#word-search-png").count(), 0);
      await p.route("**/vendor/wordfind/wordfind.js", (r) => r.abort());
      await g();
      await done();
      assert.match(
        await p.locator("[role=status]").textContent(),
        /组件加载失败/,
      );
      await p.unroute("**/vendor/wordfind/wordfind.js");
      await g();
      await p.locator("#word-search-png").waitFor();
    },
  );
  await check(
    "unplaceable error and fixed attempt constraints controlled at actual original API",
    async () => {
      await reset();
      const original = await fs.readFile(
        "public/vendor/wordfind/wordfind.js",
        "utf8",
      );
      await p.route("**/vendor/wordfind/wordfind.js", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body:
            original +
            '\nwordfind.newPuzzle=function(words,opts){if(opts.maxAttempts!==5||opts.maxGridGrowth!==0||opts.orientations.join()!=\"horizontal,vertical\")return [];throw Error(\"controlled impossible placement\")};wordfind.newPuzzleLax=function(){throw Error(\"forbidden dropping words\")};',
        }),
      );
      await g();
      await done();
      assert.match(
        await p.locator("[role=status]").textContent(),
        /没有把全部词放好/,
      );
      assert.equal(await p.locator("#word-search-png").count(), 0);
      await p.unroute("**/vendor/wordfind/wordfind.js");
    },
  );
  await check(
    "partial JSON Blob URL failure releases previous artifacts and retries",
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
      assert.equal(await p.locator("#word-search-png").count(), 0);
      assert((await p.evaluate(() => window.__rev.length)) >= 3);
      await p.evaluate(() => window.__restore());
      await g();
      await p.locator("#word-search-png").waitFor();
    },
  );
  await check("actual worker two seconds and cancel dead loop", async () => {
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
    await p.route("**/vendor/wordfind/word-search-worker.js", (r) =>
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
    await p.locator("#word-search-cancel").click();
    assert.equal(await p.evaluate(() => window.__term), 2);
    await p.unroute("**/vendor/wordfind/word-search-worker.js");
  });
  await check(
    "PNG null controlled and actual encoding entry cancellation rejects late output",
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
      assert.match(
        await p.locator("[role=status]").textContent(),
        /PNG导出失败/,
      );
      await p.evaluate(
        () =>
          (HTMLCanvasElement.prototype.toBlob = function (cb, ...a) {
            window.__entered = true;
            window.__canvas.call(
              this,
              (b) => setTimeout(() => cb(b), 500),
              ...a,
            );
          }),
      );
      await g();
      await p.waitForFunction(() => window.__entered === true);
      await f("size", "11");
      await p.waitForTimeout(700);
      assert.equal(await p.locator("#word-search-png").count(), 0);
      await p.evaluate(
        () => (HTMLCanvasElement.prototype.toBlob = window.__canvas),
      );
    },
  );
  await check(
    "390 full grid Chinese preview downloads visible no overflow",
    async () => {
      await reset();
      await f("size", "16");
      await p.setViewportSize({ width: 390, height: 844 });
      await g();
      await p.locator("#word-search-png").waitFor();
      await p.locator("#word-search-png").scrollIntoViewIfNeeded();
      assert(await p.locator("#word-search-json").isVisible());
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({ path: out + "/mobile.png", fullPage: true });
    },
  );
  await check("actual NextLink unmount releases all three URLs", async () => {
    await p.evaluate(() => {
      window.__gone = [];
      const r = URL.revokeObjectURL;
      URL.revokeObjectURL = (u) => {
        window.__gone.push(u);
        r(u);
      };
    });
    await p.getByRole("link", { name: "← 回到新发现" }).click();
    await p.locator("#word-search-generate").waitFor({ state: "detached" });
    assert.equal(await p.evaluate(() => window.__gone.length), 3);
  });
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
