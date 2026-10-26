const VERSION='public-action-policy-v1';
const ID_PATTERN=/^[A-Za-z0-9._:-]+$/;
const TOP_LEVEL_KEYS=new Set(['availableActions','publicObservation','publicGoals','actionBudget','availabilityByActor']);
const OBSERVATION_KEYS=new Set(['observationId','knownPlanIds']);
const GOAL_KEYS=new Set(['goalId','priority']);
const ACTION_KEYS=new Set(['actionId','actorId','budgetCost','advancesGoalIds','countersKnownPlanIds']);
const BUDGET_KEYS=new Set(['status','remaining']);

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a stable ID`);return value;}
function uint(value,label){invariant(Number.isSafeInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function exactKeys(value,allowed,label){
  invariant(object(value),`${label} must be an object`);
  for(const key of Object.keys(value))invariant(allowed.has(key),`FORBIDDEN_${label.toUpperCase()}_FIELD:${key}`);
}
function uniqueIds(values,label){
  invariant(Array.isArray(values),`${label} must be an array`);
  const result=values.map((value,index)=>id(value,`${label}[${index}]`));
  invariant(new Set(result).size===result.length,`DUPLICATE_${label.toUpperCase()}`);
  return result.sort(compareId);
}
function compareId(left,right){return left<right?-1:left>right?1:0;}

function normalizeObservation(input){
  exactKeys(input,OBSERVATION_KEYS,'publicObservation');
  return {observationId:id(input.observationId,'observationId'),knownPlanIds:uniqueIds(input.knownPlanIds??[],'knownPlanIds')};
}

function normalizeGoals(input){
  invariant(Array.isArray(input),'publicGoals must be an array');
  const goals=input.map((goal,index)=>{
    exactKeys(goal,GOAL_KEYS,`publicGoal${index}`);
    return {goalId:id(goal.goalId,`publicGoals[${index}].goalId`),priority:uint(goal.priority,`publicGoals[${index}].priority`)};
  });
  invariant(new Set(goals.map(goal=>goal.goalId)).size===goals.length,'DUPLICATE_PUBLIC_GOAL');
  return goals.sort((left,right)=>right.priority-left.priority||compareId(left.goalId,right.goalId));
}

function normalizeActions(input){
  invariant(Array.isArray(input),'availableActions must be an array');
  const actions=input.map((action,index)=>{
    exactKeys(action,ACTION_KEYS,`availableAction${index}`);
    return {
      actionId:id(action.actionId,`availableActions[${index}].actionId`),
      actorId:id(action.actorId,`availableActions[${index}].actorId`),
      budgetCost:uint(action.budgetCost,`availableActions[${index}].budgetCost`),
      advancesGoalIds:uniqueIds(action.advancesGoalIds??[],`advancesGoalIds:${action.actionId}`),
      countersKnownPlanIds:uniqueIds(action.countersKnownPlanIds??[],`countersKnownPlanIds:${action.actionId}`),
    };
  });
  invariant(new Set(actions.map(action=>action.actionId)).size===actions.length,'DUPLICATE_AVAILABLE_ACTION');
  return actions.sort((left,right)=>compareId(left.actionId,right.actionId));
}

function normalizeBudget(input){
  exactKeys(input,BUDGET_KEYS,'actionBudget');
  invariant(input.status==='KNOWN'||input.status==='UNKNOWN','actionBudget.status must be KNOWN or UNKNOWN');
  if(input.status==='UNKNOWN'){
    invariant(input.remaining===undefined,'UNKNOWN_ACTION_BUDGET_MUST_NOT_INCLUDE_REMAINING');
    return {status:'UNKNOWN',remaining:null};
  }
  return {status:'KNOWN',remaining:uint(input.remaining,'actionBudget.remaining')};
}

function normalizeAvailability(input){
  invariant(object(input),'availabilityByActor must be an object');
  const result={};
  for(const actorId of Object.keys(input).sort(compareId)){
    id(actorId,'availability actorId');
    const status=input[actorId];
    invariant(['AVAILABLE','UNAVAILABLE','UNKNOWN'].includes(status),`INVALID_ACTOR_AVAILABILITY:${actorId}`);
    result[actorId]=status;
  }
  return result;
}

function candidateFor(action,{goalById,knownPlanIds,budget,availabilityByActor}){
  const unpublishedGoalIds=action.advancesGoalIds.filter(goalId=>!goalById.has(goalId));
  if(unpublishedGoalIds.length)return unknownCandidate(action,'UNPUBLISHED_GOAL_REFERENCE',unpublishedGoalIds);
  const unobservedPlanIds=action.countersKnownPlanIds.filter(planId=>!knownPlanIds.has(planId));
  if(unobservedPlanIds.length)return unknownCandidate(action,'UNOBSERVED_PLAN_REFERENCE',unobservedPlanIds);
  if(budget.status==='UNKNOWN')return unknownCandidate(action,'ACTION_BUDGET_UNKNOWN');
  const availability=availabilityByActor[action.actorId]??'UNKNOWN';
  if(availability==='UNKNOWN')return unknownCandidate(action,'ACTOR_AVAILABILITY_UNKNOWN');
  if(availability==='UNAVAILABLE')return blockedCandidate(action,'ACTOR_UNAVAILABLE');
  if(action.budgetCost>budget.remaining)return blockedCandidate(action,'ACTION_BUDGET_INSUFFICIENT');
  const matchedGoals=action.advancesGoalIds.map(goalId=>goalById.get(goalId));
  const highestGoalPriority=matchedGoals.length?Math.max(...matchedGoals.map(goal=>goal.priority)):-1;
  return {
    actionId:action.actionId,
    actorId:action.actorId,
    selectability:'SELECTABLE',
    reasonCode:'PUBLIC_INPUTS_COMPLETE',
    unresolvedRefs:[],
    basis:{
      highestGoalPriority,
      matchedGoalIds:matchedGoals.map(goal=>goal.goalId).sort(compareId),
      counteredKnownPlanIds:[...action.countersKnownPlanIds],
      budgetCost:action.budgetCost,
    },
  };
}

function unknownCandidate(action,reasonCode,unresolvedRefs=[]){
  return {actionId:action.actionId,actorId:action.actorId,selectability:'UNKNOWN',reasonCode,unresolvedRefs:[...unresolvedRefs].sort(compareId),basis:null};
}

function blockedCandidate(action,reasonCode){
  return {actionId:action.actionId,actorId:action.actorId,selectability:'UNSELECTABLE',reasonCode,unresolvedRefs:[],basis:null};
}

function compareCandidates(left,right){
  const a=left.basis,b=right.basis;
  if(a.highestGoalPriority!==b.highestGoalPriority)return b.highestGoalPriority-a.highestGoalPriority;
  if(a.counteredKnownPlanIds.length!==b.counteredKnownPlanIds.length)return b.counteredKnownPlanIds.length-a.counteredKnownPlanIds.length;
  if(a.matchedGoalIds.length!==b.matchedGoalIds.length)return b.matchedGoalIds.length-a.matchedGoalIds.length;
  if(a.budgetCost!==b.budgetCost)return a.budgetCost-b.budgetCost;
  return compareId(left.actionId,right.actionId);
}

export function selectPublicAction(input){
  exactKeys(input,TOP_LEVEL_KEYS,'policyInput');
  const observation=normalizeObservation(input.publicObservation);
  const goals=normalizeGoals(input.publicGoals);
  const actions=normalizeActions(input.availableActions);
  const budget=normalizeBudget(input.actionBudget);
  const availabilityByActor=normalizeAvailability(input.availabilityByActor);
  const goalById=new Map(goals.map(goal=>[goal.goalId,goal]));
  const knownPlanIds=new Set(observation.knownPlanIds);
  const candidates=actions.map(action=>candidateFor(action,{goalById,knownPlanIds,budget,availabilityByActor}));
  const selectable=candidates.filter(candidate=>candidate.selectability==='SELECTABLE').sort(compareCandidates);
  const hasUnknown=candidates.some(candidate=>candidate.selectability==='UNKNOWN');
  if(selectable.length){
    const selected=selectable[0];
    return {
      policyVersion:VERSION,
      observationId:observation.observationId,
      status:'SELECTED',
      reasonCode:'PUBLIC_POLICY_SELECTION',
      selectedActionId:selected.actionId,
      selectedActorId:selected.actorId,
      selectionBasis:structuredClone(selected.basis),
      candidates,
    };
  }
  return {
    policyVersion:VERSION,
    observationId:observation.observationId,
    status:hasUnknown?'UNKNOWN':actions.length?'NO_SELECTABLE_ACTION':'NO_AVAILABLE_ACTION',
    reasonCode:hasUnknown?'PUBLIC_INPUT_INCOMPLETE':actions.length?'ALL_ACTIONS_BLOCKED':'AVAILABLE_ACTIONS_EMPTY',
    selectedActionId:null,
    selectedActorId:null,
    selectionBasis:null,
    candidates,
  };
}

export const PUBLIC_ACTION_POLICY_VERSION=VERSION;
