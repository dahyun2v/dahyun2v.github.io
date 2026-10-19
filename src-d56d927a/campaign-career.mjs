import {c33Eligible} from './campaign-rule-registry.mjs';
import {c29BindingTargets,c29Hidden} from './campaign-c29.mjs';
import {createRng} from './rng.mjs';
import {hexDistance} from './map-primitives.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {combatTraitActive} from './campaign-rule-registry.mjs';
import {syncPoolFingerprint} from './campaign-growth.mjs';
import career from '../../docs/design-data/officer-pack/career-titles-v0.3.json' with {type:'json'};
import {CAMPAIGN_RULES} from './campaign-effects.mjs';
import {campaignRuleRegistered} from './campaign-rule-registry.mjs';
export {career as CAREER_DATA};
export const C25=Object.freeze({outputCap:10,facilityXp:10,securityXp:10,recruitXp:15,eventXp:10,occupationXp:20,lossRate:.5,lossCap:30,survivalXp:20,survivalRatio:.3,titleWeight:2,tacticWeight:1.5});
export const c25Enabled=s=>['v2','v3'].includes(s.mapId);
export function initializeCareer(r){
 r.trace??={};for(const k of career.traceKeys.filter(k=>!k.includes('<')))r.trace[k]??=0;
 r.titles??=[];r.traceEvents??={};r.levelSources??={};r.lossXpByTurn??={};r.careerXpTotals??={};
}
const ruleMet=(rule,trace)=>rule.split(/\s*&&\s*/).every(part=>{
 const [sum,threshold]=part.split('>=');return sum.trim().split('+').reduce((n,k)=>n+(trace[k.trim()]??0),0)>=Number(threshold);
});
export function awardCareerTitles(s,id){
 if(!c25Enabled(s))return;const r=s.campaignGrowth.officers[id];initializeCareer(r);
 for(const title of career.titles){
  const opponents=title.perOpponent?Object.keys(r.trace).filter(k=>k.startsWith('foughtBy:')&&r.trace[k]>=Number(title.rule.split('>=')[1])).map(k=>k.slice(9)):[null];
  for(const opponentId of opponents){
   const key=opponentId?`${title.id}:${opponentId}`:title.id;
   if(r.titles.some(t=>t.key===key)||!title.perOpponent&&!ruleMet(title.rule,r.trace))continue;
   const name=title.name.replace('{상대}',s.officers[opponentId]?.name??opponentId);
   r.titles.push({key,id:title.id,name,turn:s.turn,text:title.text,...(opponentId?{opponentId}:{})});
   s.campaignGrowth.log.push({turn:s.turn,officerId:id,titleId:title.id,text:`${s.officers[id].name} — 칭호 「${name}」(${title.text})`});
  }
 }
}
export function recordCareer(s,id,eventId,counts){
 if(!c25Enabled(s)||!id)return false;const r=s.campaignGrowth?.officers[id];if(!r)return false;initializeCareer(r);
 const fingerprint=JSON.stringify(Object.fromEntries(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b))));
 if(r.traceEvents[eventId]){if(r.traceEvents[eventId]!==fingerprint)throw new Error('CONFLICTING_CAREER_EVENT');return false;}
 for(const [key,n] of Object.entries(counts))if(!Number.isSafeInteger(n)||n<0||!career.traceKeys.includes(key)&&!/^foughtBy:[^<>]+$/.test(key)&&!/^specialist:(artisan|official|scholar|logistician)$/.test(key)&&!/^occupation:(conciliation|military|plunder)$/.test(key))throw new Error('INVALID_CAREER_TRACE');
 r.traceEvents[eventId]=fingerprint;for(const [key,n] of Object.entries(counts))r.trace[key]=(r.trace[key]??0)+n;
 awardCareerTitles(s,id);return true;
}
export function careerCardReady(card){return !(card.effects??[]).some(e=>e.op==='RULE'&&!CAMPAIGN_RULES.includes(e.rule)&&!campaignRuleRegistered(e.rule));}
export function installCareerCards(r){
 initializeCareer(r);
 if(r.careerInstalledTitles===r.titles.length)return;
 r.careerInstalledTitles=r.titles.length;
 const add=(card,sourceText)=>{const traitId=`${r.pack.id}.career.${card.id}`;
  r.cards[traitId]??={...structuredClone(card),traitId,sourceText};
  if(!r.pool.traits.some(t=>t.traitId===traitId))r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag].flat().filter(Boolean),roleTags:[],experienceTags:[],domestic:!!card.domestic,...(card.title?{careerTitle:card.title}:{}),careerCard:true});
 };
 for(const card of career.titleCards){const t=r.titles.find(t=>t.id===card.title);if(t)add(card,`${t.name} — ${t.text}`);}
 for(const card of career.commonDomesticTraits)add(card,'공용 내정');
 for(const card of career.mythicDomestic)if(r.titles.filter(t=>career.titles.find(x=>x.id===t.id)?.kind==='CIVIL').length>=2&&card.requiresAnyTitle.some(id=>r.titles.some(t=>t.id===id)))add(card,'내정 성장');
}
export function careerPool(r,level,pool){
 const tags=new Set(r.titles.flatMap(t=>career.titles.find(x=>x.id===t.id)?.weightTags??[]));
 return {...pool,traits:pool.traits.filter(t=>!r.cards[t.traitId].domestic||level%5!==0).filter(t=>careerCardReady(r.cards[t.traitId])&&c33Eligible(r,r.cards[t.traitId])).filter(t=>{const c=r.cards[t.traitId];return !c.requiresAnyTitle||level>=10&&r.titles.filter(t=>career.titles.find(x=>x.id===t.id)?.kind==='CIVIL').length>=2&&c.requiresAnyTitle.some(id=>r.titles.some(t=>t.id===id));}).map(t=>{
  const c=r.cards[t.traitId],match=[c.classTag,c.tags,c.weightTags,...(c.effects??[]).flatMap(e=>[e.condition,e.op==='DEFENSE_MOD'?'DEFENSE':null,e.condition==='TARGET_CITY'?'SIEGE':null])].flat(2).some(tag=>tags.has(tag));
  return {...t,...(t.careerCard?{domestic:!!c.domestic}:{}),weightMultiplier:t.careerTitle?C25.titleWeight:c.kind==='tactic'&&match?C25.tacticWeight:1};
 })};
}
export function careerMetrics(s){
 const rs=Object.values(s.campaignGrowth.officers),titles=Object.fromEntries(career.titles.map(t=>[t.id,rs.reduce((n,r)=>n+(r.titles??[]).filter(x=>x.id===t.id).length,0)]));
 const xp=rs.flatMap(r=>Object.entries(r.careerXpTotals??{}).map(([kind,amount])=>({kind,amount})));
 const sum=list=>list.reduce((n,x)=>n+x.amount,0);
 return {titles,titleCardsSelected:s.c25TitleCardsSelected??0,civilXpRatio:sum(xp)?sum(xp.filter(x=>career.draftRule.civilSources.includes(x.kind)))/sum(xp):0};
}

