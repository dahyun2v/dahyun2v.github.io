import {sample4Separated,sample4Execute,sample4CleanSeparation} from './campaign-rule-registry.mjs';
import data from '../../docs/design-data/officer-pack/engines-v1.0.json' with {type:'json'};
import assignments from '../../docs/design-data/officer-pack/engine-assignment-v1.0.json' with {type:'json'};
import {troopToCampaign} from './campaign-adapters.mjs';
import {boardNeighbors,tileId,hexDistance} from './map-primitives.mjs';
import {canObserveTile} from './knowledge.mjs';

export const ENGINES=Object.freeze(data.engines);
const definitions=new Map(ENGINES.map(e=>[e.id,e]));
const assigned=new Map(assignments.assignments.map(o=>[o.id,o.engine]));
// Historical c37 switch now disables the engine foundation, including migration.
export const enginesEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c37Disabled!==true;
export const officerEngine=(s,id)=>enginesEnabled(s)?assigned.get(id)??null:null;
const maxResource=(s,id)=>s.campaignGrowth?.officers[id]?.c50?.path==='BASE'?data.common.baseKeepMax:data.common.resourceMax;
export function armyEngine(s,id){
 const a=s.armies[id];if(!a||!enginesEnabled(s))return null;
 // Public AI commanders have synthetic IDs; their copied engine ID is authoritative.
 const engineId=a.c50CommanderId===a.commanderId?a.c50?.engineId:officerEngine(s,a.commanderId);
 if(!definitions.has(engineId))return null;
 return {engineId,archer:troopToCampaign(a.troopType)==='BT03'&&!!definitions.get(engineId).archerVariant,resource:a.c50CommanderId===a.commanderId?a.c50?.resource??0:0,max:a.commanderId.startsWith('AI.PUBLIC.')?(a.c50?.max??3):maxResource(s,a.commanderId),path:s.campaignGrowth?.officers[a.commanderId]?.c50?.path??a.c50?.path??null};
}
export function initializeOfficerEngine(s,id){
 const r=s.campaignGrowth?.officers[id];if(!r||!enginesEnabled(s))return;
 const engineId=officerEngine(s,id);
 if(r.c50&&r.c50.path===undefined)r.c50.path=null;
 if(r.c50Version!==1){r.c50??={engineId,path:null,merits:{},meritKeys:{}};r.c50Version=1;}
}
export function initializeEngines(s){
 if(!enginesEnabled(s))return s;
 s.c50??={finishedTurns:{}};
 for(const id of Object.keys(s.campaignGrowth?.officers??{}))initializeOfficerEngine(s,id);
 for(const a of Object.values(s.armies)){
  if(!a.c50||a.c50CommanderId!==a.commanderId){
   const engineId=officerEngine(s,a.commanderId);
   // C242: new field armies (also a deployed commander replacement) start ready.
   // Existing engine state is left alone: events and load must not refill it.
   const resource=active(s,a)&&definitions.has(engineId)&&!['TU','CHEOK'].includes(engineId)?2:0;
   a.c50={engineId,resource,reservations:{},relation:null};a.c50CommanderId=a.commanderId;
  }
 }
 return s;
}
const judgments={MAENG:'지금 터뜨릴까, 더 싸워 키울까',GANG:'어느 쪽으로 받을까, 언제 되받을까',HOWI:'누구를 지킬까, 언제 내가 버틸까',TU:'끝까지 붙들까, 놓아줄까',JANGGUN:'싸우며 영을 지킬까, 물러설까',CHAEK:'기다릴까, 지금 예고할까',CHUKSEONG:'지금 지을까, 전진할까',CHEOK:'숨어 기다릴까, 지금 드러낼까',JEONNONG:'누구에게 · 어디에 · 얼마나',GUKSA:'지킬까, 터뜨릴까'};
export function engineView(s,id,armyId=null,viewer=null){
 const engine=armyId?armyEngine(s,armyId):null,engineId=engine?.engineId??officerEngine(s,id),d=definitions.get(engineId);if(!d)return null;
 const archer=engine?.archer??(troopToCampaign(s.officers[id]?.troopType??s.officers[id]?.allowedTroops?.[0]??'militia')==='BT03'&&!!d.archerVariant);
 const path=s.campaignGrowth?.officers[id]?.c50?.path,branch=d.branches.find(b=>b.id===path);
 return {path:path??null,branchName:branch?.name??(path==='BASE'?'기본 유지':null),engineId,name:d.name+(archer?`(${d.archerVariant})`:'')+(branch?` · ${branch.name}`:path==='BASE'?' · 기본 유지':''),resourceName:d.resource,resource:engine?.resource??0,max:engine?.max??maxResource(s,id),merits:d.branches.map(b=>({id:b.id,name:b.name,count:s.campaignGrowth?.officers[id]?.c50?.merits[b.id]??0,goal:data.common.meritToUnlock})),statuses:armyId?engineStatuses(s,armyId,viewer):[],judgment:archer&&engineId==='GANG'?'어느 방향을 지키며 모으고, 언제 응사로 쓸까':judgments[engineId]};
}
export function publicArmyEngine(s,id,viewer=null){
 const a=s.armies[id],e=armyEngine(s,id);if(!e)return null;
 const x=a.c50??{resource:0,reservations:{},relation:null},details={};for(const [key,r] of Object.entries(x.reservations??{}))if(['COUNTER','BLOCK','PIN'].includes(key)&&r&&typeof r==='object')details[key]={...(Number.isInteger(r.n)?{n:r.n}:{}),...(Number.isInteger(r.facing)?{facing:r.facing}:{}),...(r.targetId&&(!viewer||s.knowledge[viewer]?.tiles[s.armies[r.targetId]?.tileId]==='VISIBLE')?{targetId:r.targetId}:{})};
 const target=validRelation(s,a),relation=target&&(!viewer||target.factionId===viewer||s.knowledge[viewer]?.tiles[target.tileId]==='VISIBLE'&&!engineApi.hidden?.(s,target.armyId,viewer))?{type:x.relation.type,targetId:target.armyId,pursued:!!x.relation.pursued}:null;
 const branchState={};for(const key of ['frenzy','flag','passage','depot'])if(x[key]){branchState[key]=structuredClone(x[key]);if(key==='depot')delete branchState[key].recipients;}
 for(const key of ['grudge','trust']){const target=typeof x[key]==='string'?x[key]:x[key]?.targetId;if(target&&(!viewer||s.armies[target]?.factionId===viewer||s.knowledge[viewer]?.tiles[s.armies[target]?.tileId]==='VISIBLE'&&!engineApi.hidden?.(s,target,viewer)))branchState[key]=structuredClone(x[key]);}
 for(const key of ['direct','persuaded'])if(x[key])branchState[key]=Object.fromEntries(Object.entries(x[key]).filter(([k])=>k!=='sourceId'));
 if(!viewer||viewer===a.factionId){if(x.evacuation)branchState.evacuation=structuredClone(x.evacuation);if(x.sharedHide)branchState.sharedHide=x.sharedHide;}
 return {engineId:e.engineId,path:e.path,...branchState,resource:e.resource,max:e.max,reservations:Object.keys(x.reservations??{}).filter(k=>!viewer||viewer===a.factionId||k!=='RETURN_FIRE'),...(Object.keys(details).length?{reservationDetails:details}:{}),...(relation?{relation}:{}),...(e.engineId==='JANGGUN'?{order:orderOf(a)}:{})};
}
// Observer is an ephemeral test seam, never saved.
let observer=null;
export function configureEngineEvents(fn=null){observer=fn;}
export function engineEvent(s,type,payload){if(['ARRIVE','FORCED_MOVE'].includes(type))sample4CleanSeparation(s);if(enginesEnabled(s)){if(s.c50)initializeEngines(s);
 if(type==='FACTION_START')for(const a of live(s).filter(a=>a.factionId===payload.factionId))delete a.c50.contact;
 if(['FACTION_START','FACTION_END','MOVE_LEAVE','ARRIVE','FORCED_MOVE','ATTACK_DECLARE'].includes(type))recordEngineContact(s,s,payload.factionId);
 handleEngineEvent(s,type,payload);cleanSharedHide(s);observer?.(s,type,payload);}}
