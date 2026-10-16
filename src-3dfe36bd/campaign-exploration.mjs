import {withdrawalProtection} from './campaign-diplomacy.mjs';
import data from '../../docs/design-data/exploration-v0.1.json' with {type:'json'};
import {campaignMapData} from './campaign-scenario.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {cityEconomyRates} from './campaign-economy.mjs';
import {campaignResearchView,settleCampaignResearch} from './campaign-roster.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {parentTroop} from './campaign-special-troops.mjs';

export const EXPLORATION=data;
export const explorationEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c42Disabled!==true;
const events=new Map(data.events.map(e=>[e.id,e]));
const liveWanderer=(s,id)=>{
 const o=s.wanderers?.[id];
 const reserved=Object.values(s.captiveRecruitment?.proposals??{}).some(p=>p.targetOfficerId===id&&['NEGOTIATING','JOINING'].includes(p.status));
 return o?.lifeState==='ALIVE'&&o.captivityState==='FREE'&&!o.allegianceFactionId&&o.travelState==='STATIONARY'&&!reserved?o:null;
};
const deployed=(s,a)=>a&&!(s.c46Disabled!==true&&s.officers[a.commanderId]?.injury)&&castleArmyActive(s,a)&&a.hp>0&&a.troopCount>0&&s.officers[a.commanderId]?.lifeState==='ALIVE'&&s.officers[a.commanderId]?.captivityState==='FREE';
const knownPlace=(s,fid,p)=>s.exploration.known[fid].includes(p.label)||['VISIBLE','REMEMBERED'].includes(s.knowledge[fid]?.tiles[p.tileId]);
const contested=(s,p,fid)=>Object.values(s.armies).some(a=>a.factionId!==fid&&deployed(s,a)&&hexDistance(s.tiles[a.tileId],s.tiles[p.tileId])<=1);
function nearestCity(s,p,fid){
 return Object.values(s.cities).filter(c=>c.ownerFactionId===fid).sort((a,b)=>hexDistance(s.tiles[a.tileId],s.tiles[p.tileId])-hexDistance(s.tiles[b.tileId],s.tiles[p.tileId])||a.cityId.localeCompare(b.cityId))[0];
}
export function initializeExploration(s){
 if(!explorationEnabled(s)||s.exploration!==undefined)return s;
 s.exploration={places:Object.fromEntries(campaignMapData(s.mapId).places.map(p=>[p.label,{label:p.label,tileId:p.at.join(','),eventId:(data.placeEvents[p.label]??[]).find(id=>{const e=events.get(id);return e&&(!e.requires?.wanderer||liveWanderer(s,e.requires.wanderer));})??null,status:'KNOWN'}])),pending:{},known:Object.fromEntries(Object.keys(s.factions).map(fid=>[fid,[]]))};
 rememberExploration(s);return s;
}
export function rememberExploration(s){
 if(!explorationEnabled(s)||!s.exploration)return s;
 for(const fid of Object.keys(s.factions))for(const p of Object.values(s.exploration.places))if(knownPlace(s,fid,p)&&!s.exploration.known[fid].includes(p.label))s.exploration.known[fid].push(p.label);
 return s;
}
function resetPlace(s,p){
 for(const [fid,q] of Object.entries(s.exploration.pending))if(q.placeId===p.label)delete s.exploration.pending[fid];
 p.status='KNOWN';for(const key of ['investigator','progressArmyId','stock'])delete p[key];
}
function investigator(s,q){
 const a=s.armies[q.armyId],o=s.officers[q.officerId];
 return deployed(s,a)&&a.commanderId===q.officerId&&a.factionId===q.factionId&&o?.allegianceFactionId===q.factionId?{a,o}:null;
}
function effect(s,p,q,c){
 const city=nearestCity(s,p,q.factionId),who=investigator(s,q),name=city&&(s.cityDisplayNames?.[city.cityId]??city.name);
 switch(c.op){
  case 'FOOD':{
   if(!city)return null;
   const capacity=cityEconomyRates(s,city).capacity,amount=Math.max(0,Math.min((p.stock?.residentFood??city.population*2)*(c.turns??data.rules.foodTurns),capacity-city.foodStock));
   return {city,amount,line:`식량 +${amount}(${name} 창고)`};
  }
  case 'PRESTIGE':return {amount:c.value,line:`인망 +${c.value}`};
  case 'WANDERER_CONTACT':{
   const officer=liveWanderer(s,c.officerId);return city&&officer?{city,officer,line:`${officer.name} 접촉(${name} 주점)`}:null;
  }
  case 'RESEARCH':{
   const next=campaignResearchView(s,q.factionId).nextThreshold;
   if(!city||next===null)return null;
   const amount=Math.max(0,Math.min(city.lastSettlementScience??0,next-s.factions[q.factionId].science));
   return {amount,line:`연구 +${amount}(${name} 과학)`};
  }
  case 'APTITUDE':{
   if(!who)return null;
   const baseId=c.troop??troopToCampaign(who.o.troopType??parentTroop(who.a.troopType));
   if(!who.o.allowedTroops.some(t=>troopToCampaign(t)===baseId))return null;
   const stat=baseId==='BT02'?'leadership':'might',label=stat==='leadership'?'지휘':'무용';
   return who.o.baseStats[stat]<10000?{officer:who.o,stat,line:`${who.o.name} ${label} +1`}:null;
  }
  case 'REVEAL_PLACE':{
   const other=Object.values(s.exploration.places).find(x=>x.label!==p.label&&x.status!=='RESOLVED'&&!knownPlace(s,q.factionId,x));
   return other?{other,line:`${other.label} 1곳 마지막 확인`}:null;
  }
  default:return null;
 }
}
export function explorationChoices(s,fid){
 if(!explorationEnabled(s))return [];
 const pending=s.exploration.pending[fid];if(!pending||withdrawalProtection(s,pending.armyId))return [];
 const p=s.exploration.places[pending.placeId],q={...pending,factionId:fid};
 return (events.get(pending.eventId)?.choices??[]).flatMap(c=>{const e=effect(s,p,q,c);return e?[{choiceId:c.id,text:c.text,effectLine:e.line}]:[];});
}
function resolved(s,p,q,choiceId){
 p.status='RESOLVED';p.resolvedBy=q.factionId;p.choiceId=choiceId;
 delete s.exploration.pending[q.factionId];delete p.progressArmyId;delete p.investigator;
}
export function chooseExploration(s,command,fid=s.playerFactionId){
 if(!explorationEnabled(s))throw new Error('EXPLORATION_DISABLED');
 const pending=s.exploration.pending[fid];
 if(!pending||pending.placeId!==command.placeId)throw new Error('INVALID_EXPLORATION_PENDING');
 if(withdrawalProtection(s,pending.armyId))throw new Error('?? ?? ??? ??? ? ????.');
 const p=s.exploration.places[pending.placeId],q={...pending,factionId:fid};
 if(!explorationChoices(s,fid).length){resetPlace(s,p);return s;}
 const c=events.get(q.eventId)?.choices.find(c=>c.id===command.choiceId),e=c&&effect(s,p,q,c);
 if(!e)throw new Error('INVALID_EXPLORATION_CHOICE');
 switch(c.op){
  case 'FOOD':e.city.foodStock+=e.amount;break;
  case 'PRESTIGE':s.factions[fid].prestige+=e.amount;break;
  case 'WANDERER_CONTACT':e.officer.locationRef={kind:'CITY',id:e.city.cityId};break;
  case 'RESEARCH':s.factions[fid].science+=e.amount;settleCampaignResearch(s);break;
  case 'APTITUDE':
   e.officer.baseStats[e.stat]+=1;
   break;
  case 'REVEAL_PLACE':s.exploration.known[fid].push(e.other.label);if(s.knowledge[fid].tiles[e.other.tileId]!=='VISIBLE')s.knowledge[fid].tiles[e.other.tileId]='REMEMBERED';break;
 }
 resolved(s,p,q,c.id);
 if(fid===s.playerFactionId){s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:fid,text:`${s.officers[q.officerId]?.name??'조사 부대'} — 탐험: ${events.get(q.eventId).name} · ${c.text}`});s.administrationLog=s.administrationLog.slice(-120);}
 return s;
}
export function resolveAiExploration(s,fid){
 const q=s.exploration?.pending[fid];if(!q)return s;if(withdrawalProtection(s,q.armyId)){resetPlace(s,s.exploration.places[q.placeId]);return s;}
 return chooseExploration(s,{placeId:q.placeId,choiceId:explorationChoices(s,fid)[0]?.choiceId},fid);
}
// Called after the turn increments and the economy settles, before action flags reset.
export function settleExploration(s,{autoPlayer=false}={}){
 if(!explorationEnabled(s))return s;rememberExploration(s);
 const finishedTurn=s.turn-1;
 for(const [fid,q] of Object.entries(s.exploration.pending)){
  const p=s.exploration.places[q.placeId];
  if(!s.factions[fid]?.alive||!explorationChoices(s,fid).length){resetPlace(s,p);continue;}
  if(fid!==s.playerFactionId||autoPlayer||s.turn-q.turn>=data.rules.pendingTurns)resolveAiExploration(s,fid);
 }
 const fought=new Set(s.attackedArmyIds??[]);
 for(const log of s.combatLog??[])if(log.turn===finishedTurn){
  if(log.attackerId)fought.add(log.attackerId);
  if(log.targetId&&s.armies[log.targetId]?.factionId!==s.armies[log.attackerId]?.factionId)fought.add(log.targetId);
  for(const u of log.units??[])if(u.casualties>0)fought.add(u.unitId);
  for(const hit of log.hits??[]){fought.add(hit.sourceId);fought.add(hit.targetId);}
 }
 for(const p of Object.values(s.exploration.places)){
  if(['RESOLVED','PENDING'].includes(p.status))continue;
  const a=Object.values(s.armies).find(a=>a.tileId===p.tileId&&deployed(s,a)&&a.bornTurn!==finishedTurn&&s.factions[a.factionId]?.alive);
  if(!a||withdrawalProtection({...s,turn:finishedTurn},a.armyId)||fought.has(a.armyId)){resetPlace(s,p);continue;}
  // A replacement starts its own complete one-turn investigation; no inherited progress.
  p.progressArmyId=a.armyId;p.investigator=a.commanderId;p.status='INVESTIGATING';
  if(contested(s,p,a.factionId)||s.exploration.pending[a.factionId])continue;
  const q={placeId:p.label,eventId:p.eventId,turn:s.turn,armyId:a.armyId,officerId:a.commanderId};
  if(!s.exploration.known[a.factionId].includes(p.label))s.exploration.known[a.factionId].push(p.label);
  if(!p.eventId){resolved(s,p,{...q,factionId:a.factionId},null);if(a.factionId===s.playerFactionId){s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:a.factionId,text:`${s.officers[a.commanderId].name} — 탐험: ${p.label} · 아무것도 없음`});}continue;}
  const city=nearestCity(s,p,a.factionId);p.stock={residentFood:city?.population*2||0};
  p.status='PENDING';s.exploration.pending[a.factionId]=q;
  if(!explorationChoices(s,a.factionId).length){resetPlace(s,p);continue;}
  if(a.factionId!==s.playerFactionId||autoPlayer)resolveAiExploration(s,a.factionId);
 }
 return s;
}
export function explorationView(s,fid=s.playerFactionId){
 const q=s.exploration.pending[fid],choices=explorationChoices(s,fid),event=q&&events.get(q.eventId);
 return {places:campaignMapData(s.mapId).places.map(spec=>{
  const p=s.exploration.places[spec.label],known=knownPlace(s,fid,p),own=q?.placeId===p.label||p.resolvedBy===fid||s.armies[p.progressArmyId]?.factionId===fid;
  // Static atlas labels/positions are public. Never reveal another faction's hidden resolution.
  const observed=s.knowledge[fid]?.tiles[p.tileId]==='VISIBLE';
  const status=!known?'UNKNOWN':p.status==='RESOLVED'&&(own||observed)?'RESOLVED':own?p.status:'KNOWN';
  return {placeId:p.label,label:p.label,note:spec.note??'',tileId:p.tileId,status,...(known&&own&&p.eventId?{eventName:events.get(p.eventId).name}:{}),...(status==='RESOLVED'?{resolvedByMe:p.resolvedBy===fid}:{})};
 }),pending:event?{placeId:q.placeId,eventId:q.eventId,name:event.name,scene:event.scene,officerId:q.officerId,officerName:s.officers[q.officerId]?.name??'조사 부대',turnsLeft:Math.max(0,data.rules.pendingTurns-(s.turn-q.turn)),choices}:null};
}
export function validateExploration(s){
 if(!explorationEnabled(s))return;
 const e=s.exploration,fail=()=>{throw new Error('INVALID_CAMPAIGN_EXPLORATION');},obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!obj(e)||!obj(e.places)||!obj(e.pending)||!obj(e.known))fail();
 const specs=campaignMapData(s.mapId).places;
 if(Object.keys(e.places).length!==specs.length)fail();
 for(const city of Object.values(s.cities))if(city.lastSettlementScience!==undefined&&(!Number.isSafeInteger(city.lastSettlementScience)||city.lastSettlementScience<0))fail();
 for(const spec of specs){
  const p=e.places[spec.label];
  if(!p||p.label!==spec.label||p.tileId!==spec.at.join(',')||!(p.eventId===null||(data.placeEvents[p.label]??[]).includes(p.eventId))||!['KNOWN','INVESTIGATING','PENDING','RESOLVED'].includes(p.status))fail();
  if(p.stock!==undefined&&(!obj(p.stock)||!Number.isSafeInteger(p.stock.residentFood)||p.stock.residentFood<0))fail();
  if(p.progressArmyId&&!s.armies[p.progressArmyId]||p.investigator&&!s.officers[p.investigator])fail();
  if(p.status==='RESOLVED'&&(!s.factions[p.resolvedBy]||!(p.choiceId===null&&p.eventId===null||events.get(p.eventId)?.choices.some(c=>c.id===p.choiceId))))fail();
  if(p.status!=='RESOLVED'&&(p.resolvedBy!==undefined||p.choiceId!==undefined)||p.status==='RESOLVED'&&(p.progressArmyId!==undefined||p.investigator!==undefined))fail();
  if(['INVESTIGATING','PENDING'].includes(p.status)&&(!p.progressArmyId||!p.investigator))fail();
  if(p.status==='PENDING'&&Object.values(e.pending).filter(q=>q.placeId===p.label).length!==1)fail();
 }
 for(const fid of Object.keys(s.factions))if(!Array.isArray(e.known[fid])||new Set(e.known[fid]).size!==e.known[fid].length||e.known[fid].some(id=>!e.places[id]))fail();
 if(Object.keys(e.known).some(fid=>!s.factions[fid]))fail();
 for(const [fid,q] of Object.entries(e.pending))if(!s.factions[fid]||!obj(q)||e.places[q.placeId]?.status!=='PENDING'||q.eventId!==e.places[q.placeId].eventId||!events.has(q.eventId)||!Number.isSafeInteger(q.turn)||q.turn<1||q.turn>s.turn||!s.armies[q.armyId]||!s.officers[q.officerId]||e.places[q.placeId].progressArmyId!==q.armyId||e.places[q.placeId].investigator!==q.officerId)fail();
}
export function explorationMetrics(s){
 const places=Object.values(s.exploration?.places??{}).filter(p=>p.status==='RESOLVED'),count=key=>places.reduce((out,p)=>{const id=p[key]??'NONE';out[id]=(out[id]??0)+1;return out;},{});
 return {total:places.length,byFaction:count('resolvedBy'),byEvent:count('eventId'),byChoice:places.reduce((out,p)=>{const id=`${p.eventId??'NONE'}.${p.choiceId??'NONE'}`;out[id]=(out[id]??0)+1;return out;},{})};
}
