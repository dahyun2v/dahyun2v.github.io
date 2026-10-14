import {campaignTacticsEnabled,campaignTacticsView,campaignTacticsWorld,campaignOperationPlan,campaignTacticalMoves} from './campaign-ai-tactics.mjs';
import {campaignAiRule,campaignAiRulesEnabled,campaignReferencePlan,campaignAiPosture,campaignAiPickTroop,campaignAiArrivalTurns,AI_RULE_GOAL_BONUS,AI_RULE_REVIEW_TURNS,AI_RULE_STALL_TURNS,AI_RULE_GATHER_TURNS} from './campaign-ai-rules.mjs';
import {injuryReason} from './campaign-injury.mjs';
import {supplyEnabled,supplyLink,supplyAiMoveAllowed,supplyAiHubSite,armyFoodPerTurn,foodModel,clockFood,troopFoodRate,supplyAiAction} from './campaign-supply.mjs';
import {combatMovement} from './campaign-rule-registry.mjs';
import {fatigueReason,fatigueView,recordFatigueBlock} from './campaign-fatigue.mjs';
import {diplomacyHostile,withdrawalProtection,withdrawalDistances,diplomacyMoveReason} from './campaign-diplomacy.mjs';
import {explorationEnabled,explorationView} from './campaign-exploration.mjs';
import {campaignBannerView} from './campaign-rule-registry.mjs';
import {c31Active,c31City} from './campaign-events.mjs';
import {campaignReachable} from './campaign-morale.mjs';
import {C24,SPECIAL_TROOPS,c24Enabled,parentTroop} from './campaign-special-troops.mjs';
import {C23} from './campaign-abilities.mjs';
import {troopToCampaign} from './campaign-adapters.mjs';
import {c22TargetWeight} from './campaign-events.mjs';
import {C20_FACILITIES,c20Enabled} from './campaign-policy.mjs';
import {researchStage,musterRequirement,C19,freeCityOfficers,musterTroopOptions} from './campaign-roster.mjs';
import {selectCityJob,cityJobReason,campaignFoodNeed,facilityTiles,cityOccupationStatus,cityEconomyRates,campaignMobilization,campaignAiJobForecast,campaignAiFoodBudget,campaignAiFoodForecast,campaignAiMusterFood,campaignAiNeutralFood} from './campaign-economy.mjs';
import {cityAttackTargets,attackRange,attackTargets,previewAttack,attackDirection} from './campaign-combat.mjs';
import {findPath,edgeTicks} from './movement.mjs';
import {campaignMovementWorld,castleArmyActive} from './campaign-city-footprint.mjs';
import {getFactionView} from './knowledge.mjs';
import {neighbors,tileId,hexDistance} from './map-primitives.mjs';
import {planFirst3StrategicAi} from './first3-strategic-ai.mjs';

// C140 시험값: abandon a stalled sortie, but retry after a short pause.
export const AI_SIEGE_STALL_TURNS=6;
export const AI_SIEGE_REPEAT_VISITS=3;
export const AI_SIEGE_HISTORY_LIMIT=12;
export const AI_SIEGE_COOLDOWN_TURNS=4;
// aiProfile: legacy (pre-C140), siege (C140), strategy (C141/default), tactics (C142 — opt-in only).
export const campaignSiegeEnabled=(s,factionId)=>s.trialRules?.aiProfile?.[factionId]!=='legacy'&&s.trialRules?.aiSiege!=='legacy';
export const campaignStrategyEnabled=(s,factionId)=>['v2','v3'].includes(s.mapId)&&campaignSiegeEnabled(s,factionId)&&s.trialRules?.aiSiege!=='siege'&&!['legacy','siege'].includes(s.trialRules?.aiProfile?.[factionId]);

// C141 시험값: strategy weights only; never applied to combat or resources.
export const AI_GOAL_COMMIT_TURNS=3;
export const AI_GOAL_SWITCH_RATIO=1.5;
export const AI_MIN_ATTACK_SHARE=.4;
export const AI_DEFENSE_RADIUS=4;
export const AI_INTERCEPT_RADIUS=6;
export const AI_DEFENSE_TRAILING_SHARE=.7;
export const AI_DEFENSE_LEADING_SHARE=1.1;
export const AI_NEW_CITY_GUARD_TURNS=3;
export const AI_NEW_CITY_GUARD_FACTOR=1.35;
export const AI_MAJOR_CITY_VALUE=8;
export const AI_RANK_GAIN_VALUE=4;
export const AI_LEADER_CITY_VALUE=3;
export const AI_THREE_MAJOR_VALUE=100;
export const AI_LATE_TURNS=6;
export const AI_COUNTER_PREFERENCE=.25;
export const AI_UNKNOWN_TROOPS=1000;
export const AI_UNREADY_CHANCE=.25;
export const AI_DEFERRED_SCORE_FACTOR=.05;
export const AI_DEFENSE_ENEMY_TILES_PER_TURN=2;

