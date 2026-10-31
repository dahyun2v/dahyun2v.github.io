import {neighbors,tileId,hexDistance} from './map-primitives.mjs';
import {
  createFirst3FailedAttackRecord,
  planFirst3StrategicAiBatch,
  validateFirst3StrategicAiSnapshot,
} from './first3-strategic-ai.mjs';

const FORMAT='first3-strategic-ai-runtime-adapter-batch';
const VERSION=1;
const PUBLIC_VIEW_KEYS=[
  'scenarioMode','globalTick','world','los','combat','history','characterHistory','strategic','growth',
  'citySettlement','recruitment','detachment','terminal','integrationSlots',
];
const PUBLIC_WORLD_KEYS=[
  'factionId','turnNumber','currentDate','time','turnPhase','ui','faction','officers','ownArmies',
  'ownCities','knowledge','tiles','knownEdges','contacts',
];
const PUBLIC_KNOWLEDGE_KEYS=['tiles','observedArmies','lastSeenArmies','cities'];
const KNOWLEDGE=new Set(['VISIBLE','REMEMBERED','UNEXPLORED']);
const KNOWN=new Set(['VISIBLE','REMEMBERED']);
const TROOP_MOVEMENT_CLASS=Object.freeze({spear:'normal',bow:'normal',militia:'normal',mystic:'normal',cavalry:'cavalry',engineer:'engineer'});
const ATTACK_RANGE=Object.freeze({BASIC_ATTACK:1,RANGED_VOLLEY:3});

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const text=value=>typeof value==='string'&&value.length>0;
const clone=value=>structuredClone(value);
const by=(...keys)=>(left,right)=>{
  for(const key of keys){const order=String(left[key]).localeCompare(String(right[key]),'en');if(order)return order;}
  return 0;
};
function invariant(condition,message){if(!condition)throw new Error(message);}
function exactKeys(value,keys,message){
  invariant(object(value),message);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  invariant(actual.length===expected.length&&actual.every((key,index)=>key===expected[index]),`${message}:${actual.join(',')}`);
}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fingerprint(value){
  let hash=0x811c9dc5;
  for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;
  return hash.toString(16).padStart(8,'0');
}

