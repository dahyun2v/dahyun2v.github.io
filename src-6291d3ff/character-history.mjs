import {getFactionKnowledgeProjection,validateHistoryLedger} from './history-ledger.mjs';
import {strategicLocationToHistoryPlaceRef} from './strategic-assignment-world.mjs';

const FORMAT='sangoku-character-history';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const VALID_STATUSES=new Set(['CONFIRMED','SUCCEEDED','PARTIAL']);
const INVALID_TAGS=new Set(['ACTION_INVALID','COMMAND_REJECTED','NO_EFFECT','RESULT_VOIDED']);
const SUPPORTED_ACTIONS=new Set(['ASSIGNMENT_TRAINING_COMPLETED','ASSIGNMENT_FIELD_INSPECTION_COMPLETED','BATTLE_RESULT','BATTLE_RESOLVED','COMBAT_RESOLVED','ATTACK_RESOLVED']);
const MEANINGFUL_TAGS=new Set(['WORLD_RESULT_CONFIRMED','ATTACK_RESOLVED','BATTLE_RESOLVED','COMBAT_RESULT','TRAINING','FIELD_INSPECTION']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value);
const unique=values=>new Set(values).size===values.length;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function validIds(values){return Array.isArray(values)&&values.every(id)&&unique(values);}
function addUnique(values,value){if(!values.includes(value))values.push(value);values.sort();}
function activityTag(event){
  if(event.actionType==='ASSIGNMENT_TRAINING_COMPLETED')return 'TRAINING';
  if(event.actionType==='ASSIGNMENT_FIELD_INSPECTION_COMPLETED')return 'FIELD_INSPECTION';
  if(['BATTLE_RESULT','BATTLE_RESOLVED','COMBAT_RESOLVED','ATTACK_RESOLVED'].includes(event.actionType))return 'COMBAT';
  return event.actionType;
}
function memoryKind(event){
  const activity=activityTag(event);
  if(activity==='TRAINING')return 'TRAINING_COMPLETION';
  if(activity==='FIELD_INSPECTION')return 'FIELD_INSPECTION_SUCCESS';
  return 'SHARED_ORDEAL';
}
function knownCharacters(event){return [...new Set([...(event.actorIds??[]),...(event.targetIds??[]),...(event.participantIds??[])])].sort();}
function meaningTags(event){return [...new Set([event.actionType,...(event.outcome?.tags??[])])].filter(id).sort();}
function validKnownResult(event){
  if(!SUPPORTED_ACTIONS.has(event.actionType))return 'UNSUPPORTED_HISTORY_ACTION';
  if(!object(event.outcome)||!VALID_STATUSES.has(event.outcome.status))return 'INVALID_OR_FAILED_RESULT';
  const tags=event.outcome.tags??[];
  if(tags.some(tag=>INVALID_TAGS.has(tag)))return 'INVALID_OR_FAILED_RESULT';
  if(!tags.includes(event.actionType)&&!tags.some(tag=>MEANINGFUL_TAGS.has(tag)))return 'NO_MEANINGFUL_RESULT_TAG';
  if(!Array.isArray(event.actorIds)||event.actorIds.length===0)return 'NO_MEANINGFUL_ACTOR';
  return null;
}

