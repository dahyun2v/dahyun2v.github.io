import {createFirst3StrategicAiSnapshotFromRuntimePublicView} from './first3-strategic-ai-runtime-adapter.mjs';
import {createFirst3FailedAttackRecord} from './first3-strategic-ai.mjs';

const FORMAT='first3-strategic-ai-public-attack-quote';
const VERSION=1;
const ATTACKS=new Set(['BASIC_ATTACK','RANGED_VOLLEY']);
const ADAPTER_TYPES=new Set(['MOVE','HOLD','BASIC_ATTACK','RANGED_VOLLEY','ART-G07','ART-G08']);
const BATCH_KEYS=['format','version','planningBoundaryId','globalTick','turnNumber','source','publicViewFingerprints','snapshots','plans','skippedFactions','commandIntents','failureMemoryCandidates','supplyStatus','runtimeCommit','failureMemoryPersistence'];
const INTENT_KEYS=['intentId','planningBoundaryId','actingFactionId','armyId','type','destinationTileId','targetArmyId','pathTileIds','reasonCode','publicAttackFingerprint','submissionStatus'];
const CANDIDATE_KEYS=['candidateId','actingFactionId','armyId','type','destinationTileId','targetArmyId','pathTileIds','reasonCode','publicAttackFingerprint'];
const FAILURE_KEYS=['candidateId','sourceIntentId','applyWhen','record','persistenceStatus'];
const FAILURE_RECORD_KEYS=['failureId','factionId','armyId','targetArmyId','publicFingerprint'];
const REQUEST_KEYS=['requestId','actingFactionId','actorRef','targetRef','actionId'];

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const text=value=>typeof value==='string'&&value.length>0;
const clone=value=>structuredClone(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function exactKeys(value,keys,message){
  invariant(object(value),message);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  invariant(actual.length===expected.length&&actual.every((key,index)=>key===expected[index]),`${message}:${actual.join(',')}`);
}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fingerprint(value){let hash=0x811c9dc5;for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;return hash.toString(16).padStart(8,'0');}
function compare(left,right){
  for(const key of ['actingFactionId','armyId','intentId']){const a=String(left[key]),b=String(right[key]);if(a<b)return -1;if(a>b)return 1;}
  return 0;
}

function validateBatchBoundary(publicView,batch,snapshot){
  exactKeys(batch,BATCH_KEYS,'AI_PUBLIC_ATTACK_ADAPTER_BATCH_KEYS_MUST_BE_EXACT');
  invariant(batch.format==='first3-strategic-ai-runtime-adapter-batch'&&batch.version===1,'INVALID_AI_PUBLIC_ATTACK_ADAPTER_BATCH_FORMAT');
  invariant(batch.source==='GET_FIRST3_RUNTIME_PUBLIC_VIEW_ONLY'&&batch.runtimeCommit==='NOT_PERFORMED','AI_PUBLIC_ATTACK_ADAPTER_MUST_BE_UNCOMMITTED');
  invariant(batch.supplyStatus==='NOT_AVAILABLE'&&batch.failureMemoryPersistence==='NOT_CONNECTED','INVALID_AI_PUBLIC_ATTACK_ADAPTER_STATUS');
  const world=publicView.world,expectedBoundary=`TURN-${world.turnNumber}-G${publicView.globalTick}`;
  invariant(world.turnPhase==='PLANNING'&&world.time.tick===0,'AI_PUBLIC_ATTACK_QUOTE_REQUIRES_PLANNING_BOUNDARY');
  invariant(batch.globalTick===publicView.globalTick&&batch.turnNumber===world.turnNumber&&batch.planningBoundaryId===expectedBoundary,'STALE_AI_PUBLIC_ATTACK_PLANNING_BOUNDARY');
  const factionId=world.factionId,expectedFingerprint=fingerprint(snapshot);
  const fingerprints=batch.publicViewFingerprints.filter(entry=>entry?.factionId===factionId);
  invariant(fingerprints.length===1&&fingerprints[0].fingerprint===expectedFingerprint,'STALE_AI_PUBLIC_ATTACK_FINGERPRINT');
  const snapshots=batch.snapshots.filter(entry=>entry?.factionId===factionId);
  invariant(snapshots.length===1&&stable(snapshots[0])===stable(snapshot),'STALE_AI_PUBLIC_ATTACK_SNAPSHOT');
  const plans=batch.plans.filter(entry=>entry?.factionId===factionId);
  invariant(plans.length===1,'AI_PUBLIC_ATTACK_PLAN_REQUIRED');
  const plan=plans[0];
  invariant(plan.planningBoundaryId===expectedBoundary&&plan.publicSnapshotFingerprint===expectedFingerprint&&plan.runtimeCommit==='NOT_PERFORMED','STALE_AI_PUBLIC_ATTACK_PLAN');
  invariant(Array.isArray(plan.candidates),'INVALID_AI_PUBLIC_ATTACK_PLAN_CANDIDATES');
  return plan;
}

function validateCandidateIntent(intent,candidate,boundaryId){
  exactKeys(intent,INTENT_KEYS,'AI_PUBLIC_ATTACK_INTENT_KEYS_MUST_BE_EXACT');
  exactKeys(candidate,CANDIDATE_KEYS,'AI_PUBLIC_ATTACK_CANDIDATE_KEYS_MUST_BE_EXACT');
  invariant(ATTACKS.has(intent.type)&&candidate.type===intent.type,'INVALID_AI_PUBLIC_ATTACK_TYPE');
  invariant(intent.submissionStatus==='NOT_SUBMITTED'&&intent.planningBoundaryId===boundaryId,'STALE_AI_PUBLIC_ATTACK_INTENT');
  const expected={
    intentId:`INTENT:${candidate.candidateId}`,planningBoundaryId:boundaryId,actingFactionId:candidate.actingFactionId,
    armyId:candidate.armyId,type:candidate.type,destinationTileId:candidate.destinationTileId,targetArmyId:candidate.targetArmyId,
    pathTileIds:candidate.pathTileIds,reasonCode:candidate.reasonCode,publicAttackFingerprint:candidate.publicAttackFingerprint,
    submissionStatus:'NOT_SUBMITTED',
  };
  invariant(stable(intent)===stable(expected),'AI_PUBLIC_ATTACK_INTENT_CANDIDATE_MISMATCH');
  invariant(intent.destinationTileId===null&&Array.isArray(intent.pathTileIds)&&intent.pathTileIds.length===0&&text(intent.targetArmyId)&&text(intent.reasonCode)&&/^[a-f0-9]{8}$/.test(intent.publicAttackFingerprint),'INVALID_AI_PUBLIC_ATTACK_FIELDS');
}

function validateStableIntentId(intent){
  const candidateId=`AI:${intent.planningBoundaryId}:${intent.actingFactionId}:${intent.armyId}:${intent.type}:${intent.targetArmyId}`;
  invariant(intent.intentId===`INTENT:${candidateId}`,'UNSTABLE_AI_PUBLIC_ATTACK_INTENT_ID');
}

function validateFailureCandidate(snapshot,intent,candidate){
  exactKeys(candidate,FAILURE_KEYS,'AI_PUBLIC_ATTACK_FAILURE_CANDIDATE_KEYS_MUST_BE_EXACT');
  exactKeys(candidate.record,FAILURE_RECORD_KEYS,'AI_PUBLIC_ATTACK_FAILURE_RECORD_KEYS_MUST_BE_EXACT');
  const failureId=`FAIL:${fingerprint({intentId:intent.intentId,publicAttackFingerprint:intent.publicAttackFingerprint})}`;
  const expectedRecord=createFirst3FailedAttackRecord(snapshot,{failureId,armyId:intent.armyId,targetArmyId:intent.targetArmyId});
  const expected={candidateId:`MEMORY:${intent.intentId}`,sourceIntentId:intent.intentId,applyWhen:'RUNTIME_ATTACK_FAILED',record:expectedRecord,persistenceStatus:'NOT_CONNECTED'};
  invariant(stable(candidate)===stable(expected),'AI_PUBLIC_ATTACK_FAILURE_CANDIDATE_MISMATCH');
  invariant(expectedRecord.publicFingerprint===intent.publicAttackFingerprint,'AI_PUBLIC_ATTACK_FINGERPRINT_MISMATCH');
}

/**
 * Quote public BASIC_ATTACK/RANGED_VOLLEY intents into the exact minimal
 * request for a future actingFactionId-aware issueRuntimeCombatCommand.
 * No canonical runtime, private combat values, or internal LOS result enters.
 */
export function quoteFirst3StrategicAiPublicAttackBatch(publicView,adapterBatch){
  const snapshot=createFirst3StrategicAiSnapshotFromRuntimePublicView(publicView);
  const plan=validateBatchBoundary(publicView,adapterBatch,snapshot),factionId=publicView.world.factionId;
  invariant(plan.candidates.every(candidate=>ADAPTER_TYPES.has(candidate?.type))&&adapterBatch.commandIntents.every(intent=>ADAPTER_TYPES.has(intent?.type)),'UNSUPPORTED_AI_PUBLIC_ATTACK_ADAPTER_TYPE');
  const candidates=plan.candidates.filter(candidate=>ATTACKS.has(candidate.type)),candidateByIntentId=new Map();
  for(const candidate of candidates){
    exactKeys(candidate,CANDIDATE_KEYS,'AI_PUBLIC_ATTACK_CANDIDATE_KEYS_MUST_BE_EXACT');
    const intentId=`INTENT:${candidate.candidateId}`;invariant(!candidateByIntentId.has(intentId),'DUPLICATE_AI_PUBLIC_ATTACK_CANDIDATE');candidateByIntentId.set(intentId,candidate);
  }
  const intents=adapterBatch.commandIntents.filter(intent=>intent?.actingFactionId===factionId&&ATTACKS.has(intent.type));
  invariant(intents.length===candidates.length,'AI_PUBLIC_ATTACK_INTENT_CANDIDATE_SET_MISMATCH');
  const failuresByIntent=new Map();
  for(const failure of adapterBatch.failureMemoryCandidates){
    if(!candidateByIntentId.has(failure?.sourceIntentId))continue;
    invariant(!failuresByIntent.has(failure.sourceIntentId),'DUPLICATE_AI_PUBLIC_ATTACK_FAILURE_CANDIDATE');failuresByIntent.set(failure.sourceIntentId,failure);
  }
  invariant(failuresByIntent.size===intents.length,'AI_PUBLIC_ATTACK_FAILURE_CANDIDATE_SET_MISMATCH');

  const requests=[],failureMemoryCandidates=[],seenArmies=new Set(),seenIntents=new Set();
  for(const intent of [...intents].sort(compare)){
    invariant(!seenIntents.has(intent.intentId),'DUPLICATE_AI_PUBLIC_ATTACK_INTENT');seenIntents.add(intent.intentId);
    invariant(!seenArmies.has(intent.armyId),'DUPLICATE_AI_PUBLIC_ATTACK_ARMY_INTENT');seenArmies.add(intent.armyId);
    const candidate=candidateByIntentId.get(intent.intentId);invariant(candidate,'AI_PUBLIC_ATTACK_CANDIDATE_NOT_FOUND');
    validateCandidateIntent(intent,candidate,adapterBatch.planningBoundaryId);
    invariant(intent.actingFactionId===factionId,'AI_PUBLIC_ATTACK_ACTING_FACTION_MISMATCH');
    const actor=publicView.world.ownArmies[intent.armyId];
    invariant(actor&&actor.factionId===factionId,'AI_PUBLIC_ATTACK_ACTOR_NOT_OWN_ACTIVE');
    invariant(Object.hasOwn(publicView.world.knowledge.observedArmies,intent.targetArmyId),'AI_PUBLIC_ATTACK_TARGET_NOT_CURRENTLY_OBSERVED');
    invariant(publicView.combat?.units?.[intent.armyId]?.own===true,'AI_PUBLIC_ATTACK_ACTOR_UNIT_NOT_PUBLIC_OWN');
    invariant(publicView.combat.units[intent.armyId].actionAvailability?.[intent.type]?.available===true,'AI_PUBLIC_ATTACK_ACTION_UNAVAILABLE');
    validateStableIntentId(intent);
    const expectedFingerprint=createFirst3FailedAttackRecord(snapshot,{failureId:'QUOTE.PUBLIC.ATTACK',armyId:intent.armyId,targetArmyId:intent.targetArmyId}).publicFingerprint;
    invariant(intent.publicAttackFingerprint===expectedFingerprint,'AI_PUBLIC_ATTACK_FINGERPRINT_MISMATCH');
    const failure=failuresByIntent.get(intent.intentId);validateFailureCandidate(snapshot,intent,failure);
    const request={requestId:intent.intentId,actingFactionId:intent.actingFactionId,actorRef:intent.armyId,targetRef:intent.targetArmyId,actionId:intent.type};
    exactKeys(request,REQUEST_KEYS,'AI_PUBLIC_ATTACK_REQUEST_KEYS_MUST_BE_EXACT');
    requests.push(request);failureMemoryCandidates.push(clone(failure));
  }
  return {requests:clone(requests),failureMemoryCandidates};
}

export const FIRST3_STRATEGIC_AI_PUBLIC_ATTACK_QUOTE_FORMAT=FORMAT;
export const FIRST3_STRATEGIC_AI_PUBLIC_ATTACK_QUOTE_VERSION=VERSION;
