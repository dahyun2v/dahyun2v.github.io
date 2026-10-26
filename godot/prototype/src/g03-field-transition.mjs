import {validateState as validateFirst3State} from './first3.mjs';
import {synchronizeCampaignTerminalWorldRoster} from './campaign-terminal-world-application.mjs';
import {
  synchronizeStrategicAssignmentWorld,
  validateStrategicAssignmentWorldSnapshot,
} from './strategic-assignment-world.mjs';

const PRODUCER='G03_FIELD_TRANSITION';
const CONTENT_VERSION=1;
const TRIAL_STATUS='WORK_TRIAL_COMPLETION_ADAPTER';

export const G03_FIELD_TRANSITION_TRIAL=Object.freeze({
  status:'WORK_TRIAL',
  factionId:'F02',
  cityId:'east',
  armyId:'U-F02-G05',
  currentCommanderId:'G05',
  futureCommanderId:'G03',
  targetTroopType:'spear',
  productionCost:null,
  durationTicks:null,
});

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function fingerprintG03FieldTransition(value){
  let hash=0xcbf29ce484222325n;
  for(const character of stable(value)){hash^=BigInt(character.codePointAt(0));hash=BigInt.asUintN(64,hash*0x100000001b3n);}
  return hash.toString(16).padStart(16,'0');
}
function worldGlobalTick(world){return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;}

function validateCombatLocks(pendingCombatArmyIds){
  invariant(Array.isArray(pendingCombatArmyIds)&&new Set(pendingCombatArmyIds).size===pendingCombatArmyIds.length&&pendingCombatArmyIds.every(id),'G03_TRANSITION_COMBAT_LOCKS_REQUIRED');
}
function validateTrialIdentity(input){
  for(const key of ['factionId','cityId','armyId','currentCommanderId','futureCommanderId','targetTroopType']){
    invariant(input[key]===G03_FIELD_TRANSITION_TRIAL[key],`G03_TRANSITION_TRIAL_IDENTITY_MISMATCH:${key}`);
  }
}
function roleRefs(world,officerId){
  const refs=[];
  for(const city of Object.values(world.cities))if(city.governorId===officerId)refs.push(`GOVERNOR:${city.cityId}`);
  for(const army of Object.values(world.armies))if(army.commanderId===officerId)refs.push(`FIELD_COMMANDER:${army.armyId}`);
  return refs.sort();
}
function assertOnlyOperationalRole(world,officerId,expectedRef){
  const refs=roleRefs(world,officerId);
  invariant(refs.length===1&&refs[0]===expectedRef,`G03_TRANSITION_OFFICER_ROLE_MISMATCH:${officerId}:${refs.join(',')}`);
}
function assertAvailable(snapshot,officerId,factionId,expectedLocation){
  const officer=snapshot.world.officers[officerId],character=snapshot.assignments.characters[officerId];
  invariant(officer&&character,`G03_TRANSITION_OFFICER_NOT_FOUND:${officerId}`);
  invariant(officer.allegianceFactionId===factionId&&character.factionId===factionId,`G03_TRANSITION_OFFICER_NOT_OWNED:${officerId}:${factionId}`);
  invariant(officer.lifeState==='ALIVE',`G03_TRANSITION_OFFICER_DEAD:${officerId}`);
  invariant(officer.conditionState==='NORMAL',`G03_TRANSITION_OFFICER_INJURED:${officerId}:${officer.conditionState}`);
  invariant(officer.captivityState==='FREE',`G03_TRANSITION_OFFICER_CAPTIVE:${officerId}`);
  invariant(officer.travelState==='STATIONARY',`G03_TRANSITION_OFFICER_TRAVELLING:${officerId}`);
  invariant(`${officer.locationRef.kind}:${officer.locationRef.id}`===expectedLocation,`G03_TRANSITION_OFFICER_LOCATION_MISMATCH:${officerId}:${expectedLocation}`);
  invariant(character.assignmentId===null&&character.busyUntilGlobalTick<=snapshot.assignments.time.globalTick,`G03_TRANSITION_STRATEGIC_ASSIGNMENT_ACTIVE:${officerId}`);
}
function assertArmyIdle(army,pendingCombatArmyIds){
  invariant(army.movementState===null,`G03_TRANSITION_ARMY_MOVING:${army.armyId}`);
  invariant(army.currentOrder===null,`G03_TRANSITION_ARMY_ORDER_ACTIVE:${army.armyId}`);
  invariant(army.retreatState===null,`G03_TRANSITION_ARMY_RETREATING:${army.armyId}`);
  invariant(Array.isArray(army.engagedArmyIds)&&army.engagedArmyIds.length===0,`G03_TRANSITION_ARMY_ENGAGED:${army.armyId}`);
  invariant(!pendingCombatArmyIds.includes(army.armyId),`G03_TRANSITION_COMBAT_ACTION_ACTIVE:${army.armyId}`);
}
function assertCommon(snapshot,input){
  validateStrategicAssignmentWorldSnapshot(snapshot);validateTrialIdentity(input);validateCombatLocks(input.pendingCombatArmyIds);
  invariant(id(input.eventId),'G03_TRANSITION_EVENT_ID_REQUIRED');
  invariant(!Object.hasOwn(snapshot.assignments.processedEvents,input.eventId),`G03_TRANSITION_EVENT_ALREADY_PROCESSED:${input.eventId}`);
  invariant(!Object.hasOwn(snapshot.assignments.processedEvents,`${input.eventId}:STRATEGIC_SYNC`),`G03_TRANSITION_SYNC_EVENT_ALREADY_PROCESSED:${input.eventId}`);
  const {world}=snapshot,city=world.cities[input.cityId],army=world.armies[input.armyId];
  invariant(city&&army,'G03_TRANSITION_CITY_OR_ARMY_NOT_FOUND');
  invariant(city.ownerFactionId===input.factionId&&army.factionId===input.factionId,'G03_TRANSITION_TARGET_NOT_OWNED');
  invariant(world.factions[input.factionId]?.ownedCityIds.includes(input.cityId)&&world.factions[input.factionId]?.armyIds.includes(input.armyId),'G03_TRANSITION_FACTION_LINK_MISMATCH');
  invariant(city.tileId===army.tileId,`G03_TRANSITION_ARMY_NOT_AT_CITY:${input.armyId}:${input.cityId}`);
  invariant(city.occupationState==='NORMAL',`G03_TRANSITION_CITY_UNAVAILABLE:${input.cityId}:${city.occupationState}`);
  invariant(city.currentProduction===null,`G03_TRANSITION_CITY_PRODUCTION_ACTIVE:${input.cityId}`);
  assertArmyIdle(army,input.pendingCombatArmyIds);
  return {world,city,army};
}

