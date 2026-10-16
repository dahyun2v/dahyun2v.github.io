import {citySecurityName} from './hud-ink.mjs';
import {troopText} from '../../src/troop-display.mjs';
// 성 무대(CITY STAGE, 정본 §23) — 성 전경 → 건물 → 시설 장면(장수 큰 그림 + 그 시설의 명령).
// Claude 2026-10-08. 화면 연출은 Fable 시안(docs/work-integration/20261008/ui-v3/compare/fable-city-stage.html)에서 가져오고 실제 게임 상태로 채운다.
// 명령 자체는 컨트롤러의 성 창(#city-panel)을 시설 장면 오른쪽에 옮겨 붙여 그대로 쓴다(명령 처리 코드 그대로).

import {cityLifeHtml} from './city-life.mjs';
import {cityEconomyRates,facilityTiles} from '../../src/campaign-economy.mjs';
import {view,step} from '../../src/campaign-runtime.mjs';
import {CITY_JOBS} from '../../src/campaign-economy.mjs';
import {productionReadout,cityReinforcementText} from './hud-ink.mjs';
import {C20_FACILITIES} from '../../src/campaign-policy.mjs';
import {directionToward} from '../../src/campaign-abilities.mjs';
import {parentTroop,troopInfo} from '../../src/campaign-special-troops.mjs';
import {v3Asset} from '../design/v3-ui.mjs';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// C200: presentation and read-only command probes. Never estimate permission or transfer time in UI rules.
const domesticProbes=new WeakMap();
export function domesticQuote(state,command){
  let cache=domesticProbes.get(state);if(!cache){cache=new Map();domesticProbes.set(state,cache);}
  const key=JSON.stringify(command);if(cache.has(key))return cache.get(key);
  let result;
  try{const next=step(state,command),t=command.type==='OFFICER_TRANSFER'?next.officerTransfers?.at(-1):null;result={reason:null,turns:t?t.arrivalTurn-t.departureTurn:null};}
  catch(e){result={reason:e.message,turns:null};}
  cache.set(key,result);return result;
}
export function domesticIntent(cityId,action,value,extra={}){
  return ({department:()=>({type:extra.department==='governor'?'CITY_GOVERNOR':'CITY_DEPARTMENT',cityId,department:extra.department,officerId:value||null}),
    auto:()=>({type:'CITY_AUTO_DEPARTMENTS',cityId,enabled:value}),policy:()=>({type:'CITY_POLICY',cityId,policy:value}),
    priority:()=>({type:'CITY_FOOD_PRIORITY',cityId,enabled:value}),reserve:()=>({type:'CITY_RESERVE_JOB',cityId,kind:value||null,...extra}),
    job:()=>({type:'CITY_JOB',cityId,kind:value,...extra}),transfer:()=>({type:'OFFICER_TRANSFER',fromCityId:cityId,toCityId:value,officerId:extra.officerId})})[action]?.();
}
const njNum=n=>Number.isFinite(n)?Number(n.toFixed(2)).toLocaleString('ko-KR'):'—';
const NJ_POLICIES={balanced:'균형',agriculture:'농업',commerce:'상업',military:'군사',delegated:'위임'};
const NJ_SPEC={artisan:'기술자',scholar:'학자',logistician:'병참',official:'관료'};
const NJ_RESOURCE={agriculture:'식량',commerce:'생산 · 인망',military:'군사 보너스'};
const njSeatStatus=(k,s)=>!s.officerId?'빈 칸':k==='governor'?s.state:`+${njNum(s.bonus)} ${NJ_RESOURCE[k]}${s.state==='근무 중'?'':` · ${s.state}`}`;
const njIcon=name=>`<img src="/assets/ui-v3/hud/icons/${name}.png" alt="">`;
const njJob=kind=>CITY_JOBS[kind]?.name??kind??'없음';
const domesticRecipe=(kind,text)=>text.includes('→')?text:`${text} → ${{farm:'군량 · 주민',tuntian:'군량 · 주민',granary:'식량 비축',market:'정책 · 장수 등용',workshop:'건설 · 모집',barracks:'모집 · 재편',clinic:'부상병 회복',mufu:'군사 운영'}[kind]??'성 운영'}`;
export function domesticJobExtra(v,ui){
 if(ui.job!=='reorganize')return {};
 const army=v.ownArmies[ui.armyId]??Object.values(v.ownArmies)[0],o=v.officers[army?.commanderId],types=o?.multiTroopTrait?.troopTypes??[o?.troopType];
 return army?{armyId:army.armyId,troopType:types.includes(ui.troopType)?ui.troopType:types[0]}:{};
}
export function domesticTransferOptions(state,v,c,officerId){
  return Object.values(v.ownCities).filter(x=>x.cityId!==c.cityId).map(to=>({cityId:to.cityId,name:to.name,...domesticQuote(state,domesticIntent(c.cityId,'transfer',to.cityId,{officerId}))}));
}
export function influenceHtml(c){
  const tiles=c.influence?.tiles??[],[cq,cr]=c.tileId.split(',').map(Number);
  return `<div class="nj-influence" aria-label="영향권 산출"><header>영향권 · 인구 ${esc(c.influence?.workers)}명 / ${esc(c.influence?.workedTiles)}칸 작업 <small>밝은 칸은 작업 중 · 숫자는 칸의 유효 산출</small></header><div class="nj-tiles">${tiles.map(t=>{const [q,r]=t.tileId.split(',').map(Number),x=50+(q-cq+(r-cr)/2)*16,y=50+(r-cr)*20;return `<div class="nj-tile ${t.worked?'worked':''} ${t.blocked?'blocked':''}" data-nj-tile="${esc(t.tileId)}" style="left:${x}%;top:${y}%" title="${esc(t.tileId)} · ${esc(t.terrain)} · 기저 식량 ${njNum(t.baseYield.food)} / 생산 ${njNum(t.baseYield.production)}"><small>${esc(t.tileId)}</small><span>${njIcon('res-food')}${njNum(t.effectiveYield.food)} ${njIcon('res-production')}${njNum(t.effectiveYield.production)}</span><small>${t.blocked?'적 점유 · 산출 중단':t.worked?'작업 중':'미작업'}</small></div>`;}).join('')}<b class="nj-center">${esc(c.name)}</b></div></div>`;
}
/** All numbers come from own-city view; permission probes execute only on the engine's copied state. */
export function naejeongHtml({state,v,c,art,ui={},face=()=>null,reasonText=x=>x,date=''}){
 const rates=c.economyForecast??{},ledger=c.foodLedger??{},kind=ui.facility,job=c.jobs?.find(j=>j.kind===kind),installed=c.facilities?.filter(f=>f.kind===kind)??[],site=c.facilitySites?.[kind];
 const refusal=code=>code?`${reasonText(code)}${/[가-힣]/.test(code)?'':` (${code})`}`:'';
 const quote=cmd=>domesticQuote(state,cmd),locked=ui.locked?'명령 처리 중':'';
 const roles=kind?cityFacilityRoles(state,c.cityId):{},role=roles[kind];
 const estimate=job?.estimate?productionReadout(job.estimate):null,jobCommand=domesticIntent(c.cityId,'job',kind),jobReason=kind?(locked||job?.blockedReason||quote(jobCommand).reason):null;
 const seats={governor:{...c.governorSlot,name:'태수',stat:'politics',statName:'정무'},...c.departments};
 const departments=Object.entries(seats).map(([k,s])=>{const o=v.officers[s.officerId],src=face(s.officerId);return `<button type="button" class="nj-dept ${ui.department===k?'on':''} ${s.state==='출진 중'?'absent':''}" data-nj-department="${k}"><span class="nj-face">${src?`<img src="${esc(src)}" alt="">`:'＋'}</span><span><b>${esc(s.name)}</b><small>${esc(o?.name??'앉히기')}</small><small>${o?`${esc(s.statName)} ${njNum(o.baseStats?.[s.stat])}`:''}</small><small>${esc(njSeatStatus(k,s))}</small></span></button>`;}).join('');
 const selected=seats[ui.department],previews=selected?(ui.department==='governor'?(c.departments?.agriculture?.previews??[]):selected.previews??[]):[];
 const picker=selected?`<section class="nj-picker" aria-label="담당 장수 선택"><header><b>${esc(selected.name)} · 장수 앉히기</b><button data-nj-dismiss>닫기 ×</button></header>${previews.map(p=>{const o=v.officers[p.officerId],cmd=domesticIntent(c.cityId,'department',p.officerId,{department:ui.department}),why=locked||quote(cmd).reason;return `<div class="nj-candidate"><button data-nj-appoint="${esc(p.officerId)}" ${why?'disabled':''}><b>${esc(o?.name??p.officerId)}</b> ${esc(selected.statName)} ${njNum(o?.baseStats?.[selected.stat])} ${ui.department==='governor'?'':` · +${p.bonus} ${NJ_RESOURCE[ui.department]}`}</button><button data-nj-transfer-officer="${esc(p.officerId)}">다른 성으로</button>${why?`<small>${esc(refusal(why))}</small>`:''}</div>`;}).join('')||'<p>이 성에 근무할 수 있는 장수가 없습니다.</p>'}${selected.officerId?`<div class="nj-candidate"><button data-nj-clear ${ui.department==='governor'||locked?'disabled':''}>비우기</button><button data-nj-transfer-officer="${esc(selected.officerId)}">${esc(v.officers[selected.officerId]?.name)} · 다른 성으로</button>${ui.department==='governor'?'<small>태수 해임 명령은 엔진에 없습니다. 다른 태수로 교체할 수 있습니다.</small>':''}</div>`:''}</section>`:'';
 const transfers=ui.transferOfficer?domesticTransferOptions(state,v,c,ui.transferOfficer):[];
 const transferPicker=ui.transferOfficer?`<section class="nj-picker" aria-label="장수 이동 목록"><header><b>${esc(v.officers[ui.transferOfficer]?.name)} · 다른 성으로</b><button data-nj-dismiss>닫기 ×</button></header>${transfers.map(t=>`<p><button data-nj-transfer="${esc(t.cityId)}" ${t.reason||locked?'disabled':''}>${esc(t.name)} ${t.reason?'':`· ${t.turns}차례`}</button> <small>${esc(refusal(t.reason))}</small></p>`).join('')||'<p>이동할 다른 아군 성이 없습니다.</p>'}</section>`:'';
 const active=c.jobs?.find(j=>j.kind===c.currentProduction?.kind),activeRead=active?.estimate?productionReadout(active.estimate):null,pct=active?.estimate?.cost?Math.min(100,active.estimate.progress/active.estimate.cost*100):0;
 const facilityKinds=(c.jobs??[]).filter(j=>!['muster','recruit','reorganize','repair'].includes(j.kind));
 const markers=facilityKinds.map((j,i)=>{const spot=art.spots?.[j.kind]??({farm:art.spots?.granary,tuntian:art.spots?.residence,clinic:art.spots?.tavern,mufu:art.spots?.office})[j.kind],x=(spot?spot.x/art.w*100:25+i*6)+(!art.spots?.farm&&j.kind==='farm'?-6:0),y=(spot?spot.y/art.h*100:40)+(!art.spots?.farm&&j.kind==='farm'?7:0);return `<button class="nj-marker ${kind===j.kind?'on':''}" style="left:${x}%;top:${y}%" data-nj-facility="${j.kind}" title="${esc(j.name)}" aria-label="${esc(j.name)}" aria-pressed="${kind===j.kind}"><img src="${d2(j.kind)}" alt=""><span>${esc(j.name)}</span></button>`;}).join('');
 const selectedSpot=art.spots?.[kind]??({farm:art.spots?.granary,tuntian:art.spots?.residence,clinic:art.spots?.tavern,mufu:art.spots?.office})[kind];
 const box=selectedSpot?buildingHitBox(selectedSpot,art):null;
 const highlight=box?`<img class="nj-lit" src="${esc(art.src)}" alt="" style="clip-path:inset(${box[1]/art.h*100}% ${100-(box[0]+box[2])/art.w*100}% ${100-(box[1]+box[3])/art.h*100}% ${box[0]/art.w*100}%)"><i class="nj-site-outline" style="left:${box[0]/art.w*100}%;top:${box[1]/art.h*100}%;width:${box[2]/art.w*100}%;height:${box[3]/art.h*100}%"></i>`:'';
 const jobChoices=(c.jobs??[]).filter(j=>j.kind!=='muster').map(j=>`<option value="${j.kind}" ${ui.job===j.kind?'selected':''}>${esc(j.name)}${j.blockedReason?` · ${esc(refusal(j.blockedReason))}`:''}</option>`).join('');
 const selectedJob=ui.job??(c.jobs??[]).find(j=>!['muster','reorganize'].includes(j.kind))?.kind,chosen=c.jobs?.find(j=>j.kind===selectedJob),extra=domesticJobExtra(v,ui);
 const reserveReason=ui.jobs?(locked||chosen?.blockedReason||quote(domesticIntent(c.cityId,'reserve',selectedJob,extra)).reason):null;
 const startReason=ui.jobs?(locked||chosen?.blockedReason||quote(domesticIntent(c.cityId,'job',selectedJob,extra)).reason):null;
 const ledgerRows=[...(ledger.incoming??[]),...(ledger.outgoing??[])];
 const reserveInfo=[cityReinforcementText(c),...Object.entries(c.specialReserves??{}).map(([type,n])=>`특수 예비 · ${troopInfo(state,type).troopDisplayName} ${troopText(n)}명`)].join(' / ');
 return `<div class="nj-screen"><header class="nj-ledger"><div class="nj-title"><b>${esc(c.name)} · 내정</b><span>${esc(date)}</span><nav><button data-nj-legacy="state">형편</button><button data-nj-legacy="cmds">특기</button><button class="cs-back">성으로</button><button class="cs-world">지도로</button></nav></div><div class="nj-resources"><details class="nj-food"><summary>식량 <strong data-nj-number="foodStock">${njNum(c.foodStock)}</strong><span>순증 <b data-nj-number="forecastNet">${ledger.forecastNet>0?'+':''}${njNum(ledger.forecastNet)}</b></span><span>바닥까지 <b>${ledger.turnsUntilEmpty===null?'—':njNum(ledger.turnsUntilEmpty)}</b> 차례</span></summary><div class="nj-ledger-detail"><b>직전 정산 · 실제 순증 ${njNum(ledger.net)}</b>${ledgerRows.map(e=>`<p>${esc(e.label)} <b>${e.amount>0?'+':''}${njNum(e.amount)}</b></p>`).join('')||'<p>첫 정산 전입니다.</p>'}<small>위 순증·바닥까지는 현재 산출과 유지비로 추정합니다. 자동 지원은 직전 정산 내역에 표시됩니다.</small></div></details>${[['production','생산','res-production'],['science','과학','res-science'],['prestige','인망','res-fame']].map(([k,n,ic])=>`<span>${njIcon(ic)}${n} <b data-nj-number="${k}">${njNum(rates[k])}</b></span>`).join('')}<span title="${esc(reserveInfo)}">예비병 <b>${troopText(c.reserveTroops)}</b></span></div></header>
 <aside class="nj-departments"><h2>담당 장수</h2>${departments}<label class="nj-auto"><input type="checkbox" data-nj-auto ${c.autoDepartments?'checked':''} ${locked?'disabled':''}> 빈 칸 자동 채움</label><section class="nj-specialists"><h2>전문인력</h2>${Object.entries(NJ_SPEC).map(([k,n])=>`<p title="${esc(c.specialistFormation?.effects?.[k])}"><b>${n} ${njNum(c.specialists?.[k]??0)}</b><small>${esc(c.specialistFormation?.effects?.[k])}</small></p>`).join('')}<small>${esc(c.specialistFormation?.state)} · 대략 ${njNum(c.specialistFormation?.approximateTurns)}차례<br>다음 ${esc(NJ_SPEC[c.specialistFormation?.nextKind]??'—')}</small></section></aside>
 <main class="nj-city ${kind?'selected':''}" aria-label="성 시설"><div class="nj-painting" style="--nj-ratio:${art.w/art.h}"><img class="nj-city-art" src="${esc(art.src)}" alt="${esc(c.name)} 성 전경">${ui.influence?'':highlight+markers}</div>${ui.influence?influenceHtml(c):''}${ui.error?`<p class="nj-error" role="alert">${esc(ui.error)}</p>`:''}</main>
 ${job?`<aside class="nj-facility"><header><h1>${esc(job.name)}</h1><span>${installed.length?`설치 ${installed.length}곳`:'미설치'}</span><button data-nj-unselect aria-label="시설 선택 닫기">×</button></header><img class="nj-facility-art" src="/assets/ui-v3/facilities-ink/${kind==='repair'?'workshop':kind}.png" alt="${esc(job.name)}"><small>만드는 것 → 쓰이는 곳</small><h3>${esc(domesticRecipe(kind,role?.text??job.description??CITY_JOBS[kind]?.description??''))}</h3><p>자리: ${esc(site?.reason??'지을 빈 영향권 칸 없음')}</p>${installed.map(f=>`<p>${esc(f.siteReason??'기존 시설 자리')} · ${f.disabled?'적 점유·손상 · 산출 정지':'가동 중'}</p>`).join('')}<p>현재 상태 · ${esc(c.currentProduction?.kind===kind?'건설 중':jobReason?refusal(jobReason):'생산 가능')}</p><section><h3>다음 시설 추가</h3><p>생산 ${njNum(job.cost)} · ${estimate?.turns===null?'산출 회복 후 재개':`${njNum(estimate?.turns)}차례`}</p><p>${esc(job.description??CITY_JOBS[kind]?.description??'')}</p><small>기존 시설의 단계 승급은 제공되지 않습니다.</small></section><button class="nj-upgrade" data-nj-build="${kind}" ${jobReason?'disabled':''}>올리기 · 새 시설 추가</button>${jobReason?`<small class="nj-refusal">${esc(refusal(jobReason))}</small>`:''}</aside>`:''}
 <footer class="nj-bottom"><section class="nj-production"><small>현재 생산</small><b>${c.currentProduction?esc(njJob(c.currentProduction.kind)):'놀고 있음'}</b><span>${activeRead?.turns===null?'생산 회복 후 재개':activeRead?`${activeRead.turns}차례 남음`:''}</span><div class="nj-progress"><i style="width:${pct}%"></i></div>${c.jobBlocked?`<small>${esc(refusal(c.jobBlocked))}</small>`:''}<button data-nj-jobs>생산 고르기</button></section><section class="nj-reservation"><small>다음 예약 · 1칸</small><b>${esc(njJob(c.nextProduction?.kind))}</b><button data-nj-jobs>예약 고르기</button>${c.nextProduction?`<button data-nj-cancel-reserve ${locked?'disabled':''}>취소</button>`:''}</section><section class="nj-policy"><small title="${esc(c.policyEffects?.join(' · '))}">성 방침</small><div>${Object.entries(NJ_POLICIES).map(([k,n])=>`<button data-nj-policy="${k}" class="${c.domesticPolicy===k?'on':''}" aria-pressed="${c.domesticPolicy===k}" ${locked?'disabled':''}>${n}</button>`).join('')}</div></section><section class="nj-priority"><button data-nj-priority aria-pressed="${c.foodPriority}" ${locked?'disabled':''}>식량 먼저 채울 성 ${c.foodPriority?'☑':'□'}</button><button data-nj-influence aria-pressed="${!!ui.influence}">영향권 보기</button><small>${esc(citySecurityName(c)??'—')} · ${esc(cityReinforcementLabel(c))}</small></section></footer>
 ${ui.jobs?`<section class="nj-picker" aria-label="생산과 예약"><header><b>생산 · 다음 예약</b><button data-nj-dismiss>닫기 ×</button></header><label>할 일 <select data-nj-job-select>${jobChoices}</select></label>${ui.job==='reorganize'?`<p><label>재편 부대 <select data-nj-army>${Object.values(v.ownArmies).map(a=>`<option value="${esc(a.armyId)}" ${extra.armyId===a.armyId?'selected':''}>${esc(v.officers[a.commanderId]?.name??a.armyId)}</option>`).join('')}</select></label><label> 병종 <select data-nj-troop>${(v.officers[v.ownArmies[extra.armyId]?.commanderId]?.multiTroopTrait?.troopTypes??[v.officers[v.ownArmies[extra.armyId]?.commanderId]?.troopType]).filter(Boolean).map(t=>`<option value="${esc(t)}" ${t===extra.troopType?'selected':''}>${esc({militia:'근접보병',spear:'장병',bow:'원거리보병',cavalry:'기병'}[t]??t)}</option>`).join('')}</select></label></p>`:''}<p><button data-nj-start ${startReason?'disabled':''}>지금 생산</button><small>${esc(refusal(startReason))}</small></p><p><button data-nj-reserve ${reserveReason?'disabled':''}>다음 예약</button><small>${esc(refusal(reserveReason))}</small></p></section>`:transferPicker||picker}
 ${(v.officerTransfers??[]).filter(t=>t.fromCityId===c.cityId||t.toCityId===c.cityId).length?`<div class="nj-transit">${(v.officerTransfers??[]).filter(t=>t.fromCityId===c.cityId||t.toCityId===c.cityId).map(t=>`${esc(v.officers[t.officerId]?.name??t.officerId)} → ${esc(v.ownCities[t.toCityId]?.name??t.toCityId)} · ${t.state==='BLOCKED'?'보급선 단절 · 대기':`${Math.max(0,t.arrivalTurn-v.turn)}차례`}`).join('<br>')}</div>`:''}</div>`;
}
function cityReinforcementLabel(c){return Number.isFinite(c.guardMaximum)?`수비 최대 ${troopText(c.guardMaximum)}`:'';}

