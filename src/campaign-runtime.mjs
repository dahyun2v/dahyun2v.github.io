import {engineOrderRecipients} from './campaign-engines.mjs';
import {configureSample4,sample4Pass,sample4PassTargets} from './campaign-rule-registry.mjs';
import {resolveForcedArrival,engineDamageRows,engineBaseDamage,engineShotLine,engineStructureLine,engineStructureDamage} from './campaign-combat.mjs';
import {initializeEngines,validateEngines,enginesEnabled,engineView,engineEvent,discardLegacyClasses,configureEngines,engineActions,resolveEngineAction,engineMapView,engineStructureTargets,resolveStructureAttack,engineBeforeMove,engineAiHold,engineMovementWorld} from './campaign-engines.mjs';
import {configureStratagems,validateStratagems,STRATAGEMS,resolveStratagem,aiStratagem,settleStratagems,stratagemOptions,stratagemLabel} from './campaign-stratagems.mjs';
import {validateEngineGaps,reservesInTransit,gapsEnabled,gapsView,transferReserves,settleReserveTransfers,aiTransferReserves,swapArmies,swapReason,finishHistory,varyWanderers} from './campaign-engine-gaps.mjs';
import {configureRunModifiers,initializeRunModifiers,rememberRewindStart,carryRewindStart,rewindTurn,offerBlessing,chooseBlessing,finishBlessingPlayerTurn,startRunModifierTurn,runModifiersView,validateRunModifiers} from './campaign-run-modifiers.mjs';
import C195 from '../data/c195-trial-v0.1.json' with {type:'json'};
import {initializeSituations,validateSituations,markSituationLine} from './campaign-situations.mjs';
import {specialReserves} from './campaign-special-troops.mjs';
import {campaignReinforcementForecast,observeExistingMigration,validateDomesticCanon} from './campaign-economy.mjs';
import {initializeEventDeck,applyDeckEffects} from './campaign-event-deck.mjs';
import {settleCampaignOaths,observeCampaignOaths} from './campaign-oaths.mjs';
import {initializeCampaignAmbitions,initializeUnlockedOfficers,restoreCampaignAmbitions,startAmbitionTurn,chooseAmbition,chooseOrder,finishAmbitionPlayerTurn,ambitionStep,settleOrders,ambitionsView,ambitionResultView,applyOrderReroll,validateAmbitions} from './campaign-ambitions.mjs';
import {campaignAchievementsView,chooseAchievement,settleAchievements} from './campaign-achievements.mjs';
import {C182,initializeCombatFire,advanceCombatFire,combatFireAt,combatWind,validateCombatFire} from './campaign-rule-registry.mjs';
import {startCombatFire} from './campaign-combat.mjs';
import {troopDelta} from './troop-display.mjs';
import {configureAiTactics,campaignTacticsEnabled,campaignTacticsPart,campaignTacticalOrderAllowed,campaignTacticsView,campaignTacticsWorld,campaignFocusOrder,campaignChooseTacticalAction} from './campaign-ai-tactics.mjs';
import {campaignPlatformAiAction,campaignAiRule,campaignAiLaunch,campaignAiRecordBlocked,campaignAiExchange,campaignAiExchangeAllowed,campaignAiPosture} from './campaign-ai-rules.mjs';
import diplomacyAxes from '../../docs/design-data/diplomacy-axes-v0.1.json' with {type:'json'};
import {councilOpinionView,initializeCouncil,startCouncilTurn,councilCommand,closeCouncil,observeCouncil,validateCouncil} from './campaign-council.mjs';
import {initializeInjury,validateInjury,settleInjury,injuryView,injuryRecent,injuryReason,injuryEnabled} from './campaign-injury.mjs';
import {initializeFatigue,validateFatigue,settleFatigue,fatigueView,recordFatigueReturns} from './campaign-fatigue.mjs';
import {supplyMax,configureSupply,initializeSupply,supplyEnabled,supplyView,supplyLink,supplyHubsView,beginHub,captureHubs,supplyAiAction,clockFood} from './campaign-supply.mjs';
import {domesticEngineEnabled,domesticEngineView,validateDomesticEngine,CITY_POLICIES,clearDomesticOfficer,facilitySite,cityInfluence} from './campaign-domestic.mjs';
import {assignCityDepartment,transferCityOfficer,settleOfficerTransfers} from './campaign-roster.mjs';
import {reserveCityJob,configureDomesticProduction,facilityTiles,campaignLedgerFoodNeed,securityLabel} from './campaign-economy.mjs';
import {configureDiplomacy,initializeDiplomacy,validateDiplomacy,diplomacyEnabled,diplomacyView,diplomacyCommand,startDiplomacyTurn,startDiplomacyAi,finishDiplomacyPlayerTurn,rememberDiplomacyCombat,diplomacyMoveReason,withdrawalProtection,diplomacyArmyHostile,diplomacyHostile as diplomacyArmyHostileFaction} from './campaign-diplomacy.mjs';
import {initializeExploration,validateExploration,rememberExploration,settleExploration,explorationEnabled,explorationView,chooseExploration,resolveAiExploration} from './campaign-exploration.mjs';
import {initializeDejaVu,validateDejaVu,checkDejaVuLocations,dejaVuView,dejaVuEnabled} from './campaign-deja-vu.mjs';
import {startRelationScene,relationSceneView,settleRelationCaptiveReleases,initializeRelations,validateRelations,relationsView,socialCommand,settleRelationMonth,aiRelationFeast} from './campaign-relations.mjs';
import {campaignBannerView,campaignShownScale,campaignShownCount,uniqueProgress} from './campaign-rule-registry.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {campaignOfficerPack} from './campaign-officers-51-100.mjs';
import {applyOfficerDraft} from './campaign-officer-draft.mjs';
import {officerFromPack} from './campaign-roster.mjs';
import {c34Wait,c34KnownTraits} from './campaign-c34.mjs';
import {healCampaignTroops} from './campaign-effects.mjs';
import {attackDirection} from './campaign-abilities.mjs';
import {c33Tax,c33TaxReason,c33Owned,c33FormationCard} from './campaign-rule-registry.mjs';
import {settleC31,c31View,validateC31,c31Sync,c31Muster} from './campaign-events.mjs';
import {initializeC30,c30Start,c30View} from './campaign-c29.mjs';
import {c29Bind,c29Record,c29Hidden,c29Aw} from './campaign-c29.mjs';
import {configureRosterDomestic} from './campaign-roster.mjs';
import {uniqueRevealedWanderers} from './campaign-rule-registry.mjs';
import {startUniqueFaction} from './campaign-combat.mjs';
import {domesticCommands,domesticCommand,domesticMusterReason,domesticGranaryView,initializeDomestic,combatRule,combatCanPostMove,combatRival,combatMoveAllowed,combatMovement} from './campaign-rule-registry.mjs';
import {cityJobCost} from './campaign-economy.mjs';
import {cityRecruitCost,cityRecruitQuote} from './campaign-policy.mjs';
import {C217,parentTroop,troopInfo,validateSpecialTroops,c24Enabled,platformState,initializePlatforms} from './campaign-special-troops.mjs';
import {archerAttackReason} from './campaign-abilities.mjs';
import {initializeCampaignEvents,validateCampaignEvents,startFactionEvents,settleCampaignEvents,chooseCampaignEvent,resolveAiEvent,queueCrisisCard,campaignEventsView,c22TargetWeight} from './campaign-events.mjs';
import {specialistView,validateSpecialists} from './campaign-economy.mjs';
import {C20_FACILITIES,validateCampaignPolicy,initializeCampaignPolicy,startFactionPolicy,campaignPolicyView,useStarAction,aiStarAction,starAction} from './campaign-policy.mjs';
import {adoptWanderer,sortie,migrateArmyStructure,validateCampaignResearch,cityDurabilityMaximum,campaignResearchView,initializeCampaignRoster,musterTroopOptions,freeCityOfficers,garrisonArmy,initializeCityStart,recruitWanderer,selectAiRoster,selectCityStartMuster} from './campaign-roster.mjs';
import {C12,initializeCampaignAbilities,initializeArmyFacing,directionToward,campaignSubAbility,changeFormation,turnFacing} from './campaign-abilities.mjs';
import {assignGroupDestinations,orderRoute,orderSegment,orderEligible,requireOrderPath} from './campaign-orders.mjs';
import {initializeCampaignEffects,startFactionEffects,settleEffects,campaignTactics,tacticIsDamage,unitStatuses,consumeMainAction,canMainAction,finishFactionRules,hasCampaignRule,recallReason,recallDestination,ambushHidden,commonTacticAiUseful,repairCityActionReason,platformActionReason} from './campaign-effects.mjs';
import {campaignReachable,campaignPath,inControlZone,gateMorale,startFactionMorale,settleMorale,regroupReason,changeMorale,moraleDropChance,checkMorale,nearbyMorale} from './campaign-morale.mjs';
import {initializeCampaignCastles,refreshCampaignSieges as refreshBaseSieges,castleArmyActive,campaignMovementWorld,campaignCenterEntryAllowed,moveCampaignOneTick,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {campaignScenario,campaignFingerprint,campaignMapData} from './campaign-scenario.mjs';
import initialData from '../../docs/design-data/first3-initial-state-v1.json' with {type: 'json'};
import {createWorldState, selectPlayerFaction, validateState,
  TICKS_PER_TURN, DAYS_PER_TURN} from './first3.mjs';
import {getFactionView} from './knowledge.mjs';
import {updateCampaignKnowledge as updateKnowledge} from './campaign-vision.mjs';
import {tileId,hexDistance} from './map-primitives.mjs';
import {edgeTicks,findPath,issueOrder} from './movement.mjs';
import {selectCampaignAiJobs,campaignAiPlan,campaignAiMusterTroop,campaignSiegeEnabled,campaignStrategyEnabled,campaignAiSupplyWorld,campaignEconomyEnabled,campaignFoodEconomyEnabled,campaignKnownRanking} from './campaign-strategic-bridge.mjs';
import {disengageOptions,disengageReason,resolveDisengage,tacticFailureReason,attackRange,previewCityAttack,previewDisengage,previewApproachFire,cityAttackTargets,resolveOverwatch,resolveTactic,resolveCityAttack,strikeCampaignCities,recoverCampaignCities,attackTargets,previewTactic,previewAttackThreat,previewAttack,resolveAttack,resolvePursuit,resolveApproachFire,approachFireStart,armyActionEnded,allPlayerActionsEnded} from './campaign-combat.mjs';
import {applyCampaignVision} from './campaign-vision.mjs';
import {campaignPersonnel,settleCampaignPayloads,settleCampaignTurnEnd} from './campaign-result-bridge.mjs';
import {validatePersonnelLedger} from './military-personnel-ledger.mjs';
import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';
import {validateCampaignTerminalWorldApplication} from './campaign-terminal-world-application.mjs';
import {initializeCampaignEconomy,settleCampaignEconomy,selectCityJob,facilityDisabled,cityEconomyRates,cityJobList,completeJob,legacyGovernorValidationView} from './campaign-economy.mjs';
import {campaignGrowthForSave,restoreCampaignGrowth,initializeCampaignGrowth,validateCampaignGrowth,pendingCampaignDraft,applyCampaignDraftCommand,resolveCampaignAiDrafts,campaignOfficerGrowth,applyTacticLoadout,tacticLoadoutReason} from './campaign-growth.mjs';

import {initializeCampaignOccupation,occupationDisplay,selectOccupationMethod,selectAiOccupations,selectCampaignGovernor} from './campaign-occupation.mjs';
import {configureCaptivePreview,initializeCampaignCaptives,campaignCaptives,selectCaptiveAction,settleCampaignCaptives,validateCampaignAdministration} from './campaign-captives.mjs';

configureDiplomacy({movementWorld:campaignMovementWorld,armyActive:castleArmyActive,subAbility:campaignSubAbility,movement:combatMovement,cityRates:cityEconomyRates,shownCount:campaignShownCount});
configureDomesticProduction(selectCampaignAiJobs);
configureSample4({orders:engineOrderRecipients,hidden:ambushHidden,heal:healCampaignTroops,attackPower:(s,id)=>sample4PublicAttacks(s,id)[0]?.loss??0});
configureEngines({swapLegal:(s,id,other)=>{const a=s.armies[id],b=s.armies[other];return edgeTicks(s,a,a.tileId,b.tileId)!==null&&edgeTicks(s,b,b.tileId,a.tileId)!==null;},active:castleArmyActive,hostile:diplomacyArmyHostile,canAct:canMainAction,consume:consumeMainAction,targets:attackTargets,attack:resolveAttack,formation:changeFormation,morale:changeMorale,moraleDropChance,checkMorale,nearbyMorale,collapseWeight:C12.collapseMorale,side:attackDirection,direction:directionToward,hidden:ambushHidden,hostileFaction:diplomacyArmyHostileFaction,supply:supplyLink,heal:healCampaignTroops,fireAt:combatFireAt,damage:engineDamageRows,baseDamage:engineBaseDamage,shotLine:engineShotLine,archerReason:archerAttackReason,structureLine:engineStructureLine,structureDamage:engineStructureDamage,remainingReachable:(s,id,budget)=>[...campaignReachable(s,id,budget)].map(([at])=>at),reachable:(s,id,budget)=>[...campaignReachable(s,id,budget)].filter(([,route])=>route.pathTileIds.length<=3).map(([at])=>at),move:(s,id,to)=>moveArmy(s,{type:"MOVE",armyId:id,destinationTileId:to},s.armies[id].factionId),fire:(s,id,tiles)=>{s.c27??={counts:{}};s.c27.fires??=[];s.c27.fires.push({source:id,tiles,until:s.turn+C182.fire.turns-1});initializeCombatFire(s);}});

configureCaptivePreview({afterCommand:rememberDiplomacyCombat,diplomacyView:(s,f)=>diplomacyEnabled(s)?diplomacyView(s,f):null});
configureSupply({active:castleArmyActive,movement:(s,id)=>engineMovementWorld(s,id,{...s,armies:{...s.armies,[id]:{...s.armies[id],troopType:parentTroop(s.armies[id].troopType)}}}),morale:checkMorale,canWin:(s,id)=>attackTargets(s,id).some(t=>previewAttack(s,id,t).enemyLoss>=s.armies[t].troopCount)||cityAttackTargets(s,id).some(c=>previewCityAttack(s,id,c).dealt>=s.cities[c].durability)});

// 지금은 26턴, 나중에 늘림.
configureStratagems({supplyWorld:campaignAiSupplyWorld});
configureAiTactics({publicView:getFactionView,banner:campaignBannerView,hostile:diplomacyArmyHostileFaction,withdrawal:withdrawalProtection,active:castleArmyActive,movement:combatMovement,personnel:campaignPersonnel,parent:parentTroop,reachable:campaignReachable,supplyEnabled,supplyLink,attackTargets,cityTargets:cityAttackTargets,canAct:canMainAction,tactics:campaignTactics,useful:commonTacticAiUseful,previewAttack,previewTactic,previewCity:previewCityAttack,disengage:previewDisengage,approach:previewApproachFire,direction:directionToward,side:attackDirection,attackRange,threat:previewAttackThreat});

configureRunModifiers({adoptWanderer,facilityTiles,supplyMax,updateKnowledge});
export const CAMPAIGN_TURN_LIMIT = 26;
export const CAMPAIGN_SAVE_KEY = 'sangoku-campaign-save-v1';
const FORMAT = 'sangoku-campaign';
const VERSION = 1;
const initialCityNames = () => Object.fromEntries(Object.values(initialData.world.cities).map(c =>
  [c.cityId, {F01:'허창', F02:'성도', F03:'건업'}[c.ownerFactionId] ?? c.name]));

export function campaignTurnLimitRanking(s){
  return Object.values(s.factions).filter(f=>f.alive).map(f=>{
    // Legacy v1 result shape stays readable; v2 ranks major, minor, then troops.
    const cities=Object.values(s.cities).filter(c=>c.ownerFactionId===f.factionId);
    return {factionId:f.factionId,...(s.mapId!=='v1'?{majorCities:cities.filter(c=>c.kind==='major').length,minorCities:cities.filter(c=>c.kind==='minor').length}:{cities:cities.length}),troops:Object.values(s.armies).filter(a=>a.factionId===f.factionId&&active(s,a.armyId)).reduce((n,a)=>n+a.troopCount,0)+cities.reduce((n,c)=>n+cityReadyTotal(s,c),0)+reservesInTransit(s,f.factionId)};
  }).sort((a,b)=>(b.majorCities??b.cities)-(a.majorCities??a.cities)||(b.minorCities??0)-(a.minorCities??0)||b.troops-a.troops||a.factionId.localeCompare(b.factionId));
}
// C148: result-only readout. Tombstones retain historical counts; woundedCount
// and city woundedTroops describe overlapping personnel, so use city totals once.
const cityReadyTotal=(s,c)=>(c.reserveTroops??0)+Object.values(specialReserves(s,c)).reduce((n,count)=>n+count,0);
export function campaignTroopBreakdown(s,factionId){
 const cities=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId);
 const field=Object.values(s.armies).filter(a=>a.factionId===factionId&&active(s,a.armyId)).reduce((n,a)=>n+a.troopCount,0);
 const reserve=cities.reduce((n,c)=>n+cityReadyTotal(s,c),0)+reservesInTransit(s,factionId),wounded=cities.reduce((n,c)=>n+(c.woundedTroops??0),0);
 return {field,reserve,wounded,total:field+reserve+wounded};
}
function validate(state) {
  validateStratagems(state);
  validateEngineGaps(state);
  validateRunModifiers(state);
  validateSituations(state);
  validateAmbitions(state);
  for(const f of Object.values(state?.factions??{}))if(f.startCapitalCityId!==undefined&&(typeof f.startCapitalCityId!=='string'||!state.cities[f.startCapitalCityId]))throw new Error('INVALID_CAMPAIGN_STARTING_CAPITAL');
  if(state.trialRules?.foodModel&&!['clock','upkeep','cheap'].includes(state.trialRules.foodModel))throw new Error('INVALID_FOOD_MODEL');
  if(state?.manualEndTurn!==undefined&&typeof state.manualEndTurn!=='boolean')throw new Error('INVALID_CAMPAIGN_MANUAL_END_TURN');
  if (!state || !Number.isSafeInteger(state.turn) || state.turn < 1 ||
      state.turn !== state.turnNumber ||
      state.globalTick !== (state.turn - 1) * TICKS_PER_TURN + state.time?.tick ||
      !Number.isSafeInteger(state.globalTick) ||
      state.contentFingerprint !== campaignFingerprint(state.mapId??'v1') || !state.playerFactionId) {
    throw new Error('캠페인 상태 또는 턴 경계가 올바르지 않습니다.');
  }
  if(state.mapId!=='v1')for(const spec of campaignMapData(state.mapId).cities){
    const c=state.cities?.[spec.id];
    if(!c||c.kind!==spec.kind||c.tileId!==spec.at.join(',')||c.durabilityMax!==cityDurabilityMaximum(state,c)||!Number.isSafeInteger(c.durability)||c.durability<0||c.durability>c.durabilityMax||c.kind==='minor'&&c.facilities?.some(f=>!['granary','market','workshop',...Object.keys(C20_FACILITIES)].includes(f.kind)))throw new Error(`INVALID_CAMPAIGN_${state.mapId.toUpperCase()}_CITY`);
  }
  const terminalOptions={allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true};
  const legacy=legacyGovernorValidationView(state);
  if(legacy.gameResult?.history){legacy.gameResult={...legacy.gameResult};delete legacy.gameResult.history;}
  // The turn limit is a campaign result; FIRST3's terminal sidecar keeps its original schema.
  if(state.gameResult?.type==='TURN_LIMIT'){
    const r=state.gameResult,ranking=campaignTurnLimitRanking(state);
    if(state.globalTick!==CAMPAIGN_TURN_LIMIT*TICKS_PER_TURN||state.turn!==CAMPAIGN_TURN_LIMIT+1||state.phase!=='PLAYER'||r.reasonCode!=='TURN_LIMIT_MOST_MAJOR_CITIES'||r.winnerFactionId!==ranking[0]?.factionId||JSON.stringify(r.ranking)!==JSON.stringify(ranking)||Object.keys(r).filter(k=>k!=='history').sort().join(',')!=='ranking,reasonCode,type,winnerFactionId')throw new Error('INVALID_CAMPAIGN_TURN_LIMIT_RESULT');
    legacy.gameResult=null;
  }
  for(const a of Object.values(state.armies))if(!['STEADY','SHAKEN','ROUTING'].includes(a.morale)||typeof a.braced!=='boolean')throw new Error('INVALID_CAMPAIGN_MORALE');
  if(Object.values(state.armies).some(a=>a.campaignTransit))throw new Error('INVALID_CAMPAIGN_TRANSIT');
  for(const a of Object.values(state.armies))if(!Number.isInteger(a.facing)||a.facing<0||a.facing>5||!['ORDERED','DISORDERED','BROKEN'].includes(a.formation)||!Number.isSafeInteger(a.movedTiles)||a.movedTiles<0||a.morale==='ROUTING'&&a.formation!=='BROKEN')throw new Error('INVALID_CAMPAIGN_FORMATION');
  validateCombatFire(state);validateSpecialTroops(state);validateSpecialists(state);validateDomesticEngine(state);validateDomesticCanon(state);
  validateState(legacy,terminalOptions);
  if(!['PLAYER','AI'].includes(state.phase)||!Array.isArray(state.movedArmyIds)||
    new Set(state.movedArmyIds).size!==state.movedArmyIds.length||
    state.movedArmyIds.some(id=>!state.armies[id])||!Array.isArray(state.aiQueue)||
    (state.phase==='AI'&&state.remainingTicks===null))throw new Error('INVALID_CAMPAIGN_TURN_PHASE');
  if(state.remainingTicks!==null&&(!Number.isInteger(state.remainingTicks)||state.remainingTicks<0||state.remainingTicks>200))throw new Error('INVALID_CAMPAIGN_REMAINING_TICKS');
  for(const key of ['attackedArmyIds','endedArmyIds'])if(!Array.isArray(state[key])||new Set(state[key]).size!==state[key].length||state[key].some(id=>!state.armies[id]))throw new Error('INVALID_CAMPAIGN_ACTION_FLAGS');
  if(state.pendingBattle)throw new Error('TACTICAL_BATTLE_RETIRED');
  validatePersonnelLedger(state.personnel);
  if(state.personnel.formations.length!==Object.keys(state.armies).length)throw new Error('CAMPAIGN_PERSONNEL_COVERAGE');
  for(const formation of state.personnel.formations)if(formation.field!==state.armies[formation.formationId]?.troopCount)throw new Error('CAMPAIGN_PERSONNEL_MISMATCH');
  if(state.terminal){validateCampaignTerminalState(state.terminal,terminalOptions);validateCampaignTerminalWorldApplication(state.gameResult?.type==='TURN_LIMIT'?{...state,gameResult:null}:(state.gameResult?.history?{...state,gameResult:Object.fromEntries(Object.entries(state.gameResult).filter(([key])=>key!=='history'))}:state),state.terminal,terminalOptions);}
  if(state.moveOrders!==undefined){
    if(!state.moveOrders||Array.isArray(state.moveOrders)||!Array.isArray(state.orderQueue)||!Array.isArray(state.orderLog)||new Set(state.orderQueue).size!==state.orderQueue.length||state.orderQueue.some(id=>!state.moveOrders[id]))throw new Error('INVALID_CAMPAIGN_ORDERS');
    for(const [id,o] of Object.entries(state.moveOrders))if(!state.armies[id]||(state.mapId==='v1'&&state.armies[id].factionId!==state.playerFactionId)||!state.factions[state.armies[id].factionId]||!state.tiles[o?.destinationTileId])throw new Error('INVALID_CAMPAIGN_ORDERS');
  }
  validateCampaignResearch(state);validateCampaignPolicy(state);validateCampaignEvents(state);
  validateInjury(state);validateFatigue(state);validateCampaignGrowth(state);validateC31(state);validateEngines(state);validateRelations(state);validateDejaVu(state);
  validateCampaignAdministration(state);validateExploration(state);validateDiplomacy(state);validateCouncil(state);
  return state;
}

