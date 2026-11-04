import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const base = process.env.DAILY_TOOL_BASE || "http://127.0.0.1:3200";
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const output = path.resolve("../../../../outputs"); fs.mkdirSync(output,{recursive:true});
const browser = await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
const page = await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[], externalRequests=[], checks=[]; let completed=false, failure=null;
page.on("pageerror", error=>errors.push(error.message));
page.on("request", request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==new URL(base).origin)externalRequests.push(request.url());});
const input=()=>page.locator("#mindmap-input"), stage=()=>page.locator("[data-mindmap-stage]"), status=()=>page.getByRole("status");
async function check(name,run){await run();checks.push(name);}
async function generate(){await page.getByRole("button",{name:"生成思维导图",exact:true}).click();}
async function waitOutput(){await page.locator("#mindmap-svg").waitFor();}
async function download(filename){const pending=page.waitForEvent("download");await page.locator("#mindmap-svg").click();const value=await pending;const file=path.join(output,filename);await value.saveAs(file);return file;}
function xmlReport(file){return JSON.parse(execFileSync(path.resolve("../backend/.venv/Scripts/python.exe"),["-c",`import json,sys,xml.etree.ElementTree as E
r=E.parse(sys.argv[1]).getroot()
tags=[n.tag.split('}')[-1] for n in r.iter()]
assert set(tags)<=set(['svg','title','rect','path','g','text','line']), tags
for n in r.iter():
 for k,v in n.attrib.items():
  assert not k.lower().startswith('on') and 'href' not in k.lower() and 'url(' not in v.lower(), (k,v)
assert float(r.attrib['width'])>0 and float(r.attrib['height'])>0
print(json.dumps({'texts':[n.text or '' for n in r.iter() if n.tag.endswith('}text')],'paths':tags.count('path'),'width':r.attrib['width'],'height':r.attrib['height']},ensure_ascii=True))`,file],{encoding:"utf8"}));}
try{
 await page.goto(`${base}/tools/mindmap/`);
 await page.waitForFunction(()=>!document.querySelector('button').disabled);
 const initial=await input().inputValue();
 await check("empty state has no export and example produces real interactive layout",async()=>{assert.equal(await page.locator("#mindmap-svg").count(),0);await generate();await waitOutput();assert.equal(await stage().locator("g.markmap-node").count(),9);assert.equal(await stage().locator("path.markmap-link").count(),8);});
 await check("downloaded SVG independently parses with all Chinese labels and paths, no HTML containers",async()=>{const data=xmlReport(await download("思维导图_生活计划.svg"));assert.equal(data.texts.length,9);assert.ok(data.texts.includes("本周生活计划"));assert.ok(data.texts.includes("准备门店海报"));assert.equal(data.paths,8);});
 await check("collapse and zoom are interactive while download remains complete",async()=>{await stage().locator("g.markmap-node circle").first().click();await page.waitForFunction(()=>document.querySelectorAll('[data-mindmap-stage] g.markmap-node').length<9);assert.equal(await stage().locator("g.markmap-fold").count(),1);await page.getByRole("button",{name:"放大",exact:true}).click();await page.getByRole("button",{name:"缩小",exact:true}).click();await page.getByRole("button",{name:"适应画面",exact:true}).click();assert.equal(xmlReport(await download("思维导图_折叠后仍完整.svg")).texts.length,9);});
 await check("editing removes old drawing and export before regeneration",async()=>{await input().fill("# 新计划\n## 散步");assert.equal(await page.locator("#mindmap-svg").count(),0);assert.equal(await stage().locator("svg").count(),0);await generate();await waitOutput();assert.deepEqual(xmlReport(await download("思维导图_两节点.svg")).texts.sort(),["新计划","散步"].sort());});
 await check("empty malformed skipped depth duplicate root and excessive depth reject clearly",async()=>{for(const [text,message]of[["",/先写/],["没有层级",/需要用/],["## 次级起点",/第一行/],["# 总主题\n### 跳级",/跳过/],["# 一\n# 二",/只能有一个/],["# 总主题\n####### 七层",/1到6/]]){await input().fill(text);await generate();assert.match(await status().innerText(),message);assert.equal(await page.locator("#mindmap-svg").count(),0);}});
 await check("length node count label and control-character limits precede layout",async()=>{for(const [text,message]of[["# "+"字".repeat(6001),/6000/],["# 总主题\n"+Array.from({length:80},(_,i)=>`## 分支${i}`).join("\n"),/80个/],["# "+"字".repeat(101),/100字/],["# 含有\u0001字符",/控制字符/]]){await input().fill(text);await generate();assert.match(await status().innerText(),message);assert.equal(await stage().locator("svg").count(),0);}});
 await check("HTML JS SVG events markdown links and remote images remain inert literal text",async()=>{const labels=["<img src=x onerror=window.__pwn=1>","[点击](javascript:window.__pwn=2)","![远图](https://example.invalid/p.png)","<svg onload=window.__pwn=3>"];await input().fill("# "+labels[0]+"\n"+labels.slice(1).map(x=>"## "+x).join("\n"));await generate();await waitOutput();assert.equal(await stage().locator("img,a,script,iframe").count(),0);assert.equal(await page.evaluate(()=>window.__pwn),undefined);assert.deepEqual(xmlReport(await download("思维导图_恶意文本安全.svg")).texts.sort(),[...labels].sort());});
 await check("80-node maximum and six real hierarchy levels render and export",async()=>{await input().fill("# 八十个主题\n"+Array.from({length:79},(_,i)=>`## 分支${i+1}`).join("\n"));await generate();await waitOutput();assert.equal(xmlReport(await download("思维导图_八十节点.svg")).texts.length,80);await input().fill([1,2,3,4,5,6].map(n=>"#".repeat(n)+" 第"+n+"层").join("\n"));await generate();await waitOutput();assert.equal(xmlReport(await download("思维导图_六层.svg")).texts.length,6);});
 await check("delayed old render cannot recreate export after the input changes",async()=>{await page.evaluate(()=>{const proto=window.markmap.Markmap.prototype;window.__setData=proto.setData;proto.setData=async function(...args){await window.__setData.apply(this,args);await new Promise(resolve=>setTimeout(resolve,350));};});await input().fill(initial);await generate();await input().fill("# 已更换的主题");await page.waitForTimeout(600);assert.equal(await page.locator("#mindmap-svg").count(),0);assert.equal(await stage().locator("svg").count(),0);await page.evaluate(()=>{window.markmap.Markmap.prototype.setData=window.__setData;});});
 await input().fill(initial);await generate();await waitOutput();
 await check("desktop and 390 viewport fit without horizontal overflow and view remains movable",async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,"思维导图_桌面.png"),fullPage:true});await page.setViewportSize({width:390,height:1000});await page.getByRole("button",{name:"适应画面",exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const svg=stage().locator("svg");await svg.scrollIntoViewIfNeeded();const before=await svg.locator(":scope > g").first().getAttribute("transform"),box=await svg.boundingBox();await page.mouse.move(box.x+100,box.y+100);await page.mouse.down();await page.mouse.move(box.x+140,box.y+130,{steps:5});await page.mouse.up();assert.notEqual(await svg.locator(":scope > g").first().getAttribute("transform"),before);await page.screenshot({path:path.join(output,"思维导图_手机.png"),fullPage:true});});
 await check("return navigation is non-404 and unmount during delayed rendering has no uncaught error",async()=>{await page.evaluate(()=>{const proto=window.markmap.Markmap.prototype;window.__unmountSetData=proto.setData;proto.setData=async function(...args){await window.__unmountSetData.apply(this,args);await new Promise(resolve=>setTimeout(resolve,350));};});await input().fill(initial);await generate();await page.getByRole("link",{name:"← 日常工具",exact:true}).click();await page.waitForURL("**/discover");assert.equal((await page.request.get(`${base}/discover`)).status(),200);await page.waitForTimeout(500);});
 assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);completed=true;
}catch(error){failure=error.message;throw error;}
finally{const result={time:new Date().toISOString(),base,completed,failure,checks,pageErrors:errors,externalRequests,limits:"Headless Edge and CSS 390 viewport only; no real touch devices or all SVG consuming editors tested"};fs.writeFileSync(path.join(output,"生活小助手_思维导图验收.json"),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();}
