import { PitchDetector } from './pitchy.js';
function inspect(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<44||buffer.byteLength>1048576)throw Error('需要44字节至1MiB的PCM16 WAV。');
 const v=new DataView(buffer),tag=n=>String.fromCharCode(...new Uint8Array(buffer,n,4));
 if(tag(0)!=='RIFF'||tag(8)!=='WAVE'||v.getUint32(4,true)+8!==buffer.byteLength)throw Error('需要完整、长度一致的RIFF WAV。');
 let fmt=null,data=-1,size=0,chunks=0,o=12;
 while(o<buffer.byteLength){if(o+8>buffer.byteLength||++chunks>64)throw Error('WAV尾部或块数量无效。');const n=v.getUint32(o+4,true),end=o+8+n;if(end>buffer.byteLength)throw Error('WAV块长度损坏。');
  if(tag(o)==='fmt '){if(fmt||![16,18].includes(n)||(n===18&&v.getUint16(o+24,true)!==0))throw Error('只支持标准PCM格式块。');fmt=[v.getUint16(o+8,true),v.getUint16(o+10,true),v.getUint32(o+12,true),v.getUint32(o+16,true),v.getUint16(o+20,true),v.getUint16(o+22,true)];}
  if(tag(o)==='data'){if(data>=0)throw Error('只支持一个音频数据块。');data=o+8;size=n;}
  o=end+n%2;if(o>buffer.byteLength)throw Error('WAV块填充损坏。');
 }
 if(!fmt||data<0)throw Error('缺少格式或音频数据。');const [format,channels,rate,byteRate,align,bits]=fmt;
 if(format!==1||bits!==16||![1,2].includes(channels)||rate<8000||rate>48000||align!==channels*2||byteRate!==rate*align||size%align!==0)throw Error('只支持单/双声道8–48kHz的PCM16 WAV。');
 const frames=size/align;if(frames<4096||frames>rate*5)throw Error('需要至少4096采样帧，且不超过5秒。');return {v,data,rate,channels,frames,align};
}
self.onmessage=({data:buffer})=>{try{const p=inspect(buffer),count=Math.min(20,Math.floor(p.frames/4096)),detector=PitchDetector.forFloat32Array(4096),samples=new Float32Array(4096),rows=[];
 for(let w=0;w<count;w++){const start=count===1?0:Math.floor(w*(p.frames-4096)/(count-1));let energy=0;
  for(let i=0;i<4096;i++){let x=0;for(let c=0;c<p.channels;c++)x+=p.v.getInt16(p.data+(start+i)*p.align+c*2,true)/32768;const value=x/p.channels;samples[i]=value;energy+=value*value;}
  const rms=Math.sqrt(energy/4096);let hz=null,clarity=null,note=null,reason='silence';
  if(rms>=0.005){const found=detector.findPitch(samples,p.rate);const f=found[0],c=found[1];clarity=Number.isFinite(c)?c:null;reason='unstable';if(Number.isFinite(f)&&clarity!==null&&clarity>=0.85){if(f<80||f>1200)reason='out-of-range';else{hz=f;const midi=Math.round(69+12*Math.log2(f/440));note=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);reason='ok';}}}
  rows.push({startSeconds:start/p.rate,endSeconds:(start+4096)/p.rate,rms,hz,clarity,note,reason});
 }
 self.postMessage({ok:true,result:{schema:1,library:'pitchy4.1.0 + fft.js4.0.4',sampleRate:p.rate,channels:p.channels,frames:p.frames,durationSeconds:p.frames/p.rate,windowFrames:4096,stereoMix:'arithmetic mean of both channels; opposite phases can cancel',rows,limits:['At most20 sampled windows, not a full-track pitch curve','RMS>=0.005, clarity>=0.85 and80–1200Hz; clarity is not probability','Approximate12-TET note with A4=440Hz, not professional calibration','No filename, audio, microphone, upload or identity inference']}});
}catch(e){self.postMessage({ok:false,error:e instanceof Error?e.message:'音高分析失败，请换标准WAV。'});}};
