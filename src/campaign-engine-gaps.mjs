import trial from '../data/c214-trial-v0.1.json' with {type:'json'};
import deck from '../data/events-deck-v1.json' with {type:'json'};
import echo from '../data/events-echo-v0.1.json' with {type:'json'};
import ambitions from '../data/ambitions-v0.1.json' with {type:'json'};
import anchors from '../data/history-anchors-v0.1.json' with {type:'json'};
import {citySupplyRoute} from './campaign-supply.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {relation} from './campaign-relations.mjs';
import {inControlZone} from './campaign-morale.mjs';
import {edgeTicks} from './movement.mjs';
import {troopText} from './troop-display.mjs';
export const C214=Object.freeze(trial);
export const gapsEnabled=s=>s.mapId!=='v1'&&s.trialRules?.engineGaps!==false;
const log=(s,factionId,text)=>(s.administrationLog??=[]).push({turn:s.turn,factionId,source:'C214',text});
export function reserveTransferReason(s,{fromCityId,toCityId,count},fid=s.playerFactionId,routeWorld=s){
 const from=s.cities[fromCityId],to=s.cities[toCityId];
 if(!gapsEnabled(s)||!from||from===to||from.ownerFactionId!==fid||to?.ownerFactionId!==fid)return '내 성 두 곳을 고르십시오.';
 if(!Number.isSafeInteger(count)||count<C214.reserveUnit||count%C214.reserveUnit)return '예비병은 1,000명 단위로 옮깁니다.';
 if(from.besieged)return '포위된 성에서는 보낼 수 없습니다.';
 if(!citySupplyRoute(routeWorld,from,to))return '안전한 보급선이 이어져야 합니다.';
 const lots=s.personnel.lots.filter(l=>l.nodeId===fromCityId&&l.kind==='READY'&&!l.identity.specialTroopId);
 if(count>from.reserveTroops||count>lots.reduce((n,l)=>n+l.count,0))return '옮길 예비병이 부족합니다.';
 return null;
}
export function transferReserves(s,command,fid=s.playerFactionId,routeWorld=s){
 const reason=reserveTransferReason(s,command,fid,routeWorld);if(reason)throw new Error(reason);
 const {fromCityId,toCityId,count}=command,route=citySupplyRoute(routeWorld,s.cities[fromCityId],s.cities[toCityId]);
 s.reserveTransfers??=[];const id=`RESERVE.${s.turn}.${s.reserveTransfers.length}`,nodeId=id,lots=[];let left=count;
 for(const lot of [...s.personnel.lots])if(left&&lot.nodeId===fromCityId&&lot.kind==='READY'&&!lot.identity.specialTroopId){
  const n=Math.min(left,lot.count),lotId=`${id}.${lots.length}`;lot.count-=n;left-=n;
  s.personnel.lots.push({...structuredClone(lot),lotId,nodeId,count:n});lots.push(lotId);
  s.economy.lotFaction[lotId]=fid;s.economy.recruitedReady[lotId]=true;s.economy.readyAt[lotId]=s.turn;
 }
 s.cities[fromCityId].reserveTroops-=count;
 s.reserveTransfers.push({id,factionId:fid,fromCityId,toCityId,count,lots,departureTurn:s.turn,arrivalTurn:s.turn+C214.transferTurns[route.length-1<=C214.transferOneTurnDistance?0:1],state:'MOVING'});
 log(s,fid,`예비병 ${troopText(count)}명 이동 중 — ${fromCityId} → ${toCityId}`);return s;
}
export function settleReserveTransfers(s){
 for(const t of s.reserveTransfers??[]){if(t.state==='ARRIVED'||s.turn<t.arrivalTurn)continue;
  const from=s.cities[t.fromCityId],to=s.cities[t.toCityId];
  if(to?.ownerFactionId!==t.factionId){if(from?.ownerFactionId===t.factionId){t.toCityId=t.fromCityId;t.arrivalTurn=s.turn+C214.transferTurns[0];}t.state='BLOCKED';continue;}
  if(to.besieged||from?.ownerFactionId===t.factionId&&from!==to&&!citySupplyRoute(s,from,to)){t.state='BLOCKED';continue;}
  for(const id of t.lots)s.personnel.lots.find(l=>l.lotId===id).nodeId=t.toCityId;
  to.reserveTroops+=t.count;t.state='ARRIVED';t.arrivedTurn=s.turn;log(s,t.factionId,`예비병 ${troopText(t.count)}명 ${t.toCityId} 도착`);
 }
}
export function aiTransferReserves(s,fid,v,routeWorld=s){
 if(!gapsEnabled(s))return;
 const cities=Object.values(v.ownCities).map(c=>s.cities[c.cityId]).sort((a,b)=>a.cityId.localeCompare(b.cityId));
 const enemies=Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE');
 for(const to of cities){if(to.reserveTroops>=C214.emptyFrontReserve||!(enemies.some(a=>hexDistance(s.tiles[a.tileId],s.tiles[to.tileId])<=C214.transferOneTurnDistance)||Object.values(v.knowledge.cities).some(c=>c.ownerFactionId&&c.ownerFactionId!==fid&&hexDistance(s.tiles[c.tileId],s.tiles[to.tileId])<=C214.transferOneTurnDistance)))continue;
  if(s.reserveTransfers?.some(t=>t.toCityId===to.cityId&&t.state!=='ARRIVED'))continue;
  for(const from of [...cities].sort((a,b)=>b.reserveTroops-a.reserveTroops||a.cityId.localeCompare(b.cityId))){const count=Math.floor(Math.min(C214.emptyFrontReserve,from.reserveTroops-C214.emptyFrontReserve)/C214.reserveUnit)*C214.reserveUnit,cmd={fromCityId:from.cityId,toCityId:to.cityId,count};if(!reserveTransferReason(s,cmd,fid,routeWorld)){transferReserves(s,cmd,fid,routeWorld);break;}}
 }
}
export function swapReason(s,{armyId,otherArmyId},fid=s.playerFactionId){
 const a=s.armies[armyId],b=s.armies[otherArmyId];
 if(!gapsEnabled(s)||!a||!b||a===b||[a,b].some(a=>a.factionId!==fid||!castleArmyActive(s,a)))return '아군 두 부대를 고르십시오.';
 if(hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])!==1)return '서로 붙어 있어야 합니다.';
 if([a,b].some(a=>s.movedArmyIds.includes(a.armyId)||s.endedArmyIds.includes(a.armyId)||a.currentOrder||a.movementState))return '이동을 남긴 부대만 자리를 바꿀 수 있습니다.';
 if([a,b].some(a=>inControlZone(s,a)||a.engagedArmyIds?.length))return '통제 구역 또는 교전 중에는 자리를 바꿀 수 없습니다.';
 if(edgeTicks(s,a,a.tileId,b.tileId)===null||edgeTicks(s,b,b.tileId,a.tileId)===null||[a,b].some(a=>a.troopType==='catapult'&&a.platformState==='DEPLOYED'))return '이동할 수 없는 자리입니다.';
 return null;
}
export function swapArmies(s,cmd){const reason=swapReason(s,cmd);if(reason)throw new Error(reason);const a=s.armies[cmd.armyId],b=s.armies[cmd.otherArmyId];[a.tileId,b.tileId]=[b.tileId,a.tileId];for(const x of [a,b]){s.movedArmyIds.push(x.armyId);x.movedTiles++;x.braced=false;x.currentOrder=null;delete s.moveOrders?.[x.armyId];}return s;}
export function recordEventHistory(s,p,choice,result,key){
 if(!gapsEnabled(s))return;s.characterHistory??={};
 for(const id of new Set(Object.values(p.roles??{}).map(id=>s.armies[id]?.commanderId??id))){if(!s.officers[id]&&!s.wanderers?.[id])continue;const rows=s.characterHistory[id]??=[];if(rows.some(r=>r.key===key))continue;rows.push({key,turn:s.turn,eventId:p.eventId,title:p.title,choice,result,text:`${p.title} — ${choice}: ${result}`,factionId:p.factionId});}
}
export function historyResult(s,ranking){
 const history={twisted:[],kept:[]};
 for(const a of anchors.list){const t=a.test,o=s.officers[t.officer],dead=o?.lifeState==='DEAD';let kept=false;
  switch(t.type){case 'CITY_OWNER_AT_END':kept=s.cities[t.city]?.ownerFactionId===t.faction;break;case 'FACTION_RANK_FIRST':kept=ranking[0]?.factionId===t.faction;break;case 'OFFICER_DEAD_AT_END':kept=dead;break;case 'OFFICER_DEAD_OR_ABSENT_AT_END':kept=dead||!o?.allegianceFactionId;break;case 'OFFICER_SERVES_AT_END':kept=!!o&&!dead&&o.allegianceFactionId===t.faction;break;case 'PAIR_NOT_BOUND_AT_END':kept=relation(s,...t.officers).tier!=='BOUND';break;case 'NOT_ALLIED_AT_END':kept=s.c43?.pairs[[...t.factions].sort().join('|')]?.state!=='ALLIANCE';break;default:throw new Error(`UNKNOWN_HISTORY_ANCHOR:${t.type}`);}
  history[kept?'kept':'twisted'].push({id:a.id,history:a.history,twisted:a.twisted});
 }return history;
}
export function finishHistory(s,ranking){if(!gapsEnabled(s)||!s.gameResult||s.gameResult.history)return;const history=historyResult(s,ranking);s.gameResult.history=history;s.historyScore={label:`비틀린 역사 ${history.twisted.length} × ${C214.historyPoints}`,count:history.twisted.length,points:history.twisted.length*C214.historyPoints};s.historyChronicle=history.twisted.map(a=>`역사에선 ${a.history} / 이번엔 ${a.twisted}`);}
export function gapsView(s,fid){if(s.mapId==='v1')return {};return {reserveTransfers:structuredClone((s.reserveTransfers??[]).filter(t=>t.factionId===fid)),characterHistory:structuredClone(Object.fromEntries(Object.entries(s.characterHistory??{}).map(([id,rows])=>[id,rows.filter(r=>r.factionId===fid)]).filter(([,rows])=>rows.length))),...(s.gameResult?{historyScore:structuredClone(s.historyScore),historyChronicle:structuredClone(s.historyChronicle)}:{})};}
export function seededPool(ids,seed,protectedIds=[]){
 const protectedSet=new Set(protectedIds),rank=id=>{let n=Number(seed)>>>0;for(const c of `c214-pool:${id}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
 const optional=ids.filter(id=>!protectedSet.has(id)).sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b));
 return new Set([...ids.filter(id=>protectedSet.has(id)),...optional.slice(0,Math.max(C214.poolMinimum-ids.filter(id=>protectedSet.has(id)).length,Math.ceil(optional.length*C214.poolKeepFraction)))]);
}

export const requiredPoolIds=()=>[...new Set(JSON.stringify([deck,echo,ambitions]).match(/G[0-9]{2,3}/g)??[])];
export function varyWanderers(s,companions=[]){
 if(!gapsEnabled(s)||s.mapId!=='v3')return;const ids=Object.keys(s.wanderers??{}),keep=seededPool(ids,s.campaignSeed,[...requiredPoolIds(),...companions]);
 s.fatePool={available:ids.filter(id=>keep.has(id)),omitted:ids.filter(id=>!keep.has(id))};
 // This is creation-only. Old saves retain their complete existing roster.
 for(const id of s.fatePool.omitted){delete s.wanderers[id];delete s.campaignGrowth.officers[id];}
}
export const reservesInTransit=(s,fid)=>(s.reserveTransfers??[]).filter(t=>t.factionId===fid&&t.state!=='ARRIVED').reduce((n,t)=>n+t.count,0);
export function validateEngineGaps(s){
 const fail=()=>{throw new Error('INVALID_C214_LEDGER');};
 if(s.reserveTransfers!==undefined){
  if(!Array.isArray(s.reserveTransfers)||new Set(s.reserveTransfers.map(t=>t.id)).size!==s.reserveTransfers.length)fail();
  for(const t of s.reserveTransfers){if(!s.factions[t.factionId]||!s.cities[t.fromCityId]||!s.cities[t.toCityId]||!Number.isSafeInteger(t.count)||t.count<C214.reserveUnit||t.count%C214.reserveUnit||!['MOVING','BLOCKED','ARRIVED'].includes(t.state)||!Number.isSafeInteger(t.departureTurn)||t.departureTurn<1||t.departureTurn>s.turn||!Number.isSafeInteger(t.arrivalTurn)||t.arrivalTurn<=t.departureTurn||!Array.isArray(t.lots)||new Set(t.lots).size!==t.lots.length)fail();
   const lots=t.lots.map(id=>s.personnel.lots.find(l=>l.lotId===id));
   if(lots.some(l=>!l||l.kind!=='READY'||l.identity.specialTroopId)||t.state!=='ARRIVED'&&(lots.some(l=>l.nodeId!==t.id)||lots.reduce((n,l)=>n+l.count,0)!==t.count))fail();
  }
 }
 if(s.characterHistory!==undefined){if(!s.characterHistory||Array.isArray(s.characterHistory))fail();for(const rows of Object.values(s.characterHistory)){if(!Array.isArray(rows)||new Set(rows.map(r=>r.key)).size!==rows.length||rows.some(r=>!s.factions[r.factionId]||!Number.isSafeInteger(r.turn)||r.turn<1||r.turn>s.turn||['key','eventId','title','choice','result','text'].some(k=>typeof r[k]!=='string')))fail();}}
 if(s.enemyPlans!==undefined){if(!Number.isSafeInteger(s.enemyPlans.turn)||s.enemyPlans.turn>s.turn||!Array.isArray(s.enemyPlans.entries)||s.enemyPlans.entries.some(e=>!s.armies[e.armyId]||!s.factions[e.factionId]||!e.candidate||e.candidate.armyId!==e.armyId||!['ATTACK','CITY','TACTIC'].includes(e.action?.type)||!s.armies[e.action.targetId]&&!s.cities[e.action.targetId]))fail();}
}
