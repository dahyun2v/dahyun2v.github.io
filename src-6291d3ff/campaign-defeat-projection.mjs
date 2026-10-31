import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';

const FORMAT='sangoku-campaign-defeat-projection';
const VERSION=1;
const FATES=new Set(['ESCAPED','CAPTURED','DEAD']);
const INPUT_KEYS=['transactionId','sourceResultId','globalTick','defeatedArmyId','commanderFate','captorFactionId'];
const REF_KEYS=['factionIds','armyIds','officerIds','cityIds','choiceIds','prisonerRecordIds'];

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=120&&/^[A-Za-z0-9._,:-]+$/.test(value);
const own=(value,key)=>Object.hasOwn(value,key);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function exactKeys(value,keys,message){invariant(object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort()),message);}
function refs(values={}){return Object.fromEntries(REF_KEYS.map(key=>[key,[...(values[key]??[])].sort()]));}
function record({recordId,globalTick,type,causeRecordIds=[],refs:recordRefs={},details}){
  return {recordId,globalTick,type,causeRecordIds:[...causeRecordIds].sort(),refs:refs(recordRefs),details:clone(details)};
}
function normalizeInput(input){
  exactKeys(input,INPUT_KEYS,'INVALID_DEFEAT_PROJECTION_INPUT_SHAPE');
  invariant(id(input.transactionId)&&id(input.sourceResultId)&&integer(input.globalTick)&&id(input.defeatedArmyId)&&FATES.has(input.commanderFate),'INVALID_DEFEAT_PROJECTION_INPUT');
  if(input.commanderFate==='CAPTURED')invariant(id(input.captorFactionId),'CAPTURED_FATE_REQUIRES_CAPTOR');
  else invariant(input.captorFactionId===null,`${input.commanderFate}_FATE_FORBIDS_CAPTOR`);
  return clone(input);
}
function prefix(input){return `R9D.${input.globalTick}.${input.transactionId}`;}
function idsFor(input,rulerDisplaced){
  const base=prefix(input);
  return {
    armyRecordId:`REC.${base}.010.ARMY`,
    fateRecordId:`REC.${base}.020.FATE`,
    rulerRecordId:rulerDisplaced?`REC.${base}.030.RULER`:null,
    prisonerRecordId:input.commanderFate==='CAPTURED'?`PRISONER.${base}`:null,
    successionChoiceId:rulerDisplaced?`CHOICE.${base}.SUCCESSION`:null,
  };
}
function projectionInput(input){return {format:FORMAT,version:VERSION,...clone(input)};}
function transactionRecords(state,transactionId){
  return state.recordOrder.map(recordId=>state.recordsById[recordId]).filter(entry=>entry.details?.projectionTransactionId===transactionId);
}
function addRecord(next,value){
  invariant(!own(next.recordsById,value.recordId),`DEFEAT_PROJECTION_RECORD_ID_COLLISION:${value.recordId}`);
  next.recordsById[value.recordId]=value;
}
function sortIndexes(next){
  next.recordOrder=Object.keys(next.recordsById).sort((a,b)=>next.recordsById[a].globalTick-next.recordsById[b].globalTick||a.localeCompare(b));
  next.choiceOrder=Object.keys(next.choicesById).sort((a,b)=>next.choicesById[a].createdAtTick-next.choicesById[b].createdAtTick||a.localeCompare(b));
  next.prisonerOrder=Object.keys(next.prisonersById).sort((a,b)=>next.prisonersById[a].capturedAtTick-next.prisonersById[b].capturedAtTick||a.localeCompare(b));
}
function availableSuccessors(state,factionId,excludedOfficerId){
  return state.officerOrder.filter(officerId=>{
    const officer=state.officersById[officerId];
    return officerId!==excludedOfficerId&&officer.allegianceFactionId===factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE';
  }).sort();
}
function pendingChoicesUsingOfficer(state,officerId){
  return state.choiceOrder.filter(choiceId=>{
    const choice=state.choicesById[choiceId];
    return choice.status==='PENDING'&&choice.candidateOfficerIds.includes(officerId);
  }).sort();
}
function validateReplay(state,input,records){
  const armyRecord=records.find(entry=>entry.details?.projectionStage==='ARMY_DEFEAT');
  invariant(armyRecord,'INCOMPLETE_DEFEAT_PROJECTION');
  invariant(stable(armyRecord.details.projectionInput)===stable(projectionInput(input)),`CONFLICTING_DEFEAT_PROJECTION:${input.transactionId}`);
  const manifest=armyRecord.details.manifest;
  exactKeys(manifest,['armyRecordId','fateRecordId','rulerRecordId','prisonerRecordId','successionChoiceId'],'INVALID_DEFEAT_PROJECTION_MANIFEST');
  invariant(manifest.armyRecordId===armyRecord.recordId,'DEFEAT_PROJECTION_MANIFEST_MISMATCH');
  const expectedRecordIds=[manifest.armyRecordId,manifest.fateRecordId,manifest.rulerRecordId].filter(Boolean).sort();
  invariant(stable(records.map(entry=>entry.recordId).sort())===stable(expectedRecordIds),'INCOMPLETE_DEFEAT_PROJECTION');
  const army=state.armiesById[input.defeatedArmyId];
  invariant(army?.disposition==='DEFEATED'&&army.terminalAtTick===input.globalTick&&army.terminalRecordId===manifest.armyRecordId,'DEFEAT_PROJECTION_ARMY_MISMATCH');
  const officer=state.officersById[army.commanderId];
  invariant(officer?.assignment.kind==='NONE','DEFEAT_PROJECTION_COMMANDER_STILL_ASSIGNED');
  if(input.commanderFate==='ESCAPED')invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.captorFactionId===null&&manifest.prisonerRecordId===null,'DEFEAT_PROJECTION_ESCAPE_MISMATCH');
  if(input.commanderFate==='DEAD')invariant(officer.lifeState==='DEAD'&&officer.captivityState==='FREE'&&officer.captorFactionId===null&&manifest.prisonerRecordId===null,'DEFEAT_PROJECTION_DEATH_MISMATCH');
  if(input.commanderFate==='CAPTURED'){
    const prisoner=state.prisonersById[manifest.prisonerRecordId];
    invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='PRISONER'&&officer.captorFactionId===input.captorFactionId,'DEFEAT_PROJECTION_CAPTURE_MISMATCH');
    invariant(prisoner?.officerId===officer.officerId&&prisoner.homeFactionId===army.factionId&&prisoner.captorFactionId===input.captorFactionId&&prisoner.captureRecordId===manifest.fateRecordId&&prisoner.disposition==='HELD','DEFEAT_PROJECTION_PRISONER_MISMATCH');
  }
  if(input.commanderFate!=='ESCAPED')invariant(pendingChoicesUsingOfficer(state,officer.officerId).length===0,'DEFEAT_PROJECTION_UNAVAILABLE_CHOICE_CANDIDATE');
  if(manifest.rulerRecordId){
    const faction=state.factionsById[army.factionId],choice=state.choicesById[manifest.successionChoiceId];
    invariant(faction.rulerId===null&&choice?.type==='SUCCESSION'&&choice.factionId===army.factionId&&choice.status==='PENDING'&&choice.causeRecordId===manifest.rulerRecordId,'DEFEAT_PROJECTION_SUCCESSION_MISMATCH');
    invariant(faction.rulerVacancy===(choice.candidateOfficerIds.length?'PENDING_SUCCESSION':'VACANT_ONE_TURN'),'DEFEAT_PROJECTION_VACANCY_MISMATCH');
  }
  return clone(state);
}

