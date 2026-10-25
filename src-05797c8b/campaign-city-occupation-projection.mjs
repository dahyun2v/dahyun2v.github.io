import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';

const FORMAT='sangoku-campaign-city-occupation-projection';
const VERSION=1;
const INPUT_KEYS=['transactionId','sourceResultId','globalTick','capturedCityId','formerOwnerFactionId','occupierFactionId'];
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
function normalizeInput(input){
  exactKeys(input,INPUT_KEYS,'INVALID_CITY_OCCUPATION_PROJECTION_INPUT_SHAPE');
  invariant(
    id(input.transactionId)&&id(input.sourceResultId)&&integer(input.globalTick)&&id(input.capturedCityId)&&id(input.formerOwnerFactionId)&&id(input.occupierFactionId),
    'INVALID_CITY_OCCUPATION_PROJECTION_INPUT',
  );
  invariant(input.formerOwnerFactionId!==input.occupierFactionId,'CITY_OCCUPATION_REQUIRES_ENEMY_OWNER');
  return clone(input);
}
function prefix(input){return `R9C.${input.globalTick}.${input.transactionId}`;}
function idsFor(input){
  const base=prefix(input);
  return {
    occupationRecordId:`REC.${base}.010.OCCUPATION`,
    occupationChoiceId:`CHOICE.${base}.OCCUPATION`,
  };
}
function projectionInput(input){return {format:FORMAT,version:VERSION,...clone(input)};}
function projectionRecords(state,transactionId){
  return state.recordOrder.map(recordId=>state.recordsById[recordId]).filter(entry=>
    entry.details?.projectionKind==='CONFIRMED_CITY_CAPTURE'&&entry.details?.projectionTransactionId===transactionId,
  );
}
function availableGovernorCandidates(state,factionId){
  return state.officerOrder.filter(officerId=>{
    const officer=state.officersById[officerId];
    return officer.allegianceFactionId===factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.assignment.kind==='NONE';
  }).sort();
}
function formerOwnerLosesLastCity(state,input){
  return state.cityOrder.filter(cityId=>state.citiesById[cityId].ownerFactionId===input.formerOwnerFactionId).length===1;
}
function sortIndexes(next){
  next.recordOrder=Object.keys(next.recordsById).sort((a,b)=>next.recordsById[a].globalTick-next.recordsById[b].globalTick||a.localeCompare(b));
  next.choiceOrder=Object.keys(next.choicesById).sort((a,b)=>next.choicesById[a].createdAtTick-next.choicesById[b].createdAtTick||a.localeCompare(b));
}
function validateReplay(state,input,records){
  invariant(records.length===1,'INCOMPLETE_CITY_OCCUPATION_PROJECTION');
  const occupationRecord=records[0];
  invariant(stable(occupationRecord.details.projectionInput)===stable(projectionInput(input)),`CONFLICTING_CITY_OCCUPATION_PROJECTION:${input.transactionId}`);
  const manifest=occupationRecord.details.manifest;
  exactKeys(manifest,['occupationRecordId','occupationChoiceId','formerGovernorId','governorCandidateOfficerIds','formerOwnerLostLastCity'],'INVALID_CITY_OCCUPATION_PROJECTION_MANIFEST');
  invariant(manifest.occupationRecordId===occupationRecord.recordId&&manifest.formerOwnerLostLastCity===false,'CITY_OCCUPATION_PROJECTION_MANIFEST_MISMATCH');
  const city=state.citiesById[input.capturedCityId],choice=state.choicesById[manifest.occupationChoiceId];
  invariant(
    city?.ownerFactionId===input.occupierFactionId&&city.governorId===null&&city.occupationState==='TEMPORARY_OCCUPATION'&&city.pendingGovernor===true&&city.occupationRecordId===manifest.occupationRecordId,
    'CITY_OCCUPATION_PROJECTION_CITY_MISMATCH',
  );
  invariant(
    choice?.type==='OCCUPATION'&&choice.factionId===input.occupierFactionId&&choice.cityId===input.capturedCityId&&choice.status==='PENDING'&&choice.causeRecordId===manifest.occupationRecordId,
    'CITY_OCCUPATION_PROJECTION_CHOICE_MISMATCH',
  );
  invariant(stable(choice.candidateOfficerIds)===stable(manifest.governorCandidateOfficerIds),'CITY_OCCUPATION_PROJECTION_CANDIDATES_MISMATCH');
  return clone(state);
}

/**
 * Project an externally confirmed major-city capture into the terminal sidecar.
 * Combat, garrison, inventory, prisoners, occupation policy, extinction and
 * victory are deliberately outside this reducer.
 */
