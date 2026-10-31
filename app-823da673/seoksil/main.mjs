// C96 SC04 M1. 화면 수명과 저장만 소유한다.
import {createCampaign,step,serialize,deserialize,CAMPAIGN_SAVE_KEY} from '/src/campaign-runtime.mjs';
import {saveText,loadText} from '/src/save-store.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';
import {renderCouncil} from '/app/seoksil/screens/council.mjs';
import {mountMap,niche} from '/app/seoksil/screens/map.mjs';
const q=new URLSearchParams(location.search),root=document.getElementById('screen');
let state=null,dispose=()=>{},cutouts={},busts={},saved=null,approved=null;
try {const r=await fetch('/assets/officer-art/cutout/source.json');if(r.ok)cutouts=Object.fromEntries(Object.entries(await r.json()).map(([id,e])=>[id,e.file??`${id}.png`]));} catch {}
// 작은 자리(목독 홈·초상 고리·부대 카드)는 머리·어깨만 자른 그림(tools/design/bust-crops.py) — 없으면 전신을 확대해 쓴다
try {const r=await fetch('/assets/officer-art/bust/index.json');if(r.ok)busts=await r.json();} catch {}
const face=id=>cutouts[id]?`/assets/officer-art/cutout/${cutouts[id]}`:null;
const bust=id=>busts[id]?`/assets/officer-art/bust/${busts[id]}`:null;
const toast=text=>{const t=document.getElementById('toast');t.textContent=text;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.textContent='',3200);};
// world.js 에서 옮김: newCampaignSeed
function newCampaignSeed(){const fixed=Number(q.get('seed'));return Number.isSafeInteger(fixed)&&fixed>0?fixed:1+crypto.getRandomValues(new Uint32Array(1))[0]%2147483646;}
// world.js 에서 옮김: savedState / resume / applySaved / save 핸들러
async function readSaved(){const raw=await loadText(CAMPAIGN_SAVE_KEY);return raw?deserialize(raw):null;}
async function save(){try {await saveText(CAMPAIGN_SAVE_KEY,serialize(state));toast('단일 슬롯에 저장했습니다.');}catch {toast('저장하지 못했습니다.');}}
function dispatch(cmd){state=step(state,{...cmd,incremental:true});return state;}
function showMap(){dispose();document.onkeydown=null;dispose=mountMap(root,{state:()=>state,dispatch,face,bust,toast,save,home:showStart,council:showCouncil},approved);approved=null;}
function showCouncil(){
 dispose();dispose=()=>{};document.onkeydown=null;
 const before=new Set(state.council.resolutions.map(r=>r.proposalId));
 const ctx={state:()=>state,face,bust,toast,dispatch,onExit:()=>{approved=state.council.resolutions.filter(r=>!before.has(r.proposalId)).at(-1)?.target??null;showMap();}};
 renderCouncil(root,state,ctx);
 const observer=new MutationObserver(()=>{if(state.council.status==='CLOSED'){observer.disconnect();ctx.onExit();}});
 observer.observe(root,{childList:true,subtree:true});dispose=()=>observer.disconnect();
}
async function showStart(){
 dispose();dispose=()=>{};document.onkeydown=null;state=null;
 root.innerHTML='<section class="ss-stage sm-start"><h1 class="ss-scene-title">누구의 천하로 시작하는가</h1></section>';
 try {saved=await readSaved();}catch {saved=null;toast('저장을 읽을 수 없습니다. 기존 저장은 보존했습니다.');}
 const sample=createCampaign({factionId:'F02',seed:190919}),ids=['F01','F02','F03'];let picked='F02';
 const draw=()=>{
  // 석실 에셋 조립(2026-10-09): 뒤 = 고른 군주의 평정 장면(가로, 흐리게), 감실 = 돌 감실(A15) 안에 원화, 이름·단추 = 대나무 쪽(A12)
  root.innerHTML=`<section class="ss-stage sm-start sm-start2"><img class="sm-start2__court" src="/assets/seoksil/a2/council-scene-${picked}w.jpg" alt="" aria-hidden="true"><h1 class="sm-start2__title">누구의 천하로 시작하는가</h1><div class="sm-lords">${ids.map(fid=>{const id=sample.factions[fid].rulerId,name=sample.officers[id].name,src=face(id);return `<figure class="sm-lord2${fid===picked?' is-picked':''}"><button class="sm-lord" data-faction="${fid}" aria-label="${esc(name)}" aria-pressed="${fid===picked}"><span class="sm-lord2__window">${src?`<img src="${esc(src)}" alt="">`:''}</span><img class="sm-lord2__niche" src="/assets/seoksil/a4/niche.webp" alt=""></button><figcaption class="sm-slip"><b>${esc(name)}</b></figcaption></figure>`;}).join('')}</div><div class="sm-start2__acts"><button class="sm-slip sm-slip--btn" id="new-game">새 판</button>${saved?'<button class="sm-slip sm-slip--btn" id="continue">이어하기</button>':''}</div></section>`;
  root.querySelectorAll('[data-faction]').forEach(b=>b.onclick=()=>{picked=b.dataset.faction;draw();});
  root.querySelector('#new-game').onclick=()=>{state=createCampaign({factionId:picked,seed:newCampaignSeed()});showMap();};
  const b=root.querySelector('#continue');if(b)b.onclick=()=>{state=saved;showMap();};
 };draw();
}
if(['F01','F02','F03'].includes(q.get('f'))){state=createCampaign({factionId:q.get('f'),seed:newCampaignSeed()});q.delete('f');const query=q.toString();history.replaceState(null,'',location.pathname+(query?'?'+query:''));q.get('screen')==='council'?showCouncil():showMap();}else await showStart();
