import {troopText} from './troop-display.mjs';
import {memoCampaignQuery} from './campaign-rule-registry.mjs';
import {diplomacyArmyHostile,diplomacyAttackReason,withdrawalProtection} from './campaign-diplomacy.mjs';
import {initializeClasses,classPostMove} from './campaign-classes.mjs';
import {C34_RULES,c34DamageLimit,c34Recovery,c34Finish,c34RemoveStatuses,c34Reveal} from './campaign-c34.mjs';
import {c33Enabled,c33Card,c33Mods,c33Movement,c33Targets,c33AiUseful,c33Cooldown,c33Start,c33Immune,c33Limit,c33Owned,c33Range} from './campaign-rule-registry.mjs';
import {c31Move,c31Tactic} from './campaign-events.mjs';
import {configureC30,c30Start,c30Finish,c30Joint,c30Move,c30Damage,c30TacticCard,c30Strategy} from './campaign-c29.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {c29Record,c29TacticCard,c29Start,c29CoreCard,c29CoreFactor,c29Aw,c29TraitTriggered,c29Recovery} from './campaign-c29.mjs';
import {C28,c28Enabled,c28Rule,c28Suppressed,c28DamageBonus,c28Expose,c28ControlGuard,c28RecoveryFactor} from './campaign-career.mjs';
import {DOMESTIC_RULES,domesticStartFaction,COMBAT_TITLE_RULES,COMMON_TACTIC_RULES,combatTacticRule,combatTraitActive,combatMovement,combatStartFaction,combatCanPostMove,combatSurvive,combatRuleLine,combatArmyAt,combatAlly,oppositeCombatTile,combatEmptyStep} from './campaign-rule-registry.mjs';
import {campaignRuleRegistered,executeCampaignRule} from './campaign-rule-registry.mjs';
import {expandUniqueEffect,uniqueHasRule,uniqueOps,uniqueOwned,uniqueImmune,uniqueTacticTargets,uniqueTacticIsDamage,uniqueCooldownTurns,uniqueDamageLimit,uniqueStart,uniqueRange} from './campaign-rule-registry.mjs';
import {archerAttackReason} from './campaign-abilities.mjs';
import {attackDirection,isCharge,checkFormation,changeFormation,C12,turnFacing,directionToward} from './campaign-abilities.mjs';
import {hexDistance,neighbors} from './map-primitives.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {specialTroop} from './campaign-special-troops.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {checkMorale,changeMorale} from './campaign-morale.mjs';
import {recoverWoundedPersonnel,dispatchPersonnelTransport,arrivePersonnelTransport} from './military-personnel-ledger.mjs';
import {createTransportCapacity,reserveTransportCapacity} from './military-capacity.mjs';

// EFFECT-OPS v0.2 trial interpreter. Pure queries and committed events share
// selection, ranks, conditions and targets. No renderer or pack writes.
export const EFFECT_OPS=['DAMAGE_MOD','DEFENSE_MOD','MORALE_DELTA','MOVE_MOD','INITIATIVE_MOD','STATUS_APPLY','COUNTER_MOD','HEAL_TROOPS','CASUALTY_SHIFT','XP_MOD','CITY_OUTPUT_MOD','OCCUPATION_SPEED','RULE','FORMATION_DELTA'];
const combatModifiers=new Set(['DAMAGE_MOD','DEFENSE_MOD','INITIATIVE_MOD','COUNTER_MOD','CASUALTY_SHIFT']);
const numeric=new Set(['DAMAGE_MOD','DEFENSE_MOD','MOVE_MOD','INITIATIVE_MOD','COUNTER_MOD','CASUALTY_SHIFT','XP_MOD','CITY_OUTPUT_MOD','OCCUPATION_SPEED']);
const statuses=new Set(['DEMORALIZED','INSPIRED','SLOWED','ROOTED','CONFUSED']);
// 기록 줄에 보이는 상태 이름(코드 대신)
const STATUS_KO={DEMORALIZED:'사기 저하',INSPIRED:'고무',SLOWED:'둔화(이동 −2)',ROOTED:'발 묶임',CONFUSED:'혼란'};
export const strengthenedValue=(value,rank=1)=>Math.round((value??0)*(1+.5*(Math.max(1,Math.min(5,rank))-1)));
export function initializeCampaignEffects(s){initializeClasses(s);
  configureC30(castleArmyActive,troopToCampaign);
  s.campaignEffects??={version:1,log:[],sequence:0};s.campaignEffects.startedTurns??={};
  for(const a of Object.values(s.armies)){a.effectStates??=[];a.tacticReadyTurns??={};a.effectFirstAttackTurn??=null;}
  return s;
}
export function officerEffectCards(s,id,{tactics=false}={}){
  if(s.mapId!=='v1'&&s.c46Disabled!==true&&s.officers[id]?.injury&&Object.values(s.cities).some(c=>c.governorId===id))return [];
  const r=s.campaignGrowth?.officers[id];if(!r)return [];
  const ranks=r.track.growthStates[id].ownedTraitRanks;
  return Object.keys(r.cards).filter(key=>(ranks[key]||key===r.coreId)&&combatTraitActive(r,key)&&r.cards[key].kind===(tactics?'tactic':'trait'))
    .map(key=>c29CoreCard(s,id,{...r.cards[key],rank:Math.max(1,ranks[key]??1)}));
}

