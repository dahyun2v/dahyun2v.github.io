import {createDomestic,domesticCommand,validateDomestic,eligibility,JOBS} from './domestic-trial.mjs';
import {createRoundMultiAdapter} from './round-multi-adapter.mjs';
import {ROUND_OFFICER_TRIAL} from './round-officer-trial.mjs';
export const INTEGRATED_FORMAT='sangoku-map-campaign-trial',INTEGRATED_VERSION=1,INTEGRATED_SCENARIO='FIRST3-MAP-CITY-TACTICAL-v1';
export const INTEGRATED_SLOT=`${INTEGRATED_FORMAT}:v1:${INTEGRATED_SCENARIO}:F01`;
export const CLOCK_MODE='MANUAL_INDEPENDENT_NO_AUTOMATIC_TIME_MAPPING';
const need=(v,m)=>{if(!v)throw Error(m);},copy=v=>structuredClone(v),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const keys=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...k].sort().join('|');
export function createMapCampaignApi({map,inputs,contract}){
 const tactical=createRoundMultiAdapter(ROUND_OFFICER_TRIAL),C=tactical.config;
 need(contract.status==='APPROVED_TRIAL','APPROVED_ECONOMY_REQUIRED');
 const binding=JSON.stringify({map,initialData:inputs.initialData,contract});
 const fresh=()=>({format:INTEGRATED_FORMAT,version:1,scenario:INTEGRATED_SCENARIO,clockMode:CLOCK_MODE,revision:0,campaign:createDomestic(inputs,'F01'),battle:tactical.create(map),journal:[]});
 function apply(s,cmd){
  need(keys(cmd,['id','expectedRevision','domain','request']),'INVALID_INTEGRATED_COMMAND');
  need(typeof cmd.id==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(cmd.id),'INVALID_OPERATION_ID');
  need(Number.isSafeInteger(cmd.expectedRevision)&&cmd.expectedRevision===s.revision,'STALE_INTEGRATED_INPUT');
  const n=copy(s);
  if(cmd.domain==='DOMESTIC'){
   need(keys(cmd.request,['kind','cityId','officerId','job','amount']),'INVALID_DOMESTIC_REQUEST');
   n.campaign=domesticCommand(n.campaign,{id:cmd.id,expectedRevision:n.campaign.revision,...cmd.request},inputs,contract);
  }else{
   need(cmd.domain==='TACTICAL','INVALID_COMMAND_DOMAIN');
   need(keys(cmd.request,['kind','actorId','targetId','tileId']),'INVALID_TACTICAL_REQUEST');
   n.battle=tactical.step(n.battle,{operationId:cmd.id,expectedRevision:n.battle.revision,...cmd.request}).state;
  }
  n.revision++;n.journal.push(copy(cmd));return n;
 }
 function replay(journal){need(Array.isArray(journal)&&journal.length<=250,'INVALID_INTEGRATED_JOURNAL');let s=fresh();const seen=new Set();for(const cmd of journal){need(!seen.has(cmd?.id),'DUPLICATE_INTEGRATED_OPERATION');seen.add(cmd.id);s=apply(s,cmd);}return s;}
 function validate(s){
  need(keys(s,['format','version','scenario','clockMode','revision','campaign','battle','journal'])&&s.format===INTEGRATED_FORMAT&&s.version===1&&s.scenario===INTEGRATED_SCENARIO&&s.clockMode===CLOCK_MODE,'INVALID_INTEGRATED_STATE');
  tactical.validate(s.battle);validateDomestic(s.campaign,inputs,contract);need(eq(s,replay(s.journal)),'INTEGRATED_REPLAY_MISMATCH');return s;
 }
 function step(s,cmd){validate(s);const found=s.journal.find(c=>c.id===cmd?.id);if(found){need(eq(found,cmd),'INTEGRATED_OPERATION_CONFLICT');return copy(s);}need(s.journal.length<250,'INTEGRATED_TRIAL_COMMAND_LIMIT');return apply(s,cmd);}
 function serialize(s){validate(s);return JSON.stringify({format:INTEGRATED_FORMAT,version:1,scenario:INTEGRATED_SCENARIO,clockMode:CLOCK_MODE,binding,journal:s.journal});}
 function deserialize(raw){
  need(typeof raw==='string'&&raw.length<=2_000_000,'INVALID_INTEGRATED_SAVE_LENGTH');let p;try{p=JSON.parse(raw);}catch{throw Error('INVALID_INTEGRATED_SAVE_JSON');}
  need(keys(p,['format','version','scenario','clockMode','binding','journal'])&&p.format===INTEGRATED_FORMAT&&p.version===1&&p.scenario===INTEGRATED_SCENARIO&&p.clockMode===CLOCK_MODE,'WRONG_INTEGRATED_SAVE');
  need(p.binding===binding,'INTEGRATED_INPUT_CHANGED');return replay(p.journal);
 }
 function view(s){
  validate(s);const f=s.battle.bundle.frame;
  const cities=map.cities.map(c=>{const source=inputs.initialData.world.cities[c.id],own=source.ownerFactionId==='F01';return {id:c.id,name:source.name,at:copy(c.at),ownerFactionId:source.ownerFactionId,own,...(own?{economy:copy(s.campaign.cities[c.id]),officers:Object.values(inputs.initialData.world.officers).filter(o=>!eligibility(inputs,s.campaign,c.id,o.officerId)).map(o=>({id:o.officerId,name:o.name})),report:copy(s.campaign.reports.at(-1)?.cities.find(r=>r.cityId===c.id)??null)}:{})};});
  return {revision:s.revision,campaignTurn:s.campaign.turn,elapsedDays:(s.campaign.turn-1)*10,round:f.round.roundNumber,active:copy(f.round.active),result:copy(s.battle.result),cities,
   units:f.space.units.map(u=>({id:u.unitId,name:C.roster.find(r=>r.unitId===u.unitId).name,own:u.factionId==='F01',anchor:copy(u.anchor),count:f.troops.find(t=>t.unitId===u.unitId).count})),moves:tactical.moveOptions(s.battle),targets:tactical.attackTargets(s.battle),arena:copy(s.battle.mapBinding.arenaTiles),log:copy(s.battle.log.slice(-8)),jobs:JOBS};
 }
 return Object.freeze({create:fresh,step,validate,serialize,deserialize,view,config:C});
}
