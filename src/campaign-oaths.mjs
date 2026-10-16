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

// Shared objective reader for oaths and military orders. Freeze the opening
// facts; use existing capture, battle, diplomacy and production records.
const values=o=>Object.values(o??{});
const facilityKeys=s=>values(s.cities).flatMap(c=>(c.facilities??[]).map(f=>`${c.cityId}:${f.tileId}:${f.kind}`));
const ownOfficers=(s,fid)=>values(s.officers).filter(o=>o.allegianceFactionId===fid).map(o=>o.officerId);
export const goalFood=(s,fid)=>values(s.cities).filter(c=>c.ownerFactionId===fid).reduce((n,c)=>n+c.foodStock,0);
export function campaignGoalBaseline(s,fid){return {
 combatSequence:s.battleSequence??0,diplomacyIndex:s.c43?.history.length??0,captureIndex:s.eventDeck?.captures.length??0,achievementIndex:s.c44?.events.length??0,
 food:goalFood(s,fid),cityIds:values(s.cities).filter(c=>c.ownerFactionId===fid).map(c=>c.cityId),
 officers:ownOfficers(s,fid),facilities:facilityKeys(s),explored:values(s.exploration?.places).filter(p=>p.status==='RESOLVED').map(p=>p.label)
};}
export function campaignGoalProgress(s,o,{atEnd=false,endedTurn=s.turn}={}){
 const g=o.goal,b=o.baseline??o,fid=o.factionId;
 const inWindow=e=>e.turn>=o.signedTurn&&e.turn<=o.deadline;
 const captures=(s.eventDeck?.captures??[]).slice(b.captureIndex).filter(inWindow);
 const battles=(s.combatLog??[]).filter(e=>e.sequence>b.combatSequence&&inWindow(e));
 const mine=id=>s.armies[id]?.factionId===fid;
 const history=(s.c43?.history??[]).slice(b.diplomacyIndex).filter(inWindow);
 let count=0;
 switch(g.type){
 case 'CAPTURE_CITY':case 'CAPTURE_ANY':count=captures.filter(e=>e.factionId===fid&&(g.type!=='CAPTURE_CITY'||e.cityId===o.roles[g.city])).length;break;
 case 'DEFEAT_ARMY':case 'DEFEAT_ARMIES':count=new Set(battles.flatMap(e=>{
  if(g.type==='DEFEAT_ARMY'&&![e.attackerId,e.targetId].includes(o.roles[g.army]))return [];
  if(g.type!=='DEFEAT_ARMY'&&!mine(e.attackerId)&&!mine(e.targetId))return [];
  return (e.units??[]).filter(u=>s.armies[u.unitId]?.factionId&& !mine(u.unitId)&&(u.preBattleCount>0||g.type==='DEFEAT_ARMY')&&u.postBattleCount===0).map(u=>u.unitId);
 })).size;break;
 case 'HOLD_ALL':{const held=new Set(b.cityIds);for(const e of captures){if(e.factionId===fid)held.add(e.cityId);else if(held.has(e.cityId))o.violated=true;}if([...held].some(id=>s.cities[id]?.ownerFactionId!==fid))o.violated=true;count=o.violated?0:1;break;}
 case 'FOOD_TOTAL_GAIN':count=goalFood(s,fid)-b.food;break;
 case 'RECRUIT_ANY':o.recruited=[...new Set([...(o.recruited??[]),...ownOfficers(s,fid).filter(id=>!b.officers.includes(id))])];count=o.recruited.length;break;
 case 'BUILD':{
  // FACILITY records exclude barracks. Observe new facility identities as a
  // small supplement; pre-existing captured buildings never count as builds.
  const built=(s.c44?.events??[]).slice(b.achievementIndex).filter(e=>e.type==='FACILITY'&&e.factionId===fid&&inWindow({...e,turn:atEnd&&e.turn===s.turn?endedTurn:e.turn})).map(e=>`${e.cityId}:${e.id}`);
  const fresh=values(s.cities).filter(c=>c.ownerFactionId===fid).flatMap(c=>(c.facilities??[]).filter(f=>!b.facilities.includes(`${c.cityId}:${f.tileId}:${f.kind}`)&&!(s.c44?.events??[]).some(e=>e.type==='FACILITY'&&e.cityId===c.cityId&&e.id.endsWith(`.${f.tileId}`))).map(f=>`${c.cityId}:${f.tileId}:${f.kind}`));
  o.built=[...new Set([...(o.built??[]),...built,...fresh])];count=o.built.length;break;
 }
 case 'JOINT_ATTACK':{
  const groups=new Map();for(const e of battles){if(!mine(e.attackerId)||!['ATTACK','TACTIC','JOINT_TACTIC','CITY','TACTIC_EFFECT'].includes(e.kind)||e.attackOrder===false)continue;
   const target=e.cityId??e.targetId;if(!target||mine(target)||s.cities[target]?.ownerFactionId===fid&&e.kind!=='CITY')continue;
   const key=`${e.turn}:${target}`;if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(e.attackerId);
  }count=[...groups.values()].filter(ids=>ids.size>=2).length;break;
 }
 case 'TACTICS_USED':count=battles.filter(e=>mine(e.attackerId)&&(e.attackOrder!==false)&&['TACTIC','JOINT_TACTIC','TACTIC_EFFECT'].includes(e.kind)).length;break;
 case 'DIPLOMACY_AGREED':count=history.filter(e=>e.type==='EFFECTIVE'&&['TRUCE','ALLIANCE'].includes(e.kind)&&[e.from,e.to].includes(fid)).length;break;
 case 'EXPLORE_DONE':o.explored=[...new Set([...(o.explored??[]),...values(s.exploration?.places).filter(p=>p.status==='RESOLVED'&&p.resolvedBy===fid&&!b.explored.includes(p.label)).map(p=>p.label)])];count=o.explored.length;break;
 }
 const target=g.count??g.value??1,timed=['HOLD_ALL','FOOD_TOTAL_GAIN'].includes(g.type);
 return {count,target,violated:!!o.violated,achieved:!o.violated&&count>=target&&(!timed||atEnd&&endedTurn>=o.deadline)};
}
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
  if(['CAPTURE_CITY','DEFEAT_ARMY'].includes(g.type))achieved=campaignGoalProgress(s,o,{atEnd:true,endedTurn}).achieved;
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
