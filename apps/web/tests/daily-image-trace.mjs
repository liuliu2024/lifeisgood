import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('../../../../outputs/image-trace-evidence'),fixtures=path.resolve('../../../../outputs/image-trace-fixtures');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),page=await browser.newPage({viewport:{width:1280,height:1000}}),checks=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&!['127.0.0.1','localhost'].includes(new URL(r.url()).hostname))external.push(r.url());});
async function run(name,colors='4'){await page.locator('#trace-file').setInputFiles(path.join(fixtures,name));await page.locator('#trace-colors').selectOption(colors);await page.locator('#trace-run').click();await page.locator('#trace-svg').waitFor({timeout:15000});}
async function save(name){
  for(const ext of ['svg','json']){const event=page.waitForEvent('download');await page.locator('#trace-'+ext).click();await(await event).saveAs(path.join(out,name+'.'+ext));}
  const data=JSON.parse(await fs.readFile(path.join(out,name+'.json'),'utf8'));assert.equal(data.approximate,true);assert.ok(data.output.paths>0);assert.ok(data.output.width<=256);assert.ok(data.output.height<=256);
  const svg=await fs.readFile(path.join(out,name+'.svg'),'utf8');assert.ok(svg.includes('<path '));assert.equal(/<image|data:|href=|onload=|foreignObject|<script/.test(svg),false);
  const png=await page.evaluate(async()=>{const a=document.querySelector('#trace-svg'),image=new Image();image.src=a.href;await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);return c.toDataURL('image/png').split(',')[1];});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(png,'base64'));return data;
}
try{
 await page.goto('http://127.0.0.1:3200/tools/image-trace');await run('geometry.png','2');await save('geometry');checks.push('Actual two-color geometric path SVG and JSON downloads, rendered raster saved');
 await run('transparent.png','4');await save('transparent');checks.push('Actual transparent small image path SVG and JSON');
 await run('large.jpg','8');const large=await save('large');assert.equal(large.output.width,256);assert.equal(large.source.width,1000);checks.push('Real one-million-pixel JPEG pre-scaled256 with eight-color tracing');

 for(const name of ['single.png','bad-dim.png','over.png','fake.png','truncated.png','broken.jpg']){await page.locator('#trace-file').setInputFiles(path.join(fixtures,name));await page.locator('#trace-run').click();await page.waitForFunction(()=>!document.querySelector('#trace-cancel'));assert.equal(await page.locator('#trace-svg').count(),0);assert.equal(await page.locator('#trace-json').count(),0);}checks.push('Six tiny/malformed/size/dimension inputs reject and remove prior exports');
 await page.setViewportSize({width:390,height:844});await run('geometry.png','2');await page.locator('#trace-preview').evaluate(im=>im.decode());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});checks.push('390px layout shows preview and both downloads without page overflow');
 await page.locator('#trace-colors').selectOption('5');assert.equal(await page.locator('#trace-svg').count(),0);checks.push('Editing parameters invalidates prior result');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({checks,pageErrors:errors,externalRequests:external},null,2));await browser.close();}console.log({passed:checks.length,checks,pageErrors:errors,externalRequests:external});
