const FORMAT='sangoku-recruitment';
const VERSION=1;
const DEFAULT_COST=50;
const NEGOTIATION_TURNS=1;
const MAX_SERIALIZED_LENGTH=2_000_000;
const STATUSES=new Set(['NEGOTIATING','CLOSED_PRE_AGREEMENT','JOINING','PAUSED_CAPTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING','ACTIVE','DEAD','FAILED_POST_AGREEMENT']);
const AGREED_STATUSES=new Set(['JOINING','PAUSED_CAPTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING','ACTIVE','DEAD']);
const POST_AGREEMENT_STATUSES=new Set([...AGREED_STATUSES,'FAILED_POST_AGREEMENT']);

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function validateProposal(proposal,id){
  invariant(object(proposal)&&proposal.proposalId===id,`INVALID_RECRUITMENT_PROPOSAL:${id}`);
  invariant(typeof proposal.factionId==='string'&&proposal.factionId,`INVALID_RECRUITMENT_FACTION:${id}`);
  invariant(typeof proposal.targetOfficerId==='string'&&proposal.targetOfficerId,`INVALID_RECRUITMENT_TARGET:${id}`);
  invariant(proposal.candidateSourceRef===null||(typeof proposal.candidateSourceRef==='string'&&proposal.candidateSourceRef),`INVALID_RECRUITMENT_CANDIDATE_SOURCE:${id}`);
  invariant(proposal.sourceFactionId===null||(typeof proposal.sourceFactionId==='string'&&proposal.sourceFactionId),`INVALID_RECRUITMENT_SOURCE_FACTION:${id}`);
  invariant(proposal.agentOfficerId===null||(typeof proposal.agentOfficerId==='string'&&proposal.agentOfficerId),`INVALID_RECRUITMENT_AGENT:${id}`);
  invariant(integer(proposal.agentCharisma)&&integer(proposal.agentRecruitment),`INVALID_RECRUITMENT_AGENT_SCORE:${id}`);
  if(proposal.agentOfficerId===null)invariant(proposal.agentCharisma===0&&proposal.agentRecruitment===0,`BASIC_PROPOSAL_CANNOT_HAVE_AGENT_SCORE:${id}`);
  invariant(integer(proposal.tieBreakPriority)&&integer(proposal.cost,1)&&integer(proposal.createdTurn,1),`INVALID_RECRUITMENT_PROPOSAL_NUMBER:${id}`);
  invariant(STATUSES.has(proposal.status),`INVALID_RECRUITMENT_STATUS:${id}:${proposal.status}`);
  invariant(proposal.closedReason===null||typeof proposal.closedReason==='string',`INVALID_RECRUITMENT_CLOSED_REASON:${id}`);
  invariant(proposal.agreementTurn===null||integer(proposal.agreementTurn,1),`INVALID_RECRUITMENT_AGREEMENT_TURN:${id}`);
  invariant(proposal.arrivalPlan===null||(object(proposal.arrivalPlan)&&typeof proposal.arrivalPlan.destinationRef==='string'&&proposal.arrivalPlan.destinationRef&&typeof proposal.arrivalPlan.routeId==='string'&&proposal.arrivalPlan.routeId&&integer(proposal.arrivalPlan.expectedArrivalTurn,1)),`INVALID_RECRUITMENT_ARRIVAL_PLAN:${id}`);
  invariant(proposal.captorFactionId===null||typeof proposal.captorFactionId==='string',`INVALID_RECRUITMENT_CAPTOR:${id}`);
  invariant(proposal.arrivalTurn===null||integer(proposal.arrivalTurn,1),`INVALID_RECRUITMENT_ARRIVAL_TURN:${id}`);
  invariant(proposal.activationTurn===null||integer(proposal.activationTurn,1),`INVALID_RECRUITMENT_ACTIVATION_TURN:${id}`);
  invariant(proposal.rosterDeltaId===null||typeof proposal.rosterDeltaId==='string',`INVALID_RECRUITMENT_ROSTER_DELTA_REF:${id}`);
  if(proposal.status==='NEGOTIATING')invariant(proposal.agreementTurn===null&&proposal.arrivalPlan===null,`NEGOTIATING_PROPOSAL_HAS_AGREEMENT:${id}`);
  if(POST_AGREEMENT_STATUSES.has(proposal.status))invariant(proposal.agreementTurn!==null&&proposal.arrivalPlan!==null,`AGREED_PROPOSAL_MISSING_PLAN:${id}`);
  if(proposal.status==='PAUSED_CAPTIVE')invariant(proposal.captorFactionId!==null,`CAPTIVE_PROPOSAL_MISSING_CAPTOR:${id}`);
  if(proposal.status==='FAILED_POST_AGREEMENT')invariant(typeof proposal.closedReason==='string'&&proposal.closedReason,`FAILED_RECRUITMENT_MISSING_REASON:${id}`);
  if(proposal.status==='ARRIVED_PENDING_ACTIVATION')invariant(proposal.arrivalTurn!==null&&proposal.activationTurn===proposal.arrivalTurn+1,`INVALID_PENDING_ACTIVATION:${id}`);
  if(proposal.status==='ACTIVE')invariant(typeof proposal.rosterDeltaId==='string'&&proposal.rosterDeltaId,`ACTIVE_RECRUITMENT_MISSING_ROSTER_DELTA:${id}`);
}

