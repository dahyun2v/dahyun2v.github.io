import {rumorActive,STRATAGEMS} from './campaign-stratagems.mjs';
import C195 from '../data/c195-trial-v0.1.json' with {type:'json'};
import {specialSupportAvailable} from './campaign-special-troops.mjs';
import {injuryReason} from './campaign-injury.mjs';
import {C184,domesticEngineEnabled,initializeDomesticEngine,autoFillDepartments,departmentOutput,domesticOfficerPresent,cityInfluence,facilitySite} from './campaign-domestic.mjs';
import {citySupplyRoute} from './campaign-supply.mjs';
import {initializeAchievements,recordAchievementEvent,settleAchievements,achievementCityFactor} from './campaign-achievements.mjs';
import {campaignScenario} from './campaign-scenario.mjs';
import {supplyEnabled,settleSupply,armyFoodPerTurn,supplyLink,supplyAiLaunchFood,foodModel,clockFood,troopFoodRate,baseCityFood} from './campaign-supply.mjs';
import {relationsEnabled,relationSecurity,relationProduction,relationJobComplete} from './campaign-relations.mjs';
import {c34Recovery,c34Cost,c34Security,c34Shortage} from './campaign-c34.mjs';
import {c33Governor,c33DomesticOutput,c33MusterCost} from './campaign-rule-registry.mjs';
import {c31Production,c31Muster} from './campaign-events.mjs';
import {c30CityOutput,c30Settle,c30MusterDiscount,c30MusterBonus} from './campaign-c29.mjs';
import {c29Recovery,c29Aw} from './campaign-c29.mjs';
import {c28RecoveryFactor,c28Enabled} from './campaign-career.mjs';
import {domesticRule,domesticOutput,domesticFacilityCost,domesticBeforeSettlement,domesticAfterSettlement,domesticJobCompleted,domesticSecurityCauses,domesticSupport,domesticBeginGranaries,domesticFinishGranaries,runDomestic} from './campaign-rule-registry.mjs';
import {C24,specialTroop,SPECIAL_TROOPS,parentTroop} from './campaign-special-troops.mjs';
import {C23} from './campaign-abilities.mjs';
// C21 trial values: automatic city institutions, no allocation slots or cap.
import {campaignSubAbility} from './campaign-abilities.mjs';
export const C21=Object.freeze({period:3,artisanProduction:1,scholarScience:1,logisticianFood:1,officialRate:.05,occupationReduction:1,minOccupationTurns:1,governorXp:5,captureRetention:.5});
export const SPECIALIST_NAMES=Object.freeze({artisan:'기술자',official:'관료',scholar:'학자',logistician:'병참'});
export const c21Enabled=s=>['v2','v3'].includes(s.mapId);
export function validateSpecialists(s){
 if(!c21Enabled(s))return;
 for(const c of Object.values(s.cities)){
  if(c.specialists!==undefined&&(!c.specialists||Object.keys(c.specialists).sort().join(',')!=='artisan,logistician,official,scholar'||Object.values(c.specialists).some(n=>!Number.isSafeInteger(n)||n<0)))throw new Error('INVALID_CAMPAIGN_SPECIALISTS');
  if(c.specialistSettlements!==undefined&&(!Number.isSafeInteger(c.specialistSettlements)||c.specialistSettlements<0||c.specialistSettlements>=C21.period))throw new Error('INVALID_CAMPAIGN_SPECIALIST_SETTLEMENTS');
 }
}
export function initializeSpecialists(s,c){if(!c21Enabled(s))return;c.specialists??={artisan:0,official:0,scholar:0,logistician:0};c.specialistSettlements??=0;}
export function specialistGovernor(s,c){const o=s.officers[c.governorId];return o?.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.allegianceFactionId===c.ownerFactionId&&o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId?o:null;}
export function specialistChoice(s,c){const o=specialistGovernor(s,c),policy=domesticEngineEnabled(s)?{agriculture:'logistician',commerce:'artisan',military:'official'}[c.domesticPolicy]:null;if(policy)return {kind:policy,axis:'성 방침',officerId:o?.officerId??null};if(!o)return {kind:'artisan',axis:null,officerId:null};const axes=['행정','병참','인사','제도','민정'];const axis=axes.reduce((best,key)=>campaignSubAbility(s,o.officerId,'정무',key)>campaignSubAbility(s,o.officerId,'정무',best)?key:best,axes[0]);return {kind:{행정:'official',병참:'logistician',인사:'official',제도:'scholar',민정:'artisan'}[axis],axis,officerId:o.officerId};}
export function specialistView(s,c){return {specialists:structuredClone(c.specialists),specialistTurnsLeft:C21.period-(c.specialistSettlements??0),nextSpecialist:specialistChoice(s,c).kind,...(c.specialistCapture?{specialistCapture:structuredClone(c.specialistCapture)}:{})};}
export function settleSpecialists(s,c,isNormal){if(!c21Enabled(s)||!isNormal||c.ownerFactionId===null)return;initializeSpecialists(s,c);if(++c.specialistSettlements<C21.period)return;c.specialistSettlements=0;const pick=specialistChoice(s,c);c.specialists[pick.kind]++;s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:c.ownerFactionId,text:`${s.cityDisplayNames?.[c.cityId]??c.name}: ${SPECIALIST_NAMES[pick.kind]} 1명 늘어남${pick.officerId?`(태수 ${s.officers[pick.officerId].name} · ${pick.axis})`:''}`});if(pick.officerId){creditCampaignDomestic(s,{officerId:pick.officerId,eventId:`C25.SPECIALIST.${s.turn}.${c.cityId}`,kind:'SPECIALIST_GROWN',counts:{[`specialist:${pick.kind}`]:1},amount:0});creditCampaignGrowth(s,{eventId:`C21.${s.turn}.${c.cityId}`,officerId:pick.officerId,kind:'GOVERNOR_TURN',amount:C21.governorXp});s.xpEvents.push({eventId:`C21.${s.turn}.${c.cityId}`,officerId:pick.officerId,kind:'GOVERNOR_TURN',amount:C21.governorXp});}}
export function transferSpecialists(s,c,owner){if(!c21Enabled(s)||c.ownerFactionId===owner)return;initializeSpecialists(s,c);const before=structuredClone(c.specialists);for(const key of Object.keys(SPECIALIST_NAMES))c.specialists[key]=Math.floor(c.specialists[key]*C21.captureRetention);c.specialistSettlements=0;c.specialistCapture={turn:s.turn,formerOwnerFactionId:c.ownerFactionId,ownerFactionId:owner,before,remaining:structuredClone(c.specialists)};s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:owner,text:`${s.cityDisplayNames?.[c.cityId]??c.name}: 전문인력 잔류 · ${Object.entries(c.specialists).map(([k,n])=>`${SPECIALIST_NAMES[k]} ${n}`).join(' · ')}`});}
export function specialistOccupationTurns(s,c,turns){return c21Enabled(s)&&c.specialists?.official>0?Math.max(C21.minOccupationTurns,turns-C21.occupationReduction):turns;}
export function specialistOutput(s,c,raw){if(!c21Enabled(s))return [];const n=c.specialists??{},causes=[];for(const [kind,resource,unit] of [['artisan','production',C21.artisanProduction],['scholar','science',C21.scholarScience],['logistician','food',C21.logisticianFood]]){const amount=(n[kind]??0)*unit;raw[resource]+=amount;if(amount)causes.push({resource,label:`전문인력 ${SPECIALIST_NAMES[kind]} ${n[kind]}: ${ {production:'생산',science:'학문',food:'식량'}[resource]} +${amount}`,amount});}if(n.official)for(const resource of Object.keys(raw)){const amount=raw[resource]*n.official*C21.officialRate;raw[resource]+=amount;causes.push({resource,label:`전문인력 관료 ${n.official}: ${ {food:'식량',production:'생산',science:'학문',prestige:'인망'}[resource]} +${n.official*C21.officialRate*100}%`,amount});}return causes;}

import {C20,C20_FACILITIES,c20Enabled,initializeCampaignPolicy,uniqueFacilityReason,activeUnique,settlePolicyRefugees} from './campaign-policy.mjs';
import {officerTroopTypes,sortie,musterReason,completeMuster,C19,c19Enabled,researchStage,cityPopulationCapacity,syncResearchCities,settleCampaignResearch} from './campaign-roster.mjs';
import {uniqueDomestic,uniqueProgress,uniqueHoldLand,uniqueGovernor,uniqueSupply,uniqueSettlement,uniqueMusterCost,uniqueMusterFactor,domesticMusterAvailable} from './campaign-rule-registry.mjs';
import {effectModifiers} from './campaign-effects.mjs';
import {settleOccupationCity} from './campaign-occupation.mjs';
import {createCitySettlementState, settleCityTurn} from './city-settlement.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {validatePersonnelLedger, recoverWoundedPersonnel, dispatchPersonnelTransport, arrivePersonnelTransport} from './military-personnel-ledger.mjs';
import {createTransportCapacity, reserveTransportCapacity} from './military-capacity.mjs';

