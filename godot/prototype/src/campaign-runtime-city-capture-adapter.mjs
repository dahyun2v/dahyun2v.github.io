import {hexDistance} from './map-primitives.mjs';
import {validateBattleEndSnapshot} from './combat-battle-result.mjs';

/** Round closure input lane. No tick-combat coordinator or delta is executed. */
export function createCampaignRoundCityCapturePayloads({world,snapshot,winnerFactionId,globalTick}) {
  validateBattleEndSnapshot(snapshot);
  invariant(currentWorldTick(world)===globalTick,'ROUND_CAPTURE_TICK_MISMATCH');
  const defeated=new Set(snapshot.units.filter(u=>u.unitState==='ELIMINATED').map(u=>u.unitId));
  const survivors=snapshot.units.filter(u=>u.unitState==='COMMANDABLE'&&u.postBattleCount>0)
    .map(u=>world.armies[u.unitId]);
  invariant(survivors.length>0&&survivors.every(a=>a?.factionId===winnerFactionId),'ROUND_CAPTURE_WINNER_MISMATCH');
  return Object.values(world.cities).filter(city=>city.ownerFactionId!==winnerFactionId&&city.occupationState==='NORMAL'&&
    [...defeated].some(id=>world.armies[id]?.factionId===city.ownerFactionId&&world.armies[id].tileId===city.tileId)&&
    !Object.values(world.armies).some(a=>a.factionId===city.ownerFactionId&&a.tileId===city.tileId&&
      !defeated.has(a.armyId)&&(!world.campaignTerminalWorld||world.campaignTerminalWorld.armiesById[a.armyId]?.disposition==='ACTIVE'))&&
    survivors.some(a=>hexDistance(world.tiles[a.tileId],world.tiles[city.tileId])===1))
    .map(city=>({transactionId:`RC.${globalTick}.${city.cityId}`,sourceResultId:snapshot.battleId.replaceAll(':','.'),
      globalTick,capturedCityId:city.cityId,formerOwnerFactionId:city.ownerFactionId,occupierFactionId:winnerFactionId}));
}

const FORMAT='sangoku-campaign-runtime-city-capture-adapter';
const VERSION=1;
const DEFEAT_KEYS=['transactionId','sourceResultId','globalTick','defeatedArmyId','commanderFate','captorFactionId'];
const OCCUPATION_ACTION_IDS=new Set(['BASIC_ATTACK','CAVALRY_CHARGE','SPEAR_ENGAGE']);

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
function sortedUnique(values,message){
  invariant(Array.isArray(values)&&values.length>0,message);
  invariant(values.every(id),message);
  invariant(new Set(values).size===values.length,message);
  return [...values].sort((left,right)=>left.localeCompare(right,'en'));
}
function currentWorldTick(world){
  invariant(integer(world?.turnNumber,1)&&integer(world?.time?.ticksPerTurn,1)&&integer(world?.time?.tick,0,world.time.ticksPerTurn),'RUNTIME_CITY_CAPTURE_ADAPTER_INVALID_WORLD_TICK');
  return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;
}

