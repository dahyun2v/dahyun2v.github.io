import {createActionLifecycleState} from './action-lifecycle.mjs';
import {createCombatResolverState} from './combat-resolver.mjs';
import {validateCombatCoordinatorState} from './combat-coordinator.mjs';
import {validateBattleDeltaState} from './battle-delta-applier.mjs';
import {validateCombatCalculatorState} from './combat-calculator.mjs';

const SCHEMA='combat-unit-registration-v1';
const VERSION=1;

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const finite=(value,min=0)=>typeof value==='number'&&Number.isFinite(value)&&value>=min;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function same(left,right){return stable(left)===stable(right);}
function sortedIds(value){return Object.keys(value).sort();}
function sameIds(left,right){return same([...left].sort(),[...right].sort());}
function sortedRecord(value){return Object.fromEntries(Object.entries(value).sort(([left],[right])=>left.localeCompare(right)));}

function routePendingFromArmy(army){
  return army.statusEffects.some(effect=>effect?.status==='ROUT_PENDING'||effect?.effectId==='ROUT_PENDING');
}

function validateCombatEnvelope(combat){
  invariant(object(combat),'COMBAT_REGISTRATION_COMBAT_REQUIRED');
  invariant(typeof combat.battleId==='string'&&combat.battleId,'COMBAT_REGISTRATION_BATTLE_ID_REQUIRED');
  validateCombatCoordinatorState(combat.coordinator);
  validateBattleDeltaState(combat.delta);
  validateCombatCalculatorState(combat.calculator);
  invariant(
    combat.coordinator.battleId===combat.battleId&&combat.delta.battleId===combat.battleId&&combat.calculator.battleId===combat.battleId,
    'COMBAT_REGISTRATION_BATTLE_SCOPE_MISMATCH',
  );
}

function validateWorldTarget(world,armyId,battleId){
  invariant(object(world)&&object(world.armies)&&object(world.officers)&&object(world.factions)&&object(world.tiles),'COMBAT_REGISTRATION_WORLD_REQUIRED');
  invariant(typeof armyId==='string'&&armyId,'COMBAT_REGISTRATION_ARMY_ID_REQUIRED');
  invariant(integer(world.campaignSeed,0),`COMBAT_REGISTRATION_WORLD_SEED_REQUIRED:${armyId}`);
  invariant(battleId===`FIRST3-${world.campaignSeed}`,`COMBAT_REGISTRATION_WORLD_BATTLE_MISMATCH:${battleId}:FIRST3-${world.campaignSeed}`);
  const army=world.armies[armyId];
  invariant(object(army),`COMBAT_REGISTRATION_WORLD_ARMY_NOT_FOUND:${armyId}`);
  invariant(army.armyId===armyId,`COMBAT_REGISTRATION_WORLD_ARMY_KEY_MISMATCH:${armyId}`);
  for(const field of ['factionId','commanderId','troopType','tileId'])invariant(typeof army[field]==='string'&&army[field],`COMBAT_REGISTRATION_ARMY_FIELD_REQUIRED:${armyId}:${field}`);
  const faction=world.factions[army.factionId],officer=world.officers[army.commanderId];
  invariant(object(faction)&&faction.factionId===army.factionId,`COMBAT_REGISTRATION_FACTION_NOT_FOUND:${armyId}:${army.factionId}`);
  invariant(Array.isArray(faction.armyIds)&&faction.armyIds.filter(id=>id===armyId).length===1,`COMBAT_REGISTRATION_FACTION_ARMY_LINK_MISMATCH:${armyId}`);
  invariant(object(officer)&&officer.officerId===army.commanderId,`COMBAT_REGISTRATION_OFFICER_NOT_FOUND:${armyId}:${army.commanderId}`);
  invariant(officer.allegianceFactionId===army.factionId,`COMBAT_REGISTRATION_OFFICER_FACTION_MISMATCH:${armyId}`);
  invariant(officer.locationRef?.kind==='ARMY'&&officer.locationRef.id===armyId,`COMBAT_REGISTRATION_OFFICER_LOCATION_MISMATCH:${armyId}`);
  invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY',`COMBAT_REGISTRATION_OFFICER_UNAVAILABLE:${army.commanderId}`);
  invariant(Array.isArray(officer.allowedTroops)&&officer.allowedTroops.includes(army.troopType),`COMBAT_REGISTRATION_TROOP_NOT_ALLOWED:${army.commanderId}:${army.troopType}`);
  invariant(object(world.tiles[army.tileId])&&world.tiles[army.tileId].tileId===army.tileId,`COMBAT_REGISTRATION_TILE_NOT_FOUND:${armyId}:${army.tileId}`);
  invariant(Object.values(world.armies).filter(item=>item?.commanderId===army.commanderId).length===1,`COMBAT_REGISTRATION_DUPLICATE_COMMANDER:${army.commanderId}`);
  for(const field of ['troopCount','woundedCount','deadCount','stamina','maxStamina'])invariant(integer(army[field]),`COMBAT_REGISTRATION_INTEGER_REQUIRED:${armyId}:${field}`);
  invariant(army.troopCount+army.woundedCount+army.deadCount>0,`COMBAT_REGISTRATION_EMPTY_UNIT:${armyId}`);
  invariant(army.stamina<=army.maxStamina,`COMBAT_REGISTRATION_STAMINA_EXCEEDS_MAX:${armyId}`);
  invariant(finite(army.hp)&&finite(army.maxHp)&&army.hp<=army.maxHp,`COMBAT_REGISTRATION_INVALID_HP:${armyId}`);
  invariant(army.maxHp===army.troopCount*2,`COMBAT_REGISTRATION_MAX_HP_ACTIVE_MISMATCH:${armyId}`);
  invariant(integer(army.morale)&&army.morale<=100,`COMBAT_REGISTRATION_INVALID_MORALE:${armyId}`);
  invariant(Array.isArray(army.statusEffects),`COMBAT_REGISTRATION_STATUS_EFFECTS_REQUIRED:${armyId}`);
  invariant(object(officer.subStats)&&finite(officer.subStats['방어지휘'])&&finite(officer.subStats['사기유지']),`COMBAT_REGISTRATION_OFFICER_COMBAT_STATS_REQUIRED:${army.commanderId}`);
  return {army,officer};
}

