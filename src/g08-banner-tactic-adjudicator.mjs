import {
  calculateCombatTick,
  validateCombatCalculatorState,
} from './combat-calculator.mjs';
import {hexDistance} from './map-primitives.mjs';

const FORMAT='sangoku-g08-banner-tactic-adjudicator';
const PROPOSAL_FORMAT='sangoku-g08-banner-morale-proposal';
const VERSION=1;
const ID_PATTERN=/^[A-Za-z0-9._:-]+$/;
const SOURCE_TROOP_TYPES=Object.freeze(['bow','militia','spear']);
const BASIC_TROOP_TYPES=Object.freeze(['bow','cavalry','engineer','militia','mystic','spear']);
const UNIT_STATUSES=new Set(['ACTIVE','DEFEATED','DISBANDED']);
const FORBIDDEN_CALLER_FIELDS=Object.freeze([
  'targetUnitId','targetUnitIds','targets','moraleBase','moraleRecovery',
  'moraleRecoveryAbility','traitRank','randomSeed','roll','duel',
]);

export const G08_BANNER_TACTIC_TRIAL=Object.freeze({
  status:'WORK_TRIAL_NOT_BALANCE_VALIDATED',
  officerId:'G08',
  factionId:'F03',
  traitId:'UT-G08',
  tacticId:'ART-G08',
  tacticName:'벽안의 군기',
  maximumTargets:2,
  adjacencyDistanceTiles:1,
  moraleBasePerTarget:8,
  moraleRecoveryAbility:50,
  sourceTroopTypes:SOURCE_TROOP_TYPES,
  targetTroopTypes:BASIC_TROOP_TYPES,
  selectionOrder:'UNIT_ID_ASC_DISTINCT_TROOP_TYPE',
});

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function own(value,key){return Object.hasOwn(value,key);}
function clone(value){return structuredClone(value);}
function same(left,right){return JSON.stringify(left)===JSON.stringify(right);}
function id(value,label){invariant(typeof value==='string'&&ID_PATTERN.test(value),`${label} must be a stable ID`);return value;}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function integer(value,label){invariant(Number.isInteger(value),`${label} must be an integer`);return value;}
function finite(value,label){invariant(Number.isFinite(value),`${label} must be finite`);return value;}
function nonnegative(value,label){finite(value,label);invariant(value>=0,`${label} must be non-negative`);return value;}
function bool(value,label){invariant(typeof value==='boolean',`${label} must be boolean`);return value;}

function point(value,label){
  invariant(object(value),`${label} must be an axial coordinate`);
  invariant(Number.isSafeInteger(value.q)&&Number.isSafeInteger(value.r),`${label} must contain safe integer q/r`);
  return {q:value.q,r:value.r};
}

function rejectCallerAuthority(input){
  for(const key of FORBIDDEN_CALLER_FIELDS)invariant(!own(input,key),`CALLER_${key.toUpperCase()}_NOT_ALLOWED`);
}

function rejectMultiOfficerOrDuelFields(input,unitId){
  for(const key of ['officerIds','commanderIds','deputyOfficerId','deputyOfficerIds','duelState','duelTargetId']){
    invariant(!own(input,key),`G08_ONE_OFFICER_NO_DUEL_CONTRACT:${unitId}:${key}`);
  }
}

function normalizeVisibleUnit(input,index){
  invariant(object(input),`unitSnapshots[${index}] must be an object`);
  const unitId=id(input.unitId,`unitSnapshots[${index}].unitId`);
  rejectMultiOfficerOrDuelFields(input,unitId);
  const factionId=id(input.factionId,`factionId:${unitId}`);
  const officerId=id(input.officerId,`officerId:${unitId}`);
  const troopType=id(input.troopType,`troopType:${unitId}`);
  invariant(BASIC_TROOP_TYPES.includes(troopType),`UNKNOWN_G08_BASIC_TROOP_TYPE:${unitId}`);
  const status=id(input.status,`status:${unitId}`);
  invariant(UNIT_STATUSES.has(status),`UNKNOWN_G08_UNIT_STATUS:${unitId}`);
  const activePersonnel=uint(input.activePersonnel,`activePersonnel:${unitId}`);
  const currentHp=nonnegative(input.currentHp,`currentHp:${unitId}`);
  const moraleMin=integer(input.moraleMin??0,`moraleMin:${unitId}`);
  const moraleMax=integer(input.moraleMax??100,`moraleMax:${unitId}`);
  invariant(moraleMin<moraleMax,`INVALID_G08_MORALE_RANGE:${unitId}`);
  const morale=integer(input.morale,`morale:${unitId}`);
  invariant(morale>=moraleMin&&morale<=moraleMax,`G08_MORALE_OUT_OF_RANGE:${unitId}`);
  return {
    unitId,
    factionId,
    officerId,
    troopType,
    status,
    tile:point(input.tile,`tile:${unitId}`),
    activePersonnel,
    currentHp,
    morale,
    moraleMin,
    moraleMax,
    routePending:bool(input.routePending,`routePending:${unitId}`),
  };
}

