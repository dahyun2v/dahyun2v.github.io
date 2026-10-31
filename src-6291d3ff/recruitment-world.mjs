import {validateState as validateFirst3State} from './first3.mjs';
import {
  acknowledgeRecruitmentRosterTransfer,
  applyRecruitmentTravelEvent,
  cancelRecruitmentProposal,
  createRecruitmentState,
  deserializeRecruitmentState,
  failRecruitmentAfterAgreement,
  openRecruitmentCommandPhase,
  registerRecruitmentRosterDelta,
  reserveRecruitmentProposal,
  resolveRecruitmentAgreements,
  serializeRecruitmentState,
  validateRecruitmentState,
} from './recruitment.mjs';

const FORMAT='sangoku-recruitment-world';
const VERSION=1;
const MAX_SERIALIZED_LENGTH=4_000_000;
const LIMITED_EXTERNAL_CANDIDATES=Object.freeze({G21:'docs/design-data/map-start-v1.json#P02:G21'});
const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function sameIds(left,right){return [...left].sort().join('|')===[...right].sort().join('|');}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;return JSON.stringify(value);}
function officerLocationRef(officer){return `${officer.locationRef.kind}:${officer.locationRef.id}`;}

function worldPrestige(world){return Object.fromEntries(Object.entries(world.factions).map(([factionId,faction])=>[factionId,{prestige:faction.prestige}]));}

export function validateRecruitmentWorldSnapshot(snapshot){
  invariant(object(snapshot)&&snapshot.format===FORMAT&&snapshot.version===VERSION,'INVALID_RECRUITMENT_WORLD_FORMAT');
  invariant(object(snapshot.world)&&object(snapshot.recruitment),'INVALID_RECRUITMENT_WORLD_CONTENT');
  validateFirst3State(snapshot.world);validateRecruitmentState(snapshot.recruitment);
  const worldIds=Object.keys(snapshot.world.factions),recruitmentIds=Object.keys(snapshot.recruitment.factions);
  invariant(sameIds(worldIds,recruitmentIds),'RECRUITMENT_WORLD_FACTION_SET_MISMATCH');
  for(const factionId of worldIds){
    const worldValue=snapshot.world.factions[factionId].prestige,recruitmentValue=snapshot.recruitment.factions[factionId].prestige;
    invariant(worldValue===recruitmentValue,`RECRUITMENT_WORLD_PRESTIGE_CONFLICT:${factionId}:world=${worldValue}:recruitment=${recruitmentValue}`);
  }
  return snapshot;
}

export function createRecruitmentWorldSnapshot({world,recruitmentState=null}={}){
  validateFirst3State(world);
  const recruitment=recruitmentState===null?createRecruitmentState({factions:worldPrestige(world)}):deserializeRecruitmentState(serializeRecruitmentState(recruitmentState));
  return validateRecruitmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(world),recruitment});
}

function proposalStatus(state,proposalId){return state.proposals[proposalId]?.status??null;}
function isAgreedStatus(status){return ['JOINING','PAUSED_CAPTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING','ACTIVE','DEAD','FAILED_POST_AGREEMENT'].includes(status);}

function commitTransition(snapshot,nextRecruitment,{kind}){
  validateRecruitmentWorldSnapshot(snapshot);validateRecruitmentState(nextRecruitment);
  const before=snapshot.recruitment,nextWorld=clone(snapshot.world);
  invariant(sameIds(Object.keys(before.factions),Object.keys(nextRecruitment.factions)),'RECRUITMENT_TRANSITION_FACTION_SET_CHANGED');
  const newlyAgreedByFaction=Object.fromEntries(Object.keys(before.factions).map(id=>[id,0]));
  for(const[proposalId,proposal]of Object.entries(nextRecruitment.proposals)){
    const beforeStatus=proposalStatus(before,proposalId);
    if(!isAgreedStatus(beforeStatus)&&isAgreedStatus(proposal.status))newlyAgreedByFaction[proposal.factionId]+=proposal.cost;
  }
  for(const factionId of Object.keys(before.factions)){
    const previous=before.factions[factionId].prestige,next=nextRecruitment.factions[factionId].prestige,delta=previous-next;
    invariant(delta>=0,`RECRUITMENT_PRESTIGE_INCREASE_NOT_ALLOWED:${factionId}`);
    if(kind==='AGREEMENT')invariant(delta===newlyAgreedByFaction[factionId],`RECRUITMENT_AGREEMENT_CHARGE_MISMATCH:${factionId}:delta=${delta}:expected=${newlyAgreedByFaction[factionId]}`);
    else invariant(delta===0,`RECRUITMENT_UNEXPECTED_PRESTIGE_CHANGE:${kind}:${factionId}:delta=${delta}`);
    nextWorld.factions[factionId].prestige=next;
  }
  return validateRecruitmentWorldSnapshot({format:FORMAT,version:VERSION,world:nextWorld,recruitment:clone(nextRecruitment)});
}

