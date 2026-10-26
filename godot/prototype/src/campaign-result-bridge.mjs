import {campaignScenarioRules} from './campaign-scenario-data.mjs';
import {campaignMechShareSettlement, campaignMechQuery, campaignMechCommit, campaignMechPlan, hasCampaignMechQuery} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {validatePersonnelLedger} from './military-personnel-ledger.mjs';
import {domesticSecurity} from './campaign-rule-registry.mjs';
import {hexDistance} from './map-primitives.mjs';
import {reclassCityMods} from './campaign-trait-reclass.mjs';
import {engineEvent} from './campaign-engines.mjs';
import {injuryDefeats} from './campaign-injury.mjs';
import {recordSituationEvent} from './campaign-situations.mjs';
import {supplyCombat,supplyEnabled} from './campaign-supply.mjs';
import {dejaVuEvent} from './campaign-deja-vu.mjs';
import {c34Capture} from './campaign-c34.mjs';
import {c33Owned} from './campaign-rule-registry.mjs';
import {domesticCaptured,domesticWelcomeCapture} from './campaign-rule-registry.mjs';
import {uniqueGuardedCommander,uniqueOwned} from './campaign-rule-registry.mjs';
import {parentTroop,SPECIAL_TROOPS} from './campaign-special-troops.mjs';
import {finishC22Crisis} from './campaign-events.mjs';
import {c20Enabled,preparePolicyCapture} from './campaign-policy.mjs';
import {syncResearchCities} from './campaign-roster.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {hasCampaignRule,effectModifiers,triggerEffects} from './campaign-effects.mjs';
import {getFactionView} from './knowledge.mjs';
import {updateCampaignKnowledge} from './campaign-vision.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {createPersonnelLedger,classifyBattleCasualties} from './military-personnel-ledger.mjs';
import {adjudicateCampaignRetreatFate} from './campaign-retreat-fate-adjudicator.mjs';
import {createCampaignTerminalStateFromWorld} from './campaign-terminal-world.mjs';
import {settleConfirmedCampaignTerminalBatch} from './campaign-terminal-batch-settlement.mjs';
import {applyCampaignTerminalStateToWorld} from './campaign-terminal-world-application.mjs';
import {refreshCampaignSieges} from './campaign-city-footprint.mjs';
import {projectCampaignTerminalPublicView} from './campaign-terminal-public-view.mjs';
import {selectCampaignTerminalAiChoiceResolutionInputs} from './campaign-terminal-ai-choice-selector.mjs';
import {resolveCampaignTerminalChoice} from './campaign-terminal-choice-resolution.mjs';
import {finalizeCampaignTerminalState} from './campaign-terminal-state.mjs';
import {creditCampaignGrowth,CAMPAIGN_GROWTH_TRIAL} from './campaign-growth.mjs';

export function campaignPersonnel(world) {
  return createPersonnelLedger({formations:Object.values(world.armies).map(a=>({formationId:a.armyId,
    nodeId:a.homeCityId??world.factions[a.factionId].capitalCityId,
    identity:{baseTroopId:troopToCampaign(a.troopType),specialTroopId:SPECIAL_TROOPS[a.troopType]?a.troopType:null},field:a.troopCount,
    targetStrength:a.troopCount,specialSupportAvailable:false})),lots:[]});
}