function validateRuntimeBoundary(runtime,currentGlobalTick,mergedResultIds){
  invariant(object(runtime)&&object(runtime.world)&&object(runtime.combat),'RUNTIME_CITY_CAPTURE_ADAPTER_RUNTIME_REQUIRED');
  invariant(integer(currentGlobalTick)&&currentWorldTick(runtime.world)===currentGlobalTick,'RUNTIME_CITY_CAPTURE_ADAPTER_TICK_MISMATCH');
  invariant(object(runtime.world.cities)&&object(runtime.world.armies)&&object(runtime.world.factions)&&object(runtime.world.tiles),'RUNTIME_CITY_CAPTURE_ADAPTER_WORLD_REQUIRED');
  const battleId=runtime.combat.battleId;
  invariant(id(battleId),'RUNTIME_CITY_CAPTURE_ADAPTER_BATTLE_ID_REQUIRED');
  const coordinator=runtime.combat.coordinator,delta=runtime.combat.delta;
  invariant(object(coordinator)&&object(coordinator.actorStates)&&object(coordinator.batches),'RUNTIME_CITY_CAPTURE_ADAPTER_COORDINATOR_REQUIRED');
  invariant(object(delta)&&object(delta.units)&&object(delta.processedBatches)&&object(delta.processedResults),'RUNTIME_CITY_CAPTURE_ADAPTER_DELTA_REQUIRED');
  const coordinatorBatch=coordinator.batches[String(currentGlobalTick)];
  const deltaBatchId=`${battleId}/${currentGlobalTick}`,deltaBatch=delta.processedBatches[deltaBatchId];
  invariant(object(coordinatorBatch)&&coordinatorBatch.currentTick===currentGlobalTick,'RUNTIME_CITY_CAPTURE_ADAPTER_CURRENT_COORDINATOR_BATCH_REQUIRED');
  invariant(object(deltaBatch)&&deltaBatch.currentTick===currentGlobalTick,'RUNTIME_CITY_CAPTURE_ADAPTER_CURRENT_DELTA_BATCH_REQUIRED');
  const supplied=sortedUnique(mergedResultIds,'RUNTIME_CITY_CAPTURE_ADAPTER_MERGED_RESULT_IDS_REQUIRED');
  const deltaIds=sortedUnique(deltaBatch.resultIds,'RUNTIME_CITY_CAPTURE_ADAPTER_DELTA_RESULT_IDS_REQUIRED');
  const coordinatorIds=sortedUnique((coordinatorBatch.resultOrder??[]).map(record=>record.resultId),'RUNTIME_CITY_CAPTURE_ADAPTER_COORDINATOR_RESULT_IDS_REQUIRED');
  invariant(same(supplied,deltaIds)&&same(deltaIds,coordinatorIds),'RUNTIME_CITY_CAPTURE_ADAPTER_EXACT_MERGED_RESULT_SET_REQUIRED');
  for(const resultId of supplied)invariant(delta.processedResults[resultId]?.batchId===deltaBatchId,`RUNTIME_CITY_CAPTURE_ADAPTER_UNPROCESSED_RESULT:${resultId}`);
  return {battleId,coordinatorBatch,deltaBatchId,mergedResultIds:supplied};
}

function resolveMergedResults(runtime,context){
  const records=[];
  for(const reference of context.coordinatorBatch.resultOrder){
    const actorState=runtime.combat.coordinator.actorStates[reference.actorRef];
    const instance=actorState?.instances?.[reference.actionInstanceId];
    const result=instance?.results?.find(item=>item.resultId===reference.resultId);
    invariant(result&&id(result.targetRef),`RUNTIME_CITY_CAPTURE_ADAPTER_RESULT_REFERENCE_MISMATCH:${reference.resultId}`);
    invariant(['ATTACK','CONTROL','SUPPORT'].includes(instance.definition?.eventProfile),`RUNTIME_CITY_CAPTURE_ADAPTER_RESULT_PROFILE_REQUIRED:${reference.resultId}`);
    records.push({
      resultId:reference.resultId,
      actorRef:reference.actorRef,
      targetRef:result.targetRef,
      actionId:instance.definition.actionId,
      eventProfile:instance.definition.eventProfile,
      validResult:result.validResult===true,
    });
  }
  return records.sort((left,right)=>left.resultId.localeCompare(right.resultId,'en')||left.actorRef.localeCompare(right.actorRef,'en'));
}

function terminalArmyDisposition(runtime,armyId){
  const sidecar=runtime.campaignTerminal?.armiesById?.[armyId]?.disposition;
  const applied=runtime.world.campaignTerminalWorld?.armiesById?.[armyId]?.disposition;
  invariant(!sidecar||!applied||sidecar===applied,`RUNTIME_CITY_CAPTURE_ADAPTER_TERMINAL_DISPOSITION_MISMATCH:${armyId}`);
  return sidecar??applied??'ACTIVE';
}

function defeatSourceIds({battleId,currentGlobalTick,defeatedArmyId,resultIds}){
  const basis={format:'sangoku-campaign-runtime-defeat-adapter',version:1,battleId,currentGlobalTick,defeatedArmyId,resultIds:[...resultIds].sort((a,b)=>a.localeCompare(b,'en'))};
  return {
    sourceResultId:`R9.RESULT.${token({lane:'SOURCE',...basis})}`,
    transactionId:`R9.DEFEAT.${currentGlobalTick}.${token({lane:'TRANSACTION',...basis})}`,
  };
}

