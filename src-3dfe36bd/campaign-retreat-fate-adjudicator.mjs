const FORMAT='sangoku-campaign-retreat-fate-adjudicator';
const VERSION=1;
const PUBLIC_FORMAT='first3-retreat-public-facts';
const PUBLIC_VERSION=1;
const KNOWLEDGE=new Set(['VISIBLE','REMEMBERED','UNEXPLORED']);
const KNOWN_KNOWLEDGE=new Set(['VISIBLE','REMEMBERED']);
const MOVEMENT_CLASSES=new Set(['normal','cavalry','engineer']);
const ENTROPY_MODES=new Set(['EXPLICIT_ROLL','SAVED_SEED']);
const INPUT_KEYS=['format','version','battleResult','publicWorld','entropy'];
const RESULT_KEYS=['transactionId','sourceResultId','globalTick','defeatedArmyId','commanderFate','captorFactionId'];

const RULES=Object.freeze({
  status:'WORK_TRIAL',
  normalRetreat:'VISIBLE_ADJACENT_KNOWN_PASSABLE_UNOCCUPIED_FORCES_ESCAPED',
  unknownTileTreatment:'NOT_A_CONFIRMED_RETREAT_ROUTE',
  blockedFateBasisPoints:Object.freeze({escaped:[0,2000],captured:[2000,9500],dead:[9500,10000]}),
  hpZeroCausesAutomaticDeath:false,
  duelResolutionEnabled:false,
});

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const id=value=>typeof value==='string'&&value.length>0&&value.length<=120&&/^[A-Za-z0-9._,:-]+$/.test(value);
function invariant(condition,message){if(!condition)throw new Error(message);}
function exactKeys(value,keys,message){
  invariant(object(value),message);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  invariant(actual.length===expected.length&&actual.every((key,index)=>key===expected[index]),message);
}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hash32(value){
  let hash=0x811c9dc5;
  for(const character of stable(value))hash=Math.imul(hash^character.charCodeAt(0),0x01000193)>>>0;
  return hash;
}
function pointFromTileId(value){
  invariant(id(value),'INVALID_RETREAT_TILE_ID');
  const match=/^(-?\d+),(-?\d+)$/.exec(value);
  invariant(match,'INVALID_RETREAT_TILE_COORDINATES');
  const point={q:Number(match[1]),r:Number(match[2])};
  invariant(Number.isSafeInteger(point.q)&&Number.isSafeInteger(point.r),'INVALID_RETREAT_TILE_COORDINATES');
  return point;
}
function hexDistance(left,right){
  return (Math.abs(left.q-right.q)+Math.abs(left.r-right.r)+Math.abs(left.q+left.r-right.q-right.r))/2;
}
function edgePair(fromTileId,toTileId){return [fromTileId,toTileId].sort((left,right)=>left.localeCompare(right,'en')).join('|');}

function validateBattleResult(result){
  exactKeys(result,['transactionId','sourceResultId','globalTick','defeatedArmyId','defeatedFactionId','defeated','routePending','eligibleCaptorFactionIds'],'INVALID_RETREAT_BATTLE_RESULT_SHAPE');
  invariant(id(result.transactionId)&&id(result.sourceResultId)&&integer(result.globalTick)&&id(result.defeatedArmyId)&&id(result.defeatedFactionId),'INVALID_RETREAT_BATTLE_RESULT');
  invariant(result.defeated===true&&typeof result.routePending==='boolean','RETREAT_ADJUDICATION_REQUIRES_CONFIRMED_DEFEAT');
  invariant(Array.isArray(result.eligibleCaptorFactionIds)&&result.eligibleCaptorFactionIds.length>0&&result.eligibleCaptorFactionIds.every(id),'RETREAT_CAPTOR_CANDIDATES_REQUIRED');
  invariant(new Set(result.eligibleCaptorFactionIds).size===result.eligibleCaptorFactionIds.length,'DUPLICATE_RETREAT_CAPTOR_FACTION');
  invariant(result.eligibleCaptorFactionIds.every(factionId=>factionId!==result.defeatedFactionId),'RETREAT_CAPTOR_CANNOT_BE_DEFEATED_FACTION');
}