function normalizeUnitSnapshots(inputs,sourceUnitId){
  invariant(Array.isArray(inputs)&&inputs.length>0,'unitSnapshots must be a non-empty array');
  const headers=inputs.map((input,index)=>{
    invariant(object(input),`unitSnapshots[${index}] must be an object`);
    return {input,index,unitId:id(input.unitId,`unitSnapshots[${index}].unitId`),factionId:id(input.factionId,`unitSnapshots[${index}].factionId`)};
  });
  invariant(new Set(headers.map(item=>item.unitId)).size===headers.length,'DUPLICATE_G08_TARGET_OR_UNIT_ID');
  const sourceHeader=headers.find(item=>item.unitId===sourceUnitId);
  invariant(sourceHeader,`UNKNOWN_G08_SOURCE_UNIT:${sourceUnitId}`);
  const source=normalizeVisibleUnit(sourceHeader.input,sourceHeader.index);
  const allied=headers.filter(item=>item.factionId===source.factionId).map(item=>normalizeVisibleUnit(item.input,item.index)).sort((a,b)=>a.unitId.localeCompare(b.unitId));
  invariant(new Set(allied.map(item=>item.officerId)).size===allied.length,'G08_ONE_OFFICER_PER_UNIT_REQUIRED');
  return {source,allied};
}

function normalizeInput(input){
  invariant(object(input),'G08 banner adjudication input is required');
  rejectCallerAuthority(input);
  const sourceUnitId=id(input.sourceUnitId,'sourceUnitId');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'actionInstanceId'),
    currentTick:uint(input.currentTick,'currentTick'),
    sourceUnitId,
    sourceOfficerId:id(input.sourceOfficerId,'sourceOfficerId'),
    tacticId:id(input.tacticId,'tacticId'),
  };
  const {source,allied}=normalizeUnitSnapshots(input.unitSnapshots,sourceUnitId);
  return {...normalized,source,allied};
}

function normalizeStoredDecision(input){
  invariant(object(input),'stored G08 decision is required');
  const sourceUnitId=id(input.sourceUnitId,'stored decision sourceUnitId');
  const source=normalizeVisibleUnit(input.source,0);
  invariant(Array.isArray(input.allied)&&input.allied.length>0,'stored G08 allied units must be a non-empty array');
  const allied=input.allied.map((unit,index)=>normalizeVisibleUnit(unit,index)).sort((a,b)=>a.unitId.localeCompare(b.unitId));
  invariant(new Set(allied.map(unit=>unit.unitId)).size===allied.length,'DUPLICATE_STORED_G08_UNIT_ID');
  invariant(new Set(allied.map(unit=>unit.officerId)).size===allied.length,'STORED_G08_ONE_OFFICER_PER_UNIT_REQUIRED');
  invariant(allied.every(unit=>unit.factionId===source.factionId),'STORED_G08_ALLY_FACTION_MISMATCH');
  const canonicalSource=allied.find(unit=>unit.unitId===sourceUnitId);
  invariant(canonicalSource&&same(canonicalSource,source),'STORED_G08_SOURCE_SNAPSHOT_MISMATCH');
  const normalized={
    actionInstanceId:id(input.actionInstanceId,'stored decision actionInstanceId'),
    currentTick:uint(input.currentTick,'stored decision currentTick'),
    sourceUnitId,
    sourceOfficerId:id(input.sourceOfficerId,'stored decision sourceOfficerId'),
    tacticId:id(input.tacticId,'stored decision tacticId'),
    source,
    allied,
  };
  invariant(same(input,normalized),'NON_CANONICAL_STORED_G08_DECISION');
  const reason=sourceReason(normalized);
  invariant(reason===null,`INVALID_STORED_G08_SOURCE:${reason}`);
  return normalized;
}

