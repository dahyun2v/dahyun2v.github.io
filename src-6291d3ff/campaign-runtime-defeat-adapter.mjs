import {parentTroop} from './campaign-special-troops.mjs';
import {boardNeighbors,movementTicks,tileId} from './map-primitives.mjs';
import {
  adjudicateCampaignRetreatFate,
  CAMPAIGN_RETREAT_FATE_FORMAT,
  CAMPAIGN_RETREAT_FATE_VERSION,
  CAMPAIGN_RETREAT_PUBLIC_FORMAT,
  CAMPAIGN_RETREAT_PUBLIC_VERSION,
} from './campaign-retreat-fate-adjudicator.mjs';

const FORMAT='sangoku-campaign-runtime-defeat-adapter';
const VERSION=1;
const KNOWN=new Set(['VISIBLE','REMEMBERED']);
const MOVEMENT_TROOP={normal:'spear',cavalry:'cavalry',engineer:'engineer'};

const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
function invariant(condition,message){if(!condition)throw new Error(message);}
function clone(value){return structuredClone(value);}
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
function token(value){return hash32(value).toString(16).padStart(8,'0');}
function sortedUnique(values,message){
  invariant(Array.isArray(values)&&values.length>0,message);
  invariant(values.every(value=>typeof value==='string'&&value.length>0),message);
  invariant(new Set(values).size===values.length,message);
  return [...values].sort((left,right)=>left.localeCompare(right,'en'));
}
function same(left,right){return stable(left)===stable(right);}
function edgeKey(left,right){return [left,right].sort((a,b)=>a.localeCompare(b,'en')).join('|');}
function currentWorldTick(world){
  invariant(integer(world?.turnNumber,1)&&integer(world?.time?.ticksPerTurn,1)&&integer(world?.time?.tick,0,world.time.ticksPerTurn),'INVALID_RUNTIME_WORLD_TICK');
  return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;
}

function validateRuntimeBoundary(runtime,currentGlobalTick,mergedResultIds){
  invariant(object(runtime)&&object(runtime.world)&&object(runtime.combat),'RUNTIME_DEFEAT_ADAPTER_RUNTIME_REQUIRED');
  invariant(integer(currentGlobalTick)&&currentWorldTick(runtime.world)===currentGlobalTick,'RUNTIME_DEFEAT_ADAPTER_TICK_MISMATCH');
  invariant(integer(runtime.world.campaignSeed,0,0xffffffff),'RUNTIME_DEFEAT_ADAPTER_SAVED_SEED_REQUIRED');
  const battleId=runtime.combat.battleId;
  invariant(typeof battleId==='string'&&battleId.length>0,'RUNTIME_DEFEAT_ADAPTER_BATTLE_ID_REQUIRED');
  const coordinator=runtime.combat.coordinator,delta=runtime.combat.delta;
  invariant(object(coordinator)&&object(coordinator.actorStates)&&object(coordinator.batches),'RUNTIME_DEFEAT_ADAPTER_COORDINATOR_REQUIRED');
  invariant(object(delta)&&object(delta.units)&&object(delta.processedBatches)&&object(delta.processedResults),'RUNTIME_DEFEAT_ADAPTER_DELTA_REQUIRED');
  const coordinatorBatch=coordinator.batches[String(currentGlobalTick)];
  const deltaBatchId=`${battleId}/${currentGlobalTick}`,deltaBatch=delta.processedBatches[deltaBatchId];
  invariant(object(coordinatorBatch)&&coordinatorBatch.currentTick===currentGlobalTick,'RUNTIME_DEFEAT_ADAPTER_CURRENT_COORDINATOR_BATCH_REQUIRED');
  invariant(object(deltaBatch)&&deltaBatch.currentTick===currentGlobalTick,'RUNTIME_DEFEAT_ADAPTER_CURRENT_DELTA_BATCH_REQUIRED');
  const supplied=sortedUnique(mergedResultIds,'RUNTIME_DEFEAT_ADAPTER_MERGED_RESULT_IDS_REQUIRED');
  const deltaIds=sortedUnique(deltaBatch.resultIds,'RUNTIME_DEFEAT_ADAPTER_DELTA_RESULT_IDS_REQUIRED');
  const coordinatorIds=sortedUnique((coordinatorBatch.resultOrder??[]).map(record=>record.resultId),'RUNTIME_DEFEAT_ADAPTER_COORDINATOR_RESULT_IDS_REQUIRED');
  invariant(same(supplied,deltaIds)&&same(deltaIds,coordinatorIds),'RUNTIME_DEFEAT_ADAPTER_EXACT_MERGED_RESULT_SET_REQUIRED');
  for(const resultId of supplied)invariant(delta.processedResults[resultId]?.batchId===deltaBatchId,`RUNTIME_DEFEAT_ADAPTER_UNPROCESSED_RESULT:${resultId}`);
  return {battleId,coordinatorBatch,deltaBatchId,mergedResultIds:supplied};
}

