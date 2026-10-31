const FORMAT='sangoku-strategic-assignments';
const VERSION=1;
const TICKS_PER_TURN=200;
const DEFAULT_CAPACITY=3;
const TRAINING_COST=1;
const TRAINING_DURATION_TICKS=200;
const FIELD_INSPECTION_COST=1;
const FIELD_INSPECTION_START_WINDOW_TICKS=200;
const FIELD_INSPECTION_COMPLETION_WINDOW_TICKS=200;
const FIELD_INSPECTION_CONFIRMATION_TICKS=4;
const MAX_SERIALIZED_LENGTH=2_000_000;
const TRAINING_INTENTS=new Set(['FIELD_READINESS','MARCH_DISCIPLINE','SUPPLY_DISCIPLINE']);
const ASSIGNMENT_TYPES=new Set(['TRAINING','FIELD_INSPECTION']);
const ASSIGNMENT_STATUSES=new Set(['ACTIVE','COMPLETED_PENDING_LEDGER','COMPLETED_RECORDED','FAILED_PENDING_LEDGER','FAILED_RECORDED']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;return JSON.stringify(value);}
function globalTick(turnNumber,tick){return (turnNumber-1)*TICKS_PER_TURN+tick;}
function budgetKey(turnNumber,factionId){return `${turnNumber}:${factionId}`;}
function opportunityKey(factionId,causeEventId){return `${factionId}:${causeEventId}`;}

function validateCharacter(character,id,state){
  invariant(object(character)&&character.characterId===id,`INVALID_ASSIGNMENT_CHARACTER:${id}`);
  invariant(Object.hasOwn(state.factions,character.factionId),`UNKNOWN_ASSIGNMENT_CHARACTER_FACTION:${id}:${character.factionId}`);
  invariant(typeof character.locationRef==='string'&&character.locationRef,`INVALID_ASSIGNMENT_LOCATION:${id}`);
  invariant(character.officeRef===null||typeof character.officeRef==='string',`INVALID_ASSIGNMENT_OFFICE:${id}`);
  invariant(character.armyRef===null||typeof character.armyRef==='string',`INVALID_ASSIGNMENT_ARMY:${id}`);
  invariant(character.assignmentId===null||typeof character.assignmentId==='string',`INVALID_CHARACTER_ASSIGNMENT_REF:${id}`);
  invariant(integer(character.busyUntilGlobalTick),`INVALID_CHARACTER_BUSY_TICK:${id}`);
  invariant(['FIT','WOUNDED','RECOVERING'].includes(character.injuryState),`INVALID_CHARACTER_INJURY:${id}`);
  invariant(['FREE','PRISONER'].includes(character.captivityState),`INVALID_CHARACTER_CAPTIVITY:${id}`);
  invariant(['ALIVE','DEAD'].includes(character.lifeState),`INVALID_CHARACTER_LIFE:${id}`);
  invariant(['STATIONARY','TRAVELLING'].includes(character.travelState),`INVALID_CHARACTER_TRAVEL:${id}`);
  invariant(Array.isArray(character.roles)&&new Set(character.roles).size===character.roles.length&&character.roles.every(role=>typeof role==='string'&&role),`INVALID_CHARACTER_ROLES:${id}`);
}

