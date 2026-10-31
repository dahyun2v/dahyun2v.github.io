import {
  validateCampaignTerminalState,
} from './campaign-terminal-state.mjs';

const FORMAT='sangoku-campaign-terminal-public-view';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const EVENT_SUMMARIES=Object.freeze({
  ARMY_DISPOSITION:'ARMY_STATUS_OBSERVED',
  OFFICER_CAPTIVITY:'OFFICER_CAPTIVITY_OBSERVED',
  OFFICER_LIFE:'OFFICER_FATE_OBSERVED',
  FACTION_RULER:'RULER_STATUS_OBSERVED',
  CITY_OCCUPATION:'CITY_CONTROL_OBSERVED',
  PRISONER_LEDGER:'PRISONER_STATUS_OBSERVED',
  SUCCESSION_CHOICE:'SUCCESSION_RESOLUTION_OBSERVED',
  OCCUPATION_CHOICE:'OCCUPATION_RESOLUTION_OBSERVED',
  FACTION_EXTINCTION:'FACTION_EXTINCTION_OBSERVED',
  TERMINAL_RESULT:'CAMPAIGN_RESULT_OBSERVED',
});
const RELATIONS=new Set(['HOME_OFFICER','CUSTODIAN']);
const CHOICE_TYPES=new Set(['SUCCESSION','OCCUPATION']);
const CHOICE_STATUSES=new Set(['PENDING','RESOLVED','CANCELLED']);
const ARMY_DISPOSITIONS=new Set(['ACTIVE','DEFEATED','DISBANDED']);
const LIFE_STATES=new Set(['ALIVE','DEAD']);
const CAPTIVITY_STATES=new Set(['FREE','PRISONER']);
const OCCUPATION_STATES=new Set(['NORMAL','TEMPORARY_OCCUPATION']);
const PRISONER_DISPOSITIONS=new Set(['HELD','RELEASED','DECEASED']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=240&&/^[A-Za-z0-9._,:-]+$/.test(value);
const own=(value,key)=>Object.hasOwn(value,key);
const unique=values=>new Set(values).size===values.length;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function exactKeys(value,keys,message){invariant(object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort()),message);}
function stableIds(values,label){invariant(Array.isArray(values)&&values.every(id)&&unique(values)&&stable(values)===stable([...values].sort()),`INVALID_${label}_IDS`);}
function jsonSafe(value,path='value'){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){invariant(Number.isFinite(value),`NON_FINITE_PUBLIC_VALUE:${path}`);return;}
  if(Array.isArray(value)){value.forEach((entry,index)=>jsonSafe(entry,`${path}[${index}]`));return;}
  invariant(object(value),`NON_JSON_PUBLIC_VALUE:${path}`);
  for(const[key,entry]of Object.entries(value)){invariant(entry!==undefined,`UNDEFINED_PUBLIC_VALUE:${path}.${key}`);jsonSafe(entry,`${path}.${key}`);}
}

function normalizeProjectionInput(state,input){
  exactKeys(input,['viewerFactionId','knownTerminalRecordIds'],'INVALID_TERMINAL_PUBLIC_INPUT_SHAPE');
  invariant(id(input.viewerFactionId)&&own(state.factionsById,input.viewerFactionId),'UNKNOWN_TERMINAL_PUBLIC_VIEWER');
  invariant(Array.isArray(input.knownTerminalRecordIds)&&input.knownTerminalRecordIds.every(id)&&unique(input.knownTerminalRecordIds),'INVALID_KNOWN_TERMINAL_RECORD_IDS');
  for(const recordId of input.knownTerminalRecordIds)invariant(own(state.recordsById,recordId),`UNKNOWN_KNOWN_TERMINAL_RECORD:${recordId}`);
  return {viewerFactionId:input.viewerFactionId,knownTerminalRecordIds:[...input.knownTerminalRecordIds].sort()};
}

function projectOwnFaction(state,viewerFactionId){
  const faction=state.factionsById[viewerFactionId];
  return {factionId:viewerFactionId,alive:faction.alive,rulerId:faction.rulerId,rulerVacancy:faction.rulerVacancy};
}