export const CAMPAIGN_RULES=Object.freeze(['IGNORE_ZOC','NO_PURSUIT','FIRST_STRIKE','MOVE_AFTER_ATTACK','NEVER_ROUT','NO_COUNTER_TAKEN','BREACH','CAPTURE_ALWAYS','DOUBLE_ACTION','TERRAIN_WALKER','AMBUSH','EAGLE_EYE','RECALL','REACH_2','SPLASH','OVERWATCH','LAST_STAND','COUNTER_ALL','EXTENDED_ZOC','RALLY_AURA','TERROR','ABSORB','DEFECTION','SIEGE_FROM_WALL','SIEGE_IMMUNE','GARRISON_WALL','FORCED_MARCH','BLOOD_PRICE','NO_RETREAT','DOUBLE_DRAFT','MENTOR']);
// 기존 규칙 카드의 실제 이름. 카드가 없는 효과도 내부 ID를 글에 내보내지 않는다.
export const CAMPAIGN_RULE_NAMES=Object.freeze({
 IGNORE_ZOC:"적 옆을 스쳐 간다",
 NO_PURSUIT:"추격 없이 빠지기",
 FIRST_STRIKE:"먼저 받아친다",
 MOVE_AFTER_ATTACK:"치고 다시 움직인다",
 NEVER_ROUT:"절대 무너지지 않는다",
 NO_COUNTER_TAKEN:"반격 없는 공격",
 BREACH:"성벽 한 방",
 CAPTURE_ALWAYS:"반드시 사로잡는다",
 DOUBLE_ACTION:"두 번 행동",
 TERRAIN_WALKER:"험한 길도 평지처럼",
 AMBUSH:"보이지 않는 매복",
 EAGLE_EYE:"천리안",
 RECALL:"성으로 즉시 귀환",
 REACH_2:"두 칸 너머 공격",
 SPLASH:"한 번에 둘을 친다",
 OVERWATCH:"다가오면 먼저 친다",
 LAST_STAND:"한 번은 버틴다",
 COUNTER_ALL:"화살에도 반격",
 EXTENDED_ZOC:"넓은 포위망",
 RALLY_AURA:"무너지지 않는 기둥",
 TERROR:"바람 소리에도 놀란다",
 ABSORB:"항복병 흡수",
 DEFECTION:"적장 귀순시키기",
 SIEGE_FROM_WALL:"사방에서 성 공격",
 SIEGE_IMMUNE:"성 화살을 막는다",
 GARRISON_WALL:"흔들리지 않는 성",
 FORCED_MARCH:"밤낮 강행군",
 BLOOD_PRICE:"목숨 건 맹공",
 NO_RETREAT:"제자리 사수",
 DOUBLE_DRAFT:"넓게 배운다",
 MENTOR:"제자를 키운다",
});
export const EFFECT_CONDITIONS=Object.freeze(['FIRST_ROUND','DEFENDING_CITY','OUTNUMBERED','FLANK','REAR','CHARGE','TARGET_DISORDERED','SELF_ORDERED','TARGET_CITY','FROM_CITY','TARGET_RIVAL','TARGET_LOWER_MIGHT','TARGET_TITLED','ATTACKER_CHARGE','ATTACKER_RANGED']);
export const campaignEffectValid=(e,card={})=>EFFECT_OPS.includes(e.op)&&(e.op!=='RULE'||(card.rarity==='MYTHIC'&&CAMPAIGN_RULES.includes(e.rule)||campaignRuleRegistered(e.rule)))&&(!e.condition||EFFECT_CONDITIONS.includes(e.condition)||/^(TERRAIN|TROOP|HP_BELOW):[^:]+$/.test(e.condition))&&(e.op!=='FORMATION_DELTA'||e.value===undefined||Number.isFinite(e.value));
const implementedEffect=campaignEffectValid;
export function cardEffectReady(card){return (card.effects??[]).some(e=>implementedEffect(e,card));}
export function cardEffectPending(card){return !card.effects?.length||card.effects.some(e=>!implementedEffect(e,card));}
// Cache only owned-card rule definitions. Dynamic geometry, conditions, stored
// effects and dispositions remain live; edits to ranks/cards/effects invalidate.
const officerRuleIndexes=new WeakMap();
function officerRules(r){
  if(!r)return emptyRules;
  const ranks=r.track.growthStates[r.pack.id].ownedTraitRanks,cached=officerRuleIndexes.get(r);
  const keys=Object.keys(ranks);
  if(cached&&cached.coreId===r.coreId&&keys.length===cached.keys.length&&keys.every((key,i)=>key===cached.keys[i])&&cached.cards.every(x=>{
    const c=r.cards[x.key];return c===x.card&&c?.kind===x.kind&&c?.rarity===x.rarity&&(c?.effects?.length??0)===x.effects.length&&x.effects.every((v,i)=>{const e=c.effects[i];return e.op===v.op&&e.rule===v.rule&&e.when===v.when&&e.target===v.target&&e.condition===v.condition;});
  }))return cached.rules;
  const rules=new Map(),cards=[];
  for(const key of new Set([r.coreId,...keys])){const c=r.cards[key];
    cards.push({key,card:c,kind:c?.kind,rarity:c?.rarity,effects:(c?.effects??[]).map(e=>({op:e.op,rule:e.rule,when:e.when,target:e.target,condition:e.condition}))});
    if(c?.kind!=='trait'||c.rarity!=='MYTHIC')continue;
    for(const e of c.effects??[])if(e.op==='RULE'){const list=rules.get(e.rule)??[];list.push(e);rules.set(e.rule,list);}}
  officerRuleIndexes.set(r,{coreId:r.coreId,keys,cards,rules});return rules;
}
const emptyRules=new Map();
export function hasCampaignRule(s,id,rule,whens=['PASSIVE'],ctx={}){
  return whens.length===1&&whens[0]==='PASSIVE'&&!Object.keys(ctx).length?memoCampaignQuery(s,'has:'+id+':'+rule,()=>hasCampaignRuleUncached(s,id,rule,whens,ctx)):hasCampaignRuleUncached(s,id,rule,whens,ctx);
}
function hasCampaignRuleUncached(s,id,rule,whens,ctx){
  if(c28Suppressed(s,id))return false;
  if(uniqueHasRule(s,id,rule))return true;
  if(!CAMPAIGN_RULES.includes(rule))return false;
  if((s.armies[id]?.effectStates??[]).some(e=>e.op==='RULE'&&e.rule===rule&&activeState(s,e)&&e.startsTurn<=s.turn))return true;
  const own=memoCampaignQuery(s,'officer:'+id,()=>officerRules(s.campaignGrowth?.officers[s.armies[id]?.commanderId??id])).get(rule)??[];
  for(const e of own)if((e.when==='PASSIVE'||whens.includes(e.when))&&effectCondition(s,id,e.condition,{...ctx,when:e.when})&&effectTargets(s,id,e.target??'SELF',ctx).includes(id))return true;
  for(const a of Object.values(s.armies)){
    if(a.armyId===id||!castleArmyActive(s,a))continue;
    const effects=memoCampaignQuery(s,'officer:'+a.armyId,()=>officerRules(s.campaignGrowth?.officers[a.commanderId])).get(rule)??[];
    for(const e of effects)if(e.when==='PASSIVE'&&e.target!=='SELF'&&effectCondition(s,a.armyId,e.condition,ctx)&&effectTargets(s,a.armyId,e.target??'SELF',ctx).includes(id))return true;
  }
  return false;
}
export function mainActionCount(s,id){const a=s.armies[id];return a?.mainActionTurn===s.turn?a.mainActionCount??0:(s.attackedArmyIds??[]).includes(id)?1:0;}
export function canMainAction(s,id){return !(s.mapId!=='v1'&&s.c46Disabled!==true&&s.officers[s.armies[id]?.commanderId]?.injury)&&!(s.endedArmyIds??[]).includes(id)&&mainActionCount(s,id)<(hasCampaignRule(s,id,'DOUBLE_ACTION')?2:1)+(s.armies[id]?.c27?.extraTurn===s.turn?1:0);}
export function consumeMainAction(s,id,{attack=false}={}){if(attack&&s.armies[id]?.classState)s.armies[id].classState.hidden=false;
 const a=s.armies[id],count=mainActionCount(s,id)+1;a.mainActionTurn=s.turn;a.mainActionCount=count;
 if(attack&&!s.attackedArmyIds.includes(id))s.attackedArmyIds.push(id);
 const more=count<(hasCampaignRule(s,id,'DOUBLE_ACTION')?2:1)+(a.c27?.extraTurn===s.turn?1:0);
 const move=attack&&(classPostMove(s,id)||hasCampaignRule(s,id,'MOVE_AFTER_ATTACK')&&!s.movedArmyIds.includes(id)||combatCanPostMove(s,id));
 if(!more&&!move&&!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);
}

