import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.COMPONENT_TEST_BASE || "http://127.0.0.1:3200";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Only local synthetic tests are allowed");
const apiBase = process.env.COMPONENT_TEST_API_BASE || base;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(apiBase).hostname), "Only local synthetic APIs are allowed");
const mode = process.env.COMPONENT_TEST_MODE || "mock";
assert.ok(["mock", "live"].includes(mode));
const fixtureEmail = process.env.COMPONENT_TEST_EMAIL;
const fixturePassword = process.env.COMPONENT_TEST_PASSWORD;
if (mode === "live") assert.ok(fixtureEmail?.endsWith("@example.invalid") && fixturePassword, "Live mode requires explicit synthetic owner credentials; never reads private owner files");
const headers = { Origin: new URL(base).origin };
const executablePath = process.env.CHROME_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const checks = [], errors = [], contexts = [], created = [];
const output = resolve("../../../../outputs");
mkdirSync(output, { recursive: true });
let snapshot = {
  revision: 1,
  modules: [{ id: "work", title: "开店与工作" }, { id: "life", title: "生活小工具" }, { id: "creative", title: "创意与娱乐" }, { id: "stage-7", title: "收款与经营记录" }],
  tool_options: [{ key: "avatar", title: "几何头像", path: "/tools/avatar" }],
  items: [
    { id: "DAILY-001", title: "几何头像", description: "本机生成几何图案", module_ids: ["creative"], sort_order: 10, hidden: false, archived: false, kind: "tool", tool_key: "avatar", path: "/tools/avatar" },
    { id: "FUN-001", title: "原有功能说明", description: "尚待试配", module_ids: ["work"], sort_order: 20, hidden: false, archived: false, kind: "candidate" },
  ],
};
let sequence = 0, failNextMutation = false, managerGets = 0;
function publicSnapshot() { return { ...snapshot, items: snapshot.items.filter(item => !item.hidden && !item.archived) }; }
async function mockApi(context, role) {
  await context.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const fulfill = (status, data) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (url.pathname === "/api/account") return fulfill(200, { authenticated: Boolean(role), user: role ? { id: `synthetic-${role}`, email: `${role}@example.invalid`, role, display_name: "合成测试" } : null });
    if (url.pathname === "/api/site-profile") return fulfill(200, { site_name: "生活小助手", support_email: "", announcement: "" });
    if (url.pathname === "/api/favorites") return fulfill(200, { capability_ids: [] });
    if (url.pathname === "/api/component-catalog") return fulfill(200, publicSnapshot());
    if (url.pathname === "/api/foundation/admin/settings") return fulfill(200, { revision: 1, settings: { site_name: "生活小助手", support_email: "", announcement: "" } });
    if (url.pathname.startsWith("/api/foundation/admin/components")) {
      if (method === "GET") managerGets++;
      if (role !== "owner") return fulfill(role ? 403 : 401, { detail: "forbidden" });
      if (method === "GET") return fulfill(200, snapshot);
      if (failNextMutation) { failNextMutation = false; return fulfill(503, { detail: "synthetic failure" }); }
      const body = request.postDataJSON();
      if (body.expected_revision !== snapshot.revision) return fulfill(409, { detail: "conflict" });
      const id = decodeURIComponent(url.pathname.split("/").pop());
      if (method === "POST") {
        const item = { ...body, id: `CUSTOM-SYNTHETIC-${++sequence}`, archived: false };
        delete item.expected_revision;
        if (item.kind === "tool") item.path = snapshot.tool_options.find(tool => tool.key === item.tool_key)?.path;
        snapshot.items.push(item);
      } else {
        const index = snapshot.items.findIndex(item => item.id === id);
        if (index < 0) return fulfill(404, { detail: "not found" });
        if (method === "DELETE") snapshot.items[index].archived = true;
        else { const update = { ...body }; delete update.expected_revision; snapshot.items[index] = { ...snapshot.items[index], ...update }; }
      }
      snapshot = { ...snapshot, revision: snapshot.revision + 1 };
      return fulfill(200, snapshot);
    }
    return fulfill(200, { files: [], jobs: [] });
  });
}

