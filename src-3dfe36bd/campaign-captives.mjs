import {relationsEnabled,relationCaptiveReleased} from './campaign-relations.mjs';
import {c29RecruitAgent} from './campaign-c29.mjs';
import {domesticRule,domesticRelease,domesticRecruit} from './campaign-rule-registry.mjs';
import {creditCampaignDomestic} from './campaign-growth.mjs';
import {C20,cityRecruitCost} from './campaign-policy.mjs';
import {adoptWanderer} from './campaign-roster.mjs';
import {createRecruitmentState,reserveRecruitmentProposal,resolveRecruitmentAgreements,validateRecruitmentState} from './recruitment.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {administrationLine} from './campaign-occupation.mjs';
import {updateKnowledge} from './knowledge.mjs';

export function initializeCampaignCaptives(s) {
  s.captiveRecruitment??=createRecruitmentState({factions:s.factions});
  return s;
}
export function campaignCaptives(s,factionId=s.playerFactionId) {
  return (s.terminal?.prisonerOrder??[]).map(id=>s.terminal.prisonersById[id])
    .filter(p=>p.captorFactionId===factionId&&p.disposition==='HELD')
    .map(p=>({prisonerId:p.prisonerRecordId,officerId:p.officerId,name:s.officers[p.officerId].name,
      homeFactionId:p.homeFactionId,cityId:s.officers[p.officerId].locationRef.kind==='CITY'?s.officers[p.officerId].locationRef.id:s.factions[factionId].capitalCityId,cost:cityRecruitCost(s,s.officers[p.officerId].locationRef.kind==='CITY'?s.officers[p.officerId].locationRef.id:s.factions[factionId].capitalCityId,factionId),negotiating:Object.values(s.captiveRecruitment?.proposals??{}).some(x=>x.targetOfficerId===p.officerId&&x.status==='NEGOTIATING')}));
}
export function captiveRecruitmentReason(s,p) {
  if(domesticRule(s,s.cities[p.cityId],'CAPTIVE_DEBT'))return '포로로 인망 얻기: 이 성 포로 등용 불가';
  if(!['v2','v3'].includes(s.mapId)&&s.factions[p.homeFactionId]?.alive)return '원소속 세력이 존속하여 고정 소속 등용 불가';
  if(p.negotiating)return '등용 협의 중 · 1턴';
  const reserved=s.captiveRecruitment?.factions[s.playerFactionId]?.reservedPrestige??0;
  if(s.factions[s.playerFactionId].prestige-reserved<(p.cost??C20.recruitCost))return `인망 ${p.cost??C20.recruitCost} 필요`;
  return null;
}
function releaseCaptive(s,p,recruited=false,cost=C20.recruitCost) {
  const t=s.terminal,o=s.officers[p.officerId],to=t.officersById[p.officerId];
  const id=`REC.C6.CAPTIVE.${s.globalTick}.${p.prisonerRecordId}`;
  t.recordsById[id]={recordId:id,globalTick:s.globalTick,type:'PRISONER_LEDGER',causeRecordIds:[p.captureRecordId],
    refs:{factionIds:[p.homeFactionId,p.captorFactionId].sort(),armyIds:[],officerIds:[p.officerId],cityIds:[],choiceIds:[],prisonerRecordIds:[p.prisonerRecordId]},
    details:{disposition:recruited?'RECRUITED':'RELEASED'}};
  Object.assign(p,{disposition:'RELEASED',closedAtTick:s.globalTick,closureRecordId:id});
  for(const row of [o,to]){row.captivityState='FREE';row.captorFactionId=null;}
  if(recruited) {
    s.factions[p.homeFactionId].officerIds=s.factions[p.homeFactionId].officerIds.filter(id=>id!==o.officerId);
    o.allegianceFactionId=to.allegianceFactionId=p.captorFactionId;
    if(!s.factions[p.captorFactionId].officerIds.includes(o.officerId))s.factions[p.captorFactionId].officerIds.push(o.officerId);
    o.travelState='STATIONARY';o.locationRef={kind:'NONE',id:null};to.assignment={kind:'NONE',id:null};
    // Historical candidate lists are snapshots. Remove transferred identities
    // from old office choices so later validation cannot offer a foreign officer.
    for(const choice of Object.values(t.choicesById))choice.candidateOfficerIds=choice.candidateOfficerIds.filter(id=>id!==o.officerId);
  }
  if(!recruited){relationCaptiveReleased(s,p);domesticRelease(s,p);}else {const c=s.cities[s.factions[p.captorFactionId].capitalCityId];if(c)domesticRecruit(s,c,o.officerId);}
  syncCampaignAdministrativeTerminal(s);updateKnowledge(s);
  administrationLine(s,`${o.name}: ${recruited?`등용 성공 · 인망 −${cost} · 부대 없이 소속`:'무상 석방'}`);
}
export function selectCaptiveAction(s,{prisonerId,action}) {
  initializeCampaignCaptives(s);
  const p=s.terminal?.prisonersById[prisonerId];
  if(!p||p.disposition!=='HELD'||p.captorFactionId!==s.playerFactionId)throw new Error('INVALID_CAMPAIGN_CAPTIVE');
  const publicPrisoner=campaignCaptives(s).find(x=>x.prisonerId===prisonerId);
  if(publicPrisoner.negotiating)throw new Error('등용 협의 중입니다.');
  if(action==='hold')administrationLine(s,`${s.officers[p.officerId].name}: 억류 유지`);
  else if(action==='release')releaseCaptive(s,p);
  else if(action==='recruit') {
    const reason=captiveRecruitmentReason(s,publicPrisoner);if(reason)throw new Error(reason);
    for(const [id,f] of Object.entries(s.factions))s.captiveRecruitment.factions[id].prestige=f.prestige;
    s.captiveSequence=(s.captiveSequence??0)+1;
    s.captiveRecruitment=reserveRecruitmentProposal(s.captiveRecruitment,{proposalId:`C6.${s.captiveSequence}`,
      factionId:s.playerFactionId,...c29RecruitAgent(s,s.cities[publicPrisoner.cityId]),targetOfficerId:p.officerId,sourceFactionId:p.homeFactionId,candidateSourceRef:publicPrisoner.cityId,cost:publicPrisoner.cost,tieBreakPriority:s.captiveSequence,createdTurn:s.turn});
    administrationLine(s,`${s.officers[p.officerId].name}: 등용 협의 1턴 · 성공 시 인망 ${publicPrisoner.cost}`);
  }else throw new Error('INVALID_CAMPAIGN_CAPTIVE_ACTION');
  return s;
}
export function settleCampaignCaptives(s) {
  initializeCampaignCaptives(s);
  const r=s.captiveRecruitment,matured=Object.values(r.proposals).filter(p=>p.status==='NEGOTIATING'&&p.createdTurn<s.turn);
  if(!matured.length)return s;
  const eligibilityByProposalId={},arrivalPlansByProposalId={};
  for(const [id,f] of Object.entries(s.factions))r.factions[id].prestige=Math.max(f.prestige,r.factions[id].reservedPrestige);
  for(const proposal of matured) {
    const o=s.officers[proposal.targetOfficerId];
    if(proposal.sourceFactionId===null){const w=s.wanderers?.[proposal.targetOfficerId],cityId=proposal.candidateSourceRef;eligibilityByProposalId[proposal.proposalId]={eligible:!!w&&w.locationRef.id===cityId&&s.cities[cityId]?.ownerFactionId===proposal.factionId&&s.factions[proposal.factionId].prestige>=proposal.cost,reason:'TARGET_WORLD_STATE_CHANGED'};arrivalPlansByProposalId[proposal.proposalId]={destinationRef:cityId,routeId:'C16.LOCAL',expectedArrivalTurn:s.turn};continue;}
    eligibilityByProposalId[proposal.proposalId]={eligible:o.lifeState==='ALIVE'&&o.captivityState==='PRISONER'&&o.captorFactionId===proposal.factionId&&
      !domesticRule(s,s.cities[proposal.candidateSourceRef],'CAPTIVE_DEBT')&&(['v2','v3'].includes(s.mapId)||!s.factions[proposal.sourceFactionId].alive)&&s.factions[proposal.factionId].prestige>=proposal.cost,reason:'TARGET_WORLD_STATE_CHANGED'};
    arrivalPlansByProposalId[proposal.proposalId]={destinationRef:s.factions[proposal.factionId].capitalCityId,routeId:'C6.LOCAL',expectedArrivalTurn:s.turn};
  }
  s.captiveRecruitment=resolveRecruitmentAgreements(r,{eventId:`C6.AGREEMENT.${s.turn}`,currentTurn:s.turn,eligibilityByProposalId,arrivalPlansByProposalId});
  for(const proposal of matured) {
    const result=s.captiveRecruitment.proposals[proposal.proposalId];
    if(result.status!=='JOINING'){administrationLine(s,`${(s.officers[proposal.targetOfficerId]??s.wanderers[proposal.targetOfficerId]).name}: 등용 실패 · 인망 소비 없음`);continue;}
    creditCampaignDomestic(s,{officerId:s.cities[s.c26?.remoteProposals?.[proposal.proposalId]??proposal.candidateSourceRef]?.governorId,eventId:`C25.RECRUIT.${proposal.proposalId}`,kind:'RECRUITED',counts:{recruited:1}});
    if(proposal.sourceFactionId===null){s.factions[proposal.factionId].prestige=s.captiveRecruitment.factions[proposal.factionId].prestige;adoptWanderer(s,proposal);continue;}
    const p=Object.values(s.terminal.prisonersById).find(p=>p.officerId===proposal.targetOfficerId&&p.disposition==='HELD');
    s.factions[proposal.factionId].prestige=s.captiveRecruitment.factions[proposal.factionId].prestige;
    releaseCaptive(s,p,true,proposal.cost);
  }
  return s;
}
export function validateCampaignAdministration(s) {
  if(relationsEnabled(s))for(const p of Object.values(s.terminal?.prisonersById??{})){const id=s.terminal.recordsById[p.captureRecordId]?.details.captorId;if(id!==undefined&&(!s.officers[id]||id===p.officerId))throw new Error('INVALID_CAMPAIGN_CAPTOR');}
  if(s.captiveRecruitment)validateRecruitmentState(s.captiveRecruitment);
  for(const o of Object.values(s.occupations??{}))if(o.stage&&(!['CAPTURED','OCCUPATION','STABILIZING','NORMAL'].includes(o.stage)||!Number.isInteger(o.turnsLeft)||o.turnsLeft<0||o.turnsLeft>2))throw new Error('INVALID_CAMPAIGN_OCCUPATION');
}
