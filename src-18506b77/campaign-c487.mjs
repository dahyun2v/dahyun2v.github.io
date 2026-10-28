import {registerCampaignMech} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden} from './campaign-effects.mjs';
import {engineDamageRows} from './campaign-combat.mjs';

export const C487_IDS=Object.freeze(['G43']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a)=>enabled(s)&&a?.commanderId==='G43'&&a.troopCount>0&&castleArmyActive(s,a);
const distance=(s,a,b)=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId]);
const book=a=>(a.mechV2??={}).fazheng??={grudges:{}};
const protectedBy=(s,a)=>a?.mechV2?.fazhengGuard?.factionId===a?.factionId&&s.activeFactionId!==a.factionId;
const recognized=(s,c)=>enabled(s)&&['P417_G43_E','P417_G43_R'].includes(c.rule);

export function c487Targets(s,id,c){
 if(!recognized(s,c))return null;
 if(c.slot==='R')return [id];
 const a=s.armies[id];return live(s).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&distance(s,a,b)<=3&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)).map(b=>b.armyId).sort();
}
export function c487Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id];
 if(c.slot==='E')book(a).ledger={target,count:s.armies[target].troopCount,turn:s.turn};
 else for(const b of live(s).filter(b=>b.factionId===a.factionId&&distance(s,a,b)<=2)){
  (b.mechV2??={}).fazhengGuard={source:id,factionId:a.factionId,turn:s.turn};
 }
 return s;
}
export function c487Start(s,fid){
 if(!enabled(s))return;
 for(const a of live(s).filter(a=>owns(s,a)&&a.factionId===fid)){
  const pending=a.mechV2?.fazheng?.ledger;if(!pending||pending.turn>=s.turn)continue;
  delete book(a).ledger;const target=s.armies[pending.target];
  if(!target||target.troopCount<=0||!castleArmyActive(s,target))continue;
  const loss=Math.floor(Math.max(0,pending.count-target.troopCount)*.3);
  if(loss>0)Object.assign(s,engineDamageRows(s,a.armyId,[{targetId:target.armyId,loss}],'P487_LEDGER',true));
 }
}
export function c487Finish(s,fid){
 if(!enabled(s))return;
 for(const a of Object.values(s.armies)){
  const guard=a.mechV2?.fazhengGuard;
  if(guard&&guard.factionId!==fid)delete a.mechV2.fazhengGuard;
 }
}

// Install once when a full G43 package is installed, so unrelated campaigns
// retain C480's empty-registry fast path. Registrations are never serialized.
let registered=false;
export function c487Install(){
 if(registered)return;registered=true;
 // Fixed addition precedes damage reduction. Query callbacks never spend marks.
 registerCampaignMech('H01','c487-fazheng',{
 query:({state:s,operation,sourceId,targetId,kind},loss)=>{
  if(operation!=='loss'||!enabled(s)||loss<=0)return;
  const a=s.armies[sourceId],b=s.armies[targetId];if(!a||!b)return;
  let value=loss;
  if(kind!=='P487_LEDGER'&&diplomacyArmyHostile(s,sourceId,targetId))for(const g of live(s).filter(g=>owns(s,g)&&g.factionId===a.factionId))value+=Math.floor((g.mechV2?.fazheng?.grudges?.[targetId]?.loss??0)*.2);
  if(protectedBy(s,b))value*=.7;
  return Math.round(value);
 },
 commit:({state:s,operation,sourceId,targetId,kind,eventId,snapshot})=>{
  if(operation!=='lossSettled'||!enabled(s)||!sourceId||!snapshot||kind==='P487_LEDGER')return;
  const generals=live(s).filter(a=>owns(s,a));if(!generals.length)return;
  const next=cloneCampaign(s);
  for(const original of generals){
   const g=next.armies[original.armyId],z=book(g);
   if(z.lastEvent===eventId||Number.isSafeInteger(snapshot.sourceRevision)&&snapshot.sourceRevision<=(z.lastRevision??-1))continue;
   z.lastEvent=eventId;if(Number.isSafeInteger(snapshot.sourceRevision))z.lastRevision=snapshot.sourceRevision;
   // Counter loss belongs to the other actual participant, never the attacker.
   const sources=s.lastCombat?.sequence===s.battleSequence?s.lastCombat.damageSources??[]:[];
   const hits=snapshot.units.filter(u=>u.casualties>0).map(u=>({victim:next.armies[u.unitId],dealer:next.armies[sources.find(r=>r.targetId===u.unitId)?.armyId??(u.unitId===sourceId?targetId:sourceId)],loss:u.casualties})).filter(h=>h.victim&&h.dealer&&diplomacyArmyHostile(next,h.dealer.armyId,h.victim.armyId));
   for(const h of hits)if(h.dealer.factionId===g.factionId)delete z.grudges[h.victim.armyId];
   for(const h of hits)if(h.victim.factionId===g.factionId){
    const guarded=h.victim.mechV2?.fazhengGuard?.source===g.armyId&&protectedBy(next,h.victim);
    if(guarded||distance(next,g,h.victim)<=2){if(!guarded)z.grudges={};z.grudges[h.dealer.armyId]={loss:h.loss,eventId};}
   }
  }
  return next;
 },
 });
}
