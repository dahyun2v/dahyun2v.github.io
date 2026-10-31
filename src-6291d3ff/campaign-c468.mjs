import {registerCampaignMech,campaignMechAllowed} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {forceArmyTo,resolveAttack} from './campaign-combat.mjs';
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden} from './campaign-effects.mjs';
import {uniqueBuff,uniqueStatus} from './campaign-rule-registry.mjs';
import {engineOrderRecipients} from './campaign-engines.mjs';
import {changeFormation} from './campaign-abilities.mjs';

// Partial packages must never be installed. G32/G48/G72 await the contracts
// described in RESULT.md; their saved cards and mechanics stay legacy.
export const C468_IDS=Object.freeze(['G12','G46','G62','G83']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a,g)=>enabled(s)&&a?.commanderId===g&&s.campaignGrowth?.officers[g]?.mechanicsV2===true&&a.troopCount>0&&castleArmyActive(s,a);
const z=a=>(a.mechV2??={}).c468??={};
const dist=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const friends=(s,a,n)=>live(s).filter(b=>b.factionId===a.factionId&&dist(s,a,b)<=n).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const visible=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId);
const foes=(s,a,n)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&dist(s,a,b)<=n&&visible(s,a,b));
const recognized=(s,c)=>enabled(s)&&C468_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const cavalry=a=>['cavalry','hubao','horseArcher','baima','xiliang'].includes(a.troopType);
const empty=(s,id,to,actual=false)=>s.tiles[to]&&s.knowledge[s.armies[id].factionId]?.tiles[to]==='VISIBLE'&&!['water','mountain'].includes(s.tiles[to].terrainType)&&campaignDestinationAllowed(s,id,to)&&!live(s).some(b=>b.armyId!==id&&b.tileId===to&&(actual||b.factionId===s.armies[id].factionId||visible(s,s.armies[id],b)))&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(to));
export function c468ForceArmyTo(s,id,to){
 const a=s.armies[id];if(!campaignMechAllowed(s,'H05','moveAllowed',{sourceId:id,from:a.tileId,to,kind:'FORCED'}))return s;
 // Arrival effects may themselves validate or displace this army again.
 a.currentOrder=null;return forceArmyTo(s,id,to);
}
export function c468Calm(s,id){const a=s.armies[id];return !!a&&live(s).some(g=>owns(s,g,'G62')&&g.armyId!==id&&g.factionId===a.factionId&&dist(s,g,a)===1);}
export function c468IgnoreMorale(s,id,reason){return /\uC544\uAD70.*\uD328\uC8FC|\uC8FC\uBCC0.*\uD328\uC8FC/.test(reason??'')&&c468Calm(s,id);}
export function c468Cancel(s,id,target,c){return c468Calm(s,target)&&(c.id==='CTA-10'||c.effects?.some(e=>e.rule==='FALSE_ORDERS'));}
function train(s,id,to){
 const a=s.armies[id],start=s.tiles[a.tileId],end=s.tiles[to];if(!end)return null;
 const n=hexDistance(start,end);if(n<1||n>5)return null;
 const dq=(end.q-start.q)/n,dr=(end.r-start.r)/n;
 if(!neighbors({q:0,r:0}).some(d=>d.q===dq&&d.r===dr))return null;
 const path=Array.from({length:n},(_,i)=>tileId({q:start.q+dq*(i+1),r:start.r+dr*(i+1)}));
 const riders=friends(s,a,1).filter(b=>b.armyId!==id&&cavalry(b));
 // Every carriage has its own legal translated straight route. A blocked
 // carriage stops before the blockage; nobody overlaps or teleports through it.
 const plans=[{id,path,from:a.tileId}];const occupied=new Set(live(s).filter(b=>b.armyId!==id&&!riders.includes(b)&&(b.factionId===a.factionId||visible(s,a,b))).map(b=>b.tileId));
 for(const b of riders)plans.push({id:b.armyId,from:b.tileId,path:Array.from({length:n},(_,i)=>tileId({q:s.tiles[b.tileId].q+dq*(i+1),r:s.tiles[b.tileId].r+dr*(i+1)}))});
 const moving=new Set(plans.map(p=>p.id));
 for(const p of plans){const board={...s,armies:Object.fromEntries(Object.entries(s.armies).filter(([id])=>id===p.id||!moving.has(id)))};const valid=[];for(const t of p.path){if(!s.tiles[t]||s.knowledge[a.factionId]?.tiles[t]!=='VISIBLE'||['water','mountain'].includes(s.tiles[t].terrainType)||!campaignDestinationAllowed(board,p.id,t)||occupied.has(t)||Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(t)))break;valid.push(t);}p.path=valid;}
 if(plans[0].path.length!==n)return null;
 return plans;
}
export function c468Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1];
 if(g==='G12')return c.slot==='E'?friends(s,a,2).filter(b=>b.armyId!==id&&cavalry(b)&&neighbors(s.tiles[a.tileId]).map(tileId).some(t=>empty(s,b.armyId,t))).map(b=>b.armyId):Object.keys(s.tiles).filter(to=>train(s,id,to)).sort();
 if(g==='G62')return zRead(a).receivedTurn===s.turn?[]:friends(s,a,2).filter(b=>b.armyId!==id&&zRead(b).receivedTurn!==s.turn).map(b=>b.armyId);
 return foes(s,a,1).map(b=>b.armyId).sort();
}
const zRead=a=>a?.mechV2?.c468??{};
function strike(s,id,to,k,kind,noCounter=false){
 // These are attacks, not raw effect rows: keep formation, morale, counter,
 // actual combat credit and the committed rout event on the normal pipeline.
 return resolveAttack(s,id,to,null,{enginePaid:true,troopQRatio:k,c450Tactic:true,engineOrigin:kind,noCounter});
}
export function c468Cast(s,id,c,target){
 if(!recognized(s,c))return s;let a=s.armies[id];const g=c.rule.split('_')[1];
 if(g==='G46'){z(a).plunderR={target,turn:s.turn};s=strike(s,id,target,1.7,'P468_G46_R');if(s.armies[target].troopCount>0)uniqueStatus(s,id,target,'ROOTED',1,{guaranteed:true});delete z(s.armies[id]).plunderR;}
 if(g==='G83'){z(a).lootR={target,count:s.armies[target].troopCount,turn:s.turn};for(let i=0;i<2&&s.armies[target].troopCount>0&&s.armies[id].troopCount>0&&s.armies[id].morale!=='ROUTING'&&castleArmyActive(s,s.armies[id]);i++)s=strike(s,id,target,.6,'P468_G83_R',i>0);delete z(s.armies[id]).lootR;}
 if(g==='G62'){
  const b=s.armies[target];z(b).receivedTurn=s.turn;if(b.mainActionTurn===s.turn&&(b.mainActionCount??0)>0)z(b).extraAttack={source:id,turn:s.turn,tokenId:`C468.PASS.${s.turn}.${id}.${target}`};z(b).nextAttack=true;
  uniqueBuff(s,id,target,'MOVE_MOD',2);if(!s.endedArmyIds.includes(id))s.endedArmyIds.push(id);
 }
 if(g==='G12'){
  if(c.slot==='E'){const to=neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>empty(s,target,t,true)).sort()[0];if(to)c468ForceArmyTo(s,target,to);}
  else {
   const plans=train(s,id,target);if(!plans)throw Error('C468_GROUP_ROUTE');
   // Advance the leading positions first along the shared vector.
   const end=s.tiles[target],start=s.tiles[a.tileId],dq=end.q-start.q,dr=end.r-start.r;
   for(let i=0;i<5;i++)for(const p of [...plans].sort((p,q)=>{const b=s.tiles[s.armies[p.id].tileId],c=s.tiles[s.armies[q.id].tileId];return (c.q*dq+c.r*dr)-(b.q*dq+b.r*dr)||p.id.localeCompare(q.id);})){const to=p.path[i];if(!to||p.stopped)continue;const unit=s.armies[p.id];if(unit.troopCount<=0||unit.morale==='ROUTING'||!castleArmyActive(s,unit)||!empty(s,p.id,to,true)){p.stopped=true;continue;}c468ForceArmyTo(s,p.id,to);if(s.armies[p.id].tileId!==to){p.stopped=true;continue;}s.armies[p.id].movedTiles=(s.armies[p.id].movedTiles??0)+1;}
   const count=plans.filter(p=>p.id!==id&&s.armies[p.id].tileId!==p.from).length;
   const enemy=foes(s,s.armies[id],1).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];if(enemy){s=strike(s,id,enemy.armyId,1+.2*count,'P468_G12_R');if(s.armies[enemy.armyId].troopCount>0)changeFormation(s,enemy.armyId,Math.min(2,count));}
  }
 }
 return s;
}
export function c468AfterOrder(s,before,id,action){if(action!=='ORDER'||!owns(s,s.armies[id],'G12'))return;for(const to of engineOrderRecipients(before,id)){const a=s.armies[to];if(cavalry(a))uniqueBuff(s,id,to,'MOVE_MOD',1);}}
// Commit inputs are frozen detached snapshots. These reducers write only armies;
// the registry detaches the complete result before exposing it to the caller.
let installed=false;
export function c468Install(){
 if(installed)return;installed=true;
 registerCampaignMech('H02','c468-plunder',{operations:['routPlan'],query:({state:s,sourceId,targetId},p)=>{
  if(!enabled(s))return;const b=s.armies[targetId],hit=zRead(b).lastHit;if(hit?.sequence===s.battleSequence)sourceId=hit.source;const a=s.armies[sourceId];if(!a||!b||!diplomacyArmyHostile(s,sourceId,targetId))return;
  const g=a.commanderId,book=zRead(a),ratio=g==='G46'?.1*(book.plunderR?.target===targetId?2:1):g==='G83'&&book.lootR?.target===targetId?.05:0;
  if(!ratio||!owns(s,a,g))return;
  const actual=s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===targetId).reduce((n,l)=>n+l.count,0);
  const original=g==='G83'&&book.lootR?.target===targetId&&Number.isSafeInteger(book.lootR.count)?book.lootR.count:hit?.sequence===s.battleSequence?hit.count:s.lastCombat?.units?.find(u=>u.unitId===targetId)?.preBattleCount??b.troopCount;
  const count=Math.min(actual,Math.floor(original*ratio));if(!count)return;
  const city=g==='G46'?Object.values(s.cities).find(c=>c.ownerFactionId===a.factionId&&c.governorId===g):null;
  return {...p,transfers:[...p.transfers,{fromId:targetId,toId:sourceId,count,mode:'WOUNDED',...(city?{cityId:city.cityId,securityDelta:1}:{})}]};
 }});
 registerCampaignMech('H01','c468-damage',{operations:['loss','lossSettled'],query:({state:s,operation,sourceId,targetId},n)=>{
  if(operation!=='loss'||!enabled(s)||n<=0)return;const a=s.armies[sourceId],b=s.armies[targetId];let factor=1;
  if(owns(s,a,'G83')){const near=friends(s,a,2).filter(b=>b.armyId!==sourceId);factor*=!near.length?1.15:near.some(b=>dist(s,a,b)===1)?.95:1;}
  if(owns(s,b,'G83')){const near=friends(s,b,2).filter(a=>a.armyId!==targetId);factor*=!near.length?.9:near.some(a=>dist(s,a,b)===1)?.95:1;}
  if(zRead(a).nextAttack&&zRead(a).receivedTurn===s.turn&&s.activeFactionId===a.factionId)factor*=1.15;
  return Math.round(n*factor);
 },commit:({state:s,operation,sourceId,targetId,snapshot})=>{
  if(operation!=='lossSettled'||!enabled(s)||!snapshot?.units)return;const next={...s,armies:cloneCampaign(s.armies)};
  for(const u of snapshot.units)if(u.casualties>0&&next.armies[u.unitId]){
   const dealer=u.unitId===sourceId?targetId:sourceId;
   if(['G46','G83'].includes(next.armies[dealer]?.commanderId)&&owns(s,s.armies[dealer],s.armies[dealer].commanderId))z(next.armies[u.unitId]).lastHit={source:dealer,count:u.preBattleCount,sequence:s.battleSequence};
   if(next.armies[dealer]&&zRead(next.armies[dealer]).nextAttack)delete z(next.armies[dealer]).nextAttack;
  }
  return next;
 }});
 registerCampaignMech('H14','c468-pass-action',{operations:['commandPlan'],query:({state:s,command},p)=>{
  if(!enabled(s)||!['ATTACK_UNIT','USE_TROOP_Q'].includes(command?.type))return;const a=s.armies[command.armyId],grant=zRead(a).extraAttack;
  if(!grant||grant.turn!==s.turn||s.mechContracts?.spent?.[grant.tokenId]||!s.endedArmyIds.includes(a.armyId))return;
  return {...p,permission:{sourceId:grant.source,tokenId:grant.tokenId,kind:'EXTRA_ATTACK',uses:1,expires:s.turn,generation:0}};
 }});
}