export function effectCondition(s,source,condition,ctx={}){
  if(!condition)return true;
  if(condition==='TARGET_TITLED')return !!s.campaignGrowth?.officers[s.armies[ctx.targetId]?.commanderId]?.titles?.length;
  if(condition==='ATTACKER_RANGED'){const attacker=s.armies[ctx.targetId];return !!attacker&&(['BT03','BT05'].includes(troopToCampaign(attacker.troopType))||attacker.troopType==='catapult');}
  if(condition==='ATTACKER_CHARGE')return !!s.armies[ctx.targetId]&&isCharge(s,ctx.targetId,source,attackDirection(s,ctx.targetId,source));
  if(condition==='TARGET_LOWER_MIGHT')return (s.officers[s.armies[source]?.commanderId]?.baseStats.strength??0)>(s.officers[s.armies[ctx.targetId]?.commanderId]?.baseStats.strength??Infinity);
  const a=s.armies[source],city=s.cities[ctx.cityId],tile=s.tiles[a?.tileId??city?.tileId];
  if(condition==='TARGET_CITY')return !!s.cities[ctx.targetId];
  if(condition==='FROM_CITY')return !!s.cities[ctx.targetId]&&ctx.when==='ON_DEFEND';
  if(condition==='TARGET_RIVAL')return (s.campaignGrowth?.officers[a?.commanderId??source]?.titles??[]).some(t=>t.opponentId===s.armies[ctx.targetId]?.commanderId);
  if(condition==='FIRST_ROUND')return !!a&&a.effectFirstAttackTurn!==s.turn;
  if(condition==='DEFENDING_CITY')return !!a&&Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId));
  if(condition==='SELF_ORDERED')return !!a&&(a.formation??'ORDERED')==='ORDERED';
  if(condition==='TARGET_DISORDERED')return !!s.armies[ctx.targetId]&&(s.armies[ctx.targetId].formation??'ORDERED')!=='ORDERED';
  if(['FLANK','REAR','CHARGE'].includes(condition)){const attacker=ctx.when==='ON_DEFEND'?ctx.targetId:source,target=ctx.when==='ON_DEFEND'?source:ctx.targetId;const side=ctx.counter?'FRONT':attackDirection(s,attacker,target);return condition==='CHARGE'?!ctx.counter&&isCharge(s,attacker,target,side):condition==='REAR'?side==='REAR':side!=='FRONT';}
  if(condition==='OUTNUMBERED')return !!a&&s.armies[ctx.targetId]?.troopCount>a.troopCount;
  const [kind,arg]=condition.split(':');
  if(kind==='TERRAIN')return tile?.terrainType?.toUpperCase()===arg;
  if(kind==='TROOP')return !!a&&troopToCampaign(a.troopType)===arg;
  if(kind==='HP_BELOW')return !!a&&a.troopCount/(s.personnel?.formations.find(f=>f.formationId===source)?.targetStrength??a.troopCount)*100<Number(arg);
  return false;
}
export function effectTargets(s,source,target,ctx={}){
  const a=s.armies[source];
  if(target==='SELF')return [source];
  if(target==='TARGET')return ctx.targetId?[ctx.targetId]:[];
  if(target==='CITY')return ctx.cityId?[ctx.cityId]:Object.values(s.cities).filter(c=>c.governorId===(a?.commanderId??source)).map(c=>c.cityId);
  if(!a)return [];
  const center=target==='ALL_ALLIES_IN_BATTLE'?s.armies[ctx.targetId]??a:a;
  return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&
    (target==='ADJACENT_ENEMIES'?diplomacyArmyHostile(s,a.armyId,b.armyId):b.factionId===a.factionId)&&
    (target==='ALL_ALLIES_IN_BATTLE'?hexDistance(s.tiles[center.tileId],s.tiles[b.tileId])<=(ctx.rallyRange??2):b.armyId!==source&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)).map(b=>b.armyId);
}
function selected(s,source,whens,ctx={},card=null){
  const id=s.armies[source]?.commanderId??source;
  if(!card&&c28Suppressed(s,source))return [];
  return (card?[card]:officerEffectCards(s,id).map(c=>{const r=c29Record(s,id);return c.traitId===r?.coreId?c29CoreCard(s,source,{...r.cards[c.traitId],rank:c.rank},{...ctx,side:s.armies[ctx.targetId]?attackDirection(s,source,ctx.targetId):undefined,charge:s.armies[ctx.targetId]?isCharge(s,source,ctx.targetId,attackDirection(s,source,ctx.targetId)):false,defending:ctx.when==='ON_DEFEND'}):c;})).flatMap(c=>(c.effects??[])
    .flatMap(e=>e.rule?.startsWith('U_')?expandUniqueEffect(s,source,e,ctx).map((op,i)=>({...op,...(i===0&&c29Aw(s,source,'DROP_CONDITION')?{condition:null}:{}),when:e.when,name:c.name})):e)
    .filter(e=>!DOMESTIC_RULES.includes(e.rule)&&!COMBAT_TITLE_RULES.includes(e.rule)&&!(c.id?.startsWith('CTA-')&&COMMON_TACTIC_RULES.includes(e.rule))&&implementedEffect(e,c)&&whens.includes(e.when)&&(['ADJACENT_ALLIES','ALL_ALLIES_IN_BATTLE'].includes(e.target)||effectCondition(s,source,e.condition,{...ctx,when:e.when})))
    .map(e=>({...e,value:strengthenedValue(e.value,c.rank),name:c.name,traitId:c.traitId,source,targets:(()=>{const own=e.traitId;let targets=effectTargets(s,source,e.target??'SELF',ctx);const r=c29Record(s,source);if(c.traitId===r?.coreId&&s.armies[source]&&(c29Aw(s,source,'SHARE_ADJ')||c29Aw(s,source,'RANGE_UP'))){const a=s.armies[source],allies=Object.values(s.armies).filter(b=>b.armyId!==source&&(e.target==='ADJACENT_ENEMIES'?diplomacyArmyHostile(s,a.armyId,b.armyId):b.factionId===a.factionId)&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=(e.target==='SELF'?1:e.target==='ALL_ALLIES_IN_BATTLE'?3:2)).sort((a,b)=>a.armyId.localeCompare(b.armyId));if(e.target==='SELF'&&allies[0])targets=[...targets,allies[0].armyId];else if(c29Aw(s,source,'RANGE_UP')&&['ADJACENT_ALLIES','ADJACENT_ENEMIES','ALL_ALLIES_IN_BATTLE'].includes(e.target))targets=[...new Set([...targets,...allies.map(a=>a.armyId)])];}return targets;})()})));
}
function activeState(s,e){return e.expiresTurn>=s.turn;}
export function unitStatuses(s,id){return [...new Set((s.armies[id]?.effectStates??[]).filter(e=>e.op==='STATUS_APPLY'&&activeState(s,e)).map(e=>e.status))];}
export function effectModifiers(s,recipient,whens=['PASSIVE'],ctx={}){
  const lines=[];const values=Object.fromEntries(EFFECT_OPS.map(op=>[op,0]));const r=c29Record(s,recipient);if(r?.c29?.spellbladeTurn===s.turn&&!ctx.tactic&&whens.includes('ON_ATTACK'))values.DAMAGE_MOD+=20;if(r?.c29?.awakenings.some(a=>a.rule==='DOUBLE_OR_NOTHING')&&whens.includes('ON_DEFEND'))values.DEFENSE_MOD-=10;
  const sources=ctx.sources??[{id:recipient,whens}];
  const effects=sources.flatMap(x=>selected(s,x.id,['PASSIVE',...x.whens],x.ctx??ctx,x.card??null));
  // Nearby passive auras are evaluated from current geometry, never cached.
  for(const a of Object.values(s.armies))if(!sources.some(x=>x.id===a.armyId)&&castleArmyActive(s,a))
    effects.push(...selected(s,a.armyId,['PASSIVE'],ctx).filter(e=>e.target!=='SELF'||e.targets.includes(recipient)));
  // Signature auras use the same numeric ops, selected at current geometry.
  for(const a of Object.values(s.armies))if(a.armyId!==recipient&&castleArmyActive(s,a))for(const c of officerEffectCards(s,a.commanderId))for(const e of c.effects??[])if(e.rule?.startsWith('U_'))for(const op of uniqueOps({s,source:a.armyId,recipient,e,ctx}))if(['U_HERO_OF_CHAOS','U_TALENT_USE','U_MARTIAL_SAINT','U_SAVAGE_HERO','U_FATAL_BEAUTY','U_DEATH_REMONSTRANCE'].includes(e.rule)||C34_RULES.has(e.rule))effects.push({...op,source:a.armyId,traitId:c.traitId,name:c.name,targets:[recipient]});
  const stored=((s.armies[recipient]??s.cities[recipient]??s.officers[recipient])?.effectStates??[]).filter(e=>activeState(s,e)&&e.startsTurn<=s.turn&&!c28Suppressed(s,e.source)&&!(s.mapId!=='v1'&&s.c46Disabled!==true&&s.officers[e.source]?.injury&&Object.values(s.cities).some(c=>c.governorId===e.source)));
  const fresh=effects.filter(e=>!stored.some(b=>b.source===e.source&&b.traitId===e.traitId&&b.op===e.op&&b.when===e.when&&b.resource===e.resource));
  for(const e of [...fresh,...stored.map(e=>({...e,targets:[recipient]}))]){
    if(!(e.op==='DAMAGE_MOD'&&e.when==='ON_TACTIC_USE'&&e.target==='TARGET'?e.source===recipient:e.targets.includes(recipient))||!numeric.has(e.op)||e.op==='INITIATIVE_MOD'&&s.armies[recipient]?.effectFirstAttackTurn===s.turn)continue;
    if(['ADJACENT_ALLIES','ALL_ALLIES_IN_BATTLE'].includes(e.target)&&!effectCondition(s,recipient,e.condition,{...(sources.find(x=>x.id===recipient)?.ctx??ctx),when:e.when}))continue;
    if(e.op==='CITY_OUTPUT_MOD'&&ctx.resource&&e.resource!==ctx.resource)continue;
    const share=e.source!==recipient&&e.traitId===c29Record(s,e.source)?.coreId&&e.target==='SELF'&&c29Aw(s,e.source,'SHARE_ADJ')?.params.ratio/100||1;values[e.op]+=e.value*share;lines.push(`${e.name??'특기'} ${e.value>=0?'+':''}${e.value}${['MOVE_MOD','OCCUPATION_SPEED'].includes(e.op)?'칸/턴':'%'}`);
  }
  const extra=c33Mods(s,recipient,whens,ctx);values.DAMAGE_MOD+=extra.DAMAGE_MOD;values.DEFENSE_MOD+=extra.DEFENSE_MOD;lines.push(...extra.lines);return {...values,lines};
}
export function aptitudePercent(s,id){return 0;}
export function damageEffects(s,attacker,target,{counter=false,tactic=null,first=true,charge=isCharge(s,attacker,target),classDamage=0}={}){
  const events=counter?['ON_COUNTER']:['ON_ATTACK',...(first&&s.armies[attacker]?.effectFirstAttackTurn!==s.turn?['BATTLE_START']:[])];
  const sources=[{id:attacker,whens:events},{id:target,whens:['ON_DEFEND'],ctx:{targetId:attacker,when:'ON_DEFEND',counter}}];
  if(tactic)sources.push({id:attacker,whens:['ON_TACTIC_USE'],card:tactic});
  const offense=effectModifiers(s,attacker,events,{targetId:target,sources,counter,tactic}),defense=effectModifiers(s,target,['ON_DEFEND'],{targetId:target,sources,counter,tactic});
  const aptitude=aptitudePercent(s,attacker),inspired=unitStatuses(s,attacker).includes('INSPIRED')?10:0;
  const blood=hasCampaignRule(s,attacker,'BLOOD_PRICE'),noRetreat=hasCampaignRule(s,target,'NO_RETREAT');
  const bond=c30Damage(s,attacker,target,{charge:!counter&&charge});defense.DEFENSE_MOD+=bond.defense;
  const special=classDamage+bond.damage+c28DamageBonus(s,attacker,target)+offense.DAMAGE_MOD+(counter?offense.COUNTER_MOD:0)+(first&&!counter?offense.INITIATIVE_MOD/2:0)+inspired;
  return {factor:(blood?1.5:1)*(noRetreat?.7:1)*(counter&&hasCampaignRule(s,target,'BLOOD_PRICE')?2:1)*Math.max(0,1+special/100)*(1+aptitude/100)*Math.max(0,1-defense.DEFENSE_MOD/100),special,aptitude,defense:defense.DEFENSE_MOD,
    lines:[...bond.lines,...(blood?[ruleLine(s,attacker,'BLOOD_PRICE','주는 피해 +50%')]:[]),...(noRetreat?[ruleLine(s,target,'NO_RETREAT','받는 피해 −30%')]:[]),...(counter&&hasCampaignRule(s,target,'BLOOD_PRICE')?[ruleLine(s,target,'BLOOD_PRICE','받는 반격 2배')]:[]),...(special?[`${tactic?'전법':'특기'} ${special>=0?'+':''}${special}%`]:[]),...(aptitude?[`적성 ${aptitude>0?'+':''}${aptitude}%`]:[]),...(defense.DEFENSE_MOD?[`방어 특기 −${defense.DEFENSE_MOD}%`]:[])]};
}
export function healCampaignTroops(s,id,value){
  if(!c29Recovery(s,id))return 0;
  const a=s.armies[id],f=s.personnel.formations.find(f=>f.formationId===id);if(!a||!f||!castleArmyActive(s,a))return;
  let remaining=Math.min(Math.max(0,Math.floor(value*c28RecoveryFactor(s,id)*c34Recovery(s,id))),f.targetStrength-f.field);
  for(const lot of [...s.personnel.lots].filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id&&l.count>0&&JSON.stringify(l.identity)===JSON.stringify(f.identity))){
    const count=Math.min(remaining,lot.count);if(!count)break;
    const key=`FX.${++s.campaignEffects.sequence}`;
    s.personnel=recoverWoundedPersonnel(s.personnel,{operationId:`R.${key}`,expectedRevision:s.personnel.revision,woundedLotId:lot.lotId,recoveredLotId:key,count,authorizationRef:key},{canRecover:()=>true,hasReturnRoute:()=>true}).ledger;
    let capacity=createTransportCapacity({periodId:key,resources:[{resourceId:'effect',capacity:count}]});
    capacity=reserveTransportCapacity(capacity,{reservationId:key,payloadRef:key,loads:[{resourceId:'effect',amount:count}]});
    const dispatched=dispatchPersonnelTransport({ledger:s.personnel,capacity},{operationId:`D.${key}`,expectedRevision:s.personnel.revision,transportId:key,sourceLotId:key,destination:{type:'FORMATION',id},destinationNodeId:f.nodeId,count,departureAt:s.globalTick,arrivalAt:s.globalTick+1,reservationId:key,authorizationRef:key},{canTransport:()=>true});
    s.personnel=arrivePersonnelTransport(dispatched.ledger,{operationId:`A.${key}`,expectedRevision:dispatched.ledger.revision,transportId:key,now:s.globalTick+1,authorizationRef:key},{canArrive:()=>true}).ledger;
    if(c28Enabled(s))a.c28Recovered=(a.c28Recovered??0)+count;a.troopCount+=count;a.woundedCount=Math.max(0,a.woundedCount-count);remaining-=count;
  }
}
// A recipient whose faction already acted retains off-turn effects through its next turn.
function offTurnExpiry(s,a,duration){return a&&duration>0&&s.activeFactionId!==a.factionId?{expiresFactionId:a.factionId}:{};}
function effectExpiry(s,a,start,duration){return start+Math.max(1,duration??0)-1+(a&&start===s.turn&&s.activeFactionId!==a.factionId&&s.campaignEffects.startedTurns[a.factionId]===s.turn?1:0);}
export function triggerEffects(s,source,when,ctx={},card=null){
  initializeCampaignEffects(s);
  for(const e of selected(s,source,[when],ctx,card)){
    for(const id of e.targets){
      const a=s.armies[id];
      if(when!=='PASSIVE'&&['ADJACENT_ALLIES','ALL_ALLIES_IN_BATTLE'].includes(e.target)&&e.condition&&numeric.has(e.op)) {
        a.effectStates??=[];const {targets,...state}=e;a.effectStates.push({...state,startsTurn:s.turn,expiresTurn:effectExpiry(s,a,s.turn,e.duration),...offTurnExpiry(s,a,e.duration)});continue;
      }
      if(['ADJACENT_ALLIES','ALL_ALLIES_IN_BATTLE'].includes(e.target)&&!effectCondition(s,id,e.condition,{...ctx,when}))continue;
      if(e.op==='RULE'&&campaignRuleRegistered(e.rule)&&!CAMPAIGN_RULES.includes(e.rule)){executeCampaignRule(e.rule,{s,source,recipient:id,e,ctx,when});}
      else if(e.op==='MORALE_DELTA'&&a&&castleArmyActive(s,a)){
        if(ctx.deferFormation){a.combatMoraleEffects??=[];a.combatMoraleEffects.push({value:e.value,reason:e.name});continue;}
        if(e.value<0)checkMorale(s,id,e.name,Math.abs(e.value));
        else if(e.value>0)changeMorale(s,id,a.morale==='ROUTING'?'SHAKEN':'STEADY',e.name);
      }else if(e.op==='FORMATION_DELTA'&&a&&castleArmyActive(s,a)){
        if(ctx.deferFormation){if(e.value<0)a.formationWeight=(a.formationWeight??0)+Math.abs(e.value);else if(e.value>0)a.formationRecovery=(a.formationRecovery??0)+1;}
        else {const changes=ctx.formationChanges??[];const start=changes.length;if(e.value<0)checkFormation(s,id,Math.abs(e.value),changes);else if(e.value>0)changeFormation(s,id,-1,changes);if(changes.slice(start).some(f=>f.to==='BROKEN'))checkMorale(s,id,'전열 붕괴',C12.collapseMorale,ctx.moraleChanges);}
      }else if(e.op==='HEAL_TROOPS'&&a)healCampaignTroops(s,id,e.value*(id!==source&&e.target==='SELF'&&c29Aw(s,source,'SHARE_ADJ')?.params.ratio/100||1));
      else if(e.op==='STATUS_APPLY'&&a&&statuses.has(e.status)){
        if(c33Immune(s,id,e.status,source)||uniqueImmune(s,id,e.status)||card&&c28ControlGuard(s,id,e.status))continue;
        if(e.status==='DEMORALIZED')changeMorale(s,id,'SHAKEN',e.name);
        const next=['SLOWED','ROOTED','CONFUSED'].includes(e.status),start=s.turn+(next&&s.campaignEffects.startedTurns[a.factionId]===s.turn?1:0);
        const {targets,...state}=e;
        a.effectStates.push({...state,startsTurn:start,expiresTurn:effectExpiry(s,a,start,e.duration),...offTurnExpiry(s,a,e.duration)});
      }else if(e.op==='RULE'&&CAMPAIGN_RULES.includes(e.rule)&&a&&when!=='PASSIVE'){
        const {targets,...state}=e;a.effectStates.push({...state,startsTurn:s.turn,expiresTurn:effectExpiry(s,a,s.turn,e.duration),...offTurnExpiry(s,a,e.duration)});
      }else if(numeric.has(e.op)&&(a||s.cities[id]||s.officers[id])&&when!=='PASSIVE'&&!(combatModifiers.has(e.op)&&['ON_ATTACK','BATTLE_START','ON_DEFEND','ON_COUNTER'].includes(when)&&!(e.duration>0))&&!(when==='ON_TACTIC_USE'&&ctx.immediateNumeric&&e.op==='DAMAGE_MOD')&&!(when==='TURN_SETTLE'&&['CITY_OUTPUT_MOD','OCCUPATION_SPEED'].includes(e.op))){
        const {targets,...state}=e;
        const recipient=a??s.cities[id]??s.officers[id];recipient.effectStates??=[];
        const start=s.turn+(e.op==='MOVE_MOD'&&['ON_ATTACK','ON_COUNTER','ON_KILL'].includes(when)?1:0);
        recipient.effectStates.push({...state,value:state.value*(id!==source&&e.target==='SELF'&&c29Aw(s,source,'SHARE_ADJ')?.params.ratio/100||1),startsTurn:start,expiresTurn:s.cities[id]?start+Math.max(1,e.duration??0):effectExpiry(s,a,start,e.duration),...offTurnExpiry(s,a,e.duration)});
      }
    }
    c29TraitTriggered(s,source,e,e.targets);
    const o=s.officers[s.armies[source]?.commanderId??source];
    // Registered event/query rules record their committed effect at their own
    // hook. Merely reading a passive rule is not an activation.
    if(e.targets.length&&(e.op!=='RULE'||CAMPAIGN_RULES.includes(e.rule)&&when!=='PASSIVE'))s.campaignEffects.log.push({turn:s.turn,factionId:o?.allegianceFactionId,text:`${o?.name??source} · ${e.name}: ${when==='BATTLE_START'?'첫 공격 ':''}${e.op==='RULE'?'발동':e.op==='STATUS_APPLY'?STATUS_KO[e.status]??e.status:`${e.value>=0?'+':''}${e.op==='INITIATIVE_MOD'?e.value/2:e.value}${e.op.endsWith('_MOD')?'%':''}`}`});
  }
  return s;
}
export function prepareAttackEffects(state,id,target,{counter=false,tactic=null,first=true}={}){
  const s=structuredClone(state);initializeCampaignEffects(s);if(!counter)turnFacing(s,id,target);
  if(!counter){delete s.armies[id].c28ExposeTurn;}
  if(!counter&&!tactic)c28Expose(s,id,target,{commit:true});
  if(first&&!counter&&s.armies[id].effectFirstAttackTurn!==s.turn)triggerEffects(s,id,'BATTLE_START',{targetId:target,deferFormation:true});
  triggerEffects(s,id,counter?'ON_COUNTER':'ON_ATTACK',{targetId:target,deferFormation:true,counter});triggerEffects(s,target,'ON_DEFEND',{targetId:id,deferFormation:true,counter});
  if(tactic)triggerEffects(s,id,'ON_TACTIC_USE',{targetId:target,immediateNumeric:true,deferFormation:true},tactic);
  return s;
}
export function startFactionEffects(s,factionId){
  initializeCampaignEffects(s);
  if(s.campaignEffects.startedTurns[factionId]===s.turn)return s;
  if(s.activeFactionId&&s.activeFactionId!==factionId)finishFactionRules(s,s.activeFactionId);
  s.activeFactionId=factionId;
  s.campaignEffects.startedTurns[factionId]=s.turn;c30Start(s,factionId);c29Start(s,factionId);
  for(const a of Object.values(s.armies))if(a.factionId===factionId&&castleArmyActive(s,a)){
    c34RemoveStatuses(s,a.armyId,e=>!activeState(s,e));
    triggerEffects(s,a.armyId,'PASSIVE');triggerEffects(s,a.armyId,'ROUND_START');
    if(Object.values(s.armies).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1&&hasCampaignRule(s,b.armyId,'TERROR')))checkMorale(s,a.armyId,'[악성전려]',10);
  }
  for(const c of Object.values(s.cities))if(c.ownerFactionId===factionId&&c.governorId){triggerEffects(s,c.governorId,'PASSIVE',{cityId:c.cityId});triggerEffects(s,c.governorId,'ROUND_START',{cityId:c.cityId});}
  domesticStartFaction(s,factionId);
  combatStartFaction(s,factionId);c33Start(s,factionId);
  return s;
}
export function settleEffects(s){
  initializeCampaignEffects(s);
  for(const a of Object.values(s.armies))if(castleArmyActive(s,a))triggerEffects(s,a.armyId,'TURN_SETTLE');
  for(const f of Object.keys(s.factions))finishFactionRules(s,f);
  for(const c of Object.values(s.cities))if(c.governorId)triggerEffects(s,c.governorId,'TURN_SETTLE',{cityId:c.cityId});
  return s;
}
export function movementEffect(s,id){
  const a=s.armies[id],active=(a.effectStates??[]).filter(e=>activeState(s,e)&&e.startsTurn<=s.turn&&!c28Suppressed(s,e.source));
  const c27=combatMovement(s,id),c33=c33Movement(s,id);c27.rooted ||= c33.rooted;c27.delta+=c33.delta;
  if(a.c34?.rootTurn===s.turn||a.c29?.rootedUntil>=s.turn||c27.rooted||active.some(e=>e.status==='ROOTED'||e.op==='MOVE_MOD'&&e.value<=-99&&e.traitId?.includes('.c33.')))return {rooted:true,delta:0,max:c27.max};
  return {rooted:false,delta:c31Move(s,id)+c30Move(s,id)+effectModifiers(s,id).MOVE_MOD+(a.c26?.startedTurn===s.turn?a.c26.move??0:0)-(active.some(e=>e.status==='SLOWED')?2:0)+c27.delta,max:c27.max};
}
export function attackConfused(s,id){return (s.armies[id]?.effectStates??[]).some(e=>e.status==='CONFUSED'&&e.startsTurn<=s.turn&&activeState(s,e));}
export function tacticCooldown(card){return card.cooldown??(card.cost==null?2:Math.min(3,Math.max(1,Math.ceil(card.cost/10))));}
export function tacticIsDamage(card){return c33Card(card)&&card.effects.some(e=>['FLANK_RAID','VOLLEY','REPEATER','ROCKSLIDE','WHIRLWIND','RAM','INFERNO','FIRE_ARROW'].includes(e.rule))||uniqueTacticIsDamage(card)||(card.effects??[]).some(e=>e.op==='DAMAGE_MOD'&&e.when==='ON_TACTIC_USE')||combatTacticRule(card)?.rule==='DUAL_STRIKE';}
// One live eligibility query serves the public cards, preview and execution.
export function tacticAvailability(s,id,card,targetId){
 const a=s.armies[id],waiting=card.signature?Math.max(0,100-(c29Record(s,id)?.c29?.gauge??0),(a?.tacticReadyTurns?.[card.traitId]??0)-s.turn):Math.max(0,(a?.tacticReadyTurns?.[card.traitId]??0)-s.turn);
 const archery=tacticIsDamage(card)&&a?archerAttackReason(s,id):'';
 let targets=withdrawalProtection(s,id)||archery?[]:rawTacticTargets(s,id,card).filter(target=>!diplomacyAttackReason(s,id,target));
 if(card.effects.some(e=>e.rule==='U_STORM_CAMP'))targets=targets.filter(target=>cityAttackTargets(s,id).includes(target));
 const areaRule=card.effects.find(e=>e.rule?.startsWith('U_')||e.rule==='WHIRLWIND')?.rule;
 const areaRange={U_MOUNTAIN_FALL:1,U_SHAKE_THE_REALM:1,U_FLAME_DANCE:1,WHIRLWIND:1,U_KING_ROAR:2,U_CHANGBAN_SHOUT:2}[areaRule];
 if((tacticIsDamage(card)||areaRange!==undefined)&&targets.includes(id)){
  const range=areaRange??card.range??0;
  if(!Object.values(s.armies).some(b=>castleArmyActive(s,b)&&diplomacyArmyHostile(s,id,b.armyId)&&s.knowledge[a.factionId].tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=range))targets=[];
 }
 let reason='',reasonCode='';
 if(!a||!castleArmyActive(s,a)){reasonCode='TACTIC_ARMY_INACTIVE';reason='패배하거나 해산된 부대는 전법을 사용할 수 없습니다.';}
 else if(a.morale==='ROUTING'){reasonCode='TACTIC_ROUTING';reason='패주 중에는 전법을 사용할 수 없습니다.';}
 else if(!canMainAction(s,id)){reasonCode='MAIN_ACTION_USED';reason='이번 차례 주 행동을 이미 사용했습니다.';}
 else if(waiting){reasonCode='TACTIC_NOT_READY';reason=card.signature?'고유 전법의 기세 또는 재사용 대기를 확인하십시오.':`전법 재사용까지 ${waiting}차례 남았습니다.`;}
 else if(archery){reasonCode=archery;reason=archery;}
 else if(attackConfused(s,id)){reasonCode='TACTIC_CONFUSED';reason='혼란 중에는 전법을 사용할 수 없습니다.';}
 else if(targetId!==undefined&&s.cities[targetId]&&!targets.includes(targetId)){
  const city=s.cities[targetId];reasonCode='INVALID_CAMPAIGN_CITY_ATTACK';
  reason=city.ownerFactionId===a.factionId?'아군 성에는 이 전법을 사용할 수 없습니다.':city.durability<=0?'이미 성벽이 무너진 성입니다.':s.knowledge[a.factionId].tiles[city.tileId]!=='VISIBLE'?'현재 보이는 성을 지정하십시오.':hexDistance(s.tiles[a.tileId],s.tiles[city.tileId])>(card.range??0)+(c33Card(card)?c33Range(s,id,card):0)?'성에 전법 사거리가 닿지 않습니다.':'성벽 부수기 돌격은 일반 성 공격이 가능한 성문·공성 위치에서 사용하십시오. 성 안의 수비 부대도 확인하십시오.';
 }
 else if(!targets.length){reasonCode='NO_VALID_TACTIC_TARGET';reason='전법의 범위 안에 유효한 대상이 없습니다.';}
 else if(targetId!==undefined&&!targets.includes(targetId)){reasonCode='INVALID_CAMPAIGN_TACTIC';reason=diplomacyAttackReason(s,id,targetId)||'이 전법을 사용할 수 있는 대상을 지정하십시오.';}
 return {targets,waiting,reason,reasonCode,reasonText:reasonCode===archery&&archery?'적과 붙은 원거리보병은 공격 전법을 사용할 수 없습니다.':reason,canUse:!reason};
}
export function tacticTargets(s,id,card){return tacticAvailability(s,id,card).targets;}
function rawTacticTargets(s,id,card){
  const a=s.armies[id];if(!a||a.c34?.noTacticUntil>=s.turn||a.c33?.bideUntil>=s.turn||a.c33?.drillTurn===s.turn||!castleArmyActive(s,a)||a.morale==='ROUTING'||attackConfused(s,id)||!canMainAction(s,id)||!cardEffectReady(card)||(a.tacticReadyTurns?.[card.traitId]??0)>s.turn)return [];
  if(card.signature&&c29Record(s,id).c29.gauge<100)return [];
  if(c33Card(card))return c33Targets(s,id,card,{hidden:target=>ambushHidden(s,target,a.factionId)});
  if(card.commonBase||card.id?.startsWith('CTA-'))return commonTacticTargets(s,id,card);
  const unique=uniqueTacticTargets(s,id,card,{visible:tile=>s.knowledge[a.factionId].tiles[tile]==='VISIBLE',hidden:target=>ambushHidden(s,target,a.factionId)});if(unique!==null)return unique;
  if(tacticIsDamage(card)&&archerAttackReason(s,id))return [];
  const range=card.range??((card.effects??[]).some(e=>['TARGET','ADJACENT_ENEMIES'].includes(e.target))?1:0);
  if(range===0)return tacticIsDamage(card)?[]:[id];
  const visibility=s.knowledge[a.factionId].tiles;
  const hostile=tacticIsDamage(card)||card.effects.some(e=>e.target==='TARGET'&&(e.value<0||e.op==='STATUS_APPLY'&&e.status!=='INSPIRED'));
  return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&visibility[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=range&&(!tacticIsDamage(card)||troopToCampaign(a.troopType)!=='BT03'||hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])>1)&&
    (hostile?diplomacyArmyHostile(s,a.armyId,b.armyId):b.factionId===a.factionId)).map(b=>b.armyId).sort();
}
export function campaignTactics(s,id){const r=c29Record(s,id);if(!r)return [];return [...officerEffectCards(s,s.armies[id]?.commanderId,{tactics:true}).filter(c=>!(c33Owned(s,id,'DIVINE_CALC')&&[c.classTag].flat().includes('무용'))&&(r.equippedTacticIds??[]).includes(c.traitId)||r.c29&&c.traitId===r.representativeId).map(c=>c29TacticCard(s,id,c)),...[c30Joint(s,id)].filter(Boolean)].map(c=>c30TacticCard(s,id,{...c,cooldown:c.signature?0:c.jointArmyIds?3:c33Cooldown(s,id,{...c,cooldown:uniqueCooldownTurns(s,id,tacticCooldown(c))})})).map(c=>c31Tactic(s,id,c)).map(c=>({...c,...tacticAvailability(s,id,c)}));}