function validateRosterTransfer(transfer,id,state){
  invariant(object(transfer)&&transfer.deltaId===id&&typeof transfer.proposalId==='string'&&typeof transfer.targetOfficerId==='string',`INVALID_RECRUITMENT_ROSTER_TRANSFER:${id}`);
  invariant(state.proposals[transfer.proposalId]?.targetOfficerId===transfer.targetOfficerId,`BROKEN_RECRUITMENT_ROSTER_TRANSFER:${id}`);
  invariant(['EXISTING_OFFICER_TRANSFER','ADD_CANONICAL_OFFICER'].includes(transfer.mode),`INVALID_RECRUITMENT_ROSTER_TRANSFER_MODE:${id}`);
  invariant(['PENDING','APPLIED'].includes(transfer.status),`INVALID_RECRUITMENT_ROSTER_TRANSFER_STATUS:${id}`);
  invariant(typeof transfer.fingerprint==='string'&&transfer.fingerprint&&object(transfer.delta),`INVALID_RECRUITMENT_ROSTER_TRANSFER_BODY:${id}`);
  invariant(transfer.appliedEventId===null||typeof transfer.appliedEventId==='string',`INVALID_RECRUITMENT_ROSTER_TRANSFER_ACK:${id}`);
  if(transfer.status==='APPLIED')invariant(typeof transfer.appliedEventId==='string'&&transfer.appliedEventId,`APPLIED_RECRUITMENT_ROSTER_TRANSFER_MISSING_ACK:${id}`);
}

export function validateRecruitmentState(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION,'INVALID_RECRUITMENT_STATE_FORMAT');
  invariant(object(state.settings)&&state.settings.resourceKey==='prestige'&&state.settings.displayName==='인망'&&state.settings.defaultCost===DEFAULT_COST&&state.settings.negotiationTurns===NEGOTIATION_TURNS,'INVALID_RECRUITMENT_SETTINGS');
  invariant(object(state.factions)&&object(state.proposals)&&object(state.rosterTransfers)&&object(state.processedEvents),'INVALID_RECRUITMENT_COLLECTIONS');
  const reservedByFaction=Object.fromEntries(Object.keys(state.factions).map(id=>[id,0]));
  for(const[factionId,wallet]of Object.entries(state.factions)){
    invariant(object(wallet)&&wallet.factionId===factionId&&amount(wallet.prestige)&&amount(wallet.reservedPrestige)&&wallet.reservedPrestige<=wallet.prestige,`INVALID_RECRUITMENT_PRESTIGE:${factionId}`);
  }
  const activeByFactionTarget=new Set(),priorityByTarget=new Set(),committedTargets=new Set();
  for(const[id,proposal]of Object.entries(state.proposals)){
    validateProposal(proposal,id);
    invariant(Object.hasOwn(state.factions,proposal.factionId),`UNKNOWN_RECRUITMENT_FACTION:${proposal.factionId}`);
    if(proposal.status==='NEGOTIATING'){
      reservedByFaction[proposal.factionId]+=proposal.cost;
      const pair=`${proposal.factionId}\u0000${proposal.targetOfficerId}`;
      invariant(!activeByFactionTarget.has(pair),`DUPLICATE_ACTIVE_RECRUITMENT_TARGET:${proposal.factionId}:${proposal.targetOfficerId}`);activeByFactionTarget.add(pair);
      const priority=`${proposal.targetOfficerId}\u0000${proposal.tieBreakPriority}`;
      invariant(!priorityByTarget.has(priority),`DUPLICATE_RECRUITMENT_TIE_PRIORITY:${proposal.targetOfficerId}:${proposal.tieBreakPriority}`);priorityByTarget.add(priority);
    }
    if(AGREED_STATUSES.has(proposal.status)){
      invariant(!committedTargets.has(proposal.targetOfficerId),`MULTIPLE_RECRUITMENT_AGREEMENTS:${proposal.targetOfficerId}`);committedTargets.add(proposal.targetOfficerId);
    }
  }
  for(const[id,transfer]of Object.entries(state.rosterTransfers))validateRosterTransfer(transfer,id,state);
  for(const[factionId,total]of Object.entries(reservedByFaction))invariant(total===state.factions[factionId].reservedPrestige,`RECRUITMENT_RESERVATION_MISMATCH:${factionId}`);
  for(const[eventId,fingerprint]of Object.entries(state.processedEvents))invariant(eventId&&typeof fingerprint==='string'&&fingerprint,`INVALID_RECRUITMENT_EVENT:${eventId}`);
  return state;
}

