// @ts-check
// Browser and Node share this adapter. Campaign rules and save schema live in src.
import {createCampaign, view, step, serialize, deserialize, campaignMoveOptions} from '../../src/campaign-runtime.mjs';
import {attackTargets, cityAttackTargets, previewAttack, previewTroopQ, previewCityAttack, previewTactic, armyActionEnded} from '../../src/campaign-combat.mjs';
import {campaignTactics, canMainAction, recallReason} from '../../src/campaign-effects.mjs';
import {pendingCampaignDraft, needsTraitResolution} from '../../src/campaign-growth.mjs';
import {createOfficerDraft, officerDraftView, officerDraftCompanions} from '../../src/campaign-officer-draft.mjs';
import {garrisonReason} from '../../src/campaign-roster.mjs';
import {troopText,TROOP_DISPLAY_SCALE} from '../../src/troop-display.mjs';
import {castleArmyActive} from '../../src/campaign-city-footprint.mjs';
import {regroupReason} from '../../src/campaign-morale.mjs';
import {hubBuildReason} from '../../src/campaign-supply.mjs';
import {diplomacyMoveReason} from '../../src/campaign-diplomacy.mjs';
import {occupationMethodReason, OCCUPATION_METHODS} from '../../src/campaign-occupation.mjs';
import {relationCityOfficers, socialReason} from '../../src/campaign-relations.mjs';

/** @typedef {{number?:number, command:any, label:string, forecast?:any}} Action */
export const FEATURE_NAMES = ['이동','예약 이동','공격','성 공격','전법','방어','재정비','정면 바꾸기','주둔/복귀','거점','생산','모집','재편','출진','태수 임명','내정 특기','주점(술자리 · 등용)','저택(찾아가기)','군의','외교','탐험','갈피(지형 · 보급 · 세력 · 외교 · 탐험 · 장수 · 평정)','장수 정보','규칙','저장','불러오기','성장 카드 고르기'];
const feature = c => ({SORTIE:'출진',MOVE_UNIT:'이동',QUEUE_MOVE:'예약 이동',ADVANCE_ORDER:'예약 이동',ATTACK_UNIT:'공격',ATTACK_CITY:'성 공격',USE_TACTIC:'전법',BRACE:'방어',REGROUP:'재정비',FACE:'정면 바꾸기',GARRISON:'주둔/복귀',RECALL_UNIT:'주둔/복귀',BUILD_HUB:'거점',CITY_GOVERNOR:'태수 임명',VISIT:'저택(찾아가기)',FEAST:'주점(술자리 · 등용)',WANDERER_RECRUIT:'주점(술자리 · 등용)',DRAFT_PICK:'성장 카드 고르기',EXPLORE_CHOICE:'탐험'}[c.type] ?? (c.type.startsWith('COUNCIL_')?'군의':c.type.startsWith('DIPLO_')?'외교':c.type==='CITY_JOB'?({recruit:'모집',reorganize:'재편'}[c.kind]??'생산'):c.type.startsWith('CITY_')?'내정 특기':null));
const message = e => e instanceof Error ? e.message : String(e);
const copy = x => structuredClone(x);
const cache = new WeakMap();
const catalogProblems=new WeakMap();
export const actionCatalogProblems=s=>catalogProblems.get(s)??[];

/** Candidate legality oracle for commands with extra engine-only guards. Never commits. */
function accepted(s, command) { try { step(s, command); return true; } catch { return false; } }