function sourceReason(input){
  if(input.sourceOfficerId!==G08_BANNER_TACTIC_TRIAL.officerId)return 'G08_OFFICER_REQUIRED';
  if(input.tacticId!==G08_BANNER_TACTIC_TRIAL.tacticId)return 'ART_G08_REQUIRED';
  if(input.source.officerId!==G08_BANNER_TACTIC_TRIAL.officerId)return 'G08_SOURCE_UNIT_REQUIRED';
  if(input.source.factionId!==G08_BANNER_TACTIC_TRIAL.factionId)return 'G08_FACTION_REQUIRED';
  if(input.source.status!=='ACTIVE'||input.source.activePersonnel===0||input.source.currentHp===0)return 'G08_SOURCE_NOT_ACTIVE';
  if(input.source.routePending)return 'G08_SOURCE_ROUTING';
  if(!SOURCE_TROOP_TYPES.includes(input.source.troopType))return 'G08_SOURCE_TROOP_NOT_ALLOWED';
  return null;
}

function eligibleTargets(input){
  const eligible=input.allied.filter(unit=>
    unit.unitId!==input.sourceUnitId&&
    unit.status==='ACTIVE'&&
    unit.activePersonnel>0&&
    unit.currentHp>0&&
    !unit.routePending&&
    unit.troopType!==input.source.troopType&&
    unit.morale<unit.moraleMax&&
    hexDistance(input.source.tile,unit.tile)===G08_BANNER_TACTIC_TRIAL.adjacencyDistanceTiles
  );
  const selected=[],troopTypes=new Set();
  for(const unit of eligible){
    if(troopTypes.has(unit.troopType))continue;
    selected.push(unit);troopTypes.add(unit.troopType);
    if(selected.length===G08_BANNER_TACTIC_TRIAL.maximumTargets)break;
  }
  return selected;
}

function calculatorUnitMatches(snapshot,calculatorUnit){
  return calculatorUnit&&
    calculatorUnit.activePersonnel===snapshot.activePersonnel&&
    calculatorUnit.currentHp===snapshot.currentHp&&
    calculatorUnit.morale===snapshot.morale&&
    calculatorUnit.moraleMin===snapshot.moraleMin&&
    calculatorUnit.moraleMax===snapshot.moraleMax&&
    calculatorUnit.routePending===snapshot.routePending;
}

function transactionId(state,input){return `G08.BANNER.${state.battleId}.${input.currentTick}.${input.actionInstanceId}`;}

