const FORMAT='sangoku-campaign-terminal-state';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const RECORD_TYPES=new Set([
  'ARMY_DISPOSITION','OFFICER_CAPTIVITY','OFFICER_LIFE','FACTION_RULER',
  'CITY_OCCUPATION','PRISONER_LEDGER','SUCCESSION_CHOICE','OCCUPATION_CHOICE',
  'FACTION_EXTINCTION','TERMINAL_RESULT',
]);
const ARMY_DISPOSITIONS=new Set(['ACTIVE','DEFEATED','DISBANDED']);
const LIFE_STATES=new Set(['ALIVE','DEAD']);
const CAPTIVITY_STATES=new Set(['FREE','PRISONER']);
const RULER_VACANCIES=new Set(['NONE','PENDING_SUCCESSION','VACANT_ONE_TURN','EXTINCT']);
const OCCUPATION_STATES=new Set(['NORMAL','TEMPORARY_OCCUPATION']);
const CHOICE_TYPES=new Set(['SUCCESSION','OCCUPATION']);
const CHOICE_STATUSES=new Set(['PENDING','RESOLVED','CANCELLED']);
const PRISONER_DISPOSITIONS=new Set(['HELD','RELEASED','DECEASED']);
const RESULT_TYPES=new Set(['UNIFICATION','PLAYER_DEFEAT']);
const REF_KEYS=Object.freeze(['factionIds','armyIds','officerIds','cityIds','choiceIds','prisonerRecordIds']);
const RULES=Object.freeze({
  contractBoundary:'WORK_TRIAL',
  adjudication:'EXTERNAL_CONFIRMED_RESULTS_ONLY',
  armyOfficerCardinality:'ONE_OFFICER_PER_ARMY',
  duelSystem:'EXCLUDED',
  armyRetention:'TOMBSTONE_NEVER_DELETE',
});

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=240&&/^[A-Za-z0-9._,:-]+$/.test(value);
const unique=values=>new Set(values).size===values.length;
const own=(value,key)=>Object.hasOwn(value,key);
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
function jsonSafe(value,path='value'){
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){invariant(Number.isFinite(value),`NON_FINITE_JSON_VALUE:${path}`);return;}
  if(Array.isArray(value)){value.forEach((entry,index)=>jsonSafe(entry,`${path}[${index}]`));return;}
  invariant(object(value),`NON_JSON_VALUE:${path}`);
  for(const[key,entry]of Object.entries(value)){invariant(entry!==undefined,`UNDEFINED_JSON_VALUE:${path}.${key}`);jsonSafe(entry,`${path}.${key}`);}
}
function exactKeys(value,keys,message){invariant(object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort()),message);}
function sortedUniqueIds(values,label){
  invariant(Array.isArray(values)&&values.every(id)&&unique(values),`INVALID_${label}_IDS`);
  return [...values].sort();
}
function sameIds(actual,expected){return stable([...actual].sort())===stable([...expected].sort());}
function indexed(records,key,label,sorter=(a,b)=>a[key].localeCompare(b[key])){
  invariant(Array.isArray(records),`${label}_ARRAY_REQUIRED`);
  const seen=new Set();
  for(const record of records){invariant(object(record)&&id(record[key]),`INVALID_${label}_ID`);invariant(!seen.has(record[key]),`DUPLICATE_${label}_ID:${record[key]}`);seen.add(record[key]);}
  const ordered=records.map(clone).sort(sorter);
  return {byId:Object.fromEntries(ordered.map(record=>[record[key],record])),order:ordered.map(record=>record[key])};
}
function normalizeRefs(refs={}){
  invariant(object(refs),'INVALID_TERMINAL_RECORD_REFS');
  return Object.fromEntries(REF_KEYS.map(key=>[key,sortedUniqueIds(refs[key]??[],`RECORD_${key}`)]));
}
function normalizeRecord(record){
  invariant(object(record)&&id(record.recordId),'INVALID_TERMINAL_RECORD_ID');
  invariant(integer(record.globalTick),'INVALID_TERMINAL_RECORD_TICK');
  invariant(RECORD_TYPES.has(record.type),`INVALID_TERMINAL_RECORD_TYPE:${record.recordId}`);
  const details=clone(record.details??{});invariant(object(details),'INVALID_TERMINAL_RECORD_DETAILS');jsonSafe(details,'record.details');
  return {recordId:record.recordId,globalTick:record.globalTick,type:record.type,causeRecordIds:sortedUniqueIds(record.causeRecordIds??[],'CAUSE_RECORD'),refs:normalizeRefs(record.refs),details};
}
function normalizeFaction(record){
  invariant(object(record)&&id(record.factionId),'INVALID_TERMINAL_FACTION_ID');
  return {factionId:record.factionId,alive:record.alive,rulerId:record.rulerId??null,rulerVacancy:record.rulerVacancy??(record.rulerId?'NONE':'VACANT_ONE_TURN')};
}
function normalizeArmy(record){
  invariant(object(record)&&id(record.armyId),'INVALID_TERMINAL_ARMY_ID');
  return {armyId:record.armyId,factionId:record.factionId,commanderId:record.commanderId,disposition:record.disposition,terminalAtTick:record.terminalAtTick??null,terminalRecordId:record.terminalRecordId??null};
}
function normalizeOfficer(record){
  invariant(object(record)&&id(record.officerId),'INVALID_TERMINAL_OFFICER_ID');
  const assignment=record.assignment??{kind:'NONE',id:null};
  return {officerId:record.officerId,allegianceFactionId:record.allegianceFactionId,lifeState:record.lifeState,captivityState:record.captivityState,captorFactionId:record.captorFactionId??null,assignment:clone(assignment)};
}
function normalizeCity(record){
  invariant(object(record)&&id(record.cityId),'INVALID_TERMINAL_CITY_ID');
  const governorId=record.governorId??null;
  return {cityId:record.cityId,...(record.kind?{kind:record.kind}:{}),ownerFactionId:record.ownerFactionId,governorId,occupationState:record.occupationState??'NORMAL',pendingGovernor:record.pendingGovernor??governorId===null,occupationRecordId:record.occupationRecordId??null};
}
function normalizeChoice(record){
  invariant(object(record)&&id(record.choiceId),'INVALID_TERMINAL_CHOICE_ID');
  return {choiceId:record.choiceId,type:record.type,factionId:record.factionId,cityId:record.cityId??null,candidateOfficerIds:sortedUniqueIds(record.candidateOfficerIds??[],'CHOICE_CANDIDATE'),status:record.status??'PENDING',createdAtTick:record.createdAtTick,causeRecordId:record.causeRecordId,resolvedAtTick:record.resolvedAtTick??null,resolutionRecordId:record.resolutionRecordId??null};
}
function normalizePrisoner(record){
  invariant(object(record)&&id(record.prisonerRecordId),'INVALID_PRISONER_RECORD_ID');
  return {prisonerRecordId:record.prisonerRecordId,officerId:record.officerId,homeFactionId:record.homeFactionId,captorFactionId:record.captorFactionId,capturedAtTick:record.capturedAtTick,captureRecordId:record.captureRecordId,disposition:record.disposition??'HELD',closedAtTick:record.closedAtTick??null,closureRecordId:record.closureRecordId??null};
}
function orderById(state,byIdKey,orderKey,idKey,label){
  const byId=state[byIdKey],order=state[orderKey];
  invariant(object(byId)&&Array.isArray(order)&&unique(order),`INVALID_${label}_COLLECTION`);
  invariant(sameIds(order,Object.keys(byId)),`${label}_ORDER_MISMATCH`);
  for(const recordId of order)invariant(id(recordId)&&byId[recordId]?.[idKey]===recordId,`INVALID_${label}_ORDER_ID:${recordId}`);
  invariant(stable(order)===stable([...order].sort()),`${label}_ORDER_NOT_STABLE`);
}
function orderByTickAndId(state,byIdKey,orderKey,idKey,tickKey,label){
  const byId=state[byIdKey],order=state[orderKey];
  invariant(object(byId)&&Array.isArray(order)&&unique(order),`INVALID_${label}_COLLECTION`);
  invariant(sameIds(order,Object.keys(byId)),`${label}_ORDER_MISMATCH`);
  for(const recordId of order)invariant(id(recordId)&&byId[recordId]?.[idKey]===recordId,`INVALID_${label}_ORDER_ID:${recordId}`);
  const expected=[...order].sort((a,b)=>byId[a][tickKey]-byId[b][tickKey]||a.localeCompare(b));
  invariant(stable(order)===stable(expected),`${label}_ORDER_NOT_STABLE`);
}
function validateRecord(record,state,seen){
  exactKeys(record,['recordId','globalTick','type','causeRecordIds','refs','details'],`INVALID_TERMINAL_RECORD_SHAPE:${record?.recordId}`);
  invariant(id(record.recordId)&&integer(record.globalTick)&&record.globalTick<=state.globalTick&&RECORD_TYPES.has(record.type),`INVALID_TERMINAL_RECORD:${record.recordId}`);
  invariant(Array.isArray(record.causeRecordIds)&&record.causeRecordIds.every(id)&&unique(record.causeRecordIds),`INVALID_TERMINAL_CAUSES:${record.recordId}`);
  for(const causeRecordId of record.causeRecordIds)invariant(seen.has(causeRecordId),`UNKNOWN_OR_FORWARD_TERMINAL_CAUSE:${record.recordId}:${causeRecordId}`);
  exactKeys(record.refs,REF_KEYS,`INVALID_TERMINAL_REFS_SHAPE:${record.recordId}`);
  const collections={factionIds:'factionsById',armyIds:'armiesById',officerIds:'officersById',cityIds:'citiesById',choiceIds:'choicesById',prisonerRecordIds:'prisonersById'};
  for(const refKey of REF_KEYS){
    const values=record.refs[refKey];invariant(Array.isArray(values)&&values.every(id)&&unique(values)&&stable(values)===stable([...values].sort()),`INVALID_OR_UNSTABLE_TERMINAL_REFS:${record.recordId}:${refKey}`);
    for(const refId of values)invariant(own(state[collections[refKey]],refId),`UNKNOWN_TERMINAL_REF:${record.recordId}:${refKey}:${refId}`);
  }
  invariant(object(record.details),`INVALID_TERMINAL_RECORD_DETAILS:${record.recordId}`);jsonSafe(record.details,`record.${record.recordId}.details`);
}
function currentSnapshot(state,result){
  return {
    reportId:result.reportId,
    format:FORMAT,
    version:VERSION,
    resultType:result.type,
    reasonCode:result.reasonCode,
    finalGlobalTick:result.terminalAtTick,
    terminalRecordId:result.terminalRecordId,
    causeRecordIds:[...result.causeRecordIds],
    factionSnapshots:state.factionOrder.map(factionId=>{
      const faction=state.factionsById[factionId];
      return {
        factionId,alive:faction.alive,rulerId:faction.rulerId,
        ownedCityIds:state.cityOrder.filter(cityId=>state.citiesById[cityId].ownerFactionId===factionId),
        officerIds:state.officerOrder.filter(officerId=>state.officersById[officerId].allegianceFactionId===factionId),
        heldPrisonerOfficerIds:state.prisonerOrder.filter(recordId=>state.prisonersById[recordId].captorFactionId===factionId&&state.prisonersById[recordId].disposition==='HELD').map(recordId=>state.prisonersById[recordId].officerId).sort(),
        armyTombstoneIds:state.armyOrder.filter(armyId=>state.armiesById[armyId].factionId===factionId&&state.armiesById[armyId].disposition!=='ACTIVE'),
      };
    }),
    pendingChoiceIds:state.choiceOrder.filter(choiceId=>state.choicesById[choiceId].status==='PENDING'),
    recordIds:[...state.recordOrder],
  };
}

