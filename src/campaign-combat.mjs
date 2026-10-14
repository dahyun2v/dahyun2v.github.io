import {fatigueCombat} from './campaign-fatigue.mjs';
import {supplyCombat,supplyCombatLoot,supplyCityLoot} from './campaign-supply.mjs';
import {rememberDiplomacyCombat,diplomacyEnabled,diplomacyArmyHostile,diplomacyAttackReason,diplomacyHostile,withdrawalProtection} from './campaign-diplomacy.mjs';
import {dejaVuEvent} from './campaign-deja-vu.mjs';
import {relationAttack,relationCombatResult,recordRelationAttack,relationVictory,relationMoraleWeight} from './campaign-relations.mjs';
import {armyClass,classAttack,classHold,classAfterAttack,classShare,classLine,classHidden,classExtendFire,countClass,classSurrenderReserve,classGuardedLoss,classWoundedLines,classCamp} from './campaign-classes.mjs';
import {campaignShownCount,campaignShownScale} from './campaign-rule-registry.mjs';
import {c34AfterCity,c34AfterTactic,c34Movement,c34Recovery,c34Range,c34Near,c34ShareRows,c34CounterFactor,c34FlushPoison} from './campaign-c34.mjs';
import {c33Card,c33Owned,c33Range,c33Formation,c33ApplyTactic,c33AfterAttack,c33Limit,c33PullTile,c33Immune,c33Governor,c33FormationCard} from './campaign-rule-registry.mjs';
import {c31DamageFactor,c31CityCounter,c31Combat,c31ExtendStatuses} from './campaign-events.mjs';
import {c30Combat,c30TacticUsed,c30Strategy,c30ElementDamage,c30ChargeWeight,c30ChargeGuard,c30State,c30MoraleWeight} from './campaign-c29.mjs';
import {c29Record,c29TacticUsed,c29Combat,c29Aw,c29PostCombat} from './campaign-c29.mjs';
import {C28,c28Rule,recordC28Combat,recordC28Tactic,c28ControlGuard} from './campaign-career.mjs';
import {domesticWall,domesticStrike,combatRule,combatRuleLine,combatParams,combatCount,combatTacticRule,combatAlly,combatArmyAt,oppositeCombatTile,combatEmptyStep,combatFinishAttack,combatRecordRouts,runCombatRule,executeCampaignRule,combatCanPostMove} from './campaign-rule-registry.mjs';
import {C24,specialTroop,c24DamageFactor,jiefanLine,lossMoraleThreshold} from './campaign-special-troops.mjs';
import {C23,archerAttackReason,archerEngaged} from './campaign-abilities.mjs';
export {archerAttackReason} from './campaign-abilities.mjs';
import {c22AttackMultiplier,consumeC22Attack} from './campaign-events.mjs';
import {C20,c20Enabled,starAttackMultiplier,starAction} from './campaign-policy.mjs';
import {C12,campaignAttackPower,campaignDefensePower,campaignSubAbility,attackDirection,isCharge,checkFormation,formationProbability,changeFormation,campaignRoll,turnFacing,directionToward} from './campaign-abilities.mjs';
export {attackDirection} from './campaign-abilities.mjs';
import {damageEffects,prepareAttackEffects,triggerEffects,attackConfused,campaignTactics,tacticIsDamage,initializeCampaignEffects,hasCampaignRule,canMainAction,consumeMainAction,ambushHidden,surviveRule,ruleLine,recallReason,mirroredCombatCard,combatRetreatPath} from './campaign-effects.mjs';
import {checkMorale,nearbyMorale,changeMorale,campaignPath,inControlZone} from './campaign-morale.mjs';
// Deterministic campaign trial values. No Round engine or UI state.
import {hexDistance,boardNeighbors,tileId,neighbors} from './map-primitives.mjs';
import {updateCampaignKnowledge as updateKnowledge} from './campaign-vision.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {castleArmyActive,campaignCastleDefense,refreshCampaignSieges} from './campaign-city-footprint.mjs';
import {settleCampaignPayloads,settleCampaignRound,defectCampaignArmy,absorbCampaignPersonnel} from './campaign-result-bridge.mjs';
import {recordCareer} from './campaign-career.mjs';
import {uniqueEnabled,uniqueOwned,uniqueAttackOptions,uniqueFollowupRows,uniqueAfterAttack,uniqueAfterTactic,uniqueCancelTactic,uniqueChainRows,uniqueSiegeFactor,uniqueStart,uniqueScheduleRevival,uniqueDamageLimit,uniqueOrdinaryDamageFactor,uniqueDefenseExtra,uniqueGovernor,uniqueHoldLand,uniqueSpreadTactic,uniqueImmune} from './campaign-rule-registry.mjs';
import {healCampaignTroops} from './campaign-effects.mjs';
import {creditCampaignCombat,recordCampaignCombatCareer} from './campaign-growth.mjs';
import {campaignMovementWorld} from './campaign-city-footprint.mjs';
import {edgeTicks} from './movement.mjs';
import {movementEffect,officerEffectCards} from './campaign-effects.mjs';

/** C147: deterministic, own-unit-only comparison; no live opponents or RNG. */
export function campaignUnitRatings(state, armyId) {
 const source=state.armies[armyId];
 if(!source||source.factionId!==state.playerFactionId)return null;
 const own=structuredClone(source),officer=structuredClone(state.officers[own.commanderId]);
 const growth=structuredClone(state.campaignGrowth?.officers[own.commanderId]);
 const foe='C147-STANDARD',other='C147-OTHER',neutral='C147-NEUTRAL';
 const standard={...structuredClone(own),armyId:foe,commanderId:neutral,factionId:other,troopType:'militia',troopCount:250,maxTroopCount:250,tileId:'1,0',morale:'STEADY',formation:'ORDERED',braced:false,movedTiles:0,effectStates:[],uniqueTrait:{}};
 for(const k of Object.keys(standard))if(/^c\d|^effect|^class/.test(k))delete standard[k];
 standard.effectStates=[];
 const neutralOfficer={...structuredClone(officer),officerId:neutral,name:'표준 부대',baseStats:Object.fromEntries(Object.keys(officer.baseStats).map(k=>[k,70])),subStats:Object.fromEntries(Object.keys(officer.subStats).map(k=>[k,70])),activeTraits:[],acquiredTraits:[],tactics:[],uniqueTrait:{},c34Abilities:undefined};
 own.tileId='0,0';own.facing=0;own.movedTiles=0;standard.facing=3;
 const s={...state,armies:{[armyId]:own,[foe]:standard},officers:{[own.commanderId]:officer,[neutral]:neutralOfficer},cities:{},tiles:{'0,0':{tileId:'0,0',q:0,r:0,terrainType:'plain'},'1,0':{tileId:'1,0',q:1,r:0,terrainType:'plain'}},mapRules:{...state.mapRules,roads:[],riverEdges:[],blockedEdges:[],crossings:{}},campaignGrowth:{...state.campaignGrowth,officers:{...(growth?{[own.commanderId]:growth}:{})}},campaignTerminalWorld:null};
 const options={forceSide:'FRONT'},out=attackFormula(s,armyId,foe,undefined,options),incoming=attackFormula(s,foe,armyId,250,options);
 const baseline={...s,armies:{[armyId]:{...structuredClone(standard),armyId,commanderId:neutral,factionId:own.factionId,tileId:'0,0'},[foe]:standard}};
 const standardLoss=attackFormula(baseline,foe,armyId,250,options).damage;
 const moveState={...s,armies:{[armyId]:own}},move=movementEffect(moveState,armyId),world=campaignMovementWorld(moveState,armyId),cost=edgeTicks(world,world.armies[armyId],'0,0','1,0');
 const mobility=move.rooted?0:Math.max(0,Math.min(move.max,Math.floor(state.time.ticksPerTurn/(cost??Infinity))));
 return {attack:out.damage,defense:Math.round(standardLoss/incoming.damage*100),mobility,notes:[`표준: 병력 250 · 능력 70 · 정돈 근접보병 · 평지 정면 / 방어 100 = 표준`, `공격 상성 ×${out.multipliers.matchup} · 적성 ${out.multipliers.aptitude}% · 기동 평지 ${mobility}칸`,[...officerEffectCards(s,own.commanderId).map(c=>c.name).slice(0,2),...out.effectLines,...incoming.effectLines].filter((x,i,a)=>a.indexOf(x)===i).join(' · ')||'추가 특기 보정 없음']};
}

