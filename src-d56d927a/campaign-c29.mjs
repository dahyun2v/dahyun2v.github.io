// C229 browser snapshot of tactic-gauge-v0.2.json; parity tested.
const gauge={"schema":"tactic-gauge-v0.2","status":"TRIAL — C229 게이지 비용과 충전 수치는 시험값. 기존 카드 효과와 문구 유지.","base":5,"dealt":10,"taken":10,"result":15,"periodCap":30,"storeMax":100,"cost":{"E":[40,60],"R":[80,100]}};
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {relationGaugeFactor} from './campaign-relations.mjs';
import {c34Strategy,configureC34Gauge} from './campaign-c34.mjs';
import data from '../../docs/design-data/officer-pack/bonds-v0.1.json' with {type:'json'};
import mods from '../../docs/design-data/officer-pack/tactic-mods-v0.1.json' with {type:'json'};
import awakening from '../../docs/design-data/officer-pack/awakening-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {createRng} from './rng.mjs';
import {xpToNextLevel} from './growth-progress.mjs';

export const C29_DATA=mods, C29_AWAKENING=awakening;
export const c29Enabled=s=>['v2','v3'].includes(s.mapId);
export const c29Record=(s,id)=>s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];
const ranks=r=>r.track.growthStates[r.pack.id].ownedTraitRanks;
const error=m=>{throw new Error(m);};
export function c29Add(r,c){
 const traitId=`${r.pack.id}.c29.${c.id}`;
 r.cards[traitId]??={...structuredClone(c),traitId,core:false};
 if(!r.pool.traits.some(t=>t.traitId===traitId))r.pool.traits.push({traitId,ownershipType:'PUBLIC',rarity:c.rarity??'RARE',rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[],roleTags:[],experienceTags:[],c28:true});
 return traitId;
}
export function initializeC29(s,id){
 if(!c29Enabled(s))return;configureC34Gauge(c29Cooldown);const r=c29Record(s,id);
 r.c29??={bindings:{},forks:{},awakenings:[],uses:{},gauge:0,crisisMultiplier:1,events:{}};
 for(const m of mods.modifiers)c29Add(r,{...m,kind:'trait',modifier:true,effects:[{op:'RULE',rule:m.rule,params:m.params,when:'PASSIVE',target:'SELF'}]});
 for(const c of mods.evolutions.extraTraits)c29Add(r,c);
 // The representative signature is learned from the start and occupies its own socket.
 r.equippedTacticIds=(r.equippedTacticIds??[]).filter(k=>k!==r.representativeId);
}
export function c29Tag(s,id,c,tag){
 if(c?.c33&&c.effects.some(e=>e.rule?.startsWith('FORMATION_')))return false;
 const a=Object.values(s.armies).find(a=>a.commanderId===(s.armies[id]?.commanderId??id));
 const damage=(c.effects??[]).some(e=>e.op==='DAMAGE_MOD'&&e.when==='ON_TACTIC_USE'||['DUAL_STRIKE','GALEFORCE'].includes(e.rule))||(c.effects??[]).some(e=>['U_TRIPLE_ASSAULT','U_NIGHT_RAID'].includes(e.rule));
 if(tag==='DAMAGE')return damage;
 if(tag==='FIRE')return c.id==='CTA-12'||(c.effects??[]).some(e=>e.rule?.includes('FIRE'));
 if(tag==='RANGE1+')return c.range>=1;
 if(tag==='CHARGE')return ['cavalry','BT02'].includes(a?.troopType)&&damage&&(c.range??1)<=1;
 if(tag==='CONTROL')return ['CTA-01','CTA-02','CTA-04','CTA-10'].includes(c.id);
 if(tag==='RALLY')return c.id==='CTA-05'||(c.effects??[]).some(e=>e.op==='MORALE_DELTA'&&e.value>0);
 return false;
}
export function c29BindingTargets(s,id,c){const r=c29Record(s,id);return (r.equippedTacticIds??[]).filter(k=>c29Tag(s,id,r.cards[k],c.targetTag)&&(!r.c29.bindings[k]||r.c29.bindings[k]===c.traitId));}
export function c29Bind(s,id,modifierId,tacticId,{paid=false}={}){
 const r=c29Record(s,id),c=r.cards[modifierId];
 if(!c?.modifier||!c29BindingTargets(s,id,c).includes(tacticId))error('INVALID_C29_BINDING');
 if(paid){if(!ranks(r)[modifierId])error('C29_MODIFIER_NOT_OWNED');const cost=xpToNextLevel(r.track.growthStates[r.pack.id].level);if(Math.max(r.totalXp,r.xp)<cost||(r.c29.xpDebt??0)>0)error('C29_REBIND_XP_REQUIRED');const paidNow=Math.min(r.xp,cost);r.xp-=paidNow;r.totalXp=Math.max(0,r.totalXp-cost);r.c29.xpDebt=cost-paidNow;}
 for(const [key,v] of Object.entries(r.c29.bindings))if(v===modifierId)delete r.c29.bindings[key];
 r.c29.bindings[tacticId]=modifierId;
}
export function c29EvolutionCandidates(s,id){
 const r=c29Record(s,id);if(!r?.c29)return [];
 return mods.evolutions.list.flatMap(e=>{
  if(!Object.entries(ranks(r)).some(([k,n])=>n&&[r.cards[k]?.id,k].includes(e.needsTrait)))return [];
  const from=(r.equippedTacticIds??[]).find(k=>ranks(r)[k]===5&&(e.from==='CHARGE'?c29Tag(s,id,r.cards[k],'CHARGE'):r.cards[k].id===e.from));
  if(!from)return [];const key=c29Add(r,{...r.cards[from],...e,id:e.id,kind:'tactic',rarity:'MYTHIC',evolution:true,evolutionFrom:from,commonBase:r.cards[from].id?.startsWith('CTA-')});return [key];
 });
}
const wildPool=r=>awakening.wild.pool.filter(c=>!r.c29.awakenings.some(a=>a.id===c.id));
function awakeningCard(r,c,branch,level){return c29Add(r,{...c,id:c.id??`AW-N-${c.titleId}`,kind:'awakening',rarity:'LEGENDARY',branch,awakenedLevel:level,effects:[]});}
function wild(r,rng,level,excluded=[]){const pool=wildPool(r).filter(c=>!excluded.includes(c.id));if(!pool.length)return null;return awakeningCard(r,pool[Math.floor(rng.next()*pool.length)],'wild',level);}
export function composeC29Draft(s,id,d){
 if(!c29Enabled(s))return d;const r=c29Record(s,id),level=d.contextSnapshot.levelAfter,rng=createRng(d.drawState.after);
 if(awakening.rule.levels.includes(level)&&r.c29.awakenings.length<awakening.rule.max){
  const narrative=awakening.narrative.byTitle.find(c=>c.titleId===r.titles?.at(-1)?.id);
  const keys=[awakeningCard(r,awakening.steady,'steady',level),narrative?awakeningCard(r,{...narrative,rule:`AW_${narrative.titleId}`},'narrative',level):wild(r,rng,level)];
  keys.push(wild(r,rng,level,keys.map(k=>r.cards[k]?.id)));
  if(r.c29.awakenings.some(a=>a.rule==='EXTRA_CHOICE')&&!r.c29.extraChoiceSpent)keys.push(wild(r,rng,level,keys.map(k=>r.cards[k]?.id)));
  d.c29={awakening:true,rerolled:false,extraChoice:keys.length>3};delete d.c28;
  d.offered=keys.filter(Boolean).map(k=>({...r.pool.traits.find(t=>t.traitId===k),slot:r.cards[k].branch,rerollsRemaining:r.cards[k].branch==='wild'?1:0}));
  d.eligibleCandidateSnapshot=structuredClone(d.offered);d.rerollLimit=1;
 }else{
  const ev=level%5===0?c29EvolutionCandidates(s,id):[];
  if(ev.length){const i=Math.min(2,d.offered.length-1),t=r.pool.traits.find(t=>t.traitId===ev[0]);d.offered[i]={...t,slot:'공용',rerollsRemaining:0};d.eligibleCandidateSnapshot.push(structuredClone(t));}
  const offered=[];
  for(const t of d.offered){const c=r.cards[t.traitId],fork=mods.forks.list.find(f=>f.tactic===c.id);
   if(c.kind==='tactic'&&ranks(r)[t.traitId]===1&&fork&&!r.c29.forks[t.traitId]){
    for(const branch of ['a','b']){const k=c29Add(r,{...c,id:`FORK-${c.id}-${branch}`,name:`${c.name} · ${fork[branch].name}`,text:fork[branch].text,kind:'fork',forkOf:t.traitId,branch});const row={...r.pool.traits.find(t=>t.traitId===k),slot:t.slot,rerollsRemaining:0};offered.push(row);d.eligibleCandidateSnapshot.push(structuredClone(row));}
   }else offered.push(t);
  }d.offered=offered;
 }
 d.offeredIds=d.offered.map(t=>t.traitId);d.drawState.after=rng.state();return d;
}
export function rerollC29(s,id,d,key){
 const r=c29Record(s,id),i=d.offeredIds.indexOf(key);if(i<0||r.cards[key].branch!=='wild'||d.c29.rerolled)error('C29_REROLL_LIMIT');
 const rng=createRng(d.drawState.after),next=wild(r,rng,d.contextSnapshot.levelAfter,d.offeredIds.map(k=>r.cards[k].id));if(!next)error('REROLL_NO_ALTERNATIVES');
 d.offered[i]={...r.pool.traits.find(t=>t.traitId===next),slot:'wild',rerollsRemaining:0};d.offeredIds[i]=next;d.eligibleCandidateSnapshot.push(structuredClone(d.offered[i]));d.c29.rerolled=true;d.rerollCount++;d.offerRevision++;d.drawState.after=rng.state();return d;
}
export function selectedC29(s,id,d,key,tacticId){
 const r=c29Record(s,id),c=r.cards[key];if(!r?.c29)return;
 if(c.modifier){c29Bind(s,id,key,tacticId);}
 if(c.kind==='fork'){r.c29.forks[c.forkOf]=c.branch;ranks(r)[c.forkOf]=2;delete ranks(r)[key];}
 if(c.kind==='awakening'){if(r.c29.awakenings.length>=3)error('C29_AWAKENING_FULL');if(d.c29?.extraChoice)r.c29.extraChoiceSpent=true;r.c29.awakenings.push({...structuredClone(c),level:r.track.growthStates[id].level});delete ranks(r)[key];}
 if(c.evolution){const i=r.equippedTacticIds.indexOf(c.evolutionFrom);if(i<0)error('C29_EVOLUTION_SOURCE_MISSING');r.equippedTacticIds[i]=key;delete ranks(r)[c.evolutionFrom];if(r.c29.bindings[c.evolutionFrom]){r.c29.bindings[key]=r.c29.bindings[c.evolutionFrom];delete r.c29.bindings[c.evolutionFrom];}}
}
export function c29AiChoice(r,d,ranked){return d.c29?.awakening?d.offeredIds.find(k=>r.cards[k].branch==='narrative')??d.offeredIds[0]:ranked.find(k=>r.cards[k].kind!=='fork'||r.cards[k].branch==='a');}
export function c29AiBinding(s,id,key){const r=c29Record(s,id);return Object.entries(r.c29.bindings).find(([,v])=>v===key)?.[0]??c29BindingTargets(s,id,r.cards[key]).sort((a,b)=>(r.c29.uses[b]??0)-(r.c29.uses[a]??0)||a.localeCompare(b))[0];}
export const C229_GAUGE=gauge;
const deployed=(s,id)=>{const a=s.armies[id]??Object.values(s.armies).find(a=>a.commanderId===id&&castleArmyActive(s,a));return a&&castleArmyActive(s,a)?a:null;};
export function c29Gain(s,id,amount,event,{fixed=false}={}){
 const r=c29Record(s,id),x=r?.c29;if(s.disengageResolving||!c29Enabled(s)||!x||!deployed(s,id)||x.spentPeriod||x.events[event])return;
 x.events[event]=true;x.periodGain??=0;
 const gain=Math.max(0,Math.min(gauge.periodCap-x.periodGain,Math.floor(amount*(fixed?1:x.crisisMultiplier*c30GaugeFactor(s,id)*relationGaugeFactor(s,id)))));
 x.periodGain+=gain;x.gauge=Math.min(gauge.storeMax,x.gauge+gain);
}
export function c29Start(s,fid){for(const [id,r] of Object.entries(s.campaignGrowth?.officers??{}))if(r.c29&&s.officers[id].allegianceFactionId===fid){
 const x=r.c29,key=`${s.turn}.${fid}`;if(x.periodKey===key)continue;
 x.periodKey=key;x.periodGain=0;x.spentPeriod=false;x.events={};c29Gain(s,id,gauge.base,'base');
}}
export function c29Combat(s,c){
 if(!c29Enabled(s))return;
 if(c.kind==='CITY_STRIKE'){for(const u of c.units??[])if(u.casualties>0&&s.cities[c.cityId]?.ownerFactionId!==s.armies[u.unitId]?.factionId)c29Gain(s,u.unitId,gauge.taken,'taken');return;}
 const source=c.attackerId,reaction=['OVERWATCH','PURSUIT','APPROACH_FIRE'].includes(c.kind)&&!c.enginePaid,hostile=id=>s.armies[source]&&s.armies[id]&&diplomacyArmyHostile(s,source,id);
 // A receiver gets credit for hostile reactions too; the counter victim is the original attacker.
 for(const u of c.units??[])if(u.casualties>0&&!c.fire&&c.kind!=='FIRE'){
  if(hostile(u.unitId))c29Gain(s,u.unitId,gauge.taken,'taken');
  else if(u.unitId===source&&c.counter&&(s.armies[c.targetId]&&diplomacyArmyHostile(s,c.targetId,source)||s.cities[c.cityId]?.ownerFactionId&&s.cities[c.cityId].ownerFactionId!==s.armies[source]?.factionId))c29Gain(s,source,gauge.taken,'taken');
 }
 if(reaction)return;
 if((c.units??[]).some(u=>u.casualties>0&&hostile(u.unitId)))c29Gain(s,source,gauge.dealt,`dealt.${c.actionId??c.sequence}`);
 const results=new Set([...(c.eliminatedIds??[]),...(c.formationChanges??[]).filter(e=>['ORDERED','DISORDERED','BROKEN'].indexOf(e.to)>['ORDERED','DISORDERED','BROKEN'].indexOf(e.from)).map(e=>e.armyId),...(c.moraleChanges??[]).filter(e=>e.to==='ROUTING').map(e=>e.armyId)]);
 for(const id of results)if(hostile(id))c29Gain(s,source,gauge.result,`result.${id}`);
 if(c.captureLine&&c.cityId)c29Gain(s,source,gauge.result,`result.${c.cityId}`);
}
export function c29TacticUsed(s,id,c,{gaugePaid=false}={}){const r=c29Record(s,id);if(!r?.c29)return;r.c29.uses[c.traitId]=(r.c29.uses[c.traitId]??0)+1;if(!gaugePaid)r.c29.gauge=Math.max(0,r.c29.gauge-c29Cost(s,id,c));r.c29.spentPeriod=true;r.c29.tacticTurn=s.turn;}
export function c29Cost(s,id,c){if(c29Enabled(s)&&!c.mirrorCostResolved&&c.effects?.some(e=>e.rule==='MIRROR')){const copy=s.armies[id]?.c27?.lastHitTactic;if(copy&&!copy.effects?.some(e=>e.rule==='MIRROR'))c=copy;}const r=c29Record(s,id),signature=c.signature||c.traitId===r?.representativeId;return Math.max(0,(c.gaugeCost??(signature?gauge.cost.R[1]:c.jointArmyIds?gauge.cost.E[1]:gauge.cost.E[Number(['EPIC','LEGENDARY','MYTHIC'].includes(c.rarity))])));}
// Cooldown effects become costs for allies and gauge loss for hostile targets (trial).
export function c29Cooldown(s,id,n){const r=c29Record(s,id);if(!r?.c29)return false;if(n>0)r.c29.gauge=Math.max(0,r.c29.gauge-10*n);else {r.c29.costAdjustments??={};for(const key of [...(r.equippedTacticIds??[]),r.representativeId].filter(Boolean))r.c29.costAdjustments[key]=(r.c29.costAdjustments[key]??0)+10*n;}return true;}
export function c29Text(text=''){
 return String(text??'').replace(/재사용 대기(?:시간)? 초기화|대기 초기화/g,'게이지 +20').replace(/전법 하나의 재사용 대기 \+1/g,'전법 게이지 −10').replace(/재사용 대기(?:시간)?\s*([+−-])\s*(\d+)/g,(_,sign,n)=>`게이지 비용 ${sign}${Number(n)*10}`).replace(/\+1 대기/g,'비용 +10').replace(/재사용 대기(?:시간)?/g,'게이지 비용');
}
export function c29TacticCard(s,id,card){
 const r=c29Record(s,id);if(!r?.c29)return card;const c=structuredClone(card),m=r.cards[r.c29.bindings[c.traitId]],branch=r.c29.forks[c.traitId];c.text=c29Text(c.text);c.modifier=m?{...m,text:c29Text(m.text)}:null;c.modifierSlot=m?{id:m.id,name:m.name,text:m.text}:null;c.fork=branch??null;const fork=mods.forks.list.find(f=>f.tactic===c.id);if(branch&&fork)c.forkInfo={branch,...fork[branch]};
 c.gaugeCost=Math.max(0,c29Cost(s,id,c)+(r.c29.costAdjustments?.[c.traitId]??0)+(m?10*(1+(m.params.extraCooldown??0)):0));c.cooldown=0;if(c.effects?.some(e=>e.rule==='MIRROR'))c.mirrorCostResolved=true;
 if(m?.rule==='RANGE_PLUS')c.range=(c.range??0)+m.params.extra;
 if(c29Tag(s,id,c,'FIRE')&&Object.entries(ranks(r)).some(([k,n])=>n&&r.cards[k]?.id==='TR-WIND'))c.gaugeCost=Math.max(0,c.gaugeCost-10);
 if(c.id==='CTA-12')for(const e of c.effects)if(e.rule==='FIRE_ATTACK'){e.params.spread+=(m?.rule==='FIRE_SPREAD'?m.params.extra:0)+(branch==='a'?1:0);e.params.turns=branch==='b'?2:1;}
 if(c.id==='CTA-01'&&branch==='a')for(const e of c.effects)if(e.rule==='SHOVE')e.params.push=2;
 if(c.id==='CTA-09'&&branch==='b')for(const e of c.effects)if(e.rule==='MORALE_CONTEST')e.params.loseWeight=0;
 if(c.traitId===r.representativeId){c.signature=true;c.signatureScale=1+Math.min(5,r.titles?.length??0)*.1;c.cooldown=0;for(const e of c.effects){if(typeof e.value==='number')e.value*=c.signatureScale;if(!e.rule?.startsWith('U_'))for(const [k,v] of Object.entries(e.params??{}))if(typeof v==='number'&&!['range','turns','uses'].includes(k))e.params[k]=v*c.signatureScale;}}
 return c;
}
export function c29Metrics(s){const result={modifiers:0,forks:0,evolutions:0,signatureUses:0,awakening:{steady:0,narrative:0,wild:0}};for(const r of Object.values(s.campaignGrowth?.officers??{})){if(!r.c29)continue;result.modifiers+=Object.keys(r.c29.bindings).length;result.forks+=Object.keys(r.c29.forks).length;result.evolutions+=Object.keys(ranks(r)).filter(k=>r.cards[k]?.evolution).length;result.signatureUses+=r.c29.uses[r.representativeId]??0;for(const a of r.c29.awakenings)result.awakening[a.branch]++;}return result;}
export const c29Hidden=(s,id)=>c29Record(s,id)?.c29?.awakenings.some(a=>a.rule==='HIDDEN_TRAIT')??false;
export const c29Aw=(s,id,rule)=>c29Record(s,id)?.c29?.awakenings.find(a=>a.rule===rule)??null;
export function c29RecruitAgent(s,c){return c?.governorId&&c29Aw(s,c.governorId,'AW_TT-V06')?{agentOfficerId:c.governorId,agentCharisma:0,agentRecruitment:10}:{};}
export function c29SupplyExempt(s,id){const a=s.armies[id];return !!a&&Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&c29Aw(s,c.governorId,'AW_TT-V07')&&hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=3);}
export function c29Wind(s,id){const r=c29Record(s,id),a=s.armies[id];return !!r?.c29&&['plain','river'].includes(s.tiles[a?.tileId]?.terrainType)&&Object.entries(ranks(r)).some(([k,n])=>n&&r.cards[k]?.id==='TR-WIND');}
export function c29XpFactor(s,id){const a=Object.values(s.armies).find(a=>a.commanderId===id),mentor=a&&Object.values(s.armies).some(b=>b.factionId===a.factionId&&b.armyId!==a.armyId&&b.troopCount>0&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1&&c29Aw(s,b.armyId,'MENTOR_AURA'));return (mentor?1.2:1)*(c29Aw(s,id,'AW_TT-V03')?1.1:1);}
export function c29CityOutput(s,c,raw){const id=c.governorId;if(!id)return;const x=c29Aw(s,id,'CROSSOVER'),r=c29Record(s,id);if(x&&!r.cards[r.coreId]?.domestic)for(const k of Object.keys(raw))if(typeof raw[k]==='number')raw[k]*=1+x.params.city/100;if(c29Aw(s,id,'AW_TT-V01'))raw.food*=1.1;if(c29Aw(s,id,'AW_TT-V03'))raw.science*=1.1;}
export function c29Recovery(s,id){const x=c29Aw(s,id,'BLOOD_PRICE'),a=s.armies[id];if(!x||!a)return 1;const strength=a.deploymentStrength??s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??a.troopCount;return a.troopCount*100/strength<x.params.at?0:1;}
export function c29TraitTriggered(s,source,e,targets){const r=c29Record(s,source);if(!r?.c29||e.traitId!==r.coreId||!targets.length)return;r.c29.traitTurn=s.turn;if(c29Aw(s,source,'GAUGE_ON_TRAIT'))c29Gain(s,source,10,'trait',{fixed:true});if(c29Aw(s,source,'EXPOSE_ON_TRAIT'))for(const id of targets)if(s.armies[id]&&s.armies[id].factionId!==s.armies[source]?.factionId){const a=s.armies[id];a.effectStates??=[];if(!a.effectStates.some(e=>e.c29Expose===source&&e.expiresTurn>=s.turn))a.effectStates.push({op:'DEFENSE_MOD',value:-10,startsTurn:s.turn,expiresTurn:s.turn+1,c29Expose:source});}}
export function c29PostCombat(s,c,{morale,formation}={}){
 for(const u of c.units??[]){const r=c29Record(s,u.unitId),a=s.armies[u.unitId];if(!r?.c29||!a)continue;
  const x=c29Aw(s,u.unitId,'SECOND_WIND'),strength=a.deploymentStrength??s.personnel.formations.find(f=>f.formationId===u.unitId)?.targetStrength??u.preBattleCount;
  if(x&&!r.c29.secondWind&&u.postBattleCount>0&&u.postBattleCount*100/strength<x.params.at){r.c29.secondWind=true;morale?.(u.unitId,a.morale==='ROUTING'?'SHAKEN':'STEADY');formation?.(u.unitId,-1);}
 }
 for(const e of c.moraleChanges??[])if(e.to==='ROUTING'){const r=c29Record(s,e.armyId);if(r?.c29)r.c29.routedTurn=s.turn;}
 const winner=c29Record(s,c.attackerId);
 if(winner?.c29?.traitTurn===s.turn&&c29Aw(s,c.attackerId,'STEAL_ON_ROUT'))for(const e of c.moraleChanges??[])if(e.to==='ROUTING'&&s.armies[e.armyId]?.factionId!==s.armies[c.attackerId]?.factionId){
  const other=c29Record(s,e.armyId),event=`steal.${c.sequence}.${e.armyId}`;if(!other||winner.c29.events[event])continue;winner.c29.events[event]=true;
  const card=Object.entries(ranks(other)).filter(([k,n])=>n&&k!==other.coreId&&other.cards[k]?.kind==='trait'&&['COMMON','UNCOMMON','RARE'].includes(other.cards[k].rarity)&&!other.cards[k].modifier).map(([k])=>other.cards[k]).sort((a,b)=>a.traitId.localeCompare(b.traitId))[0];
  if(card){const key=c29Add(winner,{...card,id:`stolen.${other.pack.id}.${card.id??card.traitId}`,core:false});winner.c28.pending.push({traitId:key,slot:'배움',sourceText:`${s.officers[other.pack.id].name}에게서 배움`});}
 }
}
export function validateC29(s,id){const r=c29Record(s,id),x=r?.c29;if(!x)return;if(!Number.isFinite(x.periodGain??0)||(x.periodGain??0)<0||(x.periodGain??0)>gauge.periodCap||x.spentPeriod!==undefined&&typeof x.spentPeriod!=='boolean'||!c29Enabled(s)||!Number.isFinite(x.gauge)||x.gauge<0||x.gauge>100||!Number.isFinite(x.crisisMultiplier)||x.crisisMultiplier<0||x.awakenings.length>3||new Set(x.awakenings.filter(a=>a.branch==='wild').map(a=>a.id)).size!==x.awakenings.filter(a=>a.branch==='wild').length||Object.entries(x.bindings).some(([k,v])=>r.cards[k]?.kind!=='tactic'||!r.cards[v]?.modifier||!ranks(r)[v])||Object.values(x.forks).some(v=>!['a','b'].includes(v))||!Number.isSafeInteger(x.xpDebt??0)||(x.xpDebt??0)<0)error('INVALID_C29_RECORD');}
export function c29CoreFactor(s,id,ctx={}){
 const r=c29Record(s,id);if(!r?.c29?.awakenings.length)return 1;const a=s.armies[id]??Object.values(s.armies).find(a=>a.commanderId===id),target=s.armies[ctx.targetId];
 const strength=a?.deploymentStrength??s.personnel?.formations.find(f=>f.formationId===a?.armyId)?.targetStrength??a?.troopCount??1,percent=100*(a?.troopCount??strength)/strength;
 let factor=1,bonus=0;
 for(const x of r.c29.awakenings){const p=x.params??{};switch(x.rule){
 case 'STEADY_UP':bonus+=p.bonus;break;
 case 'DROP_CONDITION':factor*=p.ratio/100;break;
 case 'DOUBLE_OR_NOTHING':factor*=p.mult;break;
 case 'KEEP_ON_ROUT':if(r.c29.routedTurn===s.turn-1)factor*=p.mult;break;
 case 'OPENING_BOOST':if(a&&s.turn-(a.c29DeploymentTurn??1)<p.turns)factor*=p.mult;break;
 case 'ON_TACTIC_TURN':if(r.c29.tacticTurn===s.turn)bonus+=p.bonus;break;
 case 'BLOOD_PRICE':if(percent<p.at)bonus+=p.bonus;break;
 case 'LATE_BLOOM':bonus+=Math.min(p.max,p.now+p.perLevel*(r.track.growthStates[r.pack.id].level-x.level));break;
 case 'LEGEND_NAME':bonus+=Math.min(p.max,p.perTitle*(r.titles?.length??0));break;
 case 'AW_TT-C01':if(ctx.charge)bonus+=50;break;
 case 'AW_TT-C02':if(['FLANK','REAR'].includes(ctx.side))bonus+=50;break;
 case 'AW_TT-C03':if(ctx.defending&&(ctx.side==='FRONT'||ctx.cityId))bonus+=50;break;
 case 'AW_TT-C04':if(percent<50)bonus+=50;break;
 case 'AW_TT-C05':if(ctx.cityId||s.cities[ctx.targetId])bonus+=50;break;
 case 'AW_TT-C06':if(target&&['숙적','원수'].includes(r.c28?.relations[target.commanderId]))factor*=2;break;
 case 'AW_TT-V01':if(a&&s.turn-(a.c29DeploymentTurn??1)<3)bonus+=20;break;
 case 'VANGUARD':if(a){const cities=Object.values(s.cities).filter(c=>c.ownerFactionId&&c.ownerFactionId!==a.factionId);const nearest=b=>Math.min(...cities.map(c=>hexDistance(s.tiles[b.tileId],s.tiles[c.tileId])));if(cities.length&&Object.values(s.armies).filter(b=>b.factionId===a.factionId&&b.troopCount>0).sort((b,c)=>nearest(b)-nearest(c)||b.armyId.localeCompare(c.armyId))[0]?.armyId===a.armyId)bonus+=p.bonus;}break;
 }}return Math.max(0,factor*(1+bonus/100));
}
export function c29CoreCard(s,id,card,ctx={}){
 const r=c29Record(s,id);if(!r?.c29||card.traitId!==r.coreId)return card;
 if(!r.c29.awakenings.length)return {...card,awakenings:[],awakeningText:'각성 0/3'};
 const c=structuredClone(card),factor=c29CoreFactor(s,id,ctx),drop=r.c29.awakenings.some(a=>a.rule==='DROP_CONDITION');let removed=false;
 c.awakenings=r.c29.awakenings.map(({id,name,text})=>({id,name,text}));c.awakeningText=`각성 ${c.awakenings.length}/3`;
 c.effects=(c.effects??[]).map(e=>{if(c29Aw(s,id,'RANGE_UP')&&typeof e.params?.range==='number')e.params.range+=1;if(drop&&!removed&&e.condition){e.condition=null;removed=true;}if(typeof e.value==='number')e.value*=factor;if(!e.rule?.startsWith('U_'))for(const [k,v] of Object.entries(e.params??{}))if(typeof v==='number'&&!['range','turns','uses','at','threshold','cost'].includes(k))e.params[k]=v*factor;return e;});return c;
}

