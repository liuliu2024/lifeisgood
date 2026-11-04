import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright";

const base = process.env.DAILY_TOOL_BASE || "http://127.0.0.1:3200";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const output = path.resolve("../../../../outputs"); fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const checks = [], errors = [], externalRequests = [];
let completed = false, failure = null;
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) externalRequests.push(request.url()); });
async function check(name, run) { await run(); checks.push(name); }
const status = () => page.getByRole("status");
const field = name => page.locator(`[name="gradient_${name}"]`);
async function generate() { await page.getByRole("button", { name: "生成渐变色卡", exact: true }).click(); }
async function download(id, filename) {
  const pending = page.waitForEvent("download"); await page.locator(id).click(); const result = await pending;
  await result.saveAs(path.join(output, filename)); return fs.readFileSync(path.join(output, filename));
}
function decodePng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), depth = bytes[24], type = bytes[25];
  assert.equal(depth, 8); assert.ok([2, 6].includes(type)); const channels = type === 6 ? 4 : 3;
  let offset = 8; const chunks = [];
  while (offset < bytes.length) { const size = bytes.readUInt32BE(offset), kind = bytes.toString("ascii", offset + 4, offset + 8); if (kind === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + size)); offset += size + 12; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height);
  function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
  for (let y = 0; y < height; y++) { const filter = raw[y * (stride + 1)]; assert.ok(filter <= 4); for (let x = 0; x < stride; x++) { const a = x >= channels ? pixels[y * stride + x - channels] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0; const add = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c); pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + add) & 255; } }
  return { width, height, pixel: (x, y) => [...pixels.subarray(y * stride + x * channels, y * stride + x * channels + 3)] };
}

try {
  await page.goto(`${base}/tools/gradient/`);
  await check("initial empty preview has no stale download and local library becomes ready", async () => { await page.getByRole("button", { name: "生成渐变色卡", exact: true }).waitFor(); await page.waitForFunction(() => !document.querySelector('main button').disabled); assert.equal(await page.locator("#gradient-output").count(), 0); });
  await check("HEX invalid and empty inputs reject without output", async () => { for (const value of ["", "#xyzxyz", "red", "#fff", "#ffffff00"]) { await field("start").fill(value); await generate(); assert.match(await status().innerText(), /六位HEX/); assert.equal(await page.locator("#gradient-output").count(), 0); } });
  await field("start").fill("#ff0000"); await field("end").fill("#0000ff");
  await check("steps rejects empty fractional and out-of-range numbers", async () => { for (const value of ["", "1", "17", "2.5"]) { await field("steps").fill(value); await generate(); assert.match(await status().innerText(), /2到16/); assert.equal(await page.locator("#gradient-output").count(), 0); } });
  await field("steps").fill("7"); await field("mode").selectOption("rgb"); await generate(); await page.locator("#gradient-output").waitFor();
  await check("actual JSON CSS and PNG exports retain chosen RGB endpoints", async () => {
    const json = JSON.parse(await download("#gradient-json", "渐变工坊_七色.json")); assert.equal(json.steps, 7); assert.deepEqual(json.inputs, ["#FF0000", "#0000FF"]); assert.equal(json.colors.length, 7); assert.equal(json.colors[0], "#FF0000"); assert.equal(json.colors.at(-1), "#0000FF");
    const css = (await download("#gradient-css", "渐变工坊_七色.css")).toString(); assert.ok(css.includes(json.css)); assert.match(css, /#FF0000 0%/); assert.match(css, /#0000FF 100%/);
    const png = decodePng(await download("#gradient-png", "渐变工坊_七色.png")); assert.equal(png.width, 1200); assert.equal(png.height, 480); assert.deepEqual(png.pixel(1, 300), [255,0,0]); assert.deepEqual(png.pixel(1198, 300), [0,0,255]);
  });
  await check("changing a valid setting clears old preview and downloads immediately", async () => { await field("end").fill("#ffffff"); assert.equal(await page.locator("#gradient-output").count(), 0); assert.match(await status().innerText(), /设置已改变/); });
  await check("optional middle color appears exactly at three RGB steps", async () => { await page.getByLabel("加入中间色", { exact: true }).check(); await field("middle").fill("#00ff00"); await field("steps").fill("3"); await generate(); await page.locator("#gradient-output").waitFor(); const json = JSON.parse(await download("#gradient-json", "渐变工坊_中间色.json")); assert.deepEqual(json.colors, ["#FF0000", "#00FF00", "#FFFFFF"]); });
  await check("all three mixing modes and min/max steps create finite HEX colors", async () => { for (const mode of ["lab", "lch", "rgb"]) { await field("mode").selectOption(mode); await field("steps").fill(mode === "rgb" ? "2" : "16"); await generate(); await page.locator("#gradient-output").waitFor(); const colors = await page.locator("#gradient-output code").allTextContents(); assert.equal(colors.length, mode === "rgb" ? 2 : 16); assert.ok(colors.every(value => /^#[0-9A-F]{6}$/.test(value))); } });
  await check("editing during delayed PNG encoding discards the asynchronous old result", async () => {
    await page.evaluate(() => { window.__originalToBlob = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function(callback, ...args) { window.__originalToBlob.call(this, blob => setTimeout(() => callback(blob), 350), ...args); }; });
    await generate(); await field("start").fill("#112233"); await page.waitForTimeout(550); assert.equal(await page.locator("#gradient-output").count(), 0); assert.equal(await page.getByRole("button", { name: "生成渐变色卡", exact: true }).isEnabled(), true);
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.__originalToBlob; });
  });
  await generate(); await page.locator("#gradient-output").waitFor();
  await check("desktop and 390 CSS viewport have no horizontal overflow", async () => { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path: path.join(output, "渐变工坊_桌面.png"), fullPage: true }); await page.setViewportSize({ width:390, height:1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path:path.join(output,"渐变工坊_手机.png"), fullPage:true }); });
  await check("failed local library request gives retry guidance and disables generation", async () => { const broken = await browser.newPage(); await broken.route("**/vendor/chroma/chroma.min.js", route => route.abort()); await broken.goto(`${base}/tools/gradient/`); await broken.getByRole("status").filter({hasText:"加载失败"}).waitFor(); assert.equal(await broken.getByRole("button", {name:"生成渐变色卡",exact:true}).isDisabled(),true); await broken.close(); });
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []); completed = true;
} catch (error) { failure = error.message; throw error; }
finally { const report = { time:new Date().toISOString(), base, completed, failure, checks, pageErrors:errors, externalRequests, limits:"Edge headless local preview; CSS 390 viewport is not a real phone; no printed color proof" }; fs.writeFileSync(path.join(output,"生活小助手_渐变配色验收.json"),JSON.stringify(report,null,2)); console.log(JSON.stringify(report)); await browser.close(); }
