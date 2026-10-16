import {C182} from './campaign-rule-registry.mjs';
import {supplyEnabled} from './campaign-supply.mjs';
import {rivalEvent} from './campaign-relations.mjs';
import {domesticSecurity,domesticFoodAvailable,domesticSpendFood} from './campaign-rule-registry.mjs';
import {creditCampaignDomestic} from './campaign-growth.mjs';
import {hexDistance} from './map-primitives.mjs';
import {castleArmyActive} from './campaign-city-footprint.mjs';
import {changeMorale} from './campaign-morale.mjs';
import {changeFormation} from './campaign-abilities.mjs';
import {cityPopulationCapacity,freeCityOfficers} from './campaign-roster.mjs';
import {cityJobReason,selectCityJob} from './campaign-economy.mjs';
import {syncCampaignAdministrativeTerminal} from './campaign-terminal-world-application.mjs';
// C22 numbers are trial values, shared by runtime, preview and AI.
export const C22=Object.freeze({limit:3,gap:4,contactTurns:2,pairRange:3,enemyRange:5,recentTurns:3,crisisTurn:18,majorCities:2,duration:6,foodSmall:10,food:15,foodLarge:20,progress:7,bonusFood:2,bonusTurns:5,population:1,prestigeSmall:5,prestige:10,prestigeLarge:15,wounded:40,reserves:100,guard:50,attack:1.15,coalition:1.1,durability:20,aiWeight:100});
export const c22Enabled=s=>['v2','v3'].includes(s.mapId);
const rows=[
 ['E01','F01','버려진 밭의 주인들','SITUATION','황폐한 밭에 유민이 돌아왔다. 누가 이 땅을 일굴 것인가.',['관유 농우를 배정한다','호족에게 위탁한다','주민 자치를 허용한다','설치를 미룬다'],['식량 −15 · 둔전 진행 +7 (건설 불가: 식량 +2, 5턴)','인망 −10 · 식량 +2, 5턴','인구 +1 · 치안 회복','효과 없음'],['c','a','b','d']],
 ['E02','F01','관도로 가는 군량','EVENT','전선의 비축이 바닥나고 있다. 후방 창고의 군량을 어떻게 보낼 것인가.',['대규모 수송대를 호송한다','여러 길로 나누어 보낸다','공격을 늦춘다'],['수도 식량 −20 · 교전 부대 사기 회복 · 부상병 40 복귀','수도 식량 −10 · 최소 병력 부대 사기 회복','교전 부대 방어 태세'],['a','b','c']],
 ['E03','F02','성문 앞의 굶주린 마을','INCIDENT','굶주린 마을 사람들이 성문 앞에 모였다.',['성 안으로 받아들인다','마을로 식량을 보낸다','안전한 길만 알려 준다'],['식량 −15 · 인구 +1 · 인망 +10','식량 −10 · 치안 회복 · 인망 +5','인망 −5'],['b','a','c']],
 ['E04','F02','함께 가겠다는 사람들','SITUATION','성을 버리고 떠나는 길, 백성들이 따라나섰다.',['모두 함께 간다','싸울 수 있는 이들만 데려간다','따로 병력을 붙여 지킨다'],['인구 +1 · 최대 병력 부대 사기 저하','예비병 +100 (성 없으면 효과 없음)','인망 +15 · 예비병 −50'],['b','c','a']],
 ['E05','F03','두 장수, 하나의 전선','EVENT','같은 전선에 선 두 장수가 서로 선봉을 다툰다.',['총지휘관 한 명을 정한다','군의를 열어 함께 계획한다','출정을 늦춘다'],['높은 지휘 부대 이번 턴 다음 공격 +15%','두 부대 전열 회복','두 부대 방어 태세'],['a','b','c']],
 ['E06','F03','객장에게 맡길 강 어귀','SITUATION','새로 얻은 땅을 누구에게 맡길 것인가.',['객장에게 군정권을 맡긴다','토착 대표와 협약한다','중앙에서 직접 다스린다'],['무용 최고 장수 태수 · 점령 남은 턴 −1 (최소 1)','치안 회복 · 인망 −5','인망 +5'],['a','b','c']]
];
export const C22_EVENTS=Object.freeze(rows.map(([eventId,factionId,title,scale,text,labels,previews,ai])=>({eventId,factionId,title,scale,text,ai,choices:labels.map((label,i)=>({id:'abcd'[i],label,preview:previews[i]}))})));
const cities=(s,fid)=>Object.values(s.cities).filter(c=>c.ownerFactionId===fid).sort((a,b)=>a.tileId.localeCompare(b.tileId,'en'));
const armies=(s,fid)=>Object.values(s.armies).filter(a=>a.factionId===fid&&castleArmyActive(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId));
const contact=(s,a)=>Object.values(s.armies).some(b=>b.factionId!==a.factionId&&castleArmyActive(s,b)&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])===1);
const line=(s,fid,text)=>{s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:fid,text});};
export function initializeCampaignEvents(s){if(c22Enabled(s))s.c22??={fired:[],pending:{},crisis:null,startedTurns:{},contacts:{},captures:{},foodBonuses:[],escape:null,crisisStartedTurn:null};return s;}
export function recordC22Capture(s,p){initializeCampaignEvents(s);if(!c22Enabled(s))return;const c=s.cities[p.capturedCityId];s.c22.captures[c.cityId]={factionId:p.occupierFactionId,turn:s.turn};if(p.formerOwnerFactionId==='F02'&&p.occupierFactionId!=='F02')s.c22.escape??={turn:s.turn,originTileId:c.tileId,eligibleTurn:s.c22.startedTurns.F02===s.turn?s.turn+1:s.turn};}
const nearest=(s,fid,origin)=>cities(s,fid).sort((a,b)=>hexDistance(s.tiles[origin],s.tiles[a.tileId])-hexDistance(s.tiles[origin],s.tiles[b.tileId])||a.tileId.localeCompare(b.tileId,'en'))[0];
export function eventCandidate(s,eventId){
 const e=C22_EVENTS.find(e=>e.eventId===eventId);if(!e||!c22Enabled(s))return null;const cs=cities(s,e.factionId),as=armies(s,e.factionId);let c,ids;
 if(eventId==='E01')c=cs.find(c=>c.population<=3&&!c.facilities.some(f=>f.kind==='tuntian'));
 if(eventId==='E03')c=cs.find(c=>(c.securityLevel??0)>=1||c.foodStock<30);
 if(eventId==='E06')c=cs.find(c=>s.c22.captures[c.cityId]?.factionId===e.factionId&&s.turn-s.c22.captures[c.cityId].turn<C22.recentTurns);
 if(['E01','E03','E06'].includes(eventId))return c?{cityId:c.cityId,...(eventId==='E06'?{officerIds:freeCityOfficers(s,c).sort((a,b)=>b.baseStats.might-a.baseStats.might||a.officerId.localeCompare(b.officerId)).map(o=>o.officerId)}:{})}:null;
 if(eventId==='E02'){ids=as.filter(a=>contact(s,a)).map(a=>a.armyId);return ids.some(id=>(s.c22.contacts[id]?.count??0)>=C22.contactTurns)?{armyIds:ids,...(s.cities[s.factions.F01.capitalCityId]?.ownerFactionId==='F01'?{cityId:s.factions.F01.capitalCityId}:{})}:null;}
 if(eventId==='E04'){const r=s.c22.escape;if(!r||s.turn!==r.eligibleTurn||!as.length&&!cs.length&&!(s.c20?.refugees.length))return null;c=nearest(s,'F02',r.originTileId);return {...(c?{cityId:c.cityId}:{}),armyIds:as.sort((a,b)=>b.troopCount-a.troopCount||a.armyId.localeCompare(b.armyId)).map(a=>a.armyId)};}
 if(eventId==='E05')for(let i=0;i<as.length;i++)for(let j=i+1;j<as.length;j++)if(hexDistance(s.tiles[as[i].tileId],s.tiles[as[j].tileId])<=C22.pairRange&&[as[i],as[j]].some(a=>Object.values(s.knowledge.F03.observedArmies).some(b=>s.knowledge.F03.tiles[b.tileId]==='VISIBLE'&&castleArmyActive(s,s.armies[b.armyId])&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=C22.enemyRange)))return {armyIds:[as[i].armyId,as[j].armyId],officerIds:[as[i].commanderId,as[j].commanderId]};
 return null;
}
function definition(s,fid,p){if(p.eventId!=='CRISIS_HEGEMONY')return C22_EVENTS.find(e=>e.eventId===p.eventId);const leader=s.c22.crisis?.factionId===fid;return {eventId:p.eventId,title:'패권 견제',scale:'CRISIS',text:'천하가 패권을 견제하기 위해 움직인다.',ai:['a','b','c'],choices:(leader?['전군을 결집한다','성 방비를 다진다','그대로 밀어붙인다']:['연합에 참가한다','관망한다']).map((label,i)=>({id:'abc'[i],label,preview:(leader?['전 부대 사기 회복 · 수도 식량 −20','전 성 내구도 +20','효과 없음']:['위기 동안 패권 세력 상대 피해 +10% · 인망 +10','효과 없음'])[i]}))};}
export function eventChoiceReason(s,fid,p,id){
 const e=definition(s,fid,p);if(!e?.choices.some(c=>c.id===id))return '알 수 없는 선택지';const c=s.cities[p.cityId],f=s.factions[fid],key=p.eventId;
 const food=key==='E01'&&id==='a'||key==='E03'&&id==='a'?C22.food:key==='E02'&&id==='a'||key==='CRISIS_HEGEMONY'&&s.c22.crisis?.factionId===fid&&id==='a'?C22.foodLarge:key==='E02'&&id==='b'||key==='E03'&&id==='b'?C22.foodSmall:0;
 if(food&&(!c||c.ownerFactionId!==fid||domesticFoodAvailable(s,c)<food))return `식량 ${food} 필요`;
 const cost=key==='E01'&&id==='b'?C22.prestige:key==='E06'&&id==='b'?C22.prestigeSmall:0;
 if(cost&&f.prestige-(s.captiveRecruitment?.factions[fid]?.reservedPrestige??0)<cost)return `인망 ${cost} 필요`;
 if(key==='E04'&&id==='c'&&(!c||c.reserveTroops<C22.guard))return '예비병 50 필요';
 if(key==='E06'&&id==='a'&&!freeCityOfficers(s,c).some(o=>p.officerIds.includes(o.officerId)))return '임명할 장수 없음';
 return null;
}
const population=(s,c)=>{if(c)c.population=Math.min(cityPopulationCapacity(s,c),c.population+C22.population);};
const security=(s,c,n,source='EVENT')=>domesticSecurity(s,c,n,source);
const morale=(s,a,n)=>{const stages=['STEADY','SHAKEN','ROUTING'];changeMorale(s,a.armyId,stages[Math.max(0,Math.min(2,stages.indexOf(a.morale)+n))],'사건');};
function reserve(s,c,n){if(!c)return;if(n>0){const id=`C22.${s.turn}.${c.cityId}`;s.personnel.lots.push({lotId:id,kind:'READY',nodeId:c.cityId,identity:{baseTroopId:'BT01',specialTroopId:null},originFormationId:null,count:n});s.personnel.initialPersonnel+=n;s.economy.lotFaction[id]=c.ownerFactionId;}else {let left=-n;for(const l of s.personnel.lots.filter(l=>l.nodeId===c.cityId&&l.kind!=='WOUNDED')){const take=Math.min(left,l.count);l.count-=take;left-=take;}s.personnel.initialPersonnel+=n;}c.reserveTroops+=n;}
function returnWounded(s,a){const f=s.personnel.formations.find(f=>f.formationId===a.armyId);let left=Math.min(C22.wounded,f.targetStrength-f.field);for(const l of s.personnel.lots.filter(l=>l.originFormationId===a.armyId&&l.kind==='WOUNDED')){const n=Math.min(left,l.count);l.count-=n;f.field+=n;a.troopCount+=n;a.woundedCount=Math.max(0,a.woundedCount-n);left-=n;} }
export function chooseCampaignEvent(s,{eventId,choiceId},fid=s.playerFactionId){
 const p=c22Enabled(s)&&s.c22?.pending[fid];if(!p||p.eventId!==eventId)throw new Error('INVALID_EVENT_CHOICE');const reason=eventChoiceReason(s,fid,p,choiceId);if(reason)throw new Error(reason);
 const oldSecurity=s.cities[p.cityId]?.securityLevel??0,eventGovernor=s.cities[p.cityId]?.governorId;
 const e=definition(s,fid,p),c=s.cities[p.cityId],f=s.factions[fid],as=(p.armyIds??[]).map(id=>s.armies[id]).filter(a=>a&&a.factionId===fid&&castleArmyActive(s,a)),id=choiceId;
 if(eventId==='E01'){if(id==='a'){domesticSpendFood(s,c,C22.food);if(!cityJobReason(s,c,'tuntian')){selectCityJob(s,{cityId:c.cityId,kind:'tuntian'},fid);c.jobProgress.tuntian=(c.jobProgress.tuntian??0)+C22.progress;c.productionProgress=c.jobProgress.tuntian;}else s.c22.foodBonuses.push({cityId:c.cityId,factionId:fid,startTurn:s.turn+1,expiresTurn:s.turn+C22.bonusTurns});}if(id==='b'){f.prestige-=C22.prestige;s.c22.foodBonuses.push({cityId:c.cityId,factionId:fid,startTurn:s.turn+1,expiresTurn:s.turn+C22.bonusTurns});}if(id==='c'){population(s,c);security(s,c,-1);}}
 if(eventId==='E02'){if(id==='a'){domesticSpendFood(s,c,C22.foodLarge);for(const a of as){morale(s,a,-1);returnWounded(s,a);}}if(id==='b'){domesticSpendFood(s,c,C22.foodSmall);const a=[...as].sort((a,b)=>a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId))[0];if(a)morale(s,a,-1);}if(id==='c')for(const a of as)a.braced=true;}
 if(eventId==='E03'){if(id==='a'){domesticSpendFood(s,c,C22.food);population(s,c);f.prestige+=C22.prestige;}if(id==='b'){domesticSpendFood(s,c,C22.foodSmall);security(s,c,-1);f.prestige+=C22.prestigeSmall;}if(id==='c')f.prestige=Math.max(s.captiveRecruitment?.factions[fid]?.reservedPrestige??0,f.prestige-C22.prestigeSmall);}
 if(eventId==='E04'){if(id==='a'){if(c)population(s,c);else {const r=s.c20.refugees[0];if(r)r.population+=C22.population;else s.c20.refugees.push({originTileId:s.c22.escape.originTileId,population:C22.population,lotIds:[],officerIds:[]});}if(as[0])morale(s,as[0],1);}if(id==='b')reserve(s,c,C22.reserves);if(id==='c'){reserve(s,c,-C22.guard);f.prestige+=C22.prestigeLarge;}}
 if(eventId==='E05'){if(id==='a'){const a=[...as].sort((a,b)=>s.officers[b.commanderId].baseStats.leadership-s.officers[a.commanderId].baseStats.leadership||a.armyId.localeCompare(b.armyId))[0];if(a)s.c22.attackBonus={armyId:a.armyId,turn:s.turn};}if(id==='b')for(const a of as)changeFormation(s,a.armyId,-1);if(id==='c')for(const a of as)a.braced=true;}
 if(eventId==='E06'){if(id==='a'){const o=freeCityOfficers(s,c).filter(o=>p.officerIds.includes(o.officerId)).sort((a,b)=>b.baseStats.might-a.baseStats.might||a.officerId.localeCompare(b.officerId))[0],old=s.officers[c.governorId];if(old)old.locationRef={kind:'CITY',id:c.cityId};c.governorId=o.officerId;o.locationRef={kind:'CITY',id:c.cityId};if(supplyEnabled(s)&&s.terminal){s.terminal.citiesById[c.cityId].governorId=o.officerId;if(old)s.terminal.officersById[old.officerId].assignment={kind:'NONE',id:null};s.terminal.officersById[o.officerId].assignment={kind:'CITY',id:c.cityId};}const occ=s.occupations[c.cityId];if(occ&&occ.turnsLeft)occ.turnsLeft=Math.max(1,occ.turnsLeft-1);}if(id==='b'){security(s,c,-1);f.prestige-=C22.prestigeSmall;}if(id==='c')f.prestige+=C22.prestigeSmall;}
 if(eventId==='CRISIS_HEGEMONY'){if(s.c22.crisis.factionId===fid){if(id==='a'){domesticSpendFood(s,c,C22.foodLarge);for(const a of armies(s,fid))morale(s,a,-1);}if(id==='b')for(const city of cities(s,fid))city.durability=Math.min(city.durabilityMax,city.durability+C22.durability);}else if(id==='a'){s.c22.crisis.joined.push(fid);f.prestige+=C22.prestige;}}
 creditCampaignDomestic(s,{officerId:eventGovernor,eventId:`C25.EVENT.${s.turn}.${fid}.${eventId}`,kind:'EVENT_DECIDED',counts:{eventsDecided:1}});
 if(c&&(c.securityLevel??0)<oldSecurity)creditCampaignDomestic(s,{officerId:eventGovernor,eventId:`C25.EVENTSECURITY.${s.turn}.${fid}.${eventId}`,kind:'SECURITY_RECOVERED',counts:{securityRecovered:oldSecurity-c.securityLevel}});
 if(s.terminal)syncCampaignAdministrativeTerminal(s);
 s.c22.fired.push({eventId,factionId:fid,turn:s.turn,choiceId:id});delete s.c22.pending[fid];line(s,fid,`사건 — ${e.title}: ${e.choices.find(c=>c.id===id).label}(${e.choices.find(c=>c.id===id).preview})`);return s;
}
export function resolveAiEvent(s,fid){const p=s.c22?.pending[fid];if(!p)return;const e=definition(s,fid,p),id=e.ai.find(id=>!eventChoiceReason(s,fid,p,id));chooseCampaignEvent(s,{eventId:p.eventId,choiceId:id},fid);}
export function startFactionEvents(s,fid,{auto=false}={}){
 initializeCampaignEvents(s);if(!c22Enabled(s)||!s.factions[fid]?.alive)return s;const x=s.c22;
 if(x.startedTurns[fid]!==s.turn){x.startedTurns[fid]=s.turn;for(const a of armies(s,fid)){const prev=x.contacts[a.armyId];x.contacts[a.armyId]={turn:s.turn,count:contact(s,a)?(prev?.turn===s.turn-1?prev.count:0)+1:0};}
 if(!x.pending[fid]){const fired=x.fired.filter(e=>e.factionId===fid&&e.eventId!=='CRISIS_HEGEMONY');if(fired.length<C22.limit&&(!fired.length||s.turn-fired.at(-1).turn>=C22.gap)){for(const e of C22_EVENTS.filter(e=>e.factionId===fid)){if(x.fired.some(f=>f.eventId===e.eventId)||Object.values(x.pending).some(p=>p.eventId===e.eventId))continue;const candidate=eventCandidate(s,e.eventId);if(candidate){x.pending[fid]={eventId:e.eventId,...candidate,turn:s.turn};break;}}}}}
 if(auto)resolveAiEvent(s,fid);return s;
}
export function finishC22Crisis(s){
 const x=s.c22;
 if(c22Enabled(s)&&x?.crisis&&(s.turn>=x.crisis.endTurn||cities(s,x.crisis.factionId).filter(c=>c.kind==='major').length<C22.majorCities)){line(s,s.playerFactionId,'위기 종료 — 패권 견제');x.crisis=null;for(const [fid,p] of Object.entries(x.pending))if(p.eventId==='CRISIS_HEGEMONY')delete x.pending[fid];}
 return s;
}
export function settleCampaignEvents(s){
 initializeCampaignEvents(s);if(!c22Enabled(s))return s;const x=s.c22;finishC22Crisis(s);if(x.lastSettledTurn===s.turn)return s;x.lastSettledTurn=s.turn;
 for(const b of x.foodBonuses)if(s.turn>=b.startTurn&&s.turn<=b.expiresTurn&&s.cities[b.cityId]?.ownerFactionId===b.factionId)s.cities[b.cityId].foodStock=Math.min(s.cities[b.cityId].foodCapacity,s.cities[b.cityId].foodStock+C22.bonusFood);x.foodBonuses=x.foodBonuses.filter(b=>b.expiresTurn>s.turn);
 if(x.attackBonus?.turn<s.turn)delete x.attackBonus;

 if(!c31Enabled(s)&&!s.gameResult&&!x.crisis&&x.crisisStartedTurn===null&&s.turn>=C22.crisisTurn){const f=Object.values(s.factions).sort((a,b)=>a.factionId.localeCompare(b.factionId)).find(f=>f.alive&&cities(s,f.factionId).filter(c=>c.kind==='major').length>=C22.majorCities);if(f){x.crisisStartedTurn=s.turn;x.crisis={name:'패권 견제',factionId:f.factionId,startTurn:s.turn,endTurn:s.turn+C22.duration,joined:[]};for(const c of cities(s,f.factionId))security(s,c,1,'CRISIS');const r=s.campaignGrowth.officers[f.rulerId],ranks=r?.track.growthStates[f.rulerId].ownedTraitRanks;const card=r&&Object.values(r.cards).filter(c=>c.kind==='tactic'&&!ranks[c.traitId]).sort((a,b)=>['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'].indexOf(a.rarity)-['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC'].indexOf(b.rarity)||a.traitId.localeCompare(b.traitId))[0];if(card){ranks[card.traitId]=1;if(r.equippedTacticIds.length<3)r.equippedTacticIds.push(card.traitId);x.crisis.grantedTacticId=card.traitId;}line(s,s.playerFactionId,`위기 — 패권 견제: ${{F01:'조조',F02:'유비',F03:'손권'}[f.factionId]??f.name}에 맞서 천하가 움직인다`);x.crisis.cardQueued=false;}}
 queueCrisisCard(s);return s;
}
export function queueCrisisCard(s){const x=s.c22,fid=s.playerFactionId;if(c22Enabled(s)&&x?.crisis&&!x.crisis.cardQueued&&!x.pending[fid]){x.pending[fid]={eventId:'CRISIS_HEGEMONY',turn:s.turn,...(s.cities[s.factions[fid].capitalCityId]?.ownerFactionId===fid?{cityId:s.factions[fid].capitalCityId}:{})};x.crisis.cardQueued=true;}}
export function campaignEventsView(s,fid=s.playerFactionId){const x=s.c22;if(!c22Enabled(s)||!x)return {};const p=x.pending[fid],e=p&&definition(s,fid,p);return {pendingEvent:p?{eventId:e.eventId,title:e.title,scale:e.scale,text:e.text,...(p.cityId?{cityName:s.cityDisplayNames?.[p.cityId]??s.cities[p.cityId].name}:{}),...(p.officerIds?{officerNames:p.officerIds.map(id=>s.officers[id]?.name).filter(Boolean)}:{}),choices:e.choices.map(c=>({...c,blockedReason:eventChoiceReason(s,fid,p,c.id)}))}:null,pastEvents:structuredClone(x.fired),crisis:x.crisis?{name:x.crisis.name,factionId:x.crisis.factionId,turnsLeft:Math.max(0,x.crisis.endTurn-s.turn),joined:x.crisis.joined.includes(fid)}:null};}
export const c22TargetWeight=(s,fid,targetFaction)=>c22Enabled(s)&&s.c22?.crisis&&fid!==s.c22.crisis.factionId&&targetFaction===s.c22.crisis.factionId?C22.aiWeight:0;
export function c22AttackMultiplier(s,a,targetFaction,{counter=false,reaction=false,pursuit=false}={}){if(!c22Enabled(s)||counter||reaction||pursuit)return 1;return (s.c22?.attackBonus?.armyId===a.armyId&&s.c22.attackBonus.turn===s.turn?C22.attack:1)*(s.c22?.crisis?.joined.includes(a.factionId)&&s.c22.crisis.factionId===targetFaction?C22.coalition:1);}
export function consumeC22Attack(s,id){if(s.c22?.attackBonus?.armyId===id)delete s.c22.attackBonus;}
export function validateCampaignEvents(s){
 if(!c22Enabled(s)||!s.c22)return;
 const x=s.c22,fail=()=>{throw new Error('INVALID_C22');},integer=n=>Number.isSafeInteger(n)&&n>=0;
 const turn=n=>integer(n)&&n>=1&&n<=s.turn;
 const dict=o=>o&&typeof o==='object'&&!Array.isArray(o);
 if(!Array.isArray(x.fired)||!dict(x.pending)||!dict(x.contacts)||!dict(x.captures)||!Array.isArray(x.foodBonuses)||!dict(x.startedTurns)||!(x.crisisStartedTurn===null||turn(x.crisisStartedTurn))||x.lastSettledTurn!==undefined&&!turn(x.lastSettledTurn))fail();
 const seen=new Set();
 for(const e of x.fired){
  const spec=C22_EVENTS.find(r=>r.eventId===e.eventId);
  if(!s.factions[e.factionId]||!turn(e.turn)||e.eventId!=='CRISIS_HEGEMONY'&&(!spec||spec.factionId!==e.factionId||!spec.choices.some(c=>c.id===e.choiceId))||e.eventId==='CRISIS_HEGEMONY'&&!['a','b','c'].includes(e.choiceId))fail();
  const key=e.eventId==='CRISIS_HEGEMONY'?`${e.eventId}.${e.factionId}`:e.eventId;if(seen.has(key))fail();seen.add(key);
 }
 for(const fid of Object.keys(s.factions)){const es=x.fired.filter(e=>e.factionId===fid&&e.eventId!=='CRISIS_HEGEMONY');if(es.length>C22.limit||es.some((e,i)=>i&&e.turn-es[i-1].turn<C22.gap))fail();}
 const pendingIds=new Set();
 for(const [fid,p] of Object.entries(x.pending)){
  const e=definition(s,fid,p),key=p.eventId==='CRISIS_HEGEMONY'?`${p.eventId}.${fid}`:p.eventId;
  if(!s.factions[fid]||!turn(p.turn)||!e||p.eventId!=='CRISIS_HEGEMONY'&&e.factionId!==fid||p.cityId&&!s.cities[p.cityId]||p.armyIds&&(!Array.isArray(p.armyIds)||p.armyIds.some(id=>!s.armies[id]))||p.officerIds&&(!Array.isArray(p.officerIds)||p.officerIds.some(id=>!s.officers[id]))||p.eventId==='CRISIS_HEGEMONY'&&(!x.crisis||fid!==s.playerFactionId)||seen.has(key)||pendingIds.has(p.eventId))fail();pendingIds.add(p.eventId);
 }
 for(const [fid,t] of Object.entries(x.startedTurns))if(!s.factions[fid]||!turn(t))fail();
 for(const [id,c] of Object.entries(x.contacts))if(!s.armies[id]||!turn(c.turn)||!integer(c.count)||c.count>c.turn)fail();
 for(const [id,c] of Object.entries(x.captures))if(!s.cities[id]||!s.factions[c.factionId]||!turn(c.turn))fail();
 for(const b of x.foodBonuses)if(!s.cities[b.cityId]||!s.factions[b.factionId]||!integer(b.startTurn)||b.startTurn<2||b.startTurn>s.turn+1||b.expiresTurn!==b.startTurn+C22.bonusTurns-1)fail();
 if(x.escape&&(!turn(x.escape.turn)||!s.tiles[x.escape.originTileId]||![x.escape.turn,x.escape.turn+1].includes(x.escape.eligibleTurn)))fail();
 if(x.attackBonus&&(!s.armies[x.attackBonus.armyId]||!turn(x.attackBonus.turn)))fail();
 if(x.crisis&&(!s.factions[x.crisis.factionId]||!turn(x.crisis.startTurn)||x.crisis.startTurn<C22.crisisTurn||x.crisisStartedTurn!==x.crisis.startTurn||x.crisis.endTurn!==x.crisis.startTurn+C22.duration||typeof x.crisis.cardQueued!=='boolean'||!Array.isArray(x.crisis.joined)||x.crisis.joined.some(id=>!s.factions[id]||id===x.crisis.factionId)||new Set(x.crisis.joined).size!==x.crisis.joined.length||x.crisis.grantedTacticId&&!s.campaignGrowth.officers[s.factions[x.crisis.factionId].rulerId]?.cards[x.crisis.grantedTacticId]))fail();
}