/** Same six axial rays as combat facing, translated into screen compass names. */
export function sortieGateName(center,tile){
  if(center.q===tile.q&&center.r===tile.r)return '성 가운데';
  return ['동문','북동문','북서문','서문','남서문','남동문'][directionToward(center,tile)];
}
export const sortieTroopIcon=type=>`/assets/ui-v3/dots-1016/icons/D3-${({militia:'melee',spear:'spear',bow:'bow',cavalry:'cavalry'})[parentTroop(type)]??'melee'}.png`;
export function sortieSquadPath(type='militia',tone='grey',asset=v3Asset){
  return asset(`units-ink/squad-${type}-${tone}.webp`)??`/assets/ui-v3/units-ink/squad-${parentTroop(type)}-${tone}.webp`;
}

/** Presentation only: ranges, gate availability and refusals are supplied by the engine controller. */
export function sortieHtml({city,officer,art,roster,troops,selectedType,gates,selectedGate,sequence,keep,face}){
  const icon=sortieTroopIcon(selectedType??officer?.troopType),tone=({F01:'red',F02:'green',F03:'blue'})[city.ownerFactionId]??'grey';
  return `<header class="u3-sortie-head"><span>${esc(city.name)} 병영 · 출진 편성</span><button type="button" data-sortie-close>병영으로 돌아가기 ×</button></header>
    <div class="u3-sortie-art">${art?`<img src="${esc(art)}" alt="${esc(officer?.name)} 전신 원화">`:''}</div>
    <section class="u3-sortie-panel" aria-label="부대 편성"><p class="u3-sortie-sequence">${sequence+1}번째 출진 · 한 장수 한 부대</p>
      <div class="u3-sortie-title"><h1>${esc(officer?.name??'장수 없음')}</h1><label><img src="${icon}" alt="">편성 <select id="city-job-muster-troop" aria-label="출진 병종" ${troops.length<2?'disabled':''}>${sortieTroopOptionsHtml(troops,selectedType)}</select></label></div>
      <div class="u3-sortie-squad" aria-label="병종 대열">${Array.from({length:4},()=>`<img src="${sortieSquadPath(selectedType??'militia',tone)}" alt="">`).join('')}</div>
      <dl class="u3-sortie-stats"><div><dt>공격</dt><dd data-sortie-stat="attack">—</dd></div><div><dt>방어</dt><dd data-sortie-stat="defense">—</dd></div><div><dt>기동</dt><dd data-sortie-stat="mobility">—</dd></div></dl>
      <div class="u3-sortie-strength"><label for="city-sortie-count">편성 병력</label><p><output id="sortie-strength"></output><span>명</span></p></div>
      <div class="u3-sortie-slider"><input id="city-sortie-count" type="range" aria-label="출진 병력"><div class="u3-sortie-limits"><span id="sortie-min"></span><span id="sortie-max"></span></div><small id="muster-troop-info"></small></div>
      <div class="u3-sortie-result"><p id="sortie-reserve"></p><p id="muster-selection" aria-live="polite"></p><small id="sortie-supply"></small></div>
      <select id="city-job-officer" hidden aria-label="출진 장수">${roster.map(r=>`<option value="${esc(r.officerId)}" ${r.officerId===officer?.officerId?'selected':''}>${esc(r.name)}</option>`).join('')}</select>
    </section>
    <aside class="u3-sortie-roster" aria-label="장수 명단"><h2>장수 명단 <small>${roster.length}명</small></h2><div>${roster.map(r=>`<button type="button" class="u3-sortie-row ${r.officerId===officer?.officerId?'on':''}" data-sortie-officer="${esc(r.officerId)}" ${r.reason?'disabled':''}><span class="u3-sortie-face">${face(r.officerId)?`<img src="${esc(face(r.officerId))}" alt="">`:''}</span><span><b>${esc(r.name)}</b><small><img src="${sortieTroopIcon(r.troopType)}" alt="">${esc(r.troopName)}</small><small class="${r.reason?'refusal':''}">${esc(r.reason??r.status)}</small></span></button>`).join('')}</div></aside>
    <div class="u3-sortie-gates" aria-label="출진 성문"><span class="u3-sortie-gate-label">나갈 문<br><b>${gates.filter(g=>!g.reason).length}</b>곳 열림</span><div>${gates.map(g=>`<button type="button" class="u3-sortie-gate ${g.tileId===selectedGate?'on':''}" data-sortie-gate="${esc(g.tileId)}" aria-pressed="${g.tileId===selectedGate}" ${g.reason?'disabled':''}><b>${esc(g.name)}${g.reason?' · 막힘':''}</b><small>${esc(g.reason??'이 문으로 출진')}</small></button>`).join('')}</div></div>
    <footer class="u3-sortie-action"><label><input id="sortie-keep" type="checkbox" ${keep?'checked':''}> 계속 출진</label><button type="button" data-sortie>출진</button><small>누르면 바로 출진 · 이번 차례에 이동 가능</small></footer>`;
}

