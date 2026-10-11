// @ts-check
import {relation,RELATIONS} from './campaign-relations.mjs';
import {createRng} from './rng.mjs';
import {createCampaign} from './campaign-runtime.mjs';
import {statsToOfficerPack,troopToCampaign} from './campaign-adapters.mjs';
import {officerFromPack,rosterPacks} from './campaign-roster.mjs';
import {initializeCampaignGrowth} from './campaign-growth.mjs';
import {initializeCampaignAbilities} from './campaign-abilities.mjs';
import {startClasses} from './campaign-classes.mjs';
import {triggerEffects} from './campaign-effects.mjs';
import {domesticStartFaction,combatStartFaction,c33Start} from './campaign-rule-registry.mjs';

export const OFFICER_DRAFT=Object.freeze({slots:5,offerSize:5,rerolls:2,budget:15,trial:true,baseWeight:100,needWeight:40,homeWeight:60,bondMax:120,axisFloor:80,valueCost:2,costBands:5,initialHomeFloor:2,costOverride:{},faction:{F01:{extraRerolls:1,needWeight:120},F02:{bondWeight:2,chainWeight:150},F03:{delegateWeight:150}}});
const pools=new Map();
function fail(code){throw Object.assign(new Error(code),{code});}
function source(factionId,mapId){
 const key=`${mapId}:${factionId}`;
 if(!pools.has(key)){
  const s=createCampaign({factionId,map:mapId}),f=s.factions[factionId];
  const rulers=new Set(Object.values(s.factions).map(f=>f.rulerId));
  const home=new Set(f.officerIds);
  const officers=[...f.officerIds.filter(id=>!rulers.has(id)).map(id=>s.officers[id]),...Object.values(s.wanderers??{}).filter(o=>!rulers.has(o.officerId))];
  const ranked=[...officers].sort((a,b)=>Object.values(a.baseStats).reduce((n,v)=>n+v,0)-Object.values(b.baseStats).reduce((n,v)=>n+v,0)||a.officerId.localeCompare(b.officerId));
  const costs=new Map(ranked.map((o,i)=>[o.officerId,Math.min(OFFICER_DRAFT.costBands,1+Math.floor(i*OFFICER_DRAFT.costBands/ranked.length))]));
  pools.set(key,{state:s,rulerId:f.rulerId,officers:structuredClone(officers),cards:officers.map(o=>({officerId:o.officerId,name:o.name,home:home.has(o.officerId),cost:costs.get(o.officerId),stats:statsToOfficerPack(o.baseStats),role:o.rolePrimary,style:o.roleSecondary}))});
 }
 return pools.get(key);
}
export function officerDraftPool({factionId,mapId='v3'}){return structuredClone(source(factionId,mapId).cards).map(c=>({...c,cost:OFFICER_DRAFT.costOverride[c.officerId]??c.cost}));}
const axes=[['politics','NEED_GOVERN'],['leadership','NEED_COMMAND'],['intelligence','NEED_INTELLECT'],['might','NEED_MIGHT'],['charisma','NEED_CHARISMA']];
function context(d){
 const data=source(d.factionId,d.mapId),cards=officerDraftPool(d),byId=new Map(cards.map(c=>[c.officerId,c]));
 const locked=d.locked.map(id=>byId.get(id));
 const originals=new Map([...data.officers,data.state.officers[data.rulerId]].map(o=>[o.officerId,o]));
 const owners=[data.rulerId,...d.locked];
 const need=key=>!owners.some(id=>originals.get(id).baseStats[key]>=OFFICER_DRAFT.axisFloor);
 const needReasons=new Map(cards.map(c=>[c.officerId,axes.find(([key])=>need(key)&&originals.get(c.officerId).baseStats[key]>=OFFICER_DRAFT.axisFloor)?.[1]]));
 const needReason=c=>needReasons.get(c.officerId);
 const reason=c=>c.home?'BOND':needReason(c)??'WANDER';
 const bond=(a,b)=>Math.max(0,Math.min(OFFICER_DRAFT.bondMax,(relation(data.state,a,b).value-RELATIONS.range[0])*OFFICER_DRAFT.bondMax/(RELATIONS.range[1]-RELATIONS.range[0])));
 const fateScores=new Map(cards.map(c=>[c.officerId,Math.max(...owners.map(id=>bond(id,c.officerId)))]));
 const fate=c=>fateScores.get(c.officerId);
 const gimmick=OFFICER_DRAFT.faction[d.factionId]??{};
 const delegate=d.lastSearchOwnerId&&originals.get(d.lastSearchOwnerId);
 const lowAxis=delegate&&[...axes].sort((a,b)=>delegate.baseStats[a[0]]-delegate.baseStats[b[0]])[0][0];
 const weight=c=>OFFICER_DRAFT.baseWeight+bond(data.rulerId,c.officerId)*(gimmick.bondWeight??1)+(c.home?OFFICER_DRAFT.homeWeight:0)+(needReason(c)?gimmick.needWeight??OFFICER_DRAFT.needWeight:0)+(gimmick.chainWeight&&d.locked.some(id=>relation(data.state,id,c.officerId).value>=RELATIONS.tiers.find(t=>t.id==='TRUST').min)?gimmick.chainWeight:0)+(lowAxis&&originals.get(c.officerId).baseStats[lowAxis]>=OFFICER_DRAFT.axisFloor?gimmick.delegateWeight??0:0);
 return {cards,byId,reason,needReason,fate,weight,owners,gimmick,lockedCost:locked.reduce((n,c)=>n+c.cost,0),min:Math.min(...cards.map(c=>c.cost))};
}
function randomFor(seed,step){let n=Number(seed)>>>0;for(const ch of `officer-draft:${step}`)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return createRng(n);}
function pick(cards,rng,weight){let roll=rng.next()*cards.reduce((n,c)=>n+weight(c),0);return cards.find(c=>(roll-=weight(c))<0)??cards.at(-1);}
const lowest=(cards,n)=>[...cards].sort((a,b)=>a.cost-b.cost||a.officerId.localeCompare(b.officerId)).slice(0,n);
const total=cards=>cards.reduce((n,c)=>n+c.cost,0);
export function createOfficerDraft({factionId,seed=190919,mapId='v3'}){
 const d={factionId,mapId,seed,slots:OFFICER_DRAFT.slots,budget:OFFICER_DRAFT.budget,rerollsLeft:OFFICER_DRAFT.rerolls,offers:[],locked:[],seen:[],step:0};
 d.rerollsLeft+=OFFICER_DRAFT.faction[factionId]?.extraRerolls??0;
 return propose(d,true);
}
// Each reason occupies at most one card; locked cards participate in coverage.
const laneNames=['FATE','BUILD','VALUE','WILD','FACE'];
function composition(x,cards,reference=cards){
 let states=new Map([[0,new Map()]]);
 for(const c of cards){
  const next=new Map(states);
  for(const [mask,assignment] of states)for(let i=0;i<laneNames.length;i++){
   if(!(mask&(1<<i))&&matches(x,laneNames[i],c,reference))next.set(mask|(1<<i),new Map([...assignment,[c.officerId,laneNames[i]]]));
  }
  states=next;
 }
 return [...states.values()].sort((a,b)=>b.size-a.size)[0];
}
function matches(x,lane,c,cards){
 return lane==='FATE'?x.fate(c)===Math.max(...cards.map(x.fate)):lane==='BUILD'?!!x.needReason(c):lane==='VALUE'?c.cost<=OFFICER_DRAFT.valueCost:lane==='WILD'?!c.home:c.home;
}

