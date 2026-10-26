import {DOMESTIC_V3 as V3,domesticV3Enabled,initializeDomesticV3,syncPeople,autoFillV3Seats,configureDomesticV3TerminalSync} from './domestic-v3.mjs';
import {rivalEvent} from './campaign-relations.mjs';
import {syncResearchCities} from './campaign-roster.mjs';
import {c33Owned,c33Formation} from './campaign-rule-registry.mjs';
import {c29Aw} from './campaign-c29.mjs';
import {uniqueOwned,domesticPlunderReason,domesticOccupation,domesticGovernor,domesticRule,domesticOccupationGovernor,domesticFoodAvailable,domesticSpendFood,finishDomesticGovernor,domesticSecurity} from './campaign-rule-registry.mjs';
import {specialistOccupationTurns} from './campaign-economy.mjs';
import {effectModifiers} from './campaign-effects.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
configureDomesticV3TerminalSync(syncCampaignAdministrativeTerminal);

export const OCCUPATION_METHODS = {conciliation:'회유', military:'군정', plunder:'수탈'};
export function initializeCampaignOccupation(s) {
  s.administrationLog ??= [];
  s.occupations ??= {};
  for (const c of Object.values(s.cities)) {
    if(!s.occupations[c.cityId]&&c.occupationState==='TEMPORARY_OCCUPATION')s.occupations[c.cityId]={state:'OCCUPIED',productionEnabled:false,recruitmentEnabled:false,replenishmentEnabled:false};
    const o=s.occupations[c.cityId];
    if (!o || o.stage) continue;
    Object.assign(o,{stage:{OCCUPIED:'CAPTURED',PACIFICATION:'OCCUPATION',STABILIZING:'STABILIZING',NORMAL:'NORMAL'}[o.state]??'CAPTURED',
      turnsLeft:o.state==='NORMAL'?0:o.state==='STABILIZING'?1:o.state==='PACIFICATION'?2:1,method:o.state==='PACIFICATION'?'military':null,lastSettledTurn:s.turn});
  }
  if(domesticV3Enabled(s)){initializeDomesticV3(s);for(const c of Object.values(s.cities))if(s.occupations[c.cityId]?.stage==='CAPTURED')startV3Occupation(s,c);}
  return s;
}
export function occupationDisplay(s,c) {
  const o=s.occupations?.[c.cityId];
  return {stage:o?.stage??(c.occupationState==='TEMPORARY_OCCUPATION'?'CAPTURED':'NORMAL'),turnsLeft:o?.turnsLeft??(c.occupationState==='TEMPORARY_OCCUPATION'?1:0)};
}
export function occupationGarrison(s,c) {
  return Object.values(s.armies).find(a=>castleArmyActive(s,a)&&a.factionId===c.ownerFactionId&&
    [c.tileId,...c.footprint.gates].includes(a.tileId)&&a.troopCount>0&&
    a.troopCount>=(s.personnel.formations.find(f=>f.formationId===a.armyId)?.targetStrength??Infinity)*(c33Formation(s,a.armyId,'FORMATION_CRANE')?.4:.5));
}
export function occupationMethodReason(s,c,method) {
  const o=s.occupations?.[c.cityId];
  if(domesticV3Enabled(s))return !o||o.selectedTurn!==s.turn||o.v3Processed?'점령 처리 시작 전 같은 차례에만 변경 가능':!['pacify','conciliation','military','plunder'].includes(method)?'알 수 없는 방식':null;
  if (!o || !['CAPTURED','OCCUPATION'].includes(o.stage)) return '점령 처리 단계가 아닙니다.';
  if(method==='plunder'){const blocked=domesticPlunderReason(s,c);if(blocked)return blocked;}
  if(method==='plunder'&&o.fromNeutral)return '중립 성은 회유 또는 군정만 가능합니다.';
  if (!OCCUPATION_METHODS[method]) return '알 수 없는 방식';
  if (method==='conciliation'&&domesticFoodAvailable(s,c)<c.population*2) return '주민 1턴 유지식량 부족';
  if (method!=='conciliation'&&!occupationGarrison(s,c)) return '현역 50% 이상 부대를 성 중심·성문에 주둔시키세요.';
  if(method==='plunder'&&s.factions[c.ownerFactionId].prestige-(s.captiveRecruitment?.factions[c.ownerFactionId]?.reservedPrestige??0)<20)return '인망 20 필요';
  if (method==='plunder'&&o.plundered) return '이미 수탈한 도시입니다.';
  if (o.method===method) return '현재 진행 중인 방식입니다.';
  return null;
}
export function administrationLine(s,text,factionId=s.playerFactionId) {
  s.administrationLog??=[];s.administrationLog.push({turn:s.turn,text,factionId});
  s.administrationLog=s.administrationLog.slice(-60);
}
export function selectOccupationMethod(s,{cityId,method},ai=false) {
  initializeCampaignOccupation(s);
  const c=s.cities[cityId];
  if (!c||(!ai&&c.ownerFactionId!==s.playerFactionId)) throw new Error('INVALID_OCCUPATION_CITY');
  if(domesticV3Enabled(s))return overrideOccupation(s,cityId,method);
  const reason=occupationMethodReason(s,c,method);if(reason)throw new Error(reason);
  const o=s.occupations[cityId];
  if(method==='conciliation')domesticSpendFood(s,c,c.population*2);
  if(method==='plunder') {
    const former=s.terminal?.recordsById[s.terminal.citiesById[cityId]?.occupationRecordId]?.details.formerOwnerFactionId,home=s.factions[former],occupier=s.factions[c.ownerFactionId];
    if(former&&former!==c.ownerFactionId&&home?.alive&&s.officers[home.rulerId]?.lifeState==='ALIVE'&&s.officers[occupier.rulerId]?.lifeState==='ALIVE')rivalEvent(s,'atrocity',occupier.rulerId,home.rulerId);
    const lootRate=uniqueOwned(s,occupationGarrison(s,c)?.armyId??c.governorId,'U_PLUNDERER')?0.45:0.3;
    const food=Math.floor((c.foodStock-c.reservedResources.food)*lootRate);c.foodStock-=food;
    const destination=Object.values(s.cities).filter(x=>x.cityId!==cityId&&x.ownerFactionId===c.ownerFactionId)
      .sort((a,b)=>a.cityId.localeCompare(b.cityId))[0];
    if(destination){destination.foodStock+=food;destination.foodCapacity=Math.max(destination.foodCapacity,destination.foodStock);}
    else {s.factions[c.ownerFactionId].occupationLoot=(s.factions[c.ownerFactionId].occupationLoot??0)+food;}
    for(const [key,value] of Object.entries(c.specialResources)) {
      const taken=Math.floor(Math.max(0,value-(c.reservedResources[key]??0))*lootRate);c.specialResources[key]-=taken;
      if(destination)destination.specialResources[key]=(destination.specialResources[key]??0)+taken;
      else {s.factions[c.ownerFactionId].occupationSpecialLoot??={};s.factions[c.ownerFactionId].occupationSpecialLoot[key]=(s.factions[c.ownerFactionId].occupationSpecialLoot[key]??0)+taken;}
    }
    s.factions[c.ownerFactionId].prestige=Math.max(0,s.factions[c.ownerFactionId].prestige-20);
    const facility=c.facilities.find(f=>!f.damaged);if(facility)facility.damaged=true;
    domesticSecurity(s,c,1,'PLUNDER');c.plunderTurn=s.turn;o.plundered=true;
  }
  Object.assign(o,{stage:'OCCUPATION',state:'PACIFICATION',method:method==='plunder'?'military':method,
    turnsLeft:Math.max(1,(method==='conciliation'?1:2)-effectModifiers(s,cityId,['ON_CAPTURE_CITY','TURN_SETTLE'],{cityId,sources:[{id:occupationGarrison(s,c)?.armyId??c.governorId,whens:['ON_CAPTURE_CITY','TURN_SETTLE']}]}).OCCUPATION_SPEED),selectedTurn:s.turn,lastSettledTurn:s.turn,...(s.mapId!=='v1'?{careerMethod:method}:{})});
  o.turnsLeft=Math.max(1,specialistOccupationTurns(s,c,o.turnsLeft)-(c29Aw(s,c.governorId??occupationGarrison(s,c)?.commanderId,'AW_TT-V04')?1:0));
  domesticOccupation(s,c,method);
  if(o.stage==='OCCUPATION'&&o.turnsLeft<=0){o.stage='STABILIZING';o.state='STABILIZING';o.turnsLeft=1;}
  administrationLine(s,`${s.cityDisplayNames?.[cityId]??c.name}: ${OCCUPATION_METHODS[method]} 선택 · ${o.turnsLeft}턴`,c.ownerFactionId);
  return s;
}
export function selectAiOccupations(s,{autoPlayer=false}={}) {
  initializeCampaignOccupation(s);
  for(const c of Object.values(s.cities)) {
    const o=s.occupations[c.cityId];
    if(o?.stage!=='CAPTURED'||(!autoPlayer&&c.ownerFactionId===s.playerFactionId))continue;
    const method=c.foodStock-c.reservedResources.food>=c.population*4?'conciliation':'military';
    if(!occupationMethodReason(s,c,method))selectOccupationMethod(s,{cityId:c.cityId,method},true);
  }
  return s;
}
// Called after the existing city-settlement has paid this entire turn's upkeep.
export function settleOccupationCity(s,c,paid,openingSecurity=0) {
  const o=s.occupations?.[c.cityId];
  if(domesticV3Enabled(s))return settleV3Occupation(s,c,o);
  if(s.gameResult||!o?.stage||o.stage==='NORMAL'||o.lastSettledTurn===s.turn)return;
  o.lastSettledTurn=s.turn;
  if(o.stage==='CAPTURED')return;
  if(o.stage==='OCCUPATION') {
    if(o.method==='military'&&!occupationGarrison(s,c)){administrationLine(s,`${s.cityDisplayNames?.[c.cityId]??c.name}: 군정 정지 · 주둔 이탈`,c.ownerFactionId);return;}
    if(--o.turnsLeft<=0){o.stage='STABILIZING';o.state='STABILIZING';o.turnsLeft=1;}
  } else {
    const engaged=s.economy.combatCities?.[c.cityId]===s.turn-1;
    const besieged=c.besieged||o.besiegedTurn===s.turn-1;
    if(!paid||besieged||engaged||c.securityLevel>0||openingSecurity>0){administrationLine(s,`${s.cityDisplayNames?.[c.cityId]??c.name}: 안정화 정지 · ${!paid?'식량 부족':besieged?'포위':engaged?'교전':'치안 불안'}`,c.ownerFactionId);return;}
    o.stage='NORMAL';o.state='NORMAL';o.turnsLeft=0;
    o.productionEnabled=o.recruitmentEnabled=o.replenishmentEnabled=true;
    c.occupationState='NORMAL';
    finishDomesticGovernor(s,c);
    if(s.terminal) {
      const t=s.terminal,tc=t.citiesById[c.cityId];
      tc.occupationState='NORMAL';tc.pendingGovernor=false;tc.occupationRecordId=null;
      for(const choice of Object.values(t.choicesById))if(choice.type==='OCCUPATION'&&choice.cityId===c.cityId&&choice.status==='PENDING') {
        const id=`REC.C6.NORMAL.${s.globalTick}.${c.cityId}`;
        t.recordsById[id]={recordId:id,globalTick:s.globalTick,type:'OCCUPATION_CHOICE',causeRecordIds:[choice.causeRecordId],
          refs:{factionIds:[c.ownerFactionId],armyIds:[],officerIds:[],cityIds:[c.cityId],choiceIds:[choice.choiceId],prisonerRecordIds:[]},details:{method:o.method}};
        Object.assign(choice,{status:'RESOLVED',resolvedAtTick:s.globalTick,resolutionRecordId:id});
      }
      syncCampaignAdministrativeTerminal(s);
    }
  }
  administrationLine(s,`${s.cityDisplayNames?.[c.cityId]??c.name}: ${{OCCUPATION:'점령 처리',STABILIZING:'안정화',NORMAL:'정상화'}[o.stage]} ${o.turnsLeft}턴`,c.ownerFactionId);
}

