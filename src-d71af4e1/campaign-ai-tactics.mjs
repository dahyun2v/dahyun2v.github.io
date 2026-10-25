import {campaignScenarioRules} from './campaign-scenario-data.mjs';
import {isSliceMap} from './map-primitives.mjs';
import {withCampaignQueries,memoCampaignQuery} from './campaign-rule-registry.mjs';
import {sample4AiValue,sample4PublicState,combatEmptyStep} from './campaign-rule-registry.mjs';
import {publicArmyEngine,engineAiActions,engineMapView,engineAiCoverValue,engineAiCoverDestination,armyEngine,resolveEngineAction} from './campaign-engines.mjs';
import {hexDistance} from './map-primitives.mjs';
import {resolveTactic} from './campaign-combat.mjs';
import {createPersonnelLedger} from './military-personnel-ledger.mjs';
import {campaignMechPlan} from './campaign-mech-contracts.mjs';
import {campaignAiRule,campaignAiPosture,campaignAiLaunch,campaignAiExchange,campaignAiNearChoice,AI_RULE_FOCUS_CANDIDATES,AI_RULE_FOCUS_BEAM} from './campaign-ai-rules.mjs';

// C142: all constants are trial judgment weights, never game-rule modifiers.
export const AI_OPERATION_WAIT_TURNS=2;
export const AI_OPERATION_FORCE_RATIO=1.15;
export const AI_OPERATION_RADIUS=2;
export const AI_OPERATION_WINDOW_TURNS=6;
export const AI_OPERATION_SYNC_WAIT=1;
export const AI_TACTICS_DEFAULT_PARTS=Object.freeze({operation:true,focus:true,flank:true,matchup:true,tacticTiming:true,retreat:true,cutHub:true});
export const AI_FOCUS_UNITS=3;
export const AI_FOCUS_BEAM=1;
export const AI_MOVE_OPTIONS=6;
export const AI_FINISH_VALUE=10000;
export const AI_FORMATION_VALUE=40;
export const AI_EXPOSURE_COST=.35;
export const AI_TACTIC_RESERVE_COST=12;
export const AI_BAD_EXCHANGE_TURNS=2;
export const AI_PUBLIC_STAT=50;
let api;
const previewDiagnostics={skipped:0,reasons:{},ruleRejected:0,ruleRejectedReasons:{}};
export const campaignTacticsDiagnostics=()=>structuredClone(previewDiagnostics);
function recordPreviewFailure(error){
 const reason=String(error.message);
 // The resolver's explicit combat prohibition is a legality rejection, not a
 // missing public-board dependency. Keep it visible in a separate counter.
 if(reason==='C450_ATTACK_RESTRICTED'){previewDiagnostics.ruleRejected++;previewDiagnostics.ruleRejectedReasons[reason]=(previewDiagnostics.ruleRejectedReasons[reason]??0)+1;}
 else {previewDiagnostics.skipped++;previewDiagnostics.reasons[reason]=(previewDiagnostics.reasons[reason]??0)+1;}
}
export function configureAiTactics(services){api=services;}
// A2 exception is a legal capture now, never a distant offensive forecast.
export function campaignCapitalCaptureNow(s,v,id,targets){
 const capitals=targets.filter(cityId=>{const c=v.knowledge.cities[cityId];return c?.ownerFactionId&&c.ownerFactionId!==v.factionId&&s.factions[c.ownerFactionId]?.capitalCityId===cityId;});
 if(!capitals.length)return null;
 const zero=capitals.find(cityId=>s.castleKnowledge?.[v.factionId]?.[cityId]?.durability===0);if(zero)return zero;
 if(!api||!s.officers)return null;
 const board=campaignTacticsWorld(s,v,{readOnlyGrowth:true});
 return capitals.find(cityId=>board.cities[cityId]&&api.cityTargets(board,id).includes(cityId)&&api.previewCity(board,id,cityId).dealt>=board.cities[cityId].durability)??null;
}
// C179: default tactics on modern maps; explicit historical profiles replay.
export const campaignTacticsEnabled=(s,f)=>isSliceMap(s.mapId)&&!['legacy','siege','strategy'].includes(s.trialRules?.aiProfile?.[f]??s.trialRules?.aiSiege);
// C142b: only identified attack/wait orders may be replaced. Unknown future
// reasons (including defense, supply, withdrawal and scouting) stay untouched.
const attackOrders=new Set(['OCCUPY_CASTLE_GATE','ENGAGE_OBSERVED_ENEMY','NO_PUBLIC_ACTIONABLE_TARGET','NO_KNOWN_LEGAL_APPROACH','OTHER_ARMY_ASSIGNED_TO_FACTION_GOAL','FRONTIER_ALREADY_REACHED','FRONTIER_OUTSIDE_CURRENT_MOVE_BUDGET','RULE_CONTACT','RULE_ADVANCE','RULE_FLANK','RULE_TWO_CITIES']);
export const campaignTacticalOrderAllowed=c=>attackOrders.has(c.reasonCode)&&!c.aiSupplyOrder&&!c.defendCityId&&!c.crisisTargetCityId&&!c.crisisTargetArmyId;
export const campaignTacticsPart=(s,f,part)=>campaignTacticsEnabled(s,f)&&(s.trialRules?.aiTacticsParts?.[part]??AI_TACTICS_DEFAULT_PARTS[part])!==false;

const dist=(s,a,b)=>hexDistance(s.tiles[a],s.tiles[b]);
const ranged=a=>['bow','archer'].includes(api.parent(a.troopType));
const moveTiles=(s,a)=>Math.max(0,Math.min(api.movement(s,a.armyId).max,Math.floor(10/(s.mapRules.tuning?.byTroop?.[api.parent(a.troopType)]?.plain??(api.parent(a.troopType)==='cavalry'?1.25:ranged(a)?2.5:2)))));

// Only the same visible fields as the world UI are copied from enemy records.
// Unknown combat stats/traits use a neutral synthetic commander. In particular,
// a false banner's displayed count is the count in every hypothetical branch.
export function campaignTacticsView(s,f){
 const v=api.banner(s,api.publicView(s,f));
 // UI acknowledgements are not tactical information and must not make this
 // snapshot depend on which faction happens to be controlled by the player.
 delete v.situationBarks;delete v.situationEvents;v.engineMap=engineMapView(s,f);
 for(const a of Object.values(v.ownArmies)){a.c50=structuredClone(s.armies[a.armyId].c50??null);a.c50CommanderId=a.commanderId;a.c234=sample4PublicState(s,a.armyId,f);a.woundedCount=s.armies[a.armyId].woundedCount??0;}
 for(const b of Object.values(v.knowledge.observedArmies))if(v.knowledge.tiles[b.tileId]==='VISIBLE'){
  const a=s.armies[b.armyId];Object.assign(b,{facing:a.facing,formation:a.formation,morale:a.morale,braced:!!a.braced,c234:sample4PublicState(s,b.armyId,f),c50:publicArmyEngine(s,b.armyId,f),...(a.troopType==='catapult'?{platformState:a.platformState??'STOWED'}:{})});
  b.troopCount??=a.troopCount;
 }
 v.knowledge.observedArmies=Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([,b])=>v.knowledge.tiles[b.tileId]==='VISIBLE'&&api.hostile(s,f,b.factionId)&&!api.withdrawal(s,b.armyId)));
 return v;
}
// Internal callers only read growth on the public board; committed/simulated
// resolvers clone before writing it. The exported default keeps independent data.
export function campaignTacticsWorld(s,v,{readOnlyGrowth=false}={}){
 const own=Object.values(v.ownArmies),template=own[0];if(!template)return null;
 const probe={...s,armies:structuredClone(v.ownArmies),officers:structuredClone(v.officers),tiles:Object.fromEntries(Object.entries(v.tiles).map(([id,t])=>[id,v.knowledge.tiles[id]==='UNEXPLORED'?{...t,terrainType:'mountain'}:t])),history:[],combatLog:[],lastCombat:null,terminal:null,aiQueue:[],gameResult:null,
  campaignGrowth:{...s.campaignGrowth,officers:Object.fromEntries(Object.entries(s.campaignGrowth.officers).filter(([id])=>v.officers[id]).map(([id,r])=>[id,readOnlyGrowth?r:structuredClone(r)]))},
  c50:{finishedTurns:{},structures:structuredClone(v.engineMap?.structures??[]),publicMarks:structuredClone(v.engineMap?.marks??[]),publicTraps:structuredClone(v.engineMap?.traps??[]),publicWarnings:structuredClone((v.engineMap?.warnings??[]).filter(w=>w.name.endsWith('예고')))},c31Disabled:true,c45Disabled:true,c46Disabled:true,dejaVuDisabled:true,cities:{},knowledge:{},factions:structuredClone(s.factions)};
 const cityTemplate=Object.values(v.ownCities)[0]??Object.values(s.cities)[0];
 for(const c of Object.values(s.cities)){
  const known=v.ownCities[c.cityId]??v.knowledge.cities[c.cityId],castle=s.castleKnowledge?.[v.factionId]?.[c.cityId];
  probe.cities[c.cityId]=v.ownCities[c.cityId]?structuredClone(v.ownCities[c.cityId]):{...structuredClone(cityTemplate),cityId:c.cityId,tileId:c.tileId,kind:c.kind,name:c.name,ownerFactionId:known?.ownerFactionId??null,governorId:null,facilities:[],reserveTroops:0,foodStock:0,securityLevel:known?.securityLevel??0,...(castle?structuredClone(castle):{durability:100,durabilityMax:100,footprint:structuredClone(c.footprint)})};
 }
 for(const b of Object.values(v.knowledge.observedArmies)){
  const commanderId=`AI.PUBLIC.${b.armyId}`,o=structuredClone(v.officers[template.commanderId]);
  Object.assign(o,{officerId:commanderId,name:b.armyId,allegianceFactionId:b.factionId,locationRef:{kind:'ARMY',id:b.armyId},uniqueTrait:null,acquiredTraits:[],activeTraits:[],tactics:[],c34Abilities:null,baseStats:Object.fromEntries(Object.keys(o.baseStats).map(k=>[k,AI_PUBLIC_STAT])),aptitude:{militia:'B',spear:'B',bow:'B',archer:'B',cavalry:'B'},allowedTroops:[b.troopType]});
  probe.officers[commanderId]=o;
  probe.armies[b.armyId]={...structuredClone(template),...b,commanderId,troopCount:b.troopCount,hp:Math.max(1,b.troopCount*2),maxHp:Math.max(1,b.troopCount*2),effectStates:[],c234:b.c234??null,c27:null,c28:null,c29:null,c32:null,c33:null,c34:null,c50:b.c50?{...Object.fromEntries(['frenzy','flag','passage','depot','grudge','trust','direct','persuaded'].filter(k=>b.c50[k]!==undefined).map(k=>[k,structuredClone(b.c50[k])])),engineId:b.c50.engineId,path:b.c50.path??null,max:b.c50.max,resource:b.c50.resource,reservations:Object.fromEntries(b.c50.reservations.map(k=>[k,b.c50.reservationDetails?.[k]??true])),relation:b.c50.relation??null,...(b.c50.order?{order:b.c50.order}:{})}:null,c50CommanderId:commanderId,tacticReadyTurns:{},mainActionTurn:0,mainActionCount:0,movedTiles:0,braced:!!b.braced};
 }
 // Every hypothetical observer sees just the actor's public board. No hidden
 // unit can become a counter, assist, pursuit or approach-fire source.
 for(const f of Object.keys(probe.factions)){
  probe.knowledge[f]={tiles:{...v.knowledge.tiles},cities:structuredClone(v.knowledge.cities),lastSeenArmies:{},observedArmies:Object.fromEntries(Object.values(probe.armies).filter(a=>a.factionId!==f).map(a=>[a.armyId,{...a}]))};
  if(f!==v.factionId){probe.factions[f].science=0;probe.factions[f].prestige=0;probe.factions[f].research={stage:0,reachedTurns:[]};}
 }
 // Legacy preview validation also assigns synthetic governors to vacant public
 // cities. Supply its write tables from this projection, never enemy rosters.
 probe.campaignTerminalWorld={publicProbe:true,armiesById:Object.fromEntries(Object.keys(probe.armies).map(id=>[id,{disposition:'ACTIVE'}])),citiesById:Object.fromEntries(Object.entries(probe.cities).map(([id,c])=>[id,{governorId:c.governorId}])),officersById:{}};
 probe.personnel=api.personnel(probe);
 // The actor knows its own wounded. A field-only synthetic ledger silently
 // made every healing R look ineffective; never copy enemy reserve/wound lots.
 const wounded=(s.personnel?.lots??[]).filter(l=>l.kind==='WOUNDED'&&v.ownArmies[l.originFormationId]);
 if(wounded.length)probe.personnel=createPersonnelLedger({formations:probe.personnel.formations.map(f=>({...f,targetStrength:v.ownArmies[f.formationId]?s.personnel.formations.find(x=>x.formationId===f.formationId)?.targetStrength??f.targetStrength:f.targetStrength})),lots:wounded});
 return probe;
}

