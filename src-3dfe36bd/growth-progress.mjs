import {grantGrowthEntitlement,validateGrowthTrack} from './growth-track.mjs';
import {validateStrategicAssignmentState} from './strategic-assignments.mjs';

const FORMAT='sangoku-growth-progress';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=6_000_000;
const UINT32_MAX=0xffffffff;

export const GROWTH_PROGRESS_TRIAL=Object.freeze({
  configVersion:'R5-GXP-T1',
  maxLevel:30,
  xpFormula:'110+6*CURRENT_LEVEL',
  trainingCompletion:{serviceXp:5,nonCombatXp:4,totalXp:9},
  acceptedProducer:'strategic-assignments',
  acceptedActionType:'ASSIGNMENT_TRAINING_COMPLETED',
  acceptedContentVersion:'strategic-assignments/1',
});

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function xpToNextLevel(level){
  invariant(integer(level,1)&&level<=GROWTH_PROGRESS_TRIAL.maxLevel,'INVALID_GROWTH_PROGRESS_LEVEL');
  return level===GROWTH_PROGRESS_TRIAL.maxLevel?null:110+6*level;
}

export function totalXpFromLevel1To30(){
  let total=0;
  for(let level=1;level<GROWTH_PROGRESS_TRIAL.maxLevel;level+=1)total+=xpToNextLevel(level);
  return total;
}

function validateCharacter(record,characterId){
  invariant(object(record)&&record.characterId===characterId,'INVALID_GROWTH_PROGRESS_CHARACTER');
  invariant(integer(record.initialLevel,1)&&record.initialLevel<=GROWTH_PROGRESS_TRIAL.maxLevel,'INVALID_GROWTH_PROGRESS_INITIAL_LEVEL');
  invariant(integer(record.level,record.initialLevel)&&record.level<=GROWTH_PROGRESS_TRIAL.maxLevel,'INVALID_GROWTH_PROGRESS_CHARACTER_LEVEL');
  invariant(integer(record.xp)&&integer(record.totalXp),'INVALID_GROWTH_PROGRESS_XP');
  if(record.level===GROWTH_PROGRESS_TRIAL.maxLevel)invariant(record.xp===0,'MAX_LEVEL_XP_MUST_BE_ZERO');
  else invariant(record.xp<xpToNextLevel(record.level),'GROWTH_PROGRESS_XP_NOT_NORMALIZED');
  invariant(Array.isArray(record.sourceEventIds)&&new Set(record.sourceEventIds).size===record.sourceEventIds.length&&record.sourceEventIds.every(id),'INVALID_GROWTH_PROGRESS_CHARACTER_SOURCES');
}

