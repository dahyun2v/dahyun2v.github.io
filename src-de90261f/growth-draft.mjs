import {createRng} from './rng.mjs';

export const GROWTH_STAGES=Object.freeze(['EARLY','MID','LATE']);
export const RARITY_ORDER=Object.freeze(['COMMON','RARE','HEROIC','LEGENDARY','MYTHIC']);
export const OWNERSHIP_TYPES=Object.freeze(['CORE','BRANCH','PUBLIC']);

export const DEFAULT_GROWTH_DRAFT_CONFIG=deepFreeze({
  schemaVersion:'growth-draft-v1',
  candidateCount:3,
  maxRank:5,
  holdLimit:1,
  rerollLimit:1,
  rerollAptitudeCost:1,
  replaceLimitPerStage:1,
  replaceAptitudeReward:1,
  unselectedCooldownDrafts:2,
  traceThreshold:3,
  weights:{base:100,affinity:30,role:25,trace:15,situation:10,min:25,max:180},
  rarityWeightsByStage:{
    EARLY:{COMMON:50,RARE:30,HEROIC:15,LEGENDARY:4,MYTHIC:1},
    MID:{COMMON:30,RARE:30,HEROIC:25,LEGENDARY:10,MYTHIC:5},
    LATE:{COMMON:15,RARE:25,HEROIC:30,LEGENDARY:20,MYTHIC:10},
  },
});

function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value))deepFreeze(child);
  }
  return value;
}

function clone(value){return structuredClone(value);}
function fail(code){const error=new Error(code);error.code=code;throw error;}
function isId(value){return typeof value==='string'&&value.trim().length>0;}
function asArray(value){return Array.isArray(value)?value:[];}
function uniqueStrings(value){return [...new Set(asArray(value).filter(isId))].sort();}
function intersects(a,b){const right=new Set(b);return a.some(item=>right.has(item));}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

export function growthStageForLevel(level){
  if(!Number.isInteger(level)||level<2||level>30)fail('INVALID_LEVEL_AFTER');
  if(level<=9)return 'EARLY';
  if(level<=19)return 'MID';
  return 'LATE';
}

export function validateTraitPool(pool){
  const errors=[];
  if(!pool||typeof pool!=='object')return {valid:false,errors:['POOL_REQUIRED']};
  if(!isId(pool.poolVersion))errors.push('POOL_VERSION_REQUIRED');
  if(!['CANONICAL','PROVIDED_FIXTURE'].includes(pool.sourceType))errors.push('POOL_SOURCE_TYPE_INVALID');
  if(pool.sourceType==='PROVIDED_FIXTURE'&&pool.fixture!==true)errors.push('FIXTURE_FLAG_REQUIRED');
  if(!Array.isArray(pool.traits)||pool.traits.length===0)errors.push('TRAITS_REQUIRED');
  const ids=new Set();
  for(const trait of asArray(pool.traits)){
    const id=trait?.traitId;
    if(!isId(id)){errors.push('TRAIT_ID_REQUIRED');continue;}
    if(ids.has(id))errors.push(`DUPLICATE_TRAIT_ID:${id}`);else ids.add(id);
    if(!OWNERSHIP_TYPES.includes(trait.ownershipType))errors.push(`OWNERSHIP_TYPE_INVALID:${id}`);
    if((trait.ownershipType==='CORE'||trait.ownershipType==='BRANCH')&&!isId(trait.ownerCharacterId))errors.push(`OWNER_REQUIRED:${id}`);
    if(trait.ownershipType==='BRANCH'&&!isId(trait.branchId))errors.push(`BRANCH_ID_REQUIRED:${id}`);
    if(!RARITY_ORDER.includes(trait.rarity))errors.push(`RARITY_INVALID:${id}`);
    if(trait.rankMax!==5)errors.push(`RANK_MAX_MUST_BE_5:${id}`);
    const stages=asArray(trait.stageTags);
    if(stages.length===0||stages.some(stage=>!GROWTH_STAGES.includes(stage)))errors.push(`STAGE_TAGS_INVALID:${id}`);
    for(const field of ['affinityTags','roleTags','situationTags','experienceTags','prerequisiteTraitIds']){
      if(trait[field]!==undefined&&!Array.isArray(trait[field]))errors.push(`${field.toUpperCase()}_INVALID:${id}`);
    }
  }
  for(const trait of asArray(pool.traits)){
    for(const prerequisiteId of asArray(trait?.prerequisiteTraitIds))if(!ids.has(prerequisiteId))errors.push(`PREREQUISITE_UNKNOWN:${trait.traitId}:${prerequisiteId}`);
  }
  return {valid:errors.length===0,errors:[...new Set(errors)].sort()};
}

