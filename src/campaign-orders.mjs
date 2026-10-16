import {combatFireAt} from './campaign-rule-registry.mjs';
import {diplomacyMoveReason} from './campaign-diplomacy.mjs';
import {campaignPath,campaignPaths,campaignReachable,inControlZone} from './campaign-morale.mjs';
import {combatMovement,combatCanPostMove} from './campaign-rule-registry.mjs';
import {hexDistance,boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeTicks,edgeKey} from './movement.mjs';
import {campaignMovementWorld,castleArmyActive,campaignCenterEntryAllowed,campaignDestinationAllowed,campaignStackAllowed} from './campaign-city-footprint.mjs';
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
// UI owns snapshot lifetime (step replaces state). Engine orderRoute stays live.
export function orderRoutes(s,id){
 if(!s.armies[id]||!castleArmyActive(s,s.armies[id]))return new Map();
 const known=s.knowledge[s.playerFactionId]?.tiles??{},blocked=new Set(s.mapRules.blockedEdges);
 for(const t of Object.values(s.tiles))if(!known[t.tileId]||known[t.tileId]==='UNEXPLORED')for(const n of boardNeighbors(t,s.tiles))blocked.add(edgeKey(t.tileId,tileId(n)));
 const routes=campaignPaths({...s,mapRules:{...s.mapRules,blockedEdges:[...blocked]}},id);
 for(const [to,path] of routes)if(!known[to]||known[to]==='UNEXPLORED'||path.pathTileIds.some(t=>!known[t]||known[t]==='UNEXPLORED')||Object.values(s.cities).some(c=>c.tileId===to&&c.ownerFactionId!==s.playerFactionId&&!campaignCenterEntryAllowed(s,id,c)))routes.delete(to);
 return routes;
}
export function assignGroupDestinations(s,ids,to){
 if(!s.tiles[to])throw new Error('INVALID_ORDER_DESTINATION');
 for(const id of ids){const reason=diplomacyMoveReason(s,id,to);if(reason)throw new Error(reason);}
 const units=[...new Set(ids)].filter(id=>orderEligible(s,id)).sort((a,b)=>hexDistance(s.tiles[s.armies[a].tileId],s.tiles[to])-hexDistance(s.tiles[s.armies[b].tileId],s.tiles[to])||a.localeCompare(b,'en'));
 if(units.length!==new Set(ids).size||!units.length)throw new Error('INVALID_ORDER_UNITS');
 const used=new Set(),result=[];
 const tiles=Object.keys(s.tiles).sort((a,b)=>hexDistance(s.tiles[a],s.tiles[to])-hexDistance(s.tiles[b],s.tiles[to])||a.localeCompare(b,'en'));
 for(const [index,id] of units.entries()){
  const dest=tiles.find(t=>(!used.has(t)||campaignStackAllowed(s,id,t))&&campaignDestinationAllowed(s,id,t)&&(!index?t===to:true)&&orderRoute(s,id,t));
  if(!dest)throw new Error('이동 가능한 빈 목적지가 없습니다.');
  used.add(dest);result.push({armyId:id,destinationTileId:dest});
 }
 return result;
}
export function orderSegment(s,id,to){
 if(!campaignDestinationAllowed(s,id,to))return null;
 const route=orderRoute(s,id,to);if(!route)return null;
 let ticks=0,end=s.armies[id].tileId,lastStop=end;const world=campaignMovementWorld(s,id);
 for(const t of route.pathTileIds.slice(1)){
  const cost=edgeTicks(world,world.armies[id],end,t);
  if(cost===null||ticks+cost>200)break;
  ticks+=cost;end=t;
  if(campaignDestinationAllowed(s,id,t))lastStop=t;
 }
 return lastStop===s.armies[id].tileId?null:lastStop;
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

// One diagnostic shared by preview and explicit-route admission. Never persist drafts.
export function inspectOrderPath(s,id,path,{budget=200}={}){
 const a=s.armies[id],known=s.knowledge[s.playerFactionId],fail=(tileId,reason)=>({pathTileIds:path??[],blockedTileId:tileId,reason,totalTicks:ticks,ok:false});let ticks=0;
 if(!a||!Array.isArray(path)||path.length<2||path[0]!==a.tileId)return fail(Array.isArray(path)?path.at(-1):null,'경로의 시작점과 목적지를 확인하세요');
 if(!orderEligible(s,id))return fail(path[1],'이번 차례 이동을 이미 썼거나 행동을 마쳤습니다');
 const world=campaignMovementWorld(s,id),seen=new Set([a.tileId]);
 if(combatCanPostMove(s,id))budget=Math.min(budget,a.c27?.cantoTicks??budget);
 for(let i=1;i<path.length;i++){
  const from=path[i-1],to=path[i];
  if(!s.tiles[to]||!known?.tiles[to]||known.tiles[to]==='UNEXPLORED')return fail(to,'아직 살펴보지 않은 칸입니다');
  if(combatFireAt(s,to))return fail(to,'불');
  if(seen.has(to))return fail(to,'경로는 같은 칸을 반복할 수 없습니다');seen.add(to);
  if(hexDistance(s.tiles[from],s.tiles[to])!==1)return fail(to,'서로 이웃한 칸으로 경로를 정하세요');
  if(i>1&&inControlZone(s,a,from))return fail(from,'적 통제 구역에 들어가 멈춤');
  const treaty=diplomacyMoveReason(s,id,to,from);if(treaty)return fail(to,treaty);
  const occupant=Object.values(s.armies).find(b=>b.armyId!==id&&b.tileId===to&&castleArmyActive(s,b)&&(b.factionId===a.factionId||known.tiles[to]==='VISIBLE'&&known.observedArmies?.[b.armyId]));
  if(occupant)return fail(to,'다른 부대가 있습니다');
  if(Object.values(s.cities).some(c=>c.tileId===to&&!campaignCenterEntryAllowed(s,id,c)))return fail(to,'적 성 중심은 성 공격으로 진입합니다');
  const cost=edgeTicks(world,world.armies[id],from,to),edge=edgeKey(from,to);
  if(cost===null)return fail(to,['mountain','water'].includes(s.tiles[to].terrainType)?s.tiles[to].terrainType==='mountain'?'산은 통과할 수 없습니다':'물 위로 이동할 수 없습니다':world.mapRules.riverEdges.includes(edge)&&!['ford','bridge'].includes(world.mapRules.crossings[edge])?'강 — 여울 아님':'통과할 수 없는 길입니다');
  ticks+=cost;
  if(ticks>budget||i>combatMovement(s,id).max)return fail(to,'이동력 부족');
 }
 if(!campaignReachable(s,id,budget).has(path.at(-1)))return fail(path.at(-1),'현재 특기·상태의 이동 조건을 충족하지 못했습니다');
 return {ok:true,pathTileIds:[...path],totalTicks:ticks,blockedTileId:null,reason:''};
}
export function requireOrderPath(s,id,to,path){
 const result=inspectOrderPath(s,id,path);
 if(!result.ok)throw Object.assign(new Error(result.reason),{code:'INVALID_ORDER_PATH'});
 if(path.at(-1)!==to)throw Object.assign(new Error('경로의 목적지를 확인하세요'),{code:'INVALID_ORDER_PATH'});
 return {pathTileIds:result.pathTileIds,totalTicks:result.totalTicks};
}
// Concatenate ordinary segment searches, then validate the entire turn together.
export function waypointRoute(s,id,points=[]){
 let path=[s.armies[id]?.tileId];
 if(!s.armies[id]||!points.length)return inspectOrderPath(s,id,path);
 for(const to of points){
  if(to===path.at(-1))continue;
  const virtual={...s,armies:{...s.armies,[id]:{...s.armies[id],tileId:path.at(-1)}}};
  const segment=orderRoute(virtual,id,to);
  if(!segment){
   // Geometry-only shortest chain is a diagnostic probe, never executable.
   const queue=[[path.at(-1)]],seen=new Set(queue[0]);let probe=null;
   for(let i=0;i<queue.length;i++){const p=queue[i];if(p.at(-1)===to){probe=p;break;}for(const n of boardNeighbors(s.tiles[p.at(-1)],s.tiles)){const t=tileId(n);if(!seen.has(t)){seen.add(t);queue.push([...p,t]);}}}
   path.push(...(probe?.slice(1)??[to]));return inspectOrderPath(s,id,path);
  }
  path.push(...segment.pathTileIds.slice(1));
 }
 return inspectOrderPath(s,id,path);
}
export function visibleControlZones(s,id){
 const a=s.armies[id],k=s.knowledge[s.playerFactionId];if(!a||!k)return [];
 // Retain all rules but remove unseen enemies before asking the zone engine.
 const publicState={...s,armies:Object.fromEntries(Object.entries(s.armies).filter(([key,b])=>b.factionId===a.factionId||k.tiles[b.tileId]==='VISIBLE'&&k.observedArmies?.[key]))};
 return Object.keys(s.tiles).filter(t=>k.tiles[t]&&k.tiles[t]!=='UNEXPLORED'&&inControlZone(publicState,a,t));
}
