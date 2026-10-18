import {shouldOfferPrologue} from '/src/campaign-prologue.mjs';
import {deserialize, CAMPAIGN_SAVE_KEY} from '/src/campaign-runtime.mjs';
import {loadText,settle,saveMarkerKey} from '/src/save-store.mjs';
import {createTitleUiAudio} from '/src/title-ui-audio.mjs';
import {TITLE_BACKGROUND,TITLE_MENU_PLAQUE} from '/src/title-presentation.mjs';
import {createTitleBgm} from '/src/title-bgm.mjs';
// C135: show legacy comparison links only with ?dev=1.
for(const link of document.querySelectorAll?.('[data-dev-only]')??[])link.hidden=new URLSearchParams(globalThis.location?.search??'').get('dev')!=='1';
const $=s=>document.querySelector(s);
const saveKey=CAMPAIGN_SAVE_KEY,audioKey='sangoku-round-map-audio-v1';
const audio=createTitleUiAudio({storage:{getItem:key=>globalThis.localStorage.getItem(key)}});let navigating=false,returnFocus=null,opened=null,navigationTimer=null,pageHidden=false;
const bgm=createTitleBgm({settings:audio.settings,onStatus(value){const node=$('#bgm-status');if(node)node.textContent={WAITING_GESTURE:'BGM · 준비 중',STARTING:'BGM · 재생 시작 중',BLOCKED:'BGM · 화면을 클릭하거나 키를 누르면 재생',PLAYING:'BGM · 제작 초안 재생 중',MUTED:'BGM · 음소거',FAILED:'BGM 재생 불가 · 메뉴와 효과음은 이용할 수 있습니다',STOPPED:'BGM · 정지'}[value]??'';}});
document.addEventListener?.('pointerdown',e=>{if(e.isTrusted&&!navigating&&document.visibilityState!=='hidden')bgm.gesture();},{capture:true});
document.addEventListener?.('keydown',e=>{if(e.isTrusted&&!e.repeat&&!navigating&&document.visibilityState!=='hidden')bgm.gesture();},{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden'){bgm.deactivate();audio.deactivate();}else if(!navigating){reloadAudio();audio.activate();bgm.activate();}});
document.documentElement.style.setProperty('--title-background',`url("${TITLE_BACKGROUND.src}")`);
document.documentElement.style.setProperty('--title-menu-plaque',`url("${TITLE_MENU_PLAQUE.src}")`);
// 저장은 IndexedDB(압축) 또는 localStorage(save-store.mjs). IndexedDB 면 비동기라 마지막 결과(lastSaved)를 쓴다.
let lastSaved=null,hasStoredCampaign=false;
function refreshContinue(){
 const fail=(text='저장을 읽을 수 없습니다')=>{lastSaved=null;$('#continue-game').disabled=true;$('#continue-summary').textContent=typeof text==='string'?text:'저장을 읽을 수 없습니다';return null;};
 const apply=raw=>{hasStoredCampaign=!!raw;try{if(!raw)return fail('저장 없음');
  const saved=deserialize(raw);lastSaved=saved;$('#continue-game').disabled=false;$('#continue-summary').textContent=`${saved.turn}차례 · ${saved.currentDate}일 · ${saved.factions?.[saved.playerFactionId]?.name??saved.playerFactionId}`;return saved;}catch(error){let format=false;try{const x=JSON.parse(raw);format=!x||!x.state||/지원하지 않는/.test(error.message);}catch{format=true;}return fail(format?'저장 형식이 다름':'이 판과 호환 안 됨');}};
 try{const r=settle(loadText(saveKey),apply);if(r&&typeof r.catch==='function'){r.catch(fail);return lastSaved;}return r;}catch{return fail();}
}
function go(kind){if(navigating)return;if(kind==='continue'&&!refreshContinue()){$('#title-status').textContent='유효한 캠페인 저장을 찾지 못했습니다. 기존 저장은 보존했습니다.';return;}
 navigating=true;for(const id of ['new-game','continue-game','settings','guide'])$('#'+id).disabled=true;
 const cue=audio.play('start');bgm.deactivate();
 const navigate=()=>{navigationTimer=null;try{location.assign('/world?entry='+kind);}catch{navigating=false;bgm.activate();bgm.gesture();$('#new-game').disabled=false;$('#settings').disabled=false;$('#guide').disabled=false;refreshContinue();$('#title-status').textContent='게임 화면으로 이동하지 못했습니다. 다시 시도하세요.';}};
 // Preserve only a short attack; never wait for the entire musical cue.
 if(cue)navigationTimer=globalThis.setTimeout(navigate,24);else navigate();
}
function closeDialog(){if(!opened)return;opened.close();audio.play('close');opened=null;returnFocus?.focus();returnFocus=null;}
function openDialog(id,trigger,first){if(navigating||opened||trigger.disabled)return;returnFocus=trigger;opened=$('#'+id);opened.showModal();$('#'+first).focus();audio.play('open');}
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
$('#settings').addEventListener('click',()=>openDialog('settings-dialog',$('#settings'),'setting-mute'));
$('#guide').addEventListener('click',()=>openDialog('guide-dialog',$('#guide'),'guide-back'));
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

window.__titleMenuReady=true;
