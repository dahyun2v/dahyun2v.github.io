import {transferSpecialists} from './campaign-economy.mjs';
import {legacyGovernorValidationView} from './campaign-economy.mjs';
import {
  CAMPAIGN_TERMINAL_WORLD_FORMAT,
  CAMPAIGN_TERMINAL_WORLD_VERSION,
  TICKS_PER_TURN,
  isTerminalReserveCityLocation,
  validateState,
} from './first3.mjs';
import {updateKnowledge} from './knowledge.mjs';
import {
  CAMPAIGN_TERMINAL_FORMAT,
  CAMPAIGN_TERMINAL_VERSION,
  validateCampaignTerminalState,
} from './campaign-terminal-state.mjs';

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const sameIds=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&stable([...a].sort())===stable([...b].sort());
const currentGlobalTick=world=>(world.turnNumber-1)*TICKS_PER_TURN+world.time.tick;
const expectedCampaignId=world=>`${world.scenarioId}.${world.contentFingerprint}.S${world.campaignSeed}`;
const orderedMap=(order,byId)=>Object.fromEntries(order.map(id=>[id,clone(byId[id])]));

function validateIdentityAndSource(world,terminalState){
  invariant(terminalState.campaignId===expectedCampaignId(world),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_CAMPAIGN_MISMATCH');
  invariant(world.playerFactionId!==null&&terminalState.playerFactionId===world.playerFactionId,'CAMPAIGN_TERMINAL_WORLD_APPLICATION_PLAYER_MISMATCH');
  invariant(sameIds(terminalState.factionOrder,Object.keys(world.factions)),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_FACTION_SET_MISMATCH');
  invariant(sameIds(terminalState.cityOrder,Object.keys(world.cities)),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_CITY_SET_MISMATCH');
  invariant(sameIds(terminalState.armyOrder,Object.keys(world.armies)),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_ARMY_SET_MISMATCH');
  invariant(sameIds(terminalState.officerOrder,Object.keys(world.officers)),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_OFFICER_SET_MISMATCH');
  for(const armyId of terminalState.armyOrder){
    const source=terminalState.armiesById[armyId],target=world.armies[armyId];
    invariant(source.factionId===target.factionId&&source.commanderId===target.commanderId,`CAMPAIGN_TERMINAL_WORLD_APPLICATION_ARMY_IDENTITY_MISMATCH:${armyId}`);
  }
  for(const officerId of terminalState.officerOrder){
    invariant(terminalState.officersById[officerId].allegianceFactionId===world.officers[officerId].allegianceFactionId,`CAMPAIGN_TERMINAL_WORLD_APPLICATION_OFFICER_IDENTITY_MISMATCH:${officerId}`);
  }
  invariant(terminalState.recordOrder.length>0,'CAMPAIGN_TERMINAL_WORLD_APPLICATION_REQUIRES_TERMINAL_EVENT');
  invariant(terminalState.globalTick<=currentGlobalTick(world),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_FUTURE_STATE');
}

function projectExtension(terminalState){
  return {
    format:CAMPAIGN_TERMINAL_WORLD_FORMAT,
    version:CAMPAIGN_TERMINAL_WORLD_VERSION,
    campaignId:terminalState.campaignId,
    sourceTerminalFormat:CAMPAIGN_TERMINAL_FORMAT,
    sourceTerminalVersion:CAMPAIGN_TERMINAL_VERSION,
    sourceGlobalTick:terminalState.globalTick,
    sourceRecordIds:[...terminalState.recordOrder],
    sourceChoiceIds:[...terminalState.choiceOrder],
    sourcePrisonerRecordIds:[...terminalState.prisonerOrder],
    factionsById:orderedMap(terminalState.factionOrder,terminalState.factionsById),
    citiesById:orderedMap(terminalState.cityOrder,terminalState.citiesById),
    armiesById:orderedMap(terminalState.armyOrder,terminalState.armiesById),
    officersById:orderedMap(terminalState.officerOrder,terminalState.officersById),
    gameResult:clone(terminalState.gameResult),
  };
}

function requireMonotonicApplication(world,terminalState,extension){
  const previous=world.campaignTerminalWorld;
  if(!previous){
    invariant(terminalState.globalTick===currentGlobalTick(world),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_NOT_AT_EVENT_TICK');
    return;
  }
  invariant(previous.campaignId===extension.campaignId,'CAMPAIGN_TERMINAL_WORLD_APPLICATION_CAMPAIGN_REPLACEMENT');
  invariant(previous.sourceGlobalTick<=extension.sourceGlobalTick,'CAMPAIGN_TERMINAL_WORLD_APPLICATION_TICK_REGRESSION');
  for(const [key,label] of [['sourceRecordIds','RECORD'],['sourceChoiceIds','CHOICE'],['sourcePrisonerRecordIds','PRISONER']]){
    let cursor=-1;
    invariant(previous[key].every(id=>{const index=extension[key].indexOf(id);if(index<=cursor)return false;cursor=index;return true;}),`CAMPAIGN_TERMINAL_WORLD_APPLICATION_${label}_REWRITE`);
  }
  const changed=stable(previous)!==stable(extension);
  if(changed){
    invariant(previous.gameResult===null,'CAMPAIGN_TERMINAL_WORLD_APPLICATION_AFTER_GAME_RESULT');
    invariant(terminalState.globalTick===currentGlobalTick(world),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_NOT_AT_EVENT_TICK');
  }
}

/**
 * Return the exact versioned terminal extension without mutating either input.
 * A pristine bridge sidecar is rejected: the extension starts at the first
 * externally confirmed terminal event, never by inferring one from old saves.
 */
export function projectCampaignTerminalStateToWorldExtension(world,terminalState,options={}){
  validateState(options.allowUngovernedNormal?legacyGovernorValidationView(world):world,options);validateCampaignTerminalState(terminalState,options);
  validateIdentityAndSource(world,terminalState);
  const extension=projectExtension(terminalState);
  requireMonotonicApplication(world,terminalState,extension);
  return extension;
}

/**
 * Atomically mirror an already validated terminal sidecar into the canonical
 * FIRST3 world. Tombstone army objects remain for History references, while
 * their live orders, occupancy and assignments are removed.
 */
export function applyCampaignTerminalStateToWorld(world,terminalState,options={}){
  const extension=projectCampaignTerminalStateToWorldExtension(world,terminalState,options);
  const next=clone(world);

  for(const factionId of terminalState.factionOrder){
    const source=terminalState.factionsById[factionId],target=next.factions[factionId];
    // A promoted ruler cannot keep the live strategist/candidate role. Mirror
    // this office change with succession, before runtime validates the world.
    // Keep the council's reports, proposals and resolution history intact.
    if(factionId===next.playerFactionId&&source.rulerId!==null&&source.rulerId!==target.rulerId&&next.council){
      if(next.council.strategistId===source.rulerId)next.council.strategistId=null;
      next.council.candidates=next.council.candidates.filter(id=>id!==source.rulerId);
    }
    target.alive=source.alive;target.rulerId=source.rulerId;
  }
  for(const cityId of terminalState.cityOrder){
    const source=terminalState.citiesById[cityId],target=next.cities[cityId];
    transferSpecialists(next,target,source.ownerFactionId);
    target.ownerFactionId=source.ownerFactionId;target.governorId=source.governorId;target.occupationState=source.occupationState;
    if(source.kind==='minor'&&source.ownerFactionId===null){delete next.occupations?.[cityId];target.currentProduction=null;target.gateControl=Object.fromEntries(target.footprint.gates.map(id=>[id,null]));}
  }
  for(const factionId of terminalState.factionOrder){
    const faction=next.factions[factionId];
    faction.ownedCityIds=terminalState.cityOrder.filter(cityId=>terminalState.citiesById[cityId].ownerFactionId===factionId);
    if(faction.alive&&faction.ownedCityIds.length>0&&!faction.ownedCityIds.includes(faction.capitalCityId))faction.capitalCityId=[...faction.ownedCityIds].sort((a,b)=>a.localeCompare(b,'en'))[0];
  }
  for(const officerId of terminalState.officerOrder){
    const source=terminalState.officersById[officerId],target=next.officers[officerId];
    target.lifeState=source.lifeState;target.captivityState=source.captivityState;target.captorFactionId=source.captorFactionId;
    if(!isTerminalReserveCityLocation(next,target,source.assignment))target.locationRef=clone(source.assignment);
  }
  const inactiveArmyIds=new Set();
  for(const armyId of terminalState.armyOrder){
    if(terminalState.armiesById[armyId].disposition==='ACTIVE')continue;
    inactiveArmyIds.add(armyId);
    next.armies[armyId].currentOrder=null;next.armies[armyId].movementState=null;next.armies[armyId].engagedArmyIds=[];
  }
  for(const army of Object.values(next.armies))if(!inactiveArmyIds.has(army.armyId))army.engagedArmyIds=army.engagedArmyIds.filter(armyId=>!inactiveArmyIds.has(armyId));
  if(next.ui?.selectedArmyId!==null&&inactiveArmyIds.has(next.ui.selectedArmyId))next.ui.selectedArmyId=null;

  // An observed contact disappears from the live board, but its pre-existing
  // last-seen record is preserved byte-for-byte. We never add a disposition,
  // captor or death result to another faction's Knowledge projection.
  for(const knowledge of Object.values(next.knowledge))for(const armyId of inactiveArmyIds)delete knowledge.observedArmies[armyId];

  next.gameResult=clone(terminalState.gameResult);
  next.campaignTerminalWorld=extension;
  updateKnowledge(next);
  validateState(options.allowUngovernedNormal?legacyGovernorValidationView(next):next,options);
  return next;
}

export function validateCampaignTerminalWorldApplication(world,terminalState,options={}){
  validateState(options.allowUngovernedNormal?legacyGovernorValidationView(world):world,options);validateCampaignTerminalState(terminalState,options);
  validateIdentityAndSource(world,terminalState);
  invariant(own(world,'campaignTerminalWorld'),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_MISSING');
  invariant(stable(world.campaignTerminalWorld)===stable(projectExtension(terminalState)),'CAMPAIGN_TERMINAL_WORLD_APPLICATION_SOURCE_MISMATCH');
  return world;
}

/** Synchronize only lawful roster/office changes; terminal facts stay immutable. */
export function synchronizeCampaignTerminalWorldRoster(world){
  if(!world.campaignTerminalWorld)return world;
  const next=clone(world),previous=world.campaignTerminalWorld,extension=next.campaignTerminalWorld;
  invariant(previous.gameResult===null,'CAMPAIGN_TERMINAL_ROSTER_AFTER_GAME_RESULT');
  for(const factionId of Object.keys(previous.factionsById)){
    const old=previous.factionsById[factionId],actual=world.factions[factionId];
    invariant(actual&&actual.alive===old.alive&&actual.rulerId===old.rulerId,`CAMPAIGN_TERMINAL_ROSTER_FACTION_REWRITE:${factionId}`);
  }
  for(const cityId of Object.keys(previous.citiesById)){
    const old=previous.citiesById[cityId],actual=world.cities[cityId];
    invariant(actual&&actual.ownerFactionId===old.ownerFactionId&&actual.occupationState===old.occupationState,`CAMPAIGN_TERMINAL_ROSTER_CITY_REWRITE:${cityId}`);
    invariant(old.occupationState==='NORMAL'||actual.governorId===old.governorId,`CAMPAIGN_TERMINAL_ROSTER_OCCUPATION_REWRITE:${cityId}`);
    extension.citiesById[cityId].governorId=actual.governorId;
  }
  for(const armyId of Object.keys(previous.armiesById)){
    const old=previous.armiesById[armyId],actual=world.armies[armyId];
    invariant(actual&&actual.factionId===old.factionId&&(old.disposition==='ACTIVE'||actual.commanderId===old.commanderId),`CAMPAIGN_TERMINAL_ROSTER_ARMY_REWRITE:${armyId}`);
    extension.armiesById[armyId].commanderId=actual.commanderId;
  }
  for(const [armyId,army] of Object.entries(world.armies))if(!previous.armiesById[armyId]){
    invariant(world.factions[army.factionId]?.alive,`CAMPAIGN_TERMINAL_ROSTER_INACTIVE_NEW_ARMY:${armyId}`);
    extension.armiesById[armyId]={armyId,factionId:army.factionId,commanderId:army.commanderId,disposition:'ACTIVE',terminalAtTick:null,terminalRecordId:null};
  }
  for(const officerId of Object.keys(previous.officersById))invariant(world.officers[officerId],`CAMPAIGN_TERMINAL_ROSTER_OFFICER_REMOVED:${officerId}`);
  for(const [officerId,officer] of Object.entries(world.officers)){
    const old=previous.officersById[officerId];
    if(old)invariant(['allegianceFactionId','lifeState','captivityState','captorFactionId'].every(key=>old[key]===officer[key]),`CAMPAIGN_TERMINAL_ROSTER_FATE_REWRITE:${officerId}`);
    else invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.captorFactionId===null&&world.factions[officer.allegianceFactionId]?.alive,`CAMPAIGN_TERMINAL_ROSTER_NEW_OFFICER_UNAVAILABLE:${officerId}`);
    const city=Object.values(world.cities).find(city=>city.governorId===officerId),army=Object.values(world.armies).find(army=>army.commanderId===officerId&&extension.armiesById[army.armyId].disposition==='ACTIVE');
    invariant(!city||!army,`CAMPAIGN_TERMINAL_ROSTER_DUPLICATE_ASSIGNMENT:${officerId}`);
    const assignment=city?{kind:'CITY',id:city.cityId}:army?{kind:'ARMY',id:army.armyId}:{kind:'NONE',id:null};
    extension.officersById[officerId]={officerId,allegianceFactionId:officer.allegianceFactionId,lifeState:officer.lifeState,captivityState:officer.captivityState,captorFactionId:officer.captorFactionId,assignment};
  }
  if(stable(extension)!==stable(previous))extension.sourceGlobalTick=currentGlobalTick(world);
  return validateState(next);
}

export function syncCampaignAdministrativeTerminal(world) {
  const t=world.terminal;if(!t)return world;
  t.globalTick=world.globalTick;
  t.recordOrder=Object.keys(t.recordsById).sort((a,b)=>t.recordsById[a].globalTick-t.recordsById[b].globalTick||a.localeCompare(b));
  validateCampaignTerminalState(t,{allowCitylessAlive:true,allowSupersededOccupation:true,allowUngovernedNormal:true});
  world.campaignTerminalWorld=projectExtension(t);
  return world;
}
