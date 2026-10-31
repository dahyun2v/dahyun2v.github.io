import china from '../../docs/design-data/map-layout-china-v1.json' with {type:'json'};
import {FLOW,flowEnabled} from './campaign-flow.mjs';
import {addBandUnit,liveBandUnits,liveFlowSites,flowNearestCity,flowReward} from './campaign-flow-neutral.mjs';
import {createRng} from './rng.mjs';
import {hexDistance} from './map-primitives.mjs';
import {canMainAction,consumeMainAction,healCampaignTroops} from './campaign-effects.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {domesticV3Enabled} from './domestic-v3.mjs';
import {supplyMax} from './campaign-supply.mjs';
import {adoptWanderer,settleCampaignResearch} from './campaign-roster.mjs';
import {officerDraftPool} from './campaign-officer-draft.mjs';
import {c28AddCard} from './campaign-career.mjs';

const cfg=FLOW.goody,gen=FLOW.goodyGen;
const rawTiles=new Map(china.tiles.map(t=>[t.at.join(','),t]));
const blocked=new Set([...china.roads.flat(),...china.passes.flatMap(p=>p.tiles),...china.landmarks.flatMap(l=>l.footprint),...china.places.map(p=>p.at)].map(at=>at.join(',')));
const sitesCache=new WeakMap();
export function goodySites(s){
 if(sitesCache.has(s.tiles))return sitesCache.get(s.tiles);
 const sites=Object.values(s.tiles).filter(t=>['plain','forest','hill'].includes(t.terrainType)&&!(s.mapId==='china'&&blocked.has(t.tileId))&&!Object.values(s.cities).some(c=>hexDistance(t,s.tiles[c.tileId])<=2)).sort((a,b)=>a.q-b.q||a.r-b.r).map(t=>t.tileId);
 sitesCache.set(s.tiles,sites);return sites;
}
const distance=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
const shuffled=(items,rng)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
function chooseKind(s,at,tier,rng){
 const climate=s.mapId==='china'?rawTiles.get(at)?.climateClass:null;
 const kinds=FLOW.goodyTypes.filter(g=>g.tiers.includes(tier)),weights=kinds.map(g=>g.where?g.where.includes(climate)?3:.5:1);
 let roll=rng.next()*weights.reduce((a,b)=>a+b,0),i=0;while(i<kinds.length-1&&(roll-=weights[i])>=0)i++;
 return kinds[i];
}
export function generateGoodyHuts(s,{seed=s.campaignSeed,starts=Object.values(s.factions).map(f=>s.cities[f.startCapitalCityId??f.capitalCityId]?.tileId).filter(Boolean),existing=[],rngState=null,respawn=false}={}){
 if(!starts.length)return {huts:[],rngState:0,coverage:[]};
 const rng=createRng((seed^cfg.rngSalt)>>>0);if(rngState!==null)rng.restore(rngState);
 const huts=[],sites=goodySites(s),foes=liveFlowSites(s).filter(n=>n.kind!=='HUT').map(n=>n.tileId);
 const taken=(at,gap)=>[...existing,...huts].every(h=>distance(s,at,h.tileId)>=gap)&&foes.every(t=>distance(s,at,t)>=gen.gapFoe)&&!Object.values(s.armies).some(a=>a.troopCount>0&&a.tileId===at);
 const put=(at,tier)=>{const kind=chooseKind(s,at,tier,rng);huts.push({tileId:at,kind:kind.kind,name:kind.name,tier});};
 const count=(at,range)=>[...foes,...existing.map(h=>h.tileId),...huts.map(h=>h.tileId)].filter(t=>distance(s,at,t)<=range).length;
 if(!respawn)for(const [lo,hi,need,tier] of [[...gen.nearA,gen.nearAMin,1],[gen.nearA[1]+1,gen.nearB,gen.nearBMin,2]])for(const at of starts){
  for(const t of shuffled(sites.filter(t=>distance(s,t,at)>=lo&&distance(s,t,at)<=hi),rng)){
   if(count(at,hi)>=need)break;if(taken(t,gen.gapHut))put(t,tier);
  }
 }
 const candidates=shuffled(sites.filter(t=>{const d=Math.min(...starts.map(a=>distance(s,t,a)));return d>=gen.zone[0]&&d<=gen.zone[1];}),rng);
 let n=0;for(const at of candidates){if(n>=(respawn?cfg.respawnCount:gen.zoneCount))break;if(taken(at,respawn?gen.gapHut:gen.gapZone)){const d=Math.min(...starts.map(a=>distance(s,at,a)));put(at,d<=5?1:d<=7?2:3);n++;}}
 return {huts,rngState:rng.state(),coverage:starts.map(tileId=>({tileId,within6:count(tileId,gen.nearA[1]),within15:count(tileId,gen.nearB)}))};
}
export function addGoodyHut(s,spec){
 const id=`gh-${++s.flow.hutSequence}`,n={id,name:spec.name,kind:'HUT',goodyKind:spec.kind,band:'goody',tileId:spec.tileId,tier:spec.tier,durability:0,cleared:false,bornTurn:s.turn,tributeUntil:0};
 s.flow.sites[id]=n;
 if(!['library','refugees'].includes(spec.kind))addBandUnit(s,n,{troops:cfg.guardTroops[n.tier-1]});
 return n;
}
export function initializeHuts(s){
 if(!flowEnabled(s)||s.flow.hutSequence!==undefined)return s;
 s.flow.hutSequence=0;const result=generateGoodyHuts(s);for(const h of result.huts)addGoodyHut(s,h);
 s.flow.goodyRngState=result.rngState;s.flow.goodyCoverage=result.coverage;return s;
}
function eligible(s,n,a){return a&&a.troopCount>0&&a.morale!=='ROUTING'&&castleArmyActive(s,a)&&!s.officers[a.commanderId]?.injury&&distance(s,n.tileId,a.tileId)<=1&&!liveBandUnits(s).some(b=>b.siteId===n.id&&b.troopCount>0)&&!Object.values(s.armies).some(b=>b.factionId!==a.factionId&&b.troopCount>0&&castleArmyActive(s,b)&&distance(s,b.tileId,n.tileId)<=1);}
export function goodyClaimTargets(s,id){
 const a=s.armies[id];if(!flowEnabled(s)||!a||!canMainAction(s,id))return [];
 return liveFlowSites(s).filter(n=>n.kind==='HUT'&&s.knowledge[a.factionId]?.tiles[n.tileId]==='VISIBLE'&&eligible(s,n,a)).map(n=>n.id);
}
export function claimGoodyHut(s,{armyId,siteId},fid=s.playerFactionId){
 const a=s.armies[armyId],n=s.flow?.sites?.[siteId];if(a?.factionId!==fid||!goodyClaimTargets(s,armyId).includes(siteId))throw Error('INVALID_FLOW_CLAIM');
 consumeMainAction(s,armyId);
 if(['library','refugees'].includes(n.goodyKind)){n.investigation={armyId,factionId:fid,startedTurn:s.turn,tileId:a.tileId};return s;}
 rewardHut(s,n,a);return s;
}
function rewardHut(s,n,a){
 if(n.cleared)return;
 const f=s.factions[a.factionId],c=flowNearestCity(s,a.factionId,n.tileId),i=n.tier-1,award={};
 switch(n.goodyKind){
  case 'granary':award.food=cfg.food[i];a.supplyFood=supplyMax(s,a);break;
  case 'forge':if(domesticV3Enabled(s)){const key={cavalry:'horse',bow:'bow',militia:'blade'}[a.troopType]??'spear';f.armory[key]+=cfg.arms[i];}else if(c)c.specialResources.iron+=cfg.arms[i];break;
  case 'drifter':{
   const costs=new Map(officerDraftPool({factionId:a.factionId,mapId:s.mapId,seed:s.campaignSeed,china12:!!s.china12}).map(o=>[o.officerId,o.cost]));
   const candidates=Object.values(s.wanderers??{}).filter(o=>!o.allegianceFactionId&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&(costs.get(o.officerId)??Infinity)<=(n.tier===3?3:2)&&!Object.values(s.captiveRecruitment?.proposals??{}).some(p=>p.targetOfficerId===o.officerId&&['NEGOTIATING','JOINING'].includes(p.status))).sort((a,b)=>a.officerId.localeCompare(b.officerId));
   if(c&&candidates[0]){const o=candidates[0];o.locationRef={kind:'CITY',id:c.cityId};adoptWanderer(s,{targetOfficerId:o.officerId,factionId:a.factionId,candidateSourceRef:c.cityId,proposalId:`FLOW.${n.id}`});n.officerReward=o.officerId;}else {award.gold=cfg.gold[i];n.rewardFallback='NO_ELIGIBLE_WANDERER';}break;
  }
  case 'refugees':award.population=1;break;
  case 'tomb':award.gold=cfg.gold[i];if(n.tier===3){const r=s.campaignGrowth.officers[a.commanderId],key=c28AddCard(r,{id:`flow.treasure.${n.id}`,kind:'trait',name:'옛 무덤의 병장기',rarity:'RARE',effects:[{op:'DAMAGE_MOD',when:'ON_ATTACK',target:'SELF',value:cfg.equipmentDamage}]},'옛 무덤의 병장기');r.track.growthStates[a.commanderId].ownedTraitRanks[key]=1;r.c27RewardReserveIds??=[];r.c27RewardReserveIds.push(key);n.equipmentReward=key;}break;
  case 'stable':{const o=s.officers[a.commanderId],levels=['C','B','A'];o.aptitude??={};o.aptitude.cavalry=levels[Math.min(2,Math.max(0,levels.indexOf(o.aptitude.cavalry))+1)];if(!o.allowedTroops.includes('cavalry'))o.allowedTroops.push('cavalry');award.horses=cfg.horses[i];break;}
  case 'library':f.science+=cfg.research[i];settleCampaignResearch(s);break;
  case 'herbs':healCampaignTroops(s,a.armyId,cfg.heal[i],{exact:true});award.herbs=1;break;
 }
 flowReward(s,a.factionId,n.tileId,award);n.cleared=true;n.clearedTurn=s.turn;n.clearedBy=a.factionId;delete n.investigation;
 creditCampaignGrowth(s,{officerId:a.commanderId,eventId:`FLOW.HUT.${n.id}`,kind:'CLEAR_HUT',amount:cfg.xp[i],fixed:true});
 s.flow.history.push({type:'CLEAR_HUT',turn:s.turn,factionId:a.factionId,siteId:n.id,kind:n.goodyKind,tier:n.tier,...(n.rewardFallback?{fallback:n.rewardFallback}:{})});
}
export function observeHuts(s){
 if(!flowEnabled(s))return;
 for(const n of liveFlowSites(s).filter(n=>n.investigation)){
  const q=n.investigation,a=s.armies[q.armyId];if(!eligible(s,n,a)||a.factionId!==q.factionId||a.tileId!==q.tileId){delete n.investigation;continue;}
  if(s.turn>q.startedTurn)rewardHut(s,n,a);
 }
}
export function settleHuts(s){
 if(!flowEnabled(s)||s.gameResult)return;observeHuts(s);
 if(s.flow.hutsTurn===s.turn)return;s.flow.hutsTurn=s.turn;
 if(s.flow.worldPhase>'P2'||s.turn%cfg.respawnEvery!==0)return;
 const r=generateGoodyHuts(s,{existing:Object.values(s.flow.sites).filter(n=>n.kind==='HUT'),rngState:s.flow.goodyRngState,respawn:true});
 for(const h of r.huts)addGoodyHut(s,h);s.flow.goodyRngState=r.rngState;
}
export function hutsView(s,fid){return {claimTargets:Object.fromEntries(Object.values(s.armies).filter(a=>a.factionId===fid).map(a=>[a.armyId,goodyClaimTargets(s,a.armyId)])),investigations:liveFlowSites(s).filter(n=>n.investigation?.factionId===fid).map(n=>({siteId:n.id,...n.investigation}))};}