function validateAssignment(assignment,id,state){
  invariant(object(assignment)&&assignment.assignmentId===id&&ASSIGNMENT_TYPES.has(assignment.type),`INVALID_STRATEGIC_ASSIGNMENT:${id}`);
  invariant(Object.hasOwn(state.factions,assignment.factionId)&&Object.hasOwn(state.characters,assignment.characterId),`BROKEN_STRATEGIC_ASSIGNMENT_REF:${id}`);
  invariant(assignment.orderId&&assignment.sourceEventId&&assignment.role,`INVALID_STRATEGIC_ASSIGNMENT_CONTENT:${id}`);
  if(assignment.type==='TRAINING'){
    invariant(TRAINING_INTENTS.has(assignment.intent),`INVALID_STRATEGIC_ASSIGNMENT_CONTENT:${id}`);
    invariant(assignment.originRef===assignment.destinationRef&&assignment.routeId===null,`TRAINING_CANNOT_TELEPORT:${id}`);
    invariant(integer(assignment.startedGlobalTick)&&integer(assignment.expectedEndGlobalTick)&&assignment.expectedEndGlobalTick-assignment.startedGlobalTick===TRAINING_DURATION_TICKS,`INVALID_TRAINING_DURATION:${id}`);
  }else{
    invariant(assignment.intent==='FRONT_INSPECTION'&&assignment.role==='FIELD_COMMANDER',`INVALID_FIELD_INSPECTION_CONTENT:${id}`);
    invariant(typeof assignment.causeEventId==='string'&&assignment.causeEventId,`INVALID_FIELD_INSPECTION_CAUSE:${id}`);
    invariant(typeof assignment.targetPlaceRef==='string'&&assignment.targetPlaceRef.startsWith('TILE:'),`INVALID_FIELD_INSPECTION_TARGET:${id}`);
    invariant(integer(assignment.opportunityOpenGlobalTick)&&integer(assignment.startByGlobalTick)&&assignment.startByGlobalTick-assignment.opportunityOpenGlobalTick===FIELD_INSPECTION_START_WINDOW_TICKS,`INVALID_FIELD_INSPECTION_START_WINDOW:${id}`);
    invariant(assignment.startedGlobalTick<=assignment.startByGlobalTick,`FIELD_INSPECTION_STARTED_AFTER_DEADLINE:${id}`);
    invariant(integer(assignment.expectedEndGlobalTick)&&assignment.expectedEndGlobalTick-assignment.startedGlobalTick===FIELD_INSPECTION_COMPLETION_WINDOW_TICKS,`INVALID_FIELD_INSPECTION_COMPLETION_WINDOW:${id}`);
    invariant(integer(assignment.confirmationTicks)&&assignment.confirmationTicks<=FIELD_INSPECTION_CONFIRMATION_TICKS,`INVALID_FIELD_INSPECTION_CONFIRMATION:${id}`);
    invariant(assignment.lastConfirmedGlobalTick===null||integer(assignment.lastConfirmedGlobalTick),`INVALID_FIELD_INSPECTION_CONFIRMATION_TICK:${id}`);
    invariant(assignment.lastEvidenceId===null||typeof assignment.lastEvidenceId==='string',`INVALID_FIELD_INSPECTION_EVIDENCE:${id}`);
  }
  invariant(integer(assignment.startedTurn,1)&&integer(assignment.startedTick)&&assignment.startedTick<TICKS_PER_TURN&&globalTick(assignment.startedTurn,assignment.startedTick)===assignment.startedGlobalTick,`INVALID_ASSIGNMENT_START_TIME:${id}`);
  invariant(ASSIGNMENT_STATUSES.has(assignment.status),`INVALID_ASSIGNMENT_STATUS:${id}`);
  invariant(assignment.resultEventId===null||typeof assignment.resultEventId==='string',`INVALID_ASSIGNMENT_RESULT_REF:${id}`);
  invariant(assignment.failureReason===null||typeof assignment.failureReason==='string',`INVALID_ASSIGNMENT_FAILURE_REASON:${id}`);
}

