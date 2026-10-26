import v1 from '../../docs/design-data/map-layout-v1.json' with {type:'json'};
import v3 from '../../docs/design-data/map-layout-v3-hebei.json' with {type:'json'};
import v2 from '../../docs/design-data/map-layout-v2.json' with {type:'json'};
import china from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import initial from '../../docs/design-data/first3-initial-state-v1.json' with {type:'json'};
import movement from '../../docs/design-data/first3-movement-v1.json' with {type:'json'};
import {castleFootprint} from './campaign-city-footprint.mjs';
import {contentFingerprint} from './first3.mjs';
import {updateKnowledge} from './knowledge.mjs';
import {createRng} from './rng.mjs';
import {boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeTicks} from './movement.mjs';
import domestic from '../data/c184-domestic-trial.json' with {type:'json'};

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
// 중국 전역 시험 지도(성 52): 놀이판 밖 칸은 빼고, first3 세력 수도 id(west · east · south)를 허창 · 하비 · 회계에 준다(v3 와 같은 방식). 나머지 성은 중립(엔진 규칙: 중립 = 작은 성).
const CHINA_CAPITALS={xuchang:'west',xiapi:'east',kuaiji:'south'};
const chinaPlay=layout=>({...layout,tiles:layout.tiles.filter(t=>!t.out).map(({at,type})=>({at,type})),
 cities:layout.cities.map(c=>({...c,id:CHINA_CAPITALS[c.id]??c.id,kind:CHINA_CAPITALS[c.id]?'major':'minor',ownerFactionId:CHINA_CAPITALS[c.id]?c.ownerFactionId:null}))});
const scenarios={v1:{map:v1,initialData:initial,movementData:movement},v2:inputsSlice(v2,'v2'),v3:inputsSlice(v3,'v3'),china:inputsSlice(chinaPlay(china),'china')};
export function campaignScenario(id='v3'){
 const data=scenarios[id];if(!data)throw new Error('INVALID_CAMPAIGN_MAP');return data;
}
export const campaignMapData=(id='v1')=>campaignScenario(id).map;
const fingerprints=Object.fromEntries(Object.entries(scenarios).map(([id,d])=>[id,contentFingerprint(d.map,d.initialData,d.movementData)]));
export const campaignFingerprint=id=>{campaignScenario(id);return fingerprints[id];};

// C312: geometry and people are separate; placement RNG never consumes gameplay RNG.
export const START_CITY_TUNING=domestic.startCities;