export function selectCampaignGovernor(s,{cityId,officerId}) {
  const c=s.cities[cityId],o=s.officers[officerId];
  if(!c||c.ownerFactionId!==s.playerFactionId||occupationDisplay(s,c).stage!=='NORMAL'&&!domesticOccupationGovernor(s,officerId)||!o||
    o.allegianceFactionId!==s.playerFactionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||o.travelState!=='STATIONARY'||
    !(o.locationRef.kind==='NONE'||o.locationRef.kind==='CITY'&&o.locationRef.id===cityId))throw new Error('INVALID_CAMPAIGN_GOVERNOR');
  const previous=s.officers[c.governorId];
  if(occupationDisplay(s,c).stage!=='NORMAL'){
    // FIRST3 retains its pending-governor projection until normalization. The
    // campaign stores the appointed governor separately during occupation.
    c.c26??={};c.c26.occupationGovernorId=officerId;o.locationRef={kind:'CITY',id:cityId};
    domesticGovernor(s,c);syncResearchCities(s);
    administrationLine(s,`${o.name}: ${s.cityDisplayNames?.[cityId]??c.name} 점령 처리 태수 임명`);return s;
  }
  if(previous){previous.locationRef=s.mapId!=='v1'?{kind:'CITY',id:cityId}:{kind:'NONE',id:null};if(s.terminal)s.terminal.officersById[previous.officerId].assignment={kind:'NONE',id:null};}
  c.governorId=officerId;o.locationRef={kind:'CITY',id:cityId};
  domesticGovernor(s,c);syncResearchCities(s);
  if(s.terminal){s.terminal.citiesById[cityId].governorId=officerId;s.terminal.officersById[officerId].assignment={kind:'CITY',id:cityId};syncCampaignAdministrativeTerminal(s);}
  administrationLine(s,`${o.name}: ${s.cityDisplayNames?.[cityId]??c.name} 태수 임명`);return s;
}

