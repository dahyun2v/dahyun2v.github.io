import {engineOrderRecipients} from './campaign-engines.mjs';
// Batch three: only officers expressible through the existing C34/C450 hooks.
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile,diplomacyHostile} from './campaign-diplomacy.mjs';
import {changeFormation,checkFormation,directionToward} from './campaign-abilities.mjs';
import {changeMorale,checkMorale} from './campaign-morale.mjs';
import {uniqueBuff,uniqueStatus,uniqueIgnite,oppositeCombatTile} from './campaign-rule-registry.mjs';
import {resolveAttack,forceArmyTo,attackRange,engineDamageRows} from './campaign-combat.mjs';
import {ambushHidden,healCampaignTroops,canMainAction} from './campaign-effects.mjs';
export const C461_IDS=Object.freeze(['G17','G19','G20','G31','G60','G69','G74','G79','G80','G87','G90','G91','G97']);
export const c461Enabled=s=>s?.trialRules?.mechanics==='v2'&&['c461','c466','c467'].includes(s.trialRules.mechanicsBatch);
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a,g)=>c461Enabled(s)&&a?.commanderId===g&&a.troopCount>0&&castleArmyActive(s,a);
const z=a=>a.mechV2??={};
const d=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const friends=(s,a,n=2)=>live(s).filter(b=>b.factionId===a.factionId&&(n===Infinity||d(s,a,b)<=n)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const foes=(s,a,n=2)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&d(s,a,b)<=n&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const empty=(s,a,to)=>s.tiles[to]&&!['water','mountain'].includes(s.tiles[to].terrainType)&&campaignDestinationAllowed(s,a.armyId,to)&&!live(s).some(b=>b.armyId!==a.armyId&&b.tileId===to)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(to));
const home=(s,a)=>Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId).sort((b,c)=>d(s,a,b)-d(s,a,c)||b.cityId.localeCompare(c.cityId))[0];
const inCity=(s,a)=>Object.values(s.cities).some(c=>c.ownerFactionId===a.factionId&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId));
const camps=s=>Object.values(s.c461?.camps??{});
const wound=(s,id)=>s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===id).reduce((n,l)=>n+l.count,0);
function away(s,id,source,n=1){for(let i=0;i<n;i++){const a=s.armies[id],from=s.armies[source];const to=neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>empty(s,a,t)&&d(s,t,from)>d(s,a,from)).sort()[0];if(!to)break;forceArmyTo(s,id,to);}}
const strike=(s,id,t,k=1)=>resolveAttack(s,id,t,null,{enginePaid:true,troopQRatio:k,c450Tactic:true});
const recognized=(s,c)=>c461Enabled(s)&&C461_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const lostLord=(s,a)=>Object.values(s.armies).some(b=>b.factionId===a.factionId&&b.commanderId===s.factions[a.factionId].rulerId&&(!b.troopCount||b.morale==='ROUTING'))||(s.c461?.lostCities?.[a.factionId]??0)>0;
export function c461Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1];
 if(g==='G20'&&c.slot==='E')return Object.keys(s.tiles).filter(to=>sunDash(s,id,to)).sort();
 if(g==='G31'&&c.slot==='E')return friends(s,a).filter(b=>b.armyId!==id&&pincerDestination(s,b)).map(b=>b.armyId);
 if(g==='G31')return foes(s,a,Infinity).filter(b=>friends(s,a,Infinity).some(f=>d(s,f,b)===1)).map(b=>b.armyId);
 if(g==='G60')return friends(s,a).map(b=>b.armyId);
 if(g==='G69')return foes(s,a,2).map(b=>b.armyId);
 if(g==='G20')return foes(s,a,attackRange(a,s)).map(b=>b.armyId);
 if(g==='G17'&&c.slot==='E')return foes(s,a,1).map(b=>b.armyId);
 if(['G74','G80','G97','G91'].includes(g))return g==='G97'&&!lostLord(s,a)?[]:foes(s,a,attackRange(a,s)).filter(b=>a.troopType!=='bow'||d(s,a,b)>1).filter(b=>g!=='G91'||(s.c38?.hits??[]).some(h=>h.turn===s.turn&&h.target===b.armyId&&h.officerId!==a.commanderId&&friends(s,a).some(f=>f.commanderId===h.officerId))).map(b=>b.armyId);
 if(g==='G79')return foes(s,a,1).filter(b=>['cavalry','BT04'].includes(b.troopType)).map(b=>b.armyId);
 return [id];
}
export function c461Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id],g=c.rule.split('_')[1],e=c.slot==='E',x=z(a),t=s.armies[target];
 if(g==='G17'){if(e){away(s,target,id,['forest','mountain'].includes(s.tiles[a.tileId].terrainType)?2:1);checkFormation(s,target,0);}else for(const b of foes(s,a,1)){checkMorale(s,b.armyId,c.name,20+5*(x.recoveries??0));if(b.morale!=='STEADY')away(s,b.armyId,id);}}
 if(g==='G19'){for(const b of foes(s,a,2)){if(e)b.facing=directionToward(s.tiles[b.tileId],s.tiles[a.tileId],b.facing);else checkMorale(s,b.armyId,c.name,20);}if(!e){s.c461??={};s.c461.walls??=[];for(const at of neighbors(s.tiles[a.tileId]).map(tileId).filter(at=>s.tiles[at]?.terrainType==='water'||s.tiles[at]?.terrainType==='bridge'||s.mapRules.riverEdges?.includes([a.tileId,at].sort().join('|'))))s.c461.walls.push({tileId:at,source:id,starts:2});}}
 if(g==='G20'){
  if(e){const path=sunDash(s,id,target),foe=dashBlocker(s,id,path);const at=path[path.indexOf(foe.tileId)-1]??a.tileId;if(at!==a.tileId)forceArmyTo(s,id,at);s=strike(s,id,foe.armyId);z(s.armies[id]).vanguard={target:foe.armyId,turn:s.turn,n:2};}
  else {s=strike(s,id,target);z(s.armies[id]).vanguard={target,turn:s.turn,n:1000};z(s.armies[id]).sunExposure=true;z(s.armies[id]).sunNoCounter=target;}
 }
 if(g==='G31'){if(e){const to=pincerDestination(s,t);forceArmyTo(s,target,to);}else{const n=friends(s,a,Infinity).filter(b=>d(s,b,t)===1).length;uniqueStatus(s,id,target,'ROOTED',Math.min(2,n),{guaranteed:true});checkMorale(s,target,c.name,10*n);}}
 if(g==='G60'){
  changeMorale(s,target,'STEADY',c.name);z(t).maPeace={source:id};
  const enemy=foes(s,t,2).find(b=>b.morale!=='STEADY');if(enemy)z(enemy).maCharm={protected:target,active:false};
 }
 if(g==='G69'){
  const other=foes(s,a,Infinity).find(b=>b.armyId!==target&&d(s,b,t)===1);
  const damage=rows=>Object.assign(s,engineDamageRows(s,id,rows,'P461_FIRE',true));
  uniqueIgnite(s,id,target,1,damage,false);if(other)uniqueIgnite(s,id,other.armyId,1,damage,false);
  Object.assign(s,engineDamageRows(s,id,[{targetId:id,loss:Math.floor(s.armies[id].troopCount*.03)}],'P461_COST',true,{c450Cost:true}));
 }
 if(g==='G74'){s=strike(s,id,target,1.4);s.armies[target].c34??={};s.armies[target].c34.disarmUntil=s.turn+1;s.armies[id].c34??={};s.armies[id].c34.noRecoveryUntil=s.turn+2;z(s.armies[id]).wenRisk=2;}
 if(g==='G79'){uniqueBuff(s,id,target,'MOVE_MOD',-3);uniqueBuff(s,id,id,'MOVE_MOD',2,2);const b=friends(s,a).find(b=>b.armyId!==id);if(b)uniqueBuff(s,id,b.armyId,'MOVE_MOD',2,2);}
 if(g==='G80'){const weak=t.morale!=='STEADY'||s.officers[t.commanderId].c26OriginFaction===a.factionId;s=strike(s,id,target,1.5);if(weak&&s.armies[target].troopCount>0){changeMorale(s,target,'ROUTING',c.name);for(const b of foes(s,s.armies[id],Infinity).filter(b=>d(s,b,s.armies[target])<=2&&b.armyId!==target))checkMorale(s,b.armyId,c.name,10);}}
 if(g==='G87')for(const b of friends(s,a)){z(b).retreatTurn=s.turn;z(b).retreatSource=id;uniqueBuff(s,id,b.armyId,'MOVE_MOD',1);}
 if(g==='G90')for(const b of friends(s,a).filter(b=>b.braced||inCity(s,b)||camps(s).some(c=>c.tileId===b.tileId&&c.factionId===a.factionId)))z(b).gateGuard={source:id};
 if(g==='G91'){const h=(s.c38?.hits??[]).filter(h=>h.turn===s.turn&&h.target===target&&h.officerId!==a.commanderId&&friends(s,a).some(f=>f.commanderId===h.officerId)).sort((a,b)=>a.officerId.localeCompare(b.officerId))[0];s=strike(s,id,target,1.3);const b=live(s).find(b=>b.commanderId===h?.officerId);if(b)z(b).yangNext={turn:s.turn};changeFormation(s,id,1);}
 if(g==='G97'){s=strike(s,id,target,2);changeMorale(s,id,'ROUTING',c.name);}
 return s;
}
export function c461Start(s,fid){
 if(!c461Enabled(s))return;
 for(const a of live(s).filter(a=>a.factionId===fid)){
  const x=z(a);if(x.start461===s.turn)continue;x.start461=s.turn;
  delete x.regroupRisk;delete x.yangNext;delete x.hiddenHit;delete x.campGuard;delete x.sunExposure;delete x.sunNoCounter;delete x.vanguard;delete x.chengHealed;if(x.maCharm){if(x.maCharm.active)delete x.maCharm;else x.maCharm.active=true;}
  if(x.wenRisk&&--x.wenRisk<=0)delete x.wenRisk;
  if(x.chaseCost){changeFormation(s,a.armyId,1);delete x.chaseCost;}
  if(x.gateGuard&&s.armies[x.gateGuard.source]?.factionId===fid)delete x.gateGuard;
  if(owns(s,a,'G17')&&a.morale==='ROUTING'&&(x.recoveries??0)<7&&!live(s).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&d(s,a,b)===1)){changeMorale(s,a.armyId,'SHAKEN','칠종칠금');if(a.morale==='SHAKEN')x.recoveries=(x.recoveries??0)+1;}
  if(owns(s,a,'G80')||owns(s,a,'G91'))x.hiddenStart=Object.keys(s.factions).filter(f=>diplomacyHostile(s,fid,f)).every(f=>s.knowledge[f]?.tiles[a.tileId]!=='VISIBLE'||ambushHidden(s,a.armyId,f));
  if(owns(s,a,'G87')&&!x.retreatTile){const c=home(s,a);x.retreatTile=neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>empty(s,a,t)&&c&&d(s,t,c)<d(s,a,c)).sort()[0]??a.tileId;}
  for(const camp of camps(s).filter(c=>c.tileId===a.tileId&&c.factionId===fid)){healCampaignTroops(s,a.armyId,Math.floor(wound(s,a.armyId)*.1),{exact:true});x.campGuard=true;}
 }
 c461RefreshPosition(s);
 if(s.c461?.walls)s.c461.walls=s.c461.walls.filter(w=>s.armies[w.source]?.factionId!==fid||--w.starts>0);
 const maRecipients=new Set(Object.values(s.armies).filter(g=>g.factionId===fid&&owns(s,g,'G60')).flatMap(g=>engineOrderRecipients(s,g.armyId)));
 for(const a of live(s)){if(a.mechV2?.maPeace&&s.armies[a.mechV2.maPeace.source]?.factionId===fid)delete a.mechV2.maPeace;if(maRecipients.has(a.armyId))giveMaShield(s,a,true);}
 // R protection expires at its source's next start, independent of recipient order.
 for(const a of live(s))if(a.mechV2?.gateGuard&&s.armies[a.mechV2.gateGuard.source]?.factionId===fid)delete a.mechV2.gateGuard;
}
export function c461Finish(s,fid){if(!c461Enabled(s))return;for(const a of live(s).filter(a=>a.factionId===fid&&owns(s,a,'G90')&&['hill','mountain'].includes(s.tiles[a.tileId].terrainType))){s.c461??={};s.c461.camps??={};for(const [key,c] of Object.entries(s.c461.camps))if(c.officerId===a.commanderId||s.armies[key]?.commanderId===a.commanderId)delete s.c461.camps[key];s.c461.camps[a.armyId]={tileId:a.tileId,factionId:fid,officerId:a.commanderId};}}
export function c461Factor(s,id,target,side){if(!c461Enabled(s))return 1;const a=s.armies[id],b=s.armies[target],x=a.mechV2??{},y=b.mechV2??{};let f=1;
 if(owns(s,a,'G17'))f*=1+.05*(x.recoveries??0);
 if((owns(s,a,'G80')||owns(s,a,'G91'))&&x.hiddenStart&&!x.hiddenHit)f*=owns(s,a,'G80')?1.2:1.25;
 if(x.yangNext?.turn===s.turn)f*=1.15;
 if(y.maShield>0&&side==='FRONT'&&maOrder(s,b,'GUARD'))f*=.95;
 if(y.sunExposure)f*=1.2;
 if(y.wenRisk)f*=1.1;if(y.regroupRisk===s.turn)f*=1.1;if(y.gateGuard)f*=.8;if(y.campGuard&&camps(s).some(c=>c.tileId===b.tileId&&c.factionId===b.factionId))f*=.9;
 if(owns(s,b,'G97')&&inCity(s,b))f*=1-Math.max(0,.2-.05*(s.c461?.lostCities?.[b.factionId]??0));
 if(owns(s,a,'G97'))f*=1+.1*Math.min(3,s.c461?.lostCities?.[a.factionId]??0);
 return f;
}
export function c461Options(s,id,target,options){
 if(!c461Enabled(s))return options;const a=s.armies[id];let out=options;
 if(owns(s,a,'G80')&&a.mechV2?.hiddenStart&&!a.mechV2?.hiddenHit&&!options.reaction)out={...out,noCounter:true};
 const sun=vanguard(s,a,target);if(sun)out={...out,forceSide:'FLANK',...(sun.mechV2.sunNoCounter===target?{noCounter:true}:{})};
 if(Object.values(s.armies).some(g=>owns(s,g,'G31')&&engineOrderRecipients(s,g.armyId).includes(id))&&live(s).some(b=>b.factionId===a.factionId&&b.armyId!==id&&b.tileId===oppositeCombatTile(s,id,target)&&canMainAction(s,b.armyId)))out={...out,forceSide:'REAR'};
 return out;
}
export function c461AfterAttack(s,before,id,target,options){
 if(!c461Enabled(s)||options.reaction)return;const a=s.armies[id];z(a).hiddenHit=true;delete z(a).yangNext;if(owns(s,a,'G74')||owns(s,a,'G91'))z(a).chase={target,turn:s.turn};
 if(owns(s,a,'G20')&&!z(a).vanguard)z(a).vanguard={target,turn:s.turn,n:1};
 if(before.armies[id]?.mechV2?.maShield>0&&maOrder(before,before.armies[id],'ADVANCE')&&(before.armies[id].movedTiles??0)>0&&before.armies[id].c50?.attackTurn!==s.turn)changeFormation(s,target,1);
 const sun=vanguard(before,before.armies[id],target);if(sun){const now=s.armies[sun.armyId];if(now.mechV2.sunNoCounter!==target)now.mechV2.vanguard.n--;if(engineOrderRecipients(before,sun.armyId).includes(id))changeFormation(s,target,1);}
 if(s.lastCombat?.enemyLoss>0&&!options.tactic&&!options.c450Tactic)for(const g of live(before).filter(g=>owns(before,g,'G69')&&engineOrderRecipients(before,g.armyId).includes(id)).map(g=>s.armies[g.armyId])){if(z(a).chengHealed===s.turn||z(g).chengTargets?.[target]===s.turn)continue;healCampaignTroops(s,id,Math.floor(wound(s,id)*.05),{exact:true});z(a).chengHealed=s.turn;z(g).chengTargets??={};z(g).chengTargets[target]=s.turn;}
}
export function c461AttackAllowed(s,id,target){
 if(!c461Enabled(s))return true;const a=s.armies[id],b=s.armies[target];
 if(a.mechV2?.maCharm?.active&&a.mechV2.maCharm.protected===target)return false;
 return !Object.values(s.armies).some(g=>{const r=g.c50?.reservations?.COUNTER;return r&&(owns(s,g,'G19')||r.targetId===g.armyId&&g.troopCount>0&&castleArmyActive(s,g))&&g.factionId===b.factionId&&g.armyId!==target&&d(s,a,g)<=2&&s.knowledge[a.factionId]?.tiles[g.tileId]==='VISIBLE'&&!ambushHidden(s,g.armyId,a.factionId);});
}
export function c461MoveAllowed(s,id,from,to){return !c461Enabled(s)||!s.c461?.walls?.some(w=>w.tileId===to&&w.starts>0);}
export function c461Moved(s,id,from,to,voluntary){
 if(!c461Enabled(s)||from===to)return;const a=s.armies[id];
 for(const c of camps(s).filter(c=>c.tileId===to))c.factionId=a.factionId;
 c461RefreshPosition(s);
 if(!voluntary)return;
 if(a.mechV2?.retreatTurn===s.turn){const src=s.armies[a.mechV2.retreatSource],tile=src?.mechV2?.retreatTile;if(tile&&d(s,to,tile)<d(s,from,tile)&&z(a).retreatBonusTurn!==s.turn){z(a).retreatBonusTurn=s.turn;uniqueBuff(s,src.armyId,id,'MOVE_MOD',1);}}
 for(const b of live(s).filter(b=>(owns(s,b,'G74')||owns(s,b,'G91'))&&b.mechV2?.chase?.target===id&&b.mechV2.chase.turn===s.turn-1&&b.mechV2.chasedTurn!==s.turn&&d(s,from,b)===1&&d(s,to,b)>1)){
  z(b).chasedTurn=s.turn;const step=neighbors(s.tiles[b.tileId]).map(tileId).filter(t=>empty(s,b,t)&&d(s,t,a)<d(s,b,a)).sort()[0];if(step){forceArmyTo(s,b.armyId,step);if(owns(s,b,'G74'))z(b).chaseCost=true;}
 }
}
export function c461Wait(s,id,kind){const a=s.armies[id];if(!owns(s,a,'G79')||kind!=='REGROUP')return;for(const b of friends(s,a,1).filter(b=>b.armyId!==id))changeMorale(s,b.armyId,b.morale==='ROUTING'?'SHAKEN':'STEADY','주연집중');z(a).regroupRisk=s.turn;}
export function c461IgnoreMorale(s,id){const a=s.armies[id];if(!a)return false;return c461Enabled(s)&&Object.values(s.armies).some(g=>owns(s,g,'G87')&&g.factionId===a.factionId&&g.mechV2?.retreatTile===a.tileId);}
export function c461Cancel(s,id,target,c){if(c461Enabled(s)&&s.armies[id]?.factionId!==s.armies[target]?.factionId&&s.armies[target]?.mechV2?.maPeace&&/\uB3C4\uBC1C|\uAC70\uC9D3 \uC18C\uBB38/.test(c.text))return true;return c461IgnoreMorale(s,target)&&s.armies[id]?.factionId!==s.armies[target]?.factionId&&/거짓 소문/.test(c.text);}
export function c461Capture(s,fid){if(!c461Enabled(s)||!fid)return;s.c461??={};s.c461.lostCities??={};s.c461.lostCities[fid]=(s.c461.lostCities[fid]??0)+1;}