// Duration is a public siege fact. Remembered cities retain their last observation.
export function refreshCampaignSieges(s){
 refreshBaseSieges(s);
 if(!['v2','v3'].includes(s.mapId))return s;
 for(const c of Object.values(s.cities)){
  if(c.besieged)c.siegeSinceTurn??=s.turn;else c.siegeSinceTurn=null;
  c.siegeTurns=c.besieged?Math.max(1,s.turn-c.siegeSinceTurn+1):0;
  for(const fid of Object.keys(s.factions))if(c.ownerFactionId===fid||s.knowledge[fid]?.tiles[c.tileId]==='VISIBLE'){
   const known=s.castleKnowledge?.[fid]?.[c.cityId];if(known)known.siegeTurns=c.siegeTurns;
  }
 }
 return s;
}
export function createCampaign({factionId = 'F01', seed = 190919, map:mapId = 'v3', c31=true, c37=true, c42=true, c43=true, c45=true,c46=true,council=true, companions, fieldArmies=true, manualEndTurn=false, trialRules, recentEventIds=[],unlocks=[],legacy={},runsFinished=legacy.runsFinished??0} = {}) {
  const {map,initialData,movementData}=campaignScenario(mapId);
  const world = selectPlayerFaction(createWorldState({map, initialData, movementData, seed}), factionId);
  for(const f of Object.values(world.factions))f.startCapitalCityId=f.capitalCityId;
  if(trialRules!==undefined)world.trialRules=structuredClone(trialRules);
  if(mapId!=='v1')world.trialRules={...world.trialRules,foodModel:world.trialRules?.foodModel??'clock'};
  normalizeCampaignTroopNames(world,mapId);
  if(!c43&&mapId!=='v1')world.c43Disabled=true;
  if(!c42)world.c42Disabled=true;
  // c37 is retained as the engine-disable compatibility switch.
  if(!c37)world.c37Disabled=true;initializeCampaignAbilities(world);initializeEngines(world);
  initializeCampaignCastles(world);
  for(const a of Object.values(world.armies)){a.morale='STEADY';a.braced=false;}
  initializeArmyFacing(world);applyCampaignVision(world);if(mapId!=='v1')refreshCampaignSieges(world);
  const result=startFactionEffects(initializeCampaignEffects(initializeCampaignCaptives(initializeCampaignOccupation(initializeCampaignGrowth(initializeCampaignEconomy({...world, turn: 1, globalTick: 0,...(manualEndTurn!==false?{manualEndTurn}:{}),remainingTicks:null,attackedArmyIds:[],endedArmyIds:[],
    moveOrders:{},orderQueue:[],orderLog:[],battleSequence:0,terminal:null,occupations:{},phase:'PLAYER',movedArmyIds:[],aiQueue:[],mapId,...(!c31?{c31Disabled:true}:{}),cityDisplayNames:mapId!=='v1'?Object.fromEntries(map.cities.map(c=>[c.id,c.label])):initialCityNames(),personnel:campaignPersonnel(world)}))))),factionId);
  if(!c46)result.c46Disabled=true;if(!c45)result.c45Disabled=true;if(!council)result.councilDisabled=true;initializeSupply(result);initializeDiplomacy(result);initializeDejaVu(result);initializeEngines(result);initializeCampaignRoster(result);initializeUnlockedOfficers(result,unlocks);applyOfficerDraft(result,companions,unlocks);initializeCampaignAmbitions(result,{unlocks,legacy,runsFinished});varyWanderers(result,companions);normalizeCampaignTroopNames(result,mapId);migrateArmyStructure(result);if(fieldArmies===false)initializeCityStart(result);initializeRelations(result);c30Start(result,factionId,{force:true});startFactionPolicy(result,factionId);updateKnowledge(result);initializeCampaignEvents(result);initializeEventDeck(result,recentEventIds);startFactionEvents(result,factionId);initializeExploration(result);initializeInjury(result);startCouncilTurn(result);if(mapId!=='v1')result.c182RulesVersion=1;initializeCombatFire(result);initializeSituations(result);initializeRunModifiers(result);startRunModifierTurn(result);refreshEnemyPlans(result);rememberRewindStart(result);return validate(result);
}