export function validateStrategicAssignmentState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_STRATEGIC_ASSIGNMENT_FORMAT');
  invariant(object(state.settings)&&state.settings.ticksPerTurn===TICKS_PER_TURN&&state.settings.defaultCapacity===DEFAULT_CAPACITY&&state.settings.trainingCost===TRAINING_COST&&state.settings.trainingDurationTicks===TRAINING_DURATION_TICKS&&state.settings.budgetResourceKey==='nationalActionBudget','INVALID_STRATEGIC_ASSIGNMENT_SETTINGS');
  invariant(typeof state.campaignId==='string'&&state.campaignId,'INVALID_ASSIGNMENT_CAMPAIGN');
  invariant(object(state.time)&&integer(state.time.turnNumber,1)&&integer(state.time.tick)&&state.time.tick<TICKS_PER_TURN&&state.time.globalTick===globalTick(state.time.turnNumber,state.time.tick),'INVALID_STRATEGIC_ASSIGNMENT_TIME');
  for(const key of ['factions','characters','budgets','assignments','opportunityClaims','processedEvents','pendingResultEvents'])invariant(object(state[key]),`INVALID_STRATEGIC_ASSIGNMENT_COLLECTION:${key}`);
  for(const[factionId,faction]of Object.entries(state.factions))invariant(object(faction)&&faction.factionId===factionId&&integer(faction.capacity,1),`INVALID_STRATEGIC_FACTION:${factionId}`);
  for(const[id,character]of Object.entries(state.characters))validateCharacter(character,id,state);
  const activeCharacters=new Set();
  for(const[id,assignment]of Object.entries(state.assignments)){
    validateAssignment(assignment,id,state);
    const character=state.characters[assignment.characterId];
    if(assignment.status==='ACTIVE'){
      invariant(!activeCharacters.has(assignment.characterId),`CHARACTER_ASSIGNMENT_CONFLICT:${assignment.characterId}`);activeCharacters.add(assignment.characterId);
      invariant(character.assignmentId===id&&character.busyUntilGlobalTick===assignment.expectedEndGlobalTick,`ASSIGNMENT_AVAILABILITY_MISMATCH:${id}`);
    }
  }
  for(const[id,character]of Object.entries(state.characters))if(character.assignmentId!==null)invariant(state.assignments[character.assignmentId]?.status==='ACTIVE',`CHARACTER_ACTIVE_ASSIGNMENT_MISSING:${id}`);
  for(const[key,budget]of Object.entries(state.budgets)){
    invariant(object(budget)&&key===budgetKey(budget.turnNumber,budget.factionId)&&Object.hasOwn(state.factions,budget.factionId)&&integer(budget.turnNumber,1)&&integer(budget.capacity,1)&&integer(budget.committed)&&budget.committed<=budget.capacity&&object(budget.orders),`INVALID_NATIONAL_ACTION_BUDGET:${key}`);
    const total=Object.values(budget.orders).reduce((sum,order)=>sum+order.cost,0);invariant(total===budget.committed,`NATIONAL_ACTION_BUDGET_MISMATCH:${key}`);
    for(const[orderId,order]of Object.entries(budget.orders))invariant(object(order)&&order.orderId===orderId&&integer(order.cost,1)&&typeof order.assignmentId==='string',`INVALID_NATIONAL_ACTION_ORDER:${orderId}`);
  }
  for(const[eventId,fingerprint]of Object.entries(state.processedEvents))invariant(eventId&&typeof fingerprint==='string'&&fingerprint,`INVALID_STRATEGIC_EVENT:${eventId}`);
  for(const[key,assignmentId]of Object.entries(state.opportunityClaims)){const assignment=state.assignments[assignmentId];invariant(key&&typeof assignmentId==='string'&&assignment?.type==='FIELD_INSPECTION'&&key===opportunityKey(assignment.factionId,assignment.causeEventId),`INVALID_FIELD_INSPECTION_CLAIM:${key}`);}
  for(const[eventId,event]of Object.entries(state.pendingResultEvents))invariant(object(event)&&event.eventId===eventId&&event.schemaVersion===1&&event.campaignId===state.campaignId&&event.producer==='strategic-assignments'&&typeof event.actionType==='string'&&event.actionType.startsWith('ASSIGNMENT_'),`INVALID_ASSIGNMENT_RESULT_EVENT:${eventId}`);
  return state;
}

export function createStrategicAssignmentState({campaignId,factions,characters,turnNumber=1,tick=0}={}){
  invariant(typeof campaignId==='string'&&campaignId,'ASSIGNMENT_CAMPAIGN_REQUIRED');invariant(object(factions)&&Object.keys(factions).length>0,'STRATEGIC_FACTIONS_REQUIRED');invariant(object(characters),'STRATEGIC_CHARACTERS_REQUIRED');
  const normalizedFactions={};for(const[factionId,input]of Object.entries(factions)){const capacity=object(input)&&input.capacity!==undefined?input.capacity:DEFAULT_CAPACITY;invariant(integer(capacity,1),`INVALID_STRATEGIC_CAPACITY:${factionId}`);normalizedFactions[factionId]={factionId,capacity};}
  const normalizedCharacters={};for(const[characterId,input]of Object.entries(characters))normalizedCharacters[characterId]={characterId,factionId:input.factionId,locationRef:input.locationRef,officeRef:input.officeRef??null,armyRef:input.armyRef??null,assignmentId:null,busyUntilGlobalTick:globalTick(turnNumber,tick),injuryState:input.injuryState??'FIT',captivityState:input.captivityState??'FREE',lifeState:input.lifeState??'ALIVE',travelState:input.travelState??'STATIONARY',roles:clone(input.roles??[])};
  return validateStrategicAssignmentState({format:FORMAT,version:VERSION,settings:{ticksPerTurn:TICKS_PER_TURN,defaultCapacity:DEFAULT_CAPACITY,trainingCost:TRAINING_COST,trainingDurationTicks:TRAINING_DURATION_TICKS,budgetResourceKey:'nationalActionBudget'},campaignId,time:{turnNumber,tick,globalTick:globalTick(turnNumber,tick)},factions:normalizedFactions,characters:normalizedCharacters,budgets:{},assignments:{},opportunityClaims:{},processedEvents:{},pendingResultEvents:{}});
}