function deriveRegistration(world,battleId,armyId){
  const {army,officer}=validateWorldTarget(world,armyId,battleId);
  const routePending=routePendingFromArmy(army);
  const maxPersonnel=army.troopCount+army.woundedCount+army.deadCount;
  const calculatorUnit={
    unitId:armyId,
    maxPersonnel,
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
    routePending,
  };
  const deltaUnit={
    unitId:armyId,
    maxPersonnel,
    activePersonnel:army.troopCount,
    woundedPersonnel:army.woundedCount,
    deadPersonnel:army.deadCount,
    morale:army.morale,
    moraleMin:0,
    moraleMax:100,
    control:null,
    routePending,
  };
  const actorState=createCombatResolverState({
    battleId,
    actorRef:armyId,
    lifecycleState:createActionLifecycleState({stamina:army.stamina}),
  });
  return {
    registration:{
      schema:SCHEMA,
      version:VERSION,
      battleId,
      armyId,
      commanderId:army.commanderId,
      factionId:army.factionId,
      troopType:army.troopType,
      tileId:army.tileId,
      hp:army.hp,
      maxHp:army.maxHp,
      morale:army.morale,
      stamina:army.stamina,
      maxStamina:army.maxStamina,
    },
    actorState,
    deltaUnit,
    calculatorUnit,
  };
}

export function deriveWorldArmyCombatRegistration({world,combat,armyId}={}){
  validateCombatEnvelope(combat);
  return clone(deriveRegistration(world,combat.battleId,armyId).registration);
}

export function registerWorldArmyInCombat({world,combat,armyId,registration=null}={}){
  validateCombatEnvelope(combat);
  const derived=deriveRegistration(world,combat.battleId,armyId);
  const coordinatorIds=sortedIds(combat.coordinator.actorStates);
  const deltaIds=sortedIds(combat.delta.units);
  const calculatorIds=sortedIds(combat.calculator.units);
  invariant(sameIds(coordinatorIds,deltaIds)&&sameIds(coordinatorIds,calculatorIds),'COMBAT_REGISTRATION_LEDGER_SET_MISMATCH');
  const presence=[own(combat.coordinator.actorStates,armyId),own(combat.delta.units,armyId),own(combat.calculator.units,armyId)];
  invariant(presence.every(value=>value===presence[0]),`COMBAT_REGISTRATION_PARTIAL_EXISTENCE:${armyId}`);
  const worldIds=sortedIds(world.armies);
  const expectedWorldIds=presence[0]?coordinatorIds:[...coordinatorIds,armyId];
  invariant(sameIds(worldIds,expectedWorldIds),`COMBAT_REGISTRATION_WORLD_LEDGER_SET_MISMATCH:${armyId}`);
  if(presence[0]){
    invariant(object(registration),`COMBAT_REGISTRATION_RECEIPT_REQUIRED:${armyId}`);
    invariant(same(registration,derived.registration),`COMBAT_REGISTRATION_DATA_CONFLICT:${armyId}:registration`);
    invariant(same(combat.coordinator.actorStates[armyId],derived.actorState),`COMBAT_REGISTRATION_DATA_CONFLICT:${armyId}:coordinator`);
    invariant(same(combat.delta.units[armyId],derived.deltaUnit),`COMBAT_REGISTRATION_DATA_CONFLICT:${armyId}:delta`);
    invariant(same(combat.calculator.units[armyId],derived.calculatorUnit),`COMBAT_REGISTRATION_DATA_CONFLICT:${armyId}:calculator`);
    return {combat:clone(combat),registration:clone(derived.registration)};
  }
  invariant(registration===null||registration===undefined,`COMBAT_REGISTRATION_UNEXPECTED_RECEIPT:${armyId}`);
  const next=clone(combat);
  next.coordinator.actorStates=sortedRecord({...next.coordinator.actorStates,[armyId]:derived.actorState});
  next.delta.units=sortedRecord({...next.delta.units,[armyId]:derived.deltaUnit});
  next.calculator.units=sortedRecord({...next.calculator.units,[armyId]:derived.calculatorUnit});
  validateCombatCoordinatorState(next.coordinator);
  validateBattleDeltaState(next.delta);
  validateCombatCalculatorState(next.calculator);
  return {combat:next,registration:clone(derived.registration)};
}

export const registerCombatUnit=registerWorldArmyInCombat;
export const COMBAT_UNIT_REGISTRATION_SCHEMA=SCHEMA;
export const COMBAT_UNIT_REGISTRATION_VERSION=VERSION;