// Transfer actual wounds on a detached ledger; no replacement troops are minted.
export function settleMechPersonnel(s,operation,context){
 if(!hasCampaignMechQuery('H02')||s.mechContracts?.personnelEvents?.[context.eventId])return s;
 const plan=campaignMechPlan(s,'H02',operation,context,{transfers:[]});
 if(!Array.isArray(plan.transfers))throw new Error('INVALID_MECH_PERSONNEL_PLAN');
 if(!plan.transfers.length)return s;
 const next=cloneCampaign(s);
 for(const [index,row] of plan.transfers.entries()){
  const from=next.armies[row.fromId],to=next.armies[row.toId],f=next.personnel.formations.find(f=>f.formationId===row.toId);
  if(!from||!to||from===to||!f||!Number.isSafeInteger(row.count)||row.count<1||row.mode!==undefined&&!['WOUNDED','FIELD'].includes(row.mode)||row.securityDelta!==undefined&&(!Number.isSafeInteger(row.securityDelta)||row.securityDelta<0||row.securityDelta>2))throw new Error('INVALID_MECH_PERSONNEL_TRANSFER');
  if(row.cityId&&(!next.cities[row.cityId]||next.cities[row.cityId].ownerFactionId!==to.factionId))throw new Error('INVALID_MECH_SECURITY_CITY');
  const lots=next.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===row.fromId&&(!row.lotIds||row.lotIds.includes(l.lotId)));
  if(lots.reduce((n,l)=>n+l.count,0)<row.count||from.woundedCount<row.count||row.mode==='FIELD'&&(to.hp<=0||to.morale==='ROUTING'||f.field+row.count>f.targetStrength))throw new Error('INSUFFICIENT_MECH_WOUNDED');
  let remaining=row.count;
  for(const lot of lots){const n=Math.min(remaining,lot.count);if(!n)continue;lot.count-=n;remaining-=n;
   if(row.mode==='FIELD'){f.field+=n;to.troopCount+=n;}
   else next.personnel.lots.push({...lot,lotId:`MH02.${context.eventId}.${index}.${lot.lotId}`,originFormationId:row.toId,nodeId:f.nodeId,count:n});
  }
  from.woundedCount-=row.count;if(row.mode!=='FIELD')to.woundedCount+=row.count;
  if(row.securityDelta){if(!row.cityId)throw new Error('MECH_SECURITY_CITY_REQUIRED');domesticSecurity(next,next.cities[row.cityId],row.securityDelta,'TACTIC');}
 }
 validatePersonnelLedger(next.personnel);
 next.mechContracts??={spent:{}};next.mechContracts.personnelEvents??={};next.mechContracts.personnelEvents[context.eventId]=true;
 for(const [id,a] of Object.entries(s.armies)){Object.assign(a,next.armies[id]);next.armies[id]=a;}
 Object.assign(s,next);return s;
}

