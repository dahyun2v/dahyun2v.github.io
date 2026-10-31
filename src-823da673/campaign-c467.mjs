import {c507AfterAttack} from './campaign-c507.mjs';
import {c505Deploy,c505AfterAttack} from './campaign-c505.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {uniqueBuff,uniqueIgnite} from './campaign-rule-registry.mjs';
import {changeFormation} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {healCampaignTroops,ambushHidden} from './campaign-effects.mjs';
import {engineBaseDamage,engineDamageRows} from './campaign-combat.mjs';
import {combatFireAt} from './campaign-rule-registry.mjs';
import {c34RemoveStatuses} from './campaign-c34.mjs';

// Only complete officer packages belong here. Older saved batch markers opt out.
export const C467_IDS=Object.freeze(['G16','G41','G51','G64','G65','G93','G99','G100']);
export const c467Enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
export const c467Owns=(s,a,g)=>c467Enabled(s)&&a?.commanderId===g&&a.troopCount>0&&castleArmyActive(s,a);
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const z=a=>a.mechV2??={};
const dist=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const friends=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&dist(s,a,b)<=n).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const visible=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId);
const foes=(s,a,n)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&dist(s,a,b)<=n&&visible(s,a,b)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const wounds=(s,id)=>s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id).reduce((n,l)=>n+l.count,0);
const heal=(s,id,k)=>healCampaignTroops(s,id,Math.floor(wounds(s,id)*k));
const rally=(s,id)=>changeMorale(s,id,s.armies[id].morale==='ROUTING'?'SHAKEN':'STEADY','결속');
const recognized=(s,c)=>c467Enabled(s)&&C467_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
export function c467Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1];
 if(['G64','G65'].includes(g))return friends(s,a,1).filter(b=>b.armyId!==id).map(b=>b.armyId);
 if(g==='G41'&&c.slot==='E')return friends(s,a,Infinity).filter(b=>b.armyId!==id&&visible(s,a,b)).map(b=>b.armyId);
 if(g==='G93'&&c.slot==='E')return foes(s,a,2).map(b=>b.armyId);
 if(g==='G99'&&!a.c50?.flag)return [];
 return [id];
}
export function c467Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id],g=c.rule.split('_')[1],e=c.slot==='E';
 if(g==='G64'){a.braced=false;if(a.c27)delete a.c27.stakes;z(s.armies[target]).liImbue={source:id,defense:true,counter:true,expires:s.turn+1};}
 if(g==='G65'){changeFormation(s,id,1);changeFormation(s,target,-2);heal(s,target,.3);}
 if(g==='G16'){
  for(const b of friends(s,a,e?2:3)){
   if(e){c34RemoveStatuses(s,b.armyId,x=>['CONFUSED','ROOTED','SLOWED'].includes(x.status)||x.op==='MOVE_MOD'&&x.value<0);if(b.c50){delete b.c50.rooted;delete b.c50.rootNext;}if(s.c467?.clinics?.[id]?.tileId===b.tileId)heal(s,b.armyId,.15);}
   else heal(s,b.armyId,.2);
  }
  if(!e&&s.c467?.clinics?.[id])s.c467.clinics[id].blocked=true;
 }
 if(g==='G41'){
  if(e){z(a).ruBond=target;rally(s,target);}
  else {const centers=c467AuraOrigins(s,a);for(const b of live(s).filter(b=>b.factionId===a.factionId&&centers.some(at=>dist(s,b,at)<=2))){rally(s,b.armyId);z(b).bondGuard={source:id};}}
 }
 if(g==='G51'){
  if(e){for(const b of friends(s,a))uniqueBuff(s,id,b.armyId,'MOVE_MOD',2);z(a).marchDebt=true;}
  else {z(a).auraRadius=0;z(a).auraReset=true;for(const b of friends(s,a,Infinity).filter(b=>visible(s,a,b)))z(b).globalAdvance={source:id,turn:s.turn};}
 }
 if(g==='G99')for(const b of friends(s,{...a,tileId:a.c50.flag})){z(b).flagRangeTurn=s.turn;uniqueBuff(s,id,b.armyId,'MOVE_MOD',1);}
 if(g==='G100')z(a).liuAttack={turn:s.turn,value:Math.min(32,friends(s,a).filter(b=>b.armyId!==id).length*8)};
 if(g==='G93'){
  if(e){const hit=new Set();let to=target,k=1;for(let n=0;n<3&&to;n++){hit.add(to);s=knife(s,id,to,k);const b=s.armies[to];to=foes(s,s.armies[id],Infinity).find(t=>!hit.has(t.armyId)&&dist(s,t,b)===1)?.armyId;k/=2;}}
  else {const ids=foes(s,a,1).map(b=>b.armyId);for(const to of ids){s=knife(s,id,to,1);uniqueIgnite(s,id,to,1,rows=>Object.assign(s,engineDamageRows(s,id,rows,'P467_FIRE',true)),false);if(s.armies[to].troopCount>0)checkMorale(s,to,c.name,10);}changeFormation(s,id,s.armies[id].formation==='ORDERED'?1:0);}
 }
 return s;
}
function knife(s,id,to,k){return engineDamageRows(s,id,[{targetId:to,loss:Math.max(1,Math.round(engineBaseDamage(s,id,to)*k))}],'P467_KNIFE',true);}
export function c467CartCapacity(s,source,recipient,amount){
 if(!c467Owns(s,source,'G65')||amount<=0)return amount;
 const full=s.personnel.formations.find(f=>f.formationId===recipient.armyId)?.targetStrength??recipient.deploymentStrength??recipient.troopCount;
 if(recipient.troopCount>=full/2)return amount;
 z(source).cartDebt=true;return Math.floor(amount*1.5);
}
export function c467CartSpend(s,a,n){if(c467Owns(s,a,'G65')&&a.mechV2?.cartDebt){delete a.mechV2.cartDebt;return Math.max(0,n-1);}return n;}
export function c467CartEntry(s,source,recipient,cart){
 if(c467Owns(s,source,'G64'))z(recipient).cartAttack=true;
 if(c467Owns(s,source,'G16')){s.c467??={};s.c467.clinics??={};s.c467.clinics[source.armyId]={tileId:cart.tileId,factionId:source.factionId,blocked:false};}
}
export function c467AuraOrigins(s,a){
 const b=s.armies[a.mechV2?.ruBond];return c467Owns(s,a,'G41')&&b&&b.troopCount>0&&b.morale!=='ROUTING'&&b.factionId===a.factionId&&castleArmyActive(s,b)?[a.tileId,b.tileId]:[a.tileId];
}
export function c467Deploy(s,a){
 c505Deploy(s,a);
 if(c467Owns(s,a,'G41')&&!a.mechV2?.ruBond){const b=friends(s,a,Infinity).find(b=>b.armyId!==a.armyId);if(b)z(a).ruBond=b.armyId;}
}
export function c467OrderRange(s,g,base){
 if(!c467Enabled(s))return base;
 if(c467Owns(s,g,'G51'))return g.mechV2?.auraRadius===undefined?base:g.mechV2.auraReset?g.mechV2.auraRadius:Math.max(0,base+g.mechV2.auraRadius-(g.mechV2.auraBase??base));
 if(c467Owns(s,g,'G99')&&g.c50.flag)return base+1;
 if(c467Owns(s,g,'G100')){const origin=g.c50.flag??g.tileId;return base+(friends(s,{...g,tileId:origin},base).filter(b=>b.armyId!==g.armyId).length>=3?1:0);}
 return base;
}
export function c467Factor(s,id,to){
 if(!c467Enabled(s))return 1;const a=s.armies[id],b=s.armies[to];let f=a.mechV2?.cartAttack?1.15:1;
 if(b.mechV2?.liImbue?.defense)f*=.7;
 if(a.mechV2?.liuAttack?.turn===s.turn)f*=1+a.mechV2.liuAttack.value/100;
 for(const g of live(s).filter(g=>c467Owns(s,g,'G100')&&g.factionId===b.factionId)){
  const home=Object.values(s.cities).filter(c=>c.ownerFactionId===g.factionId).sort((a,b)=>a.cityId.localeCompare(b.cityId)).find(c=>c.cityId===s.factions[g.factionId].capitalCityId);
  if(home&&dist(s,g,home)>3&&[home.tileId,...home.footprint?.gates??[],...home.footprint?.walls??[]].includes(b.tileId)){f*=1.15;break;}
 }
 return f;
}
export function c467CounterFactor(s,id){return c467Enabled(s)&&s.armies[id]?.mechV2?.liImbue?.counter?1.2:1;}
function radiusChange(s,g,n){const base=g.c50.resource>=3?3:2;z(g).auraRadius=Math.max(0,Math.min(base+2,c467OrderRange(s,g,base)+n));z(g).auraBase=base;}
export function c467ResultEvent(s,type,p){
 if(!c467Enabled(s)||!['FORMATION_CHANGE','MORALE_CHANGE'].includes(type)||!String(s.c50?.context?.origin).match(/^(tactic|warning):/))return;
 const a=s.armies[s.c50.context.attackerId],b=s.armies[p.armyId];
 if(!a||!b||!diplomacyArmyHostile(s,a.armyId,b.armyId)||!(type==='MORALE_CHANGE'?p.to==='ROUTING':['ORDERED','DISORDERED','BROKEN'].indexOf(p.to)>['ORDERED','DISORDERED','BROKEN'].indexOf(p.from)))return;
 for(const g of live(s).filter(g=>c467Owns(s,g,'G51')&&g.factionId===a.factionId))if(dist(s,a,g)<=c467OrderRange(s,g,g.c50.resource>=3?3:2))radiusChange(s,g,1);
}
export function c467AfterCombat(s,before,id,to,log,options){
 if(options.troopQ){c505AfterAttack(s,before,id,to,options,log);c507AfterAttack(s,before,id,to,options,log);}
 if(!c467Enabled(s))return;
 const a=s.armies[id],b=s.armies[to];
 if(log.enemyLoss>0)delete a.mechV2?.cartAttack;
 if(!options.reaction&&log.counter&&log.allyLoss>0)delete b.mechV2?.cartAttack;
 for(const u of log.units??[])if(u.casualties>0&&s.armies[u.unitId]?.mechV2?.liImbue)s.armies[u.unitId].mechV2.liImbue.defense=false;
 for(const g of live(s).filter(g=>c467Owns(s,g,'G51'))){
  const old=before.armies[g.armyId];if(!old)continue;
  const pairs=[...[...new Set([to,...(log.units??[]).map(u=>u.unitId)])].filter(v=>s.armies[v]&&diplomacyArmyHostile(s,id,v)).map(v=>[id,v]),...(!options.reaction&&log.counter&&!log.engineCounter?[[to,id]]:[])];
  for(const [dealer,victim] of pairs)if(before.armies[dealer]?.factionId===g.factionId&&dist(before,before.armies[dealer],old)<=c467OrderRange(before,old,old.c50.resource>=3?3:2)){
   const results=new Set([...(log.formationChanges??[]).filter(x=>x.armyId===victim&&['ORDERED','DISORDERED','BROKEN'].indexOf(x.to)>['ORDERED','DISORDERED','BROKEN'].indexOf(x.from)).map(x=>`formation:${x.to}`),...(log.moraleChanges??[]).filter(x=>x.armyId===victim&&x.to==='ROUTING').map(()=>`rout`)]);
   if(results.size)radiusChange(s,g,results.size);
  }
  if((log.units??[]).some(u=>u.unitId===g.armyId&&u.casualties>0)&&g.mechV2?.radiusHit!==s.turn){z(g).radiusHit=s.turn;radiusChange(s,g,-1);}
 }
 // A reserved counter is its own reaction; the enclosing log must not emit it again.
 const source=options.c467Counter&&c467Owns(s,a,'G93')?a:!options.reaction&&!options.noCounter&&log.counter&&!log.engineCounter&&c467Owns(s,b,'G93')?b:null;
 if(source){let current=source.armyId===id?to:id;const hit=new Set([current]);const outer=s.lastCombat;for(let n=0;n<2;n++){const next=foes(s,source,2).find(t=>!hit.has(t.armyId));if(!next)break;hit.add(next.armyId);const at=next.tileId;Object.assign(s,knife(s,source.armyId,next.armyId,.4));current=next.armyId;if(!combatFireAt(s,at))break;}s.lastCombat=outer;}
}
export function c467Start(s,fid){
 if(!c467Enabled(s))return;s.c467??={};s.c467.starts??={};if(s.c467.starts[fid]===s.turn)return;s.c467.starts[fid]=s.turn;
 for(const a of live(s)){
  if(a.mechV2?.bondGuard&&s.armies[a.mechV2.bondGuard.source]?.factionId===fid)delete a.mechV2.bondGuard;
  if(a.factionId!==fid)continue;
  if(c467Owns(s,a,'G41')&&!a.mechV2?.ruBond){const b=friends(s,a,Infinity).find(b=>b.armyId!==a.armyId);if(b)z(a).ruBond=b.armyId;}
  if(a.mechV2?.marchDebt){uniqueBuff(s,a.armyId,a.armyId,'MOVE_MOD',-2);delete a.mechV2.marchDebt;}
  for(const clinic of Object.values(s.c467.clinics??{}))if(clinic.tileId===a.tileId)heal(s,a.armyId,.1);
 }
 for(const clinic of Object.values(s.c467.clinics??{}))if(clinic.factionId===fid)clinic.blocked=false;
}
export function c467MoveAllowed(s,id,to){return !c467Enabled(s)||!Object.values(s.c467?.clinics??{}).some(c=>c.blocked&&c.tileId===to&&c.factionId!==s.armies[id]?.factionId);}
export function c467FormationGuard(s,id){if(!c467Enabled(s)||s.activeFactionId===s.armies[id]?.factionId||!s.armies[id]?.mechV2?.bondGuard)return false;delete s.armies[id].mechV2.bondGuard;return true;}
export function c467AfterLoss(s,source,units){if(!c467Enabled(s))return;const from=s.armies[source];if(from?.mechV2?.cartAttack&&s.c50?.context?.attackerId===source&&units.some(u=>u.casualties>0&&s.armies[u.unitId]&&diplomacyArmyHostile(s,source,u.unitId)))delete from.mechV2.cartAttack;for(const u of units)if(u.casualties>0){const a=s.armies[u.unitId];if(a?.mechV2?.liImbue)a.mechV2.liImbue.defense=false;if(c467Owns(s,a,'G51')&&a.mechV2?.radiusHit!==s.turn){z(a).radiusHit=s.turn;radiusChange(s,a,-1);}}}
export function c467Finish(s,fid){if(!c467Enabled(s))return;for(const a of live(s))if(a.mechV2?.liImbue&&s.armies[a.mechV2.liImbue.source]?.factionId===fid&&a.mechV2.liImbue.expires<=s.turn)delete a.mechV2.liImbue;}
export function c467Pay(s,id,c){if(!c467Enabled(s)||!(c.signature||c.slot==='R'))return;s.c467??={};s.c467.rUses??={};const g=s.armies[id].commanderId;s.c467.rUses[g]=(s.c467.rUses[g]??0)+1;}
