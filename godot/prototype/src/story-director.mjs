import {createRng} from './rng.mjs';
import {getFactionKnowledgeProjection,validateHistoryLedger} from './history-ledger.mjs';

const FORMAT='sangoku-story-director';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const DEFAULT_SETTINGS=Object.freeze({attentionCapacityPerTurn:2,recoveryWindowTicks:20});
const TENSION_CLASSES=new Set(['MINOR','RELATIONSHIP','RECOVERY','MAJOR_ADVERSITY']);
const FACTION_SCOPES=new Set(['ANY_PARTICIPANT','SAME_AS_REQUEST','OPPOSED_TO_REQUEST']);
const ROLE_PRESENCE_MODES=new Set(['AT_EVENT','KNOWN_ROSTER','KNOWN_ROSTER_PREFER_PARTICIPANT']);
const OUTCOME_STATUSES=new Set(['CONFIRMED','SUCCEEDED','FAILED','PARTIAL']);
const IMPORTANCE_RANK={MINOR:0,STANDARD:1,MAJOR:2};

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
function validTags(values){return Array.isArray(values)&&values.every(id)&&unique(values);}
function samePlace(a,b){return object(a)&&object(b)&&a.type===b.type&&a.id===b.id;}
function allTags(actual,required){const values=new Set(actual??[]);return (required??[]).every(tag=>values.has(tag));}

export function validateStoryEventDefinition(definition){
  invariant(object(definition)&&id(definition.eventTypeId),'INVALID_STORY_EVENT_TYPE');
  invariant(integer(definition.contentVersion,1),'INVALID_STORY_CONTENT_VERSION');
  invariant(object(definition.worldConditions),'INVALID_STORY_WORLD_CONDITIONS');
  invariant(validTags(definition.worldConditions.sourceActionTypes)&&definition.worldConditions.sourceActionTypes.length>0,'INVALID_STORY_SOURCE_ACTIONS');
  invariant(validTags(definition.worldConditions.sourceProducers??[]),'INVALID_STORY_SOURCE_PRODUCERS');
  invariant(validTags(definition.worldConditions.requiredResultTags??[]),'INVALID_STORY_REQUIRED_RESULT_TAGS');
  invariant(validTags(definition.worldConditions.forbiddenResultTags??[]),'INVALID_STORY_FORBIDDEN_RESULT_TAGS');
  invariant(Array.isArray(definition.worldConditions.requiredOutcomeStatuses??[])&&(definition.worldConditions.requiredOutcomeStatuses??[]).every(status=>OUTCOME_STATUSES.has(status))&&unique(definition.worldConditions.requiredOutcomeStatuses??[]),'INVALID_STORY_REQUIRED_OUTCOME_STATUSES');
  invariant(validTags(definition.worldConditions.requiredPlaceTypes??[]),'INVALID_STORY_REQUIRED_PLACE_TYPES');
  invariant(integer(definition.worldConditions.requiredCauseCount??0),'INVALID_STORY_REQUIRED_CAUSE_COUNT');
  invariant(Object.hasOwn(IMPORTANCE_RANK,definition.worldConditions.minimumImportance),'INVALID_STORY_MINIMUM_IMPORTANCE');
  invariant(Array.isArray(definition.storyRoles)&&definition.storyRoles.length>0,'STORY_ROLES_REQUIRED');
  invariant(unique(definition.storyRoles.map(role=>role?.roleId)),'DUPLICATE_STORY_ROLE');
  for(const role of definition.storyRoles){
    invariant(object(role)&&id(role.roleId)&&FACTION_SCOPES.has(role.factionScope),'INVALID_STORY_ROLE');
    invariant(ROLE_PRESENCE_MODES.has(role.presenceMode??'AT_EVENT'),'INVALID_STORY_ROLE_PRESENCE_MODE');
    invariant(validTags(role.requiredPersonalityTags??[])&&validTags(role.requiredSituationTags??[]),'INVALID_STORY_ROLE_TAGS');
    invariant(role.fixedCharacterId===undefined||id(role.fixedCharacterId),'INVALID_STORY_FIXED_CHARACTER');
  }
  invariant(integer(definition.baseWeight,1)&&integer(definition.attentionCost,1)&&integer(definition.cooldownTicks)&&integer(definition.freshnessTicks),'INVALID_STORY_WEIGHT_OR_TIMING');
  invariant(TENSION_CLASSES.has(definition.tensionClass),'INVALID_STORY_TENSION_CLASS');
  invariant(validTags(definition.opportunityTags??[]),'INVALID_STORY_OPPORTUNITY_TAGS');
  for(const field of ['rewards','worldMutations','statModifiers'])invariant(definition[field]===undefined||(Array.isArray(definition[field])&&definition[field].length===0),`STORY_DEFINITION_FORBIDDEN_OUTPUT:${field}`);
  return definition;
}