export function finishEngineFaction(s,factionId){
 if(!enginesEnabled(s)||s.campaignEffects?.startedTurns[factionId]!==s.turn)return;
 initializeEngines(s);if(s.c50.finishedTurns[factionId]===s.turn)return;
 s.c50.finishedTurns[factionId]=s.turn;engineEvent(s,'FACTION_END',{factionId});
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=()=>{throw new Error('INVALID_CAMPAIGN_ENGINE_STATE');};
export function validateOfficerEngine(s,id){
 if(!enginesEnabled(s))return;const r=s.campaignGrowth.officers[id],x=r.c50,engineId=officerEngine(s,id),d=definitions.get(engineId);
 if(r.c50Version!==1||!object(x)||x.engineId!==engineId||x.path!==null&&x.path!=='BASE'&&!d?.branches.some(b=>b.id===x.path)||!object(x.merits)||!object(x.meritKeys))fail();
 if(x.promotion&&(!object(x.promotion)||x.path!==null||!Number.isSafeInteger(x.promotion.level)||x.promotion.level<1||x.promotion.level===1&&s.turn<meritGuaranteeTurn||!Array.isArray(x.promotion.branches)||new Set(x.promotion.branches).size!==x.promotion.branches.length||x.promotion.branches.some(key=>!d?.branches.some(b=>b.id===key)||(x.merits[key]??0)<data.common.meritToUnlock&&s.turn<meritGuaranteeTurn)))fail();
 for(const [branch,n] of Object.entries(x.merits))if(!d?.branches.some(b=>b.id===branch)||!Number.isSafeInteger(n)||n<0)fail();
 if(x.promotionOffered!==undefined&&typeof x.promotionOffered!=='boolean')fail();
 for(const [branch,keys] of Object.entries(x.meritKeys))if(!d?.branches.some(b=>b.id===branch)||!object(keys)||Object.values(keys).some(v=>v!==true))fail();
}
export function validateEngines(s){
 if(!enginesEnabled(s))return;
 if(!object(s.c50)||!object(s.c50.finishedTurns))fail();
 if(s.c50.structures!==undefined){
  if(!Array.isArray(s.c50.structures)||new Set(s.c50.structures.map(o=>o.id)).size!==s.c50.structures.length)fail();
  const unique=new Set();for(const o of s.c50.structures){const key=`${o.sourceId}:${o.type}`;
   if(!object(o)||!s.armies[o.sourceId]||!s.factions[o.factionId]||!s.tiles[o.tileId]||!['PALISADE','CAMP','BRIDGE','CART'].includes(o.type)||!Number.isSafeInteger(o.hp)||o.hp<1||o.hp>o.maxHp||!Number.isSafeInteger(o.maxHp)||!Number.isSafeInteger(o.n)||o.n<1||o.n>4||typeof o.spend!=='string'||unique.has(key)||o.type==='CART'&&(!Number.isSafeInteger(o.expires)||typeof o.onSupply!=='boolean'))fail();unique.add(key);
  }
 }
 for(const [f,t] of Object.entries(s.c50.finishedTurns))if(!s.factions[f]||!Number.isSafeInteger(t)||t<1||t>s.turn)fail();
 for(const a of Object.values(s.armies)){
  const x=a.c50;if(!object(x)||a.c50CommanderId!==a.commanderId||x.engineId!==officerEngine(s,a.commanderId)||!Number.isSafeInteger(x.resource)||x.resource<0||x.resource>maxResource(s,a.commanderId)||!object(x.reservations)||x.relation!==null&&!object(x.relation))fail();
  validatePromotionArmy(s,a);
  for(const key of ['hidden','hiddenAttack','rooted','rootNext','supplyLinked','contact'])if(x[key]!==undefined&&typeof x[key]!=='boolean')fail();
  if(x.warning&&(!object(x.warning)||!s.tiles[x.warning.tileId]||!Array.isArray(x.warning.tiles)||x.warning.tiles.some(at=>!s.tiles[at])||!Number.isSafeInteger(x.warning.n)||x.warning.n<1||x.warning.n>4||!['WARN_FIRE','WARN_ROOT','WARN_MORALE'].includes(x.warning.action)||!Number.isSafeInteger(x.warning.turn)||typeof x.warning.spend!=='string'))fail();
  if(x.mark&&(!s.armies[x.mark.targetId]||!Number.isSafeInteger(x.mark.expires)||typeof x.mark.spend!=='string'))fail();
  const r=x.reservations.RETURN_FIRE;if(r&&(!object(r)||!Number.isSafeInteger(r.n)||r.n<1||r.n>4||!Number.isSafeInteger(r.facing)||r.facing<0||r.facing>5||!Number.isSafeInteger(r.turn)||typeof r.spend!=='string'))fail();
 }
}
// Deliberately confined to deserialization: current corrupt engine state must fail validation.
export function discardLegacyClasses(s){
 delete s.c37;
 for(const a of Object.values(s.armies))delete a.classState;
 for(const o of Object.values(s.occupations??{}))delete o.classRetention;
 for(const list of Object.values(s.knowledge??{}))for(const rows of [list.observedArmies,list.lastSeenArmies])for(const a of Object.values(rows??{}))delete a.classState;
 for(const o of Object.values(s.officers))delete o.classDisabled;
 for(const key of ['c27','c32'])for(const f of s[key]?.fires??[])delete f.classStop;
}

// C231. Runtime services are injected, so morale/combat hooks have no import cycle.
let engineApi={};
export function configureEngines(api){engineApi=api;}
const params=id=>definitions.get(id).params;
const active=(s,a)=>!!a&&a.hp>0&&a.troopCount>0&&(engineApi.active?.(s,a)??true);
const distance=(s,a,b)=>a&&b&&s.tiles[a.tileId]&&s.tiles[b.tileId]?hexDistance(s.tiles[a.tileId],s.tiles[b.tileId]):Infinity;
const friendly=(a,b)=>a.factionId===b.factionId;
const hostile=(s,a,b)=>engineApi.hostile?.(s,a.armyId,b.armyId)??!friendly(a,b);
const live=s=>Object.values(s.armies).filter(a=>active(s,a));
const usable=(s,a)=>active(s,a)&&a.morale!=='ROUTING'&&a.formation!=='BROKEN'&&!(a.c32?.stunUntil>=s.turn)&&!(a.c27?.stunUntil>=s.turn);
const kind=(s,a,id)=>!!a?.c50&&a.c50CommanderId===a.commanderId&&armyEngine(s,a.armyId)?.engineId===id;
const melee=(s,a)=>!armyEngine(s,a.armyId)?.archer;
const gain=(s,a,n=1)=>{a.c50.resource=Math.max(0,Math.min(armyEngine(s,a.armyId).max,a.c50.resource+n));};
function once(s,a,key){a.c50.periodKeys??={};if(a.c50.periodKeys[key])return false;a.c50.periodKeys[key]=true;return true;}
const hasMoved=(s,a)=>a.ruleMovedTurn===s.turn||(a.movedTiles??0)>0;
const firstAttack=(s,a)=>a.c50?.attackTurn!==s.turn;
const orderOf=a=>a.c50?.order??'ADVANCE';
function directTargets(s,g){return live(s).filter(a=>a.armyId!==g.armyId&&friendly(a,g)&&!sample4Separated(s,g.armyId,a.armyId)&&distance(s,g,a)<=(g.c50.resource>=3?3:2));}
export function engineOrderRecipients(s,id){
 const g=s.armies[id];if(!g||!active(s,g)||!kind(s,g,'JANGGUN'))return [];
 const recipients=new Set((branched(s,g,'DOKJEON')?(g.c50.resource>0?directTargets(s,g):[]):g.morale==='STEADY'?orderTargets(s,g):[]).map(a=>a.armyId));
 for(const a of live(s))if(a.armyId!==id&&friendly(a,g)&&!sample4Separated(s,id,a.armyId)&&(a.c50?.direct?.sourceId===id&&a.c50.direct.expires>=s.turn||a.c50?.lastOrders?.some(o=>o.sourceId===id&&o.expires>=s.turn)))recipients.add(a.armyId);
 return [...recipients].sort();
}
function orderTargets(s,g){if(branched(s,g,'DOKJEON')||branched(s,g,'GUNGI')&&!g.c50.flag)return [];const origin=g.c50.flag?{...g,tileId:g.c50.flag}:g;return live(s).filter(a=>a.armyId!==g.armyId&&!sample4Separated(s,g.armyId,a.armyId)&&friendly(a,g)&&distance(s,a,origin)<=(g.c50.resource>=3?params('JANGGUN').rangeAt3:params('JANGGUN').range)).sort((a,b)=>distance(s,a,origin)-distance(s,b,origin)||a.troopCount-b.troopCount||a.armyId.localeCompare(b.armyId)).slice(0,g.c50.resource);}
function auraRange(a){return a.c50.resource>=2?params('GUKSA').auraRangeAt2:params('GUKSA').auraRange;}
function validRelation(s,a){
 const r=a.c50?.relation,t=s.armies[r?.targetId];if(!r)return null;
 const invalid=!active(s,t)||a.morale==='ROUTING'||t.morale==='ROUTING'||r.type==='LINK'&&(a.formation==='BROKEN'||distance(s,a,t)>params('HOWI').linkRange);
 return invalid?null:t;
}
function cleanRelations(s){for(const a of Object.values(s.armies)){if(a.c50?.relation&&!validRelation(s,a)){a.c50.relation=null;if(kind(s,a,'TU'))a.c50.resource=0;delete a.c50.reservations.BLOCK;}if(a.c50?.reservations.COUNTER&&!usable(s,a))delete a.c50.reservations.COUNTER;if(a.c50?.reservations.RETURN_FIRE&&!usable(s,a))delete a.c50.reservations.RETURN_FIRE;if(a.c50?.warning&&!usable(s,a))delete a.c50.warning;if(a.c50?.reservations.PIN&&(!usable(s,a)||validRelation(s,a)?.armyId!==a.c50.reservations.PIN.targetId))delete a.c50.reservations.PIN;}}
function merit(s,a,branch,targetId,spend){
 const r=s.campaignGrowth?.officers[a.commanderId]?.c50;if(!r||r.path)return;
 const id=`${a.c50.engineId}.${branch}`;r.meritKeys[id]??={};
 // Both the benefit recipient and expenditure are unique within this branch.
 if(r.meritKeys[id][targetId]||r.meritKeys[id][`spend:${spend}`])return;
 r.meritKeys[id][targetId]=true;r.meritKeys[id][`spend:${spend}`]=true;r.merits[id]=(r.merits[id]??0)+1;
}
export function engineActions(s,id){
 const a=s.armies[id],e=armyEngine(s,id);if(!e)return [];
 const names={CHAEK:[['WARN_FIRE','예고 · 화공'],['WARN_ROOT','예고 · 이동 봉쇄'],['WARN_MORALE','예고 · 사기 교란']],CHUKSEONG:[['PALISADE','목책 공사'],['CAMP','진지 공사'],['BRIDGE','다리 공사'],['CHIP','깎기']],CHEOK:[['STEALTH','잠행'],['SCOUT','정탐']],JEONNONG:[['CART','수레']],MAENG:[['FLURRY','연타']],GANG:[['COUNTER','반격 자세']],HOWI:[['LINK','연결 바꾸기'],['BLOCK','막기']],TU:[['RIVAL','맞수 지정'],['STRIKE','투지 치기']],JANGGUN:[['ORDER','영 바꾸기']],GUKSA:[['RELEASE','해방']]};
 if(e.archer&&e.engineId==='GANG')names.GANG=[['RETURN_FIRE','응사']];
 return [...(names[e.engineId]??[]).filter(([action])=>branchAllows(s,a,action)),...(branchActions[pathOf(s,a)?.split('.')[1]]??[])].map(([action,name])=>({action,name,...engineActionAvailability(s,id,action)}));
}
export function engineActionAvailability(s,id,action){
 const a=s.armies[id],e=armyEngine(s,id);if(promotionActions.has(action))return promotionAvailability(s,id,action);if(!branchAllows(s,a,action))return {canUse:false,reasonCode:'SEALED_ENGINE_ACTION',reasonText:'전직으로 봉인된 행동입니다',targets:[]};if(mapActions.has(action))return mapActionAvailability(s,id,action);let reasonCode='',reasonText='',targets=[];
 const fail=(code,text)=>{reasonCode=code;reasonText=text;};
 if(engineAttackBlocked(s,id)&&['FLURRY','STRIKE'].includes(action))fail('ENGINE_PERSUADED','설득되어 공격할 수 없습니다');
 else if(!s.c50||!e)fail('ENGINE_UNAVAILABLE','이 부대에는 이 계통 행동이 없습니다');
 else if(!active(s,a)||a.morale==='ROUTING')fail('ROUTING','패주 · 소멸 부대는 행동할 수 없습니다');
 else if(!engineApi.canAct(s,id))fail('MAIN_ACTION_USED','이번 차례 주 행동을 마쳤습니다');
 else {
  const allies=live(s).filter(b=>friendly(a,b)),foes=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b));
  const expected={FLURRY:'MAENG',COUNTER:'GANG',LINK:'HOWI',BLOCK:'HOWI',RIVAL:'TU',STRIKE:'TU',ORDER:'JANGGUN',RELEASE:'GUKSA'};
  if(expected[action]!==e.engineId||e.archer&&action==='COUNTER')fail('INVALID_ENGINE_ACTION','계통에 맞는 행동을 고르세요');
  else if(!['LINK','RIVAL'].includes(action)&&e.resource<1)fail('ENGINE_RESOURCE','계통 자원이 부족합니다');
  else if(action==='FLURRY')targets=engineApi.targets(s,id).filter(t=>(!e.archer||engineShotLegal(s,id,t)));
  else if(action==='COUNTER'){if(a.formation==='BROKEN'||!usable(s,a))fail('ENGINE_DISABLED','붕괴 · 기절 중에는 반격 자세를 잡을 수 없습니다');else targets=[id];}
  else if(action==='LINK'&&a.formation==='BROKEN')fail('ENGINE_DISABLED','BROKEN');
  else if(action==='LINK')targets=allies.filter(b=>b.armyId!==id&&b.morale!=='ROUTING'&&distance(s,a,b)<=params('HOWI').linkRange).map(b=>b.armyId);
  else if(action==='BLOCK'){const t=validRelation(s,a);targets=t?[t.armyId]:[];}
  else if(action==='RIVAL')targets=foes.filter(b=>(e.archer?engineShotLegal(s,id,b.armyId):distance(s,a,b)===1)&&b.morale!=='ROUTING').map(b=>b.armyId);
  else if(action==='STRIKE'){const t=validRelation(s,a);targets=t&&engineApi.targets(s,id).includes(t.armyId)?[t.armyId]:[];}
  else if(action==='ORDER')targets=[id];
  else if(action==='RELEASE')targets=allies.filter(b=>distance(s,a,b)<=auraRange(a)&&b.morale!=='STEADY').map(b=>b.armyId);
  if(!reasonCode&&!targets.length)fail('NO_ENGINE_TARGET','지금 사용할 수 있는 대상이 없습니다');
 }
 return {reasonCode,reasonText,canUse:!reasonCode,targets};
}
export function resolveEngineAction(state,id,action,targetId,options={}){
 if(promotionActions.has(action))return resolvePromotionAction(state,id,action,targetId,options);
 if(!branchAllows(state,state.armies[id],action))throw new Error('SEALED_ENGINE_ACTION');
 if(mapActions.has(action))return resolveMapAction(state,id,action,targetId,options);
 const av=engineActionAvailability(state,id,action);if(!av.canUse)throw new Error(av.reasonCode);
 targetId??=av.targets.length===1?av.targets[0]:null;if(!av.targets.includes(targetId))throw new Error('INVALID_ENGINE_TARGET');
 let s=structuredClone(state),a=s.armies[id],x=a.c50,n=x.resource;
 const spend=`${s.turn}:${id}:${s.battleSequence}:${a.mainActionCount??0}:${action}`;
 cleanRelations(s);s.c50.context={attackerId:id,origin:spend};
 if(action==='LINK'){x.relation={type:'LINK',targetId};delete x.reservations.BLOCK;}
 if(action==='RIVAL'){x.relation={type:'RIVAL',targetId,pursued:false};x.resource=0;}
 if(action==='COUNTER')x.reservations.COUNTER={n,turn:s.turn,facing:a.facing};
 if(action==='BLOCK'){const cost=pathOf(s,a)==='BASE'&&x.resource>=2?2:1;x.resource-=cost;x.reservations.BLOCK={n:cost,targetId,spend};}
 if(action==='ORDER'){
  const targets=orderTargets(s,a),old=orderOf(a);x.resource--;x.order=old==='ADVANCE'?'GUARD':'ADVANCE';
  for(const b of targets){b.c50.lastOrders??=[];b.c50.lastOrders.push({sourceId:id,order:old,expires:s.turn+1,spend});}
  if(!hasMoved(s,a)&&targets.length>=2)for(const b of targets)merit(s,a,'GUNGI',b.armyId,spend);
 }
 if(action==='RELEASE'){
  x.resource=0;x.auraOff=true;x.releaseCounts??={};const repeated=(x.releaseCounts[targetId]??0)>0;
  const before=s.armies[targetId].morale,levels=['STEADY','SHAKEN','ROUTING'];
  s.c50.releaseSource=id;engineApi.morale(s,targetId,levels[Math.max(0,levels.indexOf(before)-Math.min(2,n))],'국사 해방');
  if(n>=3){const other=live(s).filter(b=>b.armyId!==targetId&&friendly(a,b)&&b.morale!=='STEADY'&&distance(s,b,s.armies[targetId])===1).sort((a,b)=>a.armyId.localeCompare(b.armyId)).slice(0,n>=4?2:1);for(const b of other)engineApi.morale(s,b.armyId,levels[Math.max(0,levels.indexOf(b.morale)-1)],'국사 해방');}
  delete s.c50.releaseSource;
  if(s.armies[targetId].morale!==before){x.releaseCounts[targetId]=(x.releaseCounts[targetId]??0)+1;if(repeated)merit(s,a,'GEUNSIN',targetId,spend);if(live(s).some(b=>hostile(s,a,b)&&distance(s,a,b)<=2))merit(s,a,'SEGAEK',targetId,spend);}
 }
 if(action==='FLURRY'||action==='STRIKE'){
  const ordered=options.targetIds??[targetId,...av.targets.filter(t=>t!==targetId)];
  if(!Array.isArray(ordered)||new Set(ordered).size!==ordered.length||ordered[0]!==targetId||ordered.some(t=>!av.targets.includes(t)))throw new Error('INVALID_ENGINE_TARGET');
  x.resource=0;let index=0;const before=structuredClone(s.armies);
  for(let i=0;i<(action==='FLURRY'?n:1);i++){
   a=s.armies[id];if(!active(s,a)||a.morale==='ROUTING')break;
   while(index<ordered.length&&!active(s,s.armies[ordered[index]]))index++;
   const t=ordered[index];if(!t||armyEngine(s,id)?.archer&&!engineShotLegal(s,id,t))break;
   s=engineApi.attack(s,id,t,null,{enginePaid:true,engineOrigin:spend,engineResource:n,engineHit:i,damageRatio:action==='FLURRY'?params('MAENG').flurryHitRatio:1,engineFormation:action==='STRIKE'?n:0});
  }
  a=s.armies[id];if(action==='STRIKE'&&s.lastCombat?.enemyLoss>0)sample4Execute(s,id,targetId,true,s.lastCombat,before[targetId]?.formation==='BROKEN'&&before[targetId]?.morale!=='ROUTING');
  for(const t of ordered){if(!before[t])continue;const changed=formationDrop(before[t].formation,s.armies[t].formation);if(action==='FLURRY'){if(n>=2&&changed)merit(s,a,'GWANGJANG',t,spend);if(['STEADY','SHAKEN','ROUTING'].indexOf(s.armies[t].morale)>['STEADY','SHAKEN','ROUTING'].indexOf(before[t].morale))merit(s,a,'YONGJANG',t,spend);}else a.c50.strikeMark={turn:s.turn,targetId:t,spend};}
 }
 engineApi.consume(s,id,{attack:['FLURRY','STRIKE'].includes(action)});
 s.c50.actionCounts??={};s.c50.actionCounts[a.factionId]=(s.c50.actionCounts[a.factionId]??0)+1;
 s.c50.engineActionCounts??={};const engineKey=armyEngine(s,id).engineId+(armyEngine(s,id).archer?'.ARCHER':'');s.c50.engineActionCounts[engineKey]=(s.c50.engineActionCounts[engineKey]??0)+1;
 s.c50.armyActionCounts??={};s.c50.armyActionCounts[id]=(s.c50.armyActionCounts[id]??0)+1;
 s.c50.lastAction={armyId:id,action,targetId,turn:s.turn};delete s.c50.context;delete s.c50.sharedDamage;return s;
}
// Read-only modifiers: shared by attack forecasts, committed attacks and public AI probes.
export function engineAttackOptions(s,id,targetId,options={}){
 if(!enginesEnabled(s))return options;
 const a=s.armies[id],t=s.armies[targetId];let out={...options};
 if((a?.c50?.hidden||a?.c50?.hiddenAttack)&&!branched(s,a,'TAMMA'))out.noCounter=true;
 if(kind(s,a,'TU')&&armyEngine(s,id)?.archer&&validRelation(s,a)?.armyId===targetId)out.ignoreCover=true;
 if(!options.counter&&!options.reaction&&(live(s).some(u=>u.factionId===a.factionId&&u.c50?.mark?.targetId===targetId)||s.c50?.publicMarks?.some(m=>m.factionId===a.factionId&&m.targetId===targetId)))out.forceSide='FLANK';
 if(kind(s,t,'TU')&&melee(s,t)&&validRelation(s,t)&&distance(s,t,validRelation(s,t))===1)out.noFlank=true;
 if(branched(s,a,'GWANGJANG')&&a.c50.frenzy&&!options.enginePaid&&!options.counter&&!options.reaction)out.damageRatio=(out.damageRatio??1)*params('MAENG').flurryHitRatio;
 if(a.c50?.direct?.type==='FLANK'&&!sample4Separated(s,a.c50.direct.sourceId,id)&&!options.counter&&!options.reaction)out.forceSide='FLANK';
 if(!options.counter&&!options.reaction){
  const sources=live(s).filter(g=>kind(s,g,'JANGGUN')&&g.morale==='STEADY'&&orderOf(g)==='ADVANCE'&&orderTargets(s,g).some(b=>b.armyId===id));
  if(a.c50?.lastOrders?.some(o=>o.order==='ADVANCE'&&!sample4Separated(s,o.sourceId,id))||sources.length&&hasMoved(s,a)&&firstAttack(s,a))out.forceSide='FLANK';
 }
 return out;
}
export function engineDamageFactor(s,id,targetId,side,options={}){
 if(!enginesEnabled(s))return 1;
 const t=s.armies[targetId];let reduce=0,factor=1;
 if(kind(s,t,'GANG')&&melee(s,t)&&t.c50.resource>=2){if(side==='FRONT'&&!branched(s,t,'BAESU'))reduce=params('GANG').frontReduce/(t.c50.reservations.COUNTER?2:1);if(side==='FLANK'&&!branched(s,t,'BAESU'))factor*=1+params('GANG').flankIncrease/100;}
 if(side==='FRONT'&&(t.c50?.lastOrders?.some(o=>o.order==='GUARD'&&!sample4Separated(s,o.sourceId,targetId))||live(s).some(g=>kind(s,g,'JANGGUN')&&g.morale==='STEADY'&&orderOf(g)==='GUARD'&&orderTargets(s,g).some(b=>b.armyId===targetId))))reduce=Math.max(reduce,params('JANGGUN').guardReduce);
 if((s.c50?.structures??[]).some(o=>o.type==='CAMP'&&o.factionId===t.factionId&&o.tileId===t.tileId))reduce=Math.max(reduce,20);
 return factor*(1-reduce/100)*(options.damageRatio??1);
}
function engineCounterFront(s,id,attackerId){const a=s.armies[id],r=a?.c50?.reservations.COUNTER;return !!r&&usable(s,a)&&engineApi.side({...s,armies:{...s.armies,[id]:{...a,facing:r.facing??a.facing}}},attackerId,id)=== 'FRONT'!==branched(s,a,'BAESU');}
export function engineSuppressReaction(s,id,attackerId){return enginesEnabled(s)&&(!!s.armies[id]?.c50?.reservations.PIN&&(!attackerId||s.armies[id].c50.reservations.PIN.targetId===attackerId)||!!s.armies[id]?.c50?.reservations.COUNTER&&(!attackerId||engineCounterFront(s,id,attackerId)));}
export function engineFormationGuard(s,id){
 if(!enginesEnabled(s)||!s.c50)return false;initializeEngines(s);cleanRelations(s);
 const target=s.armies[id];for(const a of live(s).sort((a,b)=>a.armyId.localeCompare(b.armyId))){const r=a.c50?.reservations.BLOCK;
  if(r&&!sample4Separated(s,a.armyId,id)&&r.targetId===id&&validRelation(s,a)?.armyId===id){if(--r.n<=0)delete a.c50.reservations.BLOCK;if(distance(s,a,target)===2)merit(s,a,'GUWON',id,r.spend);a.c50.blockedAttacker={targetId:s.c50?.context?.attackerId,turn:s.turn,spend:r.spend};return true;}
 }return false;
}
export function engineMoraleGuard(s,id,from,to){
 if(!enginesEnabled(s)||!s.c50||from!=='SHAKEN'||to!=='ROUTING')return false;initializeEngines(s);
 const target=s.armies[id];for(const a of live(s).sort((a,b)=>a.armyId.localeCompare(b.armyId)))if(kind(s,a,'GUKSA')&&!a.c50.auraOff&&a.morale!=='ROUTING'&&friendly(a,target)&&!sample4Separated(s,a.armyId,id)&&(!branched(s,a,'GEUNSIN')&&distance(s,a,target)<=auraRange(a)||branched(s,a,'GEUNSIN')&&a.c50.trust===id&&s.knowledge[a.factionId]?.tiles[target.tileId]==='VISIBLE')&&(a.c50.routGuards??={})[id]!==s.turn){a.c50.routGuards[id]=s.turn;return true;}
 return false;
}
export function engineShareRows(s,rows){
 if(!enginesEnabled(s))return;cleanRelations(s);s.c50.sharedDamage={sequence:s.battleSequence,ids:[]};const hit=new Set(rows.filter(r=>r.loss>0).map(r=>r.id));
 for(const row of [...rows]){if(row.loss<=0)continue;const target=s.armies[row.id];
  const a=live(s).filter(a=>kind(s,a,'HOWI')&&!branched(s,a,'GUWON')&&!hit.has(a.armyId)&&!sample4Separated(s,a.armyId,row.id)&&validRelation(s,a)?.armyId===row.id).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0];if(!a)continue;
  const loss=Math.min(a.troopCount,Math.floor(Math.min(target.troopCount,row.loss)*params('HOWI').shareRatio/100));if(!loss)continue;
  s.c50.sharedDamage.ids.push(a.armyId);row.loss-=loss;const existing=rows.find(r=>r.id===a.armyId);if(existing)existing.loss+=loss;else rows.push({id:a.armyId,loss});
  if(once(s,a,'share'))gain(s,a);
 }
}
export function enginePursuit(s,id,targetId){
 const a=s.armies[id],r=a?.c50?.relation;return enginesEnabled(s)&&kind(s,a,'TU')&&!branched(s,a,'GYEONJE')&&melee(s,a)&&r?.targetId===targetId&&!r.pursued?{multiplier:params('TU').pursuitMultiplier,n:a.c50.resource}:null;
}
export function engineAfterAttack(s,before,id,targetId,log,options={}){
 if(!enginesEnabled(s)||!s.c50||!s.armies[id]?.c50)return;const a=s.armies[id],t=s.armies[targetId],x=a.c50,old=before.armies[id];
 recordEngineContact(s,before);
 const handled=Number.isInteger(log.sequence)?`${log.sequence}:${id}:${targetId}`:null;if(handled&&s.c50.handledAttack===handled)return;
 if(!options.counter&&!options.reaction){
  promotionAfterAttack(s,before,id,targetId,log,options);
  // Conditions belong to declaration, before this hit grants any resource.
  const movedFirst=hasMoved(before,old)&&firstAttack(before,old);
  if(log.enemyLoss>0&&kind(s,a,'MAENG')&&!branched(s,a,'YONGJANG')&&(options.engineResource??old.c50?.resource??0)>0&&movedFirst&&(!options.enginePaid||!options.engineHit))engineFormationDamage(s,targetId,1,log);
  if(options.engineFormation&&active(s,t))engineFormationDamage(s,targetId,options.engineFormation,log);
  x.attackTurn=s.turn;
  for(const o of (x.lastOrders??[]).filter(o=>o.order==='ADVANCE').sort((a,b)=>a.sourceId.localeCompare(b.sourceId)).slice(0,1)){if(o.order==='ADVANCE'&&log.side==='FLANK'){const g=s.armies[o.sourceId];if(g)merit(s,g,'DOKJEON',id,o.spend);}}
  x.lastOrders=(x.lastOrders??[]).filter(o=>o.order!=='ADVANCE');
  for(const u of live(s)){const mark=u.c50?.strikeMark;if(mark?.turn===s.turn&&mark.targetId===targetId&&u.armyId!==id&&log.formationChanges.some(f=>f.armyId===targetId&&formationDrop(f.from,f.to))){merit(s,u,'SEONBONG',targetId,mark.spend);}}
  if(x.blockedAttacker?.targetId===targetId&&x.blockedAttacker.readyTurn===s.turn){if(log.enemyLoss)merit(s,a,'EUNGJING',targetId,x.blockedAttacker.spend);delete x.blockedAttacker;}
 }
 engineCombatHit(s,{...log,attackerId:id,targetId,enginePaid:!!options.enginePaid,engineOrigin:options.engineOrigin});
 if(log.side==='FRONT'){
  for(const o of (t.c50?.lastOrders??[]).filter(o=>o.order==='GUARD').sort((a,b)=>a.sourceId.localeCompare(b.sourceId)).slice(0,1)){if(o.order==='GUARD'&&log.enemyLoss>0){const g=s.armies[o.sourceId];if(g)merit(s,g,'DOKJEON',targetId,o.spend);}}
  if(t.c50)t.c50.lastOrders=(t.c50.lastOrders??[]).filter(o=>o.order!=='GUARD');
 }
 cleanRelations(s);
 const r=t.c50?.reservations.COUNTER;
 if(!options.reaction&&r&&usable(s,t)&&active(s,a)&&engineCounterFront(s,targetId,id)&&a.factionId!==t.factionId){
  delete t.c50.reservations.COUNTER;t.c50.resource=Math.max(0,t.c50.resource-r.n);
  const many=live(s).filter(b=>hostile(s,t,b)&&distance(s,t,b)===1).length>=2,pre=t.c50.resource;
  const out=engineApi.attack(s,targetId,id,null,{reaction:true,enginePaid:true,damageRatio:r.n*params('GANG').counterRatio});
  const outer=log;Object.assign(s,out);const defender=s.armies[targetId],result=s.lastCombat,spend=`counter:${s.turn}:${targetId}:${result.sequence}`;
  if(many)merit(s,defender,'BAESU',id,spend);if(result.formationChanges.some(f=>f.armyId===id&&formationDrop(f.from,f.to)))merit(s,defender,'YEOKSEUP',id,spend);
  // The reaction may not replenish its own spent resource.
  defender.c50.resource=pre;outer.allyLoss+=result.enemyLoss;outer.formationChanges.push(...result.formationChanges);outer.moraleChanges.push(...result.moraleChanges);outer.effectLines.push('반격 자세');outer.engineCounter=result;s.lastCombat=outer;
 }
 if(options.reaction&&options.engineFormation&&active(s,t))engineFormationDamage(s,targetId,options.engineFormation,log);
 mapAfterAttack(s,before,id,targetId,log,options);
 if(handled)s.c50.handledAttack=handled;
}
function handleEngineEvent(s,type,p){
 if(!s.c50)return;
 promotionEvent(s,type,p);
 mapEngineEvent(s,type,p);
 if(type==='FACTION_START'){
  initializeEngines(s);for(const a of live(s).filter(a=>a.factionId===p.factionId)){delete a.c50.periodKeys;delete a.c50.hitGain;delete a.c50.reactionKeys;a.c50.reservations={};delete a.c50.auraOff;if(a.c50.blockedAttacker){if(a.c50.blockedAttacker.readyTurn!==undefined)delete a.c50.blockedAttacker;else a.c50.blockedAttacker.readyTurn=s.turn;}}
  if(s.turn>=meritGuaranteeTurn)for(const [id,r] of Object.entries(s.campaignGrowth?.officers??{})){
   const o=s.officers[id];if(!o||s.wanderers?.[id]||o.allegianceFactionId!==p.factionId||o.lifeState!=='ALIVE'||o.captivityState!=='FREE')continue;
   if(!r.c50?.promotionOffered)offerPromotion(s,id,r.track.growthStates[id].level);
   if(r.c50?.promotion&&(s.autoPlayer||p.factionId!==s.playerFactionId))selectPromotion(s,id,aiPromotionChoice(s,id));
  }
 }
 if(type==='FACTION_END'){
  cleanRelations(s);for(const a of live(s).filter(a=>a.factionId===p.factionId)){
   if(kind(s,a,'MAENG')&&a.c50.contact&&a.c50.attackTurn!==s.turn)gain(s,a,-1);
   if(kind(s,a,'JANGGUN')&&a.c50.contact&&a.c50.hitTurn!==s.turn)gain(s,a,-1);
   if(kind(s,a,'TU')){const t=validRelation(s,a);if(t&&(armyEngine(s,a.armyId)?.archer?engineShotLegal(s,a.armyId,t.armyId):distance(s,a,t)===1))gain(s,a);else {a.c50.resource=0;a.c50.relation=null;}}
  }
  for(const a of live(s))if(a.c50?.lastOrders)a.c50.lastOrders=a.c50.lastOrders.filter(o=>s.armies[o.sourceId]?.factionId!==p.factionId||o.expires>s.turn);
 }
 if(type==='FORCED_MOVE'){const a=s.armies[p.armyId];if(a&&kind(s,a,'GANG')&&melee(s,a)){const origin=s.c50.context?.origin??`${s.turn}:${s.battleSequence}:${p.fromTileId}`;if(a.c50.forcedOrigin!==origin){gain(s,a,-Math.ceil(a.c50.resource/2));a.c50.forcedOrigin=origin;}}}
 if(type==='MOVE_LEAVE'){
  const a=s.armies[p.armyId];if(a&&kind(s,a,'GANG')&&melee(s,a)&&a.c50.halvedTurn!==s.turn){gain(s,a,-Math.ceil(a.c50.resource/2));a.c50.halvedTurn=s.turn;}
 }
 if(['ARRIVE','KILL','FORMATION_CHANGE','MORALE_CHANGE'].includes(type))cleanRelations(s);
 if(type==='FORMATION_CHANGE'&&p.to==='BROKEN'||type==='MORALE_CHANGE'&&(p.to==='ROUTING'||p.from==='SHAKEN'&&p.to==='STEADY')){
  const t=s.armies[p.armyId];if(!t)return;
  for(const a of live(s).filter(a=>kind(s,a,'GUKSA')&&distance(s,branched(s,a,'GEUNSIN')?s.armies[a.c50.trust]:a,t)<=(branched(s,a,'GEUNSIN')?2:auraRange(a)))){
   const isEnemy=hostile(s,a,t),recover=friendly(a,t)&&(!branched(s,a,'GEUNSIN')||a.c50.trust===p.armyId)&&type==='MORALE_CHANGE'&&p.from==='SHAKEN'&&p.to==='STEADY';
   if((isEnemy&&(p.to==='BROKEN'||p.to==='ROUTING')||recover)&&s.c50.releaseSource!==a.armyId&&once(s,a,`${isEnemy?'enemy':'ally'}:${p.armyId}`)){
    const origin=s.c50.context?.origin;
    if(!origin||once(s,a,`origin:${origin}`))gain(s,a);
   }
  }
 }
}
export function enginePursuitMerit(s,id,targetId){const a=s.armies[id];merit(s,a,'GYEONJE',targetId,`pursuit:${s.turn}:${s.battleSequence}`);}
export function engineAiActions(s,id){
 const a=s.armies[id],e=armyEngine(s,id);if(!e)return [];
 if(pathOf(s,a)&&pathOf(s,a)!=='BASE'){
  const choices=engineActions(s,id).filter(o=>o.canUse&&promotionActions.has(o.action)),rows=[];
  for(const o of choices){let target=o.targets[0];
   if(o.action==='UNFLAG')continue;
   if(o.action==='FRENZY'&&e.resource<2)continue;
   if(o.action==='INTIMIDATE')target=o.targets.find(t=>s.armies[t].morale!=='ROUTING');
   if(o.action==='RESCUE'){const t=s.armies[target];if(!t||!engaged(s,t)||t.troopCount>=a.troopCount&&t.formation==='ORDERED')continue;}
   if(o.action==='PIN'&&!engaged(s,a)&&!e.archer)continue;
   if(o.action==='FLAG'){if(a.c50.flag)continue;target=o.targets.find(at=>live(s).some(b=>friendly(a,b)&&b.armyId!==id&&tileDistance(s,at,b.tileId)<=2&&engineApi.targets(s,b.armyId).length));}
   if(o.action==='TRUST')target=o.targets.find(t=>t!==a.c50.trust&&s.armies[t].morale!=='STEADY'&&distance(s,a,s.armies[t])<=2);
   if(o.action==='DEPOT')target=!a.c50.depot&&o.targets.find(at=>live(s).some(b=>friendly(a,b)&&b.armyId!==id&&b.woundedCount>0&&distance(s,b,a)<=3&&engineApi.remainingReachable(s,b.armyId,s.time.ticksPerTurn).includes(at)));
   if(o.action==='PASSAGE')target=!a.c50.passage&&o.targets.find(at=>live(s).some(b=>friendly(a,b)&&b.armyId!==id&&!s.movedArmyIds.includes(b.armyId)&&distance(s,b,{tileId:at})<=2)&&live(s).some(b=>hostile(s,a,b)&&visible(s,a,b)&&tileDistance(s,at,b.tileId)<distance(s,a,b)));
   if(o.action==='SHARE_HIDE')target=o.targets.find(t=>!s.armies[t].c50.hidden);
   if(o.action==='BREACH')target=o.targets.find(t=>!a.c50.breach&&live(s).some(b=>friendly(a,b)&&b.armyId!==id&&tileDistance(s,b.tileId,s.cities[t].tileId)<=2));
   if(o.action.startsWith('TRAP'))target=o.targets.find(at=>live(s).some(b=>hostile(s,a,b)&&visible(s,a,b)&&tileDistance(s,at,b.tileId)<=1));
   if(o.action==='DIRECT_FLANK'||o.action==='LEND')target=o.targets.find(t=>!s.endedArmyIds.includes(t)&&!s.armies[t].c50.direct&&engineApi.targets(s,t).length);
   if(o.action==='DIRECT_MOVE')target=o.targets.find(t=>!s.movedArmyIds.includes(t)&&live(s).some(b=>hostile(s,a,b)&&visible(s,a,b)&&distance(s,s.armies[t],b)===1));
   if(target)rows.push({action:o.action,targetId:target});
  }
  if(rows.length)return rows;
 }
 if(e.archer||['CHAEK','CHUKSEONG','CHEOK','JEONNONG'].includes(e.engineId))return mapAiActions(s,id);
 const actions=engineActions(s,id).filter(o=>o.canUse),foes=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b)&&distance(s,a,b)===1);
 const rows=[];const choose=(action,targetId)=>{const av=actions.find(o=>o.action===action);if(av&&av.targets.includes(targetId))rows.push({action,targetId});};
  if(e.engineId==='MAENG'&&e.resource*params('MAENG').flurryHitRatio>1&&foes.length)choose('FLURRY',actions.find(o=>o.action==='FLURRY')?.targets[0]);
 if(e.engineId==='GANG'&&e.resource>=2&&foes.some(b=>(engineApi.side(s,b.armyId,id)==='FRONT')!==branched(s,a,'BAESU')))choose('COUNTER',id);
 if(e.engineId==='HOWI'){
  const link=validRelation(s,a);if(!link){const av=actions.find(o=>o.action==='LINK'),target=av?.targets.map(t=>s.armies[t]).sort((b,c)=>Number(c.commanderId===s.factions[a.factionId]?.rulerId)-Number(b.commanderId===s.factions[a.factionId]?.rulerId)||b.troopCount-c.troopCount||b.armyId.localeCompare(c.armyId))[0];if(target)choose('LINK',target.armyId);}
  else if(live(s).some(b=>hostile(s,a,b)&&visible(s,a,b)&&distance(s,b,link)===1))choose('BLOCK',link.armyId);
 }
 if(e.engineId==='TU'){
  const rival=validRelation(s,a);if(!rival){const target=foes.sort((b,c)=>(b.formation==='ORDERED')-(c.formation==='ORDERED')||(s.officers[b.commanderId]?.baseStats.might??50)-(s.officers[c.commanderId]?.baseStats.might??50)||b.armyId.localeCompare(c.armyId))[0];if(target)choose('RIVAL',target.armyId);}
  else if(e.resource>=2||e.resource>=1&&rival.formation==='DISORDERED')choose('STRIKE',rival.armyId);
 }
  if(e.engineId==='JANGGUN'&&e.resource>=1){const useful=orderTargets(s,a).some(b=>!s.endedArmyIds.includes(b.armyId)&&engineApi.canAct(s,b.armyId)&&engineApi.targets(s,b.armyId).length);if(useful)choose('ORDER',id);}
 if(e.engineId==='GUKSA'){const target=actions.find(o=>o.action==='RELEASE')?.targets.map(t=>s.armies[t]).sort((b,c)=>Number(c.morale==='ROUTING')-Number(b.morale==='ROUTING')||b.troopCount-c.troopCount)[0];if(target)choose('RELEASE',target.armyId);}
 return rows;
}

