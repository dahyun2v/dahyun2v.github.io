import {registerCampaignMech,campaignMechShield,campaignMechRemoveStatuses} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {hexDistance,neighbors,tileId,movementTicks} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile,diplomacyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden,healCampaignTroops} from './campaign-effects.mjs';
import {forceArmyTo,resolveAttack,engineBaseDamage,engineDamageRows,cityAttackTargets,resolveCityAttack} from './campaign-combat.mjs';
import {armyEngine} from './campaign-engines.mjs';
import {changeFormation,attackDirection,archerAttackReason} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {uniqueBuff,uniqueStatus} from './campaign-rule-registry.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {parentTroop} from './campaign-special-troops.mjs';

// Complete packages only. G15/G92 also await city-reaction entry points.
export const C505_IDS=Object.freeze(['G09','G13','G29','G35','G37','G39','G42','G50','G54','G57','G67','G71','G75','G77','G81','G84','G86','G89','G94','G96']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
const read=a=>a?.mechV2?.c505??{};
const book=a=>(a.mechV2??={}).c505??={};
const owns=(s,a,g)=>enabled(s)&&a?.commanderId===g&&s.campaignGrowth?.officers[g]?.mechanicsV2===true;
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const dist=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const visible=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId??b]==='VISIBLE'&&(!b.armyId||!ambushHidden(s,b.armyId,a.factionId));
const friends=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&dist(s,a,b)<=n).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const foes=(s,a,n=Infinity)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&dist(s,a,b)<=n&&visible(s,a,b)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const cavalry=a=>parentTroop(a.troopType)==='cavalry';
const hidden=(s,a)=>!!(a.c50?.hidden||a.c50?.hiddenAttack||a.c27?.ambush||read(a).conceal);
const recognized=(s,c)=>enabled(s)&&C505_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const cityTiles=c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])];
const cityAt=(s,a)=>Object.values(s.cities).find(c=>cityTiles(c).includes(a.tileId));
const capacity=(s,a)=>Math.max(0,(s.personnel.formations.find(f=>f.formationId===a.armyId)?.targetStrength??a.deploymentStrength??a.troopCount)-a.troopCount);
const wounds=(s,id)=>s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id).reduce((n,l)=>n+l.count,0);
const occupied=(s,a,to)=>live(s).some(b=>b.armyId!==a.armyId&&b.tileId===to&&(b.factionId===a.factionId||visible(s,a,b)));
const open=(s,a,to,terrain=['plain','forest','hill'])=>!!s.tiles[to]&&visible(s,a,to)&&terrain.includes(s.tiles[to].terrainType)&&!occupied(s,a,to)&&campaignDestinationAllowed(s,a.armyId,to)&&!Object.values(s.cities).some(c=>cityTiles(c).includes(to));
function route(s,a,to,max,terrain=['plain','forest','hill']){
 if(!s.tiles[to]||dist(s,a,to)>max)return null;
 const queue=[[a.tileId,[]]],seen=new Set([a.tileId]);
 for(let i=0;i<queue.length;i++){const [at,path]=queue[i];if(at===to)return path;if(path.length===max)continue;for(const t of neighbors(s.tiles[at]).map(tileId).sort())if(!seen.has(t)&&open(s,a,t,terrain)&&!s.mapRules.blockedEdges.includes([at,t].sort().join('|'))){seen.add(t);queue.push([t,[...path,t]]);}}return null;
}
function approach(s,a,b,max,terrain){return neighbors(s.tiles[b.tileId]).map(tileId).map(t=>route(s,a,t,max,terrain)).filter(p=>p!==null).sort((a,b)=>a.length-b.length||a.join('|').localeCompare(b.join('|')))[0];}
function walk(s,id,path){for(const to of path??[]){const a=s.armies[id];if(a.troopCount<=0||a.morale==='ROUTING'||occupied(s,a,to))break;forceArmyTo(s,id,to);if(s.armies[id].tileId!==to)break;}return s;}
function shot(s,id,target,k=1){if(s.armies[target]?.troopCount>0)return engineDamageRows(s,id,[{targetId:target,loss:Math.max(1,Math.round(engineBaseDamage(s,id,target)*k))}],'C505_SHOT',true);return s;}
function strike(s,id,target,k=1,noCounter=false){return resolveAttack(s,id,target,null,{enginePaid:true,c450Tactic:true,troopQRatio:k,noCounter,engineOrigin:'C505'});}
function drop(s,id,n=1){for(let i=0;i<n;i++)changeMorale(s,id,s.armies[id].morale==='STEADY'?'SHAKEN':'ROUTING','C505',s.lastCombat?.moraleChanges);}
function rally(s,id){changeMorale(s,id,s.armies[id].morale==='ROUTING'?'SHAKEN':'STEADY','상처자랑',s.lastCombat?.moraleChanges);}
function slow(s,source,id){uniqueBuff(s,source,id,'MOVE_MOD',-2);}
function fire(s,id,tiles){s.c32??={counts:{},uses:{}};s.c32.fires??=[];for(const at of tiles)if(s.tiles[at]){s.c32.fires.push({tileId:at,until:s.turn+1,source:id});for(const b of foes(s,s.armies[id]).filter(b=>b.tileId===at)){Object.assign(s,engineDamageRows(s,id,[{targetId:b.armyId,loss:Math.max(1,Math.floor(b.troopCount*.1))}],'C505_FIRE',true));uniqueStatus(s,id,b.armyId,'CONFUSED');}}}
function line(s,a,to,max){const start=s.tiles[a.tileId],end=s.tiles[to];if(!end)return null;const n=hexDistance(start,end);if(n<1||n>max)return null;const dq=(end.q-start.q)/n,dr=(end.r-start.r)/n;if(!neighbors({q:0,r:0}).some(t=>t.q===dq&&t.r===dr))return null;const path=Array.from({length:n},(_,i)=>tileId({q:start.q+dq*(i+1),r:start.r+dr*(i+1)}));return path.every(t=>s.tiles[t]&&visible(s,a,t))?path:null;}
const isWater=(s,at)=>['river','water'].includes(s.tiles[at]?.terrainType)||s.mapRules.riverEdges.some(e=>e.split('|').includes(at));
function rearPath(s,a,b){return neighbors(s.tiles[b.tileId]).map(tileId).filter(to=>s.tiles[to]&&attackDirection({...s,armies:{...s.armies,[a.armyId]:{...a,tileId:to}}},a.armyId,b.armyId)==='REAR').map(to=>route(s,a,to,4,['plain','forest','hill','mountain'])).filter(Boolean).sort((a,b)=>a.length-b.length||a.join('|').localeCompare(b.join('|')))[0];}
const camps=(s,id)=>(s.c50?.structures??[]).filter(o=>o.sourceId===id&&o.type==='CAMP'&&o.hp>0);
function enemyCities(s,a){return Object.values(s.cities).filter(c=>diplomacyHostile(s,a.factionId,c.ownerFactionId)&&visible(s,a,c)).sort((a,b)=>a.cityId.localeCompare(b.cityId));}
export function c505Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1],e=c.slot==='E';
 // Copied melee E still obeys the caster's troop restrictions.
 if(e&&(['G29','G37','G42'].includes(g)&&troopToCampaign(a.troopType)==='BT03'||g==='G13'&&archerAttackReason(s,id)))return [];
 if(g==='G09')return e?neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>open(s,a,t)&&foes(s,a).some(b=>dist(s,t,b)<=2)).sort():[id];
 if(g==='G13'&&e)return Object.keys(s.tiles).filter(t=>{const path=line(s,a,t,3);return path?.length===3&&path.some(at=>foes(s,a).some(b=>b.tileId===at));}).sort();
 if(['G29','G37','G42'].includes(g)&&e)return (!hidden(s,a)&&g==='G29')?[]:foes(s,a).filter(b=>g==='G42'?rearPath(s,a,b):approach(s,a,b,3)).map(b=>b.armyId);
 if(g==='G50'&&!e)return Object.keys(s.tiles).filter(to=>{const p=line(s,a,to,5);return p&&open(s,a,to)&&p.every((t,i)=>!['mountain','water'].includes(s.tiles[t].terrainType)&&!s.mapRules.blockedEdges.includes([i?p[i-1]:a.tileId,t].sort().join('|'))&&!Object.values(s.cities).some(c=>c.tileId===t));}).sort();
 if(g==='G54')return cityAttackTargets(s,id);
 if(g==='G57'&&e)return Object.keys(s.tiles).filter(t=>open(s,a,t)).sort();
 if(['G35','G39','G67','G94'].includes(g))return foes(s,a,g==='G67'?Infinity:e||g==='G39'?3:2).map(b=>b.armyId);
 if(g==='G86')return enemyCities(s,a).map(c=>c.cityId);
 if(g==='G81'&&a.troopCount>=((s.personnel.formations.find(f=>f.formationId===id)?.targetStrength??a.deploymentStrength)/2))return [];
 if(g==='G84')return Object.keys(s.tiles).filter(t=>dist(s,a,t)<=2&&visible(s,a,t)).sort();
 if(g==='G89'&&!a.c50?.resource)return [];
 if(g==='G96')return Object.keys(s.tiles).filter(t=>{const p=route(s,a,t,2);return p?.length&&foes(s,a).every(b=>dist(s,t,b)>dist(s,a,b));}).sort();
 return [id];
}
export function c505Cast(s,id,c,target){
 if(!recognized(s,c))return s;let a=s.armies[id];const g=c.rule.split('_')[1],e=c.slot==='E',x=book(a);
 if(g==='G09'){
  if(e){s.c50.structures=(s.c50.structures??[]).filter(o=>!(o.sourceId===id&&o.group==='TACTIC'));s.c50.structureSequence=(s.c50.structureSequence??0)+1;s.c50.structures.push({id:`C505.${s.c50.structureSequence}`,sourceId:id,factionId:a.factionId,type:'CAMP',group:'TACTIC',tileId:target,hp:30,maxHp:30,n:1,spend:`C505.${s.turn}.${id}`,createdTurn:s.turn,expires:s.turn+2});const b=foes(s,a).find(b=>dist(s,target,b)<=2);if(b)s=shot(s,id,b.armyId,1.5);}
  else {const counts={};for(const at of [a.tileId,...camps(s,id).map(o=>o.tileId)]){const b=foes(s,a).find(b=>dist(s,at,b)<=3&&(counts[b.armyId]??0)<2);if(b){counts[b.armyId]=(counts[b.armyId]??0)+1;s=shot(s,id,b.armyId);changeFormation(s,b.armyId,1,s.lastCombat.formationChanges);}}}
 }
 if(g==='G13'){if(e){const path=line(s,a,target,3);const targets=foes(s,a).filter(b=>path.includes(b.tileId));for(const b of targets)s=strike(s,id,b.armyId,targets.length>1?1:.8);}else{for(const b of foes(s,a,2))book(b).taunt={source:id,ends:1};x.guard=true;}}
 if(g==='G29'){if(e){x.ambushCast=true;const path=approach(s,a,s.armies[target],3);walk(s,id,path);if(dist(s,s.armies[id],s.armies[target])===1){s=strike(s,id,target,1,true);changeFormation(s,target,1,s.lastCombat.formationChanges);}}else for(const b of [a,...friends(s,a).filter(b=>b!==a&&cavalry(b)).slice(0,2)])book(b).conceal={source:id,ends:2,morale:true};}
 if(g==='G35'){if(e){s=shot(s,id,target);book(s.armies[target]).wan={source:id,moved:false,ends:1};}else for(const b of foes(s,a,2))book(b).penalty={source:id,ends:1};}
 if(g==='G37'){if(e){walk(s,id,approach(s,a,s.armies[target],3));if(dist(s,s.armies[id],s.armies[target])===1)s=strike(s,id,target);}else for(const b of friends(s,a)){const terrain=s.tiles[b.tileId].terrainType;if(terrain==='forest')book(b).conceal={source:id,ends:2};else if(terrain==='hill')book(b).nextDamage=1.25;else if(terrain==='plain')uniqueBuff(s,id,b.armyId,'MOVE_MOD',2);}}
 if(g==='G39'){for(const b of friends(s,a)){delete b.mechV2?.c505?.debt;delete b.mechV2?.c505?.pastDebts;}drop(s,target,2);}
 if(g==='G42'){if(e){x.ambushCast=hidden(s,a);walk(s,id,rearPath(s,a,s.armies[target]));if(dist(s,s.armies[id],s.armies[target])===1){s=strike(s,id,target,1.5,true);checkMorale(s,target,c.name,5,s.lastCombat.moraleChanges);}}else {installTerrain();x.valley={tiles:Object.keys(s.tiles).filter(t=>visible(s,a,t)&&['forest','mountain'].includes(s.tiles[t].terrainType)),ends:3};}}
 if(g==='G50'){if(e){installZones();s=engineDamageRows(s,id,[{targetId:id,loss:Math.floor(a.troopCount*.1)}],'C505_SELF_DOT',true);book(s.armies[id]).feign=true;book(s.armies[id]).nextDamage=1.5;}else{forceArmyTo(s,id,target);fire(s,id,neighbors(s.tiles[s.armies[id].tileId]).map(tileId));s=engineDamageRows(s,id,[{targetId:id,loss:Math.floor(s.armies[id].troopCount*.1)}],'C505_SELF_DOT',true);}}
 if(g==='G54'){x.siege=true;s=resolveCityAttack(s,id,target,{enginePaid:true});delete book(s.armies[id]).siege;const city=s.cities[target];for(const b of foes(s,s.armies[id]).filter(b=>cityTiles(city).includes(b.tileId)))checkMorale(s,b.armyId,c.name,5,s.lastCombat.moraleChanges);const to=cityTiles(city).filter(t=>s.tiles[t]&&dist(s,s.armies[id],t)===1&&!occupied(s,s.armies[id],t)).sort()[0];if(to){book(s.armies[id]).entryCity=target;forceArmyTo(s,id,to);delete book(s.armies[id]).entryCity;}}
 if(g==='G57'){installArrivals();if(e){const tiles=Object.keys(s.tiles).filter(t=>open(s,a,t)).sort((t,u)=>dist(s,t,target)-dist(s,u,target)||t.localeCompare(u)).slice(0,3);x.traps=tiles.map(tile=>({tile}));x.trapPlaced=s.turn;}else{for(const b of foes(s,a,2))checkMorale(s,b.armyId,c.name,5,s.lastCombat.moraleChanges);for(const trap of x.traps??[]){const b=foes(s,s.armies[id]).find(b=>dist(s,trap.tile,b)<=2);if(b)s=shot(s,id,b.armyId,.5);}}}
 if(g==='G67')book(s.armies[target]).admonish={source:id,ends:1};
 if(g==='G71'){if(e)for(const b of friends(s,a).slice(0,Math.min(3,x.saved??0)))rally(s,b.armyId);else x.blood=true;}
 if(g==='G75'){for(const b of foes(s,a,2).filter(cavalry)){s=shot(s,id,b.armyId,.8);uniqueStatus(s,id,b.armyId,'ROOTED',1,{guaranteed:true});}uniqueStatus(s,id,id,'ROOTED',1,{guaranteed:true});}
 if(g==='G77')for(const b of foes(s,a).filter(b=>isWater(s,b.tileId)||neighbors(s.tiles[b.tileId]).map(tileId).some(t=>isWater(s,t))).slice(0,2))if(uniqueStatus(s,id,b.armyId,'CONFUSED'))slow(s,id,b.armyId);
 if(g==='G81')x.lastStand={ends:3};
 if(g==='G84'){const tiles=Object.keys(s.tiles).filter(t=>dist(s,a,t)<=2&&visible(s,a,t)).sort((t,u)=>dist(s,t,target)-dist(s,u,target)||t.localeCompare(u)).slice(0,3);fire(s,id,tiles);for(const b of foes(s,s.armies[id]).filter(b=>tiles.includes(b.tileId)))checkMorale(s,b.armyId,c.name,read(b).poison?.source===id?30:5,s.lastCombat.moraleChanges);}
 if(g==='G86'){installTerrain();x.map={cityId:target,ends:3};}
 if(g==='G89'){const n=a.c50.resource;a.c50.resource=0;for(const b of friends(s,a).slice(0,n))campaignMechShield(s,id,b.armyId,Math.floor(b.troopCount*.1),`C505.SHIELD.${s.turn}.${id}.${b.armyId}.${s.battleSequence}`);}
 if(g==='G94'){const b=s.armies[target],confused=b.effectStates?.some(e=>e.status==='CONFUSED'&&e.startsTurn<=s.turn&&e.expiresTurn>=s.turn);const targets=confused?live(s).filter(t=>t.factionId===b.factionId&&t!==b&&dist(s,t,b)===1&&visible(s,a,t)):[];uniqueStatus(s,id,target,'CONFUSED',1,{guaranteed:true});for(const b of targets)uniqueStatus(s,id,b.armyId,'CONFUSED');}
 if(g==='G96'){walk(s,id,route(s,a,target,2));for(const b of friends(s,s.armies[id])){campaignMechRemoveStatuses(s,b.armyId,e=>['CONFUSED','ROOTED','SLOWED'].includes(e.status)||e.op==='MOVE_MOD'&&e.value<0,'C505_CLEANSE',id);if(b.c50){delete b.c50.rooted;delete b.c50.rootNext;}if(b.c27)delete b.c27.rootTurn;book(b).freePursuit=s.turn;}}
 return s;
}

