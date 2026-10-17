import {diplomacyEnabled,diplomacyState,diplomacyTerritory,withdrawalProtection,diplomacyHostile} from './campaign-diplomacy.mjs';
import {c33Owned,c33Formation} from './campaign-rule-registry.mjs';
import {c31Sync} from './campaign-events.mjs';
import {C24,specialTroop,parentTroop} from './campaign-special-troops.mjs';
import {movementEffect,hasCampaignRule} from './campaign-effects.mjs';
import {neighbors, tileId, hexDistance} from './map-primitives.mjs';
import {moveOneTick} from './movement.mjs';

/** Same ring order and road priority as the display renderer, without a UI import. */
export function castleFootprint(centerId, {roads = [], exists = () => true} = {}) {
  const [q, r] = centerId.split(',').map(Number);
  const ring = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
    .map(([dq,dr]) => ({q:q+dq,r:r+dr})).filter(t => exists(tileId(t)));
  const roadSet = new Set(roads.flatMap(([a,b]) => [`${a}|${b}`,`${b}|${a}`]));
  const gates = ring.filter(t => roadSet.has(`${centerId}|${tileId(t)}`)).slice(0,3);
  for (const t of ring) {
    if (gates.length === 3) break;
    if (!gates.includes(t) && gates.every(g => hexDistance(g,t) >= 2)) gates.push(t);
  }
  for (const t of ring) {
    if (gates.length === 3) break;
    if (!gates.includes(t)) gates.push(t);
  }
  return {center:centerId,gates:gates.map(tileId),walls:ring.filter(t => !gates.includes(t)).map(tileId)};
}

export const castleArmyActive = (s,a) => a.troopCount > 0 && a.hp > 0 &&
  (!s.campaignTerminalWorld || s.campaignTerminalWorld.armiesById[a.armyId]?.disposition === 'ACTIVE');

export const CITY_DURABILITY_MAX=100;
export function initializeCampaignCastles(s) {
  const roads = s.mapRules.roads.map(e => e.split('|'));
  for (const c of Object.values(s.cities)) {
    c.durability ??= c.kind==='minor'?60:CITY_DURABILITY_MAX;
    c.durabilityMax ??= c.kind==='minor'?60:CITY_DURABILITY_MAX;
    c.footprint = castleFootprint(c.tileId,{roads,exists:id => !!s.tiles[id]});
    c.gateControl ??= Object.fromEntries(c.footprint.gates.map(id => [id,c.ownerFactionId]));
    c.besieged ??= false;
    c.lostGates ??= [];
  }
  const walls = new Set(Object.values(s.cities).flatMap(c => c.footprint.walls));
  const blocked = new Set(s.mapRules.blockedEdges);
  for (const id of walls) for (const n of neighbors(s.tiles[id])) {
    if (s.tiles[tileId(n)]) blocked.add([id,tileId(n)].sort().join('|'));
  }
  s.mapRules.blockedEdges = [...blocked].sort();
  return refreshCampaignSieges(s);
}

export function refreshCampaignSieges(s) {
  c31Sync(s);
  const armies = Object.values(s.armies).filter(a => castleArmyActive(s,a));
  s.castleKnowledge ??= {};
  for (const c of Object.values(s.cities)) {
    for (const gate of c.footprint.gates) {
      const occupant = armies.find(a => a.tileId === gate);
      if (occupant) c.gateControl[gate] = occupant.factionId;
    }
    c.lostGates = c.footprint.gates.filter(g => armies.some(a => a.tileId === g && diplomacyHostile(s,a.factionId,c.ownerFactionId)&&!withdrawalProtection(s,a.armyId)));
    c.besieged = c.lostGates.length > 0;
    if(c.besieged&&s.occupations?.[c.cityId]?.stage==='STABILIZING')s.occupations[c.cityId].besiegedTurn=s.turn;
    for (const factionId of Object.keys(s.factions)) {
      const knowledge = s.knowledge[factionId];
      const known = s.castleKnowledge[factionId] ??= {};
      if (!knowledge.cities[c.cityId] && c.ownerFactionId !== factionId) continue;
      const record = known[c.cityId] ??= {footprint:structuredClone(c.footprint),gateControl:{}};
      for (const g of c.footprint.gates) if (knowledge.tiles[g] === 'VISIBLE') record.gateControl[g] = c.gateControl[g];
      if (c.ownerFactionId === factionId || knowledge.tiles[c.tileId] === 'VISIBLE') {
        if(s.occupations?.[c.cityId])record.occupation={stage:s.occupations[c.cityId].stage,turnsLeft:s.occupations[c.cityId].turnsLeft};
        record.durability=c.durability;record.durabilityMax=c.durabilityMax;
        record.besieged = c.besieged;
        record.lostGates = [...c.lostGates];
      }
    }
  }
  return s;
}

export function campaignGatesHeld(c,factionId) {
  return c.footprint.gates.length === 3 && c.footprint.gates.every(g => c.gateControl[g] === factionId);
}

export function campaignCenterEntryAllowed(s,armyId,city) {
  const a = s.armies[armyId];
  return city.ownerFactionId === a.factionId;
}

