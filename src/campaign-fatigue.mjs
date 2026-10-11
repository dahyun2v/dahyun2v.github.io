import data from '../../docs/design-data/fatigue-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';

export const FATIGUE=data;
export const fatigueEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c46Disabled!==true&&s.c46FatigueDisabled!==true;
export function initializeFatigue(s){if(['v2','v3'].includes(s.mapId)){s.c46??={recent:[],processed:[],stats:{injuries:{},durations:[],deathBefore:0,deathSaved:0,blocked:0,deployed:{}}};for(const o of Object.values(s.officers))o.fatigue??=0;}return s;}
export function fatigueView(s,id){const value=s.officers[id]?.fatigue??0,level=[...data.levels].reverse().find(l=>value>=l.min)??data.levels[0];return {value,level:level.id,levelName:level.name,musterBlocked:fatigueEnabled(s)&&value>=data.muster.blockAt,restTurns:Math.max(0,Math.ceil((value-data.muster.blockAt+1)/data.recovery.rest))};}
export function fatigueReason(s,id){const f=fatigueView(s,id);return f.musterBlocked?`피로 — ${f.restTurns}차례 쉬면 출진 가능`:null;}
export function recordFatigueBlock(s,id){if(!fatigueReason(s,id))return;initializeFatigue(s);s.c46.blockedTurns??={};if(s.c46.blockedTurns[id]!==s.turn){s.c46.blockedTurns[id]=s.turn;s.c46.stats.blocked++;}}
export function settleFatigue(s,turn=s.turn){
 if(!['v2','v3'].includes(s.mapId))return s;initializeFatigue(s);
 if(s.c46.fatigueTurn>=turn)return s;s.c46.fatigueTurn=turn;
 for(const o of Object.values(s.officers)){
  if(o.lifeState!=='ALIVE'||o.captivityState!=='FREE')continue;
  const a=Object.values(s.armies).find(a=>a.commanderId===o.officerId&&a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE'));
  let fights=(o.fatigueCombat?.turn===turn?o.fatigueCombat.count:0),delta=0;
  if(a){const near=Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=7);delta=(near?(fights?0:-data.recovery.garrison):data.gain.fieldTurn)+Math.min(data.gain.combatMaxPerTurn,fights)*data.gain.combat;s.c46.stats.deployed[o.officerId]=(s.c46.stats.deployed[o.officerId]??0)+1;}
  else if(o.injury||o.locationRef.kind==='CITY')delta=-data.recovery.rest+Math.min(data.gain.combatMaxPerTurn,fights)*data.gain.combat;
  if(fatigueEnabled(s))o.fatigue=Math.max(data.range[0],Math.min(data.range[1],o.fatigue+delta));
 }
 return s;
}
export function fatigueCombat(s,ids,log){
 if(!fatigueEnabled(s)||log?.kind==='COFFIN_BATTLE')return;
 const attacker=s.armies[ids[0]],target=s.armies[ids[1]];
 if(log?.kind==='TACTIC_EFFECT'&&(!target||target.factionId===attacker?.factionId)&&!(log.units??[]).some(u=>s.armies[u.unitId]?.factionId!==attacker?.factionId))return;
 initializeFatigue(s);
 for(const id of new Set([...ids,...(log?.units??[]).map(u=>u.unitId)])){
  const o=s.officers[s.armies[id]?.commanderId];if(!o)continue;
  if(o.fatigueCombat?.turn!==s.turn)o.fatigueCombat={turn:s.turn,count:0,events:[]};
  const key=log?`${log.kind}:${log.sequence}`:null;o.fatigueCombat.events??=[];
  if(key&&o.fatigueCombat.events.includes(key))continue;if(key)o.fatigueCombat.events.push(key);
  o.fatigueCombat.count=Math.min(data.gain.combatMaxPerTurn,o.fatigueCombat.count+(log?.counter?2:1));
 }
}
export function validateFatigue(s){if(!['v2','v3'].includes(s.mapId))return;for(const o of Object.values(s.officers)){if(!Number.isSafeInteger(o.fatigue)||o.fatigue<0||o.fatigue>100)throw new Error('INVALID_CAMPAIGN_FATIGUE');if(o.fatigueCombat&&(!Number.isSafeInteger(o.fatigueCombat.turn)||o.fatigueCombat.turn<1||o.fatigueCombat.turn>s.turn||!Number.isSafeInteger(o.fatigueCombat.count)||o.fatigueCombat.count<0||o.fatigueCombat.count>data.gain.combatMaxPerTurn))throw new Error('INVALID_CAMPAIGN_FATIGUE_COMBAT');}}