// City kind is static, public map information. Ownership is always the view's
// observation/memory, never the current canonical owner of a remembered city.
function strategyCityKind(s,c){return c.kind??s.cities[c.cityId]?.kind??'major';}
function sortKnownRanking(s,rows){return rows.sort((a,b)=>(s.mapId==='v1'?b.cities-a.cities:b.majorCities-a.majorCities||b.minorCities-a.minorCities)||b.troops-a.troops||a.factionId.localeCompare(b.factionId));}
export function campaignKnownRanking(s,v){
 const rows=new Map(),row=f=>{if(!rows.has(f))rows.set(f,{factionId:f,majorCities:0,minorCities:0,cities:0,troops:0});return rows.get(f);};
 row(v.factionId);
 for(const c of Object.values({...v.knowledge.cities,...v.ownCities}))if(c.ownerFactionId){const r=row(c.ownerFactionId);r.cities++;r[strategyCityKind(s,c)==='minor'?'minorCities':'majorCities']++;if(c.ownerFactionId===v.factionId)r.troops+=c.reserveTroops??0;}
 for(const a of Object.values({...v.knowledge.observedArmies,...v.ownArmies}))row(a.factionId).troops+=a.troopCount??(campaignAiRule(s,v.factionId,7)?0:AI_UNKNOWN_TROOPS);
 return sortKnownRanking(s,[...rows.values()]);
}
function strategyMemory(s,v,remember){
 const old=s.aiStrategy?.[v.factionId],m=structuredClone(old??{ownedSince:{},observedPositions:{},targetCityId:null,chosenTurn:0});
 for(const id of Object.keys(m.ownedSince))if(!v.ownCities[id])delete m.ownedSince[id];
 for(const id of Object.keys(v.ownCities))if(m.ownedSince[id]===undefined)m.ownedSince[id]=old?s.turn:0;
 // Keep previous positions through repeated calls at the same boundary.
 if(m.lastTurn!==s.turn){m.previousPositions=m.observedPositions;m.observedPositions=Object.fromEntries(Object.values(v.knowledge.observedArmies).map(a=>[a.armyId,a.tileId]));m.lastTurn=s.turn;}
 if(remember)(s.aiStrategy??={})[v.factionId]=m;
 return m;
}
function strategyPublicWorld(s,v){
 const probe=siegePublicWorld(s,v,Object.values(v.ownArmies)[0]??{armyId:'AI.ECONOMY.PROBE',factionId:v.factionId,tileId:Object.values(v.ownCities)[0]?.tileId,troopType:'militia',troopCount:0,hp:0});
 // Own city geometry/state is authoritative; a remembered castle can lag.
 for(const c of Object.values(v.ownCities))probe.cities[c.cityId]=structuredClone(c);
 // Supply geometry and blockers are restricted to publicly known territory.
 probe.tiles=Object.fromEntries(Object.entries(v.tiles).map(([id,t])=>[id,v.knowledge.tiles[id]==='UNEXPLORED'?{...t,terrainType:'mountain'}:t]));
 probe.supply={...s.supply,hubs:(s.supply?.hubs??[]).filter(h=>h.factionId===v.factionId||v.knowledge.tiles[h.tileId]==='VISIBLE'),pending:Object.fromEntries(Object.entries(s.supply?.pending??{}).filter(([,h])=>h.factionId===v.factionId))};
 return probe;
}
function strategyMove(s,v,c,route,reasonCode,extra={}){
 const a=s.armies[c.armyId],movement=campaignMovementWorld(s,a.armyId);let ticks=0,path=[a.tileId];
 for(const to of route.pathTileIds.slice(1)){const cost=edgeTicks(movement,movement.armies[a.armyId],path.at(-1),to);if(cost===null||ticks+cost>s.time.ticksPerTurn||path.length-1>=combatMovement(s,a.armyId).max)break;ticks+=cost;path.push(to);}
 return {...c,type:path.length>1?'MOVE':'HOLD',destinationTileId:path.length>1?path.at(-1):null,pathTileIds:path,targetArmyId:null,reasonCode,...extra};
}
// A preference for favorable public troop pairings, not a damage multiplier.
export function campaignCounterPreference(s,a,b){
 const at=troopToCampaign(a.troopType),bt=troopToCampaign(b.troopType),legacy=s.trialRules?.troopMatchup==='v35';
 const favorable=legacy?{'BT01':'BT03','BT02':'BT04','BT04':'BT03'}:{'BT01':'BT02','BT02':'BT04','BT03':'BT01','BT04':'BT01'};
 return 1+(favorable[at]===bt||at==='BT04'&&bt==='BT03'?AI_COUNTER_PREFERENCE:0);
}
export function campaignDefensePlan(s,v,plan,{remember=false,ranking=campaignKnownRanking(s,v)}={}){
 if(campaignAiRule(s,v.factionId,13))return capitalDefensePlan(s,v,plan,{remember,ranking});
 if(campaignAiRule(s,v.factionId,11))return referenceDefensePlan(s,v,plan,{remember,ranking});
 const memory=strategyMemory(s,v,remember),units=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a)&&a.morale!=='ROUTING'),assigned=new Set();
 const rule11=campaignAiRule(s,v.factionId,11),posture=campaignAiPosture(s,v,ranking),limit=units.length-Math.ceil(units.length*AI_MIN_ATTACK_SHARE),leading=ranking[0]?.factionId===v.factionId;
 const threats=Object.values(v.ownCities).map(city=>{
  const enemies=Object.values(v.knowledge.observedArmies).filter(a=>{
   const d=hexDistance(v.tiles[a.tileId],v.tiles[city.tileId]),previous=memory.previousPositions?.[a.armyId];
   return d<=AI_DEFENSE_RADIUS||d<=AI_INTERCEPT_RADIUS&&previous&&hexDistance(v.tiles[previous],v.tiles[city.tileId])>d;
  });
  const fresh=memory.ownedSince[city.cityId]>0&&s.turn-memory.ownedSince[city.cityId]<AI_NEW_CITY_GUARD_TURNS;
  const need=enemies.reduce((n,a)=>n+(a.troopCount??AI_UNKNOWN_TROOPS),0)*(leading?AI_DEFENSE_LEADING_SHARE:AI_DEFENSE_TRAILING_SHARE)*(fresh?AI_NEW_CITY_GUARD_FACTOR:1);
  const local=units.filter(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=1).reduce((n,a)=>n+a.troopCount,0);
  return {city,enemies,need,fresh,priority:need-local};
 }).filter(x=>x.need>0).sort((a,b)=>b.priority-a.priority||Number(b.fresh)-Number(a.fresh)||a.city.cityId.localeCompare(b.city.cityId));
 const orders=new Map(),quotas=[];
 if(rule11){
  for(const city of Object.values(v.ownCities)){
   const guards=units.filter(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=1).sort((a,b)=>Number(parentTroop(a.troopType)==='cavalry')-Number(parentTroop(b.troopType)==='cavalry')||a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId));
   const threat=threats.find(x=>x.city.cityId===city.cityId),enemyPower=threat?.enemies.reduce((n,a)=>n+(a.troopCount??0),0)??0;
   const canCounter=threat&&guards.reduce((n,a)=>n+a.troopCount,0)/Math.max(1,enemyPower)>=posture.startRatio&&guards.some(a=>attackTargets(s,a.armyId).length);
   if(guards.length&&!canCounter){const a=guards[0],c=plan.candidates.find(c=>c.armyId===a.armyId);if(c){assigned.add(a.armyId);orders.set(a.armyId,{...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:city.cityId===v.faction.capitalCityId?'CAPITAL_GARRISON':'CITY_GARRISON',defendCityId:city.cityId});}}
  }
  threats.sort((a,b)=>units.filter(u=>hexDistance(v.tiles[u.tileId],v.tiles[a.city.tileId])<=2).reduce((n,u)=>n+u.troopCount,0)-units.filter(u=>hexDistance(v.tiles[u.tileId],v.tiles[b.city.tileId])<=2).reduce((n,u)=>n+u.troopCount,0)||b.priority-a.priority);
 }
 for(const {city,enemies,need,fresh} of threats){
  let filled=0;
  const strongest=[...enemies].sort((a,b)=>(b.troopCount??AI_UNKNOWN_TROOPS)-(a.troopCount??AI_UNKNOWN_TROOPS)||a.armyId.localeCompare(b.armyId))[0];
  if(rule11&&units.filter(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=2).reduce((n,a)=>n+a.troopCount,0)/Math.max(1,enemies.reduce((n,a)=>n+(a.troopCount??0),0))>=posture.startRatio&&units.some(a=>attackTargets(s,a.armyId).some(id=>enemies.some(e=>e.armyId===id))))continue;
  const tiles=rule11?Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&hexDistance(t,v.tiles[city.tileId])>=1&&hexDistance(t,v.tiles[city.tileId])<=2).sort((a,b)=>hexDistance(a,v.tiles[strongest.tileId])-hexDistance(b,v.tiles[strongest.tileId])||a.tileId.localeCompare(b.tileId)).map(t=>t.tileId):[city.tileId,...(city.footprint?.gates??[])];
  const choices=units.filter(a=>!assigned.has(a.armyId)&&!withdrawalProtection(s,a.armyId)).map(a=>{
   const routes=tiles.map(t=>publicRoute(s,v,a.armyId,t)).filter(Boolean).sort((a,b)=>a.totalTicks-b.totalTicks||a.pathTileIds.at(-1).localeCompare(b.pathTileIds.at(-1)));
   const route=routes[0],preference=campaignCounterPreference(s,a,strongest);
   return {a,route,preference,score:route?preference/(1+route.totalTicks/s.time.ticksPerTurn):0};
  }).filter(x=>x.route&&x.route.totalTicks<=s.time.ticksPerTurn*Math.max(1,Math.ceil(hexDistance(v.tiles[strongest.tileId],v.tiles[city.tileId])/AI_DEFENSE_ENEMY_TILES_PER_TURN))).sort((a,b)=>(rule11?Number(parentTroop(a.a.troopType)==='cavalry')-Number(parentTroop(b.a.troopType)==='cavalry'):0)||b.score-a.score||b.a.troopCount-a.a.troopCount||a.a.armyId.localeCompare(b.a.armyId));
  for(const {a,route} of choices){
   if(filled>=need||assigned.size>=limit)break;
   const c=plan.candidates.find(c=>c.armyId===a.armyId);if(!c)continue;
   assigned.add(a.armyId);filled+=a.troopCount;
   orders.set(a.armyId,strategyMove(s,v,c,route,'INTERCEPT_CITY',{defendCityId:city.cityId}));
  }
  quotas.push({cityId:city.cityId,need,filled,fresh});
 }
 plan.candidates=plan.candidates.map(c=>orders.get(c.armyId)??c);
 plan.defense={maxAssigned:limit,assignedArmyIds:[...assigned],quotas};
 return plan;
}
// Reach quotes use only known geometry and observed siege-capable armies.
export function campaignCapitalThreats(s,v){
 if(!campaignAiRule(s,v.factionId,13))return [];
 const majors=Object.values(v.ownCities).filter(c=>strategyCityKind(s,c)==='major');
 return majors.map(city=>{
  const capital=city.cityId===v.faction.capitalCityId||majors.length===1,horizon=capital?3:2;
  const gates=city.footprint?.gates??[],enemies=Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE'&&diplomacyHostile(s,v.factionId,a.factionId)&&(!['bow','archer'].includes(parentTroop(a.troopType))||a.troopType==='catapult')).map(a=>({a,turns:campaignAiArrivalTurns(v,{...a,troopType:parentTroop(a.troopType)},gates,{maxTurns:horizon})})).filter(x=>x.turns<=horizon);
  // Reserve is credited only when the actual sortie contract has a legal job.
  const choice=freeCityOfficers(s,s.cities[city.cityId]).filter(o=>!injuryReason(s,o.officerId)&&!fatigueReason(s,o.officerId)).flatMap(o=>musterTroopOptions(s,s.cities[city.cityId],o.officerId).filter(t=>!t.blockedReason).map(t=>({officerId:o.officerId,troopType:t.troopType})))[0];
  const raw=s.cities[city.cityId],job=raw.currentProduction,forecast=choice?campaignAiJobForecast(s,raw,'muster',{troopType:choice.troopType,progress:job?.kind==='muster'?raw.jobProgress?.[job.key]??raw.productionProgress??0:0}):null;
  const canMuster=!!choice&&!cityJobReason(s,raw,'muster'),arrival=Math.min(...enemies.map(x=>x.turns));
  const reserve=canMuster&&forecast.turns<=arrival?campaignAiMusterFood(s,raw,choice.troopType).count:0;
  const power=enemies.reduce((n,x)=>n+(x.a.troopCount??0),0),wall=majors.length===1?0:city.durability??0;
  return {city,capital,lastMajor:majors.length===1,enemies,power,reserve,wall,need:Math.max(0,power-wall-reserve),canMuster,musterTurns:forecast?.turns??null};
 }).filter(t=>t.enemies.length).sort((a,b)=>Number(b.lastMajor)-Number(a.lastMajor)||Number(b.capital)-Number(a.capital)||b.need-a.need||a.city.cityId.localeCompare(b.city.cityId));
}
function defenseReturnTurns(s,v,a,route){
 if(!route)return Infinity;const world=campaignMovementWorld(s,a.armyId),max=combatMovement(s,a.armyId);if(max.rooted)return Infinity;
 let turns=route.pathTileIds.length>1?1:0,ticks=0,steps=0;
 for(let i=1;i<route.pathTileIds.length;i++){const cost=edgeTicks(world,world.armies[a.armyId],route.pathTileIds[i-1],route.pathTileIds[i]);if(cost===null||cost>s.time.ticksPerTurn||max.max<=0)return Infinity;if(ticks+cost>s.time.ticksPerTurn||steps>=max.max){turns++;ticks=0;steps=0;}ticks+=cost;steps++;}
 return turns;
}
function capitalDefensePlan(s,v,plan,{remember,ranking}){
 if(remember)strategyMemory(s,v,true);
 const threats=campaignCapitalThreats(s,v),units=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a)&&a.morale!=='ROUTING'),assigned=new Set(),orders=new Map(),quotas=[],reasons={};
 const note=code=>{reasons[code]=(reasons[code]??0)+1;};
 for(const t of threats){
  const {city,enemies,power,need}=t;if(t.canMuster)note('R13_MUSTER_AVAILABLE');else note('R13_MUSTER_UNAVAILABLE');
  const enemy=enemies.slice().sort((a,b)=>a.turns-b.turns||a.a.armyId.localeCompare(b.a.armyId))[0].a;
  const inner=[city.tileId,...city.footprint.gates],outer=Object.values(v.tiles).filter(p=>v.knowledge.tiles[p.tileId]!=='UNEXPLORED'&&hexDistance(p,v.tiles[city.tileId])>=1&&hexDistance(p,v.tiles[city.tileId])<=2).map(p=>p.tileId);
  const choices=units.filter(a=>!assigned.has(a.armyId)&&!withdrawalProtection(s,a.armyId)).map(a=>{
   const routes=inner.map(id=>publicRoute(s,v,a.armyId,id)).filter(Boolean).filter(r=>defenseReturnTurns(s,v,a,r)<=2).sort((a,b)=>a.totalTicks-b.totalTicks||a.pathTileIds.at(-1).localeCompare(b.pathTileIds.at(-1)));
   return {a,route:routes[0]};
  }).filter(x=>x.route).sort((a,b)=>a.route.totalTicks-b.route.totalTicks||b.a.troopCount-a.a.troopCount||a.a.armyId.localeCompare(b.a.armyId));
  const available=choices.reduce((n,x)=>n+x.a.troopCount,0),counter=available+t.reserve>=power;
  let filled=0;
  for(const {a,route:home} of choices){
   // No peaceful garrison, and no expedition quota may overrule extinction.
   if(filled>=need&&filled>0||need===0)break;
   const c=plan.candidates.find(c=>c.armyId===a.armyId);if(!c)continue;
   let route=home;
   if(counter&&filled+a.troopCount+t.reserve>=power){const intercept=outer.map(id=>publicRoute(s,v,a.armyId,id)).filter(Boolean).filter(r=>defenseReturnTurns(s,v,a,r)<=2).sort((x,y)=>hexDistance(v.tiles[x.pathTileIds.at(-1)],v.tiles[enemy.tileId])-hexDistance(v.tiles[y.pathTileIds.at(-1)],v.tiles[enemy.tileId])||x.totalTicks-y.totalTicks)[0];if(intercept)route=intercept;}
   const reason=counter?'R13_INTERCEPT_CITY':'R13_CITY_HOLD';assigned.add(a.armyId);filled+=a.troopCount;note(reason);
   orders.set(a.armyId,strategyMove(s,v,c,route,reason,{defendCityId:city.cityId,aiCapitalDefense:true,aiReferenceMove:true}));
  }
  if(!choices.length&&!t.canMuster){note('R13_NO_RETURN_OR_MUSTER');
   const empty=Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId&&c.ownerFactionId!==v.factionId&&diplomacyHostile(s,v.factionId,c.ownerFactionId)&&campaignCityDefense(s,v,c)===0).sort((a,b)=>campaignCityTargetScore(s,v,b)-campaignCityTargetScore(s,v,a)||a.cityId.localeCompare(b.cityId))[0];
   if(empty){note('R13_COUNTER_EMPTY_CITY');plan.capitalCounterCityId=empty.cityId;}
  }
  if(filled<need)note('R13_DEFENSE_SHORTFALL');
  quotas.push({cityId:city.cityId,need,filled,power,reserve:t.reserve,wall:t.wall,lastMajor:t.lastMajor,enemyArrivals:enemies.map(x=>({armyId:x.a.armyId,turns:x.turns})),canMuster:t.canMuster,counter});
 }
 // Minor-city defense keeps r11's bounded policy, using the remaining army.
 const minorPlan={...plan,candidates:plan.candidates.filter(c=>!assigned.has(c.armyId))},minorView={...v,ownCities:Object.fromEntries(Object.entries(v.ownCities).filter(([,c])=>strategyCityKind(s,c)==='minor')),ownArmies:Object.fromEntries(Object.entries(v.ownArmies).filter(([id])=>!assigned.has(id)))};
 if(campaignAiRule(s,v.factionId,11)){referenceDefensePlan(s,minorView,minorPlan,{remember:false,ranking});for(const c of minorPlan.candidates)if(c.defendCityId){assigned.add(c.armyId);orders.set(c.armyId,c);}}
 plan.candidates=plan.candidates.map(c=>orders.get(c.armyId)??c);plan.defense={maxAssigned:units.length,assignedArmyIds:[...assigned],quotas,reasons,capitalOrders:[...orders.values()].filter(c=>c.aiCapitalDefense)};return plan;
}
// The current occupation boundary invalidates hits from earlier ownership.
// Only combat at this actor's own city is read; foreign city history is unused.
export function campaignOwnedCityHits(s,v,city,sinceTurns=2){
 if(city.ownerFactionId!==v.factionId)return [];
 const recordId=s.terminal?.citiesById?.[city.cityId]?.occupationRecordId,record=s.terminal?.recordsById?.[recordId],source=record?.details?.sourceResultId;
 const captureSequence=/^CITY_ATTACK\.(\d+)$/.exec(source??'')?.[1],captureTurn=record?Math.floor(record.globalTick/s.time.ticksPerTurn)+1:0;
 const ownCapture=Math.max(0,...(s.combatLog??[]).filter(e=>(e.cityId??e.targetId)===city.cityId&&e.captureLine&&s.armies[e.attackerId]?.factionId===v.factionId).map(e=>e.sequence));
 const boundary=Math.max(ownCapture,Number(captureSequence??0));
 return (s.combatLog??[]).filter(e=>(e.cityId??e.targetId)===city.cityId&&['CITY','TACTIC','TACTIC_EFFECT'].includes(e.kind)&&e.turn>=s.turn-sinceTurns&&e.turn<=s.turn&&e.sequence>boundary&&(!record||captureSequence!==undefined||e.turn>captureTurn)&&s.armies[e.attackerId]?.factionId&&s.armies[e.attackerId].factionId!==v.factionId);
}
function referenceDefensePlan(s,v,plan,{remember,ranking}){
 if(remember)strategyMemory(s,v,true);
 const units=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a)&&a.morale!=='ROUTING'),limit=units.length-Math.ceil(units.length*AI_MIN_ATTACK_SHARE),assigned=new Set(),orders=new Map(),quotas=[];
 const posture=campaignAiPosture(s,v,ranking),foes=Object.values(v.knowledge.observedArmies),majors=Object.values(v.ownCities).filter(c=>strategyCityKind(s,c)==='major');
 const priority=city=>strategyCityKind(s,city)==='minor'?2:city.cityId===v.faction.capitalCityId||majors.length===1?0:1;
 const threats=Object.values(v.ownCities).map(city=>{
  const enemies=foes.filter(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=3);
  const recent=campaignOwnedCityHits(s,v,city).length>0;
  const local=units.filter(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=2).reduce((n,a)=>n+a.troopCount,0);
  return {city,enemies,recent,local,need:enemies.reduce((n,a)=>n+(a.troopCount??0),0)};
 }).filter(x=>x.enemies.length||x.recent).sort((a,b)=>priority(a.city)-priority(b.city)||a.local-b.local||b.need-a.need||a.city.cityId.localeCompare(b.city.cityId));
 const lastMajor=majors.length===1?majors[0]:null;
 const gateFoes=lastMajor?foes.filter(a=>lastMajor.footprint.gates.includes(a.tileId)):[];
 // One actual emergency return, before the ordinary bounded defense quota.
 if(lastMajor&&(campaignOwnedCityHits(s,v,lastMajor,1).length||gateFoes.length)){
  const near=Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&hexDistance(t,v.tiles[lastMajor.tileId])<=1).map(t=>t.tileId);
  const choices=units.filter(a=>!withdrawalProtection(s,a.armyId)&&!injuryReason(s,a.commanderId)).map(a=>{
   const gate=gateFoes.find(e=>attackTargets(s,a.armyId).includes(e.armyId)),routes=near.map(id=>publicRoute(s,v,a.armyId,id)).filter(Boolean).filter(r=>defenseReturnTurns(s,v,a,r)<=2).sort((a,b)=>a.totalTicks-b.totalTicks||a.pathTileIds.at(-1).localeCompare(b.pathTileIds.at(-1)));
   return {a,route:routes[0],gate};
  }).filter(x=>x.route).sort((a,b)=>a.route.totalTicks-b.route.totalTicks||a.a.armyId.localeCompare(b.a.armyId));
  const selected=choices[0],c=selected&&plan.candidates.find(c=>c.armyId===selected.a.armyId);
  if(c){const {a,route,gate}=selected;assigned.add(a.armyId);orders.set(a.armyId,gate?{...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'R11_GATE_CONTACT',defendCityId:lastMajor.cityId,aiCityDefensePriority:true,aiDefendArmyId:gate.armyId}:strategyMove(s,v,c,route,'R11_CAPITAL_RETURN',{defendCityId:lastMajor.cityId,aiCityDefensePriority:true,aiReferenceMove:true}));quotas.push({cityId:lastMajor.cityId,need:0,filled:a.troopCount,urgent:true,armyId:a.armyId});}
 }
 for(const {city,enemies,need,recent,local} of threats){
  // An already resident capital defender is not sent to a threatened minor.
  if(priority(city)===0&&!orders.size){const guard=units.filter(a=>!assigned.has(a.armyId)&&hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])<=1&&!withdrawalProtection(s,a.armyId)).sort((a,b)=>a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId))[0],c=guard&&plan.candidates.find(c=>c.armyId===guard.armyId);if(c){assigned.add(guard.armyId);orders.set(guard.armyId,{...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'R11_CAPITAL_DEFENDER',defendCityId:city.cityId,aiCityDefensePriority:true});quotas.push({cityId:city.cityId,need,filled:guard.troopCount,recent,resident:true});}}
  if(assigned.size>=limit)break;
  if(enemies.length&&local/Math.max(1,need)>=posture.startRatio&&units.some(a=>attackTargets(s,a.armyId).some(id=>enemies.some(b=>b.armyId===id)))){quotas.push({cityId:city.cityId,need,filled:0,counter:true});continue;}
  const enemy=enemies.sort((a,b)=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])-hexDistance(v.tiles[b.tileId],v.tiles[city.tileId]))[0];
  const tiles=Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&hexDistance(t,v.tiles[city.tileId])>=1&&hexDistance(t,v.tiles[city.tileId])<=2).sort((a,b)=>(enemy?hexDistance(a,v.tiles[enemy.tileId])-hexDistance(b,v.tiles[enemy.tileId]):0)||a.tileId.localeCompare(b.tileId));
  const choices=units.filter(a=>!assigned.has(a.armyId)&&!withdrawalProtection(s,a.armyId)).map(a=>{
   const routes=tiles.map(t=>publicRoute(s,v,a.armyId,t.tileId)).filter(Boolean).filter(r=>r.totalTicks<=s.time.ticksPerTurn*2);
   const route=routes.sort((x,y)=>(enemy?hexDistance(v.tiles[x.pathTileIds.at(-1)],v.tiles[enemy.tileId])-hexDistance(v.tiles[y.pathTileIds.at(-1)],v.tiles[enemy.tileId]):0)||x.totalTicks-y.totalTicks)[0]??publicRoute(s,v,a.armyId,city.tileId);
   return {a,route};
  }).filter(x=>x.route).sort((a,b)=>Number(parentTroop(a.a.troopType)==='cavalry')-Number(parentTroop(b.a.troopType)==='cavalry')||a.route.totalTicks-b.route.totalTicks||a.a.troopCount-b.a.troopCount);
  let filled=0;
  for(const {a,route} of choices){if(assigned.size>=limit||filled>=Math.max(1,need))break;const c=plan.candidates.find(c=>c.armyId===a.armyId);if(!c)continue;assigned.add(a.armyId);filled+=a.troopCount;orders.set(a.armyId,strategyMove(s,v,c,route,'INTERCEPT_CITY',{defendCityId:city.cityId}));}
  quotas.push({cityId:city.cityId,need,filled,recent,reserveTroops:city.reserveTroops??0});
 }
 plan.candidates=plan.candidates.map(c=>orders.get(c.armyId)??c);plan.defense={maxAssigned:Math.max(limit,orders.size?1:0),assignedArmyIds:[...assigned],quotas,priorityOrders:[...orders.values()].filter(c=>c.aiCityDefensePriority)};return plan;
}
export function campaignStrategyTargets(s,v,candidates,{ranking=campaignKnownRanking(s,v),memory=s.aiStrategy?.[v.factionId],turnLimit=26}={}){
 const ownRank=ranking.findIndex(r=>r.factionId===v.factionId),leader=ranking[0],self=ranking[ownRank],remaining=Math.max(0,turnLimit-s.turn+1),probe=strategyPublicWorld(s,v);
 const result=[];
 for(const city of Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId!==v.factionId)){
  const routes=new Map();
  for(const c of candidates){const a=v.ownArmies[c.armyId];if(!a||!castleArmyActive(s,a)||a.morale==='ROUTING'||c.reasonCode==='INTERCEPT_CITY')continue;
   routes.set(a.armyId,campaignSiegePositions(s,v,a,city,{capability:true}).map(g=>({g,route:publicRoute(s,v,a.armyId,g)})).filter(x=>x.route).sort((a,b)=>a.route.totalTicks-b.route.totalTicks||a.g.localeCompare(b.g)));
  }
  let force=Object.values(v.ownArmies).filter(a=>routes.get(a.armyId)?.length);
  if(campaignAiRule(s,v.factionId,1)){const near=force.filter(a=>routes.get(a.armyId)[0].route.totalTicks<=s.time.ticksPerTurn*AI_RULE_GATHER_TURNS);if(near.length)force=near;}
  const troops=force.reduce((n,a)=>n+a.troopCount,0),defense=campaignCityDefense(s,v,city),durability=s.castleKnowledge?.[v.factionId]?.[city.cityId]?.durability??100;
  if(!force.length){result.push({city,score:0,unreachable:true,routes});continue;}
  const travel=Math.max(...force.map(a=>Math.ceil(routes.get(a.armyId)[0].route.totalTicks/s.time.ticksPerTurn)));
  const damage=force.reduce((n,a)=>n+Math.max(1,Math.round(a.troopCount*.1*(50+s.officers[a.commanderId].baseStats.might*.5+s.officers[a.commanderId].baseStats.leadership*.3)/100*(a.morale==='SHAKEN'?.8:1))),0);
  const siege=Math.max(1,Math.ceil(durability/damage)),posture=campaignAiPosture(s,v,ranking,turnLimit),gather=campaignAiRule(s,v.factionId,5)&&troops/Math.max(1,defense)<posture.startRatio?Math.min(AI_RULE_GATHER_TURNS,Math.max(0,travel-1)):0,totalTurns=travel+siege+gather;
  // No useful capture can finish past the deadline. Late estimates add a
  // field-clearance turn for observed defenders, tightening feasibility.
  if(totalTurns+(remaining<=AI_LATE_TURNS&&defense>0?1:0)>remaining)continue;
  const ready=siegeForceReady(s,force,durability),chance=Math.min(1,troops/Math.max(1,defense+durability))*(ready?1:AI_UNREADY_CHANCE);
  let supplied=0;
  for(const a of force){const {g}=routes.get(a.armyId)[0],link=supplyEnabled(s)?supplyLink(probe,a,g):null,carried=armyFoodPerTurn(a,s)?(a.supplyFood??0)/armyFoodPerTurn(a,s):0;
   const stock=link?.source?.city?Math.max(0,link.source.city.foodStock-(link.source.city.reservedResources?.food??0)-link.source.city.population*2):(link?.source?.hub?.stock??0);
   if(!link||link.state==='SAFE'&&(clockFood(s)||stock>=armyFoodPerTurn(a,s)*totalTurns)||carried*(link.state==='DISRUPTED'?2:1)>=totalTurns||clockFood(s)&&carried>0&&siege<=carried&&city.ownerFactionId===null)supplied+=a.troopCount;
  }
  const supplyRatio=supplied/Math.max(1,troops),supplyCost=1+(1-supplyRatio)*totalTurns;
  const major=strategyCityKind(s,city)==='major',hypothetical=structuredClone(ranking);
  const me=hypothetical.find(r=>r.factionId===v.factionId),owner=hypothetical.find(r=>r.factionId===city.ownerFactionId),key=major?'majorCities':'minorCities';
  me[key]++;me.cities++;if(owner){owner[key]--;owner.cities--;}
  const nextRank=sortKnownRanking(s,hypothetical).findIndex(r=>r.factionId===v.factionId),gain=Math.max(0,ownRank-nextRank);
  const critical=major&&(self.majorCities>=2||owner?.majorCities>=1&&ranking.find(r=>r.factionId===city.ownerFactionId)?.majorCities>=2);
  // Neutral minor-city population 1 / stock 20 is the public scenario setup;
  // no current enemy stock or production is read. Other holdings get no stock guess.
  const hungry=supplyEnabled(s)&&campaignFoodEconomyEnabled(s,v.factionId)&&Object.values(v.ownArmies).some(a=>a.supplyStarving||a.supplyFood<armyFoodPerTurn(a,s)*AI_ECONOMY_SORTIE_TURNS);
  const neutralFood=hungry&&city.ownerFactionId===null&&!major?campaignAiNeutralFood(s,v.factionId,city.cityId,AI_ECONOMY_RECRUIT_TURNS):null;
  const foodGain=neutralFood?.gain??0;
  const foodValue=foodGain*AI_ECONOMY_CITY_FOOD_VALUE;
  const rule10=campaignAiRule(s,v.factionId,10),canBreak=chance>=.5&&siege<=remaining;
  const coalitionPenalty=rule10&&leader?.majorCities>=2&&city.ownerFactionId&&city.ownerFactionId!==leader.factionId&&v.factionId!==leader.factionId?.5:1;
  const value=((major?AI_MAJOR_CITY_VALUE:1)+gain*AI_RANK_GAIN_VALUE+(leader?.factionId===city.ownerFactionId&&(!rule10||canBreak)?AI_LEADER_CITY_VALUE:0)+(critical&&(!rule10||canBreak)?AI_THREE_MAJOR_VALUE:0)+foodValue)*coalitionPenalty;
  const lateGain=ownRank>0?1+gain*(1-remaining/Math.max(1,turnLimit)):1;
  const deferred=s.aiSiege?.[v.factionId]?.deferred?.[city.cityId]>s.turn;
  const carriedDeadline=!campaignAiRule(s,v.factionId,5)||!supplyEnabled(s)||!clockFood(s)||force.some(a=>(a.supplyFood??0)/Math.max(1,armyFoodPerTurn(a,s))>=siege+gather);
  const bonus=campaignAiRule(s,v.factionId,8)&&city.cityId===memory?.targetCityId?1+AI_RULE_GOAL_BONUS:1;
  const score=carriedDeadline?value*chance*lateGain*bonus/(1+travel+siege+gather+supplyCost)*(deferred?AI_DEFERRED_SCORE_FACTOR:1):0;
  result.push({city,score,value,foodGain,foodValue,neutralFood,chance,travelTurns:travel,siegeTurns:siege,gatherTurns:gather,supplyRatio,rankGain:gain,critical:!!critical,deferred,routes});
 }
 result.sort((a,b)=>b.score-a.score||a.city.cityId.localeCompare(b.city.cityId));
 const committed=result.find(r=>r.city.cityId===memory?.targetCityId&&!r.deferred),best=result[0];
 const rule8=campaignAiRule(s,v.factionId,8),power=Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0),event=memory?.ownerFactionId!==undefined&&memory.ownerFactionId!==committed?.city.ownerFactionId||memory?.power>power*2||committed?.unreachable;
 if(committed&&best&&(rule8?committed.score>0&&!event&&s.turn-memory.chosenTurn<AI_RULE_REVIEW_TURNS:s.turn-memory.chosenTurn<AI_GOAL_COMMIT_TURNS&&!(!committed.critical&&best.critical)&&best.score<committed.score*AI_GOAL_SWITCH_RATIO))result.splice(result.indexOf(committed),1),result.unshift(committed);
 return result;
}

