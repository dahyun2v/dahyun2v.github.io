import {troopText,troopDelta,TROOP_DISPLAY_SCALE} from '../../src/troop-display.mjs';
import {C20_FACILITIES,C20_POLICIES} from '../../src/campaign-policy.mjs';
import {SPECIAL_TROOPS} from '../../src/campaign-special-troops.mjs';
import diplomacyAxes from '../../../docs/design-data/diplomacy-axes-v0.1.json' with {type:'json'};
// 흑묵 지도 HUD — 기준 그림 final-map-v2 를 그대로 새로 짠 화면(2026-10-10, Claude · 사용자 "고치지 말고 새로 · 카드·단추는 에셋으로").
// 판·단추·깃발·아이콘은 모두 GPT 가 기준 그림에서 한 장씩 뽑아 그린 그림(/assets/ui-v3/hud/). 코드는 자리·글자·숫자·막대 길이만.
// 게임 처리는 옛 HUD(숨김)의 단추를 그대로 누른다 — 명령 코드는 한 곳(world.js)에만 있다.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// C210: presentation preferences never enter campaign state or its save key.
export const FX_KEY='sangoku.fx.v1';
export const FX_OPTIONS={aiSpeed:[['normal','보통'],['fast','빠름'],['instant','즉시']],cutin:[['always','매번'],['first','그 전법 처음 한 번'],['off','끄기']],shake:[['on','켬'],['off','끔']],motion:[['system','운영체제 설정'],['on','움직임 줄이기 켬'],['off','움직임 줄이기 끔']]};
export const FX_DEFAULTS=Object.freeze({aiSpeed:'normal',cutin:'always',shake:'on',motion:'system'});
export function createFxPreferences({storage=()=>globalThis.localStorage,system=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches}={}){
 const normalize=raw=>Object.fromEntries(Object.entries(FX_DEFAULTS).map(([key,value])=>[key,FX_OPTIONS[key].some(([id])=>id===raw?.[key])?raw[key]:value]));
 let prefs={...FX_DEFAULTS};try{prefs=normalize(JSON.parse(storage()?.getItem(FX_KEY)??'null'));}catch{}
 return {get value(){return {...prefs};},reduced(){return prefs.motion==='system'?system():prefs.motion==='on';},shake(){return prefs.shake==='on'&&!this.reduced();},duration(ms,ai=false){return ai?Math.round(ms*({normal:1,fast:.3,instant:0}[prefs.aiSpeed])):ms;},
  update(patch){prefs=normalize({...prefs,...patch});try{storage()?.setItem(FX_KEY,JSON.stringify(prefs));return true;}catch{return false;}}};
}
export const fxPreferences=createFxPreferences();
export function fxSettingsHtml(prefs=fxPreferences.value){return `<fieldset class="c210-fx"><legend>연출 설정</legend>${Object.entries(FX_OPTIONS).map(([key,options])=>`<label>${{aiSpeed:'AI 차례 속도',cutin:'전법 컷인',shake:'화면 흔들림',motion:'움직임 줄이기'}[key]}<select data-c210-fx="${key}" aria-label="${{aiSpeed:'AI 차례 속도',cutin:'전법 컷인',shake:'화면 흔들림',motion:'움직임 줄이기'}[key]}">${options.map(([id,name])=>`<option value="${id}"${prefs[key]===id?' selected':''}>${name}</option>`).join('')}</select></label>`).join('')}<small data-c210-fx-status role="status">이 기기의 연출에만 적용됩니다</small></fieldset>`;}
export function shouldShowTacticCutin(mode,seen,key){if(mode==='off'||mode==='first'&&seen.has(key))return false;seen.add(key);return true;}
export function factionOpeningLine(factionId){return [Object.values(C20_FACILITIES).find(f=>f.factionId===factionId)?.name,C20_POLICIES[factionId]?.name,Object.values(SPECIAL_TROOPS).filter(t=>t.factionId===factionId).map(t=>t.name).join('/')].filter(Boolean).join(' · ');}
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
 const ambition=selected?`<details data-c205-detail="${esc(selected.id)}" class="c205-${esc(selected.status.toLowerCase())}"><summary>뜻 · ${esc(selected.title)} — ${esc((selected.conditions??[]).map(c=>`${c.met?'✓':'✗'} ${c.text}`).join(' · '))} <i>${status(selected.status)}</i></summary><ul>${(selected.conditions??[]).map(c=>`<li>${c.met?'✓':'✗'} ${esc(c.text)}</li>`).join('')}</ul></details>`:a?.canChoose&&a.offered?.length?`<button type="button" data-c205-reopen>이번 생의 뜻 고르기 · ${a.chooseUntilTurn}차례까지</button>`:'';
 return ambition+(v.orders?.history??[]).map(o=>`<details data-c205-detail="${esc(o.id)}.${o.signedTurn}" class="c205-${esc(o.status.toLowerCase())}"><summary>군령 · ${esc(o.title)} ${o.progress.count}/${o.progress.target} · ${o.turnsLeft}차례 <i>${status(o.status)}</i></summary><p>${esc(o.goalText)}</p><p>${esc(o.rewardLine??'')}${o.progress.violated?' · 유지 조건을 지키지 못했습니다.':''}</p></details>`).join('');
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
export function cityQuickHtml(c){
 const seal=C190_SEALS[c.factionId],art=seal&&C190_ART[seal.art],num=n=>Number.isFinite(n)?Math.round(n):'?';
 const bar=(label,value,max,text)=>`<div class="cq-meter"><span>${label} <b>${esc(text)}</b></span><i><s style="width:${Number.isFinite(value)&&max>0?Math.max(0,Math.min(100,value/max*100)):0}%"></s></i></div>`;
 return `<header><h2>${esc(c.name)}</h2>${c.own?`<button data-stratagem-quick ${c.stratagemReason?'disabled':''} title="${esc(c.stratagemReason??'성에 있는 장수의 주 행동')}">계략</button><button class="c216-reserve-quick" data-reserve-transfer="${esc(c.id)}">예비병 보내기</button>`:''}<span class="cq-seal" aria-label="세력 ${esc(seal?.glyph??'中')}">${art?`<img src="${esc(art)}" alt="${seal.glyph}">`:esc(seal?.glyph??'中')}</span></header>`
  +(c.stratagemText?`<p class="c226-effect">${esc(c.stratagemText)}</p>`:'')
  +bar('성벽',c.defense,c.defenseMax,`${num(c.defense)}/${num(c.defenseMax)}`)
  +bar(c.own?'수비':'보이는 수비',c.troops,c.own?c.guardMaximum:null,Number.isFinite(c.troops)?`${troopText(c.troops)}${c.own&&Number.isFinite(c.guardMaximum)?`/${troopText(c.guardMaximum)}`:''}`:'?')
  +(c.own?`<p class="cq-production${c.badge?.idle?' idle':''}">${c.badge?.idle?'●':'⚒'} ${esc(cityProductionText(c.badge))}</p><nav aria-label="성 빠른 명령"><button data-city-quick-action="sortie">출진</button><button data-city-quick-action="production">생산</button><button data-city-quick-action="office">내정</button><button data-city-quick-action="enter">들어가기</button></nav>`:`<p class="cq-siege">${citySiegeText(c)}</p><p class="cq-hint">공격하려면 부대를 고르세요${c.remembered?' · 기억한 정보':''}</p>`);
}
// Prefer either side without covering the visible castle; clamp inside the viewport.
export function cityQuickPlacement(r,width,height,avoid=[]){
 const w=280,h=220,gap=18,pad=12,top=Math.max(64,Math.min(height-h-pad,(r.top+r.bottom-h)/2));
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
    if(preview&&risk?.check&&!groups.size)lines.push(`${side(event.targetId)} ${label} 판정`);
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
  }
  for(const hit of event.hits??[])if(known(before,hit.sourceId)&&known(before,hit.targetId))
    lines.push(`${name(before,hit.sourceId)} → ${name(before,hit.targetId)} · ${before.ownArmies?.[hit.targetId]?'아군':'상대'} 피해 ${troopText(hit.damage)}`);
  if(event.kind==='CITY'||city&&event.kind.includes('TACTIC'))lines.push(`성 내구 피해 ${labelNumber(event.dealt??event.enemyLoss??0)}`);
  const nextCity=knownCity(after,cityId);
  if(city&&nextCity&&city.ownerFactionId!==nextCity.ownerFactionId)lines.push(nextCity.ownerFactionId===after.factionId?'성 함락 · 아군 점령':'성 함락 · 소유 세력 변경');
  if(event.tacticName&&a)lines.push(`사용 전법 · ${event.tacticName}`);
  if(a&&b){if(event.charge)lines.push('기병 돌격');if(event.side==='FLANK')lines.push('측면 공격');if(event.side==='REAR')lines.push('후방 공격');if(event.counter)lines.push('반격 발생');}
  const selfTactic=event.kind.includes('TACTIC')&&event.attackerId===event.targetId;
  return {sequence:event.sequence,turn:event.turn,title:selfTactic?`${event.tacticName??kind} · ${affected.some(id=>id!==event.attackerId&&known(before,id))?'광역 대상':'자신'}`:`${source} → ${target}`,kind,lines};
}
export function combatHistoryHtml(records) {
  return records.slice(-6).reverse().map(r=>`<article><h4>${esc(r.turn)}턴 · ${esc(r.kind)}</h4><b>${esc(r.title)}</b>${r.lines.map(t=>`<p>${esc(t)}</p>`).join('')}</article>`).join('');
}