// C143b: migrate campaign aliases only. FIRST3/tactical source data stays intact.
export function normalizeCampaignTroopNames(s,mapId=s.mapId){
 if(!['v2','v3'].includes(mapId)||s.trialRules?.legacyTroopNames)return s;
 const name=t=>({engineer:'militia',mystic:'bow'})[t]??t,rank={C:0,B:1,A:2};
 for(const o of Object.values({...s.officers,...s.wanderers})){
  o.allowedTroops=[...new Set(o.allowedTroops.map(name))];
  const aptitude={};for(const [type,value] of Object.entries(o.aptitude)){const key=name(type);if(aptitude[key]===undefined||(rank[value]??-1)>(rank[aptitude[key]]??-1))aptitude[key]=value;}o.aptitude=aptitude;
 }
 for(const a of Object.values(s.armies))if(!(a.troopType==='engineer'&&s.personnel?.formations?.some(f=>f.formationId===a.armyId&&f.identity.specialTroopId==='engineer')))a.troopType=name(a.troopType);
 // A queued old-save sortie/reorganization must not reintroduce an alias.
 for(const c of Object.values(s.cities))if(c.currentProduction?.troopType){
  const job=c.currentProduction,old=job.key;job.troopType=name(job.troopType);
  job.key=job.kind==='muster'?`muster:${job.officerId}:${job.troopType}`:job.kind==='reorganize'?`reorganize:${job.armyId}:${job.troopType}`:old;
  if(old!==job.key&&c.jobProgress?.[old]!==undefined){c.jobProgress[job.key]=Math.max(c.jobProgress[job.key]??0,c.jobProgress[old]);delete c.jobProgress[old];}
 }
 return s;
}

// Freeze the same public-information plan that execution will consume. No
// planner runs inside view(), and unobserved enemy plans never leave this state.
export function refreshEnemyPlans(s){
 if(!gapsEnabled(s))return;const v=getFactionView(s,s.playerFactionId);s.enemyPlans={turn:s.turn,entries:[]};
 for(const fid of Object.keys(s.factions).sort()){
  if(fid===s.playerFactionId||!s.factions[fid].alive)continue;
  const plan=campaignAiPlan(s,fid,{remember:false,turnLimit:CAMPAIGN_TURN_LIMIT});
  for(const candidate of plan?.candidates??[]){
   const seen=v.knowledge.observedArmies[candidate.armyId];if(!seen||v.knowledge.tiles[seen.tileId]!=='VISIBLE')continue;
   const sandbox=campaignTacticsWorld(s,campaignTacticsView(s,fid)),id=candidate.armyId;if(!sandbox?.armies[id])continue;
   if(candidate.type==='MOVE'&&candidate.destinationTileId&&!s.movedArmyIds.includes(id)){
    sandbox.armies[id].tileId=candidate.destinationTileId;sandbox.armies[id].movedTiles=Math.max(0,(candidate.pathTileIds?.length??1)-1);
   }
   const action=campaignChooseTacticalAction(sandbox,fid,id,null,candidate.aiTargetCityId??plan.goal?.targetCityId??null);
   if(!action||!['ATTACK','CITY','TACTIC'].includes(action.type))continue;
   const target=s.armies[action.targetId]??s.cities[action.targetId];
   if((target?.factionId??target?.ownerFactionId)!==s.playerFactionId)continue;
   s.enemyPlans.entries.push({armyId:id,factionId:fid,candidate:structuredClone(candidate),action});
  }
 }
}
function enemyIntentsView(s,fid){
 if(fid!==s.playerFactionId||s.enemyPlans?.turn!==s.turn)return [];
 return s.enemyPlans.entries.filter(e=>{const a=s.armies[e.armyId],t=s.armies[e.action.targetId]??s.cities[e.action.targetId];return a&&castleArmyActive(s,a)&&!ambushHidden(s,e.armyId,fid)&&s.knowledge[fid]?.tiles[a.tileId]==='VISIBLE'&&(t?.factionId??t?.ownerFactionId)===fid;}).map(e=>({armyId:e.armyId,targetId:e.action.targetId,kind:e.action.type}));
}
function committedEnemyAction(s,id){
 const e=s.enemyPlans?.turn===s.turn?s.enemyPlans.entries.find(e=>e.armyId===id):null;if(!e)return undefined;
 const a=e.action,legal=a.type==='ATTACK'?attackTargets(s,id).includes(a.targetId):a.type==='CITY'?cityAttackTargets(s,id).includes(a.targetId):campaignTactics(s,id).some(t=>t.traitId===a.traitId&&t.targets.includes(a.targetId));
 return legal?a:null;
}
const viewCache=new WeakMap();
export function view(state, factionId = state.playerFactionId) {
  const cached=viewCache.get(state)?.get(factionId);
  if(cached)return cached;
  validate(state);
  const publicSource=structuredClone(state);if(publicSource.gameResult?.type==='TURN_LIMIT')publicSource.gameResult=null;else if(publicSource.gameResult)delete publicSource.gameResult.history;updateKnowledge(publicSource);
  const projected = getFactionView(publicSource, factionId);
  for(const a of Object.values(projected.ownArmies))if(a.troopType==='engineer')a.repairCityReason=repairCityActionReason(state,a.armyId);
  for(const a of Object.values(projected.ownArmies))if(a.troopType==='catapult')a.platformState=platformState(state.armies[a.armyId]);
  for(const a of Object.values(projected.knowledge.observedArmies)){
    if(projected.knowledge.tiles[a.tileId]==='VISIBLE'){a.braced=!!state.armies[a.armyId].braced;if(a.troopType==='catapult')a.platformState=platformState(state.armies[a.armyId]);}
    else {delete a.braced;delete a.platformState;}
  }
  for(const id of Object.keys(projected.officers))if(state.wanderers?.[id])delete projected.officers[id];
  for(const o of Object.values(projected.officers)){delete o.fatigueCombat;delete o.fatigue;delete o.restUntilTurn;delete o.restPendingReturn;}
  for(const o of Object.values(projected.officers)){o.growth=campaignOfficerGrowth(state,o.officerId);if(o.allegianceFactionId!==factionId&&c29Hidden(state,o.officerId)&&o.growth){const core=c29Record(state,o.officerId).coreId;o.growth.cards=o.growth.cards.filter(c=>c.traitId!==core);o.growth.awakenings=[];}}
  if(supplyEnabled(state)){projected.hubs=supplyHubsView(state,factionId);for(const a of Object.values(projected.ownArmies)){a.supply=supplyView(state,state.armies[a.armyId]);const link=supplyLink(state,state.armies[a.armyId]);a.supply.sourceHubId=link.sourceHubId;a.supply.linkState=link.state;}}
  for(const a of Object.values(projected.ownArmies)){const pass=sample4PassTargets(state,a.armyId);if(pass.length)a.sample4PassTargets=pass;const r=c29Record(state,a.armyId);if(r?.c29){a.signatureGauge=r.c29.gauge;a.disengage={options:disengageOptions(state,a.armyId),reason:disengageReason(state,a.armyId)};}const status=unitStatuses(state,a.armyId);if(status.length)a.status=status;Object.assign(a,{...(c24Enabled(state)?troopInfo(state,a.troopType):{}),facing:state.armies[a.armyId].facing,formation:state.armies[a.armyId].formation});}
  for(const a of Object.values(projected.knowledge.observedArmies)){if(projected.knowledge.tiles[a.tileId]==='VISIBLE'){Object.assign(a,{...(c24Enabled(state)?troopInfo(state,a.troopType):{}),facing:state.armies[a.armyId].facing,formation:state.armies[a.armyId].formation});const r=c29Record(state,a.armyId);if(r?.c29){a.signatureGauge=r.c29.gauge;a.disengage={options:disengageOptions(state,a.armyId),reason:disengageReason(state,a.armyId)};}const status=unitStatuses(state,a.armyId);if(status.length)a.status=status;}if(projected.knowledge.tiles[a.tileId]!=='VISIBLE'){delete a.facing;delete a.formation;delete a.signatureGauge;}a.morale=state.armies[a.armyId].morale??'STEADY';a.troopCount=state.armies[a.armyId].troopCount;}
  for(const c of Object.values({...projected.knowledge.cities,...projected.ownCities}))if(c.ownerFactionId===factionId||projected.knowledge.tiles[c.tileId]==='VISIBLE'){c.securityLevel=state.cities[c.cityId].securityLevel??0;c.securityCauses=state.cities[c.cityId].securityCauses??[];if(domesticEngineEnabled(state))c.securityName=securityLabel(state.cities[c.cityId]);}
  projected.stratagemRange=STRATAGEMS.range;
  projected.stratagems=stratagemOptions(state,factionId);
  projected.stratagemLog=structuredClone((state.stratagemLog??[]).filter(e=>e.factionId===factionId));
  for(const x of [...Object.values(projected.ownCities),...Object.values(projected.knowledge.cities),...Object.values(projected.ownArmies),...Object.values(projected.knowledge.observedArmies)])if(x.ownerFactionId===factionId||x.factionId===factionId||projected.knowledge.tiles[x.tileId]==='VISIBLE')x.stratagemText=stratagemLabel(state,state.cities[x.cityId]??state.armies[x.armyId]);
  projected.achievements=campaignAchievementsView(state,factionId);
  campaignBannerView(state,projected);
  for(const c of Object.values(projected.ownCities))c.economyForecast=cityEconomyRates(state,state.cities[c.cityId]);
  for(const c of Object.values(projected.ownCities)){c.name=state.cityDisplayNames?.[c.cityId]??c.name;if(state.mapId!=='v1')c.kind=state.cities[c.cityId].kind;}
  for(const c of Object.values(projected.ownCities))c.facilities=(c.facilities??[]).map(f=>({...f,disabled:facilityDisabled(state,state.cities[c.cityId],f),...(domesticEngineEnabled(state)?{siteReason:f.siteReason??(cityInfluence(state,state.cities[c.cityId]).tiles.some(t=>t.tileId===f.tileId)?facilitySite(state,state.cities[c.cityId],f.kind,[f.tileId])?.reason:'기존 시설 자리 · 영향권 밖')}:{})}));
  for(const c of Object.values(projected.knowledge.cities)){c.name=state.cityDisplayNames?.[c.cityId]??c.name;if(state.mapId!=='v1')c.kind=state.cities[c.cityId].kind;}
  for(const c of Object.values({...projected.knowledge.cities,...projected.ownCities})){
    const castle=state.castleKnowledge?.[factionId]?.[c.cityId];
    if(castle)Object.assign(c,structuredClone(castle));
  }
  if(state.mapId!=='v1'){
   const forecast=campaignReinforcementForecast(state,factionId,projected);
   for(const a of Object.values(projected.ownArmies))a.nextReinforcement=forecast[a.armyId];
   for(const c of Object.values(projected.ownCities)){
    c.siegeTurns=state.cities[c.cityId].siegeTurns??(c.besieged?1:0);
    c.guardMaximum=C195.guardMaximum;c.specialReserves=specialReserves(state,state.cities[c.cityId]);
    c.nextReinforcements=Object.values(projected.ownArmies).flatMap(a=>(a.nextReinforcement?.sources??[]).filter(r=>r.cityId===c.cityId).map(r=>({armyId:a.armyId,...r})));
   }
  }
  for(const c of Object.values(projected.ownCities))if(state.occupations?.[c.cityId])c.occupation=occupationDisplay(state,state.cities[c.cityId]);
  for(const c of Object.values(projected.knowledge.cities))if(projected.knowledge.tiles[c.tileId]==='VISIBLE'&&state.occupations?.[c.cityId])c.occupation=occupationDisplay(state,state.cities[c.cityId]);
  if(state.mapId!=='v1'){
   projected.research=campaignResearchView(state,factionId);projected.policy=campaignPolicyView(state,factionId);for(const a of Object.values(projected.ownArmies))a.starAction=starAction(state,{armyId:a.armyId},factionId);for(const c of Object.values(projected.ownCities))c.starAction=starAction(state,{cityId:c.cityId},factionId);
   if(domesticEngineEnabled(state)){
    projected.officerTransfers=structuredClone((state.officerTransfers??[]).filter(t=>t.factionId===factionId&&!['ARRIVED','CANCELLED'].includes(t.state)));
    for(const c of Object.values(projected.ownCities)){const raw=state.cities[c.cityId];Object.assign(c,domesticEngineView(state,raw,{rates:c.economyForecast,foodNeed:campaignLedgerFoodNeed(state,raw),specialists:specialistView(state,raw),sites:Object.fromEntries(cityJobList(state,raw).filter(j=>!['recruit','repair','reorganize'].includes(j.kind)).map(j=>[j.kind,facilitySite(state,raw,j.kind,facilityTiles(state,raw))]))}));c.securityName=securityLabel(raw);}
   }
   for(const c of Object.values(projected.ownCities)){Object.assign(c,specialistView(state,state.cities[c.cityId]));c.populationCapacity=state.cities[c.cityId].populationCapacity;const warehouse=domesticGranaryView(state,factionId,city=>cityEconomyRates(state,city).capacity);if(warehouse)c.foodWarehouse=warehouse;c.jobs=cityJobList(state,state.cities[c.cityId]);c.domesticCommands=[{type:'CITY_TAX_ADVANCE',cityId:c.cityId,label:'세금 앞당겨 걷기',blockedReason:c33TaxReason(state,state.cities[c.cityId]),available:!c33TaxReason(state,state.cities[c.cityId])},...domesticCommands(state,state.cities[c.cityId],kind=>cityJobCost(state,state.cities[c.cityId],kind),cityId=>cityRecruitCost(state,cityId,factionId))];}
   const summary=o=>({officerId:o.officerId,name:o.name,baseStats:structuredClone(o.baseStats),troopType:o.troopType,multiTroopTrait:structuredClone(o.multiTroopTrait),allowedTroops:[...o.allowedTroops],...(enginesEnabled(state)?{engine:engineView(state,o.officerId)}:{})});
   for(const c of Object.values(projected.ownCities)){c.freeOfficers=freeCityOfficers(state,state.cities[c.cityId],{includeGovernor:false}).map(o=>({...summary(o),troopOptions:musterTroopOptions(state,state.cities[c.cityId],o.officerId)}));c.musterOptions=freeCityOfficers(state,state.cities[c.cityId]).filter(o=>!domesticMusterReason(state,o.officerId)).map(o=>({officerId:o.officerId,troops:musterTroopOptions(state,state.cities[c.cityId],o.officerId)}));}
   for(const c of [...Object.values(projected.knowledge.cities),...Object.values(projected.ownCities)])if(projected.knowledge.tiles[c.tileId]==='VISIBLE')c.wanderers=Object.values(state.wanderers??{}).filter(o=>o.locationRef.id===c.cityId).map(summary);
  }
  if(injuryEnabled(state)){projected.injury=injuryRecent(state,factionId);for(const o of Object.values(projected.officers))if(o.allegianceFactionId===factionId){o.injury=injuryView(state,o.officerId);o.fatigue=fatigueView(state,o.officerId);}}
  if(diplomacyEnabled(state)){
   projected.diplomacy=diplomacyView(state,factionId);
   for(const f of projected.diplomacy.factions){const ended=state.c43.axes.ended[[factionId,f.factionId].sort().join('|')],rule=diplomacyAxes.trust.loss.surpriseAttack;const left=ended?ended.turn+rule.withinTurns-state.turn:0;if(left>0)f.attackWarning={loss:rule.value,turnsLeft:left};}
  }
  // C132: read-only estimates use the existing settlement inputs and rounding.
  for(const c of Object.values(projected.ownCities)){
   const raw=state.cities[c.cityId],rates=c.economyForecast;
   for(const job of c.jobs??[]){const kind=job.kind,active=raw.currentProduction?.kind===kind;
    job.estimate={kind,cost:job.cost,progress:active?(raw.jobProgress?.[raw.currentProduction.key]??raw.productionProgress??0):(raw.jobProgress?.[kind]??0),advance:raw.c33?.advanceProduction??0,gain:Math.round((kind==='muster'?c31Muster(state,c.ownerFactionId):1)*(c29Aw(state,raw.governorId,'AW_TT-V02')&&!['muster','recruit','reorganize','repair'].includes(kind)?1.15:1)*uniqueProgress(state,raw,rates.production*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1)))};
   }
  }
  const supplyLosses=(state.personnel?.losses??[]).filter(l=>l.battleId.startsWith('SUPPLY.')&&state.armies[l.formationId]?.factionId===factionId).map(l=>({id:l.lossId,armyId:l.formationId,count:l.count}));
  if(supplyLosses.length)projected.supplyLosses=supplyLosses;
  if(explorationEnabled(state))projected.exploration=explorationView(publicSource,factionId);
  if(dejaVuEnabled(state))projected.dejaVu=dejaVuView(state,factionId);c30View(state,factionId,projected);c31View(state,projected);if(state.mapId!=='v1')projected.social=relationsView(state,factionId,Object.keys(projected.officers));
  if(enginesEnabled(state)){
   projected.engineMap=engineMapView(state,factionId);
   for(const o of Object.values(projected.officers)){
    const a=Object.values(state.armies).find(a=>a.commanderId===o.officerId&&a.factionId===factionId&&castleArmyActive(state,a));
    o.engine=engineView(state,o.officerId,a?.armyId);
   }
   for(const a of Object.values(projected.ownArmies)){a.engine=engineView(state,a.commanderId,a.armyId);a.engineActions=engineActions(state,a.armyId);a.structureTargets=engineStructureTargets(state,a.armyId);}
   for(const b of Object.values(projected.knowledge.observedArmies))if(projected.knowledge.tiles[b.tileId]==='VISIBLE')b.engine={...engineView(state,state.armies[b.armyId]?.commanderId,b.armyId,factionId),merits:[]};
  }
  if(factionId===state.playerFactionId&&state.council)projected.council=councilOpinionView(state);
  // Compact public feedback; never expose a raw combat snapshot/hidden unit.
  const knownArmy=id=>state.armies[id]?.factionId===factionId||!!projected.knowledge.observedArmies[id]||!!projected.knowledge.lastSeenArmies[id];
  const feedback=(state.combatLog??[]).filter(e=>e.turn===state.turn).flatMap(e=>{
   const appliedTactics=(e.appliedTactics??[]).filter(r=>knownArmy(r.attackerId)&&knownArmy(r.targetId));
   const targetLosses=(e.targetLosses??[]).filter(r=>knownArmy(r.targetId));
   return appliedTactics.length||targetLosses.length?[{sequence:e.sequence,turn:e.turn,kind:e.kind,appliedTactics:structuredClone(appliedTactics),targetLosses:structuredClone(targetLosses)}]:[];
  });
  if(feedback.length)projected.combatFeedback=feedback;
  projected.combatWeather={...runModifiersView(state,factionId).weather,direction:combatWind(state),name:C182.fire.windNames[combatWind(state)],record:structuredClone(state.history.findLast(e=>e.type==='WIND'&&e.turn===state.turn)??null)};
  if(state.c182)projected.fire={tiles:state.c182.fires.filter(f=>f.until>=state.turn&&projected.knowledge.tiles[f.tileId]==='VISIBLE').map(f=>({tileId:f.tileId,turnsLeft:f.until-state.turn+1})),burnedForest:state.c182.burnedForest.filter(id=>projected.knowledge.tiles[id]!=='UNEXPLORED'),log:state.c182.log.filter(e=>!e.tiles.length||e.tiles.every(id=>projected.knowledge.tiles[id]==='VISIBLE')).map(e=>structuredClone(e))};
  for(const c of Object.values(projected.ownCities))for(const cmd of c.domesticCommands??[])if(cmd.type==='CITY_REMOTE_RECRUIT'){const origin=state.wanderers?.[cmd.officerId]?.locationRef.id;if(origin)Object.assign(cmd,cityRecruitQuote(state,origin,factionId,cmd.officerId));}
  const scene=relationSceneView(state,factionId);if(scene)projected.relationScene=scene;
  const captives=campaignCaptives(state,factionId);if(captives.length)projected.captives=captives;
  projected.currentDate=Math.floor(projected.currentDate);
  // Keep FIRST3 axial IDs and the public projection as the only map input.
  for (const tile of Object.values(projected.tiles)) {
    if (tileId(tile) !== tile.tileId) throw new Error('지도 좌표가 올바르지 않습니다.');
  }
  const result={...projected,...(state.mapId!=='v1'?{enemyIntents:enemyIntentsView(state,factionId)}:{}),...gapsView(state,factionId),...runModifiersView(state,factionId),...(c34KnownTraits(state,factionId).length?{knownUniqueTraits:c34KnownTraits(state,factionId)}:{}),...(uniqueRevealedWanderers(state,factionId).length?{revealedWanderers:uniqueRevealedWanderers(state,factionId)}:{}),...campaignEventsView(state,factionId),...ambitionsView(state,factionId),...(state.mapId!=='v1'?{mapId:state.mapId}:{}), ...(state.gameResult?{gameResult:structuredClone(state.gameResult)}:{}), turn: state.turn, globalTick: state.globalTick};
  if(result.gameResult){
   if(state.historyScore)Object.assign(result.gameResult,{scoreItems:[{id:'HISTORY_TWISTS',...structuredClone(state.historyScore)}],chronicle:[...state.historyChronicle]});
   if(factionId===state.playerFactionId&&state.mapId!=='v1')Object.assign(result.gameResult,ambitionResultView(state));
   const troops=Object.fromEntries(Object.keys(state.factions).sort().map(fid=>[fid,campaignTroopBreakdown(state,fid)]));
   result.gameResult.troopBreakdownByFactionId=troops;
   if(state.terminal?.terminalReport)result.terminalReport={resultType:state.terminal.terminalReport.resultType,reasonCode:state.terminal.terminalReport.reasonCode,finalGlobalTick:state.terminal.terminalReport.finalGlobalTick,factionSnapshots:state.terminal.terminalReport.factionSnapshots.map(f=>({factionId:f.factionId,alive:f.alive,ownedCityIds:[...f.ownedCityIds],troopBreakdown:{...troops[f.factionId]}}))};
  }
  if(!viewCache.has(state))viewCache.set(state,new Map());
  viewCache.get(state).set(factionId,result);return result;
}