// Only own units and public castle/army observations enter hypothetical combat.
// A spent action is reset: this asks whether the position can support a future
// attack, without changing troop rules, temporary disabilities or known guards.
function siegePublicWorld(s,v,army){
 const cities=Object.fromEntries(Object.values({...v.knowledge.cities,...v.ownCities}).flatMap(c=>{
  const castle=s.castleKnowledge?.[v.factionId]?.[c.cityId];
  return castle?[[c.cityId,{...c,...castle}]]:[];
 }));
 const armies=Object.fromEntries(Object.values({...v.knowledge.observedArmies,...v.ownArmies}).map(a=>[a.armyId,{...a,troopCount:a.troopCount??1,hp:a.hp??1}]));
 armies[army.armyId]={...army,mainActionTurn:0,mainActionCount:0};
 const active=Object.fromEntries(Object.keys(armies).map(id=>[id,{disposition:'ACTIVE'}]));
 return {...s,tiles:v.tiles,cities,armies,endedArmyIds:[],campaignTerminalWorld:{armiesById:active}};
}
export function campaignSiegePositions(s,v,army,city,{capability=false}={}){
 const probe=siegePublicWorld(s,v,army),c=probe.cities[city.cityId];
 if(!c)return [];
 // Muster capability ignores guards (the field planner must clear them first).
 // Actual approach selection retains every publicly observed blocker.
 if(capability)probe.armies={[army.armyId]:probe.armies[army.armyId]};
 const positions=Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&hexDistance(t,v.tiles[c.tileId])<=2&&t.tileId!==c.tileId);
 return positions.filter(t=>{
  probe.armies[army.armyId].tileId=t.tileId;
  return cityAttackTargets(probe,army.armyId).includes(c.cityId);
 }).map(t=>t.tileId);
}
function rememberSiege(s,v){
 const previous=s.aiSiege?.[v.factionId];
 if(previous?.lastTurn===s.turn)return previous;
 const memory=previous??{targetCityId:null,history:[],stalledTurns:0,deferred:{}};
 memory.deferred=Object.fromEntries(Object.entries(memory.deferred).filter(([id,until])=>until>s.turn&&v.knowledge.cities[id]&&v.knowledge.cities[id].ownerFactionId!==v.factionId));
 const city=v.knowledge.cities[memory.targetCityId],units=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a));
 if(city){
  const distance=Math.min(...units.map(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId]))),durability=s.castleKnowledge?.[v.factionId]?.[city.cityId]?.durability??100;
  const progress=durability<memory.durability;
  const signature=units.sort((a,b)=>a.armyId.localeCompare(b.armyId)).map(a=>`${a.armyId}:${a.tileId}`).join('|');
  if(progress){memory.history=[];memory.stalledTurns=0;}
  else memory.stalledTurns=distance<memory.distance?0:memory.stalledTurns+1;
  memory.history.push(signature);memory.history=memory.history.slice(-AI_SIEGE_HISTORY_LIMIT);
  const repeated=signature&&memory.history.filter(x=>x===signature).length>=AI_SIEGE_REPEAT_VISITS;
  const locked=campaignAiRule(s,v.factionId,8)&&s.turn-(s.aiStrategy?.[v.factionId]?.chosenTurn??0)<AI_RULE_REVIEW_TURNS;
  const rule8=campaignAiRule(s,v.factionId,8),stall=rule8?(s.trialRules?.aiRuleStallTurns??AI_RULE_STALL_TURNS):AI_SIEGE_STALL_TURNS;
  if(!locked&&(memory.stalledTurns>=stall||!rule8&&repeated)){if(rule8&&!memory.reducedRetry){memory.reducedRetry=true;memory.stalledTurns=0;}else memory.deferred[city.cityId]=s.turn+AI_SIEGE_COOLDOWN_TURNS;}
  memory.distance=distance;memory.durability=durability;
 }
 memory.lastTurn=s.turn;(s.aiSiege??={})[v.factionId]=memory;return memory;
}
function executableCastleTargets(s,v,plan,{remember=false,ranking,turnLimit=26}={}){
 const memory=remember?rememberSiege(s,v):s.aiSiege?.[v.factionId];
 const strategic=campaignStrategyEnabled(s,v.factionId);
 const ranked=strategic?campaignStrategyTargets(s,v,plan.candidates,{ranking,turnLimit}):Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId!==v.factionId&&!(memory?.deferred?.[c.cityId]>s.turn)).map(city=>({city,score:campaignCityTargetScore(s,v,city)})).sort((a,b)=>b.score-a.score||a.city.cityId.localeCompare(b.city.cityId));
 if(strategic)plan.strategy={ranking,remainingTurns:Math.max(0,turnLimit-s.turn+1),targets:ranked.map(({routes,...r})=>({...r,cityId:r.city.cityId,city:undefined})).map(({city,...r})=>r)};
 if(strategic&&remember&&memory)for(const r of ranked)if(r.unreachable)memory.deferred[r.city.cityId]=s.turn+AI_SIEGE_COOLDOWN_TURNS;
 const retryCity=memory?.targetCityId&&v.knowledge.cities[memory.targetCityId],shortlist=campaignAiRule(s,v.factionId,8)&&memory?.deferred?.[memory.targetCityId]>s.turn&&retryCity?ranked.filter(r=>r.city.cityId!==memory.targetCityId).sort((a,b)=>hexDistance(v.tiles[a.city.tileId],v.tiles[retryCity.tileId])-hexDistance(v.tiles[b.city.tileId],v.tiles[retryCity.tileId])).slice(0,2):ranked;
 for(const {city} of shortlist){
  const routes=new Map();
  for(const c of plan.candidates){
   const a=v.ownArmies[c.armyId];if(!a||!castleArmyActive(s,a)||strategic&&(c.reasonCode==='INTERCEPT_CITY'||c.defendCityId))continue;
   routes.set(a.armyId,campaignSiegePositions(s,v,a,city).map(g=>({g,route:publicRoute(s,v,a.armyId,g)})).filter(x=>x.route).sort((a,b)=>a.route.totalTicks-b.route.totalTicks||a.g.localeCompare(b.g)));
  }
  if(![...routes.values()].some(r=>r.length)){
   // No legal arrival or no known path: immediately evaluate the next castle.
   if(remember&&memory)memory.deferred[city.cityId]=s.turn+AI_SIEGE_COOLDOWN_TURNS;
   continue;
  }
  if(campaignAiRule(s,v.factionId,8)&&memory?.reducedRetry&&memory.targetCityId===city.cityId){const ids=[...routes].filter(([,r])=>r.length).sort((a,b)=>a[1][0].route.totalTicks-b[1][0].route.totalTicks).slice(0,Math.max(1,Math.ceil([...routes.values()].filter(r=>r.length).length/2))).map(([id])=>id);for(const id of routes.keys())if(!ids.includes(id))routes.delete(id);}
  const reserved=new Set();
  plan.candidates=plan.candidates.sort((a,b)=>(v.ownArmies[b.armyId]?.troopCount??0)-(v.ownArmies[a.armyId]?.troopCount??0)||a.armyId.localeCompare(b.armyId)).map(c=>{
   const a=v.ownArmies[c.armyId],choice=routes.get(c.armyId)?.find(x=>!reserved.has(x.g));
   // Keep the original field/scouting action for units without a siege attack.
   if(!choice)return c;
   if(choice.route.totalTicks<=s.time.ticksPerTurn)reserved.add(choice.g);
   const hostile=Object.values(v.knowledge.observedArmies).find(b=>b.tileId===choice.g);
   if(hostile&&hexDistance(v.tiles[a.tileId],v.tiles[choice.g])<=attackRange(s.armies[a.armyId],s))return {...c,type:'BASIC_ATTACK',targetArmyId:hostile.armyId,destinationTileId:null,pathTileIds:[]};
   const movement=campaignMovementWorld(s,a.armyId);let ticks=0,path=[a.tileId];
   for(const to of choice.route.pathTileIds.slice(1)){const cost=edgeTicks(movement,movement.armies[a.armyId],path.at(-1),to);if(ticks+cost>s.time.ticksPerTurn)break;ticks+=cost;path.push(to);}
   return {...c,type:path.length>1?'MOVE':'HOLD',targetArmyId:null,destinationTileId:path.length>1?path.at(-1):null,pathTileIds:path,reasonCode:'OCCUPY_CASTLE_GATE',...(campaignAiRulesEnabled(s,v.factionId)?{aiTargetCityId:city.cityId}:{})};
  });
  plan.goal={...plan.goal,targetCityId:city.cityId,targetTileId:[...routes.values()].find(r=>r.length)[0].g};
  if(strategic&&remember){const m=s.aiStrategy[v.factionId];if(m.targetCityId!==city.cityId){m.targetCityId=city.cityId;m.chosenTurn=s.turn;if(campaignAiRule(s,v.factionId,8)){m.reviewTurn=s.turn;m.ownerFactionId=city.ownerFactionId;m.power=Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0);}}if(campaignAiRule(s,v.factionId,8)&&(!m.reviewTurn||s.turn-m.reviewTurn>=AI_RULE_REVIEW_TURNS)){m.reviewTurn=s.turn;m.ownerFactionId=city.ownerFactionId;m.power=Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0);}}
  if(remember&&memory&&memory.targetCityId!==city.cityId){memory.targetCityId=city.cityId;memory.history=[];memory.stalledTurns=0;delete memory.reducedRetry;memory.distance=Infinity;memory.durability=s.castleKnowledge[v.factionId][city.cityId].durability??100;}
  // Infinity never enters the optional, JSON-serializable memory.
  if(remember&&memory)memory.distance=Math.min(...Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a)).map(a=>hexDistance(v.tiles[a.tileId],v.tiles[city.tileId])));
  return plan;
 }
 if(remember&&memory){memory.targetCityId=null;memory.history=[];memory.stalledTurns=0;delete memory.distance;delete memory.durability;}
 return plan;
}