export const attackRange = (army,s=null) => ( troopToCampaign(army.troopType)==='BT03'||s&&specialTroop(s,army.troopType)&&army.troopType==='jiefan'||s&&hasCampaignRule(s,army.armyId,'REACH_2')?2:1)+(s?c33Range(s,army.armyId)+c34Range(s,army.armyId):0);
// v3.6 default; v35 and p1/p2/p3 remain selectable comparison trials.
const troopMatchups={
 v36:{'BT01>BT02':1.25,'BT01>BT03':1.2,'BT02>BT01':.9,'BT02>BT03':1.15,'BT02>BT04':1.4,'BT03>BT01':1.25,'BT03>BT02':[.85,'FRONT'],'BT03>BT04':1.3,'BT04>BT01':1.2,'BT04>BT03':1.4},
 v35:{'BT02>BT04':1.4,'BT04>BT03':1.4,'BT01>BT03':1.2},
 p1:{'BT01>BT02':1.25,'BT01>BT03':1.2,'BT01>BT04':.9,'BT02>BT01':.9,'BT02>BT03':1.15,'BT02>BT04':1.4,'BT03>BT01':1.25,'BT03>BT02':[.85,'FRONT'],'BT03>BT04':1.3,'BT04>BT01':1.2,'BT04>BT02':[.8,'FRONT'],'BT04>BT03':1.4},
 p2:{'BT01>BT02':1.25,'BT01>BT03':1.2,'BT01>BT04':.9,'BT02>BT01':.9,'BT02>BT03':1.15,'BT02>BT04':1.4,'BT03>BT01':[.85,'FRONT'],'BT03>BT04':1.3,'BT04>BT01':1.2,'BT04>BT02':[.8,'FRONT'],'BT04>BT03':1.4},
 p3:{'BT01>BT02':1.25,'BT01>BT03':1.2,'BT02>BT01':.9,'BT02>BT03':1.15,'BT02>BT04':1.4,'BT03>BT01':[.85,'FRONT'],'BT03>BT04':1.3,'BT04>BT01':1.2,'BT04>BT03':1.4},
};
function troopMatchup(s,attacker,target,side){
 const table=troopMatchups[s.trialRules?.troopMatchup]??troopMatchups.v36,value=table[`${attacker}>${target}`]??1;
 return Array.isArray(value)?side===value[1]?value[0]:1:value;
}
function combatFollowups(s,id,target,hit,options){
 if(options.counter||options.reaction||options.pursuit)return [];
 const rows=[],pincer=combatRule(s,id,'PINCER_FOLLOWUP'),e=combatTacticRule(options.tactic);
 const add=(ally,rule,ratio=100)=>{if(!ally||!diplomacyArmyHostile(s,ally.armyId,target)||archerAttackReason(s,ally.armyId))return;const loss=Math.round(attackFormula(s,ally.armyId,target,undefined,{reaction:true,first:false}).damage*ratio/100);rows.push({sourceId:ally.armyId,targetId:target,rule,loss,line:`${rule==='PINCER_FOLLOWUP'?combatRuleLine(s,id,rule):options.tactic?.name??c33Owned(s,ally.armyId,rule)?.card.name??ruleLine(s,ally.armyId,rule)} — ${s.officers[ally.commanderId].name} 추격타 −${loss}`});};
 if(pincer)add(combatAlly(s,id,target,{behind:true}),'PINCER_FOLLOWUP',pincer.params.ratio);
 if(e?.rule==='DUAL_STRIKE')add(combatAlly(s,id,target),'DUAL_STRIKE');
 if(e?.rule==='PIERCE'){const other=combatArmyAt(s,oppositeCombatTile(s,id,target));if(other){const loss=Math.round(hit.damage*combatParams(e.params,options.tactic.rank).ratio/100);rows.push({sourceId:id,targetId:other.armyId,rule:'PIERCE',loss,line:`${options.tactic.name} — ${s.officers[other.commanderId].name} 관통 −${loss}`});}}
 for(const ally of Object.values(s.armies).filter(b=>b.armyId!==id&&b.factionId===s.armies[id].factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1&&c33Owned(s,b.armyId,'ASSIST_STRIKE')&&b.c33?.assistTurn!==s.turn)){add(ally,'ASSIST_STRIKE',20);}
 return [...rows,...uniqueFollowupRows(s,id,target,hit,options,attackFormula)];
}
export function attackTargets(s,id) {
  const a=s.armies[id];
  if(!a||a.c34?.disarmUntil>=s.turn||a.c32?.disarmUntil>=s.turn||a.c33?.bideUntil>=s.turn||archerAttackReason(s,id)||attackConfused(s,id)||a.morale==='ROUTING'||!castleArmyActive(s,a)||!canMainAction(s,id))return [];
  const v={knowledge:s.knowledge[a.factionId]};
  return Object.values(v.knowledge.observedArmies).filter(t=>s.knowledge[a.factionId].tiles[t.tileId]==='VISIBLE'&&
    s.armies[t.armyId]&&diplomacyArmyHostile(s,id,t.armyId)&&!ambushHidden(s,t.armyId,a.factionId)&&!classHidden(s,t.armyId,a.factionId)&&castleArmyActive(s,s.armies[t.armyId])&&
    hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])<=attackRange(a,s)&&jiefanLine(s,a,t)&&(troopToCampaign(a.troopType)!=='BT03'||hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])>1)).map(t=>t.armyId).sort();
}
export function previewAttackThreat(s,attackerId,targetId){const reason=diplomacyAttackReason(s,attackerId,targetId);if(reason)throw new Error(reason);return attackNumbers(prepareAttackEffects(s,attackerId,targetId,{first:false}),attackerId,targetId,{reaction:true,first:false});}
export function previewAttack(s,attackerId,targetId) {
  const reason=diplomacyAttackReason(s,attackerId,targetId);if(reason)throw new Error(reason);
  if(!attackTargets(s,attackerId).includes(targetId))throw new Error(archerAttackReason(s,attackerId)||'INVALID_CAMPAIGN_ATTACK');
  return shownPrediction(s,attackerId,targetId,attackNumbers(prepareAttackEffects(s,attackerId,targetId),attackerId,targetId));
}
// 피해 수치만 계산한다(사거리·시야·행동 자격은 호출한 쪽이 확인).
function attackFormula(s,attackerId,targetId,troopCount=s.armies[attackerId].troopCount,options={}) {
  options=uniqueAttackOptions(s,attackerId,targetId,options);if(c33Formation(s,targetId,'FORMATION_RING'))options={...options,noFlank:true};
  const a=s.armies[attackerId],t=s.armies[targetId];
  const at=troopToCampaign(a.troopType),dt=troopToCampaign(t.troopType);
  const terrain=({forest:1.15,hill:1.25})[s.tiles[t.tileId].terrainType]??1;
  const castleRaw=campaignCastleDefense(s,t),castle=1+(castleRaw-1)*(c28Rule(s,attackerId,'BREACH_GUARD')?C28.breachRatio:1);
  const river=s.mapRules.riverEdges.includes([a.tileId,t.tileId].sort().join('|'))?.75:1;
  const allies=Object.values(s.armies).filter(u=>u.armyId!==attackerId&&u.factionId===a.factionId&&u.morale!=='ROUTING'&&castleArmyActive(s,u)&&hexDistance(s.tiles[u.tileId],s.tiles[t.tileId])===1).length;
  const flank=options.noFlank?1:1+Math.min(3,allies)*.1;
  let side=options.forceSide??(options.counter?'FRONT':attackDirection(s,attackerId,targetId));
  const first=a.effectFirstAttackTurn!==s.turn&&!options.counter&&!options.reaction,ambusher=first&&combatRule(s,attackerId,'AMBUSHER')&&a.c27?.hiddenFrom?.includes(t.factionId);
  if(t.c27?.feignedFlankUntil>=s.turn&&side==='FRONT')side='FLANK';
  if(first&&(ambusher||a.c27?.ambush)&&!options.forceSide)side='REAR';
  const cls=classAttack(s,attackerId,targetId,options,side);if(cls.forceSide)side=cls.forceSide;
  const noFront=!options.counter&&combatRule(s,attackerId,'NO_FRONT');if(noFront&&side==='FRONT')side='FLANK';
  const matchup=troopMatchup(s,at,dt,side);
  const square=options.noFlank||combatRule(s,targetId,'SQUARE'),hedge=side==='FLANK'&&t.formation==='ORDERED'&&combatRule(s,targetId,'HEDGEHOG'),stakes=t.c27?.stakes&&t.c27.stakes.until>=s.turn;
  const charge=!(t.c34?.noChargeUntil>=s.turn)&&!(a.c34?.noChargeUntil>=s.turn)&&!(uniqueOwned(s,targetId,'U_AWAIT_CAVALRY')&&dt==='BT03')&&!options.counter&&!stakes&&!c33Formation(s,targetId,'FORMATION_RING')&&isCharge(s,attackerId,targetId,side),momentum=charge&&combatRule(s,attackerId,'CHARGE_MOMENTUM'),extra=momentum?Math.min(momentum.params.max,Math.max(0,(a.movedTiles??0)-2)*momentum.params.perHex)/100:0;
  const sideRatio=c28Rule(s,targetId,'HALF_FLANK_TAKEN')?C28.flankRatio:1;
  const sideMultiplier=square||hedge||stakes&&side==='FLANK'?1:side==='REAR'?noFront?1:1+C12.rear*sideRatio:side==='FLANK'?1+C12.side*sideRatio:1,chargeMultiplier=charge?1+campaignSubAbility(s,a.commanderId,'무용','힘')*C12.charge+extra:1,formation=t.formation==='BROKEN'?1+C12.broken:t.formation==='DISORDERED'?1+C12.disordered:1;
  const attack=campaignAttackPower(s,a.commanderId,options.counter),defense=campaignDefensePower(s,t.commanderId);
  const guardRatio=c28Rule(s,attackerId,'BREACH_GUARD')?C28.breachRatio:1;
  const hold=classHold(s,targetId,side);
  const brace=t.braced&&!options.ignoreBrace&&!(specialTroop(s,a.troopType)&&a.troopType==='danyang')?1+.25*guardRatio:1,shaken=a.morale==='SHAKEN'?.8:1;
  const effect=damageEffects(s,attackerId,targetId,{...options,charge,classDamage:cls.damage});
  const social=relationAttack(s,attackerId,targetId,options);effect.factor*=social.factor;effect.lines.push(...social.lines);
  const oath=a.c27?.oath&&combatRule(s,attackerId,'OATH_OF_REVENGE'),penalty=oath?Math.max(0,1-oath.params.penalty/100):1;
  const damage=Math.max(1,Math.round((hold?Math.min(1/(1-hold.ability.params.frontReduce/100),brace)/ (1/(1-hold.ability.params.frontReduce/100)):1)*(options.tactic&&a.c33?.doubleTurn===s.turn?2:1)*(t.c33?.smokeUntil>=s.turn&&at==='BT03'?.6:1)*(c33Owned(s,attackerId,'POINT_BLANK')&&archerEngagedC33(s,attackerId)? .7:1)*(options.tactic?1:uniqueOrdinaryDamageFactor(s,attackerId))*(1-(options.reaction&&uniqueOwned(s,targetId,'U_SUPERVISE')?30:0)/100)*penalty*(s.armies[attackerId].c28ExposeTurn===s.turn?1-C28.exposePenalty/100:1)*c24DamageFactor(s,a,t,charge)*effect.factor*c31DamageFactor(s,a,t,options)*c22AttackMultiplier(s,a,t.factionId,options)*(!options.counter&&!options.reaction?starAttackMultiplier(s,a):1)*troopCount*.12*attack*matchup*river*(flank+sideMultiplier-1)*chargeMultiplier*formation*shaken/(defense*terrain*castle*brace)));
  const ruleLines=[...(momentum&&extra?[combatRuleLine(s,attackerId,'CHARGE_MOMENTUM',`돌격 +${extra*100}%`)]:[]),...(noFront?[combatRuleLine(s,attackerId,'NO_FRONT','최소 측면 · 대가 후방 보너스 0')]:[]),...(ambusher?[combatRuleLine(s,attackerId,'AMBUSHER','시야 밖 첫 공격 후방')]:[]),...(square?[combatRuleLine(s,targetId,'SQUARE','측면·후방 보너스 무효 · 이동 1칸')]:[]),...(hedge?[combatRuleLine(s,targetId,'HEDGEHOG','정돈 측면 무효')]:[]),...(stakes?['말뚝 박고 버티기 — 측면·돌격 보너스 무효 · 다음 이동 불가']:[]),...(oath?[combatRuleLine(s,attackerId,'OATH_OF_REVENGE',`피해 −${oath.params.penalty}% · ${a.c27.oath.left}회 남음`)]:[]),...(a.c27?.ambush&&first?['매복 — 첫 공격 후방']:[])];
  return {damage,side,charge,sideWeight:square||hedge||stakes&&side==='FLANK'?0:side==='REAR'?C12.rearWeight:side==='FLANK'?C12.flankWeight:0,multipliers:{...(['v2','v3'].includes(s.mapId)?{relations:social.factor}:{}),c24:c24DamageFactor(s,a,t,charge),side:sideMultiplier,charge:chargeMultiplier,formation,matchup,terrain,castle,river,flank,brace,shaken,effects:effect.special,aptitude:effect.aptitude,traitDefense:effect.defense},effectLines:[...cls.lines,...(hold?[classLine(hold,'정면 피해 −20% · 전열 유지')]:[]),...effect.lines,...ruleLines,...(brace>1?['방어 태세 ×1.25']:[]),...(a.morale==='SHAKEN'?['동요 공격 −20%']:[]),...(sideMultiplier>1?[side==='REAR'?'후방 +30%':'측면 +15%']:[]),...(charge?[`돌격 +${Math.round((chargeMultiplier-1)*10000)/100}%`]:[]),...(t.formation==='BROKEN'?['붕괴 +30%']:t.formation==='DISORDERED'?['흐트러짐 +15%']:[])]};
}
const c30BondFirstFormation=(s,id)=>{const x=c30State(s,id);return !!x&&x.teamUps.includes('BD-06')&&!x.formationUsed;};
function attackNumbers(s,attackerId,targetId,options={}) {
  const a=s.armies[attackerId],t=s.armies[targetId],at=troopToCampaign(a.troopType),dt=troopToCampaign(t.troopType);
  const ignoreBrace=!!(t.braced&&specialTroop(s,a.troopType)&&a.troopType==='danyang');
  const c27Side=attackFormula(s,attackerId,targetId,undefined,options).side;
  const spearPreempt=dt==='BT02'&&at!=='BT03'&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===1&&c27Side==='FRONT'&&!options.pursuit&&(!options.reaction||!!options.joint);
  const chargeStopped=spearPreempt&&at==='BT04'&&(a.movedTiles??0)>=2;
  const firstStrike=spearPreempt||dt==='BT02'&&c27Side==='FLANK'&&!!c33Owned(s,targetId,'FLANK_FIRST_STRIKE')||!options.pursuit&&hasCampaignRule(s,targetId,'FIRST_STRIKE',['ON_DEFEND'],{targetId:attackerId});
  const flankStop=c27Side!=='FRONT'&&combatRule(s,attackerId,'NO_COUNTER_ON_FLANK'),shatter=combatTacticRule(options.tactic)?.rule==='SHATTER_LINE';
  const cls=classAttack(s,attackerId,targetId,options,c27Side);
  const canCounter=(!diplomacyEnabled(s)||diplomacyArmyHostile(s,targetId,attackerId))&&!cls.noCounter&&!flankStop&&!shatter&&!(t.c27?.noCounterUntil>=s.turn)&&!(specialTroop(s,a.troopType)&&a.troopType==='jiefan'&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===2)&&dt!=='BT03'&&t.formation!=='BROKEN'&&!options.pursuit&&(!options.reaction||!!options.joint)&&!hasCampaignRule(s,attackerId,'NO_COUNTER_TAKEN',['ON_ATTACK'],{targetId})&&!attackConfused(s,targetId)&&(at!=='BT03'&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===1||hasCampaignRule(s,targetId,'COUNTER_ALL')&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])<=2)&&t.morale!=='ROUTING';
  const counterState=canCounter?prepareAttackEffects(s,targetId,attackerId,{counter:true,first:false}):s;
  let preCounter=0;
  if(canCounter&&firstStrike)preCounter=attackFormula(counterState,targetId,attackerId,t.troopCount,{counter:true,first:false,classCounter:c27Side==='FRONT'}).damage;
  const riposte=armyClass(s,targetId,'CLS_RIPOSTE');
  const rate=c34CounterFactor(s,targetId,attackerId)*C12.counter*(t.formation==='DISORDERED'?C12.counter:1)*(dt==='BT03'&&!hasCampaignRule(s,targetId,'COUNTER_ALL')?.6:1)*(t.braced&&!ignoreBrace?1.2:1)*(chargeStopped?1+C23.spearChargeCounter:1);
  const earlyLoss=surviveRule(s,attackerId,Math.min(a.troopCount,Math.round(preCounter*rate)),false);
  const earlyFormationChanges=[],earlyMoraleChanges=[];
  let hitState=s;
  if(canCounter&&firstStrike){
    hitState=structuredClone(counterState);hitState.c41Disabled=true;hitState.armies[attackerId].troopCount-=earlyLoss;
    combatFormation(hitState,[{unitId:attackerId,preBattleCount:a.troopCount,postBattleCount:a.troopCount-earlyLoss,casualties:earlyLoss}],targetId,attackerId,{side:'FRONT',charge:false},earlyFormationChanges,earlyMoraleChanges,true);
    if(earlyLoss<a.troopCount&&earlyLoss/a.troopCount>=lossMoraleThreshold(s,a))checkMorale(hitState,attackerId,'\uB300\uC190\uC2E4',15,earlyMoraleChanges);
  }
  const hit=attackFormula(hitState,attackerId,targetId,firstStrike?a.troopCount-earlyLoss:undefined,options);
  const damage=firstStrike&&a.troopCount===earlyLoss?0:hit.damage;
  const c27Followups=combatFollowups(s,attackerId,targetId,hit,options),followLoss=c27Followups.filter(f=>f.targetId===targetId).reduce((n,f)=>n+f.loss,0);
  const survivalLines=[];
  const rawEnemyLoss=Math.min(t.troopCount,damage+followLoss,c33Owned(s,targetId,'DAMAGE_CAP')&&hit.side==='FRONT'?Math.floor(t.troopCount*.08):Infinity),enemyLoss=surviveRule(s,targetId,classGuardedLoss(s,targetId,rawEnemyLoss).loss,false,survivalLines);
  const counter=canCounter&&(firstStrike||t.troopCount>enemyLoss);
  const counterDamage=counter?(firstStrike?preCounter:attackFormula(counterState,targetId,attackerId,t.troopCount-enemyLoss,{counter:true,first:false,classCounter:c27Side==='FRONT'}).damage):0;
  const reflectRule=!options.counter&&!options.reaction&&!options.pursuit&&at==='BT04'&&(a.movedTiles??0)>=2&&hit.side==='FRONT'&&!(t.movedTiles??0)&&combatRule(s,targetId,'SET_SPEARS'),reflect=reflectRule?Math.round(damage*reflectRule.params.reflect/100):0;
  const rawAllyLoss=Math.min(a.troopCount,(counter?Math.round(counterDamage*rate):0)+reflect,c33Owned(s,attackerId,'DAMAGE_CAP')?Math.floor(a.troopCount*.08):Infinity),allyLoss=surviveRule(s,attackerId,classGuardedLoss(s,attackerId,rawAllyLoss).loss,false,survivalLines);
  let weight=cls.formationWeight+(t.formationWeight??0)+hit.sideWeight+(hit.charge&&!c30ChargeGuard(s,targetId)?C12.chargeWeight+c30ChargeWeight(s,attackerId):0)+(enemyLoss/t.troopCount>=C12.lossThreshold?C12.lossWeight:0);
  if(ignoreBrace&&weight>0)weight+=C12.braceWeight;
  const hubaoExtra=hit.charge&&!c30ChargeGuard(s,targetId)&&specialTroop(s,a.troopType)&&a.troopType==='hubao';
  const formationRisk={extraCheck:!!hubaoExtra,extraSuccessProbability:hubaoExtra?formationProbability(s,targetId,C24.chargeWeight)/100:1,check:!classHold(s,targetId,hit.side)&&enemyLoss<t.troopCount&&weight>0&&!(hit.charge&&c30ChargeGuard(s,targetId))&&!(c30BondFirstFormation(s,targetId)),successProbability:formationProbability(s,targetId,weight)/100};
  const moraleWeights=[...(enemyLoss/t.troopCount>=lossMoraleThreshold(s,t)?[15]:[]),...(hit.multipliers.flank>=1.1?[10]:[]),...(t.combatMoraleEffects??[]).filter(e=>e.value<0).map(e=>Math.abs(e.value))];
  const collapse=formationRisk.check&&t.formation==='DISORDERED';
  const chance=w=>Math.max(0,Math.min(100,C12.moraleBase+(s.officers[t.commanderId].baseStats.leadership+campaignSubAbility(s,t.commanderId,'감화','결집'))/C12.moraleDivisor-relationMoraleWeight(s,targetId,c30MoraleWeight(s,targetId,w))))/100;
  const moraleRisk={check:enemyLoss<t.troopCount&&t.morale!=='ROUTING'&&(moraleWeights.length>0||collapse),conditionalOnCollapse:collapse,successProbability:moraleWeights.reduce((p,w)=>p*chance(w),1)*(collapse?formationRisk.successProbability+(1-formationRisk.successProbability)*chance(C12.collapseMorale):1)};
  const prediction={c27Followups,reflect,sideWeight:hit.sideWeight,ignoreBrace,spearPreempt:counter&&spearPreempt,chargeStopped:counter&&chargeStopped,earlyFormationChanges,earlyMoraleChanges,moraleRisk,formationRisk,side:hit.side,charge:hit.charge,allyLoss,enemyLoss,rawAllyLoss,rawEnemyLoss,counter,firstStrike:counter&&firstStrike,damage,counterDamage,multipliers:hit.multipliers,effectLines:[...(counter&&spearPreempt?['\uC815\uBA74 \uCC3D\uBCD1 \uC120\uC81C \uBC18\uACA9',...(chargeStopped?['\uB3CC\uACA9 \uBCF4\uB108\uC2A4 \uBB34\uD6A8 \u00B7 \uCC3D\uBCD1 \uBC18\uACA9 +25%']:[])]:[]),...hit.effectLines,...classWoundedLines(s,targetId,enemyLoss),...classWoundedLines(s,attackerId,allyLoss),...(classCamp(s,targetId)&&weight>0?[`[${classCamp(s,targetId).abilityName}] 진지 전열 판정 +${classCamp(s,targetId).formation}`]:[]),...classGuardedLoss(s,targetId,rawEnemyLoss).lines,...classGuardedLoss(s,attackerId,rawAllyLoss).lines,...(counter&&riposte&&c27Side==='FRONT'?[classLine(riposte,`정면 반격 +${riposte.ability.params.counter}%`)]:[]),...c27Followups.map(f=>f.line),...(reflect?[combatRuleLine(s,targetId,'SET_SPEARS','반사 −'+reflect)]:[]),...(flankStop?[combatRuleLine(s,attackerId,'NO_COUNTER_ON_FLANK','측면·후방 반격 없음')]:[]),...(shatter?['전열 깨기 — 반격 없음 · 정돈 → 흐트러짐']:[]),...(hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===2&&hasCampaignRule(s,attackerId,'REACH_2')?[ruleLine(s,attackerId,'REACH_2','2\uCE78 \uACF5\uACA9')]:[]),...(counter&&hasCampaignRule(s,targetId,'COUNTER_ALL')?[ruleLine(s,targetId,'COUNTER_ALL','\uC6D0\uAC70\uB9AC \uBC18\uACA9')]:[])]};
  prediction.effectLines.push(...survivalLines);Object.defineProperty(prediction,'survivalLines',{value:survivalLines});
  if(hit.charge&&!options.reaction&&!options.pursuit){for(const [rule,detail] of [['BREAKTHROUGH','대가: 자기 전열 한 단계'],['CANTO','남은 이동으로 후퇴 가능 · 추격 적용']])if(combatRule(s,attackerId,rule))prediction.effectLines.push(combatRuleLine(s,attackerId,rule,detail));}
  if(counter&&firstStrike)Object.defineProperty(prediction,'earlyState',{value:{rng:structuredClone(hitState.rng),formation:hitState.armies[attackerId].formation,morale:hitState.armies[attackerId].morale}});
  return prediction;
}
// 교전 이탈 추격 (정본 20 v3.1 §1.1, 시험값): 교전 중인 부대가 움직이면 붙어 있던 적 중 가장 센 1부대가
// 공격 피해 ×0.5 로 추격한다. 반격 없음. 패주 중인 적은 추격하지 않는다.
export const PURSUIT_RATE=.5;
export function previewDisengage(s,armyId) {
  const a=s.armies[armyId];
  if(!a||!castleArmyActive(s,a)||a.troopCount<=0||hasCampaignRule(s,armyId,'NO_PURSUIT'))return null;
  let best=null;
  for(const b of Object.values(s.armies).sort((x,y)=>x.armyId.localeCompare(y.armyId,'en'))){
    if(!diplomacyArmyHostile(s,a.armyId,b.armyId)||attackConfused(s,b.armyId)||!castleArmyActive(s,b)||b.morale==='ROUTING'||b.troopCount<=0||hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])!==1)continue;
    const prepared=prepareAttackEffects(s,b.armyId,armyId,{first:false}),p=attackNumbers(prepared,b.armyId,armyId,{pursuit:true,first:false}),dealt=Math.min(a.troopCount,Math.max(1,Math.round(p.damage*(c33Owned(s,armyId,'REARGUARD')?.25:PURSUIT_RATE))));
    const survivalLines=[];surviveRule(prepared,armyId,dealt,false,survivalLines);
    const effectLines=[...p.effectLines.filter(l=>!p.survivalLines.includes(l)),...survivalLines];
    if(!best||dealt>best.dealt){best={side:p.side,charge:p.charge,pursuerId:b.armyId,dealt,multipliers:p.multipliers,effectLines};Object.defineProperty(best,'survivalLines',{value:survivalLines});}
  }
  return best;
}
export function resolvePursuit(state,armyId) {
  const p=previewDisengage(state,armyId);if(!p)return state;
  return resolveMovementShot(state,armyId,p,'PURSUIT');
}
// Eligibility belongs to the start of the normal move; damage/vision
// belong to its arrival. No per-turn ledger or action/cooldown consumption.
export const approachFireRate=s=>Number.isFinite(s.trialRules?.approachFire)?s.trialRules.approachFire:.3;
// Keep only departure positions and the already evaluated engagement guard.
// No mutable army, diplomacy or terminal objects are retained across movement.
export function approachFireStart(s,armyId){
 if(approachFireRate(s)<=0||!s.armies[armyId])return null;
 const armies={[armyId]:{tileId:s.armies[armyId].tileId}};
 for(const b of Object.values(s.armies))if(troopToCampaign(b.troopType)==='BT03')armies[b.armyId]={tileId:b.tileId,engaged:archerEngaged(s,b.armyId)};
 return {armies,tiles:s.tiles};
}
function approachFirePrediction(s,armyId,start){
  const rate=approachFireRate(s),a=s.armies[armyId],old=start.armies[armyId];
  if(!Number.isFinite(rate)||rate<=0||!a||!old||a.tileId===old.tileId||!castleArmyActive(s,a)||a.troopCount<=0||a.morale==='ROUTING')return null;
  let best=null;
  for(const b of Object.values(s.armies).sort((x,y)=>x.armyId.localeCompare(y.armyId,'en'))){
    const was=start.armies[b.armyId];
    if(!was||troopToCampaign(b.troopType)!=='BT03'||!castleArmyActive(s,b)||b.troopCount<=0||b.morale==='ROUTING'||b.formation==='BROKEN'||(was.engaged??archerEngaged(start,b.armyId))||
      !diplomacyArmyHostile(s,b.armyId,armyId)||hexDistance(start.tiles[was.tileId],start.tiles[old.tileId])===1||hexDistance(s.tiles[b.tileId],s.tiles[a.tileId])!==1||
      s.knowledge[b.factionId]?.tiles[a.tileId]!=='VISIBLE'||ambushHidden(s,armyId,b.factionId)||classHidden(s,armyId,b.factionId))continue;
    const prepared=prepareAttackEffects(s,b.armyId,armyId,{first:false}),p=attackFormula(prepared,b.armyId,armyId,undefined,{reaction:true,first:false});
    const survivalLines=[],dealt=Math.min(a.troopCount,Math.max(1,Math.round(p.damage*rate))),damage=surviveRule(prepared,armyId,dealt,false,survivalLines);
    if(!best||damage>best.damage){best={...p,archerId:b.armyId,pursuerId:b.armyId,dealt,damage,normalDamage:p.damage,rate,effectLines:[...p.effectLines,...survivalLines]};Object.defineProperty(best,'survivalLines',{value:survivalLines});}
  }
  return best;
}
export function previewApproachFire(s,armyId,destinationTileId){
  if(approachFireRate(s)<=0||!s.armies[armyId]||!s.tiles[destinationTileId]||combatCanPostMove(s,armyId))return null;
  // Reject empty arrival neighborhoods before cloning or planning the move.
  const mover=s.armies[armyId],destinationTile=s.tiles[destinationTileId];
  if(!Object.values(s.armies).some(b=>troopToCampaign(b.troopType)==='BT03'&&b.troopCount>0&&b.morale!=='ROUTING'&&b.formation!=='BROKEN'&&
    hexDistance(s.tiles[b.tileId],destinationTile)===1&&hexDistance(s.tiles[b.tileId],s.tiles[mover.tileId])!==1&&
    !archerEngaged(s,b.armyId)&&diplomacyArmyHostile(s,b.armyId,armyId)))return null;
  if(!campaignPath(s,armyId,destinationTileId))return null;
  // Departure pursuit may reduce troops, disrupt formation or route the mover.
  // Resolve it only on a clone so committed RNG/state remain untouched.
  const arrival=inControlZone(s,s.armies[armyId])?resolvePursuit(structuredClone(s),armyId):structuredClone(s),a=arrival.armies[armyId];
  if(!castleArmyActive(arrival,a)||a.troopCount<=0||a.morale==='ROUTING')return null;
  const path=campaignPath(arrival,armyId,destinationTileId)?.pathTileIds;if(!path||path.length<2)return null;
  a.tileId=destinationTileId;
  a.facing=directionToward(arrival.tiles[path.at(-2)],arrival.tiles[destinationTileId],a.facing);a.movedTiles+=path.length-1;
  updateKnowledge(arrival);refreshCampaignSieges(arrival);
  return approachFirePrediction(arrival,armyId,s);
}
export function resolveApproachFire(state,armyId,start){
  if(!start)return state;
  const p=approachFirePrediction(state,armyId,start);if(!p)return state;
  return resolveMovementShot(state,armyId,p,'APPROACH_FIRE');
}
function resolveMovementShot(state,armyId,p,kind){
  let s=prepareAttackEffects(state,p.pursuerId,armyId,{first:false});
  dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[armyId].commanderId,by:s.armies[p.pursuerId].commanderId});
  s.battleSequence++;
  const effectLines=p.effectLines.filter(l=>!p.survivalLines?.includes(l));
  const battleId=`MC.${s.battleSequence}`,pursuer=s.armies[p.pursuerId],pre=s.armies[armyId].troopCount,post=pre-surviveRule(s,armyId,p.dealt,true,effectLines);
  const units=[{unitId:p.pursuerId,preBattleCount:pursuer.troopCount,postBattleCount:pursuer.troopCount,casualties:0,unitState:'COMMANDABLE'},
    {unitId:armyId,preBattleCount:pre,postBattleCount:post,casualties:pre-post,unitState:post?'COMMANDABLE':'ELIMINATED'}];
  s=settleCampaignRound(s,{format:'combat-battle-result-v1',battleId,decisionRef:battleId,sourceRevision:s.battleSequence,units},pursuer.factionId,
    {permanentLossRatio:.3,captorByArmyId:{[p.pursuerId]:s.armies[armyId].factionId,[armyId]:pursuer.factionId}});
  if(!post&&hasCampaignRule(s,p.pursuerId,'ABSORB')){absorbCampaignPersonnel(s,p.pursuerId,armyId,pre);effectLines.push(ruleLine(s,p.pursuerId,'ABSORB'));}
  const moraleChanges=[],formationChanges=[];
  if(s.armies[armyId].c27?.saved){delete s.armies[armyId].c27.saved;changeMorale(s,armyId,'ROUTING','아홉 목숨',moraleChanges);}
  combatFormation(s,units,p.pursuerId,armyId,p,formationChanges,moraleChanges);
  if(post&&p.dealt/pre>=lossMoraleThreshold(s,s.armies[armyId]))checkMorale(s,armyId,kind==='PURSUIT'?'추격 대손실':'접근사격 대손실',15,moraleChanges);
  const facingTurned=turnDefender(s,p.pursuerId,armyId,p.side);
  if(!post)nearbyMorale(s,state.armies[armyId],moraleChanges);
  for(const a of Object.values(s.armies))if(a.morale==='ROUTING'&&!formationChanges.some(f=>f.armyId===a.armyId&&f.to==='BROKEN')&&state.armies[a.armyId].formation!=='BROKEN')formationChanges.push({armyId:a.armyId,from:state.armies[a.armyId].formation,to:'BROKEN'});
  s.combatLog??=[];
  s.lastCombat={kind,side:p.side,charge:p.charge,formationChanges,facingTurned,turn:s.turn,moraleChanges,eliminatedIds:post?[]:[armyId],sequence:s.battleSequence,attackerId:p.pursuerId,targetId:armyId,
    allyLoss:0,enemyLoss:pre-post,counter:false,multipliers:p.multipliers,effectLines,units,fromTileId:state.armies[armyId].tileId};
  fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);
  supplyCombatLoot(s,s.lastCombat);combatRecordRouts(s,state,p.pursuerId,armyId);
  for(const u of units)if(!u.postBattleCount)triggerEffects(s,u.unitId===s.lastCombat.attackerId?s.lastCombat.targetId:s.lastCombat.attackerId,'ON_KILL',{targetId:u.unitId});
  c29PostCombat(s,s.lastCombat,{morale:(who,to)=>changeMorale(s,who,to,'? ?? ??',s.lastCombat.moraleChanges),formation:(who,n)=>changeFormation(s,who,n,s.lastCombat.formationChanges)});
  c30Combat(s,s.lastCombat,{morale:who=>checkMorale(s,who,'여포군 — 인접 적 패주',10,s.lastCombat.moraleChanges)});
  relationCombatResult(s,state,p.pursuerId,armyId,s.lastCombat);creditCampaignCombat(s,s.lastCombat);
  updateKnowledge(s);refreshCampaignSieges(s);
  rememberDiplomacyCombat(s,state);return s;
}
export function resolveAttack(state,attackerId,targetId,tactic=null,options={}) {
  const reason=diplomacyAttackReason(state,attackerId,targetId);if(reason)throw new Error(reason);
  if(archerAttackReason(state,attackerId))throw new Error('ARCHER_ENGAGED');
  if(!options.reaction&&!tactic&&!attackTargets(state,attackerId).includes(targetId))throw new Error(archerAttackReason(state,attackerId)||'INVALID_CAMPAIGN_ATTACK');
  let s=prepareAttackEffects(state,attackerId,targetId,{tactic});
  if(c29Aw(s,targetId,'DREAD')&&hexDistance(s.tiles[s.armies[attackerId].tileId],s.tiles[s.armies[targetId].tileId])<=2)checkMorale(s,attackerId,'??? ??',5);
  const prediction=attackNumbers(s,attackerId,targetId,{tactic,...options});if(!options.reaction)delete s.armies[attackerId].starVanguardTurn;
  if(prediction.counter)s=prepareAttackEffects(s,targetId,attackerId,{counter:true,first:false});
  s.battleSequence++;
  const battleId=`MC.${s.battleSequence}`;
  dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[targetId].commanderId,by:s.armies[attackerId].commanderId});
  if(prediction.counter)dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[attackerId].commanderId,by:s.armies[targetId].commanderId});
  if(prediction.earlyMoraleChanges.some(e=>e.to==='ROUTING'))dejaVuEvent(s,'ROUT_TERRAIN',{officerId:s.armies[attackerId].commanderId,tileId:state.armies[attackerId].tileId});
  for(const f of prediction.c27Followups)if(s.armies[f.sourceId]&&s.armies[f.targetId])dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[f.targetId].commanderId,by:s.armies[f.sourceId].commanderId});
  const losses=[{id:attackerId,loss:prediction.rawAllyLoss},{id:targetId,loss:prediction.rawEnemyLoss}];
  for(const f of prediction.c27Followups){if(f.rule==='ASSIST_STRIKE'){s.armies[f.sourceId].c33??={};s.armies[f.sourceId].c33.assistTurn=s.turn;}if(f.targetId!==targetId){const row=losses.find(x=>x.id===f.targetId);if(row)row.loss+=f.loss;else losses.push({id:f.targetId,loss:f.loss});}if(f.rule==='PINCER_FOLLOWUP')combatCount(s,f.rule);}
  if(hasCampaignRule(s,attackerId,'SPLASH')){const other=Object.values(s.armies).filter(b=>b.armyId!==targetId&&diplomacyArmyHostile(s,attackerId,b.armyId)&&castleArmyActive(s,b)&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[targetId].tileId])===1).sort((a,b)=>b.troopCount-a.troopCount||a.armyId.localeCompare(b.armyId))[0];if(other){losses.push({id:other.armyId,loss:Math.floor(prediction.damage/2)});prediction.effectLines.push(ruleLine(s,attackerId,'SPLASH','\uC778\uC811 \uC801 \uD53C\uD574 \uC808\uBC18'));}}
  for(const row of losses)if(row.id!==attackerId&&row.id!==targetId&&s.armies[row.id]?.factionId!==s.armies[attackerId].factionId)dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[row.id].commanderId,by:s.armies[attackerId].commanderId});
  const defect=prediction.enemyLoss>=s.armies[targetId].troopCount&&prediction.allyLoss<s.armies[attackerId].troopCount&&hasCampaignRule(s,attackerId,'DEFECTION')&&defectionEligible(s,targetId);
  uniqueChainRows(s,losses);c34ShareRows(s,losses);classShare(s,losses,prediction.effectLines);
  prediction.effectLines=prediction.effectLines.filter(l=>!prediction.survivalLines.includes(l));
  const units=losses.map(({id,loss})=>{
    const pre=s.armies[id].troopCount,actual=surviveRule(s,id,Math.min(pre,loss),true,prediction.effectLines),post=id===targetId&&defect?pre:pre-actual;
    loss=pre-post;
    return {unitId:id,preBattleCount:pre,postBattleCount:post,casualties:loss,unitState:post?'COMMANDABLE':'ELIMINATED'};
  });
  s=settleCampaignRound(s,{format:'combat-battle-result-v1',battleId,decisionRef:battleId,sourceRevision:s.battleSequence,units},s.armies[attackerId].factionId,
    {permanentLossRatio:.3,captorByArmyId:{[attackerId]:s.armies[targetId].factionId,[targetId]:s.armies[attackerId].factionId}});
  if(defect){defectCampaignArmy(s,targetId,s.armies[attackerId].factionId);prediction.effectLines.push(ruleLine(s,attackerId,'DEFECTION','\uC7A5\uC218\uC640 \uBD80\uB300 \uADC0\uC21C'));}
  for(const u of units)if(!u.postBattleCount){const killer=u.unitId===attackerId?targetId:attackerId;if(s.armies[killer].troopCount>0&&hasCampaignRule(s,killer,'ABSORB')){absorbCampaignPersonnel(s,killer,u.unitId,u.preBattleCount);prediction.effectLines.push(ruleLine(s,killer,'ABSORB','\uC6D0\uB798 \uBCD1\uB825 20% \uD761\uC218'));}}
  prediction.enemyLoss=units.find(u=>u.unitId===targetId).casualties;prediction.allyLoss=units.find(u=>u.unitId===attackerId).casualties;
  s.armies[attackerId].effectFirstAttackTurn=s.turn;
  if(!options.reaction){consumeMainAction(s,attackerId,{attack:true});consumeC22Attack(s,attackerId);}
  const moraleChanges=[...prediction.earlyMoraleChanges],formationChanges=[...prediction.earlyFormationChanges];
  for(const u of units)if(s.armies[u.unitId].c27?.saved){delete s.armies[u.unitId].c27.saved;changeMorale(s,u.unitId,'ROUTING','아홉 목숨',moraleChanges);}
  if(prediction.earlyState){s.rng=structuredClone(prediction.earlyState.rng);s.armies[attackerId].formation=prediction.earlyState.formation;s.armies[attackerId].morale=prediction.earlyState.morale;delete s.armies[attackerId].formationWeight;delete s.armies[attackerId].formationRecovery;delete s.armies[attackerId].combatMoraleEffects;}
  combatFormation(s,units.filter(u=>!prediction.firstStrike||u.unitId!==attackerId),attackerId,targetId,prediction,formationChanges,moraleChanges);
  for(const u of units){
    if((!prediction.firstStrike||u.unitId!==attackerId)&&u.postBattleCount&&u.casualties/u.preBattleCount>=lossMoraleThreshold(s,s.armies[u.unitId]))checkMorale(s,u.unitId,'대손실',15,moraleChanges);
    if(u.unitId===targetId&&u.postBattleCount&&prediction.multipliers.flank>=1.1)checkMorale(s,u.unitId,'협공',10,moraleChanges);
  }
  const sources=units.filter(u=>!u.postBattleCount||s.armies[u.unitId].morale==='ROUTING'&&state.armies[u.unitId].morale!=='ROUTING').map(u=>state.armies[u.unitId]);
  const notified=new Set();
  while(sources.length){const source=sources.shift();if(notified.has(source.armyId))continue;notified.add(source.armyId);const start=moraleChanges.length;nearbyMorale(s,source,moraleChanges);for(const e of moraleChanges.slice(start))if(e.to==='ROUTING')sources.push(state.armies[e.armyId]);}
  for(const a of Object.values(s.armies))if(a.morale==='ROUTING'&&!formationChanges.some(f=>f.armyId===a.armyId&&f.to==='BROKEN')&&state.armies[a.armyId].formation!=='BROKEN')formationChanges.push({armyId:a.armyId,from:state.armies[a.armyId].formation,to:'BROKEN'});
  const facingTurned=turnDefender(s,attackerId,targetId,prediction.side);
  s.combatLog??=[];
  s.lastCombat={formationChanges,facingTurned,kind:options.reaction?'OVERWATCH':tactic?'TACTIC':'ATTACK',...(tactic?{tacticName:tactic.name,tacticId:tactic.traitId}:{}),turn:s.turn,moraleChanges,eliminatedIds:units.filter(u=>!u.postBattleCount).map(u=>u.unitId),sequence:s.battleSequence,attackerId,targetId,...prediction,units};
  fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);
  if(armyClass(s,attackerId,'CLS_ACCEPT_SURRENDER')&&s.armies[targetId].morale==='ROUTING'&&state.armies[targetId].morale!=='ROUTING'&&s.armies[targetId].troopCount>0){const pre=s.armies[targetId].troopCount,extra={unitId:targetId,preBattleCount:pre,postBattleCount:0,casualties:pre,unitState:'ELIMINATED'},log=s.lastCombat;s.battleSequence++;const key='SURRENDER.'+s.battleSequence;s=settleCampaignRound(s,{format:'combat-battle-result-v1',battleId:key,decisionRef:key,sourceRevision:s.battleSequence,units:[extra]},s.armies[attackerId].factionId,{permanentLossRatio:0,captorByArmyId:{[targetId]:s.armies[attackerId].factionId},classCaptorId:attackerId});log.units.push(extra);log.eliminatedIds.push(targetId);log.enemyLoss+=pre;s.lastCombat=log;}
  if(armyClass(s,attackerId,'CLS_ACCEPT_SURRENDER')&&!s.armies[targetId].troopCount)classSurrenderReserve(s,attackerId,targetId,state.armies[targetId].troopCount,s.lastCombat.effectLines);
  if(c33Formation(s,attackerId,'FORMATION_CRANE')&&combatAlly(s,attackerId,targetId))checkFormation(s,targetId,10,s.lastCombat.formationChanges);
  if(!options.reaction)classAfterAttack(s,state,attackerId,targetId,s.lastCombat,{formation:(id,n)=>changeFormation(s,id,n,s.lastCombat.formationChanges),check:(id,n)=>checkFormation(s,id,n,s.lastCombat.formationChanges),morale:(id,to)=>changeMorale(s,id,to,'클래스 능력',s.lastCombat.moraleChanges),canPush:(id,to)=>combatEmptyStep(s,id,to),moraleCheck:(id,n)=>checkMorale(s,id,'클래스 능력',n,s.lastCombat.moraleChanges)});
  if(!options.reaction)c33AfterAttack(s,state,attackerId,targetId,s.lastCombat,(who,n)=>healCampaignTroops(s,who,n));
  if(!options.reaction)uniqueAfterAttack(s,state,attackerId,targetId,s.lastCombat,(who,n)=>healCampaignTroops(s,who,n),rows=>{s.battleSequence++;s=uniqueAdoptState(s,combatEffectDamage(s,attackerId,rows,s.lastCombat));});
  if(!options.reaction){combatFinishAttack(s,state,attackerId,targetId,s.lastCombat);for(const rule of ['CHARGE_MOMENTUM','NO_FRONT','AMBUSHER','NO_COUNTER_ON_FLANK'])if(combatRule(s,attackerId,rule)&&prediction.effectLines.some(l=>l.includes(combatRule(s,attackerId,rule).card.name)))combatCount(s,rule);}
  if(prediction.reflect)combatCount(s,'SET_SPEARS');
  for(const rule of ['HEDGEHOG','SQUARE'])if(combatRule(s,targetId,rule)&&prediction.effectLines.some(l=>l.includes(combatRule(s,targetId,rule).card.name)))combatCount(s,rule);
  for(const u of units)if(!u.postBattleCount)triggerEffects(s,u.unitId===s.lastCombat.attackerId?s.lastCombat.targetId:s.lastCombat.attackerId,'ON_KILL',{targetId:u.unitId});
  if(!options.reaction)s.armies[attackerId].effectStates=s.armies[attackerId].effectStates.filter(e=>!e.c29NextAttack);
  supplyCombatLoot(s,s.lastCombat);if(prediction.counter)supplyCombatLoot(s,s.lastCombat,targetId);
  if(!tactic&&!options.reaction){const r=c29Record(s,attackerId);if(r?.c29?.spellbladeTurn===s.turn)delete r.c29.spellbladeTurn;}
  c29PostCombat(s,s.lastCombat,{morale:(who,to)=>changeMorale(s,who,to,'? ?? ??',s.lastCombat.moraleChanges),formation:(who,n)=>changeFormation(s,who,n,s.lastCombat.formationChanges)});
  c30Combat(s,s.lastCombat,{morale:who=>checkMorale(s,who,'여포군 — 인접 적 패주',10,s.lastCombat.moraleChanges)});
  relationCombatResult(s,state,attackerId,targetId,s.lastCombat);for(const u of s.lastCombat.units)if(u.unitId!==targetId&&state.armies[u.unitId]?.factionId!==state.armies[attackerId].factionId)relationCombatResult(s,state,attackerId,u.unitId,s.lastCombat,{record:false});creditCampaignCombat(s,s.lastCombat);
  updateKnowledge(s);refreshCampaignSieges(s);
  rememberDiplomacyCombat(s,state);return s;
}
const wallSiege=(s,id,c)=>hasCampaignRule(s,id,'SIEGE_FROM_WALL')&&c.footprint.walls.some(w=>hexDistance(s.tiles[w],s.tiles[s.armies[id].tileId])===1)&&hexDistance(s.tiles[c.tileId],s.tiles[s.armies[id].tileId])===2;
export function cityAttackTargets(s,id) {
  const a=s.armies[id];
  if(!a||a.c34?.disarmUntil>=s.turn||a.c32?.disarmUntil>=s.turn||archerAttackReason(s,id)||attackConfused(s,id)||!castleArmyActive(s,a)||a.morale==='ROUTING'||!canMainAction(s,id))return [];
  return Object.values(s.cities).filter(c=>(troopToCampaign(a.troopType)!=='BT03'||hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])>1&&(!(specialTroop(s,a.troopType)&&a.troopType==='catapult')? !c.footprint.gates.some(g=>hexDistance(s.tiles[a.tileId],s.tiles[g])<=1):true))&&!diplomacyAttackReason(s,id,c.cityId)&&c.ownerFactionId!==a.factionId&&(c.footprint.gates.includes(a.tileId)||wallSiege(s,id,c)||specialTroop(s,a.troopType)&&a.troopType==='catapult'&&hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])===2)&&
    (wallSiege(s,id,c)||specialTroop(s,a.troopType)&&a.troopType==='catapult'||!Object.values(s.armies).some(d=>d.tileId===c.tileId&&castleArmyActive(s,d)))).map(c=>c.cityId).sort();
}
export function previewCityAttack(s,id,cityId) {
  if(!cityAttackTargets(s,id).includes(cityId))throw new Error(archerAttackReason(s,id)||'INVALID_CAMPAIGN_CITY_ATTACK');
  s=prepareAttackEffects(s,id,cityId);
  const a=s.armies[id],stats=s.officers[a.commanderId].baseStats;
  const effect=damageEffects(s,id,cityId);
  const social=relationAttack(s,id,cityId);effect.factor*=social.factor;effect.lines.push(...social.lines);
  const attack=campaignAttackPower(s,a.commanderId)*(a.morale==='SHAKEN'?.8:1);
  const garrison=Object.values(s.armies).find(b=>b.factionId===s.cities[cityId].ownerFactionId&&b.tileId===s.cities[cityId].tileId&&castleArmyActive(s,b)&&hasCampaignRule(s,b.armyId,'GARRISON_WALL'));
  const rawDamage=garrison?0:Math.min(s.cities[cityId].durability,hasCampaignRule(s,id,'BREACH')&&s.cities[cityId].durability<=50?s.cities[cityId].durability:Math.max(1,Math.round((c33Owned(s,id,'SIEGE_BONUS')?1.2:1)*c33InventorSiege(s,s.armies[id].factionId)*(1+(armyClass(s,id,'CLS_TAKE_CITY')?.ability.params.siegeDamage??0)/100)*uniqueSiegeFactor(s,id)*(specialTroop(s,a.troopType)?.siegeMultiplier??1)*effect.factor*c31DamageFactor(s,a,{factionId:s.cities[cityId].ownerFactionId,tileId:s.cities[cityId].tileId})*c22AttackMultiplier(s,a,s.cities[cityId].ownerFactionId)*starAttackMultiplier(s,a)*a.troopCount*.1*attack/100)));
  const dealt=domesticWall(s,s.cities[cityId],rawDamage);
  return {dealt,...(['v2','v3'].includes(s.mapId)?{multipliers:{relations:social.factor}}:{}),...(dealt!==rawDamage?{wallDamage:rawDamage}:{}),effectLines:[...(armyClass(s,id,'CLS_TAKE_CITY')?[classLine(armyClass(s,id),'성 내구도 피해 +20%')]:[]),...effect.lines,...(dealt>0&&dealt===s.cities[cityId].durability&&combatRule(s,id,'BREACH_RALLY')?[combatRuleLine(s,id,'BREACH_RALLY','자기 사기 한 단계 회복')]:[]),...(garrison?[ruleLine(s,garrison.armyId,'GARRISON_WALL','\uC131 \uB0B4\uAD6C \uD53C\uD574 0')]:[]),...(hasCampaignRule(s,id,'SIEGE_FROM_WALL')?[ruleLine(s,id,'SIEGE_FROM_WALL','\uC131\uBCBD \uACF5\uACA9')]:[])]};
}
export function resolveCityAttack(state,id,cityId) {
  state=structuredClone(state);supplyCombat(state,[id]);
  const reason=diplomacyAttackReason(state,id,cityId);if(reason)throw new Error(reason);
  const p=previewCityAttack(state,id,cityId);let s=prepareAttackEffects(state,id,cityId);
  recordRelationAttack(s,id,cityId);
  c34AfterCity(s,id);s.armies[id].effectFirstAttackTurn=s.turn;delete s.armies[id].starVanguardTurn;
  p.dealt=domesticWall(s,s.cities[cityId],p.wallDamage??p.dealt,{commit:true});s.cities[cityId].durability-=p.dealt;s.battleSequence++;if(specialTroop(s,s.armies[id].troopType)&&s.armies[id].troopType==='catapult'){s.c24Stats??={musters:{},catapultCityDamage:0};s.c24Stats.catapultCityDamage+=p.dealt;}
  consumeMainAction(s,id,{attack:true});consumeC22Attack(s,id);
  s.lastCombat={kind:'CITY',turn:s.turn,sequence:s.battleSequence,attackerId:id,cityId,dealt:p.dealt,effectLines:p.effectLines,enemyLoss:p.dealt,allyLoss:0,counter:false,units:[],moraleChanges:[],eliminatedIds:[]};
  if(p.dealt>0&&s.cities[cityId].durability===0&&combatRule(s,id,'BREACH_RALLY')){const a=s.armies[id];changeMorale(s,id,a.morale==='ROUTING'?'SHAKEN':'STEADY','성문을 부순다',s.lastCombat.moraleChanges);s.lastCombat.effectLines.push(combatRuleLine(s,id,'BREACH_RALLY','자기 사기 한 단계 회복'));combatCount(s,'BREACH_RALLY');}
  s.combatLog??=[];fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);
  recordCampaignCombatCareer(s,s.lastCombat);c31Combat(s,s.lastCombat);
  turnFacing(s,id,cityId);
  if(s.cities[cityId].durability===0&&!Object.values(s.armies).some(d=>d.tileId===s.cities[cityId].tileId&&castleArmyActive(s,d))){
    const c=s.cities[cityId],a=s.armies[id],formerOwnerFactionId=c.ownerFactionId;
    a.tileId=c.tileId;a.movementState=null;a.currentOrder=null;
    s=settleCampaignPayloads(s,[],[{transactionId:`CITY_ATTACK.${s.globalTick}.${s.battleSequence}`,sourceResultId:`CITY_ATTACK.${s.battleSequence}`,globalTick:s.globalTick,capturedCityId:cityId,formerOwnerFactionId,occupierFactionId:a.factionId}]);
    s.lastCombat.captureLine=`${s.cityDisplayNames?.[cityId]??c.name} 함락 — ${s.officers[a.commanderId].name}`;c31Combat(s,s.lastCombat);
    supplyCityLoot(s,id,cityId,s.lastCombat);relationVictory(s,id);
  }
  updateKnowledge(s);refreshCampaignSieges(s);rememberDiplomacyCombat(s,state);return s;
}
export function strikeCampaignCities(state,factionId) {
  let s=structuredClone(state);
  s.cityStrikeTurns??={};
  if(s.cityStrikeTurns[factionId]===s.turn)return s;
  s.cityStrikeTurns[factionId]=s.turn;
  for(const c of Object.values(s.cities).sort((a,b)=>a.cityId.localeCompare(b.cityId))){
    if(c.ownerFactionId===null||c.ownerFactionId!==factionId||c.durability<=0||c.c27?.insideUntil>=s.turn)continue;
    const target=Object.values(s.armies).filter(a=>diplomacyHostile(s,factionId,a.factionId)&&!withdrawalProtection(s,a.armyId)&&castleArmyActive(s,a)&&!hasCampaignRule(s,a.armyId,'SIEGE_IMMUNE')&&c.footprint.gates.includes(a.tileId))
      .sort((a,b)=>a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId,'en'))[0];
    if(!target)continue;
    triggerEffects(s,target.armyId,'ON_DEFEND',{targetId:c.cityId});
    const effect=damageEffects(s,c.cityId,target.armyId,{first:false});
    const strike=domesticStrike(s,c,{commit:true});
    const pre=target.troopCount,loss=surviveRule(s,target.armyId,Math.min(Math.max(strike===0?0:1,Math.round((20+(c20Enabled(s)&&c.ownerFactionId==='F03'&&c.starDefenseUntil>=s.turn?C20.cityDamage:0))*c31CityCounter(s,c)*(target.c33?.smokeUntil>=s.turn?.6:1)*c24DamageFactor(s,{tileId:c.tileId},target,false,{ranged:true})*effect.factor*strike)),pre)),post=pre-loss;
    s.battleSequence++;const battleId=`MC.${s.battleSequence}`;
    const units=[{unitId:target.armyId,preBattleCount:pre,postBattleCount:post,casualties:loss,unitState:post?'COMMANDABLE':'ELIMINATED'}];
    s=settleCampaignRound(s,{format:'combat-battle-result-v1',battleId,decisionRef:battleId,sourceRevision:s.battleSequence,units},factionId,{permanentLossRatio:.3,captorByArmyId:{[target.armyId]:factionId},attackingCityId:c.cityId});
    s.lastCombat={kind:'CITY_STRIKE',turn:s.turn,sequence:s.battleSequence,cityId:c.cityId,targetId:target.armyId,enemyLoss:loss,allyLoss:0,counter:false,units,moraleChanges:[],eliminatedIds:post?[]:[target.armyId]};
    if(s.armies[target.armyId].c27?.saved){delete s.armies[target.armyId].c27.saved;changeMorale(s,target.armyId,'ROUTING','아홉 목숨',s.lastCombat.moraleChanges);s.lastCombat.effectLines=[combatRuleLine(s,target.armyId,'NINE_LIVES','병력 5%로 패주')];}
    s.combatLog??=[];fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);recordCampaignCombatCareer(s,s.lastCombat);c31Combat(s,s.lastCombat);
  }
  updateKnowledge(s);refreshCampaignSieges(s);rememberDiplomacyCombat(s,state);return s;
}
export function recoverCampaignCities(s) {
  refreshCampaignSieges(s);
  for(const c of Object.values(s.cities))if((!c.besieged||uniqueHoldLand(s,c))&&!(c.c27?.insideUntil>=s.turn))c.durability=Math.min(c.durabilityMax,c.durability+(c.kind==='minor'?10:20)*(c33Governor(s,c,'REPAIR_BONUS')?1.5:1)*(uniqueGovernor(s,c,'U_HOLD_LAND')?1.5:1)*(uniqueGovernor(s,c,'U_SCHOLAR_BUILDER')?2:1));
  return s;
}
export function armyActionEnded(s,id) {
  return !s.armies[id]||s.armies[id].morale==='ROUTING'||!castleArmyActive(s,s.armies[id])||(s.endedArmyIds??[]).includes(id)||
    (!canMainAction(s,id)&&!(hasCampaignRule(s,id,'MOVE_AFTER_ATTACK')&&!s.movedArmyIds.includes(id))&&!combatCanPostMove(s,id))||(s.movedArmyIds.includes(id)&&attackTargets(s,id).length===0&&cityAttackTargets(s,id).length===0&&!campaignTactics(s,id).some(c=>c.targets.length)&&recallReason(s,id)!==''&&!starAction(s,{armyId:id},s.armies[id].factionId)?.canUse);
}
export const allPlayerActionsEnded=s=>Object.values(s.armies).filter(a=>a.factionId===s.playerFactionId&&castleArmyActive(s,a)).every(a=>armyActionEnded(s,a.armyId));

