import {DEFAULT_CAMPAIGN_RULES} from './campaign-scenario-data.mjs';
import {finalizeCampaignTerminalState,validateCampaignTerminalState} from './campaign-terminal-state.mjs';

const FORMAT='sangoku-campaign-terminal-batch-settlement';
const VERSION=1;
const INPUT_KEYS=['batchId','globalTick','defeatPayloads','cityCapturePayloads'];
const DEFEAT_KEYS=['transactionId','sourceResultId','globalTick','defeatedArmyId','commanderFate','captorFactionId'];
const CAPTURE_KEYS=['transactionId','sourceResultId','globalTick','capturedCityId','formerOwnerFactionId','occupierFactionId'];
const FATES=new Set(['ESCAPED','CAPTURED','DEAD']);
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
function refs(values={}){return Object.fromEntries(REF_KEYS.map(key=>[key,[...new Set(values[key]??[])].sort()]));}
function record({recordId,globalTick,type,causeRecordIds=[],refs:recordRefs={},details}){
  return {recordId,globalTick,type,causeRecordIds:[...new Set(causeRecordIds)].sort(),refs:refs(recordRefs),details:clone(details)};
}
function normalizeDefeat(payload,globalTick){
  exactKeys(payload,DEFEAT_KEYS,'INVALID_TERMINAL_BATCH_DEFEAT_SHAPE');
  invariant(id(payload.transactionId)&&id(payload.sourceResultId)&&integer(payload.globalTick)&&payload.globalTick===globalTick&&id(payload.defeatedArmyId)&&FATES.has(payload.commanderFate),'INVALID_TERMINAL_BATCH_DEFEAT');
  if(payload.commanderFate==='CAPTURED')invariant(id(payload.captorFactionId),'TERMINAL_BATCH_CAPTURED_FATE_REQUIRES_CAPTOR');
  else invariant(payload.captorFactionId===null,`TERMINAL_BATCH_${payload.commanderFate}_FATE_FORBIDS_CAPTOR`);
  return clone(payload);
}
function normalizeCapture(payload,globalTick){
  exactKeys(payload,CAPTURE_KEYS,'INVALID_TERMINAL_BATCH_CITY_CAPTURE_SHAPE');
  invariant(id(payload.transactionId)&&id(payload.sourceResultId)&&integer(payload.globalTick)&&payload.globalTick===globalTick&&id(payload.capturedCityId)&&(payload.formerOwnerFactionId===null||id(payload.formerOwnerFactionId))&&id(payload.occupierFactionId),'INVALID_TERMINAL_BATCH_CITY_CAPTURE');
  invariant(payload.formerOwnerFactionId!==payload.occupierFactionId,'TERMINAL_BATCH_CITY_CAPTURE_REQUIRES_ENEMY_OWNER');
  return clone(payload);
}
function normalizeInput(input,{settleTurnEnd=false}={}){
  exactKeys(input,INPUT_KEYS,'INVALID_TERMINAL_BATCH_INPUT_SHAPE');
  invariant(id(input.batchId)&&integer(input.globalTick)&&Array.isArray(input.defeatPayloads)&&Array.isArray(input.cityCapturePayloads),'INVALID_TERMINAL_BATCH_INPUT');
  invariant(settleTurnEnd||input.defeatPayloads.length+input.cityCapturePayloads.length>0,'EMPTY_TERMINAL_BATCH');
  const defeatPayloads=input.defeatPayloads.map(payload=>normalizeDefeat(payload,input.globalTick)).sort((a,b)=>a.transactionId.localeCompare(b.transactionId));
  const cityCapturePayloads=input.cityCapturePayloads.map(payload=>normalizeCapture(payload,input.globalTick)).sort((a,b)=>a.transactionId.localeCompare(b.transactionId));
  const transactionIds=[...defeatPayloads,...cityCapturePayloads].map(payload=>payload.transactionId);
  invariant(new Set(transactionIds).size===transactionIds.length,'DUPLICATE_TERMINAL_BATCH_TRANSACTION_ID');
  invariant(new Set(defeatPayloads.map(payload=>payload.defeatedArmyId)).size===defeatPayloads.length,'DUPLICATE_TERMINAL_BATCH_DEFEATED_ARMY');
  invariant(new Set(cityCapturePayloads.map(payload=>payload.capturedCityId)).size===cityCapturePayloads.length,'DUPLICATE_TERMINAL_BATCH_CAPTURED_CITY');
  return {batchId:input.batchId,globalTick:input.globalTick,defeatPayloads,cityCapturePayloads};
}
function projectionInput(input){return {format:FORMAT,version:VERSION,...clone(input)};}
function defeatIds(payload,createSuccession){
  const base=`R9D.${payload.globalTick}.${payload.transactionId}`;
  return {
    armyRecordId:`REC.${base}.010.ARMY`,
    fateRecordId:`REC.${base}.020.FATE`,
    rulerRecordId:createSuccession?`REC.${base}.030.RULER`:null,
    prisonerRecordId:payload.commanderFate==='CAPTURED'?`PRISONER.${base}`:null,
    successionChoiceId:createSuccession?`CHOICE.${base}.SUCCESSION`:null,
  };
}
function captureIds(payload){
  const base=`R9C.${payload.globalTick}.${payload.transactionId}`;
  return {occupationRecordId:`REC.${base}.010.OCCUPATION`,occupationChoiceId:`CHOICE.${base}.OCCUPATION`};
}
function settlementIds(input){
  const base=`R9S.${input.globalTick}.${input.batchId}`;
  return {
    extinctionRecordId:factionId=>`REC.${base}.100.EXTINCTION.${factionId}`,
    prisonerReleaseRecordId:prisonerRecordId=>`REC.${base}.150.PRISONER_RELEASE.${prisonerRecordId}`,
    disbandRecordId:armyId=>`REC.${base}.200.DISBAND.${armyId}`,
    terminalRecordId:`REC.R9T.${input.globalTick}.${input.batchId}.900.TERMINAL`,
    reportId:`REPORT.R9T.${input.globalTick}.${input.batchId}`,
  };
}
function sortIndexes(next){
  next.recordOrder=Object.keys(next.recordsById).sort((a,b)=>next.recordsById[a].globalTick-next.recordsById[b].globalTick||a.localeCompare(b));
  next.choiceOrder=Object.keys(next.choicesById).sort((a,b)=>next.choicesById[a].createdAtTick-next.choicesById[b].createdAtTick||a.localeCompare(b));
  next.prisonerOrder=Object.keys(next.prisonersById).sort((a,b)=>next.prisonersById[a].capturedAtTick-next.prisonersById[b].capturedAtTick||a.localeCompare(b));
}
function pendingChoicesUsingOfficer(state,officerId){
  return state.choiceOrder.filter(choiceId=>{
    const choice=state.choicesById[choiceId];
    return choice.status==='PENDING'&&choice.candidateOfficerIds.includes(officerId);
  }).sort();
}
function availableOfficers(state,factionId){
  const neutral=new Set();for(const r of [...Object.values(state.recordsById)].sort((a,b)=>a.globalTick-b.globalTick||a.recordId.localeCompare(b.recordId)))for(const id of r.refs.officerIds){if(r.details.c26WandererState==='WANDERER')neutral.add(id);if(r.details.c26WandererState==='JOINED')neutral.delete(id);}
  return state.officerOrder.filter(officerId=>{
    const officer=state.officersById[officerId];
    return !neutral.has(officerId)&&officer.allegianceFactionId===factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE';
  }).sort();
}
function ownedCities(state,factionId){return state.cityOrder.filter(cityId=>state.citiesById[cityId].kind!=='minor'&&state.citiesById[cityId].ownerFactionId===factionId);}
function addRecord(next,value){
  invariant(!own(next.recordsById,value.recordId),`TERMINAL_BATCH_RECORD_ID_COLLISION:${value.recordId}`);
  next.recordsById[value.recordId]=value;
}
function batchAnchor(state,batchId){
  return state.recordOrder.map(recordId=>state.recordsById[recordId]).filter(entry=>entry.details?.batchSettlementRole==='ANCHOR'&&entry.details?.batchSettlementId===batchId);
}
function validateReplay(state,input,anchors,options={}){
  invariant(anchors.length===1,'INCOMPLETE_TERMINAL_BATCH_SETTLEMENT');
  const anchor=anchors[0];
  invariant(stable(anchor.details.batchProjectionInput)===stable(projectionInput(input)),`CONFLICTING_TERMINAL_BATCH_SETTLEMENT:${input.batchId}`);
  const manifest=anchor.details.batchManifest;
  exactKeys(manifest,['recordIds','choiceIds','prisonerRecordIds','extinctFactionIds','disbandedArmyIds','resultType','winnerFactionId','terminalRecordId','reportId'],'INVALID_TERMINAL_BATCH_MANIFEST');
  for(const [label,values] of [['recordIds',manifest.recordIds],['choiceIds',manifest.choiceIds],['prisonerRecordIds',manifest.prisonerRecordIds],['extinctFactionIds',manifest.extinctFactionIds],['disbandedArmyIds',manifest.disbandedArmyIds]])invariant(Array.isArray(values)&&values.every(id)&&new Set(values).size===values.length&&stable(values)===stable([...values].sort()),`INVALID_TERMINAL_BATCH_MANIFEST_${label}`);
  for(const recordId of manifest.recordIds)invariant(own(state.recordsById,recordId),`INCOMPLETE_TERMINAL_BATCH_RECORD:${recordId}`);
  for(const choiceId of manifest.choiceIds)invariant(own(state.choicesById,choiceId),`INCOMPLETE_TERMINAL_BATCH_CHOICE:${choiceId}`);
  for(const prisonerRecordId of manifest.prisonerRecordIds)invariant(own(state.prisonersById,prisonerRecordId),`INCOMPLETE_TERMINAL_BATCH_PRISONER:${prisonerRecordId}`);
  for(const factionId of manifest.extinctFactionIds){const faction=state.factionsById[factionId];invariant(faction&&!faction.alive&&faction.rulerId===null&&faction.rulerVacancy==='EXTINCT',`TERMINAL_BATCH_EXTINCTION_MISMATCH:${factionId}`);}
  for(const armyId of manifest.disbandedArmyIds)invariant(state.armiesById[armyId]?.disposition==='DISBANDED',`TERMINAL_BATCH_DISBAND_MISMATCH:${armyId}`);
  const batchRecordIds=state.recordOrder.filter(recordId=>state.recordsById[recordId].details?.batchSettlementId===input.batchId);
  const actualRecordIds=[...batchRecordIds,...(manifest.terminalRecordId?[manifest.terminalRecordId]:[])].sort();
  const actualExtinctFactionIds=batchRecordIds.filter(recordId=>state.recordsById[recordId].details?.projectionStage==='FACTION_EXTINCTION').flatMap(recordId=>state.recordsById[recordId].refs.factionIds).sort();
  const actualDisbandedArmyIds=batchRecordIds.filter(recordId=>state.recordsById[recordId].details?.projectionStage==='EXTINCTION_DISBAND').flatMap(recordId=>state.recordsById[recordId].refs.armyIds).sort();
  const actualChoiceIds=state.choiceOrder.filter(choiceId=>state.recordsById[state.choicesById[choiceId].causeRecordId]?.details?.batchSettlementId===input.batchId).sort();
  const actualPrisonerRecordIds=state.prisonerOrder.filter(prisonerRecordId=>state.recordsById[state.prisonersById[prisonerRecordId].captureRecordId]?.details?.batchSettlementId===input.batchId).sort();
  invariant(stable(manifest.recordIds)===stable(actualRecordIds),'TERMINAL_BATCH_MANIFEST_RECORDS_MISMATCH');
  invariant(stable(manifest.choiceIds)===stable(actualChoiceIds),'TERMINAL_BATCH_MANIFEST_CHOICES_MISMATCH');
  invariant(stable(manifest.prisonerRecordIds)===stable(actualPrisonerRecordIds),'TERMINAL_BATCH_MANIFEST_PRISONERS_MISMATCH');
  invariant(stable(manifest.extinctFactionIds)===stable(actualExtinctFactionIds),'TERMINAL_BATCH_MANIFEST_EXTINCTIONS_MISMATCH');
  invariant(stable(manifest.disbandedArmyIds)===stable(actualDisbandedArmyIds),'TERMINAL_BATCH_MANIFEST_DISBANDS_MISMATCH');
  if(manifest.resultType===null)invariant(state.gameResult===null,'TERMINAL_BATCH_UNEXPECTED_RESULT');
  else invariant(state.gameResult?.type===manifest.resultType&&state.gameResult.winnerFactionId===manifest.winnerFactionId&&state.gameResult.terminalRecordId===manifest.terminalRecordId&&state.gameResult.reportId===manifest.reportId,'TERMINAL_BATCH_RESULT_MISMATCH');
  validateCampaignTerminalState(state,options);
  return clone(state);
}

