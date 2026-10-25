// Batch four uses only existing dispatch points. No runtime/default migration.
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden} from './campaign-effects.mjs';
import {checkFormation,changeFormation} from './campaign-abilities.mjs';
import {checkMorale} from './campaign-morale.mjs';
import {uniqueStatus,combatFireAt,initializeCombatFire,C182} from './campaign-rule-registry.mjs';
import {armyEngine} from './campaign-engines.mjs';
import {forceArmyTo,resolveAttack} from './campaign-combat.mjs';

export const C466_IDS=Object.freeze(['G24','G28','G36']);
export const C466_TARGET_IDS=Object.freeze('09 12 13 15 16 21 22 24 28 29 32 35 36 37 40 41 42 43 49 50 51 54 57 67 71 77 84 92 93 94 26 39'.split(' ').map(n=>'G'+n));
export const c466Enabled=s=>s?.trialRules?.mechanics==='v2'&&['c466','c467'].includes(s.trialRules.mechanicsBatch);
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a,g)=>c466Enabled(s)&&a?.commanderId===g&&a.troopCount>0&&castleArmyActive(s,a);
const dist=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const z=a=>a.mechV2??={};
const foes=(s,a,n)=>live(s).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&dist(s,a,b)<=n&&s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const structures=s=>Object.values(s.c50?.structures??{});
const wall=(s,at)=>Object.values(s.cities).some(c=>(c.footprint?.walls??[]).includes(at))||structures(s).some(b=>b.tileId===at);
const empty=(s,a,at)=>s.tiles[at]&&!['water','mountain'].includes(s.tiles[at].terrainType)&&!wall(s,at)&&campaignDestinationAllowed(s,a.armyId,at)&&!live(s).some(b=>b.tileId===at)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(at));
const recognized=(s,c)=>c466Enabled(s)&&C466_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const fuel=(s,at)=>s.tiles[at]?.terrainType==='forest'?'forest':structures(s).find(b=>b.tileId===at&&['CAMP','PALISADE'].includes(b.type))?.type;
function line(s,a,at,max=3){const n=dist(s,a,at);if(!n||n>max)return null;const from=s.tiles[a.tileId],to=s.tiles[at],dq=(to.q-from.q)/n,dr=(to.r-from.r)/n;if(!neighbors({q:0,r:0}).some(t=>t.q===dq&&t.r===dr))return null;return Array.from({length:n},(_,i)=>tileId({q:from.q+dq*(i+1),r:from.r+dr*(i+1)}));}
const commander=(s,a)=>foes(s,a,Infinity).sort((b,c)=>Object.values(s.officers[c.commanderId].baseStats).reduce((n,v)=>n+v,0)-Object.values(s.officers[b.commanderId].baseStats).reduce((n,v)=>n+v,0)||b.armyId.localeCompare(c.armyId))[0];
function liaoPath(s,a,at,e){const path=line(s,a,at,e?5:6);if(!path||!empty(s,a,at))return null;const chief=commander(s,a);if(e&&(!chief||dist(s,at,chief)!==1||dist(s,at,chief)>=dist(s,a,chief)))return null;return path.every(t=>s.tiles[t]&&s.knowledge[a.factionId]?.tiles[t]==='VISIBLE'&&!['water','mountain'].includes(s.tiles[t].terrainType)&&!wall(s,t)&&campaignDestinationAllowed(s,a.armyId,t)&&!live(s).some(b=>b.tileId===t&&b.factionId===a.factionId)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(t)))?path:null;}
function pullTarget(s,a,at){const path=line(s,a,at);if(!path||!path.every(t=>s.tiles[t]&&s.knowledge[a.factionId]?.tiles[t]==='VISIBLE'))return false;const first=path.find(t=>wall(s,t)||live(s).some(b=>b.tileId===t)||['water','mountain'].includes(s.tiles[t].terrainType));return first===at&&(wall(s,at)||foes(s,a,3).some(b=>b.tileId===at));}
export function c466Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id],g=c.rule.split('_')[1];
 if(g==='G24')return Object.keys(s.tiles).filter(at=>liaoPath(s,a,at,c.slot==='E')).sort();
 if(g==='G28')return c.slot==='E'?Object.keys(s.tiles).filter(at=>dist(s,a,at)<=2&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&fuel(s,at)).sort():Object.keys(s.tiles).some(at=>combatFireAt(s,at)&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE')?[id]:[];
 if(g==='G36')return Object.keys(s.tiles).filter(at=>s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&(c.slot==='E'?pullTarget(s,a,at):dist(s,a,at)<=3&&empty(s,a,at))).sort();
 return [];
}
function toward(s,a,to,n,source){const id=a.armyId,at=to.tileId??to;for(let i=0;i<n;i++){a=s.armies[id];const next=neighbors(s.tiles[a.tileId]).map(tileId).filter(t=>empty(s,a,t)&&dist(s,t,at)<dist(s,a,at)).sort()[0];if(!next)break;forceArmyTo(s,id,next);if(owns(s,s.armies[source],'G36')){s.armies[id].c27??={};s.armies[id].c27.noCounterUntil=s.turn;}}}
export function c466Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id],g=c.rule.split('_')[1];
 if(g==='G24'){
  const e=c.slot==='E',path=liaoPath(s,a,target,e),chief=commander(s,a);
  if(e)for(const b of foes(s,a,Infinity).filter(b=>path.includes(b.tileId)))checkFormation(s,b.armyId,10);
  forceArmyTo(s,id,target);s.armies[id].movedTiles=(s.armies[id].movedTiles??0)+path.length;
  if(e&&chief&&dist(s,s.armies[id],chief)===1)s=resolveAttack(s,id,chief.armyId,null,{enginePaid:true,c450Tactic:true});
  if(!e)for(const b of foes(s,s.armies[id],2))z(b).liaoFear={source:id,tileId:target,starts:Math.min(2,Math.max(1,Math.floor(path.length/3))),active:false};
 }
 if(g==='G28'&&c.slot==='E'){
  const type=fuel(s,target),queue=[target],seen=new Set(),tiles=[];
  while(queue.length&&tiles.length<4){const at=queue.shift();if(seen.has(at))continue;seen.add(at);if(fuel(s,at)!==type||s.knowledge[a.factionId]?.tiles[at]!=='VISIBLE')continue;tiles.push(at);queue.push(...neighbors(s.tiles[at]).map(tileId).filter(t=>s.tiles[t]).sort());}
  s.c27??={counts:{}};s.c27.fires??=[];s.c27.fires.push({source:id,tiles,until:s.turn+C182.fire.turns-1});initializeCombatFire(s);
 }
 if(g==='G28'&&c.slot==='R'){
  initializeCombatFire(s);const fires=(s.c182?.fires??[]).filter(f=>f.until>=s.turn&&s.knowledge[a.factionId]?.tiles[f.tileId]==='VISIBLE').map(f=>f.tileId).sort();
  for(const at of fires)for(const b of live(s).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&dist(s,b,at)<=1).sort((a,b)=>a.armyId.localeCompare(b.armyId))){checkFormation(s,b.armyId,10);checkMorale(s,b.armyId,c.name,10);}
  s.c182.fires=s.c182.fires.filter(f=>!fires.includes(f.tileId));
 }
 if(g==='G36'&&c.slot==='E'){
  const path=line(s,a,target);
  if(wall(s,target)){for(const at of path.slice(0,-1)){if(!empty(s,a,at))break;forceArmyTo(s,id,at);}}
  else {const b=live(s).find(b=>b.tileId===target);toward(s,b,a,2,id);}
 }
 if(g==='G36'&&c.slot==='R'){s.c466??={};s.c466.baits??={};s.c466.baits[id]={tileId:target,factionId:a.factionId,seen:[]};}
 return s;
}
export function c466AttackAllowed(s,id){return !c466Enabled(s)||!s.armies[id]?.mechV2?.liaoFear?.active;}
export function c466Start(s,fid){
 if(!c466Enabled(s))return;
 s.c466??={};s.c466.starts??={};if(s.c466.starts[fid]===s.turn)return;s.c466.starts[fid]=s.turn;
 for(const a of live(s).filter(a=>a.factionId===fid&&owns(s,a,'G28')))if([a.tileId,...neighbors(s.tiles[a.tileId]).map(tileId)].some(at=>combatFireAt(s,at))&&armyEngine(s,a.armyId))a.c50.resource=Math.min(armyEngine(s,a.armyId).max,a.c50.resource+1);
 for(const a of live(s).filter(a=>a.factionId===fid&&a.mechV2?.liaoFear)){
  const f=a.mechV2.liaoFear;if(f.active&&--f.starts<=0){delete a.mechV2.liaoFear;continue;}f.active=true;a.c34??={};a.c34.disarmUntil=Math.max(a.c34.disarmUntil??0,s.turn);
  const from=s.armies[f.source]?.tileId??f.tileId,to=neighbors(s.tiles[a.tileId]).map(tileId).filter(at=>empty(s,a,at)&&dist(s,at,from)>dist(s,a,from)).sort()[0];if(to)forceArmyTo(s,a.armyId,to);
 }
 for(const [id,bait] of Object.entries(s.c466.baits??{})){
  if(bait.factionId===fid){delete s.c466.baits[id];continue;}
  if(bait.seen.includes(fid)||!s.armies[id]?.troopCount)continue;bait.seen.push(fid);
  for(const a of live(s).filter(a=>a.factionId===fid&&diplomacyArmyHostile(s,id,a.armyId)&&dist(s,a,bait.tileId)<=3).sort((a,b)=>a.armyId.localeCompare(b.armyId)))toward(s,a,bait.tileId,1,id);
 }
}
export function c466Moved(s,id,from,to){
 if(!c466Enabled(s)||from===to)return;
 for(const [source,b] of Object.entries(s.c466?.baits??{}))if(b.tileId===to&&s.armies[source]?.troopCount&&diplomacyArmyHostile(s,source,id)){
  const changes=[];checkFormation(s,id,30,changes);if(changes.length)changeFormation(s,id,1);
  if(uniqueStatus(s,source,id,'ROOTED',1,{guaranteed:true})){
   // Arrival traps act in the current movement/turn, unlike a cast scheduling
   // the recipient's next turn. Keep the standard immunity/guard check above.
   const effect=s.armies[id].effectStates.at(-1);effect.startsTurn=s.turn;
   if(s.activeFactionId===s.armies[id].factionId)effect.expiresTurn=s.turn;
  }
 }
}
export function c466AfterAttack(s,before,id,target,options){
 if(!c466Enabled(s))return;
 if(owns(s,s.armies[id],'G24')&&!options.reaction&&(before.armies[id].movedTiles??0)>=2){const chief=commander(before,before.armies[id]);for(const b of foes(s,s.armies[id],Infinity).filter(b=>dist(s,b,s.armies[target])<=2))checkMorale(s,b.armyId,'위진강동',chief?.armyId===target?20:10);}
}
// Q settles through the existing effect-loss dispatcher rather than pilotAfterAttack.
export function c466AfterLoss(s,id,units){
 if(!owns(s,s.armies[id],'G24')||s.lastCombat?.kind!=='Q'||(s.armies[id].movedTiles??0)<2||z(s.armies[id]).liaoQ===s.battleSequence)return;
 z(s.armies[id]).liaoQ=s.battleSequence;
 const targets=units.filter(u=>s.armies[u.unitId]?.factionId!==s.armies[id].factionId).map(u=>s.armies[u.unitId]);
 const chief=commander(s,s.armies[id]);
 for(const b of foes(s,s.armies[id],Infinity).filter(b=>targets.some(t=>dist(s,b,t)<=2)))checkMorale(s,b.armyId,'위진강동',targets.some(t=>t.armyId===chief?.armyId)?20:10);
}
export function c466Pay(s,id,c){if(!c466Enabled(s)||!(c.signature||c.slot==='R')||!C466_TARGET_IDS.includes(s.armies[id]?.commanderId))return;s.c466??={};s.c466.rUses??={};const g=s.armies[id].commanderId;s.c466.rUses[g]=(s.c466.rUses[g]??0)+1;}
