import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.resolve(root,'../../../../outputs/calculator-evidence');fs.mkdirSync(out,{recursive:true});
const python=path.resolve(root,'../backend/.venv/Scripts/python.exe'),base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),results=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base+'/'))external.push(r.url());});
const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});throw e;}};
const run=async()=>{await page.locator('#calculator-generate').click();await page.locator('#calculator-output').waitFor();};
const download=async(id,name)=>{const p=page.waitForEvent('download');await page.locator(id).click();await(await p).saveAs(path.join(out,name));return fs.readFileSync(path.join(out,name),'utf8');};
const set=async(a,b,mode='arithmetic',operator='add',places='2',rounding='half-up')=>{await page.locator('#calculator-mode').selectOption(mode);await page.locator('#calculator-a').fill(a);await page.locator('#calculator-b').fill(b);if(mode==='arithmetic')await page.locator('#calculator-operator').selectOption(operator);if(mode!=='split'){await page.locator('#calculator-places').selectOption(places);await page.locator('#calculator-rounding').selectOption(rounding);}};
const independent=`import sys,json,decimal
from decimal import Decimal as D,localcontext,ROUND_HALF_UP,ROUND_HALF_EVEN,ROUND_FLOOR
j=json.load(open(sys.argv[1],encoding='utf-8'));i=j['input'];rows={r['label']:r['value'] for r in j['lines']}
with localcontext() as c:
 c.prec=80;c.rounding=ROUND_HALF_UP;a=D(i['a']);b=D(i['b'])
 if i['mode']=='split':
  total=a*100;lo=(total/b).to_integral_value(rounding=ROUND_FLOOR);rem=total%b;n=int(b);x=int(rem)
  assert int(rows['前一组人数'])==x and int(rows['后一组人数'])==n-x
  assert D(rows['前一组每人'])==(lo+1)/100 and D(rows['后一组每人'])==lo/100
  assert D(rows['前一组每人'])*x+D(rows['后一组每人'])*(n-x)==a
  assert D(rows['余分数'])==rem
 else:
  if i['mode']=='arithmetic':raw={'add':lambda:a+b,'subtract':lambda:a-b,'multiply':lambda:a*b,'divide':lambda:a/b}[i['operator']]()
  elif i['mode']=='discount':raw=a*b/10
  else:raw=a/b
  assert D(rows['计算值（最多80位有效数字）'])==raw
  q=D(1).scaleb(-int(i['places']));r=ROUND_HALF_UP if i['rounding']=='half-up' else ROUND_HALF_EVEN
  shown=format(raw.quantize(q,rounding=r),'f');shown=shown[1:] if shown.startswith('-') and D(shown)==0 else shown
  assert rows['显示结果']==shown,(rows['显示结果'],shown)
  if i['mode']=='discount':assert D(rows['节省金额（同规则舍入）'])==(a-raw).quantize(q,rounding=r)
print(json.dumps({'independent':'Python Decimal80','mode':i['mode'],'matched':True}))`;
async function sample(name,a,b,mode='arithmetic',op='add',places='2',rounding='half-up'){await set(a,b,mode,op,places,rounding);await run();const j=JSON.parse(await download('#calculator-json',name+'.json')),txt=await download('#calculator-txt',name+'.txt');for(const r of j.lines)assert.ok(txt.includes(r.value));const result=JSON.parse(execFileSync(python,['-c',independent,path.join(out,name+'.json')],{encoding:'utf8'}));assert.equal(result.matched,true);fs.writeFileSync(path.join(out,name+'.independent.json'),JSON.stringify(result,null,2));return Object.fromEntries(j.lines.map(r=>[r.label,r.value]));}
async function invalid(a,b,mode='arithmetic',op='add'){await set(a,b,mode,op);assert.equal(await page.locator('#calculator-output,#calculator-json,#calculator-txt').count(),0);await page.locator('#calculator-generate').click();assert.equal(await page.locator('#calculator-output').count(),0);assert.ok(!(await page.getByRole('status').innerText()).includes('已计算'));}
if(process.argv.includes('--url-failure')){
 try{
  await page.goto(base+'/tools/calculator',{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#calculator-generate').disabled);
  await page.evaluate(()=>{window.urlCreate=URL.createObjectURL;window.urlRevoke=URL.revokeObjectURL;window.created=[];window.revoked=[];let calls=0;URL.createObjectURL=function(blob){if(++calls===2)throw new Error('合成下载地址失败');const u=window.urlCreate.call(URL,blob);window.created.push(u);return u;};URL.revokeObjectURL=function(u){window.revoked.push(u);window.urlRevoke.call(URL,u);};});
  await page.locator('#calculator-generate').click();assert.match(await page.getByRole('status').innerText(),/下载地址失败/);assert.equal(await page.locator('#calculator-output,#calculator-json,#calculator-txt').count(),0);
  const lifecycle=await page.evaluate(()=>({created:window.created,revoked:window.revoked}));assert.equal(lifecycle.created.length,1);assert.deepEqual(lifecycle.revoked,lifecycle.created);
  await page.evaluate(()=>{URL.createObjectURL=window.urlCreate;URL.revokeObjectURL=window.urlRevoke;});await sample('url-failure-recovered','0.1','0.2');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(path.join(out,'url-failure-result.json'),JSON.stringify({passed:true,lifecycle,errors,external},null,2));
 }finally{await browser.close();}
 console.log('URL second-create failure cleanup and recovery: passed');process.exit(0);
}
try{
 await check('HTTP200 and empty state;0.1+0.2 independently equals0.3',async()=>{assert.equal((await page.goto(base+'/tools/calculator',{waitUntil:'networkidle'})).status(),200);assert.equal(await page.locator('#calculator-output').count(),0);await page.waitForFunction(()=>!document.querySelector('#calculator-generate').disabled);const r=await sample('sum','0.1','0.2');assert.equal(r['显示结果'],'0.30');assert.equal(r['计算值（最多80位有效数字）'],'0.3');});
 await check('Four operations include negative values and non-terminating division matched Python',async()=>{await sample('subtract','1.01','2.02','arithmetic','subtract','12');await sample('multiply','12.345678901234','-9.876543210987','arithmetic','multiply','12');const r=await sample('third','1','3','arithmetic','divide','12');assert.equal(r['显示结果'],'0.333333333333');await sample('negative-zero','-0.0001','1','arithmetic','multiply','2');});
 await check('Half-up versus half-even and negative halfway are explicit and independently matched',async()=>{let r=await sample('half-up','2.345','0','arithmetic','add','2');assert.equal(r['显示结果'],'2.35');r=await sample('half-even','2.345','0','arithmetic','add','2','half-even');assert.equal(r['显示结果'],'2.34');r=await sample('negative-half','-1.005','0','arithmetic','add','2');assert.equal(r['显示结果'],'-1.01');await sample('zero-places','2.5','0','arithmetic','add','0','half-even');});
 await check('24integer+12fraction boundary multiply and tiny denominator stay bounded and match',async()=>{await sample('maximum','999999999999999999999999.999999999999','999999999999999999999999.999999999999','arithmetic','multiply','12');await sample('tiny-denominator','999999999999999999999999','0.000000000001','arithmetic','divide','12');await sample('tiny-result','0.000000000001','999999999999999999999999','arithmetic','divide','12');});
 await check('Discount0/8.5/10 and per-unit price matched independent Decimal',async()=>{await sample('discount','199.99','8.5','discount');await sample('free','199.99','0','discount');await sample('no-discount','199.99','10','discount');await sample('unit','19.99','3','unit','add','6');});
 await check('Split cents conserves exact total with zero/min/max group sizes',async()=>{let r=await sample('split','10.00','3','split');assert.equal(r['前一组人数'],'1');assert.equal(r['前一组每人'],'3.34');await sample('split-zero','0','100','split');await sample('split-small','0.01','100','split');await sample('split-one','999999999999999999999999.99','1','split');await sample('split-maximum','999999999999999999999999.99','100','split');});
 await check('Malformed numbers, overlimits and zero divisor reject without old downloads',async()=>{for(const a of ['', ' ', '1e3','0x10','1_000','1,000','1+2','NaN','Infinity','<script>','9'.repeat(25),'1.1234567890123','.5','1.'])await invalid(a,'2');await invalid('1','0','arithmetic','divide');await invalid('1','-0','arithmetic','divide');});
 await check('Discount/unit/split validation and subcent amount refusal',async()=>{for(const [a,b,m]of [['-1','2','discount'],['1','10.1','discount'],['1','-0.1','discount'],['1','0','unit'],['1','-1','unit'],['-1','3','unit'],['1.001','3','split'],['1','0','split'],['1','101','split'],['1','2.5','split'],['1','03','split'],['-1','3','split']])await invalid(a,b,m);});
 await check('Every edit/mode/rounding change immediately clears previous result and exports',async()=>{await sample('before-edit','3','2');await page.locator('#calculator-a').fill('4');assert.equal(await page.locator('#calculator-output,#calculator-json,#calculator-txt').count(),0);await run();await page.locator('#calculator-rounding').selectOption('half-even');assert.equal(await page.locator('#calculator-output').count(),0);await run();await page.locator('#calculator-mode').selectOption('discount');assert.equal(await page.locator('#calculator-output').count(),0);});
 await check('Tampered fractional places rejected, then valid settings recover',async()=>{await page.locator('#calculator-places').evaluate(s=>s.add(new Option('bad','1.5')));await page.locator('#calculator-places').selectOption('1.5');await page.locator('#calculator-generate').click();assert.match(await page.getByRole('status').innerText(),/请选择支持/);assert.equal(await page.locator('#calculator-output').count(),0);await sample('recovered','0.1','0.2');});
 await check('Desktop/390 no horizontal overflow; actual mobile TXT/JSON download',async()=>{await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:1000});await sample('mobile','10.00','3','split');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#calculator-json').isVisible(),true);await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});});
 await check('Dependency blocked/stalled8sec fail in Chinese and retry recovers',async()=>{await page.route('**/vendor/decimal/decimal.js',r=>r.abort());await page.goto(base+'/tools/calculator',{waitUntil:'networkidle'});assert.match(await page.getByRole('status').innerText(),/加载失败或超时/);assert.equal(await page.locator('#calculator-generate').isDisabled(),true);await page.unroute('**/vendor/decimal/decimal.js');await page.locator('#calculator-retry').click();await page.waitForFunction(()=>!document.querySelector('#calculator-generate').disabled);await sample('retry','12.3','4.5');await page.route('**/vendor/decimal/decimal.js',async r=>{await new Promise(s=>setTimeout(s,8500));try{await r.abort();}catch{}});await page.goto(base+'/tools/calculator',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#calculator-retry'),{timeout:10000});await page.unroute('**/vendor/decimal/decimal.js');await page.locator('#calculator-retry').click();await page.waitForFunction(()=>!document.querySelector('#calculator-generate').disabled);});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),base,browser:browser.version(),results,errors,external},null,2));await browser.close();}
console.log(JSON.stringify({groups:results.length,passed:results.filter(x=>x.pass).length,out}));