export const CITY_JOBS = Object.freeze({
  tuntian:{get name(){return C20_FACILITIES.tuntian.name;},get cost(){return C20.facilityCost;}},clinic:{get name(){return C20_FACILITIES.clinic.name;},get cost(){return C20.facilityCost;}},mufu:{get name(){return C20_FACILITIES.mufu.name;},get cost(){return C20.facilityCost;}},
  muster:{name:'출진',get cost(){return C19.musterCost;}}, workshop:{name:'공방',get cost(){return C19.workshopCost;}},
  recruit: {name:'모집', cost:15}, reorganize:{name:'재편', get cost(){return C23.reorganizeCost;}},
  farm:{name:'농지',cost:10}, granary:{name:'곡창',cost:20},
  repair:{name:'수리',cost:5}, market:{name:'시장',cost:20}, barracks:{name:'병영',cost:24},
});
const round = n => Math.round(n);
const nearby = (s,c,a) => hexDistance(s.tiles[c.tileId],s.tiles[a.tileId]) <= 2;
export const cityOccupationStatus = (s,c) => s.occupations?.[c.cityId]?.state ??
  (c.occupationState === 'TEMPORARY_OCCUPATION' ? 'OCCUPIED' : 'NORMAL');
const normal = (s,c) => cityOccupationStatus(s,c) === 'NORMAL';
const ownFormation = (s,f,c) => s.armies[f.formationId]?.factionId === c.ownerFactionId;
const lotFaction = (s,l) => s.economy?.lotFaction?.[l.lotId] ??
  s.armies[l.originFormationId]?.factionId ?? s.cities[l.nodeId]?.ownerFactionId;

// Trial field rates: 50 replacements and 25 recovered wounded per army/turn.
export const C174_FIELD=Object.freeze({replenish:50,recovery:25});
function fieldAccess(s,c,a){
 if(!supplyEnabled(s)||!a||!castleArmyActive(s,a)||a.factionId!==c.ownerFactionId||c.besieged)return false;
 const link=supplyLink(s,a);if(link.state!=='SAFE')return false;
 if(link.sourceCityId)return link.sourceCityId===c.cityId;
 // A connected hub may relay personnel only from a city with an open route.
 return supplyLink(s,a,a.tileId,{hubIds:new Set(),limit:Object.keys(s.tiles).length}).sourceCityId===c.cityId;
}
export function cityProductionIdle(s,c){
 if(s.gameResult||!c||c.ownerFactionId===null||!normal(s,c)||c.currentProduction)return false;
 const left=Math.max(0,27-s.turn);if(!left)return false;
 return cityJobList(s,c).some(j=>{
  if(j.blockedReason||j.kind==='reorganize')return false;
  const estimate=campaignAiJobForecast(s,c,j.kind,{progress:c.jobProgress?.[j.kind]??0});
  if(j.kind==='recruit'&&campaignMobilization(s,c.ownerFactionId).used+estimate.troops>campaignMobilization(s,c.ownerFactionId).capacity)return false;
  return estimate.turns!==null&&estimate.turns<=left;
 });
}

export function initializeCampaignEconomy(s) {
  // xpEvents is display-only; 120 is a trial history cap, not the XP source ledger.
  initializeCampaignPolicy(s);
  initializeDomesticEngine(s);
  initializeAchievements(s);
  s.xpEvents ??= [];
  if(c19Enabled(s))s.economyMigration??={lastTurns:{},handledTurns:{},recent:[],total:0};
  s.economy ??= {lastSettledTurn:null, readyAt:{}, occupationStatus:{}};
  s.economy.lotFaction ??= {};
  s.economy.recruitedReady ??= {};
  for (const c of Object.values(s.cities)) {
    initializeSpecialists(s,c);
    c.facilities ??= [];
    c.jobProgress ??= {};
    c.production ??= 0;
    c.outputCarry ??= {food:0,production:0,science:0,prestige:0};
    c.growthProgress ??= 0;
    c.economyCauses ??= [];
    c.securityLevel ??= 0;
    c.securityCauses ??= [];
  }
  if(c19Enabled(s)&&!s.economy.c19Version){
    for(const f of Object.values(s.factions))f.research??={stage:0,reachedTurns:[]};
    syncResearchCities(s);s.economy.c19Version=1;
  }
  return s;
}

export function cityJobCost(s,c,kind,troopType=c.currentProduction?.troopType){return Math.max(0,c34Cost(s,c,['farm','granary','market','barracks','workshop','tuntian','clinic','mufu'].includes(kind)?'facility':kind,c33MusterCost(s,c,kind,troopType,uniqueMusterCost(s,c,kind,troopType,domesticFacilityCost(s,c,kind,(kind==='muster'&&researchStage(s,c.ownerFactionId)>=3?C19.supplyMusterCost:CITY_JOBS[kind].cost)+(kind==='muster'&&specialTroop(s,troopType)&&troopType==='hubao'?C24.hubaoProduction:0))))-(kind==='muster'?c30MusterDiscount(s,c.ownerFactionId):0)));}
export function cityJobReason(s,c,kind){
 const unique=uniqueFacilityReason(s,c,kind);if(unique)return unique;
 if(kind==='workshop'){
  if((!c19Enabled(s)||researchStage(s,c.ownerFactionId)<1)&&!(c.ownerFactionId==='F01'&&s.c20?.unlocks.some(u=>u.kind===kind&&u.cityIds.includes(c.cityId))))return '연구 1단계 — 공방 필요';
  if(c.facilities.filter(f=>f.kind===kind).length>=C19.workshopLimit)return '공방은 도시당 최대 2개입니다.';
 }
 if(c.kind==='minor'&&['farm','granary','market','barracks','repair','workshop'].includes(kind)&&(!c19Enabled(s)||['farm','barracks'].includes(kind)))return 'MINOR_CITY_NO_FACILITIES';
 if(kind==='repair'&&!c.facilities.some(f=>f.damaged))return 'NO_DAMAGED_FACILITY';
 if(kind==='farm'&&c.facilities.filter(f=>f.kind===kind).length>=2)return '농지는 도시당 최대 2개입니다.';
 if(['farm','granary','market','barracks','workshop',...Object.keys(C20_FACILITIES)].includes(kind)&&!facilityTiles(s,c).length)return '시설을 지을 칸이 없습니다.';
 if(c19Enabled(s)&&!normal(s,c))return '점령 중 생산·모집 중단';
 return null;
}
export function cityJobList(s,c){return Object.entries(CITY_JOBS).filter(([kind])=>kind!=='muster'&&(c20Enabled(s)||!C20_FACILITIES[kind])).map(([kind,job])=>({kind,name:job.name,...(C20_FACILITIES[kind]?{description:C20_FACILITIES[kind].description}:{}),cost:cityJobCost(s,c,kind),blockedReason:cityJobReason(s,c,kind)}));}

export function facilityTiles(s,c) {
  const occupied = new Set(Object.values(s.cities).flatMap(city =>
    [city.tileId,...(city.footprint?.gates??[]),...(city.footprint?.walls??[]),...(city.facilities??[]).map(f=>f.tileId)]));
  if(domesticEngineEnabled(s))return cityInfluence(s,c).tiles.filter(t=>!['water'].includes(t.terrain)&&!occupied.has(t.tileId)).map(t=>t.tileId);
  return Object.values(s.tiles).filter(t => hexDistance(s.tiles[c.tileId],t) === 2 &&
    !['mountain','water'].includes(t.terrainType) && !occupied.has(t.tileId))
    .map(t=>t.tileId).sort((a,b)=>a.localeCompare(b,'en'));
}

export function facilityDisabled(s,c,f) {
  return !!f.damaged || Object.values(s.armies).some(a => castleArmyActive(s,a) &&
    a.factionId !== c.ownerFactionId && a.tileId === f.tileId);
}