function projectOwnArmyOutcomes(state,viewerFactionId){
  return state.armyOrder
    .map(armyId=>state.armiesById[armyId])
    .filter(army=>army.factionId===viewerFactionId&&army.disposition!=='ACTIVE')
    .map(army=>({armyId:army.armyId,commanderId:army.commanderId,disposition:army.disposition,terminalAtTick:army.terminalAtTick}));
}

function projectOwnOfficers(state,viewerFactionId){
  return state.officerOrder
    .map(officerId=>state.officersById[officerId])
    .filter(officer=>officer.allegianceFactionId===viewerFactionId)
    .map(officer=>({
      officerId:officer.officerId,
      lifeState:officer.lifeState,
      captivityState:officer.captivityState,
      captorFactionId:officer.captorFactionId,
      assignment:clone(officer.assignment),
    }));
}

function projectOwnCities(state,viewerFactionId){
  return state.cityOrder
    .map(cityId=>state.citiesById[cityId])
    .filter(city=>city.ownerFactionId===viewerFactionId)
    .map(city=>({
      cityId:city.cityId,
      governorId:city.governorId,
      occupationState:city.occupationState,
      pendingGovernor:city.pendingGovernor,
    }));
}

function projectOwnChoices(state,viewerFactionId){
  return state.choiceOrder
    .map(choiceId=>state.choicesById[choiceId])
    .filter(choice=>choice.factionId===viewerFactionId)
    .map(choice=>({
      choiceId:choice.choiceId,
      type:choice.type,
      cityId:choice.cityId,
      candidateOfficerIds:[...choice.candidateOfficerIds],
      status:choice.status,
      createdAtTick:choice.createdAtTick,
      resolvedAtTick:choice.resolvedAtTick,
    }));
}

function projectKnownPrisoners(state,viewerFactionId){
  const entries=[];
  for(const prisonerRecordId of state.prisonerOrder){
    const prisoner=state.prisonersById[prisonerRecordId];
    if(prisoner.homeFactionId===viewerFactionId){
      entries.push({
        officerId:prisoner.officerId,
        relation:'HOME_OFFICER',
        otherFactionId:prisoner.captorFactionId,
        disposition:prisoner.disposition,
        capturedAtTick:prisoner.capturedAtTick,
        closedAtTick:prisoner.closedAtTick,
      });
    }else if(prisoner.captorFactionId===viewerFactionId){
      entries.push({
        officerId:prisoner.officerId,
        relation:'CUSTODIAN',
        otherFactionId:prisoner.homeFactionId,
        disposition:prisoner.disposition,
        capturedAtTick:prisoner.capturedAtTick,
        closedAtTick:prisoner.closedAtTick,
      });
    }
  }
  return entries.sort((a,b)=>a.capturedAtTick-b.capturedAtTick||a.officerId.localeCompare(b.officerId)||a.relation.localeCompare(b.relation));
}

function projectObservedEvents(state,viewerFactionId,knownTerminalRecordIds){
  const known=new Set(knownTerminalRecordIds);
  return state.recordOrder
    .filter(recordId=>known.has(recordId))
    .map(recordId=>{
      const record=state.recordsById[recordId];
      const hideCaptivityParties=record.type==='OFFICER_CAPTIVITY'||record.type==='PRISONER_LEDGER';
      return {
        eventId:record.recordId,
        globalTick:record.globalTick,
        eventType:record.type,
        summaryCode:EVENT_SUMMARIES[record.type],
        factionIds:hideCaptivityParties?record.refs.factionIds.filter(factionId=>factionId===viewerFactionId):[...record.refs.factionIds],
        armyIds:[...record.refs.armyIds],
        officerIds:[...record.refs.officerIds],
        cityIds:[...record.refs.cityIds],
      };
    });
}

function validateAssignment(assignment,label){
  exactKeys(assignment,['kind','id'],`INVALID_TERMINAL_PUBLIC_ASSIGNMENT_SHAPE:${label}`);
  invariant(['NONE','ARMY','CITY'].includes(assignment.kind),`INVALID_TERMINAL_PUBLIC_ASSIGNMENT:${label}`);
  if(assignment.kind==='NONE')invariant(assignment.id===null,`TERMINAL_PUBLIC_NONE_ASSIGNMENT_HAS_ID:${label}`);
  else invariant(id(assignment.id),`TERMINAL_PUBLIC_ASSIGNMENT_ID_REQUIRED:${label}`);
}