export const sortieTroopOptionsHtml=(troops,selectedType)=>troops.map(t=>`<option value="${esc(t.troopType)}" ${t.troopType===selectedType?'selected':''} ${t.blockedReason?'disabled':''}>${esc(t.troopType===t.parentTroopType?`기본 · ${t.troopDisplayName}`:t.troopDisplayName)}${t.blockedReason?` · ${esc(t.blockedReason)}`:''}</option>`).join('');

export const D2_ICON = Object.freeze({farm:'farm',granary:'granary',market:'market',workshop:'workshop',barracks:'barracks',tuntian:'tuntian',clinic:'clinic',mufu:'command-tent',muster:'sortie',recruit:'recruit',reorganize:'reorganize',repair:'repair',idle:'idle'});
const d2 = kind => `/assets/ui-v3/dots-1016/icons/D2-${D2_ICON[kind]??'command-tent'}.png`;
const stageKind = id => ({gate:'repair'}[id]??id);

/** Current contribution (all facilities of this kind), or next-facility preview; engine output only. */
export function cityFacilityRoles(state, cityId) {
  const c=state.cities[cityId];if(!c || c.ownerFactionId!==state.playerFactionId)return {};
  const sites=view(state).ownCities[cityId]?.facilitySites;
  const out={},dest={food:'군량 · 주민 유지',capacity:'식량 비축 한도',prestige:'정책 · 장수 등용',production:'건설 · 모집 속도',workBonus:'모집 · 재편 속도'};
  const resource={food:'식량',capacity:'저장',prestige:'인망',production:'생산',workBonus:'작업 보너스'};
  for(const kind of ['farm','granary','market','workshop','barracks']){
    const installed=(c.facilities??[]).filter(f=>f.kind===kind), rest=(c.facilities??[]).filter(f=>f.kind!==kind);
    const tileId=sites?sites[kind]?.tileId:facilityTiles(state,c)[0];
    if(!installed.length&&!tileId){out[kind]={label:'추가 불가',text:'시설을 지을 빈 칸이 없습니다.'};continue;}
    const before=cityEconomyRates(state,{...c,facilities:rest});
    const after=cityEconomyRates(state,{...c,facilities:installed.length?c.facilities:[...rest,{kind,tileId}]});
    const lines=Object.keys(dest).flatMap(k=>{
      const n=k==='capacity'||k==='workBonus'?after[k]-before[k]:(after.raw?.[k]??after[k])-(before.raw?.[k]??before[k]);
      return Math.abs(n)>1e-8?[`${resource[k]} ${n>0?'+':''}${Number((n*(k==='workBonus'?100:1)).toFixed(2))}${k==='workBonus'?'%':''} → ${dest[k]}`]:[];
    });
    out[kind]={label:installed.length?'현재 시설 합계':'추가 시',text:lines.join(' / ')||'산출 변화 없음 → 시설 상태 · 작업 칸 확인'};
  }
  for(const [kind,b] of Object.entries(C20_FACILITIES))out[kind]={label:'시설 역할',text:b.description};
  return out;
}