function assertValidPool(pool){
  const result=validateTraitPool(pool);
  if(!result.valid)fail(`INVALID_TRAIT_POOL:${result.errors.join(',')}`);
}

function normalizedState(state){
  if(!state||typeof state!=='object'||!isId(state.characterId))fail('GROWTH_STATE_REQUIRED');
  const next=clone(state);
  next.schemaVersion??='growth-state-v1';
  next.level??=1;
  next.aptitudePoints??=0;
  next.selectedBranchId??=null;
  next.ownedTraitRanks??={};
  next.heldDraftId??=null;
  next.replacementUsesByStage??={EARLY:0,MID:0,LATE:0};
  next.traitOfferCooldowns??={};
  next.nextDraftIndex??=1;
  return next;
}

export function initializeGrowthState({character,pool}){
  assertValidPool(pool);
  if(!character||!isId(character.characterId)||!isId(character.coreTraitId))fail('CHARACTER_CORE_REQUIRED');
  const core=pool.traits.find(trait=>trait.traitId===character.coreTraitId);
  if(!core||core.ownershipType!=='CORE'||core.ownerCharacterId!==character.characterId)fail('CORE_GUARANTEE_MISMATCH');
  return {
    schemaVersion:'growth-state-v1',
    characterId:character.characterId,
    controllerType:character.controllerType??'AI',
    level:character.level??1,
    aptitudePoints:character.aptitudePoints??0,
    selectedBranchId:character.selectedBranchId??null,
    ownedTraitRanks:{[core.traitId]:1,...clone(character.ownedTraitRanks??{})},
    heldDraftId:null,
    replacementUsesByStage:{EARLY:0,MID:0,LATE:0},
    traitOfferCooldowns:{},
    nextDraftIndex:1,
  };
}

function ownershipEligible(trait,character,state){
  if(trait.ownershipType==='PUBLIC')return true;
  if(trait.ownerCharacterId!==character.characterId)return false;
  if(trait.ownershipType==='CORE')return trait.traitId===character.coreTraitId;
  return Boolean(state.selectedBranchId)&&trait.branchId===state.selectedBranchId;
}

function prerequisiteEligible(trait,state){
  return asArray(trait.prerequisiteTraitIds).every(id=>(state.ownedTraitRanks[id]??0)>0);
}

function metaEligible(trait,character){
  return !trait.metaUnlockId||new Set(asArray(character.unlockedMetaIds)).has(trait.metaUnlockId);
}

function contextSnapshot(character,state,context,stage){
  const traces=asArray(context.experienceTraces).map(trace=>({
    tag:trace.tag,
    validContributions:Number.isInteger(trace.validContributions)?trace.validContributions:0,
    sourceEventIds:uniqueStrings(trace.sourceEventIds),
  })).filter(trace=>isId(trace.tag)).sort((a,b)=>a.tag.localeCompare(b.tag));
  return {
    levelAfter:context.levelAfter,
    growthStage:stage,
    characterAffinityTags:uniqueStrings(character.affinityTags),
    roleTags:uniqueStrings(context.roleTags),
    regionTags:uniqueStrings(context.regionTags),
    situationTags:uniqueStrings(context.situationTags),
    objectiveTags:uniqueStrings(context.objectiveTags),
    experienceTraces:traces,
    selectedBranchId:state.selectedBranchId,
    observedSourceEventIds:uniqueStrings(context.observedSourceEventIds),
  };
}

function candidateWeight(trait,snapshot,config){
  const reasons=[];
  let weight=config.weights.base;
  if(intersects(asArray(trait.affinityTags),snapshot.characterAffinityTags)){weight+=config.weights.affinity;reasons.push('CHARACTER_AFFINITY');}
  if(intersects(asArray(trait.roleTags),snapshot.roleTags)){weight+=config.weights.role;reasons.push('CURRENT_ROLE');}
  const qualifiedTraceTags=snapshot.experienceTraces.filter(trace=>trace.validContributions>=config.traceThreshold).map(trace=>trace.tag);
  if(intersects(asArray(trait.experienceTags),qualifiedTraceTags)){weight+=config.weights.trace;reasons.push('EXPERIENCE_TRACE');}
  const situation=[...snapshot.regionTags,...snapshot.situationTags,...snapshot.objectiveTags];
  if(intersects(asArray(trait.situationTags),situation)){weight+=config.weights.situation;reasons.push('CURRENT_SITUATION');}
  return {weight:clamp(weight,config.weights.min,config.weights.max),weightReasonTags:reasons};
}