export function officerDraftView(draft){
 const x=context(draft),shownCost=draft.offers.reduce((n,id)=>n+x.byId.get(id).cost,0);
 const lanes=composition(x,draft.offers.map(id=>x.byId.get(id)));
 const lockPossible=c=>{const remaining=x.cards.filter(b=>b.officerId!==c.officerId&&!draft.locked.includes(b.officerId)&&(draft.offers.includes(b.officerId)||draft.rerollsLeft>0&&!draft.seen.includes(b.officerId)));const n=draft.slots-draft.locked.length-1;return remaining.length>=n&&x.lockedCost+c.cost+total(lowest(remaining,n))<=draft.budget;};
 return {gimmick:{factionId:draft.factionId,extraRerolls:x.gimmick.extraRerolls??0,canDelegate:draft.factionId==='F03'&&draft.rerollsLeft>0,owners:x.owners},cards:draft.offers.map(id=>{const c=x.byId.get(id),locked=draft.locked.includes(id);return {...structuredClone(c),locked,lane:lanes.get(id)??null,reasonCode:x.reason(c),lockBlocked:locked?'LOCKED':!lockPossible(c)?'BUDGET':null};}),lockedCost:x.lockedCost,shownCost,budget:draft.budget,rerollsLeft:draft.rerollsLeft,canReroll:draft.rerollsLeft>0&&draft.locked.length<draft.offers.length,canConfirm:shownCost<=draft.budget,confirmBlocked:shownCost<=draft.budget?null:'BUDGET'};
}
export function lockDraftOfficer(draft,officerId){
 if(draft.locked.includes(officerId))fail('DRAFT_ALREADY_LOCKED');
 if(!draft.offers.includes(officerId))fail('DRAFT_NOT_OFFERED');
 if(officerDraftView(draft).cards.find(c=>c.officerId===officerId).lockBlocked)fail('DRAFT_BUDGET');
 return {...structuredClone(draft),locked:[...draft.locked,officerId]};
}
export function rerollOfficerDraft(draft,{searchOwnerId=undefined}={}){
 if(!officerDraftView(draft).canReroll)fail('DRAFT_NO_REROLL');
 const d=structuredClone(draft);
 if(d.factionId==='F03'){if(searchOwnerId!==undefined&&!context(d).owners.includes(searchOwnerId))fail('DRAFT_BAD_OWNER');d.lastSearchOwnerId=searchOwnerId??null;}
 return propose(d,false);
}
function propose(d,initial){
 const x=context(d),rng=randomFor(d.seed,initial?0:d.step+1);
 if(initial&&x.cards.length<d.slots)fail('DRAFT_POOL_TOO_SMALL');
 if(initial)d.offers=Array(d.slots).fill(null);
 let candidates=x.cards.filter(c=>!d.seen.includes(c.officerId));
 let positions=d.offers.map((id,i)=>d.locked.includes(id)?-1:i).filter(i=>i>=0);
 // Maximize fresh slots while retaining the cheapest current cards if the
 // unseen pool cannot provide an affordable complete replacement.
 const ordered=[...positions].sort((a,b)=>(x.byId.get(d.offers[a])?.cost??0)-(x.byId.get(d.offers[b])?.cost??0)||a-b);
 let count=Math.min(positions.length,candidates.length);
 while(count>=0){
  const retained=ordered.slice(0,positions.length-count);
  const fixed=x.lockedCost+total(retained.map(i=>x.byId.get(d.offers[i])));
  if(fixed+total(lowest(candidates,count))<=d.budget){positions=[...positions.filter(i=>!retained.includes(i)),...retained];break;}
  count--;
 }
 if(count<0)fail('DRAFT_BUDGET');
 let remainingBudget=d.budget-x.lockedCost-total(positions.slice(count).map(i=>x.byId.get(d.offers[i])));
 const final=!initial&&d.rerollsLeft===1;
 const fixedCards=d.offers.filter((id,i)=>d.locked.includes(id)||positions.slice(count).includes(i)).map(id=>x.byId.get(id));
 const reference=[...fixedCards,...candidates];
 const masks=new Map(reference.map(c=>[c.officerId,laneNames.reduce((mask,lane,i)=>matches(x,lane,c,reference)?mask|(1<<i):mask,0)]));
 function coverage(cards){
  let reachable=1;
  for(const c of cards){
   let next=reachable;const eligible=masks.get(c.officerId);
   for(let mask=0;mask<32;mask++)if(reachable&(1<<mask)){
    let free=eligible&~mask;while(free){const bit=free&-free;next|=1<<(mask|bit);free-=bit;}
   }
   reachable=next;
  }
  let best=0;for(let mask=0;mask<32;mask++)if(reachable&(1<<mask)){let n=mask,count=0;while(n){n&=n-1;count++;}best=Math.max(best,count);}
  return best;
 }
 let best=-1,combinations=[];
 function complete(start,selected,cost){
  if(selected.length===count){
   const cards=[...fixedCards,...selected];
   if(initial&&cards.filter(c=>c.home).length<Math.min(OFFICER_DRAFT.initialHomeFloor,x.cards.filter(c=>c.home).length))return;
   const score=coverage(cards);
   if(score>best){best=score;combinations=[];}
   if(score===best)combinations.push(selected);
   return;
  }
  for(let i=start;i<=candidates.length-(count-selected.length);i++)if(!final||cost+candidates[i].cost<=remainingBudget)complete(i+1,[...selected,candidates[i]],cost+candidates[i].cost);
 }
 complete(0,[],0);
 if(!combinations.length)fail('DRAFT_BUDGET');
 // Condition weighted draws on completable sets with maximum lane coverage.
 for(let j=0;j<count;j++){
  const available=candidates.filter(c=>combinations.some(set=>set.includes(c)));
  const c=pick(available,rng,x.weight);
  d.offers[positions[j]]=c.officerId;d.seen.push(c.officerId);
  combinations=combinations.filter(set=>set.includes(c)).map(set=>set.filter(b=>b!==c));
  candidates=candidates.filter(b=>b!==c);
 }
 if(!initial){d.rerollsLeft--;d.step++;}return d;
}
export function officerDraftCompanions(draft){if(!officerDraftView(draft).canConfirm)fail('DRAFT_BUDGET');return [...draft.offers];}