// Pure damage/position queries never draft or learn cards. Carry the complete
// active definitions and bindings, but exclude unowned offers and their large
// pool fingerprint from the state cloned by prepareAttackEffects. Full tactic
// simulations still use campaignTacticsWorld, including all growth contracts.
export function campaignCombatProbe(s){return memoCampaignQuery(s,'ai:combat-probe',()=>campaignCombatProbeRead(s));}
function campaignCombatProbeRead(s){
 if(s.trialRules?.aiCombatCompact===false)return s;
 const officers=Object.fromEntries(Object.entries(s.campaignGrowth?.officers??{}).map(([id,r])=>{
  const keep=new Set([r.coreId,r.representativeId,...Object.keys(r.track.growthStates[id]?.ownedTraitRanks??{}),...(r.equippedTacticIds??[])]);
  const collect=x=>{if(typeof x==='string'&&r.cards[x])keep.add(x);else if(Array.isArray(x))x.forEach(collect);else if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){if(r.cards[k])keep.add(k);collect(v);}};
  collect(r.c29);
  return [id,{...r,cards:Object.fromEntries(Object.entries(r.cards).filter(([key])=>keep.has(key))),pool:{...r.pool,traits:[]},track:{...r.track,poolFingerprint:'',draftsById:{},draftOrder:[],entitlementsById:{},entitlementOrder:[],processedRequests:{},actionClaims:{}}}];
 }));
 return {...s,campaignGrowth:{...s.campaignGrowth,officers}};
}

export function campaignOperationPlan(s,v,plan,{remember=false,turnLimit=campaignScenarioRules(s).turnLimit,route,siegePositions,siegeReady,supplyWorld}={}){
 if(campaignAiRule(s,v.factionId,1))return plan; // C144's shared operation already ran.
 if(s.trialRules?.aiTacticsTempo==='c142')return c142OperationReplay(s,v,plan,{remember,turnLimit,route,siegePositions,siegeReady,supplyWorld});
 if(!campaignTacticsPart(s,v.factionId,'operation'))return plan;
 const target=v.knowledge.cities[plan.goal?.targetCityId]??v.knowledge.observedArmies[plan.goal?.targetArmyId];if(!target)return plan;
 const eligible=plan.candidates.filter(c=>campaignTacticalOrderAllowed(c)&&api.active(s,v.ownArmies[c.armyId])&&v.ownArmies[c.armyId].morale!=='ROUTING');
 if(eligible.length<2)return plan;
 const main=eligible.filter(c=>!target.cityId||siegePositions(s,v,v.ownArmies[c.armyId],target,{capability:true}).length);if(!main.length)return plan;
 const memory=structuredClone(s.aiOperations?.[v.factionId]??{}),key=target.cityId??target.armyId;
 memory.waitTurns=(memory.waitTurns??[]).filter(turn=>turn>s.turn-AI_OPERATION_WINDOW_TURNS);
 memory.holds??={};memory.targetId=key;memory.armyIds=eligible.map(c=>c.armyId);
 memory.roles=Object.fromEntries(eligible.map(c=>[c.armyId,main.some(m=>m.armyId===c.armyId)?'MAIN':'SUPPORT']));
 // Route-prefix progress identifies the first arriving main. No rendezvous
 // detour is created, and late reinforcements never slow the slowest march.
 const ordered=[...main].sort((a,b)=>dist(s,a.destinationTileId??v.ownArmies[a.armyId].tileId,target.tileId)-dist(s,b.destinationTileId??v.ownArmies[b.armyId].tileId,target.tileId)||v.ownArmies[b.armyId].troopCount-v.ownArmies[a.armyId].troopCount||a.armyId.localeCompare(b.armyId));
 const first=ordered[0],leader=v.ownArmies[first.armyId];
 const observations=Object.values({...v.knowledge.lastSeenArmies,...v.knowledge.observedArmies}).filter(b=>b.factionId!==v.factionId&&api.hostile(s,v.factionId,b.factionId)&&dist(s,b.tileId,target.tileId)<=2);
 const defenders=observations.reduce((n,b)=>n+(b.troopCount??1000),0);
 const cohesive=main.every(c=>dist(s,v.ownArmies[c.armyId].tileId,leader.tileId)<=AI_OPERATION_RADIUS*2);
 const threatened=defenders>leader.troopCount/AI_OPERATION_FORCE_RATIO;
 const arriving=dist(s,first.destinationTileId??leader.tileId,target.tileId)<=2;
 const recent=memory.holds[first.armyId],waited=recent?.turn===s.turn-1&&recent.count>=AI_OPERATION_SYNC_WAIT;
 const budget=memory.waitTurns.length<AI_OPERATION_WAIT_TURNS||memory.waitTurns.includes(s.turn);
 const cityNow=target.cityId&&api.cityTargets(s,first.armyId).includes(target.cityId);
 memory.phase=threatened&&arriving&&!cohesive&&budget&&!waited&&!cityNow&&turnLimit-s.turn>1?'ASSEMBLE':'ADVANCE';
 memory.stageTileId=leader.tileId;memory.defenders=defenders;
 if(memory.phase==='ASSEMBLE'&&first.type==='MOVE'&&!api.attackTargets(s,first.armyId).length){
  // Only the early main waits once. Every other original march continues;
  // switching the target cannot reset the faction's six-turn wait budget.
  plan.candidates=plan.candidates.map(c=>c.armyId===first.armyId?{...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'OPERATION_ASSEMBLE',aiTacticalMove:true,aiOperationWait:true}:c);
  if(!memory.waitTurns.includes(s.turn))memory.waitTurns.push(s.turn);
  memory.holds[first.armyId]={turn:s.turn,count:recent?.turn===s.turn-1?(recent.count??0)+1:1};
 }else memory.phase='ADVANCE';
 if(remember)(s.aiOperations??={})[v.factionId]=memory;
 plan.operation=memory;return plan;
}

