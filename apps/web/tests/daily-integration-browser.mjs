import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.DAILY_BASE||'http://127.0.0.1:3200',api='http://127.0.0.1:8001';
const out=resolve('../../../../outputs');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const checks=[],errors=[],external=[];let owner,originalAvatar,originalLegacy,createdId;
async function snapshot(){return (await owner.request.get(api+'/api/foundation/admin/components')).json();}
function input(row,revision,overrides={}){return {expected_revision:revision,title:row.title,description:row.description,module_ids:row.module_ids,sort_order:row.sort_order,hidden:row.hidden,archived:row.archived,kind:row.kind,...(row.tool_key?{tool_key:row.tool_key}:{}),...overrides};}
async function update(row,overrides={}){const s=await snapshot();const r=await owner.request.put(api+'/api/foundation/admin/components/'+row.id,{headers:{Origin:base},data:input(row,s.revision,overrides)});assert.equal(r.status(),200);return r.json();}
try{
 owner=await browser.newContext();assert.equal((await owner.request.post(api+'/api/auth/login',{headers:{Origin:base},data:{email:'component-owner@example.invalid',password:'ComponentFixture-2026-only'}})).status(),200);
 const context=await browser.newContext({viewport:{width:1440,height:1100}});
 await context.route('**/api/**',async route=>{const url=new URL(route.request().url());url.port='8001';const r=await route.fetch({url:url.href});await route.fulfill({response:r});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});
 const panel=()=>page.locator('section[aria-label="可以直接使用的小工具"]');
 async function home(){await page.goto(base,{waitUntil:'networkidle'});await page.getByText('6个工具已接入',{exact:true}).waitFor();}
 await home();assert.equal(await panel().locator('a[href^="/tools/"]').count(),6);assert.equal(await page.locator('.tool-card').count(),87);checks.push('Home shows six real tools separately from 87 historical candidates');
 await page.getByPlaceholder('想做什么？例如：整理报价单、处理商品图').fill('压缩');assert.equal(await panel().locator('a[href^="/tools/"]').count(),1);checks.push('Home search filters usable tools');
 await page.goto(base+'/discover',{waitUntil:'networkidle'});await page.getByLabel('状态',{exact:true}).selectOption('ready');await page.locator('[data-project-id]').first().waitFor();assert.equal(await page.locator('[data-project-id]').count(),6);
 await page.getByLabel('状态',{exact:true}).selectOption('research');assert.equal(await page.locator('[data-project-id]').count(),29);assert.equal(await page.locator('[data-project-id] a[href^="/tools/"]').count(),0);checks.push('Discovery distinguishes six usable projects and 29 research-only entries');
 const initial=await snapshot();originalAvatar=initial.items.find(x=>x.id==='DAILY-001');originalLegacy=initial.items.find(x=>x.id==='FUN-001');
 await update(originalAvatar,{hidden:true});await page.goto(base,{waitUntil:'networkidle'});await page.getByText('5个工具已接入',{exact:true}).waitFor();assert.equal(await panel().locator('[data-component-id="DAILY-001"]').count(),0);checks.push('Owner hide changes public homepage rather than only admin state');
 await page.goto(base+'/discover',{waitUntil:'networkidle'});await page.getByLabel('状态',{exact:true}).selectOption('ready');await page.locator('[data-project-id]').first().waitFor();assert.equal(await page.locator('[data-project-id]').count(),5);checks.push('Owner hide also changes discovery count and entries');
 await update(originalAvatar,{title:'独立验收头像',module_ids:['life']});await home();await page.getByRole('button',{name:'创意与娱乐',exact:true}).click();assert.equal(await panel().locator('[data-component-id="DAILY-001"]').count(),0);await page.getByRole('button',{name:'生活小工具',exact:true}).click();assert.equal(await panel().getByRole('heading',{name:'独立验收头像',exact:true}).count(),1);checks.push('Owner title and module assignments affect public views');
 await update(originalAvatar);
 await update(originalLegacy,{archived:true});await home();assert.equal(await page.locator('.tool-card').count(),86);checks.push('Archive filters original catalog entries without deleting source snapshot');await update(originalLegacy);
 const s=await snapshot();const made=await owner.request.post(api+'/api/foundation/admin/components',{headers:{Origin:base},data:{expected_revision:s.revision,title:'ROOT生活组件验收',description:'隔离测试的待接入说明',module_ids:['life'],sort_order:0,hidden:false,kind:'candidate'}});assert.equal(made.status(),200);const m=await made.json();createdId=m.items.find(x=>x.title==='ROOT生活组件验收'&&!x.archived).id;
 await home();await page.getByRole('button',{name:'生活小工具',exact:true}).click();const custom=panel().locator('[data-component-id="'+createdId+'"]');assert.equal(await custom.count(),1);assert.equal(await custom.locator('a[href^="/tools/"]').count(),0);checks.push('New custom candidate appears in chosen module with no fake runnable link');
 let latest=await snapshot();assert.equal((await owner.request.delete(api+'/api/foundation/admin/components/'+createdId,{headers:{Origin:base},data:{expected_revision:latest.revision}})).status(),200);
 await home();await page.screenshot({path:resolve(out,'生活小助手_六工具首页电脑版.png')});await page.setViewportSize({width:390,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await panel().screenshot({path:resolve(out,'生活小助手_六工具首页手机版.png')});checks.push('Desktop and 390px public screenshots; no horizontal overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({passed:checks.length,checks,pageErrors:errors,externalRequests:external}));
}finally{
 if(owner){if(originalAvatar)await update(originalAvatar);if(originalLegacy)await update(originalLegacy);if(createdId){const s=await snapshot();const row=s.items.find(x=>x.id===createdId);if(row&&!row.archived)await owner.request.delete(api+'/api/foundation/admin/components/'+createdId,{headers:{Origin:base},data:{expected_revision:s.revision}});}}
 writeFileSync(resolve(out,'生活小助手_六工具与组件管理整体验收.json'),JSON.stringify({checks,pageErrors:errors,externalRequests:external},null,2));await browser.close();
}