export function engineStatuses(s,id,viewer=null){
 const a=s.armies[id];if(!armyEngine(s,id))return [];const x=a.c50,labels={COUNTER:'반격 자세',BLOCK:'막기',RETURN_FIRE:'응사',PIN:'이탈 막기'};
 return [...(x?.frenzy?[`광분 ${x.frenzy.remaining}차례`]:[]),...(x?.flag?['군기']:[]),...(x?.trap?['함정']:[]),...(x?.passage?['통로']:[]),...(x?.depot?['보급소']:[]),...(x?.trust?['신임']:[]),...(x?.grudge?['원한']:[]),...(x?.persuaded?['설득 · 공격 불가']:[]),...(x?.direct?[`군령 · ${x.direct.type==='MOVE'?'이탈 추격 면제':'다음 공격 측면'}`]:[]),...((!viewer||viewer===a.factionId)&&x?.evacuation?['후송 회복 예약']:[]),...(x?.hidden?['숨음']:[]),...(x?.warning?['예고']:[]),...(x?.mark?['정탐 표식']:[]),...Object.keys(x?.reservations??{}).filter(k=>!viewer||viewer===a.factionId||k!=='RETURN_FIRE').map(k=>labels[k]??k),...(validRelation(s,a)?[x.relation.type==='LINK'?'연결':'맞수']:[]),...(kind(s,a,'JANGGUN')?[orderOf(a)==='ADVANCE'?'진격령':'수비령']:[])];
}
export function engineCombatHit(s,log){
 if(!enginesEnabled(s)||s.disengageResolving)return;
 recordEngineContact(s);
 const a=s.armies[log.attackerId],t=s.armies[log.targetId];if(!a||!t)return;
 if(log.enemyLoss>0)for(const g of live(s).filter(g=>branched(s,g,'EUNGJING')&&validRelation(s,g)?.armyId===t.armyId&&hostile(s,g,a)))g.c50.grudge={targetId:a.armyId,expires:s.turn+1};
 const origin=log.engineOrigin??`combat:${s.turn}:${log.sequence??s.battleSequence}`;
 if(log.enemyLoss>0){
  if(['ATTACK','Q'].includes(log.kind)&&a.c50)a.c50.attackTurn=s.turn;
  if(!log.enginePaid&&['ATTACK','Q'].includes(log.kind)&&kind(s,a,'MAENG')&&!a.c50.frenzy&&once(s,a,`maeng:${origin}`))gain(s,a);
  for(const g of live(s).filter(g=>g.armyId!==a.armyId&&kind(s,g,'JANGGUN')&&friendly(a,g)&&!sample4Separated(s,g.armyId,a.armyId)&&distance(s,a,g.c50.flag?{...g,tileId:g.c50.flag}:g)<=(g.c50.resource>=3?params('JANGGUN').rangeAt3:params('JANGGUN').range)&&(!branched(s,g,'GUNGI')||g.c50.flag))){
   g.c50.hitTurn=s.turn;g.c50.hitGain??=0;
   if(g.c50.hitGain<params('JANGGUN').hitGainPerPeriod&&once(s,g,`hit:${origin}`)){gain(s,g);g.c50.hitGain++;}
  }
 }
 if(log.enemyLoss>0&&(log.side==='FRONT'!==branched(s,t,'BAESU'))&&kind(s,t,'GANG')&&(melee(s,t)||distance(s,a,t)<=2)&&once(s,t,`gang:${origin}:${log.sequence??s.battleSequence}`))gain(s,t);
 if(log.counter&&log.allyLoss>0&&!branched(s,a,'BAESU')&&kind(s,a,'GANG')&&melee(s,a)&&once(s,a,`gang-counter:${origin}:${log.sequence??s.battleSequence}`))gain(s,a);
}

