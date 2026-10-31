// Atomic Round + Space + current surviving troops, independent of legacy ticks.
// 20 §§2.3,5,7,9,16,23. Movement geometry and attack/counter casualty formulas
// are explicit pure adapters. Contact attempts are connected; Charge/Tactic
// formulas and THREATENED-target facing still require their owning contracts.
import {
  validateCombatRound, beginNextActivation, waitCombatActivation, finishCombatMovement,
  finishCombatMajorAction, applyCombatUnitState,
} from './combat-round.mjs';
import {validateCombatSpace,validateCombatSpaceGeometry,applyCombatSpaceUpdate,deriveCombatContactState,projectCombatSpace} from './combat-space.mjs';
import {commitSelectedCombatReaction} from './combat-reaction-window.mjs';
import {invariant,jsonData,shape,unique,id,amount,clone,canonical,equal,rule,truth,commandReceipt} from './contract-data.mjs';

const live = (frame,unitId) => !['EXITED','ELIMINATED'].includes(frame.round.units[unitId].state);
const byId = (frame,unitId) => frame.troops.find(u => u.unitId === unitId);
function liveSpace(frame) {
  const ids = new Set(frame.space.units.filter(u => live(frame,u.unitId)).map(u => u.unitId));
  return {...frame.space, units:frame.space.units.filter(u => ids.has(u.unitId)),
    contactLinks:frame.space.contactLinks.filter(l => ids.has(l.attackerUnitId) && ids.has(l.defenderUnitId))};
}
// Keep spatial tombstones without making an exited/eliminated unit occupy space.
function geometryFor(frame, geometry) {
  return {...geometry,
    sameAnchor:(a,b) => !live(frame,a.unitId) || !live(frame,b.unitId) ? false : rule(geometry,'sameAnchor',a,b),
    hasPhysicalOverlap:(a,b) => !live(frame,a.unitId) || !live(frame,b.unitId) ? false : rule(geometry,'hasPhysicalOverlap',a,b),
  };
}
export function validateCombatActionFrame(frame,geometry) {
  jsonData(frame); shape(frame,['format','battleId','revision','round','space','troops','receipts','pendingResolvers']);
  invariant(frame.format === 'combat-action-frame-v1' && id(frame.battleId) && amount(frame.revision),'INVALID_ACTION_FRAME');
  validateCombatRound(frame.round); validateCombatSpace(frame.space);
  unique(frame.troops,'unitId');
  const ids=Object.keys(frame.round.units).sort();
  invariant(equal(ids,frame.space.units.map(u=>u.unitId).sort()) && equal(ids,frame.troops.map(u=>u.unitId).sort()),'FRAME_UNIT_COVERAGE');
  for (const u of frame.troops) {
    shape(u,['unitId','count']); invariant(amount(u.count),'INVALID_TROOP_COUNT');
    invariant((u.count === 0) === (frame.round.units[u.unitId].state === 'ELIMINATED'),'ELIMINATION_COUNT_MISMATCH');
  }
  for (const l of frame.space.contactLinks) invariant(!l.active || (live(frame,l.attackerUnitId)&&live(frame,l.defenderUnitId)),'REMOVED_UNIT_HAS_CONTACT');
  invariant(Array.isArray(frame.pendingResolvers) && (frame.pendingResolvers.length===0 || equal(frame.pendingResolvers,['FORMATION_EVENTS','MORALE_EVENTS','ROUT_PURSUIT_AND_DECISION'])),'INVALID_PENDING_RESOLVERS');
  unique(frame.receipts,'operationId');
  invariant(frame.revision === frame.receipts.length,'FRAME_REVISION_MISMATCH');
  frame.receipts.forEach((r,i) => {
    commandReceipt(r,['BEGIN','WAIT','MOVE','NO_MOVE','ENGAGED_MELEE','CONTACT_MELEE','CONSEQUENCES']);
    invariant(r.revision === i+1,'INVALID_OPERATION_RECEIPT');
  });
  if (geometry !== undefined) validateCombatSpaceGeometry(frame.space,geometryFor(frame,geometry));
  return frame;
}
export function createCombatActionFrame({battleId,round,space,troops},geometry) {
  return validateCombatActionFrame(clone({format:'combat-action-frame-v1',battleId,revision:0,round,space,troops,receipts:[],pendingResolvers:[]}),geometry);
}
function transact(frame,command,kind,geometry,operation,allowPending=false) {
  validateCombatActionFrame(frame,geometry); jsonData(command);
  invariant(id(command.operationId) && amount(command.expectedRevision),'INVALID_OPERATION');
  const request=canonical({kind,command});
  const receipt=frame.receipts.find(r=>r.operationId === command.operationId);
  if (receipt) {
    invariant(receipt.request === request,'OPERATION_ID_CONFLICT');
    return {frame:clone(frame),result:clone(receipt.result),replayed:true};
  }
  invariant(command.expectedRevision === frame.revision,'STALE_FRAME_REVISION');
  invariant(allowPending || frame.pendingResolvers.length===0,'COMBAT_CONSEQUENCES_PENDING');
  const next=clone(frame); const result=operation(next);
  jsonData(result); next.revision++;
  next.receipts.push({operationId:command.operationId,request,revision:next.revision,result:clone(result)});
  validateCombatActionFrame(next,geometry);
  return {frame:next,result:clone(result),replayed:false};
}
export function beginFrameActivation(frame,command,geometry) {
  shape(command,['operationId','expectedRevision']);
  return transact(frame,command,'BEGIN',geometry,next=>{next.round=beginNextActivation(next.round);return {active:clone(next.round.active)};});
}
export function waitFrameActivation(frame,command,geometry) {
  shape(command,['operationId','expectedRevision']);
  return transact(frame,command,'WAIT',geometry,next=>{next.round=waitCombatActivation(next.round);return {waited:true};});
}

