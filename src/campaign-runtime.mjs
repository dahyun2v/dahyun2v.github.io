import diplomacyAxes from '../../docs/design-data/diplomacy-axes-v0.1.json' with {type:'json'};
import {initializeCouncil,startCouncilTurn,councilCommand,closeCouncil,observeCouncil,validateCouncil} from './campaign-council.mjs';
import {initializeInjury,validateInjury,settleInjury,injuryView,injuryRecent,injuryReason,injuryEnabled} from './campaign-injury.mjs';
import {initializeFatigue,validateFatigue,settleFatigue,fatigueView} from './campaign-fatigue.mjs';
import {configureSupply,initializeSupply,supplyEnabled,supplyView,supplyLink,supplyHubsView,beginHub,captureHubs,supplyAiAction} from './campaign-supply.mjs';
import {configureDiplomacy,initializeDiplomacy,validateDiplomacy,diplomacyEnabled,diplomacyView,diplomacyCommand,startDiplomacyTurn,startDiplomacyAi,finishDiplomacyPlayerTurn,rememberDiplomacyCombat,diplomacyMoveReason,withdrawalProtection,diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {initializeExploration,validateExploration,rememberExploration,settleExploration,explorationEnabled,explorationView,chooseExploration,resolveAiExploration} from './campaign-exploration.mjs';
import {initializeDejaVu,validateDejaVu,checkDejaVuLocations,dejaVuView,dejaVuEnabled} from './campaign-deja-vu.mjs';
import {settleRelationCaptiveReleases,initializeRelations,validateRelations,relationsView,socialCommand,settleRelationMonth,aiRelationFeast} from './campaign-relations.mjs';
import {campaignBannerView,campaignShownScale,uniqueProgress} from './campaign-rule-registry.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {campaignOfficerPack} from './campaign-officers-51-100.mjs';
import {applyOfficerDraft} from './campaign-officer-draft.mjs';
import {officerFromPack} from './campaign-roster.mjs';
import {c34Wait,c34KnownTraits} from './campaign-c34.mjs';
import {healCampaignTroops} from './campaign-effects.mjs';
import {attackDirection} from './campaign-abilities.mjs';
import {initializeClasses,validateClasses,classView,classesEnabled,classWait,startClasses,classPostMove,armyClass,countClass,classFireStop} from './campaign-classes.mjs';
import {c33Tax,c33TaxReason,c33Owned,c33FormationCard} from './campaign-rule-registry.mjs';
import {settleC31,c31View,validateC31,c31Sync,c31Muster} from './campaign-events.mjs';
import {initializeC30,c30Start,c30View} from './campaign-c29.mjs';
import {c29Bind,c29Record,c29Hidden,c29Aw} from './campaign-c29.mjs';
import {configureRosterDomestic} from './campaign-roster.mjs';
import {uniqueRevealedWanderers} from './campaign-rule-registry.mjs';
import {startUniqueFaction} from './campaign-combat.mjs';
import {domesticCommands,domesticCommand,domesticMusterReason,domesticGranaryView,initializeDomestic,combatRule,combatCanPostMove,combatRival,combatMoveAllowed,combatMovement} from './campaign-rule-registry.mjs';
import {cityJobCost} from './campaign-economy.mjs';
import {cityRecruitCost} from './campaign-policy.mjs';
import {parentTroop,troopInfo,validateSpecialTroops,c24Enabled} from './campaign-special-troops.mjs';
import {archerAttackReason} from './campaign-abilities.mjs';
import {initializeCampaignEvents,validateCampaignEvents,startFactionEvents,settleCampaignEvents,chooseCampaignEvent,resolveAiEvent,queueCrisisCard,campaignEventsView,c22TargetWeight} from './campaign-events.mjs';
import {specialistView,validateSpecialists} from './campaign-economy.mjs';
import {C20_FACILITIES,validateCampaignPolicy,initializeCampaignPolicy,startFactionPolicy,campaignPolicyView,useStarAction,aiStarAction,starAction} from './campaign-policy.mjs';
import {validateCampaignResearch,cityDurabilityMaximum,campaignResearchView,initializeCampaignRoster,musterTroopOptions,freeCityOfficers,garrisonArmy,initializeCityStart,recruitWanderer,selectAiRoster,selectCityStartMuster} from './campaign-roster.mjs';
import {C12,initializeCampaignAbilities,initializeArmyFacing,directionToward,campaignSubAbility,changeFormation,turnFacing} from './campaign-abilities.mjs';
import {assignGroupDestinations,orderRoute,orderSegment,orderEligible} from './campaign-orders.mjs';
import {initializeCampaignEffects,startFactionEffects,settleEffects,campaignTactics,tacticIsDamage,unitStatuses,consumeMainAction,canMainAction,finishFactionRules,hasCampaignRule,recallReason,recallDestination,ambushHidden,commonTacticAiUseful} from './campaign-effects.mjs';
import {campaignReachable,campaignPath,inControlZone,gateMorale,startFactionMorale,settleMorale,regroupReason,changeMorale,checkMorale} from './campaign-morale.mjs';
import {initializeCampaignCastles,refreshCampaignSieges,castleArmyActive,campaignMovementWorld,campaignCenterEntryAllowed} from './campaign-city-footprint.mjs';
import {campaignScenario,campaignFingerprint,campaignMapData} from './campaign-scenario.mjs';
import initialData from '../../docs/design-data/first3-initial-state-v1.json' with {type: 'json'};
import {createWorldState, selectPlayerFaction, validateState,
  TICKS_PER_TURN, DAYS_PER_TURN} from './first3.mjs';
import {getFactionView} from './knowledge.mjs';
import {updateCampaignKnowledge as updateKnowledge} from './campaign-vision.mjs';
import {tileId,hexDistance} from './map-primitives.mjs';
import {findPath,issueOrder,moveOneTick} from './movement.mjs';
import {selectCampaignAiJobs,campaignAiPlan} from './campaign-strategic-bridge.mjs';
import {cityAttackTargets,resolveOverwatch,resolveTactic,resolveCityAttack,strikeCampaignCities,recoverCampaignCities,attackTargets,previewTactic,previewAttackThreat,previewAttack,resolveAttack,resolvePursuit,resolveApproachFire,approachFireStart,armyActionEnded,allPlayerActionsEnded} from './campaign-combat.mjs';
import {applyCampaignVision} from './campaign-vision.mjs';
import {campaignPersonnel,settleCampaignPayloads,settleCampaignTurnEnd} from './campaign-result-bridge.mjs';
import {validatePersonnelLedger} from './military-personnel-ledger.mjs';
import {validateCampaignTerminalState} from './campaign-terminal-state.mjs';
import {validateCampaignTerminalWorldApplication} from './campaign-terminal-world-application.mjs';
import {initializeCampaignEconomy,settleCampaignEconomy,selectCityJob,facilityDisabled,cityEconomyRates,cityJobList,completeJob,legacyGovernorValidationView} from './campaign-economy.mjs';
import {campaignGrowthForSave,restoreCampaignGrowth,initializeCampaignGrowth,validateCampaignGrowth,pendingCampaignDraft,applyCampaignDraftCommand,resolveCampaignAiDrafts,campaignOfficerGrowth,applyTacticLoadout,tacticLoadoutReason} from './campaign-growth.mjs';

import {initializeCampaignOccupation,occupationDisplay,selectOccupationMethod,selectAiOccupations,selectCampaignGovernor} from './campaign-occupation.mjs';
import {initializeCampaignCaptives,campaignCaptives,selectCaptiveAction,settleCampaignCaptives,validateCampaignAdministration} from './campaign-captives.mjs';

configureDiplomacy({movementWorld:campaignMovementWorld,armyActive:castleArmyActive,subAbility:campaignSubAbility,movement:combatMovement,cityRates:cityEconomyRates});

configureSupply({active:castleArmyActive,movement:(s,id)=>({...s,armies:{...s.armies,[id]:{...s.armies[id],troopType:parentTroop(s.armies[id].troopType)}}}),morale:checkMorale});

// 지금은 26턴, 나중에 늘림.
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
    return {factionId:f.factionId,...(s.mapId!=='v1'?{majorCities:cities.filter(c=>c.kind==='major').length,minorCities:cities.filter(c=>c.kind==='minor').length}:{cities:cities.length}),troops:Object.values(s.armies).filter(a=>a.factionId===f.factionId&&active(s,a.armyId)).reduce((n,a)=>n+a.troopCount,0)+cities.reduce((n,c)=>n+c.reserveTroops,0)};
  }).sort((a,b)=>(b.majorCities??b.cities)-(a.majorCities??a.cities)||(b.minorCities??0)-(a.minorCities??0)||b.troops-a.troops||a.factionId.localeCompare(b.factionId));
}
function validate(state) {
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
  // The turn limit is a campaign result; FIRST3's terminal sidecar keeps its original schema.
  if(state.gameResult?.type==='TURN_LIMIT'){
    const r=state.gameResult,ranking=campaignTurnLimitRanking(state);
    if(state.globalTick!==CAMPAIGN_TURN_LIMIT*TICKS_PER_TURN||state.turn!==CAMPAIGN_TURN_LIMIT+1||state.phase!=='PLAYER'||r.reasonCode!=='TURN_LIMIT_MOST_MAJOR_CITIES'||r.winnerFactionId!==ranking[0]?.factionId||JSON.stringify(r.ranking)!==JSON.stringify(ranking)||Object.keys(r).sort().join(',')!=='ranking,reasonCode,type,winnerFactionId')throw new Error('INVALID_CAMPAIGN_TURN_LIMIT_RESULT');
    legacy.gameResult=null;
  }
  for(const a of Object.values(state.armies))if(!['STEADY','SHAKEN','ROUTING'].includes(a.morale)||typeof a.braced!=='boolean')throw new Error('INVALID_CAMPAIGN_MORALE');
  for(const a of Object.values(state.armies))if(!Number.isInteger(a.facing)||a.facing<0||a.facing>5||!['ORDERED','DISORDERED','BROKEN'].includes(a.formation)||!Number.isSafeInteger(a.movedTiles)||a.movedTiles<0||a.morale==='ROUTING'&&a.formation!=='BROKEN')throw new Error('INVALID_CAMPAIGN_FORMATION');
  validateSpecialTroops(state);validateSpecialists(state);
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
  if(state.terminal){validateCampaignTerminalState(state.terminal,terminalOptions);validateCampaignTerminalWorldApplication(state.gameResult?.type==='TURN_LIMIT'?{...state,gameResult:null}:state,state.terminal,terminalOptions);}
  if(state.moveOrders!==undefined){
    if(!state.moveOrders||Array.isArray(state.moveOrders)||!Array.isArray(state.orderQueue)||!Array.isArray(state.orderLog)||new Set(state.orderQueue).size!==state.orderQueue.length||state.orderQueue.some(id=>!state.moveOrders[id]))throw new Error('INVALID_CAMPAIGN_ORDERS');
    for(const [id,o] of Object.entries(state.moveOrders))if(!state.armies[id]||(state.mapId==='v1'&&state.armies[id].factionId!==state.playerFactionId)||!state.factions[state.armies[id].factionId]||!state.tiles[o?.destinationTileId])throw new Error('INVALID_CAMPAIGN_ORDERS');
  }
  validateCampaignResearch(state);validateCampaignPolicy(state);validateCampaignEvents(state);
  validateInjury(state);validateFatigue(state);validateCampaignGrowth(state);validateC31(state);validateClasses(state);validateRelations(state);validateDejaVu(state);
  validateCampaignAdministration(state);validateExploration(state);validateDiplomacy(state);validateCouncil(state);
  return state;
}