export function engineCounterReservation(s,id,attackerId){return enginesEnabled(s)&&engineCounterFront(s,id,attackerId)?s.armies[id].c50.reservations.COUNTER:null;}
export const engineCounterRatio=()=>params('GANG').counterRatio;

const formationDrop=(from,to)=>["ORDERED","DISORDERED","BROKEN"].indexOf(to)>["ORDERED","DISORDERED","BROKEN"].indexOf(from);

export function engineFormationDamage(s,id,n,log){
 const a=s.armies[id],before=a.formation,oldMorale=a.morale;engineApi.formation(s,id,n,log.formationChanges);
 if(before!=='BROKEN'&&a.formation==='BROKEN'&&active(s,a)){engineApi.checkMorale(s,id,'\uC804\uC5F4 \uBD95\uAD34',engineApi.collapseWeight,log.moraleChanges);if(oldMorale!=='ROUTING'&&a.morale==='ROUTING')engineApi.nearbyMorale(s,a,log.moraleChanges);}
}

// C232 uses the same injected services, action budget and merit ledger as C231.
const mapActions=new Set(['WARN_FIRE','WARN_ROOT','WARN_MORALE','PALISADE','CAMP','BRIDGE','CHIP','STEALTH','SCOUT','CART','RETURN_FIRE']);
const adjacent=(s,at)=>boardNeighbors(s.tiles[at],s.tiles).map(tileId).sort();
const tileDistance=(s,a,b)=>s.tiles[a]&&s.tiles[b]?hexDistance(s.tiles[a],s.tiles[b]):Infinity;
const visible=(s,a,b)=>s.knowledge[a.factionId]?.tiles[b.tileId]==='VISIBLE'&&!engineApi.hidden?.(s,b.armyId,a.factionId);
// Optional per-own-period flag: legacy saves need no migration. Queries never set it.
function recordEngineContact(s,world=s,factionId=null){
 const f=factionId??world.activeFactionId??(world.phase==='PLAYER'?world.playerFactionId:null),units=live(world);
 for(const a of units.filter(a=>a.factionId===f&&['MAENG','JANGGUN'].includes(a.c50?.engineId))){
  if(units.some(b=>hostile(world,a,b)&&visible(world,a,b)&&distance(world,a,b)<=(troopToCampaign(a.troopType)==='BT03'?2:1)&&(distance(world,a,b)<=1||engineApi.shotLine?.(world,a.armyId,b.armyId,b.tileId))))s.armies[a.armyId].c50.contact=true;
 }
}
const empty=(s,at)=>!live(s).some(b=>b.tileId===at)&&!Object.values(s.cities).some(c=>c.tileId===at)&&!(s.c50?.structures??[]).some(o=>o.tileId===at);
const structureNames={PALISADE:'목책',CAMP:'진지',BRIDGE:'다리',CART:'수레'};
export function engineShotLegal(s,id,targetId,{fromTileId=null,facing=null}={}){
 const a=s.armies[id],b=s.armies[targetId];if(!a||!b||!visible(s,a,b))return false;
 const at=fromTileId??b.tileId,d=tileDistance(s,a.tileId,at);
 if(d!==2||!active(s,a)||a.morale==='ROUTING'||a.formation==='BROKEN')return false;
 const world=at===b.tileId?s:{...s,armies:{...s.armies,[targetId]:{...b,tileId:at}}};
 if(engineApi.archerReason(world,id))return false;
 if(!engineApi.shotLine?.(s,id,targetId,at))return false;
 return facing===null||[0,1,5].includes((engineApi.direction(s.tiles[a.tileId],s.tiles[at],facing)-facing+6)%6);
}
export function engineStructureTargets(s,id){
 const a=s.armies[id];if(!enginesEnabled(s)||!usable(s,a)||!engineApi.canAct(s,id))return [];
 return (s.c50?.structures??[]).filter(o=>o.hp>0&&o.factionId!==a.factionId&&engineApi.hostileFaction(s,a.factionId,o.factionId)&&s.knowledge[a.factionId]?.tiles[o.tileId]==='VISIBLE'&&tileDistance(s,a.tileId,o.tileId)===(troopToCampaign(a.troopType)==='BT03'?2:1)&&engineApi.structureLine(s,id,o.tileId)).map(o=>o.id);
}
function mapActionAvailability(s,id,action){
 const a=s.armies[id],e=armyEngine(s,id),bad=(reasonCode,reasonText)=>({canUse:false,reasonCode,reasonText,targets:[]});
 if(engineAttackBlocked(s,id)&&['WARN_FIRE','WARN_ROOT','WARN_MORALE','CHIP'].includes(action))return bad('ENGINE_PERSUADED','설득되어 공격할 수 없습니다');
 if(!e||!s.c50)return bad('ENGINE_UNAVAILABLE','계통 행동이 없습니다');
 if(!usable(s,a))return bad('ENGINE_DISABLED','붕괴 · 기절 · 패주 중에는 사용할 수 없습니다');
 if(!engineApi.canAct(s,id))return bad('MAIN_ACTION_USED','이번 차례 주 행동을 마쳤습니다');
 const expected={WARN_FIRE:'CHAEK',WARN_ROOT:'CHAEK',WARN_MORALE:'CHAEK',PALISADE:'CHUKSEONG',CAMP:'CHUKSEONG',BRIDGE:'CHUKSEONG',CHIP:'CHUKSEONG',STEALTH:'CHEOK',SCOUT:'CHEOK',CART:'JEONNONG',RETURN_FIRE:'GANG'};
 if(e.engineId!==expected[action]||action==='RETURN_FIRE'&&!e.archer)return bad('INVALID_ENGINE_ACTION','계통에 맞는 행동을 고르세요');
 const cost={PALISADE:params('CHUKSEONG').costPalisade,CAMP:params('CHUKSEONG').costCamp,BRIDGE:params('CHUKSEONG').costBridge,STEALTH:0,SCOUT:0}[action]??1;
 if(e.resource<cost)return bad('ENGINE_RESOURCE','계통 자원이 부족합니다');
 if(['STEALTH','SCOUT'].includes(action)&&!a.c50.hidden)return bad('ENGINE_NOT_HIDDEN','숨은 상태에서만 사용할 수 있습니다');
 if(action.startsWith('WARN')&&(a.c50.warning||a.c50.cooldownThrough>=s.turn))return bad('ENGINE_COOLDOWN','예고 재사용 대기 중입니다');
 let targets=[];
 if(action.startsWith('WARN'))targets=Object.keys(s.tiles).filter(at=>s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&tileDistance(s,a.tileId,at)<=params('CHAEK').range);
 if(['PALISADE','CAMP','BRIDGE','CART'].includes(action))targets=adjacent(s,a.tileId).filter(at=>s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&(action==='CAMP'||action==='BRIDGE'?!live(s).some(b=>b.tileId===at&&!friendly(a,b))&&!Object.values(s.cities).some(c=>c.tileId===at)&&!(s.c50.structures??[]).some(o=>o.tileId===at):empty(s,at))&&!engineApi.fireAt(s,at)&&!['mountain','water'].includes(s.tiles[at].terrainType)&&(action!=='BRIDGE'||s.mapRules.riverEdges.some(edge=>edge.split('|').includes(at))));
 if(action==='CHIP')targets=[...(s.c50.structures??[]).filter(o=>engineApi.hostileFaction(s,a.factionId,o.factionId)&&tileDistance(s,a.tileId,o.tileId)===1&&s.knowledge[a.factionId]?.tiles[o.tileId]==='VISIBLE').map(o=>o.id),...Object.values(s.cities).filter(c=>c.ownerFactionId&&engineApi.hostileFaction(s,a.factionId,c.ownerFactionId)&&c.durability>0&&tileDistance(s,a.tileId,c.tileId)===1&&s.knowledge[a.factionId]?.tiles[c.tileId]==='VISIBLE').map(c=>c.cityId)];
 if(action==='SCOUT')targets=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b)&&distance(s,a,b)<=params('CHEOK').markRange).map(b=>b.armyId);
 if(action==='STEALTH')targets=s.movedArmyIds.includes(id)?[]:engineApi.reachable(s,id,s.time.ticksPerTurn).filter(at=>tileDistance(s,a.tileId,at)<=params('CHEOK').stealthMove&&at!==a.tileId);
 if(action==='RETURN_FIRE')targets=[id];
 return targets.length?{canUse:true,reasonCode:'',reasonText:'',targets:targets.sort()}:bad('NO_ENGINE_TARGET','지금 사용할 수 있는 대상이 없습니다');
}
function resolveMapAction(state,id,action,targetId,options){
 const av=mapActionAvailability(state,id,action);if(!av.canUse)throw new Error(av.reasonCode);
 targetId??=av.targets.length===1?av.targets[0]:null;if(!av.targets.includes(targetId))throw new Error('INVALID_ENGINE_TARGET');
 let s=structuredClone(state),a=s.armies[id],x=a.c50,n=x.resource;const spend=`${s.turn}:${id}:${s.battleSequence}:${a.mainActionCount??0}:${action}`;
 if(action.startsWith('WARN')){
  const neighbors=adjacent(s,targetId),chosen=options.tileIds??neighbors.slice(0,2);
  if(n===2&&(!Array.isArray(chosen)||chosen.length!==Math.min(2,neighbors.length)||new Set(chosen).size!==chosen.length||chosen.some(at=>!neighbors.includes(at))))throw new Error('INVALID_ENGINE_AREA');
  x.warning={tileId:targetId,tiles:[targetId,...(n>=3?neighbors:n===2?chosen:[])],n,action,turn:s.turn,spend};x.resource=0;x.cooldownThrough=s.turn+params('CHAEK').cooldown;
 }
 if(['PALISADE','CAMP','BRIDGE','CART'].includes(action)){
  const cost={PALISADE:params('CHUKSEONG').costPalisade,CAMP:params('CHUKSEONG').costCamp,BRIDGE:params('CHUKSEONG').costBridge}[action]??n;
  x.resource-=cost;s.c50.structures??=[];s.c50.structureSequence=(s.c50.structureSequence??0)+1;
  s.c50.structures=s.c50.structures.filter(o=>o.sourceId!==id||o.type!==action);
  s.c50.structures.push({id:`C50.${s.c50.structureSequence}`,sourceId:id,factionId:a.factionId,type:action,tileId:targetId,hp:30,maxHp:30,n:cost,spend,createdTurn:s.turn,...(action==='CART'?{expires:s.turn+1,onSupply:engineApi.supply(s,{...a,tileId:targetId}).state==='SAFE'}:{})});
 }
 if(action==='CHIP'){x.resource=0;const o=s.c50.structures?.find(o=>o.id===targetId),c=s.cities[targetId];if(o)damageStructure(s,a,o,n*params('CHUKSEONG').chipPerPoint,true);else {const loss=Math.min(c.durability,n*params('CHUKSEONG').chipPerPoint);c.durability-=loss;if(loss)merit(s,a,'GONGSEONG',targetId,spend);}}
 if(action==='SCOUT'){if(!branched(s,a,'TAMMA'))revealScout(s,a);x.mark={targetId,spend,expires:s.turn+1};}
 if(action==='STEALTH'){s=engineApi.move(s,id,targetId);if(!s.movedArmyIds.includes(id))s.movedArmyIds.push(id);}
 if(action==='RETURN_FIRE')x.reservations.RETURN_FIRE={n,facing:a.facing,turn:s.turn,spend};
 engineApi.consume(s,id);s.c50.actionCounts??={};s.c50.actionCounts[a.factionId]=(s.c50.actionCounts[a.factionId]??0)+1;
 s.c50.engineActionCounts??={};const key=armyEngine(s,id).engineId+(armyEngine(s,id).archer?'.ARCHER':'');s.c50.engineActionCounts[key]=(s.c50.engineActionCounts[key]??0)+1;
 s.c50.armyActionCounts??={};s.c50.armyActionCounts[id]=(s.c50.armyActionCounts[id]??0)+1;
 s.c50.lastAction={armyId:id,action,targetId,turn:s.turn};return s;
}
function damageStructure(s,a,o,damage,paid=false){o.hp=Math.max(0,o.hp-damage);if(o.hp===0){s.c50.structures=s.c50.structures.filter(t=>t.id!==o.id);if(!paid&&kind(s,a,'CHUKSEONG'))gain(s,a,params('CHUKSEONG').demolishGain);}}
export function resolveStructureAttack(state,id,targetId){
 if(!engineStructureTargets(state,id).includes(targetId))throw new Error('INVALID_STRUCTURE_TARGET');
 const s=structuredClone(state),a=s.armies[id],o=s.c50.structures.find(o=>o.id===targetId);damageStructure(s,a,o,engineApi.structureDamage(s,id));engineApi.consume(s,id,{attack:true});
 // Structures never grant tactic gauge or combat-hit resources.
 engineEvent(s,'ATTACK_DECLARE',{attackerId:id,targetId,reaction:false});a.c50&&(a.c50.attackTurn=s.turn);delete a.c50?.hiddenAttack;return s;
}
function revealScout(s,a,attack=false){if(a?.c50?.hidden){a.c50.hidden=false;a.c50.resource=0;if(attack&&pathOf(s,a)!=='BASE')a.c50.hideBlockedThrough=s.turn+1;}}
function scoutHiddenAllowed(s,a){return ['forest','hill'].includes(s.tiles[a.tileId].terrainType)&&!engineApi.fireAt(s,a.tileId)&&!live(s).some(b=>hostile(s,a,b)&&distance(s,a,b)<=1)&&Object.keys(s.factions).filter(f=>engineApi.hostileFaction(s,a.factionId,f)).every(f=>s.knowledge[f]?.tiles[a.tileId]!=='VISIBLE');}
function mapEngineEvent(s,type,p){
 const a=s.armies[p.armyId??p.attackerId];
 if(type==='MOVE_LEAVE'&&a?.c234?.concealUntil){revealScout(s,a);delete a.c234.concealUntil;}
 if(type==='ATTACK_DECLARE'&&a?.c50?.hidden){a.c50.hiddenAttack=true;revealScout(s,a,true);}
 if(type==='FORMATION_CHANGE'&&p.to==='BROKEN'&&a?.c50)delete a.c50.warning;
 if(['ARRIVE','FORCED_MOVE'].includes(type)){
  if(a?.c50&&kind(s,a,'GANG')&&!melee(s,a))a.c50.resource=0;
  for(const u of live(s))if(u.c50?.hidden&&(live(s).some(b=>hostile(s,u,b)&&distance(s,u,b)<=1)||u.armyId===a?.armyId&&!u.c234?.concealUntil&&s.tiles[u.tileId].terrainType==='plain'&&Object.keys(s.factions).some(f=>engineApi.hostileFaction(s,u.factionId,f)&&s.knowledge[f]?.tiles[u.tileId]==='VISIBLE')||engineApi.fireAt(s,u.tileId)))revealScout(s,u);
  if(a)for(const o of [...s.c50.structures??[]])if(o.tileId===a.tileId){
   if(o.type==='CART'){
    if(o.factionId!==a.factionId){s.c50.structures=s.c50.structures.filter(t=>t.id!==o.id);continue;}
    if(o.sourceId===a.armyId)continue;
    const wounded=s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===a.armyId).reduce((n,l)=>n+l.count,0),before=a.troopCount;
    const amount=Math.floor(wounded*o.n*params('JEONNONG').cartHealPerPoint/100);if(branched(s,s.armies[o.sourceId],'HUSONG'))a.c50.evacuation={amount:Math.floor(amount*1.5)};else engineApi.heal(s,a.armyId,amount);
    const source=s.armies[o.sourceId];if(source&&a.troopCount>before){if(!live(s).some(b=>hostile(s,a,b)&&distance(s,a,b)===1))merit(s,source,'HUSONG',a.armyId,o.spend);if(o.onSupply)merit(s,source,'DUNJEON',a.armyId,o.spend);}
    s.c50.structures=s.c50.structures.filter(t=>t.id!==o.id);
   }else if(o.type==='BRIDGE'&&o.factionId===a.factionId&&s.armies[o.sourceId])merit(s,s.armies[o.sourceId],'GONGBYEONG',a.armyId,o.spend);
  }
 }
 if(type==='MOVE_LEAVE'&&a&&kind(s,a,'GANG')&&!melee(s,a))a.c50.resource=0;
 if(type==='FACTION_START')for(const u of live(s).filter(u=>u.factionId===p.factionId)){
  const w=u.c50?.warning;if(!w)continue;delete u.c50.warning;if(!usable(s,u))continue;
  const targets=live(s).filter(t=>w.tiles.includes(t.tileId)),enemies=targets.filter(t=>hostile(s,u,t));
  const reserved=new Set(enemies.filter(t=>Object.keys(t.c50?.reservations??{}).length||t.c50?.warning).map(t=>t.armyId));
  const rows=targets.map(t=>({targetId:t.armyId,loss:Math.round(engineApi.baseDamage(s,u.armyId,t.armyId)*w.n*params('CHAEK').powerPerPoint/targets.length*(w.action==='WARN_FIRE'?1:.5))}));
  if(rows.length){engineApi.damage(s,u.armyId,rows,'ENGINE_WARNING',true);for(const t of enemies)if(s.lastCombat?.units.some(row=>row.unitId===t.armyId&&row.casualties>0)){if(enemies.length===1)merit(s,u,'GWEGYE',t.armyId,w.spend);if(reserved.has(t.armyId))merit(s,u,'GUNSA',t.armyId,w.spend);}}
  if(w.action==='WARN_FIRE')engineApi.fire(s,u.armyId,w.tiles);
  else for(const t of targets.filter(t=>active(s,t))){if(w.action==='WARN_ROOT'){t.c50??={};t.c50.rootNext=true;}else engineApi.morale(s,t.armyId,t.morale==='STEADY'?'SHAKEN':'ROUTING','교란 예고');}
 }
 if(type==='FACTION_START')for(const u of live(s).filter(u=>u.factionId===p.factionId)){if(u.c50.rooted||u.c50.rootNext){u.c50.rooted=!!u.c50.rootNext;delete u.c50.rootNext;}}
 if(type==='FACTION_END'){
  for(const u of live(s).filter(u=>u.factionId===p.factionId)){
   const x=u.c50;if(!x)continue;
   if(kind(s,u,'CHAEK')&&x.attackTurn!==s.turn&&!x.warning)gain(s,u);
   if(kind(s,u,'CHUKSEONG')&&(!branched(s,u,'GONGSEONG')&&!hasMoved(s,u)||branched(s,u,'GONGSEONG')&&siegeAdjacent(s,u)))gain(s,u);
   if(kind(s,u,'GANG')&&!branched(s,u,'BAESU')&&!melee(s,u)&&!hasMoved(s,u))gain(s,u);
   if(kind(s,u,'CHEOK')&&(pathOf(s,u)==='BASE'||!(x.hideBlockedThrough>=s.turn))&&scoutHiddenAllowed(s,u)){x.hidden=true;x.resource=1;}
   if(kind(s,u,'JEONNONG')){updateSupplyResource(s,u);if(x.supplyLinked&&!hasMoved(s,u))gain(s,u);}
   if(x.mark?.expires<=s.turn)delete x.mark;
  }
  if(s.c50.structures)s.c50.structures=s.c50.structures.filter(o=>o.type!=='CART'||o.factionId!==p.factionId||o.expires>s.turn);
 }
 if(type==='ARRIVE'||type==='SUPPLY_CHANGED'||type==='CAPTURE')for(const u of live(s).filter(u=>kind(s,u,'JEONNONG')))updateSupplyResource(s,u);
}
function updateSupplyResource(s,a){const linked=engineApi.supply(s,a).state==='SAFE';if(linked&&!a.c50.supplyLinked)gain(s,a,params('JEONNONG').linkGain);a.c50.supplyLinked=linked;}
function mapAfterAttack(s,before,id,targetId,log,options){
 const a=s.armies[id],t=s.armies[targetId];if(!options.reaction&&!options.counter){
  if(!options.enginePaid&&kind(s,a,'TU')&&armyEngine(s,id)?.archer&&validRelation(s,a)?.armyId===targetId&&log.enemyLoss>0)gain(s,a);
  for(const u of live(s).filter(u=>u.factionId===a.factionId)){
   if(u.c50?.mark?.targetId===targetId){if(log.enemyLoss>0)merit(s,u,'TAMMA',targetId,u.c50.mark.spend);delete u.c50.mark;}
   if(u.armyId!==id&&u.c50?.ambushHit?.turn===s.turn&&u.c50.ambushHit.targetId===targetId&&log.enemyLoss>0)merit(s,u,'BOKBYEONG',targetId,u.c50.ambushHit.spend);
  }
  if(before.armies[id]?.c50?.hidden&&log.enemyLoss>0)a.c50.ambushHit={targetId,turn:s.turn,spend:`ambush:${s.turn}:${log.sequence}`};delete a.c50.hiddenAttack;
 }
 delete a.c50?.hiddenAttack;
 if(!options.reaction&&t?.c50?.reservations.RETURN_FIRE)engineRangedReaction(s,targetId,id,null,log);
 if(log.firstStrike&&log.side==='FRONT')for(const o of s.c50.structures??[])if(['CAMP','PALISADE'].includes(o.type)&&o.factionId===t.factionId&&tileDistance(s,o.tileId,t.tileId)<=1&&s.armies[o.sourceId])merit(s,s.armies[o.sourceId],'GONGBYEONG',targetId,o.spend);
}
export function engineFirstStrike(s,id){const a=s.armies[id];return enginesEnabled(s)&&(s.c50?.structures??[]).some(o=>['CAMP','PALISADE'].includes(o.type)&&!branched(s,s.armies[o.sourceId],'GONGSEONG')&&!branched(s,s.armies[o.sourceId],'GONGBYEONG')&&o.factionId===a.factionId&&tileDistance(s,o.tileId,a.tileId)<=1);}
export function engineFoodFactor(s,a){return enginesEnabled(s)&&live(s).some(u=>kind(s,u,'JEONNONG')&&!branched(s,u,'DUNJEON')&&friendly(a,u)&&distance(s,a,u)<=2)?1-params('JEONNONG').foodReduce/100:1;}
export function engineMovementWorld(s,id,world){
 if(!enginesEnabled(s)||!s.c50)return world;
 const blocked=new Set(world.mapRules.blockedEdges),crossings={...world.mapRules.crossings};
 for(const o of s.c50.structures??[]){if(o.type==='PALISADE')for(const to of adjacent(s,o.tileId))blocked.add([o.tileId,to].sort().join('|'));if(o.type==='BRIDGE')for(const edge of world.mapRules.riverEdges)if(edge.split('|').includes(o.tileId))crossings[edge]='bridge';}
 const tiles={...world.tiles};for(const a of live(s)){const at=a.c50?.passage?.tileId;if(!at)continue;tiles[at]={...tiles[at],terrainType:'plain'};for(const edge of world.mapRules.riverEdges)if(edge.split('|').includes(at))crossings[edge]='bridge';}
 return {...world,tiles,mapRules:{...world.mapRules,crossings,blockedEdges:[...blocked]}};
}
export function engineMapView(s,factionId){
 if(!enginesEnabled(s))return {};
 const structures=(s.c50?.structures??[]).filter(o=>o.factionId===factionId||s.knowledge[factionId]?.tiles[o.tileId]==='VISIBLE').map(o=>({id:o.id,type:o.type,name:structureNames[o.type],tileId:o.tileId,factionId:o.factionId,hp:o.hp,maxHp:o.maxHp}));
 const warnings=live(s).filter(a=>a.c50?.warning&&(a.factionId===factionId||visible(s,{factionId},a))).map(a=>({sourceId:a.armyId,factionId:a.factionId,tileId:a.c50.warning.tileId,tiles:a.c50.warning.tiles.filter(at=>a.factionId===factionId||s.knowledge[factionId]?.tiles[at]==='VISIBLE'),name:a.c50.warning.action==='WARN_FIRE'?'화공 예고':'교란 예고'}));
 const marks=live(s).filter(a=>a.c50?.mark&&s.armies[a.c50.mark.targetId]&&(a.factionId===factionId||s.armies[a.c50.mark.targetId].factionId===factionId||visible(s,{factionId},a)&&visible(s,{factionId},s.armies[a.c50.mark.targetId]))).map(a=>({targetId:a.c50.mark.targetId,tileId:s.armies[a.c50.mark.targetId].tileId,factionId:a.factionId}));
 const traps=live(s).filter(a=>a.c50?.trap&&(a.factionId===factionId||s.knowledge[factionId]?.tiles[a.c50.trap.tileId]==='VISIBLE')).map(a=>({...(a.factionId===factionId||visible(s,{factionId},a)?{sourceId:a.armyId}:{}),factionId:a.factionId,tileId:a.c50.trap.tileId,n:a.c50.trap.n,action:a.c50.trap.action,expires:a.c50.trap.expires}));
 for(const t of traps)warnings.push({sourceId:'trap:'+t.tileId,factionId:t.factionId,tiles:[t.tileId],name:t.action==='TRAP_FIRE'?'화공 함정':'교란 함정'});
 for(const a of live(s))for(const [key,name] of [['flag','군기'],['passage','통로'],['depot','보급소']]){const at=typeof a.c50?.[key]==='string'?a.c50[key]:a.c50?.[key]?.tileId;if(at&&(a.factionId===factionId||s.knowledge[factionId]?.tiles[at]==='VISIBLE'))warnings.push({sourceId:`${key}:${at}`,factionId:a.factionId,tiles:[at],name});}
 return {structures,warnings,marks,traps};
}
function mapAiActions(s,id){
 const a=s.armies[id],e=armyEngine(s,id),actions=engineActions(s,id).filter(o=>o.canUse),foes=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b)),rows=[];
 const choose=(action,targetId)=>{const av=actions.find(o=>o.action===action);if(av?.targets.includes(targetId))rows.push({action,targetId});};
 if(e.engineId==='CHAEK'&&e.resource>=2){const av=actions.find(o=>o.action==='WARN_FIRE'),at=av?.targets.find(at=>foes.filter(b=>tileDistance(s,at,b.tileId)<=1).length>=1);if(at)choose('WARN_FIRE',at);}
 if(e.engineId==='CHUKSEONG'){const chip=actions.find(o=>o.action==='CHIP');if(chip)choose('CHIP',chip.targets[0]);else if(foes.length){const av=actions.find(o=>o.action==='PALISADE'),at=av?.targets.sort((x,y)=>Math.min(...foes.map(b=>tileDistance(s,x,b.tileId)))-Math.min(...foes.map(b=>tileDistance(s,y,b.tileId))))[0];if(at)choose('PALISADE',at);}}
  if(e.engineId==='CHEOK'&&a.c50.hidden&&!engineApi.targets(s,id).length){const av=actions.find(o=>o.action==='SCOUT'),target=av?.targets.find(t=>live(s).some(b=>b.armyId!==id&&friendly(a,b)&&!s.endedArmyIds.includes(b.armyId)&&engineApi.targets(s,b.armyId).includes(t)));if(target)choose('SCOUT',target);}
  if(e.engineId==='JEONNONG'&&e.resource>=1){const av=actions.find(o=>o.action==='CART'),allies=live(s).filter(b=>b.armyId!==id&&friendly(a,b)&&b.woundedCount>0).sort((b,c)=>c.woundedCount-b.woundedCount);for(const ally of allies){const reach=engineApi.remainingReachable(s,ally.armyId,s.time.ticksPerTurn);const at=av?.targets.find(at=>reach.includes(at)&&tileDistance(s,at,ally.tileId)===1);if(at){choose('CART',at);break;}}}
 if(e.archer&&e.engineId==='MAENG'&&e.resource>=2)choose('FLURRY',actions.find(o=>o.action==='FLURRY')?.targets[0]);
 if(e.archer&&e.engineId==='GANG'&&foes.some(b=>distance(s,a,b)<=3&&(engineApi.side(s,b.armyId,id)==='FRONT')!==branched(s,a,'BAESU')))choose('RETURN_FIRE',id);
 if(e.archer&&e.engineId==='TU'){if(!validRelation(s,a)){const av=actions.find(o=>o.action==='RIVAL'),target=av?.targets.sort((x,y)=>s.armies[x].troopCount-s.armies[y].troopCount)[0];if(target)choose('RIVAL',target);}else if(e.resource>=2)choose('STRIKE',validRelation(s,a).armyId);}
 return rows;
}
function engineRangedReaction(s,id,targetId,fromTileId=null,outer=null){
 const a=s.armies[id],r=a.c50.reservations.RETURN_FIRE;if(!r||!usable(s,a)||!engineShotLegal(s,id,targetId,{fromTileId})||(engineShotLegal(s,id,targetId,{fromTileId,facing:r.facing})===branched(s,a,'BAESU'))||s.knowledge[a.factionId]?.tiles[s.armies[targetId].tileId]!=='VISIBLE')return false;
 delete a.c50.reservations.RETURN_FIRE;a.c50.resource=Math.max(0,a.c50.resource-r.n);a.c50.reactionKeys??={};a.c50.reactionKeys[`${s.turn}:${targetId}`]=true;
 const target=s.armies[targetId],at=target.tileId;if(fromTileId)target.tileId=fromTileId;
 const pre=target.formation,many=live(s).filter(b=>hostile(s,a,b)&&engineShotLegal(s,id,b.armyId)).length>=2;
 const out=engineApi.attack(s,id,targetId,null,{reaction:true,enginePaid:true,engineOrigin:r.spend,damageRatio:r.n*params('GANG').counterRatio});adoptEngineState(s,out);s.armies[targetId].tileId=at;
 if(many)merit(s,s.armies[id],'BAESU',targetId,r.spend);if(formationDrop(pre,s.armies[targetId].formation))merit(s,s.armies[id],'YEOKSEUP',targetId,r.spend);
 if(outer){outer.allyLoss+=s.lastCombat.enemyLoss;outer.formationChanges.push(...s.lastCombat.formationChanges);outer.moraleChanges.push(...s.lastCombat.moraleChanges);outer.engineCounter=s.lastCombat;s.lastCombat=outer;}return true;
}
// Invoked before each voluntary edge. Forced arrivals never call this hook.
export function engineBeforeMove(s,id,from,to){
 if(!enginesEnabled(s)||from===to)return s;
 for(const u of live(s)){const r=u.c50?.reservations.PIN;if(!r||!usable(s,u)||r.targetId!==id||!hostile(s,u,s.armies[id]))continue;const arch=armyEngine(s,u.armyId)?.archer;if((arch?engineShotLegal(s,u.armyId,id,{fromTileId:from})&&tileDistance(s,u.tileId,to)>2:tileDistance(s,u.tileId,from)===1&&tileDistance(s,u.tileId,to)>1)){delete u.c50.reservations.PIN;s.armies[id].c50.moveStopped=true;return s;}}
 for(const original of live(s).filter(a=>a.armyId!==id).sort((a,b)=>a.armyId.localeCompare(b.armyId))){const a=s.armies[original.armyId],m=s.armies[id];if(!hostile(s,a,m)||!visible(s,a,m))continue;
  const r=a.c50?.reservations.RETURN_FIRE;
  if(r&&tileDistance(s,a.tileId,from)<=2&&tileDistance(s,a.tileId,to)===1)engineRangedReaction(s,a.armyId,id,from);
  const relation=a.c50?.relation;if(kind(s,a,'TU')&&!branched(s,a,'GYEONJE')&&armyEngine(s,a.armyId)?.archer&&relation?.targetId===id&&!relation.pursued&&engineShotLegal(s,a.armyId,id,{fromTileId:from})&&tileDistance(s,a.tileId,to)>2){
   const n=a.c50.resource,spend=`tracking:${s.turn}:${s.battleSequence}:${a.armyId}`;a.c50.resource=0;relation.pursued=true;
   const out=engineApi.attack(s,a.armyId,id,null,{reaction:true,enginePaid:true,engineOrigin:spend,engineFormation:n});adoptEngineState(s,out);if(n>0)merit(s,s.armies[a.armyId],'GYEONJE',id,spend);
  }
 }
 return s;
}
export function engineReactionUsed(s,id,targetId){return !!s.armies[id]?.c50?.reactionKeys?.[`${s.turn}:${targetId}`];}
export function engineArriveReaction(s,id,from){
 if(!enginesEnabled(s)||!active(s,s.armies[id])||from===s.armies[id].tileId)return s;
 for(const a of live(s).filter(a=>a.armyId!==id).sort((a,b)=>a.armyId.localeCompare(b.armyId))){const r=a.c50?.reservations.RETURN_FIRE;
  if(r&&hostile(s,a,s.armies[id])&&visible(s,a,s.armies[id])&&tileDistance(s,a.tileId,s.armies[id].tileId)===2)engineRangedReaction(s,a.armyId,id);
 }return s;
}

