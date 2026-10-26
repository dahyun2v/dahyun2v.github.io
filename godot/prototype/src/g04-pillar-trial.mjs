// Isolated Round-native G04 tactic pilot. Not wired to FIRST3 or class/trait.
// Public battlefield snapshots and resolved condition events belong to caller.
import {invariant,clone,id,amount,canonical,jsonData,shape} from './contract-data.mjs';
import {createCombatRound,validateCombatRound,beginNextActivation,finishCombatMovement,finishCombatMajorAction,consumeCombatReaction,applyCombatUnitState} from './combat-round.mjs';
import {validateCombatConditions,applyCombatConditionEvent,pendingMoraleChecks} from './combat-condition-kernel.mjs';

const FORMATION=['ORDERED','DISORDERED','BROKEN'];
const MORALE=['STEADY','SHAKEN','ROUTING'];
const own=(o,k)=>Object.hasOwn(o,k);
const positive=n=>Number.isSafeInteger(n)&&n>0;
const hex=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.q+a.r-b.q-b.r)+Math.abs(a.r-b.r))/2;
const legalUnit=u=>u&&id(u.factionId)&&Number.isSafeInteger(u.q)&&Number.isSafeInteger(u.r)&&typeof u.observed==='boolean';
const conditionUnit=(state,id)=>state.conditions.units.find(u=>u.unitId===id);
const liveLink=state=>state.link!==null&&state.round.roundNumber<state.link.expiresRoundExclusive;
const sameFaction=(state,a,b)=>state.units[a]?.factionId===state.units[b]?.factionId;
const eligibleLink=state=>liveLink(state)&&state.round.units[state.sourceUnitId]?.state==='COMMANDABLE'
  &&state.round.units[state.link.targetUnitId]?.state==='COMMANDABLE'
  &&sameFaction(state,state.sourceUnitId,state.link.targetUnitId)
  &&hex(state.units[state.sourceUnitId],state.units[state.link.targetUnitId])<=4;
const serialize=state=>JSON.stringify(validateG04PillarTrial(state));

export function validateG04PillarTrial(state){
  jsonData(state);shape(state,['format','battleId','sourceUnitId','round','conditions','units','link','cooldownUntilRound','lastLineUsed','receipts']);
  invariant(state.format==='g04-pillar-trial-v1'&&id(state.battleId)&&id(state.sourceUnitId),'INVALID_G04_FORMAT');
  validateCombatRound(state.round);validateCombatConditions(state.conditions);
  invariant(own(state.round.units,state.sourceUnitId)&&state.units&&Object.keys(state.units).length===Object.keys(state.round.units).length,'INVALID_G04_UNITS');
  for(const unitId of Object.keys(state.round.units))invariant(legalUnit(state.units[unitId])&&conditionUnit(state,unitId),'INVALID_G04_UNIT_CONTEXT');
  invariant(state.cooldownUntilRound===null||positive(state.cooldownUntilRound),'INVALID_G04_COOLDOWN');
  invariant(state.lastLineUsed===false,'G04_TRAIT_NOT_IMPLEMENTED');
  if(state.link){
    shape(state.link,['targetUnitId','startedRound','expiresRoundExclusive','procRound']);
    invariant(id(state.link.targetUnitId)&&state.link.targetUnitId!==state.sourceUnitId&&own(state.round.units,state.link.targetUnitId)
      &&positive(state.link.startedRound)&&state.link.expiresRoundExclusive===state.link.startedRound+2
      &&state.link.startedRound<=state.round.roundNumber&&state.round.roundNumber<state.link.expiresRoundExclusive
      &&(state.link.procRound===null||positive(state.link.procRound)&&state.link.procRound>=state.link.startedRound&&state.link.procRound<=state.round.roundNumber)
      &&state.round.units[state.sourceUnitId].state==='COMMANDABLE'
      &&state.round.units[state.link.targetUnitId].state==='COMMANDABLE'
      &&sameFaction(state,state.sourceUnitId,state.link.targetUnitId)
      &&state.cooldownUntilRound===null,'INVALID_G04_LINK');
  }
  invariant(Array.isArray(state.receipts),'INVALID_G04_RECEIPTS');
  const ids=new Set();
  for(const [i,receipt] of state.receipts.entries()){
    shape(receipt,['eventId','request','revision','result']);
    invariant(id(receipt.eventId)&&!ids.has(receipt.eventId)&&receipt.revision===i+1&&typeof receipt.request==='string','INVALID_G04_RECEIPT');
    ids.add(receipt.eventId);
    let request;try{request=JSON.parse(receipt.request);}catch{throw new Error('INVALID_G04_RECEIPT');}
    invariant(request.eventId===receipt.eventId&&canonical(request)===receipt.request,'INVALID_G04_RECEIPT');
  }
  return state;
}