/** @param {any} s @param {{compact?:boolean}} [options] @returns {Action[]} */
export function listActions(s, {compact=false}={}) {
  const key=compact?'bot':'full', cached=cache.get(s)?.[key]; if(cached)return cached;
  /** @type {Action[]} */ const out=[];
  const add=(command,label,forecast=undefined,probe=false)=>{if(!probe||accepted(s,command))out.push({command,label,...(forecast===undefined?{}:{forecast})});};
  if(s.gameResult)return [];
  if(s.phase==='AI') { add({type:'ADVANCE_AI'},'상대 진행'); return out.map((a,i)=>({...a,number:i+1})); }
  const v=view(s), draft=pendingCampaignDraft(s);
  if(v.pendingEvent)for(const c of v.pendingEvent.choices)if(!c.blockedReason)add({type:'EVENT_CHOICE',eventId:v.pendingEvent.eventId,choiceId:c.id},`사건 ${c.label} — ${c.preview}`,undefined,true);
  if(draft){
    for(const c of draft.cards){
      const command={type:'DRAFT_PICK',draftId:draft.draft.draftId,traitId:c.traitId};
      const targets=c.bindingTargets?.length?c.bindingTargets:[null];
      for(const tacticId of targets){
        const cmd={...command,...(tacticId?{tacticId}:{})};
        if(needsTraitResolution(s,draft.officerId,c.traitId)){
          const r=s.campaignGrowth.officers[draft.officerId];
          for(const old of Object.keys(r.track.growthStates[draft.officerId].ownedTraitRanks).filter(id=>id!==r.coreId))add({...cmd,resolution:{mode:'discard',removeId:old}},`성장 ${c.name} / ${old} 버리기`,undefined,true);
        }else add(cmd,`성장 ${draft.officerId} ${c.name}${tacticId?' → '+tacticId:''}`,undefined,true);
        if(!compact)add({type:'DRAFT_REROLL',draftId:draft.draft.draftId,traitId:c.traitId},`성장 다시 뽑기 ${c.name}`,undefined,true);
      }
    }
    return numbered(s,key,out);
  }
  if(s.orderQueue?.length){
    add({type:'ADVANCE_ORDER'},'예약 이동 실행',undefined,true);
    if(!compact)for(const armyId of s.orderQueue)add({type:'CANCEL_MOVE',armyId},`예약 취소 ${armyId}`,undefined,true);
    return numbered(s,key,out);
  }
  if(!compact)for(const o of Object.values(v.officers))if(o.allegianceFactionId===v.factionId)for(const c of o.growth?.cards??[])if(c.kind==='tactic'){
    const equip=!(o.growth.equippedTacticIds??[]).includes(c.traitId);
    add({type:'TACTIC_LOADOUT',officerId:o.officerId,traitId:c.traitId,equip},`전법 ${equip?'장착':'해제'} ${o.name} ${c.name}`,undefined,true);
  }
  for(const a of Object.values(v.ownArmies)){
    const id=a.armyId, raw=s.armies[id];
    if(!castleArmyActive(s,raw)||armyActionEnded(s,id))continue;
    const injured=!!s.officers[a.commanderId]?.injury;
    if(!injured){
      for(const m of campaignMoveOptions(s,id))if(!diplomacyMoveReason(s,id,m.tileId)){
        add({type:'MOVE_UNIT',armyId:id,destinationTileId:m.tileId},`이동 ${id} → ${m.tileId}`);
        if(!compact)add({type:'QUEUE_MOVE',armyIds:[id],destinationTileId:m.tileId},`예약 이동 ${id} → ${m.tileId}`,undefined,true);
      }
      for(const targetId of attackTargets(s,id))add({type:'ATTACK_UNIT',armyId:id,targetId},`공격 ${id} → ${targetId}`,previewAttack(s,id,targetId));
      for(const targetId of a.troopQ?.targets??[])add({type:'USE_TROOP_Q',armyId:id,targetTileId:targetId},`병종 Q ${id} ${a.troopQ.name} → ${targetId}`,previewTroopQ(s,id,targetId));
      for(const cityId of cityAttackTargets(s,id))add({type:'ATTACK_CITY',armyId:id,cityId},`성 공격 ${id} → ${cityId}`,previewCityAttack(s,id,cityId));
      for(const t of campaignTactics(s,id))if(t.canUse)for(const targetId of t.targets){
        const command={type:'USE_TACTIC',armyId:id,traitId:t.traitId,targetId};
        try{
          const prediction=previewTactic(s,id,t.traitId,targetId);
          try{step(s,command);add(command,`전법 ${id} ${t.name} → ${targetId}`,prediction);}
          catch(e){const problems=catalogProblems.get(s)??[];if(!problems.some(p=>JSON.stringify(p.command)===JSON.stringify(command)))problems.push({kind:'PREVIEW_ACCEPTED_EXECUTION_REJECTED',turn:s.turn,command,error:message(e),prediction});catalogProblems.set(s,problems);}
        }catch{/* unavailable target */}
      }
      if(canMainAction(s,id)){
        add({type:'BRACE',armyId:id},`방어 ${id}`);
        if(!regroupReason(s,id))add({type:'REGROUP',armyId:id},`재정비 ${id}`);
        if(!garrisonReason(s,id))add({type:'GARRISON',armyId:id},`주둔 ${id}`);
        if(!recallReason(s,id))add({type:'RECALL_UNIT',armyId:id},`복귀 ${id}`,undefined,true);
        if(!hubBuildReason(s,raw))add({type:'BUILD_HUB',armyId:id},`거점 ${id}`);
      }
      if(!compact&&!s.movedArmyIds.includes(id))for(let facing=0;facing<6;facing++)add({type:'FACE',armyId:id,facing},`정면 ${id} ${facing}`);
      if(a.starAction&&!compact)add({type:'STAR_ACTION',armyId:id},`별의 길 ${id}`,undefined,true);
    }
    add({type:'WAIT_UNIT',armyId:id},`행동 끝 ${id}`);
    if(!compact&&s.moveOrders?.[id])add({type:'CANCEL_MOVE',armyId:id},`예약 취소 ${id}`);
  }
  for(const c of Object.values(v.ownCities)){
    // The public options already contain sortieReason and sortieTroopRange results.
    for(const o of c.musterOptions??[])for(const t of o.troops){
      const range=t.troopCountRange;
      if(t.blockedReason||!range||range.max<range.min)continue;
      const half=Math.max(range.min,Math.floor(range.max/2/range.step)*range.step);
      const sizes=[['최소',range.min],['절반',half],['최대',range.max]];
      const seen=new Set();
      for(const [size,count] of sizes){
        if(seen.has(count))continue;seen.add(count);
        add({type:'SORTIE',cityId:c.cityId,officerId:o.officerId,troopType:t.troopType,troopCount:count},`출진 ${c.name} ${v.officers[o.officerId]?.name??o.officerId} (${o.officerId}) ${t.troopDisplayName} ${size} ${troopText(count)}명`,{troopCount:count});
      }
    }
    for(const job of c.jobs??[]){
      if(job.blockedReason||job.kind==='muster')continue;
      if(job.kind==='reorganize'){
        if(!compact)for(const a of Object.values(v.ownArmies))for(const t of v.officers[a.commanderId]?.allowedTroops??[])if(t!==a.troopType)add({type:'CITY_JOB',cityId:c.cityId,kind:job.kind,armyId:a.armyId,troopType:t},`재편 ${a.armyId} ${t}`,job.estimate,true);
      }else if(c.currentProduction?.kind!==job.kind)add({type:'CITY_JOB',cityId:c.cityId,kind:job.kind},`생산 ${c.name} ${job.name}`,job.estimate);
    }
    for(const [method,name] of Object.entries(OCCUPATION_METHODS))if(!occupationMethodReason(s,s.cities[c.cityId],method))add({type:'OCCUPATION_METHOD',cityId:c.cityId,method},`점령 ${c.name} ${name}`);
    if(!compact){
      if(c.starAction?.canUse)add({type:'STAR_ACTION',cityId:c.cityId},`내정 ${c.name} ${c.starAction.name}`,undefined,true);
      for(const o of c.freeOfficers??[])if(o.officerId!==c.governorId)add({type:'CITY_GOVERNOR',cityId:c.cityId,officerId:o.officerId},`태수 ${c.name} ${o.name}`,undefined,true);
      for(const d of c.domesticCommands??[])if(d.available)add({type:d.type,cityId:c.cityId},`내정 ${c.name} ${d.label}`,undefined,true);
      const ids=relationCityOfficers(s,s.cities[c.cityId],{commanders:true});
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const cmd={type:'FEAST',cityId:c.cityId,officerIds:[ids[i],ids[j]]};if(!socialReason(s,cmd))add(cmd,`술자리 ${ids[i]} ${ids[j]}`);}
    }
    for(const o of c.wanderers??[])add({type:'WANDERER_RECRUIT',cityId:c.cityId,officerId:o.officerId},`등용 ${o.name}`,undefined,true);
  }
  if(!compact)for(const o of Object.values(v.officers))if(o.allegianceFactionId===v.factionId)for(let choice=0;choice<3;choice++){const cmd={type:'VISIT',officerId:o.officerId,choice};if(!socialReason(s,cmd))add(cmd,`방문 ${o.name} 대화 ${choice}`);}
  const council=v.council;
  if(council?.status==='OPEN'){
    if(!compact)for(const officerId of council.candidates??[])add({type:'COUNCIL_APPOINT',officerId},`군사 임명 ${officerId}`,undefined,true);
    for(const p of council.proposals??[])if(p.decision===null)for(const decision of ['APPROVE','HOLD'])add({type:'COUNCIL_DECIDE',proposalId:p.id,decision},`군의 ${p.text??p.kind} ${decision}`);
    add({type:'COUNCIL_CLOSE'},'군의 마침');
  }
  for(const f of v.diplomacy?.factions??[]){
    for(const kind of ['TRUCE','ALLIANCE'])if(f.canPropose[kind].ok)add({type:'DIPLO_PROPOSE',factionId:f.factionId,kind},`외교 ${f.name} ${kind}`);
    if(!compact&&f.canGift.ok)add({type:'DIPLO_GIFT',factionId:f.factionId},`선물 ${f.name} — ${f.canGift.effectLines.join(' · ')}`);
    if(!compact&&f.state==='ALLIANCE')add({type:'DIPLO_END_ALLIANCE',factionId:f.factionId},`동맹 종료 ${f.name}`,undefined,true);
  }
  for(const p of v.diplomacy?.incoming??[])for(const accept of [true,false])add({type:'DIPLO_RESPOND',proposalId:p.proposalId,accept},`외교 답변 ${p.fromName} ${accept?'수락':'거절'}`);
  const ex=v.exploration?.pending;
  for(const c of ex?.choices??[])add({type:'EXPLORE_CHOICE',placeId:ex.placeId,choiceId:c.choiceId},`탐험 ${c.text} — ${c.effectLine}`);
  for(const p of v.captives??[])if(!p.negotiating)for(const action of ['release','recruit'])add({type:'CAPTIVE_ACTION',prisonerId:p.prisonerId,action},`포로 ${p.name} ${action}`,undefined,true);
  // incremental makes listing cheap; ADVANCE_AI is explicitly exposed next.
  if(!v.pendingEvent)add({type:'END_TURN',incremental:true},'다음 차례');
  return numbered(s,key,out);
}
function numbered(s,key,out){const result=out.map((a,i)=>({...a,number:i+1}));const item=cache.get(s)??{};item[key]=result;cache.set(s,item);return result;}

