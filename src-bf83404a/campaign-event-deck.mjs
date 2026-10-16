import data from '../data/events-deck-v1.json' with {type:'json'};
import tuning from '../data/events-deck-tuning-v0.1.json' with {type:'json'};
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {campaignReachable,changeMorale} from './campaign-morale.mjs';
import {changeFormation} from './campaign-abilities.mjs';
import {gainRelation,relation} from './campaign-relations.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {adoptWanderer,cityPopulationCapacity,freeCityOfficers} from './campaign-roster.mjs';
import {domesticReserve,domesticSecurity,domesticFoodAvailable,domesticSpendFood} from './campaign-rule-registry.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
import {officerEventTile,eventPairTogether,eventTruce,eventTruceActive,signCampaignOath,campaignOathsView} from './campaign-oaths.mjs';

// Content/effects stay in the immutable v1 source. Trial overrides are limited
// to selection weight, turn window and guards; never spread arbitrary content.
export const EVENT_DECK=Object.freeze(data.events.map(card=>{
 const t=tuning.cards[card.id];if(!t)return card;
 return {...card,weight:t.weight??card.weight,trigger:{...card.trigger,turns:t.turns??card.trigger.turns,guards:t.guards??card.trigger.guards}};
}));
const cardById=new Map(EVENT_DECK.map(c=>[c.id,c]));
const captureContextTurns=Math.max(0,...EVENT_DECK.flatMap(c=>c.trigger.guards.filter(g=>g.test==='just_captured_by_player').map(g=>g.withinTurns??0)));
export const eventDeckCard=id=>cardById.get(id);
export function initializeEventDeck(s,recentEventIds=[]){if(['v2','v3'].includes(s.mapId))s.eventDeck={version:1,recentEventIds:[...new Set(recentEventIds.filter(id=>cardById.has(id)))],seen:[],twists:[],tags:[],oaths:[],captures:[],lastResult:null};}
const ownedCities=(s,fid)=>Object.values(s.cities).filter(c=>c.ownerFactionId===fid).sort((a,b)=>a.cityId.localeCompare(b.cityId));
const ownArmies=(s,fid)=>Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const free=o=>o&&o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&o.conditionState!=='INJURED';
const armyOf=(s,id)=>Object.values(s.armies).find(a=>a.commanderId===id&&castleArmyActive(s,a));
const atCity=(s,id,c)=>!!c&&officerEventTile(s,id)===c.tileId;
const nearCity=(s,id,c,withinTiles=0)=>{const tile=officerEventTile(s,id);return !!c&&!!s.tiles[tile]&&hexDistance(s.tiles[tile],s.tiles[c.tileId])<=withinTiles;};
const officerCityRange=(card,key)=>Math.max(0,...card.trigger.guards.filter(g=>g.test==='officer_at_city'&&g.officer===key).map(g=>g.withinTiles??0));
const cityName=(s,c)=>s.cityDisplayNames?.[c.cityId]??c.name;
export function eventText(text,names){return String(text??'').replace(/\{([^}]+)\}([이가을를과와])?/g,(_,key,particle)=>{const name=names[key]??key;if(!particle)return name;const code=name.codePointAt(name.length-1),batchim=code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0;return name+({이:batchim?'이':'가',가:batchim?'이':'가',을:batchim?'을':'를',를:batchim?'을':'를',과:batchim?'과':'와',와:batchim?'과':'와'})[particle];});}

