// 20_COMBAT_CORE_STANDARD v2.0, sections 6–9, 13 and 20–22.
// Pure activation scheduling only. Spatial legality, action resolution, rout
// movement, recovery and battle/campaign results belong to their own callers.
const UNIT_STATES = new Set(['COMMANDABLE','ROUTING','EXITED','ELIMINATED']);
const MAJOR_ACTIONS = new Set(['ATTACK','TACTIC','STRATAGEM','BRACE','REGROUP','DISENGAGE','TACTICAL_RETREAT','ENGINEER_OBJECT']);
const invariant = (condition, reason) => { if (!condition) throw new Error(reason); };
const copy = value => structuredClone(value);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const validId = id => typeof id === 'string' && id.length > 0;

export function validateCombatRound(state) {
  invariant(state?.format === 'combat-round-v1', 'INVALID_ROUND_FORMAT');
  invariant(Number.isSafeInteger(state.roundNumber) && state.roundNumber > 0, 'INVALID_ROUND_NUMBER');
  invariant(['ACTIVATIONS','ROUND_ACTIONS_COMPLETE','DECIDED'].includes(state.phase), 'INVALID_ROUND_PHASE');
  invariant(isRecord(state.units) && Array.isArray(state.initiativeOrder), 'INVALID_ROUND_UNITS');
  invariant(Array.isArray(state.normalQueue) && Array.isArray(state.waitQueue), 'INVALID_QUEUE_SHAPE');
  invariant(state.active === null || isRecord(state.active), 'INVALID_ACTIVE_SHAPE');
  const ids = Object.keys(state.units);
  invariant(ids.length > 0 && ids.every(validId) && [...state.initiativeOrder,...state.normalQueue,...state.waitQueue].every(validId), 'INVALID_UNIT_ID_SHAPE');
  invariant(new Set(state.initiativeOrder).size === state.initiativeOrder.length, 'DUPLICATE_INITIATIVE_UNIT');
  invariant(state.initiativeOrder.every(id => ids.includes(id)), 'UNKNOWN_INITIATIVE_UNIT');
  for (const [id,unit] of Object.entries(state.units)) {
    invariant(isRecord(unit), 'INVALID_UNIT_RECORD');
    invariant(UNIT_STATES.has(unit.state), 'INVALID_UNIT_STATE');
    invariant(Number.isSafeInteger(unit.reactionRemaining) && unit.reactionRemaining >= 0 && unit.reactionRemaining <= 1, 'INVALID_REACTION_CAPACITY');
    invariant(unit.state === 'COMMANDABLE' || unit.reactionRemaining === 0, 'INACTIVE_UNIT_HAS_REACTION');
    invariant(typeof unit.waited === 'boolean' && typeof unit.activationClosed === 'boolean', 'INVALID_UNIT_ROUND_FLAGS');
    invariant(unit.state === 'COMMANDABLE' || unit.activationClosed, 'INACTIVE_UNIT_ACTIVATION_OPEN');
    invariant(!unit.waited || state.initiativeOrder.includes(id), 'WAITED_UNIT_NOT_IN_INITIATIVE');
  }
  if (state.active) invariant(validId(state.active.unitId), 'INVALID_ACTIVE_UNIT_ID');
  const scheduled = [...state.normalQueue, ...state.waitQueue, ...(state.active ? [state.active.unitId] : [])];
  invariant(new Set(scheduled).size === scheduled.length, 'DUPLICATE_ACTIVATION');
  invariant(scheduled.every(id => state.initiativeOrder.includes(id) && state.units[id].state === 'COMMANDABLE' && !state.units[id].activationClosed), 'INVALID_QUEUED_UNIT');
  const rank = id => state.initiativeOrder.indexOf(id);
  invariant(state.normalQueue.every((id,i) => i === 0 || rank(state.normalQueue[i-1]) < rank(id)), 'NORMAL_ORDER_CHANGED');
  invariant(state.waitQueue.every((id,i) => state.units[id].waited && (i === 0 || rank(state.waitQueue[i-1]) < rank(id))), 'WAIT_ORDER_CHANGED');
  invariant(state.normalQueue.every(id => !state.units[id].waited), 'WAITED_UNIT_IN_NORMAL_QUEUE');
  const openIds = ids.filter(id => state.units[id].state === 'COMMANDABLE' && !state.units[id].activationClosed);
  invariant(openIds.length === scheduled.length && openIds.every(id => scheduled.includes(id)), 'ACTIVATION_COVERAGE_MISMATCH');
  if (state.active) {
    invariant(['NORMAL','WAIT'].includes(state.active.queue) && ['MOVEMENT','MAJOR'].includes(state.active.stage), 'INVALID_ACTIVATION');
    invariant(state.units[state.active.unitId].waited === (state.active.queue === 'WAIT'), 'ACTIVE_WAIT_FLAG_MISMATCH');
    if (state.active.queue === 'NORMAL') {
      invariant(state.normalQueue.every(id => rank(state.active.unitId) < rank(id)), 'ACTIVE_NORMAL_ORDER_CHANGED');
    } else {
      invariant(state.normalQueue.length === 0, 'WAIT_STARTED_BEFORE_NORMALS_COMPLETE');
      invariant(state.waitQueue.every(id => rank(state.active.unitId) < rank(id)), 'ACTIVE_WAIT_ORDER_CHANGED');
    }
  }
  const pendingNormal = [...state.normalQueue,...(state.active?.queue === 'NORMAL' ? [state.active.unitId] : [])];
  invariant(state.waitQueue.every(id => pendingNormal.every(normalId => rank(id) < rank(normalId))), 'WAIT_QUEUED_BEFORE_ITS_NORMAL_TURN');
  if (state.phase !== 'ACTIVATIONS') invariant(scheduled.length === 0, 'CLOSED_ROUND_HAS_ACTIVATION');
  invariant(Array.isArray(state.majorActions) && state.majorActions.every(a => isRecord(a) && validId(a.unitId)), 'INVALID_MAJOR_ACTION_RECORD');
  invariant(new Set(state.majorActions.map(a => a.unitId)).size === state.majorActions.length, 'DUPLICATE_MAJOR_ACTION');
  for (const action of state.majorActions) invariant(state.initiativeOrder.includes(action.unitId) && state.units[action.unitId]?.activationClosed && MAJOR_ACTIONS.has(action.action), 'INVALID_MAJOR_ACTION_RECORD');
  invariant(Array.isArray(state.reactedTriggerIds) && state.reactedTriggerIds.every(validId), 'INVALID_REACTION_TRIGGER_IDS');
  invariant(new Set(state.reactedTriggerIds).size === state.reactedTriggerIds.length, 'DUPLICATE_REACTION_TRIGGER');
  return state;
}