const H = '/assets/ui-v3/hud/';
const RAIL = [['world', '지형', 'mode-terrain'], ['supply', '보급', 'mode-supply'], ['faction', '세력', 'mode-faction'], ['diplomacy', '외교', 'mode-diplomacy'], ['trace', '탐험', 'mode-explore']];
const RES_ICON = {food: 'res-food', production: 'res-production', science: 'res-science', fame: 'res-fame', troops: 'res-troops', reserve: 'res-reserve'};
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
const icon = (name, glyph) => has(`hud/icons/${name}.png`) ? `<img class="ih-ico" src="${H}icons/${name}.png" alt="">` : `<em class="ih-glyph">${esc(glyph)}</em>`;

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
export function mapTextFontSize(matrix,minimum=11){
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
export function mountInkHud(root, opts = {}) {
  if (opts.has) has = opts.has;
  mountEventScales();
  root.innerHTML = `<div class="ih">
    <header class="ih-top"><img class="ih-topbar" src="${H}topbar.png" alt="">
      <button class="ih-faction" data-fwd="#faction" title="세력 — 정책·외교"><img class="ih-emblem" alt=""><b></b></button>
      <div class="ih-res"></div><section class="ih-food-sheet" hidden aria-label="식량 현황"><button data-food-close aria-label="식량 현황 닫기">×</button><div></div></section>
      <div class="ih-medal" title=""><img src="${H}medallion.png" alt=""><b class="ih-turn"></b></div>
      <div class="ih-date"><b></b><small></small></div>
      <nav class="ih-menu"><button data-fwd="#save" title="저장 칸은 하나입니다 — 이전 저장을 덮어씁니다">저장</button><button data-fwd="#load-again" title="불러오기">불러</button><button data-fwd="#rules-open" title="규칙">규칙</button><button data-fwd="#mute" title="소리">소리</button><a href="/" title="처음 화면">처음</a></nav>
    <p class="ih-victory"></p></header>
    <img class="ih-horizon" src="${H}map-horizon-band.png" alt="" onerror="this.remove()">
    <nav class="ih-rail">${RAIL.map(([m, label, ic]) => `<button class="ih-rb" data-mode="${m}" title="${label}"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon(ic, label[0])}<small>${label}</small></button>`).join('')}
      <button class="ih-rb" data-fwd="#roster-open" title="소속 장수"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-helmet', '장수')}<small>장수</small></button>
      <button class="ih-rb" data-open="council" title="평정 — 이번 달 안건"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-treaty', '평정')}<small>평정</small><i class="ih-badge" hidden></i></button></nav>
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
export function renderInkHud(root, d) {
  const q = (s) => root.querySelector(s), old = (s) => document.querySelector(s);
  const color = d.factionColor ?? '#a8352a', tone = d.tone ?? 'red';
  root.style.setProperty('--fc', color);
  q('.ih-faction .ih-emblem').src = `/assets/ui-v3/emblems/${d.factionId}.png`;
  q('.ih-faction b').textContent = d.factionName ?? '';
  q('.ih-faction b').dataset.name = d.factionName ?? '';
  // 자원: 옛 위 띠 칩(값·증감·설명)을 그대로
  q('.ih-res').innerHTML = [...document.querySelectorAll('#resources .chip')].map((c) => {
    const k = c.dataset.res, b = c.querySelector('b'), dl = c.querySelector('small.d');
    return `<${k==='food'?'button type="button" data-food-open aria-label="식량 현황" aria-expanded="'+String(!q('.ih-food-sheet').hidden)+'"':'span'} class="ih-chip" data-res="${esc(k)}" title="${esc([c.title,dl?.textContent].filter(Boolean).join(" · "))}"><span class="nb-resource-label">${esc(({food:'식량',production:'생산',science:'과학',fame:'인망',troops:'병력',reserve:'예비'})[k]??k)}</span><b>${b?.innerHTML ?? ''}</b>${dl ? `<small class="${dl.classList.contains('down') ? 'down' : 'up'}">${esc(dl.textContent)}</small>` : ''}</${k==='food'?'button':'span'}>`;
  }).join('');
  q('.ih-res').title = [...q('.ih-res').querySelectorAll('.ih-chip')].map(c=>`${c.textContent} · ${c.title}`).join(' / ');
  const f=d.food??{}, change=d.foodChange, fmt=n=>Number(n??0).toLocaleString('ko-KR',{maximumFractionDigits:1});
  const emptyIn=foodExhaustion(d.foodView??{});
  const ledger=foodLedgerTotals(d.foodView??{});
  if(emptyIn!==null)q('.ih-res').querySelector('[data-res="food"]')?.insertAdjacentHTML('beforeend',`<small class="down c215-food-empty">바닥까지 ${emptyIn}차례</small>`);
  q('.ih-food-sheet > div').innerHTML=`<h3>식량 현황</h3><p>현재 재고 <b>${fmt(f.stock)} / ${fmt(f.capacity)}</b></p><p>다음 정산 순증 <b>${ledger.net>=0?'+':''}${fmt(ledger.net)}</b> · 산출 +${fmt(f.output)}</p><p>직전 정산 들어옴 +${fmt(ledger.incoming)} / 나감 −${fmt(ledger.outgoing)}</p><p class="hint">순증은 현재 산출·유지비 예상이며, 들어옴/나감은 직전 실제 장부입니다.</p>${change?`<h4>${esc(change.turn)}턴 진입 · 실제 재고 변화</h4><p><b>${fmt(change.from)} → ${fmt(change.to)} (${change.change>0?'+':''}${fmt(change.change)})</b></p><small>차례가 바뀌는 처리 전후의 보유 도시 재고 합입니다.</small>`:'<small>차례를 넘기면 실제 재고 변화를 함께 보여줍니다.</small>'}`;
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
  q('.ih-lines').innerHTML = (current.length ? current.slice(0,4) : [d.summary ?? '조용한 차례입니다.']).map((t) => `<li><img class="ih-li" src="${H}icons/${lineIcon(t)}.png" alt=""><span>${esc(t)}</span></li>`).join('');
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
    cmd.querySelector('.tac').innerHTML = tacOld.map((b, i) => { const name = (b.childNodes.length ? [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : b.textContent).trim() || b.textContent.trim(); return `<button class="ring tactic-face r${i + 1}${b.dataset.cooldown>0?' cooling':''}" data-cooldown="${b.dataset.cooldown??0}" data-act="tactic" data-tactic="${esc(b.dataset.tactic)}"${b.disabled ? ' disabled' : ''} title="${esc(b.title || b.textContent.trim())}">${icon('cmd-tactic', name[0] ?? '·')}${tacticFaceMarkup(Number(b.dataset.cooldown??0),b.dataset.gauge===undefined?null:Number(b.dataset.gauge))}<small>${esc(name.slice(0, 4))}</small></button>`; }).join('');
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
    info.innerHTML = status ? `<p class="ih-state"><b>${esc(status.action)}</b>${status.actions?`<span class="ih-actions-left"><span class="${status.actions.move.available?'':'spent'}">${esc(status.actions.move.label)}</span><span class="${status.actions.main.available?'':'spent'}">${esc(status.actions.main.label)}</span></span>`:''}<span>전열 ${esc(status.formation)}</span></p>${supply ? `<p>${esc(supply)}</p>` : ''}${supplyContext ? `<p>${esc(supplyContext)}</p>` : ''}${warnings.map(t => `<p class="ih-risk">${esc(t)}</p>`).join('')}${tactics.length ? `<details${tacticsOpen ? ' open' : ''}><summary>전법 상태 · ${tactics.length}개</summary>${tactics.map(t => `<p>${esc(t)}</p>`).join('')}</details>` : ''}` : '';
    if(status)info.insertAdjacentHTML('beforeend',`<p class="ih-intent-full">${esc(d.commandIntent??'')}</p><p class="ih-action-help" aria-live="polite"></p>`);
    const btns = [...menu.querySelectorAll('.dk-acts button')].filter((b) => !b.classList.contains('close'));
    const acts = btns.map((b) => ({menu: b.dataset.menu ?? (b.dataset.tactic ? 'tactic' : ''), tactic: b.dataset.tactic ?? '', disabled: b.disabled, title: b.title || b.textContent.trim(), label: (b.childNodes[1]?.textContent ?? b.textContent).trim()}))
      .filter((a) => a.menu && a.menu !== 'officer' && a.menu !== 'close' && !(showCmd && (a.menu === 'attack' || a.menu === 'tactic')))
      .sort((a, b) => (ACT_ORDER.indexOf(a.menu) + 99 * (a.disabled ? 1 : 0)) - (ACT_ORDER.indexOf(b.menu) + 99 * (b.disabled ? 1 : 0))).slice(0, 6);
    q('.ih-acts').innerHTML = acts.map((a) => `<button class="ih-act" data-act="${esc(a.menu)}"${a.tactic ? ` data-tactic="${esc(a.tactic)}"` : ''}${a.disabled ? ' disabled' : ''} title="${esc(a.title)}">${icon(ACT_ICON[a.menu] ?? 'cmd-tactic', a.label[0] ?? '·')}<small>${esc(a.label.replace(/\s.*$/, ''))}</small></button>`).join('');
  }
  const end = old('#end-turn');
  q('.ih-end').disabled = !!end?.disabled;
  q('.ih-end').classList.toggle('blocked', !!end?.classList.contains('blocked'));
  q('.ih-end').classList.toggle('ready', !!end?.classList.contains('ready'));
  const goal=old('#victory-guide');q('.ih-victory').textContent=goal?.textContent??'';q('.ih-victory').title=goal?.title??'';
  q('.ih-end small').textContent = old('#remaining')?.textContent ?? '';
  renderCommandBand(root,d,showUnit,menu);
}

// C147: the band forwards every order to the existing unit menu.
function mountCommandBand(root){
 document.body.classList.add('hud-band');
 root.querySelector('.ih').insertAdjacentHTML('beforeend',`<nav class="nb-bookmarks" aria-label="갈피"><button data-band-map aria-expanded="false">지도 보기 ▸ <span>지형</span></button><div class="nb-map-options" hidden>${RAIL.map(([m,label])=>`<button data-mode="${m}">${label}</button>`).join('')}</div><button data-fwd="#roster-open">장수</button><button data-open="council">평정 <b class="nb-badge"></b></button></nav><button class="nb-news-tab" data-band-news aria-expanded="false">소식 0</button><p class="nb-news-peek" hidden></p><section class="nb-sheet" hidden aria-label="부대 상세 설명"><button data-band-info aria-label="설명 닫기">닫기</button><div></div></section><section class="nb-band" data-state="rest" aria-label="군령 띠"><div class="nb-content"></div></section>`);
 root.querySelector('.nb-bookmarks').insertAdjacentHTML('afterbegin',`<div class="nb-map-tabs">${RAIL.map(([m,label])=>`<button data-mode="${m}">${label}</button>`).join('')}</div>`);
 root.querySelector('.ih-menu').insertAdjacentHTML('afterbegin','<button data-band-goal aria-expanded="false">승리 조건</button>');
 root.querySelector('.ih-menu [data-fwd="#load-again"]').textContent='불러오기';
 const topLeft=document.createElement('div');topLeft.className='nb-top-left';
 root.querySelector('.ih-top').prepend(topLeft);
 for(const s of ['.ih-faction','.ih-date','.ih-res'])topLeft.append(root.querySelector(s));
 root.querySelector('.ih-menu').insertAdjacentHTML('beforeend','<button data-band-settings aria-label="설정" aria-expanded="false">⚙</button><section class="nb-settings" hidden aria-label="설정 메뉴"></section>');
 for(const s of ['#load-again','#mute'])root.querySelector('.nb-settings').append(root.querySelector(`.ih-menu [data-fwd="${s}"]`));
 root.querySelector('.nb-settings').insertAdjacentHTML('beforeend',fxSettingsHtml());
 root.addEventListener('change',e=>{const select=e.target.closest('[data-c210-fx]');if(!select)return;const saved=fxPreferences.update({[select.dataset.c210Fx]:select.value});root.querySelector('[data-c210-fx-status]').textContent=saved?'연출 설정을 저장했습니다':'이 기기에 저장할 수 없어 이번 화면에만 적용됩니다';document.dispatchEvent(new CustomEvent('ink:fx-settings'));});
 root.querySelector('.ih').insertAdjacentHTML('beforeend','<aside class="nb-selected" hidden aria-label="선택 부대"></aside><aside class="nb-advisor-box" aria-label="군사 조언"></aside><p class="nb-forecast-status"></p>');
 root.querySelector('.ih').insertAdjacentHTML('beforeend','<header class="nb-state-title" hidden><h1></h1><p></p></header><aside class="nb-supply" hidden aria-label="선택 부대 보급"></aside><section class="nb-todo-panel" aria-label="이번 차례 할 일"></section>');
 root.querySelector('.nb-todo-panel').append(root.querySelector('.nb-news-tab'));
 root.querySelector('.nb-todo-panel').insertAdjacentHTML('beforeend','<ol class="nb-tasks" hidden></ol>');
 root.querySelector('.nb-band').append(root.querySelector('.ih-end'));
 root.querySelector('.nb-band').insertAdjacentHTML('beforeend','<p class="nb-end-warning"></p>');
 const toggle=(selector,button)=>{const panel=root.querySelector(selector);panel.hidden=!panel.hidden;button?.setAttribute('aria-expanded',String(!panel.hidden));document.dispatchEvent(new CustomEvent('ink:uncover'));};
 root.addEventListener('click',e=>{
  if(e.target.closest('[data-band-info]'))toggle('.nb-sheet',e.target.closest('[data-band-info]'));
  if(e.target.closest('[data-band-more]'))toggle('.nb-more',e.target.closest('[data-band-more]'));
  if(e.target.closest('[data-band-map]'))toggle('.nb-map-options',e.target.closest('[data-band-map]'));
  if(e.target.closest('[data-band-next]'))document.dispatchEvent(new CustomEvent('ink:next-unit'));
  if(e.target.closest('[data-band-news]')){const open=root.classList.toggle('nb-news-open');root.querySelector('.nb-news-tab').setAttribute('aria-expanded',String(open));document.dispatchEvent(new CustomEvent('ink:uncover'));}
  if(e.target.closest('[data-band-goal]'))toggle('.ih-victory',e.target.closest('[data-band-goal]'));
  if(e.target.closest('[data-band-settings]'))toggle('.nb-settings',e.target.closest('[data-band-settings]'));
  if(e.target.closest('.nb-map-options [data-mode]')){root.querySelector('.nb-map-options').hidden=true;root.querySelector('[data-band-map]').setAttribute('aria-expanded','false');}
 });
 const help=e=>{const b=e.target.closest?.('.nb-orders [data-act]');if(b){const line=root.querySelector('.nb-help');if(line)line.textContent=b.disabled?b.title:ACTION_MEANING[b.dataset.act]??b.title;}};
 root.addEventListener('pointerover',help);root.addEventListener('focusin',help);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=['.nb-sheet','.nb-more','.nb-map-options','.nb-settings'].map(s=>root.querySelector(s)).filter(n=>n&&!n.hidden);if(open.length||root.classList.contains('nb-news-open')){open.forEach(n=>n.hidden=true);root.classList.remove('nb-news-open');root.querySelectorAll('[aria-expanded="true"]').forEach(n=>n.setAttribute('aria-expanded','false'));e.preventDefault();e.stopImmediatePropagation();return;}if(root.querySelector('.nb-supply:not([hidden])')){document.querySelector('#mode-rail [data-mode="world"]')?.click();e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('ink:forecast',e=>{
  const band=root.querySelector('.nb-band'),content=root.querySelector('.nb-content');
  if(e.detail){band.append(root.querySelector('.ih-end'));setBandState(band,'forecast');content._renderedHtml=null;content.innerHTML=bandForecastHtml(e.detail.html,e.detail.colors);
   root.querySelector('.nb-state-title').hidden=false;root.querySelector('.nb-state-title h1').textContent='교전 예고';root.querySelector('.nb-state-title p').textContent='';root.querySelector('.nb-supply').hidden=true;
   root.querySelector('.nb-sheet').hidden=true;fitForecastStatus(root.querySelector('.nb-forecast-status'));}
  else if(band.dataset.state==='forecast'){band.append(root.querySelector('.ih-end'));content.innerHTML=band._unitHtml??'';fitBandOrders(content);setBandState(band,band._unitState??'rest');renderBandSupply(root,band._supplyData??{});}
 });
}
// Rearrange the existing public preview; combat values and shown enemy counts stay in world.js.
function fitForecastStatus(line){
 line.style.removeProperty('font-size');
 if(!line.clientWidth)return;
 const css=getComputedStyle(line),padding=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight),gap=parseFloat(css.columnGap)||0;
 const spans=[...line.children],needed=spans.reduce((sum,n)=>sum+n.getBoundingClientRect().width,0),available=line.clientWidth-padding-gap*Math.max(0,spans.length-1);
 if(needed>available&&available>0)line.style.setProperty('font-size',`${parseFloat(css.fontSize)*available/needed}px`,'important');
}
export function bandForecastHtml(html,colors={}){
 const source=document.createElement('div');source.innerHTML=html;
 const text=s=>source.querySelector(s)?.textContent.trim()??'',picture=s=>source.querySelector(s)?.getAttribute('src')??'';
 colors={ally:source.querySelector('.fc-vs')?.getAttribute('data-ally-color')??'var(--fc)',enemy:source.querySelector('.fc-vs')?.getAttribute('data-enemy-color')??'#817966',...colors};
 const city=!!source.querySelector('.fc-dur'),range=s=>text(s).match(/(\d[\d,]*)\s*→\s*(\d[\d,]*)/);
 const side=(cls,name,face,pair,loss,label='병력')=>`<section class="nb-preview-${cls}" style="--side-color:${esc(colors[cls]??'#817966')}"><span class="nb-preview-portrait ${cls}">${face?`<img src="${esc(face)}" alt="${esc(name)}">`:'<span class="nb-city-mark" aria-label="성">城</span>'}</span><div class="nb-preview-values"><b>${esc(name)}</b><p class="nb-preview-count"><small>${label}</small> ${esc(pair?.[1]??'—')} <span>→</span> ${esc(pair?.[2]??'—')}</p><p class="nb-preview-loss"><small>${city&&cls==='enemy'?'피해':'예상 손실'}</small><strong>${esc(loss)}</strong></p>${label==='병력'?`<div class="nb-soldiers" aria-label="보이는 병력의 예상 잔존 비율">${Array.from({length:10},(_,i)=>`<img src="${H}kit/soldier.png" alt="" class="${i>=Math.round(Number(pair?.[2]?.replaceAll(',',''))/Math.max(1,Number(pair?.[1]?.replaceAll(',','')))*10)?'lost':''}">`).join('')}</div>`:''}</div></section>`;
 const ownPair=range(city?'.nb-city-ally small':'.fc-col.ally small'),foePair=range(city?'.fc-dur':'.fc-col.enemy small');
 const ownLoss=city?'0':text('.fc-col.ally small span').replace(/^−/,''),foeLoss=city?([...source.querySelectorAll('.fc-sum')].map(n=>n.textContent).join(' ').match(/내구\s*−(\d+)/)?.[1]??'—'):text('.fc-col.enemy small span').replace(/^−/,'');
 const title=text('.fc-title'),parts=title.split(' · '),kind=city?(parts.slice(0,-1).join(' · ')||'성벽 공격'):(text('.fc-dir')||title||'정면 공격'),enemyName=city?(parts.at(-1)||title):text('.fc-col.enemy b');
 const mods=forecastModifiers([...source.querySelectorAll('.fc-mods li')].map(n=>{const detail=n.querySelector('small')?.textContent.trim()||'',text=n.textContent.trim();return {text:detail&&text.endsWith(detail)?text.slice(0,-detail.length).trim():text,description:detail||n.getAttribute('title')||''};}));
 const risks=[...source.querySelectorAll('.fc-risk')].map(n=>n.textContent.trim());
 const threat=source.querySelector('.fc-threat')?.textContent.trim()??'';
 const targets=source.querySelector('.fc-targets')?.outerHTML??'';
 const tacticCommand=text('.fc-command'),confirm=source.querySelector('.fc-tactic-confirm');
 const confirmHtml=confirm?confirm.outerHTML.replace('class="fc-tactic-confirm"','class="nb-click"'):'<b class="nb-click">공격 확정<small>적 칸 클릭</small></b>';
 const cancelHtml=confirm?'<button type="button" class="nb-cancel" data-tactic-cancel>취소 · Esc</button>':'<small class="nb-cancel">취소 · Esc</small>';
 const commandStyle=tacticCommand?' style="display:block;white-space:normal;text-align:center;overflow:visible"':'';
 return `<div class="nb-forecast" style="--ally-color:${esc(colors.ally)};--enemy-color:${esc(colors.enemy)}" title="${esc([...mods.map(m=>m.text),...risks].join('\n'))}">${side('ally',text(city?'.nb-city-ally b':'.fc-col.ally b'),picture(city?'.nb-city-ally img':'.fc-col.ally img'),ownPair,ownLoss)}<section class="nb-preview-middle"><i aria-hidden="true"></i><b>${esc(tacticCommand&&!title?'전법 예고':kind)}</b><span${commandStyle}>${esc(tacticCommand||[text('.fc-res'),text('.fc-tag')].filter(Boolean).join(' · '))}</span></section>${side('enemy',enemyName,city?'':picture('.fc-col.enemy img'),foePair,foeLoss,city?'내구':'병력')}<aside class="nb-preview-mods">${mods[0]?`<b>${esc(mods[0].text)}</b><p>${esc(mods[0].description||mods[1]?.text||'')}</p>`:''}${risks.length?`<small class="nb-preview-risk" title="${esc(risks.join('\n'))}">${esc(risks[0])}</small>`:''}</aside>${threat?`<p class="nb-preview-threat">${esc(threat)}</p>`:""}${targets}${confirmHtml}${cancelHtml}</div>`;
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
 return `<h2>선택 부대</h2><b class="nb-supply-name">${esc(a.name)}</b><p class="nb-supply-tag ${s.draining?'warn':''}">${esc(a.label)}</p><h3 class="nb-carry-title">휴대 군량</h3><div class="nb-supply-gauge" role="img" aria-label="휴대 군량 ${labelNumber(stock)}/${labelNumber(max)}차례분">${Array.from({length:5},(_,i)=>`<i style="--fill:${stock!==null&&max>0?Math.max(0,Math.min(1,stock/max*5-i))*100:0}%"></i>`).join('')}</div><p class="nb-supply-count">${labelNumber(stock)}/${labelNumber(max)}차례분</p><p class="nb-supply-next">다음 변화 · ${esc(next)}</p><section class="nb-supply-source">${a.source?`<h3>${esc(a.source.name)}${a.source.besieged?' · 포위':''}</h3><p>성 식량 <b>${labelNumber(a.source.foodStock)} / ${labelNumber(a.source.foodCapacity)}</b></p>`:a.hub?`<h3>보급 거점</h3><p>거점 재고 <b>${labelNumber(a.hub.stock)}</b></p>`:''}<p>공급 <b class="${a.blocked||a.source?.besieged?'warn':''}">${a.blocked||a.source?.besieged?'차단':a.source||a.hub?'연결':'원천 없음'}</b></p><p>${esc(a.context||'알려진 보급 원천 없음')}</p>${a.blocked?`<p class="warn">${esc(a.blocked)}</p>`:''}<small>성 창고와 부대 휴대량은 별도입니다.</small></section><blockquote>길이 끊긴 곳에,<br>굶주림이 전장의 주인이 된다.</blockquote>`;
}
export function selectedUnitHtml(d){
 const a=d.bandSupply,s=a?.supply,r=d.ratings,st=d.bandStatus??{};
 const stock=s?.perTurn>0?s.stock/s.perTurn:null,max=s?.perTurn>0?s.max/s.perTurn:null;
 const rows=[['location','있는 곳',d.unitLocation],['troops','병력',troopText(d.unitTroops??0)],['reinforcement','충원',d.unitReinforcement??'다음 차례 자동 충원 +0'],['food','군량',`휴대 ${labelNumber(stock)}/${labelNumber(max)} 차례분`],...['attack','defense','mobility'].map((k,i)=>[k,['공격','방어','기동'][i],r?.[k]]),['status','상태',`${st.morale?.text??'—'} · ${st.formation?.text??'—'}`]];
 return `<h2>선택 부대</h2><dl>${rows.map(([icon,label,value])=>`<div${icon==='reinforcement'?' class="c195-unit-reinforcement"':''}><dt><img aria-hidden="true" alt="" src="/assets/ui-v3/hud/kit-icon-${icon==='reinforcement'?'troops':icon}.png">${label}</dt><dd>${esc(value??'—')}</dd></div>`).join('')}</dl>`;
}
function renderBandSupply(root,d){
 const supply=d.mode==='supply',focus=!!d.unitStatus,title=root.querySelector('.nb-state-title');
 title.hidden=!supply&&!focus;title.querySelector('h1').textContent=supply?'지도 · 보급':focus?'전장 집중':'';
 title.querySelector('p').innerHTML=supply?(d.bandSupply?.supply?.model==='clock'||d.foodModel==='clock'?`보급권 ${labelNumber(d.supplyRange)}칸 안은 군량이 줄지 않습니다.<br>권 밖에서는 휴대 군량으로 버팁니다.`:'보급선과 휴대 군량을 확인하십시오.<br>길이 끊기면 휴대 군량으로 버팁니다.')+'<br><button data-mode="world">Esc · 지형으로</button>' : focus?'대상을 선택하고 명령을 내리세요.':'';
 const panel=root.querySelector('.nb-supply'),face=d.bandSupply?root.querySelector('.ih-face img')?.getAttribute('src'):'';
 panel.hidden=!supply;panel.innerHTML=supply?`${face&&HEAD_RE.test(face)?`<span class="nb-supply-portrait"><img src="${esc(face)}" alt="${esc(d.bandSupply.name)}"></span>`:''}<div class="nb-supply-body">${bandSupplyHtml(d)}</div>`:'';
}
function setBandState(band,state){if(band.dataset.state===state)return;band.dataset.state=state;band.classList.remove('nb-wipe');void band.offsetWidth;band.classList.add('nb-wipe');}
function fitBandOrders(content){
 const row=content.querySelector('.nb-order-row'),more=content.querySelector('.nb-more');if(!row||!more)return;
 const end=content.closest('.nb-band')?.querySelector('.ih-end');if(end)row.append(end);
 // Keep full labels and 72px minimum buttons. Extra long orders remain reachable in More.
 while(row.scrollWidth>row.clientWidth+1&&row.querySelectorAll('[data-act]').length>2)more.prepend(row.querySelector('[data-band-more]').previousElementSibling);
}
function renderCommandBand(root,d,showUnit,menu){
 const q=s=>root.querySelector(s),band=q('.nb-band'),content=q('.nb-content');if(!band)return;
 band._supplyData=d;if(band.dataset.state!=='forecast')renderBandSupply(root,d);
 if(band._goalMounted!==true){q('.ih-victory').hidden=true;band._goalMounted=true;}
 const goal=document.querySelector('#victory-guide'),dots=Number(goal?.textContent.match(/내 큰 성 (\d)/)?.[1]??0),left=goal?.textContent.match(/\d+차례 남음/)?.[0]??'';
 q('.ih-medal').title=[goal?.textContent,goal?.title].filter(Boolean).join('\n');
 q('[data-band-goal]').innerHTML=`승리 조건 <span class="nb-goal-dots" aria-label="내 큰 성 ${dots}/3">${[0,1,2].map(i=>i<dots?'●':'○').join('')}</span>`;
 q('.nb-forecast-status').innerHTML=`<span class="nb-status-date">${esc(String(d.date??'').replace(/^\d+턴\s*·\s*/, ''))} · ${esc(d.turn??'')}차례</span>${[...q('.ih-res').querySelectorAll('.ih-chip')].filter(c=>['food','production','troops'].includes(c.dataset.res)).map(c=>`<span>${esc(c.querySelector('.nb-resource-label')?.textContent??'')} ${esc(c.querySelector('b')?.textContent??'')}${c.dataset.res==='production'?' '+esc(c.querySelector('small')?.textContent??''):''}</span>`).join('')}`;
 fitForecastStatus(q('.nb-forecast-status'));
 const situation=document.querySelector('#c207-situation:not([hidden])');
 const advisor=document.querySelector('#w-advisor .face img')?.src,advice=situation?.textContent||document.querySelector('#campaign-advice:not([hidden])')?.textContent||document.querySelector('#status')?.textContent||d.summary||'전장을 살펴보십시오.';
 if(situation)q('.nb-advisor-box').dataset.situation=situation.dataset.event;else delete q('.nb-advisor-box').dataset.situation;
 q('.nb-advisor-box').innerHTML=`<span class="nb-advisor">${advisor?`<img src="${esc(advisor)}" alt="군사">`:'軍'}</span><div><b>${esc(document.querySelector('#w-advisor .who')?.textContent??'군사')}</b><p title="${esc(advice)}">${esc(advice)}</p><button class="nb-next" data-band-next${!d.remaining?' disabled':''}>다음 부대 · ${d.remaining??0}</button></div>`;
 const selected=q('.nb-selected');selected.hidden=!showUnit;selected.innerHTML=showUnit?selectedUnitHtml(d):'';
 q('.nb-bookmarks [data-band-map] span').textContent=RAIL.find(([m])=>m===d.mode)?.[1]??'지형';q('.nb-badge').textContent=d.council||'';
 for(const button of root.querySelectorAll('.nb-bookmarks [data-mode]'))button.classList.toggle('on',button.dataset.mode===d.mode);
 q('.nb-end-warning').textContent=q('.ih-end small').textContent;q('.nb-end-warning').title=q('.nb-end-warning').textContent;
 q('.ih-end').classList.toggle('ready',d.remaining===0&&!q('.ih-end').disabled);
 const task=Math.max(d.todo??0,d.todoLines?.length??0),news=d.allNews??[],latest=news[0]??'';q('.nb-news-tab').textContent=`이번 차례 · 할 일 ${task}`;
 q('.nb-tasks').hidden=false;q('.nb-tasks').innerHTML=(d.todoLines?.length?d.todoLines:['이번 차례 남은 안건이 없습니다.']).map(t=>`<li><i aria-hidden="true">➜</i>${typeof t==='string'?`<span>${esc(t)}</span>`:`<button type="button" data-c210-facility="${esc(t.cityId)}" data-c210-kind="${esc(t.kind)}">${esc(t.text)}</button>`}<i class="nb-check" aria-hidden="true">○</i></li>`).join('');
 if(band._news!==undefined&&band._news!==latest&&latest){q('.nb-news-peek').textContent=latest;q('.nb-news-peek').hidden=false;clearTimeout(band._peekTimer);band._peekTimer=setTimeout(()=>{q('.nb-news-peek').hidden=true;},2000);}band._news=latest;
 if(band._army!==d.unitStatus?.id){q('.nb-sheet').hidden=true;band._army=d.unitStatus?.id;setBandState(band,showUnit?'unit':'rest');}
 let html;
 if(showUnit){
  const name=menu.querySelector('.dk-id h2')?.textContent??'',face=menu.querySelector('.dk-face img')?.src??'',r=d.ratings,st=d.bandStatus??{};
  const button=(b,display=null)=>{const label=b.cloneNode(true);label.querySelectorAll('.gi,kbd,.tactic-wait,.tactic-meter').forEach(n=>n.remove());const reason=b.title||label.textContent.trim();label.querySelectorAll('small').forEach(n=>n.remove());return `<button${tacticFaceCopy(b)} data-act="${esc(b.dataset.menu??'tactic')}"${b.dataset.tactic?` data-tactic="${esc(b.dataset.tactic)}"`:''}${b.disabled?' disabled':''}${d.bandSelected===(b.dataset.tactic??b.dataset.menu)?' aria-pressed="true"':''} title="${esc(reason)}">${esc(display??label.textContent.trim())}${b.dataset.tactic?tacticFaceMarkup(Number(b.dataset.cooldown??0),b.dataset.gauge===undefined?null:Number(b.dataset.gauge)):''}</button>`;};
  const all=[...menu.querySelectorAll('.dk-acts button')],more=['face','garrison','wait','hub','officer','recall','star','cancel-order'];
  const fallback=(action,label,reason)=>{if(all.some(b=>b.dataset.menu===action))return;const b=document.createElement('button');b.dataset.menu=action;b.disabled=true;b.title=reason;b.textContent=label;all.push(b);};
  fallback('move','이동',d.unitStatus?.actions?.reason||'이번 차례 이동을 쓸 수 없습니다');
  fallback('attack','공격',d.unitStatus?.actions?.main.available?'지금 칠 수 있는 적이나 성이 없습니다':'주 행동을 쓸 수 없습니다');
  fallback('brace','방어','이번 차례 주 행동을 마쳤습니다');fallback('regroup','재정비','이번 차례 주 행동을 마쳤습니다');
  fallback('face','정면','이번 차례 이동을 썼습니다');fallback('garrison','주둔',d.garrisonWhy||'아군 성 주변에서 복귀할 수 있습니다');fallback('wait','대기','이번 차례 명령을 마쳤습니다');fallback('hub','거점','지금은 거점을 지을 수 없습니다');
  const ordered=[...all.filter(b=>['move','attack'].includes(b.dataset.menu)),...all.filter(b=>b.dataset.tactic),...all.filter(b=>['brace','regroup'].includes(b.dataset.menu))];
  ordered.sort((a,b)=>({move:0,attack:1,brace:3,regroup:4}[a.dataset.menu]??2)-({move:0,attack:1,brace:3,regroup:4}[b.dataset.menu]??2));
  const reasons=ordered.filter(b=>b.disabled).map(b=>b.title).filter(Boolean);
  html=`<button class="nb-hero" data-act="officer" title="장수 정보"><img src="${esc(face)}" alt="${esc(name)}"><small class="c186-band-seal">${esc(d.unitClass??'')}</small></button><div class="nb-identity"><b>${esc(name)} · 병력 ${troopText(d.unitTroops??0)}</b><small class="c186-band-class">${esc(d.bandMeta?.replace(/ · 병력.*$/,'')??'')}</small><p class="nb-help" title="${esc(reasons.join(' · '))}">${esc(d.commandIntent||'행동을 선택하세요.')}</p></div><div class="nb-orders"><div class="nb-order-row">${ordered.slice(0,3).map((b,i)=>button(b,i===2&&b.dataset.tactic?'전법':null)).join('')}<button data-band-more aria-expanded="false">더 보기</button></div><div class="nb-more" hidden>${[...ordered.slice(3),...all.filter(b=>more.includes(b.dataset.menu))].map(b=>button(b)).join('')}</div></div>`;
  q('.nb-sheet > div').innerHTML=q('.ih-readout').innerHTML;
 }else{
  html='';
 }
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
export function tacticFaceMarkup(cooldown=0,gauge=null){return `${cooldown>0?`<span class="tactic-wait" aria-label="${cooldown}차례 대기">${cooldown}</span>`:''}${gauge===null?'':`<span class="tactic-meter" style="--tactic-gauge:${gauge}%" aria-label="고유 전법 게이지 ${gauge}/100"><i></i><em>${Math.round(gauge)}</em></span>`}`;}
function tacticFaceCopy(b){return b.dataset.tactic?` data-cooldown="${b.dataset.cooldown??0}"${b.dataset.gauge===undefined?'':` data-gauge="${b.dataset.gauge}"`} class="tactic-face${b.dataset.cooldown>0||b.dataset.gauge!==undefined&&b.dataset.gauge<100?' cooling':''}"`:'';}
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
 const result=[...new Set([...cityRows.filter(r=>r.priority<2).map(cityText),...other.filter(t=>/견제|협상/.test(t)),...rows,...newEnemies,...cityRows.filter(r=>r.priority>=2).map(cityText),...other])].slice(0,5);
 return detailed?result.map(text=>({text,...locations.get(text)})):result;
}
export function turnSummaryHtml(rows){
 return rows.map(row=>{const r=typeof row==='string'?{text:row}:row;return `<li>${r.tileId||r.armyId||r.cityId?`<button type="button" data-summary-city="${esc(r.cityId??'')}" data-summary-tile="${esc(r.tileId??'')}" data-summary-army="${esc(r.armyId??'')}">${esc(r.text)}</button>`:esc(r.text)}</li>`;}).join('');
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
 const arrow=['→','↗','↖','←','↙','↘'][weather.direction]??'•';
 return `<span class="c206-wind" aria-label="바람 ${esc(weather.name)}풍"><span aria-hidden="true">${arrow}</span> ${esc(weather.name)}풍</span>`;
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
const STRATAGEM_CARDS=[
 {kind:'RUMOR',name:'유언비어',art:'rumor',effect:'성 산출 감소 · 자동 충원 멈춤',blocked:'범위 안 보이는 적 성 없음'},
 {kind:'SOW_DISCORD',name:'이간',art:'discord',effect:'적 부대의 사기 동요',blocked:'범위 안 보이는 적 부대 없음'},
 {kind:'DISRUPT_SUPPLY',name:'보급 교란',art:'supply',effect:'적 부대의 휴대 군량 감소',blocked:'범위 안 보이는 적 부대 없음'}
];
export function stratagemPanelHtml(options,ui={},result=null){
 const card=STRATAGEM_CARDS.find(c=>c.kind===(result?.kind??ui.kind));
 if(result)return `<section class="c226-result" aria-labelledby="c226-result-title"><img class="c226-result-art" src="/assets/ui-v3/u3/stratagem/art-${card?.art??'rumor'}.png" alt=""><h2 id="c226-result-title">${esc(card?.name??'계략')} · ${result.success===undefined?'결과':result.success?'성공':'실패'}</h2><p role="status">${esc(result.text)}</p><p>들킴 · ${result.exposed?'적에게 발각됨':'들키지 않음'}</p><p>${result.success?'효과':'실패 · 효과 없음'}${result.success?' · '+esc(result.effectText??''):''}</p><button data-stratagem-close>닫기</button></section>`;
 const officer=options.find(o=>o.officerId===ui.officerId),choices=officer?.choices??[],p=choices.find(p=>JSON.stringify(p.cmd)===ui.commandKey);
 return `<div class="c226-controls"><h2>계략${card?' · '+esc(card.name):''}</h2><label>장수 고르기 <select data-stratagem-officer><option value="">장수를 고르세요</option>${options.map(o=>`<option value="${esc(o.officerId)}" ${o.officerId===ui.officerId?'selected':''} ${o.blockedReason||!o.choices.length?'disabled':''}>${esc(o.name)} · 지략 ${o.intelligence} · 대기 ${o.cooldown}차례${o.blockedReason?' · '+esc(stratagemReasonText(o.blockedReason)):!o.choices.length?' · 보이는 대상 없음':''}</option>`).join('')}</select></label>
 ${officer&&!ui.kind?`<div class="c226-cards" aria-label="종류 고르기">${STRATAGEM_CARDS.map(c=>{const blocked=!choices.some(p=>p.cmd.kind===c.kind);return `<button class="c226-card" data-stratagem-kind="${c.kind}" ${blocked?'disabled':''}><span class="art"><img src="/assets/ui-v3/u3/stratagem/art-${c.art}.png" alt=""></span><h3>${c.name}</h3><p>${c.effect}</p><small>${blocked?c.blocked:'지도에서 대상을 고릅니다'}</small></button>`;}).join('')}</div>`:''}
 ${card?`<button class="c226-picked" data-stratagem-repick><img src="/assets/ui-v3/u3/stratagem/art-${card.art}.png" alt="">${card.name} · 다시 고르기</button><p>밝은 테두리의 ‘대상’을 누르세요.</p>`:''}
 ${p?`<section class="c226-preview"><h3>계략 예고 · ${esc(p.targetName)}</h3><p>성공률 ${p.chance}% · 들킬 위험 ${p.exposedRisk}%</p><p>${esc(p.effectText)}</p><button data-stratagem-execute>실행</button></section>`:''}<button data-stratagem-close>취소</button></div>`;
}