export const aiAttackPriority=(s,id,p,factionId=s.activeFactionId??s.playerFactionId)=>{const target=s.armies[id],support=Object.values(s.armies).filter(a=>a.factionId===factionId&&attackTargets(s,a.armyId).includes(id)).length;return (c29Aw(s,id,'LEGEND_NAME')?1000:0)+c22TargetWeight(s,factionId,target.factionId)+p.enemyLoss-p.allyLoss*campaignShownScale(s,id,factionId)+(p.side==='REAR'?30:p.side==='FLANK'?15:0)+(target.formation!=='ORDERED'?15:0)+(support>1?15:0);};
const castleArmyActiveForAction=(s,id)=>s.armies[id]?.troopCount>0&&s.armies[id].morale!=='ROUTING';
const active=(s,id)=>!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[id]?.disposition==='ACTIVE';

// 같은 상태·부대면 다시 계산하지 않는다(화면이 마우스 이동마다 부름). 한 번의 탐색으로 모든 칸을 구한다(campaignReachable).
const moveOptionCache=new WeakMap();
export function campaignMoveOptions(state,armyId) {
  let byArmy=moveOptionCache.get(state);if(!byArmy){byArmy=new Map();moveOptionCache.set(state,byArmy);}
  if(byArmy.has(armyId))return byArmy.get(armyId);
  const publicState=view(state),army=publicState.ownArmies[armyId];
  let options=[];
  if(army&&!injuryReason(state,state.armies[armyId].commanderId)&&active(state,armyId)&&state.phase==='PLAYER'&&!pendingCampaignDraft(state)&&!armyActionEnded(state,armyId)&&!state.movedArmyIds.includes(armyId)&&!state.gameResult){
    const reach=campaignReachable(state,armyId,TICKS_PER_TURN);
    options=Object.keys(publicState.tiles).filter(id=>reach.has(id)&&publicState.knowledge.tiles[id]!=='UNEXPLORED'&&!Object.values(state.cities).some(c=>c.tileId===id&&c.ownerFactionId!==army.factionId&&!campaignCenterEntryAllowed(state,armyId,c)))
      .map(id=>({tileId:id,route:reach.get(id),...(supplyEnabled(state)?{supplyState:supplyLink(state,state.armies[armyId],id).state}:{})}));
  }
  byArmy.set(armyId,options);return options;
}

