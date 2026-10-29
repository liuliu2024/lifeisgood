import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.LIFE_TEST_URL || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Local test only");
const executablePath = process.env.CHROME_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const checks = [];
const output = resolve("test-results");
mkdirSync(output, { recursive: true });
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".tool-card").first().waitFor();
  assert.equal(await page.locator(".tool-card").count(), 89);
  assert.ok((await page.locator("h1").innerText()).includes("想办成"));
  checks.push("89 pending capabilities and customer-task homepage");
  const search = page.getByPlaceholder("想做什么？例如：整理报价单、处理商品图");
  await search.fill("报价");
  await page.waitForFunction(() => document.querySelectorAll(".tool-card").length > 0 && document.querySelectorAll(".tool-card").length < 89);
  await page.getByRole("button", { name: "查看详情", exact: false }).first().click();
  await page.getByRole("button", { name: "关闭详情" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("button", { name: "关闭详情" }).count(), 0);
  await search.fill("");
  checks.push("task search, detail and Escape recovery");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(300);
    const bounds = await page.evaluate(() => {
      const heading = document.querySelector("h1").getBoundingClientRect();
      const sidebar = document.querySelector(".sidebar");
      return { overflow: document.documentElement.scrollWidth > innerWidth, left: heading.left, right: heading.right, hiddenDrawer: getComputedStyle(sidebar).visibility === "hidden", shadow: getComputedStyle(sidebar).boxShadow };
    });
    assert.equal(bounds.overflow, false, `Overflow at ${width}`);
    assert.ok(bounds.left >= 0 && bounds.right <= width, `Heading clipped at ${width}`);
    if (width === 390) {
      assert.equal(bounds.hiddenDrawer, true);
      assert.equal(bounds.shadow, "none");
    }
    await page.screenshot({ path: resolve(output, `portal-smoke-${width}.png`) });
  }
  checks.push("desktop/tablet/mobile bounds and hidden-drawer shadow");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).first().click();
  await page.getByRole("button", { name: "创建账号", exact: true }).click();
  await page.getByPlaceholder("怎么称呼你").fill("流程验证");
  await page.getByPlaceholder("输入邮箱").fill(`smoke-${Date.now()}@example.invalid`);
  await page.locator('input[name="password"]').fill("Synthetic-Smoke-Password-2026");
  const [registration] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/auth/register") && response.request().method() === "POST"),
    page.getByRole("button", { name: "注册账号", exact: true }).click(),
  ]);
  assert.ok(registration.ok(), "Registration failed");
  const account = await (await context.request.get(`${base}/api/account`)).json();
  assert.equal(account.authenticated, true);
  assert.equal(account.user.role, "member");
  checks.push("real registration cookie and no automatic owner promotion");
  assert.equal((await context.request.get(`${base}/api/foundation/admin/settings`)).status(), 403);
  const origin = new URL(base).origin;
  const saveFavorite = await context.request.put(`${base}/api/favorites/FUN-001`, { headers: { Origin: origin }, data: { selected: true } });
  assert.ok(saveFavorite.ok());
  const favorite = await (await context.request.get(`${base}/api/favorites`)).json();
  assert.ok(favorite.capability_ids.includes("FUN-001"));
  checks.push("member owner-route denial and account favorites persistence");
  const uploaded = await context.request.post(`${base}/api/files`, { headers: { Origin: origin }, multipart: { file: { name: "synthetic-smoke.txt", mimeType: "text/plain", buffer: Buffer.from("synthetic verification only") } } });
  assert.ok(uploaded.ok(), `Upload failed (${uploaded.status()})`);
  const { file } = await uploaded.json();
  const download = await context.request.get(new URL(file.download_url, base).href);
  assert.ok(download.ok());
  assert.equal(await download.text(), "synthetic verification only");
  const anonymous = await browser.newContext();
  assert.equal((await anonymous.request.get(new URL(file.download_url, base).href)).status(), 401);
  await anonymous.close();
  assert.ok((await context.request.delete(`${base}/api/files/${file.id}`, { headers: { Origin: origin } })).ok());
  assert.equal((await context.request.get(new URL(file.download_url, base).href)).status(), 404);
  checks.push("private multipart upload through Next proxy, download, denial and deletion");
  const jobs = await (await context.request.get(`${base}/api/foundation/jobs`)).json();
  assert.deepEqual(jobs.jobs, []);
  await context.request.post(`${base}/api/auth/logout`, { headers: { Origin: origin } });
  assert.equal((await context.request.get(`${base}/api/files`)).status(), 401);
  checks.push("truthful empty jobs and logout revocation");
  assert.deepEqual(errors, []);
  checks.push("no browser page errors");
  writeFileSync(resolve(output, "portal-smoke.json"), JSON.stringify({ checks, passed: checks.length, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks, pageErrors: errors }));
} finally {
  await browser.close();
}