function validateTerminalResultAndReport(view){
  if(view.gameResult===null){invariant(view.terminalReport===null,'TERMINAL_PUBLIC_REPORT_WITHOUT_RESULT');return;}
  exactKeys(view.gameResult,['type','terminalAtTick','winnerFactionId','loserFactionIds','reasonCode'],'INVALID_TERMINAL_PUBLIC_GAME_RESULT_SHAPE');
  invariant(['UNIFICATION','PLAYER_DEFEAT'].includes(view.gameResult.type)&&integer(view.gameResult.terminalAtTick)&&view.gameResult.terminalAtTick<=view.globalTick,'INVALID_TERMINAL_PUBLIC_GAME_RESULT');
  invariant(view.gameResult.winnerFactionId===null||id(view.gameResult.winnerFactionId),'INVALID_TERMINAL_PUBLIC_WINNER');
  stableIds(view.gameResult.loserFactionIds,'TERMINAL_PUBLIC_LOSER_FACTION');
  invariant(id(view.gameResult.reasonCode),'INVALID_TERMINAL_PUBLIC_RESULT_REASON');
  exactKeys(view.terminalReport,['format','version','resultType','reasonCode','finalGlobalTick','factionSnapshots'],'INVALID_TERMINAL_PUBLIC_REPORT_SHAPE');
  invariant(view.terminalReport.format===`${FORMAT}/report`&&view.terminalReport.version===VERSION,'INVALID_TERMINAL_PUBLIC_REPORT_FORMAT');
  invariant(view.terminalReport.resultType===view.gameResult.type&&view.terminalReport.reasonCode===view.gameResult.reasonCode&&view.terminalReport.finalGlobalTick===view.gameResult.terminalAtTick,'TERMINAL_PUBLIC_RESULT_REPORT_MISMATCH');
  invariant(Array.isArray(view.terminalReport.factionSnapshots),'INVALID_TERMINAL_PUBLIC_REPORT_FACTIONS');
  let previousFactionId=null;
  for(const snapshot of view.terminalReport.factionSnapshots){
    exactKeys(snapshot,['factionId','alive','ownedCityIds'],'INVALID_TERMINAL_PUBLIC_REPORT_FACTION_SHAPE');
    invariant(id(snapshot.factionId)&&typeof snapshot.alive==='boolean','INVALID_TERMINAL_PUBLIC_REPORT_FACTION');
    stableIds(snapshot.ownedCityIds,'TERMINAL_PUBLIC_REPORT_CITY');
    if(previousFactionId!==null)invariant(snapshot.factionId.localeCompare(previousFactionId)>0,'TERMINAL_PUBLIC_REPORT_FACTION_ORDER_UNSTABLE');
    previousFactionId=snapshot.factionId;
  }
}

function projectPublicResult(state){
  if(state.gameResult===null)return null;
  return {
    type:state.gameResult.type,
    terminalAtTick:state.gameResult.terminalAtTick,
    winnerFactionId:state.gameResult.winnerFactionId,
    loserFactionIds:[...state.gameResult.loserFactionIds],
    reasonCode:state.gameResult.reasonCode,
  };
}

function projectPublicReport(state){
  if(state.terminalReport===null)return null;
  return {
    format:`${FORMAT}/report`,
    version:VERSION,
    resultType:state.terminalReport.resultType,
    reasonCode:state.terminalReport.reasonCode,
    finalGlobalTick:state.terminalReport.finalGlobalTick,
    factionSnapshots:state.terminalReport.factionSnapshots.map(snapshot=>({
      factionId:snapshot.factionId,
      alive:snapshot.alive,
      ownedCityIds:[...snapshot.ownedCityIds],
    })),
  };
}