export function validateCharacterHistoryState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_CHARACTER_HISTORY_FORMAT');
  invariant(id(state.campaignId),'INVALID_CHARACTER_HISTORY_CAMPAIGN');
  for(const key of ['memoriesById','tracesById','relationshipsById','processedKnowledgeById','contributionKeys'])invariant(object(state[key]),`INVALID_CHARACTER_HISTORY_COLLECTION:${key}`);
  for(const[memoryId,memory]of Object.entries(state.memoriesById)){
    invariant(object(memory)&&memory.memoryId===memoryId&&id(memory.characterId)&&id(memory.kind),'INVALID_CHARACTER_MEMORY');
    invariant(validIds(memory.sourceEventIds)&&validIds(memory.otherRefs)&&validIds(memory.meaningTags)&&validIds(memory.knowledgeRecordIds)&&validIds(memory.knownByFactionIds),'INVALID_CHARACTER_MEMORY_REFS');
    invariant(integer(memory.formedAtTick)&&integer(memory.lastRecalledTick)&&memory.lastRecalledTick>=memory.formedAtTick,'INVALID_CHARACTER_MEMORY_TICKS');
  }
  for(const[traceId,trace]of Object.entries(state.tracesById)){
    invariant(object(trace)&&trace.traceId===traceId&&id(trace.characterId)&&id(trace.activityTag)&&integer(trace.validContributions,1),'INVALID_EXPERIENCE_TRACE');
    for(const key of ['roleTags','regionTags','resultTags','sourceEventIds','knowledgeRecordIds','knownByFactionIds'])invariant(validIds(trace[key]),`INVALID_EXPERIENCE_TRACE_REFS:${traceId}:${key}`);
    invariant(trace.validContributions===trace.sourceEventIds.length,`EXPERIENCE_TRACE_COUNT_MISMATCH:${traceId}`);
  }
  for(const[relationId,relationship]of Object.entries(state.relationshipsById)){
    invariant(object(relationship)&&relationship.relationId===relationId&&relationship.type==='SHARED_ORDEAL'&&relationship.active===true,'INVALID_CHARACTER_RELATIONSHIP');
    for(const key of ['participantIds','memoryRefs','reasons','sourceEventIds','knowledgeRecordIds','knownByFactionIds'])invariant(validIds(relationship[key]),`INVALID_RELATIONSHIP_REFS:${relationId}:${key}`);
    invariant(relationship.participantIds.length===2&&integer(relationship.formedAtTick)&&integer(relationship.lastUpdatedTick),'INVALID_RELATIONSHIP_CONTENT');
  }
  for(const[knowledgeId,record]of Object.entries(state.processedKnowledgeById))invariant(id(knowledgeId)&&object(record)&&typeof record.fingerprint==='string'&&object(record.decision),'INVALID_PROCESSED_CHARACTER_KNOWLEDGE');
  for(const[key,eventId]of Object.entries(state.contributionKeys))invariant(typeof key==='string'&&key&&id(eventId),'INVALID_CHARACTER_CONTRIBUTION_KEY');
  return state;
}

export function createCharacterHistoryState({campaignId}={}){
  invariant(id(campaignId),'INVALID_CHARACTER_HISTORY_CAMPAIGN');
  return validateCharacterHistoryState({format:FORMAT,version:VERSION,campaignId,memoriesById:{},tracesById:{},relationshipsById:{},processedKnowledgeById:{},contributionKeys:{}});
}

