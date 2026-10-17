import {
  applyFieldInspectionEvidence,
  failActiveAssignment,
  getAssignmentStartHistoryProposal,
  startFieldInspectionAssignment,
  STRATEGIC_ASSIGNMENT_TRIAL,
  validateStrategicAssignmentState,
} from './strategic-assignments.mjs';

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function invariant(condition,message){if(!condition)throw new Error(message);}

function validateProposal(proposal){
  invariant(object(proposal)&&proposal.operationType==='FIELD_INSPECTION','INVALID_FIELD_INSPECTION_PROPOSAL');
  for(const key of ['proposalId','opportunityId','originatingChoiceId','factionId','actorCharacterId','actorArmyId'])invariant(typeof proposal[key]==='string'&&proposal[key],`FIELD_INSPECTION_PROPOSAL_FIELD_REQUIRED:${key}`);
  invariant(Array.isArray(proposal.sourceEventIds)&&proposal.sourceEventIds.length===1&&typeof proposal.sourceEventIds[0]==='string'&&proposal.sourceEventIds[0],'FIELD_INSPECTION_SINGLE_SOURCE_REQUIRED');
  invariant(object(proposal.targetPlaceRef)&&proposal.targetPlaceRef.type==='TILE'&&typeof proposal.targetPlaceRef.id==='string'&&proposal.targetPlaceRef.id,'FIELD_INSPECTION_TILE_TARGET_REQUIRED');
  invariant(Number.isSafeInteger(proposal.openTick)&&proposal.openTick>=0&&proposal.startByTick===proposal.openTick+STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionStartWindowTicks,'FIELD_INSPECTION_START_WINDOW_MISMATCH');
  invariant(proposal.completionWindowTicks===STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionCompletionWindowTicks&&proposal.inspectionTicks===STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionConfirmationTicks,'FIELD_INSPECTION_TRIAL_VALUE_MISMATCH');
  return proposal;
}

export function admitFieldInspection(state,{eventId,orderId,assignmentId,proposal,actorHasPendingCombatAction=false}={}){
  validateStrategicAssignmentState(state);validateProposal(proposal);
  invariant(actorHasPendingCombatAction===false,'FIELD_INSPECTION_ACTOR_HAS_PENDING_COMBAT_ACTION');
  return startFieldInspectionAssignment(state,{eventId,orderId,assignmentId,factionId:proposal.factionId,characterId:proposal.actorCharacterId,armyId:proposal.actorArmyId,causeEventId:proposal.sourceEventIds[0],targetTileId:proposal.targetPlaceRef.id,sourceEventGlobalTick:proposal.openTick});
}

export function recordFieldInspectionTick(state,evidence={}){
  validateStrategicAssignmentState(state);
  return applyFieldInspectionEvidence(state,evidence);
}

export function failFieldInspection(state,input={}){
  validateStrategicAssignmentState(state);const assignment=state.assignments[input.assignmentId];invariant(assignment?.type==='FIELD_INSPECTION',`UNKNOWN_FIELD_INSPECTION:${input.assignmentId}`);
  return failActiveAssignment(state,input);
}

export function getFieldInspectionStartHistoryProposal(state,{assignmentId}={}){
  validateStrategicAssignmentState(state);const assignment=state.assignments[assignmentId];invariant(assignment?.type==='FIELD_INSPECTION',`UNKNOWN_FIELD_INSPECTION:${assignmentId}`);
  return clone(getAssignmentStartHistoryProposal(state,{assignmentId}));
}

export function validateFieldInspectionProposal(proposal){return clone(validateProposal(proposal));}

export const FIELD_OPERATION_TRIAL=Object.freeze({
  cost:STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionCost,
  startWindowTicks:STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionStartWindowTicks,
  completionWindowTicks:STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionCompletionWindowTicks,
  confirmationTicks:STRATEGIC_ASSIGNMENT_TRIAL.fieldInspectionConfirmationTicks,
});
