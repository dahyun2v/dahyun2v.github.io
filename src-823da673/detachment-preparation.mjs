import {validateState as validateFirst3State} from './first3.mjs';
import {synchronizeCampaignTerminalWorldRoster} from './campaign-terminal-world-application.mjs';
import {hexDistance} from './map-primitives.mjs';
const activeArmy=(world,army)=>!world.campaignTerminalWorld||world.campaignTerminalWorld.armiesById[army.armyId]?.disposition==='ACTIVE';

const FORMAT='sangoku-detachment-preparation';
const VERSION=1;
const PREPARATION_DURATION_TICKS=20;
const DEFAULT_MINIMUM_SOURCE_REMAINDER=50;
const MAX_SERIALIZED_LENGTH=5_000_000;
const STATUSES=new Set(['PREPARING','COMPLETED','CANCELLED']);
const INVALIDATION_REASONS=new Set(['SOURCE_CHANGED','CITY_LOST','OFFICER_UNAVAILABLE']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const finite=(value,min=0)=>typeof value==='number'&&Number.isFinite(value)&&value>=min;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;return JSON.stringify(value);}
function fingerprint(value){let hash=0x811c9dc5;for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;return hash.toString(16).padStart(8,'0');}
function same(left,right){return stable(left)===stable(right);}
function worldGlobalTick(world){return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;}
function activePreparation(snapshot){return snapshot.preparation?.status==='PREPARING'?snapshot.preparation:null;}

function eventReplay(snapshot,eventId,payload){
  invariant(typeof eventId==='string'&&eventId,'DETACHMENT_EVENT_ID_REQUIRED');
  const payloadFingerprint=fingerprint(payload),recorded=snapshot.processedEvents[eventId];
  if(recorded!==undefined){invariant(recorded===payloadFingerprint,`DETACHMENT_EVENT_ID_COLLISION:${eventId}`);return {replayed:true,payloadFingerprint};}
  return {replayed:false,payloadFingerprint};
}
function recordEvent(snapshot,eventId,payloadFingerprint){snapshot.processedEvents[eventId]=payloadFingerprint;return snapshot;}

function officerMaximumStamina(officer){
  const constitution=officer.subStats?.['체력'];
  invariant(finite(constitution),`DETACHMENT_OFFICER_CONSTITUTION_REQUIRED:${officer.officerId}`);
  return 50+Math.floor(constitution/2);
}

function expectedResult(preparation){
  const source=clone(preparation.sourceArmyBefore),officer=clone(preparation.officerBefore);
  const share=preparation.transferTroopCount/source.troopCount;
  const transferredHp=source.hp*share,transferredMaxHp=source.maxHp*share,transferredSupply=source.supplyFood*share;
  source.troopCount-=preparation.transferTroopCount;
  source.hp-=transferredHp;source.maxHp-=transferredMaxHp;source.supplyFood-=transferredSupply;
  const maxStamina=officerMaximumStamina(officer);
  const newArmy={
    armyId:preparation.newArmyId,
    factionId:preparation.factionId,
    commanderId:preparation.officerId,
    troopType:preparation.troopType,
    troopCount:preparation.transferTroopCount,
    woundedCount:0,
    deadCount:0,
    hp:transferredHp,
    maxHp:transferredMaxHp,
    morale:preparation.sourceArmyBefore.morale,
    stamina:maxStamina,
    maxStamina,
    tileId:preparation.deploymentTileId,
    facing:preparation.sourceArmyBefore.facing??null,
    supplyFood:transferredSupply,
    statusEffects:[],
    cooldowns:[],
    currentOrder:null,
    movementState:null,
    retreatState:null,
    engagedArmyIds:[],
  };
  officer.locationRef={kind:'ARMY',id:preparation.newArmyId};
  const factionArmyIds=[...preparation.factionArmyIdsBefore,preparation.newArmyId].sort();
  return {sourceArmy:source,newArmy,officer,factionArmyIds};
}