// The live movement query is repeated on a copy, one turn at a time. This respects
// terrain, impassable edges and truces; geometric distance alone is not reachability.
export function eventReachCost(s,id,destinations,withinTurns=4){
 const original=s.armies[id];if(!original||!castleArmyActive(s,original))return null;
 const targets=new Set(destinations.filter(t=>s.tiles[t]));if(targets.has(original.tileId))return 0;
 const q=structuredClone(s),a=q.armies[id],visited=new Set([a.tileId]);let frontier=[a.tileId];
 for(let turn=1;turn<=withinTurns;turn++){const next=[];for(const tile of frontier){a.tileId=tile;for(const [to] of campaignReachable(q,id,200)){if(targets.has(to))return turn;if(!visited.has(to)){visited.add(to);next.push(to);}}}frontier=next;if(!frontier.length)break;}
 return null;
}
const cityApproach=c=>[...(c.footprint?.gates??[]),...(c.footprint?.walls??[]),c.tileId];
export function resolveEventRoles(s,card,fid,context={}){
 const roles={},names={},cs=ownedCities(s,fid),as=ownArmies(s,fid),resolveOfficer=id=>s.officers[id]??s.wanderers?.[id];
 const ordered=[],visited=new Set();
 const visit=key=>{if(visited.has(key))return;visited.add(key);const r=card.roles[key];if(!r)return;const dependencies=[r.city,r.officer,r.from,...(r.among??[]),...(['officer_current_city','lord_current_city'].includes(r.pick)?[r.pick==='lord_current_city'?'lord':'officer']:[])];for(const dep of dependencies.filter(Boolean))visit(dep);ordered.push([key,r]);};
 for(const key of Object.keys(card.roles))visit(key);
 for(const [key,r] of ordered){
  let id=null;
  if(r.officerId){const o=resolveOfficer(r.officerId);if(free(o)&&!o.injury&&(r.owner==='WANDERER'?s.wanderers?.[r.officerId]&&!o.allegianceFactionId:o.allegianceFactionId===fid))id=r.officerId;}
  else if(r.factionId){if(s.factions[r.factionId]?.alive&&(!r.mustHaveActiveTruceWith||eventTruceActive(s,fid,r.factionId)))id=r.factionId;}
  else switch(r.pick){
   case 'player_lord':if(free(s.officers[s.factions[fid].rulerId]))id=s.factions[fid].rulerId;break;
   case 'capital':id=cs.find(c=>c.cityId===s.factions[fid].capitalCityId)?.cityId;break;
   case 'lowest_food_city':id=[...cs].sort((a,b)=>a.foodStock-b.foodStock||a.cityId.localeCompare(b.cityId))[0]?.cityId;break;
   case 'context_city':id=cs.find(c=>c.cityId===context.cityId)?.cityId;break;
   case 'officer_current_city':case 'lord_current_city':{const key=r.pick==='lord_current_city'?'lord':'officer',who=roles[key];id=cs.filter(c=>nearCity(s,who,c,officerCityRange(card,key))).sort((a,b)=>hexDistance(s.tiles[officerEventTile(s,who)],s.tiles[a.tileId])-hexDistance(s.tiles[officerEventTile(s,who)],s.tiles[b.tileId])||a.cityId.localeCompare(b.cityId))[0]?.cityId;break;}
   case 'nearest_owned_city':{const origin=s.armies[context.armyId]?.tileId??officerEventTile(s,roles.officer??roles.lord);id=origin?[...cs].sort((a,b)=>hexDistance(s.tiles[a.tileId],s.tiles[origin])-hexDistance(s.tiles[b.tileId],s.tiles[origin])||a.cityId.localeCompare(b.cityId))[0]?.cityId:null;break;}
   case 'army_commanded_by':id=as.find(a=>a.commanderId===roles[r.officer])?.armyId;break;
   case 'owned_officer_at_city':id=Object.values(s.officers).filter(o=>o.allegianceFactionId===fid&&free(o)&&atCity(s,o.officerId,s.cities[roles[r.city]])).sort((a,b)=>a.officerId.localeCompare(b.officerId))[0]?.officerId;break;
   case 'resolved_city_tile':id=s.cities[roles[r.city]]?.tileId;break;
   case 'existing_truce_faction':id=Object.keys(s.factions).sort().find(f=>f!==fid&&eventTruceActive(s,fid,f)&&((eventTruce(s,fid,f).until??Infinity)-s.turn+1>=r.minRemainingTurns));break;
   case 'player_commander_in_context_battle':id=as.filter(a=>[context.battle?.attackerId,context.battle?.targetId,...(context.battle?.units??[]).map(u=>u.unitId)].includes(a.armyId)).map(a=>a.commanderId).sort()[0];break;
   case 'recent_engaged_player_army':{const battles=[context.battle,...[...(s.combatLog??[])].reverse().filter(b=>s.turn-b.turn<=3)].filter(Boolean);id=battles.flatMap(b=>as.filter(a=>[b.attackerId,b.targetId,...(b.units??[]).map(u=>u.unitId)].includes(a.armyId)))[0]?.armyId;break;}
   case 'smallest_player_army':case 'largest_player_army':id=[...as].sort((a,b)=>(r.pick==='largest_player_army'?-1:1)*(a.troopCount-b.troopCount)||a.armyId.localeCompare(b.armyId))[0]?.armyId;break;
   case 'higher_command_army':id=r.among.map(k=>s.armies[roles[k]]).filter(Boolean).sort((a,b)=>s.officers[b.commanderId].baseStats.leadership-s.officers[a.commanderId].baseStats.leadership||a.armyId.localeCompare(b.armyId))[0]?.armyId;break;
   case 'highest_martial_owned_officer':id=freeCityOfficers(s,s.cities[roles.city]).sort((a,b)=>b.baseStats.might-a.baseStats.might||a.officerId.localeCompare(b.officerId))[0]?.officerId;break;
   case 'nearest_reachable_enemy_city':{const army=roles[r.from];id=Object.values(s.cities).filter(c=>c.ownerFactionId&&c.ownerFactionId!==fid&&s.knowledge?.[fid]?.cities?.[c.cityId]&&!['TRUCE','ALLIANCE'].includes(eventTruce(s,fid,c.ownerFactionId)?.state)).map(c=>({c,cost:eventReachCost(s,army,cityApproach(c))})).filter(v=>v.cost!==null).sort((a,b)=>a.cost-b.cost||a.c.cityId.localeCompare(b.c.cityId))[0]?.c.cityId;break;}
   default:return null;
  }
  if(!id&&r.required)return null;
  if(id&&r.allowedNames&&!r.allowedNames.includes(cityName(s,s.cities[id])))return null;
  roles[key]=id??null;names[key]=r.pick==='resolved_city_tile'?names[r.city]:s.cities[id]?cityName(s,s.cities[id]):resolveOfficer(id)?.name??(s.armies[id]?`${s.officers[s.armies[id].commanderId]?.name} 부대`:s.factions[id]?.name??id);
  // Reject cheap, already-bound guards before searching paths for later roles.
  for(const g of card.trigger.guards){
   if(g.test==='officer_at_city'&&roles[g.officer]&&roles[g.city]&&!nearCity(s,roles[g.officer],s.cities[roles[g.city]],g.withinTiles))return null;
   if(g.test==='pair_adjacent'&&g.officers.every(k=>roles[k])&&!eventPairInRange(s,g,roles))return null;
  }
 }
 return {roles,names};
}
const eventPairInRange=(s,g,roles)=>{if(!g.withinTiles)return eventPairTogether(s,g.officers.map(k=>roles[k]));const tiles=g.officers.map(k=>s.tiles[officerEventTile(s,roles[k])]);return tiles.every(Boolean)&&tiles.every(a=>tiles.every(b=>hexDistance(a,b)<=g.withinTiles));};