export function settleCampaignPayloads(world,defeatPayloads,cityCapturePayloads) {
  if(!defeatPayloads.length&&!cityCapturePayloads.length)return world;
  if(world.campaignTerminalWorld?.publicProbe)return world; // Public combat already settled losses; synthetic officers have no canonical fate/occupation ledger.
  defeatPayloads=injuryDefeats(world,defeatPayloads);
  const welcome=domesticWelcomeCapture(world,cityCapturePayloads);
  preparePolicyCapture(world,cityCapturePayloads);
  const base=supplyEnabled(world)&&world.terminal?structuredClone(world.terminal):world.terminal??createCampaignTerminalStateFromWorld(world);
  // Completed choices retain their original candidates in immutable records.
  // The live candidate lists must stop referencing captured/dead officers too.
  if(supplyEnabled(world)){
    const unavailable=new Set(defeatPayloads.filter(p=>p.commanderFate!=='ESCAPED').map(p=>world.armies[p.defeatedArmyId].commanderId));
    for(const choice of Object.values(base.choicesById))if(choice.status!=='PENDING')choice.candidateOfficerIds=choice.candidateOfficerIds.filter(id=>!unavailable.has(id));
  }
  world.terminalBatchSequence=(world.terminalBatchSequence??0)+1;
  const terminal=settleConfirmedCampaignTerminalBatch(base,{batchId:`C3a.${world.globalTick}.${world.terminalBatchSequence}`,
    globalTick:world.globalTick,defeatPayloads,cityCapturePayloads},{unificationMajorCities:campaignScenarioRules(world).unificationMajorCities,deferResult:true,deferExtinction:true,allowRecapture:true,allowUngovernedNormal:true});
  let next=applyCampaignTerminalStateToWorld(world,terminal,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true});
  next.terminal=terminal;
  for(const p of defeatPayloads)if(terminal.armiesById[p.defeatedArmyId]?.disposition==='DEFEATED')recordSituationEvent(next,'ARMY_DESTROYED',world.armies[p.defeatedArmyId].factionId);
  for(const p of cityCapturePayloads){
    engineEvent(next,'CAPTURE',p);recordSituationEvent(next,'FIRST_CAPTURE',p.occupierFactionId);
    recordSituationEvent(next,'FIRST_CITY_LOST',p.formerOwnerFactionId);
    if(p.formerOwnerFactionId===next.playerFactionId&&Object.values(next.cities).filter(c=>c.ownerFactionId===next.playerFactionId).length===1)recordSituationEvent(next,'LAST_CITY',next.playerFactionId);
  }
  for(const p of defeatPayloads)if(p.commanderFate==='CAPTURED')dejaVuEvent(next,'CAPTURED',{officerId:world.armies[p.defeatedArmyId].commanderId});
  next.occupations??={};
  for(const payload of cityCapturePayloads)next.occupations[payload.capturedCityId]={...(payload.formerOwnerFactionId===null?{fromNeutral:true}:{}),state:'OCCUPIED',stage:'CAPTURED',turnsLeft:1,method:null,lastSettledTurn:next.turn,
    productionEnabled:false,recruitmentEnabled:false,replenishmentEnabled:false};
  for(const payload of cityCapturePayloads){
    const city=next.cities[payload.capturedCityId];city.durability=0;
    for(const home of Object.values(next.cities))if(home.cityId!==city.cityId&&(payload.formerOwnerFactionId===null||payload.formerOwnerFactionId===home.ownerFactionId)&&(reclassCityMods(next,home,{nearCapture:true}).POPULATION_GROWTH_MOD??0)>0&&hexDistance(next.tiles[home.tileId],next.tiles[city.tileId])<=5){home.c319??={};home.c319.nearCaptureUntil=next.turn+1;}
    const army=Object.values(next.armies).filter(a=>a.factionId===payload.occupierFactionId&&a.tileId===city.tileId&&a.troopCount>0)
      .sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];
    if(army)triggerEffects(next,army.armyId,'ON_CAPTURE_CITY',{cityId:city.cityId});
    if(army)creditCampaignGrowth(next,{eventId:`CAPTURE.${next.terminalBatchSequence}.${city.cityId}`,officerId:army.commanderId,
      kind:'CAPTURE',amount:CAMPAIGN_GROWTH_TRIAL.captureXp});
  }
  for(const payload of cityCapturePayloads){domesticCaptured(next,payload);c34Capture(next,payload.formerOwnerFactionId);}
  domesticWelcomeCapture(next,cityCapturePayloads,welcome);
  syncResearchCities(next);
  return finishC22Crisis(refreshCampaignSieges(next));
}

