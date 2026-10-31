import {createFirst3StrategicAiSnapshotFromRuntimePublicView} from './first3-strategic-ai-runtime-adapter.mjs';

const FORMAT='first3-strategic-ai-public-movement-quote';
const VERSION=1;
const BATCH_KEYS=['format','version','planningBoundaryId','globalTick','turnNumber','source','publicViewFingerprints','snapshots','plans','skippedFactions','commandIntents','failureMemoryCandidates','supplyStatus','runtimeCommit','failureMemoryPersistence'];
const INTENT_KEYS=['intentId','planningBoundaryId','actingFactionId','armyId','type','destinationTileId','targetArmyId','pathTileIds','reasonCode','publicAttackFingerprint','submissionStatus'];
const CANDIDATE_KEYS=['candidateId','actingFactionId','armyId','type','destinationTileId','targetArmyId','pathTileIds','reasonCode','publicAttackFingerprint'];
const CORE_KEYS=['armyId','type','destinationTileId','factionId','validatedPathTileIds'];
const KNOWN=new Set(['VISIBLE','REMEMBERED']);
const MOVEMENT_CLASS=Object.freeze({spear:'normal',bow:'normal',militia:'normal',mystic:'normal',cavalry:'cavalry',engineer:'engineer'});

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
function fingerprint(value){
  let hash=0x811c9dc5;
  for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;
  return hash.toString(16).padStart(8,'0');
}
function compare(left,right){
  for(const key of ['actingFactionId','armyId','intentId']){
    const a=String(left[key]),b=String(right[key]);if(a<b)return -1;if(a>b)return 1;
  }
  return 0;
}
function edgePair(left,right){return left<right?`${left}|${right}`:`${right}|${left}`;}

function validateBatchBoundary(publicView,batch,snapshot){
  exactKeys(batch,BATCH_KEYS,'AI_PUBLIC_MOVEMENT_ADAPTER_BATCH_KEYS_MUST_BE_EXACT');
  invariant(batch.format==='first3-strategic-ai-runtime-adapter-batch'&&batch.version===1,'INVALID_AI_PUBLIC_MOVEMENT_ADAPTER_BATCH_FORMAT');
  invariant(batch.source==='GET_FIRST3_RUNTIME_PUBLIC_VIEW_ONLY'&&batch.runtimeCommit==='NOT_PERFORMED','AI_PUBLIC_MOVEMENT_ADAPTER_MUST_BE_UNCOMMITTED');
  invariant(batch.supplyStatus==='NOT_AVAILABLE'&&batch.failureMemoryPersistence==='NOT_CONNECTED','INVALID_AI_PUBLIC_MOVEMENT_ADAPTER_STATUS');
  const world=publicView.world,expectedBoundary=`TURN-${world.turnNumber}-G${publicView.globalTick}`;
  invariant(world.turnPhase==='PLANNING'&&world.time.tick===0,'AI_PUBLIC_MOVEMENT_QUOTE_REQUIRES_PLANNING_BOUNDARY');
  invariant(batch.globalTick===publicView.globalTick&&batch.turnNumber===world.turnNumber&&batch.planningBoundaryId===expectedBoundary,'STALE_AI_PUBLIC_MOVEMENT_PLANNING_BOUNDARY');
  const factionId=world.factionId;
  const fingerprintEntries=batch.publicViewFingerprints.filter(entry=>entry?.factionId===factionId);
  invariant(fingerprintEntries.length===1,'AI_PUBLIC_MOVEMENT_FINGERPRINT_ENTRY_REQUIRED');
  const expectedFingerprint=fingerprint(snapshot);
  invariant(fingerprintEntries[0].fingerprint===expectedFingerprint,'STALE_AI_PUBLIC_MOVEMENT_FINGERPRINT');
  const snapshots=batch.snapshots.filter(entry=>entry?.factionId===factionId);
  invariant(snapshots.length===1&&stable(snapshots[0])===stable(snapshot),'STALE_AI_PUBLIC_MOVEMENT_SNAPSHOT');
  const plans=batch.plans.filter(entry=>entry?.factionId===factionId);
  invariant(plans.length===1,'AI_PUBLIC_MOVEMENT_PLAN_REQUIRED');
  const plan=plans[0];
  invariant(plan.planningBoundaryId===expectedBoundary&&plan.publicSnapshotFingerprint===expectedFingerprint&&plan.runtimeCommit==='NOT_PERFORMED','STALE_AI_PUBLIC_MOVEMENT_PLAN');
  invariant(Array.isArray(plan.candidates),'INVALID_AI_PUBLIC_MOVEMENT_PLAN_CANDIDATES');
  return plan;
}

