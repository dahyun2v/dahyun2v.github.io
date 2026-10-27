const FORMAT='sangoku-g07-command-coordination';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=1_000_000;
const SOURCE_KEYS=['armyId','factionId','commanderId','disposition','activePersonnel','routePending'];
const TARGET_KEYS=['armyId','factionId','visibility','targetingStatus'];
const ISSUE_KEYS=['requestId','tokenId','currentGlobalTick','validThroughTick','source','target'];
const PROPOSAL_KEYS=['proposalId','tokenId','currentGlobalTick','source','target','candidates'];
const CANDIDATE_KEYS=['actionInstanceId','actorArmyId','actorFactionId','targetArmyId','actionId','executionTick','executionStatus','actorDisposition','actorActivePersonnel','actorRoutePending','targetingStatus'];
const CONSUME_KEYS=['transactionId','currentGlobalTick','proposalId','action'];
const EXECUTED_ACTION_KEYS=['actionInstanceId','actorArmyId','actorFactionId','targetArmyId','actionId','executionTick','executionStatus'];

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=240&&/^[A-Za-z0-9._,:-]+$/.test(value);
const own=(value,key)=>Object.hasOwn(value,key);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function exactKeys(value,keys,message){invariant(object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort()),message);}
function unique(values){return new Set(values).size===values.length;}

function normalizeSource(source){
  exactKeys(source,SOURCE_KEYS,'G07_COORDINATION_SOURCE_SHAPE');
  invariant(id(source.armyId)&&source.factionId==='F01'&&source.commanderId==='G07','G07_COORDINATION_SOURCE_IDENTITY');
  invariant(source.disposition==='ACTIVE'&&integer(source.activePersonnel)&&source.activePersonnel>0&&source.routePending===false,'G07_COORDINATION_SOURCE_NOT_ACTIONABLE');
  return clone(source);
}

function normalizeTarget(target){
  exactKeys(target,TARGET_KEYS,'G07_COORDINATION_TARGET_SHAPE');
  invariant(id(target.armyId)&&id(target.factionId)&&target.visibility==='OBSERVED'&&target.targetingStatus==='LEGAL','G07_COORDINATION_TARGET_NOT_PUBLIC_LEGAL');
  return clone(target);
}

function requireOpponents(source,target){
  invariant(source.armyId!==target.armyId&&source.factionId!==target.factionId,'G07_COORDINATION_TARGET_NOT_ENEMY');
}

function normalizeIssue(input){
  exactKeys(input,ISSUE_KEYS,'G07_COORDINATION_ISSUE_SHAPE');
  const source=normalizeSource(input.source),target=normalizeTarget(input.target);
  invariant(id(input.requestId)&&id(input.tokenId)&&integer(input.currentGlobalTick)&&integer(input.validThroughTick)&&input.validThroughTick>=input.currentGlobalTick,'G07_COORDINATION_ISSUE_INVALID');
  requireOpponents(source,target);
  return {...clone(input),source,target};
}

function issueManifest(input){return {format:FORMAT,version:VERSION,kind:'ISSUE',...clone(input)};}

function normalizeCandidate(candidate,index){
  exactKeys(candidate,CANDIDATE_KEYS,`G07_COORDINATION_CANDIDATE_SHAPE:${index}`);
  invariant(id(candidate.actionInstanceId)&&id(candidate.actorArmyId)&&id(candidate.actorFactionId)&&id(candidate.targetArmyId)&&id(candidate.actionId)&&integer(candidate.executionTick),'G07_COORDINATION_CANDIDATE_IDENTITY');
  invariant(['VALIDATED','EXECUTED'].includes(candidate.executionStatus)&&['ACTIVE','DEFEATED','DISBANDED'].includes(candidate.actorDisposition)&&integer(candidate.actorActivePersonnel)&&typeof candidate.actorRoutePending==='boolean'&&['LEGAL','ILLEGAL'].includes(candidate.targetingStatus),'G07_COORDINATION_CANDIDATE_STATE');
  return clone(candidate);
}

