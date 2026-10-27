import RECLASS from '../data/c319-trait-reclass-v0.1.json' with {type:'json'};
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {effectModifiers,effectCondition} from './campaign-effects.mjs';
import {attackDirection} from './campaign-abilities.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
export const C319_CARDS=RECLASS.cards;
export const C319_NUMERIC_OPS=[...new Set(Object.values(C319_CARDS).flatMap(c=>c.effects.map(e=>e.op)))].filter(op=>op!=='FORMATION_DELTA');
export function reclassCard(card){const x=RECLASS.cards[card.id];return x?{...card,effects:structuredClone(x.effects),...('cost' in card?{cost:x.proposal.split(' / ')[2].split(';')[0]}:{}),text:x.proposal.split(';')[0].replaceAll(' / ',' · '),reclassVersion:319}:card;}
export function migrateReclass(r,s){
 if(r.traitReclassVersion===319)return;
 for(const [key,card] of Object.entries(r.cards))if(/\.(common|career|c33)\./.test(key)&&C319_CARDS[card.id])r.cards[key]=reclassCard(card);
 if(s){
  const owned=new Set(Object.keys(r.track.growthStates[r.pack.id].ownedTraitRanks).map(k=>r.cards[k]?.id));
  for(const node of [...Object.values(s.armies),...Object.values(s.cities),...Object.values(s.officers)])if(node.effectStates)node.effectStates=node.effectStates.filter(e=>!Object.keys(r.cards).some(k=>e.traitId===k&&RECLASS.cards[r.cards[k]?.id]));
  for(const a of Object.values(s.armies).filter(a=>a.commanderId===r.pack.id)){
   if(owned.has('CT-V09')&&a.c33){
    const last=s.lastCombat,tactic=r.cards[last?.tacticId],tacticGrant=last?.attackerId===a.armyId&&tactic?.effects?.some(e=>e.rule==='GALEFORCE');
    if(a.c27?.extraTurn===a.c33.chainTurn&&!tacticGrant)delete a.c27.extraTurn;
    for(const k of ['chainTurn','chainCostTurn'])delete a.c33[k];
   }
   if(owned.has('CT-M04')&&a.c27)delete a.c27.cantoTurn;
   if(owned.has('TC-C01c')&&a.c27)delete a.c27.cantoTurn;
   if(owned.has('CT-V24')&&a.c33)delete a.c33.moraleFixedUntil;
  }
  for(const c of Object.values(s.cities).filter(c=>c.governorId===r.pack.id)){
   if(owned.has('CD-08')&&c.c33)for(const k of ['taxUntil','advanceProduction'])delete c.c33[k];
   if(owned.has('TC-V04d')&&c.c26){if(c.c26.privilege){c.c319??={};c.c319.privileged=true;}delete c.c26.privilege;}
  }
 }
 r.traitReclassVersion=319;
}
const dist=(s,a,b)=>a&&b&&s.tiles[a]&&s.tiles[b]?hexDistance(s.tiles[a],s.tiles[b]):Infinity;
export function reclassCondition(s,id,condition,ctx={}){
 const a=s.armies[id],c=s.cities[ctx.cityId]??s.cities[id],t=s.armies[ctx.targetId],targetCity=s.cities[ctx.targetId];
 const near=(ally=true)=>Object.values(s.armies).filter(b=>b.armyId!==id&&b.troopCount>0&&(ally?b.factionId===a?.factionId:b.factionId!==a?.factionId)&&dist(s,a?.tileId,b.tileId)===1);
 const side=()=>ctx.when==='ON_DEFEND'||ctx.eventWhen==='ON_DEFEND'||ctx.when==='ON_COUNTER'?attackDirection(s,ctx.targetId,id):attackDirection(s,id,ctx.targetId);
 const ratio=b=>b?b.troopCount/(s.personnel?.formations.find(f=>f.formationId===b.armyId)?.targetStrength??b.troopCount):1;
 const ownCity=()=>Object.values(s.cities).filter(x=>x.ownerFactionId===a?.factionId).sort((x,y)=>dist(s,a?.tileId,x.tileId)-dist(s,a?.tileId,y.tileId))[0];
 const rival=()=>Object.values(s.armies).find(b=>b.factionId!==a?.factionId&&(s.campaignGrowth?.officers[a?.commanderId]?.titles??[]).some(t=>t.opponentId===b.commanderId)&&s.knowledge[a?.factionId]?.tiles[b.tileId]==='VISIBLE');
 const behind=()=>{if(!a||!t)return false;const at=s.tiles[a.tileId],tt=s.tiles[t.tileId],adj=neighbors(tt).find(n=>tileId(n)===a.tileId);return !!adj&&Object.values(s.armies).some(b=>b.armyId!==id&&b.factionId===a.factionId&&b.troopCount>0&&b.tileId===`${2*tt.q-at.q},${2*tt.r-at.r}`);};
 switch(condition){
 case 'ALLY_NEAR':return near().length>0;
 case 'NO_ALLY':return near().length===0;
 case 'TWO_ENEMIES':return near(false).length>=2;
 case 'UNMOVED':return !!a&&!(a.movedTiles??0);
 case 'ROUGH':return ['forest','hill'].includes(s.tiles[a?.tileId]?.terrainType);
 case 'ROUGH_START':return ['forest','hill'].includes(s.tiles[a?.c319?.startTile??a?.tileId]?.terrainType);
 case 'START_PLAIN':return s.tiles[a?.c319?.startTile??a?.tileId]?.terrainType==='plain';
 case 'TOWARD_CITY':return !!a&&!!ownCity()&&(ctx.towardCity||ctx.destination?ctx.towardCity||dist(s,ctx.destination,ownCity().tileId)<dist(s,a.tileId,ownCity().tileId):a.c319?.towardCityTurn===s.turn);
 case 'FRONT':return !!t&&side()==='FRONT';
 case 'ACTUAL_FLANK':return !!t&&side()==='FLANK';
 case 'TARGET_ARMY':return !!t;
 case 'MELEE':return !!a&&!!t&&dist(s,a.tileId,t.tileId)===1;
 case 'ATTACKER_MELEE':return !!t&&!['BT03','BT05'].includes(troopToCampaign(t.troopType))&&t.troopType!=='catapult'&&dist(s,a?.tileId,t.tileId)===1;
 case 'NOT_ENGAGED':return !!a&&near(false).length===0;
 case 'VISIBLE_FOREST':return !!t&&s.knowledge[a?.factionId]?.tiles[t.tileId]==='VISIBLE'&&s.tiles[t.tileId]?.terrainType==='forest';
 case 'TARGET_PLAIN':return !!t&&s.tiles[t.tileId]?.terrainType==='plain';
 case 'TARGET_HIGHER_MIGHT':return !!t&&(s.officers[t.commanderId]?.baseStats.strength??0)>(s.officers[a?.commanderId]?.baseStats.strength??0);
 case 'WALL_BELOW_50':return (targetCity??c)?.durability<=50;
 case 'WALL_BELOW_25':return (targetCity??c)?.durability<=25;
 case 'CITY_CENTER':return !!a&&Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&c.tileId===a.tileId);
 case 'FROM_GARRISON':return a?.c319?.fromGarrisonTurn===s.turn;
 case 'NORMAL_ATTACK':return !ctx.tactic&&!ctx.counter;
 case 'ATTACKING_CITY':return !!targetCity||ctx.cityShot===true;
 case 'AFTER_RETREAT':return a?.disengageTurn===s.turn||a?.c319?.retreatUntil>=s.turn;
 case 'ROUTING':return a?.morale==='ROUTING';
 case 'FIRST_MORALE':return a?.c319?.moraleTurn!==s.turn;
 case 'NOT_FIRST':return !!a&&a.effectFirstAttackTurn===s.turn;
 case 'HIDDEN_START':return !!a&&(a.c319?.hiddenFrom??a.c27?.hiddenFrom??[]).includes(t?.factionId);
 case 'ALLY_BEHIND_TARGET':return behind();
 case 'NO_ALLY_BEHIND':return !behind();
 case 'RIVAL_VISIBLE':return !!rival();
 case 'REVENGE_PENDING':return (a?.c319?.revengeBattles??0)>0;
 case 'REVENGE_TARGET':return t?.commanderId===a?.c319?.revengeId;
 case 'THREE_SIEGERS':return !!targetCity&&new Set(Object.values(s.armies).filter(b=>b.factionId===a?.factionId&&b.troopCount>0&&dist(s,b.tileId,targetCity.tileId)===1).map(b=>b.tileId)).size>=3;
 case 'SCHEME':return [ctx.tactic?.classTag].flat().includes('지략');
 case 'LOWER_INT_ATTACKER':return !!t&&(s.officers[t.commanderId]?.baseStats.intelligence??0)<(s.officers[a?.commanderId]?.baseStats.intelligence??0);
 case 'TARGET_LOW_15':return !!t&&ratio(t)<.15;
 case 'TARGET_NOT_LOW_15':return !!t&&ratio(t)>=.15;
 case 'OUTNUMBERING':return !!a&&!!t&&a.troopCount>t.troopCount;
 case 'FULL_STORAGE':return !!c&&c.foodStock>=(c.foodCapacity??160);
 case 'PEACEFUL':return !!c&&!c.besieged;
 case 'BUILDING':return !!c?.currentProduction&&!['muster','recruit','repair','reorganize'].includes(c.currentProduction.kind);
 case 'COMPLETING_JOB':return !!ctx.completingJob||c?.c319?.completedTurn===s.turn;
 case 'CONCILIATE':return ctx.method==='conciliation'||ctx.method==='appease'|| ctx.method==='CONCILIATE'||ctx.method==='APPEASE'||ctx.method==='COOPT';
 case 'PRIVILEGED':return !!c?.c319?.privileged;
 case 'UNREST':return (c?.securityLevel??0)>0;
 case 'EVENT':return ['EVENT','TACTIC','CRISIS'].includes(ctx.cause);
 case 'SETTLE':return ctx.cause==='SETTLE';
 case 'NATURAL':return !['EVENT','TACTIC','CRISIS','COMMAND'].includes(ctx.cause);
 case 'CITY_WOUNDED':return !!c&&s.personnel.lots.some(l=>l.nodeId===c.cityId&&l.kind==='WOUNDED'&&l.count>0);
 case 'NEAR_CAPTURE':return ctx.nearCapture|| (c?.c319?.nearCaptureUntil??0)>=s.turn;
 case 'BANDIT':return ctx.eventKind==='BANDIT';
 case 'DISASTER':return ctx.eventKind==='DISASTER';
 case 'TRIBAL':return ctx.eventKind==='TRIBAL';
 default:return null;
 }
}
// All adjustments pass through C310's numeric maximum, including city sources.
export function reclassCityMods(s,c,ctx={}){
 const id=c?.governorId??c?.c26?.occupationGovernorId,o=s.officers[id];
 const r=s.campaignGrowth?.officers[id];if(!r||(r.equippedTraitIds??[]).every(k=>!r.cards[k]?.domestic||r.cards[k]?.reclassVersion!==319))return {};
 if(!id||o?.lifeState!=='ALIVE'||o.captivityState!=='FREE'||o.allegianceFactionId!==c.ownerFactionId||o.locationRef?.id!==c.cityId||s.mapId==='v1'||s.c46Disabled!==true&&o.injury)return {};
 return effectModifiers(s,c.cityId,['TURN_SETTLE'],{...ctx,cityId:c.cityId,sources:[{id,whens:['TURN_SETTLE']}]});
}
export const reclassScale=(value,modifier=0)=>Math.max(0,value*(1+modifier/100));
export function reclassHas(s,id,key){const r=s.campaignGrowth?.officers[s.armies[id]?.commanderId??id];return !!r?.equippedTraitIds?.some(k=>r.cards[k]?.id===key);}
export function reclassStart(s,fid){for(const a of Object.values(s.armies))if(a.factionId===fid&&['CT-M01','CT-M10','CT-M13','CT-M26','TC-C02d'].some(k=>reclassHas(s,a.armyId,k))){a.c319??={};a.c319.startTile=a.tileId;if(Object.values(s.cities).some(c=>c.ownerFactionId===fid&&c.tileId===a.tileId))a.c319.fromGarrisonTurn=s.turn;a.c319.hiddenFrom=Object.keys(s.factions).filter(f=>f!==fid&&s.knowledge[f]?.tiles[a.tileId]!=='VISIBLE');}}
export function reclassAfterAttack(s,before,id,target,log){
 const a=s.armies[id],old=before.armies[target],b=s.armies[target];if(!a||!old)return;
 if(b?.morale==='ROUTING'&&old.morale!=='ROUTING'||!b?.troopCount&&old.troopCount>0){
  // Existing ON_KILL hook also covers first rout; never grants another action.
  if(b?.troopCount>0&&['CT-V09','TC-C01d'].some(k=>reclassHas(s,id,k)))log.c319Rout=true;
 }
 if(a.c319?.revengeBattles>0)a.c319.revengeBattles--;
 if(b?.morale==='ROUTING'&&old.morale!=='ROUTING'&&reclassHas(s,target,'TC-C04e')){b.c319??={};b.c319.revengeId=a.commanderId;b.c319.revengeBattles=3;}
}