// Optional player route input. Legacy and AI callers continue to find a path.
function movementInputRoute(s,candidate){
  if(candidate.path===undefined)return campaignPath(s,candidate.armyId,candidate.destinationTileId);
  return requireOrderPath(s,candidate.armyId,candidate.destinationTileId,candidate.path);
}
function revealMovementContact(s,army,hidden){
 if(hidden.c27)delete hidden.c27.ambush;if(hidden.c32)delete hidden.c32.hiddenUntil;
 army.currentOrder.status='CONTACT';army.movementState=null;
 s.history.push({type:'CONTACT',turn:s.turnNumber,tick:s.time.tick,armyIds:[army.armyId,hidden.armyId].sort(),factionIds:[army.factionId,hidden.factionId].sort(),tileIds:[army.tileId,hidden.tileId].sort(),text:'숨은 적과 부딪힘 — 앞 칸 정지 · 남은 이동 잃음'});
 updateKnowledge(s);refreshCampaignSieges(s);
}
function executePlatformAction(s,id,action){
 const a=s.armies[id];a.platformState=action.type==='DEPLOY'?'DEPLOYED':'STOWED';
 if(action.type==='DEPLOY'&&action.cityId)a.platformTargetCityId=action.cityId;else delete a.platformTargetCityId;
 s.c193Stats??={deployments:0,stows:0};s.c193Stats[action.type==='DEPLOY'?'deployments':'stows']++;
 consumeMainAction(s,id);
}
// Reuse movement's occupancy/contact rules; contact never opens another screen.
function moveArmy(s, candidate, factionId) {
  if(platformState(s.armies[candidate.armyId])==='DEPLOYED')return s;
  const approachStart=approachFireStart(s,candidate.armyId);
  const hiddenAtStart=new Set(Object.values(s.armies).filter(b=>castleArmyActive(s,b)&&diplomacyArmyHostile(s,candidate.armyId,b.armyId)&&(!s.knowledge[factionId].observedArmies[b.armyId]||ambushHidden(s,b.armyId,factionId))).map(b=>b.armyId));
  const originalTroop=s.armies[candidate.armyId].troopType,id=candidate.armyId,before={armies:{[candidate.armyId]:{tileId:s.armies[candidate.armyId].tileId}},cities:structuredClone(s.cities)},originalRules=s.mapRules;
  if(injuryReason(s,s.armies[id].commanderId)||!active(s,id)||s.armies[id].morale==='ROUTING'||s.armies[id].troopCount<=0)return s;
  if(candidate.type==='MOVE'&&campaignPath(s,id,candidate.destinationTileId))engineEvent(s,'MOVE_LEAVE',{armyId:id,fromTileId:s.armies[id].tileId,destinationTileId:candidate.destinationTileId});
  // 정본 20 v3.1 §1.1: 교전 중에 움직이면 붙어 있던 적이 먼저 추격한다(소멸·패주하면 이동 없음).
  if(candidate.type==='MOVE'&&inControlZone(s,s.armies[id])&&campaignPath(s,id,candidate.destinationTileId)){
    s=resolvePursuit(s,id);
    if(!active(s,id)||s.armies[id].troopCount<=0||s.armies[id].morale==='ROUTING')return s;
  }
  s.turnPhase='PLANNING';
  if(candidate.type==='MOVE'){
    const rules=s.mapRules;
    const route=movementInputRoute(s,candidate);
    if(!route)return s;
    s=issueOrder(campaignMovementWorld(s,id),{armyId:id,factionId,type:'MOVE',destinationTileId:candidate.destinationTileId,validatedPathTileIds:route.pathTileIds});
    s.turnPhase=s.time.tick===0?'PLANNING':'EXECUTION_TIMELINE';
  }
  else return s;
  const postMove=combatCanPostMove(s,id),budget=postMove?s.armies[id].c27?.cantoTicks??TICKS_PER_TURN:TICKS_PER_TURN;
  let lastStandTile=s.armies[id].tileId,leaveTile=lastStandTile;
  for(let tick=0;tick<budget;tick++){
    const army=s.armies[id],old=army.tileId,start=s.history.length;
    const suspended=Object.values(s.armies).filter(a=>a.armyId!==id).map(a=>[a,a.currentOrder]);
    for(const [a] of suspended)a.currentOrder=null;
    const to=army.currentOrder.pathTileIds[army.currentOrder.currentPathIndex+1];
    const city=Object.values(s.cities).find(c=>c.tileId===to&&c.ownerFactionId!==army.factionId);
    if(city&&!campaignCenterEntryAllowed(s,id,city)){
      army.currentOrder.status='BLOCKED_INVALID_PATH';army.movementState=null;
    }
    const hidden=Object.values(s.armies).find(b=>b.armyId!==id&&b.tileId===to&&castleArmyActive(s,b)&&diplomacyArmyHostile(s,id,b.armyId)&&(!s.knowledge[factionId].observedArmies[b.armyId]||ambushHidden(s,b.armyId,factionId)));
    if(hidden){
      revealMovementContact(s,army,hidden);
      for(const [a,order] of suspended)a.currentOrder=order;
      updateKnowledge(s);refreshCampaignSieges(s);break;
    }
    if(combatFireAt(s,to)){army.currentOrder.status='BLOCKED_INVALID_PATH';army.movementState=null;for(const [a,order] of suspended)a.currentOrder=order;break;}
    if(!army.movementState&&old!==leaveTile){engineEvent(s,'MOVE_LEAVE',{armyId:id,fromTileId:old,destinationTileId:to});leaveTile=old;}
    if(old!==to&&!army.movementState){s=engineBeforeMove(s,id,old,to);if(!active(s,id)||s.armies[id].morale==='ROUTING')break;if(s.armies[id].c50?.moveStopped){delete s.armies[id].c50.moveStopped;army.currentOrder.status='BLOCKED_INVALID_PATH';for(const [a,order] of suspended)a.currentOrder=order;break;}}
    moveCampaignOneTick(s,id);
    if(campaignDestinationAllowed(s,id,army.tileId)){delete army.campaignTransit;lastStandTile=army.tileId;}
    else army.campaignTransit=true;
    if(combatRule(s,id,'CANTO')){army.c27??={};army.c27.movementTicks=(army.c27.movementTicks??0)+1;}
    for(const [a,order] of suspended)a.currentOrder=order;
    // Edge progress alone changes neither observers nor siege control. Keep the
    // first refresh and every arrival/contact so intermediate discoveries and
    // reactions retain their original order and last-seen timestamps.
    if(tick===0||army.tileId!==old||s.history.length!==start){army.troopType=originalTroop;updateKnowledge(s);refreshCampaignSieges(s);army.troopType=parentTroop(originalTroop);}
    if(army.tileId!==old){
      army.facing=directionToward(s.tiles[old],s.tiles[army.tileId],army.facing);army.movedTiles++;
      captureHubs(s,id);s=resolveOverwatch(s,id,old,{stopped:inControlZone(s,s.armies[id])});if(!active(s,id)||s.armies[id].morale==='ROUTING'||!s.armies[id].troopCount)break;
      const mover=s.armies[id],next=mover.currentOrder?.pathTileIds[mover.currentOrder.currentPathIndex+1],contact=Object.values(s.armies).find(b=>hiddenAtStart.has(b.armyId)&&b.tileId===next&&castleArmyActive(s,b));
      if(contact){revealMovementContact(s,mover,contact);break;}
      if(inControlZone(s,s.armies[id]))break;
    }
    if(!['PLANNED','ACTIVE','WAITING_FOR_TILE'].includes(s.armies[id].currentOrder?.status))break;
  }
  // A turn's movement allowance ends here, including interrupted routes.
  if(s.armies[id].campaignTransit&&campaignDestinationAllowed(s,id,s.armies[id].tileId))delete s.armies[id].campaignTransit;
  if(s.armies[id].campaignTransit&&castleArmyActive(s,s.armies[id])){s.armies[id].tileId=lastStandTile;s.armies[id].currentOrder=null;}
  delete s.armies[id].campaignTransit;
  s.armies[id].movementState=null;
  if(s.armies[id].currentOrder)s.armies[id].currentOrder.status='COMPLETED';
  if(s.armies[id].tileId!==before.armies[id].tileId)s.armies[id].ruleMovedTurn=s.turn;
  s.armies[id].troopType=originalTroop;s.mapRules=originalRules;s=resolveOverwatch(s,id,before.armies[id].tileId,{stopped:true,arrival:false});if(postMove){if(s.armies[id].c27){delete s.armies[id].c27.cantoTurn;delete s.armies[id].c27.cantoRemaining;}if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);}gateMorale(s,before);updateKnowledge(s);refreshCampaignSieges(s);checkDejaVuLocations(s);
  // Ability-granted post-attack movement is outside normal-move approach fire.
  if(s.armies[id].c50?.direct?.type==='MOVE')delete s.armies[id].c50.direct;
  return resolveApproachFire(s,id,postMove?null:approachStart);
}