/** Public forecast only; do not replace the preview with a simulated actual result. */
export function forecastFor(s,c){
  if(c.type==='SORTIE'){
    const option=view(s).ownCities[c.cityId]?.musterOptions?.find(o=>o.officerId===c.officerId)?.troops.find(t=>t.troopType===(c.troopType??s.officers[c.officerId]?.troopType));
    return {troopCount:c.troopCount??option?.troopCountRange?.max};
  }
  if(c.type==='ATTACK_UNIT')return previewAttack(s,c.armyId,c.targetId);
  if(c.type==='ATTACK_CITY')return previewCityAttack(s,c.armyId,c.cityId);
  if(c.type==='USE_TROOP_Q')return previewTroopQ(s,c.armyId,c.targetTileId);
  if(c.type==='USE_TACTIC')return previewTactic(s,c.armyId,c.traitId,c.targetId);
  return null;
}
const numeric = p => Object.fromEntries(['enemyLoss','allyLoss','dealt','troopCount'].filter(k=>Number.isFinite(p?.[k])).map(k=>[k,p[k]]));
/** Compare totals AND per-target casualties; probability/status changes are not exact forecasts. */
export function compareForecast(predicted, actual){
  if(!predicted)return null;
  const expected=numeric(predicted), observed=numeric(actual), differences=[];
  // Effect-only previews promise no exact casualty total.
  for(const [k,n] of Object.entries(expected))if(observed[k]!==n)differences.push(`${k}: ${n} → ${observed[k]??'기록 없음'}`);
  const targets=[];
  // Multi-hit tactics may contain several rows for one unit. Compare each unit's sum.
  const losses=units=>{const sums={};for(const u of units??[])if(Number.isFinite(u.casualties))sums[u.unitId]=(sums[u.unitId]??0)+u.casualties;return sums;};
  const predictedTargets=losses(predicted.units),actualTargets=losses(actual?.units);
  if(Object.keys(predictedTargets).length)for(const unitId of new Set([...Object.keys(predictedTargets),...Object.keys(actualTargets)])){
    const expected=predictedTargets[unitId]??0,observed=actualTargets[unitId]??null;
    targets.push({unitId,expected,actual:observed});if(expected!==observed)differences.push(`${unitId}: ${expected} → ${observed??'기록 없음'}`);
  }
  return {expected,actual:observed,targets,differences,mismatch:differences.length>0,comparable:Object.keys(expected).length>0||targets.length>0};
}