function buildCandidateSnapshot({character,state,context,pool,stage,draftIndex,config}){
  const snapshot=contextSnapshot(character,state,context,stage);
  const base=pool.traits.filter(trait=>
    ownershipEligible(trait,character,state)&&
    trait.stageTags.includes(stage)&&
    prerequisiteEligible(trait,state)&&
    metaEligible(trait,character)
  ).sort((a,b)=>a.traitId.localeCompare(b.traitId));
  const notMaxed=base.filter(trait=>(state.ownedTraitRanks[trait.traitId]??0)<config.maxRank);
  if(base.length>0&&notMaxed.length===0)return {status:'POOL_EXHAUSTED',snapshot,candidates:[],cooldownRelaxedTraitIds:[]};
  if(base.length===0)return {status:'BLOCKED_DATA_ERROR',reasonCode:'NO_STAGE_FALLBACK_CANDIDATE',snapshot,candidates:[],cooldownRelaxedTraitIds:[]};

  const cooldownActive=trait=>(state.traitOfferCooldowns[trait.traitId]??0)>=draftIndex;
  let available=notMaxed.filter(trait=>!cooldownActive(trait));
  const relaxed=[];
  if(available.length===0&&notMaxed.length>0){
    const ordered=[...notMaxed].sort((a,b)=>(state.traitOfferCooldowns[a.traitId]??0)-(state.traitOfferCooldowns[b.traitId]??0)||a.traitId.localeCompare(b.traitId));
    const earliest=state.traitOfferCooldowns[ordered[0].traitId]??0;
    available=ordered.filter(trait=>(state.traitOfferCooldowns[trait.traitId]??0)===earliest);
    relaxed.push(...available.map(trait=>trait.traitId));
  }
  const candidates=available.map(trait=>({
    traitId:trait.traitId,
    rarity:trait.rarity,
    ...candidateWeight(trait,snapshot,config),
  }));
  return {status:'READY',snapshot,candidates,cooldownRelaxedTraitIds:relaxed};
}

function weightedPick(items,getWeight,randomValue){
  const weights=items.map(item=>Math.max(0,Number(getWeight(item))||0));
  const total=weights.reduce((sum,value)=>sum+value,0);
  if(total<=0)fail('WEIGHT_TOTAL_ZERO');
  let cursor=randomValue*total;
  for(let index=0;index<items.length;index+=1){
    cursor-=weights[index];
    if(cursor<0)return items[index];
  }
  return items.at(-1);
}

function rarityPool(candidates,rolledRarity){
  const rolledIndex=RARITY_ORDER.indexOf(rolledRarity);
  const exact=candidates.filter(candidate=>candidate.rarity===rolledRarity);
  if(exact.length)return {items:exact,actualRarity:rolledRarity,fallback:'EXACT'};
  for(let index=rolledIndex-1;index>=0;index-=1){
    const lower=candidates.filter(candidate=>candidate.rarity===RARITY_ORDER[index]);
    if(lower.length)return {items:lower,actualRarity:RARITY_ORDER[index],fallback:'LOWER'};
  }
  for(let index=rolledIndex+1;index<RARITY_ORDER.length;index+=1){
    const upper=candidates.filter(candidate=>candidate.rarity===RARITY_ORDER[index]);
    if(upper.length)return {items:upper,actualRarity:RARITY_ORDER[index],fallback:'UPPER'};
  }
  fail('NO_RARITY_CANDIDATE');
}

function drawCandidates(candidates,stage,rng,config,count=config.candidateCount){
  const remaining=clone(candidates).sort((a,b)=>a.traitId.localeCompare(b.traitId));
  const offered=[];
  while(remaining.length&&offered.length<count){
    const rarityWeights=config.rarityWeightsByStage[stage];
    const rolledRarity=weightedPick(RARITY_ORDER,tier=>rarityWeights[tier],rng.next());
    const selectedPool=rarityPool(remaining,rolledRarity);
    const chosen=weightedPick(selectedPool.items,item=>item.weight,rng.next());
    offered.push({...clone(chosen),rolledRarity,actualRarity:selectedPool.actualRarity,rarityFallback:selectedPool.fallback});
    remaining.splice(remaining.findIndex(item=>item.traitId===chosen.traitId),1);
  }
  return offered;
}

