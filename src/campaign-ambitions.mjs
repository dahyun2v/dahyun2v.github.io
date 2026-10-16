import data from '../data/ambitions-v0.1.json' with {type:'json'};
import g21 from '../../docs/design-data/officer-pack/trial/G21.json' with {type:'json'};
import g22 from '../../docs/design-data/officer-pack/trial/G22.json' with {type:'json'};
import g23 from '../../docs/design-data/officer-pack/trial/G23.json' with {type:'json'};
import {relation,RELATIONS} from './campaign-relations.mjs';
import {officerFromPack} from './campaign-roster.mjs';
import {campaignOfficerGrowth,pendingCampaignDraft,campaignDraftConfig} from './campaign-growth.mjs';
import {rerollGrowthDraft} from './campaign-draft.mjs';
import {applyDeckEffects} from './campaign-event-deck.mjs';
import {campaignGoalBaseline,campaignGoalProgress} from './campaign-oaths.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';

export const AMBITIONS=data;
const values=o=>Object.values(o??{}),clone=v=>structuredClone(v);
const ambition=id=>data.ambition.list.find(a=>a.id===id),order=id=>data.orders.list.find(o=>o.id===id);
const person=(s,id)=>s.officers[id]??s.wanderers?.[id];
const required=g=>[g.lord,g.officer,...(g.officers??[])].filter(Boolean);
const possible=(s,g)=>required(g).every(id=>person(s,id)?.lifeState==='ALIVE');
const friendly=(s,id)=>person(s,id)?.lifeState==='ALIVE'&&person(s,id)?.allegianceFactionId===s.playerFactionId&&person(s,id)?.captivityState==='FREE';
const pair=(s,f)=>s.c43?.pairs?.[[s.playerFactionId,f].sort().join('|')];
const history=(s,a)=>(s.c43?.history??[]).slice(a.diplomacyIndex??0).map((e,i)=>({...e,index:i+(a.diplomacyIndex??0)}));
const log=(s,text)=>(s.administrationLog??=[]).push({turn:s.turn,factionId:s.playerFactionId,source:'C204',text});
const emptyLegacy=()=>({runsFinished:0,ambitionsAchieved:[]});