function resolveMergedResults(runtime,context){
  const records=[];
  for(const reference of context.coordinatorBatch.resultOrder){
    const actorState=runtime.combat.coordinator.actorStates[reference.actorRef];
    const instance=actorState?.instances?.[reference.actionInstanceId];
    const result=instance?.results?.find(item=>item.resultId===reference.resultId);
    invariant(result&&typeof result.targetRef==='string'&&result.targetRef.length>0,`RUNTIME_DEFEAT_ADAPTER_RESULT_REFERENCE_MISMATCH:${reference.resultId}`);
    invariant(instance.definition?.eventProfile==='ATTACK'||instance.definition?.eventProfile==='CONTROL'||instance.definition?.eventProfile==='SUPPORT',`RUNTIME_DEFEAT_ADAPTER_RESULT_PROFILE_REQUIRED:${reference.resultId}`);
    records.push({
      resultId:reference.resultId,
      actorRef:reference.actorRef,
      targetRef:result.targetRef,
      eventProfile:instance.definition.eventProfile,
    });
  }
  return records.sort((left,right)=>left.resultId.localeCompare(right.resultId,'en')||left.actorRef.localeCompare(right.actorRef,'en'));
}

function terminalArmyDisposition(runtime,armyId){
  const sidecar=runtime.campaignTerminal?.armiesById?.[armyId]?.disposition;
  const applied=runtime.world.campaignTerminalWorld?.armiesById?.[armyId]?.disposition;
  invariant(!sidecar||!applied||sidecar===applied,`RUNTIME_DEFEAT_ADAPTER_TERMINAL_DISPOSITION_MISMATCH:${armyId}`);
  return sidecar??applied??'ACTIVE';
}

function movementClass(troopType){
  troopType=parentTroop(troopType);
  if(troopType==='cavalry')return 'cavalry';
  if(troopType==='engineer')return 'engineer';
  invariant(['spear','bow','militia','mystic'].includes(troopType),`RUNTIME_DEFEAT_ADAPTER_UNKNOWN_TROOP_TYPE:${troopType}`);
  return 'normal';
}

function knownStaticEdge(world,fromId,toId,knowledge){
  const from=world.tiles[fromId],to=world.tiles[toId],key=edgeKey(fromId,toId),rules=world.mapRules;
  const edge={
    road:rules.roads.includes(key),
    river:rules.riverEdges.includes(key),
    crossing:rules.crossings[key]??'none',
    blocked:rules.blockedEdges.includes(key),
  };
  const travelTicksByClass={};
  for(const[className,troopType]of Object.entries(MOVEMENT_TROOP))travelTicksByClass[className]=movementTicks({
    from,to,troopType,maneuver:50,edge,tuning:rules.tuning,tickDays:world.time.tickDays,
  });
  const blocked=Object.values(travelTicksByClass).every(value=>value===null);
  return {
    edgeId:`E.${token({fromId,toId})}`,
    fromTileId:fromId,
    toTileId:toId,
    knowledge,
    blocked,
    travelTicksByClass,
  };
}