export function validateCampaignTerminalState(state,{allowCitylessAlive=false,allowSupersededOccupation=false,allowUngovernedNormal=false}={}){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_CAMPAIGN_TERMINAL_FORMAT');
  exactKeys(state,['format','version','contractStatus','campaignId','globalTick','playerFactionId','rules','factionsById','factionOrder','armiesById','armyOrder','officersById','officerOrder','citiesById','cityOrder','choicesById','choiceOrder','prisonersById','prisonerOrder','recordsById','recordOrder','gameResult','terminalReport'],'INVALID_CAMPAIGN_TERMINAL_STATE_SHAPE');
  invariant(state.contractStatus==='WORK_TRIAL'&&id(state.campaignId)&&integer(state.globalTick),'INVALID_CAMPAIGN_TERMINAL_CORE');
  invariant(stable(state.rules)===stable(RULES),'CAMPAIGN_TERMINAL_RULES_MISMATCH');
  orderById(state,'factionsById','factionOrder','factionId','FACTION');
  orderById(state,'armiesById','armyOrder','armyId','ARMY');
  orderById(state,'officersById','officerOrder','officerId','OFFICER');
  orderById(state,'citiesById','cityOrder','cityId','CITY');
  orderByTickAndId(state,'choicesById','choiceOrder','choiceId','createdAtTick','CHOICE');
  orderByTickAndId(state,'prisonersById','prisonerOrder','prisonerRecordId','capturedAtTick','PRISONER');
  orderByTickAndId(state,'recordsById','recordOrder','recordId','globalTick','RECORD');
  invariant(state.factionOrder.length>0&&state.cityOrder.length>0,'CAMPAIGN_TERMINAL_REQUIRES_FACTIONS_AND_CITIES');
  invariant(id(state.playerFactionId)&&own(state.factionsById,state.playerFactionId),'INVALID_TERMINAL_PLAYER_FACTION');

  const pendingSuccession=new Map(),pendingOccupation=new Map();
  for(const choiceId of state.choiceOrder){
    const choice=state.choicesById[choiceId];
    exactKeys(choice,['choiceId','type','factionId','cityId','candidateOfficerIds','status','createdAtTick','causeRecordId','resolvedAtTick','resolutionRecordId'],`INVALID_CHOICE_SHAPE:${choiceId}`);
    invariant(CHOICE_TYPES.has(choice.type)&&own(state.factionsById,choice.factionId)&&integer(choice.createdAtTick)&&choice.createdAtTick<=state.globalTick&&id(choice.causeRecordId)&&own(state.recordsById,choice.causeRecordId),`INVALID_CHOICE:${choiceId}`);
    invariant(Array.isArray(choice.candidateOfficerIds)&&choice.candidateOfficerIds.every(id)&&unique(choice.candidateOfficerIds)&&stable(choice.candidateOfficerIds)===stable([...choice.candidateOfficerIds].sort()),`INVALID_CHOICE_CANDIDATES:${choiceId}`);
    for(const officerId of choice.candidateOfficerIds){const officer=state.officersById[officerId];invariant(officer&&officer.allegianceFactionId===choice.factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE',`INVALID_CHOICE_CANDIDATE:${choiceId}:${officerId}`);}
    invariant(CHOICE_STATUSES.has(choice.status),`INVALID_CHOICE_STATUS:${choiceId}`);
    if(choice.status==='PENDING')invariant(choice.resolvedAtTick===null&&choice.resolutionRecordId===null,`PENDING_CHOICE_HAS_RESOLUTION:${choiceId}`);
    else invariant(integer(choice.resolvedAtTick)&&choice.resolvedAtTick>=choice.createdAtTick&&choice.resolvedAtTick<=state.globalTick&&id(choice.resolutionRecordId)&&own(state.recordsById,choice.resolutionRecordId),`CLOSED_CHOICE_MISSING_RESOLUTION:${choiceId}`);
    if(choice.type==='SUCCESSION'){
      invariant(choice.cityId===null,`SUCCESSION_CHOICE_HAS_CITY:${choiceId}`);
      if(choice.status==='PENDING'){invariant(!pendingSuccession.has(choice.factionId),`DUPLICATE_PENDING_SUCCESSION:${choice.factionId}`);pendingSuccession.set(choice.factionId,choice);}
    }else{
      const replacement=state.recordsById[choice.resolutionRecordId];
      const superseded=allowSupersededOccupation&&choice.status==='CANCELLED'&&replacement?.type==='CITY_OCCUPATION'&&replacement.refs.cityIds.includes(choice.cityId)&&replacement.details.formerOwnerFactionId===choice.factionId;
      const historicalResolved=allowSupersededOccupation&&choice.status==='RESOLVED'&&state.recordOrder.some(id=>{const r=state.recordsById[id];return r.type==='CITY_OCCUPATION'&&r.globalTick>=choice.resolvedAtTick&&r.refs.cityIds.includes(choice.cityId)&&r.details.formerOwnerFactionId===choice.factionId;});
      // Extinction releases minor castles to neutral. A later neutral capture
      // must preserve the resolved choice from before that release.
      const historicalExtinction=allowSupersededOccupation&&choice.status==='RESOLVED'&&state.citiesById[choice.cityId]?.kind==='minor'&&!state.factionsById[choice.factionId]?.alive&&state.recordOrder.some(id=>{const r=state.recordsById[id];return r.type==='FACTION_EXTINCTION'&&r.globalTick>=choice.resolvedAtTick&&r.refs.factionIds.includes(choice.factionId)&&r.details.zeroMajorCities===true;});
      invariant(id(choice.cityId)&&own(state.citiesById,choice.cityId)&&(state.citiesById[choice.cityId].ownerFactionId===choice.factionId||superseded||historicalResolved||historicalExtinction||(allowSupersededOccupation&&choice.status!=='PENDING'&&state.citiesById[choice.cityId].kind==='minor'&&state.citiesById[choice.cityId].ownerFactionId===null&&!state.factionsById[choice.factionId].alive)),`INVALID_OCCUPATION_CHOICE_CITY:${choiceId}`);
      if(choice.status==='PENDING'){invariant(!pendingOccupation.has(choice.cityId),`DUPLICATE_PENDING_OCCUPATION:${choice.cityId}`);pendingOccupation.set(choice.cityId,choice);}
    }
  }

  const commanderUse=new Set(),governorUse=new Set();
  for(const officerId of state.officerOrder){
    const officer=state.officersById[officerId];
    exactKeys(officer,['officerId','allegianceFactionId','lifeState','captivityState','captorFactionId','assignment'],`INVALID_OFFICER_SHAPE:${officerId}`);
    invariant(own(state.factionsById,officer.allegianceFactionId)&&LIFE_STATES.has(officer.lifeState)&&CAPTIVITY_STATES.has(officer.captivityState),`INVALID_OFFICER_PROJECTION:${officerId}`);
    exactKeys(officer.assignment,['kind','id'],`INVALID_OFFICER_ASSIGNMENT_SHAPE:${officerId}`);
    invariant(['NONE','ARMY','CITY'].includes(officer.assignment.kind),`INVALID_OFFICER_ASSIGNMENT:${officerId}`);
    if(officer.assignment.kind==='NONE')invariant(officer.assignment.id===null,`NONE_ASSIGNMENT_HAS_ID:${officerId}`);
    else invariant(id(officer.assignment.id),`ASSIGNMENT_ID_REQUIRED:${officerId}`);
    if(officer.lifeState==='DEAD')invariant(officer.captivityState==='FREE'&&officer.captorFactionId===null&&officer.assignment.kind==='NONE',`DEAD_OFFICER_ACTIVE_STATE:${officerId}`);
    if(officer.captivityState==='PRISONER')invariant(officer.lifeState==='ALIVE'&&id(officer.captorFactionId)&&own(state.factionsById,officer.captorFactionId)&&officer.captorFactionId!==officer.allegianceFactionId&&officer.assignment.kind==='NONE',`INVALID_PRISONER_OFFICER:${officerId}`);
    else invariant(officer.captorFactionId===null,`FREE_OFFICER_HAS_CAPTOR:${officerId}`);
  }
  for(const armyId of state.armyOrder){
    const army=state.armiesById[armyId];
    exactKeys(army,['armyId','factionId','commanderId','disposition','terminalAtTick','terminalRecordId'],`INVALID_ARMY_SHAPE:${armyId}`);
    invariant(own(state.factionsById,army.factionId)&&own(state.officersById,army.commanderId)&&ARMY_DISPOSITIONS.has(army.disposition),`INVALID_ARMY_PROJECTION:${armyId}`);
    invariant(state.officersById[army.commanderId].allegianceFactionId===army.factionId||(army.disposition!=='ACTIVE'&&state.prisonerOrder.some(id=>{const p=state.prisonersById[id];return p.officerId===army.commanderId&&p.disposition==='RELEASED'&&p.captorFactionId===state.officersById[army.commanderId].allegianceFactionId&&state.recordsById[p.closureRecordId]?.details.disposition==='RECRUITED';})),`ARMY_COMMANDER_FACTION_MISMATCH:${armyId}`);
    if(army.disposition==='ACTIVE'){
      invariant(army.terminalAtTick===null&&army.terminalRecordId===null&&state.factionsById[army.factionId].alive,`INVALID_ACTIVE_ARMY_TERMINAL:${armyId}`);
      const officer=state.officersById[army.commanderId];invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.assignment.kind==='ARMY'&&officer.assignment.id===armyId,`ACTIVE_ARMY_COMMANDER_UNAVAILABLE:${armyId}`);
      invariant(!commanderUse.has(army.commanderId),`OFFICER_COMMANDS_MULTIPLE_ARMIES:${army.commanderId}`);commanderUse.add(army.commanderId);
    }else{
      invariant(integer(army.terminalAtTick)&&army.terminalAtTick<=state.globalTick&&id(army.terminalRecordId)&&own(state.recordsById,army.terminalRecordId),`ARMY_TOMBSTONE_MISSING_RECORD:${armyId}`);
      const record=state.recordsById[army.terminalRecordId];invariant(record.type==='ARMY_DISPOSITION'&&record.refs.armyIds.includes(armyId),`ARMY_TOMBSTONE_RECORD_MISMATCH:${armyId}`);
      invariant(!(state.officersById[army.commanderId].assignment.kind==='ARMY'&&state.officersById[army.commanderId].assignment.id===armyId),`TOMBSTONE_ARMY_STILL_ASSIGNED:${armyId}`);
    }
  }
  for(const cityId of state.cityOrder){
    const city=state.citiesById[cityId];
    exactKeys(city,['cityId','ownerFactionId','governorId','occupationState','pendingGovernor','occupationRecordId',...(city.kind?['kind']:[])],`INVALID_CITY_SHAPE:${cityId}`);
    invariant(city.kind===undefined||['major','minor'].includes(city.kind),`INVALID_CITY_KIND:${cityId}`);
    invariant((own(state.factionsById,city.ownerFactionId)||(city.kind==='minor'&&city.ownerFactionId===null&&city.governorId===null&&city.occupationState==='NORMAL'&&!city.pendingGovernor))&&OCCUPATION_STATES.has(city.occupationState)&&typeof city.pendingGovernor==='boolean',`INVALID_CITY_PROJECTION:${cityId}`);
    if(city.governorId===null)invariant(city.kind==='minor'&&city.ownerFactionId===null||city.pendingGovernor===true||(allowUngovernedNormal&&city.occupationState==='NORMAL'),`UNGOVERNED_CITY_NOT_PENDING:${cityId}`);
    else{
      const officer=state.officersById[city.governorId];invariant(officer&&officer.allegianceFactionId===city.ownerFactionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.assignment.kind==='CITY'&&officer.assignment.id===cityId&&!city.pendingGovernor,`INVALID_CITY_GOVERNOR:${cityId}`);
      invariant(!governorUse.has(city.governorId),`OFFICER_GOVERNS_MULTIPLE_CITIES:${city.governorId}`);governorUse.add(city.governorId);
    }
    if(city.occupationState==='TEMPORARY_OCCUPATION'){
      invariant(city.governorId===null&&city.pendingGovernor&&id(city.occupationRecordId)&&own(state.recordsById,city.occupationRecordId),`INVALID_TEMPORARY_OCCUPATION:${cityId}`);
      const record=state.recordsById[city.occupationRecordId];invariant(record.type==='CITY_OCCUPATION'&&record.refs.cityIds.includes(cityId),`OCCUPATION_RECORD_MISMATCH:${cityId}`);
      invariant(pendingOccupation.has(cityId),`TEMPORARY_OCCUPATION_CHOICE_REQUIRED:${cityId}`);
    }else{
      invariant(city.occupationRecordId===null&&!pendingOccupation.has(cityId),`NORMAL_CITY_HAS_OCCUPATION_PENDING:${cityId}`);
      invariant((city.governorId!==null||allowUngovernedNormal)&&!city.pendingGovernor,`NORMAL_CITY_REQUIRES_GOVERNOR:${cityId}`);
    }
  }
  for(const officerId of state.officerOrder){
    const assignment=state.officersById[officerId].assignment;
    if(assignment.kind==='ARMY')invariant(own(state.armiesById,assignment.id)&&state.armiesById[assignment.id].disposition==='ACTIVE'&&state.armiesById[assignment.id].commanderId===officerId,`ORPHAN_ARMY_ASSIGNMENT:${officerId}`);
    if(assignment.kind==='CITY')invariant(own(state.citiesById,assignment.id)&&state.citiesById[assignment.id].governorId===officerId,`ORPHAN_CITY_ASSIGNMENT:${officerId}`);
  }

  const heldByOfficer=new Map();
  for(const prisonerRecordId of state.prisonerOrder){
    const prisoner=state.prisonersById[prisonerRecordId];
    exactKeys(prisoner,['prisonerRecordId','officerId','homeFactionId','captorFactionId','capturedAtTick','captureRecordId','disposition','closedAtTick','closureRecordId'],`INVALID_PRISONER_SHAPE:${prisonerRecordId}`);
    invariant(own(state.officersById,prisoner.officerId)&&own(state.factionsById,prisoner.homeFactionId)&&own(state.factionsById,prisoner.captorFactionId)&&prisoner.homeFactionId!==prisoner.captorFactionId&&integer(prisoner.capturedAtTick)&&prisoner.capturedAtTick<=state.globalTick&&id(prisoner.captureRecordId)&&own(state.recordsById,prisoner.captureRecordId)&&PRISONER_DISPOSITIONS.has(prisoner.disposition),`INVALID_PRISONER_LEDGER_RECORD:${prisonerRecordId}`);
    invariant(state.recordsById[prisoner.captureRecordId].refs.officerIds.includes(prisoner.officerId),`PRISONER_CAPTURE_RECORD_MISMATCH:${prisonerRecordId}`);
    if(prisoner.disposition==='HELD'){
      invariant(prisoner.closedAtTick===null&&prisoner.closureRecordId===null&&!heldByOfficer.has(prisoner.officerId),`INVALID_HELD_PRISONER:${prisonerRecordId}`);heldByOfficer.set(prisoner.officerId,prisoner);
    }else invariant(integer(prisoner.closedAtTick)&&prisoner.closedAtTick>=prisoner.capturedAtTick&&prisoner.closedAtTick<=state.globalTick&&id(prisoner.closureRecordId)&&own(state.recordsById,prisoner.closureRecordId),`CLOSED_PRISONER_MISSING_RECORD:${prisonerRecordId}`);
  }
  for(const officerId of state.officerOrder){
    const officer=state.officersById[officerId],held=heldByOfficer.get(officerId);
    if(officer.captivityState==='PRISONER')invariant(held&&held.homeFactionId===officer.allegianceFactionId&&held.captorFactionId===officer.captorFactionId,`PRISONER_PROJECTION_LEDGER_MISMATCH:${officerId}`);
    else invariant(!held,`FREE_OFFICER_STILL_HELD:${officerId}`);
  }

  for(const factionId of state.factionOrder){
    const faction=state.factionsById[factionId];
    exactKeys(faction,['factionId','alive','rulerId','rulerVacancy'],`INVALID_FACTION_SHAPE:${factionId}`);
    invariant(typeof faction.alive==='boolean'&&RULER_VACANCIES.has(faction.rulerVacancy),`INVALID_FACTION_PROJECTION:${factionId}`);
    const ownsCity=state.cityOrder.some(cityId=>state.citiesById[cityId].kind!=='minor'&&state.citiesById[cityId].ownerFactionId===factionId);
    invariant(faction.alive===ownsCity||(allowCitylessAlive&&faction.alive&&(state.gameResult===null||factionId==='F02'&&(state.cityOrder.some(id=>state.citiesById[id].ownerFactionId===factionId)||state.armyOrder.some(id=>state.armiesById[id].factionId===factionId&&state.armiesById[id].disposition==='ACTIVE')))),`FACTION_ALIVE_CITY_MISMATCH:${factionId}`);
    const succession=pendingSuccession.get(factionId);
    if(!faction.alive)invariant(faction.rulerId===null&&faction.rulerVacancy==='EXTINCT'&&!succession,`EXTINCT_FACTION_RULER_STATE:${factionId}`);
    else if(faction.rulerId!==null){
      const ruler=state.officersById[faction.rulerId];invariant(ruler&&ruler.allegianceFactionId===factionId&&ruler.lifeState==='ALIVE'&&ruler.captivityState==='FREE'&&ruler.captorFactionId===null&&faction.rulerVacancy==='NONE'&&!succession,`INVALID_ACTIVE_RULER:${factionId}`);
    }else{
      invariant(['PENDING_SUCCESSION','VACANT_ONE_TURN'].includes(faction.rulerVacancy)&&succession,`MISSING_PENDING_SUCCESSION:${factionId}`);
      if(faction.rulerVacancy==='PENDING_SUCCESSION')invariant(succession.candidateOfficerIds.length>0,`SUCCESSION_CANDIDATES_REQUIRED:${factionId}`);
      else invariant(succession.candidateOfficerIds.length===0,`VACANT_TURN_HAS_SUCCESSOR:${factionId}`);
    }
  }

  const seen=new Set();
  for(const recordId of state.recordOrder){validateRecord(state.recordsById[recordId],state,seen);seen.add(recordId);}
  if(state.gameResult===null)invariant(state.terminalReport===null,'TERMINAL_REPORT_WITHOUT_RESULT');
  else{
    const result=state.gameResult;
    exactKeys(result,['type','terminalAtTick','winnerFactionId','loserFactionIds','terminalRecordId','reportId','reasonCode','causeRecordIds'],'INVALID_GAME_RESULT_SHAPE');
    invariant(RESULT_TYPES.has(result.type)&&integer(result.terminalAtTick)&&result.terminalAtTick<=state.globalTick&&id(result.terminalRecordId)&&own(state.recordsById,result.terminalRecordId)&&state.recordsById[result.terminalRecordId].type==='TERMINAL_RESULT'&&id(result.reportId)&&id(result.reasonCode),`INVALID_GAME_RESULT`);
    invariant(Array.isArray(result.loserFactionIds)&&result.loserFactionIds.every(factionId=>own(state.factionsById,factionId))&&unique(result.loserFactionIds)&&stable(result.loserFactionIds)===stable([...result.loserFactionIds].sort()),'INVALID_GAME_RESULT_LOSERS');
    invariant(Array.isArray(result.causeRecordIds)&&result.causeRecordIds.every(recordId=>own(state.recordsById,recordId))&&unique(result.causeRecordIds)&&stable(result.causeRecordIds)===stable([...result.causeRecordIds].sort()),'INVALID_GAME_RESULT_CAUSES');
    const dead=state.factionOrder.filter(factionId=>!state.factionsById[factionId].alive);
    invariant(sameIds(result.loserFactionIds,dead),'GAME_RESULT_LOSERS_MISMATCH');
    if(result.type==='UNIFICATION'){
      invariant(id(result.winnerFactionId)&&own(state.factionsById,result.winnerFactionId)&&state.factionsById[result.winnerFactionId].alive,'INVALID_UNIFICATION_WINNER');
      invariant(state.factionOrder.every(factionId=>factionId===result.winnerFactionId||!state.factionsById[factionId].alive||allowCitylessAlive&&factionId==='F02'),'UNIFICATION_HAS_OTHER_LIVING_FACTION');
      invariant(state.cityOrder.filter(cityId=>state.citiesById[cityId].kind!=='minor').every(cityId=>state.citiesById[cityId].ownerFactionId===result.winnerFactionId),'UNIFICATION_WITH_UNOWNED_MAJOR_CITY');
    }else{
      invariant(!state.factionsById[state.playerFactionId].alive&&result.loserFactionIds.includes(state.playerFactionId),'PLAYER_DEFEAT_REQUIRES_PLAYER_EXTINCTION');
      invariant(result.winnerFactionId===null||(own(state.factionsById,result.winnerFactionId)&&state.factionsById[result.winnerFactionId].alive&&result.winnerFactionId!==state.playerFactionId),'INVALID_PLAYER_DEFEAT_WINNER');
    }
    invariant(object(state.terminalReport)&&stable(state.terminalReport)===stable(currentSnapshot(state,result)),'TERMINAL_REPORT_SNAPSHOT_MISMATCH');
  }
  return state;
}

export function createCampaignTerminalState({campaignId,globalTick=0,playerFactionId,factions,armies=[],officers,cities,choices=[],prisoners=[],records=[]}={},options={}){
  invariant(id(campaignId)&&integer(globalTick),'INVALID_CAMPAIGN_TERMINAL_CREATE_INPUT');
  const normalizedRecords=records.map(normalizeRecord),recordIndex=indexed(normalizedRecords,'recordId','RECORD',(a,b)=>a.globalTick-b.globalTick||a.recordId.localeCompare(b.recordId));
  const factionIndex=indexed(factions.map(normalizeFaction),'factionId','FACTION');
  const armyIndex=indexed(armies.map(normalizeArmy),'armyId','ARMY');
  const officerIndex=indexed(officers.map(normalizeOfficer),'officerId','OFFICER');
  const cityIndex=indexed(cities.map(normalizeCity),'cityId','CITY');
  const choiceIndex=indexed(choices.map(normalizeChoice),'choiceId','CHOICE',(a,b)=>a.createdAtTick-b.createdAtTick||a.choiceId.localeCompare(b.choiceId));
  const prisonerIndex=indexed(prisoners.map(normalizePrisoner),'prisonerRecordId','PRISONER',(a,b)=>a.capturedAtTick-b.capturedAtTick||a.prisonerRecordId.localeCompare(b.prisonerRecordId));
  const state={format:FORMAT,version:VERSION,contractStatus:'WORK_TRIAL',campaignId,globalTick,playerFactionId,rules:clone(RULES),factionsById:factionIndex.byId,factionOrder:factionIndex.order,armiesById:armyIndex.byId,armyOrder:armyIndex.order,officersById:officerIndex.byId,officerOrder:officerIndex.order,citiesById:cityIndex.byId,cityOrder:cityIndex.order,choicesById:choiceIndex.byId,choiceOrder:choiceIndex.order,prisonersById:prisonerIndex.byId,prisonerOrder:prisonerIndex.order,recordsById:recordIndex.byId,recordOrder:recordIndex.order,gameResult:null,terminalReport:null};
  return validateCampaignTerminalState(state,options);
}

export function appendCampaignTerminalRecord(state,record,options={}){
  validateCampaignTerminalState(state,options);const normalized=normalizeRecord(record),existing=state.recordsById[normalized.recordId];
  if(existing){invariant(stable(existing)===stable(normalized),`CONFLICTING_TERMINAL_RECORD:${normalized.recordId}`);return clone(state);}
  const previousId=state.recordOrder.at(-1);
  if(previousId){const previous=state.recordsById[previousId];invariant(normalized.globalTick>previous.globalTick||(normalized.globalTick===previous.globalTick&&normalized.recordId.localeCompare(previous.recordId)>0),`TERMINAL_RECORD_ORDER_REGRESSION:${normalized.recordId}`);}
  for(const causeRecordId of normalized.causeRecordIds)invariant(own(state.recordsById,causeRecordId),`UNKNOWN_TERMINAL_CAUSE:${normalized.recordId}:${causeRecordId}`);
  const next=clone(state);next.recordsById[normalized.recordId]=normalized;next.recordOrder.push(normalized.recordId);next.globalTick=Math.max(next.globalTick,normalized.globalTick);
  return validateCampaignTerminalState(next,options);
}

export function finalizeCampaignTerminalState(state,{recordId,reportId,globalTick,type,winnerFactionId=null,reasonCode,causeRecordIds=[]}={},options={}){
  validateCampaignTerminalState(state,options);invariant(RESULT_TYPES.has(type)&&id(recordId)&&id(reportId)&&integer(globalTick)&&globalTick>=state.globalTick&&id(reasonCode),'INVALID_TERMINAL_FINALIZATION_INPUT');
  const normalizedCauses=sortedUniqueIds(causeRecordIds,'GAME_RESULT_CAUSE');
  if(state.gameResult!==null){
    const expected={type,terminalAtTick:globalTick,winnerFactionId,loserFactionIds:state.factionOrder.filter(factionId=>!state.factionsById[factionId].alive),terminalRecordId:recordId,reportId,reasonCode,causeRecordIds:normalizedCauses};
    invariant(stable(state.gameResult)===stable(expected),`CONFLICTING_TERMINAL_FINALIZATION:${recordId}`);return clone(state);
  }
  const refs={factionIds:[...(winnerFactionId?[winnerFactionId]:[]),...state.factionOrder.filter(factionId=>!state.factionsById[factionId].alive)].sort(),armyIds:[],officerIds:[],cityIds:state.cityOrder,choiceIds:state.choiceOrder.filter(choiceId=>state.choicesById[choiceId].status==='PENDING'),prisonerRecordIds:state.prisonerOrder.filter(prisonerRecordId=>state.prisonersById[prisonerRecordId].disposition==='HELD')};
  let next=appendCampaignTerminalRecord(state,{recordId,globalTick,type:'TERMINAL_RESULT',causeRecordIds:normalizedCauses,refs,details:{resultType:type,reasonCode,winnerFactionId}},options);
  const result={type,terminalAtTick:globalTick,winnerFactionId,loserFactionIds:next.factionOrder.filter(factionId=>!next.factionsById[factionId].alive),terminalRecordId:recordId,reportId,reasonCode,causeRecordIds:normalizedCauses};
  next.gameResult=result;next.terminalReport=currentSnapshot(next,result);
  return validateCampaignTerminalState(next,options);
}

export function serializeCampaignTerminalState(state){validateCampaignTerminalState(state);return JSON.stringify(canonical(state),null,2);}
export function deserializeCampaignTerminalState(serialized){
  invariant(typeof serialized==='string'&&serialized.length>0&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_CAMPAIGN_TERMINAL_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_CAMPAIGN_TERMINAL_JSON');}
  validateCampaignTerminalState(state);return clone(state);
}

export const CAMPAIGN_TERMINAL_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_VERSION=VERSION;
export const CAMPAIGN_TERMINAL_RULES=RULES;