export function cityEconomyRates(s,c,{shortage=null,commit=false}={}) {
  const governor = s.officers[c.governorId];
  const eligible = governor?.lifeState === 'ALIVE' && governor.captivityState === 'FREE' &&
    governor.allegianceFactionId === c.ownerFactionId && !injuryReason(s,governor.officerId)&&(!domesticEngineEnabled(s)||domesticOfficerPresent(s,c,c.governorId));
  const bonus = eligible ? Math.max(0,Math.min(100,governor.baseStats?.politics??governor.stats?.politics??0))/500 : 0;
  const active = (c.facilities??[]).filter(f=>!facilityDisabled(s,c,f));
  const count = kind => active.filter(f=>f.kind===kind).length;
  const multiplier = 1+bonus;
  const boundSecurity=relationSecurity(s,injuryReason(s,c.governorId)?{...c,governorId:null}:c);
  const security=[1,.75,.5][domesticRule(s,c,'MARTIAL_LAW')?0:boundSecurity.securityLevel];
  const output=resource=>eligible?Math.max(0,1+effectModifiers(s,c.cityId,['TURN_SETTLE'],{cityId:c.cityId,resource,sources:[{id:c.governorId,whens:['TURN_SETTLE']}]}).CITY_OUTPUT_MOD/100):1;
  const scale=c.kind==='minor'?.5:1;
  const population=c19Enabled(s)?Math.max(0,c.population-C19.populationBase):0;
  const influence=domesticEngineEnabled(s)?cityInfluence(s,c):null,department=departmentOutput(s,c);
  const baseFood=influence?influence.food*baseCityFood(s)/4:scale*(baseCityFood(s)+2*Math.min(2,count('farm')))+C19.populationFood*population;
  const foodRaw=(influence?0:activeUnique(s,c,'tuntian')?C20.tuntianFood:0)+(baseFood+department.food)*multiplier*output('FOOD')*(c19Enabled(s)?security:1);
  const specialistFood=s.mapId==='v2'||s.mapId==='v3'?(foodRaw+(c.specialists?.logistician??0)*C21.logisticianFood)*(1+(c.specialists?.official??0)*C21.officialRate):foodRaw;
  shortage??=c.foodStock-c.reservedResources.food+((normal(s,c)||c19Enabled(s))?Math.floor(specialistFood*(rumorActive(s,c)?STRATAGEMS.kinds.find(k=>k.id==='RUMOR').effect.outputMult:1)+(c.outputCarry?.food??0)+1e-9):0)<campaignFoodNeed(s,c);
  const penalty=Math.min(security,shortage?c34Shortage(s,c):1);
  const raw={food:foodRaw,
    production:(c20Enabled(s)&&c.starProductionTurn===s.turn?C20.production:0)+((influence?influence.production:scale*2+C19.populationProduction*population+(c19Enabled(s)?count('workshop')*C19.workshopProduction:0))+department.production)*multiplier*output('PRODUCTION')*penalty,
    science:(scale+C19.populationScience*population)*multiplier*output('SCIENCE')*penalty,
    prestige:(scale*(1+count('market'))+department.prestige)*multiplier*output('FAME')*penalty};
  const specialistCauses=specialistOutput(s,c,raw);
  specialistCauses.push(...department.causes.filter(e=>['food','production','prestige'].includes(e.resource)));
  specialistCauses.push(...domesticOutput(s,c,raw,{commit}));c33DomesticOutput(s,c,raw);
  specialistCauses.push(...uniqueDomestic(s,c,raw,{commit}));
  if(!injuryReason(s,c.governorId))c30CityOutput(s,c,raw);raw.production*=c31Production(s,c.ownerFactionId);
  const relationOutput=relationProduction(s,c),relationAmount=raw.production*(relationOutput.factor-1);raw.production*=relationOutput.factor;
  if(relationOutput.lines.length)specialistCauses.push({resource:'production',label:relationOutput.lines[0],amount:relationAmount});
  if(c19Enabled(s)&&!normal(s,c)&&!(c.besieged&&uniqueHoldLand(s,c)))for(const key of ['production','science','prestige'])raw[key]*=s.occupations?.[c.cityId]?.classRetention ? .5 : 0;
  raw.food*=achievementCityFactor(s,c,'food');
  if(rumorActive(s,c))for(const resource of ['food','production']){const amount=raw[resource]*(STRATAGEMS.kinds.find(k=>k.id==='RUMOR').effect.outputMult-1);raw[resource]+=amount;specialistCauses.push({resource,label:'유언비어 · 산출 감소',amount});}
  const rounded=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,Math.floor(value+(c.outputCarry?.[key]??0)+1e-9)]));
  if(commit)c.outputCarry=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,!normal(s,c)&&key!=='food'?(c.outputCarry?.[key]??0):Math.max(0,value+(c.outputCarry?.[key]??0)-rounded[key])]));
  return {bonus,...rounded,raw,...(relationsEnabled(s)?boundSecurity:{}),...(s.mapId!=='v1'?{specialistCauses:specialistCauses.filter(e=>normal(s,c)||e.resource==='food')} :{}),capacity:80+80*count('granary'),workBonus:count('barracks') ? 0.1 : 0};
}

export function campaignMobilization(s,factionId) {
  const capacity = Object.values(s.cities).filter(c=>c.ownerFactionId===factionId&&normal(s,c))
    .reduce((n,c)=>n+c.population*1000,0);
  const used = s.personnel.formations.filter(f=>s.armies[f.formationId]?.factionId===factionId).reduce((n,f)=>n+f.field,0) +
    s.personnel.lots.filter(l=>lotFaction(s,l)===factionId).reduce((n,l)=>n+l.count,0) +
    s.personnel.transports.filter(t=>t.status==='IN_TRANSIT'&&lotFaction(s,s.personnel.lots.find(l=>l.lotId===t.sourceLotId))===factionId).reduce((n,t)=>n+t.count,0);
  return {capacity,used};
}

// C143: read-only estimates for AI decisions; settlement and costs stay above.
export function campaignAiJobForecast(s,c,kind,{troopType=null,progress=0}={}) {
  const rates=cityEconomyRates(s,c),cost=cityJobCost(s,c,kind,troopType);
  const factor=!['muster','recruit','reorganize','repair'].includes(kind)?achievementCityFactor(s,c,'production'):1;
  const speed=round((kind==='muster'?c31Muster(s,c.ownerFactionId):1)*
    (c29Aw(s,c.governorId,'AW_TT-V02')&&!['muster','recruit','reorganize','repair'].includes(kind)?1.15:1)*
    uniqueProgress(s,c,rates.production*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1)))*factor;
  const advance=c.c33?.advanceProduction??0;
  return {cost,speed,turns:speed>0?Math.max(1,Math.ceil(Math.max(0,cost-progress-advance-(factor>1?c.c44BuildCarry??0:0))/speed)):null,
    troops:kind==='recruit'?(c33Governor(s,c,'VOLUNTEERS')&&(c.securityLevel??0)===0?650:500):0};
}

export function campaignAiFoodBudget(s,factionId,turns,extraTroops=0) {
  const cities=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId);
  const stock=cities.reduce((n,c)=>n+Math.max(0,c.foodStock-c.reservedResources.food),0);
  const income=cities.reduce((n,c)=>n+cityEconomyRates(s,c).food,0);
  // C45 charges field upkeep through supply rather than campaignFoodNeed.
  const fieldNeed=supplyEnabled(s)&&!clockFood(s)?Object.values(s.armies).filter(a=>a.factionId===factionId&&castleArmyActive(s,a)).reduce((n,a)=>n+armyFoodPerTurn(a,s),0):0;
  const need=cities.reduce((n,c)=>n+campaignFoodNeed(s,c),0)+fieldNeed+(clockFood(s)?0:extraTroops*troopFoodRate(s)/1000);
  return {stock,income,need,fieldNeed,turns,balance:stock+turns*income-turns*need};
}