export function settleCampaignRound(world,snapshot,winnerFactionId,{permanentLossRatio=0,captorByArmyId={},attackingCityId=null,escapeCommanderIds=[],mechContext={}}={}) {
  campaignMechShareSettlement(world,snapshot.units,{...mechContext,sourceId:mechContext.sourceId??attackingCityId,eventId:snapshot.battleId});
  supplyCombat(world,snapshot.units.map(u=>u.unitId));
  // Movement can precede the defeated faction's next observation refresh.
  // Adjudication must consume current public facts, before losses remove vision.
  if(snapshot.units.some(u=>u.unitState==='ELIMINATED'))updateCampaignKnowledge(world);
  world.economy??={lastSettledTurn:null,readyAt:{},occupationStatus:{}};
  world.economy.combatCities??={};
  for(const city of Object.values(world.cities))if(snapshot.units.some(u=>{
    const a=world.armies[u.unitId];
    return a&&[city.tileId,...city.footprint.gates,...city.footprint.walls].includes(a.tileId);
  }))world.economy.combatCities[city.cityId]=world.turn;
  // Defeating the garrison is necessary; ownership changes only on a later center entry.
  const capturePayloads=[];
  let defeatPayloads=snapshot.units.filter(u=>u.unitState==='ELIMINATED').map(u=>{
    const a=world.armies[u.unitId],v=getFactionView(world,a.factionId);
    // A confirmed hit identifies its participating opponent even when another
    // observer supplied the shot's sight. Only this battle's units enter the
    // retreat facts; the map knowledge and unseen bystanders remain unchanged.
    for(const participant of snapshot.units){
      const enemy=world.armies[participant.unitId];
      if(enemy.factionId===a.factionId)continue;
      v.knowledge.tiles[enemy.tileId]='VISIBLE';
      v.knowledge.observedArmies[enemy.armyId]={armyId:enemy.armyId,factionId:enemy.factionId,tileId:enemy.tileId};
    }
    if(c33Owned(world,a.armyId,'LUCKY_ESCAPE')||c33Owned(world,a.armyId,'BLOODY_PATH')||escapeCommanderIds.includes(a.armyId)||uniqueGuardedCommander(world,a.armyId)||uniqueOwned(world,a.armyId,'U_NO_SURRENDER')||uniqueOwned(world,a.armyId,'U_RISE_AGAIN')&&(a.c32?.revivals??0)<2)return {transactionId:`RD.${world.battleSequence}.${a.armyId}`,sourceResultId:snapshot.battleId.replaceAll(':','.'),globalTick:world.globalTick,defeatedArmyId:a.armyId,commanderFate:'ESCAPED',captorFactionId:null};
    const occupancy=a=>({armyId:a.armyId,factionId:a.factionId,tileId:a.tileId});
    // Retreat facts describe occupied tiles. Keep the defeated identity when
    // allies share its city tile, and retain the original order without stacks.
    const occupiedTiles=armies=>{
      const tiles=new Map();
      for(const army of armies)if(!tiles.has(army.tileId)||army.armyId===a.armyId)tiles.set(army.tileId,occupancy(army));
      return [...tiles.values()];
    };
    const killer=snapshot.units.find(x=>x.unitId!==u.unitId&&world.armies[x.unitId]?.factionId===(captorByArmyId[a.armyId]??winnerFactionId));
    if(killer&&hasCampaignRule(world,killer.unitId,'CAPTURE_ALWAYS',['ON_KILL'],{targetId:a.armyId}))return {transactionId:`RD.${world.battleSequence}.${a.armyId}`,sourceResultId:snapshot.battleId.replaceAll(':','.'),globalTick:world.globalTick,defeatedArmyId:a.armyId,commanderFate:'CAPTURED',captorFactionId:world.armies[killer.unitId].factionId};
    return adjudicateCampaignRetreatFate({format:'sangoku-campaign-retreat-fate-adjudicator',version:1,
      battleResult:{transactionId:`RD.${world.battleSequence}.${a.armyId}`,sourceResultId:snapshot.battleId.replaceAll(':','.'),
        globalTick:world.globalTick,defeatedArmyId:a.armyId,defeatedFactionId:a.factionId,
        defeated:true,routePending:false,eligibleCaptorFactionIds:[captorByArmyId[a.armyId]??winnerFactionId]},
      publicWorld:{format:'first3-retreat-public-facts',version:1,viewerFactionId:a.factionId,
        defeatedArmy:{...occupancy(a),movementClass:parentTroop(a.troopType)==='cavalry'?'cavalry':a.troopType==='engineer'?'engineer':'normal'},
        tiles:Object.values(v.tiles).map(t=>({tileId:t.tileId,q:t.q,r:t.r,knowledge:v.knowledge.tiles[t.tileId]})),edges:v.knownEdges.map((e,i)=>({...e,edgeId:`E.${i}`})),
        ownArmies:occupiedTiles(Object.values(v.ownArmies)),observedHostileArmies:occupiedTiles(Object.values(v.knowledge.observedArmies)),
        ...(attackingCityId?{observedHostileCities:Object.values(v.knowledge.cities).filter(c=>c.cityId===attackingCityId&&v.knowledge.tiles[c.tileId]==='VISIBLE').map(c=>({cityId:c.cityId,factionId:c.ownerFactionId,tileId:c.tileId}))}:{})},
      entropy:{mode:'SAVED_SEED',savedSeed:world.campaignSeed,rollBasisPoints:null}},{captureWeight:effectModifiers(world,a.armyId).CAPTURE_WEIGHT_MOD+(killer?effectModifiers(world,killer.unitId,['ON_KILL'],{targetId:a.armyId}).CAPTURE_WEIGHT_MOD:0)});
  });
  defeatPayloads=campaignMechQuery(world,'H02','defeatPayloads',{...mechContext,eventId:snapshot.battleId,snapshot},defeatPayloads);
  const lossRatio=id=>campaignMechQuery(world,'H02','permanentLossRatio',{...mechContext,eventId:snapshot.battleId,targetId:id,snapshot},Math.max(permanentLossRatio===0?0:.05,permanentLossRatio-effectModifiers(world,id,['ON_DEFEND']).CASUALTY_SHIFT/100));
  const allocations=snapshot.units.map(u=>{const f=world.personnel.formations.find(f=>f.formationId===u.unitId);
    // Legacy callers retain all wounds; direct-map combat supplies the 30% split.
    const dead=Math.round(u.casualties*lossRatio(u.unitId));
    return {unitId:u.unitId,formationId:u.unitId,wounded:u.casualties-dead,permanentLoss:dead,
      recoveryNodeId:f.nodeId,woundedLotId:`W.${world.battleSequence}.${u.unitId}`,lossId:`L.${world.battleSequence}.${u.unitId}`};});
  world=campaignMechCommit(world,'H01','beforeLossSettlement',{...mechContext,eventId:snapshot.battleId,snapshot,allocations});
  engineEvent(world,'BEFORE_DAMAGE',{units:snapshot.units});
  world.personnel=classifyBattleCasualties(world.personnel,{operationId:`B.${world.battleSequence}`,
    expectedRevision:world.personnel.revision,snapshot,allocations}).ledger;
  for(const u of snapshot.units){const a=world.armies[u.unitId];a.troopCount=u.postBattleCount;a.woundedCount+=u.casualties-Math.round(u.casualties*lossRatio(u.unitId));
    a.deadCount+=Math.round(u.casualties*lossRatio(u.unitId));
    if(u.postBattleCount===0)a.hp=0;
    else if(['CONTACT','EDGE_CONTACT'].includes(a.currentOrder?.status))a.currentOrder.status='ACTIVE';}
  engineEvent(world,'AFTER_DAMAGE',{units:snapshot.units});
  for(const u of snapshot.units)if(!u.postBattleCount&&u.preBattleCount>0)engineEvent(world,'KILL',{armyId:u.unitId,winnerFactionId});
  world=campaignMechCommit(world,'H01','lossSettled',{...mechContext,eventId:snapshot.battleId,snapshot,allocations});
  world=campaignMechCommit(world,'H02','personnelSettled',{...mechContext,eventId:snapshot.battleId,snapshot,allocations});
  world=settleMechPersonnel(world,'personnelPlan',{...mechContext,eventId:snapshot.battleId,snapshot,allocations});
  return settleCampaignPayloads(world,defeatPayloads,capturePayloads);
}

