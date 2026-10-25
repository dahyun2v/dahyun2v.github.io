import {campaignMechQuery,campaignMechAllowed,hasCampaignMechQuery} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {boardNeighbors,hexDistance,movementTicks,tileId} from './map-primitives.mjs';
import {situationEventsView} from './campaign-situations.mjs';
// Optional terrain is campaign-only. FIRST3 callers retain distance visibility.
export function canObserveTile(observer,target,range,tiles=null){
 return hexDistance(observer,target)<=range&&(!tiles||terrainVisible(observer,target,(q,r)=>tiles[`${q},${r}`]));
}
function terrainVisible(origin,target,at){
 const distance=hexDistance(origin,target);
 if(distance<=1)return true;
 // Trace both sides of a hex-edge tie; an opaque terrain touching either ray blocks.
 for(const epsilon of [-1e-6,1e-6])for(let i=1;i<distance;i++){
  const f=i/distance,x=origin.q+(target.q-origin.q)*f+epsilon,z=origin.r+(target.r-origin.r)*f+epsilon,y=-x-z;
  let q=Math.round(x),r=Math.round(z),s=Math.round(y);
  const dx=Math.abs(q-x),dz=Math.abs(r-z),dy=Math.abs(s-y);
  if(dx>dy&&dx>dz)q=-s-r;else if(dy>dz)s=-q-r;else r=-q-s;
  if(['mountain','forest','hill'].includes(at(q,r)?.terrainType))return false;
 }
 return true;
}
const minimumArmy=a=>({armyId:a.armyId,factionId:a.factionId,tileId:a.tileId,commanderId:a.commanderId,troopType:a.troopType});
const activeArmy=(s,a)=>!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById?.[a.armyId]?.disposition==='ACTIVE';
const KNOWN=new Set(['VISIBLE','REMEMBERED']);
const MOVEMENT_TROOP=Object.freeze({normal:'spear',cavalry:'cavalry',engineer:'engineer'});
const edgeKey=(left,right)=>[left,right].sort((a,b)=>a.localeCompare(b,'en')).join('|');

function knownStaticEdge(s,fromId,toId,knowledge){
  const from=s.tiles[fromId],to=s.tiles[toId],key=edgeKey(fromId,toId),rules=s.mapRules;
  const edge={road:rules.roads.includes(key),river:rules.riverEdges.includes(key),crossing:rules.crossings[key]??'none',blocked:rules.blockedEdges.includes(key)};
  const travelTicksByClass={};
  for(const[className,troopType]of Object.entries(MOVEMENT_TROOP))travelTicksByClass[className]=movementTicks({from,to,troopType,maneuver:50,edge,tuning:rules.tuning,tickDays:s.time.tickDays});
  const blocked=Object.values(travelTicksByClass).every(value=>value===null);
  return {edgeId:`EDGE:${key}`,fromTileId:fromId,toTileId:toId,knowledge,blocked,travelTicksByClass};
}

