import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const out =
  process.env.CALENDAR_OUT || "../../../../outputs/calendar-event-evidence";
await fs.mkdir(out, { recursive: true });
const b = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [],
  external = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("request", (r) => {
  if (
    !new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/) &&
    !r.url().startsWith("blob:")
  )
    external.push(r.url());
});
let results = [],
  ordinal = 0;
const check = async (name, f) => {
  ordinal++;
  if (ordinal <= Number(process.env.CALENDAR_SKIP || 0)) return;
  await f();
  results.push({ name, pass: true });
};
const fill = async (id, v) => p.locator("#calendar-event-" + id).fill(v);
const gen = () => p.locator("#calendar-event-generate").click();
const save = async (id, name) => {
  const wait = p.waitForEvent("download");
  await p.locator("#calendar-event-" + id).click();
  const d = await wait;
  await d.saveAs(out + "/" + name);
  return fs.readFile(out + "/" + name, "utf8");
};
try {
  await p.goto("http://127.0.0.1:3200/tools/calendar-event");
  await p.locator("#calendar-event-generate").waitFor();
  await p.waitForFunction(
    () => !document.querySelector("#calendar-event-generate").disabled,
  );
  await check("default UTC+8 real ICS/JSON", async () => {
    await gen();
    const s = await save("ics", "default.ics");
    const j = JSON.parse(await save("json", "default.json"));
    assert.match(s, /DTSTART:20261105T010000Z/);
    assert.equal(j.endUTC, "2026-11-05T02:00:00.000Z");
  });
  await check(
    "Chinese UTF8 folding escaped injection and real downloads",
    async () => {
      await fill("title", "中文😀".repeat(20));
      await fill(
        "description",
        "逗号,分号;反斜\\\nBEGIN:VEVENT\nSUMMARY:伪造\nEND:VEVENT\n" +
          "中文😀".repeat(100),
      );
      await fill("location", "店内,一层;入口");
      await gen();
      const s = await save("ics", "unicode.ics");
      await save("json", "unicode.json");
      assert.equal(s.match(/(?:^|\r\n)BEGIN:VEVENT\r\n/g)?.length, 1);
      for (const l of s.split("\r\n")) assert(Buffer.byteLength(l) <= 75);
      assert.match(s, /\\nBEGIN:VEVENT/);
    },
  );
  await check("edit invalidates output and end order rejected", async () => {
    await fill("end", "2026-11-05T08:00");
    assert.equal(await p.locator("#calendar-event-output").count(), 0);
    await gen();
    await assert.match(
      await p.locator("[role=status]").textContent(),
      /结束须晚于/,
    );
  });
  await check("strict impossible date rejected", async () => {
    await fill("start", "2026-02-30T09:00");
    await gen();
    assert.match(await p.locator("[role=status]").textContent(), /不存在/);
  });
  await check("seven day bound and UTC range rejected", async () => {
    await fill("start", "2026-11-05T09:00");
    await fill("end", "2026-11-13T10:00");
    await gen();
    assert.match(await p.locator("[role=status]").textContent(), /最多7天/);
    await fill("start", "1999-11-05T09:00");
    await gen();
    assert.match(await p.locator("[role=status]").textContent(), /2000–2099/);
  });
  await check("control characters rejected", async () => {
    await fill("start", "2026-11-05T09:00");
    await fill("end", "2026-11-05T10:00");
    await fill("description", "a\u0001b");
    await gen();
    assert.match(await p.locator("[role=status]").textContent(), /控制字符/);
  });
  await check(
    "overlong edit preserves original and multiline title rejected",
    async () => {
      await fill("description", "正常说明");
      await fill("title", "正常");
      await fill("title", "x".repeat(101));
      assert.equal(
        await p.locator("#calendar-event-title").inputValue(),
        "正常",
      );
      await fill("title", "a\nb");
      await gen();
      assert.match(await p.locator("[role=status]").textContent(), /不能换行/);
    },
  );
  await check("UTC zone and independent output", async () => {
    await fill("title", "UTC事项");
    await fill("description", "中文说明");
    await p.locator("#calendar-event-zone").selectOption("0");
    await gen();
    await save("ics", "utc.ics");
    const j = JSON.parse(await save("json", "utc.json"));
    assert.equal(j.startUTC, "2026-11-05T09:00:00.000Z");
  });
  await check(
    "second Blob URL failure revokes first and shows no stale links",
    async () => {
      await p.evaluate(() => {
        const original = URL.createObjectURL,
          rev = URL.revokeObjectURL;
        window.__ceRev = [];
        URL.revokeObjectURL = (u) => {
          window.__ceRev.push(u);
          return rev(u);
        };
        URL.createObjectURL = (x) => {
          if (x.type.startsWith("application/json"))
            throw Error("受控第二URL失败");
          return original(x);
        };
        window.__ceRestore = () => {
          URL.createObjectURL = original;
          URL.revokeObjectURL = rev;
        };
      });
      await gen();
      assert.equal(await p.locator("#calendar-event-output").count(), 0);
      assert.match(
        await p.locator("[role=status]").textContent(),
        /受控第二URL失败/,
      );
      assert((await p.evaluate(() => window.__ceRev.length)) >= 3);
      await p.evaluate(() => window.__ceRestore());
    },
  );
  await check("390 layout and actual download links", async () => {
    await p.setViewportSize({ width: 390, height: 844 });
    await gen();
    await p.locator("#calendar-event-ics").scrollIntoViewIfNeeded();
    assert(await p.locator("#calendar-event-ics").isVisible());
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: out + "/mobile.png", fullPage: true });
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await check("missing library controlled failure", async () => {
    const q = await b.newPage();
    await q.route("**/vendor/icaljs/loader.js", (r) => r.abort());
    await q.goto("http://127.0.0.1:3200/tools/calendar-event");
    await q.waitForFunction(() =>
      document.querySelector("[role=status]")?.textContent.includes("加载失败"),
    );
    assert(await q.locator("#calendar-event-generate").isDisabled());
    await q.close();
  });
} finally {
  await fs.writeFile(
    out + "/browser.json",
    JSON.stringify({ results, errors, external }, null, 2),
  );
  await b.close();
}
console.log(JSON.stringify({ passed: results.length, errors, external }));
