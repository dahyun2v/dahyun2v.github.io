import {createPilotAudio} from './pilot-audio.mjs';
// Original short plucked-string/wood-drum cue, only for a committed domestic settlement.
export function renderSettlementCue(sampleRate=44100){
 const samples=new Float32Array(Math.round(sampleRate*.46));let seed=0x391;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
 for(const [frequency,offset] of [[220,0],[293.66,.085],[440,.17]]){
  const delay=Math.round(sampleRate/frequency),ring=new Float32Array(delay);let prev=0,index=0;
  for(let j=0;j<delay;j++){prev=(prev+random())*.5;ring[j]=prev;}
  for(let i=Math.round(offset*sampleRate);i<samples.length;i++){
   const value=ring[index];ring[index]=(value+ring[(index+1)%delay])*.496;index=(index+1)%delay;
   const t=i/sampleRate-offset;samples[i]+=value*Math.min(1,t/.004)*Math.exp(-t*7)*.5;
  }
 }
 for(let i=0;i<samples.length;i++){const t=i/sampleRate;samples[i]+=Math.sin(2*Math.PI*(70*t+35*(1-Math.exp(-t*35))/35))*Math.min(1,t/.004)*Math.exp(-t*30)*.08;}
 let peak=0;for(const value of samples)peak=Math.max(peak,Math.abs(value));
 for(let i=0;i<samples.length;i++)samples[i]*=(peak?.42/peak:0)*Math.min(1,(samples.length-1-i)/(sampleRate*.025));
 return samples;
}
export function createSettlementAudio({storage,contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)()}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{}}
 let context=null,buffer=null,resuming=null;const played=new Set();
 const preferences=()=>createPilotAudio({storage}).settings;
 function unlock(){
  try{context??=contextFactory();if(context.state==='suspended'&&!resuming){resuming=Promise.resolve(context.resume()).catch(()=>{}).finally(()=>{resuming=null;});}}catch{}
 }
 function play(eventId){
  const prefs=preferences();if(typeof eventId!=='string'||!eventId||played.has(eventId)||prefs.muted||prefs.volume===0||!context)return false;
  played.add(eventId);if(played.size>128)played.delete(played.values().next().value);
  const start=()=>{
   const prefs=preferences();if(context.state!=='running'||prefs.muted||prefs.volume===0)return false;
   try{
    if(!buffer){const data=renderSettlementCue(context.sampleRate??44100);buffer=context.createBuffer(1,data.length,context.sampleRate??44100);buffer.getChannelData(0).set(data);}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.setValueAtTime(prefs.volume*.32,context.currentTime);source.connect(gain);gain.connect(context.destination);
    source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}};source.start(context.currentTime);return true;
   }catch{return false;}
  };
  if(resuming){resuming.then(start);return true;}return start();
 }
 return {unlock,play};
}