export function campaignAiSupplyWorld(s,factionId){return strategyPublicWorld(s,campaignBannerView(s,getFactionView(s,factionId)));}

export function campaignAiMilitaryReport(s,factionId){
 const plan=campaignAiPlan(s,factionId,{remember:false}),reasons={};
 for(const c of plan?.candidates??[]){const code=c.type==='HOLD'?c.reasonCode??'NO_ORDER':null;if(code)reasons[code]=(reasons[code]??0)+1;}
 for(const [key,n] of Object.entries(plan?.military?.reasons??{}))reasons[key]=(reasons[key]??0)+n;
 for(const [key,n] of Object.entries(plan?.defense?.reasons??{}))reasons[key]=(reasons[key]??0)+n;
 return {turn:s.turn,factionId,reasons,posture:plan?.military?.posture??null,groups:plan?.military?.groups??[],targetCityId:plan?.goal?.targetCityId??null};
}

export function campaignAiPlan(world, factionId, {remember=false,turnLimit=26}={}) {
  const v=campaignBannerView(world,getFactionView(world,factionId)),cities=Object.values(v.ownCities);
  const strategic=campaignStrategyEnabled(world,factionId),ranking=strategic?campaignKnownRanking(world,v):null;
  v.knowledge.observedArmies=Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([,a])=>diplomacyHostile(world,factionId,a.factionId)&&!withdrawalProtection(world,a.armyId)));
  v.knowledge.cities=Object.fromEntries(Object.entries(v.knowledge.cities).filter(([,c])=>c.ownerFactionId===factionId||diplomacyHostile(world,factionId,c.ownerFactionId)));
  if(!v.faction.alive||!Object.keys(v.ownArmies).length)return null;
  // A faction which lost its last city still takes its remaining actions this turn.
  if(!cities.length)return diplomacyWithdrawalPlan(world,supplyAiPlan(world,v,c31AiPlan(world,v,campaignCitylessPlan(world,v))));
  const capital=cities.find(c=>c.cityId===v.faction.capitalCityId)??cities[0];
  const plan=planFirst3StrategicAi({format:'first3-strategic-ai-public-snapshot',version:1,
    planningBoundaryId:`TURN-${world.turnNumber}`,factionId,turnNumber:world.turnNumber,
    supplyStatus:'NOT_AVAILABLE',capitalCityId:capital.cityId,
    ownCities:cities.map(c=>({cityId:c.cityId,tileId:c.tileId,isCapital:c.cityId===capital.cityId})),
    ownArmies:Object.values(v.ownArmies).map(a=>({armyId:a.armyId,tileId:a.tileId,
      troopType:parentTroop(a.troopType),movementClass:parentTroop(a.troopType)==='cavalry'?'cavalry':a.troopType==='engineer'?'engineer':'normal',
      status:'ACTIVE',canBasicAttack:true,canRangedVolley:false,basicAttackRange:attackRange(world.armies[a.armyId],world),rangedVolleyRange:0,
      moveBudgetTicks:world.time.ticksPerTurn})),
    observedEnemies:Object.values(v.knowledge.observedArmies).filter(a=>!Object.values(v.knowledge.observedArmies).some(b=>c22TargetWeight(world,factionId,b.factionId)>0)||c22TargetWeight(world,factionId,a.factionId)>0).map(a=>({armyId:a.armyId,
      factionId:a.factionId,tileId:a.tileId,troopType:parentTroop(a.troopType)})),
    tiles:Object.values(v.tiles).map(t=>({...t,knowledge:v.knowledge.tiles[t.tileId]})),
    edges:v.knownEdges,
    frontierTileIds:Object.keys(v.tiles).filter(id=>v.knowledge.tiles[id]!=='UNEXPLORED'&&
      neighbors(v.tiles[id]).some(p=>v.knowledge.tiles[tileId(p)]==='UNEXPLORED')),
    failedAttackLedger:[]});
  if(strategic)campaignDefensePlan(world,v,plan,{remember,ranking});
  const result=castleTargets(world,v,plan,{remember,ranking,turnLimit});
  // Guarded castles may have no legal city attack yet. Keep the original
  // public defense/replenishment comparison without assigning a siege march.
  const targetCity=v.knowledge.cities[result.goal.targetCityId]??(!strategic&&campaignSiegeEnabled(world,factionId)?Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId!==factionId&&world.castleKnowledge?.[factionId]?.[c.cityId]).sort((a,b)=>campaignCityTargetScore(world,v,b)-campaignCityTargetScore(world,v,a)||a.cityId.localeCompare(b.cityId))[0]:null);
  const targetDefense=targetCity?campaignCityDefense(world,v,targetCity):0;
  const deployed=Object.values(v.ownArmies).filter(a=>castleArmyActive(world,a)&&(!campaignSiegeEnabled(world,v.factionId)||!targetCity||campaignSiegePositions(world,v,a,targetCity,{capability:true}).length));
  const durability=targetCity?(world.castleKnowledge?.[factionId]?.[targetCity.cityId]?.durability??100):0;
  const muster=!strategic&&targetCity&&(!campaignSiegeEnabled(world,v.factionId)||deployed.length>0)&&!siegeForceReady(world,deployed,durability);
  const reserved=new Set();
  result.candidates=result.candidates.map(candidate=>{
    if(strategic&&(candidate.reasonCode==='INTERCEPT_CITY'||candidate.defendCityId))return candidate;
    const unit=v.ownArmies[candidate.armyId],formation=world.personnel.formations.find(f=>f.formationId===candidate.armyId);
    // Keep an underway siege when no field opponent is publicly observed.
    // Hidden armies remain unknown; this is a commitment policy, not proof of safety.
    const sieging=cityAttackTargets(world,unit.armyId).length>0;
    const fieldOpposition=targetCity&&Object.values(v.knowledge.observedArmies).some(a=>a.factionId===targetCity.ownerFactionId&&world.armies[a.armyId].troopCount>0);
    if(!campaignAiRule(world,factionId,4)&&((!sieging&&muster)||(!(sieging&&!fieldOpposition)&&(unit.troopCount<formation.targetStrength*.5||unit.troopCount<targetDefense*.5)))){
      const routes=cities.filter(c=>cityOccupationStatus(world,c)==='NORMAL'&&(!strategic||!supplyEnabled(world)||supplyLink(strategyPublicWorld(world,v),unit,c.tileId).state==='SAFE')).map(c=>({c,route:publicRoute(world,v,unit.armyId,c.tileId)})).filter(x=>x.route).sort((a,b)=>a.route.totalTicks-b.route.totalTicks||a.c.cityId.localeCompare(b.c.cityId));
      const home=routes[0];
      // At an empty supply city, request recruitment but do not camp indefinitely.
      const emptyAtHome=home&&hexDistance(v.tiles[unit.tileId],v.tiles[home.c.tileId])<=2&&home.c.reserveTroops===0;

      const rates=home&&cityEconomyRates(world,world.cities[home.c.cityId]);
      const mobilization=campaignMobilization(world,factionId);
      const productive=home&&cityOccupationStatus(world,home.c)==='NORMAL'&&mobilization.used+500<=mobilization.capacity&&(clockFood(world)||home.c.foodStock-home.c.reservedResources.food+rates.food>=campaignFoodNeed(world,home.c));
      if(home&&(!emptyAtHome||muster&&productive)){const movement=campaignMovementWorld(world,unit.armyId);let ticks=0,path=[unit.tileId];for(const to of home.route.pathTileIds.slice(1)){const cost=edgeTicks(movement,movement.armies[unit.armyId],path.at(-1),to);if(ticks+cost>world.time.ticksPerTurn)break;ticks+=cost;path.push(to);}
        return {...candidate,type:path.length>1?'MOVE':'HOLD',destinationTileId:path.at(-1),pathTileIds:path,reasonCode:muster?'MUSTER_SIEGE':'REPLENISH_ARMY'};
      }
    }
    if(cityAttackTargets(world,candidate.armyId).length)return {...candidate,type:'HOLD',destinationTileId:null,pathTileIds:[]};
    const a=v.ownArmies[candidate.armyId];
    const home=!strategic&&cities.find(c=>c.durability< c.durabilityMax*.5&&hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])<=5&&!reserved.has(c.cityId)&&!Object.values(v.ownArmies).some(d=>d.tileId===c.tileId));
    const route=home&&publicRoute(world,v,a.armyId,home.tileId);
    if(!route||route.totalTicks>world.time.ticksPerTurn)return candidate;
    reserved.add(home.cityId);return {...candidate,type:'MOVE',destinationTileId:home.tileId,pathTileIds:route.pathTileIds,reasonCode:'DEFEND_DAMAGED_CITY'};
  });
  const defenders=Object.values(v.ownArmies).filter(a=>castleArmyActive(world,a)&&[capital.tileId,...(capital.footprint?.gates??world.cities[capital.cityId].footprint.gates)].includes(a.tileId)).sort((a,b)=>a.troopCount-b.troopCount||b.armyId.localeCompare(a.armyId));
  // Keep one existing capital garrison; it may attack without leaving its tile.
  const deployable=Object.values(v.ownArmies).filter(a=>castleArmyActive(world,a));
  if(!strategic&&deployable.length>=2&&defenders.length&&(!targetCity||siegeForceReady(world,(campaignSiegeEnabled(world,v.factionId)?deployed:deployable).filter(a=>a.armyId!==defenders[0].armyId),durability))){const id=defenders[0].armyId;result.candidates=result.candidates.map(c=>c.armyId===id&&!['DEFEND_DAMAGED_CITY','REPLENISH_ARMY','MUSTER_SIEGE'].includes(c.reasonCode)?{...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'CAPITAL_GARRISON'}:c);}
  result.candidates.sort((a,b)=>(v.ownArmies[b.armyId]?.troopCount??0)-(v.ownArmies[a.armyId]?.troopCount??0)||a.armyId.localeCompare(b.armyId));
  const final=diplomacyWithdrawalPlan(world,supplyAiPlan(world,v,stopAtPublicControlZone(v,explorationAiPlan(world,v,c31AiPlan(world,v,preferCampaignCover(world,v,result))))));
  const supplyWorld=strategyPublicWorld(world,v);
  let publicCombat;const combatBoard=()=>publicCombat??=campaignTacticsWorld(world,campaignTacticsView(world,factionId));
  if(campaignAiRulesEnabled(world,factionId))campaignReferencePlan(world,v,final,{remember,ranking,turnLimit,api:{route:publicRoute,positions:campaignSiegePositions,move:strategyMove,active:castleArmyActive,cityTargets:cityAttackTargets,attackTargets,goodAttack:id=>attackTargets(world,id).some(t=>{const p=previewAttack(combatBoard(),id,t);return p.enemyLoss>=p.allyLoss*campaignAiPosture(world,v,ranking,turnLimit).lossWeight;}),side:(id,target,to)=>{const w=combatBoard();return attackDirection({...w,armies:{...w.armies,[id]:{...w.armies[id],tileId:to}}},id,target);},reachable:(s,id,ticks)=>campaignReachable(supplyWorld,id,ticks),supplyTurns:a=>(a.supplyFood??0)/Math.max(1,armyFoodPerTurn(a,world)),moveAllowed:(id,t)=>supplyAiMoveAllowed(supplyWorld,id,t),hubs:supplyWorld.supply?.hubs}});
  if(campaignAiRule(world,factionId,11)){const priority=new Map((final.defense?.priorityOrders??[]).map(c=>[c.armyId,c]));final.candidates=final.candidates.map(c=>priority.get(c.armyId)??c);}
  if(campaignAiRule(world,factionId,13)){
   const defense=new Map((final.defense?.capitalOrders??[]).map(c=>[c.armyId,c]));final.candidates=final.candidates.map(c=>defense.get(c.armyId)??c);
   const empty=v.knowledge.cities[final.capitalCounterCityId];if(empty)final.candidates=final.candidates.map(c=>{if(c.defendCityId)return c;const a=v.ownArmies[c.armyId],route=campaignSiegePositions(world,v,a,empty,{capability:true}).map(id=>publicRoute(world,v,a.armyId,id)).filter(Boolean).sort((x,y)=>x.totalTicks-y.totalTicks)[0];return route?strategyMove(world,v,c,route,'R13_COUNTER_EMPTY_CITY',{aiTargetCityId:empty.cityId,aiReferenceMove:true}):c;});
  }
  if(!campaignTacticsEnabled(world,factionId))return final;
  campaignOperationPlan(world,v,final,{remember,turnLimit,route:publicRoute,siegePositions:campaignSiegePositions,siegeReady:siegeForceReady,supplyWorld});
  return campaignTacticalMoves(world,campaignTacticsView(world,factionId),final,{remember,supplyWorld});
}