function adoptEngineState(s,next){for(const [id,a] of Object.entries(s.armies)){Object.assign(a,next.armies[id]);next.armies[id]=a;}Object.assign(s,next);return s;}

export function engineAiHold(s,id){
 const a=s.armies[id];if(!kind(s,a,'CHEOK')||a.c50.hidden||a.c50.hideBlockedThrough>=s.turn||!['forest','hill'].includes(s.tiles[a.tileId].terrainType))return false;
 const enemies=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b));
 const cities=Object.values(s.knowledge[a.factionId]?.cities??{}).filter(c=>c.ownerFactionId&&engineApi.hostileFaction(s,a.factionId,c.ownerFactionId));
 return !engineApi.targets(s,id).length&&!enemies.some(b=>distance(s,a,b)<=3)&&!engineApi.fireAt(s,a.tileId)&&(enemies.some(b=>distance(s,a,b)<=6)||!cities.some(c=>tileDistance(s,a.tileId,c.tileId)<=10));
}

// Public-board estimate only: actual concealment remains the rule event's job.
export function engineAiCoverValue(s,id,to){
 const a=s.armies[id];if(!kind(s,a,'CHEOK')||a.c50.hidden||a.c50.hideBlockedThrough>=s.turn||!['forest','hill'].includes(s.tiles[to]?.terrainType)||engineApi.fireAt(s,to))return 0;
 const foes=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b));
 if(foes.some(b=>distance(s,{tileId:to},b)<=1))return 0;
 const vision=s.mapRules.vision,tiles=vision.profile==='CAMPAIGN_V1'?s.tiles:null;
 const sees=(at,range)=>canObserveTile(s.tiles[at],s.tiles[to],range,tiles);
 if(foes.some(b=>sees(b.tileId,(vision.byTroop?.[b.troopType]??vision.field)+(s.tiles[b.tileId].terrainType==='hill'?vision.hillBonus:0))))return 0;
 const cities=Object.values(s.knowledge[a.factionId]?.cities??{}).filter(c=>c.ownerFactionId&&engineApi.hostileFaction(s,a.factionId,c.ownerFactionId));
 return cities.some(c=>sees(c.tileId,vision.city+(s.tiles[c.tileId].terrainType==='hill'?vision.hillBonus:0)))?0:40;
}