export function ruleLine(s,id,rule,detail=''){
 const cards=[...officerEffectCards(s,s.armies[id]?.commanderId??id),...officerEffectCards(s,s.armies[id]?.commanderId??id,{tactics:true})].filter(c=>c.effects?.some(e=>e.op==='RULE'&&e.rule===rule));
 const card=cards.find(c=>c.rarity==='MYTHIC')??cards[0];
 const stored=s.armies[id]?.effectStates?.find(e=>e.op==='RULE'&&e.rule===rule&&activeState(s,e)&&e.startsTurn<=s.turn);
 // 미등록 규칙은 시험 표기: 새 설정 이름을 만들지 않고 짧은 일반명으로 표시.
 return `[${card?.name??stored?.name??CAMPAIGN_RULE_NAMES[rule]??'특기'}]${detail?' '+detail:''}`;
}
export function ambushHidden(s,id,factionId){return memoCampaignQuery(s,'hidden:'+id+':'+factionId,()=>ambushHiddenUncached(s,id,factionId));}
function ambushHiddenUncached(s,id,factionId){if(c34Reveal(s,id,factionId))return false;
 if(c33Enabled(s)&&Object.values(s.armies).some(a=>a.factionId===factionId&&castleArmyActive(s,a)&&troopToCampaign(a.troopType)==='BT03'&&c33Owned(s,a.armyId,'SHOOT_INTO_FOREST')&&hexDistance(s.tiles[a.tileId],s.tiles[s.armies[id].tileId])<=2))return false;
 const a=s.armies[id];if(Object.values(s.armies).some(b=>b.factionId===factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=C28.scoutRange&&c28Rule(s,b.armyId,'SCOUT_EYE')))return false;return a.factionId!==factionId&&(a.c32?.hiddenUntil>=s.turn||!!a.c27?.ambush||['forest','hill'].includes(s.tiles[a.tileId].terrainType)&&hasCampaignRule(s,id,'AMBUSH')&&!Object.values(s.armies).some(b=>b.factionId===factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=1));
}
export function recallDestination(s,id){
 const a=s.armies[id];if(!a)return null;
 return Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId&&!Object.values(s.armies).some(b=>castleArmyActive(s,b)&&b.tileId===c.tileId)).sort((c,d)=>hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])-hexDistance(s.tiles[a.tileId],s.tiles[d.tileId])||c.cityId.localeCompare(d.cityId))[0]?.tileId??null;
}
export function recallReason(s,id){
 const a=s.armies[id];return !a||!hasCampaignRule(s,id,'RECALL')?'귀환 특기 없음':!castleArmyActive(s,a)||a.morale==='ROUTING'?'행동 불가':!canMainAction(s,id)?'주 행동 사용 완료':hasCampaignRule(s,id,'NO_RETREAT')&&Object.values(s.armies).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)?'적과 인접하여 이동 불가':!recallDestination(s,id)?'빈 아군 성 중심 없음':'';
}
export function surviveRule(s,id,loss,commit=true,lines=null){
 loss=c34DamageLimit(s,id,loss,commit);loss=c33Limit(s,id,loss,commit);loss=uniqueDamageLimit(s,id,loss);
 if(commit&&loss>0&&s.armies[id]?.c32?.restHits>0)s.armies[id].c32.restHits--;
 const beforeLives=loss;loss=combatSurvive(s,id,loss,commit);
 if(loss<beforeLives)lines?.push(combatRuleLine(s,id,'NINE_LIVES','병력 5%로 패주'));
 const a=s.armies[id];if(loss>=a.troopCount&&a.lastStandKey!==`${s.turn}.${s.activeFactionId??s.playerFactionId}`&&hasCampaignRule(s,id,'LAST_STAND')){if(commit)a.lastStandKey=`${s.turn}.${s.activeFactionId??s.playerFactionId}`;lines?.push(ruleLine(s,id,'LAST_STAND',`병력 ${troopText(1)}명으로 생존`));return a.troopCount-1;}return loss;
}
export function finishFactionRules(s,factionId){
 for(const a of Object.values(s.armies))if(a.factionId===factionId&&a.starVanguardTurn<s.turn)delete a.starVanguardTurn;
 if(s.campaignEffects?.startedTurns[factionId]===s.turn)c34Finish(s,factionId);
 c30Finish(s,factionId,x=>creditCampaignGrowth(s,x));
 for(const a of Object.values(s.armies))if(a.factionId===factionId&&s.campaignEffects?.startedTurns[factionId]===s.turn)c34RemoveStatuses(s,a.armyId,e=>e.expiresFactionId===factionId&&e.expiresTurn<=s.turn);
 for(const a of Object.values(s.armies))if(a.factionId===factionId&&castleArmyActive(s,a)&&a.ruleMovedTurn===s.turn&&a.forcedMarchTurn!==s.turn&&hasCampaignRule(s,a.armyId,'FORCED_MARCH')){
  a.forcedMarchTurn=s.turn;changeMorale(s,a.armyId,'SHAKEN',ruleLine(s,a.armyId,'FORCED_MARCH','이동한 차례 끝'));
 }
 return s;
}

