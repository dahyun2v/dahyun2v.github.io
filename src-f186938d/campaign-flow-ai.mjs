import graph from '../../docs/design-data/map-layout-china-v1-graph.json' with {type:'json'};
import {FLOW,flowEnabled,flowCitySpec} from './campaign-flow.mjs';
import {liveFlowSites,neutralView,flowAttackTargets,attackNeutral,bandPacified} from './campaign-flow-neutral.mjs';
import {goodyClaimTargets,claimGoodyHut} from './campaign-flow-huts.mjs';
import {hexDistance,boardNeighbors,tileId} from './map-primitives.mjs';
import {diplomacyHostile,withdrawalProtection} from './campaign-diplomacy.mjs';
import {canMainAction,consumeMainAction} from './campaign-effects.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {campaignPath} from './campaign-morale.mjs';

// City graph shortest travel costs are built once. Per-turn scoring visits
// public targets and graph nodes only, never the 4,457-cell terrain array.
const graphDistances={};
for(const type of ['turnsInfantry','turnsCavalry']){
 const d=Object.fromEntries(graph.nodes.map(a=>[a.id,Object.fromEntries(graph.nodes.map(b=>[b.id,a.id===b.id?0:Infinity]))]));
 for(const e of graph.edges)d[e.a][e.b]=d[e.b][e.a]=Math.min(d[e.a][e.b],e[type]);
 for(const k of graph.nodes)for(const a of graph.nodes)for(const b of graph.nodes)d[a.id][b.id]=Math.min(d[a.id][b.id],d[a.id][k.id]+d[k.id][b.id]);
 graphDistances[type]=d;
}
const point=at=>({q:at[0],r:at[1]});
const distance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
export function flowTravelTurns(s,a,targetTile){
 const speed=a.troopType==='cavalry'?8:5,direct=distance(s,a.tileId,targetTile)/speed;
 if(s.mapId!=='china'||direct<=1)return direct;
 const nearest=tile=>graph.nodes.reduce((best,n)=>hexDistance(s.tiles[tile],point(n.at))<hexDistance(s.tiles[tile],point(best.at))?n:best,graph.nodes[0]);
 const from=nearest(a.tileId),to=nearest(targetTile),cost=graphDistances[a.troopType==='cavalry'?'turnsCavalry':'turnsInfantry'][from.id][to.id];
 return cost+(hexDistance(s.tiles[a.tileId],point(from.at))+hexDistance(s.tiles[targetTile],point(to.at)))/speed;
}
export function rememberFlowSites(s){
 if(!flowEnabled(s))return;
 s.flow.knownSites??={};
 for(const fid of Object.keys(s.factions)){
  const known=s.flow.knownSites[fid]??={},capital=s.cities[s.factions[fid].startCapitalCityId];
  for(const n of Object.values(s.flow.sites)){
   const visible=s.knowledge[fid]?.tiles[n.tileId]==='VISIBLE',rumor=s.turn===1&&capital&&distance(s,capital.tileId,n.tileId)<=FLOW.goodyGen.nearA[1];
   if(!visible&&!rumor)continue;
   known[n.id]={id:n.id,name:n.name,kind:n.kind,band:n.band,tileId:n.tileId,...(n.kind==='HUT'?{goodyKind:n.goodyKind,tier:n.tier}:{}),cleared:visible?n.cleared:false};
  }
 }
}
export function flowAiTargets(s,id){
 const a=s.armies[id];if(!flowEnabled(s)||!a)return [];
 const fid=a.factionId,cfg=FLOW.ai,known=s.flow.knownSites?.[fid]??{},targets=[],publicUnits=neutralView(s,fid).units;
 for(const n of Object.values(known).filter(n=>!n.cleared)){
  const protection=(s.flow.history??[]).some(e=>e.type==='PLUNDER'&&e.factionId===fid&&e.siteId===n.id&&e.turn>=s.turn-1)?cfg.protection:0;
  const visible=s.knowledge[fid]?.tiles[n.tileId]==='VISIBLE',site=s.flow.sites[n.id];
  if(visible&&(site?.cleared||bandPacified(s,site)))continue;
  const travel=flowTravelTurns(s,a,n.tileId),value=(n.kind==='HUT'?cfg.hut[n.tier-1]:cfg.nest)+protection;
  const guards=visible?publicUnits.filter(u=>u.siteId===n.id&&!u.hiredBy).reduce((n,b)=>n+b.troopCount,0):n.kind==='HUT'?FLOW.goody.guardTroops[n.tier-1]:FLOW.neutral.initialTroops*FLOW.neutral.initialUnits;
  const combat=Math.max(1,guards/Math.max(1,a.troopCount*FLOW.neutral.damageRate*2));
  targets.push({id:n.id,tileId:n.tileId,kind:n.kind,value,travel,score:value/(1+travel+combat)});
 }
 for(const c of Object.values(s.knowledge[fid]?.cities??{})){
  if(c.ownerFactionId===fid||!diplomacyHostile(s,fid,c.ownerFactionId)||!s.tiles[c.tileId])continue;
  const travel=flowTravelTurns(s,a,c.tileId),value=c.kind==='major'?cfg.majorCity:cfg.minorCity;
  targets.push({id:c.cityId,tileId:c.tileId,kind:'CITY',value,travel,score:value/(1+travel+cfg.cityCombatTurns)});
 }
 return targets.sort((a,b)=>b.score-a.score||a.travel-b.travel||a.id.localeCompare(b.id));
}
export function runFlowAi(s,fid,{move,updateKnowledge}){
 if(!flowEnabled(s))return s;rememberFlowSites(s);
 // P1 prioritizes this early-game score; later phases keep nearby rewards and
 // protection viable while ordinary strategic AI handles distant expansion.
 const assigned=new Map();
 for(const id of Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a)).map(a=>a.armyId).sort()){
  const a=s.armies[id];if(!canMainAction(s,id)||s.movedArmyIds.includes(id)||withdrawalProtection(s,id)||a.morale!=='STEADY'||s.officers[a.commanderId]?.injury)continue;
  const waiting=liveFlowSites(s).find(n=>n.investigation?.armyId===id);if(waiting){consumeMainAction(s,id);s.movedArmyIds.push(id);continue;}
  const targets=flowAiTargets(s,id).map(t=>({...t,score:t.score/(1+(assigned.get(t.id)??0))})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const goal=targets[0];if(!goal||goal.kind==='CITY'||s.flow.factions[fid].phase>'P2'&&goal.travel>FLOW.ai.lateRange)continue;
  assigned.set(goal.id,(assigned.get(goal.id)??0)+1);
  const n=s.flow.sites[goal.id];if(!n)continue;
  if(distance(s,a.tileId,goal.tileId)>1){
   const ends=boardNeighbors(s.tiles[goal.tileId],s.tiles).map(tileId).filter(t=>['plain','hill','forest'].includes(s.tiles[t].terrainType)).sort((x,y)=>distance(s,a.tileId,x)-distance(s,a.tileId,y)||x.localeCompare(y));
   // The graph chooses a target; the existing movement solver verifies only
   // that selected route, including rivers, walls, occupancy and control zones.
   let route=null;for(const end of ends){route=campaignPath(s,id,end);if(route)break;}
   if(!route||route.pathTileIds.length<2)continue;
   const next=move(s,id,ends,route);if(next)s=next;
   if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);updateKnowledge(s);rememberFlowSites(s);
  }
  if(!canMainAction(s,id)||!castleArmyActive(s,s.armies[id]))continue;
  const attack=flowAttackTargets(s,id).find(target=>s.flow.units[target]?.siteId===goal.id||target===goal.id);
  if(attack)attackNeutral(s,id,attack);
  else if(goodyClaimTargets(s,id).includes(goal.id))claimGoodyHut(s,{armyId:id,siteId:goal.id},fid);
  else consumeMainAction(s,id);
  if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);
  s.flow.history.push({type:'AI_TARGET',turn:s.turn,factionId:fid,armyId:id,targetId:goal.id,score:Math.round(goal.score*100)/100,travel:Math.round(goal.travel*100)/100});
 }
 return s;
}
