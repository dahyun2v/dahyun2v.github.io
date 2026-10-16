import {relationsEnabled,relationCaptiveReleased} from './campaign-relations.mjs';
import {c29RecruitAgent} from './campaign-c29.mjs';
import {domesticRule,domesticRelease,domesticRecruit} from './campaign-rule-registry.mjs';
import {creditCampaignDomestic} from './campaign-growth.mjs';
import {C20,cityRecruitQuote} from './campaign-policy.mjs';
import {adoptWanderer} from './campaign-roster.mjs';
import {createRecruitmentState,reserveRecruitmentProposal,resolveRecruitmentAgreements,validateRecruitmentState} from './recruitment.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {administrationLine} from './campaign-occupation.mjs';
import {updateKnowledge} from './knowledge.mjs';

let previewServices={};
export function configureCaptivePreview(services){previewServices=services;}

export function initializeCampaignCaptives(s) {
  s.captiveRecruitment??=createRecruitmentState({factions:s.factions});
  return s;
}
export function campaignCaptives(s,factionId=s.playerFactionId) {
  return (s.terminal?.prisonerOrder??[]).map(id=>s.terminal.prisonersById[id])
    .filter(p=>p.captorFactionId===factionId&&p.disposition==='HELD')
    .map(p=>({prisonerId:p.prisonerRecordId,officerId:p.officerId,name:s.officers[p.officerId].name,
      homeFactionId:p.homeFactionId,cityId:s.officers[p.officerId].locationRef.kind==='CITY'?s.officers[p.officerId].locationRef.id:s.factions[factionId].capitalCityId,...cityRecruitQuote(s,s.officers[p.officerId].locationRef.kind==='CITY'?s.officers[p.officerId].locationRef.id:s.factions[factionId].capitalCityId,factionId,p.officerId),negotiating:Object.values(s.captiveRecruitment?.proposals??{}).some(x=>x.targetOfficerId===p.officerId&&x.status==='NEGOTIATING')}));
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
  const id=`REC.ZC192.CAPTIVE.${s.globalTick}.${p.prisonerRecordId}`;
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

// Execute the real command and agreement settlement on an isolated snapshot.
// Preview consumes neither the live RNG nor a live recruitment reservation.
export function captiveActionPreview(s,prisonerId,action){
 const before=structuredClone(s),after=structuredClone(s),p=campaignCaptives(before).find(p=>p.prisonerId===prisonerId);
 if(!p)return {available:false,lines:['이 포로는 처리할 수 없습니다'],changes:[]};
 const lines=[],changes=[];
 try{
  selectCaptiveAction(after,{prisonerId,action});
  previewServices.afterCommand?.(after,before);
  if(action==='recruit'){
   lines.push(`인망 ${p.cost} 예약 · 협의 1차례 · 성공할 때만 소모`,p.reason);
   after.turn++;settleCampaignCaptives(after);
   lines.push('실패 조건: 대상이 포로가 아님 · 인망 부족 · 등용할 성의 규칙 또는 원소속 조건 변화');
  }
 }catch(error){return {available:false,lines:[error.message,...(action==='recruit'?[p.reason]:[])],changes:[]};}
 const delta=(label,a,b)=>{if(a!==b){changes.push({label,before:a,after:b});lines.push(`${label} ${a} → ${b}`);}};
 delta('인망',before.factions[before.playerFactionId].prestige,after.factions[after.playerFactionId].prestige);
 for(const key of new Set([...Object.keys(before.relations??{}),...Object.keys(after.relations??{})])){
  const ids=key.split('|');if(!ids.includes(p.officerId))continue;
  delta(ids.map(id=>before.officers[id]?.name??before.wanderers?.[id]?.name??'장수').join('·')+' 관계',before.relations?.[key]?.value??30,after.relations?.[key]?.value??30);
 }
 const oldDiplomacy=previewServices.diplomacyView?.(before,before.playerFactionId),newDiplomacy=previewServices.diplomacyView?.(after,after.playerFactionId);
 for(const row of newDiplomacy?.factions??[]){const old=oldDiplomacy?.factions.find(r=>r.factionId===row.factionId);if(old)delta(`외교 · ${row.name}의 호감`,old.opinionOfMe,row.opinionOfMe);}
 for(const c of Object.values(after.cities))if(before.cities[c.cityId]?.securityLevel!==c.securityLevel)delta(`${c.name??'성'} 치안 악화 단계`,before.cities[c.cityId]?.securityLevel??0,c.securityLevel??0);
 if(action==='release'){
  const old=Object.keys(before.c38?.rivalEvents??{}),fresh=Object.entries(after.c38?.rivalEvents??{}).filter(([key])=>!old.includes(key));
  lines.push(fresh.length?'숙적 위험: 이번 석방으로 숙적 발생':'숙적 위험: 이번 석방에서는 발생하지 않음');
  if(!changes.some(c=>c.label.endsWith('관계')))lines.push('관계 수치 변화 없음');
  if(!changes.some(c=>c.label.startsWith('외교')))lines.push('외교 수치 변화 없음');
  if(!changes.some(c=>c.label==='인망'))lines.push('인망 변화 없음');
 }
 if(action==='hold')lines.push('억류 유지 · 별도 유지 비용 없음');
 return {available:true,lines,changes};
}
