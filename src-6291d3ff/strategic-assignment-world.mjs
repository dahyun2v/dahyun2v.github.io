import {validateState as validateFirst3State} from './first3.mjs';
import {admitFieldInspection} from './field-operation.mjs';
import {
  advanceStrategicAssignmentTime,
  createStrategicAssignmentState,
  deserializeStrategicAssignmentState,
  failActiveAssignment,
  getAssignmentStartHistoryProposal,
  serializeStrategicAssignmentState,
  startTrainingAssignment,
  validateStrategicAssignmentState,
} from './strategic-assignments.mjs';

const FORMAT='sangoku-strategic-assignment-world';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=5_000_000;
const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function sameIds(left,right){return [...left].sort().join('|')===[...right].sort().join('|');}
function worldGlobalTick(world){return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;}

function locationRef(officer){
  if(officer.locationRef?.kind==='NONE'&&officer.locationRef.id===null)return 'NONE';
  invariant(object(officer.locationRef)&&['CITY','ARMY'].includes(officer.locationRef.kind)&&typeof officer.locationRef.id==='string',`UNSUPPORTED_WORLD_OFFICER_LOCATION:${officer.officerId}`);
  return `${officer.locationRef.kind}:${officer.locationRef.id}`;
}
function injuryState(conditionState){return conditionState==='NORMAL'?'FIT':conditionState;}

function deriveCharacter(world,characterId){
  const officer=world.officers[characterId];invariant(officer,`WORLD_OFFICER_NOT_FOUND:${characterId}`);
  const faction=world.factions[officer.allegianceFactionId];invariant(faction,`WORLD_OFFICER_FACTION_NOT_FOUND:${characterId}`);
  const governorCity=Object.values(world.cities).find(city=>city.governorId===characterId)??null;
  const army=Object.values(world.armies).find(item=>item.commanderId===characterId&&(!world.campaignTerminalWorld||world.campaignTerminalWorld.armiesById[item.armyId]?.disposition==='ACTIVE'))??null;
  const roles=[];if(faction.rulerId===characterId)roles.push('RULER');if(governorCity)roles.push('GOVERNOR');if(army)roles.push('FIELD_COMMANDER');if(roles.length>0)roles.push('TRAINING_SUPERVISOR');roles.sort();
  return {characterId,factionId:officer.allegianceFactionId,locationRef:locationRef(officer),officeRef:governorCity?`GOVERNOR:${governorCity.cityId}`:faction.rulerId===characterId?`RULER:${faction.factionId}`:null,armyRef:army?.armyId??null,injuryState:injuryState(officer.conditionState),captivityState:officer.captivityState,lifeState:officer.lifeState,travelState:officer.travelState,roles};
}

function derivedCharacters(world){return Object.fromEntries(Object.keys(world.officers).sort().map(characterId=>[characterId,deriveCharacter(world,characterId)]));}
function derivedFactions(world){return Object.fromEntries(Object.keys(world.factions).sort().map(factionId=>[factionId,{capacity:3}]));}

function compareWorldCharacter(character,derived){
  for(const key of ['factionId','locationRef','officeRef','armyRef','injuryState','captivityState','lifeState','travelState'])invariant(character[key]===derived[key],`STRATEGIC_WORLD_CHARACTER_MISMATCH:${character.characterId}:${key}`);
  invariant(sameIds(character.roles,derived.roles),`STRATEGIC_WORLD_CHARACTER_MISMATCH:${character.characterId}:roles`);
}

export function validateStrategicAssignmentWorldSnapshot(snapshot){
  invariant(object(snapshot)&&snapshot.format===FORMAT&&snapshot.version===VERSION,'INVALID_STRATEGIC_ASSIGNMENT_WORLD_FORMAT');
  invariant(object(snapshot.world)&&object(snapshot.assignments),'INVALID_STRATEGIC_ASSIGNMENT_WORLD_CONTENT');validateFirst3State(snapshot.world);validateStrategicAssignmentState(snapshot.assignments);
  invariant(snapshot.assignments.campaignId===snapshot.world.scenarioId,`STRATEGIC_WORLD_CAMPAIGN_MISMATCH:${snapshot.assignments.campaignId}:${snapshot.world.scenarioId}`);
  invariant(snapshot.assignments.time.turnNumber===snapshot.world.turnNumber&&snapshot.assignments.time.tick===snapshot.world.time.tick&&snapshot.assignments.time.globalTick===worldGlobalTick(snapshot.world),'STRATEGIC_WORLD_TIME_MISMATCH');
  invariant(sameIds(Object.keys(snapshot.world.factions),Object.keys(snapshot.assignments.factions)),'STRATEGIC_WORLD_FACTION_SET_MISMATCH');
  invariant(sameIds(Object.keys(snapshot.world.officers),Object.keys(snapshot.assignments.characters)),'STRATEGIC_WORLD_CHARACTER_SET_MISMATCH');
  const derived=derivedCharacters(snapshot.world);for(const[characterId,character]of Object.entries(snapshot.assignments.characters))compareWorldCharacter(character,derived[characterId]);
  return snapshot;
}

export function createStrategicAssignmentWorldSnapshot({world,assignmentState=null}={}){
  validateFirst3State(world);
  const assignments=assignmentState===null?createStrategicAssignmentState({campaignId:world.scenarioId,factions:derivedFactions(world),characters:derivedCharacters(world),turnNumber:world.turnNumber,tick:world.time.tick}):deserializeStrategicAssignmentState(serializeStrategicAssignmentState(assignmentState));
  return validateStrategicAssignmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(world),assignments});
}