export function validateCampaignTerminalPublicView(view,{allowUngovernedNormal=false}={}){
  invariant(object(view)&&view.format===FORMAT&&view.version===VERSION,'INVALID_CAMPAIGN_TERMINAL_PUBLIC_FORMAT');
  exactKeys(view,['format','version','contractStatus','campaignId','globalTick','viewerFactionId','ownFaction','ownArmyOutcomes','ownOfficers','ownCities','ownChoices','knownPrisoners','observedEvents','gameResult','terminalReport'],'INVALID_CAMPAIGN_TERMINAL_PUBLIC_SHAPE');
  invariant(view.contractStatus==='WORK_TRIAL'&&id(view.campaignId)&&integer(view.globalTick)&&id(view.viewerFactionId),'INVALID_CAMPAIGN_TERMINAL_PUBLIC_CORE');
  exactKeys(view.ownFaction,['factionId','alive','rulerId','rulerVacancy'],'INVALID_TERMINAL_PUBLIC_OWN_FACTION_SHAPE');
  invariant(view.ownFaction.factionId===view.viewerFactionId&&typeof view.ownFaction.alive==='boolean'&&(view.ownFaction.rulerId===null||id(view.ownFaction.rulerId))&&['NONE','PENDING_SUCCESSION','VACANT_ONE_TURN','EXTINCT'].includes(view.ownFaction.rulerVacancy),'INVALID_TERMINAL_PUBLIC_OWN_FACTION');

  invariant(Array.isArray(view.ownArmyOutcomes),'INVALID_TERMINAL_PUBLIC_OWN_ARMY_OUTCOMES');
  for(const army of view.ownArmyOutcomes){
    exactKeys(army,['armyId','commanderId','disposition','terminalAtTick'],'INVALID_TERMINAL_PUBLIC_ARMY_SHAPE');
    invariant(id(army.armyId)&&id(army.commanderId)&&ARMY_DISPOSITIONS.has(army.disposition)&&army.disposition!=='ACTIVE'&&integer(army.terminalAtTick)&&army.terminalAtTick<=view.globalTick,'INVALID_TERMINAL_PUBLIC_ARMY');
  }
  invariant(unique(view.ownArmyOutcomes.map(army=>army.armyId))&&stable(view.ownArmyOutcomes.map(army=>army.armyId))===stable(view.ownArmyOutcomes.map(army=>army.armyId).sort()),'TERMINAL_PUBLIC_ARMY_ORDER_UNSTABLE');

  invariant(Array.isArray(view.ownOfficers),'INVALID_TERMINAL_PUBLIC_OWN_OFFICERS');
  for(const officer of view.ownOfficers){
    exactKeys(officer,['officerId','lifeState','captivityState','captorFactionId','assignment'],'INVALID_TERMINAL_PUBLIC_OFFICER_SHAPE');
    invariant(id(officer.officerId)&&LIFE_STATES.has(officer.lifeState)&&CAPTIVITY_STATES.has(officer.captivityState)&&(officer.captorFactionId===null||id(officer.captorFactionId)),'INVALID_TERMINAL_PUBLIC_OFFICER');
    validateAssignment(officer.assignment,officer.officerId);
    if(officer.lifeState==='DEAD')invariant(officer.captivityState==='FREE'&&officer.captorFactionId===null&&officer.assignment.kind==='NONE',`INVALID_TERMINAL_PUBLIC_DEAD_OFFICER:${officer.officerId}`);
    if(officer.captivityState==='PRISONER')invariant(officer.lifeState==='ALIVE'&&id(officer.captorFactionId)&&officer.assignment.kind==='NONE',`INVALID_TERMINAL_PUBLIC_PRISONER_OFFICER:${officer.officerId}`);
    else invariant(officer.captorFactionId===null,`TERMINAL_PUBLIC_FREE_OFFICER_HAS_CAPTOR:${officer.officerId}`);
  }
  invariant(unique(view.ownOfficers.map(officer=>officer.officerId))&&stable(view.ownOfficers.map(officer=>officer.officerId))===stable(view.ownOfficers.map(officer=>officer.officerId).sort()),'TERMINAL_PUBLIC_OFFICER_ORDER_UNSTABLE');

  invariant(Array.isArray(view.ownCities),'INVALID_TERMINAL_PUBLIC_OWN_CITIES');
  for(const city of view.ownCities){
    exactKeys(city,['cityId','governorId','occupationState','pendingGovernor'],'INVALID_TERMINAL_PUBLIC_CITY_SHAPE');
    invariant(id(city.cityId)&&(city.governorId===null||id(city.governorId))&&OCCUPATION_STATES.has(city.occupationState)&&typeof city.pendingGovernor==='boolean','INVALID_TERMINAL_PUBLIC_CITY');
    if(city.occupationState==='TEMPORARY_OCCUPATION')invariant(city.governorId===null&&city.pendingGovernor,'INVALID_TERMINAL_PUBLIC_TEMPORARY_OCCUPATION');
    else invariant((id(city.governorId)||(allowUngovernedNormal&&city.governorId===null))&&!city.pendingGovernor,'INVALID_TERMINAL_PUBLIC_NORMAL_CITY');
  }
  invariant(unique(view.ownCities.map(city=>city.cityId))&&stable(view.ownCities.map(city=>city.cityId))===stable(view.ownCities.map(city=>city.cityId).sort()),'TERMINAL_PUBLIC_CITY_ORDER_UNSTABLE');

  invariant(Array.isArray(view.ownChoices),'INVALID_TERMINAL_PUBLIC_OWN_CHOICES');
  let previousChoice=null;
  for(const choice of view.ownChoices){
    exactKeys(choice,['choiceId','type','cityId','candidateOfficerIds','status','createdAtTick','resolvedAtTick'],'INVALID_TERMINAL_PUBLIC_CHOICE_SHAPE');
    invariant(id(choice.choiceId)&&CHOICE_TYPES.has(choice.type)&&(choice.cityId===null||id(choice.cityId))&&CHOICE_STATUSES.has(choice.status)&&integer(choice.createdAtTick)&&(choice.resolvedAtTick===null||integer(choice.resolvedAtTick)),'INVALID_TERMINAL_PUBLIC_CHOICE');
    stableIds(choice.candidateOfficerIds,'TERMINAL_PUBLIC_CHOICE_CANDIDATE');
    if(choice.type==='SUCCESSION')invariant(choice.cityId===null,`TERMINAL_PUBLIC_SUCCESSION_HAS_CITY:${choice.choiceId}`);
    else invariant(id(choice.cityId),`TERMINAL_PUBLIC_OCCUPATION_MISSING_CITY:${choice.choiceId}`);
    if(choice.status==='PENDING')invariant(choice.resolvedAtTick===null,`TERMINAL_PUBLIC_PENDING_CHOICE_RESOLVED:${choice.choiceId}`);
    else invariant(integer(choice.resolvedAtTick)&&choice.resolvedAtTick>=choice.createdAtTick&&choice.resolvedAtTick<=view.globalTick,`TERMINAL_PUBLIC_CLOSED_CHOICE_MISSING_TICK:${choice.choiceId}`);
    if(previousChoice)invariant(choice.createdAtTick>previousChoice.createdAtTick||(choice.createdAtTick===previousChoice.createdAtTick&&choice.choiceId.localeCompare(previousChoice.choiceId)>0),'TERMINAL_PUBLIC_CHOICE_ORDER_UNSTABLE');
    previousChoice=choice;
  }
  invariant(unique(view.ownChoices.map(choice=>choice.choiceId)),'DUPLICATE_TERMINAL_PUBLIC_CHOICE');

  invariant(Array.isArray(view.knownPrisoners),'INVALID_TERMINAL_PUBLIC_PRISONERS');
  let previousPrisoner=null;
  for(const prisoner of view.knownPrisoners){
    exactKeys(prisoner,['officerId','relation','otherFactionId','disposition','capturedAtTick','closedAtTick'],'INVALID_TERMINAL_PUBLIC_PRISONER_SHAPE');
    invariant(id(prisoner.officerId)&&RELATIONS.has(prisoner.relation)&&id(prisoner.otherFactionId)&&PRISONER_DISPOSITIONS.has(prisoner.disposition)&&integer(prisoner.capturedAtTick)&&(prisoner.closedAtTick===null||integer(prisoner.closedAtTick)),'INVALID_TERMINAL_PUBLIC_PRISONER');
    if(prisoner.disposition==='HELD')invariant(prisoner.closedAtTick===null,'TERMINAL_PUBLIC_HELD_PRISONER_CLOSED');
    else invariant(integer(prisoner.closedAtTick)&&prisoner.closedAtTick>=prisoner.capturedAtTick&&prisoner.closedAtTick<=view.globalTick,'TERMINAL_PUBLIC_CLOSED_PRISONER_MISSING_TICK');
    if(previousPrisoner)invariant(prisoner.capturedAtTick>previousPrisoner.capturedAtTick||(prisoner.capturedAtTick===previousPrisoner.capturedAtTick&&(prisoner.officerId.localeCompare(previousPrisoner.officerId)>0||(prisoner.officerId===previousPrisoner.officerId&&prisoner.relation.localeCompare(previousPrisoner.relation)>0))),'TERMINAL_PUBLIC_PRISONER_ORDER_UNSTABLE');
    previousPrisoner=prisoner;
  }

  invariant(Array.isArray(view.observedEvents),'INVALID_TERMINAL_PUBLIC_EVENTS');
  let previous=null;
  for(const event of view.observedEvents){
    exactKeys(event,['eventId','globalTick','eventType','summaryCode','factionIds','armyIds','officerIds','cityIds'],'INVALID_TERMINAL_PUBLIC_EVENT_SHAPE');
    invariant(id(event.eventId)&&integer(event.globalTick)&&own(EVENT_SUMMARIES,event.eventType)&&event.summaryCode===EVENT_SUMMARIES[event.eventType],'INVALID_TERMINAL_PUBLIC_EVENT');
    for(const[label,ids]of [['FACTION',event.factionIds],['ARMY',event.armyIds],['OFFICER',event.officerIds],['CITY',event.cityIds]])stableIds(ids,`TERMINAL_PUBLIC_EVENT_${label}`);
    if(previous)invariant(event.globalTick>previous.globalTick||(event.globalTick===previous.globalTick&&event.eventId.localeCompare(previous.eventId)>0),'TERMINAL_PUBLIC_EVENT_ORDER_UNSTABLE');
    previous=event;
  }
  validateTerminalResultAndReport(view);
  jsonSafe(view,'publicView');
  return view;
}