export function reserveRecruitmentWorldProposal(snapshot,input){
  validateRecruitmentWorldSnapshot(snapshot);
  invariant(input?.createdTurn===snapshot.world.turnNumber,`RECRUITMENT_WORLD_TURN_MISMATCH:proposal=${input?.createdTurn}:world=${snapshot.world.turnNumber}`);
  if(input.agentOfficerId!==null&&input.agentOfficerId!==undefined){const agent=snapshot.world.officers[input.agentOfficerId];invariant(agent,`RECRUITMENT_WORLD_AGENT_NOT_FOUND:${input.agentOfficerId}`);invariant(agent.allegianceFactionId===input.factionId&&agent.lifeState==='ALIVE'&&agent.conditionState==='NORMAL'&&agent.captivityState==='FREE'&&agent.travelState==='STATIONARY',`RECRUITMENT_WORLD_AGENT_UNAVAILABLE:${input.agentOfficerId}`);}
  const target=snapshot.world.officers[input.targetOfficerId];if(target){invariant(target.allegianceFactionId!==input.factionId,`RECRUITMENT_WORLD_TARGET_ALREADY_OWNED:${input.targetOfficerId}`);const sourceFaction=snapshot.world.factions[target.allegianceFactionId];invariant(sourceFaction&&!sourceFaction.alive,`RECRUITMENT_WORLD_TARGET_AFFILIATION_LOCKED:${input.targetOfficerId}:${target.allegianceFactionId}`);invariant(target.lifeState==='ALIVE',`RECRUITMENT_WORLD_TARGET_DEAD:${input.targetOfficerId}`);}else invariant(LIMITED_EXTERNAL_CANDIDATES[input.targetOfficerId]===input.candidateSourceRef,`RECRUITMENT_WORLD_UNKNOWN_EXTERNAL_CANDIDATE:${input.targetOfficerId}`);
  return commitTransition(snapshot,reserveRecruitmentProposal(snapshot.recruitment,{...input,sourceFactionId:target?.allegianceFactionId??null}),{kind:'RESERVATION'});
}

export function cancelRecruitmentWorldProposal(snapshot,input){
  validateRecruitmentWorldSnapshot(snapshot);
  return commitTransition(snapshot,cancelRecruitmentProposal(snapshot.recruitment,input),{kind:'CANCELLATION'});
}