function validateCandidateIntent(intent,candidate,boundaryId){
  exactKeys(intent,INTENT_KEYS,'AI_PUBLIC_MOVEMENT_INTENT_KEYS_MUST_BE_EXACT');
  exactKeys(candidate,CANDIDATE_KEYS,'AI_PUBLIC_MOVEMENT_CANDIDATE_KEYS_MUST_BE_EXACT');
  invariant(['MOVE','HOLD'].includes(intent.type)&&candidate.type===intent.type,'INVALID_AI_PUBLIC_MOVEMENT_INTENT_TYPE');
  invariant(intent.submissionStatus==='NOT_SUBMITTED','AI_PUBLIC_MOVEMENT_INTENT_ALREADY_SUBMITTED');
  invariant(intent.planningBoundaryId===boundaryId&&candidate.actingFactionId===intent.actingFactionId&&candidate.armyId===intent.armyId,'AI_PUBLIC_MOVEMENT_INTENT_CANDIDATE_MISMATCH');
  const expectedIntent={
    intentId:`INTENT:${candidate.candidateId}`,
    planningBoundaryId:boundaryId,
    actingFactionId:candidate.actingFactionId,
    armyId:candidate.armyId,
    type:candidate.type,
    destinationTileId:candidate.destinationTileId,
    targetArmyId:candidate.targetArmyId,
    pathTileIds:candidate.pathTileIds,
    reasonCode:candidate.reasonCode,
    publicAttackFingerprint:candidate.publicAttackFingerprint,
    submissionStatus:'NOT_SUBMITTED',
  };
  invariant(stable(intent)===stable(expectedIntent),'AI_PUBLIC_MOVEMENT_INTENT_CANDIDATE_MISMATCH');
  invariant(text(intent.reasonCode)&&intent.targetArmyId===null&&intent.publicAttackFingerprint===null,'INVALID_AI_PUBLIC_MOVEMENT_NON_ATTACK_FIELDS');
}

function validateStableIntentId(intent,army){
  const suffix=intent.type==='MOVE'?intent.destinationTileId:army.tileId;
  const candidateId=`AI:${intent.planningBoundaryId}:${intent.actingFactionId}:${intent.armyId}:${intent.type}:${suffix}`;
  invariant(intent.intentId===`INTENT:${candidateId}`,'UNSTABLE_AI_PUBLIC_MOVEMENT_INTENT_ID');
}

function quoteMove(publicView,intent,army){
  invariant(text(intent.destinationTileId)&&Array.isArray(intent.pathTileIds)&&intent.pathTileIds.length>0,'INVALID_AI_PUBLIC_MOVE_PATH');
  const path=[...intent.pathTileIds];
  invariant(path.every(text)&&path[0]===army.tileId,'AI_PUBLIC_MOVE_PATH_START_MISMATCH');
  invariant(path.at(-1)===intent.destinationTileId,'AI_PUBLIC_MOVE_PATH_DESTINATION_MISMATCH');
  invariant(new Set(path).size===path.length,'AI_PUBLIC_MOVE_PATH_REPEATS_TILE');
  const knowledge=publicView.world.knowledge.tiles;
  for(const tileId of path)invariant(KNOWN.has(knowledge[tileId]),`AI_PUBLIC_MOVE_PATH_TILE_NOT_KNOWN:${tileId}`);
  const movementClass=MOVEMENT_CLASS[army.troopType];
  invariant(movementClass,'UNSUPPORTED_AI_PUBLIC_MOVE_TROOP');
  const edges=new Map(publicView.world.knownEdges.map(edge=>[edgePair(edge.fromTileId,edge.toTileId),edge]));
  for(let index=1;index<path.length;index++){
    const from=path[index-1],to=path[index],edge=edges.get(edgePair(from,to));
    invariant(edge,'AI_PUBLIC_MOVE_PATH_EDGE_NOT_KNOWN');
    invariant(edge.blocked===false&&integer(edge.travelTicksByClass?.[movementClass],1),'AI_PUBLIC_MOVE_PATH_EDGE_BLOCKED');
  }
  return {armyId:intent.armyId,type:'MOVE',destinationTileId:intent.destinationTileId,factionId:intent.actingFactionId,validatedPathTileIds:path};
}