// C31 person crisis: reuse the existing served event module.
import data from '../../docs/design-data/officer-pack/person-crisis-v0.1.json' with {type:'json'};
import {c28AddCard,C28} from './campaign-career.mjs';
import {creditCampaignGrowth} from './campaign-growth.mjs';
import {domesticReserve,attractTalent} from './campaign-rule-registry.mjs';
import {adoptWanderer,researchStage,C19} from './campaign-roster.mjs';
export const C31_DATA=data;
export const c31Enabled=s=>['v2','v3'].includes(s.mapId)&&s.c31Disabled!==true;
export const c31Active=s=>c31Enabled(s)&&s.c31&&!s.c31.resolved&&s.turn<s.c31.startTurn+data.end.turns?s.c31:null;
const record=(s,id)=>s.campaignGrowth?.officers[id];
const army=(s,id)=>Object.values(s.armies).filter(a=>a.commanderId===id&&a.troopCount>0&&castleArmyActive(s,a)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];
export function c31Rivals(s,id){return Object.entries(record(s,id)?.c28?.relations??{}).filter(([key,v])=>['숙적','원수'].includes(v)&&s.officers[key]?.allegianceFactionId===s.playerFactionId&&s.officers[key]?.lifeState==='ALIVE').map(([key])=>key).sort();}
export function c31Threat(s,id){const r=record(s,id),p=data.threat;if(!r)return 0;return r.track.growthStates[id].level*p.level+(r.titles?.length??0)*p.title+(r.c31Wins??0)*p.win+(c31Rivals(s,id).length?p.rival:0)+Math.min(p.signatureUseMax,(r.c29?.uses[r.representativeId]??0)*p.signatureUse);}
export function c31Type(s,id){const r=record(s,id),titles=r?.titles??[],score=t=>titles.length?titles.filter(x=>t.titles.includes(x.id)).length:t.trace.reduce((n,k)=>n+(r?.trace?.[k]??0),0);let best=data.types[0];for(const t of data.types)if(score(t)>score(best))best=t;return best.id==='REVENGE'&&!c31Rivals(s,id).length?data.types[0]:best;}
export function c31City(s){const x=c31Active(s);if(!x)return null;const a=army(s,x.actorId);return Object.values(s.cities).filter(c=>c.ownerFactionId===x.factionId&&(c.governorId===x.actorId||a&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId))).sort((a,b)=>a.cityId.localeCompare(b.cityId))[0]??null;}
export function c31Actor(s,id,type){const x=c31Active(s);return !!x&&x.actorId===(s.armies[id]?.commanderId??id)&&(!type||x.type===type);}
export const c31Faction=(s,fid,type)=>c31Active(s)?.factionId===fid&&c31Active(s)?.type===type;
export function c31DurabilityFactor(s,c){return c31Active(s)?.type==='FORTRESS'&&c31City(s)?.cityId===c.cityId?1+data.types[1].params.durability/100:1;}
export function c31Sync(s){
 if(!s.c31)return;
 const type=data.types.find(t=>t.id===s.c31.type);if(type&&s.c31.type==='RAMPAGE'){s.c31.effects=structuredClone(crisisEffects(type));s.c31.warnText=crisisAdvice;}
 for(const [id,r] of Object.entries(s.campaignGrowth?.officers??{}))if(r.c29){if(c31Actor(s,id,'RAMPAGE')){if(r.c31GaugeBase===undefined)r.c31GaugeBase=r.c29.crisisMultiplier;r.c29.crisisMultiplier=r.c31GaugeBase*data.types[0].params.gauge;}else if(r.c31GaugeBase!==undefined){r.c29.crisisMultiplier=r.c31GaugeBase;delete r.c31GaugeBase;}}
 for(const c of Object.values(s.cities)){const factor=c31DurabilityFactor(s,c),base=['v2','v3'].includes(s.mapId)?(c.kind==='minor'?60:100)+(researchStage(s,c.ownerFactionId)>=2?C19.wallBonus:0):c.durabilityMax;if(factor!==1){c.c31DurabilityBase=base;c.durabilityMax=Math.round(base*factor);}else if(c.c31DurabilityBase!==undefined){c.durabilityMax=c.c31DurabilityBase;delete c.c31DurabilityBase;}c.durability=Math.min(c.durability,c.durabilityMax);}
}
export function c31DamageFactor(s,a,t,{counter=false}={}){let f=1;const x=c31Active(s);if(!x)return f;const p=data.types.find(t=>t.id===x.type).params;if(c31Actor(s,a.armyId,'REVENGE')&&t.factionId===s.playerFactionId)f*=1+p.damage/100;if(x.type==='FORTRESS'){const c=c31City(s);if(c&&t.factionId===x.factionId&&hexDistance(s.tiles[c.tileId],s.tiles[t.tileId])<=p.range)f*=1-p.aura/100;if(c&&counter&&a.factionId===x.factionId&&[c.tileId,...(c.footprint?.gates??[])].includes(a.tileId))f*=1+p.counter/100;}return f;}
export const c31CityCounter=(s,c)=>c31Active(s)?.type==='FORTRESS'&&c31City(s)?.cityId===c.cityId?1+data.types[1].params.counter/100:1;
export const c31Move=(s,id)=>0;
export const c31IgnoreControlZone=(s,id)=>C182.crisis.ignoreControlZone&&c31Actor(s,id,'RAMPAGE');
const crisisEffects=t=>t.id==='RAMPAGE'?{...Object.fromEntries(Object.entries(t.params).filter(([k])=>!['damage','move'].includes(k))),ignoreControlZone:C182.crisis.ignoreControlZone}:t.params;
const crisisAdvice='통제 구역에 멈추지 않음 · 대응: 빈 길을 부대로 막거나 집중 공격';
export const c31Production=(s,fid)=>c31Faction(s,fid,'PROSPERITY')?1+data.types[4].params.production/100:1;
export const c31Muster=(s,fid)=>c31Faction(s,fid,'PROSPERITY')?data.types[4].params.muster:1;
export const c31RecruitCost=(s,fid,cost)=>c31Faction(s,fid,'TALENT')?Math.ceil(cost*(1-data.types[5].params.recruitCost/100)):cost;
export function c31Tactic(s,id,card){if(!c31Actor(s,id,'WEB'))return card;const p=data.types[3].params,c=structuredClone(card);c.cooldown=Math.max(c.signature?0:1,(c.cooldown??2)-p.cooldown);if([c.classTag,c.tags].flat().includes('지략'))c.range=(c.range??0)+p.range;for(const e of c.effects??[])if(e.op==='STATUS_APPLY'){e.duration=(e.duration??1)+p.duration;e.c31Extension=p.duration;}return c;}
export function finishC31(s,reason,winnerId=null,winnerArmyId=null){const x=s.c31;if(!x||x.resolved)return;x.resolved=reason;x.turnsLeft=0;x.endTurn=s.turn;
 if(winnerArmyId&&s.officers[winnerId]?.allegianceFactionId===s.playerFactionId)x.resolverArmyId=winnerArmyId;
 if(['ROUTED','ELIMINATED','CAPTURED'].includes(reason)&&winnerId)rivalEvent(s,'crisisDefeat',winnerId,x.actorId);
 if(reason==='TIMEOUT')s.factions[x.factionId].prestige+=data.end.timeoutFame;
 else if(winnerId&&s.officers[winnerId]?.allegianceFactionId===s.playerFactionId){x.resolverId=winnerId;s.factions[s.playerFactionId].prestige+=data.reward.fame;const r=record(s,winnerId),actorName=s.officers[x.actorId].name,name=`${actorName}${(actorName.charCodeAt(actorName.length-1)-0xac00)%28?'을':'를'} 꺾은 자`,key=c28AddCard(r,{id:`conqueror.${x.actorId}`,kind:'trait',name,rarity:'EPIC',effects:[{op:'DAMAGE_MOD',when:'ON_ATTACK',target:'SELF',value:C28.conquerorDamage,condition:'TARGET_TITLED'}]},name),ranks=r.track.growthStates[winnerId].ownedTraitRanks;
  if(!ranks[key]){ranks[key]=1;r.c27RewardReserveIds??=[];if(Object.keys(ranks).filter(k=>r.cards[k]?.kind==='trait').length>5&&!r.c27RewardReserveIds.includes(key))r.c27RewardReserveIds.push(key);}creditCampaignGrowth(s,{officerId:winnerId,eventId:`C31.${x.startTurn}.${x.actorId}.reward`,kind:'KILL',amount:data.reward.xp,fixed:true});}
 for(const a of Object.values(s.armies)){if(a.c27)delete a.c27.c31RootUntil;for(const e of a.effectStates??[])if(e.c31Extension){e.expiresTurn-=e.c31Extension;delete e.c31Extension;}}
 c31Sync(s);s.c31History??=[];s.c31History.push(structuredClone(x));
}
export function settleC31(s){if(!c31Enabled(s))return s;c31Sync(s);const x=s.c31,wasActive=x&&!x.resolved;
 const ids=c31Candidates(s);s.c31Threats=Object.fromEntries(ids.map(id=>[id,c31Threat(s,id)]));
 if(x&&!x.resolved){const o=s.officers[x.actorId],a=army(s,x.actorId);if(['CAPTURED','PRISONER'].includes(o?.captivityState))finishC31(s,'CAPTURED');else if(x.armyId&&!a)finishC31(s,'ELIMINATED');else if(a?.morale==='ROUTING')finishC31(s,'ROUTED');else if(s.turn>=x.startTurn+data.end.turns)finishC31(s,'TIMEOUT');else {x.turnsLeft=x.startTurn+data.end.turns-s.turn;const p=data.types.find(t=>t.id===x.type).params,elapsed=s.turn-x.startTurn;if(p.every&&elapsed>0&&elapsed%p.every===0&&x.lastPeriodicTurn!==s.turn){x.lastPeriodicTurn=s.turn;const c=c31City(s);if(c&&x.type==='PROSPERITY')domesticReserve(s,c,p.reserve);if(c&&x.type==='TALENT'){const before=new Set(Object.keys(s.wanderers));attractTalent(s,c,{id:x.actorId,rule:'TALENT_MAGNET',params:{},card:{name:x.name}});const id=Object.keys(s.wanderers).find(id=>!before.has(id));if(id)adoptWanderer(s,{targetOfficerId:id,factionId:x.factionId,candidateSourceRef:c.cityId,proposalId:`C31.${s.turn}.${id}`});}}}}
 if(wasActive&&x.resolved)return s;
 if(!s.gameResult&&!c31Active(s)&&s.turn>=data.activation.fromTurn&&26-s.turn+1>=data.end.turns){const id=ids.find(id=>![s.c31,...(s.c31History??[])].some(x=>x?.actorId===id&&x.resolved&&s.turn-(x.endTurn??x.startTurn+data.end.turns)<6));if(id&&c31Threat(s,id)>=data.activation.minThreat){const t=c31Type(s,id),o=s.officers[id],a=army(s,id),target=Object.values(s.cities).filter(c=>c.ownerFactionId===s.playerFactionId).sort((b,c)=>hexDistance(s.tiles[a?.tileId??o.locationRef.id]??s.tiles[Object.values(s.cities).find(c=>c.governorId===id)?.tileId],s.tiles[b.tileId])-hexDistance(s.tiles[a?.tileId??o.locationRef.id]??s.tiles[Object.values(s.cities).find(c=>c.governorId===id)?.tileId],s.tiles[c.tileId])||b.cityId.localeCompare(c.cityId))[0];s.c31={actorId:id,type:t.id,name:t.name,startTurn:s.turn,turnsLeft:data.end.turns,warnText:t.warn.replace('{actor}',o.name).replace('{target}',target?.name??'플레이어 성').replace('{rival}',s.officers[c31Rivals(s,id)[0]]?.name??'숙적').replace('{faction}',s.factions[o.allegianceFactionId].name),effects:structuredClone(crisisEffects(t)),resolved:false,factionId:o.allegianceFactionId,armyId:a?.armyId??null,rivalId:c31Rivals(s,id)[0]??null};c31Sync(s);}}
 return s;}
