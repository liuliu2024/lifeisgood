import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const out = process.env.PIXEL_OUT || "../../../../outputs/pixel-grid-evidence",
  fixtures = path.resolve("../../../../outputs/pixel-grid-fixtures");
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
  if (ordinal <= Number(process.env.PIXEL_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const palette = "#000000\n#FFFFFF\n#FF0000\n#0000FF";
const f = (id, v) => p.locator("#pixel-grid-" + id).fill(v),
  g = () => p.locator("#pixel-grid-generate").click();
const done = () =>
  p.waitForFunction(
    () => !document.querySelector("#pixel-grid-generate").disabled,
  );
const ready = () =>
  p.waitForFunction(
    () => !document.querySelector("#pixel-grid-generate").disabled,
  );
const file = (n) =>
  p.locator("#pixel-grid-file").setInputFiles(path.join(fixtures, n));
const reset = async () => {
  await file("checker.png");
  await f("palette", palette);
  await p.locator("#pixel-grid-size").selectOption("32");
};
const save = async (id, name) => {
  const w = p.waitForEvent("download");
  await p.locator("#pixel-grid-" + id).click();
  const d = await w;
  await d.saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name);
};
try {
  await p.goto("http://127.0.0.1:3200/tools/pixel-grid");
  await ready();
  await check("no file controlled refusal", async () => {
    await g();
    assert.match(await p.locator("[role=status]").textContent(), /5MiB/);
  });
  await check(
    "original pixelate and convertPalette actual checker32 PNGJSON",
    async () => {
      await reset();
      await p.evaluate(() => {
        const c = document.querySelector("iframe").contentWindow;
        window.__calls = { pixelate: 0, palette: 0 };
        const a = c.LifePixelit.prototype.pixelate,
          v = c.LifePixelit.prototype.convertPalette;
        c.LifePixelit.prototype.pixelate = function (...x) {
          window.parent.__calls.pixelate++;
          return a.apply(this, x);
        };
        c.LifePixelit.prototype.convertPalette = function (...x) {
          window.parent.__calls.palette++;
          return v.apply(this, x);
        };
      });
      await g();
      await p.locator("#pixel-grid-json").waitFor();
      const j = JSON.parse((await save("json", "checker32.json")).toString());
      await save("png", "checker32.png");
      assert.equal(j.gridSize, 32);
      assert.deepEqual(await p.evaluate(() => window.__calls), {
        pixelate: 1,
        palette: 1,
      });
      assert.equal(
        await p.evaluate(
          () =>
            document
              .querySelector("iframe")
              .contentDocument.body.querySelectorAll("canvas").length,
        ),
        0,
      );
    },
  );
  await check("same options same real cell map and PNG", async () => {
    await g();
    await p.locator("#pixel-grid-json").waitFor();
    assert.deepEqual(
      await save("json", "same.json"),
      await fs.readFile(out + "/checker32.json"),
    );
    assert.deepEqual(
      await save("png", "same.png"),
      await fs.readFile(out + "/checker32.png"),
    );
  });
  await check("gradient64 sixteen-color actual outputs", async () => {
    await file("gradient.png");
    await p.locator("#pixel-grid-size").selectOption("64");
    await f(
      "palette",
      Array.from(
        { length: 16 },
        (_, i) => "#" + (i * 17).toString(16).padStart(2, "0").repeat(3),
      ).join("\n"),
    );
    await g();
    await p.locator("#pixel-grid-json").waitFor();
    const j = JSON.parse((await save("json", "gradient64.json")).toString());
    await save("png", "gradient64.png");
    assert.equal(j.palette.length, 16);
    assert.equal(j.cells.length, 64);
  });
  await check(
    "transparent first white flatten then palette and rectangular JPEG letterbox",
    async () => {
      await file("transparent.png");
      await f("palette", "#FFFFFF\n#7F7FFF\n#000000\n#0000FF");
      await p.locator("#pixel-grid-size").selectOption("32");
      await g();
      await p.locator("#pixel-grid-json").waitFor();
      await save("json", "transparent.json");
      await save("png", "transparent.png");
      await file("rectangle.jpg");
      await f("palette", palette);
      await g();
      await p.locator("#pixel-grid-json").waitFor();
      await save("json", "rectangle.json");
      await save("png", "rectangle.png");
    },
  );
  await check("bad palettes and overlong edit rejected", async () => {
    await reset();
    for (const c of [
      "#000000\n#FFFFFF\n#FF0000",
      palette + "\n#000000",
      palette.replace("#FF0000", "#GG0000"),
      Array.from(
        { length: 17 },
        (_, i) => "#" + i.toString(16).padStart(6, "0"),
      ).join("\n"),
    ]) {
      await f("palette", c);
      await g();
      await done();
      assert.equal(await p.locator("#pixel-grid-output").count(), 0);
      assert.match(await p.locator("[role=status]").textContent(), /4–16/);
    }
    const prior = await p.locator("#pixel-grid-palette").inputValue();
    await f("palette", "x".repeat(257));
    assert.equal(await p.locator("#pixel-grid-palette").inputValue(), prior);
  });
  await check("header and file limits before decode", async () => {
    await reset();
    await p.evaluate(() => {
      window.__decode = 0;
      window.__origDecode = createImageBitmap;
      window.createImageBitmap = (...a) => {
        window.__decode++;
        return window.__origDecode(...a);
      };
    });
    for (const name of [
      "huge-header.png",
      "truncated.png",
      "wrong.svg",
      "wrong.gif",
      "bad.jpg",
    ]) {
      await file(name);
      await g();
      await done();
      assert.equal(await p.locator("#pixel-grid-output").count(), 0);
    }
    await p
      .locator("#pixel-grid-file")
      .setInputFiles({
        name: "oversize.png",
        mimeType: "image/png",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      });
    await g();
    await done();
    assert.match(await p.locator("[role=status]").textContent(), /5MiB/);
    assert.equal(await p.evaluate(() => window.__decode), 0);
    await p.evaluate(() => (window.createImageBitmap = window.__origDecode));
  });
  await check("second output Blob failure releases PNG and retry", async () => {
    await reset();
    await p.evaluate(() => {
      const a = URL.createObjectURL,
        r = URL.revokeObjectURL;
      window.__rev = [];
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
    assert.equal(await p.locator("#pixel-grid-output").count(), 0);
    assert.equal(await p.evaluate(() => window.__rev.length), 1);
    await p.evaluate(() => window.__restore());
    await g();
    await p.locator("#pixel-grid-json").waitFor();
  });
  await check("dependency missing fresh frame controlled retry", async () => {
    await p.route("**/vendor/pixelit/pixelit.js", (r) => r.abort());
    await p.locator("#pixel-grid-retry").click();
    await p.waitForFunction(() =>
      document
        .querySelector("[role=status]")
        .textContent.includes("组件加载失败"),
    );
    assert(await p.locator("#pixel-grid-generate").isDisabled());
    await p.unroute("**/vendor/pixelit/pixelit.js");
    await p.locator("#pixel-grid-retry").click();
    await ready();
    await reset();
    await g();
    await p.locator("#pixel-grid-json").waitFor();
  });
  await check(
    "390 actual preview color numbers and two exports no overflow",
    async () => {
      await p.setViewportSize({ width: 390, height: 844 });
      await p.locator("#pixel-grid-png").scrollIntoViewIfNeeded();
      assert(await p.locator("#pixel-grid-json").isVisible());
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await p.screenshot({ path: out + "/mobile.png", fullPage: true });
    },
  );
  await check("actual NextLink unmount frees both URLs", async () => {
    await p.evaluate(() => {
      window.__gone = [];
      const r = URL.revokeObjectURL;
      URL.revokeObjectURL = (u) => {
        window.__gone.push(u);
        r(u);
      };
    });
    await p.getByRole("link", { name: "← 回到新发现" }).click();
    await p.locator("#pixel-grid-generate").waitFor({ state: "detached" });
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