export function mirroredCombatCard(s,id){const card=s.armies[id]?.c27?.lastHitTactic;return card&&combatTacticRule(card)?.rule!=='MIRROR'?card:null;}
export function commonTacticTargets(s,id,card){
 const a=s.armies[id],e=combatTacticRule(card),rule=e?.rule,range=card.range??0,k=s.knowledge[a.factionId];
 const near=tile=>k.tiles[tile]==='VISIBLE'&&hexDistance(s.tiles[a.tileId],s.tiles[tile])<=range;
 if(['OVERWATCH','PIERCE'].includes(rule)&&troopToCampaign(a.troopType)!=='BT03')return [];
 if(tacticIsDamage(card)&&archerAttackReason(s,id))return [];
 if(rule==='MIRROR'){const copy=mirroredCombatCard(s,id);return copy&&(a.tacticReadyTurns[copy.traitId]??0)<=s.turn?tacticTargets(s,id,{...copy,traitId:card.traitId}):[];}
 if(rule==='INSIDE_AGENT')return Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId&&near(c.tileId)).map(c=>c.cityId).sort();
 if(rule==='FIRE_ATTACK')return Object.values(s.tiles).filter(t=>near(t.tileId)&&t.terrainType==='forest').map(t=>t.tileId).sort();
 if(rule==='FLOOD')return s.mapRules.riverEdges.filter(edge=>s.mapRules.riverEdges.some(other=>other!==edge&&other.split('|').some(t=>edge.split('|').includes(t)))&&edge.split('|').some(near)&&!(s.c27?.floods??[]).some(f=>f.until>=s.turn&&f.edges.includes(edge))).sort();
 if(range===0){if(rule==='AMBUSH'&&s.tiles[a.tileId].terrainType!=='forest')return [];if(rule==='FEIGNED_RETREAT'&&!combatRetreatPath(s,id,e.params?.back??2).length)return [];return [id];}
 return Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&near(b.tileId)&&!ambushHidden(s,b.armyId,a.factionId)&&(rule==='SWAP'?b.factionId===a.factionId&&b.armyId!==id:diplomacyArmyHostile(s,a.armyId,b.armyId))&&(!tacticIsDamage(card)||troopToCampaign(a.troopType)!=='BT03'||hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])>1)&&(!['DUAL_STRIKE','WOODPECKER'].includes(rule)||combatAlly(s,id,b.armyId,{behind:rule==='WOODPECKER'}))).map(b=>b.armyId).sort();
}
export function combatRetreatPath(s,id,count){
 const a=s.armies[id],foes=Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&castleArmyActive(s,b)),path=[],temp={...s,armies:{...s.armies,[id]:{...a}}};
 const distance=t=>foes.length?Math.min(...foes.map(b=>hexDistance(s.tiles[t],s.tiles[b.tileId]))):0;
 for(let n=0;n<Math.floor(count);n++){const at=temp.armies[id].tileId,choices=neighbors(s.tiles[at]).map(p=>`${p.q},${p.r}`).filter(to=>combatEmptyStep(temp,id,to)&&distance(to)>distance(at)).sort((x,y)=>distance(y)-distance(x)||x.localeCompare(y));if(!choices.length)break;temp.armies[id].tileId=choices[0];path.push(choices[0]);}return path;
}
export function commonTacticAiUseful(s,id,card,target){
 if(c33Card(card))return c33AiUseful(s,id,card,target);
 const rule=combatTacticRule(card)?.rule,a=s.armies[id],t=s.armies[target];
 if(['FEIGNED_RETREAT','WOODPECKER','MIRROR','FLOOD'].includes(rule))return false;
 if(!card.id?.startsWith('CTA-'))return true;
 if(tacticIsDamage(card))return true;
 if(rule==='SWAP')return t.morale==='SHAKEN'||t.formation!=='ORDERED';
 if(rule==='TAUNT')return t.facing!==directionToward(s.tiles[t.tileId],s.tiles[a.tileId]);
 if(rule==='FALSE_ORDERS')return s.officers[a.commanderId].baseStats.intelligence+c30Strategy(s,id)>s.officers[t.commanderId].baseStats.intelligence;
 if(rule==='MORALE_CONTEST')return s.officers[a.commanderId].baseStats.leadership>s.officers[t.commanderId].baseStats.leadership;
 if(rule==='INSIDE_AGENT')return s.cities[target].durability>0&&!s.cities[target].c27?.insideUntil;
 if(rule==='FIRE_ATTACK')return Object.values(s.armies).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&b.tileId===target&&castleArmyActive(s,b));
 if(rule==='AMBUSH')return !a.c27?.ambush;
 if(rule==='STAKES'||rule==='OVERWATCH')return Object.values(s.armies).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&castleArmyActive(s,b)&&s.knowledge[a.factionId].tiles[b.tileId]==='VISIBLE'&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=2);
 if(card.id==='CTA-05')return [a,...Object.values(s.armies).filter(b=>b.factionId===a.factionId&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)].some(b=>b.morale!=='STEADY');
 return true;
}

