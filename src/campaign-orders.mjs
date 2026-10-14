import {diplomacyMoveReason} from './campaign-diplomacy.mjs';
import {campaignPath} from './campaign-morale.mjs';
import {hexDistance,boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeTicks,edgeKey} from './movement.mjs';
import {campaignMovementWorld,castleArmyActive,campaignCenterEntryAllowed} from './campaign-city-footprint.mjs';
import {armyActionEnded} from './campaign-combat.mjs';
export const orderEligible=(s,id)=>s.armies[id]?.factionId===s.playerFactionId&&castleArmyActive(s,s.armies[id])&&!armyActionEnded(s,id)&&!s.movedArmyIds.includes(id);
export function orderRoute(s,id,to){
 if(!s.tiles[to]||!s.armies[id]||!castleArmyActive(s,s.armies[id]))return null;
 const known=s.knowledge[s.playerFactionId]?.tiles??{};
 if(!known[to]||known[to]==='UNEXPLORED')return null;
 const blocked=new Set(s.mapRules.blockedEdges);
 for(const t of Object.values(s.tiles))if(!known[t.tileId]||known[t.tileId]==='UNEXPLORED')for(const n of boardNeighbors(t,s.tiles))blocked.add(edgeKey(t.tileId,tileId(n)));
 const path=campaignPath({...s,mapRules:{...s.mapRules,blockedEdges:[...blocked]}},id,to);
 if(!path||path.pathTileIds.some(t=>!known[t]||known[t]==='UNEXPLORED'))return null;
 if(Object.values(s.cities).some(c=>c.tileId===to&&c.ownerFactionId!==s.playerFactionId&&!campaignCenterEntryAllowed(s,id,c)))return null;
 return path;
}
export function assignGroupDestinations(s,ids,to){
 if(!s.tiles[to])throw new Error('INVALID_ORDER_DESTINATION');
 for(const id of ids){const reason=diplomacyMoveReason(s,id,to);if(reason)throw new Error(reason);}
 const units=[...new Set(ids)].filter(id=>orderEligible(s,id)).sort((a,b)=>hexDistance(s.tiles[s.armies[a].tileId],s.tiles[to])-hexDistance(s.tiles[s.armies[b].tileId],s.tiles[to])||a.localeCompare(b,'en'));
 if(units.length!==new Set(ids).size||!units.length)throw new Error('INVALID_ORDER_UNITS');
 const occupied=new Set(Object.values(s.armies).filter(a=>castleArmyActive(s,a)).map(a=>a.tileId)),used=new Set(),result=[];
 const tiles=Object.keys(s.tiles).sort((a,b)=>hexDistance(s.tiles[a],s.tiles[to])-hexDistance(s.tiles[b],s.tiles[to])||a.localeCompare(b,'en'));
 for(const [index,id] of units.entries()){
  const dest=tiles.find(t=>!used.has(t)&&(!occupied.has(t)||t===s.armies[id].tileId)&&(!index?t===to:true)&&orderRoute(s,id,t));
  if(!dest)throw new Error('이동 가능한 빈 목적지가 없습니다.');
  used.add(dest);result.push({armyId:id,destinationTileId:dest});
 }
 return result;
}
export function orderSegment(s,id,to){
 if(Object.values(s.armies).some(a=>a.armyId!==id&&castleArmyActive(s,a)&&a.tileId===to))return null;
 const route=orderRoute(s,id,to);if(!route)return null;
 let ticks=0,end=s.armies[id].tileId;const world=campaignMovementWorld(s,id);
 for(const t of route.pathTileIds.slice(1)){
  const cost=edgeTicks(world,world.armies[id],end,t);
  if(cost===null||ticks+cost>200)break;
  if(Object.values(s.armies).some(a=>a.armyId!==id&&castleArmyActive(s,a)&&a.tileId===t))return end===s.armies[id].tileId?null:end;
  ticks+=cost;end=t;
 }
 return end===s.armies[id].tileId?null:end;
}
export function queuedOrderUnit(s){return (s.orderQueue??[])[0]??null;}
export function routeTurns(s,id,route){
 let turns=1,ticks=0;const world=campaignMovementWorld(s,id),path=route.pathTileIds;
 for(let i=1;i<path.length;i++){const cost=edgeTicks(world,world.armies[id],path[i-1],path[i]);if(ticks+cost>200){turns++;ticks=0;}ticks+=cost;}
 return turns;
}
export function orderHighlights(s,ids=[]){
 const selected=new Set(ids);return Object.entries(s.moveOrders??{}).filter(([id])=>!ids.length||selected.has(id)).flatMap(([id,o])=>{const r=orderRoute(s,id,o.destinationTileId);return r?[{unitId:id,path:r.pathTileIds,turns:routeTurns(s,id,r)}]:[];});
}
