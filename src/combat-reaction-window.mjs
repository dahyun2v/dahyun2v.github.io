// 20 §§9.1-9.2. Eligibility is a trusted rule input, not inferred from names,
// distance or allegiance. Refusal never delegates a capable target's priority.
import {validateCombatRound, consumeCombatReaction} from './combat-round.mjs';
import {invariant, jsonData, shape, id, clone, truth} from './contract-data.mjs';

export function eligibleCombatReactors(round, request, adapters) {
  jsonData(round); validateCombatRound(round); jsonData(request);
  shape(request,['triggerId','directTargetId','interceptorIds','chainDepth']);
  invariant(id(request.triggerId) && id(request.directTargetId) && Object.hasOwn(round.units,request.directTargetId),'INVALID_REACTION_TARGET');
  invariant(Array.isArray(request.interceptorIds) && request.interceptorIds.every(id)
    && new Set(request.interceptorIds).size === request.interceptorIds.length
    && request.interceptorIds.every(x => x !== request.directTargetId && Object.hasOwn(round.units,x)), 'INVALID_INTERCEPTOR_IDS');
  invariant(request.chainDepth === 0,'REACTION_CHAIN_LIMIT');
  invariant(round.phase !== 'ROUND_ACTIONS_COMPLETE','ROUND_REACTIONS_CLOSED');
  invariant(!round.reactedTriggerIds.includes(request.triggerId),'TRIGGER_ALREADY_HAS_REACTION');
  const available = unitId => round.units[unitId].state === 'COMMANDABLE' && round.units[unitId].reactionRemaining > 0;
  if (available(request.directTargetId) && truth(adapters,'canReact',round,request,request.directTargetId)) return [request.directTargetId];
  return request.interceptorIds.filter(unitId => available(unitId) && truth(adapters,'canIntercept',round,request,unitId));
}

// This function commits only the capacity debit of an ALREADY resolved reaction.
// Pure callers stage effect resolution first, then commit both states together.
export function commitSelectedCombatReaction(round, request, selection, adapters) {
  jsonData(selection); shape(selection,['unitId','executed']);
  invariant(typeof selection.executed === 'boolean','INVALID_REACTION_SELECTION');
  const candidates = eligibleCombatReactors(round,request,adapters);
  if (!selection.executed) {
    invariant(selection.unitId === null || candidates.includes(selection.unitId),'INVALID_REACTION_SELECTION');
    return {round:clone(round), reactorId:null, executed:false};
  }
  invariant(candidates.includes(selection.unitId),'REACTION_PRIORITY_OR_ELIGIBILITY');
  return {
    round:consumeCombatReaction(round,{unitId:selection.unitId,triggerId:request.triggerId,chainDepth:0,executed:true}),
    reactorId:selection.unitId,executed:true,
  };
}
