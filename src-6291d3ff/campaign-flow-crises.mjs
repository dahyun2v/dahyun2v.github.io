import {FLOW,flowEnabled,flowPhaseAtLeast,flowCrisisCount,flowCitySpec} from './campaign-flow.mjs';
import {liveFlowSites,liveBandUnits,spawnYellowNest,addBandUnit,bandPacified} from './campaign-flow-neutral.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';

const cfg=FLOW.crisisRules;
const distance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
function start(s,id,details){
 const c={id,startTurn:s.turn,resolved:false,...details};s.flow.crises[id]=c;
 s.flow.history.push({type:'CRISIS_START',crisis:id,turn:s.turn,actor:details.actor});return c;
}
function finish(s,c,reason){
 if(c.resolved)return;c.resolved=reason;c.endTurn=s.turn;
 if(c.id==='INVASION'){
  const n=s.flow.sites[c.siteId];if(n)delete n.invasion;
  for(const a of Object.values(s.flow.units).filter(a=>a.siteId===c.siteId)){
   if(c.originalUnits[a.armyId]!==undefined)a.troopCount=Math.min(a.troopCount,c.originalUnits[a.armyId]);
   else a.troopCount=0;
  }
 }
 if(c.id==='YT_UPRISING')for(const n of Object.values(s.flow.sites).filter(n=>n.band==='yellowTurban'))delete n.maxUnits;
 s.flow.history.push({type:'CRISIS_END',crisis:c.id,turn:s.turn,reason});
}
export function settleFlowCrises(s){
 if(!flowEnabled(s))return s;s.flow.crises??={};
 for(const c of Object.values(s.flow.crises).filter(c=>!c.resolved)){
  if(c.id==='YT_UPRISING'&&!liveFlowSites(s).some(n=>n.band==='yellowTurban'))finish(s,c,'CLEARED');
  if(c.id==='INVASION'){
   const n=s.flow.sites[c.siteId];if(!n||n.cleared)finish(s,c,'CLEARED');else if(bandPacified(s,n))finish(s,c,'TRIBUTE');
  }
 }
 if(s.gameResult)return s;
 if(flowCrisisCount(s)<cfg.maxActive&&!s.flow.crises.YT_UPRISING&&flowPhaseAtLeast(s,'P4')){
  const cities=Object.values(s.cities),unstable=cities.filter(c=>(c.securityLevel??0)>=2);
  if(unstable.length>=cfg.unstableCities||Object.keys(s.flow.occupiedCities).length){
   // Reserve all three provinces before publishing the uprising. At the nest
   // cap, an incomplete attempt must not leave untracked six-unit buffs behind.
   const planned={...s,flow:structuredClone(s.flow)};
   const byProvince=new Map();for(const c of [...unstable,...cities].sort((a,b)=>a.cityId.localeCompare(b.cityId))){const p=flowCitySpec(s,c).province??c.cityId;if(!byProvince.has(p))byProvince.set(p,c);}
   const born=[];for(const c of byProvince.values()){
    if(born.length>=cfg.uprisingProvinces)break;
    let n=spawnYellowNest(planned,c.tileId);
    if(!n)n=liveFlowSites(planned).find(n=>n.band==='yellowTurban'&&!born.includes(n.id)&&flowCitySpec(s,cities.reduce((best,x)=>distance(s,x.tileId,n.tileId)<distance(s,best.tileId,n.tileId)?x:best,cities[0])).province===flowCitySpec(s,c).province);
    if(n){n.maxUnits=cfg.uprisingUnits;while(liveBandUnits(planned).filter(a=>a.siteId===n.id).length<cfg.uprisingUnits)addBandUnit(planned,n);born.push(n.id);}
   }
   if(born.length===cfg.uprisingProvinces){s.flow=planned.flow;start(s,'YT_UPRISING',{actor:'황건 대두목',siteIds:born});}
  }
 }
 if(flowCrisisCount(s)<cfg.maxActive&&!s.flow.crises.INVASION&&flowPhaseAtLeast(s,'P3')){
  const candidates=liveFlowSites(s).filter(n=>n.kind==='NEST'&&n.band!=='yellowTurban'&&n.band!=='goody'&&!bandPacified(s,n)).sort((a,b)=>Number(b.band==='xianbei')-Number(a.band==='xianbei')||a.id.localeCompare(b.id));
  for(const n of candidates){
   const units=liveBandUnits(s).filter(a=>a.siteId===n.id&&!a.hiredBy);if(!units.length)continue;
   const city=Object.values(s.cities).filter(c=>c.ownerFactionId&&distance(s,c.tileId,n.tileId)<=FLOW.neutral.raidRange*2).sort((a,b)=>distance(s,a.tileId,n.tileId)-distance(s,b.tileId,n.tileId)||a.cityId.localeCompare(b.cityId))[0];
   if(!city)continue;
   const guards=Object.values(s.armies).filter(a=>a.factionId===city.ownerFactionId&&castleArmyActive(s,a)&&a.troopCount>0&&distance(s,a.tileId,city.tileId)<=1).length;
   if(guards>=units.length)continue;
   const originalUnits=Object.fromEntries(units.map(a=>[a.armyId,a.troopCount]));
   for(let i=units.length;i<units.length*cfg.invasionMultiplier;i++)addBandUnit(s,n);
   n.invasion=true;start(s,'INVASION',{actor:FLOW.bands[n.band].name,siteId:n.id,boundaryCityId:city.cityId,originalUnits});break;
  }
 }
 return s;
}
export function flowCrisesView(s){
 if(!flowEnabled(s))return {};
 const crises=Object.values(s.flow.crises??{}).map(c=>({id:c.id,actor:c.actor,startTurn:c.startTurn,resolved:c.resolved,endTurn:c.endTurn??null}));
 if(s.c22?.crisis)crises.push({id:'HEGEMONY',factionId:s.c22.crisis.factionId,startTurn:s.c22.crisis.startTurn,endTurn:s.c22.crisis.endTurn,joined:[...s.c22.crisis.joined],resolved:false});
 if(s.c31)crises.push({id:'PERSON',actorId:s.c31.actorId,type:s.c31.type,startTurn:s.c31.startTurn,turnsLeft:s.c31.turnsLeft,resolved:s.c31.resolved});
 return {crises};
}
export function validateFlowCrises(s){
 if(!flowEnabled(s))return;
 if(flowCrisisCount(s)>cfg.maxActive)throw Error('FLOW_CRISIS_LIMIT');
 for(const c of Object.values(s.flow.crises??{}))if(!['YT_UPRISING','INVASION'].includes(c.id)||!Number.isSafeInteger(c.startTurn)||c.startTurn<1||c.startTurn>s.turn||![false,'CLEARED','TRIBUTE'].includes(c.resolved))throw Error('INVALID_FLOW_CRISIS');
}