function eventReplay(state,eventId,payload){invariant(typeof eventId==='string'&&eventId,'STRATEGIC_EVENT_ID_REQUIRED');const fingerprint=stable(payload),existing=state.processedEvents[eventId];if(existing!==undefined){invariant(existing===fingerprint,`CONFLICTING_STRATEGIC_EVENT:${eventId}`);return {replayed:true,fingerprint};}return {replayed:false,fingerprint};}
function recordEvent(next,eventId,fingerprint){next.processedEvents[eventId]=fingerprint;return validateStrategicAssignmentState(next);}

export function startTrainingAssignment(state,input={}){
  validateStrategicAssignmentState(state);
  const {eventId,orderId,assignmentId,factionId,characterId,locationRef,role,intent}=input,payload={type:'START_TRAINING',orderId,assignmentId,factionId,characterId,locationRef,role,intent};
  const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  invariant(typeof orderId==='string'&&orderId&&typeof assignmentId==='string'&&assignmentId,'STRATEGIC_ORDER_AND_ASSIGNMENT_REQUIRED');
  invariant(!Object.hasOwn(state.assignments,assignmentId),`DUPLICATE_STRATEGIC_ASSIGNMENT:${assignmentId}`);
  invariant(!Object.values(state.budgets).some(budget=>Object.hasOwn(budget.orders,orderId)),`DUPLICATE_STRATEGIC_ORDER:${orderId}`);
  const faction=state.factions[factionId],character=state.characters[characterId];invariant(faction,`UNKNOWN_STRATEGIC_FACTION:${factionId}`);invariant(character,`UNKNOWN_ASSIGNMENT_CHARACTER:${characterId}`);invariant(character.factionId===factionId,`ASSIGNMENT_CHARACTER_FACTION_MISMATCH:${characterId}`);
  invariant(character.lifeState==='ALIVE',`ASSIGNMENT_CHARACTER_DEAD:${characterId}`);invariant(character.injuryState==='FIT',`ASSIGNMENT_CHARACTER_INJURED:${characterId}:${character.injuryState}`);invariant(character.captivityState==='FREE',`ASSIGNMENT_CHARACTER_CAPTIVE:${characterId}`);invariant(character.assignmentId===null&&character.busyUntilGlobalTick<=state.time.globalTick,`ASSIGNMENT_CHARACTER_BUSY:${characterId}`);
  invariant(character.travelState==='STATIONARY',`ASSIGNMENT_CHARACTER_TRAVELLING:${characterId}`);
  invariant(character.locationRef===locationRef,`ASSIGNMENT_CHARACTER_NOT_AT_LOCATION:${characterId}:actual=${character.locationRef}:required=${locationRef}`);invariant(character.roles.includes(role),`ASSIGNMENT_ROLE_NOT_AVAILABLE:${characterId}:${role}`);invariant(TRAINING_INTENTS.has(intent),`UNSUPPORTED_TRAINING_INTENT:${intent}`);
  const key=budgetKey(state.time.turnNumber,factionId),next=clone(state);if(!next.budgets[key])next.budgets[key]={factionId,turnNumber:state.time.turnNumber,capacity:faction.capacity,committed:0,orders:{}};
  const budget=next.budgets[key];invariant(budget.committed+TRAINING_COST<=budget.capacity,`NATIONAL_ACTION_BUDGET_EXHAUSTED:${factionId}:turn=${state.time.turnNumber}`);
  budget.orders[orderId]={orderId,cost:TRAINING_COST,assignmentId};budget.committed+=TRAINING_COST;
  const end=state.time.globalTick+TRAINING_DURATION_TICKS;
  next.assignments[assignmentId]={assignmentId,orderId,factionId,characterId,type:'TRAINING',intent,role,originRef:locationRef,destinationRef:locationRef,routeId:null,startedTurn:state.time.turnNumber,startedTick:state.time.tick,startedGlobalTick:state.time.globalTick,expectedEndGlobalTick:end,status:'ACTIVE',sourceEventId:eventId,resultEventId:null,failureReason:null};
  next.characters[characterId].assignmentId=assignmentId;next.characters[characterId].busyUntilGlobalTick=end;
  return recordEvent(next,eventId,replay.fingerprint);
}