// C143b: run the existing settlement on a disposable, public supply world.
// Enemy stock, output, personnel and unobserved blockers cannot enter the read.
export function campaignAiFoodForecast(s,factionId,publicWorld){
 const ownCities=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId);
 if(!ownCities.length)return {};
 const copy=structuredClone(s),template=ownCities[0];
 copy.cities=Object.fromEntries(Object.values(publicWorld.cities).map(c=>[c.cityId,c.ownerFactionId===factionId?structuredClone(s.cities[c.cityId]):{...structuredClone(template),...c,governorId:null,foodStock:0,reserveTroops:0,facilities:[],currentProduction:null}]));
 copy.armies=structuredClone(Object.fromEntries(Object.entries(s.armies).filter(([,a])=>a.factionId===factionId)));
 // Public foreign presences preserve occupied farms and diplomacy-aware
 // blockers. Disposable carry keeps these probes active for one settlement;
 // neither foreign stores nor unobserved formations are read or charged.
 for(const a of Object.values(publicWorld.armies).filter(a=>a.factionId!==factionId&&a.troopCount>0))copy.armies[a.armyId]={...structuredClone(a),hp:1,supplyInitialized:true,supplyFood:supplyAiLaunchFood(s,template,a.troopCount).full};
 copy.tiles=structuredClone(publicWorld.tiles);
 if(copy.supply){copy.supply.hubs=copy.supply.hubs.filter(h=>h.factionId===factionId);copy.supply.pending=Object.fromEntries(Object.entries(copy.supply.pending).filter(([,p])=>p.factionId===factionId));}
 copy.turn++;copy.turnNumber=copy.turn;copy.globalTick+=copy.time.ticksPerTurn;copy.currentDate+=10;
 settleCampaignEconomy(copy);
 const result={};
 for(const c of ownCities){
  const expenses=new Set(['시민 유지','군량','성장 소비','지원','유지비 미지급','보관 한도 초과','보급 거점 채움','보급 거점 첫 재고']);
  const after=copy.cities[c.cityId],income=(after.economyCauses??[]).filter(e=>e.resource==='food'&&!expenses.has(e.label)&&!/^군량\(|^출진 군량\(/.test(e.label)).reduce((n,e)=>n+e.amount,0),municipalNeed=campaignFoodNeed(copy,after);
  const attached=Object.values(copy.armies).filter(a=>a.factionId===factionId&&castleArmyActive(copy,a)&&supplyEnabled(copy)&&!clockFood(copy)&&supplyLink(copy,a).sourceCityId===c.cityId);
  // Forecast losses never make the budget look cheaper. DISRUPTED sources
  // pay half; the rest is drawn from the army's carried stock by the same rule.
  const fieldNeed=attached.reduce((n,a)=>n+armyFoodPerTurn({...a,troopCount:Math.max(a.troopCount,s.armies[a.armyId]?.troopCount??0)},copy)*(supplyLink(copy,a).state==='DISRUPTED'?.5:1),0);
  const sourceCharge=(after.economyCauses??[]).filter(e=>e.resource==='food'&&e.amount<0&&(/^군량\(/.test(e.label)||e.label==='보급 거점 채움'||e.label==='보급 거점 첫 재고')).reduce((n,e)=>n-e.amount,0);
  const stock=Math.max(0,c.foodStock-c.reservedResources.food),nextStock=Math.max(0,after.foodStock-after.reservedResources.food),delta=nextStock-stock;
  const net=income-municipalNeed-fieldNeed,depletion=Math.max(0,-net,-delta);
  result[c.cityId]={cityId:c.cityId,stock,nextStock,income,municipalNeed,fieldNeed,sourceCharge,need:municipalNeed+fieldNeed,net,delta,depletion,runway:depletion>0?nextStock/depletion:null,projectedRecruitCompleted:c.currentProduction?.kind==='recruit'&&after.currentProduction?.kind!=='recruit',armyIds:attached.map(a=>a.armyId),starvingArmyIds:attached.filter(a=>a.supplyStarving).map(a=>a.armyId)};
 }
 return result;
}

export function campaignAiMusterFood(s,c,troopType){
 const bonus=(c20Enabled(s)&&c.ownerFactionId==='F03'?c.starMusterBonus??0:0)+c30MusterBonus(s,c.ownerFactionId,troopType),available=domesticMusterAvailable(s,c);
 const base=Math.min(available,500+bonus),raw=specialTroop(s,troopType)?troopType==='wudang'?C24.wudangCount:troopType==='qingzhou'?Math.floor((500+bonus)*C24.qingzhouCount):troopType==='hubao'?500+bonus+C24.hubaoReserve:base:base;
 const count=Math.min(available,Math.floor(raw*uniqueMusterFactor(s,c)));
 return {count,...supplyAiLaunchFood(s,c,count)};
}

// Neutral setup is public. Read its recurring civilian surplus from the same
// output/consumption functions, without sampling the current foreign city.
export function campaignAiNeutralFood(s,factionId,cityId,turns){
 const initial=campaignScenario(s.mapId).initialData.world.cities[cityId];
 if(!initial||initial.kind!=='minor'||initial.ownerFactionId!==null)return {stock:0,income:0,need:0,gain:0};
 const city={...structuredClone(initial),ownerFactionId:factionId};
 const copy={...s,occupations:{},armies:{},personnel:{...s.personnel,formations:[],lots:[],transports:[]}};
 const income=cityEconomyRates(copy,city).food,need=campaignFoodNeed(copy,city),stock=city.foodStock;
 return {stock,income,need,gain:stock/turns+Math.max(0,income-need)};
}

export function selectCityJob(s,{cityId,kind,armyId=null,troopType=null,officerId=null,troopCount},factionId=s.playerFactionId) {
  initializeCampaignEconomy(s);
  const c=s.cities[cityId];
  if (!c || c.ownerFactionId!==factionId || !CITY_JOBS[kind]) throw new Error('INVALID_CITY_JOB');
  // Compatibility entry for existing AI/council callers: same choice, immediate sortie.
  if(kind==='muster')return sortie(s,{cityId,officerId,troopType:troopType??undefined,troopCount},factionId);
  const blocked=cityJobReason(s,c,kind);if(blocked)throw new Error(blocked);
  if (kind==='reorganize') {
    const a=s.armies[armyId],o=s.officers[a?.commanderId];
    if (!a || !castleArmyActive(s,a) || a.factionId!==c.ownerFactionId || !nearby(s,c,a) ||
      SPECIAL_TROOPS[troopType] || !officerTroopTypes(o).includes(troopType)) throw new Error('INVALID_REORGANIZATION');
    // Wounded identity cannot be changed by reorganizing the field army.
    if (s.personnel.lots.some(l=>l.originFormationId===armyId&&l.count>0)) throw new Error('부상·복귀 인원이 있는 부대는 재편할 수 없습니다.');
  }
  if(kind==='muster'){const reason=musterReason(s,c,officerId,troopType);if(reason)throw new Error(reason);}
  const key=kind==='muster'?`${kind}:${officerId}:${troopType}`:kind==='reorganize'?`${kind}:${armyId}:${troopType}`:kind;
  c.currentProduction={kind,key,armyId,troopType,...(kind==='muster'?{officerId}:{})};
  c.productionProgress=c.jobProgress[key]??0;
  if(c.c26?.productionCarry){c.jobProgress[key]=c.productionProgress+c.c26.productionCarry;c.productionProgress=c.jobProgress[key];c.c26.productionCarry=0;}
  return s;
}
export function reserveCityJob(s,command,factionId=s.playerFactionId){
 initializeCampaignEconomy(s);const c=s.cities[command.cityId];
 if(!domesticEngineEnabled(s)||c?.ownerFactionId!==factionId)throw new Error('INVALID_CITY_RESERVATION');
 if(command.kind===null){c.nextProduction=null;return s;}
 if(!CITY_JOBS[command.kind]||command.kind==='muster')throw new Error('INVALID_CITY_RESERVATION');
 const probe=structuredClone(s);selectCityJob(probe,command,factionId);
 c.nextProduction={kind:command.kind,...(command.armyId?{armyId:command.armyId}:{}),...(command.troopType?{troopType:command.troopType}:{})};return s;
}
let domesticProduction,domesticProductionDepth=0;
export function configureDomesticProduction(selector){domesticProduction=selector;}
export function startDomesticProduction(s,c){
 if(!domesticEngineEnabled(s)||c.currentProduction||!normal(s,c)||!c.ownerFactionId)return;
 if(c.nextProduction){try{selectCityJob(s,{cityId:c.cityId,...c.nextProduction},c.ownerFactionId);c.nextProduction=null;}catch(e){c.jobBlocked=`예약: ${e.message}`;}return;}
 if(c.domesticPolicy==='delegated'&&domesticProduction&&domesticProductionDepth===0){
  domesticProductionDepth++;
  try{
  const sandbox=structuredClone(s);
  // The shared AI selector can first suggest immediate sorties. Simulate those
  // choices only in the sandbox until it reaches its production recommendation.
  const limit=Object.keys(s.officers).length+1;
  for(let i=0;i<limit;i++){const count=Object.keys(sandbox.armies).length;domesticProduction(sandbox,c.ownerFactionId);if(sandbox.cities[c.cityId].currentProduction||Object.keys(sandbox.armies).length===count)break;}
  const job=sandbox.cities[c.cityId].currentProduction;if(job&&job.kind!=='muster')selectCityJob(s,{cityId:c.cityId,...job},c.ownerFactionId);
  }finally{domesticProductionDepth--;}
 }
}

function cityPersonnel(s,c) {
  // An army stationed elsewhere is charged once, to its home city; visiting
  // armies are charged to the host city instead. Reserve/wounded lots stay local.
  const armies=Object.values(s.armies).filter(a=>a.troopCount>0);
  const stationed=a=>Object.values(s.cities).find(city=>city.ownerFactionId===a.factionId&&nearby(s,city,a));
  const field=armies.filter(a=>(stationed(a)?.cityId??s.personnel.formations.find(f=>f.formationId===a.armyId)?.nodeId)===c.cityId)
    .reduce((n,a)=>n+a.troopCount,0);
  const lots=s.personnel.lots.filter(l=>l.nodeId===c.cityId);
  return {field:supplyEnabled(s)?0:field,ready:lots.filter(l=>l.kind!=='WOUNDED'&&!l.identity?.specialTroopId).reduce((n,l)=>n+l.count,0),special:lots.filter(l=>l.kind!=='WOUNDED'&&l.identity?.specialTroopId).reduce((n,l)=>n+l.count,0),
    wounded:lots.filter(l=>l.kind==='WOUNDED').reduce((n,l)=>n+l.count,0)};
}

function replenish(s,c) {
  if(rumorActive(s,c)&&STRATAGEMS.kinds.find(k=>k.id==='RUMOR').effect.reserveRefill===false)return;
  const fieldUsed={};
  let capacity=createTransportCapacity({periodId:`EC.${s.turn}.${c.cityId}`,resources:[{resourceId:'local',capacity:campaignMobilization(s,c.ownerFactionId).used}]});
  for (const lot of s.personnel.lots.filter(l=>l.nodeId===c.cityId&&lotFaction(s,l)===c.ownerFactionId&&l.kind!=='WOUNDED'&&l.count>0&&
    (s.economy.readyAt[l.lotId]??0)<s.turn)) {
    for (const f of s.personnel.formations.filter(f=>ownFormation(s,f,c)&&
      castleArmyActive(s,s.armies[f.formationId])&&(nearby(s,c,s.armies[f.formationId])||fieldAccess(s,c,s.armies[f.formationId]))&&
      (lot.kind!=='RECOVERED'||lot.originFormationId===f.formationId)&&
      (JSON.stringify(f.identity)===JSON.stringify(lot.identity)||
        (s.economy.recruitedReady[lot.lotId]&&!lot.identity.specialTroopId&&(f.identity.specialTroopId===null||specialSupportAvailable(s,c,s.armies[f.formationId].troopType))))&&
      (!f.identity.specialTroopId||lot.kind==='RECOVERED'&&lot.originFormationId===f.formationId||specialSupportAvailable(s,c,s.armies[f.formationId].troopType))&&f.field<f.targetStrength)) {
      const count=Math.min(lot.count,f.targetStrength-f.field,nearby(s,c,s.armies[f.formationId])?Infinity:Math.max(0,C174_FIELD.replenish-(fieldUsed[f.formationId]??0)));
      if (!count) continue;
      const key=`EC.${s.turn}.${c.cityId}.${lot.lotId}.${f.formationId}`;
      let sourceLotId=lot.lotId;
      if(s.economy.recruitedReady[lot.lotId]&&!lot.identity.specialTroopId) {
        // Only qualified replacements receive the destination's trained identity.
        // Keep a distinct lot for ledger provenance; recovered people retain theirs.
        sourceLotId=`Allocated.${key}`;
        const source=s.personnel.lots.find(l=>l.lotId===lot.lotId);
        source.count-=count;
        s.personnel.lots.push({lotId:sourceLotId,kind:'READY',nodeId:c.cityId,
          identity:structuredClone(f.identity),originFormationId:null,count});
        s.economy.lotFaction[sourceLotId]=c.ownerFactionId;
      }
      // The local 1-tick handoff still consumes the shared capacity API and
      // completes a distinct departure/arrival; recruitment never fills Field.
      const current=s.personnel.formations.find(row=>row.formationId===f.formationId);
      const previousNode=current.nodeId,previousSupport=current.specialSupportAvailable;
      // New special replacements require a valid muster basis. FIRST3 admits
      // the formation's own recovered people independently of this support flag.
      if(specialTroop(s,s.armies[f.formationId].troopType))current.specialSupportAvailable=specialSupportAvailable(s,c,s.armies[f.formationId].troopType);
      current.nodeId=c.cityId;
      capacity=reserveTransportCapacity(capacity,{reservationId:key,payloadRef:key,loads:[{resourceId:'local',amount:count}]});
      const dispatched=dispatchPersonnelTransport({ledger:s.personnel,capacity},{operationId:`D.${key}`,expectedRevision:s.personnel.revision,
        transportId:key,sourceLotId:sourceLotId,destination:{type:'FORMATION',id:f.formationId},destinationNodeId:c.cityId,count,
        departureAt:s.globalTick-1,arrivalAt:s.globalTick,reservationId:key,authorizationRef:key},{canTransport:()=>true});
      capacity=dispatched.capacity;
      s.personnel=arrivePersonnelTransport(dispatched.ledger,{operationId:`A.${key}`,expectedRevision:dispatched.ledger.revision,
        transportId:key,now:s.globalTick,authorizationRef:key},{canArrive:()=>true}).ledger;
      Object.assign(s.personnel.formations.find(row=>row.formationId===f.formationId),{nodeId:previousNode,specialSupportAvailable:previousSupport});
      s.armies[f.formationId].troopCount+=count;
      if(c19Enabled(s))(s.economy.reinforcements??=[]).push({armyId:f.formationId,cityId:c.cityId,count,turn:s.turn});
      fieldUsed[f.formationId]=(fieldUsed[f.formationId]??0)+count;
      // Each transaction clones the ledger; refresh the remaining source count.
      lot.count=s.personnel.lots.find(l=>l.lotId===lot.lotId).count;
    }
  }
}

function recover(s,c,paid) {
  if (!paid || c.besieged || s.economy.combatCities?.[c.cityId]===s.turn-1 ||
    Object.values(s.armies).some(a=>castleArmyActive(s,a)&&a.factionId!==c.ownerFactionId&&nearby(s,c,a))) return;
  let recoveryBudget=c20Enabled(s)?(c33Governor(s,c,'MEDICINE')?1.3:1)*C20.recoveryPerTurn*(activeUnique(s,c,'clinic')?C20.clinicMultiplier:1):Infinity;
  const fieldUsed={};
  for (const l of s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.nodeId===c.cityId&&lotFaction(s,l)===c.ownerFactionId&&l.count>0)) {
    const a=s.armies[l.originFormationId];
    if(!c20Enabled(s)&&(!a||!nearby(s,c,a)))continue;
    // Existing C2 lots retain their home node. Do not treat a distant battle's
    // wounded as already evacuated to a safe city.
    const alive=a&&castleArmyActive(s,a),near=alive&&nearby(s,c,a),field=alive&&!near&&fieldAccess(s,c,a);
    if(a&&a.factionId!==c.ownerFactionId)continue;
    if(alive&&(!near&&!field)||!recoveryBudget)continue;
    const factor=alive?c29Recovery(s,a.armyId)*c28RecoveryFactor(s,a.armyId)*c34Recovery(s,a.armyId):1;
    const recoveryCount=Math.min(l.count,recoveryBudget,field?Math.max(0,C174_FIELD.recovery-(fieldUsed[a.armyId]??0)):Infinity,Math.floor(Math.min(l.count,recoveryBudget)*factor));if(!recoveryCount)continue;
    const key=`R.${s.turn}.${l.lotId}`;
    s.personnel=recoverWoundedPersonnel(s.personnel,{operationId:key,expectedRevision:s.personnel.revision,
      woundedLotId:l.lotId,recoveredLotId:key,count:recoveryCount,authorizationRef:key},
      {canRecover:()=>true,hasReturnRoute:()=>!!(near||field)}).ledger;
    s.economy.readyAt[key]=s.turn;
    s.economy.lotFaction[key]=c.ownerFactionId;
    const recovered=s.personnel.lots.find(l=>l.lotId===key)?.count??0;recoveryBudget-=recovered;
    if(a){fieldUsed[a.armyId]=(fieldUsed[a.armyId]??0)+recovered;if(c28Enabled(s))a.c28Recovered=(a.c28Recovered??0)+recovered;a.woundedCount=Math.max(0,a.woundedCount-recovered);}
    if(!alive)s.economy.recruitedReady[key]=true;
  }
}

function evacuateDestroyedWounded(s){
 if(!c20Enabled(s))return;
 for(const lot of [...s.personnel.lots])if(lot.kind==='WOUNDED'&&lot.count>0){
  const a=s.armies[lot.originFormationId];if(a&&castleArmyActive(s,a))continue;
  const factionId=lotFaction(s,lot),origin=s.tiles[a?.tileId]??s.tiles[s.cities[lot.nodeId]?.tileId];
  const city=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).sort((a,b)=>(origin?hexDistance(origin,s.tiles[a.tileId])-hexDistance(origin,s.tiles[b.tileId]):0)||a.cityId.localeCompare(b.cityId))[0];
  if(!city||lot.nodeId===city.cityId)continue;
  // Historical transports pin their source node: keep that empty provenance lot.
  if(s.personnel.transports.some(t=>t.sourceLotId===lot.lotId)){
   const lotId=`EVAC.${s.turn}.${lot.lotId}`;s.personnel.lots.push({...lot,lotId,nodeId:city.cityId});lot.count=0;s.economy.lotFaction[lotId]=factionId;
  }else {lot.nodeId=city.cityId;s.economy.lotFaction[lot.lotId]=factionId;}
 }
}