export function createCombatRound({roundNumber, units, initiativeOrder}) {
  invariant(Array.isArray(units) && units.length > 0 && units.every(u => typeof u.unitId === 'string' && u.unitId.length && UNIT_STATES.has(u.state)), 'INVALID_ROUND_UNITS');
  invariant(new Set(units.map(u => u.unitId)).size === units.length, 'DUPLICATE_UNIT');
  const commandable = units.filter(u => u.state === 'COMMANDABLE').map(u => u.unitId).sort();
  // The caller supplies the resolved order. No invented initiative formula or
  // unapproved tie-break rule is hidden in this scheduler.
  invariant(Array.isArray(initiativeOrder) && JSON.stringify([...initiativeOrder].sort()) === JSON.stringify(commandable), 'INITIATIVE_ORDER_MUST_COVER_COMMANDABLE_UNITS');
  return validateCombatRound({
    format:'combat-round-v1', roundNumber, phase:'ACTIVATIONS',
    units:Object.fromEntries(units.map(u => [u.unitId,{state:u.state,reactionRemaining:u.state === 'COMMANDABLE' ? 1 : 0,waited:false,activationClosed:u.state !== 'COMMANDABLE'}])),
    initiativeOrder:[...initiativeOrder], normalQueue:[...initiativeOrder], waitQueue:[],
    active:null, majorActions:[], reactedTriggerIds:[],
  });
}

function update(state, operation) {
  validateCombatRound(state);
  const next = copy(state);
  operation(next);
  return validateCombatRound(next);
}

export function beginNextActivation(state) {
  return update(state, next => {
    invariant(next.phase === 'ACTIVATIONS' && next.active === null, 'ACTIVATION_CANNOT_START');
    const queue = next.normalQueue.length ? 'NORMAL' : 'WAIT';
    const unitId = (queue === 'NORMAL' ? next.normalQueue : next.waitQueue).shift();
    if (!unitId) { next.phase = 'ROUND_ACTIONS_COMPLETE'; return; }
    next.active = {unitId,queue,stage:'MOVEMENT'};
  });
}