export function supplyAiPlan(s,v,plan){
 if(!supplyEnabled(s))return plan;
 const suppliedWorld=clockFood(s)||campaignStrategyEnabled(s,v.factionId)||campaignFoodEconomyEnabled(s,v.factionId)?strategyPublicWorld(s,v):s;
 let hubAssigned=false;
 plan.candidates=plan.candidates.map(c=>{
  const a=s.armies[c.armyId];if(!a||a.morale==='ROUTING'||withdrawalProtection(s,a.armyId))return c;
  const reachable=campaignReachable(s,a.armyId,s.time.ticksPerTurn);
  if(clockFood(s)){
   const retreat=supplyAiAction(suppliedWorld,a.armyId,reachable,{publicWorld:suppliedWorld,allowBuild:false});
   if(retreat)return {...c,type:retreat.type==='MOVE'?'MOVE':'HOLD',destinationTileId:retreat.destinationTileId??null,pathTileIds:reachable.get(retreat.destinationTileId)?.pathTileIds??[],reasonCode:'CLOCK_RETREAT',aiSupplyOrder:true};
   if(!hubAssigned&&!c.aiCutHub&&!['CAPITAL_GARRISON','INTERCEPT_CITY','DEFEND_DAMAGED_CITY'].includes(c.reasonCode)){
    const hubs=(suppliedWorld.supply?.hubs??[]).filter(h=>v.knowledge.tiles[h.tileId]==='VISIBLE'&&diplomacyHostile(s,v.factionId,h.factionId)&&!Object.values(v.knowledge.observedArmies).some(b=>b.tileId===h.tileId&&b.factionId===h.factionId));
    const foes=Object.values(v.knowledge.observedArmies).filter(b=>diplomacyHostile(s,v.factionId,b.factionId)&&supplyLink(suppliedWorld,b).state!=='SAFE');
    const cuts=[...reachable].filter(([t])=>hubs.some(h=>h.tileId===t)||foes.some(b=>Object.values(v.knowledge.cities).some(home=>home.ownerFactionId===b.factionId&&hexDistance(s.tiles[b.tileId],s.tiles[t])+hexDistance(s.tiles[t],s.tiles[home.tileId])===hexDistance(s.tiles[b.tileId],s.tiles[home.tileId])&&hexDistance(s.tiles[t],s.tiles[b.tileId])>1)));
    cuts.sort(([x,p],[y,q])=>Number(hubs.some(h=>h.tileId===y))-Number(hubs.some(h=>h.tileId===x))||p.totalTicks-q.totalTicks||x.localeCompare(y));
    const cut=cuts.find(([t])=>t!==a.tileId&&supplyAiMoveAllowed(suppliedWorld,a.armyId,t));
    if(cut){hubAssigned=true;return {...c,type:'MOVE',destinationTileId:cut[0],pathTileIds:cut[1].pathTileIds,reasonCode:'CLOCK_CUT_SUPPLY',aiCutHub:true,aiSupplyOrder:true};}
   }
  }
  if(!hubAssigned&&plan.goal?.targetCityId&&!['REPLENISH_ARMY','MUSTER_SIEGE','DEFEND_DAMAGED_CITY','CAPITAL_GARRISON','INTERCEPT_CITY','EXPLORE_PLACE'].includes(c.reasonCode)){
   const site=supplyAiHubSite(suppliedWorld,a.armyId,reachable,plan.goal.targetCityId);
   if(site){hubAssigned=true;return {...c,type:'MOVE',destinationTileId:site,pathTileIds:site===a.tileId?[a.tileId]:reachable.get(site).pathTileIds,...(campaignTacticsEnabled(s,v.factionId)?{aiSupplyOrder:true}:{})};}
  }
  if(c.type!=='MOVE')return c;
  const target=v.ownCities[c.defendCityId]?.tileId??v.knowledge.observedArmies[c.crisisTargetArmyId??c.targetArmyId]?.tileId??v.knowledge.cities[c.crisisTargetCityId??plan.goal?.targetCityId]?.tileId??v.knowledge.observedArmies[plan.goal?.targetArmyId]?.tileId??c.destinationTileId;
  const speed=Math.max(1,Math.min(combatMovement(s,a.armyId).max,Math.floor(10/(s.mapRules.tuning?.byTroop?.[a.troopType]?.plain??(a.troopType==='cavalry'?1.25:2))))),route=publicRoute(s,v,a.armyId,target),allowed=(t,p)=>{
   const turns=1+(route?Math.max(Math.ceil(Math.max(0,route.totalTicks-p.totalTicks)/s.time.ticksPerTurn),Math.ceil(Math.max(0,route.pathTileIds.length-p.pathTileIds.length)/speed)):Math.ceil(hexDistance(s.tiles[t],s.tiles[target])/speed));
   return supplyAiMoveAllowed(suppliedWorld,a.armyId,t,{targetTileId:target,turnsToGoal:turns});
  };
  const proposed=reachable.get(c.destinationTileId);
  if(proposed&&allowed(c.destinationTileId,proposed))return c;
  const options=[...reachable].filter(([t,p])=>t!==a.tileId&&p.pathTileIds.every(id=>v.knowledge.tiles[id]!=='UNEXPLORED')).sort(([x,p],[y,q])=>hexDistance(s.tiles[x],s.tiles[target])-hexDistance(s.tiles[y],s.tiles[target])||p.totalTicks-q.totalTicks||x.localeCompare(y));
  const best=options.find(([t,p])=>allowed(t,p));return {...c,type:best?'MOVE':'HOLD',destinationTileId:best?.[0]??null,pathTileIds:best?.[1].pathTileIds??[],...(campaignTacticsEnabled(s,v.factionId)?{aiSupplyOrder:true}:{})};
 });return plan;
}