export function createRecruitmentState({factions}={}){
  invariant(object(factions)&&Object.keys(factions).length>0,'RECRUITMENT_FACTIONS_REQUIRED');
  const wallets={};
  for(const[factionId,value]of Object.entries(factions)){
    const prestige=object(value)?value.prestige:value;
    invariant(amount(prestige),`INVALID_RECRUITMENT_PRESTIGE:${factionId}`);
    wallets[factionId]={factionId,prestige,reservedPrestige:0};
  }
  return validateRecruitmentState({format:FORMAT,version:VERSION,settings:{resourceKey:'prestige',displayName:'인망',defaultCost:DEFAULT_COST,negotiationTurns:NEGOTIATION_TURNS},factions:wallets,proposals:{},rosterTransfers:{},processedEvents:{}});
}

function eventReplay(state,eventId,payload){
  invariant(typeof eventId==='string'&&eventId,'RECRUITMENT_EVENT_ID_REQUIRED');
  const fingerprint=stable(payload),existing=state.processedEvents[eventId];
  if(existing!==undefined){
    invariant(existing===fingerprint,`CONFLICTING_RECRUITMENT_EVENT:${eventId}`);
    return {replayed:true,fingerprint};
  }
  return {replayed:false,fingerprint};
}
function recordEvent(next,eventId,fingerprint){next.processedEvents[eventId]=fingerprint;return validateRecruitmentState(next);}

export function reserveRecruitmentProposal(state,input={}){
  validateRecruitmentState(state);
  const {proposalId,factionId,targetOfficerId,candidateSourceRef=null,sourceFactionId=null,agentOfficerId=null,agentCharisma=0,agentRecruitment=0,tieBreakPriority,cost=DEFAULT_COST,createdTurn}=input;
  invariant(typeof proposalId==='string'&&proposalId,'RECRUITMENT_PROPOSAL_ID_REQUIRED');
  const canonical={proposalId,factionId,targetOfficerId,candidateSourceRef,sourceFactionId,agentOfficerId,agentCharisma,agentRecruitment,tieBreakPriority,cost,createdTurn};
  if(Object.hasOwn(state.proposals,proposalId)){
    const existing=state.proposals[proposalId];
    const existingCanonical=Object.fromEntries(Object.keys(canonical).map(key=>[key,existing[key]]));
    invariant(stable(existingCanonical)===stable(canonical),`CONFLICTING_RECRUITMENT_PROPOSAL:${proposalId}`);
    return clone(state);
  }
  invariant(Object.hasOwn(state.factions,factionId),`UNKNOWN_RECRUITMENT_FACTION:${factionId}`);
  invariant(typeof targetOfficerId==='string'&&targetOfficerId,'RECRUITMENT_TARGET_REQUIRED');
  invariant(agentOfficerId===null||(typeof agentOfficerId==='string'&&agentOfficerId),'INVALID_RECRUITMENT_AGENT');
  invariant(integer(agentCharisma)&&integer(agentRecruitment)&&integer(tieBreakPriority)&&integer(cost,1)&&integer(createdTurn,1),'INVALID_RECRUITMENT_PROPOSAL_INPUT');
  if(agentOfficerId===null)invariant(agentCharisma===0&&agentRecruitment===0,'BASIC_PROPOSAL_CANNOT_HAVE_AGENT_SCORE');
  invariant(!Object.values(state.proposals).some(p=>p.factionId===factionId&&p.targetOfficerId===targetOfficerId&&p.status==='NEGOTIATING'),`DUPLICATE_ACTIVE_RECRUITMENT_TARGET:${factionId}:${targetOfficerId}`);
  invariant(!Object.values(state.proposals).some(p=>p.targetOfficerId===targetOfficerId&&p.tieBreakPriority===tieBreakPriority&&p.status==='NEGOTIATING'),`DUPLICATE_RECRUITMENT_TIE_PRIORITY:${targetOfficerId}:${tieBreakPriority}`);
  invariant(!Object.values(state.proposals).some(p=>p.targetOfficerId===targetOfficerId&&AGREED_STATUSES.has(p.status)),`RECRUITMENT_TARGET_ALREADY_COMMITTED:${targetOfficerId}`);
  const wallet=state.factions[factionId],available=wallet.prestige-wallet.reservedPrestige;
  invariant(available>=cost,`INSUFFICIENT_RECRUITMENT_PRESTIGE:${factionId}:required=${cost}:available=${available}`);
  const next=clone(state);next.factions[factionId].reservedPrestige+=cost;
  next.proposals[proposalId]={...canonical,status:'NEGOTIATING',closedReason:null,agreementTurn:null,arrivalPlan:null,captorFactionId:null,arrivalTurn:null,activationTurn:null,rosterDeltaId:null};
  return validateRecruitmentState(next);
}