export function createG04PillarTrial({battleId,sourceUnitId,round,conditions,units}){
  const state={format:'g04-pillar-trial-v1',battleId,sourceUnitId,round:clone(round),conditions:clone(conditions),units:clone(units),link:null,cooldownUntilRound:null,lastLineUsed:false,receipts:[]};
  return validateG04PillarTrial(state);
}

function closeLink(state,endedRound){
  if(!state.link)return;
  state.link=null;state.cooldownUntilRound=endedRound+3;
}
function worsening(before,after,unitId){
  const a=conditionUnit({conditions:before},unitId),b=conditionUnit({conditions:after},unitId);
  return !!a&&!!b&&(FORMATION.indexOf(b.formationCondition)>FORMATION.indexOf(a.formationCondition)
    ||MORALE.indexOf(b.morale)>MORALE.indexOf(a.morale));
}
function condition(state,event){
  invariant(event&&id(event.eventId)&&event.type!=='MORALE_CHECK_INTERCEPTED','INVALID_G04_CONDITION_EVENT');
  // Preview on a cloned kernel state: no receipt or derived morale check leaks
  // from a prevented Formation transition.
  const proposed=applyCombatConditionEvent(state.conditions,event);
  const canBlock=id(event.unitId)&&eligibleLink(state)&&event.unitId===state.link.targetUnitId
    &&state.link.procRound!==state.round.roundNumber&&state.round.units[state.sourceUnitId].reactionRemaining>0
    &&state.round.phase!=='ROUND_ACTIONS_COMPLETE'&&worsening(state.conditions,proposed.conditions,event.unitId);
  if(!canBlock){
    state.conditions=proposed.conditions;
    const updated=conditionUnit(state,event.unitId);
    if(updated?.morale==='ROUTING'&&state.round.units[event.unitId]?.state==='COMMANDABLE')
      state.round=applyCombatUnitState(state.round,{unitId:event.unitId,unitState:'ROUTING'});
    if(updated?.morale!=='ROUTING'&&state.round.units[event.unitId]?.state==='ROUTING'&&event.type==='RALLY_RESOLVED')
      state.round=applyCombatUnitState(state.round,{unitId:event.unitId,unitState:'COMMANDABLE'});
    if(state.link&&[state.sourceUnitId,state.link.targetUnitId].includes(event.unitId)
      &&state.round.units[event.unitId].state!=='COMMANDABLE')closeLink(state,state.round.roundNumber);
    return {intercepted:false,conditionResult:proposed.result};
  }
  const round=consumeCombatReaction(state.round,{unitId:state.sourceUnitId,triggerId:event.eventId,executed:true});
  let conditions=state.conditions;
  if(event.type==='MORALE_CHECK_RESOLVED'){
    // The source check remains failed, but an explicit intervention receipt
    // closes it without applying the morale drop. This is not a passed check.
    invariant(event.passed===false,'G04_INTERCEPT_REQUIRES_FAILED_CHECK');
    conditions=applyCombatConditionEvent(state.conditions,{eventId:event.eventId,type:'MORALE_CHECK_INTERCEPTED',
      sourceRef:event.sourceRef,unitId:event.unitId,checkId:event.checkId}).conditions;
  }
  state.round=round;state.conditions=conditions;state.link.procRound=state.round.roundNumber;
  return {intercepted:true,protectedUnitId:event.unitId,spentReactionOf:state.sourceUnitId,conditionResult:null};
}