function validateDecision(decision,requestId){
  invariant(object(decision)&&decision.requestId===requestId&&['SELECTED','SKIPPED'].includes(decision.status),'INVALID_STORY_DECISION');
  invariant(Array.isArray(decision.rewards)&&decision.rewards.length===0,'STORY_DECISION_REWARD_FORBIDDEN');
  invariant(Array.isArray(decision.worldMutations)&&decision.worldMutations.length===0,'STORY_WORLD_MUTATION_FORBIDDEN');
  invariant(Array.isArray(decision.statModifiers)&&decision.statModifiers.length===0,'STORY_STAT_MODIFIER_FORBIDDEN');
}

export function validateStoryDirectorState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_STORY_DIRECTOR_FORMAT');
  invariant(id(state.campaignId),'INVALID_STORY_DIRECTOR_CAMPAIGN');
  invariant(object(state.settings)&&integer(state.settings.attentionCapacityPerTurn,1)&&integer(state.settings.recoveryWindowTicks),'INVALID_STORY_DIRECTOR_SETTINGS');
  invariant(object(state.rng)&&state.rng.algorithm==='lcg32-v1'&&integer(state.rng.seed,1)&&integer(state.rng.value)&&state.rng.value<=0xffffffff&&integer(state.rng.draws),'INVALID_STORY_DIRECTOR_RNG');
  for(const key of ['attentionByFaction','cooldownUntilByType','recoveryUntilByFaction','recoveryScanTickByFaction','consumedKeys','spotlights','requests'])invariant(object(state[key]),`INVALID_STORY_DIRECTOR_COLLECTION:${key}`);
  for(const[factionId,budget]of Object.entries(state.attentionByFaction))invariant(id(factionId)&&object(budget)&&integer(budget.turnNumber,1)&&integer(budget.spent)&&budget.spent<=state.settings.attentionCapacityPerTurn,`INVALID_STORY_ATTENTION:${factionId}`);
  for(const[eventTypeId,tick]of Object.entries(state.cooldownUntilByType))invariant(id(eventTypeId)&&integer(tick),`INVALID_STORY_COOLDOWN:${eventTypeId}`);
  for(const[factionId,tick]of Object.entries(state.recoveryUntilByFaction))invariant(id(factionId)&&integer(tick),`INVALID_STORY_RECOVERY:${factionId}`);
  for(const[factionId,tick]of Object.entries(state.recoveryScanTickByFaction))invariant(id(factionId)&&integer(tick),`INVALID_STORY_RECOVERY_SCAN:${factionId}`);
  for(const[key,value]of Object.entries(state.consumedKeys))invariant(key&&value===true,`INVALID_STORY_CONSUMED_KEY:${key}`);
  for(const[characterId,spotlight]of Object.entries(state.spotlights)){
    invariant(id(characterId)&&object(spotlight)&&spotlight.characterId===characterId,'INVALID_STORY_SPOTLIGHT');
    invariant(validTags(spotlight.supportingEventIds)&&validTags(spotlight.opportunityTags)&&integer(spotlight.exposureCount,1)&&integer(spotlight.lastExposureTick),'INVALID_STORY_SPOTLIGHT_VALUES');
    for(const forbidden of ['attack','defense','strength','statBonus','statModifiers'])invariant(!Object.hasOwn(spotlight,forbidden),`SPOTLIGHT_STAT_FIELD_FORBIDDEN:${characterId}:${forbidden}`);
  }
  for(const[requestId,record]of Object.entries(state.requests)){
    invariant(id(requestId)&&object(record)&&typeof record.fingerprint==='string'&&record.fingerprint,'INVALID_STORY_REQUEST');
    validateDecision(record.decision,requestId);
  }
  return state;
}

