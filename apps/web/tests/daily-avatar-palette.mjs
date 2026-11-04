import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = path.join(root, ".cache/daily-tools-results/avatar-palette");
fs.mkdirSync(evidence, { recursive: true });
const base = process.env.DAILY_TOOL_BASE || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const results = [], errors = [], externalRequests = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(base + "/")) externalRequests.push(request.url()); });
const check = async (name, run) => { try { await run(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); throw error; } };
const getDownload = async (id, file) => { const event = page.waitForEvent("download"); await page.locator(id).click(); const download = await event; const target = path.join(evidence, file); await download.saveAs(target); return fs.readFileSync(target); };
const picture = async (kind, mime = "image/png") => Buffer.from(await page.evaluate(({kind:k,mime}) => { const c = document.createElement("canvas"); c.width = k === "large" ? 5000 : 200; c.height = k === "large" ? 4000 : 100; const x = c.getContext("2d"); if (k !== "transparent") { x.fillStyle = k === "white" ? "#ffffff" : "#ff0000"; x.fillRect(0, 0, c.width, c.height); if(k === "bands") for (const [i,color] of ["#00ff00", "#0000ff", "#ffffff", "#ffff00"].entries()) { x.fillStyle = color; x.fillRect(120+i*20, 0, 20, 100); } } return c.toDataURL(mime).split(",")[1]; }, {kind,mime}), "base64");
const upload = async (name, buffer, mimeType = "image/png") => page.locator("#palette-file").setInputFiles({ name, mimeType, buffer });
const status = () => page.locator('[role="status"]');