function dependencyImage(world,preparation){
  const city=world.cities[preparation.cityId];
  return {sourceArmy:world.armies[preparation.sourceArmyId]??null,officer:world.officers[preparation.officerId]??null,factionArmyIds:world.factions[preparation.factionId]?.armyIds??null,city:city?{cityId:city.cityId,ownerFactionId:city.ownerFactionId,tileId:city.tileId}:null,newArmy:world.armies[preparation.newArmyId]??null};
}
function storedDependencyImage(preparation){return {sourceArmy:preparation.sourceArmyBefore,officer:preparation.officerBefore,factionArmyIds:preparation.factionArmyIdsBefore,city:{cityId:preparation.cityId,ownerFactionId:preparation.factionId,tileId:preparation.cityTileId},newArmy:null};}
function assertDependenciesUnchanged(world,preparation){
  invariant(fingerprint(dependencyImage(world,preparation))===preparation.dependencyFingerprintBefore,`DETACHMENT_RESERVED_DEPENDENCY_CHANGED:${preparation.preparationId}`);
}
function dependencyInvalidationReasons(world,preparation){
  const reasons=[];
  const source=world.armies[preparation.sourceArmyId]??null,officer=world.officers[preparation.officerId]??null,city=world.cities[preparation.cityId]??null,faction=world.factions[preparation.factionId]??null;
  if(!same(source,preparation.sourceArmyBefore)||!same(faction?.armyIds??null,preparation.factionArmyIdsBefore)||world.armies[preparation.newArmyId]!==undefined)reasons.push('SOURCE_CHANGED');
  if(city===null||city.ownerFactionId!==preparation.factionId||city.tileId!==preparation.cityTileId)reasons.push('CITY_LOST');
  if(!same(officer,preparation.officerBefore))reasons.push('OFFICER_UNAVAILABLE');
  return reasons;
}

