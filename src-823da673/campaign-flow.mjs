// C506: opt-in campaign progression. No UI, wall clock or gameplay RNG.
import rules from '../data/campaign-flow-v1.json' with {type:'json'};
import china from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import {boardNeighbors,tileId} from './map-primitives.mjs';
import {isSliceMap} from './map-primitives.mjs';

export const FLOW=rules;
export const flowEnabled=s=>s?.trialRules?.flow==='v1';
export const flowPhase=s=>flowEnabled(s)?s.flow?.worldPhase??'P1':null;
export const flowPhaseAtLeast=(s,phase)=>flowEnabled(s)&&flowPhase(s)>=phase;
export const flowFeature=(s,feature)=>flowEnabled(s)?rules.features[feature]===true&&Object.keys(s.factions??{}).length>=2:isSliceMap(s.mapId);
export const flowCrisisCount=s=>Number(!!s.c22?.crisis)+Number(!!s.c31&&!s.c31.resolved)+Object.values(s.flow?.crises??{}).filter(c=>!c.resolved).length;
export const flowHegemon=(s,fid)=>{const t=flowTerritory(s,fid);return t.major>=rules.crisisRules.hegemonyMajor||t.provinces>=rules.crisisRules.hegemonyProvinces;};
export const flowCoalitionPeace=(s,a,b)=>flowEnabled(s)&&!!s.c22?.crisis&&s.turn<s.c22.crisis.endTurn&&s.c22.crisis.joined.includes(a)&&s.c22.crisis.joined.includes(b);
const geography=new Map(china.cities.map(c=>[c.at.join(','),c]));
export const flowCitySpec=(s,c)=>s.mapId==='china'?geography.get(c.tileId)??c:c;
export const flowMajor=(s,c)=>flowCitySpec(s,c).kind==='major';
export function flowTerritory(s,fid){
 const owned=Object.values(s.cities).filter(c=>c.ownerFactionId===fid&&!s.flow?.occupiedCities?.[c.cityId]);
 const provinces={};
 for(const c of Object.values(s.cities)){
  const p=flowCitySpec(s,c).province;if(!p)continue;
  provinces[p]??={total:0,owned:0};provinces[p].total++;if(owned.includes(c))provinces[p].owned++;
 }
 return {cities:owned.length,major:owned.filter(c=>flowMajor(s,c)).length,provinces:Object.values(provinces).filter(p=>p.owned>p.total/2).length};
}
export function initializeFlow(s){
 if(!flowEnabled(s)||s.flow)return s;
 s.flow={version:1,worldPhase:'P1',factions:Object.fromEntries(Object.keys(s.factions).sort().map(fid=>[fid,{phase:'P1',entered:{P1:s.turn},clearedNests:0,milestones:{},firstBorder:false,firstCapture:false}])),history:[],owners:Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,c.ownerFactionId]))};
 return s;
}
// Policy implementations report confirmed milestones through this adapter.
// Null/absent design milestones never unlock a phase by themselves.
export function recordFlowMilestone(s,fid,key,amount=1){
 if(!flowEnabled(s))return;
 const f=s.flow?.factions[fid];if(!f||!Number.isFinite(amount)||amount<0)throw Error('INVALID_FLOW_MILESTONE');
 f.milestones[key]=(f.milestones[key]??0)+amount;
}
function borders(s,fid){
 const claims=new Map();
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId&&s.factions[c.ownerFactionId])){
  for(const id of [c.tileId,...(c.workedTiles??[]),...(c.influenceTiles??[])]){claims.set(id,c.ownerFactionId);}
 }
 for(const [id,owner] of claims)if(owner===fid&&s.tiles[id])for(const n of boardNeighbors(s.tiles[id],s.tiles)){
  const other=claims.get(tileId(n));if(other&&other!==fid)return true;
 }
 return false;
}
export function settleFlowPhases(s){
 if(!flowEnabled(s))return s;initializeFlow(s);
 const x=s.flow;
 for(const c of Object.values(s.cities)){
  const prev=x.owners[c.cityId],f=x.factions[c.ownerFactionId];
  if(f&&prev!==c.ownerFactionId){if(prev&&s.factions[prev])f.firstCapture=true;else recordFlowMilestone(s,c.ownerFactionId,'neutralAnnexed');}
  x.owners[c.cityId]=c.ownerFactionId;
 }
 for(const [fid,f] of Object.entries(x.factions)){
  if(!s.factions[fid]?.alive)continue;
  f.firstBorder ||= borders(s,fid);
  const t=flowTerritory(s,fid);
  for(const p of rules.phases.list.slice(1)){
   if(f.phase>=p.id)continue;
   const cfg=rules.phaseThresholds[p.id],m=rules.phaseMilestones[fid]?.[p.id]??[];
   const milestone=m.some(r=>(f.milestones[r.key]??0)>=r.amount);
   const common=t.cities>=(cfg.cities??Infinity)||t.major>=(cfg.major??Infinity)||t.provinces>=(cfg.provinces??Infinity)||f.clearedNests>=(cfg.clearedNests??Infinity)||cfg.firstBorder&&f.firstBorder||cfg.firstCapture&&f.firstCapture;
   if(s.turn>=p.floorTurn||common||milestone){
    // A later milestone unlocks intermediate policy slots in order as well.
    for(const q of rules.phases.list.filter(q=>q.id>f.phase&&q.id<=p.id)){
     f.phase=q.id;f.entered[q.id]=s.turn;x.history.push({type:'PHASE',turn:s.turn,factionId:fid,phase:q.id,reason:s.turn>=p.floorTurn?'TURN_FLOOR':milestone?'FACTION_MILESTONE':'COMMON'});
    }
   }
  }
 }
 x.worldPhase=Object.values(x.factions).reduce((p,f)=>f.phase>p?f.phase:p,'P1');return s;
}
export function flowView(s,fid){
 if(!flowEnabled(s))return null;
 const own=s.flow.factions[fid];
 return {version:1,worldPhase:s.flow.worldPhase,phase:own.phase,policyPhases:rules.phases.list.filter(p=>p.id<=own.phase).map(p=>p.id),entered:structuredClone(own.entered),history:s.flow.history.filter(e=>!e.factionId||e.factionId===fid).map(e=>structuredClone(e))};
}
export function validateFlow(s){
 if(s.trialRules?.flow!==undefined&&s.trialRules.flow!=='v1')throw Error('INVALID_CAMPAIGN_FLOW');
 if(!flowEnabled(s)){if(s.flow!==undefined)throw Error('UNEXPECTED_CAMPAIGN_FLOW');return;}
 const x=s.flow,phases=rules.phases.list.map(p=>p.id);
 if(x?.version!==1||!phases.includes(x.worldPhase)||!Array.isArray(x.history)||!x.owners)throw Error('INVALID_CAMPAIGN_FLOW');
 for(const fid of Object.keys(s.factions)){
  const f=x.factions?.[fid];if(!phases.includes(f?.phase)||!f.entered||!f.milestones||!Number.isSafeInteger(f.clearedNests)||f.clearedNests<0)throw Error('INVALID_CAMPAIGN_FLOW_FACTION');
 }
}