export function initializeCampaignAmbitions(s,{unlocks=[],legacy={},runsFinished=legacy.runsFinished??0}={}){
 if(!['v2','v3'].includes(s.mapId))return;
 s.unlocks=[...new Set(unlocks)];
 s.legacy={runsFinished,ambitionsAchieved:[...(legacy.ambitionsAchieved??[])]};
 s.ambitions={version:1,offeredIds:data.ambition.list.filter(a=>a.faction===s.playerFactionId&&possible(s,a.goal)).map(a=>a.id),closed:false,selected:null,offers:[],orders:[],rerolls:0,finished:false,unlocksEarned:[]};
 s.openingMemory=data.unlocks.list.filter(u=>u.kind==='MEMORY'&&s.unlocks.includes(u.id)).map(u=>u.line);
 const packs={G21:g21,G22:g22,G23:g23};
 for(const u of data.unlocks.list.filter(u=>u.kind==='OFFICER'&&s.unlocks.includes(u.id))){
  if(person(s,u.officer))continue;
  const cityId=s.factions[s.playerFactionId].capitalCityId,p=packs[u.officer];
  // As with the existing wanderer pool, growth is initialized on recruitment.
  s.wanderers[u.officer]=officerFromPack(s,p,null,cityId);
 }
 startAmbitionTurn(s);
}
export function restoreCampaignAmbitions(s){
 // Legacy saves never acquire a new objective/offer retroactively.
 if(!s.ambitions)return;
 s.unlocks??=[];s.legacy??=emptyLegacy();
}
export function orderOfferAllowed(s,o){
 const fid=s.playerFactionId,cs=values(s.cities).filter(c=>c.ownerFactionId===fid);
 switch(o.offerIf){
 case undefined:return true;
 case 'ENEMY_NEAR_OWN_CITY':return values(s.knowledge?.[fid]?.observedArmies).some(a=>a.factionId!==fid&&(s.c43?.pairs?.[[fid,a.factionId].sort().join('|')]?.state??'WAR')==='WAR'&&castleArmyActive(s,s.armies[a.armyId])&&s.knowledge[fid].tiles[a.tileId]==='VISIBLE'&&cs.some(c=>hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=(o.offerRange??6)));
 case 'RECRUITABLE_EXISTS':return values(s.wanderers).some(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&!o.allegianceFactionId&&s.cities[o.locationRef?.id]?.ownerFactionId===fid)||values(s.terminal?.prisonersById).some(p=>p.captorFactionId===fid&&p.disposition==='HELD'&&person(s,p.officerId)?.lifeState==='ALIVE')||values(s.captiveRecruitment?.proposals).some(p=>p.factionId===fid&&p.status==='NEGOTIATING'&&person(s,p.targetOfficerId)?.lifeState==='ALIVE');
 case 'AT_WAR_WITH_ANY':return values(s.factions).some(f=>f.factionId!==fid&&f.alive&&(s.c43?.pairs?.[[fid,f.factionId].sort().join('|')]?.state??'WAR')==='WAR');
 case 'EXPLORE_AVAILABLE':return s.c42Disabled!==true&&values(s.exploration?.places).some(p=>p.status!=='RESOLVED'&&((s.exploration.known?.[fid]??[]).includes(p.label)||['VISIBLE','REMEMBERED'].includes(s.knowledge?.[fid]?.tiles[p.tileId])));
 default:return false;
 }
}
export function startAmbitionTurn(s){
 const x=s.ambitions;if(!x||s.gameResult||s.phase!=='PLAYER')return;
 if(s.turn>data.ambition.chooseUntilTurn)x.closed=true;
 if(!data.orders.offerTurns.includes(s.turn)||x.offers.some(o=>o.turn===s.turn))return;
 const chosen=new Set(x.orders.map(o=>o.id));let h=2166136261;
 for(const ch of `${s.campaignSeed}:${s.playerFactionId}:${s.turn}:orders`)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 const pool=data.orders.list.filter(o=>!chosen.has(o.id)&&orderOfferAllowed(s,o)),ids=[];
 while(ids.length<data.orders.offerCount&&pool.length){h=(Math.imul(h,1664525)+1013904223)>>>0;ids.push(pool.splice(h%pool.length,1)[0].id);}
 x.offers.push({turn:s.turn,ids,closed:false,chosenId:null});
}
export function chooseAmbition(s,{ambitionId=null,factionId=s.playerFactionId}={}){
 const x=s.ambitions;if(!x||factionId!==s.playerFactionId||x.closed||x.selected||s.turn>data.ambition.chooseUntilTurn)throw new Error('AMBITION_CHOICE_CLOSED');
 if(ambitionId!==null&&(!x.offeredIds.includes(ambitionId)||!possible(s,ambition(ambitionId).goal)))throw new Error('AMBITION_NOT_OFFERED');
 x.closed=true;
 if(ambitionId){const a=ambition(ambitionId);x.selected={id:a.id,status:'ACTIVE',chosenTurn:s.turn,diplomacyIndex:s.c43?.history.length??0,allied:false,recruited:a.goal.type==='RECRUIT_KEEP'&&friendly(s,a.goal.officer)};observeAmbitions(s);}
 log(s,ambitionId?`이번 생의 뜻 — ${ambition(ambitionId).title}`:data.ambition.skipLabel);
}
export function chooseOrder(s,{orderId=null,factionId=s.playerFactionId}={}){
 const x=s.ambitions,p=x?.offers.find(o=>o.turn===s.turn);
 if(!p||p.closed||factionId!==s.playerFactionId)throw new Error('ORDER_CHOICE_CLOSED');
 if(orderId!==null&&!p.ids.includes(orderId))throw new Error('ORDER_NOT_OFFERED');
 p.closed=true;p.chosenId=orderId;
 if(orderId){const d=order(orderId),o={id:d.id,factionId:s.playerFactionId,goal:clone(d.goal),status:'ACTIVE',signedTurn:s.turn,deadline:s.turn+data.orders.durationTurns-1,baseline:campaignGoalBaseline(s,s.playerFactionId),violated:false};o.progress=campaignGoalProgress(s,o);x.orders.push(o);}
 log(s,orderId?`군령 — ${order(orderId).title}`:data.orders.skipLabel);
}
export function finishAmbitionPlayerTurn(s,{autoPlayer=false}={}){
 const x=s.ambitions;if(!x)return;
 startAmbitionTurn(s);
 if(!x.closed&&!x.selected){
  if(autoPlayer)chooseAmbition(s,{ambitionId:x.offeredIds.find(id=>possible(s,ambition(id).goal))??null});
  // Human offers remain available through the end of turn 3.
  else if(s.turn>=data.ambition.chooseUntilTurn)chooseAmbition(s,{});
 }
 const p=x.offers.find(o=>o.turn===s.turn&&!o.closed);if(p)chooseOrder(s,{orderId:autoPlayer?p.ids[0]??null:null});
}
export function observeAmbitions(s){
 const a=s.ambitions?.selected;if(!a||a.status!=='ACTIVE')return;
 const g=ambition(a.id).goal;
 if(!possible(s,g)){a.status='FAILED';a.failedTurn=s.turn;return;}
 if(g.type==='RECRUIT_KEEP'&&friendly(s,g.officer))a.recruited=true;
 if(g.type==='ALLIANCE_KEEP'){
  const events=history(s,a).filter(e=>[e.from,e.to].includes(s.playerFactionId)&&[e.from,e.to].includes(g.with));
  const first=events.find(e=>e.type==='EFFECTIVE'&&e.kind==='ALLIANCE');
  if(!a.allied&&(pair(s,g.with)?.state==='ALLIANCE'||first)){a.allied=true;a.alliedIndex=first?.index??s.c43.history.length;}
  if(a.allied&&(pair(s,g.with)?.state!=='ALLIANCE'||events.some(e=>e.index>=a.alliedIndex&&(['END','EXPIRE'].includes(e.type)||e.type==='ATTACK'&&e.from===s.playerFactionId&&e.issuedAttack!==false)))){a.status='FAILED';a.failedTurn=s.turn;}
 }
}
function ambitionConditions(s,a){
 const g=ambition(a.id).goal,fid=s.playerFactionId,cityName=id=>s.cityDisplayNames?.[id]??s.cities[id]?.name??id;
 const row=(key,text,met)=>({key,text,met});
 switch(g.type){
 case 'HOLD_AT_END':return [...g.cities.map(id=>row(id,cityName(id),s.cities[id]?.ownerFactionId===fid)),...(g.plusMajor?[row('plusMajor',`큰 성 ${g.plusMajor}개 더`,values(s.cities).filter(c=>c.kind==='major'&&c.ownerFactionId===fid&&!g.cities.includes(c.cityId)).length>=g.plusMajor)]:[])];
 case 'PERSON_BOUND':return [g.officer,...(g.officers??[])].filter(Boolean).flatMap(id=>{
  const r=relation(s,g.lord,id),tiers=RELATIONS.tiers.map(t=>t.id),rank=tiers.indexOf(r.tier),target=tiers.indexOf(g.tier),steps=Math.max(0,target-rank);
  return [row(id,`${person(s,id)?.name??id} 곁에`,friendly(s,id)),row(`${id}.relation`,`관계 ${r.tierName}${steps?` (${RELATIONS.tiers[target]?.name??g.tier}까지 ${steps}단계)`:''}`,rank>=target)];
 });
 case 'RECRUIT_KEEP':return [row('recruited','등용',a.recruited),row(g.officer,`${person(s,g.officer)?.name??g.officer} 곁에`,friendly(s,g.officer))];
 case 'ALLIANCE_KEEP':return [row('alliance',`${s.factions[g.with]?.name??g.with} 동맹`,a.allied&&pair(s,g.with)?.state==='ALLIANCE'),row('kept','맺은 뒤 파기 · 공격 없음',a.status!=='FAILED')];
 default:return [];
 }
}
function payOrder(s,o){
 const reward=order(o.id).reward,fid=s.playerFactionId,source=`ORDER.${o.signedTurn}.${o.id}`;
 if(reward==='REPUTATION')return applyDeckEffects(s,[{prestige:data.orders.rewards.REPUTATION.amount}],{factionId:fid,roles:{},names:{}},source).text;
 if(reward==='REROLL'){s.ambitions.rerolls+=data.orders.rewards.REROLL.amount;return data.orders.rewards.REROLL.label;}
 // There is no API for granting a one-off tactic draft without levelling.
 // Reuse the existing XP -> growth draft path, as allowed by the delegation.
 const id=values(s.officers).filter(o=>friendly(s,o.officerId)).sort((a,b)=>Number(b.officerId===s.factions[fid].rulerId)-Number(a.officerId===s.factions[fid].rulerId)||a.officerId.localeCompare(b.officerId)).find(o=>campaignOfficerGrowth(s,o.officerId)?.level<30)?.officerId;
 if(!id)return '성장 가능한 장수 없음';
 const g=campaignOfficerGrowth(s,id),amount=Math.max(1,g.nextXp-g.xp);
 return `전법 카드 대체 — ${applyDeckEffects(s,[{xp:{officer:'recipient',delta:amount}}],{factionId:fid,roles:{recipient:id},names:{recipient:s.officers[id].name}},source).text}`;
}
export function settleOrders(s,{atEnd=false,endedTurn=s.turn}={}){
 for(const o of s.ambitions?.orders??[]){if(o.status!=='ACTIVE')continue;
  if(endedTurn>o.deadline&&!atEnd)continue;
  o.progress=campaignGoalProgress(s,o,{atEnd,endedTurn});
  if(o.progress.achieved||atEnd&&endedTurn>=o.deadline||s.gameResult){
   o.status=o.progress.achieved?'ACHIEVED':'FAILED';o.resolvedTurn=endedTurn;
   o.rewardLine=o.status==='ACHIEVED'?payOrder(s,o):'벌 없음';
   log(s,`군령 ${o.status==='ACHIEVED'?'이룸':'기한 넘김'} — ${order(o.id).title} · ${o.rewardLine}`);
  }
 }
}
export function finishAmbitionRun(s){
 const x=s.ambitions;if(!s.gameResult||!x||x.finished)return;
 observeAmbitions(s);
 const a=x.selected;if(a?.status==='ACTIVE')a.status=ambitionConditions(s,a).every(c=>c.met)?'ACHIEVED':'FAILED';
 x.closed=true;for(const p of x.offers)p.closed=true;
 const l=s.legacy;l.runsFinished++;
 if(a?.status==='ACHIEVED')l.ambitionsAchieved.push(a.id);
 const ids=l.ambitionsAchieved,factions=new Set(ids.map(id=>ambition(id)?.faction).filter(Boolean));
 const earned=[];
 for(const u of data.unlocks.list){
  const w=u.when;let yes=false;
  if(w.type==='RUNS_FINISHED')yes=l.runsFinished>=w.count;
  if(w.type==='AMBITIONS_ACHIEVED')yes=ids.length>=w.count;
  if(w.type==='AMBITION_FACTIONS')yes=factions.size>=w.count;
  if(w.type==='AMBITION_ACHIEVED_ID'){for(const id of new Set(ids))earned.push({id:`U-EV-${id}`,line:u.line});continue;}
  if(yes)earned.push({id:u.id,line:u.line});
 }
 x.unlocksEarned=earned.filter(u=>!s.unlocks.includes(u.id));s.unlocks.push(...x.unlocksEarned.map(u=>u.id));x.finished=true;
}
export function ambitionStep(s,{finish=true}={}){observeAmbitions(s);settleOrders(s);if(finish)finishAmbitionRun(s);startAmbitionTurn(s);}
export function ambitionsView(s,fid){
 if(fid!==s.playerFactionId||s.mapId==='v1')return {};
 const x=s.ambitions,a=x?.selected,p=x?.offers.find(p=>p.turn===s.turn),selected=a?{...clone(ambition(a.id)),status:a.status,conditions:ambitionConditions(s,a)}:null;
 const card=o=>({...clone(order(o.id)),status:o.status,signedTurn:o.signedTurn,deadline:o.deadline,progress:clone(o.progress),...(o.resolvedTurn!==undefined?{resolvedTurn:o.resolvedTurn,rewardLine:o.rewardLine}:{}),turnsLeft:o.status==='ACTIVE'?Math.max(0,o.deadline-s.turn+1):0});
 const out={ambition:{selected,canChoose:!!x&&!x.closed&&!s.gameResult&&s.turn<=data.ambition.chooseUntilTurn,chooseUntilTurn:data.ambition.chooseUntilTurn,skipLabel:data.ambition.skipLabel,offered:!x?.closed&&!s.gameResult?(x?.offeredIds??[]).filter(id=>possible(s,ambition(id).goal)).map(id=>clone(ambition(id))):[]},orders:{offer:p&&!p.closed&&!s.gameResult?{turn:p.turn,deadline:p.turn+data.orders.durationTurns-1,choices:p.ids.map(id=>clone(order(id))),skipLabel:data.orders.skipLabel}:null,history:(x?.orders??[]).map(card),rerolls:x?.rerolls??0},unlocks:clone(s.unlocks??[]),openingMemory:clone(s.openingMemory??[])};
 return out;
}
export function ambitionResultView(s){
 const a=s.ambitions?.selected,d=a&&ambition(a.id);
 return {ambition:a?{id:a.id,title:d.title,achieved:a.status==='ACHIEVED',endingLine:a.status==='ACHIEVED'?d.endingLine:data.ambition.notAchievedLine.replace('{title}',d.title)}:null,unlocksEarned:clone(s.ambitions?.unlocksEarned??[]),unlocks:clone(s.unlocks??[]),legacy:clone(s.legacy??emptyLegacy())};
}
export function applyOrderReroll(s,command,applyDraft){
 const p=pendingCampaignDraft(s),x=s.ambitions;
 if(!p||!x?.rerolls)return applyDraft(s,command);
 const r=s.campaignGrowth.officers[p.officerId],d=r.track.draftsById[p.draft.draftId];
 if(d.draftId!==command.draftId)return applyDraft(s,command);
 const card=d.offered.find(c=>c.traitId===command.traitId);
 const exhausted=d.c29?.awakening?d.c29.rerolled:d.c28?card&&!card.rerollsRemaining&&!d.c28.bonusRerolls:d.rerollCount>=campaignDraftConfig(r.potential,d.ruleDoubleDraft).rerollLimit;
 if(!exhausted)return applyDraft(s,command);
 if(d.c29?.awakening)d.c29.rerolled=false;
 else if(d.c28){d.c28.bonusRerolls++;d.rerollLimit++;}
 else {const result=rerollGrowthDraft({draft:d,state:r.track.growthStates[p.officerId],config:{...campaignDraftConfig(r.potential,d.ruleDoubleDraft),rerollLimit:d.rerollCount+1,rerollAptitudeCost:0}});r.track.draftsById[d.draftId]=result.draft;r.track.growthStates[p.officerId]=result.nextState;x.rerolls--;return s;}
 applyDraft(s,command);x.rerolls--;return s;
}
export function validateAmbitions(s){
 if(s.unlocks!==undefined&&(!Array.isArray(s.unlocks)||s.unlocks.some(id=>typeof id!=='string')||new Set(s.unlocks).size!==s.unlocks.length))throw new Error('INVALID_CAMPAIGN_UNLOCKS');
 if(s.legacy!==undefined&&(!Number.isSafeInteger(s.legacy.runsFinished)||s.legacy.runsFinished<0||!Array.isArray(s.legacy.ambitionsAchieved)||s.legacy.ambitionsAchieved.some(id=>!ambition(id))))throw new Error('INVALID_CAMPAIGN_LEGACY');
 const x=s.ambitions;if(!x)return;
 if(x.version!==1||!Number.isSafeInteger(x.rerolls)||x.rerolls<0||typeof x.closed!=='boolean'||typeof x.finished!=='boolean'||!Array.isArray(x.offeredIds)||x.offeredIds.some(id=>ambition(id)?.faction!==s.playerFactionId)||x.selected&&(!x.offeredIds.includes(x.selected.id)||!['ACTIVE','ACHIEVED','FAILED'].includes(x.selected.status))||!Array.isArray(x.offers)||!Array.isArray(x.orders)||!Array.isArray(x.unlocksEarned))throw new Error('INVALID_CAMPAIGN_AMBITIONS');
 for(const p of x.offers)if(!data.orders.offerTurns.includes(p.turn)||!Array.isArray(p.ids)||p.ids.length>data.orders.offerCount||new Set(p.ids).size!==p.ids.length||p.ids.some(id=>!order(id))||p.chosenId!==null&&!p.ids.includes(p.chosenId)||typeof p.closed!=='boolean')throw new Error('INVALID_CAMPAIGN_ORDER_OFFER');
 for(const o of x.orders)if(!order(o.id)||o.factionId!==s.playerFactionId||!['ACTIVE','ACHIEVED','FAILED'].includes(o.status)||o.deadline!==o.signedTurn+data.orders.durationTurns-1||JSON.stringify(o.goal)!==JSON.stringify(order(o.id).goal)||!o.baseline)throw new Error('INVALID_CAMPAIGN_ORDER');
}
