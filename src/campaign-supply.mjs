import data from '../../docs/design-data/supply-v0.1.json' with {type:'json'};
import models from '../../docs/design-data/supply-v0.2.json' with {type:'json'};
import {boardNeighbors,tileId,hexDistance} from './map-primitives.mjs';
import {edgeTicks,findPath} from './movement.mjs';
import {diplomacyHostile} from './campaign-diplomacy.mjs';
import {classifyBattleCasualties} from './military-personnel-ledger.mjs';

// Runtime services avoid the economy/roster/morale import cycle.
let services;
export function configureSupply(options){services=options;}
export const supplyEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c45Disabled!==true;
// Existing city field upkeep: two food per thousand soldiers per settlement.
export const foodModel=s=>['v2','v3'].includes(s?.mapId)?s.trialRules?.foodModel??'upkeep':'upkeep';
export const clockFood=s=>foodModel(s)==='clock';
export const baseCityFood=s=>foodModel(s)==='cheap'?models.cheap.cityBaseFood:4;
export const troopFoodRate=s=>foodModel(s)==='cheap'?models.cheap.troopFoodPerThousand:2;
export const supplyStockTurns=s=>clockFood(s)?models.clock.fieldStockTurns:data.fieldStock.turns;
export const armyFoodPerTurn=(a,s=null)=>Math.round(a.troopCount*troopFoodRate(s))/1000;
export const supplyMax=(s,a)=>armyFoodPerTurn(a,s)*supplyStockTurns(s);
const round=n=>Math.round(n*1e6)/1e6;
const active=(s,a)=>services?.active?services.active(s,a):a.troopCount>0&&a.hp>0;
const cityTiles=c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])];
const availableHub=(s,h)=>h.availableTurn<=s.turn;
const maxHub=s=>armyFoodPerTurn({troopCount:250},s)*data.hub.storageTurns;
const handlingHub=s=>armyFoodPerTurn({troopCount:250},s)*data.hub.handlingTurns;
// 첫 재고: 짓는 부대 군량 × costTurns, 저장 한도까지만(병력이 많아도 지을 수 있게 — 짓는 순간 한 번 옮기는 양이라 처리량과 별개)
const hubOpeningCost=(a,s)=>Math.min(maxHub(s),armyFoodPerTurn(a,s)*data.hub.build.costTurns);
export function initializeSupply(s){
 if(!supplyEnabled(s))return s;
 s.supply??={hubs:[],pending:{},sequence:0,lastSettledTurn:null,cutArmies:[],starvingArmies:[],starvationLoss:0,built:0,captured:0};
 for(const a of Object.values(s.armies))if(!a.supplyInitialized){a.supplyFood=supplyMax(s,a);a.supplyInitialized=true;}
 return s;
}
export function loadMusterSupply(s,a,c){
 if(!supplyEnabled(s))return;
 initializeSupply(s);a.supplyFood=0;
 if(clockFood(s)){a.supplyFood=supplyMax(s,a);a.supplyInitialized=true;return;}
 const amount=Math.min(supplyMax(s,a),Math.max(0,c.foodStock-(c.reservedResources?.food??0)-c.population*2));
 c.foodStock=round(c.foodStock-amount);a.supplyFood=amount;a.supplyInitialized=true;
 (c.economyCauses??=[]).push({resource:'food',label:`출진 군량(${s.officers[a.commanderId]?.name??'새'} 부대)`,amount:0-amount});
}
function sources(s,f,exclude=null){return [
 ...Object.values(s.cities).filter(c=>c.ownerFactionId===f&&!c.besieged).map(c=>({id:c.cityId,city:c,tiles:cityTiles(c),stock:clockFood(s)?0:c.foodStock})),
 ...(s.supply?.hubs??[]).filter(h=>h.factionId===f&&availableHub(s,h)&&h.hubId!==exclude).map(h=>({id:h.hubId,hub:h,tiles:[h.tileId],stock:clockFood(s)?0:h.stock}))
 ];}