function validatePublicTile(tile){
  exactKeys(tile,['tileId','q','r','knowledge'],'INVALID_RETREAT_PUBLIC_TILE_SHAPE');
  invariant(id(tile.tileId)&&Number.isSafeInteger(tile.q)&&Number.isSafeInteger(tile.r)&&tile.tileId===`${tile.q},${tile.r}`&&KNOWLEDGE.has(tile.knowledge),'INVALID_RETREAT_PUBLIC_TILE');
}

function validatePublicEdge(edge,tileMap){
  exactKeys(edge,['edgeId','fromTileId','toTileId','knowledge','blocked','travelTicksByClass'],'INVALID_RETREAT_PUBLIC_EDGE_SHAPE');
  invariant(id(edge.edgeId)&&id(edge.fromTileId)&&id(edge.toTileId)&&edge.fromTileId!==edge.toTileId&&KNOWN_KNOWLEDGE.has(edge.knowledge)&&typeof edge.blocked==='boolean','INVALID_RETREAT_PUBLIC_EDGE');
  const from=tileMap.get(edge.fromTileId),to=tileMap.get(edge.toTileId);
  invariant(from&&to&&KNOWN_KNOWLEDGE.has(from.knowledge)&&KNOWN_KNOWLEDGE.has(to.knowledge),'RETREAT_EDGE_MUST_CONNECT_KNOWN_TILES');
  invariant(hexDistance(pointFromTileId(edge.fromTileId),pointFromTileId(edge.toTileId))===1,'RETREAT_EDGE_MUST_CONNECT_ADJACENT_TILES');
  exactKeys(edge.travelTicksByClass,['normal','cavalry','engineer'],'INVALID_RETREAT_EDGE_TRAVEL_SHAPE');
  for(const value of Object.values(edge.travelTicksByClass))invariant(value===null||integer(value,1),'INVALID_RETREAT_EDGE_TRAVEL_TICKS');
  if(edge.blocked)invariant(Object.values(edge.travelTicksByClass).every(value=>value===null),'BLOCKED_RETREAT_EDGE_CANNOT_HAVE_TRAVEL_TICKS');
}

function validateOccupancy(occupancy,{own,tileMap,viewerFactionId}){
  exactKeys(occupancy,['armyId','factionId','tileId'],'INVALID_RETREAT_OCCUPANCY_SHAPE');
  invariant(id(occupancy.armyId)&&id(occupancy.factionId)&&id(occupancy.tileId)&&tileMap.has(occupancy.tileId),'INVALID_RETREAT_OCCUPANCY');
  if(own)invariant(occupancy.factionId===viewerFactionId&&KNOWN_KNOWLEDGE.has(tileMap.get(occupancy.tileId).knowledge),'INVALID_RETREAT_OWN_OCCUPANCY');
  else invariant(occupancy.factionId!==viewerFactionId&&tileMap.get(occupancy.tileId).knowledge==='VISIBLE','RETREAT_HOSTILE_OCCUPANCY_MUST_BE_VISIBLE');
}

