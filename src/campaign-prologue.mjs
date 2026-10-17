import {createCampaign,step as engineStep} from './campaign-runtime.mjs';
import {updateCampaignKnowledge} from './campaign-vision.mjs';

export const PROLOGUE_DONE_KEY='sangoku.prologue.done.v1';
export const isPrologue=s=>s?.prologue?.version===1;
export function shouldOfferPrologue(storage,hasSave=false){
 try{if(typeof storage==='function')storage=storage();const legacy=JSON.parse(storage?.getItem('sangoku.legacy.v1')??'null');return !hasSave&&!storage?.getItem(PROLOGUE_DONE_KEY)&&!legacy?.unlocks?.length&&!legacy?.legacy?.runsFinished;}catch{return false;}
}
export function finishPrologue(storage){try{if(typeof storage==='function')storage=storage();storage?.setItem(PROLOGUE_DONE_KEY,'1');}catch{}}
// Scenario setup only. Rules, damage and action budgets remain the campaign engine's.
function quiet(s){
 delete s.eventDeck;delete s.ambitions;delete s.runModifiers;s.c41Disabled=true;
 s.c22.pending={};s.c22.startedTurns[s.playerFactionId]=s.turn;
 s.relationScenes.active=null;
 for(const r of Object.values(s.campaignGrowth.officers))for(const d of Object.values(r.track.draftsById))if(d.state==='OFFERED'){d.state='REPLACED';d.skipped=true;d.held=false;d.resolutionReason='PROLOGUE';}
 return s;
}
export function createPrologue(){
 const s=createCampaign({factionId:'F01',seed:225,fieldArmies:false,manualEndTurn:true,c31:false,council:false,c42:false,c43:false,c45:false,c46:false,trialRules:{runModifiers:false}});
 for(const a of Object.values(s.armies)){a.troopCount=0;a.hp=0;s.personnel.formations.find(f=>f.formationId===a.armyId).field=0;}
 s.cities.west.governorId='G07';
 for(const id of ['G07','G33'])s.officers[id].locationRef={kind:'CITY',id:'west'};
 for(const o of Object.values(s.officers))if(o.allegianceFactionId==='F01'&&!['G07','G33'].includes(o.officerId)){o.allegianceFactionId='F02';o.locationRef={kind:'CITY',id:'east'};}
 for(const a of Object.values(s.armies))a.factionId=s.officers[a.commanderId].allegianceFactionId;
 for(const f of Object.values(s.factions)){f.armyIds=Object.values(s.armies).filter(a=>a.factionId===f.factionId).map(a=>a.armyId);f.officerIds=Object.values(s.officers).filter(o=>o.allegianceFactionId===f.factionId).map(o=>o.officerId);}
 // The two tutorial officers can choose infantry using the normal sortie selector.
 for(const id of ['G07','G33']){s.officers[id].aptitude={militia:'B'};s.officers[id].troopType='militia';s.officers[id].allowedTroops=['militia'];for(const a of Object.values(s.armies))if(a.commanderId===id)a.troopType='militia';}
 const c=s.cities.julu;c.durability=1;c.reserveTroops=0;
 s.cityDisplayNames.julu='기억의 작은 성';s.cityDisplayNames.west='허창';
 const defender=s.armies['U-F02-G02'];
 defender.tileId='-8,25';defender.troopCount=100;defender.hp=100;defender.facing=0;
 s.officers[defender.commanderId].locationRef={kind:'ARMY',id:defender.armyId};
 const formation=s.personnel.formations.find(f=>f.formationId===defender.armyId);formation.field=100;s.personnel.initialPersonnel+=100;

 const ext=s.campaignTerminalWorld;
 ext.citiesById.west.governorId='G07';
 for(const a of Object.values(s.armies))ext.armiesById[a.armyId].factionId=a.factionId;
 Object.assign(ext.armiesById[defender.armyId],{disposition:'ACTIVE',terminalAtTick:null,terminalRecordId:null});
 for(const o of Object.values(s.officers)){
  const e=ext.officersById[o.officerId];e.allegianceFactionId=o.allegianceFactionId;
  const city=Object.values(s.cities).find(c=>c.governorId===o.officerId);
  e.assignment=city?{kind:'CITY',id:city.cityId}:o.officerId===defender.commanderId?{kind:'ARMY',id:defender.armyId}:{kind:'NONE',id:null};
 }
 for(const key of ['armiesById','officersById','citiesById'])s.terminal[key]=structuredClone(ext[key]);
 s.prologue={version:1,aiPaused:true,stage:'SORTIE',targetCityId:'julu',defenderId:defender.armyId,moveTileId:'-10,26',sortieId:null,flankSeen:false,previewSeen:false};
 quiet(s);updateCampaignKnowledge(s);return s;
}
export function observePrologue(s,{preview=false,flank=false}={}){
 if(!isPrologue(s))return s;
 const n=structuredClone(s);if(n.prologue.stage==='COMBAT'){n.prologue.previewSeen||=preview;n.prologue.flankSeen||=flank;}return n;
}
export function stepPrologue(state,command){
 if(!isPrologue(state))return engineStep(state,command);
 if(['REWIND_TURN','CHOOSE_BLESSING','CHOOSE_AMBITION','CHOOSE_ORDER','EVENT_CHOICE','DRAFT_PICK','DRAFT_REROLL'].includes(command?.type))return state;
 const before=structuredClone(state),p=before.prologue;
 quiet(before);
 if(command.type==='ADVANCE_AI')before.aiQueue=[];
 const next=engineStep(before,{...command,incremental:true});quiet(next);
 if(next.phase==='AI')next.aiQueue=[];
 const q=next.prologue;
 // C225b: only committed combat advances the lesson. Hover is optional UI state.
 const flank=(next.combatLog??[]).find(c=>c.sequence>state.battleSequence&&c.targetId===p.defenderId&&c.side==='FLANK'&&next.armies[c.attackerId]?.factionId===next.playerFactionId);
 if(p.stage==='SORTIE'&&command.type==='SORTIE'&&command.officerId==='G33'&&command.troopType==='militia'){
  q.sortieId=next.officers.G33.locationRef.id;q.stage='MOVE';
 }else if(p.stage==='MOVE'&&state.armies[p.sortieId]?.tileId!==next.armies[p.sortieId]?.tileId&&next.armies[p.sortieId]?.tileId===p.moveTileId)q.stage='END_FIRST';
 else if(p.stage==='END_FIRST'&&command.type==='END_TURN')q.stage='COMBAT';
 else if(p.stage==='COMBAT'&&flank){q.flankSeen=true;q.stage='END_SECOND';}
 else if(p.stage==='END_SECOND'&&command.type==='END_TURN')q.stage='CITY';
 else if(p.stage==='CITY'&&state.cities[p.targetCityId].ownerFactionId!==state.playerFactionId&&next.cities[p.targetCityId].ownerFactionId===state.playerFactionId)q.stage='DONE';
 return next;
}
