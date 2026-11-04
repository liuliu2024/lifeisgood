import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const base=process.env.DAILY_BASE||'http://127.0.0.1:3200',api='http://127.0.0.1:8001';assert.equal(new URL(base).hostname,'127.0.0.1');
const ids={'DAILY-073':'recipe-scale','DAILY-074':'phone-format'},before=existsSync('.cache/batch16-before.json')?JSON.parse(readFileSync('.cache/batch16-before.json','utf8')):null;
const out=resolve('../../../../outputs');mkdirSync(out,{recursive:true});const checks=[],errors=[],external=[];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});let owner,oldPhone;
async function snap(){return(await owner.request.get(api+'/api/foundation/admin/components')).json();}
async function update(id,overrides){const s=await snap(),r=s.items.find(x=>x.id===id);const data={expected_revision:s.revision,title:r.title,description:r.description,module_ids:r.module_ids,sort_order:r.sort_order,hidden:r.hidden,archived:r.archived,kind:r.kind,...(r.tool_key?{tool_key:r.tool_key}:{}),...overrides};const res=await owner.request.put(api+'/api/foundation/admin/components/'+id,{headers:{Origin:base},data});assert.equal(res.status(),200);}
try{
 owner=await browser.newContext();assert.equal((await owner.request.post(api+'/api/auth/login',{headers:{Origin:base},data:{email:'component-owner@example.invalid',password:'ComponentFixture-2026-only'}})).status(),200);
 const s=await snap();
 if(process.env.BATCH16_CHECK_MIGRATION==='1'){
  assert.ok(before,'Migration mode requires an explicit synthetic pre-upgrade baseline; private owner data is never loaded');
  assert.equal(s.items.length,Object.keys(before.items).length+2);assert.equal(s.revision,before.revision+2);
  for(const [id,old]of Object.entries(before.items)){const item=s.items.find(x=>x.id===id);assert.ok(item);for(const key of Object.keys(old))assert.deepEqual(item[key],old[key],id+':'+key);}
  for(const [id,key]of Object.entries(ids)){const item=s.items.find(x=>x.id===id);assert.equal(item.kind,'tool');assert.equal(item.tool_key,key);assert.equal(s.items.filter(x=>x.id===id).length,1);}
  assert.equal(s.tool_options.some(x=>x.key==='diagram'),false);assert.equal(s.tool_options.some(x=>x.key==='calendar'),false);assert.equal(s.tool_options.some(x=>x.key==='sudoku'),false);checks.push('Two new IDs inserted once; all old owner fields preserved;revision+2;diagram disabled');
 }
 oldPhone=s.items.find(x=>x.id==='DAILY-074');
 const c=await browser.newContext({viewport:{width:1440,height:1100}});
 await c.route('**/api/**',async route=>{const u=new URL(route.request().url());u.port='8001';const r=await route.fetch({url:u.href});await route.fulfill({response:r});});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});
 const panel=()=>p.getByRole('region',{name:'可以直接使用的小工具'});
 async function home(n=48){await p.goto(base,{waitUntil:'networkidle'});await p.getByText(n+'个工具已接入',{exact:true}).waitFor();}
 await home();const paths=await panel().locator('a[href^="/tools/"]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')));assert.equal(new Set(paths).size,48);for(const key of Object.values(ids))assert.ok(paths.includes('/tools/'+key));assert.equal(await p.locator('.tool-card').count(),87);checks.push('Forty-eight unique usable tools are separate from87 old candidates');
 await p.getByPlaceholder('想做什么？例如：整理报价单、处理商品图').fill('电话号码');assert.equal(await panel().locator('a[href^="/tools/"]').count(),1);assert.equal(await panel().locator('a').filter({hasText:'打开工具'}).getAttribute('href'),'/tools/phone-format');checks.push('Global usable search finds 电话号码 with its actual route');
 await p.goto(base+'/discover',{waitUntil:'networkidle'});await p.getByLabel('状态',{exact:true}).selectOption('ready');await p.locator('[data-project-id]').first().waitFor();assert.equal(await p.locator('[data-project-id]').count(),48);for(const id of Object.keys(ids))assert.equal(await p.locator('[data-project-id="'+id+'"]').count(),1);
 await p.getByLabel('状态',{exact:true}).selectOption('research');assert.equal(await p.locator('[data-project-id]').count(),24);await p.locator('[data-project-id="DAILY-020"]').getByText('许可待核，未接入',{exact:true}).waitFor();checks.push('Original35 plus37 extra sources form48 usable/24 research;Pintora pending');
 await update('DAILY-074',{hidden:true});await home(47);assert.equal(await panel().locator('a[href="/tools/phone-format"]').count(),0);await update('DAILY-074',{hidden:oldPhone.hidden});checks.push('Owner hiding new phone changes public navigation and is restorable');
 for(const key of Object.values(ids)){await p.goto(base+'/tools/'+key,{waitUntil:'domcontentloaded'});await p.locator('h1').waitFor();const button={'recipe-scale':'#recipe-scale-generate','phone-format':'#phone-run'}[key];await p.locator(button).waitFor({state:'visible'});assert.equal(await p.locator('h1').count(),1);}
 await p.goto(base+'/tools/phone-format',{waitUntil:'domcontentloaded'});await p.locator('#phone-run').waitFor();await p.getByRole('link',{name:'← 回到新发现',exact:true}).click();await p.waitForURL('**/#daily-tools');assert.equal(await p.locator('#daily-tools').count(),1);checks.push('Two accepted routes load;return link reaches the actual usable section');
 await home();await p.screenshot({path:resolve(out,'生活小助手_四十八工具首页电脑版.png')});await p.setViewportSize({width:390,height:1000});await p.waitForFunction(()=>getComputedStyle(document.querySelector('.sidebar')).visibility==='hidden');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:resolve(out,'生活小助手_四十八工具首页手机版.png')});checks.push('Desktop and390 viewport without horizontal overflow');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({passed:checks.length,checks,pageErrors:errors,externalRequests:external}));
}finally{if(owner&&oldPhone)await update('DAILY-074',{hidden:oldPhone.hidden});writeFileSync(resolve(out,'生活小助手_第十六批整体验收'+(process.env.BATCH16_PHASE||(process.env.BATCH16_CHECK_MIGRATION==='1'?'_迁移':'_生产'))+'.json'),JSON.stringify({checks,pageErrors:errors,externalRequests:external},null,2));await browser.close();}