function validatePublicWorld(publicWorld,battleResult){
  exactKeys(publicWorld,['format','version','viewerFactionId','defeatedArmy','tiles','edges','ownArmies','observedHostileArmies',...(publicWorld.observedHostileCities!==undefined?['observedHostileCities']:[])],'INVALID_RETREAT_PUBLIC_WORLD_SHAPE');
  invariant(publicWorld.format===PUBLIC_FORMAT&&publicWorld.version===PUBLIC_VERSION,'INVALID_RETREAT_PUBLIC_WORLD_FORMAT');
  invariant(publicWorld.viewerFactionId===battleResult.defeatedFactionId,'RETREAT_PUBLIC_VIEWER_MUST_BE_DEFEATED_FACTION');
  exactKeys(publicWorld.defeatedArmy,['armyId','factionId','tileId','movementClass'],'INVALID_RETREAT_DEFEATED_ARMY_SHAPE');
  const army=publicWorld.defeatedArmy;
  invariant(army.armyId===battleResult.defeatedArmyId&&army.factionId===battleResult.defeatedFactionId&&id(army.tileId)&&MOVEMENT_CLASSES.has(army.movementClass),'INVALID_RETREAT_DEFEATED_ARMY');
  for(const key of ['tiles','edges','ownArmies','observedHostileArmies'])invariant(Array.isArray(publicWorld[key]),`INVALID_RETREAT_PUBLIC_COLLECTION:${key}`);
  publicWorld.tiles.forEach(validatePublicTile);
  invariant(new Set(publicWorld.tiles.map(tile=>tile.tileId)).size===publicWorld.tiles.length,'DUPLICATE_RETREAT_PUBLIC_TILE');
  const tileMap=new Map(publicWorld.tiles.map(tile=>[tile.tileId,tile]));
  invariant(KNOWN_KNOWLEDGE.has(tileMap.get(army.tileId)?.knowledge),'RETREAT_DEFEATED_ARMY_TILE_MUST_BE_KNOWN');
  publicWorld.edges.forEach(edge=>validatePublicEdge(edge,tileMap));
  invariant(new Set(publicWorld.edges.map(edge=>edge.edgeId)).size===publicWorld.edges.length,'DUPLICATE_RETREAT_PUBLIC_EDGE_ID');
  invariant(new Set(publicWorld.edges.map(edge=>edgePair(edge.fromTileId,edge.toTileId))).size===publicWorld.edges.length,'DUPLICATE_RETREAT_PUBLIC_EDGE_PAIR');
  publicWorld.ownArmies.forEach(occupancy=>validateOccupancy(occupancy,{own:true,tileMap,viewerFactionId:publicWorld.viewerFactionId}));
  publicWorld.observedHostileArmies.forEach(occupancy=>validateOccupancy(occupancy,{own:false,tileMap,viewerFactionId:publicWorld.viewerFactionId}));
  const allOccupancies=[...publicWorld.ownArmies,...publicWorld.observedHostileArmies];
  invariant(new Set(allOccupancies.map(item=>item.armyId)).size===allOccupancies.length,'DUPLICATE_RETREAT_PUBLIC_ARMY');
  invariant(new Set(allOccupancies.map(item=>item.tileId)).size===allOccupancies.length,'DUPLICATE_RETREAT_PUBLIC_OCCUPIED_TILE');
  const ownArmy=publicWorld.ownArmies.find(item=>item.armyId===army.armyId);
  invariant(ownArmy&&ownArmy.factionId===army.factionId&&ownArmy.tileId===army.tileId,'RETREAT_DEFEATED_ARMY_OCCUPANCY_REQUIRED');
  const observedHostileFactions=new Set(publicWorld.observedHostileArmies.map(item=>item.factionId));
  if(publicWorld.observedHostileCities!==undefined){
    invariant(Array.isArray(publicWorld.observedHostileCities),'INVALID_RETREAT_PUBLIC_CITIES');
    for(const c of publicWorld.observedHostileCities){
      exactKeys(c,['cityId','factionId','tileId'],'INVALID_RETREAT_PUBLIC_CITY');
      invariant(id(c.cityId)&&id(c.factionId)&&c.factionId!==publicWorld.viewerFactionId&&tileMap.get(c.tileId)?.knowledge==='VISIBLE','INVALID_RETREAT_PUBLIC_CITY');
      observedHostileFactions.add(c.factionId);
    }
  }
  invariant(battleResult.eligibleCaptorFactionIds.every(factionId=>observedHostileFactions.has(factionId)),'RETREAT_CAPTOR_MUST_BE_PUBLICLY_OBSERVED');
  return {tileMap,occupiedTileIds:new Set(allOccupancies.map(item=>item.tileId))};
}