export function campaignArcherEscape(s,id){
 const a=s.armies[id],knowledge=s.knowledge[a.factionId];
 const foes=Object.values(knowledge.observedArmies).filter(b=>knowledge.tiles[b.tileId]==='VISIBLE'&&s.armies[b.armyId]&&castleArmyActiveForAction(s,b.armyId));
 const distance=tile=>Math.min(...foes.map(b=>hexDistance(s.tiles[tile],s.tiles[b.tileId])));
 return [...campaignReachable(s,id,TICKS_PER_TURN)].filter(([tile])=>knowledge.tiles[tile]!=='UNEXPLORED'&&distance(tile)>1).map(([tile,route])=>({tileId:tile,route})).sort((x,y)=>x.route.totalTicks-y.route.totalTicks||distance(y.tileId)-distance(x.tileId)||x.tileId.localeCompare(y.tileId))[0]??null;
}
function referenceAttackAllowed(s,f,id,targetId,p){
 if(!campaignAiRule(s,f,2)&&!campaignAiRule(s,f,6))return p.enemyLoss>=p.allyLoss*campaignShownScale(s,targetId,f)*1.2;
 const v=campaignTacticsView(s,f),posture=campaignAiPosture(s,v,campaignKnownRanking(s,v));
 if(!campaignAiExchangeAllowed(p,{aggressive:posture.lossWeight===1}))return false;
 if(!campaignAiRule(s,f,2))return true;
 const a=v.ownArmies[id],b=v.knowledge.observedArmies[targetId];if(!a||!b)return false;
 const mine=Object.values(v.ownArmies).filter(x=>hexDistance(s.tiles[x.tileId],s.tiles[b.tileId])<=3).reduce((n,x)=>n+x.troopCount,0),enemy=Object.values(v.knowledge.observedArmies).filter(x=>hexDistance(s.tiles[x.tileId],s.tiles[a.tileId])<=3).reduce((n,x)=>n+(x.troopCount??0),0);
 const accepted=campaignAiExchange(p)>=1.2||campaignAiLaunch(s,f,id,mine/Math.max(1,enemy),posture.startRatio);campaignAiRecordBlocked(s,f,id,!accepted);return accepted;
}
function run(s, incremental=false) {
  const migrationOpening={turn:s.turn,cities:structuredClone(s.cities),c20:structuredClone(s.c20),c22:structuredClone(s.c22)};
  while(true){
    ambitionStep(s,{finish:false});
    if(s.phase!=='AI')return s;
    const entry=s.aiQueue.shift();
    if(entry){
      if(entry.tacticsFaction){
        const f=entry.tacticsFaction,entries=entry.entries.filter(e=>s.armies[e.candidate.armyId]?.factionId===f&&castleArmyActive(s,s.armies[e.candidate.armyId])),focus=campaignTacticsPart(s,f,'focus')||campaignAiRule(s,f,9),w=focus?campaignTacticsWorld(s,campaignTacticsView(s,f)):null;
        const order=w?campaignFocusOrder(w,entries.map(e=>e.candidate.armyId)):entries.filter(e=>canMainAction(s,e.candidate.armyId)&&!s.endedArmyIds.includes(e.candidate.armyId)).map(e=>({armyId:e.candidate.armyId,action:null}));
        s.aiQueue.unshift(...order.map(x=>({...entries.find(e=>e.candidate.armyId===x.armyId),attack:true,plannedAction:x.action})));
        continue;
      }
      if(entry.factionId){
        aiStratagem(s,entry.factionId);startDiplomacyAi(s,entry.factionId,{autoPlayer:s.autoPlayer});aiRelationFeast(s,entry.factionId);if(explorationEnabled(s))resolveAiExploration(s,entry.factionId);
        selectAiOccupations(s,{autoPlayer:s.autoPlayer});
        startFactionPolicy(s,entry.factionId);for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===entry.factionId))aiStarAction(s,{cityId:c.cityId},entry.factionId);startFactionEffects(s,entry.factionId);startUniqueFaction(s,entry.factionId);startFactionMorale(s,entry.factionId);s=startCombatFire(s,entry.factionId);updateKnowledge(s);startFactionEvents(s,entry.factionId,{auto:true});s=strikeCampaignCities(s,entry.factionId);updateKnowledge(s);refreshCampaignSieges(s);
        aiTransferReserves(s,entry.factionId,getFactionView(s,entry.factionId),campaignAiSupplyWorld(s,entry.factionId));selectAiRoster(s,entry.factionId);selectCampaignAiJobs(s,entry.factionId);if(!campaignEconomyEnabled(s,entry.factionId))selectCityStartMuster(s,entry.factionId,campaignSiegeEnabled(s,entry.factionId)?campaignAiMusterTroop:null);checkDejaVuLocations(s);
        const plan=campaignAiPlan(s,entry.factionId,{remember:true,turnLimit:CAMPAIGN_TURN_LIMIT});
        const entries=(plan?.candidates??[]).filter(c=>!s.movedArmyIds.includes(c.armyId)).map(c=>({candidate:s.enemyPlans?.turn===s.turn?s.enemyPlans.entries.find(e=>e.armyId===c.armyId)?.candidate??c:c,faction:entry.factionId,...(supplyEnabled(s)||campaignTacticsEnabled(s,entry.factionId)?{targetCityId:c.aiTargetCityId??plan?.goal?.targetCityId??null}:{})}));
        s.aiQueue.unshift(...entries,...(campaignTacticsEnabled(s,entry.factionId)||campaignAiRule(s,entry.factionId,9)?[{tacticsFaction:entry.factionId,entries}]:[]));
        if(incremental)return s;
        continue;
      }
      const id=entry.candidate.armyId;
      if(s.armies[id]?.factionId!==entry.faction||!castleArmyActive(s,s.armies[id])||injuryReason(s,s.armies[id]?.commanderId))continue;
      if(!entry.attack&&canMainAction(s,id)&&s.armies[id].troopType==='catapult'){
        const action=campaignPlatformAiAction(s,getFactionView(s,entry.faction),id);
        if(action&&!platformActionReason(s,id,action.type)){executePlatformAction(s,id,action);if(incremental)return s;continue;}
        if(platformState(s.armies[id])==='DEPLOYED')entry.candidate={...entry.candidate,type:'HOLD',aiReferenceMove:false,aiTacticalMove:false};
      }
      if(withdrawalProtection(s,id)){if((!entry.attack||clockFood(s))&&!s.movedArmyIds.includes(id)){s=moveArmy(s,entry.candidate,entry.faction);s.movedArmyIds.push(id);}if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);if(incremental)return s;continue;}
      if(!entry.attack&&canMainAction(s,id)&&s.armies[id].c50?.engineId==='CHEOK'&&engineAiHold(s,id)){consumeMainAction(s,id);if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);if(incremental)return s;continue;}
      if(canMainAction(s,id)&&engineMapView(s,entry.faction).structures?.length){const publicWorld=campaignTacticsWorld(s,campaignTacticsView(s,entry.faction)),target=engineStructureTargets(publicWorld,id)[0];if(target&&!attackTargets(publicWorld,id).length){s=resolveStructureAttack(s,id,target);if(incremental)return s;continue;}}
      const engagedArcher=archerAttackReason(s,id)==='ARCHER_ENGAGED';
      if(engagedArcher&&canMainAction(s,id)){const option=disengageOptions(s,id).sort((a,b)=>Number(b.mode==='PUSH')-Number(a.mode==='PUSH'))[0];if(option){s=resolveDisengage(s,id,option.targetId,option.mode);if(incremental)return s;continue;}}
      if(platformState(s.armies[id])!=='DEPLOYED'&&!entry.candidate.aiCapitalDefense&&!entry.candidate.aiCityDefensePriority&&(!entry.attack||clockFood(s))&&!s.movedArmyIds.includes(id)&&canMainAction(s,id)){const action=supplyAiAction(s,id,campaignReachable(s,id,TICKS_PER_TURN),{foodAware:campaignFoodEconomyEnabled(s,entry.faction),publicWorld:clockFood(s)||campaignStrategyEnabled(s,entry.faction)||campaignFoodEconomyEnabled(s,entry.faction)?campaignAiSupplyWorld(s,entry.faction):null,targetCityId:entry.targetCityId,allowBuild:entry.candidate.type==='MOVE'&&!['REPLENISH_ARMY','MUSTER_SIEGE','DEFEND_DAMAGED_CITY','CAPITAL_GARRISON','INTERCEPT_CITY','EXPLORE_PLACE','OPERATION_ASSEMBLE','OPERATION_SUPPORT','OPERATION_ADVANCE','TACTICAL_CUT_HUB','TACTICAL_FLANK','TACTICAL_SCREEN','TACTICAL_RETREAT','TACTICAL_WAIT_SUPPORT'].includes(entry.candidate.reasonCode)});if(action){if(action.type==='BUILD_HUB'){beginHub(s,id);consumeMainAction(s,id);}else if(action.type==='MOVE')s=moveArmy(s,{armyId:id,...action},entry.faction);s.movedArmyIds.push(id);if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);if(incremental)return s;continue;}}
      const tactical=campaignTacticsEnabled(s,entry.faction),coordinated=campaignAiRule(s,entry.faction,9);
      if(engagedArcher&&!entry.attack&&!entry.candidate.aiTacticalMove&&!entry.candidate.aiCityDefensePriority){
        s.c23Stats??={archerBlocked:0,aiReorganizations:0};s.c23Stats.archerBlocked++;
        if(!s.movedArmyIds.includes(id)){
          const escape=campaignArcherEscape(s,id);
          if(escape)s=moveArmy(s,{armyId:id,type:'MOVE',destinationTileId:escape.tileId,pathTileIds:escape.route.pathTileIds},entry.faction);
          if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);
        }
        if(!tactical&&!coordinated)s.aiQueue.unshift({...entry,attack:true});if(incremental)return s;continue;
      }
      if(aiStarAction(s,{armyId:id},entry.faction)){if(canMainAction(s,id))s.aiQueue.unshift(entry);if(incremental)return s;continue;}
      if((s.armies[id].morale==='SHAKEN'||s.armies[id].formation!=='ORDERED')&&!regroupReason(s,id)&&canMainAction(s,id)){
        // Recovery used to consume every disordered turn before the tactical
        // W/E/R decision, even with a legal paid attack or morale release.
        const ready=tactical&&committedEnemyAction(s,id)===undefined?campaignChooseTacticalAction(s,entry.faction,id):null;
        if(ready?.type==='ENGINE_ACTION')s=resolveEngineAction(s,id,ready.action,ready.targetId);
        else if(ready?.type==='TACTIC'&&!tacticFailureReason(s,id,ready.traitId,ready.targetId))s=resolveTactic(s,id,ready.traitId,ready.targetId);
        else {changeMorale(s,id,'STEADY','재정비');changeFormation(s,id,campaignSubAbility(s,s.armies[id].commanderId,'지휘','수습')>=C12.recoveryThreshold?-2:-1);consumeMainAction(s,id);}
        if(canMainAction(s,id))s.aiQueue.unshift(entry);if(incremental)return s;continue;
      }
      if(entry.attack){
        const previousActions=s.armies[id].mainActionTurn===s.turn?s.armies[id].mainActionCount??0:0;
        const committed=committedEnemyAction(s,id);
        if(committed!==undefined){
          if(committed?.type==='ENGINE_ACTION')s=resolveEngineAction(s,id,committed.action,committed.targetId);
          else if(committed?.type==='TACTIC'&&!tacticFailureReason(s,id,committed.traitId,committed.targetId))s=resolveTactic(s,id,committed.traitId,committed.targetId);
          else if(committed?.type==='CITY')s=resolveCityAttack(s,id,committed.targetId);
          else if(committed?.type==='ATTACK')s=resolveAttack(s,id,committed.targetId);
        }else if(tactical){
          const action=campaignChooseTacticalAction(s,entry.faction,id,entry.candidate.aiDefendArmyId?{targetId:entry.candidate.aiDefendArmyId,defendGate:true}:entry.plannedAction,campaignTacticalOrderAllowed(entry.candidate)?entry.targetCityId:null);
          if(action?.type==='ENGINE_ACTION')s=resolveEngineAction(s,id,action.action,action.targetId);
          else if(action?.type==='TACTIC'&&!tacticFailureReason(s,id,action.traitId,action.targetId))s=resolveTactic(s,id,action.traitId,action.targetId);
          else if(action?.type==='CITY')s=resolveCityAttack(s,id,action.targetId);
          else if(action?.type==='ATTACK')s=resolveAttack(s,id,action.targetId);
        }else{
        const targets=attackTargets(s,id).map(targetId=>({targetId,p:previewAttack(s,id,targetId)}))
          .filter(x=>entry.candidate.reasonCode==='CAPITAL_GARRISON'||referenceAttackAllowed(s,entry.faction,id,x.targetId,x.p)).sort((a,b)=>aiAttackPriority(s,b.targetId,b.p,entry.faction)-aiAttackPriority(s,a.targetId,a.p,entry.faction)||a.targetId.localeCompare(b.targetId));
        const cityId=cityAttackTargets(s,id).sort((a,b)=>c22TargetWeight(s,entry.faction,s.cities[b].ownerFactionId)-c22TargetWeight(s,entry.faction,s.cities[a].ownerFactionId)||a.localeCompare(b))[0];
        const tactics=campaignTactics(s,id).map(c=>({...c,targets:c.targets.filter(target=>commonTacticAiUseful(s,id,c,target)&&(!campaignAiRule(s,entry.faction,6)||!tacticIsDamage(c)||!s.armies[target]||campaignAiExchange(previewTactic(s,id,c.traitId,target))>=.7))})).filter(c=>c.targets.length).sort((a,b)=>Number(tacticIsDamage(b))-Number(tacticIsDamage(a))||a.traitId.localeCompare(b.traitId));
        const damageTactics=tactics.filter(tacticIsDamage).flatMap(c=>c.targets.map(targetId=>({c,targetId,p:previewTactic(s,id,c.traitId,targetId)}))).sort((a,b)=>c22TargetWeight(s,entry.faction,s.armies[b.targetId]?.factionId)-c22TargetWeight(s,entry.faction,s.armies[a.targetId]?.factionId)||b.p.enemyLoss-a.p.enemyLoss||a.c.traitId.localeCompare(b.c.traitId)||a.targetId.localeCompare(b.targetId));
        const signature=tactics.find(c=>c.signature);
        if(entry.candidate.aiDefendArmyId&&targets.some(x=>x.targetId===entry.candidate.aiDefendArmyId))s=resolveAttack(s,id,entry.candidate.aiDefendArmyId);else if(cityId&&campaignAiRule(s,entry.faction,3))s=resolveCityAttack(s,id,cityId);else if(signature)s=resolveTactic(s,id,signature.traitId,signature.targets[0]);else if(damageTactics.length){const best=damageTactics[0];s=resolveTactic(s,id,best.c.traitId,best.targetId);}else if(cityId)s=resolveCityAttack(s,id,cityId);else if(targets.length)s=resolveAttack(s,id,targets[0].targetId);else if(tactics.length&&(inControlZone(s,s.armies[id])||tactics.some(c=>c33FormationCard(c))))s=resolveTactic(s,id,tactics[0].traitId,tactics[0].targets[0]);
        }
        if(combatCanPostMove(s,id)){const retreat=[...campaignReachable(s,id,TICKS_PER_TURN)].sort(([,x],[,y])=>y.totalTicks-x.totalTicks);if(retreat.length){s=moveArmy(s,{armyId:id,type:'MOVE',destinationTileId:retreat[0][0]},entry.faction);if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);}}
        if(canMainAction(s,id)&&s.armies[id].mainActionTurn===s.turn&&s.armies[id].mainActionCount>previousActions&&castleArmyActiveForAction(s,id))s.aiQueue.unshift({...entry,attack:true});
        else if(!s.endedArmyIds.includes(id)){if(s.armies[id].morale!=='ROUTING'){s.armies[id].braced=true;}s.endedArmyIds.push(id);}
      }else{
        // 정본 21 v0.4 §4: 교전 중인 AI 부대는 자리를 지키고 싸운다(동요 상태면 빠져서 수습).
        const inherited=sample4Pass(s,id);if(inherited){consumeMainAction(s,id);const target=sample4PublicAttacks(s,inherited)[0]?.targetId;if(target)s=resolveAttack(s,inherited,target);}
        let hold=!['REPLENISH_ARMY','MUSTER_SIEGE'].includes(entry.candidate.reasonCode)&&(cityAttackTargets(s,id).length>0||attackTargets(s,id).length>0||s.armies[id]&&inControlZone(s,s.armies[id])&&s.armies[id].morale==='STEADY');
        if((tactical&&(entry.candidate.aiTacticalMove||entry.candidate.type==='MOVE'&&!campaignTacticalOrderAllowed(entry.candidate)))||entry.candidate.aiReferenceMove)hold=false;
        const rival=!entry.candidate.aiCapitalDefense&&!entry.candidate.aiCityDefensePriority&&!entry.candidate.reasonCode?.startsWith('C31_')&&combatRule(s,id,'GRUDGE')&&combatRival(s,id);if(rival){const choices=[...campaignReachable(s,id,TICKS_PER_TURN)].filter(([to])=>combatMoveAllowed(s,id,to)).sort(([x],[y])=>hexDistance(s.tiles[x],s.tiles[rival.tileId])-hexDistance(s.tiles[y],s.tiles[rival.tileId])||x.localeCompare(y));if(choices.length){entry.candidate={...entry.candidate,type:'MOVE',destinationTileId:choices[0][0]};hold=false;}}
        if((hold||entry.candidate.type!=='MOVE')&&!s.movedArmyIds.includes(id)){const facingWorld=tactical?campaignTacticsWorld(s,campaignTacticsView(s,entry.faction)):s;const threats=Object.values(facingWorld.armies).filter(b=>diplomacyArmyHostile(facingWorld,id,b.armyId)&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1&&castleArmyActiveForAction(s,b.armyId)&&s.knowledge[s.armies[id].factionId].tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,s.armies[id].factionId)).map(b=>({targetId:b.armyId,p:previewAttackThreat(facingWorld,b.armyId,id)})).sort((a,b)=>b.p.enemyLoss-a.p.enemyLoss||a.targetId.localeCompare(b.targetId));if(threats.length)turnFacing(s,id,threats[0].targetId);}
        if(inherited)hold=true;if(!hold)s=moveArmy(s,entry.candidate,entry.faction);
        if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);
        if(!tactical&&!coordinated)s.aiQueue.unshift({...entry,attack:true});
      }
      if(incremental)return s;
      continue;
    }
    selectAiOccupations(s,{autoPlayer:s.autoPlayer});
    settleFatigue(s);settleEffects(s);
    s.globalTick+=TICKS_PER_TURN;s.turn++;s.turnNumber=s.turn;s.time.tick=0;advanceCombatFire(s);startDiplomacyTurn(s);
    for(const a of Object.values(s.armies))a.effectStates=(a.effectStates??[]).filter(e=>e.expiresTurn>=s.turn);
    s.currentDate=(s.turn-1)*DAYS_PER_TURN;s.turnPhase='PLANNING';
    settleInjury(s);settleRelationMonth(s);
    settleMorale(s);
    // Injury care can disband a still-observed field army at this boundary.
    // Refresh public observations before projecting the terminal settlement.
    updateKnowledge(s);
    refreshCampaignSieges(s);s=settleCampaignTurnEnd(s);settleOfficerTransfers(s);settleReserveTransfers(s);observeExistingMigration(s,migrationOpening);s=settleCampaignEconomy(s);settleStratagems(s);settleExploration(s,{autoPlayer:s.autoPlayer});settleCampaignEvents(s);settleCampaignOaths(s,applyDeckEffects,{endedTurn:s.turn-1});if(!s.gameResult)s=settleCampaignCaptives(s);settleAchievements(s);recoverCampaignCities(s);if(!s.gameResult&&s.turn>CAMPAIGN_TURN_LIMIT){const ranking=campaignTurnLimitRanking(s);s.gameResult={type:'TURN_LIMIT',winnerFactionId:ranking[0].factionId,ranking,reasonCode:'TURN_LIMIT_MOST_MAJOR_CITIES'};}settleOrders(s,{atEnd:true,endedTurn:s.turn-1});settleC31(s);s.remainingTicks=null;s.phase='PLAYER';s.movedArmyIds=Object.values(s.armies).filter(a=>a.bornTurn===s.turn).map(a=>a.armyId);s.attackedArmyIds=[];s.endedArmyIds=[...s.movedArmyIds];s.lastCombat=null;s.autoPlayer=false;
    if(!s.gameResult){startFactionPolicy(s,s.playerFactionId);startFactionEffects(s,s.playerFactionId);startUniqueFaction(s,s.playerFactionId);startFactionMorale(s,s.playerFactionId);s=startCombatFire(s,s.playerFactionId);updateKnowledge(s);startFactionEvents(s,s.playerFactionId);s=strikeCampaignCities(s,s.playerFactionId);updateKnowledge(s);refreshCampaignSieges(s);}startAmbitionTurn(s);startRunModifierTurn(s);updateKnowledge(s);checkDejaVuLocations(s);finishCampaignSummary(s);s.orderQueue=s.gameResult?[]:Object.keys(s.moveOrders??{}).filter(id=>s.armies[id]?.factionId===s.playerFactionId).sort();return s;
  }
}

