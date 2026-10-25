import rules from '../data/stratagems-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {getFactionView} from './knowledge.mjs';
import {diplomacyHostile,exposeStratagem} from './campaign-diplomacy.mjs';
import {supplyLink,armyFoodPerTurn} from './campaign-supply.mjs';
export const STRATAGEMS=rules;
let services;
export function configureStratagems(options){services=options;}
export const rumorActive=(s,c)=>!!c?.stratagemRumor&&s.turn<=c.stratagemRumor.until;
export const stratagemLabel=(s,x)=>rumorActive(s,x)?`유언비어 ${Math.max(0,x.stratagemRumor.until-s.turn)}차례`:x?.stratagemDiscord&&s.turn<x.stratagemDiscord.until?`이간 동요 ${x.stratagemDiscord.until-s.turn}차례`:'';
const intelligence=o=>o?.baseStats?.intelligence??0;
export function stratagemOfficerReason(s,id,f=s.playerFactionId){
 const o=s.officers[id],c=s.cities[o?.locationRef?.id];
 if(!o||o.allegianceFactionId!==f||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||o.travelState!=='STATIONARY'||o.locationRef?.kind!=='CITY'||c?.ownerFactionId!==f)return 'STRATAGEM_OFFICER';
 if(Object.values(s.armies).some(a=>a.commanderId===id&&a.troopCount>0&&(!s.terminal||s.terminal.armiesById[a.armyId]?.disposition==='ACTIVE')))return 'STRATAGEM_COMMANDING';
 if(o.mainActionTurn===s.turn||Object.values(s.armies).some(a=>a.commanderId===id&&a.mainActionTurn===s.turn&&(a.mainActionCount??0)>0))return 'STRATAGEM_ACTION_USED';
 if((o.stratagemReadyTurn??0)>s.turn)return 'STRATAGEM_COOLDOWN';
 return null;
}
export function stratagemPreview(s,cmd,f=s.playerFactionId){
 const kind=rules.kinds.find(k=>k.id===cmd.kind),o=s.officers[cmd.officerId],c=s.cities[o?.locationRef?.id];
 const target=kind?.target==='CITY'?s.cities[cmd.targetCityId]:s.armies[cmd.targetArmyId];
 let blockedReason=stratagemOfficerReason(s,cmd.officerId,f);
 if(!kind||!target||kind.target==='CITY'&&cmd.targetArmyId||kind.target==='ARMY'&&cmd.targetCityId)blockedReason??='STRATAGEM_TARGET';
 const tf=target?.ownerFactionId??target?.factionId;
 if(target&&(!tf||!diplomacyHostile(s,f,tf)||target.armyId&&target.troopCount<=0))blockedReason??='STRATAGEM_TARGET';
 const k=s.knowledge[f];
 if(target&&(k?.tiles[target.tileId]!=='VISIBLE'||target.armyId&&!k?.observedArmies[target.armyId]))blockedReason??='STRATAGEM_NOT_VISIBLE';
 if(c&&target&&hexDistance(s.tiles[c.tileId],s.tiles[target.tileId])>rules.range)blockedReason??='STRATAGEM_RANGE';
 if(blockedReason)return {chance:0,effectText:kind?.text??'',exposedRisk:0,blockedReason};
 const defender=kind?.target==='CITY'?target?.governorId:target?.commanderId;
 const delta=intelligence(o)-intelligence(s.officers[defender]);
 const chance=Math.max(rules.chance.min,Math.min(rules.chance.max,rules.chance.base+delta*rules.chance.perIntelligence));
 return {chance,effectText:kind?.text??'',exposedRisk:delta<=-rules.exposed.margin?100-chance:0,blockedReason};
}
function roll(s,cmd){let h=(s.campaignSeed??0)>>>0;for(const ch of `${s.turn}|${cmd.officerId}|${cmd.kind}|${cmd.targetCityId??cmd.targetArmyId}`)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,2246822507)>>>0;h^=h>>>13;return (h>>>0)%100;}
export function resolveStratagem(s,cmd,f=s.playerFactionId){
 const p=stratagemPreview(s,cmd,f);if(p.blockedReason)throw new Error(p.blockedReason);
 const o=s.officers[cmd.officerId],kind=rules.kinds.find(k=>k.id===cmd.kind),target=kind.target==='CITY'?s.cities[cmd.targetCityId]:s.armies[cmd.targetArmyId];
 o.mainActionTurn=s.turn;o.stratagemReadyTurn=s.turn+rules.cooldown+1;
 const success=roll(s,cmd)<p.chance,exposed=!success&&p.exposedRisk>0;
 if(success){
  if(kind.id==='RUMOR')target.stratagemRumor={until:s.turn+kind.effect.turns};
  if(kind.id==='SOW_DISCORD'&&target.morale==='STEADY'){target.morale=kind.effect.morale;target.stratagemDiscord={until:s.turn+kind.effect.turns};}
  if(kind.id==='DISRUPT_SUPPLY')target.supplyFood=Math.max(0,(target.supplyFood??0)+kind.effect.carriedFood*armyFoodPerTurn(target,s));
 }
 if(exposed)exposeStratagem(s,f,target.ownerFactionId??target.factionId);
 const text=`${o.name} · ${kind.name} → ${target.name??s.officers[target.commanderId]?.name??target.armyId}: ${success?'성공':'실패'}${exposed?' · 들킴':''}`;
 const result={type:'STRATAGEM',turn:s.turn,factionId:f,officerId:o.officerId,kind:kind.id,targetId:target.cityId??target.armyId,success,exposed,...p,text};
 (s.stratagemLog??=[]).push(result);s.lastStratagem=result;(s.administrationLog??=[]).push({turn:s.turn,factionId:f,text});s.history.push({...result,factionIds:exposed?[f,target.ownerFactionId??target.factionId]:[f]});return s;
}
export function settleStratagems(s){for(const c of Object.values(s.cities))if(c.stratagemRumor?.until<=s.turn)delete c.stratagemRumor;for(const a of Object.values(s.armies))if(a.stratagemDiscord?.until<=s.turn)delete a.stratagemDiscord;}
export function stratagemOptions(s,f=s.playerFactionId){
 const k=s.knowledge[f],targets=[...Object.values(s.cities).filter(c=>k?.tiles[c.tileId]==='VISIBLE'),...Object.values(k?.observedArmies??{}).filter(a=>k.tiles[a.tileId]==='VISIBLE')];
 return Object.values(s.officers).filter(o=>o.allegianceFactionId===f&&o.locationRef?.kind==='CITY').sort((a,b)=>intelligence(b)-intelligence(a)||a.officerId.localeCompare(b.officerId)).map(o=>({officerId:o.officerId,cityId:o.locationRef.id,name:o.name,intelligence:intelligence(o),cooldown:Math.max(0,(o.stratagemReadyTurn??0)-s.turn),blockedReason:stratagemOfficerReason(s,o.officerId,f),choices:rules.kinds.flatMap(kind=>targets.filter(t=>kind.target==='CITY'?t.cityId: t.armyId).map(t=>{const cmd={type:'STRATAGEM',officerId:o.officerId,kind:kind.id,...(kind.target==='CITY'?{targetCityId:t.cityId}:{targetArmyId:t.armyId})};return {cmd,tileId:t.tileId,name:kind.name,targetName:t.name??s.officers[t.commanderId]?.name??t.armyId,...stratagemPreview(s,cmd,f)};}).filter(p=>!p.blockedReason))}));
}
// These fields are current public readouts, identical to the runtime view.
export function stratagemPublicView(s,f){const v=getFactionView(s,f);for(const a of Object.values(v.knowledge.observedArmies))if(v.knowledge.tiles[a.tileId]==='VISIBLE')a.morale=s.armies[a.armyId].morale;for(const c of Object.values(v.knowledge.cities))if(v.knowledge.tiles[c.tileId]==='VISIBLE'){c.kind=s.cities[c.cityId].kind;c.stratagemRumor=rumorActive(s,s.cities[c.cityId]);}return v;}
export function aiStratagem(s,f){
 if(s.stratagemLog?.some(e=>e.turn===s.turn&&e.factionId===f))return;
 const v=stratagemPublicView(s,f),publicWorld=services?.supplyWorld?.(s,f),ownCities=Object.values(v.ownCities),choices=stratagemOptions(s,f).flatMap(o=>o.choices.map(p=>({...p,intelligence:o.intelligence})));
 const score=p=>{const city=v.knowledge.cities[p.cmd.targetCityId],a=v.knowledge.observedArmies[p.cmd.targetArmyId];let value=0;
 if(city&&!city.stratagemRumor)value=city.kind==='major'?3:1;
 if(a&&p.cmd.kind==='SOW_DISCORD'&&a.morale==='STEADY'&&ownCities.some(c=>hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=rules.range))value=2;
 if(a&&p.cmd.kind==='DISRUPT_SUPPLY'&&a.supplyFood!==0&&publicWorld&&supplyLink(publicWorld,a).state!=='SAFE')value=1;
 return p.chance*value;};
 choices.sort((a,b)=>score(b)-score(a)||b.intelligence-a.intelligence||JSON.stringify(a.cmd).localeCompare(JSON.stringify(b.cmd)));if(choices[0]&&score(choices[0])>0)resolveStratagem(s,choices[0].cmd,f);
}

export function validateStratagems(s){
 for(const o of Object.values(s.officers))if(o.stratagemReadyTurn!==undefined&&(!Number.isSafeInteger(o.stratagemReadyTurn)||o.stratagemReadyTurn<1))throw new Error('INVALID_STRATAGEM_COOLDOWN');
 for(const x of [...Object.values(s.cities),...Object.values(s.armies)])for(const key of ['stratagemRumor','stratagemDiscord'])if(x[key]&&(!Number.isSafeInteger(x[key].until)||x[key].until<s.turn))throw new Error('INVALID_STRATAGEM_DURATION');
}