function resultEvent(state,assignment,{status='COMPLETED',globalTick:resultTick=assignment.expectedEndGlobalTick,reason=null}={}){
  const eventId=`ASSIGNMENT-RESULT:${assignment.assignmentId}:${status}:${resultTick}`;
  const suffix=status==='COMPLETED'?'COMPLETED':'FAILED';
  return {eventId,schemaVersion:1,campaignId:state.campaignId,globalTick:resultTick,placeRef:assignment.type==='FIELD_INSPECTION'?assignment.targetPlaceRef:assignment.destinationRef,actorRefs:[assignment.characterId],targetRefs:[],participantRefs:[assignment.characterId],factionRefs:[assignment.factionId],causeEventIds:[assignment.sourceEventId],producer:'strategic-assignments',actionType:`ASSIGNMENT_${assignment.type}_${suffix}`,result:{assignmentId:assignment.assignmentId,type:assignment.type,intent:assignment.intent,role:assignment.role,status,reason},importance:assignment.type==='FIELD_INSPECTION'?'STANDARD':'MINOR',contentVersion:'strategic-assignments/1',derivation:{experienceTrace:'EXTERNAL_ONLY',memory:'EXTERNAL_ONLY',growth:'EXTERNAL_ONLY'}};
}

export function getAssignmentStartHistoryProposal(state,{assignmentId}={}){
  validateStrategicAssignmentState(state);const assignment=state.assignments[assignmentId];invariant(assignment,`UNKNOWN_STRATEGIC_ASSIGNMENT:${assignmentId}`);
  return {eventId:assignment.sourceEventId,schemaVersion:1,campaignId:state.campaignId,globalTick:assignment.startedGlobalTick,placeRef:assignment.originRef,actorRefs:[assignment.characterId],targetRefs:[],participantRefs:[assignment.characterId],factionRefs:[assignment.factionId],causeEventIds:assignment.type==='FIELD_INSPECTION'?[assignment.causeEventId]:[],producer:'strategic-assignments',actionType:`ASSIGNMENT_${assignment.type}_STARTED`,result:{assignmentId:assignment.assignmentId,type:assignment.type,intent:assignment.intent,role:assignment.role,status:'STARTED'},importance:assignment.type==='FIELD_INSPECTION'?'STANDARD':'MINOR',contentVersion:'strategic-assignments/1',derivation:{experienceTrace:'NONE_AT_START',memory:'NONE_AT_START',growth:'NONE_AT_START'}};
}

export function advanceStrategicAssignmentTime(state,{eventId,turnNumber,tick}={}){
  validateStrategicAssignmentState(state);invariant(integer(turnNumber,1)&&integer(tick)&&tick<TICKS_PER_TURN,'INVALID_STRATEGIC_ADVANCE_TIME');const targetGlobalTick=globalTick(turnNumber,tick);invariant(targetGlobalTick>=state.time.globalTick,`STRATEGIC_TIME_CANNOT_REWIND:${targetGlobalTick}<${state.time.globalTick}`);
  const payload={type:'ADVANCE_TIME',turnNumber,tick,targetGlobalTick},replay=eventReplay(state,eventId,payload);if(replay.replayed)return {state:clone(state),proposedEvents:[]};
  const next=clone(state),proposedEvents=[];next.time={turnNumber,tick,globalTick:targetGlobalTick};
  for(const assignment of Object.values(next.assignments).sort((a,b)=>a.assignmentId.localeCompare(b.assignmentId))){
    const deadlineReached=assignment.type==='TRAINING'?assignment.expectedEndGlobalTick<=targetGlobalTick:assignment.expectedEndGlobalTick<targetGlobalTick;
    if(assignment.status!=='ACTIVE'||!deadlineReached)continue;
    const completed=assignment.type==='TRAINING';
    assignment.status=completed?'COMPLETED_PENDING_LEDGER':'FAILED_PENDING_LEDGER';assignment.failureReason=completed?null:'COMPLETION_DEADLINE_EXPIRED';const character=next.characters[assignment.characterId];character.assignmentId=null;character.busyUntilGlobalTick=assignment.expectedEndGlobalTick;
    const resultTick=completed?assignment.expectedEndGlobalTick:targetGlobalTick;character.busyUntilGlobalTick=resultTick;
    const proposal=resultEvent(next,assignment,{status:completed?'COMPLETED':'FAILED',globalTick:resultTick,reason:assignment.failureReason});invariant(!Object.hasOwn(next.pendingResultEvents,proposal.eventId),`DUPLICATE_ASSIGNMENT_RESULT_EVENT:${proposal.eventId}`);next.pendingResultEvents[proposal.eventId]=proposal;proposedEvents.push(clone(proposal));
  }
  recordEvent(next,eventId,replay.fingerprint);return {state:next,proposedEvents};
}