export function projectConfirmedArmyDefeat(state,input){
  validateCampaignTerminalState(state);
  const normalized=normalizeInput(input),existing=transactionRecords(state,normalized.transactionId);
  if(existing.length)return validateReplay(state,normalized,existing);
  invariant(state.gameResult===null,'DEFEAT_PROJECTION_AFTER_TERMINAL_RESULT');
  invariant(normalized.globalTick>=state.globalTick,'DEFEAT_PROJECTION_TICK_REGRESSION');
  const army=state.armiesById[normalized.defeatedArmyId];
  invariant(army,'DEFEAT_PROJECTION_ARMY_NOT_FOUND');
  invariant(army.disposition==='ACTIVE','DEFEAT_PROJECTION_ARMY_NOT_ACTIVE');
  const officer=state.officersById[army.commanderId];
  invariant(officer&&officer.allegianceFactionId===army.factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.assignment.kind==='ARMY'&&officer.assignment.id===army.armyId,'DEFEAT_PROJECTION_COMMANDER_UNAVAILABLE');
  if(normalized.commanderFate==='CAPTURED'){
    invariant(own(state.factionsById,normalized.captorFactionId),'DEFEAT_PROJECTION_CAPTOR_NOT_FOUND');
    invariant(normalized.captorFactionId!==army.factionId,'DEFEAT_PROJECTION_CAPTOR_IS_HOME_FACTION');
    invariant(state.factionsById[normalized.captorFactionId].alive,'DEFEAT_PROJECTION_CAPTOR_NOT_ALIVE');
  }
  const rulerDisplaced=state.factionsById[army.factionId].rulerId===officer.officerId&&normalized.commanderFate!=='ESCAPED';
  const manifest=idsFor(normalized,rulerDisplaced),allIds=Object.values(manifest).filter(Boolean);
  invariant(allIds.every(id)&&new Set(allIds).size===allIds.length,'INVALID_DEFEAT_PROJECTION_IDS');
  for(const recordId of [manifest.armyRecordId,manifest.fateRecordId,manifest.rulerRecordId].filter(Boolean))invariant(!own(state.recordsById,recordId),`DEFEAT_PROJECTION_RECORD_ID_COLLISION:${recordId}`);
  if(manifest.prisonerRecordId)invariant(!own(state.prisonersById,manifest.prisonerRecordId),`DEFEAT_PROJECTION_PRISONER_ID_COLLISION:${manifest.prisonerRecordId}`);
  if(manifest.successionChoiceId)invariant(!own(state.choicesById,manifest.successionChoiceId),`DEFEAT_PROJECTION_CHOICE_ID_COLLISION:${manifest.successionChoiceId}`);

  const next=clone(state),common={
    projectionKind:'CONFIRMED_ARMY_DEFEAT',projectionTransactionId:normalized.transactionId,
    sourceResultId:normalized.sourceResultId,
  };
  const affectedChoiceIds=normalized.commanderFate==='ESCAPED'?[]:pendingChoicesUsingOfficer(state,officer.officerId);
  next.globalTick=normalized.globalTick;
  addRecord(next,record({
    recordId:manifest.armyRecordId,globalTick:normalized.globalTick,type:'ARMY_DISPOSITION',
    refs:{factionIds:[army.factionId],armyIds:[army.armyId],officerIds:[officer.officerId]},
    details:{...common,projectionStage:'ARMY_DEFEAT',projectionInput:projectionInput(normalized),manifest:clone(manifest),disposition:'DEFEATED'},
  }));
  const fateType=normalized.commanderFate==='DEAD'?'OFFICER_LIFE':'OFFICER_CAPTIVITY';
  addRecord(next,record({
    recordId:manifest.fateRecordId,globalTick:normalized.globalTick,type:fateType,causeRecordIds:[manifest.armyRecordId],
    refs:{
      factionIds:[army.factionId,...(normalized.captorFactionId?[normalized.captorFactionId]:[])],armyIds:[army.armyId],officerIds:[officer.officerId],
      choiceIds:affectedChoiceIds,
      prisonerRecordIds:manifest.prisonerRecordId?[manifest.prisonerRecordId]:[],
    },
    details:{...common,projectionStage:'COMMANDER_FATE',confirmedFate:normalized.commanderFate,captorFactionId:normalized.captorFactionId,removedPendingChoiceIds:affectedChoiceIds},
  }));

  next.armiesById[army.armyId]={...next.armiesById[army.armyId],disposition:'DEFEATED',terminalAtTick:normalized.globalTick,terminalRecordId:manifest.armyRecordId};
  const nextOfficer=next.officersById[officer.officerId];
  nextOfficer.assignment={kind:'NONE',id:null};
  if(normalized.commanderFate==='CAPTURED'){
    nextOfficer.captivityState='PRISONER';nextOfficer.captorFactionId=normalized.captorFactionId;
    next.prisonersById[manifest.prisonerRecordId]={
      prisonerRecordId:manifest.prisonerRecordId,officerId:officer.officerId,homeFactionId:army.factionId,captorFactionId:normalized.captorFactionId,
      capturedAtTick:normalized.globalTick,captureRecordId:manifest.fateRecordId,disposition:'HELD',closedAtTick:null,closureRecordId:null,
    };
  }else if(normalized.commanderFate==='DEAD'){
    nextOfficer.lifeState='DEAD';nextOfficer.captivityState='FREE';nextOfficer.captorFactionId=null;
  }else{
    nextOfficer.lifeState='ALIVE';nextOfficer.captivityState='FREE';nextOfficer.captorFactionId=null;
  }
  for(const choiceId of affectedChoiceIds){
    const choice=next.choicesById[choiceId];
    choice.candidateOfficerIds=choice.candidateOfficerIds.filter(candidateId=>candidateId!==officer.officerId);
    if(choice.type==='SUCCESSION'&&choice.candidateOfficerIds.length===0&&next.factionsById[choice.factionId].rulerId===null){
      next.factionsById[choice.factionId].rulerVacancy='VACANT_ONE_TURN';
    }
  }

  if(rulerDisplaced){
    const candidates=availableSuccessors(next,army.factionId,officer.officerId),vacancy=candidates.length?'PENDING_SUCCESSION':'VACANT_ONE_TURN';
    addRecord(next,record({
      recordId:manifest.rulerRecordId,globalTick:normalized.globalTick,type:'FACTION_RULER',causeRecordIds:[manifest.fateRecordId],
      refs:{factionIds:[army.factionId],officerIds:[officer.officerId],choiceIds:[manifest.successionChoiceId]},
      details:{...common,projectionStage:'RULER_VACANCY',previousRulerId:officer.officerId,rulerVacancy:vacancy,candidateOfficerIds:candidates},
    }));
    next.factionsById[army.factionId].rulerId=null;next.factionsById[army.factionId].rulerVacancy=vacancy;
    next.choicesById[manifest.successionChoiceId]={
      choiceId:manifest.successionChoiceId,type:'SUCCESSION',factionId:army.factionId,cityId:null,candidateOfficerIds:candidates,status:'PENDING',
      createdAtTick:normalized.globalTick,causeRecordId:manifest.rulerRecordId,resolvedAtTick:null,resolutionRecordId:null,
    };
  }
  sortIndexes(next);
  return validateCampaignTerminalState(next);
}

export const CAMPAIGN_DEFEAT_PROJECTION_FORMAT=FORMAT;
export const CAMPAIGN_DEFEAT_PROJECTION_VERSION=VERSION;
export const CAMPAIGN_DEFEAT_FATES=Object.freeze([...FATES].sort());