export function buildingHitBox(s, art) {
  if(s.hitBox)return s.hitBox;
  if(s.poly?.length){const xs=s.poly.map(p=>p[0]*(p[0]<=1?art.w:1)),ys=s.poly.map(p=>p[1]*(p[1]<=1?art.h:1));return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];}
  return [s.x-art.w*.025,s.y-art.h*.04,art.w*.05,art.h*.04];
}

function roleHtml(id, roles={}, c={}, inline=false) {
  const kind=stageKind(id), role=roles[kind];
  const text=id==='office'&&['CAPTURED','OCCUPATION'].includes(c.occupation?.stage)?'관청의 형편 탭에서 점령 정책을 정하세요':role?.text??({office:'성의 일 · 인사 → 내정 운영',barracks:'예비병 → 부대 출진',gate:'성벽 · 출입 → 성 방어',residence:'머무는 장수 → 방문 · 대화',tavern:'소문 · 재야 인재 → 만남 · 등용'}[id]??BUILDINGS[id]?.fn??'');
  return `<span class="cs-role${inline?' inline':''}"${inline?'':' role="tooltip"'}><img src="${d2(kind)}" alt=""><b>${BUILDINGS[id]?.name??id}</b><small>${esc(role?.label??'건물 역할')}</small><span>${esc(text)}${id==='barracks'?` / 예비병 ${Number(c.reserveTroops??0).toLocaleString('ko-KR')} → 부대 출진`:''}</span></span>`;
}