/**
 * Project only faction-owned terminal information and explicitly known event
 * summaries. The caller owns the knowledge ledger and supplies its known
 * terminal record IDs; this module never infers new enemy knowledge.
 */
export function projectCampaignTerminalPublicView(state,input,options={}){
  validateCampaignTerminalState(state,options);
  const normalized=normalizeProjectionInput(state,input),viewerFactionId=normalized.viewerFactionId;
  const view={
    format:FORMAT,
    version:VERSION,
    contractStatus:'WORK_TRIAL',
    campaignId:state.campaignId,
    globalTick:state.globalTick,
    viewerFactionId,
    ownFaction:projectOwnFaction(state,viewerFactionId),
    ownArmyOutcomes:projectOwnArmyOutcomes(state,viewerFactionId),
    ownOfficers:projectOwnOfficers(state,viewerFactionId),
    ownCities:projectOwnCities(state,viewerFactionId),
    ownChoices:projectOwnChoices(state,viewerFactionId),
    knownPrisoners:projectKnownPrisoners(state,viewerFactionId),
    observedEvents:projectObservedEvents(state,viewerFactionId,normalized.knownTerminalRecordIds),
    gameResult:projectPublicResult(state),
    terminalReport:projectPublicReport(state),
  };
  return validateCampaignTerminalPublicView(view,options);
}

export function serializeCampaignTerminalPublicView(view){
  validateCampaignTerminalPublicView(view);
  return JSON.stringify(canonical(view),null,2);
}

export function deserializeCampaignTerminalPublicView(serialized){
  invariant(typeof serialized==='string'&&serialized.length>0&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_CAMPAIGN_TERMINAL_PUBLIC_SERIALIZED_INPUT');
  let view;try{view=JSON.parse(serialized);}catch{throw new Error('INVALID_CAMPAIGN_TERMINAL_PUBLIC_JSON');}
  validateCampaignTerminalPublicView(view);
  return clone(view);
}

export const CAMPAIGN_TERMINAL_PUBLIC_VIEW_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_PUBLIC_VIEW_VERSION=VERSION;
