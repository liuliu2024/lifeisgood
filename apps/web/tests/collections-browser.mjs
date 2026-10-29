import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.LIFE_TEST_URL || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const executablePath = process.env.CHROME_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const checks = [];
const errors = [];
const writes = [];
const external = [];
const output = resolve("test-results");
mkdirSync(output, { recursive: true });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (!["GET", "HEAD"].includes(request.method())) writes.push(new URL(request.url()).pathname);
  if (/^https?:/.test(request.url()) && !["localhost", "127.0.0.1"].includes(new URL(request.url()).hostname)) external.push(request.url());
});
const search = () => page.getByPlaceholder("想做什么？例如：整理报价单、处理商品图");
async function navigate(name) {
  const menu = page.getByRole("button", { name: "展开导航", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.locator('aside[aria-label="主导航"] nav button').filter({ hasText: name }).click();
  if (await menu.isVisible()) {
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".sidebar")).visibility === "hidden");
  }
}
async function assertBounds() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".scene-card").first().waitFor();
  assert.equal(await page.locator(".scene-card").count(), 3);
  assert.equal(await page.locator(".tool-card").count(), 87);
  await page.screenshot({ path: resolve(output, "collections-home-desktop.png"), fullPage: false });
  checks.push("three scene entrances show 87 eligible capabilities and preserve historical research");

  await navigate("开店与工作");
  await page.getByRole("heading", { name: "从开店到经营", exact: true }).waitFor();
  assert.equal(await page.locator(".tool-card").count(), 87);
  await page.locator(".journey-list button").first().click();
  assert.equal(await page.locator(".tool-card").count(), 0);
  await navigate("生活小工具");
  assert.ok(await page.locator(".tool-card").count() > 0);
  checks.push("business journey remains available inside the work scene");

  for (const scene of ["生活小工具", "创意与娱乐"]) {
    await navigate(scene);
    await page.getByRole("heading", { level: 1, name: scene, exact: true }).waitFor();
    assert.equal(await page.locator(".idea-card").count(), scene === "生活小工具" ? 5 : 6);
    assert.ok(await page.locator(".tool-card").count() > 0);
    assert.equal(await page.getByRole("heading", { name: "从开店到经营", exact: true }).count(), 0);
    assert.equal(await page.locator(".idea-card").filter({ hasText: "待评估" }).count(), scene === "生活小工具" ? 5 : 6);
    await assertBounds();
  }
  checks.push("collections reuse eligible capabilities and show five everyday and six creative proposals");

  await search().fill("换脸");
  assert.equal(await page.locator(".idea-card").count(), 1);
  assert.equal(await page.locator(".tool-card").count(), 0);
  await page.locator(".idea-card").getByRole("button", { name: "查看建议", exact: true }).click();
  const dialog = page.locator("dialog[open]");
  assert.ok((await dialog.innerText()).includes("授权"));
  assert.ok((await dialog.innerText()).includes("待评估"));
  assert.equal(await dialog.locator('input[type="file"]').count(), 0);
  assert.equal(await dialog.getByRole("button", { name: /收藏|开始处理|立即使用|上传/ }).count(), 0);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  checks.push("search finds the face-effect idea with authorization context and no upload or execution controls");

  await search().fill("不存在的工具qzx2026");
  assert.equal(await page.locator(".idea-card").count(), 0);
  assert.equal(await page.locator(".tool-card").count(), 0);
  await search().fill("");
  await page.locator(".tool-card").first().getByRole("button", { name: "查看详情", exact: false }).click();
  await page.getByRole("button", { name: "关闭详情", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  checks.push("collection search filters both sets and reused capabilities retain their original detail flow");

  await navigate("生活小工具");
  await search().fill("压缩图片");
  assert.equal(await page.locator(".tool-card").count(), 1);
  await page.locator(".tool-card .favorite-button").click();
  await navigate("创意与娱乐");
  await search().fill("压缩图片");
  await page.locator('.tool-card .favorite-button[aria-pressed="true"]').waitFor();
  await navigate("我的收藏");
  assert.equal(await page.locator(".tool-card").count(), 1);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("lifeisgood-favorites"))), ["FUN-066"]);
  await page.locator('.tool-card .favorite-button[aria-pressed="true"]').click();
  checks.push("cross-scene favorites share one FUN identifier and scene navigation clears business-only filters");

  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate("办事首页");
    assert.equal(await page.locator(".scene-card").count(), 3);
    await assertBounds();
    if (width === 390) await page.screenshot({ path: resolve(output, "collections-home-mobile.png"), fullPage: false });
    for (const scene of ["生活小工具", "创意与娱乐"]) {
      await navigate(scene);
      assert.equal(await page.locator(".idea-card").count(), scene === "生活小工具" ? 5 : 6);
      await assertBounds();
    }
    if (width === 390) await page.screenshot({ path: resolve(output, "collections-creative-mobile.png"), fullPage: false });
  }
  checks.push("tablet and mobile navigation expose all scenes without horizontal overflow");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate("办事首页");
  assert.equal(await page.locator(".idea-card").count(), 11);
  for (const scene of ["办事首页", "开店与工作", "生活小工具", "创意与娱乐", "公共工具", "行业专区"]) {
    await navigate(scene);
    for (const term of ["改个整齐", "长页面", "填充词", "Money Manager Ex", "eSearch"]) {
      await search().fill(term);
      assert.equal(await page.locator(".tool-card").count(), 0, `${scene}: excluded candidate visible for ${term}`);
      assert.equal(await page.locator(".idea-card").count(), 0, `${scene}: excluded idea visible for ${term}`);
    }
  }
  await page.evaluate(() => localStorage.setItem("lifeisgood-favorites", JSON.stringify(["FUN-070", "FUN-066"])));
  await page.reload({ waitUntil: "networkidle" });
  await navigate("我的收藏");
  assert.equal(await page.locator(".tool-card").count(), 1);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("lifeisgood-favorites"))), ["FUN-070", "FUN-066"]);
  await navigate("开店与工作");
  await search().fill("记录经营银行账户");
  assert.equal(await page.locator(".tool-card").count(), 1);
  await page.locator(".tool-card").getByRole("button", { name: "查看详情", exact: false }).click();
  const eligibleDetail = page.locator("dialog[open]");
  assert.ok(!(await eligibleDetail.innerText()).includes("Money Manager Ex"));
  assert.ok((await eligibleDetail.innerText()).includes("ezBookkeeping"));
  await page.keyboard.press("Escape");
  checks.push("excluded paths stay absent across directories, search, historical favorites and candidate details without erasing stored favorites");
  assert.deepEqual(writes, []);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  checks.push("browsing and proposed ideas trigger no writes, external requests or page errors");
  const result = { passed: checks.length, checks, pageErrors: errors, writes, externalRequests: external };
  writeFileSync(resolve(output, "collections-smoke.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
