// Original procedural plucked strings; title presentation only, no battle audio.
export const TITLE_UI_CUES=Object.freeze({start:.82,open:.55,close:.58});
export function renderTitleCue(kind,sampleRate=44100){
 const duration=TITLE_UI_CUES[kind];if(!duration)throw new Error('UNKNOWN_TITLE_CUE');
 const samples=new Float32Array(Math.round(duration*sampleRate));
 const notes={start:[[146.83,0],[220,.035],[293.66,.07],[329.63,.105],[369.99,.14],[440,.18]],open:[[293.66,0],[329.63,.075],[440,.15]],close:[[440,0],[369.99,.07],[293.66,.14]]}[kind];
 let seed=0x4217;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/2147483648-1;};
 for(const [frequency,offset] of notes){
  const delay=Math.max(2,Math.round(sampleRate/frequency)),ring=new Float32Array(delay);let previous=0;
  for(let j=0;j<delay;j++){previous=(previous+random())*.5;ring[j]=previous;}
  const begin=Math.floor(offset*sampleRate);let index=0;
  for(let i=begin;i<samples.length;i++){
   const value=ring[index],next=ring[(index+1)%delay];ring[index]=(value+next)*.4985;index=(index+1)%delay;
   const t=(i-begin)/sampleRate,envelope=Math.min(1,t/.003)*Math.exp(-t*4);
   // Light soundboard resonance enriches the short pluck rather than a UI beep.
   samples[i]+=value*envelope*.55;
  }
 }
 if(kind==='start')for(let i=0;i<samples.length;i++){
  const t=i/sampleRate;
  samples[i]+=Math.sin(2*Math.PI*(48*t+34*(1-Math.exp(-t*28))/28))*Math.min(1,t/.004)*Math.exp(-t*18)*.10;
 }
 let peak=0;for(const x of samples)peak=Math.max(peak,Math.abs(x));
 const scale=peak>0?.48/peak:0;
 for(let i=0;i<samples.length;i++)samples[i]*=scale*Math.min(1,(samples.length-1-i)/(sampleRate*.025));
 samples[samples.length-1]=0;
 return samples;
}
export function createTitleUiAudio({storage,contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)(),clock=()=>Date.now()}={}){
 let prefs={muted:false,volume:.15},context=null,voice=null,pending=null,active=true,sequence=0,last=-Infinity,lastKind=null;
 const buffers=new Map();
 try{const saved=JSON.parse(storage?.getItem('sangoku-round-map-audio-v1')??'null');if(saved&&typeof saved.muted==='boolean'&&Number.isFinite(saved.volume)&&saved.volume>=0&&saved.volume<=1)prefs={muted:saved.muted,volume:saved.volume};}catch{}
 function retire(){const old=voice;voice=null;if(!old)return;try{old.source.stop();}catch{}try{old.source.disconnect();old.gain.disconnect();}catch{}}
 function cancel(){sequence++;pending=null;retire();}
 function start(kind,token){
  if(token!==sequence||!active||prefs.muted||prefs.volume===0||context?.state!=='running')return false;
  pending=null;retire();
  let source,gain;
  try{
   let buffer=buffers.get(kind);if(!buffer){const data=renderTitleCue(kind,context.sampleRate??44100);buffer=context.createBuffer(1,data.length,context.sampleRate??44100);buffer.getChannelData(0).set(data);buffers.set(kind,buffer);}
   source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;gain.gain.setValueAtTime(prefs.volume*.32,context.currentTime);
   source.connect(gain);gain.connect(context.destination);const next={source,gain};voice=next;
   source.onended=()=>{if(voice===next)voice=null;try{source.disconnect();gain.disconnect();}catch{}};
   source.start(context.currentTime);return true;
  }catch{try{source?.disconnect();gain?.disconnect();}catch{}voice=null;return false;}
 }
 function play(kind){
  if(!active||!TITLE_UI_CUES[kind]||prefs.muted||prefs.volume===0)return false;
  const now=clock();if(now-last<100&&kind===lastKind)return false;last=now;lastKind=kind;const token=++sequence;
  try{
   context??=contextFactory();
   if(context.state==='running')return start(kind,token);
   if(context.state==='suspended'){
    pending={kind,token};Promise.resolve(context.resume()).then(()=>{if(token===sequence)pending=null;start(kind,token);}).catch(()=>{if(token===sequence)pending=null;});return true;
   }
  }catch{}pending=null;return false;
 }
 function configure(next){prefs={muted:typeof next.muted==='boolean'?next.muted:prefs.muted,volume:Number.isFinite(next.volume)?Math.max(0,Math.min(1,next.volume)):prefs.volume};if(prefs.muted||prefs.volume===0)cancel();else if(voice)try{voice.gain.gain.setValueAtTime(prefs.volume*.32,context.currentTime);}catch{}}
 return Object.freeze({play,configure,deactivate(){active=false;cancel();},activate(){active=true;},get settings(){return {...prefs};},get snapshot(){return {active,playing:!!voice,pending:!!pending,settings:{...prefs}};}});
}