function eventProposal({snapshot,input,actionType,actors,causeEventIds,result,worldBefore,worldAfter}){
  const proposal={
    eventId:input.eventId,
    schemaVersion:1,
    campaignId:snapshot.assignments.campaignId,
    globalTick:worldGlobalTick(worldAfter),
    placeRef:`CITY:${input.cityId}`,
    actorRefs:[...actors].sort(),
    targetRefs:[input.armyId],
    participantRefs:[...new Set([...actors,input.armyId])].sort(),
    factionRefs:[input.factionId],
    causeEventIds:[...causeEventIds].sort(),
    producer:PRODUCER,
    actionType,
    result:{...clone(result),status:'COMPLETED',adapterStatus:TRIAL_STATUS},
    importance:'MINOR',
    contentVersion:CONTENT_VERSION,
    derivation:{balanceStatus:'WORK_TRIAL',productionCost:null,durationTicks:null},
    transitionEvidence:{
      worldBeforeFingerprint:fingerprintG03FieldTransition(worldBefore),
      worldAfterFingerprint:fingerprintG03FieldTransition(worldAfter),
    },
    transitionFingerprint:null,
  };
  proposal.transitionFingerprint=fingerprintG03FieldTransition({...proposal,transitionFingerprint:null});
  return proposal;
}