// 건물: 이름·한자·기능·시설 장면에서 열 성 창 칸(pane)·선택 표식·조명
export const BUILDINGS = {
  office: {name: '관청', hanja: '官', fn: '행정 · 인사', pane: 'office', mark: 'seal', light: 'admin', sub: '가장 안쪽 높은 곳 · 성의 일을 정하는 곳'},
  residence: {name: '저택', hanja: '宅', fn: '머무는 장수 · 대화', pane: 'residence', mark: 'open', light: 'manor', sub: '조용한 안쪽 · 장수들이 머무는 곳'},
  market: {name: '시장', hanja: '市', fn: '교역 · 생산', pane: 'office', mark: 'scale', light: 'market', sub: '길이 만나는 곳'},
  granary: {name: '곡창', hanja: '倉', fn: '비축 · 배급', pane: 'office', mark: 'cong', light: 'granary', sub: '곡식 창고 구역'},
  tavern: {name: '주점', hanja: '酒', fn: '소문 · 술자리 · 재야', pane: 'tavern', mark: 'open', light: 'tavern', sub: '시장과 성문 사이 · 골목 안'},
  barracks: {name: '병영', hanja: '營', fn: '출진 · 편성', pane: 'barracks', mark: 'tally', light: 'barracks', sub: '성벽 안쪽 · 진입로 옆'},
  workshop: {name: '공방', hanja: '工', fn: '제작 · 시설', pane: 'office', mark: 'cong', light: 'granary', sub: '중심에서 조금 떨어진 곳'},
  gate: {name: '성문', hanja: '門', fn: '출입 · 성벽', pane: 'office', mark: 'pushou', light: 'gate', sub: '바깥 경계'},
};
const MARKS = {
  tally: `<svg viewBox="0 0 26 26"><path class="tl" d="M3 8.5h9.5v2.5h-2.2v4h2.2v2.5H3z"/><path class="tr" d="M23 8.5h-9.5v2.5h2.2v4h-2.2v2.5H23z"/></svg>`,
  seal: `<svg viewBox="0 0 26 26"><rect x="4" y="4" width="18" height="18"/><rect class="inner" x="9" y="9" width="8" height="8"/></svg>`,
  scale: `<svg viewBox="0 0 26 26"><path class="beam" d="M3 9h20M6 9v2M20 9v2"/><path d="M13 5v16M9 21h8"/></svg>`,
  pushou: `<svg viewBox="0 0 26 26"><circle cx="9" cy="6.5" r="1.4"/><circle cx="17" cy="6.5" r="1.4"/><path d="M8 10h10"/><circle class="ring" cx="13" cy="16" r="5"/></svg>`,
  open: `<svg viewBox="0 0 26 26"><circle class="open" cx="13" cy="13" r="8.5"/></svg>`,
  cong: `<svg viewBox="0 0 26 26"><rect x="4" y="4" width="18" height="18"/><circle cx="13" cy="13" r="4.5"/></svg>`,
};
// 그림이 없을 때 쓰는 건물 자리(지도 미니어처 1216×832 기준 발밑) — Fable 시안의 업 좌표
const FALLBACK_ANCHORS = {office: [618, 268], residence: [512, 322], market: [632, 438], granary: [852, 468], tavern: [712, 545], barracks: [626, 596], gate: [792, 656], workshop: [520, 470]};
const CITY_FILE = {west: 'ye', east: 'ji', south: 'nanpi', yijing: 'yijing', zhongshan: 'zhongshan', xindu: 'xindu', julu: 'julu', pingyuan: 'pingyuan'};
export const cityFile = (cityId) => CITY_FILE[cityId] ?? 'ye';

