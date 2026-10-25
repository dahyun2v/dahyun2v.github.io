const FORMAT='sangoku-city-settlement';
const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:-]+$/;
const OCCUPATION_STATUSES=new Set(['NORMAL','OCCUPIED','PACIFICATION','STABILIZING']);

function invariant(condition,message){if(!condition)throw new Error(message);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a non-empty stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function amount(value,label){invariant(typeof value==='number'&&Number.isFinite(value)&&value>=0,`${label} must be a non-negative finite number`);return value;}
function clone(value){return structuredClone(value);}
function own(object,key){return Object.hasOwn(object,key);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function rounded(value){return Number(value.toFixed(9));}
function near(a,b){return Math.abs(a-b)<1e-8;}

function normalizeShipment(input){
  invariant(input&&typeof input==='object','inbound shipment is required');
  const status=input.status??'COMMITTED';
  invariant(['COMMITTED','CANCELLED','RETURNING'].includes(status),`INVALID_SHIPMENT_STATUS:${status}`);
  invariant(typeof input.arrived==='boolean','shipment.arrived must be boolean');
  return {
    shipmentId:id(input.shipmentId,'shipmentId'),
    recipientCityId:id(input.recipientCityId,'recipientCityId'),
    recipientFactionId:id(input.recipientFactionId,'recipientFactionId'),
    amount:amount(input.amount,'shipment.amount'),
    status,
    arrived:input.arrived,
  };
}

function normalizeSettlementInput(input){
  invariant(input&&typeof input==='object','settlement input is required');
  const occupationStatus=input.occupationStatus;
  invariant(OCCUPATION_STATUSES.has(occupationStatus),`INVALID_OCCUPATION_STATUS:${occupationStatus}`);
  invariant(typeof input.ownershipChangedThisTurn==='boolean','ownershipChangedThisTurn must be boolean');
  invariant(Array.isArray(input.inboundShipments??[]),'inboundShipments must be an array');
  const inboundShipments=(input.inboundShipments??[]).map(normalizeShipment).sort((a,b)=>a.shipmentId.localeCompare(b.shipmentId));
  invariant(new Set(inboundShipments.map(item=>item.shipmentId)).size===inboundShipments.length,'duplicate shipmentId in settlement input');
  let growthResolution=null;
  if(input.growthResolution!==undefined&&input.growthResolution!==null){
    invariant(input.growthResolution&&typeof input.growthResolution==='object','growthResolution must be an object');
    const population=uint(input.growthResolution.population,'growthResolution.population');
    const populationCapacity=uint(input.growthResolution.populationCapacity,'growthResolution.populationCapacity');
    invariant(population>=1&&populationCapacity>=population,'growthResolution population/capacity is invalid');
    growthResolution={population,populationCapacity,foodCost:amount(input.growthResolution.foodCost,'growthResolution.foodCost')};
    invariant(growthResolution.foodCost>0,'growthResolution.foodCost must be positive');
  }
  return {
    settlementId:id(input.settlementId,'settlementId'),
    turn:uint(input.turn,'turn'),
    ownerFactionId:id(input.ownerFactionId,'ownerFactionId'),
    occupationStatus,
    ownershipChangedThisTurn:input.ownershipChangedThisTurn,
    producedFood:amount(input.producedFood??0,'producedFood'),
    consumptionRequired:amount(input.consumptionRequired??0,'consumptionRequired'),
    inboundShipments,
    productionProgressGain:amount(input.productionProgressGain??0,'productionProgressGain'),
    growthProgressGain:amount(input.growthProgressGain??0,'growthProgressGain'),
    growthResolution,
  };
}

export function createCitySettlementState({cityId,ownerFactionId,foodStock=0,productionProgress=0,growthProgress=0}={}){
  return {
    schemaVersion:VERSION,
    cityId:id(cityId,'cityId'),
    ownerFactionId:id(ownerFactionId,'ownerFactionId'),
    foodStock:amount(foodStock,'foodStock'),
    productionProgress:amount(productionProgress,'productionProgress'),
    growthProgress:amount(growthProgress,'growthProgress'),
    lastSettledTurn:null,
    processedSettlementIds:{},
    processedInboundIds:{},
  };
}

export function settleCityTurn(state,input){
  validateCitySettlementState(state);
  const normalized=normalizeSettlementInput(input);
  const existing=state.processedSettlementIds[normalized.settlementId];
  if(existing){
    invariant(same(existing.input,normalized),`CONFLICTING_SETTLEMENT_REPLAY:${normalized.settlementId}`);
    return {state:clone(state),result:clone(existing.result)};
  }
  invariant(state.lastSettledTurn===null||normalized.turn>state.lastSettledTurn,`SETTLEMENT_TURN_NOT_FORWARD:${normalized.turn}`);
  const ownerChanged=state.ownerFactionId!==normalized.ownerFactionId;
  invariant(!ownerChanged||normalized.ownershipChangedThisTurn,'OWNER_CHANGE_FLAG_MISMATCH');

  const next=clone(state);
  next.ownerFactionId=normalized.ownerFactionId;
  const isNormal=normalized.occupationStatus==='NORMAL';
  const appliedFoodProduction=isNormal?normalized.producedFood:0;
  let available=rounded(next.foodStock+appliedFoodProduction);
  const inbound=[];

  for(const shipment of normalized.inboundShipments){
    let reason=null;
    if(own(next.processedInboundIds,shipment.shipmentId)){
      invariant(same(next.processedInboundIds[shipment.shipmentId].shipment,shipment),`CONFLICTING_SHIPMENT_REPLAY:${shipment.shipmentId}`);
      reason='ALREADY_PROCESSED';
    }
    else if(shipment.status!=='COMMITTED')reason=`SHIPMENT_${shipment.status}`;
    else if(!shipment.arrived)reason='NOT_ARRIVED';
    else if(shipment.recipientCityId!==next.cityId)reason='RECIPIENT_CITY_MISMATCH';
    else if(shipment.recipientFactionId!==normalized.ownerFactionId)reason='RECIPIENT_OWNER_MISMATCH';
    if(reason){inbound.push({shipmentId:shipment.shipmentId,applied:0,reason});continue;}
    available=rounded(available+shipment.amount);
    next.processedInboundIds[shipment.shipmentId]={settlementId:normalized.settlementId,turn:normalized.turn,shipment:clone(shipment)};
    inbound.push({shipmentId:shipment.shipmentId,applied:shipment.amount,reason:null});
  }

  const availableBeforeConsumption=available;
  const actualConsumed=Math.min(normalized.consumptionRequired,available);
  const shortage=rounded(normalized.consumptionRequired-actualConsumed);
  next.foodStock=rounded(available-actualConsumed);
  const appliedProductionProgressGain=isNormal?normalized.productionProgressGain:0;
  const appliedGrowthProgressGain=isNormal&&!normalized.ownershipChangedThisTurn?normalized.growthProgressGain:0;
  next.productionProgress=rounded(next.productionProgress+appliedProductionProgressGain);
  next.growthProgress=rounded(next.growthProgress+appliedGrowthProgressGain);
  let populationGain=0,growthFoodConsumed=0,growthProgressConsumed=0;
  if(isNormal&&!normalized.ownershipChangedThisTurn&&normalized.growthResolution!==null){
    const resolution=normalized.growthResolution;
    if(resolution.population>=resolution.populationCapacity){growthProgressConsumed=next.growthProgress;next.growthProgress=0;}
    else if(next.growthProgress>=resolution.foodCost&&next.foodStock>=resolution.foodCost){
      populationGain=1;growthFoodConsumed=resolution.foodCost;growthProgressConsumed=resolution.foodCost;
      next.foodStock=rounded(next.foodStock-growthFoodConsumed);next.growthProgress=rounded(next.growthProgress-growthProgressConsumed);
    }
  }

  const result={
    settlementId:normalized.settlementId,
    turn:normalized.turn,
    openingOwnerFactionId:state.ownerFactionId,
    ownerFactionId:normalized.ownerFactionId,
    occupationStatus:normalized.occupationStatus,
    openingFoodStock:state.foodStock,
    requestedFoodProduction:normalized.producedFood,
    appliedFoodProduction,
    inbound,
    inboundApplied:rounded(inbound.reduce((sum,item)=>sum+item.applied,0)),
    availableBeforeConsumption,
    consumptionRequired:normalized.consumptionRequired,
    actualConsumed,
    shortage,
    closingFoodStock:next.foodStock,
    requestedProductionProgressGain:normalized.productionProgressGain,
    appliedProductionProgressGain,
    openingProductionProgress:state.productionProgress,
    closingProductionProgress:next.productionProgress,
    requestedGrowthProgressGain:normalized.growthProgressGain,
    appliedGrowthProgressGain,
    growthResolution:clone(normalized.growthResolution),
    populationGain,
    growthFoodConsumed,
    growthProgressConsumed,
    openingGrowthProgress:state.growthProgress,
    closingGrowthProgress:next.growthProgress,
  };
  next.processedSettlementIds[normalized.settlementId]={input:normalized,result};
  next.lastSettledTurn=normalized.turn;
  validateCitySettlementState(next);
  return {state:next,result:clone(result)};
}

export function serializeCitySettlement(state){
  validateCitySettlementState(state);
  return JSON.stringify({format:FORMAT,version:VERSION,state});
}

export function deserializeCitySettlement(serialized){
  invariant(typeof serialized==='string','serialized settlement must be a string');
  let payload;
  try{payload=JSON.parse(serialized);}catch{throw new Error('INVALID_CITY_SETTLEMENT_JSON');}
  invariant(payload?.format===FORMAT,'INVALID_CITY_SETTLEMENT_FORMAT');
  invariant(payload.version===VERSION,'UNSUPPORTED_CITY_SETTLEMENT_VERSION');
  validateCitySettlementState(payload.state);
  return clone(payload.state);
}

export function validateCitySettlementState(state){
  invariant(state&&typeof state==='object','city settlement state is required');
  invariant(state.schemaVersion===VERSION,'UNSUPPORTED_CITY_SETTLEMENT_STATE_VERSION');
  id(state.cityId,'cityId');id(state.ownerFactionId,'ownerFactionId');
  amount(state.foodStock,'foodStock');amount(state.productionProgress,'productionProgress');amount(state.growthProgress,'growthProgress');
  invariant(state.lastSettledTurn===null||(Number.isInteger(state.lastSettledTurn)&&state.lastSettledTurn>=0),'lastSettledTurn must be null or a non-negative integer');
  invariant(state.processedSettlementIds&&typeof state.processedSettlementIds==='object','processedSettlementIds is required');
  invariant(state.processedInboundIds&&typeof state.processedInboundIds==='object','processedInboundIds is required');
  const seenTurns=new Set();
  for(const[settlementId,entry]of Object.entries(state.processedSettlementIds)){
    id(settlementId,'processed settlementId');
    invariant(entry?.input?.settlementId===settlementId,`SETTLEMENT_KEY_MISMATCH:${settlementId}`);
    normalizeSettlementInput(entry.input);
    invariant(entry.result?.settlementId===settlementId,`SETTLEMENT_RESULT_MISMATCH:${settlementId}`);
    id(entry.result.openingOwnerFactionId,'openingOwnerFactionId');
    invariant(entry.result.turn===entry.input.turn,`SETTLEMENT_TURN_MISMATCH:${settlementId}`);
    invariant(!seenTurns.has(entry.input.turn),`DUPLICATE_CITY_SETTLEMENT_TURN:${entry.input.turn}`);seenTurns.add(entry.input.turn);
    invariant(entry.result.ownerFactionId===entry.input.ownerFactionId,`SETTLEMENT_OWNER_MISMATCH:${settlementId}`);
    invariant(entry.result.openingOwnerFactionId===entry.input.ownerFactionId||entry.input.ownershipChangedThisTurn,`OWNER_CHANGE_FLAG_LEDGER_MISMATCH:${settlementId}`);
    const growthFoodConsumed=entry.result.growthFoodConsumed??0,growthProgressConsumed=entry.result.growthProgressConsumed??0;
    amount(growthFoodConsumed,'result growthFoodConsumed');amount(growthProgressConsumed,'result growthProgressConsumed');
    const populationGain=entry.result.populationGain??0;invariant(populationGain===0||populationGain===1,`SETTLEMENT_POPULATION_GAIN_INVALID:${settlementId}`);
    if(entry.input.growthResolution===null){invariant(populationGain===0&&growthFoodConsumed===0&&growthProgressConsumed===0,`SETTLEMENT_UNEXPECTED_GROWTH_RESOLUTION:${settlementId}`);}
    else if(populationGain===1){invariant(near(growthFoodConsumed,entry.input.growthResolution.foodCost)&&near(growthProgressConsumed,entry.input.growthResolution.foodCost),`SETTLEMENT_GROWTH_COST_MISMATCH:${settlementId}`);invariant(entry.input.growthResolution.population<entry.input.growthResolution.populationCapacity,`SETTLEMENT_GROWTH_AT_CAP:${settlementId}`);}
    else{invariant(growthFoodConsumed===0,`SETTLEMENT_GROWTH_FOOD_WITHOUT_POPULATION:${settlementId}`);if(entry.input.growthResolution.population<entry.input.growthResolution.populationCapacity)invariant(growthProgressConsumed===0,`SETTLEMENT_GROWTH_PROGRESS_WITHOUT_POPULATION:${settlementId}`);}
    invariant(near(entry.result.openingFoodStock+entry.result.appliedFoodProduction+entry.result.inboundApplied-entry.result.actualConsumed-growthFoodConsumed,entry.result.closingFoodStock),`SETTLEMENT_FOOD_LEDGER_MISMATCH:${settlementId}`);
    invariant(near(entry.result.actualConsumed,Math.min(entry.result.consumptionRequired,entry.result.availableBeforeConsumption)),`SETTLEMENT_CONSUMPTION_MISMATCH:${settlementId}`);
    invariant(near(entry.result.shortage,entry.result.consumptionRequired-entry.result.actualConsumed),`SETTLEMENT_SHORTAGE_MISMATCH:${settlementId}`);
    invariant(near(entry.result.openingProductionProgress+entry.result.appliedProductionProgressGain,entry.result.closingProductionProgress),`SETTLEMENT_PRODUCTION_LEDGER_MISMATCH:${settlementId}`);
    invariant(near(entry.result.openingGrowthProgress+entry.result.appliedGrowthProgressGain-growthProgressConsumed,entry.result.closingGrowthProgress),`SETTLEMENT_GROWTH_LEDGER_MISMATCH:${settlementId}`);
    invariant(Array.isArray(entry.result.inbound),'settlement inbound result is required');
    for(const item of entry.result.inbound){
      id(item.shipmentId,'result shipmentId');uint(item.applied,'result inbound applied');
      if(item.applied>0){
        const ledger=state.processedInboundIds[item.shipmentId];
        invariant(ledger?.settlementId===settlementId,`MISSING_PROCESSED_SHIPMENT:${item.shipmentId}`);
        invariant(ledger.shipment.amount===item.applied,`SHIPMENT_RESULT_AMOUNT_MISMATCH:${item.shipmentId}`);
      }
    }
  }
  const settlements=Object.values(state.processedSettlementIds);
  if(settlements.length===0)invariant(state.lastSettledTurn===null,'LAST_SETTLED_TURN_WITHOUT_SETTLEMENT');
  else{
    const ordered=settlements.toSorted((a,b)=>a.input.turn-b.input.turn);
    invariant(state.lastSettledTurn===ordered.at(-1).input.turn,'LAST_SETTLED_TURN_MISMATCH');
    for(let index=1;index<ordered.length;index++){
      const previous=ordered[index-1].result,current=ordered[index].result;
      invariant(current.openingOwnerFactionId===previous.ownerFactionId,`SETTLEMENT_OWNER_CHAIN_MISMATCH:${current.settlementId}`);
      invariant(near(current.openingFoodStock,previous.closingFoodStock),`SETTLEMENT_FOOD_CHAIN_MISMATCH:${current.settlementId}`);
      invariant(near(current.openingProductionProgress,previous.closingProductionProgress),`SETTLEMENT_PRODUCTION_CHAIN_MISMATCH:${current.settlementId}`);
      invariant(near(current.openingGrowthProgress,previous.closingGrowthProgress),`SETTLEMENT_GROWTH_CHAIN_MISMATCH:${current.settlementId}`);
    }
    const last=ordered.at(-1).result;
    invariant(state.ownerFactionId===last.ownerFactionId,'CURRENT_OWNER_LEDGER_MISMATCH');
    invariant(near(state.foodStock,last.closingFoodStock),'CURRENT_FOOD_LEDGER_MISMATCH');
    invariant(near(state.productionProgress,last.closingProductionProgress),'CURRENT_PRODUCTION_LEDGER_MISMATCH');
    invariant(near(state.growthProgress,last.closingGrowthProgress),'CURRENT_GROWTH_LEDGER_MISMATCH');
  }
  for(const[shipmentId,entry]of Object.entries(state.processedInboundIds)){
    id(shipmentId,'processed shipmentId');id(entry.settlementId,'shipment settlementId');
    uint(entry.turn,'shipment turn');
    invariant(entry.shipment?.shipmentId===shipmentId,`SHIPMENT_KEY_MISMATCH:${shipmentId}`);
    const shipment=normalizeShipment(entry.shipment);
    const settlement=state.processedSettlementIds[entry.settlementId];
    invariant(settlement,`ORPHAN_PROCESSED_SHIPMENT:${shipmentId}`);
    invariant(entry.turn===settlement.input.turn,`SHIPMENT_TURN_MISMATCH:${shipmentId}`);
    const inputShipment=settlement.input.inboundShipments.find(item=>item.shipmentId===shipmentId);
    invariant(inputShipment&&same(inputShipment,shipment),`SHIPMENT_INPUT_MISMATCH:${shipmentId}`);
    const resultShipment=settlement.result.inbound.find(item=>item.shipmentId===shipmentId);
    invariant(resultShipment&&resultShipment.applied===shipment.amount&&resultShipment.reason===null,`SHIPMENT_RESULT_MISMATCH:${shipmentId}`);
  }
  return true;
}

export const CITY_SETTLEMENT_FORMAT=FORMAT;
export const CITY_SETTLEMENT_VERSION=VERSION;