function publicTilesAndEdges(world,factionId){
  const knowledge=world.knowledge?.[factionId]?.tiles;
  invariant(object(knowledge)&&object(world.tiles)&&object(world.mapRules),'RUNTIME_DEFEAT_ADAPTER_PUBLIC_MAP_REQUIRED');
  const tiles=Object.keys(world.tiles).sort((a,b)=>a.localeCompare(b,'en')).map(id=>{
    const tile=world.tiles[id],state=knowledge[id];
    invariant(['VISIBLE','REMEMBERED','UNEXPLORED'].includes(state),`RUNTIME_DEFEAT_ADAPTER_TILE_KNOWLEDGE_REQUIRED:${id}`);
    invariant(tileId(tile)===id,`RUNTIME_DEFEAT_ADAPTER_TILE_ID_MISMATCH:${id}`);
    return {tileId:id,q:tile.q,r:tile.r,knowledge:state};
  });
  const edges=[];
  for(const fromId of Object.keys(world.tiles).sort((a,b)=>a.localeCompare(b,'en'))){
    if(!KNOWN.has(knowledge[fromId]))continue;
    for(const point of boardNeighbors(world.tiles[fromId],world.tiles)){
      const toId=tileId(point);
      if(fromId.localeCompare(toId,'en')>=0||!KNOWN.has(knowledge[toId]))continue;
      edges.push(knownStaticEdge(world,fromId,toId,knowledge[fromId]==='VISIBLE'&&knowledge[toId]==='VISIBLE'?'VISIBLE':'REMEMBERED'));
    }
  }
  const edgeIds=new Set(edges.map(edge=>edge.edgeId));
  invariant(edgeIds.size===edges.length,'RUNTIME_DEFEAT_ADAPTER_EDGE_ID_COLLISION');
  return {tiles,edges:edges.sort((a,b)=>a.edgeId.localeCompare(b.edgeId,'en'))};
}

function publicOccupancy(runtime,factionId){
  const world=runtime.world,knowledge=world.knowledge[factionId];
  invariant(object(knowledge)&&object(knowledge.observedArmies),'RUNTIME_DEFEAT_ADAPTER_PUBLIC_OCCUPANCY_REQUIRED');
  const ownArmies=Object.values(world.armies).filter(army=>
    army.factionId===factionId&&terminalArmyDisposition(runtime,army.armyId)==='ACTIVE'&&KNOWN.has(knowledge.tiles[army.tileId])
  ).map(army=>({armyId:army.armyId,factionId:army.factionId,tileId:army.tileId})).sort((a,b)=>a.armyId.localeCompare(b.armyId,'en'));
  const observedHostileArmies=Object.values(knowledge.observedArmies).filter(record=>{
    const army=world.armies[record.armyId];
    return army&&army.factionId!==factionId&&terminalArmyDisposition(runtime,army.armyId)==='ACTIVE'&&knowledge.tiles[record.tileId]==='VISIBLE'&&army.factionId===record.factionId&&army.tileId===record.tileId;
  }).map(record=>({armyId:record.armyId,factionId:record.factionId,tileId:record.tileId})).sort((a,b)=>a.armyId.localeCompare(b.armyId,'en'));
  const occupancy=[...ownArmies,...observedHostileArmies];
  invariant(new Set(occupancy.map(item=>item.armyId)).size===occupancy.length,'RUNTIME_DEFEAT_ADAPTER_DUPLICATE_PUBLIC_ARMY');
  invariant(new Set(occupancy.map(item=>item.tileId)).size===occupancy.length,'RUNTIME_DEFEAT_ADAPTER_DUPLICATE_PUBLIC_OCCUPIED_TILE');
  return {ownArmies,observedHostileArmies};
}

function sourceIds({battleId,currentGlobalTick,defeatedArmyId,resultIds}){
  const basis={format:FORMAT,version:VERSION,battleId,currentGlobalTick,defeatedArmyId,resultIds:[...resultIds].sort((a,b)=>a.localeCompare(b,'en'))};
  return {
    sourceResultId:`R9.RESULT.${token({lane:'SOURCE',...basis})}`,
    transactionId:`R9.DEFEAT.${currentGlobalTick}.${token({lane:'TRANSACTION',...basis})}`,
  };
}

/**
 * Convert one already merged runtime combat batch into public retreat/fate
 * adjudication inputs. The runtime is trusted canonical state; only facts that
 * its defeated faction already knows cross into each publicWorld envelope.
 */
