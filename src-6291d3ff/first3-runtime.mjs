import {createG07CommandCoordinationState,issueG07CommandCoordination,proposeG07CoordinatedBasicAttack,consumeG07CommandCoordination,validateG07CommandCoordinationState} from './g07-command-coordination.mjs';
import {createG08BannerTacticAdjudicatorState,adjudicateG08BannerTactic,validateG08BannerTacticAdjudicatorState} from './g08-banner-tactic-adjudicator.mjs';
import {planFirst3StrategicAiRuntimePublicBatch,quoteFirst3StrategicAiPublicIdentityBatch} from './first3-strategic-ai-runtime-adapter.mjs';
import {quoteFirst3StrategicAiPublicMovementBatch} from './first3-strategic-ai-public-movement-quote.mjs';
import {quoteFirst3StrategicAiPublicAttackBatch} from './first3-strategic-ai-public-attack-quote.mjs';
import {selectCampaignTerminalAiChoiceResolutionInputs} from './campaign-terminal-ai-choice-selector.mjs';
import {
  SAVE_VERSION,
  executeTicks,
  exportSave,
  getFactionView,
  importSave,
  validateState,
} from './first3.mjs';
import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';
import {createCampaignTerminalStateFromWorld} from './campaign-terminal-world.mjs';
import {applyCampaignTerminalStateToWorld,validateCampaignTerminalWorldApplication,synchronizeCampaignTerminalWorldRoster} from './campaign-terminal-world-application.mjs';
import {settleConfirmedCampaignTerminalBatch} from './campaign-terminal-batch-settlement.mjs';
import {adjudicateCampaignRuntimeDefeatSignals} from './campaign-runtime-defeat-adapter.mjs';
import {createCampaignRuntimeCityCapturePayloads} from './campaign-runtime-city-capture-adapter.mjs';
import {createCampaignMovementCompletionRecord,createCampaignRuntimeMovementCityCapturePayloads} from './campaign-runtime-movement-city-capture-adapter.mjs';
import {projectCampaignTerminalPublicView} from './campaign-terminal-public-view.mjs';
import {resolveCampaignTerminalChoice} from './campaign-terminal-choice-resolution.mjs';
import {updateKnowledge} from './knowledge.mjs';
import {issueOrder} from './movement.mjs';
import {boardNeighbors,hexDistance,tileId} from './map-primitives.mjs';
import {createActionLifecycleState} from './action-lifecycle.mjs';
import {
  createCombatResolverState,
  executeCombatAction,
  quoteCombatAction,
  reserveCombatAction,
} from './combat-resolver.mjs';
import {
  createCombatCoordinatorState,
  mergeSameTickCombatResults,
  validateCombatCoordinatorState,
} from './combat-coordinator.mjs';
import {
  applyCoordinatorBatch,
  createBattleDeltaState,
  validateBattleDeltaState,
} from './battle-delta-applier.mjs';
import {
  calculateCombatTick,
  createCombatCalculatorState,
  validateCombatCalculatorState,
} from './combat-calculator.mjs';
import {
  createLosSaveBinding,
  queryCanonicalLineOfSight,
  queryKnownLineOfSight,
  restoreLosSaveBinding,
} from './los-rules.mjs';
import {
  appendHistoryEvent,
  createHistoryLedger,
  getFactionKnowledgeProjection,
  normalizePendingHistoryEventProposal,
  recordFactionKnowledge,
  validateHistoryLedger,
} from './history-ledger.mjs';
import {
  applyKnownHistoryEvent,
  createCharacterHistoryState,
  getCharacterHistoryProjection,
  validateCharacterHistoryState,
} from './character-history.mjs';
import {applyTrackedDraftAction,createGrowthTrack,registerGrowthTrackCharacter,validateGrowthTrack} from './growth-track.mjs';
import {
  applyVerifiedGrowthSource,
  createGrowthProgressState,
  registerGrowthProgressCharacter,
  validateGrowthProgressState,
} from './growth-progress.mjs';
import {
  createStrategicAssignmentWorldSnapshot,
  admitStrategicWorldFieldInspection,
  getStrategicWorldStartHistoryProposal,
  startStrategicWorldTraining,
  strategicLocationToHistoryPlaceRef,
  synchronizeStrategicAssignmentWorld,
  validateStrategicAssignmentWorldSnapshot,
  STRATEGIC_ASSIGNMENT_WORLD_FORMAT,
  STRATEGIC_ASSIGNMENT_WORLD_VERSION,
} from './strategic-assignment-world.mjs';
import {
  acknowledgeAssignmentResultEvent,
  advanceStrategicAssignmentTime,
  failActiveAssignment,
  validateStrategicAssignmentState,
} from './strategic-assignments.mjs';
import {
  completeBasicTroopReorganizationWorld,
  swapGovernorAndCommanderWorld,
} from './g03-field-transition.mjs';
import {failFieldInspection,recordFieldInspectionTick} from './field-operation.mjs';
import {
  createPostBattleOpportunityState,
  selectPostBattleOpportunity,
  validatePostBattleOpportunityState,
} from './post-battle-opportunity.mjs';
import {
  createCitySettlementWorldSnapshot,
  deriveCityTurnEconomy,
  settleCityWorldTurn,
  validateCitySettlementWorldSnapshot,
} from './city-settlement-world.mjs';
import {settleCityTurn} from './city-settlement.mjs';
import {
  acknowledgeRecruitmentWorldRosterDelta,
  cancelRecruitmentWorldProposal,
  createRecruitmentWorldSnapshot,
  openRecruitmentWorldCommandPhase,
  prepareRecruitmentWorldRosterDelta,
  reserveRecruitmentWorldProposal,
  resolveRecruitmentWorldAgreements,
  validateRecruitmentWorldSnapshot,
} from './recruitment-world.mjs';
import {applyRecruitmentTravelEvent} from './recruitment.mjs';
import {
  advanceExternalRecruitCandidates,
  createExternalRecruitCandidates,
  markExternalRecruitRostered,
  startExternalRecruitTravel,
  validateExternalRecruitCandidates,
} from './external-recruit-candidates.mjs';
import {
  advanceCombatConditionLedger,
  createCombatConditionLedger,
  getActiveCombatConditions,
  getMovementProgressPermilleForUnit,
  validateCombatConditionLedger,
} from './combat-condition-ledger.mjs';
import {
  G21_CONFUSION_TACTIC_TRIAL,
  acknowledgeG21ConfusionCoordinatorMerge,
  createG21ConfusionTacticState,
  evaluateConfusionActionPermission,
  interruptReservedG21ConfusionTactic,
  quoteG21ConfusionTactic,
  reserveG21ConfusionTactic,
  resolveG21ConfusionTactic,
} from './g21-confusion-tactic.mjs';
import {
  G03_SLOW_TACTIC_TRIAL,
  acknowledgeG03SlowCoordinatorMerge,
  createG03SlowTacticState,
  interruptReservedG03SlowTacticForConfusion,
  quoteG03SlowTactic,
  reserveG03SlowTactic,
  resolveG03SlowTactic,
} from './g03-slow-tactic.mjs';
import {
  cancelDetachmentPreparationWorld,
  completeDetachmentPreparationWorld,
  createDetachmentPreparationSnapshot,
  invalidateDetachmentPreparationWorld,
  scheduleDetachmentPreparation,
  synchronizeDetachmentPreparationWorld,
  validateDetachmentPreparationSnapshot,
} from './detachment-preparation.mjs';
import {
  deriveWorldArmyCombatRegistration,
  registerWorldArmyInCombat,
} from './combat-unit-registration.mjs';

const FORMAT='sangoku-first3-runtime';
const VERSION=2;
const MAX_SERIALIZED_LENGTH=8_000_000;
const ATTACK_EVENTS=['ATTACK_STARTED','ATTACK_HIT','DAMAGE_TAKEN','MORALE_CHANGED','ROUT_PENDING'];
const BASE={ownerSystem:'TROOP_COMBAT',definitionVersion:'BaseActionRegistry/I2-R3/1',preparedConsumption:'NONE'};

export const FIRST3_RUNTIME_SAVE_KEY='sangoku-first3-runtime-v2';
export const FIRST3_RUNTIME_V1_SAVE_KEY='sangoku-first3-runtime-v1';
export const FIRST3_RUNTIME_FORMAT=FORMAT;
export const FIRST3_RUNTIME_VERSION=VERSION;
export const FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION=1;
export const G21_RUNTIME_CONTROL_RESOLUTION_TRIAL=Object.freeze({
  status:'WORK_TRIAL',
  tacticId:'ART-G21',
  attackerSubStat:'모략',
  defenderSubStat:'간파',
  baseChancePercent:50,
  percentPerPoint:1,
  minimumChancePercent:15,
  maximumChancePercent:85,
  rollMinimum:1,
  rollMaximum:100,
  deterministicInput:'campaignSeed+actionInstanceId+ART-G21',
});
export const FIRST3_ACTION_DEFINITIONS=Object.freeze({
  BASIC_ATTACK:Object.freeze({...BASE,actionId:'BASIC_ATTACK',allowedTroopTypes:Object.freeze(['bow','cavalry','engineer','militia','mystic','spear']),staminaCost:0,windupTicks:8,recoveryTicks:12,cooldownTicks:0,eventProfile:'ATTACK',semanticTags:Object.freeze([]),losPolicy:'NONE',emitEventNames:Object.freeze(ATTACK_EVENTS)}),
  CAVALRY_CHARGE:Object.freeze({...BASE,actionId:'CAVALRY_CHARGE',allowedTroopTypes:Object.freeze(['cavalry']),staminaCost:18,windupTicks:4,recoveryTicks:16,cooldownTicks:40,eventProfile:'ATTACK',semanticTags:Object.freeze(['CHARGE']),losPolicy:'NONE',emitEventNames:Object.freeze(ATTACK_EVENTS)}),
  RANGED_VOLLEY:Object.freeze({...BASE,actionId:'RANGED_VOLLEY',allowedTroopTypes:Object.freeze(['bow']),staminaCost:0,windupTicks:10,recoveryTicks:10,cooldownTicks:0,eventProfile:'ATTACK',semanticTags:Object.freeze(['RANGED']),losPolicy:'CLEAR_REQUIRED',emitEventNames:Object.freeze(ATTACK_EVENTS)}),
});

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function uint(value,label){invariant(Number.isInteger(value)&&value>=0,`${label} must be a non-negative integer`);return value;}
function id(value,label){invariant(typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value),`${label} must be a stable ID`);return value;}
function own(value,key){return Object.hasOwn(value,key);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function ids(value){return Object.keys(value).sort();}
function campaignId(world){return `${world.scenarioId}:${world.campaignSeed}`;}
function stableToken(value){
  let hash=0xcbf29ce484222325n;
  for(const character of value){hash^=BigInt(character.codePointAt(0));hash=BigInt.asUintN(64,hash*0x100000001b3n);}
  return hash.toString(16).padStart(16,'0');
}
function runtimeTacticSourceIntegrityFingerprint(runtime,command){
  let source;
  if(command.commandType==='G21_CONFUSION_TACTIC')source={
    sourceOfficerId:command.g21AdapterAction?.command?.sourceOfficerId,
    sourceTroopType:command.g21AdapterAction?.command?.sourceTroopType,
    traitRank:command.g21AdapterAction?.command?.traitRank,
  };
  else if(command.commandType==='G03_SLOW_TACTIC')source=clone(command.g03SourceProfile);
  else throw new Error(`RUNTIME_TACTIC_SOURCE_FINGERPRINT_UNSUPPORTED:${command.actionId}`);
  return stableToken(JSON.stringify({campaignId:campaignId(runtime.world),actionInstanceId:command.actionInstanceId,actorRef:command.actorRef,actionId:command.actionId,issuedGlobalTick:command.issuedGlobalTick,source}));
}
function initializeCommandIntegrityFingerprints(runtime){
  for(const commandId of runtime.commandOrder??[]){
    const command=runtime.commands?.[commandId];
    if(!command||!['G21_CONFUSION_TACTIC','G03_SLOW_TACTIC'].includes(command.commandType)||own(command,'sourceIntegrityFingerprint'))continue;
    command.sourceIntegrityFingerprint=runtimeTacticSourceIntegrityFingerprint(runtime,command);
  }
  return runtime;
}
function historyEventId(phase,actionInstanceId){return `HIST.${phase}.${stableToken(actionInstanceId)}`;}
function historyKnowledgeId(eventId,factionId){return `${eventId}.K.${factionId}`;}
function runtimeHistoryPhase(event){return event?.outcome?.details?.phase??null;}
const VISUAL_GRAMMAR_REF='docs/세력-생물모티프-디자인문법-v1.md';

function growthCharacters(world,growthPool){
  const characterId=growthPool?.firstUseCharacter?.characterId,coreTraitId=growthPool?.firstUseCharacter?.coreTraitId;
  const officer=world.officers[characterId],core=growthPool?.traits?.find(trait=>trait.traitId===coreTraitId);
  invariant(officer&&core&&officer.uniqueTrait?.id===coreTraitId,'RUNTIME_GROWTH_FIRST_CHARACTER_MISMATCH');
  return {[characterId]:{controllerType:officer.allegianceFactionId===world.playerFactionId?'PLAYER':'AI',coreTraitId,affinityTags:[...(core.affinityTags??[])],level:officer.level,aptitudePoints:officer.aptitudePoints}};
}

function integrationSlots(growthTrack,citySettlement,citySettlementPendingEconomy=null,recruitment=null){return {
  recruitment:recruitment?'CONNECTED_EXTERNAL_CANDIDATE_TRAVEL':'NOT_CONNECTED',citySettlement:citySettlement?'CONNECTED_ACTUAL_TURN_SETTLEMENT':citySettlementPendingEconomy?'PENDING_NEXT_TURN_BOUNDARY':'NOT_CONNECTED_ECONOMY_REQUIRED',characterScene:'NOT_CONNECTED',
  combatConditions:'CONNECTED_VERSIONED_LEDGER',
  detachmentPreparation:'CONNECTED_VERSIONED_SIDECAR',
  g21ConfusionTactic:'CONNECTED_WORK_TRIAL_RUNTIME',
  g03FieldTransition:'CONNECTED_WORK_TRIAL_RUNTIME',
  g03SlowTactic:'CONNECTED_WORK_TRIAL_RUNTIME',
  historyLedger:'CONNECTED',characterHistory:'CONNECTED',
  strategicAssignments:'CONNECTED_TRAINING',
  growthTrack:growthTrack?'CONNECTED_VERIFIED_TRAINING_XP':'NOT_CONNECTED_POOL_REQUIRED',
  visualGrammar:{status:'REFERENCE_ONLY_ASSETS_NOT_APPLIED',sourceRefs:[VISUAL_GRAMMAR_REF,'docs/work-integration/20260920/round-04/ux.md']},
};}

function runtimeHistoryEvent(runtime,command,phase){
  if(isIdentityRuntimeCommand(command))return runtimeIdentityHistoryEvent(runtime,command,phase);
  const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
  const actor=runtime.world.armies[command.actorRef],target=runtime.world.armies[command.targetRef];
  const start=phase==='START',cancelled=instance.status==='CANCELLED';
  const eventId=historyEventId(phase,command.actionInstanceId);
  return {
    eventId,
    schemaVersion:1,
    campaignId:campaignId(runtime.world),
    globalTick:start?command.issuedGlobalTick:instance.execution.tick,
    placeRef:{type:'TILE',id:start?(command.pathTileIds[0]??actor.tileId):(cancelled?actor.tileId:target.tileId)},
    actorIds:[actor.commanderId],
    targetIds:[target.commanderId],
    participantIds:[command.actorRef,command.targetRef].sort(),
    factionIds:[actor.factionId,target.factionId].sort(),
    causeEventIds:start?[]:[historyEventId('START',command.actionInstanceId)],
    producer:'FIRST3_RUNTIME',
    actionType:start?`${command.actionId}_START`:'BATTLE_RESULT',
    outcome:start
      ?{status:'CONFIRMED',tags:['COMMAND_ACCEPTED',command.actionId].sort(),loserFactionIds:[],details:{phase:'START'}}
      :{status:cancelled?'FAILED':'SUCCEEDED',tags:['BATTLE_RESULT','COMBAT_RESULT',cancelled?'COMMAND_CANCELLED':'COMBAT_ACTION_COMMITTED',command.actionId].sort(),loserFactionIds:[],details:{phase:'RESULT',actionId:command.actionId,...(command.g07Coordination?{coordination:clone(command.g07Coordination)}:{})}},
    importance:'STANDARD',
    contentVersion:FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION,
  };
}

function runtimeG03HistoryEvent(runtime,command,phase){
  const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
  const actor=runtime.world.armies[command.actorRef],start=phase==='START',cancelled=instance.status==='CANCELLED';
  const targetRefs=start?[]:(command.g03Result?.targetResults??[]).map(result=>result.targetUnitId).filter(targetRef=>runtime.world.armies[targetRef]).sort();
  const targets=targetRefs.map(targetRef=>runtime.world.armies[targetRef]);
  const eventId=historyEventId(phase,command.actionInstanceId);
  const whiff=!start&&!cancelled&&command.g03Result?.resolution==='WHIFF';
  return {
    eventId,
    schemaVersion:1,
    campaignId:campaignId(runtime.world),
    globalTick:start?command.issuedGlobalTick:instance.execution.tick,
    placeRef:{type:'TILE',id:command.areaTileIds[0]},
    actorIds:[actor.commanderId],
    targetIds:targets.map(target=>target.commanderId).sort(),
    participantIds:[command.actorRef,...targetRefs].sort(),
    factionIds:[...new Set([actor.factionId,...targets.map(target=>target.factionId)])].sort(),
    causeEventIds:start?[]:[historyEventId('START',command.actionInstanceId)],
    producer:'FIRST3_RUNTIME',
    actionType:start?'ART-G03_START':'BATTLE_RESULT',
    outcome:start
      ?{status:'CONFIRMED',tags:['ART-G03','COMMAND_ACCEPTED'],loserFactionIds:[],details:{phase:'START'}}
      :{status:cancelled?'FAILED':whiff?'PARTIAL':'SUCCEEDED',tags:['ART-G03','BATTLE_RESULT','COMBAT_RESULT',cancelled?'COMMAND_CANCELLED':whiff?'NO_EFFECT':'COMBAT_ACTION_COMMITTED'].sort(),loserFactionIds:[],details:{phase:'RESULT',actionId:'ART-G03'}},
    importance:'STANDARD',
    contentVersion:FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION,
  };
}

function appendRuntimeHistory(runtime,event,{actorFactionId,targetFactionId=null,targetRevealedFields=null}={}){
  runtime.historyLedger=appendHistoryEvent(runtime.historyLedger,event);
  const actorFields=['placeRef','actorIds','factionIds','producer','actionType','outcome','importance','contentVersion'];
  const records=[{factionId:actorFactionId,revealedFields:actorFields}];
  if(targetFactionId&&targetFactionId!==actorFactionId)records.push({factionId:targetFactionId,revealedFields:targetRevealedFields??['placeRef','targetIds','factionIds','producer','actionType','outcome','importance','contentVersion']});
  for(const record of records){
    const resolution={visibility:'PARTICIPANT',status:event.outcome.status};
    if(event.outcome.details?.phase)resolution.phase=event.outcome.details.phase;
    if(event.outcome.details?.actionId)resolution.actionId=event.outcome.details.actionId;
    runtime.historyLedger=recordFactionKnowledge(runtime.historyLedger,{
      knowledgeId:historyKnowledgeId(event.eventId,record.factionId),
      eventId:event.eventId,
      factionId:record.factionId,
      learnedAtTick:event.globalTick,
      evidenceSourceId:event.eventId,
      revealedFields:record.revealedFields,
      resolution,
    });
  }
}

function appendRuntimeG03History(runtime,event,{actorFactionId,targetFactionIds=[]}={}){
  runtime.historyLedger=appendHistoryEvent(runtime.historyLedger,event);
  const records=[{
    factionId:actorFactionId,
    revealedFields:['placeRef','actorIds','factionIds','producer','actionType','outcome','importance','contentVersion'],
  }];
  for(const factionId of [...new Set(targetFactionIds)].filter(value=>value!==actorFactionId).sort())records.push({
    factionId,
    revealedFields:['placeRef','producer','actionType','outcome','importance','contentVersion'],
  });
  for(const record of records)runtime.historyLedger=recordFactionKnowledge(runtime.historyLedger,{
    knowledgeId:historyKnowledgeId(event.eventId,record.factionId),
    eventId:event.eventId,
    factionId:record.factionId,
    learnedAtTick:event.globalTick,
    evidenceSourceId:event.eventId,
    revealedFields:record.revealedFields,
    resolution:{visibility:'PARTICIPANT',status:event.outcome.status,phase:event.outcome.details.phase,...(event.outcome.details.actionId?{actionId:event.outcome.details.actionId}:{})},
  });
}

function mapAssignmentCampaign(assignments,targetCampaignId){
  const mapped=clone(assignments);
  mapped.campaignId=targetCampaignId;
  for(const proposal of Object.values(mapped.pendingResultEvents))proposal.campaignId=targetCampaignId;
  return mapped;
}

function assignmentSnapshot(world,assignments){
  return {
    format:STRATEGIC_ASSIGNMENT_WORLD_FORMAT,
    version:STRATEGIC_ASSIGNMENT_WORLD_VERSION,
    world:clone(world),
    assignments:mapAssignmentCampaign(assignments,world.scenarioId),
  };
}

function createRuntimeAssignments(world){
  const state=createStrategicAssignmentWorldSnapshot({world}).assignments;
  return mapAssignmentCampaign(state,campaignId(world));
}

function runtimeAssignmentState(world,assignments){return mapAssignmentCampaign(assignments,campaignId(world));}
function runtimeAssignmentProposal(world,proposal){return {...clone(proposal),campaignId:campaignId(world)};}

function campaignMapping(world){return {
  worldScenarioId:world.scenarioId,
  runtimeCampaignId:campaignId(world),
  assignmentCampaignId:campaignId(world),
  strategy:'ADAPTER_BOUNDARY_CAMPAIGN_BRIDGE',
};}

function storyLocation(runtime,character){
  if(character.armyRef){const army=runtime.world.armies[character.armyRef];return {type:'TILE',id:army.tileId};}
  if(character.locationRef.startsWith('CITY:')){const city=runtime.world.cities[character.locationRef.slice(5)];return {type:'TILE',id:city.tileId};}
  if(character.locationRef==='NONE')return {type:'TILE',id:runtime.world.cities[runtime.world.factions[character.factionId].capitalCityId].tileId};
  throw new Error(`RUNTIME_STORY_LOCATION_UNAVAILABLE:${character.characterId}`);
}

function storyRoster(runtime,factionId){
  return Object.fromEntries(Object.entries(runtime.strategicAssignments.characters).filter(([,character])=>character.factionId===factionId).map(([characterId,character])=>{
    const fieldCommander=character.roles.includes('FIELD_COMMANDER')&&character.armyRef!==null;
    return [characterId,{
      characterId,
      factionId,
      armyRef:character.armyRef,
      locationRef:storyLocation(runtime,character),
      alive:character.lifeState==='ALIVE',
      available:character.lifeState==='ALIVE'&&character.injuryState==='FIT'&&character.captivityState==='FREE'&&character.assignmentId===null&&character.busyUntilGlobalTick<=runtime.committedGlobalTick,
      personalityTags:[],
      situationTags:fieldCommander?['FIELD_COMMANDER','HAS_ARMY']:[],
    }];
  }));
}

function openPostBattleOpportunity(runtime,{factionId,eventId}){
  const selected=selectPostBattleOpportunity(runtime.postBattleOpportunities,{
    requestId:`R5.PBO.${stableToken(`${factionId}:${eventId}`)}`,
    factionId,
    currentTurn:runtime.world.turnNumber,
    currentTick:runtime.committedGlobalTick,
    ledger:runtime.historyLedger,
    characters:storyRoster(runtime,factionId),
  });
  runtime.postBattleOpportunities=selected.state;
  return selected.decision;
}

function recoverPostBattleOpportunities(runtime){
  for(const eventId of runtime.historyLedger.eventOrder){
    const event=runtime.historyLedger.eventsById[eventId];
    if(event.actionType!=='BATTLE_RESULT'||runtime.committedGlobalTick-event.globalTick>200)continue;
    const knowingFactions=[...new Set(Object.values(runtime.historyLedger.knowledgeById).filter(record=>record.eventId===eventId).map(record=>record.factionId))].sort();
    for(const factionId of knowingFactions)openPostBattleOpportunity(runtime,{factionId,eventId});
  }
}

export function getGlobalTick(world){
  validateState(world);
  return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;
}

function runtimeArmyIsActive(runtime,armyId){
  return !runtime.world.campaignTerminalWorld||runtime.world.campaignTerminalWorld.armiesById[armyId]?.disposition==='ACTIVE';
}

function hasActionablePlayerTerminalChoice(runtime){
  return (runtime.campaignTerminal?.choiceOrder??[]).some(choiceId=>{const choice=runtime.campaignTerminal.choicesById[choiceId];return choice.factionId===runtime.world.playerFactionId&&choice.status==='PENDING'&&choice.candidateOfficerIds.length>0;});
}

function assertNoActionablePlayerTerminalChoice(runtime){
  const pendingChoiceIds=runtime.campaignTerminal?.choiceOrder.filter(choiceId=>{
    const choice=runtime.campaignTerminal.choicesById[choiceId];
    return choice.factionId===runtime.world.playerFactionId&&choice.status==='PENDING'&&choice.candidateOfficerIds.length>0;
  })??[];
  invariant(pendingChoiceIds.length===0,`RUNTIME_PLAYER_TERMINAL_CHOICE_PENDING:${pendingChoiceIds.join(',')}`);
}

function assertRuntimeCampaignActionable(runtime){
  invariant(runtime.world.gameResult===null,'RUNTIME_CAMPAIGN_ENDED');
  assertNoActionablePlayerTerminalChoice(runtime);
}

function assertRuntimeArmyActive(runtime,armyId,label='RUNTIME_ARMY_INACTIVE'){
  invariant(runtimeArmyIsActive(runtime,armyId),`${label}:${armyId}`);
}

function terminalStrategicCharacter(world,characterId){
  const officer=world.officers[characterId],terminal=world.campaignTerminalWorld;
  invariant(officer&&terminal,'RUNTIME_TERMINAL_STRATEGIC_CHARACTER_REQUIRED');
  const governor=Object.values(world.cities).find(city=>city.governorId===characterId)??null;
  const army=Object.values(world.armies).find(item=>item.commanderId===characterId&&terminal.armiesById[item.armyId]?.disposition==='ACTIVE')??null;
  const faction=world.factions[officer.allegianceFactionId],roles=[];
  if(faction.rulerId===characterId)roles.push('RULER');
  if(governor)roles.push('GOVERNOR');
  if(army)roles.push('FIELD_COMMANDER');
  if(roles.length>0)roles.push('TRAINING_SUPERVISOR');
  roles.sort();
  return {
    factionId:officer.allegianceFactionId,
    locationRef:officer.locationRef.kind==='NONE'?'NONE':`${officer.locationRef.kind}:${officer.locationRef.id}`,
    officeRef:governor?`GOVERNOR:${governor.cityId}`:faction.rulerId===characterId?`RULER:${faction.factionId}`:null,
    armyRef:army?.armyId??null,
    injuryState:officer.conditionState==='NORMAL'?'FIT':officer.conditionState,
    captivityState:officer.captivityState,
    lifeState:officer.lifeState,
    travelState:officer.travelState,
    roles,
  };
}

function terminalAssignmentInterruptionReason(assignment,actual){
  if(actual.factionId!==assignment.factionId)return 'WORLD_FACTION_CHANGED';
  if(actual.lifeState!=='ALIVE')return 'WORLD_DEAD';
  if(actual.captivityState!=='FREE')return 'WORLD_CAPTURED';
  if(actual.injuryState!=='FIT')return 'WORLD_INJURED';
  if(!actual.roles.includes(assignment.role))return 'WORLD_ROLE_LOST';
  if(assignment.type==='TRAINING'&&actual.locationRef!==assignment.originRef)return 'WORLD_LOCATION_CHANGED';
  if(assignment.type==='TRAINING'&&actual.travelState!=='STATIONARY')return 'WORLD_DEPARTED';
  if(assignment.type==='FIELD_INSPECTION'&&actual.armyRef!==assignment.armyId)return 'WORLD_COMMAND_OR_ARMY_CHANGED';
  return null;
}

function synchronizeTerminalStrategicAssignments(assignments,{eventId,world}){
  validateStrategicAssignmentState(assignments);
  const targetGlobalTick=getGlobalTick(world),actual=Object.fromEntries(ids(world.officers).map(characterId=>[characterId,terminalStrategicCharacter(world,characterId)]));
  let working=clone(assignments);const proposedEvents=[];
  for(const assignment of Object.values(working.assignments).filter(item=>item.status==='ACTIVE').sort((a,b)=>a.assignmentId.localeCompare(b.assignmentId))){
    if(targetGlobalTick>assignment.expectedEndGlobalTick)continue;
    const reason=terminalAssignmentInterruptionReason(assignment,actual[assignment.characterId]);
    if(reason!==null){
      const failed=failActiveAssignment(working,{eventId:`${eventId}:FAIL:${assignment.assignmentId}`,assignmentId:assignment.assignmentId,reason,resultGlobalTick:targetGlobalTick});
      working=failed.state;proposedEvents.push(...failed.proposedEvents);
    }
  }
  const advanced=advanceStrategicAssignmentTime(working,{eventId,turnNumber:world.turnNumber,tick:world.time.tick});
  working=advanced.state;proposedEvents.push(...advanced.proposedEvents);
  for(const [characterId,character] of Object.entries(working.characters))for(const key of ['factionId','locationRef','officeRef','armyRef','injuryState','captivityState','lifeState','travelState','roles'])character[key]=clone(actual[characterId][key]);
  validateStrategicAssignmentState(working);
  return {assignments:working,proposedEvents};
}

function validateTerminalStrategicAssignments(runtime){
  validateStrategicAssignmentState(runtime.strategicAssignments);
  invariant(runtime.strategicAssignments.time.globalTick===runtime.committedGlobalTick,'RUNTIME_TERMINAL_ASSIGNMENT_TIME_MISMATCH');
  invariant(same(ids(runtime.world.officers),ids(runtime.strategicAssignments.characters)),'RUNTIME_TERMINAL_ASSIGNMENT_CHARACTER_SET_MISMATCH');
  for(const characterId of ids(runtime.world.officers)){
    const actual=terminalStrategicCharacter(runtime.world,characterId),stored=runtime.strategicAssignments.characters[characterId];
    for(const key of ['factionId','locationRef','officeRef','armyRef','injuryState','captivityState','lifeState','travelState','roles'])invariant(same(stored[key],actual[key]),`RUNTIME_TERMINAL_ASSIGNMENT_CHARACTER_MISMATCH:${characterId}:${key}`);
  }
}

function officerForArmy(world,army){return world.officers[army.commanderId];}
function totalPersonnel(army){return army.troopCount+army.woundedCount+army.deadCount;}
function routePendingFromArmy(army){return army.statusEffects.some(effect=>effect?.status==='ROUT_PENDING'||effect?.effectId==='ROUT_PENDING');}

function calculatorUnit(world,army){
  const officer=officerForArmy(world,army);
  return {
    unitId:army.armyId,
    maxPersonnel:totalPersonnel(army),
    activePersonnel:army.troopCount,
    woundedPersonnel:army.woundedCount,
    deadPersonnel:army.deadCount,
    currentHp:army.hp,
    maxHp:army.maxHp,
    morale:army.morale,
    moraleMin:0,
    moraleMax:100,
    defenseCommand:officer.subStats['방어지휘'],
    moraleRetention:officer.subStats['사기유지'],
    personnelLossRemainder:0,
    woundedRemainder:0,
    routePending:routePendingFromArmy(army),
  };
}

function deltaUnit(world,army){
  const source=calculatorUnit(world,army);
  return {
    unitId:source.unitId,
    maxPersonnel:source.maxPersonnel,
    activePersonnel:source.activePersonnel,
    woundedPersonnel:source.woundedPersonnel,
    deadPersonnel:source.deadPersonnel,
    morale:source.morale,
    moraleMin:source.moraleMin,
    moraleMax:source.moraleMax,
    control:null,
    routePending:source.routePending,
  };
}

function actorStates(world,battleId){
  return Object.fromEntries(ids(world.armies).map(armyId=>{
    const army=world.armies[armyId];
    return [armyId,createCombatResolverState({battleId,actorRef:armyId,lifecycleState:createActionLifecycleState({stamina:army.stamina})})];
  }));
}

function legacyStaticFingerprint(world,losBinding){return `first3:${world.contentFingerprint}|los:${losBinding.manifestFingerprint}`;}
function staticFingerprint(world,losBinding){return `${legacyStaticFingerprint(world,losBinding)}|player:${world.playerFactionId}`;}

/** Old saves never authenticated their controller. The caller must explicitly
 * supply the original choice; do not infer it from a possibly edited save. */
export function migrateFirst3RuntimeV2R9ControlAuthoritySave(serialized,{losRules,inputs,originalPlayerFactionId}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_SAVE_LENGTH');
  const next=JSON.parse(serialized);
  invariant(typeof originalPlayerFactionId==='string'&&own(next.world.factions,originalPlayerFactionId),'RUNTIME_ORIGINAL_PLAYER_FACTION_REQUIRED');
  invariant(next.world.playerFactionId===originalPlayerFactionId,'RUNTIME_CONTROL_AUTHORITY_MISMATCH');
  const binding=restoreLosSaveBinding(next.losBinding,losRules);
  invariant(next.staticInputFingerprint===legacyStaticFingerprint(next.world,binding),'RUNTIME_LEGACY_CONTROL_AUTHORITY_FINGERPRINT_REQUIRED');
  next.staticInputFingerprint=staticFingerprint(next.world,binding);
  // Compose the R9 gates before the single full validation. Missing extensions
  // receive empty ledgers only; present-but-invalid extensions are never reset.
  if(!own(next,'strategicAiRuntime'))next.strategicAiRuntime=createRuntimeStrategicAiState(false,'ROUND_09_PRE_AI');
  if(!own(next,'identityTactics'))next.identityTactics=createRuntimeIdentityTactics(next.combat.battleId,'ROUND_09_PRE_IDENTITY');
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function createFirst3Runtime({world,losRules,growthPool=null,cityEconomy=null,recruitmentContracts=null,scenarioMode='FIRST3',strategicAiEnabled=false}={}){
  validateState(world);
  invariant(['FIRST3','I2_TRIAL','MIGRATED_V3'].includes(scenarioMode),'unsupported scenarioMode');
  const source=clone(world),battleId=`FIRST3-${source.campaignSeed}`;
  const losBinding=createLosSaveBinding(losRules);
  const units=ids(source.armies).map(armyId=>calculatorUnit(source,source.armies[armyId]));
  const firstGrowthTrack=growthPool?createGrowthTrack({campaignId:campaignId(source),pool:growthPool,characters:growthCharacters(source,growthPool)}):null;
  const citySettlement=cityEconomy?createCitySettlementWorldSnapshot({world:source,economy:cityEconomy}):null;
  if(citySettlement)source.cities=clone(citySettlement.world.cities);
  const recruitment=recruitmentContracts?createRecruitmentWorldSnapshot({world:source}):null;
  const externalRecruitCandidates=recruitmentContracts?createExternalRecruitCandidates({world:source,contracts:{G21:recruitmentContracts.officerContract}}):null;
  const runtime={
    format:FORMAT,
    version:VERSION,
    staticInputFingerprint:staticFingerprint(source,losBinding),
    scenarioMode,
    world:source,
    losBinding,
    combat:{
      battleId,
      coordinator:createCombatCoordinatorState({battleId,actorStates:actorStates(source,battleId)}),
      delta:createBattleDeltaState({battleId,units:ids(source.armies).map(armyId=>deltaUnit(source,source.armies[armyId]))}),
      calculator:createCombatCalculatorState({battleId,units}),
    },
    combatConditions:createCombatConditionLedger({battleId,startGlobalTick:getGlobalTick(source)}),
    commands:{},
    commandOrder:[],
    nextCommandSequence:1,
    committedGlobalTick:getGlobalTick(source),
    lastCommit:null,
    historyLedger:createHistoryLedger({campaignId:campaignId(source)}),
    characterHistory:createCharacterHistoryState({campaignId:campaignId(source)}),
    strategicAssignments:createRuntimeAssignments(source),
    campaignMapping:campaignMapping(source),
    postBattleOpportunities:createPostBattleOpportunityState({campaignId:campaignId(source),seed:source.campaignSeed}),
    growthTrack:firstGrowthTrack,
    growthProgress:firstGrowthTrack?createGrowthProgressState({campaignId:campaignId(source),campaignSeed:source.campaignSeed,growthTrack:firstGrowthTrack}):null,
    growthPoolBinding:growthPool?{poolVersion:growthPool.poolVersion,sourceType:growthPool.sourceType,fixture:growthPool.fixture===true}:null,
    growthPoolData:growthPool?clone(growthPool):null,
    citySettlement,
    citySettlementPendingEconomy:null,
    recruitment,
    externalRecruitCandidates,
    recruitmentContracts:recruitmentContracts?clone(recruitmentContracts):null,
    migratedFrom:null,
    runtimeExtensionMigration:null,
    conditionLedgerMigration:null,
    detachmentPreparation:null,
    detachmentCombatRegistration:null,
    detachmentMigration:null,
    g21TacticMigration:null,
    movementSlowMigration:null,
    g03TacticMigration:null,
    campaignTerminal:null,
    terminalStateMigration:null,
    strategicAiRuntime:createRuntimeStrategicAiState(strategicAiEnabled),
    identityTactics:createRuntimeIdentityTactics(battleId),
    integrationSlots:integrationSlots(firstGrowthTrack,citySettlement,null,recruitment),
  };
  validateFirst3Runtime(runtime,{losRules});
  return runtime;
}

export function prepareI2TrialWorld(world,{actorRef='U-F01-G24',targetRef='U-F02-G02',actorTileId='3,3',targetTileId='6,3'}={}){
  validateState(world);
  invariant(own(world.armies,actorRef)&&own(world.armies,targetRef),'trial armies are required');
  invariant(world.armies[actorRef].factionId!==world.armies[targetRef].factionId,'trial armies must be enemies');
  invariant(own(world.tiles,actorTileId)&&own(world.tiles,targetTileId),'trial tiles are required');
  const next=clone(world);
  for(const army of Object.values(next.armies)){
    if(![actorRef,targetRef].includes(army.armyId))invariant(![actorTileId,targetTileId].includes(army.tileId),'trial tile is occupied');
  }
  for(const[armyId,tileId]of [[actorRef,actorTileId],[targetRef,targetTileId]]){
    const army=next.armies[armyId];
    army.tileId=tileId;
    army.currentOrder=null;
    army.movementState=null;
  }
  next.playerFactionId=next.armies[actorRef].factionId;
  next.ui={selectedCityId:next.factions[next.playerFactionId].capitalCityId,selectedArmyId:actorRef};
  updateKnowledge(next);
  validateState(next);
  invariant(own(next.knowledge[next.playerFactionId].observedArmies,targetRef),'trial target must be publicly observed');
  return next;
}

function definition(actionId){
  const result=FIRST3_ACTION_DEFINITIONS[id(actionId,'actionId')];
  invariant(result,`UNSUPPORTED_RUNTIME_ACTION:${actionId}`);
  return clone(result);
}

function knownLosState(runtime,factionId,losRules){
  restoreLosSaveBinding(runtime.losBinding,losRules);
  const knowledge=runtime.world.knowledge[factionId];
  invariant(knowledge,'UNKNOWN_FACTION_KNOWLEDGE');
  const knownTiles=new Set(Object.entries(knowledge.tiles).filter(([,state])=>state!=='UNEXPLORED').map(([tileId])=>tileId));
  const tileBlocksLOS={};
  for(const[tileId,value]of losRules.tileBlocksLOS.entries())if(knownTiles.has(tileId))tileBlocksLOS[tileId]=value;
  const edgeBlocksLOS={};
  for(const[edgeId,value]of losRules.edgeBlocksLOS.entries()){
    const endpoints=edgeId.split('|');
    if(endpoints.length===2&&endpoints.every(tileId=>knownTiles.has(tileId)))edgeBlocksLOS[edgeId]=value;
  }
  return {tileBlocksLOS,edgeBlocksLOS};
}

export function queryRuntimeKnownLos(runtime,{factionId,sourceTileId,targetTileId,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  return queryKnownLineOfSight(losRules.geometry,knownLosState(runtime,factionId,losRules),{sourceTileId,targetTileId});
}

function normalizedAssignmentHistoryEvent(proposal){
  return normalizePendingHistoryEventProposal(proposal,{placeRef:strategicLocationToHistoryPlaceRef(proposal.placeRef)});
}

function assignmentForCommander(runtime,commanderId){
  const character=runtime.strategicAssignments.characters[commanderId];
  return character?.assignmentId===null?null:runtime.strategicAssignments.assignments[character.assignmentId];
}

function activeDetachment(runtime){
  return runtime.detachmentPreparation?.preparation?.status==='PREPARING'?runtime.detachmentPreparation.preparation:null;
}

function assertDetachmentArmyAvailable(runtime,armyId){
  const preparation=activeDetachment(runtime);
  invariant(!preparation||preparation.sourceArmyId!==armyId,`DETACHMENT_SOURCE_ARMY_LOCKED:${armyId}`);
}

function assertDetachmentOfficerAvailable(runtime,officerId){
  const preparation=activeDetachment(runtime);
  if(!preparation)return;
  const sourceCommander=runtime.world.armies[preparation.sourceArmyId]?.commanderId;
  invariant(![preparation.officerId,sourceCommander].includes(officerId),`DETACHMENT_OFFICER_LOCKED:${officerId}`);
}

function runtimeConfusionActionKind(actionId){
  if(actionId==='BASIC_ATTACK')return 'BASIC_ATTACK';
  if(actionId==='CAVALRY_CHARGE')return 'CHARGE';
  if(actionId==='RANGED_VOLLEY')return 'CAST';
  if(actionId==='ART-G21')return 'CAST';
  if(actionId==='ART-G03')return 'CAST';
  throw new Error(`UNCLASSIFIED_RUNTIME_CONFUSION_ACTION:${actionId}`);
}

function assertConfusionActionAllowed(runtime,armyId,actionKind){
  const permission=evaluateConfusionActionPermission(runtime.combatConditions,{targetUnitId:armyId,globalTick:runtime.committedGlobalTick,actionKind});
  invariant(permission.allowed,permission.reason);
  return permission;
}

const PUBLIC_CONDITION_STATUS_KEYS=new Set(['MOVE_SLOW','CONFUSION','MENTAL_DISRUPTION_RESISTANCE']);

function publicConditionStates(runtime,unitId){
  return getActiveCombatConditions(runtime.combatConditions,{targetUnitId:unitId,globalTick:runtime.committedGlobalTick})
    .filter(condition=>PUBLIC_CONDITION_STATUS_KEYS.has(condition.statusKey))
    .map(condition=>({
      statusKey:condition.statusKey,
      remainingTicks:Math.max(0,condition.endGlobalTickExclusive-runtime.committedGlobalTick),
    }));
}

function publicActionAvailability(runtime,unitId,actorState){
  const troopType=runtime.world.armies[unitId].troopType;
  const result=Object.fromEntries(Object.entries(FIRST3_ACTION_DEFINITIONS)
    .filter(([,action])=>action.allowedTroopTypes.includes(troopType))
    .map(([actionId,action])=>{
      const quote=quoteCombatAction(actorState,{definition:action,currentTick:runtime.committedGlobalTick});
      const permission=evaluateConfusionActionPermission(runtime.combatConditions,{
        targetUnitId:unitId,globalTick:runtime.committedGlobalTick,actionKind:runtimeConfusionActionKind(actionId),
      });
      const army=runtime.world.armies[unitId],delta=runtime.combat.delta.units[unitId];
      const blocked=armyHasActiveMovement(army)||assignmentForCommander(runtime,army.commanderId)!==null||delta.activePersonnel<=0||delta.routePending;
      return [actionId,blocked?{...quote,available:false,reason:'ACTOR_NOT_ACTIONABLE'}:permission.allowed?quote:{...quote,available:false,reason:permission.reason}];
    }));
  const army=runtime.world.armies[unitId];
  const actionId=army.factionId==='F01'&&army.commanderId==='G07'?'ART-G07':army.factionId==='F03'&&army.commanderId==='G08'?'ART-G08':null;
  if(actionId){
    const quote=quoteCombatAction(actorState,{definition:identityDefinition(actionId),currentTick:runtime.committedGlobalTick});
    const available=identitySourceAvailable(runtime,{actorRef:unitId,actionId})&&(actionId!=='ART-G08'||['bow','militia','spear'].includes(troopType));
    result[actionId]=available?quote:{...quote,available:false,reason:'ACTOR_NOT_ACTIONABLE'};
  }
  return result;
}

function publicRecruitmentEffectStatus(runtime,candidate){
  if(candidate.candidateId!=='G21')return 'UNSUPPORTED';
  const preparation=runtime.detachmentPreparation?.preparation;
  if(preparation?.officerId==='G21'&&preparation.status==='COMPLETED')return 'ART_G21_WORK_TRIAL_READY';
  if(preparation?.officerId==='G21'&&preparation.status==='PREPARING')return 'ART_G21_DETACHMENT_PREPARING';
  return own(runtime.world.officers,'G21')?'ART_G21_DETACHMENT_REQUIRED':'ART_G21_RECRUITMENT_PENDING';
}

export function startRuntimeTraining(runtime,{requestId,characterId,intent='FIELD_READINESS'}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  assertRuntimeCampaignActionable(runtime);
  id(requestId,'requestId');id(characterId,'characterId');
  assertDetachmentOfficerAvailable(runtime,characterId);
  const character=runtime.strategicAssignments.characters[characterId];
  invariant(character&&character.factionId===runtime.world.playerFactionId,'TRAINING_CHARACTER_NOT_PLAYER_OWNED');
  invariant(character.roles.includes('TRAINING_SUPERVISOR'),`TRAINING_ROLE_NOT_AVAILABLE:${characterId}`);
  const token=stableToken(`${campaignId(runtime.world)}:${requestId}`);
  const input={
    eventId:`R5.TRAINING.START.${token}`,
    orderId:`R5.TRAINING.ORDER.${token}`,
    assignmentId:`R5.TRAINING.ASSIGN.${token}`,
    factionId:character.factionId,
    characterId,
    locationRef:character.locationRef,
    role:'TRAINING_SUPERVISOR',
    intent,
  };
  const next=clone(runtime);
  const started=startStrategicWorldTraining(assignmentSnapshot(next.world,next.strategicAssignments),input);
  next.strategicAssignments=runtimeAssignmentState(next.world,started.assignments);
  const proposal=runtimeAssignmentProposal(next.world,getStrategicWorldStartHistoryProposal(started,{assignmentId:input.assignmentId}));
  appendRuntimeHistory(next,normalizedAssignmentHistoryEvent(proposal),{actorFactionId:character.factionId});
  validateFirst3Runtime(next,{losRules});
  return next;
}

export function applyRuntimeGrowthDraftAction(runtime,{requestId,draftId,expectedRevision,action,selectedTraitId=null}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(runtime.growthTrack,'RUNTIME_GROWTH_TRACK_UNAVAILABLE');
  const next=clone(runtime),applied=applyTrackedDraftAction(next.growthTrack,{requestId,draftId,expectedRevision,action,selectedTraitId});
  next.growthTrack=applied.state;
  const draft=next.growthTrack.draftsById[draftId],officer=next.world.officers[draft.characterId],growth=next.growthTrack.growthStates[draft.characterId];
  officer.aptitudePoints=growth.aptitudePoints;
  validateFirst3Runtime(next,{losRules});return next;
}

export function admitRuntimeFieldInspection(runtime,{opportunityId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});id(opportunityId,'opportunityId');
  assertRuntimeCampaignActionable(runtime);
  invariant(runtime.world.turnPhase==='PLANNING','FIELD_INSPECTION_REQUIRES_PLANNING_PHASE');
  const proposal=runtime.postBattleOpportunities.proposalsByOpportunityId[opportunityId];
  invariant(proposal&&proposal.factionId===runtime.world.playerFactionId,'FIELD_INSPECTION_OPPORTUNITY_NOT_PLAYER_OWNED');
  assertDetachmentArmyAvailable(runtime,proposal.actorArmyId);
  const actorState=runtime.combat.coordinator.actorStates[proposal.actorArmyId];
  const actorHasPendingCombatAction=Object.values(actorState?.instances??{}).some(instance=>instance.status==='RESERVED');
  const token=stableToken(`${campaignId(runtime.world)}:${opportunityId}`),input={
    eventId:`R5.FIELD.START.${token}`,
    orderId:`R5.FIELD.ORDER.${token}`,
    assignmentId:`R5.FIELD.ASSIGN.${token}`,
    proposal,
    actorHasPendingCombatAction,
  };
  const next=clone(runtime),started=admitStrategicWorldFieldInspection(assignmentSnapshot(next.world,next.strategicAssignments),input);
  next.strategicAssignments=runtimeAssignmentState(next.world,started.assignments);
  const startProposal=runtimeAssignmentProposal(next.world,getStrategicWorldStartHistoryProposal(started,{assignmentId:input.assignmentId}));
  appendRuntimeHistory(next,normalizedAssignmentHistoryEvent(startProposal),{actorFactionId:proposal.factionId});
  validateFirst3Runtime(next,{losRules});
  return next;
}

function applyRuntimeMoveOrder(runtime,{armyId,destinationTileId=null,actingFactionId,type='MOVE',validatedPathTileIds=null}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  assertRuntimeCampaignActionable(runtime);
  id(armyId,'armyId');invariant(type==='HOLD'||typeof destinationTileId==='string'&&own(runtime.world.tiles,destinationTileId),'UNKNOWN_DESTINATION_TILE');
  const army=runtime.world.armies[armyId];
  invariant(army,'ARMY_NOT_PLAYER_OWNED');
  assertRuntimeArmyActive(runtime,armyId);
  invariant(army.factionId===actingFactionId,'ARMY_NOT_ACTING_FACTION_OWNED');
  invariant(runtime.world.factions[actingFactionId]?.alive===true,'ACTING_FACTION_INACTIVE');
  if(type==='MOVE')assertConfusionActionAllowed(runtime,armyId,'MOVE');
  assertDetachmentArmyAvailable(runtime,armyId);
  const assignment=assignmentForCommander(runtime,army.commanderId);
  invariant(assignment===null||(assignment.type==='FIELD_INSPECTION'&&assignment.armyId===armyId),'ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE');
  const next=clone(runtime);
  next.world=issueOrder(next.world,{armyId,type,destinationTileId,factionId:actingFactionId,validatedPathTileIds});
  validateFirst3Runtime(next,{losRules});
  return next;
}

export function issueRuntimeFieldInspectionMove(runtime,{assignmentId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});id(assignmentId,'assignmentId');
  const assignment=runtime.strategicAssignments.assignments[assignmentId];
  invariant(assignment?.type==='FIELD_INSPECTION'&&assignment.status==='ACTIVE','FIELD_INSPECTION_NOT_ACTIVE');
  invariant(assignment.factionId===runtime.world.playerFactionId,'FIELD_INSPECTION_NOT_PLAYER_OWNED');
  const army=runtime.world.armies[assignment.armyId],targetTileId=assignment.targetPlaceRef.slice(5);
  const occupied=new Set(Object.values(runtime.world.armies).filter(item=>item.armyId!==army.armyId&&runtimeArmyIsActive(runtime,item.armyId)).map(item=>item.tileId));
  const candidates=ids(runtime.world.tiles).filter(tileId=>hexDistance(runtime.world.tiles[tileId],runtime.world.tiles[targetTileId])<=1&&!occupied.has(tileId)).sort((left,right)=>hexDistance(runtime.world.tiles[army.tileId],runtime.world.tiles[left])-hexDistance(runtime.world.tiles[army.tileId],runtime.world.tiles[right])||left.localeCompare(right));
  let lastError=null;
  for(const destinationTileId of candidates){
    try{return issueRuntimeMoveOrder(runtime,{armyId:army.armyId,destinationTileId},{losRules});}
    catch(error){lastError=error;}
  }
  throw lastError??new Error('FIELD_INSPECTION_DESTINATION_UNREACHABLE');
}

export function cancelRuntimeFieldInspection(runtime,{assignmentId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});id(assignmentId,'assignmentId');
  const assignment=runtime.strategicAssignments.assignments[assignmentId];
  invariant(assignment?.type==='FIELD_INSPECTION'&&assignment.status==='ACTIVE','FIELD_INSPECTION_NOT_ACTIVE');
  invariant(assignment.factionId===runtime.world.playerFactionId,'FIELD_INSPECTION_NOT_PLAYER_OWNED');
  const next=clone(runtime),failed=failFieldInspection(next.strategicAssignments,{eventId:`R5.FIELD.CANCEL.${stableToken(assignmentId)}.${next.committedGlobalTick}`,assignmentId,reason:'USER_CANCELLED',resultGlobalTick:next.committedGlobalTick});
  next.strategicAssignments=failed.state;
  next.lastCommit={globalTick:next.committedGlobalTick,executedActionIds:[],cancelledActionIds:[],historyEventIds:[],characterHistoryDecisions:[],opportunityDecisions:[],growthResults:[]};
  for(const proposal of failed.proposedEvents){
    const event=normalizedAssignmentHistoryEvent(proposal),actorFactionId=proposal.factionRefs[0];
    appendRuntimeHistory(next,event,{actorFactionId});
    const derived=applyKnownHistoryEvent(next.characterHistory,{ledger:next.historyLedger,factionId:actorFactionId,eventId:event.eventId});
    next.characterHistory=derived.state;
    next.strategicAssignments=acknowledgeAssignmentResultEvent(next.strategicAssignments,{eventId:`R5.ASSIGNMENT.ACK.${stableToken(event.eventId)}`,resultEventId:event.eventId});
    next.lastCommit.historyEventIds.push(event.eventId);next.lastCommit.characterHistoryDecisions.push(derived.decision);
  }
  validateFirst3Runtime(next,{losRules});return next;
}