export function completeJob(s,c,rates,paid) {
  const job=c.currentProduction;
  if (!job) return;
  const advance=c.c33?.advanceProduction??0;if(advance){c.c33.advanceProduction=0;}
  if (job.kind==='recruit'&&!paid) return;
  const baseGain=round((job.kind==='muster'?c31Muster(s,c.ownerFactionId):1)*(c29Aw(s,c.governorId,'AW_TT-V02')&&!['muster','recruit','reorganize','repair'].includes(job.kind)?1.15:1)*uniqueProgress(s,c,c.production*(['recruit','reorganize'].includes(job.kind)?1+rates.workBonus:1)));
  const boost=!['muster','recruit','reorganize','repair'].includes(job.kind)?achievementCityFactor(s,c,'production')-1:0;
  const extra=boost?baseGain*boost+(c.c44BuildCarry??0):0,bonus=Math.floor(extra+1e-9);
  if(boost)c.c44BuildCarry=Math.max(0,extra-bonus);
  const gain=advance+baseGain+bonus;
  c.jobProgress[job.key]=round((c.jobProgress[job.key]??0)+gain);
  c.productionProgress=c.jobProgress[job.key];
  if (c.productionProgress<cityJobCost(s,c,job.kind)) return;
  const overflow=Math.max(0,c.productionProgress-cityJobCost(s,c,job.kind));
  if(job.kind==='muster'){if(!completeMuster(s,c,job))return;} else if (job.kind==='recruit') {
    const recruitCount=c33Governor(s,c,'VOLUNTEERS')&&(c.securityLevel??0)===0?650:500;
    const mobilization=campaignMobilization(s,c.ownerFactionId);
    if (mobilization.used+recruitCount>mobilization.capacity) {c.jobBlocked='동원 한도';return;}
    const lotId=`Ready.${s.turn}.${c.cityId}`;
    s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count:recruitCount});
    s.personnel.initialPersonnel+=recruitCount;
    s.economy.readyAt[lotId]=s.turn;
    s.economy.lotFaction[lotId]=c.ownerFactionId;
    s.economy.recruitedReady[lotId]=true;
    validatePersonnelLedger(s.personnel);
  } else if (job.kind==='reorganize') {
    const a=s.armies[job.armyId],f=s.personnel.formations.find(f=>f.formationId===job.armyId);
    if (!a || !castleArmyActive(s,a) || a.factionId!==c.ownerFactionId || !nearby(s,c,a) ||
      SPECIAL_TROOPS[job.troopType] || !officerTroopTypes(s.officers[a.commanderId]).includes(job.troopType) ||
      s.personnel.lots.some(l=>l.originFormationId===job.armyId&&l.count>0)) {c.jobBlocked='재편 조건';return;}
    a.troopType=job.troopType;
    f.identity={baseTroopId:troopToCampaign(job.troopType),specialTroopId:null};
  } else if(job.kind==='repair') {
    const damaged=c.facilities.find(f=>f.damaged);
    if(!damaged){c.jobBlocked='손상 시설 없음';return;}
    damaged.damaged=false;
  } else {
    const reason=cityJobReason(s,c,job.kind);if(reason){c.jobBlocked=reason;return;}
    const site=domesticEngineEnabled(s)?facilitySite(s,c,job.kind,facilityTiles(s,c)):null;
    const tileId=site?.tileId??facilityTiles(s,c)[0];
    if (!tileId || (job.kind==='farm'&&c.facilities.filter(f=>f.kind==='farm').length>=2)) {c.jobBlocked='시설 칸';return;}
    c.facilities.push({kind:job.kind,tileId,...(site?{siteReason:site.reason}:{})});creditCampaignDomestic(s,{officerId:c.governorId,eventId:`C25.FACILITY.${s.turn}.${c.cityId}`,kind:'FACILITY_BUILT',counts:{facilitiesBuilt:1}});if(C20_FACILITIES[job.kind])s.c20.stats.facilities++;
    if(job.kind!=='barracks')recordAchievementEvent(s,{id:`FACILITY.${s.turn}.${c.cityId}.${tileId}`,type:'FACILITY',factionId:c.ownerFactionId,cityId:c.cityId,officerId:c.governorId});
  }
  domesticJobCompleted(s,c,job,overflow);
  relationJobComplete(s,c);
  c.populationCapacity=cityPopulationCapacity(s,c);
  c.jobProgress[job.key]=0;
  c.productionProgress=0;
  c.currentProduction=null;
  c.jobBlocked=null;
  startDomesticProduction(s,c);
}