function shownPrediction(s,id,targetId,p){if(!s.armies[targetId]||campaignShownScale(s,targetId,s.armies[id].factionId)!==2)return p;const shownTargetCount=campaignShownCount(s,targetId,s.armies[id].factionId);return {...p,shownTargetCount,shownTargetAfter:Math.max(0,shownTargetCount-(p.enemyLoss??0))};}
export function previewTactic(s,id,traitId,targetId){return shownPrediction(s,id,targetId,previewTacticNumbers(s,id,traitId,targetId));}
function previewTacticNumbers(s,id,traitId,targetId){
  const reason=diplomacyAttackReason(s,id,targetId);if(reason)throw new Error(reason);
  const card=campaignTactics(s,id).find(c=>c.traitId===traitId);
  if(!card?.targets.includes(targetId))throw new Error(card&&tacticIsDamage(card)&&archerAttackReason(s,id)||'INVALID_CAMPAIGN_TACTIC');
  if(card.jointArmyIds||card.modifier||card.fork||card.evolution||card.signature)return resolveTactic(s,id,traitId,targetId,{skipPreview:true}).lastCombat;
  if(c33Card(card))return resolveC33Tactic(s,id,card,targetId).lastCombat;
  if((card.commonBase||card.id?.startsWith('CTA-')))return resolveProtectedCommonTactic(s,id,card,targetId).lastCombat;
  if(uniqueEnabled(s)&&card.effects.some(e=>e.rule?.startsWith('U_')))return resolveUniqueCombatTactic(s,id,card,targetId).lastCombat;
  return tacticIsDamage(card)?attackNumbers(prepareAttackEffects(s,id,targetId,{tactic:card}),id,targetId,{tactic:card}):{effectOnly:true,effectLines:[card.name]};
}
export function resolveTactic(state,id,traitId,targetId,{skipPreview=false}={}){
  const reason=diplomacyAttackReason(state,id,targetId);if(reason)throw new Error(reason);
  if(!skipPreview)previewTactic(state,id,traitId,targetId);
  const card=campaignTactics(state,id).find(c=>c.traitId===traitId);
  let s;
  if(c33Card(card))s=resolveC33Tactic(state,id,card,targetId);
  else if(card.jointArmyIds)s=resolveJointTactic(state,id,card,targetId);
  else if((card.commonBase||card.id?.startsWith('CTA-')))s=resolveProtectedCommonTactic(state,id,card,targetId);
  else if(uniqueEnabled(state)&&card.effects.some(e=>e.rule?.startsWith('U_')))s=resolveUniqueCombatTactic(state,id,card,targetId);
  else if(tacticIsDamage(card))s=resolveAttack(state,id,targetId,card);
  else {
    s=structuredClone(state);turnFacing(s,id,targetId);initializeCampaignEffects(s);const formationChanges=[],moraleChanges=[];triggerEffects(s,id,'ON_TACTIC_USE',{targetId,formationChanges,moraleChanges},card);
    consumeMainAction(s,id,{attack:true});s.battleSequence++;
    s.lastCombat={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges,facingTurned:false,moraleChanges,eliminatedIds:[]};
    s.combatLog??=[];fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);updateKnowledge(s);refreshCampaignSieges(s);
  }
  if(!s.campaignGrowth.officers[s.armies[id].commanderId]?.traceEvents?.[`CAREER.COMBAT.${s.lastCombat.sequence}`])recordCampaignCombatCareer(s,s.lastCombat);c31Combat(s,s.lastCombat);
  recordC28Combat(s,s.lastCombat);
  const hitTargets=[...new Set([targetId,...(s.lastCombat.units??[]).map(u=>u.unitId)])];for(const hit of hitTargets)recordC28Tactic(s,id,hit,card,`TACTIC.${s.battleSequence}`);
  recordCareer(s,s.armies[id].commanderId,`CAREER.TACTIC.${s.battleSequence}`,{tactic:1});
  s=finishC29Tactic(s,state,id,card,targetId);classExtendFire(s,state,id,s.lastCombat);
  c31ExtendStatuses(s,state,id);s.armies[id].tacticReadyTurns[traitId]=s.turn+card.cooldown-(card.modifier?.rule==='REFUND_ON_SUCCESS'&&c29ControlSuccess(s,state,id,card,targetId)?card.modifier.params.refund:0);s.armies[id].tacticUsedTurn=s.turn;
  if(uniqueOwned(s,id,'U_FIRE_GOD')&&s.lastCombat.enemyLoss>0){const burning=Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&castleArmyActive(s,b)&&((s.c32?.fires??[]).some(f=>f.until>=s.turn&&f.tileId===b.tileId)||(s.c27?.fires??[]).some(f=>f.until>=s.turn&&f.tiles.includes(b.tileId))));if(burning.length){s.battleSequence++;s=combatEffectDamage(s,id,burning.map(b=>({targetId:b.armyId,loss:Math.max(1,Math.round(b.troopCount*.05))})),s.lastCombat);}}
  uniqueAfterTactic(s,id,card,healCampaignTroops);c34AfterTactic(s,id,card,targetId);c34FlushPoison(s,(source,rows)=>{s.battleSequence++;uniqueAdoptState(s,combatEffectDamage(s,source,rows,s.lastCombat));});
  if(s.lastCombat.enemyLoss>0){const targets=[...new Set((s.lastCombat.units??[]).filter(u=>state.armies[u.unitId]?.factionId!==state.armies[id].factionId).map(u=>u.unitId))];for(const target of targets)relationCombatResult(s,state,id,target,s.lastCombat);}
  if(s.armies[targetId]&&s.armies[targetId].factionId!==s.armies[id].factionId&&s.lastCombat.enemyLoss>0){s.armies[targetId].c27??={};s.armies[targetId].c27.lastHitTactic=structuredClone(card);}
  if(combatTacticRule(card)?.rule==='MIRROR'){const copy=mirroredCombatCard(state,id);s.armies[id].tacticReadyTurns[copy.traitId]=s.turn+copy.cooldown;s.armies[id].tacticReadyTurns[traitId]=s.turn+copy.cooldown;}
  c29PostCombat(s,s.lastCombat,{morale:(who,to)=>changeMorale(s,who,to,'? ?? ??',s.lastCombat.moraleChanges),formation:(who,n)=>changeFormation(s,who,n,s.lastCombat.formationChanges)});c29Combat(s,s.lastCombat);c29TacticUsed(s,id,card);c30TacticUsed(s,id,card);
  c30Combat(s,s.lastCombat,{morale:who=>checkMorale(s,who,'여포군 — 인접 적 패주',10,s.lastCombat.moraleChanges)});
  rememberDiplomacyCombat(s,state);return s;
}