function validateChargePath(runtime,actorRef,targetRef,pathTileIds){
  invariant(Array.isArray(pathTileIds)&&pathTileIds.length>=3&&pathTileIds.length<=5,'CHARGE_LENGTH');
  const world=runtime.world,actor=world.armies[actorRef],target=world.armies[targetRef];
  invariant(pathTileIds[0]===actor.tileId,'CHARGE_PATH_START_MISMATCH');
  invariant(new Set(pathTileIds).size===pathTileIds.length,'CHARGE_PATH_REPEATS_TILE');
  for(let index=1;index<pathTileIds.length;index++){
    invariant(own(world.tiles,pathTileIds[index]),`UNKNOWN_CHARGE_TILE:${pathTileIds[index]}`);
    invariant(hexDistance(world.tiles[pathTileIds[index-1]],world.tiles[pathTileIds[index]])===1,'CHARGE_PATH_NOT_CONTIGUOUS');
  }
  const destination=pathTileIds.at(-1);
  invariant(hexDistance(world.tiles[destination],world.tiles[target.tileId])===1,'CHARGE_DESTINATION_NOT_ADJACENT');
  const occupied=new Map(Object.values(world.armies).filter(army=>runtimeArmyIsActive(runtime,army.armyId)).map(army=>[army.tileId,army.armyId]));
  for(const tileId of pathTileIds.slice(1))invariant(!occupied.has(tileId),`CHARGE_PATH_OCCUPIED:${tileId}`);
  return [...pathTileIds];
}

function rangeAndLosAtDecision(runtime,{actorRef,targetRef,action,pathTileIds,losRules}){
  const world=runtime.world,actor=world.armies[actorRef],target=world.armies[targetRef];
  const distance=hexDistance(world.tiles[actor.tileId],world.tiles[target.tileId]);
  if(action.actionId==='BASIC_ATTACK')invariant(distance===1,'OUT_OF_RANGE');
  if(action.actionId==='RANGED_VOLLEY'){
    invariant(distance>=2&&distance<=3,distance<2?'TOO_CLOSE':'OUT_OF_RANGE');
    const known=queryRuntimeKnownLos(runtime,{factionId:actor.factionId,sourceTileId:actor.tileId,targetTileId:target.tileId,losRules});
    invariant(known.status==='CLEAR',`LOS_${known.status}`);
  }
  if(action.actionId==='CAVALRY_CHARGE')return validateChargePath(runtime,actorRef,targetRef,pathTileIds);
  return [];
}