/** HUD values use the same public sums as the world resource band. */
export function summary(s){
  const v=view(s), cities=Object.values(v.ownCities), armies=Object.values(v.ownArmies);
  return {turn:v.turn,phase:s.phase,faction:v.faction.name,result:v.gameResult??null,
    resources:{food:Math.round(cities.reduce((n,c)=>n+c.foodStock,0)),foodCapacity:Math.round(cities.reduce((n,c)=>n+c.foodCapacity,0)),production:Math.round(cities.reduce((n,c)=>n+(c.production??0),0)),science:v.research?.science??v.faction.science,scienceThreshold:v.research?.nextThreshold??null,prestige:v.faction.prestige,troops:armies.reduce((n,a)=>n+a.troopCount,0),reserve:Math.round(cities.reduce((n,c)=>n+c.reserveTroops,0)),output:Object.fromEntries(['food','production','science','prestige'].map(k=>[k,cities.reduce((n,c)=>n+(c.economyForecast?.[k]??0),0)]))},
    cities:cities.map(c=>{const j=c.jobs?.find(j=>j.kind===c.currentProduction?.kind),e=j?.estimate;return {id:c.cityId,name:c.name,tile:c.tileId,durability:c.durability,max:c.durabilityMax,garrison:armies.filter(a=>a.tileId===c.tileId).reduce((n,a)=>n+a.troopCount,0),reserve:c.reserveTroops,production:c.currentProduction,turnsLeft:e?(e.gain>0?Math.max(1,Math.ceil((e.cost-e.progress-e.advance)/e.gain)):null):null};}),
    armies:armies.map(a=>({id:a.armyId,tile:a.tileId,troopType:a.troopDisplayName??a.troopType,troops:a.troopCount,morale:a.morale,formation:a.formation,facing:a.facing,status:a.status??[],supply:a.supply,ended:armyActionEnded(s,a.armyId),tactics:campaignTactics(s,a.armyId).map(t=>({id:t.traitId,name:t.name,ready:t.canUse,reason:t.reasonText,...(t.slot?{slot:t.slot,gauge:t.gauge,gaugeCost:t.gaugeCost}:{cooldown:Math.max(0,(s.armies[a.armyId].tacticReadyTurns?.[t.traitId]??0)-s.turn)})}))})),
    enemies:Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE'),
    todo:[v.pendingEvent?`사건 ${v.pendingEvent.title}`:null,pendingCampaignDraft(s)?'성장 카드 선택':null,v.exploration?.pending?'탐험 선택':null,v.council?.status==='OPEN'?'군의':null,s.orderQueue?.length?'예약 이동 실행':null,`${armies.filter(a=>!armyActionEnded(s,a.armyId)).length}부대 행동 남음`].filter(Boolean),
    recent:[...(s.administrationLog??[]).filter(e=>e.factionId===v.factionId).map(e=>({turn:e.turn,text:e.text})),...(s.combatLog??[]).filter(e=>s.armies[e.attackerId]?.factionId===v.factionId||(e.units??[]).some(u=>s.armies[u.unitId]?.factionId===v.factionId)).map(e=>({turn:e.turn,text:`${e.kind} ${e.attackerId} → ${e.targetId??e.cityId??''}: 적 −${e.enemyLoss??0} / 아군 −${e.allyLoss??0}`}))].sort((a,b)=>a.turn-b.turn).slice(-10).map(e=>e.text)};
}
export function formatSummary(s){const x=summary(s);return [`${x.faction} · ${x.turn}차례 · ${x.phase}${x.result?' · '+JSON.stringify(x.result):''}`,'자원 '+JSON.stringify(x.resources),'내 성\n'+x.cities.map(c=>JSON.stringify(c)).join('\n'),'내 부대\n'+x.armies.map(a=>JSON.stringify(a)).join('\n'),'보이는 적\n'+x.enemies.map(a=>JSON.stringify(a)).join('\n'),'할 일: '+x.todo.join(' · '),'최근 기록\n'+x.recent.join('\n')].join('\n\n');}
export function formatAction(a){return `${a.number}. ${a.label}${a.forecast?' | 예고 '+JSON.stringify(a.forecast):''}`;}
export function formatResult(r){if(!r.ok)return r.error;const c=r.comparison;return c?`${c.comparable?(c.mismatch?'[불일치]':'[일치]'):'[수치 비교 불가]'} 예고 ${JSON.stringify(c.expected)} → 실제 ${JSON.stringify(c.actual)}${c.targets.length?' / 대상별 '+JSON.stringify(c.targets):''}${c.differences.length?' / '+c.differences.join(' · '):''}`:'실행됨';}
export function parseCommand(input, actions=[]){
  const t=String(input).trim();if(/^\d+$/.test(t)){const a=actions.find(a=>a.number===Number(t));if(!a)throw new Error('행동 번호가 없습니다.');return copy(a.command);}
  if(t.startsWith('{'))return JSON.parse(t);
  const [verb,a,b,c,d]=t.split(/\s+/);
  const alias={이동:{type:'MOVE_UNIT',armyId:a,destinationTileId:b},공격:{type:'ATTACK_UNIT',armyId:a,targetId:b},성공격:{type:'ATTACK_CITY',armyId:a,cityId:b},전법:{type:'USE_TACTIC',armyId:a,traitId:b,targetId:c},생산:{type:'CITY_JOB',cityId:a,kind:b},출진:{type:'SORTIE',cityId:a,officerId:b,troopType:c,...(d===undefined?{}:{troopCount:Number(d)/TROOP_DISPLAY_SCALE})},사건:{type:'EVENT_CHOICE',eventId:a,choiceId:b},방어:{type:'BRACE',armyId:a},재정비:{type:'REGROUP',armyId:a},대기:{type:'WAIT_UNIT',armyId:a},다음:{type:'END_TURN',incremental:true},상대:{type:'ADVANCE_AI'}};
  if(!alias[verb])throw new Error('번호, 짧은 명령 또는 엔진 JSON 명령을 입력하십시오.');return alias[verb];
}