function c461RefreshPosition(s){
 const units=live(s),guards=units.filter(g=>owns(s,g,'G87')&&g.mechV2?.retreatTile);
 const maRecipients=new Set(units.filter(g=>owns(s,g,'G60')).flatMap(g=>engineOrderRecipients(s,g.armyId)));
 for(const a of units){
  a.effectStates=a.effectStates.filter(e=>!e.c461Position);
  if(a.mechV2?.maShieldTurn!==s.turn&&maRecipients.has(a.armyId))giveMaShield(s,a);
  const guard=guards.find(g=>g.factionId===a.factionId&&d(s,a,g.mechV2.retreatTile)<=2);
  if(guard){uniqueBuff(s,guard.armyId,a.armyId,'PURSUIT_MOD',-50,2);a.effectStates.at(-1).c461Position=true;}
  if(owns(s,a,'G97')&&inCity(s,a)){uniqueBuff(s,a.armyId,a.armyId,'MOVE_MOD',-2,2);a.effectStates.at(-1).c461Position=true;}
 }
}
export function c461AfterLoss(s,source,units){if(c461Enabled(s))for(const u of units)if(u.casualties>0&&s.armies[u.unitId]?.mechV2&&s.armies[source]?.factionId!==s.armies[u.unitId].factionId)delete s.armies[u.unitId].mechV2.regroupRisk;}