export function settleCampaignSuccession(world) {
  if(!world.terminal||world.terminal.gameResult)return world;
  let terminal=world.terminal;
  for(const factionId of terminal.factionOrder){
    const publicTerminal=projectCampaignTerminalPublicView(terminal,{viewerFactionId:factionId,knownTerminalRecordIds:[]},{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true});
    const inputs=selectCampaignTerminalAiChoiceResolutionInputs({globalTick:world.globalTick,
      world:getFactionView(world,factionId),terminal:publicTerminal},{allowUngovernedNormal:true});
    // Governor selection/normalization belongs to C6; only succession is wired.
    for(const input of inputs)if(terminal.choicesById[input.choiceId].type==='SUCCESSION'){
      // Stable ranking does not change the choice's controller. Campaign
      // succession is automatic for every faction, including the player seat.
      const resolution={...input,resolutionMode:factionId===terminal.playerFactionId?'PLAYER':input.resolutionMode};
      terminal=resolveCampaignTerminalChoice(terminal,resolution,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true});
    }
  }
  return {...applyCampaignTerminalStateToWorld(world,terminal,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true}),terminal};
}

export function settleCampaignTurnEnd(world) {
  world=campaignMechCommit(world,'H02','turnEnd',{eventId:`TURN_END.${world.turn}.${world.globalTick}`});
  refreshCampaignSieges(world);
  if(world.terminal){
    const terminal=settleConfirmedCampaignTerminalBatch(world.terminal,{batchId:`C3a.END.${world.globalTick}`,globalTick:world.globalTick,defeatPayloads:[],cityCapturePayloads:[]},{unificationMajorCities:campaignScenarioRules(world).unificationMajorCities,settleTurnEnd:true,deferResult:true,policySurvival:c20Enabled(world),allowRecapture:true,allowUngovernedNormal:true});
    world={...applyCampaignTerminalStateToWorld(world,terminal,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true}),terminal};
  }
  world=settleCampaignSuccession(world);
  const terminal=world.terminal;
  if(!terminal)return world;
  const living=terminal.factionOrder.filter(id=>terminal.factionsById[id].alive);
  const defeated=!terminal.factionsById[world.playerFactionId].alive;
  const winner=living.find(fid=>terminal.cityOrder.filter(id=>terminal.citiesById[id].kind!=='minor').every(id=>terminal.citiesById[id].ownerFactionId===fid));
  const unified=!!winner&&terminal.cityOrder.filter(id=>terminal.citiesById[id].kind!=='minor').length===campaignScenarioRules(world).unificationMajorCities&&(c20Enabled(world)||living.length===1);
  if(!defeated&&!unified)return world;
  const finalized=finalizeCampaignTerminalState(terminal,{recordId:`REC.ZC3a.END.${world.globalTick}`,reportId:`REPORT.C2.${world.globalTick}`,
    globalTick:world.globalTick,type:unified?'UNIFICATION':'PLAYER_DEFEAT',winnerFactionId:unified?winner:living.length===1?living[0]:null,
    reasonCode:!unified?'PLAYER_FACTION_HAS_ZERO_MAJOR_CITIES':'ONLY_INDEPENDENT_FACTION_OWNS_ALL_THREE_MAJOR_CITIES',
    causeRecordIds:terminal.recordOrder.filter(id=>terminal.recordsById[id].type==='FACTION_EXTINCTION')},{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true});
  return {...applyCampaignTerminalStateToWorld(world,finalized,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true}),terminal:finalized};
}