function validateProposal(proposal,battleId){
  invariant(object(proposal)&&proposal.format===PROPOSAL_FORMAT&&proposal.version===VERSION,'UNSUPPORTED_G08_BANNER_PROPOSAL_VERSION');
  invariant(proposal.balanceStatus===G08_BANNER_TACTIC_TRIAL.status,'INVALID_G08_BANNER_BALANCE_STATUS');
  id(proposal.transactionId,'proposal.transactionId');id(proposal.battleId,'proposal.battleId');
  invariant(proposal.battleId===battleId,'G08_PROPOSAL_BATTLE_SCOPE_MISMATCH');
  uint(proposal.currentTick,'proposal.currentTick');id(proposal.actionInstanceId,'proposal.actionInstanceId');
  invariant(proposal.transactionId===`G08.BANNER.${battleId}.${proposal.currentTick}.${proposal.actionInstanceId}`,'G08_TRANSACTION_ID_MISMATCH');
  invariant(same(proposal.source,{sourceId:`G08.SOURCE.${proposal.source.sourceUnitId}.G08`,sourceUnitId:proposal.source.sourceUnitId,sourceOfficerId:'G08',sourceFactionId:'F03',traitId:'UT-G08',tacticId:'ART-G08'}),'INVALID_G08_PROPOSAL_SOURCE');
  invariant(proposal.selectionPolicy===G08_BANNER_TACTIC_TRIAL.selectionOrder,'INVALID_G08_SELECTION_POLICY');
  invariant(Array.isArray(proposal.targetEffects)&&proposal.targetEffects.length>0&&proposal.targetEffects.length<=2,'INVALID_G08_TARGET_COUNT');
  const targetIds=proposal.targetEffects.map(item=>id(item.targetUnitId,'targetEffect.targetUnitId'));
  invariant(new Set(targetIds).size===targetIds.length,'DUPLICATE_G08_PROPOSAL_TARGET');
  invariant(same(targetIds,[...targetIds].sort()),'NON_CANONICAL_G08_TARGET_ORDER');
  invariant(new Set(proposal.targetEffects.map(item=>item.troopType)).size===proposal.targetEffects.length,'DUPLICATE_G08_TARGET_TROOP_TYPE');
  invariant(object(proposal.calculatorInput)&&proposal.calculatorInput.currentTick===proposal.currentTick&&Array.isArray(proposal.calculatorInput.attacks)&&proposal.calculatorInput.attacks.length===0&&Array.isArray(proposal.calculatorInput.supports),'INVALID_G08_CALCULATOR_INPUT');
  invariant(proposal.calculatorInput.supports.length===proposal.targetEffects.length,'G08_SUPPORT_TARGET_COUNT_MISMATCH');
  invariant(object(proposal.coordinatorEntry)&&proposal.coordinatorEntry.actorRef===proposal.source.sourceUnitId&&proposal.coordinatorEntry.actionInstanceId===proposal.actionInstanceId,'INVALID_G08_COORDINATOR_ENTRY');
  invariant(Array.isArray(proposal.coordinatorEntry.appliedResults)&&proposal.coordinatorEntry.appliedResults.length===proposal.targetEffects.length,'G08_COORDINATOR_TARGET_COUNT_MISMATCH');
  for(let index=0;index<proposal.targetEffects.length;index++){
    const effect=proposal.targetEffects[index],support=proposal.calculatorInput.supports[index],applied=proposal.coordinatorEntry.appliedResults[index];
    id(effect.troopType,`targetEffects[${index}].troopType`);
    const moraleBefore=integer(effect.moraleBefore,`targetEffects[${index}].moraleBefore`),moraleAfter=integer(effect.moraleAfter,`targetEffects[${index}].moraleAfter`),moraleMin=integer(effect.moraleMin,`targetEffects[${index}].moraleMin`),moraleMax=integer(effect.moraleMax,`targetEffects[${index}].moraleMax`),moraleDelta=integer(effect.moraleDelta,`targetEffects[${index}].moraleDelta`);
    invariant(moraleMin<moraleMax&&moraleBefore>=moraleMin&&moraleBefore<moraleMax,'INVALID_G08_TARGET_MORALE_BEFORE');
    invariant(moraleDelta===Math.min(G08_BANNER_TACTIC_TRIAL.moraleBasePerTarget,moraleMax-moraleBefore)&&moraleAfter===moraleBefore+moraleDelta,'INVALID_G08_MORALE_PROJECTION');
    invariant(same(support,{actorRef:proposal.source.sourceUnitId,actionInstanceId:proposal.actionInstanceId,targetRef:effect.targetUnitId,hpHealCoefficient:0,recoveryAbility:0,woundedHealLimit:0,moraleBase:8,moraleRecoveryAbility:50}),'INVALID_G08_SUPPORT_PROPOSAL');
    invariant(effect.resultId===`${proposal.actionInstanceId}/${effect.targetUnitId}/${index}`,'INVALID_G08_RESULT_ID');
    invariant(same(applied,{resultId:effect.resultId,personnelDamage:0,moraleDelta,healedActive:0,beneficialDelta:moraleDelta,controlApplied:false,routePending:false}),'INVALID_G08_COORDINATOR_RESULT');
  }
  invariant(Array.isArray(proposal.casualtyAllocations),'G08_CASUALTY_ALLOCATIONS_REQUIRED');
  return true;
}