function vanguard(s,a,target){return Object.values(s.armies).find(g=>g.armyId!==a.armyId&&g.factionId===a.factionId&&owns(s,g,'G20')&&g.mechV2?.vanguard?.turn===s.turn&&g.mechV2.vanguard.target===target&&g.mechV2.vanguard.n>0);}
function sunDash(s,id,to){const a=s.armies[id],end=s.tiles[to],from=s.tiles[a.tileId];if(!end||!empty(s,a,to)||s.knowledge[a.factionId]?.tiles[to]!=='VISIBLE')return null;const n=d(s,a,to);if(n<1||n>3)return null;const dq=(end.q-from.q)/n,dr=(end.r-from.r)/n;if(!neighbors({q:0,r:0}).some(t=>t.q===dq&&t.r===dr))return null;const path=Array.from({length:n},(_,i)=>tileId({q:from.q+dq*(i+1),r:from.r+dr*(i+1)}));return path.every(t=>s.tiles[t]&&!['water','mountain'].includes(s.tiles[t].terrainType)&&s.knowledge[a.factionId]?.tiles[t]==='VISIBLE'&&campaignDestinationAllowed(s,id,t))&&dashBlocker(s,id,path)?path:null;}
// The dash stops before the first occupied tile on its line; that unit must be a visible hostile within 3.
// A truce or own unit there blocks the dash (landing beside it would share or skip a tile).
function dashBlocker(s,id,path){const a=s.armies[id],first=path.find(t=>live(s).some(b=>b.armyId!==id&&b.tileId===t));const foe=first&&live(s).find(b=>b.tileId===first&&diplomacyArmyHostile(s,id,b.armyId));return foe&&foes(s,a,3).some(b=>b.armyId===foe.armyId)?foe:null;}
function pincerDestination(s,a){return foes(s,a,Infinity).map(b=>({b,to:oppositeCombatTile(s,a.armyId,b.armyId)})).filter(r=>empty(s,a,r.to)&&d(s,a,r.to)<=3&&s.knowledge[a.factionId]?.tiles[r.to]==='VISIBLE').sort((a,b)=>a.b.armyId.localeCompare(b.b.armyId))[0]?.to??null;}

