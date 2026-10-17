import data from '../../docs/design-data/achievements-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {createRng} from './rng.mjs';
import {C19,settleCampaignResearch} from './campaign-roster.mjs';
import {domesticResearchThreshold} from './campaign-rule-registry.mjs';

export const ACHIEVEMENTS=data;
export const achievementsEnabled=s=>['v2','v3'].includes(s.mapId)&&s.trialRules?.achievements!==false;
const values=o=>Object.values(o??{});
const cities=(s,fid)=>values(s.cities).filter(c=>c.ownerFactionId===fid);
const cityName=(s,c)=>s.cityDisplayNames?.[c.cityId]??c.name??c.cityId;
const hostile=(s,a,b)=>!!a&&!!b&&a!==b&&(s.c43?.pairs?.[[a,b].sort().join('|')]?.state??'WAR')==='WAR';
const live=a=>a&&a.troopCount>0&&a.hp>0&&a.morale!=='ROUTING';
const footprint=c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])];
const normal=(s,c)=>(s.occupations?.[c.cityId]?.state??c.occupationState??'NORMAL')==='NORMAL';
export function initializeAchievements(s){
 if(!achievementsEnabled(s))return s;
 s.c44??={version:1,earned:{},queue:[],chosen:[],events:[],cityRewards:{},lastSettledTurn:null};
 for(const [key,fallback] of Object.entries({earned:{},queue:[],chosen:[],events:[],cityRewards:{},lastSettledTurn:null}))s.c44[key]??=fallback;
 return s;
}
export function recordAchievementEvent(s,event){
 if(!achievementsEnabled(s))return;
 initializeAchievements(s);
 if(!s.c44.events.some(e=>e.id===event.id))s.c44.events.push({turn:s.turn,...structuredClone(event)});
}
// Record combat positions at commitment; later movement cannot rewrite a defense.
export function recordAchievementCombat(s,before,log){
 const attacker=before.armies?.[log.attackerId];if(!attacker)return;
 for(const c of values(before.cities)){
  if(!hostile(before,attacker.factionId,c.ownerFactionId))continue;
  const damaged=log.cityId===c.cityId&&log.dealt>0||(log.units??[]).some(u=>u.casualties>0&&before.armies[u.unitId]?.factionId===c.ownerFactionId&&footprint(c).includes(before.armies[u.unitId]?.tileId));
  if(damaged)recordAchievementEvent(s,{id:`DEFENSE.${log.sequence}.${c.cityId}`,type:'DEFENSE',factionId:c.ownerFactionId,cityId:c.cityId,enemyId:attacker.armyId,enemyFactionId:attacker.factionId,turn:log.turn});
 }
}
// Pure: reads durable facts/records and returns unclaimed accomplishments.
export function evaluateAchievements(s,fid){
 if(!achievementsEnabled(s))return [];
 const out=[],events=s.c44?.events??[],add=(achievementId,source)=>{if(!s.c44?.earned?.[`${fid}:${achievementId}`]&&!out.some(e=>e.achievementId===achievementId))out.push({achievementId,factionId:fid,turn:source.turn??s.turn,officerId:source.officerId??s.factions[fid]?.rulerId,sourceId:source.id??achievementId});};
 const explored=values(s.exploration?.places).find(p=>p.status==='RESOLVED'&&p.resolvedBy===fid&&p.choiceId);if(explored)add('A01',{id:explored.label});
 const built=events.find(e=>e.type==='FACILITY'&&e.factionId===fid);if(built)add('A02',built);
 const joined=values(s.captiveRecruitment?.proposals).find(p=>p.factionId===fid&&['JOINING','ACTIVE','ARRIVED_PENDING_ACTIVATION','ROSTER_TRANSFER_PENDING'].includes(p.status)&&s.officers?.[p.targetOfficerId]?.allegianceFactionId===fid);
 if(joined)add('A03',{id:joined.proposalId,turn:joined.createdTurn,officerId:joined.targetOfficerId});
 const recruited=values(s.terminal?.recordsById).find(r=>r.type==='PRISONER_LEDGER'&&r.details?.disposition==='RECRUITED'&&(r.refs?.prisonerRecordIds??[]).some(id=>s.terminal.prisonersById?.[id]?.captorFactionId===fid));if(recruited)add('A03',{id:recruited.recordId});
 const captured=events.find(e=>e.type==='HOSTILE_CAPTURE'&&e.factionId===fid&&s.cities[e.cityId]?.ownerFactionId===fid&&normal(s,s.cities[e.cityId]));if(captured)add('A04',captured);
 if((s.factions?.[fid]?.research?.stage??0)>=1)add('A05',{turn:s.factions[fid].research.reachedTurns?.[0]});
 const defended=events.find(e=>{
  if(e.type!=='DEFENSE'||e.factionId!==fid||e.turn!==s.turn-1)return false;
  const c=s.cities[e.cityId],a=s.armies[e.enemyId];if(!c||c.ownerFactionId!==fid)return false;
  return !live(a)||!footprint(c).some(t=>s.tiles[t]&&s.tiles[a.tileId]&&hexDistance(s.tiles[t],s.tiles[a.tileId])<=1);
 });if(defended)add('A06',defended);
 return out.sort((a,b)=>a.turn-b.turn||a.achievementId.localeCompare(b.achievementId));
}
const known=(s,fid,p)=>(s.exploration?.known?.[fid]??[]).includes(p.label)||['VISIBLE','REMEMBERED'].includes(s.knowledge?.[fid]?.tiles?.[p.tileId]);
function cardTargets(s,fid,card,achievement){
 const owned=cities(s,fid),asCity=list=>list.map(c=>({id:c.cityId,name:cityName(s,c)}));
 switch(card.op){
 case 'CITY_FOOD':return asCity(owned.filter(c=>c.foodStock<(c.foodCapacity??80)));
 case 'RESEARCH':return asCity(owned.filter(c=>(c.lastSettlementScience??0)>0&&(s.factions[fid].research?.stage??0)<3));
 case 'CITY_BUILD_BONUS':case 'CITY_FOOD_BONUS':return asCity(owned.filter(c=>!s.c44?.cityRewards?.[c.cityId]?.includes(card.id)));
 // 10-15 removed aptitude. Do not silently replace it with another reward.
 case 'APTITUDE':return [];
 case 'REVEAL_PLACE':return values(s.exploration?.places).filter(p=>p.status!=='RESOLVED'&&!known(s,fid,p)).map(p=>({id:p.label,name:p.label}));
 case 'WANDERER_CLUE':return values(s.wanderers).filter(o=>!s.c44?.clues?.[fid]?.[o.officerId]&&o.locationRef?.kind==='CITY'&&s.cities[o.locationRef.id]).map(o=>({id:o.officerId,name:o.name}));
 case 'PRESTIGE':return [{id:fid,name:s.factions[fid]?.name??fid}];
 default:return [];
 }
}
function offeredCards(s,earned){
 const def=data.achievements.find(a=>a.id===earned.achievementId),fid=earned.factionId;
 let seed=s.campaignSeed>>>0;for(const c of `${fid}:${def.id}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const rng=createRng(seed),out=[],rest=[];
 for(const category of ['boost','special','open']){
  const valid=def[category].map(id=>data.cards.find(c=>c.id===id)).filter(c=>!c.disabled&&cardTargets(s,fid,c,earned).length).map(c=>({...c,cardId:c.id,category,effectLine:c.text}));
  if(valid.length)out.push(valid.splice(Math.floor(rng.next()*valid.length),1)[0]);rest.push(...valid);
 }
 while(out.length<3&&rest.length)out.push(rest.splice(Math.floor(rng.next()*rest.length),1)[0]);
 return out;
}
export function campaignAchievementsView(s,fid=s.playerFactionId){
 const queue=(s.c44?.queue??[]).filter(e=>e.factionId===fid),head=queue[0];
 const clues=structuredClone(s.c44?.clues?.[fid]??{});
 if(!head)return {earned:structuredClone(values(s.c44?.earned).filter(e=>e.factionId===fid)),pending:null,clues};
 const cards=head.cards.map(c=>({...c,targets:cardTargets(s,fid,c,head)})).filter(c=>c.targets.length).map(c=>{if(c.target)return c;const copy={...c};delete copy.targets;return copy;});
 return {earned:structuredClone(values(s.c44?.earned).filter(e=>e.factionId===fid)),clues,pending:{achievementId:head.achievementId,name:data.achievements.find(a=>a.id===head.achievementId).name,turnsLeft:Math.max(0,data.rules.pendingTurns-(s.turn-head.offeredTurn)),queued:queue.length-1,cards:structuredClone(cards)}};
}
export function chooseAchievement(s,command,fid=s.playerFactionId){
 initializeAchievements(s);
 const entry=s.c44.queue.find(e=>e.factionId===fid),card=entry?.cards.find(c=>c.cardId===command.cardId);
 if(!entry||entry.achievementId!==command.achievementId||!card)throw new Error('INVALID_ACHIEVEMENT_CHOICE');
 const targets=cardTargets(s,fid,card,entry),id=command.cityId??command.officerId??targets[0]?.id;
 if(!targets.some(t=>t.id===id)||card.target&&targets.length>1&&!command.cityId&&!command.officerId)throw new Error('INVALID_ACHIEVEMENT_TARGET');
 const c=s.cities?.[id],f=s.factions[fid];
 switch(card.op){
 case 'PRESTIGE':f.prestige+=card.value;break;
 case 'CITY_FOOD':c.foodStock=Math.min(c.foodCapacity??80,c.foodStock+c.population*2*card.turns);break;
 case 'RESEARCH':{
  // C19's cumulative science thresholds; cap at the current stage boundary.
  const threshold=domesticResearchThreshold(s,fid,C19.thresholds[f.research?.stage??0]);f.science=Math.max(f.science,Math.min(threshold,f.science+(c.lastSettlementScience??0)));settleCampaignResearch(s);break;
 }
 case 'CITY_BUILD_BONUS':case 'CITY_FOOD_BONUS':(s.c44.cityRewards[c.cityId]??=[]).push(card.id);break;
 case 'REVEAL_PLACE':{
  const p=s.exploration.places[id];(s.exploration.known[fid]??=[]).push(id);if(s.knowledge[fid].tiles[p.tileId]!=='VISIBLE')s.knowledge[fid].tiles[p.tileId]='REMEMBERED';break;
 }
 case 'WANDERER_CLUE':{
  const o=s.wanderers[id];s.c44.clues??={};(s.c44.clues[fid]??={})[id]={officerId:id,cityId:o.locationRef.id,turn:s.turn};break;
 }
 default:throw new Error('UNSUPPORTED_ACHIEVEMENT_REWARD');
 }
 s.c44.chosen.push({factionId:fid,achievementId:entry.achievementId,cardId:card.cardId,targetId:id,turn:s.turn});
 s.c44.queue.splice(s.c44.queue.indexOf(entry),1);
 const next=s.c44.queue.find(e=>e.factionId===fid);if(next)next.offeredTurn=s.turn;
 return s;
}
export function settleAchievements(s,{autoPlayer=s.autoPlayer===true}={}){
 if(!achievementsEnabled(s))return s;initializeAchievements(s);
 for(const fid of Object.keys(s.factions).sort())for(const earned of evaluateAchievements(s,fid)){
  s.c44.earned[`${fid}:${earned.achievementId}`]=earned;
  const cards=offeredCards(s,earned);if(cards.length)s.c44.queue.push({...earned,offeredTurn:s.turn,cards});
 }
 for(const fid of Object.keys(s.factions).sort()){
  if(fid===s.playerFactionId&&!autoPlayer&&values(s.campaignGrowth?.officers).some(r=>s.officers?.[r.pack.id]?.allegianceFactionId===fid&&values(r.track.draftsById).some(d=>d.state==='OFFERED')))continue;
  let head=s.c44.queue.find(e=>e.factionId===fid);
  while(head&&(fid!==s.playerFactionId||autoPlayer||s.turn-head.offeredTurn>=data.rules.pendingTurns)){
   const options=campaignAchievementsView(s,fid).pending.cards;
   const card=options.sort((a,b)=>['boost','special','open'].indexOf(a.category)-['boost','special','open'].indexOf(b.category))[0];
   if(!card){s.c44.queue.splice(s.c44.queue.indexOf(head),1);}else{
    const target=cardTargets(s,fid,card,head)[0];chooseAchievement(s,{achievementId:head.achievementId,cardId:card.cardId,...(card.target==='CITY'?{cityId:target.id}:card.target==='OFFICER'?{officerId:target.id}:{})},fid);
   }
   head=s.c44.queue.find(e=>e.factionId===fid);
  }
 }
 s.c44.lastSettledTurn=s.turn;return s;
}
export function achievementCityFactor(s,c,resource){
 if(!['food','production'].includes(resource))return 1;
 return (s.c44?.cityRewards?.[c.cityId]??[]).includes(resource==='food'?'R06':'R05')?1.05:1;
}