export function waitCombatActivation(state) {
  return update(state, next => {
    const active = next.active;
    invariant(next.phase === 'ACTIVATIONS' && active?.queue === 'NORMAL' && active.stage === 'MOVEMENT' && !next.units[active.unitId].waited, 'WAIT_REQUIRES_UNMOVED_NORMAL_ACTIVATION');
    next.units[active.unitId].waited = true;
    next.waitQueue.push(active.unitId);
    next.waitQueue.sort((a,b) => next.initiativeOrder.indexOf(a) - next.initiativeOrder.indexOf(b));
    next.active = null;
  });
}

// Called once movement is committed (including a zero-distance movement stage).
// Control-footprint entry may end movement early; that geometry is not inferred.
export function finishCombatMovement(state) {
  return update(state, next => {
    invariant(next.phase === 'ACTIVATIONS' && next.active?.stage === 'MOVEMENT', 'MOVEMENT_STAGE_NOT_ACTIVE');
    next.active.stage = 'MAJOR';
  });
}

// Consumes an already legally resolved major action, not its combat effects.
export function finishCombatMajorAction(state, {action}) {
  return update(state, next => {
    invariant(next.phase === 'ACTIVATIONS' && next.active?.stage === 'MAJOR', 'MAJOR_STAGE_NOT_ACTIVE');
    invariant(MAJOR_ACTIONS.has(action), 'UNSUPPORTED_MAJOR_ACTION');
    const unitId = next.active.unitId;
    next.units[unitId].activationClosed = true;
    next.majorActions.push({unitId,action});
    next.active = null;
  });
}

// Contact, direct-target priority and intercept selection are caller-owned.
// Only an actually executed, legally selected reaction consumes capacity.
export function consumeCombatReaction(state, {unitId,triggerId,chainDepth=0,executed}) {
  return update(state, next => {
    invariant(next.phase !== 'ROUND_ACTIONS_COMPLETE', 'ROUND_REACTIONS_CLOSED');
    invariant(next.units[unitId]?.state === 'COMMANDABLE', 'REACTION_UNIT_NOT_COMMANDABLE');
    invariant(typeof triggerId === 'string' && triggerId.length > 0 && typeof executed === 'boolean', 'INVALID_REACTION_REQUEST');
    invariant(chainDepth === 0, 'REACTION_CHAIN_LIMIT');
    invariant(!next.reactedTriggerIds.includes(triggerId), 'TRIGGER_ALREADY_HAS_REACTION');
    invariant(next.units[unitId].reactionRemaining > 0, 'REACTION_CAPACITY_EXHAUSTED');
    if (!executed) return;
    next.units[unitId].reactionRemaining--;
    next.reactedTriggerIds.push(triggerId);
  });
}

export function applyCombatUnitState(state, {unitId,unitState}) {
  return update(state, next => {
    const unit = Object.hasOwn(next.units,unitId) ? next.units[unitId] : null;
    invariant(unit && UNIT_STATES.has(unitState), 'INVALID_UNIT_STATE_TRANSITION');
    invariant(!['EXITED','ELIMINATED'].includes(unit.state), 'REMOVED_UNIT_CANNOT_RETURN_THIS_ROUND');
    invariant(unitState !== 'COMMANDABLE' || unit.state === 'ROUTING', 'RALLY_REQUIRES_ROUTING');
    unit.state = unitState;
    if (unitState !== 'COMMANDABLE') {
      unit.reactionRemaining = 0;
      unit.activationClosed = true;
      next.normalQueue = next.normalQueue.filter(id => id !== unitId);
      next.waitQueue = next.waitQueue.filter(id => id !== unitId);
      if (next.active?.unitId === unitId) next.active = null;
    }
    // Rally does not reinsert this unit or restore an already lost activation.
  });
}

export function markCombatRoundDecided(state) {
  return update(state, next => {
    next.phase = 'DECIDED';
    for (const id of [...next.normalQueue,...next.waitQueue,...(next.active?[next.active.unitId]:[])]) next.units[id].activationClosed = true;
    next.normalQueue = []; next.waitQueue = []; next.active = null;
    // Remaining legal Pursuit reactions can still be consumed during cleanup.
  });
}

export function serializeCombatRound(state) { return JSON.stringify(validateCombatRound(state)); }
export function deserializeCombatRound(serialized) { return validateCombatRound(JSON.parse(serialized)); }
