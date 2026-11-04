import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out =
  process.env.READ_OUT || "../../../../outputs/read-estimate-evidence";
await fs.mkdir(out, { recursive: true });
const b = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1200, height: 900 } }),
  errors = [],
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
  if (ordinal <= Number(process.env.READ_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const f = (id, v) => p.locator("#read-estimate-" + id).fill(v),
  g = () => p.locator("#read-estimate-generate").click(),
  done = () =>
    p.waitForFunction(
      () => !document.querySelector("#read-estimate-generate").disabled,
    );
const save = async (id, name) => {
  const w = p.waitForEvent("download");
  await p.locator("#read-estimate-" + id).click();
  await (await w).saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name, "utf8");
};
const reset = async () => {
  await p.locator("#read-estimate-cancel").click();
  await f("input", "你好，世界！\nHello world.");
  await f("speed", "200");
};
try {
  await p.goto("http://127.0.0.1:3200/tools/read-estimate");
  await p.locator("#read-estimate-generate").waitFor();
  await check(
    "ordinary Chinese English multiline punctuation fifteen actual TXTJSON cases",
    async () => {
      const cases = [
        ["empty", "", 0, "200"],
        ["spaces", " \t\n", 0, "200"],
        ["han", "你好世界", 4, "200"],
        ["quotes", "“你好，世界！”（再见）", 6, "200"],
        ["english", "Hello world.", 2, "200"],
        ["adjacent", "hello,world", 1, "200"],
        ["numbers", "2026 11 05", 3, "200"],
        ["mixed", "你好 world 朋友", 5, "333"],
        ["cn-bound", "hello，world", 2, "200"],
        ["cn-punct", "。！？“”", 0, "200"],
        ["ascii-punct", "...", 1, "200"],
        ["lines", "Hello\r\nworld\t你好。", 4, "200"],
        ["mixed-digit", "第1章", 3, "200"],
        ["tiny", "one", 1, "1000"],
        ["tie", "one", 1, "320"],
      ];
      for (const [name, text, units, speed] of cases) {
        await f("input", text);
        await f("speed", speed);
        await g();
        await p.locator("#read-estimate-json").waitFor();
        const j = JSON.parse(await save("json", name + ".json"));
        await save("txt", name + ".txt");
        assert.equal(j.units, units, name);
        assert.equal(j.speedUnitsPerMinute, Number(speed));
      }
    },
  );
  await check(
    "tiny nonzero time rendered despite upstream zero-minute string",
    async () => {
      await f("input", "one");
      await f("speed", "1000");
      await g();
      await p.locator("#read-estimate-json").waitFor();
      assert.match(
        await p.locator("#read-estimate-output").textContent(),
        /0\.06 秒/,
      );
      const j = JSON.parse(await save("json", "tiny-display.json"));
      assert.equal(j.milliseconds, 60);
      assert.equal(j.upstreamDisplayText, "0 min read");
    },
  );
  await check(
    "actual max20000 Han and speed bounds output without truncation",
    async () => {
      await f("input", "中".repeat(20000));
      await f("speed", "1000");
      await g();
      await p.locator("#read-estimate-json").waitFor();
      const j = JSON.parse(await save("json", "max.json"));
      await save("txt", "max.txt");
      assert.equal(j.units, 20000);
      assert.equal(j.text.length, 20000);
      await f("input", "x".repeat(20001));
      assert.equal(
        (await p.locator("#read-estimate-input").inputValue()).length,
        20000,
      );
      await f("input", "one two");
      await f("speed", "100");
      await g();
      await p.locator("#read-estimate-json").waitFor();
      await save("json", "speed-min.json");
      await save("txt", "speed-min.txt");
    },
  );
  await check(
    "bad speed and unsupported Unicode controls refused",
    async () => {
      await reset();
      for (const s of ["99", "1001", "0", "-1", "1.5", "ab"]) {
        await f("speed", s);
        await g();
        await done();
        assert.equal(await p.locator("#read-estimate-output").count(), 0);
        assert.match(
          await p.locator("[role=status]").textContent(),
          /100–1000/,
        );
      }
      await f("speed", "200");
      for (const t of [
        "😀",
        "𠀀",
        "カタカナ",
        "１２３",
        "ＡＢＣ",
        "é",
        "一\u0001二",
      ]) {
        await f("input", t);
        await g();
        await done();
        assert.equal(await p.locator("#read-estimate-output").count(), 0);
        assert.match(await p.locator("[role=status]").textContent(), /暂只接/);
      }
      const prev = await p.locator("#read-estimate-speed").inputValue();
      await f("speed", "10000");
      assert.equal(await p.locator("#read-estimate-speed").inputValue(), prev);
    },
  );
  await check(
    "literal HTML kept safe and edit clears previous output",
    async () => {
      await reset();
      await f("input", "<img src=x onerror=1>");
      await g();
      await p.locator("#read-estimate-json").waitFor();
      assert.equal(await p.locator("#read-estimate-output img").count(), 0);
      const j = JSON.parse(await save("json", "literal.json"));
      await save("txt", "literal.txt");
      assert.equal(j.text, "<img src=x onerror=1>");
      await f("input", "更改");
      assert.equal(await p.locator("#read-estimate-output").count(), 0);
    },
  );
  await check(
    "original counter thrown failure observed and dependency failure retry",
    async () => {
      await reset();
      const original = await fs.readFile(
        "public/vendor/reading-time/reading-time.js",
        "utf8",
      );
      await p.route("**/vendor/reading-time/reading-time.js", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body:
            original +
            '\nmodule.exports=function(){throw Error("controlled original call")};',
        }),
      );
      await g();
      await done();
      assert.match(await p.locator("[role=status]").textContent(), /估算失败/);
      await p.unroute("**/vendor/reading-time/reading-time.js");
      await p.route("**/vendor/reading-time/reading-time.js", (r) => r.abort());
      await g();
      await done();
      assert.match(
        await p.locator("[role=status]").textContent(),
        /组件加载失败/,
      );
      await p.unroute("**/vendor/reading-time/reading-time.js");
      await g();
      await p.locator("#read-estimate-json").waitFor();
    },
  );
  await check("partial second Blob URL cleaned and retry", async () => {
    await reset();
    await p.evaluate(() => {
      window.__rev = [];
      const a = URL.createObjectURL,
        r = URL.revokeObjectURL;
      URL.createObjectURL = (b) => {
        if (b.type.startsWith("application/json")) throw Error("controlled");
        return a(b);
      };
      URL.revokeObjectURL = (u) => {
        window.__rev.push(u);
        r(u);
      };
      window.__restore = () => {
        URL.createObjectURL = a;
        URL.revokeObjectURL = r;
      };
    });
    await g();
    await done();
    assert.equal(await p.locator("#read-estimate-output").count(), 0);
    assert.equal(await p.evaluate(() => window.__rev.length), 1);
    await p.evaluate(() => window.__restore());
    await g();
    await p.locator("#read-estimate-json").waitFor();
  });
  await check("actual worker two-second terminate and cancel", async () => {
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
    await p.route("**/vendor/reading-time/estimate-worker.js", (r) =>
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
    await p.locator("#read-estimate-cancel").click();
    assert.equal(await p.evaluate(() => window.__term), 2);
    await p.unroute("**/vendor/reading-time/estimate-worker.js");
  });
  await check(
    "editing rejects deliberately queued late result even if mock terminate ignored",
    async () => {
      await reset();
      await p.evaluate(() => {
        window.__workers = [];
        const W = Worker;
        window.__beforeQueuedWorker = W;
        window.__realTerminate = W.prototype.terminate;
        window.Worker = class extends W {
          constructor(...args) {
            super(...args);
            window.__workers.push(this);
          }
          terminate() {}
        };
      });
      await p.route("**/vendor/reading-time/estimate-worker.js", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body: 'self.onmessage=()=>setTimeout(()=>self.postMessage({ok:false,error:"迟到旧错误"}),300)',
        }),
      );
      await g();
      await f("input", "新内容");
      await p.waitForTimeout(500);
      assert(
        !(await p.locator("[role=status]").textContent()).includes("迟到"),
      );
      assert.equal(await p.locator("#read-estimate-output").count(), 0);
      await p.evaluate(() => {
        window.__workers.forEach((w) => window.__realTerminate.call(w));
        window.Worker = window.__beforeQueuedWorker;
      });
      await p.unroute("**/vendor/reading-time/estimate-worker.js");
    },
  );
  await check(
    "390 count display and two real export buttons no overflow",
    async () => {
      await reset();
      await p.setViewportSize({ width: 390, height: 844 });
      await g();
      await p.locator("#read-estimate-json").waitFor();
      await p.locator("#read-estimate-txt").scrollIntoViewIfNeeded();
      assert(await p.locator("#read-estimate-json").isVisible());
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({ path: out + "/mobile.png", fullPage: true });
    },
  );
  await check("NextLink actual unmount clears both export URLs", async () => {
    await p.evaluate(() => {
      window.__gone = [];
      const r = URL.revokeObjectURL;
      URL.revokeObjectURL = (u) => {
        window.__gone.push(u);
        r(u);
      };
    });
    await p.getByRole("link", { name: "← 回到新发现" }).click();
    await p.locator("#read-estimate-generate").waitFor({ state: "detached" });
    assert.equal(await p.evaluate(() => window.__gone.length), 2);
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