export function engineAiCoverDestination(s,id,path,reachable){
 const a=s.armies[id];if(!kind(s,a,'CHEOK')||engineApi.targets(s,id).length||!path?.length)return null;
 const goal=path.at(-1);
 return [...reachable].filter(([at])=>at!==a.tileId&&engineAiCoverValue(s,id,at)>0&&Math.min(...path.map(p=>tileDistance(s,at,p)))<=2&&tileDistance(s,at,goal)<=tileDistance(s,a.tileId,goal))
  .sort(([at],[bt])=>tileDistance(s,a.tileId,at)-tileDistance(s,a.tileId,bt)||tileDistance(s,at,goal)-tileDistance(s,bt,goal)||at.localeCompare(bt))[0]?.[0]??null;
}

// C233: rule descriptions transcribed from standard 50 v1.0 section 6-2.
const promotionText={
 "광장": {
  "seal": "연타 W",
  "rule": "W = 광분 돌입: 돌입하는 W 자체가 첫 2연타(각 0.6), 광분 차례 수 = 쓴 기세 n(돌입 차례 포함). 광분 중 일반공격이 2연타 · 기세 안 오름. 끝나면 내 전열 한 단계 하락. 궁병판: 2연사"
 },
 "용장": {
  "seal": "패시브(이동 뒤 전열 +1)",
  "rule": "W 가 연타 또는 위압: 기세 n 전부, 선언 때 지정한 인접 적 n 부대까지 사기 한 단계 하락 판정(성공률 예고에 표시). 궁병판: 사거리 안 · 사선"
 },
 "배수장": {
  "seal": "정면 감소",
  "rule": "버팀 = 측면 · 후방에서 받은 공격으로(정면 X). 버팀 2+ 면 강장 고유의 측면 피해 증가만 사라짐(기본 측후방 보정은 그대로). 반격 자세 = 측후방에서 처음 친 적에게. 포대: 측후방 피격으로 버팀, 응사도 측후방 첫 적(사거리 · 사선 그대로)"
 },
 "역습장": {
  "seal": "반격 자세(예약)",
  "rule": "W = 역습: 버팀 n 전부로 정면 적 하나를 쳐 기본 공격 1 + 전열 손상 n단계, 이 공격엔 반격 없음. 포대: 정면 사거리 안 · 사선 적에게 정조준 일제 사격"
 },
 "구원장": {
  "seal": "패시브 대신 맞기",
  "rule": "충의 = 연결 아군이 적과 붙은 채 차례를 끝낼 때 +1. W = 충의 2 로 붙어 있는 연결 아군과 자리 바꾸기(둘 다 이동권 안 씀 · 이탈 추격 없음 · 서로의 칸에 설 수 있는 지형일 때만)"
 },
 "응징장": {
  "seal": "막기 W",
  "rule": "연결 아군을 친 최근 적 하나에 원한(새 원한이 덮음, 다음 내 차례 끝 만료). W = 원한 치기: 충의 n 전부, 선언 때 원한 적을 고정, 내 남은 이동으로 그 적에 인접한 빈 칸까지 가서 친다 — 이 이동은 이탈 추격만 면제(접근사격은 정상), 피해 + n × 0.3"
 },
 "견제장": {
  "seal": "투지 치기 · 이탈 추격 보너스",
  "rule": "W = 이탈 막기(예약): 투지 n 전부(최소 1). 다음 적 구간에 맞수가 자발로 떠나려 하면 떠나기 전 칸에서 멈춘다(1회). 조준: \"발 묶기 사격\" — 맞수가 사거리 밖으로 나가려 하면 사거리 안 마지막 칸에서 멈춤"
 },
 "선봉장": {
  "seal": "내 투지 치기",
  "rule": "아군이 맞수를 공격할 때 \"투지 쓰기\"를 고를 수 있다(자동 아님): 투지 전부를 써 그 공격에 전열 손상 + 투지 수 단계. 이탈 추격은 그대로. 조준: \"표적 지시\""
 },
 "군기장": {
  "seal": "따라다니는 영",
  "rule": "영의 원점 = 군기 칸. 꽂기 = W(지휘령 0, 인접 빈 칸) · 뽑기 = W(뽑으면 다시 꽂을 때까지 영 없음). 지휘령은 군기 범위 안 아군 적중으로"
 },
 "독전장": {
  "seal": "상시 영 · 영 바꾸기",
  "rule": "W = 군령: 지휘령 1, 범위 안 아군 하나에게 — 다음 이동 이탈 추격 면제 또는 다음 공격 1회 측면 판정(다음 내 차례 끝 만료)"
 },
 "궤계": {
  "seal": "넓은 범위 · 분배",
  "rule": "예고 대신 함정 하나: 계책 n, 사거리 3 의 빈 칸, 공개. 적이 그 칸에 들어오는 순간(강제 변위 포함) 위력 n 의 화공 / 교란(설치 때 정함). 다음 내 차례 끝 만료. 새 함정이 옛것을 지움"
 },
 "군사": {
  "seal": "화공",
  "rule": "W 에 간파: 계책 1, 사거리 3 · 시야 안의 공개된 미발동 예약 하나(적 부대에 걸린 반격 자세 · 응사 · 막기 · 이탈 막기, 또는 적의 예고 · 함정 칸)를 해제. 교란은 그대로"
 },
 "공성장": {
  "seal": "목책 · 진지 · 다리 공사 · 패시브 · \"이동 안 한 차례 +1\"",
  "rule": "자재 = 적 성 · 구조물에 붙은 채 차례 끝 +1(허물기 +2 그대로). W 에 수비 끊기: 자재 2, 붙은 성 하나 — 다음 내 진영 차례 동안 그 성 수비 부대의 성벽 방어 보정 없음. 깎기 그대로"
 },
 "공병장": {
  "seal": "패시브(정면 선제)",
  "rule": "다리 → 통로(자재 2): 강 · 숲 · 언덕 한 칸을 평지처럼(양쪽 다 씀), 다음 내 차례 끝 만료. 위에 부대가 있으면 비워질 때 사라지되 최대 한 차례 연장, 그 뒤 강이면 가장 가까운 육지로 밀려남"
 },
 "탐마": {
  "seal": "숨은 공격의 반격 없음",
  "rule": "정탐해도 숨음 유지(표식 규칙 그대로)"
 },
 "복병장": {
  "seal": "잠행",
  "rule": "W = 숨은 채 붙어 있는 아군 하나와 숨음 공유(주 행동). 그 아군도 숨고 숨은 공격 반격 없음도 받는다. 둘 중 하나가 공격 · 발견되거나 둘이 떨어지면 둘 다 드러남"
 },
 "후송장": {
  "seal": "즉시 회복",
  "rule": "수레에 들어선 아군은 회복이 예약된다(수레 칸에 머물 필요 없음): 다음 자기 차례 시작에 적과 붙어 있지 않고 그 사이 전열이 붕괴하지 않았으면 용량 × 1.5 회복, 아니면 깨짐"
 },
 "둔전장": {
  "seal": "패시브(군량 감소)",
  "rule": "수레 → 보급소: 설치 차례엔 회복 없음, 그 칸에서 차례를 끝낸 아군에게 다음 내 차례 끝 · 그다음 끝 두 번(첫 회 올림 · 둘째 내림, 합 = 용량). 두 번째 회복 뒤 사라짐"
 },
 "근신": {
  "seal": "범위 오라",
  "rule": "오라 → 신임 하나(출진 때 지정, 바꾸기 = W + 인망 1): 시야 안 어디 있든 패주하지 않음(차례에 한 번, 해방 뒤 다음 내 차례 시작까지 꺼짐). 인망 사건 = 신임 2칸 안 적 붕괴 · 패주 · 신임의 동요 → 안정(각 구간에 한 번)"
 },
 "세객": {
  "seal": "해방",
  "rule": "W = 설득: 인망 2+ 전부, 2칸 안 · 시야 안 동요 이하 적 하나 — 대상의 다음 자기 차례 동안 공격 불가(이동 · 방어는 됨). 대상이 안정까지 회복하면 즉시 풀림"
 }
};