function addEvidence(record,event,factionId){
  addUnique(record.knowledgeRecordIds,event.knowledgeId);addUnique(record.knownByFactionIds,factionId);
  record.lastRecalledTick=Math.max(record.lastRecalledTick??event.globalTick,event.learnedAtTick);
}
function upsertMemory(next,event,characterId,factionId){
  const memoryId=`MEM:${characterId}:${event.eventId}`,existing=next.memoriesById[memoryId];
  if(existing){addEvidence(existing,event,factionId);return memoryId;}
  const others=knownCharacters(event).filter(id=>id!==characterId);
  next.memoriesById[memoryId]={memoryId,characterId,kind:memoryKind(event),sourceEventIds:[event.eventId],otherRefs:others,meaningTags:meaningTags(event),formedAtTick:event.globalTick,lastRecalledTick:event.learnedAtTick,knowledgeRecordIds:[event.knowledgeId],knownByFactionIds:[factionId]};
  return memoryId;
}
function traceTags(event){
  const result=event.outcome?.details?.result??{};
  return {
    roleTags:id(result.role)?[result.role]:[],
    regionTags:event.placeRef?[`PLACE_TYPE:${event.placeRef.type}`]:[],
    resultTags:meaningTags(event),
  };
}
function upsertTrace(next,event,characterId,factionId){
  const tag=activityTag(event),traceId=`TRACE:${characterId}:${tag}`,existing=next.tracesById[traceId];
  if(existing?.sourceEventIds.includes(event.eventId)){addUnique(existing.knowledgeRecordIds,event.knowledgeId);addUnique(existing.knownByFactionIds,factionId);return {traceId,credited:false,reasonCode:'SOURCE_ALREADY_CREDITED'};}
  const contributionKey=`${characterId}:${event.globalTick}`;
  if(Object.hasOwn(next.contributionKeys,contributionKey))return {traceId:null,credited:false,reasonCode:'SAME_TICK_CONTRIBUTION_ALREADY_CREDITED'};
  const tags=traceTags(event),trace=existing??{traceId,characterId,activityTag:tag,roleTags:[],regionTags:[],resultTags:[],validContributions:0,sourceEventIds:[],knowledgeRecordIds:[],knownByFactionIds:[]};
  for(const value of tags.roleTags)addUnique(trace.roleTags,value);
  for(const value of tags.regionTags)addUnique(trace.regionTags,value);
  for(const value of tags.resultTags)addUnique(trace.resultTags,value);
  addUnique(trace.sourceEventIds,event.eventId);addUnique(trace.knowledgeRecordIds,event.knowledgeId);addUnique(trace.knownByFactionIds,factionId);
  trace.validContributions+=1;next.tracesById[traceId]=trace;next.contributionKeys[contributionKey]=event.eventId;
  return {traceId,credited:true,reasonCode:null};
}
function relationPairs(event){
  if(activityTag(event)!=='COMBAT')return [];
  const participants=knownCharacters(event),pairs=[];
  for(let left=0;left<participants.length;left+=1)for(let right=left+1;right<participants.length;right+=1)pairs.push([participants[left],participants[right]]);
  return pairs;
}
function upsertRelationship(next,event,left,right,memoryRefs,factionId){
  const participantIds=[left,right].sort(),relationId=`REL:SHARED_ORDEAL:${participantIds.join(':')}`,existing=next.relationshipsById[relationId];
  if(existing){
    addUnique(existing.sourceEventIds,event.eventId);for(const ref of memoryRefs)addUnique(existing.memoryRefs,ref);addUnique(existing.knowledgeRecordIds,event.knowledgeId);addUnique(existing.knownByFactionIds,factionId);existing.lastUpdatedTick=Math.max(existing.lastUpdatedTick,event.globalTick);return relationId;
  }
  next.relationshipsById[relationId]={relationId,participantIds,type:'SHARED_ORDEAL',active:true,memoryRefs:[...memoryRefs].sort(),reasons:['CONFIRMED_SHARED_COMBAT'],sourceEventIds:[event.eventId],knowledgeRecordIds:[event.knowledgeId],knownByFactionIds:[factionId],formedAtTick:event.globalTick,lastUpdatedTick:event.globalTick,activationRule:'ONE_CONFIRMED_SHARED_EVENT',cooldownUntilTick:null};
  return relationId;
}

export function applyKnownHistoryEvent(state,{ledger,factionId,eventId,knowledgeId}={}){
  validateCharacterHistoryState(state);validateHistoryLedger(ledger);
  invariant(ledger.campaignId===state.campaignId,'CHARACTER_HISTORY_LEDGER_CAMPAIGN_MISMATCH');invariant(id(factionId)&&(id(eventId)||id(knowledgeId)),'INVALID_CHARACTER_HISTORY_INPUT');
  const projection=getFactionKnowledgeProjection(ledger,factionId),event=projection.find(item=>knowledgeId?item.knowledgeId===knowledgeId:item.eventId===eventId);
  if(!event)return {state:clone(state),decision:{status:'SKIPPED',reasonCode:'EVENT_NOT_KNOWN',eventId:eventId??null,memoryIds:[],traceIds:[],relationshipIds:[],rewards:[],statModifiers:[],xp:0}};
  if(eventId!==undefined)invariant(event.eventId===eventId,`CHARACTER_HISTORY_EVENT_KNOWLEDGE_MISMATCH:${eventId}:${event.knowledgeId}`);
  const fingerprint=stable(event),processed=state.processedKnowledgeById[event.knowledgeId];
  if(processed){invariant(processed.fingerprint===fingerprint,`CONFLICTING_CHARACTER_KNOWLEDGE:${event.knowledgeId}`);return {state:clone(state),decision:clone(processed.decision)};}
  const reason=validKnownResult(event),next=clone(state);
  let decision;
  if(reason)decision={status:'SKIPPED',reasonCode:reason,eventId:event.eventId,memoryIds:[],traceIds:[],relationshipIds:[],rewards:[],statModifiers:[],xp:0};
  else{
    const memoryIds=knownCharacters(event).map(characterId=>upsertMemory(next,event,characterId,factionId));
    const traceResults=event.actorIds.map(characterId=>upsertTrace(next,event,characterId,factionId));
    const relationshipIds=relationPairs(event).map(([left,right])=>upsertRelationship(next,event,left,right,memoryIds.filter(memoryId=>memoryId.startsWith(`MEM:${left}:`)||memoryId.startsWith(`MEM:${right}:`)),factionId));
    decision={status:'APPLIED',reasonCode:null,eventId:event.eventId,memoryIds:[...new Set(memoryIds)].sort(),traceIds:traceResults.filter(result=>result.credited).map(result=>result.traceId).sort(),relationshipIds:[...new Set(relationshipIds)].sort(),skippedContributions:traceResults.filter(result=>!result.credited).map(result=>({characterId:event.actorIds[traceResults.indexOf(result)],reasonCode:result.reasonCode})),rewards:[],statModifiers:[],xp:0};
  }
  next.processedKnowledgeById[event.knowledgeId]={fingerprint,decision:clone(decision)};
  return {state:validateCharacterHistoryState(next),decision:clone(decision)};
}

