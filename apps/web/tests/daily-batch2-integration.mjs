import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.DAILY_BASE||'http://127.0.0.1:3200',api='http://127.0.0.1:8001';
assert.equal(new URL(base).hostname,'127.0.0.1');
const before=existsSync('.cache/batch2-before.json') ? JSON.parse(readFileSync('.cache/batch2-before.json','utf8')) : Object.fromEntries(JSON.parse(readFileSync('../backend/src/life_helper/component_seed.json','utf8')).items.map(item=>[item.id,item]));
const ids={'DAILY-014':'gallery','DAILY-017':'contrast','DAILY-018':'gradient'};
const out=resolve('../../../../outputs');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const checks=[],errors=[],external=[];let owner;
async function snap(){return (await owner.request.get(api+'/api/foundation/admin/components')).json();}
async function edit(id,change){const s=await snap(),r=s.items.find(x=>x.id===id);const body={expected_revision:s.revision,title:r.title,description:r.description,module_ids:r.module_ids,sort_order:r.sort_order,hidden:r.hidden,archived:r.archived,kind:r.kind,...(r.tool_key?{tool_key:r.tool_key}:{}),...change};const response=await owner.request.put(api+'/api/foundation/admin/components/'+id,{headers:{Origin:base},data:body});assert.equal(response.status(),200);return response.json();}
try{
 owner=await browser.newContext();assert.equal((await owner.request.post(api+'/api/auth/login',{headers:{Origin:base},data:{email:'component-owner@example.invalid',password:'ComponentFixture-2026-only'}})).status(),200);
 if(process.env.BATCH2_CHECK_MIGRATION==='1'){
  const s=await snap();for(const [id,key] of Object.entries(ids)){const r=s.items.find(x=>x.id===id);assert.equal(r.kind,'tool');assert.equal(r.tool_key,key);assert.equal(r.title,'ROOT预迁移'+id);}
  assert.equal(s.items.find(x=>x.id==='DAILY-014').hidden,true);assert.equal(s.items.find(x=>x.id==='DAILY-017').archived,true);assert.deepEqual(s.items.find(x=>x.id==='DAILY-018').module_ids,['work']);assert.equal(s.items.find(x=>x.id==='DAILY-018').sort_order,0);
  const pub=await (await owner.request.get(api+'/api/component-catalog')).json();assert.equal(pub.items.filter(x=>x.kind==='tool').length,7);checks.push('Actual prior database migration preserved hidden, archived, title, modules and order; only bindings upgraded');
 }
 for(const [id,key]of Object.entries(ids)){const old=before[id];await edit(id,{title:old.title,description:old.description,module_ids:old.module_ids,sort_order:old.sort_order,hidden:old.hidden,archived:old.archived,kind:'tool',tool_key:key});}
 const c=await browser.newContext({viewport:{width:1440,height:1100}});await c.route('**/api/**',async route=>{const u=new URL(route.request().url());u.port='8001';const r=await route.fetch({url:u.href});await route.fulfill({response:r});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});
 const panel=()=>p.getByRole('region',{name:'可以直接使用的小工具'});
 async function home(count=9){await p.goto(base,{waitUntil:'networkidle'});await p.getByText(count+'个工具已接入',{exact:true}).waitFor();}
 await home();const links=await panel().locator('a[href^="/tools/"]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));assert.equal(new Set(links).size,9);for(const key of Object.values(ids))assert.ok(links.includes('/tools/'+key));assert.equal(await p.locator('.tool-card').count(),87);checks.push('Homepage exposes nine distinct usable routes; old87 candidates retained');
 await p.goto(base+'/discover',{waitUntil:'networkidle'});await p.getByLabel('状态',{exact:true}).selectOption('ready');await p.locator('[data-project-id]').first().waitFor();assert.equal(await p.locator('[data-project-id]').count(),9);const gradient=p.locator('[data-project-id="DAILY-018"]');await gradient.locator('summary').click();await gradient.getByText('已接入制品：',{exact:false}).filter({hasText:'BSD-3-Clause AND Apache-2.0'}).waitFor();checks.push('Discovery nine ready/26 research and actual chroma dual obligations visible');
 await p.getByLabel('状态',{exact:true}).selectOption('research');assert.equal(await p.locator('[data-project-id]').count(),26);
 await edit('DAILY-017',{hidden:true});await home(8);assert.equal(await panel().locator('a[href="/tools/contrast"]').count(),0);assert.equal(await panel().locator('a[href^="/tools/"]').count(),8);checks.push('Owner hiding newly migrated contrast removes public entry without deleting data');await edit('DAILY-017',{hidden:false});
 for(const key of Object.values(ids)){await p.goto(base+'/tools/'+key,{waitUntil:'networkidle'});assert.equal(await p.locator('h1').count(),1);}
 checks.push('Three new usable routes and local dependencies load in integrated frontend');
 await home();await p.screenshot({path:resolve(out,'生活小助手_九工具首页电脑版.png'),fullPage:true});await p.setViewportSize({width:390,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:resolve(out,'生活小助手_九工具首页手机版.png'),fullPage:true});checks.push('390px and desktop integrated nine-tool screenshots without horizontal overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({passed:checks.length,checks,pageErrors:errors,externalRequests:external}));
}finally{
 if(owner)for(const [id,key] of Object.entries(ids)){const old=before[id];await edit(id,{title:old.title,description:old.description,module_ids:old.module_ids,sort_order:old.sort_order,hidden:old.hidden,archived:old.archived,kind:'tool',tool_key:key});}
 writeFileSync(resolve(out,'生活小助手_第二批整体验收'+(process.env.BATCH2_CHECK_MIGRATION==='1'?'_迁移':'_生产')+'.json'),JSON.stringify({checks,pageErrors:errors,externalRequests:external},null,2));await browser.close();
}