export function validateG03FieldTransitionEvent(event){
  invariant(object(event)&&id(event.eventId)&&event.schemaVersion===1&&id(event.campaignId),'INVALID_G03_TRANSITION_EVENT');
  invariant(event.producer===PRODUCER&&['BASIC_TROOP_REORGANIZATION_COMPLETED','GOVERNOR_COMMANDER_SWAP_COMPLETED'].includes(event.actionType),'INVALID_G03_TRANSITION_EVENT_TYPE');
  invariant(typeof event.transitionFingerprint==='string'&&/^[a-f0-9]{16}$/.test(event.transitionFingerprint),'INVALID_G03_TRANSITION_FINGERPRINT');
  invariant(typeof event.transitionEvidence?.worldBeforeFingerprint==='string'&&typeof event.transitionEvidence?.worldAfterFingerprint==='string','INVALID_G03_TRANSITION_EVIDENCE');
  invariant(event.transitionFingerprint===fingerprintG03FieldTransition({...event,transitionFingerprint:null}),'G03_TRANSITION_FINGERPRINT_MISMATCH');
  invariant(event.result?.status==='COMPLETED'&&event.result.adapterStatus===TRIAL_STATUS,'INVALID_G03_TRANSITION_RESULT');
  return event;
}

function commitWorld(snapshot,input,nextWorld,proposal){
  validateFirst3State(nextWorld);validateG03FieldTransitionEvent(proposal);
  const synced=synchronizeStrategicAssignmentWorld(snapshot,{eventId:`${input.eventId}:STRATEGIC_SYNC`,world:nextWorld});
  invariant(synced.proposedEvents.length===0,'G03_TRANSITION_UNEXPECTED_ASSIGNMENT_RESOLUTION');
  synced.snapshot.assignments.processedEvents[input.eventId]=proposal.transitionFingerprint;
  validateStrategicAssignmentWorldSnapshot(synced.snapshot);
  return {snapshot:synced.snapshot,event:clone(proposal),transitionFingerprint:proposal.transitionFingerprint};
}

export function completeBasicTroopReorganizationWorld(snapshot,input={}){
  const {world,city,army}=assertCommon(snapshot,input);
  invariant(city.governorId===input.futureCommanderId,`G03_TRANSITION_EXPECTED_GOVERNOR_MISSING:${input.cityId}:${input.futureCommanderId}`);
  invariant(army.commanderId===input.currentCommanderId,`G03_TRANSITION_EXPECTED_COMMANDER_MISSING:${input.armyId}:${input.currentCommanderId}`);
  assertOnlyOperationalRole(world,input.currentCommanderId,`FIELD_COMMANDER:${input.armyId}`);
  assertOnlyOperationalRole(world,input.futureCommanderId,`GOVERNOR:${input.cityId}`);
  assertAvailable(snapshot,input.currentCommanderId,input.factionId,`ARMY:${input.armyId}`);
  assertAvailable(snapshot,input.futureCommanderId,input.factionId,`CITY:${input.cityId}`);
  invariant(army.troopType!==input.targetTroopType,`G03_TRANSITION_TROOP_ALREADY_REORGANIZED:${input.armyId}:${input.targetTroopType}`);
  invariant(world.officers[input.currentCommanderId].allowedTroops.includes(input.targetTroopType),`G03_TRANSITION_CURRENT_COMMANDER_TROOP_FORBIDDEN:${input.currentCommanderId}:${input.targetTroopType}`);
  invariant(world.officers[input.futureCommanderId].allowedTroops.includes(input.targetTroopType),`G03_TRANSITION_FUTURE_COMMANDER_TROOP_FORBIDDEN:${input.futureCommanderId}:${input.targetTroopType}`);
  const nextWorld=clone(world),beforeTroopType=army.troopType;
  nextWorld.armies[input.armyId].troopType=input.targetTroopType;
  const proposal=eventProposal({snapshot,input,actionType:'BASIC_TROOP_REORGANIZATION_COMPLETED',actors:[input.currentCommanderId,input.futureCommanderId],causeEventIds:[],result:{factionId:input.factionId,cityId:input.cityId,armyId:input.armyId,commanderId:input.currentCommanderId,beforeTroopType,afterTroopType:input.targetTroopType},worldBefore:world,worldAfter:nextWorld});
  return commitWorld(snapshot,input,nextWorld,proposal);
}

