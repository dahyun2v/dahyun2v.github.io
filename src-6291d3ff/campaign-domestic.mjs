import {isSliceMap} from './map-primitives.mjs';
import {domesticV3Enabled,domesticV3Influence,v3DomesticView,DOMESTIC_V3} from './domestic-v3.mjs';
import trial from '../data/c184-domestic-trial.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';

export const C184=trial;
export const domesticEngineEnabled=s=>isSliceMap(s.mapId)&&s.trialRules?.c184!==false;
export const DEPARTMENTS=Object.freeze({agriculture:{name:'농업',stat:'politics',statName:'정무'},commerce:{name:'상업',stat:'intelligence',statName:'지략'},military:{name:'군사',stat:'leadership',statName:'통솔'}});
export const CITY_POLICIES=Object.freeze({balanced:{name:'균형',specialist:null},agriculture:{name:'농업',specialist:'logistician'},commerce:{name:'상업',specialist:'artisan'},military:{name:'군사',specialist:'official'},delegated:{name:'위임',specialist:null}});
export function initializeDomesticEngine(s){
 if(!domesticEngineEnabled(s))return s;
 s.officerTransfers??=[];
 for(const c of Object.values(s.cities)){
  c.departments??={agriculture:null,commerce:null,military:null};
  if(!domesticV3Enabled(s))c.domesticPolicy??='balanced';c.autoDepartments??=true;c.foodPriority??=false;c.nextProduction??=null;c.absentGovernorId??=null;
 }
 return s;
}
export const departmentBonus=(o,kind)=>Math.max(0,Math.floor(((o?.baseStats?.[DEPARTMENTS[kind]?.stat]??0)-C184.statOffset)/C184.statStep));
export function domesticOfficerPresent(s,c,id){const o=s.officers[id];return !!o&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.allegianceFactionId===c.ownerFactionId&&o.travelState==='STATIONARY'&&o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId&&!(s.c46Disabled!==true&&o.injury);}
export function departmentOutput(s,c){
 const out={food:0,production:0,prestige:0,reserve:0,security:0,causes:[]};
 if(!domesticEngineEnabled(s))return out;
 for(const kind of Object.keys(DEPARTMENTS)){
  const id=c.departments?.[kind];if(!domesticOfficerPresent(s,c,id))continue;
  const n=departmentBonus(s.officers[id],kind),label=`${DEPARTMENTS[kind].name} 담당 ${s.officers[id].name}`;
  for(const resource of kind==='agriculture'?['food']:kind==='commerce'?['production','prestige']:['reserve','security']){
   const amount=resource==='reserve'?n*C184.reservePerBonus:resource==='security'?(n>=C184.securityBonusThreshold?1:0):n;
   out[resource]+=amount;if(amount)out.causes.push({resource,label,amount});
  }
 }
 return out;
}
export function clearDomesticOfficer(s,id){for(const c of Object.values(s.cities))for(const kind of Object.keys(c.departments??{}))if(c.departments[kind]===id)c.departments[kind]=null;}
export function autoFillDepartments(s){
 if(!domesticEngineEnabled(s))return;
 const used=new Set(Object.values(s.cities).flatMap(c=>[c.governorId,c.absentGovernorId,...Object.values(c.departments??{})]).filter(Boolean));
 for(const c of Object.values(s.cities).sort((a,b)=>a.cityId.localeCompare(b.cityId))){
  for(const kind of Object.keys(DEPARTMENTS)){
   const o=s.officers[c.departments[kind]];
   if(o&&(o.allegianceFactionId!==c.ownerFactionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||Object.values(s.cities).some(city=>city.governorId===o.officerId)||o.locationRef?.kind==='CITY'&&o.locationRef.id!==c.cityId))c.departments[kind]=null;
  }
  const absent=s.officers[c.absentGovernorId];
  if(c.absentGovernorId&&(!absent||absent.allegianceFactionId!==c.ownerFactionId||absent.lifeState!=='ALIVE'||absent.captivityState!=='FREE'))c.absentGovernorId=null;
  if(!c.autoDepartments||!c.ownerFactionId)continue;
  for(const kind of Object.keys(DEPARTMENTS))if(!c.departments[kind]){
   const o=Object.values(s.officers).filter(o=>!used.has(o.officerId)&&domesticOfficerPresent(s,c,o.officerId))
    .sort((a,b)=>(b.baseStats?.[DEPARTMENTS[kind].stat]??0)-(a.baseStats?.[DEPARTMENTS[kind].stat]??0)||a.officerId.localeCompare(b.officerId))[0];
   if(o){c.departments[kind]=o.officerId;used.add(o.officerId);}
  }
 }
}
export function terrainKind(s,t){return t.terrainType==='plain'&&(s.mapRules.riverEdges??[]).some(e=>e.split('|').includes(t.tileId))?'riverside':t.terrainType;}
const enemyOn=(s,c,id)=>Object.values(s.armies).some(a=>a.tileId===id&&a.factionId!==c.ownerFactionId&&a.hp>0&&a.troopCount>0&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[a.armyId]?.disposition==='ACTIVE'));
// Cache axial membership only; all yields and availability remain live.
const influenceGeometry=new WeakMap();
function nearbyInfluenceTiles(s,c,radius){
 let index=influenceGeometry.get(s.tiles);if(!index){index=new Map();influenceGeometry.set(s.tiles,index);}
 const key=`${c.tileId}:${radius}`;
 if(!index.has(key))index.set(key,Object.values(s.tiles).filter(t=>hexDistance(t,s.tiles[c.tileId])<=radius).map(t=>t.tileId));
 return index.get(key).map(id=>s.tiles[id]);
}
export function cityInfluence(s,c){
 if(domesticV3Enabled(s))return domesticV3Influence(s,c);
 const radius=c.population>=C184.expansionPopulation?2:1;
 const centers=new Set(Object.values(s.cities).map(city=>city.tileId));
 const tiles=nearbyInfluenceTiles(s,c,radius).filter(t=>!centers.has(t.tileId))
  .filter(t=>!Object.values(s.cities).some(other=>other!==c&&hexDistance(t,s.tiles[other.tileId])<= (other.population>=C184.expansionPopulation?2:1)&&
   (hexDistance(t,s.tiles[other.tileId])<hexDistance(t,s.tiles[c.tileId])||hexDistance(t,s.tiles[other.tileId])===hexDistance(t,s.tiles[c.tileId])&&other.cityId.localeCompare(c.cityId)<0)))
  .map(t=>{const terrain=terrainKind(s,t),base=C184.terrain[terrain],blocked=enemyOn(s,c,t.tileId),value={...base};for(const f of c.facilities??[])if(f.tileId===t.tileId&&!f.damaged)for(const [resource,n] of Object.entries(C184.facilityYield[f.kind]??{}))value[resource]+=n;return {tileId:t.tileId,terrain,baseYield:{...base},yield:blocked?{food:0,production:0}:value,blocked,worked:false};});
 const policy=c.domesticPolicy??'balanced';
 const weights=C184.policyWeights[policy]??C184.policyWeights.balanced;
 const score=t=>t.yield.food*weights[0]+t.yield.production*weights[1];
 tiles.sort((a,b)=>score(b)-score(a)||a.tileId.localeCompare(b.tileId));
 for(const t of tiles.filter(t=>!t.blocked).slice(0,c.population))t.worked=true;
 const foodScale=(C184.foodScale+C184.foodScalePopulationShare/Math.max(1,c.population))*(c.kind==='minor'?C184.minorFoodScale:1);
 for(const t of tiles)t.effectiveYield={food:t.worked?t.yield.food*foodScale:0,production:t.worked?t.yield.production*C184.tileProductionScale:0};
 return {radius,workers:c.population,workedTiles:tiles.filter(t=>t.worked).length,tiles,
  food:Math.round(tiles.reduce((n,t)=>n+t.effectiveYield.food,0)*1e6)/1e6,production:C184.centerProduction*(c.kind==='minor'?.5:1)+tiles.reduce((n,t)=>n+t.effectiveYield.production,0)};
}
export function facilitySite(s,c,kind,candidates){
 const order=(domesticV3Enabled(s)?DOMESTIC_V3.facilityPreference[kind]:null)??C184.facilityPreference[kind]??C184.facilityPreference.default;
 const tileId=[...candidates].sort((a,b)=>order.indexOf(terrainKind(s,s.tiles[a]))-order.indexOf(terrainKind(s,s.tiles[b]))||a.localeCompare(b))[0];
 if(!tileId)return null;
 const terrain=terrainKind(s,s.tiles[tileId]);
 return {tileId,reason:['farm','tuntian'].includes(kind)&&terrain==='riverside'?'강가 평지라 기본 식량 +1':kind==='workshop'&&['hill','forest'].includes(terrain)?'구릉·숲의 생산에 알맞음':`${{plain:'평지',riverside:'강가 평지',hill:'구릉',forest:'숲',mountain:'산'}[terrain]}의 빈 영향권 칸`};
}
export function domesticEngineView(s,c,{rates,foodNeed,sites,specialists}){
 // v3: the current (old) city screen still reads governorSlot/departments as slot objects — derive them from v3 seats
 // (농지 → agriculture · 시장 → commerce · 훈련소 → military) until the v3 screen replaces it (플레이 점검 02 P1).
 if(domesticV3Enabled(s)){const seatOf={agriculture:'farm',commerce:'market',military:'trainingGround'},stateOf=id=>{const o=s.officers[id];return !o?'빈 칸':domesticOfficerPresent(s,c,id)?'근무 중':o.locationRef?.kind==='ARMY'?'출진 중':'부재 중';};
  const v3Slots=Object.fromEntries(Object.entries(DEPARTMENTS).map(([kind,meta])=>{const id=c.domesticSeats?.[seatOf[kind]]??null;return [kind,{...meta,officerId:id,bonus:0,state:stateOf(id),previews:[]}];}));
  const gid=c.governorId??c.absentGovernorId??null;
  return {governorSlot:{officerId:gid,state:stateOf(gid)},departments:v3Slots,...v3DomesticView(s,c),people:c.people,territory:[...c.territory],peopleCapacity:rates.capacity,granary:s.factions[c.ownerFactionId].granary,treasury:s.factions[c.ownerFactionId].treasury,units:rates.units,influence:cityInfluence(s,c),facilitySites:sites,nextProduction:structuredClone(c.nextProduction),foodLedger:{incoming:(c.economyCauses??[]).filter(e=>e.resource==='food'&&e.amount>0),outgoing:(c.economyCauses??[]).filter(e=>e.resource==='food'&&e.amount<0),net:(c.economyCauses??[]).filter(e=>e.resource==='food').reduce((n,e)=>n+e.amount,0),forecastNet:rates.food-foodNeed}};}
 const causes=structuredClone(c.economyCauses??[]),food=causes.filter(e=>e.resource==='food');
 const net=food.reduce((n,e)=>n+e.amount,0),forecastNet=rates.food-foodNeed;
 const slots=Object.fromEntries(Object.entries(DEPARTMENTS).map(([kind,meta])=>{const id=c.departments?.[kind]??null,o=s.officers[id];return [kind,{...meta,officerId:id,bonus:domesticOfficerPresent(s,c,id)?departmentBonus(o,kind):0,state:!o?'빈 칸':domesticOfficerPresent(s,c,id)?'근무 중':o.locationRef?.kind==='ARMY'?'출진 중':'부재 중',previews:Object.values(s.officers).filter(o=>domesticOfficerPresent(s,c,o.officerId)).map(o=>({officerId:o.officerId,bonus:departmentBonus(o,kind),label:`이 장수면 +${departmentBonus(o,kind)}`}))}];}));
 const governorId=c.governorId??c.absentGovernorId??null;
 return {governorSlot:{officerId:governorId,state:!governorId?'빈 칸':domesticOfficerPresent(s,c,governorId)?'근무 중':s.officers[governorId]?.locationRef?.kind==='ARMY'?'출진 중':'부재 중'},departments:slots,autoDepartments:c.autoDepartments,domesticPolicy:c.domesticPolicy,policyName:CITY_POLICIES[c.domesticPolicy??'balanced'].name,
  policyEffects:['영향권 칸 우선순위',`다음 전문인력: ${{artisan:'기술자',scholar:'학자',logistician:'병참',official:'관료'}[specialists.nextSpecialist]}`,c.domesticPolicy==='delegated'?'생산 자동 선택':'생산 직접 선택'],
  influence:cityInfluence(s,c),nextProduction:structuredClone(c.nextProduction),foodPriority:c.foodPriority,
  foodLedger:{incoming:food.filter(e=>e.amount>0),outgoing:food.filter(e=>e.amount<0),net,forecastNet,turnsUntilEmpty:forecastNet<0?Math.ceil(Math.max(0,c.foodStock-(c.reservedResources?.food??0))/-forecastNet):null},
  specialistFormation:{state:'형성 중',approximateTurns:specialists.specialistTurnsLeft,nextKind:specialists.nextSpecialist,effects:{artisan:'1명당 생산 +1',scholar:'1명당 과학 +1',logistician:'1명당 식량 +1',official:'1명당 산출 +5% · 점령 -1차례'}},
  facilitySites:sites};
}
export function validateDomesticEngine(s){
 if(!domesticEngineEnabled(s))return;
 if(!Array.isArray(s.officerTransfers))throw new Error('INVALID_OFFICER_TRANSFERS');
 const moving=new Set();
 for(const t of s.officerTransfers){
  if(!t||!s.officers[t.officerId]||!s.factions[t.factionId]||!s.cities[t.fromCityId]||!s.cities[t.toCityId]||!Number.isSafeInteger(t.departureTurn)||!Number.isSafeInteger(t.arrivalTurn)||t.arrivalTurn<=t.departureTurn||!['MOVING','BLOCKED','ARRIVED','CANCELLED'].includes(t.state))throw new Error('INVALID_OFFICER_TRANSFER_STATE');
  if(['MOVING','BLOCKED'].includes(t.state)){const o=s.officers[t.officerId];if(moving.has(t.officerId)||o.travelState!=='TRAVELLING'||o.locationRef.kind!=='NONE')throw new Error('INVALID_OFFICER_TRANSFER_ASSIGNMENT');moving.add(t.officerId);}
 }
 const assigned=new Set(Object.values(s.cities).flatMap(c=>[c.governorId,c.absentGovernorId]).filter(Boolean));
 for(const c of Object.values(s.cities)){
  if(!(domesticV3Enabled(s)&&c.domesticPolicy==null)&&!Object.hasOwn(CITY_POLICIES,c.domesticPolicy)||typeof c.autoDepartments!=='boolean'||typeof c.foodPriority!=='boolean'||Object.keys(c.departments??{}).sort().join(',')!=='agriculture,commerce,military')throw new Error('INVALID_DOMESTIC_CITY');
  if(c.absentGovernorId!==null&&c.absentGovernorId!==undefined&&(!s.officers[c.absentGovernorId]||c.governorId))throw new Error('INVALID_ABSENT_GOVERNOR');
  if(c.nextProduction!==null&&(!c.nextProduction||typeof c.nextProduction.kind!=='string'||c.nextProduction.kind==='muster'))throw new Error('INVALID_CITY_RESERVATION');
  for(const id of Object.values(c.departments)){if(id===null)continue;if(!s.officers[id]||assigned.has(id))throw new Error('INVALID_DOMESTIC_ASSIGNMENT');assigned.add(id);}
 }
}