export function settleCampaignEconomy(s) {
  c30Settle(s);
  initializeCampaignEconomy(s);
  if (s.economy.lastSettledTurn===s.turn) return s;
  if(c19Enabled(s))s.economy.reinforcements=[];
  const migrationCauses={};
  autoFillDepartments(s);
  evacuateDestroyedWounded(s);
  for(const c of Object.values(s.cities))if(c.ownerFactionId!==null)domesticBeforeSettlement(s,c);
  const pools=domesticBeginGranaries(s,cityEconomyRates,campaignFoodNeed);
  const support=autoSupportCampaignFood(s,pools);
  for (const c of Object.values(s.cities).sort((a,b)=>a.cityId.localeCompare(b.cityId,'en'))) {
    if(c.ownerFactionId===null)continue;
    const pool=pools[c.ownerFactionId];if(pool)c.foodStock=pool.stock+c.reservedResources.food;
    const status=cityOccupationStatus(s,c),isNormal=status==='NORMAL';
    settleSpecialists(s,c,isNormal);
    if(isNormal){startDomesticProduction(s,c);settleDepartments(s,c);}
    const openingSecurity=c.securityLevel??0;
    settleCampaignSecurity(s,c);runDomestic(s,c,'HARSH_TREATMENT','settle');
    let rates=cityEconomyRates(s,c,{shortage:pool?.shortage??null}),baseline=cityEconomyRates(s,{...c,governorId:null},{shortage:pool?.shortage??null});
    const before=s.economy.occupationStatus[c.cityId];
    if (['OCCUPIED','PACIFICATION'].includes(before)&&['STABILIZING','NORMAL'].includes(status)) {
      const officerId=c.governorId??s.occupations?.[c.cityId]?.officerId??
        Object.values(s.armies).filter(a=>a.factionId===c.ownerFactionId&&castleArmyActive(s,a)&&nearby(s,c,a))
          .sort((a,b)=>a.armyId.localeCompare(b.armyId,'en'))[0]?.commanderId;
      if(c25Enabled(s)&&officerId)creditCampaignDomestic(s,{officerId,eventId:`C25.OCCUPATION.${s.turn}.${c.cityId}`,kind:'OCCUPATION_COMPLETED',counts:{[`occupation:${s.occupations?.[c.cityId]?.careerMethod??s.occupations?.[c.cityId]?.method??'military'}`]:1}});
      if(!c25Enabled(s)&&officerId) s.xpEvents.push({officerId,kind:'OCCUPATION_COMPLETED',amount:20});
      s.xpEvents=s.xpEvents.slice(-120);
    }
    s.economy.occupationStatus[c.cityId]=status;
    const personnel=cityPersonnel(s,c),civilian=c.population*2,military=(personnel.field+personnel.ready+personnel.special+personnel.wounded)*2/1000;
    const foodEnabled=isNormal||c19Enabled(s);
    const produced=pool?0:foodEnabled?rates.food:0,required=round(civilian+military);
    const reserved=c.reservedResources.food;
    const ledger=createCitySettlementState({cityId:c.cityId,ownerFactionId:c.ownerFactionId,
      foodStock:Math.max(0,c.foodStock-reserved)+(!isNormal?produced:0),growthProgress:c.growthProgress});
    const {state:closing,result}=settleCityTurn(ledger,{settlementId:`EC.${s.turn}.${c.cityId}`,turn:s.turn,
      ownerFactionId:c.ownerFactionId,occupationStatus:status,ownershipChangedThisTurn:false,
      producedFood:isNormal?produced:0,consumptionRequired:required,productionProgressGain:rates.production,
      growthProgressGain:Math.max(0,round(produced-required)),
      growthResolution:{population:c.population,populationCapacity:cityPopulationCapacity(s,c),foodCost:c.population*6}});
    const paid=result.shortage===0;
    if(foodEnabled){baseline=cityEconomyRates(s,{...c,governorId:null},{shortage:!paid});rates=cityEconomyRates(s,c,{shortage:pool?.shortage??!paid,commit:true});}
    migrationCauses[c.cityId]={besieged:c.besieged,overcrowded:c.population>=cityPopulationCapacity(s,c)&&result.growthProgressConsumed>0};
    c.population+=result.populationGain;
    c.growthProgress=closing.growthProgress;
    c.production=isNormal?rates.production:0;
    const scale=c.kind==='minor'?.5:1;
    const currentRuleCauses=(c.economyCauses??[]).filter(e=>e.rule&&e.turn===s.turn);
    c.economyCauses=[{resource:'food',label:'도시 생산',amount:foodEnabled?4*scale:0},
      {resource:'food',label:'농지 산출',amount:foodEnabled?2*Math.min(2,c.facilities.filter(f=>f.kind==='farm'&&!facilityDisabled(s,c,f)).length):0},
      {resource:'food',label:'태수 보정',amount:foodEnabled?rates.food-4*scale-2*Math.min(2,c.facilities.filter(f=>f.kind==='farm'&&!facilityDisabled(s,c,f)).length):0},
      {resource:'food',label:'시민 유지',amount:0-Math.min(civilian,result.actualConsumed)},
      {resource:'food',label:'군량',amount:0-round(Math.max(0,result.actualConsumed-civilian))},
      {resource:'food',label:'성장 소비',amount:0-result.growthFoodConsumed},
      ...['production','science','prestige'].flatMap(resource=>{const base=scale*(resource==='production'?2:resource==='prestige'?1+c.facilities.filter(f=>f.kind==='market'&&!facilityDisabled(s,c,f)).length:1);return [{resource,label:'도시 생산',amount:isNormal?base:0},{resource,label:'태수·특기·치안·군량·소수 누적 보정',amount:isNormal?rates[resource]-base:0}];})];
    if(domesticEngineEnabled(s)){
     const influence=cityInfluence(s,c),tileFood=foodEnabled?influence.food*baseCityFood(s)/4:0;
     Object.assign(c.economyCauses[0],{label:'영향권 칸 산출(시설 포함)',amount:tileFood});
     Object.assign(c.economyCauses[1],{label:'태수·담당·치안·소수 누적 보정',amount:(foodEnabled?rates.food:0)-tileFood});
     Object.assign(c.economyCauses[2],{label:'식량 소수 누적에 포함',amount:0});
     const base=c.economyCauses.find(e=>e.resource==='production'),correction=c.economyCauses.findLast(e=>e.resource==='production');
     base.label='성 중심·영향권 칸 산출';base.amount=isNormal?influence.production:0;correction.amount=(isNormal?rates.production:0)-base.amount;
    }
    if(s.mapId!=='v1'){
      // Specialist rows explain part of the same output, not an extra grant.
      for(const cause of rates.specialistCauses){
        const correction=cause.resource==='food'?c.economyCauses[1]:c.economyCauses.findLast(e=>e.resource===cause.resource);
        correction.amount-=cause.amount;
      }
      c.economyCauses.push(...rates.specialistCauses);
    }
    if(c19Enabled(s)&&c.besieged)c.economyCauses.push({resource:'food',label:'포위로 지원 끊김',amount:0});
    if(support[c.cityId])c.economyCauses.push(...(domesticEngineEnabled(s)?s.economy.supportLines.filter(e=>e.cityId===c.cityId):[{resource:'food',label:'지원',amount:support[c.cityId]}]));
    if(c.securityCauses.length)c.economyCauses.push({resource:'security',label:securityLabel({...c,securityLevel:relationSecurity(s,c).securityLevel})+' · '+c.securityCauses.join(' · '),amount:0});
    if (!isNormal) c.economyCauses.push({resource:'food',label:'점령 중 생산·모집 중단',amount:0});
    if (!paid) c.economyCauses.push({resource:'food',label:'유지비 미지급',amount:domesticEngineEnabled(s)?0:result.shortage,...(domesticEngineEnabled(s)?{unpaid:result.shortage}:{})});
    c.economyCauses.push(...currentRuleCauses);
    c.foodCapacity=pool?Math.max(pool.cap,closing.foodStock+reserved):Math.max(reserved,rates.capacity);
    const available=closing.foodStock+reserved;
    const overflow=Math.max(0,available-c.foodCapacity);
    c.foodStock=Math.min(c.foodCapacity,available);
    if(!pool)runDomestic(s,c,'SURPLUS_TO_TROOPS','overflow',{overflow});
    if (overflow) c.economyCauses.push({resource:'food',label:'보관 한도 초과',amount:-round(overflow)});
    if (['v2','v3'].includes(s.mapId)&&s.c42Disabled!==true)c.lastSettlementScience=isNormal?rates.science:0;
    if (isNormal) {
      replenish(s,c);
      recover(s,c,paid);
      if(s.mapId!=='v1')c.reserveTroops=cityPersonnel(s,c).ready;
      completeJob(s,c,rates,paid);
      c.foodCapacity=Math.max(reserved,cityEconomyRates(s,c).capacity);
      s.factions[c.ownerFactionId].science=round(s.factions[c.ownerFactionId].science+rates.science);
      s.factions[c.ownerFactionId].prestige=round(s.factions[c.ownerFactionId].prestige+rates.prestige);
      uniqueSettlement(s,c);
    }
    const governor=s.officers[c.governorId];
    if (governor?.lifeState==='ALIVE'&&governor.captivityState==='FREE'&&governor.allegianceFactionId===c.ownerFactionId&&!injuryReason(s,governor.officerId)){
      s.xpEvents.push({officerId:c.governorId,kind:'GOVERNOR_TURN',amount:5});
      s.xpEvents=s.xpEvents.slice(-120);
      creditCampaignGrowth(s,{eventId:`GOVERNOR.${s.turn}.${c.cityId}`,officerId:c.governorId,kind:'GOVERNOR_TURN',
        amount:campaignGrowthTrial(s).governorXp*(1+governor.baseStats.politics/100)});
    }
    settleOccupationCity(s,c,paid,openingSecurity);
    if(c25Enabled(s)&&governor?.lifeState==='ALIVE'&&governor.captivityState==='FREE'&&governor.allegianceFactionId===c.ownerFactionId&&!injuryReason(s,governor.officerId)){
      // Counterfactual output excludes only this governor; specialist output and carry stay identical.
      const gain=key=>Math.max(0,rates[key]-baseline[key]);
      const food=foodEnabled?gain('food'):0,production=isNormal?gain('production'):0,science=isNormal?gain('science'):0;
      creditCampaignDomestic(s,{officerId:c.governorId,eventId:`C25.OUTPUT.${s.turn}.${c.cityId}`,kind:'GOVERNOR_OUTPUT',counts:{govTurns:1,foodAdded:food,productionAdded:production,scienceAdded:science},amount:Math.min(C25.outputCap,food+production+science)});
      if((c.securityLevel??0)<openingSecurity)creditCampaignDomestic(s,{officerId:c.governorId,eventId:`C25.SECURITY.${s.turn}.${c.cityId}`,kind:'SECURITY_RECOVERED',counts:{securityRecovered:openingSecurity-c.securityLevel}});
    }
    domesticAfterSettlement(s,c);
    if(pool){pool.stock=c.foodStock-reserved;c.foodStock=reserved;}
    const updated=cityPersonnel(s,c);
    c.reserveTroops=updated.ready;c.woundedTroops=updated.wounded;
  }
  domesticFinishGranaries(s,pools,cityEconomyRates);
  settleSupply(s);
  settleCampaignResearch(s);
  const refugeeBefore=Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,c.population]));
  settlePolicyRefugees(s);
  for(const c of Object.values(s.cities))Object.assign(migrationCauses[c.cityId]??={}, {starving:c.foodStock-c.reservedResources.food<=0,security:c.securityLevel??0});
  for(const c of Object.values(s.cities))if(c.population!==refugeeBefore[c.cityId])markMigrationHandled(s,c.cityId);
  for(const c of Object.values(s.cities))if((c.economyCauses??[]).some(e=>e.rule==='REFUGEE_INFLOW'&&e.turn>=s.turn-1))markMigrationHandled(s,c.cityId);
  settleAutomaticMigration(s,migrationCauses);
  settleAchievements(s);
  s.economy.lastSettledTurn=s.turn;
  validatePersonnelLedger(s.personnel);
  return s;
}

