import peopleTrial from '../data/c192-people-trial.json' with {type:'json'};
import {relation,relationsEnabled,RELATIONS} from './campaign-relations.mjs';
import {troopText,troopDelta} from './troop-display.mjs';
import {recordAchievementEvent} from './campaign-achievements.mjs';
import {c34Cost} from './campaign-c34.mjs';
import {c31RecruitCost} from './campaign-events.mjs';
import {domesticRecruitCost} from './campaign-rule-registry.mjs';
import {recordC22Capture} from './campaign-events.mjs';
// C20: all numbers below are trial values; P1 is fixed from campaign creation.
import {hexDistance} from './map-primitives.mjs';
import {cityPopulationCapacity,freeCityOfficers} from './campaign-roster.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {facilityDisabled,CITY_JOBS} from './campaign-economy.mjs';
import {canMainAction,consumeMainAction,hasCampaignRule} from './campaign-effects.mjs';
import {changeMorale} from './campaign-morale.mjs';
import {changeFormation} from './campaign-abilities.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
export const C20=Object.freeze({facilityCost:14,facilityLimit:1,tuntianFood:3,clinicMultiplier:2,recoveryPerTurn:100,mufuRange:3,mufuCooldownReduction:1,armyCooldown:2,cityCooldown:3,duration:2,vision:3,vanguard:1.25,supply:40,muster:100,cityDamage:10,production:3,recruitCost:50,recruitDiscount:.5});
export const C20_FACILITIES=Object.freeze({tuntian:{factionId:'F01',name:'둔전',description:'도시 식량 +3'},clinic:{factionId:'F02',name:'의원',description:'도시 부상병 회복 속도 ×2'},mufu:{factionId:'F03',name:'장막부',description:'그 성 태수의 별의 길 대기 −1턴, 3칸 안에서 차례를 시작한 부대장의 별의 길 대기 −1턴'}});
export const C20_POLICIES=Object.freeze({F01:{name:'편입제국',description:'적 성의 가장 발전한 시설을 함락 직전 소유하던 성에서 건설 해금'},F02:{name:'탈출·재정착',description:'함락 시 주민 절반·예비병·자유 장수 탈출, 피란 대열 재정착. 성 없이도 부대가 있으면 생존'},F03:{name:'별의 길',description:'부대장·태수의 가장 높은 큰 능력에 맞는 행동 1개'}});
export const c20Enabled=s=>['v2','v3'].includes(s.mapId);
const alive=(s,a)=>castleArmyActive(s,a);
const name=(s,c)=>s.cityDisplayNames?.[c.cityId]??c.name;
const line=(s,factionId,text)=>{s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId,text});s.administrationLog=s.administrationLog.slice(-120);};
export function initializeCampaignPolicy(s){
 if(!c20Enabled(s))return s;
 s.c20??={version:1,unlocks:[],refugees:[],readyTurns:{},stats:{facilities:0,unlocks:0,escapes:0,resettlements:0,starActions:0}};
 return s;
}
export function uniqueFacilityReason(s,c,kind){
 if(!C20_FACILITIES[kind])return null;
 if(!c20Enabled(s))return 'C20_DISABLED';
 if(C20_FACILITIES[kind].factionId!==c.ownerFactionId&&!(c.ownerFactionId==='F01'&&s.c20?.unlocks.some(u=>u.kind===kind&&u.cityIds.includes(c.cityId))))return 'UNIQUE_FACILITY_LOCKED';
 if(c.facilities.filter(f=>f.kind===kind).length>=C20.facilityLimit)return 'UNIQUE_FACILITY_LIMIT';
 return null;
}
export const activeUnique=(s,c,kind)=>c20Enabled(s)&&c.facilities.some(f=>f.kind===kind&&!facilityDisabled(s,c,f));
const activeMufu=(s,c)=>c?.ownerFactionId==='F03'&&(s.occupations?.[c.cityId]?.state??c.occupationState)==='NORMAL'&&activeUnique(s,c,'mufu');
const mufuDiscount=(s,a,c)=>a?a.mufuTurn===s.turn&&(a.mufuCityIds??[]).some(id=>activeMufu(s,s.cities[id])):activeMufu(s,c);
export function startFactionPolicy(s,factionId){
 initializeCampaignPolicy(s);if(!c20Enabled(s))return s;
 if(factionId==='F03')for(const a of Object.values(s.armies).filter(a=>a.factionId===factionId&&alive(s,a))){
  if(a.policyStartTurn===s.turn)continue;a.policyStartTurn=s.turn;
  a.mufuTurn=s.turn;a.mufuCityIds=Object.values(s.cities).filter(c=>activeMufu(s,c)&&hexDistance(s.tiles[c.tileId],s.tiles[a.tileId])<=C20.mufuRange).map(c=>c.cityId);
 }
 return s;
}
const owned=(s,fid)=>Object.values(s.cities).filter(c=>c.ownerFactionId===fid);
const nearest=(s,origin,cities)=>[...cities].sort((a,b)=>hexDistance(s.tiles[origin],s.tiles[a.tileId])-hexDistance(s.tiles[origin],s.tiles[b.tileId])||a.cityId.localeCompare(b.cityId))[0];
function relocateRefugeeLot(s,id,nodeId){
 const lot=s.personnel.lots.find(l=>l.lotId===id);
 // Completed transports retain their source provenance. Move only the stock,
 // leaving an empty historical source at its original node.
 if(s.personnel.transports.some(t=>t.sourceLotId===id)){
  const nextId=`C27.REFUGE.${s.turn}.${s.personnel.lots.length}`;
  s.personnel.lots.push({...structuredClone(lot),lotId:nextId,nodeId});lot.count=0;
  s.economy.lotFaction[nextId]='F02';if(s.economy.recruitedReady[id])s.economy.recruitedReady[nextId]=true;s.economy.readyAt[nextId]=s.economy.readyAt[id]??0;return nextId;
 }
 lot.nodeId=nodeId;s.economy.lotFaction[id]='F02';return id;
}
function moveRefugees(s,r,c){
 if(!c)return 0;
 const n=Math.min(r.population,Math.max(0,cityPopulationCapacity(s,c)-c.population));c.population+=n;r.population-=n;
 r.lotIds=r.lotIds.map(id=>relocateRefugeeLot(s,id,c.cityId));
 for(const id of r.officerIds){const o=s.officers[id];o.locationRef={kind:'CITY',id:c.cityId};if(s.terminal)s.terminal.officersById[id].assignment={kind:'NONE',id:null};}
 c.reserveTroops+=r.lotIds.reduce((n,id)=>n+s.personnel.lots.find(l=>l.lotId===id).count,0);
 r.lotIds=[];r.officerIds=[];return n;
}
// Run before terminal capture clears the governor and changes city ownership.
export function preparePolicyCapture(s,payloads){
 initializeCampaignPolicy(s);if(!c20Enabled(s))return;
 for(const p of payloads){recordC22Capture(s,p);const c=s.cities[p.capturedCityId];
  if(p.formerOwnerFactionId&&p.formerOwnerFactionId!==p.occupierFactionId&&(s.c43?.pairs?.[[p.formerOwnerFactionId,p.occupierFactionId].sort().join('|')]?.state??'WAR')==='WAR')recordAchievementEvent(s,{id:`CAPTURE.${s.turn}.${c.cityId}.${p.occupierFactionId}`,type:'HOSTILE_CAPTURE',factionId:p.occupierFactionId,cityId:c.cityId});
  if(p.occupierFactionId==='F01'&&p.formerOwnerFactionId&&p.formerOwnerFactionId!=='F01'){
   const cities=owned(s,'F01').filter(c=>!payloads.some(p=>p.capturedCityId===c.cityId&&p.occupierFactionId!=='F01'));
   const canBuild=kind=>s.c20.unlocks.some(u=>u.kind===kind)||(C20_FACILITIES[kind]?C20_FACILITIES[kind].factionId==='F01':kind==='workshop'?(s.factions.F01.research?.stage??0)>=1:true);
   const top=c.facilities.filter(f=>CITY_JOBS[f.kind]&&!canBuild(f.kind)).sort((a,b)=>(CITY_JOBS[b.kind]?.cost??0)-(CITY_JOBS[a.kind]?.cost??0)||a.kind.localeCompare(b.kind,'en'))[0];
   if(top&&!canBuild(top.kind)&&cities.length){s.c20.unlocks.push({kind:top.kind,cityIds:cities.map(c=>c.cityId).sort(),turn:s.turn});s.c20.stats.unlocks++;line(s,'F01',`편입제국 — ${(C20_FACILITIES[top.kind]??CITY_JOBS[top.kind]).name} 건설 가능`);}
  }
  if(p.formerOwnerFactionId!=='F02'||p.occupierFactionId==='F02')continue;
  const population=Math.floor(c.population/2),lotIds=s.personnel.lots.filter(l=>l.nodeId===c.cityId&&l.kind!=='WOUNDED'&&l.count>0).map(l=>l.lotId);
  const reserve=lotIds.reduce((n,id)=>n+s.personnel.lots.find(l=>l.lotId===id).count,0);
  const officerIds=freeCityOfficers(s,c).map(o=>o.officerId);
  const r={originTileId:c.tileId,population,lotIds,officerIds};c.population-=population;c.workedTiles=c.workedTiles.slice(0,c.population);c.reserveTroops=0;
  const dest=nearest(s,c.tileId,owned(s,'F02').filter(c=>!payloads.some(p=>p.capturedCityId===c.cityId&&p.occupierFactionId!=='F02')));
  if(c.governorId&&officerIds.includes(c.governorId)){c.governorId=null;if(s.terminal)s.terminal.citiesById[c.cityId].governorId=null;}
  r.lotIds=lotIds.map(id=>relocateRefugeeLot(s,id,`C20.REFUGE.${c.cityId}`));
  for(const id of officerIds){s.officers[id].locationRef={kind:'NONE',id:null};if(s.terminal)s.terminal.officersById[id].assignment={kind:'NONE',id:null};}
  moveRefugees(s,r,dest);if(r.population||r.lotIds.length||r.officerIds.length)s.c20.refugees.push(r);
  s.c20.stats.escapes++;line(s,'F02',`${name(s,c)} 함락 — 주민 ${population}·예비병 ${troopText(reserve)} 탈출(→ ${dest?name(s,dest):'피란 대열'})`);
 }
 if(s.terminal)syncCampaignAdministrativeTerminal(s);
}
export function settlePolicyRefugees(s){
 if(!c20Enabled(s)||!s.c20)return s;
 for(const r of s.c20.refugees){
  const cities=owned(s,'F02'),dest=nearest(s,r.originTileId,cities.filter(c=>r.lotIds.length||r.officerIds.length||c.population<cityPopulationCapacity(s,c)));
  if(!dest)continue;const any=r.lotIds.length||r.officerIds.length,n=moveRefugees(s,r,dest);
  if(n||any){s.c20.stats.resettlements++;line(s,'F02',`피란 대열 재정착(→ ${name(s,dest)})`);}
 }
 s.c20.refugees=s.c20.refugees.filter(r=>r.population||r.lotIds.length||r.officerIds.length);
 if(s.terminal&&!s.gameResult)syncCampaignAdministrativeTerminal(s);return s;
}
const axes=['leadership','might','intelligence','politics','charisma'];
const axisNames=['지휘','무용','지략','정무','감화'];
const actionNames={ARMY:['훈련','선봉','정찰','보급','격려'],CITY:['훈련','방비','정찰','증산','포섭']};
const descriptions={ARMY:['전열·사기 한 단계 회복','다음 공격 1회 피해 +25%(다음 차례 끝까지)','2턴 시야 +3',`부상병 ${troopText(40)} 복귀`,'인접 아군 사기 한 단계 회복'],CITY:[`다음 출진 병력 ${troopDelta(100)}`,'2턴 성 사격 피해 +10','2턴 성 시야 +3','다음 정산 생산 +3','이번 턴 이 도시 등용 인망 절반']};
export function starAction(s,{armyId,cityId},factionId=s.playerFactionId){
 if(!c20Enabled(s)||factionId!=='F03')return null;
 const role=armyId?'ARMY':'CITY',target=armyId?s.armies[armyId]:s.cities[cityId],officerId=armyId?target?.commanderId:target?.governorId,o=s.officers[officerId];
 if(!o||o.allegianceFactionId!==factionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE'||(armyId?target.factionId:target.ownerFactionId)!==factionId)return null;
 const index=axes.reduce((best,axis,i)=>(o.baseStats[axis]??0)>(o.baseStats[axes[best]]??0)?i:best,0),key=`${role}.${officerId}`;
 const readyTurn=s.c20?.readyTurns[key]??0,cooldown=Math.max(0,readyTurn-s.turn);
 const blockedReason=cooldown?'STAR_COOLDOWN':armyId?(!alive(s,target)||target.morale==='ROUTING'?'STAR_UNAVAILABLE':!canMainAction(s,armyId)||s.endedArmyIds.includes(armyId)?'MAIN_ACTION_USED':null):(s.occupations?.[cityId]?.state??target.occupationState)!=='NORMAL'?'STAR_OCCUPIED':null;
 return {officerId,role,armyId:armyId??null,cityId:cityId??null,key,axis:axisNames[index],index,name:actionNames[role][index],description:descriptions[role][index],cooldown,readyTurn,canUse:!blockedReason,blockedReason};
}
function rally(s,a,name='별의 행동'){if(a.morale==='ROUTING')changeMorale(s,a.armyId,'SHAKEN',name);else if(a.morale==='SHAKEN')changeMorale(s,a.armyId,'STEADY',name);}
export function useStarAction(s,command,factionId=s.playerFactionId){
 initializeCampaignPolicy(s);const action=starAction(s,command,factionId);if(!action)throw new Error('INVALID_STAR_ACTION');if(!action.canUse)throw new Error(action.blockedReason);
 const {armyId,cityId,index}=action;
 if(armyId){const a=s.armies[armyId];
  if(index===0){rally(s,a,action.name);changeFormation(s,armyId,-1);}
  if(index===1)a.starVanguardTurn=s.turn;
  if(index===2)a.starVisionUntil=s.turn+C20.duration-1;
  if(index===3){const f=s.personnel.formations.find(f=>f.formationId===armyId);let remaining=Math.min(C20.supply,Math.max(0,f.targetStrength-f.field));
   for(const l of s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===armyId)){const n=Math.min(l.count,remaining);l.count-=n;f.field+=n;a.troopCount+=n;a.woundedCount-=n;remaining-=n;}
  }
  if(index===4)for(const b of Object.values(s.armies))if(b.armyId!==armyId&&b.factionId===factionId&&alive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1)rally(s,b,action.name);
  consumeMainAction(s,armyId);
 }else{const c=s.cities[cityId];if(index===0)c.starMusterBonus=C20.muster;if(index===1)c.starDefenseUntil=s.turn+C20.duration-1;if(index===2)c.starVisionUntil=s.turn+C20.duration-1;if(index===3)c.starProductionTurn=s.turn+1;if(index===4)c.starRecruitTurn=s.turn;}
 s.c20.readyTurns[action.key]=s.turn+(armyId?C20.armyCooldown:C20.cityCooldown)-(mufuDiscount(s,s.armies[armyId],s.cities[cityId])?C20.mufuCooldownReduction:0);s.c20.stats.starActions++;
 line(s,factionId,`\uBCC4\uC758 \uAE38 \u2014 ${s.officers[action.officerId].name} ${action.name}`);return s;
}
export const starAttackMultiplier=(s,a)=>c20Enabled(s)&&a.starVanguardTurn<=s.turn&&s.turn<=a.starVanguardTurn+1?C20.vanguard:1;
const baseCityRecruitCost=(s,cityId,fid)=>c34Cost(s,s.cities[cityId],'recruit',c31RecruitCost(s,fid,domesticRecruitCost(s,fid,c20Enabled(s)&&fid==='F03'&&s.cities[cityId]?.ownerFactionId===fid&&s.cities[cityId].starRecruitTurn===s.turn?C20.recruitCost*C20.recruitDiscount:C20.recruitCost)));
export function aiStarAction(s,command,fid){
 const act=starAction(s,command,fid);if(!act?.canUse)return false;
 const a=s.armies[command.armyId],c=s.cities[command.cityId];let useful=false;
 if(a){const foes=Object.values(s.knowledge[fid].observedArmies).filter(b=>s.knowledge[fid].tiles[b.tileId]==='VISIBLE');
  useful=act.index===0?(a.formation!=='ORDERED'||a.morale==='SHAKEN'):act.index===1?hasCampaignRule(s,a.armyId,'DOUBLE_ACTION')&&foes.some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=2):act.index===2?foes.length===0:act.index===3?a.woundedCount>0:Object.values(s.armies).some(b=>b.armyId!==a.armyId&&b.factionId===fid&&alive(s,b)&&b.morale!=='STEADY'&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1);
 }else useful=act.index===0?c.reserveTroops>0:act.index===1?c.besieged:act.index===2?true:act.index===3?true:Object.values(s.wanderers??{}).some(o=>o.locationRef.id===c.cityId);
 if(useful){useStarAction(s,command,fid);return true;}return false;
}
export function campaignPolicyView(s,fid){
 if(!c20Enabled(s))return null;
 return {...C20_POLICIES[fid],slot:'P1',fixed:true,facilities:Object.entries(C20_FACILITIES).map(([kind,f])=>({kind,...f,cost:C20.facilityCost,cityIds:owned(s,fid).filter(c=>!uniqueFacilityReason(s,{...c,facilities:[]},kind)).map(c=>c.cityId)})),unlocks:fid==='F01'?structuredClone(s.c20.unlocks):[],refugees:fid==='F02'?structuredClone(s.c20.refugees):[],actions:[...owned(s,fid).map(c=>starAction(s,{cityId:c.cityId},fid)),...Object.values(s.armies).filter(a=>a.factionId===fid&&alive(s,a)).map(a=>starAction(s,{armyId:a.armyId},fid))].filter(Boolean)};
}
export function validateCampaignPolicy(s){
 if(!c20Enabled(s))return;
 const p=s.c20,integer=n=>Number.isSafeInteger(n)&&n>=0;
 if(!p||p.version!==1||!Array.isArray(p.unlocks)||!Array.isArray(p.refugees)||!p.readyTurns||!p.stats||Object.values(p.stats).some(n=>!integer(n))||Object.values(p.readyTurns).some(n=>!integer(n)))throw new Error('INVALID_CAMPAIGN_C20');
 for(const u of p.unlocks)if(!CITY_JOBS[u.kind]||!Array.isArray(u.cityIds)||u.cityIds.some(id=>!s.cities[id])||!integer(u.turn)||u.turn>s.turn)throw new Error('INVALID_CAMPAIGN_C20_UNLOCK');
 for(const r of p.refugees)if(!s.tiles[r.originTileId]||!integer(r.population)||!Array.isArray(r.lotIds)||!Array.isArray(r.officerIds)||r.lotIds.some(id=>!s.personnel.lots.some(l=>l.lotId===id))||r.officerIds.some(id=>!s.officers[id]))throw new Error('INVALID_CAMPAIGN_C20_REFUGEES');
 for(const c of Object.values(s.cities))for(const kind of Object.keys(C20_FACILITIES))if(c.facilities.filter(f=>f.kind===kind).length>C20.facilityLimit)throw new Error('INVALID_CAMPAIGN_C20_FACILITIES');
}

