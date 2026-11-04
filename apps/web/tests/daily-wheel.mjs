import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base = process.env.DAILY_TOOL_BASE || 'http://127.0.0.1:3200';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output = path.resolve('../../../../outputs'); fs.mkdirSync(output,{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page = await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
const checks=[], errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()) && new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
// Fix random choice to the third of four options; actual end callback and canvas still run.
await page.addInitScript(()=>{if(window.parent!==window) Math.random=()=>0.62;});
const input=page.locator('#wheel-options'),spin=page.locator('#wheel-spin');
async function check(name,fn){await fn();checks.push(name);}
async function ready(){await spin.waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#wheel-spin')?.disabled);}
async function draw(){await ready();await spin.click();await page.locator('#wheel-result').waitFor();}
let failure;
const scriptsOnly = process.argv.includes('--missing-scripts');
if (process.argv.includes('--failures') || scriptsOnly) {
 try {
  for (const script of ['lucky-canvas.umd.js', 'wheel-frame.js']) {
   await check(`blocked ${script}: bounded loading failure, frame removed, retry succeeds`, async()=>{
    await page.route(`**/vendor/lucky-canvas/${script}`,route=>route.abort());
    await page.goto(base+'/tools/wheel');
    await page.getByRole('status').filter({hasText:'加载超时'}).waitFor({timeout:12000});
    assert.equal(await page.locator('iframe').count(),0);assert.ok(await spin.isDisabled());assert.equal(await page.locator('#wheel-result').count(),0);
    await page.unroute(`**/vendor/lucky-canvas/${script}`);await page.getByRole('button',{name:'重试转盘',exact:true}).click();await draw();
   });
  }
  if (!scriptsOnly) {
  await check('missing result: busy released by timeout, old frame destroyed, late callback ignored and retry works',async()=>{
   await page.evaluate(()=>{
    window.__wheelOriginalPost=window.postMessage.bind(window);
    window.postMessage=(data,...args)=>{if(data?.tool==='daily-wheel'&&data.type==='result'){window.__wheelLate={data,source:document.querySelector('iframe').contentWindow};return;}window.__wheelOriginalPost(data,...args);};
   });
   const oldFrame=page.frames().find(f=>f.url().includes('wheel-frame.html'));await spin.click();
   await page.getByRole('status').filter({hasText:'未能正常结束'}).waitFor({timeout:12000});
   assert.ok(oldFrame.isDetached());assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#wheel-json').count(),0);
   assert.equal(await spin.innerText(),'转动，帮我选');
   await page.evaluate(()=>{const late=window.__wheelLate;if(!late)throw Error('no actual end callback captured');dispatchEvent(new MessageEvent('message',{data:late.data,source:late.source,origin:location.origin}));window.postMessage=window.__wheelOriginalPost;});
   assert.equal(await page.locator('#wheel-result').count(),0);await page.getByRole('button',{name:'重试转盘',exact:true}).click();await draw();
  });
  await check('editing clears pending result deadline; new round remains ready after old deadline',async()=>{
   await spin.click();await input.fill('甲\n乙');await ready();await page.waitForTimeout(8500);assert.ok(await spin.isEnabled());assert.equal(await page.locator('#wheel-result').count(),0);await draw();
  });
  await check('reset clears pending loading deadline; no late failure in replacement frame',async()=>{
   await page.route('**/vendor/lucky-canvas/wheel-frame.js',route=>route.abort());await page.goto(base+'/tools/wheel');await page.waitForTimeout(500);await page.unroute('**/vendor/lucky-canvas/wheel-frame.js');await page.locator('#wheel-reset').click();await ready();await page.waitForTimeout(8500);assert.ok(await spin.isEnabled());await draw();
  });
  await check('unmount clears pending result timer without later errors',async()=>{await spin.click();await page.goto(base+'/tools/gradient');await page.waitForTimeout(8500);assert.equal(await page.locator('#wheel-result').count(),0);});
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
 } catch(e) { failure=e.stack; }
 finally { await browser.close();fs.writeFileSync(path.join(output,scriptsOnly?'daily-wheel-missing-scripts-final-report.json':'daily-wheel-failure-report.json'),JSON.stringify({base,checks,errors,external,failure:failure||null},null,2)); }
 console.log(JSON.stringify({checks,errors,external,failure:failure||null},null,2));process.exit(failure?1:0);
}
try{
 await page.goto(base+'/tools/wheel'); await ready();
 await check('fixed target: end callback equals independently calculated top sector and actual canvas pixel',async()=>{
  await draw(); assert.equal(await page.locator('#wheel-result').getAttribute('data-index'),'2');
  assert.equal(await page.locator('#wheel-result').getAttribute('data-landed-index'),'2');
  const frame=page.frames().find(f=>f.url().includes('wheel-frame.html'));
  // Sample a background pixel inside top sector, away from text/arrow/ring. Third sector is #dcebf2.
  const pixel=await frame.evaluate(()=>Array.from(document.querySelector('canvas').getContext('2d').getImageData(150,55,1,1).data));
  assert.deepEqual(pixel,[220,235,242,255]);
  await page.screenshot({path:path.join(output,'daily-wheel-desktop.png'),fullPage:true});
 });
 await check('actual JSON download independently parsed with original options and matching result',async()=>{
  const pending=page.waitForEvent('download');await page.locator('#wheel-json').click();const download=await pending;
  const file=path.join(output,'daily-wheel-result.json');await download.saveAs(file);const json=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.deepEqual(json.options,['米饭套餐','面条','饺子','自己做饭']);assert.equal(json.result.text,json.options[json.result.index]);assert.equal(json.result.index,2);assert.equal(json.landing.index,2);assert.equal(json.version,'1.7.26');
 });
 await check('repeat clicks produce one live round, then another result',async()=>{
  await spin.evaluate(el=>{el.click();el.click();el.click();});assert.equal(await page.locator('#wheel-result').count(),0);await page.locator('#wheel-result').waitFor();assert.equal(await page.locator('#wheel-result').getAttribute('data-index'),'2');
 });
 await check('editing during animation destroys old realm; no stale result or download',async()=>{
  await spin.click();const oldFrame=page.frames().find(f=>f.url().includes('wheel-frame.html'));await input.fill('散步\n读书');await ready();assert.ok(oldFrame.isDetached());await page.waitForTimeout(2300);assert.equal(await page.locator('#wheel-result').count(),0);assert.equal(await page.locator('#wheel-json').count(),0);await draw();assert.equal(await page.locator('#wheel-result').getAttribute('data-index'),'1');
 });
 await check('reset during deceleration destroys old realm and clears result',async()=>{
  await spin.click();await page.waitForTimeout(700);const oldFrame=page.frames().find(f=>f.url().includes('wheel-frame.html'));await page.locator('#wheel-reset').click();await ready();assert.ok(oldFrame.isDetached());await page.waitForTimeout(2000);assert.equal(await page.locator('#wheel-result').count(),0);
 });
 await check('empty duplicate count length control bounds rejected; no old exports',async()=>{
  for(const value of ['一个','甲\n\n乙','甲\n 甲 ','A\nａ',Array.from({length:21},(_,i)=>`选项${i}`).join('\n'),'甲'.repeat(25)+'\n乙','甲\u202e\n乙']){await input.fill(value);assert.ok(await spin.isDisabled());assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#wheel-json').count(),0);assert.ok(await page.locator('main [role=alert]').isVisible());}
 });
 await check('20 options and long text produce real visible landing',async()=>{
  await input.fill(Array.from({length:20},(_,i)=>`${i+1}生活选择`+'字'.repeat(15)).join('\n'));await draw();assert.equal(await page.locator('#wheel-result').getAttribute('data-index'),'12');assert.equal(await page.locator('ol li').count(),20);
 });
 await check('390 and desktop no horizontal overflow; mobile screenshot',async()=>{
  for(const width of [390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'daily-wheel-mobile.png'),fullPage:true});
 });
 await check('unmount during animation leaves no frame callback',async()=>{await spin.click();const oldFrame=page.frames().find(f=>f.url().includes('wheel-frame.html'));await page.goto(base+'/tools/gradient');assert.ok(oldFrame.isDetached());});
 await check('zero external requests and no browser errors',async()=>{assert.deepEqual(external,[]);assert.deepEqual(errors,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'daily-wheel-browser-report.json'),JSON.stringify({base,checks,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
