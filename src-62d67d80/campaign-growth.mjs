import {installC33,c33Eligible} from './campaign-rule-registry.mjs';
import {c31Combat} from './campaign-events.mjs';
import {c30Learn,c30Combat} from './campaign-c29.mjs';
import {initializeC29,c29Enabled,c29BindingTargets,c29Bind,c29AiBinding,composeC29Draft,selectedC29,rerollC29,c29AiChoice,c29Combat,c29EvolutionCandidates,c29XpFactor,validateC29,c29TacticCard} from './campaign-c29.mjs';
import {initializeC28,c28Eligible,composeC28Draft,rerollC28Draft,selectedC28,recordC28Combat,c28Enabled,validateC28} from './campaign-career.mjs';
import {domesticGovernance,installCommonCombatTactics} from './campaign-rule-registry.mjs';
import {overlayUniquePack,uniqueLevel,uniqueXpFactor} from './campaign-rule-registry.mjs';
import {C25,c25Enabled,initializeCareer,recordCareer,installCareerCards,careerPool,validateCareer,CAREER_DATA} from './campaign-career.mjs';
import commonTraits from '../../docs/design-data/officer-pack/common-traits-v0.2.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {effectModifiers,officerEffectCards,tacticIsDamage,cardEffectPending,hasCampaignRule,campaignEffectValid} from './campaign-effects.mjs';
import {createRng} from './rng.mjs';
import {ABILITY_NAMES,abilityToEngine,statsToOfficerPack} from './campaign-adapters.mjs';
import {xpToNextLevel,GROWTH_PROGRESS_TRIAL} from './growth-progress.mjs';
import {createGrowthTrack,grantGrowthEntitlement,applyTrackedDraftAction,validateGrowthTrack} from './campaign-growth-track.mjs';
import {createGrowthDraft,rerollGrowthDraft,DEFAULT_GROWTH_DRAFT_CONFIG,RARITY_ORDER} from './campaign-draft.mjs';
import g02 from '../../docs/design-data/officer-pack/trial/G02.json' with {type:'json'};
import g03 from '../../docs/design-data/officer-pack/trial/G03.json' with {type:'json'};
import g04 from '../../docs/design-data/officer-pack/trial/G04.json' with {type:'json'};
import g05 from '../../docs/design-data/officer-pack/trial/G05.json' with {type:'json'};
import g07 from '../../docs/design-data/officer-pack/trial/G07.json' with {type:'json'};
import g08 from '../../docs/design-data/officer-pack/trial/G08.json' with {type:'json'};
import g20 from '../../docs/design-data/officer-pack/trial/G20.json' with {type:'json'};
import g24 from '../../docs/design-data/officer-pack/trial/G24.json' with {type:'json'};
import g27 from '../../docs/design-data/officer-pack/trial/G27.json' with {type:'json'};

// All numbers here are trial values, not adopted balance rules.
export const CAMPAIGN_GROWTH_TRIAL=Object.freeze({
  potential:Object.freeze([
    ['F',6,.7],['E',10,.8],['D',16,.9],['C',22,1],['B',20,1.1],
    ['A',13,1.2],['S',8,1.3],['SS',4,1.4],['UR',1,1.6],
  ].map(([rank,weight,xpMultiplier])=>Object.freeze({rank,weight,xpMultiplier}))),
  damageXp:1.5,killXp:60,captureXp:100,governorXp:12,
  primaryWeight:60,secondaryWeight:30,
});
// C174b: XP only. Lv10 around turns 18~20, roster mean Lv5~6 (trial).
export const CAMPAIGN_GROWTH_26_TRIAL=Object.freeze({damageXp:1.5,killXp:60,captureXp:100,governorXp:12,catchup:1.5,xpBase:100,xpPerLevel:5});
export const campaignGrowthTrial=s=>['v2','v3'].includes(s.mapId)&&s.trialRules?.growth!=='legacy'?CAMPAIGN_GROWTH_26_TRIAL:CAMPAIGN_GROWTH_TRIAL;
export function campaignNextXp(record,level){
 const base=xpToNextLevel(level);if(base===null)return base;
 if(record.xpCurveVersion==='174b')return CAMPAIGN_GROWTH_26_TRIAL.xpBase+CAMPAIGN_GROWTH_26_TRIAL.xpPerLevel*level;
 if(record.xpCurveVersion!==174)return base;
 // Keep the opening intact, reach the second tactic promptly, slow the tail.
 return Math.round(base*(level<10?1:level<14?.7:1+(level-13)*.5));
}
export function campaignCatchupFactor(s,id){
 if(!['v2','v3'].includes(s.mapId)||s.trialRules?.growth==='legacy')return 1;
 const officer=s.officers[id],fid=officer?.allegianceFactionId,r=s.campaignGrowth?.officers[id];
 if(!fid||!r||officer.lifeState!=='ALIVE'||officer.captivityState!=='FREE'||s.wanderers?.[id])return 1;
 const peers=Object.values(s.officers).filter(o=>o.allegianceFactionId===fid&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&!s.wanderers?.[o.officerId]&&s.campaignGrowth.officers[o.officerId]);
 if(!peers.length)return 1;
 const average=peers.reduce((n,o)=>n+s.campaignGrowth.officers[o.officerId].track.growthStates[o.officerId].level,0)/peers.length;
 return average-r.track.growthStates[id].level>=2?CAMPAIGN_GROWTH_26_TRIAL.catchup:1;
}
const trialPacks=Object.fromEntries([g02,g03,g04,g05,g07,g08,g20,g24,g27].map(p=>[p.id,p]));
export const CAMPAIGN_TRAIT_SLOTS=5, CAMPAIGN_TACTIC_SLOTS=3;
export const POTENTIAL_STAT_GAIN=Object.freeze({F:1,E:1,D:1,C:2,B:2,A:2,S:3,SS:3,UR:4});
export const CAMPAIGN_RARITY_NAMES=Object.freeze({COMMON:'일반',UNCOMMON:'고급',RARE:'희귀',EPIC:'영웅',LEGENDARY:'전설',MYTHIC:'신화'});
const rarityMap={COMMON:'COMMON',UNCOMMON:'UNCOMMON',RARE:'RARE',EPIC:'EPIC',LEGENDARY:'LEGENDARY',MYTHIC:'MYTHIC',HEROIC:'RARE',R:'UNCOMMON',SR:'RARE',SSR:'EPIC',UR:'MYTHIC'};
// Trial packs use role placeholders rather than final Class names.
const trialClassTags={'TRIAL:장군':['지휘','보병'],'TRIAL:맹장':['무용','기병'],
  'TRIAL:책사':['지략'],'TRIAL:문관':['정무'],'TRIAL:명사':['감화']};
const classTags=name=>name?[name,...(trialClassTags[name]??[])]:[];
const clone=structuredClone;
const fail=message=>{throw new Error(message);};