// Security remains a discrete stage. Carry the fractional loss instead of
// rounding every 0.7-stage loss back to 1 or making each event immune.
export function reclassSecurityDelta(s,c,delta,cause){
 if(delta<=0)return delta;
 const mod=reclassCityMods(s,c,{cause}).SECURITY_LOSS_MOD??0;if(!mod)return delta;
 c.c319??={};const total=(c.c319.securityLossCarry??0)+reclassScale(delta,mod),whole=Math.floor(total+1e-9);c.c319.securityLossCarry=total-whole;return whole;
}
// Fast presence check before asking the full evaluator for a rare modifier.
// It is conservative: conditions and actual aura range still belong to the evaluator.
export function reclassHasOp(s,id,op,auras=false){
 const has=source=>{const r=s.campaignGrowth?.officers[s.armies[source]?.commanderId??source];return !!r&&[r.coreId,...(r.equippedTraitIds??[])].some(k=>r.cards[k]?.effects?.some(e=>e.op===op));};
 if(has(id)||(s.armies[id]?.effectStates??[]).some(e=>e.op===op&&e.startsTurn<=s.turn&&e.expiresTurn>=s.turn))return true;
 return auras&&Object.values(s.armies).some(a=>a.armyId!==id&&a.factionId===s.armies[id]?.factionId&&has(a.armyId));
}
