import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output=path.resolve('../../../../outputs');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1280,height:1000}}),checks=[],errors=[],external=[],measurements={};let failure;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
await page.addInitScript(()=>{
 window.__timerIntervals=new Set();window.__timerLastTick=null;const set=window.setInterval.bind(window),clear=window.clearInterval.bind(window);
 window.setInterval=(callback,delay,...args)=>{const id=set(callback,delay,...args);if(callback?.name==='updateTimerAndDispatchEvents'){window.__timerIntervals.add(id);window.__timerLastTick=callback;}return id;};window.clearInterval=id=>{window.__timerIntervals.delete(id);return clear(id);};
 if(window.Notification)Notification.requestPermission=()=>{throw Error('Unexpected notification permission');};
 if(navigator.wakeLock)navigator.wakeLock.request=()=>{throw Error('Unexpected wake lock permission');};
});
const field=name=>page.locator('#timer-'+name),status=page.locator('p[role=status]'),start=field('start');
async function ready(){await page.waitForFunction(()=>!document.querySelector('#timer-start')?.disabled);}
async function phase(name){await page.waitForFunction(value=>document.querySelector('#timer-phase')?.dataset.phase===value,name);}
async function value(){return Number(await field('display').getAttribute('data-tenths'));}
async function intervals(count){assert.equal(await page.evaluate(()=>window.__timerIntervals.size),count);}
async function check(name,fn){await fn();checks.push(name);}
async function download(type,name){const pending=page.waitForEvent('download');await field(type).click();const item=await pending,file=path.join(output,'timer-'+name+'.'+type);await item.saveAs(file);return fs.readFileSync(file,'utf8');}
async function snapshot(){return field('json').evaluate(async link=>JSON.parse(await(await fetch(link.href)).text()));}
async function countdown(seconds){await field('mode').selectOption('countdown');await field('minutes').fill('0');await field('seconds').fill(String(seconds));}
if (process.argv.includes('--export-failure')) {
 try {
  await page.goto(base+'/tools/timer');await ready();await start.click();await page.waitForTimeout(350);
  await check('second object URL failure keeps timer paused, revokes partial file, preserves failure and retries without an interval',async()=>{
   await page.evaluate(()=>{window.__realCreateUrl=URL.createObjectURL;window.__realRevokeUrl=URL.revokeObjectURL;window.__created=[];window.__revoked=[];let calls=0;URL.createObjectURL=function(...args){if(++calls===2)throw Error('Injected second object URL failure');const url=window.__realCreateUrl.apply(URL,args);window.__created.push(url);return url;};URL.revokeObjectURL=function(url){window.__revoked.push(url);return window.__realRevokeUrl.call(URL,url);};});
   await field('pause').click();await phase('paused');await intervals(0);assert.equal(await field('output').count(),0);assert.ok((await status.innerText()).includes('记录文件生成失败'));assert.ok(await page.evaluate(()=>window.__created.length===1&&window.__created.every(url=>window.__revoked.includes(url))));
   await page.evaluate(()=>{URL.createObjectURL=window.__realCreateUrl;URL.revokeObjectURL=window.__realRevokeUrl;});await field('save-retry').click();const json=JSON.parse(await download('json','export-recovered'));assert.equal(json.state,'paused');assert.ok(json.snapshot.elapsedSeconds>=.2);await intervals(0);assert.ok((await status.innerText()).includes('已重新生成'));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  });
 }catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'timer-export-failure-report.json'),JSON.stringify({checks,errors,external,failure:failure||null},null,2));}
 console.log(JSON.stringify({checks,errors,external,failure:failure||null},null,2));process.exit(failure?1:0);
}
const lifecycleOnly=process.argv.includes('--lifecycle');
try{
 await page.goto(base+'/tools/timer');await ready();
 await page.evaluate(()=>{window.__timerInstances=[];window.__timerRemoves=0;const Original=window.easytimer.Timer;window.easytimer.Timer=function(...args){const timer=new Original(...args),remove=timer.removeAllEventListeners.bind(timer);timer.removeAllEventListeners=(...values)=>{window.__timerRemoves++;return remove(...values);};window.__timerInstances.push(timer);return timer;};});
 if(!lifecycleOnly){
 await check('actual EasyTimer stopwatch advances near independent performance time; repeated starts create one interval',async()=>{
  const before=await page.evaluate(()=>performance.now());await start.evaluate(button=>{button.click();button.click();button.click();});await phase('running');await page.waitForTimeout(1450);await field('record').click();await field('pause').click();await phase('paused');const elapsed=(await value())/10,wall=(await page.evaluate(()=>performance.now())-before)/1000;measurements.stopwatch={elapsedSeconds:elapsed,independentPerformanceSeconds:wall,toleranceSeconds:.45};assert.ok(Math.abs(elapsed-wall)<.45);assert.ok(elapsed>=1.2);assert.equal(await page.evaluate(()=>window.__timerInstances.length),1);await intervals(0);
 });
 await check('pause is stable, actual JSON/TXT downloads parse; resume excludes paused time and clears old files',async()=>{
  const frozen=await value(),old=await field('json').getAttribute('href');await page.waitForTimeout(900);assert.equal(await value(),frozen);const json=JSON.parse(await download('json','stopwatch-paused'));assert.equal(json.state,'paused');assert.equal(json.snapshot.elapsedSeconds,frozen/10);assert.equal(json.records.length,1);assert.ok(json.records[0].elapsedSeconds>=1.2);const txt=await download('txt','stopwatch-paused');assert.ok(txt.includes('秒表'));assert.ok(txt.includes('已暂停'));assert.ok(txt.includes(json.snapshot.displayed));
  await start.click();await phase('running');assert.equal(await field('output').count(),0);assert.ok(await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},old));await intervals(1);await page.waitForTimeout(1000);await field('pause').click();assert.ok((await value())>=frozen+8&&(await value())<=frozen+13);await intervals(0);await page.screenshot({path:path.join(output,'timer-desktop.png'),fullPage:true});
 });
 await check('manual records limited to 20; reset and mode edits clear records, callbacks and actual intervals',async()=>{
  for(let i=1;i<20;i++)await field('record').click();assert.ok(await field('record').isDisabled());assert.equal((await snapshot()).records.length,20);await start.click();await intervals(1);await page.evaluate(()=>{window.__oldTimerTick=window.__timerLastTick;});await field('reset').click();await phase('idle');await intervals(0);assert.equal(await page.locator('tbody tr').count(),0);assert.equal(await field('output').count(),0);await page.evaluate(()=>window.__oldTimerTick());assert.equal(await field('output').count(),0);assert.ok(await page.evaluate(()=>window.__timerRemoves>0&&window.__timerInstances.every(instance=>!instance.isRunning())));
  await start.click();await intervals(1);await field('mode').selectOption('countdown');await intervals(0);await phase('idle');assert.equal(await page.locator('tbody tr').count(),0);
 });
 await check('real two-second countdown reaches zero once, remains nonnegative, stops interval and saves actual completed record',async()=>{
  await countdown(2);const before=await page.evaluate(()=>performance.now());await start.click();await phase('finished');const wall=(await page.evaluate(()=>performance.now())-before)/1000;measurements.countdown={configuredSeconds:2,independentPerformanceSeconds:wall,toleranceSeconds:.45};assert.ok(Math.abs(wall-2)<.45);assert.equal(await value(),0);await intervals(0);await page.waitForTimeout(400);assert.equal(await value(),0);const data=JSON.parse(await download('json','countdown-completed'));assert.equal(data.state,'finished');assert.equal(data.session.countdownSeconds,2);assert.equal(data.snapshot.remainingSeconds,0);assert.equal(data.snapshot.elapsedSeconds,2);assert.equal(data.snapshot.displayed,'00:00:00.0');await download('txt','countdown-completed');await start.click();await phase('running');assert.equal(await field('output').count(),0);await field('reset').click();
 });
 await check('countdown pause/resume conserves remaining time and elapsed plus remaining equals configuration',async()=>{
  await countdown(4);await start.click();await page.waitForTimeout(1150);await field('pause').click();const frozen=await value(),data=await snapshot();assert.ok(frozen>=26&&frozen<=31);assert.equal(data.snapshot.elapsedSeconds+data.snapshot.remainingSeconds,4);await page.waitForTimeout(800);assert.equal(await value(),frozen);await start.click();await page.waitForTimeout(800);await field('pause').click();assert.ok((await value())<=frozen-6&&(await value())>=frozen-11);await intervals(0);
 });
 await check('all invalid duration forms reject without an interval or stale record/download',async()=>{
  for(const [minutes,seconds]of [['0','0'],['1440','1'],['1441','0'],['-1','0'],['1.5','0'],['1e2','0'],['0','60'],['0','-1'],['0','0.5'],['','1']]){await field('minutes').fill(minutes);await field('seconds').fill(seconds);await start.click();await phase('idle');await intervals(0);assert.equal(await field('output').count(),0);assert.ok(!await status.innerText().then(text=>text.includes('正在计时')));}
 });
 await check('simulated large clock jump clamps countdown zero and stopwatch 24-hour cap, clears timers',async()=>{
  await countdown(1);await start.click();await page.evaluate(()=>{window.__realDateNow=Date.now;const stamp=Date.now();Date.now=()=>stamp+12000;});await phase('finished');await page.evaluate(()=>{Date.now=window.__realDateNow;});assert.equal(await value(),0);assert.equal((await snapshot()).snapshot.elapsedSeconds,1);await intervals(0);
  await field('mode').selectOption('stopwatch');await start.click();await page.evaluate(()=>{window.__realDateNow=Date.now;const stamp=Date.now();Date.now=()=>stamp+86400001;});await phase('finished');await page.evaluate(()=>{Date.now=window.__realDateNow;});assert.equal(await value(),864000);assert.equal((await snapshot()).snapshot.displayed,'24:00:00.0');await intervals(0);await field('reset').click();
 });
 }
 await check('visibility change automatically pauses and SPA unmount removes interval/listeners and discards old callbacks',async()=>{
  await start.click();await page.waitForTimeout(250);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await phase('paused');await intervals(0);assert.ok((await status.innerText()).includes('后台'));await page.evaluate(()=>{delete document.hidden;});await start.click();await intervals(1);const removes=await page.evaluate(()=>window.__timerRemoves);await page.getByRole('link',{name:'← 回到新发现',exact:true}).click();await page.waitForURL(url=>url.pathname==='/');await field('display').waitFor({state:'detached'});await page.waitForFunction(()=>window.__timerIntervals.size===0);await intervals(0);assert.ok(await page.evaluate(count=>window.__timerRemoves>count,removes));await page.evaluate(()=>window.__timerLastTick());assert.equal(await field('output').count(),0);
 });
 await check('390/1280 layouts remain inside viewport with maximum input and long readout',async()=>{
  await page.goto(base+'/tools/timer');await ready();await countdown(59);await field('minutes').fill('1440');await field('seconds').fill('0');for(const width of[390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.setViewportSize({width:390,height:844});await start.click();await page.waitForTimeout(250);await field('pause').click();await page.screenshot({path:path.join(output,'timer-mobile.png'),fullPage:true});await intervals(0);
 });
 await check('missing/stalled local dependency has bounded Chinese failure and retry recovers real timer',async()=>{
  await field('reset').click();await page.evaluate(()=>{delete window.easytimer;});await start.click();assert.ok(await start.isDisabled());await field('retry').click();await ready();await start.click();await phase('running');await field('reset').click();
  await page.route('**/vendor/easytimer/easytimer.js',route=>route.abort());await page.reload();await field('retry').waitFor();assert.ok(await start.isDisabled());await page.unroute('**/vendor/easytimer/easytimer.js');await field('retry').click();await ready();await start.click();await phase('running');await field('reset').click();
  await page.route('**/vendor/easytimer/easytimer.js',()=>{});await page.reload({waitUntil:'domcontentloaded'});await status.filter({hasText:'加载超时'}).waitFor({timeout:12000});assert.ok(await start.isDisabled());await page.unroute('**/vendor/easytimer/easytimer.js');await field('retry').click();await ready();await start.click();await phase('running');await field('reset').click();await intervals(0);
 });
 await check('zero external requests, uncaught errors, notification or wake-lock permission requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,lifecycleOnly?'timer-lifecycle-final-report.json':'timer-browser-report.json'),JSON.stringify({base,checks,measurements,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,measurements,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
