import {boardNeighbors,hexDistance,movementTicks,tileId} from './map-primitives.mjs';
export function canObserveTile(observer,target,range){return hexDistance(observer,target)<=range;}
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

function knownEdges(s,knowledge){
  const edges=[];
  for(const fromId of Object.keys(s.tiles).sort((a,b)=>a.localeCompare(b,'en'))){
    if(!KNOWN.has(knowledge[fromId]))continue;
    for(const point of boardNeighbors(s.tiles[fromId],s.tiles)){
      const toId=tileId(point);
      if(fromId.localeCompare(toId,'en')>=0||!KNOWN.has(knowledge[toId]))continue;
      edges.push(knownStaticEdge(s,fromId,toId,knowledge[fromId]==='VISIBLE'&&knowledge[toId]==='VISIBLE'?'VISIBLE':'REMEMBERED'));
    }
  }
  return edges.sort((left,right)=>left.edgeId.localeCompare(right.edgeId,'en'));
}
export function updateKnowledge(s){
  for(const factionId of Object.keys(s.factions).sort()){
    const k=s.knowledge[factionId]??={tiles:{},observedArmies:{},lastSeenArmies:{},cities:{}};
    const observers=[...Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).map(c=>({tileId:c.tileId,range:s.mapRules.vision.city})),...Object.values(s.armies).filter(a=>a.factionId===factionId&&activeArmy(s,a)).map(a=>({tileId:a.tileId,range:s.mapRules.vision.byTroop?.[a.troopType]??s.mapRules.vision.field}))];
    for(const [id,t]of Object.entries(s.tiles)){
      const visible=observers.some(o=>canObserveTile(s.tiles[o.tileId],t,o.range+(s.tiles[o.tileId].terrainType==='hill'?s.mapRules.vision.hillBonus:0)));
      k.tiles[id]=visible?'VISIBLE':k.tiles[id] && k.tiles[id]!=='UNEXPLORED'?'REMEMBERED':'UNEXPLORED';
    }
    k.observedArmies={};
    for(const a of Object.values(s.armies))if(activeArmy(s,a)&&a.factionId!==factionId && k.tiles[a.tileId]==='VISIBLE'){
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
  return structuredClone({factionId,turnNumber:s.turnNumber,currentDate:s.currentDate,time:s.time,turnPhase:s.turnPhase,ui:s.ui,faction:s.factions[factionId],officers:Object.fromEntries(Object.entries(s.officers).filter(([,o])=>o.allegianceFactionId===factionId)),ownArmies,ownCities:Object.fromEntries(Object.entries(s.cities).filter(([,c])=>c.ownerFactionId===factionId)),knowledge:k,tiles:Object.fromEntries(Object.entries(s.tiles).map(([id,t])=>[id,k.tiles[id]==='UNEXPLORED'?{tileId:id,q:t.q,r:t.r}:t])),knownEdges:knownEdges(s,k.tiles),contacts:s.history.filter(e=>e.factionIds?.includes(factionId)).slice(-12)});
}