// Combat, supply and capital-garrison orders retain priority over exploration.
export function explorationAiPlan(s,v,plan){
 if(!explorationEnabled(s))return plan;
 const places=explorationView(s,v.factionId).places,reserved=new Set();
 plan.candidates=plan.candidates.map(c=>{
  const a=s.armies[c.armyId];
  if(!a||!castleArmyActive(s,a)||!['SCOUT_KNOWN_FRONTIER','NO_PUBLIC_ACTIONABLE_TARGET','FRONTIER_ALREADY_REACHED','FRONTIER_OUTSIDE_CURRENT_MOVE_BUDGET','OTHER_ARMY_ASSIGNED_TO_FACTION_GOAL'].includes(c.reasonCode)||plan.goal?.targetArmyId||plan.goal?.targetCityId||attackTargets(s,a.armyId).length||cityAttackTargets(s,a.armyId).length)return c;
  const options=places.filter(p=>!['RESOLVED','PENDING'].includes(p.status)&&!reserved.has(p.placeId)&&hexDistance(s.tiles[a.tileId],s.tiles[p.tileId])<=5&&!Object.values(v.knowledge.observedArmies).some(b=>hexDistance(s.tiles[b.tileId],s.tiles[p.tileId])<=1)).map(p=>({p,route:publicRoute(s,v,a.armyId,p.tileId)})).filter(x=>x.route).sort((x,y)=>x.route.totalTicks-y.route.totalTicks||x.p.placeId.localeCompare(y.p.placeId));
  const selected=options[0];if(!selected)return c;
  const movement=campaignMovementWorld(s,a.armyId);let ticks=0,path=[a.tileId];
  for(const to of selected.route.pathTileIds.slice(1)){const cost=edgeTicks(movement,a,path.at(-1),to);if(ticks+cost>s.time.ticksPerTurn)break;ticks+=cost;path.push(to);}
  reserved.add(selected.p.placeId);
  return {...c,type:path.length>1?'MOVE':'HOLD',destinationTileId:path.length>1?path.at(-1):null,pathTileIds:path,reasonCode:'EXPLORE_PLACE'};
 });return plan;
}

// The FIRST3 planner predates campaign ZOC. Trim its proposed march at the
// first publicly observed contact, so runtime can execute the legal prefix
// instead of rejecting a route whose later edge would leave that zone.
export function preferCampaignCover(world,v,plan){
  plan.candidates=plan.candidates.map(c=>{
    const a=world.armies[c.armyId];
    // A repair/defense destination is an order, not a replaceable approach.
    if(campaignSiegeEnabled(world,v.factionId)&&['REPLENISH_ARMY','MUSTER_SIEGE','DEFEND_DAMAGED_CITY','INTERCEPT_CITY'].includes(c.reasonCode))return c;
    if(c.type!=='MOVE'||attackTargets(world,a.armyId).length||!c.destinationTileId)return c;
    const goal=v.tiles[c.destinationTileId],opening=hexDistance(v.tiles[a.tileId],goal);
    const options=Object.values(v.tiles).filter(t=>['forest','hill'].includes(t.terrainType)&&v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&hexDistance(t,goal)<opening)
      .map(t=>({t,route:publicRoute(world,v,a.armyId,t.tileId)})).filter(x=>x.route&&x.route.totalTicks<=world.time.ticksPerTurn)
      .sort((x,y)=>hexDistance(x.t,goal)-hexDistance(y.t,goal)||x.route.totalTicks-y.route.totalTicks||x.t.tileId.localeCompare(y.t.tileId));
    const best=options[0];return best?{...c,destinationTileId:best.t.tileId,pathTileIds:best.route.pathTileIds}:c;
  });return plan;
}
function stopAtPublicControlZone(v,plan){
  const foes=Object.values(v.knowledge.observedArmies);
  plan.candidates=plan.candidates.map(c=>{
    if(c.type!=='MOVE')return c;
    const path=[c.pathTileIds[0]];
    for(const id of c.pathTileIds.slice(1)){
      path.push(id);
      if(foes.some(a=>hexDistance(v.tiles[id],v.tiles[a.tileId])===1))break;
    }
    return {...c,pathTileIds:path,destinationTileId:path.at(-1)};
  });
  return plan;
}


// Keep the existing public planner's faction goal. Only the approach tiles for
// an enemy castle are replaced, then converted through the existing path costs.
function castleTargets(world,v,plan,options={}) {
  if(campaignSiegeEnabled(world,v.factionId))return executableCastleTargets(world,v,plan,options);
  const enemy=v.knowledge.observedArmies[plan.goal.targetArmyId];
  const known=Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId!==v.factionId);
  const ranked=known.map(c=>({city:c,score:campaignCityTargetScore(world,v,c)})).sort((a,b)=>b.score-a.score||a.city.cityId.localeCompare(b.city.cityId));
  const city=ranked[0]?.city;
  if(!city)return plan;
  const castle=world.castleKnowledge[v.factionId]?.[city.cityId];
  if(!castle)return plan;
  const destinations=castle.footprint.gates,reserved=new Set();
  const approachTiles=id=>c24Enabled(world)&&world.armies[id].troopType==='catapult'?Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&['plain','forest','hill'].includes(t.terrainType)&&hexDistance(t,world.tiles[city.tileId])===2&&!Object.values(v.knowledge.observedArmies).some(e=>hexDistance(t,world.tiles[e.tileId])<=1)).map(t=>t.tileId):destinations;
  const approachCost=candidate=>Math.min(...approachTiles(candidate.armyId).filter(id=>v.knowledge.tiles[id]!=='UNEXPLORED').map(id=>publicRoute(world,v,candidate.armyId,id)?.totalTicks??Infinity));
  plan.candidates=plan.candidates.sort((a,b)=>(v.ownArmies[b.armyId]?.troopCount??0)-(v.ownArmies[a.armyId]?.troopCount??0)||approachCost(a)-approachCost(b)||a.armyId.localeCompare(b.armyId)).map(candidate=>{
    const army=v.ownArmies[candidate.armyId];
    if(!army||!castleArmyActive(world,army))return {...candidate,type:'HOLD',destinationTileId:null,pathTileIds:[]};
    const available=approachTiles(army.armyId).filter(g=>!reserved.has(g)&&v.knowledge.tiles[g]!=='UNEXPLORED');
    const routes=available.map(g=>({g,route:publicRoute(world,v,army.armyId,g)})).filter(x=>x.route)
      .sort((a,b)=>a.route.totalTicks-b.route.totalTicks||a.g.localeCompare(b.g));
    const selected=routes[0];
    if(!selected)return {...candidate,type:'HOLD',destinationTileId:null,pathTileIds:[]};
    if(selected.route.totalTicks<=world.time.ticksPerTurn)reserved.add(selected.g);
    const hostile=Object.values(v.knowledge.observedArmies).find(a=>a.tileId===selected.g);
    if(hostile&&hexDistance(v.tiles[army.tileId],v.tiles[selected.g])<=attackRange(world.armies[army.armyId],world))
      return {...candidate,type:'BASIC_ATTACK',targetArmyId:hostile.armyId,destinationTileId:null,pathTileIds:[]};
    const movement=campaignMovementWorld(world,army.armyId);let ticks=0,path=[army.tileId];
    for(const to of selected.route.pathTileIds.slice(1)){
      const cost=edgeTicks(movement,movement.armies[army.armyId],path.at(-1),to);
      if(ticks+cost>world.time.ticksPerTurn)break;
      ticks+=cost;path.push(to);
    }
    return {...candidate,type:path.length>1?'MOVE':'HOLD',targetArmyId:null,
      destinationTileId:path.length>1?path.at(-1):null,pathTileIds:path,
      reasonCode:'OCCUPY_CASTLE_GATE'};
  });
  plan.goal={...plan.goal,targetCityId:city.cityId,targetTileId:destinations[0]};
  return plan;
}

function publicRoute(world,v,armyId,destination){
  if(!world.armies[armyId]||!castleArmyActive(world,world.armies[armyId]))return null;
  // Restrict FIRST3 path search to observed geometry; hidden terrain is excluded.
  const knownCities=Object.values({...v.knowledge.cities,...v.ownCities}).filter(c=>world.castleKnowledge?.[v.factionId]?.[c.cityId]);
  const cities=Object.fromEntries(knownCities.map(c=>[c.cityId,{...c,...world.castleKnowledge[v.factionId][c.cityId]}]));
  const armies=Object.fromEntries(Object.values({...v.knowledge.observedArmies,...v.ownArmies}).map(a=>[a.armyId,{...a,troopCount:a.troopCount??1,hp:a.hp??1}]));
  const movement=campaignMovementWorld({...world,cities,armies},armyId);
  if(!world.tiles[destination]||v.knowledge.tiles[destination]==='UNEXPLORED'||!v.tiles[armies[armyId]?.tileId])return null;
  const path=findPath({...movement,tiles:Object.fromEntries(Object.entries(world.tiles).filter(([id])=>v.knowledge.tiles[id]!=='UNEXPLORED'))},armyId,destination);return path&&!path.pathTileIds.slice(1).some((to,i)=>diplomacyMoveReason(world,armyId,to,path.pathTileIds[i]))?path:null;
}

function campaignCitylessPlan(world,v){
  // No new strategic priority: continue the already selected castle goal, or
  // approach the first publicly known enemy castle when the capital is lost.
  const plan={goal:{targetArmyId:null},candidates:Object.values(v.ownArmies).map(a=>({armyId:a.armyId,type:'HOLD'}))};
  return stopAtPublicControlZone(v,castleTargets(world,v,plan));
}

export function campaignCityTargetScore(world,v,c){
 const distance=Math.min(...Object.values(v.ownArmies).map(a=>hexDistance(v.tiles[a.tileId],v.tiles[c.tileId])));
 const castle=world.castleKnowledge?.[v.factionId]?.[c.cityId];
 const defenders=campaignCityDefense(world,v,c);
 // Unknown defenders/durability/security receive neutral conservative trial values.
 const visible=v.knowledge.tiles[c.tileId]==='VISIBLE';
 const security=visible?(world.cities[c.cityId]?.securityLevel??0):0;
 return c22TargetWeight(world,v.factionId,c.ownerFactionId)+100-distance*5-defenders/100-(castle?.durability??100)/10+security*10;
}
export function campaignCityDefense(world,v,c){
 const castle=world.castleKnowledge?.[v.factionId]?.[c.cityId];
 return Object.values(v.knowledge.observedArmies).filter(a=>[c.tileId,...(castle?.footprint?.gates??[])].includes(a.tileId)).reduce((n,a)=>n+(a.troopCount??(campaignAiRule(world,v.factionId,7)?0:(v.knowledge.tiles[a.tileId]==='VISIBLE'?world.armies[a.armyId]?.troopCount:undefined)??1000)),0);
}
// Conservative sortie check: one castle shot per turn, weakest formation first.
// Use our stats and known durability only; ignore favorable tactic bonuses.
export function siegeForceReady(s,armies,durability){
 const force=armies.map(a=>({count:a.troopCount,factor:(50+s.officers[a.commanderId].baseStats.might*.5+s.officers[a.commanderId].baseStats.leadership*.3)/100*(a.morale==='SHAKEN'?.8:1)}));
 for(let rounds=0;rounds<Math.ceil(armies.reduce((n,a)=>n+a.troopCount,0)/20);rounds++){
  const victim=force.filter(a=>a.count>0).sort((a,b)=>a.count-b.count)[0];if(!victim)break;
  victim.count=Math.max(0,victim.count-20);
  durability-=force.filter(a=>a.count>0).reduce((n,a)=>n+Math.max(1,Math.round(a.count*.1*a.factor)),0);
  if(durability<=0)return true;
 }
 return durability<=0;
}
// C143 operating policy is independent of the siege/strategy/tactics switch.
export const campaignEconomyEnabled=(s,factionId)=>['v2','v3'].includes(s.mapId)&&(s.trialRules?.aiEconomyProfile?.[factionId]??s.trialRules?.aiEconomy??(clockFood(s)?'c143b':'c141'))!=='c141';
export const campaignFoodEconomyEnabled=(s,factionId)=>campaignEconomyEnabled(s,factionId)&&(s.trialRules?.aiEconomyProfile?.[factionId]??s.trialRules?.aiEconomy??(clockFood(s)?'c143b':'c141'))!=='c143';
// C143b 시험값: safety/decision horizons, never food grants or discounts.
export const AI_ECONOMY_SORTIE_TURNS=2;
export const AI_ECONOMY_RECRUIT_TURNS=4;
export const AI_ECONOMY_CITY_FOOD_VALUE=.5;
// 시험값: decision horizons/weights only, never resource or rule bonuses.
export const AI_ECONOMY_FOOD_TURNS=3;
export const AI_ECONOMY_TURN_LIMIT=26;
export const AI_ECONOMY_WEAK_SHARE=.75;
export const AI_ECONOMY_THREAT_RADIUS=4;
export const AI_ECONOMY_FOOD_VALUE=1;
export const AI_ECONOMY_SUPPORT_PAYBACK=8;

function economyContext(s,factionId){
 const v=campaignBannerView(s,getFactionView(s,factionId)),ranking=campaignKnownRanking(s,v);
 const own=Object.values(v.ownArmies).filter(a=>castleArmyActive(s,a));
 const enemies=Object.values(v.knowledge.observedArmies).filter(a=>diplomacyHostile(s,factionId,a.factionId));
 const totals=new Map();for(const a of enemies)totals.set(a.factionId,(totals.get(a.factionId)??0)+(a.troopCount??0));
 const trailing=ranking[0]?.factionId!==factionId,field=own.reduce((n,a)=>n+a.troopCount,0);
 const pending=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId&&c.currentProduction?.kind==='recruit').reduce((n,c)=>n+campaignAiJobForecast(s,c,'recruit').troops,0);
 const foodPolicy=campaignFoodEconomyEnabled(s,factionId),publicWorld=foodPolicy?strategyPublicWorld(s,v):null;
 const food=foodPolicy&&!clockFood(s)?campaignAiFoodForecast(s,factionId,publicWorld):{};
 return {v,own,enemies,trailing,field,enemyField:Math.max(0,...totals.values()),pending,foodPolicy,publicWorld,food};
}
function economyOfficers(s,c){return freeCityOfficers(s,c).filter(o=>!injuryReason(s,o.officerId)&&!fatigueReason(s,o.officerId)).sort((a,b)=>fatigueView(s,a.officerId).value-fatigueView(s,b.officerId).value||Number(a.officerId===c.governorId)-Number(b.officerId===c.governorId)||a.officerId.localeCompare(b.officerId));}