const startGeometry=new Map();
function placementGeometry(world,mapId){
 if(startGeometry.has(mapId))return startGeometry.get(mapId);
 const majors=Object.values(world.cities).filter(c=>c.kind!=='minor'),distances={};
 const unit={...Object.values(world.armies)[0],troopType:'spear'};
 for(const c of majors){
  const dist={[c.tileId]:0},queue=[c.tileId];
  for(let i=0;i<queue.length;i++)for(const p of boardNeighbors(world.tiles[queue[i]],world.tiles)){
   const next=tileId(p);if(dist[next]!==undefined||edgeTicks(world,unit,queue[i],next)===null)continue;
   dist[next]=dist[queue[i]]+1;queue.push(next);
  }
  distances[c.cityId]=dist;
 }
 const cfg=START_CITY_TUNING.maps[mapId],capitals=Object.values(world.factions).map(f=>world.cities[f.capitalCityId]);
 const minimumDistance=Math.min(...capitals.flatMap((c,i)=>capitals.slice(i+1).map(d=>distances[c.cityId][d.tileId]??Infinity)))*cfg.minimumDistanceRatio;
 const neighborhoods=Object.fromEntries(majors.map(c=>{
  const near=t=>(distances[c.cityId][t]??Infinity)<=cfg.nearbyDistance;
  return [c.cityId,{minorCount:Object.values(world.cities).filter(x=>x.kind==='minor'&&near(x.tileId)).length,
   resources:Object.values(world.tiles).filter(t=>near(t.tileId)).reduce((n,t)=>n+Object.values(domestic.terrain[t.terrainType]??{}).reduce((a,b)=>a+b,0),0)}];
 }));
 const geometry={distances,minimumDistance,neighborhoods};startGeometry.set(mapId,geometry);return geometry;
}
// 시작 자리 공정성 점수 상한(중국 지도 방 시뮬레이션 — startsim.json): cfg.startScore.enabled=true인 지도만. 뽑힌 성 점수 표준편차가 maxStd를 넘으면 다시 뽑는다.
export function startScoreOk(cfg,ids){const sc=cfg.startScore;if(!sc||sc.enabled!==true)return true;const v=ids.map(id=>sc.scores[id]??0),mu=v.reduce((a,b)=>a+b,0)/v.length;return Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/v.length)<=sc.maxStd;}
export function assignCampaignStartCities(world,mapId,mode='random'){
 if(!['fixed','random'].includes(mode))throw new Error('INVALID_START_CITIES');
 if(mode==='fixed')return world;
 const cfg=START_CITY_TUNING.maps[mapId],geometry=placementGeometry(world,mapId),{distances,minimumDistance,neighborhoods}=geometry;
 const factions=Object.values(world.factions),majors=Object.values(world.cities).filter(c=>c.kind!=='minor');
 let placementSeed=(world.campaignSeed^0xc312a591)>>>0;
 placementSeed=Math.imul(placementSeed^(placementSeed>>>16),0x7feb352d);
 placementSeed=Math.imul(placementSeed^(placementSeed>>>15),0x846ca68b);
 const rng=createRng((placementSeed^(placementSeed>>>16))>>>0);
 const metrics=ids=>{
  const values=ids.map(id=>neighborhoods[id]);
  const minDistance=Math.min(...ids.flatMap((id,i)=>ids.slice(i+1).map(other=>distances[id][world.cities[other].tileId]??Infinity)));
  const minorSpread=Math.max(...values.map(x=>x.minorCount))-Math.min(...values.map(x=>x.minorCount));
  const resources=values.map(x=>x.resources),resourceSpreadRatio=(Math.max(...resources)-Math.min(...resources))/Math.max(1,Math.max(...resources));
  return {minDistance,minorSpread,resourceSpreadRatio};
 };
 let selected=null,attempt=0;
 for(;attempt<START_CITY_TUNING.attempts;attempt++){
  const ids=majors.map(c=>c.cityId);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const choice=ids.slice(0,factions.length),m=metrics(choice);
  if(Number.isFinite(m.minDistance)&&m.minDistance>=minimumDistance&&m.minorSpread<=cfg.maxMinorSpread&&m.resourceSpreadRatio<=cfg.maxResourceSpreadRatio&&startScoreOk(cfg,choice)){selected=choice;break;}
 }
 const fallback=!selected;
 selected??=factions.map(f=>f.capitalCityId);
 world.startCityPlacement={mode,version:1,fallback,attempts:Math.min(attempt+1,START_CITY_TUNING.attempts),
  capitals:Object.fromEntries(factions.map((f,i)=>[f.factionId,selected[i]])),minimumDistance,nearbyDistance:cfg.nearbyDistance,
  neighborhoods:Object.fromEntries(selected.map(id=>[id,neighborhoods[id]])),...metrics(selected)};
 if(fallback)return world;
 const original=structuredClone(world.cities),mapping=Object.fromEntries(factions.map((f,i)=>[f.capitalCityId,selected[i]]));
 // Copy faction-owned city stocks and governor, preserving destination geography.
 for(const f of factions){
  const source=original[f.capitalCityId],target=world.cities[mapping[f.capitalCityId]];
  const geography=Object.fromEntries(['cityId','name','kind','tileId','workedTiles'].filter(k=>target[k]!==undefined).map(k=>[k,target[k]]));
  Object.assign(target,structuredClone(source),geography,{ownerFactionId:f.factionId});
 }
 const minors=Object.values(world.cities).filter(c=>c.kind==='minor');
 for(const c of minors){c.ownerFactionId=null;c.governorId=null;}
 // Give each faction the same number of starting minor castles, nearest first.
 const claims=factions.map(f=>({f,count:Object.values(original).filter(c=>c.kind==='minor'&&c.ownerFactionId===f.factionId).length}));
 const available=new Set(minors.map(c=>c.cityId));
 while(claims.some(x=>x.count>0))for(const claim of claims){
  if(claim.count<=0)continue;
  const capital=mapping[claim.f.capitalCityId],id=[...available].sort((a,b)=>(distances[capital][world.cities[a].tileId]??Infinity)-(distances[capital][world.cities[b].tileId]??Infinity)||a.localeCompare(b))[0];
  if(!id)throw new Error('START_CITY_MINOR_COVERAGE');
  const source=Object.values(original).find(c=>c.kind==='minor'&&c.ownerFactionId===claim.f.factionId&&!mapping[c.cityId]);
  mapping[source.cityId]=id;
  const target=world.cities[id],{cityId,name,kind,tileId,workedTiles}=target;
  Object.assign(target,structuredClone(source),{cityId,name,kind,tileId,workedTiles});
  available.delete(id);claim.count--;
 }
 for(const o of Object.values(world.officers))if(o.locationRef.kind==='CITY'&&mapping[o.locationRef.id])o.locationRef.id=mapping[o.locationRef.id];
 for(const f of factions){
  f.capitalCityId=mapping[f.capitalCityId];
  f.ownedCityIds=Object.values(world.cities).filter(c=>c.ownerFactionId===f.factionId).map(c=>c.cityId);
  const c=world.cities[f.capitalCityId],roads=world.mapRules.roads.map(e=>e.split('|'));
  const footprint=castleFootprint(c.tileId,{roads,exists:id=>!!world.tiles[id]});
  Object.values(world.armies).filter(a=>a.factionId===f.factionId).forEach((a,i)=>{a.tileId=i===0?c.tileId:footprint.gates[i-1];});
 }
 // Discard fixed-layout observations before the regular vision/supply setup.
 world.knowledge={};updateKnowledge(world);return world;
}