// One submitted path completes Movement (including zero movement). There is no
// split-path continuation that could let Wait happen after an unrecorded move.
// Path/stop adjudication belongs to the geometry adapter. UNKNOWN fails closed.
export function commitFrameMovement(frame,command,adapters) {
  jsonData(command); shape(command,['operationId','expectedRevision','unitId','path','endPose']);
  return transact(frame,command,'MOVE',adapters.geometry,next=>{
    const active=next.round.active;
    invariant(next.round.phase === 'ACTIVATIONS' && active?.stage === 'MOVEMENT' && active.unitId === command.unitId,'MOVEMENT_ACTOR_OR_STAGE');
    invariant(deriveCombatContactState(liveSpace(next),command.unitId,adapters.geometry) !== 'ENGAGED','NORMAL_MOVE_WHILE_ENGAGED');
    const verdict=rule(adapters,'resolveNormalMove',next,command);
    shape(verdict,['legal','stopReason','endPose']);
    invariant(verdict.legal === true,'NORMAL_MOVE_NOT_LEGAL');
    invariant(['VOLUNTARY_END','FIRST_ENEMY_CONTROL_ENTRY'].includes(verdict.stopReason),'MOVEMENT_STOP_INPUT_REQUIRED');
    invariant(equal(verdict.endPose,command.endPose) && verdict.endPose.unitId === command.unitId,'MOVE_ENDPOINT_MISMATCH');
    next.space=applyCombatSpaceUpdate(next.space,{unitUpdates:[verdict.endPose],contactUpdates:[]},geometryFor(next,adapters.geometry));
    if (verdict.stopReason === 'FIRST_ENEMY_CONTROL_ENTRY') {
      invariant(deriveCombatContactState(liveSpace(next),command.unitId,adapters.geometry)==='THREATENED','CONTROL_ENTRY_NOT_CONFIRMED');
    }
    next.round=finishCombatMovement(next.round);
    return {unitId:command.unitId,stopReason:verdict.stopReason,majorRemaining:true};
  });
}