function resolveJointTactic(state,id,card,targetId){
 let s=resolveAttack(state,id,targetId,card),logs=[structuredClone(s.lastCombat)];
 for(const ally of card.jointArmyIds){if(!s.armies[targetId]?.troopCount||!s.armies[ally]?.troopCount||!castleArmyActive(s,s.armies[ally]))continue;s=resolveAttack(s,ally,targetId,null,{reaction:true,joint:true});logs.push(structuredClone(s.lastCombat));}
 for(const who of [id,...card.jointArmyIds])s.armies[who].c30Delay=(s.armies[who].c30Delay??0)+1;
 s.lastCombat={...logs[0],kind:'JOINT_TACTIC',jointAttacks:logs,enemyLoss:logs.reduce((n,c)=>n+c.enemyLoss,0),allyLoss:logs.reduce((n,c)=>n+c.allyLoss,0),effectLines:[...logs.flatMap(c=>c.effectLines),'도원 돌격 — 셋 모두 다음 차례 전법 대기 +1']};
 return s;
}

function combatEffectDamage(state,id,rows,log){
 const relationBefore={armies:structuredClone(state.armies),officers:structuredClone(state.officers),prisonerIds:Object.keys(state.terminal?.prisonersById??{})};
 rows=rows.filter(row=>!diplomacyAttackReason(state,id,row.targetId));if(!rows.length)return state;
 const socialLines=[];rows=rows.map(row=>{if(row.c31Applied||state.armies[row.targetId]?.factionId===state.armies[id]?.factionId)return row;const social=relationAttack(state,id,row.targetId,{reaction:!['TACTIC','TACTIC_EFFECT'].includes(log.kind)});socialLines.push(...social.lines);return {...row,loss:Math.round(row.loss*social.factor)};});log.effectLines.push(...socialLines.filter(l=>!log.effectLines.includes(l)));
 rows=rows.map(row=>({...row,loss:(log.fire&&c33Owned(state,row.targetId,'RATTAN_ARMOR')?2:1)*(row.c31Applied?row.loss:Math.round(row.loss*c31DamageFactor(state,state.armies[id],state.armies[row.targetId])))}));
 if(uniqueEnabled(state))rows=uniqueChainRows(state,rows.map(r=>({id:r.targetId,loss:r.loss}))).map(r=>({targetId:r.id,loss:r.loss}));
 rows=classShare(state,c34ShareRows(state,rows.map(r=>({id:r.targetId,loss:r.loss}))),log.effectLines).map(r=>({targetId:r.id,loss:r.loss}));
 let s=state;const losses=new Map();for(const {targetId,loss} of rows)losses.set(targetId,(losses.get(targetId)??0)+loss);
 const units=[...losses].filter(([target])=>castleArmyActive(s,s.armies[target])).map(([target,loss])=>{const pre=s.armies[target].troopCount,actual=surviveRule(s,target,Math.min(pre,loss),true,log.effectLines);return {unitId:target,preBattleCount:pre,postBattleCount:pre-actual,casualties:actual,unitState:pre>actual?'COMMANDABLE':'ELIMINATED'};});
 if(!units.length)return s;
 for(const u of units)if(s.armies[u.unitId].factionId!==s.armies[id].factionId)dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[u.unitId].commanderId,by:s.armies[id].commanderId});
 const battleId=`C27.${s.battleSequence}.${s.personnel.revision}`;s=settleCampaignRound(s,{format:'combat-battle-result-v1',battleId,decisionRef:battleId,sourceRevision:s.battleSequence,units},s.armies[id].factionId,{permanentLossRatio:.3,captorByArmyId:Object.fromEntries(units.map(u=>[u.unitId,s.armies[u.unitId].factionId!==s.armies[id].factionId?s.armies[id].factionId:s.armies[log.targetId]?.factionId])),escapeCommanderIds:units.filter(u=>s.armies[u.unitId].factionId===s.armies[id].factionId&&(!s.armies[log.targetId]||s.armies[log.targetId].factionId===s.armies[id].factionId)).map(u=>u.unitId)});
 log.units.push(...units);log.enemyLoss+=units.filter(u=>s.armies[u.unitId].factionId!==s.armies[id].factionId).reduce((n,u)=>n+u.casualties,0);log.allyLoss+=units.filter(u=>s.armies[u.unitId].factionId===s.armies[id].factionId).reduce((n,u)=>n+u.casualties,0);log.eliminatedIds.push(...units.filter(u=>!u.postBattleCount).map(u=>u.unitId));
 for(const u of units)if(s.armies[u.unitId].c27?.saved){delete s.armies[u.unitId].c27.saved;changeMorale(s,u.unitId,'ROUTING','아홉 목숨',log.moraleChanges);}
 supplyCombatLoot(s,log,id);fatigueCombat(s,[id,...units.map(u=>u.unitId)],log);s.lastCombat=log;s.combatLog[s.combatLog.length-1]=log;for(const u of units)relationCombatResult(s,relationBefore,id,u.unitId,log,{record:false});return s;
}
// U_* actions share casualty settlement with C27. All secondary hits are finite;
// none dispatches another main action or another signature continuation.
function uniqueAdoptState(s,next){
 for(const [id,a] of Object.entries(s.armies)){Object.assign(a,next.armies[id]);next.armies[id]=a;}
 Object.assign(s,next);return s;
}
function resolveUniqueCombatTactic(state,id,card,target){
 const s=structuredClone(state);initializeCampaignEffects(s);s.battleSequence++;
 const log={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],facingTurned:false,moraleChanges:[],eliminatedIds:[],effectLines:[card.name],hits:[]};
 s.combatLog??=[];fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);s.lastCombat=log;
 const e=card.effects.find(e=>e.rule?.startsWith('U_'));
 const damage=rows=>{s.battleSequence++;uniqueAdoptState(s,combatEffectDamage(s,id,rows.map(row=>({...row,loss:Math.round(row.loss*(card.signatureScale??1))})),log));};
 const hit=(source,to,ratio)=>{
  if(diplomacyAttackReason(s,source,to)||!castleArmyActive(s,s.armies[source])||!castleArmyActive(s,s.armies[to]))return;
  const noCounter=['U_TRIPLE_ASSAULT','U_NIGHT_RAID','U_ESTRANGE','U_DRIVE_TIGER'].includes(e.rule)||log.hits.length>0;
  const prepared=prepareAttackEffects(s,source,to,{first:log.hits.length===0}),p=attackNumbers(prepared,source,to,{reaction:noCounter,first:log.hits.length===0});
  dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[to].commanderId,by:s.armies[source].commanderId});if(!noCounter&&p.counter)dejaVuEvent(s,'ATTACKED_BY',{officerId:s.armies[source].commanderId,by:s.armies[to].commanderId});
  s.rng=prepared.rng;const loss=Math.round(p.damage*ratio/100);
  damage([{targetId:to,loss,c31Applied:true},...(!noCounter&&p.allyLoss?[{targetId:source,loss:p.allyLoss,c31Applied:true}]:[])]);
  log.hits.push({sourceId:source,targetId:to,damage:loss,counter:!noCounter&&p.counter});log.counter||=!noCounter&&p.counter;log.side=p.side;log.charge=p.charge;
 };
 const cancel=uniqueCancelTactic(s,id,target,card);
 if(cancel==='REFLECT')executeCampaignRule(e.rule,{phase:'tactic',s,id:target,target:id,card,attack:hit,damage,heal:(who,n)=>healCampaignTroops(s,who,Math.round(n*(card.signatureScale??1))),retreat:()=>[],cityAttack:()=>{}});
 else if(!cancel)executeCampaignRule(e.rule,{phase:'tactic',s,id,target,card,attack:hit,damage,heal:(who,n)=>healCampaignTroops(s,who,Math.round(n*(card.signatureScale??1))),retreat:n=>combatRetreatPath(s,id,n),cityAttack:ratio=>{
  const c=s.cities[target],base=previewCityAttack(s,id,target).dealt,dealt=Math.min(c.durability,Math.round(base*ratio));c.durability-=dealt;log.dealt=dealt;log.enemyLoss=dealt;log.cityId=target;
  if(!c.durability&&!Object.values(s.armies).some(b=>castleArmyActive(s,b)&&b.tileId===c.tileId)){s.armies[id].tileId=c.tileId;s.armies[id].movementState=null;s.armies[id].currentOrder=null;uniqueAdoptState(s,settleCampaignPayloads(s,[],[{transactionId:`C32.CAPTURE.${s.battleSequence}`,capturedCityId:target,occupierFactionId:s.armies[id].factionId,formerOwnerFactionId:c.ownerFactionId,globalTick:s.globalTick,sourceResultId:`C32.${s.battleSequence}`} ]));supplyCityLoot(s,id,target,log);}
 }});
 if(cancel)log.effectLines.push(cancel==='REFLECT'?'계략 반사':'전법 무효');
 if(log.hits.length&&s.armies[target])uniqueAfterAttack(s,state,id,target,log,(who,n)=>healCampaignTroops(s,who,n),damage);
 uniqueSpreadTactic(s,id,target,card,log,damage);
 consumeMainAction(s,id,{attack:true});s.armies[id].effectFirstAttackTurn=s.turn;
 uniqueScheduleRevival(s,state,log);if(log.cityId)recordCampaignCombatCareer(s,log);else creditCampaignCombat(s,log);updateKnowledge(s);refreshCampaignSieges(s);return s;
}

