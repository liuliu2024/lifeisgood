// Lifeisgood MIT wrapper. d3-cloud.js is the unchanged BSD-3-Clause 2.0.0 browser ESM build.
import CloudLayout, {archimedeanStrategy} from "./d3-cloud.js";

function random(seed) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n ^= n + Math.imul(n ^ n >>> 7, 61 | n); return ((n ^ n >>> 14) >>> 0) / 4294967296; }; }
self.onmessage = event => {
  try {
    const {words, width, height, seed} = event.data;
    if (!Array.isArray(words) || !words.length || words.length > 40 || ![[1000,640],[600,400]].some(s=>s[0]===width&&s[1]===height) || !Number.isInteger(seed) || seed < 1 || seed > 2147483647) throw Error("输入参数无效，请重新填写。");
    const started = performance.now(); let totalSteps = 0;
    const layout = new CloudLayout().canvas(()=>new OffscreenCanvas(1,1)).size([width,height]).overflow(false).random(random(seed));
    layout.strategy((initial,context)=>{const next=archimedeanStrategy(initial,context);let steps=0;return()=>{if(++steps>12000||totalSteps>=150000||performance.now()-started>3000)return null;totalSteps++;return next();};});
    const placed=[],missing=[];
    for (const item of [...words].sort((a,b)=>b.weight-a.weight||a.index-b.index)) {
      if (typeof item.text !== "string" || Array.from(item.text).length>20 || !item.text.trim() || /[\u0000-\u001f\u007f]/.test(item.text) || !Number.isInteger(item.weight) || item.weight<1 || item.weight>100) throw Error("词语或权重超限。");
      if (totalSteps>=150000 || performance.now()-started>3000) {missing.push({...item,reason:"布局步数或3秒预算已用完"});continue;}
      const size=18+Math.round(54*Math.sqrt(item.weight/100));
      const sprite=layout.getSprite(item.text,{size,font:"sans-serif",style:"normal",weight:"normal",rotate:0,padding:3,datum:item.index});
      if(!sprite){missing.push({...item,reason:"无法生成可见文字，请缩短或换词"});continue;}
      const word=layout.place(sprite);
      if(word)placed.push({index:item.index,text:item.text,weight:item.weight,size,x:word.x,y:word.y,x0:word.x0,x1:word.x1,y0:word.y0,y1:word.y1});
      else missing.push({...item,reason:"未找到合适空位；可缩短词语、降低权重或选大画布"});
    }
    self.postMessage({type:"result",result:{library:"d3-cloud 2.0.0",width,height,seed,font:"sans-serif",input:words,placed,missing,totalSteps,elapsedMs:Math.round(performance.now()-started),limits:{maxWords:40,maxCandidatesPerWord:12000,maxCandidatesTotal:150000,layoutMs:3000}}});
  }catch(error){self.postMessage({type:"error",message:error instanceof Error?error.message:"布局失败，请重试。"});}
};
if(typeof OffscreenCanvas!=="function")self.postMessage({type:"error",message:"浏览器不支持本地离屏画布，请换用新版浏览器。"});
else self.postMessage({type:"ready"});