function candidateEligible(candidate,token,currentGlobalTick){
  return candidate.actionId==='BASIC_ATTACK'
    && candidate.executionStatus==='VALIDATED'
    && candidate.executionTick===currentGlobalTick
    && candidate.actorArmyId!==token.sourceArmyId
    && candidate.actorArmyId!==token.targetArmyId
    && candidate.actorFactionId===token.sourceFactionId
    && candidate.actorFactionId!==token.targetFactionId
    && candidate.targetArmyId===token.targetArmyId
    && candidate.actorDisposition==='ACTIVE'
    && candidate.actorActivePersonnel>0
    && candidate.actorRoutePending===false
    && candidate.targetingStatus==='LEGAL';
}

function normalizeProposalInput(input){
  exactKeys(input,PROPOSAL_KEYS,'G07_COORDINATION_PROPOSAL_SHAPE');
  const source=normalizeSource(input.source),target=normalizeTarget(input.target);
  invariant(id(input.proposalId)&&id(input.tokenId)&&integer(input.currentGlobalTick)&&Array.isArray(input.candidates)&&input.candidates.length>0,'G07_COORDINATION_PROPOSAL_INVALID');
  requireOpponents(source,target);
  const candidates=input.candidates.map(normalizeCandidate);
  invariant(unique(candidates.map(candidate=>candidate.actionInstanceId)),'G07_COORDINATION_DUPLICATE_ACTION');
  return {...clone(input),source,target,candidates};
}

function proposalFingerprint(input,executionOrder){return stable({tokenId:input.tokenId,currentGlobalTick:input.currentGlobalTick,source:input.source,target:input.target,executionOrder});}

function normalizeExecutedAction(action){
  exactKeys(action,EXECUTED_ACTION_KEYS,'G07_COORDINATION_EXECUTED_ACTION_SHAPE');
  invariant(id(action.actionInstanceId)&&id(action.actorArmyId)&&id(action.actorFactionId)&&id(action.targetArmyId)&&action.actionId==='BASIC_ATTACK'&&integer(action.executionTick)&&action.executionStatus==='EXECUTED','G07_COORDINATION_EXECUTED_ACTION_INVALID');
  return clone(action);
}

function normalizeConsume(input){
  exactKeys(input,CONSUME_KEYS,'G07_COORDINATION_CONSUME_SHAPE');
  invariant(id(input.transactionId)&&id(input.proposalId)&&integer(input.currentGlobalTick),'G07_COORDINATION_CONSUME_INVALID');
  return {...clone(input),action:normalizeExecutedAction(input.action)};
}

function transactionManifest(input){return {format:FORMAT,version:VERSION,kind:'CONSUME',...clone(input)};}

export function createG07CommandCoordinationState({battleId,startGlobalTick=0}={}){
  invariant(id(battleId)&&integer(startGlobalTick),'G07_COORDINATION_STATE_INPUT_INVALID');
  return validateG07CommandCoordinationState({
    format:FORMAT,version:VERSION,battleId,currentGlobalTick:startGlobalTick,
    tokenOrder:[],tokensById:{},proposalOrder:[],proposalsById:{},transactionOrder:[],transactionsById:{},
  });
}