export function startUniqueFaction(s,factionId){
 const diplomacyBefore=diplomacyEnabled(s)?{turn:s.turn,battleSequence:s.battleSequence,cities:Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,{ownerFactionId:c.ownerFactionId}]))}:null;
 uniqueStart(s,factionId,{heal:(id,n)=>healCampaignTroops(s,id,n),damage:(id,rows)=>{s.battleSequence++;const log={kind:'UNIQUE_START',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:rows[0]?.targetId,units:[],enemyLoss:0,allyLoss:0,moraleChanges:[],formationChanges:[],eliminatedIds:[],effectLines:[]};s.combatLog??=[];fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);uniqueAdoptState(s,combatEffectDamage(s,id,rows,log));}});
 for(const a of Object.values(s.armies).filter(a=>a.factionId===factionId&&a.c32?.prepared?.turn<=s.turn)){
  const p=a.c32.prepared;delete a.c32.prepared;const t=s.armies[p.target];if(!castleArmyActive(s,a)||!castleArmyActive(s,t)||diplomacyAttackReason(s,a.armyId,t.armyId))continue;
  t.effectStates=t.effectStates.filter(e=>!(['DAMAGE_MOD','DEFENSE_MOD','MOVE_MOD'].includes(e.op)&&e.value>0));s.battleSequence++;
  const log={kind:'COFFIN_BATTLE',turn:s.turn,sequence:s.battleSequence,attackerId:a.armyId,targetId:t.armyId,units:[],enemyLoss:0,allyLoss:0,moraleChanges:[],formationChanges:[],eliminatedIds:[],effectLines:['관을 메고 싸운다 — 준비 완료']};s.combatLog??=[];fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);
  uniqueAdoptState(s,combatEffectDamage(s,a.armyId,[{targetId:t.armyId,loss:Math.round(attackFormula(s,a.armyId,t.armyId).damage*p.ratio/100),c31Applied:true}],log));
 }
 if(diplomacyBefore)rememberDiplomacyCombat(s,diplomacyBefore);
}
function resolveCommonCombatTactic(state,id,card,target){
 const e=combatTacticRule(card);
 if(e?.rule==='MIRROR'){
  const copy=mirroredCombatCard(state,id);if(!copy)throw new Error('C27_NO_MIRROR_TACTIC');
  let s=resolveCommonCombatTactic(state,id,copy,target);
  s.lastCombat.effectLines.push(`${card.name} — ${copy.name} 복제 · 대기 공유 ${copy.cooldown}턴`);s.lastCombat.tacticName=card.name;s.lastCombat.tacticId=card.traitId;combatCount(s,'MIRROR');return s;
 }
 let s=tacticIsDamage(card)?resolveAttack(state,id,target,card):structuredClone(state);
 if(!tacticIsDamage(card)){
  initializeCampaignEffects(s);triggerEffects(s,id,'ON_TACTIC_USE',{targetId:target,rallyRange:2+(card.modifier?.rule==='RALLY_RANGE'?card.modifier.params.extra:0)+(card.id==='CTA-05'&&card.fork==='a'?1:0)},card);consumeMainAction(s,id,{attack:true});s.battleSequence++;
  s.lastCombat={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],facingTurned:false,moraleChanges:[],eliminatedIds:[],effectOnly:true,effectLines:[]};s.combatLog??=[];fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);
 }
  if(e)s=executeCampaignRule(e.rule,{s,id,card,target,e,before:state,apply:applyCommonCombatRule});
 else {if(card.id)combatCount(s,card.id);s.lastCombat.effectLines.push(`${card.name} — 인접 아군 사기 회복`);}
 // Remember a finite data card, never a continuation or recursive action.
 if(s.armies[target]&&s.armies[target].factionId!==s.armies[id].factionId&&s.lastCombat.enemyLoss>0){s.armies[target].c27??={};s.armies[target].c27.lastHitTactic=structuredClone(card);}
 if(s.armies[target])combatRecordRouts(s,state,id,target);
 updateKnowledge(s);refreshCampaignSieges(s);return s;
}
function resolveProtectedCommonTactic(state,id,card,target){
 const check=structuredClone(state),victim=check.armies[target]??combatArmyAt(check,target),cancel=victim?(uniqueCancelTactic(check,id,victim.armyId,card)||([card.classTag].flat().includes('지략')&&c33Owned(check,victim.armyId,'DIVINE_CALC')&&campaignRoll(check)<50?'CANCEL':null)):null;
 if(!cancel)return resolveCommonCombatTactic(check,id,card,target);
 let s=check;
 if(cancel==='REFLECT'){
  const reflector=victim.armyId,action={mainActionTurn:victim.mainActionTurn,mainActionCount:victim.mainActionCount},arrays={attackedArmyIds:[...s.attackedArmyIds],endedArmyIds:[...s.endedArmyIds]};
  s=resolveCommonCombatTactic(s,reflector,card,combatTacticRule(card)?.rule==='FIRE_ATTACK'?s.armies[id].tileId:id);
  for(const [key,value] of Object.entries(action))if(value===undefined)delete s.armies[reflector][key];else s.armies[reflector][key]=value;
  Object.assign(s,arrays);s.lastCombat.reflectedBy=reflector;s.lastCombat.attackerId=id;s.lastCombat.targetId=target;s.lastCombat.effectLines.push('계략 반사');
 }else{
  s.battleSequence++;s.lastCombat={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],facingTurned:false,moraleChanges:[],eliminatedIds:[],effectLines:['전법 무효']};s.combatLog??=[];fatigueCombat(s,[s.lastCombat.attackerId,s.lastCombat.targetId],s.lastCombat);s.combatLog.push(s.lastCombat);
 }
 consumeMainAction(s,id,{attack:true});updateKnowledge(s);return s;
}
function applyCommonCombatRule({s,id,card,target,e,before}){
 let a=s.armies[id],t=s.armies[target];const p=combatParams(e.params,card.rank),log=s.lastCombat,lines=log.effectLines;const line=detail=>lines.push(`${card.name} — ${detail}`),lower=(army,reason)=>changeMorale(s,army.armyId,army.morale==='STEADY'?'SHAKEN':'ROUTING',reason,log.moraleChanges);
 a.c27??={};combatCount(s,e.rule);
 if(['TAUNT','FALSE_ORDERS'].includes(e.rule)&&c33Immune(s,target,e.rule==='FALSE_ORDERS'?'ROOTED':'TAUNT',id)){line('통제 효과 무시');return s;}
 if(['SHOVE','TAUNT','FALSE_ORDERS'].includes(e.rule)&&c28ControlGuard(s,target,e.rule==='FALSE_ORDERS'?'ROOTED':e.rule)){line('교훈 — 통제 효과 무시');return s;}
 switch(e.rule){
  case 'SHOVE':{let moved=0;for(let n=0;n<(card.fork==='a'?2:Math.floor(p.push));n++){const to=oppositeCombatTile(s,id,target);if(!combatEmptyStep(s,target,to))break;t.tileId=to;moved++;}if(!moved)checkFormation(s,target,p.blockedFormation,log.formationChanges);line(moved?`${moved}칸 밀기`:`막힘 · 전열 판정 ${p.blockedFormation}`);break;}
  case 'SWAP':{const from=a.tileId;a.tileId=t.tileId;t.tileId=from;line('인접 아군 자리 교환 · 정면 유지');break;}
  case 'SHATTER_LINE':if(t.troopCount>0){if(t.formation==='ORDERED')changeFormation(s,target,1,log.formationChanges);t.c27??={};t.c27.noCounterUntil=s.turn+(s.campaignEffects.startedTurns[t.factionId]===s.turn?1:0);line('흐트러짐 · 다음 차례까지 반격 불가');}break;
  case 'TAUNT':if(!uniqueImmune(s,target,'TAUNT'))turnFacing(s,target,id);line('대상 정면을 이쪽으로');break;
  case 'OVERWATCH':a.c27.overwatch={until:s.turn+1,range:p.range,used:false};line('다음 내 차례까지 정면 2칸 첫 진입 1회 사격');break;
  case 'PIERCE':case 'DUAL_STRIKE':break; // Already settled in attackNumbers.
  case 'MORALE_CONTEST':if(s.officers[a.commanderId].baseStats.leadership>s.officers[t.commanderId].baseStats.leadership){lower(t,card.name);line('지휘 승리 · 대상 사기 한 단계');}else {if(p.loseWeight>0)checkMorale(s,id,card.name,p.loseWeight,log.moraleChanges);line(`지휘 실패 · 자기 사기 판정 ${p.loseWeight}`);}break;
  case 'FALSE_ORDERS':if(!uniqueImmune(s,target,'ROOTED')&&(c33Owned(s,id,'DIVINE_CALC')||s.officers[a.commanderId].baseStats.intelligence+c30Strategy(s,id)>s.officers[t.commanderId].baseStats.intelligence)){t.c27??={};t.c27.rootTurn=s.turn+(s.campaignEffects.startedTurns[t.factionId]===s.turn?1:0);line('지략 승리 · 대상 ROOTED 1차례');}else line('지략 비교 실패');break;
  case 'STAKES':a.c27.stakes={until:s.turn+1};a.c27.rootTurn=s.turn+1;line('측면·돌격 보너스 무효 · 대가 다음 차례 이동 불가');break;
  case 'FIRE_ATTACK':{log.fire=true;const tiles=new Set([target]);let frontier=[target];for(let n=0;n<Math.floor(p.spread);n++){frontier=frontier.flatMap(at=>boardNeighbors(s.tiles[at],s.tiles).map(tileId).filter(to=>s.tiles[to].terrainType==='forest'&&!tiles.has(to)));frontier.forEach(to=>tiles.add(to));}s.c27??={counts:{}};s.c27.fires??=[];s.c27.fires.push({... (diplomacyEnabled(s)?{source:id}:{}),tiles:[...tiles],until:s.turn+(e.params.turns??1)-1});const rows=[...tiles].map(at=>combatArmyAt(s,at)).filter(b=>b&&!diplomacyAttackReason(s,id,b.armyId)&&!uniqueOwned(s,b.armyId,'U_FIRE_GOD')).map(b=>({targetId:b.armyId,loss:Math.max(1,Math.round(c30ElementDamage(s,id,b.armyId,b.troopCount*.1)*(uniqueOwned(s,id,'U_FIRE_GOD')?1.5:1)*(c28Rule(s,b.armyId,'FIRE_WARD')?C28.fireReduce:1)))}));s=combatEffectDamage(s,id,rows,log);for(const row of rows)if(!c28Rule(s,row.targetId,'FIRE_WARD'))checkFormation(s,row.targetId,p.formation,log.formationChanges);line(`숲 ${tiles.size}칸 · 피해 10% · 불 1차례`);break;}
  case 'AMBUSH':a.c27.ambush=true;line('숲에서 첫 공격까지 숨김 · 첫 공격 후방');break;
  case 'FEIGNED_RETREAT':{const path=combatRetreatPath(s,id,p.back);if(path.length){a.tileId=path.at(-1);a.movedTiles+=path.length;}a.c27.feigned={until:s.turn+1};line(`추격 없이 ${path.length}칸 후퇴`);break;}
  case 'INSIDE_AGENT':{const c=s.cities[target],governor=s.officers[c.governorId],command=governor?.baseStats.intelligence??50;if(s.officers[a.commanderId].baseStats.intelligence+c30Strategy(s,id)>command){c.c27??={};c.c27.insideUntil=s.turn+(s.campaignEffects.startedTurns[c.ownerFactionId]===s.turn?1:0);line('내통 성공 · 성 사격·회복 1차례 없음');}else {lower(a,card.name);line('대가: 지략 실패 · 자기 사기 한 단계');}break;}
  case 'FLOOD':{const ends=target.split('|'),next=s.mapRules.riverEdges.filter(edge=>edge!==target&&edge.split('|').some(t=>ends.includes(t))).sort()[0],edges=[target,...(next?[next]:[])];s.c27??={counts:{}};s.c27.floods??=[];s.c27.floods.push({edges,until:s.turn+Math.floor(p.turns)-1});for(const b of Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&edges.flatMap(e=>e.split('|')).includes(b.tileId)))checkFormation(s,b.armyId,10,log.formationChanges);a.c27.floodCostTurn=s.turn+1;line(`강 변 ${edges.length}개 ${Math.floor(p.turns)}차례 통행 불가 · 대가 다음 이동 −2`);break;}
  case 'WOODPECKER':{const ally=combatAlly(s,id,target,{behind:true});if(!ally)throw new Error('C27_WOODPECKER_ALLY_REQUIRED');const loss=attackFormula(s,ally.armyId,target,undefined,{reaction:true,forceSide:'REAR',first:false}).damage;s=combatEffectDamage(s,id,[{targetId:target,loss,c31Applied:true}],log);if(s.armies[target].troopCount){const ray=neighbors(s.tiles[t.tileId])[directionToward(s.tiles[t.tileId],s.tiles[a.tileId])],to=tileId(ray);if(combatEmptyStep(s,target,to))s.armies[target].tileId=to;}if(!s.endedArmyIds.includes(ally.armyId))s.endedArmyIds.push(ally.armyId);line(`${s.officers[ally.commanderId].name} 후방 공격 −${loss} · 대가 아군 행동 종료`);break;}
  case 'GALEFORCE':if(t.morale==='ROUTING'&&before.armies[target].morale!=='ROUTING'&&s.armies[id].c27.extraTurn!==s.turn){a.c27.extraTurn=s.turn;s.endedArmyIds=s.endedArmyIds.filter(k=>k!==id);line('패주 성공 · 차례당 1회 추가 행동');}else if(t.morale!=='ROUTING'){if(a.formation==='ORDERED')changeFormation(s,id,1,log.formationChanges);line('대가: 패주 실패 · 자기 흐트러짐');}break;
 }
 if(!tacticIsDamage(card))creditCampaignCombat(s,log);
 return s;
}

