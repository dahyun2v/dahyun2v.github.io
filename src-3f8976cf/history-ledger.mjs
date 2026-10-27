const FORMAT='sangoku-history-ledger';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const OUTCOME_STATUSES=new Set(['CONFIRMED','SUCCEEDED','FAILED','PARTIAL']);
const IMPORTANCE_LEVELS=new Set(['MINOR','STANDARD','MAJOR']);
const REVEALABLE_FIELDS=new Set([
  'placeRef','actorIds','targetIds','participantIds','factionIds','causeEventIds',
  'producer','actionType','outcome','importance','contentVersion',
]);

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
function validPlaceRef(value){return object(value)&&id(value.type)&&typeof value.id==='string'&&/^[A-Za-z0-9._,:-]+$/.test(value.id);}
function validateOutcome(outcome,eventId){
  invariant(object(outcome)&&OUTCOME_STATUSES.has(outcome.status),`INVALID_HISTORY_OUTCOME:${eventId}`);
  invariant(validIds(outcome.tags??[]),`INVALID_HISTORY_OUTCOME_TAGS:${eventId}`);
  invariant(validIds(outcome.loserFactionIds??[]),`INVALID_HISTORY_LOSER_FACTIONS:${eventId}`);
}
function validateEventShape(event,eventId,campaignId){
  invariant(object(event)&&event.eventId===eventId,`INVALID_HISTORY_EVENT:${eventId}`);
  invariant(event.schemaVersion===VERSION&&event.campaignId===campaignId,`INVALID_HISTORY_EVENT_VERSION:${eventId}`);
  invariant(integer(event.globalTick),`INVALID_HISTORY_EVENT_TICK:${eventId}`);
  invariant(validPlaceRef(event.placeRef),`INVALID_HISTORY_PLACE:${eventId}`);
  for(const key of ['actorIds','targetIds','participantIds','factionIds','causeEventIds'])invariant(validIds(event[key]),`INVALID_HISTORY_IDS:${eventId}:${key}`);
  invariant(id(event.producer)&&id(event.actionType),`INVALID_HISTORY_PRODUCER_OR_ACTION:${eventId}`);
  invariant(IMPORTANCE_LEVELS.has(event.importance),`INVALID_HISTORY_IMPORTANCE:${eventId}`);
  invariant(integer(event.contentVersion,1),`INVALID_HISTORY_CONTENT_VERSION:${eventId}`);
  validateOutcome(event.outcome,eventId);
  for(const factionId of event.outcome.loserFactionIds??[])invariant(event.factionIds.includes(factionId),`HISTORY_LOSER_NOT_IN_EVENT:${eventId}:${factionId}`);
  if(event.producer==='STORY_DIRECTOR')invariant(event.causeEventIds.length>0,`STORY_EVENT_CAUSE_REQUIRED:${eventId}`);
}
function validateKnowledgeShape(record,knowledgeId,state){
  invariant(object(record)&&record.knowledgeId===knowledgeId,`INVALID_KNOWLEDGE_RECORD:${knowledgeId}`);
  invariant(id(record.eventId)&&id(record.factionId)&&integer(record.learnedAtTick),`INVALID_KNOWLEDGE_CORE:${knowledgeId}`);
  invariant(id(record.evidenceSourceId),`INVALID_KNOWLEDGE_EVIDENCE:${knowledgeId}`);
  invariant(Array.isArray(record.revealedFields)&&record.revealedFields.every(field=>REVEALABLE_FIELDS.has(field))&&unique(record.revealedFields),`INVALID_KNOWLEDGE_FIELDS:${knowledgeId}`);
  invariant(object(record.resolution),`INVALID_KNOWLEDGE_RESOLUTION:${knowledgeId}`);
  const event=state.eventsById[record.eventId];
  invariant(event,`UNKNOWN_KNOWLEDGE_EVENT:${knowledgeId}:${record.eventId}`);
  invariant(record.learnedAtTick>=event.globalTick,`KNOWLEDGE_BEFORE_EVENT:${knowledgeId}`);
}