export function issueG07CommandCoordination(state,input){
  validateG07CommandCoordinationState(state);
  const normalized=normalizeIssue(input);
  const existing=state.tokensById[normalized.tokenId];
  if(existing){
    invariant(existing.issueRequestId===normalized.requestId&&stable(existing.issueManifest)===stable(issueManifest(normalized)),`G07_COORDINATION_TOKEN_CONFLICT:${normalized.tokenId}`);
    return clone(state);
  }
  invariant(normalized.currentGlobalTick>=state.currentGlobalTick,'G07_COORDINATION_TICK_REGRESSION');
  const requestCollision=state.tokenOrder.map(tokenId=>state.tokensById[tokenId]).find(token=>token.issueRequestId===normalized.requestId);
  invariant(!requestCollision,`G07_COORDINATION_REQUEST_CONFLICT:${normalized.requestId}`);
  const duplicate=state.tokenOrder.map(tokenId=>state.tokensById[tokenId]).find(token=>token.status!=='CONSUMED'&&token.validThroughTick>=normalized.currentGlobalTick&&token.sourceArmyId===normalized.source.armyId&&token.targetArmyId===normalized.target.armyId);
  invariant(!duplicate,`G07_COORDINATION_DUPLICATE_ACTIVE:${duplicate?.tokenId??normalized.tokenId}`);
  const next=clone(state);
  next.currentGlobalTick=normalized.currentGlobalTick;
  next.tokensById[normalized.tokenId]={
    tokenId:normalized.tokenId,issueRequestId:normalized.requestId,sourceArmyId:normalized.source.armyId,sourceFactionId:normalized.source.factionId,
    targetArmyId:normalized.target.armyId,targetFactionId:normalized.target.factionId,issuedAtTick:normalized.currentGlobalTick,validThroughTick:normalized.validThroughTick,
    status:'PENDING',proposalId:null,consumedAtTick:null,consumedByActionInstanceId:null,consumptionTransactionId:null,issueManifest:issueManifest(normalized),
  };
  next.tokenOrder=Object.keys(next.tokensById).sort();
  return validateG07CommandCoordinationState(next);
}

export function proposeG07CoordinatedBasicAttack(state,input){
  validateG07CommandCoordinationState(state);
  const normalized=normalizeProposalInput(input),token=state.tokensById[normalized.tokenId];
  invariant(token,'G07_COORDINATION_TOKEN_NOT_FOUND');
  invariant(stable(normalized.source)===stable(token.issueManifest.source)&&stable(normalized.target)===stable(token.issueManifest.target),'G07_COORDINATION_PUBLIC_CONTEXT_CHANGED');
  const executionOrder=normalized.candidates.filter(candidate=>candidateEligible(candidate,token,normalized.currentGlobalTick)).map(candidate=>({executionTick:candidate.executionTick,actionInstanceId:candidate.actionInstanceId,actorArmyId:candidate.actorArmyId,actorFactionId:candidate.actorFactionId,targetArmyId:candidate.targetArmyId})).sort((a,b)=>a.executionTick-b.executionTick||a.actionInstanceId.localeCompare(b.actionInstanceId)||a.actorArmyId.localeCompare(b.actorArmyId));
  invariant(executionOrder.length>0,'G07_COORDINATION_NO_ELIGIBLE_BASIC_ATTACK');
  const fingerprint=proposalFingerprint(normalized,executionOrder),existing=state.proposalsById[normalized.proposalId];
  if(existing){invariant(existing.fingerprint===fingerprint,`G07_COORDINATION_PROPOSAL_CONFLICT:${normalized.proposalId}`);return {state:clone(state),proposal:clone(existing)};}
  invariant(normalized.currentGlobalTick>=state.currentGlobalTick&&normalized.currentGlobalTick>=token.issuedAtTick,'G07_COORDINATION_TICK_REGRESSION');
  invariant(normalized.currentGlobalTick<=token.validThroughTick,'G07_COORDINATION_TOKEN_EXPIRED');
  invariant(token.status!=='CONSUMED','G07_COORDINATION_TOKEN_ALREADY_CONSUMED');
  invariant(token.status==='PENDING'&&token.proposalId===null,'G07_COORDINATION_TOKEN_ALREADY_PROPOSED');
  const next=clone(state),proposal={
    proposalId:normalized.proposalId,tokenId:token.tokenId,createdAtTick:normalized.currentGlobalTick,targetArmyId:token.targetArmyId,
    executionOrder,selectedActionInstanceId:executionOrder[0].actionInstanceId,
    effectContract:{kind:'COORDINATED_NEXT_BASIC_ATTACK',damageModifier:null,hitModifier:null,calculatorPolicy:'USE_EXISTING_BASIC_ATTACK'},fingerprint,
  };
  next.currentGlobalTick=normalized.currentGlobalTick;next.proposalsById[proposal.proposalId]=proposal;next.proposalOrder=Object.keys(next.proposalsById).sort();
  next.tokensById[token.tokenId].status='PROPOSED';next.tokensById[token.tokenId].proposalId=proposal.proposalId;
  validateG07CommandCoordinationState(next);
  return {state:next,proposal:clone(proposal)};
}