try {
  await page.goto(base + "/tools/avatar", { waitUntil: "networkidle" });
  await page.locator("#avatar-generate").waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector("#avatar-generate").disabled);
  await check("avatar empty input is rejected", async () => { await page.locator("#avatar-generate").click(); await assert.match(await status().innerText(), /请先输入/); assert.equal(await page.locator("#avatar-downloads").count(), 0); });
  let firstSvg, firstPng;
  await check("Chinese avatar actual SVG and 512 PNG download", async () => { await page.locator("#avatar-text").fill("今天也要开心🙂"); await page.locator("#avatar-generate").click(); await page.locator("#avatar-downloads").waitFor(); firstSvg = await getDownload("#avatar-svg", "avatar.svg"); firstPng = await getDownload("#avatar-png", "avatar.png"); assert.match(firstSvg.toString(), /<svg[^>]*width="512"[^>]*height="512"/); assert.equal(firstPng.readUInt32BE(16), 512); assert.equal(firstPng.readUInt32BE(20), 512); });
  await check("same value/settings deterministically reproduce exported bytes", async () => { await page.locator("#avatar-generate").click(); await page.locator("#avatar-downloads").waitFor(); assert.ok((await getDownload("#avatar-svg", "avatar-repeat.svg")).equals(firstSvg)); assert.ok((await getDownload("#avatar-png", "avatar-repeat.png")).equals(firstPng)); });
  await check("editing clears old downloads and malicious text is only hashed", async () => { await page.locator("#avatar-text").fill("<script>alert(1)</script>"); assert.equal(await page.locator("#avatar-downloads").count(), 0); await page.locator("#avatar-generate").click(); await page.locator("#avatar-downloads").waitFor(); const svg = await getDownload("#avatar-svg", "avatar-untrusted-text.svg"); assert.doesNotMatch(svg.toString(), /<script|alert\(1\)/); });
  await check("transparent 1024 export has transparent corner", async () => { await page.locator("#avatar-size").selectOption("1024"); await page.locator("#avatar-transparent").check(); await page.locator("#avatar-generate").click(); await page.locator("#avatar-downloads").waitFor(); const png = await getDownload("#avatar-png", "avatar-transparent.png"); assert.equal(png.readUInt32BE(16), 1024); const alpha = await page.evaluate(async () => { const i = new Image(); i.src = document.querySelector("#avatar-png").href; await i.decode(); const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, 1, 1).data[3]; }); assert.equal(alpha, 0); });
  await check("avatar 390 CSS viewport and visible exports", async () => { await page.setViewportSize({ width: 390, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assert.ok(await page.locator("#avatar-png").isVisible()); await page.screenshot({ path: path.join(evidence, "avatar-mobile.png"), fullPage: true }); });

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(base + "/tools/palette", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.querySelector("#palette-file").disabled);
  const bands = await picture("bands"), white = await picture("white"), transparent = await picture("transparent");
  let data;
  await check("synthetic photo actual JSON and PNG palette exports", async () => { await upload("our-test-colors.png", bands); await page.locator("#palette-output").waitFor(); const json = await getDownload("#palette-json", "palette.json"); data = JSON.parse(json); const png = await getDownload("#palette-png", "palette.png"); assert.equal(png.readUInt32BE(16), 1000); assert.equal(png.readUInt32BE(20), 400); assert.equal(data.sourceName, "our-test-colors.png"); assert.ok(data.colors.length >= 3 && data.colors.length <= 5); const toRgb = hex => hex.match(/[0-9a-f]{2}/ig).map(x => parseInt(x,16)); assert.ok(toRgb(data.dominant)[0] > 220 && toRgb(data.dominant)[1] < 40 && toRgb(data.dominant)[2] < 40); assert.ok(data.colors.some(hex => toRgb(hex).every(value => value > 220)), "white is not silently excluded"); });
  await check("copy button passes chosen HEX to clipboard API (isolated mock)", async () => { await page.evaluate(() => { navigator.clipboard.writeText = async value => { window.__copiedHex = value; }; }); await page.locator("#palette-output button").first().click(); assert.equal(await page.evaluate(() => window.__copiedHex), data.colors[0]); assert.match(await status().innerText(), /已复制/); });
  await check("clipboard permission rejection keeps manual/JSON fallback", async () => { await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new DOMException("Not allowed", "NotAllowedError"); }; }); await page.locator("#palette-output button").first().click(); assert.match(await status().innerText(), /手动选取/); assert.ok(await page.locator("#palette-json").isVisible()); });
  await check("non-image renamed png rejects and clears old exports", async () => { await upload("fake.png", Buffer.from("not a picture")); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("只支持")); assert.equal(await page.locator("#palette-output").count(), 0); });
  await check("corrupt PNG signature is caught as unreadable", async () => { await upload("broken.png", Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("无法读取")); assert.equal(await page.locator("#palette-output").count(), 0); });
  await check("fully transparent file gives clear no-colors message", async () => { await upload("transparent.png", transparent); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("透明")); assert.equal(await page.locator("#palette-output").count(), 0); });
  await check("all-white file retains white instead of a fake palette", async () => { await upload("white.png", white); await page.locator("#palette-output").waitFor(); const d = JSON.parse((await getDownload("#palette-json", "white.json")).toString()); assert.ok(d.dominant.match(/[0-9a-f]{2}/ig).every(x => parseInt(x,16) > 240)); });
  await check("JPEG dimension preflight and actual palette output", async () => { const b = await picture("bands", "image/jpeg"); assert.equal(b.readUInt16BE(0), 0xffd8); await upload("test.jpg", b, "image/jpeg"); await page.locator("#palette-output").waitFor(); const d = JSON.parse((await getDownload("#palette-json", "jpeg.json")).toString()); assert.equal(d.width, 200); assert.equal(d.height, 100); });
  await check("static WebP dimension preflight and actual palette output", async () => { const b = await picture("bands", "image/webp"); assert.equal(b.toString("ascii", 8, 12), "WEBP"); await upload("test.webp", b, "image/webp"); await page.locator("#palette-output").waitFor(); const d = JSON.parse((await getDownload("#palette-json", "webp.json")).toString()); assert.equal(d.width, 200); assert.equal(d.height, 100); });
  await check("10 MiB plus one byte is rejected", async () => { await upload("oversize.png", Buffer.alloc(10*1024*1024+1)); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("超过10")); assert.equal(await page.locator("#palette-output").count(), 0); });
  await check("image exceeding 16 MP is rejected", async () => { await upload("large.png", await picture("large")); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("1600万")); assert.equal(await page.locator("#palette-output").count(), 0); });
  await check("replacement file is current and filename is rendered as text", async () => { await upload("<img onerror=alert(1)>.png", bands); await page.locator("#palette-output").waitFor(); assert.match(await page.locator(".filename, [class*='filename']").innerText(), /<img/); assert.equal(await page.locator("img[onerror]").count(), 0); });
  await check("palette mobile 390 CSS viewport and exports", async () => { await page.setViewportSize({ width: 390, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assert.ok(await page.locator("#palette-png").isVisible()); assert.ok(await page.locator("#palette-json").isVisible()); await page.screenshot({ path: path.join(evidence, "palette-mobile.png"), fullPage: true }); });
  await check("local library load failure is visible rather than endless loading", async () => { await page.route("**/vendor/color-thief/color-thief.global.js", route => route.abort()); await page.goto(base + "/tools/palette", { waitUntil: "networkidle" }); await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes("加载失败")); assert.ok(await page.locator("#palette-file").isDisabled()); await page.unroute("**/vendor/color-thief/color-thief.global.js"); });
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
} finally {
  fs.writeFileSync(path.join(evidence, "results.json"), JSON.stringify({ date: new Date().toISOString(), base, browser: browser.version(), results, errors, externalRequests }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ groups: results.length, passed: results.filter(x => x.pass).length, errors, externalRequests, evidence }));