export class Harness {
  /** @param {any} [options] */
  constructor(options={}){
    this.options={factionId:'F01',seed:190919,skipDraft:false,...options};
    this.officerDraft=this.options.skipDraft?null:createOfficerDraft({factionId:this.options.factionId,seed:this.options.seed});
    /** @type {any} */ this.state=null;
    /** @type {any[]} */ this.history=[];
    this.stats=Object.fromEntries(FEATURE_NAMES.map(n=>[n,0]));
    /** @type {Record<string,number>} */ this.details={};
    if(!this.officerDraft)this.start();
  }
  start(){const companions=this.officerDraft?officerDraftCompanions(this.officerDraft):undefined;this.state=createCampaign({factionId:this.options.factionId,seed:this.options.seed,manualEndTurn:true,fieldArmies:false,...(companions?{companions}:{})});this.officerDraft=null;this.history.push({kind:'START',options:this.options,...(companions?{companions}:{})});}
  draftView(){return this.officerDraft?officerDraftView(this.officerDraft):null;}
  actions(options={}){
    if(!this.state)return [];
    const actions=listActions(this.state,options);
    for(const issue of actionCatalogProblems(this.state))if(!this.history.some(r=>r.kind==='CATALOG_PROBLEM'&&JSON.stringify(r.issue)===JSON.stringify(issue)))this.history.push({kind:'CATALOG_PROBLEM',issue:copy(issue)});
    return actions;
  }
  execute(input,options={}){
    let command;
    const before=this.state;
    try{
      if(!before)throw new Error('장수 드래프트를 먼저 확정하십시오.');
      command=typeof input==='string'?parseCommand(input,this.actions(options)):copy(input);
      const prediction=forecastFor(before,command), next=step(before,command);
      const logs=(next.combatLog??[]).filter(e=>e.sequence>(before.battleSequence??0)&&(before.armies[e.attackerId]?.factionId===before.playerFactionId||(e.units??[]).some(u=>before.armies[u.unitId]?.factionId===before.playerFactionId)));
      const matches=e=>e?.sequence>(before.battleSequence??0)&&e.attackerId===command.armyId&&(command.type==='USE_TROOP_Q'?e.kind==='Q':command.type==='ATTACK_CITY'?e.cityId===command.cityId:e.targetId===command.targetId);
      const actual=command.type==='SORTIE'?{troopCount:Object.values(next.armies).find(a=>a.commanderId===command.officerId&&!before.armies[a.armyId])?.troopCount}:matches(next.lastCombat)?next.lastCombat:logs.find(matches)??null;
      const comparison=compareForecast(prediction,actual);
      const row={kind:'COMMAND',turn:before.turn,command,ok:true,comparison,combats:logs};
      this.state=next;this.history.push(row);
      const f=feature(command);if(f)this.stats[f]++;
      if(command.type==='USE_TROOP_Q'){this.stats['공격']++;this.details['병종 Q']=(this.details['병종 Q']??0)+1;}
      if(['SORTIE','USE_TACTIC','CITY_JOB','DIPLO_PROPOSE','DIPLO_GIFT','DIPLO_RESPOND'].includes(command.type)){
        const replyKind=command.type==='DIPLO_RESPOND'?view(before).diplomacy?.incoming.find(p=>p.proposalId===command.proposalId)?.kind:null;
        const key=command.type==='SORTIE'?`출진:${command.troopType??next.officers[command.officerId].troopType}:${actual.troopCount}`:command.type==='USE_TACTIC'?`전법:${campaignTactics(before,command.armyId).find(t=>t.traitId===command.traitId)?.name??command.traitId}`:command.type==='CITY_JOB'?`생산:${command.kind}`:command.type==='DIPLO_RESPOND'?`외교:응답:${replyKind??'UNKNOWN'}:${command.accept?'수락':'거절'}`:`외교:${command.kind??command.type}`;
        this.details[key]=(this.details[key]??0)+1;
      }
      return row;
    }catch(e){const row={kind:'COMMAND',turn:before?.turn,command:command??input,ok:false,error:message(e)};this.history.push(row);return row;}
  }
  save({record=true}={}){if(!this.state)throw new Error('진행 중인 판이 없습니다.');if(record)this.stats['저장']++;return JSON.stringify({format:'C172-HARNESS',version:1,options:this.options,campaign:serialize(this.state),history:this.history,stats:this.stats,details:this.details});}
  load(text,{record=true}={}){
    const p=JSON.parse(text);if(p.format!=='C172-HARNESS'||p.version!==1)throw new Error('INVALID_HARNESS_SAVE');
    if(!p.options||!Array.isArray(p.history)||!p.stats||FEATURE_NAMES.some(k=>!Number.isFinite(p.stats[k])||p.stats[k]<0)||!p.details||typeof p.details!=='object'||Array.isArray(p.details)||Object.values(p.details).some(n=>!Number.isFinite(n)||n<0))throw new Error('INVALID_HARNESS_SAVE');
    // Validate the engine save before replacing the current session.
    const state=deserialize(p.campaign);if(state.playerFactionId!==p.options.factionId)throw new Error('INVALID_HARNESS_SAVE');
    this.state=state;this.options=p.options;this.history=p.history;this.stats=p.stats;this.details=p.details;this.officerDraft=null;if(record)this.stats['불러오기']++;
  }
  transcript(){return this.history.map(r=>JSON.stringify(r)+(r.comparison?'\n'+formatResult(r):'')).join('\n')+'\n\n'+(this.state?formatSummary(this.state):'드래프트 중');}
}