export function c31Combat(s,c){if(!c31Enabled(s))return;s.c31CombatEvents??={};const seen=s.c31CombatEvents[c.sequence];s.c31CombatEvents[c.sequence]=true;const a=s.armies[c.attackerId],t=s.armies[c.targetId];if(!seen&&a&&t&&a.factionId!==t.factionId&&c.enemyLoss!==c.allyLoss){const w=c.enemyLoss>c.allyLoss?a:t;if(w.troopCount>0&&w.morale!=='ROUTING')record(s,w.commanderId).c31Wins=(record(s,w.commanderId).c31Wins??0)+1;}
 const x=c31Active(s);if(!x)return;const actor=s.armies[x.armyId]??Object.values(s.armies).find(a=>a.commanderId===x.actorId&&(c.units??[]).some(u=>u.unitId===a.armyId)),victim=actor&&((c.units??[]).some(u=>u.unitId===actor.armyId&&u.postBattleCount===0)||(c.moraleChanges??[]).some(e=>e.armyId===actor.armyId&&e.to==='ROUTING'));if(victim||['CAPTURED','PRISONER'].includes(s.officers[x.actorId].captivityState)){
  const source=(c.damageSources??[]).filter(row=>row.targetId===actor?.armyId).at(-1);
  const winner=source?s.armies[source.armyId]:c.kind==='CITY_STRIKE'?null:actor?.armyId===c.attackerId?t:a;
  finishC31(s,['CAPTURED','PRISONER'].includes(s.officers[x.actorId].captivityState)?'CAPTURED':actor?.troopCount===0?'ELIMINATED':'ROUTED',source?.commanderId??winner?.commanderId,winner?.armyId);
 }
 else if(x.type==='REVENGE'&&a?.commanderId===x.actorId&&t?.commanderId===x.rivalId&&(c.moraleChanges??[]).some(e=>e.armyId===t.armyId&&e.to==='ROUTING')){a.morale='STEADY';}
}
export function c31View(s,projected){if(!s.c31||!c31Enabled(s))return;const {actorId,type,name,startTurn,turnsLeft,warnText,effects,resolved}=s.c31;projected.c31=structuredClone({actorId,type,name,startTurn,turnsLeft,warnText:type==='RAMPAGE'?crisisAdvice:warnText,effects:type==='RAMPAGE'?crisisEffects(data.types[0]):effects,resolved});for(const a of Object.values({...projected.ownArmies,...projected.knowledge.observedArmies}))if(!resolved&&a.commanderId===actorId&&projected.knowledge.tiles[a.tileId]==='VISIBLE')a.crisis=type;}
export function validateC31(s){const fail=()=>{throw new Error('INVALID_C31');};if(s.c31Disabled!==undefined&&typeof s.c31Disabled!=='boolean')fail();if(!c31Enabled(s)&&s.c31)fail();for(const r of Object.values(s.campaignGrowth?.officers??{}))if(r.c31Wins!==undefined&&(!Number.isSafeInteger(r.c31Wins)||r.c31Wins<0))fail();for(const x of [s.c31,...(s.c31History??[])].filter(Boolean)){const t=data.types.find(t=>t.id===x.type);if(!t||!s.officers[x.actorId]||!s.factions[x.factionId]||x.factionId===s.playerFactionId||!Number.isSafeInteger(x.startTurn)||x.startTurn<data.activation.fromTurn||x.startTurn>s.turn||!Number.isSafeInteger(x.turnsLeft)||x.turnsLeft<0||x.turnsLeft>data.end.turns||x.name!==t.name||JSON.stringify(x.effects)!==JSON.stringify(crisisEffects(t))&&JSON.stringify(x.effects)!==JSON.stringify(t.params)||typeof x.warnText!=='string'||/[{}]/.test(x.warnText)||![false,'TIMEOUT','CAPTURED','ELIMINATED','ROUTED'].includes(x.resolved)||x.resolved&&x.turnsLeft!==0)fail();}if(c31Enabled(s)&&s.c22?.crisis)fail();}

