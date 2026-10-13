import {hexDistance} from './map-primitives.mjs';

// C144: judgment horizons and weights only. No combat/resource rule changes.
export const AI_RULE_GATHER_TURNS=2;
export const AI_RULE_GATHER_RADIUS=2;
export const AI_RULE_START_RATIO=1.1;
export const AI_RULE_CANCEL_RATIO=.8;
export const AI_RULE_RETREAT_TURNS=2;
export const AI_RULE_REVIEW_TURNS=3;
export const AI_RULE_STALL_TURNS=3;
export const AI_RULE_GOAL_BONUS=.25;
export const AI_RULE_WAIT_TURNS=1;
export const AI_RULE_ENEMY_MARGIN=1.05;
export const AI_RULE_FOCUS_CANDIDATES=2;
export const AI_RULE_FOCUS_BEAM=2;
export const AI_RULE_CITY_ATTACK_SHARE=.75;
export const AI_RULE_BOW_SHARE=.25;
export const AI_RULE_COMPOSITION_LOW=-.25;
export const AI_RULE_COMPOSITION_HIGH=.25;
export const AI_RULE_COALITION_TURNS=3;
export const AI_RULE_COALITION_BONUS=20;
export const AI_RULE_DEFAULTS=Object.freeze(Object.fromEntries(Array.from({length:12},(_,i)=>[`r${i+1}`,true])));
let testEnabled=true;
// Test fixtures only; production code never calls this and saves stay unchanged.
export function configureAiRules({enabled=true}={}){testEnabled=enabled!==false;}