// 태수 판 바로가기 표(page-city-v2 의 네모 단추: 위 화살 · 칼 · 주머니 · 망치)
const ACT_ICON = {
  office: '<svg viewBox="0 0 24 24"><path d="M12 3l7 8h-4.5v10h-5V11H5z"/></svg>',
  barracks: '<svg viewBox="0 0 24 24"><path d="M4 3l11.5 11.5-1.6 1.6L2.4 4.6V3zM20 3h1.6v1.6L10.1 16.1l-1.6-1.6zM5.2 15.6l3.2 3.2-2.6 2.6-1.4-.2-1.6-1.6-.2-1.4zM18.8 15.6l2.6 2.6-.2 1.4-1.6 1.6-1.4.2-2.6-2.6z"/></svg>',
  market: '<svg viewBox="0 0 24 24"><path d="M9 3h6l-1.6 3.2c3.9 1.6 6.6 5.6 6.6 9.3C20 19.6 16.6 21 12 21s-8-1.4-8-5.5c0-3.7 2.7-7.7 6.6-9.3z"/></svg>',
  workshop: '<svg viewBox="0 0 24 24"><path d="M3 5.5L7.5 2l3 3-1.4 1.4 9.9 9.9-2.1 2.1-9.9-9.9L5.6 9.9zM13.5 5.5l4.5-3.5 3 3-1.4 1.4L9 17l-2.1 2.1L4.8 17 6.9 14.9l10.6-8.1z"/></svg>',
};
// 흑묵 성 화면 그림(기준 page-city-v2 에서 GPT 가 한 장씩 뽑은 판·틀·표지·아이콘 — /assets/ui-v3/hud/)
const HUD = '/assets/ui-v3/hud/';
const BUILD_ICON = {office: 'b-office', residence: 'b-residence', market: 'b-market', granary: 'res-food', tavern: 'b-tavern', barracks: 'cmd-attack', workshop: 'b-build', gate: 'cmd-garrison'};
const ACT_IC = {office: 'b-develop', barracks: 'cmd-attack', market: 'b-trade', workshop: 'b-build'};
const ic = (name) => `<img class="ic" src="${name.startsWith('D2:')?d2(name.slice(3)):`${HUD}icons/${name}.png`}" alt="" onerror="this.style.visibility='hidden'">`;
const SIL = '<svg viewBox="0 0 11 20"><path d="M5.5 0a2.1 2.1 0 1 1 0 4.2A2.1 2.1 0 0 1 5.5 0zM2.2 6.3C2.2 5.3 3.7 4.6 5.5 4.6s3.3.7 3.3 1.7V12H7.6l-.5 8H3.9l-.5-8H2.2z"/></svg>';

/** 이 성의 사람들을 건물에 앉힌다: 관청 = 태수, 병영 = 지휘 높은 자유 장수, 주점 = 재야(없으면 감화 높은 장수), 저택 = 군주 또는 남은 장수. */
export function cityPeople(v, c) {
  const all = [...(c.freeOfficers ?? []).map((o) => v.officers[o.officerId] ?? o)];
  const gov = c.governorId ? v.officers[c.governorId] : null;
  const ruler = v.faction?.rulerOfficerId ?? v.faction?.rulerId;
  const pool = [gov, ...all].filter(Boolean).filter((o, i, a) => a.findIndex((x) => x.officerId === o.officerId) === i);
  const by = (k) => [...pool].sort((a, b) => (b.baseStats?.[k] ?? 0) - (a.baseStats?.[k] ?? 0));
  const taken = new Set(), take = (o) => { if (o) taken.add(o.officerId); return o ?? null; };
  const office = take(gov ?? by('politics')[0]);
  const barracks = take(by('leadership').find((o) => !taken.has(o.officerId)) ?? null);
  const wanderer = (c.wanderers ?? [])[0];
  const tavern = wanderer ? {...wanderer, wanderer: true} : take(by('charisma').find((o) => !taken.has(o.officerId)) ?? null);
  const residence = take(pool.find((o) => o.officerId === ruler && !taken.has(o.officerId)) ?? pool.find((o) => !taken.has(o.officerId)) ?? null);
  return {office, barracks, tavern, residence};
}

/** 人牒: 사람이 들고 온 현안(최대 3 + 나머지 수). 게임 상태에서만 뽑는다. */
export function cityIssues(v, c, people, {idle = false} = {}) {
  const out = [], who = (o) => o?.name ?? '';
  const occ = c.occupation?.stage;
  if (occ === 'CAPTURED' || occ === 'OCCUPATION') out.push({to: 'office', by: people.office, text: '관청의 형편 탭에서 점령 정책을 정하세요', level: 'urgent'});
  if (idle) out.push({to: 'office', by: people.office, text: '생산할 일을 정해 주십시오', level: 'urgent'});
  if ((c.economyForecast?.food ?? 0) < 0) out.push({to: 'granary', by: people.office, text: '곳간이 줄고 있습니다', level: 'warn'});
  if ((c.securityLevel ?? 0) >= 1) out.push({to: 'office', by: people.office, text: '민심이 흔들립니다', level: 'warn'});
  if ((c.wanderers ?? []).length) out.push({to: 'tavern', by: people.tavern, text: `떠돌이 인재 ${c.wanderers.length}명이 주점에 머뭅니다`, level: 'new'});
  if ((c.musterOptions ?? []).length && (c.reserveTroops ?? 0) >= 200) out.push({to: 'barracks', by: people.barracks, text: '출진할 준비가 되었습니다', level: 'quiet'});
  if (people.residence && people.residence !== people.office) out.push({to: 'residence', by: people.residence, text: '찾아오면 이야기를 나눌 수 있습니다', level: 'quiet'});
  return out.filter((x) => x.by || x.to).map((x) => ({...x, name: who(x.by)}));
}