export function step(state,command){
 if(command?.type==='REWIND_TURN'){validate(state);return validate(rewindTurn(state,command));}
 let next=stepImpl(state,command);finishHistory(next,campaignTurnLimitRanking(next));offerBlessing(next);
 if(next.phase==='PLAYER'&&!next.gameResult&&(next.turn!==state.turn||state.phase!=='PLAYER')){
  refreshEnemyPlans(next);rememberRewindStart(next);const start=next;
  if(!command?.incremental)while(next.orderQueue?.length&&!pendingCampaignDraft(next))next=advanceOrder(next);
  carryRewindStart(start,next);
 }
 // Ordinary UI acknowledgements and commands keep the same start memory.
 carryRewindStart(state,next);return recordFatigueReturns(next,state);
}
let councilStepDepth=0;
function stepImpl(state,command){if(command?.type==='MARK_SITUATION_LINE'){validate(state);const next=structuredClone(state);markSituationLine(next,command);return validate(next);}if(command?.type==='CLOSE_RELATION_SCENE'){validate(state);const next=structuredClone(state);if(next.relationScenes)next.relationScenes.active=null;return validate(next);}const next=stepCampaignInternal(state,command);observeCampaignOaths(next);ambitionStep(next);if(next.phase==='PLAYER'&&!next.gameResult&&(next.turn!==state.turn||state.phase!=='PLAYER'))startRelationScene(next);if(next.eventDeck&&next.phase==='PLAYER'&&!next.gameResult&&command?.type!=='EVENT_CHOICE')startFactionEvents(next,next.playerFactionId,{turnStart:false});validateCampaignEvents(next);validateAmbitions(next);return next;}
function stepCampaignInternal(state,command) {
  councilStepDepth++;
  try{
    const next=stepCommand(state,command);observeExistingMigration(next,state);rememberDiplomacyCombat(next,state);rememberExploration(next);settleRelationCaptiveReleases(next);if(['MOVE_UNIT','ADVANCE_ORDER','END_TURN','ADVANCE_AI','ATTACK_CITY','ATTACK_UNIT','USE_TACTIC','RECALL_UNIT','GARRISON'].includes(command?.type))checkDejaVuLocations(next);
    // An action can automatically call END_TURN. Observe the outer committed
    // action before expiring its resolution or opening the next month's council.
    if(councilStepDepth===1){observeCouncil(next,state,command);if(next.phase==='PLAYER'&&(next.turn!==state.turn||state.phase!=='PLAYER'))startCouncilTurn(next);}
    initializePlatforms(next);validateRelations(next);validateDejaVu(next);validateCouncil(next);return next;
  }finally{councilStepDepth--;}
}
function stepCommand(state,command) {
  validate(state);
  let next=structuredClone(state);
  if(next.armies[command?.armyId]?.c234?.extraTurn===next.turn&&['GARRISON','STAR_ACTION','BUILD_HUB','REPAIR_CITY','ATTACK_CITY','ATTACK_STRUCTURE','BRACE','REGROUP','RECALL_UNIT'].includes(command.type))throw new Error('S4_EXTRA_ACTION_ONLY_ATTACK_Q_W');
  if(command?.armyId&&!['GARRISON','WAIT_UNIT','BRACE_UNIT'].includes(command.type)){const reason=injuryReason(next,next.armies[command.armyId]?.commanderId);if(reason)throw new Error(reason);}
  if(command?.type==='CLOSE_SUMMARY'){if(next.turnSummary)next.turnSummary.open=false;return validate(next);}
  if(command?.type==='ADVANCE_AI'){
    if(next.gameResult||next.phase!=='AI')throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    return validate(run(next,true));
  }
  if(next.phase!=='PLAYER'||next.gameResult)throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
  if(command?.type==='CHOOSE_BLESSING'){chooseBlessing(next,command);return validate(next);}
  if(command?.type==='CHOOSE_AMBITION'){chooseAmbition(next,command);return validate(next);}
  if(command?.type==='CHOOSE_ORDER'){chooseOrder(next,command);return validate(next);}
  if(['COUNCIL_APPOINT','COUNCIL_DECIDE','COUNCIL_CLOSE'].includes(command?.type)){if(!next.council)startCouncilTurn(next);return validate(councilCommand(next,command));}
  if(['DIPLO_PROPOSE','DIPLO_RESPOND','DIPLO_END_ALLIANCE','DIPLO_GIFT'].includes(command?.type))return validate(diplomacyCommand(next,command));
  if(command?.type==='ACHIEVEMENT_CHOICE'){chooseAchievement(next,command);return validate(next);}
  if(command?.type==='EXPLORE_CHOICE'){chooseExploration(next,command);settleAchievements(next);updateKnowledge(next);return validate(next);}
  if(['FEAST','VISIT'].includes(command?.type))return validate(socialCommand(next,command));
  if(command?.type==='EVENT_CHOICE'){chooseCampaignEvent(next,command);queueCrisisCard(next);return validate(next);}
  if(command?.type==='END_TURN'&&next.c22?.pending[next.playerFactionId]){if(command.autoPlayer===true){resolveAiEvent(next,next.playerFactionId);queueCrisisCard(next);resolveAiEvent(next,next.playerFactionId);}else throw new Error('EVENT_PENDING');}
  if(['DRAFT_PICK','DRAFT_REROLL'].includes(command?.type)){
    next=command.type==='DRAFT_REROLL'?applyOrderReroll(next,command,applyCampaignDraftCommand):applyCampaignDraftCommand(next,command);
    if(command.type==='DRAFT_PICK')settleAchievements(next);
    return command.type==='DRAFT_PICK'?completePlayerAction(next,command):validate(next);
  }
  if(command?.type==='MODIFIER_REBIND'){if(pendingCampaignDraft(next))throw new Error('DRAFT_SELECTION_REQUIRED');if(tacticLoadoutReason(next,command.officerId))throw new Error('TACTIC_LOADOUT_LOCKED');c29Bind(next,command.officerId,command.modifierId,command.tacticId,{paid:true});return validate(next);}
  if(command?.type==='TACTIC_LOADOUT'){if(pendingCampaignDraft(next))throw new Error('DRAFT_SELECTION_REQUIRED');return validate(applyTacticLoadout(next,command));}
  if(pendingCampaignDraft(next)){
    if(command?.type==='END_TURN'&&command.autoPlayer===true)resolveCampaignAiDrafts(next,{autoPlayer:true});
    else throw new Error('DRAFT_SELECTION_REQUIRED');
  }
  if(command?.type==='QUEUE_MOVE'){
    const assigned=assignGroupDestinations(next,command.armyIds,command.destinationTileId);
    next.moveOrders??={};next.orderQueue??=[];
    for(const o of assigned){next.moveOrders[o.armyId]={destinationTileId:o.destinationTileId};if(!next.orderQueue.includes(o.armyId))next.orderQueue.push(o.armyId);}
    return validate(next);
  }
  if(command?.type==='CANCEL_MOVE'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_ORDER_UNITS');
    delete next.moveOrders?.[command.armyId];next.orderQueue=(next.orderQueue??[]).filter(id=>id!==command.armyId);return validate(next);
  }
  if(command?.type==='ADVANCE_ORDER')return validate(advanceOrder(next));
  if(next.orderQueue?.length)throw new Error('ORDER_EXECUTION_PENDING');
  if(command?.type==='CITY_GOVERNOR'){selectCampaignGovernor(next,command);if(domesticEngineEnabled(next)){clearDomesticOfficer(next,command.officerId);next.cities[command.cityId].absentGovernorId=null;}return validate(next);}
  if(command?.type==='CITY_DEPARTMENT')return validate(assignCityDepartment(next,command));
  if(command?.type==='TRANSFER_RESERVES')return validate(transferReserves(next,command));
  if(command?.type==='SWAP_ARMIES'){const from=next.armies[command.armyId]?.tileId,other=next.armies[command.otherArmyId]?.tileId;swapArmies(next,command);resolveForcedArrival(next,command.armyId,from);resolveForcedArrival(next,command.otherArmyId,other);updateKnowledge(next);return validate(next);}
  if(command?.type==='OFFICER_TRANSFER')return validate(transferCityOfficer(next,command));
  if(command?.type==='CITY_RESERVE_JOB')return validate(reserveCityJob(next,command));
  if(['CITY_POLICY','CITY_AUTO_DEPARTMENTS','CITY_FOOD_PRIORITY'].includes(command?.type)){
   const c=next.cities[command.cityId];if(!domesticEngineEnabled(next)||c?.ownerFactionId!==next.playerFactionId)throw new Error('INVALID_DOMESTIC_COMMAND');
   if(command.type==='CITY_POLICY'){if(!Object.hasOwn(CITY_POLICIES,command.policy))throw new Error('INVALID_CITY_POLICY');c.domesticPolicy=command.policy;}
   else {if(typeof command.enabled!=='boolean')throw new Error('INVALID_DOMESTIC_TOGGLE');c[command.type==='CITY_AUTO_DEPARTMENTS'?'autoDepartments':'foodPriority']=command.enabled;}
   return validate(next);
  }
  if(command?.type==='OCCUPATION_METHOD')return validate(selectOccupationMethod(next,command));
  if(command?.type==='CAPTIVE_ACTION')return validate(selectCaptiveAction(next,command));
  if(command?.type==='WANDERER_RECRUIT'){recruitWanderer(next,command);settleAchievements(next);return validate(next);}
  if(command?.type==='SORTIE'){if(next.officers[command.officerId]?.mainActionTurn===next.turn)throw new Error('MAIN_ACTION_USED');sortie(next,command);updateKnowledge(next);refreshCampaignSieges(next);return validate(next);}
  if(command?.type==='GARRISON'){if(armyActionEnded(next,command.armyId)||!canMainAction(next,command.armyId))throw new Error('MAIN_ACTION_USED');consumeMainAction(next,command.armyId);garrisonArmy(next,command.armyId);updateKnowledge(next);refreshCampaignSieges(next);return validate(next);}
  if(command?.type==='STAR_ACTION'){useStarAction(next,command);updateKnowledge(next);return command.armyId?completePlayerAction(next,command):validate(next);}
  if(command?.type==='CITY_TAX_ADVANCE'){const c=next.cities[command.cityId];if(!c||c.ownerFactionId!==next.playerFactionId)throw new Error('INVALID_C33_CITY');c33Tax(next,c,cityEconomyRates(next,c).production);if(c.currentProduction){const previousProduction=c.production;c.production=0;completeJob(next,c,{...cityEconomyRates(next,c),production:0},true);c.production=previousProduction;}return validate(next);}
  if(['CITY_ALT_PAYMENT','CITY_REVOKE_PRIVILEGE','CITY_REMOTE_RECRUIT'].includes(command?.type))return validate(domesticCommand(next,command,{costForJob:cityJobCost,finishJob:(s,c)=>completeJob(s,c,cityEconomyRates(s,c),true),recruit:recruitWanderer,recruitCost:cityRecruitCost}));
  if(command?.type==='STRATAGEM')return validate(resolveStratagem(next,command));
  if(command?.type==='CITY_JOB')return validate(selectCityJob(next,command));
  if(command?.type==='BUILD_HUB'){const a=next.armies[command.armyId];if(a?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId)||!canMainAction(next,command.armyId))throw new Error('거점을 지을 행동이 남아 있지 않습니다.');beginHub(next,command.armyId);consumeMainAction(next,command.armyId);if(!next.endedArmyIds.includes(command.armyId))next.endedArmyIds.push(command.armyId);return completePlayerAction(next,command);}
  if(command?.type==='FACE'){
    const a=next.armies[command.armyId];if(a?.factionId!==next.playerFactionId||!castleArmyActiveForAction(next,command.armyId)||armyActionEnded(next,command.armyId)||next.movedArmyIds.includes(command.armyId)||!Number.isInteger(command.facing)||command.facing<0||command.facing>5)throw new Error('INVALID_CAMPAIGN_FACE');
    a.facing=command.facing;next.movedArmyIds.push(command.armyId);return validate(next);
  }
  if(command?.type==='REPAIR_CITY'){
    const id=command.armyId,a=next.armies[id];if(a?.factionId!==next.playerFactionId)throw new Error('내 공병대만 명령할 수 있습니다');
    const reason=repairCityActionReason(next,id);if(reason)throw new Error(reason);
    const c=Object.values(next.cities).find(c=>c.ownerFactionId===a.factionId&&c.tileId===a.tileId);
    c.durability=Math.min(c.durabilityMax,c.durability+C217.troops.engineer.rules.repairAction.durability);
    consumeMainAction(next,id);return completePlayerAction(next,command);
  }
  if(['DEPLOY','STOW'].includes(command?.type)){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('내 투석기만 명령할 수 있습니다');
    const reason=platformActionReason(next,command.armyId,command.type);if(reason)throw new Error(reason);
    executePlatformAction(next,command.armyId,command);return completePlayerAction(next,command);
  }
  if(command?.type==='MOVE_UNIT'){
    if(command.path!==undefined)movementInputRoute(next,command);
    const reason=diplomacyMoveReason(next,command.armyId,command.destinationTileId);if(reason)throw new Error(reason);
    if(!campaignMoveOptions(next,command.armyId).some(o=>o.tileId===command.destinationTileId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    delete next.moveOrders?.[command.armyId];
    next.autoPlayer=false;
    next=moveArmy(next,{armyId:command.armyId,type:'MOVE',destinationTileId:command.destinationTileId,...(command.path!==undefined?{path:command.path}:{})},next.playerFactionId);
    if(!next.movedArmyIds.includes(command.armyId))next.movedArmyIds.push(command.armyId);
    return completePlayerAction(next,command);
  }
  if(command?.type==='ATTACK_CITY'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_CITY_ATTACK');
    next=resolveCityAttack(next,command.armyId,command.cityId);return completePlayerAction(next,command);
  }
  if(command?.type==='USE_TACTIC'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_TACTIC');
    next=resolveTactic(next,command.armyId,command.traitId,command.targetId);return completePlayerAction(next,command);
  }
  if(command?.type==='ATTACK_STRUCTURE'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_STRUCTURE_ATTACK');
    next=resolveStructureAttack(next,command.armyId,command.targetId);return completePlayerAction(next,command);
  }
  if(command?.type==='ENGINE_ACTION'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_ENGINE_ACTION');
    next=resolveEngineAction(next,command.armyId,command.action,command.targetId,command);return completePlayerAction(next,command);
  }
  if(command?.type==='ATTACK_UNIT'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_ATTACK');
    next=resolveAttack(next,command.armyId,command.targetId);
    return completePlayerAction(next,command);
  }
  if(command?.type==='DISENGAGE'){
    if(next.phase!=='PLAYER'||next.armies[command.armyId]?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    next=resolveDisengage(next,command.armyId,command.targetId,command.mode);return completePlayerAction(next,command);
  }
  if(['BRACE','REGROUP'].includes(command?.type)){
    const a=next.armies[command.armyId];
    if(a?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    if(!canMainAction(next,command.armyId))throw new Error('MAIN_ACTION_USED');
    if(command.type==='REGROUP'){const reason=regroupReason(next,command.armyId);if(reason)throw new Error(reason);changeMorale(next,command.armyId,'STEADY','재정비');changeFormation(next,command.armyId,campaignSubAbility(next,a.commanderId,'지휘','수습')>=C12.recoveryThreshold?-2:-1);}
    else a.braced=true;
    c34Wait(next,command.armyId,command.type);consumeMainAction(next,command.armyId);return completePlayerAction(next,command);
  }
  if(command?.type==='WAIT_UNIT'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    sample4Pass(next,command.armyId,command.targetId);c34Wait(next,command.armyId,command.type);consumeMainAction(next,command.armyId);if(!next.endedArmyIds.includes(command.armyId))next.endedArmyIds.push(command.armyId);return completePlayerAction(next,command);
  }
  if(command?.type==='RECALL_UNIT'){
    const diploReason=diplomacyMoveReason(next,command.armyId,recallDestination(next,command.armyId));if(diploReason)throw new Error(diploReason);
    const id=command.armyId;if(next.armies[id]?.factionId!==next.playerFactionId)throw new Error('INVALID_RECALL');
    const reason=recallReason(next,id);if(reason)throw new Error(reason);
    const from=next.armies[id].tileId;next.armies[id].tileId=recallDestination(next,id);next.armies[id].currentOrder=null;next.armies[id].movementState=null;delete next.moveOrders?.[id];consumeMainAction(next,id);updateKnowledge(next);next=resolveOverwatch(next,id,from);refreshCampaignSieges(next);return completePlayerAction(next,command);
  }
  if(command?.type!=='END_TURN')throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
  closeCouncil(next);next.autoPlayer=command.autoPlayer===true;finishAmbitionPlayerTurn(next,{autoPlayer:next.autoPlayer});finishBlessingPlayerTurn(next);
  if(next.autoPlayer)resolveCampaignAiDrafts(next,{autoPlayer:true});
  finishDiplomacyPlayerTurn(next,{autoPlayer:next.autoPlayer});finishFactionRules(next,next.playerFactionId);beginCampaignSummary(next);
  next.phase='AI';next.remainingTicks=TICKS_PER_TURN;
  next.aiQueue=Object.keys(next.factions).filter(id=>next.autoPlayer||id!==next.playerFactionId).sort().map(factionId=>({factionId}));
  return validate(command.incremental?next:run(next));
}
function advanceOrder(s){
 const id=s.orderQueue?.shift();if(!id)return s;
 const o=s.moveOrders?.[id];if(!o)return s;
 const log=text=>{s.orderLog??=[];s.orderLog.push({turn:s.turn,armyId:id,text:`${s.officers[s.armies[id].commanderId].name}: ${text}`});delete s.moveOrders[id];};
 if(s.armies[id].tileId===o.destinationTileId){log('목적지 도착');return s;}
 if(!orderEligible(s,id)){log('이동 막힘');return s;}
 const to=orderSegment(s,id,o.destinationTileId),from=s.armies[id].tileId;
 if(!to){log('이동 막힘');return s;}
 s=moveArmy(s,{armyId:id,type:'MOVE',destinationTileId:to},s.playerFactionId);
 s.movedArmyIds.push(id);
 if(s.armies[id].tileId===o.destinationTileId)log('목적지 도착');
 else if(s.armies[id].tileId!==to||s.armies[id].tileId===from||!orderRoute(s,id,o.destinationTileId)||!orderSegment(s,id,o.destinationTileId))log('이동 막힘');
 return s;
}
function completePlayerAction(next,command){
  updateKnowledge(next);refreshCampaignSieges(next);
  if(!next.manualEndTurn&&!next.orderQueue?.length&&!pendingCampaignDraft(next)&&!next.c22?.pending[next.playerFactionId]&&allPlayerActionsEnded(next))return step(next,{type:'END_TURN',incremental:command.incremental});
  return validate(next);
}

export function serialize(state) {
  validate(state);
  const savedState={...state,campaignGrowth:campaignGrowthForSave(state)};
  if(savedState.manualEndTurn!==true)delete savedState.manualEndTurn;
  return JSON.stringify({format: FORMAT, version: VERSION, state:savedState});
}

export function deserialize(text) {
  if (typeof text !== 'string' || text.length > 8_000_000) throw new Error('저장 크기가 올바르지 않습니다.');
  const saved = JSON.parse(text);
  if (saved?.format !== FORMAT || saved.version !== VERSION) throw new Error('지원하지 않는 캠페인 저장입니다.');
  const state=saved.state;
  if(state)initializeRunModifiers(state,{legacy:true});
  if(state?.manualEndTurn===false)delete state.manualEndTurn;
  if(state){
    for(const c of Object.values(state.cities??{})){
      for(const f of c.facilities??[])if(f.kind==='naval')f.kind='mufu';
      if(c.currentProduction?.kind==='naval')c.currentProduction.kind='mufu';
      if(c.jobProgress?.naval!==undefined){c.jobProgress.mufu=c.jobProgress.naval;delete c.jobProgress.naval;}
    }
    for(const u of state.c20?.unlocks??[])if(u.kind==='naval')u.kind='mufu';
    for(const a of Object.values(state.armies??{}))delete a.navalTurn;
  }
  if((state?.mapId??'v1')==='v1'&&text.length>2_000_000)throw new Error('CAMPAIGN_SAVE_TOO_LARGE');
  if(state)state.mapId??='v1';
  // C145: absent model is upkeep (foodModel reads it); retain old save shape/names.
  // C1 used the same single slot before execution sidecars existed.
  if(state&&state.personnel===undefined){
    if(state.pendingBattle||state.terminal||state.campaignTerminalWorld)throw new Error('CAMPAIGN_SAVE_PERSONNEL_REQUIRED');
    Object.assign(state,{personnel:campaignPersonnel(state),remainingTicks:null,
      battleSequence:0,terminal:null,occupations:{}});
  }
  if(state&&state.phase===undefined){
    if(state.remainingTicks!==null)throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    Object.assign(state,{phase:'PLAYER',movedArmyIds:[],aiQueue:[],cityDisplayNames:initialCityNames()});
  }
  if(state&&!Object.values(state.cities).every(c=>c.footprint))initializeCampaignCastles(state);
  if(state?.pendingBattle)throw new Error('전술 전투 중인 구형 저장은 지도 전투로 변환할 수 없습니다. 기존 저장은 보존됩니다.');
  if(state){delete state.pendingBattle;state.attackedArmyIds??=[];state.endedArmyIds??=[];initializeCampaignEconomy(state);for(const a of Object.values(state.armies)){if(typeof a.morale!=='string')a.morale='STEADY';a.braced??=false;}applyCampaignVision(state);}
  if(state&&Object.values(state.cities).some(c=>c.durability===undefined||c.durabilityMax===undefined))initializeCampaignCastles(state);
  state.moveOrders??={};state.orderQueue??=[];state.orderLog??=[];
  discardLegacyClasses(state);configureRosterDomestic();restoreCampaignAmbitions(state);initializeSituations(state);
  initializeInjury(state);initializeSupply(state);initializeDiplomacy(state);initializeDejaVu(state);initializeRelations(state);restoreCampaignGrowth(state);initializeArmyFacing(state);initializeCampaignGrowth(state);initializeEngines(state);initializeCampaignEffects(state);initializeCampaignOccupation(state);initializeCampaignCaptives(state);initializeCampaignPolicy(state);initializeCampaignEvents(state);initializeDomestic(state);
  if(state.c31Disabled===undefined&&!state.c31&&(state.c22?.crisisStartedTurn!=null||state.c22?.fired?.some(e=>e.eventId==='CRISIS_HEGEMONY')))state.c31Disabled=true;
  initializeCombatFire(state,{recordWind:state.c182RulesVersion!==1});c31Sync(state);initializeC30(state);if(state.c30&&!Object.keys(state.c30.factions).length)c30Start(state,state.activeFactionId??state.playerFactionId);initializeExploration(state);if(state.council===undefined){initializeCouncil(state);startCouncilTurn(state);}
  const oldArmyStructure=state.mapId!=='v1'&&state.c169aVersion!==1;
  normalizeCampaignTroopNames(state);migrateArmyStructure(state);
  if(oldArmyStructure){updateKnowledge(state);refreshCampaignSieges(state);}
  // Old C173 saves adopt the corrected visibility once. Current saves retain
  // observation timestamps/discovery while dropping newly obstructed tiles.
  const migrateVisibility=state.mapId!=='v1'&&state.c182RulesVersion!==1;
  const currentKnowledge=structuredClone(state.knowledge);updateKnowledge({...state,knowledge:currentKnowledge});
  if(migrateVisibility){state.knowledge=currentKnowledge;state.c182RulesVersion=1;}
  else {
   const distanceKnowledge=structuredClone(state.knowledge);updateKnowledge({...state,knowledge:distanceKnowledge,mapRules:{...state.mapRules,vision:{...state.mapRules.vision,profile:'C173_DISTANCE_ONLY'}}});
   for(const [fid,k] of Object.entries(state.knowledge)){
    for(const [tile,visibility] of Object.entries(k.tiles))if(visibility==='VISIBLE'&&distanceKnowledge[fid].tiles[tile]==='VISIBLE'&&currentKnowledge[fid].tiles[tile]!=='VISIBLE')k.tiles[tile]='REMEMBERED';
    for(const [id,a] of Object.entries(k.observedArmies))if(k.tiles[a.tileId]!=='VISIBLE')delete k.observedArmies[id];
   }
  }
  return structuredClone(validate(state));
}

export function beginCampaignSummary(s){s.summaryStart={sequence:s.battleSequence,administration:(s.administrationLog??[]).map(e=>JSON.stringify(e)),cities:Object.fromEntries(Object.values(s.cities).map(c=>[c.cityId,c.ownerFactionId])),levels:Object.fromEntries(Object.keys(s.officers).map(id=>[id,campaignOfficerGrowth(s,id)?.level??1])),captives:Object.fromEntries(Object.values(s.officers).map(o=>[o.officerId,o.captivityState]))};}
export function finishCampaignSummary(s){
 const start=s.summaryStart;if(!start)return;const items=[];
 const add=(kind,text)=>items.push({kind,text});
 // 내 세력이 관련된 일만, 읽히는 문장으로(공격자 → 대상: 손실).
 const who=id=>s.officers[s.armies[id]?.commanderId]?.name??'부대',city=id=>s.cityDisplayNames?.[id]??s.cities[id]?.name??'성';
 const mine=id=>s.armies[id]?.factionId===s.playerFactionId,faction={F01:'조조군',F02:'유비군',F03:'손권군'};
 for(const e of s.combatLog??[]){
  if(e.sequence<=start.sequence)continue;
  const loss=e.enemyLoss??e.dealt??0;
  if(mine(e.attackerId)||mine(e.targetId))for(const line of e.effectLines??[])if(line.includes(' \u2014 '))add('ATTACK',line);
  if(e.kind==='CITY_STRIKE'){if(mine(e.targetId)||s.cities[e.cityId]?.ownerFactionId===s.playerFactionId)add('ATTACK',`${city(e.cityId)} 성 사격 → ${who(e.targetId)} ${troopDelta(-loss)}`);continue;}
  if(e.kind==='CITY'){if(mine(e.attackerId)||s.cities[e.cityId]?.ownerFactionId===s.playerFactionId)add('ATTACK',`${who(e.attackerId)} → ${city(e.cityId)} 성: 내구 −${loss}`);continue;}
  if(!mine(e.attackerId)&&!mine(e.targetId))continue;
  if(e.side==='REAR')add('ATTACK',`${who(e.attackerId)} 후방 공격`);else if(e.side==='FLANK')add('ATTACK',`${who(e.attackerId)} 측면 공격`);if(e.charge)add('ATTACK',`${who(e.attackerId)} 돌격`);for(const f of e.formationChanges??[])if(f.to==='BROKEN')add('ATTACK',`${who(f.armyId)} 전열 붕괴`);
  if(e.kind==='PURSUIT'){add('ATTACK',`${who(e.attackerId)} 추격 → ${who(e.targetId)} ${troopDelta(-loss)}`);continue;}
  add('ATTACK',`${who(e.attackerId)} → ${who(e.targetId)}${e.kind==='TACTIC'&&e.tacticName?` (전법 ${e.tacticName})`:''}: ${who(e.targetId)} ${troopDelta(-loss)}${e.allyLoss?`, ${who(e.attackerId)} ${troopDelta(-e.allyLoss)}`:''}`);
 }
 for(const c of Object.values(s.cities)){if(start.cities[c.cityId]!==c.ownerFactionId)add('CAPTURE',(s.combatLog??[]).findLast(e=>e.cityId===c.cityId&&e.captureLine&&e.sequence>start.sequence)?.captureLine??`${city(c.cityId)} 함락 — ${faction[c.ownerFactionId]??c.ownerFactionId}`);if(c.ownerFactionId===s.playerFactionId)for(const cause of c.economyCauses??[])if(cause.label==='유지비 미지급')add('FOOD_SHORTAGE',`${city(c.cityId)}: 식량 부족 ${cause.amount}`);}
 for(const e of s.administrationLog??[])if(!start.administration.includes(JSON.stringify(e))&&(!e.factionId||e.factionId===s.playerFactionId))add(e.text.includes('치안')?'SECURITY':'OCCUPATION',e.text);
 for(const o of Object.values(s.officers)){const level=campaignOfficerGrowth(s,o.officerId)?.level??1;if(o.allegianceFactionId===s.playerFactionId&&level>start.levels[o.officerId])add('LEVEL_UP',`${o.name}: 레벨업 ${level}`);if(o.captivityState!==start.captives[o.officerId])add('CAPTIVE',`${o.name}: ${({PRISONER:'포로로 잡힘',FREE:'풀려남'})[o.captivityState]??o.captivityState}`);}
 s.turnSummary={turn:s.turn,open:items.length>0,items};delete s.summaryStart;
}

// Explicit opt-in only; creation and migration never call this function.
export function addCampaignOfficer(state,id,placement){
 if(!['v2','v3'].includes(state.mapId))throw new Error('C34_MAP_REQUIRED');
 if(state.officers[id]||state.wanderers?.[id]||state.campaignGrowth.officers[id])throw new Error('C34_DUPLICATE_OFFICER');
 const wanderer=Object.hasOwn(placement??{},'wandererCityId');
 const keys=Object.keys(placement??{}).sort().join(',');
 if(keys!==(wanderer?'wandererCityId':'cityId,factionId'))throw new Error('C34_PLACEMENT_REQUIRED');
 const cityId=wanderer?placement.wandererCityId:placement.cityId,factionId=wanderer?null:placement.factionId;
 if(!state.cities[cityId]||!wanderer&&(!state.factions[factionId]||state.cities[cityId].ownerFactionId!==factionId))throw new Error('C34_INVALID_PLACEMENT');
 const s=structuredClone(state),pack=campaignOfficerPack(id),o=officerFromPack(s,pack,factionId,cityId);
 s.officers[id]=o;
 if(wanderer){s.wanderers??={};s.wanderers[id]=o;}else s.factions[factionId].officerIds.push(id);
 initializeCampaignGrowth(s,{[id]:pack});
 if(wanderer)delete s.officers[id];
 initializeRelations(s,id);
 if(s.terminal&&!wanderer){s.terminal.officerOrder.push(id);s.terminal.officerOrder.sort();s.terminal.officersById[id]={officerId:id,allegianceFactionId:factionId,lifeState:'ALIVE',captivityState:'FREE',captorFactionId:null,assignment:{kind:'NONE',id:null}};}
 syncCampaignAdministrativeTerminal(s);
 return validate(s);
}

function sample4PublicAttacks(s,id){
 const w=campaignTacticsWorld(s,campaignTacticsView(s,s.armies[id].factionId));if(!w)return [];
 return attackTargets(w,id).map(targetId=>({targetId,loss:previewAttack(w,id,targetId).enemyLoss})).sort((a,b)=>b.loss-a.loss||a.targetId.localeCompare(b.targetId));
}
