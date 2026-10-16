import {createPilotAudio} from './pilot-audio.mjs';
import {renderSettlementCue} from './settlement-audio.mjs';

// Original procedural presentation sounds. No recordings or game-rule changes.
export function campaignCueSequence(before,after,request){
 if(!before?.battle||!after?.battle||after.battle.revision===before.battle.revision)return [];
 const a=before.battle.bundle.frame,b=after.battle.bundle.frame;
 const activation=f=>f.round.active?`${f.round.roundNumber}:${f.round.active.unitId}:${f.round.active.queue}`:null;
 const cues=[],committed=b.receipts.slice(a.receipts.length).map(r=>JSON.parse(r.request).kind);
 if(committed.includes('MOVE'))cues.push('move');
 if(committed.some(kind=>kind==='ENGAGED_MELEE'||kind==='CONTACT_MELEE'))cues.push('attack');
 if(activation(a)!==activation(b)){
  if(activation(a))cues.push('turn-end');
  if(activation(b)&&!after.battle.result)cues.push('turn-start');
 }
 return cues;
}

export function renderCampaignCue(kind,sampleRate=44100){
 if(kind==='turn-start')return renderSettlementCue(sampleRate);
 const duration={move:.66,attack:.32,'turn-end':.26}[kind];
 if(!duration)throw Error('UNKNOWN_CAMPAIGN_CUE');
 const data=new Float32Array(Math.ceil(sampleRate*duration));let seed=0x63e31;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
 function hit(offset,length,frequency,amount,metal=0){
  let low=0;
  for(let i=Math.round(offset*sampleRate);i<Math.min(data.length,Math.round((offset+length)*sampleRate));i++){
   const t=i/sampleRate-offset;low=.76*low+.24*noise();
   const body=Math.sin(2*Math.PI*frequency*t+2*(1-Math.exp(-t*30)))+low*.8;
   const clang=metal*(Math.sin(2*Math.PI*1163*t)+.35*Math.sin(2*Math.PI*1739*t));
   data[i]+=(body+clang)*amount*Math.min(1,t/.003)*Math.exp(-t*22);
  }
 }
 if(kind==='move'){
  // Four staggered low footfalls with restrained higher equipment rattles.
  for(const [i,offset] of [0,.15,.3,.45].entries()){
   hit(offset,.17,i%2?86:72,.3);
   hit(offset+.026,.075,640,.038,.7);
  }
 }else if(kind==='attack'){
  hit(0,.27,103,.4,.35);hit(.065,.2,71,.18,.22);
 }else{
  hit(0,.2,185,.25,.15);hit(.07,.16,123,.16,.12);
 }
 let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));
 for(let i=0;i<data.length;i++)data[i]*=(peak?.4/peak:0)*Math.min(1,(data.length-1-i)/(sampleRate*.018));
 return data;
}

export function createCampaignActionAudio({storage,contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)()}={}){
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
     const parts=cues.map(kind=>renderCampaignCue(kind,sampleRate)),gap=Math.round(sampleRate*.035),size=parts.reduce((n,part)=>n+part.length+gap,0);
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
 return Object.freeze({unlock,cancel,refresh,dispose,playTransition(before,after,request,id){return play(campaignCueSequence(before,after,request),id);},playStart(state,id){return state?.battle?.bundle.frame.round.active&&!state.battle.result?play(['turn-start'],id):false;},get snapshot(){return {voices:sources.size,events:played.size,settings:prefs()};}});
}
