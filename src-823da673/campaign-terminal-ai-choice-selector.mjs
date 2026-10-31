import {validateCampaignTerminalPublicView} from './campaign-terminal-public-view.mjs';

const FORMAT='sangoku-campaign-terminal-ai-choice-selector';
const VERSION=1;
const CONTRACT_STATUS='WORK_TRIAL';
const RESOLUTION_MODE='AI_STABLE';
const SUCCESSION_STAT_KEYS=Object.freeze(['leadership','politics','charisma']);
const OCCUPATION_SUB_STAT_KEY='행정';

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function compareId(left,right){return left<right?-1:left>right?1:0;}
function choiceOrder(left,right){return left.createdAtTick-right.createdAtTick||compareId(left.choiceId,right.choiceId);}

function hash64(value){
  let hash=0xcbf29ce484222325n;
  for(const character of value){
    hash^=BigInt(character.codePointAt(0));
    hash=BigInt.asUintN(64,hash*0x100000001b3n);
  }
  return hash.toString(16).padStart(16,'0');
}

function transactionIdFor(view,choice){
  const identity=`${view.terminal.campaignId}|${view.terminal.viewerFactionId}|${choice.choiceId}`;
  return `TX.R9AI.${view.globalTick}.${hash64(identity)}.${hash64([...identity].reverse().join(''))}`;
}

function validateRuntimePublicView(view,options={}){
  invariant(object(view)&&integer(view.globalTick)&&object(view.world),'INVALID_FIRST3_RUNTIME_PUBLIC_VIEW');
  invariant(typeof view.world.factionId==='string'&&view.world.factionId.length>0&&object(view.world.officers),'INVALID_FIRST3_RUNTIME_PUBLIC_WORLD');
  if(view.terminal===null)return;
  validateCampaignTerminalPublicView(view.terminal,options);
  invariant(view.terminal.globalTick<=view.globalTick,'TERMINAL_AI_CHOICE_PUBLIC_TERMINAL_TICK_IN_FUTURE');
  invariant(view.terminal.viewerFactionId===view.world.factionId,'TERMINAL_AI_CHOICE_PUBLIC_FACTION_MISMATCH');
  for(const choice of view.terminal.ownChoices)invariant(choice.createdAtTick<=view.terminal.globalTick&&choice.createdAtTick<=view.globalTick,`TERMINAL_AI_CHOICE_CREATED_AT_TICK_IN_FUTURE:${choice.choiceId}`);
  for(const[officerId,officer]of Object.entries(view.world.officers)){
    invariant(object(officer)&&officer.officerId===officerId,'INVALID_TERMINAL_AI_PUBLIC_OFFICER');
    invariant(officer.allegianceFactionId===view.world.factionId,`TERMINAL_AI_FOREIGN_OFFICER_FORBIDDEN:${officerId}`);
  }
}

function successionScore(officer){
  if(!object(officer?.baseStats)||!SUCCESSION_STAT_KEYS.every(key=>finite(officer.baseStats[key])))return null;
  return SUCCESSION_STAT_KEYS.reduce((sum,key)=>sum+officer.baseStats[key],0);
}

function occupationScore(officer){
  if(!finite(officer?.baseStats?.politics)||!finite(officer?.subStats?.[OCCUPATION_SUB_STAT_KEY]))return null;
  return officer.baseStats.politics+officer.subStats[OCCUPATION_SUB_STAT_KEY];
}

function selectCandidate(view,choice,candidateOfficerIds){
  const score=choice.type==='SUCCESSION'?successionScore:occupationScore;
  const candidates=[...candidateOfficerIds].sort(compareId);
  const scored=candidates.map(officerId=>({officerId,score:score(view.world.officers[officerId])}));
  if(scored.some(candidate=>candidate.score===null))return candidates[0];
  scored.sort((left,right)=>right.score-left.score||compareId(left.officerId,right.officerId));
  return scored[0].officerId;
}

function exactResolutionInput(view,choice,selectedOfficerId){
  return {
    transactionId:transactionIdFor(view,choice),
    globalTick:view.globalTick,
    choiceId:choice.choiceId,
    selectedOfficerId,
    resolutionMode:RESOLUTION_MODE,
  };
}

