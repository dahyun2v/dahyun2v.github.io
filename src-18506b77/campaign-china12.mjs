import data from '../data/c509-china-draft.json' with {type:'json'};
import rawMap from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import domestic from '../data/c184-domestic-trial.json' with {type:'json'};
import {domesticTalentPacks,officerFromPack} from './campaign-roster.mjs';
import {CAMPAIGN_OFFICERS_51_100,campaignOfficerPack} from './campaign-officers-51-100.mjs';
import {createRng} from './rng.mjs';
import {boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeKey} from './movement.mjs';
import {castleFootprint} from './campaign-city-footprint.mjs';
import {contentFingerprint} from './first3.mjs';
import {updateKnowledge} from './knowledge.mjs';

const alias=id=>({xuchang:'west',xiapi:'east',kuaiji:'south'})[id]??id;
export const CHINA_FACTIONS=data.factions;
export const china12Fingerprint=legacy=>contentFingerprint({legacy},{china12:1},{});
export function validateChina12(s){
 if(s.china12===undefined)return;
 const p=s.startCityPlacement,ids=Object.values(p?.capitals??{});
 if(s.mapId!=='china'||s.china12?.version!==1||p?.version!==2||ids.length!==12||new Set(ids).size!==12||CHINA_FACTIONS.some(f=>!s.cities[p.capitals[f.id]])||!Number.isInteger(p.attempts)||p.attempts<1||p.attempts>128||p.minimumDistance!==7||p.scoreStdCap!==null&&p.scoreStdCap!==1.54)throw new Error('INVALID_CHINA_START');
 const m=chinaStartMetrics(s,ids);
 if(m.minDistance!==p.minDistance||m.scoreStd!==p.scoreStd||m.minDistance<7||p.scoreStdCap!==null&&m.scoreStd>p.scoreStdCap)throw new Error('INVALID_CHINA_FAIRNESS');
}
export function chinaDraftPacks(){
 const extra=data.officers.map(p=>({...p,role:null,style:null,primaryClass:`TRIAL:${p.engineId}`,secondaryClass:null,
  uniqueTrait:{name:'고유 능력 설치 대기',text:'능력치와 공용 계통만 적용. 고유 특기·E·R은 아직 설치하지 않았습니다.',effects:[]},draftPool:[],
  troopAptitude:{[({militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'})[p.troopType]]:'HIGH'}}));
 return Object.fromEntries([...Object.values(domesticTalentPacks),...CAMPAIGN_OFFICERS_51_100.map(p=>campaignOfficerPack(p.id)),...extra].map(p=>[p.id,{...p,factionCandidate:p.factionCandidate??data.home[p.id]??p.faction}]));
}
let geometry;
function startGeometry(){
 if(geometry)return geometry;
 // Fairness describes the original map, never weather, a commander's crossing
 // permission, or loaded campaign state. Loading in a fresh process is identical.
 const ids=rawMap.startCandidates.map(alias),distances={},cityTiles=Object.fromEntries(rawMap.cities.map(c=>[alias(c.id),c.at.join(',')]));
 const tiles=Object.fromEntries(rawMap.tiles.filter(t=>!t.out).map(t=>[t.at.join(','),{q:t.at[0],r:t.at[1],terrainType:t.type}]));
 const blocked=new Set(rawMap.riverEdges.filter(e=>!rawMap.bridges.includes(e)));
 for(const id of ids){const start=cityTiles[id],d={[start]:0},q=[start];
  for(let i=0;i<q.length;i++)for(const n of boardNeighbors(tiles[q[i]],tiles)){const to=tileId(n);if(d[to]!==undefined||['mountain','water'].includes(tiles[to].terrainType)||blocked.has(edgeKey(q[i],to)))continue;d[to]=d[q[i]]+1;q.push(to);}
  distances[id]=d;
 }
 return geometry={ids,distances,cityTiles};
}
export function chinaStartMetrics(s,ids){
 const {distances,cityTiles}=startGeometry(),scores=domestic.startCities.maps.china.startScore.scores,values=ids.map(id=>scores[id]);
 if(values.some(n=>!Number.isFinite(n)))throw new Error('CHINA_START_SCORE_MISSING');
 const mean=values.reduce((a,b)=>a+b,0)/values.length;
 return {minDistance:Math.min(...ids.flatMap((id,i)=>ids.slice(i+1).map(other=>distances[id][cityTiles[other]]??Infinity))),scoreStd:Math.sqrt(values.reduce((n,v)=>n+(v-mean)**2,0)/values.length)};
}
export function chooseChinaStarts(s,{mode='random',fairness=true}={}){
 if(!['random','fixed'].includes(mode))throw new Error('INVALID_START_CITIES');
 const cfg=domestic.startCities.maps.china,limit=cfg.attempts??128,rng=createRng(((mode==='fixed'?190919:s.campaignSeed)^0xc509a591)>>>0),{ids}=startGeometry();
 const draw=()=>{const a=[...ids];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,12);};
 const acceptable=m=>Number.isFinite(m.minDistance)&&m.minDistance>=7&&(!fairness||m.scoreStd<=cfg.startScore.maxStd);
 for(let attempt=1;attempt<=limit;attempt++){const selected=draw(),metrics=chinaStartMetrics(s,selected);if(acceptable(metrics))return {mode,version:2,fallback:false,attempts:attempt,minimumDistance:7,scoreStdCap:fairness?cfg.startScore.maxStd:null,selected,...metrics};}
 // A bounded random retry must never silently relax fairness. The fixed seed is
 // checked through the same constraints, and only used as an explicit fallback.
 if(mode==='fixed')throw new Error('CHINA_NO_FAIR_START');
 return {...chooseChinaStarts(s,{mode:'fixed',fairness}),mode,fallback:true,attempts:limit};
}

// Creation only: legacy china saves never acquire this marker or this roster.
export function initializeChina12(s,{mode='random',fairness=true}={}){
 const placement=chooseChinaStarts(s,{mode,fairness}),packs=chinaDraftPacks(),rulers=new Set(CHINA_FACTIONS.map(f=>f.rulerOfficerId));
 const templateFaction=structuredClone(s.factions.F01),templateArmy=structuredClone(Object.values(s.armies)[0]),templateCity=structuredClone(s.cities.west);
 const officers=Object.fromEntries(Object.values(packs).map(p=>[p.id,officerFromPack(s,p,null,placement.selected[0])]));
 s.factions={};s.armies={};s.officers={};s.wanderers={};s.china12={version:1};s.contentFingerprint=china12Fingerprint(s.contentFingerprint);
 for(const c of Object.values(s.cities))Object.assign(c,{kind:'minor',ownerFactionId:null,governorId:null,population:1,populationCapacity:1,foodStock:20,reserveTroops:0,woundedTroops:0,facilities:[],workedTiles:c.workedTiles.slice(0,1)});
 const spare=Object.keys(packs).filter(id=>!rulers.has(id));
 for(const [index,spec] of CHINA_FACTIONS.entries()){
  const capital=s.cities[placement.selected[index]],geo={cityId:capital.cityId,name:capital.name,tileId:capital.tileId};
  const companions=spare.splice(0,2),ids=[spec.rulerOfficerId,...companions];
  const f={...structuredClone(templateFaction),factionId:spec.id,name:spec.ruler,rulerId:spec.rulerOfficerId,capitalCityId:capital.cityId,ownedCityIds:[capital.cityId],officerIds:ids,armyIds:[],factionEffects:[]};s.factions[spec.id]=f;
  const footprint=castleFootprint(capital.tileId,{roads:s.mapRules.roads.map(e=>e.split('|')),exists:id=>!!s.tiles[id]});
  Object.assign(capital,structuredClone(templateCity),geo,{kind:'major',ownerFactionId:f.factionId,governorId:companions[1],workedTiles:footprint.gates.slice(0,2)});
  for(const id of ids){const o=officers[id];o.allegianceFactionId=f.factionId;o.locationRef={kind:'CITY',id:capital.cityId};o.c26OriginFaction=f.factionId;o.c26OriginCity=capital.cityId;if(packs[id].engineId)o.catalogEngineId=packs[id].engineId;s.officers[id]=o;}
  for(const [i,id] of [f.rulerId,companions[0]].entries()){
   const armyId=`U-${f.factionId}-${id}`,o=s.officers[id],at=i?footprint.gates.find(at=>!['mountain','water'].includes(s.tiles[at]?.terrainType)):capital.tileId;
   if(!at)throw new Error('CHINA_NO_START_GATE');
   s.armies[armyId]={...structuredClone(templateArmy),armyId,factionId:f.factionId,commanderId:id,troopType:o.allowedTroops[0],tileId:at,facing:null};f.armyIds.push(armyId);o.locationRef={kind:'ARMY',id:armyId};
  }
 }
 const neutrals=Object.values(s.cities).filter(c=>c.ownerFactionId===null);
 let i=0;for(const [id,o] of Object.entries(officers))if(!s.officers[id]){o.locationRef={kind:'CITY',id:neutrals[i++%neutrals.length].cityId};if(packs[id].engineId)o.catalogEngineId=packs[id].engineId;s.wanderers[id]=o;}
 const {selected,...metrics}=placement;s.startCityPlacement={...metrics,capitals:Object.fromEntries(CHINA_FACTIONS.map((f,i)=>[f.id,selected[i]]))};
 s.knowledge={};updateKnowledge(s);return s;
}