function execute(state,command){
  switch(command.kind){
    case 'BEGIN_ACTIVATION':state.round=beginNextActivation(state.round);return {active:state.round.active};
    case 'FINISH_MOVEMENT':state.round=finishCombatMovement(state.round);return {active:state.round.active};
    case 'CAST':{
      const round=state.round,source=state.sourceUnitId,target=command.targetUnitId;
      invariant(round.active?.unitId===source&&round.active.stage==='MAJOR','G04_CAST_REQUIRES_MAJOR');
      invariant(!state.link,'G04_LINK_ALREADY_ACTIVE');
      invariant(state.cooldownUntilRound===null||round.roundNumber>=state.cooldownUntilRound,'G04_COOLDOWN_ACTIVE');
      invariant(id(target)&&target!==source&&own(round.units,target)&&round.units[target].state==='COMMANDABLE','G04_INVALID_TARGET');
      invariant(sameFaction(state,source,target)&&state.units[target].observed,'G04_TARGET_NOT_OBSERVED_ALLY');
      invariant(hex(state.units[source],state.units[target])<=4,'G04_TARGET_OUT_OF_RANGE');
      state.round=finishCombatMajorAction(round,{action:'TACTIC'});
      state.cooldownUntilRound=null;
      state.link={targetUnitId:target,startedRound:round.roundNumber,expiresRoundExclusive:round.roundNumber+2,procRound:null};
      return {cast:true,targetUnitId:target,expiresRoundExclusive:state.link.expiresRoundExclusive};
    }
    case 'MAJOR_ACTION':{
      invariant(id(command.action)&&(!own(command,'verb')||id(command.verb)),'INVALID_G04_MAJOR_ACTION');
      if(liveLink(state)&&state.round.active?.unitId===state.sourceUnitId)
        invariant(command.action!=='ATTACK'&&command.verb!=='CHARGE','G04_ATTACK_BLOCKED');
      state.round=finishCombatMajorAction(state.round,{action:command.action});return {majorAction:command.action};
    }
    case 'SPEND_REACTION':{
      invariant(id(command.unitId)&&id(command.triggerId),'INVALID_G04_REACTION');
      state.round=consumeCombatReaction(state.round,{unitId:command.unitId,triggerId:command.triggerId,executed:true});
      return {reactionRemaining:state.round.units[command.unitId].reactionRemaining};
    }
    case 'CONDITION_EVENT':
      invariant(command.conditionEvent?.eventId===command.eventId,'G04_CONDITION_EVENT_ID_MISMATCH');
      return condition(state,command.conditionEvent);
    case 'UPDATE_UNIT':{
      const unitId=command.unitId,unit=command.unit;
      invariant(id(unitId)&&own(state.units,unitId)&&legalUnit(unit),'INVALID_G04_UNIT_UPDATE');
      invariant(['COMMANDABLE','ROUTING','EXITED','ELIMINATED'].includes(command.unitState),'INVALID_G04_UNIT_UPDATE');
      state.units[unitId]=clone(unit);
      if(state.round.units[unitId].state!==command.unitState)state.round=applyCombatUnitState(state.round,{unitId,unitState:command.unitState});
      if(state.link&&[state.sourceUnitId,state.link.targetUnitId].includes(unitId)){
        if(state.round.units[state.sourceUnitId].state!=='COMMANDABLE'||state.round.units[state.link.targetUnitId].state!=='COMMANDABLE'
          ||!sameFaction(state,state.sourceUnitId,state.link.targetUnitId))closeLink(state,state.round.roundNumber);
      }
      return {linkActive:!!state.link,suspended:!!state.link&&!eligibleLink(state)};
    }
    case 'NEXT_ROUND':{
      const old=state.round;
      invariant(old.active===null&&Object.values(old.units).every(u=>u.activationClosed)&&pendingMoraleChecks(state.conditions).length===0,'G04_ROUND_NOT_COMPLETE');
      invariant(Array.isArray(command.initiativeOrder),'INVALID_G04_INITIATIVE');
      const nextRound=old.roundNumber+1;
      state.round=createCombatRound({roundNumber:nextRound,
        units:Object.entries(old.units).map(([unitId,u])=>({unitId,state:u.state})),initiativeOrder:command.initiativeOrder});
      if(state.link&&nextRound>=state.link.expiresRoundExclusive)closeLink(state,nextRound);
      return {roundNumber:nextRound,linkActive:!!state.link,cooldownUntilRound:state.cooldownUntilRound};
    }
    default:throw new Error('UNSUPPORTED_G04_COMMAND');
  }
}

export function stepG04PillarTrial(state,command){
  validateG04PillarTrial(state);jsonData(command);invariant(command&&id(command.eventId)&&id(command.kind),'INVALID_G04_COMMAND');
  const request=canonical(command),old=state.receipts.find(r=>r.eventId===command.eventId);
  if(old){invariant(old.request===request,'G04_EVENT_ID_CONFLICT');return {trial:clone(state),result:clone(old.result),replayed:true};}
  const next=clone(state),result=execute(next,command);
  next.receipts.push({eventId:command.eventId,request,revision:next.receipts.length+1,result:clone(result)});
  return {trial:validateG04PillarTrial(next),result:clone(result),replayed:false};
}

export function g04PillarView(state){
  validateG04PillarTrial(state);
  return {sourceUnitId:state.sourceUnitId,targetUnitId:state.link?.targetUnitId??null,
    remainingRounds:state.link?state.link.expiresRoundExclusive-state.round.roundNumber:0,
    suspended:!!state.link&&!eligibleLink(state),protectedThisRound:state.link?.procRound===state.round.roundNumber,
    reactionRemaining:state.round.units[state.sourceUnitId].reactionRemaining,
    cooldownUntilRound:state.cooldownUntilRound,lastLineAvailable:false};
}
export function serializeG04PillarTrial(state){return serialize(state);}
export function deserializeG04PillarTrial(text){invariant(typeof text==='string','INVALID_G04_SERIALIZATION');return validateG04PillarTrial(JSON.parse(text));}