export function c31ExtendStatuses(s,before,id){
 if(!c31Actor(before,id,'WEB')||!c31Active(s))return;
 for(const a of Object.values(s.armies)){
  const old=before.armies[a.armyId],states=new Set((old?.effectStates??[]).map(e=>JSON.stringify(e)));
  if(a.factionId===s.armies[id].factionId)continue;
  for(const e of a.effectStates??[])if(e.status&&!e.c31Extension&&!states.has(JSON.stringify(e))){e.expiresTurn++;e.c31Extension=1;}
  if(a.c27?.rootTurn!==undefined&&a.c27.rootTurn!==old?.c27?.rootTurn)a.c27.c31RootUntil=a.c27.rootTurn+1;
 }
}

export function c31Candidates(s){return Object.values(s.officers).filter(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.allegianceFactionId&&o.allegianceFactionId!==s.playerFactionId&&s.factions[o.allegianceFactionId]?.alive&&(army(s,o.officerId)?.morale!=='ROUTING')&&(army(s,o.officerId)||Object.values(s.cities).some(c=>c.governorId===o.officerId&&c.ownerFactionId===o.allegianceFactionId))).map(o=>o.officerId).sort((a,b)=>c31Threat(s,b)-c31Threat(s,a)||a.localeCompare(b));}