export function createCampaign({factionId = 'F01', seed = 190919, map:mapId = 'v3', c31=true, c37=true, c42=true, c43=true, c45=true,c46=true,council=true, companions, fieldArmies=true, manualEndTurn=false, trialRules} = {}) {
  const {map,initialData,movementData}=campaignScenario(mapId);
  const world = selectPlayerFaction(createWorldState({map, initialData, movementData, seed}), factionId);
  if(trialRules!==undefined)world.trialRules=structuredClone(trialRules);
  if(!c43&&mapId!=='v1')world.c43Disabled=true;
  if(!c42)world.c42Disabled=true;
  if(!c37)world.c37Disabled=true;initializeCampaignAbilities(world);initializeClasses(world);
  initializeCampaignCastles(world);
  for(const a of Object.values(world.armies)){a.morale='STEADY';a.braced=false;}
  initializeArmyFacing(world);applyCampaignVision(world);if(mapId!=='v1')refreshCampaignSieges(world);
  const result=startFactionEffects(initializeCampaignEffects(initializeCampaignCaptives(initializeCampaignOccupation(initializeCampaignGrowth(initializeCampaignEconomy({...world, turn: 1, globalTick: 0,...(manualEndTurn!==false?{manualEndTurn}:{}),remainingTicks:null,attackedArmyIds:[],endedArmyIds:[],
    moveOrders:{},orderQueue:[],orderLog:[],battleSequence:0,terminal:null,occupations:{},phase:'PLAYER',movedArmyIds:[],aiQueue:[],mapId,...(!c31?{c31Disabled:true}:{}),cityDisplayNames:mapId!=='v1'?Object.fromEntries(map.cities.map(c=>[c.id,c.label])):initialCityNames(),personnel:campaignPersonnel(world)}))))),factionId);
  if(!c46)result.c46Disabled=true;if(!c45)result.c45Disabled=true;if(!council)result.councilDisabled=true;initializeSupply(result);initializeDiplomacy(result);initializeDejaVu(result);initializeClasses(result);startClasses(result,factionId);initializeCampaignRoster(result);applyOfficerDraft(result,companions);if(fieldArmies===false)initializeCityStart(result);initializeRelations(result);c30Start(result,factionId,{force:true});startFactionPolicy(result,factionId);updateKnowledge(result);initializeCampaignEvents(result);startFactionEvents(result,factionId);initializeExploration(result);initializeInjury(result);startCouncilTurn(result);return validate(result);
}