export function promotionBranches(s,id){
 if(!enginesEnabled(s))return [];
 const x=s.campaignGrowth?.officers[id]?.c50,d=definitions.get(x?.engineId);
 if(!x||x.path)return [];
 const branches=d?.branches??[],earned=branches.filter(b=>(x.merits[b.id]??0)>=data.common.meritToUnlock),max=Math.max(0,...branches.map(b=>x.merits[b.id]??0));
 return (earned.length?earned:s.turn>=meritGuaranteeTurn?branches.filter(b=>(x.merits[b.id]??0)===max):[]).map(b=>({...b,...promotionText[b.name],count:x.merits[b.id]??0,goal:data.common.meritToUnlock}));
}
// Trial: thirteen completed campaign turns, independent of level-up frequency.
export const meritGuaranteeTurn=14;
export function offerPromotion(s,id,level){
 if(!enginesEnabled(s))return;
 const x=s.campaignGrowth?.officers[id]?.c50;if(!x||x.path||x.promotion||!promotionBranches(s,id).length)return;
 x.promotion={level,branches:promotionBranches(s,id).map(b=>b.id)};
 x.promotionOffered=true;
}
export function pendingPromotion(s,id){
 if(!enginesEnabled(s))return null;
 const x=s.campaignGrowth?.officers[id]?.c50,p=x?.promotion;if(!p||x.path)return null;
 const branches=promotionBranches(s,id).filter(b=>p.branches.includes(b.id));
 const cards=branches.map(b=>({traitId:b.id,name:b.name,kind:'promotion',rarity:'LEGENDARY',axis:b.axis,seal:b.seal,text:b.rule,count:b.count,goal:b.goal}));
 cards.push({traitId:'BASE',name:'기본 유지',kind:'promotion',rarity:'LEGENDARY',text:'다 지킨다 · 자원 상한 4'});
 return {officerId:id,draft:{draftId:`PROMOTION.${id}.L${p.level}`,promotion:true,contextSnapshot:{levelAfter:p.level},offeredIds:cards.map(c=>c.traitId),eligibleCandidateSnapshot:[],rerollLimit:0,rerollCount:0},cards};
}
export function selectPromotion(s,id,key){
 const x=s.campaignGrowth?.officers[id]?.c50,p=pendingPromotion(s,id);if(!p)throw new Error('INVALID_PROMOTION');
 if(key!=='LATER'&&!p.cards.some(c=>c.traitId===key))throw new Error('PROMOTION_NOT_OFFERED');
 if(key!=='LATER'){x.path=key;for(const a of Object.values(s.armies).filter(a=>a.commanderId===id)){a.c50.reservations={};delete a.c50.warning;delete a.c50.mark;if(key==='GUKSA.GEUNSIN')a.c50.trust=live(s).filter(b=>friendly(a,b)&&b.armyId!==a.armyId).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0]?.armyId??null;}}delete x.promotion;
}
export function aiPromotionChoice(s,id){
 const best=promotionBranches(s,id).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id))[0];
 return best?(best.count===0?'BASE':best.id):'LATER';
}
const pathOf=(s,a)=>s.campaignGrowth?.officers[a?.commanderId]?.c50?.path??a?.c50?.path??null;
const branched=(s,a,key)=>pathOf(s,a)?.split('.')[1]===key;
const sealedActions={GWANGJANG:['FLURRY'],YEOKSEUP:['COUNTER','RETURN_FIRE'],GUWON:['BLOCK'],EUNGJING:['BLOCK'],GYEONJE:['STRIKE'],SEONBONG:['STRIKE'],GUNGI:[],DOKJEON:['ORDER'],GWEGYE:['WARN_FIRE','WARN_ROOT','WARN_MORALE'],GUNSA:['WARN_FIRE'],GONGSEONG:['PALISADE','CAMP','BRIDGE'],GONGBYEONG:['BRIDGE'],BOKBYEONG:['STEALTH'],DUNJEON:['CART'],GEUNSIN:[],SEGAEK:['RELEASE']};
const branchActions={GWANGJANG:[['FRENZY','광분 돌입']],YONGJANG:[['INTIMIDATE','위압']],YEOKSEUP:[['REVENGE','역습']],GUWON:[['RESCUE','자리 바꾸기']],EUNGJING:[['VENGEANCE','원한 치기']],GYEONJE:[['PIN','이탈 막기']],SEONBONG:[['LEND','투지 쓰기']],GUNGI:[['FLAG','군기 꽂기'],['UNFLAG','군기 뽑기']],DOKJEON:[['DIRECT_FLANK','군령 · 측면'],['DIRECT_MOVE','군령 · 이동']],GWEGYE:[['TRAP_FIRE','함정 · 화공'],['TRAP_MORALE','함정 · 교란']],GUNSA:[['DISPEL','간파']],GONGSEONG:[['BREACH','수비 끊기']],GONGBYEONG:[['PASSAGE','통로']],BOKBYEONG:[['SHARE_HIDE','숨음 공유']],DUNJEON:[['DEPOT','보급소']],GEUNSIN:[['TRUST','신임 바꾸기']],SEGAEK:[['PERSUADE','설득']]};
const promotionActions=new Set(Object.values(branchActions).flat().map(([id])=>id));
function branchAllows(s,a,action){return !(sealedActions[pathOf(s,a)?.split('.')[1]]??[]).includes(action);}

