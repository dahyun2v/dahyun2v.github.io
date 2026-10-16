import {hexDistance} from './map-primitives.mjs';
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
const previewDiagnostics={skipped:0,reasons:{}};
export const campaignTacticsDiagnostics=()=>structuredClone(previewDiagnostics);
export function configureAiTactics(services){api=services;}
// A2 exception is a legal capture now, never a distant offensive forecast.
export function campaignCapitalCaptureNow(s,v,id,targets){
 const capitals=targets.filter(cityId=>{const c=v.knowledge.cities[cityId];return c?.ownerFactionId&&c.ownerFactionId!==v.factionId&&s.factions[c.ownerFactionId]?.capitalCityId===cityId;});
 if(!capitals.length)return null;
 const zero=capitals.find(cityId=>s.castleKnowledge?.[v.factionId]?.[cityId]?.durability===0);if(zero)return zero;
 if(!api||!s.officers)return null;
 const board=campaignTacticsWorld(s,v);
 return capitals.find(cityId=>board.cities[cityId]&&api.cityTargets(board,id).includes(cityId)&&api.previewCity(board,id,cityId).dealt>=board.cities[cityId].durability)??null;
}
// C179: default tactics on modern maps; explicit historical profiles replay.
export const campaignTacticsEnabled=(s,f)=>['v2','v3'].includes(s.mapId)&&!['legacy','siege','strategy'].includes(s.trialRules?.aiProfile?.[f]??s.trialRules?.aiSiege);
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
 for(const b of Object.values(v.knowledge.observedArmies))if(v.knowledge.tiles[b.tileId]==='VISIBLE'){
  const a=s.armies[b.armyId];Object.assign(b,{facing:a.facing,formation:a.formation,morale:a.morale});
  b.troopCount??=a.troopCount;
 }
 v.knowledge.observedArmies=Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([,b])=>v.knowledge.tiles[b.tileId]==='VISIBLE'&&api.hostile(s,f,b.factionId)&&!api.withdrawal(s,b.armyId)));
 return v;
}
export function campaignTacticsWorld(s,v){
 const own=Object.values(v.ownArmies),template=own[0];if(!template)return null;
 const probe={...s,armies:structuredClone(v.ownArmies),officers:structuredClone(v.officers),tiles:Object.fromEntries(Object.entries(v.tiles).map(([id,t])=>[id,v.knowledge.tiles[id]==='UNEXPLORED'?{...t,terrainType:'mountain'}:t])),history:[],combatLog:[],lastCombat:null,terminal:null,aiQueue:[],gameResult:null,
  campaignGrowth:{...s.campaignGrowth,officers:Object.fromEntries(Object.entries(s.campaignGrowth.officers).filter(([id])=>v.officers[id]).map(([id,r])=>[id,structuredClone(r)]))},
  c31Disabled:true,c45Disabled:true,c46Disabled:true,dejaVuDisabled:true,cities:{},knowledge:{},factions:structuredClone(s.factions)};
 const cityTemplate=Object.values(v.ownCities)[0]??Object.values(s.cities)[0];
 for(const c of Object.values(s.cities)){
  const known=v.ownCities[c.cityId]??v.knowledge.cities[c.cityId],castle=s.castleKnowledge?.[v.factionId]?.[c.cityId];
  probe.cities[c.cityId]=v.ownCities[c.cityId]?structuredClone(v.ownCities[c.cityId]):{...structuredClone(cityTemplate),cityId:c.cityId,tileId:c.tileId,kind:c.kind,name:c.name,ownerFactionId:known?.ownerFactionId??null,governorId:null,facilities:[],reserveTroops:0,foodStock:0,securityLevel:known?.securityLevel??0,...(castle?structuredClone(castle):{durability:100,durabilityMax:100,footprint:structuredClone(c.footprint)})};
 }
 for(const b of Object.values(v.knowledge.observedArmies)){
  const commanderId=`AI.PUBLIC.${b.armyId}`,o=structuredClone(v.officers[template.commanderId]);
  Object.assign(o,{officerId:commanderId,name:b.armyId,allegianceFactionId:b.factionId,locationRef:{kind:'ARMY',id:b.armyId},uniqueTrait:null,acquiredTraits:[],activeTraits:[],tactics:[],c34Abilities:null,baseStats:Object.fromEntries(Object.keys(o.baseStats).map(k=>[k,AI_PUBLIC_STAT])),aptitude:{militia:'B',spear:'B',bow:'B',archer:'B',cavalry:'B'},allowedTroops:[b.troopType]});
  probe.officers[commanderId]=o;
  probe.armies[b.armyId]={...structuredClone(template),...b,commanderId,troopCount:b.troopCount,hp:Math.max(1,b.troopCount*2),maxHp:Math.max(1,b.troopCount*2),effectStates:[],c27:null,c28:null,c29:null,c32:null,c33:null,c34:null,classState:null,tacticReadyTurns:{},mainActionTurn:0,mainActionCount:0,movedTiles:0,braced:false};
 }
 // Every hypothetical observer sees just the actor's public board. No hidden
 // unit can become a counter, assist, pursuit or approach-fire source.
 for(const f of Object.keys(probe.factions)){
  probe.knowledge[f]={tiles:{...v.knowledge.tiles},cities:structuredClone(v.knowledge.cities),lastSeenArmies:{},observedArmies:Object.fromEntries(Object.values(probe.armies).filter(a=>a.factionId!==f).map(a=>[a.armyId,{...a}]))};
  if(f!==v.factionId){probe.factions[f].science=0;probe.factions[f].prestige=0;probe.factions[f].research={stage:0,reachedTurns:[]};}
 }
 probe.campaignTerminalWorld={armiesById:Object.fromEntries(Object.keys(probe.armies).map(id=>[id,{disposition:'ACTIVE'}]))};
 probe.personnel=api.personnel(probe);
 return probe;
}

