import {campaignMechQuery,campaignMechAllowed,hasCampaignMechQuery} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {weatherKind,weatherEdgeReason,RUN_MODIFIERS} from './campaign-run-modifiers.mjs';
import {boardNeighbors,tileId,movementTicks} from './map-primitives.mjs';
import {parentTroop} from './campaign-special-troops.mjs'; // 특수 병종(투석기 등)은 부모 병종의 이동 규칙으로 — 원래 부대를 그대로 넘기는 호출(예약 이동 등)에서 '알 수 없는 병종'으로 판 전체가 멈췄다(2026-10-12)
export const edgeKey=(a,b)=>[a,b].sort().join('|');
// Only detached, frozen read-world arrays get an index. Mutable canonical
// arrays keep includes(), so same-length in-place edits remain observable.
const edgeIndexes=new WeakMap();
function edgeContains(edges,key){
  if(!Object.isFrozen(edges))return edges.includes(key);
  let index=edgeIndexes.get(edges);if(!index){index=new Set(edges);edgeIndexes.set(edges,index);}
  return index.has(key);
}
export function snapshotMovementEdges(world){
  const rules={...world.mapRules};
  for(const key of ['roads','riverEdges','blockedEdges'])if(!Object.isFrozen(rules[key]))rules[key]=Object.freeze([...rules[key]]);
  return {...world,mapRules:rules};
}
const activeArmy=(s,a)=>!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById?.[a.armyId]?.disposition==='ACTIVE';
export function buildMapRules(map,data){
  if(data?.schema!=='first3-movement-v1' || data.version!==1)throw new Error('이동 기준 자료가 필요합니다.');
  const roads=map.roads.map(e=>edgeKey(...e.map(p=>p.join(','))));
  const crossings=Object.fromEntries(Object.entries(map.crossings).map(([name,e])=>[edgeKey(...e.map(p=>p.join(','))),name]));
  return cloneCampaign({version:1,tuning:data.tuning,vision:data.vision,roads,riverEdges:data.riverEdges,crossings,blockedEdges:[]});
}
export function edgeTicks(s,a,fromId,toId){
  const from=s.tiles[fromId],to=s.tiles[toId];if(!from || !to)return null;
  const key=edgeKey(fromId,toId),r=s.mapRules;
  if(weatherEdgeReason(s,fromId,toId))return null;
  let tuning=r.tuning;
  if(weatherKind(s)==='RAIN'&&to.terrainType==='plain'){const type=parentTroop(a.troopType),base=tuning.byTroop?.[type]??tuning[type==='cavalry'?'cavalry':type==='engineer'?'engineer':'normal'],plus=RUN_MODIFIERS.weather.kinds.find(k=>k.id==='RAIN').effect.plainMoveCostPlus;tuning={...tuning,byTroop:{...tuning.byTroop,[type]:{...base,plain:base.plain+plus,rough:base.rough+plus,road:base.road+plus}}};}
  const baseline=movementTicks({from,to,troopType:parentTroop(a.troopType),maneuver:s.officers[a.commanderId].subStats.기동지휘,edge:{road:edgeContains(r.roads,key),river:edgeContains(r.riverEdges,key),crossing:r.crossings[key]??'none',blocked:edgeContains(r.blockedEdges,key)},tuning,tickDays:s.time.tickDays});
  if(!campaignMechAllowed(s,'H05','moveAllowed',{sourceId:a.armyId,from:fromId,to:toId,kind:'EDGE'}))return null;
  const cost=campaignMechQuery(s,'H07','edgeCost',{sourceId:a.armyId,from:fromId,to:toId},baseline);
  if(cost!==null&&(!Number.isSafeInteger(cost)||cost<1))throw new Error('INVALID_MECH_EDGE_COST');
  return cost;
}
// A search is read-only: capture geometry/rules once and discard on return.
// No cached value survives movement, weather, tuning or map edits.
export function edgeTicksForSearch(s,a){
  if(hasCampaignMechQuery('H07')||hasCampaignMechQuery('H05'))return (from,to)=>edgeTicks(s,a,from,to);
  const r=s.mapRules,roads=new Set(r.roads),rivers=new Set(r.riverEdges),blocked=new Set(r.blockedEdges);
  const weather=weatherKind(s),troopType=parentTroop(a.troopType),maneuver=s.officers[a.commanderId].subStats.기동지휘;
  let rainTuning=r.tuning;
  if(weather==='RAIN'){
    const base=r.tuning.byTroop?.[troopType]??r.tuning[troopType==='cavalry'?'cavalry':troopType==='engineer'?'engineer':'normal'];
    const plus=RUN_MODIFIERS.weather.kinds.find(k=>k.id==='RAIN').effect.plainMoveCostPlus;
    rainTuning={...r.tuning,byTroop:{...r.tuning.byTroop,[troopType]:{...base,plain:base.plain+plus,rough:base.rough+plus,road:base.road+plus}}};
  }
  return (fromId,toId)=>{
    const from=s.tiles[fromId],to=s.tiles[toId];if(!from||!to)return null;
    const key=edgeKey(fromId,toId),crossing=r.crossings[key]??'none';
    if(weather==='RAIN'&&crossing==='ford')return null;
    return movementTicks({from,to,troopType,maneuver,edge:{road:roads.has(key),river:rivers.has(key),crossing,blocked:blocked.has(key)},tuning:weather==='RAIN'&&to.terrainType==='plain'?rainTuning:r.tuning,tickDays:s.time.tickDays});
  };
}
// Static geometry only: no enemy or friendly occupancy is used for path search.
// Dijkstra's frontier used to sort the entire set for every visited tile.
// Immutable heap entries retain exactly the old distance/English-ID tie break.
function pathFrontier(){
  const heap=[],less=(a,b)=>a.cost<b.cost||a.cost===b.cost&&a.id.localeCompare(b.id,'en')<0;
  return {
    get size(){return heap.length;},
    push(id,cost){
      const item={id,cost};let i=heap.length;heap.push(item);
      while(i){const parent=(i-1)>>1;if(!less(item,heap[parent]))break;heap[i]=heap[parent];i=parent;}heap[i]=item;
    },
    pop(){
      const first=heap[0],last=heap.pop();if(!heap.length)return first;
      let i=0;
      while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],last))break;heap[i]=heap[child];i=child;}
      heap[i]=last;return first;
    },
  };
}
export function findPath(s,armyId,destination){
  const a=s.armies[armyId];if(!a || !s.tiles[destination])throw new Error('이동할 부대와 목적지를 확인하세요.');
  if(!activeArmy(s,a))throw new Error('패배하거나 해산된 부대는 이동할 수 없습니다.');
  const ticks=edgeTicksForSearch(s,a);
  const dist=new Map([[a.tileId,0]]),previous=new Map(),queue=pathFrontier();queue.push(a.tileId,0);
  while(queue.size){
    const entry=queue.pop(),current=entry.id;if(entry.cost!==dist.get(current))continue;
    if(current===destination){const path=[current];while(previous.has(path[0]))path.unshift(previous.get(path[0]));return {pathTileIds:path,totalTicks:dist.get(current)};}
    for(const p of boardNeighbors(s.tiles[current],s.tiles)){
      const next=tileId(p),cost=ticks(current,next);if(cost===null)continue;
      const distance=entry.cost+cost;if(distance<(dist.get(next)??Infinity)){dist.set(next,distance);previous.set(next,current);queue.push(next,distance);}
    }
  }
  return null;
}
function validateExplicitPath(s,a,destinationTileId,pathTileIds){
  if(!Array.isArray(pathTileIds)||pathTileIds.length===0)throw new Error('명시 이동 경로가 올바르지 않습니다.');
  if(pathTileIds.some(tile=>typeof tile!=='string'||!s.tiles[tile]))throw new Error('명시 이동 경로에 알 수 없는 타일이 있습니다.');
  if(pathTileIds[0]!==a.tileId||pathTileIds.at(-1)!==destinationTileId)throw new Error('명시 이동 경로의 시작점과 목적지를 확인하세요.');
  if(new Set(pathTileIds).size!==pathTileIds.length)throw new Error('명시 이동 경로는 같은 타일을 반복할 수 없습니다.');
  let totalTicks=0;
  for(let index=1;index<pathTileIds.length;index++){
    const from=pathTileIds[index-1],to=pathTileIds[index];
    if(!boardNeighbors(s.tiles[from],s.tiles).some(point=>tileId(point)===to))throw new Error('명시 이동 경로에는 인접하지 않은 타일이 있습니다.');
    const cost=edgeTicks(s,a,from,to);
    if(cost===null)throw new Error('명시 이동 경로에 통과할 수 없는 간선이 있습니다.');
    totalTicks+=cost;
  }
  return {pathTileIds:[...pathTileIds],totalTicks};
}
export function issueOrder(s,order){return issueOrderImpl(s,order,false);}
// Internal campaign transactions already own a detached writable state. This
// variant still creates the root/actor but does not copy unrelated game data.
export function issueOwnedOrder(s,order){return issueOrderImpl(s,order,true);}
function issueOrderImpl(s,{armyId,type,destinationTileId=null,factionId=s.playerFactionId,validatedPathTileIds=null},owned){
  if(s.turnPhase!=='PLANNING')throw new Error('이동 중에는 명령이 고정됩니다. 이번 10일 실행을 마쳐 주세요.');
  const a=s.armies[armyId];if(!a || a.factionId!==factionId)throw new Error('자기 세력 부대만 명령할 수 있습니다.');
  if(!activeArmy(s,a))throw new Error('패배하거나 해산된 부대에는 명령을 내릴 수 없습니다.');
  if(!['MOVE','HOLD'].includes(type))throw new Error('지원하지 않는 명령입니다.');
  if(type==='HOLD'&&validatedPathTileIds!==null)throw new Error('대기 명령에는 명시 이동 경로를 넣을 수 없습니다.');
  const route=type==='MOVE'
    ?(validatedPathTileIds===null?findPath(s,armyId,destinationTileId):validateExplicitPath(s,a,destinationTileId,validatedPathTileIds))
    :{pathTileIds:[a.tileId],totalTicks:0};
  if(!route)throw new Error('지형과 건널목을 따라 갈 수 있는 경로가 없습니다.');
  const next=owned?{...s,armies:{...s.armies,[armyId]:{...s.armies[armyId]}}}:cloneCampaign(s),unit=next.armies[armyId];next.orderSequence++;
  unit.currentOrder={orderId:`O-${next.orderSequence}`,armyId,type,issuedTurn:s.turnNumber,destinationTileId:type==='MOVE'?destinationTileId:a.tileId,pathTileIds:route.pathTileIds,currentPathIndex:0,status:type==='HOLD'?'HOLDING':route.pathTileIds.length===1?'COMPLETED':'PLANNED'};
  unit.movementState=null;return next;
}
function contact(s,type,units,tiles){
  const ids=[...new Set(units.map(a=>a.armyId))].sort();
  s.history.push({type,turn:s.turnNumber,tick:s.time.tick,armyIds:ids,factionIds:[...new Set(units.map(a=>a.factionId))].sort(),tileIds:[...new Set(tiles)].sort()});
  for(const a of units)if(a.currentOrder?.type==='MOVE' && !['COMPLETED','BLOCKED_INVALID_PATH'].includes(a.currentOrder.status))a.currentOrder.status=type;
}
// Collect arrival intents from the same starting snapshot, then commit together.
function movementProgressPermilleByArmy(s,input={}){
  if(input===null||typeof input!=='object'||Array.isArray(input))throw new TypeError('이동 진행 배율은 부대별 객체여야 합니다.');
  const normalized={};
  for(const [armyId,value] of Object.entries(input)){
    if(!Object.hasOwn(s.armies,armyId))throw new Error(`알 수 없는 부대의 이동 진행 배율입니다: ${armyId}`);
    if(!activeArmy(s,s.armies[armyId]))throw new Error(`패배하거나 해산된 부대에는 이동 진행을 적용할 수 없습니다: ${armyId}`);
    if(!Number.isInteger(value)||value<1||value>1000)throw new RangeError(`이동 진행 배율은 1..1000 정수여야 합니다: ${armyId}`);
    normalized[armyId]=value;
  }
  return normalized;
}
export function moveOneTick(s,{movementProgressPermilleByArmyId={}}={}){
  const progressPermille=movementProgressPermilleByArmy(s,movementProgressPermilleByArmyId);
  const armies=Object.values(s.armies).filter(a=>activeArmy(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId,'en'));
  const occupied=new Map(armies.map(a=>[a.tileId,a])),arrivals=new Map();
  for(const a of armies){
    const o=a.currentOrder;if(!o || o.type!=='MOVE' || !['PLANNED','ACTIVE','WAITING_FOR_TILE'].includes(o.status))continue;
    const to=o.pathTileIds[o.currentPathIndex+1],ticks=edgeTicks(s,a,a.tileId,to);
    if(!ticks){o.status='BLOCKED_INVALID_PATH';continue;}
    if(!a.movementState)a.movementState={fromTileId:a.tileId,toTileId:to,edgeProgress:0,edgeTravelTicks:ticks};
    const m=a.movementState;
    if(m.fromTileId!==a.tileId || m.toTileId!==to){o.status='BLOCKED_INVALID_PATH';continue;}
    // Waiting earns priority, but never banks travel time for a subsequent edge.
    const speed=(progressPermille[a.armyId]??1000)/1000/m.edgeTravelTicks;
    m.edgeProgress+=speed;o.status='ACTIVE';
    if(m.edgeProgress>=1-1e-9)arrivals.set(a.armyId,{a,from:a.tileId,to,progress:m.edgeProgress,speed});
  }
  const stopped=new Set(),groups=new Map();
  for(const intent of arrivals.values()){if(!groups.has(intent.to))groups.set(intent.to,[]);groups.get(intent.to).push(intent);}
  for(const group of groups.values())if(new Set(group.map(i=>i.a.factionId)).size>1){
    contact(s,'EDGE_CONTACT',group.map(i=>i.a),group.flatMap(i=>[i.from,i.to]));group.forEach(i=>stopped.add(i.a.armyId));
  }
  for(const i of arrivals.values()){
    if(stopped.has(i.a.armyId))continue;
    const occupant=occupied.get(i.to);if(!occupant || occupant.factionId===i.a.factionId)continue;
    const opposite=arrivals.get(occupant.armyId);
    contact(s,opposite?.to===i.from?'EDGE_CONTACT':'CONTACT',[i.a,occupant],[i.from,i.to]);stopped.add(i.a.armyId);stopped.add(occupant.armyId);
  }
  const candidates=new Map();
  for(const group of groups.values()){
    const allowed=group.filter(i=>!stopped.has(i.a.armyId)).sort((x,y)=>y.progress-x.progress||y.speed-x.speed||x.a.armyId.localeCompare(y.a.armyId,'en'));
    if(allowed.length)candidates.set(allowed[0].a.armyId,allowed[0]);
  }
  function canEnter(id,chain=[]){
    const i=candidates.get(id);if(!i)return false;
    if(chain.includes(id))return chain.length-chain.indexOf(id)===2;
    const occupant=occupied.get(i.to);if(!occupant)return true;
    return occupant.factionId===i.a.factionId && canEnter(occupant.armyId,[...chain,id]);
  }
  const moving=new Set([...candidates.keys()].filter(id=>canEnter(id)));
  for(const i of arrivals.values()){
    if(stopped.has(i.a.armyId))continue;
    if(!moving.has(i.a.armyId)){i.a.currentOrder.status='WAITING_FOR_TILE';continue;}
    const a=i.a,o=a.currentOrder;a.tileId=i.to;o.currentPathIndex++;a.movementState=null;
    o.status=o.currentPathIndex===o.pathTileIds.length-1?'COMPLETED':'ACTIVE';
  }
}