function validateRuntimePublicView(view){
  exactKeys(view,PUBLIC_VIEW_KEYS,'AI_RUNTIME_PUBLIC_VIEW_KEYS_MUST_BE_EXACT');
  exactKeys(view.world,PUBLIC_WORLD_KEYS,'AI_RUNTIME_PUBLIC_WORLD_KEYS_MUST_BE_EXACT');
  exactKeys(view.world.knowledge,PUBLIC_KNOWLEDGE_KEYS,'AI_RUNTIME_PUBLIC_KNOWLEDGE_KEYS_MUST_BE_EXACT');
  invariant(text(view.scenarioMode)&&integer(view.globalTick),'INVALID_AI_RUNTIME_PUBLIC_IDENTITY');
  invariant(view.terminal===null||object(view.terminal),'INVALID_AI_RUNTIME_PUBLIC_TERMINAL');
  const world=view.world;
  invariant(text(world.factionId)&&object(world.faction)&&world.faction.factionId===world.factionId,'INVALID_AI_RUNTIME_PUBLIC_FACTION');
  invariant(integer(world.turnNumber,1)&&object(world.time)&&integer(world.time.tick)&&integer(world.time.ticksPerTurn,1),'INVALID_AI_RUNTIME_PUBLIC_TIME');
  invariant(view.globalTick===(world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick,'AI_RUNTIME_PUBLIC_GLOBAL_TICK_MISMATCH');
  for(const key of ['ownArmies','ownCities','tiles'])invariant(object(world[key]),`INVALID_AI_RUNTIME_PUBLIC_COLLECTION:${key}`);
  for(const key of PUBLIC_KNOWLEDGE_KEYS)invariant(object(world.knowledge[key]),`INVALID_AI_RUNTIME_PUBLIC_KNOWLEDGE_COLLECTION:${key}`);
  const tileIds=Object.keys(world.tiles),knowledgeIds=Object.keys(world.knowledge.tiles);
  invariant(stable([...tileIds].sort())===stable([...knowledgeIds].sort()),'AI_RUNTIME_PUBLIC_TILE_KNOWLEDGE_SET_MISMATCH');
  for(const id of tileIds){
    const tile=world.tiles[id],knowledge=world.knowledge.tiles[id];
    invariant(KNOWLEDGE.has(knowledge)&&object(tile)&&tile.tileId===id&&integer(tile.q,-Number.MAX_SAFE_INTEGER)&&integer(tile.r,-Number.MAX_SAFE_INTEGER),'INVALID_AI_RUNTIME_PUBLIC_TILE');
    if(knowledge==='UNEXPLORED')exactKeys(tile,['tileId','q','r'],`AI_RUNTIME_UNEXPLORED_TILE_KEYS_MUST_BE_EXACT:${id}`);
    else exactKeys(tile,['tileId','q','r','terrainType'],`AI_RUNTIME_KNOWN_TILE_KEYS_MUST_BE_EXACT:${id}`);
  }
  invariant(Array.isArray(world.knownEdges),'INVALID_AI_RUNTIME_PUBLIC_KNOWN_EDGES');
  const edgeIds=new Set(),edgePairs=new Set();
  for(const edge of world.knownEdges){
    exactKeys(edge,['edgeId','fromTileId','toTileId','knowledge','blocked','travelTicksByClass'],'AI_RUNTIME_PUBLIC_EDGE_KEYS_MUST_BE_EXACT');
    invariant(text(edge.edgeId)&&text(edge.fromTileId)&&text(edge.toTileId)&&edge.fromTileId!==edge.toTileId&&KNOWN.has(edge.knowledge)&&typeof edge.blocked==='boolean','INVALID_AI_RUNTIME_PUBLIC_EDGE');
    invariant(KNOWN.has(world.knowledge.tiles[edge.fromTileId])&&KNOWN.has(world.knowledge.tiles[edge.toTileId]),'AI_RUNTIME_PUBLIC_EDGE_ENDPOINT_MUST_BE_KNOWN');
    invariant(neighbors(world.tiles[edge.fromTileId]).some(point=>tileId(point)===edge.toTileId),'AI_RUNTIME_PUBLIC_EDGE_ENDPOINTS_MUST_BE_ADJACENT');
    const expectedKnowledge=world.knowledge.tiles[edge.fromTileId]==='VISIBLE'&&world.knowledge.tiles[edge.toTileId]==='VISIBLE'?'VISIBLE':'REMEMBERED';
    invariant(edge.knowledge===expectedKnowledge,'AI_RUNTIME_PUBLIC_EDGE_KNOWLEDGE_MISMATCH');
    exactKeys(edge.travelTicksByClass,['normal','cavalry','engineer'],'AI_RUNTIME_PUBLIC_EDGE_TRAVEL_KEYS_MUST_BE_EXACT');
    for(const value of Object.values(edge.travelTicksByClass))invariant(value===null||integer(value,1),'INVALID_AI_RUNTIME_PUBLIC_EDGE_TRAVEL_TICKS');
    if(edge.blocked)invariant(Object.values(edge.travelTicksByClass).every(value=>value===null),'BLOCKED_AI_RUNTIME_PUBLIC_EDGE_CANNOT_HAVE_TRAVEL_TICKS');
    const pair=[edge.fromTileId,edge.toTileId].sort((a,b)=>a.localeCompare(b,'en')).join('|');
    invariant(!edgeIds.has(edge.edgeId)&&!edgePairs.has(pair),'DUPLICATE_AI_RUNTIME_PUBLIC_EDGE');edgeIds.add(edge.edgeId);edgePairs.add(pair);
  }
  for(const [armyId,army] of Object.entries(world.ownArmies)){
    invariant(army.armyId===armyId&&army.factionId===world.factionId&&text(army.tileId)&&Object.hasOwn(world.tiles,army.tileId)&&text(army.troopType),'INVALID_AI_RUNTIME_PUBLIC_OWN_ARMY');
    invariant(Object.hasOwn(TROOP_MOVEMENT_CLASS,army.troopType),`UNSUPPORTED_AI_RUNTIME_TROOP:${army.troopType}`);
  }
  for(const [armyId,army] of Object.entries(world.knowledge.observedArmies)){
    invariant(army.armyId===armyId&&army.factionId!==world.factionId&&world.knowledge.tiles[army.tileId]==='VISIBLE'&&text(army.troopType),'INVALID_AI_RUNTIME_PUBLIC_OBSERVED_ARMY');
  }
  return view;
}

function eligibility(view){
  const world=view.world;
  if(view.terminal?.gameResult!==null&&view.terminal?.gameResult!==undefined)return {eligible:false,reasonCode:'CAMPAIGN_ENDED'};
  if(world.turnPhase!=='PLANNING'||world.time.tick!==0)return {eligible:false,reasonCode:'NOT_PLANNING_BOUNDARY'};
  if(world.faction.alive!==true)return {eligible:false,reasonCode:'FACTION_EXTINCT'};
  if(Object.keys(world.ownCities).length===0)return {eligible:false,reasonCode:'NO_OWN_CITY'};
  if(Object.keys(world.ownArmies).length===0)return {eligible:false,reasonCode:'NO_ACTIVE_ARMY'};
  return {eligible:true,reasonCode:null};
}

function publicTiles(world){
  return Object.keys(world.tiles).sort((a,b)=>a.localeCompare(b,'en')).map(id=>{
    const source=world.tiles[id],knowledge=world.knowledge.tiles[id];
    return knowledge==='UNEXPLORED'
      ?{tileId:id,q:source.q,r:source.r,knowledge}
      :{tileId:id,q:source.q,r:source.r,knowledge,terrainType:source.terrainType};
  });
}

function frontierTileIds(world){
  const tileMap=world.tiles,knowledge=world.knowledge.tiles;
  return Object.keys(tileMap).filter(id=>KNOWN.has(knowledge[id])&&neighbors(tileMap[id]).some(point=>{
    const adjacent=tileId(point);return Object.hasOwn(tileMap,adjacent)&&knowledge[adjacent]==='UNEXPLORED';
  })).sort((a,b)=>a.localeCompare(b,'en'));
}

function publicEdges(world){
  return [...world.knownEdges].sort(by('edgeId')).map(edge=>({
    edgeId:edge.edgeId,
    fromTileId:edge.fromTileId,
    toTileId:edge.toTileId,
    knowledge:edge.knowledge,
    blocked:edge.blocked,
    travelTicksByClass:{normal:edge.travelTicksByClass.normal,cavalry:edge.travelTicksByClass.cavalry,engineer:edge.travelTicksByClass.engineer},
  }));
}

function actionAvailable(view,armyId,actionId){
  return view.combat?.units?.[armyId]?.actionAvailability?.[actionId]?.available===true;
}

function publicIdentityTactics(view){
  const world=view.world,armies=Object.values(world.ownArmies).sort(by('armyId'));
  return armies.flatMap(army=>{
    const actionId=world.factionId==='F01'&&army.commanderId==='G07'?'ART-G07':world.factionId==='F03'&&army.commanderId==='G08'?'ART-G08':null;
    if(!actionId)return [];
    const types=new Set(),targets=[];
    if(actionId==='ART-G08')for(const target of armies){
      const unit=view.combat.units[target.armyId];
      if(target.armyId===army.armyId||target.troopType===army.troopType||types.has(target.troopType)||!unit?.own||unit.activePersonnel<=0||unit.currentHp<=0||unit.routePending||unit.morale>=unit.moraleMax||target.movementState!=null||['PLANNED','ACTIVE','WAITING_FOR_TILE','CONTACT','EDGE_CONTACT'].includes(target.currentOrder?.status))continue;
      if(hexDistance(world.tiles[army.tileId],world.tiles[target.tileId])!==1)continue;
      targets.push(target.armyId);types.add(target.troopType);if(targets.length===2)break;
    }
    return [{armyId:army.armyId,actionId,available:actionAvailable(view,army.armyId,actionId),recoveryTargetArmyIds:targets}];
  });
}

/**
 * Convert one getFirst3RuntimePublicView result into the exact strategic-AI
 * snapshot. Static movement edges come only from the faction public facade;
 * only the faction public failed-attack projection is accepted as memory.
 */
export function createFirst3StrategicAiSnapshotFromRuntimePublicView(publicView){
  validateRuntimePublicView(publicView);
  const allowed=eligibility(publicView);
  invariant(allowed.eligible,`AI_RUNTIME_PUBLIC_FACTION_NOT_PLANNABLE:${allowed.reasonCode}`);
  const world=publicView.world,capital=world.ownCities[world.faction.capitalCityId]??Object.values(world.ownCities).sort(by('cityId'))[0];
  const snapshot={
    format:'first3-strategic-ai-public-snapshot',
    version:1,
    planningBoundaryId:`TURN-${world.turnNumber}-G${publicView.globalTick}`,
    factionId:world.factionId,
    turnNumber:world.turnNumber,
    supplyStatus:'NOT_AVAILABLE',
    capitalCityId:capital.cityId,
    ownCities:Object.values(world.ownCities).sort(by('cityId')).map(city=>({cityId:city.cityId,tileId:city.tileId,isCapital:city.cityId===capital.cityId})),
    ownArmies:Object.values(world.ownArmies).sort(by('armyId')).map(army=>({
      armyId:army.armyId,
      tileId:army.tileId,
      troopType:army.troopType,
      movementClass:TROOP_MOVEMENT_CLASS[army.troopType],
      status:'ACTIVE',
      canBasicAttack:actionAvailable(publicView,army.armyId,'BASIC_ATTACK'),
      canRangedVolley:actionAvailable(publicView,army.armyId,'RANGED_VOLLEY'),
      basicAttackRange:actionAvailable(publicView,army.armyId,'BASIC_ATTACK')?ATTACK_RANGE.BASIC_ATTACK:0,
      rangedVolleyRange:actionAvailable(publicView,army.armyId,'RANGED_VOLLEY')?ATTACK_RANGE.RANGED_VOLLEY:0,
      moveBudgetTicks:world.time.ticksPerTurn,
    })),
    observedEnemies:Object.values(world.knowledge.observedArmies).sort(by('armyId')).map(army=>({armyId:army.armyId,factionId:army.factionId,tileId:army.tileId,troopType:army.troopType})),
    frontierTileIds:frontierTileIds(world),
    tiles:publicTiles(world),
    edges:publicEdges(world),
    failedAttackLedger:clone(publicView.strategic?.ai?.failedAttackLedger??[]),
    identityTactics:publicIdentityTactics(publicView),
  };
  validateFirst3StrategicAiSnapshot(snapshot);
  return clone(snapshot);
}

function commandIntent(plan,candidate){
  return {
    intentId:`INTENT:${candidate.candidateId}`,
    planningBoundaryId:plan.planningBoundaryId,
    actingFactionId:candidate.actingFactionId,
    armyId:candidate.armyId,
    type:candidate.type,
    destinationTileId:candidate.destinationTileId,
    targetArmyId:candidate.targetArmyId,
    pathTileIds:[...candidate.pathTileIds],
    reasonCode:candidate.reasonCode,
    publicAttackFingerprint:candidate.publicAttackFingerprint,
    submissionStatus:'NOT_SUBMITTED',
  };
}

function failureMemoryCandidate(snapshot,intent){
  if(!['BASIC_ATTACK','RANGED_VOLLEY'].includes(intent.type))return null;
  const failureId=`FAIL:${fingerprint({intentId:intent.intentId,publicAttackFingerprint:intent.publicAttackFingerprint})}`;
  const record=createFirst3FailedAttackRecord(snapshot,{failureId,armyId:intent.armyId,targetArmyId:intent.targetArmyId});
  invariant(record.publicFingerprint===intent.publicAttackFingerprint,'AI_RUNTIME_FAILURE_CANDIDATE_FINGERPRINT_MISMATCH');
  return {
    candidateId:`MEMORY:${intent.intentId}`,
    sourceIntentId:intent.intentId,
    applyWhen:'RUNTIME_ATTACK_FAILED',
    record,
    persistenceStatus:'NOT_CONNECTED',
  };
}

/**
 * Plan all supplied non-player faction views only after every eligible public
 * snapshot has been materialized. The caller supplies only faction-specific
 * public views; this adapter never accepts a runtime or commits commands.
 */
export function planFirst3StrategicAiRuntimePublicBatch(publicViews){
  invariant(Array.isArray(publicViews)&&publicViews.length>0,'AI_RUNTIME_PUBLIC_VIEWS_REQUIRED');
  publicViews.forEach(validateRuntimePublicView);
  const first=publicViews[0];
  invariant(publicViews.every(view=>view.globalTick===first.globalTick&&view.world.turnNumber===first.world.turnNumber),'AI_RUNTIME_PUBLIC_BATCH_BOUNDARY_MISMATCH');
  invariant(new Set(publicViews.map(view=>view.world.factionId)).size===publicViews.length,'DUPLICATE_AI_RUNTIME_PUBLIC_FACTION');
  const ordered=[...publicViews].sort((left,right)=>left.world.factionId.localeCompare(right.world.factionId,'en'));
  const skippedFactions=[],snapshots=[];
  for(const view of ordered){
    const allowed=eligibility(view);
    if(!allowed.eligible){skippedFactions.push({factionId:view.world.factionId,reasonCode:allowed.reasonCode});continue;}
    snapshots.push(createFirst3StrategicAiSnapshotFromRuntimePublicView(view));
  }
  const planned=snapshots.length?planFirst3StrategicAiBatch(snapshots):{
    format:'first3-strategic-ai-plan-batch',version:1,planningBoundaryId:`TURN-${first.world.turnNumber}-G${first.globalTick}`,turnNumber:first.world.turnNumber,plans:[],
  };
  const commandIntents=planned.plans.flatMap(plan=>plan.candidates.map(candidate=>commandIntent(plan,candidate))).sort(by('actingFactionId','armyId','intentId'));
  const snapshotByFaction=new Map(snapshots.map(snapshot=>[snapshot.factionId,snapshot]));
  const failureMemoryCandidates=commandIntents.map(intent=>failureMemoryCandidate(snapshotByFaction.get(intent.actingFactionId),intent)).filter(Boolean).sort(by('candidateId'));
  return clone({
    format:FORMAT,
    version:VERSION,
    planningBoundaryId:planned.planningBoundaryId,
    globalTick:first.globalTick,
    turnNumber:first.world.turnNumber,
    source:'GET_FIRST3_RUNTIME_PUBLIC_VIEW_ONLY',
    publicViewFingerprints:ordered.map(view=>{
      const snapshot=snapshotByFaction.get(view.world.factionId);
      const publicPlanningSurface=snapshot??{factionId:view.world.factionId,globalTick:view.globalTick,turnNumber:view.world.turnNumber,eligibility:eligibility(view)};
      return {factionId:view.world.factionId,fingerprint:fingerprint(publicPlanningSurface)};
    }),
    snapshots,
    plans:planned.plans,
    skippedFactions,
    commandIntents,
    failureMemoryCandidates,
    supplyStatus:'NOT_AVAILABLE',
    runtimeCommit:'NOT_PERFORMED',
    failureMemoryPersistence:'NOT_CONNECTED',
  });
}

export const FIRST3_STRATEGIC_AI_RUNTIME_ADAPTER_FORMAT=FORMAT;
export const FIRST3_STRATEGIC_AI_RUNTIME_ADAPTER_VERSION=VERSION;

/** Recompute the faction's identity intents from the public view before quoting. */
export function quoteFirst3StrategicAiPublicIdentityBatch(publicView,batch){
  const expected=planFirst3StrategicAiRuntimePublicBatch([publicView]),factionId=publicView.world.factionId;
  invariant(batch.planningBoundaryId===expected.planningBoundaryId&&batch.globalTick===expected.globalTick,'STALE_AI_PUBLIC_IDENTITY_BOUNDARY');
  invariant(stable(batch.publicViewFingerprints.filter(x=>x.factionId===factionId))===stable(expected.publicViewFingerprints),'STALE_AI_PUBLIC_IDENTITY_FINGERPRINT');
  const selected=items=>items.filter(i=>i.actingFactionId===factionId&&['ART-G07','ART-G08'].includes(i.type));
  const intents=selected(batch.commandIntents);
  invariant(stable(intents)===stable(selected(expected.commandIntents)),'AI_PUBLIC_IDENTITY_INTENT_MISMATCH');
  return intents.map(intent=>({requestId:intent.intentId,actingFactionId:factionId,actorRef:intent.armyId,targetRef:intent.type==='ART-G08'?null:intent.targetArmyId,type:intent.type}));
}