export function c461MoraleTarget(s,id,from,to){if(!c461Enabled(s))return to;const a=s.armies[id];if((a.mechV2?.maShield??0)>0&&Object.values(s.armies).some(g=>owns(s,g,'G60')&&engineOrderRecipients(s,g.armyId).includes(id))&&['STEADY','SHAKEN','ROUTING'].indexOf(to)>['STEADY','SHAKEN','ROUTING'].indexOf(from)){z(a).maShield=0;return from;}return to;}
export function c461AfterOrder(s,before,id,action){if(owns(s,s.armies[id],'G19')&&action==='COUNTER'&&s.armies[id].c50?.reservations?.COUNTER)s.armies[id].c50.reservations.COUNTER.targetId=id;if(!owns(s,s.armies[id],'G60')||action!=='ORDER')return;for(const recipient of engineOrderRecipients(s,id))giveMaShield(s,s.armies[recipient]);}
function maOrder(s,a,order){return (a.c50?.lastOrders??[]).some(o=>o.order===order&&o.expires>=s.turn&&owns(s,s.armies[o.sourceId],'G60'))||Object.values(s.armies).some(g=>owns(s,g,'G60')&&(g.c50?.order??'ADVANCE')===order&&engineOrderRecipients(s,g.armyId).includes(a.armyId));}

function giveMaShield(s,a,force=false){if(force||a.mechV2?.maShieldTurn!==s.turn){z(a).maShield=1;z(a).maShieldTurn=s.turn;}}
const TARGET_IDS='17 19 20 31 46 48 60 62 64 65 69 72 74 75 76 79 80 81 83 86 87 89 90 91 96 97 99 100'.split(' ').map(n=>'G'+n.padStart(2,'0'));
export function c461Pay(s,id,card){if(!c461Enabled(s)||!(card.signature||card.slot==='R')||!TARGET_IDS.includes(s.armies[id]?.commanderId))return;s.c461??={};s.c461.rUses??={};const g=s.armies[id].commanderId;s.c461.rUses[g]=(s.c461.rUses[g]??0)+1;}