export function validateCareer(s,id,r){
 const keyValid=k=>career.traceKeys.includes(k)&&!k.includes('<')||/^foughtBy:[^<>]+$/.test(k)&&!!s.officers[k.slice(9)]||/^specialist:(artisan|official|scholar|logistician)$/.test(k)||/^occupation:(conciliation|military|plunder)$/.test(k);
 const error=()=>{throw new Error('INVALID_CAMPAIGN_CAREER');};
 if(!r.trace||Object.entries(r.trace).some(([k,n])=>!keyValid(k)||!Number.isSafeInteger(n)||n<0)||!Array.isArray(r.titles)||new Set(r.titles.map(t=>t.key)).size!==r.titles.length)error();
 for(const t of r.titles){const def=career.titles.find(x=>x.id===t.id);if(!def||!Number.isSafeInteger(t.turn)||t.turn<1||t.turn>s.turn||typeof t.name!=='string'||t.text!==def.text||t.key!==(def.perOpponent?`${def.id}:${t.opponentId}`:def.id)||def.perOpponent&&!s.officers[t.opponentId])error();}
 for(const n of Object.values(r.levelSources??{}))if(!Number.isFinite(n)||n<0)error();
 for(const [turn,n] of Object.entries(r.lossXpByTurn??{}))if(!Number.isSafeInteger(Number(turn))||Number(turn)<1||!Number.isSafeInteger(n)||n<0||n>C25.lossCap)error();
 for(const n of Object.values(r.careerXpTotals??{}))if(!Number.isSafeInteger(n)||n<0)error();
}