export function defectCampaignArmy(s,id,factionId){
 const a=s.armies[id],o=s.officers[a.commanderId],old=a.factionId;
 s.factions[old].officerIds=s.factions[old].officerIds.filter(k=>k!==o.officerId);s.factions[factionId].officerIds.push(o.officerId);
 s.factions[old].armyIds=s.factions[old].armyIds.filter(k=>k!==id);s.factions[factionId].armyIds.push(id);
 a.factionId=factionId;a.homeCityId=s.factions[factionId].capitalCityId;a.currentOrder=null;a.movementState=null;a.braced=false;
 o.allegianceFactionId=factionId;o.captivityState='FREE';o.captorFactionId=null;
 s.personnel.formations.find(f=>f.formationId===id).nodeId=a.homeCityId;
 if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);
 if(s.terminal){
  s.terminal.armiesById[id].factionId=factionId;s.terminal.officersById[o.officerId].allegianceFactionId=factionId;
  for(const choice of Object.values(s.terminal.choicesById))choice.candidateOfficerIds=choice.candidateOfficerIds.filter(k=>k!==o.officerId);
  syncCampaignAdministrativeTerminal(s);
 }
 const r=s.campaignGrowth.officers[o.officerId];r.track.characterProfiles[o.officerId].controllerType=factionId===s.playerFactionId?'PLAYER':'AI';
 return s;
}
export function absorbCampaignPersonnel(s,id,targetId,originalCount){
 const f=s.personnel.formations.find(f=>f.formationId===id);
 let remaining=Math.min(f.targetStrength-f.field,Math.floor(originalCount*.2));
 for(const lot of s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===targetId)){
  const n=Math.min(lot.count,remaining);lot.count-=n;f.field+=n;s.armies[id].troopCount+=n;s.armies[targetId].woundedCount-=n;remaining-=n;
 }
 // Captured casualties enter the receiving formation; the ledger total stays conserved.
 return s;
}
