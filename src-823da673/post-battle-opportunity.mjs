import {
  createStoryDirectorState,
  deserializeStoryDirectorState,
  selectStoryOpportunity,
  serializeStoryDirectorState,
  validateStoryDirectorState,
} from './story-director.mjs';
import {validateHistoryLedger} from './history-ledger.mjs';

const FORMAT='sangoku-post-battle-opportunity';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const START_WINDOW_TICKS=200;
const COMPLETION_WINDOW_TICKS=200;
const INSPECTION_TICKS=4;
const FIELD_COMMANDER_ROLE='FIELD_INSPECTION_COMMANDER';

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
function validPlace(value){return object(value)&&value.type==='TILE'&&typeof value.id==='string'&&/^[A-Za-z0-9._,:-]+$/.test(value.id);}

export const POST_BATTLE_FIELD_INSPECTION_DEFINITION=Object.freeze({
  eventTypeId:'EVT-POST-BATTLE-FIELD-INSPECTION-v1',
  contentVersion:1,
  worldConditions:{
    sourceActionTypes:['BATTLE_RESULT'],
    sourceProducers:['FIRST3_RUNTIME'],
    requiredOutcomeStatuses:['SUCCEEDED'],
    requiredResultTags:['BATTLE_RESULT','COMBAT_RESULT','COMBAT_ACTION_COMMITTED'],
    forbiddenResultTags:['ACTION_INVALID','COMMAND_CANCELLED','COMMAND_REJECTED','NO_EFFECT','RESULT_VOIDED'],
    requiredPlaceTypes:['TILE'],
    requiredCauseCount:0,
    minimumImportance:'STANDARD',
  },
  storyRoles:[{
    roleId:FIELD_COMMANDER_ROLE,
    factionScope:'SAME_AS_REQUEST',
    presenceMode:'KNOWN_ROSTER_PREFER_PARTICIPANT',
    requiredPersonalityTags:[],
    requiredSituationTags:['FIELD_COMMANDER','HAS_ARMY'],
  }],
  baseWeight:1,
  attentionCost:1,
  cooldownTicks:0,
  freshnessTicks:START_WINDOW_TICKS,
  tensionClass:'MINOR',
  opportunityTags:['FIELD_INSPECTION','POST_BATTLE_FOLLOW_UP'],
  rewards:[],
  worldMutations:[],
  statModifiers:[],
});

function validateProposal(proposal){
  invariant(object(proposal)&&proposal.operationType==='FIELD_INSPECTION','INVALID_POST_BATTLE_PROPOSAL');
  for(const key of ['proposalId','opportunityId','originatingChoiceId','factionId','actorCharacterId','actorArmyId'])invariant(id(proposal[key]),`INVALID_POST_BATTLE_PROPOSAL_FIELD:${key}`);
  invariant(Array.isArray(proposal.sourceEventIds)&&proposal.sourceEventIds.length===1&&id(proposal.sourceEventIds[0]),'INVALID_POST_BATTLE_SOURCE');
  invariant(validPlace(proposal.targetPlaceRef),'INVALID_POST_BATTLE_TARGET');
  invariant(integer(proposal.openTick)&&proposal.startByTick===proposal.openTick+START_WINDOW_TICKS,'INVALID_POST_BATTLE_START_WINDOW');
  invariant(proposal.completionWindowTicks===COMPLETION_WINDOW_TICKS&&proposal.inspectionTicks===INSPECTION_TICKS,'INVALID_POST_BATTLE_TRIAL_VALUES');
  invariant(proposal.intent==='FRONT_INSPECTION'&&proposal.requiresWorldRevalidation===true&&proposal.resultAuthority==='FIELD_OPERATION_ONLY','INVALID_POST_BATTLE_AUTHORITY');
  for(const field of ['rewards','worldMutations','statModifiers'])invariant(Array.isArray(proposal[field])&&proposal[field].length===0,`POST_BATTLE_FORBIDDEN_OUTPUT:${field}`);
  return proposal;
}

export function validatePostBattleOpportunityState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION&&id(state.campaignId),'INVALID_POST_BATTLE_STATE');
  validateStoryDirectorState(state.directorState);
  invariant(state.directorState.campaignId===state.campaignId,'POST_BATTLE_DIRECTOR_CAMPAIGN_MISMATCH');
  invariant(object(state.proposalsByOpportunityId),'INVALID_POST_BATTLE_PROPOSALS');
  const claims=new Set();
  for(const[opportunityId,proposal]of Object.entries(state.proposalsByOpportunityId)){
    validateProposal(proposal);invariant(proposal.opportunityId===opportunityId,`POST_BATTLE_OPPORTUNITY_KEY_MISMATCH:${opportunityId}`);
    const claim=`${proposal.factionId}\u0000${proposal.sourceEventIds[0]}`;invariant(!claims.has(claim),`DUPLICATE_POST_BATTLE_SOURCE:${claim}`);claims.add(claim);
  }
  return state;
}

export function createPostBattleOpportunityState({campaignId,seed=1,directorSettings={}}={}){
  invariant(id(campaignId),'INVALID_POST_BATTLE_CAMPAIGN');
  return validatePostBattleOpportunityState({
    format:FORMAT,version:VERSION,campaignId,
    directorState:createStoryDirectorState({campaignId,seed,settings:directorSettings}),
    proposalsByOpportunityId:{},
  });
}