// FIRST3's legacy validator still requires a governor. Validate a disposable
// compatibility projection, leaving the real vacancy and every gameplay value
// untouched. A synthetic officer exists only during this validation call.
export function legacyGovernorValidationView(s) {
  const vacant=Object.values(s.cities).filter(c=>c.ownerFactionId!==null&&c.governorId===null&&c.occupationState==='NORMAL');
  const hasMorale=Object.values(s.armies).some(a=>typeof a.morale==='string');
  const transferred=Object.values(s.armies).filter(a=>s.campaignTerminalWorld?.armiesById[a.armyId]?.disposition!=='ACTIVE'&&s.officers[a.commanderId].allegianceFactionId!==a.factionId);
  const policyResult=c20Enabled(s)&&s.gameResult&&s.factions.F02.alive&&!Object.values(s.cities).some(c=>c.ownerFactionId==='F02'&&c.kind==='major');
  if (!vacant.length&&!hasMorale&&!transferred.length&&!policyResult) return s;
  // The legacy validator only reads other fields; copy the adapter write set.
  const copy={...s,...structuredClone({armies:s.armies,officers:s.officers,factions:s.factions,cities:s.cities,...(Object.hasOwn(s,'campaignTerminalWorld')?{campaignTerminalWorld:s.campaignTerminalWorld}:{})})},template=Object.values(s.officers)[0];
  if(policyResult){copy.gameResult=null;if(copy.campaignTerminalWorld)copy.campaignTerminalWorld.gameResult=null;}
  for(const a of Object.values(copy.armies)){if(typeof a.morale==='string')a.morale=100;a.troopType=parentTroop(a.troopType);}
  if(Object.values(s.armies).some(a=>SPECIAL_TROOPS[a.troopType]))copy.knowledge=Object.fromEntries(Object.entries(s.knowledge).map(([id,k])=>[id,{...k,observedArmies:Object.fromEntries(Object.entries(k.observedArmies).map(([aid,a])=>[aid,{...a,troopType:parentTroop(a.troopType)}]))}]));
  for(const a of transferred){copy.armies[a.armyId].factionId=copy.officers[a.commanderId].allegianceFactionId;copy.campaignTerminalWorld.armiesById[a.armyId].factionId=copy.armies[a.armyId].factionId;}
  if(transferred.length)for(const f of Object.values(copy.factions))f.armyIds=Object.values(copy.armies).filter(a=>a.factionId===f.factionId).map(a=>a.armyId);
  for (const c of vacant) {
    const officerId=`C3b-validator-${c.cityId}`,locationRef={kind:'CITY',id:c.cityId};
    copy.officers[officerId]={...structuredClone(template),officerId,allegianceFactionId:c.ownerFactionId,
      lifeState:'ALIVE',captivityState:'FREE',captorFactionId:null,locationRef};
    copy.factions[c.ownerFactionId].officerIds.push(officerId);
    copy.cities[c.cityId].governorId=officerId;
    if(copy.campaignTerminalWorld) {
      copy.campaignTerminalWorld.citiesById[c.cityId].governorId=officerId;
      copy.campaignTerminalWorld.officersById[officerId]={officerId,allegianceFactionId:c.ownerFactionId,
        lifeState:'ALIVE',captivityState:'FREE',captorFactionId:null,assignment:locationRef};
    }
  }
  return copy;
}
import {C25,c25Enabled} from './campaign-career.mjs';
import {creditCampaignGrowth,creditCampaignDomestic,campaignGrowthTrial} from './campaign-growth.mjs';

