import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
const base=process.env.LIFE_TEST_URL||"http://127.0.0.1:3200";
const out=resolve(process.env.LIFE_TOOL_OUTPUT||".cache/daily-crop-compress");
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
const context=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
const page=await context.newPage();
const errors=[],external=[],checks=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
async function check(name,fn){await fn();checks.push({name,passed:true});}
async function fixture(kind){
 return Buffer.from(await page.evaluate(kind=>{
  const c=document.createElement("canvas");c.width=kind==="noise"?1600:kind==="transparent"?400:1600;c.height=kind==="noise"?1200:kind==="transparent"?300:1200;
  const x=c.getContext("2d");
  if(kind==="noise"){const d=x.createImageData(c.width,c.height);let seed=1234567;for(let i=0;i<d.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;d.data[i]=seed&255;d.data[i+1]=(seed>>>8)&255;d.data[i+2]=(seed>>>16)&255;d.data[i+3]=255;}x.putImageData(d,0,0);}
  else if(kind==="transparent"){x.fillStyle="#2563eb";x.fillRect(200,0,200,300);}
  else{x.fillStyle="#ef4444";x.fillRect(0,0,c.width,c.height);x.fillStyle="#2563eb";x.fillRect(400,300,800,600);}
  return c.toDataURL(kind==="noise"?"image/jpeg":"image/png",.95).split(",")[1];
 },kind),"base64");
}
async function download(selector,name){const promise=page.waitForEvent("download");await page.locator(selector).click();const d=await promise;const file=resolve(out,name);await d.saveAs(file);return file;}
async function decode(file,points=[]){return page.evaluate(async({b64,points})=>{const img=new Image();img.src="data:image/"+(b64.startsWith("/9j/")?"jpeg":"png")+";base64,"+b64;await img.decode();const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext("2d");x.drawImage(img,0,0);return{width:c.width,height:c.height,pixels:points.map(([a,b])=>Array.from(x.getImageData(a,b,1,1).data))};},{b64:readFileSync(file).toString("base64"),points});}
async function choose(id,buffer,name="fixture.png",mime="image/png"){await page.locator(id).setInputFiles({name,mimeType:mime,buffer});}
try{
 await page.goto(base+"/tools/crop",{waitUntil:"networkidle"});
 const png=await fixture("colors"),transparent=await fixture("transparent"),noise=await fixture("noise");
 await check("crop empty state disables export",async()=>{assert.equal(await page.locator("#crop-export").isDisabled(),true);});
 await choose("#crop-file",png);await page.waitForFunction(()=>!document.getElementById("crop-export").disabled);
 await check("square crop actual PNG and center color",async()=>{await page.locator("#crop-export").click();await page.locator("#crop-download").waitFor();const f=await download("#crop-download","crop-square.png");const d=await decode(f,[[510,510]]);assert.equal(d.width,d.height);assert.ok(d.width>900&&d.width<=1200);assert.ok(d.pixels[0][2]>150);});
 await check("ratio change clears old download, 4:3 and rotation export JPEG",async()=>{await page.locator("#crop-ratio").selectOption("1.3333333333333333");assert.equal(await page.locator("#crop-download").count(),0);await page.getByRole("button",{name:"向右旋转"}).click();await page.locator("#crop-format").selectOption("image/jpeg");await page.locator("#crop-export").click();await page.locator("#crop-download").waitFor();const f=await download("#crop-download","crop-rotated.jpg");const d=await decode(f);assert.ok(Math.abs(d.width/d.height-4/3)<.01);assert.equal(readFileSync(f)[0],255);});
 await check("free ratio allows a real crop-box handle drag",async()=>{await page.locator("#crop-ratio").selectOption("NaN");const point=await page.locator(".cropper-point.point-e").boundingBox();assert.ok(point);await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.mouse.move(point.x-65,point.y+point.height/2,{steps:8});await page.mouse.up();await page.locator("#crop-export").click();await page.locator("#crop-download").waitFor();const f=await download("#crop-download","crop-free.jpg");const d=await decode(f);assert.ok(Math.abs(d.width/d.height-4/3)>.05);});
 await check("new file clears old export; transparent PNG remains transparent",async()=>{await page.locator("#crop-format").selectOption("image/png");await choose("#crop-file",transparent);assert.equal(await page.locator("#crop-download").count(),0);await page.waitForFunction(()=>!document.getElementById("crop-export").disabled);await page.locator("#crop-export").click();await page.locator("#crop-download").waitFor();const f=await download("#crop-download","crop-transparent.png");const d=await decode(f,[[0,0]]);assert.equal(d.pixels[0][3],0);});
 await check("crop rejects invalid and oversized dimension headers",async()=>{await choose("#crop-file",Buffer.from("not a picture"));await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("目前支持"));assert.equal(await page.locator("#crop-download").count(),0);const b=Buffer.alloc(24);b.set([137,80,78,71],0);b.set([73,72,68,82],12);b.writeUInt32BE(50000,16);b.writeUInt32BE(50000,20);await choose("#crop-file",b);await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("1600"));});
 await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(out,"crop-mobile390.png"),fullPage:true});checks.push({name:"crop 390px viewport no overflow",passed:true});
 await page.goto(base+"/tools/compress",{waitUntil:"networkidle"});
 await check("compression empty state disables action",async()=>assert.equal(await page.locator("#compress-run").isDisabled(),true));
 await choose("#compress-file",noise,"noise.jpg","image/jpeg");await page.waitForFunction(()=>!document.getElementById("compress-run").disabled);
 await check("JPEG compression reaches size/edge target and actual output decodes",async()=>{await page.locator("#compress-target").selectOption("0.2");await page.locator("#compress-edge").selectOption("800");await page.locator("#compress-run").click();await page.locator("#compress-download").waitFor();const f=await download("#compress-download","compressed-noise.jpg");const d=await decode(f);assert.ok(d.width<=800&&d.height<=800);assert.ok(readFileSync(f).length<noise.length);assert.ok(readFileSync(f).length<=.2*1024*1024);});
 await check("PNG transparency retained; JPEG conversion explicitly fills white",async()=>{await choose("#compress-file",transparent);await page.waitForFunction(()=>!document.getElementById("compress-run").disabled);await page.locator("#compress-run").click();await page.locator("#compress-download").waitFor();let f=await download("#compress-download","compressed-transparent.png");let d=await decode(f,[[0,0],[300,100]]);assert.equal(d.pixels[0][3],0);assert.ok(d.pixels[1][2]>150);await page.locator("#compress-format").selectOption("jpeg");assert.equal(await page.locator("#compress-download").count(),0);assert.ok((await page.getByText("JPG不支持透明背景").count())>0);await page.locator("#compress-run").click();await page.locator("#compress-download").waitFor();f=await download("#compress-download","converted-white.jpg");d=await decode(f,[[0,0]]);assert.ok(d.pixels[0].slice(0,3).every(n=>n>245));});
 await check("invalid file clears old output and recovers controls",async()=>{await choose("#compress-file",Buffer.from("bad"));await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("目前支持"));assert.equal(await page.locator("#compress-download").count(),0);assert.equal(await page.locator("#compress-file").isDisabled(),false);});
 await check("empty and >10 MiB files are refused",async()=>{await choose("#compress-file",Buffer.alloc(0));await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("为空"));await choose("#compress-file",Buffer.alloc(10*1024*1024+1));await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("超过 10"));});
 await choose("#compress-file",transparent);await page.waitForFunction(()=>!document.getElementById("compress-run").disabled);
 await check("stale asynchronous compression cannot restore old result",async()=>{
  await page.evaluate(()=>{const original=window.imageCompression;window.imageCompression=async(...args)=>{const blob=await original(...args);await new Promise(r=>window.__releaseCompression=r);return blob;};});
  await page.locator("#compress-run").click();await page.waitForFunction(()=>typeof window.__releaseCompression==="function");
  await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File(["broken"],"bad.png",{type:"image/png"}));const i=document.getElementById("compress-file");i.files=dt.files;i.dispatchEvent(new Event("change",{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector("[role=status]").textContent.includes("目前支持"));await page.evaluate(()=>window.__releaseCompression());await page.waitForTimeout(150);assert.equal(await page.locator("#compress-download").count(),0);assert.equal(await page.locator("#compress-file").isDisabled(),false);
 });
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(out,"compress-mobile390.png"),fullPage:true});checks.push({name:"compression 390px viewport no overflow",passed:true});
 await page.goto(base+"/tools/crop",{waitUntil:"networkidle"});await choose("#crop-file",png);await page.waitForFunction(()=>!document.getElementById("crop-export").disabled);await page.locator("#crop-export").click();await page.locator("#crop-download").waitFor();await page.screenshot({path:resolve(out,"crop-success-mobile390.png"),fullPage:true});
 await page.goto(base+"/tools/compress",{waitUntil:"networkidle"});await choose("#compress-file",noise,"noise.jpg","image/jpeg");await page.waitForFunction(()=>!document.getElementById("compress-run").disabled);await page.locator("#compress-target").selectOption("0.2");await page.locator("#compress-edge").selectOption("800");await page.locator("#compress-run").click();await page.locator("#compress-download").waitFor();await page.screenshot({path:resolve(out,"compress-success-mobile390.png"),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);writeFileSync(resolve(out,"results.json"),JSON.stringify({time:new Date().toISOString(),checks,pageErrors:errors,externalRequests:external,limitation:"Headless Edge CSS viewport; not physical mobile, all codecs, or a full security audit"},null,2));console.log(JSON.stringify({passed:checks.length,failed:0,pageErrors:errors,externalRequests:external,out}));
}catch(e){writeFileSync(resolve(out,"failed.json"),JSON.stringify({time:new Date().toISOString(),checks,error:String(e.stack||e),pageErrors:errors,externalRequests:external},null,2));throw e;}finally{await browser.close();}
