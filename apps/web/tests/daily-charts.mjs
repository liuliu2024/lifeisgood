import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output=path.resolve('../../../../outputs');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
const checks=[],errors=[],external=[];let failure;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
const button=page.locator('#charts-generate'),data=page.locator('#charts-data'),kind=page.locator('#charts-kind');
async function ready(){await page.waitForFunction(()=>!document.querySelector('#charts-generate')?.disabled);}
async function generate(){await ready();await button.click();await page.locator('#charts-png').waitFor();}
async function check(name,run){await run();checks.push(name);}
function decodePng(bytes){
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),depth=bytes[24],type=bytes[25];assert.equal(depth,8);assert.ok([2,6].includes(type));const channels=type===6?4:3,parts=[];let position=8;
 while(position<bytes.length){const size=bytes.readUInt32BE(position),name=bytes.toString('ascii',position+4,position+8);if(name==='IDAT')parts.push(bytes.subarray(position+8,position+8+size));position+=size+12;}
 const raw=inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(stride*height);assert.equal(raw.length,height*(stride+1));
 function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0,v=raw[y*(stride+1)+1+x];assert.ok(filter<=4);pixels[y*stride+x]=(v+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 let nonwhite=0,teal=0,orange=0;for(let i=0;i<pixels.length;i+=channels){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(r<245||g<245||b<245)nonwhite++;if(r===40&&g===118&&b===93)teal++;if(r===217&&g===140&&b===70)orange++;if(channels===4)assert.equal(pixels[i+3],255);}
 return {width,height,nonwhite,teal,orange,hash:createHash('sha256').update(pixels).digest('hex')};
}
async function download(name){const pending=page.waitForEvent('download');await page.locator('#charts-png').click();const d=await pending,file=path.join(output,name);await d.saveAs(file);const decoded=decodePng(fs.readFileSync(file));return decoded;}
const images={};
if (process.argv.includes('--labels')) {
 try {
  await page.goto(base+'/tools/charts');await ready();
  await check('maximum title and 12 long labels wrap in square PNG; 390/desktop no overflow and no retained chart',async()=>{
   await page.locator('#charts-title').fill('生活与门店合成数据'.repeat(4)+'变化对比');
   await data.fill(Array.from({length:12},(_,i)=>`${i}标签`+'字'.repeat(8)+','+(i+1)*9).join('\n'));await page.locator('#charts-size').selectOption('square');await generate();images.labels=await download('daily-charts-labels-boundary.png');assert.equal(images.labels.width,960);assert.equal(images.labels.height,960);assert.ok(images.labels.nonwhite>40000);assert.equal(await page.evaluate(()=>Object.keys(window.Chart.instances).length),0);
   for(const width of [390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'daily-charts-mobile-labels-final.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  });
 }catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'daily-charts-labels-final-report.json'),JSON.stringify({checks,images,errors,external,failure:failure||null},null,2));}
 console.log(JSON.stringify({checks,images,errors,external,failure:failure||null},null,2));process.exit(failure?1:0);
}
try{
 await page.goto(base+'/tools/charts');await ready();
 await check('actual bar PNG independently decoded: dimensions, opaque background, original palette and visible content',async()=>{await generate();images.bar=await download('daily-charts-bar.png');assert.equal(images.bar.width,1200);assert.equal(images.bar.height,800);assert.ok(images.bar.nonwhite>40000);assert.ok(images.bar.teal>10000);assert.ok(images.bar.orange>10000);assert.equal(await page.locator('tbody tr').count(),7);assert.equal(await page.evaluate(()=>Object.keys(window.Chart.instances).length),0);await page.screenshot({path:path.join(output,'daily-charts-desktop.png'),fullPage:true});});
 await check('line is a genuinely different sparse shape; changed input changes PNG pixels',async()=>{await kind.selectOption('line');assert.equal(await page.locator('#charts-output').count(),0);await generate();images.line=await download('daily-charts-line.png');assert.ok(images.line.teal>1500);assert.ok(images.line.teal<images.bar.teal);assert.equal(images.line.orange,0);assert.notEqual(images.line.hash,images.bar.hash);await data.fill('早晨,90\n中午,5\n晚间,80');await generate();images.changed=await download('daily-charts-line-changed.png');assert.notEqual(images.changed.hash,images.line.hash);assert.equal(await page.locator('tbody tr').count(),3);});
 await check('square doughnut independently decoded with multiple slice colors and actual hole',async()=>{await kind.selectOption('doughnut');await page.locator('#charts-size').selectOption('square');await data.fill('散步,50\n读书,30\n手工,20');await generate();images.doughnut=await download('daily-charts-doughnut.png');assert.equal(images.doughnut.width,960);assert.equal(images.doughnut.height,960);assert.ok(images.doughnut.orange>20000);assert.ok(images.doughnut.teal>30000);assert.notEqual(images.doughnut.hash,images.changed.hash);});
 await check('invalid/oversized numeric formats, labels and row counts clear old exports',async()=>{
  const bad=['甲,NaN\n乙,2','甲,Infinity\n乙,2','甲,1e3\n乙,2','甲,=1+1\n乙,2','甲,1,000\n乙,2','甲,1000000001\n乙,2','甲,0.1234567\n乙,2','甲,1\n\n乙,2','甲,1','甲,1\n甲,2','长'.repeat(13)+',1\n乙,2',Array.from({length:13},(_,i)=>`标签${i},1`).join('\n'),'甲,-1\n乙,2','甲,0\n乙,0'];
  for(const value of bad){await data.fill(value);assert.equal(await page.locator('#charts-png').count(),0);await ready();await button.click();await page.waitForFunction(()=>!document.querySelector('#charts-generate').disabled);assert.equal(await page.locator('#charts-output').count(),0);assert.ok(!(await page.getByRole('status').innerText()).includes('图已生成'));}
  await page.locator('#charts-title').fill('长'.repeat(41));await data.fill('甲,2\n乙,3');await button.click();assert.equal(await page.locator('#charts-output').count(),0);
 });
 await check('negative bar, decimals, Chinese comma/Tab, 12 rows and maximum label length render',async()=>{await page.locator('#charts-title').fill('边界合成数据');await kind.selectOption('bar');await data.fill(Array.from({length:12},(_,i)=>`${i}标签`+'字'.repeat(8)+(i%2?'，':'\t')+(i%2?'-10.123456':'1000000000')).join('\n'));await generate();assert.equal(await page.locator('tbody tr').count(),12);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'daily-charts-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
 await check('editing during delayed PNG encoding destroys chart/canvas and discards old callback',async()=>{
  await page.evaluate(()=>{window.__chartOriginalBlob=HTMLCanvasElement.prototype.toBlob;window.__chartCanvases=[];HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.__chartCanvases.push(this);window.__chartOriginalBlob.call(this,blob=>setTimeout(()=>callback(blob),600),...args);};});
  await button.click();await data.fill('甲,3\n乙,8');await page.waitForTimeout(900);assert.equal(await page.locator('#charts-output').count(),0);assert.ok(await button.isEnabled());assert.equal(await page.evaluate(()=>Object.keys(window.Chart.instances).length),0);assert.ok(await page.evaluate(()=>window.__chartCanvases.every(canvas=>canvas.width===0&&canvas.height===0)));await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__chartOriginalBlob;});await generate();
 });
 await check('PNG encoder null/timeout releases busy, missing dependency retries, and late script bounded',async()=>{
  await page.evaluate(()=>{window.__chartOriginalBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});await button.click();await page.getByRole('status').filter({hasText:'PNG生成失败'}).waitFor();assert.equal(await page.locator('#charts-output').count(),0);assert.equal(await page.evaluate(()=>Object.keys(window.Chart.instances).length),0);
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(){};});await button.click();await page.getByRole('status').filter({hasText:'PNG生成超时'}).waitFor({timeout:12000});assert.ok(await button.isEnabled());assert.equal(await page.evaluate(()=>Object.keys(window.Chart.instances).length),0);await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__chartOriginalBlob;});
  await page.route('**/vendor/chartjs/chart.umd.js',route=>route.abort());await page.reload();await page.locator('#charts-retry').waitFor();assert.ok(await button.isDisabled());await page.unroute('**/vendor/chartjs/chart.umd.js');await page.locator('#charts-retry').click();await generate();
  await page.route('**/vendor/chartjs/chart.umd.js',()=>{});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'加载超时'}).waitFor({timeout:12000});assert.ok(await button.isDisabled());await page.unroute('**/vendor/chartjs/chart.umd.js');await page.locator('#charts-retry').click();await generate();
 });
 await check('unmount cancels pending encoder and destroys chart, no external requests or JS errors',async()=>{await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(callback){setTimeout(()=>callback(null),600);};});await button.click();await page.goto(base+'/tools/wheel');await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.Chart?Object.keys(window.Chart.instances).length:0),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'daily-charts-browser-report.json'),JSON.stringify({base,checks,images,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,images,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
