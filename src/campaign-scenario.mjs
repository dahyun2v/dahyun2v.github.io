import v1 from '../../docs/design-data/map-layout-v1.json' with {type:'json'};
import v3 from '../../docs/design-data/map-layout-v3-hebei.json' with {type:'json'};
import v2 from '../../docs/design-data/map-layout-v2.json' with {type:'json'};
import initial from '../../docs/design-data/first3-initial-state-v1.json' with {type:'json'};
import movement from '../../docs/design-data/first3-movement-v1.json' with {type:'json'};
import {castleFootprint} from './campaign-city-footprint.mjs';
import {contentFingerprint} from './first3.mjs';

// Keep v1 inputs byte-for-byte compatible with historical saves and fixtures.
function inputsSlice(layout,id){
 const map={...layout,crossings:{}};
 const movementData={...movement,riverEdges:layout.riverEdges.filter(e=>!layout.bridges.includes(e))};
 const initialData=structuredClone(initial),w=initialData.world;
 w.mapId=id;
 const roads=layout.roads.map(e=>e.map(p=>p.join(',')));
 const tileIds=new Set(layout.tiles.map(t=>t.at.join(',')));
 const exists=id=>tileIds.has(id);
 const template=structuredClone(w.cities.west);
 for(const spec of layout.cities){
  const c=w.cities[spec.id]??structuredClone(template);
  Object.assign(c,{cityId:spec.id,name:spec.label,kind:spec.kind,tileId:spec.at.join(','),ownerFactionId:spec.ownerFactionId});
  const footprint=castleFootprint(c.tileId,{roads,exists});
  c.workedTiles=footprint.gates.slice(0,spec.kind==='minor'?1:2);
  if(spec.kind==='minor')Object.assign(c,{population:1,populationCapacity:1,governorId:null,foodStock:20,reserveTroops:0,woundedTroops:0,facilities:[]});
  w.cities[spec.id]=c;
  if(spec.ownerFactionId){
   const armies=Object.values(w.armies).filter(a=>a.factionId===spec.ownerFactionId);
   armies.forEach((a,i)=>{a.tileId=i===0?c.tileId:footprint.gates[i-1];});
  }
 }
 return {map,initialData,movementData};
}
const scenarios={v1:{map:v1,initialData:initial,movementData:movement},v2:inputsSlice(v2,'v2'),v3:inputsSlice(v3,'v3')};
export function campaignScenario(id='v3'){
 const data=scenarios[id];if(!data)throw new Error('INVALID_CAMPAIGN_MAP');return data;
}
export const campaignMapData=(id='v1')=>campaignScenario(id).map;
const fingerprints=Object.fromEntries(Object.entries(scenarios).map(([id,d])=>[id,contentFingerprint(d.map,d.initialData,d.movementData)]));
export const campaignFingerprint=id=>{campaignScenario(id);return fingerprints[id];};