function predictedFormation(p,targetId){
 const changes=[...(p.earlyFormationChanges??[]),...(p.formationChanges??[])].filter(f=>f.armyId===targetId);
 return changes.at(-1)?.to;
}
const actionCommand=x=>({type:x.type,targetId:x.targetId,...(x.traitId?{traitId:x.traitId}:{}),...(x.action?{action:x.action}:{})});
// C305: values are expected troop losses/opportunities on the public board.
// Q targets are tile IDs; its preview already sums rain/pierce and cavalry damage.
export function campaignQPositionValue(w,id,p){
 const a=w.armies[id],parent=api.parent(a.troopType),target=w.armies[p.plan.targets[0]];
 if(!target)return 0;
 if(['militia','shield'].includes(parent)){
  const t={...target,braced:false,troopQDisruptedTurn:w.turn,c27:{...target.c27}};delete t.c27.stakes;
  if(combatEmptyStep(w,target.armyId,p.plan.landing)){
   const edge=[target.tileId,p.plan.landing].sort().join('|');t.tileId=p.plan.landing;
   if(w.mapRules.riverEdges.includes(edge))t.formation=target.formation==='ORDERED'?'DISORDERED':'BROKEN';
  }
  const after={...w,armies:{...w.armies,[target.armyId]:t}};
  // Only allies that still have an action and can actually hit this turn count.
  return Math.max(0,...Object.values(w.armies).filter(b=>b.armyId!==id&&b.factionId===a.factionId&&api.canAct(w,b.armyId)&&!w.endedArmyIds.includes(b.armyId)).map(b=>{
   const value=board=>api.attackTargets(board,b.armyId).includes(target.armyId)?(()=>{const hit=api.previewAttack(board,b.armyId,target.armyId);return hit.enemyLoss-hit.allyLoss*1.2;})():0;
   return value(after)-value(w);
  }));
 }
 if(parent!=='cavalry'||!p.plan.landing)return 0;
 const after={...w,armies:{...w.armies,[id]:{...a,tileId:p.plan.landing}}};
 const enemies=Object.values(w.armies).filter(b=>b.factionId!==a.factionId&&b.troopCount>0);
 const contacts=tile=>enemies.filter(b=>dist(w,tile,b.tileId)===1).length;
 const escape=Math.max(0,contacts(a.tileId)-contacts(p.plan.landing))*a.troopCount*.05;
 const opening=Math.max(0,...enemies.filter(b=>dist(w,p.plan.landing,b.tileId)===1&&(ranged(b)||b.troopCount<a.troopCount)).map(b=>{
  const side=api.side(after,id,b.armyId),old=api.side(w,id,b.armyId);
  return side!==old&&side!=='FRONT'?Math.min(a.troopCount,b.troopCount)*(side==='REAR'?.15:.1):0;
 }));
 // A landing surrounded by fresh enemies is a cost, not a free flank reward.
 return escape+opening-Math.max(0,contacts(p.plan.landing)-contacts(a.tileId))*a.troopCount*.05;
}
// The ordinary preview log omits healing and buff state. Run the existing
// resolver on the same public hypothetical board, never on canonical enemies.
export function campaignTacticSupportValue(w,id,c,targetId){
 // Tactics may cross an XP threshold. Compact damage probes omit entitlement
 // indexes, so restore the actor-known growth contracts before resolving.
 const after=resolveTactic({...campaignCombatProbe(w),campaignGrowth:w.campaignGrowth},id,c.traitId,targetId,{skipPreview:true});
 return publicSupportValue(w,after,id);
}
function publicSupportValue(w,after,id){
 const f=w.armies[id].factionId;
 let value=0;
 // C484: value public control outcomes as lost fighting opportunities. The
 // resolver owns probabilities and movement; never fabricate a successful roll.
 const morale=['STEADY','SHAKEN','ROUTING'],formation=['ORDERED','DISORDERED','BROKEN'];
 for(const a of Object.values(w.armies).filter(a=>a.factionId!==f&&a.troopCount>0)){
  const b=after.armies[a.armyId];if(!b)continue;
  value+=Math.max(0,morale.indexOf(b.morale)-morale.indexOf(a.morale))*a.troopCount*.1;
  value+=Math.max(0,formation.indexOf(b.formation)-formation.indexOf(a.formation))*AI_FORMATION_VALUE;
  if(api.attackTargets(w,a.armyId).length&&!api.attackTargets(after,a.armyId).length)value+=a.troopCount*.1;
  if((b.c34?.disarmUntil??0)>(a.c34?.disarmUntil??0))value+=a.troopCount*.1;
  if((b.c34?.noTacticUntil??0)>(a.c34?.noTacticUntil??0))value+=a.troopCount*.1;
  // Guard and fear also have value when they prevent the next enemy attack.
  const incoming=board=>Math.max(0,...api.attackTargets(board,a.armyId).map(target=>{const p=api.previewAttack(board,a.armyId,target);return p.enemyLoss-p.allyLoss*1.2;}));
  if(b.mechV2?.fear&&!a.mechV2?.fear)value+=Math.max(a.troopCount*.1,incoming(w));
  value+=Math.max(0,incoming(w)-incoming(after));
  for(const effect of b.effectStates??[])if(['FEAR','ROOTED','CONFUSED','DISARMED'].includes(effect.rule??effect.status)&&!(a.effectStates??[]).some(e=>(e.rule??e.status)===(effect.rule??effect.status)))value+=a.troopCount*.05;
 }
 for(const a of Object.values(w.armies).filter(a=>a.factionId===f&&a.troopCount>0)){
  const b=after.armies[a.armyId];if(!b)continue;
  value+=Math.max(0,b.troopCount-a.troopCount);
  value+=Math.max(0,morale.indexOf(a.morale)-morale.indexOf(b.morale))*a.troopCount*.1;
  value+=Math.max(0,formation.indexOf(a.formation)-formation.indexOf(b.formation))*AI_FORMATION_VALUE;
  // Compare one next attack on both boards, including allies already spent this
  // period. Their present action state must not erase a lasting R's benefit.
  const forecast=board=>({...board,armies:{...board.armies,[a.armyId]:{...board.armies[a.armyId],mainActionTurn:0,mainActionCount:0}},endedArmyIds:board.endedArmyIds.filter(x=>x!==a.armyId),attackedArmyIds:board.attackedArmyIds.filter(x=>x!==a.armyId)});
  const best=board=>Math.max(0,...api.attackTargets(board,a.armyId).map(target=>{const p=api.previewAttack(board,a.armyId,target);return p.enemyLoss-p.allyLoss*1.2;}));
  const old=best(forecast(w));value+=Math.max(0,best(forecast(after))-old);
  const beforeGauge=w.campaignGrowth.officers[a.commanderId]?.c29?.gauge??0,afterGauge=after.campaignGrowth.officers[a.commanderId]?.c29?.gauge??0;
  value+=Math.max(0,afterGauge-beforeGauge)*old/100;
 }
 return value;
}
function scoreAction(w,x){
 const t=w.armies[x.targetId],city=w.cities[x.targetId],p=x.p,enemy=p.enemyLoss??p.dealt??0,ally=p.allyLoss??0;
 const finish=(p.units??[]).some(u=>w.armies[u.unitId]?.factionId!==w.armies[x.armyId].factionId&&u.postBattleCount===0)||(t&&t.factionId!==w.armies[x.armyId].factionId?enemy>=t.troopCount:city&&(p.dealt??enemy)>=city.durability);
 const formation=predictedFormation(p,x.targetId),disrupt=formation&&formation!==t?.formation;
 const f=w.armies[x.armyId].factionId,view=campaignAiRule(w,f,6)?api.publicView(w,f):null,posture=view?campaignAiPosture(w,view,[]):null;
 const ambush=x.type==='ATTACK'&&w.armies[x.armyId].c50?.engineId==='CHEOK'&&w.armies[x.armyId].c50.hidden?45:0;
 return (finish?AI_FINISH_VALUE:0)+enemy-ally*(posture?.lossWeight??1.2)+(disrupt?AI_FORMATION_VALUE:0)+(p.formationRisk?.check?AI_FORMATION_VALUE*(1-p.formationRisk.successProbability):0)+(x.strategicValue??0)+ambush-(x.type==='TACTIC'&&!x.signature?AI_TACTIC_RESERVE_COST:0);
}
export function campaignTacticalActions(w,id){return withCampaignQueries(w,()=>campaignTacticalActionsRead(w,id));}
function campaignTacticalActionsRead(w,id){
 if(!w.armies[id]||!api.canAct(w,id)||w.endedArmyIds.includes(id))return [];
 const probe=campaignCombatProbe(w);
 return withCampaignQueries(probe,()=>{
 const rows=api.attackTargets(probe,id).map(targetId=>({armyId:id,type:'ATTACK',targetId,p:api.previewAttack(probe,id,targetId)}));
 for(const targetId of api.cityTargets(probe,id))rows.push({armyId:id,type:'CITY',targetId,p:api.previewCity(probe,id,targetId)});
 for(const targetId of api.troopQTargets(probe,id)){const p=api.previewTroopQ(probe,id,targetId);rows.push({armyId:id,type:'TROOP_Q',targetId,p,strategicValue:campaignQPositionValue(probe,id,p)});}
 const timing=campaignTacticsPart(w,w.armies[id].factionId,'tacticTiming');
 // Plan two periods of visible contact income, without assuming a kill/rout.
 // These are forecasts only; the real C29 resolver still awards every point.
 const gain=5+(api.attackTargets(probe,id).length?10:0)+(Object.values(w.armies).some(b=>b.factionId!==w.armies[id].factionId&&api.attackTargets(probe,b.armyId).includes(id))?10:0);
 const cards=api.tactics(w,id),signature=cards.find(c=>c.signature&&c.effects?.length&&c.gaugeCost<=100);
 const visibleFoes=Object.values(w.armies).filter(b=>b.factionId!==w.armies[id].factionId&&b.troopCount>0);
 const targets=c=>{
  const legal=c.targets.filter(t=>api.useful(w,id,c,t));
  if(!legal.some(t=>w.tiles[t])||!visibleFoes.length)return legal.slice(0,AI_FOCUS_UNITS);
  // A bounded sample includes contact and escape, rather than the first three
  // lexical cells (often all behind the actor). Every value still uses resolveTactic.
  const nearest=t=>Math.min(...visibleFoes.map(b=>dist(w,t,b.tileId)));
  const contact=t=>visibleFoes.filter(b=>dist(w,t,b.tileId)<=2).length*10-Math.abs(nearest(t)-api.attackRange(w.armies[id],w))*3;
  const ordered=legal.toSorted((a,b)=>contact(b)-contact(a)||dist(w,w.armies[id].tileId,a)-dist(w,w.armies[id].tileId,b)||a.localeCompare(b));
  const escape=legal.toSorted((a,b)=>nearest(b)-nearest(a)||dist(w,w.armies[id].tileId,a)-dist(w,w.armies[id].tileId,b)||a.localeCompare(b))[0];
  return [...new Set([ordered[0],escape,...ordered.slice(1)])].slice(0,AI_FOCUS_UNITS);
 };
 for(const c of cards.filter(c=>c.canUse))for(const targetId of targets(c)){
  let p;
  try{p=api.previewTactic(w,id,c.traitId,targetId);}
  catch(error){
   // Retry only this card on a detached public board. Never consult canonical
   // enemies; persistent rule restrictions remain explicit rejected targets.
   try{p=api.previewTactic(structuredClone(w),id,c.traitId,targetId);}
   catch(retry){recordPreviewFailure(retry);continue;}
  }
  let strategicValue=sample4AiValue(w,id,c,targetId);
  if(!(p.enemyLoss>0)&&!(p.dealt>0)&&c.effects?.length){
   try{strategicValue=Math.max(strategicValue,campaignTacticSupportValue(w,id,c,targetId));}
   catch(error){recordPreviewFailure(error);}
  }
  const x={strategicValue,engineSupport:strategicValue>0,armyId:id,type:'TACTIC',traitId:c.traitId,targetId,p,signature:!!c.signature};
  const formation=predictedFormation(p,targetId),enemy=w.armies[targetId];
  const loss=p.enemyLoss??0;
  const effective=loss>0||(p.dealt??0)>0||strategicValue>0||formation&&formation!==enemy?.formation||(p.moraleChanges??[]).some(m=>m.from!==m.to);
  const own=Object.values(w.armies).filter(b=>b.factionId===w.armies[id].factionId&&dist(w,b.tileId,w.armies[id].tileId)<=3).length;
  const foes=Object.values(w.armies).filter(b=>b.factionId!==w.armies[id].factionId&&dist(w,b.tileId,w.armies[id].tileId)<=3).length;
  const decisive=foes>own||!!w.cities[targetId]||loss>=(enemy?.troopCount??Infinity)||(p.units??[]).some(u=>u.postBattleCount===0&&w.armies[u.unitId]?.factionId!==w.armies[id].factionId);
  x.decisive=decisive;
  if(effective||!timing)rows.push(x);
  if(timing&&effective){
   x.strategicValue+=decisive?Math.max(AI_TACTIC_RESERVE_COST,loss*.25):0;
  }
 }
 const f=w.armies[id].factionId,unit=w.armies[id];
 let futureR=Math.max(0,...rows.filter(x=>x.signature).map(x=>scoreAction(w,x)));
 const nearR=signature&&(signature.gauge??0)+2*gain>=signature.gaugeCost;
 if(timing&&nearR&&(signature.gauge??0)<signature.gaugeCost&&rows.some(x=>x.type==='TACTIC'&&!x.signature&&!x.decisive)){
  const r=w.campaignGrowth.officers[unit.commanderId];
  const charged={...w,campaignGrowth:{...w.campaignGrowth,officers:{...w.campaignGrowth.officers,[unit.commanderId]:{...r,c29:{...r.c29,gauge:signature.gaugeCost}}}}};
  // This is an isolated forecast of the actor's own future resource, not a grant.
  futureR=Math.max(0,...campaignTacticalActions(charged,id).filter(x=>x.signature).map(x=>x.score));
 }
 const basic=Math.max(0,...rows.filter(x=>x.type==='ATTACK').map(x=>scoreAction(w,x)));
 if(timing&&nearR&&futureR>basic)for(let n=rows.length-1;n>=0;n--)if(rows[n].type==='TACTIC'&&!rows[n].signature&&!rows[n].decisive)rows.splice(n,1);
 const top=Math.max(0,...rows.filter(x=>x.type!=='TACTIC').map(x=>scoreAction(w,x)));
 // Preserve C305's existing useful E-support policy. R competes by the
 // measured public value; reserve only an R worth its future main action.
 for(const x of rows.filter(x=>x.type==='TACTIC'&&x.engineSupport&&!x.signature))x.engineScore=Math.max(scoreAction(w,x),top+4);
 const readyR=Math.max(0,...rows.filter(x=>x.signature).map(x=>x.engineScore??scoreAction(w,x)));
 const engine=armyEngine(w,id),capBonus=engine?.resource===engine?.max?3:0;
 for(const choice of engineAiActions(w,id)){
  const x={armyId:id,type:'ENGINE_ACTION',...choice,p:{enemyLoss:0,allyLoss:0}};
  // C484b: an omitted heuristic is not zero utility. Resolve damage/support W
  // on a detached public board and compare its outcome without a top+1 grant.
  if(['FLURRY','STRIKE','ORDER','RELEASE','SCOUT'].includes(choice.action)){
   try{
    const after=resolveEngineAction({...campaignCombatProbe(w),campaignGrowth:w.campaignGrowth},id,choice.action,choice.targetId);
    if(['FLURRY','STRIKE'].includes(choice.action)){
     x.p.units=Object.values(w.armies).filter(a=>a.troopCount>0&&a.troopCount!==(after.armies[a.armyId]?.troopCount??0)).map(a=>({unitId:a.armyId,postBattleCount:after.armies[a.armyId]?.troopCount??0}));
     x.p.enemyLoss=Object.values(w.armies).filter(a=>a.factionId!==f).reduce((n,a)=>n+Math.max(0,a.troopCount-(after.armies[a.armyId]?.troopCount??0)),0);
     x.p.allyLoss=Object.values(w.armies).filter(a=>a.factionId===f).reduce((n,a)=>n+Math.max(0,a.troopCount-(after.armies[a.armyId]?.troopCount??0)),0);
     x.p.formationChanges=Object.values(w.armies).filter(a=>a.formation!==after.armies[a.armyId]?.formation).map(a=>({armyId:a.armyId,to:after.armies[a.armyId]?.formation}));
    }else x.strategicValue=publicSupportValue(w,after,id);
    x.engineScore=scoreAction(w,x);
   }catch(error){recordPreviewFailure(error);continue;}
  }else x.engineScore=choice.aiValue===undefined?0:readyR>top?choice.aiValue:Math.max(choice.aiValue,top+1+capBonus);
  rows.push(x);
 }
 return rows.filter(x=>{
  if(x.type==='ENGINE_ACTION'||x.strategicValue>0&&!(x.p.enemyLoss>0))return true;
  if(campaignTacticsEnabled(w,f)&&campaignAiRule(w,f,6)&&w.armies[x.targetId]&&(x.p.allyLoss??0)>0&&campaignAiExchange(x.p)<.7)return false;
  if(!campaignAiRule(w,f,2)||x.type==='CITY'||!w.armies[x.targetId])return true;
  const mine=Object.values(w.armies).filter(a=>a.factionId===f&&dist(w,a.tileId,w.armies[x.targetId].tileId)<=3).reduce((n,a)=>n+a.troopCount,0),foe=Object.values(w.armies).filter(a=>a.factionId!==f&&dist(w,a.tileId,unit.tileId)<=3).reduce((n,a)=>n+a.troopCount,0);
  return campaignAiExchange(x.p)>=1.2||campaignAiLaunch(w,f,id,mine/Math.max(1,foe));
 }).map(x=>({...x,score:x.engineScore??scoreAction(w,x)})).map(x=>{
  // Spend the two-turn Q when its actual tactical value is within ten percent.
  // This affects ordering only; casualties, cooldown and gauge are untouched.
  const basic=Math.max(0,...rows.filter(r=>r.type==='ATTACK').map(r=>scoreAction(w,r)));
  if(readyR>basic&&['TROOP_Q','ENGINE_ACTION'].includes(x.type)&&x.score<readyR+1)return {...x,score:Math.min(x.score,readyR-.01)};
  return x.type==='TROOP_Q'&&x.score>=0&&x.score>=basic*.9&&readyR<=basic?{...x,score:Math.max(x.score,basic+1)}:x;
 }).sort((a,b)=>b.score-a.score||a.type.localeCompare(b.type)||a.targetId.localeCompare(b.targetId)||String(a.traitId).localeCompare(String(b.traitId)));
 });
}
function applyPrediction(w,x){
 if(x.type==='TACTIC')return resolveTactic({...campaignCombatProbe(w),campaignGrowth:w.campaignGrowth},x.armyId,x.traitId,x.targetId,{skipPreview:true});
 if(x.type==='ENGINE_ACTION'&&['FLURRY','STRIKE','ORDER','RELEASE','SCOUT'].includes(x.action))return resolveEngineAction({...campaignCombatProbe(w),campaignGrowth:w.campaignGrowth},x.armyId,x.action,x.targetId);
 const next={...w,armies:{...w.armies},cities:{...w.cities},endedArmyIds:[...w.endedArmyIds,x.armyId]},p=x.p;
 // Predictions write scalar counts/formation only. Detach the affected rows,
 // leaving unrelated armies, cities and their nested definitions untouched.
 const own=id=>{if(next.armies[id]===w.armies[id]&&next.armies[id])next.armies[id]={...next.armies[id]};return next.armies[id];};
 if(p.units?.length)for(const u of p.units){const a=own(u.unitId);if(a){a.troopCount=u.postBattleCount;a.hp=Math.max(0,a.troopCount*2);}}
 else {const t=own(x.targetId),a=own(x.armyId);if(t){t.troopCount=Math.max(0,t.troopCount-(p.enemyLoss??0));t.hp=t.troopCount*2;}a.troopCount=Math.max(0,a.troopCount-(p.allyLoss??0));a.hp=a.troopCount*2;}
 if(next.cities[x.targetId])next.cities[x.targetId]={...next.cities[x.targetId],durability:Math.max(0,next.cities[x.targetId].durability-(p.dealt??p.enemyLoss??0))};
 for(const f of [...(p.earlyFormationChanges??[]),...(p.formationChanges??[])])if(next.armies[f.armyId])own(f.armyId).formation=f.to;
 next.personnel=api.personnel(next);
 // Stochastic formation checks use their expected value in scoring; only
 // explicit preview changes are applied. No fabricated successful roll.
 return next;
}
export function campaignFocusOrder(w,ids){
 const rule9=campaignAiRule(w,w.armies[ids[0]]?.factionId,9),candidates=rule9?AI_RULE_FOCUS_CANDIDATES:AI_FOCUS_BEAM,width=rule9?AI_RULE_FOCUS_BEAM:AI_FOCUS_BEAM;
 const active=ids.filter(id=>api.canAct(w,id)&&!w.endedArmyIds.includes(id)),supportActions=new Set(['ORDER','SCOUT','RELEASE','CART','DIRECT_FLANK','LEND','DEPOT']);
 const initial=new Map(active.map(id=>[id,campaignTacticalActions(w,id)]));
 // Orders and marks must precede the recipient's attack. The damage-only beam
 // cannot model those benefits and used to append non-attacking supports last.
 const supports=active.flatMap(id=>{const choice=initial.get(id)[0];return choice?.type==='ENGINE_ACTION'&&supportActions.has(choice.action)?[{armyId:id,action:{type:'ENGINE_ACTION',action:choice.action,targetId:choice.targetId}}]:[];}),supportIds=new Set(supports.map(x=>x.armyId));
 const readyR=id=>Math.max(0,...initial.get(id).filter(x=>x.signature).map(x=>x.score));
 const near=active.filter(id=>!supportIds.has(id)&&(api.attackTargets(w,id).length||api.cityTargets(w,id).length||readyR(id)>0)).sort((a,b)=>readyR(b)-readyR(a)).slice(0,AI_FOCUS_UNITS);
 let best={score:0,actions:[]},beam=[{board:w,left:near,actions:[],score:0}];
 // A global beam bounds the entire search, including permutations, rather
 // than branching twice at every node of a factorial tree.
 for(let depth=0;depth<near.length;depth++){
  const next=[];
  for(const branch of beam)for(const id of branch.left)for(const x of (branch.board===w?initial.get(id):campaignTacticalActions(branch.board,id)).slice(0,candidates)){
   if(x.score<0)continue;
   const node={board:applyPrediction(branch.board,x),left:branch.left.filter(a=>a!==id),actions:[...branch.actions,x],score:branch.score+x.score};
   next.push(node);if(node.score>best.score)best=node;
  }
  beam=next.sort((a,b)=>b.score-a.score).slice(0,width);if(!beam.length)break;
 }
 return [...supports,...best.actions.map(x=>({armyId:x.armyId,action:actionCommand(x)})),...active.filter(id=>!supportIds.has(id)&&!best.actions.some(x=>x.armyId===id)).map(armyId=>({armyId,action:null}))];
}
export function campaignChooseTacticalAction(s,f,id,preferred=null,goalCityId=null){
 const a=s.armies[id];if(!a||!api.canAct(s,id)||s.endedArmyIds.includes(id))return null;
 // A distant idle/rear unit cannot fire, use a contact tactic or hit a
 // castle. Avoid rebuilding its public board and the static known-edge list.
 if(!engineAiActions(s,id).length&&!api.troopQTargets(s,id).length&&!api.attackTargets(s,id).length&&!api.cityTargets(s,id).length&&!api.tactics(s,id).some(c=>c.canUse&&c.targets.length))return null;
 const w=campaignTacticsWorld(s,campaignTacticsView(s,f),{readOnlyGrowth:true});if(!w)return null;
 const options=campaignTacticalActions(w,id);
 if(preferred?.defendGate){const defense=options.find(x=>x.targetId===preferred.targetId&&x.score>=0&&(x.type!=='ATTACK'||x.p.enemyLoss>=x.p.allyLoss*1.2||x.score>=AI_FINISH_VALUE));if(defense)return actionCommand(defense);}
 // A legal castle hit was the strategic purpose of this main's arrival.
 // Field finishing must not consume that capture opportunity instead.
 const siege=goalCityId&&options.filter(x=>x.targetId===goalCityId&&w.cities[x.targetId]).sort((a,b)=>b.score-a.score)[0];
 if(siege){
  const timely=options.find(x=>(x.type==='ENGINE_ACTION'||x.strategicValue>0||w.armies[id].c50?.engineId==='CHEOK'&&w.armies[id].c50.hidden&&x.type==='ATTACK')&&x.score>=siege.score);
  if(timely&&siege.score<AI_FINISH_VALUE)return actionCommand(timely);
  return actionCommand(siege);
 }
 const signature=!campaignTacticsPart(s,f,'tacticTiming')&&options.find(x=>x.type==='TACTIC'&&x.signature);
 if(signature)return actionCommand(signature);
 const safe=options.filter(x=>x.score>=0&&(x.type!=='ATTACK'||x.p.enemyLoss>=x.p.allyLoss*1.2||x.score>=AI_FINISH_VALUE));
 // Focus forecasts cannot anticipate resources gained by earlier allied hits.
 // Recheck ready W/control before retaining a stale preferred normal attack.
 const ready=safe[0];if(ready&&(ready.type==='ENGINE_ACTION'||ready.type==='TROOP_Q'||ready.type==='TACTIC'&&(ready.signature||ready.strategicValue>0)))return actionCommand(ready);
 const best=options.find(x=>preferred&&x.type===preferred.type&&x.targetId===preferred.targetId&&x.traitId===preferred.traitId&&safe.includes(x))??campaignAiNearChoice(s,f,id,safe,'tactical-action');
 return best&&best.score>=0&&(best.type!=='ATTACK'||best.p.enemyLoss>=best.p.allyLoss*1.2||best.score>=AI_FINISH_VALUE)?actionCommand(best):null;
}