const viewCache=new WeakMap();
export function view(state, factionId = state.playerFactionId) {
  const cached=viewCache.get(state)?.get(factionId);
  if(cached)return cached;
  validate(state);
  const publicSource=structuredClone(state);if(publicSource.gameResult?.type==='TURN_LIMIT')publicSource.gameResult=null;updateKnowledge(publicSource);
  const projected = getFactionView(publicSource, factionId);
  for(const id of Object.keys(projected.officers))if(state.wanderers?.[id])delete projected.officers[id];
  for(const o of Object.values(projected.officers))delete o.fatigueCombat;
  for(const o of Object.values(projected.officers)){o.growth=campaignOfficerGrowth(state,o.officerId);if(o.allegianceFactionId!==factionId&&c29Hidden(state,o.officerId)&&o.growth){const core=c29Record(state,o.officerId).coreId;o.growth.cards=o.growth.cards.filter(c=>c.traitId!==core);o.growth.awakenings=[];}}
  if(supplyEnabled(state)){projected.hubs=supplyHubsView(state,factionId);for(const a of Object.values(projected.ownArmies)){a.supply=supplyView(state,state.armies[a.armyId]);const link=supplyLink(state,state.armies[a.armyId]);a.supply.sourceHubId=link.sourceHubId;a.supply.linkState=link.state;}}
  for(const a of Object.values(projected.ownArmies)){const r=c29Record(state,a.armyId);if(r?.c29)a.signatureGauge=r.c29.gauge;const status=unitStatuses(state,a.armyId);if(status.length)a.status=status;Object.assign(a,{...(c24Enabled(state)?troopInfo(state,a.troopType):{}),facing:state.armies[a.armyId].facing,formation:state.armies[a.armyId].formation});}
  for(const a of Object.values(projected.knowledge.observedArmies)){if(projected.knowledge.tiles[a.tileId]==='VISIBLE'){Object.assign(a,{...(c24Enabled(state)?troopInfo(state,a.troopType):{}),facing:state.armies[a.armyId].facing,formation:state.armies[a.armyId].formation});const r=c29Record(state,a.armyId);if(r?.c29)a.signatureGauge=r.c29.gauge;const status=unitStatuses(state,a.armyId);if(status.length)a.status=status;}if(projected.knowledge.tiles[a.tileId]!=='VISIBLE'){delete a.facing;delete a.formation;delete a.signatureGauge;}a.morale=state.armies[a.armyId].morale??'STEADY';a.troopCount=state.armies[a.armyId].troopCount;}
  for(const c of Object.values({...projected.knowledge.cities,...projected.ownCities}))if(c.ownerFactionId===factionId||projected.knowledge.tiles[c.tileId]==='VISIBLE'){c.securityLevel=state.cities[c.cityId].securityLevel??0;c.securityCauses=state.cities[c.cityId].securityCauses??[];}
  campaignBannerView(state,projected);
  for(const c of Object.values(projected.ownCities))c.economyForecast=cityEconomyRates(state,state.cities[c.cityId]);
  for(const c of Object.values(projected.ownCities)){c.name=state.cityDisplayNames?.[c.cityId]??c.name;if(state.mapId!=='v1')c.kind=state.cities[c.cityId].kind;}
  for(const c of Object.values(projected.ownCities))c.facilities=(c.facilities??[]).map(f=>({...f,disabled:facilityDisabled(state,state.cities[c.cityId],f)}));
  for(const c of Object.values(projected.knowledge.cities)){c.name=state.cityDisplayNames?.[c.cityId]??c.name;if(state.mapId!=='v1')c.kind=state.cities[c.cityId].kind;}
  for(const c of Object.values({...projected.knowledge.cities,...projected.ownCities})){
    const castle=state.castleKnowledge?.[factionId]?.[c.cityId];
    if(castle)Object.assign(c,structuredClone(castle));
  }
  for(const c of Object.values(projected.ownCities))if(state.occupations?.[c.cityId])c.occupation=occupationDisplay(state,state.cities[c.cityId]);
  for(const c of Object.values(projected.knowledge.cities))if(projected.knowledge.tiles[c.tileId]==='VISIBLE'&&state.occupations?.[c.cityId])c.occupation=occupationDisplay(state,state.cities[c.cityId]);
  if(state.mapId!=='v1'){
   projected.research=campaignResearchView(state,factionId);projected.policy=campaignPolicyView(state,factionId);for(const a of Object.values(projected.ownArmies))a.starAction=starAction(state,{armyId:a.armyId},factionId);for(const c of Object.values(projected.ownCities))c.starAction=starAction(state,{cityId:c.cityId},factionId);
   for(const c of Object.values(projected.ownCities)){Object.assign(c,specialistView(state,state.cities[c.cityId]));c.populationCapacity=state.cities[c.cityId].populationCapacity;const warehouse=domesticGranaryView(state,factionId,city=>cityEconomyRates(state,city).capacity);if(warehouse)c.foodWarehouse=warehouse;c.jobs=cityJobList(state,state.cities[c.cityId]);c.domesticCommands=[{type:'CITY_TAX_ADVANCE',cityId:c.cityId,label:'세금 앞당겨 걷기',blockedReason:c33TaxReason(state,state.cities[c.cityId]),available:!c33TaxReason(state,state.cities[c.cityId])},...domesticCommands(state,state.cities[c.cityId],kind=>cityJobCost(state,state.cities[c.cityId],kind),cityId=>cityRecruitCost(state,cityId,factionId))];}
   const summary=o=>({officerId:o.officerId,name:o.name,baseStats:structuredClone(o.baseStats),allowedTroops:[...o.allowedTroops],...(classesEnabled(state)?{class:classView(state,o.officerId)}:{})});
   for(const c of Object.values(projected.ownCities)){c.freeOfficers=freeCityOfficers(state,state.cities[c.cityId],{includeGovernor:false}).map(o=>({...summary(o),troopOptions:musterTroopOptions(state,state.cities[c.cityId],o.officerId)}));c.musterOptions=freeCityOfficers(state,state.cities[c.cityId]).filter(o=>!domesticMusterReason(state,o.officerId)).map(o=>({officerId:o.officerId,troops:musterTroopOptions(state,state.cities[c.cityId],o.officerId)}));}
   for(const c of [...Object.values(projected.knowledge.cities),...Object.values(projected.ownCities)])if(projected.knowledge.tiles[c.tileId]==='VISIBLE')c.wanderers=Object.values(state.wanderers??{}).filter(o=>o.locationRef.id===c.cityId).map(summary);
  }
  if(injuryEnabled(state)){projected.injury=injuryRecent(state,factionId);for(const o of Object.values(projected.officers))if(o.allegianceFactionId===factionId){o.injury=injuryView(state,o.officerId);o.fatigue=fatigueView(state,o.officerId);}for(const a of Object.values(projected.ownArmies)){const f=fatigueView(state,state.armies[a.armyId].commanderId);a.fatigue={value:f.value,levelName:f.levelName};}}
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
  if(classesEnabled(state)){
   for(const o of Object.values(projected.officers))o.class=classView(state,o.officerId);
   for(const a of Object.values(projected.ownArmies))a.classState=structuredClone(state.armies[a.armyId].classState);
   projected.classCamps=(state.c37?.camps??[]).filter(c=>c.until>=state.turn&&projected.knowledge.tiles[c.tileId]==='VISIBLE').map(c=>({tileId:c.tileId,remainingTurns:c.until-state.turn+1,abilityName:c.abilityName}));
  }
  if(factionId===state.playerFactionId&&state.council)projected.council=structuredClone(state.council);
  const captives=campaignCaptives(state,factionId);if(captives.length)projected.captives=captives;
  projected.currentDate=Math.floor(projected.currentDate);
  // Keep FIRST3 axial IDs and the public projection as the only map input.
  for (const tile of Object.values(projected.tiles)) {
    if (tileId(tile) !== tile.tileId) throw new Error('지도 좌표가 올바르지 않습니다.');
  }
  const result={...projected,...(c34KnownTraits(state,factionId).length?{knownUniqueTraits:c34KnownTraits(state,factionId)}:{}),...(uniqueRevealedWanderers(state,factionId).length?{revealedWanderers:uniqueRevealedWanderers(state,factionId)}:{}),...campaignEventsView(state,factionId),...(state.mapId!=='v1'?{mapId:state.mapId}:{}), ...(state.gameResult?{gameResult:structuredClone(state.gameResult)}:{}), turn: state.turn, globalTick: state.globalTick};
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

// Reuse movement's occupancy/contact rules; contact never opens another screen.
function moveArmy(s, candidate, factionId) {
  const approachStart=approachFireStart(s,candidate.armyId);
  const originalTroop=s.armies[candidate.armyId].troopType,id=candidate.armyId,before={armies:{[candidate.armyId]:{tileId:s.armies[candidate.armyId].tileId}},cities:structuredClone(s.cities)},originalRules=s.mapRules;
  if(injuryReason(s,s.armies[id].commanderId)||!active(s,id)||s.armies[id].morale==='ROUTING'||s.armies[id].troopCount<=0)return s;
  // 정본 20 v3.1 §1.1: 교전 중에 움직이면 붙어 있던 적이 먼저 추격한다(소멸·패주하면 이동 없음).
  if(candidate.type==='MOVE'&&inControlZone(s,s.armies[id])&&campaignPath(s,id,candidate.destinationTileId)){
    s=resolvePursuit(s,id);
    if(!active(s,id)||s.armies[id].troopCount<=0||s.armies[id].morale==='ROUTING')return s;
  }
  s.turnPhase='PLANNING';
  if(candidate.type==='MOVE'){
    const rules=s.mapRules;
    const route=campaignPath(s,id,candidate.destinationTileId);
    if(!route)return s;
    s=issueOrder(campaignMovementWorld(s,id),{armyId:id,factionId,type:'MOVE',destinationTileId:candidate.destinationTileId,validatedPathTileIds:route.pathTileIds});
    s.turnPhase=s.time.tick===0?'PLANNING':'EXECUTION_TIMELINE';
  }
  else return s;
  const classMove=classPostMove(s,id),postMove=combatCanPostMove(s,id),budget=postMove?s.armies[id].c27?.cantoTicks??TICKS_PER_TURN:TICKS_PER_TURN;
  for(let tick=0;tick<budget;tick++){
    const army=s.armies[id],old=army.tileId,start=s.history.length;
    const suspended=Object.values(s.armies).filter(a=>a.armyId!==id).map(a=>[a,a.currentOrder]);
    for(const [a] of suspended)a.currentOrder=null;
    const to=army.currentOrder.pathTileIds[army.currentOrder.currentPathIndex+1];
    const city=Object.values(s.cities).find(c=>c.tileId===to&&c.ownerFactionId!==army.factionId);
    if(city&&!campaignCenterEntryAllowed(s,id,city)){
      army.currentOrder.status='BLOCKED_INVALID_PATH';army.movementState=null;
    }
    moveOneTick(s);
    if(combatRule(s,id,'CANTO')){army.c27??={};army.c27.movementTicks=(army.c27.movementTicks??0)+1;}
    for(const [a,order] of suspended)a.currentOrder=order;
    army.troopType=originalTroop;updateKnowledge(s);refreshCampaignSieges(s);army.troopType=parentTroop(originalTroop);
    if(army.tileId!==old){
      army.facing=directionToward(s.tiles[old],s.tiles[army.tileId],army.facing);army.movedTiles++;if(army.classState){if(!armyClass(s,id,'CLS_MIRAGE')?.ability.params.terrains.includes(s.tiles[army.tileId].terrainType))army.classState.hidden=false;}
      captureHubs(s,id);s=resolveOverwatch(s,id,old,{stopped:inControlZone(s,s.armies[id])});if(!active(s,id)||s.armies[id].morale==='ROUTING'||!s.armies[id].troopCount)break;
      if(inControlZone(s,s.armies[id])||classFireStop(s,id))break;
    }
    if(!['PLANNED','ACTIVE','WAITING_FOR_TILE'].includes(s.armies[id].currentOrder?.status))break;
  }
  // A turn's movement allowance ends here, including interrupted routes.
  s.armies[id].movementState=null;if(classMove){s.armies[id].classState.canMoveAfterAttack=false;if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);}
  if(s.armies[id].currentOrder)s.armies[id].currentOrder.status='COMPLETED';
  if(s.armies[id].tileId!==before.armies[id].tileId)s.armies[id].ruleMovedTurn=s.turn;
  s.armies[id].troopType=originalTroop;s.mapRules=originalRules;s=resolveOverwatch(s,id,before.armies[id].tileId,{stopped:true});if(postMove){if(s.armies[id].c27){delete s.armies[id].c27.cantoTurn;delete s.armies[id].c27.cantoRemaining;}if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);}gateMorale(s,before);updateKnowledge(s);refreshCampaignSieges(s);checkDejaVuLocations(s);
  // Ability-granted post-attack movement is outside normal-move approach fire.
  return resolveApproachFire(s,id,postMove||classMove?null:approachStart);
}