export const securityLabel=c=>['안정','민심 불안','혼란'][c.securityLevel??0];
export function campaignFoodNeed(s,c){const p=cityPersonnel(s,c);return round(c.population*2+(clockFood(s)?0:(p.field+p.ready+p.special+p.wounded)*troopFoodRate(s)/1000));}
// Readout follows the actual settlement debit, including local ready/wounded
// personnel even when field armies use the clock supply model.
export function campaignLedgerFoodNeed(s,c){const p=cityPersonnel(s,c);return round(c.population*2+(p.field+p.ready+p.special+p.wounded)*2/1000);}
export function settleCampaignSecurity(s,c){
 const causes=[];
 if(c.plunderTurn===s.turn||c.plunderTurn===s.turn-1)causes.push('수탈');
 if(c.besieged)causes.push('포위');
 if(s.occupations?.[c.cityId]?.stage==='CAPTURED'||cityOccupationStatus(s,c)==='OCCUPIED')causes.push('점령 직후');
 if(c.foodStock-c.reservedResources.food+((normal(s,c)||c19Enabled(s))?cityEconomyRates(s,c).food:0)<campaignFoodNeed(s,c))causes.push('식량 부족');
 domesticSecurityCauses(s,c,causes);
 const before=c.securityLevel??0;
 const plunderAlreadyApplied=causes.length===1&&causes[0]==='수탈'&&c.plunderTurn===s.turn-1;
 causes.splice(0,causes.length,...c34Security(s,c,causes));c.securityLevel=Math.max(0,Math.min(2,before+(causes.length?(plunderAlreadyApplied?0:1):-1)-departmentOutput(s,c).security));c.securityCauses=[...causes,...relationSecurity(s,c).securityCauses];
 if(before!==c.securityLevel){s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:c.ownerFactionId,text:`${s.cityDisplayNames?.[c.cityId]??c.name}: 치안 ${securityLabel({...c,securityLevel:relationSecurity(s,c).securityLevel})}${c.securityCauses.length?' · '+c.securityCauses.join(' · '):' · 원인 해소'}`});s.administrationLog=s.administrationLog.filter((e,i,list)=>e.turn===s.turn||i>=list.length-120);}
}
export function autoSupportCampaignFood(s,pools={}){
 const enabled=domesticEngineEnabled(s),cities=Object.values(s.cities).sort((a,b)=>(enabled?Number(b.foodPriority)-Number(a.foodPriority):0)||a.cityId.localeCompare(b.cityId)),net={},sent={};
 if(enabled)s.economy.supportLines=[];
 const output=c=>(normal(s,c)||c19Enabled(s))?cityEconomyRates(s,c).food:0;
 const demand=c=>enabled?campaignLedgerFoodNeed(s,c):campaignFoodNeed(s,c);
 for(const c of cities){if(pools[c.ownerFactionId]||enabled&&!c.ownerFactionId)continue;let need=Math.min(enabled?C184.supportPerTurn:20,Math.max(0,demand(c)-output(c)-(c.foodStock-c.reservedResources.food)));
  for(const donor of cities){if(!need)break;if(donor===c||donor.ownerFactionId!==c.ownerFactionId||c19Enabled(s)&&(c.besieged||donor.besieged)&&!domesticRule(s,donor,'UNBLOCKABLE_SUPPLY'))continue;
   if(enabled&&!domesticRule(s,donor,'UNBLOCKABLE_SUPPLY')&&!citySupplyRoute(s,donor,c))continue;
   const spare=Math.max(0,donor.foodStock-donor.reservedResources.food-(enabled?C184.supportReserveTurns:2)*demand(donor));
   const amount=Math.min(need,spare,(enabled?C184.supportPerTurn:20)-(sent[donor.cityId]??0));if(!amount)continue;
   donor.foodStock-=amount;c.foodStock+=amount;domesticSupport(s,donor,c,amount);uniqueSupply(s,donor,amount);need-=amount;sent[donor.cityId]=(sent[donor.cityId]??0)+amount;
   net[donor.cityId]=(net[donor.cityId]??0)-amount;net[c.cityId]=(net[c.cityId]??0)+amount;
   if(enabled){const from=s.cityDisplayNames?.[donor.cityId]??donor.name,to=s.cityDisplayNames?.[c.cityId]??c.name;s.economy.supportLines.push({cityId:c.cityId,resource:'food',label:`지원 +${amount}, ${from}에서`,amount,sourceCityId:donor.cityId},{cityId:donor.cityId,resource:'food',label:`${to} 지원`,amount:-amount,targetCityId:c.cityId});(s.administrationLog??=[]).push({turn:s.turn,factionId:c.ownerFactionId,text:`${to}: 지원 +${amount}, ${from}에서`});}
  }
 }
 return net;
}
function settleDepartments(s,c){
 if(!domesticEngineEnabled(s))return;
 for(const [kind,id] of Object.entries(c.departments))if(domesticOfficerPresent(s,c,id))creditCampaignDomestic(s,{officerId:id,eventId:`C184.${s.turn}.${c.cityId}.${kind}`,kind:'GOVERNOR_OUTPUT',counts:{govTurns:1},amount:C184.departmentXp});
 const n=Math.min(departmentOutput(s,c).reserve,Math.max(0,campaignMobilization(s,c.ownerFactionId).capacity-campaignMobilization(s,c.ownerFactionId).used));
 if(!n)return;
 const lotId=`C184.Ready.${s.turn}.${c.cityId}`;s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count:n});s.personnel.initialPersonnel+=n;s.economy.readyAt[lotId]=s.turn;s.economy.lotFaction[lotId]=c.ownerFactionId;
}


// Track existing refugee effects at the committed command boundary, without
// changing those policy/event handlers or counting their people a second time.
export function markMigrationHandled(s,cityId){if(s.economyMigration)s.economyMigration.handledTurns[cityId]=s.turn;}
export function validateDomesticCanon(s){
 const validTurn=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.turn,object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 for(const c of Object.values(s.cities))if(c.siegeSinceTurn!=null&&!validTurn(c.siegeSinceTurn)||c.siegeTurns!==undefined&&(!Number.isSafeInteger(c.siegeTurns)||c.siegeTurns<0))throw new Error('INVALID_CAMPAIGN_SIEGE_DURATION');
 const m=s.economyMigration;if(m===undefined)return;
 const fail=()=>{throw new Error('INVALID_CAMPAIGN_MIGRATION');};
 if(!object(m)||!Number.isSafeInteger(m.total)||m.total<0||!Array.isArray(m.recent)||m.recent.length>60||m.total<m.recent.length)fail();
 for(const key of ['lastTurns','handledTurns'])if(!object(m[key])||Object.entries(m[key]).some(([id,n])=>!s.cities[id]||!validTurn(n)))fail();
 if(m.recent.some(r=>!object(r)||!s.cities[r.cityId]||r.destinationId!==null&&!s.cities[r.destinationId]||!s.factions[r.factionId]||!validTurn(r.turn)||!Number.isSafeInteger(r.count)||r.count<=0||!['전쟁','기근','치안','과밀'].includes(r.reason)))fail();
}
export function observeExistingMigration(s,before){
 if(!c19Enabled(s))return;
 const fired=(s.c22?.fired??[]).slice(before.c22?.fired?.length??0).some(e=>['E03','E04'].includes(e.eventId)&&e.choiceId==='a');
 const policy=(s.c20?.stats?.escapes??0)!==(before.c20?.stats?.escapes??0)||(s.c20?.stats?.resettlements??0)!==(before.c20?.stats?.resettlements??0);
 for(const c of Object.values(s.cities)){
  const old=before.cities[c.cityId],inflow=(c.economyCauses??[]).some(e=>e.rule==='REFUGEE_INFLOW'&&e.turn>=before.turn);
  if(old&&((fired||policy)&&c.population!==old.population||inflow))markMigrationHandled(s,c.cityId);
 }
}
export function settleAutomaticMigration(s,causes){
 if(!c19Enabled(s))return;
 const m=s.economyMigration,cfg=C195.migration,rows=Object.values(s.cities).sort((a,b)=>a.cityId.localeCompare(b.cityId,'en'));
 // Snapshot triggers and destinations before any transfer: arrivals never move twice.
 const eligible=c=>![s.turn,s.turn-1].includes(m.handledTurns[c.cityId]);
 const plans=[];const room=Object.fromEntries(rows.map(c=>[c.cityId,Math.max(0,cityPopulationCapacity(s,c)-c.population)]));
 for(const c of rows){
  if(!c.ownerFactionId||c.population<=cfg.population||!eligible(c)||s.turn-(m.lastTurns[c.cityId]??-cfg.cooldownTurns)<cfg.cooldownTurns)continue;
  const x=causes[c.cityId]??{},reason=x.besieged?'전쟁':x.starving?'기근':x.security>=cfg.unrestLevel?'치안':x.overcrowded?'과밀':null;if(!reason)continue;
  // A besieged origin may lose population, but a closed supply route admits no transfer.
  const dest=rows.filter(d=>d!==c&&d.ownerFactionId===c.ownerFactionId&&room[d.cityId]>=cfg.population&&eligible(d)&&citySupplyRoute(s,c,d)).sort((a,b)=>hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])-hexDistance(s.tiles[c.tileId],s.tiles[b.tileId])||a.cityId.localeCompare(b.cityId,'en'))[0];
  if(dest)room[dest.cityId]-=cfg.population;
  plans.push({cityId:c.cityId,destinationId:dest?.cityId??null,reason});
 }
 for(const p of plans){const c=s.cities[p.cityId],dest=s.cities[p.destinationId];c.population-=cfg.population;c.workedTiles=c.workedTiles?.slice(0,c.population)??[];if(dest)dest.population+=cfg.population;m.lastTurns[c.cityId]=s.turn;m.total++;
  const row={...p,turn:s.turn,factionId:c.ownerFactionId,count:cfg.population};m.recent.push(row);
  (s.administrationLog??=[]).push({turn:s.turn,factionId:c.ownerFactionId,text:`${p.reason}으로 ${s.cityDisplayNames?.[c.cityId]??c.name}에서 ${dest?(s.cityDisplayNames?.[dest.cityId]??dest.name)+'으로':'갈 곳 없이'} ${cfg.population} 이주${dest?'':' · 인구 감소'}`});
 }
 m.recent=m.recent.slice(-60);
}
// Same settlement, same lot ordering/caps/recovery timing. Only the disposable
// public supply world is simulated; unobserved foreign units cannot affect UI.
export function campaignReinforcementForecast(s,factionId,publicWorld){
 if(!c19Enabled(s)||s.gameResult)return {};
 const copy=structuredClone(s);
 copy.armies=Object.fromEntries(Object.entries(copy.armies).filter(([id,a])=>a.factionId===factionId||publicWorld.knowledge.tiles[a.tileId]==='VISIBLE'&&publicWorld.knowledge.observedArmies[id]));
 copy.turn++;copy.turnNumber=copy.turn;copy.globalTick+=copy.time.ticksPerTurn;copy.currentDate+=10;
 settleCampaignEconomy(copy);
 return Object.fromEntries(Object.values(publicWorld.ownArmies).map(a=>{const sources=(copy.economy.reinforcements??[]).filter(r=>r.armyId===a.armyId).map(({cityId,count})=>({cityId,count}));return [a.armyId,{count:sources.reduce((n,r)=>n+r.count,0),sources}];}));
}
