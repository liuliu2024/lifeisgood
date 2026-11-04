// Platform bounded adapter. Original core and dictionary bytes remain unchanged.
import {ConverterBuilder} from './core.js';
import compat from './dict/CJK_Compatibility_Ideographs.js';
import st from './dict/STCharacters.js';import sp from './dict/STPhrases.js';import sg from './dict/STPhrases_GeneratedFromRegionalPhrases.js';import ts from './dict/TSCharacters.js';import tp from './dict/TSPhrases.js';
const Converter=ConverterBuilder({from:{cn:[]},to:{cn:[]},configs:{s2t:{normalizationChain:[[compat]],conversionChain:[[sp,sg,st]]},t2s:{normalizationChain:[[compat]],conversionChain:[[tp,ts]]}}});
self.onmessage=event=>{const {text,mode}=event.data||{};try{if(typeof text!=='string'||!text.trim()||text.length>20000||new TextEncoder().encode(text).length>65536||!['s2t','t2s'].includes(mode))throw Error('输入超限或模式无效。');const convert=Converter(mode==='s2t'?{from:'cn',to:'t'}:{from:'t',to:'cn'});const output=convert(text);if(output.length>60000||new TextEncoder().encode(output).length>262144)throw Error('转换结果超过上限。');postMessage({ok:true,output});}catch{postMessage({ok:false,message:'转换未完成，请检查输入或缩短文字后重试。'});}};