function validateDecisionProposalCrossReference(decision,proposal){
  invariant(proposal.actionInstanceId===decision.actionInstanceId,'G08_DECISION_PROPOSAL_ACTION_MISMATCH');
  invariant(proposal.currentTick===decision.currentTick,'G08_DECISION_PROPOSAL_TICK_MISMATCH');
  invariant(proposal.source.sourceUnitId===decision.sourceUnitId&&proposal.source.sourceOfficerId===decision.sourceOfficerId&&proposal.source.tacticId===decision.tacticId,'G08_DECISION_PROPOSAL_SOURCE_MISMATCH');
  const selected=eligibleTargets(decision);
  invariant(selected.length>0,'STORED_G08_DECISION_HAS_NO_ELIGIBLE_TARGETS');
  invariant(selected.length===proposal.targetEffects.length,'G08_DECISION_PROPOSAL_TARGET_COUNT_MISMATCH');
  for(let index=0;index<selected.length;index++){
    const target=selected[index],effect=proposal.targetEffects[index];
    invariant(effect.targetUnitId===target.unitId&&effect.troopType===target.troopType,`G08_DECISION_PROPOSAL_TARGET_MISMATCH:${index}`);
    invariant(effect.moraleBefore===target.morale&&effect.moraleMin===target.moraleMin&&effect.moraleMax===target.moraleMax,`G08_DECISION_PROPOSAL_MORALE_SNAPSHOT_MISMATCH:${target.unitId}`);
    const expectedDelta=Math.min(G08_BANNER_TACTIC_TRIAL.moraleBasePerTarget,target.moraleMax-target.morale);
    invariant(effect.moraleDelta===expectedDelta&&effect.moraleAfter===target.morale+expectedDelta,`G08_DECISION_PROPOSAL_MORALE_RESULT_MISMATCH:${target.unitId}`);
    const allocation=proposal.casualtyAllocations[index];
    invariant(same(allocation,{resultId:effect.resultId,woundedGain:0,deadGain:0,hpTracked:true,hpDamage:0,hpHealing:0,targetRef:target.unitId,beforeCurrentHp:target.currentHp,beforeMaxHp:target.activePersonnel*2,afterCurrentHp:target.currentHp,afterMaxHp:target.activePersonnel*2}),`G08_DECISION_PROPOSAL_HP_ALLOCATION_MISMATCH:${target.unitId}`);
  }
  invariant(proposal.casualtyAllocations.length===selected.length,'G08_DECISION_PROPOSAL_ALLOCATION_COUNT_MISMATCH');
  return true;
}

function buildProposal(state,input,calculatorState,targets){
  const supports=targets.map(target=>({
    actorRef:input.sourceUnitId,
    actionInstanceId:input.actionInstanceId,
    targetRef:target.unitId,
    hpHealCoefficient:0,
    recoveryAbility:0,
    woundedHealLimit:0,
    moraleBase:G08_BANNER_TACTIC_TRIAL.moraleBasePerTarget,
    moraleRecoveryAbility:G08_BANNER_TACTIC_TRIAL.moraleRecoveryAbility,
  }));
  const calculatorInput={currentTick:input.currentTick,attacks:[],supports};
  const calculated=calculateCombatTick(calculatorState,calculatorInput);
  invariant(calculated.output.coordinatorEntries.length===1,'G08_EXPECTED_ONE_COORDINATOR_ENTRY');
  const coordinatorEntry=calculated.output.coordinatorEntries[0];
  invariant(coordinatorEntry.actionInstanceId===input.actionInstanceId,'G08_CALCULATOR_ACTION_MISMATCH');
  const appliedByTarget=new Map(coordinatorEntry.appliedResults.map(result=>{
    const parts=result.resultId.split('/');
    return [parts.at(-2),result];
  }));
  const targetEffects=targets.map(target=>{
    const after=calculated.state.units[target.unitId],applied=appliedByTarget.get(target.unitId);
    invariant(after&&applied,'G08_CALCULATOR_TARGET_RESULT_MISSING');
    invariant(after.morale-target.morale===applied.moraleDelta,'G08_CALCULATOR_MORALE_PROJECTION_MISMATCH');
    return {targetUnitId:target.unitId,troopType:target.troopType,resultId:applied.resultId,moraleBefore:target.morale,moraleDelta:applied.moraleDelta,moraleAfter:after.morale,moraleMin:target.moraleMin,moraleMax:target.moraleMax};
  });
  const proposal={
    format:PROPOSAL_FORMAT,
    version:VERSION,
    balanceStatus:G08_BANNER_TACTIC_TRIAL.status,
    transactionId:transactionId(state,input),
    battleId:state.battleId,
    currentTick:input.currentTick,
    actionInstanceId:input.actionInstanceId,
    source:{sourceId:`G08.SOURCE.${input.sourceUnitId}.G08`,sourceUnitId:input.sourceUnitId,sourceOfficerId:'G08',sourceFactionId:'F03',traitId:'UT-G08',tacticId:'ART-G08'},
    selectionPolicy:G08_BANNER_TACTIC_TRIAL.selectionOrder,
    targetEffects,
    calculatorInput,
    coordinatorEntry:clone(coordinatorEntry),
    casualtyAllocations:clone(calculated.output.casualtyAllocations),
  };
  validateProposal(proposal,state.battleId);
  return proposal;
}

export function createG08BannerTacticAdjudicatorState({battleId,actions={}}={}){
  const state={schemaVersion:VERSION,battleId:id(battleId,'battleId'),actions:clone(actions)};
  validateG08BannerTacticAdjudicatorState(state);
  return state;
}

