import {createPilotAudio} from './pilot-audio.mjs';
// All samples are synthesized locally. Seeded noise keeps offline QA reproducible.
export function renderCombatSound(kind,{sampleRate=44100}={}) {
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new Error('INVALID_SAMPLE_RATE');
 const cavalry=kind.startsWith('BT04'),ranged=kind.startsWith('BT03');
 const duration=cavalry?1.35:ranged?1.15:.85,data=new Float32Array(Math.ceil(duration*sampleRate));
 let seed=731;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 function tone(at,length,hz,amp,decay=12,fall=0,triangle=false){
  const start=Math.floor(at*sampleRate),size=Math.floor(length*sampleRate);
  for(let i=0;i<size&&start+i<data.length;i++){const t=i/sampleRate,phase=hz*t-fall*t*t/2;
   const wave=triangle?2/Math.PI*Math.asin(Math.sin(2*Math.PI*phase)):Math.sin(2*Math.PI*phase);
   data[start+i]+=amp*wave*Math.exp(-decay*t)*Math.min(1,t/.003)*Math.min(1,(length-t)/.015);
  }
 }
 function burst(at,length,amp,lowHz,highHz){
  let low=0,high=0;const start=Math.floor(at*sampleRate);
  for(let i=0;i<length*sampleRate&&start+i<data.length;i++){
   const t=i/sampleRate,x=noise(),sweep=highHz+(lowHz-highHz)*t/length;
   low+=(1-Math.exp(-2*Math.PI*lowHz/sampleRate))*(x-low);
   high+=(1-Math.exp(-2*Math.PI*sweep/sampleRate))*(x-high);
   data[start+i]+=amp*(high-low)*Math.sin(Math.PI*t/length)*Math.exp(-3*t);
  }
 }
 let hit=cavalry?.36:.02;
 if(cavalry)for(let i=0;i<6;i++)tone(i*.05,.11,70+i%2*24,.32,28);
 if(ranged){
  tone(0,.12,720,.3,28,2400,true);
  for(let i=0;i<4;i++){burst(.10+i*.04,.22,.55,350,8500);tone(.36+i*.05,.09,145,.25,32);}
 }else{
  burst(hit,.065,.65,1000,11000);
  for(const [i,hz]of [2100,2750,3400].entries())tone(hit+i*.007,.28,hz,.24,20);
  burst(hit,.5,.65,150,900);
 }
 if(kind.includes(':heavy'))tone(hit+.08,.4,53,.5,10,40);
 let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));
 const gain=(kind.includes(':counter')?.28:.55)/(peak||1);
 for(let i=0;i<data.length;i++)data[i]*=gain;
 return data;
}
export function createCampaignCombatAudio({storage,contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)()}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{}}
 const prefs=()=>createPilotAudio({storage}).settings;
 let context=null,resuming=null,generation=0;const played=new Set(),sources=new Set(),cache=new Map();
 function release(entry){sources.delete(entry);try{entry.source.disconnect();entry.gain.disconnect();}catch{}}
 function stop(entry){try{entry.source.stop();}catch{}release(entry);}
 function cancel(){generation++;for(const entry of [...sources])stop(entry);}
 function refresh(){const p=prefs();if(p.muted||p.volume===0)cancel();else for(const entry of sources)try{entry.gain.gain.setValueAtTime(p.volume*.32,context.currentTime);}catch{}}
 function dispose(){cancel();const old=context;context=null;resuming=null;cache.clear();try{Promise.resolve(old?.close?.()).catch(()=>{});}catch{}}
 function unlock(){
  const p=prefs();if(p.muted||p.volume===0)return;
  try{context??=contextFactory();if(context.state==='suspended'&&!resuming){const current=context;resuming=Promise.resolve(context.resume()).catch(()=>{}).finally(()=>{if(context===current)resuming=null;});}}catch{}
 }
 function play(cues,eventId){
  const p=prefs();if(!cues.length||!context||p.muted||p.volume===0||typeof eventId!=='string'||!eventId||played.has(eventId))return false;
  played.add(eventId);if(played.size>128)played.delete(played.values().next().value);
  const token=generation,current=context;
  const start=()=>{
   const p=prefs();if(token!==generation||context!==current||current.state!=='running'||p.muted||p.volume===0)return false;
   let entry=null;try{
    const key=cues.join(','),sampleRate=current.sampleRate??44100;
    if(!cache.has(key)){
     const parts=cues.map(kind=>renderCombatSound(kind,{sampleRate})),gap=Math.round(sampleRate*.035),size=parts.reduce((n,part)=>n+part.length+gap,0);
     const buffer=current.createBuffer(1,size,sampleRate),data=buffer.getChannelData(0);let at=0;
     for(const part of parts){data.set(part,at);at+=part.length+gap;}cache.set(key,buffer);
    }
    // Two bounded sequence voices; every sequence itself contains serial cues.
    while(sources.size>=2)stop(sources.values().next().value);
    const source=current.createBufferSource(),gain=current.createGain();entry={source,gain};source.buffer=cache.get(key);
    gain.gain.setValueAtTime(p.volume*.32,current.currentTime);source.connect(gain);gain.connect(current.destination);
    source.onended=()=>release(entry);sources.add(entry);source.start(current.currentTime);return true;
   }catch{if(entry)stop(entry);return false;}
  };
  if(resuming){resuming.then(start);return true;}return start();
 }
 return Object.freeze({unlock,cancel,refresh,dispose,play(troop,eventId,{counter=false,heavyLoss=false}={}){return play([troop+(counter?':counter':'')+(heavyLoss?':heavy':'')],eventId);},get snapshot(){return {voices:sources.size,events:played.size,settings:prefs()};}});
}