export function defectionEligible(s,id){
 const a=s.armies[id],f=s.factions[a.factionId],strength=s.personnel.formations.find(f=>f.formationId===id).targetStrength;
 const capital=s.cities[f.capitalCityId];
 return a.troopCount<=strength*.3&&a.commanderId!==f.rulerId&&(!capital||![capital.tileId,...capital.footprint.gates].includes(a.tileId));
}
export function resolveOverwatch(state,moverId,fromTileId,{stopped=true}={}){
 let s=resolveC27MovementEffects(state,moverId,fromTileId,stopped);c34Movement(s,moverId,fromTileId,{damage:(source,rows)=>{s.battleSequence++;const log={kind:'C34_MOVEMENT',turn:s.turn,sequence:s.battleSequence,attackerId:source,targetId:moverId,units:[],enemyLoss:0,allyLoss:0,moraleChanges:[],formationChanges:[],eliminatedIds:[],effectLines:[]};fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);uniqueAdoptState(s,combatEffectDamage(s,source,rows,log));}});const mover=s.armies[moverId];
 const trap=(s.c33?.traps??[]).find(t=>t.tileId===mover.tileId&&diplomacyHostile(s,t.factionId,mover.factionId)&&!withdrawalProtection(s,moverId));if(trap&&fromTileId!==mover.tileId){s.c33.traps=s.c33.traps.filter(t=>t!==trap);s.battleSequence++;const log={kind:'TRAP',turn:s.turn,sequence:s.battleSequence,attackerId:trap.source,targetId:moverId,units:[],enemyLoss:0,allyLoss:0,moraleChanges:[],formationChanges:[],eliminatedIds:[],effectLines:['덧 놓기']};fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);s=combatEffectDamage(s,trap.source,[{targetId:moverId,loss:30}],log);s.armies[moverId].movementState=null;if(s.armies[moverId].currentOrder)s.armies[moverId].currentOrder.status='COMPLETED';if(!s.movedArmyIds.includes(moverId))s.movedArmyIds.push(moverId);}