export function c505Deploy(s,a){if(['G39','G57','G96'].some(g=>owns(s,a,g)))installArrivals();if(owns(s,a,'G89'))a.c50.resource=armyEngine(s,a.armyId).max;}
export function c505Adopt(s,id){for(const a of Object.values(s.armies))if(a.commanderId===id&&a.c50)c505Deploy(s,a);}
export function c505Options(s,id,to,options){
 if(!enabled(s))return options;const a=s.armies[id],b=s.armies[to];if(!a||!b)return options;let out={...options};const terrain=s.tiles[a.tileId].terrainType;
 if(owns(s,b,'G13')&&foes(s,b,2).length>=3)out.noFlank=true;
 if(owns(s,b,'G75')&&cavalry(a))out.noCharge=true;
 if(owns(s,a,'G37')){if(terrain==='forest')out.noCounter=true;if(terrain==='hill')out.forceSide='FLANK';}
 if(owns(s,a,'G42')&&hidden(s,a)||owns(s,a,'G50')&&read(a).avenged===s.turn)out.noCounter=true;
 if(read(a).nextRear)out.forceSide='REAR';
 if(read(b).flank&&live(s).some(g=>g.factionId===a.factionId&&read(b).flank.source===g.armyId))out.forceSide='FLANK';
 return out;
}
export function c505Counter(s,id,to){const a=s.armies[id],b=s.armies[to];return owns(s,a,'G75')&&cavalry(b)&&attackDirection(s,to,id)==='FRONT'&&a.troopQDisruptedTurn!==s.turn?1.5:1;}
export function c505AfterAttack(s,before,id,to,options,log=s.lastCombat){
 if(!enabled(s))return;const a=s.armies[id],b=s.armies[to],old=before.armies[id];if(!a||!b||!old||!log)return;
 if(owns(s,a,'G13')&&foes(before,old,2).length>=3&&(old.movedTiles??0)>2)changeFormation(s,to,1,log.formationChanges);
 if(owns(s,a,'G29')&&(hidden(before,old)||read(old).ambushCast))for(const b of foes(s,a).filter(b=>dist(s,b,s.armies[to])<=2))checkMorale(s,b.armyId,'금범령성',5,log.moraleChanges);
 if(owns(s,a,'G42')&&(hidden(before,old)||read(old).ambushCast))slow(s,id,to);
 if(read(old).conceal?.morale)drop(s,to);
 delete a.mechV2?.c505?.ambushCast;delete a.mechV2?.c505?.conceal;delete a.mechV2?.c505?.nextDamage;delete a.mechV2?.c505?.nextRear;delete b.mechV2?.c505?.flank;
 if(read(b).wan?.moved&&s.armies[read(b).wan.source]?.factionId===a.factionId)delete book(b).wan;
 for(const victim of (options.troopQ?(log.units??[]).map(u=>s.armies[u.unitId]).filter(v=>v&&diplomacyArmyHostile(s,id,v.armyId)):[b])){
  if(owns(s,a,'G84')&&!read(victim).poison)book(victim).poison={source:id,loss:0,ends:2};
  if(options.troopQ){delete victim.mechV2?.c505?.flank;if(read(victim).wan?.moved)delete victim.mechV2.c505.wan;}
 }
 if(!options.reaction)penalty(s,id);
 for(const u of log.units??[]){const g=s.armies[u.unitId];if(!owns(s,g,'G71')||u.unitId===to||u.casualties<=0||g.factionId!==b.factionId)continue;const protectedId=g.c50?.relation?.targetId;if(protectedId!==to||!lord(s,b))continue;book(g).saved=(read(g).saved??0)+1;g.formation=before.armies[g.armyId].formation;log.formationChanges=log.formationChanges.filter(c=>c.armyId!==g.armyId);}
}
function lord(s,a){return s.factions[a.factionId]?.rulerId===a.commanderId||a.commanderId===s.factions[a.factionId]?.commanderId;}
function penalty(s,id){const row=read(s.armies[id]).penalty;if(!row)return;delete book(s.armies[id]).penalty;changeFormation(s,id,1,s.lastCombat?.formationChanges);uniqueStatus(s,row.source,id,'CONFUSED');}
export function c505Movement(s,id,from,to){
 if(!enabled(s)||from===to)return;const a=s.armies[id];if(!a)return;
 for(const g of live(s).filter(g=>owns(s,g,'G35')&&diplomacyArmyHostile(s,g.armyId,id)))if(live(s).some(b=>b.factionId===g.factionId&&dist(s,g,b)<=2&&dist(s,from,b)===1&&dist(s,to,b)>1))book(a).slowNext={source:g.armyId};
 if(read(a).wan&&s.activeFactionId===a.factionId)book(a).wan.moved=true;
 for(const g of live(s).filter(g=>g.factionId===a.factionId&&read(g).valley?.tiles.includes(from)))book(a).nextRear=true;
}
export function c505Start(s,fid){
 if(!enabled(s))return;for(const a of live(s).filter(a=>a.factionId===fid)){
  const x=read(a);if(x.start===s.turn)continue;
  if(x.traps&&x.trapPlaced<s.turn)delete book(a).traps;
  if(live(s).some(g=>owns(s,g,'G67')&&g.factionId===fid&&dist(s,g,a)<=2)){if(a.c50){delete a.c50.rooted;delete a.c50.rootNext;}if(a.c27)delete a.c27.rootTurn;delete a.mechV2?.taunted;delete a.mechV2?.c505?.taunt;}
  if(x.slowNext){slow(s,x.slowNext.source,a.armyId);delete book(a).slowNext;}
  if(owns(s,a,'G50')){if(x.hurt)book(a).avenged=s.turn;delete book(a).hurt;delete book(a).feign;}
  if(owns(s,a,'G13'))delete book(a).guard;
  if(owns(s,a,'G71'))delete book(a).blood;
  if(owns(s,a,'G39')&&foes(s,a,1).length)for(const b of friends(s,a,1).filter(b=>b!==a)){const event=`C505.DEFER.${s.turn}.${a.armyId}.${b.armyId}`;campaignMechShield(s,a.armyId,b.armyId,Math.floor(b.troopCount*.1),event);if(read(b).debt)(book(b).pastDebts??=[]).push(read(b).debt);book(b).debt={source:a.armyId,event,initial:Math.floor(b.troopCount*.1),ends:2,used:0,cart:false};}
  if(Object.keys(x).length)book(a).start=s.turn;
 }
}
export function c505Finish(s,fid){
 if(!enabled(s))return;
 for(const a of live(s)){
  const x=read(a);if(a.factionId===fid){
   if(x.finish===s.turn)continue;

   if(x.lastStand&&--x.lastStand.ends===0){delete book(a).lastStand;changeFormation(s,a.armyId,2);}
   if(x.poison&&--x.poison.ends===0){const row=x.poison;delete book(a).poison;if(row.loss)Object.assign(s,engineDamageRows(s,row.source,[{targetId:a.armyId,loss:Math.floor(row.loss/4)}],'C505_POISON_DOT',true));}
   for(const row of [...(x.pastDebts??[]),...(x.debt?[x.debt]:[])])if(--row.ends===0&&row.used)Object.assign(s,engineDamageRows(s,row.source,[{targetId:a.armyId,loss:Math.floor(row.used*(row.cart?.5:1))}],'C505_DEFER_DOT',true));
   if(x.debt?.ends===0)delete book(s.armies[a.armyId]).debt;
   if(x.pastDebts)book(s.armies[a.armyId]).pastDebts=x.pastDebts.filter(r=>r.ends>0);
   if(x.admonish&&--x.admonish.ends===0){book(a).slowNext={source:x.admonish.source};delete book(a).admonish;}
   if(x.penalty&&--x.penalty.ends===0)delete book(a).penalty;
   if(x.wan&&!x.wan.moved)delete book(a).wan;
   if(x.taunt&&--x.taunt.ends===0)delete book(a).taunt;
   for(const key of ['conceal','valley','map','ladder'])if(x[key]&&--x[key].ends===0)delete book(a)[key];
   if(owns(s,a,'G54')){const city=enemyCities(s,a).find(c=>(c.footprint?.walls??[]).some(t=>dist(s,a,t)===1));if(city){installTerrain();book(a).ladder={cityId:city.cityId,from:a.tileId,ends:2};}}
   if(Object.keys(x).length)book(a).finish=s.turn;
  }else{
   if(owns(s,a,'G77'))for(const b of live(s).filter(b=>b.factionId===fid&&(s.c50.structures??[]).some(o=>o.type==='BRIDGE'&&o.sourceId===a.armyId&&o.tileId===b.tileId)))changeFormation(s,b.armyId,1);
  }
 }
}

