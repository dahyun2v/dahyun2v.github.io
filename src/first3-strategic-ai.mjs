import {hexDistance} from './map-primitives.mjs';

const FORMAT='first3-strategic-ai-public-snapshot';
const VERSION=1;
const PLAN_FORMAT='first3-strategic-ai-plan';
const BATCH_FORMAT='first3-strategic-ai-plan-batch';
const CAPITAL_THREAT_HEX_RANGE=2;
const KNOWLEDGE=new Set(['VISIBLE','REMEMBERED','UNEXPLORED']);
const KNOWN_KNOWLEDGE=new Set(['VISIBLE','REMEMBERED']);
const TERRAIN=new Set(['plain','forest','hill','mountain','water']);
const MOVEMENT_CLASS=new Set(['normal','cavalry','engineer']);
const ARMY_STATUS=new Set(['ACTIVE','DEFEATED','DISBANDED']);
const ORDER_TYPE=new Set(['MOVE','HOLD','BASIC_ATTACK','RANGED_VOLLEY','ART-G07','ART-G08']);

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0)=>Number.isSafeInteger(value)&&value>=min;
const text=value=>typeof value==='string'&&value.length>0;
function invariant(condition,message){if(!condition)throw new Error(message);}
function exactKeys(value,keys,label){
  invariant(object(value),`INVALID_AI_${label}`);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  invariant(actual.length===expected.length&&actual.every((key,index)=>key===expected[index]),`AI_${label}_KEYS_MUST_BE_EXACT:${actual.join(',')}`);
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
const byId=key=>(left,right)=>left[key].localeCompare(right[key],'en');
const unique=(items,key,label)=>invariant(new Set(items.map(item=>item[key])).size===items.length,`DUPLICATE_AI_${label}`);
const knownTile=tile=>KNOWN_KNOWLEDGE.has(tile.knowledge);
const tilePoint=tile=>({q:tile.q,r:tile.r});
const edgePair=edge=>[edge.fromTileId,edge.toTileId].sort((a,b)=>a.localeCompare(b,'en')).join('|');

function validateTile(tile){
  const known=object(tile)&&KNOWN_KNOWLEDGE.has(tile.knowledge);
  exactKeys(tile,known?['tileId','q','r','knowledge','terrainType']:['tileId','q','r','knowledge'],'TILE');
  invariant(text(tile.tileId)&&integer(tile.q,-Number.MAX_SAFE_INTEGER)&&integer(tile.r,-Number.MAX_SAFE_INTEGER)&&tile.tileId===`${tile.q},${tile.r}`,'INVALID_AI_TILE');
  invariant(KNOWLEDGE.has(tile.knowledge),'INVALID_AI_TILE_KNOWLEDGE');
  if(known)invariant(TERRAIN.has(tile.terrainType),'INVALID_AI_TILE_TERRAIN');
  invariant(known||!Object.hasOwn(tile,'terrainType'),'UNEXPLORED_AI_TILE_CANNOT_HAVE_TERRAIN');
}

function validateEdge(edge,tileMap){
  exactKeys(edge,['edgeId','fromTileId','toTileId','knowledge','blocked','travelTicksByClass'],'EDGE');
  invariant(text(edge.edgeId)&&text(edge.fromTileId)&&text(edge.toTileId)&&edge.fromTileId!==edge.toTileId,'INVALID_AI_EDGE');
  invariant(KNOWN_KNOWLEDGE.has(edge.knowledge)&&typeof edge.blocked==='boolean','INVALID_AI_EDGE_KNOWLEDGE');
  const from=tileMap.get(edge.fromTileId),to=tileMap.get(edge.toTileId);
  invariant(from&&to&&knownTile(from)&&knownTile(to),'AI_EDGE_MUST_CONNECT_KNOWN_TILES');
  invariant(hexDistance(tilePoint(from),tilePoint(to))===1,'AI_EDGE_MUST_CONNECT_NEIGHBORS');
  exactKeys(edge.travelTicksByClass,['normal','cavalry','engineer'],'EDGE_TRAVEL');
  for(const value of Object.values(edge.travelTicksByClass))invariant(value===null||integer(value,1),'INVALID_AI_EDGE_TRAVEL_TICKS');
  if(edge.blocked)invariant(Object.values(edge.travelTicksByClass).every(value=>value===null),'BLOCKED_AI_EDGE_CANNOT_HAVE_TRAVEL_TICKS');
}

function validateCity(city,tileMap){
  exactKeys(city,['cityId','tileId','isCapital'],'CITY');
  invariant(text(city.cityId)&&text(city.tileId)&&typeof city.isCapital==='boolean'&&knownTile(tileMap.get(city.tileId)),'INVALID_AI_CITY');
}

function validateOwnArmy(army,tileMap){
  exactKeys(army,['armyId','tileId','troopType','movementClass','status','canBasicAttack','canRangedVolley','basicAttackRange','rangedVolleyRange','moveBudgetTicks'],'OWN_ARMY');
  invariant(text(army.armyId)&&text(army.tileId)&&text(army.troopType)&&MOVEMENT_CLASS.has(army.movementClass)&&ARMY_STATUS.has(army.status),'INVALID_AI_OWN_ARMY');
  invariant(typeof army.canBasicAttack==='boolean'&&typeof army.canRangedVolley==='boolean'&&integer(army.basicAttackRange)&&integer(army.rangedVolleyRange)&&integer(army.moveBudgetTicks),'INVALID_AI_OWN_ARMY_CAPABILITY');
  invariant(army.canBasicAttack||army.basicAttackRange===0,'DISABLED_BASIC_ATTACK_MUST_HAVE_ZERO_RANGE');
  invariant(army.canRangedVolley||army.rangedVolleyRange===0,'DISABLED_RANGED_VOLLEY_MUST_HAVE_ZERO_RANGE');
  invariant(knownTile(tileMap.get(army.tileId)),'AI_OWN_ARMY_MUST_BE_ON_KNOWN_TILE');
}

function validateEnemy(enemy,snapshot,tileMap){
  exactKeys(enemy,['armyId','factionId','tileId','troopType'],'OBSERVED_ENEMY');
  invariant(text(enemy.armyId)&&text(enemy.factionId)&&enemy.factionId!==snapshot.factionId&&text(enemy.tileId)&&text(enemy.troopType),'INVALID_AI_OBSERVED_ENEMY');
  invariant(tileMap.get(enemy.tileId)?.knowledge==='VISIBLE','AI_OBSERVED_ENEMY_MUST_BE_ON_VISIBLE_TILE');
}

function validateFailure(failure,snapshot,armyIds,enemyIds){
  exactKeys(failure,['failureId','factionId','armyId','targetArmyId','publicFingerprint'],'FAILED_ATTACK');
  invariant(text(failure.failureId)&&failure.factionId===snapshot.factionId&&armyIds.has(failure.armyId)&&enemyIds.has(failure.targetArmyId)&&/^[a-f0-9]{8}$/.test(failure.publicFingerprint),'INVALID_AI_FAILED_ATTACK');
}

export function validateFirst3StrategicAiSnapshot(snapshot){
  exactKeys(snapshot,['format','version','planningBoundaryId','factionId','turnNumber','supplyStatus','capitalCityId','ownCities','ownArmies','observedEnemies','frontierTileIds','tiles','edges','failedAttackLedger',...(Object.hasOwn(snapshot,'identityTactics')?['identityTactics']:[])],'SNAPSHOT');
  invariant(snapshot.format===FORMAT&&snapshot.version===VERSION,'INVALID_AI_SNAPSHOT_FORMAT');
  invariant(text(snapshot.planningBoundaryId)&&text(snapshot.factionId)&&integer(snapshot.turnNumber,1),'INVALID_AI_SNAPSHOT_IDENTITY');
  invariant(snapshot.supplyStatus==='NOT_AVAILABLE','AI_SUPPLY_STATUS_MUST_BE_NOT_AVAILABLE');
  for(const key of ['ownCities','ownArmies','observedEnemies','frontierTileIds','tiles','edges','failedAttackLedger'])invariant(Array.isArray(snapshot[key]),`INVALID_AI_SNAPSHOT_COLLECTION:${key}`);
  snapshot.tiles.forEach(validateTile);unique(snapshot.tiles,'tileId','TILE_ID');
  const tileMap=new Map(snapshot.tiles.map(tile=>[tile.tileId,tile]));
  snapshot.edges.forEach(edge=>validateEdge(edge,tileMap));unique(snapshot.edges,'edgeId','EDGE_ID');
  invariant(new Set(snapshot.edges.map(edgePair)).size===snapshot.edges.length,'DUPLICATE_AI_EDGE_PAIR');
  snapshot.ownCities.forEach(city=>validateCity(city,tileMap));unique(snapshot.ownCities,'cityId','CITY_ID');
  const capitals=snapshot.ownCities.filter(city=>city.isCapital);
  invariant(capitals.length===1&&capitals[0].cityId===snapshot.capitalCityId,'AI_CAPITAL_MUST_MATCH_OWN_CITY');
  snapshot.ownArmies.forEach(army=>validateOwnArmy(army,tileMap));unique(snapshot.ownArmies,'armyId','OWN_ARMY_ID');
  snapshot.observedEnemies.forEach(enemy=>validateEnemy(enemy,snapshot,tileMap));unique(snapshot.observedEnemies,'armyId','OBSERVED_ENEMY_ID');
  invariant(!snapshot.observedEnemies.some(enemy=>snapshot.ownArmies.some(army=>army.armyId===enemy.armyId)),'AI_ARMY_ID_COLLISION');
  invariant(new Set(snapshot.frontierTileIds).size===snapshot.frontierTileIds.length&&snapshot.frontierTileIds.every(tileId=>text(tileId)&&knownTile(tileMap.get(tileId))),'AI_FRONTIER_MUST_BE_KNOWN');
  const armyIds=new Set(snapshot.ownArmies.map(army=>army.armyId)),enemyIds=new Set(snapshot.observedEnemies.map(enemy=>enemy.armyId));
  snapshot.failedAttackLedger.forEach(failure=>validateFailure(failure,snapshot,armyIds,enemyIds));unique(snapshot.failedAttackLedger,'failureId','FAILED_ATTACK_ID');
  if(Object.hasOwn(snapshot,'identityTactics')){
    invariant(Array.isArray(snapshot.identityTactics),'INVALID_AI_IDENTITY_TACTICS');
    unique(snapshot.identityTactics,'armyId','IDENTITY_ARMY');
    for(const tactic of snapshot.identityTactics){
      exactKeys(tactic,['armyId','actionId','available','recoveryTargetArmyIds'],'IDENTITY_TACTIC');
      invariant(armyIds.has(tactic.armyId)&&['ART-G07','ART-G08'].includes(tactic.actionId)&&typeof tactic.available==='boolean','INVALID_AI_IDENTITY_SOURCE');
      invariant(snapshot.factionId===(tactic.actionId==='ART-G07'?'F01':'F03'),'INVALID_AI_IDENTITY_FACTION');
      invariant(Array.isArray(tactic.recoveryTargetArmyIds)&&new Set(tactic.recoveryTargetArmyIds).size===tactic.recoveryTargetArmyIds.length&&tactic.recoveryTargetArmyIds.every(id=>armyIds.has(id)&&id!==tactic.armyId),'INVALID_AI_IDENTITY_RECOVERY_TARGETS');
      invariant(tactic.actionId!=='ART-G07'||tactic.recoveryTargetArmyIds.length===0,'INVALID_AI_G07_RECOVERY_TARGETS');
    }
  }
  return snapshot;
}

function normalizedPublicSnapshot(snapshot,{includeFailures=true}={}){
  const sort=(items,key)=>[...items].sort(byId(key));
  return {
    format:snapshot.format,version:snapshot.version,planningBoundaryId:snapshot.planningBoundaryId,factionId:snapshot.factionId,turnNumber:snapshot.turnNumber,supplyStatus:snapshot.supplyStatus,capitalCityId:snapshot.capitalCityId,
    ownCities:sort(snapshot.ownCities,'cityId'),ownArmies:sort(snapshot.ownArmies,'armyId'),observedEnemies:sort(snapshot.observedEnemies,'armyId'),frontierTileIds:[...snapshot.frontierTileIds].sort((a,b)=>a.localeCompare(b,'en')),tiles:sort(snapshot.tiles,'tileId'),edges:sort(snapshot.edges,'edgeId'),failedAttackLedger:includeFailures?sort(snapshot.failedAttackLedger,'failureId'):[],
    ...(snapshot.identityTactics?{identityTactics:sort(snapshot.identityTactics,'armyId').map(t=>({...t,recoveryTargetArmyIds:[...t.recoveryTargetArmyIds].sort()}))}:{}),
  };
}

function maps(snapshot){
  return {tiles:new Map(snapshot.tiles.map(tile=>[tile.tileId,tile])),edges:snapshot.edges};
}

function knownPathFor(snapshot,{startTileId,destinationTileId,movementClass}){
  const {tiles,edges}=maps(snapshot),start=tiles.get(startTileId),destination=tiles.get(destinationTileId);
  if(!knownTile(start)||!knownTile(destination))return null;
  const adjacency=new Map();
  for(const edge of [...edges].sort(byId('edgeId'))){
    const cost=edge.blocked?null:edge.travelTicksByClass[movementClass];if(cost===null)continue;
    for(const [from,to] of [[edge.fromTileId,edge.toTileId],[edge.toTileId,edge.fromTileId]]){
      if(!adjacency.has(from))adjacency.set(from,[]);adjacency.get(from).push({to,cost,edgeId:edge.edgeId});
    }
  }
  for(const list of adjacency.values())list.sort((left,right)=>left.to.localeCompare(right.to,'en')||left.edgeId.localeCompare(right.edgeId,'en'));
  const distance=new Map([[startTileId,0]]),previous=new Map(),open=new Set([startTileId]);
  while(open.size){
    const current=[...open].sort((left,right)=>distance.get(left)-distance.get(right)||left.localeCompare(right,'en'))[0];open.delete(current);
    if(current===destinationTileId){
      const pathTileIds=[current];while(previous.has(pathTileIds[0]))pathTileIds.unshift(previous.get(pathTileIds[0]));
      return {pathTileIds,totalTicks:distance.get(current)};
    }
    for(const {to,cost} of adjacency.get(current)??[]){
      if(!knownTile(tiles.get(to)))continue;
      const candidate=distance.get(current)+cost,known=distance.get(to)??Infinity;
      if(candidate<known||(candidate===known&&current.localeCompare(previous.get(to)??'\uffff','en')<0)){distance.set(to,candidate);previous.set(to,current);open.add(to);}
    }
  }
  return null;
}

export function findFirst3KnownPath(snapshot,{armyId,destinationTileId}={}){
  validateFirst3StrategicAiSnapshot(snapshot);
  const army=snapshot.ownArmies.find(item=>item.armyId===armyId);
  invariant(army&&text(destinationTileId),'AI_KNOWN_PATH_INPUT_REQUIRED');
  return knownPathFor(snapshot,{startTileId:army.tileId,destinationTileId,movementClass:army.movementClass});
}

function attackFingerprint(snapshot,army,target){
  const normalized=normalizedPublicSnapshot(snapshot,{includeFailures:false});
  return fingerprint({factionId:snapshot.factionId,supplyStatus:snapshot.supplyStatus,army,target,tiles:normalized.tiles,edges:normalized.edges});
}

export function createFirst3FailedAttackRecord(snapshot,{failureId,armyId,targetArmyId}={}){
  validateFirst3StrategicAiSnapshot(snapshot);
  const army=snapshot.ownArmies.find(item=>item.armyId===armyId),target=snapshot.observedEnemies.find(item=>item.armyId===targetArmyId);
  invariant(text(failureId)&&army&&target,'AI_FAILED_ATTACK_INPUT_REQUIRED');
  return {failureId,factionId:snapshot.factionId,armyId,targetArmyId,publicFingerprint:attackFingerprint(snapshot,army,target)};
}

function makeCandidate(snapshot,army,type,{destinationTileId=null,targetArmyId=null,pathTileIds=[],reasonCode,publicAttackFingerprint=null}={}){
  invariant(ORDER_TYPE.has(type),'INVALID_AI_CANDIDATE_TYPE');
  const suffix=targetArmyId??destinationTileId??(type==='ART-G08'?army.armyId:army.tileId);
  return {candidateId:`AI:${snapshot.planningBoundaryId}:${snapshot.factionId}:${army.armyId}:${type}:${suffix}`,actingFactionId:snapshot.factionId,armyId:army.armyId,type,destinationTileId,targetArmyId,pathTileIds,reasonCode,publicAttackFingerprint};
}

function hold(snapshot,army,reasonCode){return makeCandidate(snapshot,army,'HOLD',{destinationTileId:army.tileId,pathTileIds:[army.tileId],reasonCode});}

function attackType(army,distance){
  if(army.canBasicAttack&&distance<=army.basicAttackRange)return 'BASIC_ATTACK';
  if(army.canRangedVolley&&distance>=2&&distance<=army.rangedVolleyRange)return 'RANGED_VOLLEY';
  return null;
}

function failedBefore(snapshot,army,target,publicAttackFingerprint){
  return snapshot.failedAttackLedger.some(record=>record.armyId===army.armyId&&record.targetArmyId===target.armyId&&record.publicFingerprint===publicAttackFingerprint);
}

function reachablePrefix(snapshot,army,path){
  if(!path||path.pathTileIds.length<2)return null;
  let spent=0,lastIndex=0;
  for(let index=1;index<path.pathTileIds.length;index++){
    const from=path.pathTileIds[index-1],to=path.pathTileIds[index];
    const edge=snapshot.edges.find(item=>edgePair(item)===[from,to].sort((a,b)=>a.localeCompare(b,'en')).join('|'));
    const cost=edge?.blocked?null:edge?.travelTicksByClass[army.movementClass];
    if(cost===null||cost===undefined||spent+cost>army.moveBudgetTicks)break;
    spent+=cost;lastIndex=index;
  }
  return lastIndex===0?null:{pathTileIds:path.pathTileIds.slice(0,lastIndex+1),totalTicks:spent};
}

function bestApproach(snapshot,army,target,reservedDestinations){
  const tileMap=new Map(snapshot.tiles.map(tile=>[tile.tileId,tile])),targetTile=tileMap.get(target.tileId);
  const desiredRange=Math.max(army.canBasicAttack?army.basicAttackRange:0,army.canRangedVolley?army.rangedVolleyRange:0,1);
  const occupied=new Set(snapshot.ownArmies.filter(item=>item.status==='ACTIVE'&&item.armyId!==army.armyId).map(item=>item.tileId));
  const candidates=snapshot.tiles.filter(tile=>knownTile(tile)&&tile.tileId!==target.tileId&&hexDistance(tilePoint(tile),tilePoint(targetTile))<=desiredRange&&!occupied.has(tile.tileId)&&!reservedDestinations.has(tile.tileId)).map(tile=>({tile,path:knownPathFor(snapshot,{startTileId:army.tileId,destinationTileId:tile.tileId,movementClass:army.movementClass})})).filter(item=>item.path).sort((left,right)=>left.path.totalTicks-right.path.totalTicks||left.tile.tileId.localeCompare(right.tile.tileId,'en'));
  for(const candidate of candidates){const prefix=reachablePrefix(snapshot,army,candidate.path);if(prefix)return prefix;}
  return null;
}

function executableAgainst(snapshot,enemy){
  const targetTile=snapshot.tiles.find(tile=>tile.tileId===enemy.tileId);
  return snapshot.ownArmies.filter(army=>army.status==='ACTIVE').some(army=>{
    const ownTile=snapshot.tiles.find(tile=>tile.tileId===army.tileId),distance=hexDistance(tilePoint(ownTile),tilePoint(targetTile));
    if(attackType(army,distance))return true;
    return bestApproach(snapshot,army,enemy,new Set())!==null;
  });
}

function selectGoal(snapshot){
  const capital=snapshot.ownCities.find(city=>city.cityId===snapshot.capitalCityId),capitalTile=snapshot.tiles.find(tile=>tile.tileId===capital.tileId);
  const threats=snapshot.observedEnemies.filter(enemy=>hexDistance(tilePoint(snapshot.tiles.find(tile=>tile.tileId===enemy.tileId)),tilePoint(capitalTile))<=CAPITAL_THREAT_HEX_RANGE&&executableAgainst(snapshot,enemy)).sort((left,right)=>{
    const leftDistance=hexDistance(tilePoint(snapshot.tiles.find(tile=>tile.tileId===left.tileId)),tilePoint(capitalTile)),rightDistance=hexDistance(tilePoint(snapshot.tiles.find(tile=>tile.tileId===right.tileId)),tilePoint(capitalTile));
    return leftDistance-rightDistance||left.armyId.localeCompare(right.armyId,'en');
  });
  if(threats.length)return {type:'DEFEND_OBSERVED_CAPITAL_THREAT',targetCityId:capital.cityId,targetArmyId:threats[0].armyId,targetTileId:threats[0].tileId,reasonCode:'VISIBLE_ENEMY_WITHIN_CAPITAL_THREAT_RANGE'};
  const enemies=snapshot.observedEnemies.filter(enemy=>executableAgainst(snapshot,enemy)).sort(byId('armyId'));
  if(enemies.length)return {type:'ENGAGE_OBSERVED_ENEMY',targetCityId:null,targetArmyId:enemies[0].armyId,targetTileId:enemies[0].tileId,reasonCode:'VISIBLE_ENEMY_HAS_KNOWN_APPROACH'};
  const scouts=[];
  for(const tileId of [...snapshot.frontierTileIds].sort((a,b)=>a.localeCompare(b,'en')))for(const army of snapshot.ownArmies.filter(item=>item.status==='ACTIVE').sort(byId('armyId'))){
    const path=knownPathFor(snapshot,{startTileId:army.tileId,destinationTileId:tileId,movementClass:army.movementClass});if(path)scouts.push({tileId,armyId:army.armyId,totalTicks:path.totalTicks});
  }
  scouts.sort((left,right)=>left.totalTicks-right.totalTicks||left.tileId.localeCompare(right.tileId,'en')||left.armyId.localeCompare(right.armyId,'en'));
  if(scouts.length)return {type:'SCOUT_KNOWN_FRONTIER',targetCityId:null,targetArmyId:null,targetTileId:scouts[0].tileId,reasonCode:'REACHABLE_KNOWN_FRONTIER'};
  return {type:'HOLD',targetCityId:null,targetArmyId:null,targetTileId:null,reasonCode:'NO_PUBLIC_ACTIONABLE_TARGET'};
}

function orderForEnemyGoal(snapshot,army,goal,reservedDestinations){
  const target=snapshot.observedEnemies.find(enemy=>enemy.armyId===goal.targetArmyId),ownTile=snapshot.tiles.find(tile=>tile.tileId===army.tileId),targetTile=snapshot.tiles.find(tile=>tile.tileId===target.tileId),distance=hexDistance(tilePoint(ownTile),tilePoint(targetTile)),type=attackType(army,distance);
  if(type){
    const publicAttackFingerprint=attackFingerprint(snapshot,army,target);
    if(failedBefore(snapshot,army,target,publicAttackFingerprint))return hold(snapshot,army,'REPEATED_FAILED_ATTACK_SUPPRESSED');
    return makeCandidate(snapshot,army,type,{targetArmyId:target.armyId,reasonCode:goal.type,publicAttackFingerprint});
  }
  const route=bestApproach(snapshot,army,target,reservedDestinations);
  if(!route)return hold(snapshot,army,'NO_KNOWN_LEGAL_APPROACH');
  const destinationTileId=route.pathTileIds.at(-1);reservedDestinations.add(destinationTileId);
  return makeCandidate(snapshot,army,'MOVE',{destinationTileId,pathTileIds:route.pathTileIds,reasonCode:goal.type});
}

function orderForScoutGoal(snapshot,army,goal,scoutArmyId){
  if(army.armyId!==scoutArmyId)return hold(snapshot,army,'OTHER_ARMY_ASSIGNED_TO_FACTION_GOAL');
  const path=knownPathFor(snapshot,{startTileId:army.tileId,destinationTileId:goal.targetTileId,movementClass:army.movementClass}),route=reachablePrefix(snapshot,army,path);
  if(!route)return hold(snapshot,army,army.tileId===goal.targetTileId?'FRONTIER_ALREADY_REACHED':'FRONTIER_OUTSIDE_CURRENT_MOVE_BUDGET');
  return makeCandidate(snapshot,army,'MOVE',{destinationTileId:route.pathTileIds.at(-1),pathTileIds:route.pathTileIds,reasonCode:goal.type});
}

export function planFirst3StrategicAi(snapshot){
  validateFirst3StrategicAiSnapshot(snapshot);
  const goal=selectGoal(snapshot),active=snapshot.ownArmies.filter(army=>army.status==='ACTIVE').sort(byId('armyId')),reservedDestinations=new Set(),candidates=[];
  let scoutArmyId=null;
  if(goal.type==='SCOUT_KNOWN_FRONTIER'){
    scoutArmyId=active.map(army=>({army,path:knownPathFor(snapshot,{startTileId:army.tileId,destinationTileId:goal.targetTileId,movementClass:army.movementClass})})).filter(item=>item.path).sort((left,right)=>left.path.totalTicks-right.path.totalTicks||left.army.armyId.localeCompare(right.army.armyId,'en'))[0]?.army.armyId??null;
  }
  for(const army of active){
    if(goal.targetArmyId)candidates.push(orderForEnemyGoal(snapshot,army,goal,reservedDestinations));
    else if(goal.type==='SCOUT_KNOWN_FRONTIER')candidates.push(orderForScoutGoal(snapshot,army,goal,scoutArmyId));
    else candidates.push(hold(snapshot,army,goal.reasonCode));
  }
  // WORK_TRIAL: useful identity actions take priority over the source's generic
  // action. G07 needs an actual selected allied BASIC; G08 keeps recipients still.
  for(const tactic of snapshot.identityTactics??[]){
    if(!tactic.available)continue;
    const army=active.find(a=>a.armyId===tactic.armyId),index=candidates.findIndex(c=>c.armyId===tactic.armyId);
    if(!army||index<0)continue;
    if(tactic.actionId==='ART-G07'){
      const ally=candidates.find(c=>c.armyId!==army.armyId&&c.type==='BASIC_ATTACK');
      if(ally)candidates[index]=makeCandidate(snapshot,army,'ART-G07',{targetArmyId:ally.targetArmyId,reasonCode:'COORDINATE_SELECTED_ALLIED_BASIC'});
    }else if(tactic.recoveryTargetArmyIds.length){
      candidates[index]=makeCandidate(snapshot,army,'ART-G08',{reasonCode:'RECOVER_ADJACENT_OTHER_TROOPS'});
      for(const id of tactic.recoveryTargetArmyIds){
        const i=candidates.findIndex(c=>c.armyId===id);
        if(i>=0&&candidates[i].type==='MOVE')candidates[i]=hold(snapshot,active.find(a=>a.armyId===id),'WAIT_FOR_ADJACENT_BANNER_RECOVERY');
      }
    }
  }
  return {format:PLAN_FORMAT,version:VERSION,planningBoundaryId:snapshot.planningBoundaryId,factionId:snapshot.factionId,supplyStatus:'NOT_AVAILABLE',publicSnapshotFingerprint:fingerprint(normalizedPublicSnapshot(snapshot)),goal,candidates,runtimeCommit:'NOT_PERFORMED'};
}

export function planFirst3StrategicAiBatch(snapshots){
  invariant(Array.isArray(snapshots)&&snapshots.length>0,'AI_BATCH_SNAPSHOTS_REQUIRED');
  snapshots.forEach(validateFirst3StrategicAiSnapshot);
  const first=snapshots[0];
  invariant(snapshots.every(snapshot=>snapshot.planningBoundaryId===first.planningBoundaryId&&snapshot.turnNumber===first.turnNumber),'AI_BATCH_BOUNDARY_MISMATCH');
  unique(snapshots,'factionId','BATCH_FACTION_ID');
  return {format:BATCH_FORMAT,version:VERSION,planningBoundaryId:first.planningBoundaryId,turnNumber:first.turnNumber,plans:[...snapshots].sort(byId('factionId')).map(planFirst3StrategicAi)};
}

export const FIRST3_STRATEGIC_AI_FORMAT=FORMAT;
export const FIRST3_STRATEGIC_AI_VERSION=VERSION;
export const FIRST3_STRATEGIC_AI_TRIAL={capitalThreatHexRange:CAPITAL_THREAT_HEX_RANGE,supplyStatus:'NOT_AVAILABLE',runtimeCommit:false};
