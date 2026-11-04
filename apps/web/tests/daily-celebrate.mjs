import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output=path.resolve('../../../../outputs');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'no-preference'});
const checks=[],errors=[],external=[],artifacts={},pixelSamples=[];let failure;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
await page.addInitScript(()=>{
 window.__celebrateFrames=new Set();window.__celebrateFrameCalls=0;const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>{let id;const tracked=callback?.name==='onFrame';id=request(time=>{if(tracked)window.__celebrateFrames.delete(id);callback(time);});if(tracked){window.__celebrateFrames.add(id);window.__celebrateFrameCalls++;}return id;};window.cancelAnimationFrame=id=>{window.__celebrateFrames.delete(id);return cancel(id);};
 window.Worker=class{constructor(){throw Error('Unexpected Worker');}};if(window.Notification)Notification.requestPermission=()=>{throw Error('Unexpected notification permission');};
});
const field=name=>page.locator('#celebrate-'+name),button=field('generate'),status=page.locator('p[role=status]');
async function ready(){await page.waitForFunction(()=>!document.querySelector('#celebrate-generate')?.disabled);}
async function generate(){await ready();await button.click();}
async function stopped(){await page.waitForFunction(()=>document.querySelector('#celebrate-stage')?.dataset.running==='false');}
async function noFrames(){await page.waitForFunction(()=>window.__celebrateFrames.size===0);}
async function sample(){return field('canvas').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261,opaque=0;for(let i=0;i<data.length;i+=4){if(data[i+3])opaque++;hash=Math.imul(hash^data[i]^data[i+1]^data[i+2]^data[i+3],16777619);}return{hash:hash>>>0,nontransparentPixels:opaque};});}
const pngCheck=String.raw`from PIL import Image
import sys,json,hashlib
im=Image.open(sys.argv[1]);im.load();assert im.format=='PNG';assert im.size==(960,640)
im=im.convert('RGBA');colors=im.getcolors(960*640);assert all(c[3]==255 for n,c in colors)
nonpaper=sum(n for n,c in colors if c[:3]!=(255,248,236))
gold=sum(n for n,c in colors if c[0]>120 and c[1]>100 and c[0]-c[2]>40 and c[1]-c[2]>20)
assert nonpaper>4000
print(json.dumps({'width':960,'height':640,'nonpaper':nonpaper,'goldParticlePixels':gold,'pixelHash':hashlib.sha256(im.tobytes()).hexdigest()}))`;
async function download(name){const pending=page.waitForEvent('download');await field('png').click();const d=await pending,file=path.join(output,'celebrate-'+name+'.png');await d.saveAs(file);const r=spawnSync(path.resolve('../backend/.venv/Scripts/python.exe'),['-c',pngCheck,file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
async function check(name,fn){await fn();checks.push(name);}
try{
 await page.goto(base+'/tools/celebrate');await ready();
 await check('no autoplay; actual library RAF particles change canvas pixels after explicit play, repeated clicks start one burst',async()=>{
  assert.equal(await page.evaluate(()=>window.__celebrateFrameCalls),0);assert.equal(await field('canvas').evaluate(c=>c.width),0);await page.evaluate(()=>{window.__celebrateCreates=0;const original=window.confetti.create;window.confetti.create=(...args)=>{window.__celebrateCreates++;return original(...args);};});
  await button.evaluate(el=>{el.click();el.click();el.click();});await page.waitForTimeout(120);pixelSamples.push(await sample());await page.waitForTimeout(150);pixelSamples.push(await sample());assert.ok(pixelSamples.every(x=>x.nontransparentPixels>100));assert.notEqual(pixelSamples[0].hash,pixelSamples[1].hash);assert.equal(await page.evaluate(()=>window.__celebrateCreates),1);
 });
 await check('actual captured PNG independently decoded: 960×640 opaque paper, nonempty text and colored particle pixels; stop releases RAF',async()=>{
  await field('png').waitFor();artifacts.animated=await download('animated-frame');assert.ok(artifacts.animated.goldParticlePixels>300);await field('stop').click();await stopped();await noFrames();assert.equal(await field('canvas').evaluate(c=>c.width),0);assert.equal(await field('png').count(),1);await page.screenshot({path:path.join(output,'celebrate-desktop.png'),fullPage:true});
 });
 await check('single active burst has a finite foreground deadline and preserves a genuine automatic static frame',async()=>{
  await generate();await field('png').waitFor();await stopped();await noFrames();assert.equal(await field('png').count(),1);assert.equal(await field('canvas').evaluate(c=>c.width),0);
 });
 await check('editing cancels animation, clears old file and revokes its URL; unsafe/oversized text rejects without playback',async()=>{
  const old=await field('png').getAttribute('href');await field('greeting').fill('新的快乐');assert.equal(await field('png').count(),0);assert.ok(await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},old));
  for(const value of ['', '字'.repeat(25),'<script>1</script>','https://example.test','甲\u202e乙']){await field('greeting').fill(value);await generate();await stopped();await noFrames();assert.equal(await field('png').count(),0);assert.ok((await status.innerText()).includes('纯文字'));}
  await field('greeting').fill('安心 & 喜欢 "今天"');
 });
 await check('stop and edits cancel old delayed PNG encoding, release frame canvas and never restore stale results',async()=>{
  await page.evaluate(()=>{window.__celebrateBlob=HTMLCanvasElement.prototype.toBlob;window.__celebrateCanvases=[];HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.__celebrateCanvases.push(this);window.__celebrateBlob.call(this,blob=>setTimeout(()=>callback(blob),650),...args);};});
  await generate();await page.waitForTimeout(150);await field('capture').click();await page.waitForFunction(()=>window.__celebrateCanvases.length===1);await field('greeting').fill('下一轮祝福');await page.waitForTimeout(800);await stopped();await noFrames();assert.equal(await field('png').count(),0);assert.ok(await button.isEnabled());assert.ok(await page.evaluate(()=>window.__celebrateCanvases.every(c=>c.width===0&&c.height===0)));await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__celebrateBlob;});
 });
 await check('reduced-motion preference disables dynamic RAF; static fallback independently exports, dynamic preference change stops current run',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await field('reduced').waitFor();const before=await page.evaluate(()=>window.__celebrateFrameCalls);await generate();await field('png').waitFor();await stopped();await noFrames();assert.equal(await page.evaluate(()=>window.__celebrateFrameCalls),before);artifacts.reduced=await download('reduced-motion');assert.ok(artifacts.reduced.goldParticlePixels>300);assert.notEqual(artifacts.reduced.pixelHash,artifacts.animated.pixelHash);
  await page.emulateMedia({reducedMotion:'no-preference'});await field('reduced').waitFor({state:'detached'});await generate();await page.waitForTimeout(100);await page.emulateMedia({reducedMotion:'reduce'});await field('reduced').waitFor();await stopped();await noFrames();
 });
 await check('null and no-return PNG encoders have bounded recoverable errors without stale downloads',async()=>{
  await page.evaluate(()=>{window.__celebrateBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});await generate();await status.filter({hasText:'PNG生成失败'}).waitFor();assert.equal(await field('png').count(),0);await noFrames();assert.ok(await button.isEnabled());
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(){};});await generate();await status.filter({hasText:'PNG编码超时'}).waitFor({timeout:12000});assert.equal(await field('png').count(),0);assert.ok(await button.isEnabled());await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__celebrateBlob;});await generate();await field('png').waitFor();
 });
 await check('maximum greeting, alternate palette, 390/1280 no overflow and independent final PNG',async()=>{
  await field('greeting').fill('字'.repeat(24));await field('palette').selectOption('fresh');await generate();await field('png').waitFor();artifacts.mobile=await download('final-card');for(const width of[390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'celebrate-mobile.png'),fullPage:true});
 });
 await check('SPA unmount cancels library frames and old encoding; component dependency failure/timeout restores after retry',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await field('reduced').waitFor({state:'detached'});await generate();await page.waitForTimeout(100);await page.getByRole('link',{name:'← 回到新发现',exact:true}).click();await field('canvas').waitFor({state:'detached'});await noFrames();
  await page.goto(base+'/tools/celebrate');await ready();await page.evaluate(()=>{delete window.confetti;});await generate();assert.ok(await button.isDisabled());await field('retry').click();await ready();
  await page.route('**/vendor/canvas-confetti/confetti.browser.js',route=>route.abort());await page.reload();await field('retry').waitFor();assert.ok(await button.isDisabled());await page.unroute('**/vendor/canvas-confetti/confetti.browser.js');await field('retry').click();await ready();
  await page.route('**/vendor/canvas-confetti/confetti.browser.js',()=>{});await page.reload({waitUntil:'domcontentloaded'});await status.filter({hasText:'加载超时'}).waitFor({timeout:12000});assert.ok(await button.isDisabled());await page.unroute('**/vendor/canvas-confetti/confetti.browser.js');await field('retry').click();await ready();await generate();await field('png').waitFor();await field('stop').click();await noFrames();
 });
 await check('zero external requests or uncaught errors, no Worker/audio/notification path',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'celebrate-browser-report.json'),JSON.stringify({base,checks,pixelSamples,artifacts,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,pixelSamples,artifacts,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