// Skip Movement while already in Contact, without granting normal disengagement.
export function finishFrameMovementWithoutMove(frame,command,geometry) {
  shape(command,['operationId','expectedRevision','unitId']);
  return transact(frame,command,'NO_MOVE',geometry,next=>{
    invariant(next.round.active?.unitId === command.unitId,'MOVEMENT_ACTOR_OR_STAGE');
    next.round=finishCombatMovement(next.round); return {unitId:command.unitId,majorRemaining:true};
  });
}
function removeDeadContacts(frame,unitId) {
  frame.space.contactLinks=frame.space.contactLinks.map(l => l.attackerUnitId===unitId || l.defenderUnitId===unitId ? {...l,active:false} : l);
}
function casualty(frame,unitId,count) {
  const unit=byId(frame,unitId);
  invariant(amount(count) && count<=unit.count,'INVALID_CASUALTY_RESULT');
  unit.count-=count;
  if (unit.count===0) {frame.round=applyCombatUnitState(frame.round,{unitId,unitState:'ELIMINATED'});removeDeadContacts(frame,unitId);}
}
// Restricted to an already active Contact. It never invents an approach, facing,
// range, hit chance or impact. Formation/Morale event resolution remains pending
// to the caller, explicitly returned in the result instead of silently invented.
export function resolveEngagedFrameMelee(frame,command,adapters) {
  jsonData(command);shape(command,['operationId','expectedRevision','attackerId','defenderId','contactId','counterTriggerId','counterSelected']);
  return transact(frame,command,'ENGAGED_MELEE',adapters.geometry,next=>engagedMelee(next,command,adapters));
}
// Shared effects: a new contact must use the same casualty/counter/Major owner.
function engagedMelee(next,command,adapters) {
    const {attackerId:a,defenderId:d}=command;
    invariant(id(command.counterTriggerId) && typeof command.counterSelected==='boolean','INVALID_COUNTER_REQUEST');
    invariant(next.round.phase==='ACTIVATIONS' && next.round.active?.unitId===a && next.round.active.stage==='MAJOR','MELEE_ACTOR_OR_STAGE');
    invariant(a!==d && Object.hasOwn(next.round.units,d) && live(next,d),'INVALID_MELEE_TARGET');
    const contact=next.space.contactLinks.find(l=>l.contactId===command.contactId && l.active);
    invariant(contact && [contact.attackerUnitId,contact.defenderUnitId].includes(a) && [contact.attackerUnitId,contact.defenderUnitId].includes(d),'MELEE_CONTACT_REQUIRED');
    invariant(truth(adapters,'canMelee',next,command),'MELEE_NOT_LEGAL');
    const steps=[];
    const attack=rule(adapters,'resolveAttack',next,command);
    shape(attack,['casualties']);casualty(next,d,attack.casualties);steps.push('ATTACK','CASUALTY_APPLIED');
    let counterLoss=0;let counterExecuted=false;
    if (next.round.units[d].state==='COMMANDABLE' && next.round.units[d].reactionRemaining>0 && byId(next,d).count>0) {
      const req={triggerId:command.counterTriggerId,directTargetId:d,interceptorIds:[],chainDepth:0};
      // This callback sees surviving troops, and may calculate fresh frontage.
      const canCounter=truth(adapters,'canCounter',next,command);
      if (command.counterSelected && canCounter) {
        const counter=rule(adapters,'resolveCounter',next,command);shape(counter,['casualties']);
        const selected=commitSelectedCombatReaction(next.round,req,{unitId:d,executed:true},{canReact:()=>true});
        next.round=selected.round;casualty(next,a,counter.casualties);
        counterLoss=counter.casualties;counterExecuted=true;steps.push('COUNTER','COUNTER_CASUALTY_APPLIED');
      }
    }
    // If counter eliminates the acting unit, its activation is already canceled.
    // Record the actually executed attack without resurrecting an activation.
    if (next.round.active?.unitId===a) next.round=finishCombatMajorAction(next.round,{action:'ATTACK'});
    else {next.round.majorActions.push({unitId:a,action:'ATTACK'});validateCombatRound(next.round);}
    next.pendingResolvers=['FORMATION_EVENTS','MORALE_EVENTS','ROUT_PURSUIT_AND_DECISION'];
    return {attackerId:a,defenderId:d,attackCasualties:attack.casualties,counterCasualties:counterLoss,counterExecuted,steps,
      pendingResolvers:['FORMATION_EVENTS','MORALE_EVENTS','ROUT_PURSUIT_AND_DECISION']};
}