export function listPendingAssignmentResultEvents(state){validateStrategicAssignmentState(state);return Object.values(state.pendingResultEvents).sort((a,b)=>a.eventId.localeCompare(b.eventId)).map(clone);}

export function acknowledgeAssignmentResultEvent(state,{eventId,resultEventId}={}){
  validateStrategicAssignmentState(state);const payload={type:'ACK_RESULT',resultEventId},replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.pendingResultEvents[resultEventId];invariant(proposal,`UNKNOWN_PENDING_ASSIGNMENT_RESULT:${resultEventId}`);const assignment=next.assignments[proposal.result.assignmentId];invariant(['COMPLETED_PENDING_LEDGER','FAILED_PENDING_LEDGER'].includes(assignment?.status),`ASSIGNMENT_RESULT_NOT_PENDING:${proposal.result.assignmentId}`);
  delete next.pendingResultEvents[resultEventId];assignment.status=assignment.status==='COMPLETED_PENDING_LEDGER'?'COMPLETED_RECORDED':'FAILED_RECORDED';assignment.resultEventId=resultEventId;return recordEvent(next,eventId,replay.fingerprint);
}

export function startFieldInspectionAssignment(state,input={}){
  validateStrategicAssignmentState(state);
  const {eventId,orderId,assignmentId,factionId,characterId,armyId,causeEventId,targetTileId,sourceEventGlobalTick}=input;
  const payload={type:'START_FIELD_INSPECTION',orderId,assignmentId,factionId,characterId,armyId,causeEventId,targetTileId,sourceEventGlobalTick};
  const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  invariant(typeof orderId==='string'&&orderId&&typeof assignmentId==='string'&&assignmentId,'STRATEGIC_ORDER_AND_ASSIGNMENT_REQUIRED');
  invariant(typeof causeEventId==='string'&&causeEventId&&integer(sourceEventGlobalTick),'FIELD_INSPECTION_CAUSE_REQUIRED');
  invariant(typeof targetTileId==='string'&&targetTileId,'FIELD_INSPECTION_TARGET_REQUIRED');
  invariant(!Object.hasOwn(state.assignments,assignmentId),`DUPLICATE_STRATEGIC_ASSIGNMENT:${assignmentId}`);
  const claimKey=opportunityKey(factionId,causeEventId);invariant(!Object.hasOwn(state.opportunityClaims,claimKey),`FIELD_INSPECTION_OPPORTUNITY_ALREADY_CLAIMED:${factionId}:${causeEventId}`);
  invariant(state.time.globalTick>=sourceEventGlobalTick&&state.time.globalTick<=sourceEventGlobalTick+FIELD_INSPECTION_START_WINDOW_TICKS,`FIELD_INSPECTION_START_WINDOW_CLOSED:${causeEventId}`);
  const faction=state.factions[factionId],character=state.characters[characterId];invariant(faction,`UNKNOWN_STRATEGIC_FACTION:${factionId}`);invariant(character,`UNKNOWN_ASSIGNMENT_CHARACTER:${characterId}`);
  invariant(character.factionId===factionId,`ASSIGNMENT_CHARACTER_FACTION_MISMATCH:${characterId}`);invariant(character.lifeState==='ALIVE',`ASSIGNMENT_CHARACTER_DEAD:${characterId}`);invariant(character.injuryState==='FIT',`ASSIGNMENT_CHARACTER_INJURED:${characterId}:${character.injuryState}`);invariant(character.captivityState==='FREE',`ASSIGNMENT_CHARACTER_CAPTIVE:${characterId}`);
  invariant(character.assignmentId===null&&character.busyUntilGlobalTick<=state.time.globalTick,`ASSIGNMENT_CHARACTER_BUSY:${characterId}`);invariant(character.roles.includes('FIELD_COMMANDER')&&character.armyRef===armyId,`FIELD_INSPECTION_COMMAND_NOT_AVAILABLE:${characterId}:${armyId}`);
  const key=budgetKey(state.time.turnNumber,factionId),next=clone(state);if(!next.budgets[key])next.budgets[key]={factionId,turnNumber:state.time.turnNumber,capacity:faction.capacity,committed:0,orders:{}};
  const budget=next.budgets[key];invariant(!Object.values(next.budgets).some(item=>Object.hasOwn(item.orders,orderId)),`DUPLICATE_STRATEGIC_ORDER:${orderId}`);invariant(budget.committed+FIELD_INSPECTION_COST<=budget.capacity,`NATIONAL_ACTION_BUDGET_EXHAUSTED:${factionId}:turn=${state.time.turnNumber}`);
  budget.orders[orderId]={orderId,cost:FIELD_INSPECTION_COST,assignmentId};budget.committed+=FIELD_INSPECTION_COST;
  const end=state.time.globalTick+FIELD_INSPECTION_COMPLETION_WINDOW_TICKS;
  next.assignments[assignmentId]={assignmentId,orderId,factionId,characterId,type:'FIELD_INSPECTION',intent:'FRONT_INSPECTION',role:'FIELD_COMMANDER',originRef:character.locationRef,destinationRef:`TILE:${targetTileId}`,targetPlaceRef:`TILE:${targetTileId}`,routeId:null,armyId,causeEventId,opportunityOpenGlobalTick:sourceEventGlobalTick,startByGlobalTick:sourceEventGlobalTick+FIELD_INSPECTION_START_WINDOW_TICKS,startedTurn:state.time.turnNumber,startedTick:state.time.tick,startedGlobalTick:state.time.globalTick,expectedEndGlobalTick:end,confirmationTicks:0,lastConfirmedGlobalTick:null,lastEvidenceId:null,status:'ACTIVE',sourceEventId:eventId,resultEventId:null,failureReason:null};
  next.opportunityClaims[claimKey]=assignmentId;next.characters[characterId].assignmentId=assignmentId;next.characters[characterId].busyUntilGlobalTick=end;
  return recordEvent(next,eventId,replay.fingerprint);
}

