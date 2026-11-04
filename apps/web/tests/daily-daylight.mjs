import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const output=path.resolve('../../../../outputs');fs.mkdirSync(output,{recursive:true});
// Independent fixtures retrieved from USNO on 2026-11-04. These literal UTC values are
// NOT computed with SunCalc. Original public GeoJSON is retained in source-review evidence.
const references={
 greenwich:{url:'https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=51.4779,0&tz=0',date:'2026-06-21',latitude:'51.4779',longitude:'0',state:'crossings',events:{dawn:'02:55',sunrise:'03:43',solarNoon:'12:02',sunset:'20:21',dusk:'21:09'}},
 summer:{url:'https://aa.usno.navy.mil/api/rstt/oneday?date=2026-06-21&coords=69.6492,18.9553&tz=0',date:'2026-06-21',latitude:'69.6492',longitude:'18.9553',state:'continuous-daylight',events:{solarNoon:'10:46'},noRiseSet:true},
 winter:{url:'https://aa.usno.navy.mil/api/rstt/oneday?date=2026-12-21&coords=69.6492,18.9553&tz=0',date:'2026-12-21',latitude:'69.6492',longitude:'18.9553',state:'continuous-night',events:{dawn:'08:31',dusk:'12:53'},noRiseSet:true}
};
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1280,height:1000},timezoneId:'America/Los_Angeles'}),page=await context.newPage();
const checks=[],errors=[],external=[],samples={},deltas=[];let failure;
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{throw Error('Unexpected geolocation request');};navigator.geolocation.watchPosition=()=>{throw Error('Unexpected geolocation watch');};});
const field=name=>page.locator('#daylight-'+name),button=field('generate');
async function ready(){await page.waitForFunction(()=>!document.querySelector('#daylight-generate')?.disabled);}
async function fill(input){for(const [key,value] of Object.entries(input))await field(key).fill(value);}
async function generate(){await ready();await button.click();await field('json').waitFor();}
async function download(type,name){const pending=page.waitForEvent('download');await field(type).click();const item=await pending,file=path.join(output,'daylight-'+name+'.'+type);await item.saveAs(file);return fs.readFileSync(file,'utf8');}
async function result(){return page.locator('#daylight-json').evaluate(async link=>JSON.parse(await(await fetch(link.href)).text()));}
async function check(name,run){await run();checks.push(name);}
function validate(data){
 assert.equal(data.version,'1.9.0');const start=Date.parse(data.interval.startUtc),end=Date.parse(data.interval.endUtcExclusive);assert.equal(end-start,86400000);assert.ok(Number.isFinite(data.daylightMinutes));assert.ok(data.daylightMinutes>=0&&data.daylightMinutes<=1440);
 for(const event of data.events){const time=Date.parse(event.utc);assert.ok(Number.isFinite(time)&&time>=start&&time<end);assert.equal(event.local.slice(0,10),data.inputs.date);const fromLocal=Date.parse(event.local.replace(' ','T')+'Z')-data.inputs.utcOffsetMinutes*60000;assert.ok(Math.abs(fromLocal-time)<1000);}
 const sum=data.daylightSegments.reduce((n,s)=>{assert.ok(s.fromMinutes>=0&&s.toMinutes<=1440&&s.toMinutes>s.fromMinutes);return n+s.toMinutes-s.fromMinutes;},0);assert.ok(Math.abs(sum-data.daylightMinutes)<1e-6);
}
try{
 await page.goto(base+'/tools/daylight');await ready();
 await check('three independent USNO UTC fixtures: event times within 3 minutes; continuous above/below-horizon states match',async()=>{
  for(const [name,reference] of Object.entries(references)){
   await fill({latitude:reference.latitude,longitude:reference.longitude,date:reference.date,offset:'+00:00'});await generate();const data=JSON.parse(await download('json',name));samples[name]=data;validate(data);assert.equal(data.state,reference.state);
   for(const [key,time] of Object.entries(reference.events)){const event=data.events.find(e=>e.key===key);assert.ok(event,`${name} ${key}`);const differenceSeconds=Math.abs(Date.parse(event.utc)-Date.parse(`${reference.date}T${time}:00Z`))/1000;assert.ok(differenceSeconds<=180,`${name} ${key} delta ${differenceSeconds}s`);deltas.push({sample:name,key,referenceUtc:`${reference.date}T${time}:00Z`,actualUtc:event.utc,differenceSeconds});}
   if(reference.noRiseSet)assert.ok(data.events.every(e=>e.key!=='sunrise'&&e.key!=='sunset'));
  }
  assert.equal(samples.summer.daylightMinutes,1440);assert.deepEqual(samples.summer.daylightSegments,[{fromMinutes:0,toMinutes:1440}]);assert.equal(samples.winter.daylightMinutes,0);assert.deepEqual(samples.winter.daylightSegments,[]);assert.ok(samples.winter.events.some(e=>e.key==='dawn'));assert.ok(!JSON.stringify(samples).includes('Invalid Date'));
 });
 await check('actual UTF-8 TXT independently read contains complete inputs, UTC events and polar limitations',async()=>{const txt=await download('txt','winter');assert.ok(txt.includes('2026-12-21'));assert.ok(txt.includes('69.6492'));assert.ok(txt.includes('全天无日照'));assert.ok(txt.includes(samples.winter.events.find(e=>e.key==='dawn').utc));assert.ok(txt.includes('夏令时'));assert.ok(txt.includes('海拔'));});
 await check('cross-date UTC+14 civil day combines two solar cycles, shows sunset before sunrise, positive split day length',async()=>{
  await fill({latitude:'51.4779',longitude:'0',date:'2026-06-21',offset:'+14:00'});await generate();samples.crossDate=JSON.parse(await download('json','cross-date'));validate(samples.crossDate);assert.equal(samples.crossDate.interval.startUtc,'2026-06-20T10:00:00.000Z');assert.equal(samples.crossDate.daylightSegments.length,2);assert.ok(samples.crossDate.daylightMinutes>900&&samples.crossDate.daylightMinutes<1100);const rise=samples.crossDate.events.find(e=>e.key==='sunrise'),set=samples.crossDate.events.find(e=>e.key==='sunset');assert.ok(Date.parse(set.utc)<Date.parse(rise.utc));assert.equal(set.utc.slice(0,10),'2026-06-20');assert.equal(rise.utc.slice(0,10),'2026-06-21');await page.screenshot({path:path.join(output,'daylight-desktop.png'),fullPage:true});
 });
 await check('editing clears and revokes previous actual downloads; malformed coordinates/date/offsets fail without stale output',async()=>{
  const oldUrl=await field('json').getAttribute('href');await field('latitude').fill('NaN');assert.equal(await field('output').count(),0);assert.ok(await page.evaluate(async url=>{try{await fetch(url);return false;}catch{return true;}},oldUrl));
  const bad=[['latitude','NaN'],['latitude','Infinity'],['latitude','1e2'],['latitude','90.000001'],['latitude','1.1234567'],['longitude','-180.1'],['longitude','<svg>'],['offset','+14:15'],['offset','-12:15'],['offset','+08:10'],['offset','08:00'],['offset','+00:60'],['date','1999-12-31'],['date','2100-01-01'],['date','2026-02-30']];
  for(const [key,value] of bad){await fill({latitude:'31.2304',longitude:'121.4737',date:'2026-06-21',offset:'+08:00'});if(key==='date'&&value==='2026-02-30')await field('date').evaluate(element=>{element.type='text';});await field(key).fill(value);await button.click();assert.equal(await field('output').count(),0);assert.equal(await field('json').count(),0);if(key==='date')await field('date').evaluate(element=>{element.type='date';});}
 });
 await check('leap day, coordinate endpoints, quarter-hour offsets and date-range ends remain finite and bounded',async()=>{
  for(const input of [{latitude:'90',longitude:'180',date:'2000-02-29',offset:'-12:00'},{latitude:'-90',longitude:'-180',date:'2099-12-31',offset:'+14:00'},{latitude:'27.7172',longitude:'85.324',date:'2026-03-20',offset:'+05:45'},{latitude:'0',longitude:'0',date:'2000-01-01',offset:'+00:00'}]){await fill(input);await generate();validate(await result());}
 });
 await check('results are independent of browser host timezone; selected DST offset shifts clock only',async()=>{
  await fill({latitude:'51.4779',longitude:'0',date:'2026-06-21',offset:'+00:00'});await generate();const original=await result();assert.deepEqual(original,samples.greenwich);
  const other=await browser.newContext({timezoneId:'Asia/Shanghai'}),p=await other.newPage();await p.goto(base+'/tools/daylight');for(const [key,value]of Object.entries({latitude:'51.4779',longitude:'0',date:'2026-06-21',offset:'+00:00'}))await p.locator('#daylight-'+key).fill(value);await p.waitForFunction(()=>!document.querySelector('#daylight-generate')?.disabled);await p.locator('#daylight-generate').click();await p.locator('#daylight-json').waitFor();assert.deepEqual(await p.locator('#daylight-json').evaluate(async a=>JSON.parse(await(await fetch(a.href)).text())),original);await other.close();
  await field('offset').fill('+01:00');await generate();const shifted=await result();assert.equal(shifted.events.find(e=>e.key==='sunrise').utc,original.events.find(e=>e.key==='sunrise').utc);assert.equal(Date.parse(shifted.events.find(e=>e.key==='sunrise').local.replace(' ','T')+'Z')-Date.parse(original.events.find(e=>e.key==='sunrise').local.replace(' ','T')+'Z'),3600000);
 });
 await check('390/1280 no horizontal overflow with polar empty sunrise and ordinary UTC dates',async()=>{
  await fill({latitude:'69.6492',longitude:'18.9553',date:'2026-12-21',offset:'+00:00'});await generate();for(const width of[390,1280]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'daylight-mobile.png'),fullPage:true});
 });
 await check('local dependency blocked/stalled or removed: bounded Chinese failure, clean results and retry restores calculation',async()=>{
  await page.evaluate(()=>{delete window.SunCalc;});await button.click();assert.equal(await field('output').count(),0);assert.ok(await button.isDisabled());await field('retry').click();await generate();
  await page.route('**/vendor/suncalc/suncalc.js',route=>route.abort());await page.reload();await field('retry').waitFor();assert.ok(await button.isDisabled());await page.unroute('**/vendor/suncalc/suncalc.js');await field('retry').click();await generate();
  await page.route('**/vendor/suncalc/suncalc.js',()=>{});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'加载超时'}).waitFor({timeout:12000});assert.ok(await button.isDisabled());assert.equal(await field('json').count(),0);await page.unroute('**/vendor/suncalc/suncalc.js');await field('retry').click();await generate();
 });
 await check('no geolocation use, external requests or uncaught errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
}catch(e){failure=e.stack;}finally{await browser.close();fs.writeFileSync(path.join(output,'daylight-browser-report.json'),JSON.stringify({base,toleranceSeconds:180,referenceSource:'USNO Astronomical Applications Department; public UTC fixtures retrieved 2026-11-04; not SunCalc reference values',references,deltas,checks,samples,errors,external,failure:failure||null},null,2));}
console.log(JSON.stringify({checks,deltas,errors,external,failure:failure||null},null,2));if(failure)process.exitCode=1;