export function resolveRecruitmentWorldAgreements(snapshot,input){
  validateRecruitmentWorldSnapshot(snapshot);
  invariant(input?.currentTurn===snapshot.world.turnNumber,`RECRUITMENT_WORLD_TURN_MISMATCH:resolution=${input?.currentTurn}:world=${snapshot.world.turnNumber}`);
  for(const[proposalId,plan]of Object.entries(input.arrivalPlansByProposalId??{})){const proposal=snapshot.recruitment.proposals[proposalId];if(!proposal||!object(plan)||typeof plan.destinationRef!=='string'||!plan.destinationRef.startsWith('CITY:'))continue;const city=snapshot.world.cities[plan.destinationRef.slice(5)];invariant(city?.ownerFactionId===proposal.factionId,`RECRUITMENT_WORLD_DESTINATION_NOT_OWNED:${proposalId}:${plan.destinationRef}`);}
  const effective=clone(input);effective.eligibilityByProposalId=clone(input.eligibilityByProposalId??{});
  for(const proposal of Object.values(snapshot.recruitment.proposals).filter(item=>item.status==='NEGOTIATING'&&input.currentTurn>=item.createdTurn+snapshot.recruitment.settings.negotiationTurns)){
    const current=effective.eligibilityByProposalId[proposal.proposalId];if(!object(current)||current.eligible!==true)continue;
    if(proposal.agentOfficerId!==null){const agent=snapshot.world.officers[proposal.agentOfficerId];if(!agent||agent.allegianceFactionId!==proposal.factionId||agent.lifeState!=='ALIVE'||agent.conditionState!=='NORMAL'||agent.captivityState!=='FREE'||agent.travelState!=='STATIONARY'){effective.eligibilityByProposalId[proposal.proposalId]={eligible:false,reason:'AGENT_UNAVAILABLE'};continue;}}
    const target=snapshot.world.officers[proposal.targetOfficerId];if(target&&(target.lifeState!=='ALIVE'||target.allegianceFactionId!==proposal.sourceFactionId||snapshot.world.factions[target.allegianceFactionId]?.alive)){effective.eligibilityByProposalId[proposal.proposalId]={eligible:false,reason:'TARGET_WORLD_STATE_CHANGED'};}
  }
  return commitTransition(snapshot,resolveRecruitmentAgreements(snapshot.recruitment,effective),{kind:'AGREEMENT'});
}

export function applyRecruitmentWorldTravelEvent(snapshot,input){
  validateRecruitmentWorldSnapshot(snapshot);
  invariant(input?.currentTurn===snapshot.world.turnNumber,`RECRUITMENT_WORLD_TURN_MISMATCH:travel=${input?.currentTurn}:world=${snapshot.world.turnNumber}`);
  invariant(!['ARRIVED','CAPTURED','RELEASED','DIED'].includes(input?.type),'RECRUITMENT_WORLD_TRAVEL_REQUIRES_ACTUAL_WORLD_SYNC');
  return commitTransition(snapshot,applyRecruitmentTravelEvent(snapshot.recruitment,input),{kind:'TRAVEL'});
}