export function createStoryDirectorState({campaignId,seed=1,settings={}}={}){
  invariant(id(campaignId),'INVALID_STORY_DIRECTOR_CAMPAIGN');
  const normalizedSeed=(Number(seed)>>>0)||1,merged={...DEFAULT_SETTINGS,...settings};
  const rng=createRng(normalizedSeed);
  return validateStoryDirectorState({
    format:FORMAT,version:VERSION,campaignId,settings:merged,
    rng:{algorithm:'lcg32-v1',seed:normalizedSeed,value:rng.state(),draws:0},
    attentionByFaction:{},cooldownUntilByType:{},recoveryUntilByFaction:{},recoveryScanTickByFaction:{},
    consumedKeys:{},spotlights:{},requests:{},
  });
}

function requestFingerprint(input){
  return stable({
    factionId:input.factionId,currentTurn:input.currentTurn,currentTick:input.currentTick,
    eventOrder:input.ledger.eventOrder,knowledgeOrder:input.ledger.knowledgeOrder,
    definitions:input.eventDefinitions,characters:input.characters,
  });
}
function skip(requestId,reasonCode,details={}){
  return {requestId,status:'SKIPPED',reasonCode,...details,eventInstance:null,rewards:[],worldMutations:[],statModifiers:[]};
}
function projectedParticipants(event){return [...new Set([...(event.actorIds??[]),...(event.targetIds??[]),...(event.participantIds??[])])].sort();}
function roleEligible(character,role,event,requestFactionId){
  if(!object(character)||character.alive!==true||character.available!==true)return false;
  if((role.presenceMode??'AT_EVENT')==='AT_EVENT'&&!samePlace(character.locationRef,event.placeRef))return false;
  if(role.fixedCharacterId!==undefined&&character.characterId!==role.fixedCharacterId)return false;
  if(role.factionScope==='SAME_AS_REQUEST'&&character.factionId!==requestFactionId)return false;
  if(role.factionScope==='OPPOSED_TO_REQUEST'&&character.factionId===requestFactionId)return false;
  return allTags(character.personalityTags,role.requiredPersonalityTags)&&allTags(character.situationTags,role.requiredSituationTags);
}
function roleBindings(definition,event,characters,requestFactionId){
  const participantIds=projectedParticipants(event),rosterIds=Object.keys(characters).sort(),roles=definition.storyRoles;
  const candidatesByRole=roles.map(role=>{
    const mode=role.presenceMode??'AT_EVENT';
    if(mode==='KNOWN_ROSTER')return rosterIds.filter(characterId=>roleEligible(characters[characterId],role,event,requestFactionId));
    if(mode==='KNOWN_ROSTER_PREFER_PARTICIPANT'){
      const knownParticipants=participantIds.filter(characterId=>roleEligible(characters[characterId],role,event,requestFactionId));
      return knownParticipants.length>0?knownParticipants:rosterIds.filter(characterId=>roleEligible(characters[characterId],role,event,requestFactionId));
    }
    return participantIds.filter(characterId=>roleEligible(characters[characterId],role,event,requestFactionId));
  });
  if(candidatesByRole.some(candidates=>candidates.length===0))return [];
  const bindings=[];
  function visit(index,current,used){
    if(bindings.length>=64)return;
    if(index===roles.length){bindings.push(clone(current));return;}
    const role=roles[index];
    for(const characterId of candidatesByRole[index])if(!used.has(characterId)){
      current[role.roleId]=characterId;used.add(characterId);visit(index+1,current,used);used.delete(characterId);delete current[role.roleId];
    }
  }
  visit(0,{},new Set());return bindings;
}
function worldConditionMatches(definition,event){
  const conditions=definition.worldConditions,tags=event.outcome?.tags??[];
  if(!conditions.sourceActionTypes.includes(event.actionType))return false;
  if((conditions.sourceProducers??[]).length>0&&!conditions.sourceProducers.includes(event.producer))return false;
  if((conditions.requiredOutcomeStatuses??[]).length>0&&!conditions.requiredOutcomeStatuses.includes(event.outcome?.status))return false;
  if((conditions.requiredPlaceTypes??[]).length>0&&(!object(event.placeRef)||!conditions.requiredPlaceTypes.includes(event.placeRef.type)))return false;
  if(!allTags(tags,conditions.requiredResultTags))return false;
  if((conditions.forbiddenResultTags??[]).some(tag=>tags.includes(tag)))return false;
  if((event.causeEventIds??[]).length<(conditions.requiredCauseCount??0))return false;
  if(IMPORTANCE_RANK[event.importance]===undefined||IMPORTANCE_RANK[event.importance]<IMPORTANCE_RANK[conditions.minimumImportance])return false;
  return true;
}
function updateRecovery(next,projection,factionId,currentTick){
  const lastScan=Object.hasOwn(next.recoveryScanTickByFaction,factionId)?next.recoveryScanTickByFaction[factionId]:-1;
  for(const event of projection){
    if(event.learnedAtTick<=lastScan||event.learnedAtTick>currentTick)continue;
    const tags=event.outcome?.tags??[],losers=event.outcome?.loserFactionIds??[];
    if(tags.includes('MAJOR_DEFEAT')&&losers.includes(factionId)){
      next.recoveryUntilByFaction[factionId]=Math.max(next.recoveryUntilByFaction[factionId]??0,currentTick+next.settings.recoveryWindowTicks);
    }
  }
  next.recoveryScanTickByFaction[factionId]=currentTick;
}
function ensureBudget(next,factionId,currentTurn){
  const existing=next.attentionByFaction[factionId];
  if(!existing||existing.turnNumber!==currentTurn)next.attentionByFaction[factionId]={turnNumber:currentTurn,spent:0};
  return next.attentionByFaction[factionId];
}
function spotlightWeight(state,binding,definition){
  let bonus=0;
  for(const characterId of Object.values(binding)){
    const spotlight=state.spotlights[characterId];
    if(spotlight&&(definition.opportunityTags??[]).some(tag=>spotlight.opportunityTags.includes(tag)))bonus+=Math.min(spotlight.exposureCount,3);
  }
  return bonus;
}
function buildCandidates(state,{factionId,currentTick,projection,eventDefinitions,characters,budget}){
  const candidates=[],recoveryUntil=state.recoveryUntilByFaction[factionId]??0;
  for(const definition of [...eventDefinitions].sort((a,b)=>a.eventTypeId.localeCompare(b.eventTypeId))){
    validateStoryEventDefinition(definition);
    if(budget.spent+definition.attentionCost>state.settings.attentionCapacityPerTurn)continue;
    if((state.cooldownUntilByType[definition.eventTypeId]??0)>currentTick)continue;
    if(currentTick<recoveryUntil&&definition.tensionClass==='MAJOR_ADVERSITY')continue;
    for(const event of projection){
      if(event.learnedAtTick>currentTick)continue;
      if(currentTick<event.globalTick||currentTick-event.globalTick>definition.freshnessTicks)continue;
      if(!worldConditionMatches(definition,event))continue;
      const consumedKey=`${definition.eventTypeId}\u0000${factionId}\u0000${event.eventId}`;
      if(state.consumedKeys[consumedKey])continue;
      for(const binding of roleBindings(definition,event,characters,factionId)){
        const bindingKey=Object.entries(binding).sort(([a],[b])=>a.localeCompare(b)).map(([roleId,characterId])=>`${roleId}=${characterId}`).join(',');
        candidates.push({
          candidateId:`${definition.eventTypeId}:${event.eventId}:${bindingKey}`,
          definition,event,binding,consumedKey,
          weight:definition.baseWeight+spotlightWeight(state,binding,definition),
        });
      }
    }
  }
  return candidates.sort((a,b)=>a.candidateId.localeCompare(b.candidateId));
}
function pickWeighted(next,candidates){
  const total=candidates.reduce((sum,candidate)=>sum+candidate.weight,0),rng=createRng(next.rng.seed);
  rng.restore(next.rng.value);const roll=rng.next()*total;next.rng.value=rng.state();next.rng.draws+=1;
  let cursor=roll;
  for(const candidate of candidates){cursor-=candidate.weight;if(cursor<0)return candidate;}
  return candidates.at(-1);
}
function storySourceEventIds(event){return [...new Set([...(event.causeEventIds??[]),event.eventId])];}
function addSpotlight(next,characterId,sourceEventIds,opportunityTags,currentTick){
  const spotlight=next.spotlights[characterId]??{characterId,supportingEventIds:[],opportunityTags:[],exposureCount:0,lastExposureTick:0};
  for(const sourceEventId of sourceEventIds)if(!spotlight.supportingEventIds.includes(sourceEventId))spotlight.supportingEventIds.push(sourceEventId);
  spotlight.opportunityTags=[...new Set([...spotlight.opportunityTags,...opportunityTags])].sort();
  spotlight.exposureCount+=1;spotlight.lastExposureTick=currentTick;next.spotlights[characterId]=spotlight;
}