function applyRuntimeCombatCommand(runtime,{actorRef,targetRef,actionId,pathTileIds=[],actingFactionId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  assertRuntimeCampaignActionable(runtime);
  id(actorRef,'actorRef');id(targetRef,'targetRef');
  const world=runtime.world,actor=world.armies[actorRef],target=world.armies[targetRef];
  invariant(actor&&target,'UNKNOWN_RUNTIME_ARMY');
  invariant(actor.factionId===actingFactionId,'ARMY_NOT_ACTING_FACTION_OWNED');
  invariant(world.factions[actingFactionId]?.alive===true,'ACTING_FACTION_INACTIVE');
  assertRuntimeArmyActive(runtime,actorRef);assertRuntimeArmyActive(runtime,targetRef,'RUNTIME_TARGET_ARMY_INACTIVE');
  assertDetachmentArmyAvailable(runtime,actorRef);
  invariant(actor.factionId!==target.factionId,'TARGET_NOT_ENEMY');
  invariant(own(world.knowledge[actor.factionId].observedArmies,targetRef),'TARGET_NOT_OBSERVED');
  const actorDelta=runtime.combat.delta.units[actorRef],targetDelta=runtime.combat.delta.units[targetRef];
  invariant(actorDelta.activePersonnel>0&&!actorDelta.routePending,'ACTOR_NOT_ACTIONABLE');
  invariant(targetDelta.activePersonnel>0,'TARGET_INVALID');
  invariant(!armyHasActiveMovement(actor),'ACTOR_MOVEMENT_ACTIVE');
  invariant(assignmentForCommander(runtime,actor.commanderId)===null,'ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE');
  const action=definition(actionId);
  assertConfusionActionAllowed(runtime,actorRef,runtimeConfusionActionKind(actionId));
  invariant(action.allowedTroopTypes.includes(actor.troopType),`TROOP_TYPE_MISMATCH:${actionId}:${actor.troopType}`);
  const normalizedPath=rangeAndLosAtDecision(runtime,{actorRef,targetRef,action,pathTileIds,losRules});
  const currentTick=getGlobalTick(world),sequence=runtime.nextCommandSequence;
  const actionInstanceId=`R4:${currentTick}:${sequence}:${actorRef}`;
  const decisionValidation={valid:true,...(action.losPolicy==='CLEAR_REQUIRED'?{losState:'CLEAR'}:{})};
  const actorState=reserveCombatAction(runtime.combat.coordinator.actorStates[actorRef],{
    actorRef,
    actorTroopType:actor.troopType,
    actionInstanceId,
    definition:action,
    targetRef,
    currentTick,
    decisionValidation,
  });
  const next=clone(runtime);
  next.combat.coordinator.actorStates[actorRef]=actorState;
  next.commands[actionInstanceId]={
    actionInstanceId,actorRef,targetRef,actionId,
    issuedGlobalTick:currentTick,
    dueGlobalTick:currentTick+action.windupTicks,
    pathTileIds:normalizedPath,
  };
  next.commandOrder.push(actionInstanceId);
  next.nextCommandSequence++;
  appendRuntimeHistory(next,runtimeHistoryEvent(next,next.commands[actionInstanceId],'START'),{actorFactionId:actor.factionId});
  validateFirst3Runtime(next,{losRules});
  return next;
}

function canonicalG21TraitRank(runtime){
  const officer=runtime.world.officers.G21,growth=runtime.growthTrack?.growthStates?.G21;
  invariant(officer?.uniqueTrait?.id==='UT-G21','G21_UNIQUE_TRAIT_REQUIRED');
  invariant(Array.isArray(officer.tactics)&&officer.tactics.some(tactic=>tactic.id==='ART-G21'),'G21_TACTIC_RECORD_REQUIRED');
  const rank=growth?.ownedTraitRanks?.['UT-G21'];
  invariant(Number.isInteger(rank)&&rank>=0&&rank<=5,'G21_CANONICAL_TRAIT_RANK_REQUIRED');
  return rank;
}

function armyHasActiveMovement(army){
  return army.movementState!==null||['PLANNED','ACTIVE','WAITING_FOR_TILE','CONTACT','EDGE_CONTACT'].includes(army.currentOrder?.status);
}

function g21IssueEligibility(runtime,{actorRef,targetRef,losRules}){
  assertRuntimeCampaignActionable(runtime);
  const preparation=runtime.detachmentPreparation?.preparation;
  invariant(preparation?.status==='COMPLETED'&&preparation.officerId==='G21','G21_DETACHMENT_NOT_COMPLETED');
  invariant(preparation.newArmyId===actorRef,'G21_FIELD_COMMANDER_REQUIRED');
  invariant(Object.keys(runtime.world.armies).length===7,'G21_SEVENTH_ARMY_REQUIRED');
  const world=runtime.world,actor=world.armies[actorRef],target=world.armies[targetRef],officer=recruitedDetachmentOfficer(runtime,'G21');
  invariant(actor&&target,'UNKNOWN_RUNTIME_ARMY');
  assertRuntimeArmyActive(runtime,actorRef);assertRuntimeArmyActive(runtime,targetRef,'RUNTIME_TARGET_ARMY_INACTIVE');
  invariant(officer&&actor.commanderId==='G21'&&actor.factionId===world.playerFactionId,'G21_RECRUITED_FIELD_COMMANDER_REQUIRED');
  const strategic=runtime.strategicAssignments.characters.G21;
  invariant(strategic?.armyRef===actorRef&&strategic.roles.includes('FIELD_COMMANDER'),'G21_FIELD_COMMANDER_ROLE_REQUIRED');
  invariant(officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY','G21_OFFICER_UNAVAILABLE');
  invariant(G21_CONFUSION_TACTIC_TRIAL.allowedTroopTypes.includes(actor.troopType)&&officer.allowedTroops.includes(actor.troopType),`G21_TROOP_NOT_ALLOWED:${actor.troopType}`);
  assertDetachmentArmyAvailable(runtime,actorRef);
  invariant(actor.factionId!==target.factionId,'TARGET_NOT_ENEMY');
  invariant(own(world.knowledge[actor.factionId].observedArmies,targetRef),'TARGET_NOT_OBSERVED');
  const actorDelta=runtime.combat.delta.units[actorRef],targetDelta=runtime.combat.delta.units[targetRef];
  invariant(actorDelta?.activePersonnel>0&&!actorDelta.routePending,'ACTOR_NOT_ACTIONABLE');
  invariant(targetDelta?.activePersonnel>0&&!targetDelta.routePending,'TARGET_INVALID');
  invariant(!armyHasActiveMovement(actor)&&actor.retreatState===null,'ACTOR_MOVEMENT_ACTIVE');
  invariant(assignmentForCommander(runtime,'G21')===null,'ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE');
  assertConfusionActionAllowed(runtime,actorRef,'CAST');
  const distanceTiles=hexDistance(world.tiles[actor.tileId],world.tiles[target.tileId]);
  invariant(distanceTiles<=G21_CONFUSION_TACTIC_TRIAL.rangeTiles,'OUT_OF_RANGE');
  const known=queryRuntimeKnownLos(runtime,{factionId:actor.factionId,sourceTileId:actor.tileId,targetTileId:target.tileId,losRules});
  invariant(known.status==='CLEAR',`LOS_${known.status}`);
  return {actor,target,officer,distanceTiles,traitRank:canonicalG21TraitRank(runtime)};
}

const G21_PUBLIC_UNAVAILABLE_REASONS=new Set([
  'G21_DETACHMENT_NOT_COMPLETED','G21_FIELD_COMMANDER_REQUIRED','G21_SEVENTH_ARMY_REQUIRED',
  'G21_RECRUITED_FIELD_COMMANDER_REQUIRED','G21_FIELD_COMMANDER_ROLE_REQUIRED','G21_OFFICER_UNAVAILABLE',
  'G21_TROOP_NOT_ALLOWED','DETACHMENT_SOURCE_ARMY_LOCKED','TARGET_NOT_ENEMY','TARGET_NOT_OBSERVED',
  'ACTOR_NOT_ACTIONABLE','TARGET_INVALID','ACTOR_MOVEMENT_ACTIVE','ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE',
  'CONFUSION_ACTION_BLOCKED','OUT_OF_RANGE','LOS_BLOCKED','LOS_UNKNOWN','ACTION_COOLDOWN_ACTIVE',
  'INSUFFICIENT_STAMINA','RECOVERY_ACTIVE',
]);

function g21PublicReasonCode(error){
  const message=String(error?.message??'ACTION_UNAVAILABLE');
  const normalized=message.split(':')[0];
  return G21_PUBLIC_UNAVAILABLE_REASONS.has(normalized)?normalized:'ACTION_UNAVAILABLE';
}

function g21SlowSynergyCandidate(runtime,targetRef){
  const executionTick=runtime.committedGlobalTick+G21_CONFUSION_TACTIC_TRIAL.windupTicks;
  const applicationBatchId=`RUNTIME.BATCH.${executionTick}`;
  return getActiveCombatConditions(runtime.combatConditions,{targetUnitId:targetRef,globalTick:runtime.committedGlobalTick,statusKey:'MOVE_SLOW'})
    .some(condition=>condition.endGlobalTickExclusive>executionTick&&condition.applicationBatchId!==applicationBatchId);
}

// This is the only UI-facing quote. It deliberately gives the player a gate
// result, not the control formula, enemy insight, roll, or private lifecycle data.
export function getRuntimeG21ConfusionTacticAvailability(runtime,{actorRef,targetRef}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  try{
    const actorId=id(actorRef,'actorRef'),targetId=id(targetRef,'targetRef');
    const eligible=g21IssueEligibility(runtime,{actorRef:actorId,targetRef:targetId,losRules});
    const actionInstanceId=`R7E2.QUOTE.${stableToken(`${campaignId(runtime.world)}:${actorId}:${targetId}:${runtime.committedGlobalTick}`)}`;
    const quote=quoteG21ConfusionTactic(createG21ConfusionTacticState({
      resolverState:runtime.combat.coordinator.actorStates[actorId],conditionLedger:runtime.combatConditions,
    }),{
      actionInstanceId,sourceUnitId:actorId,sourceOfficerId:'G21',sourceTroopType:eligible.actor.troopType,
      targetUnitId:targetId,tacticId:'ART-G21',applicationBatchId:`R7E2.QUOTE.${runtime.committedGlobalTick}`,
      traitRank:eligible.traitRank,currentTick:runtime.committedGlobalTick,distanceTiles:eligible.distanceTiles,losState:'CLEAR',
    });
    return {actionId:'ART-G21',available:quote.available,reasonCode:quote.available?null:g21PublicReasonCode({message:quote.reason}),slowSynergyCandidate:g21SlowSynergyCandidate(runtime,targetId)};
  }catch(error){return {actionId:'ART-G21',available:false,reasonCode:g21PublicReasonCode(error),slowSynergyCandidate:false};}
}

// Explicitly development-only: positions an already completed G21 detachment
// beside an observed enemy so the browser can exercise the real command path.
export function prepareRuntimeG21ConfusionWorkTrial(runtime,{actorRef,targetRef}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(runtime.scenarioMode==='I2_TRIAL','G21_WORK_TRIAL_I2_ONLY');
  const actorId=id(actorRef,'actorRef'),targetId=id(targetRef,'targetRef');
  const preparation=runtime.detachmentPreparation?.preparation;
  invariant(preparation?.status==='COMPLETED'&&preparation.officerId==='G21'&&preparation.newArmyId===actorId,'G21_WORK_TRIAL_DETACHMENT_REQUIRED');
  invariant(runtime.world.armies[actorId]&&runtime.world.armies[targetId],'UNKNOWN_RUNTIME_ARMY');
  invariant(!runtime.commandOrder.some(commandId=>runtime.combat.coordinator.actorStates[runtime.commands[commandId].actorRef]?.instances?.[commandId]?.status==='RESERVED'),'G21_WORK_TRIAL_PENDING_COMMANDS');
  const actorTileId='5,3',targetTileId='6,3';
  invariant(runtime.world.tiles[actorTileId]&&runtime.world.tiles[targetTileId],'G21_WORK_TRIAL_TILES_UNAVAILABLE');
  for(const army of Object.values(runtime.world.armies)){
    if(![actorId,targetId].includes(army.armyId)&&[actorTileId,targetTileId].includes(army.tileId))throw new Error('G21_WORK_TRIAL_TILE_OCCUPIED');
  }
  const next=clone(runtime);
  next.world.armies[actorId].tileId=actorTileId;
  next.world.armies[targetId].tileId=targetTileId;
  next.world.armies[actorId].currentOrder=null;next.world.armies[actorId].movementState=null;
  next.world.armies[targetId].currentOrder=null;next.world.armies[targetId].movementState=null;
  updateKnowledge(next.world);
  const known=queryRuntimeKnownLos(next,{factionId:next.world.playerFactionId,sourceTileId:actorTileId,targetTileId,losRules});
  invariant(known.status==='CLEAR'&&known.distance<=G21_CONFUSION_TACTIC_TRIAL.rangeTiles,'G21_WORK_TRIAL_LOS_UNAVAILABLE');
  g21IssueEligibility(next,{actorRef:actorId,targetRef:targetId,losRules});
  validateFirst3Runtime(next,{losRules});
  return next;
}

function g21ActionInstanceId(runtime,requestId){return `R7C2:${stableToken(`${campaignId(runtime.world)}:${requestId}:ART-G21`)}`;}

export function issueRuntimeG21ConfusionTactic(runtime,input={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(object(input),'G21 runtime tactic input is required');
  for(const key of ['traitRank','resolution','controlApplied','success','targetUnitIds'])invariant(!own(input,key),`G21_CALLER_FIELD_NOT_ALLOWED:${key}`);
  const requestId=id(input.requestId,'requestId'),actorRef=id(input.actorRef,'actorRef'),targetRef=id(input.targetRef,'targetRef');
  const actionInstanceId=g21ActionInstanceId(runtime,requestId),issueFingerprint=JSON.stringify({requestId,actorRef,targetRef});
  const existing=runtime.commands[actionInstanceId];
  if(existing){
    invariant(existing.commandType==='G21_CONFUSION_TACTIC'&&existing.issueFingerprint===issueFingerprint,`CONFLICTING_G21_RUNTIME_REQUEST:${requestId}`);
    return clone(runtime);
  }
  const eligible=g21IssueEligibility(runtime,{actorRef,targetRef,losRules});
  const currentTick=runtime.committedGlobalTick,dueGlobalTick=currentTick+G21_CONFUSION_TACTIC_TRIAL.windupTicks,applicationBatchId=`RUNTIME.BATCH.${dueGlobalTick}`;
  const adapter=createG21ConfusionTacticState({resolverState:runtime.combat.coordinator.actorStates[actorRef],conditionLedger:runtime.combatConditions});
  const reserved=reserveG21ConfusionTactic(adapter,{
    actionInstanceId,
    sourceUnitId:actorRef,
    sourceOfficerId:'G21',
    sourceTroopType:eligible.actor.troopType,
    targetUnitId:targetRef,
    tacticId:'ART-G21',
    applicationBatchId,
    traitRank:eligible.traitRank,
    currentTick,
    distanceTiles:eligible.distanceTiles,
    losState:'CLEAR',
  });
  const next=clone(runtime);
  next.combat.coordinator.actorStates[actorRef]=reserved.state.resolverState;
  next.combatConditions=reserved.state.conditionLedger;
  next.commands[actionInstanceId]={
    actionInstanceId,commandType:'G21_CONFUSION_TACTIC',requestId,issueFingerprint,
    actorRef,targetRef,actionId:'ART-G21',issuedGlobalTick:currentTick,dueGlobalTick,pathTileIds:[],applicationBatchId,
    g21AdapterAction:clone(reserved.state.actions[actionInstanceId]),
  };
  next.commands[actionInstanceId].sourceIntegrityFingerprint=runtimeTacticSourceIntegrityFingerprint(next,next.commands[actionInstanceId]);
  next.commandOrder.push(actionInstanceId);next.nextCommandSequence++;
  appendRuntimeHistory(next,runtimeHistoryEvent(next,next.commands[actionInstanceId],'START'),{actorFactionId:eligible.actor.factionId});
  validateFirst3Runtime(next,{losRules});
  return next;
}

function canonicalG03SourceProfile(runtime,actorRef){
  const actor=runtime.world.armies[actorRef],officer=runtime.world.officers.G03,growth=runtime.growthTrack?.growthStates?.G03;
  invariant(actor&&actor.commanderId==='G03'&&officer?.allegianceFactionId===actor.factionId,'G03_FIELD_COMMANDER_REQUIRED');
  invariant(officer.uniqueTrait?.id==='UT-G03','G03_UNIQUE_TRAIT_REQUIRED');
  invariant(Array.isArray(officer.tactics)&&officer.tactics.some(tactic=>tactic.id==='ART-G03'),'G03_TACTIC_RECORD_REQUIRED');
  const traitRank=growth?.ownedTraitRanks?.['UT-G03'];
  invariant(Number.isInteger(traitRank)&&traitRank>=1&&traitRank<=5,'G03_CANONICAL_TRAIT_RANK_REQUIRED');
  const strategy=officer.subStats?.['모략'];
  invariant(Number.isInteger(strategy)&&strategy>=0&&strategy<=100,'G03_CANONICAL_STRATEGY_REQUIRED');
  return {sourceUnitId:actorRef,sourceOfficerId:'G03',traitId:'UT-G03',traitRank,strategy};
}

function normalizedG03AreaTileIds(runtime,areaTileIds){
  invariant(Array.isArray(areaTileIds)&&areaTileIds.length>=G03_SLOW_TACTIC_TRIAL.minimumAreaTiles&&areaTileIds.length<=G03_SLOW_TACTIC_TRIAL.maximumAreaTiles,'G03_AREA_REQUIRES_ONE_TO_THREE_TILES');
  const normalized=areaTileIds.map(value=>{
    invariant(typeof value==='string'&&own(runtime.world.tiles,value),`UNKNOWN_G03_AREA_TILE:${value}`);
    return value;
  }).sort();
  invariant(new Set(normalized).size===normalized.length,'DUPLICATE_G03_AREA_TILE');
  return normalized;
}

function g03IssueEligibility(runtime,{actorRef,areaTileIds,losRules}){
  assertRuntimeCampaignActionable(runtime);
  const world=runtime.world,actor=world.armies[actorRef],officer=world.officers.G03;
  invariant(actor&&actor.factionId===world.playerFactionId,'G03_PLAYER_FIELD_COMMANDER_REQUIRED');
  assertRuntimeArmyActive(runtime,actorRef);
  const sourceProfile=canonicalG03SourceProfile(runtime,actorRef);
  const strategic=runtime.strategicAssignments.characters.G03;
  invariant(strategic?.armyRef===actorRef&&strategic.roles.includes('FIELD_COMMANDER'),'G03_FIELD_COMMANDER_ROLE_REQUIRED');
  invariant(officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY','G03_OFFICER_UNAVAILABLE');
  invariant(G03_SLOW_TACTIC_TRIAL.allowedTroopTypes.includes(actor.troopType)&&officer.allowedTroops.includes(actor.troopType),`G03_TROOP_NOT_ALLOWED:${actor.troopType}`);
  assertDetachmentArmyAvailable(runtime,actorRef);
  const actorDelta=runtime.combat.delta.units[actorRef];
  invariant(actorDelta?.activePersonnel>0&&!actorDelta.routePending,'ACTOR_NOT_ACTIONABLE');
  invariant(!armyHasActiveMovement(actor)&&actor.retreatState===null,'ACTOR_MOVEMENT_ACTIVE');
  invariant(assignmentForCommander(runtime,'G03')===null,'ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE');
  assertConfusionActionAllowed(runtime,actorRef,'CAST');
  const normalizedAreaTileIds=normalizedG03AreaTileIds(runtime,areaTileIds);
  const knowledge=world.knowledge[actor.factionId];
  const areaTiles=normalizedAreaTileIds.map(areaTileId=>({
    tileId:areaTileId,
    distanceTiles:hexDistance(world.tiles[actor.tileId],world.tiles[areaTileId]),
    losState:queryRuntimeKnownLos(runtime,{factionId:actor.factionId,sourceTileId:actor.tileId,targetTileId:areaTileId,losRules}).status,
    visible:knowledge.tiles[areaTileId]==='VISIBLE',
    neighborTileIds:boardNeighbors(world.tiles[areaTileId],world.tiles).map(tileId).sort(),
    observedHostileUnitIds:Object.values(knowledge.observedArmies).filter(record=>record.tileId===areaTileId&&record.factionId!==actor.factionId).map(record=>record.armyId).sort(),
  }));
  return {actor,officer,sourceProfile,areaTiles};
}

function g03ActionInstanceId(runtime,requestId){return `R8G03:${stableToken(`${campaignId(runtime.world)}:${requestId}:ART-G03`)}`;}

const G03_PUBLIC_UNAVAILABLE_REASONS=new Set([
  'G03_PLAYER_FIELD_COMMANDER_REQUIRED','G03_FIELD_COMMANDER_REQUIRED','G03_FIELD_COMMANDER_ROLE_REQUIRED','G03_OFFICER_UNAVAILABLE',
  'G03_TROOP_NOT_ALLOWED','DETACHMENT_SOURCE_ARMY_LOCKED','ACTOR_NOT_ACTIONABLE','ACTOR_MOVEMENT_ACTIVE','ACTOR_STRATEGIC_ASSIGNMENT_ACTIVE',
  'CONFUSION_ACTION_BLOCKED','G03_AREA_REQUIRES_ONE_TO_THREE_TILES','DUPLICATE_G03_AREA_TILE','AREA_NOT_CONNECTED','NO_OBSERVED_HOSTILE_IN_AREA',
  'ACTION_COOLDOWN_ACTIVE','INSUFFICIENT_STAMINA','RECOVERY_ACTIVE',
]);

function g03PublicReasonCode(error){
  const normalized=String(error?.message??'ACTION_UNAVAILABLE').split(':')[0];
  if(normalized.startsWith('AREA_TILE_')||normalized.startsWith('LOS_')||normalized==='UNKNOWN_G03_AREA_TILE')return normalized;
  return G03_PUBLIC_UNAVAILABLE_REASONS.has(normalized)?normalized:'ACTION_UNAVAILABLE';
}

export function getRuntimeG03SlowTacticAvailability(runtime,{actorRef,areaTileIds}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  try{
    const actorId=id(actorRef,'actorRef'),eligible=g03IssueEligibility(runtime,{actorRef:actorId,areaTileIds,losRules});
    const actionInstanceId=`R8G03.QUOTE.${stableToken(`${campaignId(runtime.world)}:${actorId}:${eligible.areaTiles.map(tile=>tile.tileId).join('|')}:${runtime.committedGlobalTick}`)}`;
    const adapter=createG03SlowTacticState({resolverState:runtime.combat.coordinator.actorStates[actorId],conditionLedger:runtime.combatConditions,campaignSeed:String(runtime.world.campaignSeed),sourceProfile:eligible.sourceProfile});
    const quote=quoteG03SlowTactic(adapter,{actionInstanceId,sourceUnitId:actorId,sourceOfficerId:'G03',sourceTroopType:eligible.actor.troopType,tacticId:'ART-G03',applicationBatchId:`R8G03.QUOTE.${runtime.committedGlobalTick}`,currentTick:runtime.committedGlobalTick,areaTiles:eligible.areaTiles});
    return {actionId:'ART-G03',available:quote.available,reasonCode:quote.available?null:g03PublicReasonCode({message:quote.reason})};
  }catch(error){return {actionId:'ART-G03',available:false,reasonCode:g03PublicReasonCode(error)};}
}

export function issueRuntimeG03SlowTactic(runtime,input={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(object(input),'G03 runtime tactic input is required');
  for(const key of ['traitRank','rank','resolution','outcome','outcomes','targetResults','attackerStrategy','movementProgressPermille'])invariant(!own(input,key),`G03_CALLER_FIELD_NOT_ALLOWED:${key}`);
  const requestId=id(input.requestId,'requestId'),actorRef=id(input.actorRef,'actorRef'),areaTileIds=normalizedG03AreaTileIds(runtime,input.areaTileIds);
  const actionInstanceId=g03ActionInstanceId(runtime,requestId),issueFingerprint=JSON.stringify({requestId,actorRef,areaTileIds});
  const existing=runtime.commands[actionInstanceId];
  if(existing){
    invariant(existing.commandType==='G03_SLOW_TACTIC'&&existing.issueFingerprint===issueFingerprint,`CONFLICTING_G03_RUNTIME_REQUEST:${requestId}`);
    return clone(runtime);
  }
  const eligible=g03IssueEligibility(runtime,{actorRef,areaTileIds,losRules});
  const currentTick=runtime.committedGlobalTick,dueGlobalTick=currentTick+G03_SLOW_TACTIC_TRIAL.windupTicks,applicationBatchId=`RUNTIME.BATCH.${dueGlobalTick}`;
  const adapter=createG03SlowTacticState({resolverState:runtime.combat.coordinator.actorStates[actorRef],conditionLedger:runtime.combatConditions,campaignSeed:String(runtime.world.campaignSeed),sourceProfile:eligible.sourceProfile});
  const reserved=reserveG03SlowTactic(adapter,{actionInstanceId,sourceUnitId:actorRef,sourceOfficerId:'G03',sourceTroopType:eligible.actor.troopType,tacticId:'ART-G03',applicationBatchId,currentTick,areaTiles:eligible.areaTiles});
  const next=clone(runtime);
  next.combat.coordinator.actorStates[actorRef]=reserved.state.resolverState;
  next.combatConditions=reserved.state.conditionLedger;
  next.commands[actionInstanceId]={
    actionInstanceId,commandType:'G03_SLOW_TACTIC',requestId,issueFingerprint,actorRef,targetRef:null,actionId:'ART-G03',
    issuedGlobalTick:currentTick,dueGlobalTick,pathTileIds:[],areaTileIds,applicationBatchId,
    g03SourceProfile:clone(eligible.sourceProfile),g03AdapterAction:clone(reserved.state.actions[actionInstanceId]),
  };
  next.commands[actionInstanceId].sourceIntegrityFingerprint=runtimeTacticSourceIntegrityFingerprint(next,next.commands[actionInstanceId]);
  next.commandOrder.push(actionInstanceId);next.nextCommandSequence++;
  appendRuntimeG03History(next,runtimeG03HistoryEvent(next,next.commands[actionInstanceId],'START'),{actorFactionId:eligible.actor.factionId});
  validateFirst3Runtime(next,{losRules});
  return next;
}

function spatialChargeValidation(runtime,command){
  try{return {valid:true,pathTileIds:validateChargePath(runtime,command.actorRef,command.targetRef,command.pathTileIds)};}
  catch(error){return {valid:false,internalReason:error.message};}
}

function applyChargeMovement(runtime,command,pathTileIds){
  const actor=runtime.world.armies[command.actorRef];
  actor.tileId=pathTileIds.at(-1);
  actor.currentOrder=null;
  actor.movementState=null;
}

function validateExecutionSnapshot(runtime,command,losRules){
  const world=runtime.world,actor=world.armies[command.actorRef],target=world.armies[command.targetRef];
  if(!actor||!target)return {valid:false,internalReason:'TARGET_INVALID'};
  if(!runtimeArmyIsActive(runtime,command.actorRef))return {valid:false,internalReason:'ACTOR_INACTIVE'};
  if(!runtimeArmyIsActive(runtime,command.targetRef))return {valid:false,internalReason:'TARGET_INACTIVE'};
  const actorUnit=runtime.combat.delta.units[command.actorRef],targetUnit=runtime.combat.delta.units[command.targetRef];
  if(!actorUnit||actorUnit.activePersonnel===0)return {valid:false,internalReason:'ACTOR_INCAPACITATED'};
  if(actorUnit.routePending)return {valid:false,internalReason:'ACTOR_ROUTING'};
  if(!targetUnit||targetUnit.activePersonnel===0)return {valid:false,internalReason:'TARGET_INVALID'};
  if(!own(world.knowledge[actor.factionId].observedArmies,command.targetRef))return {valid:false,internalReason:'TARGET_NOT_OBSERVED'};
  const permission=evaluateConfusionActionPermission(runtime.combatConditions,{targetUnitId:command.actorRef,globalTick:getGlobalTick(world),actionKind:runtimeConfusionActionKind(command.actionId)});
  if(!permission.allowed)return {valid:false,internalReason:permission.reason};
  const action=definition(command.actionId),distance=hexDistance(world.tiles[actor.tileId],world.tiles[target.tileId]);
  if(['BASIC_ATTACK','CAVALRY_CHARGE'].includes(command.actionId)&&distance!==1)return {valid:false,internalReason:'OUT_OF_RANGE'};
  if(command.actionId==='RANGED_VOLLEY'){
    if(distance<2||distance>3)return {valid:false,internalReason:distance<2?'TOO_CLOSE':'OUT_OF_RANGE'};
    const los=queryCanonicalLineOfSight(losRules,{sourceTileId:actor.tileId,targetTileId:target.tileId});
    if(los.status!=='CLEAR')return {valid:false,internalReason:`LOS_${los.status}`,losState:los.status};
    return {valid:true,losState:'CLEAR'};
  }
  return {valid:true};
}

function isG21RuntimeCommand(command){return command?.commandType==='G21_CONFUSION_TACTIC'&&command.actionId==='ART-G21';}
function isG03RuntimeCommand(command){return command?.commandType==='G03_SLOW_TACTIC'&&command.actionId==='ART-G03';}
function isIdentityRuntimeCommand(command){return command?.commandType==='R9_IDENTITY_TACTIC'&&['ART-G07','ART-G08'].includes(command.actionId);}
function isSpecialTacticRuntimeCommand(command){return isG21RuntimeCommand(command)||isG03RuntimeCommand(command)||isIdentityRuntimeCommand(command);}

function g21AdapterState(runtime,command){
  return createG21ConfusionTacticState({
    resolverState:runtime.combat.coordinator.actorStates[command.actorRef],
    conditionLedger:runtime.combatConditions,
    actions:{[command.actionInstanceId]:clone(command.g21AdapterAction)},
  });
}

function g21ExecutionSnapshot(runtime,command,losRules){
  const world=runtime.world,actor=world.armies[command.actorRef],target=world.armies[command.targetRef];
  const actorUnit=runtime.combat.delta.units[command.actorRef],targetUnit=runtime.combat.delta.units[command.targetRef];
  const sourceAvailable=Boolean(actor&&runtimeArmyIsActive(runtime,command.actorRef)&&actorUnit&&actorUnit.activePersonnel>0&&!actorUnit.routePending&&!armyHasActiveMovement(actor)&&actor.retreatState===null&&assignmentForCommander(runtime,actor.commanderId)===null);
  const targetAvailable=Boolean(target&&runtimeArmyIsActive(runtime,command.targetRef)&&targetUnit&&targetUnit.activePersonnel>0&&!targetUnit.routePending&&actor&&actor.factionId!==target.factionId&&own(world.knowledge[actor.factionId].observedArmies,command.targetRef));
  let distanceTiles=G21_CONFUSION_TACTIC_TRIAL.rangeTiles+1,losState='UNKNOWN';
  if(actor&&target){
    distanceTiles=hexDistance(world.tiles[actor.tileId],world.tiles[target.tileId]);
    losState=queryCanonicalLineOfSight(losRules,{sourceTileId:actor.tileId,targetTileId:target.tileId}).status;
  }
  return {distanceTiles,losState,sourceAvailable,targetAvailable};
}

function g03AdapterState(runtime,command){
  return createG03SlowTacticState({
    resolverState:runtime.combat.coordinator.actorStates[command.actorRef],
    conditionLedger:runtime.combatConditions,
    campaignSeed:String(runtime.world.campaignSeed),
    sourceProfile:clone(command.g03SourceProfile),
    actions:{[command.actionInstanceId]:clone(command.g03AdapterAction)},
  });
}

function g03ExecutionSnapshot(runtime,command,losRules){
  const world=runtime.world,actor=world.armies[command.actorRef],actorUnit=runtime.combat.delta.units[command.actorRef];
  const sourceAvailable=Boolean(actor&&runtimeArmyIsActive(runtime,command.actorRef)&&actor.commanderId==='G03'&&actorUnit&&actorUnit.activePersonnel>0&&!actorUnit.routePending&&!armyHasActiveMovement(actor)&&actor.retreatState===null&&assignmentForCommander(runtime,'G03')===null);
  const areaTiles=command.areaTileIds.map(areaTileId=>({
    tileId:areaTileId,
    distanceTiles:actor?hexDistance(world.tiles[actor.tileId],world.tiles[areaTileId]):G03_SLOW_TACTIC_TRIAL.rangeTiles+1,
    losState:actor?queryCanonicalLineOfSight(losRules,{sourceTileId:actor.tileId,targetTileId:areaTileId}).status:'UNKNOWN',
  }));
  const area=new Set(command.areaTileIds),knowledge=actor?world.knowledge[actor.factionId]:null;
  const targetUnits=actor&&knowledge?Object.values(knowledge.observedArmies).filter(record=>area.has(record.tileId)&&record.factionId!==actor.factionId).map(record=>{
    const target=world.armies[record.armyId],unit=runtime.combat.delta.units[record.armyId],officer=target?world.officers[target.commanderId]:null;
    if(!target||!unit||unit.activePersonnel===0||unit.routePending||!Number.isInteger(officer?.subStats?.['간파']))return null;
    return {targetUnitId:record.armyId,tileId:record.tileId,defenderInsight:officer.subStats['간파']};
  }).filter(Boolean).sort((a,b)=>a.targetUnitId.localeCompare(b.targetUnitId)):[];
  return {sourceAvailable,areaTiles,targetUnits};
}

function g21ControlResolution(runtime,command){
  const actor=runtime.world.armies[command.actorRef],target=runtime.world.armies[command.targetRef];
  const attacker=runtime.world.officers[actor.commanderId],defender=runtime.world.officers[target.commanderId];
  const strategy=attacker?.subStats?.[G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.attackerSubStat],insight=defender?.subStats?.[G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.defenderSubStat];
  invariant(Number.isInteger(strategy)&&Number.isInteger(insight),'G21_CONTROL_STATS_REQUIRED');
  const raw=G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.baseChancePercent+(strategy-insight)*G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.percentPerPoint;
  const thresholdPercent=Math.max(G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.minimumChancePercent,Math.min(G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.maximumChancePercent,raw));
  const roll=Number(BigInt(`0x${stableToken(`${runtime.world.campaignSeed}:${command.actionInstanceId}:ART-G21`)}`)%100n)+1;
  return {
    status:'WORK_TRIAL',attackerSubStat:'모략',defenderSubStat:'간파',strategy,insight,thresholdPercent,roll,
    controlApplied:roll<=thresholdPercent,
    deterministicInput:G21_RUNTIME_CONTROL_RESOLUTION_TRIAL.deterministicInput,
  };
}

function pendingG21TargetActivity(runtime,targetRef,excludeActionInstanceId){
  const inProgressActions=runtime.commandOrder.map(actionInstanceId=>runtime.commands[actionInstanceId]).filter(command=>command.actionInstanceId!==excludeActionInstanceId&&command.actorRef===targetRef&&isSpecialTacticRuntimeCommand(command)&&runtime.combat.coordinator.actorStates[command.actorRef]?.instances[command.actionInstanceId]?.status==='RESERVED').map(command=>({actionInstanceId:command.actionInstanceId,actionKind:'CAST'}));
  return {inProgressActions,activeProtectionIds:[],completedDeploymentIds:[]};
}

function interruptPendingG21Command(runtime,actionInstanceId,currentTick){
  const command=runtime.commands[actionInstanceId];
  invariant(isG21RuntimeCommand(command),`RUNTIME_G21_INTERRUPTION_TARGET_INVALID:${actionInstanceId}`);
  const interrupted=interruptReservedG21ConfusionTactic(g21AdapterState(runtime,command),{actionInstanceId,currentTick,internalReason:'CONFUSION_APPLIED'});
  runtime.combat.coordinator.actorStates[command.actorRef]=interrupted.state.resolverState;
  runtime.combatConditions=interrupted.state.conditionLedger;
  command.g21AdapterAction=clone(interrupted.state.actions[actionInstanceId]);
  command.g21Result=clone(interrupted.result);
  command.g21ControlResolution=null;
  return command;
}

function interruptPendingG03Command(runtime,actionInstanceId,currentTick){
  const command=runtime.commands[actionInstanceId];
  invariant(isG03RuntimeCommand(command),`RUNTIME_G03_INTERRUPTION_TARGET_INVALID:${actionInstanceId}`);
  const interrupted=interruptReservedG03SlowTacticForConfusion(g03AdapterState(runtime,command),{actionInstanceId,currentTick});
  runtime.combat.coordinator.actorStates[command.actorRef]=interrupted.state.resolverState;
  runtime.combatConditions=interrupted.state.conditionLedger;
  command.g03AdapterAction=clone(interrupted.state.actions[actionInstanceId]);
  command.g03Result=clone(interrupted.result);
  return command;
}

function conditionSourceActionId(runtime,status){
  const command=runtime.commandOrder.map(actionId=>runtime.commands[actionId]).find(item=>item.g21AdapterAction?.command?.statusInstanceId===status.statusInstanceId);
  return command?.actionInstanceId??`CONDITION.${status.statusInstanceId}`;
}

function syncConfusionControlProjection(runtime,currentTick){
  for(const unitId of ids(runtime.combat.delta.units)){
    const unit=runtime.combat.delta.units[unitId],active=getActiveCombatConditions(runtime.combatConditions,{targetUnitId:unitId,globalTick:currentTick,statusKey:'CONFUSION'})[0]??null;
    if(!active||unit.activePersonnel===0){unit.control=null;continue;}
    const sourceActionInstanceId=conditionSourceActionId(runtime,active);
    unit.control={active:true,sourceActionInstanceId,sourceResultId:`${sourceActionInstanceId}/${unitId}/0`,appliedTick:active.startGlobalTick};
  }
}

function attackInput(runtime,command){
  const actor=runtime.world.armies[command.actorRef],officer=officerForArmy(runtime.world,actor);
  const settings={
    BASIC_ATTACK:{coefficient:0.10,abilityKey:'공격지휘'},
    CAVALRY_CHARGE:{coefficient:0.25,abilityKey:'완력'},
    RANGED_VOLLEY:{coefficient:0.10,abilityKey:'공격지휘'},
  }[command.actionId];
  invariant(settings,`UNSUPPORTED_CALCULATOR_ACTION:${command.actionId}`);
  return {actorRef:command.actorRef,actionInstanceId:command.actionInstanceId,targetRef:command.targetRef,coefficient:settings.coefficient,abilityValue:officer.subStats[settings.abilityKey],directProtectionRate:0};
}

function dueCommands(runtime,currentTick){
  return runtime.commandOrder.map(commandId=>runtime.commands[commandId]).filter(command=>{
    const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
    return instance?.status==='RESERVED'&&command.dueGlobalTick<=currentTick;
  }).sort((a,b)=>a.actionInstanceId.localeCompare(b.actionInstanceId));
}

function runtimeTacticCooldownDescriptor(runtime,armyId,currentTick){
  const cooldowns=runtime.combat.coordinator.actorStates[armyId].lifecycleState.cooldownEnds;
  const endGlobalTickExclusive=Math.max(cooldowns.TACTIC_CONTROL??0,cooldowns.TREAT_RALLY??0);
  if(endGlobalTickExclusive<=currentTick)return null;
  const command=[...runtime.commandOrder].reverse().map(commandId=>runtime.commands[commandId]).find(item=>item.actorRef===armyId&&isSpecialTacticRuntimeCommand(item)&&runtime.combat.coordinator.actorStates[armyId].instances[item.actionInstanceId]?.status!=='CANCELLED');
  invariant(command,`RUNTIME_TACTIC_COOLDOWN_OWNER_MISSING:${armyId}`);
  if(isIdentityRuntimeCommand(command))return {runtimeOwner:command.actionId,cooldownFamily:command.actionId==='ART-G07'?'COMMAND_COORDINATION':'MORALE_SUPPORT',endGlobalTickExclusive,status:'WORK_TRIAL'};
  return isG03RuntimeCommand(command)
    ?{runtimeOwner:'ART-G03',cooldownFamily:'MOVEMENT_CONTROL',endGlobalTickExclusive,status:'WORK_TRIAL'}
    :{runtimeOwner:'ART-G21',cooldownFamily:'MENTAL_DISRUPTION',endGlobalTickExclusive,status:'WORK_TRIAL'};
}

function projectCommittedCombat(runtime){
  const currentTick=getGlobalTick(runtime.world);
  for(const armyId of ids(runtime.world.armies)){
    if(!runtimeArmyIsActive(runtime,armyId)){runtime.combat.delta.units[armyId].control=null;continue;}
    const army=runtime.world.armies[armyId];
    const delta=runtime.combat.delta.units[armyId],calculator=runtime.combat.calculator.units[armyId];
    const ledger=runtime.combat.coordinator.actorStates[armyId].lifecycleState.stamina;
    invariant(delta.activePersonnel===calculator.activePersonnel&&delta.woundedPersonnel===calculator.woundedPersonnel&&delta.deadPersonnel===calculator.deadPersonnel&&delta.morale===calculator.morale&&delta.routePending===calculator.routePending,`COMBAT_PROJECTION_MISMATCH:${armyId}`);
    army.troopCount=delta.activePersonnel;
    army.woundedCount=delta.woundedPersonnel;
    army.deadCount=delta.deadPersonnel;
    army.morale=delta.morale;
    army.hp=calculator.currentHp;
    army.maxHp=calculator.maxHp;
    army.stamina=ledger.current;
    army.cooldowns=army.cooldowns.filter(item=>!['ART-G21','ART-G03','ART-G07','ART-G08'].includes(item?.runtimeOwner));
    const tacticCooldown=runtimeTacticCooldownDescriptor(runtime,armyId,currentTick);
    if(tacticCooldown)army.cooldowns.push(tacticCooldown);
  }
  updateKnowledge(runtime.world);
}

function settleRuntimeCityBoundary(runtime){
  if(!runtime.citySettlement){
    if(runtime.citySettlementPendingEconomy&&runtime.world.turnPhase==='PLANNING'&&runtime.world.time.tick===0){
      runtime.citySettlement=createCitySettlementWorldSnapshot({world:runtime.world,economy:runtime.citySettlementPendingEconomy});
      runtime.world=clone(runtime.citySettlement.world);
      runtime.citySettlementPendingEconomy=null;
      runtime.integrationSlots=integrationSlots(runtime.growthTrack,runtime.citySettlement);
    }
    return [];
  }
  if(runtime.world.turnPhase!=='PLANNING'||runtime.world.time.tick!==0)return [];
  const eventId=`R6.CITY.SETTLE.T${runtime.world.turnNumber-1}`;
  if(Object.values(runtime.world.cities).some(city=>city.occupationState==='TEMPORARY_OCCUPATION'))return settleRuntimeCityBoundaryWithTemporaryOccupation(runtime,eventId);
  const settled=settleCityWorldTurn(runtime.citySettlement,{eventId,world:runtime.world});
  runtime.citySettlement=settled.snapshot;
  runtime.world=clone(settled.snapshot.world);
  return Object.values(settled.results).map(clone);
}

function runtimeRound(value){return Number(value.toFixed(6));}

function deriveRuntimeCityEconomy(runtime,cityId){
  const world=runtime.world,city=world.cities[cityId],economy=runtime.citySettlement.economy,isNormal=city.occupationState==='NORMAL';
  let baseFood=economy.center.food,baseProduction=economy.center.production,baseScience=economy.center.science;
  for(const workedTileId of city.workedTiles){const yieldValue=economy.tiles[world.tiles[workedTileId].terrainType];baseFood+=yieldValue.food;baseProduction+=yieldValue.production;baseScience+=yieldValue.science;}
  let fieldArmies=Object.values(world.armies).filter(army=>army.factionId===city.ownerFactionId&&runtimeArmyIsActive(runtime,army.armyId));
  const faction=world.factions[city.ownerFactionId];
  if(faction.ownedCityIds.length>1)fieldArmies=fieldArmies.filter(army=>(army.supportCityId??faction.capitalCityId)===cityId);
  const supportedSoldiers=fieldArmies.reduce((sum,army)=>sum+army.troopCount+army.woundedCount,0)+city.reserveTroops+city.woundedTroops;
  const consumptionRequired=runtimeRound(city.population*economy.citizen_food+supportedSoldiers/1000*economy.soldier_food_per_1000);
  if(!isNormal)return {cityId,baseFood,baseProduction,baseScience,producedFood:0,producedProduction:0,producedScience:0,producedPrestige:0,growthMultiplier:0,supportedSoldiers,consumptionRequired};
  const governor=world.officers[city.governorId];invariant(governor&&governor.allegianceFactionId===city.ownerFactionId,`CITY_GOVERNOR_UNAVAILABLE:${cityId}`);
  const secondaryBonus=value=>{let bonus=0;for(let index=0;index<economy.governor.secondary_thresholds.length;index++)if(value>=economy.governor.secondary_thresholds[index])bonus=economy.governor.secondary_bonuses[index];return bonus;};
  const nationalTotal=Object.values(world.officers).filter(officer=>officer.allegianceFactionId===city.ownerFactionId).reduce((sum,officer)=>sum+Object.values(officer.baseStats).reduce((part,value)=>part+value,0),0);
  const nationBonus=Math.min(economy.nation_bonus_cap,Math.floor(nationalTotal/100)*economy.nation_bonus_per_100_total_ability);
  const outputBonus=(majorKey,secondaryKey)=>governor.baseStats[majorKey]/100*economy.governor.major_bonus_at_100+secondaryBonus(governor.subStats[secondaryKey])+nationBonus;
  const securityProfile=city.security==='STABLE'?null:economy[city.security==='UNREST'?'unrest':'chaos'];
  const security=securityProfile?{production:securityProfile.production,science:securityProfile.science,prestige:securityProfile.fame,growth:securityProfile.growth}:{production:1,science:1,prestige:1,growth:1};
  return {cityId,baseFood,baseProduction,baseScience,producedFood:runtimeRound(baseFood*(1+outputBonus('politics','농정'))),producedProduction:runtimeRound(baseProduction*(1+outputBonus('politics','행정'))*security.production),producedScience:runtimeRound(baseScience*(1+outputBonus('intelligence','간파'))*security.science),producedPrestige:runtimeRound(economy.center.fame*(1+outputBonus('charisma','친화'))*security.prestige),growthMultiplier:security.growth,supportedSoldiers,consumptionRequired};
}

function settleRuntimeCityBoundaryWithTemporaryOccupation(runtime,eventId){
  const snapshot=runtime.citySettlement;validateCitySettlementWorldSnapshot(snapshot);invariant(!snapshot.processedEvents[eventId],`CONFLICTING_CITY_WORLD_EVENT_REPLAY:${eventId}`);
  const nextWorld=clone(runtime.world),nextStates=clone(snapshot.cityStates),settlementTurn=runtime.world.turnNumber-1,results={};
  for(const cityId of ids(nextWorld.cities)){
    const previousCity=snapshot.world.cities[cityId],city=nextWorld.cities[cityId],derived=deriveRuntimeCityEconomy(runtime,cityId),isNormal=city.occupationState==='NORMAL';
    invariant(previousCity&&city.growthProgress!==undefined,`RUNTIME_CITY_SETTLEMENT_CITY_INVALID:${cityId}`);
    const openingAvailable=runtimeRound(city.foodStock-city.reservedResources.food),availableCapacity=city.foodCapacity-city.reservedResources.food;
    const effectiveFoodProduction=isNormal?runtimeRound(Math.min(derived.producedFood,Math.max(0,availableCapacity-openingAvailable+derived.consumptionRequired))):0;
    const growthProgressGain=isNormal?runtimeRound(Math.max(0,derived.producedFood-derived.consumptionRequired)*derived.growthMultiplier):0;
    const hasShortage=openingAvailable+effectiveFoodProduction<derived.consumptionRequired;
    const productionProgressGain=isNormal&&city.currentProduction!==null?runtimeRound(derived.producedProduction*(hasShortage?snapshot.economy.no_food_production_multiplier:1)):0;
    const settlement=settleCityTurn(nextStates[cityId],{
      settlementId:`${eventId}:${cityId}`,turn:settlementTurn,ownerFactionId:city.ownerFactionId,occupationStatus:isNormal?'NORMAL':'OCCUPIED',
      ownershipChangedThisTurn:previousCity.ownerFactionId!==city.ownerFactionId,producedFood:effectiveFoodProduction,consumptionRequired:derived.consumptionRequired,inboundShipments:[],productionProgressGain,growthProgressGain,
      growthResolution:isNormal?{population:city.population,populationCapacity:city.populationCapacity,foodCost:runtimeRound(city.population*snapshot.economy.growth_food_per_current_citizen)}:null,
    });
    nextStates[cityId]=settlement.state;city.foodStock=runtimeRound(city.reservedResources.food+settlement.state.foodStock);city.productionProgress=settlement.state.productionProgress;city.growthProgress=settlement.state.growthProgress;city.population+=settlement.result.populationGain;
    const appliedScience=isNormal?derived.producedScience:0,appliedPrestige=isNormal?derived.producedPrestige:0;
    nextWorld.factions[city.ownerFactionId].science=runtimeRound(nextWorld.factions[city.ownerFactionId].science+appliedScience);nextWorld.factions[city.ownerFactionId].prestige=runtimeRound(nextWorld.factions[city.ownerFactionId].prestige+appliedPrestige);
    results[cityId]={...settlement.result,derivedEconomy:derived,effectiveFoodProduction,appliedScience,appliedPrestige,closingPopulation:city.population,reservedFoodPreserved:city.reservedResources.food};
  }
  const nextSnapshot={...clone(snapshot),world:nextWorld,cityStates:nextStates,processedEvents:{...clone(snapshot.processedEvents),[eventId]:{eventId,turn:settlementTurn,results:clone(results)}}};
  runtime.citySettlement=validateCitySettlementWorldSnapshot(nextSnapshot);runtime.world=clone(nextWorld);
  return Object.entries(results).map(([cityId,result])=>({...clone(result),occupationStatus:runtime.world.cities[cityId].occupationState}));
}

function syncRuntimeRecruitmentWorld(runtime){
  if(!runtime.recruitment)return;
  const state=clone(runtime.recruitment.recruitment);
  for(const factionId of ids(runtime.world.factions))state.factions[factionId].prestige=runtime.world.factions[factionId].prestige;
  runtime.recruitment=createRecruitmentWorldSnapshot({world:runtime.world,recruitmentState:state});
}

function mergeRecruitmentGrowthPool(base,contract){
  invariant(base&&contract?.traitPoolExtension,'RUNTIME_RECRUITMENT_GROWTH_CONTRACT_REQUIRED');
  const extension=contract.traitPoolExtension;invariant(base.poolVersion===extension.basePoolVersionRequired,'RUNTIME_RECRUITMENT_GROWTH_BASE_MISMATCH');
  const existing=new Set(base.traits.map(trait=>trait.traitId));invariant(extension.traits.every(trait=>!existing.has(trait.traitId)),'RUNTIME_RECRUITMENT_GROWTH_TRAIT_COLLISION');
  return {...clone(base),poolVersion:extension.outputPoolVersion,status:'round06_recruitment_runtime_pool',traits:[...clone(base.traits),...clone(extension.traits)]};
}

function materializeRecruitmentOfficer(runtime,proposal){
  const template=runtime.recruitmentContracts.officerContract.officerTemplateCore,destinationId=proposal.arrivalPlan.destinationRef.slice(5);
  return {...clone(template),allegianceFactionId:proposal.factionId,locationRef:{kind:'CITY',id:destinationId},lifeState:'ALIVE',conditionState:'NORMAL',captivityState:'FREE',captorFactionId:null,travelState:'STATIONARY'};
}

function addStrategicReserveCharacter(runtime,officer){
  runtime.strategicAssignments.characters[officer.officerId]={characterId:officer.officerId,factionId:officer.allegianceFactionId,locationRef:`CITY:${officer.locationRef.id}`,officeRef:null,armyRef:null,assignmentId:null,busyUntilGlobalTick:runtime.committedGlobalTick,injuryState:'FIT',captivityState:'FREE',lifeState:'ALIVE',travelState:'STATIONARY',roles:[]};
}

function commitArrivedRecruitment(runtime,proposal){
  const officer=materializeRecruitmentOfficer(runtime,proposal),prepared=prepareRecruitmentWorldRosterDelta(runtime.recruitment,{eventId:`R6.ROSTER.PREP.${proposal.proposalId}`,proposalId:proposal.proposalId,canonicalOfficerRecord:officer,canonicalSourceRef:runtime.externalRecruitCandidates.candidates.G21.canonicalSourceRef});
  let world=clone(runtime.world);world.officers[officer.officerId]=clone(officer);world.factions[officer.allegianceFactionId].officerIds.push(officer.officerId);world.factions[officer.allegianceFactionId].officerIds.sort();world=synchronizeCampaignTerminalWorldRoster(world);validateState(world);
  invariant(runtime.growthTrack&&runtime.growthProgress&&runtime.growthPoolData,'RUNTIME_RECRUITMENT_GROWTH_NOT_CONFIGURED');
  const pool=mergeRecruitmentGrowthPool(runtime.growthPoolData,runtime.recruitmentContracts.growthContract),growthContract=runtime.recruitmentContracts.growthContract.growthContract;
  runtime.growthTrack=registerGrowthTrackCharacter(runtime.growthTrack,{pool,character:{characterId:'G21',controllerType:officer.allegianceFactionId===world.playerFactionId?'PLAYER':'AI',coreTraitId:growthContract.coreTraitId,affinityTags:clone(growthContract.affinityTags),level:officer.level,aptitudePoints:officer.aptitudePoints}});
  runtime.growthProgress=registerGrowthProgressCharacter(runtime.growthProgress,{characterId:'G21',level:officer.level});runtime.growthPoolData=pool;runtime.growthPoolBinding={poolVersion:pool.poolVersion,sourceType:pool.sourceType,fixture:pool.fixture===true};
  runtime.world=world;synchronizeRuntimeTerminalRoster(runtime);addStrategicReserveCharacter(runtime,officer);
  runtime.recruitment=acknowledgeRecruitmentWorldRosterDelta(prepared.snapshot,{eventId:`R6.ROSTER.ACK.${proposal.proposalId}`,proposalId:proposal.proposalId,deltaId:prepared.deltaId,world});
  runtime.externalRecruitCandidates=markExternalRecruitRostered(runtime.externalRecruitCandidates,{eventId:`R6.EXTERNAL.ROSTER.${proposal.proposalId}`,candidateId:'G21',proposalId:proposal.proposalId});
}

function advanceRuntimeRecruitment(runtime){
  if(!runtime.recruitment)return [];
  const hasProposals=Object.keys(runtime.recruitment.recruitment.proposals).length>0,isBoundary=runtime.world.turnPhase==='PLANNING'&&runtime.world.time.tick===0;
  if(!hasProposals&&!isBoundary)return [];
  runtime.externalRecruitCandidates=advanceExternalRecruitCandidates(runtime.externalRecruitCandidates,{world:runtime.world,globalTick:runtime.committedGlobalTick});
  const decisions=[];
  for(const candidate of Object.values(runtime.externalRecruitCandidates.candidates)){
    const proposal=candidate.proposalId?runtime.recruitment.recruitment.proposals[candidate.proposalId]:null;
    if(candidate.status==='ARRIVED'&&proposal?.status==='JOINING'){
      syncRuntimeRecruitmentWorld(runtime);
      const recruitment=applyRecruitmentTravelEvent(runtime.recruitment.recruitment,{eventId:`R6.EXTERNAL.ARRIVE.${proposal.proposalId}`,proposalId:proposal.proposalId,type:'ARRIVED',currentTurn:runtime.world.turnNumber,locationRef:proposal.arrivalPlan.destinationRef});
      runtime.recruitment=createRecruitmentWorldSnapshot({world:runtime.world,recruitmentState:recruitment});decisions.push({proposalId:proposal.proposalId,status:'ARRIVED_PENDING_ACTIVATION'});
    }
  }
  if(isBoundary){
    syncRuntimeRecruitmentWorld(runtime);
    const negotiating=Object.values(runtime.recruitment.recruitment.proposals).filter(proposal=>proposal.status==='NEGOTIATING'&&runtime.world.turnNumber>=proposal.createdTurn+1);
    if(negotiating.length){
      const eligibilityByProposalId={},arrivalPlansByProposalId={};for(const proposal of negotiating){const cityId=runtime.world.factions[proposal.factionId].capitalCityId;eligibilityByProposalId[proposal.proposalId]={eligible:true};arrivalPlansByProposalId[proposal.proposalId]={destinationRef:`CITY:${cityId}`,routeId:`R6.EXTERNAL.${proposal.targetOfficerId}.${cityId}`,expectedArrivalTurn:runtime.world.turnNumber+1};}
      runtime.recruitment=resolveRecruitmentWorldAgreements(runtime.recruitment,{eventId:`R6.RECRUIT.RESOLVE.T${runtime.world.turnNumber}`,currentTurn:runtime.world.turnNumber,eligibilityByProposalId,arrivalPlansByProposalId});runtime.world=clone(runtime.recruitment.world);
      if(runtime.citySettlement)for(const factionId of ids(runtime.world.factions))runtime.citySettlement.world.factions[factionId].prestige=runtime.world.factions[factionId].prestige;
      for(const proposal of negotiating.map(item=>runtime.recruitment.recruitment.proposals[item.proposalId]).filter(item=>item.status==='JOINING')){const cityId=itemDestination(proposal);runtime.externalRecruitCandidates=startExternalRecruitTravel(runtime.externalRecruitCandidates,{eventId:`R6.EXTERNAL.START.${proposal.proposalId}`,candidateId:proposal.targetOfficerId,proposalId:proposal.proposalId,factionId:proposal.factionId,destinationCityId:cityId,world:runtime.world,globalTick:runtime.committedGlobalTick});decisions.push({proposalId:proposal.proposalId,status:'JOINING'});}
    }
    runtime.recruitment=openRecruitmentWorldCommandPhase(runtime.recruitment,{eventId:`R6.RECRUIT.COMMAND.T${runtime.world.turnNumber}`,currentTurn:runtime.world.turnNumber});
    for(const proposal of Object.values(runtime.recruitment.recruitment.proposals).filter(item=>item.status==='ROSTER_TRANSFER_PENDING')){commitArrivedRecruitment(runtime,proposal);decisions.push({proposalId:proposal.proposalId,status:'ACTIVE'});}
  }
  return decisions;
}

function itemDestination(proposal){return proposal.arrivalPlan.destinationRef.slice(5);}

export function startRuntimeRecruitment(runtime,{candidateId='G21',agentOfficerId=null,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);invariant(runtime.recruitment&&runtime.world.turnPhase==='PLANNING','RUNTIME_RECRUITMENT_REQUIRES_PLANNING');const candidate=runtime.externalRecruitCandidates.candidates[candidateId];invariant(candidate?.status==='AVAILABLE','RUNTIME_RECRUITMENT_CANDIDATE_UNAVAILABLE');
  if(agentOfficerId)assertDetachmentOfficerAvailable(runtime,agentOfficerId);
  const factionId=runtime.world.playerFactionId,agent=agentOfficerId?runtime.world.officers[agentOfficerId]:null,proposalId=`R6.RECRUIT.${factionId}.${candidateId}.T${runtime.world.turnNumber}`,next=clone(runtime);syncRuntimeRecruitmentWorld(next);
  next.recruitment=reserveRecruitmentWorldProposal(next.recruitment,{proposalId,factionId,targetOfficerId:candidateId,candidateSourceRef:candidate.sourceRef,agentOfficerId,agentCharisma:agent?.baseStats.charisma??0,agentRecruitment:agent?.subStats['등용']??0,tieBreakPriority:1,createdTurn:next.world.turnNumber});
  next.externalRecruitCandidates.candidates[candidateId].availability='NEGOTIATING';validateFirst3Runtime(next,{losRules});return next;
}

export function cancelRuntimeRecruitment(runtime,{proposalId,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);const next=clone(runtime),proposal=next.recruitment.recruitment.proposals[proposalId];next.recruitment=cancelRecruitmentWorldProposal(next.recruitment,{eventId:`R6.RECRUIT.CANCEL.${proposalId}`,proposalId,reason:'PLAYER_CANCELLED'});const candidate=next.externalRecruitCandidates.candidates[proposal.targetOfficerId];candidate.availability='AVAILABLE';validateFirst3Runtime(next,{losRules});return next;
}

function recruitedDetachmentOfficer(runtime,officerId){
  if(!runtime.recruitment||officerId!=='G21')return null;
  const proposal=Object.values(runtime.recruitment.recruitment.proposals).find(item=>item.targetOfficerId===officerId&&item.status==='ACTIVE');
  const candidate=runtime.externalRecruitCandidates?.candidates?.[officerId];
  return proposal&&candidate?.status==='ROSTERED'?runtime.world.officers[officerId]??null:null;
}

function detachmentToken(runtime,requestId){return stableToken(`${campaignId(runtime.world)}:${requestId}`);}

export function scheduleRuntimeDetachment(runtime,{requestId,sourceArmyId,officerId='G21',cityId,newArmyId,transferTroopCount}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  assertRuntimeCampaignActionable(runtime);assertRuntimeArmyActive(runtime,sourceArmyId);
  for(const[value,label]of [[requestId,'requestId'],[sourceArmyId,'sourceArmyId'],[officerId,'officerId'],[cityId,'cityId'],[newArmyId,'newArmyId']])id(value,label);
  invariant(Number.isSafeInteger(transferTroopCount)&&transferTroopCount>0,'DETACHMENT_TRANSFER_TROOPS_REQUIRED');
  const token=detachmentToken(runtime,requestId),startEventId=`R7C1.DETACH.START.${token}`,preparationId=`R7C1.DETACH.PREP.${token}`;
  if(runtime.detachmentPreparation!==null){
    const existing=runtime.detachmentPreparation.preparation;
    const sameRequest=existing?.startEventId===startEventId&&existing.preparationId===preparationId;
    invariant(!sameRequest||same({sourceArmyId,officerId,cityId,newArmyId,transferTroopCount},{sourceArmyId:existing.sourceArmyId,officerId:existing.officerId,cityId:existing.cityId,newArmyId:existing.newArmyId,transferTroopCount:existing.transferTroopCount}),`RUNTIME_DETACHMENT_SCHEDULE_REPLAY_CONFLICT:${requestId}`);
    if(sameRequest)return clone(runtime);
    throw new Error('RUNTIME_DETACHMENT_SIDECAR_ALREADY_USED');
  }
  const source=runtime.world.armies[sourceArmyId],officer=recruitedDetachmentOfficer(runtime,officerId);
  invariant(source&&source.factionId===runtime.world.playerFactionId,'DETACHMENT_SOURCE_ARMY_NOT_PLAYER_OWNED');
  invariant(officer&&officer.allegianceFactionId===source.factionId,'RUNTIME_DETACHMENT_RECRUIT_NOT_ACTIVE');
  invariant(assignmentForCommander(runtime,source.commanderId)===null&&assignmentForCommander(runtime,officerId)===null,'RUNTIME_DETACHMENT_STRATEGIC_ASSIGNMENT_ACTIVE');
  const actor=runtime.combat.coordinator.actorStates[sourceArmyId],delta=runtime.combat.delta.units[sourceArmyId];
  invariant(actor&&!Object.values(actor.instances).some(instance=>['RESERVED','VALIDATED'].includes(instance.status)),'RUNTIME_DETACHMENT_SOURCE_COMBAT_PENDING');
  invariant(delta&&!delta.routePending&&delta.control===null,'RUNTIME_DETACHMENT_SOURCE_COMBAT_UNAVAILABLE');
  const snapshot=createDetachmentPreparationSnapshot({world:runtime.world});
  const next=clone(runtime);
  next.detachmentPreparation=scheduleDetachmentPreparation(snapshot,{
    eventId:startEventId,
    preparationId,
    sourceArmyId,officerId,cityId,newArmyId,transferTroopCount,troopType:source.troopType,
  });
  validateFirst3Runtime(next,{losRules});
  return next;
}

export function cancelRuntimeDetachment(runtime,{requestId,preparationId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);id(requestId,'requestId');id(preparationId,'preparationId');
  const preparation=runtime.detachmentPreparation?.preparation;
  invariant(preparation?.factionId===runtime.world.playerFactionId,'RUNTIME_DETACHMENT_NOT_PLAYER_OWNED');
  const next=clone(runtime),token=detachmentToken(runtime,requestId);
  next.detachmentPreparation=cancelDetachmentPreparationWorld(next.detachmentPreparation,{eventId:`R7C1.DETACH.CANCEL.${token}`,preparationId,reason:'PLAYER_CANCELLED',world:next.world});
  validateFirst3Runtime(next,{losRules});return next;
}

function projectDetachmentSourceCombat(combat,world,sourceArmyId){
  const next=clone(combat),army=world.armies[sourceArmyId];
  invariant(army,'RUNTIME_DETACHMENT_SOURCE_RESULT_MISSING');
  const delta=next.delta.units[sourceArmyId],calculator=next.calculator.units[sourceArmyId];
  invariant(delta&&calculator,'RUNTIME_DETACHMENT_SOURCE_COMBAT_MISSING');
  const maxPersonnel=army.troopCount+army.woundedCount+army.deadCount;
  Object.assign(delta,{maxPersonnel,activePersonnel:army.troopCount,woundedPersonnel:army.woundedCount,deadPersonnel:army.deadCount,morale:army.morale,routePending:routePendingFromArmy(army)});
  Object.assign(calculator,{maxPersonnel,activePersonnel:army.troopCount,woundedPersonnel:army.woundedCount,deadPersonnel:army.deadCount,currentHp:army.hp,maxHp:army.maxHp,morale:army.morale,routePending:routePendingFromArmy(army)});
  return next;
}

export function completeRuntimeDetachment(runtime,{requestId,preparationId,deploymentTileId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);id(requestId,'requestId');id(preparationId,'preparationId');invariant(typeof deploymentTileId==='string'&&own(runtime.world.tiles,deploymentTileId),'UNKNOWN_DETACHMENT_DEPLOYMENT_TILE');
  const token=detachmentToken(runtime,requestId),completionEventId=`R7C1.DETACH.COMPLETE.${token}`;
  const existing=runtime.detachmentPreparation?.preparation;
  if(existing?.status==='COMPLETED'){
    invariant(existing.preparationId===preparationId&&existing.deploymentTileId===deploymentTileId&&existing.completionEventId===completionEventId,'RUNTIME_DETACHMENT_COMPLETION_REPLAY_CONFLICT');
    return clone(runtime);
  }
  invariant(existing?.factionId===runtime.world.playerFactionId,'RUNTIME_DETACHMENT_NOT_PLAYER_OWNED');
  const next=clone(runtime),beforeWorld=clone(next.world);
  const completed=completeDetachmentPreparationWorld(next.detachmentPreparation,{eventId:completionEventId,preparationId,deploymentTileId,world:next.world});
  next.world=clone(completed.world);
  synchronizeRuntimeTerminalRoster(next);
  next.combat=projectDetachmentSourceCombat(next.combat,next.world,existing.sourceArmyId);
  const registered=registerWorldArmyInCombat({world:next.world,combat:next.combat,armyId:existing.newArmyId});
  next.combat=registered.combat;next.detachmentCombatRegistration=registered.registration;next.detachmentPreparation=completed;
  const assignmentSync=synchronizeStrategicAssignmentWorld(assignmentSnapshot(beforeWorld,next.strategicAssignments),{eventId:`R7C1.DETACH.ASSIGN.${token}`,world:next.world});
  next.strategicAssignments=runtimeAssignmentState(next.world,assignmentSync.snapshot.assignments);
  syncRuntimeRecruitmentWorld(next);
  updateKnowledge(next.world);
  validateFirst3Runtime(next,{losRules});return next;
}

function pendingCombatArmyIds(runtime){
  return [...new Set(runtime.commandOrder.filter(commandId=>{
    const command=runtime.commands[commandId],status=runtime.combat.coordinator.actorStates[command.actorRef]?.instances[commandId]?.status;
    return ['RESERVED','VALIDATED'].includes(status);
  }).map(commandId=>runtime.commands[commandId].actorRef))].sort();
}

function synchronizeRuntimeWorldSidecars(runtime){
  synchronizeRuntimeTerminalRoster(runtime);
  if(runtime.citySettlement){runtime.citySettlement.world=clone(runtime.world);validateCitySettlementWorldSnapshot(runtime.citySettlement);}
  if(runtime.recruitment){runtime.recruitment.world=clone(runtime.world);validateRecruitmentWorldSnapshot(runtime.recruitment);}
}

function synchronizeRuntimeTerminalRoster(runtime){
  if(!runtime.campaignTerminal)return;
  runtime.world=synchronizeCampaignTerminalWorldRoster(runtime.world);
  const extension=runtime.world.campaignTerminalWorld,next=clone(runtime.campaignTerminal);
  for(const [collection,order] of [['armiesById','armyOrder'],['officersById','officerOrder'],['citiesById','cityOrder']]){
    next[order]=Object.keys(extension[collection]).sort();
    next[collection]=Object.fromEntries(next[order].map(id=>[id,clone(extension[collection][id])]));
  }
  next.globalTick=extension.sourceGlobalTick;
  validateCampaignTerminalState(next);runtime.campaignTerminal=next;
  validateCampaignTerminalWorldApplication(runtime.world,next);
}

function cancelReservedRuntimeCommandForTerminal(runtime,command,currentTick){
  const actorState=runtime.combat.coordinator.actorStates[command.actorRef],instance=actorState.instances[command.actionInstanceId];
  if(instance?.status!=='RESERVED')return false;
  const lifecycle=actorState.lifecycleState,action=lifecycle.actions[command.actionInstanceId];
  invariant(action?.status==='RESERVED','RUNTIME_TERMINAL_COMMAND_LIFECYCLE_NOT_RESERVED');
  invariant(lifecycle.stamina.reserved>=action.quotedCost,'RUNTIME_TERMINAL_COMMAND_RESERVATION_MISMATCH');
  lifecycle.stamina.reserved-=action.quotedCost;
  for(const tokenId of action.discountTokenIds){const token=lifecycle.discountTokens[tokenId];invariant(token?.status==='HELD'&&token.heldBy===command.actionInstanceId,'RUNTIME_TERMINAL_COMMAND_TOKEN_MISMATCH');token.status='READY';token.heldBy=null;}
  action.status='CANCELLED';action.validationTick=currentTick;action.cancelReason='CONDITION_NO_LONGER_MET';
  const validation={valid:false,internalReason:'TERMINAL_ARMY_INACTIVE',publicReason:'CONDITION_NO_LONGER_MET',...(isSpecialTacticRuntimeCommand(command)?{losState:'CLEAR'}:{})};
  instance.status='CANCELLED';instance.execution={tick:currentTick,validation,fingerprint:JSON.stringify({tick:currentTick,validation,results:[]})};
  if(isG21RuntimeCommand(command)){
    const fingerprint=JSON.stringify({actionInstanceId:command.actionInstanceId,currentTick,internalReason:'TERMINAL_ARMY_INACTIVE'});
    const output={status:'CANCELLED',internalReason:'TERMINAL_ARMY_INACTIVE',controlResolution:'NOT_RESOLVED',conditionApplicationStatus:'NOT_ATTEMPTED',duration:null,coordinatorEntry:null,interruptionPlan:{conditionChanged:false,cancelActionInstanceIds:[],preserveInProgressActionIds:[],endProtectionIds:[],preserveCompletedDeploymentIds:[]},interruptionFingerprint:fingerprint};
    command.g21AdapterAction.status='CANCELLED';command.g21AdapterAction.executionFingerprint=fingerprint;command.g21AdapterAction.output=clone(output);command.g21Result=clone(output);command.g21ControlResolution=null;
  }else if(isG03RuntimeCommand(command)){
    const fingerprint=JSON.stringify({actionInstanceId:command.actionInstanceId,currentTick,terminalArmyInactive:true});
    const output={status:'CANCELLED',internalReason:'TERMINAL_ARMY_INACTIVE',resolution:'NOT_RESOLVED',targetResults:[],coordinatorEntry:null,persistentZone:null,interruptionFingerprint:fingerprint};
    command.g03AdapterAction.status='CANCELLED';command.g03AdapterAction.executionFingerprint=fingerprint;command.g03AdapterAction.output=clone(output);command.g03Result=clone(output);
  }
  if(isIdentityRuntimeCommand(command))command.identityResult={status:'CANCELLED',reason:'TERMINAL_ARMY_INACTIVE'};
  return true;
}

function tombstoneInactiveRuntimeConditions(runtime,inactiveArmyIds){
  const endedStatusInstanceIds=[];
  for(const statusInstanceId of runtime.combatConditions.statusOrder){
    const status=runtime.combatConditions.statuses[statusInstanceId];
    if(!inactiveArmyIds.has(status.targetUnitId)||status.endReason!==null||status.startGlobalTick>runtime.committedGlobalTick||status.endGlobalTickExclusive<=runtime.committedGlobalTick)continue;
    status.endGlobalTickExclusive=runtime.committedGlobalTick;status.endReason='EXPIRED';status.endedGlobalTick=runtime.committedGlobalTick;status.replacedByStatusInstanceId=null;
    const eventId=`CCL.LOG.${String(runtime.combatConditions.logOrder.length+1).padStart(6,'0')}`;
    runtime.combatConditions.logs[eventId]={eventId,type:'TARGET_INACTIVE',globalTick:runtime.committedGlobalTick,requestId:`R9.TERMINAL.CONDITION.${statusInstanceId}.${runtime.committedGlobalTick}`,statusInstanceId,targetUnitId:status.targetUnitId,statusKey:status.statusKey,details:{terminalTombstone:true}};
    runtime.combatConditions.logOrder.push(eventId);endedStatusInstanceIds.push(statusInstanceId);
  }
  return endedStatusInstanceIds.sort();
}

function terminalBatchManifest(state,batchId){
  const anchors=state.recordOrder.map(recordId=>state.recordsById[recordId]).filter(record=>record.details?.batchSettlementRole==='ANCHOR'&&record.details?.batchSettlementId===batchId);
  invariant(anchors.length===1,'RUNTIME_TERMINAL_BATCH_ANCHOR_MISSING');
  return clone(anchors[0].details.batchManifest);
}

function appendTerminalAssignmentResults(runtime,proposals){
  for(const proposal of proposals){
    const event=normalizedAssignmentHistoryEvent(proposal),actorFactionId=proposal.factionRefs[0];
    appendRuntimeHistory(runtime,event,{actorFactionId});
    const derived=applyKnownHistoryEvent(runtime.characterHistory,{ledger:runtime.historyLedger,factionId:actorFactionId,eventId:event.eventId});
    runtime.characterHistory=derived.state;
    runtime.strategicAssignments=acknowledgeAssignmentResultEvent(runtime.strategicAssignments,{eventId:`R9.ASSIGNMENT.ACK.${stableToken(event.eventId)}`,resultEventId:event.eventId});
    runtime.lastCommit.historyEventIds.push(event.eventId);runtime.lastCommit.characterHistoryDecisions.push(derived.decision);
  }
}

/**
 * Atomically commits one externally confirmed terminal batch. Combat defeat,
 * retreat/fate and city-capture detection stay outside this API.
 */
export function commitConfirmedCampaignTerminalBatch(runtime,input={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(object(input)&&input.globalTick===runtime.committedGlobalTick&&input.globalTick===getGlobalTick(runtime.world),'RUNTIME_TERMINAL_BATCH_MUST_MATCH_COMMIT_TICK');
  const baseTerminal=runtime.campaignTerminal??createCampaignTerminalStateFromWorld(runtime.world);
  const settled=settleConfirmedCampaignTerminalBatch(baseTerminal,input);
  if(runtime.campaignTerminal!==null&&same(settled,runtime.campaignTerminal))return clone(runtime);

  const next=clone(runtime),manifest=terminalBatchManifest(settled,input.batchId);
  next.campaignTerminal=settled;
  next.world=applyCampaignTerminalStateToWorld(next.world,settled);
  const inactiveArmyIds=new Set(settled.armyOrder.filter(armyId=>settled.armiesById[armyId].disposition!=='ACTIVE'));
  const terminalCancelledActionIds=[];
  for(const commandId of next.commandOrder){
    const command=next.commands[commandId];
    if(!inactiveArmyIds.has(command.actorRef)&&!(command.targetRef&&inactiveArmyIds.has(command.targetRef)))continue;
    if(cancelReservedRuntimeCommandForTerminal(next,command,next.committedGlobalTick))terminalCancelledActionIds.push(commandId);
  }
  const terminalEndedConditionStatusIds=tombstoneInactiveRuntimeConditions(next,inactiveArmyIds);
  for(const armyId of inactiveArmyIds)next.combat.delta.units[armyId].control=null;

  const strategicSync=synchronizeTerminalStrategicAssignments(next.strategicAssignments,{eventId:`R9.TERMINAL.ASSIGN.SYNC.${input.batchId}`,world:next.world});
  next.strategicAssignments=strategicSync.assignments;
  if(next.recruitment){next.recruitment.world=clone(next.world);validateRecruitmentWorldSnapshot(next.recruitment);}
  if(activeDetachment(next))advanceRuntimeDetachment(next,next.committedGlobalTick);

  next.lastCommit={
    globalTick:next.committedGlobalTick,
    executedActionIds:[],cancelledActionIds:[],historyEventIds:[],characterHistoryDecisions:[],opportunityDecisions:[],growthResults:[],citySettlementResults:[],recruitmentDecisions:[],
    ...(runtime.lastCommit?.globalTick===next.committedGlobalTick?clone(runtime.lastCommit):{}),
    terminalBatch:{
      batchId:input.batchId,globalTick:input.globalTick,
      defeatedArmyIds:input.defeatPayloads.map(payload=>payload.defeatedArmyId).sort(),capturedCityIds:input.cityCapturePayloads.map(payload=>payload.capturedCityId).sort(),
      endedConditionStatusIds:terminalEndedConditionStatusIds,
      ...manifest,
    },
  };
  next.lastCommit.cancelledActionIds=[...new Set([...next.lastCommit.cancelledActionIds,...terminalCancelledActionIds.sort()])];
  for(const actionInstanceId of terminalCancelledActionIds){
    const command=next.commands[actionInstanceId],actor=next.world.armies[command.actorRef],event=isG03RuntimeCommand(command)?runtimeG03HistoryEvent(next,command,'RESULT'):runtimeHistoryEvent(next,command,'RESULT');
    if(isG03RuntimeCommand(command))appendRuntimeG03History(next,event,{actorFactionId:actor.factionId,targetFactionIds:[]});
    else appendRuntimeHistory(next,event,{actorFactionId:actor.factionId});
    const derived=applyKnownHistoryEvent(next.characterHistory,{ledger:next.historyLedger,factionId:actor.factionId,eventId:event.eventId});
    next.characterHistory=derived.state;next.lastCommit.historyEventIds.push(event.eventId);next.lastCommit.characterHistoryDecisions.push(derived.decision);
  }
  appendTerminalAssignmentResults(next,strategicSync.proposedEvents);
  validateFirst3Runtime(next,{losRules});
  return next;
}

/**
 * Resolve one player-owned terminal choice through the public facade, then
 * atomically mirror the validated sidecar result into every runtime world
 * snapshot that carries canonical ownership, office, or roster state.
 */
export function resolveRuntimeCampaignTerminalChoice(runtime,input={}, {losRules}={}){
  invariant(input.resolutionMode==='PLAYER','RUNTIME_TERMINAL_CHOICE_PLAYER_MODE_REQUIRED');
  return resolveRuntimeCampaignTerminalChoiceForFaction(runtime,input,{losRules,actingFactionId:runtime.world.playerFactionId,resolutionMode:'PLAYER'});
}

function resolveRuntimeCampaignTerminalChoiceForFaction(runtime,input={}, {losRules,actingFactionId,resolutionMode}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(runtime.campaignTerminal!==null,'RUNTIME_TERMINAL_CHOICE_STATE_REQUIRED');
  invariant(object(input)&&input.resolutionMode===resolutionMode,'RUNTIME_TERMINAL_CHOICE_MODE_REQUIRED');
  invariant(input.globalTick===runtime.committedGlobalTick&&input.globalTick===getGlobalTick(runtime.world),'RUNTIME_TERMINAL_CHOICE_MUST_MATCH_COMMIT_TICK');

  const resolved=resolveCampaignTerminalChoice(runtime.campaignTerminal,input);
  if(same(resolved,runtime.campaignTerminal))return clone(runtime);

  const publicTerminal=projectCampaignTerminalPublicView(runtime.campaignTerminal,{
    viewerFactionId:actingFactionId,
    knownTerminalRecordIds:knownTerminalRecordIdsForFaction(runtime.campaignTerminal,actingFactionId),
  });
  const publicChoice=publicTerminal.ownChoices.find(choice=>choice.choiceId===input.choiceId&&choice.status==='PENDING');
  invariant(publicChoice,'RUNTIME_TERMINAL_CHOICE_NOT_PUBLIC_PENDING');
  invariant(publicChoice.candidateOfficerIds.includes(input.selectedOfficerId),'RUNTIME_TERMINAL_CHOICE_CANDIDATE_NOT_PUBLIC');

  const next=clone(runtime);
  next.campaignTerminal=resolved;
  next.world=applyCampaignTerminalStateToWorld(next.world,resolved);
  const resolvedChoice=resolved.choicesById[input.choiceId];
  if(resolvedChoice.type==='OCCUPATION'&&next.world.factions[resolvedChoice.factionId].ownedCityIds.length>1){
    const fallbackCityId=next.world.factions[resolvedChoice.factionId].capitalCityId;
    for(const army of Object.values(next.world.armies))if(army.factionId===resolvedChoice.factionId&&runtimeArmyIsActive(next,army.armyId)&&typeof army.supportCityId!=='string')army.supportCityId=fallbackCityId;
  }
  const strategicSync=synchronizeTerminalStrategicAssignments(next.strategicAssignments,{
    eventId:`R9.TERMINAL.CHOICE.ASSIGN.SYNC.${stableToken(input.transactionId)}`,
    world:next.world,
  });
  next.strategicAssignments=strategicSync.assignments;
  // The city-settlement snapshot intentionally remains the previous turn
  // boundary: settleCityWorldTurn consumes the new canonical owner/governor as
  // an ownership change on the next boundary. Rewriting that snapshot here
  // would erase the ownership-change proof and conflict with its city ledger.
  if(next.recruitment){next.recruitment.world=clone(next.world);validateRecruitmentWorldSnapshot(next.recruitment);}
  if(activeDetachment(next))advanceRuntimeDetachment(next,next.committedGlobalTick);
  appendTerminalAssignmentResults(next,strategicSync.proposedEvents);
  validateFirst3Runtime(next,{losRules});
  return next;
}

export function completeRuntimeG03FieldTransitionWorkTrial(runtime,{requestId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);id(requestId,'requestId');
  invariant(runtime.scenarioMode==='I2_TRIAL','G03_FIELD_TRANSITION_WORK_TRIAL_I2_ONLY');
  invariant(runtime.world.playerFactionId==='F02','G03_FIELD_TRANSITION_F02_PLAYER_REQUIRED');
  const token=stableToken(requestId),reorganizationEventId=`R8.G03.REORGANIZE.${token}`,swapEventId=`R8.G03.SWAP.${token}`;
  const existingReorganization=runtime.historyLedger.eventsById[reorganizationEventId],existingSwap=runtime.historyLedger.eventsById[swapEventId];
  if(existingReorganization||existingSwap){
    invariant(existingReorganization&&existingSwap&&runtime.world.cities.east?.governorId==='G05'&&runtime.world.armies['U-F02-G05']?.commanderId==='G03'&&runtime.world.armies['U-F02-G05']?.troopType==='spear','CONFLICTING_G03_FIELD_TRANSITION_REPLAY');
    return clone(runtime);
  }
  const next=clone(runtime),locks=pendingCombatArmyIds(next),common={factionId:'F02',cityId:'east',armyId:'U-F02-G05',currentCommanderId:'G05',futureCommanderId:'G03',targetTroopType:'spear',pendingCombatArmyIds:locks};
  const reorganized=completeBasicTroopReorganizationWorld(assignmentSnapshot(next.world,next.strategicAssignments),{...common,eventId:reorganizationEventId});
  const swapped=swapGovernorAndCommanderWorld(reorganized.snapshot,{...common,eventId:swapEventId,reorganizationEvent:reorganized.event});
  next.world=clone(swapped.snapshot.world);
  next.strategicAssignments=runtimeAssignmentState(next.world,swapped.snapshot.assignments);
  const army=next.world.armies['U-F02-G05'],calculator=next.combat.calculator.units[army.armyId],canonical=calculatorUnit(next.world,army);
  invariant(calculator,'G03_FIELD_TRANSITION_COMBAT_UNIT_REQUIRED');
  calculator.defenseCommand=canonical.defenseCommand;calculator.moraleRetention=canonical.moraleRetention;
  synchronizeRuntimeWorldSidecars(next);
  for(const proposal of [reorganized.event,swapped.event]){
    const event=normalizePendingHistoryEventProposal(runtimeAssignmentProposal(next.world,proposal),{placeRef:{type:'CITY',id:'east'}});
    appendRuntimeHistory(next,event,{actorFactionId:'F02'});
  }
  updateKnowledge(next.world);
  validateFirst3Runtime(next,{losRules});return next;
}

function detachmentInvalidationReason(snapshot,world){
  const preparation=snapshot.preparation,city=world.cities[preparation.cityId],officer=world.officers[preparation.officerId];
  if(!same(city?{cityId:city.cityId,ownerFactionId:city.ownerFactionId,tileId:city.tileId}:null,{cityId:preparation.cityId,ownerFactionId:preparation.factionId,tileId:preparation.cityTileId}))return 'CITY_LOST';
  if(!same(officer??null,preparation.officerBefore))return 'OFFICER_UNAVAILABLE';
  return 'SOURCE_CHANGED';
}

function advanceRuntimeDetachment(runtime,currentTick){
  if(!activeDetachment(runtime))return;
  const eventId=`R7C1.DETACH.SYNC.${currentTick}`;
  try{runtime.detachmentPreparation=synchronizeDetachmentPreparationWorld(runtime.detachmentPreparation,{eventId,world:runtime.world});}
  catch(error){
    if(!String(error?.message).startsWith('DETACHMENT_RESERVED_DEPENDENCY_CHANGED:'))throw error;
    const reason=detachmentInvalidationReason(runtime.detachmentPreparation,runtime.world);
    runtime.detachmentPreparation=invalidateDetachmentPreparationWorld(runtime.detachmentPreparation,{eventId:`R7C1.DETACH.INVALIDATE.${currentTick}.${reason}`,reason,world:runtime.world});
  }
}

function movementProgressPermilleAtTickStart(runtime){
  const globalTick=runtime.committedGlobalTick,result={};
  for(const armyId of ids(runtime.world.armies)){
    if(!runtimeArmyIsActive(runtime,armyId))continue;
    const movementProgressPermille=getMovementProgressPermilleForUnit(runtime.combatConditions,{targetUnitId:armyId,globalTick});
    if(movementProgressPermille!==1000)result[armyId]=movementProgressPermille;
  }
  return result;
}

function completedMovementRecordsForTick(beforeWorld,afterWorld,currentTick){
  const activeIn= (world,armyId)=>!world.campaignTerminalWorld||world.campaignTerminalWorld.armiesById[armyId]?.disposition==='ACTIVE';
  const records=[];
  for(const armyId of ids(beforeWorld.armies)){
    const before=beforeWorld.armies[armyId],after=afterWorld.armies[armyId];
    if(!after||!activeIn(beforeWorld,armyId)||!activeIn(afterWorld,armyId)||before.tileId===after.tileId)continue;
    const beforeOrder=before.currentOrder,afterOrder=after.currentOrder;
    if(beforeOrder?.type!=='MOVE'||afterOrder?.type!=='MOVE'||beforeOrder.orderId!==afterOrder.orderId)continue;
    if(afterOrder.currentPathIndex!==beforeOrder.currentPathIndex+1||afterOrder.pathTileIds[afterOrder.currentPathIndex-1]!==before.tileId||afterOrder.pathTileIds[afterOrder.currentPathIndex]!==after.tileId)continue;
    if(after.movementState!==null||!['ACTIVE','COMPLETED'].includes(afterOrder.status))continue;
    records.push(createCampaignMovementCompletionRecord({
      globalTick:currentTick,
      armyId,
      orderId:afterOrder.orderId,
      fromTileId:before.tileId,
      toTileId:after.tileId,
      completedPathIndex:afterOrder.currentPathIndex,
    }));
  }
  return records.sort((left,right)=>left.resultId.localeCompare(right.resultId,'en'));
}

function executeOneRuntimeTick(runtime,{losRules,growthPool=null}){
  validateFirst3Runtime(runtime,{losRules});
  const next=clone(runtime);
  const movementProgressPermilleByArmyId=movementProgressPermilleAtTickStart(next);
  const movementWorldBefore=clone(next.world);
  next.world=executeTicks(next.world,1,{movementProgressPermilleByArmyId});
  const currentTick=getGlobalTick(next.world);
  const completedMovementRecords=completedMovementRecordsForTick(movementWorldBefore,next.world,currentTick);
  if(next.combatConditions.statusOrder.length===0)next.combatConditions.cursorGlobalTick=currentTick;
  else next.combatConditions=advanceCombatConditionLedger(next.combatConditions,{requestId:`R7C2.CONDITION.TICK.${currentTick}`,currentGlobalTick:currentTick}).state;
  syncConfusionControlProjection(next,currentTick);
  const due=dueCommands(next,currentTick);
  const validations=new Map();
  for(const command of due.filter(command=>!isSpecialTacticRuntimeCommand(command))){
    if(command.actionId==='CAVALRY_CHARGE'){
      const permission=evaluateConfusionActionPermission(next.combatConditions,{targetUnitId:command.actorRef,globalTick:currentTick,actionKind:'CHARGE'});
      if(!permission.allowed){validations.set(command.actionInstanceId,{valid:false,internalReason:permission.reason});continue;}
      const spatial=spatialChargeValidation(next,command);
      if(!spatial.valid){validations.set(command.actionInstanceId,spatial);continue;}
      applyChargeMovement(next,command,spatial.pathTileIds);
    }
  }
  if(due.some(command=>command.actionId==='CAVALRY_CHARGE'))updateKnowledge(next.world);
  const identityPrepared=prepareRuntimeIdentityDue(next,due,currentTick);
  const baseDue=due.filter(command=>!isSpecialTacticRuntimeCommand(command));
  for(const command of baseDue)if(!validations.has(command.actionInstanceId))validations.set(command.actionInstanceId,validateExecutionSnapshot(next,command,losRules));
  prioritizeRuntimeG07(next,baseDue,validations,currentTick);
  const executable=baseDue.filter(command=>validations.get(command.actionInstanceId).valid);
  let calculatorOutput=null;
  if(executable.length||identityPrepared.supports.length){
    const calculated=calculateCombatTick(next.combat.calculator,{currentTick,attacks:executable.map(command=>attackInput(next,command)),supports:identityPrepared.supports});
    next.combat.calculator=calculated.state;
    calculatorOutput=calculated.output;
  }
  const executionById=new Map((calculatorOutput?.resolverExecutions??[]).map(item=>[item.actionInstanceId,item]));
  for(const command of baseDue){
    const validation=validations.get(command.actionInstanceId),execution=executionById.get(command.actionInstanceId);
    const evidence={valid:validation.valid,...(definition(command.actionId).losPolicy==='CLEAR_REQUIRED'?{losState:validation.losState??'UNKNOWN'}:{}),...(validation.valid?{}:{internalReason:validation.internalReason,publicReason:'CONDITION_NO_LONGER_MET'})};
    next.combat.coordinator.actorStates[command.actorRef]=executeCombatAction(next.combat.coordinator.actorStates[command.actorRef],{
      actionInstanceId:command.actionInstanceId,
      currentTick,
      executionValidation:evidence,
      results:execution?.results??[],
    });
  }
  for(const command of baseDue)consumeRuntimeG07(next,command,currentTick);
  for(const command of identityPrepared.supportCommands){
    const execution=executionById.get(command.actionInstanceId),entry=calculatorOutput.coordinatorEntries.find(e=>e.actionInstanceId===command.actionInstanceId);
    next.combat.coordinator.actorStates[command.actorRef]=executeCombatAction(next.combat.coordinator.actorStates[command.actorRef],{actionInstanceId:command.actionInstanceId,currentTick,executionValidation:{valid:true},results:execution.results});
    command.identityResult={status:'COMPLETED',targetResults:entry.appliedResults.map(r=>({targetUnitId:r.resultId.split('/').at(-2),moraleDelta:r.moraleDelta}))};
  }
  const g21Entries=[],g21ResolvedActionIds=[],g03Entries=[],g03ResolvedActionIds=[],interruptedActionIds=new Set();
  for(const command of due.filter(isG21RuntimeCommand)){
    const currentInstance=next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
    if(currentInstance.status!=='RESERVED')continue;
    const snapshot=g21ExecutionSnapshot(next,command,losRules),controlResolution=g21ControlResolution(next,command);
    const resolved=resolveG21ConfusionTactic(g21AdapterState(next,command),{
      actionInstanceId:command.actionInstanceId,
      currentTick,
      distanceTiles:snapshot.distanceTiles,
      losState:snapshot.losState,
      sourceAvailable:snapshot.sourceAvailable,
      targetAvailable:snapshot.targetAvailable,
      resolution:{controlApplied:controlResolution.controlApplied},
      targetActivity:pendingG21TargetActivity(next,command.targetRef,command.actionInstanceId),
    });
    next.combat.coordinator.actorStates[command.actorRef]=resolved.state.resolverState;
    next.combatConditions=resolved.state.conditionLedger;
    command.g21AdapterAction=clone(resolved.state.actions[command.actionInstanceId]);
    command.g21Result=clone(resolved.result);
    if(resolved.result.status==='CANCELLED'){command.g21ControlResolution=null;continue;}
    command.g21ControlResolution=clone(controlResolution);
    g21Entries.push(resolved.result.coordinatorEntry);
    g21ResolvedActionIds.push(command.actionInstanceId);
    for(const interruptedId of resolved.result.interruptionPlan.cancelActionInstanceIds){
      const interruptedCommand=next.commands[interruptedId],interruptedInstance=interruptedCommand?next.combat.coordinator.actorStates[interruptedCommand.actorRef]?.instances[interruptedId]:null;
      if(interruptedCommand&&interruptedInstance?.status==='RESERVED'){
        if(isG21RuntimeCommand(interruptedCommand)){interruptPendingG21Command(next,interruptedId,currentTick);interruptedActionIds.add(interruptedId);}
        else if(isG03RuntimeCommand(interruptedCommand)){interruptPendingG03Command(next,interruptedId,currentTick);interruptedActionIds.add(interruptedId);}
        else if(isIdentityRuntimeCommand(interruptedCommand)){cancelReservedIdentityCommand(next,interruptedCommand,currentTick,'CONFUSION_ACTION_BLOCKED');interruptedActionIds.add(interruptedId);}
      }
    }
  }
  for(const command of due.filter(isG03RuntimeCommand)){
    const currentInstance=next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
    if(currentInstance.status!=='RESERVED')continue;
    const snapshot=g03ExecutionSnapshot(next,command,losRules);
    const resolved=resolveG03SlowTactic(g03AdapterState(next,command),{
      actionInstanceId:command.actionInstanceId,
      currentTick,
      sourceAvailable:snapshot.sourceAvailable,
      areaTiles:snapshot.areaTiles,
      targetUnits:snapshot.targetUnits,
    });
    next.combat.coordinator.actorStates[command.actorRef]=resolved.state.resolverState;
    next.combatConditions=resolved.state.conditionLedger;
    command.g03AdapterAction=clone(resolved.state.actions[command.actionInstanceId]);
    command.g03Result=clone(resolved.result);
    if(resolved.result.status==='CANCELLED')continue;
    g03Entries.push(resolved.result.coordinatorEntry);
    g03ResolvedActionIds.push(command.actionInstanceId);
  }
  const entries=[...(calculatorOutput?.coordinatorEntries??[]).map(entry=>{
      const unit=next.combat.calculator.units[entry.actorRef];
      const actorPostMergeState=unit.activePersonnel===0?'DEFEATED':unit.routePending?'ROUT_PENDING':'UNCHANGED';
      return {...entry,actorPostMergeState};
    }),...identityPrepared.coordinationEntries.map(entry=>{
      const unit=next.combat.calculator.units[entry.actorRef];
      return {...entry,actorPostMergeState:unit.activePersonnel===0?'DEFEATED':unit.routePending?'ROUT_PENDING':'UNCHANGED'};
    }),...g21Entries.map(entry=>{
      const unit=next.combat.calculator.units[entry.actorRef];
      const actorPostMergeState=unit.activePersonnel===0?'DEFEATED':unit.routePending?'ROUT_PENDING':'UNCHANGED';
      return {...entry,actorPostMergeState};
    }),...g03Entries.map(entry=>{
      const unit=next.combat.calculator.units[entry.actorRef];
      const actorPostMergeState=unit.activePersonnel===0?'DEFEATED':unit.routePending?'ROUT_PENDING':'UNCHANGED';
      return {...entry,actorPostMergeState};
    })];
  if(entries.length){
    next.combat.coordinator=mergeSameTickCombatResults(next.combat.coordinator,{currentTick,entries});
    next.combat.delta=applyCoordinatorBatch(next.combat.delta,{coordinatorState:next.combat.coordinator,currentTick,casualtyAllocations:calculatorOutput?.casualtyAllocations??[]});
    for(const actionInstanceId of g21ResolvedActionIds){
      const command=next.commands[actionInstanceId],acknowledged=acknowledgeG21ConfusionCoordinatorMerge(g21AdapterState(next,command),{actionInstanceId,currentTick});
      command.g21AdapterAction=clone(acknowledged.state.actions[actionInstanceId]);
      command.g21Result=clone(acknowledged.result);
    }
    for(const actionInstanceId of g03ResolvedActionIds){
      const command=next.commands[actionInstanceId],acknowledged=acknowledgeG03SlowCoordinatorMerge(g03AdapterState(next,command),{actionInstanceId,currentTick});
      command.g03AdapterAction=clone(acknowledged.state.actions[actionInstanceId]);
      command.g03Result=clone(acknowledged.result);
    }
  }
  syncConfusionControlProjection(next,currentTick);
  projectCommittedCombat(next);
  const citySettlementResults=settleRuntimeCityBoundary(next);
  const assignmentSync=next.world.campaignTerminalWorld
    ?synchronizeTerminalStrategicAssignments(next.strategicAssignments,{eventId:`R5.WORLD.SYNC.${currentTick}`,world:next.world})
    :synchronizeStrategicAssignmentWorld(assignmentSnapshot(runtime.world,runtime.strategicAssignments),{eventId:`R5.WORLD.SYNC.${currentTick}`,world:clone(next.world)});
  next.strategicAssignments=next.world.campaignTerminalWorld?assignmentSync.assignments:runtimeAssignmentState(next.world,assignmentSync.snapshot.assignments);
  next.committedGlobalTick=currentTick;
  const recruitmentDecisions=advanceRuntimeRecruitment(next);
  const assignmentProposals=assignmentSync.proposedEvents.map(proposal=>runtimeAssignmentProposal(next.world,proposal));
  for(const assignment of Object.values(next.strategicAssignments.assignments).filter(item=>item.type==='FIELD_INSPECTION'&&item.status==='ACTIVE').sort((a,b)=>a.assignmentId.localeCompare(b.assignmentId))){
    const army=next.world.armies[assignment.armyId],targetTileId=assignment.targetPlaceRef.slice(5),orderStatus=army.currentOrder?.status??null;
    const evidence=recordFieldInspectionTick(next.strategicAssignments,{
      eventId:`R5.FIELD.EVIDENCE.${stableToken(assignment.assignmentId)}.${currentTick}`,
      assignmentId:assignment.assignmentId,
      globalTick:currentTick,
      evidenceId:`R5.FIELD.OBS.${stableToken(assignment.assignmentId)}.${currentTick}`,
      armyId:army.armyId,
      currentTileId:army.tileId,
      targetTileId,
      atTargetOrAdjacent:hexDistance(next.world.tiles[army.tileId],next.world.tiles[targetTileId])<=1,
      targetObserved:next.world.knowledge[assignment.factionId].tiles[targetTileId]==='VISIBLE',
      causeKnown:Object.values(next.historyLedger.knowledgeById).some(record=>record.factionId===assignment.factionId&&record.eventId===assignment.causeEventId),
      armyStationary:army.movementState===null&&!['PLANNED','ACTIVE','WAITING_FOR_TILE'].includes(orderStatus),
    });
    next.strategicAssignments=evidence.state;
    assignmentProposals.push(...evidence.proposedEvents);
  }
  const finishedIds=[...new Set([...due.map(command=>command.actionInstanceId),...interruptedActionIds])].sort();
  const finishedCommands=finishedIds.map(actionInstanceId=>next.commands[actionInstanceId]).filter(command=>{
    const status=next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId].status;
    return ['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(status);
  });
  const priorityIds=baseDue.filter(c=>c.g07Coordination).map(c=>c.actionInstanceId);
  if(priorityIds.length)finishedCommands.sort((a,b)=>(priorityIds.includes(a.actionInstanceId)?0:1)-(priorityIds.includes(b.actionInstanceId)?0:1)||a.actionInstanceId.localeCompare(b.actionInstanceId));
  next.lastCommit={
    globalTick:currentTick,
    executedActionIds:finishedCommands.filter(command=>next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId].status!=='CANCELLED').map(command=>command.actionInstanceId),
    cancelledActionIds:finishedCommands.filter(command=>next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId].status==='CANCELLED').map(command=>command.actionInstanceId),
    historyEventIds:[],characterHistoryDecisions:[],opportunityDecisions:[],growthResults:[],citySettlementResults,recruitmentDecisions,
  };
  for(const command of finishedCommands){
    const actor=next.world.armies[command.actorRef],target=isG03RuntimeCommand(command)?null:next.world.armies[command.targetRef];
    const instance=next.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
    const event=isG03RuntimeCommand(command)?runtimeG03HistoryEvent(next,command,'RESULT'):runtimeHistoryEvent(next,command,'RESULT');
    if(isG03RuntimeCommand(command)){
      const targetFactionIds=instance.status==='CANCELLED'?[]:[...new Set((command.g03Result?.targetResults??[]).map(result=>next.world.armies[result.targetUnitId]?.factionId).filter(Boolean))];
      appendRuntimeG03History(next,event,{actorFactionId:actor.factionId,targetFactionIds});
    }else appendRuntimeHistory(next,event,{actorFactionId:actor.factionId,targetFactionId:instance.status==='CANCELLED'||isIdentityRuntimeCommand(command)?null:target.factionId,...(command.g07Coordination?{targetRevealedFields:['placeRef','targetIds','factionIds','producer','actionType','importance','contentVersion']}:{})});
    const derived=applyKnownHistoryEvent(next.characterHistory,{ledger:next.historyLedger,factionId:actor.factionId,eventId:event.eventId});
    next.characterHistory=derived.state;
    next.lastCommit.historyEventIds.push(event.eventId);
    next.lastCommit.characterHistoryDecisions.push(derived.decision);
    const knowingFactions=[...new Set(Object.values(next.historyLedger.knowledgeById).filter(record=>record.eventId===event.eventId).map(record=>record.factionId))].sort();
    for(const factionId of knowingFactions)next.lastCommit.opportunityDecisions.push(openPostBattleOpportunity(next,{factionId,eventId:event.eventId}));
  }
  for(const proposal of assignmentProposals){
    const assignment=next.strategicAssignments.assignments[proposal.result.assignmentId];
    const event=normalizedAssignmentHistoryEvent(proposal),actorFactionId=proposal.factionRefs[0];
    appendRuntimeHistory(next,event,{actorFactionId});
    const derived=applyKnownHistoryEvent(next.characterHistory,{ledger:next.historyLedger,factionId:actorFactionId,eventId:event.eventId});
    next.characterHistory=derived.state;
    if(proposal.actionType==='ASSIGNMENT_TRAINING_COMPLETED'&&next.growthProgress?.characters[assignment.characterId]){
      const effectiveGrowthPool=growthPool?.poolVersion===next.growthPoolBinding?.poolVersion?growthPool:next.growthPoolData;invariant(effectiveGrowthPool&&effectiveGrowthPool.poolVersion===next.growthPoolBinding?.poolVersion,'RUNTIME_GROWTH_POOL_REQUIRED');
      const advanced=applyVerifiedGrowthSource(next.growthProgress,next.growthTrack,{assignmentState:next.strategicAssignments,sourceEvent:proposal,pool:effectiveGrowthPool});
      next.growthProgress=advanced.progressState;
      next.growthTrack=advanced.growthTrack;
      const officer=next.world.officers[assignment.characterId],progress=next.growthProgress.characters[assignment.characterId],growth=next.growthTrack.growthStates[assignment.characterId];
      officer.level=progress.level;officer.experience=progress.totalXp;officer.aptitudePoints=growth.aptitudePoints;
      next.lastCommit.growthResults.push(advanced.result);
    }
    next.strategicAssignments=acknowledgeAssignmentResultEvent(next.strategicAssignments,{eventId:`R5.ASSIGNMENT.ACK.${stableToken(event.eventId)}`,resultEventId:event.eventId});
    next.lastCommit.historyEventIds.push(event.eventId);
    next.lastCommit.characterHistoryDecisions.push(derived.decision);
  }
  advanceRuntimeDetachment(next,currentTick);
  return commitCurrentRuntimeCombatTerminalBatch(next,{losRules,completedMovementRecords});
}

/** Atomic orchestration of current committed combat and physical movement-entry results. */
export function commitCurrentRuntimeCombatTerminalBatch(next,{losRules,completedMovementRecords=[]}={}){
  validateFirst3Runtime(next,{losRules});
  const currentTick=next.committedGlobalTick;
  const mergedResultIds=next.combat.coordinator.batches[String(currentTick)]?.resultOrder.map(record=>record.resultId)??[];
  let defeatPayloads=[],combatCityCapturePayloads=[];
  if(mergedResultIds.length){
    const boundary={runtime:next,currentGlobalTick:currentTick,mergedResultIds};
    // Fail closed, including NO_PUBLIC_ELIGIBLE_CAPTOR: no raw captor inference
    // and no partial combat/tick commit escapes this immutable operation.
    defeatPayloads=adjudicateCampaignRuntimeDefeatSignals(boundary);
    combatCityCapturePayloads=createCampaignRuntimeCityCapturePayloads({...boundary,defeatPayloads});
  }
  const movementCityCapturePayloads=createCampaignRuntimeMovementCityCapturePayloads({runtime:next,currentGlobalTick:currentTick,completedMovementRecords});
  const capturesByCity=new Map();
  for(const payload of [...combatCityCapturePayloads,...movementCityCapturePayloads]){
    const prior=capturesByCity.get(payload.capturedCityId);
    invariant(!prior||same(prior,payload),`RUNTIME_TERMINAL_CITY_CAPTURE_SOURCE_CONFLICT:${payload.capturedCityId}`);
    if(!prior)capturesByCity.set(payload.capturedCityId,payload);
  }
  const cityCapturePayloads=[...capturesByCity.values()].sort((left,right)=>left.capturedCityId.localeCompare(right.capturedCityId,'en')||left.transactionId.localeCompare(right.transactionId,'en'));
  if(!defeatPayloads.length&&!cityCapturePayloads.length)return next;
  const batchBasis={
    battleId:next.combat.battleId,
    currentTick,
    combatResultIds:[...mergedResultIds].sort(),
    movementResultIds:completedMovementRecords.map(record=>record.resultId).sort(),
  };
  const batchId=`R9.RUNTIME.${currentTick}.${stableToken(JSON.stringify(batchBasis))}`;
  return commitConfirmedCampaignTerminalBatch(next,{batchId,globalTick:currentTick,defeatPayloads,cityCapturePayloads},{losRules});
}

export const R9_IDENTITY_TACTIC_TRIAL=Object.freeze({status:'WORK_TRIAL',staminaCost:20,windupTicks:10,cooldownTicks:60,recoveryTicks:0,g07TokenDurationTicks:40});
function identityDefinition(actionId){
  const control=actionId==='ART-G07';
  return {...BASE,actionId:control?'TACTIC_CONTROL':'TREAT_RALLY',allowedTroopTypes:[control?'mystic':'militia'],staminaCost:20,windupTicks:10,recoveryTicks:0,cooldownTicks:60,eventProfile:control?'CONTROL':'SUPPORT',semanticTags:[],losPolicy:control?'CLEAR_REQUIRED':'NONE',emitEventNames:control?['CONTROL_APPLIED']:['TREATMENT_APPLIED','ALLY_SUPPORTED','MORALE_CHANGED']};
}
function createRuntimeIdentityTactics(battleId,migratedFrom=null){return {format:'first3-runtime-identity-tactics',version:1,migratedFrom,g07:createG07CommandCoordinationState({battleId}),g08:createG08BannerTacticAdjudicatorState({battleId}),requestOrder:[],requestsById:{}};}
export function migrateFirst3RuntimeV2R9IdentityTacticsSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_SAVE_LENGTH');
  const next=JSON.parse(serialized);invariant(!own(next,'identityTactics'),'RUNTIME_ALREADY_HAS_IDENTITY_TACTICS');
  next.identityTactics=createRuntimeIdentityTactics(next.combat.battleId,'ROUND_09_PRE_IDENTITY');validateFirst3Runtime(next,{losRules,inputs});return next;
}
function identitySource(runtime,actorRef){
  const army=runtime.world.armies[actorRef],unit=runtime.combat.calculator.units[actorRef];
  return {armyId:actorRef,factionId:army.factionId,commanderId:army.commanderId,disposition:runtimeArmyIsActive(runtime,actorRef)?'ACTIVE':'DEFEATED',activePersonnel:unit.activePersonnel,routePending:unit.routePending};
}
function identitySourceAvailable(runtime,command){
  const army=runtime.world.armies[command.actorRef],unit=runtime.combat.calculator.units[command.actorRef];
  const expected=command.actionId==='ART-G07'?['F01','G07']:['F03','G08'];
  return army?.factionId===expected[0]&&army.commanderId===expected[1]&&runtimeArmyIsActive(runtime,command.actorRef)&&unit.activePersonnel>0&&unit.currentHp>0&&!unit.routePending&&!armyHasActiveMovement(army)&&assignmentForCommander(runtime,army.commanderId)===null&&evaluateConfusionActionPermission(runtime.combatConditions,{targetUnitId:command.actorRef,globalTick:getGlobalTick(runtime.world),actionKind:'CAST'}).allowed;
}
function identityTarget(runtime,command){
  const target=runtime.world.knowledge.F01.observedArmies[command.targetRef];
  invariant(target&&target.factionId!=='F01'&&runtimeArmyIsActive(runtime,command.targetRef)&&runtime.combat.calculator.units[command.targetRef].currentHp>0,'G07_RUNTIME_TARGET_NOT_OBSERVED_LEGAL');
  return {armyId:target.armyId,factionId:target.factionId,visibility:'OBSERVED',targetingStatus:'LEGAL'};
}
function g08AdjudicationInput(runtime,command,currentTick){
  return {actionInstanceId:command.actionInstanceId,currentTick,sourceUnitId:command.actorRef,sourceOfficerId:'G08',tacticId:'ART-G08',combatCalculatorState:runtime.combat.calculator,unitSnapshots:Object.values(runtime.world.armies).filter(a=>a.factionId==='F03').sort((a,b)=>a.armyId.localeCompare(b.armyId)).map(a=>{
    const u=runtime.combat.calculator.units[a.armyId],tile=runtime.world.tiles[a.tileId];
    return {unitId:a.armyId,factionId:a.factionId,officerId:a.commanderId,troopType:a.troopType,status:runtimeArmyIsActive(runtime,a.armyId)?'ACTIVE':'DEFEATED',tile:{q:tile.q,r:tile.r},activePersonnel:u.activePersonnel,currentHp:u.currentHp,morale:u.morale,moraleMin:u.moraleMin,moraleMax:u.moraleMax,routePending:u.routePending};
  })};
}
function identityIssue(runtime,{requestId,actorRef,targetRef=null,actionId},{losRules,actingFactionId=runtime.world.playerFactionId}={}){
  validateFirst3Runtime(runtime,{losRules});id(requestId,'requestId');id(actorRef,'actorRef');
  invariant(runtime.world.armies[actorRef]?.factionId===actingFactionId,actingFactionId===runtime.world.playerFactionId?'IDENTITY_TACTIC_NOT_PLAYER_OWNED':'ARMY_NOT_ACTING_FACTION_OWNED');
  invariant(runtime.world.factions[actingFactionId]?.alive===true,'ACTING_FACTION_INACTIVE');
  const manifest={requestId,actorRef,targetRef,actionId},fingerprint=JSON.stringify(manifest),existing=runtime.identityTactics.requestsById[requestId];
  if(existing){invariant(existing.fingerprint===fingerprint,'RUNTIME_IDENTITY_REQUEST_CONFLICT');return clone(runtime);}
  assertRuntimeCampaignActionable(runtime);
  const command={actionInstanceId:`R9.IDENTITY.${actionId}.${stableToken(requestId)}`,commandType:'R9_IDENTITY_TACTIC',requestId,actorRef,targetRef:actionId==='ART-G08'?actorRef:targetRef,actionId,issuedGlobalTick:runtime.committedGlobalTick,dueGlobalTick:runtime.committedGlobalTick+10,pathTileIds:[],issueFingerprint:fingerprint};
  invariant(identitySourceAvailable(runtime,command),'RUNTIME_IDENTITY_SOURCE_UNAVAILABLE');assertDetachmentArmyAvailable(runtime,actorRef);
  if(actionId==='ART-G07')identityTarget(runtime,command);
  else adjudicateG08BannerTactic(runtime.identityTactics.g08,g08AdjudicationInput(runtime,command,command.dueGlobalTick));
  const def=identityDefinition(actionId),next=clone(runtime);
  // A validated empty migration may begin recording new actions now. This
  // transition occurs only with the first successful issue, never on load.
  next.identityTactics.migratedFrom=null;
  next.combat.coordinator.actorStates[actorRef]=reserveCombatAction(next.combat.coordinator.actorStates[actorRef],{actionInstanceId:command.actionInstanceId,actorRef,actorTroopType:actionId==='ART-G07'?'mystic':'militia',targetRef:command.targetRef,definition:def,currentTick:runtime.committedGlobalTick,decisionValidation:{valid:true,...(actionId==='ART-G07'?{losState:'CLEAR'}:{})}});
  next.commands[command.actionInstanceId]=command;next.commandOrder.push(command.actionInstanceId);next.nextCommandSequence++;
  next.identityTactics.requestsById[requestId]={manifest,fingerprint,actionInstanceId:command.actionInstanceId};next.identityTactics.requestOrder.push(requestId);
  appendRuntimeHistory(next,runtimeIdentityHistoryEvent(next,command,'START'),{actorFactionId:next.world.armies[actorRef].factionId});
  validateFirst3Runtime(next,{losRules});return next;
}
export function issueRuntimeG07CommandCoordination(runtime,{requestId,actorRef='U-F01-G07',targetRef}={}, {losRules}={}){return identityIssue(runtime,{requestId,actorRef,targetRef,actionId:'ART-G07'},{losRules});}
export function issueRuntimeG08BannerTactic(runtime,{requestId,actorRef='U-F03-G08'}={}, {losRules}={}){return identityIssue(runtime,{requestId,actorRef,targetRef:null,actionId:'ART-G08'},{losRules});}
function cancelReservedIdentityCommand(runtime,command,currentTick,reason){
  if(currentTick<command.dueGlobalTick){
    cancelReservedRuntimeCommandForTerminal(runtime,command,currentTick);
    const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];instance.execution.validation.internalReason=reason;instance.execution.fingerprint=JSON.stringify({tick:currentTick,validation:instance.execution.validation,results:[]});command.identityResult={status:'CANCELLED',reason};return;
  }
  runtime.combat.coordinator.actorStates[command.actorRef]=executeCombatAction(runtime.combat.coordinator.actorStates[command.actorRef],{actionInstanceId:command.actionInstanceId,currentTick,executionValidation:{valid:false,internalReason:reason,publicReason:'CONDITION_NO_LONGER_MET',...(command.actionId==='ART-G07'?{losState:'CLEAR'}:{})},results:[]});
  command.identityResult={status:'CANCELLED',reason};
}
function prepareRuntimeIdentityDue(runtime,due,currentTick){
  const supportCommands=[],supports=[],coordinationEntries=[];
  for(const command of due.filter(isIdentityRuntimeCommand)){
    if(!identitySourceAvailable(runtime,command)){cancelReservedIdentityCommand(runtime,command,currentTick,'SOURCE_UNAVAILABLE');continue;}
    if(command.actionId==='ART-G07'){
      let target;try{target=identityTarget(runtime,command);}catch{cancelReservedIdentityCommand(runtime,command,currentTick,'TARGET_NOT_OBSERVED_LEGAL');continue;}
      const tokenId=`G07.TOKEN.${stableToken(command.actionInstanceId)}`;
      runtime.identityTactics.g07=issueG07CommandCoordination(runtime.identityTactics.g07,{requestId:command.requestId,tokenId,currentGlobalTick:currentTick,validThroughTick:currentTick+40,source:identitySource(runtime,command.actorRef),target});
      runtime.combat.coordinator.actorStates[command.actorRef]=executeCombatAction(runtime.combat.coordinator.actorStates[command.actorRef],{actionInstanceId:command.actionInstanceId,currentTick,executionValidation:{valid:true,losState:'CLEAR'},results:[]});
      command.identityResult={status:'TOKEN_ISSUED',tokenId};
      coordinationEntries.push({actorRef:command.actorRef,actionInstanceId:command.actionInstanceId,actorPostMergeState:'UNCHANGED',appliedResults:[]});
    }else{
      let adjudication;
      try{adjudication=adjudicateG08BannerTactic(runtime.identityTactics.g08,g08AdjudicationInput(runtime,command,currentTick));}
      catch(error){if(!/G08_NO_ELIGIBLE_TARGETS|G08_ACTION_UNAVAILABLE/.test(error.message))throw error;cancelReservedIdentityCommand(runtime,command,currentTick,'NO_ELIGIBLE_TARGETS');continue;}
      runtime.identityTactics.g08=adjudication.state;supports.push(...adjudication.proposal.calculatorInput.supports);supportCommands.push(command);
    }
  }
  return {supportCommands,supports,coordinationEntries};
}
function prioritizeRuntimeG07(runtime,baseDue,validations,currentTick){
  const prioritized=[];
  for(const tokenId of runtime.identityTactics.g07.tokenOrder){
    const token=runtime.identityTactics.g07.tokensById[tokenId];
    if(token.status!=='PENDING'||token.issuedAtTick>=currentTick||token.validThroughTick<currentTick)continue;
    const sourceCommand={actorRef:token.sourceArmyId,targetRef:token.targetArmyId,actionId:'ART-G07'};
    if(!identitySourceAvailable(runtime,sourceCommand))continue;
    let target;try{target=identityTarget(runtime,sourceCommand);}catch{continue;}
    const source=identitySource(runtime,token.sourceArmyId);
    if(!same(source,token.issueManifest.source)||!same(target,token.issueManifest.target))continue;
    const candidates=baseDue.filter(c=>c.actionId==='BASIC_ATTACK'&&c.actorRef!==token.sourceArmyId&&c.targetRef===token.targetArmyId&&runtime.world.armies[c.actorRef].factionId===token.sourceFactionId&&validations.get(c.actionInstanceId)?.valid&&!prioritized.includes(c.actionInstanceId)).map(c=>({actionInstanceId:c.actionInstanceId,actorArmyId:c.actorRef,actorFactionId:runtime.world.armies[c.actorRef].factionId,targetArmyId:c.targetRef,actionId:c.actionId,executionTick:currentTick,executionStatus:'VALIDATED',actorDisposition:'ACTIVE',actorActivePersonnel:runtime.combat.calculator.units[c.actorRef].activePersonnel,actorRoutePending:runtime.combat.calculator.units[c.actorRef].routePending,targetingStatus:'LEGAL'}));
    if(!candidates.length)continue;
    const proposed=proposeG07CoordinatedBasicAttack(runtime.identityTactics.g07,{proposalId:`G07.PROPOSAL.${stableToken(tokenId)}.${currentTick}`,tokenId,currentGlobalTick:currentTick,source,target,candidates});
    runtime.identityTactics.g07=proposed.state;
    const selected=runtime.commands[proposed.proposal.selectedActionInstanceId];selected.g07Coordination={tokenId,proposalId:proposed.proposal.proposalId,effectContract:clone(proposed.proposal.effectContract)};prioritized.push(selected.actionInstanceId);
  }
  const order=new Map(prioritized.map((id,index)=>[id,index]));baseDue.sort((a,b)=>(order.get(a.actionInstanceId)??Infinity)-(order.get(b.actionInstanceId)??Infinity)||a.actionInstanceId.localeCompare(b.actionInstanceId));
}
function consumeRuntimeG07(runtime,command,currentTick){
  if(!command.g07Coordination)return;
  const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];if(instance.status==='CANCELLED')return;
  runtime.identityTactics.g07=consumeG07CommandCoordination(runtime.identityTactics.g07,{transactionId:`G07.CONSUME.${stableToken(command.actionInstanceId)}`,currentGlobalTick:currentTick,proposalId:command.g07Coordination.proposalId,action:{actionInstanceId:command.actionInstanceId,actorArmyId:command.actorRef,actorFactionId:runtime.world.armies[command.actorRef].factionId,targetArmyId:command.targetRef,actionId:command.actionId,executionTick:currentTick,executionStatus:'EXECUTED'}});
}
function runtimeIdentityHistoryEvent(runtime,command,phase){
  const actor=runtime.world.armies[command.actorRef],instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId],start=phase==='START',cancelled=instance.status==='CANCELLED';
  return {eventId:historyEventId(phase,command.actionInstanceId),schemaVersion:1,campaignId:campaignId(runtime.world),globalTick:start?command.issuedGlobalTick:instance.execution.tick,placeRef:{type:'TILE',id:actor.tileId},actorIds:[actor.commanderId],targetIds:[],participantIds:[actor.armyId],factionIds:[actor.factionId],causeEventIds:start?[]:[historyEventId('START',command.actionInstanceId)],producer:'FIRST3_RUNTIME',actionType:start?`${command.actionId}_START`:'BATTLE_RESULT',outcome:{status:start?'CONFIRMED':cancelled?'FAILED':'SUCCEEDED',tags:[command.actionId,start?'COMMAND_ACCEPTED':cancelled?'COMMAND_CANCELLED':command.actionId==='ART-G07'?'COORDINATION_TOKEN_ISSUED':'MORALE_SUPPORT_COMMITTED'].sort(),loserFactionIds:[],details:{phase,actionId:command.actionId,...(!start&&!cancelled?{effect:publicRuntimeIdentityResult(runtime,command)}:{})}},importance:'STANDARD',contentVersion:FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION};
}
function publicRuntimeIdentityResult(runtime,command){
  if(!command.identityResult)return null;
  if(command.identityResult.status==='CANCELLED')return {status:'CANCELLED'};
  if(command.actionId==='ART-G07')return {status:'TOKEN_ISSUED',damageModifier:null,hitModifier:null};
  return clone(command.identityResult);
}
function publicRuntimeIdentityTactics(runtime,factionId){
  return {status:'WORK_TRIAL',coordination:runtime.identityTactics.g07.tokenOrder.map(id=>runtime.identityTactics.g07.tokensById[id]).filter(t=>t.sourceFactionId===factionId).map(t=>({sourceArmyId:t.sourceArmyId,targetArmyId:own(runtime.world.knowledge[factionId].observedArmies,t.targetArmyId)?t.targetArmyId:null,issuedAtTick:t.issuedAtTick,validThroughTick:t.validThroughTick,status:t.status==='PENDING'&&t.validThroughTick<runtime.committedGlobalTick?'EXPIRED':t.status,consumedAtTick:t.consumedAtTick,consumedByActionInstanceId:t.consumedByActionInstanceId,damageModifier:null,hitModifier:null}))};
}
function validateRuntimeIdentityCommand(runtime,command){
  const request=runtime.identityTactics.requestsById[command.requestId],instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId],expected=identityDefinition(command.actionId);
  invariant(request?.actionInstanceId===command.actionInstanceId&&request.fingerprint===command.issueFingerprint&&request.manifest.actorRef===command.actorRef&&request.manifest.actionId===command.actionId&&command.targetRef===(command.actionId==='ART-G08'?command.actorRef:request.manifest.targetRef),'RUNTIME_IDENTITY_COMMAND_REQUEST_MISMATCH');
  invariant(command.dueGlobalTick===command.issuedGlobalTick+10&&same(command.pathTileIds,[])&&instance.actionId===expected.actionId&&instance.actorTroopType===(command.actionId==='ART-G07'?'mystic':'militia'),'RUNTIME_IDENTITY_COMMAND_CONTRACT_MISMATCH');
  for(const key of ['staminaCost','windupTicks','recoveryTicks','cooldownTicks'])invariant(instance.definition[key]===expected[key],'RUNTIME_IDENTITY_LIFECYCLE_TAMPER');
  if(instance.status==='RESERVED')invariant(command.identityResult===undefined,'RUNTIME_IDENTITY_EARLY_RESULT');
  else if(instance.status==='CANCELLED')invariant(command.identityResult?.status==='CANCELLED'&&command.identityResult.reason===instance.execution.validation.internalReason,'RUNTIME_IDENTITY_CANCEL_MISMATCH');
  else if(command.actionId==='ART-G07'){
    const token=runtime.identityTactics.g07.tokensById[command.identityResult?.tokenId];invariant(command.identityResult?.status==='TOKEN_ISSUED'&&token?.issueRequestId===command.requestId&&token.sourceArmyId===command.actorRef&&token.targetArmyId===command.targetRef&&token.issuedAtTick===instance.execution.tick&&token.validThroughTick===token.issuedAtTick+40,'RUNTIME_G07_TOKEN_COMMAND_MISMATCH');
  }else{
    const record=runtime.identityTactics.g08.actions[command.actionInstanceId],entry=runtime.combat.calculator.processedTicks[String(instance.execution.tick)]?.output.coordinatorEntries.find(e=>e.actionInstanceId===command.actionInstanceId);
    invariant(record&&entry&&record.decision.currentTick===instance.execution.tick,'RUNTIME_G08_RESULT_SOURCE_MISSING');
    const targets=entry.appliedResults.map(r=>({targetUnitId:r.resultId.split('/').at(-2),moraleDelta:r.moraleDelta}));
    invariant(same(command.identityResult,{status:'COMPLETED',targetResults:targets}),'RUNTIME_G08_RESULT_MISMATCH');
    invariant(same(targets.map(t=>t.targetUnitId),record.proposal.targetEffects.map(t=>t.targetUnitId)),'RUNTIME_G08_TARGET_SET_MISMATCH');
    validateRuntimeG08CalculatorEvidence(runtime,command,record,instance.execution.tick);
  }
}

