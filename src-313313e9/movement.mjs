import {weatherKind,weatherEdgeReason,RUN_MODIFIERS} from './campaign-run-modifiers.mjs';
import {boardNeighbors,tileId,movementTicks} from './map-primitives.mjs';
import {parentTroop} from './campaign-special-troops.mjs'; // 특수 병종(투석기 등)은 부모 병종의 이동 규칙으로 — 원래 부대를 그대로 넘기는 호출(예약 이동 등)에서 '알 수 없는 병종'으로 판 전체가 멈췄다(2026-10-12)
export const edgeKey=(a,b)=>[a,b].sort().join('|');
const activeArmy=(s,a)=>!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById?.[a.armyId]?.disposition==='ACTIVE';
export function buildMapRules(map,data){
  if(data?.schema!=='first3-movement-v1' || data.version!==1)throw new Error('이동 기준 자료가 필요합니다.');
  const roads=map.roads.map(e=>edgeKey(...e.map(p=>p.join(','))));
  const crossings=Object.fromEntries(Object.entries(map.crossings).map(([name,e])=>[edgeKey(...e.map(p=>p.join(','))),name]));
  return structuredClone({version:1,tuning:data.tuning,vision:data.vision,roads,riverEdges:data.riverEdges,crossings,blockedEdges:[]});
}
export function edgeTicks(s,a,fromId,toId){
  const from=s.tiles[fromId],to=s.tiles[toId];if(!from || !to)return null;
  const key=edgeKey(fromId,toId),r=s.mapRules;
  if(weatherEdgeReason(s,fromId,toId))return null;
  let tuning=r.tuning;
  if(weatherKind(s)==='RAIN'&&to.terrainType==='plain'){const type=parentTroop(a.troopType),base=tuning.byTroop?.[type]??tuning[type==='cavalry'?'cavalry':type==='engineer'?'engineer':'normal'],plus=RUN_MODIFIERS.weather.kinds.find(k=>k.id==='RAIN').effect.plainMoveCostPlus;tuning={...tuning,byTroop:{...tuning.byTroop,[type]:{...base,plain:base.plain+plus,rough:base.rough+plus,road:base.road+plus}}};}
  return movementTicks({from,to,troopType:parentTroop(a.troopType),maneuver:s.officers[a.commanderId].subStats.기동지휘,edge:{road:r.roads.includes(key),river:r.riverEdges.includes(key),crossing:r.crossings[key]??'none',blocked:r.blockedEdges.includes(key)},tuning,tickDays:s.time.tickDays});
}
// Static geometry only: no enemy or friendly occupancy is used for path search.
export function findPath(s,armyId,destination){
  const a=s.armies[armyId];if(!a || !s.tiles[destination])throw new Error('이동할 부대와 목적지를 확인하세요.');
  if(!activeArmy(s,a))throw new Error('패배하거나 해산된 부대는 이동할 수 없습니다.');
  const dist=new Map([[a.tileId,0]]),previous=new Map(),queue=new Set([a.tileId]);
  while(queue.size){
    const current=[...queue].sort((x,y)=>dist.get(x)-dist.get(y)||x.localeCompare(y,'en'))[0];queue.delete(current);
    if(current===destination){const path=[current];while(previous.has(path[0]))path.unshift(previous.get(path[0]));return {pathTileIds:path,totalTicks:dist.get(current)};}
    for(const p of boardNeighbors(s.tiles[current],s.tiles)){
      const next=tileId(p),cost=edgeTicks(s,a,current,next);if(cost===null)continue;
      const distance=dist.get(current)+cost;if(distance<(dist.get(next)??Infinity)){dist.set(next,distance);previous.set(next,current);queue.add(next);}
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
export function issueOrder(s,{armyId,type,destinationTileId=null,factionId=s.playerFactionId,validatedPathTileIds=null}){
  if(s.turnPhase!=='PLANNING')throw new Error('이동 중에는 명령이 고정됩니다. 이번 10일 실행을 마쳐 주세요.');
  const a=s.armies[armyId];if(!a || a.factionId!==factionId)throw new Error('자기 세력 부대만 명령할 수 있습니다.');
  if(!activeArmy(s,a))throw new Error('패배하거나 해산된 부대에는 명령을 내릴 수 없습니다.');
  if(!['MOVE','HOLD'].includes(type))throw new Error('지원하지 않는 명령입니다.');
  if(type==='HOLD'&&validatedPathTileIds!==null)throw new Error('대기 명령에는 명시 이동 경로를 넣을 수 없습니다.');
  const route=type==='MOVE'
    ?(validatedPathTileIds===null?findPath(s,armyId,destinationTileId):validateExplicitPath(s,a,destinationTileId,validatedPathTileIds))
    :{pathTileIds:[a.tileId],totalTicks:0};
  if(!route)throw new Error('지형과 건널목을 따라 갈 수 있는 경로가 없습니다.');
  const next=structuredClone(s),unit=next.armies[armyId];next.orderSequence++;
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