// C30: turn-start bond snapshots and cumulative officer sets (trial data).

export const C30_DATA=data;
export const c30Enabled=s=>['v2','v3'].includes(s.mapId);
let c30ArmyActive,c30Troop;
export function configureC30(isActive,troop){c30ArmyActive=isActive;c30Troop=troop;}
const active=(s,a)=>a&&a.troopCount>0&&c30ArmyActive(s,a)&&s.officers[a.commanderId]?.allegianceFactionId===a.factionId;
const armies=(s,fid)=>Object.values(s.armies).filter(a=>a.factionId===fid&&active(s,a));
const distance=(s,a,b)=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId]);
const cityAt=(s,a)=>Object.values(s.cities).find(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(a.tileId));
export function initializeC30(s){if(c30Enabled(s))s.c30??={factions:{},teamUpTurns:0,teamTurns:{},highestSets:Object.fromEntries(data.sets.map(x=>[x.id,0])),log:[]};return s;}
export function c30State(s,id){const a=s.armies[id],x=c30Enabled(s)&&s.c30?.factions[a?.factionId]?.armies[id];return x&&x.commanderId===a.commanderId?x:null;}
export const c30Bond=(s,id,bond)=>(c30State(s,id)?.effectBonds??c30State(s,id)?.teamUps)?.includes(bond)??false;
export const c30Tier=(s,fid,set)=>c30Enabled(s)?s.c30?.factions[fid]?.sets.find(x=>x.id===set)?.tier??0:0;
export const c30ArmyTier=(s,id,set)=>c30State(s,id)?.sets.find(x=>x.id===set)?.tier??0;
export function c30Start(s,fid,{force=false}={}){
 if(!c30Enabled(s))return s;initializeC30(s);if(!force&&s.c30.factions[fid]?.turn===s.turn)return s;
 const own=armies(s,fid),byOfficer=new Map(own.map(a=>[a.commanderId,a]));
 const sets=data.sets.map(x=>{const members=x.members.filter(id=>byOfficer.has(id)),count=members.length,tiers=Object.keys(x.tiers).map(Number).filter(n=>n<=count);return {id:x.id,name:x.name,count,total:x.members.length,tier:Math.max(0,...tiers),effects:tiers.map(n=>({tier:n,text:x.tiers[n]})),members};});
 const snapshot={turn:s.turn,sets,armies:{}};s.c30.factions[fid]=snapshot;
 for(const a of own)snapshot.armies[a.armyId]={commanderId:a.commanderId,teamUps:[],effectBonds:[],sets:sets.filter(x=>x.members.includes(a.commanderId)&&x.tier>0).map(({id,tier})=>({id,tier})),moraleUsed:false,formationUsed:false,firstTacticUsed:false};
 const add=(a,id,effect=true)=>{const x=snapshot.armies[a.armyId];if(!x.teamUps.includes(id))x.teamUps.push(id);if(effect&&!x.effectBonds.includes(id))x.effectBonds.push(id);};
 for(const b of data.teamUps){
  if(b.id==='BD-05'){
   for(const a of own){const origin=a.c30Origin;if(origin&&origin.factionId===fid&&origin.governorId==='G04'&&s.turn>origin.turn&&s.turn<=origin.turn+3&&s.officers.G07?.allegianceFactionId===fid&&s.officers.G04?.allegianceFactionId===fid)add(a,b.id);}continue;
  }
  const anchor=byOfficer.get(b.anchor);if(!anchor)continue;
  for(const id of b.partners){const partner=byOfficer.get(id);if(!partner)continue;
   const sameCity=b.id==='BD-04'&&cityAt(s,anchor)?.cityId&&cityAt(s,anchor)?.cityId===cityAt(s,partner)?.cityId;
   if(distance(s,anchor,partner)>b.range&&!sameCity)continue;
   add(partner,b.id);add(anchor,b.id,['BD-02','BD-03','BD-04','BD-08'].includes(b.id));
  }
 }
 const bonds=[...new Set(Object.values(snapshot.armies).flatMap(x=>x.teamUps))];
 if(bonds.length)s.c30.teamUpTurns++;
 for(const id of bonds)s.c30.teamTurns[id]=(s.c30.teamTurns[id]??0)+1;
 for(const x of sets)s.c30.highestSets[x.id]=Math.max(s.c30.highestSets[x.id]??0,x.tier);
 for(const a of own)for(const id of snapshot.armies[a.armyId].teamUps){const b=data.teamUps.find(b=>b.id===id);s.c30.log.push({turn:s.turn,factionId:fid,armyId:a.armyId,text:`${b.name} — ${s.officers[a.commanderId].name}: ${b.text}`});}
 s.c30.log=s.c30.log.slice(-120);
 // JT cost delays every available tactic, including ready tactics, on the next own turn.
 for(const a of own)if(a.c30Delay){if(c29Enabled(s)){delete a.c30Delay;continue;}const r=c29Record(s,a.armyId),keys=new Set([...Object.keys(a.tacticReadyTurns??{}),...(r?.equippedTacticIds??[]),...(r?.representativeId?[r.representativeId]:[]),'JT-01']);for(const key of keys)a.tacticReadyTurns[key]=Math.max(s.turn,a.tacticReadyTurns[key]??0)+a.c30Delay;delete a.c30Delay;}
 return s;
}
export function c30Joint(s,id){const a=s.armies[id];if(!c30Enabled(s)||a?.commanderId!=='G05'||!active(s,a))return null;const allies=armies(s,a.factionId),pair=['G18','G19'].map(id=>allies.find(a=>a.commanderId===id));if(pair.some(b=>!b)||[distance(s,a,pair[0]),distance(s,a,pair[1]),distance(s,pair[0],pair[1])].some(n=>n>2))return null;return {...data.teamUps[0].jointTactic,traitId:'JT-01',kind:'tactic',rank:1,jointArmyIds:pair.map(a=>a.armyId),effects:[{op:'DAMAGE_MOD',when:'ON_TACTIC_USE',target:'TARGET',value:0}]};}
export function c30MoraleWeight(s,id,weight){return weight*(c30ArmyTier(s,id,'ST-01')>=2?.9:1);}
export function c30IgnoreMorale(s,id){const x=c30State(s,id);if(!x||x.moraleUsed||!['BD-01','BD-05'].some(b=>c30Bond(s,id,b)))return false;x.moraleUsed=true;return true;}
export function c30IgnoreFormation(s,id){const x=c30State(s,id);if(!x||!c30Bond(s,id,'BD-06')||x.formationUsed)return false;x.formationUsed=true;return true;}
export const c30ChargeGuard=(s,id)=>c30Bond(s,id,'BD-06');
export const c30ChargeWeight=(s,id)=>c30ArmyTier(s,id,'ST-06')>=3?5:0;
export const c30Move=(s,id)=>c30ArmyTier(s,id,'ST-06')>=2&&c30Troop(s.armies[id].troopType)==='BT04'?1:0;
export const c30GaugeFactor=(s,id)=>{const a=s.armies[id]??Object.values(s.armies).find(a=>a.commanderId===id);return a&&c30ArmyTier(s,a.armyId,'ST-01')>=5?1.5:1;};
export const c30Strategy=(s,id)=>c34Strategy(s,id)+(c30ArmyTier(s,id,'ST-03')>=2?10:0);
export function c30Element(s,id,kind){const x=c30State(s,id),huang=Object.values(s.armies).find(a=>a.commanderId==='G50'&&a.factionId===s.armies[id]?.factionId);return (kind==='FIRE'&&c30ArmyTier(s,id,'ST-02')>=2?15:0)+(kind==='FIRE'&&s.armies[id]?.commanderId==='G27'&&x?.teamUps.includes('BD-03')&&huang?.c30DamagedTurn===s.turn?30:0);}
export const c30Spread=(s,id)=>c30Element(s,id,'FIRE')>=(c30ArmyTier(s,id,'ST-02')>=2?45:30)?1:0;
export function c30Damage(s,id,target,ctx={}){
 let damage=0,defense=0;const lines=[];
 const add=(n,label)=>{damage+=n;lines.push(`${label} — ${s.officers[s.armies[id].commanderId].name} 피해 +${n}%`);};
 if(c30Bond(s,id,'BD-01'))add(10,'도원결의');if(c30Bond(s,id,'BD-02'))add(10,'단금지교');if(c30ArmyTier(s,id,'ST-01')>=3)add(8,'다섯 범 장군');
 if(ctx.charge){if(c30Bond(s,id,'BD-09'))add(10,'서량의 부자');if(c30ArmyTier(s,id,'ST-05')>=2)add(10,'여포군');}
 if(c30Bond(s,target,'BD-08')){defense+=10;lines.push('서량의 의형제 — 받는 피해 −10%');}
 if(c30ArmyTier(s,target,'ST-04')>=2&&cityAt(s,s.armies[target])?.ownerFactionId===s.armies[target].factionId){defense+=10;lines.push('하북의 책사와 맹장 — 성 수비 피해 −10%');}
 return {damage,defense,lines};
}
export function c30ElementDamage(s,id,target,value,kind='FIRE'){const b=c30Damage(s,id,target);return value*Math.max(0,1+(b.damage+c30Element(s,id,kind))/100)*Math.max(0,1-b.defense/100);}
export function c30TacticCard(s,id,card){const c=structuredClone(card),x=c30State(s,id);if(x&&!x.firstTacticUsed&&!c.signature&&!c.jointArmyIds&&(c30Bond(s,id,'BD-07')||c30ArmyTier(s,id,'ST-02')>=3))c.gaugeCost=Math.max(0,(c.gaugeCost??c29Cost(s,id,c))-10);if(c30Spread(s,id))for(const e of c.effects??[])if(e.rule==='FIRE_ATTACK')e.params.spread+=1;return c;}
export function c30TacticUsed(s,id,card){const x=c30State(s,id);if(x)x.firstTacticUsed=true;if(c30Bond(s,id,'BD-02'))for(const b of armies(s,s.armies[id].factionId))if(b.armyId!==id&&['G20','G27'].includes(b.commanderId)&&c30Bond(s,b.armyId,'BD-02')){if(c29Cooldown(s,b.armyId,-1))continue;for(const [key,ready] of Object.entries(b.tacticReadyTurns))b.tacticReadyTurns[key]=Math.max(s.turn,ready-1);}}
export function c30Combat(s,c,{morale}={}){
 if(!c30Enabled(s))return;for(const u of c.units??[])if(u.casualties>0&&s.armies[u.unitId])s.armies[u.unitId].c30DamagedTurn=s.turn;
 if(morale&&c30ArmyTier(s,c.attackerId,'ST-05')>=3)for(const e of [...(c.moraleChanges??[])])if(e.to==='ROUTING'){const key=`${c.sequence}.${e.armyId}`;s.c30.routEvents??={};if(s.c30.routEvents[key])continue;s.c30.routEvents[key]=true;const victim=s.armies[e.armyId];if(!victim||victim.factionId===s.armies[c.attackerId].factionId)continue;for(const b of armies(s,victim.factionId))if(b.armyId!==victim.armyId&&distance(s,b,victim)===1)morale?.(b.armyId);}
}
export function c30Learn(s,id){const a=Object.values(s.armies).find(a=>a.commanderId===id);if(id!=='G40'||!a||!c30Bond(s,a.armyId,'BD-04'))return;const mentor=c29Record(s,'G41'),r=c29Record(s,id);if(!mentor||!r?.c28)return;const ranks=mentor.track.growthStates.G41.ownedTraitRanks;const card=Object.entries(ranks).filter(([key,n])=>n&&key!==mentor.coreId&&mentor.cards[key]?.kind==='trait'&&!mentor.cards[key].core&&!mentor.cards[key].modifier&&!mentor.cards[key].sourceOfficerId&&!mentor.cards[key].title&&mentor.pool.traits.some(t=>t.traitId===key&&t.ownershipType==='PUBLIC')&&!mentor.cards[key].effects?.some(e=>e.rule?.startsWith('U_'))).map(([key])=>mentor.cards[key]).sort((a,b)=>a.traitId.localeCompare(b.traitId))[0];if(!card)return;const key=c29Add(r,{...card,id:`mentor.G41.${card.id??card.traitId}`,core:false});if(!r.c28.pending.some(p=>p.traitId===key))r.c28.pending.push({traitId:key,slot:'배움',sourceText:'노숙에게서 배움'});return key;}
export function c30Finish(s,fid,award){const x=s.c30?.factions[fid];if(!x||x.finished)return;x.finished=true;for(const a of armies(s,fid))if(a.commanderId==='G40'&&c30Bond(s,a.armyId,'BD-04'))award({officerId:'G40',eventId:`C30.MENTOR.${x.turn}.${fid}`,kind:'SURVIVAL',amount:5,fixed:true});}
export function c30CityOutput(s,c,raw){if(c30Tier(s,c.ownerFactionId,'ST-03')<3||!c.governorId)return;for(const k of Object.keys(raw))raw[k]*=1.05;}
export function c30Settle(s){if(!c30Enabled(s))return;for(const fid of Object.keys(s.factions)){const x=s.c30?.factions[fid];if(!x||x.settled)continue;x.settled=true;if(c30Tier(s,fid,'ST-02')>=4)s.factions[fid].science+=3;if(c30Tier(s,fid,'ST-04')>=3)s.factions[fid].prestige+=2;}}
export const c30MusterDiscount=(s,fid)=>c30Tier(s,fid,'ST-04')>=4?2:0;
export const c30MusterBonus=(s,fid,type)=>c30Tier(s,fid,'ST-06')>=4&&c30Troop(type)==='BT04'?100:0;
export function c30MusterOrigin(s,c,a){if(c30Enabled(s)&&c.governorId==='G04'&&s.officers.G04?.allegianceFactionId===c.ownerFactionId)a.c30Origin={cityId:c.cityId,factionId:c.ownerFactionId,governorId:c.governorId,turn:s.turn};}
export function c30View(s,fid,projected){if(!c30Enabled(s))return;projected.setProgress=(s.c30?.factions[fid]?.sets??[]).map(({id,name,count,total,tier,effects})=>({id,name,count,total,tier,effects,progress:`${count}/${total}`}));
 for(const o of Object.values(projected.officers))if(o.allegianceFactionId===fid){const a=armies(s,fid).find(a=>a.commanderId===o.officerId),x=a&&c30State(s,a.armyId);o.teamUps=(x?.teamUps??[]).map(id=>{const b=data.teamUps.find(b=>b.id===id);return {id,name:b.name,effect:b.text};});o.sets=(x?.sets??[]).map(({id,tier})=>{const b=data.sets.find(b=>b.id===id);return {id,name:b.name,tier,effect:Object.entries(b.tiers).filter(([n])=>Number(n)<=tier).map(([,text])=>text).join(' · ')};});}
 if(c30Tier(s,fid,'ST-03')>=4)for(const a of Object.values(projected.knowledge.observedArmies))if(projected.knowledge.tiles[a.tileId]==='VISIBLE'&&s.moveOrders?.[a.armyId])a.nextMoveTarget=s.moveOrders[a.armyId].destinationTileId;
 projected.bondLog=(s.c30?.log??[]).filter(e=>e.factionId===fid).map(e=>({...e}));
}
export const c30Metrics=s=>({teamUpTurns:s.c30?.teamUpTurns??0,teamTurns:{...(s.c30?.teamTurns??{})},highestSets:{...(s.c30?.highestSets??{})}});