export function campaignAiRule(s,f,n){
 const profile=s.trialRules?.aiProfile?.[f]??s.trialRules?.aiSiege;
 if(!testEnabled||!['v2','v3'].includes(s.mapId)||['legacy','siege'].includes(s.trialRules?.aiSiege)||['legacy','siege'].includes(profile))return false;
 const rules=s.trialRules?.aiRules,local=rules?.[f];
 return ((local&&typeof local==='object'?local[`r${n}`]:rules?.[`r${n}`])??AI_RULE_DEFAULTS[`r${n}`])!==false;
}
export const campaignAiRulesEnabled=(s,f)=>Array.from({length:12},(_,i)=>i+1).some(n=>campaignAiRule(s,f,n));
export function campaignAiRoll(s,f,id,salt='start'){
 let h=2166136261;
 for(const c of `${s.campaignSeed??s.seed??0}|${s.turn}|${f}|${id}|${salt}`)h=Math.imul(h^c.charCodeAt(0),16777619);
 return (h>>>0)/4294967296;
}
export function campaignAiStartChance(ratio,threshold=AI_RULE_START_RATIO){const relative=ratio/threshold+Number.EPSILON;return relative>=1?1:relative>=.95?.4:relative>=.90?.2:0;}
export function campaignAiLaunch(s,f,id,ratio,threshold=AI_RULE_START_RATIO){
 const m=s.aiMilitary?.[f]?.units?.[id],failures=m?.blockedTurn===s.turn-1?m.blockedCount??0:0;
 return ratio>=threshold||failures>=2||campaignAiRoll(s,f,id,'start')<campaignAiStartChance(ratio,threshold);
}
export function campaignAiRecordBlocked(s,f,id,blocked){const m=((s.aiMilitary??={})[f]??={units:{},groups:[]});m.units??={};const r=m.units[id]??={};if(blocked){if(r.blockedTurn!==s.turn){r.blockedCount=r.blockedTurn===s.turn-1?(r.blockedCount??0)+1:1;r.blockedTurn=s.turn;}}else{delete r.blockedCount;delete r.blockedTurn;}}
export const campaignAiExchange=(p)=>{const enemy=Math.max(0,p?.enemyLoss??p?.dealt??0),ally=Math.max(0,p?.allyLoss??0);return ally?enemy/ally:enemy?Infinity:0;};
export function campaignAiExchangeAllowed(p,{aggressive=false}={}){const ratio=campaignAiExchange(p);return ratio>=.7&&ratio>=(aggressive&&ratio>=1?1:1.2);}
const count=a=>Math.max(0,a?.troopCount??0);
const dist=(v,a,b)=>v.tiles[a]&&v.tiles[b]?hexDistance(v.tiles[a],v.tiles[b]):Infinity;
export function campaignAiPosture(s,v,ranking,turnLimit=26){
 if(!ranking.length){const rows=new Map();for(const c of Object.values({...v.knowledge.cities,...v.ownCities}))if(c.ownerFactionId){const row=rows.get(c.ownerFactionId)??{factionId:c.ownerFactionId,majorCities:0,minorCities:0};row[(c.kind??s.cities[c.cityId]?.kind)==='minor'?'minorCities':'majorCities']++;rows.set(c.ownerFactionId,row);}ranking=[...rows.values()].sort((a,b)=>b.majorCities-a.majorCities||b.minorCities-a.minorCities||a.factionId.localeCompare(b.factionId));}
 const self=ranking.find(r=>r.factionId===v.factionId),rank=Math.max(0,ranking.indexOf(self)),enemies=ranking.filter(r=>r.factionId!==v.factionId);
 const own=Object.values(v.ownArmies).reduce((n,a)=>n+count(a),0),enemy=Math.max(0,...enemies.map(r=>Object.values(v.knowledge.observedArmies).filter(a=>a.factionId===r.factionId).reduce((n,a)=>n+count(a),0)));
 const behind=rank>0,remaining=Math.max(0,turnLimit-s.turn+1),urgent=behind?rank*.05+(1-remaining/turnLimit)*.1:0;
 return {rank,own,enemy,remaining,defensive:!behind&&enemy>own,startRatio:campaignAiRule(s,v.factionId,6)?Math.max(1,AI_RULE_START_RATIO-urgent-(behind&&own>enemy?.05:0)):AI_RULE_START_RATIO,lossWeight:campaignAiRule(s,v.factionId,6)&&behind&&own>enemy?1:1.2};
}
export function campaignAiWaitValue(s,v,unit,target,group,{supplyTurns=Infinity,posture}={}){
 const friends=group.filter(a=>a.armyId!==unit.armyId&&dist(v,a.tileId,target.tileId)<=4&&dist(v,a.tileId,target.tileId)>2).reduce((n,a)=>n+count(a),0);
 const foes=Object.values(v.knowledge.observedArmies).filter(a=>dist(v,a.tileId,target.tileId)>2&&dist(v,a.tileId,target.tileId)<=4).reduce((n,a)=>n+count(a),0);
 const local=group.filter(a=>dist(v,a.tileId,target.tileId)<=2).reduce((n,a)=>n+count(a),0),defense=Object.values(v.knowledge.observedArmies).filter(a=>dist(v,a.tileId,target.tileId)<=2).reduce((n,a)=>n+count(a),0);
 return {friends,foes,net:friends-foes,allowed:friends>foes&&local/Math.max(1,defense)<(posture?.startRatio??AI_RULE_START_RATIO)&&(local+friends)/Math.max(1,defense+foes)>=(posture?.startRatio??AI_RULE_START_RATIO)&&supplyTurns>1};
}
export function campaignAiTroopShares(v,parent=x=>x){
 const observed=Object.values(v.knowledge.observedArmies),total=observed.reduce((n,a)=>n+count(a),0),troops=type=>observed.filter(a=>parent(a.troopType)===type).reduce((n,a)=>n+count(a),0);
 const mix=(x)=>Math.max(0,Math.min(1,(x-AI_RULE_COMPOSITION_LOW)/(AI_RULE_COMPOSITION_HIGH-AI_RULE_COMPOSITION_LOW)));
 const spear=mix(total?(troops('cavalry')-troops('militia'))/total:0),cavalry=mix(total?(troops('militia')-troops('spear'))/total:0);
 // Each pair reserves a minimum before interpolating the remaining share.
 return {militia:.125+.25*(1-spear),spear:.125+.25*spear,cavalry:.25+.125*cavalry,bow:.125+.125*(1-cavalry)};
}
export function campaignAiPickTroop(s,v,options,parent=x=>x){
 const own=Object.values(v.ownArmies),shares=campaignAiTroopShares(v,parent),numbers=Object.fromEntries(Object.keys(shares).map(t=>[t,own.filter(a=>parent(a.troopType)===t).length])),total=own.length;
 const siege=own.filter(a=>!['bow','archer','catapult'].includes(parent(a.troopType))).length;
 let pool=options;
 if(siege/Math.max(1,total)<AI_RULE_CITY_ATTACK_SHARE||numbers.bow/Math.max(1,total)>=AI_RULE_BOW_SHARE)pool=options.filter(t=>!['bow','archer','catapult'].includes(parent(t)));
 if(!pool.length)pool=options; // A legal archer is preferable to no sortie.
 return pool.sort((a,b)=>((shares[parent(b)]??0)*(total+1)-(numbers[parent(b)]??0))-((shares[parent(a)]??0)*(total+1)-(numbers[parent(a)]??0))||a.localeCompare(b))[0]??null;
}
export function campaignAiNearWinner(s,v){
 const rows=new Map();
 for(const c of Object.values({...v.knowledge.cities,...v.ownCities}))if(c.ownerFactionId&&(c.kind??s.cities[c.cityId]?.kind)==='major')rows.set(c.ownerFactionId,(rows.get(c.ownerFactionId)??0)+1);
 return [...rows].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;
}