function normalizeDefeatPayloads(defeatPayloads,context,mergedResults){
  invariant(Array.isArray(defeatPayloads),'RUNTIME_CITY_CAPTURE_ADAPTER_DEFEAT_PAYLOADS_REQUIRED');
  const normalized=defeatPayloads.map((payload,index)=>{
    exactKeys(payload,DEFEAT_KEYS,`RUNTIME_CITY_CAPTURE_ADAPTER_INVALID_DEFEAT_PAYLOAD_SHAPE:${index}`);
    invariant(
      id(payload.transactionId)&&id(payload.sourceResultId)&&payload.globalTick===context.coordinatorBatch.currentTick&&id(payload.defeatedArmyId)&&['ESCAPED','CAPTURED','DEAD'].includes(payload.commanderFate),
      `RUNTIME_CITY_CAPTURE_ADAPTER_INVALID_DEFEAT_PAYLOAD:${index}`,
    );
    invariant(payload.captorFactionId===null||id(payload.captorFactionId),`RUNTIME_CITY_CAPTURE_ADAPTER_INVALID_DEFEAT_CAPTOR:${index}`);
    invariant((payload.commanderFate==='CAPTURED')===(payload.captorFactionId!==null),`RUNTIME_CITY_CAPTURE_ADAPTER_DEFEAT_FATE_CAPTOR_MISMATCH:${payload.defeatedArmyId}`);
    const linkedResultIds=mergedResults.filter(result=>result.targetRef===payload.defeatedArmyId).map(result=>result.resultId).sort((a,b)=>a.localeCompare(b,'en'));
    invariant(linkedResultIds.length>0,`RUNTIME_CITY_CAPTURE_ADAPTER_DEFEAT_NOT_IN_CURRENT_RESULT_SET:${payload.defeatedArmyId}`);
    const expected=defeatSourceIds({battleId:context.battleId,currentGlobalTick:payload.globalTick,defeatedArmyId:payload.defeatedArmyId,resultIds:linkedResultIds});
    invariant(payload.sourceResultId===expected.sourceResultId&&payload.transactionId===expected.transactionId,`RUNTIME_CITY_CAPTURE_ADAPTER_DEFEAT_SOURCE_MISMATCH:${payload.defeatedArmyId}`);
    return clone(payload);
  }).sort((left,right)=>left.defeatedArmyId.localeCompare(right.defeatedArmyId,'en')||left.transactionId.localeCompare(right.transactionId,'en'));
  invariant(new Set(normalized.map(payload=>payload.defeatedArmyId)).size===normalized.length,'RUNTIME_CITY_CAPTURE_ADAPTER_DUPLICATE_DEFEATED_ARMY');
  return normalized;
}

function combatEffectiveActiveArmy(runtime,armyId){
  const unit=runtime.combat.delta.units[armyId];
  return terminalArmyDisposition(runtime,armyId)==='ACTIVE'&&Boolean(unit)&&unit.activePersonnel>0&&unit.routePending!==true&&runtime.combat.calculator?.units?.[armyId]?.currentHp!==0;
}

function adjacentAfterCommittedCombat(runtime,army,city){
  const armyTile=runtime.world.tiles[army.tileId],cityTile=runtime.world.tiles[city.tileId];
  invariant(armyTile&&cityTile,`RUNTIME_CITY_CAPTURE_ADAPTER_TILE_REQUIRED:${army.armyId}:${city.cityId}`);
  return hexDistance(armyTile,cityTile)===1;
}

