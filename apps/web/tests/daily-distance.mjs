import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const out=path.resolve('../../../../outputs');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[],external=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.url()))external.push(r.url());});
const base=process.env.DAILY_TOOL_BASE||'http://127.0.0.1:3200';
const keys=['lat1','lon1','lat2','lon2'];
async function ready(){await page.goto(base+'/tools/distance');await page.locator('#distance-generate').waitFor();await page.waitForFunction(()=>!document.querySelector('#distance-generate').disabled);}
async function fill(v){for(let i=0;i<4;i++)await page.locator('#distance-'+keys[i]).fill(String(v[i]));}
async function save(id,name){const d=page.waitForEvent('download');await page.locator('#distance-'+id).click();await(await d).saveAs(path.join(out,name));}
try{await ready();for(const [name,v]of Object.entries({same:[0,0,0,0],quarter:[0,0,0,90],dateLine:[0,179,0,-179],antipodal:[0,0,0,180],poles:[90,0,-90,180],north:[90,0,90,180],city:[39.9042,116.4074,31.2304,121.4737]})){await fill(v);await page.locator('#distance-generate').click();await page.locator('#distance-output').waitFor();await save('json',`distance-${name}.json`);await save('txt',`distance-${name}.txt`);}checks.push('7 coordinate cases with 14 real downloads');
for(const bad of ['91','-91','1e2','NaN',' 1','1.1234567','00']){await fill([bad,0,0,90]);await page.locator('#distance-generate').click();assert.equal(await page.locator('#distance-output').count(),0);}await fill([0,181,0,90]);await page.locator('#distance-generate').click();assert.equal(await page.locator('#distance-output').count(),0);checks.push('8 invalid coordinates rejected');
await fill([0,0,0,90]);await page.locator('#distance-generate').click();await page.locator('#distance-output').waitFor();await page.locator('#distance-lat2').fill('1');assert.equal(await page.locator('#distance-output').count(),0);checks.push('edit clears stale downloads');
await page.evaluate(()=>{const c=URL.createObjectURL.bind(URL),r=URL.revokeObjectURL.bind(URL);window.dc=[];window.dr=[];let n=0;URL.createObjectURL=(b)=>{if(++n===2)throw Error('synthetic second URL error');const u=c(b);window.dc.push(u);return u;};URL.revokeObjectURL=u=>{window.dr.push(u);r(u);};});await page.locator('#distance-generate').click();assert.equal(await page.locator('#distance-output').count(),0);assert.deepEqual(await page.evaluate(()=>window.dc),await page.evaluate(()=>window.dr));checks.push('second Blob URL failure releases first URL');
await ready();await page.setViewportSize({width:390,height:844});await page.locator('#distance-generate').click();await page.locator('#distance-output').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'distance-mobile.png'),fullPage:true});checks.push('390 layout with visible result');
await page.route('**/vendor/turf/loader.js',r=>r.fulfill({contentType:'text/javascript',body:'// controlled missing binding'}));await page.reload();await page.getByText('本地测距组件未能加载，请刷新重试。',{exact:true}).waitFor();assert.equal(await page.locator('#distance-generate').isDisabled(),true);await page.unroute('**/vendor/turf/loader.js');await ready();checks.push('missing dependency controlled and refresh recovers');
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await fs.writeFile(path.join(out,'distance-browser-report.json'),JSON.stringify({checks,errors,external},null,2));await browser.close();}console.log(JSON.stringify({passed:checks.length,checks,errors,external}));
