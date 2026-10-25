// Atomic bridge between the already staged melee frame and the condition owner.
// The caller supplies resolved Formation/Morale events and finished Rout/Exit
// spatial outcomes. No probability, first-contact geometry or pursuit damage is
// fabricated. A non-complete pursuit outcome remains a hard continuation barrier.
import {validateCombatActionFrame,commitResolvedFrameConsequences} from './combat-action-frame.mjs';
import {validateCombatConditions,applyCombatConditionEvent,pendingMoraleChecks} from './combat-condition-kernel.mjs';
import {invariant,jsonData,shape,unique,id,amount,clone,canonical,equal,rule} from './contract-data.mjs';
const NAMESPACE='condition-kernel-revision';
function ownedRef(text){
  if(typeof text!=='string')return null;
  try{const v=JSON.parse(text);return Array.isArray(v)&&v.length===3&&v[0]===NAMESPACE&&id(v[1])&&amount(v[2])?v:null;}catch{return null;}
}
export function validateCombatConditionBundle(bundle,geometry){
  jsonData(bundle);shape(bundle,['format','frame','conditions']);invariant(bundle.format==='combat-condition-bundle-v1','INVALID_CONDITION_BUNDLE');
  validateCombatActionFrame(bundle.frame,geometry);validateCombatConditions(bundle.conditions);
  invariant(equal(bundle.frame.troops.map(u=>u.unitId).sort(),bundle.conditions.units.map(u=>u.unitId).sort()),'CONDITION_BUNDLE_UNIT_COVERAGE');
  for(const u of bundle.conditions.units){
    const state=bundle.frame.round.units[u.unitId].state;
    if(state==='ROUTING')invariant(u.morale==='ROUTING','CONDITION_ROUND_ROUTING_MISMATCH');
    if(state==='COMMANDABLE')invariant(u.morale!=='ROUTING','CONDITION_ROUND_ROUTING_MISMATCH');
  }
  const latest=[...bundle.frame.receipts].reverse().map(r=>ownedRef(r.result?.conditionResultRef)).find(Boolean);
  if(latest)invariant(latest[1]===bundle.frame.battleId&&latest[2]===bundle.conditions.revision,'CONDITION_BUNDLE_REVISION_MISMATCH');
  return bundle;
}
export function createCombatConditionBundle({frame,conditions},geometry){
  return validateCombatConditionBundle(clone({format:'combat-condition-bundle-v1',frame,conditions}),geometry);
}
export function resolveFrameConditionEvents(bundle,command,adapters){
  validateCombatConditionBundle(bundle,adapters.geometry);jsonData(command);
  shape(command,['operationId','expectedRevision','expectedConditionsRevision','resolutionRef']);
  invariant(id(command.resolutionRef)&&amount(command.expectedConditionsRevision),'INVALID_CONDITION_BUNDLE_COMMAND');
  // Include the condition revision in the frame's saved request/replay identity.
  const frameCommand={operationId:command.operationId,expectedRevision:command.expectedRevision,
    resolutionRef:canonical({sourceRef:command.resolutionRef,expectedConditionsRevision:command.expectedConditionsRevision})};
  if(bundle.frame.receipts.some(r=>r.operationId===command.operationId)){
    const replay=commitResolvedFrameConsequences(bundle.frame,frameCommand,{geometry:adapters.geometry});
    return {bundle:clone(bundle),result:replay.result,replayed:true};
  }
  invariant(command.expectedRevision===bundle.frame.revision&&command.expectedConditionsRevision===bundle.conditions.revision,'STALE_CONDITION_BUNDLE_REVISION');
  invariant(bundle.frame.pendingResolvers.length>0,'NO_PENDING_COMBAT_CONSEQUENCES');
  const resolution=rule(adapters,'resolveConditionEvents',bundle,command);
  shape(resolution,['events','spaceUpdate','exitedUnitIds','routPursuitResolved']);
  invariant(resolution.routPursuitResolved===true,'ROUT_PURSUIT_RESOLUTION_REQUIRED');
  unique(resolution.events,'eventId');
  let conditions=clone(bundle.conditions);
  for(const event of resolution.events){
    invariant(['FORMATION_RESOLVED','REQUEST_MORALE_CHECK','MORALE_CHECK_RESOLVED'].includes(event.type),'POST_ACTION_CONDITION_EVENT_ONLY');
    conditions=applyCombatConditionEvent(conditions,event).conditions;
  }
  invariant(pendingMoraleChecks(conditions).length===0,'MORALE_CHECKS_PENDING');
  invariant(Array.isArray(resolution.exitedUnitIds)&&resolution.exitedUnitIds.every(id)
    &&new Set(resolution.exitedUnitIds).size===resolution.exitedUnitIds.length,'INVALID_CONDITION_EXIT_IDS');
  const updates=[];
  for(const u of conditions.units){
    const previous=bundle.frame.round.units[u.unitId].state;
    if(previous==='COMMANDABLE'&&u.morale==='ROUTING')updates.push({unitId:u.unitId,unitState:resolution.exitedUnitIds.includes(u.unitId)?'EXITED':'ROUTING'});
    else if(previous==='ROUTING'&&resolution.exitedUnitIds.includes(u.unitId))updates.push({unitId:u.unitId,unitState:'EXITED'});
  }
  for(const exitedId of resolution.exitedUnitIds)invariant(updates.some(u=>u.unitId===exitedId&&u.unitState==='EXITED'),'EXIT_REQUIRES_RESOLVED_ROUT');
  const committed=commitResolvedFrameConsequences(bundle.frame,frameCommand,{geometry:adapters.geometry,resolveConsequences:frame=>({
    completedResolvers:frame.pendingResolvers,unitStateChanges:updates,spaceUpdate:resolution.spaceUpdate,
    conditionResultRef:canonical([NAMESPACE,frame.battleId,conditions.revision]),
  })});
  const next=validateCombatConditionBundle({format:bundle.format,frame:committed.frame,conditions},adapters.geometry);
  return {bundle:next,result:committed.result,replayed:false};
}
export function serializeCombatConditionBundle(bundle,geometry){return JSON.stringify(validateCombatConditionBundle(bundle,geometry));}
export function deserializeCombatConditionBundle(text,geometry){invariant(typeof text==='string','INVALID_CONDITION_BUNDLE_SERIALIZATION');return validateCombatConditionBundle(JSON.parse(text),geometry);}