export function supplyLink(s,a,at=a.tileId,{exclude=null,limit=data.link.range*2,ignoreCityId=null}={}){
 const inCity=Object.values(s.cities).find(c=>c.ownerFactionId===a.factionId&&cityTiles(c).includes(at));
 if(inCity)return {state:'SAFE',sourceCityId:inCity.cityId,sourceHubId:null,distance:0,source:{id:inCity.cityId,city:inCity}};
 const candidates=sources(s,a.factionId,exclude),targets=new Map();
 for(const source of candidates)for(const t of source.tiles){if(!targets.has(t))targets.set(t,[]);targets.get(t).push(source);}
 const blocked=new Set(Object.values(s.armies).filter(b=>active(s,b)&&diplomacyHostile(s,a.factionId,b.factionId)).map(b=>b.tileId));
 for(const c of Object.values(s.cities))if(c.cityId!==ignoreCityId&&diplomacyHostile(s,a.factionId,c.ownerFactionId))cityTiles(c).forEach(t=>blocked.add(t));
 const world=services.movement(s,a.armyId),queue=[[at,0]],seen=new Set([at]);let best=null;
 for(let i=0;i<queue.length;i++){
  const [current,d]=queue[i];if(d>limit||best&&d>best.distance)break;
  if(!blocked.has(current))for(const source of targets.get(current)??[])if(!best||(source.stock??0)>(best.source.stock??0)||(source.stock??0)===(best.source.stock??0)&&source.id.localeCompare(best.source.id)<0)best={distance:d,source};
  if(best||d===limit||blocked.has(current))continue;
  for(const p of boardNeighbors(s.tiles[current],s.tiles)){const to=tileId(p);if(seen.has(to)||blocked.has(to)||edgeTicks(world,world.armies[a.armyId],current,to)===null)continue;seen.add(to);queue.push([to,d+1]);}
 }
 return best?{state:best.distance<=data.link.range?'SAFE':'DISRUPTED',sourceCityId:best.source.city?.cityId??null,sourceHubId:best.source.hub?.hubId??null,...best}:{state:'CUT',sourceCityId:null,sourceHubId:null,distance:null,source:null};
}
export function supplyView(s,a,at=a.tileId){
 const link=supplyLink(s,a,at),perTurn=armyFoodPerTurn(a,s),max=supplyMax(s,a),free=clockFood(s)&&link.state==='SAFE'&&!link.source?.city?.besieged;
 return {state:!free&&at===a.tileId&&a.supplyStarving?'STARVING':link.state,stock:a.supplyFood,max,perTurn,turnsLeft:free?supplyStockTurns(s):perTurn?round(a.supplyFood/perTurn):0,sourceCityId:link.sourceCityId,distance:link.distance,model:foodModel(s),draining:clockFood(s)?(!free&&(link.state!=='SAFE'||(link.source?.city?.foodStock??0)-(link.source?.city?.reservedResources?.food??0)<perTurn)):link.state!=='SAFE'||(link.source?.city?link.source.city.foodStock-(link.source.city.reservedResources?.food??0)-link.source.city.population*2<perTurn:(link.source?.hub?.stock??0)<perTurn)};
}
function take(s,source,wanted,{protect=true}={}){
 if(!source)return 0;
 const h=source.hub,c=source.city;
 const spare=h?Math.min(h.stock,Math.max(0,handlingHub(s)-(h.handled??0))):Math.max(0,c.foodStock-(c.reservedResources?.food??0)-(protect?c.population*2:0));
 const amount=round(Math.min(Math.max(0,wanted),Math.max(0,spare)));
 if(h){h.stock=round(h.stock-amount);h.handled=round((h.handled??0)+amount);}else c.foodStock=round(c.foodStock-amount);
 return amount;
}
export function hubBuildReason(s,a){
 if(s.c46Disabled!==true&&s.officers[a?.commanderId]?.injury)return '중상 요양 중에는 거점을 지을 수 없습니다.';
 if(!supplyEnabled(s)||!a||!active(s,a))return '거점을 지을 부대가 없습니다.';
 if(!['plain','hill','forest'].includes(s.tiles[a.tileId]?.terrainType))return '평지·언덕·숲에만 거점을 지을 수 있습니다.';
 if(Object.values(s.armies).some(b=>active(s,b)&&diplomacyHostile(s,a.factionId,b.factionId)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=1))return '한 칸 안에 적 부대가 있습니다.';
 if(Object.values(s.cities).some(c=>cityTiles(c).some(t=>hexDistance(s.tiles[a.tileId],s.tiles[t])<3))||(s.supply?.hubs??[]).some(h=>hexDistance(s.tiles[a.tileId],s.tiles[h.tileId])<3)||Object.values(s.supply?.pending??{}).some(p=>hexDistance(s.tiles[a.tileId],s.tiles[p.tileId])<3))return '성이나 다른 거점에서 세 칸 이상 떨어져야 합니다.';
 if((s.supply?.hubs??[]).filter(h=>h.factionId===a.factionId).length+Object.values(s.supply?.pending??{}).filter(p=>p.factionId===a.factionId).length>=data.hub.build.maxPerFaction)return '세력의 보급 거점 한도에 도달했습니다.';
 const link=supplyLink(s,a);if(link.state!=='SAFE')return '안전한 보급선이 이어진 곳에만 거점을 지을 수 있습니다.';
 if(clockFood(s))return '';
 const wanted=hubOpeningCost(a,s);
 if(wanted>(link.source.hub?Math.min(link.source.hub.stock,handlingHub(s)-(link.source.hub.handled??0)):Math.max(0,link.source.city.foodStock-(link.source.city.reservedResources?.food??0)-link.source.city.population*2)))return '거점에 옮길 군량이나 처리량이 부족합니다.';
 return '';
}
export function beginHub(s,id){initializeSupply(s);const a=s.armies[id],reason=hubBuildReason(s,a);if(reason)throw new Error(reason);s.supply.pending[id]={armyId:id,tileId:a.tileId,factionId:a.factionId,turn:s.turn,cost:clockFood(s)?0:hubOpeningCost(a,s)};}
export function supplyCombat(s,ids){if(supplyEnabled(s)&&s.supply)for(const id of ids)delete s.supply.pending[id];}
export function captureHubs(s,id){
 if(!supplyEnabled(s))return;const a=s.armies[id];
 for(const h of s.supply.hubs)if(h.tileId===a.tileId&&diplomacyHostile(s,a.factionId,h.factionId)&&!Object.values(s.armies).some(b=>b.armyId!==id&&active(s,b)&&b.factionId===h.factionId&&b.tileId===h.tileId)){h.factionId=a.factionId;h.availableTurn=s.turn+1;h.linked=false;s.supply.captured++;supplyLoot(s,id,'HUB',{hubId:h.hubId});}
}
export function supplyLoot(s,id,kind,details={},log=null){
 const a=s.armies[id];if(!clockFood(s)||!supplyEnabled(s)||!a||!active(s,a))return;
 const max=supplyMax(s,a),before=Math.min(a.supplyFood,max);a.supplyFood=kind==='ARMY'?Math.min(max,before+armyFoodPerTurn(a,s)*models.clock.killRewardTurns):max;
 const entry={armyId:id,kind,amount:round(a.supplyFood-before),stock:a.supplyFood,max,...details};
 if(log){(log.supplyLoot??=[]).push(entry);(log.effectLines??=[]).push('군량 노획');}
 else (s.administrationLog??=[]).push({turn:s.turn,factionId:a.factionId,text:'군량 노획',supplyLoot:entry});
}
export function supplyCombatLoot(s,log,sourceId=log.attackerId){
 for(const u of log.units??[])if(u.preBattleCount>0&&u.postBattleCount===0&&s.armies[u.unitId]&&s.armies[sourceId]&&diplomacyHostile(s,s.armies[sourceId].factionId,s.armies[u.unitId].factionId)){
  if((log.supplyLoot??[]).some(e=>e.kind==='ARMY'&&e.targetId===u.unitId))continue;
  supplyLoot(s,sourceId,'ARMY',{targetId:u.unitId},log);
 }
}
export function supplyCityLoot(s,id,cityId,log){
 const a=s.armies[id],c=s.cities[cityId];if(!a||!c)return;
 for(const b of Object.values(s.armies))if(b.factionId===a.factionId&&(b.armyId===id||cityTiles(c).includes(b.tileId)))supplyLoot(s,b.armyId,'CITY',{cityId},log);
}
function starvation(s,a){
 services.morale(s,a.armyId,'굶주림',data.starving.moraleWeight);
 // Use the existing casualty classifier with zero wounded and explicit loss.
 const pre=a.troopCount,loss=Math.floor(pre*data.starving.attritionPct/100),post=pre-loss;
 if(!loss)return;
 const id=`SUPPLY.${s.turn}.${a.armyId}`,f=s.personnel.formations.find(f=>f.formationId===a.armyId);
 s.personnel=classifyBattleCasualties(s.personnel,{operationId:id,expectedRevision:s.personnel.revision,snapshot:{format:'combat-battle-result-v1',battleId:id,decisionRef:id,sourceRevision:s.personnel.revision,units:[{unitId:a.armyId,preBattleCount:pre,postBattleCount:post,casualties:loss,unitState:'COMMANDABLE'}]},allocations:[{unitId:a.armyId,formationId:a.armyId,wounded:0,permanentLoss:loss,recoveryNodeId:f.nodeId,woundedLotId:`W.${id}`,lossId:`L.${id}`}]}).ledger;
 a.troopCount=post;a.deadCount+=loss;a.hp=Math.min(a.hp,post*2);s.supply.starvationLoss+=loss;
}
export function settleSupply(s){
 if(!supplyEnabled(s))return;initializeSupply(s);if(s.supply.lastSettledTurn===s.turn)return;
 for(const h of s.supply.hubs)h.handled=0;
 for(const [id,p] of Object.entries(s.supply.pending)){
  const a=s.armies[id];delete s.supply.pending[id];
  if(!a||!active(s,a)||a.tileId!==p.tileId||a.factionId!==p.factionId||s.turn<=p.turn)continue;
  if(hubBuildReason(s,a))continue;
  if(clockFood(s)){s.supply.hubs.push({hubId:`HUB.${++s.supply.sequence}`,tileId:p.tileId,factionId:p.factionId,stock:0,max:0,handled:0,availableTurn:s.turn,linked:true});s.supply.built++;continue;}
  const link=supplyLink(s,a),amount=take(s,link.source,p.cost);if(amount!==p.cost)throw new Error('거점 군량 이전량이 올바르지 않습니다.');
  if(link.source.city)(link.source.city.economyCauses??=[]).push({resource:'food',label:'보급 거점 첫 재고',amount:0-amount});
  s.supply.hubs.push({hubId:`HUB.${++s.supply.sequence}`,tileId:p.tileId,factionId:p.factionId,stock:amount,max:maxHub(s),handled:amount,availableTurn:s.turn,linked:true});s.supply.built++;
 }
 // Snapshot donor stock: a hub cannot forward a fresh receipt in this settlement.
 const opening=Object.fromEntries(s.supply.hubs.map(h=>[h.hubId,h.stock]));
 for(const h of s.supply.hubs){
  const a=Object.values(s.armies).find(a=>a.factionId===h.factionId)??Object.values(s.armies)[0];if(!a||!availableHub(s,h))continue;
  const link=supplyLink(s,{...a,factionId:h.factionId,tileId:h.tileId},h.tileId,{exclude:h.hubId,limit:data.link.range});h.linked=link.state==='SAFE';
  if(clockFood(s)||!h.linked)continue;
  const donor=link.source.hub,wanted=Math.min(h.max-h.stock,handlingHub(s)-h.handled,donor?opening[donor.hubId]:Infinity),amount=take(s,link.source,wanted);
  if(donor)opening[donor.hubId]=round(opening[donor.hubId]-amount);
  h.stock=round(h.stock+amount);h.handled=round(h.handled+amount);
  if(link.source.city)(link.source.city.economyCauses??=[]).push({resource:'food',label:'보급 거점 채움',amount:0-amount});
 }
 for(const a of Object.values(s.armies).filter(a=>active(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId))){
  const link=supplyLink(s,a),need=armyFoodPerTurn(a,s),max=supplyMax(s,a); a.supplyFood=Math.min(a.supplyFood,max);
  if(clockFood(s)&&!link.source?.city?.besieged){
   const required=link.state==='SAFE'?0:link.state==='DISRUPTED'?need/2:need;
   const starving=a.supplyFood+1e-6<required;a.supplyFood=link.state==='SAFE'?max:round(Math.max(0,a.supplyFood-required));
   a.supplyState=link.state;a.supplyStarving=starving;
   if(link.state==='CUT'&&!s.supply.cutArmies.includes(a.armyId))s.supply.cutArmies.push(a.armyId);
   if(starving){if(!s.supply.starvingArmies.includes(a.armyId))s.supply.starvingArmies.push(a.armyId);starvation(s,a);}continue;
  }
  const paid=take(s,link.source,link.state==='SAFE'?need:link.state==='DISRUPTED'?need/2:0,{protect:link.source?.city?.besieged!==true});
  const carried=Math.min(a.supplyFood,round(need-paid));a.supplyFood=round(a.supplyFood-carried);const starving=paid+carried+1e-6<need;
  let refill=0;if(link.state==='SAFE'&&!starving){refill=take(s,link.source,Math.min(max-a.supplyFood,need*data.link.refillPerTurn));a.supplyFood=round(a.supplyFood+refill);}
  if(link.source?.city)(link.source.city.economyCauses??=[]).push({resource:'food',label:`군량(${s.officers[a.commanderId]?.name??'장수'} 부대)`,amount:0-round(paid+refill)});
  const name=s.officers[a.commanderId]?.name??'장수';
  if(a.factionId===s.playerFactionId&&((link.state==='CUT'&&a.supplyState!=='CUT')||(starving&&!a.supplyStarving)))(s.administrationLog??=[]).push({turn:s.turn,factionId:a.factionId,text:starving?`${name} 부대가 굶주리기 시작했다`:`${name} 부대 보급선이 끊겼다 — 휴대 군량 ${need?round(a.supplyFood/need):0}차례분`});
  if(link.state==='CUT'&&!s.supply.cutArmies.includes(a.armyId))s.supply.cutArmies.push(a.armyId);
  if(starving&&!s.supply.starvingArmies.includes(a.armyId))s.supply.starvingArmies.push(a.armyId);
  a.supplyState=link.state;a.supplyStarving=starving;if(starving)starvation(s,a);
 }
 s.supply.lastSettledTurn=s.turn;
}
export function supplyAiAction(s,id,reachable,{targetCityId=null,allowBuild=true,publicWorld=null,foodAware=false}={}){
 if(!supplyEnabled(s))return null;const a=s.armies[id],link=supplyLink(publicWorld??s,a),need=armyFoodPerTurn(a,s);
 if(a.morale==='ROUTING')return null;
 const emptySource=!clockFood(s)&&foodAware&&link.source?.city&&link.source.city.foodStock-(link.source.city.reservedResources?.food??0)-link.source.city.population*2<need;
 const clockReturn=clockFood(s)&&link.state!=='SAFE'&&a.supplyFood<=need&&!services.canWin?.(publicWorld??s,id);
 if(clockReturn||!clockFood(s)&&(publicWorld&&a.supplyStarving||emptySource&&a.supplyFood<=need*2||link.state==='CUT'&&a.supplyFood<=need*2||link.state==='DISRUPTED'&&a.supplyFood<=need)){
  if(publicWorld){
   // Choose the nearest usable refill source by known-route cost. Hubs refill
   // food only; troop replenishment remains the existing own-city rule.
   const world=services.movement(publicWorld,id),origins=sources(publicWorld,a.factionId).filter(o=>clockFood(s)|| (o.hub?o.hub.linked!==false&&o.hub.stock>=need:o.city.foodStock-(o.city.reservedResources?.food??0)-o.city.population*2>=need*(foodAware?1+data.fieldStock.turns:1)));
   const routes=origins.flatMap(o=>o.tiles.filter(t=>publicWorld.tiles[t]).map(t=>findPath(world,id,t))).filter(Boolean).sort((a,b)=>a.totalTicks-b.totalTicks||a.pathTileIds.at(-1).localeCompare(b.pathTileIds.at(-1)));
   const route=routes[0];if(!route)return {type:'WAIT'};
   let ticks=0,current=a.tileId,destination=a.tileId;
   for(const to of route.pathTileIds.slice(1)){const cost=edgeTicks(world,world.armies[id],current,to);if(cost===null||ticks+cost>s.time.ticksPerTurn)break;ticks+=cost;current=to;if(reachable.has(to))destination=to;}
   return destination===a.tileId?{type:'WAIT'}:{type:'MOVE',destinationTileId:destination};
  }
  const origins=sources(s,a.factionId),distance=t=>Math.min(...origins.flatMap(o=>o.tiles.map(id=>hexDistance(s.tiles[t],s.tiles[id]))));
  const choices=[...reachable].filter(([t])=>distance(t)<distance(a.tileId)).sort(([x],[y])=>distance(x)-distance(y)||x.localeCompare(y));
  return choices.length?{type:'MOVE',destinationTileId:choices[0][0]}:{type:'WAIT'};
 }
 if(allowBuild&&targetCityId){const site=supplyAiHubSite(publicWorld??s,id,reachable,targetCityId);if(site===a.tileId)return {type:'BUILD_HUB'};if(site)return {type:'MOVE',destinationTileId:site};}
 return null;
}