export function consumeG07CommandCoordination(state,input){
  validateG07CommandCoordinationState(state);
  const normalized=normalizeConsume(input),manifest=transactionManifest(normalized),existingTransaction=state.transactionsById[normalized.transactionId];
  if(existingTransaction){invariant(stable(existingTransaction.manifest)===stable(manifest),`G07_COORDINATION_TRANSACTION_CONFLICT:${normalized.transactionId}`);return clone(state);}
  invariant(normalized.currentGlobalTick>=state.currentGlobalTick,'G07_COORDINATION_TICK_REGRESSION');
  const proposal=state.proposalsById[normalized.proposalId];invariant(proposal,'G07_COORDINATION_PROPOSAL_NOT_FOUND');
  const token=state.tokensById[proposal.tokenId];invariant(token.status==='PROPOSED'&&token.proposalId===proposal.proposalId,'G07_COORDINATION_TOKEN_NOT_PROPOSED');
  invariant(normalized.currentGlobalTick===proposal.createdAtTick&&normalized.currentGlobalTick<=token.validThroughTick,'G07_COORDINATION_STALE_EXECUTION');
  const selected=proposal.executionOrder[0],action=normalized.action;
  invariant(action.actionInstanceId===proposal.selectedActionInstanceId&&action.actionInstanceId===selected.actionInstanceId&&action.actorArmyId===selected.actorArmyId&&action.actorFactionId===token.sourceFactionId&&action.targetArmyId===token.targetArmyId&&action.executionTick===selected.executionTick,'G07_COORDINATION_EXECUTION_MISMATCH');
  const next=clone(state);next.currentGlobalTick=normalized.currentGlobalTick;
  next.tokensById[token.tokenId].status='CONSUMED';next.tokensById[token.tokenId].consumedAtTick=normalized.currentGlobalTick;next.tokensById[token.tokenId].consumedByActionInstanceId=action.actionInstanceId;next.tokensById[token.tokenId].consumptionTransactionId=normalized.transactionId;
  next.transactionsById[normalized.transactionId]={transactionId:normalized.transactionId,tokenId:token.tokenId,proposalId:proposal.proposalId,actionInstanceId:action.actionInstanceId,consumedAtTick:normalized.currentGlobalTick,manifest};
  next.transactionOrder=Object.keys(next.transactionsById).sort();
  return validateG07CommandCoordinationState(next);
}