const v3Method=method=>method==='conciliation'?'pacify':method;
function formerV3Owner(s,c){const tc=s.terminal?.citiesById[c.cityId];return s.terminal?.recordsById[tc?.occupationRecordId]?.details?.formerOwnerFactionId??c.v3CapturedLots?.formerOwnerFactionId??c.specialistCapture?.formerOwnerFactionId??null;}
export function startV3Occupation(s,c){
 const o=s.occupations[c.cityId];if(o.v3Started)return;
 initializeDomesticV3(s);o.formerOwnerFactionId=formerV3Owner(s,c);o.capturePeople=c.people;
 o.v3Started=true;o.selectedTurn=s.turn;o.lastSettledTurn=s.turn;
 applyV3Method(s,c,v3Method(s.factions[c.ownerFactionId].occupationPolicyDefault??'pacify'));
}
function applyV3Method(s,c,method){
 const o=s.occupations[c.cityId],f=s.factions[c.ownerFactionId],rules=V3.occupation;
 if(!rules[method]?.turns)throw new Error('INVALID_OCCUPATION_METHOD');
 const cost=c.people/V3.taxPeople*rules.pacifyFoodPerTaxPeople;
 if(method==='pacify'&&f.granary<cost)method='military';
 const r=rules[method];o.v3Undo={people:c.people,specialists:{...c.domesticSpecialists},security:c.securityLevel,plunderTurn:c.plunderTurn??null,gradePenaltyUntil:c.gradePenaltyUntil??null,damaged:c.facilities.map(x=>!!x.damaged),grain:method==='pacify'?cost:0,prestige:method==='plunder'?Math.min(f.prestige??0,rules.plunderPrestige):0};
 if(method==='pacify')f.granary-=cost;
 c.people=Math.floor(c.people*(1-r.peopleLoss));syncPeople(c);
 for(const key of Object.keys(c.domesticSpecialists))c.domesticSpecialists[key]=Math.floor(c.domesticSpecialists[key]*r.specialistFactor);
 c.securityLevel=r.security;
 if(method==='plunder'){f.prestige=Math.max(0,(f.prestige??0)-rules.plunderPrestige);const facility=c.facilities.find(x=>!x.damaged);if(facility)facility.damaged=true;c.plunderTurn=s.turn;c.gradePenaltyUntil=s.turn+rules.gradePenaltyTurns;}
 Object.assign(o,{stage:'OCCUPATION',state:'PACIFICATION',method,turnsLeft:r.turns,productionEnabled:false,recruitmentEnabled:false,replenishmentEnabled:false});
 initializeDomesticV3(s);
}
export function overrideOccupation(s,cityId,method){
 if(!domesticV3Enabled(s))throw new Error('DOMESTIC_V3_DISABLED');
 const c=s.cities[cityId],o=s.occupations?.[cityId];if(!c||!o)throw new Error('INVALID_OCCUPATION_CITY');
 const reason=occupationMethodReason(s,c,method);if(reason)throw new Error(reason);method=v3Method(method);const u=o.v3Undo,f=s.factions[c.ownerFactionId];
 // Reverse only this selection's deltas; other cities' transfers stay intact.
 undoV3Loot(s,c);f.granary+=u.grain;f.prestige=(f.prestige??0)+u.prestige;
 c.people=u.people;c.domesticSpecialists={...u.specialists};c.securityLevel=u.security;c.plunderTurn=u.plunderTurn;c.gradePenaltyUntil=u.gradePenaltyUntil;c.facilities.forEach((x,i)=>{x.damaged=u.damaged[i];});syncPeople(c);
 applyV3Method(s,c,method);if(o.v3LootSource)transferV3Loot(s,c);return s;
}
function undoV3Loot(s,c){
 const o=s.occupations[c.cityId],loot=o.v3Loot;if(!loot)return;
 for(const key of ['spear','blade','bow','horse'])if(loot.armory){s.factions[o.formerOwnerFactionId].armory[key]+=loot.armory[key];s.factions[c.ownerFactionId].armory[key]-=loot.armory[key];}
 for(const key of ['granary','treasury']){s.factions[o.formerOwnerFactionId][key]+=loot[key];s.factions[c.ownerFactionId][key]-=loot[key];}delete o.v3Loot;
}
function transferV3Loot(s,c){
 const o=s.occupations[c.cityId],source=o.v3LootSource,from=s.factions[o.formerOwnerFactionId],to=s.factions[c.ownerFactionId];if(!source||!from)return;
 const factor=o.method==='plunder'?V3.occupation.plunderLootFactor:1,loot={};
 for(const key of ['granary','treasury']){loot[key]=Math.min(Math.max(0,from[key]??0),Math.floor(source[key]*source.ratio*factor));from[key]-=loot[key];to[key]+=loot[key];}
 if(source.armory){loot.armory={};for(const key of ['spear','blade','bow','horse']){const amount=Math.min(from.armory[key],Math.floor(source.armory[key]*source.ratio*factor));from.armory[key]-=amount;to.armory[key]+=amount;loot.armory[key]=amount;}}
 o.v3Loot=loot;
}
// Capture calls this after the old reserves have been dispersed by the locked combat owner.
export function captureV3Loot(s,c,dispersed=0){
 initializeCampaignOccupation(s);const o=s.occupations[c.cityId];if(!o||o.v3LootChecked)return;
 o.v3LootChecked=true;
 const captured=c.v3CapturedLots?.turn===o.selectedTurn?c.v3CapturedLots:null;
 // Some legacy faction packages move reserves before the combat scatter hook.
 // Remove those same real lots before converting a share, preserving conservation.
 let remaining=0;if(captured)for(const lot of s.personnel.lots.filter(l=>captured.lotIds.includes(l.lotId))){remaining+=lot.count;lot.count=0;}
 s.personnel.initialPersonnel-=remaining;
 if(c.lootedTurn!==undefined&&s.turn-c.lootedTurn<V3.occupation.lootCooldown)return;
 const former=o.formerOwnerFactionId,from=s.factions[former];if(!from||former===c.ownerFactionId)return;
 const total=Object.values(s.cities).filter(x=>x!==c&&x.ownerFactionId===former).reduce((n,x)=>n+x.people,0)+o.capturePeople;
 o.v3LootSource={ratio:total?o.capturePeople/total:0,...(from.armory?{armory:{...from.armory}}:{}),granary:from.granary??0,treasury:from.treasury??0};
 transferV3Loot(s,c);const count=Math.floor((captured?.count??dispersed)*V3.occupation.lootTroopRate);
 if(count){const lotId=`C474.LOOT.${s.turn}.${c.cityId}`;s.personnel.lots.push({lotId,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count});s.personnel.initialPersonnel+=count;s.economy.lotFaction[lotId]=c.ownerFactionId;}
 o.v3LootTroops=count;c.lootedTurn=s.turn;
}
function settleV3Occupation(s,c,o){
 if(!o||o.stage==='NORMAL'||o.lastSettledTurn===s.turn)return;o.lastSettledTurn=s.turn;o.v3Processed=true;
 if(o.method==='plunder'&&!o.v3RivalApplied){const home=s.factions[o.formerOwnerFactionId],occupier=s.factions[c.ownerFactionId];if(home?.alive&&s.officers[home.rulerId]?.lifeState==='ALIVE'&&s.officers[occupier.rulerId]?.lifeState==='ALIVE')rivalEvent(s,'atrocity',occupier.rulerId,home.rulerId);o.v3RivalApplied=true;}
 if(o.stage==='OCCUPATION'){if(o.method==='military'&&!occupationGarrison(s,c))return;if(--o.turnsLeft<=0){o.stage='STABILIZING';o.state='STABILIZING';o.turnsLeft=1;}return;}
 const combat=s.economy.combatCities?.[c.cityId];
 if(c.besieged||o.besiegedTurn===s.turn-1||combat===s.turn||combat===s.turn-1||c.securityLevel>0)return;
 Object.assign(o,{stage:'NORMAL',state:'NORMAL',turnsLeft:0,productionEnabled:true,recruitmentEnabled:true,replenishmentEnabled:true});c.occupationState='NORMAL';
 if(s.terminal){const t=s.terminal,tc=t.citiesById[c.cityId];if(tc){tc.occupationState='NORMAL';tc.pendingGovernor=false;tc.occupationRecordId=null;}
 for(const choice of Object.values(t.choicesById))if(choice.type==='OCCUPATION'&&choice.cityId===c.cityId&&choice.status==='PENDING'){
 const id=`REC.C474.NORMAL.${s.globalTick}.${c.cityId}`;t.recordsById[id]={recordId:id,globalTick:s.globalTick,type:'OCCUPATION_CHOICE',causeRecordIds:[choice.causeRecordId],refs:{factionIds:[c.ownerFactionId],armyIds:[],officerIds:[],cityIds:[c.cityId],choiceIds:[choice.choiceId],prisonerRecordIds:[]},details:{method:o.method}};Object.assign(choice,{status:'RESOLVED',resolvedAtTick:s.globalTick,resolutionRecordId:id});}
 syncCampaignAdministrativeTerminal(s);}
 autoFillV3Seats(s);
}