for(const maze of s.c29Mazes??[])if(maze.until>=s.turn&&diplomacyHostile(s,maze.factionId,mover.factionId)&&!withdrawalProtection(s,moverId)&&maze.tiles.includes(mover.tileId)){mover.c29??={};mover.c29.rootedUntil=s.turn+1;}
 for(const guard of Object.values(s.armies).sort((a,b)=>a.armyId.localeCompare(b.armyId))){
  if(!castleArmyActive(s,mover)||!castleArmyActive(s,guard)||!diplomacyArmyHostile(s,guard.armyId,mover.armyId)||!guard.braced||!hasCampaignRule(s,guard.armyId,'OVERWATCH')||guard.overwatchKey===`${s.turn}.${mover.factionId}`||ambushHidden(s,moverId,guard.factionId))continue;
  if(archerAttackReason(s,guard.armyId)||troopToCampaign(guard.troopType)==='BT03'&&hexDistance(s.tiles[guard.tileId],s.tiles[mover.tileId])<=1)continue;
  const range=attackRange(guard,s);if(hexDistance(s.tiles[guard.tileId],s.tiles[fromTileId])<=range||hexDistance(s.tiles[guard.tileId],s.tiles[mover.tileId])>range||s.knowledge[guard.factionId].tiles[mover.tileId]!=='VISIBLE')continue;
  s.armies[guard.armyId].overwatchKey=`${s.turn}.${mover.factionId}`;
  s=resolveAttack(s,guard.armyId,moverId,null,{reaction:true});s.lastCombat.effectLines.push(ruleLine(s,guard.armyId,'OVERWATCH','\uACBD\uACC4 \uC0AC\uACA9'));
 }
 rememberDiplomacyCombat(s,state);return s;
}