// Content keys include every static cost input, so in-place fixture/map edits
// invalidate just as cloned snapshots do. Knowledge labels stay live.
let staticEdgesCache=null;
function knownEdges(s,knowledge){
  const signature=JSON.stringify([Object.entries(s.tiles).map(([id,t])=>[id,t.q,t.r,t.terrainType]),s.mapRules,s.time.tickDays]);
  if(staticEdgesCache?.signature!==signature)staticEdgesCache={signature,edges:new Map()};
  const cache=staticEdgesCache.edges,edges=[];
  // Knowledge is sparse on large maps. Enumerate discovered entries rather
  // than walking the entire board and testing every unexplored tile.
  for(const fromId of Object.keys(knowledge).filter(id=>KNOWN.has(knowledge[id])&&Object.hasOwn(s.tiles,id)).sort((a,b)=>a.localeCompare(b,'en'))){
    if(!KNOWN.has(knowledge[fromId]))continue;
    for(const point of boardNeighbors(s.tiles[fromId],s.tiles)){
      const toId=tileId(point);
      if(fromId.localeCompare(toId,'en')>=0||!KNOWN.has(knowledge[toId]))continue;
      const key=edgeKey(fromId,toId);
      if(!cache.has(key))cache.set(key,knownStaticEdge(s,fromId,toId,null));
      edges.push({...cache.get(key),knowledge:knowledge[fromId]==='VISIBLE'&&knowledge[toId]==='VISIBLE'?'VISIBLE':'REMEMBERED'});
    }
  }
  return edges.sort((left,right)=>left.edgeId.localeCompare(right.edgeId,'en'));
}
// Geometry only. Validate coordinates even when fixtures edit tiles in place;
// observers, ownership, disposition and last-seen timestamps remain live.
const visionGeometry=new WeakMap();
function visibilityGeometry(tiles){
 const entries=Object.entries(tiles),signature=entries.map(([id,t])=>`${id}:${t.q}:${t.r}:${t.terrainType}`).join('|');
 let g=visionGeometry.get(tiles);if(g?.signature===signature)return g;
 g={signature,entries,byCoordinate:new Map(entries.map(([id,t])=>[`${t.q},${t.r}`,id])),footprints:new Map(),integer:entries.every(([,t])=>Number.isInteger(t.q)&&Number.isInteger(t.r))};visionGeometry.set(tiles,g);return g;
}
function visibleFootprint(g,origin,range,occlusion){
 const key=`${origin.q},${origin.r}:${range}:${occlusion}`;if(g.footprints.has(key))return g.footprints.get(key);
 let ids=[];
 if(g.integer&&g.byCoordinate.size===g.entries.length&&Number.isFinite(range)&&range>=0&&range<100){
  const radius=Math.floor(range);
  for(let dq=-radius;dq<=radius;dq++)for(let dr=Math.max(-radius,-dq-radius);dr<=Math.min(radius,-dq+radius);dr++){
   const id=g.byCoordinate.get(`${origin.q+dq},${origin.r+dr}`);if(id)ids.push(id);
  }
 }else ids=g.entries.filter(([,t])=>canObserveTile(origin,t,range)).map(([id])=>id);
 if(occlusion){const tiles=new Map(g.entries);ids=ids.filter(id=>terrainVisible(origin,tiles.get(id),(q,r)=>tiles.get(g.byCoordinate.get(`${q},${r}`))));}
 g.footprints.set(key,ids);return ids;
}
export function updateKnowledge(s){
  const geometry=visibilityGeometry(s.tiles);
  for(const factionId of Object.keys(s.factions).sort()){
    const k=s.knowledge[factionId]??={tiles:{},observedArmies:{},lastSeenArmies:{},cities:{}};
    const observers=[...Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).map(c=>({tileId:c.tileId,range:s.mapRules.vision.city})),...Object.values(s.armies).filter(a=>a.factionId===factionId&&activeArmy(s,a)).map(a=>({tileId:a.tileId,range:s.mapRules.vision.byTroop?.[a.troopType]??s.mapRules.vision.field}))];
    const visible=new Set();
    for(const o of observers){const origin=s.tiles[o.tileId],range=o.range+(origin.terrainType==='hill'?s.mapRules.vision.hillBonus:0);for(const id of visibleFootprint(geometry,origin,range,s.mapRules.vision.profile==='CAMPAIGN_V1'))visible.add(id);}
    if(hasCampaignMechQuery('H13')){const ids=campaignMechQuery(s,'H13','visibleTiles',{viewerFactionId:factionId},[...visible]);if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!s.tiles[id]))throw new Error('INVALID_MECH_VISIBILITY');visible.clear();for(const id of ids)visible.add(id);}
    for(const [id]of geometry.entries)k.tiles[id]=visible.has(id)?'VISIBLE':k.tiles[id] && k.tiles[id]!=='UNEXPLORED'?'REMEMBERED':'UNEXPLORED';
    k.observedArmies={};
    for(const a of Object.values(s.armies))if(activeArmy(s,a)&&a.factionId!==factionId && k.tiles[a.tileId]==='VISIBLE'&&campaignMechAllowed(s,'H13','observationAllowed',{targetId:a.armyId,viewerFactionId:factionId})){
      const record=minimumArmy(a);k.observedArmies[a.armyId]=record;
      k.lastSeenArmies[a.armyId]={...record,lastSeen:{tileId:a.tileId,turn:s.turnNumber,tick:s.time.tick}};
    }
    for(const c of Object.values(s.cities))if(k.tiles[c.tileId]==='VISIBLE')k.cities[c.cityId]={cityId:c.cityId,name:c.name,tileId:c.tileId,ownerFactionId:c.ownerFactionId};
  }
}
// Presentation and later AI receive this projection, never the raw enemy records.
export function getFactionView(s,factionId=s.playerFactionId){
  if(!s.factions[factionId] || !s.knowledge[factionId])throw new Error('관측할 세력이 없습니다.');
  const k=s.knowledge[factionId],ownArmies=Object.fromEntries(Object.entries(s.armies).filter(([,a])=>a.factionId===factionId&&activeArmy(s,a)));
  return cloneCampaign({...(s.situationBarks?{situationEvents:situationEventsView(s,factionId),...(factionId===s.playerFactionId?{situationBarks:s.situationBarks}:{})}:{}),factionId,turnNumber:s.turnNumber,currentDate:s.currentDate,time:s.time,turnPhase:s.turnPhase,ui:s.ui,faction:s.factions[factionId],officers:Object.fromEntries(Object.entries(s.officers).filter(([,o])=>o.allegianceFactionId===factionId)),ownArmies,ownCities:Object.fromEntries(Object.entries(s.cities).filter(([,c])=>c.ownerFactionId===factionId)),knowledge:k,tiles:Object.fromEntries(Object.entries(s.tiles).map(([id,t])=>[id,k.tiles[id]==='UNEXPLORED'?{tileId:id,q:t.q,r:t.r}:t])),knownEdges:knownEdges(s,k.tiles),contacts:s.history.filter(e=>e.factionIds?.includes(factionId)).slice(-12)});
}