export function createCampaignRuntimeDefeatAdjudicationEnvelopes({runtime,currentGlobalTick,mergedResultIds}={}){
  const context=validateRuntimeBoundary(runtime,currentGlobalTick,mergedResultIds);
  const mergedResults=resolveMergedResults(runtime,context);
  const impactedArmyIds=[...new Set(mergedResults.map(result=>result.targetRef))].sort((a,b)=>a.localeCompare(b,'en'));
  const envelopes=[];
  for(const defeatedArmyId of impactedArmyIds){
    const army=runtime.world.armies?.[defeatedArmyId],unit=runtime.combat.delta.units[defeatedArmyId];
    invariant(army&&unit,`RUNTIME_DEFEAT_ADAPTER_TARGET_ARMY_REQUIRED:${defeatedArmyId}`);
    if(terminalArmyDisposition(runtime,defeatedArmyId)!=='ACTIVE')continue;
    if(unit.activePersonnel!==0&&unit.routePending!==true&&runtime.combat.calculator?.units?.[defeatedArmyId]?.currentHp!==0)continue;
    const linked=mergedResults.filter(result=>result.targetRef===defeatedArmyId);
    const {ownArmies,observedHostileArmies}=publicOccupancy(runtime,army.factionId);
    const observedFactionIds=new Set(observedHostileArmies.map(record=>record.factionId));
    const eligibleCaptorFactionIds=[...new Set(linked.map(result=>{
      const actor=runtime.world.armies[result.actorRef];
      return actor&&actor.factionId!==army.factionId&&observedFactionIds.has(actor.factionId)?actor.factionId:null;
    }).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'en'));
    invariant(eligibleCaptorFactionIds.length>0,`RUNTIME_DEFEAT_ADAPTER_NO_PUBLIC_ELIGIBLE_CAPTOR:${defeatedArmyId}`);
    const resultIds=linked.map(result=>result.resultId).sort((a,b)=>a.localeCompare(b,'en'));
    const ids=sourceIds({battleId:context.battleId,currentGlobalTick,defeatedArmyId,resultIds});
    const map=publicTilesAndEdges(runtime.world,army.factionId);
    const publicWorld={
      format:CAMPAIGN_RETREAT_PUBLIC_FORMAT,
      version:CAMPAIGN_RETREAT_PUBLIC_VERSION,
      viewerFactionId:army.factionId,
      defeatedArmy:{armyId:defeatedArmyId,factionId:army.factionId,tileId:army.tileId,movementClass:movementClass(army.troopType)},
      tiles:map.tiles,
      edges:map.edges,
      ownArmies,
      observedHostileArmies,
    };
    envelopes.push({
      format:CAMPAIGN_RETREAT_FATE_FORMAT,
      version:CAMPAIGN_RETREAT_FATE_VERSION,
      battleResult:{
        transactionId:ids.transactionId,
        sourceResultId:ids.sourceResultId,
        globalTick:currentGlobalTick,
        defeatedArmyId,
        defeatedFactionId:army.factionId,
        defeated:true,
        routePending:unit.routePending===true,
        eligibleCaptorFactionIds,
      },
      publicWorld,
      entropy:{mode:'SAVED_SEED',savedSeed:runtime.world.campaignSeed,rollBasisPoints:null},
    });
  }
  const transactionIds=envelopes.map(envelope=>envelope.battleResult.transactionId);
  invariant(new Set(transactionIds).size===transactionIds.length,'RUNTIME_DEFEAT_ADAPTER_TRANSACTION_ID_COLLISION');
  return clone(envelopes);
}

export function adjudicateCampaignRuntimeDefeatSignals(input){
  return createCampaignRuntimeDefeatAdjudicationEnvelopes(input).map(envelope=>adjudicateCampaignRetreatFate(envelope));
}

export const CAMPAIGN_RUNTIME_DEFEAT_ADAPTER_FORMAT=FORMAT;
export const CAMPAIGN_RUNTIME_DEFEAT_ADAPTER_VERSION=VERSION;
export const CAMPAIGN_RUNTIME_DEFEAT_ADAPTER_RULES=Object.freeze({
  status:'WORK_TRIAL_PURE_ADAPTER',
  candidate:'CURRENT_BATCH_TARGET_AND_ACTIVE_CANONICAL_AND_ZERO_HP_OR_ZERO_ACTIVE_OR_ROUTE_PENDING',
  publicMap:'DEFEATED_FACTION_KNOWLEDGE_ONLY',
  captor:'CURRENT_RESULT_PARTICIPANT_AND_PUBLICLY_OBSERVED',
  automaticCityCapture:false,
  mutatesRuntime:false,
});