export function getCharacterHistoryProjection(state,{characterId,factionId}={}){
  validateCharacterHistoryState(state);invariant(id(characterId)&&id(factionId),'INVALID_CHARACTER_HISTORY_PROJECTION_INPUT');
  const known=record=>record.knownByFactionIds.includes(factionId);
  return {
    characterId,factionId,
    memories:Object.values(state.memoriesById).filter(record=>record.characterId===characterId&&known(record)).sort((a,b)=>a.memoryId.localeCompare(b.memoryId)).map(clone),
    experienceTraces:Object.values(state.tracesById).filter(record=>record.characterId===characterId&&known(record)).sort((a,b)=>a.traceId.localeCompare(b.traceId)).map(clone),
    relationships:Object.values(state.relationshipsById).filter(record=>record.participantIds.includes(characterId)&&known(record)).sort((a,b)=>a.relationId.localeCompare(b.relationId)).map(clone),
  };
}

export function storyCharacterFromAvailability(availability,{personalityTags=[],situationTags=[]}={}){
  invariant(object(availability)&&id(availability.characterId)&&id(availability.factionId),'INVALID_STORY_AVAILABILITY');
  invariant(validIds(personalityTags)&&validIds(situationTags),'INVALID_STORY_AVAILABILITY_TAGS');
  const locationRef=strategicLocationToHistoryPlaceRef(availability.locationRef);
  const alive=availability.lifeState==='ALIVE';
  const available=alive&&availability.injuryState==='FIT'&&availability.captivityState==='FREE'&&availability.travelState==='STATIONARY'&&availability.assignmentId===null;
  return {characterId:availability.characterId,factionId:availability.factionId,locationRef,alive,available,personalityTags:clone(personalityTags),situationTags:clone(situationTags)};
}

export function compileLegalReactionCommand({definition,eventInstance,optionId}={}){
  invariant(object(definition)&&id(definition.eventTypeId)&&Array.isArray(definition.options),'INVALID_REACTION_DEFINITION');
  invariant(object(eventInstance)&&eventInstance.eventTypeId===definition.eventTypeId&&object(eventInstance.roleBindings)&&object(eventInstance.observedFacts),'INVALID_REACTION_EVENT_INSTANCE');
  const option=definition.options.find(item=>item.optionId===optionId);invariant(option,'UNKNOWN_REACTION_OPTION');
  const route=option.commandRoutes?.[eventInstance.observedFacts.actionType];invariant(object(route)&&id(route.targetApi)&&id(route.intent),'NO_LEGAL_COMMAND_ROUTE');
  const actorId=eventInstance.roleBindings[option.actorRoleId];invariant(id(actorId),'REACTION_ACTOR_NOT_BOUND');
  return {status:'COMMAND_REQUEST',sourceEventIds:clone(eventInstance.sourceEventIds),commandRequest:{kind:'EXISTING_LEGAL_COMMAND_REQUEST',targetApi:route.targetApi,intent:route.intent,actorId,sourceEventId:eventInstance.observedFacts.eventId,requiredCallerFields:clone(route.requiredCallerFields??[]),requiresWorldRevalidation:true},rewards:[],worldMutations:[],statModifiers:[],xp:0};
}

export function serializeCharacterHistory(state){validateCharacterHistoryState(state);return JSON.stringify(state,null,2);}
export function deserializeCharacterHistory(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_CHARACTER_HISTORY_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_CHARACTER_HISTORY_JSON');}
  return clone(validateCharacterHistoryState(state));
}

export const CHARACTER_HISTORY_FORMAT=FORMAT;
export const CHARACTER_HISTORY_VERSION=VERSION;
