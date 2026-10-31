import {shouldOfferPrologue} from '/src/campaign-prologue.mjs';
import {deserialize, CAMPAIGN_SAVE_KEY, CAMPAIGN_TURN_LIMIT} from '/src/campaign-runtime.mjs';
import {loadText,settle,saveMarkerKey} from '/src/save-store.mjs';
import {createTitleUiAudio} from '/src/title-ui-audio.mjs';
import {createTitleBgm} from '/src/title-bgm.mjs';
// C135: show legacy comparison links only with ?dev=1.
for(const link of document.querySelectorAll?.('[data-dev-only]')??[])link.hidden=new URLSearchParams(globalThis.location?.search??'').get('dev')!=='1';
const $=s=>document.querySelector(s);
const saveKey=CAMPAIGN_SAVE_KEY,audioKey='sangoku-round-map-audio-v1';
const audio=createTitleUiAudio({storage:{getItem:key=>globalThis.localStorage.getItem(key)}});let navigating=false,returnFocus=null,opened=null,navigationTimer=null,pageHidden=false;
let soundGesture=false;
const bgm=createTitleBgm({settings:audio.settings,onStatus(){showSoundHint();}});
function showSoundHint(){const node=$('#bgm-status');if(node)node.textContent=soundGesture?'':'아무 곳이나 누르면 소리가 납니다';}
function soundInput(){soundGesture=true;showSoundHint();}
document.addEventListener?.('pointerdown',e=>{if(e.isTrusted){soundInput();if(!navigating&&document.visibilityState!=='hidden')bgm.gesture();}},{capture:true});
document.addEventListener?.('keydown',e=>{if(e.isTrusted&&!e.repeat){soundInput();if(!navigating&&document.visibilityState!=='hidden')bgm.gesture();}},{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden'){bgm.deactivate();audio.deactivate();}else if(!navigating){reloadAudio();audio.activate();bgm.activate();}});
document.documentElement.style.setProperty('--title-background','url("/assets/title-screen/title-bg-v1.webp")');
// The full artwork includes its subtitle and seal; restore the text group on failure.
const logo=$('#title-logo');
function showLogo(loaded){
 logo.hidden=!loaded;
 for(const selector of ['#title-wordmark','.seal','.subtitle']){const node=$(selector);if(node)node.hidden=loaded;}
}
if(logo){logo.addEventListener('load',()=>showLogo(true));logo.addEventListener('error',()=>showLogo(false));logo.src='/assets/title-screen/logo-ink-noseal.png';}
const menuIds=['continue-game','new-game','prologue-game','guide','settings'];
const descriptions={'continue-game':'마지막으로 저장한 천하를 이어갑니다.','new-game':'군주를 골라 새로운 천하를 시작합니다.','prologue-game':'세 차례에 걸쳐 출진 · 이동 · 교전 · 함락을 익힙니다.',guide:'이동과 전투, 차례 진행 방법을 확인합니다.',settings:'BGM과 효과음의 음량을 조절합니다.'};
let selectedMenu='new-game';
function selectMenu(id){selectedMenu=id;for(const key of menuIds)$('#'+key)?.classList?.toggle('is-selected',key===id);const text=$('#menu-description');if(text)text.textContent=descriptions[id];}
for(const id of menuIds){const button=$('#'+id);button?.addEventListener('pointerenter',()=>{if(!button.disabled&&!button.hidden)selectMenu(id);});button?.addEventListener('focus',()=>selectMenu(id));}
$('#title-menu')?.addEventListener('keydown',event=>{
 if(opened||navigating||!['ArrowUp','ArrowDown','Enter'].includes(event.key))return;
 const available=menuIds.map(id=>$('#'+id)).filter(node=>node&&!node.disabled&&!node.hidden);
 if(!available.length)return;event.preventDefault();
 const current=available.findIndex(node=>node.id===selectedMenu);
 const next=event.key==='Enter'?available[Math.max(0,current)]:available[(current+(event.key==='ArrowDown'?1:-1)+available.length)%available.length];
 if(event.key==='Enter')next.click();else next.focus();
});
// 저장은 IndexedDB(압축) 또는 localStorage(save-store.mjs). IndexedDB 면 비동기라 마지막 결과(lastSaved)를 쓴다.
let lastSaved=null,hasStoredCampaign=false;
function refreshContinue(){
 const fail=(reason,code)=>{lastSaved=null;$('#continue-game').setAttribute?.('title',reason+' ('+code+')');$('#continue-game').setAttribute?.('aria-describedby','continue-summary');$('#continue-summary').setAttribute?.('data-faction','');$('#continue-game').disabled=true;$('#continue-game').hidden=false;$('#continue-summary').textContent=reason+' ('+code+')';$('#continue-summary').hidden=false;if(selectedMenu==='continue-game')selectMenu('new-game');return null;};
 const apply=raw=>{hasStoredCampaign=raw!==null&&raw!==undefined;try{if(!hasStoredCampaign)return fail('저장된 판이 없습니다','SAVE_EMPTY');
  const saved=deserialize(raw);const first=lastSaved===null;lastSaved=saved;$('#continue-game').setAttribute?.('title',descriptions['continue-game']);$('#continue-game').disabled=false;$('#continue-game').hidden=false;
  let stamp='';try{const ms=Number(localStorage.getItem(saveMarkerKey(saveKey)));if(Number.isFinite(ms)&&ms>0){const date=new Date(ms);if(Number.isFinite(date.getTime()))stamp=' · '+new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}}catch{}
  $('#continue-summary').textContent=`${saved.factions?.[saved.playerFactionId]?.name??saved.playerFactionId} · ${saved.turn}/${CAMPAIGN_TURN_LIMIT}차례${stamp}`;$('#continue-summary').setAttribute?.('data-faction',saved.playerFactionId);$('#continue-summary').hidden=false;if(first)selectMenu('continue-game');return saved;}catch(error){return /지원하지 않는|구형 저장/.test(String(error?.message))?fail('판 형식이 옛것입니다','SAVE_FORMAT'):fail('저장이 손상되었습니다','SAVE_CORRUPT');}};
 try{const r=settle(loadText(saveKey),apply);if(r&&typeof r.catch==='function'){r.catch(()=>fail('저장 읽기 오류','SAVE_READ'));return lastSaved;}return r;}catch{return fail('저장 읽기 오류','SAVE_READ');}
}
function go(kind){if(navigating)return;if(kind==='continue'&&!refreshContinue()){$('#title-status').textContent='유효한 캠페인 저장을 찾지 못했습니다. 기존 저장은 보존했습니다.';return;}
 navigating=true;for(const id of ['new-game','continue-game','settings','guide'])$('#'+id).disabled=true;
 const cue=audio.play('start');bgm.deactivate();
 const navigate=()=>{navigationTimer=null;try{location.assign('/world?entry='+kind);}catch{navigating=false;bgm.activate();bgm.gesture();$('#new-game').disabled=false;$('#settings').disabled=false;$('#guide').disabled=false;refreshContinue();$('#title-status').textContent='게임 화면으로 이동하지 못했습니다. 다시 시도하세요.';}};
 // Preserve only a short attack; never wait for the entire musical cue.
 if(cue)navigationTimer=globalThis.setTimeout(navigate,24);else navigate();
}
function closeDialog(){if(!opened)return;opened.close();audio.play('close');opened=null;returnFocus?.focus();returnFocus=null;}
function openDialog(id,trigger,first){if(navigating||opened||trigger.disabled)return;returnFocus=trigger;opened=$('#'+id);opened.showModal();(first.includes(' ')?document.querySelector('#'+first):$('#'+first))?.focus();audio.play('open');}
for(const id of ['settings-dialog','guide-dialog','prologue-dialog']){
 const dialog=$('#'+id);if(!dialog)continue;dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeDialog();return;}if(e.key!=='Tab')return;
  const focusables=[...dialog.querySelectorAll('button,input')].filter(n=>!n.disabled),first=focusables[0],last=focusables.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
}
// C225: the first-run offer never writes a campaign save or legacy.
$('#new-game').addEventListener('click',()=>{if($('#new-game').disabled)return;if($('#prologue-dialog')&&shouldOfferPrologue(()=>globalThis.localStorage,hasStoredCampaign))openDialog('prologue-dialog',$('#new-game'),'prologue-accept');else go('new');});
$('#prologue-game')?.addEventListener('click',()=>go('prologue'));
$('#prologue-accept')?.addEventListener('click',()=>go('prologue'));
$('#prologue-direct')?.addEventListener('click',()=>{closeDialog();go('new');});
$('#continue-game').addEventListener('click',()=>{if(!$('#continue-game').disabled)go('continue');});
$('#settings').addEventListener('click',()=>{sharedSettings.hidden=false;const soundTab=sharedSettings.querySelector('[data-c261-tab="0"]');if(soundTab?.getAttribute?.('role')==='tab')soundTab.click();sharedSettings.querySelector('button').focus();});
$('#guide').addEventListener('click',()=>openDialog('guide-dialog',$('#guide'),'guide-dialog input'));
$('#settings-back').addEventListener('click',closeDialog);$('#guide-back').addEventListener('click',closeDialog);
function reloadAudio(){try{const next=JSON.parse(localStorage.getItem(audioKey)??'null')??{muted:false,volume:.15};if(typeof next.muted==='boolean'&&Number.isFinite(next.volume)&&next.volume>=0&&next.volume<=1){audio.configure(next);bgm.configure(next);showAudio();}}catch{}}
function showAudio(){const s=audio.settings;$('#setting-mute').checked=s.muted;$('#setting-volume').value=String(s.volume);$('#volume-value').textContent=Math.round(s.volume*100)+'%';}
function saveAudio(){try{const next={muted:$('#setting-mute').checked,volume:Math.max(0,Math.min(1,Number($('#setting-volume').value)))};if(!Number.isFinite(next.volume))throw new Error('INVALID_VOLUME');localStorage.setItem(audioKey,JSON.stringify(next));audio.configure(next);bgm.configure(next);$('#settings-status').textContent='음향 설정을 저장했습니다.';}catch{$('#settings-status').textContent='설정을 저장하지 못했습니다. 기존 값을 유지합니다.';}showAudio();}
$('#setting-mute').addEventListener('change',saveAudio);$('#setting-volume').addEventListener('input',saveAudio);
$('#preview-sound').addEventListener('click',()=>{if(!$('#preview-sound').disabled)audio.play('open');});
globalThis.addEventListener?.('storage',e=>{if(e.key===audioKey||e.key===null)reloadAudio();if((e.key===saveKey||e.key===saveMarkerKey(saveKey)||e.key===null)&&!navigating)refreshContinue();});
globalThis.addEventListener?.('pagehide',()=>{pageHidden=true;if(navigationTimer!==null){clearTimeout(navigationTimer);navigationTimer=null;}bgm.deactivate();audio.deactivate();});
globalThis.addEventListener?.('pageshow',e=>{if(e?.persisted===false&&!pageHidden)return;pageHidden=false;navigating=false;if(navigationTimer!==null){clearTimeout(navigationTimer);navigationTimer=null;}reloadAudio();audio.activate();bgm.activate();$('#new-game').disabled=false;$('#settings').disabled=false;$('#guide').disabled=false;refreshContinue();});
showAudio();refreshContinue();if(document.visibilityState!=='hidden')bgm.activate();

window.__titleMenuReady=true;{const s=document.getElementById('title-status');if(s?.textContent?.startsWith('화면 코드를 불러오지'))s.textContent='';}

// C261: title and game mount the same settings/help components.
import {mountSettingsPanel,mountHelpPanel} from '/app/world/hud-ink.mjs';
const sharedSettings=document.createElement('section');sharedSettings.hidden=true;document.body.append(sharedSettings);
mountSettingsPanel(sharedSettings,{close:()=>{sharedSettings.hidden=true;$('#settings').focus();},soundChanged:reloadAudio});

const guideEntries=[...$('#guide-dialog ol').children].map((li,i)=>({name:['시작하기','이동','전투','성','차례와 승리'][i],html:li.innerHTML}));
mountHelpPanel($('#guide-dialog'),guideEntries,closeDialog);
