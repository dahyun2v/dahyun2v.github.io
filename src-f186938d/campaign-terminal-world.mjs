import {validateState} from './first3.mjs';
import {legacyGovernorValidationView} from './campaign-economy.mjs';
import {createCampaignTerminalState,validateCampaignTerminalState} from './campaign-terminal-state.mjs';

const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.hasOwn(value,key);
function invariant(condition,message){if(!condition)throw new Error(message);}
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(object(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const orderedValues=collection=>Object.keys(collection).sort().map(recordId=>collection[recordId]);

function resolvePlayerFactionId(world,factionId){
  if(world.playerFactionId===null){
    invariant(typeof factionId==='string'&&own(world.factions,factionId),'PLAYER_FACTION_REQUIRED_FOR_UNSELECTED_FIRST3_WORLD');
    return factionId;
  }
  invariant(factionId===undefined||factionId===world.playerFactionId,'CAMPAIGN_TERMINAL_PLAYER_FACTION_MISMATCH');
  return world.playerFactionId;
}

function campaignId(world){
  return `${world.scenarioId}.${world.contentFingerprint}.S${world.campaignSeed}`;
}

function globalTick(world){
  return (world.turnNumber-1)*world.time.ticksPerTurn+world.time.tick;
}

/**
 * Build the exact createCampaignTerminalState input for a current, pre-terminal
 * FIRST3 world. This bridge does not infer any terminal event or adjudication.
 */
export function projectCampaignTerminalWorld(world,{factionId}={}){
  validateState(world.economy?legacyGovernorValidationView(world):world);
  invariant(world.gameResult===null,'CAMPAIGN_TERMINAL_WORLD_REQUIRES_PRETERMINAL_WORLD');

  const playerFactionId=resolvePlayerFactionId(world,factionId);
  const factions=orderedValues(world.factions).map(faction=>{
    invariant(faction.alive===true,'CAMPAIGN_TERMINAL_WORLD_REQUIRES_ACTIVE_FACTIONS');
    return {factionId:faction.factionId,alive:true,rulerId:faction.rulerId,rulerVacancy:'NONE'};
  });

  const assignments=new Map();
  const assign=(officerId,assignment)=>{
    invariant(!assignments.has(officerId),`CAMPAIGN_TERMINAL_WORLD_DUPLICATE_ASSIGNMENT:${officerId}`);
    assignments.set(officerId,assignment);
  };
  for(const city of orderedValues(world.cities))if(city.governorId!==null)assign(city.governorId,{kind:'CITY',id:city.cityId});
  for(const army of orderedValues(world.armies))assign(army.commanderId,{kind:'ARMY',id:army.armyId});

  const armies=orderedValues(world.armies).map(army=>({
    armyId:army.armyId,
    factionId:army.factionId,
    commanderId:army.commanderId,
    disposition:'ACTIVE',
  }));
  const officers=orderedValues(world.officers).map(officer=>{
    invariant(officer.lifeState==='ALIVE'&&officer.captivityState==='FREE'&&officer.captorFactionId===null,'CAMPAIGN_TERMINAL_WORLD_REQUIRES_FREE_LIVING_OFFICERS');
    return {
      officerId:officer.officerId,
      allegianceFactionId:officer.allegianceFactionId,
      lifeState:'ALIVE',
      captivityState:'FREE',
      assignment:clone(assignments.get(officer.officerId)??{kind:'NONE',id:null}),
    };
  });
  const cities=orderedValues(world.cities).map(city=>({
    cityId:city.cityId,...(city.kind?{kind:city.kind}:{}),
    ownerFactionId:city.ownerFactionId,
    governorId:city.governorId,
    occupationState:'NORMAL',
    pendingGovernor:false,
  }));

  return {
    campaignId:campaignId(world),
    globalTick:globalTick(world),
    playerFactionId,
    factions,
    armies,
    officers,
    cities,
    choices:[],
    prisoners:[],
    records:[],
  };
}

export function createCampaignTerminalStateFromWorld(world,options={}){
  return createCampaignTerminalState(projectCampaignTerminalWorld(world,options),{allowUngovernedNormal:!!world.economy});
}

/**
 * Validate a pristine bridge sidecar against its canonical FIRST3 world.
 * Progressed terminal sidecars intentionally fall outside this Gate 1 bridge.
 */
export function validateCampaignTerminalWorldBridge(world,terminalState,options={}){
  validateCampaignTerminalState(terminalState);
  const expected=createCampaignTerminalStateFromWorld(world,options);
  invariant(stable(terminalState)===stable(expected),'CAMPAIGN_TERMINAL_WORLD_BRIDGE_MISMATCH');
  return terminalState;
}