export function campaignAiInvestment(s,c,kind,context=economyContext(s,c.ownerFactionId)){
 const forecast=campaignAiJobForecast(s,c,kind,{progress:c.jobProgress?.[kind]??0}),remaining=AI_ECONOMY_TURN_LIMIT-s.turn+1;
 if(cityJobReason(s,c,kind)||!forecast.turns)return {...forecast,payback:null,remaining,allowed:false};
 const before=cityEconomyRates(s,c),tile=facilityTiles(s,c)[0];
 const after=cityEconomyRates(s,{...c,facilities:[...c.facilities,{kind,tileId:tile}]});
 const gain=Math.max(0,after.raw.production-before.raw.production)+AI_ECONOMY_FOOD_VALUE*Math.max(0,after.raw.food-before.raw.food);
 // Granaries only pay through avoiding imminent overflow; a larger empty store
 // has no return. Support facilities require a real local beneficiary.
 let payback=gain>0?Math.ceil(forecast.cost/gain):null;
 if(kind==='granary'&&before.food>campaignFoodNeed(s,c)&&c.foodStock+forecast.turns*(before.food-campaignFoodNeed(s,c))>=before.capacity)payback=Math.ceil(forecast.cost/(before.food-campaignFoodNeed(s,c)));
 if(kind==='clinic'&&s.personnel.lots.some(l=>l.nodeId===c.cityId&&l.kind==='WOUNDED'&&l.count>0)||kind==='mufu'&&context.own.some(a=>hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=3))payback=AI_ECONOMY_SUPPORT_PAYBACK;
 const siegePlan=kind==='workshop'&&economyOfficers(s,c).some(o=>o.allowedTroops.includes('bow'))&&Object.values(context.v.knowledge.cities).some(e=>diplomacyHostile(s,c.ownerFactionId,e.ownerFactionId)&&(s.castleKnowledge?.[c.ownerFactionId]?.[e.cityId]?.durability??0)>0&&hexDistance(s.tiles[c.tileId],s.tiles[e.tileId])<=C24.catapultCityRange);
 // A workshop can repay +1 production or enable an actual nearby siege.
 if(siegePlan)payback=Math.min(payback??Infinity,AI_ECONOMY_SUPPORT_PAYBACK);
 return {...forecast,payback,remaining,siegePlan,allowed:payback!==null&&forecast.turns+payback<=remaining};
}

function economyCityDecision(s,c,context){
 const musterReasons=[],recruitReasons=[],investments=[];
 const occupied=cityOccupationStatus(s,c)!=='NORMAL';
 const officers=economyOfficers(s,c),remaining=AI_ECONOMY_TURN_LIMIT-s.turn+1;
 if(occupied){musterReasons.push('OCCUPATION');recruitReasons.push('OCCUPATION');return {cityId:c.cityId,kind:null,musterReasons,recruitReasons,investments};}
 if((c.reserveTroops??0)<musterRequirement(s,c))musterReasons.push('RESERVE');
 if(!officers.length)musterReasons.push('OFFICER');
 if(cityJobReason(s,c,'muster'))musterReasons.push('MUSTER_RULE');
 const rates=cityEconomyRates(s,c),need=campaignFoodNeed(s,c),food=c.foodStock-c.reservedResources.food;
 // Reserve -> field has no additional upkeep. Only check the real source and
 // opening food; existing supplyAiPlan checks each subsequent destination.
 const probe={...(context.own[0]??{}),armyId:'AI.ECONOMY.PROBE',factionId:c.ownerFactionId,tileId:c.tileId,troopCount:1,hp:2};
 const supplied=!supplyEnabled(s)||supplyLink(siegePublicWorld(s,context.v,probe),probe).state==='SAFE'&&food+rates.food>=need;
 if(!supplied&&!context.foodPolicy)musterReasons.push('SOURCE_FOOD');
 let choice=!musterReasons.length?officers.map(o=>({officerId:o.officerId,troopType:campaignAiMusterTroop(s,c,o)})).find(x=>x.troopType&&musterTroopOptions(s,c,x.officerId).some(t=>t.troopType===x.troopType&&!t.blockedReason)):null;
 if(!musterReasons.length&&!choice)musterReasons.push('TROOP_OR_ROUTE');
 const mobilization=campaignMobilization(s,c.ownerFactionId),recruit=campaignAiJobForecast(s,c,'recruit',{progress:c.jobProgress?.recruit??0});
 const additional=context.pending+(c.currentProduction?.kind==='recruit'?0:recruit.troops);
 const budget=campaignAiFoodBudget(s,c.ownerFactionId,AI_ECONOMY_FOOD_TURNS,additional);
 const weak=context.own.some(a=>hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=2&&a.troopCount<(s.personnel.formations.find(f=>f.formationId===a.armyId)?.targetStrength??0)*AI_ECONOMY_WEAK_SHARE);
 const availableSoon=freeCityOfficers(s,c).some(o=>(!injuryReason(s,o.officerId)||(o.injury?.untilTurn??Infinity)<=s.turn+(recruit.turns??0))&&(!fatigueReason(s,o.officerId)||fatigueView(s,o.officerId).restTurns<=(recruit.turns??0)));
 const cityFood=context.food[c.cityId],defending=c.besieged||context.enemies.some(a=>hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=AI_ECONOMY_THREAT_RADIUS);
 const starving=context.foodPolicy&&!clockFood(s)&&context.own.some(a=>a.supplyStarving&&supplyLink(context.publicWorld,s.armies[a.armyId]).sourceCityId===c.cityId);
 let launch=null;
 if(context.foodPolicy&&!clockFood(s)&&choice){
  launch=campaignAiMusterFood(s,c,choice.troopType);
  const remainingStock=Math.min(cityFood.stock,cityFood.nextStock)-launch.full;
  const canSustain=remainingStock>=Math.max(0,cityFood.depletion)*AI_ECONOMY_SORTIE_TURNS;
  if(!defending&&(!launch.canFill||!canSustain)){musterReasons.push('FOOD_SORTIE_DEFERRED');choice=null;}
 }
 if(context.foodPolicy&&!clockFood(s)){
  const added=cityFood.projectedRecruitCompleted?0:recruit.troops*troopFoodRate(s)/1000;
  const net=cityFood.net-added,depletion=Math.max(0,cityFood.depletion+added);
  if(net<0&&cityFood.nextStock<depletion*AI_ECONOMY_RECRUIT_TURNS)recruitReasons.push('FOOD_RECRUIT_DEFERRED');
 }else if(!clockFood(s)&&(budget.balance<0||food+rates.food<need))recruitReasons.push('FOOD_BUDGET');
 if(!availableSoon&&!weak)recruitReasons.push('NO_USE');
 // Do not stockpile a second batch while there is already enough to sortie.
 if(context.foodPolicy?c.reserveTroops>0:c.reserveTroops>=musterRequirement(s,c)&&!weak)recruitReasons.push('READY_RESERVE');
 if(mobilization.used+additional>mobilization.capacity)recruitReasons.push('MOBILIZATION');
 if(cityJobReason(s,c,'recruit'))recruitReasons.push('RECRUIT_RULE');
 if(!recruit.turns||recruit.turns>remaining)recruitReasons.push('DEADLINE');
 // F3/F4: actual starvation or an unaffordable recruitment is the narrowly
 // scoped exception to C143 commitment. Food buildings retain F5's deadline.
 const foodFirst=context.foodPolicy&&!clockFood(s)&&(starving||cityFood.net<0);
 const foodKinds=foodFirst?['farm','tuntian'].map(kind=>({kind,investment:campaignAiInvestment(s,c,kind,context)})).filter(x=>x.investment.allowed).sort((a,b)=>a.investment.turns-b.investment.turns||a.kind.localeCompare(b.kind)):[];
 const foodPriority=foodKinds[0];
 // The sortie still pays its ordinary cost and completes at settlement.
 // A threatened major can reprioritize a legal existing reserve batch.
 const capitalThreat=campaignAiRule(s,c.ownerFactionId,13)&&strategyCityKind(s,c)==='major'&&campaignCapitalThreats(s,context.v).some(t=>t.city.cityId===c.cityId);
 if(capitalThreat&&choice)return {cityId:c.cityId,kind:'muster',...choice,musterReasons,recruitReasons,investments,budget,cityFood,launch,defending:true,capitalDefense:true};
 if(foodPriority&&(starving&&!defending||!choice&&recruitReasons.includes('FOOD_RECRUIT_DEFERRED'))){
  if(starving)musterReasons.push('STARVING_FOOD_PRODUCTION');
  investments.push({kind:foodPriority.kind,...foodPriority.investment});
  return {cityId:c.cityId,kind:foodPriority.kind,musterReasons,recruitReasons,investments,budget,cityFood,launch,defending};
 }
 if(c.currentProduction&&['muster','recruit','reorganize'].includes(c.currentProduction.kind)){
  // The old commitment cannot finish an unsafe new batch merely because no
  // food investment can repay before the limit. Pause, retaining jobProgress.
  const blocked=context.foodPolicy&&(c.currentProduction.kind==='muster'&&!defending&&musterReasons.includes('FOOD_SORTIE_DEFERRED')||c.currentProduction.kind==='recruit'&&recruitReasons.some(r=>['FOOD_RECRUIT_DEFERRED','READY_RESERVE'].includes(r)));
  if(blocked)return {cityId:c.cityId,kind:null,pauseProduction:true,musterReasons,recruitReasons,investments,budget,cityFood,launch,defending};
  musterReasons.push('COMMITTED_JOB');recruitReasons.push('COMMITTED_JOB');
  return {cityId:c.cityId,kind:c.currentProduction.kind,musterReasons,recruitReasons,investments,budget,cityFood,launch,defending};
 }
 if(choice)return {cityId:c.cityId,kind:'muster',...choice,musterReasons,recruitReasons,investments,budget,cityFood,launch,defending};
 const urgent=context.trailing||context.field<=context.enemyField||context.enemies.some(a=>hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=AI_ECONOMY_THREAT_RADIUS);
 if(foodPriority&&cityFood.net<0){investments.push({kind:foodPriority.kind,...foodPriority.investment});return {cityId:c.cityId,kind:foodPriority.kind,musterReasons,recruitReasons,investments,budget,cityFood,urgent};}
 if(!recruitReasons.length&&urgent)return {cityId:c.cityId,kind:'recruit',musterReasons,recruitReasons,investments,budget,urgent,cityFood};
 const count=kind=>c.facilities.filter(f=>f.kind===kind).length;
 const kinds=[];
 if(food<need*2||budget.balance<0){if(count('farm')<2)kinds.push('farm');if(!count('granary'))kinds.push('granary');}
 if(researchStage(s,c.ownerFactionId)>=1&&count('workshop')<C19.workshopLimit)kinds.push('workshop');
 if(c20Enabled(s))kinds.push(...Object.keys(C20_FACILITIES).filter(kind=>C20_FACILITIES[kind].factionId===c.ownerFactionId));
 for(const kind of kinds){const investment=campaignAiInvestment(s,c,kind,context);investments.push({kind,...investment});if(investment.allowed)return {cityId:c.cityId,kind,musterReasons,recruitReasons,investments,budget,urgent};}
 if(c.facilities.some(f=>f.damaged)&&!cityJobReason(s,c,'repair'))return {cityId:c.cityId,kind:'repair',musterReasons,recruitReasons,investments,budget,urgent};
 if(!recruitReasons.length)return {cityId:c.cityId,kind:'recruit',musterReasons,recruitReasons,investments,budget,urgent};
 return {cityId:c.cityId,kind:null,musterReasons,recruitReasons,investments,budget,urgent};
}