function siegeAdjacent(s,a){return Object.values(s.cities).some(c=>c.ownerFactionId&&engineApi.hostileFaction(s,a.factionId,c.ownerFactionId)&&tileDistance(s,a.tileId,c.tileId)===1)||(s.c50.structures??[]).some(o=>engineApi.hostileFaction(s,a.factionId,o.factionId)&&tileDistance(s,a.tileId,o.tileId)===1);}
const engaged=(s,a)=>live(s).some(b=>hostile(s,a,b)&&distance(s,a,b)===1);
function promotionAvailability(s,id,action){
 const a=s.armies[id],e=armyEngine(s,id),bad=reasonCode=>({canUse:false,reasonCode,reasonText:{ENGINE_RESOURCE:'계통 자원이 부족합니다',MAIN_ACTION_USED:'이번 차례 주 행동을 마쳤습니다',NO_ENGINE_TARGET:'지금 사용할 수 있는 대상이 없습니다'}[reasonCode]??'지금 사용할 수 없는 행동입니다',targets:[]});
 if(!e||!branchActions[pathOf(s,a)?.split('.')[1]]?.some(([key])=>key===action))return bad('INVALID_ENGINE_ACTION');
 if(engineAttackBlocked(s,id)&&['FRENZY','REVENGE','INTIMIDATE','VENGEANCE','LEND','PERSUADE','TRAP_FIRE','TRAP_MORALE'].includes(action))return bad('ENGINE_PERSUADED');
 if(!usable(s,a))return bad('ENGINE_DISABLED');if(!engineApi.canAct(s,id))return bad('MAIN_ACTION_USED');
 const cost={RESCUE:2,FLAG:0,UNFLAG:0,BREACH:2,PASSAGE:2,SHARE_HIDE:0,PERSUADE:2}[action]??1;
 if(e.resource<cost)return bad('ENGINE_RESOURCE');
 const allies=live(s).filter(b=>b.armyId!==id&&friendly(a,b)),foes=live(s).filter(b=>hostile(s,a,b)&&visible(s,a,b));let targets=[];
 const attackable=b=>e.archer?engineShotLegal(s,id,b.armyId):distance(s,a,b)===1;
 if(['FRENZY','REVENGE','INTIMIDATE'].includes(action))targets=foes.filter(b=>attackable(b)&&(action!=='REVENGE'||engineApi.side(s,b.armyId,id)==='FRONT')).map(b=>b.armyId);
 if(action==='FRENZY'&&a.c50.frenzy)targets=[];
 if(action==='RESCUE'){const t=validRelation(s,a);if(t&&distance(s,a,t)===1&&engineApi.swapLegal?.(s,id,t.armyId))targets=[t.armyId];}
 if(action==='VENGEANCE'){const t=s.armies[a.c50.grudge?.targetId];if(t&&visible(s,a,t)&&a.c50.grudge.expires>=s.turn&&vengeanceDestinations(s,a,t).length)targets=[t.armyId];}
 if(action==='PIN'&&validRelation(s,a))targets=[validRelation(s,a).armyId];
 // The ally declares the attack explicitly through this W choice; no automatic resource lending.
 if(action==='LEND'){const t=validRelation(s,a);if(t)targets=allies.filter(b=>engineApi.canAct(s,b.armyId)&&engineApi.targets(s,b.armyId).includes(t.armyId)).map(b=>b.armyId);}
 if(['DIRECT_FLANK','DIRECT_MOVE','TRUST'].includes(action))targets=(action==='TRUST'?allies.filter(b=>visible(s,a,b)):directTargets(s,a)).map(b=>b.armyId);
 if(action==='FLAG'&&!a.c50.flag)targets=adjacent(s,a.tileId).filter(at=>empty(s,at)&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE');
 if(action==='UNFLAG'&&a.c50.flag)targets=[id];
 if(['TRAP_FIRE','TRAP_MORALE','PASSAGE','DEPOT'].includes(action))targets=Object.keys(s.tiles).filter(at=>s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'&&tileDistance(s,a.tileId,at)<=(action.startsWith('TRAP')?3:1)&&empty(s,at)&&!engineApi.fireAt(s,at)&&(action!=='PASSAGE'||['forest','hill'].includes(s.tiles[at].terrainType)||s.mapRules.riverEdges.some(edge=>edge.split('|').includes(at))));
 if(action==='DEPOT')targets=targets.filter(at=>tileDistance(s,a.tileId,at)===1&&!['mountain','water'].includes(s.tiles[at].terrainType));
 if(action==='DISPEL')targets=[...foes.filter(b=>tileDistance(s,a.tileId,b.tileId)<=3&&Object.keys(b.c50?.reservations??{}).some(k=>k!=='RETURN_FIRE')).map(b=>b.armyId),...live(s).filter(b=>hostile(s,a,b)).flatMap(b=>[b.c50?.warning?.tileId,b.c50?.trap?.tileId].filter(at=>at&&tileDistance(s,a.tileId,at)<=3&&s.knowledge[a.factionId]?.tiles[at]==='VISIBLE'))];
 if(action==='DISPEL')targets=[...new Set([...targets,...(s.c50.publicTraps??[]).filter(t=>t.factionId!==a.factionId&&tileDistance(s,a.tileId,t.tileId)<=3).map(t=>t.tileId),...(s.c50.publicWarnings??[]).filter(t=>t.factionId!==a.factionId&&t.tileId&&tileDistance(s,a.tileId,t.tileId)<=3&&s.knowledge[a.factionId]?.tiles[t.tileId]==='VISIBLE').map(t=>t.tileId)])];
 if(action==='BREACH')targets=Object.values(s.cities).filter(c=>c.ownerFactionId&&engineApi.hostileFaction(s,a.factionId,c.ownerFactionId)&&tileDistance(s,a.tileId,c.tileId)===1&&s.knowledge[a.factionId]?.tiles[c.tileId]==='VISIBLE').map(c=>c.cityId);
 if(action==='SHARE_HIDE'&&a.c50.hidden&&!a.c50.sharedHide)targets=allies.filter(b=>distance(s,a,b)===1&&!b.c50.sharedHide).map(b=>b.armyId);
 if(action==='PERSUADE')targets=foes.filter(b=>distance(s,a,b)<=2&&b.morale!=='STEADY').map(b=>b.armyId);
 return targets.length?{canUse:true,reasonCode:'',reasonText:'',targets:targets.sort(),...(action==='INTIMIDATE'?{targetChances:Object.fromEntries(targets.map(t=>[t,engineApi.moraleDropChance(s,t,'위압',engineApi.collapseWeight)]))}:{})}:bad('NO_ENGINE_TARGET');
}
function vengeanceDestinations(s,a,t){return [a.tileId,...(!s.movedArmyIds.includes(a.armyId)?engineApi.remainingReachable(s,a.armyId,s.time.ticksPerTurn):[])].filter(at=>tileDistance(s,at,t.tileId)===1&&(at===a.tileId||empty(s,at)));}
function resolvePromotionAction(state,id,action,targetId,options){
 const av=promotionAvailability(state,id,action);if(!av.canUse)throw new Error(av.reasonCode);targetId??=av.targets.length===1?av.targets[0]:null;if(!av.targets.includes(targetId))throw new Error('INVALID_ENGINE_TARGET');
 let s=structuredClone(state),a=s.armies[id],x=a.c50,n=x.resource;const spend=`${s.turn}:${id}:${s.battleSequence}:${a.mainActionCount??0}:${action}`;
 s.c50.context={attackerId:id,origin:spend};
 if(action==='FRENZY'){x.frenzy={remaining:n,turn:s.turn};x.resource=0;for(let i=0;i<2;i++){if(!active(s,s.armies[id])||!active(s,s.armies[targetId]))break;s=engineApi.attack(s,id,targetId,null,{enginePaid:true,engineOrigin:spend,damageRatio:.6});}}
 if(action==='INTIMIDATE'){const ids=options.targetIds??[targetId];if(!Array.isArray(ids)||ids.length>n||new Set(ids).size!==ids.length||ids[0]!==targetId||ids.some(t=>!av.targets.includes(t)))throw new Error('INVALID_ENGINE_TARGET');x.resource=0;for(const t of ids)engineApi.checkMorale(s,t,'위압',engineApi.intimidateWeight??engineApi.collapseWeight,[]);}
 if(action==='REVENGE'){x.resource=0;s=engineApi.attack(s,id,targetId,null,{enginePaid:true,engineOrigin:spend,engineFormation:n,noCounter:true});}
 if(action==='RESCUE'){const t=s.armies[targetId];[a.tileId,t.tileId]=[t.tileId,a.tileId];x.resource-=2;engineEvent(s,'ARRIVE',{armyId:id,fromTileId:t.tileId});engineEvent(s,'ARRIVE',{armyId:targetId,fromTileId:a.tileId});}
 if(action==='VENGEANCE'){const t=s.armies[targetId],dest=options.destinationTileId??vengeanceDestinations(s,a,t)[0];if(!vengeanceDestinations(s,a,t).includes(dest))throw new Error('INVALID_ENGINE_TARGET');x.resource=0;delete x.grudge;x.noPursuit=true;if(dest!==a.tileId)s=engineApi.move(s,id,dest);delete s.armies[id].c50.noPursuit;if(active(s,s.armies[id])&&engineApi.targets(s,id).includes(targetId))s=engineApi.attack(s,id,targetId,null,{enginePaid:true,engineOrigin:spend,damageRatio:1+n*.3});}
 if(action==='PIN'){x.resource=0;x.reservations.PIN={targetId,n,turn:s.turn,spend};}
 if(action==='LEND'){const rival=validRelation(s,a).armyId;x.resource=0;s=engineApi.attack(s,targetId,rival,null,{engineFormation:n});engineApi.consume(s,targetId,{attack:true});}
 if(action==='FLAG')x.flag=targetId;if(action==='UNFLAG')delete x.flag;
 if(action.startsWith('DIRECT_')){x.resource--;const t=s.armies[targetId];t.c50.direct={sourceId:id,type:action==='DIRECT_FLANK'?'FLANK':'MOVE',expires:s.turn+1};}
 if(action.startsWith('TRAP')){x.resource=0;x.trap={tileId:targetId,n,action,expires:s.turn+1,spend};}
 if(action==='DISPEL'){x.resource--;const t=s.armies[targetId];if(t){const key=Object.keys(t.c50.reservations).filter(k=>k!=='RETURN_FIRE').sort()[0];delete t.c50.reservations[key];}else {const source=live(s).filter(b=>hostile(s,a,b)).sort((a,b)=>a.armyId.localeCompare(b.armyId)).find(b=>b.c50?.warning?.tileId===targetId||b.c50?.trap?.tileId===targetId);if(source.c50.warning?.tileId===targetId)delete source.c50.warning;else delete source.c50.trap;}}
 if(action==='BREACH'){x.resource-=2;x.breach={cityId:targetId,starts:s.turn+1,expires:s.turn+1};}
 if(action==='PASSAGE'){x.resource-=2;x.passage={tileId:targetId,expires:s.turn+1};}
 if(action==='SHARE_HIDE'){x.sharedHide=targetId;const t=s.armies[targetId];t.c50.sharedHide=id;t.c50.hidden=true;}
 if(action==='DEPOT'){x.resource=0;x.depot={tileId:targetId,n,created:s.turn,ticks:0};}
 if(action==='TRUST'){x.resource--;x.trust=targetId;}
 if(action==='PERSUADE'){x.resource=0;s.armies[targetId].c50.persuaded={sourceId:id,started:false};}
 engineApi.consume(s,id,{attack:['FRENZY','REVENGE','VENGEANCE'].includes(action)});
 s.c50.actionCounts??={};s.c50.actionCounts[a.factionId]=(s.c50.actionCounts[a.factionId]??0)+1;
 s.c50.engineActionCounts??={};const key=armyEngine(s,id).engineId+(armyEngine(s,id).archer?'.ARCHER':'');s.c50.engineActionCounts[key]=(s.c50.engineActionCounts[key]??0)+1;
 s.c50.armyActionCounts??={};s.c50.armyActionCounts[id]=(s.c50.armyActionCounts[id]??0)+1;
 s.c50.lastAction={armyId:id,action,targetId,turn:s.turn};delete s.c50.context;return s;
}
export function engineAttackBlocked(s,id){const a=s.armies[id];return enginesEnabled(s)&&!!a?.c50?.persuaded&&a.morale!=='STEADY';}
export function engineWallDisabled(s,a){return enginesEnabled(s)&&live(s).some(u=>u.factionId!==a.factionId&&u.c50?.breach&&u.c50.breach.starts===s.turn&&u.c50.breach.expires>=s.turn&&(s.activeFactionId??(s.phase==='PLAYER'?s.playerFactionId:null))===u.factionId&&Object.values(s.cities).some(c=>c.cityId===u.c50.breach.cityId&&(c.tileId===a.tileId||c.footprint?.walls?.includes(a.tileId)||c.footprint?.gates?.includes(a.tileId))));}
export function engineNoPursuit(s,id){const a=s.armies[id];return enginesEnabled(s)&&(!!a?.c50?.noPursuit||a?.c50?.direct?.type==='MOVE'&&!sample4Separated(s,a.c50.direct.sourceId,id));}
function promotionAfterAttack(s,before,id,targetId,log,options){
 const a=s.armies[id],x=a.c50;
 if(x.direct?.type==='FLANK')delete x.direct;
 for(const g of live(s).filter(g=>branched(s,g,'EUNGJING')&&validRelation(s,g)?.armyId===targetId&&log.enemyLoss>0))g.c50.grudge={targetId:id,expires:s.turn+1};
 if(branched(s,a,'GWANGJANG')&&x.frenzy&&!options.enginePaid&&active(s,s.armies[targetId])){
  const result=engineApi.attack(s,id,targetId,null,{reaction:true,enginePaid:true,engineOrigin:`frenzy:${s.turn}:${log.sequence}`,damageRatio:.6});const extra=result.lastCombat;adoptEngineState(s,result);log.enemyLoss+=extra.enemyLoss;log.allyLoss+=extra.allyLoss;log.formationChanges.push(...extra.formationChanges);log.moraleChanges.push(...extra.moraleChanges);s.lastCombat=log;
 }
}
function promotionEvent(s,type,p){
 for(const u of Object.values(s.armies))if(u.c50&&!active(s,u))for(const key of ['frenzy','flag','grudge','trap','passage','depot','direct','evacuation','persuaded'])delete u.c50[key];
 const a=s.armies[p.armyId??p.attackerId];
 if(type==='FACTION_START')for(const u of live(s).filter(u=>u.factionId===p.factionId)){
  const x=u.c50;if(!x)continue;
  if(branched(s,u,'GEUNSIN')&&!x.trust)x.trust=live(s).filter(b=>b.armyId!==u.armyId&&friendly(u,b)).sort((a,b)=>a.armyId.localeCompare(b.armyId))[0]?.armyId??null;
  if(x.persuaded){if(x.persuaded.started)delete x.persuaded;else x.persuaded.started=true;}
  if(x.evacuation){if(u.formation!=='BROKEN'&&!engaged(s,u))engineApi.heal(s,u.armyId,x.evacuation.amount);delete x.evacuation;}
 }
 if(type==='FORMATION_CHANGE'&&p.to==='BROKEN'&&a?.c50)delete a.c50.evacuation;
 if(type==='MORALE_CHANGE'&&p.to==='STEADY'&&a?.c50)delete a.c50.persuaded;
 if(type==='FACTION_END')for(const u of live(s)){
  const x=u.c50;if(!x)continue;
  if(x.grudge&&u.factionId===p.factionId&&x.grudge.expires<=s.turn)delete x.grudge;
  if(x.direct&&s.armies[x.direct.sourceId]?.factionId===p.factionId&&x.direct.expires<=s.turn)delete x.direct;
  if(u.factionId!==p.factionId)continue;
  if(x.frenzy&&--x.frenzy.remaining<=0){delete x.frenzy;engineApi.formation(s,u.armyId,1,[]);}
  if(branched(s,u,'GUWON')){const t=validRelation(s,u);if(t&&engaged(s,t))gain(s,u);}
  if(x.trap?.expires<=s.turn)delete x.trap;
  if(x.breach?.expires<=s.turn)delete x.breach;
  if(x.passage?.expires<=s.turn){const at=x.passage.tileId,occupant=live(s).find(b=>b.tileId===at);if(!occupant)delete x.passage;else if(!x.passage.extended){x.passage.extended=true;x.passage.expires++;}else {const river=s.mapRules.riverEdges.some(edge=>edge.split('|').includes(at));if(river){const dest=Object.keys(s.tiles).filter(t=>t!==at&&!['water','mountain'].includes(s.tiles[t].terrainType)&&empty(s,t)).sort((a,b)=>tileDistance(s,at,a)-tileDistance(s,at,b)||a.localeCompare(b))[0];if(dest){const from=occupant.tileId;occupant.tileId=dest;engineEvent(s,'FORCED_MOVE',{armyId:occupant.armyId,fromTileId:from});}}delete x.passage;}}
  if(x.depot){const d=x.depot;
   if(!d.recipients){d.recipients={};for(const b of live(s).filter(b=>friendly(u,b)&&b.armyId!==u.armyId&&b.tileId===d.tileId)){const wounded=s.personnel.lots.filter(l=>l.kind==='WOUNDED'&&l.originFormationId===b.armyId).reduce((n,l)=>n+l.count,0);d.recipients[b.armyId]={capacity:Math.floor(wounded*d.n*params('JEONNONG').cartHealPerPoint/100)};}}
   else if(d.created<s.turn){for(const [id,r] of Object.entries(d.recipients)){const b=s.armies[id];if(active(s,b)&&friendly(u,b))engineApi.heal(s,id,d.ticks===0?Math.ceil(r.capacity/2):Math.floor(r.capacity/2));}if(++d.ticks>=2)delete x.depot;}
  }
 }
 if(['ARRIVE','FORCED_MOVE'].includes(type)&&a)for(const u of live(s)){
  const x=u.c50;
  if(x?.trap?.tileId===a.tileId&&hostile(s,u,a)){const trap=x.trap;delete x.trap;engineApi.damage(s,u.armyId,[{targetId:a.armyId,loss:Math.round(engineApi.baseDamage(s,u.armyId,a.armyId)*trap.n*params('CHAEK').powerPerPoint*(trap.action==='TRAP_FIRE'?1:.5))}],'ENGINE_TRAP',true);if(trap.action==='TRAP_FIRE')engineApi.fire(s,u.armyId,[trap.tileId]);else if(active(s,s.armies[a.armyId]))engineApi.morale(s,a.armyId,s.armies[a.armyId].morale==='STEADY'?'SHAKEN':'ROUTING','함정 교란');}
 }
 // Shared stealth breaks as a pair on attack, discovery, distance, death or rout.
 for(const u of Object.values(s.armies)){const partner=s.armies[u.c50?.sharedHide];if(!partner)continue;if(!active(s,u)||!active(s,partner)||distance(s,u,partner)!==1||!u.c50.hidden||!partner.c50.hidden||type==='ATTACK_DECLARE'&&[u.armyId,partner.armyId].includes(p.attackerId)){u.c50.hidden=false;partner.c50.hidden=false;delete u.c50.sharedHide;delete partner.c50.sharedHide;}}
}

function validatePromotionArmy(s,a){
 const x=a.c50,at=v=>typeof v==='string'&&!!s.tiles[v],unit=v=>typeof v==='string'&&!!s.armies[v],integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(x.frenzy&&(!branched(s,a,'GWANGJANG')||!object(x.frenzy)||!integer(x.frenzy.remaining,1,3)||!integer(x.frenzy.turn,1,s.turn)))fail();
 if(x.flag!==undefined&&(!branched(s,a,'GUNGI')||!at(x.flag)))fail();
 if(x.grudge&&(!branched(s,a,'EUNGJING')||!object(x.grudge)||!unit(x.grudge.targetId)||!integer(x.grudge.expires,s.turn)))fail();
 if(x.trap&&(!branched(s,a,'GWEGYE')||!object(x.trap)||!at(x.trap.tileId)||!integer(x.trap.n,1,3)||!['TRAP_FIRE','TRAP_MORALE'].includes(x.trap.action)||!integer(x.trap.expires,s.turn)||typeof x.trap.spend!=='string'))fail();
 if(x.breach&&(!branched(s,a,'GONGSEONG')||!s.cities[x.breach.cityId]||!integer(x.breach.starts,1)||!integer(x.breach.expires,s.turn)||x.breach.starts!==x.breach.expires))fail();
 if(x.passage&&(!branched(s,a,'GONGBYEONG')||!at(x.passage.tileId)||!integer(x.passage.expires,s.turn)||x.passage.extended!==undefined&&typeof x.passage.extended!=='boolean'))fail();
 if(x.depot&&(!branched(s,a,'DUNJEON')||!at(x.depot.tileId)||!integer(x.depot.n,1,3)||!integer(x.depot.created,1,s.turn)||!integer(x.depot.ticks,0,1)))fail();
 if(x.depot?.recipients&&(!object(x.depot.recipients)||Object.entries(x.depot.recipients).some(([id,r])=>!unit(id)||!object(r)||!integer(r.capacity))))fail();
 if(x.trust!==undefined&&x.trust!==null&&(!branched(s,a,'GEUNSIN')||!unit(x.trust)))fail();
 if(x.sharedHide!==undefined&&(!unit(x.sharedHide)||s.armies[x.sharedHide].c50?.sharedHide!==a.armyId||a.factionId!==s.armies[x.sharedHide].factionId))fail();
 if(x.evacuation&&(!object(x.evacuation)||!integer(x.evacuation.amount)))fail();
 if(x.direct&&(!unit(x.direct.sourceId)||!['MOVE','FLANK'].includes(x.direct.type)||!integer(x.direct.expires,s.turn)))fail();
 if(x.persuaded&&(!unit(x.persuaded.sourceId)||typeof x.persuaded.started!=='boolean'))fail();
 if(x.reservations.PIN&&(!branched(s,a,'GYEONJE')||!unit(x.reservations.PIN.targetId)||!integer(x.reservations.PIN.n,1,3)||!integer(x.reservations.PIN.turn,1,s.turn)||typeof x.reservations.PIN.spend!=='string'))fail();
}

function cleanSharedHide(s){for(const a of Object.values(s.armies)){const b=s.armies[a.c50?.sharedHide];if(!b)continue;if(!a.c50.hidden||!b.c50.hidden||distance(s,a,b)!==1||!active(s,a)||!active(s,b)){a.c50.hidden=false;b.c50.hidden=false;delete a.c50.sharedHide;delete b.c50.sharedHide;}}}

export function initialTrustTargets(s,id){const a=s.armies[id];return live(s).filter(b=>b.armyId!==id&&friendly(a,b)).map(b=>b.armyId).sort();}
export function initializeEngineTrust(s,id,targetId=null){const a=s.armies[id];if(!enginesEnabled(s)||!branched(s,a,'GEUNSIN'))return;const targets=initialTrustTargets(s,id);if(targetId!==null&&!targets.includes(targetId))throw new Error('INVALID_TRUST_TARGET');a.c50.trust=targetId??targets[0]??null;}