export function startStrategicWorldTraining(snapshot,input){
  validateStrategicAssignmentWorldSnapshot(snapshot);const nextAssignments=startTrainingAssignment(snapshot.assignments,input);
  return validateStrategicAssignmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(snapshot.world),assignments:nextAssignments});
}

export function admitStrategicWorldFieldInspection(snapshot,input){
  validateStrategicAssignmentWorldSnapshot(snapshot);const nextAssignments=admitFieldInspection(snapshot.assignments,input);
  return validateStrategicAssignmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(snapshot.world),assignments:nextAssignments});
}

export function synchronizeStrategicAssignmentWorld(snapshot,{eventId,world}={}){
  validateStrategicAssignmentWorldSnapshot(snapshot);validateFirst3State(world);
  invariant(sameIds(Object.keys(snapshot.world.factions),Object.keys(world.factions)),'STRATEGIC_WORLD_FACTION_SET_CHANGED');invariant(sameIds(Object.keys(snapshot.world.officers),Object.keys(world.officers)),'STRATEGIC_WORLD_CHARACTER_SET_CHANGED');
  const targetGlobalTick=worldGlobalTick(world);invariant(targetGlobalTick>=snapshot.assignments.time.globalTick,'STRATEGIC_WORLD_TIME_CANNOT_REWIND');const derived=derivedCharacters(world),interruptionEvents=[];let working=clone(snapshot.assignments);
  for(const assignment of Object.values(working.assignments).filter(item=>item.status==='ACTIVE').sort((a,b)=>a.assignmentId.localeCompare(b.assignmentId))){
    if(targetGlobalTick>assignment.expectedEndGlobalTick)continue;
    const actual=derived[assignment.characterId];let reason=null;
    if(actual.factionId!==assignment.factionId)reason='FACTION_CHANGED';else if(actual.lifeState!=='ALIVE')reason='DEAD';else if(actual.captivityState!=='FREE')reason='CAPTURED';else if(actual.injuryState!=='FIT')reason='INJURED';else if(!actual.roles.includes(assignment.role))reason='ROLE_LOST';
    else if(assignment.type==='TRAINING'&&actual.locationRef!==assignment.originRef)reason='LOCATION_CHANGED';else if(assignment.type==='TRAINING'&&actual.travelState!=='STATIONARY')reason='DEPARTED';
    else if(assignment.type==='FIELD_INSPECTION'&&actual.armyRef!==assignment.armyId)reason='COMMAND_OR_ARMY_CHANGED';
    if(reason!==null){const failed=failActiveAssignment(working,{eventId:`${eventId}:FAIL:${assignment.assignmentId}`,assignmentId:assignment.assignmentId,reason:`WORLD_${reason}`,resultGlobalTick:targetGlobalTick});working=failed.state;interruptionEvents.push(...failed.proposedEvents);}
  }
  const advanced=advanceStrategicAssignmentTime(working,{eventId,turnNumber:world.turnNumber,tick:world.time.tick}),nextAssignments=advanced.state;
  for(const[characterId,character]of Object.entries(nextAssignments.characters)){
    const actual=derived[characterId];
    for(const key of ['factionId','locationRef','officeRef','armyRef','injuryState','captivityState','lifeState','travelState','roles'])character[key]=clone(actual[key]);
  }
  const nextSnapshot=validateStrategicAssignmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(world),assignments:nextAssignments});
  return {snapshot:nextSnapshot,proposedEvents:[...interruptionEvents,...advanced.proposedEvents]};
}

export function getStrategicWorldStartHistoryProposal(snapshot,{assignmentId}={}){
  validateStrategicAssignmentWorldSnapshot(snapshot);return getAssignmentStartHistoryProposal(snapshot.assignments,{assignmentId});
}

export function strategicLocationToHistoryPlaceRef(value){
  invariant(typeof value==='string'&&value.includes(':'),'INVALID_STRATEGIC_HISTORY_LOCATION');const split=value.indexOf(':'),type=value.slice(0,split),id=value.slice(split+1);invariant(['CITY','ARMY','TILE'].includes(type)&&id,'INVALID_STRATEGIC_HISTORY_LOCATION');return {type,id};
}

export function serializeStrategicAssignmentWorldSnapshot(snapshot){validateStrategicAssignmentWorldSnapshot(snapshot);return JSON.stringify(snapshot,null,2);}
export function deserializeStrategicAssignmentWorldSnapshot(serialized){invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_STRATEGIC_ASSIGNMENT_WORLD_SERIALIZED_INPUT');let snapshot;try{snapshot=JSON.parse(serialized);}catch{throw new Error('INVALID_STRATEGIC_ASSIGNMENT_WORLD_JSON');}if(object(snapshot)&&object(snapshot.assignments))snapshot.assignments=deserializeStrategicAssignmentState(JSON.stringify(snapshot.assignments));validateStrategicAssignmentWorldSnapshot(snapshot);return clone(snapshot);}

export const STRATEGIC_ASSIGNMENT_WORLD_FORMAT=FORMAT;
export const STRATEGIC_ASSIGNMENT_WORLD_VERSION=VERSION;