function validateRuntimeG08CalculatorEvidence(runtime,command,record,tick){
  const calculator=runtime.combat.calculator,processed=calculator.processedTicks[String(tick)];
  const ownSupports=processed.input.supports.filter(s=>s.actionInstanceId===command.actionInstanceId);
  invariant(same(ownSupports.map(({kind,resultId,...support})=>support),record.proposal.calculatorInput.supports),'RUNTIME_G08_CALCULATOR_INPUT_MISMATCH');
  const deltaAt=(processedTick,unitId)=>{
    const inputs=[...processedTick.input.attacks,...processedTick.input.supports],resultIds=new Set(inputs.filter(i=>i.targetRef===unitId).map(i=>i.resultId));
    return processedTick.output.coordinatorEntries.flatMap(e=>e.appliedResults).filter(r=>resultIds.has(r.resultId)).reduce((sum,r)=>sum+r.moraleDelta,0);
  };
  // Runtime morale is changed by these calculator results. Rewind later ticks
  // to bind each saved prediction to the actual historical pre-attack morale.
  for(const effect of record.proposal.targetEffects){
    const unitId=effect.targetUnitId,unit=calculator.units[unitId];
    const futureDelta=calculator.tickOrder.filter(key=>Number(key)>=tick).reduce((sum,key)=>sum+deltaAt(calculator.processedTicks[key],unitId),0);
    const before=unit.morale-futureDelta,after=before+deltaAt(processed,unitId);
    const snapshot=record.decision.allied.find(u=>u.unitId===unitId);
    invariant(snapshot&&snapshot.morale===before&&effect.moraleBefore===before&&effect.moraleAfter===before+effect.moraleDelta&&effect.moraleDelta===Math.min(8,unit.moraleMax-before)&&effect.moraleMax===unit.moraleMax&&effect.moraleMin===unit.moraleMin,'RUNTIME_G08_PREDICTION_MORALE_MISMATCH');
    const hp=processed.output.hpProjection.units.find(u=>u.unitId===unitId);
    invariant(hp&&snapshot.currentHp===hp.beforeCurrentHp,'RUNTIME_G08_PREDICTION_HP_MISMATCH');
    const attackIds=new Set(processed.input.attacks.filter(a=>a.targetRef===unitId).map(a=>a.resultId));
    const attackDelta=processed.output.coordinatorEntries.flatMap(e=>e.appliedResults).filter(r=>attackIds.has(r.resultId)).reduce((sum,r)=>sum+r.moraleDelta,0);
    const supportIds=new Set(ownSupports.filter(s=>s.targetRef===unitId).map(s=>s.resultId));
    const actual=processed.output.coordinatorEntries.flatMap(e=>e.appliedResults).filter(r=>supportIds.has(r.resultId)).reduce((sum,r)=>sum+r.moraleDelta,0);
    const expected=hp.afterCurrentHp===0?0:Math.min(8,unit.moraleMax-(before+attackDelta));
    invariant(actual===expected&&after===before+attackDelta+actual&&runtime.world.armies[unitId].morale===after+futureDelta-deltaAt(processed,unitId),'RUNTIME_G08_ACTUAL_MORALE_MISMATCH');
  }
}
function validateRuntimeIdentityTactics(runtime){
  const state=runtime.identityTactics;invariant(object(state),'RUNTIME_R9_IDENTITY_MIGRATION_REQUIRED');
  invariant(same(ids(state),['format','version','migratedFrom','g07','g08','requestOrder','requestsById'].sort())&&state.format==='first3-runtime-identity-tactics'&&state.version===1&&[null,'ROUND_09_PRE_IDENTITY'].includes(state.migratedFrom),'INVALID_RUNTIME_IDENTITY_FORMAT');
  validateG07CommandCoordinationState(state.g07);validateG08BannerTacticAdjudicatorState(state.g08);
  if(state.migratedFrom==='ROUND_09_PRE_IDENTITY')invariant(same(state,createRuntimeIdentityTactics(runtime.combat.battleId,'ROUND_09_PRE_IDENTITY'))&&!Object.values(runtime.commands).some(isIdentityRuntimeCommand),'RUNTIME_PRE_IDENTITY_MIGRATION_MUST_STAY_EMPTY');
  invariant(state.g07.battleId===runtime.combat.battleId&&state.g08.battleId===runtime.combat.battleId&&state.g07.currentGlobalTick<=runtime.committedGlobalTick,'RUNTIME_IDENTITY_BATTLE_OR_TICK_MISMATCH');
  invariant(Array.isArray(state.requestOrder)&&new Set(state.requestOrder).size===state.requestOrder.length&&same([...state.requestOrder].sort(),ids(state.requestsById)),'RUNTIME_IDENTITY_REQUEST_ORDER_MISMATCH');
  for(const requestId of state.requestOrder){const r=state.requestsById[requestId];invariant(r.manifest.requestId===requestId&&r.fingerprint===JSON.stringify(r.manifest)&&isIdentityRuntimeCommand(runtime.commands[r.actionInstanceId]),'RUNTIME_IDENTITY_REQUEST_MISMATCH');}
  for(const tokenId of state.g07.tokenOrder){const token=state.g07.tokensById[tokenId],r=state.requestsById[token.issueRequestId];invariant(runtime.commands[r?.actionInstanceId]?.identityResult?.tokenId===tokenId,'RUNTIME_G07_ORPHAN_TOKEN');}
  for(const proposalId of state.g07.proposalOrder){const proposal=state.g07.proposalsById[proposalId],command=runtime.commands[proposal.selectedActionInstanceId];invariant(command?.actionId==='BASIC_ATTACK'&&same(command.g07Coordination,{tokenId:proposal.tokenId,proposalId,effectContract:proposal.effectContract}),'RUNTIME_G07_PROPOSAL_COMMAND_MISMATCH');}
  for(const command of Object.values(runtime.commands))if(command.g07Coordination!==undefined){
    const marker=command.g07Coordination,proposal=state.g07.proposalsById[marker?.proposalId];
    invariant(command.actionId==='BASIC_ATTACK'&&proposal?.selectedActionInstanceId===command.actionInstanceId&&proposal.tokenId===marker.tokenId&&same(marker.effectContract,proposal.effectContract),'RUNTIME_G07_ORPHAN_COMMAND_MARKER');
  }
  for(const actionId of ids(state.g08.actions))invariant(runtime.commands[actionId]?.actionId==='ART-G08','RUNTIME_G08_ORPHAN_PROPOSAL');
}

