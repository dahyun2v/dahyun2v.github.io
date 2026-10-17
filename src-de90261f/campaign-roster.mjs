import {ordinaryReserve} from './campaign-special-troops.mjs';
import {combatFireAt} from './campaign-rule-registry.mjs';
import {selectCityJob,cityJobReason} from './campaign-economy.mjs';
import {C184,domesticEngineEnabled,initializeDomesticEngine,clearDomesticOfficer,domesticOfficerPresent,DEPARTMENTS} from './campaign-domestic.mjs';
import {citySupplyRoute,fieldDrainTurns,armyFoodPerTurn} from './campaign-supply.mjs';
import troopAssignments from '../data/c169a-troops.json' with {type:'json'};
import {troopText} from './troop-display.mjs';
import {injuryReason} from './campaign-injury.mjs';
import {fatigueReason,recordFatigueBlock} from './campaign-fatigue.mjs';
import {loadMusterSupply} from './campaign-supply.mjs';
import {observeRelationGroups} from './campaign-relations.mjs';
import {initializeClasses} from './campaign-classes.mjs';
import {c34Cost,c34Joined} from './campaign-c34.mjs';
import {uniqueGovernor as uniqueGovernorForC34Rule} from './campaign-rule-registry.mjs';
const uniqueGovernorForC34=(s,c)=>uniqueGovernorForC34Rule(s,c,'U_SCHOLAR_BUILDER');
import {c31DurabilityFactor} from './campaign-events.mjs';
import {c30MusterBonus,c30MusterOrigin} from './campaign-c29.mjs';
import {c29RecruitAgent} from './campaign-c29.mjs';
import talentG01 from '../../docs/design-data/officer-pack/trial/G01.json' with {type:'json'};
import talentG02 from '../../docs/design-data/officer-pack/trial/G02.json' with {type:'json'};
import talentG03 from '../../docs/design-data/officer-pack/trial/G03.json' with {type:'json'};
import talentG04 from '../../docs/design-data/officer-pack/trial/G04.json' with {type:'json'};
import talentG05 from '../../docs/design-data/officer-pack/trial/G05.json' with {type:'json'};
import talentG06 from '../../docs/design-data/officer-pack/trial/G06.json' with {type:'json'};
import talentG07 from '../../docs/design-data/officer-pack/trial/G07.json' with {type:'json'};
import talentG08 from '../../docs/design-data/officer-pack/trial/G08.json' with {type:'json'};
import talentG09 from '../../docs/design-data/officer-pack/trial/G09.json' with {type:'json'};
import talentG10 from '../../docs/design-data/officer-pack/trial/G10.json' with {type:'json'};
import talentG11 from '../../docs/design-data/officer-pack/trial/G11.json' with {type:'json'};
import talentG12 from '../../docs/design-data/officer-pack/trial/G12.json' with {type:'json'};
import talentG13 from '../../docs/design-data/officer-pack/trial/G13.json' with {type:'json'};
import talentG14 from '../../docs/design-data/officer-pack/trial/G14.json' with {type:'json'};
import talentG15 from '../../docs/design-data/officer-pack/trial/G15.json' with {type:'json'};
import talentG16 from '../../docs/design-data/officer-pack/trial/G16.json' with {type:'json'};
import talentG17 from '../../docs/design-data/officer-pack/trial/G17.json' with {type:'json'};
import talentG18 from '../../docs/design-data/officer-pack/trial/G18.json' with {type:'json'};
import talentG19 from '../../docs/design-data/officer-pack/trial/G19.json' with {type:'json'};
import talentG20 from '../../docs/design-data/officer-pack/trial/G20.json' with {type:'json'};
import talentG21 from '../../docs/design-data/officer-pack/trial/G21.json' with {type:'json'};
import talentG22 from '../../docs/design-data/officer-pack/trial/G22.json' with {type:'json'};
import talentG23 from '../../docs/design-data/officer-pack/trial/G23.json' with {type:'json'};
import talentG24 from '../../docs/design-data/officer-pack/trial/G24.json' with {type:'json'};
import talentG25 from '../../docs/design-data/officer-pack/trial/G25.json' with {type:'json'};
import talentG26 from '../../docs/design-data/officer-pack/trial/G26.json' with {type:'json'};
import talentG27 from '../../docs/design-data/officer-pack/trial/G27.json' with {type:'json'};
import talentG28 from '../../docs/design-data/officer-pack/trial/G28.json' with {type:'json'};
import talentG29 from '../../docs/design-data/officer-pack/trial/G29.json' with {type:'json'};
import talentG30 from '../../docs/design-data/officer-pack/trial/G30.json' with {type:'json'};
import talentG31 from '../../docs/design-data/officer-pack/trial/G31.json' with {type:'json'};
import talentG32 from '../../docs/design-data/officer-pack/trial/G32.json' with {type:'json'};
import talentG33 from '../../docs/design-data/officer-pack/trial/G33.json' with {type:'json'};
import talentG34 from '../../docs/design-data/officer-pack/trial/G34.json' with {type:'json'};
import talentG35 from '../../docs/design-data/officer-pack/trial/G35.json' with {type:'json'};
import talentG36 from '../../docs/design-data/officer-pack/trial/G36.json' with {type:'json'};
import talentG37 from '../../docs/design-data/officer-pack/trial/G37.json' with {type:'json'};
import talentG38 from '../../docs/design-data/officer-pack/trial/G38.json' with {type:'json'};
import talentG39 from '../../docs/design-data/officer-pack/trial/G39.json' with {type:'json'};
import talentG40 from '../../docs/design-data/officer-pack/trial/G40.json' with {type:'json'};
import talentG41 from '../../docs/design-data/officer-pack/trial/G41.json' with {type:'json'};
import talentG42 from '../../docs/design-data/officer-pack/trial/G42.json' with {type:'json'};
import talentG43 from '../../docs/design-data/officer-pack/trial/G43.json' with {type:'json'};
import talentG44 from '../../docs/design-data/officer-pack/trial/G44.json' with {type:'json'};
import talentG45 from '../../docs/design-data/officer-pack/trial/G45.json' with {type:'json'};
import talentG46 from '../../docs/design-data/officer-pack/trial/G46.json' with {type:'json'};
import talentG47 from '../../docs/design-data/officer-pack/trial/G47.json' with {type:'json'};
import talentG48 from '../../docs/design-data/officer-pack/trial/G48.json' with {type:'json'};
import talentG49 from '../../docs/design-data/officer-pack/trial/G49.json' with {type:'json'};
import talentG50 from '../../docs/design-data/officer-pack/trial/G50.json' with {type:'json'};
import {domesticMusterAvailable,domesticMusterReason,domesticMusterLots,domesticMuster,domesticResearchThreshold,domesticResearchRaised,domesticRecruit,domesticGovernor,configureDomesticTalent,initializeDomestic,domesticJoinedWanderer} from './campaign-rule-registry.mjs';
import {C24,SPECIAL_TROOPS,specialTroop,parentTroop,specialMusterReason,troopInfo} from './campaign-special-troops.mjs';
import {c20Enabled,cityRecruitCost} from './campaign-policy.mjs';
import g33 from '../../docs/design-data/officer-pack/trial/G33.json' with {type:'json'};
import g34 from '../../docs/design-data/officer-pack/trial/G34.json' with {type:'json'};
import g25 from '../../docs/design-data/officer-pack/trial/G25.json' with {type:'json'};
import g18 from '../../docs/design-data/officer-pack/trial/G18.json' with {type:'json'};
import g19 from '../../docs/design-data/officer-pack/trial/G19.json' with {type:'json'};
import g06 from '../../docs/design-data/officer-pack/trial/G06.json' with {type:'json'};
import g28 from '../../docs/design-data/officer-pack/trial/G28.json' with {type:'json'};
import g29 from '../../docs/design-data/officer-pack/trial/G29.json' with {type:'json'};
import g30 from '../../docs/design-data/officer-pack/trial/G30.json' with {type:'json'};
import g35 from '../../docs/design-data/officer-pack/trial/G35.json' with {type:'json'};
import g46 from '../../docs/design-data/officer-pack/trial/G46.json' with {type:'json'};
import g16 from '../../docs/design-data/officer-pack/trial/G16.json' with {type:'json'};
import g13 from '../../docs/design-data/officer-pack/trial/G13.json' with {type:'json'};
import g10 from '../../docs/design-data/officer-pack/trial/G10.json' with {type:'json'};
import g49 from '../../docs/design-data/officer-pack/trial/G49.json' with {type:'json'};
import g21 from '../../docs/design-data/officer-pack/trial/G21.json' with {type:'json'};
import g42 from '../../docs/design-data/officer-pack/trial/G42.json' with {type:'json'};
import g01 from '../../docs/design-data/officer-pack/trial/G01.json' with {type:'json'};
import g31 from '../../docs/design-data/officer-pack/trial/G31.json' with {type:'json'};
import g14 from '../../docs/design-data/officer-pack/trial/G14.json' with {type:'json'};
import g37 from '../../docs/design-data/officer-pack/trial/G37.json' with {type:'json'};
import g32 from '../../docs/design-data/officer-pack/trial/G32.json' with {type:'json'};
import g09 from '../../docs/design-data/officer-pack/trial/G09.json' with {type:'json'};
import g38 from '../../docs/design-data/officer-pack/trial/G38.json' with {type:'json'};
import g39 from '../../docs/design-data/officer-pack/trial/G39.json' with {type:'json'};
import {campaignMapData} from './campaign-scenario.mjs';
import initial from '../../docs/design-data/first3-initial-state-v1.json' with {type:'json'};
import {statsFromOfficerPack,troopToCampaign} from './campaign-adapters.mjs';
import {initializeCampaignGrowth} from './campaign-growth.mjs';
import {uniqueMusterFactor} from './campaign-rule-registry.mjs';
import {initializeCampaignAbilities,initializeArmyFacing} from './campaign-abilities.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {createCampaignTerminalStateFromWorld} from './campaign-terminal-world.mjs';
import {hexDistance} from './map-primitives.mjs';
import {reserveRecruitmentProposal} from './recruitment.mjs';
const troopNames={BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'};
export const ARMY_STRUCTURE_TROOPS=troopAssignments;
export const officerTroopTypes=o=>o?.multiTroopTrait?.troopTypes??(o?.troopType?[o.troopType]:o?.allowedTroops??[]);
export function assignOfficerTroop(o){
 const entry=troopAssignments.officers[o.officerId];
 const rank={HIGH:3,A:3,S:3,'S+':3,MEDIUM:2,B:2,LOW:1,C:1};
 const fallback=['spear','cavalry','militia','bow'].sort((a,b)=>(rank[o.aptitude?.[b]]??0)-(rank[o.aptitude?.[a]]??0))[0];
 o.troopType=entry?.troopType??o.troopType??fallback;
 o.multiTroopTrait=entry?.multiTroopTypes.length?{id:'C169A_MULTI_TROOP',name:'겸병',troopTypes:[...entry.multiTroopTypes]}:null;
 o.allowedTroops=o.multiTroopTrait?[...o.multiTroopTrait.troopTypes]:[o.troopType];
 o.aptitude=Object.fromEntries(o.allowedTroops.map(t=>[t,o.aptitude?.[t]??'B']));
 return o;
}
export function migrateArmyStructure(s){
 if(s.mapId==='v1'||s.c169aVersion===1)return s;
 for(const o of Object.values({...s.officers,...s.wanderers}))assignOfficerTroop(o);
 // Keep deployed counts, wounds and terminal identity; migrate only troop identity.
 for(const a of Object.values(s.armies)){
  const o=s.officers[a.commanderId];if(!o||o.allowedTroops.includes(parentTroop(a.troopType)))continue;
  a.troopType=o.troopType;
  const f=s.personnel.formations.find(f=>f.formationId===a.armyId);
  if(f)f.identity={baseTroopId:troopToCampaign(a.troopType),specialTroopId:null};
 }
 for(const c of Object.values(s.cities)){
  if(c.currentProduction?.kind==='muster'){
   // No personnel or food was paid before legacy muster completion.
   delete c.jobProgress?.[c.currentProduction.key];c.currentProduction=null;c.productionProgress=0;c.jobBlocked=null;
  }
  for(const key of Object.keys(c.jobProgress??{}))if(key==='muster'||key.startsWith('muster:'))delete c.jobProgress[key];
 }
 s.c169aVersion=1;
 return s;
}
export const rosterPacks=Object.fromEntries([g33,g34,g25,g18,g19,g06,g28,g29,g30,g35,g46,g16,g13,g10,g49,g21,g42,g01,g31,g14,g37,g32,g09,g38,g39].map(p=>[p.id,p]));
export function officerFromPack(s,p,factionId,cityId){
 const o=structuredClone(Object.values(s.officers)[0]);
 if(['v2','v3'].includes(s.mapId)){o.fatigue=0;o.injury=null;delete o.fatigueCombat;}
 delete o.c34Abilities;delete o.c26;delete o.c26OriginFaction;delete o.c26OriginCity;
 delete o.troopType;delete o.multiTroopTrait;
 if(s.mapId!=='v1'){o.c26OriginFaction=factionId;o.c26OriginCity=cityId;}
 Object.assign(o,{officerId:p.id,name:p.name,allegianceFactionId:factionId,locationRef:{kind:'CITY',id:cityId},lifeState:'ALIVE',conditionState:'NORMAL',captivityState:'FREE',captorFactionId:null,travelState:'STATIONARY',level:1,experience:0,aptitudePoints:0,baseStats:statsFromOfficerPack(p.stats),rolePrimary:p.role,roleSecondary:p.style,uniqueTrait:{id:`UT-${p.id}`,name:p.uniqueTrait.name,level:1},acquiredTraits:[],activeTraits:[],tactics:[]});
 if(p.sub&&Number(p.id.slice(1))>50)o.c34Abilities={major:structuredClone(p.stats),sub:structuredClone(p.sub)};
 o.allowedTroops=Object.entries(p.troopAptitude).filter(([,v])=>['HIGH','MEDIUM'].includes(v)).map(([id])=>troopNames[id]);
 o.aptitude=Object.fromEntries(o.allowedTroops.map(t=>[t,p.troopAptitude[troopToCampaign(t)]==='HIGH'?'A':'B']));
 assignOfficerTroop(o);
 return o;
}
export function initializeCampaignRoster(s){
 if(s.mapId==='v1')return s;
 configureDomesticTalent(domesticTalentPacks,officerFromPack);
 s.wanderers??={};s.c16Stats??={musters:0,wandererRecruitments:0};
 const placements=new Map(campaignMapData(s.mapId).cities.flatMap(c=>(c.wanderers??[]).map(id=>[id,c.id])));
 for(const p of Object.values(rosterPacks)){
  if(s.mapId==='v3'&&placements.has(p.id))s.wanderers[p.id]=officerFromPack(s,p,null,placements.get(p.id));
  else if(p.startLocation?.kind==='CITY'){
   const cityId=s.factions[p.faction].capitalCityId;
   s.officers[p.id]=officerFromPack(s,p,p.faction,cityId);s.factions[p.faction].officerIds.push(p.id);
  }else if(s.mapId==='v2'&&p.startLocation?.kind==='WANDERER')s.wanderers[p.id]=officerFromPack(s,p,null,p.startLocation.cityId);
 }
 initializeCampaignAbilities(s);initializeCampaignGrowth(s,rosterPacks);
 for(const c of Object.values(s.cities))if(c.kind==='major'){
  const lotId=`C16.START.${c.cityId}`;
  s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count:400});
  s.personnel.initialPersonnel+=400;s.economy.lotFaction[lotId]=c.ownerFactionId;s.economy.recruitedReady[lotId]=true;s.economy.readyAt[lotId]=s.turn;c.reserveTroops=400;
 }
 initializeDomestic(s);return s;
}
export function freeCityOfficers(s,c,{includeGovernor=true}={}){
 return Object.values(s.officers).filter(o=>o.allegianceFactionId===c.ownerFactionId&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&o.locationRef.kind==='CITY'&&o.locationRef.id===c.cityId&&(includeGovernor||c.governorId!==o.officerId)&&!Object.values(s.armies).some(a=>a.commanderId===o.officerId&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE'))).sort((a,b)=>a.officerId.localeCompare(b.officerId));
}
function terminalOfficer(s,o,assignment={kind:'NONE',id:null}){
 if(!s.terminal)return;
 s.terminal.officersById[o.officerId]={officerId:o.officerId,allegianceFactionId:o.allegianceFactionId,lifeState:o.lifeState,captivityState:o.captivityState,captorFactionId:o.captorFactionId,assignment};
 if(!s.terminal.officerOrder.includes(o.officerId))s.terminal.officerOrder.push(o.officerId);
 s.terminal.officerOrder.sort();
}
// C19 values are trials. Keep the entire simple-economy tuning surface here.
// 연구 문턱 10·28·50: 26턴 시험판에서 30·90·180 은 1단계만 19~21턴에 열려(Claude 조정, 시험값).
export const C19 = Object.freeze({thresholds:Object.freeze([10,28,50]),names:Object.freeze(['공방','성벽 보강','군량 기지']),workshopCost:12,workshopLimit:2,workshopProduction:1,wallBonus:25,majorPopulation:8,minorPopulation:4,populationBase:2,populationFood:1,populationProduction:.5,populationScience:.5,musterCost:6,musterReserve:200,supplyMusterCost:3,supplyMusterReserve:120});
export const c19Enabled=s=>['v2','v3'].includes(s.mapId);
export const researchStage=(s,id)=>c19Enabled(s)?s.factions[id]?.research?.stage??0:0;
export const musterRequirement=(s,c)=>C19.musterReserve;
export const cityPopulationCapacity=(s,c)=>c19Enabled(s)?(c.kind==='minor'?C19.minorPopulation:C19.majorPopulation)+(c.facilities??[]).filter(f=>['granary','market'].includes(f.kind)).length:c.populationCapacity;
export const cityDurabilityMaximum=(s,c)=>Math.round(((c.kind==='minor'?60:100)+(researchStage(s,c.ownerFactionId)>=2?C19.wallBonus:0)+(uniqueGovernorForC34(s,c)?20:0))*c31DurabilityFactor(s,c));
export function syncResearchCities(s){
 if(!c19Enabled(s))return s;
 for(const c of Object.values(s.cities)){
  c.populationCapacity=cityPopulationCapacity(s,c);
  c.durabilityMax=cityDurabilityMaximum(s,c);
  c.durability=Math.min(c.durability,c.durabilityMax);
 }
 return s;
}
export function settleCampaignResearch(s){
 if(!c19Enabled(s))return s;
 for(const f of Object.values(s.factions)){
  f.research??={stage:0,reachedTurns:[]};
  while(f.research.stage<3&&f.science>=domesticResearchThreshold(s,f.factionId,C19.thresholds[f.research.stage])){
   const stage=++f.research.stage;domesticResearchRaised(s,f.factionId);f.research.reachedTurns.push(s.turn);
   s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:f.factionId,text:`연구 ${stage}단계 — ${C19.names[stage-1]}`});
   s.administrationLog=s.administrationLog.slice(-120);
  }
 }
 return syncResearchCities(s);
}
export function campaignResearchView(s,id){
 const f=s.factions[id],stage=researchStage(s,id);
 return {science:f.science,stage,nextThreshold:C19.thresholds[stage]===undefined?null:domesticResearchThreshold(s,id,C19.thresholds[stage]),unlocks:C19.names.slice(0,stage),reachedTurns:[...(f.research?.reachedTurns??[])]};
}
export function validateCampaignResearch(s){
 if(!c19Enabled(s))return;
 for(const f of Object.values(s.factions)){
  const r=f.research;
  if(!r||!Number.isSafeInteger(r.stage)||r.stage<0||r.stage>3||!Array.isArray(r.reachedTurns)||r.reachedTurns.length!==r.stage||r.reachedTurns.some((t,i)=>!Number.isSafeInteger(t)||t<1||t>s.turn||i>0&&t<r.reachedTurns[i-1])||!Number.isSafeInteger(f.science)||f.science<0)throw new Error('INVALID_CAMPAIGN_RESEARCH');
 }
 for(const c of Object.values(s.cities))if(c.populationCapacity!==cityPopulationCapacity(s,c)||c.population>c.populationCapacity||c.durabilityMax!==cityDurabilityMaximum(s,c)||c.facilities.filter(f=>f.kind==='workshop').length>C19.workshopLimit)throw new Error('INVALID_CAMPAIGN_C19_CITY');
}
export function specialMusterReserve(s,c,type){return specialTroop(s,type)?500:musterRequirement(s,c);}
// Use matching trained reserves first; never consume another special type.
export function sortieReserveLots(s,c,type){return domesticMusterLots(s,c).filter(l=>!l.identity.specialTroopId||l.identity.specialTroopId===type).sort((a,b)=>Number(b.identity.specialTroopId===type)-Number(a.identity.specialTroopId===type));}
const sortieReserveAvailable=(s,c,type)=>{
 const lots=sortieReserveLots(s,c,type),trained=lots.filter(l=>l.identity.specialTroopId).reduce((n,l)=>n+l.count,0);
 return trained+Math.min(domesticMusterAvailable(s,c),lots.filter(l=>!l.identity.specialTroopId).reduce((n,l)=>n+l.count,0));
};
export function sortieTroopRange(s,c,type){
 const bonus=(c20Enabled(s)&&c.ownerFactionId==='F03'?c.starMusterBonus??0:0)+c30MusterBonus(s,c.ownerFactionId,type);
 const target=type==='hubao'?500+bonus+C24.hubaoReserve:type==='qingzhou'?Math.floor((500+bonus)*C24.qingzhouCount):500+bonus;
 return {min:specialTroop(s,type)?500:200,max:Math.floor(Math.min(sortieReserveAvailable(s,c,type),Math.floor(target*uniqueMusterFactor(s,c)))/50)*50,step:50};
}
export function assignCityDepartment(s,{cityId,department,officerId=null},factionId=s.playerFactionId){
 initializeDomesticEngine(s);const c=s.cities[cityId];
 if(!domesticEngineEnabled(s)||c?.ownerFactionId!==factionId||!DEPARTMENTS[department])throw new Error('INVALID_CITY_DEPARTMENT');
 if(officerId!==null){if(!domesticOfficerPresent(s,c,officerId)||Object.values(s.cities).some(city=>city.governorId===officerId||city.absentGovernorId===officerId))throw new Error('INVALID_DEPARTMENT_OFFICER');clearDomesticOfficer(s,officerId);}
 c.departments[department]=officerId;return s;
}
export function transferCityOfficer(s,{officerId,fromCityId,toCityId},factionId=s.playerFactionId){
 initializeDomesticEngine(s);const o=s.officers[officerId],from=s.cities[fromCityId],to=s.cities[toCityId];
 const route=domesticEngineEnabled(s)&&from&&to&&from!==to&&from.ownerFactionId===factionId&&domesticOfficerPresent(s,from,officerId)&&citySupplyRoute(s,from,to);
 if(!route)throw new Error('INVALID_OFFICER_TRANSFER');
 clearDomesticOfficer(s,officerId);
 if(from.governorId===officerId){from.governorId=null;if(s.terminal)s.terminal.citiesById[fromCityId].governorId=null;}
 o.locationRef={kind:'NONE',id:null};o.travelState='TRAVELLING';terminalOfficer(s,o);
 s.officerTransfers.push({officerId,factionId,fromCityId,toCityId,departureTurn:s.turn,arrivalTurn:s.turn+(route.length-1<=C184.transferOneTurnDistance?1:2),state:'MOVING'});
 syncCampaignAdministrativeTerminal(s);return s;
}
export function settleOfficerTransfers(s){
 if(!domesticEngineEnabled(s))return;
 for(const t of s.officerTransfers??[]){
  if(t.state==='ARRIVED'||t.state==='CANCELLED')continue;const o=s.officers[t.officerId],from=s.cities[t.fromCityId],to=s.cities[t.toCityId];
  if(o?.lifeState!=='ALIVE'||o.captivityState!=='FREE'||o.allegianceFactionId!==t.factionId){t.state='CANCELLED';continue;}
  if(s.turn<t.arrivalTurn)continue;
  if(!citySupplyRoute(s,from,to)){
   t.state='BLOCKED';
   if(to?.ownerFactionId!==t.factionId&&from?.ownerFactionId===t.factionId){t.toCityId=t.fromCityId;t.arrivalTurn=s.turn+1;}
   continue;
  }
  o.locationRef={kind:'CITY',id:t.toCityId};o.travelState='STATIONARY';terminalOfficer(s,o);t.state='ARRIVED';t.arrivedTurn=s.turn;
  (s.administrationLog??=[]).push({turn:s.turn,factionId:t.factionId,text:`${o.name}: ${s.cityDisplayNames?.[t.toCityId]??to.name} 도착`});
 }
 syncCampaignAdministrativeTerminal(s);
}
function sortieTile(s,c,tileId){
 const occupied=new Set(Object.values(s.armies).filter(a=>a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE')).map(a=>a.tileId));
 const tiles=[c.tileId,...(c.footprint?.gates??[])];
 return (tileId===undefined?tiles:tiles.filter(id=>id===tileId)).find(id=>!occupied.has(id)&&!combatFireAt(s,id));
}
export function sortieReason(s,{cityId,officerId,troopType,troopCount,tileId},factionId=s.playerFactionId){
 const fail=(code,message)=>({code,message}),c=s.cities[cityId],o=s.officers[officerId];
 if(s.mapId==='v1'||!c||c.ownerFactionId!==factionId)return fail('SORTIE_CITY','출진할 아군 성이 없습니다.');
 if(!o||!freeCityOfficers(s,c).some(x=>x.officerId===officerId))return fail('SORTIE_OFFICER','출진 가능한 자유 장수가 없습니다.');
 const injury=injuryReason(s,officerId);if(injury)return fail('SORTIE_INJURY',injury);
 const fatigue=fatigueReason(s,officerId);if(fatigue)return fail('SORTIE_FATIGUE',fatigue);
 const regent=domesticMusterReason(s,officerId);if(regent)return fail('SORTIE_OFFICER',regent);
 troopType??=o.troopType;
 if(!officerTroopTypes(o).includes(parentTroop(troopType)))return fail('SORTIE_TROOP','이 장수는 해당 병종으로 출진할 수 없습니다.');
 const blocked=specialMusterReason(s,c,troopType)??cityJobReason(s,c,'muster');if(blocked)return fail('SORTIE_CONDITION',blocked);
 const range=sortieTroopRange(s,c,troopType);
 if(troopCount!==undefined&&!Number.isSafeInteger(troopCount))return fail('SORTIE_COUNT','병력 수를 정수로 고르십시오.');
 if(sortieReserveAvailable(s,c,troopType)<range.min||troopCount>sortieReserveAvailable(s,c,troopType))return fail('SORTIE_RESERVE',`예비병 부족 — 최소 ${troopText(range.min)}명 필요`);
 if(troopCount!==undefined&&(!Number.isSafeInteger(troopCount)||troopCount<range.min||troopCount>range.max||troopCount%range.step))return fail('SORTIE_COUNT',`병력은 ${troopText(range.min)}~${troopText(range.max)}명, ${troopText(range.step)}명 단위로 고르십시오.`);
 if(tileId!==undefined&&!sortieTile(s,c,tileId))return fail('SORTIE_GATE',![c.tileId,...(c.footprint?.gates??[])].includes(tileId)?'이 성의 성문이 아닙니다.':combatFireAt(s,tileId)?'불타는 칸':'그 문 앞에 부대가 있음');
 if(!sortieTile(s,c))return fail('SORTIE_TILE','빈 칸 없음 — 성 가운데와 성문이 모두 차 있습니다.');
 return null;
}
export function sortie(s,command,factionId=s.playerFactionId){
 const c=s.cities[command.cityId],o=s.officers[command.officerId],troopType=command.troopType??o?.troopType;
 const reason=sortieReason(s,{...command,troopType},factionId);
 if(reason)throw Object.assign(new Error(`${reason.code}: ${reason.message}`),{code:reason.code});
 const troopCount=command.troopCount??sortieTroopRange(s,c,troopType).max;
 const tileId=sortieTile(s,c,command.tileId);
 if(!completeMuster(s,c,{officerId:command.officerId,troopType,troopCount}))throw new Error(c.jobBlocked);
 // Keep legacy muster/AI placement intact; only the explicit SORTIE chooses a gate.
 if(command.tileId!==undefined){const a=s.armies[o.locationRef.id];a.tileId=tileId;a.facing=null;initializeArmyFacing(s);}
 s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId,text:`${o.name} 출진 — ${troopInfo(s,troopType).troopDisplayName} ${troopText(troopCount)}명`});
 return s;
}
export function musterTroopOptions(s,c,officerId){return [...(s.officers[officerId]?.allowedTroops??[]),...Object.keys(SPECIAL_TROOPS)].map(type=>{
 const range=sortieTroopRange(s,c,type),reason=sortieReason(s,{cityId:c.cityId,officerId,troopType:type},c.ownerFactionId);
 const count=range.max,perTurn=armyFoodPerTurn({troopCount:count},s)*fieldDrainTurns(s,{troopCount:count});
 return {...troopInfo(s,type),blockedReason:reason?.message??null,reasonCode:reason?.code??null,reserveRequired:range.min,troopCountRange:range,...(domesticEngineEnabled(s)?{fieldConsumption:{troopCount:count,perTurn,drainTurns:fieldDrainTurns(s,{troopCount:count}),label:'최대 병력으로 보급권 밖에서 차례당 소모'}}:{})};
});}
export function musterReason(s,c,officerId,troopType){
 return sortieReason(s,{cityId:c.cityId,officerId,troopType},c.ownerFactionId)?.message??null;
}
export function completeMuster(s,c,job){
 const failure=sortieReason(s,{cityId:c.cityId,...job},c.ownerFactionId),reason=failure?.message;if(reason){recordFatigueBlock(s,job.officerId);c.jobBlocked=reason;return false;}
 const occupied=new Set(Object.values(s.armies).filter(a=>a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE')).map(a=>a.tileId));
 const tileId=[c.tileId,...c.footprint.gates].find(id=>!occupied.has(id)&&!combatFireAt(s,id));if(!tileId){c.jobBlocked='MUSTER_TILE_WAIT';return false;}
 const range=sortieTroopRange(s,c,job.troopType),count=job.troopCount??range.max,bonus=(c20Enabled(s)&&c.ownerFactionId==='F03'?c.starMusterBonus??0:0)+c30MusterBonus(s,c.ownerFactionId,job.troopType),lots=sortieReserveLots(s,c,job.troopType);
 if(lots.reduce((n,l)=>n+l.count,0)<count){c.jobBlocked='MUSTER_LEDGER_RESERVE_REQUIRED';return false;}
 let remaining=count;for(const l of lots){const n=Math.min(l.count,remaining);l.count-=n;remaining-=n;if(l.kind==='WOUNDED'&&s.armies[l.originFormationId])s.armies[l.originFormationId].woundedCount=Math.max(0,s.armies[l.originFormationId].woundedCount-n);}
 s.musterSequence=(s.musterSequence??0)+1;const id=`U-C16-${s.musterSequence}`,o=s.officers[job.officerId];
 const a=structuredClone(Object.values(initial.world.armies)[0]);
 Object.assign(a,{armyId:id,factionId:c.ownerFactionId,commanderId:o.officerId,troopType:job.troopType,troopCount:count,woundedCount:0,deadCount:0,hp:count*2,maxHp:count*2,stamina:100,maxStamina:100,tileId,facing:null,formation:'ORDERED',morale:'STEADY',braced:false,movedTiles:0,supplyFood:0,statusEffects:[],cooldowns:[],currentOrder:null,movementState:null,retreatState:null,engagedArmyIds:[],effectStates:[],effectFirstAttackTurn:null,tacticReadyTurns:{},bornTurn:s.turn,mainActionTurn:s.turn,mainActionCount:0});
 delete a.movementProgress;delete a.tacticUsedTurn;delete a.ruleMovedTurn;
 if(job.troopType==='catapult')a.platformState='STOWED';
 c30MusterOrigin(s,c,a);domesticMuster(s,c,a);
 s.armies[id]=a;s.factions[c.ownerFactionId].armyIds.push(id);o.locationRef={kind:'ARMY',id};
 s.personnel.formations.push({formationId:id,nodeId:c.cityId,identity:{baseTroopId:troopToCampaign(job.troopType),specialTroopId:SPECIAL_TROOPS[job.troopType]?job.troopType:null},field:count,targetStrength:Math.max(count,specialTroop(s,job.troopType)?job.troopType==='wudang'?C24.wudangCount:job.troopType==='qingzhou'?Math.floor((500+bonus)*C24.qingzhouCount):job.troopType==='hubao'?500+bonus+C24.hubaoReserve:500+bonus:500+bonus),specialSupportAvailable:false});delete c.starMusterBonus;
 if(c.governorId===o.officerId){if(domesticEngineEnabled(s))c.absentGovernorId=o.officerId;c.governorId=null;if(s.terminal)s.terminal.citiesById[c.cityId].governorId=null;}
 if(s.terminal){s.terminal.armyOrder.push(id);s.terminal.armyOrder.sort();s.terminal.armiesById[id]={armyId:id,factionId:a.factionId,commanderId:o.officerId,disposition:'ACTIVE',terminalAtTick:null,terminalRecordId:null};terminalOfficer(s,o,o.locationRef);syncCampaignAdministrativeTerminal(s);}
 loadMusterSupply(s,a,c);syncResearchCities(s);initializeArmyFacing(s);initializeClasses(s);c.reserveTroops=ordinaryReserve(s).filter(l=>l.nodeId===c.cityId).reduce((n,l)=>n+l.count,0);if(specialTroop(s,job.troopType)){s.c24Stats??={musters:{},catapultCityDamage:0};s.c24Stats.musters[job.troopType]=(s.c24Stats.musters[job.troopType]??0)+1;}(s.c16Stats??={musters:0,wandererRecruitments:0}).musters++;observeRelationGroups(s);return true;
}
const garrisonCity=(s,a)=>Object.values(s.cities).find(c=>c.ownerFactionId===a?.factionId&&(c.tileId===a?.tileId||c.footprint?.gates?.includes(a?.tileId)));
export function garrisonReason(s,id){
 if(s.mapId==='v1')return 'MAP_V1';
 const a=s.armies[id];
 if(!a||s.terminal&&s.terminal.armiesById[id]?.disposition!=='ACTIVE')return 'INACTIVE';
 if(a.factionId!==s.playerFactionId)return 'NOT_PLAYER_ARMY';
 if(a.troopCount<=0)return 'NO_TROOPS';
 if(!garrisonCity(s,a))return 'NOT_AT_OWN_CITY';
 if(Object.values(s.armies).some(b=>b.factionId!==a.factionId&&b.troopCount>0&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1))return 'ENEMY_ADJACENT';
 return null;
}
export function garrisonArmy(s,id){
 if(garrisonReason(s,id))throw new Error('INVALID_GARRISON');
 return disbandIntoCity(s,s.armies[id],garrisonCity(s,s.armies[id]));
}
export function initializeCityStart(s){
 s.cityStart=true;
 for(const a of Object.values(s.armies))if(a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE'))disbandIntoCity(s,a,s.cities[s.factions[a.factionId].capitalCityId]);
 return s;
}
function disbandIntoCity(s,a,c){
 const id=a.armyId;
 s.terminal??=createCampaignTerminalStateFromWorld(s);
 const recordId=`REC.C16.GARRISON.${s.globalTick}.${id}`;
 s.terminal.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'ARMY_DISPOSITION',causeRecordIds:[],refs:{factionIds:[a.factionId],armyIds:[id],officerIds:[a.commanderId],cityIds:[c.cityId],choiceIds:[],prisonerRecordIds:[]},details:{disposition:'DISBANDED'}};
 Object.assign(s.terminal.armiesById[id],{disposition:'DISBANDED',terminalAtTick:s.globalTick,terminalRecordId:recordId});
 const lotId=`C16.GARRISON.${id}`;s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:troopToCampaign(a.troopType),specialTroopId:specialTroop(s,a.troopType)?a.troopType:null},originFormationId:null,count:a.troopCount});
 s.economy.lotFaction[lotId]=a.factionId;s.economy.recruitedReady[lotId]=!specialTroop(s,a.troopType);s.economy.readyAt[lotId]=s.turn;if(!specialTroop(s,a.troopType))c.reserveTroops+=a.troopCount;
 s.personnel.formations.find(f=>f.formationId===id).field=0;a.troopCount=0;a.hp=0;a.currentOrder=null;a.movementState=null;a.engagedArmyIds=[];
 const o=s.officers[a.commanderId];o.locationRef={kind:'CITY',id:c.cityId};terminalOfficer(s,o);
 if(domesticEngineEnabled(s))for(const city of Object.values(s.cities))if(city.absentGovernorId===o.officerId){city.absentGovernorId=null;if(city===c&&!c.governorId){c.governorId=o.officerId;s.terminal.citiesById[c.cityId].governorId=o.officerId;terminalOfficer(s,o,o.locationRef);}}
 delete s.moveOrders[id];s.orderQueue=s.orderQueue.filter(x=>x!==id);if(s.ui?.selectedArmyId===id)s.ui.selectedArmyId=null;
 for(const b of Object.values(s.armies))b.engagedArmyIds=b.engagedArmyIds.filter(x=>x!==id);
 syncCampaignAdministrativeTerminal(s);return s;
}
export function recruitWanderer(s,{officerId,cityId},factionId=s.playerFactionId){
 const o=s.wanderers?.[officerId],c=s.cities[cityId];
 if(s.mapId==='v1'||!o||o.locationRef.id!==cityId||c?.ownerFactionId!==factionId||Object.values(s.captiveRecruitment.proposals).some(p=>p.targetOfficerId===officerId&&p.status==='NEGOTIATING'))throw new Error('INVALID_WANDERER_RECRUITMENT');
 for(const [id,f] of Object.entries(s.factions))s.captiveRecruitment.factions[id].prestige=f.prestige;
 s.captiveSequence=(s.captiveSequence??0)+1;
 s.captiveRecruitment=reserveRecruitmentProposal(s.captiveRecruitment,{proposalId:`C16.${s.captiveSequence}`,factionId,...c29RecruitAgent(s,c),targetOfficerId:officerId,sourceFactionId:null,candidateSourceRef:cityId,cost:cityRecruitCost(s,cityId,factionId,officerId),tieBreakPriority:s.captiveSequence,createdTurn:s.turn});return s;
}
export function adoptWanderer(s,proposal){
 const o=s.wanderers[proposal.targetOfficerId];const former=s.officers[o.officerId]?.allegianceFactionId;if(former)s.factions[former].officerIds=s.factions[former].officerIds.filter(id=>id!==o.officerId);delete s.wanderers[o.officerId];o.allegianceFactionId=proposal.factionId;s.officers[o.officerId]=o;if(!s.factions[proposal.factionId].officerIds.includes(o.officerId))s.factions[proposal.factionId].officerIds.push(o.officerId);
 const destination=s.c26?.remoteProposals?.[proposal.proposalId];if(destination)o.locationRef={kind:'CITY',id:destination};
 terminalOfficer(s,o);domesticJoinedWanderer(s,o.officerId);syncCampaignAdministrativeTerminal(s);initializeCampaignGrowth(s,{...rosterPacks,...domesticTalentPacks});domesticRecruit(s,s.cities[destination??proposal.candidateSourceRef],o.officerId);c34Joined(s,s.cities[destination??proposal.candidateSourceRef],o.officerId);(s.c16Stats??={musters:0,wandererRecruitments:0}).wandererRecruitments++;
}
export function selectCityStartMuster(s,factionId,chooseTroop=null){
 if(!s.cityStart||s.mapId==='v1'||Object.values(s.armies).some(a=>a.factionId===factionId&&a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE')))return;
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).sort((a,b)=>a.cityId.localeCompare(b.cityId))){
  if(c.currentProduction?.kind==='muster')return;
  if(cityJobReason(s,c,'muster'))continue;
  for(const o of freeCityOfficers(s,c).sort((a,b)=>Number(a.officerId===c.governorId)-Number(b.officerId===c.governorId)||a.officerId.localeCompare(b.officerId))){
   const troopType=chooseTroop?chooseTroop(s,c,o):o.allowedTroops.find(type=>!musterReason(s,c,o.officerId,type));
   if(troopType){selectCityJob(s,{cityId:c.cityId,kind:'muster',officerId:o.officerId,troopType},factionId);return;}
  }
 }
}
export function selectAiRoster(s,factionId){
 if(s.mapId==='v1')return;
 for(const o of Object.values(s.wanderers))if(s.cities[o.locationRef.id].ownerFactionId===factionId){
  const wallet=s.captiveRecruitment.factions[factionId];if(s.factions[factionId].prestige-wallet.reservedPrestige>=cityRecruitCost(s,o.locationRef.id,factionId,o.officerId)&&!Object.values(s.captiveRecruitment.proposals).some(p=>p.targetOfficerId===o.officerId&&p.status==='NEGOTIATING'))recruitWanderer(s,{officerId:o.officerId,cityId:o.locationRef.id},factionId);
 }
 for(const c of Object.values(s.cities))if(c.ownerFactionId===factionId&&!c.governorId&&!(domesticEngineEnabled(s)&&c.absentGovernorId)&&c.occupationState==='NORMAL'){
  const o=freeCityOfficers(s,c,{includeGovernor:false}).sort((a,b)=>b.baseStats.politics-a.baseStats.politics||a.officerId.localeCompare(b.officerId))[0];
  if(o){if(domesticEngineEnabled(s))clearDomesticOfficer(s,o.officerId);c.governorId=o.officerId;domesticGovernor(s,c);syncResearchCities(s);terminalOfficer(s,o,o.locationRef);if(s.terminal){s.terminal.citiesById[c.cityId].governorId=o.officerId;syncCampaignAdministrativeTerminal(s);}}
 }
}

const domesticTalentPacks=Object.fromEntries([talentG01,talentG02,talentG03,talentG04,talentG05,talentG06,talentG07,talentG08,talentG09,talentG10,talentG11,talentG12,talentG13,talentG14,talentG15,talentG16,talentG17,talentG18,talentG19,talentG20,talentG21,talentG22,talentG23,talentG24,talentG25,talentG26,talentG27,talentG28,talentG29,talentG30,talentG31,talentG32,talentG33,talentG34,talentG35,talentG36,talentG37,talentG38,talentG39,talentG40,talentG41,talentG42,talentG43,talentG44,talentG45,talentG46,talentG47,talentG48,talentG49,talentG50].map(p=>[p.id,p]));

export function configureRosterDomestic(){configureDomesticTalent(domesticTalentPacks,officerFromPack);}
