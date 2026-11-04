import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out =
  process.env.RECIPE_OUT || "../../../../outputs/recipe-scale-evidence";
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
  if (ordinal <= Number(process.env.RECIPE_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const fill = (id, s) => p.locator("#recipe-scale-" + id).fill(s);
const reset = async () => {
  await fill("source", "2");
  await fill("target", "3");
  await fill("input", "面粉 | 1/2 | 杯\n牛奶 | 0.25 | 升\n鸡蛋 | 2 | 个");
};
const gen = () => p.locator("#recipe-scale-generate").click();
const done = () =>
  p.waitForFunction(
    () => !document.querySelector("#recipe-scale-generate").disabled,
  );
const save = async (id, name) => {
  const wait = p.waitForEvent("download");
  await p.locator("#recipe-scale-" + id).click();
  const d = await wait;
  await d.saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name, "utf8");
};
try {
  await p.goto("http://127.0.0.1:3200/tools/recipe-scale");
  await p.locator("#recipe-scale-generate").waitFor();
  await check("default real TXT JSON exact fractional scaling", async () => {
    await reset();
    await gen();
    await p.locator("#recipe-scale-json").waitFor();
    const j = JSON.parse(await save("json", "default.json"));
    await save("txt", "default.txt");
    assert.equal(j.rows[0].exact, "3/4");
    assert.equal(j.rows[1].exact, "3/8");
    assert.equal(j.rows[2].exact, "3");
  });
  await check("20-row exact matrix actual downloads", async () => {
    await reset();
    await fill("source", "7");
    await fill("target", "13");
    await fill(
      "input",
      Array.from(
        { length: 20 },
        (_, i) =>
          `原料${i + 1} | ${i % 2 ? `${i + 1}/${i + 2}` : `${i + 1}.125`} | 克`,
      ).join("\n"),
    );
    await gen();
    await p.locator("#recipe-scale-json").waitFor();
    await save("json", "matrix.json");
    await save("txt", "matrix.txt");
  });
  await check(
    "invalid quantities zero negative denominator precision and expression rejected",
    async () => {
      await reset();
      for (const v of [
        "0",
        "-1",
        "1/0",
        "1/1000001",
        "1000001",
        "0.1234567",
        "1+2",
      ]) {
        await fill("input", `原料 | ${v} | 克`);
        await gen();
        await done();
        assert.equal(await p.locator("#recipe-scale-json").count(), 0);
        assert.match(
          await p.locator("[role=status]").textContent(),
          /数量|分子分母/,
        );
      }
    },
  );
  await check("people range and 21 rows refused", async () => {
    await reset();
    await fill("source", "0");
    await gen();
    await done();
    assert.match(await p.locator("[role=status]").textContent(), /1–100/);
    await fill("source", "2");
    await fill("target", "101");
    await gen();
    await done();
    assert.match(await p.locator("[role=status]").textContent(), /1–100/);
    await fill("target", "3");
    await fill("input", Array(21).fill("原料 | 1 | 克").join("\n"));
    await gen();
    await done();
    assert.match(await p.locator("[role=status]").textContent(), /1–20/);
  });
  await check(
    "safe text HTML-like names and max numeric actual result",
    async () => {
      await reset();
      await fill("source", "1");
      await fill("target", "100");
      await fill("input", "<img onerror=alert(1)> | 1000000 | g");
      await gen();
      await p.locator("#recipe-scale-json").waitFor();
      const j = JSON.parse(await save("json", "max.json"));
      await save("txt", "max.txt");
      assert.equal(j.rows[0].exact, "100000000");
      assert.equal(await p.locator("#recipe-scale-output img").count(), 0);
    },
  );
  await check(
    "editing clears outputs and overlong edit preserves text",
    async () => {
      await reset();
      await gen();
      await p.locator("#recipe-scale-json").waitFor();
      await fill("target", "4");
      assert.equal(await p.locator("#recipe-scale-json").count(), 0);
      const prior = await p.locator("#recipe-scale-input").inputValue();
      await fill("input", "x".repeat(12001));
      assert.equal(await p.locator("#recipe-scale-input").inputValue(), prior);
    },
  );
  await check(
    "second Blob failure releases partial download and retry",
    async () => {
      await reset();
      await p.evaluate(() => {
        const c = URL.createObjectURL,
          r = URL.revokeObjectURL;
        window.__released = [];
        URL.createObjectURL = (b) => {
          if (b.type.startsWith("application/json")) throw Error("controlled");
          return c(b);
        };
        URL.revokeObjectURL = (u) => {
          window.__released.push(u);
          r(u);
        };
        window.__restore = () => {
          URL.createObjectURL = c;
          URL.revokeObjectURL = r;
        };
      });
      await gen();
      await done();
      assert.match(
        await p.locator("[role=status]").textContent(),
        /导出准备失败/,
      );
      assert.equal(await p.locator("#recipe-scale-json").count(), 0);
      assert.equal(await p.evaluate(() => window.__released.length), 1);
      await p.evaluate(() => window.__restore());
      await gen();
      await p.locator("#recipe-scale-json").waitFor();
    },
  );
  await check("missing ESM controlled failure retry", async () => {
    await reset();
    await p.route("**/vendor/fraction/fraction.mjs", (r) => r.abort());
    await gen();
    await done();
    assert.match(await p.locator("[role=status]").textContent(), /加载失败/);
    await p.unroute("**/vendor/fraction/fraction.mjs");
    await gen();
    await p.locator("#recipe-scale-json").waitFor();
  });
  await check(
    "real worker two-second deadline terminate and cancel old job",
    async () => {
      await reset();
      await p.evaluate(() => {
        window.__terminated = 0;
        const W = Worker;
        window.Worker = class extends W {
          terminate() {
            window.__terminated++;
            super.terminate();
          }
        };
      });
      await p.route("**/vendor/fraction/recipe-worker.js", (r) =>
        r.fulfill({
          contentType: "text/javascript",
          body: "self.onmessage=()=>{while(true){}}",
        }),
      );
      await gen();
      await p.waitForFunction(
        () =>
          document
            .querySelector("[role=status]")
            .textContent.includes("超过2秒"),
        { timeout: 5000 },
      );
      assert.equal(await p.evaluate(() => window.__terminated), 1);
      await gen();
      await p.locator("#recipe-scale-cancel").click();
      assert.equal(await p.evaluate(() => window.__terminated), 2);
      assert.equal(await p.locator("#recipe-scale-json").count(), 0);
      await p.unroute("**/vendor/fraction/recipe-worker.js");
    },
  );
  await check("native BigInt required before worker created", async () => {
    await reset();
    await p.evaluate(() => {
      window.__big = BigInt;
      window.BigInt = undefined;
    });
    await gen();
    assert.match(
      await p.locator("[role=status]").textContent(),
      /不支持原生BigInt/,
    );
    await p.evaluate(() => (window.BigInt = window.__big));
  });
  await check("390 layout real download buttons", async () => {
    await reset();
    await p.setViewportSize({ width: 390, height: 844 });
    await gen();
    await p.locator("#recipe-scale-json").waitFor();
    await p.locator("#recipe-scale-txt").scrollIntoViewIfNeeded();
    assert(await p.locator("#recipe-scale-json").isVisible());
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: out + "/mobile.png", fullPage: true });
  });
  await check("actual Next Link unmount releases both URLs", async () => {
    await p.evaluate(() => {
      window.__gone = [];
      const r = URL.revokeObjectURL;
      URL.revokeObjectURL = (u) => {
        window.__gone.push(u);
        r(u);
      };
    });
    await p.getByRole("link", { name: "← 回到新发现" }).click();
    await p.locator("#recipe-scale-generate").waitFor({ state: "detached" });
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