export function campaignArcherEscape(s,id){
 const a=s.armies[id],knowledge=s.knowledge[a.factionId];
 const foes=Object.values(knowledge.observedArmies).filter(b=>knowledge.tiles[b.tileId]==='VISIBLE'&&s.armies[b.armyId]&&castleArmyActiveForAction(s,b.armyId));
 const distance=tile=>Math.min(...foes.map(b=>hexDistance(s.tiles[tile],s.tiles[b.tileId])));
 return [...campaignReachable(s,id,TICKS_PER_TURN)].filter(([tile])=>knowledge.tiles[tile]!=='UNEXPLORED'&&distance(tile)>1).map(([tile,route])=>({tileId:tile,route})).sort((x,y)=>x.route.totalTicks-y.route.totalTicks||distance(y.tileId)-distance(x.tileId)||x.tileId.localeCompare(y.tileId))[0]??null;
}
function run(s, incremental=false) {
  while(true){
    if(s.phase!=='AI')return s;
    const entry=s.aiQueue.shift();
    if(entry){
      if(entry.factionId){
        startDiplomacyAi(s,entry.factionId,{autoPlayer:s.autoPlayer});aiRelationFeast(s,entry.factionId);if(explorationEnabled(s))resolveAiExploration(s,entry.factionId);
        selectAiOccupations(s,{autoPlayer:s.autoPlayer});
        const strikeSequence=s.battleSequence;
        startFactionPolicy(s,entry.factionId);for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===entry.factionId))aiStarAction(s,{cityId:c.cityId},entry.factionId);startFactionEffects(s,entry.factionId);startUniqueFaction(s,entry.factionId);startFactionMorale(s,entry.factionId);startClasses(s,entry.factionId,{heal:(id,n)=>healCampaignTroops(s,id,n)});updateKnowledge(s);startFactionEvents(s,entry.factionId,{auto:true});s=strikeCampaignCities(s,entry.factionId);updateKnowledge(s);refreshCampaignSieges(s);
        selectAiRoster(s,entry.factionId);selectCampaignAiJobs(s,entry.factionId);selectCityStartMuster(s,entry.factionId);checkDejaVuLocations(s);
        const plan=campaignAiPlan(s,entry.factionId);
        s.aiQueue.unshift(...(plan?.candidates??[]).filter(c=>!s.movedArmyIds.includes(c.armyId)).map(c=>({candidate:c,faction:entry.factionId,...(supplyEnabled(s)?{targetCityId:plan?.goal?.targetCityId??null}:{})})));
        if(incremental&&s.battleSequence!==strikeSequence)return s;
        continue;
      }
      const id=entry.candidate.armyId;
      if(s.armies[id]?.factionId!==entry.faction||injuryReason(s,s.armies[id]?.commanderId))continue;
      if(withdrawalProtection(s,id)){if(!entry.attack&&!s.movedArmyIds.includes(id)){s=moveArmy(s,entry.candidate,entry.faction);s.movedArmyIds.push(id);}if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);if(incremental)return s;continue;}
      if(!entry.attack&&!s.movedArmyIds.includes(id)&&canMainAction(s,id)){const action=supplyAiAction(s,id,campaignReachable(s,id,TICKS_PER_TURN),{targetCityId:entry.targetCityId,allowBuild:entry.candidate.type==='MOVE'&&!['REPLENISH_ARMY','MUSTER_SIEGE','DEFEND_DAMAGED_CITY','CAPITAL_GARRISON','EXPLORE_PLACE'].includes(entry.candidate.reasonCode)});if(action){if(action.type==='BUILD_HUB'){beginHub(s,id);consumeMainAction(s,id);}else if(action.type==='MOVE')s=moveArmy(s,{armyId:id,...action},entry.faction);s.movedArmyIds.push(id);if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);if(incremental)return s;continue;}}
      const engagedArcher=archerAttackReason(s,id)==='ARCHER_ENGAGED';
      if(engagedArcher&&!entry.attack){
        s.c23Stats??={archerBlocked:0,aiReorganizations:0};s.c23Stats.archerBlocked++;
        if(!s.movedArmyIds.includes(id)){
          const escape=campaignArcherEscape(s,id);
          if(escape)s=moveArmy(s,{armyId:id,type:'MOVE',destinationTileId:escape.tileId,pathTileIds:escape.route.pathTileIds},entry.faction);
          if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);
        }
        s.aiQueue.unshift({...entry,attack:true});if(incremental)return s;continue;
      }
      if(aiStarAction(s,{armyId:id},entry.faction)){if(canMainAction(s,id))s.aiQueue.unshift(entry);if(incremental)return s;continue;}
      if((s.armies[id].morale==='SHAKEN'||s.armies[id].formation!=='ORDERED')&&!regroupReason(s,id)&&canMainAction(s,id)){changeMorale(s,id,'STEADY','재정비');changeFormation(s,id,campaignSubAbility(s,s.armies[id].commanderId,'지휘','수습')>=C12.recoveryThreshold?-2:-1);classWait(s,id,'REGROUP',{formation:(who,n)=>changeFormation(s,who,n),heal:(who,n)=>healCampaignTroops(s,who,n),rear:who=>Object.values(s.armies).some(b=>b.factionId!==s.armies[who].factionId&&b.hp>0&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[who].tileId])===1&&attackDirection(s,b.armyId,who)==='REAR')});consumeMainAction(s,id);if(incremental)return s;continue;}
      if(entry.attack){
        const previousActions=s.armies[id].mainActionTurn===s.turn?s.armies[id].mainActionCount??0:0;
        const targets=attackTargets(s,id).map(targetId=>({targetId,p:previewAttack(s,id,targetId)}))
          .filter(x=>entry.candidate.reasonCode==='CAPITAL_GARRISON'||x.p.enemyLoss>=x.p.allyLoss*campaignShownScale(s,x.targetId,entry.faction)*1.2).sort((a,b)=>aiAttackPriority(s,b.targetId,b.p,entry.faction)-aiAttackPriority(s,a.targetId,a.p,entry.faction)||a.targetId.localeCompare(b.targetId));
        const cityId=cityAttackTargets(s,id).sort((a,b)=>c22TargetWeight(s,entry.faction,s.cities[b].ownerFactionId)-c22TargetWeight(s,entry.faction,s.cities[a].ownerFactionId)||a.localeCompare(b))[0];
        const tactics=campaignTactics(s,id).map(c=>({...c,targets:c.targets.filter(target=>commonTacticAiUseful(s,id,c,target))})).filter(c=>c.targets.length).sort((a,b)=>Number(tacticIsDamage(b))-Number(tacticIsDamage(a))||a.traitId.localeCompare(b.traitId));
        const damageTactics=tactics.filter(tacticIsDamage).flatMap(c=>c.targets.map(targetId=>({c,targetId,p:previewTactic(s,id,c.traitId,targetId)}))).sort((a,b)=>c22TargetWeight(s,entry.faction,s.armies[b.targetId]?.factionId)-c22TargetWeight(s,entry.faction,s.armies[a.targetId]?.factionId)||b.p.enemyLoss-a.p.enemyLoss||a.c.traitId.localeCompare(b.c.traitId)||a.targetId.localeCompare(b.targetId));
        const signature=tactics.find(c=>c.signature);
        if(signature)s=resolveTactic(s,id,signature.traitId,signature.targets[0]);else if(damageTactics.length){const best=damageTactics[0];s=resolveTactic(s,id,best.c.traitId,best.targetId);}else if(cityId)s=resolveCityAttack(s,id,cityId);else if(targets.length)s=resolveAttack(s,id,targets[0].targetId);else if(tactics.length&&(inControlZone(s,s.armies[id])||tactics.some(c=>c33FormationCard(c))))s=resolveTactic(s,id,tactics[0].traitId,tactics[0].targets[0]);
        if(combatCanPostMove(s,id)&&!classPostMove(s,id)){const retreat=[...campaignReachable(s,id,TICKS_PER_TURN)].sort(([,x],[,y])=>y.totalTicks-x.totalTicks);if(retreat.length){s=moveArmy(s,{armyId:id,type:'MOVE',destinationTileId:retreat[0][0]},entry.faction);if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);}}
        if(canMainAction(s,id)&&s.armies[id].mainActionTurn===s.turn&&s.armies[id].mainActionCount>previousActions&&castleArmyActiveForAction(s,id))s.aiQueue.unshift({...entry,attack:true});
        else if(!s.endedArmyIds.includes(id)){if(s.armies[id].morale!=='ROUTING'){s.armies[id].braced=true;classWait(s,id,'BRACE');}s.endedArmyIds.push(id);}
      }else{
        // 정본 21 v0.4 §4: 교전 중인 AI 부대는 자리를 지키고 싸운다(동요 상태면 빠져서 수습).
        let hold=!['REPLENISH_ARMY','MUSTER_SIEGE'].includes(entry.candidate.reasonCode)&&(cityAttackTargets(s,id).length>0||attackTargets(s,id).length>0||s.armies[id]&&inControlZone(s,s.armies[id])&&s.armies[id].morale==='STEADY');
        const rival=!entry.candidate.reasonCode?.startsWith('C31_')&&combatRule(s,id,'GRUDGE')&&combatRival(s,id);if(rival){const choices=[...campaignReachable(s,id,TICKS_PER_TURN)].filter(([to])=>combatMoveAllowed(s,id,to)).sort(([x],[y])=>hexDistance(s.tiles[x],s.tiles[rival.tileId])-hexDistance(s.tiles[y],s.tiles[rival.tileId])||x.localeCompare(y));if(choices.length){entry.candidate={...entry.candidate,type:'MOVE',destinationTileId:choices[0][0]};hold=false;}}
        if((hold||entry.candidate.type!=='MOVE')&&!s.movedArmyIds.includes(id)){const threats=Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1&&castleArmyActiveForAction(s,b.armyId)&&s.knowledge[s.armies[id].factionId].tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,s.armies[id].factionId)).map(b=>({targetId:b.armyId,p:previewAttackThreat(s,b.armyId,id)})).sort((a,b)=>b.p.enemyLoss-a.p.enemyLoss||a.targetId.localeCompare(b.targetId));if(threats.length)turnFacing(s,id,threats[0].targetId);}
        if(!hold)s=moveArmy(s,entry.candidate,entry.faction);
        if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);
        s.aiQueue.unshift({...entry,attack:true});
      }
      if(incremental)return s;
      continue;
    }
    selectAiOccupations(s,{autoPlayer:s.autoPlayer});
    settleFatigue(s);settleEffects(s);
    s.globalTick+=TICKS_PER_TURN;s.turn++;s.turnNumber=s.turn;s.time.tick=0;startDiplomacyTurn(s);
    for(const a of Object.values(s.armies))a.effectStates=(a.effectStates??[]).filter(e=>e.expiresTurn>=s.turn);
    s.currentDate=(s.turn-1)*DAYS_PER_TURN;s.turnPhase='PLANNING';
    settleInjury(s);settleRelationMonth(s);
    settleMorale(s);
    refreshCampaignSieges(s);s=settleCampaignTurnEnd(s);s=settleCampaignEconomy(s);settleExploration(s,{autoPlayer:s.autoPlayer});settleCampaignEvents(s);if(!s.gameResult)s=settleCampaignCaptives(s);recoverCampaignCities(s);if(!s.gameResult&&s.turn>CAMPAIGN_TURN_LIMIT){const ranking=campaignTurnLimitRanking(s);s.gameResult={type:'TURN_LIMIT',winnerFactionId:ranking[0].factionId,ranking,reasonCode:'TURN_LIMIT_MOST_MAJOR_CITIES'};}settleC31(s);s.remainingTicks=null;s.phase='PLAYER';s.movedArmyIds=Object.values(s.armies).filter(a=>a.bornTurn===s.turn).map(a=>a.armyId);s.attackedArmyIds=[];s.endedArmyIds=[...s.movedArmyIds];s.lastCombat=null;s.autoPlayer=false;
    if(!s.gameResult){startFactionPolicy(s,s.playerFactionId);startFactionEffects(s,s.playerFactionId);startUniqueFaction(s,s.playerFactionId);startFactionMorale(s,s.playerFactionId);startClasses(s,s.playerFactionId,{heal:(id,n)=>healCampaignTroops(s,id,n)});updateKnowledge(s);startFactionEvents(s,s.playerFactionId);s=strikeCampaignCities(s,s.playerFactionId);updateKnowledge(s);refreshCampaignSieges(s);}checkDejaVuLocations(s);finishCampaignSummary(s);s.orderQueue=s.gameResult?[]:Object.keys(s.moveOrders??{}).filter(id=>s.armies[id]?.factionId===s.playerFactionId).sort();if(!incremental)while(s.orderQueue.length&&!pendingCampaignDraft(s))s=advanceOrder(s);return s;
  }
}

