// 20 §§10–13: Formation, Morale, Regroup, Rally and Round-end recovery.
// Resolved event outcomes and observed contact contexts are supplied explicitly.
// No casualty threshold, probability, ability coefficient or new gauge is added.
import {invariant,jsonData,shape,unique,id,amount,clone,canonical,equal} from './contract-data.mjs';
const FORMATION=['ORDERED','DISORDERED','BROKEN'];
const MORALE=['STEADY','SHAKEN','ROUTING'];
const eventKeys={
  FORMATION_RESOLVED:['unitId','formationCondition'],
  REQUEST_MORALE_CHECK:['unitId'],
  MORALE_CHECK_RESOLVED:['unitId','checkId','passed'],
  // A failed check can be resolved by a paid precommit intervention without
  // pretending that the check passed or leaving it pending forever.
  MORALE_CHECK_INTERCEPTED:['unitId','checkId'],
  REGROUP:['unitId','hasActiveRearContact','distinctContactDirectionCount'],
  BRACE:['unitId'],
  RALLY_RESOLVED:['unitId','passed'],
  ROUND_END_RECOVERY:['contexts'],
};
function validateEvent(event){
  jsonData(event);invariant(event&&Object.hasOwn(eventKeys,event.type),'UNSUPPORTED_CONDITION_EVENT');
  shape(event,['eventId','type','sourceRef',...eventKeys[event.type]]);
  invariant(id(event.eventId)&&id(event.sourceRef)&&(!Object.hasOwn(event,'unitId')||id(event.unitId)),'INVALID_CONDITION_EVENT');
  return event;
}
export function validateCombatConditions(state){
  jsonData(state);shape(state,['format','revision','units','checks','receipts']);
  invariant(state.format==='combat-conditions-v1'&&amount(state.revision),'INVALID_CONDITIONS_FORMAT');
  unique(state.units,'unitId');unique(state.checks,'checkId');unique(state.receipts,'eventId');
  const ids=new Set(state.units.map(u=>u.unitId));
  for(const u of state.units){
    shape(u,['unitId','formationMode','formationCondition','morale']);
    invariant(id(u.formationMode)&&FORMATION.includes(u.formationCondition)&&MORALE.includes(u.morale),'INVALID_CONDITION_STATE');
    invariant(u.morale!=='ROUTING'||u.formationCondition==='BROKEN','ROUTING_MUST_BE_BROKEN');
  }
  invariant(state.revision===state.receipts.length,'CONDITION_REVISION_MISMATCH');
  const events=new Map();
  for(const [i,r] of state.receipts.entries()){
    shape(r,['eventId','request','revision','result']);
    invariant(typeof r.request==='string'&&r.revision===i+1,'INVALID_CONDITION_RECEIPT');
    let event;try{event=JSON.parse(r.request);}catch{throw new Error('INVALID_CONDITION_RECEIPT');}
    validateEvent(event);invariant(event.eventId===r.eventId&&canonical(event)===r.request,'INVALID_CONDITION_RECEIPT');
    events.set(event.eventId,event);
  }
  const causes=new Set();
  for(const check of state.checks){
    shape(check,['checkId','unitId','sourceRef','passed']);
    invariant(ids.has(check.unitId)&&id(check.sourceRef)&&(check.passed===null||typeof check.passed==='boolean'),'INVALID_MORALE_CHECK');
    const event=events.get(check.checkId),cause=canonical([check.unitId,check.sourceRef]);
    invariant(event&&event.unitId===check.unitId&&event.sourceRef===check.sourceRef
      &&(event.type==='REQUEST_MORALE_CHECK'||(event.type==='FORMATION_RESOLVED'&&event.formationCondition==='BROKEN')),'MISSING_MORALE_CHECK_SOURCE');
    invariant(!causes.has(cause),'DUPLICATE_ORDINARY_MORALE_CAUSE');causes.add(cause);
    const resolution=[...events.values()].filter(e=>['MORALE_CHECK_RESOLVED','MORALE_CHECK_INTERCEPTED'].includes(e.type)&&e.checkId===check.checkId);
    invariant(check.passed===null?resolution.length===0:resolution.length===1
      &&(resolution[0].type==='MORALE_CHECK_INTERCEPTED'?check.passed===false:resolution[0].passed===check.passed),'MORALE_CHECK_RECEIPT_MISMATCH');
  }
  return state;
}
export function createCombatConditions(units){
  jsonData(units);return validateCombatConditions({format:'combat-conditions-v1',revision:0,units:clone(units),checks:[],receipts:[]});
}
export function pendingMoraleChecks(state){validateCombatConditions(state);return clone(state.checks.filter(c=>c.passed===null));}
function requestCheck(state,event){
  const existing=state.checks.find(c=>c.unitId===event.unitId&&c.sourceRef===event.sourceRef);
  if(existing)return {checkId:existing.checkId,newCheck:false};
  state.checks.push({checkId:event.eventId,unitId:event.unitId,sourceRef:event.sourceRef,passed:null});
  return {checkId:event.eventId,newCheck:true};
}
export function applyCombatConditionEvent(state,event){
  validateCombatConditions(state);validateEvent(event);
  const request=canonical(event),old=state.receipts.find(r=>r.eventId===event.eventId);
  if(old){invariant(old.request===request,'CONDITION_EVENT_ID_CONFLICT');return {conditions:clone(state),result:clone(old.result),replayed:true};}
  const next=clone(state),u=Object.hasOwn(event,'unitId')?next.units.find(u=>u.unitId===event.unitId):null;
  invariant(!Object.hasOwn(event,'unitId')||u,'UNKNOWN_CONDITION_UNIT');
  let result={};
  if(['REGROUP','BRACE','ROUND_END_RECOVERY'].includes(event.type))invariant(next.checks.every(c=>c.passed!==null),'MORALE_CHECKS_PENDING');
  switch(event.type){
    case 'FORMATION_RESOLVED': {
      invariant(FORMATION.includes(event.formationCondition),'INVALID_FORMATION_RESOLUTION');
      // This event handles default adverse impacts, not an unapproved full heal.
      invariant(FORMATION.indexOf(event.formationCondition)>=FORMATION.indexOf(u.formationCondition),'FORMATION_REPAIR_REQUIRES_REPAIR_ACTION');
      const enteredBroken=u.formationCondition!=='BROKEN'&&event.formationCondition==='BROKEN';
      u.formationCondition=event.formationCondition;
      result=enteredBroken?requestCheck(next,event):{checkId:null,newCheck:false};break;
    }
    case 'REQUEST_MORALE_CHECK':result=requestCheck(next,event);break;
    case 'MORALE_CHECK_RESOLVED': {
      invariant(typeof event.passed==='boolean'&&id(event.checkId),'RESOLVED_MORALE_INPUT_REQUIRED');
      const check=next.checks.find(c=>c.checkId===event.checkId);
      invariant(check&&check.unitId===event.unitId&&check.passed===null,'MORALE_CHECK_NOT_PENDING');
      check.passed=event.passed;
      if(!event.passed)u.morale=MORALE[Math.min(MORALE.indexOf(u.morale)+1,MORALE.length-1)];
      // Rout -> Broken is not routed back into another Morale request.
      if(u.morale==='ROUTING')u.formationCondition='BROKEN';
      result={morale:u.morale,requiresRout:u.morale==='ROUTING'};break;
    }
    case 'MORALE_CHECK_INTERCEPTED': {
      invariant(id(event.checkId),'RESOLVED_MORALE_INPUT_REQUIRED');
      const check=next.checks.find(c=>c.checkId===event.checkId);
      invariant(check&&check.unitId===event.unitId&&check.passed===null,'MORALE_CHECK_NOT_PENDING');
      check.passed=false;
      result={morale:u.morale,failedCheckIntercepted:true,requiresRout:false};break;
    }
    case 'REGROUP':
      invariant(typeof event.hasActiveRearContact==='boolean'&&amount(event.distinctContactDirectionCount),'REGROUP_SPATIAL_INPUT_REQUIRED');
      invariant(!event.hasActiveRearContact&&event.distinctContactDirectionCount<2,'REGROUP_SPATIALLY_BLOCKED');
      invariant(u.morale!=='ROUTING','ROUTING_UNIT_CANNOT_REGROUP');
      u.formationCondition=FORMATION[Math.max(0,FORMATION.indexOf(u.formationCondition)-1)];
      result={formationCondition:u.formationCondition,requiresMajorAction:true};break;
    case 'BRACE':
      invariant(u.morale!=='ROUTING','ROUTING_UNIT_CANNOT_BRACE');u.formationMode='BRACED';result={formationMode:u.formationMode,requiresMajorAction:true};break;
    case 'RALLY_RESOLVED':
      invariant(u.morale==='ROUTING'&&typeof event.passed==='boolean','RESOLVED_RALLY_INPUT_REQUIRED');
      if(event.passed){u.morale='SHAKEN';u.formationCondition='DISORDERED';}
      result={rallied:event.passed,grantsActivation:false};break;
    case 'ROUND_END_RECOVERY':
      unique(event.contexts,'unitId');
      for(const context of event.contexts){
        shape(context,['unitId','contactState']);
        invariant(['FREE','THREATENED','ENGAGED'].includes(context.contactState),'ROUND_END_CONTACT_INPUT_REQUIRED');
        const unit=next.units.find(u=>u.unitId===context.unitId);invariant(unit,'UNKNOWN_CONDITION_UNIT');
        if(context.contactState==='FREE'&&unit.morale!=='ROUTING'){
          if(unit.formationCondition==='DISORDERED')unit.formationCondition='ORDERED';
          if(unit.morale==='SHAKEN')unit.morale='STEADY';
        }
      }
      result={recoveredAtRoundEnd:true};break;
  }
  next.revision++;next.receipts.push({eventId:event.eventId,request,revision:next.revision,result:clone(result)});
  return {conditions:validateCombatConditions(next),result:clone(result),replayed:false};
}
export function serializeCombatConditions(state){return JSON.stringify(validateCombatConditions(state));}
export function deserializeCombatConditions(text){invariant(typeof text==='string','INVALID_CONDITIONS_SERIALIZATION');return validateCombatConditions(JSON.parse(text));}