let installed=false;
export function c505Install(s,id){
 if(s){const rows=Object.values(s.armies);if(rows.some(a=>read(a).feign))installZones();if(rows.some(a=>read(a).valley||read(a).map||read(a).ladder))installTerrain();}
 if(s&&['G39','G57','G96'].includes(id)&&Object.values(s.armies).some(a=>a.commanderId===id&&a.troopCount>0))installArrivals();
 if(installed)return;installed=true;
 registerCampaignMech('H04','c505-permissions',{operations:['attackRange','attackAllowed'],query:({state:s,operation,sourceId,targetId,kind},value)=>{
  if(!enabled(s))return;const a=s.armies[sourceId],b=s.armies[targetId];if(!a)return;
  if(operation==='attackRange'){if(a.troopType==='bow'&&live(s).some(g=>owns(s,g,'G09')&&g.factionId===a.factionId&&camps(s,g.armyId).some(o=>dist(s,a,o)===1)))return value+1;return;}
  if(b&&read(b).feign&&diplomacyArmyHostile(s,sourceId,targetId))return false;
  if(!b)return;
  if(read(a).taunt&&read(a).taunt.source!==targetId)return false;
 }});
 registerCampaignMech('H03','c505-reactions',{operations:['reactionPlan','reactionAllowed'],query:({state:s,operation,sourceId,targetId,kind},p)=>{
  if(!enabled(s))return;if(operation==='reactionPlan')return c505Options(s,sourceId,targetId,p);
  if(kind==='PURSUIT'&&read(s.armies[targetId]).freePursuit===s.turn)return false;
 }});
 registerCampaignMech('H13','c505-hidden',{operations:['hidden'],query:({state:s,targetId,viewerFactionId},v)=>enabled(s)&&read(s.armies[targetId]).conceal&&s.armies[targetId].factionId!==viewerFactionId?true:v});
 registerCampaignMech('H08','c505-damage',{operations:['damageFactor'],query:({state:s,sourceId,targetId,options},v)=>{
  if(!enabled(s))return;const a=s.armies[sourceId],b=s.armies[targetId];if(!a||!b)return;let f=v;
  if(read(a).nextDamage)f*=read(a).nextDamage;
  if(owns(s,a,'G50')&&read(a).avenged===s.turn)f*=1.25;
  
  if(read(a).lastStand)f*=1.25;
  if(read(b).wan?.moved&&s.armies[read(b).wan.source]?.factionId===a.factionId)f*=1.5;
  if(['forest','mountain'].includes(s.tiles[a.tileId].terrainType)&&['BT01','BT02'].includes(troopToCampaign(a.troopType))&&a.c50?.lastOrders?.some(o=>owns(s,s.armies[o.sourceId],'G94')))f*=1.2;
  if(options?.reaction&&String(options.engineOrigin??'').includes('RETURN_FIRE')&&a.troopType==='bow'&&live(s).some(g=>owns(s,g,'G57')&&g.factionId===a.factionId&&(cityAt(s,g)||(s.c50.structures??[]).some(o=>o.type==='CAMP'&&o.tileId===g.tileId))))f*=1.25;
  return f;
 }});
 registerCampaignMech('H09','c505-resources',{operations:['resourceGain','resourceCost'],query:({state:s,operation,sourceId,action},n)=>{const a=s.armies[sourceId];if(operation==='resourceGain'&&owns(s,a,'G89')&&s.turn<=5)return 0;if(operation==='resourceCost'&&action==='BRIDGE'&&owns(s,a,'G77'))return Math.max(0,n-1);}});
 registerCampaignMech('H15','c505-guards',{operations:['effectAllowed','moraleTarget','formationSteps'],query:({state:s,operation,targetId,effect,from,reason},v)=>{
  if(!enabled(s))return;const a=s.armies[targetId];if(!a)return;
  if(operation==='formationSteps'&&v>0&&owns(s,a,'G71')&&s.c50?.sharedDamage?.ids.includes(targetId)&&lord(s,s.armies[a.c50?.relation?.targetId]??a))return 0;
  if(operation==='effectAllowed'&&['TAUNT','ROOTED'].includes(effect?.status)&&live(s).some(g=>owns(s,g,'G67')&&g.factionId===a.factionId&&dist(s,g,a)<=2))return false;
  if(operation==='moraleTarget'&&['STEADY','SHAKEN','ROUTING'].indexOf(v)>['STEADY','SHAKEN','ROUTING'].indexOf(from)&&(read(a).blood||read(a).lastStand&&v==='ROUTING'||owns(s,a,'G81')&&Object.values(s.armies).some(b=>b.factionId===a.factionId&&lord(s,b)&&b.morale==='ROUTING')&&/패주/.test(reason??'')))return from;
 }});
 registerCampaignMech('H16','c505-city',{operations:['cityDamage','centerEntry'],query:({state:s,operation,sourceId,cityId},v)=>{
  if(!enabled(s))return;const a=s.armies[sourceId];if(!a)return;
  if(operation==='cityDamage'){let factor=read(a).siege?1.5:1;for(const g of live(s).filter(g=>g.factionId===a.factionId)){if(read(g).map&&read(g).map.cityId===cityId&&s.cities[cityId]?.footprint?.gates.includes(a.tileId))factor*=1.25;}return Math.round(v*factor);}
  if(operation==='centerEntry'&&(read(a).entryCity===cityId||live(s).some(g=>g.factionId===a.factionId&&read(g).ladder?.cityId===cityId)))return true;
 }});
 registerCampaignMech('H01','c505-losses',{operations:['loss','lossKind','lossSettled'],query:({state:s,operation,targetId,kind},v)=>operation==='loss'&&enabled(s)&&read(s.armies[targetId]).guard?Math.round(v*.75):operation==='lossKind'&&String(kind).startsWith('C505_')&&kind.endsWith('_DOT')?'DOT':v,commit:({state:s,snapshot,eventId})=>{
  if(!enabled(s)||!snapshot?.units)return;let out;
  for(const u of snapshot.units){const a=s.armies[u.unitId],x=read(a);if(!a||!(u.casualties>0||x.debt)||x.events?.[eventId])continue;if(!x.poison&&!x.debt&&!owns(s,a,'G50'))continue;out??=cloneCampaign(s);const z=book(out.armies[u.unitId]);(z.events??={})[eventId]=true;if(x.poison)z.poison.loss+=u.casualties??0;if(x.debt){const shield=s.mechContracts?.shields?.[u.unitId]?.find(r=>r.source===x.debt.event);z.debt.used=x.debt.initial-(shield?.amount??0);}if(owns(s,a,'G50')&&s.activeFactionId!==a.factionId)z.hurt=true;}
  return out;
 }});
 registerCampaignMech('H02','c505-personnel',{operations:['personnelSettled','routPlan'],query:({state:s,operation,targetId,snapshot},p)=>{
  if(!enabled(s))return;const transfers=[...p.transfers];
  
  if(operation==='routPlan'){const a=s.armies[targetId];if(a&&lord(s,a))for(const g of live(s).filter(g=>owns(s,g,'G81')&&g.factionId===a.factionId&&g!==a)){const count=Math.min(Math.floor(wounds(s,targetId)/2),capacity(s,g));if(count)transfers.push({fromId:targetId,toId:g.armyId,count,mode:'FIELD'});}}
  return {...p,transfers};
 },commit:({state:s,operation,snapshot,allocations,eventId})=>{if(!enabled(s)||operation!=='personnelSettled')return;let out;for(const u of snapshot?.units??[]){const a=s.armies[u.unitId];if(owns(s,a,'G71')&&read(a).blood&&u.casualties>0&&!read(a).events?.[`HEAL.${eventId}`]){out??=cloneCampaign(s);(book(out.armies[u.unitId]).events??={})[`HEAL.${eventId}`]=true;healCampaignTroops(out,u.unitId,Math.min(Math.floor(u.casualties/2),allocations?.find(r=>r.unitId===u.unitId)?.wounded??0),{exact:true,woundedAfter:Object.fromEntries(out.personnel.lots.filter(l=>l.kind==='WOUNDED').map(l=>[l.lotId,l.count-(allocations?.find(r=>r.unitId===u.unitId&&r.woundedLotId===l.lotId)?.wounded??0)]))});}}return out;}});
 registerCampaignMech('H12','c505-events',{operations:['tacticCommitted'],commit:({state:s,operation,sourceId,type,payload})=>{
  if(!enabled(s))return;let out;
  if(operation==='tacticCommitted'){
   const a=s.armies[sourceId];if(!a)return;if(read(a).penalty||read(a).admonish){out=cloneCampaign(s);penalty(out,sourceId);if(read(out.armies[sourceId]).admonish){drop(out,sourceId,2);delete book(out.armies[sourceId]).admonish;}}
   for(const g of live(s).filter(g=>owns(s,g,'G86')&&diplomacyArmyHostile(s,g.armyId,sourceId)&&dist(s,g,a)<=2&&visible(s,g,a))){out??=cloneCampaign(s);book(out.armies[sourceId]).flank={source:g.armyId};}
  }

  return out;
 }});

}