function validateRoster(characters){
  invariant(object(characters),'INVALID_POST_BATTLE_ROSTER');
  for(const[characterId,character]of Object.entries(characters)){
    invariant(id(characterId)&&object(character)&&character.characterId===characterId&&id(character.factionId),'INVALID_POST_BATTLE_CHARACTER');
    invariant(character.armyRef===null||id(character.armyRef),'INVALID_POST_BATTLE_ARMY_REF');
    if((character.situationTags??[]).includes('HAS_ARMY'))invariant(id(character.armyRef),'POST_BATTLE_ARMY_REQUIRED');
  }
}

function skipped(storyDecision){
  return {
    requestId:storyDecision.requestId,status:'SKIPPED',reasonCode:storyDecision.reasonCode,
    proposal:null,rewards:[],worldMutations:[],statModifiers:[],xp:0,
  };
}

function buildProposal({factionId,eventInstance,actor}){
  const sourceEventId=eventInstance.observedFacts.eventId;
  const suffix=`${factionId}:${sourceEventId}`;
  return validateProposal({
    proposalId:`PROPOSAL:FIELD_INSPECTION:${suffix}`,
    opportunityId:`OPPORTUNITY:FIELD_INSPECTION:${suffix}`,
    originatingChoiceId:`CHOICE:FIELD_INSPECTION:${suffix}`,
    operationType:'FIELD_INSPECTION',intent:'FRONT_INSPECTION',
    factionId,actorCharacterId:actor.characterId,actorArmyId:actor.armyRef,
    sourceEventIds:[sourceEventId],targetPlaceRef:clone(eventInstance.observedFacts.placeRef),
    openTick:eventInstance.observedFacts.globalTick,
    startByTick:eventInstance.observedFacts.globalTick+START_WINDOW_TICKS,
    completionWindowTicks:COMPLETION_WINDOW_TICKS,inspectionTicks:INSPECTION_TICKS,
    requiresWorldRevalidation:true,resultAuthority:'FIELD_OPERATION_ONLY',
    rewards:[],worldMutations:[],statModifiers:[],
  });
}

export function selectPostBattleOpportunity(state,input={}){
  validatePostBattleOpportunityState(state);validateHistoryLedger(input.ledger);validateRoster(input.characters);
  const {requestId,factionId,currentTurn,currentTick}=input;
  invariant(id(requestId)&&id(factionId)&&integer(currentTurn,1)&&integer(currentTick),'INVALID_POST_BATTLE_SELECTION_INPUT');
  invariant(input.ledger.campaignId===state.campaignId,'POST_BATTLE_LEDGER_CAMPAIGN_MISMATCH');
  const selected=selectStoryOpportunity(state.directorState,{
    requestId,factionId,currentTurn,currentTick,ledger:input.ledger,
    eventDefinitions:[POST_BATTLE_FIELD_INSPECTION_DEFINITION],characters:input.characters,
  });
  const next=clone(state);next.directorState=selected.state;
  if(selected.decision.status==='SKIPPED')return {state:validatePostBattleOpportunityState(next),decision:skipped(selected.decision)};
  const actorId=selected.decision.eventInstance.roleBindings[FIELD_COMMANDER_ROLE],actor=input.characters[actorId];
  invariant(object(actor)&&actor.factionId===factionId&&id(actor.armyRef),'POST_BATTLE_SELECTED_ACTOR_INVALID');
  const proposal=buildProposal({factionId,eventInstance:selected.decision.eventInstance,actor});
  const existing=next.proposalsByOpportunityId[proposal.opportunityId];
  if(existing)invariant(stable(existing)===stable(proposal),`CONFLICTING_POST_BATTLE_PROPOSAL:${proposal.opportunityId}`);
  else next.proposalsByOpportunityId[proposal.opportunityId]=clone(proposal);
  return {
    state:validatePostBattleOpportunityState(next),
    decision:{requestId,status:'PROPOSED',reasonCode:null,proposal:clone(proposal),rewards:[],worldMutations:[],statModifiers:[],xp:0},
  };
}

export function getPostBattleProposal(state,{opportunityId}={}){
  validatePostBattleOpportunityState(state);invariant(id(opportunityId),'INVALID_POST_BATTLE_OPPORTUNITY_ID');
  return state.proposalsByOpportunityId[opportunityId]?clone(state.proposalsByOpportunityId[opportunityId]):null;
}

export function serializePostBattleOpportunityState(state){
  validatePostBattleOpportunityState(state);
  const directorState=JSON.parse(serializeStoryDirectorState(state.directorState));
  return JSON.stringify({...clone(state),directorState},null,2);
}

export function deserializePostBattleOpportunityState(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_POST_BATTLE_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_POST_BATTLE_JSON');}
  if(object(state))state.directorState=deserializeStoryDirectorState(JSON.stringify(state.directorState));
  return clone(validatePostBattleOpportunityState(state));
}

export const POST_BATTLE_OPPORTUNITY_FORMAT=FORMAT;
export const POST_BATTLE_OPPORTUNITY_VERSION=VERSION;
export const POST_BATTLE_OPPORTUNITY_TRIAL=Object.freeze({startWindowTicks:START_WINDOW_TICKS,completionWindowTicks:COMPLETION_WINDOW_TICKS,inspectionTicks:INSPECTION_TICKS});
