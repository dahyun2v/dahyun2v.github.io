import { createRng } from './rng.mjs';
import {buildMapRules,findPath as findMovementPath,issueOrder as issueMovementOrder,moveOneTick} from './movement.mjs';
import {hexDistance} from './map-primitives.mjs';
import {updateKnowledge} from './knowledge.mjs';
export {getFactionView} from './knowledge.mjs';
export const SAVE_VERSION=3;
export const SAVE_KEY='sangoku-first3-save-v3';
export const TICK_DAYS=0.05, TICKS_PER_TURN=200, DAYS_PER_TURN=10;
export const CAMPAIGN_TERMINAL_WORLD_FORMAT='sangoku-first3-terminal-world';
export const CAMPAIGN_TERMINAL_WORLD_VERSION=1;
const FORMAT='sangoku-first3-save';
const clone=v=>structuredClone(v);
const own=(o,k)=>Object.hasOwn(o,k);
const need=(ok,message='저장 자료의 상태 또는 연결이 올바르지 않습니다.')=>{if(!ok)throw new Error(message);};
const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const finite=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v) && finite(v,min,max);
const sameIds=(a,b)=>Array.isArray(a) && [...a].sort().join('|')===[...b].sort().join('|');
function stable(v){if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;if(object(v))return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;return JSON.stringify(v);}
const exactKeys=(value,keys)=>object(value)&&stable(Object.keys(value).sort())===stable([...keys].sort());
const uniqueIds=values=>Array.isArray(values)&&values.every(value=>typeof value==='string'&&value.length>0)&&new Set(values).size===values.length;
const globalTick=s=>(s.turnNumber-1)*TICKS_PER_TURN+s.time.tick;
export function isTerminalReserveCityLocation(world,officer,assignment){return assignment?.kind==='NONE'&&officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.locationRef?.kind==='CITY'&&world.cities[officer.locationRef.id]?.ownerFactionId===officer.allegianceFactionId;}
const campaignId=s=>`${s.scenarioId}.${s.contentFingerprint}.S${s.campaignSeed}`;
function validateCampaignTerminalWorldExtension(s){
  const extension=s.campaignTerminalWorld;
  need(exactKeys(extension,['format','version','campaignId','sourceTerminalFormat','sourceTerminalVersion','sourceGlobalTick','sourceRecordIds','sourceChoiceIds','sourcePrisonerRecordIds','factionsById','citiesById','armiesById','officersById','gameResult']),'종단 월드 확장 형식이 올바르지 않습니다.');
  need(extension.format===CAMPAIGN_TERMINAL_WORLD_FORMAT&&extension.version===CAMPAIGN_TERMINAL_WORLD_VERSION&&extension.campaignId===campaignId(s));
  need(extension.sourceTerminalFormat==='sangoku-campaign-terminal-state'&&extension.sourceTerminalVersion===1&&integer(extension.sourceGlobalTick)&&extension.sourceGlobalTick<=globalTick(s));
  for(const key of ['sourceRecordIds','sourceChoiceIds','sourcePrisonerRecordIds'])need(uniqueIds(extension[key]));
  need(extension.sourceRecordIds.length>0,'종단 사건이 없는 월드에는 종단 확장을 붙일 수 없습니다.');
  need(object(extension.factionsById)&&sameIds(Object.keys(extension.factionsById),Object.keys(s.factions)));
  need(object(extension.citiesById)&&sameIds(Object.keys(extension.citiesById),Object.keys(s.cities)));
  need(object(extension.armiesById)&&sameIds(Object.keys(extension.armiesById),Object.keys(s.armies)));
  need(object(extension.officersById)&&sameIds(Object.keys(extension.officersById),Object.keys(s.officers)));
  const recordIds=new Set(extension.sourceRecordIds);
  for(const[id,state]of Object.entries(extension.factionsById)){
    need(exactKeys(state,['factionId','alive','rulerId','rulerVacancy'])&&state.factionId===id&&state.alive===s.factions[id].alive&&state.rulerId===s.factions[id].rulerId);
    need(['NONE','PENDING_SUCCESSION','VACANT_ONE_TURN','EXTINCT'].includes(state.rulerVacancy));
    if(!state.alive)need(state.rulerId===null&&state.rulerVacancy==='EXTINCT');
    else if(state.rulerId===null)need(['PENDING_SUCCESSION','VACANT_ONE_TURN'].includes(state.rulerVacancy)&&extension.sourceChoiceIds.length>0);
    else need(state.rulerVacancy==='NONE'&&own(s.officers,state.rulerId)&&s.officers[state.rulerId].allegianceFactionId===id);
  }
  for(const[id,state]of Object.entries(extension.citiesById)){
    need(exactKeys(state,['cityId','ownerFactionId','governorId','occupationState','pendingGovernor','occupationRecordId',...((s.mapId==='v2'||s.mapId==='v3')?['kind']:[])])&&state.cityId===id);
    need(((s.mapId!=='v2'&&s.mapId!=='v3')||state.kind===s.cities[id].kind)&&state.ownerFactionId===s.cities[id].ownerFactionId&&state.governorId===s.cities[id].governorId&&state.occupationState===s.cities[id].occupationState&&(own(s.factions,state.ownerFactionId)||((s.mapId==='v2'||s.mapId==='v3')&&state.kind==='minor'&&state.ownerFactionId===null)));
    if(state.occupationState==='NORMAL')need((state.governorId!==null||((s.mapId==='v2'||s.mapId==='v3')&&state.kind==='minor'&&state.ownerFactionId===null))&&state.pendingGovernor===false&&state.occupationRecordId===null);
    else need(state.occupationState==='TEMPORARY_OCCUPATION'&&state.governorId===null&&state.pendingGovernor===true&&recordIds.has(state.occupationRecordId)&&extension.sourceChoiceIds.length>0);
  }
  for(const[id,state]of Object.entries(extension.armiesById)){
    need(exactKeys(state,['armyId','factionId','commanderId','disposition','terminalAtTick','terminalRecordId'])&&state.armyId===id);
    need(state.factionId===s.armies[id].factionId&&state.commanderId===s.armies[id].commanderId&&['ACTIVE','DEFEATED','DISBANDED'].includes(state.disposition));
    if(state.disposition==='ACTIVE')need(state.terminalAtTick===null&&state.terminalRecordId===null&&s.factions[state.factionId].alive);
    else need(integer(state.terminalAtTick)&&state.terminalAtTick<=extension.sourceGlobalTick&&recordIds.has(state.terminalRecordId));
  }
  for(const[id,state]of Object.entries(extension.officersById)){
    need(exactKeys(state,['officerId','allegianceFactionId','lifeState','captivityState','captorFactionId','assignment'])&&state.officerId===id);
    need(state.allegianceFactionId===s.officers[id].allegianceFactionId&&state.lifeState===s.officers[id].lifeState&&state.captivityState===s.officers[id].captivityState&&state.captorFactionId===s.officers[id].captorFactionId);
    need(exactKeys(state.assignment,['kind','id'])&&['NONE','CITY','ARMY'].includes(state.assignment.kind)&&(stable(state.assignment)===stable(s.officers[id].locationRef)||isTerminalReserveCityLocation(s,s.officers[id],state.assignment)));
    if(state.assignment.kind==='NONE')need(state.assignment.id===null);
    if(state.assignment.kind==='CITY')need(own(s.cities,state.assignment.id));
    if(state.assignment.kind==='ARMY')need(own(s.armies,state.assignment.id));
    if(state.lifeState==='DEAD')need(state.captivityState==='FREE'&&state.captorFactionId===null&&state.assignment.kind==='NONE');
    if(state.captivityState==='PRISONER')need(state.lifeState==='ALIVE'&&own(s.factions,state.captorFactionId)&&state.captorFactionId!==state.allegianceFactionId&&state.assignment.kind==='NONE'&&extension.sourcePrisonerRecordIds.length>0);
    else need(state.captorFactionId===null);
  }
  need(stable(s.gameResult)===stable(extension.gameResult));
  if(extension.gameResult!==null){
    const result=extension.gameResult;
    need(exactKeys(result,['type','terminalAtTick','winnerFactionId','loserFactionIds','terminalRecordId','reportId','reasonCode','causeRecordIds']));
    need(['UNIFICATION','PLAYER_DEFEAT'].includes(result.type)&&integer(result.terminalAtTick)&&result.terminalAtTick<=extension.sourceGlobalTick&&recordIds.has(result.terminalRecordId));
    need(uniqueIds(result.loserFactionIds)&&result.loserFactionIds.every(id=>own(s.factions,id)&&!s.factions[id].alive));
    need(uniqueIds(result.causeRecordIds)&&result.causeRecordIds.every(id=>recordIds.has(id))&&typeof result.reportId==='string'&&result.reportId.length>0&&typeof result.reasonCode==='string'&&result.reasonCode.length>0);
    if(result.winnerFactionId!==null)need(own(s.factions,result.winnerFactionId)&&s.factions[result.winnerFactionId].alive);
    need(sameIds(result.loserFactionIds,Object.keys(s.factions).filter(id=>!s.factions[id].alive)));
    if(result.type==='UNIFICATION')need(result.winnerFactionId!==null&&Object.keys(s.factions).every(id=>id===result.winnerFactionId||!s.factions[id].alive)&&Object.values(s.cities).filter(city=>city.kind!=='minor').every(city=>city.ownerFactionId===result.winnerFactionId));
    else need(s.playerFactionId!==null&&!s.factions[s.playerFactionId].alive&&result.loserFactionIds.includes(s.playerFactionId));
  }
  return extension;
}
export function contentFingerprint(map,initialData,movementData){let hash=0x811c9dc5;for(const c of stable({map,initialData,movementData}))hash=Math.imul(hash^c.charCodeAt(0),0x01000193)>>>0;return hash.toString(16).padStart(8,'0');}
// Compatibility fingerprint only; not a security signature.
export function validateState(s,{allowCitylessAlive=false}={}){
  need(object(s) && s.schemaVersion===SAVE_VERSION && s.scenarioId==='FIRST3-fixed-v1');
  need(typeof s.contentFingerprint==='string' && /^[a-f0-9]{8}$/.test(s.contentFingerprint));
  need(integer(s.campaignSeed,0,0xffffffff) && object(s.rng) && s.rng.algorithm==='lcg32-v1' && integer(s.rng.value,0,0xffffffff) && integer(s.rng.draws));
  const hasTerminalWorld=own(s,'campaignTerminalWorld');
  need(integer(s.turnNumber,1) && finite(s.currentDate) && ['PLANNING','EXECUTION_TIMELINE'].includes(s.turnPhase) && (hasTerminalWorld?object(s.campaignTerminalWorld):s.gameResult===null));
  need(object(s.time) && s.time.tickDays===TICK_DAYS && s.time.ticksPerTurn===TICKS_PER_TURN && s.time.daysPerTurn===DAYS_PER_TURN && integer(s.time.tick,0,TICKS_PER_TURN-1));
  need((s.time.tick===0)===(s.turnPhase==='PLANNING') && Math.abs(s.currentDate-((s.turnNumber-1)*DAYS_PER_TURN+s.time.tick*TICK_DAYS))<1e-8);
  need(integer(s.orderSequence) && object(s.mapRules) && s.mapRules.version===1 && object(s.mapRules.tuning) && object(s.mapRules.vision));
  for(const key of ['roads','riverEdges','blockedEdges'])need(Array.isArray(s.mapRules[key]) && s.mapRules[key].every(x=>typeof x==='string'));
  need(object(s.mapRules.crossings));
  need(s.mapRules.vision.profile==='CAMPAIGN_V1'
    ? integer(s.mapRules.vision.field,1,12) && integer(s.mapRules.vision.city,1,15) && s.mapRules.vision.hillBonus===1
    : s.mapRules.vision.field===3 && s.mapRules.vision.city===3 && s.mapRules.vision.hillBonus===1);
  for(const key of ['normal','cavalry','engineer'])for(const field of ['plain','rough','road','crossingExtra'])need(finite(s.mapRules.tuning[key]?.[field],0.01));
  need(finite(s.mapRules.tuning.maneuverRange?.timeMultiplierAtMinimum,0.01) && finite(s.mapRules.tuning.maneuverRange?.timeMultiplierAtMaximum,0.01));
  for(const k of ['factions','cities','officers','armies','tiles'])need(object(s[k]));
  need(sameIds(Object.keys(s.factions),['F01','F02','F03']) && Object.keys(s.cities).length===((s.mapId==='v2'||s.mapId==='v3')?8:3) && Object.keys(s.officers).length>=9 && Object.keys(s.armies).length>=6 && Object.keys(s.tiles).length===((s.mapId==='v2'||s.mapId==='v3')?(s.mapId==='v3'?640:520):252));
  for(const [id,t]of Object.entries(s.tiles))need(t.tileId===id && ((s.mapId==='v2'||s.mapId==='v3')?integer(t.r,0,s.mapId==='v3'?31:19)&&integer(t.q+Math.floor(t.r/2),0,s.mapId==='v3'?19:25):integer(t.q,0,17)&&integer(t.r,0,13)) && id===`${t.q},${t.r}` && ['plain','forest','hill','mountain','water'].includes(t.terrainType));
  const terminalWorld=hasTerminalWorld?validateCampaignTerminalWorldExtension(s):null;
  const assigned=new Set();
  for(const [id,f]of Object.entries(s.factions)){
    need(f.factionId===id && typeof f.name==='string' && finite(f.science) && finite(f.prestige) && typeof f.alive==='boolean');
    need(own(s.cities,f.capitalCityId));
    if(terminalWorld){
      const factionState=terminalWorld.factionsById[id];
      if(f.rulerId!==null)need(own(s.officers,f.rulerId)&&s.officers[f.rulerId].allegianceFactionId===id&&s.officers[f.rulerId].lifeState==='ALIVE'&&s.officers[f.rulerId].captivityState==='FREE');
      need(f.alive===Object.values(s.cities).some(city=>city.kind!=='minor'&&city.ownerFactionId===id)||(allowCitylessAlive&&f.alive&&s.gameResult===null));
      need(factionState.alive===f.alive&&factionState.rulerId===f.rulerId);
    }else need(own(s.officers,f.rulerId) && s.officers[f.rulerId].allegianceFactionId===id);
    need(sameIds(f.ownedCityIds,Object.values(s.cities).filter(c=>c.ownerFactionId===id).map(c=>c.cityId)));
    need(sameIds(f.officerIds,Object.values(s.officers).filter(o=>o.allegianceFactionId===id).map(o=>o.officerId)));
    need(sameIds(f.armyIds,Object.values(s.armies).filter(a=>a.factionId===id).map(a=>a.armyId)));
  }
  for(const[id,c]of Object.entries(s.cities)){
    need(c.cityId===id && typeof c.name==='string' && (own(s.factions,c.ownerFactionId)||((s.mapId==='v2'||s.mapId==='v3')&&c.kind==='minor'&&c.ownerFactionId===null)) && own(s.tiles,c.tileId));
    need(integer(c.population,1) && integer(c.populationCapacity,c.population) && finite(c.foodStock) && finite(c.foodCapacity,c.foodStock) && finite(c.productionProgress) && integer(c.reserveTroops) && integer(c.woundedTroops));
    need(object(c.specialResources) && Object.values(c.specialResources).every(v=>finite(v)) && object(c.reservedResources) && Object.values(c.reservedResources).every(v=>finite(v)));
    need(c.reservedResources.food<=c.foodStock && c.reservedResources.iron<=c.specialResources.iron && c.reservedResources.horses<=c.specialResources.horses);
    const cityState=terminalWorld?.citiesById[id];
    if(c.governorId===null)need(((s.mapId==='v2'||s.mapId==='v3')&&c.kind==='minor'&&c.ownerFactionId===null)||cityState?.occupationState==='TEMPORARY_OCCUPATION'&&cityState.pendingGovernor===true);
    else{
      need(own(s.officers,c.governorId) && s.officers[c.governorId].allegianceFactionId===c.ownerFactionId && s.officers[c.governorId].lifeState==='ALIVE'&&s.officers[c.governorId].captivityState==='FREE'&&!assigned.has(c.governorId));assigned.add(c.governorId);
      need(s.officers[c.governorId].locationRef.kind==='CITY' && s.officers[c.governorId].locationRef.id===id);
    }
    need(Array.isArray(c.workedTiles) && c.workedTiles.length<=c.population && new Set(c.workedTiles).size===c.workedTiles.length && c.workedTiles.every(t=>own(s.tiles,t)));
  }
  const occupied=new Set();
  for(const[id,a]of Object.entries(s.armies)){
    const armyState=terminalWorld?.armiesById[id],active=!armyState||armyState.disposition==='ACTIVE';
    need(a.armyId===id && own(s.factions,a.factionId) && own(s.officers,a.commanderId) && own(s.tiles,a.tileId));
    const o=s.officers[a.commanderId];need(o.allegianceFactionId===a.factionId && o.allowedTroops.includes(a.troopType));
    if(active){need(!occupied.has(a.tileId)&&!assigned.has(a.commanderId)&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.locationRef.kind==='ARMY'&&o.locationRef.id===id);occupied.add(a.tileId);assigned.add(a.commanderId);}
    need(integer(a.troopCount) && integer(a.woundedCount) && integer(a.deadCount) && finite(a.hp) && finite(a.maxHp,a.hp) && finite(a.morale,0,100) && finite(a.stamina) && finite(a.maxStamina,a.stamina) && finite(a.supplyFood));
    need(Array.isArray(a.statusEffects) && Array.isArray(a.cooldowns) && Array.isArray(a.engagedArmyIds));
    const order=a.currentOrder,m=a.movementState;
    need(!own(a,'movementProgress'));
    if(!active)need(order===null&&m===null);
    if(order!==null){
      need(object(order) && typeof order.orderId==='string' && order.armyId===id && ['MOVE','HOLD'].includes(order.type) && integer(order.issuedTurn,1,s.turnNumber));
      need(['PLANNED','ACTIVE','HOLDING','COMPLETED','CONTACT','EDGE_CONTACT','WAITING_FOR_TILE','BLOCKED_INVALID_PATH'].includes(order.status));
      need(Array.isArray(order.pathTileIds) && order.pathTileIds.length>0 && order.pathTileIds.length<=Object.keys(s.tiles).length && order.pathTileIds.every(t=>own(s.tiles,t)));
      need(new Set(order.pathTileIds).size===order.pathTileIds.length);
      for(let pathIndex=1;pathIndex<order.pathTileIds.length;pathIndex++)need(hexDistance(s.tiles[order.pathTileIds[pathIndex-1]],s.tiles[order.pathTileIds[pathIndex]])===1);
      need(integer(order.currentPathIndex,0,order.pathTileIds.length-1) && order.pathTileIds[order.currentPathIndex]===a.tileId && order.destinationTileId===order.pathTileIds.at(-1));
      if(order.type==='HOLD')need(order.status==='HOLDING' && order.pathTileIds.length===1 && m===null);
    }
    if(m!==null)need(object(m) && order?.type==='MOVE' && m.fromTileId===a.tileId && m.toTileId===order.pathTileIds[order.currentPathIndex+1] && finite(m.edgeProgress) && integer(m.edgeTravelTicks,1));
  }
  for(const[id,o]of Object.entries(s.officers)){
    need(o.officerId===id && typeof o.name==='string' && own(s.factions,o.allegianceFactionId) && integer(o.level,1,30) && finite(o.experience) && integer(o.aptitudePoints));
    need(object(o.baseStats) && sameIds(Object.keys(o.baseStats),['leadership','might','intelligence','politics','charisma']) && Object.values(o.baseStats).every(n=>finite(n,0,['v2','v3'].includes(s.mapId)?10000:100)));
    need(object(o.subStats) && Object.keys(o.subStats).length===20 && Object.values(o.subStats).every(n=>finite(n,0,100)));
    need(Array.isArray(o.allowedTroops) && object(o.aptitude) && sameIds(Object.keys(o.aptitude),o.allowedTroops) && Object.values(o.aptitude).every(a=>['C','B','A','S','S+'].includes(a)));
    need(['ALIVE','DEAD'].includes(o.lifeState) && ['NORMAL','WOUNDED','RECOVERING'].includes(o.conditionState) && ['FREE','PRISONER'].includes(o.captivityState) && ['STATIONARY','TRAVELLING'].includes(o.travelState));
    need(o.captorFactionId===null || own(s.factions,o.captorFactionId));
    if(terminalWorld){
      const officerState=terminalWorld.officersById[id];
      need(stable(o.locationRef)===stable(officerState.assignment)||isTerminalReserveCityLocation(s,o,officerState.assignment));
      if(o.lifeState==='DEAD'||o.captivityState==='PRISONER')need(o.locationRef.kind==='NONE'&&o.locationRef.id===null);
    }
    need(!['status','isRuler','isGovernor','currentArmyId','currentCityId'].some(k=>own(o,k)));
    need(Array.isArray(o.acquiredTraits) && Array.isArray(o.activeTraits) && Array.isArray(o.tactics) && object(o.uniqueTrait));
  }
  need(s.playerFactionId===null || own(s.factions,s.playerFactionId));
  need(s.ui===null || (object(s.ui) && own(s.cities,s.ui.selectedCityId) && (s.ui.selectedArmyId===null || (own(s.armies,s.ui.selectedArmyId)&&(!terminalWorld||terminalWorld.armiesById[s.ui.selectedArmyId].disposition==='ACTIVE')))));
  need(Array.isArray(s.pendingChoices) && Array.isArray(s.events) && Array.isArray(s.history) && Array.isArray(s.diplomacy) && object(s.knowledge));
  need(sameIds(Object.keys(s.knowledge),Object.keys(s.factions)));
  for(const [fid,k]of Object.entries(s.knowledge)){
    need(object(k) && object(k.tiles) && sameIds(Object.keys(k.tiles),Object.keys(s.tiles)) && Object.values(k.tiles).every(v=>['UNEXPLORED','REMEMBERED','VISIBLE'].includes(v)));
    need(object(k.observedArmies) && object(k.lastSeenArmies) && object(k.cities));
    for(const [collection,records]of [['observed',k.observedArmies],['lastSeen',k.lastSeenArmies]])for(const [recordId,r]of Object.entries(records)){
      need(r.armyId===recordId && own(s.armies,recordId) && own(s.factions,r.factionId) && r.factionId!==fid && own(s.tiles,r.tileId) && own(s.officers,r.commanderId));
      if(collection==='observed'&&terminalWorld)need(terminalWorld.armiesById[recordId].disposition==='ACTIVE');
      const keys=['armyId','factionId','tileId','commanderId','troopType'];
      if(collection==='lastSeen'){keys.push('lastSeen');need(object(r.lastSeen) && r.lastSeen.tileId===r.tileId && integer(r.lastSeen.turn,1,s.turnNumber) && integer(r.lastSeen.tick,0,200));}
      need(sameIds(Object.keys(r),keys));
    }
    for(const r of Object.values(k.observedArmies))need(!own(r,'lastSeen') && k.tiles[r.tileId]==='VISIBLE');
    for(const [cityId,r]of Object.entries(k.cities))need(sameIds(Object.keys(r),['cityId','name','tileId','ownerFactionId']) && r.cityId===cityId && own(s.cities,cityId) && own(s.tiles,r.tileId) && (own(s.factions,r.ownerFactionId)||((s.mapId==='v2'||s.mapId==='v3')&&s.cities[cityId].kind==='minor'&&r.ownerFactionId===null)) && typeof r.name==='string');
  }
  need(object(s.implementation) && s.implementation.stage==='I1' && s.implementation.turnExecution==='MOVEMENT_ONLY' && Array.isArray(s.implementation.pendingData));
  return s;
}
export function createWorldState({map,initialData,movementData,seed=190919}){
  need(initialData?.schema==='first3-initial-state-v1' && initialData.version===1,'초기 배치 자료의 버전이 맞지 않습니다.');need(integer(seed,0,0xffffffff),'시작 번호가 올바르지 않습니다.');
  const tiles=Object.fromEntries(map.tiles.map(t=>[t.at.join(','),{tileId:t.at.join(','),q:t.at[0],r:t.at[1],terrainType:t.type}]));
  const s={schemaVersion:SAVE_VERSION,scenarioId:initialData.scenarioId,contentFingerprint:contentFingerprint(map,initialData,movementData),campaignSeed:seed,rng:{algorithm:'lcg32-v1',value:createRng(seed).state(),draws:0},turnNumber:1,currentDate:0,turnPhase:'PLANNING',gameResult:null,time:{...clone(initialData.time),tick:0},...clone(initialData.world),tiles,mapRules:buildMapRules(map,movementData),orderSequence:0,playerFactionId:null,ui:null,knowledge:{},pendingChoices:[],history:[],implementation:{stage:'I1',turnExecution:'MOVEMENT_ONLY',pendingData:clone(initialData.pendingData)}};
  need(Object.keys(s.armies).length===6,'FIRST3 초기 부대는 6개여야 합니다.');
  for(const a of Object.values(s.armies)){delete a.movementProgress;a.movementState=null;}
  updateKnowledge(s);
  return validateState(s);
}
export function selectPlayerFaction(world,factionId){need(own(world.factions,factionId),'선택한 세력을 찾을 수 없습니다.');const next=clone(world);next.playerFactionId=factionId;next.ui={selectedCityId:next.factions[factionId].capitalCityId,selectedArmyId:null};return validateState(next);}
export function createInitialState({factionId='F01',...inputs}){return selectPlayerFaction(createWorldState(inputs),factionId);}
export function selectCity(s,cityId){need(own(s.cities,cityId),'선택한 도시를 찾을 수 없습니다.');const next=clone(s);next.ui.selectedCityId=cityId;return next;}
const isActiveArmy=(s,armyId)=>!own(s,'campaignTerminalWorld')||s.campaignTerminalWorld.armiesById[armyId]?.disposition==='ACTIVE';
export function findPath(s,armyId,destination){
  validateState(s);need(isActiveArmy(s,armyId),'패배하거나 해산된 부대는 이동할 수 없습니다.');return findMovementPath(s,armyId,destination);
}
export function issueOrder(s,order){
  validateState(s);need(s.gameResult===null,'종료된 캠페인에는 명령을 내릴 수 없습니다.');need(isActiveArmy(s,order?.armyId),'패배하거나 해산된 부대에는 명령을 내릴 수 없습니다.');
  return validateState(issueMovementOrder(s,order));
}
function updateActiveArmyMovementAndKnowledge(s,movementProgressPermilleByArmyId){
  const allArmies=s.armies,activeArmies=Object.fromEntries(Object.entries(allArmies).filter(([armyId])=>isActiveArmy(s,armyId)));
  for(const armyId of Object.keys(movementProgressPermilleByArmyId))need(own(activeArmies,armyId),'패배하거나 해산된 부대에는 이동 진행을 적용할 수 없습니다.');
  s.armies=activeArmies;
  try{moveOneTick(s,{movementProgressPermilleByArmyId});updateKnowledge(s);}finally{s.armies=allArmies;}
}
export function executeTicks(s,count,{movementProgressPermilleByArmyId={}}={}){
  validateState(s);need(s.gameResult===null,'종료된 캠페인은 더 진행할 수 없습니다.');need(integer(count,1,TICKS_PER_TURN),'실행할 시간이 올바르지 않습니다.');
  const next=clone(s);
  for(let i=0;i<count;i++){
    next.turnPhase='EXECUTION_TIMELINE';next.time.tick++;
    // Observation is committed after movement. Later action phases use the
    // previous observation snapshot so new sightings cannot act this same tick.
    updateActiveArmyMovementAndKnowledge(next,movementProgressPermilleByArmyId);
    if(next.time.tick===TICKS_PER_TURN){next.time.tick=0;next.turnNumber++;next.turnPhase='PLANNING';}
    next.currentDate=Number(((next.turnNumber-1)*DAYS_PER_TURN+next.time.tick*TICK_DAYS).toFixed(2));
  }
  return validateState(next);
}
export function advanceTurn(s){return executeTicks(s,TICKS_PER_TURN-s.time.tick);}
export function exportSave(s){validateState(s);return JSON.stringify({format:FORMAT,version:SAVE_VERSION,state:s},null,2);}
export function importSave(text,inputs){
  need(typeof text==='string' && text.length<=2_000_000,'저장 자료가 없거나 너무 큽니다.');let save;try{save=JSON.parse(text);}catch{throw new Error('저장 자료를 읽을 수 없습니다.');}
  need(save?.format===FORMAT && save.version===SAVE_VERSION,'이전 미리보기 또는 다른 버전의 저장입니다. 기존 저장은 그대로 보관됩니다.');validateState(save.state);
  if(inputs)need(save.state.contentFingerprint===contentFingerprint(inputs.map,inputs.initialData,inputs.movementData),'초기 배치 또는 이동 기준이 바뀌어 이 저장을 불러올 수 없습니다.');return clone(save.state);
}