let councilStepDepth=0;
export function step(state,command) {
  councilStepDepth++;
  try{
    const next=stepCommand(state,command);rememberDiplomacyCombat(next,state);rememberExploration(next);settleRelationCaptiveReleases(next);if(['MOVE_UNIT','ADVANCE_ORDER','END_TURN','ADVANCE_AI','ATTACK_CITY','ATTACK_UNIT','USE_TACTIC','RECALL_UNIT','GARRISON'].includes(command?.type))checkDejaVuLocations(next);
    // An action can automatically call END_TURN. Observe the outer committed
    // action before expiring its resolution or opening the next month's council.
    if(councilStepDepth===1){observeCouncil(next,state,command);if(next.phase==='PLAYER'&&(next.turn!==state.turn||state.phase!=='PLAYER'))startCouncilTurn(next);}
    validateRelations(next);validateDejaVu(next);validateCouncil(next);return next;
  }finally{councilStepDepth--;}
}
function stepCommand(state,command) {
  validate(state);
  let next=structuredClone(state);
  if(command?.armyId&&!['GARRISON','WAIT_UNIT','BRACE_UNIT'].includes(command.type)){const reason=injuryReason(next,next.armies[command.armyId]?.commanderId);if(reason)throw new Error(reason);}
  if(command?.type==='CLOSE_SUMMARY'){if(next.turnSummary)next.turnSummary.open=false;return validate(next);}
  if(command?.type==='ADVANCE_AI'){
    if(next.gameResult||next.phase!=='AI')throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    return validate(run(next,true));
  }
  if(next.phase!=='PLAYER'||next.gameResult)throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
  if(['COUNCIL_APPOINT','COUNCIL_DECIDE','COUNCIL_CLOSE'].includes(command?.type)){if(!next.council)startCouncilTurn(next);return validate(councilCommand(next,command));}
  if(['DIPLO_PROPOSE','DIPLO_RESPOND','DIPLO_END_ALLIANCE','DIPLO_GIFT'].includes(command?.type))return validate(diplomacyCommand(next,command));
  if(command?.type==='EXPLORE_CHOICE'){chooseExploration(next,command);updateKnowledge(next);return validate(next);}
  if(['FEAST','VISIT'].includes(command?.type))return validate(socialCommand(next,command));
  if(command?.type==='EVENT_CHOICE'){chooseCampaignEvent(next,command);queueCrisisCard(next);return validate(next);}
  if(command?.type==='END_TURN'&&next.c22?.pending[next.playerFactionId]){if(command.autoPlayer===true){resolveAiEvent(next,next.playerFactionId);queueCrisisCard(next);resolveAiEvent(next,next.playerFactionId);}else throw new Error('EVENT_PENDING');}
  if(['DRAFT_PICK','DRAFT_REROLL'].includes(command?.type)){
    next=applyCampaignDraftCommand(next,command);
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
  if(command?.type==='CITY_GOVERNOR')return validate(selectCampaignGovernor(next,command));
  if(command?.type==='OCCUPATION_METHOD')return validate(selectOccupationMethod(next,command));
  if(command?.type==='CAPTIVE_ACTION')return validate(selectCaptiveAction(next,command));
  if(command?.type==='WANDERER_RECRUIT')return validate(recruitWanderer(next,command));
  if(command?.type==='GARRISON'){if(armyActionEnded(next,command.armyId)||!canMainAction(next,command.armyId))throw new Error('MAIN_ACTION_USED');consumeMainAction(next,command.armyId);garrisonArmy(next,command.armyId);updateKnowledge(next);refreshCampaignSieges(next);return validate(next);}
  if(command?.type==='STAR_ACTION'){useStarAction(next,command);updateKnowledge(next);return command.armyId?completePlayerAction(next,command):validate(next);}
  if(command?.type==='CITY_TAX_ADVANCE'){const c=next.cities[command.cityId];if(!c||c.ownerFactionId!==next.playerFactionId)throw new Error('INVALID_C33_CITY');c33Tax(next,c,cityEconomyRates(next,c).production);if(c.currentProduction){const previousProduction=c.production;c.production=0;completeJob(next,c,{...cityEconomyRates(next,c),production:0},true);c.production=previousProduction;}return validate(next);}
  if(['CITY_ALT_PAYMENT','CITY_REVOKE_PRIVILEGE','CITY_REMOTE_RECRUIT'].includes(command?.type))return validate(domesticCommand(next,command,{costForJob:cityJobCost,finishJob:(s,c)=>completeJob(s,c,cityEconomyRates(s,c),true),recruit:recruitWanderer,recruitCost:cityRecruitCost}));
  if(command?.type==='CITY_JOB')return validate(selectCityJob(next,command));
  if(command?.type==='BUILD_HUB'){const a=next.armies[command.armyId];if(a?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId)||!canMainAction(next,command.armyId))throw new Error('거점을 지을 행동이 남아 있지 않습니다.');beginHub(next,command.armyId);consumeMainAction(next,command.armyId);if(!next.endedArmyIds.includes(command.armyId))next.endedArmyIds.push(command.armyId);return completePlayerAction(next,command);}
  if(command?.type==='FACE'){
    const a=next.armies[command.armyId];if(a?.factionId!==next.playerFactionId||!castleArmyActiveForAction(next,command.armyId)||armyActionEnded(next,command.armyId)||next.movedArmyIds.includes(command.armyId)||!Number.isInteger(command.facing)||command.facing<0||command.facing>5)throw new Error('INVALID_CAMPAIGN_FACE');
    a.facing=command.facing;next.movedArmyIds.push(command.armyId);return validate(next);
  }
  if(command?.type==='MOVE_UNIT'){
    const reason=diplomacyMoveReason(next,command.armyId,command.destinationTileId);if(reason)throw new Error(reason);
    if(!campaignMoveOptions(next,command.armyId).some(o=>o.tileId===command.destinationTileId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    delete next.moveOrders?.[command.armyId];
    next.autoPlayer=false;
    next=moveArmy(next,{armyId:command.armyId,type:'MOVE',destinationTileId:command.destinationTileId},next.playerFactionId);
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
  if(command?.type==='ATTACK_UNIT'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId)throw new Error('INVALID_CAMPAIGN_ATTACK');
    next=resolveAttack(next,command.armyId,command.targetId);
    return completePlayerAction(next,command);
  }
  if(['BRACE','REGROUP'].includes(command?.type)){
    const a=next.armies[command.armyId];
    if(a?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    if(!canMainAction(next,command.armyId))throw new Error('MAIN_ACTION_USED');
    if(command.type==='REGROUP'){const reason=regroupReason(next,command.armyId);if(reason)throw new Error(reason);changeMorale(next,command.armyId,'STEADY','재정비');changeFormation(next,command.armyId,campaignSubAbility(next,a.commanderId,'지휘','수습')>=C12.recoveryThreshold?-2:-1);}
    else a.braced=true;
    c34Wait(next,command.armyId,command.type);classWait(next,command.armyId,command.type,{formation:(id,n)=>changeFormation(next,id,n),heal:(id,n)=>healCampaignTroops(next,id,n),rear:id=>Object.values(next.armies).some(b=>b.factionId!==next.armies[id].factionId&&b.hp>0&&hexDistance(next.tiles[b.tileId],next.tiles[next.armies[id].tileId])===1&&attackDirection(next,b.armyId,id)==='REAR')});consumeMainAction(next,command.armyId);return completePlayerAction(next,command);
  }
  if(command?.type==='WAIT_UNIT'){
    if(next.armies[command.armyId]?.factionId!==next.playerFactionId||armyActionEnded(next,command.armyId))throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
    c34Wait(next,command.armyId,command.type);classWait(next,command.armyId,command.type);consumeMainAction(next,command.armyId);if(!next.endedArmyIds.includes(command.armyId))next.endedArmyIds.push(command.armyId);return completePlayerAction(next,command);
  }
  if(command?.type==='RECALL_UNIT'){
    const diploReason=diplomacyMoveReason(next,command.armyId,recallDestination(next,command.armyId));if(diploReason)throw new Error(diploReason);
    const id=command.armyId;if(next.armies[id]?.factionId!==next.playerFactionId)throw new Error('INVALID_RECALL');
    const reason=recallReason(next,id);if(reason)throw new Error(reason);
    const from=next.armies[id].tileId;next.armies[id].tileId=recallDestination(next,id);next.armies[id].currentOrder=null;next.armies[id].movementState=null;delete next.moveOrders?.[id];consumeMainAction(next,id);updateKnowledge(next);next=resolveOverwatch(next,id,from);refreshCampaignSieges(next);return completePlayerAction(next,command);
  }
  if(command?.type!=='END_TURN')throw new Error('INVALID_CAMPAIGN_PHASE_OR_COMMAND');
  closeCouncil(next);next.autoPlayer=command.autoPlayer===true;
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
  configureRosterDomestic();
  initializeInjury(state);initializeSupply(state);initializeDiplomacy(state);initializeDejaVu(state);initializeRelations(state);initializeClasses(state);restoreCampaignGrowth(state);initializeArmyFacing(state);initializeCampaignGrowth(state);initializeCampaignEffects(state);initializeCampaignOccupation(state);initializeCampaignCaptives(state);initializeCampaignPolicy(state);initializeCampaignEvents(state);initializeDomestic(state);
  if(state.c31Disabled===undefined&&!state.c31&&(state.c22?.crisisStartedTurn!=null||state.c22?.fired?.some(e=>e.eventId==='CRISIS_HEGEMONY')))state.c31Disabled=true;
  c31Sync(state);initializeC30(state);if(state.c30&&!Object.keys(state.c30.factions).length)c30Start(state,state.activeFactionId??state.playerFactionId);initializeExploration(state);if(state.council===undefined){initializeCouncil(state);startCouncilTurn(state);}
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
  if(e.kind==='CITY_STRIKE'){if(mine(e.targetId)||s.cities[e.cityId]?.ownerFactionId===s.playerFactionId)add('ATTACK',`${city(e.cityId)} 성 사격 → ${who(e.targetId)} −${loss}`);continue;}
  if(e.kind==='CITY'){if(mine(e.attackerId)||s.cities[e.cityId]?.ownerFactionId===s.playerFactionId)add('ATTACK',`${who(e.attackerId)} → ${city(e.cityId)} 성: 내구 −${loss}`);continue;}
  if(!mine(e.attackerId)&&!mine(e.targetId))continue;
  if(e.side==='REAR')add('ATTACK',`${who(e.attackerId)} 후방 공격`);else if(e.side==='FLANK')add('ATTACK',`${who(e.attackerId)} 측면 공격`);if(e.charge)add('ATTACK',`${who(e.attackerId)} 돌격`);for(const f of e.formationChanges??[])if(f.to==='BROKEN')add('ATTACK',`${who(f.armyId)} 전열 붕괴`);
  if(e.kind==='PURSUIT'){add('ATTACK',`${who(e.attackerId)} 추격 → ${who(e.targetId)} −${loss}`);continue;}
  add('ATTACK',`${who(e.attackerId)} → ${who(e.targetId)}${e.kind==='TACTIC'&&e.tacticName?` (전법 ${e.tacticName})`:''}: ${who(e.targetId)} −${loss}${e.allyLoss?`, ${who(e.attackerId)} −${e.allyLoss}`:''}`);
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