/**
 * Atomically projects one externally confirmed result batch. This reducer does
 * not decide combat, retreat, fate, city capture, occupation policy or duels.
 */
export function settleConfirmedCampaignTerminalBatch(state,input,{deferResult=false,deferExtinction=false,settleTurnEnd=false,allowRecapture=false,allowUngovernedNormal=false,policySurvival=false,unificationMajorCities=DEFAULT_CAMPAIGN_RULES.unificationMajorCities}={}){
  invariant([deferResult,deferExtinction,settleTurnEnd,allowRecapture].every(v=>typeof v==='boolean'),'INVALID_TERMINAL_BATCH_DEFER_RESULT');
  const validation={allowCitylessAlive:deferExtinction||settleTurnEnd,allowSupersededOccupation:allowRecapture,allowUngovernedNormal};
  validateCampaignTerminalState(state,validation);
  const normalized=normalizeInput(input,{settleTurnEnd}),existing=batchAnchor(state,normalized.batchId);
  if(existing.length)return validateReplay(state,normalized,existing,validation);
  invariant(state.gameResult===null,'TERMINAL_BATCH_AFTER_GAME_RESULT');
  invariant(normalized.globalTick>=state.globalTick,'TERMINAL_BATCH_TICK_REGRESSION');

  const defeatedArmies=new Map(),capturedCities=new Map();
  for(const payload of normalized.defeatPayloads){
    const army=state.armiesById[payload.defeatedArmyId];
    invariant(army,'TERMINAL_BATCH_DEFEATED_ARMY_NOT_FOUND');
    invariant(army.disposition==='ACTIVE','TERMINAL_BATCH_ARMY_NOT_ACTIVE');
    const officer=state.officersById[army.commanderId];
    invariant(officer&&officer.allegianceFactionId===army.factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.assignment.kind==='ARMY'&&officer.assignment.id===army.armyId,'TERMINAL_BATCH_COMMANDER_UNAVAILABLE');
    if(payload.commanderFate==='CAPTURED'){
      invariant(own(state.factionsById,payload.captorFactionId),'TERMINAL_BATCH_CAPTOR_NOT_FOUND');
      invariant(payload.captorFactionId!==army.factionId,'TERMINAL_BATCH_CAPTOR_IS_HOME_FACTION');
      invariant(state.factionsById[payload.captorFactionId].alive,'TERMINAL_BATCH_CAPTOR_NOT_ALIVE');
    }
    defeatedArmies.set(payload.defeatedArmyId,{payload,army,officer});
  }
  for(const payload of normalized.cityCapturePayloads){
    const city=state.citiesById[payload.capturedCityId];
    invariant(city,'TERMINAL_BATCH_CITY_NOT_FOUND');
    invariant(payload.formerOwnerFactionId!==null||city.kind==='minor','NEUTRAL_CAPTURE_REQUIRES_MINOR_CITY');
    invariant(city.ownerFactionId===payload.formerOwnerFactionId,'TERMINAL_BATCH_STALE_CITY_OWNER');
    invariant(city.occupationState==='NORMAL'||allowRecapture,'TERMINAL_BATCH_CITY_NOT_NORMAL');
    invariant(id(city.governorId)||(allowRecapture&&city.governorId===null),'TERMINAL_BATCH_CITY_GOVERNOR_REQUIRED');
    invariant(own(state.factionsById,payload.occupierFactionId),'TERMINAL_BATCH_OCCUPIER_NOT_FOUND');
    invariant(state.factionsById[payload.occupierFactionId].alive,'TERMINAL_BATCH_OCCUPIER_NOT_ALIVE');
    capturedCities.set(payload.capturedCityId,{payload,city,formerGovernorId:city.governorId});
  }

  const next=clone(state),batchCommon={batchSettlementId:normalized.batchId,batchSettlementFormat:FORMAT,batchSettlementVersion:VERSION};
  next.globalTick=normalized.globalTick;

  // Apply all city ownership changes before deciding whether any faction is extinct.
  for(const {payload,formerGovernorId} of capturedCities.values()){
    if(formerGovernorId)next.officersById[formerGovernorId].assignment={kind:'NONE',id:null};
    if(allowRecapture)for(const choice of Object.values(next.choicesById))if(choice.type==='OCCUPATION'&&choice.cityId===payload.capturedCityId&&choice.status==='PENDING'){choice.status='CANCELLED';choice.candidateOfficerIds=[];choice.resolvedAtTick=normalized.globalTick;choice.resolutionRecordId=captureIds(payload).occupationRecordId;}
    next.citiesById[payload.capturedCityId]={...next.citiesById[payload.capturedCityId],ownerFactionId:payload.occupierFactionId,governorId:null,occupationState:'TEMPORARY_OCCUPATION',pendingGovernor:true,occupationRecordId:null};
  }

  // Apply every confirmed officer fate before building successor/governor candidates.
  const displacedRulers=new Map();
  for(const {payload,army,officer} of defeatedArmies.values()){
    if(next.factionsById[army.factionId].rulerId===officer.officerId&&payload.commanderFate!=='ESCAPED')displacedRulers.set(army.factionId,{payload,army,officer});
    next.armiesById[army.armyId]={...next.armiesById[army.armyId],disposition:'DEFEATED',terminalAtTick:normalized.globalTick,terminalRecordId:null};
    const nextOfficer=next.officersById[officer.officerId];
    nextOfficer.assignment={kind:'NONE',id:null};
    if(payload.commanderFate==='CAPTURED'){
      nextOfficer.lifeState='ALIVE';nextOfficer.captivityState='PRISONER';nextOfficer.captorFactionId=payload.captorFactionId;
    }else if(payload.commanderFate==='DEAD'){
      nextOfficer.lifeState='DEAD';nextOfficer.captivityState='FREE';nextOfficer.captorFactionId=null;
    }else{
      nextOfficer.lifeState='ALIVE';nextOfficer.captivityState='FREE';nextOfficer.captorFactionId=null;
    }
    if(payload.commanderFate!=='ESCAPED')for(const choiceId of pendingChoicesUsingOfficer(next,officer.officerId))next.choicesById[choiceId].candidateOfficerIds=next.choicesById[choiceId].candidateOfficerIds.filter(candidateId=>candidateId!==officer.officerId);
  }

  const extinctFactionIds=deferExtinction?[]:next.factionOrder.filter(factionId=>state.factionsById[factionId].alive&&ownedCities(next,factionId).length===0&&!(policySurvival&&factionId==='F02'&&(next.cityOrder.some(id=>next.citiesById[id].ownerFactionId===factionId)||next.armyOrder.some(id=>next.armiesById[id].factionId===factionId&&next.armiesById[id].disposition==='ACTIVE')))).sort();
  const extinctSet=new Set(extinctFactionIds);
  const generatedChoiceIds=[],generatedPrisonerRecordIds=[],generatedRecordIds=[],disbandedArmyIds=[];

  // Event records preserve the established R9D/R9C identifiers.
  for(const {payload,army,officer} of defeatedArmies.values()){
    const displaced=displacedRulers.get(army.factionId);
    const createSuccession=displaced?.payload.transactionId===payload.transactionId&&!extinctSet.has(army.factionId);
    const ids=defeatIds(payload,createSuccession),affectedChoiceIds=payload.commanderFate==='ESCAPED'?[]:pendingChoicesUsingOfficer(state,officer.officerId);
    const manifest=clone(ids),common={...batchCommon,projectionKind:'CONFIRMED_ARMY_DEFEAT',projectionTransactionId:payload.transactionId,sourceResultId:payload.sourceResultId};
    if(ids.prisonerRecordId)invariant(!own(next.prisonersById,ids.prisonerRecordId),`TERMINAL_BATCH_PRISONER_ID_COLLISION:${ids.prisonerRecordId}`);
    if(ids.successionChoiceId)invariant(!own(next.choicesById,ids.successionChoiceId),`TERMINAL_BATCH_CHOICE_ID_COLLISION:${ids.successionChoiceId}`);
    addRecord(next,record({
      recordId:ids.armyRecordId,globalTick:normalized.globalTick,type:'ARMY_DISPOSITION',
      refs:{factionIds:[army.factionId],armyIds:[army.armyId],officerIds:[officer.officerId]},
      details:{...common,projectionStage:'ARMY_DEFEAT',projectionInput:{format:'sangoku-campaign-defeat-projection',version:1,...clone(payload)},manifest,disposition:'DEFEATED'},
    }));
    addRecord(next,record({
      recordId:ids.fateRecordId,globalTick:normalized.globalTick,type:payload.commanderFate==='DEAD'?'OFFICER_LIFE':'OFFICER_CAPTIVITY',causeRecordIds:[ids.armyRecordId],
      refs:{factionIds:[army.factionId,...(payload.captorFactionId?[payload.captorFactionId]:[])],armyIds:[army.armyId],officerIds:[officer.officerId],choiceIds:affectedChoiceIds,prisonerRecordIds:ids.prisonerRecordId?[ids.prisonerRecordId]:[]},
      details:{...common,projectionStage:'COMMANDER_FATE',confirmedFate:payload.commanderFate,captorFactionId:payload.captorFactionId,removedPendingChoiceIds:affectedChoiceIds},
    }));
    next.armiesById[army.armyId].terminalRecordId=ids.armyRecordId;
    generatedRecordIds.push(ids.armyRecordId,ids.fateRecordId);
    if(ids.prisonerRecordId){
      next.prisonersById[ids.prisonerRecordId]={prisonerRecordId:ids.prisonerRecordId,officerId:officer.officerId,homeFactionId:army.factionId,captorFactionId:payload.captorFactionId,capturedAtTick:normalized.globalTick,captureRecordId:ids.fateRecordId,disposition:'HELD',closedAtTick:null,closureRecordId:null};
      generatedPrisonerRecordIds.push(ids.prisonerRecordId);
    }
    if(createSuccession){
      const candidates=availableOfficers(next,army.factionId),vacancy=candidates.length?'PENDING_SUCCESSION':'VACANT_ONE_TURN';
      addRecord(next,record({
        recordId:ids.rulerRecordId,globalTick:normalized.globalTick,type:'FACTION_RULER',causeRecordIds:[ids.fateRecordId],
        refs:{factionIds:[army.factionId],officerIds:[officer.officerId],choiceIds:[ids.successionChoiceId]},
        details:{...common,projectionStage:'RULER_VACANCY',previousRulerId:officer.officerId,rulerVacancy:vacancy,candidateOfficerIds:candidates},
      }));
      next.factionsById[army.factionId].rulerId=null;next.factionsById[army.factionId].rulerVacancy=vacancy;
      next.choicesById[ids.successionChoiceId]={choiceId:ids.successionChoiceId,type:'SUCCESSION',factionId:army.factionId,cityId:null,candidateOfficerIds:candidates,status:'PENDING',createdAtTick:normalized.globalTick,causeRecordId:ids.rulerRecordId,resolvedAtTick:null,resolutionRecordId:null};
      generatedRecordIds.push(ids.rulerRecordId);generatedChoiceIds.push(ids.successionChoiceId);
    }
  }

  for(const {payload,formerGovernorId} of capturedCities.values()){
    const ids=captureIds(payload),governorCandidateOfficerIds=availableOfficers(next,payload.occupierFactionId).filter(officerId=>next.officersById[officerId].assignment.kind==='NONE'),formerOwnerLostLastCity=payload.formerOwnerFactionId!==null&&ownedCities(next,payload.formerOwnerFactionId).length===0;
    const manifest={...ids,formerGovernorId,governorCandidateOfficerIds,formerOwnerLostLastCity};
    invariant(!own(next.choicesById,ids.occupationChoiceId),`TERMINAL_BATCH_CHOICE_ID_COLLISION:${ids.occupationChoiceId}`);
    addRecord(next,record({
      recordId:ids.occupationRecordId,globalTick:normalized.globalTick,type:'CITY_OCCUPATION',
      refs:{factionIds:[payload.formerOwnerFactionId,payload.occupierFactionId].filter(Boolean),officerIds:formerGovernorId?[formerGovernorId]:[],cityIds:[payload.capturedCityId],choiceIds:[ids.occupationChoiceId]},
      details:{...batchCommon,projectionKind:'CONFIRMED_CITY_CAPTURE',projectionTransactionId:payload.transactionId,projectionStage:'TEMPORARY_OCCUPATION',sourceResultId:payload.sourceResultId,projectionInput:{format:'sangoku-campaign-city-occupation-projection',version:1,...clone(payload)},manifest,formerOwnerFactionId:payload.formerOwnerFactionId,occupierFactionId:payload.occupierFactionId,formerGovernorId,formerOwnerLostLastCity,occupationPolicy:'PENDING_EXTERNAL_CHOICE'},
    }));
    next.citiesById[payload.capturedCityId].occupationRecordId=ids.occupationRecordId;
    next.choicesById[ids.occupationChoiceId]={choiceId:ids.occupationChoiceId,type:'OCCUPATION',factionId:payload.occupierFactionId,cityId:payload.capturedCityId,candidateOfficerIds:governorCandidateOfficerIds,status:'PENDING',createdAtTick:normalized.globalTick,causeRecordId:ids.occupationRecordId,resolvedAtTick:null,resolutionRecordId:null};
    generatedRecordIds.push(ids.occupationRecordId);generatedChoiceIds.push(ids.occupationChoiceId);
  }

  // Reconcile pre-existing surviving succession choices after all fates.
  for(const factionId of next.factionOrder){
    if(!next.factionsById[factionId].alive||extinctSet.has(factionId)||displacedRulers.has(factionId))continue;
    const faction=next.factionsById[factionId];
    if(faction.rulerId===null){
      const choice=next.choiceOrder.map(choiceId=>next.choicesById[choiceId]).find(entry=>entry.type==='SUCCESSION'&&entry.factionId===factionId&&entry.status==='PENDING');
      invariant(choice,'TERMINAL_BATCH_SURVIVING_VACANCY_WITHOUT_CHOICE');
      faction.rulerVacancy=choice.candidateOfficerIds.length?'PENDING_SUCCESSION':'VACANT_ONE_TURN';
    }
  }

  const ids=settlementIds(normalized),extinctionRecordIds=[];
  for(const factionId of extinctFactionIds){
    const faction=next.factionsById[factionId],extinctionRecordId=ids.extinctionRecordId(factionId);
    const pendingSuccessionChoiceIds=Object.keys(next.choicesById).filter(choiceId=>{const choice=next.choicesById[choiceId];return choice.type==='SUCCESSION'&&choice.factionId===factionId&&choice.status==='PENDING';}).sort();
    const causeRecordIds=generatedRecordIds.filter(recordId=>{const value=next.recordsById[recordId];return value.refs.factionIds.includes(factionId);}).sort();
    addRecord(next,record({
      recordId:extinctionRecordId,globalTick:normalized.globalTick,type:'FACTION_EXTINCTION',causeRecordIds,
      refs:{factionIds:[factionId],choiceIds:pendingSuccessionChoiceIds},
      details:{...batchCommon,projectionStage:'FACTION_EXTINCTION',previousRulerId:faction.rulerId,zeroMajorCities:true,cancelledSuccessionChoiceIds:pendingSuccessionChoiceIds,automaticOfficerAbsorption:false},
    }));
    for(const choiceId of pendingSuccessionChoiceIds){
      const choice=next.choicesById[choiceId];choice.status='CANCELLED';choice.candidateOfficerIds=[];choice.resolvedAtTick=normalized.globalTick;choice.resolutionRecordId=extinctionRecordId;
    }
    for(const c of Object.values(next.citiesById).filter(c=>c.kind==='minor'&&c.ownerFactionId===factionId)){
      if(c.governorId)next.officersById[c.governorId].assignment={kind:'NONE',id:null};
      Object.assign(c,{ownerFactionId:null,governorId:null,occupationState:'NORMAL',pendingGovernor:false,occupationRecordId:null});
      for(const choice of Object.values(next.choicesById).filter(ch=>ch.type==='OCCUPATION'&&ch.cityId===c.cityId&&ch.status==='PENDING')){choice.status='CANCELLED';choice.candidateOfficerIds=[];choice.resolvedAtTick=normalized.globalTick;choice.resolutionRecordId=extinctionRecordId;}
    }
    faction.alive=false;faction.rulerId=null;faction.rulerVacancy='EXTINCT';
    extinctionRecordIds.push(extinctionRecordId);generatedRecordIds.push(extinctionRecordId);

    // A faction that no longer exists cannot keep custody. This does not
    // recruit the prisoner or change allegiance; it only closes custody.
    for(const prisonerRecordId of Object.keys(next.prisonersById).sort().filter(prisonerRecordId=>{
      const prisoner=next.prisonersById[prisonerRecordId];
      return prisoner.captorFactionId===factionId&&prisoner.disposition==='HELD';
    })){
      const prisoner=next.prisonersById[prisonerRecordId],officer=next.officersById[prisoner.officerId],releaseRecordId=ids.prisonerReleaseRecordId(prisonerRecordId);
      addRecord(next,record({
        recordId:releaseRecordId,globalTick:normalized.globalTick,type:'PRISONER_LEDGER',causeRecordIds:[extinctionRecordId],
        refs:{factionIds:[prisoner.homeFactionId,factionId],officerIds:[prisoner.officerId],prisonerRecordIds:[prisonerRecordId]},
        details:{...batchCommon,projectionStage:'EXTINCTION_PRISONER_RELEASE',disposition:'RELEASED',automaticRecruitment:false,allegianceChanged:false},
      }));
      prisoner.disposition='RELEASED';prisoner.closedAtTick=normalized.globalTick;prisoner.closureRecordId=releaseRecordId;
      officer.captivityState='FREE';officer.captorFactionId=null;
      generatedRecordIds.push(releaseRecordId);
    }

    for(const armyId of next.armyOrder.filter(armyId=>next.armiesById[armyId].factionId===factionId&&next.armiesById[armyId].disposition==='ACTIVE')){
      const army=next.armiesById[armyId],disbandRecordId=ids.disbandRecordId(armyId),commander=next.officersById[army.commanderId];
      addRecord(next,record({recordId:disbandRecordId,globalTick:normalized.globalTick,type:'ARMY_DISPOSITION',causeRecordIds:[extinctionRecordId],refs:{factionIds:[factionId],armyIds:[armyId],officerIds:[army.commanderId]},details:{...batchCommon,projectionStage:'EXTINCTION_DISBAND',disposition:'DISBANDED',automaticTransferToWinner:false}}));
      army.disposition='DISBANDED';army.terminalAtTick=normalized.globalTick;army.terminalRecordId=disbandRecordId;
      if(commander.assignment.kind==='ARMY'&&commander.assignment.id===armyId)commander.assignment={kind:'NONE',id:null};
      disbandedArmyIds.push(armyId);generatedRecordIds.push(disbandRecordId);
    }
  }

  const aliveFactionIds=next.factionOrder.filter(factionId=>next.factionsById[factionId].alive),playerDefeated=!next.factionsById[next.playerFactionId].alive;
  const unificationWinner=aliveFactionIds.length===1&&next.cityOrder.filter(id=>next.citiesById[id].kind!=='minor').length===unificationMajorCities&&next.cityOrder.filter(id=>next.citiesById[id].kind!=='minor').every(cityId=>next.citiesById[cityId].ownerFactionId===aliveFactionIds[0])?aliveFactionIds[0]:null;
  const resultType=deferResult?null:playerDefeated?'PLAYER_DEFEAT':unificationWinner?'UNIFICATION':null;
  const winnerFactionId=resultType==='UNIFICATION'?unificationWinner:resultType==='PLAYER_DEFEAT'&&aliveFactionIds.length===1?aliveFactionIds[0]:null;
  const terminalRecordId=resultType?ids.terminalRecordId:null,reportId=resultType?ids.reportId:null;
  const allGeneratedRecordIds=[...generatedRecordIds,...(terminalRecordId?[terminalRecordId]:[])].sort();
  const manifest={recordIds:allGeneratedRecordIds,choiceIds:[...generatedChoiceIds].sort(),prisonerRecordIds:[...generatedPrisonerRecordIds].sort(),extinctFactionIds,disbandedArmyIds:[...disbandedArmyIds].sort(),resultType,winnerFactionId,terminalRecordId,reportId};
  const anchorRecordId=[...generatedRecordIds].sort()[0];
  if(settleTurnEnd&&!anchorRecordId)return clone(state);
  invariant(anchorRecordId,'TERMINAL_BATCH_ANCHOR_REQUIRED');
  next.recordsById[anchorRecordId].details.batchSettlementRole='ANCHOR';
  next.recordsById[anchorRecordId].details.batchProjectionInput=projectionInput(normalized);
  next.recordsById[anchorRecordId].details.batchManifest=clone(manifest);
  sortIndexes(next);
  validateCampaignTerminalState(next,{allowCitylessAlive:deferExtinction||policySurvival,allowSupersededOccupation:allowRecapture,allowUngovernedNormal});
  if(!resultType)return next;
  return finalizeCampaignTerminalState(next,{
    recordId:terminalRecordId,reportId,globalTick:normalized.globalTick,type:resultType,winnerFactionId,
    reasonCode:resultType==='UNIFICATION'?'ONLY_INDEPENDENT_FACTION_OWNS_ALL_THREE_MAJOR_CITIES':'PLAYER_FACTION_HAS_ZERO_MAJOR_CITIES',
    causeRecordIds:extinctionRecordIds,
  },{allowSupersededOccupation:allowRecapture});
}

export const CAMPAIGN_TERMINAL_BATCH_SETTLEMENT_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_BATCH_SETTLEMENT_VERSION=VERSION;