export function validateGrowthProgressState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_GROWTH_PROGRESS_FORMAT');
  invariant(id(state.campaignId)&&integer(state.campaignSeed)&&state.campaignSeed<=UINT32_MAX&&integer(state.rngState)&&state.rngState<=UINT32_MAX,'INVALID_GROWTH_PROGRESS_IDENTITY');
  invariant(stable(state.settings)===stable(GROWTH_PROGRESS_TRIAL),'INVALID_GROWTH_PROGRESS_SETTINGS');
  for(const key of ['characters','processedSources','sourceByAssignmentId'])invariant(object(state[key]),`INVALID_GROWTH_PROGRESS_COLLECTION:${key}`);
  invariant(Array.isArray(state.sourceOrder)&&new Set(state.sourceOrder).size===state.sourceOrder.length,'INVALID_GROWTH_PROGRESS_SOURCE_ORDER');
  const simulated={};
  for(const[characterId,record]of Object.entries(state.characters)){validateCharacter(record,characterId);simulated[characterId]={level:record.initialLevel,xp:0,totalXp:0,sourceEventIds:[]};}
  invariant(state.sourceOrder.length===Object.keys(state.processedSources).length,'GROWTH_PROGRESS_SOURCE_COUNT_MISMATCH');
  invariant(state.sourceOrder.length===Object.keys(state.sourceByAssignmentId).length,'GROWTH_PROGRESS_ASSIGNMENT_COUNT_MISMATCH');
  let previousTick=-1;
  for(const sourceEventId of state.sourceOrder){
    const record=state.processedSources[sourceEventId];
    invariant(object(record)&&record.sourceEventId===sourceEventId&&id(record.assignmentId)&&id(record.characterId)&&typeof record.fingerprint==='string'&&object(record.result),'INVALID_GROWTH_PROGRESS_SOURCE');
    invariant(state.sourceByAssignmentId[record.assignmentId]===sourceEventId,`GROWTH_PROGRESS_ASSIGNMENT_INDEX_MISMATCH:${record.assignmentId}`);
    invariant(Object.hasOwn(state.characters,record.characterId),'UNKNOWN_GROWTH_PROGRESS_CHARACTER');
    invariant(integer(record.globalTick)&&record.globalTick>=previousTick,'GROWTH_PROGRESS_SOURCE_TICK_REGRESSION');previousTick=record.globalTick;
    invariant(integer(record.result.xpAwarded)&&Array.isArray(record.result.levelUps),'INVALID_GROWTH_PROGRESS_RESULT');
    const expected=simulated[record.characterId],expectedAward=expected.level<GROWTH_PROGRESS_TRIAL.maxLevel?GROWTH_PROGRESS_TRIAL.trainingCompletion.totalXp:0;
    invariant(record.result.xpAwarded===expectedAward,'GROWTH_PROGRESS_XP_AWARD_MISMATCH');
    expected.xp+=expectedAward;expected.totalXp+=expectedAward;expected.sourceEventIds.push(sourceEventId);
    let expectedLevelUps=0;
    while(expected.level<GROWTH_PROGRESS_TRIAL.maxLevel&&expected.xp>=xpToNextLevel(expected.level)){expected.xp-=xpToNextLevel(expected.level);expected.level+=1;expectedLevelUps+=1;}
    if(expected.level===GROWTH_PROGRESS_TRIAL.maxLevel)expected.xp=0;
    invariant(record.result.levelUps.length===expectedLevelUps,'GROWTH_PROGRESS_LEVEL_UP_COUNT_MISMATCH');
    for(const levelUp of record.result.levelUps){
      invariant(levelUp.levelAfter===expected.level&&levelUp.levelBefore===levelUp.levelAfter-1,'NON_SEQUENTIAL_GROWTH_PROGRESS_LEVEL');
      invariant(id(levelUp.entitlementId)&&id(levelUp.draftId)&&levelUp.sourceEventId===sourceEventId,'INVALID_GROWTH_PROGRESS_LEVEL_RESULT');
    }
    invariant(record.result.level===expected.level&&record.result.xp===expected.xp&&record.result.totalXp===expected.totalXp,'GROWTH_PROGRESS_RESULT_SNAPSHOT_MISMATCH');
  }
  for(const[characterId,record]of Object.entries(state.characters)){
    const expected=simulated[characterId];
    invariant(record.level===expected.level&&record.xp===expected.xp&&record.totalXp===expected.totalXp,`GROWTH_PROGRESS_CHARACTER_TOTAL_MISMATCH:${characterId}`);
    invariant(stable(record.sourceEventIds)===stable(expected.sourceEventIds),`GROWTH_PROGRESS_CHARACTER_SOURCE_MISMATCH:${characterId}`);
  }
  return state;
}

function assertTrackSync(progress,growthTrack){
  validateGrowthProgressState(progress);validateGrowthTrack(growthTrack);
  invariant(progress.campaignId===growthTrack.campaignId,'GROWTH_PROGRESS_TRACK_CAMPAIGN_MISMATCH');
  const progressIds=Object.keys(progress.characters).sort(),trackIds=Object.keys(growthTrack.growthStates).sort();
  invariant(stable(progressIds)===stable(trackIds),'GROWTH_PROGRESS_TRACK_CHARACTER_MISMATCH');
  for(const characterId of progressIds)invariant(progress.characters[characterId].level===growthTrack.growthStates[characterId].level,`GROWTH_PROGRESS_TRACK_LEVEL_MISMATCH:${characterId}`);
}

