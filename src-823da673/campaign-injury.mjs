import {isSliceMap} from './map-primitives.mjs';
import {effectModifiers} from './campaign-effects.mjs';
import data from '../../docs/design-data/injury-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {createRng} from './rng.mjs';
import {gainRelation} from './campaign-relations.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {initializeFatigue,restAfterReturn,fatigueEnabled} from './campaign-fatigue.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {parentTroop} from './campaign-special-troops.mjs';
import {createCampaignTerminalStateFromWorld} from './campaign-terminal-world.mjs';
import {syncResearchCities} from './campaign-roster.mjs';

export const INJURY=data;
export const injuryEnabled=s=>isSliceMap(s.mapId)&&s.c46Disabled!==true;
export function initializeInjury(s){initializeFatigue(s);if(isSliceMap(s.mapId))for(const o of Object.values(s.officers))o.injury??=null;return s;}
function random(s,key){let seed=Number(s.campaignSeed)>>>0;for(const c of `injury:${key}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;return createRng(seed).next();}
export const injuryView=(s,id)=>s.officers[id]?.injury?{turnsLeft:Math.max(0,s.officers[id].injury.untilTurn-s.turn),cause:s.officers[id].injury.cause,cityId:s.officers[id].injury.cityId}:null;
export const injuryReason=(s,id)=>injuryEnabled(s)&&s.officers[id]?.injury?`중상 — ${Math.max(0,s.officers[id].injury.untilTurn-s.turn)}차례 요양`:null;
export function tryInjury(s,id,cause,key,tileId){
 if(!injuryEnabled(s))return false;initializeInjury(s);const token=`${cause}:${id}:${key}`;
 if(s.c46.processed.includes(token))return false;s.c46.processed.push(token);
 const o=s.officers[id];if(!o||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||random(s,token)>=Math.max(.01,Math.min(.99,data.triggers[cause].chance+(effectModifiers(s,Object.values(s.armies).find(a=>a.commanderId===id)?.armyId??id).INJURY_WEIGHT_MOD??0)/100)))return false;
 const turns=data.recovery.turns[0]+Math.floor(random(s,token+':duration')*(data.recovery.turns[1]-data.recovery.turns[0]+1));
 const origin=s.tiles[tileId]??s.tiles[s.cities[o.locationRef.id]?.tileId]??s.tiles[s.cities[s.factions[o.allegianceFactionId].capitalCityId].tileId];
 const city=Object.values(s.cities).filter(c=>c.ownerFactionId===o.allegianceFactionId).sort((a,b)=>hexDistance(origin,s.tiles[a.tileId])-hexDistance(origin,s.tiles[b.tileId])||a.cityId.localeCompare(b.cityId))[0]??s.cities[s.factions[o.allegianceFactionId].capitalCityId];
 if(o.injury){o.injury.untilTurn=Math.max(o.injury.untilTurn,s.turn+turns);return true;}
 o.injury={cause,sinceTurn:s.turn,untilTurn:s.turn+turns,cityId:city.cityId};
 s.c46.stats.injuries[cause]=(s.c46.stats.injuries[cause]??0)+1;s.c46.stats.durations.push(turns);
 record(s,o,'INJURED',`${o.name} — 중상을 입어 ${turns}차례 요양한다.`);syncResearchCities(s);return true;
}
function record(s,o,kind,line){s.c46.recent.push({officerId:o.officerId,officerName:o.name,kind,line,turn:s.turn});s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:o.allegianceFactionId,text:line});}
export function injuryDefeats(s,payloads){if(!injuryEnabled(s))return payloads;initializeInjury(s);s.c46.defeats??={};return payloads.map(p=>{
 const key=p.transactionId;if(s.c46.defeats[key])return structuredClone(s.c46.defeats[key]);
 const a=s.armies[p.defeatedArmyId];let result=p;
 if(p.commanderFate==='DEAD'){s.c46.stats.deathBefore++;if(tryInjury(s,a.commanderId,'deathCushion',key,a.tileId)){s.c46.stats.deathSaved++;result={...p,commanderFate:'ESCAPED',captorFactionId:null};}}
 else if(p.commanderFate==='ESCAPED')tryInjury(s,a.commanderId,'eliminated',key,a.tileId);
 // C224: terminal defeat first releases the commander to NONE; remember the
 // army origin until the later care/escape return actually reaches a city.
 if(result.commanderFate==='ESCAPED'&&s.officers[a.commanderId].locationRef.kind==='ARMY'&&fatigueEnabled(s))s.officers[a.commanderId].restPendingReturn=true;
 s.c46.defeats[key]=structuredClone(result);return result;
});}
function moveToCare(s,o){
 const injury=o.injury,c=s.cities[injury.cityId];
 const a=Object.values(s.armies).find(a=>a.commanderId===o.officerId&&a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE'));
 if(a){
  const replacement=Object.values(s.officers).filter(x=>x.officerId!==o.officerId&&x.allegianceFactionId===a.factionId&&x.lifeState==='ALIVE'&&x.captivityState==='FREE'&&!x.injury&&x.allowedTroops.includes(parentTroop(a.troopType))&&x.locationRef.kind==='CITY'&&!Object.values(s.cities).some(c=>c.governorId===x.officerId)&&!Object.values(s.armies).some(b=>b.commanderId===x.officerId&&b.troopCount>0)).sort((x,y)=>x.officerId.localeCompare(y.officerId))[0];
  if(replacement){a.commanderId=replacement.officerId;replacement.locationRef={kind:'ARMY',id:a.armyId};if(s.terminal){s.terminal.armiesById[a.armyId].commanderId=replacement.officerId;s.terminal.officersById[replacement.officerId].assignment=structuredClone(replacement.locationRef);}}
  else {
   s.terminal??=createCampaignTerminalStateFromWorld(s);
   const lotId=`CARE.${s.turn}.${a.armyId}`;s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:troopToCampaign(a.troopType),specialTroopId:null},originFormationId:null,count:a.troopCount});s.economy.lotFaction[lotId]=a.factionId;s.economy.recruitedReady[lotId]=true;s.economy.readyAt[lotId]=s.turn;c.reserveTroops+=a.troopCount;s.personnel.formations.find(f=>f.formationId===a.armyId).field=0;a.troopCount=0;a.hp=0;
   if(s.terminal){const recordId=`REC.C46.${s.globalTick}.${a.armyId}`;s.terminal.recordsById[recordId]={recordId,globalTick:s.globalTick,type:'ARMY_DISPOSITION',causeRecordIds:[],refs:{factionIds:[a.factionId],armyIds:[a.armyId],officerIds:[o.officerId],cityIds:[c.cityId],choiceIds:[],prisonerRecordIds:[]},details:{disposition:'DISBANDED'}};Object.assign(s.terminal.armiesById[a.armyId],{disposition:'DISBANDED',terminalAtTick:s.globalTick,terminalRecordId:recordId});}
   for(const b of Object.values(s.armies))b.engagedArmyIds=b.engagedArmyIds.filter(id=>id!==a.armyId);
  }
  a.currentOrder=null;a.movementState=null;delete s.moveOrders[a.armyId];s.orderQueue=s.orderQueue.filter(id=>id!==a.armyId);
 }
 // Governors retain their office/location; injury.cityId is their care location.
 const governor=Object.values(s.cities).find(c=>c.governorId===o.officerId);
 if((o.locationRef.kind==='ARMY'||o.restPendingReturn)&&(governor||c.ownerFactionId===o.allegianceFactionId))restAfterReturn(s,o);
 o.locationRef=governor||c.ownerFactionId===o.allegianceFactionId?{kind:'CITY',id:governor?.cityId??c.cityId}:{kind:'NONE',id:null};o.travelState='STATIONARY';
 if(s.terminal)s.terminal.officersById[o.officerId].assignment=governor?{kind:'CITY',id:governor.cityId}:{kind:'NONE',id:null};
}
export function settleInjury(s){
 if(!injuryEnabled(s))return s;initializeInjury(s);
 for(const o of Object.values(s.officers)){const x=o.injury;if(!x)continue;if(o.lifeState!=='ALIVE'||o.captivityState!=='FREE'){o.injury=null;continue;}
  if(s.turn>x.sinceTurn)moveToCare(s,o);
  if(s.turn<x.untilTurn)continue;
  const line=data.return.lines[Math.floor(random(s,`${o.officerId}:${x.sinceTurn}:return`)*data.return.lines.length)].replaceAll('{name}',o.name).replace(/이\(가\)/g,((o.name.charCodeAt(o.name.length-1)-0xac00)%28===0)?'가':'이');
  o.injury=null;gainRelation(s,s.factions[o.allegianceFactionId].rulerId,o.officerId,data.return.lordAffinity);creditCampaignGrowth(s,{eventId:`RETURN.${o.officerId}.${x.sinceTurn}`,officerId:o.officerId,kind:'RETURN',amount:data.return.xp,fixed:true});record(s,o,'RETURNED',line);
 }
 s.c46.recent=s.c46.recent.filter(r=>r.turn>=s.turn-1);syncResearchCities(s);syncCampaignAdministrativeTerminal(s);return s;
}
export function injuryRecent(s,fid){return {recent:(s.c46?.recent??[]).filter(r=>r.turn>=s.turn-1&&s.officers[r.officerId]?.allegianceFactionId===fid).map(r=>({...r}))};}
export function validateInjury(s){
 if(!isSliceMap(s.mapId))return;
 const fail=()=>{throw new Error('INVALID_CAMPAIGN_INJURY');},x=s.c46;
 for(const key of ['c46Disabled','c46FatigueDisabled'])if(s[key]!==undefined&&typeof s[key]!=='boolean')fail();
 if(!x||!Array.isArray(x.processed)||x.processed.some(k=>typeof k!=='string')||new Set(x.processed).size!==x.processed.length||!Array.isArray(x.recent)||!x.stats||!Array.isArray(x.stats.durations))fail();
 for(const key of ['deathBefore','deathSaved','blocked'])if(!Number.isSafeInteger(x.stats[key])||x.stats[key]<0)fail();
 if(x.stats.deathSaved>x.stats.deathBefore||x.stats.durations.some(n=>!Number.isSafeInteger(n)||n<data.recovery.turns[0]||n>data.recovery.turns[1]))fail();
 for(const [cause,count] of Object.entries(x.stats.injuries??{}))if(!data.triggers[cause]||!Number.isSafeInteger(count)||count<0)fail();
 for(const [id,count] of Object.entries(x.stats.deployed??{}))if(!s.officers[id]||!Number.isSafeInteger(count)||count<0)fail();
 for(const o of Object.values(s.officers)){const injury=o.injury;if(injury===null)continue;if(!injury||Object.keys(injury).sort().join(',')!=='cause,cityId,sinceTurn,untilTurn'||!data.triggers[injury.cause]||!Number.isSafeInteger(injury.sinceTurn)||injury.sinceTurn<1||injury.sinceTurn>s.turn||!Number.isSafeInteger(injury.untilTurn)||injury.untilTurn<=injury.sinceTurn||!s.cities[injury.cityId])fail();}
 for(const r of x.recent)if(!s.officers[r.officerId]||r.officerName!==s.officers[r.officerId].name||!['INJURED','RETURNED'].includes(r.kind)||typeof r.line!=='string'||!Number.isSafeInteger(r.turn)||r.turn<1||r.turn>s.turn)fail();
}