/** 그림·건물 위치: C82 전경(json)이 있으면 그것, 없으면 지도 미니어처 + 기본 자리. */
export async function loadStageArt(cityId, assetUrl, tone = '') {
  // 기준 시안(page-city-v2)의 그림 그대로: 시안에서 UI만 지운 판 한 장(세력 깃발 색이 다른 판이 있으면 그것)을 쓴다 — 사용자 2026-10-10 "뒤에 붙이는 그림은 시안 것 그대로". 건물 자리는 판 옆 json
  const plate = (tone && assetUrl(`scenes/plate-city-${tone}.webp`)) || assetUrl('scenes/plate-city.webp');
  if (plate) {
    try {
      const j = await fetch('/assets/ui-v3/scenes/plate-city.json').then((r) => r.json());
      const [w, h] = j.size ?? [1672, 941];
      const spots = Object.fromEntries((j.buildings ?? []).filter((b) => BUILDINGS[b.id]).map((b) => [b.id, {x: (b.anchor?.[0] ?? 0.5) * w, y: (b.anchor?.[1] ?? 0.5) * h}]));
      let life=null;
      try {const r=await fetch('/assets/ui-v3/dots-1016/city-life/plate-city.json');if(r.ok!==false){const data=await r.json(),rel=plate.replace('/assets/ui-v3/','');if([data.image,...(data.sameGeometry??[])].includes(rel)){life=data;for(const [id,box] of Object.entries(data.hitBoxes??{}))if(spots[id])spots[id].hitBox=box;}}} catch { /* uncharted art uses smoke and birds only */ }
      return {src: plate, w, h, spots, full: true, plate: true, life};
    } catch { /* 아래 옛 그림 */ }
  }
  const f = cityFile(cityId), img = assetUrl(`city-stage/${f}.webp`), meta = img ? `/assets/ui-v3/city-stage/${f}.json` : null; // 좌표 json 은 manifest 에 없어도 그림 옆에서 읽는다
  if (img && meta) {
    try {
      const j = await fetch(meta).then((r) => r.json());
      const [w, h] = j.size ?? [1920, 1080];
      const spots = Object.fromEntries((j.buildings ?? []).filter((b) => BUILDINGS[b.id]).map((b) => [b.id, {x: (b.anchor?.[0] ?? 0.5) * w, y: (b.anchor?.[1] ?? 0.5) * h, poly: b.poly}]));
      return {src: img, w, h, spots, full: true};
    } catch { /* 아래 기본값 */ }
  }
  const mini = assetUrl(`cities/${f}.png`);
  return {src: mini, w: 1216, h: 832, spots: Object.fromEntries(Object.entries(FALLBACK_ANCHORS).map(([k, [x, y]]) => [k, {x, y}])), full: false};
}

/** 성 전경 HTML(무대 안). art = loadStageArt 결과. */
export function overviewHtml({v, c, art, people, issues, date, facilityState = {}, portraits = {}, emblem = '', lordArt = null}) {
  const owner = c.ownerFactionId === v.factionId ? (v.faction?.name ?? '') : '';
  const fmt = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') : '—';
  const d = (n) => Number.isFinite(n) && n ? `<u class="${n > 0 ? '' : 'down'}">${n > 0 ? '+' : '−'}${Math.abs(Math.round(n))}</u>` : '';
  const sec = ['안정', '불안', '혼란'][c.securityLevel ?? 0] ?? '';
  const place = (id) => people[id] ? `<div class="cs-mark" data-spot="${id}">${SIL}<span>${esc(people[id].name)}</span>${portraits[people[id].officerId]?.path ? `<div class="face"><img src="${esc(portraits[people[id].officerId].path)}" alt=""></div>` : ''}</div>` : '';
  const spots = Object.entries(art.spots).map(([id, s]) => {
    const b = BUILDINGS[id]; if (!b) return '';
    const [x,y,w,h]=buildingHitBox(s,art);
    return `<div class="cs-spot" data-spot="${id}" data-hanja="${b.hanja}" style="left:${x/art.w*100}%;top:${y/art.h*100}%;width:${w/art.w*100}%;height:${h/art.h*100}%"><button class="cs-hit" aria-label="${b.name}" aria-describedby="cs-role-${id}"></button><i class="cs-building-highlight" style="background-image:url('${esc(art.src)}');background-size:${art.w/w*100}% ${art.h/h*100}%;background-position:${x/(art.w-w)*100}% ${y/(art.h-h)*100}%"></i><span class="cs-decoration" style="left:${(s.x-x)/w*100}%;top:${(s.y-y)/h*100}%"><span class="mk"><img class="mk-art" src="${HUD}city-marker.png" alt="">${ic(BUILD_ICON[id] ?? 'b-office')}</span><span class="label"><b>${b.name}</b><small>${b.fn}</small></span>${place(id)}</span><span id="cs-role-${id}" class="cs-role-host">${roleHtml(id,facilityState.roles,c)}</span></div>`;
  }).join('');
  const shown = issues.slice(0, 3), more = issues.length - shown.length;
  // 흑묵판(page-city-v2): 왼쪽 = 건물에 앉은 사람의 둥근 초상 + 건물 표(누르면 그 건물), 오른쪽 = 태수 판(큰 그림·능력 막대·건물 바로가기)
  const cast = ['office', 'barracks', 'tavern', 'residence'].filter((k) => people[k]).map((k) => {
    const o = people[k], face = portraits[o.officerId]?.path, iss = issues.find((x) => x.by === o && x.level !== 'quiet');
    return `<button class="face-btn ${iss?.level ?? ''}" data-spot="${iss?.to ?? k}" title="${esc(o.name)} · ${BUILDINGS[k].name}${iss ? ` — ${esc(iss.text)}` : ''}"><span class="disc">${face ? `<img src="${esc(face)}" alt="">` : ''}</span><img class="frame" src="${HUD}city-cast-frame.png" alt=""><span class="badge">${ic(BUILD_ICON[k])}</span><span class="role">${BUILDINGS[k].name}</span><span class="tag"><b>${esc(o.name)}</b>${iss ? `<em>${esc(iss.text)}</em>` : `<small>${BUILDINGS[k].name}</small>`}</span></button>`;
  }).join('');
  const lord = people.office;
  // 2026-10-13 배치(시안 docs/work-integration/20261013/ui-layout/mock/city-gpt.jpg): 건물 단추 넷 대신 성 수치 표, 막대에는 이름. 태수 그림은 원래대로 크게(사용자 10-13 "태수 초상화는 원래대로 큰 거로" — 판 그림 city-lord-v3)
  // 태수 판의 막대 두 칸은 성의 값이다(사용자 2026-10-14: "도시 태수로서의 화면인데 개인 능력치 들어갈 이유가 없음" — 정무 · 지휘를 뺐다). 무엇을 보일지는 부르는 쪽이 정한다(facilityState.lordGauges)
  const gauges = (facilityState.lordGauges ?? []).slice(0, 2).map((g, i) => `<i class="bar b${i + 1}${g.tone ? ` ${esc(g.tone)}` : ''}" title="${esc(g.label)} ${esc(g.text)}${g.hint ? ` · ${esc(g.hint)}` : ''}"><em>${esc(g.label)}</em><u style="--v:${Math.max(0, Math.min(100, g.max ? g.value / g.max * 100 : 0)).toFixed(0)}"></u><b>${esc(g.text)}</b></i>`).join('');
  const lordFace = lord ? portraits[lord.officerId]?.path : null;
  const stats = (facilityState.stats ?? []).map((x) => `<li class="${esc(x.tone ?? '')}" title="${esc(x.label)} ${esc(x.text)}${x.delta ? ` (차례마다 ${esc(x.delta)})` : ''}">${ic(x.ic)}<span class="k">${esc(x.label)}</span><b class="v">${esc(x.text)}</b>${x.delta ? `<u class="d">${esc(x.delta)}</u>` : ''}</li>`).join('');
  const lordTone = {F01: 'red', F02: 'green', F03: 'blue'}[v.factionId] ?? 'red';
  const lordHtml = lord ? `<aside class="cs-lord v3"><img class="panel" src="${HUD}city-lord-v3-${lordTone}.png" alt="" onerror="this.onerror=null;this.src='${HUD}city-lord-v3-red.png'">${v.factionId ? `<img class="em" src="${HUD}faction-banner-${esc(v.factionId)}.png" alt="" onerror="this.onerror=null;this.src='/assets/ui-v3/emblems/${esc(v.factionId)}.png'">` : ''}<div class="art" data-spot="office" title="${esc(lord.name)} · 관청">${lordArt ? `<img src="${esc(lordArt)}" alt="${esc(lord.name)}">` : lordFace ? `<img class="face" src="${esc(lordFace)}" alt="${esc(lord.name)}">` : ''}</div><b class="nm">${esc(lord.name)}<small>${lord.officerId === c.governorId ? '태수' : '관청'}</small></b>${gauges}<ol class="stats">${stats}</ol></aside>` : '';
  const job = facilityState.job;
  return `<div class="cs-stage"><img class="cs-under" src="${esc(art.src)}" alt="" aria-hidden="true"><div class="cs-fit${art.full ? ' full' : ''}${art.plate ? ' plate' : ''}" style="--ar:${(art.w / art.h).toFixed(4)}"><div class="cs-camera"><img class="cs-img" src="${esc(art.src)}" alt="" draggable="false"><i class="cs-light"></i><i class="cs-fog a"></i><i class="cs-fog b"></i>${cityLifeHtml(art)}<div class="cs-spots">${spots}</div></div></div><i class="cs-vignette"></i></div>
  <header class="cs-top"><div class="cell id">${emblem}<span class="name">${esc(c.name)}</span></div><div class="cell owner"><i style="background:var(--fc)"></i>${esc(owner || '우리 성')}<small>${c.kind === 'minor' ? '작은 성' : '큰 성'}</small></div><div class="cell date">${esc(date)}</div>
    <div class="cell vitals"><span>식량<b>${fmt(c.foodStock)}</b>${d(c.economyForecast?.food)}</span><span>인구<b>${fmt(c.population)}</b></span><span>예비병<b>${troopText(c.reserveTroops??0)}</b></span><span>치안<b>${sec}</b></span>${facilityState.working ? `<span class="role">생산 · ${esc(facilityState.working)}</span>` : ''}</div>
    <div class="cell back"><button class="cs-world" title="지도로 (Esc)">‹ 천하로</button></div></header>
  <aside class="cs-roster"><div class="panel"><h2>인첩</h2><div class="spine">${shown.map((x) => `<button class="entry ${x.level}" data-spot="${x.to}"><span class="who"><b>${esc(x.name || BUILDINGS[x.to]?.name)}</b><span class="where">${BUILDINGS[x.to]?.name ?? ''}</span></span><p><i class="issue-mark"></i>${esc(x.text)}</p></button>`).join('') || '<p class="calm">오늘은 조용합니다.</p>'}</div>${more > 0 ? `<div class="more"><b>+${more}</b> 다른 현안</div>` : ''}</div><div class="hint"><kbd>Alt</kbd>모든 건물 이름 · <kbd>Esc</kbd>천하로</div></aside>
  <nav class="cs-cast">${cast}</nav>${lordHtml}
  <footer class="cs-pulse${job ? ' v2' : ''}"${(facilityState.news ?? []).length ? ` title="${esc(facilityState.news.slice(0, 4).map((n) => `${n.tag} ${n.text}`).join(' · '))}"` : ''}>${job ? `<div class="cs-job${job.idle ? ' idle' : ''}" data-spot="office" title="지금 하는 일 · ${esc(job.name)}${job.text ? ` · ${esc(job.text)}` : ''}">${ic(job.ic ?? 'res-production')}<b>${esc(job.name)}</b><i><u style="width:${Math.max(0, Math.min(100, job.pct ?? 0)).toFixed(0)}%"></u></i><span>${esc(job.text ?? '')}</span></div>` : ''}${!job && (facilityState.gauges ?? []).length ? `<ol class="cs-gauges">${facilityState.gauges.map((g) => `<li class="${esc(g.tone ?? '')}" title="${esc(g.label)} ${esc(g.text ?? '')}">${ic(g.ic)}<span class="gauge-label">${esc(g.label.split(' · ')[0])}</span><i><u style="width:${Math.max(0, Math.min(100, g.pct ?? 0)).toFixed(0)}%"></u></i><b>${esc(g.text ?? '')}</b></li>`).join('')}</ol>` : ''}<div class="lab"><i></i>도시 소식</div><ul>${(facilityState.news ?? []).slice(0, 4).map((n) => `<li><em>${esc(n.tag)}</em><span>${esc(n.text)}</span></li>`).join('') || '<li><span>새 소식이 없습니다.</span></li>'}</ul></footer>`;
}