/**
 * Plan AI resolution inputs from one faction's getFirst3RuntimePublicView
 * result. No canonical terminal/world state is accepted or consulted.
 *
 * Score weights are ROUND-09 WORK_TRIAL only:
 * - SUCCESSION: leadership + politics + charisma
 * - OCCUPATION: politics + subStats.행정
 * If any remaining candidate lacks any required field for that choice, the
 * entire choice falls back to ascending officer ID instead of inferring data.
 */
export function planCampaignTerminalAiChoices(runtimePublicView,options={}){
  validateRuntimePublicView(runtimePublicView,options);
  const terminal=runtimePublicView.terminal;
  const empty={
    format:FORMAT,
    version:VERSION,
    contractStatus:CONTRACT_STATUS,
    viewerFactionId:runtimePublicView.world.factionId,
    globalTick:runtimePublicView.globalTick,
    resolutionInputs:[],
    skippedChoices:[],
  };
  if(terminal===null)return empty;

  const pending=[...terminal.ownChoices].filter(choice=>choice.status==='PENDING').sort(choiceOrder);
  if(terminal.gameResult!==null){
    empty.skippedChoices=pending.map(choice=>({choiceId:choice.choiceId,reasonCode:'CAMPAIGN_ENDED'}));
    return empty;
  }
  if(!terminal.ownFaction.alive){
    empty.skippedChoices=pending.map(choice=>({choiceId:choice.choiceId,reasonCode:'FACTION_NOT_ALIVE'}));
    return empty;
  }

  const reservedOccupationOfficers=new Set();
  const terminalOwnOfficers=new Map(terminal.ownOfficers.map(officer=>[officer.officerId,officer]));
  for(const choice of pending){
    let candidates=[...new Set(choice.candidateOfficerIds)].sort(compareId);
    if(candidates.length===0){
      empty.skippedChoices.push({
        choiceId:choice.choiceId,
        reasonCode:'NO_CANDIDATE_OFFICER',
      });
      continue;
    }
    if(choice.type==='OCCUPATION'){
      candidates=candidates.filter(officerId=>terminalOwnOfficers.get(officerId)?.assignment?.kind==='NONE');
      if(candidates.length===0){
        empty.skippedChoices.push({choiceId:choice.choiceId,reasonCode:'NO_UNASSIGNED_OCCUPATION_CANDIDATE'});
        continue;
      }
      candidates=candidates.filter(officerId=>!reservedOccupationOfficers.has(officerId));
      if(candidates.length===0){
        empty.skippedChoices.push({choiceId:choice.choiceId,reasonCode:'NO_UNRESERVED_OCCUPATION_CANDIDATE'});
        continue;
      }
    }
    const selectedOfficerId=selectCandidate(runtimePublicView,choice,candidates);
    empty.resolutionInputs.push(exactResolutionInput(runtimePublicView,choice,selectedOfficerId));
    if(choice.type==='OCCUPATION')reservedOccupationOfficers.add(selectedOfficerId);
  }
  return empty;
}

export function selectCampaignTerminalAiChoiceResolutionInputs(runtimePublicView,options={}){
  return planCampaignTerminalAiChoices(runtimePublicView,options).resolutionInputs;
}

export const CAMPAIGN_TERMINAL_AI_CHOICE_SELECTOR_FORMAT=FORMAT;
export const CAMPAIGN_TERMINAL_AI_CHOICE_SELECTOR_VERSION=VERSION;
export const CAMPAIGN_TERMINAL_AI_CHOICE_RESOLUTION_MODE=RESOLUTION_MODE;
export const CAMPAIGN_TERMINAL_AI_CHOICE_WORK_TRIAL=Object.freeze({
  succession:{baseStats:[...SUCCESSION_STAT_KEYS],formula:'leadership + politics + charisma'},
  occupation:{baseStats:['politics'],subStats:[OCCUPATION_SUB_STAT_KEY],formula:'politics + subStats.행정'},
  missingRequiredField:'STABLE_OFFICER_ID_ONLY',
});
