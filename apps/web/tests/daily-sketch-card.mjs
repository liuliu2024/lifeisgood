import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output=path.resolve('../../../../outputs');fs.mkdirSync(output,{recursive:true});
const python=path.resolve('../backend/.venv/Scripts/python.exe');
const validator=String.raw`
import sys,json,hashlib,re
from pathlib import Path
from PIL import Image
import xml.etree.ElementTree as ET
p=Path(sys.argv[1])
if p.suffix=='.svg':
 root=ET.parse(p).getroot(); ns='{http://www.w3.org/2000/svg}'
 allowed={'svg':{'width','height','viewBox'},'rect':{'x','y','width','height','fill'},'g':set(),'path':{'d','stroke','stroke-width','fill','fill-rule'},'text':{'x','y','fill','font-family','font-size','font-weight'},'desc':set()}
 nodes=list(root.iter()); assert len(nodes)<=100; paths=[]; texts=[]
 for node in nodes:
  assert node.tag.startswith(ns); tag=node.tag[len(ns):]; assert tag in allowed; assert set(node.attrib)<=allowed[tag]
  for key,value in node.attrib.items(): assert not re.search(r'url\s*\(|(?:https?|data|javascript):',value,re.I)
  if tag=='path': assert re.fullmatch(r'[MLCZ0-9eE.,+\-\s]+',node.attrib['d']);paths.append(node.attrib['d'])
  if tag=='text': texts.append(node.text)
 w,h=int(root.attrib['width']),int(root.attrib['height']); assert (w,h) in [(1024,768),(768,1024)]; assert len(paths)>=4; assert p.stat().st_size<=200000
 result={'size':[w,h],'nodes':len(nodes),'paths':len(paths),'pathHash':hashlib.sha256(''.join(paths).encode()).hexdigest(),'texts':texts,'fileHash':hashlib.sha256(p.read_bytes()).hexdigest()}
else:
 im=Image.open(p);im.load(); assert im.format=='PNG'; rgba=im.convert('RGBA');w,h=rgba.size;assert (w,h) in [(1024,768),(768,1024)]
 colors=rgba.getcolors(w*h);assert colors; assert all(color[3]==255 for count,color in colors)
 counts={color[:3]:count for count,color in colors};background=rgba.getpixel((0,0))[:3];nonpaper=sum(count for color,count in counts.items() if color!=background)
 assert nonpaper>10000
 result={'size':[w,h],'background':background,'nonpaper':nonpaper,'stroke':counts.get((48,92,72),0),'fill':counts.get((221,161,84),0),'pixelHash':hashlib.sha256(rgba.tobytes()).hexdigest()}
print(json.dumps(result,ensure_ascii=True))
`;
function inspect(file){const run=spawnSync(python,['-c',validator,file],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const checks=[],errors=[],external=[],artifacts={};let failure;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
const field=name=>page.locator('#sketch-'+name),button=field('generate');
async function ready(){await page.waitForFunction(()=>!document.querySelector('#sketch-generate')?.disabled);}
async function generate(){await ready();await button.click();await field('png').waitFor();}
async function download(type,name){const pending=page.waitForEvent('download');await field(type).click();const item=await pending,file=path.join(output,'sketch-card-'+name+'.'+type);await item.saveAs(file);return inspect(file);}
async function check(name,run){await run();checks.push(name);}
async function noOutput(){assert.equal(await field('output').count(),0);assert.equal(await field('png').count(),0);assert.equal(await field('svg').count(),0);}
try{
 await page.goto(base+'/tools/sketch-card');await ready();
 await check('real SVG independently XML-parsed whitelist and PNG independently decoded with actual paper/ink/fill pixels',async()=>{
  await generate();artifacts.svg=await download('svg','default');artifacts.png=await download('png','default');assert.deepEqual(artifacts.png.background,[255,248,232]);assert.ok(artifacts.png.stroke>3000);assert.ok(artifacts.png.fill>1000);assert.equal(artifacts.svg.texts[0],'把日子过成喜欢的样子');await page.screenshot({path:path.join(output,'sketch-card-desktop.png'),fullPage:true});
 });
 await check('same seed and settings reproduce exact SVG and PNG pixels; different seed changes real strokes',async()=>{
  await generate();artifacts.repeatSvg=await download('svg','repeat');artifacts.repeatPng=await download('png','repeat');assert.equal(artifacts.repeatSvg.fileHash,artifacts.svg.fileHash);assert.equal(artifacts.repeatPng.pixelHash,artifacts.png.pixelHash);
  await field('seed').fill('24681');await noOutput();await generate();artifacts.changedSvg=await download('svg','new-seed');artifacts.changedPng=await download('png','new-seed');assert.notEqual(artifacts.changedSvg.pathHash,artifacts.svg.pathHash);assert.notEqual(artifacts.changedPng.pixelHash,artifacts.png.pixelHash);
 });
 await check('all four finite shape choices, six objects, alternate portrait and solid fill produce real safe artifacts',async()=>{
  for(const shape of ['rectangle','triangle','diamond']){await field('shape').selectOption(shape);await field('count').fill('6');await field('size').selectOption('portrait');await field('fill-style').selectOption('solid');await generate();artifacts[shape]=await download('svg',shape);assert.deepEqual(artifacts[shape].size,[768,1024]);assert.ok(artifacts[shape].paths>=15);}
  assert.notEqual(artifacts.rectangle.pathHash,artifacts.triangle.pathHash);assert.notEqual(artifacts.triangle.pathHash,artifacts.diamond.pathHash);artifacts.portrait=await download('png','portrait');assert.deepEqual(artifacts.portrait.size,[768,1024]);
 });
 await check('angle markup, addresses, hidden controls and all text/number bounds reject without stale exports',async()=>{
  for(const [name,value] of [['title',''],['title','字'.repeat(17)],['title','<svg/onload=1>'],['title','甲\u202e乙'],['body','<script>1</script>'],['body','https://example.test'],['body','甲\n\n乙'],['body','甲\n乙\n丙\n丁'],['body','字'.repeat(21)],['count','0'],['count','7'],['count','1.5'],['seed','0'],['seed','1000000000'],['seed','01'],['seed','1e3']]){
   await page.getByRole('button',{name:'恢复示例',exact:true}).click();await field(name).fill(value);await noOutput();await button.click();await ready();await noOutput();assert.ok(!(await page.getByRole('status').innerText()).includes('卡片已生成'));
  }
 });
 await check('literal ampersands and quotes are preserved as text in safe SVG; selected colors reach actual PNG',async()=>{
  await page.getByRole('button',{name:'恢复示例',exact:true}).click();await field('title').fill('安心 & 喜欢 "今天"');await field('body').fill('慢慢来 & 好好生活');await field('fill').fill('#769BD0');await field('paper').fill('#EFF7FF');await field('count').fill('1');await field('seed').fill('999999999');await generate();artifacts.literal=await download('svg','literal-text');assert.ok(artifacts.literal.texts.includes('安心 & 喜欢 "今天"'));artifacts.colors=await download('png','colors');assert.deepEqual(artifacts.colors.background,[239,247,255]);
 });
 await check('delayed encode continuous clicks create one job, editing releases canvas and invalidates old callback',async()=>{
  await page.evaluate(()=>{window.__sketchOriginal=HTMLCanvasElement.prototype.toBlob;window.__sketchCanvases=[];HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.__sketchCanvases.push(this);window.__sketchOriginal.call(this,blob=>setTimeout(()=>callback(blob),600),...args);};});
  await button.evaluate(el=>{el.click();el.click();el.click();});await page.waitForFunction(()=>window.__sketchCanvases.length===1);await field('shape').selectOption('triangle');await page.waitForTimeout(800);await noOutput();assert.ok(await button.isEnabled());assert.ok(await page.evaluate(()=>window.__sketchCanvases.every(c=>c.width===0&&c.height===0)));await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__sketchOriginal;});await generate();
 });
 await check('null and never-returning PNG encoding release busy and allow a clean retry',async()=>{
  await page.evaluate(()=>{window.__sketchOriginal=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){callback(null);};});await button.click();await page.getByRole('status').filter({hasText:'PNG生成失败'}).waitFor();await noOutput();assert.ok(await button.isEnabled());
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(){};});await button.click();await page.getByRole('status').filter({hasText:'图片生成超时'}).waitFor({timeout:12000});await noOutput();assert.ok(await button.isEnabled());await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__sketchOriginal;});await generate();
 });
 await check('390 and desktop no horizontal overflow with longest valid text and six shapes',async()=>{
  await field('title').fill('字'.repeat(16));await field('body').fill(Array(3).fill('字'.repeat(20)).join('\n'));await field('count').fill('6');await field('size').selectOption('portrait');await generate();artifacts.boundary=await download('svg','text-boundary');artifacts.boundaryPng=await download('png','text-boundary');for(const width of [390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'sketch-card-mobile.png'),fullPage:true});
 });
 await check('blocked and stalled local dependency have bounded Chinese failures and recover after retry',async()=>{
  await page.route('**/vendor/rough/rough.js',route=>route.abort());await page.reload();await field('retry').waitFor();assert.ok(await button.isDisabled());await noOutput();await page.unroute('**/vendor/rough/rough.js');await field('retry').click();await generate();
  await page.route('**/vendor/rough/rough.js',()=>{});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'加载超时'}).waitFor({timeout:12000});assert.ok(await button.isDisabled());await noOutput();await page.unroute('**/vendor/rough/rough.js');await field('retry').click();await generate();
 });
 await check('unmount during encoding leaves no stale result or external request or uncaught error',async()=>{await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=function(callback){setTimeout(()=>callback(null),500);};});await button.click();await page.goto(base+'/tools/charts');await page.waitForTimeout(800);assert.equal(await field('output').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'sketch-card-browser-report.json'),JSON.stringify({base,checks,artifacts,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,artifacts,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