export function selectStoryOpportunity(state,input={}){
  validateStoryDirectorState(state);validateHistoryLedger(input.ledger);
  const {requestId,factionId,currentTurn,currentTick,eventDefinitions,characters}=input;
  invariant(id(requestId)&&id(factionId)&&integer(currentTurn,1)&&integer(currentTick),'INVALID_STORY_SELECTION_INPUT');
  invariant(input.ledger.campaignId===state.campaignId,'STORY_LEDGER_CAMPAIGN_MISMATCH');
  invariant(Array.isArray(eventDefinitions)&&object(characters),'INVALID_STORY_SELECTION_COLLECTIONS');
  for(const definition of eventDefinitions)validateStoryEventDefinition(definition);
  for(const[characterId,character]of Object.entries(characters)){
    invariant(id(characterId)&&object(character)&&character.characterId===characterId&&id(character.factionId),'INVALID_STORY_CHARACTER');
    invariant(validTags(character.personalityTags??[])&&validTags(character.situationTags??[]),'INVALID_STORY_CHARACTER_TAGS');
    invariant(validPlace(character.locationRef),'INVALID_STORY_CHARACTER_LOCATION');
  }
  const fingerprint=requestFingerprint(input),existing=state.requests[requestId];
  if(existing){
    invariant(existing.fingerprint===fingerprint,`CONFLICTING_STORY_REQUEST:${requestId}`);
    return {state:clone(state),decision:clone(existing.decision)};
  }
  const next=clone(state),projection=getFactionKnowledgeProjection(input.ledger,factionId);
  updateRecovery(next,projection,factionId,currentTick);const budget=ensureBudget(next,factionId,currentTurn);
  const candidates=buildCandidates(next,{factionId,currentTick,projection,eventDefinitions,characters,budget});
  let decision;
  if(candidates.length===0)decision=skip(requestId,'NO_ELIGIBLE_STORY',{candidateCount:0,recoveryUntilTick:next.recoveryUntilByFaction[factionId]??0});
  else{
    const selected=pickWeighted(next,candidates),{definition,event,binding}=selected;
    budget.spent+=definition.attentionCost;
    next.cooldownUntilByType[definition.eventTypeId]=currentTick+definition.cooldownTicks;
    next.consumedKeys[selected.consumedKey]=true;
    const sourceEventIds=storySourceEventIds(event);
    for(const characterId of Object.values(binding))addSpotlight(next,characterId,sourceEventIds,definition.opportunityTags??[],currentTick);
    const eventInstance={
      eventInstanceId:`${requestId}:${definition.eventTypeId}:${event.eventId}`,
      eventTypeId:definition.eventTypeId,contentVersion:definition.contentVersion,
      sourceEventIds,roleBindings:clone(binding),
      observedFacts:{eventId:event.eventId,globalTick:event.globalTick,placeRef:clone(event.placeRef),knowledgeRecordRef:{eventId:event.eventId,factionId,knowledgeId:event.knowledgeId},causeEventIds:clone(event.causeEventIds??[]),actionType:event.actionType,outcome:clone(event.outcome),importance:event.importance},
      eligibilityReasons:['KNOWN_CONFIRMED_SOURCE','WORLD_CONDITIONS_MATCHED','STORY_ROLES_BOUND','ATTENTION_AVAILABLE','COOLDOWN_READY','SOURCE_FRESH'],
      opportunityTags:clone(definition.opportunityTags??[]),
      writes:['STORY_OPPORTUNITY_ONLY'],rewards:[],worldMutations:[],statModifiers:[],
    };
    decision={requestId,status:'SELECTED',reasonCode:null,candidateCount:candidates.length,eventInstance,rewards:[],worldMutations:[],statModifiers:[]};
  }
  next.requests[requestId]={fingerprint,decision:clone(decision)};
  return {state:validateStoryDirectorState(next),decision:clone(decision)};
}

function validPlace(value){return object(value)&&id(value.type)&&typeof value.id==='string'&&/^[A-Za-z0-9._,:-]+$/.test(value.id);}

export function serializeStoryDirectorState(state){validateStoryDirectorState(state);return JSON.stringify(state,null,2);}
export function deserializeStoryDirectorState(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_STORY_DIRECTOR_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_STORY_DIRECTOR_JSON');}
  validateStoryDirectorState(state);return clone(state);
}

export const STORY_DIRECTOR_FORMAT=FORMAT;
export const STORY_DIRECTOR_VERSION=VERSION;
export const STORY_DIRECTOR_DEFAULT_SETTINGS=DEFAULT_SETTINGS;