export function adjudicateG08BannerTactic(state,input={}){
  validateG08BannerTacticAdjudicatorState(state);
  validateCombatCalculatorState(input.combatCalculatorState);
  invariant(input.combatCalculatorState.battleId===state.battleId,'G08_CALCULATOR_BATTLE_SCOPE_MISMATCH');
  const normalized=normalizeInput(input),reason=sourceReason(normalized);
  invariant(reason===null,`G08_ACTION_UNAVAILABLE:${reason}`);
  const sourceCalculator=input.combatCalculatorState.units[normalized.sourceUnitId];
  invariant(calculatorUnitMatches(normalized.source,sourceCalculator),'G08_SOURCE_CALCULATOR_SNAPSHOT_MISMATCH');
  const targets=eligibleTargets(normalized);
  invariant(targets.length>0,'G08_NO_ELIGIBLE_TARGETS');
  for(const target of targets)invariant(calculatorUnitMatches(target,input.combatCalculatorState.units[target.unitId]),`G08_TARGET_CALCULATOR_SNAPSHOT_MISMATCH:${target.unitId}`);
  const proposal=buildProposal(state,normalized,input.combatCalculatorState,targets);
  const decision={actionInstanceId:normalized.actionInstanceId,currentTick:normalized.currentTick,sourceUnitId:normalized.sourceUnitId,sourceOfficerId:normalized.sourceOfficerId,tacticId:normalized.tacticId,source:normalized.source,allied:normalized.allied};
  const decisionFingerprint=JSON.stringify(decision),proposalFingerprint=JSON.stringify(proposal),existing=state.actions[normalized.actionInstanceId];
  if(existing){
    invariant(existing.decisionFingerprint===decisionFingerprint&&existing.proposalFingerprint===proposalFingerprint,`CONFLICTING_G08_BANNER_REPLAY:${normalized.actionInstanceId}`);
    return {state:clone(state),proposal:clone(existing.proposal),replayed:true};
  }
  const next=clone(state);
  next.actions[normalized.actionInstanceId]={actionInstanceId:normalized.actionInstanceId,decision,decisionFingerprint,proposal,proposalFingerprint};
  validateG08BannerTacticAdjudicatorState(next);
  return {state:next,proposal:clone(proposal),replayed:false};
}

export function validateG08BannerTacticAdjudicatorState(state){
  invariant(object(state)&&state.schemaVersion===VERSION,'UNSUPPORTED_G08_BANNER_ADJUDICATOR_STATE_VERSION');
  id(state.battleId,'battleId');invariant(object(state.actions),'G08 adjudicator actions are required');
  for(const[actionInstanceId,record]of Object.entries(state.actions)){
    id(actionInstanceId,'G08 actionInstanceId');invariant(object(record)&&record.actionInstanceId===actionInstanceId,`G08_ACTION_KEY_MISMATCH:${actionInstanceId}`);
    invariant(object(record.decision)&&record.decision.actionInstanceId===actionInstanceId,'INVALID_G08_DECISION_RECORD');
    const decision=normalizeStoredDecision(record.decision);
    invariant(record.decisionFingerprint===JSON.stringify(decision),`G08_DECISION_FINGERPRINT_MISMATCH:${actionInstanceId}`);
    validateProposal(record.proposal,state.battleId);
    invariant(record.proposalFingerprint===JSON.stringify(record.proposal),`G08_PROPOSAL_FINGERPRINT_MISMATCH:${actionInstanceId}`);
    validateDecisionProposalCrossReference(decision,record.proposal);
  }
  return true;
}

export function serializeG08BannerTacticAdjudicatorState(state){
  validateG08BannerTacticAdjudicatorState(state);
  return JSON.stringify({format:FORMAT,version:VERSION,state:clone(state)});
}

export function deserializeG08BannerTacticAdjudicatorState(serialized){
  invariant(typeof serialized==='string'&&serialized.length>0,'serialized G08 adjudicator state is required');
  let envelope;try{envelope=JSON.parse(serialized);}catch{throw new Error('INVALID_G08_BANNER_ADJUDICATOR_JSON');}
  invariant(object(envelope)&&envelope.format===FORMAT&&envelope.version===VERSION,'UNSUPPORTED_G08_BANNER_ADJUDICATOR_ENVELOPE');
  validateG08BannerTacticAdjudicatorState(envelope.state);
  return clone(envelope.state);
}

export const G08_BANNER_TACTIC_ADJUDICATOR_VERSION=VERSION;
export const G08_BANNER_MORALE_PROPOSAL_FORMAT=PROPOSAL_FORMAT;