// Return uses the same public casualty/exposure scale as tactical retreat.
// Own route, formation strength and spent permissions are known to the actor.
export function campaignChooseReturnRoute(s,v,id){
 const own=v.ownArmies[id],a=s.armies[id];
 if(own?.commanderId!=='G48'||!a?.mechV2?.c491?.route||s.endedArmyIds.includes(id))return null;
 const w=campaignTacticsWorld(s,v,{readOnlyGrowth:true}),route=a.mechV2.c491.route;
 if(!api.canAct(w,id))return null;
 w.armies[id].mechV2=structuredClone(a.mechV2);
 const formation=w.personnel.formations.find(f=>f.formationId===id),original=s.personnel.formations.find(f=>f.formationId===id);
 if(formation&&original)formation.targetStrength=original.targetStrength;
 const command={type:'RETURN_ROUTE',armyId:id,destinationTileId:route};
 const p=campaignMechPlan(w,'H06','commandPlan',{command},{command,permission:null});
 if(p.permission?.kind!=='RETURN'||(w.mechContracts?.spent?.[p.permission.tokenId]??0)>=p.permission.uses||route===own.tileId)return null;
 // A profitable attack takes priority over saving an otherwise idle action.
 if(campaignTacticalActions(w,id).some(x=>(x.p.enemyLoss??x.p.dealt??0)>0&&x.score>0&&(x.type!=='ATTACK'||x.p.enemyLoss>=x.p.allyLoss*1.2||x.score>=AI_FINISH_VALUE)))return null;
 const foes=Object.values(v.knowledge.observedArmies);
 const exposure=to=>{
  const board={...w,armies:{...w.armies,[id]:{...w.armies[id],tileId:to}}};
  let incoming=0,risk=0;
  for(const b of foes){
   // Forecast the next enemy period, including a legal public move then hit.
   const ready={...board,endedArmyIds:[],movedArmyIds:[],attackedArmyIds:[],armies:{...board.armies,[b.armyId]:{...board.armies[b.armyId],mainActionTurn:0,mainActionCount:0}}};
   const cells=[b.tileId,...api.reachable(ready,b.armyId,s.time.ticksPerTurn).keys()];
   let worst=0,disruption=0;
   for(const tileId of cells){
    if(dist(w,tileId,to)>api.attackRange(b,ready))continue;
    const probe={...ready,armies:{...ready.armies,[b.armyId]:{...ready.armies[b.armyId],tileId}}};
    if(api.attackTargets(probe,b.armyId).includes(id)){
     const p=api.threat(probe,b.armyId,id);
     worst=Math.max(worst,p.enemyLoss??0);
     disruption=Math.max(disruption,(p.formationRisk?.check?1-p.formationRisk.successProbability:0)+(p.moraleRisk?.check?1-p.moraleRisk.successProbability:0));
    }
   }
   incoming+=worst;risk+=disruption;
  }
  return {incoming,risk,score:-incoming*AI_EXPOSURE_COST-risk*AI_FORMATION_VALUE+engineAiCoverValue(board,id,to)};
 };
 const now=exposure(own.tileId),back=exposure(route);
 return (now.incoming>=own.troopCount||now.risk>0)&&back.incoming<own.troopCount&&back.score>now.score?command:null;
}

