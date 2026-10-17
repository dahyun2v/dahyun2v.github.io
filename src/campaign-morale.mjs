import {c31IgnoreControlZone} from './campaign-events.mjs';
import {combatFireAt,combatFireMovementWorld} from './campaign-rule-registry.mjs';
import {withCampaignQueries,memoCampaignQuery} from './campaign-rule-registry.mjs';
import {tryInjury} from './campaign-injury.mjs';
import {diplomacyArmyHostile,diplomacyMoveReason,diplomacyState,withdrawalProtection} from './campaign-diplomacy.mjs';
import {dejaVuEvent} from './campaign-deja-vu.mjs';
import {ignoreBoundRout,ignoreRelationMorale,relationMoraleWeight,markRelationMorale} from './campaign-relations.mjs';
import {classCamp,classPostMove,classOnRout} from './campaign-classes.mjs';
import {c34Near,c34MoraleWeight,c34IgnoreMorale} from './campaign-c34.mjs';
import {c33Owned,c33Formation,UNIQUE_OFFICERS} from './campaign-rule-registry.mjs';
import {c30IgnoreMorale,c30MoraleWeight} from './campaign-c29.mjs';
import {c29Aw,c29Record} from './campaign-c29.mjs';
import {C28,c28Record,c28Rule,c28Enabled} from './campaign-career.mjs';
import {domesticMoraleThreshold,combatIgnoreZone,combatMoveAllowed,combatMovement,combatCanPostMove,combatMoraleGuard,combatRule} from './campaign-rule-registry.mjs';
import {uniqueMoraleWeight,uniqueOwned} from './campaign-rule-registry.mjs';
import {C12,campaignSubAbility,changeFormation,directionToward} from './campaign-abilities.mjs';
import {movementEffect,hasCampaignRule,ambushHidden} from './campaign-effects.mjs';
import {hexDistance,boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeTicks,findPath} from './movement.mjs';
import {campaignMovementWorld,castleArmyActive,campaignDestinationAllowed} from './campaign-city-footprint.mjs';
import {createRng} from './rng.mjs';
export const enemies=(s,a)=>memoCampaignQuery(s,'enemies:'+a.armyId,()=>Object.values(s.armies).filter(b=>diplomacyArmyHostile(s,a.armyId,b.armyId)&&castleArmyActive(s,b)));
export const inControlZone=(s,a,id=a.tileId)=>memoCampaignQuery(s,'zoc:'+a.armyId+':'+id,()=>inControlZoneUncached(s,a,id));
const inControlZoneUncached=(s,a,id)=>{
 if(c31IgnoreControlZone(s,a.armyId))return false;
 const c33Ignore=(c33Owned(s,a.armyId,'BLOODY_PATH')&&a.morale==='ROUTING'||c33Formation(s,a.armyId,'FORMATION_DRILL'))&&hexDistance(s.tiles[a.tileId],s.tiles[id])===1;if(c33Ignore)return false;
 const fearless=a.morale==='STEADY'&&uniqueOwned(s,a.armyId,'U_FEARLESS'),unlimited=uniqueOwned(s,a.armyId,'U_FLYING_GENERAL')||(a.effectStates??[]).some(e=>e.rule==='IGNORE_ZOC'&&e.expiresTurn>=s.turn)||Object.values(s.campaignGrowth?.officers[a.commanderId]?.cards??{}).some(c=>c.rarity==='MYTHIC'&&c.effects?.some(e=>e.rule==='IGNORE_ZOC')&&s.campaignGrowth.officers[a.commanderId].track.growthStates[a.commanderId].ownedTraitRanks[c.traitId]);
 const ignore=hasCampaignRule(s,a.armyId,'IGNORE_ZOC')&&(!fearless||unlimited||hexDistance(s.tiles[a.tileId],s.tiles[id])<=1);
 return !ignore&&enemies(s,a).some(b=>hexDistance(s.tiles[id],s.tiles[b.tileId])<=(hasCampaignRule(s,b.armyId,'EXTENDED_ZOC')?2:1)&&b.formation!=='BROKEN'&&!combatIgnoreZone(s,a.armyId,b)&&!ambushHidden(s,b.armyId,a.factionId));
};
export function campaignPath(s,id,destination){return withCampaignQueries(s,()=>campaignPathUncached(s,id,destination));}
function campaignPathUncached(s,id,destination){
 if(!s.armies[id]||!castleArmyActive(s,s.armies[id]))return null;
 if(!combatDestinationAllowed(s,id,destination)||diplomacyMoveReason(s,id,destination))return null;
 if(Object.keys(s.factions).some(f=>f!==s.armies[id].factionId&&diplomacyState(s,s.armies[id].factionId,f)==='TRUCE')||withdrawalProtection(s,id))return campaignReachable(s,id,Infinity).get(destination)??null;
 if(movementEffect(s,id).rooted||hasCampaignRule(s,id,'NO_RETREAT')&&enemies(s,s.armies[id]).some(b=>hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1))return null;
 const a=s.armies[id],world=combatFireMovementWorld(s,id,campaignMovementWorld(s,id)),blocked=new Set(world.mapRules.blockedEdges);
 // A zone can be a destination, but cannot be an intermediate path node.
 for(const t of Object.values(s.tiles))if(t.tileId!==a.tileId&&t.tileId!==destination&&inControlZone(s,a,t.tileId))
  for(const n of boardNeighbors(t,s.tiles))blocked.add([t.tileId,tileId(n)].sort().join('|'));
 const path=findPath({...world,mapRules:{...world.mapRules,blockedEdges:[...blocked]}},id,destination);return path&&path.pathTileIds.length-1<=combatMovement(s,id).max&&!path.pathTileIds.slice(1).some((to,i)=>diplomacyMoveReason(s,id,to,path.pathTileIds[i]))?path:null;
}
// 한 번의 탐색으로 이번 차례에 닿는 모든 칸(campaignPath 와 같은 경로·시간). 통제 구역 칸은 들어갈 수는 있지만 거쳐 갈 수 없다.
// campaignPath 의 Dijkstra(거리 → 칸 id 순)를 그대로 따르므로 칸마다 따로 찾은 결과와 같다.
export function campaignReachable(s,id,budget){return withCampaignQueries(s,()=>campaignReachableQuery(s,id,budget));}
function campaignReachableQuery(s,id,budget,pathMode=false){
 if(!s.armies[id]||!castleArmyActive(s,s.armies[id]))return new Map();
 const diplomatic=Object.keys(s.factions).some(f=>f!==s.armies[id].factionId&&diplomacyState(s,s.armies[id].factionId,f)==='TRUCE')||withdrawalProtection(s,id);
 if((!pathMode||diplomatic)&&combatCanPostMove(s,id))budget=Math.min(budget,s.armies[id].c27?.cantoTicks??budget);
 if(movementEffect(s,id).rooted||hasCampaignRule(s,id,'NO_RETREAT')&&enemies(s,s.armies[id]).some(b=>hexDistance(s.tiles[b.tileId],s.tiles[s.armies[id].tileId])===1))return new Map();
 const a=s.armies[id],world=combatFireMovementWorld(s,id,campaignMovementWorld(s,id)),start=a.tileId;
 const zone=new Set(Object.values(s.tiles).filter(t=>t.tileId!==start&&inControlZone(s,a,t.tileId)).map(t=>t.tileId));
 const dist=new Map([[start,0]]),previous=new Map(),done=new Set(),heap=[[0,start]];
 const less=(x,y)=>x[0]<y[0]||x[0]===y[0]&&x[1].localeCompare(y[1],'en')<0;
 const push=e=>{heap.push(e);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&less(heap[l],heap[m]))m=l;if(r<heap.length&&less(heap[r],heap[m]))m=r;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m;}}return top;};
 while(heap.length){
  const [d,current]=pop();if(done.has(current)||d!==dist.get(current))continue;if(d>budget)break;done.add(current);
  if(current!==start&&zone.has(current))continue;
  for(const p of boardNeighbors(world.tiles[current],world.tiles)){
   const next=tileId(p);if((!pathMode||diplomatic)&&diplomacyMoveReason(s,id,next,current))continue;const cost=edgeTicks(world,world.armies[id],current,next);if(cost===null)continue;
   const distance=d+cost;if(distance<(dist.get(next)??Infinity)){dist.set(next,distance);previous.set(next,current);push([distance,next]);}
  }
 }
 const out=new Map();
 for(const [t,d] of dist){if(!d||d>budget||!combatDestinationAllowed(s,id,t))continue;const path=[t];while(previous.has(path[0]))path.unshift(previous.get(path[0]));if(path.length-1>combatMovement(s,id).max||pathMode&&!diplomatic&&path.slice(1).some((to,i)=>diplomacyMoveReason(s,id,to,path[i])))continue;out.set(t,{pathTileIds:path,totalTicks:d});}
 return out;
}
// All destinations for one read-only snapshot; no persistent engine cache.
export function campaignPaths(s,id){return withCampaignQueries(s,()=>{
 const paths=campaignReachableQuery(s,id,Infinity,true),start=s.armies[id]?.tileId;
 if(start){const own=campaignPath(s,id,start);if(own)paths.set(start,own);}
 return paths;
});}
export function retreatRouting(s,id){
 const a=s.armies[id],foes=enemies(s,a);if(!foes.length||hasCampaignRule(s,id,'NO_RETREAT')&&foes.some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1))return null;
 const world=combatFireMovementWorld(s,id,campaignMovementWorld(s,id)),distance=id=>Math.min(...foes.map(b=>hexDistance(s.tiles[id],s.tiles[b.tileId])));
 const cities=Object.values(s.cities).filter(c=>c.ownerFactionId===a.factionId);
 const home=id=>cities.length?Math.min(...cities.map(c=>hexDistance(s.tiles[id],s.tiles[c.tileId]))):Infinity;
 const choices=boardNeighbors(s.tiles[a.tileId],s.tiles).map(tileId).filter(to=>edgeTicks(world,world.armies[id],a.tileId,to)!==null&&!diplomacyMoveReason(s,id,to)&&!Object.values(s.armies).some(b=>b.armyId!==id&&castleArmyActive(s,b)&&b.tileId===to)&&distance(to)>distance(a.tileId))
  .sort((x,y)=>distance(y)-distance(x)||home(x)-home(y)||x.localeCompare(y,'en'));
 if(!choices.length)return null;
 const from=a.tileId;a.tileId=choices[0];a.facing=directionToward(s.tiles[from],s.tiles[a.tileId],a.facing);a.currentOrder=null;a.movementState=null;return {armyId:id,from,to:a.tileId};
}
// 사기 기록 줄: 이유가 규칙 코드(U_AWE 등)면 그 카드 이름으로 보여 준다(기록의 reason 값은 그대로)
let ruleNames=null;
const reasonText=r=>{if(!/^[A-Z][A-Z0-9_]+$/.test(r??''))return r;ruleNames??=new Map(UNIQUE_OFFICERS.flatMap(o=>[o.uniqueTrait,o.signatureTactic]).flatMap(c=>(c?.effects??[]).filter(e=>e.op==='RULE').map(e=>[e.rule,c.name])));return ruleNames.get(r)??'특기 효과';};
const labels={STEADY:'안정',SHAKEN:'동요',ROUTING:'패주'};
export function changeMorale(s,id,to,reason,changes=[]){
 const a=s.armies[id],from=a.morale??'STEADY';if(['STEADY','SHAKEN','ROUTING'].indexOf(to)<['STEADY','SHAKEN','ROUTING'].indexOf(from)&&c34Near(s,id,1).some(b=>uniqueOwned(s,b.armyId,'U_STRICT_LAW')))return changes;if(reason!=='아홉 목숨'&&to==='ROUTING'&&(a.c29?.noRoutTurn===s.turn||hasCampaignRule(s,id,'NEVER_ROUT')||Object.values(s.armies).some(b=>b.factionId===a.factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[b.tileId],s.tiles[a.tileId])===1&&hasCampaignRule(s,b.armyId,'RALLY_AURA'))))to='SHAKEN';if(from===to)return changes;if(['STEADY','SHAKEN','ROUTING'].indexOf(to)>['STEADY','SHAKEN','ROUTING'].indexOf(from)&&c30IgnoreMorale(s,id)){markRelationMorale(s,id);return changes;}
 if(reason!=='아홉 목숨'&&combatMoraleGuard(s,id,from,to)){markRelationMorale(s,id);return changes;}
 const survival=c28Record(s,id)?.c28?.survival;
 if(c28Enabled(s)&&survival?.name==='철의 의지'&&survival.until>=s.turn&&survival.uses>0&&['STEADY','SHAKEN','ROUTING'].indexOf(to)>['STEADY','SHAKEN','ROUTING'].indexOf(from)){survival.uses--;markRelationMorale(s,id);return changes;}
 if(a.c33?.moraleFixedUntil>=s.turn)return changes;
 if(['STEADY','SHAKEN','ROUTING'].indexOf(to)>['STEADY','SHAKEN','ROUTING'].indexOf(from)&&ignoreRelationMorale(s,id))return changes;
 a.morale=to;if(to==='ROUTING')tryInjury(s,a.commanderId,'routed',`${s.turn}:${id}:${s.battleSequence}:${s.moraleLog?.length??0}`,a.tileId);if(to==='ROUTING')dejaVuEvent(s,'ROUT_TERRAIN',{officerId:a.commanderId,tileId:a.tileId});const event={armyId:id,from,to,reason,text:`${s.officers[a.commanderId].name}: ${labels[from]} → ${labels[to]} (${reasonText(reason)})`};
 changes.push(event);s.moraleLog??=[];s.moraleLog.push({turn:s.turn,...event});
 if(to==='ROUTING'){changeFormation(s,id,2);classOnRout(s,id,(who,n,name)=>{if(!ignoreBoundRout(s,who,a))checkMorale(s,who,name+' — 아군 패주',n,changes);}); }
 if(to==='ROUTING')event.retreat=retreatRouting(s,id);
 return changes;
}
export function checkMorale(s,id,reason,weight,changes=[]){if(c34IgnoreMorale(s,id,reason))return changes;
 if(s.armies[id]?.c33?.moraleFixedUntil>=s.turn)return changes;
 weight=relationMoraleWeight(s,id,c30MoraleWeight(s,id,weight))-(c33Owned(s,id,'MORALE_WARD')?5:0);
 if(c29Aw(s,id,'CROSSOVER')&&c29Record(s,id).cards[c29Record(s,id).coreId]?.domestic)weight*=.9;
 weight=c34MoraleWeight(s,id,weight,reason);weight=uniqueMoraleWeight(s,id,weight)*(c28Rule(s,id,'COOL_HEAD')?C28.coolHeadRatio:1);

 const a=s.armies[id];if(!castleArmyActive(s,a)||a.morale==='ROUTING')return changes;
 const stats=s.officers[a.commanderId].baseStats;
 const probability=Math.max(0,Math.min(100,C12.moraleBase+(stats.leadership+campaignSubAbility(s,a.commanderId,'감화','결집'))/C12.moraleDivisor-weight/domesticMoraleThreshold(s,a)))*(c28Enabled(s)&&c28Record(s,id)?.c28?.survival?.name==='겁먹음'?C28.woundThreshold:1);
 const rng=createRng();rng.restore(s.rng.value);const roll=rng.next()*100;s.rng.value=rng.state();s.rng.draws++;
 if(roll>=probability)changeMorale(s,id,a.morale==='SHAKEN'?'ROUTING':'SHAKEN',reason,changes);
 return changes;
}
export function nearbyMorale(s,source,changes=[]){
 for(const a of Object.values(s.armies).sort((a,b)=>a.armyId.localeCompare(b.armyId,'en')))
  if(a.armyId!==source.armyId&&a.factionId===source.factionId&&hexDistance(s.tiles[a.tileId],s.tiles[source.tileId])===1&&!ignoreBoundRout(s,a.armyId,source))checkMorale(s,a.armyId,'인접 아군 패주·소멸',10,changes);
 return changes;
}
export function gateMorale(s,before){
 const changes=[];
 for(const c of Object.values(s.cities))if(c.footprint.gates.every(g=>c.gateControl[g]!==c.ownerFactionId)&&!before.cities[c.cityId].footprint.gates.every(g=>before.cities[c.cityId].gateControl[g]!==before.cities[c.cityId].ownerFactionId))
  for(const a of Object.values(s.armies))if(a.factionId===c.ownerFactionId&&hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=1)checkMorale(s,a.armyId,'성문 전부 상실',0,changes);
 const notified=new Set();
 for(let index=0;index<changes.length;index++){const event=changes[index];if(event.to==='ROUTING'&&!notified.has(event.armyId)){notified.add(event.armyId);nearbyMorale(s,before.armies[event.armyId],changes);}}
 return changes;
}
export function startFactionMorale(s,factionId){
 for(const a of Object.values(s.armies))if(a.factionId===factionId){a.movedTiles=0;if(a.morale==='ROUTING')changeFormation(s,a.armyId,2);a.braced=false;if(castleArmyActive(s,a)&&a.morale==='ROUTING')retreatRouting(s,a.armyId);}
}
// 정산: 적과 떨어져 있으면 한 단계씩 수습(패주 → 동요 → 안정). 패주 수습은 시험값(Total War 식 재집결) — 정본 다음 개정에 반영.
export function settleMorale(s){
 for(const a of Object.values(s.armies))if(castleArmyActive(s,a)&&!enemies(s,a).some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)){
  if(a.forcedMarchTurn!==s.turn-1&&!(a.stratagemDiscord?.until>=s.turn)){if(a.morale==='SHAKEN')changeMorale(s,a.armyId,'STEADY','정산 회복');else if(a.morale==='ROUTING')changeMorale(s,a.armyId,'SHAKEN','정산 수습');}
  changeFormation(s,a.armyId,-1);
 }
}
export function regroupReason(s,id){const a=s.armies[id];return a?.morale!=='SHAKEN'&&a?.formation==='ORDERED'?'동요 상태에서만 가능':enemies(s,a).some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)&&(!classCamp(s,id)||enemies(s,a).some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1&&directionToward(s.tiles[a.tileId],s.tiles[b.tileId])===(a.facing+3)%6))?'적과 인접하여 재정비 불가':'';}
function combatDestinationAllowed(s,id,to){
 if(combatFireAt(s,to)||!campaignDestinationAllowed(s,id,to))return false;
 if(!combatMoveAllowed(s,id,to))return false;
 if(combatCanPostMove(s,id)&&!classPostMove(s,id)&&s.armies[id].c32?.postMove!==s.turn){const a=s.armies[id],foes=enemies(s,a);const distance=tile=>Math.min(...foes.map(b=>hexDistance(s.tiles[tile],s.tiles[b.tileId])));if(foes.length&&distance(to)<=distance(a.tileId))return false;}
 return true;
}