function makeBaseDraft({draftId,sourceEventId,character,state,stage,pool,contextSnapshotValue,draftIndex,config}){
  return {
    schemaVersion:config.schemaVersion,
    draftId,
    characterId:character.characterId,
    controllerType:state.controllerType,
    growthStage:stage,
    sourceEventId,
    eligiblePoolVersion:pool.poolVersion,
    draftIndex,
    contextSnapshot:contextSnapshotValue,
    offeredIds:[],
    offered:[],
    eligibleCandidateSnapshot:[],
    cooldownRelaxedTraitIds:[],
    selectedTraitId:null,
    held:false,
    skipped:false,
    rerollCount:0,
    offerRevision:0,
    state:'OFFERED',
    resolutionReason:null,
    drawState:null,
  };
}

export function createGrowthDraft({draftId,sourceEventId,character,state,context,pool,seed=1,rngState=null,config=DEFAULT_GROWTH_DRAFT_CONFIG}){
  assertValidPool(pool);
  if(!isId(draftId)||!isId(sourceEventId))fail('DRAFT_AND_SOURCE_EVENT_REQUIRED');
  if(!character||!isId(character.characterId)||!isId(character.coreTraitId))fail('CHARACTER_REQUIRED');
  if(context?.requestedTraitId!==undefined||character.requestedTraitId!==undefined)fail('EXACT_TRAIT_ORDER_FORBIDDEN');
  const nextState=normalizedState(state);
  if(nextState.characterId!==character.characterId)fail('CHARACTER_STATE_MISMATCH');
  const stage=growthStageForLevel(context?.levelAfter);
  const draftIndex=nextState.nextDraftIndex;
  const built=buildCandidateSnapshot({character,state:nextState,context,pool,stage,draftIndex,config});
  const draft=makeBaseDraft({draftId,sourceEventId,character,state:nextState,stage,pool,contextSnapshotValue:built.snapshot,draftIndex,config});
  draft.cooldownRelaxedTraitIds=built.cooldownRelaxedTraitIds;
  nextState.nextDraftIndex+=1;

  if(built.status==='POOL_EXHAUSTED'){
    nextState.aptitudePoints+=1;
    draft.state='RESOLVED';
    draft.skipped=true;
    draft.resolutionReason='POOL_EXHAUSTED_APTITUDE';
    draft.drawState={algorithm:'LCG32-v1',seed:Number(seed)>>>0,before:rngState??((Number(seed)>>>0)||1),after:rngState??((Number(seed)>>>0)||1),consumed:0};
    return {draft,nextState};
  }
  if(built.status==='BLOCKED_DATA_ERROR'){
    draft.state='BLOCKED_DATA_ERROR';
    draft.resolutionReason=built.reasonCode;
    draft.drawState={algorithm:'LCG32-v1',seed:Number(seed)>>>0,before:rngState??((Number(seed)>>>0)||1),after:rngState??((Number(seed)>>>0)||1),consumed:0};
    return {draft,nextState};
  }

  const rng=createRng(seed);
  if(rngState!==null)rng.restore(rngState);
  const before=rng.state();
  const offered=drawCandidates(built.candidates,stage,rng,config);
  draft.offered=offered;
  draft.offeredIds=offered.map(item=>item.traitId);
  draft.eligibleCandidateSnapshot=clone(built.candidates);
  draft.drawState={algorithm:'LCG32-v1',seed:Number(seed)>>>0,before,after:rng.state(),consumed:offered.length*2};
  return {draft,nextState};
}

function assertResolvable(draft){
  if(!draft||!['OFFERED','HELD'].includes(draft.state))fail('DRAFT_NOT_RESOLVABLE');
}

function applyUnselectedCooldowns(state,draft,selectedTraitId,config){
  for(const traitId of draft.offeredIds){
    if(traitId!==selectedTraitId)state.traitOfferCooldowns[traitId]=draft.draftIndex+config.unselectedCooldownDrafts;
  }
}