function concludeAssignment(next,assignment,{status,resultTick,reason=null}){
  invariant(assignment.status==='ACTIVE',`ASSIGNMENT_NOT_ACTIVE:${assignment.assignmentId}`);assignment.status=status==='COMPLETED'?'COMPLETED_PENDING_LEDGER':'FAILED_PENDING_LEDGER';assignment.failureReason=reason;
  const character=next.characters[assignment.characterId];character.assignmentId=null;character.busyUntilGlobalTick=resultTick;
  const proposal=resultEvent(next,assignment,{status,globalTick:resultTick,reason});invariant(!Object.hasOwn(next.pendingResultEvents,proposal.eventId),`DUPLICATE_ASSIGNMENT_RESULT_EVENT:${proposal.eventId}`);next.pendingResultEvents[proposal.eventId]=proposal;return proposal;
}

export function applyFieldInspectionEvidence(state,input={}){
  validateStrategicAssignmentState(state);const {eventId,assignmentId,globalTick:evidenceTick,evidenceId,armyId,currentTileId,targetTileId,atTargetOrAdjacent,targetObserved,causeKnown,armyStationary}=input;
  const payload={type:'FIELD_INSPECTION_EVIDENCE',assignmentId,globalTick:evidenceTick,evidenceId,armyId,currentTileId,targetTileId,atTargetOrAdjacent,targetObserved,causeKnown,armyStationary},replay=eventReplay(state,eventId,payload);if(replay.replayed)return {state:clone(state),proposedEvents:[]};
  const assignment=state.assignments[assignmentId];invariant(assignment?.type==='FIELD_INSPECTION',`UNKNOWN_FIELD_INSPECTION:${assignmentId}`);invariant(assignment.status==='ACTIVE',`FIELD_INSPECTION_NOT_ACTIVE:${assignmentId}`);invariant(integer(evidenceTick)&&evidenceTick>=state.time.globalTick&&evidenceTick<=assignment.expectedEndGlobalTick,`FIELD_INSPECTION_EVIDENCE_OUTSIDE_WINDOW:${assignmentId}`);
  invariant(typeof evidenceId==='string'&&evidenceId&&typeof currentTileId==='string'&&currentTileId,`INVALID_FIELD_INSPECTION_EVIDENCE:${assignmentId}`);invariant(armyId===assignment.armyId&&targetTileId===assignment.targetPlaceRef.slice(5),`FIELD_INSPECTION_EVIDENCE_TARGET_MISMATCH:${assignmentId}`);
  const next=clone(state),current=next.assignments[assignmentId],proposedEvents=[];next.time={turnNumber:Math.floor(evidenceTick/TICKS_PER_TURN)+1,tick:evidenceTick%TICKS_PER_TURN,globalTick:evidenceTick};
  if(atTargetOrAdjacent===true&&targetObserved===true&&causeKnown===true&&armyStationary===true){
    invariant(current.lastConfirmedGlobalTick===null||evidenceTick>current.lastConfirmedGlobalTick,`FIELD_INSPECTION_TICK_NOT_ADVANCED:${assignmentId}`);current.confirmationTicks=current.lastConfirmedGlobalTick===null||evidenceTick===current.lastConfirmedGlobalTick+1?current.confirmationTicks+1:1;current.lastConfirmedGlobalTick=evidenceTick;current.lastEvidenceId=evidenceId;
    if(current.confirmationTicks===FIELD_INSPECTION_CONFIRMATION_TICKS)proposedEvents.push(clone(concludeAssignment(next,current,{status:'COMPLETED',resultTick:evidenceTick})));
  }else{current.confirmationTicks=0;current.lastConfirmedGlobalTick=null;current.lastEvidenceId=evidenceId;}
  recordEvent(next,eventId,replay.fingerprint);return {state:next,proposedEvents};
}

