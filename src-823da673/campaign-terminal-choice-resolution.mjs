import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';

const FORMAT='sangoku-campaign-terminal-choice-resolution';
const VERSION=1;
const INPUT_KEYS=['transactionId','globalTick','choiceId','selectedOfficerId','resolutionMode'];
const RESOLUTION_MODES=new Set(['PLAYER','AI_STABLE']);
const REF_KEYS=['factionIds','armyIds','officerIds','cityIds','choiceIds','prisonerRecordIds'];

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=240&&/^[A-Za-z0-9._,:-]+$/.test(value);
const transactionId=value=>id(value)&&value.length<=120;
const own=(value,key)=>Object.hasOwn(value,key);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function exactKeys(value,keys,message){invariant(object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort()),message);}
function refs(values={}){return Object.fromEntries(REF_KEYS.map(key=>[key,[...new Set(values[key]??[])].sort()]));}
function normalizeInput(input){
  exactKeys(input,INPUT_KEYS,'INVALID_TERMINAL_CHOICE_RESOLUTION_INPUT_SHAPE');
  invariant(
    transactionId(input.transactionId)&&integer(input.globalTick)&&id(input.choiceId)&&id(input.selectedOfficerId)&&RESOLUTION_MODES.has(input.resolutionMode),
    'INVALID_TERMINAL_CHOICE_RESOLUTION_INPUT',
  );
  return clone(input);
}
function resolutionInput(input){return {format:FORMAT,version:VERSION,...clone(input)};}
function transactionRecords(state,transactionId){
  return state.recordOrder
    .map(recordId=>state.recordsById[recordId])
    .filter(entry=>entry.details?.choiceResolutionTransactionId===transactionId);
}
function recordIdFor(input,choiceType){return `REC.R9Q.${input.globalTick}.${input.transactionId}.010.${choiceType}_CHOICE`;}
function sortIndexes(next){
  next.recordOrder=Object.keys(next.recordsById).sort((a,b)=>next.recordsById[a].globalTick-next.recordsById[b].globalTick||a.localeCompare(b));
}
function validateReplay(state,input,records){
  invariant(records.length===1,`INCOMPLETE_TERMINAL_CHOICE_RESOLUTION:${input.transactionId}`);
  const resolutionRecord=records[0];
  exactKeys(resolutionRecord.details,['choiceResolutionKind','choiceResolutionTransactionId','choiceResolutionFormat','choiceResolutionVersion','choiceResolutionInput','choiceResolutionStage','resolutionMode','manifest'],'INVALID_TERMINAL_CHOICE_RESOLUTION_DETAILS');
  invariant(
    stable(resolutionRecord.details?.choiceResolutionInput)===stable(resolutionInput(input)),
    `CONFLICTING_TERMINAL_CHOICE_RESOLUTION:${input.transactionId}`,
  );
  const choice=state.choicesById[input.choiceId];
  invariant(choice&&choice.status==='RESOLVED'&&choice.resolvedAtTick===input.globalTick&&choice.resolutionRecordId===resolutionRecord.recordId,'TERMINAL_CHOICE_RESOLUTION_CHOICE_MISMATCH');
  const expectedManifest={recordId:recordIdFor(input,choice.type),choiceId:choice.choiceId,choiceType:choice.type,factionId:choice.factionId,cityId:choice.cityId,selectedOfficerId:input.selectedOfficerId};
  const expectedRefs=refs({factionIds:[choice.factionId],officerIds:[input.selectedOfficerId],cityIds:choice.cityId?[choice.cityId]:[],choiceIds:[choice.choiceId]});
  invariant(resolutionRecord.recordId===expectedManifest.recordId&&resolutionRecord.type===`${choice.type}_CHOICE`,'TERMINAL_CHOICE_RESOLUTION_RECORD_TYPE_MISMATCH');
  invariant(stable(resolutionRecord.causeRecordIds)===stable([choice.causeRecordId])&&stable(resolutionRecord.refs)===stable(expectedRefs),'TERMINAL_CHOICE_RESOLUTION_RECORD_REFS_MISMATCH');
  invariant(resolutionRecord.details.choiceResolutionKind==='TERMINAL_PENDING_CHOICE'&&resolutionRecord.details.choiceResolutionTransactionId===input.transactionId&&resolutionRecord.details.choiceResolutionFormat===FORMAT&&resolutionRecord.details.choiceResolutionVersion===VERSION&&resolutionRecord.details.choiceResolutionStage===choice.type&&resolutionRecord.details.resolutionMode===input.resolutionMode&&stable(resolutionRecord.details.manifest)===stable(expectedManifest),'TERMINAL_CHOICE_RESOLUTION_DETAILS_MISMATCH');
  const officer=state.officersById[input.selectedOfficerId];
  if(choice.type==='SUCCESSION'){
    const faction=state.factionsById[choice.factionId];
    invariant(faction?.rulerId===input.selectedOfficerId&&faction.rulerVacancy==='NONE','TERMINAL_SUCCESSION_RESOLUTION_STATE_MISMATCH');
  }else{
    const city=state.citiesById[choice.cityId];
    invariant(city?.ownerFactionId===choice.factionId&&city.governorId===input.selectedOfficerId&&city.occupationState==='NORMAL'&&!city.pendingGovernor&&city.occupationRecordId===null,'TERMINAL_OCCUPATION_RESOLUTION_CITY_MISMATCH');
    invariant(officer?.assignment.kind==='CITY'&&officer.assignment.id===choice.cityId,'TERMINAL_OCCUPATION_RESOLUTION_OFFICER_MISMATCH');
  }
  return clone(state);
}