async function contextFor(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  contexts.push(context);
  if (mode === "mock") await mockApi(context, role);
  else {
    if (apiBase !== base) await context.route("**/api/**", async route => {
      const requested = new URL(route.request().url());
      const forwarded = new URL(requested.pathname + requested.search, apiBase);
      const response = await route.fetch({ url: forwarded.href });
      await route.fulfill({ response });
    });
    if (role === "owner") assert.ok((await context.request.post(`${apiBase}/api/auth/login`, { headers, data: { email: fixtureEmail, password: fixturePassword } })).ok(), "Synthetic owner login failed");
    else if (role === "member") {
      const response = await context.request.post(`${apiBase}/api/auth/register`, { headers, data: { email: `component-member-${Date.now()}@example.invalid`, password: "Synthetic-Component-Member-2026" } });
      assert.ok(response.ok());
    }
  }
  return context;
}
async function getCatalog(context, publicOnly = false) {
  if (mode === "mock") return structuredClone(publicOnly ? publicSnapshot() : snapshot);
  const response = await context.request.get(`${apiBase}${publicOnly ? "/api/component-catalog" : "/api/foundation/admin/components"}`);
  assert.ok(response.ok()); return response.json();
}
async function openAdmin(context) {
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "站长后台", exact: true }).click();
  return page;
}
let owner, failure = null, completed = false;
try {
  for (const role of [null, "member"]) {
    const context = await contextFor(role), before = managerGets, page = await openAdmin(context);
    await page.getByRole("heading", { name: "站长专属管理" }).waitFor();
    assert.equal(await page.getByTestId("component-manager").count(), 0);
    if (mode === "mock") assert.equal(managerGets, before);
    else assert.equal((await context.request.get(`${apiBase}/api/foundation/admin/components`)).status(), role ? 403 : 401);
    checks.push(`${role ?? "anonymous"} cannot see component manager${mode === "live" ? " and API denies access" : " (UI mock only)"}`);
  }
  owner = await contextFor("owner");
  const page = await openAdmin(owner), manager = page.getByTestId("component-manager");
  await manager.getByRole("heading", { name: "模块与组件管理" }).waitFor();
  await manager.getByRole("button", { name: "添加组件", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector('[data-testid="component-manager"] button')?.disabled);
  const uniqueTitle = `合成功能-${Date.now()}`;
  await manager.getByRole("button", { name: "添加组件", exact: true }).click();
  assert.equal(await page.locator('input[name="component_title"]').evaluate(element => document.activeElement === element), true);
  await page.locator('input[name="component_title"]').fill(uniqueTitle);
  await page.locator('textarea[name="component_description"]').fill("用于组件管理界面的合成说明，不代表已接入工具。");
  await page.locator('input[name="component_sort"]').fill("7");
  await manager.getByRole("button", { name: "保存组件", exact: true }).click();
  await manager.getByRole("alert").filter({ hasText: "至少选择一个" }).waitFor();
  checks.push("module-less save stays in editor with a clear validation error");
  const availableModules = (await getCatalog(owner)).modules;
  const selectedModule = availableModules.find(module => module.id === "creative") ?? availableModules[0];
  await page.locator(`input[name="component_module"][value="${selectedModule.id}"]`).check();
  await manager.getByRole("button", { name: "保存组件", exact: true }).click();
  await manager.getByRole("status").filter({ hasText: "组件已添加" }).waitFor();
  let catalog = await getCatalog(owner), item = catalog.items.find(row => row.title === uniqueTitle);
  assert.ok(item); created.push(item.id);
  assert.equal(item.kind, "candidate"); assert.equal(Boolean(item.path), false);
  assert.ok((await getCatalog(owner, true)).items.some(row => row.id === item.id));
  let row = manager.locator(`[data-component-id="${item.id}"]`);
  await row.getByRole("button", { name: `隐藏${uniqueTitle}`, exact: true }).click();
  await row.getByText("已隐藏", { exact: true }).waitFor();
  assert.equal((await getCatalog(owner, true)).items.some(value => value.id === item.id), false);
  await row.getByRole("button", { name: `显示${uniqueTitle}`, exact: true }).click();
  await row.getByText("展示中", { exact: true }).waitFor();
  checks.push("candidate create and hide/show change the public catalog without a runnable path");
  await row.getByRole("button", { name: `编辑${uniqueTitle}`, exact: true }).click();
  const editedTitle = `${uniqueTitle}-编辑`;
  await page.locator('input[name="component_title"]').fill(editedTitle);
  catalog = await getCatalog(owner); const serverItem = catalog.items.find(value => value.id === item.id);
  if (mode === "mock") { snapshot.items.find(value => value.id === item.id).description = "来自另一个合成窗口"; snapshot.revision++; }
  else {
    const { id, path, ...fields } = serverItem;
    assert.ok((await owner.request.put(`${apiBase}/api/foundation/admin/components/${item.id}`, { headers, data: { expected_revision: catalog.revision, title: fields.title, description: "来自另一个合成窗口", module_ids: fields.module_ids, sort_order: fields.sort_order, hidden: Boolean(fields.hidden), archived: Boolean(fields.archived), kind: fields.kind } })).ok());
  }
  await manager.getByRole("button", { name: "保存组件", exact: true }).click();
  await manager.getByRole("alert").filter({ hasText: "其他窗口更新" }).waitFor();
  assert.equal(await page.locator('input[name="component_title"]').inputValue(), editedTitle);
  assert.equal(await manager.getByRole("button", { name: "保存组件", exact: true }).isDisabled(), true);
  await manager.getByRole("button", { name: "重新读取列表（保留表单）", exact: true }).click();
  await manager.getByRole("status").filter({ hasText: "表单仍然保留" }).waitFor();
  assert.equal(await page.locator('input[name="component_title"]').inputValue(), editedTitle);
  await manager.getByRole("button", { name: "保存组件", exact: true }).click();
  await manager.getByRole("status").filter({ hasText: "组件已保存" }).waitFor();
  checks.push("409 keeps typed content, blocks stale save, and requires an explicit retained-form reload");
  row = manager.locator(`[data-component-id="${item.id}"]`);
  await row.getByRole("button", { name: `移除${editedTitle}`, exact: true }).click();
  await row.waitFor({ state: "detached" });
  assert.equal((await getCatalog(owner, true)).items.some(value => value.id === item.id), false);
  await manager.getByLabel("显示已移除", { exact: true }).check();
  row = manager.locator(`[data-component-id="${item.id}"]`);
  await row.getByRole("button", { name: `恢复${editedTitle}`, exact: true }).click();
  await row.getByText("展示中", { exact: true }).waitFor();
  assert.ok((await getCatalog(owner, true)).items.some(value => value.id === item.id));
  checks.push("archive removes publicly, archived list makes restore available, and restore republishes");
  await manager.getByLabel("展示模块", { exact: true }).selectOption(selectedModule.id);
  await manager.getByLabel("查找组件", { exact: true }).fill(editedTitle);
  assert.equal(await manager.locator("[data-component-id]").count(), 1);
  checks.push("module and query filters return the expected component");
  await page.setViewportSize({ width: 390, height: 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await row.getByRole("button", { name: `编辑${editedTitle}`, exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: resolve(output, "生活小助手_模块组件管理手机版.png"), fullPage: true });
  checks.push("390 CSS viewport list and multi-module editor have no horizontal overflow (not a real phone)");
  if (mode === "mock") {
    await page.locator('input[name="component_title"]').fill(`${editedTitle}-保留`);
    failNextMutation = true;
    await manager.getByRole("button", { name: "保存组件", exact: true }).click();
    await manager.getByRole("alert").filter({ hasText: "操作未完成" }).waitFor();
    assert.equal(await page.locator('input[name="component_title"]').inputValue(), `${editedTitle}-保留`);
    checks.push("synthetic service error preserves the editor and restores retry controls");
  }
  await manager.getByRole("button", { name: "取消编辑", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await manager.getByLabel("查找组件", { exact: true }).fill("");
  const optionsCatalog = await getCatalog(owner);
  const toolOptions = optionsCatalog.tool_options ?? optionsCatalog.items.filter(value => value.kind === "tool" && value.tool_key && value.path).map(value => ({ key: value.tool_key, title: value.title, path: value.path }));
  assert.ok(toolOptions.length, "Synthetic catalog needs an available tool to verify binding");
  await manager.getByRole("button", { name: "添加组件", exact: true }).click();
  const toolTitle = `${uniqueTitle}-工具`;
  await page.locator('input[name="component_title"]').fill(toolTitle);
  await page.locator('select[name="component_kind"]').selectOption("tool");
  await page.locator('select[name="component_tool"]').selectOption(toolOptions[0].key);
  await manager.getByRole("button", { name: "保存组件", exact: true }).click();
  await manager.getByRole("status").filter({ hasText: "组件已添加" }).waitFor();
  const toolItem = (await getCatalog(owner)).items.find(value => value.title === toolTitle);
  assert.ok(toolItem); created.push(toolItem.id);
  assert.equal(toolItem.kind, "tool"); assert.equal(toolItem.path, toolOptions[0].path);
  checks.push("available tool binding is selected from server options and preserves its registered path");
  assert.deepEqual(errors, []);
  completed = true;
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  if (mode === "live" && owner) for (const id of created) {
    const current = await getCatalog(owner);
    await owner.request.delete(`${apiBase}/api/foundation/admin/components/${id}`, { headers, data: { expected_revision: current.revision } });
  }
  const result = { time: new Date().toISOString(), base, apiBase, mode, completed, failure, checks, pageErrors: errors, limitation: mode === "mock" ? "Isolated UI routing fixture; backend authentication/persistence not claimed" : "Explicit synthetic owner on a local test backend only; page API URLs forwarded to that real local backend without mocking payloads" };
  writeFileSync(resolve(output, `生活小助手_模块组件管理验收_${mode}.json`), JSON.stringify(result, null, 2));
  for (const context of contexts) await context.close();
  await browser.close();
  console.log(JSON.stringify(result));
}