export function validateG07CommandCoordinationState(state){
  exactKeys(state,['format','version','battleId','currentGlobalTick','tokenOrder','tokensById','proposalOrder','proposalsById','transactionOrder','transactionsById'],'INVALID_G07_COORDINATION_STATE_SHAPE');
  invariant(state.format===FORMAT&&state.version===VERSION&&id(state.battleId)&&integer(state.currentGlobalTick),'INVALID_G07_COORDINATION_STATE');
  for(const [order,map,label] of [[state.tokenOrder,state.tokensById,'TOKEN'],[state.proposalOrder,state.proposalsById,'PROPOSAL'],[state.transactionOrder,state.transactionsById,'TRANSACTION']])invariant(Array.isArray(order)&&unique(order)&&stable(order)===stable(Object.keys(map).sort()),`G07_COORDINATION_${label}_ORDER_MISMATCH`);
  for(const tokenId of state.tokenOrder){
    const token=state.tokensById[tokenId];
    exactKeys(token,['tokenId','issueRequestId','sourceArmyId','sourceFactionId','targetArmyId','targetFactionId','issuedAtTick','validThroughTick','status','proposalId','consumedAtTick','consumedByActionInstanceId','consumptionTransactionId','issueManifest'],'G07_COORDINATION_TOKEN_SHAPE');
    invariant(token.tokenId===tokenId&&id(token.issueRequestId)&&id(token.sourceArmyId)&&id(token.sourceFactionId)&&id(token.targetArmyId)&&id(token.targetFactionId)&&integer(token.issuedAtTick)&&integer(token.validThroughTick)&&token.issuedAtTick<=token.validThroughTick&&token.issuedAtTick<=state.currentGlobalTick&&['PENDING','PROPOSED','CONSUMED'].includes(token.status),'G07_COORDINATION_TOKEN_INVALID');
    const {format,version,kind,...issueInput}=token.issueManifest;
    const normalizedIssue=normalizeIssue(issueInput);
    invariant(format===FORMAT&&version===VERSION&&kind==='ISSUE','G07_COORDINATION_ISSUE_MANIFEST_INVALID');
    invariant(token.issueRequestId===normalizedIssue.requestId&&token.tokenId===normalizedIssue.tokenId&&token.sourceArmyId===normalizedIssue.source.armyId&&token.sourceFactionId===normalizedIssue.source.factionId&&token.targetArmyId===normalizedIssue.target.armyId&&token.targetFactionId===normalizedIssue.target.factionId&&token.issuedAtTick===normalizedIssue.currentGlobalTick&&token.validThroughTick===normalizedIssue.validThroughTick,'G07_COORDINATION_TOKEN_MANIFEST_MISMATCH');
    if(token.status==='PENDING')invariant(token.proposalId===null&&token.consumedAtTick===null&&token.consumedByActionInstanceId===null&&token.consumptionTransactionId===null,'G07_COORDINATION_PENDING_TOKEN_INVALID');
    if(token.status==='PROPOSED')invariant(id(token.proposalId)&&state.proposalsById[token.proposalId]?.tokenId===tokenId&&token.consumedAtTick===null&&token.consumedByActionInstanceId===null&&token.consumptionTransactionId===null,'G07_COORDINATION_PROPOSED_TOKEN_INVALID');
    if(token.status==='CONSUMED')invariant(id(token.proposalId)&&integer(token.consumedAtTick)&&id(token.consumedByActionInstanceId)&&id(token.consumptionTransactionId)&&state.transactionsById[token.consumptionTransactionId]?.tokenId===tokenId,'G07_COORDINATION_CONSUMED_TOKEN_INVALID');
  }
  for(const proposalId of state.proposalOrder){
    const proposal=state.proposalsById[proposalId],token=state.tokensById[proposal.tokenId];
    exactKeys(proposal,['proposalId','tokenId','createdAtTick','targetArmyId','executionOrder','selectedActionInstanceId','effectContract','fingerprint'],'G07_COORDINATION_STORED_PROPOSAL_SHAPE');
    invariant(proposal.proposalId===proposalId&&token&&['PROPOSED','CONSUMED'].includes(token.status)&&token.proposalId===proposalId&&integer(proposal.createdAtTick)&&proposal.createdAtTick>=token.issuedAtTick&&proposal.createdAtTick<=token.validThroughTick&&proposal.createdAtTick<=state.currentGlobalTick&&proposal.targetArmyId===token.targetArmyId&&Array.isArray(proposal.executionOrder)&&proposal.executionOrder.length>0&&proposal.selectedActionInstanceId===proposal.executionOrder[0].actionInstanceId,'G07_COORDINATION_STORED_PROPOSAL_INVALID');
    for(const item of proposal.executionOrder){
      exactKeys(item,['executionTick','actionInstanceId','actorArmyId','actorFactionId','targetArmyId'],'G07_COORDINATION_EXECUTION_ITEM_SHAPE');
      invariant(integer(item.executionTick)&&item.executionTick===proposal.createdAtTick&&id(item.actionInstanceId)&&id(item.actorArmyId)&&item.actorArmyId!==token.sourceArmyId&&item.actorArmyId!==token.targetArmyId&&item.actorFactionId===token.sourceFactionId&&item.actorFactionId!==token.targetFactionId&&item.targetArmyId===token.targetArmyId,'G07_COORDINATION_EXECUTION_ITEM_INVALID');
    }
    invariant(stable(proposal.executionOrder)===stable([...proposal.executionOrder].sort((a,b)=>a.executionTick-b.executionTick||a.actionInstanceId.localeCompare(b.actionInstanceId)||a.actorArmyId.localeCompare(b.actorArmyId)))&&unique(proposal.executionOrder.map(item=>item.actionInstanceId)),'G07_COORDINATION_EXECUTION_ORDER_INVALID');
    invariant(stable(proposal.effectContract)===stable({kind:'COORDINATED_NEXT_BASIC_ATTACK',damageModifier:null,hitModifier:null,calculatorPolicy:'USE_EXISTING_BASIC_ATTACK'}),'G07_COORDINATION_EFFECT_CONTRACT_INVALID');
    invariant(proposal.fingerprint===proposalFingerprint({tokenId:token.tokenId,currentGlobalTick:proposal.createdAtTick,source:token.issueManifest.source,target:token.issueManifest.target},proposal.executionOrder),'G07_COORDINATION_PROPOSAL_FINGERPRINT_INVALID');
  }
  for(const transactionId of state.transactionOrder){
    const transaction=state.transactionsById[transactionId];
    exactKeys(transaction,['transactionId','tokenId','proposalId','actionInstanceId','consumedAtTick','manifest'],'G07_COORDINATION_TRANSACTION_SHAPE');
    const token=state.tokensById[transaction.tokenId],proposal=state.proposalsById[transaction.proposalId];
    invariant(transaction.transactionId===transactionId&&token?.status==='CONSUMED'&&token.consumptionTransactionId===transactionId&&token.proposalId===transaction.proposalId&&proposal?.selectedActionInstanceId===transaction.actionInstanceId&&integer(transaction.consumedAtTick)&&transaction.consumedAtTick===token.consumedAtTick&&transaction.consumedAtTick<=state.currentGlobalTick,'G07_COORDINATION_TRANSACTION_INVALID');
    const {format,version,kind,...consumeInput}=transaction.manifest;
    const normalizedConsume=normalizeConsume(consumeInput);
    invariant(format===FORMAT&&version===VERSION&&kind==='CONSUME','G07_COORDINATION_TRANSACTION_MANIFEST_INVALID');
    const selected=proposal.executionOrder[0],action=normalizedConsume.action;
    invariant(transaction.transactionId===normalizedConsume.transactionId&&transaction.proposalId===normalizedConsume.proposalId&&transaction.actionInstanceId===action.actionInstanceId&&transaction.consumedAtTick===normalizedConsume.currentGlobalTick&&action.actionInstanceId===selected.actionInstanceId&&action.actorArmyId===selected.actorArmyId&&action.actorFactionId===token.sourceFactionId&&action.targetArmyId===token.targetArmyId&&action.executionTick===selected.executionTick,'G07_COORDINATION_TRANSACTION_MANIFEST_MISMATCH');
  }
  return state;
}

export function serializeG07CommandCoordination(state){validateG07CommandCoordinationState(state);return JSON.stringify(canonical(state));}
export function deserializeG07CommandCoordination(serialized){
  invariant(typeof serialized==='string'&&serialized.length>0&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_G07_COORDINATION_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_G07_COORDINATION_JSON');}
  validateG07CommandCoordinationState(state);return clone(state);
}

export const G07_COMMAND_COORDINATION_FORMAT=FORMAT;
export const G07_COMMAND_COORDINATION_VERSION=VERSION;