function releaseReservation(next,proposal,reason){
  next.factions[proposal.factionId].reservedPrestige-=proposal.cost;
  proposal.status='CLOSED_PRE_AGREEMENT';proposal.closedReason=reason;
}

export function cancelRecruitmentProposal(state,{eventId,proposalId,reason='CANCELLED'}={}){
  validateRecruitmentState(state);const payload={type:'CANCEL',proposalId,reason};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.proposals[proposalId];invariant(proposal,`UNKNOWN_RECRUITMENT_PROPOSAL:${proposalId}`);
  invariant(proposal.status==='NEGOTIATING',`RECRUITMENT_CANCELLATION_AFTER_AGREEMENT:${proposalId}`);
  releaseReservation(next,proposal,reason);return recordEvent(next,eventId,replay.fingerprint);
}

function validArrivalPlan(plan){return object(plan)&&typeof plan.destinationRef==='string'&&plan.destinationRef&&typeof plan.routeId==='string'&&plan.routeId&&integer(plan.expectedArrivalTurn,1);}
function compareProposal(a,b){
  return Number(b.agentOfficerId!==null)-Number(a.agentOfficerId!==null)||b.agentCharisma-a.agentCharisma||b.agentRecruitment-a.agentRecruitment||a.tieBreakPriority-b.tieBreakPriority||a.proposalId.localeCompare(b.proposalId);
}