// One pure quote for the UI, reservation, and AI affordability guard.
export function cityRecruitQuote(s,cityId,fid,targetId=null){
 const base=baseCityRecruitCost(s,cityId,fid);
 const candidates=targetId&&relationsEnabled(s)?Object.values(s.officers).filter(o=>o.officerId!==targetId&&o.allegianceFactionId===fid&&o.lifeState==='ALIVE'&&o.captivityState==='FREE').map(o=>({o,r:relation(s,o.officerId,targetId)})):[];
 // A present rival takes priority over a friendly sponsor; never stack sponsors.
 const match=candidates.filter(x=>x.r.tier==='RIVAL').sort((a,b)=>a.o.officerId.localeCompare(b.o.officerId))[0]??candidates.filter(x=>x.r.value>=RELATION_CLOSE()).sort((a,b)=>b.r.value-a.r.value||a.o.officerId.localeCompare(b.o.officerId))[0];
 const tier=match?.r.tier,factor=peopleTrial.recruit[tier]??(match?peopleTrial.recruit.CLOSE:1),cost=Math.ceil(base*factor);
 return {base,cost,factor,sponsorId:match?.o.officerId??null,reason:match?`${match.o.name}${/[가-힣]/.test(match.o.name.at(-1))&&(match.o.name.at(-1).charCodeAt(0)-0xAC00)%28?'과':'와'} ${tier==='BOUND'?'결의 — 인망 절반':tier==='RIVAL'?'숙적 — 인망 50% 증가':'친분 이상 — 인망 25% 감소'}`:'관계에 따른 인망 변화 없음'};
}
const RELATION_CLOSE=()=>RELATIONS.tiers.find(t=>t.id==='CLOSE').min;
export const cityRecruitCost=(s,cityId,fid,targetId=null)=>cityRecruitQuote(s,cityId,fid,targetId).cost;