/** Enemy centers are excluded from movement; defenders remain attack targets. */
export function campaignMovementWorld(s,armyId) {
  const blocked = new Set(s.mapRules.blockedEdges);
  const unit=s.armies[armyId];
  if(diplomacyEnabled(s))for(const f of Object.keys(s.factions))if(f!==unit.factionId&&diplomacyState(s,unit.factionId,f)==='TRUCE'&&!diplomacyTerritory(s,f,unit.tileId))for(const t of Object.values(s.tiles))if(diplomacyTerritory(s,f,t.tileId))for(const n of neighbors(t))if(s.tiles[tileId(n)])blocked.add([t.tileId,tileId(n)].sort().join('|'));
  // Allies are passable. Only the final destination has field occupancy limits.
  for (const c of Object.values(s.cities)) {
    if (campaignCenterEntryAllowed(s,armyId,c)) continue;
    // Enemy centers are reached only by a city attack capture.
    for (const n of neighbors(s.tiles[c.tileId])) if (s.tiles[tileId(n)]) blocked.add([c.tileId,tileId(n)].sort().join('|'));
  }
  const original=s.armies[armyId],parent=parentTroop(original.troopType),a={...original,troopType:parent},special=specialTroop(s,original.troopType),effect=movementEffect(s,armyId);
    const base=s.mapRules.tuning?.byTroop?.[a.troopType]??s.mapRules.tuning?.[a.troopType==='cavalry'?'cavalry':'normal'];
    const plain=base?.plain??(a.troopType==='cavalry'?1.25:a.troopType==='bow'?2.5:2);
    const ratio=(10/plain)/Math.max(.01,10/plain+effect.delta+(special?(special.rules?.moveDelta??(original.troopType==='danyang'?C24.danyangMove:original.troopType==='catapult'?C24.catapultMove:0)):0))/(hasCampaignRule(s,armyId,'FORCED_MARCH')?2:1);
    const rough=!!c33Owned(s,armyId,'ROUGH_MARCH')||!!c33Formation(s,armyId,'FORMATION_SNAKE');
    let tuning=rough||special||effect.delta||hasCampaignRule(s,armyId,'FORCED_MARCH')||hasCampaignRule(s,armyId,'TERRAIN_WALKER')?{...s.mapRules.tuning,byTroop:{...s.mapRules.tuning?.byTroop,[a.troopType]:Object.fromEntries(Object.entries(base??{plain,rough:plain+1,road:plain*.7,crossingExtra:2}).map(([key,value])=>[key,((hasCampaignRule(s,armyId,'TERRAIN_WALKER')||special&&original.troopType==='wudang')&&key==='rough'?plain:rough&&key==='rough'?Math.max(plain,value-1):value)*ratio]))}}:s.mapRules.tuning;
    for(const flood of s.c27?.floods??[])if(flood.until>=s.turn)for(const edge of flood.edges)blocked.add(edge);
    return {...s,...(special?{armies:{...s.armies,[armyId]:a}}:{}),mapRules:{...s.mapRules,tuning,...((hasCampaignRule(s,armyId,'TERRAIN_WALKER')||original.c32?.freeRiverUntil>=s.turn)?{riverEdges:[]}:{}),blockedEdges:[...blocked]}};
}

export function campaignCastleDefense(s,army) {
  return Object.values(s.cities).some(c => c.ownerFactionId === army.factionId &&
    [c.footprint.center,...c.footprint.gates].includes(army.tileId)) ? 1.25 : 1;
}

export function campaignStackAllowed(s,id,to){
 const a=s.armies[id];return !!a&&['v2','v3'].includes(s.mapId)&&Object.values(s.cities).some(c=>[c.tileId,...c.footprint.gates].includes(to));
}
export function campaignDestinationAllowed(s,id,to){
 const a=s.armies[id];if(!a||!s.tiles[to])return false;
 const occupants=Object.values(s.armies).filter(b=>b.armyId!==id&&castleArmyActive(s,b)&&b.tileId===to);
 // Preserve timeline contact with enemies, including undiscovered ones.
 if(occupants.some(b=>b.factionId!==a.factionId))return true;
 return !occupants.length||campaignStackAllowed(s,id,to)&&occupants.every(b=>b.factionId===a.factionId);
}
// Keep the FIRST3 timeline unchanged. Sequential campaign movement may cross
// stationary allies; canonical army objects/history are still updated in place.
export function moveCampaignOneTick(s,id){
 const a=s.armies[id],armies=Object.fromEntries(Object.entries(s.armies).filter(([key,b])=>key===id||b.factionId!==a.factionId));
 moveOneTick({...s,armies});
}

// 32 §8.4: existing local ready troops, never an unnamed field army.
// Trial tuning: 500 ready => wall damage /1.25, counter 10 (cap 20).
export function campaignReserveDefense(s,c){
 const ready=(s.personnel?.lots??[]).filter(l=>l.nodeId===c.cityId&&l.kind!=='WOUNDED'&&
  (s.economy?.lotFaction?.[l.lotId]??s.armies[l.originFormationId]?.factionId??c.ownerFactionId)===c.ownerFactionId).reduce((n,l)=>n+l.count,0);
 const strength=Math.min(1,ready/1000);
 return {ready,wallMultiplier:1/(1+strength*.5),counter:Math.round(strength*20)};
}
export function disperseCapturedReserves(s,cityId,formerOwnerFactionId){
 const c=s.cities[cityId];if(formerOwnerFactionId===null||formerOwnerFactionId===c.ownerFactionId)return 0;
 let dispersed=0;
 for(const l of s.personnel.lots.filter(l=>l.nodeId===cityId&&l.kind!=='WOUNDED'&&l.count>0)){
  const faction=s.economy?.lotFaction?.[l.lotId]??s.armies[l.originFormationId]?.factionId??formerOwnerFactionId;if(faction!==formerOwnerFactionId)continue;
  dispersed+=l.count;l.count=0;
 }
 // Demobilization leaves the military ledger, like C22 reserve withdrawal;
 // these people are dispersed, not invented battle deaths / wounded troops.
 s.personnel.initialPersonnel-=dispersed;
 c.reserveTroops=s.personnel.lots.filter(l=>l.nodeId===cityId&&l.kind!=='WOUNDED').reduce((n,l)=>n+l.count,0);
 return dispersed;
}
