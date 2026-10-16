import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';

// IDs and names are frozen when the card is offered. Never substitute a lost target.
export function officerEventTile(s,id){
 const o=s.officers[id]??s.wanderers?.[id];if(!o||o.lifeState!=='ALIVE'||o.captivityState!=='FREE')return null;
 if(o.locationRef?.kind==='CITY')return s.cities[o.locationRef.id]?.tileId??null;
 const a=s.armies[o.locationRef?.id];return a&&castleArmyActive(s,a)?a.tileId:null;
}
export function eventPairTogether(s,ids){const ts=ids.map(id=>officerEventTile(s,id));return ts.length===2&&ts.every(t=>s.tiles[t])&&hexDistance(s.tiles[ts[0]],s.tiles[ts[1]])<=1;}
export const eventTruce=(s,a,b)=>s.c43?.pairs[[a,b].sort().join('|')];
export const eventTruceActive=(s,a,b,t=s.turn)=>{const p=eventTruce(s,a,b);return p?.state==='TRUCE'&&p.until>=t;};
export function signCampaignOath(s,card,choice,p){
 const x=s.eventDeck;if(!choice.oath)return;
 x.oaths.push({id:`${card.id}.${p.turn}`,eventId:card.id,title:card.title,factionId:p.factionId,roles:structuredClone(p.roles),names:structuredClone(p.names),goal:structuredClone(choice.oath.goal),goalText:choice.oath.goalText,deadline:p.turn+choice.oath.deadline,signedTurn:s.turn,status:'ACTIVE',violated:false,lastCheckedTurn:s.turn,combatSequence:s.battleSequence??0,diplomacyIndex:s.c43?.history.length??0,captureIndex:x.captures.length,reward:structuredClone(choice.oath.reward),penalty:structuredClone(choice.oath.penalty)});
}
export function recordOathCapture(s,p){
 const x=s.eventDeck;if(!x)return;
 x.captures.push({cityId:p.capturedCityId,factionId:p.occupierFactionId,turn:s.turn});
 for(const o of x.oaths)if(o.status==='ACTIVE'&&o.goal.type==='HOLD_CITY'&&o.roles[o.goal.city]===p.capturedCityId&&p.occupierFactionId!==o.factionId)o.violated=true;
}
export function observeCampaignOaths(s){
 for(const o of s.eventDeck?.oaths??[]){if(o.status!=='ACTIVE')continue;const g=o.goal,r=o.roles;
  if(g.type==='HOLD_CITY'&&s.cities[r[g.city]]?.ownerFactionId!==o.factionId)o.violated=true;
  if(g.type==='TRUCE_KEEP'){
   if(s.turn<=o.deadline&&!eventTruceActive(s,o.factionId,r[g.faction]))o.violated=true;
   if((s.c43?.history??[]).slice(o.diplomacyIndex).some(e=>e.turn<=o.deadline&&[e.from,e.to].includes(o.factionId)&&[e.from,e.to].includes(r[g.faction])&&(['END','EXPIRE'].includes(e.type)||e.type==='ATTACK'&&e.from===o.factionId&&e.issuedAttack!==false)))o.violated=true;
  }
 }
}
export function settleCampaignOaths(s,applyEffects,{endedTurn=s.turn}={}){
 const x=s.eventDeck;if(!x)return s;observeCampaignOaths(s);
 for(const o of x.oaths){
  if(o.status!=='ACTIVE'||endedTurn<=o.signedTurn||endedTurn<=o.lastCheckedTurn)continue;
  const g=o.goal,r=o.roles;let achieved=false;
  if(g.type==='CAPTURE_CITY')achieved=x.captures.slice(o.captureIndex).some(e=>e.cityId===r[g.city]&&e.factionId===o.factionId&&e.turn<=o.deadline);
  if(g.type==='DEFEAT_ARMY')achieved=(s.combatLog??[]).some(e=>e.sequence>o.combatSequence&&e.turn<=o.deadline&&[e.attackerId,e.targetId].includes(r[g.army])&&(e.units??[]).some(u=>u.unitId!==r[g.army]&&s.armies[u.unitId]?.factionId&&s.armies[u.unitId].factionId!==o.factionId&&u.postBattleCount===0));
  if(g.type==='PAIR_TOGETHER'&&!eventPairTogether(s,g.officers.map(k=>r[k])))o.violated=true;
  if(g.type==='FOOD_AT_LEAST')achieved=endedTurn>=o.deadline&&s.cities[r[g.city]]?.ownerFactionId===o.factionId&&s.cities[r[g.city]].foodStock>=g.value;
  if(['HOLD_CITY','PAIR_TOGETHER','TRUCE_KEEP'].includes(g.type))achieved=endedTurn>=o.deadline&&!o.violated;
  o.lastCheckedTurn=endedTurn;
  if(achieved||endedTurn>=o.deadline){
   o.status=achieved?'SUCCESS':'FAILED';o.resolvedTurn=endedTurn;
   o.result=applyEffects(s,achieved?o.reward:o.penalty,o,`OATH.${o.id}.${o.status}`);
   if(o.result.missing.length)o.settlement='PENDING_TARGET_REVIEW';
   (s.administrationLog??=[]).push({turn:s.turn,factionId:o.factionId,text:`맹세 ${achieved?'성공':'실패'} — ${o.title}: ${o.result.text}`});
  }
 }
 return s;
}
export function campaignOathsView(s,fid){return (s.eventDeck?.oaths??[]).filter(o=>o.factionId===fid).map(o=>({...structuredClone(o),turnsLeft:o.status==='ACTIVE'?Math.max(0,o.deadline-Math.max(s.turn,o.signedTurn+1)+1):0,status:s.gameResult&&o.status==='ACTIVE'?'UNFINISHED':o.status}));}