// C28 read-only projection of counters-v0.1.json; no new browser route.
const counters={"schema":"counter-traits-v0.1","status":"TRIAL — Claude 2026-10-04. 사용자 \"다반영해\"(REF-COMPETITIVE 5번: 카운터 특기에 숙적 이름·'폭로') + 원래 기획 \"카운터 성격의 특기 전법이 생기기도\". 크게 진 직후 다음 레벨업에 1장 보장. 좁은 대응(면역 아님), 칸을 차지함, 이름에 가르쳐 준 장수. 수치 시험값. 레퍼런스: docs/work-integration/20261004/growth-narrative/REF-COMBAT.md(교훈 카드)·REF-COMPETITIVE.md(카운터 아이템).","trigger":"이 장수 부대가 패주하거나 한 전투에서 출진 병력의 40% 이상을 잃었을 때, 그 피해를 가장 많이 준 방식(아래 beatenBy)과 상대 장수를 기록 → 다음 레벨업 특기 Draft 의 공용 무작위 칸을 해당 카운터 카드로 바꿔 보장(이미 가졌으면 단계 강화 카드).","nameTemplate":"{rival}에게 배운 {name}","counters":[{"id":"CT-K01","beatenBy":"CHARGE","name":"창을 세우는 법","rarity":"RARE","classTag":"지휘","text":"기병 돌격으로 받는 피해 −20%, 돌격해 온 상대에게 반격 +15%.","effects":[{"op":"DEFENSE_MOD","when":"ON_DEFEND","target":"SELF","value":20,"duration":0,"condition":"ATTACKER_CHARGE"},{"op":"COUNTER_MOD","when":"ON_COUNTER","target":"SELF","value":15,"duration":0,"condition":"ATTACKER_CHARGE"}],"ref":"토탈워 창병 대돌격 / 오버워치 카운터 픽"},{"id":"CT-K02","beatenBy":"FLANK","name":"옆구리를 지킨다","rarity":"RARE","classTag":"지휘","text":"측면·후방으로 맞을 때 보너스 절반만 받는다.","effects":[{"op":"RULE","rule":"HALF_FLANK_TAKEN","params":{},"when":"PASSIVE","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"배틀 브라더스 언더독"},{"id":"CT-K03","beatenBy":"RANGED","name":"방패 지붕","rarity":"RARE","classTag":"지휘","text":"궁병·투석기 사격으로 받는 피해 −25%.","effects":[{"op":"DEFENSE_MOD","when":"ON_DEFEND","target":"SELF","value":25,"duration":0,"condition":"ATTACKER_RANGED"}],"ref":"로마 테스투도 / 롤 방어구"},{"id":"CT-K04","beatenBy":"TACTIC","name":"꺾이지 않는 뜻","rarity":"EPIC","classTag":"감화","text":"전투(차례)당 한 번, 적 전법의 통제 효과(이동 불가·혼란·밀기·도발)를 무시.","effects":[{"op":"RULE","rule":"TACTIC_WARD","params":{"uses":1},"when":"PASSIVE","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"도타 BKB"},{"id":"CT-K05","beatenBy":"AMBUSH","name":"척후의 눈","rarity":"UNCOMMON","classTag":"지략","text":"2칸 안 숨은 적(매복)을 드러내고, 시야 +1.","effects":[{"op":"RULE","rule":"SCOUT_EYE","params":{"range":2,"vision":1},"when":"PASSIVE","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"도타 MKB·와드"},{"id":"CT-K06","beatenBy":"FIRE","name":"젖은 가죽으로 불 막기","rarity":"UNCOMMON","classTag":"정무","text":"화계로 받는 피해 −50%, 불 칸에서 전열 판정 없음.","effects":[{"op":"RULE","rule":"FIRE_WARD","params":{"reduce":50},"when":"PASSIVE","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"교훈 카드(화공 대비)","formerName":"젖은 가죽"},{"id":"CT-K07","beatenBy":"FORTIFIED","name":"돌파구","rarity":"RARE","classTag":"무용","text":"방어 태세·성 안 수비 부대를 공격할 때 그 방어 보너스의 절반을 무시.","effects":[{"op":"RULE","rule":"BREACH_GUARD","params":{"ratio":50},"when":"ON_ATTACK","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"롤 도미닉 경의 인사"},{"id":"CT-K08","beatenBy":"RECOVERY","name":"보급을 끊는다","rarity":"UNCOMMON","classTag":"지략","text":"맞닿은 적 부대의 부상병 복귀·재정비 회복 절반.","effects":[{"op":"RULE","rule":"CUT_SUPPLY","params":{"ratio":50},"when":"PASSIVE","target":"ADJACENT_ENEMIES","value":0,"duration":0,"condition":null}],"ref":"롤 치유 감소(처형인의 검)"},{"id":"CT-K09","beatenBy":"MYTHIC","name":"특기 봉쇄","rarity":"LEGENDARY","classTag":"지략","text":"공격 대상의 특기를 1차례 동안 멈춘다(신화 포함, 판당 2회). 대가: 그 공격 피해 −20%.","effects":[{"op":"RULE","rule":"EXPOSE","params":{"uses":2,"penalty":20},"when":"ON_ATTACK","target":"TARGET","value":0,"duration":0,"condition":null}],"cost":"그 공격 피해 −20%","ref":"도타 실버 엣지(패시브 정지) — Crisis 보스 대응","formerName":"폭로"},{"id":"CT-K10","beatenBy":"MORALE","name":"차분한 머리","rarity":"RARE","classTag":"감화","text":"사기 판정(가중) −30%, 도발에 걸리지 않는다.","effects":[{"op":"RULE","rule":"COOL_HEAD","params":{"reduce":30},"when":"PASSIVE","target":"SELF","value":0,"duration":0,"condition":null}],"ref":"교훈 카드(도발·공포 대비)","formerName":"냉정"}],"beatenByRules":{"CHARGE":"그 피해가 기병 돌격","FLANK":"측면·후방 공격","RANGED":"궁병·투석기 사격","TACTIC":"적 전법(피해형 또는 통제형)","AMBUSH":"매복(숨은 상태에서 첫 공격)","FIRE":"화계","FORTIFIED":"방어 태세·성 안 수비 부대를 공격하다 반격으로","RECOVERY":"상대가 회복(부상병 복귀·재정비)하며 버텨 진 전투(상대 회복량 50 이상)","MYTHIC":"상대 장수가 신화 특기를 가짐(다른 조건보다 우선)","MORALE":"사기 판정 실패로 패주"},"newConditions":{"ATTACKER_CHARGE":"공격자가 기병 돌격","ATTACKER_RANGED":"공격자가 원거리(궁병·투석기)"}};
export const C28_COUNTER_DATA=counters;
// C28 trial values and deterministic narrative growth; v1 remains unchanged.
export const C28=Object.freeze({lossRatio:.4,tacticHits:3,influenceReroll:85,lateLevel:15,rankMax:5,slots:5,revengeDamage:5,conquerorDamage:8,virtueTurns:3,woundThreshold:.9,exposeUses:2,exposePenalty:20,flankRatio:.5,fireReduce:.5,recoveryRatio:.5,breachRatio:.5,coolHeadRatio:.7,scoutRange:2,scoutVision:1,learningRareLevel:5,learningEpicLevel:10,recoveryTrigger:50,civilPriority:.5,baseRerolls:1});
export const C28_RULES=Object.freeze(counters.counters.flatMap(c=>c.effects.filter(e=>e.op==='RULE').map(e=>e.rule)));
export const c28Enabled=s=>['v2','v3'].includes(s.mapId);
export const c28Record=(s,id)=>s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];
export function initializeC28(r){r.c28??={events:{},pending:[],tacticHits:{},learnedTactics:[],missedTitles:[],relations:{},exposeUsed:0};return r.c28;}
export function c28Suppressed(s,id){return !c29Hidden(s,id)&&c28Enabled(s)&&(c28Record(s,id)?.c28?.suppressedUntil??0)>=s.turn;}
export function c28Rule(s,id,rule){
 if(!c28Enabled(s)||c28Suppressed(s,id))return null;const r=c28Record(s,id);if(!r)return null;
 const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks;
 return Object.entries(ranks).sort(([a],[b])=>a.localeCompare(b)).filter(([key])=>combatTraitActive(r,key)).map(([key,rank])=>({card:r.cards[key],rank})).filter(x=>x.card?.kind==='trait').flatMap(x=>(x.card.effects??[]).filter(e=>e.rule===rule).map(e=>({...x,e,params:e.params??{}})))[0]??null;
}
export function c28AddCard(r,card,sourceText){
 const traitId=`${r.pack.id}.c28.${card.id??card.traitId}`;
 r.cards[traitId]??={...structuredClone(card),traitId,sourceText,core:false};
 const changed=!r.pool.traits.some(t=>t.traitId===traitId);if(changed)r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:card.rarity,rankMax:C28.rankMax,stageTags:['EARLY','MID','LATE'],affinityTags:[card.classTag].flat().filter(Boolean),roleTags:[],experienceTags:[],c28:true});
 if(changed&&r.track)syncPoolFingerprint(r);return traitId;
}
const tags=c=>[c.classTag].flat().filter(Boolean);
export function c28Eligible(s,id,pool,level,ready){
 const r=c28Record(s,id),ranks=r.track.growthStates[id].ownedTraitRanks,a=Object.values(s.armies).find(a=>a.commanderId===id&&a.troopCount>0),titles=r.titles??[];
 return {...pool,traits:pool.traits.filter(t=>{const c=r.cards[t.traitId];
  if(c.modifier&&!c29BindingTargets(s,id,c).length)return false;
  if((ranks[t.traitId]??0)>=C28.rankMax||!ready(c))return false;
  if((c.effects??[]).some(e=>e.condition?.startsWith('TROOP:')&&(!a||e.condition.slice(6)!==troopToCampaign(a.troopType))))return false;
  if((c.effects??[]).some(e=>e.tacticId&&!(r.equippedTacticIds??[]).includes(e.tacticId)))return false;
  if(c.kind==='tactic'&&ranks[t.traitId]&&!(r.equippedTacticIds??[]).includes(t.traitId))return false;
  if(c.traitId!==r.representativeId&&c.traitId!==r.coreId&&!c.title&&!c.domestic&&!t.c28&&['LEGENDARY','MYTHIC'].includes(c.rarity)){
   const matching=titles.filter(title=>tags(c).some(tag=>(career.titles.find(x=>x.id===title.id)?.weightTags??[]).includes(tag))).length;
   if(matching<(c.rarity==='MYTHIC'?2:1))return false;
  }
  return true;
 })};
}
export function composeC28Draft(s,id,draft){
 if(!c28Enabled(s)||draft.state!=='OFFERED')return draft;
 const r=c28Record(s,id),x=initializeC28(r),ranks=r.track.growthStates[id].ownedTraitRanks,level=draft.contextSnapshot.levelAfter,kind=level%5===0?'tactic':'trait';
 const domestic=kind==='trait'&&draft.contextSnapshot.civilRatio>=C28.civilPriority;
 const branch=draft.eligibleCandidateSnapshot.filter(t=>!!r.cards[t.traitId].domestic===domestic);
 // Preserve C25's combat fallback only when no legal domestic candidate exists.
 const all=branch.length?branch:draft.eligibleCandidateSnapshot.filter(t=>!r.cards[t.traitId].domestic);
 const rng=createRng(draft.drawState.after),used=new Set();let reserved=null;
 const publicCards=all.filter(t=>!r.cards[t.traitId].title&&!r.cards[t.traitId].requiresAnyTitle&&t.traitId!==r.coreId);
 const choose=list=>{const legal=list.filter(t=>!used.has(t.traitId)&&t.traitId!==reserved);if(!legal.length)return null;let roll=rng.next()*legal.reduce((n,t)=>n+(t.weight??1),0);const t=legal.find(t=>(roll-=t.weight??1)<0)??legal.at(-1);used.add(t.traitId);return structuredClone(t);};
 let title=kind==='tactic'?all.filter(t=>tags(r.cards[t.traitId]).some(tag=>(r.titles??[]).some(title=>(career.titles.find(x=>x.id===title.id)?.weightTags??[]).includes(tag)))):all.filter(t=>r.cards[t.traitId].title);
 if(level>=C28.lateLevel){const missed=title.filter(t=>x.missedTitles.includes(t.traitId));if(missed.length)title=missed;}
 const upgrade=all.filter(t=>ranks[t.traitId]>0&&ranks[t.traitId]<C28.rankMax);
 const pending=[...x.pending].sort((a,b)=>Number(b.slot==='교훈')-Number(a.slot==='교훈')).find(p=>all.some(t=>t.traitId===p.traitId));
 if(pending){title=title.filter(t=>t.traitId!==pending.traitId);}
 reserved=pending?.traitId??null;
 const pools=[title.length?title:publicCards,upgrade.length?upgrade:publicCards,publicCards];
 for(let n=0;n<Number(!!draft.ruleDoubleDraft)+(draft.c26Extra??0);n++)pools.push(publicCards);
 const offered=pools.map((list,i)=>{
  const t=i===2&&pending&&!used.has(pending.traitId)?(used.add(pending.traitId),structuredClone(r.pool.traits.find(t=>t.traitId===pending.traitId))):choose(list)??choose(publicCards);
  if(!t)return null;
  t.slot=i===0&&title.length?'칭호':i===1&&upgrade.length?'강화':i===2&&pending?pending.slot:'공용';
  t.sourceText=i===2&&pending?pending.sourceText:r.cards[t.traitId].sourceText??(t.slot==='강화'?'이미 가진 카드 강화':'공용');
  t.rerollsRemaining=C28.baseRerolls+Number(!!draft.ruleDoubleDraft);t.replace=kind==='trait'&&!ranks[t.traitId]&&Object.keys(ranks).filter(k=>r.cards[k]?.kind==='trait').length>=C28.slots;
  return t;
 }).filter(Boolean);
 if(!x.events[`draft.${draft.draftId}`]){x.events[`draft.${draft.draftId}`]=true;s.c28Stats??={learning:0,lessons:0,virtues:0,wounds:0};for(const t of offered)if(['배움','교훈'].includes(t.slot)){const key=t.slot==='배움'?'learningOffers':'lessonOffers';s.c28Stats[key]=(s.c28Stats[key]??0)+1;}}
 draft.offered=offered;draft.offeredIds=offered.map(t=>t.traitId);draft.c28={slotPools:pools.map(list=>list.map(t=>t.traitId)),bonusRerolls:(s.officers[id].baseStats.charisma??0)>=C28.influenceReroll?1:0};
 draft.rerollLimit=offered.reduce((n,t)=>n+t.rerollsRemaining,0)+draft.c28.bonusRerolls;draft.drawState.after=rng.state();draft.drawState.consumed+=offered.length;
 return draft;
}
export function rerollC28Draft(s,id,draft,traitId){
 const r=c28Record(s,id),i=draft.offeredIds.indexOf(traitId);if(i<0)throw new Error('REROLL_CARD_REQUIRED');
 const old=draft.offered[i];if(!old.rerollsRemaining&&!draft.c28.bonusRerolls)throw new Error('REROLL_LIMIT_REACHED');
 const alternatives=draft.c28.slotPools[i].filter(k=>!draft.offeredIds.includes(k));if(!alternatives.length)throw new Error('REROLL_NO_ALTERNATIVES');
 const rng=createRng(draft.drawState.after);let roll=rng.next()*alternatives.length;const key=alternatives.find(k=>(roll-=1)<0)??alternatives.at(-1),card=structuredClone(draft.eligibleCandidateSnapshot.find(t=>t.traitId===key));
 if(!card)throw new Error('REROLL_NO_ALTERNATIVES');
 (draft.offerHistory??=[]).push({offerRevision:draft.offerRevision,offered:structuredClone(draft.offered),drawState:structuredClone(draft.drawState)});
 if(old.rerollsRemaining)old.rerollsRemaining--;else draft.c28.bonusRerolls--;
 Object.assign(card,{slot:old.slot,sourceText:r.cards[key].sourceText??(old.slot==='강화'?'이미 가진 카드 강화':'공용'),rerollsRemaining:old.rerollsRemaining,replace:old.replace});
 draft.offered[i]=card;draft.offeredIds[i]=key;draft.rerollCount++;draft.offerRevision++;draft.drawState.after=rng.state();draft.drawState.consumed++;
 return draft;
}
export function selectedC28(s,id,draft,key){
 if(!c28Enabled(s))return;const r=c28Record(s,id),x=initializeC28(r);
 for(const t of [...draft.offered,...(draft.offerHistory??[]).flatMap(h=>h.offered)])if(t.slot==='칭호'&&t.traitId!==key&&!x.missedTitles.includes(t.traitId))x.missedTitles.push(t.traitId);
 x.missedTitles=x.missedTitles.filter(k=>k!==key);x.pending=x.pending.filter(p=>p.traitId!==key);
 const slot=draft.offered.find(t=>t.traitId===key)?.slot;if(['배움','교훈'].includes(slot)){s.c28Stats??={learning:0,lessons:0,virtues:0,wounds:0};s.c28Stats[slot==='배움'?'learning':'lessons']++;}
}
export function queueC28(r,key,slot,sourceText){if((r.track.growthStates[r.pack.id].ownedTraitRanks[key]??0)>=C28.rankMax)return;const x=initializeC28(r);if(!x.pending.some(p=>p.traitId===key))x.pending.push({traitId:key,slot,sourceText});}
export function c28BeatenBy(s,c,victim,opponent){
 const r=c28Record(s,opponent);if(Object.entries(r?.track.growthStates[r.pack.id].ownedTraitRanks??{}).some(([k,n])=>n&&r.cards[k]?.kind==='trait'&&r.cards[k]?.rarity==='MYTHIC'))return 'MYTHIC';
 if((c.moraleChanges??[]).some(e=>e.armyId===victim&&e.to==='ROUTING'))return 'MORALE';
 if(c.beatenBy)return c.beatenBy;
 if((s.armies[opponent]?.c28Recovered??0)>=C28.recoveryTrigger)return 'RECOVERY';
 if(c.fire)return 'FIRE';if(c.ambush)return 'AMBUSH';
 if(victim===c.attackerId&&(s.armies[opponent]?.braced||Object.values(s.cities??{}).some(city=>city.tileId===s.armies[opponent]?.tileId)))return 'FORTIFIED';
 if(c.tacticId||c.kind?.startsWith('TACTIC'))return 'TACTIC';
 if(c.charge&&victim===c.targetId)return 'CHARGE';if(['FLANK','REAR'].includes(c.side)&&victim===c.targetId)return 'FLANK';
 if(['BT03','BT05'].includes(troopToCampaign(s.armies[opponent]?.troopType))||s.armies[opponent]?.troopType==='catapult')return 'RANGED';return null;
}
export function learnC28(s,id,opponentId,{tactic=null,ignoreCap=false}={}){
 const r=c28Record(s,id),other=c28Record(s,opponentId);if(!r||!other)return;
 const level=r.track.growthStates[id].level,limit=level<C28.learningRareLevel?'RARE':level<C28.learningEpicLevel?'EPIC':'LEGENDARY',grades=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'];
 const ranks=other.track.growthStates[opponentId].ownedTraitRanks;
 const transferable=c=>c&&c.traitId!==other.coreId&&c.traitId!==other.representativeId&&!c.core&&!tags(c).includes('고유')&&!(c.effects??[]).some(e=>e.rule?.startsWith('U_'))&&grades.includes(c.rarity)&&(ignoreCap||grades.indexOf(c.rarity)<=grades.indexOf(limit));
 const cards=(tactic?[tactic]:Object.entries(ranks).filter(([,n])=>n>0).map(([key])=>other.cards[key])).filter(transferable).sort((a,b)=>a.traitId.localeCompare(b.traitId));
 if(!cards.length)return;const card=cards[0],sourceText=`${s.officers[opponentId].name}에게서 배움`,key=c28AddCard(r,{...card,id:`learn.${opponentId}.${card.id??card.traitId}`},sourceText);
 queueC28(r,key,'배움',sourceText);if(tactic&&!initializeC28(r).learnedTactics.includes(key))r.c28.learnedTactics.push(key);
}
export function recordC28Tactic(s,id,target,card,eventId){
 if(!c28Enabled(s)||!s.armies[target]||s.armies[id].factionId===s.armies[target].factionId||s.armies[target].troopCount<=0)return;
 const who=s.armies[target].commanderId,r=c28Record(s,who),x=initializeC28(r),key=`hit.${eventId}`;if(x.events[key])return;x.events[key]=true;
 x.tacticHits[card.traitId]=(x.tacticHits[card.traitId]??0)+1;
 if(x.tacticHits[card.traitId]===C28.tacticHits)learnC28(s,who,s.armies[id].commanderId,{tactic:card,ignoreCap:true});
}
export function recordC28Combat(s,c){
 if(!c28Enabled(s)||!s.armies[c.attackerId])return;
 const target=s.armies[c.targetId]?.armyId??Object.values(s.armies).find(a=>a.tileId===c.targetId&&a.factionId!==s.armies[c.attackerId].factionId)?.armyId;
 if(!target)return;c={...c,targetId:target};
 for(const victim of new Set([c.attackerId,c.targetId,...(c.units??[]).map(u=>u.unitId)])){
  const opponent=victim===c.attackerId?c.targetId:c.attackerId,a=s.armies[victim],b=s.armies[opponent];if(!a||!b)continue;if(a.factionId===b.factionId)continue;
  const r=c28Record(s,a.commanderId),x=initializeC28(r),event=`combat.${c.sequence}.${victim}`;if(x.events[event])continue;x.events[event]=true;
  const hits=(c.units??[]).filter(u=>u.unitId===victim),u=hits.length?{...hits[0],postBattleCount:hits.at(-1).postBattleCount,casualties:hits.reduce((n,u)=>n+u.casualties,0)}:null,routed=(c.moraleChanges??[]).some(e=>e.armyId===victim&&e.to==='ROUTING'&&e.from!=='ROUTING'),lost=routed||u?.postBattleCount===0||s.officers[a.commanderId].captivityState==='CAPTURED';
  if(routed||(u?.casualties??0)>=(a.deploymentStrength??s.personnel?.formations.find(f=>f.formationId===victim)?.targetStrength??u?.preBattleCount??Infinity)*C28.lossRatio){const way=c28BeatenBy(s,c,victim,opponent),card=counters.counters.find(t=>t.beatenBy===way);if(card){const sourceText=counters.nameTemplate.replace('{rival}',s.officers[b.commanderId].name).replace('{name}',card.name),key=c28AddCard(r,{...card,kind:'trait',name:sourceText},sourceText);r.cards[key].name=sourceText;r.cards[key].sourceText=sourceText;queueC28(r,key,'교훈',sourceText);}}
  if(routed&&(r.titles??[]).some(t=>t.opponentId===b.commanderId)){x.relations[b.commanderId]='원수';initializeC28(c28Record(s,b.commanderId)).relations[a.commanderId]='원수';}
  if(routed&&(u?.postBattleCount??a.troopCount)>0&&s.officers[a.commanderId].lifeState==='ALIVE'){
   let seed=Number(s.campaignSeed)>>>0;for(const ch of `C28:${a.commanderId}:${c.sequence}`)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
   const virtue=createRng(seed).next()<(s.officers[a.commanderId].baseStats.charisma??0)/100;
   x.survival=virtue?{name:'철의 의지',until:s.turn+C28.virtueTurns-1,uses:1}:{name:'겁먹음'};
   s.c28Stats??={learning:0,lessons:0,virtues:0,wounds:0};s.c28Stats[virtue?'virtues':'wounds']++;
   s.campaignGrowth.log.push({turn:s.turn,officerId:a.commanderId,text:`${s.officers[a.commanderId].name} — 생환: ${x.survival.name}`});
  }
  if(lost){learnC28(s,b.commanderId,a.commanderId);const winner=c28Record(s,b.commanderId),wx=initializeC28(winner);
   if(wx.relations[a.commanderId]==='원수'){
    const rivalName=s.officers[a.commanderId].name,particle=(rivalName.charCodeAt(rivalName.length-1)-0xac00)%28?'을':'를';
    const name=`${rivalName}${particle} 꺾은 자`,key=c28AddCard(winner,{id:`conqueror.${a.commanderId}`,kind:'trait',name,rarity:'EPIC',effects:[{op:'DAMAGE_MOD',when:'ON_ATTACK',target:'SELF',value:C28.conquerorDamage,condition:'TARGET_TITLED'}]},name),wr=winner.track.growthStates[b.commanderId].ownedTraitRanks;
    if(!wr[key]&&Object.keys(wr).filter(k=>winner.cards[k]?.kind==='trait').length<C28.slots)wr[key]=1;else if(!wr[key])queueC28(winner,key,'교훈',name);
   }
   if(wx.survival?.name==='겁먹음')delete wx.survival;
  }
 }
}
export function c28DamageBonus(s,id,target){if(s.armies[id]?.c34?.ignoreRelationsUntil>=s.turn)return 0;if(!c28Enabled(s)||!c28Record(s,id))return 0;return (c28Record(s,id).c28?.relations??{})[s.armies[target]?.commanderId]==='원수'?C28.revengeDamage:0;}
export function c28Expose(s,id,target,{commit=false}={}){
 const x=c28Rule(s,id,'EXPOSE'),r=c28Record(s,id),t=c28Record(s,target);if(!x||!t||(r.c28?.exposeUsed??0)>=C28.exposeUses)return false;
 if(commit){initializeC28(r).exposeUsed++;initializeC28(t).suppressedUntil=s.turn;s.armies[id].c28ExposeTurn=s.turn;}
 return true;
}
export function c28ControlGuard(s,id,status,{commit=true}={}){
 if(status==='TAUNT'&&c28Rule(s,id,'COOL_HEAD'))return true;
 if(!['ROOTED','CONFUSED','SHOVE','TAUNT'].includes(status)||!c28Rule(s,id,'TACTIC_WARD'))return false;
 const x=initializeC28(c28Record(s,id));if(x.wardTurn===s.turn)return false;if(commit)x.wardTurn=s.turn;return true;
}
export function c28RecoveryFactor(s,id){const a=s.armies[id];return c28Enabled(s)&&a&&Object.values(s.armies).some(b=>b.factionId!==a.factionId&&b.troopCount>0&&hexDistance(s.tiles[b.tileId],s.tiles[a.tileId])===1&&c28Rule(s,b.armyId,'CUT_SUPPLY'))?C28.recoveryRatio:1;}
export function c28Metrics(s){return {learningOffers:0,lessonOffers:0,...(s.c28Stats??{learning:0,lessons:0,virtues:0,wounds:0}),enemies:Object.values(s.campaignGrowth.officers).reduce((n,r)=>n+Object.values(r.c28?.relations??{}).filter(v=>v==='원수').length,0)/2};}

export function validateC28(s,id,r){
 if(!c28Enabled(s))return;const x=r.c28,fail=()=>{throw new Error('INVALID_CAMPAIGN_C28');};
 if(!x||!x.events||!x.relations||!Array.isArray(x.pending)||!Array.isArray(x.learnedTactics)||!Array.isArray(x.missedTitles)||!Number.isInteger(x.exposeUsed)||x.exposeUsed<0||x.exposeUsed>C28.exposeUses)fail();
 if(Object.values(x.events).some(v=>v!==true)||Object.entries(x.relations).some(([other,v])=>other===id||!s.officers[other]||v!=='원수'))fail();
 if(x.pending.some(p=>!r.cards[p.traitId]||!['배움','교훈'].includes(p.slot)||typeof p.sourceText!=='string')||new Set(x.pending.map(p=>p.traitId)).size!==x.pending.length)fail();
 if([...x.learnedTactics,...x.missedTitles].some(k=>!r.cards[k])||Object.values(x.tacticHits).some(n=>!Number.isSafeInteger(n)||n<0))fail();
 if(x.survival&&!['철의 의지','겁먹음'].includes(x.survival.name))fail();
}
