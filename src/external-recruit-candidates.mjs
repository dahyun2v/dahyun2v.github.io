import {validateState} from './first3.mjs';

const FORMAT='sangoku-external-recruit-candidates';
const VERSION=1;
const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const stable=value=>object(value)?`{${Object.keys(value).sort().map(key=>`${key}:${stable(value[key])}`).join(',')}}`:Array.isArray(value)?`[${value.map(stable).join(',')}]`:JSON.stringify(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function distance(a,b){return (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;}
function passable(tile){return tile&&!['water','mountain'].includes(tile.terrainType);}

function route(world,fromId,toId){
  invariant(passable(world.tiles[fromId])&&passable(world.tiles[toId]),'EXTERNAL_RECRUIT_ROUTE_ENDPOINT_BLOCKED');
  const queue=[fromId],previous=new Map(),seen=new Set(queue);
  while(queue.length){
    const current=queue.shift();if(current===toId)break;
    const neighbors=Object.values(world.tiles).filter(tile=>passable(tile)&&distance(world.tiles[current],tile)===1).map(tile=>tile.tileId).sort();
    for(const next of neighbors)if(!seen.has(next)){seen.add(next);previous.set(next,current);queue.push(next);}
  }
  invariant(seen.has(toId),'EXTERNAL_RECRUIT_ROUTE_NOT_FOUND');
  const path=[toId];while(previous.has(path[0]))path.unshift(previous.get(path[0]));return path;
}

export function createExternalRecruitCandidates({world,contracts}={}){
  validateState(world);invariant(object(contracts)&&Object.keys(contracts).length>0,'EXTERNAL_RECRUIT_CONTRACTS_REQUIRED');
  const candidates={};
  for(const[candidateId,contract]of Object.entries(contracts)){
    const source=contract.candidatePreRecruitmentState;
    invariant(contract.officerId===candidateId&&source?.sourceType==='EXTERNAL_NEUTRAL_CANDIDATE'&&world.tiles[source.tileId],'INVALID_EXTERNAL_RECRUIT_CONTRACT');
    candidates[candidateId]={candidateId,sourceRef:`docs/design-data/map-start-v1.json#${source.siteId}:${candidateId}`,canonicalSourceRef:'docs/work-integration/20260921/round-06/g21-officer-contract-v1.json#officerTemplateCore',siteId:source.siteId,currentTileId:source.tileId,availability:'AVAILABLE',proposalId:null,factionId:null,destinationCityId:null,pathTileIds:[],departedGlobalTick:null,arrivalGlobalTick:null,status:'AVAILABLE',processedEvents:{}};
  }
  return validateExternalRecruitCandidates({format:FORMAT,version:VERSION,candidates});
}

export function validateExternalRecruitCandidates(state){
  invariant(object(state)&&state.format===FORMAT&&state.version===VERSION&&object(state.candidates),'INVALID_EXTERNAL_RECRUIT_STATE');
  for(const[id,candidate]of Object.entries(state.candidates)){
    invariant(candidate.candidateId===id&&typeof candidate.sourceRef==='string'&&typeof candidate.canonicalSourceRef==='string','INVALID_EXTERNAL_RECRUIT_IDENTITY');
    invariant(['AVAILABLE','TRAVELLING','ARRIVED','ROSTERED','CLOSED'].includes(candidate.status)&&object(candidate.processedEvents),'INVALID_EXTERNAL_RECRUIT_STATUS');
    if(candidate.status==='TRAVELLING'||candidate.status==='ARRIVED'||candidate.status==='ROSTERED')invariant(candidate.proposalId&&candidate.factionId&&candidate.destinationCityId&&candidate.pathTileIds.length>1&&Number.isSafeInteger(candidate.departedGlobalTick)&&Number.isSafeInteger(candidate.arrivalGlobalTick),'INVALID_EXTERNAL_RECRUIT_TRAVEL');
  }
  return state;
}

export function startExternalRecruitTravel(state,{eventId,candidateId,proposalId,factionId,destinationCityId,world,globalTick}={}){
  validateExternalRecruitCandidates(state);validateState(world);const source=state.candidates[candidateId];invariant(source?.status==='AVAILABLE','EXTERNAL_RECRUIT_NOT_AVAILABLE');
  const city=world.cities[destinationCityId];invariant(city?.ownerFactionId===factionId,'EXTERNAL_RECRUIT_DESTINATION_NOT_OWNED');
  const payload={candidateId,proposalId,factionId,destinationCityId,globalTick},fingerprint=stable(payload),existing=source.processedEvents[eventId];if(existing){invariant(existing===fingerprint,'CONFLICTING_EXTERNAL_RECRUIT_EVENT');return clone(state);}
  const next=clone(state),candidate=next.candidates[candidateId],pathTileIds=route(world,candidate.currentTileId,city.tileId),travelTicks=Math.max(1,(pathTileIds.length-1)*20);
  Object.assign(candidate,{proposalId,factionId,destinationCityId,pathTileIds,departedGlobalTick:globalTick,arrivalGlobalTick:globalTick+travelTicks,status:'TRAVELLING'});candidate.processedEvents[eventId]=fingerprint;return validateExternalRecruitCandidates(next);
}

export function advanceExternalRecruitCandidates(state,{world,globalTick}={}){
  validateExternalRecruitCandidates(state);validateState(world);const next=clone(state);
  for(const candidate of Object.values(next.candidates).filter(item=>item.status==='TRAVELLING')){
    const city=world.cities[candidate.destinationCityId];if(city?.ownerFactionId!==candidate.factionId){candidate.status='CLOSED';candidate.availability='DESTINATION_LOST';continue;}
    const elapsed=Math.max(0,globalTick-candidate.departedGlobalTick),duration=candidate.arrivalGlobalTick-candidate.departedGlobalTick,index=Math.min(candidate.pathTileIds.length-1,Math.floor(elapsed/duration*(candidate.pathTileIds.length-1)));
    candidate.currentTileId=candidate.pathTileIds[index];
    if(globalTick>=candidate.arrivalGlobalTick){candidate.currentTileId=city.tileId;candidate.status='ARRIVED';candidate.availability='ARRIVED_PENDING_ROSTER';}
  }
  return validateExternalRecruitCandidates(next);
}

export function markExternalRecruitRostered(state,{eventId,candidateId,proposalId}={}){
  validateExternalRecruitCandidates(state);const fingerprint=stable({candidateId,proposalId}),source=state.candidates[candidateId],existing=source?.processedEvents[eventId];if(existing){invariant(existing===fingerprint,'CONFLICTING_EXTERNAL_RECRUIT_EVENT');return clone(state);}
  const next=clone(state),candidate=next.candidates[candidateId];invariant(candidate?.status==='ARRIVED'&&candidate.proposalId===proposalId,'EXTERNAL_RECRUIT_NOT_ARRIVED');
  candidate.status='ROSTERED';candidate.availability='OWNED_RESERVE';candidate.processedEvents[eventId]=fingerprint;return validateExternalRecruitCandidates(next);
}

export const EXTERNAL_RECRUIT_CANDIDATES_FORMAT=FORMAT;