function canonicalAiJson(value){
  if(Array.isArray(value))return `[${value.map(canonicalAiJson).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalAiJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function aiFingerprint(value){
  let hash=2166136261;
  for(const char of canonicalAiJson(value))hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return hash.toString(16).padStart(8,'0');
}
function createRuntimeStrategicAiState(enabled=false,migratedFrom=null){
  invariant(typeof enabled==='boolean','INVALID_RUNTIME_AI_ENABLED');
  return {format:'first3-runtime-strategic-ai',version:1,enabled,migratedFrom,planningBatchOrder:[],planningBatchesById:{},failedAttackOrder:[],failedAttacksById:{},finalizedCommandIds:[]};
}
function validateRuntimeStrategicAiState(runtime){
  const state=runtime.strategicAiRuntime;
  invariant(object(state),'RUNTIME_R9_AI_MIGRATION_REQUIRED');
  invariant(same(ids(state),['format','version','enabled','migratedFrom','planningBatchOrder','planningBatchesById','failedAttackOrder','failedAttacksById','finalizedCommandIds'].sort()),'INVALID_RUNTIME_AI_KEYS');
  invariant(state.format==='first3-runtime-strategic-ai'&&state.version===1&&typeof state.enabled==='boolean'&&[null,'ROUND_09_PRE_AI'].includes(state.migratedFrom),'INVALID_RUNTIME_AI_VERSION');
  if(state.migratedFrom==='ROUND_09_PRE_AI')invariant(state.enabled===false&&state.planningBatchOrder.length===0&&state.failedAttackOrder.length===0&&state.finalizedCommandIds.length===0,'RUNTIME_PRE_AI_MIGRATION_MUST_STAY_EMPTY_AND_DISABLED');
  for(const [order,byId] of [[state.planningBatchOrder,state.planningBatchesById],[state.failedAttackOrder,state.failedAttacksById]])invariant(Array.isArray(order)&&new Set(order).size===order.length&&object(byId)&&same([...order].sort(),ids(byId)),'INVALID_RUNTIME_AI_LEDGER');
  const submitted=new Map();let previousTick=-1;
  for(const boundaryId of state.planningBatchOrder){
    const batch=state.planningBatchesById[boundaryId];
    invariant(object(batch)&&same(ids(batch),['planningBoundaryId','globalTick','turnNumber','publicViewFingerprints','receipts','integrity'].sort())&&batch.planningBoundaryId===boundaryId,'INVALID_RUNTIME_AI_BATCH_KEYS');
    invariant(object(batch)&&boundaryId===`TURN-${batch.turnNumber}-G${batch.globalTick}`&&batch.globalTick===(batch.turnNumber-1)*runtime.world.time.ticksPerTurn&&batch.globalTick>previousTick&&batch.globalTick<=runtime.committedGlobalTick,'INVALID_RUNTIME_AI_BOUNDARY');previousTick=batch.globalTick;
    invariant(batch.integrity===aiFingerprint({...batch,integrity:null}),'RUNTIME_AI_BATCH_INTEGRITY_MISMATCH');
    invariant(Array.isArray(batch.receipts)&&Array.isArray(batch.publicViewFingerprints),'INVALID_RUNTIME_AI_RECEIPTS');
    let previousKey='';const armies=new Set();
    for(const receipt of batch.receipts){
      invariant(object(receipt)&&same(ids(receipt),['intentId','actingFactionId','armyId','type','targetArmyId','actionInstanceId','orderId','failureCandidate',...(own(receipt,'coordination')?['coordination']:[])].sort())&&['MOVE','HOLD','BASIC_ATTACK','RANGED_VOLLEY','ART-G07','ART-G08'].includes(receipt.type),'INVALID_RUNTIME_AI_RECEIPT_KEYS');
      const key=`${receipt.actingFactionId}:${receipt.armyId}:${receipt.intentId}`;
      invariant(key>previousKey&&!armies.has(receipt.armyId),'INVALID_RUNTIME_AI_RECEIPT_ORDER');previousKey=key;armies.add(receipt.armyId);
      invariant(runtime.world.armies[receipt.armyId]?.factionId===receipt.actingFactionId&&receipt.actingFactionId!==runtime.world.playerFactionId,'RUNTIME_AI_RECEIPT_AUTHORITY_MISMATCH');
      if(receipt.actionInstanceId!==null){
        const command=runtime.commands[receipt.actionInstanceId];
        invariant(command&&command.actorRef===receipt.armyId&&command.targetRef===receipt.targetArmyId&&command.actionId===receipt.type&&command.issuedGlobalTick===batch.globalTick&&!submitted.has(receipt.actionInstanceId),'RUNTIME_AI_COMMAND_RECEIPT_MISMATCH');
        const record=receipt.failureCandidate;
        if(['ART-G07','ART-G08'].includes(receipt.type)){
          invariant(record===null&&receipt.orderId===null&&isIdentityRuntimeCommand(command),'INVALID_RUNTIME_AI_IDENTITY_RECEIPT');
          const suffix=receipt.type==='ART-G08'?receipt.armyId:receipt.targetArmyId;
          invariant(receipt.intentId===`INTENT:AI:${batch.planningBoundaryId}:${receipt.actingFactionId}:${receipt.armyId}:${receipt.type}:${suffix}`&&command.requestId===receipt.intentId,'RUNTIME_AI_IDENTITY_INTENT_MISMATCH');
        }
        else invariant(object(record)&&same(ids(record),['failureId','factionId','armyId','targetArmyId','publicFingerprint'].sort())&&record.factionId===receipt.actingFactionId&&record.armyId===receipt.armyId&&record.targetArmyId===receipt.targetArmyId&&typeof record.publicFingerprint==='string','INVALID_RUNTIME_AI_FAILURE_CANDIDATE');
        if(receipt.coordination){
          const source=batch.receipts.find(r=>r.actionInstanceId===receipt.coordination.sourceActionInstanceId),sourceCommand=runtime.commands[source?.actionInstanceId];
          invariant(same(ids(receipt.coordination),['sourceActionInstanceId','waitTicks'].sort())&&receipt.coordination.waitTicks===3&&receipt.type==='BASIC_ATTACK'&&source?.type==='ART-G07'&&source.actingFactionId===receipt.actingFactionId&&source.armyId!==receipt.armyId&&source.targetArmyId===receipt.targetArmyId&&same(command.aiCoordinationWait,receipt.coordination)&&command.dueGlobalTick===sourceCommand.dueGlobalTick+1&&command.dueGlobalTick===command.issuedGlobalTick+definition('BASIC_ATTACK').windupTicks+3,'RUNTIME_AI_COORDINATION_RECEIPT_MISMATCH');
          invariant(batch.receipts.filter(r=>r.coordination?.sourceActionInstanceId===source.actionInstanceId).length===1,'RUNTIME_AI_COORDINATION_MUST_HAVE_ONE_BASIC');
        }else invariant(!own(command,'aiCoordinationWait'),'RUNTIME_AI_ORPHAN_COORDINATION_WAIT');
        submitted.set(receipt.actionInstanceId,receipt);
      }else invariant(['MOVE','HOLD'].includes(receipt.type)&&receipt.failureCandidate===null&&typeof receipt.orderId==='string','INVALID_RUNTIME_AI_MOVEMENT_RECEIPT');
    }
    for(const source of batch.receipts.filter(r=>r.type==='ART-G07'))invariant(batch.receipts.filter(r=>r.coordination?.sourceActionInstanceId===source.actionInstanceId).length===1,'RUNTIME_AI_G07_MISSING_COORDINATED_BASIC');
  }
  invariant(Array.isArray(state.finalizedCommandIds)&&new Set(state.finalizedCommandIds).size===state.finalizedCommandIds.length,'INVALID_RUNTIME_AI_FINALIZED_COMMANDS');
  for(const commandId of state.finalizedCommandIds){
    const receipt=submitted.get(commandId),instance=receipt&&runtime.combat.coordinator.actorStates[receipt.armyId]?.instances[commandId];
    invariant(instance&&['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(instance.status),'RUNTIME_AI_FINALIZED_COMMAND_NOT_FINISHED');
  }
  for(const failureId of state.failedAttackOrder){
    const record=state.failedAttacksById[failureId],entry=[...submitted.entries()].find(([,receipt])=>receipt.failureCandidate?.failureId===failureId);
    invariant(entry&&same(record,entry[1].failureCandidate)&&state.finalizedCommandIds.includes(entry[0]),'RUNTIME_AI_FAILURE_SOURCE_MISMATCH');
    const instance=runtime.combat.coordinator.actorStates[entry[1].armyId].instances[entry[0]];
    invariant(instance.status==='CANCELLED'&&instance.execution?.validation?.internalReason!=='TERMINAL_ARMY_INACTIVE','RUNTIME_AI_FAILURE_NOT_RUNTIME_CANCELLED');
  }
  for(const command of Object.values(runtime.commands))if(own(command,'aiCoordinationWait'))invariant(submitted.get(command.actionInstanceId)?.coordination,'RUNTIME_AI_ORPHAN_COORDINATION_WAIT');
}
export function migrateFirst3RuntimeV2R9AiSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  const next=JSON.parse(serialized);
  invariant(!own(next,'strategicAiRuntime'),'FIRST3_RUNTIME_ALREADY_HAS_R9_AI');
  next.strategicAiRuntime=createRuntimeStrategicAiState(false,'ROUND_09_PRE_AI');
  if(!own(next,'identityTactics'))next.identityTactics=createRuntimeIdentityTactics(next.combat.battleId,'ROUND_09_PRE_IDENTITY');
  validateFirst3Runtime(next,{losRules,inputs});return next;
}
function applyRuntimeFactionCommand(runtime,request,{losRules}={}){
  id(request.actingFactionId,'actingFactionId');
  if(['MOVE','HOLD'].includes(request.type))return applyRuntimeMoveOrder(runtime,request,{losRules});
  if(['ART-G07','ART-G08'].includes(request.type))return identityIssue(runtime,{requestId:request.requestId,actorRef:request.actorRef,targetRef:request.type==='ART-G08'?null:request.targetRef,actionId:request.type},{losRules,actingFactionId:request.actingFactionId});
  return applyRuntimeCombatCommand(runtime,{...request,actionId:request.type},{losRules});
}
function validateRuntimePublicMovePath(runtime,request,{losRules}){
  const path=request.validatedPathTileIds;
  if(request.type!=='MOVE')return;
  if(path===undefined||path===null){
    invariant(request.actingFactionId===runtime.world.playerFactionId,'NONPLAYER_MOVE_REQUIRES_VALIDATED_PUBLIC_PATH');
    return;
  }
  invariant(Array.isArray(path)&&path.length>0&&new Set(path).size===path.length,'INVALID_RUNTIME_PUBLIC_MOVE_PATH');
  const view=getFirst3RuntimePublicView(runtime,{factionId:request.actingFactionId,losRules}),army=view.world.ownArmies[request.armyId];
  invariant(army&&path[0]===army.tileId&&path.at(-1)===request.destinationTileId,'RUNTIME_PUBLIC_MOVE_ENDPOINT_MISMATCH');
  const movementClass=army.troopType==='cavalry'?'cavalry':army.troopType==='engineer'?'engineer':'normal';
  let cost=0;
  for(const tile of path)invariant(['VISIBLE','REMEMBERED'].includes(view.world.knowledge.tiles[tile]),'RUNTIME_PUBLIC_MOVE_TILE_UNKNOWN');
  for(let i=1;i<path.length;i++){
    const edge=view.world.knownEdges.find(item=>item.fromTileId===path[i-1]&&item.toTileId===path[i]||item.toTileId===path[i-1]&&item.fromTileId===path[i]);
    invariant(edge&&!edge.blocked&&Number.isSafeInteger(edge.travelTicksByClass[movementClass])&&edge.travelTicksByClass[movementClass]>0,'RUNTIME_PUBLIC_MOVE_EDGE_UNAVAILABLE');cost+=edge.travelTicksByClass[movementClass];
  }
  invariant(cost<=runtime.world.time.ticksPerTurn,'RUNTIME_PUBLIC_MOVE_EXCEEDS_TURN_BUDGET');
}
/** Shared authority, legality and immutable preview for player and AI commands. */
export function quoteRuntimeFactionCommand(runtime,request={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);
  invariant(object(request)&&['MOVE','HOLD','BASIC_ATTACK','RANGED_VOLLEY','CAVALRY_CHARGE','ART-G07','ART-G08'].includes(request.type),'UNSUPPORTED_RUNTIME_FACTION_COMMAND');
  if(['ART-G07','ART-G08'].includes(request.type)){
    const previous=runtime.identityTactics.requestsById[request.requestId];
    invariant(!previous||runtime.commands[previous.actionInstanceId].issuedGlobalTick===runtime.committedGlobalTick,'RUNTIME_IDENTITY_QUOTE_REQUEST_FROM_OLD_BOUNDARY');
  }
  validateRuntimePublicMovePath(runtime,request,{losRules});
  applyRuntimeFactionCommand(runtime,request,{losRules});
  return {format:'first3-runtime-faction-command-quote',version:1,sourceFingerprint:aiFingerprint(runtime),request:clone(request)};
}
export function commitQuotedRuntimeFactionCommand(runtime,quote,{losRules}={}){
  invariant(object(quote)&&quote.format==='first3-runtime-faction-command-quote'&&quote.version===1&&quote.sourceFingerprint===aiFingerprint(runtime),'RUNTIME_COMMAND_QUOTE_STALE_OR_INVALID');
  const verified=quoteRuntimeFactionCommand(runtime,quote.request,{losRules});
  invariant(same(verified,quote),'RUNTIME_COMMAND_QUOTE_MISMATCH');
  return applyRuntimeFactionCommand(runtime,quote.request,{losRules});
}
export function commitQuotedRuntimeFactionCommands(runtime,quotes,{losRules}={}){
  invariant(Array.isArray(quotes),'RUNTIME_COMMAND_QUOTES_REQUIRED');
  const actors=new Set();
  for(const quote of quotes){
    invariant(quote?.sourceFingerprint===aiFingerprint(runtime),'RUNTIME_COMMAND_QUOTE_STALE_OR_INVALID');
    const actor=quote.request.armyId??quote.request.actorRef;
    invariant(!actors.has(actor),'RUNTIME_COMMAND_BATCH_DUPLICATE_ARMY');actors.add(actor);
    invariant(same(quoteRuntimeFactionCommand(runtime,quote.request,{losRules}),quote),'RUNTIME_COMMAND_QUOTE_MISMATCH');
  }
  let next=clone(runtime);
  const ordered=[...quotes].sort((a,b)=>a.request.actingFactionId.localeCompare(b.request.actingFactionId,'en')||(a.request.armyId??a.request.actorRef).localeCompare(b.request.armyId??b.request.actorRef,'en'));
  for(const quote of ordered)next=applyRuntimeFactionCommand(next,quote.request,{losRules});
  return next;
}
export function issueRuntimeMoveOrder(runtime,{armyId,destinationTileId}={}, {losRules}={}){
  validateFirst3Runtime(runtime,{losRules});assertRuntimeCampaignActionable(runtime);
  if(runtime.world.armies[armyId])assertRuntimeArmyActive(runtime,armyId);
  invariant(runtime.world.armies[armyId]?.factionId===runtime.world.playerFactionId,'ARMY_NOT_PLAYER_OWNED');
  const quote=quoteRuntimeFactionCommand(runtime,{type:'MOVE',armyId,destinationTileId,actingFactionId:runtime.world.playerFactionId},{losRules});
  return commitQuotedRuntimeFactionCommand(runtime,quote,{losRules});
}
export function issueRuntimeCombatCommand(runtime,{actorRef,targetRef,actionId,pathTileIds=[]}={}, {losRules}={}){
  // Legacy combat fixtures historically submit either side. The common entry
  // always binds that explicit actor authority; AI callers cannot borrow it.
  // Preserve the legacy combat entry's action-catalog rejection before routing.
  definition(actionId);
  const quote=quoteRuntimeFactionCommand(runtime,{type:actionId,actorRef,targetRef,pathTileIds,actingFactionId:runtime.world.armies[actorRef]?.factionId},{losRules});
  return commitQuotedRuntimeFactionCommand(runtime,quote,{losRules});
}
function collectRuntimeAiAttackFailures(runtime){
  const state=runtime.strategicAiRuntime;
  for(const boundaryId of state.planningBatchOrder)for(const receipt of state.planningBatchesById[boundaryId].receipts){
    const commandId=receipt.actionInstanceId;if(commandId===null||state.finalizedCommandIds.includes(commandId))continue;
    const instance=runtime.combat.coordinator.actorStates[receipt.armyId].instances[commandId];
    if(!['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(instance.status))continue;
    state.finalizedCommandIds.push(commandId);
    if(instance.status!=='CANCELLED'||instance.execution?.validation?.internalReason==='TERMINAL_ARMY_INACTIVE')continue;
    const record=receipt.failureCandidate;
    if(record===null)continue;
    if(!own(state.failedAttacksById,record.failureId)){state.failedAttackOrder.push(record.failureId);state.failedAttacksById[record.failureId]=clone(record);}
  }
}
/** All faction public views and all quotes exist before the first order commit. */
export function commitRuntimeStrategicAiPlanningBoundary(runtime,{losRules,expectedPublicViewFingerprints=null}={}){
  validateFirst3Runtime(runtime,{losRules});
  const ai=runtime.strategicAiRuntime;
  if(!ai.enabled||runtime.world.gameResult!==null)return runtime;
  assertNoActionablePlayerTerminalChoice(runtime);
  if(runtime.world.turnPhase!=='PLANNING'||runtime.world.time.tick!==0)return runtime;
  const boundaryId=`TURN-${runtime.world.turnNumber}-G${runtime.committedGlobalTick}`,existing=ai.planningBatchesById[boundaryId];
  if(existing){invariant(expectedPublicViewFingerprints===null||canonicalAiJson(expectedPublicViewFingerprints)===canonicalAiJson(existing.publicViewFingerprints),'RUNTIME_AI_BOUNDARY_FINGERPRINT_CONFLICT');return clone(runtime);}
  let next=clone(runtime);
  const factionIds=ids(next.world.factions).filter(factionId=>factionId!==next.world.playerFactionId);
  const choices=factionIds.flatMap(factionId=>{
    const view=getFirst3RuntimePublicView(next,{factionId,losRules});
    return selectCampaignTerminalAiChoiceResolutionInputs(view).map(input=>({factionId,input,createdAtTick:view.terminal.ownChoices.find(choice=>choice.choiceId===input.choiceId).createdAtTick}));
  }).sort((a,b)=>a.createdAtTick-b.createdAtTick||a.input.choiceId.localeCompare(b.input.choiceId,'en')||a.factionId.localeCompare(b.factionId,'en'));
  for(const choice of choices)next=resolveRuntimeCampaignTerminalChoiceForFaction(next,choice.input,{losRules,actingFactionId:choice.factionId,resolutionMode:'AI_STABLE'});
  if(next.world.gameResult!==null)return next;
  const views=factionIds.map(factionId=>getFirst3RuntimePublicView(next,{factionId,losRules}));
  const batch=planFirst3StrategicAiRuntimePublicBatch(views);
  invariant(expectedPublicViewFingerprints===null||canonicalAiJson(expectedPublicViewFingerprints)===canonicalAiJson(batch.publicViewFingerprints),'RUNTIME_AI_BOUNDARY_FINGERPRINT_CONFLICT');
  const requests=new Map(),failures=new Map();
  for(const view of views){
    if(batch.skippedFactions.some(item=>item.factionId===view.world.factionId))continue;
    for(const core of quoteFirst3StrategicAiPublicMovementBatch(view,batch))requests.set(core.armyId,{type:core.type,armyId:core.armyId,destinationTileId:core.destinationTileId,actingFactionId:core.factionId,validatedPathTileIds:core.validatedPathTileIds});
    const attack=quoteFirst3StrategicAiPublicAttackBatch(view,batch);
    for(const request of attack.requests)requests.set(request.actorRef,{type:request.actionId,actingFactionId:request.actingFactionId,actorRef:request.actorRef,targetRef:request.targetRef});
    for(const candidate of attack.failureMemoryCandidates)failures.set(candidate.sourceIntentId,candidate.record);
    for(const request of quoteFirst3StrategicAiPublicIdentityBatch(view,batch))requests.set(request.actorRef,request);
  }
  const quotes=batch.commandIntents.map(intent=>{
    const request=requests.get(intent.armyId);
    try{return {intent,quote:quoteRuntimeFactionCommand(next,request,{losRules})};}
    catch(error){
      const publicLosFailure=intent.type==='RANGED_VOLLEY'&&/^LOS_(BLOCKED|UNKNOWN)$/.test(String(error?.message));
      if(!publicLosFailure&&!['ART-G07','ART-G08'].includes(intent.type))throw error;
      const fallback={type:'HOLD',armyId:intent.armyId,actingFactionId:intent.actingFactionId};
      return {intent,quote:quoteRuntimeFactionCommand(next,fallback,{losRules})};
    }
  });
  const receipts=[];
  for(const {intent,quote} of quotes){
    next=applyRuntimeFactionCommand(next,quote.request,{losRules});
    const submittedType=quote.request.type,attack=['BASIC_ATTACK','RANGED_VOLLEY'].includes(submittedType),combat=attack||['ART-G07','ART-G08'].includes(submittedType),command=combat?next.commands[next.commandOrder.at(-1)]:null;
    receipts.push({intentId:intent.intentId,actingFactionId:intent.actingFactionId,armyId:intent.armyId,type:submittedType,targetArmyId:command?.targetRef??null,actionInstanceId:command?.actionInstanceId??null,orderId:combat?null:next.world.armies[intent.armyId].currentOrder.orderId,failureCandidate:attack?clone(failures.get(intent.intentId)):null});
  }
  // Only this internal, fully quoted AI batch can defer one selected BASIC.
  // No generic command API accepts a delay. Reservation/cost/damage stay intact.
  for(const source of receipts.filter(r=>r.type==='ART-G07')){
    const ally=receipts.find(r=>r.type==='BASIC_ATTACK'&&r.actingFactionId===source.actingFactionId&&r.armyId!==source.armyId&&r.targetArmyId===source.targetArmyId);
    invariant(ally,'RUNTIME_AI_G07_REQUIRES_SELECTED_BASIC');
    ally.coordination={sourceActionInstanceId:source.actionInstanceId,waitTicks:3};
    next.commands[ally.actionInstanceId].aiCoordinationWait=clone(ally.coordination);
    next.commands[ally.actionInstanceId].dueGlobalTick=next.commands[source.actionInstanceId].dueGlobalTick+1;
  }
  const receipt={planningBoundaryId:boundaryId,globalTick:next.committedGlobalTick,turnNumber:next.world.turnNumber,publicViewFingerprints:clone(batch.publicViewFingerprints),receipts,integrity:null};
  receipt.integrity=aiFingerprint(receipt);next.strategicAiRuntime.planningBatchOrder.push(boundaryId);next.strategicAiRuntime.planningBatchesById[boundaryId]=receipt;
  validateFirst3Runtime(next,{losRules});return next;
}

export function executeFirst3RuntimeTicks(runtime,{count=1,losRules,growthPool=null}={}){
  uint(count,'count');invariant(count>0&&count<=200,'count must be in 1..200');
  validateFirst3Runtime(runtime,{losRules});
  invariant(runtime.world.gameResult===null,'종료된 캠페인은 더 진행할 수 없습니다.');
  assertNoActionablePlayerTerminalChoice(runtime);
  let next=runtime;
  for(let index=0;index<count;index++){
    next=commitRuntimeStrategicAiPlanningBoundary(next,{losRules});
    next=executeOneRuntimeTick(next,{losRules,growthPool});
    collectRuntimeAiAttackFailures(next);
    if(next.world.gameResult!==null||hasActionablePlayerTerminalChoice(next))break;
  }
  return next;
}

function getFirst3RuntimePublicLastCommit(runtime,factionId){
  const commit=runtime.lastCommit;
  if(commit===null)return null;
  const ownOfficerId=characterId=>runtime.world.officers[characterId]?.allegianceFactionId===factionId;
  const ownActionId=actionInstanceId=>{
    const command=runtime.commands[actionInstanceId],army=command?runtime.world.armies[command.actorRef]:null;
    if(army)return army.factionId===factionId;
    const start=runtime.historyLedger.eventsById[historyEventId('START',actionInstanceId)];
    return start?.actorIds.length>0&&start.actorIds.every(ownOfficerId);
  };
  const knowledge=getFactionKnowledgeProjection(runtime.historyLedger,factionId),knownEventIds=new Set(knowledge.map(event=>event.eventId));
  const publicHistoryEventIds=(commit.historyEventIds??[]).filter(eventId=>knownEventIds.has(eventId));
  const publicCharacterDecision=decision=>{
    const event=runtime.historyLedger.eventsById[decision.eventId];
    if(!event||!knownEventIds.has(decision.eventId)||event.actorIds.length===0||!event.actorIds.every(ownOfficerId))return null;
    return {
      ...clone(decision),
      memoryIds:(decision.memoryIds??[]).filter(memoryId=>{
        const memory=runtime.characterHistory.memoriesById[memoryId];
        return memory&&ownOfficerId(memory.characterId)&&memory.knownByFactionIds.includes(factionId);
      }),
      traceIds:(decision.traceIds??[]).filter(traceId=>{
        const trace=runtime.characterHistory.tracesById[traceId];
        return trace&&ownOfficerId(trace.characterId)&&trace.knownByFactionIds.includes(factionId);
      }),
      relationshipIds:(decision.relationshipIds??[]).filter(relationId=>{
        const relationship=runtime.characterHistory.relationshipsById[relationId];
        return relationship&&relationship.participantIds.every(ownOfficerId)&&relationship.knownByFactionIds.includes(factionId);
      }),
      skippedContributions:(decision.skippedContributions??[]).filter(item=>ownOfficerId(item.characterId)),
    };
  };
  const publicOpportunityDecision=decision=>{
    if(decision.proposal?.factionId===factionId&&ownOfficerId(decision.proposal.actorCharacterId)&&decision.proposal.sourceEventIds.every(eventId=>knownEventIds.has(eventId)))return clone(decision);
    const belongsToKnownEvent=publicHistoryEventIds.some(eventId=>decision.requestId===`R5.PBO.${stableToken(`${factionId}:${eventId}`)}`);
    return belongsToKnownEvent?clone(decision):null;
  };
  const ownSettlementResult=result=>result.ownerFactionId===factionId;
  const ownRecruitmentDecision=decision=>runtime.recruitment?.recruitment.proposals[decision.proposalId]?.factionId===factionId;
  return {
    globalTick:commit.globalTick,
    executedActionIds:(commit.executedActionIds??[]).filter(ownActionId),
    cancelledActionIds:(commit.cancelledActionIds??[]).filter(ownActionId),
    historyEventIds:publicHistoryEventIds,
    characterHistoryDecisions:(commit.characterHistoryDecisions??[]).map(publicCharacterDecision).filter(Boolean),
    opportunityDecisions:(commit.opportunityDecisions??[]).map(publicOpportunityDecision).filter(Boolean),
    growthResults:(commit.growthResults??[]).filter(result=>ownOfficerId(result.characterId)).map(clone),
    citySettlementResults:(commit.citySettlementResults??[]).filter(ownSettlementResult).map(clone),
    recruitmentDecisions:(commit.recruitmentDecisions??[]).filter(ownRecruitmentDecision).map(clone),
    ...(commit.terminalBatch&&runtime.campaignTerminal?{terminal:projectCampaignTerminalPublicView(runtime.campaignTerminal,{viewerFactionId:factionId,knownTerminalRecordIds:knownTerminalRecordIdsForFaction(runtime.campaignTerminal,factionId)})}:{}),
  };
}

function knownTerminalRecordIdsForFaction(terminalState,factionId){
  return terminalState.recordOrder.filter(recordId=>terminalState.recordsById[recordId].refs.factionIds.includes(factionId));
}

export function getFirst3RuntimePublicView(runtime,{factionId=runtime.world.playerFactionId,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(factionId&&own(runtime.world.factions,factionId),'UNKNOWN_PUBLIC_FACTION');
  const world=getFactionView(runtime.world,factionId);
  const publicLos=knownLosState(runtime,factionId,losRules);
  const visibleIds=new Set([...Object.keys(world.ownArmies),...Object.keys(world.knowledge.observedArmies)]);
  const units={};
  for(const unitId of [...visibleIds].sort()){
    const delta=runtime.combat.delta.units[unitId],calculator=runtime.combat.calculator.units[unitId];
    if(!delta||!calculator)continue;
    const ownUnit=own(world.ownArmies,unitId);
    const actorState=runtime.combat.coordinator.actorStates[unitId];
    const actionAvailability=ownUnit?publicActionAvailability(runtime,unitId,actorState):{};
    units[unitId]={
      unitId,
      own:ownUnit,
      activePersonnel:ownUnit?delta.activePersonnel:null,
      woundedPersonnel:ownUnit?delta.woundedPersonnel:null,
      deadPersonnel:ownUnit?delta.deadPersonnel:null,
      currentHp:ownUnit?calculator.currentHp:null,
      maxHp:ownUnit?calculator.maxHp:null,
      morale:ownUnit?delta.morale:null,
      moraleMax:ownUnit?calculator.moraleMax:null,
      routePending:delta.routePending,
      stamina:ownUnit?actorState.lifecycleState.stamina.current:null,
      reservedStamina:ownUnit?actorState.lifecycleState.stamina.reserved:null,
      conditions:publicConditionStates(runtime,unitId),
      actionAvailability,
    };
  }
  const commands=runtime.commandOrder.map(commandId=>runtime.commands[commandId]).filter(command=>runtime.world.armies[command.actorRef].factionId===factionId).map(command=>{
    const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[command.actionInstanceId];
    if(isIdentityRuntimeCommand(command))return {actionInstanceId:command.actionInstanceId,actorRef:command.actorRef,actionId:command.actionId,targetRef:command.actionId==='ART-G07'&&own(world.knowledge.observedArmies,command.targetRef)?command.targetRef:null,issuedGlobalTick:command.issuedGlobalTick,dueGlobalTick:command.dueGlobalTick,status:instance.status,publicReason:instance.execution?.validation?.publicReason??null,outcome:publicRuntimeIdentityResult(runtime,command)};
    if(isG21RuntimeCommand(command))return {
      actionInstanceId:command.actionInstanceId,actorRef:command.actorRef,targetRef:command.targetRef,actionId:command.actionId,
      issuedGlobalTick:command.issuedGlobalTick,dueGlobalTick:command.dueGlobalTick,status:instance.status,
      publicReason:instance.execution?.validation?.publicReason??null,
      outcome:command.g21Result?{status:command.g21Result.status,controlResolution:command.g21Result.controlResolution,conditionApplicationStatus:command.g21Result.conditionApplicationStatus}:null,
    };
    if(isG03RuntimeCommand(command))return {
      actionInstanceId:command.actionInstanceId,actorRef:command.actorRef,areaTileIds:[...command.areaTileIds],actionId:command.actionId,
      issuedGlobalTick:command.issuedGlobalTick,dueGlobalTick:command.dueGlobalTick,status:instance.status,
      publicReason:instance.execution?.validation?.publicReason??null,
      outcome:command.g03Result?{
        status:command.g03Result.status,
        resolution:command.g03Result.resolution,
        targetResults:(command.g03Result.targetResults??[]).map(result=>({targetUnitId:result.targetUnitId,resolution:result.resolution,conditionApplicationStatus:result.conditionApplicationStatus})),
      }:null,
    };
    return {...clone(command),status:instance.status,publicReason:instance.execution?.validation?.publicReason??null};
  });
  const characterHistory=Object.fromEntries(Object.values(runtime.world.officers).filter(officer=>officer.allegianceFactionId===factionId).map(officer=>[officer.officerId,getCharacterHistoryProjection(runtime.characterHistory,{characterId:officer.officerId,factionId})]));
  const growth=runtime.growthTrack?{
    poolVersion:runtime.growthTrack.poolVersion,
    characters:Object.fromEntries(Object.entries(runtime.growthTrack.growthStates).filter(([characterId])=>runtime.world.officers[characterId]?.allegianceFactionId===factionId).map(([characterId,state])=>[characterId,clone(state)])),
    progress:Object.fromEntries(Object.entries(runtime.growthProgress.characters).filter(([characterId])=>runtime.world.officers[characterId]?.allegianceFactionId===factionId).map(([characterId,state])=>[characterId,clone(state)])),
    drafts:runtime.growthTrack.draftOrder.map(draftId=>runtime.growthTrack.draftsById[draftId]).filter(draft=>runtime.world.officers[draft.characterId]?.allegianceFactionId===factionId).map(clone),
  }:null;
  const assignmentBudget=runtime.strategicAssignments.budgets[`${runtime.world.turnNumber}:${factionId}`];
  const capacity=runtime.strategicAssignments.factions[factionId].capacity,committed=assignmentBudget?.committed??0;
  const strategic={
    ai:{enabled:runtime.strategicAiRuntime.enabled,failedAttackLedger:runtime.strategicAiRuntime.failedAttackOrder.map(failureId=>runtime.strategicAiRuntime.failedAttacksById[failureId]).filter(record=>record.factionId===factionId&&own(world.ownArmies,record.armyId)&&own(world.knowledge.observedArmies,record.targetArmyId)).map(clone)},
    budget:{turnNumber:runtime.world.turnNumber,capacity,committed,remaining:capacity-committed},
    characters:Object.fromEntries(Object.entries(runtime.strategicAssignments.characters).filter(([,character])=>character.factionId===factionId).map(([characterId,character])=>[characterId,clone(character)])),
    assignments:Object.fromEntries(Object.entries(runtime.strategicAssignments.assignments).filter(([,assignment])=>assignment.factionId===factionId).map(([assignmentId,assignment])=>[assignmentId,clone(assignment)])),
    opportunities:Object.values(runtime.postBattleOpportunities.proposalsByOpportunityId).filter(proposal=>proposal.factionId===factionId).map(proposal=>({...clone(proposal),claimedAssignmentId:runtime.strategicAssignments.opportunityClaims[`${factionId}:${proposal.sourceEventIds[0]}`]??null})),
  };
  const citySettlement=runtime.citySettlement?{
    status:'CONNECTED_ACTUAL_TURN_SETTLEMENT',
    cities:Object.fromEntries(Object.values(runtime.world.cities).filter(city=>city.ownerFactionId===factionId).map(city=>{
      const latestEvent=Object.values(runtime.citySettlement.processedEvents).sort((a,b)=>b.turn-a.turn)[0]??null,latest=latestEvent?.results?.[city.cityId]??null;
      return [city.cityId,{cityId:city.cityId,name:city.name,foodStock:city.foodStock,reservedFood:city.reservedResources.food,availableFood:city.foodStock-city.reservedResources.food,population:city.population,populationCapacity:city.populationCapacity,productionProgress:city.productionProgress,growthProgress:city.growthProgress,security:city.security,occupationState:city.occupationState,derivedEconomy:deriveRuntimeCityEconomy(runtime,city.cityId),latestSettlementTurn:latestEvent?.turn??null,latestSettlement:latest?{...clone(latest),occupationStatus:city.occupationState}:null}];
    })),
  }:null;
  const recruitment=runtime.recruitment?{
    prestige:runtime.world.factions[factionId].prestige,
    reservedPrestige:runtime.recruitment.recruitment.factions[factionId].reservedPrestige,
    availablePrestige:runtime.world.factions[factionId].prestige-runtime.recruitment.recruitment.factions[factionId].reservedPrestige,
    proposals:Object.values(runtime.recruitment.recruitment.proposals).filter(proposal=>proposal.factionId===factionId).map(clone),
    candidates:Object.values(runtime.externalRecruitCandidates.candidates).filter(candidate=>{
      const proposal=candidate.proposalId?runtime.recruitment.recruitment.proposals[candidate.proposalId]:null;
      return !proposal||proposal.factionId===factionId;
    }).map(candidate=>({candidateId:candidate.candidateId,status:candidate.status,availability:candidate.availability,currentTileId:candidate.currentTileId,destinationCityId:candidate.destinationCityId,arrivalGlobalTick:candidate.arrivalGlobalTick,worldOfficerExists:own(runtime.world.officers,candidate.candidateId),effectStatus:publicRecruitmentEffectStatus(runtime,candidate)})),
  }:null;
  const preparation=runtime.detachmentPreparation?.preparation;
  const detachment=preparation?.factionId===factionId?{
    status:preparation.status,
    preparationId:preparation.preparationId,
    sourceArmyId:preparation.sourceArmyId,
    officerId:preparation.officerId,
    cityId:preparation.cityId,
    newArmyId:preparation.newArmyId,
    transferTroopCount:preparation.transferTroopCount,
    startedGlobalTick:preparation.startedGlobalTick,
    expectedEndGlobalTick:preparation.expectedEndGlobalTick,
    remainingTicks:preparation.status==='PREPARING'?Math.max(0,preparation.expectedEndGlobalTick-runtime.committedGlobalTick):0,
    deploymentTileId:preparation.deploymentTileId,
    cancelReason:preparation.cancelReason,
  }:null;
  return clone({
    scenarioMode:runtime.scenarioMode,
    globalTick:runtime.committedGlobalTick,
    world,
    los:{tileBlocksLOS:publicLos.tileBlocksLOS},
    combat:{units,commands,lastCommit:getFirst3RuntimePublicLastCommit(runtime,factionId),identityTactics:publicRuntimeIdentityTactics(runtime,factionId)},
    history:getFactionKnowledgeProjection(runtime.historyLedger,factionId),
    characterHistory,
    strategic,
    growth,
    citySettlement,
    recruitment,
    detachment,
    terminal:runtime.campaignTerminal?projectCampaignTerminalPublicView(runtime.campaignTerminal,{viewerFactionId:factionId,knownTerminalRecordIds:knownTerminalRecordIdsForFaction(runtime.campaignTerminal,factionId)}):null,
    integrationSlots:runtime.integrationSlots,
  });
}

export function getFirst3RuntimeHistoryProposals(runtime,{afterGlobalTick=-1,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  invariant(Number.isInteger(afterGlobalTick)&&afterGlobalTick>=-1,'afterGlobalTick must be an integer >= -1');
  const proposalCampaignId=campaignId(runtime.world);
  return runtime.commandOrder.flatMap(commandId=>{
    const command=runtime.commands[commandId],instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[commandId];
    const globalTick=instance.execution?.tick;
    if(!Number.isInteger(globalTick)||globalTick<=afterGlobalTick||!['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(instance.status))return [];
    const actor=runtime.world.armies[command.actorRef],g03=isG03RuntimeCommand(command);
    const targetRefs=g03?(command.g03Result?.targetResults??[]).map(result=>result.targetUnitId).filter(targetRef=>runtime.world.armies[targetRef]).sort():[command.targetRef];
    const target=targetRefs.length?runtime.world.armies[targetRefs[0]]:null;
    const cancelled=instance.status==='CANCELLED';
    return [{
      eventId:`FIRST3_RUNTIME:${command.actionInstanceId}`,
      campaignId:proposalCampaignId,
      globalTick,
      placeRef:`TILE:${g03?command.areaTileIds[0]:cancelled?actor.tileId:target.tileId}`,
      actorRefs:[command.actorRef],
      targetRefs,
      participantRefs:[],
      factionRefs:[...new Set([actor.factionId,...targetRefs.map(targetRef=>runtime.world.armies[targetRef].factionId)])].sort(),
      causeEventIds:[],
      producer:'FIRST3_RUNTIME',
      actionType:command.actionId,
      result:{status:cancelled?'CANCELLED':'COMPLETED',type:cancelled?'COMMAND_CANCELLED':'COMBAT_ACTION_COMMITTED'},
      derivation:{runtimeFormat:FORMAT,runtimeVersion:VERSION,producerVersion:FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION,actionInstanceId:command.actionInstanceId,resultIds:instance.results.map(result=>result.resultId)},
      importance:'STANDARD',
      contentVersion:FIRST3_RUNTIME_HISTORY_PRODUCER_VERSION,
    }];
  });
}

export function selectRuntimeArmy(runtime,{armyId,losRules}={}){
  validateFirst3Runtime(runtime,{losRules});
  id(armyId,'armyId');
  const army=runtime.world.armies[armyId];
  invariant(army&&army.factionId===runtime.world.playerFactionId,'ARMY_NOT_PLAYER_OWNED');
  assertRuntimeArmyActive(runtime,armyId);
  const next=clone(runtime);
  next.world.ui.selectedArmyId=armyId;
  validateFirst3Runtime(next,{losRules});
  return next;
}

export function serializeFirst3Runtime(runtime,{losRules,inputs}={}){
  validateFirst3Runtime(runtime,{losRules,inputs});
  return JSON.stringify(runtime);
}

export function deserializeFirst3Runtime(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_SAVE_LENGTH');
  let runtime;try{runtime=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_JSON');}
  invariant(runtime?.strategicAssignments&&runtime?.postBattleOpportunities&&own(runtime,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(runtime,'citySettlement')&&(runtime.citySettlement||runtime.citySettlementPendingEconomy||runtime.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(runtime,'combatConditions')&&own(runtime,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(own(runtime,'detachmentPreparation')&&own(runtime,'detachmentCombatRegistration')&&own(runtime,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  invariant(own(runtime,'g21TacticMigration'),'RUNTIME_R7_G21_TACTIC_MIGRATION_REQUIRED');
  invariant(own(runtime,'movementSlowMigration'),'RUNTIME_R8_MOVEMENT_SLOW_MIGRATION_REQUIRED');
  invariant(own(runtime,'g03TacticMigration'),'RUNTIME_R8_G03_TACTIC_MIGRATION_REQUIRED');
  invariant(own(runtime,'campaignTerminal')&&own(runtime,'terminalStateMigration'),'RUNTIME_R9_TERMINAL_STATE_MIGRATION_REQUIRED');
  validateFirst3Runtime(runtime,{losRules,inputs});
  return clone(runtime);
}

function initializeEmptyDetachmentExtension(runtime,from){
  if(own(runtime,'detachmentPreparation')||own(runtime,'detachmentCombatRegistration')||own(runtime,'detachmentMigration')){
    invariant(own(runtime,'detachmentPreparation')&&own(runtime,'detachmentCombatRegistration')&&own(runtime,'detachmentMigration'),'PARTIAL_RUNTIME_DETACHMENT_EXTENSION');
    return runtime;
  }
  runtime.detachmentPreparation=null;
  runtime.detachmentCombatRegistration=null;
  runtime.detachmentMigration={from,to:'ROUND_07_C1_DETACHMENT_V1',preparationInferred:false};
  return runtime;
}

function initializeEmptyG21TacticExtension(runtime,from){
  if(own(runtime,'g21TacticMigration'))return runtime;
  runtime.g21TacticMigration={from,to:'ROUND_07_C2_G21_TACTIC_V1',commandsInferred:false,resolutionsInferred:false};
  return runtime;
}

function initializeMovementSlowExtension(runtime,from){
  if(own(runtime,'movementSlowMigration'))return runtime;
  runtime.movementSlowMigration={from,to:'ROUND_08_MOVE_SLOW_EFFECT_V1',movementMagnitudesInferred:false,legacySlowAffectsMovement:false};
  return runtime;
}

function initializeEmptyG03TacticExtension(runtime,from){
  if(own(runtime,'g03TacticMigration'))return runtime;
  runtime.g03TacticMigration={from,to:'ROUND_08_G03_TACTIC_V1',commandsInferred:false,resolutionsInferred:false};
  return runtime;
}

function initializeEmptyCampaignTerminalExtension(runtime){
  if(!own(runtime,'identityTactics'))runtime.identityTactics=createRuntimeIdentityTactics(runtime.combat.battleId,'ROUND_09_PRE_IDENTITY');
  if(!own(runtime,'strategicAiRuntime'))runtime.strategicAiRuntime=createRuntimeStrategicAiState(false,'ROUND_09_PRE_AI');
  const hasTerminal=own(runtime,'campaignTerminal'),hasMigration=own(runtime,'terminalStateMigration');
  if(hasTerminal||hasMigration){
    invariant(hasTerminal&&hasMigration,'PARTIAL_RUNTIME_CAMPAIGN_TERMINAL_EXTENSION');
    if(runtime.campaignTerminal===null&&runtime.terminalStateMigration===null)runtime.terminalStateMigration={from:'ROUND_08_G03_TACTIC_V1',to:'ROUND_09_TERMINAL_STATE_V1',terminalEventsInferred:false};
    return runtime;
  }
  runtime.campaignTerminal=null;
  runtime.terminalStateMigration={from:'ROUND_08_G03_TACTIC_V1',to:'ROUND_09_TERMINAL_STATE_V1',terminalEventsInferred:false};
  return runtime;
}

export function migrateFirst3RuntimeV2R5Save(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(!legacy.strategicAssignments&&!legacy.postBattleOpportunities&&!own(legacy,'growthProgress'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R5_EXTENSION');
  const next=clone(legacy);
  next.strategicAssignments=createRuntimeAssignments(next.world);
  next.campaignMapping=campaignMapping(next.world);
  next.postBattleOpportunities=createPostBattleOpportunityState({campaignId:campaignId(next.world),seed:next.world.campaignSeed});
  next.growthProgress=next.growthTrack?createGrowthProgressState({campaignId:campaignId(next.world),campaignSeed:next.world.campaignSeed,growthTrack:next.growthTrack}):null;
  next.runtimeExtensionMigration={from:'ROUND_04_RUNTIME_V2',to:'ROUND_05_RUNTIME_V2'};
  next.citySettlement=null;
  next.citySettlementPendingEconomy=null;
  next.recruitment=null;next.externalRecruitCandidates=null;next.recruitmentContracts=null;
  next.combatConditions=createCombatConditionLedger({battleId:next.combat.battleId,startGlobalTick:next.committedGlobalTick});
  next.conditionLedgerMigration={from:'ROUND_04_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false};
  initializeEmptyDetachmentExtension(next,'ROUND_04_RUNTIME_V2');
  initializeEmptyG21TacticExtension(next,'ROUND_04_RUNTIME_V2');
  initializeMovementSlowExtension(next,'ROUND_04_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_04_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,null,null);
  if(next.lastCommit){next.lastCommit.opportunityDecisions=[];next.lastCommit.growthResults=[];next.lastCommit.citySettlementResults=[];}
  recoverPostBattleOpportunities(next);
  validateFirst3Runtime(next,{losRules,inputs});
  return next;
}

export function migrateFirst3RuntimeV2R6Save(serialized,{losRules,inputs,cityEconomy}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress')&&legacy.citySettlement===null&&!legacy.citySettlementPendingEconomy,'FIRST3_RUNTIME_V2_ALREADY_HAS_R6_EXTENSION');
  invariant(cityEconomy,'RUNTIME_CITY_ECONOMY_REQUIRED');
  const next=clone(legacy);
  next.citySettlement=next.world.turnPhase==='PLANNING'&&next.world.time.tick===0?createCitySettlementWorldSnapshot({world:next.world,economy:cityEconomy}):null;
  next.citySettlementPendingEconomy=next.citySettlement?null:clone(cityEconomy);
  if(next.citySettlement)next.world=clone(next.citySettlement.world);
  if(!own(next,'combatConditions')){
    next.combatConditions=createCombatConditionLedger({battleId:next.combat.battleId,startGlobalTick:next.committedGlobalTick});
    next.conditionLedgerMigration={from:'ROUND_05_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false};
  }
  initializeEmptyDetachmentExtension(next,'ROUND_05_RUNTIME_V2');
  initializeEmptyG21TacticExtension(next,'ROUND_05_RUNTIME_V2');
  initializeMovementSlowExtension(next,'ROUND_05_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_05_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  next.citySettlementMigration={from:'ROUND_05_RUNTIME_V2',to:'ROUND_06_RUNTIME_V2'};
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy);
  if(next.lastCommit)next.lastCommit.citySettlementResults=[];
  validateFirst3Runtime(next,{losRules,inputs});
  return next;
}

export function migrateFirst3RuntimeV2R7ConditionSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(!own(legacy,'combatConditions')&&!own(legacy,'conditionLedgerMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R7_CONDITION_LEDGER');
  const next=clone(legacy);
  next.combatConditions=createCombatConditionLedger({battleId:next.combat.battleId,startGlobalTick:next.committedGlobalTick});
  next.conditionLedgerMigration={from:'ROUND_06_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false};
  initializeEmptyDetachmentExtension(next,'ROUND_06_RUNTIME_V2');
  initializeEmptyG21TacticExtension(next,'ROUND_06_RUNTIME_V2');
  initializeMovementSlowExtension(next,'ROUND_06_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_06_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy,next.recruitment);
  validateFirst3Runtime(next,{losRules,inputs});
  return next;
}

export function migrateFirst3RuntimeV2R7DetachmentSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(legacy,'combatConditions')&&own(legacy,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(!own(legacy,'detachmentPreparation')&&!own(legacy,'detachmentCombatRegistration')&&!own(legacy,'detachmentMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R7_DETACHMENT_EXTENSION');
  const next=clone(legacy);
  initializeEmptyDetachmentExtension(next,'ROUND_07_A_RUNTIME_V2');
  initializeEmptyG21TacticExtension(next,'ROUND_07_A_RUNTIME_V2');
  initializeMovementSlowExtension(next,'ROUND_07_A_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_07_A_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy,next.recruitment);
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function migrateFirst3RuntimeV2R7G21TacticSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(legacy,'combatConditions')&&own(legacy,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(own(legacy,'detachmentPreparation')&&own(legacy,'detachmentCombatRegistration')&&own(legacy,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  invariant(!own(legacy,'g21TacticMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R7_G21_TACTIC_EXTENSION');
  const next=clone(legacy);
  initializeEmptyG21TacticExtension(next,'ROUND_07_C1_RUNTIME_V2');
  initializeMovementSlowExtension(next,'ROUND_07_C1_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_07_C1_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy,next.recruitment);
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function migrateFirst3RuntimeV2R8MovementSlowSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(legacy,'combatConditions')&&own(legacy,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(own(legacy,'detachmentPreparation')&&own(legacy,'detachmentCombatRegistration')&&own(legacy,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  invariant(own(legacy,'g21TacticMigration'),'RUNTIME_R7_G21_TACTIC_MIGRATION_REQUIRED');
  invariant(!own(legacy,'movementSlowMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R8_MOVEMENT_SLOW_EXTENSION');
  const next=clone(legacy);
  initializeMovementSlowExtension(next,'ROUND_07_C2_RUNTIME_V2');
  initializeEmptyG03TacticExtension(next,'ROUND_07_C2_RUNTIME_V2');
  initializeEmptyCampaignTerminalExtension(next);
  initializeCommandIntegrityFingerprints(next);
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function migrateFirst3RuntimeV2R8G03TacticSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(legacy,'combatConditions')&&own(legacy,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(own(legacy,'detachmentPreparation')&&own(legacy,'detachmentCombatRegistration')&&own(legacy,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  invariant(own(legacy,'g21TacticMigration'),'RUNTIME_R7_G21_TACTIC_MIGRATION_REQUIRED');
  invariant(own(legacy,'movementSlowMigration'),'RUNTIME_R8_MOVEMENT_SLOW_MIGRATION_REQUIRED');
  invariant(!own(legacy,'g03TacticMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R8_G03_TACTIC_EXTENSION');
  const next=clone(legacy);
  initializeEmptyG03TacticExtension(next,'ROUND_08_MOVE_SLOW_EFFECT_V1');
  initializeEmptyCampaignTerminalExtension(next);
  initializeCommandIntegrityFingerprints(next);
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy,next.recruitment);
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function migrateFirst3RuntimeV2R9TerminalStateSave(serialized,{losRules,inputs}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V2_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V2_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===VERSION,'INVALID_FIRST3_RUNTIME_V2_FORMAT');
  invariant(legacy.strategicAssignments&&legacy.postBattleOpportunities&&own(legacy,'growthProgress'),'RUNTIME_R5_MIGRATION_REQUIRED');
  invariant(own(legacy,'citySettlement')&&(legacy.citySettlement||legacy.citySettlementPendingEconomy||legacy.citySettlementMigration?.from==='RUNTIME_V1'),'RUNTIME_R6_MIGRATION_REQUIRED');
  invariant(own(legacy,'combatConditions')&&own(legacy,'conditionLedgerMigration'),'RUNTIME_R7_CONDITION_MIGRATION_REQUIRED');
  invariant(own(legacy,'detachmentPreparation')&&own(legacy,'detachmentCombatRegistration')&&own(legacy,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  invariant(own(legacy,'g21TacticMigration'),'RUNTIME_R7_G21_TACTIC_MIGRATION_REQUIRED');
  invariant(own(legacy,'movementSlowMigration'),'RUNTIME_R8_MOVEMENT_SLOW_MIGRATION_REQUIRED');
  invariant(own(legacy,'g03TacticMigration'),'RUNTIME_R8_G03_TACTIC_MIGRATION_REQUIRED');
  invariant(!own(legacy,'campaignTerminal')&&!own(legacy,'terminalStateMigration'),'FIRST3_RUNTIME_V2_ALREADY_HAS_R9_TERMINAL_STATE_EXTENSION');
  const next=clone(legacy);
  initializeEmptyCampaignTerminalExtension(next);
  validateFirst3Runtime(next,{losRules,inputs});return next;
}

export function migrateFirst3RuntimeV1Save(serialized,{losRules,inputs,growthPool=null,cityEconomy=null}={}){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_FIRST3_RUNTIME_V1_SAVE_LENGTH');
  let legacy;try{legacy=JSON.parse(serialized);}catch{throw new Error('INVALID_FIRST3_RUNTIME_V1_JSON');}
  invariant(object(legacy)&&legacy.format===FORMAT&&legacy.version===1,'INVALID_FIRST3_RUNTIME_V1_FORMAT');
  const next=clone(legacy);
  next.version=VERSION;
  next.historyLedger=createHistoryLedger({campaignId:campaignId(next.world)});
  next.characterHistory=createCharacterHistoryState({campaignId:campaignId(next.world)});
  next.strategicAssignments=createRuntimeAssignments(next.world);
  next.campaignMapping=campaignMapping(next.world);
  next.postBattleOpportunities=createPostBattleOpportunityState({campaignId:campaignId(next.world),seed:next.world.campaignSeed});
  next.growthTrack=growthPool?createGrowthTrack({campaignId:campaignId(next.world),pool:growthPool,characters:growthCharacters(next.world,growthPool)}):null;
  next.growthProgress=next.growthTrack?createGrowthProgressState({campaignId:campaignId(next.world),campaignSeed:next.world.campaignSeed,growthTrack:next.growthTrack}):null;
  next.growthPoolBinding=growthPool?{poolVersion:growthPool.poolVersion,sourceType:growthPool.sourceType,fixture:growthPool.fixture===true}:null;
  next.citySettlement=cityEconomy&&next.world.turnPhase==='PLANNING'&&next.world.time.tick===0?createCitySettlementWorldSnapshot({world:next.world,economy:cityEconomy}):null;
  next.citySettlementPendingEconomy=cityEconomy&&!next.citySettlement?clone(cityEconomy):null;
  if(next.citySettlement)next.world=clone(next.citySettlement.world);
  next.citySettlementMigration=next.citySettlement?{from:'RUNTIME_V1',to:'ROUND_06_RUNTIME_V2'}:null;
  next.recruitment=null;next.externalRecruitCandidates=null;next.recruitmentContracts=null;
  next.combatConditions=createCombatConditionLedger({battleId:next.combat.battleId,startGlobalTick:next.committedGlobalTick});
  next.conditionLedgerMigration={from:'RUNTIME_V1',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false};
  initializeEmptyDetachmentExtension(next,'RUNTIME_V1');
  initializeEmptyG21TacticExtension(next,'RUNTIME_V1');
  initializeMovementSlowExtension(next,'RUNTIME_V1');
  initializeEmptyG03TacticExtension(next,'RUNTIME_V1');
  initializeEmptyCampaignTerminalExtension(next);
  next.migratedFrom={format:FORMAT,version:1};
  next.runtimeExtensionMigration=null;
  next.integrationSlots=integrationSlots(next.growthTrack,next.citySettlement,next.citySettlementPendingEconomy,null);
  const staged=[];
  for(const commandId of next.commandOrder){
    const command=next.commands[commandId],instance=next.combat.coordinator.actorStates[command.actorRef]?.instances[commandId];
    invariant(command&&instance,'INVALID_FIRST3_RUNTIME_V1_COMMAND');
    staged.push({phase:'START',command,tick:command.issuedGlobalTick});
    if(['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(instance.status))staged.push({phase:'RESULT',command,tick:instance.execution?.tick});
  }
  staged.sort((a,b)=>a.tick-b.tick||(a.phase==='START'?0:1)-(b.phase==='START'?0:1)||a.command.actionInstanceId.localeCompare(b.command.actionInstanceId));
  for(const item of staged){
    const actor=next.world.armies[item.command.actorRef],target=next.world.armies[item.command.targetRef],instance=next.combat.coordinator.actorStates[item.command.actorRef].instances[item.command.actionInstanceId];
    const event=runtimeHistoryEvent(next,item.command,item.phase);
    appendRuntimeHistory(next,event,{actorFactionId:actor.factionId,targetFactionId:item.phase==='RESULT'&&instance.status!=='CANCELLED'?target.factionId:null});
    if(item.phase==='RESULT')next.characterHistory=applyKnownHistoryEvent(next.characterHistory,{ledger:next.historyLedger,factionId:actor.factionId,eventId:event.eventId}).state;
  }
  recoverPostBattleOpportunities(next);
  if(next.lastCommit){
    next.lastCommit.growthResults=[];next.lastCommit.citySettlementResults=[];
    next.lastCommit.opportunityDecisions=[];
    next.lastCommit.historyEventIds=next.historyLedger.eventOrder.filter(eventId=>runtimeHistoryPhase(next.historyLedger.eventsById[eventId])==='RESULT'&&next.historyLedger.eventsById[eventId].globalTick===next.lastCommit.globalTick);
    next.lastCommit.characterHistoryDecisions=next.lastCommit.historyEventIds.map(eventId=>{
      const event=next.historyLedger.eventsById[eventId],actorFactionId=event.factionIds.find(factionId=>next.historyLedger.knowledgeById[historyKnowledgeId(eventId,factionId)]?.revealedFields.includes('actorIds'));
      return clone(next.characterHistory.processedKnowledgeById[historyKnowledgeId(eventId,actorFactionId)].decision);
    });
  }
  validateFirst3Runtime(next,{losRules,inputs});
  return next;
}

export function migrateFirst3V3Save(serialized,{inputs,losRules,growthPool=null,cityEconomy=null}={}){
  const world=importSave(serialized,inputs);
  invariant(world.schemaVersion===SAVE_VERSION,'UNSUPPORTED_MIGRATION_SOURCE');
  return createFirst3Runtime({world,losRules,growthPool,cityEconomy,scenarioMode:'MIGRATED_V3'});
}

export function validateFirst3Runtime(runtime,{losRules,inputs}={}){
  invariant(object(runtime)&&runtime.format===FORMAT&&runtime.version===VERSION,'INVALID_FIRST3_RUNTIME_FORMAT');
  invariant(own(runtime,'campaignTerminal')&&own(runtime,'terminalStateMigration'),'RUNTIME_R9_TERMINAL_STATE_MIGRATION_REQUIRED');
  validateRuntimeStrategicAiState(runtime);
  validateRuntimeIdentityTactics(runtime);
  if(runtime.campaignTerminal!==null)validateCampaignTerminalState(runtime.campaignTerminal);
  validateState(runtime.world);
  if(runtime.campaignTerminal!==null)validateCampaignTerminalWorldApplication(runtime.world,runtime.campaignTerminal);
  else invariant(!own(runtime.world,'campaignTerminalWorld'),'RUNTIME_TERMINAL_WORLD_WITHOUT_SIDECAR');
  if(inputs)importSave(exportSave(runtime.world),inputs);
  const binding=restoreLosSaveBinding(runtime.losBinding,losRules);
  invariant(runtime.staticInputFingerprint!==legacyStaticFingerprint(runtime.world,binding),'RUNTIME_R9_CONTROL_AUTHORITY_MIGRATION_REQUIRED');
  invariant(runtime.staticInputFingerprint===staticFingerprint(runtime.world,binding),'RUNTIME_STATIC_FINGERPRINT_MISMATCH');
  invariant(['FIRST3','I2_TRIAL','MIGRATED_V3'].includes(runtime.scenarioMode),'INVALID_RUNTIME_SCENARIO_MODE');
  invariant(object(runtime.combat),'runtime combat state is required');
  validateCombatCoordinatorState(runtime.combat.coordinator);
  validateBattleDeltaState(runtime.combat.delta);
  validateCombatCalculatorState(runtime.combat.calculator);
  const battleId=runtime.combat.battleId;
  validateCombatConditionLedger(runtime.combatConditions);
  invariant(runtime.combatConditions.battleId===battleId,'RUNTIME_CONDITION_BATTLE_SCOPE_MISMATCH');
  invariant(runtime.combatConditions.cursorGlobalTick<=runtime.committedGlobalTick,'RUNTIME_CONDITION_LEDGER_AHEAD_OF_WORLD');
  invariant([runtime.combat.coordinator.battleId,runtime.combat.delta.battleId,runtime.combat.calculator.battleId].every(value=>value===battleId),'RUNTIME_BATTLE_SCOPE_MISMATCH');
  const armyIds=ids(runtime.world.armies);
  invariant(same(ids(runtime.combat.coordinator.actorStates),armyIds)&&same(ids(runtime.combat.delta.units),armyIds)&&same(ids(runtime.combat.calculator.units),armyIds),'RUNTIME_ARMY_SET_MISMATCH');
  for(const armyId of armyIds){
    const army=runtime.world.armies[armyId],actor=runtime.combat.coordinator.actorStates[armyId],delta=runtime.combat.delta.units[armyId],calculator=runtime.combat.calculator.units[armyId];
    invariant(actor.lifecycleState.stamina.current===army.stamina,`RUNTIME_STAMINA_PROJECTION_MISMATCH:${armyId}`);
    invariant(delta.activePersonnel===army.troopCount&&delta.woundedPersonnel===army.woundedCount&&delta.deadPersonnel===army.deadCount&&delta.morale===army.morale,`RUNTIME_DELTA_PROJECTION_MISMATCH:${armyId}`);
    invariant(calculator.activePersonnel===army.troopCount&&calculator.woundedPersonnel===army.woundedCount&&calculator.deadPersonnel===army.deadCount&&calculator.currentHp===army.hp&&calculator.maxHp===army.maxHp&&calculator.morale===army.morale,`RUNTIME_CALCULATOR_PROJECTION_MISMATCH:${armyId}`);
    invariant(delta.routePending===calculator.routePending,`RUNTIME_ROUTE_PROJECTION_MISMATCH:${armyId}`);
    const tacticCooldowns=army.cooldowns.filter(item=>['ART-G21','ART-G03','ART-G07','ART-G08'].includes(item?.runtimeOwner));
    const expectedTacticCooldown=runtimeTacticCooldownDescriptor(runtime,armyId,runtime.committedGlobalTick);
    invariant(same(tacticCooldowns,expectedTacticCooldown?[expectedTacticCooldown]:[]),`RUNTIME_TACTIC_WORLD_COOLDOWN_MISMATCH:${armyId}`);
    if(delta.control!==null){
      const active=getActiveCombatConditions(runtime.combatConditions,{targetUnitId:armyId,globalTick:runtime.committedGlobalTick,statusKey:'CONFUSION'});
      invariant(active.length===1,`RUNTIME_CONTROL_CONDITION_PROJECTION_MISMATCH:${armyId}`);
    }
  }
  invariant(object(runtime.commands)&&Array.isArray(runtime.commandOrder)&&new Set(runtime.commandOrder).size===runtime.commandOrder.length,'invalid runtime command ledger');
  for(const commandId of runtime.commandOrder){
    const command=runtime.commands[commandId];
    invariant(command&&command.actionInstanceId===commandId,'RUNTIME_COMMAND_KEY_MISMATCH');
    invariant(runtime.combat.coordinator.actorStates[command.actorRef]?.instances[commandId],`RUNTIME_COMMAND_INSTANCE_MISSING:${commandId}`);
    uint(command.issuedGlobalTick,'issuedGlobalTick');uint(command.dueGlobalTick,'dueGlobalTick');
    if(isG21RuntimeCommand(command)){
      invariant(command.issueFingerprint===JSON.stringify({requestId:command.requestId,actorRef:command.actorRef,targetRef:command.targetRef}),`RUNTIME_G21_ISSUE_FINGERPRINT_MISMATCH:${commandId}`);
      invariant(command.dueGlobalTick===command.issuedGlobalTick+G21_CONFUSION_TACTIC_TRIAL.windupTicks&&command.applicationBatchId===`RUNTIME.BATCH.${command.dueGlobalTick}`&&same(command.pathTileIds,[]),`RUNTIME_G21_COMMAND_TIMING_MISMATCH:${commandId}`);
      invariant(runtime.world.armies[command.actorRef]?.commanderId==='G21'&&runtime.world.armies[command.actorRef].troopType===command.g21AdapterAction?.command?.sourceTroopType,`RUNTIME_G21_WORLD_SOURCE_MISMATCH:${commandId}`);
      invariant(command.sourceIntegrityFingerprint===runtimeTacticSourceIntegrityFingerprint(runtime,command),`RUNTIME_G21_SOURCE_INTEGRITY_MISMATCH:${commandId}`);
      g21AdapterState(runtime,command);
      const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[commandId];
      if(instance.status==='RESERVED'){
        invariant(command.g21Result===undefined&&command.g21ControlResolution===undefined,`RUNTIME_G21_EARLY_RESULT:${commandId}`);
        invariant(command.g21AdapterAction.command.traitRank===canonicalG21TraitRank(runtime),`RUNTIME_G21_RESERVED_TRAIT_RANK_MISMATCH:${commandId}`);
      }
      else if(instance.status==='CANCELLED')invariant(command.g21Result?.status==='CANCELLED'&&command.g21ControlResolution===null,`RUNTIME_G21_CANCEL_RESULT_MISMATCH:${commandId}`);
      else{
        invariant(command.g21Result?.status==='COMPLETED'&&command.g21ControlResolution?.status==='WORK_TRIAL'&&typeof command.g21ControlResolution.controlApplied==='boolean',`RUNTIME_G21_RESULT_MISMATCH:${commandId}`);
        invariant(command.g21Result.controlResolution===(command.g21ControlResolution.controlApplied?'SUCCESS':'FAILED'),`RUNTIME_G21_CONTROL_RESULT_MISMATCH:${commandId}`);
      }
      if(command.g21Result!==undefined)invariant(same(command.g21Result,command.g21AdapterAction.output),`RUNTIME_G21_ADAPTER_OUTPUT_MISMATCH:${commandId}`);
    }else if(isG03RuntimeCommand(command)){
      invariant(command.targetRef===null&&command.issueFingerprint===JSON.stringify({requestId:command.requestId,actorRef:command.actorRef,areaTileIds:command.areaTileIds}),`RUNTIME_G03_ISSUE_FINGERPRINT_MISMATCH:${commandId}`);
      invariant(command.dueGlobalTick===command.issuedGlobalTick+G03_SLOW_TACTIC_TRIAL.windupTicks&&command.applicationBatchId===`RUNTIME.BATCH.${command.dueGlobalTick}`&&same(command.pathTileIds,[])&&same(command.areaTileIds,[...command.areaTileIds].sort())&&command.areaTileIds.length>=1&&command.areaTileIds.length<=3,`RUNTIME_G03_COMMAND_TIMING_MISMATCH:${commandId}`);
      invariant(runtime.world.armies[command.actorRef]?.troopType===command.g03AdapterAction?.command?.sourceTroopType,`RUNTIME_G03_WORLD_SOURCE_MISMATCH:${commandId}`);
      invariant(same(command.g03SourceProfile,{sourceUnitId:command.actorRef,sourceOfficerId:'G03',traitId:'UT-G03',traitRank:command.g03AdapterAction.command.traitRank,strategy:command.g03SourceProfile.strategy}),`RUNTIME_G03_SOURCE_PROFILE_MISMATCH:${commandId}`);
      invariant(command.sourceIntegrityFingerprint===runtimeTacticSourceIntegrityFingerprint(runtime,command),`RUNTIME_G03_SOURCE_INTEGRITY_MISMATCH:${commandId}`);
      g03AdapterState(runtime,command);
      const instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[commandId];
      if(instance.status==='RESERVED'){
        invariant(command.g03Result===undefined,`RUNTIME_G03_EARLY_RESULT:${commandId}`);
        invariant(same(command.g03SourceProfile,canonicalG03SourceProfile(runtime,command.actorRef)),`RUNTIME_G03_RESERVED_SOURCE_PROFILE_MISMATCH:${commandId}`);
      }
      else if(instance.status==='CANCELLED')invariant(command.g03Result?.status==='CANCELLED',`RUNTIME_G03_CANCEL_RESULT_MISMATCH:${commandId}`);
      else invariant(instance.status==='RESULTS_MERGED'&&command.g03Result?.status==='COMPLETED'&&command.g03Result.persistentZone===null,`RUNTIME_G03_RESULT_MISMATCH:${commandId}`);
      if(command.g03Result!==undefined)invariant(same(command.g03Result,command.g03AdapterAction.output),`RUNTIME_G03_ADAPTER_OUTPUT_MISMATCH:${commandId}`);
    }else if(isIdentityRuntimeCommand(command))validateRuntimeIdentityCommand(runtime,command);
    else invariant(own(FIRST3_ACTION_DEFINITIONS,command.actionId),`UNSUPPORTED_RUNTIME_COMMAND_RECORD:${command.actionId}`);
  }
  invariant(ids(runtime.commands).length===runtime.commandOrder.length,'UNORDERED_RUNTIME_COMMAND');
  uint(runtime.nextCommandSequence,'nextCommandSequence');
  invariant(runtime.nextCommandSequence>0,'nextCommandSequence must be positive');
  invariant(runtime.committedGlobalTick===getGlobalTick(runtime.world),'RUNTIME_GLOBAL_TICK_MISMATCH');
  invariant(runtime.lastCommit===null||runtime.lastCommit.globalTick===runtime.committedGlobalTick,'RUNTIME_COMMIT_BOUNDARY_MISMATCH');
  validateHistoryLedger(runtime.historyLedger);
  invariant(runtime.historyLedger.campaignId===campaignId(runtime.world),'RUNTIME_HISTORY_CAMPAIGN_MISMATCH');
  validateCharacterHistoryState(runtime.characterHistory);
  invariant(runtime.characterHistory.campaignId===campaignId(runtime.world),'RUNTIME_CHARACTER_HISTORY_CAMPAIGN_MISMATCH');
  validateStrategicAssignmentState(runtime.strategicAssignments);
  invariant(runtime.strategicAssignments.campaignId===campaignId(runtime.world),'RUNTIME_ASSIGNMENT_CAMPAIGN_MISMATCH');
  invariant(same(runtime.campaignMapping,campaignMapping(runtime.world)),'RUNTIME_CAMPAIGN_MAPPING_MISMATCH');
  if(runtime.campaignTerminal!==null)validateTerminalStrategicAssignments(runtime);
  else validateStrategicAssignmentWorldSnapshot(assignmentSnapshot(runtime.world,runtime.strategicAssignments));
  validatePostBattleOpportunityState(runtime.postBattleOpportunities);
  invariant(runtime.postBattleOpportunities.campaignId===campaignId(runtime.world),'RUNTIME_POST_BATTLE_CAMPAIGN_MISMATCH');
  for(const proposal of Object.values(runtime.postBattleOpportunities.proposalsByOpportunityId)){
    invariant(runtime.historyLedger.eventsById[proposal.sourceEventIds[0]]?.actionType==='BATTLE_RESULT',`RUNTIME_POST_BATTLE_SOURCE_MISMATCH:${proposal.opportunityId}`);
  }
  if(runtime.growthTrack){
    validateGrowthTrack(runtime.growthTrack);
    invariant(runtime.growthTrack.campaignId===campaignId(runtime.world),'RUNTIME_GROWTH_CAMPAIGN_MISMATCH');
    invariant(runtime.growthPoolBinding?.poolVersion===runtime.growthTrack.poolVersion,'RUNTIME_GROWTH_POOL_BINDING_MISMATCH');
    validateGrowthProgressState(runtime.growthProgress);
    invariant(runtime.growthProgress.campaignId===runtime.growthTrack.campaignId,'RUNTIME_GROWTH_PROGRESS_CAMPAIGN_MISMATCH');
    invariant(same(ids(runtime.growthProgress.characters),ids(runtime.growthTrack.growthStates)),'RUNTIME_GROWTH_PROGRESS_CHARACTER_MISMATCH');
    for(const characterId of ids(runtime.growthProgress.characters)){
      const progress=runtime.growthProgress.characters[characterId],growth=runtime.growthTrack.growthStates[characterId],officer=runtime.world.officers[characterId];
      invariant(progress.level===growth.level,`RUNTIME_GROWTH_PROGRESS_LEVEL_MISMATCH:${characterId}`);
      invariant(officer?.level===progress.level&&officer.experience===progress.totalXp&&officer.aptitudePoints===growth.aptitudePoints,`RUNTIME_GROWTH_WORLD_PROJECTION_MISMATCH:${characterId}`);
    }
  }else invariant(runtime.growthPoolBinding===null&&runtime.growthProgress===null,'RUNTIME_GROWTH_POOL_WITHOUT_TRACK');
  if(runtime.citySettlement){
    validateCitySettlementWorldSnapshot(runtime.citySettlement);
    invariant(runtime.citySettlementPendingEconomy===null,'RUNTIME_CITY_SETTLEMENT_PENDING_CONFLICT');
    if(runtime.campaignTerminal===null)invariant(same(runtime.world.cities,runtime.citySettlement.world.cities),'RUNTIME_CITY_SETTLEMENT_WORLD_MISMATCH');
    else for(const cityId of ids(runtime.world.cities)){
      const current=clone(runtime.world.cities[cityId]),settled=clone(runtime.citySettlement.world.cities[cityId]);
      for(const key of ['ownerFactionId','governorId','occupationState']){delete current[key];delete settled[key];}
      invariant(same(current,settled),`RUNTIME_TERMINAL_CITY_SETTLEMENT_ECONOMY_MISMATCH:${cityId}`);
    }
    for(const factionId of ids(runtime.world.factions)){
      const current=runtime.world.factions[factionId],settled=runtime.citySettlement.world.factions[factionId];
      invariant(settled&&current.science===settled.science&&current.prestige===settled.prestige,`RUNTIME_CITY_SETTLEMENT_FACTION_MISMATCH:${factionId}`);
    }
  }else if(runtime.citySettlementPendingEconomy){deriveCityTurnEconomy(runtime.world,ids(runtime.world.cities)[0],runtime.citySettlementPendingEconomy);}
  else invariant(runtime.citySettlementPendingEconomy===null||runtime.citySettlementPendingEconomy===undefined,'INVALID_RUNTIME_CITY_SETTLEMENT_PENDING');
  if(runtime.recruitment){
    validateRecruitmentWorldSnapshot(runtime.recruitment);validateExternalRecruitCandidates(runtime.externalRecruitCandidates);
    invariant(runtime.recruitmentContracts?.officerContract?.officerId==='G21'&&runtime.recruitmentContracts?.growthContract?.characterId==='G21','INVALID_RUNTIME_RECRUITMENT_CONTRACTS');
    for(const factionId of ids(runtime.world.factions))invariant(runtime.recruitment.recruitment.factions[factionId].prestige===runtime.world.factions[factionId].prestige,`RUNTIME_RECRUITMENT_PRESTIGE_MISMATCH:${factionId}`);
  }else invariant(runtime.externalRecruitCandidates===null||runtime.externalRecruitCandidates===undefined,'RUNTIME_EXTERNAL_RECRUIT_WITHOUT_LEDGER');
  invariant(own(runtime,'detachmentPreparation')&&own(runtime,'detachmentCombatRegistration')&&own(runtime,'detachmentMigration'),'RUNTIME_R7_DETACHMENT_MIGRATION_REQUIRED');
  if(runtime.detachmentPreparation===null)invariant(runtime.detachmentCombatRegistration===null,'RUNTIME_DETACHMENT_RECEIPT_WITHOUT_SIDECAR');
  else{
    validateDetachmentPreparationSnapshot(runtime.detachmentPreparation);
    invariant(runtime.detachmentPreparation.currentGlobalTick<=runtime.committedGlobalTick,'RUNTIME_DETACHMENT_SIDECAR_AHEAD_OF_WORLD');
    const preparation=runtime.detachmentPreparation.preparation;
    invariant(preparation,'RUNTIME_DETACHMENT_EMPTY_SIDECAR');
    if(preparation.status==='COMPLETED'){
      invariant(object(runtime.detachmentCombatRegistration),'RUNTIME_DETACHMENT_COMBAT_RECEIPT_REQUIRED');
      const expected=deriveWorldArmyCombatRegistration({world:runtime.detachmentPreparation.world,combat:runtime.combat,armyId:preparation.newArmyId});
      invariant(same(runtime.detachmentCombatRegistration,expected),'RUNTIME_DETACHMENT_COMBAT_RECEIPT_MISMATCH');
    }else invariant(runtime.detachmentCombatRegistration===null,'RUNTIME_DETACHMENT_EARLY_COMBAT_RECEIPT');
  }
  invariant(runtime.migratedFrom===null||same(runtime.migratedFrom,{format:FORMAT,version:1}),'INVALID_RUNTIME_MIGRATION_SOURCE');
  invariant(runtime.runtimeExtensionMigration===null||same(runtime.runtimeExtensionMigration,{from:'ROUND_04_RUNTIME_V2',to:'ROUND_05_RUNTIME_V2'}),'INVALID_RUNTIME_EXTENSION_MIGRATION');
  invariant(runtime.citySettlementMigration===undefined||runtime.citySettlementMigration===null||same(runtime.citySettlementMigration,{from:'ROUND_05_RUNTIME_V2',to:'ROUND_06_RUNTIME_V2'})||same(runtime.citySettlementMigration,{from:'RUNTIME_V1',to:'ROUND_06_RUNTIME_V2'}),'INVALID_RUNTIME_CITY_SETTLEMENT_MIGRATION');
  invariant(runtime.conditionLedgerMigration===null||[
    {from:'ROUND_04_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false},
    {from:'ROUND_05_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false},
    {from:'ROUND_06_RUNTIME_V2',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false},
    {from:'RUNTIME_V1',to:'ROUND_07_CONDITION_LEDGER_V1',statusesInferred:false},
  ].some(value=>same(runtime.conditionLedgerMigration,value)),'INVALID_RUNTIME_CONDITION_LEDGER_MIGRATION');
  invariant(runtime.detachmentMigration===null||[
    'ROUND_04_RUNTIME_V2','ROUND_05_RUNTIME_V2','ROUND_06_RUNTIME_V2','ROUND_07_A_RUNTIME_V2','RUNTIME_V1',
  ].some(from=>same(runtime.detachmentMigration,{from,to:'ROUND_07_C1_DETACHMENT_V1',preparationInferred:false})),'INVALID_RUNTIME_DETACHMENT_MIGRATION');
  invariant(own(runtime,'g21TacticMigration'),'RUNTIME_R7_G21_TACTIC_MIGRATION_REQUIRED');
  invariant(runtime.g21TacticMigration===null||[
    'ROUND_04_RUNTIME_V2','ROUND_05_RUNTIME_V2','ROUND_06_RUNTIME_V2','ROUND_07_A_RUNTIME_V2','ROUND_07_C1_RUNTIME_V2','RUNTIME_V1',
  ].some(from=>same(runtime.g21TacticMigration,{from,to:'ROUND_07_C2_G21_TACTIC_V1',commandsInferred:false,resolutionsInferred:false})),'INVALID_RUNTIME_G21_TACTIC_MIGRATION');
  invariant(own(runtime,'movementSlowMigration'),'RUNTIME_R8_MOVEMENT_SLOW_MIGRATION_REQUIRED');
  invariant(runtime.movementSlowMigration===null||[
    'ROUND_04_RUNTIME_V2','ROUND_05_RUNTIME_V2','ROUND_06_RUNTIME_V2','ROUND_07_A_RUNTIME_V2','ROUND_07_C1_RUNTIME_V2','ROUND_07_C2_RUNTIME_V2','RUNTIME_V1',
  ].some(from=>same(runtime.movementSlowMigration,{from,to:'ROUND_08_MOVE_SLOW_EFFECT_V1',movementMagnitudesInferred:false,legacySlowAffectsMovement:false})),'INVALID_RUNTIME_MOVEMENT_SLOW_MIGRATION');
  invariant(own(runtime,'g03TacticMigration'),'RUNTIME_R8_G03_TACTIC_MIGRATION_REQUIRED');
  invariant(runtime.g03TacticMigration===null||[
    'ROUND_04_RUNTIME_V2','ROUND_05_RUNTIME_V2','ROUND_06_RUNTIME_V2','ROUND_07_A_RUNTIME_V2','ROUND_07_C1_RUNTIME_V2','ROUND_07_C2_RUNTIME_V2','ROUND_08_MOVE_SLOW_EFFECT_V1','RUNTIME_V1',
  ].some(from=>same(runtime.g03TacticMigration,{from,to:'ROUND_08_G03_TACTIC_V1',commandsInferred:false,resolutionsInferred:false})),'INVALID_RUNTIME_G03_TACTIC_MIGRATION');
  invariant(runtime.terminalStateMigration===null||same(runtime.terminalStateMigration,{from:'ROUND_08_G03_TACTIC_V1',to:'ROUND_09_TERMINAL_STATE_V1',terminalEventsInferred:false}),'INVALID_RUNTIME_TERMINAL_STATE_MIGRATION');
  const expectedRuntimeEvents=new Set();
  for(const commandId of runtime.commandOrder){
    const command=runtime.commands[commandId],instance=runtime.combat.coordinator.actorStates[command.actorRef].instances[commandId];
    const startId=historyEventId('START',commandId),start=runtime.historyLedger.eventsById[startId];
    invariant(start&&start.globalTick===command.issuedGlobalTick&&start.causeEventIds.length===0,`RUNTIME_HISTORY_START_MISMATCH:${commandId}`);
    const actor=runtime.world.armies[command.actorRef],g03=isG03RuntimeCommand(command),identity=isIdentityRuntimeCommand(command),target=g03||identity?null:runtime.world.armies[command.targetRef];
    const startActorKnowledge=runtime.historyLedger.knowledgeById[historyKnowledgeId(startId,actor.factionId)];
    invariant(startActorKnowledge&&!startActorKnowledge.revealedFields.includes('targetIds'),`RUNTIME_HISTORY_START_KNOWLEDGE_MISMATCH:${commandId}`);
    if(!g03&&!identity)invariant(!runtime.historyLedger.knowledgeById[historyKnowledgeId(startId,target.factionId)],`RUNTIME_HISTORY_START_TARGET_LEAK:${commandId}`);
    expectedRuntimeEvents.add(startId);
    const finished=['CANCELLED','RESOLVED','RESULTS_MERGED','SETTLED'].includes(instance.status),resultId=historyEventId('RESULT',commandId),result=runtime.historyLedger.eventsById[resultId];
    invariant(finished===Boolean(result),`RUNTIME_HISTORY_RESULT_MISMATCH:${commandId}`);
    if(result){
      invariant(result.globalTick===instance.execution.tick&&same(result.causeEventIds,[startId]),`RUNTIME_HISTORY_CAUSE_MISMATCH:${commandId}`);
      const actorKnowledge=runtime.historyLedger.knowledgeById[historyKnowledgeId(resultId,actor.factionId)];
      invariant(actorKnowledge&&!actorKnowledge.revealedFields.includes('targetIds'),`RUNTIME_HISTORY_ACTOR_KNOWLEDGE_MISMATCH:${commandId}`);
      const derived=runtime.characterHistory.processedKnowledgeById[actorKnowledge.knowledgeId]?.decision;
      invariant(derived&&derived.eventId===resultId&&Array.isArray(derived.rewards)&&derived.rewards.length===0&&Array.isArray(derived.statModifiers)&&derived.statModifiers.length===0&&derived.xp===0,`RUNTIME_CHARACTER_HISTORY_DERIVATION_MISMATCH:${commandId}`);
      const targetFactionIds=identity?[]:g03?[...new Set((command.g03Result?.targetResults??[]).map(item=>runtime.world.armies[item.targetUnitId]?.factionId).filter(Boolean))]:[target.factionId];
      for(const targetFactionId of targetFactionIds){
        const targetKnowledge=runtime.historyLedger.knowledgeById[historyKnowledgeId(resultId,targetFactionId)];
        if(instance.status==='CANCELLED')invariant(!targetKnowledge,`RUNTIME_HISTORY_CANCEL_TARGET_LEAK:${commandId}`);
        else if(targetFactionId!==actor.factionId){
          invariant(targetKnowledge&&!targetKnowledge.revealedFields.includes('actorIds'),`RUNTIME_HISTORY_TARGET_KNOWLEDGE_MISMATCH:${commandId}`);
          if(g03)invariant(!targetKnowledge.revealedFields.includes('targetIds')&&!targetKnowledge.revealedFields.includes('factionIds'),`RUNTIME_G03_MULTI_TARGET_KNOWLEDGE_LEAK:${commandId}`);
        }
      }
      expectedRuntimeEvents.add(resultId);
    }
  }
  for(const eventId of runtime.historyLedger.eventOrder)if(runtime.historyLedger.eventsById[eventId].producer==='FIRST3_RUNTIME')invariant(expectedRuntimeEvents.has(eventId),`UNCLAIMED_RUNTIME_HISTORY_EVENT:${eventId}`);
  const knownCharacterSourceEvents=new Set(expectedRuntimeEvents);
  for(const assignment of Object.values(runtime.strategicAssignments.assignments)){
    const start=runtime.historyLedger.eventsById[assignment.sourceEventId];
    invariant(start?.actionType===`ASSIGNMENT_${assignment.type}_STARTED`&&start.globalTick===assignment.startedGlobalTick,`RUNTIME_ASSIGNMENT_START_HISTORY_MISMATCH:${assignment.assignmentId}`);
    if(assignment.type==='FIELD_INSPECTION')invariant(start.causeEventIds.includes(assignment.causeEventId)&&runtime.historyLedger.eventsById[assignment.causeEventId]?.actionType==='BATTLE_RESULT',`RUNTIME_FIELD_INSPECTION_CAUSE_MISMATCH:${assignment.assignmentId}`);
    knownCharacterSourceEvents.add(start.eventId);
    if(['COMPLETED_RECORDED','FAILED_RECORDED'].includes(assignment.status)){
      const result=runtime.historyLedger.eventsById[assignment.resultEventId];
      const suffix=assignment.status==='COMPLETED_RECORDED'?'COMPLETED':'FAILED';
      invariant(result?.actionType===`ASSIGNMENT_${assignment.type}_${suffix}`&&same(result.causeEventIds,[assignment.sourceEventId]),`RUNTIME_ASSIGNMENT_RESULT_HISTORY_MISMATCH:${assignment.assignmentId}`);
      knownCharacterSourceEvents.add(result.eventId);
    }else invariant(assignment.resultEventId===null,`RUNTIME_ASSIGNMENT_EARLY_RESULT:${assignment.assignmentId}`);
  }
  const characterSourceActions=['BATTLE_RESULT','ASSIGNMENT_TRAINING_COMPLETED','ASSIGNMENT_FIELD_INSPECTION_COMPLETED'];
  for(const memory of Object.values(runtime.characterHistory.memoriesById))for(const eventId of memory.sourceEventIds)invariant(knownCharacterSourceEvents.has(eventId)&&characterSourceActions.includes(runtime.historyLedger.eventsById[eventId]?.actionType),`RUNTIME_MEMORY_SOURCE_MISMATCH:${memory.memoryId}:${eventId}`);
  for(const trace of Object.values(runtime.characterHistory.tracesById))for(const eventId of trace.sourceEventIds)invariant(knownCharacterSourceEvents.has(eventId)&&characterSourceActions.includes(runtime.historyLedger.eventsById[eventId]?.actionType),`RUNTIME_TRACE_SOURCE_MISMATCH:${trace.traceId}:${eventId}`);
  invariant(same(runtime.integrationSlots,integrationSlots(runtime.growthTrack,runtime.citySettlement,runtime.citySettlementPendingEconomy,runtime.recruitment)),'INVALID_RUNTIME_INTEGRATION_SLOTS');
  return true;
}