// Pure damage/position queries never draft or learn cards. Carry the complete
// active definitions and bindings, but exclude unowned offers and their large
// pool fingerprint from the state cloned by prepareAttackEffects. Full tactic
// simulations still use campaignTacticsWorld, including all growth contracts.
export function campaignCombatProbe(s){
 if(s.trialRules?.aiCombatCompact===false)return s;
 const officers=Object.fromEntries(Object.entries(s.campaignGrowth?.officers??{}).map(([id,r])=>{
  const keep=new Set([r.coreId,r.representativeId,...Object.keys(r.track.growthStates[id]?.ownedTraitRanks??{}),...(r.equippedTacticIds??[])]);
  const collect=x=>{if(typeof x==='string'&&r.cards[x])keep.add(x);else if(Array.isArray(x))x.forEach(collect);else if(x&&typeof x==='object')for(const [k,v] of Object.entries(x)){if(r.cards[k])keep.add(k);collect(v);}};
  collect(r.c29);
  return [id,{...r,cards:Object.fromEntries(Object.entries(r.cards).filter(([key])=>keep.has(key))),pool:{...r.pool,traits:[]},track:{...r.track,poolFingerprint:'',draftsById:{},draftOrder:[],entitlementsById:{},entitlementOrder:[],processedRequests:{},actionClaims:{}}}];
 }));
 return {...s,campaignGrowth:{...s.campaignGrowth,officers}};
}