let arrivalsInstalled=false;
function installArrivals(){
 if(arrivalsInstalled)return;arrivalsInstalled=true;
 registerCampaignMech('H12','c505-arrivals',{operations:['engineEvent'],commit:({state:s,operation,type,payload})=>{
  if(!enabled(s))return;let out;
  if(operation==='engineEvent'&&['ARRIVE','FORCED_MOVE'].includes(type)){
   const a=s.armies[payload.armyId];if(!a)return;
   if(read(a).debt&&(s.c50.structures??[]).some(o=>o.type==='CART'&&o.factionId===a.factionId&&o.tileId===a.tileId)){out??=cloneCampaign(s);book(out.armies[a.armyId]).debt.cart=true;for(const row of read(out.armies[a.armyId]).pastDebts??[])row.cart=true;}
   for(const g of live(s).filter(g=>diplomacyArmyHostile(s,g.armyId,a.armyId)&&visible(s,g,a))){
    if(owns(s,g,'G57'))for(const trap of read(g).traps??[])if(dist(s,trap.tile,a)<=2&&payload.fromTileId&&dist(s,trap.tile,payload.fromTileId)>2){out??=cloneCampaign(s);book(out.armies[g.armyId]).traps=read(out.armies[g.armyId]).traps.filter(t=>t.tile!==trap.tile);out=shot(out,g.armyId,a.armyId,.5);}
    if(owns(s,g,'G96')&&hidden(s,g)&&dist(s,g,a)<=2&&payload.fromTileId&&dist(s,g,payload.fromTileId)>2&&read(g).intercept!==s.turn){out??=cloneCampaign(s);book(out.armies[g.armyId]).intercept=s.turn;out=shot(out,g.armyId,a.armyId,.5);changeFormation(out,a.armyId,1,out.lastCombat.formationChanges);}
   }
  }
  return out;
 }});
}

