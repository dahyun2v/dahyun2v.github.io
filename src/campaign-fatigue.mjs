import {isSliceMap} from './map-primitives.mjs';
import data from '../../docs/design-data/fatigue-v0.2.json' with {type:'json'};

export const FATIGUE=data;
export const fatigueEnabled=s=>isSliceMap(s.mapId)&&s.c46Disabled!==true&&s.c46FatigueDisabled!==true;
export function initializeFatigue(s){
 if(isSliceMap(s.mapId))s.c46??={recent:[],processed:[],stats:{injuries:{},durations:[],deathBefore:0,deathSaved:0,blocked:0,deployed:{}}};
 return s;
}
// C224: a return on T blocks T and the next restTurns complete turns.
export function restAfterReturn(s,o){
 delete o.restPendingReturn;
 if(fatigueEnabled(s))o.restUntilTurn=Math.max(o.restUntilTurn??0,s.turn+data.rule.restTurns+1);
}
export function recordFatigueReturns(s,before){
 for(const o of Object.values(s.officers))if((before.officers[o.officerId]?.locationRef.kind==='ARMY'||o.restPendingReturn)&&o.locationRef.kind==='CITY'&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'){
  if(o.restPendingReturn||o.restUntilTurn===before.officers[o.officerId]?.restUntilTurn)restAfterReturn(s,o);
 }
 return s;
}
export function fatigueView(s,id){
 const o=s.officers[id],restTurns=fatigueEnabled(s)&&o?.locationRef.kind==='CITY'?Math.max(0,(o.restUntilTurn??0)-s.turn):0;
 return {musterBlocked:restTurns>0,restTurns};
}
export function fatigueReason(s,id){const f=fatigueView(s,id);return f.musterBlocked?`쉬는 중 · ${f.restTurns}차례 뒤 출진`:null;}
export function recordFatigueBlock(s,id){if(!fatigueReason(s,id))return;initializeFatigue(s);s.c46.blockedTurns??={};if(s.c46.blockedTurns[id]!==s.turn){s.c46.blockedTurns[id]=s.turn;s.c46.stats.blocked++;}}
// Only deployment distribution remains; no field/combat/garrison fatigue gain.
export function settleFatigue(s,turn=s.turn){
 if(!isSliceMap(s.mapId))return s;initializeFatigue(s);
 if(s.c46.fatigueTurn>=turn)return s;s.c46.fatigueTurn=turn;
 for(const a of Object.values(s.armies))if(a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE'))s.c46.stats.deployed[a.commanderId]=(s.c46.stats.deployed[a.commanderId]??0)+1;
 return s;
}
export function validateFatigue(s){
 if(!isSliceMap(s.mapId))return;
 // Legacy fatigue/fatigueCombat are inert and survive save round trips.
 for(const o of Object.values(s.officers))if(o.restUntilTurn!==undefined&&(!Number.isSafeInteger(o.restUntilTurn)||o.restUntilTurn<0))throw new Error('INVALID_CAMPAIGN_REST');
 for(const o of Object.values(s.officers))if(o.restPendingReturn!==undefined&&typeof o.restPendingReturn!=='boolean')throw new Error('INVALID_CAMPAIGN_REST');
}