export function eventGuard(s,guard,p,card,context={}){
 const r=p.roles,fid=p.factionId,c=s.cities[r[guard.city]],a=s.armies[r[guard.army]],value=guard.value;
 switch(guard.test){
  case 'all_required_roles_resolve':return Object.entries(card.roles).every(([k,v])=>!v.required||!!r[k]);
  case 'pair_adjacent':return eventPairInRange(s,guard,r);
  case 'officer_at_city':return nearCity(s,r[guard.officer],c,guard.withinTiles);
  case 'food_below':return c?.foodStock<value;
  case 'food_at_least':return c&&domesticFoodAvailable(s,c)>=value;
  case 'prestige_at_least':return s.factions[fid].prestige-(s.captiveRecruitment?.factions[fid]?.reservedPrestige??0)>=value;
  case 'reserves_at_least':return c?.reserveTroops>=value;
  case 'occupation_at_least':return s.occupations[c?.cityId]?.turnsLeft>=value;
  case 'tag_present':return s.eventDeck.tags.includes(guard.tag);
  case 'besieged':return !!c?.besieged;
  case 'just_captured_by_player':return context.cityId===c?.cityId&&s.c22.captures[c.cityId]?.factionId===fid&&s.turn-s.c22.captures[c.cityId].turn<=(guard.withinTurns??0);
  case 'battle_participant':return !!a&&[context.battle?.attackerId,context.battle?.targetId,...(context.battle?.units??[]).map(u=>u.unitId)].includes(a.armyId);
  case 'player_survived_context_battle':return ownArmies(s,fid).some(a=>[context.battle?.attackerId,context.battle?.targetId,...(context.battle?.units??[]).map(u=>u.unitId)].includes(a.armyId));
  case 'active_truce_covers':return eventTruceActive(s,fid,r[guard.faction])&&((eventTruce(s,fid,r[guard.faction]).until??Infinity)>=s.turn+guard.turns);
  case 'enemy_city_reachable':return !!c&&eventReachCost(s,r[guard.byArmy],cityApproach(c),guard.withinTurns)!==null;
  case 'enemy_army_reachable':return !!a&&Object.values(s.armies).some(b=>b.factionId!==fid&&castleArmyActive(s,b)&&s.knowledge?.[fid]?.tiles?.[b.tileId]==='VISIBLE'&&s.knowledge?.[fid]?.observedArmies?.[b.armyId]&&!['TRUCE','ALLIANCE'].includes(eventTruce(s,fid,b.factionId)?.state)&&eventReachCost(s,a.armyId,Object.values(s.tiles).filter(t=>hexDistance(t,s.tiles[b.tileId])===1).map(t=>t.tileId),guard.withinTurns)!==null);
  case 'wanderer_available':return free(s.wanderers?.[r[guard.officer]])&&!s.wanderers[r[guard.officer]].allegianceFactionId;
  case 'recruit_eligible':return !!c&&!!s.wanderers?.[r[guard.officer]]&&s.wanderers[r[guard.officer]].locationRef.id===c.cityId&&!Object.values(s.captiveRecruitment?.proposals??{}).some(v=>v.targetOfficerId===r[guard.officer]&&v.status==='NEGOTIATING');
  case 'active_production':return c?.currentProduction?.kind==='tuntian';
  case 'lord_army_outside_city':return !!a&&!Object.values(s.cities).some(c=>c.tileId===a.tileId);
  case 'different_resolved_ids':return new Set(guard.roles.map(k=>r[k])).size===guard.roles.length;
  case 'all_choice_immediate_costs_affordable':return card.origin==='legacy'||card.choices.every(ch=>!deckChoiceReason(s,p,ch));
  default:return false;
 }
}
export function deckCandidate(s,card,fid,context){
 if(!s.eventDeck||fid!==s.playerFactionId||!s.factions[fid]?.alive||![fid,'ANY','WANDERER'].includes(card.scope)||s.turn<card.trigger.turns[0]||s.turn>card.trigger.turns[1]||context.when!==card.trigger.when)return null;
 if(card.choices.some(c=>c.oath&&s.turn+c.oath.deadline>26))return null;
 if((card.links?.requiresTwist??[]).some(id=>!s.eventDeck.twists.some(t=>t.eventId===id)||!s.eventDeck.tags.includes(cardById.get(id)?.links?.setsTag)))return null;
 const bound=resolveEventRoles(s,card,fid,context);if(!bound)return null;
 const p={eventId:card.id,factionId:fid,turn:s.turn,...bound};return card.trigger.guards.every(g=>eventGuard(s,g,p,card,context))?p:null;
}
export const effectiveEventWeight=(s,c)=>c.weight*(s.eventDeck.recentEventIds.includes(c.id)?0.5:1);
export function chooseWeightedEvent(s,candidates,fid){
 if(!candidates.length)return null;let h=2166136261;for(const ch of `${s.campaignSeed}:${s.turn}:${fid}`)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
 const rows=[...candidates].sort((a,b)=>a.eventId.localeCompare(b.eventId));let roll=h/4294967296*rows.reduce((n,p)=>n+effectiveEventWeight(s,cardById.get(p.eventId)),0);for(const p of rows){roll-=effectiveEventWeight(s,cardById.get(p.eventId));if(roll<0)return p;}return rows.at(-1);
}
export function startEventDeck(s,fid,legacyCandidate,{turnStart=true}={}){
 const x=s.eventDeck;if(!x||fid!==s.playerFactionId||s.c22.pending[fid]||s.gameResult)return;
 if(x.seen.length>=4||x.seen.length&&s.turn-x.seen.at(-1).turn<4)return;
 const contexts=[...(turnStart?[{when:'TURN_START'}]:[]),{when:'OFFICER_PAIR'},{when:'FOOD_LOW'},{when:'PLACE'},...Object.values(s.cities).filter(c=>c.ownerFactionId===fid&&c.besieged).map(c=>({when:'CITY_BESIEGED',cityId:c.cityId})),...Object.entries(s.c22.captures).filter(([,v])=>v.factionId===fid&&s.turn-v.turn<=captureContextTurns).map(([id])=>({when:'CITY_CAPTURED',cityId:id})),...(s.combatLog??[]).filter(b=>b.turn===s.turn).map(b=>({when:'AFTER_BATTLE',battle:b,armyId:b.attackerId}))];
 const candidates=[];for(const c of EVENT_DECK){if(c.oncePerRun&&x.seen.some(e=>e.eventId===c.id))continue;for(const context of contexts){const p=deckCandidate(s,c,fid,context);if(!p)continue;if(c.origin==='legacy')Object.assign(p,legacyCandidate(s,p));candidates.push(p);break;}}
 const p=chooseWeightedEvent(s,candidates,fid);if(p){s.c22.pending[fid]=p;x.seen.push({eventId:p.eventId,turn:s.turn});}
}