// Public routes/reachable positions are supplied by the bridge. Memory is
// optional, bounded, JSON data; diagnostics never write or consume game RNG.
export function campaignReferencePlan(s,v,plan,{remember=false,ranking=[],turnLimit=26,api}={}){
 if(!campaignAiRulesEnabled(s,v.factionId))return plan;
 const f=v.factionId,m=structuredClone(s.aiMilitary?.[f]??{units:{},groups:[]}),units=Object.values(v.ownArmies).filter(a=>api.active(s,a)&&a.morale!=='ROUTING'),posture=campaignAiPosture(s,v,ranking,turnLimit);
 m.units=Object.fromEntries(Object.entries(m.units??{}).filter(([id])=>v.ownArmies[id]));
 const primary=v.knowledge.cities[plan.goal?.targetCityId]??v.knowledge.observedArmies[plan.goal?.targetArmyId],reserved=new Set();
 let targets=primary?[primary]:[];
 const orderReasons={};const note=code=>{orderReasons[code]=(orderReasons[code]??0)+1;};
 if(campaignAiRule(s,f,9)&&primary?.cityId&&units.length>=3){
  const second=(plan.strategy?.targets??[]).filter(t=>t.cityId!==primary.cityId&&t.score>0&&!t.deferred).map(t=>v.knowledge.cities[t.cityId]).find(c=>c&&dist(v,c.tileId,primary.tileId)<=6);
  if(second)targets.push(second);else note('SPLIT_NO_NEIGHBOR');
 }else if(campaignAiRule(s,f,9))note('SPLIT_UNIT_SHORTAGE');
 const assigned=new Map(),groups=targets.map((target,i)=>{
  const eligible=units.filter(a=>!plan.candidates.find(c=>c.armyId===a.armyId)?.defendCityId).map(a=>{
   const positions=target.cityId?api.positions(s,v,a,target,{capability:true}):[target.tileId];
   const routes=positions.map(t=>api.route(s,v,a.armyId,t)).filter(Boolean).sort((a,b)=>a.totalTicks-b.totalTicks);
   return {a,route:routes[0],turns:routes[0]?Math.ceil(routes[0].totalTicks/s.time.ticksPerTurn):Infinity};
  }).filter(x=>x.route&&(!campaignAiRule(s,f,1)||x.turns<=AI_RULE_GATHER_TURNS));
  let selected=eligible.filter(x=>!assigned.has(x.a.armyId));
  if(targets.length>1&&i===0)selected=selected.slice(0,Math.max(1,Math.ceil(selected.length/2)));
  if(i>0&&!selected.length)note('SPLIT_FORCE_SHORTAGE');
  selected.forEach(x=>assigned.set(x.a.armyId,target));
  const power=selected.reduce((n,x)=>n+count(x.a),0),foes=Object.values(v.knowledge.observedArmies).filter(a=>dist(v,a.tileId,target.tileId)<=2).reduce((n,a)=>n+count(a),0);
  const center=selected.length?{q:Math.round(selected.reduce((n,x)=>n+v.tiles[x.a.tileId].q*count(x.a),0)/Math.max(1,power)),r:Math.round(selected.reduce((n,x)=>n+v.tiles[x.a.tileId].r*count(x.a),0)/Math.max(1,power))}:v.tiles[target.tileId];
  const stage=Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&t.tileId!==target.tileId).sort((a,b)=>hexDistance(a,center)-hexDistance(b,center)||a.tileId.localeCompare(b.tileId))[0]?.tileId;
  const prior=(m.groups??[]).find(g=>g.targetId===(target.cityId??target.armyId)),stageTileId=prior?.stageTileId&&dist(v,prior.stageTileId,target.tileId)<dist(v,stage,target.tileId)?prior.stageTileId:stage;
  return {targetId:target.cityId??target.armyId,targetTileId:target.tileId,armyIds:selected.map(x=>x.a.armyId),power,ratio:power/Math.max(1,foes*(campaignAiRule(s,f,7)?AI_RULE_ENEMY_MARGIN:1)),stageTileId,startedTurn:prior?.startedTurn??s.turn,gatherCount:prior?.gatherCount??0,gatherTurn:prior?.gatherTurn??0,phase:prior?.phase==='ADVANCE'?'ADVANCE':'READY'};
 });
 plan.candidates=plan.candidates.map(c=>{
  const a=v.ownArmies[c.armyId];if(!a||!api.active(s,a)||a.morale==='ROUTING'||/WITHDRAW|CLOCK_RETREAT|C31_|EXPLORE/.test(c.reasonCode??''))return c;
  const old=m.units[a.armyId]??{},record={...old,lastTurn:s.turn};m.units[a.armyId]=record;
  const target=assigned.get(a.armyId)??primary,group=groups.find(g=>g.targetId===(target?.cityId??target?.armyId));
  // Assembly and retreat do not suppress a profitable contact already in reach.
  const cityHits=api.cityTargets(s,a.armyId);if(cityHits.length&&!c.defendCityId){note('CITY_PROGRESS');return {...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'RULE_CITY_PROGRESS',aiTargetCityId:cityHits.includes(target?.cityId)?target.cityId:cityHits[0]};}
  if(api.goodAttack?.(a.armyId)){note('PROFITABLE_CONTACT');return {...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'RULE_CONTACT',aiTargetCityId:target?.cityId??null};}
  if(campaignAiRule(s,f,4)&&!c.defendCityId){
   const near=Object.values(v.knowledge.observedArmies).filter(b=>dist(v,a.tileId,b.tileId)<=3),enemy=near.reduce((n,b)=>n+count(b),0),local=units.filter(b=>dist(v,a.tileId,b.tileId)<=3).reduce((n,b)=>n+count(b),0);
   if(enemy>0&&local/Math.max(1,enemy)<AI_RULE_CANCEL_RATIO||old.retreatUntil>=s.turn){
    const larger=groups.filter(g=>g.power>local&&g.stageTileId&&dist(v,a.tileId,g.stageTileId)>1).sort((x,y)=>y.power-x.power);
    const destinations=[...larger.map(g=>g.stageTileId),...Object.values(v.ownCities).sort((x,y)=>dist(v,a.tileId,x.tileId)-dist(v,a.tileId,y.tileId)||x.cityId.localeCompare(y.cityId)).map(c=>c.tileId)];
    const route=destinations.map(t=>api.route(s,v,a.armyId,t)).find(Boolean);if(route){if(!old.retreatUntil||old.retreatUntil<s.turn)record.retreatUntil=s.turn+AI_RULE_RETREAT_TURNS-1;note('LOCAL_DISADVANTAGE');return {...api.move(s,v,c,route,'RULE_RETREAT'),aiReferenceMove:true};}
   }
  }
  if(c.defendCityId||/GARRISON|REPLENISH|MUSTER|DEFEND/.test(c.reasonCode??''))return c;
  if(target&&group){
   const supplyTurns=api.supplyTurns(a),wait=campaignAiWaitValue(s,v,a,target,units,{supplyTurns,posture}),waited=old.waitTurn===s.turn-1||old.waitTurn===s.turn;
   const cohesive=group.armyIds.every(id=>dist(v,v.ownArmies[id].tileId,group.stageTileId)<=AI_RULE_GATHER_RADIUS);
   const launch=campaignAiRule(s,f,2)?campaignAiLaunch(s,f,a.armyId,group.ratio,posture.startRatio):group.ratio>=posture.startRatio;
   const mayWait=campaignAiRule(s,f,3)||campaignAiRule(s,f,5)?wait.allowed&&!waited:s.turn-group.startedTurn<AI_RULE_GATHER_TURNS;
   if(campaignAiRule(s,f,1)&&group.phase!=='ADVANCE'&&!launch&&mayWait&&group.gatherCount<AI_RULE_GATHER_TURNS&&s.turn-group.startedTurn<AI_RULE_GATHER_TURNS&&supplyTurns>1&&!cohesive){
    if(group.gatherTurn!==s.turn){group.gatherCount++;group.gatherTurn=s.turn;}
    group.phase='ASSEMBLE';record.waitTurn=s.turn;note('REINFORCEMENT_NEXT_TURN');
    if(campaignAiRule(s,f,9)&&group.stageTileId!==a.tileId){const route=api.route(s,v,a.armyId,group.stageTileId);if(route)return {...api.move(s,v,c,route,'RULE_ASSEMBLE'),aiReferenceMove:true};}
    return {...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'RULE_WAIT_SUPPORT',aiOperationWait:true};
   }
   group.phase='ADVANCE';
   if(!launch)note('MARGINAL_FORCE_ADVANCE');
   if(target.cityId!==primary?.cityId){const choice=api.positions(s,v,a,target).map(t=>api.route(s,v,a.armyId,t)).filter(Boolean).sort((x,y)=>x.totalTicks-y.totalTicks)[0];if(choice)return {...api.move(s,v,c,choice,'RULE_TWO_CITIES'),aiReferenceMove:true,aiTargetCityId:target.cityId};}
  }
  if(!campaignAiRule(s,f,3)||c.type==='MOVE'||api.goodAttack?.(a.armyId))return c;
  // No profitable contact: next-turn flank, onward march, then known hub/empty city.
  const reach=[...api.reachable(s,a.armyId,s.time.ticksPerTurn)].filter(([t,p])=>t!==a.tileId&&!reserved.has(t)&&p.pathTileIds.every(id=>v.knowledge.tiles[id]!=='UNEXPLORED')&&api.moveAllowed(a.armyId,t));
  const foes=Object.values(v.knowledge.observedArmies),hub=api.hubs?.find(h=>h.factionId!==f&&v.knowledge.tiles[h.tileId]==='VISIBLE'),goal=target?.tileId??hub?.tileId;
  const options=reach.map(([t,p])=>({t,p,flank:foes.some(b=>dist(v,t,b.tileId)<=2&&api.side?.(a.armyId,b.armyId,t)!=='FRONT'),advance:goal?dist(v,t,goal)<dist(v,a.tileId,goal):true})).filter(x=>x.flank||x.advance).sort((x,y)=>Number(y.flank)-Number(x.flank)||(goal?dist(v,x.t,goal)-dist(v,y.t,goal):0)||x.p.totalTicks-y.p.totalTicks||x.t.localeCompare(y.t));
  const best=options[0];if(best){reserved.add(best.t);note(best.flank?'NEXT_TURN_FLANK':'ADVANCE');return {...c,type:'MOVE',destinationTileId:best.t,pathTileIds:best.p.pathTileIds,reasonCode:best.flank?'RULE_FLANK':'RULE_ADVANCE',aiReferenceMove:true};}
  note('NO_LEGAL_PUBLIC_MOVE');return c;
 });
 m.groups=groups;m.posture=posture;m.turn=s.turn;m.reasons=orderReasons;
 if(remember)(s.aiMilitary??={})[f]=m;
 plan.military={posture,groups,reasons:orderReasons};return plan;
}
