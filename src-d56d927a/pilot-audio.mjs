// Reuses existing NORMAL presentation audio, without changing its source.
export function createPilotAudio({storage,contextFactory=()=>new (globalThis.AudioContext??globalThis.webkitAudioContext)(),clock=()=>Date.now()}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{}}
 const key='sangoku-round-map-audio-v1';let settings={muted:false,volume:0.15},context=null,last=-Infinity;const played=new Set();
 try{const saved=JSON.parse(storage?.getItem(key)??'null');if(saved&&typeof saved.muted==='boolean'&&Number.isFinite(saved.volume)&&saved.volume>=0&&saved.volume<=1)settings={muted:saved.muted,volume:saved.volume};}catch{}
 function unlock(){try{context??=contextFactory();if(context.state==='suspended')Promise.resolve(context.resume()).catch(()=>{});}catch{} }
 function configure(patch){settings={muted:typeof patch.muted==='boolean'?patch.muted:settings.muted,volume:Number.isFinite(patch.volume)?Math.max(0,Math.min(1,patch.volume)):settings.volume};try{storage?.setItem(key,JSON.stringify(settings));}catch{}return {...settings};}
 function play(kind,eventId){const now=clock();if(!context||context.state!=='running'||settings.muted||settings.volume===0||played.has(eventId)||now-last<90)return false;
  const notes={select:[440,0.04],move:[330,0.08],attack:[110,0.12],turn:[550,0.06],result:[660,0.2]}[kind];if(!notes)return false;
  try{const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime;oscillator.type=kind==='attack'?'triangle':'sine';oscillator.frequency.setValueAtTime(notes[0],start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(settings.volume*0.2,start+0.008);gain.gain.exponentialRampToValueAtTime(0.0001,start+notes[1]);oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect();}catch{}};oscillator.start(start);oscillator.stop(start+notes[1]+0.01);played.add(eventId);if(played.size>128)played.delete(played.values().next().value);last=now;return true;}catch{return false;}
 }
 return {unlock,configure,play,get settings(){return {...settings};}};
}