export function campaignTacticalMoves(s,v,plan,{remember=false,supplyWorld}={}){
 if(s.trialRules?.aiTacticsTempo==='c142')return c142MovesReplay(s,v,plan,{remember,supplyWorld});
 if(!campaignTacticsEnabled(s,v.factionId))return plan;
 const parts=Object.fromEntries(Object.keys(AI_TACTICS_DEFAULT_PARTS).map(k=>[k,campaignTacticsPart(s,v.factionId,k)]));
 if(parts.retreat&&Object.values(v.ownArmies).some(a=>a.commanderId==='G48')){
  const reserved=new Set();
  plan.candidates=plan.candidates.map(c=>{
   if(!campaignTacticalOrderAllowed(c)&&!['REPLENISH_ARMY','RULE_RETREAT','TACTICAL_RETREAT'].includes(c.reasonCode))return c;
   const command=campaignChooseReturnRoute(s,v,c.armyId);
   if(!command||reserved.has(command.destinationTileId))return c;
   reserved.add(command.destinationTileId);
   return {...c,...command,pathTileIds:[],reasonCode:'TACTICAL_RETREAT',aiTacticalMove:true};
  });
 }
 // Existing movement captures a hub at each step. Stopping at a hub on the
 // route added delay without gaining anything; keep destination and path.
 if(parts.cutHub){const hubs=(supplyWorld?.supply?.hubs??[]).filter(h=>v.knowledge.tiles[h.tileId]==='VISIBLE'&&api.hostile(s,v.factionId,h.factionId));
  plan.candidates=plan.candidates.map(c=>campaignTacticalOrderAllowed(c)&&c.type==='MOVE'&&hubs.some(h=>c.pathTileIds?.includes(h.tileId))?{...c,aiCutHub:true}:c);
 }
 // A cart heals on arrival. Route a wounded recipient through an existing
 // public friendly cart, rather than spending W on a tile nobody will enter.
 const carts=(v.engineMap?.structures??[]).filter(o=>o.type==='CART'&&o.factionId===v.factionId),claimed=new Set();
 if(carts.length){const board=campaignTacticsWorld(s,v,{readOnlyGrowth:true});plan.candidates=plan.candidates.map(c=>{
  const a=v.ownArmies[c.armyId];if(!a?.woundedCount||!campaignTacticalOrderAllowed(c)||s.movedArmyIds.includes(c.armyId))return c;
  const reach=api.reachable(board,c.armyId,s.time.ticksPerTurn),cart=carts.find(o=>!claimed.has(o.tileId)&&reach.has(o.tileId)&&dist(s,a.tileId,o.tileId)<=1&&!Object.values(v.knowledge.observedArmies).some(b=>dist(s,o.tileId,b.tileId)<=1));
  if(!cart)return c;claimed.add(cart.tileId);return {...c,type:'MOVE',destinationTileId:cart.tileId,pathTileIds:reach.get(cart.tileId).pathTileIds,reasonCode:'ENGINE_CART_RECOVERY',aiTacticalMove:true};
 });}
 // A concealment stop may approach a visible enemy off the strategic path.
 // Use only known cities/visible enemies; actual concealment is still settled by rules.
 if(Object.values(v.ownArmies).some(a=>a.c50?.engineId==='CHEOK')){
  const coverWorld=campaignTacticsWorld(s,v,{readOnlyGrowth:true});
  plan.candidates=plan.candidates.map(c=>{
   if(!['MOVE','HOLD'].includes(c.type)||!campaignTacticalOrderAllowed(c)||c.aiOperationWait||s.movedArmyIds.includes(c.armyId))return c;
   const a=v.ownArmies[c.armyId];if(a?.c50?.engineId!=='CHEOK')return c;
   const reach=api.reachable(coverWorld,c.armyId,s.time.ticksPerTurn),to=engineAiCoverDestination(coverWorld,c.armyId,c.pathTileIds?.length?c.pathTileIds:[a.tileId],reach);
   return to?{...c,type:'MOVE',destinationTileId:to,pathTileIds:reach.get(to).pathTileIds,reasonCode:'ENGINE_COVER',aiTacticalMove:true}:c;
  });
 }
 const foes=Object.values(v.knowledge.observedArmies);if(!foes.length||!parts.flank&&!parts.matchup&&!parts.retreat)return plan;
 const movementWorld=campaignTacticsWorld(s,v,{readOnlyGrowth:true}),w=campaignCombatProbe(movementWorld),memory=structuredClone(s.aiTactics?.[v.factionId]??{badExchanges:{}}),reserved=new Set();memory.badExchanges??={};memory.holds??={};
 plan.candidates=plan.candidates.map(c=>{
  const a=v.ownArmies[c.armyId];if(!a||c.reasonCode==='ENGINE_COVER'||!campaignTacticalOrderAllowed(c)||c.aiOperationWait||!api.active(s,a)||s.movedArmyIds.includes(a.armyId))return c;
  const nearby=foes.filter(b=>dist(s,a.tileId,b.tileId)<=5).sort((b,d)=>dist(s,a.tileId,b.tileId)-dist(s,a.tileId,d.tileId)||b.armyId.localeCompare(d.armyId)).slice(0,AI_FOCUS_UNITS);if(!nearby.length)return c;
  const reach=api.reachable(w,a.armyId,s.time.ticksPerTurn),archer=ranged(a),pursuit=api.disengage(w,a.armyId)?.dealt??0;
  const goal=v.knowledge.cities[plan.goal?.targetCityId]?.tileId??v.knowledge.observedArmies[plan.goal?.targetArmyId]?.tileId??c.destinationTileId??nearby[0].tileId;
  const evaluations=new Map();
  const evaluate=(to,path)=>{
   if(evaluations.has(to))return evaluations.get(to);
   const move=to!==a.tileId;if(move&&pursuit>=a.troopCount)return {to,path,lethal:true,score:-Infinity};
   // Approach forecasts resolve departure pursuit on a clone, including XP
   // and level-up contracts. The damage-only compact probe has no such ledger.
   const loss=move?pursuit+(api.approach(movementWorld,a.armyId,to)?.dealt??0):0;if(loss>=a.troopCount)return {to,path,lethal:true,score:-Infinity};
   const board={...w,armies:{...w.armies,[a.armyId]:{...w.armies[a.armyId],tileId:to,troopCount:a.troopCount-loss,movedTiles:a.movedTiles+path.pathTileIds.length-1,facing:move?api.direction(s.tiles[path.pathTileIds.at(-2)],s.tiles[to],a.facing):a.facing}}};board.personnel=api.personnel(board);
    return withCampaignQueries(board,()=>{
    const hits=api.attackTargets(board,a.armyId).filter(id=>nearby.some(b=>b.armyId===id)).map(targetId=>({armyId:a.armyId,type:'ATTACK',targetId,p:api.previewAttack(board,a.armyId,targetId)})).map(x=>({...x,score:scoreAction(board,x)})).sort((x,y)=>y.score-x.score);
   const hit=hits[0],city=plan.goal?.targetCityId&&api.cityTargets(board,a.armyId).includes(plan.goal.targetCityId);
   const incoming=nearby.filter(b=>dist(s,to,b.tileId)<=api.attackRange(b,board)&&api.attackTargets(board,b.armyId).includes(a.armyId)).reduce((n,b)=>n+(api.threat(board,b.armyId,a.armyId).enemyLoss??0),0);
   const cover=engineAiCoverValue(board,a.armyId,to);
   let score=(hit?.score??0)-loss-incoming*AI_EXPOSURE_COST+cover;
   if(city)score=Math.max(score,api.previewCity(board,a.armyId,plan.goal.targetCityId).dealt-loss);
   const poor=!!hit&&hit.p.enemyLoss<hit.p.allyLoss*1.2&&hit.p.enemyLoss<board.armies[hit.targetId].troopCount;
    const result={to,path,loss,hit,city,poor,score,cover,lethal:incoming>=a.troopCount-loss};evaluations.set(to,result);return result;
    });
  };
  const originalTo=c.type==='MOVE'&&reach.has(c.destinationTileId)?c.destinationTileId:a.tileId,originalPath=originalTo===a.tileId?{pathTileIds:[a.tileId],totalTicks:0}:reach.get(originalTo),baseline=evaluate(originalTo,originalPath);
  // P1: a main able to hit its chosen castle this turn keeps that arrival.
  if(baseline.city&&!baseline.lethal){reserved.add(originalTo);return c;}
  const old=memory.badExchanges[a.armyId]??{turn:0,count:0};if(old.turn!==s.turn)memory.badExchanges[a.armyId]={turn:s.turn,count:baseline.poor?old.count+1:0};
  const support=Object.values(v.ownArmies).filter(b=>b.armyId!==a.armyId&&b.troopCount>0&&b.morale!=='ROUTING');
  const backing=baseline.poor?support.filter(b=>dist(s,b.tileId,nearby[0].tileId)<=moveTiles(s,b)+(ranged(b)?2:1)).slice(0,AI_FOCUS_UNITS).some(b=>[...api.reachable(w,b.armyId,s.time.ticksPerTurn)].some(([to])=>dist(s,to,nearby[0].tileId)<=(ranged(b)?2:1))):false;
  const danger=baseline.lethal||parts.matchup&&baseline.poor&&!backing;
  const localOwn=Object.values(v.ownArmies).filter(b=>dist(s,a.tileId,b.tileId)<=3).reduce((n,b)=>n+b.troopCount,0),localEnemy=foes.filter(b=>dist(s,a.tileId,b.tileId)<=3).reduce((n,b)=>n+(b.troopCount??0),0);
  const retreat=parts.retreat&&danger&&(memory.badExchanges[a.armyId]?.count??0)>=AI_BAD_EXCHANGE_TURNS&&(!campaignAiRule(s,v.factionId,4)||localOwn/Math.max(1,localEnemy)<.8);
  if(!parts.flank&&!danger)return c;
  const options=[[a.tileId,{pathTileIds:[a.tileId],totalTicks:0}],...reach].filter(([to,path])=>!reserved.has(to)&&path.pathTileIds.every(id=>v.knowledge.tiles[id]!=='UNEXPLORED')&&(!retreat||path.pathTileIds.length<=2)&&(!archer||nearby.every(b=>dist(s,to,b.tileId)>1)));
   const promising=options.sort(([to],[other])=>engineAiCoverValue(w,a.armyId,other)-engineAiCoverValue(w,a.armyId,to)||Math.min(...nearby.map(b=>Math.abs(dist(s,to,b.tileId)-(archer?2:1))))-Math.min(...nearby.map(b=>Math.abs(dist(s,other,b.tileId)-(archer?2:1))))||dist(s,to,goal)-dist(s,other,goal)||to.localeCompare(other)).slice(0,AI_MOVE_OPTIONS);
  const evaluated=promising.map(([to,path])=>evaluate(to,path)).filter(x=>!x.lethal&&(!parts.matchup||!x.poor));
  const lastHold=memory.holds[a.armyId],canHold=lastHold?.turn!==s.turn-1;
   let best=campaignAiNearChoice(s,v.factionId,a.armyId,evaluated.filter(x=>(x.hit||x.cover&&dist(s,x.to,goal)<=dist(s,a.tileId,goal))&&x.score>baseline.score&&(x.to!==a.tileId||c.type!=='MOVE'||canHold)).sort((x,y)=>y.score-x.score),'tactical-move');
  if(!best&&danger){
   const safe=evaluated.filter(x=>x.to!==a.tileId&&dist(s,x.to,goal)<=dist(s,a.tileId,goal));
   best=safe.sort((x,y)=>dist(s,x.to,goal)-dist(s,y.to,goal)||y.score-x.score)[0];
   if(!best&&retreat)best=evaluated.filter(x=>x.to!==a.tileId).sort((x,y)=>Math.min(...support.map(b=>dist(s,x.to,b.tileId)))-Math.min(...support.map(b=>dist(s,y.to,b.tileId)))||y.score-x.score)[0];
  }
  // No useful hit and no safety exception: do not replace the strategic march
  // by screening or indefinite HOLD. Equal scores also retain C141's order.
  if(!best)return c;
  const move=best.to!==a.tileId;if(!move&&c.type==='MOVE'&&!canHold)return c;
  if(!move&&remember)memory.holds[a.armyId]={turn:s.turn};reserved.add(best.to);
  return {...c,type:move?'MOVE':'HOLD',destinationTileId:move?best.to:null,pathTileIds:move?best.path.pathTileIds:[],reasonCode:retreat?'TACTICAL_RETREAT':danger?'TACTICAL_AVOID_BAD_EXCHANGE':archer?'TACTICAL_SCREEN':'TACTICAL_FLANK',aiTacticalMove:true};
 });
 if(remember)(s.aiTactics??={})[v.factionId]=memory;
 return plan;
}