export function swapGovernorAndCommanderWorld(snapshot,input={}){
  const {world,city,army}=assertCommon(snapshot,input);
  validateG03FieldTransitionEvent(input.reorganizationEvent);
  invariant(input.reorganizationEvent.actionType==='BASIC_TROOP_REORGANIZATION_COMPLETED','G03_TRANSITION_REORGANIZATION_CAUSE_REQUIRED');
  invariant(input.reorganizationEvent.transitionFingerprint===snapshot.assignments.processedEvents[input.reorganizationEvent.eventId],'G03_TRANSITION_REORGANIZATION_RECEIPT_MISMATCH');
  invariant(input.reorganizationEvent.transitionEvidence.worldAfterFingerprint===fingerprintG03FieldTransition(world),'G03_TRANSITION_WORLD_DRIFT_AFTER_REORGANIZATION');
  invariant(input.reorganizationEvent.campaignId===snapshot.assignments.campaignId&&input.reorganizationEvent.result?.factionId===input.factionId&&input.reorganizationEvent.result?.cityId===input.cityId&&input.reorganizationEvent.result?.armyId===input.armyId&&input.reorganizationEvent.result?.afterTroopType===input.targetTroopType,'G03_TRANSITION_REORGANIZATION_CAUSE_SCOPE_MISMATCH');
  invariant(city.governorId===input.futureCommanderId,`G03_TRANSITION_EXPECTED_GOVERNOR_MISSING:${input.cityId}:${input.futureCommanderId}`);
  invariant(army.commanderId===input.currentCommanderId,`G03_TRANSITION_EXPECTED_COMMANDER_MISSING:${input.armyId}:${input.currentCommanderId}`);
  invariant(army.troopType===input.targetTroopType,`G03_TRANSITION_REORGANIZATION_NOT_APPLIED:${input.armyId}:${input.targetTroopType}`);
  assertOnlyOperationalRole(world,input.currentCommanderId,`FIELD_COMMANDER:${input.armyId}`);
  assertOnlyOperationalRole(world,input.futureCommanderId,`GOVERNOR:${input.cityId}`);
  assertAvailable(snapshot,input.currentCommanderId,input.factionId,`ARMY:${input.armyId}`);
  assertAvailable(snapshot,input.futureCommanderId,input.factionId,`CITY:${input.cityId}`);
  invariant(world.officers[input.futureCommanderId].allowedTroops.includes(army.troopType),`G03_TRANSITION_FUTURE_COMMANDER_TROOP_FORBIDDEN:${input.futureCommanderId}:${army.troopType}`);
  let nextWorld=clone(world);
  nextWorld.cities[input.cityId].governorId=input.currentCommanderId;
  nextWorld.armies[input.armyId].commanderId=input.futureCommanderId;
  nextWorld.officers[input.currentCommanderId].locationRef={kind:'CITY',id:input.cityId};
  nextWorld.officers[input.futureCommanderId].locationRef={kind:'ARMY',id:input.armyId};
  nextWorld=synchronizeCampaignTerminalWorldRoster(nextWorld);
  assertOnlyOperationalRole(nextWorld,input.currentCommanderId,`GOVERNOR:${input.cityId}`);
  assertOnlyOperationalRole(nextWorld,input.futureCommanderId,`FIELD_COMMANDER:${input.armyId}`);
  const proposal=eventProposal({snapshot,input,actionType:'GOVERNOR_COMMANDER_SWAP_COMPLETED',actors:[input.currentCommanderId,input.futureCommanderId],causeEventIds:[input.reorganizationEvent.eventId],result:{factionId:input.factionId,cityId:input.cityId,armyId:input.armyId,beforeGovernorId:input.futureCommanderId,afterGovernorId:input.currentCommanderId,beforeCommanderId:input.currentCommanderId,afterCommanderId:input.futureCommanderId,troopType:input.targetTroopType},worldBefore:world,worldAfter:nextWorld});
  return commitWorld(snapshot,input,nextWorld,proposal);
}

export const G03_FIELD_TRANSITION_PRODUCER=PRODUCER;
export const G03_FIELD_TRANSITION_CONTENT_VERSION=CONTENT_VERSION;