export function resolveRecruitmentAgreements(state,{eventId,currentTurn,eligibilityByProposalId={},arrivalPlansByProposalId={}}={}){
  validateRecruitmentState(state);invariant(integer(currentTurn,1),'INVALID_RECRUITMENT_RESOLUTION_TURN');
  const payload={type:'RESOLVE',currentTurn,eligibilityByProposalId,arrivalPlansByProposalId};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  invariant(object(eligibilityByProposalId)&&object(arrivalPlansByProposalId),'INVALID_RECRUITMENT_RESOLUTION_INPUT');
  const next=clone(state),matured=Object.values(next.proposals).filter(p=>p.status==='NEGOTIATING'&&currentTurn>=p.createdTurn+NEGOTIATION_TURNS);
  invariant(matured.length>0,'NO_MATURE_RECRUITMENT_PROPOSALS');
  for(const proposal of matured)invariant(object(eligibilityByProposalId[proposal.proposalId])&&typeof eligibilityByProposalId[proposal.proposalId].eligible==='boolean',`MISSING_RECRUITMENT_ELIGIBILITY:${proposal.proposalId}`);
  const targetIds=[...new Set(matured.map(p=>p.targetOfficerId))].sort();
  for(const targetOfficerId of targetIds){
    const group=matured.filter(p=>p.targetOfficerId===targetOfficerId);
    const alreadyCommitted=Object.values(next.proposals).some(p=>p.targetOfficerId===targetOfficerId&&AGREED_STATUSES.has(p.status));
    const eligible=[];
    for(const proposal of group){
      const result=eligibilityByProposalId[proposal.proposalId],plan=arrivalPlansByProposalId[proposal.proposalId];
      if(alreadyCommitted)releaseReservation(next,proposal,'TARGET_ALREADY_COMMITTED');
      else if(!result.eligible)releaseReservation(next,proposal,result.reason||'PRE_AGREEMENT_INELIGIBLE');
      else if(!validArrivalPlan(plan))releaseReservation(next,proposal,'NO_SAFE_ARRIVAL_PLAN');
      else eligible.push(proposal);
    }
    if(eligible.length===0)continue;
    eligible.sort(compareProposal);const winner=eligible[0];
    for(const loser of eligible.slice(1))releaseReservation(next,loser,'CONTEST_LOST');
    const wallet=next.factions[winner.factionId];
    invariant(wallet.reservedPrestige>=winner.cost&&wallet.prestige>=winner.cost,`RECRUITMENT_CHARGE_INVARIANT:${winner.proposalId}`);
    wallet.reservedPrestige-=winner.cost;wallet.prestige-=winner.cost;
    winner.status='JOINING';winner.agreementTurn=currentTurn;winner.arrivalPlan=clone(arrivalPlansByProposalId[winner.proposalId]);winner.closedReason=null;
  }
  return recordEvent(next,eventId,replay.fingerprint);
}

export function applyRecruitmentTravelEvent(state,{eventId,proposalId,type,currentTurn,captorFactionId=null,locationRef=null}={}){
  validateRecruitmentState(state);invariant(integer(currentTurn,1),'INVALID_RECRUITMENT_TRAVEL_TURN');
  const payload={type:'TRAVEL',proposalId,travelType:type,currentTurn,captorFactionId,locationRef};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.proposals[proposalId];invariant(proposal,`UNKNOWN_RECRUITMENT_PROPOSAL:${proposalId}`);
  if(type==='CAPTURED'){
    invariant(['JOINING','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING'].includes(proposal.status),`RECRUITMENT_CAPTURE_NOT_JOINING:${proposalId}`);invariant(typeof captorFactionId==='string'&&captorFactionId,'RECRUITMENT_CAPTOR_REQUIRED');
    proposal.status='PAUSED_CAPTIVE';proposal.captorFactionId=captorFactionId;
  }else if(type==='RELEASED'){
    invariant(proposal.status==='PAUSED_CAPTIVE',`RECRUITMENT_RELEASE_NOT_CAPTIVE:${proposalId}`);proposal.status='JOINING';proposal.captorFactionId=null;
  }else if(type==='ARRIVED'){
    invariant(proposal.status==='JOINING',`RECRUITMENT_ARRIVAL_NOT_JOINING:${proposalId}`);invariant(locationRef===proposal.arrivalPlan.destinationRef,`RECRUITMENT_ARRIVAL_DESTINATION_MISMATCH:${proposalId}`);
    proposal.status='ARRIVED_PENDING_ACTIVATION';proposal.arrivalTurn=currentTurn;proposal.activationTurn=currentTurn+1;
  }else if(type==='DIED'){
    invariant(['JOINING','PAUSED_CAPTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING','ACTIVE'].includes(proposal.status),`RECRUITMENT_DEATH_BEFORE_AGREEMENT:${proposalId}`);proposal.status='DEAD';proposal.captorFactionId=null;
  }else throw new Error(`UNSUPPORTED_RECRUITMENT_TRAVEL_EVENT:${type}`);
  return recordEvent(next,eventId,replay.fingerprint);
}

export function failRecruitmentAfterAgreement(state,{eventId,proposalId,reason}={}){
  validateRecruitmentState(state);invariant(typeof reason==='string'&&reason,'RECRUITMENT_POST_AGREEMENT_FAILURE_REASON_REQUIRED');
  const payload={type:'FAIL_POST_AGREEMENT',proposalId,reason};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.proposals[proposalId];invariant(proposal&&['JOINING','PAUSED_CAPTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING'].includes(proposal.status),`RECRUITMENT_POST_AGREEMENT_FAILURE_NOT_ALLOWED:${proposalId}`);
  proposal.status='FAILED_POST_AGREEMENT';proposal.closedReason=reason;proposal.captorFactionId=null;return recordEvent(next,eventId,replay.fingerprint);
}