// Called only for the opt-in start, after the stock roster has been installed.
export function applyOfficerDraft(s,companions){
 if(companions===undefined)return;
 const pool=source(s.playerFactionId,s.mapId),allowed=new Set(pool.cards.map(c=>c.officerId));
 if(!Array.isArray(companions)||companions.length!==5||new Set(companions).size!==5||companions.some(id=>!allowed.has(id)))fail('INVALID_COMPANIONS');
 const f=s.factions[s.playerFactionId],selected=new Set(companions),capital=s.cities[f.capitalCityId];
 const homes=pool.cards.filter(c=>c.home).map(c=>c.officerId),removed=homes.filter(id=>!selected.has(id));
 const freed=companions.filter(id=>s.wanderers[id]).map(id=>s.wanderers[id].locationRef.id);
 const neutral=Object.values(s.cities).filter(c=>c.kind==='minor'&&c.ownerFactionId===null).map(c=>c.cityId).sort();
 const rng=randomFor(s.campaignSeed,3);
 for(const id of removed){
  const original=s.officers[id],cityId=freed.shift()??neutral[Math.floor(rng.next()*neutral.length)];
  const pack={id,name:original.name,stats:statsToOfficerPack(original.baseStats),role:original.rolePrimary,style:original.roleSecondary,uniqueTrait:original.uniqueTrait,troopAptitude:{}};
  const o=officerFromPack(s,pack,null,cityId);o.allowedTroops=[...original.allowedTroops];o.aptitude=structuredClone(original.aptitude);o.subStats=structuredClone(original.subStats);
  s.wanderers[id]=o;delete s.officers[id];delete s.campaignGrowth.officers[id];
 }
 for(const id of companions)if(s.wanderers[id]){const o=s.wanderers[id];delete s.wanderers[id];o.allegianceFactionId=f.factionId;o.locationRef={kind:'CITY',id:capital.cityId};s.officers[id]=o;}
 f.officerIds=[f.rulerId,...companions];
 const armies=f.armyIds.map(id=>s.armies[id]),other=armies.find(a=>a.commanderId!==f.rulerId);
 const score=(key,id)=>s.officers[id].baseStats[key];
 const rank=(ids,value)=>[...ids].sort((a,b)=>value(b)-value(a)||a.localeCompare(b));
 if(!selected.has(capital.governorId))capital.governorId=rank(companions.filter(id=>id!==other?.commanderId),id=>score('politics',id))[0];
 const replacedCommander=other&&!selected.has(other.commanderId);
 if(replacedCommander){
  other.commanderId=rank(companions.filter(id=>id!==capital.governorId),id=>score('leadership',id)+score('might',id))[0];
  const o=s.officers[other.commanderId];if(!o.allowedTroops.includes(other.troopType))other.troopType=o.allowedTroops[0];
  const formation=s.personnel.formations.find(f=>f.formationId===other.armyId);
  formation.identity={baseTroopId:troopToCampaign(other.troopType),specialTroopId:null};
  other.effectStates=[];other.tacticReadyTurns={};other.classState={prepared:false,relentlessTarget:null,canMoveAfterAttack:false,hidden:false};delete other.c26;delete other.c27;delete other.c33;
 }
 for(const a of armies)s.officers[a.commanderId].locationRef={kind:'ARMY',id:a.armyId};
 initializeCampaignAbilities(s);
 // Growth accepts both roster and FIRST3 pack schemas; its inferred default type
 // describes only the FIRST3 source metadata.
 initializeCampaignGrowth(s,/** @type {Parameters<typeof initializeCampaignGrowth>[1]} */ (/** @type {unknown} */ (rosterPacks)));
 if(replacedCommander){triggerEffects(s,other.armyId,'PASSIVE');triggerEffects(s,other.armyId,'ROUND_START');}
 domesticStartFaction(s,f.factionId);combatStartFaction(s,f.factionId);c33Start(s,f.factionId);
 startClasses(s,f.factionId);
 s.officerDraft={companions:[...companions]};
}
