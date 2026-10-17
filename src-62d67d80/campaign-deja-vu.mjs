import data from '../../docs/design-data/officer-pack/deja-vu-v0.1.json' with {type:'json'};
import {campaignMapData} from './campaign-scenario.mjs';
import {hexDistance} from './map-primitives.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';

export const DEJA_VU=data;
export const dejaVuEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c41Disabled!==true;
const entries=new Map(data.entries.map(e=>[e.id,e]));
const alive=o=>o?.lifeState==='ALIVE';
const free=o=>alive(o)&&o.captivityState==='FREE';
const armyFor=(s,id)=>Object.values(s.armies).find(a=>a.commanderId===id&&a.troopCount>0&&a.hp>0&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[a.armyId]?.disposition==='ACTIVE'));
const cityTiles=c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])];
function atCity(s,id,c,{governor=false}={}){
 const o=s.officers[id];if(!free(o))return false;
 if(governor&&c.governorId===id)return true;
 const a=armyFor(s,id);
 return a?cityTiles(c).includes(a.tileId):o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId;
}
export function initializeDejaVu(s){if(['v2','v3'].includes(s.mapId)&&s.dejaVu===undefined)s.dejaVu={fired:[],recent:[]};return s;}
export function validateDejaVu(s){
 if(!['v2','v3'].includes(s.mapId))return s;
 const d=s.dejaVu;
 if(!d||!Array.isArray(d.fired)||!Array.isArray(d.recent)||d.recent.length>20||new Set(d.fired).size!==d.fired.length||d.fired.some(id=>!entries.has(id))||new Set(d.recent.map(e=>e.id)).size!==d.recent.length)throw new Error('INVALID_CAMPAIGN_DEJA_VU');
 for(const r of d.recent)if(!entries.has(r.id)||!d.fired.includes(r.id)||r.officerId!==entries.get(r.id).officerId||!s.officers[r.officerId]||!s.factions[r.factionId]||!Number.isSafeInteger(r.turn)||r.turn<1||r.turn>s.turn)throw new Error('INVALID_CAMPAIGN_DEJA_VU');
 return s;
}
function fire(s,e){
 initializeDejaVu(s);if(s.dejaVu.fired.includes(e.id))return false;
 const o=s.officers[e.officerId],factionId=o.allegianceFactionId;
 s.dejaVu.fired.push(e.id);s.dejaVu.recent.push({id:e.id,officerId:e.officerId,factionId,turn:s.turn});s.dejaVu.recent=s.dejaVu.recent.slice(-20);
 for(const id of e.trigger.kind==='TOGETHER'?e.trigger.officers:[e.officerId])creditCampaignGrowth(s,{eventId:`DEJA_VU.${e.id}.${id}`,officerId:id,kind:'DEJA_VU',amount:data.rules.reward.xp,fixed:true});
 if(factionId===s.playerFactionId){s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId,text:`${o.name} — 기시감: ${e.name}`});}
 return true;
}
// One shared sweep after movement, faction starts and settlement; never from a view.
export function checkDejaVuLocations(s){
 if(!dejaVuEnabled(s))return s;initializeDejaVu(s);
 const map=campaignMapData(s.mapId),cities=Object.values(s.cities);
 for(const e of data.entries){
  if(s.dejaVu.fired.includes(e.id)||!free(s.officers[e.officerId]))continue;
  const t=e.trigger,a=armyFor(s,e.officerId);let match=false;
  switch(t.kind){
   case 'CITY':match=cities.some(c=>t.labels.includes(s.cityDisplayNames?.[c.cityId])&&atCity(s,e.officerId,c));break;
   case 'PLACE':match=!!a&&(map.places??[]).some(p=>(p.label?.includes(t.match)||p.note?.includes(t.match))&&hexDistance(s.tiles[a.tileId],{q:p.at[0],r:p.at[1]})<=t.range);break;
   case 'BRIDGE':match=!!a&&(map.bridges??[]).some(b=>b.split('|').includes(a.tileId));break;
   case 'TOGETHER':match=t.officers.every(id=>free(s.officers[id])&&s.officers[id].allegianceFactionId===s.officers[e.officerId].allegianceFactionId)&&cities.some(c=>t.officers.every(id=>atCity(s,id,c,{governor:true})));break;
   case 'BESIEGED':match=cities.some(c=>c.besieged&&(!t.minor||c.kind==='minor')&&atCity(s,e.officerId,c,{governor:true}));break;
  }
  if(match)fire(s,e);
 }
 return s;
}
export function dejaVuEvent(s,kind,{officerId,by,tileId}={}){
 if(!dejaVuEnabled(s))return s;initializeDejaVu(s);
 const o=s.officers[officerId];if(!(kind==='CAPTURED'?alive(o):free(o)))return s;
 for(const e of data.entries)if(e.officerId===officerId&&e.trigger.kind===kind&&!s.dejaVu.fired.includes(e.id)){
  if(kind==='CAPTURED'&&o.captivityState==='PRISONER'||kind==='ATTACKED_BY'&&e.trigger.by.includes(by)||kind==='ROUT_TERRAIN'&&e.trigger.terrain.includes(s.tiles[tileId]?.terrainType))fire(s,e);
 }
 return s;
}
export function dejaVuView(s,factionId=s.playerFactionId){
 return {recent:(s.dejaVu?.recent??[]).filter(r=>r.factionId===factionId&&s.officers[r.officerId]?.allegianceFactionId===factionId&&r.turn>=s.turn-1&&r.turn<=s.turn).map(r=>{const e=entries.get(r.id);return {id:r.id,officerId:r.officerId,officerName:s.officers[r.officerId].name,name:e.name,scene:e.scene,line:e.line,turn:r.turn,xp:data.rules.reward.xp};})};
}
export function dejaVuMetrics(s){
 const fired=s.dejaVu?.fired??[],recent=s.dejaVu?.recent??[];
 return {total:fired.length,byKind:Object.fromEntries(Object.keys(data.triggers).map(kind=>[kind,fired.filter(id=>entries.get(id).trigger.kind===kind).length])),byFaction:Object.fromEntries(Object.keys(s.factions).map(fid=>[fid,recent.filter(r=>r.factionId===fid).length]))};
}