function quoteHold(intent,army){
  invariant(intent.destinationTileId===army.tileId&&Array.isArray(intent.pathTileIds)&&intent.pathTileIds.length===1&&intent.pathTileIds[0]===army.tileId,'AI_PUBLIC_HOLD_MUST_USE_CURRENT_TILE_ONLY');
  return {armyId:intent.armyId,type:'HOLD',destinationTileId:null,factionId:intent.actingFactionId,validatedPathTileIds:null};
}

/**
 * Quote MOVE/HOLD adapter intents into the exact public core movement input.
 * It consumes only getFirst3RuntimePublicView data plus the uncommitted public
 * adapter batch. It does not accept a runtime, mapRules, or occupancy data.
 */
export function quoteFirst3StrategicAiPublicMovementBatch(publicView,adapterBatch){
  const snapshot=createFirst3StrategicAiSnapshotFromRuntimePublicView(publicView);
  const plan=validateBatchBoundary(publicView,adapterBatch,snapshot),factionId=publicView.world.factionId;
  const candidates=plan.candidates.filter(candidate=>['MOVE','HOLD'].includes(candidate.type));
  const candidateByIntentId=new Map();
  for(const candidate of candidates){
    exactKeys(candidate,CANDIDATE_KEYS,'AI_PUBLIC_MOVEMENT_CANDIDATE_KEYS_MUST_BE_EXACT');
    const intentId=`INTENT:${candidate.candidateId}`;invariant(!candidateByIntentId.has(intentId),'DUPLICATE_AI_PUBLIC_MOVEMENT_CANDIDATE');candidateByIntentId.set(intentId,candidate);
  }
  const intents=adapterBatch.commandIntents.filter(intent=>intent?.actingFactionId===factionId&&['MOVE','HOLD'].includes(intent.type));
  invariant(intents.length===candidates.length,'AI_PUBLIC_MOVEMENT_INTENT_CANDIDATE_SET_MISMATCH');
  const seenArmies=new Set(),seenIntents=new Set(),quoted=[];
  for(const intent of [...intents].sort(compare)){
    invariant(!seenIntents.has(intent.intentId),'DUPLICATE_AI_PUBLIC_MOVEMENT_INTENT');seenIntents.add(intent.intentId);
    invariant(!seenArmies.has(intent.armyId),'DUPLICATE_AI_PUBLIC_MOVEMENT_ARMY_INTENT');seenArmies.add(intent.armyId);
    const candidate=candidateByIntentId.get(intent.intentId);
    invariant(candidate,'AI_PUBLIC_MOVEMENT_CANDIDATE_NOT_FOUND');
    validateCandidateIntent(intent,candidate,adapterBatch.planningBoundaryId);
    invariant(intent.actingFactionId===factionId,'AI_PUBLIC_MOVEMENT_ACTING_FACTION_MISMATCH');
    const army=publicView.world.ownArmies[intent.armyId];
    invariant(army&&army.factionId===factionId,'AI_PUBLIC_MOVEMENT_ARMY_NOT_OWN_ACTIVE');
    validateStableIntentId(intent,army);
    const coreInput=intent.type==='MOVE'?quoteMove(publicView,intent,army):quoteHold(intent,army);
    exactKeys(coreInput,CORE_KEYS,'AI_PUBLIC_MOVEMENT_CORE_INPUT_KEYS_MUST_BE_EXACT');
    quoted.push(coreInput);
  }
  return clone(quoted);
}

export const FIRST3_STRATEGIC_AI_PUBLIC_MOVEMENT_QUOTE_FORMAT=FORMAT;
export const FIRST3_STRATEGIC_AI_PUBLIC_MOVEMENT_QUOTE_VERSION=VERSION;
