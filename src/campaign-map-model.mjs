import {campaignMapData} from './campaign-scenario.mjs';
import movement from '../../docs/design-data/first3-movement-v1.json' with {type:'json'};
import initial from '../../docs/design-data/first3-initial-state-v1.json' with {type:'json'};
import {troopToCampaign} from './campaign-adapters.mjs';
import {SPECIAL_TROOPS} from './campaign-special-troops.mjs';
const names=Object.fromEntries(Object.values(initial.world.cities).map(c=>[c.cityId,{F01:'허창',F02:'성도',F03:'건업'}[c.ownerFactionId]]));
export function campaignDate(turn){const n=turn-1;return `${turn}턴 · ${190+Math.floor(n/36)}년 ${Math.floor(n%36/3)+1}월 ${['상순','중순','하순'][n%3]}`;}
// Only the public faction view supplies entities and terrain; hidden enemy records are never read.
export function campaignMapModel(v,{selectedArmyId=null,movedArmyIds=[],moveOptions=[],destination=null,portraits={}}={}){
 const map=campaignMapData(v.mapId);
 // 옛 지도(사용자 2026-10-04 "지형은 옛지도로 보여줘"): v2·v3 는 지형·강·길·다리·지명을 처음부터 시나리오 지도에서 그린다.
 // 부대·성 정보는 지금처럼 시야(knowledge)만 쓴다. v1 은 기존 안개 그대로.
 const oldMap=['v2','v3'].includes(v.mapId),terrainAt=oldMap?Object.fromEntries(map.tiles.map(t=>[t.at.join(','),t.type])):{};
 const tiles=Object.values(v.tiles).map(t=>({q:t.q,r:t.r,terrain:t.terrainType??terrainAt[t.tileId]??'unknown',vis:v.knowledge.tiles[t.tileId]??'UNEXPLORED'}));
 const known=id=>oldMap||v.knowledge.tiles[id]&&v.knowledge.tiles[id]!=='UNEXPLORED';
 const roads=map.roads.map(edge=>edge.map(p=>p.join(','))).filter(e=>e.every(known));
 const rivers=(oldMap?map.riverEdges.filter(e=>!map.bridges.includes(e)):movement.riverEdges).map(e=>e.split('|')).filter(e=>e.every(known));
 const cities=Object.values({...v.knowledge.cities,...v.ownCities}).map(c=>({id:c.cityId,...(['v2','v3'].includes(v.mapId)?{freeOfficers:c.freeOfficers??[],wanderers:c.wanderers??[],currentProduction:c.currentProduction,kind:c.kind??map.cities.find(x=>x.id===c.cityId)?.kind,ownerFactionId:c.ownerFactionId,neutral:c.ownerFactionId===null}:{}),name:['v2','v3'].includes(v.mapId)?c.name:names[c.cityId]??c.name,factionId:c.ownerFactionId,center:c.tileId,population:c.population,unrest:c.securityLevel===2?'CHAOS':c.securityLevel===1?'UNREST':null,defense:c.durability,defenseMax:c.durabilityMax,...(c.footprint?{gates:c.footprint.gates,walls:c.footprint.walls,besieged:c.besieged,lostGates:c.lostGates}:{}),occupation:c.occupation??{stage:c.occupationState==='TEMPORARY_OCCUPATION'?'CAPTURED':'NORMAL',turnsLeft:c.occupationState==='TEMPORARY_OCCUPATION'?1:0},occupied:c.occupationState==='TEMPORARY_OCCUPATION'}));
 const units=Object.values({...v.knowledge.observedArmies,...v.ownArmies}).map(a=>({id:a.armyId,...(a.facing!==undefined?{facing:a.facing,formation:a.formation}:{}),status:a.status??[],morale:a.morale??'STEADY',factionId:a.factionId,tileId:a.tileId,name:v.officers[a.commanderId]?.name??initial.world.officers[a.commanderId]?.name??a.commanderId,troop:troopToCampaign(a.troopType),...(SPECIAL_TROOPS[a.troopType]?{special:a.troopType,troopName:SPECIAL_TROOPS[a.troopType].name}:{}),count:a.troopCount,maxCount:a.maxTroopCount??(Number.isFinite(a.troopCount)?Math.max(a.troopCount,initial.world.armies[a.armyId]?.troopCount??a.troopCount):undefined),active:a.armyId===selectedArmyId,moved:movedArmyIds.includes(a.armyId),enemy:a.factionId!==v.factionId,portrait:portraits[a.commanderId]?.path}));
 const route=moveOptions.find(o=>o.tileId===destination)?.route;
 const facilities=Object.values(v.ownCities).flatMap(c=>(c.facilities??[]).filter(f=>known(f.tileId)).map(f=>({...f,cityId:c.cityId})));
 return {...(['v2','v3'].includes(v.mapId)?{width:map.width,height:map.height,places:map.places.filter(p=>known(p.at.join(','))),bridges:map.bridges.map(e=>e.split('|')).filter(e=>e.every(known))}:{}),tiles,roads,rivers,cities,facilities,units,...(oldMap?{hubs:v.hubs??[],engineMap:v.engineMap??{structures:[],warnings:[]}}:{}),highlights:{move:moveOptions.map(o=>o.tileId),attack:[],path:route?.pathTileIds??[]}};
}
