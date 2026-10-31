import {hexDistance} from './map-primitives.mjs';

const FORMAT='sangoku-campaign-runtime-movement-city-capture-adapter';
const VERSION=1;
const MOVEMENT_RESULT_FORMAT='sangoku-first3-movement-completion-result';
const MOVEMENT_RESULT_VERSION=1;
const MOVEMENT_RESULT_KEYS=['format','version','resultId','globalTick','armyId','orderId','fromTileId','toTileId','completedPathIndex','outcome','validResult'];

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const id=value=>typeof value==='string'&&value.length>0;
function invariant(condition,message){if(!condition)throw new Error(message);}
function clone(value){return structuredClone(value);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function same(left,right){return stable(left)===stable(right);}
function exactKeys(value,keys,message){invariant(object(value)&&same(Object.keys(value).sort(),[...keys].sort()),message);}
function hash32(value){
  let hash=0x811c9dc5;
  for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;
  return hash;
}
function token(value){return hash32(value).toString(16).padStart(8,'0');}
function currentWorldTick(world){
  invariant(integer(world?.turnNumber,1)&&integer(world?.time?.ticksPerTurn,1)&&integer(world?.time?.tick,0,world.time.ticksPerTurn),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_INVALID_WORLD_TICK');
  return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;
}

function movementResultBasis(input){
  return {
    format:MOVEMENT_RESULT_FORMAT,
    version:MOVEMENT_RESULT_VERSION,
    globalTick:input.globalTick,
    armyId:input.armyId,
    orderId:input.orderId,
    fromTileId:input.fromTileId,
    toTileId:input.toTileId,
    completedPathIndex:input.completedPathIndex,
    outcome:'EDGE_ENTERED',
    validResult:true,
  };
}

/**
 * Build the versioned receipt that a future runtime connection must append
 * only after moveOneTick has committed one edge. The city-capture adapter
 * independently rechecks this receipt against the canonical post-move world.
 */
export function createCampaignMovementCompletionRecord(input={}){
  exactKeys(input,['globalTick','armyId','orderId','fromTileId','toTileId','completedPathIndex'],'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_INVALID_MOVEMENT_RESULT_INPUT_SHAPE');
  invariant(integer(input.globalTick)&&id(input.armyId)&&id(input.orderId)&&id(input.fromTileId)&&id(input.toTileId)&&input.fromTileId!==input.toTileId&&integer(input.completedPathIndex,1),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_INVALID_MOVEMENT_RESULT_INPUT');
  const basis=movementResultBasis(input);
  return {...basis,resultId:`R9.MOVE.RESULT.${input.globalTick}.${token(basis)}`};
}

function normalizeMovementRecords(records){
  invariant(Array.isArray(records),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_MOVEMENT_RESULTS_REQUIRED');
  const normalized=records.map((record,index)=>{
    exactKeys(record,MOVEMENT_RESULT_KEYS,`RUNTIME_MOVEMENT_CAPTURE_ADAPTER_INVALID_MOVEMENT_RESULT_SHAPE:${index}`);
    invariant(
      record.format===MOVEMENT_RESULT_FORMAT&&record.version===MOVEMENT_RESULT_VERSION&&id(record.resultId)&&integer(record.globalTick)&&id(record.armyId)&&id(record.orderId)&&id(record.fromTileId)&&id(record.toTileId)&&record.fromTileId!==record.toTileId&&integer(record.completedPathIndex,1)&&record.outcome==='EDGE_ENTERED'&&record.validResult===true,
      `RUNTIME_MOVEMENT_CAPTURE_ADAPTER_INVALID_MOVEMENT_RESULT:${index}`,
    );
    const expected=createCampaignMovementCompletionRecord({
      globalTick:record.globalTick,
      armyId:record.armyId,
      orderId:record.orderId,
      fromTileId:record.fromTileId,
      toTileId:record.toTileId,
      completedPathIndex:record.completedPathIndex,
    });
    invariant(record.resultId===expected.resultId,`RUNTIME_MOVEMENT_CAPTURE_ADAPTER_UNSTABLE_MOVEMENT_RESULT_ID:${record.resultId}`);
    return clone(record);
  }).sort((left,right)=>left.resultId.localeCompare(right.resultId,'en'));
  invariant(new Set(normalized.map(record=>record.resultId)).size===normalized.length,'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_DUPLICATE_MOVEMENT_RESULT_ID');
  invariant(new Set(normalized.map(record=>`${record.globalTick}:${record.armyId}`)).size===normalized.length,'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_DUPLICATE_ARMY_MOVEMENT_RESULT');
  return normalized;
}

function validateRuntimeBoundary(runtime,currentGlobalTick){
  invariant(object(runtime)&&object(runtime.world),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_RUNTIME_REQUIRED');
  invariant(integer(currentGlobalTick)&&currentWorldTick(runtime.world)===currentGlobalTick,'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_TICK_MISMATCH');
  invariant(runtime.committedGlobalTick===currentGlobalTick,'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_UNCOMMITTED_TICK');
  invariant(object(runtime.world.cities)&&object(runtime.world.armies)&&object(runtime.world.factions)&&object(runtime.world.tiles),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_WORLD_REQUIRED');
  invariant(object(runtime.combat?.delta?.units)&&object(runtime.combat?.calculator?.units),'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_COMBAT_PROJECTION_REQUIRED');
}

function terminalArmyDisposition(runtime,armyId){
  const sidecar=runtime.campaignTerminal?.armiesById?.[armyId]?.disposition;
  const applied=runtime.world.campaignTerminalWorld?.armiesById?.[armyId]?.disposition;
  invariant(!sidecar||!applied||sidecar===applied,`RUNTIME_MOVEMENT_CAPTURE_ADAPTER_TERMINAL_DISPOSITION_MISMATCH:${armyId}`);
  return sidecar??applied??'ACTIVE';
}

function movementEffectiveActiveArmy(runtime,army){
  const delta=runtime.combat.delta.units[army.armyId],calculator=runtime.combat.calculator.units[army.armyId];
  return terminalArmyDisposition(runtime,army.armyId)==='ACTIVE'&&Boolean(delta)&&Boolean(calculator)&&delta.activePersonnel>0&&delta.routePending!==true&&calculator.currentHp>0&&army.retreatState===null;
}

function canonicalMovementMatches(runtime,record){
  if(record.globalTick!==currentWorldTick(runtime.world))return false;
  const army=runtime.world.armies[record.armyId],from=runtime.world.tiles[record.fromTileId],to=runtime.world.tiles[record.toTileId];
  if(!army||!from||!to||hexDistance(from,to)!==1||!movementEffectiveActiveArmy(runtime,army))return false;
  const order=army.currentOrder;
  return army.tileId===record.toTileId&&army.movementState===null&&order?.type==='MOVE'&&order.orderId===record.orderId&&['ACTIVE','COMPLETED'].includes(order.status)&&order.currentPathIndex===record.completedPathIndex&&order.pathTileIds?.[record.completedPathIndex-1]===record.fromTileId&&order.pathTileIds?.[record.completedPathIndex]===record.toTileId;
}

function ownerHasActiveDefender(runtime,city){
  return Object.values(runtime.world.armies).some(army=>army.factionId===city.ownerFactionId&&army.tileId===city.tileId&&terminalArmyDisposition(runtime,army.armyId)==='ACTIVE');
}

function alreadyCommitted(runtime,transactionId,sourceResultId){
  return Object.values(runtime.campaignTerminal?.recordsById??{}).some(record=>
    record?.details?.projectionTransactionId===transactionId||
    (record?.details?.sourceResultId===sourceResultId&&record?.details?.projectionKind==='CONFIRMED_CITY_CAPTURE'),
  );
}

function candidateForCity(runtime,currentGlobalTick,city,records,{allowRecapture=false}={}){
  if((city.occupationState!=='NORMAL'&&!allowRecapture)||runtime.world.factions[city.ownerFactionId]?.alive!==true||ownerHasActiveDefender(runtime,city))return null;
  const activeHostileOccupiers=Object.values(runtime.world.armies).filter(army=>
    army.tileId===city.tileId&&army.factionId!==city.ownerFactionId&&runtime.world.factions[army.factionId]?.alive===true&&movementEffectiveActiveArmy(runtime,army)
  );
  const occupierFactionIds=[...new Set(activeHostileOccupiers.map(army=>army.factionId))].sort((a,b)=>a.localeCompare(b,'en'));
  if(occupierFactionIds.length!==1)return null;
  const occupierFactionId=occupierFactionIds[0];
  const occupyingArmyIds=new Set(activeHostileOccupiers.filter(army=>army.factionId===occupierFactionId).map(army=>army.armyId));
  const entryRecords=records.filter(record=>record.globalTick===currentGlobalTick&&record.toTileId===city.tileId&&occupyingArmyIds.has(record.armyId)&&canonicalMovementMatches(runtime,record));
  if(entryRecords.length===0)return null;
  const resultIds=entryRecords.map(record=>record.resultId).sort((left,right)=>left.localeCompare(right,'en'));
  const basis={
    format:FORMAT,
    version:VERSION,
    currentGlobalTick,
    capturedCityId:city.cityId,
    formerOwnerFactionId:city.ownerFactionId,
    occupierFactionId,
    resultIds,
  };
  const sourceResultId=`R9.MOVE.CAPTURE.RESULT.${token({lane:'SOURCE',...basis})}`;
  const transactionId=`R9.MOVE.CAPTURE.${currentGlobalTick}.${token({lane:'TRANSACTION',sourceResultId,...basis})}`;
  if(alreadyCommitted(runtime,transactionId,sourceResultId))return null;
  return {transactionId,sourceResultId,globalTick:currentGlobalTick,capturedCityId:city.cityId,formerOwnerFactionId:city.ownerFactionId,occupierFactionId};
}

/**
 * Turn committed movement-edge receipts into the exact six-field input used by
 * campaign-city-occupation-projection. This function neither changes runtime
 * state nor resolves occupation, resources, prisoners, extinction or victory.
 */
export function createCampaignRuntimeMovementCityCapturePayloads({runtime,currentGlobalTick,completedMovementRecords}={},options={}){
  validateRuntimeBoundary(runtime,currentGlobalTick);
  const records=normalizeMovementRecords(completedMovementRecords);
  const candidates=Object.values(runtime.world.cities).sort((left,right)=>left.cityId.localeCompare(right.cityId,'en')).map(city=>candidateForCity(runtime,currentGlobalTick,city,records,options)).filter(Boolean);
  invariant(new Set(candidates.map(candidate=>candidate.transactionId)).size===candidates.length,'RUNTIME_MOVEMENT_CAPTURE_ADAPTER_TRANSACTION_ID_COLLISION');
  return clone(candidates);
}

export const CAMPAIGN_RUNTIME_MOVEMENT_CITY_CAPTURE_ADAPTER_FORMAT=FORMAT;
export const CAMPAIGN_RUNTIME_MOVEMENT_CITY_CAPTURE_ADAPTER_VERSION=VERSION;
export const CAMPAIGN_MOVEMENT_COMPLETION_RESULT_FORMAT=MOVEMENT_RESULT_FORMAT;
export const CAMPAIGN_MOVEMENT_COMPLETION_RESULT_VERSION=MOVEMENT_RESULT_VERSION;
export const CAMPAIGN_RUNTIME_MOVEMENT_CITY_CAPTURE_ADAPTER_RULES=Object.freeze({
  status:'WORK_TRIAL_PURE_ADAPTER_NOT_RUNTIME_CONNECTED',
  trigger:'CURRENT_TICK_CANONICAL_EDGE_ENTRY_INTO_UNDEFENDED_ENEMY_NORMAL_MAJOR_CITY',
  claimant:'EXACTLY_ONE_ACTIVE_NON_ROUTING_HOSTILE_OCCUPYING_FACTION',
  movementReceipt:'VERSIONED_STABLE_ID_EXACT_POST_MOVE_BINDING',
  multiFactionOccupation:'FAIL_CLOSED',
  nearbyNonParticipantCreatesClaim:false,
  automaticResourceTransfer:false,
  automaticRecovery:false,
  automaticOccupationPolicy:false,
  automaticPrisoners:false,
  automaticExtinction:false,
  oneOfficerPerUnit:true,
  duelSystem:'EXCLUDED',
  mutatesRuntime:false,
});
