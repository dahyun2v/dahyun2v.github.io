// Non-faction enemies live outside the official roster/personnel/terminal sets.
// Their attacks debit the ordinary conserved personnel ledger, never mint troops.
import china from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import {FLOW,flowEnabled,flowCitySpec,recordFlowMilestone} from './campaign-flow.mjs';
import {hexDistance,boardNeighbors,tileId,movementTicks} from './map-primitives.mjs';
import {parentTroop} from './campaign-special-troops.mjs';
import {diplomacyHostile} from './campaign-diplomacy.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {canMainAction,consumeMainAction,effectModifiers,healCampaignTroops,surviveRule} from './campaign-effects.mjs';
import {campaignAttackPower,campaignDefensePower} from './campaign-abilities.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {classifyBattleCasualties} from './military-personnel-ledger.mjs';
import {settleCampaignPayloads} from './campaign-result-bridge.mjs';
import {domesticV3Enabled,v3Grade} from './domestic-v3.mjs';
import {syncResearchCities,cityPopulationCapacity} from './campaign-roster.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';

const cfg=FLOW.neutral;
const forbiddenSites=new Set([...china.roads.flat(),...china.passes.flatMap(p=>p.tiles),...china.landmarks.flatMap(l=>l.footprint),...china.places.map(p=>p.at)].map(at=>at.join(',')));
export const bandOwner=id=>`band:${id}`;
export const isBandOwner=id=>typeof id==='string'&&id.startsWith('band:');
export const liveBandUnits=s=>Object.values(s.flow?.units??{}).filter(a=>a.troopCount>0);
export const liveFlowSites=s=>Object.values(s.flow?.sites??{}).filter(n=>!n.cleared);
const distance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
const active=(s,a)=>a&&a.troopCount>0&&castleArmyActive(s,a);
const bandRule=n=>FLOW.bands[n.band]??{troop:'militia',behavior:'yellowTurban',raidEvery:cfg.yellowTurban.growEvery};
export const bandPacified=(s,n)=>n.tributeUntil>s.turn;
export function addBandUnit(s,n,{troops,tile=n.tileId}={}){
 const id=`band:${n.id}:${++s.flow.unitSequence}`;
 const a={armyId:id,factionId:bandOwner(n.band),siteId:n.id,tileId:tile,homeTileId:n.tileId,troopType:bandRule(n).troop,troopCount:troops??(n.band==='yellowTurban'?cfg.yellowTurban.troops:cfg.initialTroops),name:`${n.name} 두목`,raidUntil:0};
 s.flow.units[id]=a;return a;
}
export function addBandSite(s,spec,{units=cfg.initialUnits}={}){
 const n={id:spec.id,name:spec.name,band:spec.band,tileId:spec.tileId??spec.at.join(','),kind:'NEST',durability:cfg.durability,cleared:false,bornTurn:s.turn,tributeUntil:0};
 s.flow.sites[n.id]=n;for(let i=0;i<units;i++)addBandUnit(s,n);return n;
}
export function initializeNeutralFlow(s){
 if(!flowEnabled(s)||s.flow.sites)return s;
 Object.assign(s.flow,{sites:{},units:{},occupiedCities:{},unitSequence:0,siteSequence:0,combatSequence:0,proficiency:{},proficiencyReceipts:{},rewards:{}});
 if(s.mapId==='china')for(const n of [...FLOW.yellowTurbanNests,...FLOW.barbarianCamps])if(s.tiles[n.at.join(',')])addBandSite(s,n);
 return s;
}
export function flowNearestCity(s,fid,at){return Object.values(s.cities).filter(c=>c.ownerFactionId===fid&&!s.flow.occupiedCities[c.cityId]).sort((a,b)=>distance(s,at,a.tileId)-distance(s,at,b.tileId)||a.cityId.localeCompare(b.cityId))[0];}
export function flowReward(s,fid,at,{food=0,gold=0,prestige=0,horses=0,herbs=0,population=0}={}){
 const f=s.factions[fid],c=flowNearestCity(s,fid,at);if(!f)return;
 if(domesticV3Enabled(s)){f.granary+=food;f.treasury+=gold;if(horses)f.armory.horse+=horses;}
 else {if(c)c.foodStock=Math.min(c.foodCapacity,c.foodStock+food/100);f.flowGold=(f.flowGold??0)+gold;if(c&&horses)c.specialResources.horses+=horses;}
 f.prestige+=prestige;
 if(c&&population){c.population=Math.min(cityPopulationCapacity(s,c),c.population+population);if(domesticV3Enabled(s))c.people+=population*cfg.peoplePerPopulation;syncResearchCities(s);if(domesticV3Enabled(s))c.grade=v3Grade(c).id;}
 if(herbs){s.flow.rewards[fid]??={};s.flow.rewards[fid].herbs=(s.flow.rewards[fid].herbs??0)+herbs;}
 if(s.terminal)syncCampaignAdministrativeTerminal(s);
}
function debitGold(s,fid,amount){const f=s.factions[fid],key=domesticV3Enabled(s)?'treasury':'flowGold';if((f?.[key]??0)<amount)throw Error('FLOW_GOLD_REQUIRED');f[key]-=amount;}
export function flowTribute(s,{cityId,siteId},fid=s.playerFactionId){
 const c=s.cities[cityId],n=s.flow?.sites?.[siteId];
 if(!flowEnabled(s)||c?.ownerFactionId!==fid||!n||n.cleared||!FLOW.bands[n.band]?.tribute||s.knowledge[fid]?.tiles[n.tileId]==='UNEXPLORED'||distance(s,c.tileId,n.tileId)>cfg.raidRange*2)throw Error('INVALID_FLOW_TRIBUTE');
 debitGold(s,fid,cfg.tributeGold);n.tributeUntil=s.turn+cfg.tributeTurns;
 for(const a of liveBandUnits(s).filter(a=>a.siteId===siteId))a.raidUntil=0;
 s.flow.history.push({type:'TRIBUTE',turn:s.turn,factionId:fid,siteId,until:n.tributeUntil});return s;
}
export function flowHire(s,{cityId,siteId},fid=s.playerFactionId){
 const c=s.cities[cityId],n=s.flow?.sites?.[siteId];
 if(!flowEnabled(s)||c?.ownerFactionId!==fid||!n||n.cleared||!(bandRule(n).behavior==='mercenary'||n.band==='wuhuan'&&bandPacified(s,n))||distance(s,c.tileId,n.tileId)>cfg.raidRange*2||s.knowledge[fid]?.tiles[n.tileId]==='UNEXPLORED')throw Error('INVALID_FLOW_HIRE');
 if(liveBandUnits(s).some(a=>a.siteId===siteId&&a.hiredBy===fid))throw Error('FLOW_ALREADY_HIRED');
 debitGold(s,fid,cfg.mercenaryGold);const a=addBandUnit(s,n);a.hiredBy=fid;a.hiredUntil=s.turn+cfg.mercenaryTurns;n.tributeUntil=Math.max(n.tributeUntil,a.hiredUntil);
 s.flow.history.push({type:'HIRE',turn:s.turn,factionId:fid,armyId:a.armyId,siteId,until:a.hiredUntil});return s;
}
const visible=(s,fid,at)=>s.knowledge[fid]?.tiles[at]==='VISIBLE';
export function flowAttackTargets(s,id){
 const a=s.armies[id];if(!flowEnabled(s)||!active(s,a)||!canMainAction(s,id)||a.morale==='ROUTING')return [];
 // Neutral encounters are adjacent field engagements, using the same action slot.
 return [...liveBandUnits(s).filter(b=>b.hiredBy!==a.factionId&&visible(s,a.factionId,b.tileId)&&distance(s,a.tileId,b.tileId)<=1).map(b=>b.armyId),...liveFlowSites(s).filter(n=>!n.guardOnly&&n.kind!=='HUT'&&visible(s,a.factionId,n.tileId)&&distance(s,a.tileId,n.tileId)<=1&&!liveBandUnits(s).some(b=>b.siteId===n.id&&!b.hiredBy)).map(n=>n.id)];
}
export function flowProficiency(s,id,eventId){
 if(!domesticV3Enabled(s)||s.flow.proficiencyReceipts[eventId])return;
 const a=s.armies[id];if(!a)return;
 const trained=Math.min(a.troopCount,s.flow.proficiency[id]??0);
 s.flow.proficiency[id]=trained+Math.floor((a.troopCount-trained)*cfg.proficiencyRate);s.flow.proficiencyReceipts[eventId]=true;
}
function ownLoss(s,id,loss,eventId){
 const a=s.armies[id],pre=a.troopCount,actual=surviveRule(s,id,Math.min(pre,Math.max(0,loss)),true,[]),post=pre-actual;
 if(!actual)return;
 const f=s.personnel.formations.find(f=>f.formationId===id),dead=Math.round(actual*cfg.permanentLossRatio),unit={unitId:id,preBattleCount:pre,postBattleCount:post,casualties:actual,unitState:post?'COMMANDABLE':'ELIMINATED'};
 s.personnel=classifyBattleCasualties(s.personnel,{operationId:eventId,expectedRevision:s.personnel.revision,snapshot:{format:'combat-battle-result-v1',battleId:eventId,decisionRef:eventId,sourceRevision:s.battleSequence,units:[unit]},allocations:[{unitId:id,formationId:id,wounded:actual-dead,permanentLoss:dead,recoveryNodeId:f.nodeId,woundedLotId:`W.${eventId}`,lossId:`L.${eventId}`}]}).ledger;
 a.troopCount=post;a.woundedCount+=actual-dead;a.deadCount+=dead;
 if(actual>=pre/2)recordFlowMilestone(s,a.factionId,'lostHalfArmy');
 if(!post){a.hp=0;Object.assign(s,settleCampaignPayloads(s,[{transactionId:`RD.${eventId}`,sourceResultId:eventId,globalTick:s.globalTick,defeatedArmyId:id,commanderFate:'ESCAPED',captorFactionId:null}],[]));}
 if(s.terminal)syncCampaignAdministrativeTerminal(s);
}
export function clearBandSite(s,n,a){
 if(n.cleared)return;n.cleared=true;n.clearedBy=a.factionId;n.clearedTurn=s.turn;
 s.flow.factions[a.factionId].clearedNests++;
 const r=FLOW.bands[n.band]?.reward??[];
 flowReward(s,a.factionId,n.tileId,{food:cfg.rewardFood,gold:cfg.rewardGold,prestige:cfg.rewardPrestige,horses:r.includes('명마')?cfg.horseReward:0,herbs:r.includes('약초')?cfg.herbReward:0,population:r.includes('백성(인구)')?cfg.populationReward:0});
 creditCampaignGrowth(s,{officerId:a.commanderId,eventId:`FLOW.CLEAR.${n.id}`,kind:'CLEAR_NEST',amount:cfg.clearXp,fixed:true});
 for(const c of Object.values(s.cities))if(distance(s,c.tileId,n.tileId)<=cfg.yellowTurban.plunderRange)c.securityLevel=Math.max(0,(c.securityLevel??0)-1);
 if(r.includes('산길 정보')){s.flow.rewards[a.factionId]??={};s.flow.rewards[a.factionId].revealedPasses??=[];s.flow.rewards[a.factionId].revealedPasses.push(n.tileId);}
 s.flow.history.push({type:'CLEAR_NEST',turn:s.turn,factionId:a.factionId,siteId:n.id});
}
export function attackNeutral(s,id,targetId){
 if(!flowAttackTargets(s,id).includes(targetId))throw Error('INVALID_FLOW_ATTACK');
 const a=s.armies[id],b=s.flow.units[targetId],n=s.flow.sites[targetId],seq=++s.flow.combatSequence,eventId=`FLOW.BATTLE.${seq}`;
 consumeMainAction(s,id,{attack:true});
 if(n){n.durability=Math.max(0,n.durability-Math.max(1,Math.round(campaignAttackPower(s,a.commanderId)*cfg.damageRate)));if(!n.durability)clearBandSite(s,n,a);return s;}
 const power=campaignAttackPower(s,a.commanderId)*(1+(effectModifiers(s,id,['ON_ATTACK']).DAMAGE_MOD??0)/100),damage=Math.min(b.troopCount,Math.max(1,Math.round(a.troopCount*cfg.damageRate*power/cfg.leader.defense)));
 b.troopCount-=damage;
 const counter=Math.min(a.troopCount,Math.round(b.troopCount*cfg.damageRate*cfg.counterRate*cfg.leader.attack/campaignDefensePower(s,a.commanderId)));
 ownLoss(s,id,counter,eventId);
 creditCampaignGrowth(s,{officerId:a.commanderId,eventId:`${eventId}.DAMAGE`,kind:'DAMAGE',amount:damage*cfg.damageXp});
 if(!b.troopCount)creditCampaignGrowth(s,{officerId:a.commanderId,eventId:`${eventId}.KILL`,kind:'KILL',amount:cfg.killXp});
 flowProficiency(s,id,eventId);
 s.flow.history.push({type:'BAND_COMBAT',turn:s.turn,factionId:a.factionId,armyId:id,targetId,enemyLoss:damage,allyLoss:counter});return s;
}
export function neutralEdge(s,a,from,to){
 const key=[from,to].sort().join('|'),r=s.mapRules;
 return movementTicks({from:s.tiles[from],to:s.tiles[to],troopType:parentTroop(a.troopType),maneuver:cfg.leader.maneuver,edge:{road:r.roads.includes(key),river:r.riverEdges.includes(key),blocked:r.blockedEdges.includes(key),crossing:r.crossings[key]??'none'},tuning:r.tuning,tickDays:s.time.tickDays});
}
function moveBand(s,a,target){
 let budget=cfg.movementTicks;const seen=new Set([a.tileId]);
 while(budget>0&&a.tileId!==target){
  const options=boardNeighbors(s.tiles[a.tileId],s.tiles).map(tileId).filter(id=>!seen.has(id)&&!Object.values(s.armies).some(b=>active(s,b)&&b.tileId===id)&&!Object.values(s.cities).some(c=>c.tileId===id)).map(id=>({id,cost:neutralEdge(s,a,a.tileId,id)})).filter(x=>x.cost!==null&&x.cost<=budget).sort((x,y)=>distance(s,x.id,target)-distance(s,y.id,target)||x.id.localeCompare(y.id));
  const next=options[0];if(!next||distance(s,next.id,target)>=distance(s,a.tileId,target))break;
  a.tileId=next.id;budget-=next.cost;seen.add(a.tileId);
 }
}
export function spawnYellowNest(s,origin,{maxUnits=cfg.initialUnits}={}){
 if(liveFlowSites(s).filter(n=>n.band==='yellowTurban').length>=cfg.yellowTurban.maxNests)return null;
 const sites=liveFlowSites(s),candidates=Object.values(s.tiles).filter(t=>['plain','forest','hill'].includes(t.terrainType)&&!(s.mapId==='china'&&forbiddenSites.has(t.tileId))&&distance(s,t.tileId,origin)<=cfg.yellowTurban.spreadRange&&!Object.values(s.cities).some(c=>distance(s,c.tileId,t.tileId)<=2)&&!sites.some(n=>distance(s,n.tileId,t.tileId)<FLOW.goodyGen.gapFoe)&&!s.mapRules.roads.some(e=>e.split('|').includes(t.tileId))).sort((a,b)=>a.tileId.localeCompare(b.tileId));
 if(!candidates.length)return null;
 return addBandSite(s,{id:`yt-spawn-${++s.flow.siteSequence}`,name:'황건 새 근거지',band:'yellowTurban',tileId:candidates[0].tileId},{units:maxUnits});
}
export function settleNeutralFlow(s){
 if(!flowEnabled(s)||s.gameResult||s.flow.neutralTurn===s.turn)return s;s.flow.neutralTurn=s.turn;
 for(const a of liveBandUnits(s).filter(a=>a.hiredBy)){
  if(a.hiredUntil<=s.turn){delete a.hiredBy;delete a.hiredUntil;continue;}
  const patron=a.hiredBy,targets=Object.values(s.armies).filter(b=>active(s,b)&&diplomacyHostile(s,patron,b.factionId)&&s.knowledge[patron]?.tiles[b.tileId]==='VISIBLE').sort((x,y)=>distance(s,a.tileId,x.tileId)-distance(s,a.tileId,y.tileId)||x.armyId.localeCompare(y.armyId));
  const b=targets[0];if(!b)continue;moveBand(s,a,b.tileId);
  if(distance(s,a.tileId,b.tileId)<=1){ownLoss(s,b.armyId,Math.round(a.troopCount*cfg.damageRate),`FLOW.MERCENARY.${++s.flow.combatSequence}`);a.troopCount=Math.max(0,a.troopCount-Math.round(b.troopCount*cfg.damageRate*cfg.counterRate));}
 }
 const nests=liveFlowSites(s).filter(n=>n.band==='yellowTurban');
 if(s.turn%cfg.yellowTurban.growEvery===0)for(const n of nests){const us=liveBandUnits(s).filter(a=>a.siteId===n.id),max=n.maxUnits??cfg.yellowTurban.maxUnits;if(us.length<max)addBandUnit(s,n);for(const a of us)a.troopCount=Math.min(cfg.yellowTurban.maxTroops,a.troopCount+cfg.yellowTurban.growTroops);}
 if(nests.length&&s.flow.worldPhase<='P2'&&s.turn%cfg.yellowTurban.spreadEvery===0){const unstable=Object.values(s.cities).filter(c=>(c.securityLevel??0)>=2).sort((a,b)=>a.cityId.localeCompare(b.cityId));spawnYellowNest(s,unstable[0]?.tileId??nests[0].tileId);}
 for(const n of liveFlowSites(s).filter(n=>n.kind==='NEST')){
  if(bandPacified(s,n))continue;
  const rule=bandRule(n),region=flowCitySpec(s,Object.values(s.cities).sort((a,b)=>distance(s,a.tileId,n.tileId)-distance(s,b.tileId,n.tileId))[0]).province;
  const nearby=Object.values(s.cities).filter(c=>distance(s,c.tileId,n.tileId)<=cfg.raidRange*(n.invasion?2:1)&&(rule.behavior!=='uprising'||flowCitySpec(s,c).province===region&&(c.securityLevel??0)>=2)).sort((a,b)=>distance(s,a.tileId,n.tileId)-distance(s,b.tileId,n.tileId)||a.cityId.localeCompare(b.cityId));
  if(n.band==='yellowTurban')for(const c of nearby.filter(c=>distance(s,c.tileId,n.tileId)<=cfg.yellowTurban.plunderRange))plunder(s,c,n);
  for(const a of liveBandUnits(s).filter(a=>a.siteId===n.id)){
   if(a.hiredBy){if(s.turn>=a.hiredUntil){delete a.hiredBy;delete a.hiredUntil;}else continue;}
   if(rule.behavior==='holdPass'&&!n.invasion)continue;
   const target=nearby.find(c=>n.band!=='yellowTurban'||c.kind==='minor'&&!Object.values(s.armies).some(b=>active(s,b)&&b.factionId===c.ownerFactionId&&distance(s,b.tileId,c.tileId)<=1));
   if(target&&(n.band==='yellowTurban'||rule.behavior==='uprising'||rule.raidEvery&&s.turn%rule.raidEvery===0||n.invasion))a.raidUntil=s.turn+cfg.raidTurns;
   moveBand(s,a,a.raidUntil>=s.turn&&target?target.tileId:a.homeTileId);
   const victim=Object.values(s.armies).filter(b=>active(s,b)&&distance(s,a.tileId,b.tileId)<=1).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];
   if(victim){const eventId=`FLOW.RAID.${++s.flow.combatSequence}`;ownLoss(s,victim.armyId,Math.round(a.troopCount*cfg.damageRate*cfg.leader.attack/campaignDefensePower(s,victim.commanderId)),eventId);flowProficiency(s,victim.armyId,eventId);}
   if(target&&a.raidUntil>=s.turn&&distance(s,a.tileId,target.tileId)<=1){plunder(s,target,n);if(n.band==='yellowTurban'&&target.kind==='minor'&&!Object.values(s.armies).some(b=>active(s,b)&&distance(s,b.tileId,target.tileId)<=1)&&!s.flow.occupiedCities[target.cityId]){s.flow.occupiedCities[target.cityId]={siteId:n.id,since:s.turn,formerOwner:target.ownerFactionId};s.flow.history.push({type:'YT_OCCUPATION',turn:s.turn,cityId:target.cityId,siteId:n.id});}}
  }
 }
 for(const [id,o] of Object.entries(s.flow.occupiedCities)){const c=s.cities[id],liberator=Object.values(s.armies).find(a=>active(s,a)&&distance(s,a.tileId,c.tileId)<=1);if(liberator&&!liveBandUnits(s).some(a=>!a.hiredBy&&distance(s,a.tileId,c.tileId)<=1)){delete s.flow.occupiedCities[id];s.flow.history.push({type:'YT_LIBERATED',turn:s.turn,cityId:id,factionId:liberator.factionId});}}
 return s;
}
function plunder(s,c,n){
 const fid=c.ownerFactionId;if(!s.factions[fid])return;
 if(domesticV3Enabled(s)){s.factions[fid].granary=Math.max(0,s.factions[fid].granary-cfg.plunderFood);s.factions[fid].treasury=Math.max(0,s.factions[fid].treasury-cfg.plunderGold);}
 else c.foodStock=Math.max(0,c.foodStock-cfg.plunderFood/100);
 s.flow.history.push({type:'PLUNDER',turn:s.turn,factionId:fid,cityId:c.cityId,siteId:n.id});
}
export function neutralView(s,fid){
 if(!flowEnabled(s))return {};
 const seen=id=>s.knowledge[fid]?.tiles[id]&&s.knowledge[fid].tiles[id]!=='UNEXPLORED';
 const known=structuredClone(s.flow.knownSites?.[fid]??{});
 for(const n of Object.values(s.flow.sites))if(visible(s,fid,n.tileId))known[n.id]={id:n.id,name:n.name,kind:n.kind,band:n.band,tileId:n.tileId,cleared:n.cleared,durability:n.durability,tributeUntil:n.tributeUntil,...(n.kind==='HUT'?{goodyKind:n.goodyKind,tier:n.tier}:{})};
 return {sites:Object.values(known).filter(n=>!n.cleared),units:liveBandUnits(s).filter(a=>a.hiredBy===fid||visible(s,fid,a.tileId)).map(a=>structuredClone(a)),occupiedCities:Object.fromEntries(Object.entries(s.flow.occupiedCities).filter(([id])=>visible(s,fid,s.cities[id].tileId)).map(([id,o])=>[id,structuredClone(o)])),proficiency:Object.fromEntries(Object.entries(s.flow.proficiency).filter(([id])=>s.armies[id]?.factionId===fid)),attackTargets:Object.fromEntries(Object.values(s.armies).filter(a=>a.factionId===fid).map(a=>[a.armyId,flowAttackTargets(s,a.armyId)]))};
}
export function validateNeutralFlow(s){
 if(!flowEnabled(s))return;
 if(!s.flow.sites||!s.flow.units||!Number.isSafeInteger(s.flow.unitSequence))throw Error('INVALID_FLOW_NEUTRALS');
 for(const n of Object.values(s.flow.sites))if(!s.tiles[n.tileId]||typeof n.cleared!=='boolean'||!Number.isSafeInteger(n.durability)||n.durability<0)throw Error('INVALID_FLOW_SITE');
 for(const a of Object.values(s.flow.units))if(!isBandOwner(a.factionId)||s.factions[a.factionId]||!s.tiles[a.tileId]||!s.flow.sites[a.siteId]||!Number.isSafeInteger(a.troopCount)||a.troopCount<0)throw Error('INVALID_FLOW_BAND');
 if(liveFlowSites(s).filter(n=>n.band==='yellowTurban').length>cfg.yellowTurban.maxNests)throw Error('FLOW_NEST_LIMIT');
}
