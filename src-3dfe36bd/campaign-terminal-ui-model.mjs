const FORMAT='sangoku-campaign-terminal-ui-model';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=1_000_000;
const PUBLIC_FORMAT='sangoku-campaign-terminal-public-view';
const PUBLIC_VERSION=1;
const ARMY_DISPOSITIONS=new Set(['DEFEATED','DISBANDED']);
const CHOICE_TYPES=new Set(['SUCCESSION','OCCUPATION']);
const PRISONER_RELATIONS=new Set(['HOME_OFFICER','CUSTODIAN']);
const PRISONER_DISPOSITIONS=new Set(['HELD','RELEASED','DECEASED']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=240&&/^[A-Za-z0-9._,:-]+$/.test(value);
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

function requirePublicProjection(view){
  invariant(object(view)&&view.format===PUBLIC_FORMAT&&view.version===PUBLIC_VERSION,'TERMINAL_UI_PUBLIC_VIEW_REQUIRED');
  invariant(view.contractStatus==='WORK_TRIAL'&&id(view.campaignId)&&integer(view.globalTick)&&id(view.viewerFactionId),'TERMINAL_UI_PUBLIC_CORE_REQUIRED');
  exactKeys(view.ownFaction,['factionId','alive','rulerId','rulerVacancy'],'TERMINAL_UI_PUBLIC_OWN_FACTION_REQUIRED');
  invariant(view.ownFaction.factionId===view.viewerFactionId&&typeof view.ownFaction.alive==='boolean','TERMINAL_UI_PUBLIC_OWN_FACTION_INVALID');
  for(const field of ['ownArmyOutcomes','ownChoices','knownPrisoners','observedEvents'])invariant(Array.isArray(view[field]),`TERMINAL_UI_PUBLIC_${field.toUpperCase()}_REQUIRED`);
}

function projectArmyOutcomes(view){
  const rows=view.ownArmyOutcomes.map(army=>{
    exactKeys(army,['armyId','commanderId','disposition','terminalAtTick'],'TERMINAL_UI_PUBLIC_ARMY_INVALID');
    invariant(id(army.armyId)&&id(army.commanderId)&&ARMY_DISPOSITIONS.has(army.disposition)&&integer(army.terminalAtTick)&&army.terminalAtTick<=view.globalTick,'TERMINAL_UI_PUBLIC_ARMY_INVALID');
    return {armyId:army.armyId,commanderId:army.commanderId,disposition:army.disposition,terminalAtTick:army.terminalAtTick};
  }).sort((left,right)=>left.armyId.localeCompare(right.armyId));
  invariant(unique(rows.map(row=>row.armyId)),'TERMINAL_UI_DUPLICATE_ARMY');
  return rows;
}

function projectKnownEvents(view){
  const rows=view.observedEvents.map(event=>{
    exactKeys(event,['eventId','globalTick','eventType','summaryCode','factionIds','armyIds','officerIds','cityIds'],'TERMINAL_UI_PUBLIC_EVENT_INVALID');
    invariant(id(event.eventId)&&integer(event.globalTick)&&event.globalTick<=view.globalTick&&id(event.eventType)&&id(event.summaryCode),'TERMINAL_UI_PUBLIC_EVENT_INVALID');
    for(const [label,values] of [['FACTION',event.factionIds],['ARMY',event.armyIds],['OFFICER',event.officerIds],['CITY',event.cityIds]])stableIds(values,`TERMINAL_UI_EVENT_${label}`);
    return {globalTick:event.globalTick,eventType:event.eventType,summaryCode:event.summaryCode,factionIds:[...event.factionIds],armyIds:[...event.armyIds],officerIds:[...event.officerIds],cityIds:[...event.cityIds]};
  }).sort((left,right)=>left.globalTick-right.globalTick||left.summaryCode.localeCompare(right.summaryCode)||stable(left).localeCompare(stable(right)));
  return rows;
}

function projectPendingChoices(view){
  const choices=view.ownChoices.map(choice=>{
    exactKeys(choice,['choiceId','type','cityId','candidateOfficerIds','status','createdAtTick','resolvedAtTick'],'TERMINAL_UI_PUBLIC_CHOICE_INVALID');
    invariant(id(choice.choiceId)&&CHOICE_TYPES.has(choice.type)&&(choice.cityId===null||id(choice.cityId))&&['PENDING','RESOLVED','CANCELLED'].includes(choice.status)&&integer(choice.createdAtTick),'TERMINAL_UI_PUBLIC_CHOICE_INVALID');
    stableIds(choice.candidateOfficerIds,'TERMINAL_UI_CHOICE_CANDIDATE');
    if(choice.type==='SUCCESSION')invariant(choice.cityId===null,'TERMINAL_UI_SUCCESSION_CITY_INVALID');
    else invariant(id(choice.cityId),'TERMINAL_UI_OCCUPATION_CITY_REQUIRED');
    if(choice.status==='PENDING')invariant(choice.resolvedAtTick===null,'TERMINAL_UI_PENDING_CHOICE_RESOLVED');
    else invariant(integer(choice.resolvedAtTick)&&choice.resolvedAtTick>=choice.createdAtTick&&choice.resolvedAtTick<=view.globalTick,'TERMINAL_UI_CLOSED_CHOICE_INVALID');
    return choice;
  });
  const rows=choices.filter(choice=>choice.status==='PENDING').map(choice=>({choiceId:choice.choiceId,type:choice.type,cityId:choice.cityId,candidateOfficerIds:[...choice.candidateOfficerIds],createdAtTick:choice.createdAtTick})).sort((left,right)=>left.createdAtTick-right.createdAtTick||left.choiceId.localeCompare(right.choiceId));
  invariant(unique(rows.map(row=>row.choiceId)),'TERMINAL_UI_DUPLICATE_CHOICE');
  return rows;
}

function projectPrisonerSummary(view){
  const summary={total:0,homeOfficerCount:0,custodyCount:0,heldCount:0,releasedCount:0,deceasedCount:0};
  for(const prisoner of view.knownPrisoners){
    exactKeys(prisoner,['officerId','relation','otherFactionId','disposition','capturedAtTick','closedAtTick'],'TERMINAL_UI_PUBLIC_PRISONER_INVALID');
    invariant(id(prisoner.officerId)&&PRISONER_RELATIONS.has(prisoner.relation)&&id(prisoner.otherFactionId)&&PRISONER_DISPOSITIONS.has(prisoner.disposition)&&integer(prisoner.capturedAtTick),'TERMINAL_UI_PUBLIC_PRISONER_INVALID');
    summary.total++;
    if(prisoner.relation==='HOME_OFFICER')summary.homeOfficerCount++;else summary.custodyCount++;
    if(prisoner.disposition==='HELD')summary.heldCount++;
    else if(prisoner.disposition==='RELEASED')summary.releasedCount++;
    else summary.deceasedCount++;
  }
  return summary;
}

function projectGameResult(view){
  if(view.gameResult===null)return null;
  const result=view.gameResult;
  invariant(object(result)&&id(result.type)&&integer(result.terminalAtTick)&&result.terminalAtTick<=view.globalTick&&(result.winnerFactionId===null||id(result.winnerFactionId))&&id(result.reasonCode),'TERMINAL_UI_PUBLIC_RESULT_INVALID');
  stableIds(result.loserFactionIds,'TERMINAL_UI_RESULT_LOSER');
  return {type:result.type,terminalAtTick:result.terminalAtTick,winnerFactionId:result.winnerFactionId,loserFactionIds:[...result.loserFactionIds],reasonCode:result.reasonCode};
}

function projectTerminalReport(view,result){
  if(result===null){invariant(view.terminalReport===null,'TERMINAL_UI_REPORT_WITHOUT_RESULT');return null;}
  const report=view.terminalReport;
  invariant(object(report)&&report.resultType===result.type&&report.reasonCode===result.reasonCode&&integer(report.finalGlobalTick)&&report.finalGlobalTick===result.terminalAtTick&&Array.isArray(report.factionSnapshots),'TERMINAL_UI_PUBLIC_REPORT_INVALID');
  const factions=report.factionSnapshots.map(snapshot=>{
    invariant(object(snapshot)&&id(snapshot.factionId)&&typeof snapshot.alive==='boolean'&&Array.isArray(snapshot.ownedCityIds),'TERMINAL_UI_PUBLIC_REPORT_FACTION_INVALID');
    stableIds(snapshot.ownedCityIds,'TERMINAL_UI_REPORT_CITY');
    return {factionId:snapshot.factionId,alive:snapshot.alive,ownedCityCount:snapshot.ownedCityIds.length};
  }).sort((left,right)=>left.factionId.localeCompare(right.factionId));
  invariant(unique(factions.map(faction=>faction.factionId)),'TERMINAL_UI_DUPLICATE_REPORT_FACTION');
  return {resultType:report.resultType,reasonCode:report.reasonCode,finalGlobalTick:report.finalGlobalTick,factions};
}

function actionBlocking(view,result,pendingChoices){
  const actionablePendingChoice=pendingChoices.some(choice=>choice.candidateOfficerIds.length>0);
  const reasonCode=result!==null?'CAMPAIGN_ENDED':(!view.ownFaction.alive?'VIEWER_FACTION_EXTINCT':actionablePendingChoice?'TERMINAL_CHOICE_PENDING':null);
  const command={disabled:reasonCode!==null,reasonCode};
  const advance={disabled:reasonCode!==null,reasonCode};
  const choiceReason=result!==null?'CAMPAIGN_ENDED':(pendingChoices.length===0?'NO_PENDING_CHOICE':null);
  return {command,advance,choiceResolution:{disabled:choiceReason!==null,reasonCode:choiceReason}};
}

export function createCampaignTerminalUiModel(publicView){
  requirePublicProjection(publicView);
  const gameResult=projectGameResult(publicView),pendingChoices=projectPendingChoices(publicView);
  const model={
    format:FORMAT,
    version:VERSION,
    contractStatus:publicView.contractStatus,
    campaignId:publicView.campaignId,
    globalTick:publicView.globalTick,
    viewerFactionId:publicView.viewerFactionId,
    ownArmyOutcomes:projectArmyOutcomes(publicView),
    knownEvents:projectKnownEvents(publicView),
    pendingChoices,
    prisonerSummary:projectPrisonerSummary(publicView),
    gameResult,
    terminalReport:projectTerminalReport(publicView,gameResult),
    actionBlocking:actionBlocking(publicView,gameResult,pendingChoices),
  };
  return validateCampaignTerminalUiModel(model);
}

export function validateCampaignTerminalUiModel(model){
  invariant(object(model)&&model.format===FORMAT&&model.version===VERSION,'INVALID_TERMINAL_UI_MODEL_FORMAT');
  exactKeys(model,['format','version','contractStatus','campaignId','globalTick','viewerFactionId','ownArmyOutcomes','knownEvents','pendingChoices','prisonerSummary','gameResult','terminalReport','actionBlocking'],'INVALID_TERMINAL_UI_MODEL_SHAPE');
  invariant(model.contractStatus==='WORK_TRIAL'&&id(model.campaignId)&&integer(model.globalTick)&&id(model.viewerFactionId),'INVALID_TERMINAL_UI_MODEL_CORE');
  invariant(Array.isArray(model.ownArmyOutcomes)&&Array.isArray(model.knownEvents)&&Array.isArray(model.pendingChoices),'INVALID_TERMINAL_UI_MODEL_COLLECTION');
  exactKeys(model.prisonerSummary,['total','homeOfficerCount','custodyCount','heldCount','releasedCount','deceasedCount'],'INVALID_TERMINAL_UI_PRISONER_SUMMARY');
  for(const value of Object.values(model.prisonerSummary))invariant(integer(value),'INVALID_TERMINAL_UI_PRISONER_SUMMARY');
  invariant(model.prisonerSummary.total===model.prisonerSummary.homeOfficerCount+model.prisonerSummary.custodyCount,'INVALID_TERMINAL_UI_PRISONER_RELATION_TOTAL');
  invariant(model.prisonerSummary.total===model.prisonerSummary.heldCount+model.prisonerSummary.releasedCount+model.prisonerSummary.deceasedCount,'INVALID_TERMINAL_UI_PRISONER_DISPOSITION_TOTAL');
  const ended=model.gameResult!==null;
  if(!ended)invariant(model.terminalReport===null,'TERMINAL_UI_REPORT_WITHOUT_RESULT');
  else invariant(object(model.terminalReport)&&model.terminalReport.resultType===model.gameResult.type&&model.terminalReport.reasonCode===model.gameResult.reasonCode&&model.terminalReport.finalGlobalTick===model.gameResult.terminalAtTick,'TERMINAL_UI_RESULT_REPORT_MISMATCH');
  exactKeys(model.actionBlocking,['command','advance','choiceResolution'],'INVALID_TERMINAL_UI_ACTION_BLOCKING');
  for(const action of Object.values(model.actionBlocking)){
    exactKeys(action,['disabled','reasonCode'],'INVALID_TERMINAL_UI_ACTION_BLOCK');
    invariant(typeof action.disabled==='boolean'&&(action.reasonCode===null||id(action.reasonCode)),'INVALID_TERMINAL_UI_ACTION_BLOCK');
  }
  if(ended){
    invariant(model.actionBlocking.command.disabled&&model.actionBlocking.command.reasonCode==='CAMPAIGN_ENDED','TERMINAL_UI_ENDED_COMMAND_NOT_BLOCKED');
    invariant(model.actionBlocking.advance.disabled&&model.actionBlocking.advance.reasonCode==='CAMPAIGN_ENDED','TERMINAL_UI_ENDED_ADVANCE_NOT_BLOCKED');
  }
  return model;
}

export function serializeCampaignTerminalUiModel(model){
  validateCampaignTerminalUiModel(model);
  return JSON.stringify(canonical(model),null,2);
}

export function deserializeCampaignTerminalUiModel(serialized){
  invariant(typeof serialized==='string'&&serialized.length>0&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_TERMINAL_UI_MODEL_SERIALIZED_INPUT');
  let model;try{model=JSON.parse(serialized);}catch{throw new Error('INVALID_TERMINAL_UI_MODEL_JSON');}
  validateCampaignTerminalUiModel(model);
  return clone(model);
}

export const CAMPAIGN_TERMINAL_UI_MODEL_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_UI_MODEL_VERSION=VERSION;
