import {diplomacyArmyHostile} from './campaign-diplomacy.mjs';
import {classCamp} from './campaign-classes.mjs';
import {c34Enabled,c34Near} from './campaign-c34.mjs';
import {uniqueOwned} from './campaign-rule-registry.mjs';
import {c30IgnoreFormation} from './campaign-c29.mjs';
import abilities from '../../docs/design-data/officer-pack/officer-abilities-v0.2.json' with {type:'json'};
import {hexDistance,neighbors} from './map-primitives.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {createRng} from './rng.mjs';
export const C23=Object.freeze({aptitudeHigh:0,aptitudeLow:0,spearChargeCounter:.25,reorganizeRadius:2,reorganizeCost:20});
export function archerEngaged(s,id){const a=s.armies[id];return !!a&&troopToCampaign(a.troopType)==='BT03'&&Object.values(s.armies).some(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&b.troopCount>0&&b.hp>0&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[b.armyId]?.disposition==='ACTIVE')&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1);}
export function archerAttackReason(s,id){return archerEngaged(s,id)&&!archerAttackReason.pointBlank?.(s,id)?'ARCHER_ENGAGED':'';}
export const C12=Object.freeze({attackBase:50,skill:.5,commandAttack:.3,parry:.25,commandDefense:.25,side:.15,rear:.30,charge:.002,disordered:.15,broken:.30,formationBase:30,maintenance:.6,min:5,max:95,flankWeight:10,rearWeight:25,chargeWeight:15,lossWeight:10,lossThreshold:.2,braceWeight:10,collapseMorale:15,recoveryThreshold:80,counter:.5,moraleBase:50,moraleDivisor:4});
const axes={지휘:'leadership',무용:'might',지략:'intelligence',정무:'politics',감화:'charisma'};
// Apply adopted major abilities only when creating a new campaign.
export function initializeCampaignAbilities(s){
 for(const [id,officer] of Object.entries(s.officers)){
  const entry=abilities.officers[id];if(!entry)continue;
  for(const [axis,stat] of Object.entries(axes))officer.baseStats[stat]=entry.major[axis];
 }
 return s;
}
export function campaignSubAbility(s,id,axis,key){
 const major=s.officers[id]?.baseStats[axes[axis]]??1,custom=s.officers[id]?.c34Abilities,entry=custom?{major:custom.major,sub:{[axis]:custom.sub}}:abilities.officers[id];
 return Math.max(1,Math.min(100,Math.round(entry?.sub[axis]?.[key]!==undefined&&entry.major[axis]>0?entry.sub[axis][key]*major/entry.major[axis]:major)));
}
export const campaignAttackPower=(s,id,counter=false)=>C12.attackBase+campaignSubAbility(s,id,'무용',counter?'되받기':'기술')*C12.skill+s.officers[id].baseStats.leadership*C12.commandAttack;
export const campaignDefensePower=(s,id)=>C12.attackBase+campaignSubAbility(s,id,'무용','막아내기')*C12.parry+s.officers[id].baseStats.leadership*C12.commandDefense;
// Pick the nearest ray in Cartesian hex geometry. At ray boundaries favor FRONT.
export function directionToward(from,to,facing=0){
 const dq=to.q-from.q,dr=to.r-from.r;if(!dq&&!dr)return facing;
 const x=dq+dr/2,y=dr*Math.sqrt(3)/2;
 const scores=neighbors({q:0,r:0}).map((d,i)=>({i,score:x*(d.q+d.r/2)+y*d.r*Math.sqrt(3)/2}));
 const max=Math.max(...scores.map(d=>d.score));
 const rank=i=>{const delta=(i-facing+6)%6;return Math.min(delta,6-delta);};
 return scores.filter(d=>Math.abs(d.score-max)<1e-9).sort((a,b)=>rank(a.i)-rank(b.i)||a.i-b.i)[0].i;
}
export function attackDirection(s,attacker,target){
 const a=s.armies[attacker],t=s.armies[target];if(!a||!t)return 'FRONT';
 if(t.morale==='ROUTING')return 'REAR';
 if(Object.values(s.cities).some(c=>[c.tileId,...(c.footprint?.gates??[])].includes(t.tileId)))return 'FRONT';
 const delta=(directionToward(s.tiles[t.tileId],s.tiles[a.tileId],t.facing??0)-(t.facing??0)+6)%6;
 return delta===3?'REAR':[2,4].includes(delta)?'FLANK':'FRONT';
}
export function isCharge(s,id,target,side=attackDirection(s,id,target)){
 const a=s.armies[id],t=s.armies[target];return !!a&&!!t&&troopToCampaign(a.troopType)==='BT04'&&(a.movedTiles??0)>=2&&hexDistance(s.tiles[a.tileId],s.tiles[t.tileId])===1&&!(troopToCampaign(t.troopType)==='BT02'&&side==='FRONT');
}
export function initializeArmyFacing(s){for(const a of Object.values(s.armies)){
 if(a.facing==null){const c=Object.values(s.cities).filter(c=>c.ownerFactionId!==a.factionId).sort((x,y)=>hexDistance(s.tiles[a.tileId],s.tiles[x.tileId])-hexDistance(s.tiles[a.tileId],s.tiles[y.tileId])||x.cityId.localeCompare(y.cityId))[0];a.facing=c?directionToward(s.tiles[a.tileId],s.tiles[c.tileId]):0;}
 if(a.formation===undefined)a.formation=a.morale==='ROUTING'?'BROKEN':'ORDERED';if(a.movedTiles===undefined)a.movedTiles=0;
}return s;}
export function campaignRoll(s){const r=createRng();r.restore(s.rng.value);const value=r.next()*100;s.rng.value=r.state();s.rng.draws++;return value;}
export const formationProbability=(s,id,weight)=>Math.max(C12.min,Math.min(C12.max,C12.formationBase+campaignSubAbility(s,s.armies[id].commanderId,'지휘','전열 유지')*C12.maintenance-weight+(classCamp(s,id)?.formation??0)+(s.armies[id].braced?C12.braceWeight:0)));
export function changeFormation(s,id,steps,changes=[]){const a=s.armies[id];if(steps<0&&a.morale==='ROUTING')return changes;const levels=['ORDERED','DISORDERED','BROKEN'],from=a.formation??'ORDERED';a.formation=levels[Math.max(0,Math.min(2,levels.indexOf(from)+steps))];if(a.classState&&a.formation!=='ORDERED')a.classState.prepared=false;if(from!==a.formation)changes.push({armyId:id,from,to:a.formation});return changes;}
export function checkFormation(s,id,weight,changes=[]){if(c34Enabled(s)&&s.armies[id]?.c34?.formationGuardUntil>=s.turn)return changes;if(c30IgnoreFormation(s,id))return changes;if(s.armies[id].troopCount>0&&campaignRoll(s)>=formationProbability(s,id,weight))changeFormation(s,id,1,changes);return changes;}
export function turnFacing(s,id,target){const a=s.armies[id],t=s.armies[target]??s.cities[target];if(a&&t)a.facing=directionToward(s.tiles[a.tileId],s.tiles[t.tileId],a.facing);}