// Historical C142 movement policy, opt-in only for frozen behavior fixtures.
// The default path above implements the C142b tempo/defense contract.
const c142Protected=c=>!!c.defendCityId||['REPLENISH_ARMY','MUSTER_SIEGE','DEFEND_DAMAGED_CITY','CAPITAL_GARRISON','INTERCEPT_CITY','EXPLORE_PLACE','WITHDRAWAL'].includes(c.reasonCode)||c.reasonCode?.startsWith('C31_');
function c142OperationReplay(s,v,plan,{remember,turnLimit,route,siegePositions,siegeReady,supplyWorld}){
 const target=v.knowledge.cities[plan.goal?.targetCityId]??v.knowledge.observedArmies[plan.goal?.targetArmyId];if(!target)return plan;
 const key=target.cityId??target.armyId,eligible=plan.candidates.filter(c=>!c142Protected(c)&&api.active(s,v.ownArmies[c.armyId])&&v.ownArmies[c.armyId].morale!=='ROUTING');if(eligible.length<2)return plan;
 const main=eligible.filter(c=>!target.cityId||siegePositions(s,v,v.ownArmies[c.armyId],target,{capability:true}).length);if(!main.length)return plan;
 const mainIds=new Set(main.map(c=>c.armyId)),eligibleIds=new Set(eligible.map(c=>c.armyId)),old=s.aiOperations?.[v.factionId];
 const memory=old?.targetId===key?structuredClone(old):{targetId:key,startTurn:s.turn,stageTileId:null,phase:'ASSEMBLE'};
 const leader=main.map(c=>v.ownArmies[c.armyId]).sort((a,b)=>b.troopCount-a.troopCount||a.armyId.localeCompare(b.armyId))[0];
 if(!memory.stageTileId||v.knowledge.tiles[memory.stageTileId]==='UNEXPLORED'){
  const anchors=[...Object.values(v.ownCities).map(c=>c.tileId),...(supplyWorld?.supply?.hubs??[]).filter(h=>h.factionId===v.factionId&&h.linked).map(h=>h.tileId),...Object.values(v.tiles).filter(t=>v.knowledge.tiles[t.tileId]!=='UNEXPLORED'&&['plain','forest','hill'].includes(t.terrainType)&&dist(s,t.tileId,target.tileId)>=2&&dist(s,t.tileId,target.tileId)<=Math.max(3,moveTiles(s,leader))).map(t=>t.tileId)];
  const choices=[...new Set(anchors)].filter(to=>!Object.values(v.knowledge.observedArmies).some(b=>dist(s,to,b.tileId)<=1)&&(!api.supplyEnabled(s)||api.supplyLink(supplyWorld,leader,to).state==='SAFE')).sort((a,b)=>dist(s,a,target.tileId)-dist(s,b,target.tileId)||dist(s,a,leader.tileId)-dist(s,b,leader.tileId)||a.localeCompare(b)).slice(0,AI_MOVE_OPTIONS);
  memory.stageTileId=choices.find(to=>route(s,v,leader.armyId,to))??leader.tileId;
 }
 const gathered=eligible.filter(c=>dist(s,v.ownArmies[c.armyId].tileId,memory.stageTileId)<=AI_OPERATION_RADIUS),troops=gathered.reduce((n,c)=>n+v.ownArmies[c.armyId].troopCount,0),defenders=Object.values(v.knowledge.observedArmies).filter(b=>dist(s,b.tileId,target.tileId)<=2).reduce((n,b)=>n+b.troopCount,0);
 const ready=gathered.some(c=>mainIds.has(c.armyId))&&troops>=defenders*AI_OPERATION_FORCE_RATIO&&(!target.cityId||siegeReady(s,gathered.filter(c=>mainIds.has(c.armyId)).map(c=>v.ownArmies[c.armyId]),s.castleKnowledge?.[v.factionId]?.[target.cityId]?.durability??100));
 if(ready||s.turn-memory.startTurn>=AI_OPERATION_WAIT_TURNS||turnLimit-s.turn<=AI_OPERATION_WAIT_TURNS)memory.phase='ADVANCE';
 memory.armyIds??=eligible.map(c=>c.armyId);memory.roles=Object.fromEntries(eligible.map(c=>[c.armyId,mainIds.has(c.armyId)?'MAIN':'SUPPORT']));
 if(memory.phase==='ASSEMBLE')plan.candidates=plan.candidates.map(c=>{
  if(!eligibleIds.has(c.armyId)||api.attackTargets(s,c.armyId).length||api.cityTargets(s,c.armyId).length)return c;
  const a=v.ownArmies[c.armyId];if(dist(s,a.tileId,memory.stageTileId)<=AI_OPERATION_RADIUS)return {...c,type:'HOLD',reasonCode:'OPERATION_ASSEMBLE',destinationTileId:null,pathTileIds:[],aiTacticalMove:true};
  const path=route(s,v,c.armyId,memory.stageTileId);if(!path)return c;
  const reach=api.reachable(s,c.armyId,s.time.ticksPerTurn),to=[...path.pathTileIds].reverse().find(to=>reach.has(to)&&!Object.values(v.knowledge.observedArmies).some(b=>dist(s,to,b.tileId)<=1));
  return to?{...c,type:'MOVE',destinationTileId:to,pathTileIds:reach.get(to).pathTileIds,reasonCode:'OPERATION_ASSEMBLE',aiTacticalMove:true}:c;
 });
 if(memory.phase==='ADVANCE'){
  const marching=plan.candidates.filter(c=>mainIds.has(c.armyId)&&memory.armyIds.includes(c.armyId)&&c.type==='MOVE'),remaining=Math.max(0,...marching.map(c=>dist(s,c.destinationTileId,target.tileId)));
  plan.candidates=plan.candidates.map(c=>{
   if(!marching.includes(c)||dist(s,c.destinationTileId,target.tileId)>=remaining)return c;
   const a=v.ownArmies[c.armyId],path=c.pathTileIds.filter(to=>dist(s,to,target.tileId)>=remaining),to=path.at(-1);
   return {...c,type:to&&to!==a.tileId?'MOVE':'HOLD',destinationTileId:to&&to!==a.tileId?to:null,pathTileIds:to?c.pathTileIds.slice(0,c.pathTileIds.indexOf(to)+1):[],reasonCode:'OPERATION_ADVANCE',aiTacticalMove:true};
  });
 }
 if(memory.phase==='ADVANCE')plan.candidates=plan.candidates.map(c=>{
  if(!eligibleIds.has(c.armyId)||mainIds.has(c.armyId)||api.attackTargets(s,c.armyId).length)return c;
  const a=v.ownArmies[c.armyId],front=plan.candidates.filter(x=>mainIds.has(x.armyId)).map(x=>x.destinationTileId??v.ownArmies[x.armyId].tileId),reach=api.reachable(s,c.armyId,s.time.ticksPerTurn);
  const options=[...reach].filter(([to,path])=>path.pathTileIds.every(id=>v.knowledge.tiles[id]!=='UNEXPLORED')&&!Object.values(v.knowledge.observedArmies).some(b=>dist(s,to,b.tileId)<=1)&&front.some(f=>dist(s,to,f)<=2)&&dist(s,to,target.tileId)>=Math.min(...front.map(f=>dist(s,f,target.tileId)))).sort(([a],[b])=>dist(s,a,target.tileId)-dist(s,b,target.tileId)||a.localeCompare(b));
  return options.length?{...c,type:'MOVE',destinationTileId:options[0][0],pathTileIds:options[0][1].pathTileIds,reasonCode:'OPERATION_SUPPORT',aiTacticalMove:true}:c;
 });
 if(remember)(s.aiOperations??={})[v.factionId]=memory;plan.operation=memory;return plan;
}
function c142MovesReplay(s,v,plan,{remember,supplyWorld}){
 const hubs=(supplyWorld?.supply?.hubs??[]).filter(h=>v.knowledge.tiles[h.tileId]==='VISIBLE'&&api.hostile(s,v.factionId,h.factionId));
 plan.candidates=plan.candidates.map(c=>{if(c.type!=='MOVE'||c142Protected(c)||c.reasonCode==='OPERATION_ASSEMBLE')return c;const h=hubs.find(h=>c.pathTileIds?.includes(h.tileId)&&h.tileId!==v.ownArmies[c.armyId]?.tileId);if(!h)return c;const n=c.pathTileIds.indexOf(h.tileId);return {...c,destinationTileId:h.tileId,pathTileIds:c.pathTileIds.slice(0,n+1),reasonCode:'TACTICAL_CUT_HUB',aiTacticalMove:true};});
 const foes=Object.values(v.knowledge.observedArmies);if(!foes.length)return plan;
 const w=campaignTacticsWorld(s,v,{readOnlyGrowth:true}),memory=structuredClone(s.aiTactics?.[v.factionId]??{badExchanges:{}}),reserved=new Set();
 plan.candidates=plan.candidates.map(c=>{
  const a=v.ownArmies[c.armyId];if(!a||c142Protected(c)||['OPERATION_ASSEMBLE','TACTICAL_CUT_HUB'].includes(c.reasonCode)||!api.active(s,a)||s.movedArmyIds.includes(a.armyId))return c;
  const nearby=foes.filter(b=>dist(s,a.tileId,b.tileId)<=5).sort((b,d)=>dist(s,a.tileId,b.tileId)-dist(s,a.tileId,d.tileId)||b.armyId.localeCompare(d.armyId)).slice(0,AI_FOCUS_UNITS);if(!nearby.length)return c;
  const reach=api.reachable(w,a.armyId,s.time.ticksPerTurn),archer=ranged(a),current=campaignTacticalActions(w,a.armyId).find(x=>x.type==='ATTACK'),poor=current&&current.p.enemyLoss<current.p.allyLoss*1.2;
  const old=memory.badExchanges[a.armyId]??{turn:0,count:0};if(old.turn!==s.turn)memory.badExchanges[a.armyId]={turn:s.turn,count:poor?old.count+1:0};
  const support=Object.values(v.ownArmies).filter(b=>b.armyId!==a.armyId&&b.troopCount>0&&b.morale!=='ROUTING'),backing=poor?support.filter(b=>dist(s,b.tileId,nearby[0].tileId)<=moveTiles(s,b)+(ranged(b)?2:1)).slice(0,AI_FOCUS_UNITS).filter(b=>[...api.reachable(w,b.armyId,s.time.ticksPerTurn)].some(([to])=>dist(s,to,nearby[0].tileId)<=(ranged(b)?2:1))):[];
  const retreat=poor&&(memory.badExchanges[a.armyId]?.count??0)>=AI_BAD_EXCHANGE_TURNS&&!backing.length;
  const promising=[[a.tileId,{pathTileIds:[a.tileId],totalTicks:0}],...reach].filter(([to,path])=>!reserved.has(to)&&path.pathTileIds.every(id=>v.knowledge.tiles[id]!=='UNEXPLORED')&&(!retreat||path.pathTileIds.length<=2)&&(!archer||nearby.every(b=>dist(s,to,b.tileId)>1))).sort(([to],[other])=>Math.min(...nearby.map(b=>Math.abs(dist(s,to,b.tileId)-(archer?2:1))))-Math.min(...nearby.map(b=>Math.abs(dist(s,other,b.tileId)-(archer?2:1))))||to.localeCompare(other)).slice(0,AI_MOVE_OPTIONS);
  if(!promising.some(([to])=>to===a.tileId))promising.push([a.tileId,{pathTileIds:[a.tileId],totalTicks:0}]);
  const pursuit=api.disengage(w,a.armyId)?.dealt??0;let best=null;
  for(const [to,path] of promising){
   if(archer&&nearby.some(b=>dist(s,to,b.tileId)<=1))continue;const move=to!==a.tileId;if(move&&pursuit>=a.troopCount)continue;
   const loss=move?pursuit+(api.approach(w,a.armyId,to)?.dealt??0):0;if(loss>=a.troopCount)continue;
   const board={...w,armies:{...w.armies,[a.armyId]:{...w.armies[a.armyId],tileId:to,troopCount:a.troopCount-loss,movedTiles:a.movedTiles+path.pathTileIds.length-1,facing:move?api.direction(s.tiles[path.pathTileIds.at(-2)],s.tiles[to],a.facing):a.facing}}};board.personnel=api.personnel(board);
   const hits=api.attackTargets(board,a.armyId).filter(id=>nearby.some(b=>b.armyId===id)).map(targetId=>({targetId,p:api.previewAttack(board,a.armyId,targetId)})).sort((x,y)=>y.p.enemyLoss-y.p.allyLoss*1.2-(x.p.enemyLoss-x.p.allyLoss*1.2));
   const hit=hits[0];let score=hit?hit.p.enemyLoss-hit.p.allyLoss*1.2+(hit.p.enemyLoss>=board.armies[hit.targetId].troopCount?AI_FINISH_VALUE:0):-20;score-=loss;
   const exposed=nearby.filter(b=>dist(s,to,b.tileId)<=2).reduce((n,b)=>n+(api.side(board,b.armyId,a.armyId)==='REAR'?b.troopCount*.1:api.side(board,b.armyId,a.armyId)==='FLANK'?b.troopCount*.05:0),0);score-=exposed*AI_EXPOSURE_COST;
   if(archer&&support.some(b=>!ranged(b)&&dist(s,to,b.tileId)<=2&&dist(s,b.tileId,nearby[0].tileId)<dist(s,to,nearby[0].tileId)))score+=AI_FORMATION_VALUE;
   if(retreat)score-=(support.length?Math.min(...support.map(b=>dist(s,to,b.tileId))):Math.min(...Object.values(v.ownCities).map(b=>dist(s,to,b.tileId))))*AI_FORMATION_VALUE;
   if(api.supplyEnabled(s)&&api.supplyLink(supplyWorld,a,to).state==='CUT')score-=AI_FORMATION_VALUE;if(!best||score>best.score)best={to,path,score,hit};
  }
  if(!best)return c;const move=best.to!==a.tileId;reserved.add(best.to);
  if(best.hit&&best.hit.p.enemyLoss<best.hit.p.allyLoss*1.2&&!retreat)return {...c,type:'HOLD',destinationTileId:null,pathTileIds:[],reasonCode:'TACTICAL_WAIT_SUPPORT',aiTacticalMove:true};
  return {...c,type:move?'MOVE':'HOLD',destinationTileId:move?best.to:null,pathTileIds:move?best.path.pathTileIds:[],reasonCode:retreat?'TACTICAL_RETREAT':archer?'TACTICAL_SCREEN':'TACTICAL_FLANK',aiTacticalMove:true};
 });
 if(remember)(s.aiTactics??={})[v.factionId]=memory;return plan;
}
