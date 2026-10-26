import {importSave,SAVE_VERSION} from './first3.mjs';
import {
  COMBAT_COORDINATOR_FORMAT,
  COMBAT_COORDINATOR_VERSION,
  deserializeCombatCoordinator,
} from './combat-coordinator.mjs';

const FORMAT='sangoku-first3-combat-save-adapter';
const VERSION=1;
const FIRST3_FORMAT='sangoku-first3-save';
const MAX_FIRST3_LENGTH=2_000_000;
const MAX_ADAPTER_LENGTH=4_000_000;
const FIRST3_STATE_FIELDS=[
  'armies','campaignSeed','cities','contentFingerprint','currentDate','diplomacy','events','factions',
  'gameResult','history','implementation','knowledge','mapRules','officers','orderSequence','pendingChoices',
  'playerFactionId','rng','scenarioId','schemaVersion','tiles','time','turnNumber','turnPhase','ui',
].sort();

function invariant(condition,message){if(!condition)throw new Error(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function clone(value){return structuredClone(value);}

function exactFields(value,expected,label,code){
  invariant(object(value),`${code}:${label}_NOT_OBJECT`);
  const actual=Object.keys(value).sort(),wanted=[...expected].sort();
  const missing=wanted.filter(key=>!actual.includes(key));
  const extra=actual.filter(key=>!wanted.includes(key));
  invariant(missing.length===0&&extra.length===0,`${code}:${label}:missing=${missing.join(',')||'none'}:extra=${extra.join(',')||'none'}`);
}

function parseJson(serialized,label,invalidCode){
  invariant(typeof serialized==='string',`${invalidCode}:${label}_MUST_BE_STRING`);
  invariant(serialized.length<=MAX_ADAPTER_LENGTH,`${invalidCode}:${label}_TOO_LARGE`);
  try{return JSON.parse(serialized);}catch{throw new Error(`${invalidCode}:${label}_INVALID_JSON`);}
}

function validateFirst3Envelope(envelope,inputs){
  exactFields(envelope,['format','version','state'],'FIRST3_ENVELOPE','INCOMPATIBLE_FIRST3_SAVE_FIELDS');
  invariant(envelope.format===FIRST3_FORMAT,'INVALID_FIRST3_SAVE_FORMAT');
  invariant(envelope.version===SAVE_VERSION,`UNSUPPORTED_FIRST3_SAVE_VERSION:${envelope.version}`);
  exactFields(envelope.state,FIRST3_STATE_FIELDS,'FIRST3_STATE','INCOMPATIBLE_FIRST3_STATE_FIELDS');
  invariant(envelope.state.schemaVersion===SAVE_VERSION,`UNSUPPORTED_FIRST3_STATE_VERSION:${envelope.state.schemaVersion}`);
  const serialized=JSON.stringify(envelope,null,2);
  invariant(serialized.length<=MAX_FIRST3_LENGTH,'INVALID_FIRST3_SAVE:FIRST3_SAVE_TOO_LARGE');
  importSave(serialized,inputs);
  return envelope;
}

function validateCombatEnvelope(envelope){
  exactFields(envelope,['format','version','state'],'COMBAT_ENVELOPE','INCOMPATIBLE_COMBAT_SAVE_FIELDS');
  invariant(envelope.format===COMBAT_COORDINATOR_FORMAT,'INVALID_COMBAT_COORDINATOR_FORMAT');
  invariant(envelope.version===COMBAT_COORDINATOR_VERSION,`UNSUPPORTED_COMBAT_COORDINATOR_VERSION:${envelope.version}`);
  deserializeCombatCoordinator(JSON.stringify(envelope));
  return envelope;
}

function validateCrossReferences(first3,combat){
  for(const[actorRef,actorState]of Object.entries(combat.state.actorStates)){
    const army=first3.state.armies[actorRef];
    invariant(army,`COMBAT_ACTOR_NOT_IN_FIRST3:${actorRef}`);
    const ledger=actorState.lifecycleState.stamina;
    invariant(ledger.reserved<=ledger.current,`COMBAT_RESERVED_STAMINA_EXCEEDS_CURRENT:${actorRef}`);
    invariant(ledger.current<=army.maxStamina,`COMBAT_STAMINA_EXCEEDS_FIRST3_MAX:${actorRef}`);
    for(const instance of Object.values(actorState.instances)){
      invariant(instance.actorTroopType===army.troopType,`COMBAT_ACTOR_TROOP_MISMATCH:${actorRef}:${instance.actionInstanceId}`);
    }
  }
}

export function createFirst3CombatSaveAdapter({first3Save,combatCoordinatorSave,inputs}={}){
  const first3=parseJson(first3Save,'FIRST3_SAVE','INVALID_FIRST3_SAVE');
  const combat=parseJson(combatCoordinatorSave,'COMBAT_COORDINATOR_SAVE','INVALID_COMBAT_COORDINATOR_SAVE');
  validateFirst3Envelope(first3,inputs);
  validateCombatEnvelope(combat);
  validateCrossReferences(first3,combat);
  return {format:FORMAT,version:VERSION,first3:clone(first3),combat:clone(combat)};
}

export function validateFirst3CombatSaveAdapter(envelope,{inputs}={}){
  exactFields(envelope,['format','version','first3','combat'],'ADAPTER_ENVELOPE','INCOMPATIBLE_FIRST3_COMBAT_ADAPTER_FIELDS');
  invariant(envelope.format===FORMAT,'INVALID_FIRST3_COMBAT_ADAPTER_FORMAT');
  invariant(envelope.version===VERSION,`UNSUPPORTED_FIRST3_COMBAT_ADAPTER_VERSION:${envelope.version}`);
  validateFirst3Envelope(envelope.first3,inputs);
  validateCombatEnvelope(envelope.combat);
  validateCrossReferences(envelope.first3,envelope.combat);
  return true;
}

export function serializeFirst3CombatSaveAdapter(envelope,{inputs}={}){
  validateFirst3CombatSaveAdapter(envelope,{inputs});
  return JSON.stringify(envelope,null,2);
}

export function deserializeFirst3CombatSaveAdapter(serialized,{inputs}={}){
  const envelope=parseJson(serialized,'FIRST3_COMBAT_ADAPTER','INVALID_FIRST3_COMBAT_ADAPTER');
  validateFirst3CombatSaveAdapter(envelope,{inputs});
  return clone(envelope);
}

export function extractFirst3Save(envelope,{inputs}={}){
  validateFirst3CombatSaveAdapter(envelope,{inputs});
  return JSON.stringify(envelope.first3,null,2);
}

export function extractCombatCoordinatorSave(envelope,{inputs}={}){
  validateFirst3CombatSaveAdapter(envelope,{inputs});
  return JSON.stringify(envelope.combat);
}

export const FIRST3_COMBAT_SAVE_ADAPTER_FORMAT=FORMAT;
export const FIRST3_COMBAT_SAVE_ADAPTER_VERSION=VERSION;
