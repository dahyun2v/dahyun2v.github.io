import {validateState as validateFirst3State} from './first3.mjs';
import {
  createCitySettlementState,
  deserializeCitySettlement,
  serializeCitySettlement,
  settleCityTurn,
  validateCitySettlementState,
} from './city-settlement.mjs';

const FORMAT='sangoku-city-settlement-world';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=8_000_000;
const ID_PATTERN=/^[A-Za-z0-9._:-]+$/;
const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const near=(left,right)=>Math.abs(left-right)<1e-9;
const round=value=>Number(value.toFixed(6));
function invariant(condition,message){if(!condition)throw new Error(message);}
function stableId(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a stable ID`);return value;}
function amount(value,label){invariant(typeof value==='number'&&Number.isFinite(value)&&value>=0,`${label} must be a non-negative finite number`);return value;}
function globalTick(world){return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;}

function validateEconomy(economy){
  invariant(object(economy)&&economy.version==='city-economy-v1','INVALID_CITY_ECONOMY_VERSION');
  invariant(object(economy.center)&&object(economy.tiles)&&object(economy.governor)&&object(economy.unrest)&&object(economy.chaos),'INVALID_CITY_ECONOMY_CONTENT');
  for(const key of ['food','production','science','fame'])amount(economy.center[key],`economy.center.${key}`);
  amount(economy.citizen_food,'economy.citizen_food');amount(economy.soldier_food_per_1000,'economy.soldier_food_per_1000');amount(economy.growth_food_per_current_citizen,'economy.growth_food_per_current_citizen');
  amount(economy.no_food_production_multiplier,'economy.no_food_production_multiplier');for(const state of ['unrest','chaos'])for(const key of ['production','science','fame','growth'])amount(economy[state][key],`economy.${state}.${key}`);
  amount(economy.governor.major_bonus_at_100,'economy.governor.major_bonus_at_100');
  invariant(Array.isArray(economy.governor.secondary_thresholds)&&Array.isArray(economy.governor.secondary_bonuses)&&economy.governor.secondary_thresholds.length===economy.governor.secondary_bonuses.length,'INVALID_CITY_ECONOMY_SECONDARY_BONUS');
  return economy;
}

function secondaryBonus(economy,value){
  let bonus=0;
  for(let index=0;index<economy.governor.secondary_thresholds.length;index++)if(value>=economy.governor.secondary_thresholds[index])bonus=economy.governor.secondary_bonuses[index];
  return bonus;
}

function nationBonus(world,factionId,economy){
  const total=Object.values(world.officers).filter(officer=>officer.allegianceFactionId===factionId).reduce((sum,officer)=>sum+Object.values(officer.baseStats).reduce((part,value)=>part+value,0),0);
  return Math.min(economy.nation_bonus_cap,Math.floor(total/100)*economy.nation_bonus_per_100_total_ability);
}

function outputBonus(world,city,economy,majorKey,secondaryKey){
  const governor=world.officers[city.governorId];
  invariant(governor&&governor.allegianceFactionId===city.ownerFactionId,`CITY_GOVERNOR_UNAVAILABLE:${city.cityId}`);
  return governor.baseStats[majorKey]/100*economy.governor.major_bonus_at_100+secondaryBonus(economy,governor.subStats[secondaryKey])+nationBonus(world,city.ownerFactionId,economy);
}

function securityProfile(city,economy){
  if(city.security==='STABLE')return {production:1,science:1,prestige:1,growth:1};
  if(city.security==='UNREST')return {production:economy.unrest.production,science:economy.unrest.science,prestige:economy.unrest.fame,growth:economy.unrest.growth};
  if(city.security==='CHAOS')return {production:economy.chaos.production,science:economy.chaos.science,prestige:economy.chaos.fame,growth:economy.chaos.growth};
  throw new Error(`CITY_SECURITY_UNSUPPORTED:${city.cityId}:${city.security}`);
}

function supportedTroops(world,city){
  const owned=world.factions[city.ownerFactionId].ownedCityIds;
  let fieldArmies=Object.values(world.armies).filter(army=>army.factionId===city.ownerFactionId&&(!world.campaignTerminalWorld||world.campaignTerminalWorld.armiesById[army.armyId]?.disposition==='ACTIVE'));
  if(owned.length>1){
    invariant(fieldArmies.every(army=>typeof army.supportCityId==='string'),`CITY_ARMY_SUPPORT_ASSIGNMENT_REQUIRED:${city.ownerFactionId}`);
    fieldArmies=fieldArmies.filter(army=>army.supportCityId===city.cityId);
  }
  return fieldArmies.reduce((sum,army)=>sum+army.troopCount+army.woundedCount,0)+city.reserveTroops+city.woundedTroops;
}

export function deriveCityTurnEconomy(world,cityId,economy){
  validateFirst3State(world);validateEconomy(economy);
  const city=world.cities[cityId];invariant(city,`WORLD_CITY_NOT_FOUND:${cityId}`);
  let baseFood=economy.center.food,baseProduction=economy.center.production,baseScience=economy.center.science;
  for(const tileId of city.workedTiles){
    const terrain=world.tiles[tileId]?.terrainType,yieldValue=economy.tiles[terrain];
    invariant(yieldValue,`CITY_WORKED_TILE_YIELD_MISSING:${cityId}:${tileId}:${terrain}`);
    baseFood+=yieldValue.food;baseProduction+=yieldValue.production;baseScience+=yieldValue.science;
  }
  const security=securityProfile(city,economy);
  const producedFood=round(baseFood*(1+outputBonus(world,city,economy,'politics','농정')));
  const producedProduction=round(baseProduction*(1+outputBonus(world,city,economy,'politics','행정'))*security.production);
  const producedScience=round(baseScience*(1+outputBonus(world,city,economy,'intelligence','간파'))*security.science);
  const producedPrestige=round(economy.center.fame*(1+outputBonus(world,city,economy,'charisma','친화'))*security.prestige);
  const supportedSoldiers=supportedTroops(world,city);
  const consumptionRequired=round(city.population*economy.citizen_food+supportedSoldiers/1000*economy.soldier_food_per_1000);
  return {cityId,baseFood,baseProduction,baseScience,producedFood,producedProduction,producedScience,producedPrestige,growthMultiplier:security.growth,supportedSoldiers,consumptionRequired};
}

function availableFood(city){return round(city.foodStock-city.reservedResources.food);}
function citySidecar(world,city){return createCitySettlementState({cityId:city.cityId,ownerFactionId:city.ownerFactionId,foodStock:availableFood(city),productionProgress:city.productionProgress,growthProgress:city.growthProgress??0});}

function assertCitySynchronization(world,states){
  invariant(Object.keys(states).sort().join('|')===Object.keys(world.cities).sort().join('|'),'CITY_WORLD_CITY_SET_MISMATCH');
  for(const[cityId,city]of Object.entries(world.cities)){
    const state=states[cityId];validateCitySettlementState(state);
    invariant(state.cityId===cityId,`CITY_WORLD_STATE_ID_MISMATCH:${cityId}`);
    invariant(state.ownerFactionId===city.ownerFactionId,`CITY_WORLD_OWNER_CONFLICT:${cityId}`);
    invariant(near(state.foodStock,availableFood(city)),`CITY_WORLD_FOOD_CONFLICT:${cityId}`);
    invariant(near(state.productionProgress,city.productionProgress),`CITY_WORLD_PRODUCTION_CONFLICT:${cityId}`);
    invariant(near(state.growthProgress,city.growthProgress??0),`CITY_WORLD_GROWTH_CONFLICT:${cityId}`);
  }
}

export function validateCitySettlementWorldSnapshot(snapshot){
  invariant(object(snapshot)&&snapshot.format===FORMAT&&snapshot.version===VERSION,'INVALID_CITY_SETTLEMENT_WORLD_FORMAT');
  invariant(object(snapshot.world)&&object(snapshot.economy)&&object(snapshot.cityStates)&&object(snapshot.processedEvents),'INVALID_CITY_SETTLEMENT_WORLD_CONTENT');
  validateFirst3State(snapshot.world);validateEconomy(snapshot.economy);assertCitySynchronization(snapshot.world,snapshot.cityStates);
  invariant(snapshot.world.turnPhase==='PLANNING'&&snapshot.world.time.tick===0,'CITY_WORLD_REQUIRES_TURN_BOUNDARY');
  for(const[eventId,event]of Object.entries(snapshot.processedEvents)){
    stableId(eventId,'processed eventId');invariant(event.eventId===eventId&&Number.isInteger(event.turn)&&event.turn>=1,`CITY_WORLD_EVENT_INVALID:${eventId}`);
    invariant(object(event.results),'CITY_WORLD_EVENT_RESULTS_MISSING');
    for(const cityId of Object.keys(snapshot.world.cities)){
      const ledger=snapshot.cityStates[cityId].processedSettlementIds[`${eventId}:${cityId}`];invariant(ledger,`CITY_WORLD_EVENT_SETTLEMENT_MISSING:${eventId}:${cityId}`);
      invariant(event.turn===ledger.input.turn,`CITY_WORLD_EVENT_TURN_MISMATCH:${eventId}:${cityId}`);const eventResult=event.results[cityId];invariant(object(eventResult),`CITY_WORLD_EVENT_RESULT_MISSING:${eventId}:${cityId}`);
      for(const[key,value]of Object.entries(ledger.result))invariant(same(eventResult[key],value),`CITY_WORLD_EVENT_RESULT_CONFLICT:${eventId}:${cityId}:${key}`);
    }
  }
  return snapshot;
}

export function createCitySettlementWorldSnapshot({world,economy}={}){
  validateFirst3State(world);validateEconomy(economy);invariant(world.turnPhase==='PLANNING'&&world.time.tick===0,'CITY_WORLD_REQUIRES_TURN_BOUNDARY');
  const nextWorld=clone(world);for(const city of Object.values(nextWorld.cities))if(city.growthProgress===undefined)city.growthProgress=0;
  const cityStates=Object.fromEntries(Object.values(nextWorld.cities).map(city=>[city.cityId,citySidecar(nextWorld,city)]));
  return validateCitySettlementWorldSnapshot({format:FORMAT,version:VERSION,world:nextWorld,economy:clone(economy),cityStates,processedEvents:{}});
}

function assertOpeningCityUnchanged(previous,target){
  for(const key of ['foodStock','foodCapacity','population','populationCapacity','productionProgress'])invariant(near(previous[key],target[key]),`CITY_WORLD_OPENING_DRIFT:${target.cityId}:${key}`);
  invariant(same(previous.reservedResources,target.reservedResources),`CITY_WORLD_OPENING_DRIFT:${target.cityId}:reservedResources`);
  invariant(near(previous.growthProgress??0,target.growthProgress??previous.growthProgress??0),`CITY_WORLD_OPENING_DRIFT:${target.cityId}:growthProgress`);
  if(previous.ownerFactionId===target.ownerFactionId){
    invariant(previous.governorId===target.governorId,`CITY_WORLD_OPENING_DRIFT:${target.cityId}:governorId`);
    invariant(same(previous.workedTiles,target.workedTiles),`CITY_WORLD_OPENING_DRIFT:${target.cityId}:workedTiles`);
    invariant(same(previous.currentProduction,target.currentProduction),`CITY_WORLD_OPENING_DRIFT:${target.cityId}:currentProduction`);
  }
}

export function settleCityWorldTurn(snapshot,{eventId,world}={}){
  validateCitySettlementWorldSnapshot(snapshot);stableId(eventId,'eventId');validateFirst3State(world);
  const existing=snapshot.processedEvents[eventId];
  if(existing){invariant(same(world,snapshot.world),`CONFLICTING_CITY_WORLD_EVENT_REPLAY:${eventId}`);return {snapshot:clone(snapshot),results:clone(existing.results)};}
  invariant(world.turnPhase==='PLANNING'&&world.time.tick===0,'CITY_WORLD_TARGET_NOT_TURN_BOUNDARY');
  invariant(globalTick(world)===globalTick(snapshot.world)+snapshot.world.time.ticksPerTurn,'CITY_WORLD_TARGET_NOT_NEXT_TURN');
  const settlementTurn=world.turnNumber-1;
  const nextWorld=clone(world),nextStates=clone(snapshot.cityStates),results={};
  for(const cityId of Object.keys(nextWorld.cities).sort()){
    const previousCity=snapshot.world.cities[cityId],city=nextWorld.cities[cityId];invariant(previousCity,`CITY_WORLD_CITY_ADDED:${cityId}`);
    if(city.growthProgress===undefined)city.growthProgress=previousCity.growthProgress??0;
    assertOpeningCityUnchanged(previousCity,city);
    const derived=deriveCityTurnEconomy(nextWorld,cityId,snapshot.economy),isNormal=city.occupationState==='NORMAL';
    const consumptionRequired=derived.consumptionRequired,openingAvailable=availableFood(city),availableCapacity=city.foodCapacity-city.reservedResources.food;
    const effectiveFoodProduction=round(Math.min(derived.producedFood,Math.max(0,availableCapacity-openingAvailable+consumptionRequired)));
    const growthProgressGain=round(Math.max(0,derived.producedFood-consumptionRequired)*derived.growthMultiplier);
    const hasShortage=openingAvailable+effectiveFoodProduction<consumptionRequired;
    const productionProgressGain=city.currentProduction===null?0:round(derived.producedProduction*(hasShortage?snapshot.economy.no_food_production_multiplier:1));
    const settlement=settleCityTurn(nextStates[cityId],{
      settlementId:`${eventId}:${cityId}`,turn:settlementTurn,ownerFactionId:city.ownerFactionId,occupationStatus:city.occupationState,
      ownershipChangedThisTurn:previousCity.ownerFactionId!==city.ownerFactionId,producedFood:effectiveFoodProduction,consumptionRequired,inboundShipments:[],
      productionProgressGain,growthProgressGain,
      growthResolution:{population:city.population,populationCapacity:city.populationCapacity,foodCost:round(city.population*snapshot.economy.growth_food_per_current_citizen)},
    });
    nextStates[cityId]=settlement.state;city.foodStock=round(city.reservedResources.food+settlement.state.foodStock);city.productionProgress=settlement.state.productionProgress;city.growthProgress=settlement.state.growthProgress;city.population+=settlement.result.populationGain;
    const appliedScience=isNormal?derived.producedScience:0,appliedPrestige=isNormal?derived.producedPrestige:0;
    nextWorld.factions[city.ownerFactionId].science=round(nextWorld.factions[city.ownerFactionId].science+appliedScience);nextWorld.factions[city.ownerFactionId].prestige=round(nextWorld.factions[city.ownerFactionId].prestige+appliedPrestige);
    results[cityId]={...settlement.result,derivedEconomy:derived,effectiveFoodProduction,appliedScience,appliedPrestige,closingPopulation:city.population,reservedFoodPreserved:city.reservedResources.food};
  }
  const next={format:FORMAT,version:VERSION,world:nextWorld,economy:clone(snapshot.economy),cityStates:nextStates,processedEvents:{...clone(snapshot.processedEvents),[eventId]:{eventId,turn:settlementTurn,results:clone(results)}}};
  return {snapshot:validateCitySettlementWorldSnapshot(next),results:clone(results)};
}

export function serializeCitySettlementWorldSnapshot(snapshot){
  validateCitySettlementWorldSnapshot(snapshot);
  const encodedStates=Object.fromEntries(Object.entries(snapshot.cityStates).map(([cityId,state])=>[cityId,JSON.parse(serializeCitySettlement(state)).state]));
  return JSON.stringify({...snapshot,cityStates:encodedStates},null,2);
}

export function deserializeCitySettlementWorldSnapshot(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_CITY_SETTLEMENT_WORLD_SERIALIZED_INPUT');
  let snapshot;try{snapshot=JSON.parse(serialized);}catch{throw new Error('INVALID_CITY_SETTLEMENT_WORLD_JSON');}
  invariant(object(snapshot?.cityStates),'INVALID_CITY_SETTLEMENT_WORLD_CONTENT');
  snapshot.cityStates=Object.fromEntries(Object.entries(snapshot.cityStates).map(([cityId,state])=>[cityId,deserializeCitySettlement(JSON.stringify({format:'sangoku-city-settlement',version:1,state}))]));
  return clone(validateCitySettlementWorldSnapshot(snapshot));
}

export const CITY_SETTLEMENT_WORLD_FORMAT=FORMAT;
export const CITY_SETTLEMENT_WORLD_VERSION=VERSION;