function validateEntropy(entropy){
  exactKeys(entropy,['mode','savedSeed','rollBasisPoints'],'INVALID_RETREAT_ENTROPY_SHAPE');
  invariant(ENTROPY_MODES.has(entropy.mode),'INVALID_RETREAT_ENTROPY_MODE');
  if(entropy.mode==='EXPLICIT_ROLL'){
    invariant(entropy.savedSeed===null&&integer(entropy.rollBasisPoints,0,9999),'INVALID_RETREAT_EXPLICIT_ROLL');
  }else invariant(integer(entropy.savedSeed,0,0xffffffff)&&entropy.rollBasisPoints===null,'INVALID_RETREAT_SAVED_SEED');
}

function legalRetreatTileIds(publicWorld,context){
  const {tileMap,occupiedTileIds}=context,army=publicWorld.defeatedArmy;
  const results=[];
  for(const edge of publicWorld.edges){
    const touchesFrom=edge.fromTileId===army.tileId,touchesTo=edge.toTileId===army.tileId;
    if(!touchesFrom&&!touchesTo)continue;
    const destinationTileId=touchesFrom?edge.toTileId:edge.fromTileId,destination=tileMap.get(destinationTileId);
    if(destination.knowledge!=='VISIBLE'||edge.blocked||edge.travelTicksByClass[army.movementClass]===null||occupiedTileIds.has(destinationTileId))continue;
    results.push(destinationTileId);
  }
  return [...new Set(results)].sort((left,right)=>left.localeCompare(right,'en'));
}

function fateRoll(input){
  if(input.entropy.mode==='EXPLICIT_ROLL')return input.entropy.rollBasisPoints;
  return hash32({lane:'BLOCKED_FATE',savedSeed:input.entropy.savedSeed,transactionId:input.battleResult.transactionId,sourceResultId:input.battleResult.sourceResultId,defeatedArmyId:input.battleResult.defeatedArmyId})%10000;
}

function captorIndex(input,count,roll){
  if(input.entropy.mode==='EXPLICIT_ROLL')return roll%count;
  return hash32({lane:'CAPTOR',savedSeed:input.entropy.savedSeed,transactionId:input.battleResult.transactionId,sourceResultId:input.battleResult.sourceResultId,defeatedArmyId:input.battleResult.defeatedArmyId})%count;
}

export function adjudicateCampaignRetreatFate(input){
  exactKeys(input,INPUT_KEYS,'INVALID_RETREAT_ADJUDICATION_INPUT_SHAPE');
  invariant(input.format===FORMAT&&input.version===VERSION,'INVALID_RETREAT_ADJUDICATION_FORMAT');
  validateBattleResult(input.battleResult);
  const publicContext=validatePublicWorld(input.publicWorld,input.battleResult);
  validateEntropy(input.entropy);
  const routeExists=legalRetreatTileIds(input.publicWorld,publicContext).length>0;
  const roll=fateRoll(input);
  let commanderFate='ESCAPED',captorFactionId=null;
  if(!routeExists&&roll>=RULES.blockedFateBasisPoints.captured[0]){
    if(roll<RULES.blockedFateBasisPoints.captured[1]){
      commanderFate='CAPTURED';
      const captors=[...input.battleResult.eligibleCaptorFactionIds].sort((left,right)=>left.localeCompare(right,'en'));
      captorFactionId=captors[captorIndex(input,captors.length,roll)];
    }else commanderFate='DEAD';
  }
  const output={
    transactionId:input.battleResult.transactionId,
    sourceResultId:input.battleResult.sourceResultId,
    globalTick:input.battleResult.globalTick,
    defeatedArmyId:input.battleResult.defeatedArmyId,
    commanderFate,
    captorFactionId,
  };
  exactKeys(output,RESULT_KEYS,'INVALID_RETREAT_ADJUDICATION_OUTPUT');
  return output;
}

export const CAMPAIGN_RETREAT_FATE_FORMAT=FORMAT;
export const CAMPAIGN_RETREAT_FATE_VERSION=VERSION;
export const CAMPAIGN_RETREAT_PUBLIC_FORMAT=PUBLIC_FORMAT;
export const CAMPAIGN_RETREAT_PUBLIC_VERSION=PUBLIC_VERSION;
export const CAMPAIGN_RETREAT_FATE_RULES=RULES;