export function createGrowthProgressState({campaignId,campaignSeed,growthTrack}={}){
  validateGrowthTrack(growthTrack);
  invariant(id(campaignId)&&campaignId===growthTrack.campaignId,'GROWTH_PROGRESS_CAMPAIGN_REQUIRED');
  invariant(integer(campaignSeed)&&campaignSeed<=UINT32_MAX,'GROWTH_PROGRESS_SEED_REQUIRED');
  const characters={};
  for(const[characterId,growth]of Object.entries(growthTrack.growthStates))characters[characterId]={characterId,initialLevel:growth.level,level:growth.level,xp:0,totalXp:0,sourceEventIds:[]};
  const state={format:FORMAT,version:VERSION,settings:clone(GROWTH_PROGRESS_TRIAL),campaignId,campaignSeed,rngState:(campaignSeed>>>0)||1,characters,processedSources:{},sourceOrder:[],sourceByAssignmentId:{}};
  assertTrackSync(state,growthTrack);return state;
}

export function registerGrowthProgressCharacter(state,{characterId,level=1}={}){
  validateGrowthProgressState(state);invariant(id(characterId)&&!Object.hasOwn(state.characters,characterId),`GROWTH_PROGRESS_CHARACTER_ALREADY_REGISTERED:${characterId}`);invariant(integer(level,1)&&level<=GROWTH_PROGRESS_TRIAL.maxLevel,'INVALID_GROWTH_PROGRESS_INITIAL_LEVEL');
  const next=clone(state);next.characters[characterId]={characterId,initialLevel:level,level,xp:0,totalXp:0,sourceEventIds:[]};return validateGrowthProgressState(next);
}

function expectedCompletionEvent(assignmentState,assignment){
  return {
    eventId:`ASSIGNMENT-RESULT:${assignment.assignmentId}:COMPLETED:${assignment.expectedEndGlobalTick}`,
    schemaVersion:1,
    campaignId:assignmentState.campaignId,
    globalTick:assignment.expectedEndGlobalTick,
    placeRef:assignment.destinationRef,
    actorRefs:[assignment.characterId],targetRefs:[],participantRefs:[assignment.characterId],factionRefs:[assignment.factionId],causeEventIds:[assignment.sourceEventId],
    producer:GROWTH_PROGRESS_TRIAL.acceptedProducer,actionType:GROWTH_PROGRESS_TRIAL.acceptedActionType,
    result:{assignmentId:assignment.assignmentId,type:assignment.type,intent:assignment.intent,role:assignment.role,status:'COMPLETED',reason:null},
    importance:'MINOR',contentVersion:GROWTH_PROGRESS_TRIAL.acceptedContentVersion,
    derivation:{experienceTrace:'EXTERNAL_ONLY',memory:'EXTERNAL_ONLY',growth:'EXTERNAL_ONLY'},
  };
}

