import {
  createGrowthDraft,
  initializeGrowthState,
  rerollGrowthDraft,
  resolveGrowthDraft,
  validateTraitPool,
} from './growth-draft.mjs';

const FORMAT='sangoku-growth-track';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=6_000_000;
const SOURCE_KINDS=new Set(['CONFIRMED_SOURCE_EVENT','EXPLICIT_TEST_ENTITLEMENT']);
const ACTIONS=new Set(['PICK','HOLD','REPLACE','REROLL']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const id=value=>typeof value==='string'&&/^[A-Za-z0-9._:-]+$/.test(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function levelKey(characterId,levelAfter){return `${characterId}:L${levelAfter}`;}
function draftIdFor(state,entitlement){return `GROWTH-DRAFT:${state.campaignId}:${entitlement.characterId}:L${entitlement.levelAfter}`;}
function actionClaimKey(input){return stable({draftId:input.draftId,expectedRevision:input.expectedRevision,action:input.action,selectedTraitId:input.selectedTraitId??null});}

function validateEntitlement(entitlement){
  invariant(object(entitlement)&&id(entitlement.entitlementId)&&id(entitlement.sourceEventId)&&id(entitlement.characterId),'INVALID_GROWTH_ENTITLEMENT_ID');
  invariant(SOURCE_KINDS.has(entitlement.sourceKind),'INVALID_GROWTH_ENTITLEMENT_SOURCE_KIND');
  invariant(integer(entitlement.levelBefore,1)&&integer(entitlement.levelAfter,2)&&entitlement.levelAfter===entitlement.levelBefore+1,'INVALID_GROWTH_ENTITLEMENT_LEVEL');
  invariant(integer(entitlement.rngSeed)&&entitlement.rngSeed<=0xffffffff,'INVALID_GROWTH_ENTITLEMENT_SEED');
  invariant(entitlement.rngState===undefined||entitlement.rngState===null||(integer(entitlement.rngState)&&entitlement.rngState<=0xffffffff),'INVALID_GROWTH_ENTITLEMENT_RNG_STATE');
  invariant(object(entitlement.context),'INVALID_GROWTH_ENTITLEMENT_CONTEXT');
  invariant(!['xp','xpAmount','experienceAmount','xpFormula'].some(key=>Object.hasOwn(entitlement,key)),'GROWTH_TRACK_DOES_NOT_CALCULATE_XP');
  if(entitlement.sourceKind==='CONFIRMED_SOURCE_EVENT')invariant(entitlement.sourceVerified===true,'UNVERIFIED_GROWTH_SOURCE_EVENT');
  if(entitlement.sourceKind==='EXPLICIT_TEST_ENTITLEMENT')invariant(entitlement.fixture===true,'TEST_GROWTH_ENTITLEMENT_MUST_BE_EXPLICIT');
}

function validateProfile(profile,characterId){
  invariant(object(profile)&&profile.characterId===characterId&&id(profile.coreTraitId),'INVALID_GROWTH_CHARACTER_PROFILE');
  invariant(['PLAYER','AI'].includes(profile.controllerType),'INVALID_GROWTH_CONTROLLER_TYPE');
}

export function validateGrowthTrack(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_GROWTH_TRACK_FORMAT');
  invariant(id(state.campaignId)&&id(state.poolVersion)&&typeof state.poolFingerprint==='string'&&state.poolFingerprint,'INVALID_GROWTH_TRACK_IDENTITY');
  for(const key of ['characterProfiles','growthStates','initialLevels','entitlementsById','entitlementBySourceEvent','entitlementByCharacterLevel','draftsById','processedRequests','actionClaims'])invariant(object(state[key]),`INVALID_GROWTH_TRACK_COLLECTION:${key}`);
  for(const key of ['entitlementOrder','draftOrder'])invariant(Array.isArray(state[key])&&new Set(state[key]).size===state[key].length,`INVALID_GROWTH_TRACK_ORDER:${key}`);
  const characterIds=Object.keys(state.characterProfiles).sort();
  invariant(characterIds.length>0&&characterIds.length===Object.keys(state.growthStates).length,'GROWTH_TRACK_CHARACTER_MISMATCH');
  for(const characterId of characterIds){
    const profile=state.characterProfiles[characterId],growth=state.growthStates[characterId];validateProfile(profile,characterId);
    invariant(object(growth)&&growth.characterId===characterId&&integer(growth.level,1)&&object(growth.ownedTraitRanks),'INVALID_TRACKED_GROWTH_STATE');
    invariant(integer(state.initialLevels[characterId],1),'INVALID_GROWTH_INITIAL_LEVEL');
    if(growth.heldDraftId!==null)invariant(state.draftsById[growth.heldDraftId]?.characterId===characterId&&state.draftsById[growth.heldDraftId]?.state==='HELD',`TRACKED_HELD_DRAFT_MISMATCH:${characterId}`);
  }
  invariant(state.entitlementOrder.length===Object.keys(state.entitlementsById).length&&state.entitlementOrder.every(key=>Object.hasOwn(state.entitlementsById,key)),'GROWTH_ENTITLEMENT_ORDER_MISMATCH');
  invariant(state.draftOrder.length===Object.keys(state.draftsById).length&&state.draftOrder.every(key=>Object.hasOwn(state.draftsById,key)),'GROWTH_DRAFT_ORDER_MISMATCH');
  invariant(Object.keys(state.entitlementBySourceEvent).length===state.entitlementOrder.length&&Object.keys(state.entitlementByCharacterLevel).length===state.entitlementOrder.length,'GROWTH_ENTITLEMENT_INDEX_SIZE_MISMATCH');
  const expectedLevels=Object.fromEntries(characterIds.map(characterId=>[characterId,state.initialLevels[characterId]]));
  for(const entitlementId of state.entitlementOrder){
    const record=state.entitlementsById[entitlementId];
    invariant(object(record)&&record.entitlement?.entitlementId===entitlementId&&id(record.draftId),'INVALID_TRACKED_ENTITLEMENT');
    validateEntitlement(record.entitlement);
    const entitlement=record.entitlement,characterId=entitlement.characterId;
    invariant(Object.hasOwn(state.characterProfiles,characterId),'UNKNOWN_TRACKED_ENTITLEMENT_CHARACTER');
    invariant(entitlement.levelBefore===expectedLevels[characterId]&&entitlement.levelAfter===expectedLevels[characterId]+1,`NON_SEQUENTIAL_TRACKED_ENTITLEMENT:${characterId}:${entitlement.levelAfter}`);
    expectedLevels[characterId]=entitlement.levelAfter;
    invariant(state.entitlementBySourceEvent[entitlement.sourceEventId]===entitlementId,`GROWTH_SOURCE_EVENT_INDEX_MISMATCH:${entitlement.sourceEventId}`);
    invariant(state.entitlementByCharacterLevel[levelKey(characterId,entitlement.levelAfter)]===entitlementId,`GROWTH_LEVEL_INDEX_MISMATCH:${characterId}:${entitlement.levelAfter}`);
    const draft=state.draftsById[record.draftId];
    invariant(draft&&draft.draftId===record.draftId&&draft.characterId===characterId&&draft.sourceEventId===entitlement.sourceEventId&&draft.eligiblePoolVersion===state.poolVersion,'TRACKED_DRAFT_ENTITLEMENT_MISMATCH');
  }
  for(const characterId of characterIds)invariant(state.growthStates[characterId].level===expectedLevels[characterId],`TRACKED_CHARACTER_LEVEL_MISMATCH:${characterId}`);
  for(const draftId of state.draftOrder)invariant(state.draftsById[draftId]?.draftId===draftId,'INVALID_TRACKED_DRAFT');
  for(const[claimKey,record]of Object.entries(state.actionClaims))invariant(object(record)&&record.claimKey===claimKey&&id(record.draftId)&&state.draftsById[record.draftId]&&ACTIONS.has(record.action)&&object(record.result),'INVALID_GROWTH_ACTION_CLAIM');
  for(const[requestId,record]of Object.entries(state.processedRequests)){
    invariant(id(requestId)&&object(record)&&record.requestId===requestId&&typeof record.fingerprint==='string'&&['ENTITLEMENT','DRAFT_ACTION'].includes(record.kind)&&typeof record.resultRef==='string','INVALID_GROWTH_REQUEST_RECORD');
    if(record.kind==='ENTITLEMENT')invariant(state.entitlementsById[record.resultRef],`GROWTH_REQUEST_ENTITLEMENT_RESULT_MISSING:${requestId}`);
    if(record.kind==='DRAFT_ACTION')invariant(state.actionClaims[record.resultRef],`GROWTH_REQUEST_ACTION_RESULT_MISSING:${requestId}`);
  }
  return state;
}

export function createGrowthTrack({campaignId,pool,characters}={}){
  invariant(id(campaignId),'GROWTH_TRACK_CAMPAIGN_REQUIRED');
  const poolValidation=validateTraitPool(pool);invariant(poolValidation.valid,`INVALID_TRAIT_POOL:${poolValidation.errors.join(',')}`);
  invariant(object(characters)&&Object.keys(characters).length>0,'GROWTH_TRACK_CHARACTERS_REQUIRED');
  const characterProfiles={},growthStates={},initialLevels={};
  for(const characterId of Object.keys(characters).sort()){
    const profile={characterId,...clone(characters[characterId])};validateProfile(profile,characterId);
    const growth=initializeGrowthState({character:profile,pool});
    characterProfiles[characterId]=profile;growthStates[characterId]=growth;initialLevels[characterId]=growth.level;
  }
  return validateGrowthTrack({
    format:FORMAT,version:VERSION,campaignId,poolVersion:pool.poolVersion,poolFingerprint:stable(pool),
    characterProfiles,growthStates,initialLevels,
    entitlementsById:{},entitlementOrder:[],entitlementBySourceEvent:{},entitlementByCharacterLevel:{},
    draftsById:{},draftOrder:[],processedRequests:{},actionClaims:{},
  });
}

export function registerGrowthTrackCharacter(state,{pool,character}={}){
  validateGrowthTrack(state);const poolValidation=validateTraitPool(pool);invariant(poolValidation.valid,`INVALID_TRAIT_POOL:${poolValidation.errors.join(',')}`);
  invariant(object(character)&&id(character.characterId)&&!Object.hasOwn(state.characterProfiles,character.characterId),`GROWTH_CHARACTER_ALREADY_REGISTERED:${character?.characterId}`);
  const next=clone(state),profile=clone(character),growth=initializeGrowthState({character:profile,pool});validateProfile(profile,profile.characterId);
  next.poolVersion=pool.poolVersion;next.poolFingerprint=stable(pool);
  for(const draft of Object.values(next.draftsById))draft.eligiblePoolVersion=pool.poolVersion;
  next.characterProfiles[profile.characterId]=profile;next.growthStates[profile.characterId]=growth;next.initialLevels[profile.characterId]=growth.level;
  return validateGrowthTrack(next);
}

function requirePool(state,pool){
  const result=validateTraitPool(pool);invariant(result.valid,`INVALID_TRAIT_POOL:${result.errors.join(',')}`);
  invariant(pool.poolVersion===state.poolVersion,'GROWTH_TRACK_POOL_VERSION_MISMATCH');
  invariant(stable(pool)===state.poolFingerprint,'GROWTH_TRACK_POOL_CONTENT_MISMATCH');
}

function requestReplay(state,requestId,fingerprint){
  invariant(id(requestId),'GROWTH_REQUEST_ID_REQUIRED');
  const existing=state.processedRequests[requestId];
  if(!existing)return null;
  invariant(existing.fingerprint===fingerprint,`CONFLICTING_GROWTH_REQUEST:${requestId}`);
  return existing;
}

function recordRequest(state,{requestId,fingerprint,kind,resultRef}){
  state.processedRequests[requestId]={requestId,fingerprint,kind,resultRef};
}

function entitlementResult(state,entitlementId,replayed){
  const record=state.entitlementsById[entitlementId];
  return {state:clone(state),draft:clone(state.draftsById[record.draftId]),entitlement:clone(record.entitlement),replayed};
}

export function grantGrowthEntitlement(state,{requestId,entitlement,pool}={}){
  validateGrowthTrack(state);requirePool(state,pool);validateEntitlement(entitlement);
  const payload={type:'GRANT_GROWTH_ENTITLEMENT',entitlement},fingerprint=stable(payload),request=requestReplay(state,requestId,fingerprint);
  if(request){invariant(request.kind==='ENTITLEMENT','GROWTH_REQUEST_KIND_MISMATCH');return entitlementResult(state,request.resultRef,true);}
  const sourceExistingId=state.entitlementBySourceEvent[entitlement.sourceEventId];
  if(sourceExistingId){
    const existing=state.entitlementsById[sourceExistingId].entitlement;
    invariant(existing.entitlementId===entitlement.entitlementId&&stable(existing)===stable(entitlement),`CONFLICTING_SOURCE_EVENT_ENTITLEMENT:${entitlement.sourceEventId}`);
    const next=clone(state);recordRequest(next,{requestId,fingerprint,kind:'ENTITLEMENT',resultRef:sourceExistingId});validateGrowthTrack(next);return entitlementResult(next,sourceExistingId,true);
  }
  const sameId=state.entitlementsById[entitlement.entitlementId];
  invariant(!sameId,`CONFLICTING_GROWTH_ENTITLEMENT_ID:${entitlement.entitlementId}`);
  const profile=state.characterProfiles[entitlement.characterId],growth=state.growthStates[entitlement.characterId];
  invariant(profile&&growth,`UNKNOWN_GROWTH_CHARACTER:${entitlement.characterId}`);
  invariant(entitlement.levelBefore===growth.level&&entitlement.levelAfter===growth.level+1,`GROWTH_LEVEL_OUT_OF_ORDER:${entitlement.characterId}:current=${growth.level}:requested=${entitlement.levelBefore}->${entitlement.levelAfter}`);
  const key=levelKey(entitlement.characterId,entitlement.levelAfter),levelExistingId=state.entitlementByCharacterLevel[key];
  invariant(!levelExistingId,`DUPLICATE_CHARACTER_LEVEL_ENTITLEMENT:${key}`);
  const draftId=draftIdFor(state,entitlement);
  invariant(!state.draftsById[draftId],`DUPLICATE_GROWTH_DRAFT:${draftId}`);
  const context={...clone(entitlement.context),levelAfter:entitlement.levelAfter};
  const leveledGrowth=clone(growth);
  // I4 grants one aptitude point for every completed level before resolving the
  // separate trait opportunity. Pool exhaustion may add its own fallback point.
  leveledGrowth.aptitudePoints+=1;
  const generated=createGrowthDraft({draftId,sourceEventId:entitlement.sourceEventId,character:profile,state:leveledGrowth,context,pool,seed:entitlement.rngSeed,rngState:entitlement.rngState??null});
  const next=clone(state);generated.nextState.level=entitlement.levelAfter;
  next.growthStates[entitlement.characterId]=generated.nextState;
  next.draftsById[draftId]=generated.draft;next.draftOrder.push(draftId);
  next.entitlementsById[entitlement.entitlementId]={entitlement:clone(entitlement),draftId,status:generated.draft.state==='BLOCKED_DATA_ERROR'?'BLOCKED_DATA_ERROR':'DRAFT_CREATED'};
  next.entitlementOrder.push(entitlement.entitlementId);next.entitlementBySourceEvent[entitlement.sourceEventId]=entitlement.entitlementId;next.entitlementByCharacterLevel[key]=entitlement.entitlementId;
  recordRequest(next,{requestId,fingerprint,kind:'ENTITLEMENT',resultRef:entitlement.entitlementId});
  validateGrowthTrack(next);return entitlementResult(next,entitlement.entitlementId,false);
}

function actionResult(state,claimKey,replayed){
  const claim=state.actionClaims[claimKey];
  return {state:clone(state),draft:clone(state.draftsById[claim.draftId]),result:clone(claim.result),replayed};
}

export function applyTrackedDraftAction(state,input={}){
  validateGrowthTrack(state);
  const {requestId,draftId,expectedRevision,action,selectedTraitId=null}=input;
  invariant(id(draftId)&&integer(expectedRevision)&&ACTIONS.has(action),'INVALID_TRACKED_DRAFT_ACTION');
  const payload={type:'APPLY_TRACKED_DRAFT_ACTION',draftId,expectedRevision,action,selectedTraitId},fingerprint=stable(payload),request=requestReplay(state,requestId,fingerprint);
  if(request){invariant(request.kind==='DRAFT_ACTION','GROWTH_REQUEST_KIND_MISMATCH');return actionResult(state,request.resultRef,true);}
  const claimKey=actionClaimKey({draftId,expectedRevision,action,selectedTraitId}),existingClaim=state.actionClaims[claimKey];
  if(existingClaim){
    const next=clone(state);recordRequest(next,{requestId,fingerprint,kind:'DRAFT_ACTION',resultRef:claimKey});validateGrowthTrack(next);return actionResult(next,claimKey,true);
  }
  const draft=state.draftsById[draftId];invariant(draft,`UNKNOWN_TRACKED_DRAFT:${draftId}`);
  invariant(draft.offerRevision===expectedRevision,`GROWTH_DRAFT_REVISION_CONFLICT:${draftId}:actual=${draft.offerRevision}:expected=${expectedRevision}`);
  const growth=state.growthStates[draft.characterId];
  const applied=action==='REROLL'?rerollGrowthDraft({draft,state:growth}):resolveGrowthDraft({draft,state:growth,action,selectedTraitId});
  const next=clone(state);next.draftsById[draftId]=applied.draft;next.growthStates[draft.characterId]=applied.nextState;
  const result={draftId,action,selectedTraitId:action==='PICK'?selectedTraitId:null,draftState:applied.draft.state,resolutionReason:applied.draft.resolutionReason,offerRevision:applied.draft.offerRevision,aptitudePoints:applied.nextState.aptitudePoints,ownedTraitRanks:clone(applied.nextState.ownedTraitRanks)};
  next.actionClaims[claimKey]={claimKey,draftId,expectedRevision,action,selectedTraitId:action==='PICK'?selectedTraitId:null,result};
  recordRequest(next,{requestId,fingerprint,kind:'DRAFT_ACTION',resultRef:claimKey});validateGrowthTrack(next);return actionResult(next,claimKey,false);
}

export function getTrackedDraft(state,draftId){validateGrowthTrack(state);invariant(state.draftsById[draftId],`UNKNOWN_TRACKED_DRAFT:${draftId}`);return clone(state.draftsById[draftId]);}
export function listTrackedDrafts(state,{characterId=null}={}){validateGrowthTrack(state);if(characterId!==null)invariant(state.characterProfiles[characterId],`UNKNOWN_GROWTH_CHARACTER:${characterId}`);return state.draftOrder.map(draftId=>state.draftsById[draftId]).filter(draft=>characterId===null||draft.characterId===characterId).map(clone);}
export function serializeGrowthTrack(state){validateGrowthTrack(state);return JSON.stringify(state,null,2);}
export function deserializeGrowthTrack(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_GROWTH_TRACK_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_GROWTH_TRACK_JSON');}
  validateGrowthTrack(state);return clone(state);
}

export const GROWTH_TRACK_FORMAT=FORMAT;
export const GROWTH_TRACK_VERSION=VERSION;
