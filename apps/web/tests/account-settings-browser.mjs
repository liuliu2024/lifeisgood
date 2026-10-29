import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.LIFE_TEST_URL || "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const headers = { Origin: new URL(base).origin };
const executablePath = process.env.CHROME_PATH || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const checks = [];
const errors = [];
let owner;
let originalDraft;
let originalPublic;
async function saveDraft(context, settings) {
  const current = await (await context.request.get(`${base}/api/foundation/admin/settings`)).json();
  const response = await context.request.put(`${base}/api/foundation/admin/settings`, {
    headers, data: { settings, expected_revision: current.revision },
  });
  assert.ok(response.ok(), "Draft fixture update failed");
  return response.json();
}
async function applyDraft(context, revision) {
  return context.request.post(`${base}/api/foundation/admin/settings/publish`, {
    headers, data: { expected_revision: revision },
  });
}
try {
  const member = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await member.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `settings-${Date.now()}@example.invalid`;
  const before = "Synthetic-Before-Password-2026";
  const after = "Synthetic-After-Password-2026";
  const registration = await member.request.post(`${base}/api/auth/register`, { headers, data: { email, password: before, display_name: "账号流程测试" } });
  assert.ok(registration.ok());
  const other = await browser.newContext();
  assert.ok((await other.request.post(`${base}/api/auth/login`, { headers, data: { email, password: before } })).ok());
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "个人工作台", exact: true }).click();
  await page.getByRole("tab", { name: "账号设置", exact: true }).click();
  await page.getByRole("button", { name: "修改密码", exact: true }).click();
  let passwordRequests = 0;
  page.on("request", (r) => { if (r.url().endsWith("/api/auth/password")) passwordRequests += 1; });
  await page.locator('input[name="current_password"]').fill(before);
  await page.locator('input[name="new_password"]').fill(after);
  await page.locator('input[name="confirm_password"]').fill("Synthetic-Different-Password-2026");
  await page.getByRole("button", { name: "确认修改密码", exact: true }).click();
  await page.getByText("两次新密码不一致，请重新确认。", { exact: true }).waitFor();
  assert.equal(passwordRequests, 0);
  checks.push("password mismatch stays local without sending credentials");
  await page.locator('input[name="current_password"]').fill("Synthetic-Wrong-Password-2026");
  await page.locator('input[name="confirm_password"]').fill(after);
  const [wrong] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/auth/password")),
    page.getByRole("button", { name: "确认修改密码", exact: true }).click(),
  ]);
  assert.equal(wrong.status(), 401);
  assert.equal((await (await member.request.get(`${base}/api/account`)).json()).authenticated, true);
  await page.locator('input[name="current_password"]').fill(before);
  const [changed] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/auth/password")),
    page.getByRole("button", { name: "确认修改密码", exact: true }).click(),
  ]);
  assert.ok(changed.ok());
  await page.locator('dialog[aria-labelledby="password-title"]').waitFor({ state: "hidden" });
  assert.equal((await (await member.request.get(`${base}/api/account`)).json()).user.role, "member");
  assert.equal((await other.request.get(`${base}/api/files`)).status(), 401);
  assert.equal((await other.request.post(`${base}/api/auth/login`, { headers, data: { email, password: before } })).status(), 401);
  assert.ok((await other.request.post(`${base}/api/auth/login`, { headers, data: { email, password: after } })).ok());
  await page.getByRole("button", { name: "修改密码", exact: true }).click();
  for (const field of ["current_password", "new_password", "confirm_password"]) {
    assert.equal(await page.locator(`input[name="${field}"]`).inputValue(), "");
  }
  await page.getByRole("button", { name: "关闭修改密码" }).click();
  checks.push("wrong password preserves session; successful change revokes old sessions and clears fields");
  assert.equal((await member.request.post(`${base}/api/foundation/admin/settings/publish`, { headers })).status(), 403);
  const ownerCredentials = JSON.parse(readFileSync(resolve("../backend/runtime/foundation-owner.json"), "utf8").replace(/^\uFEFF/, ""));
  owner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const ownerLogin = await owner.request.post(`${base}/api/auth/login`, { headers, data: { email: ownerCredentials.email, password: ownerCredentials.password } });
  assert.ok(ownerLogin.ok(), "Private local owner fixture is unavailable");
  originalDraft = (await (await owner.request.get(`${base}/api/foundation/admin/settings`)).json()).settings;
  originalPublic = await (await owner.request.get(`${base}/api/site-profile`)).json();
  const ownerPage = await owner.newPage();
  ownerPage.on("pageerror", (e) => errors.push(e.message));
  await ownerPage.goto(base, { waitUntil: "networkidle" });
  await ownerPage.getByRole("button", { name: "站长后台", exact: true }).click();
  const newName = "本机测试门店与工作室网站名称换行验证";
  const announcement = '<img src=x onerror="window.__profileInjected=true"> 纯文本测试公告';
  await ownerPage.getByLabel("网站名称", { exact: true }).fill(newName);
  await ownerPage.getByLabel("站内公告", { exact: true }).fill(announcement);
  assert.equal(await ownerPage.getByRole("button", { name: "应用到网站", exact: true }).isDisabled(), true);
  const [saved] = await Promise.all([
    ownerPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "PUT"),
    ownerPage.getByRole("button", { name: "保存草稿", exact: true }).click(),
  ]);
  assert.ok(saved.ok());
  assert.deepEqual(await (await member.request.get(`${base}/api/site-profile`)).json(), originalPublic);
  checks.push("member cannot publish and saving owner draft leaves public profile unchanged");
  await ownerPage.getByRole("button", { name: "应用到网站", exact: true }).waitFor({ state: "visible" });
  const [published] = await Promise.all([
    ownerPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings/publish")),
    ownerPage.getByRole("button", { name: "应用到网站", exact: true }).click(),
  ]);
  assert.ok(published.ok());
  const publicProfile = await (await member.request.get(`${base}/api/site-profile`)).json();
  assert.deepEqual(Object.keys(publicProfile).sort(), ["announcement", "site_name", "support_email"]);
  assert.equal(publicProfile.site_name, newName);
  const guest = await browser.newContext({ viewport: { width: 390, height: 1000 } });
  const guestPage = await guest.newPage();
  guestPage.on("pageerror", (e) => errors.push(e.message));
  await guestPage.goto(base, { waitUntil: "networkidle" });
  await guestPage.getByLabel("网站公告").waitFor();
  assert.ok((await guestPage.getByLabel("网站公告").innerText()).includes(announcement));
  assert.equal(await guestPage.locator('img[src="x"]').count(), 0);
  assert.equal(await guestPage.evaluate(() => window.__profileInjected), undefined);
  assert.equal(await guestPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.ok((await guestPage.title()).includes(newName));
  checks.push("explicit application reaches visitors as escaped text without mobile overflow");
  await guest.close();
  const secondPage = await owner.newPage();
  secondPage.on("pageerror", (e) => errors.push(e.message));
  await secondPage.goto(base, { waitUntil: "networkidle" });
  await secondPage.getByRole("button", { name: "站长后台", exact: true }).click();
  await secondPage.getByLabel("网站名称", { exact: true }).waitFor();
  await secondPage.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "保存草稿" && !button.disabled));
  const firstName = "并发窗口甲草稿";
  const secondName = "并发窗口乙保留编辑";
  await ownerPage.getByLabel("网站名称", { exact: true }).fill(firstName);
  const [firstSave] = await Promise.all([
    ownerPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "PUT"),
    ownerPage.getByRole("button", { name: "保存草稿", exact: true }).click(),
  ]);
  assert.ok(firstSave.ok());
  await secondPage.getByLabel("网站名称", { exact: true }).fill(secondName);
  const [conflictingSave] = await Promise.all([
    secondPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "PUT"),
    secondPage.getByRole("button", { name: "保存草稿", exact: true }).click(),
  ]);
  assert.equal(conflictingSave.status(), 409);
  assert.equal(await secondPage.getByLabel("网站名称", { exact: true }).inputValue(), secondName);
  assert.equal((await (await owner.request.get(`${base}/api/foundation/admin/settings`)).json()).settings.site_name, firstName);
  checks.push("two-page save conflict preserves edits and does not overwrite newer draft");
  secondPage.on("dialog", (dialog) => dialog.accept());
  await Promise.all([
    secondPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "GET"),
    secondPage.getByRole("button", { name: "重新读取草稿", exact: true }).click(),
  ]);
  await secondPage.waitForFunction((name) => [...document.querySelectorAll("input")].some((field) => field.value === name), firstName);
  await secondPage.getByLabel("网站名称", { exact: true }).fill(secondName);
  const [secondSave] = await Promise.all([
    secondPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "PUT"),
    secondPage.getByRole("button", { name: "保存草稿", exact: true }).click(),
  ]);
  assert.ok(secondSave.ok());
  const [conflictingApply] = await Promise.all([
    ownerPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings/publish")),
    ownerPage.getByRole("button", { name: "应用到网站", exact: true }).click(),
  ]);
  assert.equal(conflictingApply.status(), 409);
  assert.equal((await (await owner.request.get(`${base}/api/site-profile`)).json()).site_name, newName);
  assert.equal(await ownerPage.getByLabel("网站名称", { exact: true }).inputValue(), firstName);
  ownerPage.on("dialog", (dialog) => dialog.accept());
  const [reloaded] = await Promise.all([
    ownerPage.waitForResponse((r) => r.url().endsWith("/api/foundation/admin/settings") && r.request().method() === "GET"),
    ownerPage.getByRole("button", { name: "重新读取草稿", exact: true }).click(),
  ]);
  assert.ok(reloaded.ok());
  await ownerPage.waitForFunction((name) => [...document.querySelectorAll("input")].some((field) => field.value === name), secondName);
  await ownerPage.getByRole("button", { name: "应用到网站", exact: true }).click();
  await ownerPage.getByText("已将保存的名称、支持邮箱和公告应用到网站。工具与付费服务仍未启用。", { exact: true }).waitFor();
  const finalProfile = await (await owner.request.get(`${base}/api/site-profile`)).json();
  assert.equal(finalProfile.site_name, secondName);
  assert.deepEqual(Object.keys(finalProfile).sort(), ["announcement", "site_name", "support_email"]);
  checks.push("stale application is rejected; explicit reload permits application of the reviewed draft");
  await secondPage.close();
  await other.close();
  await member.close();
  assert.deepEqual(errors, []);
} finally {
  if (owner && originalDraft && originalPublic) {
    const restore = await saveDraft(owner, originalPublic);
    assert.ok((await applyDraft(owner, restore.revision)).ok());
    await saveDraft(owner, originalDraft);
    assert.deepEqual(await (await owner.request.get(`${base}/api/site-profile`)).json(), originalPublic);
    await owner.request.post(`${base}/api/auth/logout`, { headers });
    checks.push("original public profile and independent draft restored after testing");
  }
  await browser.close();
}
const output = resolve("test-results");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "account-settings-smoke.json"), JSON.stringify({ passed: checks.length, checks, pageErrors: errors }, null, 2));
console.log(JSON.stringify({ passed: checks.length, checks, pageErrors: errors }));