function candidateForDefeat(runtime,context,mergedResults,defeatPayload){
  const defeatedArmy=runtime.world.armies[defeatPayload.defeatedArmyId];
  const defeatedUnit=runtime.combat.delta.units[defeatPayload.defeatedArmyId];
  invariant(defeatedArmy&&defeatedUnit,`RUNTIME_CITY_CAPTURE_ADAPTER_DEFEATED_ARMY_REQUIRED:${defeatPayload.defeatedArmyId}`);
  if(terminalArmyDisposition(runtime,defeatPayload.defeatedArmyId)!=='ACTIVE')return null;
  if(defeatedUnit.activePersonnel!==0&&defeatedUnit.routePending!==true&&runtime.combat.calculator?.units?.[defeatedArmy.armyId]?.currentHp!==0)return null;

  const city=Object.values(runtime.world.cities).find(item=>item.tileId===defeatedArmy.tileId);
  if(!city||city.cityId===undefined||city.ownerFactionId!==defeatedArmy.factionId||city.occupationState!=='NORMAL')return null;
  if(runtime.world.factions[city.ownerFactionId]?.alive!==true)return null;

  const otherActiveDefender=Object.values(runtime.world.armies).some(army=>
    army.armyId!==defeatedArmy.armyId&&army.factionId===city.ownerFactionId&&army.tileId===city.tileId&&terminalArmyDisposition(runtime,army.armyId)==='ACTIVE'
  );
  if(otherActiveDefender)return null;

  const linked=mergedResults.filter(result=>result.targetRef===defeatedArmy.armyId);
  const eligibleActors=[];
  for(const result of linked){
    if(result.eventProfile!=='ATTACK'||!result.validResult||!OCCUPATION_ACTION_IDS.has(result.actionId))continue;
    const actor=runtime.world.armies[result.actorRef],actorUnit=runtime.combat.delta.units[result.actorRef];
    if(!actor||!actorUnit||actor.factionId===city.ownerFactionId)continue;
    if(runtime.world.factions[actor.factionId]?.alive!==true||!combatEffectiveActiveArmy(runtime,actor.armyId))continue;
    if(!adjacentAfterCommittedCombat(runtime,actor,city))continue;
    eligibleActors.push({armyId:actor.armyId,factionId:actor.factionId,resultId:result.resultId,actionId:result.actionId});
  }
  const occupierFactionIds=[...new Set(eligibleActors.map(actor=>actor.factionId))].sort((a,b)=>a.localeCompare(b,'en'));
  if(occupierFactionIds.length!==1)return null;
  const occupierFactionId=occupierFactionIds[0];
  const transactionBasis={
    format:FORMAT,version:VERSION,battleId:context.battleId,currentGlobalTick:defeatPayload.globalTick,
    defeatedArmyId:defeatPayload.defeatedArmyId,capturedCityId:city.cityId,formerOwnerFactionId:city.ownerFactionId,
    occupierFactionId,sourceResultId:defeatPayload.sourceResultId,
    resultIds:linked.map(result=>result.resultId).sort((a,b)=>a.localeCompare(b,'en')),
  };
  return {
    transactionId:`R9.CAPTURE.${defeatPayload.globalTick}.${token({lane:'TRANSACTION',...transactionBasis})}`,
    sourceResultId:defeatPayload.sourceResultId,
    globalTick:defeatPayload.globalTick,
    capturedCityId:city.cityId,
    formerOwnerFactionId:city.ownerFactionId,
    occupierFactionId,
  };
}

/**
 * Derive exact campaign-city-occupation projection payloads from an already
 * merged combat tick. This adapter observes canonical state but mutates none of
 * it; occupation policy, resources, recovery, prisoners and extinction remain
 * later terminal-batch responsibilities.
 */
export function createCampaignRuntimeCityCapturePayloads({runtime,currentGlobalTick,mergedResultIds,defeatPayloads}={}){
  const context=validateRuntimeBoundary(runtime,currentGlobalTick,mergedResultIds);
  const mergedResults=resolveMergedResults(runtime,context);
  const confirmedDefeats=normalizeDefeatPayloads(defeatPayloads,context,mergedResults);
  const candidates=confirmedDefeats.map(payload=>candidateForDefeat(runtime,context,mergedResults,payload)).filter(Boolean);
  const cityCounts=new Map();
  for(const candidate of candidates)cityCounts.set(candidate.capturedCityId,(cityCounts.get(candidate.capturedCityId)??0)+1);
  const payloads=candidates.filter(candidate=>cityCounts.get(candidate.capturedCityId)===1).sort((left,right)=>
    left.capturedCityId.localeCompare(right.capturedCityId,'en')||left.transactionId.localeCompare(right.transactionId,'en')
  );
  invariant(new Set(payloads.map(payload=>payload.transactionId)).size===payloads.length,'RUNTIME_CITY_CAPTURE_ADAPTER_TRANSACTION_ID_COLLISION');
  return clone(payloads);
}

export const CAMPAIGN_RUNTIME_CITY_CAPTURE_ADAPTER_FORMAT=FORMAT;
export const CAMPAIGN_RUNTIME_CITY_CAPTURE_ADAPTER_VERSION=VERSION;
export const CAMPAIGN_RUNTIME_CITY_CAPTURE_ADAPTER_RULES=Object.freeze({
  status:'WORK_TRIAL_PURE_ADAPTER',
  candidate:'CONFIRMED_CURRENT_DEFEAT_OF_OWNER_DEFENDER_ON_NORMAL_MAJOR_CITY_TILE',
  control:'UNIQUE_ACTIVE_HOSTILE_RESULT_ACTOR_ADJACENT_AFTER_COMMITTED_COMBAT',
  directOccupationActionIds:Object.freeze([...OCCUPATION_ACTION_IDS].sort()),
  multiFactionSiege:'UNCONNECTED_FAIL_CLOSED',
  automaticResourceTransfer:false,
  automaticRecovery:false,
  automaticOccupationPolicy:false,
  automaticPrisoners:false,
  automaticExtinction:false,
  duelSystem:'EXCLUDED',
  mutatesRuntime:false,
});