export function synchronizeRecruitmentWorldTravel(snapshot,{eventId,proposalId,currentTurn}={}){
  validateRecruitmentWorldSnapshot(snapshot);invariant(currentTurn===snapshot.world.turnNumber,`RECRUITMENT_WORLD_TURN_MISMATCH:travel=${currentTurn}:world=${snapshot.world.turnNumber}`);
  const proposal=snapshot.recruitment.proposals[proposalId];invariant(proposal,`UNKNOWN_RECRUITMENT_PROPOSAL:${proposalId}`);const officer=snapshot.world.officers[proposal.targetOfficerId];
  if(proposal.status==='FAILED_POST_AGREEMENT')return {snapshot:clone(snapshot),transition:'NO_CHANGE',requiredAction:'NONE_FAILED'};
  if(!officer)return {snapshot:clone(snapshot),transition:'WAITING_CANONICAL_WORLD_OFFICER',requiredAction:'CANONICAL_OFFICER_DATA_REQUIRED'};
  let input=null;
  if(proposal.sourceFactionId!==null&&officer.allegianceFactionId!==proposal.sourceFactionId&&proposal.status!=='ACTIVE'){
    const next=failRecruitmentAfterAgreement(snapshot.recruitment,{eventId,proposalId,reason:`TARGET_OWNERSHIP_CHANGED:${officer.allegianceFactionId}`});return {snapshot:commitTransition(snapshot,next,{kind:'TRAVEL'}),transition:'FAILED_POST_AGREEMENT',requiredAction:'NONE'};
  }
  if(officer.lifeState==='DEAD'&&proposal.status!=='DEAD')input={eventId,proposalId,type:'DIED',currentTurn};
  else if(officer.captivityState==='PRISONER'&&['JOINING','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING'].includes(proposal.status))input={eventId,proposalId,type:'CAPTURED',currentTurn,captorFactionId:officer.captorFactionId};
  else if(officer.captivityState==='FREE'&&proposal.status==='PAUSED_CAPTIVE')input={eventId,proposalId,type:'RELEASED',currentTurn};
  else if(officer.conditionState!=='NORMAL'&&['JOINING','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING'].includes(proposal.status))return {snapshot:clone(snapshot),transition:'PAUSED_INJURED',requiredAction:'WAIT_FOR_RECOVERY'};
  else if(proposal.status==='JOINING'&&officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY'&&officerLocationRef(officer)===proposal.arrivalPlan.destinationRef)input={eventId,proposalId,type:'ARRIVED',currentTurn,locationRef:proposal.arrivalPlan.destinationRef};
  if(input===null)return {snapshot:clone(snapshot),transition:'NO_CHANGE',requiredAction:'CONTINUE_ACTUAL_TRAVEL'};
  return {snapshot:commitTransition(snapshot,applyRecruitmentTravelEvent(snapshot.recruitment,input),{kind:'TRAVEL'}),transition:input.type,requiredAction:'NONE'};
}

export function openRecruitmentWorldCommandPhase(snapshot,input){
  validateRecruitmentWorldSnapshot(snapshot);
  invariant(input?.currentTurn===snapshot.world.turnNumber,`RECRUITMENT_WORLD_TURN_MISMATCH:command=${input?.currentTurn}:world=${snapshot.world.turnNumber}`);
  return commitTransition(snapshot,openRecruitmentCommandPhase(snapshot.recruitment,input),{kind:'COMMAND_PHASE'});
}

export function getRecruitmentRosterIntegration(snapshot,{targetOfficerId}={}){
  validateRecruitmentWorldSnapshot(snapshot);invariant(typeof targetOfficerId==='string'&&targetOfficerId,'RECRUITMENT_ROSTER_TARGET_REQUIRED');
  const proposal=Object.values(snapshot.recruitment.proposals).filter(item=>item.targetOfficerId===targetOfficerId&&isAgreedStatus(item.status)).at(-1)??null;
  if(proposal===null)return {targetOfficerId,status:'NO_AGREEMENT',worldOfficerExists:Object.hasOwn(snapshot.world.officers,targetOfficerId),requiredAction:'NONE'};
  const exists=Object.hasOwn(snapshot.world.officers,targetOfficerId);
  if(proposal.status==='DEAD')return {targetOfficerId,status:'DEAD',worldOfficerExists:exists,requiredAction:'NONE_DEAD'};
  if(proposal.status==='FAILED_POST_AGREEMENT')return {targetOfficerId,status:proposal.status,worldOfficerExists:exists,requiredAction:'NONE_FAILED'};
  if(proposal.status==='ROSTER_TRANSFER_PENDING')return {targetOfficerId,status:proposal.status,worldOfficerExists:exists,requiredAction:exists?'PREPARE_CANONICAL_ROSTER_TRANSFER':'CANONICAL_OFFICER_DATA_REQUIRED'};
  if(proposal.status!=='ACTIVE')return {targetOfficerId,status:proposal.status,worldOfficerExists:exists,requiredAction:'WAIT_FOR_ACTIVE'};
  return {targetOfficerId,status:'ACTIVE',worldOfficerExists:exists,requiredAction:exists?'CANONICAL_ROSTER_TRANSFER_REQUIRED':'CANONICAL_OFFICER_DATA_REQUIRED'};
}

function officerRoleRefs(world,officerId){
  const refs=[];for(const faction of Object.values(world.factions))if(faction.rulerId===officerId)refs.push(`RULER:${faction.factionId}`);for(const city of Object.values(world.cities))if(city.governorId===officerId)refs.push(`GOVERNOR:${city.cityId}`);for(const army of Object.values(world.armies))if(army.commanderId===officerId)refs.push(`COMMANDER:${army.armyId}`);return refs.sort();
}
function canonicalOfficerShape(reference,record,targetOfficerId,destinationFactionId,destinationRef){
  invariant(object(record)&&record.officerId===targetOfficerId,'CANONICAL_OFFICER_DATA_REQUIRED');
  invariant(typeof record.name==='string'&&record.name&&record.allegianceFactionId===destinationFactionId,'INVALID_CANONICAL_RECRUITMENT_OFFICER_CORE');
  invariant(object(record.locationRef)&&`${record.locationRef.kind}:${record.locationRef.id}`===destinationRef&&record.lifeState==='ALIVE'&&record.captivityState==='FREE'&&record.travelState==='STATIONARY','INVALID_CANONICAL_RECRUITMENT_OFFICER_STATE');
  for(const key of ['baseStats','subStats'])invariant(object(record[key])&&sameIds(Object.keys(record[key]),Object.keys(reference[key]))&&Object.values(record[key]).every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0),`INVALID_CANONICAL_RECRUITMENT_OFFICER_${key.toUpperCase()}`);
  invariant(Array.isArray(record.allowedTroops)&&record.allowedTroops.length>0&&object(record.aptitude)&&sameIds(record.allowedTroops,Object.keys(record.aptitude)),'INVALID_CANONICAL_RECRUITMENT_OFFICER_TROOPS');
  invariant(Number.isSafeInteger(record.level)&&record.level>=1&&record.level<=30&&Number.isFinite(record.experience)&&record.experience>=0&&Number.isSafeInteger(record.aptitudePoints)&&record.aptitudePoints>=0,'INVALID_CANONICAL_RECRUITMENT_OFFICER_GROWTH');
  invariant(Array.isArray(record.acquiredTraits)&&Array.isArray(record.activeTraits)&&Array.isArray(record.tactics)&&object(record.uniqueTrait),'INVALID_CANONICAL_RECRUITMENT_OFFICER_CONTENT');
  for(const forbidden of ['status','isRuler','isGovernor','currentArmyId','currentCityId'])invariant(!Object.hasOwn(record,forbidden),`CANONICAL_RECRUITMENT_OFFICER_LEGACY_FIELD:${forbidden}`);
}