export function openRecruitmentCommandPhase(state,{eventId,currentTurn}={}){
  validateRecruitmentState(state);invariant(integer(currentTurn,1),'INVALID_RECRUITMENT_COMMAND_TURN');
  const payload={type:'COMMAND_PHASE',currentTurn};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state);
  for(const proposal of Object.values(next.proposals))if(proposal.status==='ARRIVED_PENDING_ACTIVATION'&&proposal.activationTurn<=currentTurn)proposal.status='ROSTER_TRANSFER_PENDING';
  return recordEvent(next,eventId,replay.fingerprint);
}

export function registerRecruitmentRosterDelta(state,{eventId,proposalId,transfer}={}){
  validateRecruitmentState(state);const payload={type:'REGISTER_ROSTER_DELTA',proposalId,transfer};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.proposals[proposalId];invariant(proposal?.status==='ROSTER_TRANSFER_PENDING',`RECRUITMENT_ROSTER_TRANSFER_NOT_READY:${proposalId}`);
  invariant(object(transfer)&&typeof transfer.deltaId==='string'&&transfer.deltaId&&transfer.proposalId===proposalId&&transfer.targetOfficerId===proposal.targetOfficerId,`INVALID_RECRUITMENT_ROSTER_TRANSFER_INPUT:${proposalId}`);
  invariant(!Object.hasOwn(next.rosterTransfers,transfer.deltaId),`DUPLICATE_RECRUITMENT_ROSTER_DELTA:${transfer.deltaId}`);
  next.rosterTransfers[transfer.deltaId]={...clone(transfer),status:'PENDING',appliedEventId:null};proposal.rosterDeltaId=transfer.deltaId;return recordEvent(next,eventId,replay.fingerprint);
}

export function acknowledgeRecruitmentRosterTransfer(state,{eventId,proposalId,deltaId}={}){
  validateRecruitmentState(state);const payload={type:'ACK_ROSTER_DELTA',proposalId,deltaId};const replay=eventReplay(state,eventId,payload);if(replay.replayed)return clone(state);
  const next=clone(state),proposal=next.proposals[proposalId],transfer=next.rosterTransfers[deltaId];invariant(proposal?.status==='ROSTER_TRANSFER_PENDING'&&proposal.rosterDeltaId===deltaId,`RECRUITMENT_ROSTER_TRANSFER_NOT_PENDING:${proposalId}`);invariant(transfer?.status==='PENDING'&&transfer.proposalId===proposalId,`UNKNOWN_PENDING_RECRUITMENT_ROSTER_DELTA:${deltaId}`);
  transfer.status='APPLIED';transfer.appliedEventId=eventId;proposal.status='ACTIVE';return recordEvent(next,eventId,replay.fingerprint);
}

export function isRecruitmentSuccessorEligible(state,{targetOfficerId}={}){
  validateRecruitmentState(state);return Object.values(state.proposals).some(proposal=>proposal.targetOfficerId===targetOfficerId&&proposal.status==='ACTIVE');
}

export function serializeRecruitmentState(state){validateRecruitmentState(state);return JSON.stringify(state,null,2);}
export function deserializeRecruitmentState(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_RECRUITMENT_SERIALIZED_INPUT');
  let state;try{state=JSON.parse(serialized);}catch{throw new Error('INVALID_RECRUITMENT_JSON');}
  if(object(state)&&state.version===VERSION&&!object(state.rosterTransfers))state.rosterTransfers={};for(const proposal of Object.values(state.proposals??{})){if(proposal.candidateSourceRef===undefined)proposal.candidateSourceRef=null;if(proposal.sourceFactionId===undefined)proposal.sourceFactionId=null;if(proposal.rosterDeltaId===undefined)proposal.rosterDeltaId=null;if(proposal.status==='ACTIVE'&&proposal.rosterDeltaId===null)proposal.status='ROSTER_TRANSFER_PENDING';}
  validateRecruitmentState(state);return clone(state);
}

export const RECRUITMENT_FORMAT=FORMAT;
export const RECRUITMENT_VERSION=VERSION;
export const RECRUITMENT_DEFAULT_COST=DEFAULT_COST;
export const RECRUITMENT_NEGOTIATION_TURNS=NEGOTIATION_TURNS;