/** 시설 장면 HTML(명령 칸은 비워 두고 컨트롤러가 성 창을 옮겨 붙인다). */
export function facilityHtml({c, id, officer, line, bg, art, spot, portraits = {}, others = [], roles = {}}) {
  const b = BUILDINGS[id], full = officer && portraits[officer.officerId]?.full;
  const ox = spot ? (spot.x / art.w * 100).toFixed(2) : 50, oy = spot ? (spot.y / art.h * 100).toFixed(2) : 50;
  const scene = bg ? `<img class="cs-bg" src="${esc(bg)}" alt="">` : `<div class="cs-blur"><img src="${esc(art.src)}" alt="" style="transform-origin:${ox}% ${oy}%;transform:translate(${(50 - ox).toFixed(2)}%,${(50 - oy).toFixed(2)}%) scale(3.1)"></div>`;
  return `<div class="cs-scene light-${b.light}">${scene}<i class="l1"></i><i class="l2"></i><i class="cs-floor"></i><i class="cs-grain"></i></div>
  ${full ? `<div class="cs-officer"><img src="${esc(full)}" alt="${esc(officer.name)}"><i class="shade"></i></div>` : ''}<i class="cs-fore" aria-hidden="true"></i>
  ${officer && line ? `<p class="cs-quote">${esc(line)}</p>` : ''}
  ${officer ? `<div class="cs-nameplate"><i class="ln"></i><div><b>${esc(officer.name)}</b><span>${b.name}${officer.wanderer ? ' · 재야' : ''}</span></div></div>` : ''}
  <div class="cs-crumb"><span class="path"><b>${esc(c.name)}</b><i>›</i><b>${b.name}</b></span><span class="sep"></span><button class="cs-back">← 성 <kbd>Esc</kbd></button></div>
  <div class="cs-ftitle"><h1>${b.name}<small>${b.hanja}</small></h1><div class="sub">${b.sub}</div></div><div class="cs-facility-role">${roleHtml(id,roles,c,true)}</div>
  <div class="cs-commands" data-mark="${b.mark}" data-fac="${id}"><span class="mk">${MARKS[b.mark]}</span></div>
  <div class="cs-others"><span class="k">이곳의 사람</span>${others.map((o) => `<span><b>${esc(o.name)}</b>${o.note ? `<i>${esc(o.note)}</i>` : ''}</span>`).join('') || '<span class="emp">맡은 장수 없음</span>'}</div>`;
}