export function validateHistoryLedger(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_HISTORY_LEDGER_FORMAT');
  invariant(id(state.campaignId),'INVALID_HISTORY_CAMPAIGN_ID');
  invariant(object(state.eventsById)&&Array.isArray(state.eventOrder)&&object(state.knowledgeById)&&Array.isArray(state.knowledgeOrder),'INVALID_HISTORY_COLLECTIONS');
  invariant(unique(state.eventOrder)&&unique(state.knowledgeOrder),'DUPLICATE_HISTORY_ORDER_ID');
  invariant(state.eventOrder.length===Object.keys(state.eventsById).length&&state.eventOrder.every(eventId=>Object.hasOwn(state.eventsById,eventId)),'HISTORY_EVENT_ORDER_MISMATCH');
  invariant(state.knowledgeOrder.length===Object.keys(state.knowledgeById).length&&state.knowledgeOrder.every(knowledgeId=>Object.hasOwn(state.knowledgeById,knowledgeId)),'HISTORY_KNOWLEDGE_ORDER_MISMATCH');
  const seen=new Set();let previousTick=-1;
  for(const eventId of state.eventOrder){
    invariant(id(eventId),'INVALID_HISTORY_EVENT_ID');
    const event=state.eventsById[eventId];validateEventShape(event,eventId,state.campaignId);
    invariant(event.globalTick>=previousTick,`HISTORY_EVENT_ORDER_NOT_MONOTONIC:${eventId}`);
    for(const causeId of event.causeEventIds){
      invariant(seen.has(causeId),`UNKNOWN_OR_FORWARD_HISTORY_CAUSE:${eventId}:${causeId}`);
      invariant(state.eventsById[causeId].globalTick<=event.globalTick,`FUTURE_HISTORY_CAUSE:${eventId}:${causeId}`);
    }
    seen.add(eventId);previousTick=event.globalTick;
  }
  for(const knowledgeId of state.knowledgeOrder){
    invariant(id(knowledgeId),'INVALID_KNOWLEDGE_ID');
    validateKnowledgeShape(state.knowledgeById[knowledgeId],knowledgeId,state);
  }
  return state;
}

export function createHistoryLedger({campaignId}={}){
  invariant(id(campaignId),'INVALID_HISTORY_CAMPAIGN_ID');
  return validateHistoryLedger({format:FORMAT,version:VERSION,campaignId,eventsById:{},eventOrder:[],knowledgeById:{},knowledgeOrder:[]});
}

export function appendHistoryEvent(state,event){
  validateHistoryLedger(state);invariant(object(event)&&id(event.eventId),'HISTORY_EVENT_ID_REQUIRED');
  const eventId=event.eventId,existing=state.eventsById[eventId];
  if(existing){
    invariant(stable(existing)===stable(event),`CONFLICTING_HISTORY_EVENT:${eventId}`);
    return clone(state);
  }
  validateEventShape(event,eventId,state.campaignId);
  const lastId=state.eventOrder.at(-1);
  if(lastId)invariant(event.globalTick>=state.eventsById[lastId].globalTick,`HISTORY_EVENT_TICK_REGRESSION:${eventId}`);
  for(const causeId of event.causeEventIds){
    const cause=state.eventsById[causeId];
    invariant(cause,`UNKNOWN_HISTORY_CAUSE:${eventId}:${causeId}`);
    invariant(cause.globalTick<=event.globalTick,`FUTURE_HISTORY_CAUSE:${eventId}:${causeId}`);
  }
  const next=clone(state);next.eventsById[eventId]=clone(event);next.eventOrder.push(eventId);
  return validateHistoryLedger(next);
}

export function recordFactionKnowledge(state,record){
  validateHistoryLedger(state);invariant(object(record)&&id(record.knowledgeId),'KNOWLEDGE_ID_REQUIRED');
  const knowledgeId=record.knowledgeId,existing=state.knowledgeById[knowledgeId];
  if(existing){
    invariant(stable(existing)===stable(record),`CONFLICTING_KNOWLEDGE_RECORD:${knowledgeId}`);
    return clone(state);
  }
  validateKnowledgeShape(record,knowledgeId,state);
  const next=clone(state);next.knowledgeById[knowledgeId]=clone(record);next.knowledgeOrder.push(knowledgeId);
  return validateHistoryLedger(next);
}

