import {campaignCastleDefense} from './campaign-city-footprint.mjs';
import {createRoundMultiAdapter} from './round-multi-adapter.mjs';
import {ROUND_MULTI_FIXTURE} from './round-multi-fixture.mjs';
import {validateBattleEndSnapshot} from './combat-battle-result.mjs';

// Only identity/roster wiring is new. Geometry, actions, AI and casualty
// resolution remain the existing ordinary-melee Round trial implementation.
export function openCampaignBattle(world, armyIds, sequence, autoPlayer = false) {
  const armies = armyIds.map(id => world.armies[id]);
  const bindings = armies.map((army, i) => ({unitId:`TEST-U${i}`,armyId:army.armyId,
    officerId:army.commanderId,factionId:army.factionId}));
  const factions = [...new Set(armies.map(a => a.factionId))];
  const ranks = new Map();
  const config = {...structuredClone(ROUND_MULTI_FIXTURE),scenarioId:`TEST-CAMPAIGN-${sequence}`,
    roster:armies.map((army,i) => {const side=factions.indexOf(army.factionId),rank=ranks.get(side)??0;ranks.set(side,rank+1);return {unitId:bindings[i].unitId,
      name:world.officers[army.commanderId].name,factionId:`TEST-F${factions.indexOf(army.factionId)}`,
      controller:army.factionId===world.playerFactionId&&!autoPlayer?'PLAYER':'AI',
      q:[3,7,5][side],r:side===2?5-rank:2+rank,count:army.troopCount};}),
    initiativeOrder:bindings.map(b => b.unitId)};
  return {bindings,config,battle:null,autoPlayer,defenseMultiplierByUnitId:Object.fromEntries(armies.map((a,i)=>[bindings[i].unitId,campaignCastleDefense(world,a)]))};
}

export const campaignBattleApi = pending => createRoundMultiAdapter(pending.config,{defenseMultiplierByUnitId:pending.defenseMultiplierByUnitId??{}});

export function campaignBattleSnapshot(pending) {
  const result = structuredClone(pending.battle.closure.result);
  result.units = result.units.map(unit => ({...unit,
    unitId:pending.bindings.find(b => b.unitId===unit.unitId).armyId}));
  return validateBattleEndSnapshot(result);
}