// No state memory, RNG use, or diagnostic counters are written here.
export function campaignAiEconomyReport(s,factionId){
 const context=economyContext(s,factionId),cities=Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).sort((a,b)=>a.cityId.localeCompare(b.cityId)).map(c=>economyCityDecision(s,c,context));
 const reasons={};for(const c of cities)for(const action of ['muster','recruit'])for(const reason of c[`${action}Reasons`]){const key=`${action}:${reason}`;reasons[key]=(reasons[key]??0)+1;}
 return {factionId,profile:campaignFoodEconomyEnabled(s,factionId)?'c143b':campaignEconomyEnabled(s,factionId)?'c143':'c141',cities,reasons};
}
export function campaignAiCityJob(s,c){
 if(campaignEconomyEnabled(s,c.ownerFactionId))return economyCityDecision(s,c,economyContext(s,c.ownerFactionId)).kind;
 return campaignAiCityJobC141(s,c);
}
function campaignAiCityJobC141(s,c){
 if(s.mapId!=='v1'&&c.reserveTroops>=musterRequirement(s,c))for(const o of freeCityOfficers(s,c))recordFatigueBlock(s,o.officerId);
 const rates=cityEconomyRates(s,c),need=campaignFoodNeed(s,c),food=c.foodStock-c.reservedResources.food;
 const count=kind=>c.facilities.filter(f=>f.kind===kind).length;
 if(supplyEnabled(s)&&Object.values(s.armies).some(a=>a.factionId===c.ownerFactionId&&a.supplyStarving&&supplyLink(s,a).sourceCityId===c.cityId)&&food<c.population*2+Object.values(s.armies).filter(a=>a.factionId===c.ownerFactionId).reduce((n,a)=>n+armyFoodPerTurn(a,s),0)){
  if(count('farm')<2&&!cityJobReason(s,c,'farm'))return 'farm';
  if(!count('granary')&&!cityJobReason(s,c,'granary'))return 'granary';
 }
 if(s.mapId==='v1'&&c.facilities.some(f=>f.damaged))return 'repair';
 if(c.kind!=='minor'&&(food+rates.food<need||food<need*2)){if(count('farm')<2)return 'farm';if(!count('granary'))return 'granary';}
 if(researchStage(s,c.ownerFactionId)>=1&&count('workshop')<C19.workshopLimit&&facilityTiles(s,c).length)return 'workshop';
 if(s.mapId!=='v1'&&c.reserveTroops>=musterRequirement(s,c)&&freeCityOfficers(s,c).some(o=>!injuryReason(s,o.officerId)&&!fatigueReason(s,o.officerId)))return 'muster';
 const unique=Object.keys(C20_FACILITIES).find(kind=>C20_FACILITIES[kind].factionId===c.ownerFactionId&&!cityJobReason(s,c,kind));if(c20Enabled(s)&&unique)return unique;
 if(c.facilities.some(f=>f.damaged))return 'repair';
 const weak=Object.values(s.armies).some(a=>a.factionId===c.ownerFactionId&&castleArmyActive(s,a)&&a.troopCount<(s.personnel.formations.find(f=>f.formationId===a.armyId)?.targetStrength??0)*.75);
 if((weak||(c.reserveTroops??0)<500)&&food+rates.food>=need&&campaignMobilization(s,c.ownerFactionId).used+500<=campaignMobilization(s,c.ownerFactionId).capacity)return 'recruit';
 if(c.kind==='minor')return null;
 if(!count('market'))return 'market';
 if(!count('barracks'))return 'barracks';
 return null;
}
export function campaignAiReorganization(s,c){
 if(c.kind==='minor'||cityJobReason(s,c,'reorganize'))return null;
 for(const a of Object.values(s.armies).filter(a=>a.factionId===c.ownerFactionId&&castleArmyActive(s,a)&&hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])<=C23.reorganizeRadius).sort((a,b)=>a.armyId.localeCompare(b.armyId))){
  const pack=s.campaignGrowth.officers[a.commanderId]?.pack;
  if(pack?.troopAptitude?.[troopToCampaign(a.troopType)]!=='LOW'||s.personnel.lots.some(l=>l.originFormationId===a.armyId&&l.count>0))continue;
  const troopType=s.officers[a.commanderId].allowedTroops.filter(type=>pack.troopAptitude[troopToCampaign(type)]==='HIGH').sort()[0];
  if(troopType)return {cityId:c.cityId,kind:'reorganize',armyId:a.armyId,troopType};
 }
 return null;
}
export function campaignAiMusterTroop(s,c,o){
 if(campaignAiRule(s,c.ownerFactionId,12)){
  const v=campaignBannerView(s,getFactionView(s,c.ownerFactionId));v.knowledge.observedArmies=Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([,a])=>diplomacyHostile(s,c.ownerFactionId,a.factionId)));
  const legal=musterTroopOptions(s,c,o.officerId).filter(x=>!x.blockedReason).map(x=>x.troopType);
  const n=s.c24AiMusters?.[c.ownerFactionId]??0,seed=s.campaignSeed??s.seed??0;
  if(c24Enabled(s)&&(n+seed)%C24.aiPeriod===0){const special=legal.filter(t=>SPECIAL_TROOPS[t]&&(t!=='catapult'||Object.values(v.knowledge.cities).some(e=>e.ownerFactionId&&e.ownerFactionId!==c.ownerFactionId&&hexDistance(s.tiles[c.tileId],s.tiles[e.tileId])<=C24.catapultCityRange)));if(special.length)return special[Math.abs(seed+Math.floor(n/C24.aiPeriod))%special.length];}
  const normal=legal.filter(t=>!SPECIAL_TROOPS[t]),grade=t=>({S:4,A:3,B:2,C:1}[o.aptitude[parentTroop(t)]]??0),best=Math.max(0,...normal.map(grade));
  const apt=normal.filter(t=>grade(t)===best),siege=apt.filter(t=>!['bow','archer','catapult'].includes(parentTroop(t)));
  return campaignAiPickTroop(s,v,siege.length?apt:normal,parentTroop);
 }
 if(campaignSiegeEnabled(s,c.ownerFactionId)){
  const v=campaignBannerView(s,getFactionView(s,c.ownerFactionId));
  const targets=Object.values(v.knowledge.cities).filter(e=>e.ownerFactionId!==c.ownerFactionId&&diplomacyHostile(s,c.ownerFactionId,e.ownerFactionId));
  if(targets.length){
   const template=Object.values(s.armies).find(a=>a.factionId===c.ownerFactionId);
   const options=musterTroopOptions(s,c,o.officerId).filter(x=>!x.blockedReason).map(x=>x.troopType).filter(troopType=>{
    const army={...template,armyId:'AI.SIEGE.PROBE',commanderId:o.officerId,factionId:c.ownerFactionId,troopType,tileId:c.tileId,hp:1,troopCount:1,morale:'STEADY',effectStates:[],c32:null,c34:null};
    return targets.some(city=>campaignSiegePositions(s,v,army,city,{capability:true}).length);
   }).sort((a,b)=>Number(o.aptitude[parentTroop(b)]==='A')-Number(o.aptitude[parentTroop(a)]==='A')||Number(!!SPECIAL_TROOPS[a])-Number(!!SPECIAL_TROOPS[b])||a.localeCompare(b));
   if(options.length){
    const best=options.filter(type=>Number(o.aptitude[parentTroop(type)]==='A')===Number(o.aptitude[parentTroop(options[0])]==='A'));
    // Preserve C24's special-sortie cadence among equally apt legal troops.
    const n=s.c24AiMusters?.[c.ownerFactionId]??0,seed=s.campaignSeed??s.seed??0;
    if(c24Enabled(s)&&(n+seed)%C24.aiPeriod===0){
     const special=best.filter(type=>SPECIAL_TROOPS[type]&&(type!=='catapult'||targets.some(e=>e.ownerFactionId!==null&&hexDistance(s.tiles[c.tileId],s.tiles[e.tileId])<=C24.catapultCityRange)));
     if(special.length)return special[Math.abs(seed+Math.floor(n/C24.aiPeriod))%special.length];
    }
    return best[0];
   }
   return null;
  }
 }
 const base=[...o.allowedTroops].sort((a,b)=>Number(o.aptitude[b]==='A')-Number(o.aptitude[a]==='A')||a.localeCompare(b))[0];
 if(!c24Enabled(s))return base;
 const n=s.c24AiMusters?.[c.ownerFactionId]??0,seed=s.campaignSeed??s.seed??0;
 if((n+seed)%C24.aiPeriod!==0)return base;
 const choices=musterTroopOptions(s,c,o.officerId).filter(x=>SPECIAL_TROOPS[x.troopType]&&!x.blockedReason&&(x.troopType!=='catapult'||Object.values(s.knowledge[c.ownerFactionId].cities).some(e=>e.ownerFactionId!==null&&e.ownerFactionId!==c.ownerFactionId&&hexDistance(s.tiles[c.tileId],s.tiles[e.tileId])<=C24.catapultCityRange)));
 return choices.length?choices[Math.abs(seed+Math.floor(n/C24.aiPeriod))%choices.length].troopType:base;
}
export function selectCampaignAiJobs(s,factionId){
 if(campaignEconomyEnabled(s,factionId)){
  for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===factionId).sort((a,b)=>a.cityId.localeCompare(b.cityId))){
   const decision=economyCityDecision(s,c,economyContext(s,factionId));
   if(decision.pauseProduction){c.currentProduction=null;c.productionProgress=0;continue;}
   if(!decision.capitalDefense&&c.currentProduction&&['muster','recruit','reorganize'].includes(c.currentProduction.kind)&&(!campaignFoodEconomyEnabled(s,factionId)||decision.kind===c.currentProduction.kind))continue;
   const {kind,officerId,troopType}=decision;
   if(kind){
    if(c.currentProduction?.kind===kind)continue;
    selectCityJob(s,{cityId:c.cityId,kind,...(kind==='muster'?{officerId,troopType}:{})},factionId);
    if(kind==='muster'&&c24Enabled(s)){s.c24AiMusters??={};s.c24AiMusters[factionId]=(s.c24AiMusters[factionId]??0)+1;}
   }else if(!c.currentProduction){const reform=campaignAiReorganization(s,c);if(reform&&!Object.values(s.cities).some(city=>city.currentProduction?.kind==='reorganize'&&city.currentProduction.armyId===reform.armyId)){selectCityJob(s,reform,factionId);s.c23Stats??={archerBlocked:0,aiReorganizations:0};s.c23Stats.aiReorganizations++;}}
  }
  return;
 }
 for(const c of Object.values(s.cities).filter(c=>c.ownerFactionId===factionId&&cityOccupationStatus(s,c)==='NORMAL').sort((a,b)=>(researchStage(s,factionId)>=1?cityEconomyRates(s,a).raw.production-cityEconomyRates(s,b).raw.production:0)||a.cityId.localeCompare(b.cityId))){
  if(c.currentProduction?.kind==='reorganize')continue;
  const reform=campaignAiReorganization(s,c);
  if(reform&&!Object.values(s.cities).some(city=>city.currentProduction?.kind==='reorganize'&&city.currentProduction.armyId===reform.armyId)){selectCityJob(s,reform,factionId);s.c23Stats??={archerBlocked:0,aiReorganizations:0};s.c23Stats.aiReorganizations++;continue;}
  const kind=campaignAiCityJob(s,c);if(!kind)continue;
  if(kind==='muster'){if(c.currentProduction?.kind==='muster')continue;const officers=freeCityOfficers(s,c).filter(o=>!injuryReason(s,o.officerId)&&!fatigueReason(s,o.officerId)).sort((a,b)=>fatigueView(s,a.officerId).value-fatigueView(s,b.officerId).value||Number(a.officerId===c.governorId)-Number(b.officerId===c.governorId)||a.officerId.localeCompare(b.officerId));for(const o of officers){const troopType=campaignAiMusterTroop(s,c,o);if(!troopType)continue;selectCityJob(s,{cityId:c.cityId,kind,officerId:o.officerId,troopType},factionId);if(c24Enabled(s)){s.c24AiMusters??={};s.c24AiMusters[factionId]=(s.c24AiMusters[factionId]??0)+1;}break;}continue;}
  if(c.currentProduction&&(kind===c.currentProduction.kind||!['recruit','farm','granary','repair'].includes(kind)))continue;
  if(['recruit','repair'].includes(kind)||facilityTiles(s,c).length)selectCityJob(s,{cityId:c.cityId,kind},factionId);
 }
}

// C31 goals use only the actor faction's public observation and known routes.
export function c31AiPlan(s,v,plan){
 const x=c31Active(s),a=x&&Object.values(v.ownArmies).find(a=>a.commanderId===x.actorId);if(!a||x.factionId!==v.factionId||!['RAMPAGE','REVENGE','FORTRESS'].includes(x.type))return plan;
 let city=null,target=null;
 if(x.type==='REVENGE')target=Object.values(v.knowledge.observedArmies).filter(b=>b.commanderId===x.rivalId&&v.knowledge.tiles[b.tileId]==='VISIBLE').sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];
 else if(x.type==='FORTRESS')city=c31City(s)??Object.values(v.ownCities).sort((b,c)=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])-hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])||b.cityId.localeCompare(c.cityId))[0];
 else city=Object.values(v.knowledge.cities).filter(c=>c.ownerFactionId===s.playerFactionId).sort((b,c)=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])-hexDistance(s.tiles[a.tileId],s.tiles[c.tileId])||b.cityId.localeCompare(c.cityId))[0];
 if(!city&&!target)return plan;
 const goals=target?[target.tileId]:[city.tileId,...(s.castleKnowledge[v.factionId]?.[city.cityId]?.footprint?.gates??city.footprint?.gates??[])].filter(id=>v.knowledge.tiles[id]&&v.knowledge.tiles[id]!=='UNEXPLORED');
 const dist=id=>Math.min(...goals.map(g=>hexDistance(s.tiles[id],s.tiles[g]))),choices=[...campaignReachable({...s,armies:Object.fromEntries(Object.values({...v.ownArmies,...v.knowledge.observedArmies}).map(b=>[b.armyId,s.armies[b.armyId]]))},a.armyId,s.time.ticksPerTurn)].filter(([id,path])=>path.pathTileIds.every(t=>v.knowledge.tiles[t]!=='UNEXPLORED')&&dist(id)<dist(a.tileId)).sort(([i,p],[j,q])=>dist(i)-dist(j)||p.totalTicks-q.totalTicks||i.localeCompare(j));
 const hold=x.type==='FORTRESS'&&goals.includes(a.tileId),choice=hold?null:choices[0],candidate={armyId:a.armyId,type:choice?'MOVE':'HOLD',destinationTileId:choice?.[0]??null,pathTileIds:choice?.[1].pathTileIds??[],reasonCode:`C31_${x.type}`,...(city?{crisisTargetCityId:city.cityId}:{}),...(target?{crisisTargetArmyId:target.armyId}:{})};
 plan.candidates=plan.candidates.map(c=>c.armyId===a.armyId?{...c,...candidate}:c);return plan;
}

function diplomacyWithdrawalPlan(s,plan){
 plan.candidates=plan.candidates.map(c=>{const p=withdrawalProtection(s,c.armyId);if(!p)return c;const distances=withdrawalDistances(s,c.armyId,p.fromFactionId),options=[...campaignReachable(s,c.armyId,s.time.ticksPerTurn)].sort(([a,x],[b,y])=>(distances.get(a)??Infinity)-(distances.get(b)??Infinity)||x.totalTicks-y.totalTicks||a.localeCompare(b));const best=options[0];return {...c,type:best?'MOVE':'HOLD',destinationTileId:best?.[0]??null,pathTileIds:best?.[1].pathTileIds??[],reasonCode:'WITHDRAWAL'};});return plan;
}