export function draftKindForLevel(level){return level%5===0?'tactic':'trait';}
export function draftPoolForLevel(r,level){
  const kind=draftKindForLevel(level);
  const pool={...r.pool,traits:r.pool.traits.filter(t=>c33Eligible(r,r.cards[t.traitId])&&(!r.pack.uniqueVersion||t.ownershipType!=='CORE')&&r.cards[t.traitId]?.kind===kind&&(t.rarity!=='MYTHIC'||level>=10))};
  if(r.c29)pool.traits=pool.traits.filter(t=>t.traitId!==r.representativeId);return r.trace?careerPool(r,level,pool):pool;
}
export function automaticStatGains(s,id,level){
  const r=s.campaignGrowth.officers[id],stats=s.officers[id].baseStats;
  const ranked=Object.values(ABILITY_NAMES).sort((a,b)=>(stats[abilityToEngine(b)]??0)-(stats[abilityToEngine(a)]??0));
  const affinity=name=>{if(!name)return [];const tags=classTags(name),abilityTags=Object.values(ABILITY_NAMES).filter(a=>tags.includes(a)||(r.pack.draftPool??[]).some(c=>{const t=Array.isArray(c.classTag)?c.classTag:[c.classTag];return t.includes(name)&&t.includes(a);}));return abilityTags;};
  const primary=affinity(r.pack.primaryClass),secondary=affinity(r.pack.secondaryClass);
  if(r.pack.primaryClass&&!primary.length)primary.push(ranked[0]);if(r.pack.secondaryClass&&!secondary.length)secondary.push(ranked.find(a=>!primary.includes(a))??ranked[0]);
  const weights=Object.values(ABILITY_NAMES).map(name=>{const key=abilityToEngine(name);return {key,weight:Math.max(1,stats[key]??0)+ (primary.includes(name)?60:0)+(secondary.includes(name)?30:0)};});
  let seed=Number(s.campaignSeed)>>>0;for(const c of `stats:${id}:${level}`)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const rng=createRng(seed),gains=Object.fromEntries(weights.map(w=>[w.key,0])),count=POTENTIAL_STAT_GAIN[r.potential];
  for(let n=0;n<count;n++){const available=weights.filter(w=>s.mapId!=='v1'||(stats[w.key]??0)+gains[w.key]<100);if(!available.length)break;
    let roll=rng.next()*available.reduce((sum,w)=>sum+w.weight,0);const chosen=available.find(w=>(roll-=w.weight)<0)??available.at(-1);gains[chosen.key]++;}
  return gains;
}
function applyAutomaticStats(s,id,level){for(const [key,gain] of Object.entries(automaticStatGains(s,id,level)))s.officers[id].baseStats[key]+=gain;}
export function needsTraitResolution(s,id,traitId){const r=s.campaignGrowth.officers[id];return r.cards[traitId]?.kind==='trait'&&!growthState(r,id).ownedTraitRanks[traitId]&&officerEffectCards(s,id).length>=CAMPAIGN_TRAIT_SLOTS;}
export function resolveTraitSpace(s,id,resolution){
  const r=s.campaignGrowth.officers[id],ranks=growthState(r,id).ownedTraitRanks;
  const allowed=key=>key!==r.coreId&&r.cards[key]?.kind==='trait'&&ranks[key]>0;
  if(!resolution)fail('TRAIT_SLOT_RESOLUTION_REQUIRED');
  const {mode,keepId,removeId}=resolution;
  if(!allowed(removeId))fail('INVALID_TRAIT_MATERIAL');
  if(mode==='discard'){delete ranks[removeId];if(r.c29)for(const [k,v] of Object.entries(r.c29.bindings))if(v===removeId)delete r.c29.bindings[k];return;}
  if(mode!=='merge'||keepId===removeId||!allowed(keepId))fail('INVALID_TRAIT_MATERIAL');
  const a=r.cards[keepId],b=r.cards[removeId],rank=Math.min(5,ranks[keepId]+Math.ceil(ranks[removeId]/2));
  const recipe=(r.pack.fusionRecipes??[]).find(x=>[keepId,a.name].includes(x.a)&&[removeId,b.name].includes(x.b)||[keepId,a.name].includes(x.b)&&[removeId,b.name].includes(x.a));
  let result=keepId;
  if(recipe){
    const card=typeof recipe.result==='object'?recipe.result:Object.values(r.cards).find(c=>c.kind==='trait'&&(c.traitId===recipe.result||c.name===recipe.result))??(r.pack.fusionTraits??[]).find(c=>c.name===recipe.result)??(typeof recipe.result==='string'?{name:recipe.result,text:'효과 준비 중',effects:[]}:null);
    if(!card)fail('UNKNOWN_FUSION_RESULT');
    result=card.traitId??`${r.pack.id}.fusion.${Object.keys(r.cards).length}`;
    if(result===r.coreId)fail('INVALID_TRAIT_MATERIAL');
    r.cards[result]={...clone(card),traitId:result,kind:'trait'};
  }
  const rarity=RARITY_ORDER[Math.max(RARITY_ORDER.indexOf(a.rarity),RARITY_ORDER.indexOf(b.rarity))];
  if(r.c29)for(const [k,v] of Object.entries(r.c29.bindings))if(v===removeId||v===keepId&&result!==keepId)delete r.c29.bindings[k];
  r.cards[result].rarity=rarity;delete ranks[keepId];delete ranks[removeId];ranks[result]=Math.max(rank,ranks[result]??0);
  const poolCard=r.pool.traits.find(t=>t.traitId===result);if(poolCard)poolCard.rarity=rarity;
  else r.pool.traits.push({traitId:result,ownershipType:'PUBLIC',rarity,rankMax:5,stageTags:['EARLY','MID','LATE'],affinityTags:[],roleTags:[],experienceTags:[]});
  syncPoolFingerprint(r);return result;
}
export function syncPoolFingerprint(r){const stable=v=>Array.isArray(v)?`[${v.map(stable).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`:JSON.stringify(v);r.track.poolFingerprint=stable(r.pool);}
export function autoEquipCampaignTactics(s,id){const r=s.campaignGrowth.officers[id];r.equippedTacticIds=officerEffectCards(s,id,{tactics:true}).filter(c=>!r.c29||c.traitId!==r.representativeId).sort((a,b)=>Number(tacticIsDamage(b))-Number(tacticIsDamage(a))||Number(b.traitId===r.representativeId)-Number(a.traitId===r.representativeId)||a.traitId.localeCompare(b.traitId)).slice(0,CAMPAIGN_TACTIC_SLOTS).map(c=>c.traitId);}
export function tacticLoadoutReason(s,id){
  const o=s.officers[id];if(s.phase!=='PLAYER'||s.gameResult||o?.allegianceFactionId!==s.playerFactionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE')return '내 차례의 소속 장수만 변경 가능';
  if(Object.values(s.armies).some(a=>a.commanderId===id&&a.tacticUsedTurn===s.turn))return '이번 턴 전법을 이미 사용함';
  return null;
}
export function applyTacticLoadout(s,{officerId:id,traitId,equip}){
  const r=s.campaignGrowth.officers[id];if(tacticLoadoutReason(s,id))fail('TACTIC_LOADOUT_LOCKED');
  if(r?.c29&&traitId===r.representativeId)fail('C29_SIGNATURE_SEPARATE_SLOT');
  if(!r||!officerEffectCards(s,id,{tactics:true}).some(c=>c.traitId===traitId))fail('TACTIC_NOT_LEARNED');
  if(typeof equip!=='boolean')fail('INVALID_TACTIC_LOADOUT');
  if(equip&&!r.equippedTacticIds.includes(traitId)){if(r.equippedTacticIds.length>=CAMPAIGN_TACTIC_SLOTS)fail('TACTIC_SLOTS_FULL');r.equippedTacticIds.push(traitId);}
  if(!equip)r.equippedTacticIds=r.equippedTacticIds.filter(k=>k!==traitId);
  return s;
}
function migrateGrowthRecord(s,id){
  const r=s.campaignGrowth.officers[id];
  if(r.rarityVersion!==2){
    const old={COMMON:'COMMON',RARE:'UNCOMMON',HEROIC:'RARE',LEGENDARY:'EPIC',MYTHIC:'LEGENDARY'};
    for(const t of r.pool.traits)t.rarity=old[t.rarity]??t.rarity;
    // Pack cards already had pack grades; only engine pools had the old mapping.
    for(const c of Object.values(r.cards))c.rarity=rarityMap[c.rarity]??'COMMON';
    for(const d of Object.values(r.track.draftsById))for(const list of [d.offered,d.eligibleCandidateSnapshot])for(const c of list??[])for(const key of ['rarity','actualRarity','rolledRarity'])if(c[key])c[key]=old[c[key]]??c[key];
    syncPoolFingerprint(r);r.rarityVersion=2;
  }
  if(r.commonTraitsVersion!==2){
    const built=buildCampaignGrowthPool(r.pack);
    for(const t of built.pool.traits)if(t.traitId.includes('.common.')){
      const existing=Object.values(r.cards).find(c=>c.name===built.cards[t.traitId].name);
      if(existing&&!existing.traitId.includes('.common.'))continue;
      r.cards[t.traitId]??=built.cards[t.traitId];
      if(!r.pool.traits.some(x=>x.traitId===t.traitId))r.pool.traits.push(t);
    }
    syncPoolFingerprint(r);r.commonTraitsVersion=2;
  }
  if(c25Enabled(s)){initializeCareer(r);initializeC28(r);const count=r.pool.traits.length;installCareerCards(r);installCommonCombatTactics(r);r.c33Troops??=s.officers[r.pack.id]?.allowedTroops??[];installC33(r);if(count!==r.pool.traits.length)syncPoolFingerprint(r);}
  initializeC29(s,id);syncPoolFingerprint(r);
  if(!r.equippedTacticIds)r.equippedTacticIds=officerEffectCards(s,id,{tactics:true}).slice(0,CAMPAIGN_TACTIC_SLOTS).map(c=>c.traitId);
}

export function potentialAt(value){
  let cursor=value*100;
  for(const entry of CAMPAIGN_GROWTH_TRIAL.potential){cursor-=entry.weight;if(cursor<0)return entry.rank;}
  return 'UR';
}
export const potentialMultiplier=rank=>CAMPAIGN_GROWTH_TRIAL.potential.find(p=>p.rank===rank)?.xpMultiplier??fail('INVALID_CAMPAIGN_POTENTIAL');
// Independent seeded stream: adding an officer or migrating an old save must not
// consume the campaign's combat/morale RNG or change existing officers' rolls.
export function rollPotential(seed,officerId){
  let key=Number(seed)>>>0;
  for(const c of `potential:${officerId}`)key=Math.imul(key^c.charCodeAt(0),16777619)>>>0;
  return potentialAt(createRng(key).next());
}
export function campaignDraftConfig(rank,double=false){
  const multiplier=potentialMultiplier(rank),base=DEFAULT_GROWTH_DRAFT_CONFIG;
  return {...base,...(double?{candidateCount:4,rerollLimit:2}:{}),unselectedCooldownDrafts:0,weights:{...base.weights,max:220,
    affinity:CAMPAIGN_GROWTH_TRIAL.primaryWeight,role:CAMPAIGN_GROWTH_TRIAL.secondaryWeight},rarityWeightsByStage:
    Object.fromEntries(Object.entries(base.rarityWeightsByStage).map(([stage,weights])=>[stage,
      Object.fromEntries(RARITY_ORDER.map((rarity,i)=>[rarity,weights[rarity]*multiplier**i]))]))};
}
function fallbackPack(officer){
  return {id:officer.officerId,name:officer.name,faction:officer.allegianceFactionId,status:'TRIAL',
    stats:statsToOfficerPack(officer.baseStats),primaryClass:'TRIAL:공용',secondaryClass:null,
    uniqueTrait:{name:`${officer.name}의 기초`,text:'시험 고유특기. 효과 미반영.',effects:[]},draftPool:[...Object.values(ABILITY_NAMES).map(name=>({kind:'trait',name:`${name} 기초`,text:'시험 특기. 효과 준비 중.',rarity:'COMMON',classTag:name,effects:[]})),...['돌격','격려','지원'].map(name=>({kind:'tactic',name:`시험 ${name}`,text:'시험 전법. 효과 준비 중.',rarity:'COMMON',effects:[]}))]};
}
export function buildCampaignGrowthPool(pack){
  const coreId=`${pack.id}.unique`;
  const cards={};
  const entries=[{...pack.uniqueTrait,kind:'trait',rarity:pack.uniqueTrait.rarity??'LEGENDARY',classTag:pack.uniqueVersion?pack.uniqueTrait.classTag:pack.primaryClass,core:true},
    ...pack.draftPool.filter(c=>c.kind!=='trait'||c.name!==pack.uniqueTrait.name),
    ...commonTraits.traits.filter(c=>![pack.uniqueTrait,...pack.draftPool].some(p=>p.name===c.name)),
    ];
  const traits=entries.map((card,index)=>{
    const traitId=card.core?coreId:card.id?.startsWith('CT-')?`${pack.id}.common.${card.id}`:`${pack.id}.card.${index}`;
    cards[traitId]={...clone(card),rarity:rarityMap[card.rarity]??'COMMON',traitId};
    // Primary and secondary paths feed the engine's independent affinity/role
    // weighting. Pack class tags are used verbatim, including trial tags.
    return {traitId,ownershipType:card.core?'CORE':'PUBLIC',...(card.core?{ownerCharacterId:pack.id}:{}),
      rarity:rarityMap[card.rarity]??'COMMON',rankMax:5,stageTags:['EARLY','MID','LATE'],
      affinityTags:Array.isArray(card.classTag)?card.classTag:card.classTag?[card.classTag]:[],roleTags:Array.isArray(card.classTag)?card.classTag:card.classTag?[card.classTag]:[],experienceTags:[card.kind==='stat'&&card.stat==='정무'?'GOVERNOR_TURN':'DAMAGE'],
    };
  });
  const representative=Object.values(cards).find(c=>c.kind==='tactic'&&(Array.isArray(c.classTag)?c.classTag.includes('고유'):c.classTag==='고유'))??(pack.status?.includes('TRIAL')?Object.values(cards).find(c=>c.kind==='tactic'):null);
  return {representativeId:representative?.traitId??null,coreId,cards,pool:{poolVersion:`C4.${pack.id}.trial-v1`,sourceType:'PROVIDED_FIXTURE',fixture:true,traits}};
}
export function initializeCampaignGrowth(s,packs=trialPacks){
 if(['v2','v3'].includes(s.mapId))for(const o of Object.values(s.officers)){o.fatigue??=0;o.injury??=null;}
  s.campaignGrowth??={version:1,officers:{},log:[]};
  for(const o of Object.values(s.officers).sort((a,b)=>a.officerId.localeCompare(b.officerId))){
    if(s.campaignGrowth.officers[o.officerId]){migrateGrowthRecord(s,o.officerId);continue;}
    const pack=overlayUniquePack(s,packs[o.officerId]??fallbackPack(o)),built=buildCampaignGrowthPool(pack);
    const profile={characterId:o.officerId,coreTraitId:built.coreId,
      controllerType:o.allegianceFactionId===s.playerFactionId?'PLAYER':'AI',
      affinityTags:classTags(pack.primaryClass),level:1};
    s.campaignGrowth.officers[o.officerId]={potential:rollPotential(s.campaignSeed,o.officerId),
      status:pack.status?.includes('TRIAL')?'TRIAL':'PACK',pack,...built,xp:0,totalXp:0,sources:{},...(['v2','v3'].includes(s.mapId)&&s.trialRules?.growth!=='legacy'?{xpCurveVersion:'174b'}:{}),
      track:createGrowthTrack({campaignId:`C4.${s.campaignSeed}`,pool:built.pool,characters:{[o.officerId]:profile}})};
    const r=s.campaignGrowth.officers[o.officerId];if(r.representativeId)r.track.growthStates[o.officerId].ownedTraitRanks[r.representativeId]=1;
    if(c25Enabled(s)){initializeCareer(r);initializeC28(r);const count=r.pool.traits.length;installCareerCards(r);installCommonCombatTactics(r);r.c33Troops=o.allowedTroops??[];installC33(r);if(count!==r.pool.traits.length)syncPoolFingerprint(r);}
    r.commonTraitsVersion=2;r.rarityVersion=2;r.equippedTacticIds=r.representativeId?[r.representativeId]:[];initializeC29(s,o.officerId);syncPoolFingerprint(r);
  }
  return s;
}
const growthState=(record,id)=>record.track.growthStates[id];
export function campaignOfficerGrowth(s,id){
  const r=s.campaignGrowth?.officers[id];if(!r)return null;
  return {potential:r.potential,status:r.status,cards:[...officerEffectCards(s,id),...officerEffectCards(s,id,{tactics:true}).map(c=>c29TacticCard(s,id,c))],level:growthState(r,id).level,xp:r.xp,
    ...(c25Enabled(s)?{trace:clone(r.trace),titles:clone(r.titles),c28:clone(r.c28),...(r.c29?{signature:{traitId:r.representativeId,gauge:r.c29.gauge,max:100},awakenings:r.c29.awakenings.map(({id,name,text})=>({id,name,text}))}:{} )}:{}),totalXp:r.totalXp,nextXp:campaignNextXp(r,growthState(r,id).level),ownedTraitRanks:clone(growthState(r,id).ownedTraitRanks),traitSlots:CAMPAIGN_TRAIT_SLOTS,traitCount:officerEffectCards(s,id).length,equippedTacticIds:[...r.equippedTacticIds]};
}
// A military-order draft is a confirmed reward, not a synthetic level entitlement.
export function grantCampaignTacticDraft(s,id,sourceEventId){
 const r=s.campaignGrowth.officers[id];if(!r)return false;
 const draftId=`REWARD.${id}.${sourceEventId}`;if(r.track.draftsById[draftId])return true;
 const current=growthState(r,id),level=current.level;
 const pool={...r.pool,traits:r.pool.traits.filter(t=>r.cards[t.traitId]?.kind==='tactic'&&c33Eligible(r,r.cards[t.traitId])&&t.traitId!==r.representativeId&&(t.rarity!=='MYTHIC'||level>=10))};
 const generated=createGrowthDraft({draftId,sourceEventId,character:r.track.characterProfiles[id],state:current,context:{levelAfter:Math.max(2,level),roleTags:[],situationTags:['ORDER_REWARD'],experienceTraces:[]},pool,seed:s.campaignSeed,rngState:r.track.draftsById[r.track.draftOrder.at(-1)]?.drawState.after??null,config:campaignDraftConfig(r.potential)});
 if(generated.draft.state!=='OFFERED')return false;
 generated.draft.orderReward=true;r.track.draftsById[draftId]=generated.draft;r.track.draftOrder.push(draftId);r.track.growthStates[id]=generated.nextState;
 validateGrowthTrack(r.track);return true;
}
export function pendingCampaignDraft(s){
  if(s.phase!=='PLAYER')return null;
  for(const [id,r] of Object.entries(s.campaignGrowth?.officers??{})){
    if(s.wanderers?.[id])continue;
    const o=s.officers[id];
    if(o.allegianceFactionId!==s.playerFactionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE')continue;
    const draft=r.track.draftOrder.map(k=>r.track.draftsById[k]).find(d=>d.state==='OFFERED');
    if(draft)return {officerId:id,draft:clone(draft),cards:draft.offeredIds.map(k=>({...clone(r.cards[k]),
      ...(c25Enabled(s)?{sourceText:r.cards[k].sourceText??(r.cards[k].kind==='tactic'?'전투 전법':k===r.coreId?'고유 특기':'공용 전투 특기')} :{}),
      ...(r.cards[k].modifier?{bindingTargets:c29BindingTargets(s,id,r.cards[k])}:{}),...(draft.c29?.awakening?{slot:r.cards[k].branch,rerollsRemaining:r.cards[k].branch==='wild'&&!draft.c29.rerolled?1:0}:{}),
      ...(draft.c28?{slot:draft.offered.find(t=>t.traitId===k)?.slot,sourceText:draft.offered.find(t=>t.traitId===k)?.sourceText,rerollsRemaining:(draft.offered.find(t=>t.traitId===k)?.rerollsRemaining??0)+draft.c28.bonusRerolls,replace:!!draft.offered.find(t=>t.traitId===k)?.replace}:{}),rank:growthState(r,id).ownedTraitRanks[k]??0})),status:r.status};
  }
  return null;
}
function pick(s,id,draft,traitId,resolution=null,tacticId=null){
  const r=s.campaignGrowth.officers[id],card=r.cards[traitId];
  if(!draft.offeredIds.includes(traitId))fail('DRAFT_SELECTION_NOT_OFFERED');
  if(card.modifier&&r.c29&&Object.entries(r.c29.bindings).some(([k,v])=>v===traitId&&k!==tacticId))fail('C29_REBIND_REQUIRED');
  if(card.modifier&&(!tacticId||!c29BindingTargets(s,id,card).includes(tacticId)))fail('INVALID_C29_BINDING');
  if(needsTraitResolution(s,id,traitId)){
    const choices=Array.isArray(resolution)?resolution:[resolution];for(const choice of choices){if(!needsTraitResolution(s,id,traitId))break;resolveTraitSpace(s,id,choice);}
    if(needsTraitResolution(s,id,traitId))fail('TRAIT_SLOT_RESOLUTION_REQUIRED');
  }
  const result=applyTrackedDraftAction(r.track,{requestId:`PICK.${draft.draftId}.${draft.offerRevision}`,
    draftId:draft.draftId,expectedRevision:draft.offerRevision,action:'PICK',selectedTraitId:traitId});
  r.track=result.state;domesticGovernance(s);
  if(!result.replayed){selectedC28(s,id,draft,traitId);selectedC29(s,id,draft,traitId,tacticId);syncPoolFingerprint(r);}
  if(!result.replayed&&card.kind==='stat'){
    const key=abilityToEngine(card.stat);
    s.officers[id].baseStats[key]=s.mapId==='v1'?Math.min(100,s.officers[id].baseStats[key]+card.amount):s.officers[id].baseStats[key]+card.amount;
  }
  if(!result.replayed&&card.kind==='tactic'){
    if(r.equippedTacticIds.length<CAMPAIGN_TACTIC_SLOTS&&!r.equippedTacticIds.includes(traitId))r.equippedTacticIds.push(traitId);
    else if(!r.equippedTacticIds.includes(traitId))s.campaignGrowth.log.push({turn:s.turn,officerId:id,text:`${card.name}: 전법 보관 (장착 칸이 가득 참)`});
  }
  if(!result.replayed&&card.c33){s.c33??={};s.c33.selected??={};s.c33.selected[card.id]=(s.c33.selected[card.id]??0)+1;}
  if(!result.replayed&&c25Enabled(s)&&card.domestic){s.c26??={counts:{},selected:{}};s.c26.selected[card.rarity]=(s.c26.selected[card.rarity]??0)+1;}
  if(!result.replayed&&c25Enabled(s)&&card.title)s.c25TitleCardsSelected=(s.c25TitleCardsSelected??0)+1;
  if(!result.replayed)s.campaignGrowth.log.push({turn:s.turn,officerId:id,traitId,kind:card.kind,
    rank:result.result.ownedTraitRanks[traitId],text:`${s.officers[id].name}: ${card.name} ${result.result.ownedTraitRanks[traitId]}단계${card.kind!=='stat'&&cardEffectPending(card)?' · 효과 준비 중':''}`});
  // Display-only history cap (trial value); source/replay ledgers stay intact.
  s.campaignGrowth.log=s.campaignGrowth.log.slice(-120);
  // Several level entitlements can queue before the first player choice. Keep
  // subsequent offers legal when a previous choice just reached rank 5.
  for(const key of r.track.draftOrder){
    const queued=r.track.draftsById[key],current=growthState(r,id);
    if(queued.state==='OFFERED'&&queued.c29?.awakening){composeC29Draft(s,id,queued);syncPoolFingerprint(r);continue;}
    if(queued.state!=='OFFERED'||!queued.offeredIds.some(k=>(current.ownedTraitRanks[k]??0)>=5)&&!resolution)continue;
    const generated=createGrowthDraft({draftId:queued.draftId,sourceEventId:queued.sourceEventId,
      character:r.track.characterProfiles[id],state:{...current,nextDraftIndex:queued.draftIndex,traitOfferCooldowns:{}},
      context:queued.contextSnapshot,pool:c28Enabled(s)?c28Eligible(s,id,(queued.orderReward?{...r.pool,traits:r.pool.traits.filter(t=>r.cards[t.traitId]?.kind==='tactic'&&t.traitId!==r.representativeId&&c33Eligible(r,r.cards[t.traitId])&&(t.rarity!=='MYTHIC'||current.level>=10))}:draftPoolForLevel(r,queued.contextSnapshot.levelAfter)),queued.contextSnapshot.levelAfter,c=>!(c.effects??[]).some(e=>e.op==='RULE'&&!campaignEffectValid(e,c))):(queued.orderReward?{...r.pool,traits:r.pool.traits.filter(t=>r.cards[t.traitId]?.kind==='tactic'&&t.traitId!==r.representativeId&&c33Eligible(r,r.cards[t.traitId])&&(t.rarity!=='MYTHIC'||current.level>=10))}:draftPoolForLevel(r,queued.contextSnapshot.levelAfter)),seed:queued.drawState.seed,rngState:queued.drawState.before,config:{...campaignDraftConfig(r.potential,queued.ruleDoubleDraft),...(queued.c26Extra?{candidateCount:campaignDraftConfig(r.potential,queued.ruleDoubleDraft).candidateCount+queued.c26Extra}:{}),...(queued.contextSnapshot.civilRatio!==undefined&&draftKindForLevel(queued.contextSnapshot.levelAfter)==='trait'?{civilRatio:queued.contextSnapshot.civilRatio}:{})}});
    if(c28Enabled(s)&&!queued.orderReward){generated.draft.ruleDoubleDraft=queued.ruleDoubleDraft;generated.draft.c26Extra=queued.c26Extra;composeC28Draft(s,id,generated.draft);composeC29Draft(s,id,generated.draft);}
    for(const field of ['offered','offeredIds','eligibleCandidateSnapshot','drawState',...(generated.draft.c28?['c28','rerollLimit']:[])])queued[field]=generated.draft[field];
  }
}
export function rankCampaignAiDraft(r,ids){
 const grades=['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'];
 const affinity=c=>Number(c.traitId===r.coreId||c.ownershipType==='CORE'||(Array.isArray(c.classTag)?c.classTag:[c.classTag]).includes('고유'))*2+Number((Array.isArray(c.classTag)?c.classTag:[c.classTag]).some(tag=>[r.pack.primaryClass,r.pack.secondaryClass].filter(Boolean).includes(tag)));
 return [...ids].sort((a,b)=>grades.indexOf(r.cards[b].rarity)-grades.indexOf(r.cards[a].rarity)||affinity(r.cards[b])-affinity(r.cards[a])||a.localeCompare(b));
}
export function resolveCampaignAiDrafts(s,{autoPlayer=false}={}){
  for(const [id,r] of Object.entries(s.campaignGrowth?.officers??{})){
    if(s.wanderers?.[id])continue;
    if(!autoPlayer&&s.officers[id].allegianceFactionId===s.playerFactionId&&s.officers[id].lifeState==='ALIVE'&&s.officers[id].captivityState==='FREE')continue;
    for(const key of r.track.draftOrder){
      const d=r.track.draftsById[key];if(d.state!=='OFFERED')continue;
      // Stable trial choice; trait overflow merges the lowest-ranked two.
      const chosen=c29AiChoice(r,d,rankCampaignAiDraft(r,d.offeredIds));
      if(!chosen)continue;
      while(needsTraitResolution(s,id,chosen)){const traits=officerEffectCards(s,id).filter(c=>c.traitId!==r.coreId).sort((a,b)=>a.rank-b.rank||a.traitId.localeCompare(b.traitId));resolveTraitSpace(s,id,{mode:'merge',keepId:traits[0].traitId,removeId:traits[1].traitId});}
      pick(s,id,d,chosen,null,r.cards[chosen].modifier?c29AiBinding(s,id,chosen):null);
      autoEquipCampaignTactics(s,id);
    }
  }
  return s;
}
export function applyCampaignDraftCommand(s,command){
  const pending=pendingCampaignDraft(s);
  if(!pending||command.draftId!==pending.draft.draftId)fail('INVALID_CAMPAIGN_DRAFT');
  const {officerId:id,draft}=pending,r=s.campaignGrowth.officers[id];
  if(command.type==='DRAFT_PICK')pick(s,id,draft,command.traitId,command.resolution,command.tacticId);
  else if(command.type==='DRAFT_REROLL'&&draft.c29?.awakening){rerollC29(s,id,r.track.draftsById[draft.draftId],command.traitId);syncPoolFingerprint(r);validateGrowthTrack(r.track);}
  else if(command.type==='DRAFT_REROLL'&&draft.c28){
    r.track.draftsById[draft.draftId]=rerollC28Draft(s,id,draft,command.traitId);validateGrowthTrack(r.track);
  }else if(command.type==='DRAFT_REROLL'){
    const config={...campaignDraftConfig(r.potential,draft.ruleDoubleDraft),...(draft.c26Extra?{candidateCount:campaignDraftConfig(r.potential,draft.ruleDoubleDraft).candidateCount+draft.c26Extra}:{}),...(draft.contextSnapshot.civilRatio!==undefined&&draftKindForLevel(draft.contextSnapshot.levelAfter)==='trait'?{civilRatio:draft.contextSnapshot.civilRatio}:{})};
    // Draw up to three alternatives; a small pack may offer fewer.
    if(draft.eligibleCandidateSnapshot.filter(c=>!draft.offeredIds.includes(c.traitId)).length<1)fail('REROLL_NO_ALTERNATIVES');
    const result=rerollGrowthDraft({draft,state:growthState(r,id),config});
    r.track.draftsById[draft.draftId]=result.draft;r.track.growthStates[id]=result.nextState;
    validateGrowthTrack(r.track);
  }else fail('INVALID_CAMPAIGN_DRAFT_COMMAND');
  return s;
}
// Only confirmed campaign results call this adapter. They are not forged
// strategic training events: retain source identity, content conflict detection,
// exactly-once awards, versioned XP thresholds and the existing level cap.
export function creditCampaignGrowth(s,{eventId,officerId,kind,amount,fixed=false}){
  initializeCampaignGrowth(s);
  if(!['DAMAGE','COUNTER','PURSUIT','KILL','CAPTURE','GOVERNOR_TURN',...(['v2','v3'].includes(s.mapId)?['DEJA_VU','RETURN']:[]),...(c25Enabled(s)?[...CAREER_DATA.draftRule.civilSources,'DEFEAT','SURVIVAL']:[])].includes(kind))fail('UNSUPPORTED_CAMPAIGN_XP_SOURCE');
  if(!/^[A-Za-z0-9._:-]+$/.test(eventId)||!Number.isFinite(amount)||amount<0)fail('INVALID_CAMPAIGN_XP_SOURCE');
  const r=s.campaignGrowth.officers[officerId];if(!r)fail('UNKNOWN_CAMPAIGN_GROWTH_OFFICER');
  const fingerprint=JSON.stringify({officerId,kind,amount,...(fixed?{fixed:true}:{})});
  if(r.sources[eventId]){if(r.sources[eventId]!==fingerprint)fail('CONFLICTING_CAMPAIGN_XP_SOURCE');return s;}
  r.sources[eventId]=fingerprint;
  const state=growthState(r,officerId);
  if(state.level===GROWTH_PROGRESS_TRIAL.maxLevel)return s;
  const recipient=Object.values(s.armies).find(a=>a.commanderId===officerId&&castleArmyActive(s,a));
  const mentor=recipient&&Object.values(s.armies).some(a=>a.armyId!==recipient.armyId&&a.factionId===recipient.factionId&&castleArmyActive(s,a)&&hexDistance(s.tiles[a.tileId],s.tiles[recipient.tileId])===1&&hasCampaignRule(s,a.armyId,'MENTOR'))?1.5:1;
  const captureScale=kind==='CAPTURE'?campaignGrowthTrial(s).captureXp/CAMPAIGN_GROWTH_TRIAL.captureXp:1;
  let xp=Math.round(amount*captureScale*c29XpFactor(s,officerId)*mentor*potentialMultiplier(r.potential)*Math.max(0,1+effectModifiers(s,Object.values(s.armies).find(a=>a.commanderId===officerId)?.armyId??officerId,[kind==='COUNTER'?'ON_COUNTER':kind==='KILL'?'ON_KILL':kind==='CAPTURE'?'ON_CAPTURE_CITY':kind==='GOVERNOR_TURN'?'TURN_SETTLE':'ON_ATTACK']).XP_MOD/100));
  xp=fixed?Math.round(amount):Math.round(xp*uniqueXpFactor(s,officerId)*(r.c33Loss?1.3:1));
  xp=Math.round(xp*campaignCatchupFactor(s,officerId));
  if(c25Enabled(s)&&kind==='DEFEAT'){const key=String(s.turn);xp=Math.min(xp,Math.max(0,C25.lossCap-(r.lossXpByTurn[key]??0)));r.lossXpByTurn[key]=(r.lossXpByTurn[key]??0)+xp;}
  r.totalXp+=xp;const debt=Math.min(xp,r.c29?.xpDebt??0);if(r.c29)r.c29.xpDebt=(r.c29.xpDebt??0)-debt;r.xp+=xp-debt;
  if(c25Enabled(s)){r.levelSources[kind]=(r.levelSources[kind]??0)+xp;r.careerXpTotals[kind]=(r.careerXpTotals[kind]??0)+xp;}
  while(growthState(r,officerId).level<GROWTH_PROGRESS_TRIAL.maxLevel&&r.xp>=campaignNextXp(r,growthState(r,officerId).level)){
    const previous=clone(growthState(r,officerId)),levelAfter=previous.level+1;
    r.xp-=campaignNextXp(r,previous.level);
    // One source may cross several thresholds, so give each level a stable ID.
    const sourceEventId=`${eventId}.L${levelAfter}`;
    const tag=CAREER_DATA.draftRule.civilSources.includes(kind)?'GOVERNOR_TURN':'DAMAGE';
    const related=Object.entries(r.sources).filter(([,v])=>{
      const k=JSON.parse(v).kind;return tag==='GOVERNOR_TURN'?CAREER_DATA.draftRule.civilSources.includes(k):['DAMAGE','COUNTER','PURSUIT','KILL'].includes(k);
    }).map(([key])=>key);
    const sourceTotal=Object.values(r.levelSources??{}).reduce((n,v)=>n+v,0),civilTotal=CAREER_DATA.draftRule.civilSources.reduce((n,k)=>n+(r.levelSources?.[k]??0),0);
    const context={...(c25Enabled(s)?{civilRatio:sourceTotal?civilTotal/sourceTotal:0}:{}),levelAfter,roleTags:classTags(r.pack.secondaryClass),situationTags:[kind],
      experienceTraces:[{tag,validContributions:related.length,sourceEventIds:related}],observedSourceEventIds:[eventId]};
    const entitlement={entitlementId:`ENT.${officerId}.L${levelAfter}`,sourceEventId,sourceKind:'CONFIRMED_SOURCE_EVENT',sourceVerified:true,
      characterId:officerId,levelBefore:previous.level,levelAfter,rngSeed:s.campaignSeed,
      rngState:r.track.draftsById[r.track.draftOrder.at(-1)]?.drawState.after??null,context};
    if(c30Learn(s,officerId))syncPoolFingerprint(r);
    const granted=grantGrowthEntitlement(r.track,{requestId:`REQ.${sourceEventId}`,entitlement,pool:r.pool});
    // The track owns entitlement ordering; the draft engine owns weighted rolls.
    const double=Object.values(s.armies).some(a=>a.commanderId===officerId&&hasCampaignRule(s,a.armyId,'DOUBLE_DRAFT'));
    const config={...campaignDraftConfig(r.potential,double),...(c25Enabled(s)&&levelAfter===(s.officers[officerId].c26?.firstDraftLevel??2)&&s.officers[officerId].c26?.firstDraftExtra?{candidateCount:campaignDraftConfig(r.potential,double).candidateCount+s.officers[officerId].c26.firstDraftExtra}:{}),...(c25Enabled(s)&&draftKindForLevel(levelAfter)==='trait'?{civilRatio:context.civilRatio}:{})};
    const generated=createGrowthDraft({draftId:granted.draft.draftId,sourceEventId,character:r.track.characterProfiles[officerId],
      state:{...previous,aptitudePoints:previous.aptitudePoints+1},context,pool:c28Enabled(s)?c28Eligible(s,officerId,draftPoolForLevel(r,levelAfter),levelAfter,c=>!(c.effects??[]).some(e=>e.op==='RULE'&&!campaignEffectValid(e,c))):draftPoolForLevel(r,levelAfter),seed:s.campaignSeed,rngState:entitlement.rngState,config});
    r.track=granted.state;generated.nextState.level=levelAfter;generated.draft.ruleDoubleDraft=double;generated.draft.rerollLimit=double?2:1;if(config.candidateCount>campaignDraftConfig(r.potential,double).candidateCount)generated.draft.c26Extra=config.candidateCount-campaignDraftConfig(r.potential,double).candidateCount;
    if(c28Enabled(s)){composeC28Draft(s,officerId,generated.draft);composeC29Draft(s,officerId,generated.draft);syncPoolFingerprint(r);}
    const statsBefore=clone(s.officers[officerId].baseStats);
    applyAutomaticStats(s,officerId,levelAfter);
    uniqueLevel(s,officerId);
    if(['v2','v3'].includes(s.mapId)&&s.trialRules?.growth!=='legacy'){
      const statChanges=Object.fromEntries(Object.values(ABILITY_NAMES).map(label=>{const key=abilityToEngine(label);return [key,{before:statsBefore[key],after:s.officers[officerId].baseStats[key]}];}));
      const changes=Object.entries(statChanges).filter(([,v])=>v.before!==v.after).map(([key,v])=>`${ABILITY_NAMES[key==='strength'?'might':key]} ${v.before} → ${v.after}`);
      s.campaignGrowth.log.push({turn:s.turn,officerId,kind:'LEVEL_UP',levelBefore:previous.level,levelAfter,statChanges,text:`${s.officers[officerId].name}: Lv${previous.level} → Lv${levelAfter}${changes.length?' · '+changes.join(' · '):''}`});
      s.campaignGrowth.log=s.campaignGrowth.log.slice(-120);
    }
    r.track.draftsById[generated.draft.draftId]=generated.draft;r.track.growthStates[officerId]=generated.nextState;
    if(c25Enabled(s)){const carry=r.xp;r.levelSources=Object.fromEntries(Object.entries(r.levelSources).map(([k,v])=>[k,sourceTotal?v*carry/sourceTotal:0]));}
    resolveCampaignAiDrafts(s,{autoPlayer:s.autoPlayer===true});
  }
  if(growthState(r,officerId).level===GROWTH_PROGRESS_TRIAL.maxLevel)r.xp=0;
  return resolveCampaignAiDrafts(s,{autoPlayer:s.autoPlayer===true});
}
export function creditCampaignCombat(s,combat){
  c31Combat(s,combat);
  c30Combat(s,combat);
  if(!combat.tacticId)c29Combat(s,combat);
  if(!s.armies[combat.targetId]){const target=(combat.units??[]).filter(u=>s.armies[u.unitId]?.factionId!==s.armies[combat.attackerId]?.factionId).sort((a,b)=>b.casualties-a.casualties||a.unitId.localeCompare(b.unitId))[0];if(!target)return s;combat={...combat,targetId:target.unitId};}
  const {attackerId,targetId,enemyLoss,allyLoss,sequence}=combat;
  const award=(armyId,kind,amount,suffix)=>creditCampaignGrowth(s,{eventId:`COMBAT.${sequence}.${suffix}`,officerId:s.armies[armyId].commanderId,kind,amount});
  if(c25Enabled(s))recordCampaignCombatCareer(s,combat);
  if(c28Enabled(s))recordC28Combat(s,combat);
  const dealt=enemyLoss+combat.units.filter(u=>u.unitId!==attackerId&&u.unitId!==targetId).reduce((sum,u)=>sum+u.casualties,0);
  const lossSide=c25Enabled(s)?enemyLoss>allyLoss?targetId:allyLoss>enemyLoss?attackerId:null:null;
  const kills=combat.units.filter(u=>u.postBattleCount===0);
  const winner=lossSide===attackerId?targetId:attackerId;
  const tuning=campaignGrowthTrial(s);
  const battleXp=Math.max(dealt,allyLoss)*tuning.damageXp+kills.filter(u=>(u.unitId===attackerId?targetId:attackerId)===winner).length*tuning.killXp;
  if(lossSide)award(lossSide,'DEFEAT',battleXp*C25.lossRate,'defeat');
  if(dealt&&lossSide!==attackerId)award(attackerId,combat.kind==='PURSUIT'?'PURSUIT':'DAMAGE',dealt*tuning.damageXp,'damage');
  if(allyLoss&&lossSide!==targetId)award(targetId,'COUNTER',allyLoss*tuning.damageXp,'counter');
  for(const u of kills){const killer=u.unitId===attackerId?targetId:attackerId;if(killer!==lossSide)award(killer,'KILL',tuning.killXp,`kill.${u.unitId}`);}
  return s;
}
export function validateCampaignGrowth(s){
  if(!s.campaignGrowth||s.campaignGrowth.version!==1)fail('INVALID_CAMPAIGN_GROWTH');
  for(const [id,r] of Object.entries(s.campaignGrowth.officers)){
    validateGrowthTrack(r.track);potentialMultiplier(r.potential);
    if(!Array.isArray(r.equippedTacticIds)||r.equippedTacticIds.length>CAMPAIGN_TACTIC_SLOTS||new Set(r.equippedTacticIds).size!==r.equippedTacticIds.length||r.equippedTacticIds.some(k=>r.cards[k]?.kind!=='tactic'||!growthState(r,id).ownedTraitRanks[k]))fail('INVALID_TACTIC_LOADOUT');
    if(c25Enabled(s))validateCareer(s,id,r);validateC28(s,id,r);validateC29(s,id);
    const level=growthState(r,id).level;
    if(!(s.officers[id]??s.wanderers?.[id])||level>30||!Number.isSafeInteger(r.xp)||r.xp<0||
      (level===30?r.xp!==0:r.xp>=campaignNextXp(r,level))||
      !Object.values(growthState(r,id).ownedTraitRanks).every(rank=>Number.isInteger(rank)&&rank>=1&&rank<=5)||
      !(growthState(r,id).ownedTraitRanks[r.coreId]>=1))fail('INVALID_CAMPAIGN_GROWTH_RECORD');
  }
  return s;
}

// C18 wire projection only: runtime records retain their complete definitions.
const growthStable=v=>Array.isArray(v)?`[${v.map(growthStable).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${growthStable(v[k])}`).join(',')}}`:JSON.stringify(v);
function growthDefinitions(pack){
  const built=buildCampaignGrowthPool(pack);
  const extended=clone(built);
  const record={...extended,pack,titles:CAREER_DATA.titles.map(t=>({id:t.id,name:t.name,text:t.text}))};
  installCareerCards(record);installCommonCombatTactics(record);installC33(record);
  return {cards:built.cards,pool:built.pool,fingerprint:growthStable(built.pool),
    ...Object.fromEntries(Object.entries(extended.cards).map(([id,c])=>[`card:${id}`,c])),
    ...Object.fromEntries(extended.pool.traits.map(t=>[`trait:${t.traitId}`,t]))};
}
const definitionIndexes=new WeakMap();
function projectDefinitions(value,defs,decode=false){
  if(decode&&value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'$c18')){
    const base=defs[value.$c18];if(base===undefined)fail('UNKNOWN_CAMPAIGN_CARD_REFERENCE');
    if(!value.keys)return clone(base);
    return Object.fromEntries(value.keys.map(k=>[k,Object.hasOwn(value.values,k)?projectDefinitions(value.values[k],defs,true):clone(base[k])]));
  }
  if(!decode){
    const encoded=JSON.stringify(value);
    if(!definitionIndexes.has(defs))definitionIndexes.set(defs,new Map(Object.entries(defs).map(([key,base])=>[JSON.stringify(base),key])));
    const reference=definitionIndexes.get(defs).get(encoded);if(reference!==undefined)return {$c18:reference};
    if(value&&typeof value==='object'&&!Array.isArray(value)&&value.traitId){
      const key=`trait:${value.traitId}`,base=defs[key];
      if(base&&Object.keys(base).every(k=>Object.hasOwn(value,k))){
        const values=Object.fromEntries(Object.entries(value).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(base[k])).map(([k,v])=>[k,projectDefinitions(v,defs)]));
        return {$c18:key,keys:Object.keys(value),values};
      }
    }
  }
  if(Array.isArray(value))return value.map(v=>projectDefinitions(v,defs,decode));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,projectDefinitions(v,defs,decode)]));
  return value;
}
export function campaignGrowthForSave(s){
  const growth=clone(s.campaignGrowth);
  for(const [id,r] of Object.entries(growth.officers)){
    const pack=r.pack,canonical=trialPacks[id]??fallbackPack(s.officers[id]??s.wanderers?.[id]);
    const defs=growthDefinitions(pack);
    const projected=projectDefinitions({...r,pack:undefined},defs);
    // Unknown/custom pack definitions must travel with the save.
    if(r.track.poolFingerprint===growthStable(r.pool))projected.track.poolFingerprint={$c18PoolFingerprint:true};
    projected.pack=JSON.stringify(pack)===JSON.stringify(canonical)?{$c18Pack:id}:pack;
    growth.officers[id]=projected;
  }
  return {encoding:'card-refs-v1',...growth};
}
export function restoreCampaignGrowth(s){
  if(s.campaignGrowth?.encoding!=='card-refs-v1')return;
  for(const [id,r] of Object.entries(s.campaignGrowth.officers)){
    const pack=r.pack?.$c18Pack===id?clone(trialPacks[id]??fallbackPack(s.officers[id]??s.wanderers?.[id])):r.pack;
    const restored=projectDefinitions({...r,pack},growthDefinitions(pack),true);
    if(r.track.poolFingerprint?.$c18PoolFingerprint===true)restored.track.poolFingerprint=growthStable(restored.pool);
    s.campaignGrowth.officers[id]=restored;
  }
  delete s.campaignGrowth.encoding;
}

// Confirmed domestic outcomes use the same replay ledger as combat XP.
export function creditCampaignDomestic(s,{officerId,eventId,kind,counts={},amount}){
 if(!c25Enabled(s)||!officerId)return s;
 initializeCampaignGrowth(s);
 const fresh=recordCareer(s,officerId,eventId,counts);
 const defaults={FACILITY_BUILT:C25.facilityXp,SECURITY_RECOVERED:C25.securityXp,RECRUITED:C25.recruitXp,EVENT_DECIDED:C25.eventXp,OCCUPATION_COMPLETED:C25.occupationXp};
 const value=amount??defaults[kind]??0;
 if(fresh&&kind==='OCCUPATION_COMPLETED'){s.xpEvents??=[];s.xpEvents.push({eventId,officerId,kind,amount:value});s.xpEvents=s.xpEvents.slice(-120);}
 return creditCampaignGrowth(s,{officerId,eventId,kind,amount:value});
}
export function recordCampaignCombatCareer(s,c){
 if(!c25Enabled(s))return;
 initializeCampaignGrowth(s);
 const a=s.armies[c.attackerId],t=s.armies[c.targetId],key=`CAREER.COMBAT.${c.sequence}`;
 if(c.kind==='CITY'||c.cityId&&c.dealt!==undefined){recordCareer(s,a.commanderId,key,{siegeDamage:c.dealt});return;}
 if(a&&t&&a.factionId!==t.factionId){
  const counts={[`foughtBy:${t.commanderId}`]:1,...(c.charge?{charge:1}:{}),...(c.side==='FLANK'?{flank:1}:c.side==='REAR'?{rear:1}:{}),...(c.kind==='PURSUIT'?{pursuit:1}:{})};
  recordCareer(s,a.commanderId,key,counts);
  const defense=Object.values(s.cities).some(city=>[city.tileId,...(city.footprint?.gates??[])].includes(t.tileId));
  recordCareer(s,t.commanderId,key,{[`foughtBy:${a.commanderId}`]:1,...(c.side==='FRONT'&&t.troopCount>0?{frontHold:1}:{}),...(defense?{cityDefense:1}:{})});
 }
 for(const u of c.units??[]){const army=s.armies[u.unitId];if(!army)continue;
  const strength=army.deploymentStrength??s.personnel?.formations.find(f=>f.formationId===u.unitId)?.targetStrength??u.preBattleCount;
  if(u.postBattleCount>0&&u.preBattleCount>=strength*C25.survivalRatio&&u.postBattleCount<strength*C25.survivalRatio&&u.casualties>0){
   const fresh=recordCareer(s,army.commanderId,`${key}.survived.${u.unitId}`,{survived:1});
   if(fresh)creditCampaignGrowth(s,{eventId:`COMBAT.${c.sequence}.survived.${u.unitId}`,officerId:army.commanderId,kind:'SURVIVAL',amount:C25.survivalXp});
  }
 }
 for(const change of c.moraleChanges??[])if(change.to==='ROUTING'&&change.from!=='ROUTING')recordCareer(s,s.armies[change.armyId]?.commanderId,`${key}.routed.${change.armyId}`,{routed:1});
}