function resolveC27MovementEffects(state,id,from,stopped){
 let s=state;const a=s.armies[id];if(!a||!castleArmyActive(s,a))return s;
 for(const original of Object.values(s.armies).sort((a,b)=>a.armyId.localeCompare(b.armyId))){
  const guard=s.armies[original.armyId],mover=s.armies[id];if(!castleArmyActive(s,guard)||!castleArmyActive(s,mover)||guard.morale==='ROUTING'||mover.morale==='ROUTING'||!diplomacyArmyHostile(s,guard.armyId,mover.armyId)||ambushHidden(s,id,guard.factionId))continue;
  const blade=stopped&&combatRule(s,guard.armyId,'BLADESTORM')&&hexDistance(s.tiles[guard.tileId],s.tiles[mover.tileId])===1&&hexDistance(s.tiles[guard.tileId],s.tiles[from])>1&&guard.c27?.bladeTurn!==s.turn;
  const watch=guard.c27?.overwatch,front=at=>{const d=(directionToward(s.tiles[guard.tileId],s.tiles[at],guard.facing)-guard.facing+6)%6;return [0,1,5].includes(d)&&hexDistance(s.tiles[guard.tileId],s.tiles[at])<=watch.range;};
  const shot=watch&&!watch.used&&watch.until>=s.turn&&front(mover.tileId)&&!front(from)&&s.knowledge[guard.factionId].tiles[mover.tileId]==='VISIBLE'&&!archerAttackReason(s,guard.armyId);
  if((blade||shot)&&!archerAttackReason(s,guard.armyId)){
   guard.c27??={};if(blade)guard.c27.bladeTurn=s.turn;if(shot)watch.used=true;
   s=resolveAttack(s,guard.armyId,id,null,{reaction:true,first:false});s.lastCombat.effectLines.push(blade?combatRuleLine(s,guard.armyId,'BLADESTORM','통제 구역 정지 첫 적 즉시 공격 · 반격 없음'):'경계 사격 — 정면 진입 첫 적 · 반격 없음');combatCount(s,blade?'BLADESTORM':'OVERWATCH_SHOT');
  }
 }
 if(stopped&&castleArmyActive(s,s.armies[id]))for(const lure of Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&b.c27?.feigned?.until===s.turn&&hexDistance(s.tiles[b.tileId],s.tiles[a.tileId])===1)){
  const allies=Object.values(s.armies).filter(b=>b.factionId===lure.factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[b.tileId],s.tiles[a.tileId])===1);if(allies.length>=2){changeFormation(s,id,s.armies[id].formation==='ORDERED'?1:0);s.armies[id].c27??={};s.armies[id].c27.feignedFlankUntil=s.turn;delete lure.c27.feigned;combatCount(s,'FEIGNED_RETREAT_TRIGGER');}
 }
 if(from!==s.armies[id].tileId&&!uniqueOwned(s,id,'U_FIRE_GOD')&&((s.c27?.fires??[]).some(f=>f.until>=s.turn&&!withdrawalProtection(s,id)&&(!f.source||!diplomacyAttackReason(s,f.source,id))&&f.tiles.includes(s.armies[id].tileId))||(s.c32?.fires??[]).some(f=>f.until>=s.turn&&!withdrawalProtection(s,id)&&(!f.source||!diplomacyAttackReason(s,f.source,id))&&f.tileId===s.armies[id].tileId))){
  s=structuredClone(s);s.battleSequence++;const log={kind:'FIRE',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:id,enemyLoss:0,allyLoss:0,units:[],moraleChanges:[],formationChanges:[],eliminatedIds:[],effectLines:['불 지르기 — 불 칸 진입 피해 10%']};s.combatLog??=[];fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);s.lastCombat=log;s=combatEffectDamage(s,id,[{targetId:id,loss:Math.max(1,Math.round(s.armies[id].troopCount*.1*(c28Rule(s,id,'FIRE_WARD')?C28.fireReduce:1)))}],log);if(!c28Rule(s,id,'FIRE_WARD'))checkFormation(s,id,10,log.formationChanges);
 }
 return s;
}

function combatFormation(s,units,attackerId,targetId,p,formationChanges,moraleChanges,onlyUnits=false){
 const collapsed=[];
 const events=[...units,...(onlyUnits?[]:Object.values(s.armies)).filter(a=>(a.formationWeight||a.formationRecovery)&&!units.some(u=>u.unitId===a.armyId)).map(a=>({unitId:a.armyId,preBattleCount:a.troopCount,postBattleCount:a.troopCount,casualties:0}))];
 for(const u of events){
  const a=s.armies[u.unitId];if(!u.postBattleCount){delete a.formationWeight;delete a.formationRecovery;continue;}
  let weight=a.formationWeight??0;
  if(u.unitId===targetId){weight+=p.sideWeight??(p.side==='REAR'?C12.rearWeight:p.side==='FLANK'?C12.flankWeight:0);if(p.charge&&!c30ChargeGuard(s,u.unitId))weight+=C12.chargeWeight+c30ChargeWeight(s,attackerId);}
  if(u.casualties/u.preBattleCount>=C12.lossThreshold)weight+=C12.lossWeight;
  if(u.unitId===targetId&&p.ignoreBrace&&weight>0)weight+=C12.braceWeight;
  const start=formationChanges.length;
  if(u.unitId===targetId)weight+=classAttack(s,attackerId,targetId,{},p.side).formationWeight;
  if(weight>0&&!classHold(s,u.unitId,u.unitId===targetId?p.side:'FRONT')&&!(u.unitId===targetId&&p.charge&&c30ChargeGuard(s,u.unitId)))checkFormation(s,u.unitId,weight,formationChanges);
  if(formationChanges.slice(start).some(f=>f.to==='BROKEN'))collapsed.push(u.unitId);
  if(u.unitId===targetId&&p.charge&&!c30ChargeGuard(s,u.unitId)&&specialTroop(s,s.armies[attackerId].troopType)&&s.armies[attackerId].troopType==='hubao')checkFormation(s,u.unitId,C24.chargeWeight,formationChanges);
  if(formationChanges.slice(start).some(f=>f.to==='BROKEN')&&!collapsed.includes(u.unitId))collapsed.push(u.unitId);
  if(a.formationRecovery)changeFormation(s,u.unitId,-a.formationRecovery,formationChanges);
  delete a.formationWeight;delete a.formationRecovery;
 }
 for(const id of collapsed)checkMorale(s,id,'전열 붕괴',C12.collapseMorale,moraleChanges);
 for(const a of Object.values(s.armies).filter(a=>!onlyUnits||units.some(u=>u.unitId===a.armyId))){for(const e of a.combatMoraleEffects??[]){if(e.value<0)checkMorale(s,a.armyId,e.reason,Math.abs(e.value),moraleChanges);else if(e.value>0&&a.troopCount>0)changeMorale(s,a.armyId,a.morale==='ROUTING'?'SHAKEN':'STEADY',e.reason,moraleChanges);}delete a.combatMoraleEffects;}
}
function turnDefender(s,attackerId,targetId,side){
 const a=s.armies[attackerId],t=s.armies[targetId];if(side==='FRONT'||!t.troopCount||!a.troopCount)return false;
 if(campaignRoll(s)<campaignSubAbility(s,t.commanderId,'지휘','전환')){turnFacing(s,targetId,attackerId);return true;}return false;
}

function c29ControlSuccess(s,before,id,c,target){
 const a=s.armies[id],t=s.armies[target],old=before.armies[target];
 if(c.id==='CTA-01'||c.id==='CTA-02')return old?.tileId!==t?.tileId;
 if(c.id==='CTA-04')return t?.facing===directionToward(s.tiles[t.tileId],s.tiles[a.tileId])&&!s.lastCombat.effectLines?.some(l=>l.includes('??'));
 if(c.id==='CTA-10')return t?.c27?.rootTurn>=s.turn&&!s.lastCombat.effectLines?.some(l=>l.includes('??'));
 return false;
}
function finishC29Tactic(s,before,id,c,target){
 const r=c29Record(s,id);if(!r?.c29)return s;let a=s.armies[id],t=s.armies[target];const log=s.lastCombat;
 const near=(army,range,faction)=>Object.values(s.armies).filter(b=>b.troopCount>0&&(faction===null||b.factionId===faction)&&hexDistance(s.tiles[army.tileId],s.tiles[b.tileId])<=range).sort((b,d)=>b.armyId.localeCompare(d.armyId));
 if(c.modifier?.rule==='SPELLBLADE')r.c29.spellbladeTurn=s.turn;
 const rows=[];
 if(c.modifier?.rule==='DOUBLE_HIT'&&t)rows.push({targetId:target,loss:Math.round(log.enemyLoss*c.modifier.params.second/100)});
 if(c.modifier?.rule==='SPLASH_ADJ'&&t){const other=near(t,1,null).find(b=>b.armyId!==target&&diplomacyArmyHostile(s,id,b.armyId));if(other)rows.push({targetId:other.armyId,loss:Math.round(log.enemyLoss*c.modifier.params.ratio/100)});}
 // CAST_ON_ROUT is a finite damage follow-up, never dispatches resolveTactic.
 if(c.modifier?.rule==='CAST_ON_ROUT'&&t&&log.moraleChanges.some(e=>e.armyId===target&&e.to==='ROUTING')&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])<=c.modifier.params.range)rows.push({targetId:target,loss:Math.round(log.enemyLoss*.5)});
 if(c.id==='CTA-07'&&c.fork==='a'&&t){const first=combatArmyAt(s,oppositeCombatTile(s,id,target));if(first){const second=combatArmyAt(s,oppositeCombatTile(s,target,first.armyId));if(second&&diplomacyArmyHostile(s,id,second.armyId))rows.push({targetId:second.armyId,loss:Math.round(log.enemyLoss*.5)});}}
 if(rows.length){s.battleSequence++;s=combatEffectDamage(s,id,rows,log);a=s.armies[id];t=s.armies[target];}
 if(c.id==='CTA-05'&&c.fork==='b')for(const b of near(a,2,a.factionId))changeFormation(s,b.armyId,-1,log.formationChanges);
 if(c.id==='CTA-04'&&c.fork==='a'&&t){t.effectStates.push({op:'DAMAGE_MOD',value:-20,startsTurn:s.turn,expiresTurn:s.turn+1,c29NextAttack:true});}
 if(c.id==='CTA-04'&&c.fork==='b')for(const b of near(a,2,null).filter(b=>diplomacyArmyHostile(s,id,b.armyId)))if(!uniqueImmune(s,b.armyId,'TAUNT'))turnFacing(s,b.armyId,id);
 if(c.id==='CTA-01'&&c.fork==='b'&&t&&t.tileId!==before.armies[target].tileId&&combatEmptyStep(s,id,before.armies[target].tileId))a.tileId=before.armies[target].tileId;
 if(c.id==='CTA-09'&&c.fork==='a'&&t&&s.officers[a.commanderId].baseStats.leadership>s.officers[t.commanderId].baseStats.leadership&&t.formation==='ORDERED')changeFormation(s,target,1,log.formationChanges);
 if(c.id==='CTA-07'&&c.fork==='b'&&t){t.c27??={};t.c27.noCounterUntil=s.turn+1;}
 if(c.evolution){
  if(c.id==='EVO-01'){const from=s.tiles[target],direction=a.facing??0,tiles=[target];let at=from;for(let n=0;n<3;n++){const next=neighbors(at)[direction],key=tileId(next);if(!s.tiles[key])break;tiles.push(key);at=s.tiles[key];}for(const b of near(a,1,a.factionId))tiles.push(b.tileId);s.c27??={counts:{}};s.c27.fires??=[];s.c27.fires.push({... (diplomacyEnabled(s)?{source:id}:{}),tiles:[...new Set(tiles)],until:s.turn+1});s.battleSequence++;s=combatEffectDamage(s,id,[...new Set(tiles)].map(at=>combatArmyAt(s,at)).filter(Boolean).map(b=>({targetId:b.armyId,loss:Math.round(b.troopCount*.1)})),log);}
  if(c.id==='EVO-02'){const from=s.tiles[before.armies[id].tileId],to=s.tiles[t.tileId],length=hexDistance(from,to);for(const b of Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&b.troopCount>0&&hexDistance(from,s.tiles[b.tileId])+hexDistance(s.tiles[b.tileId],to)===length))checkFormation(s,b.armyId,15,log.formationChanges);s.battleSequence++;s=combatEffectDamage(s,id,[{targetId:id,loss:Math.round(a.troopCount*.1)}],log);}
  if(c.id==='EVO-03')for(const b of near(a,2,a.factionId)){b.c29??={};b.c29.noRoutTurn=s.turn;b.effectStates.push({op:'DAMAGE_MOD',value:15,startsTurn:s.turn,expiresTurn:s.turn});b.c27??={};b.c27.rootTurn=s.turn+1;}
  if(c.id==='EVO-04'){const tiles=Object.values(s.tiles).filter(tile=>tile.terrainType==='forest'&&hexDistance(s.tiles[a.tileId],tile)<=2).sort((x,y)=>x.tileId.localeCompare(y.tileId)).slice(0,3).map(tile=>tile.tileId);s.c29Mazes??=[];s.c29Mazes.push({tiles,factionId:a.factionId,until:s.turn+1});a.c27??={};a.c27.rootTurn=s.turn;}
 }
 updateKnowledge(s);return s;
}

const archerEngagedC33=(s,id)=>troopToCampaign(s.armies[id].troopType)==='BT03'&&Object.values(s.armies).some(b=>diplomacyArmyHostile(s,id,b.armyId)&&castleArmyActive(s,b)&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1);
function c33InventorSiege(s,fid){return 1+(Object.values(s.cities).some(c=>c.ownerFactionId===fid&&c33Governor(s,c,'INVENTOR'))?(s.factions[fid].research?.stage??0)*.05:0);}
function resolveC33Tactic(state,id,card,target){
 if(!card.effects.some(e=>e.op==='RULE')){if(tacticIsDamage(card))return resolveAttack(state,id,target,card);const s=structuredClone(state);initializeCampaignEffects(s);s.battleSequence++;const log={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],moraleChanges:[],eliminatedIds:[],effectLines:[card.name]};s.lastCombat=log;triggerEffects(s,id,'ON_TACTIC_USE',{targetId:target,formationChanges:log.formationChanges,moraleChanges:log.moraleChanges},card);consumeMainAction(s,id,{attack:true});fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);return s;}
 const s=structuredClone(state);initializeCampaignEffects(s);s.battleSequence++;const log={kind:'TACTIC_EFFECT',turn:s.turn,sequence:s.battleSequence,attackerId:id,targetId:target,tacticName:card.name,tacticId:card.traitId,units:[],enemyLoss:0,allyLoss:0,counter:false,side:'FRONT',charge:false,formationChanges:[],moraleChanges:[],eliminatedIds:[],effectLines:[card.name]};s.lastCombat=log;fatigueCombat(s,[log.attackerId,log.targetId],log);(s.combatLog??=[]).push(log);
 const damage=rows=>{s.battleSequence++;uniqueAdoptState(s,combatEffectDamage(s,id,rows.map(row=>({...row,loss:row.loss*(!row.c33DoubleApplied&&s.armies[id].c33?.doubleTurn===s.turn?2:1)})),log));};
 const attack=(who,ratio=1)=>{if(castleArmyActive(s,s.armies[who]))damage([{targetId:who,loss:Math.round(attackFormula(s,id,who,undefined,{tactic:card}).damage*ratio),c33DoubleApplied:true}]);};
 const cityAttack=ratio=>{const c=s.cities[target],loss=Math.min(c.durability,Math.round((cityAttackTargets(s,id).includes(target)?previewCityAttack(s,id,target).dealt:s.armies[id].troopCount*.1)*ratio));c.durability-=loss;log.cityId=target;log.dealt=loss;log.enemyLoss+=loss;};
 const victim=s.armies[target];if(victim&&[card.classTag].flat().includes('지략')&&c33Owned(s,target,'DIVINE_CALC')&&campaignRoll(s)<50)log.effectLines.push('계략 무효');else c33ApplyTactic({s,id,target,card,damage,attack,cityAttack,heal:(who,n)=>healCampaignTroops(s,who,n),log});
 if(s.armies[target]&&s.armies[target].factionId!==s.armies[id].factionId)c33AfterAttack(s,state,id,target,log,(who,n)=>healCampaignTroops(s,who,n));
 if(s.armies[id].c33?.doubleTurn===s.turn)delete s.armies[id].c33.doubleTurn;
 consumeMainAction(s,id,{attack:true});if(s.armies[id].c33?.scaleCost&&!c33FormationCard(card))delete s.armies[id].c33.scaleCost;updateKnowledge(s);refreshCampaignSieges(s);return s;
}