function verifiedTrainingSource({progress,assignmentState,sourceEvent}){
  validateStrategicAssignmentState(assignmentState);
  invariant(assignmentState.campaignId===progress.campaignId,'GROWTH_SOURCE_CAMPAIGN_MISMATCH');
  invariant(object(sourceEvent)&&id(sourceEvent.eventId),'GROWTH_SOURCE_EVENT_REQUIRED');
  invariant(sourceEvent.producer===GROWTH_PROGRESS_TRIAL.acceptedProducer,'UNTRUSTED_GROWTH_SOURCE_PRODUCER');
  invariant(sourceEvent.actionType===GROWTH_PROGRESS_TRIAL.acceptedActionType,'UNSUPPORTED_GROWTH_SOURCE_ACTION');
  invariant(sourceEvent.contentVersion===GROWTH_PROGRESS_TRIAL.acceptedContentVersion,'UNSUPPORTED_GROWTH_SOURCE_CONTENT_VERSION');
  const assignmentId=sourceEvent.result?.assignmentId,assignment=assignmentState.assignments[assignmentId];
  invariant(assignment&&assignment.type==='TRAINING','UNKNOWN_GROWTH_SOURCE_ASSIGNMENT');
  invariant(['COMPLETED_PENDING_LEDGER','COMPLETED_RECORDED'].includes(assignment.status),'GROWTH_SOURCE_ASSIGNMENT_NOT_COMPLETED');
  invariant(sourceEvent.eventId===`ASSIGNMENT-RESULT:${assignment.assignmentId}:COMPLETED:${assignment.expectedEndGlobalTick}`,'RENAMED_GROWTH_SOURCE_EVENT');
  if(assignment.status==='COMPLETED_PENDING_LEDGER')invariant(stable(assignmentState.pendingResultEvents[sourceEvent.eventId])===stable(sourceEvent),'GROWTH_SOURCE_NOT_PENDING_AUTHORITY');
  if(assignment.status==='COMPLETED_RECORDED')invariant(assignment.resultEventId===sourceEvent.eventId,'GROWTH_SOURCE_NOT_RECORDED_AUTHORITY');
  invariant(stable(expectedCompletionEvent(assignmentState,assignment))===stable(sourceEvent),'GROWTH_SOURCE_CONTENT_MISMATCH');
  invariant(Object.hasOwn(progress.characters,assignment.characterId),`UNKNOWN_GROWTH_PROGRESS_CHARACTER:${assignment.characterId}`);
  return {assignment,characterId:assignment.characterId};
}

function contextFor(progress,sourceEvent,assignment,characterId){
  const previous=progress.characters[characterId].sourceEventIds;
  const sourceEventIds=[...previous,sourceEvent.eventId];
  return {
    roleTags:[assignment.role],regionTags:[`LOCATION:${assignment.destinationRef}`],situationTags:['TRAINING'],objectiveTags:[assignment.intent],
    experienceTraces:[{tag:'TRAINING',validContributions:sourceEventIds.length,sourceEventIds:clone(sourceEventIds)}],
    observedSourceEventIds:clone(sourceEventIds),
    sourceProof:{producer:sourceEvent.producer,actionType:sourceEvent.actionType,contentVersion:sourceEvent.contentVersion,assignmentId:assignment.assignmentId,completedGlobalTick:sourceEvent.globalTick},
  };
}