function validateBeforeImage(preparation,baseWorld){
  const source=baseWorld.armies[preparation.sourceArmyId],officer=baseWorld.officers[preparation.officerId],city=baseWorld.cities[preparation.cityId],faction=baseWorld.factions[preparation.factionId];
  invariant(same(source,preparation.sourceArmyBefore)&&same(officer,preparation.officerBefore)&&same(faction?.armyIds,preparation.factionArmyIdsBefore),`DETACHMENT_BEFORE_IMAGE_MISMATCH:${preparation.preparationId}`);
  invariant(city?.ownerFactionId===preparation.factionId&&faction.ownedCityIds.includes(preparation.cityId)&&source.factionId===preparation.factionId,`DETACHMENT_BEFORE_IMAGE_OWNERSHIP_MISMATCH:${preparation.preparationId}`);
  invariant(source.tileId===city.tileId&&city.tileId===preparation.cityTileId,`DETACHMENT_BEFORE_IMAGE_LOCATION_MISMATCH:${preparation.preparationId}`);
  invariant(source.currentOrder===null&&source.movementState===null&&source.retreatState===null&&source.engagedArmyIds.length===0,`DETACHMENT_BEFORE_IMAGE_SOURCE_BUSY:${preparation.preparationId}`);
  invariant(officer.allegianceFactionId===preparation.factionId&&officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY',`DETACHMENT_BEFORE_IMAGE_OFFICER_UNAVAILABLE:${preparation.preparationId}`);
  invariant(officer.locationRef?.kind==='CITY'&&officer.locationRef.id===preparation.cityId,`DETACHMENT_BEFORE_IMAGE_OFFICER_LOCATION_MISMATCH:${preparation.preparationId}`);
  invariant(faction.rulerId!==preparation.officerId&&!Object.values(baseWorld.cities).some(item=>item.governorId===preparation.officerId)&&!Object.values(baseWorld.armies).some(item=>item.commanderId===preparation.officerId),`DETACHMENT_BEFORE_IMAGE_NOT_RESERVE:${preparation.preparationId}`);
  invariant(!Object.hasOwn(baseWorld.armies,preparation.newArmyId)&&preparation.newArmyId!==preparation.sourceArmyId,`DETACHMENT_BEFORE_IMAGE_ARMY_ID_COLLISION:${preparation.preparationId}`);
  invariant(preparation.troopType===source.troopType&&officer.allowedTroops.includes(preparation.troopType),`DETACHMENT_BEFORE_IMAGE_TROOP_MISMATCH:${preparation.preparationId}`);
  invariant(source.troopCount-preparation.transferTroopCount>=preparation.minimumSourceRemainder,`DETACHMENT_BEFORE_IMAGE_REMAINDER_MISMATCH:${preparation.preparationId}`);
}

function validateCompletedWorld(snapshot,preparation){
  const expected=expectedResult(preparation),world=snapshot.world;
  const deploymentTile=world.tiles[preparation.deploymentTileId],cityTile=world.tiles[preparation.cityTileId];
  invariant(deploymentTile&&deploymentTile.terrainType!=='water'&&cityTile&&hexDistance(cityTile,deploymentTile)===1,`DETACHMENT_COMPLETED_DEPLOYMENT_INVALID:${preparation.deploymentTileId}`);
  invariant(Object.values(world.armies).filter(army=>activeArmy(world,army)&&army.tileId===preparation.deploymentTileId).length===1,`DETACHMENT_COMPLETED_DEPLOYMENT_OCCUPANCY_MISMATCH:${preparation.deploymentTileId}`);
  invariant(same(world.armies[preparation.sourceArmyId],expected.sourceArmy),`DETACHMENT_SOURCE_RESULT_MISMATCH:${preparation.sourceArmyId}`);
  invariant(same(world.armies[preparation.newArmyId],expected.newArmy),`DETACHMENT_NEW_ARMY_RESULT_MISMATCH:${preparation.newArmyId}`);
  invariant(same(world.officers[preparation.officerId],expected.officer),`DETACHMENT_OFFICER_RESULT_MISMATCH:${preparation.officerId}`);
  invariant(same(world.factions[preparation.factionId].armyIds,expected.factionArmyIds),`DETACHMENT_FACTION_ARMY_RESULT_MISMATCH:${preparation.factionId}`);
  const restored=clone(world);
  delete restored.armies[preparation.newArmyId];
  restored.armies[preparation.sourceArmyId]=clone(preparation.sourceArmyBefore);
  restored.officers[preparation.officerId]=clone(preparation.officerBefore);
  restored.factions[preparation.factionId].armyIds=clone(preparation.factionArmyIdsBefore);
  if(world.campaignTerminalWorld){
    invariant(object(preparation.terminalWorldBefore),`DETACHMENT_TERMINAL_BEFORE_IMAGE_REQUIRED:${preparation.preparationId}`);
    restored.campaignTerminalWorld=clone(preparation.terminalWorldBefore);
    invariant(same(synchronizeCampaignTerminalWorldRoster({...clone(world),campaignTerminalWorld:clone(preparation.terminalWorldBefore)}).campaignTerminalWorld,world.campaignTerminalWorld),`DETACHMENT_TERMINAL_AFTER_IMAGE_MISMATCH:${preparation.preparationId}`);
  }
  validateFirst3State(restored);
  invariant(fingerprint(restored)===preparation.completionWorldFingerprintBefore,`DETACHMENT_COMPLETED_WORLD_HAS_UNCLAIMED_CHANGE:${preparation.preparationId}`);
  invariant(preparation.sourceArmyBefore.troopCount===expected.sourceArmy.troopCount+expected.newArmy.troopCount,`DETACHMENT_ACTIVE_TROOPS_NOT_CONSERVED:${preparation.preparationId}`);
  invariant(preparation.sourceArmyBefore.woundedCount===expected.sourceArmy.woundedCount+expected.newArmy.woundedCount,`DETACHMENT_WOUNDED_TROOPS_NOT_CONSERVED:${preparation.preparationId}`);
  invariant(preparation.sourceArmyBefore.hp===expected.sourceArmy.hp+expected.newArmy.hp&&preparation.sourceArmyBefore.maxHp===expected.sourceArmy.maxHp+expected.newArmy.maxHp,`DETACHMENT_HP_NOT_CONSERVED:${preparation.preparationId}`);
  invariant(preparation.sourceArmyBefore.supplyFood===expected.sourceArmy.supplyFood+expected.newArmy.supplyFood,`DETACHMENT_SUPPLY_NOT_CONSERVED:${preparation.preparationId}`);
  return restored;
}

function validatePreparation(preparation,snapshot){
  invariant(object(preparation)&&typeof preparation.preparationId==='string'&&preparation.preparationId,'INVALID_DETACHMENT_PREPARATION');
  for(const key of ['sourceArmyId','officerId','cityId','cityTileId','newArmyId','factionId','troopType','startEventId'])invariant(typeof preparation[key]==='string'&&preparation[key],`INVALID_DETACHMENT_FIELD:${preparation.preparationId}:${key}`);
  invariant(STATUSES.has(preparation.status),`INVALID_DETACHMENT_STATUS:${preparation.preparationId}`);
  invariant(integer(preparation.transferTroopCount,1)&&integer(preparation.minimumSourceRemainder,1),`INVALID_DETACHMENT_TROOP_COUNT:${preparation.preparationId}`);
  invariant(integer(preparation.startedGlobalTick)&&integer(preparation.expectedEndGlobalTick)&&preparation.expectedEndGlobalTick===preparation.startedGlobalTick+PREPARATION_DURATION_TICKS,`INVALID_DETACHMENT_DURATION:${preparation.preparationId}`);
  invariant(object(preparation.sourceArmyBefore)&&object(preparation.officerBefore)&&Array.isArray(preparation.factionArmyIdsBefore),`INVALID_DETACHMENT_BEFORE_IMAGE:${preparation.preparationId}`);
  invariant(preparation.sourceArmyBefore.armyId===preparation.sourceArmyId&&preparation.officerBefore.officerId===preparation.officerId,`DETACHMENT_BEFORE_IMAGE_ID_MISMATCH:${preparation.preparationId}`);
  invariant(typeof preparation.dependencyFingerprintBefore==='string'&&/^[a-f0-9]{8}$/.test(preparation.dependencyFingerprintBefore),`INVALID_DETACHMENT_DEPENDENCY_FINGERPRINT:${preparation.preparationId}`);
  invariant(fingerprint(storedDependencyImage(preparation))===preparation.dependencyFingerprintBefore,`DETACHMENT_STORED_DEPENDENCY_MISMATCH:${preparation.preparationId}`);
  const startPayload={type:'SCHEDULE_DETACHMENT',preparationId:preparation.preparationId,sourceArmyId:preparation.sourceArmyId,officerId:preparation.officerId,cityId:preparation.cityId,newArmyId:preparation.newArmyId,transferTroopCount:preparation.transferTroopCount,troopType:preparation.troopType};
  invariant(snapshot.processedEvents[preparation.startEventId]===fingerprint(startPayload),`DETACHMENT_START_RECEIPT_MISMATCH:${preparation.preparationId}`);
  let baseWorld;
  if(preparation.status==='PREPARING'){
    invariant(preparation.completedGlobalTick===null&&preparation.cancelledGlobalTick===null&&preparation.cancelReason===null&&preparation.cancellationMode===null&&preparation.invalidationReasonsAtCancellation===null&&preparation.completionEventId===null&&preparation.cancellationEventId===null&&preparation.completionWorldFingerprintBefore===null&&preparation.cancellationWorldFingerprint===null&&preparation.deploymentTileId===null,'DETACHMENT_PREPARING_HAS_TERMINAL_DATA');
    validateFirst3State(snapshot.world);assertDependenciesUnchanged(snapshot.world,preparation);baseWorld=snapshot.world;
  }else if(preparation.status==='CANCELLED'){
    invariant(preparation.completedGlobalTick===null&&integer(preparation.cancelledGlobalTick)&&typeof preparation.cancelReason==='string'&&preparation.cancelReason&&['USER_CANCEL','SYSTEM_INVALIDATION'].includes(preparation.cancellationMode)&&preparation.completionEventId===null&&typeof preparation.cancellationEventId==='string'&&preparation.completionWorldFingerprintBefore===null&&typeof preparation.cancellationWorldFingerprint==='string'&&preparation.deploymentTileId===null,'INVALID_DETACHMENT_CANCELLATION');
    validateFirst3State(snapshot.world);invariant(fingerprint(snapshot.world)===preparation.cancellationWorldFingerprint,`DETACHMENT_CANCELLED_WORLD_MISMATCH:${preparation.preparationId}`);baseWorld=snapshot.world;
    if(preparation.cancellationMode==='USER_CANCEL'){
      invariant(preparation.invalidationReasonsAtCancellation===null,'DETACHMENT_USER_CANCEL_HAS_INVALIDATION_REASONS');assertDependenciesUnchanged(snapshot.world,preparation);
      const cancelPayload={type:'CANCEL_DETACHMENT',preparationId:preparation.preparationId,reason:preparation.cancelReason,currentGlobalTick:preparation.cancelledGlobalTick,worldFingerprint:preparation.cancellationWorldFingerprint};invariant(snapshot.processedEvents[preparation.cancellationEventId]===fingerprint(cancelPayload),`DETACHMENT_CANCELLATION_RECEIPT_MISMATCH:${preparation.preparationId}`);
    }else{
      invariant(INVALIDATION_REASONS.has(preparation.cancelReason)&&Array.isArray(preparation.invalidationReasonsAtCancellation)&&preparation.invalidationReasonsAtCancellation.length>0,`INVALID_DETACHMENT_SYSTEM_INVALIDATION:${preparation.preparationId}`);const observed=dependencyInvalidationReasons(snapshot.world,preparation);invariant(same(observed,preparation.invalidationReasonsAtCancellation)&&observed.includes(preparation.cancelReason),`DETACHMENT_INVALIDATION_REASON_MISMATCH:${preparation.preparationId}`);
      const invalidationPayload={type:'INVALIDATE_DETACHMENT',preparationId:preparation.preparationId,reason:preparation.cancelReason,observedReasons:observed,currentGlobalTick:preparation.cancelledGlobalTick,worldFingerprint:preparation.cancellationWorldFingerprint};invariant(snapshot.processedEvents[preparation.cancellationEventId]===fingerprint(invalidationPayload),`DETACHMENT_INVALIDATION_RECEIPT_MISMATCH:${preparation.preparationId}`);
    }
  }else{
    invariant(integer(preparation.completedGlobalTick)&&preparation.completedGlobalTick>=preparation.expectedEndGlobalTick&&preparation.cancelledGlobalTick===null&&preparation.cancelReason===null&&preparation.cancellationMode===null&&preparation.invalidationReasonsAtCancellation===null&&typeof preparation.completionEventId==='string'&&preparation.cancellationEventId===null&&typeof preparation.completionWorldFingerprintBefore==='string'&&preparation.cancellationWorldFingerprint===null&&typeof preparation.deploymentTileId==='string'&&preparation.deploymentTileId,'INVALID_DETACHMENT_COMPLETION');
    const completePayload={type:'COMPLETE_DETACHMENT',preparationId:preparation.preparationId,deploymentTileId:preparation.deploymentTileId,currentGlobalTick:preparation.completedGlobalTick,worldFingerprintBefore:preparation.completionWorldFingerprintBefore};invariant(snapshot.processedEvents[preparation.completionEventId]===fingerprint(completePayload),`DETACHMENT_COMPLETION_RECEIPT_MISMATCH:${preparation.preparationId}`);
    baseWorld=validateCompletedWorld(snapshot,preparation);
  }
  if(!(preparation.status==='CANCELLED'&&preparation.cancellationMode==='SYSTEM_INVALIDATION'))validateBeforeImage(preparation,baseWorld);
}

export function validateDetachmentPreparationSnapshot(snapshot){
  invariant(object(snapshot)&&snapshot.format===FORMAT&&snapshot.version===VERSION,'INVALID_DETACHMENT_PREPARATION_FORMAT');
  invariant(object(snapshot.world)&&object(snapshot.policy)&&object(snapshot.processedEvents),'INVALID_DETACHMENT_PREPARATION_CONTENT');
  invariant(snapshot.policy.preparationDurationTicks===PREPARATION_DURATION_TICKS&&integer(snapshot.policy.minimumSourceRemainder,1),'INVALID_DETACHMENT_PREPARATION_POLICY');
  invariant(integer(snapshot.currentGlobalTick)&&snapshot.currentGlobalTick===worldGlobalTick(snapshot.world),'INVALID_DETACHMENT_GLOBAL_TICK');
  for(const[eventId,value]of Object.entries(snapshot.processedEvents))invariant(typeof eventId==='string'&&eventId&&typeof value==='string'&&/^[a-f0-9]{8}$/.test(value),`INVALID_DETACHMENT_EVENT_RECEIPT:${eventId}`);
  if(snapshot.preparation===null)validateFirst3State(snapshot.world);else validatePreparation(snapshot.preparation,snapshot);
  return snapshot;
}

export function createDetachmentPreparationSnapshot({world,minimumSourceRemainder=DEFAULT_MINIMUM_SOURCE_REMAINDER}={}){
  validateFirst3State(world);invariant(integer(minimumSourceRemainder,1),'INVALID_DETACHMENT_MINIMUM_SOURCE_REMAINDER');
  return validateDetachmentPreparationSnapshot({format:FORMAT,version:VERSION,policy:{preparationDurationTicks:PREPARATION_DURATION_TICKS,minimumSourceRemainder},world:clone(world),currentGlobalTick:worldGlobalTick(world),preparation:null,processedEvents:{}});
}

export function scheduleDetachmentPreparation(snapshot,input={}){
  validateDetachmentPreparationSnapshot(snapshot);
  const {eventId,preparationId,sourceArmyId,officerId,cityId,newArmyId,transferTroopCount,troopType}=input;
  const payload={type:'SCHEDULE_DETACHMENT',preparationId,sourceArmyId,officerId,cityId,newArmyId,transferTroopCount,troopType};
  const replay=eventReplay(snapshot,eventId,payload);if(replay.replayed)return clone(snapshot);
  invariant(snapshot.preparation===null,'DETACHMENT_TRIAL_ALREADY_HAS_PREPARATION');
  for(const[value,label]of [[preparationId,'preparationId'],[sourceArmyId,'sourceArmyId'],[officerId,'officerId'],[cityId,'cityId'],[newArmyId,'newArmyId'],[troopType,'troopType']])invariant(typeof value==='string'&&value,`DETACHMENT_${label.toUpperCase()}_REQUIRED`);
  invariant(integer(transferTroopCount,1),'DETACHMENT_TRANSFER_TROOPS_REQUIRED');
  const world=snapshot.world,source=world.armies[sourceArmyId],officer=world.officers[officerId],city=world.cities[cityId];
  invariant(source,`DETACHMENT_SOURCE_ARMY_NOT_FOUND:${sourceArmyId}`);invariant(officer,`DETACHMENT_OFFICER_NOT_FOUND:${officerId}`);invariant(city,`DETACHMENT_CITY_NOT_FOUND:${cityId}`);
  const faction=world.factions[source.factionId];invariant(faction,`DETACHMENT_FACTION_NOT_FOUND:${source.factionId}`);
  invariant(city.ownerFactionId===source.factionId&&faction.ownedCityIds.includes(cityId),`DETACHMENT_CITY_NOT_OWNED:${cityId}:${source.factionId}`);
  invariant(source.tileId===city.tileId,`DETACHMENT_FIELD_SPLIT_FORBIDDEN:${sourceArmyId}:${cityId}`);
  invariant(source.currentOrder===null&&source.movementState===null&&source.retreatState===null&&source.engagedArmyIds.length===0,`DETACHMENT_SOURCE_ARMY_UNAVAILABLE:${sourceArmyId}`);
  invariant(officer.allegianceFactionId===source.factionId,`DETACHMENT_OFFICER_FACTION_MISMATCH:${officerId}`);
  invariant(officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY',`DETACHMENT_OFFICER_UNAVAILABLE:${officerId}`);
  invariant(officer.locationRef?.kind==='CITY'&&officer.locationRef.id===cityId,`DETACHMENT_OFFICER_NOT_AT_CITY:${officerId}:${cityId}`);
  invariant(faction.rulerId!==officerId&&!Object.values(world.cities).some(item=>item.governorId===officerId)&&!Object.values(world.armies).some(item=>item.commanderId===officerId),`DETACHMENT_OFFICER_NOT_STRATEGIC_RESERVE:${officerId}`);
  invariant(!Object.hasOwn(world.armies,newArmyId)&&newArmyId!==sourceArmyId,`DETACHMENT_ARMY_ID_ALREADY_EXISTS:${newArmyId}`);
  invariant(troopType===source.troopType,`DETACHMENT_TROOP_CONVERSION_FORBIDDEN:${source.troopType}:${troopType}`);
  invariant(officer.allowedTroops.includes(troopType),`DETACHMENT_TROOP_NOT_ALLOWED:${officerId}:${troopType}`);
  invariant(source.troopCount-transferTroopCount>=snapshot.policy.minimumSourceRemainder,`DETACHMENT_SOURCE_REMAINDER_TOO_LOW:${sourceArmyId}`);
  const next=clone(snapshot),start=snapshot.currentGlobalTick;
  const preparation={preparationId,sourceArmyId,officerId,cityId,cityTileId:city.tileId,newArmyId,factionId:source.factionId,troopType,transferTroopCount,minimumSourceRemainder:snapshot.policy.minimumSourceRemainder,startedGlobalTick:start,expectedEndGlobalTick:start+PREPARATION_DURATION_TICKS,status:'PREPARING',startEventId:eventId,completionEventId:null,cancellationEventId:null,completedGlobalTick:null,cancelledGlobalTick:null,cancelReason:null,cancellationMode:null,invalidationReasonsAtCancellation:null,deploymentTileId:null,dependencyFingerprintBefore:null,completionWorldFingerprintBefore:null,cancellationWorldFingerprint:null,sourceArmyBefore:clone(source),officerBefore:clone(officer),factionArmyIdsBefore:clone(faction.armyIds)};
  preparation.dependencyFingerprintBefore=fingerprint(dependencyImage(snapshot.world,preparation));next.preparation=preparation;
  recordEvent(next,eventId,replay.payloadFingerprint);return validateDetachmentPreparationSnapshot(next);
}

export function synchronizeDetachmentPreparationWorld(snapshot,{eventId,world}={}){
  validateDetachmentPreparationSnapshot(snapshot);validateFirst3State(world);const nextGlobalTick=worldGlobalTick(world),payload={type:'SYNC_DETACHMENT_WORLD',worldFingerprint:fingerprint(world),currentGlobalTick:nextGlobalTick};const replay=eventReplay(snapshot,eventId,payload);if(replay.replayed)return clone(snapshot);
  invariant(nextGlobalTick>=snapshot.currentGlobalTick,`DETACHMENT_WORLD_TIME_CANNOT_REWIND:${nextGlobalTick}<${snapshot.currentGlobalTick}`);const preparation=activePreparation(snapshot);invariant(preparation,`DETACHMENT_PREPARATION_NOT_ACTIVE:${snapshot.preparation?.preparationId??'NONE'}`);assertDependenciesUnchanged(world,preparation);
  const next=clone(snapshot);next.world=clone(world);next.currentGlobalTick=nextGlobalTick;recordEvent(next,eventId,replay.payloadFingerprint);return validateDetachmentPreparationSnapshot(next);
}

export function cancelDetachmentPreparationWorld(snapshot,{eventId,preparationId,reason,world}={}){
  validateDetachmentPreparationSnapshot(snapshot);validateFirst3State(world);const currentGlobalTick=worldGlobalTick(world),worldFingerprint=fingerprint(world),payload={type:'CANCEL_DETACHMENT',preparationId,reason,currentGlobalTick,worldFingerprint};const replay=eventReplay(snapshot,eventId,payload);if(replay.replayed)return clone(snapshot);
  const preparation=snapshot.preparation;invariant(preparation?.preparationId===preparationId,`DETACHMENT_PREPARATION_NOT_FOUND:${preparationId}`);invariant(preparation.status==='PREPARING',`DETACHMENT_PREPARATION_NOT_ACTIVE:${preparationId}`);
  invariant(typeof reason==='string'&&reason&&currentGlobalTick>=snapshot.currentGlobalTick,'INVALID_DETACHMENT_CANCELLATION_INPUT');assertDependenciesUnchanged(world,preparation);
  const next=clone(snapshot);next.world=clone(world);next.currentGlobalTick=currentGlobalTick;next.preparation.status='CANCELLED';next.preparation.cancelledGlobalTick=currentGlobalTick;next.preparation.cancelReason=reason;next.preparation.cancellationMode='USER_CANCEL';next.preparation.cancellationEventId=eventId;next.preparation.cancellationWorldFingerprint=worldFingerprint;recordEvent(next,eventId,replay.payloadFingerprint);return validateDetachmentPreparationSnapshot(next);
}

export function invalidateDetachmentPreparationWorld(snapshot,{eventId,reason,world}={}){
  validateDetachmentPreparationSnapshot(snapshot);validateFirst3State(world);const preparation=snapshot.preparation,currentGlobalTick=worldGlobalTick(world),worldFingerprint=fingerprint(world),observedReasons=preparation?dependencyInvalidationReasons(world,preparation):[];
  const payload={type:'INVALIDATE_DETACHMENT',preparationId:preparation?.preparationId??null,reason,observedReasons,currentGlobalTick,worldFingerprint},replay=eventReplay(snapshot,eventId,payload);if(replay.replayed)return clone(snapshot);
  invariant(preparation?.status==='PREPARING',`DETACHMENT_PREPARATION_NOT_ACTIVE:${preparation?.preparationId??'NONE'}`);invariant(currentGlobalTick>=snapshot.currentGlobalTick,'INVALID_DETACHMENT_INVALIDATION_TICK');invariant(INVALIDATION_REASONS.has(reason),`INVALID_DETACHMENT_INVALIDATION_REASON:${reason}`);invariant(observedReasons.length>0,`DETACHMENT_INVALIDATION_WITHOUT_DEPENDENCY_CHANGE:${preparation.preparationId}`);invariant(observedReasons.includes(reason),`DETACHMENT_INVALIDATION_REASON_NOT_OBSERVED:${reason}:${observedReasons.join(',')}`);
  const next=clone(snapshot);next.world=clone(world);next.currentGlobalTick=currentGlobalTick;next.preparation.status='CANCELLED';next.preparation.cancelledGlobalTick=currentGlobalTick;next.preparation.cancelReason=reason;next.preparation.cancellationMode='SYSTEM_INVALIDATION';next.preparation.invalidationReasonsAtCancellation=clone(observedReasons);next.preparation.cancellationEventId=eventId;next.preparation.cancellationWorldFingerprint=worldFingerprint;recordEvent(next,eventId,replay.payloadFingerprint);return validateDetachmentPreparationSnapshot(next);
}

export function completeDetachmentPreparationWorld(snapshot,{eventId,preparationId,deploymentTileId,world}={}){
  validateDetachmentPreparationSnapshot(snapshot);validateFirst3State(world);const currentGlobalTick=worldGlobalTick(world),worldFingerprintBefore=fingerprint(world),payload={type:'COMPLETE_DETACHMENT',preparationId,deploymentTileId,currentGlobalTick,worldFingerprintBefore};const replay=eventReplay(snapshot,eventId,payload);if(replay.replayed)return clone(snapshot);
  const preparation=snapshot.preparation;invariant(preparation?.preparationId===preparationId,`DETACHMENT_PREPARATION_NOT_FOUND:${preparationId}`);invariant(preparation.status==='PREPARING',`DETACHMENT_PREPARATION_NOT_ACTIVE:${preparationId}`);
  invariant(currentGlobalTick>=snapshot.currentGlobalTick,'INVALID_DETACHMENT_COMPLETION_TICK');invariant(currentGlobalTick>=preparation.expectedEndGlobalTick,`DETACHMENT_PREPARATION_NOT_READY:${preparationId}:${preparation.expectedEndGlobalTick-currentGlobalTick}`);assertDependenciesUnchanged(world,preparation);
  const deploymentTile=world.tiles[deploymentTileId];invariant(deploymentTile,`DETACHMENT_DEPLOYMENT_TILE_NOT_FOUND:${deploymentTileId}`);invariant(deploymentTile.terrainType!=='water',`DETACHMENT_DEPLOYMENT_TILE_WATER:${deploymentTileId}`);const cityTile=world.tiles[preparation.cityTileId];invariant(hexDistance(cityTile,deploymentTile)===1,`DETACHMENT_DEPLOYMENT_NOT_ADJACENT:${preparation.cityTileId}:${deploymentTileId}`);invariant(!Object.values(world.armies).some(army=>activeArmy(world,army)&&army.tileId===deploymentTileId),`DETACHMENT_DEPLOYMENT_TILE_OCCUPIED:${deploymentTileId}`);
  const finalizedPreparation={...preparation,deploymentTileId},result=expectedResult(finalizedPreparation),next=clone(snapshot);next.world=clone(world);
  if(world.campaignTerminalWorld)next.preparation.terminalWorldBefore=clone(world.campaignTerminalWorld);
  next.world.armies[preparation.sourceArmyId]=result.sourceArmy;next.world.armies[preparation.newArmyId]=result.newArmy;next.world.officers[preparation.officerId]=result.officer;next.world.factions[preparation.factionId].armyIds=result.factionArmyIds;
  next.world=synchronizeCampaignTerminalWorldRoster(next.world);
  next.currentGlobalTick=currentGlobalTick;next.preparation.status='COMPLETED';next.preparation.completedGlobalTick=currentGlobalTick;next.preparation.completionEventId=eventId;next.preparation.completionWorldFingerprintBefore=worldFingerprintBefore;next.preparation.deploymentTileId=deploymentTileId;recordEvent(next,eventId,replay.payloadFingerprint);return validateDetachmentPreparationSnapshot(next);
}

export const cancelDetachmentPreparation=cancelDetachmentPreparationWorld;
export const completeDetachmentPreparation=completeDetachmentPreparationWorld;

export function getDetachmentPreparationAvailability(snapshot,{globalTick=snapshot.currentGlobalTick}={}){
  validateDetachmentPreparationSnapshot(snapshot);invariant(integer(globalTick)&&globalTick>=snapshot.currentGlobalTick,'INVALID_DETACHMENT_AVAILABILITY_TICK');const active=activePreparation(snapshot);
  return active?{status:'PREPARING',preparationId:active.preparationId,busyArmyIds:[active.sourceArmyId],busyOfficerIds:[active.officerId],ready:globalTick>=active.expectedEndGlobalTick,remainingTicks:Math.max(0,active.expectedEndGlobalTick-globalTick)}:{status:snapshot.preparation?.status??'NONE',preparationId:snapshot.preparation?.preparationId??null,busyArmyIds:[],busyOfficerIds:[],ready:false,remainingTicks:0};
}

export function serializeDetachmentPreparationSnapshot(snapshot){validateDetachmentPreparationSnapshot(snapshot);return JSON.stringify(snapshot,null,2);}
export function deserializeDetachmentPreparationSnapshot(serialized){invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_DETACHMENT_SERIALIZED_INPUT');let snapshot;try{snapshot=JSON.parse(serialized);}catch{throw new Error('INVALID_DETACHMENT_JSON');}validateDetachmentPreparationSnapshot(snapshot);return clone(snapshot);}

export const DETACHMENT_PREPARATION_FORMAT=FORMAT;
export const DETACHMENT_PREPARATION_VERSION=VERSION;
export const DETACHMENT_PREPARATION_TRIAL={preparationDurationTicks:PREPARATION_DURATION_TICKS,defaultMinimumSourceRemainder:DEFAULT_MINIMUM_SOURCE_REMAINDER};
export const DETACHMENT_PREPARATION_INVALIDATION_REASONS=[...INVALIDATION_REASONS];