/**
 * Resolve one already-created terminal choice with an externally selected
 * officer. AI_STABLE means the caller already made a stable selection; this
 * reducer deliberately reads no officer scores and performs no candidate
 * ranking. Occupation resolution is the ROUND-09 WORK_TRIAL shortcut from
 * temporary occupation to a governed normal city, not a policy-duration or
 * policy-cost simulation.
 */
export function resolveCampaignTerminalChoice(state,input,options={}){
  validateCampaignTerminalState(state,options);
  invariant(state.gameResult===null,'TERMINAL_CHOICE_RESOLUTION_AFTER_GAME_RESULT');
  const normalized=normalizeInput(input),existing=transactionRecords(state,normalized.transactionId);
  if(existing.length)return validateReplay(state,normalized,existing);
  invariant(normalized.globalTick>=state.globalTick,'TERMINAL_CHOICE_RESOLUTION_TICK_REGRESSION');

  const choice=state.choicesById[normalized.choiceId];
  invariant(choice,'TERMINAL_CHOICE_RESOLUTION_CHOICE_NOT_FOUND');
  invariant(choice.status==='PENDING','TERMINAL_CHOICE_RESOLUTION_CHOICE_NOT_PENDING');
  if(normalized.resolutionMode==='PLAYER')invariant(choice.factionId===state.playerFactionId,'TERMINAL_CHOICE_RESOLUTION_PLAYER_FACTION_MISMATCH');
  else invariant(choice.factionId!==state.playerFactionId,'TERMINAL_CHOICE_RESOLUTION_AI_FACTION_MISMATCH');
  invariant(choice.candidateOfficerIds.includes(normalized.selectedOfficerId),'TERMINAL_CHOICE_RESOLUTION_OFFICER_NOT_CANDIDATE');
  const faction=state.factionsById[choice.factionId];
  invariant(faction?.alive,'TERMINAL_CHOICE_RESOLUTION_FACTION_NOT_ALIVE');
  const officer=state.officersById[normalized.selectedOfficerId];
  invariant(officer&&officer.lifeState==='ALIVE','TERMINAL_CHOICE_RESOLUTION_OFFICER_NOT_ALIVE');
  invariant(officer.captivityState==='FREE'&&officer.captorFactionId===null,'TERMINAL_CHOICE_RESOLUTION_OFFICER_NOT_FREE');
  invariant(officer.allegianceFactionId===choice.factionId,'TERMINAL_CHOICE_RESOLUTION_OFFICER_ALLEGIANCE_MISMATCH');

  if(choice.type==='SUCCESSION'){
    invariant(faction.rulerId===null&&faction.rulerVacancy==='PENDING_SUCCESSION','TERMINAL_SUCCESSION_RESOLUTION_VACANCY_MISMATCH');
  }else{
    const city=state.citiesById[choice.cityId];
    invariant(city&&city.ownerFactionId===choice.factionId,'TERMINAL_OCCUPATION_RESOLUTION_CITY_OWNER_MISMATCH');
    invariant(city.occupationState==='TEMPORARY_OCCUPATION'&&city.pendingGovernor&&city.governorId===null,'TERMINAL_OCCUPATION_RESOLUTION_CITY_NOT_PENDING');
    invariant(city.occupationRecordId===choice.causeRecordId,'TERMINAL_OCCUPATION_RESOLUTION_CAUSE_MISMATCH');
    invariant(officer.assignment.kind==='NONE'&&officer.assignment.id===null,'TERMINAL_OCCUPATION_RESOLUTION_OFFICER_ASSIGNED');
  }

  const resolutionRecordId=recordIdFor(normalized,choice.type);
  invariant(!own(state.recordsById,resolutionRecordId),`TERMINAL_CHOICE_RESOLUTION_RECORD_ID_COLLISION:${resolutionRecordId}`);
  const next=clone(state),nextChoice=next.choicesById[choice.choiceId];
  next.globalTick=normalized.globalTick;
  nextChoice.status='RESOLVED';
  nextChoice.resolvedAtTick=normalized.globalTick;
  nextChoice.resolutionRecordId=resolutionRecordId;
  if(choice.type==='SUCCESSION'){
    next.factionsById[choice.factionId].rulerId=normalized.selectedOfficerId;
    next.factionsById[choice.factionId].rulerVacancy='NONE';
  }else{
    next.citiesById[choice.cityId]={
      ...next.citiesById[choice.cityId],
      governorId:normalized.selectedOfficerId,
      occupationState:'NORMAL',
      pendingGovernor:false,
      occupationRecordId:null,
    };
    next.officersById[normalized.selectedOfficerId].assignment={kind:'CITY',id:choice.cityId};
  }

  const manifest={
    recordId:resolutionRecordId,
    choiceId:choice.choiceId,
    choiceType:choice.type,
    factionId:choice.factionId,
    cityId:choice.cityId,
    selectedOfficerId:normalized.selectedOfficerId,
  };
  next.recordsById[resolutionRecordId]={
    recordId:resolutionRecordId,
    globalTick:normalized.globalTick,
    type:`${choice.type}_CHOICE`,
    causeRecordIds:[choice.causeRecordId],
    refs:refs({
      factionIds:[choice.factionId],
      officerIds:[normalized.selectedOfficerId],
      cityIds:choice.cityId?[choice.cityId]:[],
      choiceIds:[choice.choiceId],
    }),
    details:{
      choiceResolutionKind:'TERMINAL_PENDING_CHOICE',
      choiceResolutionTransactionId:normalized.transactionId,
      choiceResolutionFormat:FORMAT,
      choiceResolutionVersion:VERSION,
      choiceResolutionInput:resolutionInput(normalized),
      choiceResolutionStage:choice.type,
      resolutionMode:normalized.resolutionMode,
      manifest,
    },
  };
  sortIndexes(next);
  return validateCampaignTerminalState(next,options);
}

export const CAMPAIGN_TERMINAL_CHOICE_RESOLUTION_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_CHOICE_RESOLUTION_VERSION=VERSION;
export const CAMPAIGN_TERMINAL_CHOICE_RESOLUTION_MODES=Object.freeze([...RESOLUTION_MODES].sort());
