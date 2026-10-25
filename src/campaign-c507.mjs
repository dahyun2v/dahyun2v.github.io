import {createRng} from './rng.mjs';
import {registerCampaignMech,campaignMechQuery} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {hexDistance,neighbors,tileId,movementTicks} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile,diplomacyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden,canMainAction} from './campaign-effects.mjs';
import {forceArmyTo,engineDamageRows,engineBaseDamage,resolveAtomicFriendlyAttack} from './campaign-combat.mjs';
import {uniqueBuff,uniqueStatus} from './campaign-rule-registry.mjs';
import {changeFormation,archerAttackReason} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {armyEngine} from './campaign-engines.mjs';
import {settleMechPersonnel} from './campaign-result-bridge.mjs';
import {parentTroop} from './campaign-special-troops.mjs';

export const C507_IDS=Object.freeze(['G15','G21','G22','G26','G40','G49','G76','G92']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
const read=a=>a?.mechV2?.c507??{};
const book=a=>(a.mechV2??={}).c507??={};
const owns=(s,a,g)=>enabled(s)&&a?.commanderId===g&&s.campaignGrowth?.officers[g]?.mechanicsV2===true;
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const distance=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const seen=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId??b]==='VISIBLE'&&(!b.armyId||!ambushHidden(s,b.armyId,a.factionId));
const enemies=(s,a,n=Infinity)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&distance(s,a,b)<=n&&seen(s,a,b)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const friends=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&distance(s,a,b)<=n).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const tiles=c=>[c.tileId,...c.footprint?.gates??[],...c.footprint?.walls??[]];
const cityAt=(s,a)=>Object.values(s.cities).find(c=>c.ownerFactionId===a.factionId&&tiles(c).includes(a.tileId));
const enemyCities=(s,a,n=Infinity)=>Object.values(s.cities).filter(c=>diplomacyHostile(s,a.factionId,c.ownerFactionId)&&seen(s,a,c)&&distance(s,a,c)<=n).sort((a,b)=>a.cityId.localeCompare(b.cityId));
const hidden=a=>!!(a.c50?.hidden||read(a).conceal);
const recognized=(s,c)=>enabled(s)&&C507_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const open=(s,a,to)=>s.tiles[to]&&s.tiles[to].terrainType!=='mountain'&&seen(s,a,to)&&campaignDestinationAllowed(s,a.armyId,to)&&!live(s).some(b=>b.armyId!==a.armyId&&b.tileId===to)&&!Object.values(s.cities).some(c=>c.tileId===to);
function route(s,a,to,max){const q=[[a.tileId,[]]],visited=new Set([a.tileId]);for(let i=0;i<q.length;i++){const [at,p]=q[i];if(at===to)return p;if(p.length===max)continue;for(const t of neighbors(s.tiles[at]).map(tileId).sort())if(!visited.has(t)&&open(s,a,t)&&!s.mapRules.blockedEdges.includes([at,t].sort().join('|'))){visited.add(t);q.push([t,[...p,t]]);}}return null;}
function confuse(s,source,id){const rng=createRng();rng.restore(s.rng.value);const roll=rng.next();s.rng.value=rng.state();s.rng.draws++;return roll<.2&&uniqueStatus(s,source,id,'CONFUSED',1,{guaranteed:true});}
function drop(s,id,n=1){for(let i=0;i<n;i++)changeMorale(s,id,s.armies[id].morale==='STEADY'?'SHAKEN':'ROUTING','C507',s.lastCombat?.moraleChanges);}
function pairTargets(s,a){return enemies(s,a,3).flatMap(b=>b.morale==='ROUTING'||archerAttackReason(s,b.armyId)?[]:enemies(s,a,3).filter(c=>c!==b&&c.factionId===b.factionId&&distance(s,b,c)===1).map(c=>`${b.armyId}|${c.armyId}`));}
export function c507Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1],e=c.slot==='E';
 if(g==='G15')return cityAt(s,a)&&(e||(a.c50?.resource??0)>0)?[id]:[];
 if(g==='G21')return e?enemies(s,a,3).map(b=>b.armyId):enemies(s,a,2).length?[id]:[];
 if(g==='G22')return e?friends(s,a).map(b=>b.armyId):enemies(s,a).map(b=>b.armyId);
 if(g==='G26')return e?pairTargets(s,a):enemies(s,a).map(b=>b.armyId);
 if(g==='G40')return e?[id]:Object.keys(s.tiles).filter(t=>distance(s,a,t)<=5&&route(s,a,t,5)?.length).sort();
 if(g==='G49')return enemies(s,a,2).filter(b=>!read(b).duel).map(b=>b.armyId);
 if(g==='G76'||g==='G92')return enemyCities(s,a,g==='G92'?2:Infinity).map(c=>c.cityId);
 return [];
}
export function c507Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id],g=c.rule.split('_')[1],e=c.slot==='E',x=book(a);
 if(g==='G15'){const city=cityAt(s,a);if(e)x.closed={cityId:city.cityId,gates:city.footprint.gates.slice(0,2),ends:1};else{x.recoverBudget=a.c50.resource*100;a.c50.resource=0;settleMechPersonnel(s,'c507Recovery',{sourceId:id,eventId:`C507.HEAL.${s.turn}.${s.battleSequence}.${id}`});delete book(s.armies[id]).recoverBudget;}}
 if(g==='G21'){
  if(e){const b=s.armies[target],delta={q:Math.sign(s.tiles[a.tileId].q-s.tiles[b.tileId].q),r:Math.sign(s.tiles[a.tileId].r-s.tiles[b.tileId].r)},to=neighbors(s.tiles[b.tileId]).filter(t=>s.tiles[tileId(t)]&&distance(s,tileId(t),a)<distance(s,b,a)).sort((u,v)=>distance(s,tileId(u),a)-distance(s,tileId(v),a)||tileId(u).localeCompare(tileId(v)))[0];
   if(to){delta.q=to.q-s.tiles[b.tileId].q;delta.r=to.r-s.tiles[b.tileId].r;}
   const group=enemies(s,a).filter(t=>t===b||t.factionId===b.factionId&&distance(s,t,b)===1).map(t=>({id:t.armyId,to:tileId({q:s.tiles[t.tileId].q+delta.q,r:s.tiles[t.tileId].r+delta.r})}));
   s=engineDamageRows(s,id,[{targetId:target,loss:engineBaseDamage(s,id,target)}],'C507_PULL',true);
   for(const r of group){const u=s.armies[r.id];if(!u?.troopCount)continue;if(open(s,u,r.to))forceArmyTo(s,u.armyId,r.to);else changeFormation(s,u.armyId,1,s.lastCombat.formationChanges);}
  }else for(const b of enemies(s,a,2)){book(b).chain={source:id,expires:s.turn+2};uniqueBuff(s,id,b.armyId,'MOVE_MOD',-2,2);}
 }
 if(g==='G22'){if(e){uniqueBuff(s,id,target,'MOVE_MOD',2);book(s.armies[target]).returnRoute={tileId:s.armies[target].tileId,due:s.turn+1,source:id,factionId:a.factionId};}else{(s.mechContracts??={spent:{}}).returns??=[];s.mechContracts.returns.push({sourceId:id,factionId:a.factionId,targetId:target,tileId:s.armies[target].tileId,due:s.turn+1});}}
 if(g==='G26'){if(e){const [sourceId,targetId]=target.split('|');s=resolveAtomicFriendlyAttack(s,id,sourceId,targetId);}else{book(s.armies[target]).bewitched={source:id,starts:s.turn+(s.campaignEffects?.startedTurns[s.armies[target].factionId]===s.turn?1:0),ends:1};for(const b of enemies(s,a).filter(b=>b.armyId!==target&&b.factionId===s.armies[target].factionId&&distance(s,b,s.armies[target])===1))confuse(s,id,b.armyId);}}
 if(g==='G40'){if(e){x.conceal={ends:2};x.riverUntil=s.turn;}else{const group=[a,...friends(s,a).filter(b=>b!==a).slice(0,2)].map(b=>b.armyId);for(const who of group){const b=s.armies[who];book(b).riverUntil=s.turn;const dest=Object.keys(s.tiles).filter(t=>distance(s,b,t)<=5&&open(s,b,t)).sort((t,u)=>distance(s,t,target)-distance(s,u,target)||t.localeCompare(u)).find(t=>route(s,b,t,5));for(const to of route(s,b,dest??b.tileId,5)??[])forceArmyTo(s,who,to);book(s.armies[who]).firstRear=true;}}}
 if(g==='G49'){const key=`C507.DUEL.${s.turn}.${id}.${target}`;x.duel={key,other:target,ends:2,initial:a.troopCount,source:id};book(s.armies[target]).duel={key,other:id,ends:2,initial:s.armies[target].troopCount,source:id};}
 if(g==='G76')x.cityRaid={cityId:target,expires:s.turn+2};
 if(g==='G92'){const city=s.cities[target],loss=Math.floor(city.durability/5);city.durability-=loss;city.mechV2??={};city.mechV2.c507Silent={factionId:city.ownerFactionId,ends:1};s.lastCombat.cityId=target;s.lastCombat.dealt=loss;s.lastCombat.enemyLoss+=loss;drop(s,id);}
 return s;
}
export function c507AfterAttack(s,before,id,target,options,log=s.lastCombat){
 if(!enabled(s))return;const a=s.armies[id],b=s.armies[target];if(!a||!b)return;
 if(owns(s,a,'G49')&&read(before.armies[id]).duel?.other===target)changeFormation(s,target,1,log?.formationChanges);
 if(owns(s,a,'G76'))book(b).pride={source:id,factionId:a.factionId};
 if(owns(s,b,'G26')){const out=confuse(s,target,id);if(out){const effect=a.effectStates?.at(-1);if(effect?.status==='CONFUSED'){effect.startsTurn=s.turn+(s.campaignEffects?.startedTurns[a.factionId]===s.turn?1:0);effect.expiresTurn=effect.startsTurn;}}}
 delete a.mechV2?.c507?.firstRear;delete a.mechV2?.c507?.gateStrike;delete a.mechV2?.c507?.conceal;
}
export function c507Start(s,fid){
 if(!enabled(s))return;
 for(const a of live(s)){const x=read(a);if(x.chain&&x.chain.expires<=s.turn)delete book(a).chain;
  if(a.factionId===fid&&x.bewitched&&x.bewitched.starts<=s.turn&&x.rootedTurn!==s.turn){if(uniqueStatus(s,x.bewitched.source,a.armyId,'ROOTED',1,{guaranteed:true})){const effect=a.effectStates.at(-1);effect.startsTurn=s.turn;effect.expiresTurn=s.turn;}book(a).rootedTurn=s.turn;}
  if(x.returnRoute&&s.turn>x.returnRoute.due)delete book(a).returnRoute;
 }
 for(const r of [...s.mechContracts?.returns??[]])if(r.factionId===fid&&r.due<=s.turn){s.mechContracts.returns=s.mechContracts.returns.filter(q=>q!==r);const b=s.armies[r.targetId];if(!b?.troopCount)continue;if(open(s,b,r.tileId))forceArmyTo(s,b.armyId,r.tileId);for(const t of live(s).filter(t=>t.factionId===b.factionId&&distance(s,b,t)<=1))checkMorale(s,t.armyId,'유계정요동',5);}
}
export function c507Finish(s,fid){
 if(!enabled(s))return;
 for(const a of live(s)){const x=read(a);if(x.finishes?.[fid]===s.turn)continue;if(Object.keys(x).length)(book(a).finishes??={})[fid]=s.turn;if(a.factionId===fid){
   if(x.conceal&&--x.conceal.ends<=0)delete book(a).conceal;
   if(x.bewitched&&x.bewitched.starts<=s.turn&&--x.bewitched.ends<=0)delete book(a).bewitched;
   if(owns(s,a,'G92')){const c=enemyCities(s,a).find(c=>c.footprint.gates.some(t=>distance(s,a,t)===1));if(c)x.gate={cityId:c.cityId,gates:c.footprint.gates.filter(t=>distance(s,a,t)===1),expires:s.turn+1};}
   if(x.duel?.source===a.armyId&&--x.duel.ends<=0){const b=s.armies[x.duel.other],other=read(b).duel;if(b&&other?.key===x.duel.key){const ratio=a.troopCount/x.duel.initial,br=b.troopCount/other.initial;if(ratio<br)drop(s,a.armyId,2);else if(br<ratio)drop(s,b.armyId,2);delete book(b).duel;}delete book(a).duel;}
  }else{if(owns(s,a,'G15')&&x.cityHit===fid){a.c50.resource=Math.min(armyEngine(s,a.armyId).max,a.c50.resource+campaignMechQuery(s,'H09','resourceGain',{sourceId:a.armyId},1));delete book(a).cityHit;}if(x.closed&&--x.closed.ends<=0)delete book(a).closed;}
 }
 for(const c of Object.values(s.cities))if(c.mechV2?.c507Silent?.factionId===fid&&--c.mechV2.c507Silent.ends<=0)delete c.mechV2.c507Silent;
}
let installed=false;
export function c507Install(){
 if(installed)return;installed=true;
 registerCampaignMech('H01','c507-chain',{operations:['sharedLossRows'],query:({state:s,rows},v)=>{
  if(!enabled(s))return;const out=[...v];for(const r of rows){const mark=read(s.armies[r.targetId]).chain;if(!mark||mark.expires<=s.turn)continue;for(const b of live(s))if(b.armyId!==r.targetId&&read(b).chain?.source===mark.source&&read(b).chain.expires>s.turn)out.push({targetId:b.armyId,loss:Math.floor(r.loss/3),originalSourceId:r.sourceId,originalTargetId:r.targetId,generation:1});}return out;
 }});
 registerCampaignMech('H04','c507-permissions',{operations:['attackAllowed'],query:({state:s,sourceId,targetId},v)=>{if(!enabled(s))return;const a=s.armies[sourceId],b=s.armies[targetId],duel=read(a).duel,other=read(b).duel;if(duel&&duel.other!==targetId||other&&other.other!==sourceId||read(a).bewitched&&read(a).bewitched.source===targetId)return false;}});
 registerCampaignMech('H03','c507-reactions',{operations:['reactionPlan','reactionAllowed'],query:({state:s,operation,sourceId,targetId,kind},v)=>{if(!enabled(s))return;if(operation==='reactionPlan'&&read(s.armies[sourceId]).firstRear)return {...v,forceSide:'REAR'};if(kind==='APPROACH_FIRE'&&owns(s,s.armies[targetId],'G40')&&hidden(s.armies[targetId]))return false;}});
 registerCampaignMech('H05','c507-movement',{operations:['controlZone','moveAllowed'],query:({state:s,operation,sourceId,targetId,to},v)=>{if(!enabled(s))return;const a=s.armies[sourceId];if(operation==='controlZone'&&owns(s,s.armies[targetId],'G40')&&hidden(s.armies[targetId]))return false;if(operation==='moveAllowed'&&a&&live(s).some(g=>read(g).closed?.gates.includes(to)&&g.factionId!==a.factionId))return false;}});
 registerCampaignMech('H07','c507-river',{operations:['edgeCost'],query:({state:s,sourceId,from,to},v)=>{const a=s.armies[sourceId];if(!enabled(s)||read(a).riverUntil!==s.turn||!s.tiles[to]||!s.tiles[from]||![s.tiles[to].terrainType,s.tiles[from].terrainType].includes('water'))return;return movementTicks({from:{...s.tiles[from],terrainType:'plain'},to:{...s.tiles[to],terrainType:'plain'},troopType:parentTroop(a.troopType),maneuver:s.officers[a.commanderId].subStats.기동지휘,edge:{road:false,river:false,crossing:'none',blocked:false},tuning:s.mapRules.tuning,tickDays:s.time.tickDays});}});
 registerCampaignMech('H13','c507-hidden',{operations:['hidden'],query:({state:s,targetId,viewerFactionId},v)=>enabled(s)&&read(s.armies[targetId]).conceal&&s.armies[targetId].factionId!==viewerFactionId?true:v});
 registerCampaignMech('H13','c507-labels',{operations:['armyDisplay'],query:({state:s,targetId},v)=>{if(!enabled(s))return;const x=read(s.armies[targetId]),labels=[v.statusLabel,...(x.chain&&x.chain.expires>s.turn?['연환']:[]),...(x.duel?['일기당선']:[]),...(x.bewitched?['연환미계']:[])].filter(Boolean);return labels.length?{...v,statusLabel:labels.join(' · ')}:v;}});
 registerCampaignMech('H12','c507-return-display',{operations:['publicMap'],query:({state:s,factionId},v)=>{if(!enabled(s))return;const returnRoutes=live(s).filter(a=>a.factionId===factionId&&read(a).returnRoute?.due===s.turn).map(a=>({armyId:a.armyId,destinationTileId:read(a).returnRoute.tileId,expires:s.turn}));return returnRoutes.length?{...v,returnRoutes}:v;}});
 registerCampaignMech('H06','c507-return',{operations:['commandPlan'],query:({state:s,command},p)=>{const a=s.armies[command?.armyId],r=read(a).returnRoute;if(!enabled(s)||command?.type!=='RETURN_ROUTE'||!r||s.turn!==r.due||command.destinationTileId!==r.tileId||!canMainAction(s,a.armyId)||!open(s,a,r.tileId))return;return {...p,command:{type:'MOVE_UNIT',armyId:a.armyId,destinationTileId:r.tileId},permission:{tokenId:`C507.RETURN.${a.armyId}.${r.due}`,kind:'RETURN',uses:1,expires:s.turn,generation:0}};}});
 registerCampaignMech('H02','c507-recovery',{operations:['c507Recovery'],query:({state:s,sourceId},p)=>{const a=s.armies[sourceId];if(!owns(s,a,'G15'))return;const city=cityAt(s,a);let remaining=Math.min(read(a).recoverBudget??0,(s.personnel.formations.find(f=>f.formationId===sourceId)?.targetStrength??a.deploymentStrength)-a.troopCount);const transfers=[...p.transfers];for(const b of friends(s,a,Infinity).filter(b=>b!==a&&city&&tiles(city).includes(b.tileId))){const count=Math.min(remaining,s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===b.armyId).reduce((n,l)=>n+l.count,0));if(count>0){transfers.push({fromId:b.armyId,toId:sourceId,count,mode:'FIELD'});remaining-=count;}}return {...p,transfers};}});
 registerCampaignMech('H08','c507-pride',{operations:['damageFactor'],query:({state:s,sourceId,targetId},v)=>enabled(s)&&read(s.armies[targetId]).pride?.factionId===s.armies[sourceId]?.factionId?v*1.2:v});
 registerCampaignMech('H18','c507-xp',{operations:['combatXp'],query:({state:s,sourceId,combat},v)=>enabled(s)&&(combat?.units??[]).some(u=>read(s.armies[u.unitId]).pride?.factionId===s.armies[sourceId]?.factionId)?Math.floor(v*.8):v});
 registerCampaignMech('H16','c507-cities',{operations:['castleDefense','cityDefense','cityCounter','cityDamage','cityShotAllowed','centerEntry','cityAttackCommitted'],query:({state:s,operation,sourceId,attackerId,cityId},v)=>{
  if(!enabled(s))return;const a=s.armies[attackerId??sourceId];if(['castleDefense','cityDefense'].includes(operation)&&(read(a).firstRear||read(a).gateStrike))return 1;
  if(operation==='cityCounter'&&live(s).some(g=>read(g).closed?.cityId===cityId))return Math.round(v*1.5);
  if(operation==='cityDamage'&&a&&live(s).some(g=>g.factionId===a.factionId&&read(g).cityRaid?.cityId===cityId&&read(g).cityRaid.expires>s.turn))return Math.round(v*1.5);
  if(operation==='cityShotAllowed'&&s.cities[cityId]?.mechV2?.c507Silent)return false;
  if(operation==='centerEntry'&&a&&live(s).some(g=>g.factionId===a.factionId&&read(g).gate?.cityId===cityId&&read(g).gate.expires>=s.turn&&read(g).gate.gates.includes(a.tileId)))return true;
 },commit:({state:s,operation,sourceId,cityId})=>{if(!enabled(s)||operation!=='cityAttackCommitted')return;const a=s.armies[sourceId],city=s.cities[cityId];const defenders=live(s).filter(g=>cityAt(s,g)?.cityId===cityId);const raid=live(s).some(g=>g.factionId===a.factionId&&read(g).cityRaid?.cityId===cityId&&read(g).cityRaid.expires>s.turn);if(!raid&&!read(a).firstRear&&!read(a).gateStrike&&!defenders.some(g=>owns(s,g,'G15')))return;const out=cloneCampaign(s);for(const g of defenders){if(owns(s,g,'G15'))book(out.armies[g.armyId]).cityHit=a.factionId;if(raid&&g.factionId===city.ownerFactionId)checkMorale(out,g.armyId,'기습오소',5,out.lastCombat.moraleChanges);}delete out.armies[sourceId].mechV2?.c507?.firstRear;delete out.armies[sourceId].mechV2?.c507?.gateStrike;return out;}});
 registerCampaignMech('H12','c507-forecasts',{operations:['scheduledPlan','forecastResolved','engineEvent'],query:({state:s,sourceId},p)=>owns(s,s.armies[sourceId],'G22')?{...p,independent:true}:p,commit:({state:s,operation,sourceId,targetIds,type,payload})=>{
  if(!enabled(s))return;
  if(operation==='forecastResolved'&&['G21','G22'].some(g=>owns(s,s.armies[sourceId],g))){const out=cloneCampaign(s),ids=(targetIds??[]).filter(id=>out.armies[id]?.troopCount>0);if(owns(s,s.armies[sourceId],'G21')&&ids.some(id=>ids.some(other=>id!==other&&distance(s,s.armies[id],s.armies[other])===1)))for(const id of ids)changeFormation(out,id,1,out.lastCombat?.formationChanges);if(owns(s,s.armies[sourceId],'G22'))for(const id of ids)checkMorale(out,id,'기좌곽가',5,out.lastCombat?.moraleChanges);return out;}
  if(operation==='engineEvent'&&['ARRIVE','FORCED_MOVE'].includes(type)){const a=s.armies[payload.armyId];if(a&&live(s).some(g=>g.factionId===a.factionId&&read(g).gate?.gates.includes(a.tileId)&&read(g).gate.expires>=s.turn)){const out=cloneCampaign(s);book(out.armies[a.armyId]).gateStrike=true;return out;}}
 }});
}
