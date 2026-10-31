import {v3View,resourceChipsV3,resourceDetailsV3} from './domestic-v3-ui.mjs';
export {particle,josa} from './korean-text.mjs';
import {displayKorean} from './korean-text.mjs';
import {TICKS_PER_TURN} from '../../src/first3.mjs';
import {ritualEnabled,setRitualEnabled} from './ritual-ui.mjs';
import {FACTION} from './troops.mjs';
/* C268 sym bundle BEGIN */
// C268 shared symbols. Index snapshot is verified against sym/index.json by test-style-c268.
export const SYM_FAMILIES = {"resources":["food","learning","production","renown","reserve","troops"],"global":["city","diplomacy","faction","help","map","officers","records","settings"],"actions":["attack","build","cancel","confirm","garrison","move","negotiate","next-turn","recruit","tactic","undo","wait"],"status":["done","formation-broken","formation-disordered","formation-ordered","locked","morale-broken","morale-shaken","morale-steady","ready","supply-cut","supply-full","supply-low"],"troops":["bow","cavalry","spear","sword"],"terrain":["coast","ferry","forest","mountain","plain","river","road","wall"],"lenses":["danger","faction","hide","move","supply","terrain"],"diplomacy":["alliance","friendly","hostile","negotiation","neutral","own"],"reports":["asleep","awaken","built","captured","envoy","event","lost","major-event"],"controls":["check","close","collapse","expand","info","next","prev","search","sort","warning"]};
const symEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function symUrl(family,name){
 if(!Object.hasOwn(SYM_FAMILIES,family)||!SYM_FAMILIES[family].includes(name)){console.warn(`[sym] Unknown icon: ${family}/${name}`);return null;}
 return `/assets/ui-kit/own/sym/${family}/${name}.webp`;
}
/** Decorative image next to a visible label, or labelled image for icon-only controls. */
export function symImg(family,name,{size='md',label='',paper=false,className=''}={}){
 const url=symUrl(family,name),step=['xs','sm','md','lg','xl'].includes(size)?size:'md';
 if(!url)return `<span class="sg-sym-fallback">${symEscape(label||name)}</span>`;
 const markup = `<img class="sg-sym sg-sym-${step}${paper?' sg-sym-paper':''}${className?' '+symEscape(className):''}" src="${url}" alt="${symEscape(label)}"${label?'':' aria-hidden="true"'}>`;
 return paper ? `<span class="sg-sym sg-sym-${step} sg-sym-mask" style="--sg-symbol:url('${url}')"${label?` role="img" aria-label="${symEscape(label)}"`:' aria-hidden="true"'}></span>` : markup;
}
/* C268 sym bundle END */
import abilityNames356 from '../../data/common-traits-v0.2.json' with {type:'json'};
// Presentation lookup only: never rewrite a runtime card, log, identifier or save.
const abilityNamesByOld356 = new Map(abilityNames356.nameCatalog.map(e=>[e.name,e]));
export function abilityName356(card){
 if(!card)return '';
 return card.nameShort || abilityNamesByOld356.get(card.name)?.nameShort || card.name || '';
}
export function abilityGloss356(card){
 if(!card)return '';
 const entry=abilityNamesByOld356.get(card.name),gloss=card.nameGloss||entry?.nameGloss;
 return [card.nameHanja||entry?.nameHanja,gloss?.split(' — ')[0],...(gloss?.startsWith(card.name)?[]:[card.name])].filter(Boolean).join(' · ');
}
// The draft renderer is outside C356's editable scope. Adapt only its ability labels.
const draftNameObservers356 = new WeakMap();
export function mountDraftNames356(host){
 if(!host || draftNameObservers356.has(host))return;
 const paint=()=>{
  for(const node of host.querySelectorAll('.od-shared-detail b,.c298-card-judgment,.od-benefit strong,.od-detail small')){
   const text=node.textContent.trim(),prefix=text.match(/^(고유 특기 · |고유 전법\(R\) · |시작 전법 · )/)?.[0]??'';
   const old=text.slice(prefix.length),entry=abilityNamesByOld356.get(old);
   if(entry&&entry.nameShort!==old){node.textContent=prefix+entry.nameShort;node.title=abilityGloss356(entry);}
  }
 };
 const observer=new MutationObserver(paint);observer.observe(host,{childList:true,subtree:true});
 draftNameObservers356.set(host,observer);paint();
}
import stratagemRules from '../../data/stratagems-v0.1.json' with {type:'json'};
import {troopText,troopDelta,TROOP_DISPLAY_SCALE} from '../../src/troop-display.mjs';
import {C20_FACILITIES,C20_POLICIES} from '../../src/campaign-policy.mjs';
import {SPECIAL_TROOPS} from '../../src/campaign-special-troops.mjs';
import diplomacyAxes from '../../../docs/design-data/diplomacy-axes-v0.1.json' with {type:'json'};
// 흑묵 지도 HUD — 기준 그림 final-map-v2 를 그대로 새로 짠 화면(2026-10-10, Claude · 사용자 "고치지 말고 새로 · 카드·단추는 에셋으로").
// 판·단추·깃발·아이콘은 모두 GPT 가 기준 그림에서 한 장씩 뽑아 그린 그림(/assets/ui-v3/hud/). 코드는 자리·글자·숫자·막대 길이만.
// 게임 처리는 옛 HUD(숨김)의 단추를 그대로 누른다 — 명령 코드는 한 곳(world.js)에만 있다.
export const worldDisplayText = value => displayKorean(value).replaceAll('과학','학문').replaceAll('출발 특전','깨어날 때 지닌 것').replace(/혼자\s+(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)\s*차례\s*충분/g,'휴대 군량 $1 차례')
 .replace(/사기 판정\s*(\d+(?:\.\d+)?)%/g,(_,n)=>`사기가 떨어질 수 있음(${chanceText462(Number(n)/100)})`)
 .replaceAll('전열 판정 없음','전열이 무너지지 않음').replace(/전열 (?:판정|손상)/g,'전열을 무너뜨림').replaceAll('사기 판정','사기가 떨어질 수 있음').replaceAll('판정','결과');
const esc = (s) => worldDisplayText(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function engineStatusMarkup(engine){
 if(!engine)return '';
 const slots=Array.from({length:engine.max},(_,i)=>i<engine.resource?'●':'○').join('');
 return `<span class="c230-engine" title="${esc(engine.judgment)}"><b>계통 ${esc(engine.name)}</b><small>${esc(engine.resourceName)} <span aria-label="${esc(engine.resourceName)} ${engine.resource}/${engine.max}">${slots}</span></small><small>2차 전직 ${engine.path?esc(engine.branchName):(engine.merits??[]).map(b=>`<span title="${esc(b.name)} · 실적 ${b.count}/${b.goal}">${esc(b.name)} ${'●'.repeat(Math.min(b.goal,b.count))}${'○'.repeat(Math.max(0,b.goal-b.count))}</span>`).join(' · ')}</small></span>`;
}
// C210: presentation preferences never enter campaign state or its save key.
export const FX_KEY='sangoku.fx.v1';
export const FX_OPTIONS={aiSpeed:[['normal','보통'],['fast','빠름'],['instant','즉시']],cutin:[['always','매번'],['first','그 전법 처음 한 번'],['off','끄기']],shake:[['on','켬'],['off','끔']],motion:[['system','운영체제 설정'],['on','움직임 줄이기 켬'],['off','움직임 줄이기 끔']]};
FX_OPTIONS.feel=[['off','끔'],['v1','켬']];
FX_OPTIONS.figures=[['off','끔'],['v1','켬']];
export const FX_DEFAULTS=Object.freeze({aiSpeed:'normal',cutin:'always',shake:'on',motion:'system',feel:'off',figures:'off'});
export const mapFeelEnabled=(search=globalThis.location?.search??'',prefs=fxPreferences.value)=>new URLSearchParams(search).get('ui')==='kit'||new URLSearchParams(search).get('feel')==='v1'||prefs.feel==='v1';
export function createFxPreferences({storage=()=>globalThis.localStorage,system=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches}={}){
 const normalize=raw=>Object.fromEntries(Object.entries(FX_DEFAULTS).map(([key,value])=>[key,FX_OPTIONS[key].some(([id])=>id===raw?.[key])?raw[key]:value]));
 let prefs={...FX_DEFAULTS};try{prefs=normalize(JSON.parse(storage()?.getItem(FX_KEY)??'null'));}catch{}
 return {get value(){return {...prefs};},reduced(){return prefs.motion==='system'?system():prefs.motion==='on';},shake(){return prefs.shake==='on'&&!this.reduced();},duration(ms,ai=false){return ai?Math.round(ms*({normal:1,fast:.3,instant:0}[prefs.aiSpeed])):ms;},
  update(patch){prefs=normalize({...prefs,...patch});try{storage()?.setItem(FX_KEY,JSON.stringify(prefs));return true;}catch{return false;}}};
}
export const fxPreferences=createFxPreferences();
// C282: device-only typography; map coordinates and artwork are untouched.
export const UI_SIZE_KEY='sangoku.ui-size.v1';
export const UI_SIZES=['90','100','115','125','130','150'];
let uiSize='100';
const uiTypeBase=new Map();
export function applyUiSize(value,doc=globalThis.document){
 uiSize=UI_SIZES.includes(String(value))?String(value):'100';
 const root=doc?.documentElement;if(!root?.style)return uiSize;
 const scale=Number(uiSize)/100;
 if(typeof getComputedStyle==='function'&&!uiTypeBase.size){const css=getComputedStyle(root);for(const key of css)if(key.startsWith('--sg-type-')){const n=parseFloat(css.getPropertyValue(key));if(Number.isFinite(n))uiTypeBase.set(key,n);}}
 root.style.fontSize=`${16*scale}px`;root.style.setProperty('--sg-ui-scale',String(scale));
 for(const [key,n] of uiTypeBase)root.style.setProperty(key,`${n*scale}px`);
 root.dataset.uiSize=uiSize;if(doc===globalThis.document&&root.dataset.ui==='kit')syncKitHudLayout290();return uiSize;
}
export function restoreUiSize(){try{return applyUiSize(globalThis.localStorage?.getItem(UI_SIZE_KEY));}catch{return applyUiSize('100');}}
export function saveUiSize(value){applyUiSize(value);try{globalThis.localStorage?.setItem(UI_SIZE_KEY,uiSize);return true;}catch{return false;}}
restoreUiSize();
globalThis.addEventListener?.('storage',e=>{if(e.key===UI_SIZE_KEY||e.key===null)restoreUiSize();});
export function segmentedSetting(key,label,options,value,attr='data-c210-fx'){
 return `<fieldset class="c261-row" ${attr}="${key}"><legend>${esc(label)}</legend><div class="c261-options">${options.map(([id,name])=>`<button type="button" class="k-btn" data-c261-value="${id}" aria-pressed="${value===id}">${esc(name)}</button>`).join('')}</div></fieldset>`;
}
export function fxSettingsHtml(prefs=fxPreferences.value){if(mapFeelEnabled())prefs={...prefs,feel:'v1'};return `<div class="c210-fx">${Object.entries(FX_OPTIONS).map(([key,options])=>segmentedSetting(key,{aiSpeed:'상대 차례 속도',cutin:'전법 컷인',shake:'화면 흔들림',motion:'움직임 줄이기',feel:'손맛: 지도 위(시험)',figures:'병사 낱개(시험)'}[key],options,prefs[key],key==='figures'?'data-c255-figures':'data-c210-fx')).join('')}<small data-c210-fx-status role="status">이 기기의 연출에만 적용됩니다</small></div>`;}
export function shouldShowTacticCutin(mode,seen,key){if(mode==='off'||mode==='first'&&seen.has(key))return false;seen.add(key);return true;}
// C261: one settings surface for the title and the world; preferences stay outside saves.
export const C261_PANEL_CSS=`
.c261-panel{pointer-events:auto;box-sizing:border-box;color:var(--sg-bone);background:var(--k-ink,var(--sg-ink));border:1px solid var(--sg-gold-line);font:var(--sg-type-ui)/1.6 var(--sg-font-ui);box-shadow:0 20px 80px #000c}
.c261-panel h1,.c261-panel h2,.c261-tabs button{font-family:var(--sg-font-title)}.c261-panel button{cursor:pointer;color:inherit;background:var(--sg-ink-raised);border:1px solid var(--sg-gold-line);font:var(--sg-type-ui) var(--sg-font-ui);border-radius:0}
.c261-panel button:focus-visible,.c261-panel input:focus-visible{outline:2px solid var(--sg-gold-name);outline-offset:3px}.c261-panel button[aria-pressed=true],.c261-tabs button[aria-selected=true]{background:var(--sg-seal)!important}
.c261-settings{position:fixed!important;left:50%!important;top:clamp(8px,25.740741dvh,calc(100dvh - 633px))!important;transform:translateX(-50%)!important;background:#101413!important;border:0!important;border-image:url("/assets/ui-kit/own/parts-v1/panel.webp") 22 fill / 14px / 0 stretch!important;box-shadow:0 18px 60px #000a!important;width:min(1041px,96vw)!important;height:min(625px,calc(100dvh - 16px))!important;max-height:none!important;padding:0!important;display:block!important;z-index:10020!important;overflow:hidden!important}
.c261-settings[hidden]{display:none!important}.c261-panel h1{font-size:var(--sg-type-h1);margin:0;text-align:left}.c261-settings-body{display:grid;grid-template-columns:220px minmax(0,1fr);gap:50px;min-height:0}.c261-tabs{display:flex;flex-direction:column;gap:var(--sg-space-1);overflow:auto}.c261-tabs button{height:48px;flex-shrink:0;text-align:left;padding:0 var(--sg-space-4);font:600 var(--sg-type-ui) var(--sg-font-title);border:0;border-left:4px solid transparent}.c261-tabs button[aria-selected=true]{border-left-color:var(--sg-seal)}.c261-tab-content{overflow:auto;min-width:0}.c261-tab-content>[hidden]{display:none!important}
.c261-row{box-sizing:border-box;position:relative;display:flex!important;align-items:center;justify-content:space-between;gap:var(--sg-space-4);min-height:56px;margin:0;padding:var(--sg-space-2) 0;border:0;border-bottom:1px solid #b9a46e33;font:var(--sg-type-ui) var(--sg-font-ui)}.c261-row legend{float:left;max-width:calc(100% - 296px);font:var(--sg-type-ui) var(--sg-font-ui);padding:0}.c261-options{display:flex;width:280px;flex-shrink:0;margin-left:auto}.c261-options button{flex:1;min-height:36px;padding:var(--sg-space-1);font-size:var(--sg-type-ui)}.c261-row input[type=range]{width:280px;height:6px;accent-color:var(--sg-gold-line)}.c261-row output{font-size:var(--sg-type-ui)}.c261-setting-desc{margin:0;font:var(--sg-type-ui)/1.6 var(--sg-font-ui);opacity:.8}.c261-setting-actions{display:flex;justify-content:flex-end;gap:var(--sg-space-3)}.c261-setting-actions button{width:160px;height:44px;font-size:var(--sg-type-ui)}.c261-primary{background:var(--sg-seal)!important}.c261-keys{border-collapse:collapse;width:100%;font:var(--sg-type-ui) var(--sg-font-ui)}.c261-keys tr{height:40px}.c261-keys th{text-align:left;font-weight:400}.c261-keys kbd{display:inline-block;min-width:36px;height:28px;border:1px solid var(--sg-gold-line);padding:3px var(--sg-space-2);box-sizing:border-box;text-align:center;font:var(--sg-type-ui)/20px var(--sg-font-ui)}
body:has(.c261-settings:not([hidden]))::after{content:'';position:fixed;inset:0;background:color-mix(in srgb,var(--sg-scrim-color) 22%,transparent);z-index:10010;pointer-events:auto}
dialog.c261-help:not([open]){display:none}.c261-help{width:min(1152px,96vw)!important;max-width:none!important;height:min(820px,94dvh);max-height:none!important;padding:31px!important;display:grid;grid-template-rows:44px minmax(0,1fr);gap:var(--sg-space-6);overflow:hidden!important}.c261-help header{display:flex;justify-content:space-between}.c261-help h1{font:700 var(--sg-type-h2) var(--sg-font-title)!important}.c261-help article h2{font:700 var(--sg-type-name) var(--sg-font-title)!important}.c261-settings h1{font:700 var(--sg-type-h1) var(--sg-font-title)!important}.c261-help header button{width:32px;height:32px}.c261-help-body{display:grid;grid-template-columns:300px minmax(0,1fr);gap:var(--sg-space-2);min-height:0}.c261-help-index{overflow:auto}.c261-help-index input{box-sizing:border-box;width:100%;height:40px;background:var(--sg-ink-raised);color:var(--sg-bone);border:1px solid var(--sg-gold-line);padding:var(--sg-space-2);font:var(--sg-type-ui) var(--sg-font-ui)}.c261-help-index button{display:block;width:100%;min-height:40px;text-align:left;border:0;border-left:4px solid transparent;background:none;font-size:var(--sg-type-ui);padding:6px var(--sg-space-3)}.c261-help-index button[aria-current=true]{border-left-color:var(--sg-seal);background:var(--sg-seal)}.c261-help-index small{display:block;color:var(--sg-gold-line);font-size:var(--sg-type-ui);letter-spacing:.08em;margin-top:var(--sg-space-3)}.c261-help article{overflow:auto;font:var(--sg-type-ui)/1.6 var(--sg-font-ui)}.c261-help article h2{font:700 var(--sg-type-name) var(--sg-font-title)}.c261-help article img{width:100%;height:260px;object-fit:contain;background:var(--sg-paper)}.c261-help article p{font:var(--sg-type-ui)/1.6 var(--sg-font-ui)}
@media(max-width:800px){.c261-settings{padding:20px!important}.c261-settings-body{grid-template-columns:140px 1fr;gap:var(--sg-space-4)}.c261-help-body{grid-template-columns:180px 1fr}.c261-row{flex-wrap:wrap}.c261-row legend{max-width:none}.c261-options{width:100%}}
.c261-tabs button[aria-selected=true]{background:var(--sg-paper)!important;color:var(--sg-ink)}.c261-help header button{width:48px;height:48px}.c261-help article p{font-size:var(--sg-type-body);line-height:var(--sg-line-body)}
/* C374: settings = GPT v4 (docs/cloud/mockup/screens-v4/settings). 1041x625 dialog at 1920x1080 (x440 y278); frames are parts-v1 images. */
.c261-settings h1{position:absolute;left:0;right:0;top:10px;margin:0;text-align:center;font:700 51px/60px var(--sg-font-title)!important;letter-spacing:.06em;color:#eee1c9;white-space:nowrap}
.c261-settings{--sg-font-title:'SG Serif','Hahmlet',serif}
.c261-settings h1::before,.c261-settings h1::after{content:'';display:inline-block;vertical-align:middle;width:70px;height:24px;margin:0 16px 0 10px;background:url("/assets/ui-kit/own/screens-v4/settings/ornament-left.webp") center/contain no-repeat;opacity:1}
.c261-settings h1::after{margin:0 10px 0 16px;background-image:url("/assets/ui-kit/own/screens-v4/settings/ornament-right.webp")}
.c261-settings .c261-settings-body{position:absolute;left:36px;top:70px;right:43px;bottom:118px;display:grid;grid-template-columns:182px minmax(0,1fr);gap:42px;min-height:0}
.c261-settings .c261-tabs{height:400px;max-height:100%;box-sizing:border-box;gap:0;padding:0;border:0;border-image:url("/assets/ui-kit/own/parts-v1/panel.webp") 22 / 8px / 0 stretch!important;overflow:auto}
.c261-settings .c261-tabs button{flex:1 1 82.5px;height:auto;min-height:56px;margin:0 18px;padding:0 10px;text-align:left;font:500 25px/1 var(--sg-font-title)!important;color:#ddd7c7;background:transparent!important;border:0!important;border-bottom:1px solid #6a5a46!important;border-radius:0}
.c261-settings .c261-tabs button:last-child{border-bottom:0!important}
.c261-settings .c261-tabs button:first-child{flex:0 0 70px}
.c261-settings .c261-tabs button[aria-selected=true]{margin:0;padding:0 28px;color:#f3e9e4;background:linear-gradient(180deg,#6e1a14,#4c0f0b)!important;border-bottom:0!important;border-image:url("/assets/ui-kit/own/parts-v1/button-normal.webp") 22 / 7px / 0 stretch!important}
.c261-settings .c261-tab-content{padding-top:18px}
.c261-settings .c261-row{min-height:86px;margin:0 0 50px;padding:0 24px 0 21px;border:0!important;border-image:url("/assets/ui-kit/own/parts-v1/panel.webp") 22 fill / 8px / 0 stretch!important;font:500 25px/1.2 var(--sg-font-title)!important;color:#dfdcd0}
.c261-settings fieldset.c261-row{min-height:0;padding:18px 24px 19px 21px}
.c261-settings [data-c261-page]>.c261-row:last-child,.c261-settings .c210-fx>.c261-row{margin-bottom:16px}
.c261-settings [data-c261-page="0"]>.c261-row{margin-bottom:50px}
.c261-settings [data-c261-page="0"] label.c261-row{min-height:97px;padding-right:31px;padding-bottom:10px}
.c261-settings .c261-row legend{float:left;max-width:calc(100% - 340px);font:inherit;padding:0}
.c261-settings .c261-options{width:323px;height:49px;box-sizing:border-box;border:0;border-image:url("/assets/ui-kit/own/parts-v1/button-normal.webp") 22 fill / 6px / 0 stretch!important}
.c261-settings .c261-options button{height:49px;min-height:49px;padding:0 4px 2px;font:500 20px/1 var(--sg-font-title)!important;color:#c4beaf;background:transparent!important;border:0!important}
.c261-settings .c261-options button[aria-pressed=true]{color:#f0e6e1;background:linear-gradient(180deg,#5c1712,#3a0e0b)!important;border-image:url("/assets/ui-kit/own/parts-v1/button-normal.webp") 22 / 6px / 0 stretch!important}
.c261-settings label.c261-row>span{display:flex;align-items:center;gap:36px}
.c261-settings .c261-row input[type=range]{width:422px;height:30px;margin:0;-webkit-appearance:none;appearance:none;background:transparent;accent-color:#c59a5c}
.c261-settings .c261-row input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#c59a5c 0 var(--p,15%),#37352f var(--p,15%))}
.c261-settings .c261-row input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#c59a5c 0 var(--p,15%),#37352f var(--p,15%))}
.c261-settings .c261-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:32px;height:32px;margin-top:-13px;border-radius:50%;background:radial-gradient(circle,#e9cc93 0 26%,#9b7542 28% 40%,#d8b479 42% 60%,#5e4426 63%);box-shadow:0 2px 6px #000c}
.c261-settings .c261-row input[type=range]::-moz-range-thumb{width:32px;height:32px;border:0;border-radius:50%;background:radial-gradient(circle,#e9cc93 0 26%,#9b7542 28% 40%,#d8b479 42% 60%,#5e4426 63%)}
.c261-settings .c261-row output{width:37px;display:flex;justify-content:flex-end;white-space:nowrap;font:500 18.5px/1 var(--sg-font-title)!important;color:#d3cfc3}
.c261-settings .c261-keys{font:500 18px var(--sg-font-ui)}
:root body .c261-settings.c261-settings.c261-panel.c261-panel{background:#101413!important;border:0!important;border-image:url("/assets/ui-kit/own/parts-v1/panel.webp") 22 fill / 14px / 0 stretch!important;box-shadow:0 18px 60px #000a!important;color:#ece4d3}
:root body .c261-settings.c261-settings.c261-panel::before{content:''!important;position:absolute!important;inset:auto 40px 107px 37px!important;height:1px!important;z-index:0!important;background:linear-gradient(90deg,#6a5a46,#6a5a46cc 80%,#6a5a4666)!important;pointer-events:none}
.c261-settings .k-btn::before,.c261-settings .k-btn::after{content:none!important;display:none!important}
.c261-settings .c261-setting-actions .c268-control-symbol{display:none!important}
body:has(.c261-settings:not([hidden])) #title-menu{visibility:hidden}
.c261-settings .c261-setting-desc{position:absolute;left:42px;right:510px;bottom:49px;margin:0;font:400 18.5px/26px var(--sg-font-ui);color:#938d7f;opacity:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c261-settings .c261-setting-actions{position:absolute;right:42px;bottom:38px;display:flex;gap:24px}
.c261-settings .c261-setting-actions small{display:none}
.c261-settings .c261-setting-actions button{width:223px;height:52px;padding:0 0 2px;font:600 21px/1 var(--sg-font-title)!important;color:#dfddd4!important;background:#101514!important;border:0!important;border-image:url("/assets/ui-kit/own/parts-v1/button-normal.webp") 22 fill / 7px / 0 stretch!important}
.c261-settings .c261-setting-actions .c261-primary{width:222px;background:linear-gradient(180deg,#6e1d17,#4b1411)!important;border-image:url("/assets/ui-kit/own/parts-v1/button-normal.webp") 22 / 7px / 0 stretch!important}
.c261-settings :is(.c261-setting-actions button,.c261-options button,.c261-tabs button):hover{filter:brightness(1.15)}
@media(max-width:800px){.c261-settings .c261-settings-body{grid-template-columns:140px 1fr;gap:16px;left:16px;right:16px}.c261-settings .c261-tabs button{font-size:18px!important}.c261-settings .c261-row legend{max-width:none}.c261-settings .c261-options{width:100%}.c261-settings label.c261-row>span{gap:12px}.c261-settings .c261-row input[type=range]{width:min(422px,48vw)}.c261-settings .c261-setting-desc{right:16px;bottom:100px}}

`;
export function installC261Style(doc=document){if(doc.querySelector('#c261-panel-style'))return;const style=doc.createElement('style');style.id='c261-panel-style';style.textContent=C261_PANEL_CSS;doc.head.append(style);}
export function saveSlotSummary(saved,date,stamp){
 const ruler=saved.factions?.[saved.playerFactionId]?.rulerId;
 const ms=Number(stamp),when=new Date(ms),time=Number.isFinite(ms)&&ms>0&&Number.isFinite(when.getTime())?new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(when):'시각 정보 없음';
 return `${saved.officers?.[ruler]?.name??saved.factions?.[saved.playerFactionId]?.name??saved.playerFactionId} · ${String(date).replace(/^\d+턴\s*·\s*/,'')} · ${saved.turn}차례 · 저장 ${time}`;
}
export function mountSettingsPanel(host,{close=()=>{host.hidden=true;document.querySelector('[data-band-settings]')?.setAttribute('aria-expanded','false');document.querySelector('[data-band-settings]')?.focus();},soundChanged=()=>document.dispatchEvent(new CustomEvent('ink:audio-settings'))}={}){
 host._c261Controller?.abort();host._c261Controller=new AbortController();const signal=host._c261Controller.signal;
 installC261Style();host.classList.add('c261-panel','c261-settings','k-panel-ink');host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','설정');
 let audio={muted:false,volume:.15};try{audio={...audio,...JSON.parse(localStorage.getItem('sangoku-round-map-audio-v1')??'{}')};}catch{}
 const sound=()=>`${segmentedSetting('muted','BGM·효과음',[['off','켬'],['on','끔']],audio.muted?'on':'off','data-c261-audio')}<label class="c261-row">통합 음량 <span><input data-c261-volume aria-label="BGM·효과음 음량" type="range" min="0" max="1" step=".05" value="${audio.volume}" style="--p:${Math.round(audio.volume*100)}%"> <output>${Math.round(audio.volume*100)}%</output></span></label>`;
 host.innerHTML=`<h1>설정</h1><div class="c261-settings-body"><nav class="c261-tabs" role="tablist" aria-label="설정 분류">${['소리','화면·연출','안내','조작','시험'].map((name,i)=>`<button role="tab" data-c261-tab="${i}" aria-selected="${i===0}">${name}</button>`).join('')}</nav><div class="c261-tab-content"><section data-c261-page="0">${sound()}</section><section data-c261-page="1" hidden>${fxSettingsHtml()}</section><section data-c261-page="2" hidden><div class="c261-card-settings"></div></section><section data-c261-page="3" hidden><table class="c261-keys">${[['병종 기술','Q'],['계통 엔진','W'],['전법','E'],['고유 전법','R'],['이동','M'],['공격','A'],['정면','F'],['방어','B'],['재정비','S'],['복귀','G'],['대기','H'],['다음 부대','N'],['다음 차례','Enter'],['닫기 · 취소','Esc'],['여러 부대 선택','Shift + 끌기'],['지도 이동','끌기'],['지도 확대 · 축소','휠']].map(([name,key])=>`<tr><th>${name}</th><td><kbd>${key}</kbd></td></tr>`).join('')}</table></section><section data-c261-page="4" hidden></section></div></div><p class="c261-setting-desc" role="status">이 기기의 소리와 연출에만 적용됩니다.</p><footer class="c261-setting-actions"><small>v0.x 시험판</small><button data-c261-reset>이 탭 기본값</button><button class="c261-primary" data-c261-close>닫기</button></footer>`;
 for(const row of host.querySelectorAll('[data-c210-fx="feel"],[data-c255-figures]'))host.querySelector('[data-c261-page="4"]').append(row);
 host.querySelector('[data-c261-page="4"]').insertAdjacentHTML('beforeend',segmentedSetting('ui','판 모양',[['default','옛 기본'],['l0','정제판'],['kit','키트']],document.documentElement.dataset.ui??'kit','data-c261-ui'));
 host.querySelector('[data-c261-page="1"]').insertAdjacentHTML('beforeend',segmentedSetting('ritual','의식 카드',[['v1','켬'],['off','끔']],ritualEnabled()?'v1':'off','data-c273-ritual'));
 host.querySelector('[data-c261-page="1"]').insertAdjacentHTML('afterbegin',segmentedSetting('size','UI 크기',UI_SIZES.filter(n=>document.documentElement.dataset.ui==='kit'||!['125','150'].includes(n)).map(n=>[n,n+'%']),uiSize,'data-c282-size'));
 // C285 지명 켬/끔 — map-v3 가 이 모듈을 가져오므로 순환 import 대신 사건으로 world.js 가 붙인다
 globalThis.document?.dispatchEvent(new CustomEvent('ink:settings-mounted',{detail:host.querySelector('[data-c261-page="1"]')}));
 let cardPrefs={rules:true,reports:true};try{cardPrefs={...cardPrefs,...JSON.parse(localStorage.getItem('sg.inkCards.preferences.v1')??'{}')};}catch{}
 host.querySelector('.c261-card-settings').innerHTML=[['rules','처음 보는 규칙 카드'],['reports','보고 카드']].map(([key,label])=>segmentedSetting(key,label,[['on','켬'],['off','끔']],cardPrefs[key]?'on':'off','data-c254-setting')).join('');
 const saveSound=()=>{try{localStorage.setItem('sangoku-round-map-audio-v1',JSON.stringify(audio));soundChanged();}catch{host.querySelector('.c261-setting-desc').textContent='이 기기에 설정을 저장할 수 없습니다.';}};
 host.addEventListener('input',e=>{if(!e.target.matches('[data-c261-volume]'))return;audio.volume=Number(e.target.value);e.target.style.setProperty('--p',Math.round(audio.volume*100)+'%');host.querySelector('output').textContent=Math.round(audio.volume*100)+'%';saveSound();},{signal});
 host.addEventListener('click',e=>{
  const tab=e.target.closest('[data-c261-tab]');if(tab){for(const b of host.querySelectorAll('[data-c261-tab]'))b.setAttribute('aria-selected',String(b===tab));for(const p of host.querySelectorAll('[data-c261-page]'))p.hidden=p.dataset.c261Page!==tab.dataset.c261Tab;}
  if(e.target.closest('[data-c261-close]'))close();
  if(e.target.closest('[data-c261-reset]')){
   const tab=host.querySelector('[data-c261-tab][aria-selected="true"]').dataset.c261Tab;
   if(tab==='0'){audio={muted:false,volume:.15};saveSound();host.querySelector('[data-c261-page="0"]').innerHTML=sound();}
   if(tab==='1'||tab==='4'){const keys=tab==='1'?['aiSpeed','cutin','shake','motion']:['feel','figures'];fxPreferences.update(Object.fromEntries(keys.map(k=>[k,FX_DEFAULTS[k]])));document.dispatchEvent(new CustomEvent('ink:fx-settings'));}
   if(tab==='2'){const defaults={rules:true,reports:true};try{localStorage.setItem('sg.inkCards.preferences.v1',JSON.stringify(defaults));cardPrefs=defaults;document.dispatchEvent(new CustomEvent('ink:card-settings'));}catch{host.querySelector('.c261-setting-desc').textContent='이 기기에 설정을 저장할 수 없습니다.';return;}}
   if(tab==='1'){setRitualEnabled(true);saveUiSize('100');}
   if(tab==='4'){setUiMode('kit');const hud=document.querySelector('#ink-hud');if(hud)syncKitHud(hud);}
   for(const row of host.querySelectorAll('fieldset')){let value;if(row.hasAttribute('data-c282-size'))value=uiSize;if(row.hasAttribute('data-c273-ritual'))value=ritualEnabled()?'v1':'off';if(row.dataset.c210Fx||row.dataset.c255Figures)value=fxPreferences.value[row.dataset.c210Fx??row.dataset.c255Figures];if(row.dataset.c254Setting)value=cardPrefs[row.dataset.c254Setting]?'on':'off';if(row.hasAttribute('data-c261-ui'))value=document.documentElement.dataset.ui;if(row.hasAttribute('data-c261-audio'))value=audio.muted?'on':'off';for(const b of row.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.c261Value===value));}
   host.querySelector('.c261-setting-desc').textContent='현재 탭의 기본값을 적용했습니다.';return;
  }
  const b=e.target.closest('[data-c261-value]');if(!b)return;const row=b.closest('fieldset');for(const btn of row.querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn===b));
  if(row.hasAttribute('data-c282-size')&&!saveUiSize(b.dataset.c261Value))host.querySelector('.c261-setting-desc').textContent='이 기기에 설정을 저장할 수 없습니다.';
  if(row.hasAttribute('data-c261-audio')){audio.muted=b.dataset.c261Value==='on';saveSound();}
  const key=row.dataset.c210Fx??row.dataset.c255Figures;if(key){if(['feel','figures'].includes(key)){const url=new URL(location.href);url.searchParams.delete(key);history.replaceState(null,'',url);}if(!fxPreferences.update({[key]:b.dataset.c261Value}))host.querySelector('.c261-setting-desc').textContent='이 기기에 설정을 저장할 수 없습니다.';document.dispatchEvent(new CustomEvent('ink:fx-settings'));}
  if(row.dataset.c254Setting){cardPrefs[row.dataset.c254Setting]=b.dataset.c261Value==='on';try{localStorage.setItem('sg.inkCards.preferences.v1',JSON.stringify(cardPrefs));}catch{host.querySelector('.c261-setting-desc').textContent='이 기기에 설정을 저장할 수 없습니다.';}document.dispatchEvent(new CustomEvent('ink:card-settings'));}
  if(row.hasAttribute('data-c273-ritual'))setRitualEnabled(b.dataset.c261Value==='v1');
  if(row.hasAttribute('data-c261-ui')){setUiMode(b.dataset.c261Value);const hud=document.querySelector('#ink-hud');if(hud)syncKitHud(hud);}
 },{signal});
 const explain=e=>{const row=e.target.closest('.c261-row');if(row)host.querySelector('.c261-setting-desc').textContent=(row.querySelector('legend')?.textContent??'음량')+' · 고른 값은 이 기기에 저장됩니다.';};host.addEventListener('focusin',explain,{signal});host.addEventListener('pointerover',explain,{signal});
 document.addEventListener('keydown',e=>{if(host.hidden)return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const buttons=[...host.querySelectorAll('button,input')].filter(n=>!n.disabled&&!n.closest('[hidden]'));if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0]?.focus();}}},{capture:true,signal});
}
export function helpSummary(html){const text=String(html).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();return esc(text.split(/(?<=[.!?。])\s/)[0]);}
export function cityReinforcementRows(c,v){return (c.nextReinforcements??[]).map(r=>`<p class="c282-reinforcement">${esc(v.officers?.[v.ownArmies?.[r.armyId]?.commanderId]?.name??r.armyId)} 부대 ${troopDelta(r.count)}</p>`).join('');}
export function mountHelpPanel(panel,entries,close){
 installC261Style();panel.classList.add('c261-help','c261-panel','k-panel-ink');panel.innerHTML=`<header><h1>도움말</h1><button aria-label="도움말 닫기">✕</button></header><div class="c261-help-body"><nav class="c261-help-index" aria-label="도움말 목차"><input type="search" aria-label="규칙 검색" placeholder="규칙 · 용어 검색"><div></div></nav><article aria-live="polite"></article></div>`;
 const show=i=>{const entry=entries[i];panel.querySelector('article').innerHTML=`${entry.art?`<img src="/assets/ui-v3/rule-cards/rule-${entry.art}.webp" alt="${esc(entry.name)} 설명 그림">`:''}<h2>${esc(entry.name)}</h2><p class="c282-help-summary">${helpSummary(entry.html)}</p><details><summary>자세히 보기</summary><p>${entry.html.replace(/<\/?p[^>]*>/g,' ').replace(/<br\s*\/?>/g,' ')}</p></details>`;for(const b of panel.querySelectorAll('[data-c261-entry]'))b.setAttribute('aria-current',String(Number(b.dataset.c261Entry)===i));};
 const index=()=>{const q=panel.querySelector('input').value.trim();let group='';panel.querySelector('.c261-help-index div').innerHTML=entries.map((e,i)=>{if(!e.name.includes(q)&&!e.html.includes(q))return '';const next=e.art?'그림으로 보는 규칙':i<8?e.name:'용어';const heading=next!==group?`<small>${esc(next)}</small>`:'';group=next;return `${heading}<button data-c261-entry="${i}">${esc(e.name)}</button>`;}).join('')||'<p>찾은 항목이 없습니다.</p>';};index();show(0);
 panel.querySelector('input').addEventListener('input',index);panel.querySelector('header button').onclick=close;panel.addEventListener('click',e=>{const b=e.target.closest('[data-c261-entry]');if(b)show(Number(b.dataset.c261Entry));});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'){const controls=[...panel.querySelectorAll('button,input')];if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}}},true);
}
export function factionOpeningLine(factionId){return [Object.values(C20_FACILITIES).find(f=>f.factionId===factionId)?.name,C20_POLICIES[factionId]?.name,Object.values(SPECIAL_TROOPS).filter(t=>t.factionId===factionId).map(t=>t.name).join('/')].filter(Boolean).join(' · ');}
// 생산을 정해야 하는 성인가(웹 cityProductionBadge · 고도 hud-model 공통 — 한 규칙): 지금 생산이 없고, 지금 고를 수 있는 작업이 하나라도 있을 때만.
// 고를 작업이 0개인 작은 성(시설칸 없음 · 작은 성 불가 · 다른 세력 고유 …)은 '쉼' — 다음 차례를 막지 않는다(닷토리 플레이테스트 P0 10-26 · 거록 T6 · 평원 T4).
// 징병 · 재편은 성 창에서 장수 · 병종을 골라야 하는 작업이라 빠른 선택 후보로 치지 않는다(웹 생산 팝업과 같음).
export const CITY_WINDOW_JOBS=['muster','reorganize'];
export function cityPickableJobs(c){return (c?.jobs??[]).filter(j=>!j.blockedReason&&!CITY_WINDOW_JOBS.includes(j.kind));}
export function cityProductionIdle(c){return !!c?.jobs&&!c.currentProduction&&cityPickableJobs(c).length>0;}
export function factionFacilityTodo(v){
 if(v.turn<1||v.turn>3||v.gameResult||!v.policy)return null;
 const entry=Object.entries(C20_FACILITIES).find(([,f])=>f.factionId===v.factionId);if(!entry)return null;const [kind,facility]=entry,cities=Object.values(v.ownCities??{});
 if(cities.some(c=>(c.facilities??[]).some(f=>f.kind===kind)||c.currentProduction?.kind===kind||c.nextProduction?.kind===kind))return null;
 const c=cities.find(c=>c.jobs?.some(j=>j.kind===kind&&!j.blockedReason)&&(!c.facilitySites?.[kind]||c.facilitySites[kind].tileId));
 return c?{cityId:c.cityId,kind,text:`${facility.name} 짓기 · ${c.name} 생산으로`}:null;
}
export function cityCaptureThreatText(v,cityId){const c=v.knowledge?.cities?.[cityId],now=v.diplomacy?.me?.threat;if(!c||c.ownerFactionId===v.factionId||!Number.isFinite(now))return '';const rules=diplomacyAxes.threat,gain=rules.gain[c.kind==='major'?'majorCity':'minorCity'],after=Math.max(rules.range[0],Math.min(rules.range[1],now+gain));return `점령하면 우리 위협 +${gain} → ${after} (${rules.coalitionAt} 이상이면 견제 동맹)`;}
export function cityCaptureThreatHtml(v,cityId){const text=cityCaptureThreatText(v,cityId);return text?`<p class="fc-threat">${esc(text)}</p>`:'';}
// C197: these helpers consume only the player event projection.
export function oathGoalText(o){return String(o.goalText??'').replace(/\{([^}]+)\}/g,(_,k)=>o.names?.[k]??k);}
export function oathBandHtml(oaths=[]){const active=oaths.filter(o=>o.status==='ACTIVE');if(!active.length)return '';const row=o=>`맹세: ${esc(oathGoalText(o))} — ${o.turnsLeft}차례 남음`;return active.length===1?`<p>${row(active[0])}</p>`:`<details><summary>${row(active[0])} · 외 ${active.length-1}건</summary>${active.slice(1).map(o=>`<p>${row(o)}</p>`).join('')}</details>`;}
export function twistHistoryHtml(twists=[],oaths=[]){return `<section class="c197-twists"><h3>비틀기 기록</h3>${twists.length?`<ol>${twists.map(t=>{const o=oaths.find(o=>o.eventId===t.eventId&&o.signedTurn===t.turn);return `<li>${t.turn}차례 · ${esc(t.title)} — 맹세 ${({SUCCESS:'성공',FAILED:'실패',UNFINISHED:'미완료',ACTIVE:'미완료'})[o?.status]??'미완료'}</li>`;}).join('')}</ol>`:'<p>이번 판에는 역사를 비틀지 않았습니다.</p>'}</section>`;}
export const EVENT_RECENT_KEY='samgukji.event-deck.previous-run.v1';
export function readRecentEventIds(storage){try{const ids=JSON.parse((storage??globalThis.localStorage).getItem(EVENT_RECENT_KEY)??'[]');return Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[];}catch{return [];}}
export function writeRecentEventIds(storage,seen){try{(storage??globalThis.localStorage).setItem(EVENT_RECENT_KEY,JSON.stringify(seen.map(e=>e.eventId)));}catch{/* Storage denial does not interrupt play. */}}
// C205: only public projections and the engine's already accumulated result cross this boundary.
export const LEGACY_KEY='sangoku.legacy.v1';
export function readCampaignLegacy(storage){
 const empty=()=>({unlocks:[],legacy:{runsFinished:0,ambitionsAchieved:[]}});
 try{const p=JSON.parse((storage??globalThis.localStorage).getItem(LEGACY_KEY)??'null');
  if(!p||!Array.isArray(p.unlocks)||!p.unlocks.every(id=>typeof id==='string')||!Number.isSafeInteger(p.legacy?.runsFinished)||p.legacy.runsFinished<0||!Array.isArray(p.legacy.ambitionsAchieved)||!p.legacy.ambitionsAchieved.every(id=>typeof id==='string'))return empty();
  return {unlocks:p.unlocks,legacy:p.legacy};
 }catch{return empty();}
}
export function writeCampaignLegacy(storage,result){
 if(!result?.legacy||!Array.isArray(result.unlocks))return false;
 try{const target=storage??globalThis.localStorage,previous=readCampaignLegacy(target);
  // Reopening a finished save neither increments nor rolls back a newer completed run.
  if(result.legacy.runsFinished<=previous.legacy.runsFinished)return false;
  target.setItem(LEGACY_KEY,JSON.stringify({unlocks:result.unlocks,legacy:result.legacy}));return true;
 }catch{return false;}
}
export function ambitionScreenOffer(v,deferred=false,phase='PLAYER'){
 if(v.gameResult||phase!=='PLAYER')return null;
 const a=v.ambition;if(!deferred&&a?.canChoose&&a.offered?.length)return {kind:'ambition',key:'ambition',title:'이번 생의 뜻',choices:a.offered,skipLabel:a.skipLabel};
 const o=v.orders?.offer;return o?.choices?.length?{kind:'order',key:`order.${o.turn}`,title:'이번 차례의 군령',choices:o.choices,skipLabel:o.skipLabel}:null;
}
export function ambitionArt(card,portraits={}){
 if(card.kind==='LAND')return [{src:LEVELUP_ASSETS.art.banner}];
 if(card.kind==='PERSON'||card.kind==='RECONCILE'){
  const ids=card.goal?.officers??[card.goal?.officer];
  const faces=ids.filter(Boolean).map(id=>portraits[id]).filter(Boolean).map(src=>({src,face:true}));
  if(faces.length)return faces;
  if(card.goal?.with){const seal=C190_SEALS[card.goal.with];if(seal)return [{src:C190_ART[seal.art]}];}
  return [{src:LEVELUP_ASSETS.art.seal}];
 }
 const category=({CAPTURE:'banner',DEFEAT:'halberd',HOLD:'seal',FOOD:'grain',RECRUIT:'slips',TACTIC:'slips',BUILD:'slips',JOINT:'crossbow',TRUCE:'seal',EXPLORE:'banner'})[card.id?.replace('ORD-','')]??'slips';
 return [{src:LEVELUP_ASSETS.art[category]}];
}
export function ambitionCardsHtml(offer,picked,portraits={},rewards={}){
 return offer.choices.map(c=>`<button type="button" class="c205-card${picked===c.id?' picked':''}" data-c205-pick="${esc(c.id)}" aria-pressed="${picked===c.id}"><span class="c205-card-art">${ambitionArt(c,portraits).map(p=>`<img src="${esc(p.src)}" alt=""${p.face?' class="person"':''}>`).join('')}</span><b>${esc(c.title)}</b><span class="c205-goal">${esc(c.goalText)}</span>${offer.kind==='order'?`<small class="c205-reward">${esc(rewards[c.reward]?.label??'')}</small>`:''}${picked===c.id?'<span class="c205-selected" aria-hidden="true">선택</span>':''}</button>`).join('');
}
export function ambitionBandHtml(v){
 const a=v.ambition,selected=a?.selected,status=s=>s==='ACHIEVED'?'이룸':s==='FAILED'?'닿지 못함':'진행 중';
 const ambition=selected?`<details data-c205-detail="${esc(selected.id)}" class="c205-${esc(selected.status.toLowerCase())}"><summary><span class="c236-goal-name">뜻 · ${esc(selected.title)}</span><span>${(selected.conditions??[]).filter(c=>c.met).length}/${(selected.conditions??[]).length} · ${v.turnLimit??'—'}차례까지</span><i>${status(selected.status)}</i></summary><ul>${(selected.conditions??[]).map(c=>`<li>${c.met?'✓':'✗'} ${esc(c.text)}</li>`).join('')}</ul></details>`:a?.canChoose&&a.offered?.length?`<button type="button" data-c205-reopen>이번 생의 뜻 고르기 · ${a.chooseUntilTurn}차례까지</button>`:'';
 return ambition+(v.orders?.history??[]).map(o=>`<details data-c205-detail="${esc(o.id)}.${o.signedTurn}" class="c205-${esc(o.status.toLowerCase())}"><summary><span class="c236-goal-name">군령 · ${esc(o.title)}</span><span>${o.progress.count}/${o.progress.target} · ${o.turnsLeft}차례</span><i>${status(o.status)}</i></summary><p>${esc(o.goalText)}</p><p>${esc(o.rewardLine??'')}${o.progress.violated?' · 유지 조건을 지키지 못했습니다.':''}</p></details>`).join('');
}
export function ambitionEndingHtml(result){
 if(!result)return '';
 const text=`${result.ambition?`<p class="c205-ending">${esc(result.ambition.endingLine)}</p>`:''}${result.unlocksEarned?.length?`<p class="c205-unlocks">${result.unlocksEarned.map(u=>`${u.recalled?'다시 떠오른 기억':'다음 판부터'}: ${esc(u.line)}`).join(' · ')}</p>`:''}`;
 return text?`<section class="c205-conclusion">${text}</section>`:'';
}
// C199: central U3 paths; SVG fallbacks remain available for missing optional slots.
export const C190_ART = Object.freeze({"tagAlly":"/assets/ui-v3/u3/map/tag-ally.png","tagAllied":"/assets/ui-v3/u3/map/tag-allied.png","tagEnemy":"/assets/ui-v3/u3/map/tag-enemy.png","statusSeal":"/assets/ui-v3/u3/map/status-seal.png","cityBand":"/assets/ui-v3/u3/map/city-band.png","barTrack":"/assets/ui-v3/u3/map/bar-track.png","barFill":"/assets/ui-v3/u3/map/bar-fill.png","panel":"/assets/ui-v3/u3/cityquick/panel.png","sealCao":"/assets/ui-v3/u3/cityquick/seal-cao.png","sealYuan":"/assets/ui-v3/u3/cityquick/seal-yuan.png","sealLiu":"/assets/ui-v3/u3/cityquick/seal-liu.png","sealSun":"/assets/ui-v3/u3/cityquick/seal-sun.png","btn":"/assets/ui-v3/u3/cityquick/btn.png","btnRed":"/assets/ui-v3/u3/cityquick/btn-red.png"});
export const C190_SEALS = Object.freeze({F01:{glyph:'曹',art:'sealCao'},F02:{glyph:'劉',art:'sealLiu'},F03:{glyph:'孫',art:'sealSun'},F04:{glyph:'袁',art:'sealYuan'}});
// WORK_TRIAL: the single detail boundary for both city and unit labels.
export const C190_DETAIL_ZOOM = 1.2;
export const mapLabelDetail = zoom => zoom < C190_DETAIL_ZOOM ? 'far' : 'near';
export const cityQuickIntent = (selectedArmyId,cityId) => cityId&&!selectedArmyId?'quick':'command';
export function cityPublicReadout(v,cityId,badge=null){
 const own=v.ownCities?.[cityId],c=own??v.knowledge?.cities?.[cityId];if(!c)return null;
 const visible=v.knowledge?.tiles?.[c.tileId]==='VISIBLE',tiles=new Set([c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])]);
 const guards=Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.factionId===c.ownerFactionId&&tiles.has(a.tileId)&&v.knowledge.tiles[a.tileId]==='VISIBLE'&&Number.isFinite(a.troopCount));
 const troops=own?(own.reserveTroops??0)+Object.values(own.specialReserves??{}).reduce((n,count)=>n+count,0):visible&&guards.length?guards.reduce((n,a)=>n+a.troopCount,0):null;
 return {id:cityId,name:c.name,factionId:c.ownerFactionId,own:!!own,remembered:!own&&!visible,defense:c.durability,defenseMax:c.durabilityMax,troops,
  governor:own&&v.officers?.[own.governorId]?{id:own.governorId,name:v.officers[own.governorId].name}:null,
  food:own?own.foodStock:null,foodCapacity:own?own.foodCapacity:null,production:own?own.economyForecast?.production:null,policy:own?own.policyName:null,security:own?own.securityName:null,
  guardMaximum:own?c.guardMaximum:null,nextReinforcements:own?c.nextReinforcements:[],
  stratagemText:c.stratagemText,stratagemReason:own?(v.stratagems?.some(o=>o.cityId===cityId&&o.choices.length)?null:'보이는 대상 없음 · 장수 대기 또는 범위 밖'):null,besieged:!!c.besieged,siegeTurns:Number.isFinite(c.siegeTurns)?c.siegeTurns:null,badge:own?badge:null};
}
export const citySiegeText = c => c.besieged?`포위${Number.isFinite(c.siegeTurns)?` ${c.siegeTurns}차례`:''}`:'포위되지 않음';
export const recruitmentReasonHtml = quote => `<small class="c192-recruit-reason">인망 ${esc(quote.cost)} · ${esc(quote.reason)}</small>`;
export const captivePreviewHtml = preview => `<small class="c192-captive-preview">${preview.lines.map(esc).join('<br>')}</small>`;
export function relationSceneHtml(scene){
 return `<div class="c207-scene-scroll"><p class="c192-scene-title">${esc(scene.title)}</p>${scene.lines.map((line,i)=>`<p class="c192-scene-line"><b>${esc(scene.officers[i%2].name)}</b> ${esc(line)}</p>`).join('')}</div><button class="btn primary" aria-label="다음 장면" data-relation-next>다음<span aria-hidden="true"> ▶</span></button>`;
}
export function reinforcementText(forecast,cities={}){return `다음 차례 자동 충원 ${troopDelta(forecast?.count??0)}${forecast?.sources?.length?` (${forecast.sources.map(r=>`${cities[r.cityId]?.name??r.cityId}에서 ${troopDelta(r.count)}`).join(' · ')})`:''}`;}
export function cityReinforcementText(c){return `다음 차례 충원 ${troopDelta((c.nextReinforcements??[]).reduce((n,r)=>n+r.count,0))} · 이 성에서 부대로`;}
export const cityProductionText = b => !b?'생산 정보 없음':b.idle?'놀고 있음':`${b.name??'생산'} · ${b.turns??'—'}차례`;
export function cityQuickHtml(c,{kit=false}={}){
 if(kit)return kitCityQuickHtml(c);
 const seal=C190_SEALS[c.factionId],art=seal&&C190_ART[seal.art],num=n=>Number.isFinite(n)?Math.round(n):'?';
 const bar=(label,value,max,text)=>`<div class="cq-meter"><span>${label} <b>${esc(text)}</b></span><i><s style="width:${Number.isFinite(value)&&max>0?Math.max(0,Math.min(100,value/max*100)):0}%"></s></i></div>`;
 return `<header><h2>${esc(c.name)}</h2>${c.own?`<button data-stratagem-quick ${c.stratagemReason?'disabled':''} title="${esc(c.stratagemReason??'성에 있는 장수의 주 행동')}">계략</button><button class="c216-reserve-quick" data-reserve-transfer="${esc(c.id)}" title="이 성 예비병을 내 다른 성으로 옮긴다">병력 이송</button>`:''}<span class="cq-seal" aria-label="세력 ${esc(seal?.glyph??'中')}">${art?`<img src="${esc(art)}" alt="${seal.glyph}">`:esc(seal?.glyph??'中')}</span></header>`
  +(c.stratagemText?`<p class="c226-effect">${esc(c.stratagemText)}</p>`:'')
  +bar('성벽',c.defense,c.defenseMax,`${num(c.defense)}/${num(c.defenseMax)}`)
  +bar(c.own?'수비':'보이는 수비',c.troops,c.own?c.guardMaximum:null,Number.isFinite(c.troops)?`${troopText(c.troops)}${c.own&&Number.isFinite(c.guardMaximum)?`/${troopText(c.guardMaximum)}`:''}`:'?')
  +(c.own?`<p class="cq-production${c.badge?.idle?' idle':''}">${c.badge?.idle?'●':'⚒'} ${esc(cityProductionText(c.badge))}</p><nav aria-label="성 빠른 명령"><button data-city-quick-action="sortie">출진</button><button data-city-quick-action="production">생산</button><button data-city-quick-action="office">내정</button><button data-city-quick-action="enter">들어가기</button></nav>`:`<p class="cq-siege">${citySiegeText(c)}</p><p class="cq-hint">공격하려면 부대를 고르세요${c.remembered?' · 기억한 정보':''}</p>`);
}
function kitCityQuickHtml(c){
 const seal=C190_SEALS[c.factionId],art=seal&&C190_ART[seal.art],num=n=>Number.isFinite(n)?Math.round(n):'?';
 const cell=(label,value)=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
 const face=c.governor?.face;
 return `<header><div class="c290-city-identity"><h2>${esc(c.name)}</h2><span class="cq-seal">${art?`<img src="${esc(art)}" alt="${esc(seal.glyph)}">`:esc(seal?.glyph??'中')}</span></div>${c.own?`<div class="c290-governor">${face?`<img src="${esc(face)}" alt="${esc(c.governor.name)}">`:'<span class="c290-governor-empty">태수</span>'}<div><small>태수</small><b>${esc(c.governor?.name??'공석')}</b><small>${esc(c.security??'')} · ${esc(c.policy??'')}</small></div></div>`:''}</header><div class="c258-quick-stats">${cell('성벽',`${num(c.defense)}/${num(c.defenseMax)}`)}${cell(c.own?'수비 / 예비':'보이는 수비',Number.isFinite(c.troops)?troopText(c.troops):'?')}${c.own?cell('군량',`${num(c.food)} / ${num(c.foodCapacity)}`)+cell('생산 / 차례',Number.isFinite(c.production)?'+'+num(c.production):'—'):''}</div>${c.own?`<nav aria-label="성 빠른 명령"><button class="k-btn-primary" data-city-quick-action="sortie">출진</button><button class="k-btn" data-city-quick-action="production">생산</button><button class="k-btn" data-city-quick-action="office">내정</button><button class="k-btn" data-stratagem-quick ${c.stratagemReason?'disabled':''} title="${esc(c.stratagemReason??'성 장수의 계략')}">계략</button><button class="k-btn" data-city-quick-action="enter">성 보기</button><button class="k-btn" data-reserve-transfer="${esc(c.id)}" title="이 성 예비병을 내 다른 성으로 옮긴다">병력 이송</button></nav><p class="c290-city-task"><b>생산</b> ${esc(cityProductionText(c.badge))}<span>할 일 · ${esc(c.badge?.idle?'생산할 일을 고르세요':c.besieged?citySiegeText(c):cityReinforcementText(c))}</span></p>`:`<p class="c290-city-task">${esc(citySiegeText(c))} · ${c.remembered?'기억한 정보 · ':''}공격하려면 부대를 고르세요</p>`}`;
}
// Prefer either side without covering the visible castle; clamp inside the viewport.
export function cityQuickPlacement(r,width,height,avoid=[],{width:w=280,height:h=220}={}){
 const gap=18,pad=12,top=Math.max(64,Math.min(height-h-pad,(r.top+r.bottom-h)/2));
 const candidates=[{left:r.right+gap,top},{left:r.left-w-gap,top},{left:Math.max(pad,Math.min(width-w-pad,r.left)),top:r.bottom+gap},{left:Math.max(pad,Math.min(width-w-pad,r.left)),top:r.top-h-gap}];
 const overlap=(a,b)=>Math.max(0,Math.min(a.left+w,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+h,b.bottom)-Math.max(a.top,b.top));
 return candidates.map(p=>({left:Math.max(pad,Math.min(width-w-pad,p.left)),top:Math.max(64,Math.min(height-h-pad,p.top))})).sort((a,b)=>overlap(a,r)*10+avoid.reduce((n,r)=>n+overlap(a,r),0)-overlap(b,r)*10-avoid.reduce((n,r)=>n+overlap(b,r),0))[0];
}
// C138: readouts use existing engine metadata and recorded outcomes only.
export function campaignHorizonText(text, turn, limit) {
  const left = Math.max(0, limit - turn + 1);
  return String(text ?? '').replace(/(\d+(?:\.\d+)?)\s*(?:차례|턴)\s*뒤\s*(?:식량이\s*)?바닥납니다/g,
    (all, n) => Number(n) > left ? '이번 판 안에는 바닥나지 않습니다' : all)
    .replace(/남은 군량 (\d+(?:\.\d+)?)차례/g, (all, n) => Number(n) > left ? '이번 판 안에는 바닥나지 않습니다' : all);
}
export function noFieldArmyText(v) {
  if (Object.values(v.ownArmies ?? {}).some(a => a.troopCount > 0)) return '';
  const reserve = Object.values(v.ownCities ?? {}).reduce((n, c) => n + (c.reserveTroops ?? 0)+Object.values(c.specialReserves??{}).reduce((sum,count)=>sum+count,0), 0);
  return `야전 부대가 없습니다 — 병영에서 다시 내보낼 수 있습니다(예비병 ${troopText(reserve)})`;
}
export const ACTION_MEANING = Object.freeze({
  move:'목적지까지 이동합니다 · 먼 곳은 여러 차례에 걸쳐 갑니다',
  attack:'공격할 적 부대나 성을 고릅니다',
  face:'이동 대신 바라보는 쪽만 바꿉니다',
  brace:'주 행동을 써서 방어 태세를 취합니다',
  regroup:'주 행동을 써서 흐트러진 전열·사기를 추스릅니다',
  wait:'이 부대의 이번 차례 행동을 마칩니다',
  garrison:'성 안으로 들어가 예비병이 됩니다 · 부대는 해산',
  hub:'이 칸에 보급 거점을 짓습니다',
  tactic:'전법을 고른 뒤 대상을 지정해 사용합니다',
  star:'세력 고유 행동을 사용합니다 · 자세한 효과는 단추 설명에 표시',
  recall:'귀환할 수 있는 내 성으로 부대를 옮깁니다',
  'cancel-order':'예약한 이동을 취소합니다',
  officer:'장수의 능력과 보유 특기·전법을 봅니다',
});
export function commandIntentText(target, {name='', turns=null, blocked='', tactic='', ownCity=false, atCity=false} = {}) {
  if (tactic) return `${tactic} 사용 · ${name}`;
  if (target.deploymentReason) return `${target.deploymentReason}${target.kind==='approach'?' · 전개 자리로 이동만':''}`;
  if (target.kind === 'unit') return `${name} 부대 공격 · 이번 차례에 침`;
  if (target.kind === 'city') return `${name} 성 공격 · 이번 차례에 침`;
  if (target.kind === 'strike') return `${name}으로 접근 · 이번 차례에 이동 후 공격`;
  if (target.kind === 'approach') return `${name}으로 접근 · 이번 차례는 이동만 · 닿은 뒤 다시 공격`;
  if (ownCity && atCity) return blocked || `귀환 — ${name}성으로 들어감 · 누르면 예비병이 됩니다 — 부대는 해산`;
  if (blocked) return blocked;
  return turns == null ? '' : `${name || '가리킨 칸'}까지 이동 · ${turns > 1 ? `${turns}차례 걸림` : '이번 차례에 이동'}`;
}
export function tacticChangeText(event, {name=event.tacticName ?? '전법', ownIds=[], visibleIds=null, names={}, preview=false, cityTarget=false} = {}) {
  const lines=[], city=!!event.cityId||cityTarget, own=new Set(ownIds), shown=id=>visibleIds===null||visibleIds.includes(id), side=id=>own.has(id)?'아군':'적',who=id=>`${side(id)}${names[id]?' '+names[id]:''}`;
  if(!preview&&!city&&event.units?.length){
    const losses={};
    for(const u of event.units)if(shown(u.unitId))losses[who(u.unitId)]=(losses[who(u.unitId)]??0)+Math.max(0,u.preBattleCount-u.postBattleCount);
    for(const [label,loss] of Object.entries(losses))if(loss>0)lines.push(`${label} −${troopText(loss)}`);
  }else{
    if (!city && event.enemyLoss > 0&&shown(event.targetId)) lines.push(`${who(event.targetId)} −${troopText(event.enemyLoss)}`);
    if (event.allyLoss > 0&&shown(event.attackerId)) lines.push(`${who(event.attackerId)} −${troopText(event.allyLoss)}`);
  }
  const labels={ORDERED:'정돈',DISORDERED:'흐트러짐',BROKEN:'붕괴',STEADY:'안정',SHAKEN:'동요',ROUTING:'패주'};
  for (const [key, label] of [['formationChanges','전열'],['moraleChanges','사기']]) {
    const groups=new Map();
    for (const change of event[key] ?? []) if(shown(change.armyId)){const g=groups.get(change.armyId);groups.set(change.armyId,{from:g?.from??change.from,to:change.to});}
    for(const [id,c] of groups)if(c.from!==c.to)lines.push(`${side(id)} ${label} ${labels[c.from]??c.from} → ${labels[c.to]??c.to}`);
    const risk=event[key==='formationChanges'?'formationRisk':'moraleRisk'];
    if(preview&&risk?.check&&!groups.size)lines.push(`${side(event.targetId)} ${label==='전열'?'전열을 무너뜨림':`사기가 떨어질 수 있음(${chanceText462(1-risk.successProbability)})`}`);
  }
  for(const line of event.effectLines ?? []) {
    const position=line.match(/\d+칸 (?:밀기|당기기|이동)|(?:인접 아군 )?자리 교환/);
    if(position)lines.push(`자리 · ${position[0]}`);
  }
  for(const c of event.moraleChanges??[])if(shown(c.armyId)&&c.retreat?.from&&c.retreat?.to&&c.retreat.from!==c.retreat.to)lines.push(`자리 · ${side(c.armyId)} 패주 이동`);
  if(city&&(event.dealt??event.enemyLoss)>0)lines.push(`성 내구 −${labelNumber(event.dealt??event.enemyLoss)}`);
  return `${name} — ${[...new Set(lines)].join(' · ') || (preview?'수치 변화 예고 없음':'기록된 수치 변화 없음')}`;
}
export function resultReasonText(result, name = id => id) {
  if(result?.type==='UNIFICATION')return '큰 성 3개를 차지해 통일';
  if(result?.type!=='TURN_LIMIT')return '세력이 멸망해 판이 끝났습니다';
  const [a,b]=result.ranking??[];if(!a||!b)return '기한이 되어 세력 순위로 판정했습니다';
  const lead=name(a.factionId);
  if(a.majorCities!==b.majorCities)return `${lead} 승리 — 큰 성 ${a.majorCities} 대 ${b.majorCities}로 앞섰습니다`;
  if(a.minorCities!==b.minorCities)return `${lead} 승리 — 큰 성 수는 같고(${a.majorCities}) · 작은 성 ${a.minorCities} 대 ${b.minorCities}로 앞섰습니다`;
  if(a.troops!==b.troops)return `${lead} 승리 — 큰 성·작은 성이 같아 병력 ${troopText(a.troops)} 대 ${troopText(b.troops)}로 갈렸습니다`;
  return `${lead} 승리 — 큰 성·작은 성·병력이 모두 같아 동률 순서로 판정했습니다`;
}
export function growthUseText(card, {field=false, governor=false, troopReady=true, domesticRules=[], combatRules=[]} = {}) {
  const effects=card.effects??[], domestic=card.domestic===true || effects.some(e=>['CITY_OUTPUT_MOD','OCCUPATION_SPEED'].includes(e.op)||domesticRules.includes(e.rule));
  const combat=card.kind==='tactic'||card.kind==='fork'||!!card.modifier||card.domestic===false||effects.some(e=>combatRules.includes(e.rule)||['DAMAGE_MOD','DEFENSE_MOD','COUNTER_MOD','FORMATION_DELTA','MORALE_DELTA','MOVE_MOD','INITIATIVE_MOD','CASUALTY_SHIFT','HEAL_TROOPS','STATUS_APPLY'].includes(e.op)||['ON_ATTACK','ON_DEFEND','ON_COUNTER','BATTLE_START','ON_TACTIC_USE'].includes(e.when));
  if(domestic&&combat)return '';
  if(domestic)return governor?'지금 바로 쓰입니다':'태수가 되어야 쓰입니다';
  if(combat)return field?(troopReady?'지금 바로 쓰입니다':'현재 병종으로는 발동하지 않습니다'):'출진해야 쓰입니다';
  if(effects.length&&effects.every(e=>e.op==='XP_MOD'))return '지금 바로 쓰입니다';
  return '';
}
export function unfieldedOfficerNames(state, officers) {
  // City-start initial armies were disbanded before play. New armies have bornTurn.
  const deployed=new Set(Object.values(state.armies??{}).filter(a=>a.bornTurn!==undefined||!state.cityStart).map(a=>a.commanderId));
  return officers.filter(o=>!deployed.has(o.officerId)).map(o=>o.name);
}
// C132: public presentation only; no world mutation or hidden enemy details.
export function shownTroopForecast(shown, loss, scale = 1) {
  const after = Math.max(0, shown - loss * scale);
  return {after, line: `보이는 병력 ${troopText(shown)} → ${troopText(after)}`};
}
export function surpriseWarning(risk) {
  return risk?.turnsLeft > 0 ? `지금 치면 신용 −${Math.abs(risk.loss)}(기습) — ${risk.turnsLeft}차례 뒤부터는 깎이지 않음` : '';
}
export function productionReadout(job, previous) {
  if (!job) return {turns: null, line: '', change: ''};
  const remaining = Number.isFinite(job.cost)&&Number.isFinite(job.progress) ? job.cost-job.progress-(Number.isFinite(job.advance)?job.advance:0) : null;
  const turns = remaining===null ? null : remaining<=0 ? 1 : Number.isFinite(job.gain)&&job.gain>0 ? Math.max(1,Math.ceil(remaining/job.gain)) : null;
  const change = previous && previous.kind === job.kind && previous.gain !== job.gain
    ? `차례당 진행 ${previous.gain} → ${job.gain} — 현재 생산량·태수 효과 반영` : '';
  const advance=job.advance>0?` · ${taxAdvanceText(job)}`:'';
  return {turns, line: (turns === null ? '생산이 없어 진행 중단' : `${turns}차례 남음 · 차례당 진행 ${job.gain}`)+advance, change};
}
export function taxAdvanceText(job){
 const advance=job?.advance??0,needed=Math.max(0,(job?.cost??0)-(job?.progress??0)),used=Math.min(advance,needed);
 return `선지급 ${labelNumber(advance)} 중 현재 작업 진행에 ${labelNumber(used)} · 초과 ${labelNumber(Math.max(0,advance-used))} · 정산 후 선지급 잔액 0`;
}
export function taxAdvanceLines(before,after){
 if(before.factionId!==after.factionId)return [];
 return Object.values(before.ownCities??{}).flatMap(c=>{const job=c.jobs?.find(j=>j.kind===c.currentProduction?.kind)?.estimate,next=after.ownCities?.[c.cityId];return job?.advance>0&&next&&!next.jobs?.some(j=>j.estimate?.advance>0)?[`${c.name} · ${taxAdvanceText(job)}`]:[];});
}
export function diplomacyTimingText(t){return `${t.startsAt}차례(다음 차례)부터${t.turns?` ${t.turns}차례`:''}`;}
export function crisisRewardText(data,actor){
 return `해결한 플레이어 장수: 경험치 +${data.reward.xp}, 칭호 '${actor}${(actor.charCodeAt(actor.length-1)-0xac00)%28?'을':'를'} 꺾은 자' 보장. 플레이어 세력 인망 +${data.reward.fame}.`;
}
export function observedReinforcementLines(before, after) {
  if (before.factionId !== after.factionId) return [];
  const visible = v => Object.values(v.knowledge?.observedArmies ?? {}).filter(a => v.knowledge?.tiles?.[a.tileId] === 'VISIBLE');
  const prev = new Map(visible(before).map(a => [a.armyId, a]));
  return visible(after).flatMap(a => {
    const p = prev.get(a.armyId), gain = a.troopCount - (p?.troopCount ?? a.troopCount);
    if (!(gain > 0)) return [];
    const city = Object.values({...after.knowledge?.cities, ...after.ownCities}).find(c => c.tileId === a.tileId && after.knowledge?.tiles?.[c.tileId] === 'VISIBLE');
    const name = after.officers?.[a.commanderId]?.name ?? '관측한';
    return [`${name} 부대의 보이는 병력이 늘었습니다(${troopDelta(gain)})${city ? ` — ${city.name}에서` : ''}`];
  });
}
export function starvationLines(before, after) {
  if (before.factionId !== after.factionId) return [];
  const seen = new Set((before.supplyLosses ?? []).map(x => x.id));
  return (after.supplyLosses ?? []).filter(x => !seen.has(x.id)).map(x => {
    const a = after.ownArmies?.[x.armyId] ?? before.ownArmies?.[x.armyId];
    return `${after.officers?.[a?.commanderId]?.name ?? '아군'} 부대 · 굶주림 손실 −${troopText(x.count)}`;
  });
}
export function injuryReturnText(turn, injury) {
  return Number.isFinite(injury?.turnsLeft) ? `${injury.turnsLeft}차례 요양 · ${turn + injury.turnsLeft}차례에 복귀` : '요양 중';
}
// C127: player-facing text only; identifiers and command payloads stay unchanged.
export function labelNumber(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
  const n = Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  return String(Object.is(n, -0) ? 0 : n);
}
export function readableText(value, names = {}, rules = {}) {
  return String(value ?? '')
    .replace(/\b(?:null|undefined|NaN)\b/g, '—') // C137: absent presentation values
    .replace(/\bcatapult\b/g, '투석기')
    .replace(/\bG\d{2,3}\b/g, id => names[id] ?? '장수')
    .replace(/\b[A-Z]_[A-Z_]{3,}\b/g, id => rules[id] ?? '고유 효과')
    .replace(/[−－-]\s*[−－-](?=\d)/g, '−')
    .replace(/([+−－-]?)(\d+\.\d+)/g, (_, sign, n) => sign + labelNumber(Number(n)));
}
export function readableError(error, messages = {}) {
  const code = String(error?.message ?? error ?? '');
  const shortage = /^INSUFFICIENT_RECRUITMENT_PRESTIGE:[^:]+:required=(\d+(?:\.\d+)?):available=(\d+(?:\.\d+)?)$/.exec(code);
  if (shortage) return `인망이 ${labelNumber(Number(shortage[1]) - Number(shortage[2]))} 모자랍니다(필요 ${labelNumber(shortage[1])} · 지금 ${labelNumber(shortage[2])})`;
  if (/^DUPLICATE_ACTIVE_RECRUITMENT_TARGET(?::|$)/.test(code)) return '이미 협의 중입니다';
  if (messages[code]) return messages[code];
  // C150: 엔진이 '코드: 한국어 까닭'으로 상세 사유를 붙인다(성 전법이 안 되는 까닭 등) — 까닭만 보인다
  const detail = /^[A-Z][A-Z0-9_]{2,}: (.*[가-힣].*)$/s.exec(code);
  if (detail && !/\b[A-Z][A-Z0-9_]{2,}\b/.test(detail[1])) return readableText(detail[1]);
  const coded = /^([A-Z][A-Z0-9_]{2,}): ([A-Z][A-Z0-9_]{2,})$/.exec(code);
  if (coded) return messages[coded[2]] ?? messages[coded[1]] ?? '지금은 할 수 없습니다.';
  if (/[가-힣]/.test(code) && !/\b[A-Z][A-Z0-9_]{2,}\b/.test(code)) return readableText(code);
  console.warn(code);
  return '지금은 할 수 없습니다.';
}
// Replace only percentage values tied to numeric effects, using the engine's scaler.
export function cardNumericText(card, base, scale) {
  const values = new Map(), heals = new Map();
  (base?.effects ?? []).forEach((e, i) => {
    const actual = card.effects?.[i];
    if (e.op !== 'RULE' && Number.isFinite(e.value) && actual && e.value !== 0)
      values.set(Math.abs(e.value), Math.abs(scale(actual.value, card.rank ?? 1)));
    if(e.op==='HEAL_TROOPS'&&Number.isFinite(e.value)&&Number.isFinite(actual?.value))
      heals.set(e.value,scale(actual.value,card.rank??1));
  });
  return String(base?.text ?? card.text ?? '').replace(/([+−-])(\d+(?:\.\d+)?)%/g,
    (all, sign, value) => values.has(Number(value)) ? `${sign}${labelNumber(values.get(Number(value)))}%` : all)
    .replace(/(\d+(?:\.\d+)?)명/g,(all,value)=>heals.has(Number(value))?`${troopText(heals.get(Number(value)))}명`:all);
}

// C110: this renderer receives only the public view, never raw world/wanderer state.
export function recruitmentLeadsHtml(v) {
  const leads = v.revealedWanderers ?? [];
  if (!leads.length) return '';
  return `<section class="recruit-leads"><h3>재야 장수 소재 · ${leads.length}명</h3><p>순욱의 태수 특기로 알아낸 재야 장수입니다. 알고 있는 성은 위치를 확인할 수 있습니다.</p><ul>${leads.map(x => {
    const city = v.ownCities?.[x.cityId] ?? v.knowledge?.cities?.[x.cityId];
    return `<li><b>${esc(x.name)}</b><span>${city ? esc(city.name) : '아직 살피지 않은 성'}</span>${city ? `<button type="button" data-known-recruit-city="${esc(x.cityId)}">위치 보기</button>` : '<small>도시를 발견하면 위치를 볼 수 있습니다</small>'}</li>`;
  }).join('')}</ul></section>`;
}


// C112: presentation-only records. Inputs are the player's public views.
export function garrisonResult(before, after, armyId) {
  if (before.factionId !== after.factionId || before.turn !== after.turn) return '';
  const army=before.ownArmies?.[armyId];
  if (!army || !(army.troopCount>0) || after.ownArmies?.[armyId]?.troopCount>0) return '';
  const officer=after.officers?.[army.commanderId], location=officer?.locationRef;
  const city=location?.kind==='CITY'?after.ownCities?.[location.id]:null;
  if (!city || !before.ownCities?.[location.id]) return '';
  const specialAdded=(city.specialReserves?.[army.troopType]??0)-(before.ownCities[location.id].specialReserves?.[army.troopType]??0);
  if(specialAdded>0)return `${officer.name??'장수'} · ${city.name} 복귀 완료 — ${army.troopDisplayName??'같은 병종'} 특수 예비 +${troopText(specialAdded)}명`;
  const added=city.reserveTroops-before.ownCities[location.id].reserveTroops;
  if (!Number.isFinite(added) || added<=0) return '';
  return `${officer.name??'장수'} · ${city.name} 복귀 완료 — 예비병 +${troopText(added)}명`;
}
export function facilityCompletionLines(before, after, names = {}) {
  if (before.factionId !== after.factionId || after.turn !== before.turn + 1) return [];
  const rows=[];
  for (const [id, city] of Object.entries(after.ownCities ?? {})) {
    const prev=before.ownCities?.[id], kind=prev?.currentProduction?.kind;
    if (!kind || city.currentProduction || city.jobBlocked) continue;
    const count=c=>(c.facilities??[]).filter(f=>f.kind===kind).length;
    if (count(city)>count(prev)) rows.push(`${city.name??id} · ${names[kind]??kind} 완공`);
  }
  return rows;
}
export function foodSnapshot(v) {
  const cities = Object.values(v.ownCities ?? {}), sum = key => cities.reduce((n,c)=>n+(Number(c[key])||0),0);
  return {stock:sum('foodStock'), capacity:sum('foodCapacity'), output:cities.reduce((n,c)=>n+(Number(c.economyForecast?.food)||0),0)};
}
export function foodTransition(before, after) {
  if (before.factionId !== after.factionId || after.turn <= before.turn) return null;
  const from=foodSnapshot(before).stock, to=foodSnapshot(after).stock;
  return {turn:after.turn, from, to, change:Math.round((to-from)*10)/10};
}
export function combatReadout(before, after, event, mapNames = {}) {
  const known=(v,id)=>v.ownArmies?.[id] ?? Object.values(v.knowledge?.observedArmies??{}).find(a=>a.armyId===id&&v.knowledge?.tiles?.[a.tileId]==='VISIBLE');
  const knownCity=(v,id)=>v.ownCities?.[id] ?? (v.knowledge?.tiles?.[v.knowledge?.cities?.[id]?.tileId]==='VISIBLE'?v.knowledge.cities[id]:null);
  const name=(v,id)=>{const a=known(v,id);return a?(v.officers?.[a.commanderId]?.name??mapNames[id]??'관측한 부대'):'미확인 부대';};
  const cityId=event.cityId??(event.kind.includes('TACTIC')?event.targetId:null);
  const city=knownCity(before,cityId)??knownCity(after,cityId);
  const a=known(before,event.attackerId), b=known(before,event.targetId);
  if (!a&&!b&&!city) return null;
  const kind=({CITY:'성 공격',CITY_STRIKE:'성 사격',APPROACH_FIRE:'접근사격',PURSUIT:'이탈 추격',TACTIC:'전법',TACTIC_EFFECT:'전법',OVERWATCH:'대응 사격',JOINT_TACTIC:'연계 전법'})[event.kind]??'부대 교전';
  const source=event.kind==='CITY_STRIKE'?(city?.name??'미확인 성'):name(before,event.attackerId);
  const target=city&&event.kind!=='CITY_STRIKE'?city.name:event.kind==='CITY'?'미확인 성':name(before,event.targetId??event.attackerId);
  const lines=[];
  // Exact troop changes belong only to own units. Enemy strength is never taken from raw battle units.
  const affected=[...new Set([event.attackerId,event.targetId,...(event.units??[]).map(u=>u.unitId),...(event.hits??[]).flatMap(h=>[h.sourceId,h.targetId])].filter(Boolean))];
  for (const id of affected) {
    const own=before.ownArmies?.[id], visible=known(before,id);
    if (!visible) continue;
    if (own) {
      const rows=(event.units??[]).filter(u=>u.unitId===id);
      if(rows.length){const loss=rows[0].preBattleCount-rows.at(-1).postBattleCount, cause=event.kind==='CITY_STRIKE'?'성벽 사격':event.kind==='PURSUIT'?'추격(물러날 때)':event.kind==='APPROACH_FIRE'?'접근사격':id===event.attackerId&&event.counter?'반격':'적 공격';lines.push(`${name(before,id)} · 아군 병력 ${troopText(rows[0].preBattleCount)} → ${troopText(rows.at(-1).postBattleCount)}${loss>0?` · ${cause} −${troopText(loss)}`:''}`);}
    } else {
      const rows=(event.units??[]).filter(u=>u.unitId===id),hits=(event.hits??[]).filter(h=>h.targetId===id);
      const damage=rows.length?rows.reduce((n,u)=>n+Math.max(0,u.preBattleCount-u.postBattleCount),0):hits.length?hits.reduce((n,h)=>n+(h.damage??0),0):id===event.targetId?event.enemyLoss:id===event.attackerId?event.allyLoss:null;
      if (Number.isFinite(damage)&&damage>0) lines.push(`${name(before,id)} · 상대 피해 ${troopText(Math.round(damage))}`);
    }
    const changes=(event.formationChanges??[]).filter(f=>f.armyId===id), labels={ORDERED:'정돈',DISORDERED:'흐트러짐',BROKEN:'붕괴'};
    if(changes.length){const from=changes[0].from,to=changes.at(-1).to;if(from!==to)lines.push(`${name(before,id)} · 전열 ${labels[from]??from} → ${labels[to]??to}`);}
    const morale=(event.moraleChanges??[]).filter(x=>x.armyId===id),ml={STEADY:'안정',SHAKEN:'동요',ROUTING:'패주'};if(morale.length)lines.push(`${name(before,id)} · 사기 ${ml[morale[0].from]??morale[0].from} → ${ml[morale.at(-1).to]??morale.at(-1).to}`);
  }
  if(event.kind==='DISENGAGE_SHOT'&&!(event.enemyLoss>0))lines.push('이탈 사격 — 피해 없음');
  for(const hit of event.hits??[])if(known(before,hit.sourceId)&&known(before,hit.targetId))
    lines.push(`${name(before,hit.sourceId)} → ${name(before,hit.targetId)} · ${before.ownArmies?.[hit.targetId]?'아군':'상대'} 피해 ${troopText(hit.damage)}`);
  if(event.kind==='CITY'||city&&event.kind.includes('TACTIC'))lines.push(`성 내구 피해 ${labelNumber(event.dealt??event.enemyLoss??0)}`);
  const nextCity=knownCity(after,cityId);
  if(city&&nextCity&&city.ownerFactionId!==nextCity.ownerFactionId)lines.push(nextCity.ownerFactionId===after.factionId?'성 함락 · 아군 점령':'성 함락 · 소유 세력 변경');
  if(event.tacticName&&a)lines.push(`사용 전법 · ${abilityName356({name:event.tacticName})}`);
  if(a&&b){if(event.charge)lines.push('기병 돌격');if(event.side==='FLANK')lines.push('측면 공격');if(event.side==='REAR')lines.push('후방 공격');if(event.counter)lines.push('반격 발생');}
  const selfTactic=event.kind.includes('TACTIC')&&event.attackerId===event.targetId;
  const candidates=affected.flatMap(id=>{const own=before.ownArmies?.[id],g=before.officers?.[own?.commanderId]?.growth;return own?(g?.ownedTraits??[]).filter(c=>g.equippedTraitIds?.includes(c.traitId)).map(c=>({id,c})):[];});
  // Text-only logs cannot attribute identical names to two participants. Keep ambiguous slots quiet.
  const traitActivations=candidates.filter(({c})=>candidates.filter(x=>x.c.name===c.name).length===1&&(event.effectLines??[]).some(line=>typeof line==='string'&&(line.startsWith(c.name+' ')||line.startsWith(c.name+':')||line.startsWith(c.name+' — ')))).map(({id,c})=>({armyId:id,traitId:c.traitId,turn:event.turn,sequence:event.sequence}));
  return {traitActivations,sequence:event.sequence,turn:event.turn,title:selfTactic?`${abilityName356({name:event.tacticName})||kind} · ${affected.some(id=>id!==event.attackerId&&known(before,id))?'광역 대상':'자신'}`:`${source} → ${target}`,kind,lines};
}
export function combatHistoryHtml(records) {
  return records.slice(-6).reverse().map(r=>`<article><h4>${esc(r.turn)}턴 · ${esc(r.kind)}</h4><b>${esc(r.title)}</b>${r.lines.map(t=>`<p>${esc(t)}</p>`).join('')}</article>`).join('');
}

const H = '/assets/ui-v3/hud/';
const RAIL = [['world', '지형', 'mode-terrain'], ['supply', '보급', 'mode-supply'], ['faction', '세력', 'mode-faction'], ['compare', '세력 비교', 'mode-faction'], ['diplomacy', '외교', 'mode-diplomacy'], ['trace', '탐험', 'mode-explore']];
const RES_ICON = {food: 'res-food', production: 'res-production', science: 'res-science', fame: 'res-fame', troops: 'res-troops', reserve: 'res-reserve'};
function resourceIcon464(kind){
 const shapes={
  food:'<path d="M6 25 22 3M7 21C1 21 2 14 3 12c5 1 7 4 7 6M11 16C5 15 5 8 7 6c5 2 6 5 6 8M15 11c-5-2-4-8-2-10 4 2 5 5 4 8M10 21c6 3 11-1 12-4-4-2-8-1-10 1M14 16c6 2 11-2 11-5-5-1-8 0-10 3M18 10c5 1 8-3 8-6-4 0-6 1-8 4"/>',
  production:'<path d="m3 24 2-7 5-3 4 4-1 6Zm11 0 2-8 6-3 4 11ZM8 12l2-8 6-3 5 11Z"/>',
  science:'<path d="M1 8 11 4l3 3 3-3 10 4-3 16-10-3-10 3Zm13 2v8m-9-6 6-2m6 0 6 2M4 21l10-3 10 3"/>',
  fame:'<path d="M2 25 4 17l5-3 4 11Zm13 0 2-11 6 2 3 9ZM7 12l2-9 6-2 5 11Z"/><path d="m8 3 4 3 4-3m-11 14 4 3m9-5 3 4"/>',
  troops:'<circle cx="14" cy="14" r="11"/><path fill="#101714" d="M11 7h6v6h-6Zm0 10h6v4h-6Z"/>',
  reserve:'<path d="m4 19 13-16 8 6-13 17ZM2 18l10 9 2-3-10-9Z"/><path d="m11 13 7-8m-4 10 7-8"/>'
 };
 if(!shapes[kind])return icon(RES_ICON[kind],kind);
 return `<svg class="sg-sym c464-resource-symbol" viewBox="0 0 28 28" aria-hidden="true">${shapes[kind]}</svg>`;
}
const ACT_ICON = {move: 'cmd-move', face: 'cmd-face', brace: 'cmd-brace', regroup: 'cmd-regroup', wait: 'cmd-wait', hub: 'cmd-hub', tactic: 'cmd-tactic', officer: 'cmd-officer', attack: 'cmd-attack', garrison: 'cmd-garrison'};
const ACT_ORDER = ['move', 'attack', 'face', 'brace', 'regroup', 'wait', 'hub', 'garrison', 'tactic'];

// ── 장수 머리 자리: 그림마다 잰 머리 상자(/assets/officer-art/cutout/heads.json ← tools/design/officer-heads.py)를 그림 요소에 달아 준다.
//    얼굴 칸·흉상 칸은 CSS 가 --ovb-*(object-view-box) 로 자르고, 큰 인물 자리는 --hx·--hy·--hs 로 머리 크기·위치를 맞춘다.
//    전에는 "위에서 8% + 2배 확대" 같은 고정 자르기라 그림마다 목·가슴이 들어갔다(사용자 2026-10-10).
let HEADS = {};
const HEAD_RE = /\/officer-art\/cutout\/([^/?#"')]+)/;
/** 장수 그림 주소 → {size:[w,h], head:[가운데x, 가운데y, 한 변/너비]} | null */
export const headOf = (src) => { const m = HEAD_RE.exec(String(src ?? '')); if (!m) return null; const n = decodeURIComponent(m[1]); return HEADS[n] ?? HEADS[n.replace(/-relief(\.\w+)$/, '$1')] ?? null; };   // 석각 판(<이름>-relief.webp)은 원본과 같은 크기라 원본의 머리 자리를 쓴다
// 머리 상자 한 변을 1 로 한 네모(가운데 기준) → inset(위 오른쪽 아래 왼쪽). 그림 밖으로 나가면 안으로 민다
function headBox(h, kx0, ky0, kx1, ky1) {
  const [W, H] = h.size, s = h.head[2] * W, cx = h.head[0] * W, cy = h.head[1] * H;
  let x0 = cx + kx0 * s, x1 = cx + kx1 * s, y0 = cy + ky0 * s, y1 = cy + ky1 * s;
  if (x0 < 0) { x1 -= x0; x0 = 0; } if (x1 > W) { x0 = Math.max(0, x0 - (x1 - W)); x1 = W; }
  if (y0 < 0) { y1 -= y0; y0 = 0; } if (y1 > H) { y0 = Math.max(0, y0 - (y1 - H)); y1 = H; }
  const p = (v) => `${(v * 100).toFixed(2)}%`;
  return `inset(${p(y0 / H)} ${p(1 - x1 / W)} ${p(1 - y1 / H)} ${p(x0 / W)})`;
}
function tagHeadImg(im) {
  const src = im.getAttribute('src') ?? ''; if (im.dataset.hdSrc === src) return; im.dataset.hdSrc = src;
  const h = headOf(src), st = im.style;
  if (!h) { delete im.dataset.hd; return; }
  st.setProperty('--hx', String(h.head[0])); st.setProperty('--hy', String(h.head[1])); st.setProperty('--hs', String(h.head[2])); st.setProperty('--ar', String(h.size[0] / h.size[1]));
  st.setProperty('--ovb-face', headBox(h, -.5, -.5, .5, .5));       // 얼굴만(정사각)
  st.setProperty('--ovb-medal', headBox(h, -.95, -.72, .95, 1.18));  // 머리 + 어깨(정사각 — 외교 원판)
  st.setProperty('--ovb-bust', headBox(h, -1.05, -.78, 1.05, 2.02)); // 흉상(3:4)
  // C407 dock: normalize measured head size; eye estimate is 0.12 head above its center.
  st.setProperty('--dock-head-width', `${(100 / (h.head[2] * 1.9)).toFixed(4)}%`);
  st.setProperty('--dock-head-offset', `${(-100 * h.head[0]).toFixed(4)}% ${(-100 * (h.head[1] - .12 * h.head[2] * h.size[0] / h.size[1])).toFixed(4)}%`);
  im.dataset.hd = '1';
}
// 배경으로 얼굴을 넣는 칸(style 의 --face · --visit-face · --gface): 칸 너비 = 머리 상자 × k, 머리 가운데가 칸 세로 cy 에 오게.
//   ac = 칸의 가로÷세로(배경 위치 %는 칸 크기에 따라 달라지므로 필요). 결과는 --<이름>-size · --<이름>-pos 로 넘긴다
const BG_SLOTS = [['--face', 1, 1, .5], ['--visit-face', 1.42, .767, .4], ['--gface', 1.08, .934, .5]];
function tagHeadBg(el) {
  const key = BG_SLOTS.map(([p]) => el.style.getPropertyValue(p)).join('|'); if (el.dataset.hdBg === key) return; el.dataset.hdBg = key;
  for (const [prop, k, ac, cy] of BG_SLOTS) {
    const h = headOf(el.style.getPropertyValue(prop)); if (!h) continue;
    const [hx, hy, hs] = h.head, ar = h.size[0] / h.size[1], kx = 1 / (hs * k), ky = ac / (hs * k * ar);
    el.style.setProperty(`${prop}-size`, `${(kx * 100).toFixed(1)}% auto`);
    el.style.setProperty(`${prop}-pos`, `${((.5 - hx * kx) / (1 - kx) * 100).toFixed(2)}% ${((cy - hy * ky) / (1 - ky) * 100).toFixed(2)}%`);
  }
}
const HEAD_IMG = 'img[src*="/officer-art/cutout/"]', HEAD_BG = '[style*="face:"]';
function tagHeads(node, deep) {
  if (node.nodeType !== 1) return;
  if (node.matches(HEAD_IMG)) tagHeadImg(node); else if (node.matches(HEAD_BG)) tagHeadBg(node);
  if (deep) { for (const im of node.querySelectorAll(HEAD_IMG)) tagHeadImg(im); for (const el of node.querySelectorAll(HEAD_BG)) tagHeadBg(el); }
}
if (typeof document !== 'undefined') fetch('/assets/officer-art/cutout/heads.json').then((r) => r.ok ? r.json() : null).then((j) => {
  if (!j?.files) return;
  HEADS = j.files; tagHeads(document.documentElement, true);
  // 그려지기 전에 단다(관찰 콜백은 화면을 그리기 전에 돈다 → 깜빡임 없음). 속성 변화는 그 요소만 본다(지도 끌기 때마다 아래를 훑지 않게)
  new MutationObserver((recs) => { for (const r of recs) { if (r.type === 'childList') { for (const n of r.addedNodes) tagHeads(n, true); } else tagHeads(r.target, false); } })
    .observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style']});
  document.dispatchEvent(new CustomEvent('ink:heads'));
}).catch(() => {});

let has = () => true; // 등록된 그림만 쓰기(없으면 글자) — mount 에서 받는다

export function statusSymMarkup(kind,text){
 const value=String(text??'');let name;
 if(kind==='morale')name=/패주|ROUTING/.test(value)?'morale-broken':/동요|SHAKEN/.test(value)?'morale-shaken':/안정|STEADY/.test(value)?'morale-steady':null;
 if(kind==='formation')name=/붕괴|BROKEN/.test(value)?'formation-broken':/흐트러|DISORDERED/.test(value)?'formation-disordered':/정돈|ORDERED/.test(value)?'formation-ordered':null;
 if(kind==='supply')name=/차단|고갈|STARVING|CUT/.test(value)?'supply-cut':/부족|LOW/.test(value)?'supply-low':/연결|충분|FULL|유지/.test(value)?'supply-full':null;
 if(kind==='action')name=/사용함|완료|DONE/.test(value)?'done':/가능|READY/.test(value)?'ready':null;
 return name?symImg('status',name,{size:'sm'}):'';
}
export function terrainSymMarkup(text){
 const value=String(text??''),names={plain:['들','평지','평원'],forest:['숲','삼림'],mountain:['산','산지'],river:['강','하천'],road:['길','도로'],wall:['성벽'],coast:['해안'],ferry:['나루']};
 const words=value.split(/[\s·:/×+−-]+/);
 const name=Object.keys(names).find(k=>words.includes(k)||names[k].some(label=>words.includes(label)));
 return name?symImg('terrain',name,{size:'sm'}):'';
}

const HUD_SYMS = {"res-food":["resources","food"],"res-production":["resources","production"],"res-science":["resources","learning"],"res-fame":["resources","renown"],"res-troops":["resources","troops"],"res-reserve":["resources","reserve"],"mode-terrain":["lenses","terrain"],"mode-supply":["lenses","supply"],"mode-faction":["lenses","faction"],"mode-diplomacy":["global","diplomacy"],"mode-explore":["controls","search"],"mode-roster":["global","officers"],"b-office":["global","city"],"b-treaty":["global","diplomacy"],"b-helmet":["global","officers"],"cmd-attack":["actions","attack"],"cmd-move":["actions","move"],"cmd-wait":["actions","wait"],"cmd-garrison":["actions","garrison"],"cmd-tactic":["actions","tactic"],"cmd-officer":["global","officers"]};
const icon = (name,glyph) => HUD_SYMS[name] ? symImg(...HUD_SYMS[name],{className:"ih-ico"}) : `<em class="ih-glyph">${esc(glyph)}</em>`;

// 사건 창의 등급 줄(시안 page-event 의 둥근 아이콘 넷 — Codex 반박 리뷰 2026-10-11): 위기 · 사건 · 돌발 · 상황 가운데 지금 등급만 밝다.
//   world.js 는 등급을 글자 하나(#event-scale)로만 쓴다 → 그 글자를 읽어 옆에 줄을 그린다(world.js 는 건드리지 않음). 등급 글자가 아니면(발견 등) 줄을 숨긴다
// 깃발의 문장 = 세로로 펼친 큰 신수(hud/faction-banner-Fxx.png — 기준 그림들의 깃발). 그 그림이 없는 세력은 작은 둥근 문장
const setBanner = (img, fid) => { if (!img || img.dataset.fid === fid) return; img.dataset.fid = fid; img.onerror = () => { img.onerror = null; img.src = `/assets/ui-v3/emblems/${fid}.png`; }; img.src = `${H}faction-banner-${fid}.png`; };
// 차례 판 줄 왼쪽의 표지(기준 final-map-v2: 문서 · 망치 · 사람 · 관청) — 줄의 내용으로 고른다
const lineIcon = (t) => /생산|작업|건설|둔전|공방|농지|곡창|수리|완성|연구/.test(t) ? 'res-production' : /장수|부대|등용|포로|레벨|특기|전법|재야|인재/.test(t) ? 'mode-roster' : /성|함락|내구|공성|점령|도시/.test(t) ? 'b-office' : 'b-treaty';
const EV_SCALES = [['위기', 'cmd-attack'], ['사건', 'cmd-brace'], ['돌발', 'u-cavalry'], ['상황', 'cmd-regroup']];
function mountEventScales() {
  if (typeof MutationObserver !== 'function') return;
  for (const id of ['event-scale', 'choice-kind']) {
    const src = document.getElementById(id); if (!src || src.nextElementSibling?.classList.contains('ev-scales')) continue;
    const row = document.createElement('div'); row.className = 'ev-scales'; row.setAttribute('role', 'img'); src.after(row);
    const sync = () => {
      const now = (src.textContent ?? '').trim(), hit = EV_SCALES.some(([k]) => k === now);
      row.hidden = !hit; if (!hit) { row.innerHTML = ''; return; }
      row.setAttribute('aria-label', `등급 — ${now}`);
      row.innerHTML = EV_SCALES.map(([k, ic]) => `<i class="${k === now ? 'on' : ''}" title="${k}"><img src="${H}icons/${ic}.png" alt=""><b>${k}</b></i>`).join('');
    };
    new MutationObserver(sync).observe(src, {childList: true, characterData: true, subtree: true}); sync();
  }
}

/** HUD 뼈대를 만든다. opts.has(rel) = v3 manifest 에 그림이 있는지. */
// Screen-space minimum, including the map's zoom and perspective transform.
export function mapTextFontSize(matrix,minimum=12){
 const scale=matrix?Math.hypot(matrix.c,matrix.d):0;
 return scale>0?Math.max(11,minimum/scale):11;
}
function watchMapText(){
 const map=document.querySelector('#map');if(!map||typeof MutationObserver!=='function')return;
 let frame=null;
 const sync=()=>{if(frame!==null)return;frame=requestAnimationFrame(()=>{
  frame=null;
  for(const text of map.querySelectorAll('.w-c186-facing text,.w-side text,.w-site>.name,.c186-site-goal')){
   const size=mapTextFontSize(text.getScreenCTM()).toFixed(3)+'px';
   if(text.style.fontSize!==size)text.style.fontSize=size;
  }
 });};
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.target.tagName?.toLowerCase()!=='text'))sync();}).observe(map,{subtree:true,childList:true,attributes:true,attributeFilter:['style','transform']});
 document.querySelector('.viewport')?.addEventListener('scroll',sync,{passive:true});
 window.addEventListener('resize',sync);sync();
}

// Only add presentation to existing controls; preserve nodes, labels and handlers.
function installC268Controls(doc){
 if(doc.documentElement.dataset.c268Controls)return;doc.documentElement.dataset.c268Controls='true';
 const decorate=root=>{
  if(root.nodeType!==1)return;
  for(const label of [...(root.matches('.dp-state')?[root]:[]),...root.querySelectorAll('.dp-state')]){
   const name=({WAR:'hostile',ALLIANCE:'alliance',NEUTRAL:'neutral'})[label.closest('[data-state]')?.dataset.state];
   if(name&&!label.querySelector('.sg-sym'))label.insertAdjacentHTML('afterbegin',symImg('diplomacy',name,{size:'sm'}));
  }
  const nodes=[...(root.matches('button,summary')?[root]:[]),...root.querySelectorAll('button,summary')];
  for(const node of nodes){
   if(node.querySelector('.sg-sym')||node.closest('#title-menu,.od-card,#mode-rail,#hud,#unit-menu'))continue;
   const label=(node.getAttribute('aria-label')||node.textContent||'').trim();let name;
   if(node.tagName==='SUMMARY')name='expand';
   else if(/닫기|^×$|^✕$/.test(label))name='close';
   else if(/^이전|^‹|^←/.test(label))name='prev';
   else if(/^다음(?! 차례)|^›|^→/.test(label))name='next';
   else if(/^펼|더 보기/.test(label))name='expand';
   else if(/^접기/.test(label))name='collapse';
   if(!name)continue;
   if(/^[×✕]$/.test(label)){node.setAttribute('aria-label','닫기');node.textContent='';}
   node.insertAdjacentHTML('afterbegin',symImg('controls',name,{size:'sm',className:'c268-control-symbol'}));
  }
 };
 decorate(doc.body);
 new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)decorate(node);}).observe(doc.body,{childList:true,subtree:true});
}

export function mountInkHud(root, opts = {}) {
  installC268Controls(document);
  if (opts.has) has = opts.has;
  mountEventScales();
  root.innerHTML = `<div class="ih">
    <header class="ih-top"><img class="ih-topbar" src="${H}topbar.png" alt="">
      <button class="ih-faction" data-fwd="#faction" title="세력 — 정책·외교"><img class="ih-emblem" alt=""><b></b></button>
      <div class="ih-res"></div><section class="ih-food-sheet" hidden aria-label="식량 현황"><button data-food-close aria-label="식량 현황 닫기">${symImg('controls','close',{size:'sm'})}</button><div></div></section>
      <div class="ih-medal" title=""><img src="${H}medallion.png" alt=""><b class="ih-turn"></b></div>
      <div class="ih-date"><b></b><small></small></div>
      <nav class="ih-menu"><button data-fwd="#save" title="저장 칸은 하나입니다 — 이전 저장을 덮어씁니다">저장</button><button data-fwd="#load-again" title="불러오기">불러</button><button data-fwd="#rules-open" title="규칙">규칙</button><button data-fwd="#mute" title="소리">소리</button><a href="/" title="처음 화면">처음</a></nav>
    <p class="ih-victory"></p></header>
    <img class="ih-horizon" src="${H}map-horizon-band.png" alt="" onerror="this.remove()">
    <nav class="ih-rail">${RAIL.map(([m, label, ic]) => `<button class="ih-rb" data-mode="${m}" title="${label}"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon(ic, label[0])}<small>${label}</small></button>`).join('')}
      <button class="ih-rb" data-fwd="#roster-open" title="소속 장수"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-helmet', '장수')}<small>장수</small></button>
      <button class="ih-rb" data-open="council" title="평정 — 이번 달 안건"><img class="ih-ring" src="${H}btn-round.png" alt="">${symImg('global','records',{className:'ih-ico'})}<small>평정</small><i class="ih-badge" hidden></i></button></nav>
    <aside class="ih-notice"><img class="ih-panel" alt=""><img class="ih-flag-em" alt=""><h3>이번 차례</h3><ol class="ih-lines"></ol><div class="ih-notice-links"><section class="ih-turn-history" hidden><button type="button" data-turn-report aria-expanded="false">이번 차례 전체 소식</button><ol hidden></ol></section><button class="ih-leads" data-fwd="#faction" hidden></button><details class="ih-combat-history" hidden><summary>최근 교전</summary><small class="ih-history-hint">지도를 연 뒤 관측한 최근 6회</small><div></div></details></div></aside>
    <aside class="ih-foe" hidden><i class="pic"><img alt=""></i><img class="ih-panel" src="${H}battle-enemy.png" alt=""><b class="nm"></b><i class="bar b1"><u></u><em></em></i><i class="bar b2"><u></u><em></em></i></aside>
    <section class="ih-unit" hidden><img class="ih-panel" alt=""><img class="ih-flag-em" alt="">
      <button class="ih-face" data-act="officer" title="장수 정보"><img alt=""></button>
       <div class="ih-id"><b></b><small></small></div><p class="ih-intent"></p>
      <div class="ih-bars"><i data-k="0"><u></u><em></em></i><i data-k="1"><u></u><em></em></i><i data-k="2"><u></u><em></em></i></div>
      <div class="ih-acts"></div><div class="ih-readout" aria-label="부대 행동과 위험"></div></section>
    <nav class="ih-cmd" hidden><img class="bar" src="${H}battle-cmd.png" alt=""><span class="tac"></span><button class="atk" data-act="attack" title="공격할 적을 고릅니다">${icon('cmd-attack', '공격')}<b>공격</b></button></nav>
    <button class="ih-end" data-fwd="#end-turn" title="다음 차례 (Enter)"><img src="${H}endturn.png" alt=""><b class="ih-end-name">다음 차례</b><small></small></button>
  </div>`;
  mountCommandBand(root);
  mountUnitDock300(root);
  watchMapText();
  // 지도 눕혀 보기(기준 final-map-v2 의 비스듬한 시점): 기본으로 켠다. 끌기·확대 프레임을 재 보니 눕히지 않은 것과 같았다(tools/smoke/ink-perf.mjs). ?tilt=0 이면 끈다
  try { if (new URLSearchParams(location.search).get('tilt') !== '0') document.body.classList.add('tilt'); } catch { /* 주소를 못 읽으면 그대로 */ }
  // 적 장수 판: world.js 가 공격 예상을 띄울 때 'ink:foe' 로 알려 준다. 예상 창(#attack-preview)이 닫히면 같이 닫는다
  const foe = root.querySelector('.ih-foe'), tipEl = document.querySelector('#attack-preview');
  const foeOff = () => { if (foe && !foe.hidden) { foe.hidden = true; root.classList.remove('foe'); } };
  document.addEventListener('ink:foe', (e) => {
    const d = e.detail; if (!foe || !d) { foeOff(); return; }
    const im = foe.querySelector('.pic img'); if (d.face) im.src = d.face; im.hidden = !d.face;
    foe.querySelector('.nm').textContent = d.name ?? '';
    foe.querySelectorAll('.bar').forEach((el, i) => { const b = d.bars?.[i]; el.hidden = !b; if (!b) return; el.title = b.title ?? ''; el.querySelector('u').style.width = `${Math.max(0, Math.min(100, b.pct))}%`; el.querySelector('em').textContent = b.text ?? ''; });
    foe.hidden = false; root.classList.add('foe');
  });
  if (tipEl && typeof MutationObserver === 'function') new MutationObserver(() => { if (tipEl.hidden) foeOff(); }).observe(tipEl, {attributes: true, attributeFilter: ['hidden']});
  const closeFood=()=>{root.querySelector('.ih-food-sheet').hidden=true;root.querySelector('[data-food-open]')?.setAttribute('aria-expanded','false');};
  // C138: delegation survives button replacement on each render.
  const explain = e => {
    const button=e.target.closest?.('[data-act]'), line=root.querySelector('.ih-action-help');
    if(!line||!button)return;
    const action=button.dataset.act;
    line.textContent=button.disabled||action==='star'?button.title:(ACTION_MEANING[action]??button.title??'');
    line.title=line.textContent;
  };
  root.addEventListener('pointerover',explain);root.addEventListener('focusin',explain);
  const clearHelp=e=>{if(e.target.closest?.('[data-act]')&&!e.relatedTarget?.closest?.('[data-act]')){const line=root.querySelector('.ih-action-help');if(line)line.textContent='';}};
  root.addEventListener('pointerout',clearHelp);root.addEventListener('focusout',clearHelp);
  document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.ih-food-sheet,[data-food-open]'))closeFood();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.querySelector('.ih-food-sheet').hidden){closeFood();e.stopPropagation();}},true);
  root.addEventListener('click', (e) => {
    if(e.target.closest?.('[data-turn-report]')){const list=root.querySelector('.ih-turn-history ol');list.hidden=!list.hidden;e.target.closest('[data-turn-report]').setAttribute('aria-expanded',String(!list.hidden));return;}
    if(e.target.closest?.('[data-food-open],[data-food-close]')){const panel=root.querySelector('.ih-food-sheet');panel.hidden=e.target.closest?.('[data-food-close]')?true:!panel.hidden;root.querySelector('[data-food-open]')?.setAttribute('aria-expanded',String(!panel.hidden));return;}
    const t = e.target.closest?.('[data-fwd],[data-mode],[data-act],[data-open]'); if (!t || !root.contains(t)) return;
    if (t.dataset.open) { document.dispatchEvent(new CustomEvent(`ink:${t.dataset.open}`)); return; }
    if (t.dataset.mode) { document.querySelector(`#mode-rail [data-mode="${t.dataset.mode}"]`)?.click(); if (t.dataset.mode === 'diplomacy') document.dispatchEvent(new CustomEvent('ink:diplomacy')); return; }
    if (t.dataset.act) { const sel = t.dataset.tactic ? `#unit-menu [data-tactic="${t.dataset.tactic}"]` : `#unit-menu [data-menu="${t.dataset.act}"]`; document.querySelector(sel)?.click(); return; }
    const target = document.querySelector(t.dataset.fwd); if (!target) return;
    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, shiftKey: e.shiftKey}));
  });
}

/** 매 render 뒤: 옛 HUD 에 그려진 값을 읽어 새 HUD 에 옮긴다(처리 규칙은 하나). d = world.js 가 주는 세력·차례 정보. */
// Avoid replacing decoded images and notifying observers when public text is unchanged.
function updateMarkup370(node,html){if(node.innerHTML!==html)node.innerHTML=html;}
export function renderInkHud(root, d) {
  const q = (s) => root.querySelector(s), old = (s) => document.querySelector(s);
  const color = d.factionColor ?? '#a8352a', tone = d.tone ?? 'red';
  root.style.setProperty('--fc', color);
  q('.ih-faction .ih-emblem').src = `/assets/ui-v3/emblems/${d.factionId}.png`;
  q('.ih-faction b').textContent = d.factionName ?? '';
  q('.ih-faction b').dataset.name = d.factionName ?? '';
  // 자원: 옛 위 띠 칩(값·증감·설명)을 그대로
  if(v3View(d.foodView)){q('.ih-res').innerHTML=resourceChipsV3(d.foodView,true);updateMarkup370(q('.ih-food-sheet > div'),resourceDetailsV3(d.foodView));}
  else {
  q('.ih-res').innerHTML = [...document.querySelectorAll('#resources .chip')].map((c) => {
    const k = c.dataset.res, b = c.querySelector('b'), dl = c.querySelector('small.d');
    return `<${k==='food'?'button type="button" data-food-open aria-label="식량 현황" aria-expanded="'+String(!q('.ih-food-sheet').hidden)+'"':'span'} class="ih-chip" data-res="${esc(k)}" title="${esc([c.title,dl?.textContent].filter(Boolean).join(" · "))}"><span class="c243-resource-icon">${document.documentElement.dataset.ui==='kit'?resourceIcon464(k):icon(RES_ICON[k],k)}</span><span class="nb-resource-label">${esc(({food:'식량',production:'생산',science:'학문',fame:'인망',troops:'병력',reserve:'예비'})[k]??k)}</span><b>${b?.innerHTML ?? ''}</b>${dl ? `<small class="${dl.classList.contains('down') ? 'down' : 'up'}">${esc(dl.textContent)}</small>` : ''}</${k==='food'?'button':'span'}>`;
  }).join('');
  q('.ih-res').title = [...q('.ih-res').querySelectorAll('.ih-chip')].map(c=>`${c.textContent} · ${c.title}`).join(' / ');
  const f=d.food??{}, change=d.foodChange, fmt=n=>Number(n??0).toLocaleString('ko-KR',{maximumFractionDigits:1});
  const emptyIn=foodExhaustion(d.foodView??{});
  const ledger=foodLedgerTotals(d.foodView??{});
  if(emptyIn!==null)q('.ih-res').querySelector('[data-res="food"]')?.insertAdjacentHTML('beforeend',`<small class="down c215-food-empty">바닥까지 ${emptyIn}차례</small>`);
 updateMarkup370(q('.ih-food-sheet > div'),`<h3>식량 현황</h3><p>현재 재고 <b>${fmt(f.stock)} / ${fmt(f.capacity)}</b></p><p>다음 정산 순증 <b>${ledger.net>=0?'+':''}${fmt(ledger.net)}</b> · 산출 +${fmt(f.output)}</p><p>직전 정산 들어옴 +${fmt(ledger.incoming)} / 나감 −${fmt(ledger.outgoing)}</p><p class="hint">순증은 현재 산출·유지비 예상이며, 들어옴/나감은 직전 실제 장부입니다.</p>${change?`<h4>${esc(change.turn)}턴 진입 · 실제 재고 변화</h4><p><b>${fmt(change.from)} → ${fmt(change.to)} (${change.change>0?'+':''}${fmt(change.change)})</b></p><small>차례가 바뀌는 처리 전후의 보유 도시 재고 합입니다.</small>`:'<small>차례를 넘기면 실제 재고 변화를 함께 보여줍니다.</small>'}`);
  for(const chip of q('.ih-res').querySelectorAll('.ih-chip')){const hint=chip.querySelector('.c215-food-empty');if(hint)chip.title+=' / '+hint.textContent;}
  }
 const history=q('.ih-combat-history');history.hidden=!d.combatHistory?.length;
  const historyHtml=combatHistoryHtml(d.combatHistory??[]);
  if(history.querySelector('div').innerHTML!==historyHtml)history.querySelector('div').innerHTML=historyHtml;
  history.querySelector('summary').textContent=`최근 교전 · ${d.combatHistory?.length??0}건`;
  q('.ih-turn').textContent = d.turn ?? '';
  q('.ih-medal').title = d.left ?? '';
  q('.ih-date b').textContent = `${String(d.date ?? '').replace(/^\d+턴\s*·\s*/, '')} · ${d.turn ?? ''}차례 / ${d.turnLimit ?? ''}`; q('.ih-date small').textContent = d.left ?? '';
  let wind=q('.ih-date .c206-weather');if(!wind){wind=document.createElement('span');wind.className='c206-weather';q('.ih-date').appendChild(wind);}wind.innerHTML=windHtml(d.combatWeather);
  for (const b of root.querySelectorAll('.ih-rb[data-mode]')) b.classList.toggle('on', b.dataset.mode === d.mode);
  { const cb = q('.ih-rb[data-open="council"] .ih-badge'); if (cb) { cb.hidden = !d.council; cb.textContent = d.council || ''; } }
  // 이번 차례(보고) — 마지막 4줄
  const lines = [...document.querySelectorAll('#turn-log p')].map((p) => p.textContent.replace(/(\d+\.\d)\d{2,}/g, '$1')).filter(Boolean); // 긴 소수(0.436782)는 한 자리로
  q('.ih-notice .ih-panel').src = `${H}notice-${tone}.png`;
  setBanner(q('.ih-notice .ih-flag-em'), d.factionId);
  document.body.style.setProperty('--my-banner', `url("${H}faction-banner-${d.factionId}.png")`); // 깃발에 세로로 펼치는 신수(방문 말 판의 좁은 깃발)
  document.body.style.setProperty('--my-beast', `url("${H}faction-beast-${d.factionId}.png")`); // 깃발에 펼치는 큰 신수(방문 말 판)
  document.body.style.setProperty('--my-em', `url("/assets/ui-v3/emblems/${d.factionId}.png")`); // 내 세력 문장 — 방문 말 판의 깃발 · 사건 등급 줄의 넷째 표지(CSS)
  const results=[...(d.facilityResults??[]),...(d.unitResult?[d.unitResult]:[])], allLines=d.allNews??[...lines,...results], current=d.currentNews??[...lines,...results].reverse();
  const turnHistory=q('.ih-turn-history');turnHistory.hidden=!allLines.length;turnHistory.querySelector('button').textContent=`전체 소식 · ${allLines.length}건`;turnHistory.querySelector('ol').innerHTML=allLines.map(t=>`<li>${esc(t)}</li>`).join('');
  q('.ih-lines').innerHTML = (current.length ? current.slice(0,4) : [d.summary ?? '조용한 차례입니다.']).map((t) => `<li>${icon(lineIcon(t),'소식')}<span>${esc(t)}</span></li>`).join('');
  const leads = q('.ih-leads');
  leads.hidden = !d.recruitmentCount;
  leads.textContent = `재야 장수 ${d.recruitmentCount ?? 0}명 · 소재 확인`;
  // 고른 부대: 옛 부대 판(#unit-menu)을 읽는다
  const menu = old('#unit-menu'), unit = q('.ih-unit');
   const showUnit = !!menu && (!menu.hidden || !!d.unitStatus) && !!menu.querySelector('.dk-id');
  unit.hidden = !showUnit;
  // 명령 줄: 옛 부대 판의 공격·전법 단추를 읽는다
  const cmd = q('.ih-cmd'), atkOld = showUnit ? menu.querySelector('[data-menu="attack"]') : null, tacOld = showUnit ? [...menu.querySelectorAll('.dk-acts [data-tactic], [data-tactic]')].filter((b, i, a) => a.indexOf(b) === i).slice(0, 3) : [];
  const showCmd = !!cmd && ((!!atkOld && !atkOld.disabled) || tacOld.some((b) => !b.disabled));
  if (cmd) { cmd.hidden = !showCmd; root.classList.toggle('cmd', showCmd); }
  if (showCmd) {
    cmd.querySelector('.atk').disabled = !atkOld || atkOld.disabled;
    cmd.querySelector('.tac').innerHTML = tacOld.map((b, i) => { const name = (b.childNodes.length ? [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : b.textContent).trim() || b.textContent.trim(); return `<button class="ring tactic-face r${i + 1}${b.dataset.cooldown>0?' cooling':''}" data-cooldown="${b.dataset.cooldown??0}" data-act="tactic" data-tactic="${esc(b.dataset.tactic)}"${b.disabled ? ' disabled' : ''} title="${esc(b.title || b.textContent.trim())}">${icon('cmd-tactic', name[0] ?? '·')}${tacticFaceMarkup(Number(b.dataset.cooldown??0),b.dataset.gauge===undefined?null:Number(b.dataset.gauge),b.dataset.cost===undefined?null:Number(b.dataset.cost))}<small>${esc(name.slice(0, 4))}</small></button>`; }).join('');
  }
  if (showUnit) {
    q('.ih-unit .ih-panel').src = `${H}officer-${tone}.png`;
    setBanner(q('.ih-unit .ih-flag-em'), d.factionId);
    const face = menu.querySelector('.dk-face img'); q('.ih-face img').src = face?.src ?? ''; q('.ih-face').classList.toggle('empty', !face);
    q('.ih-id b').textContent = menu.querySelector('.dk-id h2')?.textContent ?? '';
     q('.ih-id small').textContent = menu.querySelector('.dk-meta')?.textContent ?? '';
     const intent=q('.ih-intent');intent.textContent=d.commandIntent??'';intent.title=intent.textContent;
    const bars = d.unitBars ?? [];
    root.querySelectorAll('.ih-bars i').forEach((el, i) => { const b = bars[i]; el.hidden = !b; if (!b) return; el.title = b.title ?? ''; el.querySelector('u').style.width = `${Math.max(0, Math.min(100, b.pct))}%`; el.querySelector('em').textContent = b.text ?? ''; el.dataset.tone = b.tone ?? ''; });
    const status = d.unitStatus;
    const info = q('.ih-readout');
    const tacticsOpen = info.dataset.unitId === String(status?.id ?? '') && !!info.querySelector('details')?.open;
    info.dataset.unitId = String(status?.id ?? '');
    info.hidden = !status;
    const warnings = [...menu.querySelectorAll('.dk-info .warn')].map(p => p.textContent);
    const supply = menu.querySelector('.supply-line')?.textContent;
    const supplyContext = menu.querySelector('.supply-context')?.textContent;
    const tactics = [...menu.querySelectorAll('[data-tactic]')].map(b => { const label = b.cloneNode(true); label.querySelectorAll('.gi,kbd,.tactic-wait,.tactic-meter').forEach(n => n.remove()); return label.textContent.replace(/\s+/g, ' ').trim(); });
    info.innerHTML = status ? `<p class="ih-state"><b>${statusSymMarkup('action',status.action)}${esc(status.action)}</b>${status.actions?`<span class="ih-actions-left"><span class="${status.actions.move.available?'':'spent'}">${esc(status.actions.move.label)}</span><span class="${status.actions.main.available?'':'spent'}">${esc(status.actions.main.label)}</span></span>`:''}<span>${statusSymMarkup('formation',status.formation)}전열 ${esc(status.formation)}</span></p>${supply ? `<p>${esc(supply)}</p>` : ''}${supplyContext ? `<p>${esc(supplyContext)}</p>` : ''}${warnings.map(t => `<p class="ih-risk">${esc(t)}</p>`).join('')}${tactics.length ? `<details${tacticsOpen ? ' open' : ''}><summary>전법 상태 · ${tactics.length}개</summary>${tactics.map(t => `<p>${esc(t)}</p>`).join('')}</details>` : ''}` : '';
    if(status)info.insertAdjacentHTML('beforeend',`<p class="ih-intent-full">${esc(d.commandIntent??'')}</p><p class="ih-action-help" aria-live="polite"></p>`);
    const btns = [...menu.querySelectorAll('.dk-acts button')].filter((b) => !b.classList.contains('close'));
    const acts = btns.map((b) => ({menu: b.dataset.menu ?? (b.dataset.tactic ? 'tactic' : ''), tactic: b.dataset.tactic ?? '', disabled: b.disabled, title: b.title || b.textContent.trim(), label: (b.childNodes[1]?.textContent ?? b.textContent).trim()}))
      .filter((a) => a.menu && a.menu !== 'officer' && a.menu !== 'close' && !(showCmd && (a.menu === 'attack' || a.menu === 'tactic')))
      .sort((a, b) => (ACT_ORDER.indexOf(a.menu) + 99 * (a.disabled ? 1 : 0)) - (ACT_ORDER.indexOf(b.menu) + 99 * (b.disabled ? 1 : 0))).slice(0, 6);
    q('.ih-acts').innerHTML = acts.map((a) => `<button class="ih-act" data-act="${esc(a.menu)}"${a.tactic ? ` data-tactic="${esc(a.tactic)}"` : ''}${a.disabled ? ' disabled' : ''} title="${esc(a.title)}">${icon(ACT_ICON[a.menu] ?? 'cmd-tactic', a.label[0] ?? '·')}<small>${esc(a.label.replace(/\s.*$/, ''))}</small></button>`).join('');
  }
  const end = old('#end-turn');
  q('.ih-end .ih-end-name').textContent='다음 차례';
  q('.ih-end').disabled = !!end?.disabled;
  q('.ih-end').classList.toggle('blocked', !!end?.classList.contains('blocked'));
  q('.ih-end').classList.toggle('ready', !!end?.classList.contains('ready'));
  const goal=old('#victory-guide');q('.ih-victory').textContent=goal?.textContent??'';q('.ih-victory').title=goal?.title??'';
  q('.ih-end small').textContent = `남은 부대 ${d.remaining??0}`;
  renderCommandBand(root,d,showUnit,menu);
  syncKitHud(root);
  if(document.documentElement.dataset.ui==='kit')q('.ih-end small').textContent=String(d.remaining??0);
  if(document.documentElement.dataset.ui==='kit')for(const c of d.commandRows?.cities??[]){const plate=[...document.querySelectorAll('.w-cityplate')].find(n=>n.dataset.city===c.id);if(plate&&c.face&&!plate.querySelector('.c253-governor')){const img=document.createElementNS('http://www.w3.org/2000/svg','image');img.setAttribute('href',c.face);img.setAttribute('class','c253-governor');img.setAttribute('x','-74');img.setAttribute('y','-8');img.setAttribute('width','24');img.setAttribute('height','28');plate.append(img);}}
}

// C290: screen-space layout; no camera zoom, campaign fields or save changes.
export function kitHudRects290(width,height,scale=1,targeting=false,miniHeight=152){
 const compact=width<1600||scale>1.15, dockX=compact?16:320;
 const dockH=targeting?112:(scale>1.15?232:176), dockW=Math.min(1200,width-dockX-400);
 const rect=(x,y,width,height)=>({x,y,width,height});
 return {compact,list:rect(16,168,288,Math.min(640,height-dockH-200)),
  dock:rect(dockX,height-16-dockH,dockW,dockH),mini:rect(width-388,height-16-miniHeight,248,miniHeight),
  lenses:rect(width-388,height-miniHeight-56,248,32),legend:rect(width-388,height-miniHeight-64-(compact?112:156),248,compact?112:156),
  seal:rect(width-128,height-128,112,112),tasks:rect(width-336,compact?160:88,320,240)};
}
// Try pointer quadrants, then free strips beside actual HUD boxes. Zero overlap wins.
export function miniCameraRect290(width,height,r){
 const x=Math.max(0,Math.min(width,r.x)),y=Math.max(0,Math.min(height,r.y));
 return {x,y,width:Math.max(0,Math.min(width,r.x+r.width)-x),height:Math.max(0,Math.min(height,r.y+r.height)-y)};
}
export function tooltipPlacement290(width,height,size,point,obstacles=[]){
 const w=Math.min(size.width,width-16),h=Math.min(size.height,height-16),gap=16;
 const candidates=[[point.x+gap,point.y+gap],[point.x-w-gap,point.y+gap],[point.x+gap,point.y-h-gap],[point.x-w-gap,point.y-h-gap]];
 for(const r of obstacles)candidates.push([r.left-w-8,point.y-h/2],[point.x-w/2,r.top-h-8],[r.right+8,point.y-h/2],[point.x-w/2,r.bottom+8]);
 const xs=[8,width-w-8,...obstacles.flatMap(r=>[r.left-w-8,r.right+8])],ys=[8,height-h-8,...obstacles.flatMap(r=>[r.top-h-8,r.bottom+8])];
 for(const x of xs)for(const y of ys)candidates.push([x,y]);
 let best=null,score=Infinity;
 for(const [x,y] of candidates){
  const left=Math.max(8,Math.min(x,width-w-8)),top=Math.max(8,Math.min(y,height-h-8));
  const overlap=obstacles.reduce((sum,r)=>sum+Math.max(0,Math.min(left+w,r.right)-Math.max(left,r.left))*Math.max(0,Math.min(top+h,r.bottom)-Math.max(top,r.top)),0);
  const cost=overlap*1e6+Math.hypot(left-point.x,top-point.y);
  if(cost<score){score=cost;best={left,top};}
 }
 return best;
}
export function syncKitHudLayout290(){
 const doc=globalThis.document,root=doc?.documentElement;
 if(root?.dataset.ui!=='kit'||!doc.querySelector)return;
 const targeting=!!doc.querySelector('.nb-band[data-state="unit"][data-targeting="true"]');
 const layout=kitHudRects290(globalThis.innerWidth,globalThis.innerHeight,Number(root.dataset.uiSize??100)/100,targeting,parseFloat(root.style.getPropertyValue?.('--c290-mini-height'))||152);
 root.dataset.c290Compact=String(layout.compact);root.dataset.c290Targeting=String(targeting);
 for(const [name,r] of Object.entries(layout))if(typeof r==='object')for(const [key,value] of Object.entries(r)){const property=`--c290-${name}-${key}`,text=`${value}px`;if(root.style.getPropertyValue(property)!==text)root.style.setProperty(property,text);};
 const list=doc.querySelector('.c236-command-list');
 if(list&&list.dataset.c290Compact!==String(layout.compact)){
  list.dataset.c290Compact=String(layout.compact);list.classList.toggle('collapsed',layout.compact);
  const b=list.querySelector('[data-command-collapse]');if(b){b.textContent=layout.compact?'펼치기':'접기';b.setAttribute('aria-expanded',String(!layout.compact));}
 }
}
globalThis.addEventListener?.('resize',()=>syncKitHudLayout290());

// R2 geometry is presentation-only; no campaign state or save fields.
export const KIT_R2=Object.freeze({list:300,row:56,face:40,lord:88,resource:48,nation:44,system:32,minimap:250,selection:340,selectedFace:56,seal:112,gap:8,margin:16,fonts:[12,13,15,16,17,18,22,24]});
export function kitR2Rects(width,height,miniHeight=146){
 return {list:{x:16,y:180,width:300,height:Math.max(56,height-212)},selection:{x:width-746,y:height-212,width:340,height:196},orders:{x:width-746,y:height-264,width:340,height:44},mini:{x:width-390,y:height-16-miniHeight,width:250,height:miniHeight},seal:{x:width-128,y:height-128,width:112,height:112},switches:{x:width-390,y:height-56-miniHeight,width:250,height:32},tasks:{x:width-316,y:64,width:300,height:96},legend:{x:width-500,y:height-Math.max(280,128+miniHeight)-216,width:360,height:216}};
}
export const C260_COMBAT=Object.freeze({forecastWidth:600,forecastHeight:290,selectionWidth:450,selectionHeight:270,resultMs:2500});
export function combatResultText(c,units){
 const byId=new Map(units.map(u=>[u.id,u]));
 const rows=(c.units??[]).filter(u=>byId.has(u.unitId)).map(u=>{const seen=byId.get(u.unitId),scale=Number.isFinite(seen.count)&&u.preBattleCount>0?seen.count/u.preBattleCount:1,loss=Math.max(0,u.preBattleCount-u.postBattleCount)*scale;return `${seen.name} ${loss>0?'−':''}${troopText(loss)}`;});
 if(c.cityId&&Number.isFinite(c.dealt))rows.push(`성벽 −${c.dealt}`);
 rows.push(...(c.formationChanges??[]).filter(x=>byId.has(x.armyId)).map(x=>`${byId.get(x.armyId).name}군 ${{ORDERED:'정돈',DISORDERED:'흐트러짐',BROKEN:'붕괴'}[x.to]??x.to}`));
 rows.push(...(c.moraleChanges??[]).filter(x=>byId.has(x.armyId)).map(x=>`${byId.get(x.armyId).name}군 ${{STEADY:'안정',SHAKEN:'동요',ROUTING:'패주 — 1칸 물러남'}[x.to]??x.to}`));
 if(c.facingTurned&&byId.has(c.targetId))rows.push(`${byId.get(c.targetId).name} 돌아섬`);
 for(const id of c.eliminatedIds??[])if(byId.has(id))rows.push(`${byId.get(id).name}군 격파`);
 for(const x of c.supplyLoot??[])if(byId.has(x.armyId)&&x.amount>0)rows.push(`군량 노획 +${labelNumber(x.amount)}`);
 rows.push(...(c.uiMerits??[]).map(x=>`${x.name} 실적 +${x.gain} (${x.count}/${x.goal})${x.count>=x.goal?' · 2차 전직 가능':''}`),...(c.uiFates??[]));
 if(c.captureLine)rows.push(c.captureLine);
 return rows.join(' · ');
}
export function kitSelectedHtml(d,name,face){
 const a=d.unitStatus?.actions,r=d.ratings??{},st=d.bandStatus??{},food=d.bandSupply?.supply;
 const rows=[['병력',troopText(d.unitTroops??0)],['군량',food?.perTurn>0?labelNumber(food.stock/food.perTurn)+'차례':'—'],['이동/행동',`${a?.move?.available?'이동 가능':'이동 사용함'} · ${a?.main?.available?'행동 가능':'행동 사용함'}`],['사기/전열',`${st.morale?.text??'—'} · ${st.formation?.text??'—'}`]];
 return `<header class="c253-selected-head">${face?`<img src="${esc(face)}" alt="">`:''}<div><h2>${esc(name)}</h2><p>${esc(d.bandMeta?.replace(/ · 병력.*$/,'')??'부대')}</p></div></header><p class="c290-unit-context">${esc(d.unitLocation??'—')}<br>${esc(d.unitReinforcement??'')}</p><dl>${rows.map(([k,v])=>`<div><dt>${k==='군량'?symImg('resources','food',{size:'sm'}):k==='병력'?symImg('resources','troops',{size:'sm'}):k==='사기/전열'?statusSymMarkup('morale',st.morale?.text)+statusSymMarkup('formation',st.formation?.text):statusSymMarkup('action',v)}${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><details class="c260-unit-details"><summary>상세 ⌄</summary><p>${esc(d.unitLocation??'—')} · 공격/방어/기동 ${esc([r.attack??'—',r.defense??'—',r.mobility??'—'].join(' / '))}</p></details>`;
}
function syncKitR2(root,kit){
 if(kit)syncKitHudLayout290();
 let nation=root.querySelector('.c253-national');
 if(!nation){nation=document.createElement('nav');nation.className='c253-national c253-only';nation.setAttribute('aria-label','나라 기능');nation.innerHTML='<button data-band-news title="이번 차례 소식">소식</button><button data-fwd="#load-again" title="불러오기">불러오기</button>';root.querySelector('.ih').append(nation);}
 if(!root._kitMoves){root._kitMoves=[...root.querySelectorAll('.ih-menu>[data-fwd="#roster-open"],.ih-menu>[data-open],.ih-menu>[data-fwd="#faction"]')].map(node=>{const marker=document.createComment('C253 original menu position');node.before(marker);return {node,marker};});}
 for(const {node,marker} of root._kitMoves){if(kit){if(node.parentElement!==nation)nation.prepend(node);}else if(node.parentElement!==marker.parentElement)marker.before(node);}
 if(kit){
  const faction=root.querySelector('.ih-faction');if(!faction.querySelector('.c253-lord-face')){const im=document.createElement('img');im.className='c253-lord-face';im.alt='';faction.prepend(im);}
  const fid=root.querySelector('.ih-emblem')?.getAttribute('src')?.match(/(F\d+)\.png/)?.[1],art=document.querySelector(`.w-lord[data-pick="${fid}"] .art`)?.getAttribute('style')??'',id=art.match(/(G\d+)/)?.[1];
  if(id){const img=faction.querySelector('.c253-lord-face'),src=`/assets/officer-art/bust/${id}.webp`;if(img.getAttribute('src')!==src)img.setAttribute('src',src);}
  const mini=document.querySelector('#mini');if(mini?.hidden&&!document.querySelector('#game')?.hidden){mini.hidden=false;document.querySelector('.viewport')?.dispatchEvent(new Event('scroll'));}
  const map=mini?.querySelector('.mini-art');if(map){const h=parseFloat(map.style.height)+2;document.documentElement.style.setProperty('--c253-mini-height',`${h}px`);if(mini.style.height!==`${h}px`)mini.style.height=`${h}px`;}
  const todo=root.querySelector('.nb-tasks');if(todo){for(const [i,li] of [...todo.children].entries())li.classList.toggle('c253-extra-task',i>=4);}
 }
 if(!kit){document.querySelector('#mini')?.style.removeProperty('height');}
}

// Kit classes are removed on leaving the mode, including dynamically rendered orders.
export const KIT_CONTROL_SYMBOLS=Object.freeze({
 officers:['global','officers'],council:['global','city'],diplomacy:['global','diplomacy'],faction:['global','faction'],
 victory:['reports','major-event'],save:['actions','confirm'],load:['actions','undo'],settings:['global','settings'],
 help:['global','help'],records:['global','records'],'lens-world':['global','map'],'lens-supply':['lenses','supply'],
 'lens-compare':['controls','sort'],'lens-faction':['lenses','faction'],'lens-diplomacy':['diplomacy','negotiation'],'lens-trace':['controls','search'],'lens-danger':['lenses','danger']
});
export const kitControlSymbol=key=>Object.hasOwn(KIT_CONTROL_SYMBOLS,key)?KIT_CONTROL_SYMBOLS[key]:null;
function syncKitHud(root){
 const kit=document.documentElement.dataset.ui==='kit';
 root.querySelector('.ih-end')?.classList.remove('k-btn','k-btn-primary');
 if(!root.querySelector('.c253-kit-menu')){
  root.querySelector('.ih-menu').insertAdjacentHTML('afterbegin','<button class="c253-kit-menu" data-open="diplomacy" title="외교">외교</button><button class="c253-kit-menu" data-fwd="#faction" title="세력">세력</button>');
 }

 syncKitR2(root,kit);
 if(kit){
  const list=root.querySelector('.c236-command-list'),nav=list?.querySelector('nav');
  if(nav&&nav.parentElement!==list.querySelector('header'))list.querySelector('header').insertBefore(nav,list.querySelector('[data-command-collapse]'));
  const tab=nav?.querySelector('[data-command-tab="unit"]');if(tab){tab.textContent='부대';tab.setAttribute('aria-label','출진 부대');}
  syncMini464();
 }
 const classes={
  'k-medallion':'.ih-menu>button,.c253-national>button,.c236-map-switches button,.nb-hero',
  'k-seal-turn':'.ih-end', 'k-badge':'.nb-badge,.ih-end small',
  'k-tabs':'.c236-command-list nav',
  'k-tab':'.c236-command-list nav button',
  'k-plate':'.c253-city-plate',
  'k-panel-ink':'.nb-selected,.city-quick',
  'k-card-paper':'.w-card.w-event',
  'k-name':'.nb-selected h2,.city-quick h2',
  'k-btn':'.nb-orders button:not(.ih-end),.nb-more button,.city-quick button',
  'k-btn-primary':'.nb-orders [data-act="attack"],.nb-orders [data-act="sortie"]'
 };
 for(const [name,selector] of Object.entries(classes))for(const node of document.querySelectorAll(selector))node.classList.toggle(name,kit);
 for(const b of root.querySelectorAll('.ih-menu>button,.c253-national>button,.c236-map-switches button')){
  const key=b.id==='c186-danger'?'danger':b.dataset.mode??(b.hasAttribute('data-band-settings')?'settings':b.hasAttribute('data-band-goal')?'victory':b.hasAttribute('data-band-news')?'records':b.dataset.open?b.dataset.open:({'#c186-danger':'danger','#roster-open':'officers','#save':'save','#rules-open':'help','#load-again':'load','#faction':'faction','#diplo-open':'diplomacy'})[b.dataset.fwd]);
  const icon=({world:'terrain',trace:'scout'})[key]??key;
  b.classList.toggle('is-on',kit&&b.getAttribute('aria-pressed')==='true');
  const pair=kitControlSymbol(b.dataset.mode?'lens-'+b.dataset.mode:icon==='danger'?'lens-danger':icon);
  if(kit&&pair){b.style.setProperty('--icon',`url("${symUrl(...pair)}")`);b.setAttribute('aria-label',b.title||(b.hasAttribute('data-band-settings')?'설정':b.textContent.trim()));}
  else b.style.removeProperty('--icon');
  const oldSym=b.querySelector('.c268-menu-sym');if(!kit&&pair&&!oldSym)b.insertAdjacentHTML('afterbegin',symImg(...pair,{className:'c268-menu-sym'}));else if(kit)oldSym?.remove();
  if(kit)b.style.order=String(({officers:1,council:2,diplomacy:3,faction:4,victory:5,save:6,settings:7})[icon]??8);else b.style.removeProperty('order');
 }
}

const hudBoxes486=new WeakMap(),hudMeasureJobs486=new Map();
let hudMeasureFrame486=null,hudResizeObserver486=null;
function scheduleHudMeasure486(node,measure){
 hudMeasureJobs486.set(node,measure);if(hudMeasureFrame486!==null)return;
 hudMeasureFrame486=requestAnimationFrame(()=>{hudMeasureFrame486=null;const jobs=[...hudMeasureJobs486.values()];hudMeasureJobs486.clear();for(const job of jobs)job();});
}
function hudBox486(node,onResize){
 let box=hudBoxes486.get(node);if(box){box.onResize=onResize;return box;}
 box={width:node.clientWidth,height:node.clientHeight,onResize};hudBoxes486.set(node,box);
 if(typeof ResizeObserver==='function'){
  hudResizeObserver486??=new ResizeObserver(entries=>{for(const e of entries){const b=hudBoxes486.get(e.target);if(!b)continue;
   const css=getComputedStyle(e.target),width=e.contentRect.width+(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0),height=e.contentRect.height+(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0);
   if(width===b.width&&height===b.height)continue;b.width=width;b.height=height;scheduleHudMeasure486(e.target,b.onResize);
  }});
  hudResizeObserver486.observe(node);
 }
 return box;
}
function syncMini464(measuring=false){
 if(globalThis.document?.documentElement.dataset.ui!=='kit')return;
 const mini=document.querySelector('#mini'),art=mini?.querySelector('.mini-art');
 if(!art)return;
 if(measuring!==true){scheduleHudMeasure486(mini,()=>syncMini464(true));return;}
 const painting=document.querySelector('.w-art.w-world')?.getAttribute('href');
 if(painting)art.style.backgroundImage=`url("${painting}")`;
 // Uniform cover crop. Existing city/unit/viewport coordinates and click mapping
 // share the very same transform; no independent stretching of the painting.
 const w=parseFloat(art.style.width)||246,h=parseFloat(art.style.height)||64;
 const box=hudBox486(mini,()=>syncMini464(true)),fw=box.width-2,fh=box.height-2,scale=Math.max(fw/w,fh/h);
 const view=art.querySelector('.mini-view');
 const cx=view?parseFloat(view.style.left)+parseFloat(view.style.width)/2:w/2;
 const cy=view?parseFloat(view.style.top)+parseFloat(view.style.height)/2:h/2;
 mini.style.setProperty('--c464-mini-scale',String(scale));
 mini.style.setProperty('--c464-mini-pan-x',`${Math.max(fw-w*scale,Math.min(0,fw/2-cx*scale))}px`);
 mini.style.setProperty('--c464-mini-pan-y',`${Math.max(fh-h*scale,Math.min(0,fh/2-cy*scale))}px`);
}
globalThis.addEventListener?.('resize',syncMini464);

// C147: the band forwards every order to the existing unit menu.
function mountCommandBand(root){
 document.body.classList.add('hud-band');
 root.querySelector('.ih').insertAdjacentHTML('beforeend',`<nav class="nb-bookmarks" aria-label="갈피"><button data-band-map aria-expanded="false">지도 보기 ▸ <span>지형</span></button><div class="nb-map-options" hidden>${RAIL.map(([m,label])=>`<button data-mode="${m}">${icon(({world:'mode-terrain',supply:'mode-supply',faction:'mode-faction',diplomacy:'mode-diplomacy',trace:'mode-explore'})[m],label)}${label}</button>`).join('')}</div><button data-fwd="#roster-open">장수</button><button data-open="council">평정 <b class="nb-badge"></b></button></nav><button class="nb-news-tab" data-band-news aria-expanded="false">소식 0</button><p class="nb-news-peek" hidden></p><section class="nb-sheet" hidden aria-label="부대 상세 설명"><button data-band-info aria-label="설명 닫기">${symImg('controls','close',{size:'sm'})}닫기</button><div></div></section><section class="nb-band" data-state="rest" aria-label="군령 띠"><div class="nb-content"></div></section>`);
 root.querySelector('.nb-bookmarks').insertAdjacentHTML('afterbegin',`<div class="nb-map-tabs">${RAIL.map(([m,label])=>`<button data-mode="${m}">${icon(({world:'mode-terrain',supply:'mode-supply',faction:'mode-faction',diplomacy:'mode-diplomacy',trace:'mode-explore'})[m],label)}${label}</button>`).join('')}</div>`);
 root.querySelector('.ih-menu').prepend(...root.querySelectorAll('.nb-bookmarks > [data-fwd],.nb-bookmarks > [data-open]'));
 root.querySelector('.ih-menu').insertAdjacentHTML('afterbegin','<button data-band-goal aria-expanded="false">승리 조건</button>');
 root.querySelector('.ih-menu [data-fwd="#load-again"]').textContent='불러오기';
 const topLeft=document.createElement('div');topLeft.className='nb-top-left';
 root.querySelector('.ih-top').prepend(topLeft);
 for(const s of ['.ih-faction','.ih-date','.ih-res'])topLeft.append(root.querySelector(s));
 root.querySelector('.ih-menu').insertAdjacentHTML('beforeend','<button data-band-settings aria-label="설정" aria-expanded="false">⚙</button><section class="nb-settings" hidden aria-label="설정 메뉴"></section>');
 const settingsHost=root.querySelector('.nb-settings');mountSettingsPanel(settingsHost);document.body.append(settingsHost);
 root.querySelector('.ih').insertAdjacentHTML('beforeend','<aside class="nb-selected" hidden aria-label="선택 부대"></aside><aside class="nb-advisor-box" aria-label="군사 조언"></aside><p class="nb-forecast-status"></p>');
 root.querySelector('.ih').insertAdjacentHTML('beforeend','<header class="nb-state-title" hidden><h1></h1><p></p></header><aside class="nb-supply" hidden aria-label="선택 부대 보급"></aside><section class="nb-todo-panel" aria-label="이번 차례 할 일"></section>');
 root.querySelector('.nb-todo-panel').append(root.querySelector('.nb-news-tab'));
 root.querySelector('.nb-todo-panel').insertAdjacentHTML('beforeend','<ol class="nb-tasks" hidden></ol>');
 root.querySelector('.nb-band').append(root.querySelector('.ih-end'));
 mountCommandScreen(root);
 syncKitHud(root);
 new MutationObserver(records=>{if(records.some(r=>r.target instanceof Element&&r.target.matches('.city-quick')||[...r.addedNodes].some(n=>n instanceof Element&&n.matches('.city-quick'))))syncKitHud(root);}).observe(document.body,{childList:true,subtree:true});
 root.querySelector('.nb-band').insertAdjacentHTML('beforeend','<p class="nb-end-warning"></p>');
 const judgment=e=>{const b=e.target.closest?.('[data-judgment]'),line=root.querySelector('.c279-command-preview');if(b&&line)line.textContent=b.dataset.judgment;};
 root.addEventListener('pointerover',judgment);root.addEventListener('focusin',judgment);
 const toggle=(selector,button)=>{const panel=selector==='.nb-settings'?settingsHost:root.querySelector(selector);panel.hidden=!panel.hidden;button?.setAttribute('aria-expanded',String(!panel.hidden));if(selector==='.nb-settings'&&!panel.hidden)panel.querySelector('button').focus();document.dispatchEvent(new CustomEvent('ink:uncover'));};
 root.addEventListener('click',e=>{
  if(e.target.closest('[data-band-info]'))toggle('.nb-sheet',e.target.closest('[data-band-info]'));
  if(e.target.closest('[data-band-more]'))toggle('.nb-more',e.target.closest('[data-band-more]'));
  if(e.target.closest('[data-band-map]'))toggle('.nb-map-options',e.target.closest('[data-band-map]'));
  if(e.target.closest('[data-band-next]'))document.dispatchEvent(new CustomEvent('ink:next-unit'));
  if(e.target.closest('[data-band-news]')){if(['l0','kit'].includes(document.documentElement.dataset.ui)){const panel=root.querySelector('.nb-tasks'),open=panel.hidden;panel.hidden=!open;if(document.documentElement.dataset.ui==='kit')root.dataset.kitTasksCollapsed=String(!open);root.querySelector('.nb-news-tab').setAttribute('aria-expanded',String(open));return;}const open=root.classList.toggle('nb-news-open');root.querySelector('.nb-news-tab').setAttribute('aria-expanded',String(open));document.dispatchEvent(new CustomEvent('ink:uncover'));}
  if(e.target.closest('[data-band-goal]'))toggle('.ih-victory',e.target.closest('[data-band-goal]'));
  if(e.target.closest('[data-band-settings]'))toggle('.nb-settings',e.target.closest('[data-band-settings]'));
  if(e.target.closest('.nb-map-options [data-mode]')){root.querySelector('.nb-map-options').hidden=true;root.querySelector('[data-band-map]').setAttribute('aria-expanded','false');}
 });
 const help=e=>{const b=e.target.closest?.('.nb-orders [data-act]');if(b){const line=root.querySelector('.nb-help');if(line)line.textContent=b.disabled?b.title:ACTION_MEANING[b.dataset.act]??b.title;}};
 root.addEventListener('pointerover',help);root.addEventListener('focusin',help);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=['.nb-sheet','.nb-more','.nb-map-options','.nb-settings'].map(s=>root.querySelector(s)).filter(n=>n&&!n.hidden);if(open.length||root.classList.contains('nb-news-open')){open.forEach(n=>n.hidden=true);root.classList.remove('nb-news-open');root.querySelectorAll('[aria-expanded="true"]').forEach(n=>n.setAttribute('aria-expanded','false'));e.preventDefault();e.stopImmediatePropagation();return;}if(root.querySelector('.nb-supply:not([hidden])')){document.querySelector('#mode-rail [data-mode="world"]')?.click();e.preventDefault();e.stopImmediatePropagation();}},true);
 const mini=document.querySelector('#mini');if(mini)new MutationObserver(()=>{if(document.documentElement.dataset.ui!=='kit')return;const art=mini.querySelector('.mini-art');if(!art)return;syncMini464();const height=parseFloat(art.style.height)+2,value=height+'px';if(mini.style.height!==value){mini.style.height=value;document.documentElement.style.setProperty('--c253-mini-height',value);}}).observe(mini,{childList:true});
 document.addEventListener('ink:forecast',e=>{
  const band=root.querySelector('.nb-band'),content=root.querySelector('.nb-content');
  if(document.documentElement.dataset.ui==='kit'){
   root.querySelector('.c352-card')?.remove();
   if(e.detail)root.insertAdjacentHTML('beforeend',bandForecastHtml(e.detail.html,e.detail.colors));
   return;
  }
  if(e.detail){band.append(root.querySelector('.ih-end'));setBandState(band,'forecast');content._renderedHtml=null;content.innerHTML=bandForecastHtml(e.detail.html,e.detail.colors);
   root.querySelector('.nb-state-title').hidden=false;root.querySelector('.nb-state-title h1').textContent='교전 예고';root.querySelector('.nb-state-title p').textContent='';root.querySelector('.nb-supply').hidden=true;
   root.querySelector('.nb-sheet').hidden=true;fitForecastStatus(root.querySelector('.nb-forecast-status'));}
  else if(band.dataset.state==='forecast'){band.append(root.querySelector('.ih-end'));content.innerHTML=band._unitHtml??'';fitBandOrders(content);setBandState(band,band._unitState??'rest');renderBandSupply(root,band._supplyData??{});}
 });
}
// Rearrange the existing public preview; combat values and shown enemy counts stay in world.js.
function fitForecastStatus(line,measuring=false){
 if(!line)return;
 if(!measuring&&typeof scheduleHudMeasure486==='function'){scheduleHudMeasure486(line,()=>fitForecastStatus(line,true));return;}
 const width=typeof hudBox486==='function'?hudBox486(line,()=>fitForecastStatus(line,true)).width:line.clientWidth;
 const key=[line.innerHTML,width,globalThis.innerWidth,globalThis.innerHeight,document.documentElement.dataset.ui,document.documentElement.dataset.uiSize].join('|');
 if(line.__fit370===key)return;line.__fit370=key;
 line.style.removeProperty('font-size');
 if(!width)return;
 const css=getComputedStyle(line),padding=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight),gap=parseFloat(css.columnGap)||0;
 const spans=[...line.children],needed=spans.reduce((sum,n)=>sum+n.getBoundingClientRect().width,0),available=width-padding-gap*Math.max(0,spans.length-1);
 if(needed>available&&available>0)line.style.setProperty('font-size',`${parseFloat(css.fontSize)*available/needed}px`,'important');
}
// C292: values arrive from public preview/committed records; presentation never predicts rules.
export function battleResultRows292(c,units){
 const known=new Map(units.map(u=>[u.id,u]));
 const order=id=>id===c.attackerId?0:id===c.targetId?1:2;
 return (c.units??[]).filter(r=>known.has(r.unitId)).sort((a,b)=>order(a.unitId)-order(b.unitId)).map(r=>{
  const u=known.get(r.unitId),scale=Number.isFinite(u.count)&&r.preBattleCount>0?u.count/r.preBattleCount:1;
  return {id:r.unitId,name:u.name,face:u.portrait,before:troopText(r.preBattleCount*scale),after:troopText(r.postBattleCount*scale),loss:troopText(Math.max(0,r.preBattleCount-r.postBattleCount)*scale)};
 });
}
export function battleResultDock292(c,units){
 const rows=battleResultRows292(c,units),text=c.uiCity&&Number.isFinite(c.dealt)?`${c.uiCity.name} 성벽 −${c.dealt} / 남음 ${c.uiCity.durability??'미확인'}${c.captureLine?' · '+c.captureLine:''}`:combatResultText(c,units);
 return `<section class="c292-result-dock" aria-label="확정 교전 결과"><header><b>결과 · 확정</b><p role="status">${esc(text)}</p></header><div class="c292-result-rows">${c.uiCity?`<section><b>${esc(c.uiCity.name)} · 성벽</b><p>${esc(c.uiCity.durability??'미확인')} / ${esc(c.uiCity.durabilityMax??'미확인')}</p><strong>${c.captureLine?'함락':c.uiCity.durability===0?'성벽 파괴':'성벽 피해'}</strong></section>`:''}${rows.map(r=>`<section>${r.face?`<img src="${esc(r.face)}" alt="">`:''}<b>${esc(r.name)}</b><p>${r.before} → ${r.after}</p><strong>병력 손실 ${r.loss==='0'?'':'−'}${r.loss}</strong></section>`).join('')}</div><small>지도 상태 갱신 완료 · 전투기록에서 다시 보기</small></section>`;
}
// C352 r2: Civ VI reference uses a screen-corner comparison, not a target follower.
export const FORECAST_REFERENCE352=Object.freeze({width:694,height:238,name:20,number:34,bar:12,gutter:7,rightRatio:20/1920});
export function compactForecastPlacement352(width,height,box,target,obstacles=[]){
 const w=Math.min(box.width,Math.max(0,width-16)),h=Math.min(box.height,Math.max(0,height-16)),gap=FORECAST_REFERENCE352.gutter;
 const clamp=(v,max)=>Math.max(8,Math.min(v,Math.max(8,max-8)));
 const preferred={left:width-w-Math.max(gap,width*FORECAST_REFERENCE352.rightRatio),top:height-h-gap};
 const xs=[preferred.left,gap,target.right+gap,target.left-w-gap];
 const ys=[preferred.top,...obstacles.map(t=>t.top-h-gap),target.top-h-gap,gap];
 const candidates=xs.flatMap(left=>ys.map(top=>({left:clamp(left,width-w),top:clamp(top,height-h)})));
 const overlap=(p,t)=>Math.max(0,Math.min(p.left+w,t.right+gap)-Math.max(p.left,t.left-gap))*Math.max(0,Math.min(p.top+h,t.bottom+gap)-Math.max(p.top,t.top-gap));
 const score=p=>[target,...obstacles].reduce((n,t)=>n+overlap(p,t),0)*10000+Math.hypot(p.left-preferred.left,p.top-preferred.top);
 return candidates.sort((a,b)=>score(a)-score(b))[0];
}
export function compactForecastRow352(cls,name,face,pair,label='병력'){
 const officer=face?.match(/\/officer-art\/cutout\/(G\d+)[-\.]/)?.[1];if(officer)face=`/assets/officer-art/bust/${officer}.webp`;
 const before=Number(pair?.[1]?.replaceAll(',','')),after=Number(pair?.[2]?.replaceAll(',',''));
 const remaining=Number.isFinite(before)&&before>0&&Number.isFinite(after)?Math.max(0,Math.min(100,after/before*100)):100;
 return `<section class="nb-preview-${cls} c352-row" style="--c352-remaining:${remaining}%"><span class="nb-preview-portrait">${face?`<img src="${esc(face)}" alt="">`:'城'}</span><b><small>${cls==='ally'?'공격자':'대상'} · </small>${esc(name)}</b><p class="nb-preview-count" aria-label="${esc(label)} 지금 → 교전 후"><span>${esc(pair?.[1]??'—')} → ${esc(pair?.[2]??'—')}</span></p><div class="c352-bar" aria-hidden="true"></div></section>`;
}
function compactForecast352(full,rows,kind,counter,mods,confirm){
 if(counter==='반격')counter='반격 있음';
 // Preserve the previous full dock behind an explicit native details control.
 const expanded=full.replace('nb-forecast c260-forecast c292-battle-dock','nb-forecast c292-battle-dock c352-legacy');
 return `<section class="nb-forecast c260-forecast c352-card k-panel-ink" data-battle-stage="preview" aria-label="교전 예고"><header><b>교전 예고 · ${esc(kind)}</b></header><div class="c352-rows">${rows}</div><div class="c352-mods" title="${esc(counter)}"><span>${esc(counter)}</span>${mods.slice(0,3).map(m=>`<span title="${esc(m.description??m.text)}">${symImg('actions','attack',{size:'sm'})}${esc(m.text)}</span>`).join('')}</div><footer>${confirm||'<button type="button" data-c260-attack>클릭 = 공격</button>'}<button type="button" data-c260-cancel aria-label="교전 예고 닫기">취소 · Esc</button></footer><details class="c352-details"><summary>펼치기</summary>${expanded}</details></section>`;
}
export function bandForecastHtml(html,colors={}){
 const source=document.createElement('div');source.innerHTML=html;
 const text=s=>source.querySelector(s)?.textContent.trim()??'',picture=s=>source.querySelector(s)?.getAttribute('src')??'';
 colors={ally:source.querySelector('.fc-vs')?.getAttribute('data-ally-color')??'var(--fc)',enemy:source.querySelector('.fc-vs')?.getAttribute('data-enemy-color')??'#817966',...colors};
 const city=!!source.querySelector('.fc-dur'),range=s=>text(s).match(/(\d[\d,]*)\s*→\s*(\d[\d,]*)/);
 const extra=cls=>source.querySelector(`.fc-col.${cls} .c266-public`)?.outerHTML??'';
 const side=(cls,name,face,pair,loss,label='병력')=>globalThis.document?.documentElement?.dataset.ui==='kit'?`<section class="nb-preview-${cls}" style="--side-color:${esc(colors[cls]??'var(--sg-map-line)')}"><span class="nb-preview-portrait ${cls}">${face?`<img src="${esc(face)}" alt="${esc(name)}">`:'<span class="nb-city-mark" aria-label="성벽">城</span>'}</span><div class="nb-preview-values"><b>${cls==='ally'?'공격자':'대상'} · ${esc(name)}</b><p class="nb-preview-count"><small>${label==='내구'?'성벽':label}</small> ${esc(pair?.[1]??'—')} → ${esc(pair?.[2]??'—')}</p><p class="nb-preview-loss"><small>예상 ${label==='내구'?'성벽 피해':'병력 손실'}</small><strong>−${esc(loss||'—')}</strong></p>${cls==='ally'?`<small class="c292-counter">${text('.fc-tag')||text('.fc-counter')||(city?'수비대 반격 예상':'반격 조건 미확인')}</small>`:''}</div></section>`:`<section class="nb-preview-${cls}" style="--side-color:${esc(colors[cls]??'#817966')}"><span class="nb-preview-portrait ${cls}">${face?`<img src="${esc(face)}" alt="${esc(name)}">`:'<span class="nb-city-mark" aria-label="성">城</span>'}</span><div class="nb-preview-values"><b>${esc(name)}</b>${extra(cls)}<p class="nb-preview-count"><small>${label}</small> ${esc(pair?.[1]??'—')} <span>→</span> ${esc(pair?.[2]??'—')}</p><p class="nb-preview-loss"><small>${city&&cls==='enemy'?'피해':cls==='ally'?(text('.fc-counter')||(city?'성 반격':'반격')):'예상 손실'}</small><strong>${cls==='ally'&&loss==='0'?'반격 없음':esc(loss)}</strong></p>${label==='병력'?`<div class="nb-soldiers" aria-label="보이는 병력의 예상 잔존 비율">${Array.from({length:10},(_,i)=>`<img src="${H}kit/soldier.png" alt="" class="${i>=Math.round(Number(pair?.[2]?.replaceAll(',',''))/Math.max(1,Number(pair?.[1]?.replaceAll(',','')))*10)?'lost':''}">`).join('')}</div>`:''}</div></section>`;
 const ownPair=range(city?'.nb-city-ally small':'.fc-col.ally small'),foePair=range(city?'.fc-dur':'.fc-col.enemy small');
 const ownLoss=city?(text('.nb-city-ally').match(/예상 손실 ([\d,]+)/)?.[1]??'0'):text('.fc-col.ally small span').replace(/^−/,''),foeLoss=city?([...source.querySelectorAll('.fc-sum')].map(n=>n.textContent).join(' ').match(/내구\s*−(\d+)/)?.[1]??'—'):text('.fc-col.enemy small span').replace(/^−/,'');
 const title=text('.fc-title'),parts=title.split(' · '),kind=city?(parts.slice(0,-1).join(' · ')||'성벽 공격'):(text('.fc-dir')||title||'정면 공격'),enemyName=city?(parts.at(-1)||title):text('.fc-col.enemy b');
 let mods=forecastModifiers([...source.querySelectorAll('.fc-mods li')].map(n=>{const detail=n.querySelector('small')?.textContent.trim()||'',text=n.textContent.trim();return {text:detail&&text.endsWith(detail)?text.slice(0,-detail.length).trim():text,description:detail||n.getAttribute('title')||'',side:n.getAttribute('data-side')??'ally'};}));
 if(globalThis.document?.documentElement?.dataset.ui==='kit')mods=[...new Map(mods.map(m=>[m.text,m])).values()];
 const risks=[...source.querySelectorAll('.fc-risk')].map(n=>n.textContent.trim());
 const threat=source.querySelector('.fc-threat')?.textContent.trim()??'';
 const targets=(source.querySelector('.fc-targets')?.outerHTML??'').replaceAll(globalThis.document?.documentElement?.dataset.ui==='kit'?'아군 반격 손실':'\u0000','아군 피해');
 const tacticEffects=source.querySelector('.c292-tactic-effects')?.outerHTML??'',effectSummary=source.querySelector('.c292-effects-summary')?.outerHTML??'';
 const effectTexts=[...source.querySelectorAll('.c292-tactic-effects p')].map(n=>n.textContent.trim()),orderedReasons=[...new Set([...source.querySelectorAll('.fc-mods li')].map(n=>n.textContent.trim()))].filter(text=>!effectTexts.includes(text));
 const tacticCommand=text('.fc-command'),confirm=source.querySelector('.fc-tactic-confirm');
 const confirmHtml=confirm?confirm.outerHTML.replace('class="fc-tactic-confirm"','class="nb-click"'):'<b class="nb-click">공격 확정<small>적 칸 클릭</small></b>';
 const cancelHtml=confirm?'<button type="button" class="nb-cancel" data-tactic-cancel>취소 · Esc</button>':'<small class="nb-cancel">취소 · Esc</small>';
 if(globalThis.document?.documentElement?.dataset.ui==='kit'&&confirm&&!source.querySelector('.fc-vs')){
  const full=`<section class="nb-forecast c260-forecast c292-battle-dock" data-battle-stage="preview"><header class="c260-forecast-head"><span class="c292-stage">예상</span><b>${esc(tacticCommand||'전법 대상 선택')}</b></header><div class="c292-effect-info">${effectSummary}${source.querySelector('.c248-executor')?.outerHTML??''}<p>${esc(text('.fc-sum'))}</p>${source.querySelector('.c292-tactic-cost')?.outerHTML??''}${tacticEffects}${targets}${risks.map(r=>`<p>${esc(r)}</p>`).join('')}<small>반격 여부·부가 상태는 아래 엔진 예고 참조</small>${mods.map(m=>`<p>${esc(m.text)}</p>`).join('')}</div><footer>${confirmHtml}<button data-tactic-cancel>취소 · Esc</button></footer></section>`;
   return compactForecast352(full,`<p class="c352-effect-label">${esc(tacticCommand||text('.fc-sum'))}</p>`,tacticCommand,'',mods,confirmHtml);
 }
 if(globalThis.document?.documentElement?.dataset.ui==='kit'){
  const ratio=pair=>Number(pair?.[2]?.replaceAll(',',''))||0,own=ratio(ownPair),foe=ratio(foePair);
  const grouped=source.querySelector('.fc-mods [data-side]'),shown=grouped?['ally','enemy'].flatMap(side=>mods.filter(m=>m.side===side).slice(0,risks.length?1:2)):mods.slice(0,risks.length?2:3),extra=mods.length-shown.length;
  const sideRows={ally:0,enemy:0};
  const modifier=m=>{const pair=m.text.match(/^(.*?)([×x]\s*\d+(?:\.\d+)?|[+＋−-]\s*\d+(?:\.\d+)?\s*%)$/);return `<li data-side="${esc(m.side??'ally')}" ${grouped?`style="grid-row:${++sideRows[m.side??'ally']}"`:''} title="${esc(m.description)}"><span>${esc(pair?.[1]??m.text)}</span>${pair?`<b>${esc(pair[2])}</b>`:''}</li>`;};
  const full=`<section class="nb-forecast c260-forecast c292-battle-dock k-panel-ink" data-battle-stage="preview" style="--ally-color:${esc(colors.ally)};--enemy-color:${esc(colors.enemy)}"><header class="c260-forecast-head"><span class="c292-stage">예상</span>${source.querySelector('.fc-dir svg')?.outerHTML??''}<b title="${esc(source.querySelector('.fc-res')?.getAttribute('title')??'')}">${esc([tacticCommand||kind,text('.fc-res')].filter(Boolean).join(' · '))}</b><small>${terrainSymMarkup(text('.fc-terrain'))}${esc(text('.fc-terrain'))}</small></header><div class="c266-tactics">${source.querySelector('.c292-tactic-cost')?.outerHTML??''}${[...source.querySelectorAll('.c266-tactic-switch')].map(n=>n.innerHTML).join('')}</div><div class="c260-duel">${symImg('actions','attack',{label:'대결',className:'c266-vs'})}${side('ally',text(city?'.nb-city-ally b':'.fc-col.ally b'),picture(city?'.nb-city-ally img':'.fc-col.ally img'),ownPair,ownLoss)}${side('enemy',enemyName,city?'':picture('.fc-col.enemy img'),foePair,foeLoss,city?'내구':'병력')}</div><div class="c260-balance" aria-label="예상 잔존 병력 비율"><i style="width:${own+foe?own/(own+foe)*100:50}%"></i></div>${effectSummary}<ul class="c260-mods">${shown.map(modifier).join('')}${risks.length?`<li class="nb-preview-risk" title="${esc(risks.join(' · '))}">${esc(risks[0])}</li>`:''}</ul>${extra?`<small class="c260-extra" title="${esc(mods.filter(m=>!shown.includes(m)).map(m=>m.text).join(' · '))}">+${extra}</small>`:''}<details class="c292-reasons"><summary>${tacticCommand?'대상·효과·계산 근거':'계산 근거 · 공격 → 반격'}</summary><div>${orderedReasons.map(text=>`<p>${esc(text)}</p>`).join('')}${tacticEffects}${targets}${risks.map(r=>`<p>${esc(r)}</p>`).join('')}</div></details><footer><span>대상 확인 후 확정</span>${confirm?confirmHtml:`<button type="button" class="k-btn k-btn-primary" data-c260-attack>${esc(enemyName)} 공격</button>`}<button type="button" data-c260-cancel>취소 · 오른쪽 클릭/Esc</button></footer>${threat?`<small class="c260-threat" title="${esc(threat)}">${esc(threat)}</small>`:''}</section>`;
   const rows=compactForecastRow352('ally',text(city?'.nb-city-ally b':'.fc-col.ally b'),picture(city?'.nb-city-ally img':'.fc-col.ally img'),ownPair)+compactForecastRow352('enemy',enemyName,city?'':picture('.fc-col.enemy img'),foePair,city?'성벽':'병력');
   return compactForecast352(full,rows,tacticCommand||kind,text('.fc-tag')||text('.fc-counter')||(city?'수비대 반격 예상':'반격 조건 미확인'),mods,confirm?confirmHtml:'');
 }
 const commandStyle=tacticCommand?' style="display:block;white-space:normal;text-align:center;overflow:visible"':'';
 return `<div class="nb-forecast" style="--ally-color:${esc(colors.ally)};--enemy-color:${esc(colors.enemy)}" title="${esc([...mods.map(m=>m.text),...risks].join('\n'))}">${side('ally',text(city?'.nb-city-ally b':'.fc-col.ally b'),picture(city?'.nb-city-ally img':'.fc-col.ally img'),ownPair,ownLoss)}<section class="nb-preview-middle"><i aria-hidden="true"></i><b>${esc(tacticCommand&&!title?'전법 예고':kind)}</b><span${commandStyle}>${esc(tacticCommand||[text('.fc-res'),text('.fc-tag')].filter(Boolean).join(' · '))}</span></section>${side('enemy',enemyName,city?'':picture('.fc-col.enemy img'),foePair,foeLoss,city?'내구':'병력')}<aside class="nb-preview-mods">${mods[0]?`<b>${esc(mods[0].text)}</b><p>${esc(mods[0].description||mods[1]?.text||'')}</p>`:''}${risks.length?`<small class="nb-preview-risk" title="${esc(risks.join('\n'))}">${esc(risks[0])}</small>`:''}</aside>${threat?`<p class="nb-preview-threat">${esc(threat)}</p>`:""}${targets}<div class="c266-tactics">${[...source.querySelectorAll('.c266-tactic-switch')].map(n=>n.innerHTML).join('')}</div>${globalThis.document?.documentElement?.dataset.ui==='kit'&&confirm?(source.querySelector('.c253-odds')?.outerHTML??''):''}${confirmHtml}${cancelHtml}</div>`;
}
// Rank only numbers already present in the public forecast; no combat calculation here.
export function forecastModifiers(mods){
 const weight=text=>Math.max(0,...[...text.matchAll(/(?:[+＋−-]\s*(\d+(?:\.\d+)?)\s*%|[×x]\s*(\d+(?:\.\d+)?))/g)].map(m=>m[1]?Number(m[1]):Math.round(Math.abs(Number(m[2])-1)*10000)/100));
 return mods.map(m=>({...m,weight:weight(m.text)})).sort((a,b)=>b.weight-a.weight);
}
// Public supply snapshot only. No route, future stock, or coverage set is invented.
export function bandSupplyHtml(d){
 const a=d.bandSupply;if(!a)return '<h2>선택 부대</h2><p>부대를 선택하면 보급 상태를 볼 수 있습니다.</p>';
 const s=a.supply;if(!s)return `<h2>선택 부대</h2><b>${esc(a.name)}</b><p>보급 정보 없음</p>`;
 const stock=s.perTurn>0?s.stock/s.perTurn:null,max=s.perTurn>0?s.max/s.perTurn:null;
 const next=s.model==='clock'?(s.draining?(s.state==='DISRUPTED'?'차례마다 반 차례분 감소':s.state==='CUT'?'차례마다 한 차례분 감소':'보급 상태에 따라 감소'):'보급권 안 · 차례마다 가득 채움'):'기존 군량 규칙 · 상세의 소비량 확인';
 return `<h2>선택 부대</h2><b class="nb-supply-name">${esc(a.name)}</b><p class="nb-supply-tag ${s.draining?'warn':''}">${statusSymMarkup('supply',s.state)}${esc(a.label)}</p><h3 class="nb-carry-title">휴대 군량</h3><div class="nb-supply-gauge" role="img" aria-label="휴대 군량 ${labelNumber(stock)}/${labelNumber(max)}차례분">${Array.from({length:5},(_,i)=>`<i style="--fill:${stock!==null&&max>0?Math.max(0,Math.min(1,stock/max*5-i))*100:0}%"></i>`).join('')}</div><p class="nb-supply-count">${labelNumber(stock)}/${labelNumber(max)}차례분</p><p class="nb-supply-next">다음 변화 · ${esc(next)}</p><section class="nb-supply-source">${a.source?`<h3>${esc(a.source.name)}${a.source.besieged?' · 포위':''}</h3><p>성 식량 <b>${labelNumber(a.source.foodStock)} / ${labelNumber(a.source.foodCapacity)}</b></p>`:a.hub?`<h3>보급 거점</h3><p>거점 재고 <b>${labelNumber(a.hub.stock)}</b></p>`:''}<p>공급 <b class="${a.blocked||a.source?.besieged?'warn':''}">${a.blocked||a.source?.besieged?'차단':a.source||a.hub?'연결':'원천 없음'}</b></p><p>${esc(a.context||'알려진 보급 원천 없음')}</p>${a.blocked?`<p class="warn">${esc(a.blocked)}</p>`:''}<small>성 창고와 부대 휴대량은 별도입니다.</small></section><blockquote>길이 끊긴 곳에,<br>굶주림이 전장의 주인이 된다.</blockquote>`;
}
export function selectedUnitHtml(d,l0=false){
 const a=d.bandSupply,s=a?.supply,r=d.ratings,st=d.bandStatus??{};
 const stock=s?.perTurn>0?s.stock/s.perTurn:null,max=s?.perTurn>0?s.max/s.perTurn:null;
 const rows=[['location','있는 곳',d.unitLocation],['troops','병력',troopText(d.unitTroops??0)],['reinforcement','충원',d.unitReinforcement??'다음 차례 자동 충원 +0'],['food','군량',`휴대 ${labelNumber(stock)}/${labelNumber(max)} 차례분`],...['attack','defense','mobility'].map((k,i)=>[k,['공격','방어','기동'][i],r?.[k]]),['status','상태',`${st.morale?.text??'—'} · ${st.formation?.text??'—'}`]];
 const rowHtml=items=>items.map(([icon,label,value])=>`<div${icon==='reinforcement'?' class="c195-unit-reinforcement"':''}><dt>${({troops:()=>symImg('resources','troops',{size:'sm'}),reinforcement:()=>symImg('resources','reserve',{size:'sm'}),food:()=>symImg('resources','food',{size:'sm'}),actions:()=>statusSymMarkup('action',value),status:()=>statusSymMarkup('morale',st.morale?.text)+statusSymMarkup('formation',st.formation?.text),location:()=>terrainSymMarkup(value)})[icon]?.()??''}${label}</dt><dd>${esc(value??'—')}</dd></div>`).join('');
 if(l0){const actions=d.unitStatus?.actions;return `<h2>선택 부대</h2><dl>${rowHtml([rows[1],['actions','이동/행동',`${actions?.move?.available?'이동 가능':'이동 사용함'} · ${actions?.main?.available?'행동 가능':'행동 사용함'}`],rows[3],rows.at(-1)])}</dl><details class="c243-unit-details"><summary>상세 ⌄</summary><dl>${rowHtml(rows.filter(row=>!['troops','food','status'].includes(row[0])))}</dl></details>`;}
 return `<h2>선택 부대</h2><dl>${rowHtml(rows)}</dl>`;
}
function renderBandSupply(root,d){
 const supply=d.mode==='supply'&&!root.querySelector('.c236-map-switches'),focus=!!d.unitStatus,title=root.querySelector('.nb-state-title');
 title.hidden=!supply&&!focus;title.querySelector('h1').textContent=supply?'지도 · 보급':focus?'전장 집중':'';
 title.querySelector('p').innerHTML=supply?(d.bandSupply?.supply?.model==='clock'||d.foodModel==='clock'?`보급권 ${labelNumber(d.supplyRange)}칸 안은 군량이 줄지 않습니다.<br>권 밖에서는 휴대 군량으로 버팁니다.`:'보급선과 휴대 군량을 확인하십시오.<br>길이 끊기면 휴대 군량으로 버팁니다.')+'<br><button data-mode="world">Esc · 지형으로</button>' : focus?'대상을 선택하고 명령을 내리세요.':'';
 const panel=root.querySelector('.nb-supply'),face=d.bandSupply?root.querySelector('.ih-face img')?.getAttribute('src'):'';
 panel.hidden=!supply;panel.innerHTML=supply?`${face&&HEAD_RE.test(face)?`<span class="nb-supply-portrait"><img src="${esc(face)}" alt="${esc(d.bandSupply.name)}"></span>`:''}<div class="nb-supply-body">${bandSupplyHtml(d)}</div>`:'';
}
function setBandState(band,state){if(band.dataset.state===state)return;band.dataset.state=state;band.classList.remove('nb-wipe');if(document.documentElement.dataset.ui==='kit')return;void band.offsetWidth;band.classList.add('nb-wipe');}
function fitBandOrders(content){
 if(content.querySelector('.c300-dock'))return;const row=content.querySelector('.nb-order-row'),more=content.querySelector('.nb-more');if(!row||!more)return;
 const end=content.closest('.nb-band')?.querySelector('.ih-end');if(end){if(['l0','kit'].includes(document.documentElement.dataset.ui)){content.closest('.nb-band').append(end);return;}row.append(end);}
 // Keep full labels and 72px minimum buttons. Extra long orders remain reachable in More.
 while(row.scrollWidth>row.clientWidth+1&&row.querySelectorAll('[data-act]').length>2)more.prepend(row.querySelector('[data-band-more]').previousElementSibling);
}
// C300: presentation only. Availability and resources are supplied by public queries.
export function unitAbilityState300(card,{mode=true,main=true,selected=false}={}){
 if(!card)return {label:'빈 전법 칸',reasons:['빈 전법 칸'],usable:false};
 const reasons=[];
 if(!mode)reasons.push('현재 모드에서 사용할 수 없음');
 if(card.consumesMain===true&&!main&&!card.passive)reasons.push('주 행동 사용됨');
 const code=card.reasonCode??'',reason=card.reasonText||card.reason||'';
 if(reason&&!/COOLDOWN|GAUGE|TARGET|MAIN_ACTION/.test(code))reasons.push(reason);
 const wait=card.waiting??card.cooldown??0;
 if(wait>0)reasons.push(`대기 ${wait}차례`);
 if(Number.isFinite(card.gaugeCost)&&Number.isFinite(card.gauge)&&card.gauge<card.gaugeCost)reasons.push(`현재 ${card.gauge} / 필요 ${card.gaugeCost} / ${card.gaugeCost-card.gauge} 부족`);
 if(reason&&!reasons.includes(reason))reasons.push(reason);
 for(const r of card.reasons??[])if(r)reasons.push(typeof r==='string'?r:r.reasonText??r.text??'');
 if(!card.passive&&card.canUse===false&&!reasons.length)reasons.push('유효 대상 없음');
 const all=[...new Set(reasons.filter(Boolean))];
 return {label:card.passive?'수동 엔진':all[0]??(selected?'선택 중':'실행 가능'),reasons:all,usable:!card.passive&&card.canUse!==false&&!all.length};
}
const dockAsset307=(name,cls='')=>`<img class="${cls}" src="/assets/ui-kit/own/dock-v1/${name}.webp" alt="" aria-hidden="true">`;
// C327 embedded existing 72px PNG bytes: production server allowlist is outside this task.
export const dockImages327={"G04-e":"/assets/ui-kit/own/inline-art/e5f02461177e5896.png","G04-passive":"/assets/ui-kit/own/inline-art/5ed39c2290f24f29.png","G04-r":"/assets/ui-kit/own/inline-art/55ddf0a6331e2eba.png","G18-e":"/assets/ui-kit/own/inline-art/ccb0ee90aefad44f.png","G18-passive":"/assets/ui-kit/own/inline-art/4fd1fb597b9fc272.png","G18-r":"/assets/ui-kit/own/inline-art/cafde61dcdd49d98.png","G24-e":"/assets/ui-kit/own/inline-art/f6c20b06e2ed9244.png","G24-passive":"/assets/ui-kit/own/inline-art/526d706152e664e0.png","G24-r":"/assets/ui-kit/own/inline-art/e120e3c24905ba44.png","G27-e":"/assets/ui-kit/own/inline-art/78288f7581d55851.png","G27-passive":"/assets/ui-kit/own/inline-art/3ab81dd7c5abe98c.png","G27-r":"/assets/ui-kit/own/inline-art/04f8e232d6dbe259.png","q-bow":"/assets/ui-kit/own/inline-art/ed9f9c23941e86f1.png","q-cavalry":"/assets/ui-kit/own/inline-art/23d0e7f3465cf4f5.png","q-dao":"/assets/ui-kit/own/inline-art/7138aa1385c7ffb8.png","q-spear":"/assets/ui-kit/own/inline-art/c12d431c54184d91.png","t-deception":"/assets/ui-kit/own/inline-art/231e51726cd61e5f.png","t-fire":"/assets/ui-kit/own/inline-art/8be45e8c1adad6c4.png","t-lightning":"/assets/ui-kit/own/inline-art/41a2c2360f765c13.png","t-momentum":"/assets/ui-kit/own/inline-art/9ca2dc90b4018294.png","t-water":"/assets/ui-kit/own/inline-art/33418a1d12c72e5c.png","t-wind":"/assets/ui-kit/own/inline-art/b022d631a9c83523.png","trait-attack":"/assets/ui-kit/own/inline-art/2d550a0cbb600196.png","trait-defense":"/assets/ui-kit/own/inline-art/ec05ad3bcabb7fd8.png","trait-domestic":"/assets/ui-kit/own/inline-art/a1fa0738cf28a9cc.png","trait-growth":"/assets/ui-kit/own/inline-art/875f17cff7536e35.png","trait-information":"/assets/ui-kit/own/inline-art/b68cc4f5d33e672f.png","trait-morale":"/assets/ui-kit/own/inline-art/33cee281a8977d99.png","trait-movement":"/assets/ui-kit/own/inline-art/554cb5999e38442e.png","trait-supply":"/assets/ui-kit/own/inline-art/4447c5ad8262584d.png","w-builder":"/assets/ui-kit/own/inline-art/6701b3d2934abb7b.png","w-duelist":"/assets/ui-kit/own/inline-art/75749b6782679e25.png","w-fierce":"/assets/ui-kit/own/inline-art/05eccb6f4e33e8d2.png","w-general":"/assets/ui-kit/own/inline-art/9af4424962c8731d.png","w-guardian":"/assets/ui-kit/own/inline-art/60ffbecf5df84818.png","w-scout":"/assets/ui-kit/own/inline-art/3d958d7f54cbd501.png","w-stalwart":"/assets/ui-kit/own/inline-art/3e4378248627ab4e.png","w-statesman":"/assets/ui-kit/own/inline-art/8c45b4239e90d981.png","w-strategist":"/assets/ui-kit/own/inline-art/a7e4d5940e751a8a.png","w-supply":"/assets/ui-kit/own/inline-art/9fc1bf5f2b55954a.png"};
// C327: asset selection is presentation only; ability names and availability stay public.
const engines327={MAENG:'fierce',GANG:'stalwart',HOWI:'guardian',TU:'duelist',JANGGUN:'general',JANG:'general',CHAEK:'strategist',CHUKSEONG:'builder',CHEOK:'scout',JEONNONG:'supply',GUKSA:'statesman',GUK:'statesman'};
// C327 R2: 64px display derivatives of existing class-v1 art; no new artwork.
export const dockClassArt327={"maeng":{"src":"/assets/ui-kit/own/inline-art/5d5834789e99980f.png","source":"prototype/assets/ui-kit/own/class-v1/maeng.png","sha256":"019397ebebe2dd5abbb8d6a4434d0bedb884a36ff0f9db9084f9e64e27d3114c"},"gang":{"src":"/assets/ui-kit/own/inline-art/5f0835ca8566f3a0.png","source":"prototype/assets/ui-kit/own/class-v1/gang.png","sha256":"7155d96b2e4908552c84359768653b4fc48900e88b6faecf0ff8ba662b022f11"},"howi":{"src":"/assets/ui-kit/own/inline-art/2ae50c316471da51.png","source":"prototype/assets/ui-kit/own/class-v1/howi.png","sha256":"dcddd8b4dee8253c38b4aff85f5d7defd3527aee2a159099201b988ccc62a4dc"},"tu":{"src":"/assets/ui-kit/own/inline-art/0be163798039a22f.png","source":"prototype/assets/ui-kit/own/class-v1/tu.png","sha256":"7c88eb0276681673930d49855040cab72857979ac1238ad10a11f18f9686fdc1"},"janggun":{"src":"/assets/ui-kit/own/inline-art/7fe9c7f9ef1093ef.png","source":"prototype/assets/ui-kit/own/class-v1/janggun.png","sha256":"de1a0318c6aa598d1f18fe8df3c2df1207d7ffb5cd382ef7c443170e3b403718"},"chaek":{"src":"/assets/ui-kit/own/inline-art/ddbb29432a21a1fa.png","source":"prototype/assets/ui-kit/own/class-v1/chaek.png","sha256":"df3bc8a7b7a3cc4e2e119937a5df30bea2f9b80007b8b2534410dba09ee813c7"},"chukseong":{"src":"/assets/ui-kit/own/inline-art/a9ce55ae5ec9c33b.png","source":"prototype/assets/ui-kit/own/class-v1/chukseong.png","sha256":"099fbb5a752033fe060a4b35b837d8f3515f8114546a5132f28a9665e31aaba6"},"cheok":{"src":"/assets/ui-kit/own/inline-art/b0da411e6079d7f8.png","source":"prototype/assets/ui-kit/own/class-v1/cheok.png","sha256":"7ee22bc2d3a6e96a507c92777ba0538fad95572bbf1342d0f7d1d08546d0152f"},"jeonnong":{"src":"/assets/ui-kit/own/inline-art/b01b0c1217dff4da.png","source":"prototype/assets/ui-kit/own/class-v1/jeonnong.png","sha256":"fc8e1bc468803ac25d373b220c5bb1f7e7ec3e3c143ca33f0634cb5a68e1012c"},"guksa":{"src":"/assets/ui-kit/own/inline-art/601fcae6d4e4647d.png","source":"prototype/assets/ui-kit/own/class-v1/guksa.png","sha256":"1c46293c851d68928afa68c307764bd32112f85bab12ac8548d68f756e35fd9a"},"flag-steady":{"src":"/assets/ui-kit/own/inline-art/168507c4ce1b991d.png","source":"prototype/assets/ui-kit/own/class-v1/flag-steady.png","sha256":"9f6ccd319ecd75c54ec4da3714ef467b30a24d9e3a95a660e691798e09efdc24"},"flag-wavering":{"src":"/assets/ui-kit/own/inline-art/882de21537776504.png","source":"prototype/assets/ui-kit/own/class-v1/flag-wavering.png","sha256":"6afb7445cfc4c3935d5c37f15d27da4ae8ec5a36437cd869d1350632467c75fc"},"flag-routing":{"src":"/assets/ui-kit/own/inline-art/d598b8cab726f32c.png","source":"prototype/assets/ui-kit/own/class-v1/flag-routing.png","sha256":"3274af30e6d19f849d4b6844181022f6f6e1e81ce7c925f19b0e46b24a8641c5"},"fracture":{"src":"/assets/ui-kit/own/inline-art/0007526ed622b9de.png","source":"prototype/assets/ui-kit/own/class-v1/fracture.png","sha256":"364faf4db38fe861e3fb6dd3b28c5386c16d62c7260b39112e57b7fc837c2cbf"},"rice-sack":{"src":"/assets/ui-kit/own/inline-art/c2c192e8285627ae.png","source":"prototype/assets/ui-kit/own/class-v1/rice-sack.png","sha256":"9b409aa56bc9401555cec44b948f4e8613ef7d5a49f9491bebe32f50e8f1d646"},"supply-cut":{"src":"/assets/ui-kit/own/inline-art/62e0306d56ca7b58.png","source":"prototype/assets/ui-kit/own/class-v1/supply-cut.png","sha256":"e1acd540a1cb292a777df762b809009d75dbe966093b8021f890a675d77f1692"}};
const classPicture327=(id,cls='')=>dockClassArt327[id]?`<img class="c327-class-art ${cls}" src="${dockClassArt327[id].src}" data-source="/${dockClassArt327[id].source.replace(/^prototype\//,'')}" alt="">`:'';
export function dockTraitSignals327(d,card){
 if(d.enemy||!card?.traitId)return [];
 const a=d.army??{},turn=d.turn;
 const records=(d.traitActivations??[]).filter(r=>r.armyId===a.armyId&&r.traitId===card.traitId&&r.turn===turn);
 // A projected, committed effect is evidence; skill conditions are never recalculated in the UI.
 const effects=(a.effectStates??[]).filter(e=>e.source===a.armyId&&e.traitId===card.traitId&&e.startsTurn===turn&&!!e.when&&e.when!=='PASSIVE'&&!(['ADJACENT_ALLIES','ALL_ALLIES_IN_BATTLE'].includes(e.target)&&e.condition));
 return [...records.map(r=>`${turn}:${r.sequence}:${card.traitId}`),...effects.map(e=>`${turn}:${e.source}:${e.traitId}:${e.when}:${e.startsTurn}`)];
}
function traitSlots327(d,equipped){
 const enemy=!!d.enemy;
 return `<div class="c327-trait-group"><div class="c327-traits" aria-label="장착한 일반특기">${Array.from({length:3},(_,i)=>{
 const c=enemy?null:equipped[i];
 if(!c)return `<div class="c327-trait-slot empty" tabindex="0" aria-label="${enemy?'미정찰':'빈 일반특기 칸'}"><span class="c482-trait-name">${enemy?'미정찰':'빈 칸'}</span><aside class="c300-tooltip" role="tooltip"><h3>${enemy?'미정찰':'빈 일반특기 칸'}</h3><p>${enemy?'적 특기 미정찰':'빈 일반특기 칸 — 장착은 성 화면에서'}</p></aside></div>`;
 const signals=dockTraitSignals327(d,c),name=abilityName356(c);return `<div class="c327-trait-slot${signals.length?' is-active':''}" tabindex="0" role="img" aria-label="${esc(name)}" data-trait-id="${esc(c.traitId)}"${signals.length?` data-trigger-token="${esc(signals.at(-1))}"`:''}>${dockIcon327(d,'trait',c)}<span class="c482-trait-name">${esc(name)}</span><aside class="c300-tooltip" role="tooltip"><h3>${esc(name)}</h3><p>${esc(abilityGloss356(c))}</p><p>${esc(c.conditionText??(typeof c.condition==='string'?c.condition:''))}</p><p>${esc(c.text??c.effectText??c.description??'')}</p>${signals.length?'<small>이번 차례 발동 기록</small>':''}</aside></div>`;
 }).join('')}</div></div>`;
}
const riceSack339='/assets/ui-kit/own/inline-art/c6b3f7261461e0f3.webp';
const sackPicture339=cls=>`<img class="${cls}" src="${riceSack339}" data-source="/assets/ui-kit/own/dock-v3/rice-sack-c339.webp" alt="" aria-hidden="true">`;
// C345 R2: imagegen painted silhouettes; faction pigment is baked at asset build time.
export const dockFlags339=Object.fromEntries(['steady','wavering','routing'].map(key=>[key,{base:`/assets/ui-kit/own/dock-v3/flags-r3/gray-${key}.png`,mask:`/assets/ui-kit/own/dock-v3/flags-r3/cloth-${key}.png`,emblem:`/assets/ui-kit/own/dock-v3/flags-r3/emblem-${key}.png`} ]));
function factionFlag339(d,a,many,morale){
 const faction=!d.enemy&&!many?FACTION[a.factionId]:null;
 if(!faction||!dockFlags339[morale])return '';
 const stateName={steady:'안정',wavering:'동요',routing:'패주'}[morale];
 return `<img class="c339-faction-flag" data-morale="${morale}" src="/assets/ui-kit/own/dock-v3/flags-r3/${a.factionId}-${morale}.webp" alt="${esc(faction.name)} 세력기 · ${stateName}">`;
}
const statIcon339=key=>`<svg viewBox="0 0 28 28" aria-hidden="true">${({attack:'<path d="M22 1l4 1-2 7-12 12-4-4L20 3Zm-16 15 8 8-2 2-3-3-5 5-3-3 5-5-3-3Z"/>',defense:'<path d="M3 4 14 1l11 3v9c0 6-6 11-11 14C9 24 3 19 3 13Zm10 0v19h2V4ZM5 9h18v2H5Z" fill-rule="evenodd"/>',mobility:'<path d="M12 1h4v4h4v3l-3 3 2 9 4 2v4H5v-4l4-2 2-9-3-3V5h4Zm-2 8h8V7h-8Z"/>',range:'<path d="M4 2c18 3 23 8 22 23l-2 1C9 26 4 21 2 4l2-2Zm1 3c2 12 7 17 17 18L5 5Zm2-2 18 18v-3L10 3ZM1 25 24 2l2 2L3 27Z"/>'})[key]}</svg>`;
const orderIcon339=key=>`<svg class="c300-order-icon c339-order" viewBox="0 0 56 56" fill="#efe3c4" aria-hidden="true">${key==='regroup'?'<path d="M10 3h3v50h-3Zm5 6c11-5 19 7 32 3l-3 8 5 5-8 1 3 7c-12 4-19-8-29-3Z"/>':'<path d="m7 42 6-10 8-3 8-11 4-9 4 4 8-3 5 8-4 4-7-3-2 11 7 4 3 12-4 1-4-10-9-2-7 6-4 12h-4l3-14-4-1-5 8H5Zm22-22-7 8-7-2-6 3-7-1 9-5 9 1 7-7Z"/><path d="m29 9 3-5 4 1 1 5-4 3 1 6-5 6-6-2 5-6-2-5-7 3-1-3Zm10-9 2 1-8 35-2-1Z"/>'}</svg>`;
function dockState327(d,a,many){
 const morale=({STEADY:'steady',SHAKEN:'wavering',ROUTING:'routing'})[a.morale]??({'사기 안정':'steady','동요':'wavering','사기 동요':'wavering','패주':'routing','사기 패주':'routing'})[d.morale],formation=({ORDERED:'ordered',DISORDERED:'disordered',BROKEN:'broken'})[a.formation]??({'정연':'ordered','정돈':'ordered','흐트러짐':'disordered','붕괴':'broken'})[d.formation];
 const turns=a.supply?.turnsLeft,known=Number.isFinite(turns),cut=a.supply?.state==='CUT'||a.supply?.linkState==='CUT',low=known&&turns<=2,engine=a.engine?.engineId?.toLowerCase();
 return {morale,formation,html:`<div class="c327-state"><div class="c327-engine" role="img" aria-label="${esc(a.engine?.name??'?')}" title="계통 · ${esc(a.engine?.name??'?')}">${classPicture327(engine)}<span>${esc(many?'함께 명령':a.engine?.name??'?')}</span></div><div class="c327-morale" aria-label="${esc(d.morale??'사기 미확인')}" title="${esc(d.morale??'사기 미확인')}">${factionFlag339(d,a,many,morale)}</div><div class="c327-formation" title="전열 · ${esc(d.formation??'?')}">${formation?symImg('status','formation-'+formation):'?'}<span>${esc(d.formation??'?')}</span></div><div class="c327-supply${low?' low':''}${cut?' cut':''}" aria-label="군량 ${known?turns+'차례':'미확인'}${cut?' · 보급 끊김':''}" title="군량 ${known?turns+'차례':'?'}${cut?' · 보급 끊김':''}">${known?Array.from({length:5},(_,i)=>`<span class="c327-sack"${turns<=i?' hidden':''} style="--fill:${Math.max(0,Math.min(1,turns-i))*100}%">${sackPicture339('base')}${sackPicture339('filled')}</span>`).join(''):'?'}${cut?`<span class="c327-cut-line" role="img" aria-label="보급 끊김" title="보급 끊김">${symImg('status','supply-cut',{size:'xs',paper:true})}</span>`:''}</div></div>`};
}
export const dockPainted329={"q-spear":"/assets/ui-kit/own/inline-art/c11bdab21bee37a5.png","q-dao":"/assets/ui-kit/own/inline-art/acb7a5a3dae4f835.png","q-cavalry":"/assets/ui-kit/own/inline-art/40e5bba51f2c31af.png","q-bow":"/assets/ui-kit/own/inline-art/bda773646af10053.png","w-fierce":"/assets/ui-kit/own/inline-art/4dba519985b8500a.png","w-stalwart":"/assets/ui-kit/own/inline-art/b368cc6949c8f8fe.png","w-guardian":"/assets/ui-kit/own/inline-art/4ea5a81ca8aa0e18.png","w-duelist":"/assets/ui-kit/own/inline-art/d05d44a92e5708ec.png","w-general":"/assets/ui-kit/own/inline-art/bf9748f4885cb011.png","w-strategist":"/assets/ui-kit/own/inline-art/fbd8d1e0e69268ef.png","w-builder":"/assets/ui-kit/own/inline-art/8b3b17216cec933d.png","w-scout":"/assets/ui-kit/own/inline-art/5f9abdc2e4d9db09.png","w-supply":"/assets/ui-kit/own/inline-art/01f48a8d14d08943.png","w-statesman":"/assets/ui-kit/own/inline-art/7190c7ecd8a2c6a6.png","t-fire":"/assets/ui-kit/own/inline-art/b6369babe2de60ed.png","t-water":"/assets/ui-kit/own/inline-art/ddaaf805317778bc.png","t-wind":"/assets/ui-kit/own/inline-art/96f53b9df2789f05.png","t-lightning":"/assets/ui-kit/own/inline-art/fbe7beab17a53ac3.png","t-momentum":"/assets/ui-kit/own/inline-art/1548e4e52a664e31.png","t-deception":"/assets/ui-kit/own/inline-art/e7e044174a8aa8e8.png","unique-guan-yu":"/assets/ui-kit/own/inline-art/8495e8adcc65bd51.png","unique-xun-yu":"/assets/ui-kit/own/inline-art/4d717f83ba9a94b9.png","unique-dian-wei":"/assets/ui-kit/own/inline-art/1525167964648917.png","unique-zhou-yu":"/assets/ui-kit/own/inline-art/3db8f4e2cc302b42.png","trait-attack":"/assets/ui-kit/own/inline-art/8cb996051b31b650.png","trait-defense":"/assets/ui-kit/own/inline-art/74fe320b8d21764e.png","trait-movement":"/assets/ui-kit/own/inline-art/a0ee9523338d61a3.png","trait-morale":"/assets/ui-kit/own/inline-art/fdac9442d009605e.png","trait-information":"/assets/ui-kit/own/inline-art/871bfec97e03808c.png","trait-domestic":"/assets/ui-kit/own/inline-art/8e24daf9762ca632.png","trait-supply":"/assets/ui-kit/own/inline-art/02f04b2bac81fbce.png","trait-growth":"/assets/ui-kit/own/inline-art/4f0403265030e9c1.png"};
export function dockIcon327(d,kind,card={}){
 const a=d.army??{},id=d.officer?.officerId??a.commanderId,unique=['G24','G18','G04','G27'].includes(id);
 const troop=({BT01:'dao',sword:'dao',militia:'dao',BT02:'spear',BT03:'bow',BT04:'cavalry'})[a.troopType]??a.troopType;
 let name=kind==='Q'?'q-'+(['dao','spear','bow','cavalry'].includes(troop)?troop:'dao'):kind==='W'?'w-'+(engines327[a.engine?.engineId]??'general'):'t-momentum';
 const own=kind==='passive'||kind==='R'||kind==='E'&&(card.signature||card.classTag==='고유'||card.classTag?.includes?.('고유'));
 if(own&&unique)name=id+'-'+(kind==='passive'?'passive':kind.toLowerCase());
 else if(kind==='passive')name='w-'+(engines327[a.engine?.engineId]??'general');
 else if(kind==='trait'){const ops=(card.effects??[]).map(e=>e.op).join(' ');name='trait-'+(/DEFENSE_MOD|DAMAGE_TAKEN/.test(ops)||/방어|호위|지키기|수성/.test(card.name)?'defense':/MOVE_MOD/.test(ops)||/이동|기동/.test(card.name)?'movement':/SUPPLY|FOOD/.test(ops)||/보급|군량/.test(card.name)?'supply':/MORALE/.test(ops)||/사기/.test(card.name)?'morale':/SIGHT|INTEL|SCOUT/.test(ops)||/정보|간파/.test(card.name)?'information':/CITY_OUTPUT|PRODUCTION/.test(ops)||/내정|농/.test(card.name)?'domestic':/XP|GROWTH/.test(ops)||/성장|경험/.test(card.name)?'growth':'attack');}
 else if(!own&&kind==='E')name='t-'+(/화|불/.test(card.name)?'fire':/물|수공/.test(card.name)?'water':/바람|풍/.test(card.name)?'wind':/번개|낙뢰/.test(card.name)?'lightning':/교란|혼란/.test(card.name)?'deception':'momentum');
 // C345: transparent trait silhouette, bone color with no painted background.
 if(kind==='trait')return `<span class="c345-trait-symbol" data-color-role="shared" data-source="/assets/ui-kit/own/emblem-v1/r2/72/${name}.png" style="--trait-symbol:url('${dockImages327[name]}')" aria-hidden="true"></span>`;
 const paintedUnique=({'관우':'unique-guan-yu','주유':'unique-zhou-yu','순욱':'unique-xun-yu','전위':'unique-dian-wei'})[d.officer?.name??d.name];
 const paintedName=own?(paintedUnique??(kind==='R'?'t-wind':kind==='E'?'t-momentum':'w-'+(engines327[a.engine?.engineId]??'general'))):name;
 return `<picture class="c327-emblem c329-painted" data-color-role="${own?'officer':'shared'}" data-painted-kind="${own?(paintedUnique?'unique':'fallback'):'shared'}" data-icon-kind="${own&&unique?'unique':own?'fallback':'shared'}"><source type="image/png" srcset="${dockPainted329[paintedName]}" data-source="/assets/ui-kit/own/emblem-v1/72/${paintedName}.png"><img src="${dockImages327[name]}" data-source="/assets/ui-kit/own/emblem-v1/r2/72/${name}.png" alt=""></picture>`;
}
export const dockPlate329="/assets/ui-kit/own/inline-art/d0ccee70e933c60c.webp";
export const dockPlate335='/assets/ui-kit/own/dock-v3/plate-v7-c407.webp';
function dockTroop464(d,a,many){
 if(many)return '';
 const type=({BT01:'sword',BT02:'spear',BT03:'bow',BT04:'cavalry',dao:'sword',militia:'sword'})[a.troopType]??a.troopType;
 const name=d.enemy?'병종 미정찰':({sword:'도병',spear:'창병',bow:'궁병',cavalry:'기병'})[type]??'부대';
 return `<div class="c464-troop" title="${esc(d.morale??'')} · ${esc(d.formation??'')}">${!d.enemy&&type?symImg('troops',type):''}<span>${name}</span></div>`;
}
// C482 reads the selected unit's public view only. No equipment commands here.
function dockProfile482(d,a,o,core,equipped){
 const enemy=!!d.enemy,e=enemy?null:a.engine,type=({BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry',dao:'militia',sword:'militia'})[a.troopType]??a.troopType;
 // C516: 특수 병종(투석기 등)은 공개 보기의 상위 병종(parentTroopType)으로 그림 · 적성, 이름은 병종 표시 이름(troopDisplayName — 예: 투석기). 전에는 '병종 미확인'
 const base=({militia:1,spear:1,bow:1,cavalry:1})[type]?type:(({BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'})[a.parentBaseTroopId]??a.parentTroopType??type);
 const symbol=({militia:'sword',spear:'spear',bow:'bow',cavalry:'cavalry'})[base];
 const aptitude=enemy?null:({S:'아주 높음',A:'높음',B:'일정',C:'낮음',D:'낮음'})[o.aptitude?.[base]];
 const troopName=({militia:'도병',spear:'창병',bow:'궁병',cavalry:'기병'})[type]??a.troopDisplayName??'병종 미확인';
 const merits=(e?.merits??[]).filter(m=>Number.isFinite(m.count)&&Number.isFinite(m.goal));
 const progress=merits.length?Math.max(...merits.map(m=>m.count)):null;
 const branch=enemy?'미정찰':e?.branchName??(e?.path?'전직 미확인':'기본');
 const classLine=enemy?'미정찰':`${e?.name?.split(' · ')[0]??'계통 미확인'} · ${branch}`;
 const troopLine=enemy?'병종 미정찰':`${troopName} · ${aptitude?'적성 '+aptitude:'적성 미확인'}`;
 const progressLine=enemy?'미정찰':`실적 ${progress??'?'}/${merits[0]?.goal??'?'} · ${e?.resourceName??'자원 미확인'} ${Number.isFinite(e?.resource)?e.resource:'?'}/${Number.isFinite(e?.max)?e.max:'?'}`;
 const name=enemy?'미정찰':abilityName356(core)||'고유특기 미확인';
 const details=enemy?['적 특기 미정찰']:[abilityGloss356(core),core?.text,core?.effectText,core?.description,typeof core?.effect==='string'?core.effect:null,core?.conditionText,typeof core?.condition==='string'?core.condition:null,...(core?.effectLines??[])].filter(Boolean);
 return `<section class="c482-identity" aria-label="장수 · 클래스"><h2 class="c327-name" title="${esc(d.name)}">${esc(d.name)}</h2><div class="c482-class" tabindex="0" title="${esc([classLine,...merits.map(m=>m.name+' '+m.count+'/'+m.goal)].join(' · '))}">${esc(classLine)}</div><div class="c482-aptitude" tabindex="0" aria-label="병종 적성" title="${esc(troopLine)}">${!enemy&&symbol?symImg('troops',symbol):''}<span>${esc(troopLine)}</span></div><div class="c482-progress" tabindex="0" title="${esc(progressLine)}">${esc(progressLine)}</div></section><section class="c482-profile" aria-label="특기"><div class="c482-traits-label">특기</div><div class="c482-traits" aria-label="고유특기와 장착 특기"><div class="c327-core" tabindex="0" aria-label="${esc(name)}">${enemy?'?':dockIcon327(d,'passive')}<small class="c482-trait-name">${esc(name)}</small><aside class="c300-tooltip" role="tooltip"><h3>${esc(name)}</h3>${details.map(t=>`<p>${esc(t)}</p>`).join('')}</aside></div>${traitSlots327(d,equipped)}</div></section>`;
}
export function unitDockHtml300(d,commands=''){
 const many=d.count>1,a=d.enemy?{commanderId:d.army?.commanderId,troopCount:d.army?.troopCount}:d.army??{},e=a.engine,actions=d.actions??{},cards=d.enemy?[]:d.cards??[];
 const slot=(key,c)=>{
  const selected=d.selected===(key==='Q'?'troop-q':key==='W'?'engine':c?.traitId),s=unitAbilityState300(c,{mode:d.mode!==false,main:actions.main?.available!==false,selected});
  const empty=key==='Q'?'병종 기술 준비 중':key==='W'?'계통 없음':key==='R'?'고유 전법 없음':'빈 전법 칸';
  const name=abilityName356(c)||empty,fullLabel=c?s.label:empty;
  const label=/^현재 .* 부족$/.test(fullLabel)?`${c.gaugeCost-c.gauge} 부족`:/대상|표적/.test(fullLabel)?'대상 없음':/^대기 \d+차례$/.test(fullLabel)?fullLabel.replace('대기 ',''):/주 행동/.test(fullLabel)?'행동 사용':/현재 모드/.test(fullLabel)?'모드 제한':fullLabel;
   const picture=dockIcon327(d,key,c);
  const badge=!c?'빈 칸':c.passive?'수동':s.usable?(selected?'선택 중':''):label;
  const status=c?.passive?'passive-engine':/^현재 .* 부족$/.test(fullLabel)?'resource-low':/주 행동/.test(fullLabel)?'action-used':/^대기/.test(fullLabel)?'waiting':s.usable?'ready':'target-restricted';
  const details=[abilityGloss356(c),c?.text,c?.description,c?.effectText,...(c?.effectLines??[]),c?.conditionText,c?.passive?e?.judgment:null,Number.isFinite(c?.gaugeCost)?`게이지 ${c.gaugeCost}`:null,c?.consumesMain===true?'주 행동 소비':c?.consumesMain===false?'주 행동 소비 없음':null,(c?.waiting??c?.cooldown)>0?`대기 ${c.waiting??c.cooldown}차례`:null,c?.recoveryText,...s.reasons].filter(Boolean);
  const attr=key==='Q'?'data-act="troop-q"':key==='W'?'data-act="engine"':c?`data-act="tactic" data-tactic="${esc(c.traitId)}"`:'';
  return `<div class="c300-slot ${selected?'selected':''} ${c?.passive?'passive':''}" data-status="${status}" data-ability="${key}" tabindex="0" data-cost="${c?.gaugeCost??0}"><button ${attr} ${!s.usable&&!c?.passive?'disabled':''} aria-label="${key} ${esc(name)} · ${esc(fullLabel)}">${picture}${(c?.waiting??c?.cooldown)>0?`<i class="c327-cooldown" style="--wait:${Math.min(1,(c.waiting??c.cooldown)/(c.cooldownMax??Math.max(2,c.waiting??c.cooldown)))}">${c.waiting??c.cooldown}</i>`:''}<kbd>${key}</kbd>${Number.isFinite(c?.gaugeCost)?`<em>${c.gaugeCost}</em>`:key==='W'&&Number.isFinite(e?.resource)?`<em class="c300-engine-stage">${e.resource}/${e.max}</em>`:''}</button>${badge?`<span class="c300-ability-badge" hidden aria-hidden="true" title="${esc(fullLabel)}">${esc(badge)}</span>`:''}<small title="${esc(name)}">${esc(name)}</small><aside class="c300-tooltip" role="tooltip"><h3>${esc(name)}</h3>${details.map(x=>`<p>${esc(x)}</p>`).join('')}</aside></div>`;
 };
 const effects=[...(a.statusEffects??[]),...(a.effectStates??[]),...(a.engine?.statuses??[])];
 const activeEngine=!!(a.engineActions?.length||a.structureTargets?.length),engineReady=!!(a.structureTargets?.length||a.engineActions?.some(x=>x.canUse));
 const engineCard=e?{...e,name:e.name,passive:!activeEngine,canUse:engineReady,consumesMain:false,reasonText:activeEngine&&!engineReady?a.engineActions?.find(x=>x.reasonText)?.reasonText??'유효 대상 없음':'',description:[e.resourceName,Number.isFinite(e.resource)?`${e.resource}/${e.max}`:'',e.judgment].filter(Boolean).join(' · ')}:null;

 const enemy=!!d.enemy,o=enemy?{}:d.officer??{},g=o.growth??{},core=g.cards?.find(c=>c.core)??o.uniqueTrait;
 const traits=g.ownedTraits??[],equipped=(g.equippedTraitIds??[]).map(id=>traits.find(c=>c.traitId===id));
 const gauge=enemy?null:a.signatureGauge??cards.find(c=>Number.isFinite(c.gauge))?.gauge??0,cost=cards.find(c=>c.slot==='E'||!c.slot&&!c.signature)?.gaugeCost;
 const num=v=>Number.isFinite(v)?v:'?',pct=(v,m)=>Number.isFinite(v)&&m>0?Math.max(0,Math.min(100,v/m*100)):0;
 const moreAt=commands.indexOf('<details'),basicCommands=moreAt<0?commands:commands.slice(0,moreAt),moreCommands=moreAt<0?'':commands.slice(moreAt);
 const status=dockState327(d,a,many),strength=pct(d.troops??a.troopCount,d.max??d.troops??a.troopCount);
 const troopBar=`<div class="c300-troops c327-formation-bar" data-formation="${status.formation??'unknown'}" aria-label="전열 ${esc(d.formation??'?')}">${[0,1,2].map(i=>`<span><i style="width:${Math.max(0,Math.min(100,(strength-i*100/3)*3))}%"></i></span>`).join('')}${status.formation==='broken'?classPicture327('fracture','c327-fracture'):''}</div>`;
 return `<section class="c300-dock c327-dock c329-dock c335-dock c464-dock${enemy?' c327-enemy':''}${d.risks?.length?' c327-danger':''}" aria-label="${enemy?'관측한 적 부대':'선택 부대 명령'}" style="--officer-primary:${esc(d.color?.primary??'#383830')};--officer-secondary:${esc(d.color?.secondary??'#C8B898')}" data-officer="${esc(a.commanderId??'')}" title="${esc((d.risks??[]).map(r=>r.kind).join(' · '))}">
 <img class="c329-art" src="${dockPlate335}" data-source="/assets/ui-kit/own/dock-v3/plate-v7-c407.webp" alt="" aria-hidden="true">
 <div class="c335-stats" aria-label="부대 능력치">${[['attack','공격'],['defense','방어'],['mobility','이동'],['range','사거리']].map(([key,name])=>{const value=!enemy&&!many?d.ratings?.[key]:null,delta=!enemy&&!many?d.ratingDeltas?.[key]:null,notes=!enemy&&!many?d.ratings?.notes:null;return `<div class="c335-stat" title="${esc(name+' · '+(notes?.join(' · ')??'공개 수치 없음'))}"><span tabindex="0" aria-label="${esc(name)}">${statIcon339(key)}<span class="c444-stat-tip" role="tooltip">${esc(name+' \u00b7 '+(notes?.join(' \u00b7 ')??'\uacf5\uac1c \uc218\uce58 \uc5c6\uc74c'))}</span></span><small class="c464-stat-label">${name}</small><b aria-label="${name}">${num(value)}</b>${Number.isFinite(delta)&&delta!==0?`<em class="${delta>0?'positive':'negative'}" aria-label="${name} 보정 ${delta>0?'+':''}${delta}">${delta>0?'+':''}${delta}</em>`:''}</div>`;}).join('')}</div>
 ${status.html}
 <div class="c300-identity c327-portrait${status.morale==='routing'?' routing':''}">${d.face&&!many?`<button ${enemy?'disabled':'data-act="officer"'} aria-label="장수 정보"><img src="${esc(HEAD_RE.test(d.face)?d.face:d.bust??d.face)}"${HEAD_RE.test(d.face)&&d.bust?` data-c300-face-fallback="${esc(d.bust)}"`:d.bust?` data-c300-face-fallback="${esc(d.face)}"`:''} alt="${esc(d.name)}"></button>`:''}<b class="c327-level" title="레벨">${enemy?'?':g.level??o.level??'?'}</b><div class="c327-xp" role="${many?'presentation':'meter'}" aria-label="경험치" ${Number.isFinite(g.xp)?`aria-valuenow="${g.xp}" aria-valuemin="0" aria-valuemax="${g.nextXp??100}"`: ""} title="경험 ${num(g.xp)} / ${num(g.nextXp)}"><i style="width:${pct(g.xp,g.nextXp)}%"></i></div></div>
 <div class="c300-abilities c327-center">${many?`<h2 class="c327-name">${esc(many?d.count+'개 부대':d.name)}</h2>`:''}${dockTroop464(d,a,many)}${many?'<p>능력은 부대 하나를 고를 때</p>':`<div class="c327-skills">${dockProfile482(d,a,o,core,equipped)}<div class="c300-qwer">${enemy?['Q','W','E','R'].map(k=>`<div class="c327-unknown">? <kbd>${k}</kbd></div>`).join(''):slot('Q',a.troopQ)+slot('W',engineCard)+slot('E',cards.find(c=>c.slot==='E'||!c.slot&&!c.signature))+slot('R',cards.find(c=>c.slot==='R'||c.signature))}</div></div><div class="c327-troop-line"><b aria-label="병력">${Number.isFinite(d.troops??a.troopCount)?troopText(d.troops??a.troopCount):'?'} / ${Number.isFinite(d.max??d.troops??a.troopCount)?troopText(d.max??d.troops??a.troopCount):'?'}</b>${troopBar}</div><div class="c300-gauge${gauge===100?' c332-full':''}" role="meter" tabindex="0" title="${esc(d.name)} 공유 전법 게이지 / ${gauge??'?'} / 100" aria-label="${esc(d.name)} 공유 전법 게이지" aria-valuenow="${gauge??0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${gauge??0}%"></i><u></u>${Number.isFinite(cost)?`<mark class="c327-e-cost" style="left:${cost}%" title="E 비용 ${cost}"></mark>`:''}<span>${gauge??'?'} / ${enemy?'?':'100'}</span></div><div class="c300-effects">${effects.slice(0,8).map(x=>`<span title="${esc(x.description??x.name??x.kind??x.id)}">${esc(x.name??x.kind??x.id)}${Number.isFinite(x.turnsLeft)?' '+x.turnsLeft+'차례':''}</span>`).join('')}${effects.length>8?`<span class="c307-overflow">+${effects.length-8}</span>`:''}</div>`}${moreCommands}</div>
 <div class="c300-orders c327-right">${enemy?'<p class="c327-enemy-label">관측 정보 · ? 미정찰</p>':basicCommands}</div></section>`;

}
export function mountUnitDock300(root){
 const flashed=new Set(),gaugeLevels=new Map();
 const flashGauge=()=>{for(const dock of root.querySelectorAll('.c327-dock')){const gauge=dock.querySelector('.c300-gauge');if(!gauge)continue;const id=dock.dataset.officer,value=Number(gauge.getAttribute('aria-valuenow'));if(value===100&&gaugeLevels.get(id)!==100)gauge.classList.add('c332-gauge-pulse');gaugeLevels.set(id,value);}};
 const flashTraits=()=>{for(const slot of root.querySelectorAll('.c327-trait-slot[data-trigger-token]')){const token=slot.dataset.triggerToken;if(!flashed.has(token)){flashed.add(token);slot.classList.add('c327-trait-flash');}}};
 const observer=new MutationObserver(()=>{flashTraits();flashGauge();});observer.observe(root,{childList:true,subtree:true});flashTraits();flashGauge();
 root.addEventListener('error',event=>{const img=event.target;if(img?.matches?.('img[data-c300-face-fallback]')){const fallback=img.dataset.c300FaceFallback;delete img.dataset.c300FaceFallback;img.src=fallback;}},true);
 const clear=()=>{root.querySelectorAll('.c300-tooltip.open').forEach(n=>n.classList.remove('open'));root.querySelectorAll('.c300-gauge u').forEach(n=>{n.style.width='0';n.textContent='';});};
 const show=event=>{
  const slot=event.target.closest?.('.c300-slot,.c327-trait-slot,.c327-core');if(!slot)return;clear();
  const tip=slot.querySelector('.c300-tooltip'),dock=slot.closest('.c300-dock'),r=dock.getBoundingClientRect();tip.classList.add('open');
  tip.style.width=Math.min(320,root.ownerDocument.defaultView.innerWidth-16)+'px';const width=tip.getBoundingClientRect().width,height=tip.getBoundingClientRect().height,viewport=root.ownerDocument.defaultView;
  let x=slot.getBoundingClientRect().left,y=r.top-height-12;
  const obstacles=[...root.ownerDocument.querySelectorAll('.c260-forecast,#attack-preview:not([hidden]),[data-unit].hovered')].map(n=>n.getBoundingClientRect()).filter(b=>b.width&&b.height);
  if(obstacles.some(b=>x<b.right&&x+width>b.left&&y<b.bottom&&y+height>b.top))x=r.left-width-12;
  const origin=dock.classList.contains('c329-dock')?tip.offsetParent?.getBoundingClientRect():null;
  tip.style.left=(Math.max(8,Math.min(viewport.innerWidth-width-8,x))-(origin?.left??0))+'px';tip.style.top=(Math.max(8,Math.min(viewport.innerHeight-height-8,y))-(origin?.top??0))+'px';
  const gauge=dock.querySelector('.c300-gauge'),cost=Number(slot.dataset.cost),current=Number(gauge?.getAttribute('aria-valuenow'));
  if(gauge&&cost){const u=gauge.querySelector('u');u.style.left=Math.max(0,current-cost)+'%';u.style.width=Math.min(cost,current)+'%';u.textContent='예상 소비';}
 };
 for(const name of ['pointerover','focusin'])root.addEventListener(name,show);
 for(const name of ['pointerout','focusout'])root.addEventListener(name,e=>{if(!e.relatedTarget?.closest?.('.c300-slot,.c327-trait-slot,.c327-core'))clear();});
}
function renderCommandBand(root,d,showUnit,menu){
 const q=s=>root.querySelector(s),band=q('.nb-band'),content=q('.nb-content');if(!band)return;
 band._supplyData=d;if(band.dataset.state!=='forecast')renderBandSupply(root,d);
 if(band._goalMounted!==true){q('.ih-victory').hidden=true;band._goalMounted=true;}
 const goal=document.querySelector('#victory-guide'),dots=Number(goal?.textContent.match(/내 큰 성 (\d)/)?.[1]??0),left=goal?.textContent.match(/\d+차례 남음/)?.[0]??'';
 q('.ih-medal').title=[goal?.textContent,goal?.title].filter(Boolean).join('\n');
 updateMarkup370(q('[data-band-goal]'),`승리 조건 <span class="nb-goal-dots" aria-label="내 큰 성 ${dots}/3">${[0,1,2].map(i=>i<dots?'●':'○').join('')}</span>`);
 updateMarkup370(q('.nb-forecast-status'),`<span class="nb-status-date">${esc(String(d.date??'').replace(/^\d+턴\s*·\s*/, ''))} · ${esc(d.turn??'')}차례</span>${[...q('.ih-res').querySelectorAll('.ih-chip')].filter(c=>['food','production','troops'].includes(c.dataset.res)).map(c=>`<span>${esc(c.querySelector('.nb-resource-label')?.textContent??'')} ${esc(c.querySelector('b')?.textContent??'')}${c.dataset.res==='production'?' '+esc(c.querySelector('small')?.textContent??''):''}</span>`).join('')}`);
 fitForecastStatus(q('.nb-forecast-status'));
 const situation=document.querySelector('#c207-situation:not([hidden])');
 const advisor=document.querySelector('#w-advisor .face img')?.src,advice=situation?.textContent||document.querySelector('#campaign-advice:not([hidden])')?.textContent||document.querySelector('#status')?.textContent||d.summary||'전장을 살펴보십시오.';
 if(situation)q('.nb-advisor-box').dataset.situation=situation.dataset.event;else delete q('.nb-advisor-box').dataset.situation;
 updateMarkup370(q('.nb-advisor-box'),`<span class="nb-advisor">${advisor?`<img src="${esc(advisor)}" alt="군사">`:'軍'}</span><div><b>${esc(document.querySelector('#w-advisor .who')?.textContent??'군사')}</b><p title="${esc(advice)}">${esc(advice)}</p><button class="nb-next" data-band-next${!d.remaining?' disabled':''}>다음 부대 · ${d.remaining??0}</button></div>`);
 const l0=document.documentElement.dataset.ui==='l0';
 const selected=q('.nb-selected');selected.hidden=!showUnit;const detailOpen=selected.querySelector('details')?.open;selected.innerHTML=showUnit?(document.documentElement.dataset.ui==='kit'?kitSelectedHtml(d,menu?.querySelector('.dk-id h2')?.textContent??'',menu?.querySelector('.dk-face img')?.src??''):selectedUnitHtml(d,l0)):'';if(detailOpen&&selected.querySelector('details'))selected.querySelector('details').open=true;
 q('.nb-bookmarks [data-band-map] span').textContent=RAIL.find(([m])=>m===d.mode)?.[1]??'지형';q('.nb-badge').textContent=d.council||'';
 for(const button of root.querySelectorAll('.nb-bookmarks [data-mode]'))button.classList.toggle('on',button.dataset.mode===d.mode);
 band.dataset.targeting=String(!!d.bandSelected&&d.bandSelected!=='wait');
 if(document.documentElement.dataset.ui==='kit')syncKitHudLayout290();
 renderCommandScreen(root,d);
 q('.nb-end-warning').textContent=d.remaining?(l0?`남은 부대 ${d.remaining}`:`남은 부대 ${d.remaining} · 이번 차례 넘기기`):'';q('.nb-end-warning').title=q('.nb-end-warning').textContent;
 if(l0)q('.ih-end small').textContent=d.remaining?String(d.remaining):'';
 q('.ih-end').classList.toggle('ready',d.remaining===0&&!q('.ih-end').disabled);
 const task=Math.max(d.todo??0,d.todoLines?.length??0),news=d.allNews??[],latest=news[0]??'';q('.nb-news-tab').textContent=`이번 차례 · 할 일 ${task}`;
 const tasks=d.todoLines?.length?d.todoLines:['이번 차례 남은 안건이 없습니다.'];
 q('.nb-tasks').hidden=document.documentElement.dataset.ui==='kit'&&root.dataset.kitTasksCollapsed==='true';if(document.documentElement.dataset.ui==='kit')q('.nb-news-tab').setAttribute('aria-expanded',String(!q('.nb-tasks').hidden));q('.nb-tasks').innerHTML=tasks.map((t,i)=>`<li${l0&&i>1?' class="c243-extra-task"':''}><i aria-hidden="true">${l0?(d.todoLines?.length?'□':'✓'):'➜'}</i>${typeof t==='string'?`<span>${esc(t)}</span>`:`${t.action?`<button type="button" data-c271-task="${esc(t.action)}" data-c271-city="${esc(t.cityId??'')}">${esc(t.text)}</button>`:`<button type="button" data-c210-facility="${esc(t.cityId)}" data-c210-kind="${esc(t.kind)}">${esc(t.text)}</button>`}`}<i class="nb-check" aria-hidden="true">${l0?'':'○'}</i></li>`).join('')+(l0&&tasks.length>2?`<li class="c243-task-more"><button type="button" data-c243-tasks aria-expanded="${root.classList.contains('c243-tasks-open')}">${root.classList.contains('c243-tasks-open')?'접기':`+${tasks.length-2}`}</button></li>`:'');
 if(l0){q('.nb-news-tab').textContent+=' ▾';q('.nb-news-tab').setAttribute('aria-expanded','true');}
 if(band._news!==undefined&&band._news!==latest&&latest){q('.nb-news-peek').textContent=latest;q('.nb-news-peek').hidden=false;clearTimeout(band._peekTimer);band._peekTimer=setTimeout(()=>{q('.nb-news-peek').hidden=true;},2000);}band._news=latest;
 if(band._army!==d.unitStatus?.id){q('.nb-sheet').hidden=true;band._army=d.unitStatus?.id;setBandState(band,showUnit?'unit':'rest');}
 let html;
 if(showUnit){
  const name=menu.querySelector('.dk-id h2')?.textContent??'',face=menu.querySelector('.dk-face img')?.src??'',r=d.ratings,st=d.bandStatus??{};
  const button=(b,display=null)=>{const label=b.cloneNode(true);label.querySelectorAll('.gi,kbd,.tactic-wait,.tactic-meter').forEach(n=>n.remove());const reason=b.title||label.textContent.trim();label.querySelectorAll('small').forEach(n=>n.remove());return `<button${tacticFaceCopy(b)} data-act="${esc(b.dataset.menu??'tactic')}"${b.dataset.judgment?` data-judgment="${esc(b.dataset.judgment)}"`:''}${b.dataset.tactic?` data-tactic="${esc(b.dataset.tactic)}"`:''}${b.disabled?' disabled':''}${d.bandSelected===(b.dataset.tactic??b.dataset.menu)?' aria-pressed="true"':''} title="${esc(reason)}">${icon(ACT_ICON[b.dataset.menu??'tactic']??'cmd-tactic','·')}<span class="c253-command-label">${esc(display??label.textContent.trim())}</span>${b.dataset.tactic?tacticFaceMarkup(Number(b.dataset.cooldown??0),b.dataset.gauge===undefined?null:Number(b.dataset.gauge),b.dataset.cost===undefined?null:Number(b.dataset.cost)):''}</button>`;};
  const all=[...menu.querySelectorAll('.dk-acts button')],more=['face','garrison','wait','hub','officer','recall','star','cancel-order'];
  const fallback=(action,label,reason)=>{if(all.some(b=>b.dataset.menu===action))return;const b=document.createElement('button');b.dataset.menu=action;b.disabled=true;b.title=reason;b.textContent=label;all.push(b);};
  fallback('move','이동',d.unitStatus?.actions?.reason||'이번 차례 이동을 쓸 수 없습니다');
  fallback('attack','공격',d.unitStatus?.actions?.main.available?'지금 칠 수 있는 적이나 성이 없습니다':'주 행동을 쓸 수 없습니다');
  fallback('brace','방어','이번 차례 주 행동을 마쳤습니다');fallback('regroup','재정비','이번 차례 주 행동을 마쳤습니다');
  fallback('face','정면','이번 차례 이동을 썼습니다');fallback('garrison','주둔',d.garrisonWhy||'아군 성 주변에서 복귀할 수 있습니다');fallback('wait','대기','이번 차례 명령을 마쳤습니다');fallback('hub','거점','지금은 거점을 지을 수 없습니다');
  const ordered=[...all.filter(b=>['move','attack'].includes(b.dataset.menu)),...all.filter(b=>b.dataset.tactic),...all.filter(b=>['engine','disengage','brace','regroup'].includes(b.dataset.menu))];
  ordered.sort((a,b)=>({move:0,attack:1,brace:3,regroup:4}[a.dataset.menu]??2)-({move:0,attack:1,brace:3,regroup:4}[b.dataset.menu]??2));
  if(l0)ordered.sort((a,b)=>Number(a.disabled)-Number(b.disabled));
  const reasons=ordered.filter(b=>b.disabled).map(b=>b.title).filter(Boolean);
  html=`<button class="nb-hero" data-act="officer" title="장수 정보"><img src="${esc(face)}" alt="${esc(name)}"></button><div class="nb-identity"><b>${esc(name)} · 병력 ${troopText(d.unitTroops??0)}</b><small class="c186-band-class">${esc(d.bandMeta?.replace(/ · 병력.*$/,'')??'')}</small>${engineStatusMarkup(d.unitEngine)}<p class="nb-help" title="${esc(reasons.join(' · '))}">${esc(d.commandIntent||'행동을 선택하세요.')}</p></div><div class="nb-orders"><div class="nb-order-row"><p class="c279-command-preview" role="status">${esc(ordered.find(b=>b.dataset.menu===d.bandSelected)?.dataset.judgment??ordered.find(b=>b.dataset.menu==='move')?.dataset.judgment??'')}</p>${ordered.slice(0,3).map((b,i)=>button(b,null)).join('')}<button data-band-more aria-expanded="false">${symImg('controls','expand',{size:'sm'})}더 보기</button></div><div class="nb-more" hidden>${[...ordered.slice(3),...all.filter(b=>more.includes(b.dataset.menu))].map(b=>button(b)).join('')}</div></div>`;
  if(l0||document.documentElement.dataset.ui==='kit'){html=html.replace(`<b>${esc(name)} · 병력 ${troopText(d.unitTroops??0)}</b>`,`<b>${esc(name)}</b><span>병력 ${troopText(d.unitTroops??0)}</span>`).replace(/<p class="nb-help"[\s\S]*?<\/p>/,`<p class="nb-help">${d.unitStatus?.actions?.move?.available?'이동 가능':'이동 사용함'} · ${d.unitStatus?.actions?.main?.available?'행동 가능':'행동 사용함'}</p>`);}
  q('.nb-sheet > div').innerHTML=q('.ih-readout').innerHTML;
 }else{
  html='';
 }
 if(showUnit&&document.documentElement.dataset.ui==='kit'&&d.unitDock){
  const all=[...menu.querySelectorAll('.dk-acts button')],basic=d.unitDock.count>1?['move','brace','wait']:['move','attack','brace','regroup','wait'];
  const copy=b=>b.outerHTML.replace('data-menu=','data-act=');
  const command=key=>{const b=all.find(b=>b.dataset.menu===key)?.cloneNode(true)??document.createElement('button');
   if(!b.dataset.menu)b.disabled=true;b.dataset.menu=key;
   const picture=['move','regroup'].includes(key)?orderIcon339(key):key==='brace'?dockAsset307('defend','c300-order-icon'):symImg('actions',key,{className:'c300-order-icon'});
   const name=({move:'이동',attack:'공격',brace:'방어',regroup:'재정비',wait:'대기'})[key];
   b.setAttribute('aria-label',name);b.title=[name,b.title,b.dataset.judgment].filter(Boolean).join(' · ');
   b.innerHTML=picture+`<kbd>${({move:'M',attack:'A',brace:'B',regroup:'S',wait:'H'})[key]}</kbd>`;
   return copy(b);};
  const other=all.filter(b=>b.dataset.menu&&!basic.includes(b.dataset.menu)&&!['troop-q','engine','close'].includes(b.dataset.menu)&&!b.dataset.tactic);
  html=unitDockHtml300(d.unitDock,`<div class="c300-basic">${basic.map(command).join('')}</div>${other.length?`<details class="c300-more"><summary>${dockAsset307('overflow','sg-sym')}더 보기</summary><div>${other.map(copy).join('')}</div></details>`:''}`);
  selected.hidden=true;
 }
 if(d.unitDock?.enemy&&document.documentElement.dataset.ui==='kit'){html=unitDockHtml300(d.unitDock);showUnit=true;selected.hidden=true;}
 band._unitHtml=html;band._unitState=showUnit?'unit':'rest';
 if(band.dataset.state!=='forecast'){if(content._renderedHtml!==html){band.append(q('.ih-end'));content.innerHTML=html;content._renderedHtml=html;}fitBandOrders(content);setBandState(band,band._unitState);renderBandSupply(root,d);}
}
// C130: 클릭과 예고가 공유하는 화면 판정. 공격 가능 여부/경로는 엔진이 준다.
export function clickTargetDecision({selected,enemyId,cityId,attackableEnemy=false,attackableCity=false,plan=null,approach=null}) {
  if(!selected)return {kind:cityId?'info':'none',cityId};
  if(enemyId&&attackableEnemy)return {kind:'unit',targetId:enemyId,cityId};
  if(cityId&&attackableCity)return {kind:'city',cityId};
  if(plan)return {kind:'strike',...plan,cityId:plan.cityId??cityId};
  if(approach)return {kind:'approach',via:approach,targetId:enemyId,cityId};
  return {kind:cityId?'info':'none',cityId,targetId:enemyId};
}
export function targetPreviewText(target,{name='',damage=0,chase=null,ranged=false,guard=false,wallBlocked=guard}={}) {
  if(target.deploymentReason)return `${target.deploymentReason}${target.kind==='approach'?' · 전개 자리로 이동만':''}`;
  const wallReason=guard&&wallBlocked&&target.kind!=='city'?' · 수비대가 있어 성벽을 칠 수 없습니다':'';
  if(target.kind==='city')return `성벽 공격 — 내구 −${damage}`;
  if(target.kind==='unit')return `${guard?'수비대 ':''}${name}와 교전${wallReason}`;
  if(target.kind==='strike')return `${ranged&&chase?'물러나 쏩니다':'다가가서 공격합니다'}${chase?` — ${ranged?'물러날 때':'이동할 때'} 추격 피해 약 ${troopText(chase.dealt)}`:''}${target.targetId?` · ${guard?'수비대 ':''}${name}와 교전`:''}${wallReason}`;
  if(target.kind==='approach')return `칠 수 있는 자리로 갑니다 · 도착하면 다시 눌러 ${target.targetId?`${guard?'수비대 ':''}${name}와 교전`:'성벽 공격'}${wallReason}`;
  return guard?`수비대 ${name}가 성을 지키고 있습니다 — 먼저 수비대를 물리쳐야 합니다`:'';
}
export function unitActionReadout({moveUsed=false,canMove=false,canMain=false,ended=false,routing=false}={}) {
  const reason=routing?'패주 중이라 명령을 내릴 수 없습니다':moveUsed?'이번 차례 이동을 이미 썼습니다':ended?'이번 차례 명령을 마쳤습니다':!canMove?'지금 이동할 수 있는 칸이 없습니다':'';
  return {move:{available:canMove&&!ended&&!routing,label:`이동 · ${moveUsed?'사용함':ended||routing?'불가':canMove?'가능':'불가'}`},main:{available:canMain&&!ended&&!routing,label:`주 행동(공격 · 방어 · 재정비 · 전법) · ${ended||routing?'불가':canMain?'가능':'사용함'}`},reason};
}

// C137: screen geometry and public notices only; never change game state.
export function uncoveredShift(unit, viewport, panels, gap=16) {
  const right=r=>r.right??r.left+r.width, bottom=r=>r.bottom??r.top+r.height;
  const bounds={left:viewport.left+gap,top:viewport.top+gap,right:right(viewport)-gap,bottom:bottom(viewport)-gap};
  const blocks=panels.filter(r=>r.width>0&&r.height>0&&right(r)>bounds.left&&r.left<bounds.right&&bottom(r)>bounds.top&&r.top<bounds.bottom)
    .map(r=>({left:r.left-gap,top:r.top-gap,right:right(r)+gap,bottom:bottom(r)+gap}));
  const xs=[0,bounds.left-unit.left,bounds.right-right(unit),...blocks.flatMap(r=>[r.left-right(unit),r.right-unit.left])];
  const ys=[0,bounds.top-unit.top,bounds.bottom-bottom(unit),...blocks.flatMap(r=>[r.top-bottom(unit),r.bottom-unit.top])];
  const candidates=[];
  for(const x of xs)for(const y of ys){const r={left:unit.left+x,right:right(unit)+x,top:unit.top+y,bottom:bottom(unit)+y};
    if(r.left<bounds.left||r.right>bounds.right||r.top<bounds.top||r.bottom>bounds.bottom)continue;
    if(blocks.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top))continue;
    candidates.push({x,y});
  }
  return candidates.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y)[0]??null;
}
export function turnNews(rows, turn) {
  const risk=line=>/굶주림|포위|붕괴|무너졌|중상|상실|빼앗|군량 0/.test(line)?1:0;
  const sorted=rows.map((r,i)=>({...r,i})).sort((a,b)=>b.turn-a.turn||risk(b.line)-risk(a.line)||b.i-a.i);
  return {current:sorted.filter(r=>r.turn===turn).map(r=>r.line),all:sorted.map(r=>`${r.turn}차례 · ${r.line}`)};
}
export function overlapSelection(units, tileId, point, rectangles, previous=null) {
  let hits=units.filter(a=>a.tileId===tileId||rectangles.some(r=>r.id===a.armyId&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom)).map(a=>a.armyId).sort();
  const nearby=previous&&Math.hypot(point.x-previous.x,point.y-previous.y)<=8,old=previous?.key.split('|')??[];
  // Active flags may move on redraw. Keep the group while repeated clicks still touch it.
  if(nearby&&hits.some(id=>old.includes(id))&&old.every(id=>units.some(a=>a.armyId===id)))hits=old;
  const key=hits.join('|'),same=nearby&&previous.key===key;
  const index=same?(hits.indexOf(previous.id)+1)%hits.length:0;
  return {id:hits[index]??null,key,x:point.x,y:point.y,index,count:hits.length};
}

// C159: face adornments survive the hidden menu -> ink HUD bridge.
export function tacticFaceMarkup(cooldown=0,gauge=null,cost=null){return `${cooldown>0?`<span class="tactic-wait" aria-label="${cooldown}차례 대기">${cooldown}</span>`:''}${gauge===null?'':`<span class="tactic-meter" style="--tactic-gauge:${gauge}%" aria-label="전법 게이지 ${gauge}/100"><i></i>${cost===null?'':`<b class="tactic-cost" style="left:${cost}%" aria-label="비용 ${cost}"></b>`}<em>${Math.round(gauge)}/100</em></span>`}`;}
function tacticFaceCopy(b){return b.dataset.tactic?` data-cooldown="${b.dataset.cooldown??0}" data-cost="${b.dataset.cost??100}"${b.dataset.gauge===undefined?'':` data-gauge="${b.dataset.gauge}"`} class="tactic-face${b.dataset.cooldown>0||b.dataset.gauge!==undefined&&b.dataset.gauge<Number(b.dataset.cost??100)?' cooling':''}"`:'';}
// C373 r2: shared public report presentation.
import {reportRowHtml373} from './ink-cards.mjs';
// C186: presentation helpers. Inputs are public views except the undo guard,
// which compares the two immutable engine snapshots without displaying secrets.
export function movementUndoReason(before,after,request,bv,av){
 if(request.type!=='MOVE_UNIT'||!bv.ownArmies[request.armyId]||before.armies[request.armyId]?.tileId===after.armies[request.armyId]?.tileId)return '이동한 부대가 없습니다';
 if(before.turn!==after.turn||before.phase!==after.phase||after.phase!=='PLAYER'||after.gameResult)return '차례가 바뀌어 무를 수 없음';
 if(before.battleSequence!==after.battleSequence)return '교전이 있어 무를 수 없음';
 if(JSON.stringify(before.rng)!==JSON.stringify(after.rng))return '무작위 판정이 있어 무를 수 없음';
 if(Object.entries(av.knowledge.tiles).some(([id,vis])=>vis==='VISIBLE'&&bv.knowledge.tiles[id]!=='VISIBLE'))return '새로 본 것이 있어 무를 수 없음';
 for(const key of ['observedArmies','cities'])for(const [id,row] of Object.entries(av.knowledge[key]??{}))if(av.knowledge.tiles[row.tileId]==='VISIBLE'&&JSON.stringify(bv.knowledge[key]?.[id])!==JSON.stringify(row))return '새로 본 것이 있어 무를 수 없음';
 for(const key of ['cities','pendingChoices','occupations','events','exploration','c22','council'])if(JSON.stringify(before[key])!==JSON.stringify(after[key]))return '이동 중 사건이나 성 상태가 바뀌어 무를 수 없음';
 if(JSON.stringify(before.dejaVu?.recent?.filter(e=>e.factionId===bv.factionId))!==JSON.stringify(after.dejaVu?.recent?.filter(e=>e.factionId===bv.factionId)))return '이동 중 새 기억을 보아 무를 수 없음';
 return '';
}
const publicTroopName=a=>a.troopDisplayName??({militia:'도검병',engineer:'도검병',BT01:'도검병',spear:'창병',BT02:'창병',bow:'궁병',mystic:'궁병',BT03:'궁병',cavalry:'기병',BT04:'기병'})[a.troopType]??'';
const publicArmyLabel=(v,a,names)=>[v.officers?.[a.commanderId]?.name??names[a.armyId]??'관측 장수',publicTroopName(a)].filter(Boolean).join(' · ');
export function playerTurnSummary(bv,av,records=[],combats=[],names={},detailed=false){
 const rows=[],cities=new Map(),own=new Set(Object.keys(bv.ownArmies??{}));
 const locations=new Map(),at=(text,location)=>{locations.set(text,location);return text;};
 for(const c of Object.values({...bv.ownCities,...av.ownCities})){
  const next=av.ownCities[c.cityId],lost=!next,parts=[];
  if(next?.besieged)parts.push('포위됨');
  cities.set(c.cityId,{c,lost,priority:lost?0:next?.besieged?1:4,parts,damage:0});
 }
 for(const e of combats)if(own.has(e.targetId)&&(e.enemyLoss??0)>0)rows.push(at(`받은 공격 · ${publicArmyLabel(bv,bv.ownArmies[e.targetId],names)} · 병력 −${troopText(e.enemyLoss)}`,{armyId:e.targetId,tileId:bv.ownArmies[e.targetId].tileId}));
 else if(cities.has(e.cityId)&&!own.has(e.attackerId))cities.get(e.cityId).damage+=Math.max(0,e.dealt??0);
 const other=[];
 for(const e of records){const text=e.text;if(!text||/(?:−|-)0(?:\D|$)/.test(text)&&!/(?:−|-)[1-9]/.test(text))continue;
  const row=cities.get(e.cityId)??[...cities.values()].find(r=>text.startsWith(r.c.name+':')||text.startsWith(r.c.name+' ·'));
  if(row){const detail=text.replace(new RegExp('^'+row.c.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[: ·]+'),'');if(!row.parts.includes(detail))row.parts.push(detail);if(/포위/.test(detail))row.priority=Math.min(row.priority,1);}
  else other.push(at(text,{cityId:e.cityId,tileId:e.tileId,armyId:e.armyId}));
 }
 for(const row of cities.values()){if(row.damage>0)row.parts.unshift(`받은 공격 · 성 내구 −${row.damage}`);}
 const cityRows=[...cities.values()].filter(r=>r.lost||r.parts.length).sort((a,b)=>a.priority-b.priority);
 const cityText=r=>at(`${r.lost?'잃은 성 · ':''}${r.c.name}${r.parts.length?' · '+r.parts.join(' · '):''}`,{cityId:r.c.cityId,tileId:r.c.tileId});
 const seen=bv.knowledge?.observedArmies??{},newEnemies=[];
 for(const a of Object.values(av.knowledge?.observedArmies??{}))if(av.knowledge.tiles[a.tileId]==='VISIBLE'&&(!seen[a.armyId]||bv.knowledge.tiles[seen[a.armyId].tileId]!=='VISIBLE'))newEnemies.push(at(`새로 본 적 · ${publicArmyLabel(av,a,names)}`,{armyId:a.armyId,tileId:a.tileId}));
 const result=[...new Set([...cityRows.filter(r=>r.priority<2).map(cityText),...other.filter(t=>/견제|협상/.test(t)),...rows,...newEnemies,...cityRows.filter(r=>r.priority>=2).map(cityText),...other])];
 return detailed?result.map(text=>({text,...locations.get(text)})):result.slice(0,5);
}
export function turnSummaryHtml(rows,limit=5){
 return rows.slice(0,limit).map(row=>reportRowHtml373(row)).join('')+(rows.length>limit?`<li><details><summary aria-label="외 ${rows.length-limit}건 · 소식에서 보기" title="외 ${rows.length-limit}건 · 소식에서 보기">더 보기</summary><ul>${rows.slice(limit).map(row=>reportRowHtml373(row)).join('')}</ul></details></li>`:'');
}
// Rows are resolved only through public entities. Old engines without the array keep their existing preview.
export function tacticTargetsHtml(p,v,names={},scales={}){
 if(!Array.isArray(p.targetLosses))return '';
 let enemyExtra=0,allyExtra=0;
 const rows=p.targetLosses.flatMap(r=>{
  const own=v.ownArmies?.[r.targetId],seen=v.knowledge?.observedArmies?.[r.targetId],a=own??(seen&&v.knowledge.tiles[seen.tileId]==='VISIBLE'?seen:null);
  if(!a||!Number.isFinite(a.troopCount))return [];
  const loss=r.loss*(scales[r.targetId]??1);if(own)allyExtra+=loss-r.loss;else enemyExtra+=loss-r.loss;
  return [`<li>${own?'아군 반격 손실':'적'} · ${esc(publicArmyLabel(v,a,names))} · 병력 ${troopText(a.troopCount)} → ${troopText(Math.max(0,a.troopCount-loss))} <span>−${troopText(loss)}</span></li>`];
 });
 if(!rows.length)return '';
 return `<section class="fc-targets" aria-label="전법 대상별 예고"><b>대상별 예고</b><ul>${rows.join('')}</ul><p>합계 · 적 −${troopText((p.totalEnemyLoss??0)+enemyExtra)} / 아군 반격 손실 −${troopText((p.totalAllyLoss??0)+allyExtra)}</p></section>`;
}
export function campaignResultScore(v,won,limit=26){
 const cities=Object.values(v.ownCities??{}),major=cities.filter(c=>c.kind!=='minor').length,minor=cities.length-major;
 const troops=v.gameResult?.troopBreakdownByFactionId?.[v.factionId];
 const count=troops?troops.field+troops.reserve:Object.values(v.ownArmies??{}).reduce((n,a)=>n+(a.troopCount??0),0)+cities.reduce((n,c)=>n+(c.reserveTroops??0),0);
 const left=won?Math.max(0,limit-Math.min(v.turn,limit+1)+1):0;
 const parts=[['큰 성',major,1000],['작은 성',minor,300],['병력 1,000명당',Math.floor(count*TROOP_DISPLAY_SCALE/1000),10],['승리 시 남은 차례',left,100]];
 const history=v.gameResult?.scoreItems?.find(x=>x.id==='HISTORY_TWISTS');
 if(history&&Number.isFinite(history.points))parts.push(['비틀린 역사',1,history.points]);
 return {parts,total:parts.reduce((n,[,x,w])=>n+x*w,0)};
}
export function titleProgress(g,definitions){
 const owned=new Set((g?.titles??[]).map(t=>t.id)),trace=g?.trace??{};
 return definitions.filter(t=>!t.perOpponent&&!owned.has(t.id)).map(t=>{
  const parts=t.rule.split(/\s*&&\s*/).map(part=>{const [keys,threshold]=part.split('>=');return {value:keys.trim().split('+').reduce((n,k)=>n+(trace[k.trim()]??0),0),target:Number(threshold)};});
  return {...t,parts,ratio:Math.min(...parts.map(p=>p.value/p.target))};
 }).sort((a,b)=>b.ratio-a.ratio).slice(0,1);
}
export function facingTiles(a,tileIds){
 if(!a||!Number.isInteger(a.facing))return [];
 const [q,r]=a.tileId.split(',').map(Number),dirs=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
 return dirs.map(([dq,dr],i)=>({tile:`${q+dq},${r+dr}`,side:i===a.facing?'FRONT':Math.min((i-a.facing+6)%6,(a.facing-i+6)%6)<=1?'FRONT':Math.min((i-a.facing+6)%6,(a.facing-i+6)%6)===2?'FLANK':'REAR',arrow:i===a.facing})).filter(x=>tileIds.has(x.tile));
}

// C191: presentation reads recorded deltas, never derives stat gains from potential.
export function levelupReadout(log, officerId, turn, fallbackLevel) {
 const rows=(log??[]).filter(e=>e.kind==='LEVEL_UP'&&e.officerId===officerId&&e.turn===turn);
 const stats=new Map();
 for(const row of rows)for(const [key,v] of Object.entries(row.statChanges??{})){
  const old=stats.get(key);stats.set(key,{key,before:old?.before??v.before,after:v.after});
 }
 return {before:rows[0]?.levelBefore??fallbackLevel-1,after:rows.at(-1)?.levelAfter??fallbackLevel,
  stats:[...stats.values()].filter(v=>v.after>v.before).map(v=>({...v,delta:v.after-v.before})),
  reason:[...new Set(rows.map(e=>e.text).filter(Boolean))].join(' · ')};
}
export function levelupQueue(s, officerId) {
 const ids=Object.entries(s.campaignGrowth?.officers??{}).filter(([id,r])=>{
  const o=s.officers[id];return !s.wanderers?.[id]&&o?.allegianceFactionId===s.playerFactionId&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&
   (s.campaignGrowth.log??[]).some(e=>e.kind==='LEVEL_UP'&&e.turn===s.turn&&e.officerId===id);
 }).map(([id])=>id);
 return ids.length?`이번 차례 레벨업 ${ids.length}명 · ${Math.max(1,ids.indexOf(officerId)+1)}/${ids.length}`:'';
}
// Art classification uses metadata only; order resolves multi-tag cards deterministically.
export function levelupArtCategory(card) {
 const tags=[...(Array.isArray(card.classTag)?card.classTag:[card.classTag]),card.type,card.category,card.troopType,card.stat].filter(Boolean).join(' ');
 if(/군량|보급|병참|식량|supply|logistic|food/i.test(tags))return 'grain';
 if(/원거리|궁|노병|bow|ranged|crossbow/i.test(tags))return 'crossbow';
 if(/정치|정무|내정|인사|민정|politic|administrat/i.test(tags))return 'seal';
 if(/지략|계략|군재|책사|intell|strateg/i.test(tags))return 'slips';
 if(/지휘|사기|감화|통솔|command|charisma|morale/i.test(tags))return 'banner';
 return 'halberd';
}
// C199: six delivered illustrations and five board parts; background is pending.
export const LEVELUP_ASSETS={"art":{"halberd":"/assets/ui-v3/u3/levelup/art-halberd.png","crossbow":"/assets/ui-v3/u3/levelup/art-crossbow.png","banner":"/assets/ui-v3/u3/levelup/art-banner.png","seal":"/assets/ui-v3/u3/levelup/art-seal.png","slips":"/assets/ui-v3/u3/levelup/art-slips.png","grain":"/assets/ui-v3/u3/levelup/art-grain.png"},"parts":{"stat-strip":"/assets/ui-v3/u3/levelup/stat-strip.png","card":"/assets/ui-v3/u3/levelup/card.png","card-on":"/assets/ui-v3/u3/levelup/card-on.png","seal-select":"/assets/ui-v3/u3/levelup/seal-select.png","btn-confirm":"/assets/ui-v3/u3/levelup/btn-confirm.png"},"background":"/assets/ui-v3/u3/levelup/bg.jpg"};
export function levelupUpgradeText(card, describe) {
 const rank=card.rank??0,next=Math.min(5,rank+1),after=describe({...card,rank:next});
 if(!rank)return after;
 const before=describe({...card,rank});
 return before===after?`${rank}단계 → ${next}단계 · 효과 그대로(단계만 오름)`:`${rank}단계 → ${next}단계: ${before} → ${after}`;
}
export function fatigueLineText(f) {
 // C224: public return-rest deadline only.
 return f?.musterBlocked&&Number.isFinite(f.restTurns)?`쉬는 중 · ${f.restTurns}차례 뒤 출진`:'';
}

// C206: presentation of public campaign projections only.
export function windHtml(weather){
 if(!weather)return '';
 const active=weather.active,kind=active?.kind,weatherLine=kind==='RAIN'?'장마':kind==='COLD'?'한파':'',weatherTip=kind==='RAIN'?'장마: 평지 이동 +1 · 여울 막힘':'한파: 보급권 밖 군량 ×2';
 const arrow=['→','↗','↖','←','↙','↘'][weather.direction]??'•';
 return `<span class="c206-wind" aria-label="바람 ${esc(weather.name)}풍"><span aria-hidden="true">${arrow}</span> ${esc(weather.name)}풍${weatherLine?` · <span title="${weatherTip}">${weatherLine}</span>`:''}</span>`;
}
export const citySecurityName=c=>['안정','불안','혼란'][c?.securityLevel]??String(c?.securityName??'').replace(/동요/g,'불안');
export function combatEffectLines(p){
 return [...new Set((p.effectLines??[]).map(line=>line.replace(/^병종 × 지형:\s*/, '지형 — ').replace(/공격 (-?\d+)%/,(_,n)=>`공격 ${Number(n)>0?'+':'−'}${Math.abs(Number(n))}%`).replace(/궁병 성 공격 — 성벽 내구 피해 ×0\.5/,'성벽 피해 절반')))];
}
export function fireReadout(v){
 return {fires:(v.fire?.tiles??[]).map(f=>({id:f.tileId,until:v.turn+f.turnsLeft-1,turnsLeft:f.turnsLeft})),scorches:v.fire?.burnedForest??[]};
}
export function combatScreenNews(before,after){
 const rows=[];
 if(after.combatWeather?.record&&before.combatWeather?.direction!==after.combatWeather.direction)rows.push({line:`바람 바뀜 — ${after.combatWeather.name}풍`});
 const oldFire=new Set((before.fire?.log??[]).map(e=>JSON.stringify(e)));
 for(const e of after.fire?.log??[])if(!oldFire.has(JSON.stringify(e))&&['SPREAD','EXTINGUISH'].includes(e.kind))rows.push({line:e.text});
 const oldContacts=new Set((before.contacts??[]).map(e=>JSON.stringify(e)));
 for(const e of after.contacts??[]){
  if(e.type!=='CONTACT'||oldContacts.has(JSON.stringify(e)))continue;
  const own=(e.armyIds??[]).map(id=>after.ownArmies?.[id]).find(Boolean);
  const enemy=(e.armyIds??[]).map(id=>after.knowledge?.observedArmies?.[id]).find(a=>a&&after.knowledge.tiles[a.tileId]==='VISIBLE');
  if(!own)continue;
  const name=enemy&&after.officers?.[enemy.commanderId]?.name;
  rows.push({line:`매복! ${name??'숨은 적'} 앞에서 멈춤`,tileId:own.tileId,contact:true});
 }
 const x=after.c31;
 if(x&&!x.resolved&&(before.c31?.actorId!==x.actorId||before.c31?.startTurn!==x.startTurn))rows.push({line:`${after.officers?.[x.actorId]?.name??'위기 장수'}: ${x.warnText}`});
 return rows;
}

// C215: display helpers consume public projections only.
export function combatBonusLabels(record) {
 return [...new Set((record?.appliedTactics??[]).flatMap(r=>[
  ...(r.sideMultiplier>1&&r.side==='FLANK'?[`측면 +${Math.round((r.sideMultiplier-1)*100)}%`]:[]),
  ...(r.sideMultiplier>1&&r.side==='REAR'?[`후방 +${Math.round((r.sideMultiplier-1)*100)}%`]:[]),
  ...(r.charge&&r.chargeMultiplier>1?['돌격!']:[])
 ]))];
}
export function productionCompletions(before,after,names={}) {
 if(before.factionId!==after.factionId||after.turn<before.turn||after.turn>before.turn+1)return [];
 return Object.entries(after.ownCities??{}).flatMap(([cityId,c])=>{
  const prev=before.ownCities?.[cityId],job=prev?.currentProduction;if(!job||c.jobBlocked)return [];
  const facilities=(c.facilities??[]).filter(f=>f.kind===job.kind).length>(prev.facilities??[]).filter(f=>f.kind===job.kind).length;
  const reset=!c.currentProduction||c.currentProduction.key!==job.key||(c.productionProgress??0)<(prev.productionProgress??0);
  const estimate=prev.jobs?.find(j=>j.kind===job.kind)?.estimate;
  const due=estimate&&estimate.progress+estimate.advance+estimate.gain>=estimate.cost;
  const recruit=job.kind==='recruit'&&(reset||due)&&c.reserveTroops>prev.reserveTroops;
  const repair=job.kind==='repair'&&(c.facilities??[]).filter(f=>f.damaged).length<(prev.facilities??[]).filter(f=>f.damaged).length;
  const muster=job.kind==='muster'&&Object.values(after.ownArmies??{}).some(a=>!before.ownArmies?.[a.armyId]&&a.commanderId===job.officerId);
  const reorganize=job.kind==='reorganize'&&before.ownArmies?.[job.armyId]&&after.ownArmies?.[job.armyId]&&after.ownArmies[job.armyId].troopType!==before.ownArmies[job.armyId].troopType;
  return facilities||recruit||repair||muster||reorganize?[{cityId,text:`${c.name??cityId} — ${names[job.kind]??job.kind} ${facilities||repair?'완공':'완료'} · 다음 생산 고르기`}]:[];
 });
}
export function foodExhaustion(v) {
 const cities=Object.values(v.ownCities??{});
 if(!cities.length||cities.some(c=>!Number.isFinite(c.foodLedger?.forecastNet)))return null;
 const net=cities.reduce((n,c)=>n+c.foodLedger.forecastNet,0);
 const stock=cities.reduce((n,c)=>n+Math.max(0,(c.foodStock??0)-(c.reservedResources?.food??0)),0);
 return net<0?Math.ceil(stock/-net):null;
}
export function saveAvailability(raw,decode) {
 if(!raw)return {saved:null,text:'저장 없음'};
 try {const saved=decode(raw);return {saved,text:`${saved.turn}차례 · ${saved.currentDate}일 · ${saved.factions?.[saved.playerFactionId]?.name??saved.playerFactionId}`};}
 catch(error){let format=false;try{const x=JSON.parse(raw);format=!x||!x.state||/지원하지 않는/.test(error.message);}catch{format=true;}
 return {saved:null,text:format?'저장 형식이 다름':'이 판과 호환 안 됨'};}
}
export function updateBestRecord(storage,factionId,score,turn) {
 let records={};try{const raw=JSON.parse(storage?.getItem('sangoku.best.v1')??'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))records=raw;}catch{}
 const old=records[factionId],valid=Number.isFinite(old?.score)&&Number.isInteger(old?.turn)&&old.turn>=1;
 const best=valid&&(old.score>score||old.score===score&&old.turn<=turn)?old:{score,turn};
 try{storage?.setItem('sangoku.best.v1',JSON.stringify({...records,[factionId]:best}));}catch{}
 return best;
}
export function resultHistoryHtml(history) {
 if(!history||Array.isArray(history)&&!history.length)return '';
 const rows=(Array.isArray(history)?history:history.twisted??[]).map(h=>typeof h==='string'?h:h?.history!==undefined?`역사에선 ${h.history} / 이번엔 ${h.twisted}`:h?.text??h?.line??'').filter(Boolean);
 return `<section class="c215-history"><h3>비틀린 역사 ${rows.length}</h3>${rows.slice(0,5).map(t=>`<p>${esc(t)}</p>`).join('')}${rows.length>5?`<p>외 ${rows.length-5}</p>`:''}</section>`;
}
export function resultChronicleRows(result,turn){return (result?.chronicle??[]).map(text=>({turn,kind:'history',text}));}
export function foodLedgerTotals(v){
 const cities=Object.values(v.ownCities??{}),sum=k=>cities.reduce((n,c)=>n+(c.foodLedger?.[k]??[]).reduce((m,e)=>m+e.amount,0),0);
 return {net:cities.reduce((n,c)=>n+(c.foodLedger?.forecastNet??0),0),incoming:sum('incoming'),outgoing:-sum('outgoing')};
}
export function publicEnemyIntents(v,fallback) {
 if(!Array.isArray(v.enemyIntents))return fallback;
 return v.enemyIntents.flatMap(i=>{
  const enemy=v.knowledge?.observedArmies?.[i.armyId],target=v.ownArmies?.[i.targetId]??v.ownCities?.[i.targetId];
  const from=enemy?.tileId??i.from,to=target?.tileId??i.to;
  return typeof from==='string'&&typeof to==='string'&&v.knowledge?.tiles?.[from]==='VISIBLE'&&(target||v.knowledge?.tiles?.[to]==='VISIBLE')?[{from,to}]:[];
 });
}

export function commandLimitText(range){
 if(!Number.isFinite(range?.commandLimit))return '';
 return `지휘 상한 ${troopText(range.commandLimit)}${range.titleBonus?` (칭호 ${range.titleReasons?.map(x=>typeof x==='string'?x:x.name??x.title??'').filter(Boolean).join(' · ')||'보유'} +${troopText(range.titleBonus)})`:''}`;
}
// C280: presentation-only voice data, including a cached failure (no retry loop).
export function createOfficerVoiceLoader(fetcher=globalThis.fetch){
 let pending;
 return ()=>pending??=Promise.resolve().then(()=>fetcher('/data/officer-voice-v0.1.json')).then(r=>r.ok?r.json():null).catch(()=>null);
}
// C354: only values supplied by the caller's public officer/engine readout.
export function officerStats354(stats,sub){
 const help={지휘:'부대의 공격·방어와 전열 유지에 쓰입니다.',무용:'공격 기술과 막아내기·되받기에 쓰입니다.',지략:'계략과 전법의 지략 비교에 쓰입니다.',정무:'성의 산출과 행정에 쓰입니다.',감화:'인재 설득과 외교 교섭에 쓰입니다.'};
 return `<section class="c354-stats" aria-label="능력치">${Object.entries(stats).map(([axis,value])=>`<details><summary title="${esc(help[axis]??'하위 능력치를 펼쳐 봅니다.')}" aria-description="${esc(help[axis]??'하위 능력치를 펼쳐 봅니다.')}"><span class="c357-stat-label"><i aria-hidden="true">${({지휘:"♞",무용:"⚔",지략:"▤",정무:"♜",감화:"❧"})[axis]??""}</i>${esc(axis)}</span><meter min="0" max="100" value="${Number(value)||0}">${esc(value)}</meter><b>${esc(value)}</b><span class="c354-chevron" aria-hidden="true">›</span></summary><dl>${Object.entries(sub[axis]??{}).map(([key,n])=>`<div><dt>${esc(key)}</dt><dd>${esc(n)}</dd></div>`).join('')}</dl></details>`).join('')}</section>`;
}
export function officerTraits354(o,locked=false){
 const g=o.growth??{},ids=g.equippedTraitIds??[],owned=g.ownedTraits??[],reason=g.traitLoadoutReason||(locked?'지금은 할 수 없습니다.':''),full=ids.length>=3;
 const card=c=>{const on=ids.includes(c.traitId),hint=reason||(on?'눌러서 해제':full?'눌러서 장착 · 바꿀 장착 특기를 먼저 해제하세요.':'눌러서 장착');return `<button type="button" data-c354-trait="${esc(c.traitId)}" aria-pressed="${on}" ${reason?'disabled':''} title="${esc([hint,abilityGloss356(c)||c.text||c.name].filter(Boolean).join(' · '))}">${dockIcon327({officer:o},'trait',c)}<b>${esc(abilityName356(c))}</b><small>${reason?'잠금':on?'✓ 장착':full?'빈 칸 필요':'장착'}</small></button>`;};
 return `<section class="c354-traits${reason?' is-locked':''}" aria-label="일반특기"><h3>일반특기${reason?' · 잠금':''}</h3><p role="status">${reason?' · 성 안에서만 바꿀 수 있습니다.'+(/성 안/.test(reason)?'':' · '+esc(reason)):' · 성 안에서만 변경 · 눌러서 장착/해제'}</p><div class="c354-trait-pair"><div class="c354-equipped" aria-label="장착 3칸">${Array.from({length:3},(_,i)=>{const c=owned.find(c=>c.traitId===ids[i]);return c?card(c):'<span class="c354-empty">빈 일반특기 칸</span>';}).join('')}</div><div class="c357-owned-wrap"><h4>보유 특기</h4><div class="c354-owned" aria-label="보유 일반특기">${owned.map(c=>card(c)).join('')||'<p>보유 일반특기가 없습니다.</p>'}</div></div></div></section>`;
}
export function officerIntroHtml(data,id){
 const lines=data?.intro?.[id];
 if(!Array.isArray(lines)||lines.length!==3||!lines.every(x=>typeof x==='string'&&x.trim()))return '';
 return `<section class="c280-intro" aria-label="인물 소개">${lines.map(line=>`<p>${esc(line)}</p>`).join('')}</section>`;
}
export function officerVoiceType(engineId,isRuler=false){
 const type=({MAENG:'hero',GANG:'hero',TU:'hero',CHEOK:'hero',CHAEK:'strategist',GUKSA:'strategist',CHUKSEONG:'strategist',JEONNONG:'strategist',HOWI:'loyal',JANGGUN:'loyal'})[engineId]??'common';
 return type==='loyal'&&isRuler?'common':type;
}
export function officerMomentVoice(c,units,data){
 if(c.uiNotice)return null;
 let kind,id;
 if(c.uiCapturedIds?.length){kind='captured';id=c.uiCapturedIds[0];}
 else if(c.captureLine){kind='capture';id=c.attackerId;}
 else if(c.eliminatedIds?.length){kind='destroy';id=c.eliminatedIds.includes(c.attackerId)?c.targetId:c.attackerId;}
 else {id=c.moraleChanges?.find(x=>x.to==='ROUTING')?.armyId;if(id)kind='rout';}
 const speaker=units.find(u=>u.id===id);
 if(!speaker?.name)return null;
 const lines=data?.moments?.[kind],line=lines?.[officerVoiceType(speaker.engineId,speaker.isRuler)]??lines?.common;
 return typeof line==='string'&&line.trim()?{kind,speaker,line}:null;
}
export function officerMomentHtml(voice){
 return voice?`<blockquote class="c280-moment-voice"><p>${esc(voice.line)}</p><cite>${esc(voice.speaker.name)}</cite></blockquote>`:'';
}
export function characterHistoryHtml(v,id){
 const rows=(v.characterHistory?.[id]??[]).slice(-3).reverse();
 return `<section class="c216-history"><h3>지난 일</h3>${rows.length?rows.map(r=>`<p><small>${esc(r.turn)}차례</small> ${esc(r.text??`${r.title} — ${r.choice}: ${r.result}`)}</p>`).join(''):'<p class="muted">아직 기록된 사건·맹세가 없습니다.</p>'}</section>`;
}
export function reserveTransferLines(v){
 return (v.reserveTransfers??[]).filter(t=>t.state!=='ARRIVED').map(t=>({cityId:t.toCityId,text:`예비병 ${troopText(t.count)} · ${v.ownCities?.[t.fromCityId]?.name??'출발 성'} → ${v.ownCities?.[t.toCityId]?.name??'도착 성'} · ${t.state==='BLOCKED'?'이동 막힘':`${Math.max(0,t.arrivalTurn-v.turn)}차례 뒤 도착`}`}));
}
// Only public, visible combatants can open a rival scene. The set belongs to the UI session.
export function publicRivalScene(before,after,record,data,seen){
 const armies={...before.knowledge?.observedArmies,...before.ownArmies,...after.ownArmies};
 const a=armies[record.attackerId],b=armies[record.targetId];
 if(!a||!b||a.factionId===b.factionId||!['ATTACK','TACTIC','JOINT_TACTIC'].includes(record.kind))return null;
 const visible=x=>!!before.ownArmies?.[x.armyId]||before.knowledge?.tiles?.[x.tileId]==='VISIBLE';
 if(!visible(a)||!visible(b))return null;
 const key=[a.commanderId,b.commanderId].sort().join('|'),pair=data?.pairs?.[key]?.RIVAL;
 const rel=before.social?.officers?.[a.commanderId]?.relations?.find(r=>r.officerId===b.commanderId)??before.social?.officers?.[b.commanderId]?.relations?.find(r=>r.officerId===a.commanderId);
 if(seen.has(key)||!pair||rel?.tier!=='RIVAL')return null;
 const ids=pair.speakerIds??key.split('|');
 if(ids.length!==2||!ids.every(id=>key.split('|').includes(id))||!Array.isArray(pair.lines))return null;
 seen.add(key);
 return {key,tier:'RIVAL',title:pair.title,lines:pair.lines,officers:ids.map(id=>({officerId:id,name:before.officers?.[id]?.name??after.officers?.[id]?.name??(id===a.commanderId?a.commanderName:b.commanderName)??id}))};
}

export const stratagemReasonText=code=>({STRATAGEM_OFFICER:'성에 있는 자유 장수만 가능',STRATAGEM_COMMANDING:'부대 지휘 중',STRATAGEM_ACTION_USED:'이번 차례 주 행동 사용',STRATAGEM_COOLDOWN:'재사용 대기 중',STRATAGEM_TARGET:'적 대상 종류를 확인하세요',STRATAGEM_NOT_VISIBLE:'지금 보이지 않는 대상',STRATAGEM_RANGE:'범위 밖'})[code]??code;
export function stratagemEffectText(kind){
 const e=kind.effect;
 return e.outputMult!==undefined?`성 산출 −${Math.round((1-e.outputMult)*100)}% · ${e.turns}차례 · 자동 충원 멈춤`:e.morale?`부대 사기 동요 · ${e.turns}차례`:`휴대 군량 −${Math.abs(e.carriedFood)}차례분`;
}
const STRATAGEM_CARDS=stratagemRules.kinds.map(k=>({...k,kind:k.id,art:({RUMOR:'rumor',SOW_DISCORD:'discord',DISRUPT_SUPPLY:'supply'})[k.id],effect:stratagemEffectText(k),blocked:k.target==='CITY'?'범위 안 보이는 적 성 없음':'범위 안 보이는 적 부대 없음'}));
export function resultSceneHtml({name='',face='',title='',text='',detail='',closeAttribute=''}){
 return `<section class="c266-result-scene">${face?`<img class="c266-result-portrait" src="${esc(face)}" alt="${esc(name)}">`:''}<div class="c266-result-dialogue"><b>${esc(name)}</b><h2>${esc(title)}</h2><p role="status">${esc(text)}</p>${detail?`<small>${esc(detail)}</small>`:''}<button ${closeAttribute}>▼ 닫기</button></div></section>`;
}
export function stratagemPanelHtml(options,ui={},result=null,faces={}){
 const card=STRATAGEM_CARDS.find(c=>c.kind===(result?.kind??ui.kind));
 if(result&&globalThis.document?.documentElement?.dataset.ui==='kit')return resultSceneHtml({name:result.officerName??result.text?.split(' · ')[0],face:faces[result.officerId],title:(card?.name??'계략')+' · '+(result.success?'성공':'실패'),text:result.text,detail:result.exposed?'적에게 발각됨':result.success?result.effectText:'실패 · 효과 없음',closeAttribute:'data-stratagem-close'});
 if(result)return `<section class="c226-result k-card-paper" aria-labelledby="c226-result-title"><span class="c227-result-face${result.success===false?' failed':''}">${faces[result.officerId]?`<img src="${esc(faces[result.officerId])}" alt="실행 장수">`:''}</span><div class="c227-result-copy"><img class="c226-result-art" src="/assets/ui-v3/u3/stratagem/art-${card?.art??'rumor'}.png" alt=""><h2 id="c226-result-title">${esc(card?.name??'계략')} · ${result.success===undefined?'결과':result.success?'성공':'실패'}</h2><p role="status">${esc(result.text)}</p><p>들킴 · ${result.exposed?'적에게 발각됨':'들키지 않음'} · ${result.success?'효과':'실패 · 효과 없음'}${result.success?' · '+esc(result.effectText??''):''}</p><button class="k-btn" data-stratagem-close>닫기</button></div></section>`;
 const roster=[...options].sort((a,b)=>b.intelligence-a.intelligence);
 const officer=options.find(o=>o.officerId===ui.officerId),choices=officer?.choices??[],p=choices.find(p=>JSON.stringify(p.cmd)===ui.commandKey);

 return `<div class="c226-controls"><h2>계략${card?' · '+esc(card.name):''}${officer?`<small class="c262-cooldown">주 행동 1 · 뒤 ${stratagemRules.cooldown}차례 대기 · 재사용 대기 ${esc(officer.cooldown)}차례${officer.blockedReason==='STRATAGEM_ACTION_USED'?' · 이번 차례 주 행동 씀':''}</small>`:''}</h2><div class="c227-roster" role="group" aria-label="장수 고르기">${roster.map((o,index)=>{const reason=o.blockedReason?stratagemReasonText(o.blockedReason):!o.choices.length?'보이는 대상 없음':'';return `<button type="button" class="c227-officer${o.officerId===ui.officerId?' on':''}" data-stratagem-officer="${esc(o.officerId)}" ${index>=4&&!ui.showAll?'hidden':''} aria-pressed="${o.officerId===ui.officerId}" ${reason?'disabled':''}><span class="c227-face">${faces[o.officerId]?`<img src="${esc(faces[o.officerId])}" alt="">`:''}</span><span><b>${esc(o.name)}</b> · <span class="c262-agent-stat">지략 ${esc(o.intelligence)}</span><small>재사용 대기 ${esc(o.cooldown)}차례${reason?' · '+esc(reason):''}</small></span></button>`;}).join('')}${roster.length>4?`<button data-stratagem-more>${ui.showAll?'접기':'더 보기'}</button>`:''}</div>
 ${officer&&!ui.kind?`<div class="c226-cards" aria-label="종류 고르기">${STRATAGEM_CARDS.map(c=>{const blocked=!choices.some(p=>p.cmd.kind===c.kind);return `<button class="c226-card" data-stratagem-kind="${c.kind}" ${blocked?'disabled':''}><span class="art"><img src="/assets/ui-v3/u3/stratagem/art-${c.art}.png" alt=""></span><h3>${c.name}</h3><span class="c266-target-kind" title="${esc(stratagemRules.rangeText)}">${c.target==='CITY'?'적 성':'적 부대'}</span><p>${c.effect}</p>${blocked?`<small>${c.blocked}</small>`:''}</button>`;}).join('')}</div>`:''}
 ${card?`<button class="c226-picked" data-stratagem-repick><img src="/assets/ui-v3/u3/stratagem/art-${card.art}.png" alt="">${card.name} · 다시 고르기</button><p>밝은 테두리의 ‘대상’을 누르세요.</p>`:''}
 ${p?`<section class="c226-preview"><h3>계략 예고 · ${esc(p.targetName)}</h3><p class="c248-executor">${faces[officer.officerId]?`<img src="${esc(faces[officer.officerId])}" alt="실행 장수">`:''}${esc(officer.name)} · 지략 ${esc(officer.intelligence)}</p><p>${esc(p.effectText)}</p>${outcomeOddsHtml(p)}${p.exposedRisk>0&&ui.exposureText?`<p class="c266-exposure">${esc(ui.exposureText)}</p>`:''}</section>`:''}<footer class="c262-actions"><button class="k-btn k-btn-primary" data-stratagem-execute ${p?'':'disabled title="대상을 고르세요"'}>실행</button><button class="k-btn" data-stratagem-close>취소 · Esc</button></footer></div>`;
}

// All figures come from the existing public choice. Missing target details remain unknown.
export function kitDecisionHtml(card,officer,p,faces={}){
 const face=(name,id,intelligence)=>`<section><span class="c253-decision-face">${faces[id]?`<img src="${esc(faces[id])}" alt="">`:'<span aria-hidden="true">?</span>'}</span><b>${esc(name)}</b><small>지략 ${esc(intelligence??'정보 없음')}</small></section>`;
 return `<div class="c226-controls k-card-paper c253-decision"><header>${card?.art?`<img src="/assets/ui-v3/u3/stratagem/art-${esc(card.art)}.png" alt="">`:''}<h2>${esc(card?.name??'결정')} <span class="k-seal">計</span></h2></header><div class="c253-duel">${face(officer.name,officer.officerId,officer.intelligence)}<span aria-hidden="true">→</span>${face(p.targetName,p.targetOfficerId,p.targetIntelligence)}</div>${kitOddsHtml(p)}<p>${esc(p.effectText)}</p><button class="k-btn-primary" data-stratagem-execute>실행</button><button class="k-btn" data-stratagem-repick>다시 고르기</button><button class="k-btn" data-stratagem-close>취소</button></div>`;
}
export function kitOddsHtml(p){
 const success=Math.max(0,Math.min(100,Number(p.chance)||0)),failure=100-success,exposure=Number.isFinite(p.exposedRisk)?Math.max(0,Math.min(failure,p.exposedRisk)):0;
 return `<div class="c253-odds"><div class="c253-odds-bar" role="img" aria-label="성공 ${success}% · 실패 ${failure}% · 발각 ${exposure}%, 실패에 포함"><i style="width:${success}%"></i><i class="failure" style="width:${failure}%"><i class="exposed" style="width:${failure?exposure/failure*100:0}%"></i></i></div><p>성공 ${success}% · 실패 ${failure}% · 발각 ${exposure}% <small>실패에 포함</small></p></div>`;
}

export function outcomeOddsHtml(p){
 const values=[['성공',p.chance],['실패',100-p.chance],...(Number.isFinite(p.exposedRisk)?[['발각',p.exposedRisk]]:[])];
 return `<div class="c248-odds" aria-label="결과 확률">${values.map(([label,value])=>`<div class="${value===0?'is-zero':''}" aria-label="${label} ${esc(value)}%" title="${esc(label==='발각'?'실패에 포함':Number.isFinite(p.exposedRisk)?stratagemRules.chance.text+' · 현재 '+p.chance+'%':label)}"><b class="k-medallion">${esc(value)}%</b><span>${label}</span></div>`).join('')}</div>`;
}
export function diplomacyLikelihood(c){
 return Number.isFinite(c?.score)?`받아들일 가능성 ${c.score>=0?'높음':'낮음'} · 현재 판정 ${c.score>=0?'수락':'거절'}`:'받아들일 가능성 · 판정 데이터 없음';
}
export function diplomacyLikelihoodHtml(c){
 const known=Number.isFinite(c?.score),level=known?(c.score>=0?'high':'low'):'unknown';
 return `<small class="c248-likelihood" data-level="${level}" title="${esc([diplomacyLikelihood(c),...(c?.items??[]).map(r=>typeof r==='string'?r:`${r.label??r.text??''} ${r.value??r.score??''}`),...(c?.effectLines??[])].join(' · '))}">가능성 ${known?(c.score>=0?'높음':'낮음'):'—'}</small>`;
}
export function diplomacyReasonPlacement(plate,host,nameBottom=plate.bottom){
 return {left:plate.left-host.left,top:Math.max(plate.bottom,nameBottom)+8-host.top,width:plate.width};
}

// C296: kit presentation consumes public facts; action buttons retain immediate execution.
export function diplomacyKitHtml(v,pick,{nameOf,medal,portrait,locked=false,facts,timings={},reply=null}){
 const d=v.diplomacy,known=pick?.contact!==false,a=facts?.attitude??{label:'미접촉',tone:'neutral',value:null};
 const stateLabel=f=>f.contact===false?'아직 만나지 않음':({WAR:'전쟁 중',TRUCE:'휴전 중',ALLIANCE:'동맹 중'})[f.state]??'상태 확인 불가';
 const timing=f=>f.contact===false?'':[
  timings[f.factionId]?.pending?`합의 · 적용 ${diplomacyTimingText(timings[f.factionId])}`:'',
  Number.isFinite(f.turnsLeft)?`활성 조약 · 남은 ${f.turnsLeft}차례`:'',
  Number.isFinite(f.endingAt)?`${f.endingAt}차례에 동맹 종료`:''
 ].filter(Boolean).join(' · ');
 const icon=f=>symImg('diplomacy',({WAR:'hostile',TRUCE:'neutral',ALLIANCE:'alliance'})[f.state]??'neutral');
 const reasons=known?(pick?.opinionReasons??[]):[];
 const reason=r=>`<p><span>${esc(r.text)}${Number.isFinite(r.turnsLeft)?` <small>남은 ${r.turnsLeft}차례</small>`:''}</span><b class="${r.value<0?'neg':''}">${r.value>=0?'+':''}${esc(r.value)}</b></p>`;
 const offer=(label,attr,c,forecast,symbol,extra='')=>{
  const enabled=known&&c?.ok&&!locked,details=known?[c?.reason,...(c?.effectLines??[]),extra,...(forecast?.reasons??[])].filter(Boolean).join(' · '):'아직 만나지 않음';
  const condition=enabled?'실행 가능':known?(c?.reason??(locked?'현재 입력 대기 중':'현재 실행 불가')):'아직 만나지 않음';
  const cost=known&&Number.isFinite(c?.cost)?`인망 −${c.cost}`:'';
  return `<div class="c296-offer" tabindex="${enabled?'-1':'0'}" data-c296-summary="${esc(label+' · '+details)}"><button class="k-btn dq-act${enabled?'':' k-disabled'}" ${attr} ${enabled?'':'disabled'}><span class="c296-offer-text"><strong>${symImg('diplomacy',symbol)}<b class="c296-action-name">${label}</b><em>${esc(cost)}</em></strong><small>${esc(known?(extra||c?.effectLines?.find(t=>!t.startsWith('인망'))?.split('(')[0]||c?.reason||''):'아직 만나지 않음')}</small></span><span class="c296-forecast"><span>${esc(condition)}</span><small>${forecast&&known?`수락 예상: ${esc(forecast.label)}`:known?'상대 수락 불필요':'수락 예상: 확인 불가'}</small></span></button></div>`;
 };
 const act=kind=>offer(({TRUCE:'휴전',ALLIANCE:'동맹'})[kind]+' 제안',`data-diplo-propose="${esc(pick.factionId)}" data-kind="${kind}"`,pick.canPropose?.[kind],facts?.forecasts?.[kind],kind==='ALLIANCE'?'alliance':'neutral',kind==='TRUCE'&&known?`제안 적용: ${diplomacyTimingText({...timings[pick.factionId],kind:'TRUCE'})}`:facts?.allianceEffect??'');
 const list=`<aside class="c262-factions"><header>${medal(v.factionId,48)}<div><b>${esc(v.faction?.name??'우리')} · 우리 세력</b><small>신용 ${esc(d?.me?.trust??'—')} · 위협 ${esc(d?.me?.threat??'—')}</small></div></header><p class="c296-list-key">상대 · 현재 전쟁/조약 상태</p><nav aria-label="외교 상대">${(d?.factions??[]).map(f=>`<button class="c262-faction${f.factionId===pick?.factionId?' on':''}" data-diplo-pick="${esc(f.factionId)}" aria-pressed="${f.factionId===pick?.factionId}" data-state="${esc(f.state)}">${f.contact===false?'<img class="c296-unmet" src="/docs/work-integration/20261019/c457/anonymous-ruler.png" alt="미접촉">':medal(f.factionId,48)}<span><b>${esc(nameOf(f))}</b><small>${esc(stateLabel(f))}</small></span></button>`).join('')}</nav></aside>`;
 if(!pick)return `<h1>외교</h1>${list}<main class="c262-negotiation">외교 상대 없음</main><button class="k-btn dq-close" data-diplo-close>닫기 · Esc</button>`;
 const resultLabel=({ACCEPT:'수락됨',REJECT:'거절됨',GIFT:'선물 완료',END_NOTICE:'동맹 종료 통보'})[reply?.type]??'회신';
 return `<div class="c456-diplomacy" data-contact="${known}"><h1>외교</h1>${list}<main class="c262-negotiation" tabindex="0" aria-label="외교 판단과 제안">
 <header class="c296-heading"><h2>${esc(nameOf(pick))}</h2><p class="c262-relation">${known?icon(pick):''}${esc(stateLabel(pick))}</p><small>${known?esc(timing(pick)):'접촉 후 제안 가능'}</small></header>
 ${known?`<section class="c262-attitude" data-tone="${esc(a.tone)}" aria-label="상대의 태도"><header><h3>태도 · ${esc(a.label)}</h3><b>${a.value==null?'—':a.value>0?'+'+a.value:a.value}</b></header><div class="c248-reasons">${reasons.length?reasons.slice(0,3).map(reason).join(''):'<p>공개된 태도 이유 없음</p>'}${reasons.length>3?`<details><summary>이유 더 보기 · ${reasons.length-3}개</summary>${reasons.slice(3).map(reason).join('')}</details>`:''}</div></section>`:''}
 <div class="dq-acts" aria-label="누르면 실행되는 외교 제안">${offer('선물',`data-diplo-gift="${esc(pick.factionId)}"`,pick.canGift,null,'friendly')}${act('TRUCE')}${act('ALLIANCE')}${pick.state==='ALLIANCE'&&known?offer('동맹 종료',`data-diplo-end="${esc(pick.factionId)}"`,facts?.endAlliance,null,'hostile'):''}</div>
 ${known?`<p class="c279-war">${esc(diplomacyWarLine(d,pick.factionId))}</p>`:''}
 ${known?`<section class="c296-response" aria-label="제안 설명과 회신"><h3>${reply?resultLabel:'제안 설명'}</h3><p class="c262-dialog" role="status">${esc(reply?.text??'제안 행을 누르면 실행합니다. 동맹 종료는 확인 후 실행합니다.')}</p><p class="c296-offer-summary">${esc(reply?'현재 상태와 조약의 적용 시점을 위에서 확인하세요.':'제안 행에 초점을 맞추면 비용·효과·예상 이유를 여기서 읽을 수 있습니다.')}</p><p class="dq-msg" role="alert"></p></section>`:'<p class="dq-msg" role="alert"></p>'}
 </main><div class="c262-counterpart">${known&&portrait(pick.factionId)?`<img src="${esc(portrait(pick.factionId))}" alt="${esc(nameOf(pick))}">`:!known?'<img class="c456-anonymous" src="/docs/work-integration/20261019/c457/anonymous-ruler.png" alt="미접촉 군주의 익명 실루엣">':''}</div><button class="k-btn dq-close" data-diplo-close>닫기 · Esc</button></div>`;
}
export function diplomacyReasonsHtml(f){
 if(f?.contact===false)return '<div class="c248-reasons">아직 만나지 않음 · 이유 데이터 없음</div>';
 const relation=({OWN:'own',ALLIANCE:'alliance',ALLY:'alliance',FRIENDLY:'friendly',HOSTILE:'hostile',WAR:'hostile',NEUTRAL:'neutral',NEGOTIATION:'negotiation'})[f?.state??f?.relation];
 const mark=relation?symImg('diplomacy',relation,{size:'sm'}):'';
 const rows=f?.opinionReasons;
 const reason=r=>`${r.text} ${r.value>=0?'+':''}${r.value}${Number.isFinite(r.turnsLeft)?` · ${r.turnsLeft}차례 남음`:''}`;
 return `<div class="c248-reasons" aria-label="우리를 보는 마음의 이유">${mark}${Array.isArray(rows)&&rows.length?rows.slice(0,5).map(r=>`<p title="${esc(reason(r))}"><b class="${r.value<0?'neg':''}">${r.value>=0?'+':''}${esc(r.value)}</b> ${esc(r.text)}${Number.isFinite(r.turnsLeft)?` <small>${r.turnsLeft}차례 남음</small>`:''}</p>`).join(''):'<p>이유 데이터 없음</p>'}${rows?.length>5?`<p title="${esc(rows.slice(5).map(reason).join(' · '))}">그 밖 ${rows.length-5}개 요인</p>`:''}<p class="c248-total">합계 ${f?.opinionOfMe>=0?'+':''}${esc(f?.opinionOfMe??'—')}</p></div>`;
}

// C271: presentation only; all names and deadlines come from the public event.
export function eventNeedsConfirmation(event,choice){
 return event?.scale==='CRISIS'||event?.eventId==='CRISIS_HEGEMONY'||!!choice?.oath;
}
export function eventCostLines(choice){
 const labels={food:'식량',prestige:'인망',reserves:'예비병'};
 return (choice?.actualPreview?.changes??[]).filter(c=>labels[c.effect]&&Number.isFinite(c.before)&&Number.isFinite(c.after)&&c.after<c.before).map(c=>{
  const display=n=>c.effect==='reserves'?troopText(n):String(n);
  return `비용 · ${labels[c.effect]} −${display(c.before-c.after)} (${display(c.before)} → ${display(c.after)})`;
 });
}
export function eventTextHtml(text,event={}){
 const names=[...[event.cityName].filter(Boolean).map(name=>({name,kind:'city'})),...(event.officerNames??[]).filter(Boolean).map(name=>({name,kind:'officer'}))].sort((a,b)=>b.name.length-a.name.length);
 let out='',rest=String(text??'');
 while(rest){const hits=names.map(n=>({...n,at:rest.indexOf(n.name)})).filter(n=>n.at>=0).sort((a,b)=>a.at-b.at||b.name.length-a.name.length),hit=hits[0];if(!hit){out+=esc(rest);break;}out+=esc(rest.slice(0,hit.at))+`<strong class="c271-${hit.kind}">${esc(hit.name)}</strong>`;rest=rest.slice(hit.at+hit.name.length);}
 return out;
}

// C297: presentation of the existing public decision model. No new cost or odds.
export function eventChoiceMarkup297(event,{locked=false,selected=null}={}){
 const choiceHtml=(c,i,summary=false)=>{
  const route=({history:'역사대로',twist:'다르게',defer:'미루기'})[c.id];
  const label=route?c.label.replace(/^(역사대로|다르게)\s*[—–-]\s*/,''):c.label;
  const lines=[...eventCostLines(c),...(c.preview??'').split(/\s*\|\s*/).filter(Boolean)];
  if(Number.isFinite(c.oath?.deadline))lines.push(`${c.oath.deadline}차례 안`);
  if(c.blockedReason)lines.push(`불가: ${c.blockedReason}`);
  const tag=summary?'div':'button',attributes=summary?`data-event-selected="${esc(c.id)}"`:`type="button" data-event-choice="${esc(c.id)}" ${c.blockedReason||locked?'disabled':''}`;
  return `<${tag} class="ev-choice c297-choice" ${attributes}><span class="ev-card-face"><span class="key">${i+1}</span><b>${esc(label)}</b></span><small>${route?`<strong class="c197-route">${route}</strong>`:''}${lines.map(t=>`<span class="c262-effect">${esc(t)}</span>`).join('')}</small></${tag}>`;
 };
 const pick=event.choices.find(c=>c.id===selected&&!c.blockedReason);
 if(pick)return `<section class="c297-confirm" aria-label="선택 확인"><p class="c297-stage">선택한 행동</p>${choiceHtml(pick,event.choices.indexOf(pick),true)}<footer><button type="button" class="k-btn k-btn-primary" data-event-confirm ${locked?'disabled':''}>이대로</button><button type="button" class="k-btn" data-event-back>돌아가기</button></footer></section>`;
 return event.choices.map((c,i)=>choiceHtml(c,i)).join('');
}

// The legacy rule/report controller is embedded in world.html. Adapt only the
// kit presentation here, keeping that bundle and its queue/save contract intact.
export function mountReportPresentation297(doc=globalThis.document){
 if(doc?.documentElement?.dataset.ui!=='kit')return;
 const host=doc.querySelector('#c254-card'),ticker=doc.querySelector('#c262-report-ticker');
 if(!host||!ticker)return;
 let replay=false,lastPaper=null,recordKey=null;
 const positions=new Map(),remember=()=>{if(recordKey&&lastPaper){positions.set(recordKey,lastPaper.scrollTop??0);if(positions.size>6)positions.delete(positions.keys().next().value);}};
 const toast=doc.createElement('aside');toast.id='c297-small-reports';toast.setAttribute('aria-live','polite');doc.body.append(toast);
 const isReport=()=>!host.hidden&&host.classList.contains('report');
 const input=e=>{
  if(!isReport())return;
  if(e.type==='click'){
   // Reading, scrolling and expanding a report must never acknowledge it.
   if(host.contains(e.target)){if(!e.target.closest('[data-card-next],[data-card-close]'))e.stopImmediatePropagation();else remember();}
  }else if(e.repeat){e.preventDefault();e.stopImmediatePropagation();}
  else if(e.key==='Tab'){
   e.preventDefault();e.stopImmediatePropagation();const buttons=[...host.querySelectorAll('button,summary')].filter(n=>n.getClientRects().length),at=buttons.indexOf(doc.activeElement);buttons[(at+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
  }
  else if(e.key==='Enter'&&e.target.closest?.('[data-card-close],summary')){
   e.preventDefault();e.stopImmediatePropagation();e.target.click();
  }else if(['Enter','Escape',' '].includes(e.key))remember();
 };
 doc.defaultView.addEventListener('click',input,true);doc.defaultView.addEventListener('keydown',input,true);
 const reopening=e=>{if(e.target.closest('[data-report-reopen]')&&host.hidden){replay=true;queueMicrotask(()=>{if(host.hidden)replay=false;});}};
 ticker.addEventListener('click',reopening,true);
 const update=()=>{
  if(!isReport()){if(host.hidden)replay=false;return;}
  const paper=host.querySelector('.c254-paper');if(!paper||paper===lastPaper)return;lastPaper=paper;
  if(paper.dataset?.reportReplay==='true')replay=true;
  const image=paper.querySelector('img:not(.sg-sym)'),kind=image?.getAttribute('src')?.match(/\/report-([^/]+)\.webp$/)?.[1];
  host.dataset.reportKind=kind??'';
  if(!replay&&['built','envoy'].includes(kind)){
   const note=doc.createElement('section');note.className='k-panel-ink';
   const heading=doc.createElement('b'),body=doc.createElement('p');heading.textContent=paper.querySelector('h2')?.textContent??'';
   body.textContent=[paper.querySelector('.c271-report-kind')?.textContent,paper.querySelector('h2 + p')?.textContent].filter(Boolean).join(' · ');note.append(heading,body);toast.append(note);
   while(toast.children.length>2)toast.firstElementChild.remove();setTimeout(()=>note.remove(),6000);
   host.querySelector('[data-card-next]')?.click();return;
  }
  const stage=doc.createElement('p');stage.className='c297-stage';stage.textContent=replay?'다시 읽기 · 이미 반영된 결과':'확정 결과';
  paper.querySelector('h2')?.before(stage);
  recordKey=kind+':'+paper.querySelector('h2')?.textContent;if(replay)paper.scrollTop=positions.get(recordKey)??0;
  const next=paper.querySelector('[data-card-next]');
  if(next?.textContent.trim()==='그 성으로')next.textContent=`${paper.querySelector('h2')?.textContent??'성'} 보기`;
  if(next?.textContent.trim()==='지도로'){const close=paper.querySelector('[data-card-close]');if(close)close.hidden=true;}
  const chips=paper.querySelector('.c262-report-effects');
  if(chips?.children.length>3){const more=doc.createElement('details');more.className='c297-more-effects';const title=doc.createElement('summary');title.textContent='나머지 결과';more.append(title);while(chips.children.length>3)more.append(chips.children[3]);chips.after(more);}
 };
 const observer=new doc.defaultView.MutationObserver(update);observer.observe(host,{childList:true,attributes:true,attributeFilter:['hidden'],subtree:false});update();
 return ()=>{observer.disconnect();ticker.removeEventListener('click',reopening,true);doc.defaultView.removeEventListener('click',input,true);doc.defaultView.removeEventListener('keydown',input,true);toast.remove();};
}

export function publicWorldNews(before,after){
 const met=new Set((after.diplomacy?.factions??[]).filter(f=>f.contact===true).map(f=>f.factionId));
 const names=new Map((after.diplomacy?.factions??[]).map(f=>[f.factionId,f.name]));
 const captures=Object.values(after.knowledge?.cities??{}).filter(c=>{
  const old=before.knowledge?.cities?.[c.cityId];
  return old&&old.ownerFactionId!==c.ownerFactionId&&old.ownerFactionId!==after.factionId&&c.ownerFactionId!==after.factionId&&met.has(old.ownerFactionId)&&met.has(c.ownerFactionId)&&after.knowledge.tiles[c.tileId]==='VISIBLE';
 }).slice(0,2).map(c=>({text:`천하 소식 · ${names.get(c.ownerFactionId)} 세력이 ${c.name}을 얻었습니다`,cityId:c.cityId,tileId:c.tileId}));
 const relations=(after.diplomacy?.publicRelations??[]).flatMap(r=>{
  if([r.from,r.to].includes(after.factionId))return [];
  const old=(before.diplomacy?.publicRelations??[]).find(p=>p.from===r.from&&p.to===r.to);
  if(!old||old.state===r.state)return [];
  const kind=r.state==='WAR'?old.state:r.state;
  return [{text:`천하 소식 · ${names.get(r.from)} · ${names.get(r.to)} ${kind==='TRUCE'?'휴전':'동맹'} ${r.state==='WAR'?'종료':'체결'}`}];
 });
 return [...relations,...captures].slice(0,2);
}

// Promotion cards consume only the public pending growth projection.
export function promotionCardsMarkup(pending,picked=null){
 return pending.cards.map(c=>`<button class="draft-card c233-promotion${c.traitId===picked?' picked':''}" data-rarity="LEGENDARY" data-draft-pick="${esc(c.traitId)}" aria-pressed="${c.traitId===picked}"><span class="kind">2차 전직 · ${esc(c.axis??'기본')}</span><h3>${esc(c.name)}</h3>${c.seal?`<p class="c233-seal">봉인 · ${esc(c.seal)}</p>`:''}<p class="c233-rule">${esc(c.text)}</p><span class="foot">${c.count!==undefined?`실적 ${c.count}/${c.goal}`:'W 칸 그대로'}</span></button>`).join('');
}

// C236: stable command rows. Faces use the shared heads.json crop observer.
export function commandRowsHtml(rows=[],kind='unit',selected=null,l0=false){
 if(l0)rows=[...rows].sort((a,b)=>Number(!!a.ended)-Number(!!b.ended));
 return rows.map(r=>`<button type="button" class="c236-row${r.ended?' spent':''}${r.id===selected?' selected':''}" data-command-kind="${kind}" data-command-id="${esc(r.id)}" aria-pressed="${r.id===selected}"><span class="c236-face">${r.face?`<img src="${esc(r.face)}" alt="${esc(kind==='city'?r.governor:r.name)}">`:'城'}</span><span class="c236-row-text"><b>${esc(r.name)}${r.promotionReady?'<i class="c266-promotion-dot" title="2차 전직 가능" aria-label="2차 전직 가능"></i>':''}</b>${kind==='unit'?`<span>${symImg('troops',({bow:'bow',cavalry:'cavalry',spear:'spear'})[r.type]??'sword',{size:'sm',label:r.typeName,className:'c236-troop-icon'})} ${esc(r.typeName)} · ${troopText(r.troops)}</span><small class="c236-actions">이동 <span class="${r.actions.move.available?'':'used'}">${r.actions.move.available?'가능':'사용함'}</span> · 주 행동 <span class="${r.actions.main.available?'':'used'}">${r.actions.main.available?'가능':'사용함'}</span></small><small>${esc(r.risk)}</small>`:`<span>${esc(cityProductionText(r.production))}</span><small>군량 ${r.food===null?'유지':`${r.food}차례 뒤 바닥`} · ${esc(r.threat)}</small>`}</span></button>`).join('')||`<p>${kind==='unit'?'출진한 부대가 없습니다.':'내 성이 없습니다.'}</p>`;
}
function mountCommandScreen(root){
 root.querySelector('.ih').insertAdjacentHTML('beforeend',`<aside class="c236-command-list" aria-label="출진 부대와 성"><header><b class="c236-list-count"></b><button data-command-collapse aria-expanded="true">접기</button></header><nav aria-label="목록 종류"><button data-command-tab="unit" aria-pressed="true">출진 부대</button><button data-command-tab="city" aria-pressed="false">성</button></nav><div class="c236-rows"></div></aside><nav class="c236-map-switches" aria-label="지도 보기">${RAIL.map(([m,label])=>`<button data-mode="${m}" aria-pressed="false">${label}</button>`).join('')}</nav><aside class="c236-layer-key" hidden></aside><aside class="c236-objectives" aria-label="목표와 이번 차례 할 일"></aside><div class="c236-undo"></div>`);
 root.querySelector('.c236-objectives').append(root.querySelector('.nb-todo-panel'));
 root.querySelector('.ih-date').insertAdjacentHTML('beforeend','<span class="c236-phase"></span>');
 root.addEventListener('click',e=>{
  const taskToggle=e.target.closest('[data-c243-tasks]');if(taskToggle){const open=root.classList.toggle('c243-tasks-open');taskToggle.setAttribute('aria-expanded',String(open));taskToggle.textContent=open?'접기':`+${Math.max(0,(root._commandData?.todoLines?.length??0)-2)}`;}
  const tab=e.target.closest('[data-command-tab]'),collapse=e.target.closest('[data-command-collapse]'),row=e.target.closest('[data-command-id]');
  if(tab){root.dataset.commandTab=tab.dataset.commandTab;renderCommandScreen(root,root._commandData??{});}
  if(collapse){const panel=root.querySelector('.c236-command-list'),closed=panel.classList.toggle('collapsed');collapse.textContent=closed?'펼치기':'접기';collapse.setAttribute('aria-expanded',String(!closed));document.dispatchEvent(new CustomEvent('ink:uncover'));}
  if(row)document.dispatchEvent(new CustomEvent('ink:command-select',{detail:{kind:row.dataset.commandKind,id:row.dataset.commandId}}));
 });
 root.querySelector('.c236-command-list').addEventListener('keydown',e=>{
  if(!['ArrowUp','ArrowDown'].includes(e.key))return;
  const rows=[...root.querySelectorAll('[data-command-id]')];if(!rows.length)return;e.preventDefault();
  const i=rows.indexOf(e.target.closest('[data-command-id]')),next=rows[(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length];next.focus();next.click();
 });
}
function renderCommandScreen(root,d){
 root._commandData=d;
 root.querySelector('.c236-phase').textContent=String(d.summary??'').split(' · ')[0];
 const rows=d.commandRows??{units:[],cities:[]},kind=root.dataset.commandTab??'unit',host=root.querySelector('.c236-rows');
 root.querySelector('.c236-list-count').textContent=`부대 ${rows.units.length} · 남은 ${d.remaining??0}`;
 for(const b of root.querySelectorAll('[data-command-tab]'))b.setAttribute('aria-pressed',String(b.dataset.commandTab===kind));
 const html=commandRowsHtml(kind==='unit'?rows.units:rows.cities,kind,kind==='unit'?d.unitStatus?.id:d.selectedCity,document.documentElement.dataset.ui==='l0');
 if(host._html!==html){const id=document.activeElement?.dataset.commandId,scroll=host.scrollTop;host.innerHTML=html;host._html=html;host.scrollTop=scroll;if(id)[...host.querySelectorAll('[data-command-id]')].find(b=>b.dataset.commandId===id)?.focus({preventScroll:true});}
 const objectives=root.querySelector('.c236-objectives'),bands=document.querySelector('#c205-bands');if(bands&&bands.parentElement!==objectives)objectives.prepend(bands);
 for(const b of root.querySelectorAll('.c236-map-switches [data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===d.mode));
 const layer=root.querySelector('.c236-layer-key');layer.hidden=!d.mode||d.mode==='world';
 const legends={supply:`보급 · 보급권 ${d.supplyRange??'—'}칸 · 선은 연결`,faction:'세력 · 영역색은 소속 세력',compare:'세력 비교 · 발견한 성과 보이는 병력',diplomacy:'외교 · 색과 선은 관계',trace:'탐험 · 점선 원과 돋보기는 조사 목표'};
 layer.innerHTML=layer.hidden?'':`<span>${esc(legends[d.mode]??'지형')}</span><button data-mode="world">기본 보기</button>`;
}

// C274: versioned presentation preference; game save keys are untouched.
export function setUiMode(mode){
 if(!['default','l0','kit'].includes(mode))return;
 document.documentElement.dataset.ui=mode;
 const url=new URL(location.href);url.searchParams.delete('ui');history.replaceState(null,'',url);
 try{localStorage.setItem('sg.ui.v2',mode);}catch{}
}

export function factionComparisonHtml(v){
 const cities=Object.values({...v.knowledge?.cities,...v.ownCities});
 const rows=[{factionId:v.factionId,name:'우리 세력'},...(v.diplomacy?.factions??[]).filter(f=>f.contact)];
 const strength=f=>f===v.factionId?Object.values(v.ownArmies??{}).reduce((n,a)=>n+a.troopCount,0)+Object.values(v.ownCities??{}).reduce((n,c)=>n+(c.reserveTroops??0),0):Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.factionId===f&&v.knowledge.tiles[a.tileId]==='VISIBLE').reduce((n,a)=>n+(a.troopCount??0),0);
 const max=Math.max(1,...rows.map(f=>strength(f.factionId)));
 return `<div class="c279-comparison"><p>발견한 성 · 현재 보이는 병력 (미정찰 총병력 ?)</p>${rows.map(f=>`<p><b>${esc(f.name)}</b> · 성 ${cities.filter(c=>c.ownerFactionId===f.factionId).length}${f.factionId===v.factionId?'':' (발견)'}<meter min="0" max="${max}" value="${strength(f.factionId)}" aria-label="${esc(f.name)} 보이는 병력"></meter><span>${troopText(strength(f.factionId))}${f.factionId===v.factionId?'':' / 총병력 ?'}</span></p>`).join('')}</div>`;
}
export function diplomacyWarLine(d,id){
 const names=new Map((d?.factions??[]).map(f=>[f.factionId,f.name]));
 const wars=(d?.publicRelations??[]).filter(r=>r.state==='WAR'&&(r.from===id||r.to===id)).map(r=>names.get(r.from===id?r.to:r.from)??'우리 세력');
 const namesText=wars.join(' · '),last=namesText.charCodeAt(namesText.length-1),particle=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28?'과':'와';
 return wars.length?`지금 ${namesText}${particle} 싸우는 중`:'공개된 교전 상대 없음';
}

// UI memory only: never attached to campaign state or serialized saves.
export function createRunEndMemory(){
 let seed=null,lastTurn=0,frames=[],losses=[],previous=new Map();
 return {observe(s){
  if(seed!==s.campaignSeed||s.turn<lastTurn){seed=s.campaignSeed;frames=[];losses=[];previous=new Map();}
  lastTurn=s.turn;
  const turn=s.gameResult?Math.max(1,s.turn-1):s.turn;
  const owners=Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,c.ownerFactionId]));
  const events=[];
  const old=frames.at(-1);
  if(old)for(const [id,owner] of Object.entries(owners))if(old.owners[id]!==owner)events.push({kind:'city',cityId:id,text:`${s.cityDisplayNames?.[id]??s.cities[id].name} 함락`});
  for(const o of Object.values(s.officers)){
   const before=previous.get(o.officerId),own=o.allegianceFactionId===s.playerFactionId;
   const kind=o.lifeState==='DEAD'?'전사':o.captivityState==='PRISONER'?'포로':!own?'떠남':null;
   if(before?.own&&kind&&before.kind!==kind){
    const army=Object.values(s.armies??{}).find(a=>a.commanderId===o.officerId),tile=army?.tileId??before.tile;
    const city=Object.values(s.cities).find(c=>c.tileId===tile);
    const row={officerId:o.officerId,name:o.name,turn,kind,place:city?(s.cityDisplayNames?.[city.cityId]??city.name):tile??'장소 기록 없음'};
    losses.push(row);events.push({kind:'loss',text:`${o.name} ${kind}`,cityId:city?.cityId});
   }
   previous.set(o.officerId,{own,kind,tile:Object.values(s.armies??{}).find(a=>a.commanderId===o.officerId)?.tileId});
  }
  const frame={turn,owners,events};
  if(old?.turn===turn){frame.events=[...old.events,...events];frames[frames.length-1]=frame;}else frames.push(frame);
 },get frames(){return frames;},get losses(){return losses;}};
}
export function runEndReplayHtml(frames,cities,colors,sessionOnly=true){
 const coords=cities.map((c,i)=>({...c,x:Number(c.q??c.x??i),y:Number(c.r??c.y??0)}));
 const xs=coords.map(c=>c.x),ys=coords.map(c=>c.y),minX=Math.min(...xs),minY=Math.min(...ys),dx=Math.max(1,Math.max(...xs)-minX),dy=Math.max(1,Math.max(...ys)-minY);
 const last=frames.at(-1);
 return `<section class="c286-replay" aria-label="판도 재생"><svg viewBox="0 0 600 180" role="img" aria-label="차례별 성 주인"><rect width="600" height="180" fill="#182022"/>${coords.map(c=>`<circle data-replay-city="${esc(c.cityId)}" cx="${20+(c.x-minX)/dx*560}" cy="${16+(c.y-minY)/dy*148}" r="5" fill="${esc(colors[last?.owners[c.cityId]]??'#777')}"><title>${esc(c.name)}</title></circle>`).join('')}</svg><div><button data-replay-toggle>재생</button><input data-replay-seek type="range" min="0" max="${Math.max(0,frames.length-1)}" value="${Math.max(0,frames.length-1)}" aria-label="재생 차례"><output>${last?.turn??1}차례</output></div><p>${sessionOnly?'이번 세션에서만 재생':'함락 기록으로 재생'} · ${frames[0]?.turn??1}차례부터</p><div class="c286-marks">${frames.flatMap((f,i)=>f.events.map(e=>`<button style="left:${i/Math.max(1,frames.length-1)*100}%" data-replay-frame="${i}" title="${esc(`${f.turn}차례 · ${e.text}`)}" aria-label="${esc(`${f.turn}차례 · ${e.text}`)}">·</button>`)).join('')}</div></section>`;
}
export function runEndLossHtml(rows,face){
 return `<section class="c286-loss"><h3>명부</h3><div>${rows.length?rows.map(r=>`<article>${face(r.officerId)?`<img src="${esc(face(r.officerId))}" alt="">`:''}<p><b>${esc(r.name)}</b><small>${r.turn}차례 · ${esc(r.place)} · ${esc(r.kind)}</small></p></article>`).join(''):'<p>잃은 사람 없음</p>'}</div></section>`;
}

// Read committed engine records only after the run has ended. Capture.from is the new owner.
export function runEndRecords(s,memory){
 const end=s.gameResult?Math.max(1,s.turn-1):s.turn;
 const captures=(s.c43?.history??[]).filter(e=>e.type==='CAPTURE'&&s.cities[e.cityId]);
 let frames=memory.frames;
 if(captures.length){
  const owners=Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,c.ownerFactionId]));
  const reverse=[...captures].sort((a,b)=>b.turn-a.turn);
  frames=[];
  for(let turn=end;turn>=1;turn--){
   frames.unshift({turn,owners:{...owners},events:captures.filter(e=>e.turn===turn).map(e=>({kind:'city',cityId:e.cityId,text:`${s.cityDisplayNames?.[e.cityId]??s.cities[e.cityId].name} 함락`}))});
   for(const e of reverse.filter(e=>e.turn===turn))owners[e.cityId]=e.to;
  }
 }
 const losses=[...memory.losses];
 for(const record of Object.values(s.terminal?.recordsById??{})){
  const kind={DEAD:'전사',CAPTURED:'포로'}[record.details?.confirmedFate];
  if(!kind||record.refs?.factionIds?.[0]!==s.playerFactionId)continue;
  const officerId=record.refs.officerIds[0],o=s.officers[officerId];if(!o)continue;
  const turn=Math.floor(record.globalTick/TICKS_PER_TURN)+1;
  if(losses.some(r=>r.officerId===officerId&&r.kind===kind&&r.turn===turn))continue;
  const army=s.armies[record.refs.armyIds?.[0]],city=Object.values(s.cities).find(c=>c.tileId===army?.tileId);
  losses.push({officerId,name:o.name,turn,kind,place:city?(s.cityDisplayNames?.[city.cityId]??city.name):army?.tileId??'장소 기록 없음'});
 }
 for(const row of losses){const frame=frames.find(f=>f.turn===row.turn);if(frame&&!frame.events.some(e=>e.text===`${row.name} ${row.kind}`))frame.events.push({kind:'loss',text:`${row.name} ${row.kind}`});}
 for(const oath of s.eventDeck?.oaths??[]){const frame=frames.find(f=>f.turn===oath.signedTurn);if(frame&&oath.factionId===s.playerFactionId)frame.events.push({kind:'oath',text:`결의 · ${oath.title}`});}
 return {frames,losses:losses.sort((a,b)=>a.turn-b.turn),sessionOnly:!captures.length};
}

// C298: rearrange existing result output only; no campaign or storage access.
export function mountBookendResult298(box){
 const modal=box.closest('#result');if(!modal)return;
 const doc=box.ownerDocument;
 modal.classList.add('c298-bookend');
 const score=box.querySelector('.c186-score'),rank=box.querySelector('.rs-rank'),chron=box.querySelector('.rs-chron');
 const total=score.querySelector('tbody tr:last-child td');
 if(total){const summary=doc.createElement('p');summary.className='c298-score-summary';summary.textContent='총점 '+total.textContent;box.append(summary);}
 const replay=chron.querySelector('.c286-replay'),loss=chron.querySelector('.c286-loss');
 const details=box.querySelector('.rs-off'),fullChron=details.querySelector('.c271-full-chron');
 chron.querySelector('.c286-tabs').remove();
 chron.querySelector('.rs-band').replaceWith(fullChron);
 let emptyReplay;
 if(!fullChron.children.length){
  const empty=doc.createElement('li');empty.className='c298-empty';empty.textContent='이번 판에 남은 큰 사건이 없습니다';fullChron.append(empty);
  emptyReplay=doc.createElement('button');emptyReplay.type='button';emptyReplay.className='c298-empty-replay';emptyReplay.textContent='판도 재생 보기';chron.append(emptyReplay);
 }
 chron.querySelector('h3').hidden=false;
 const nav=doc.createElement('nav');nav.className='c298-result-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','판의 기록');
 const body=doc.createElement('section');body.className='c298-result-body';
 const records=doc.createElement('section');records.append(score,details);
 const roster=doc.createElement('section');roster.append(loss);
 const panels=[records,rank,chron,replay,roster],keys=['records','rank','chron','replay','loss'];
 const labels=['기록','순위','연대기','판도 재생','명부'];
 panels.forEach((panel,i)=>{
  panel.id='c298-panel-'+keys[i];panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','c298-tab-'+keys[i]);panel.tabIndex=0;body.append(panel);
  const b=doc.createElement('button');b.id='c298-tab-'+keys[i];b.dataset.runTab=keys[i];b.textContent=labels[i];b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);nav.append(b);
 });
 const select=i=>{
  body.dataset.runTab=keys[i];
  modal.querySelector('[data-replay-toggle]')?.textContent==='멈춤'&&modal.querySelector('[data-replay-toggle]').click();
  panels.forEach((p,j)=>{p.hidden=i!==j;const b=nav.children[j];b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});
  // Loss was nested in the old chronicle. Its own visibility still needs resetting.
  loss.hidden=i!==4;
 };
 emptyReplay?.addEventListener('click',()=>{select(3);nav.children[3].focus();});
 nav.addEventListener('click',e=>{const b=e.target.closest('[role="tab"]');if(b)select(keys.indexOf(b.dataset.runTab));});
 nav.addEventListener('keydown',e=>{
  const current=[...nav.children].indexOf(doc.activeElement);if(current<0)return;
  const i=e.key==='Home'?0:e.key==='End'?4:e.key==='ArrowRight'?(current+1)%5:e.key==='ArrowLeft'?(current+4)%5:-1;
  if(i<0)return;e.preventDefault();select(i);nav.children[i].focus();
 });
 const me=rank.querySelector('.me b');if(me)me.append(' · 내 세력');
 const sleepers=modal.querySelector('.c271-companions');
 if(sleepers){sleepers.querySelector('h3').textContent='이 판의 영웅은 다시 잠듭니다';sleepers.classList.add('c298-sleep');}
 const legacy=box.querySelector('.c261-progress');
 if(legacy){
  // The legacy renderer uses this fallback when no completion count is available.
  const fallback=legacy.querySelector('span');if(fallback?.textContent==='다음 판에 남는 것')fallback.remove();
  const heading=doc.createElement('h3');heading.textContent='다음 판에 남는 것';legacy.append(heading);
 }
 box.append(nav,body);select(0);
}

// C374: GPT v4 result layout (docs/cloud/mockup/screens-v4/result). Presentation only; rearranges the DOM C298 built.
const C374_WORD={unify:'통일',win:'승리',lose:'패배',fall:'멸망'};
export function mountResultV4374(box){
 const modal=box.closest?.('#result'),main=modal?.querySelector('.rs-main');if(!main||!modal.classList.contains('c298-bookend'))return;
 const doc=box.ownerDocument;modal.classList.add('c374-v4');
 modal.querySelector('.c374-head')?.remove();
 const turn=(modal.querySelector('#result-eyebrow')?.textContent.match(/(\d+)차례\s*$/)??[])[1];
 const head=doc.createElement('header');head.className='c374-head';head.setAttribute('aria-hidden','true');
 head.innerHTML=`<b class="c374-word">${Object.hasOwn(C374_WORD,modal.dataset.outcome)?`<img src="/assets/ui-kit/own/screens-v4/result/word-${modal.dataset.outcome}.webp" alt="${C374_WORD[modal.dataset.outcome]}" width="420" height="240">`:''}</b>${turn?`<i class="c374-rule"></i><span class="c374-turn">${esc(turn)}차례</span>`:''}`;
 main.prepend(head);
 const summary=box.querySelector('.c298-score-summary');
 if(summary&&!summary.querySelector('small')){const value=summary.textContent.replace(/^총점\s*/,'');summary.textContent='';const label=doc.createElement('small');label.textContent='총점';summary.append(label,' '+value);}
 const records=box.querySelector('#c298-panel-records');
 if(records&&!records.querySelector('.c374-vignette')){const art=doc.createElement('figure');art.className='c374-vignette';art.setAttribute('aria-hidden','true');records.append(art);}
 const sleep=modal.querySelector('.c298-sleep'),legacy=box.querySelector('.c261-progress');
  // C382: the victory bookend ends with the record and actions. Keep the
  // petrification strip only for defeat; carry progression text into records.
  const victory=['win','unify'].includes(modal.dataset.outcome);
  modal.classList.toggle('c382-victory',victory);
  if(victory){
   if(legacy&&records){legacy.classList.add('c382-legacy');records.append(legacy);}
   sleep?.remove();
  }else if(sleep&&legacy)sleep.append(legacy);
}

// C311 consumes the public growth projection, never the private growth ledger.
export function traitLoadoutButtonHtml(o){
 if(!o?.growth)return '';
 const reason=o.growth.traitLoadoutReason;
 return `<button type="button" class="btn sm k-btn c311-trait-open" data-trait-loadout="${esc(o.officerId)}" ${reason?'disabled':''} title="${esc(reason??'보유 일반특기에서 장착할 특기를 고릅니다')}">특기 바꾸기</button>`;
}
export function draftTraitUseText(card,growth){
 if(card.kind!=='trait'||!growth)return null;
 if(growth.equippedTraitIds.includes(card.traitId))return '장착한 특기 강화 · 바로 적용';
 if(growth.ownedTraits.some(c=>c.traitId===card.traitId))return '보유 특기 강화 · 장착하면 적용';
 return growth.equippedTraitIds.length<growth.traitSlots?'보유에 추가 · 빈 칸에 자동 장착':'보유에 추가 · 특기 바꾸기에서 장착';
}
export function traitLoadoutPanelHtml(o,selected=[]){
 const g=o.growth,limit=g.traitSlots,reason=g.traitLoadoutReason;
 return `<div class="c311-trait-sheet"><header><h2>${esc(o.name)} · 특기 바꾸기</h2><button class="btn k-btn" data-trait-close aria-label="닫기">닫기</button></header><p>고유 1 고정 · 장착 ${selected.length}/${limit} · 보유 ${g.ownedTraits.length}</p><p>보유 일반특기에서 최대 ${limit}개를 고르세요.</p><div class="c311-trait-list">${g.ownedTraits.map(c=>{const on=selected.includes(c.traitId);return `<button class="oc-slot" data-trait-toggle="${esc(c.traitId)}" aria-pressed="${on}" ${reason||!on&&selected.length>=limit?'disabled':''}><b>${esc(abilityName356(c))}</b><span>${c.rank}단계 · ${on?'장착':'보유'}</span><small>${esc(abilityGloss356(c))} · ${esc(c.text??'')}</small></button>`;}).join('')||'<p>보유 일반특기가 없습니다.</p>'}</div>${reason?`<p role="status">${esc(reason)}</p>`:''}<button class="btn primary k-btn" data-trait-apply ${reason?'disabled':''}>장착 적용</button></div>`;
}

// C418: map-only projections. Never reveal hidden army state or change pilot rules.
// 칸을 대상으로 받는 전법: 정한 두 규칙 + 엔진 대상 목록이 모두 칸 id('q,r')인 전법(C516 닷토리 '장료 R 위진소요 — 태사자를 고르면 INVALID ·
// 빈 도착 칸을 누르면 아무 일 없음': 직선 돌진 R 은 대상이 도착 칸인데 두 규칙만 칸 대상으로 알아봐서 웹에선 쓸 길이 없었음 — 고도 호스트는 칸 대상을 그대로 받음)
const TILE_ID418=/^-?\d+,-?\d+$/;
export const tileTactic418=card=>!!card&&(card.pilot&&['P417_G01_E','P417_G03_R'].includes(card.rule)||(card.targets?.length>0&&card.targets.every(t=>typeof t==='string'&&TILE_ID418.test(t))));
export function mechanicMap418(s,v,armyId,card,target){
 if(s.trialRules?.mechanics!=='v2')return null;
 const seen={...Object.fromEntries(Object.entries(v.knowledge.observedArmies??{}).filter(([,a])=>v.knowledge.tiles[a.tileId]==='VISIBLE')),...v.ownArmies};
 const live=id=>seen[id]&&seen[id].troopCount!==0;
 const dist=(a,b)=>{const [q,r]=a.split(',').map(Number),[x,y]=b.split(',').map(Number);return (Math.abs(q-x)+Math.abs(r-y)+Math.abs(q+r-x-y))/2;};
 const out={candidates:tileTactic418(card)?card.targets.filter(at=>v.knowledge.tiles[at]==='VISIBLE'):[],path:[],passed:[],marks:[],zones:[],links:[]};
 const area=at=>Object.keys(v.knowledge.tiles).filter(id=>v.knowledge.tiles[id]==='VISIBLE'&&dist(id,at)<=2);
 if(card?.rule==='P417_G01_E'&&out.candidates.includes(target)){
  const from=seen[armyId]?.tileId;if(from){const n=dist(from,target),[q,r]=from.split(',').map(Number),[x,y]=target.split(',').map(Number);
   out.path=[from,...Array.from({length:n},(_,i)=>`${q+(x-q)/n*(i+1)},${r+(y-r)/n*(i+1)}`)];
   out.passed=Object.values(seen).filter(a=>a.factionId!==v.factionId&&out.path.slice(1).includes(a.tileId)).slice(0,2).map(a=>a.tileId);
  }
 }
 if(card?.rule==='P417_G03_R'&&out.candidates.includes(target))out.zones.push({tiles:area(target),preview:true});
 // Private pilot details are projected only for our own units. Opponents' observed snapshots do not expose these contracts.
 for(const id of Object.keys(v.ownArmies)){
  if(!live(id))continue;const a=s.armies[id],x=a?.mechV2;if(!a)continue;
  const mark=(tile,text)=>out.marks.push({tile,text});
  if(x?.contract&&a.c50?.warning&&live(x.contract.targetId))mark(seen[x.contract.targetId].tileId,'간파');
  if(x?.frenzy)mark(a.tileId,'광란');
  if(x?.zone)out.zones.push({tiles:area(x.zone.tileId)});
  const link=(other,kind)=>{if(live(other))out.links.push({from:a.tileId,to:seen[other].tileId,kind});};
  if(x?.bond?.ids.every(live)&&x.bond.ids.every(i=>x.bond.ids.every(j=>dist(seen[i].tileId,seen[j].tileId)<=2)))for(const other of x.bond.ids.filter(i=>i!==id))link(other,'분담');
  if(a.commanderId==='G25'){
   const rel=a.c50?.relation;if(rel?.type==='LINK'&&a.formation!=='BROKEN'&&a.morale!=='ROUTING'&&dist(a.tileId,seen[rel.targetId]?.tileId??a.tileId)===1)link(rel.targetId,'호위');
   if(x?.intercept)for(const b of Object.values(v.ownArmies).filter(b=>b.armyId!==id&&dist(a.tileId,b.tileId)<=2))link(b.armyId,'대신 받기');
  }
 }
 return out;
}

// Presentation-only W selection. All candidates come from the public action projection.
export function engineSelection462(action,resource,neighbors={}){
 return {action,resource,neighbors,center:null,order:[],cursor:-1};
}
export function engineCandidates462(pick){return pick.center?(pick.neighbors[pick.center]??[]):pick.action.targets;}
export function pickEngineTarget462(pick,id){
 if(!engineCandidates462(pick).includes(id))return false;
 if(pick.action.action.startsWith('WARN')&&pick.resource===2){
  if(!pick.center){pick.center=id;pick.order=[];return true;}
  const i=pick.order.indexOf(id);if(i>=0)pick.order.splice(i,1);else if(pick.order.length<2)pick.order.push(id);
 }else if(['FLURRY','INTIMIDATE'].includes(pick.action.action)){
  const i=pick.order.indexOf(id);if(i>=0)pick.order.splice(i,1);else if(pick.action.action==='FLURRY'||pick.order.length<pick.resource)pick.order.push(id);
 }else pick.order=[id];
 return true;
}
export function backEngineSelection462(pick){
 if(pick.order.length){pick.order.pop();return true;}
 if(pick.center){pick.center=null;return true;}return false;
}
export function engineRequest462(pick,armyId){
 const o=pick.action,ids=pick.order;
 if(pick.center&&ids.length!==2||!pick.center&&!ids.length)return null;
 if(o.action==='ATTACK_STRUCTURE')return {type:'ATTACK_STRUCTURE',armyId,targetId:ids[0]};
 return {type:'ENGINE_ACTION',armyId,action:o.action,targetId:pick.center??ids[0],
  ...(pick.center?{tileIds:[...ids]}:['FLURRY','INTIMIDATE'].includes(o.action)?{targetIds:[...ids]}:{})};
}

// Presentation bands only; engine probabilities stay unchanged.
export function chanceText462(chance){return chance<1/3?'낮은 확률':chance<2/3?'일정 확률':'높은 확률';}