function normalizeProposalRefs(values){return [...new Set(values??[])].sort();}
function proposalOutcome(proposal){
  const result=clone(proposal.result??{}),tags=[proposal.actionType,'WORLD_RESULT_CONFIRMED'];
  for(const key of ['type','intent','role'])if(id(result[key]))tags.push(result[key]);
  return {status:result.status==='COMPLETED'?'SUCCEEDED':'CONFIRMED',tags:[...new Set(tags)].sort(),loserFactionIds:[],details:{result,derivation:clone(proposal.derivation??{}),sourceContentVersion:proposal.contentVersion}};
}

export function normalizePendingHistoryEventProposal(proposal,{placeRef}={}){
  invariant(object(proposal)&&id(proposal.eventId),'PENDING_HISTORY_EVENT_ID_REQUIRED');
  invariant(validPlaceRef(placeRef),'CANONICAL_PENDING_HISTORY_PLACE_REQUIRED');
  invariant(typeof proposal.placeRef==='string'&&proposal.placeRef,'PENDING_HISTORY_SOURCE_PLACE_REQUIRED');
  return {
    eventId:proposal.eventId,schemaVersion:VERSION,campaignId:proposal.campaignId,globalTick:proposal.globalTick,
    placeRef:clone(placeRef),actorIds:normalizeProposalRefs(proposal.actorRefs),targetIds:normalizeProposalRefs(proposal.targetRefs),participantIds:normalizeProposalRefs(proposal.participantRefs),factionIds:normalizeProposalRefs(proposal.factionRefs),causeEventIds:normalizeProposalRefs(proposal.causeEventIds),
    producer:proposal.producer,actionType:proposal.actionType,outcome:proposalOutcome(proposal),importance:proposal.importance,contentVersion:1,
  };
}

export function ingestPendingHistoryEvent(state,proposal,options={}){
  const event=normalizePendingHistoryEventProposal(proposal,options),next=appendHistoryEvent(state,event);
  return {state:next,acknowledgment:{accepted:true,resultEventId:proposal.eventId,ledgerEventId:event.eventId}};
}

function orderedEvents(state,predicate){
  validateHistoryLedger(state);
  return state.eventOrder.map(eventId=>state.eventsById[eventId]).filter(predicate).map(clone);
}

export function queryHistoryByCharacter(state,characterId){
  invariant(id(characterId),'INVALID_HISTORY_CHARACTER_ID');
  return orderedEvents(state,event=>[...event.actorIds,...event.targetIds,...event.participantIds].includes(characterId));
}

export function queryHistoryByCity(state,cityId){
  invariant(id(cityId),'INVALID_HISTORY_CITY_ID');
  return orderedEvents(state,event=>event.placeRef.type==='CITY'&&event.placeRef.id===cityId);
}

export function getFactionKnowledgeProjection(state,factionId){
  validateHistoryLedger(state);invariant(id(factionId),'INVALID_KNOWLEDGE_FACTION_ID');
  const records=state.knowledgeOrder.map(knowledgeId=>state.knowledgeById[knowledgeId]).filter(record=>record.factionId===factionId);
  return records.map(record=>{
    const event=state.eventsById[record.eventId],projection={eventId:event.eventId,globalTick:event.globalTick,learnedAtTick:record.learnedAtTick,knowledgeId:record.knowledgeId,evidenceSourceId:record.evidenceSourceId};
    for(const field of record.revealedFields)projection[field]=clone(event[field]);
    projection.resolution=clone(record.resolution);
    return projection;
  });
}

export function serializeHistoryLedger(state){validateHistoryLedger(state);return JSON.stringify(state,null,2);}
export function deserializeHistoryLedger(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_HISTORY_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_HISTORY_JSON');}
  validateHistoryLedger(state);return clone(state);
}

export const HISTORY_LEDGER_FORMAT=FORMAT;
export const HISTORY_LEDGER_VERSION=VERSION;
export const HISTORY_REVEALABLE_FIELDS=Object.freeze([...REVEALABLE_FIELDS]);