export function campaignOperationPlan(s,v,plan,{remember=false,turnLimit=26,route,siegePositions,siegeReady,supplyWorld}={}){
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
const actionCommand=x=>({type:x.type,targetId:x.targetId,...(x.traitId?{traitId:x.traitId}:{})});
function scoreAction(w,x){
 const t=w.armies[x.targetId],city=w.cities[x.targetId],p=x.p,enemy=p.enemyLoss??p.dealt??0,ally=p.allyLoss??0;
 const finish=t?enemy>=t.troopCount:city&&(p.dealt??enemy)>=city.durability;
 const formation=predictedFormation(p,x.targetId),disrupt=formation&&formation!==t?.formation;
 const f=w.armies[x.armyId].factionId,view=campaignAiRule(w,f,6)?api.publicView(w,f):null,posture=view?campaignAiPosture(w,view,[]):null;
 return (finish?AI_FINISH_VALUE:0)+enemy-ally*(posture?.lossWeight??1.2)+(disrupt?AI_FORMATION_VALUE:0)+(p.formationRisk?.check?AI_FORMATION_VALUE*(1-p.formationRisk.successProbability):0)-(x.type==='TACTIC'?AI_TACTIC_RESERVE_COST:0);
}
export function campaignTacticalActions(w,id){
 if(!w.armies[id]||!api.canAct(w,id)||w.endedArmyIds.includes(id))return [];
 const probe=campaignCombatProbe(w);
 const rows=api.attackTargets(probe,id).map(targetId=>({armyId:id,type:'ATTACK',targetId,p:api.previewAttack(probe,id,targetId)}));
 for(const targetId of api.cityTargets(probe,id))rows.push({armyId:id,type:'CITY',targetId,p:api.previewCity(probe,id,targetId)});
 const timing=campaignTacticsPart(w,w.armies[id].factionId,'tacticTiming');
 const contact=Object.values(w.armies).some(b=>b.factionId!==w.armies[id].factionId&&dist(w,b.tileId,w.armies[id].tileId)<=2);
 if(!timing||contact||rows.some(x=>x.type==='CITY'))for(const c of api.tactics(w,id))for(const targetId of c.targets.filter(t=>api.useful(w,id,c,t)).slice(0,AI_FOCUS_UNITS)){
  let p;
  try{p=api.previewTactic(w,id,c.traitId,targetId);}
  catch(error){
   // Some legacy tactic previews run the entire terminal/personnel adapter.
   // Its hidden roster requirements cannot be satisfied by a public board.
   // Do not fall back to canonical enemy data: omit that tactic explicitly.
   const reason=String(error.message);previewDiagnostics.skipped++;previewDiagnostics.reasons[reason]=(previewDiagnostics.reasons[reason]??0)+1;continue;
  }
  const x={armyId:id,type:'TACTIC',traitId:c.traitId,targetId,p,signature:!!c.signature};
  const basic=rows.find(x=>x.targetId===targetId),formation=predictedFormation(p,targetId),enemy=w.armies[targetId];
  // Preserve cooldown for marginal damage. Controls/formation, a finish,
  // capture or the last safe shot before engagement justify spending it.
  const loss=p.enemyLoss??0,opportunity=ranged(w.armies[id])&&enemy&&dist(w,w.armies[id].tileId,enemy.tileId)===2;
  if(!timing||formation&&formation!==enemy?.formation||loss>=(enemy?.troopCount??Infinity)||p.cityId&&(p.dealt??loss)>=(w.cities[p.cityId]?.durability??Infinity)||loss>(basic?.p.enemyLoss??0)+AI_TACTIC_RESERVE_COST||opportunity&&loss>0||(p.moraleChanges??[]).some(m=>m.to==='ROUTING'))rows.push(x);
 }
 const f=w.armies[id].factionId,unit=w.armies[id];
 return rows.filter(x=>{
  if(campaignTacticsEnabled(w,f)&&campaignAiRule(w,f,6)&&w.armies[x.targetId]&&(x.p.allyLoss??0)>0&&campaignAiExchange(x.p)<.7)return false;
  if(!campaignAiRule(w,f,2)||x.type==='CITY'||!w.armies[x.targetId])return true;
  const mine=Object.values(w.armies).filter(a=>a.factionId===f&&dist(w,a.tileId,w.armies[x.targetId].tileId)<=3).reduce((n,a)=>n+a.troopCount,0),foe=Object.values(w.armies).filter(a=>a.factionId!==f&&dist(w,a.tileId,unit.tileId)<=3).reduce((n,a)=>n+a.troopCount,0);
  return campaignAiExchange(x.p)>=1.2||campaignAiLaunch(w,f,id,mine/Math.max(1,foe));
 }).map(x=>({...x,score:scoreAction(w,x)})).sort((a,b)=>b.score-a.score||a.type.localeCompare(b.type)||a.targetId.localeCompare(b.targetId)||String(a.traitId).localeCompare(String(b.traitId)));
}
function applyPrediction(w,x){
 const next={...w,armies:structuredClone(w.armies),cities:structuredClone(w.cities),endedArmyIds:[...w.endedArmyIds,x.armyId]},p=x.p;
 if(p.units?.length)for(const u of p.units){const a=next.armies[u.unitId];if(a){a.troopCount=u.postBattleCount;a.hp=Math.max(0,a.troopCount*2);}}
 else {const t=next.armies[x.targetId],a=next.armies[x.armyId];if(t){t.troopCount=Math.max(0,t.troopCount-(p.enemyLoss??0));t.hp=t.troopCount*2;}a.troopCount=Math.max(0,a.troopCount-(p.allyLoss??0));a.hp=a.troopCount*2;}
 if(next.cities[x.targetId])next.cities[x.targetId].durability=Math.max(0,next.cities[x.targetId].durability-(p.dealt??p.enemyLoss??0));
 for(const f of [...(p.earlyFormationChanges??[]),...(p.formationChanges??[])])if(next.armies[f.armyId])next.armies[f.armyId].formation=f.to;
 next.personnel=api.personnel(next);
 // Stochastic formation checks use their expected value in scoring; only
 // explicit preview changes are applied. No fabricated successful roll.
 return next;
}
export function campaignFocusOrder(w,ids){
 const rule9=campaignAiRule(w,w.armies[ids[0]]?.factionId,9),candidates=rule9?AI_RULE_FOCUS_CANDIDATES:AI_FOCUS_BEAM,width=rule9?AI_RULE_FOCUS_BEAM:AI_FOCUS_BEAM;
 const active=ids.filter(id=>api.canAct(w,id)&&!w.endedArmyIds.includes(id)),near=active.filter(id=>api.attackTargets(w,id).length||api.cityTargets(w,id).length).slice(0,AI_FOCUS_UNITS);
 let best={score:0,actions:[]},beam=[{board:w,left:near,actions:[],score:0}];
 // A global beam bounds the entire search, including permutations, rather
 // than branching twice at every node of a factorial tree.
 for(let depth=0;depth<near.length;depth++){
  const next=[];
  for(const branch of beam)for(const id of branch.left)for(const x of campaignTacticalActions(branch.board,id).slice(0,candidates)){
   if(x.score<0)continue;
   const node={board:applyPrediction(branch.board,x),left:branch.left.filter(a=>a!==id),actions:[...branch.actions,x],score:branch.score+x.score};
   next.push(node);if(node.score>best.score)best=node;
  }
  beam=next.sort((a,b)=>b.score-a.score).slice(0,width);if(!beam.length)break;
 }
 return [...best.actions.map(x=>({armyId:x.armyId,action:actionCommand(x)})),...active.filter(id=>!best.actions.some(x=>x.armyId===id)).map(armyId=>({armyId,action:null}))];
}
export function campaignChooseTacticalAction(s,f,id,preferred=null,goalCityId=null){
 const a=s.armies[id];if(!a||!api.canAct(s,id)||s.endedArmyIds.includes(id))return null;
 // A distant idle/rear unit cannot fire, use a contact tactic or hit a
 // castle. Avoid rebuilding its public board and the static known-edge list.
 if(!api.attackTargets(s,id).length&&!api.cityTargets(s,id).length&&!Object.values(s.knowledge[f].observedArmies).some(b=>s.knowledge[f].tiles[b.tileId]==='VISIBLE'&&dist(s,a.tileId,b.tileId)<=2))return null;
 const w=campaignTacticsWorld(s,campaignTacticsView(s,f));if(!w)return null;
 const options=campaignTacticalActions(w,id);
 if(preferred?.defendGate){const defense=options.find(x=>x.targetId===preferred.targetId&&x.score>=0&&(x.type!=='ATTACK'||x.p.enemyLoss>=x.p.allyLoss*1.2||x.score>=AI_FINISH_VALUE));if(defense)return actionCommand(defense);}
 // A legal castle hit was the strategic purpose of this main's arrival.
 // Field finishing must not consume that capture opportunity instead.
 const siege=goalCityId&&options.filter(x=>x.targetId===goalCityId&&w.cities[x.targetId]).sort((a,b)=>b.score-a.score)[0];
 if(siege)return actionCommand(siege);
 const signature=!campaignTacticsPart(s,f,'tacticTiming')&&options.find(x=>x.type==='TACTIC'&&x.signature);
 if(signature)return actionCommand(signature);
 const safe=options.filter(x=>x.score>=0&&(x.type!=='ATTACK'||x.p.enemyLoss>=x.p.allyLoss*1.2||x.score>=AI_FINISH_VALUE));
 const best=options.find(x=>preferred&&x.type===preferred.type&&x.targetId===preferred.targetId&&x.traitId===preferred.traitId&&safe.includes(x))??campaignAiNearChoice(s,f,id,safe,'tactical-action');
 return best&&best.score>=0&&(best.type!=='ATTACK'||best.p.enemyLoss>=best.p.allyLoss*1.2||best.score>=AI_FINISH_VALUE)?actionCommand(best):null;
}

export function campaignTacticalMoves(s,v,plan,{remember=false,supplyWorld}={}){
 if(s.trialRules?.aiTacticsTempo==='c142')return c142MovesReplay(s,v,plan,{remember,supplyWorld});
 if(!campaignTacticsEnabled(s,v.factionId))return plan;
 const parts=Object.fromEntries(Object.keys(AI_TACTICS_DEFAULT_PARTS).map(k=>[k,campaignTacticsPart(s,v.factionId,k)]));
 // Existing movement captures a hub at each step. Stopping at a hub on the
 // route added delay without gaining anything; keep destination and path.
 if(parts.cutHub){const hubs=(supplyWorld?.supply?.hubs??[]).filter(h=>v.knowledge.tiles[h.tileId]==='VISIBLE'&&api.hostile(s,v.factionId,h.factionId));
  plan.candidates=plan.candidates.map(c=>campaignTacticalOrderAllowed(c)&&c.type==='MOVE'&&hubs.some(h=>c.pathTileIds?.includes(h.tileId))?{...c,aiCutHub:true}:c);
 }
 const foes=Object.values(v.knowledge.observedArmies);if(!foes.length||!parts.flank&&!parts.matchup&&!parts.retreat)return plan;
 const movementWorld=campaignTacticsWorld(s,v),w=campaignCombatProbe(movementWorld),memory=structuredClone(s.aiTactics?.[v.factionId]??{badExchanges:{}}),reserved=new Set();memory.badExchanges??={};memory.holds??={};
 plan.candidates=plan.candidates.map(c=>{
  const a=v.ownArmies[c.armyId];if(!a||!campaignTacticalOrderAllowed(c)||c.aiOperationWait||!api.active(s,a)||s.movedArmyIds.includes(a.armyId))return c;
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
   const hits=api.attackTargets(board,a.armyId).filter(id=>nearby.some(b=>b.armyId===id)).map(targetId=>({armyId:a.armyId,type:'ATTACK',targetId,p:api.previewAttack(board,a.armyId,targetId)})).map(x=>({...x,score:scoreAction(board,x)})).sort((x,y)=>y.score-x.score);
   const hit=hits[0],city=plan.goal?.targetCityId&&api.cityTargets(board,a.armyId).includes(plan.goal.targetCityId);
   const incoming=nearby.filter(b=>dist(s,to,b.tileId)<=api.attackRange(b,board)&&api.attackTargets(board,b.armyId).includes(a.armyId)).reduce((n,b)=>n+(api.threat(board,b.armyId,a.armyId).enemyLoss??0),0);
   let score=(hit?.score??0)-loss-incoming*AI_EXPOSURE_COST;
   if(city)score=Math.max(score,api.previewCity(board,a.armyId,plan.goal.targetCityId).dealt-loss);
   const poor=!!hit&&hit.p.enemyLoss<hit.p.allyLoss*1.2&&hit.p.enemyLoss<board.armies[hit.targetId].troopCount;
   const result={to,path,loss,hit,city,poor,score,lethal:incoming>=a.troopCount-loss};evaluations.set(to,result);return result;
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
  const promising=options.sort(([to],[other])=>Math.min(...nearby.map(b=>Math.abs(dist(s,to,b.tileId)-(archer?2:1))))-Math.min(...nearby.map(b=>Math.abs(dist(s,other,b.tileId)-(archer?2:1))))||dist(s,to,goal)-dist(s,other,goal)||to.localeCompare(other)).slice(0,AI_MOVE_OPTIONS);
  const evaluated=promising.map(([to,path])=>evaluate(to,path)).filter(x=>!x.lethal&&(!parts.matchup||!x.poor));
  const lastHold=memory.holds[a.armyId],canHold=lastHold?.turn!==s.turn-1;
  let best=campaignAiNearChoice(s,v.factionId,a.armyId,evaluated.filter(x=>x.hit&&x.score>baseline.score&&(x.to!==a.tileId||c.type!=='MOVE'||canHold)).sort((x,y)=>y.score-x.score),'tactical-move');
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
 const w=campaignTacticsWorld(s,v),memory=structuredClone(s.aiTactics?.[v.factionId]??{badExchanges:{}}),reserved=new Set();
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
