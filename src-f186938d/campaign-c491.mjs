import {registerCampaignMech} from './campaign-mech-contracts.mjs';
import {cloneCampaign} from './campaign-clone.mjs';
import {hexDistance,neighbors,tileId} from './map-primitives.mjs';
import {castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {ambushHidden,canMainAction} from './campaign-effects.mjs';
import {uniqueBuff} from './campaign-rule-registry.mjs';
import {forceArmyTo,cityAttackTargets,resolveCityAttack} from './campaign-combat.mjs';
import {engineStructureTargets,resolveStructureAttack} from './campaign-engines.mjs';
import {changeFormation} from './campaign-abilities.mjs';

export const C491_IDS=Object.freeze(['G32','G48','G72']);
const enabled=s=>s?.trialRules?.mechanics==='v2'&&s.trialRules.mechanicsBatch==='c467';
const live=s=>Object.values(s.armies).filter(a=>a.troopCount>0&&castleArmyActive(s,a));
const owns=(s,a,g)=>enabled(s)&&a?.commanderId===g&&s.campaignGrowth?.officers[g]?.mechanicsV2===true&&a.troopCount>0&&castleArmyActive(s,a);
const read=a=>a?.mechV2?.c491??{};
const book=a=>(a.mechV2??={}).c491??={};
const distance=(s,a,b)=>hexDistance(s.tiles[a.tileId??a],s.tiles[b.tileId??b]);
const visible=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!ambushHidden(s,b.armyId,a.factionId);
const empty=(s,a,to)=>s.tiles[to]&&s.knowledge[a.factionId]?.tiles[to]==='VISIBLE'&&!['water','mountain'].includes(s.tiles[to].terrainType)&&campaignDestinationAllowed(s,a.armyId,to)&&!live(s).some(b=>b.armyId!==a.armyId&&b.tileId===to)&&!Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(to));
const recognized=(s,c)=>enabled(s)&&C491_IDS.some(g=>c.rule===`P417_${g}_${c.slot}`);
const marks=(s,source,target)=>read(s.armies[target]).cracks?.[source]?.n??0;
function crack(s,source,target,n=1){const a=s.armies[target];const x=book(a);x.cracks??={};x.cracks[source]={n:Math.min(3,marks(s,source,target)+n),expires:s.turn+1};}
function withdraw(s,a,source){return neighbors(s.tiles[a.tileId]).map(tileId).filter(to=>empty(s,a,to)&&distance(s,to,source)>distance(s,a,source)).sort()[0];}
export function c491Targets(s,id,c){
 if(!recognized(s,c))return null;const a=s.armies[id];
 if(a.commanderId==='G32')return c.slot==='R'?[...cityAttackTargets(s,id),...engineStructureTargets(s,id)].sort():live(s).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&distance(s,a,b)===1&&visible(s,a,b)&&marks(s,id,b.armyId)>0).map(b=>b.armyId).sort();
 if(a.commanderId==='G72')return live(s).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&distance(s,a,b)===1&&visible(s,a,b)).map(b=>b.armyId).sort();
 return [id];
}
export function c491Cast(s,id,c,target){
 if(!recognized(s,c))return s;const a=s.armies[id],g=a.commanderId;
 if(g==='G32'){
  if(c.slot==='E'){
   const n=marks(s,id,target);delete book(s.armies[target]).cracks[id];changeFormation(s,target,n,s.lastCombat.formationChanges);
   const b=s.armies[target];b.braced=false;if(b.c50)b.c50.reservations={};if(b.c27){delete b.c27.overwatch;delete b.c27.intercept;}
  }else {
   const center=s.cities[target]?.tileId??s.c50.structures.find(o=>o.id===target)?.tileId;
   book(a).siege=true;
   if(s.cities[target])s=resolveCityAttack(s,id,target,{enginePaid:true});
   else {
    const hp=s.c50.structures.find(o=>o.id===target).hp;
    s=resolveStructureAttack(s,id,target,{enginePaid:true});s.battleSequence++;
    const loss=hp-(s.c50.structures.find(o=>o.id===target)?.hp??0);
    const log={kind:'STRUCTURE',turn:s.turn,sequence:s.battleSequence,attackerId:id,structureId:target,enemyLoss:loss,allyLoss:0,units:[],formationChanges:[],moraleChanges:[],eliminatedIds:[],effectLines:[c.name]};
    (s.combatLog??=[]).push(log);s.lastCombat=log;
   }
   delete book(s.armies[id]).siege;
   for(const b of live(s))if(diplomacyArmyHostile(s,id,b.armyId)&&visible(s,s.armies[id],b)&&distance(s,b,center)<=2)crack(s,id,b.armyId,2);
  }
 }
 if(g==='G72'){uniqueBuff(s,id,id,'DAMAGE_MOD',25);book(s.armies[target]).challenged={source:id,expires:s.turn+1};book(a).slowNext=true;}
 if(g==='G48'){
  s.c50.structures=(s.c50.structures??[]).filter(o=>!(o.sourceId===id&&o.group==='TACTIC'));
  const allies=live(s).filter(b=>b.factionId===a.factionId&&distance(s,a,b)<=2).sort((a,b)=>a.armyId.localeCompare(b.armyId));
  const enemy=live(s).filter(b=>diplomacyArmyHostile(s,id,b.armyId)&&visible(s,a,b)).sort((b,c)=>distance(s,a,b)-distance(s,a,c)||b.armyId.localeCompare(c.armyId))[0];
  // Reserve each final tile while planning; execute one forced step per ally.
  for(const b of allies){const from=b.tileId,to=enemy?withdraw(s,b,enemy):neighbors(s.tiles[from]).map(tileId).filter(t=>empty(s,b,t)).sort()[0];if(!to)continue;forceArmyTo(s,b.armyId,to);if(b.tileId!==to)continue;s.c50.structures??=[];s.c50.structureSequence=(s.c50.structureSequence??0)+1;s.c50.structures.push({id:`C491.${s.c50.structureSequence}`,sourceId:id,factionId:a.factionId,type:'PALISADE',group:'TACTIC',tileId:from,hp:30,maxHp:30,n:1,spend:`C491.R.${s.turn}.${id}`,createdTurn:s.turn,expires:s.turn+1});}
 }
 return s;
}
export function c491Start(s,factionId){
 if(!enabled(s))return;
 for(const a of live(s)){
  if(a.factionId===factionId&&read(a).challenged?.expires<s.turn)delete book(a).challenged;
  if(owns(s,a,'G72')&&a.factionId===factionId&&read(a).slowNext){uniqueBuff(s,a.armyId,a.armyId,'MOVE_MOD',-1);delete book(a).slowNext;}
 }
}
export function c491Finish(s,factionId){
 if(!enabled(s))return;
 for(const a of live(s)){
  if(owns(s,a,'G48')&&a.factionId===factionId&&a.effectFirstAttackTurn!==s.turn)book(a).route=a.tileId;
  for(const [source,row] of Object.entries(read(a).cracks??{}))if(s.armies[source]?.factionId===factionId&&row.expires<=s.turn)delete book(a).cracks[source];
  if(a.factionId===factionId&&read(a).challenged)delete book(a).challenged;
 }
}
// Commit inputs are frozen detached snapshots. These reducers write only armies;
// the registry detaches the complete result before exposing it to the caller.
let installed=false;
export function c491Install(){
 if(installed)return;installed=true;
 registerCampaignMech('H03','c491-reaction',{operations:['combatants','reactionPlan','reactionCommitted'],query:({state:s,operation,sourceId,targetId,kind},p)=>{
  if(!enabled(s))return;
  if(operation==='combatants'&&kind==='PURSUIT'){
   const target=s.armies[targetId];const g=live(s).filter(a=>owns(s,a,'G72')&&a.armyId!==targetId&&a.factionId===target?.factionId&&a.morale!=='ROUTING'&&distance(s,a,target)<=2&&read(a).interceptTurn!==s.turn&&visible(s,s.armies[sourceId],a)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];
   if(g)return {...p,targetId:g.armyId,counter:true,budget:{key:`C491.SAVE.${s.turn}.${g.armyId}`,uses:1,expires:s.turn,generation:0}};
  }
  if(operation==='reactionPlan'&&live(s).some(g=>owns(s,g,'G32')&&g.factionId===s.armies[sourceId]?.factionId&&marks(s,g.armyId,targetId)>=2))return {...p,noPreempt:true,ignoreBrace:true};
 },commit:({state:s,operation,sourceId,targetId,kind})=>{
  if(operation==='reactionCommitted'&&enabled(s)&&kind==='PURSUIT'&&owns(s,s.armies[targetId],'G72')){const out={...s,armies:cloneCampaign(s.armies)};book(out.armies[targetId]).interceptTurn=s.turn;return out;}
 }});
 registerCampaignMech('H01','c491-cracks',{operations:['lossSettled'],commit:({state:s,sourceId,snapshot,kind})=>{
  if(!owns(s,s.armies[sourceId],'G32')||!snapshot?.units||!['ATTACK','Q','REACTION'].includes(kind))return;
  const out={...s,armies:cloneCampaign(s.armies)};for(const u of snapshot.units)if(u.unitId!==sourceId&&diplomacyArmyHostile(s,sourceId,u.unitId))crack(out,sourceId,u.unitId);return out;
 }});
 registerCampaignMech('H11','c491-palisades',{operations:['structureLimit'],query:({state:s,sourceId,type,group},n)=>owns(s,s.armies[sourceId],'G48')&&type==='PALISADE'&&group==='TACTIC'?19:n});
 registerCampaignMech('H16','c491-siege',{operations:['cityDamage'],query:({state:s,sourceId},n)=>owns(s,s.armies[sourceId],'G32')&&read(s.armies[sourceId]).siege?Math.round(n*2.5):n});
 registerCampaignMech('H04','c491-challenge',{operations:['attackAllowed'],query:({state:s,sourceId,targetId},v)=>{const row=read(s.armies[sourceId]).challenged;return enabled(s)&&row&&s.armies[row.source]?.troopCount>0&&row.expires>=s.turn&&targetId!==row.source?false:v;}});
 registerCampaignMech('H06','c491-return',{operations:['commandPlan'],query:({state:s,command},p)=>{
  const a=s.armies[command?.armyId];if(command?.type!=='RETURN_ROUTE'||!owns(s,a,'G48')||!canMainAction(s,a.armyId))return;
  const strength=s.personnel.formations.find(f=>f.formationId===a.armyId)?.targetStrength??a.deploymentStrength;
  const route=read(a).route;if(a.troopCount>=strength/2||!route||command.destinationTileId!==route||!empty(s,a,route))return;
  return {...p,command:{type:'MOVE_UNIT',armyId:a.armyId,destinationTileId:route},permission:{tokenId:`C491.RETURN.${a.armyId}`,kind:'RETURN',uses:2,expires:s.turn,generation:0}};
 }});
}