export function deckChoiceReason(s,p,ch){
 for(const e of ch.effects){const [key,v]=Object.entries(e)[0],c=s.cities[p.roles[v.city]];if(key==='food'&&v.delta<0&&(!c||domesticFoodAvailable(s,c)<-v.delta))return `식량 ${-v.delta} 필요`;if(key==='prestige'&&v<0&&s.factions[p.factionId].prestige-(s.captiveRecruitment?.factions[p.factionId]?.reservedPrestige??0)<-v)return `인망 ${-v} 필요`;if(key==='recruit'&&(!s.wanderers?.[v.officerId]||c?.ownerFactionId!==p.factionId))return '합류할 재야 장수 없음';}
 return null;
}
const signed=n=>n>0?`+${n}`:n<0?`−${-n}`:'0';
function applyDeckEffectsUnchecked(s,effects,p,source='PREVIEW'){
 const lines=[],changes=[],missing=[];const r=p.roles,fid=p.factionId;
 for(const [i,e] of effects.entries()){
  const [key,v]=Object.entries(e)[0],c=s.cities[r[v.city]],a=s.armies[r[v.army]],oid=r[v.officer],o=s.officers[oid];let before,after,label;
  const change=(name,before,after,scale=1)=>{changes.push({effect:key,target:key==='prestige'?fid:c?.cityId??a?.armyId??oid??null,before,after,delta:after-before});lines.push(`${name} ${signed((after-before)*scale)}`);};
  if(['food','reserves','population','security','durability','progress','occupation','governor'].includes(key)&&(!c||c.ownerFactionId!==fid)||['morale','formation','buff','brace'].includes(key)&&(!a||a.factionId!==fid||!castleArmyActive(s,a))||['xp','gauge'].includes(key)&&(!free(o)||o.allegianceFactionId!==fid)){missing.push(key);lines.push(`${key}: 고정 대상 사용 불가`);continue;}
  switch(key){
   case 'food':before=c.foodStock;if(v.delta<0)domesticSpendFood(s,c,Math.min(domesticFoodAvailable(s,c),-v.delta));else c.foodStock=Math.min(c.foodCapacity,c.foodStock+v.delta);change(`${p.names[v.city]} 식량`,before,c.foodStock);break;
   case 'prestige':before=s.factions[fid].prestige;s.factions[fid].prestige=Math.max(s.captiveRecruitment?.factions[fid]?.reservedPrestige??0,before+v);change('인망',before,s.factions[fid].prestige);break;
   case 'reserves':before=c.reserveTroops;domesticReserve(s,c,Math.max(-before,v.delta));change(`${p.names[v.city]} 예비병`,before,c.reserveTroops,10);break;
   case 'population':before=c.population;c.population=Math.max(0,Math.min(cityPopulationCapacity(s,c),before+v.delta));change(`${p.names[v.city]} 인구`,before,c.population);break;
   case 'security':before=c.securityLevel;domesticSecurity(s,c,-v.step,'EVENT');change(`${p.names[v.city]} 치안 회복 단계`,-before,-c.securityLevel);break;
   case 'durability':before=c.durability;c.durability=Math.max(0,Math.min(c.durabilityMax,before+v.delta));change(`${p.names[v.city]} 내구`,before,c.durability);break;
   case 'morale':{const stages=['STEADY','SHAKEN','ROUTING'];before=stages.indexOf(a.morale);changeMorale(s,a.armyId,stages[Math.max(0,Math.min(2,before-v.step))],'사건');change(`${p.names[v.army]} 사기 회복 단계`,-before,-stages.indexOf(a.morale));break;}
   case 'formation':{const stages=['ORDERED','DISORDERED','BROKEN'];before=stages.indexOf(a.formation);changeFormation(s,a.armyId,-v.step);change(`${p.names[v.army]} 전열 회복 단계`,-before,-stages.indexOf(a.formation));break;}
   case 'relation':{const aa=r[v.a],bb=r[v.b];if(!free(s.officers[aa])||!free(s.officers[bb])){missing.push(key);lines.push('관계: 고정 대상 사용 불가');break;}before=relation(s,aa,bb).value;gainRelation(s,aa,bb,v.delta);change(`${p.names[v.a]}·${p.names[v.b]} 관계`,before,relation(s,aa,bb).value);break;}
   case 'xp':before=s.campaignGrowth.officers[oid].totalXp;creditCampaignGrowth(s,{officerId:oid,eventId:`C197.${source}.${i}`,kind:'DEJA_VU',amount:v.delta,fixed:true});change(`${p.names[v.officer]} 경험치`,before,s.campaignGrowth.officers[oid].totalXp);break;
   case 'buff':for(const [k,op] of [['attackPct','DAMAGE_MOD'],['defensePct','DEFENSE_MOD']])if(v[k]!==undefined){a.effectStates.push({op,value:v[k],startsTurn:s.turn,expiresTurn:s.turn+v.turns-1,source:'C197'});lines.push(`${p.names[v.army]} ${k==='attackPct'?'공격':'방어'} ${signed(v[k])}% (${v.turns}차례)`);changes.push({effect:key,target:a.armyId,op,value:v[k],expiresTurn:s.turn+v.turns-1});}break;
   case 'recruit':{const wanderer=s.wanderers?.[v.officerId];if(!free(wanderer)||wanderer.allegianceFactionId||!c||c.ownerFactionId!==fid||wanderer.locationRef.id!==c.cityId){missing.push(key);lines.push('합류: 고정 대상 사용 불가');break;}const name=wanderer.name;adoptWanderer(s,{targetOfficerId:v.officerId,factionId:fid,candidateSourceRef:c.cityId,proposalId:`C197.${source}`});lines.push(`${name} 합류`);changes.push({effect:key,target:v.officerId,before:null,after:fid});break;}
   case 'gauge':{const state=s.campaignGrowth.officers[oid]?.c29;if(!state){missing.push(key);lines.push('전법 게이지: 고정 대상 사용 불가');break;}before=state.gauge;state.gauge=Math.max(0,Math.min(100,before+v.delta));change(`${p.names[v.officer]} 전법 게이지`,before,state.gauge);break;}
   case 'progress':before=c.productionProgress;c.productionProgress+=v.delta;if(c.currentProduction?.kind)c.jobProgress[c.currentProduction.kind]=c.productionProgress;change(`${p.names[v.city]} 생산 진행`,before,c.productionProgress);break;
   case 'occupation':before=s.occupations[c.cityId]?.turnsLeft??0;if(before)s.occupations[c.cityId].turnsLeft=Math.max(1,before+v.delta);change(`${p.names[v.city]} 점령 남은 차례`,before,s.occupations[c.cityId]?.turnsLeft??0);break;
   case 'governor':if(!freeCityOfficers(s,c).some(o=>o.officerId===oid)){missing.push(key);lines.push('태수: 고정 대상 사용 불가');break;}{const old=c.governorId;c.governorId=oid;o.locationRef={kind:'CITY',id:c.cityId};if(s.terminal){s.terminal.citiesById[c.cityId].governorId=oid;if(old&&old!==oid)s.terminal.officersById[old].assignment={kind:'NONE',id:null};s.terminal.officersById[oid].assignment={kind:'CITY',id:c.cityId};}}lines.push(`${p.names[v.city]} 태수 → ${p.names[v.officer]}`);changes.push({effect:key,target:c.cityId,after:oid});break;
   case 'brace':a.braced=true;lines.push(`${p.names[v.army]} 방어 태세`);changes.push({effect:key,target:a.armyId,after:true});break;
   default:throw new Error(`C197_UNKNOWN_EFFECT:${key}`);
  }
 }
 if(s.terminal)syncCampaignAdministrativeTerminal(s);
 return {text:lines.join(' · ')||'효과 없음',changes,missing};
}
const effectPlan=(s,effects,p,source)=>{const plan=applyDeckEffectsUnchecked(structuredClone(s),effects,p,source);return plan.missing.length?{text:`정산 보류 — 고정 대상 사용 불가 (${plan.missing.join(' · ')})`,changes:[],missing:plan.missing}:plan;};
export function applyDeckEffects(s,effects,p,source='PREVIEW'){const plan=effectPlan(s,effects,p,source);return plan.missing.length?plan:applyDeckEffectsUnchecked(s,effects,p,source);}
export function previewDeckEffects(s,effects,p){return effectPlan(s,effects,p,'PREVIEW');}
export function deckDefinition(s,p){
 const card=cardById.get(p.eventId);if(!card||card.origin==='legacy')return null;
 return {eventId:card.id,factionId:p.factionId,title:card.title,scale:'EVENT',text:eventText(card.text,p.names),cityName:p.names.city,officerNames:[...new Set(Object.keys(card.roles).filter(k=>s.officers[p.roles[k]]||s.wanderers?.[p.roles[k]]).map(k=>p.names[k]))],choices:card.choices.map(ch=>{const hypothetical=structuredClone(s),immediate=applyDeckEffects(hypothetical,ch.effects,p,'PREVIEW.IMMEDIATE');return {...ch,preview:ch.oath?`즉시: ${immediate.text} | 맹세: ${eventText(ch.oath.goalText,p.names)} (${p.turn+ch.oath.deadline}차례 말까지) | 성공: ${previewDeckEffects(hypothetical,ch.oath.reward,p).text} | 실패: ${previewDeckEffects(hypothetical,ch.oath.penalty,p).text}`:immediate.text,actualPreview:immediate,contentPreview:eventText(ch.preview,p.names),blockedReason:deckChoiceReason(s,p,ch)};})};
}
export function chooseDeckEvent(s,p,choiceId){
 const card=cardById.get(p.eventId),ch=card?.choices.find(c=>c.id===choiceId);if(!ch)throw new Error('INVALID_EVENT_CHOICE');const reason=deckChoiceReason(s,p,ch);if(reason)throw new Error(reason);
 const result=applyDeckEffects(s,ch.effects,p,`${card.id}.${p.turn}.${choiceId}`);signCampaignOath(s,card,ch,p);
 if(ch.oath){s.eventDeck.twists.push({eventId:card.id,title:card.title,turn:s.turn});const tag=ch.setsTag??card.links?.setsTag;if(tag&&!s.eventDeck.tags.includes(tag))s.eventDeck.tags.push(tag);}
 s.eventDeck.lastResult={eventId:card.id,title:card.title,turn:s.turn,choiceId,text:result.text,dejaVu:ch.dejaVu?eventText(ch.dejaVu,p.names):null};
 s.c22.fired.push({eventId:card.id,factionId:p.factionId,turn:s.turn,choiceId});delete s.c22.pending[p.factionId];(s.administrationLog??=[]).push({turn:s.turn,factionId:p.factionId,text:`사건 — ${card.title}: ${ch.label} (${result.text})${ch.dejaVu?` · 기시감: ${eventText(ch.dejaVu,p.names)}`:''}`});return s;
}
export function eventDeckView(s,fid){const x=fid===s.playerFactionId?s.eventDeck:null;return {eventDeckSeen:structuredClone(x?.seen??[]),oaths:campaignOathsView(s,fid),twistHistory:structuredClone(x?.twists??[]),eventResult:structuredClone(x?.lastResult??null)};}
export function validateEventDeck(s){
 const x=s.eventDeck;if(!x)return;const fail=()=>{throw new Error('INVALID_EVENT_DECK');};
 if(x.version!==1||!['recentEventIds','seen','twists','tags','oaths','captures'].every(k=>Array.isArray(x[k]))||x.recentEventIds.some(id=>!cardById.has(id))||x.tags.some(t=>typeof t!=='string')||x.seen.length>4||new Set(x.seen.map(e=>e.eventId)).size!==x.seen.length||x.seen.some((e,i)=>!cardById.has(e.eventId)||!Number.isSafeInteger(e.turn)||e.turn<1||e.turn>s.turn||i>0&&e.turn-x.seen[i-1].turn<4))fail();
 const oathIds=new Set();for(const o of x.oaths){if(oathIds.has(o.id)||!cardById.has(o.eventId)||o.factionId!==s.playerFactionId||!['ACTIVE','SUCCESS','FAILED'].includes(o.status)||!Number.isSafeInteger(o.deadline)||o.deadline>26||o.deadline<=o.signedTurn||!o.roles||!o.names||!['CAPTURE_CITY','HOLD_CITY','DEFEAT_ARMY','FOOD_AT_LEAST','PAIR_TOGETHER','TRUCE_KEEP'].includes(o.goal?.type))fail();oathIds.add(o.id);}
 for(const p of Object.values(s.c22?.pending??{})){const card=cardById.get(p.eventId);if(!card||card.origin==='legacy')continue;if(p.factionId!==s.playerFactionId||!p.roles||!p.names||Object.keys(card.roles).some(k=>card.roles[k].required&&(!p.roles[k]||typeof p.names[k]!=='string')))fail();}
}
