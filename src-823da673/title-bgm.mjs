// Presentation draft, not a game rule. Native media policies are never bypassed.
export const TITLE_BGM=Object.freeze({src:'/assets/audio/title-bgm/title-bgm-user-rtk-v2.mp3',sha256:'e4644ce6886655ad54bcf4c68bc2d86d8bf8af6886d5bc32d9dea63a7761dc6a',status:'USER_SELECTED_LOCAL_SHA256_VERIFIED'});
export function createTitleBgm({factory=src=>new Audio(src),settings={muted:false,volume:.15},onStatus=()=>{}}={}){
 let media=null,pending=null,playing=false,active=true,requested=false,blocked=false,generation=0,errorHandler=null;
 let prefs={muted:!!settings.muted,volume:Number.isFinite(settings.volume)?Math.max(0,Math.min(1,settings.volume)):.15};
 const status=value=>{try{onStatus(value);}catch{}};
 function apply(){if(media){media.loop=true;media.preload='none';media.muted=prefs.muted;media.volume=prefs.volume;}}
 function pause(){
  generation++;pending=null;playing=false;
  const old=media;media=null;
  try{old?.pause();}catch{}
  try{old?.removeEventListener?.('error',errorHandler);old?.removeAttribute?.('src');if(old)old.currentTime=0;old?.load?.();}catch{}
  errorHandler=null;
 }
 function start(){
  if(!active||!requested||blocked)return;
  if(prefs.muted||prefs.volume===0){status('MUTED');return;}
  if(pending||playing)return;
  try{
   if(!media){media=factory(TITLE_BGM.src);const created=media;errorHandler=()=>{if(media!==created)return;pause();status('FAILED');};media.addEventListener?.('error',errorHandler);}
   apply();const ref=media,token=++generation;pending={ref,token};
   status('STARTING');const result=ref.play();
   Promise.resolve(result).then(()=>{
    if(token!==generation||!active||!requested||prefs.muted||prefs.volume===0){if(ref!==media||!active||!requested||prefs.muted||prefs.volume===0)try{ref.pause();}catch{}return;}
    pending=null;playing=true;status('PLAYING');
   }).catch(error=>{if(token!==generation)return;pending=null;playing=false;blocked=error?.name==='NotAllowedError';status(blocked?'BLOCKED':'FAILED');});
  }catch(error){pending=null;playing=false;blocked=error?.name==='NotAllowedError';status(blocked?'BLOCKED':'FAILED');}
 }
 function configure(next){prefs={muted:typeof next.muted==='boolean'?next.muted:prefs.muted,volume:Number.isFinite(next.volume)?Math.max(0,Math.min(1,next.volume)):prefs.volume};try{apply();}catch{}if(prefs.muted||prefs.volume===0){pause();status('MUTED');}else start();}
 function deactivate(){active=false;requested=false;pause();status('STOPPED');}
 function activate(){if(!active)blocked=false;active=true;requested=true;start();}
 status('WAITING_GESTURE');
 return Object.freeze({gesture(){if(!active)return;blocked=false;requested=true;start();},configure,deactivate,activate,get snapshot(){return {active,requested,blocked,playing,pending:!!pending,settings:{...prefs}};}});
}