const wallSiege=(s,id,c)=>hasCampaignRule(s,id,'SIEGE_FROM_WALL')&&c.footprint.walls.some(w=>hexDistance(s.tiles[w],s.tiles[s.armies[id].tileId])===1)&&hexDistance(s.tiles[c.tileId],s.tiles[s.armies[id].tileId])===2;
export function cityAttackTargets(s,id) {
  const a=s.armies[id];
  if(!a||a.c34?.disarmUntil>=s.turn||a.c32?.disarmUntil>=s.turn||archerAttackReason(s,id)||attackConfused(s,id)||!castleArmyActive(s,a)||a.morale==='ROUTING'||!canMainAction(s,id))return [];
  return Object.values(s.cities).filter(c=>s.knowledge[a.factionId].tiles[c.tileId]==='VISIBLE'&&(troopToCampaign(a.troopType)!=='BT03'||hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])>1&&(!(specialTroop(s,a.troopType)&&a.troopType==='catapult')? !c.footprint.gates.some(g=>hexDistance(s.tiles[a.tileId],s.tiles[g])<=1):true))&&!diplomacyAttackReason(s,id,c.cityId)&&c.ownerFactionId!==a.factionId&&(c.footprint.gates.includes(a.tileId)||wallSiege(s,id,c)||specialTroop(s,a.troopType)&&a.troopType==='catapult'&&hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])===2)&&
    (wallSiege(s,id,c)||specialTroop(s,a.troopType)&&a.troopType==='catapult'||!Object.values(s.armies).some(d=>d.tileId===c.tileId&&castleArmyActive(s,d)))).map(c=>c.cityId).sort();
}