// 20 v2.1 §§2.3,3,9,16,23: one atomic final approach + reaction + contact +
// ordinary melee. All coordinates/path legality and reaction damage/blocking
// come from trusted pure adapters. No Charge, forced displacement, new reaction
// capability, or THREATENED-target facing rule is invented here.
export function resolveContactAttemptFrameMelee(frame,command,adapters) {
  jsonData(command);
  shape(command,['operationId','expectedRevision','attackerId','defenderId','contactId','path',
    'approachTriggerId','interceptorIds','reactionSelection','counterTriggerId','counterSelected']);
  return transact(frame,command,'CONTACT_MELEE',adapters.geometry,next=>{
    const {attackerId:a,defenderId:d}=command;
    invariant(next.round.phase==='ACTIVATIONS' && next.round.active?.unitId===a
      && next.round.active.stage==='MAJOR','MELEE_ACTOR_OR_STAGE');
    invariant(a!==d && Object.hasOwn(next.round.units,d) && next.round.units[d].state==='COMMANDABLE','INVALID_APPROACH_TARGET');
    invariant(id(command.contactId) && !next.space.contactLinks.some(l=>l.contactId===command.contactId),'CONTACT_ID_ALREADY_USED');
    invariant(id(command.approachTriggerId) && id(command.counterTriggerId)
      && command.approachTriggerId!==command.counterTriggerId && typeof command.counterSelected==='boolean','INVALID_APPROACH_TRIGGERS');
    invariant(Array.isArray(command.interceptorIds) && !command.interceptorIds.includes(a),'ATTACKER_CANNOT_INTERCEPT_SELF');
    const actorState=deriveCombatContactState(liveSpace(next),a,adapters.geometry);
    invariant(actorState!=='UNKNOWN','INPUT_REQUIRED:attackerContactState');
    invariant(actorState!=='ENGAGED','FINAL_APPROACH_WHILE_ENGAGED');
    const targetState=deriveCombatContactState(liveSpace(next),d,adapters.geometry);
    invariant(targetState!=='UNKNOWN','INPUT_REQUIRED:defenderContactState');
    invariant(targetState!=='THREATENED','THREATENED_FACING_CONTRACT_REQUIRED');
    const previousDefender=next.space.units.find(u=>u.unitId===d);
    invariant(truth(adapters.geometry,'areEnemies',next.space.units.find(u=>u.unitId===a),previousDefender),'NON_ENEMY_CONTACT');
    const plan=rule(adapters,'resolveFinalApproach',next,command);
    jsonData(plan);
    shape(plan,['legal','reactionPose','contactPose','defenderPose','contactLink']);
    invariant(plan.legal===true,'FINAL_APPROACH_NOT_LEGAL');
    invariant(plan.reactionPose.unitId===a && plan.contactPose.unitId===a
      && plan.defenderPose.unitId===d,'APPROACH_POSE_ACTOR_MISMATCH');
    invariant(equal(plan.defenderPose.anchor,previousDefender.anchor),'FIRST_CONTACT_CANNOT_MOVE_DEFENDER');
    if(targetState==='ENGAGED') invariant(equal(plan.defenderPose,previousDefender),'ENGAGED_DEFENDER_CANNOT_REALIGN');
    invariant(plan.contactLink.contactId===command.contactId && plan.contactLink.attackerUnitId===a
      && plan.contactLink.defenderUnitId===d && plan.contactLink.active===true,'APPROACH_CONTACT_MISMATCH');
    if(targetState==='FREE') invariant(plan.contactLink.contactSide==='FRONT','FREE_TARGET_MUST_FACE_ATTACKER');
    // Facing alignment belongs to the contact commit. A prevented approach must
    // not leave the target turned by a contact that never happened (21 §10).
    next.space=applyCombatSpaceUpdate(next.space,{unitUpdates:[plan.reactionPose],contactUpdates:[]},geometryFor(next,adapters.geometry));
    const request={triggerId:command.approachTriggerId,directTargetId:d,interceptorIds:command.interceptorIds,chainDepth:0};
    const selected=commitSelectedCombatReaction(next.round,request,command.reactionSelection,{
      canReact:(_round,_request,unitId)=>truth(adapters,'canApproachReact',next,command,unitId),
      canIntercept:(_round,_request,unitId)=>truth(adapters,'canApproachIntercept',next,command,unitId),
    });
    let reaction={casualties:0,preventsContact:false};
    if(selected.executed){
      reaction=rule(adapters,'resolveApproachReaction',next,command,selected.reactorId);
      shape(reaction,['casualties','preventsContact']);
      invariant(typeof reaction.preventsContact==='boolean','INVALID_APPROACH_REACTION_RESULT');
      next.round=selected.round;
      casualty(next,a,reaction.casualties);
    }
    const contactCreated=live(next,a) && !reaction.preventsContact;
    let melee=null;
    if(contactCreated){
      next.space=applyCombatSpaceUpdate(next.space,{unitUpdates:[plan.contactPose,plan.defenderPose],contactUpdates:[plan.contactLink]},geometryFor(next,adapters.geometry));
      melee=engagedMelee(next,command,adapters);
    } else if(live(next,a)) {
      // The source does not close the Major cost of a prevented approach.
      // Require an explicit trusted policy, rather than silently grant a retry
      // or consume the player's action as a new game rule.
      const cost=rule(adapters,'resolveBlockedApproachCost',next,command,reaction);
      shape(cost,['consumeMajor']);
      invariant(typeof cost.consumeMajor==='boolean','BLOCKED_APPROACH_COST_REQUIRED');
      if(cost.consumeMajor) next.round=finishCombatMajorAction(next.round,{action:'ATTACK'});
    }
    next.pendingResolvers=['FORMATION_EVENTS','MORALE_EVENTS','ROUT_PURSUIT_AND_DECISION'];
    return {attackerId:a,defenderId:d,contactId:command.contactId,targetStateBefore:targetState,
      approachReactorId:selected.reactorId,approachCasualties:reaction.casualties,contactPrevented:reaction.preventsContact,
      contactCreated,attackExecuted:contactCreated,majorRemaining:next.round.active?.unitId===a && next.round.active.stage==='MAJOR',
      melee,pendingResolvers:clone(next.pendingResolvers)};
  });
}

