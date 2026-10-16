// 20 §§21–23 and 32 §9.1. This closes an externally resolved battle, not the
// legacy campaign. Officer death/capture, population damage and rewards remain
// outside this result boundary. No winner is inferred from faction inequality.
import {validateCombatRound,markCombatRoundDecided} from './combat-round.mjs';
import {validateCombatActionFrame} from './combat-action-frame.mjs';
import {invariant,jsonData,shape,unique,id,amount,clone,canonical,equal} from './contract-data.mjs';

export function createBattleClosure({battleId,initialTroops,participantUnitIds}) {
  const state={format:'combat-battle-closure-v1',battleId,state:'ACTIVE',initialTroops:clone(initialTroops),participantUnitIds:clone(participantUnitIds),
    decisionRef:null,pendingCleanupIds:[],completedCleanup:[],result:null};
  return validateBattleClosure(state);
}
export function validateBattleClosure(state) {
  jsonData(state);shape(state,['format','battleId','state','initialTroops','participantUnitIds','decisionRef','pendingCleanupIds','completedCleanup','result']);
  invariant(state.format==='combat-battle-closure-v1' && id(state.battleId) && ['ACTIVE','DECIDED','ENDED'].includes(state.state),'INVALID_BATTLE_CLOSURE');
  invariant(Array.isArray(state.participantUnitIds)&&state.participantUnitIds.length>0&&state.participantUnitIds.every(id)&&new Set(state.participantUnitIds).size===state.participantUnitIds.length,'INVALID_PARTICIPANTS');
  unique(state.initialTroops,'unitId');
  invariant(equal(state.initialTroops.map(x=>x.unitId).sort(),[...state.participantUnitIds].sort()),'INITIAL_TROOP_COVERAGE');
  for(const u of state.initialTroops){shape(u,['unitId','count']);invariant(amount(u.count),'INVALID_INITIAL_TROOPS');}
  invariant(Array.isArray(state.pendingCleanupIds)&&Array.isArray(state.completedCleanup),'INVALID_CLEANUP_IDS');
  unique(state.completedCleanup,'cleanupId');
  for(const ack of state.completedCleanup){shape(ack,['cleanupId','resolutionRef']);invariant(id(ack.resolutionRef),'INVALID_CLEANUP_ACK');}
  const all=[...state.pendingCleanupIds,...state.completedCleanup.map(r=>r.cleanupId)];
  invariant(all.every(id)&&new Set(all).size===all.length,'INVALID_CLEANUP_IDS');
  invariant(state.state==='ACTIVE' ? state.decisionRef===null&&all.length===0&&state.result===null : id(state.decisionRef),'INVALID_DECISION_REF');
  invariant((state.state==='ENDED') === (state.result!==null),'INVALID_CLOSURE_RESULT');
  if(state.result!==null){
    validateBattleEndSnapshot(state.result);
    invariant(state.pendingCleanupIds.length===0&&state.result.battleId===state.battleId&&state.result.decisionRef===state.decisionRef,'INVALID_FINISHED_CLOSURE');
    invariant(equal(state.result.units.map(u=>u.unitId).sort(),[...state.participantUnitIds].sort()),'RESULT_PARTICIPANT_COVERAGE');
    invariant(state.result.units.every(u=>state.initialTroops.find(x=>x.unitId===u.unitId).count===u.preBattleCount),'RESULT_INITIAL_COUNT_MISMATCH');
  }
  return state;
}
export function decideBattleClosure(closure,round,{decisionRef,pendingCleanupIds}) {
  validateBattleClosure(closure);jsonData(round);validateCombatRound(round);
  jsonData({decisionRef,pendingCleanupIds});invariant(id(decisionRef),'DECISION_SOURCE_REQUIRED');
  if(closure.state!=='ACTIVE'){
    invariant(closure.state==='DECIDED'&&closure.decisionRef===decisionRef&&equal([...closure.pendingCleanupIds,...closure.completedCleanup.map(r=>r.cleanupId)].sort(),[...pendingCleanupIds].sort())&&round.phase==='DECIDED','BATTLE_ALREADY_DECIDED');
    return {closure:clone(closure),round:clone(round),replayed:true};
  }
  invariant(equal(Object.keys(round.units).sort(),[...closure.participantUnitIds].sort()),'BATTLE_PARTICIPANT_COVERAGE');
  const next={...clone(closure),state:'DECIDED',decisionRef,pendingCleanupIds:clone(pendingCleanupIds)};
  validateBattleClosure(next);return {closure:next,round:markCombatRoundDecided(round),replayed:false};
}
// Cleanup IDs are supplied by the owning Rout/Pursuit/Exit resolver. Completing
// one means that the owner already committed its effects. No fake movement here.
export function acknowledgeBattleCleanup(closure,{cleanupId,resolutionRef}) {
  validateBattleClosure(closure);invariant(closure.state==='DECIDED'&&id(cleanupId)&&id(resolutionRef),'INVALID_CLEANUP_ACK');
  const previous=closure.completedCleanup.find(r=>r.cleanupId===cleanupId);
  if(previous){invariant(previous.resolutionRef===resolutionRef,'CLEANUP_ACK_CONFLICT');return clone(closure);}
  invariant(closure.pendingCleanupIds.includes(cleanupId),'UNKNOWN_CLEANUP');
  const next=clone(closure);next.pendingCleanupIds=next.pendingCleanupIds.filter(x=>x!==cleanupId);next.completedCleanup.push({cleanupId,resolutionRef});
  return validateBattleClosure(next);
}
export function validateBattleEndSnapshot(result) {
  jsonData(result);shape(result,['format','battleId','decisionRef','sourceRevision','units']);
  invariant(result.format==='combat-battle-result-v1'&&id(result.battleId)&&id(result.decisionRef)&&amount(result.sourceRevision),'INVALID_BATTLE_RESULT');
  unique(result.units,'unitId');invariant(result.units.length>0,'EMPTY_BATTLE_RESULT');
  for(const u of result.units){
    shape(u,['unitId','preBattleCount','postBattleCount','casualties','unitState']);
    invariant(amount(u.preBattleCount)&&amount(u.postBattleCount)&&amount(u.casualties)&&u.preBattleCount===u.postBattleCount+u.casualties,'BATTLE_CASUALTY_CONSERVATION');
    invariant(['COMMANDABLE','ROUTING','EXITED','ELIMINATED'].includes(u.unitState)&&((u.postBattleCount===0)===(u.unitState==='ELIMINATED')),'RESULT_UNIT_STATE_MISMATCH');
  }return result;
}
export function finalizeBattleClosure(closure,frame) {
  validateBattleClosure(closure);validateCombatActionFrame(frame);
  invariant(frame.battleId===closure.battleId && frame.round.phase==='DECIDED','BATTLE_NOT_DECIDED');
  invariant(equal(frame.troops.map(x=>x.unitId).sort(),[...closure.participantUnitIds].sort()),'BATTLE_PARTICIPANT_COVERAGE');
  invariant(closure.pendingCleanupIds.length===0&&frame.pendingResolvers.length===0,'BATTLE_CLEANUP_PENDING');
  invariant(closure.state==='DECIDED'||closure.state==='ENDED','BATTLE_NOT_DECIDED');
  // ROUTING must have been resolved to Exit/Elimination before an end snapshot.
  invariant(Object.values(frame.round.units).every(u=>u.state!=='ROUTING'),'UNRESOLVED_ROUTING_UNIT');
  const result=validateBattleEndSnapshot({format:'combat-battle-result-v1',battleId:closure.battleId,decisionRef:closure.decisionRef,sourceRevision:frame.revision,
    units:closure.initialTroops.map(u=>({unitId:u.unitId,preBattleCount:u.count,postBattleCount:frame.troops.find(x=>x.unitId===u.unitId).count,
      casualties:u.count-frame.troops.find(x=>x.unitId===u.unitId).count,unitState:frame.round.units[u.unitId].state}))});
  if(closure.state==='ENDED'){invariant(canonical(result)===canonical(closure.result),'FINAL_RESULT_CHANGED');return clone(closure);}
  return validateBattleClosure({...clone(closure),state:'ENDED',result});
}
export function serializeBattleClosure(state){return JSON.stringify(validateBattleClosure(state));}
export function deserializeBattleClosure(text){invariant(typeof text==='string','INVALID_CLOSURE_SERIALIZATION');return validateBattleClosure(JSON.parse(text));}