// C143b planning-only reads. Loading/refill still uses the unchanged rules above.
export function supplyAiLaunchFood(s,c,count){
 const full=supplyEnabled(s)?supplyMax(s,{troopCount:count}):0;
 const available=Math.max(0,c.foodStock-(c.reservedResources?.food??0)-c.population*2);
 return {full,available,canFill:clockFood(s)||!supplyEnabled(s)||available+1e-6>=full};
}
export function supplyAiHubSite(s,id,reachable,targetCityId){
 if(!supplyEnabled(s))return null;
 const a=s.armies[id],target=s.knowledge[a.factionId]?.cities[targetCityId];
 if(!target||!s.tiles[target.tileId]||!diplomacyHostile(s,a.factionId,target.ownerFactionId))return null;
 const origins=sources(s,a.factionId),goal=s.tiles[target.tileId];
 const ranked=origins.flatMap(o=>o.tiles.map(t=>({o,t,d:hexDistance(s.tiles[t],goal)}))).sort((x,y)=>x.d-y.d||x.t.localeCompare(y.t));
 const origin=ranked.find(x=>x.o.city);
 if(!origin||!ranked.length||ranked[0].d<9)return null;
 // A hub (including one under construction) on this corridor already serves it.
 const along=t=>hexDistance(s.tiles[origin.t],s.tiles[t])+hexDistance(s.tiles[t],goal)<=origin.d+2;
 if([...(s.supply?.hubs??[]),...Object.values(s.supply?.pending??{})].some(h=>h.factionId===a.factionId&&along(h.tileId)&&hexDistance(s.tiles[h.tileId],goal)<origin.d))return null;
 const sites=[a.tileId,...reachable.keys()].filter(t=>s.knowledge[a.factionId]?.tiles[t]!=='UNEXPLORED'&&along(t)&&hexDistance(s.tiles[t],goal)<origin.d).filter(t=>{
  const unit={...a,tileId:t},link=supplyLink(s,unit);
  return link.state==='SAFE'&&link.distance>=6&&link.distance<=8&&!hubBuildReason(s,unit);
 });
 sites.sort((x,y)=>hexDistance(s.tiles[a.tileId],s.tiles[x])-hexDistance(s.tiles[a.tileId],s.tiles[y])||x.localeCompare(y));
 return sites[0]??null;
}
export function supplyAiMoveAllowed(s,id,to,{targetTileId=null,turnsToGoal=1,supplyState=null}={}){
 if(!supplyEnabled(s)||s.armies[id].morale==='ROUTING')return true;
 const a=s.armies[id],state=supplyState??supplyLink(s,a,to).state,need=armyFoodPerTurn(a,s),carried=need?a.supplyFood/need:0;
 if(state==='SAFE')return true;
 if(targetTileId&&hexDistance(s.tiles[to],s.tiles[targetTileId])===1&&carried>=2)return true;
 return turnsToGoal<=(state==='DISRUPTED'?carried*2:carried);
}
export function supplyHubsView(s,factionId){return (s.supply?.hubs??[]).filter(h=>s.knowledge[factionId]?.tiles[h.tileId]==='VISIBLE').map(h=>({hubId:h.hubId,tileId:h.tileId,factionId:h.factionId,stock:h.stock,max:h.max,linked:h.linked}));}
export const supplyMetrics=s=>({cutArmies:s.supply?.cutArmies.length??0,starvingArmies:s.supply?.starvingArmies.length??0,starvationLoss:s.supply?.starvationLoss??0,hubsBuilt:s.supply?.built??0,hubsCaptured:s.supply?.captured??0});