export function projectConfirmedCityCapture(state,input){
  validateCampaignTerminalState(state);
  const normalized=normalizeInput(input),existing=projectionRecords(state,normalized.transactionId);
  if(existing.length)return validateReplay(state,normalized,existing);
  invariant(state.gameResult===null,'CITY_OCCUPATION_PROJECTION_AFTER_TERMINAL_RESULT');
  invariant(normalized.globalTick>=state.globalTick,'CITY_OCCUPATION_PROJECTION_TICK_REGRESSION');
  const city=state.citiesById[normalized.capturedCityId];
  invariant(city,'CITY_OCCUPATION_PROJECTION_CITY_NOT_FOUND');
  invariant(city.ownerFactionId===normalized.formerOwnerFactionId,'CITY_OCCUPATION_PROJECTION_STALE_OWNER');
  invariant(city.occupationState==='NORMAL','CITY_OCCUPATION_PROJECTION_CITY_NOT_NORMAL');
  invariant(own(state.factionsById,normalized.occupierFactionId),'CITY_OCCUPATION_PROJECTION_OCCUPIER_NOT_FOUND');
  invariant(state.factionsById[normalized.occupierFactionId].alive,'CITY_OCCUPATION_PROJECTION_OCCUPIER_NOT_ALIVE');

  // The terminal-state validator equates zero owned cities with extinction and
  // also forbids active armies for extinct factions. Gate 3 therefore cannot
  // persist a last-city transfer by itself without performing Gate 4. Such a
  // capture must be submitted in the later same-batch atomic settlement.
  invariant(!formerOwnerLosesLastCity(state,normalized),'CITY_CAPTURE_REQUIRES_GATE4_ATOMIC_EXTINCTION');

  const formerGovernorId=city.governorId;
  invariant(id(formerGovernorId),'CITY_OCCUPATION_PROJECTION_GOVERNOR_REQUIRED');
  const governorCandidateOfficerIds=availableGovernorCandidates(state,normalized.occupierFactionId);
  const manifest={...idsFor(normalized),formerGovernorId,governorCandidateOfficerIds,formerOwnerLostLastCity:false};
  invariant(id(manifest.occupationRecordId)&&id(manifest.occupationChoiceId),'INVALID_CITY_OCCUPATION_PROJECTION_IDS');
  invariant(!own(state.recordsById,manifest.occupationRecordId),`CITY_OCCUPATION_PROJECTION_RECORD_ID_COLLISION:${manifest.occupationRecordId}`);
  invariant(!own(state.choicesById,manifest.occupationChoiceId),`CITY_OCCUPATION_PROJECTION_CHOICE_ID_COLLISION:${manifest.occupationChoiceId}`);

  const next=clone(state);
  const details={
    projectionKind:'CONFIRMED_CITY_CAPTURE',
    projectionTransactionId:normalized.transactionId,
    projectionStage:'TEMPORARY_OCCUPATION',
    sourceResultId:normalized.sourceResultId,
    projectionInput:projectionInput(normalized),
    manifest:clone(manifest),
    formerOwnerFactionId:normalized.formerOwnerFactionId,
    occupierFactionId:normalized.occupierFactionId,
    formerGovernorId,
    formerOwnerLostLastCity:false,
    occupationPolicy:'PENDING_EXTERNAL_CHOICE',
  };
  next.globalTick=normalized.globalTick;
  next.recordsById[manifest.occupationRecordId]={
    recordId:manifest.occupationRecordId,
    globalTick:normalized.globalTick,
    type:'CITY_OCCUPATION',
    causeRecordIds:[],
    refs:refs({
      factionIds:[normalized.formerOwnerFactionId,normalized.occupierFactionId],
      officerIds:[formerGovernorId],
      cityIds:[normalized.capturedCityId],
      choiceIds:[manifest.occupationChoiceId],
    }),
    details,
  };
  next.citiesById[normalized.capturedCityId]={
    ...next.citiesById[normalized.capturedCityId],
    ownerFactionId:normalized.occupierFactionId,
    governorId:null,
    occupationState:'TEMPORARY_OCCUPATION',
    pendingGovernor:true,
    occupationRecordId:manifest.occupationRecordId,
  };
  next.officersById[formerGovernorId].assignment={kind:'NONE',id:null};
  next.choicesById[manifest.occupationChoiceId]={
    choiceId:manifest.occupationChoiceId,
    type:'OCCUPATION',
    factionId:normalized.occupierFactionId,
    cityId:normalized.capturedCityId,
    candidateOfficerIds:governorCandidateOfficerIds,
    status:'PENDING',
    createdAtTick:normalized.globalTick,
    causeRecordId:manifest.occupationRecordId,
    resolvedAtTick:null,
    resolutionRecordId:null,
  };
  sortIndexes(next);
  return validateCampaignTerminalState(next);
}

export const CAMPAIGN_CITY_OCCUPATION_PROJECTION_FORMAT=FORMAT;
export const CAMPAIGN_CITY_OCCUPATION_PROJECTION_VERSION=VERSION;