let zonesInstalled=false,terrainInstalled=false;
function installZones(){if(zonesInstalled)return;zonesInstalled=true;
 registerCampaignMech('H05','c505-zones',{operations:['controlZone'],query:({state:s,sourceId,targetId},v)=>{if(!enabled(s))return;const a=s.armies[targetId];if(read(a).feign)return false;}});
}
function installTerrain(){if(terrainInstalled)return;terrainInstalled=true;
 registerCampaignMech('H07','c505-terrain',{operations:['edgeCost'],query:({state:s,sourceId,from,to},v)=>{
  if(!enabled(s))return;const a=s.armies[sourceId];if(!a||!s.tiles[to])return;const sources=Object.values(s.armies).filter(g=>g.factionId===a.factionId&&(read(g).valley||read(g).map||read(g).ladder)&&g.troopCount>0&&castleArmyActive(s,g));
  const normal=sources.some(g=>read(g).valley?.tiles.includes(to)||read(g).map&&dist(s,to,s.cities[read(g).map.cityId])<=3);
  const ladder=sources.some(g=>{const r=read(g).ladder,c=r&&s.cities[r.cityId];return c&&r.from===from&&cityTiles(c).includes(to);});
  if(!normal&&!ladder)return;
  if(!ladder&&s.mapRules.blockedEdges.includes([from,to].sort().join('|')))return v;
  return movementTicks({from:{...s.tiles[from],terrainType:'plain'},to:{...s.tiles[to],terrainType:'plain'},troopType:parentTroop(a.troopType),maneuver:s.officers[a.commanderId].subStats.기동지휘,edge:{road:false,river:false,crossing:'none',blocked:false},tuning:s.mapRules.tuning,tickDays:s.time.tickDays});
 }});
}