export function applyVerifiedGrowthSource(progress,growthTrack,{assignmentState,sourceEvent,pool}={}){
  assertTrackSync(progress,growthTrack);
  const {assignment,characterId}=verifiedTrainingSource({progress,assignmentState,sourceEvent});
  const fingerprint=stable(sourceEvent),existing=progress.processedSources[sourceEvent.eventId];
  if(existing){
    invariant(existing.fingerprint===fingerprint,'CONFLICTING_GROWTH_PROGRESS_SOURCE');
    return {progressState:clone(progress),growthTrack:clone(growthTrack),result:clone(existing.result),replayed:true,atomicDelta:null};
  }
  const claimed=progress.sourceByAssignmentId[assignment.assignmentId];
  invariant(claimed===undefined,`GROWTH_ASSIGNMENT_ALREADY_CREDITED:${assignment.assignmentId}:${claimed}`);
  const lastId=progress.sourceOrder.at(-1);
  if(lastId)invariant(sourceEvent.globalTick>=progress.processedSources[lastId].globalTick,'GROWTH_PROGRESS_SOURCE_TICK_REGRESSION');

  const nextProgress=clone(progress),character=nextProgress.characters[characterId];
  let nextTrack=clone(growthTrack),xpAwarded=0;
  const levelUps=[];
  if(character.level<GROWTH_PROGRESS_TRIAL.maxLevel){
    xpAwarded=GROWTH_PROGRESS_TRIAL.trainingCompletion.totalXp;
    character.xp+=xpAwarded;character.totalXp+=xpAwarded;
    while(character.level<GROWTH_PROGRESS_TRIAL.maxLevel&&character.xp>=xpToNextLevel(character.level)){
      const levelBefore=character.level,levelAfter=levelBefore+1;
      character.xp-=xpToNextLevel(levelBefore);
      const entitlement={
        entitlementId:`ENT:GROWTH:${progress.campaignId}:${characterId}:L${levelAfter}`,
        sourceEventId:sourceEvent.eventId,sourceKind:'CONFIRMED_SOURCE_EVENT',sourceVerified:true,
        characterId,levelBefore,levelAfter,rngSeed:progress.campaignSeed,rngState:nextProgress.rngState,
        context:contextFor(nextProgress,sourceEvent,assignment,characterId),
      };
      const granted=grantGrowthEntitlement(nextTrack,{requestId:`REQ:GROWTH:${sourceEvent.eventId}`,entitlement,pool});
      nextTrack=granted.state;character.level=levelAfter;nextProgress.rngState=granted.draft.drawState.after;
      levelUps.push({levelBefore,levelAfter,sourceEventId:sourceEvent.eventId,entitlementId:granted.entitlement.entitlementId,draftId:granted.draft.draftId,draftState:granted.draft.state,offeredIds:clone(granted.draft.offeredIds),rngBefore:granted.draft.drawState.before,rngAfter:granted.draft.drawState.after});
    }
    if(character.level===GROWTH_PROGRESS_TRIAL.maxLevel)character.xp=0;
  }
  invariant(levelUps.length<=1,'ONE_TRAINING_SOURCE_CANNOT_CREATE_MULTIPLE_LEVELS');
  character.sourceEventIds.push(sourceEvent.eventId);
  const result={sourceEventId:sourceEvent.eventId,assignmentId:assignment.assignmentId,characterId,globalTick:sourceEvent.globalTick,xpAwarded,level:character.level,xp:character.xp,totalXp:character.totalXp,levelUps,status:character.level===GROWTH_PROGRESS_TRIAL.maxLevel&&xpAwarded===0?'MAX_LEVEL_NO_XP':levelUps.length?'LEVEL_UP':'XP_APPLIED'};
  nextProgress.processedSources[sourceEvent.eventId]={sourceEventId:sourceEvent.eventId,assignmentId:assignment.assignmentId,characterId,globalTick:sourceEvent.globalTick,fingerprint,result:clone(result)};
  nextProgress.sourceOrder.push(sourceEvent.eventId);nextProgress.sourceByAssignmentId[assignment.assignmentId]=sourceEvent.eventId;
  assertTrackSync(nextProgress,nextTrack);
  return {progressState:nextProgress,growthTrack:nextTrack,result:clone(result),replayed:false,atomicDelta:{schema:'growth-progress-atomic-delta-v1',campaignId:progress.campaignId,sourceEventId:sourceEvent.eventId,replaceTogether:['growthProgress','growthTrack'],expected:{processedSourceCount:progress.sourceOrder.length,characterLevel:progress.characters[characterId].level,growthTrackLevel:growthTrack.growthStates[characterId].level},next:{processedSourceCount:nextProgress.sourceOrder.length,characterLevel:character.level,growthTrackLevel:nextTrack.growthStates[characterId].level}}};
}

export function serializeGrowthProgressState(state){validateGrowthProgressState(state);return JSON.stringify(state,null,2);}
export function deserializeGrowthProgressState(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_GROWTH_PROGRESS_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_GROWTH_PROGRESS_JSON');}
  return clone(validateGrowthProgressState(state));
}

export const GROWTH_PROGRESS_FORMAT=FORMAT;
export const GROWTH_PROGRESS_VERSION=VERSION;