// The condition/Rout/Pursuit owner must explicitly resolve the returned stages.
// No callback is supplied by default. Its attestation is a trace reference, not
// a cryptographic proof; only a trusted simulation adapter may call this bridge.
export function commitResolvedFrameConsequences(frame,command,adapters) {
  jsonData(command);shape(command,['operationId','expectedRevision','resolutionRef']);
  return transact(frame,command,'CONSEQUENCES',adapters.geometry,next=>{
    invariant(id(command.resolutionRef)&&next.pendingResolvers.length>0,'NO_PENDING_COMBAT_CONSEQUENCES');
    const resolved=rule(adapters,'resolveConsequences',next,command);
    shape(resolved,['completedResolvers','unitStateChanges','spaceUpdate','conditionResultRef']);
    invariant(equal(resolved.completedResolvers,next.pendingResolvers)&&id(resolved.conditionResultRef),'INCOMPLETE_CONSEQUENCE_RESOLUTION');
    unique(resolved.unitStateChanges,'unitId');
    for(const change of resolved.unitStateChanges){
      shape(change,['unitId','unitState']);
      // Casualties already committed; state changes cannot create/kill troops.
      invariant(change.unitState!=='ELIMINATED','CASUALTY_RESOLVER_REQUIRED');
      next.round=applyCombatUnitState(next.round,change);
      if(['EXITED','ELIMINATED'].includes(change.unitState))removeDeadContacts(next,change.unitId);
    }
    next.space=applyCombatSpaceUpdate(next.space,resolved.spaceUpdate,geometryFor(next,adapters.geometry));
    next.pendingResolvers=[];
    return {resolutionRef:command.resolutionRef,conditionResultRef:resolved.conditionResultRef};
  },true);
}

// Deliberately exposes only B's established grants. No troop counts, initiative,
// private receipts, raw hidden unit IDs or combat outcome predictions are added.
export function projectCombatActionFrame(frame,disclosure) {
  validateCombatActionFrame(frame);return projectCombatSpace(frame.space,disclosure);
}
export function serializeCombatActionFrame(frame,geometry) {return JSON.stringify(validateCombatActionFrame(frame,geometry));}
export function deserializeCombatActionFrame(text,geometry) {
  invariant(typeof text==='string','INVALID_FRAME_SERIALIZATION');return validateCombatActionFrame(JSON.parse(text),geometry);
}