export function prepareRecruitmentWorldRosterDelta(snapshot,{eventId,proposalId,canonicalOfficerRecord=null,canonicalSourceRef=null}={}){
  validateRecruitmentWorldSnapshot(snapshot);const proposal=snapshot.recruitment.proposals[proposalId];invariant(proposal?.status==='ROSTER_TRANSFER_PENDING',`RECRUITMENT_ROSTER_TRANSFER_NOT_READY:${proposalId}`);if(proposal.rosterDeltaId!==null){const transfer=snapshot.recruitment.rosterTransfers[proposal.rosterDeltaId];invariant(Object.hasOwn(snapshot.recruitment.processedEvents,eventId)&&transfer,`RECRUITMENT_ROSTER_DELTA_ALREADY_PREPARED:${proposalId}`);return {snapshot:clone(snapshot),delta:clone(transfer.delta),deltaId:transfer.deltaId,replayed:true};}
  const targetId=proposal.targetOfficerId,destinationFactionId=proposal.factionId,destinationRef=proposal.arrivalPlan.destinationRef,officer=snapshot.world.officers[targetId];let mode,delta;
  if(officer){
    invariant(officer.lifeState==='ALIVE'&&officer.conditionState==='NORMAL'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY'&&officerLocationRef(officer)===destinationRef,`RECRUITMENT_ROSTER_TARGET_NOT_ACTUALLY_ARRIVED:${targetId}`);
    const roleRefs=officerRoleRefs(snapshot.world,targetId);invariant(roleRefs.length===0,`RECRUITMENT_ROSTER_SOURCE_ROLE_NOT_RELEASED:${targetId}:${roleRefs.join(',')}`);invariant(officer.allegianceFactionId!==destinationFactionId,`RECRUITMENT_ROSTER_TARGET_ALREADY_OWNED:${targetId}`);
    mode='EXISTING_OFFICER_TRANSFER';delta={schema:'recruitment-roster-delta-v1',mode,targetOfficerId:targetId,sourceFactionId:officer.allegianceFactionId,destinationFactionId,destinationRef,preconditions:{lifeState:'ALIVE',captivityState:'FREE',travelState:'STATIONARY',locationRef:destinationRef,sourceRoleRefs:[]},mutations:[{op:'REMOVE_FACTION_OFFICER',factionId:officer.allegianceFactionId,officerId:targetId},{op:'SET_OFFICER_ALLEGIANCE',officerId:targetId,factionId:destinationFactionId},{op:'ADD_FACTION_OFFICER',factionId:destinationFactionId,officerId:targetId}]};
  }else{
    invariant(typeof canonicalSourceRef==='string'&&canonicalSourceRef,'CANONICAL_OFFICER_DATA_REQUIRED');const reference=Object.values(snapshot.world.officers)[0];canonicalOfficerShape(reference,canonicalOfficerRecord,targetId,destinationFactionId,destinationRef);mode='ADD_CANONICAL_OFFICER';delta={schema:'recruitment-roster-delta-v1',mode,targetOfficerId:targetId,sourceFactionId:null,destinationFactionId,destinationRef,canonicalSourceRef,preconditions:{worldOfficerAbsent:true,lifeState:'ALIVE',captivityState:'FREE',travelState:'STATIONARY',locationRef:destinationRef},mutations:[{op:'ADD_CANONICAL_OFFICER',officer:clone(canonicalOfficerRecord)},{op:'ADD_FACTION_OFFICER',factionId:destinationFactionId,officerId:targetId}]};
  }
  const deltaId=`RECRUITMENT-ROSTER:${proposalId}:${targetId}`,fingerprint=stable(delta),transfer={deltaId,proposalId,targetOfficerId:targetId,mode,fingerprint,delta};const nextRecruitment=registerRecruitmentRosterDelta(snapshot.recruitment,{eventId,proposalId,transfer});return {snapshot:commitTransition(snapshot,nextRecruitment,{kind:'ROSTER_DELTA'}),delta:clone(delta),deltaId,replayed:false};
}

export function acknowledgeRecruitmentWorldRosterDelta(snapshot,{eventId,proposalId,deltaId,world}={}){
  validateRecruitmentWorldSnapshot(snapshot);validateFirst3State(world);const proposal=snapshot.recruitment.proposals[proposalId],transfer=snapshot.recruitment.rosterTransfers[deltaId];invariant(proposal?.rosterDeltaId===deltaId&&transfer?.status==='PENDING',`UNKNOWN_PENDING_RECRUITMENT_ROSTER_DELTA:${deltaId}`);const officer=world.officers[proposal.targetOfficerId];invariant(officer&&officer.allegianceFactionId===proposal.factionId&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.travelState==='STATIONARY'&&officerLocationRef(officer)===proposal.arrivalPlan.destinationRef,`RECRUITMENT_ROSTER_DELTA_NOT_APPLIED:${deltaId}`);invariant(world.factions[proposal.factionId].officerIds.includes(proposal.targetOfficerId),`RECRUITMENT_ROSTER_DESTINATION_LIST_MISSING:${deltaId}`);
  const nextRecruitment=acknowledgeRecruitmentRosterTransfer(snapshot.recruitment,{eventId,proposalId,deltaId});return validateRecruitmentWorldSnapshot({format:FORMAT,version:VERSION,world:clone(world),recruitment:nextRecruitment});
}

export function serializeRecruitmentWorldSnapshot(snapshot){validateRecruitmentWorldSnapshot(snapshot);return JSON.stringify(snapshot,null,2);}
export function deserializeRecruitmentWorldSnapshot(serialized){
  invariant(typeof serialized==='string'&&serialized.length<=MAX_SERIALIZED_LENGTH,'INVALID_RECRUITMENT_WORLD_SERIALIZED_INPUT');
  let snapshot;try{snapshot=JSON.parse(serialized);}catch{throw new Error('INVALID_RECRUITMENT_WORLD_JSON');}
  if(object(snapshot)&&object(snapshot.recruitment))snapshot.recruitment=deserializeRecruitmentState(JSON.stringify(snapshot.recruitment));validateRecruitmentWorldSnapshot(snapshot);return clone(snapshot);
}

export const RECRUITMENT_WORLD_FORMAT=FORMAT;
export const RECRUITMENT_WORLD_VERSION=VERSION;