export function resolveGrowthDraft({draft,state,action,selectedTraitId=null,config=DEFAULT_GROWTH_DRAFT_CONFIG}){
  assertResolvable(draft);
  const nextDraft=clone(draft),nextState=normalizedState(state);
  if(nextDraft.characterId!==nextState.characterId)fail('CHARACTER_STATE_MISMATCH');
  if(action==='PICK'){
    if(!nextDraft.offeredIds.includes(selectedTraitId))fail('SELECTED_TRAIT_NOT_OFFERED');
    const rank=nextState.ownedTraitRanks[selectedTraitId]??0;
    if(rank>=config.maxRank)fail('SELECTED_TRAIT_ALREADY_MAX');
    nextState.ownedTraitRanks[selectedTraitId]=rank+1;
    applyUnselectedCooldowns(nextState,nextDraft,selectedTraitId,config);
    if(nextState.heldDraftId===nextDraft.draftId)nextState.heldDraftId=null;
    nextDraft.state='RESOLVED';
    nextDraft.selectedTraitId=selectedTraitId;
    nextDraft.held=false;
    nextDraft.resolutionReason=rank===0?'NEW_TRAIT_R1':'DUPLICATE_RANK_UP';
    return {draft:nextDraft,nextState};
  }
  if(action==='HOLD'){
    if(config.holdLimit<1)fail('HOLD_DISABLED');
    if(nextState.heldDraftId&&nextState.heldDraftId!==nextDraft.draftId)fail('HOLD_LIMIT_REACHED');
    nextState.heldDraftId=nextDraft.draftId;
    nextDraft.state='HELD';
    nextDraft.held=true;
    nextDraft.resolutionReason='PLAYER_HELD';
    return {draft:nextDraft,nextState};
  }
  if(action==='REPLACE'){
    const used=nextState.replacementUsesByStage[nextDraft.growthStage]??0;
    if(used>=config.replaceLimitPerStage)fail('REPLACE_LIMIT_REACHED');
    nextState.replacementUsesByStage[nextDraft.growthStage]=used+1;
    nextState.aptitudePoints+=config.replaceAptitudeReward;
    applyUnselectedCooldowns(nextState,nextDraft,null,config);
    if(nextState.heldDraftId===nextDraft.draftId)nextState.heldDraftId=null;
    nextDraft.state='REPLACED';
    nextDraft.skipped=true;
    nextDraft.held=false;
    nextDraft.resolutionReason='GENERAL_GROWTH_APTITUDE';
    return {draft:nextDraft,nextState};
  }
  fail('DRAFT_ACTION_INVALID');
}

export function rerollGrowthDraft({draft,state,config=DEFAULT_GROWTH_DRAFT_CONFIG}){
  if(!draft||draft.state!=='OFFERED')fail('REROLL_REQUIRES_OFFERED');
  if(draft.rerollCount>=config.rerollLimit)fail('REROLL_LIMIT_REACHED');
  const nextState=normalizedState(state);
  if(nextState.characterId!==draft.characterId)fail('CHARACTER_STATE_MISMATCH');
  if(nextState.aptitudePoints<config.rerollAptitudeCost)fail('REROLL_COST_UNAVAILABLE');
  const oldIds=new Set(draft.offeredIds);
  const alternatives=draft.eligibleCandidateSnapshot.filter(item=>!oldIds.has(item.traitId));
  if(alternatives.length===0)fail('REROLL_NO_ALTERNATIVE_CANDIDATE');
  const rng=createRng(draft.drawState.seed);
  rng.restore(draft.drawState.after);
  const before=rng.state();
  const offered=drawCandidates(alternatives,draft.growthStage,rng,config,Math.min(config.candidateCount,alternatives.length));
  const nextDraft=clone(draft);
  nextDraft.offerHistory=[...(nextDraft.offerHistory??[]),{offerRevision:nextDraft.offerRevision,offered:clone(nextDraft.offered),drawState:clone(nextDraft.drawState)}];
  nextDraft.offerRevision+=1;
  nextDraft.rerollCount+=1;
  nextDraft.offered=offered;
  nextDraft.offeredIds=offered.map(item=>item.traitId);
  nextDraft.drawState={algorithm:'LCG32-v1',seed:draft.drawState.seed,before,after:rng.state(),consumed:offered.length*2};
  nextDraft.resolutionReason='REROLLED_WITH_APTITUDE';
  nextState.aptitudePoints-=config.rerollAptitudeCost;
  return {draft:nextDraft,nextState};
}

export function serializeGrowthDraft(draft){
  if(!draft||draft.schemaVersion!=='growth-draft-v1')fail('DRAFT_SCHEMA_INVALID');
  return JSON.stringify(draft);
}

export function loadGrowthDraft(serialized,{expectedPoolVersion}={}){
  let draft;
  try{draft=typeof serialized==='string'?JSON.parse(serialized):clone(serialized);}catch{fail('DRAFT_JSON_INVALID');}
  if(!draft||draft.schemaVersion!=='growth-draft-v1'||!isId(draft.draftId)||!Array.isArray(draft.offeredIds)||!draft.drawState)fail('DRAFT_SCHEMA_INVALID');
  if(expectedPoolVersion&&draft.eligiblePoolVersion!==expectedPoolVersion)fail('DRAFT_POOL_VERSION_MISMATCH');
  return clone(draft);
}