export function failActiveAssignment(state,{eventId,assignmentId,reason,resultGlobalTick=state.time.globalTick}={}){
  validateStrategicAssignmentState(state);const payload={type:'FAIL_ASSIGNMENT',assignmentId,reason,resultGlobalTick},replay=eventReplay(state,eventId,payload);if(replay.replayed)return {state:clone(state),proposedEvents:[]};
  const next=clone(state),assignment=next.assignments[assignmentId];invariant(assignment?.status==='ACTIVE',`ASSIGNMENT_NOT_ACTIVE:${assignmentId}`);invariant(typeof reason==='string'&&reason&&integer(resultGlobalTick)&&resultGlobalTick>=state.time.globalTick&&resultGlobalTick<=assignment.expectedEndGlobalTick,`INVALID_ASSIGNMENT_FAILURE:${assignmentId}`);
  next.time={turnNumber:Math.floor(resultGlobalTick/TICKS_PER_TURN)+1,tick:resultGlobalTick%TICKS_PER_TURN,globalTick:resultGlobalTick};const proposal=concludeAssignment(next,assignment,{status:'FAILED',resultTick:resultGlobalTick,reason});recordEvent(next,eventId,replay.fingerprint);return {state:next,proposedEvents:[clone(proposal)]};
}

export function serializeStrategicAssignmentState(state){validateStrategicAssignmentState(state);return JSON.stringify(state,null,2);}
export function deserializeStrategicAssignmentState(serialized){invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_STRATEGIC_ASSIGNMENT_SERIALIZED_INPUT');let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_STRATEGIC_ASSIGNMENT_JSON');}if(object(state)&&state.version===VERSION&&!object(state.opportunityClaims))state.opportunityClaims={};for(const assignment of Object.values(state.assignments??{}))if(assignment.failureReason===undefined)assignment.failureReason=null;validateStrategicAssignmentState(state);return clone(state);}

export const STRATEGIC_ASSIGNMENT_FORMAT=FORMAT;
export const STRATEGIC_ASSIGNMENT_VERSION=VERSION;
export const STRATEGIC_ASSIGNMENT_TRIAL={ticksPerTurn:TICKS_PER_TURN,defaultCapacity:DEFAULT_CAPACITY,trainingCost:TRAINING_COST,trainingDurationTicks:TRAINING_DURATION_TICKS,fieldInspectionCost:FIELD_INSPECTION_COST,fieldInspectionStartWindowTicks:FIELD_INSPECTION_START_WINDOW_TICKS,fieldInspectionCompletionWindowTicks:FIELD_INSPECTION_COMPLETION_WINDOW_TICKS,fieldInspectionConfirmationTicks:FIELD_INSPECTION_CONFIRMATION_TICKS};
