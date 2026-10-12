import data from '../../docs/design-data/diplomacy-v0.1.json' with {type:'json'};
import axes from '../../docs/design-data/diplomacy-axes-v0.1.json' with {type:'json'};
import gift from '../../docs/design-data/diplomacy-gift-v0.1.json' with {type:'json'};
const opinionModifiers={...axes.opinion.modifiers,gift:gift.modifier};
import {relation} from './campaign-relations.mjs';
import {hexDistance,boardNeighbors,tileId} from './map-primitives.mjs';
import {edgeTicks} from './movement.mjs';
// The runtime supplies existing campaign services after module initialization.
// Keep this shared guard module independent of the combat/class import cycle.
let services;
export function configureDiplomacy(options){services=options;}
const campaignMovementWorld=(s,id)=>services.movementWorld(s,id);
const castleArmyActive=(s,a)=>services.armyActive(s,a);
const campaignSubAbility=(...args)=>services.subAbility(...args);
const combatMovement=(s,id)=>services.movement(s,id);
const cityEconomyRates=(s,c)=>services.cityRates(s,c);

export const diplomacyEnabled=s=>['v2','v3'].includes(s.mapId)&&s.c43Disabled!==true;
export const diplomacyPair=(a,b)=>[a,b].sort().join('|');
const kindName=k=>k==='TRUCE'?'휴전':'동맹';
const name=(s,f)=>s.factions[f]?.name??f;
const armyName=(s,f)=>name(s,f).endsWith('군')?name(s,f):`${name(s,f)}군`;
export function initializeDiplomacy(s){
 if(!diplomacyEnabled(s))return s;
 s.c43??={pairs:{},proposals:[],cooldowns:{},protectedArmies:{},sequence:0,history:[]};
 const ids=Object.keys(s.factions).sort();
 s.c43.axes??={reasons:[],trust:{},threat:{},ended:{},released:[],neutralCaptures:[],turn:s.turn};
 s.c43.axes.neutralCaptures??=[];
 for(const id of ids){s.c43.axes.trust[id]??=axes.trust.start;s.c43.axes.threat[id]??=axes.threat.range[0];}
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)s.c43.pairs[diplomacyPair(ids[i],ids[j])]??={state:'WAR',since:s.turn,everAgreed:false};
 return s;
}
export const diplomacyState=(s,a,b)=>diplomacyEnabled(s)?s.c43?.pairs[diplomacyPair(a,b)]?.state??'WAR':'WAR';
export const diplomacyHostile=(s,a,b)=>a!==b&&(!a||!b||diplomacyState(s,a,b)==='WAR');
export const withdrawalProtection=(s,id)=>diplomacyEnabled(s)&&s.c43?.protectedArmies[id]?.until>=s.turn?s.c43.protectedArmies[id]:null;
export const diplomacyArmyHostile=(s,a,b)=>!!s.armies[a]&&!!s.armies[b]&&diplomacyHostile(s,s.armies[a].factionId,s.armies[b].factionId)&&!withdrawalProtection(s,a)&&!withdrawalProtection(s,b);
export function diplomacyAttackReason(s,id,target){
 if(withdrawalProtection(s,id))return '철수 보호 중에는 공격할 수 없습니다.';
 const a=s.armies[id],b=s.armies[target]??s.cities[target];
 if(s.armies[target]&&withdrawalProtection(s,target))return '철수 보호 중인 부대는 공격할 수 없습니다.';
 const f=b?.factionId??b?.ownerFactionId;
 if(a&&f&&f!==a.factionId&&!diplomacyHostile(s,a.factionId,f))return `${kindName(diplomacyState(s,a.factionId,f))} 중인 상대는 공격할 수 없습니다.`;
 return '';
}
export function diplomacyContact(s,a,b){
 const contact=f=>Object.values(s.knowledge[f]?.cities??{}).some(c=>c.ownerFactionId===(f===a?b:a))||Object.values(s.knowledge[f]?.observedArmies??{}).some(u=>u.factionId===(f===a?b:a));
 return contact(a)||contact(b);
}
export function diplomacyStrength(s,f){return Object.values(s.armies).filter(a=>a.factionId===f&&castleArmyActive(s,a)).reduce((n,a)=>n+a.troopCount,0)+Object.values(s.cities).filter(c=>c.ownerFactionId===f).reduce((n,c)=>n+c.reserveTroops,0);}
export function diplomacyStrongest(s){return Object.keys(s.factions).filter(f=>s.factions[f].alive).sort((a,b)=>Object.values(s.cities).filter(c=>c.ownerFactionId===b&&c.kind==='major').length-Object.values(s.cities).filter(c=>c.ownerFactionId===a&&c.kind==='major').length||diplomacyStrength(s,b)-diplomacyStrength(s,a)||a.localeCompare(b))[0];}
const captures=(s,from,to)=>s.c43?.history.some(e=>e.type==='CAPTURE'&&e.from===from&&e.to===to&&e.turn>=s.turn-3)??false;
const clamp=(n,range)=>Math.max(range[0],Math.min(range[1],n));
const reputation=(s,key,f)=>s.c43?.axes?.[key]?.[f]??(key==='trust'?axes.trust.start:0);
const commonEnemy=(s,a,b)=>Object.keys(s.factions).some(f=>f!==a&&f!==b&&s.factions[f].alive&&diplomacyHostile(s,a,f)&&diplomacyHostile(s,b,f));
export const diplomacyCoalition=(s,a,b)=>Object.keys(s.factions).some(f=>f!==a&&f!==b&&s.factions[f].alive&&reputation(s,'threat',f)>=axes.threat.coalitionAt);
export function diplomacyOpinionReasons(s,from,to){
 const rows=(s.c43?.axes?.reasons??[]).filter(r=>r.from===from&&r.to===to&&!r.persistent).map(r=>({...r}));
 const cities=f=>Object.values(s.cities).filter(c=>c.ownerFactionId===f);
 const values={commonEnemy:commonEnemy(s,from,to)?opinionModifiers.commonEnemy.value:0,border:cities(from).some(a=>cities(to).some(b=>hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=8))?opinionModifiers.border.value:0,rulerBond:clamp(Math.round((relation(s,s.factions[from]?.rulerId,s.factions[to]?.rulerId).value-30)/4),[-10,15]),fear:-Math.round(reputation(s,'threat',to)/5)};
 for(const [key,value] of Object.entries(values))if(value)rows.push({from,to,key,value,persistent:true});
 return rows;
}
export const diplomacyOpinion=(s,from,to)=>clamp(diplomacyOpinionReasons(s,from,to).reduce((n,r)=>n+r.value,0),axes.opinion.range);
export function addDiplomacyOpinion(s,from,to,key,source){
 if(!diplomacyEnabled(s)||!from||!to||from===to)return;
 const x=s.c43.axes,m=opinionModifiers[key];if(!m||m.persistent)throw new Error('외교 호감 원인이 올바르지 않습니다.');
 let r=x.reasons.find(r=>r.from===from&&r.to===to&&r.key===key);
 if(!r){r={from,to,key,value:0,remaining:0};x.reasons.push(r);}
 const cap=m.cap??(key==='capturedOurCity'?m.value*2:axes.opinion.range[m.value<0?0:1]);
 r.value=m.value<0?Math.max(cap,r.value+m.value):Math.min(cap,r.value+m.value);r.remaining=Math.ceil(Math.abs(r.value)/m.decayPerTurn);if(source)r.source=source;
}
function axisLog(s,from,to,text){if([from,to].includes(s.playerFactionId))(s.administrationLog??=[]).push({turn:s.turn,factionId:s.playerFactionId,text});}
function loseTrust(s,from,to,key){const loss=axes.trust.loss[key].value;s.c43.axes.trust[from]=clamp(reputation(s,'trust',from)+loss,axes.trust.range);axisLog(s,from,to,`${armyName(s,from)}의 신용 ${loss} — ${axes.trust.loss[key].text}`);}
function refreshPersistent(s){const x=s.c43.axes;x.reasons=x.reasons.filter(r=>!r.persistent);for(const from of Object.keys(s.factions))for(const to of Object.keys(s.factions))if(from!==to)x.reasons.push(...diplomacyOpinionReasons(s,from,to).filter(r=>r.persistent));}
export function diplomacyAcceptance(s,from,to,kind){
 const r=data.aiAcceptance,o=s.officers[s.factions[from]?.rulerId],items=[];
 const add=(key,label,value)=>items.push({key,value,text:`${label} ${value>=0?'+':''}${value}`});
 add('base',`${kindName(kind)} 기본`,axes.acceptance.base[kind]);
 const opinion=diplomacyOpinion(s,to,from),trust=reputation(s,'trust',from);
 add('opinion','호감',opinion/4);items.at(-1).text+=`(우리를 보는 마음 ${opinion})`;
 add('trust','신용',(trust-axes.trust.start)/(kind==='TRUCE'?10:5));items.at(-1).text+=`(제안자 신용 ${trust})`;
 add('proposerCharisma','군주 감화',Math.floor((o?.baseStats.charisma??0)/r.proposerCharisma.per)*r.proposerCharisma.value);
 add('proposerMediation','군주 중재',Math.floor((o?campaignSubAbility(s,o.officerId,'감화','중재'):0)/r.proposerMediation.per)*r.proposerMediation.value);
 const mine=diplomacyStrength(s,to),other=diplomacyStrength(s,from),cities=Object.values(s.cities).filter(c=>c.ownerFactionId===to);
 if(other>=mine*1.2&&other>mine)add('weaker','상대가 밀리고 있음',r.weaker.value);
 if((s.c43?.history??[]).some(e=>e.type==='CAPTURE'&&e.to===to&&e.turn>=s.turn-3))add('losingCities','최근 성을 잃음',r.losingCities.value);
 if(cities.length&&cities.reduce((n,c)=>n+c.foodStock,0)<cities.reduce((n,c)=>n+cityEconomyRates(s,c).capacity,0)*.25)add('lowFood','군량 부족',r.lowFood.value);
 if(kind==='ALLIANCE'&&diplomacyCoalition(s,from,to))add('coalition','견제 연합',20);
 if(reputation(s,'threat',from)>=axes.threat.coalitionAt)add('threat','제안자 위협',-15);
 if(captures(s,to,from)||mine>=other*1.3&&mine>other)add('winning','상대가 우세함',r.winning.value);
 if((s.c43?.history??[]).some(e=>e.type==='ATTACK'&&e.from===from&&e.to===to&&e.turn>=s.turn-1))add('recentlyAttacked','최근 공격을 받음',r.recentlyAttacked.value);
 return {score:items.reduce((n,e)=>n+e.value,0),items,effectLines:items.map(e=>e.text)};
}
export function canProposeDiplomacy(s,from,to,kind){
 let reason='';const p=s.c43?.pairs[diplomacyPair(from,to)],left=(s.c43?.cooldowns[`${from}|${to}|${kind}`]??0)-s.turn;
 if(!diplomacyEnabled(s))reason='이 지도에서는 외교를 사용할 수 없습니다.';
 else if(!['TRUCE','ALLIANCE'].includes(kind)||from===to||!s.factions[to]?.alive||!s.factions[from]?.alive)reason='제안할 상대가 없습니다.';
 else if(data.proposal.needsContact&&!diplomacyContact(s,from,to))reason='접촉한 적이 없습니다.';
 else if(left>0)reason=`같은 제안은 ${left}차례 뒤에 가능합니다.`;
 else if(p?.state==='ALLIANCE')reason='이미 동맹 중입니다.';
 else if(p?.state==='TRUCE'&&kind==='TRUCE'&&p.until-s.turn+1>data.proposal.responseTurns)reason='이미 휴전 중입니다. 마지막 차례에 갱신할 수 있습니다.';
 else if(p?.pending||s.c43.proposals.some(e=>diplomacyPair(e.from,e.to)===diplomacyPair(from,to)&&e.status==='PENDING'))reason='이미 답변을 기다리는 제안이 있습니다.';
 return reason?{ok:false,reason}:{ok:true,...diplomacyAcceptance(s,from,to,kind)};
}
function record(s,type,from,to,kind,text){
 s.c43.history.push({type,from,to,kind,turn:s.turn});
 if([from,to].includes(s.playerFactionId))(s.administrationLog??=[]).push({turn:s.turn,factionId:s.playerFactionId,text});
}
export function respondDiplomacy(s,id,accept){
 const p=s.c43.proposals.find(p=>p.id===id&&p.status==='PENDING');if(!p)throw new Error('답변할 외교 제안이 없습니다.');
 p.status=accept?'ACCEPTED':'REJECTED';
 if(accept){const pair=s.c43.pairs[diplomacyPair(p.from,p.to)];pair.pending={state:p.kind,at:s.turn+(data.effectiveNextTurn?1:0)};record(s,'ACCEPT',p.to,p.from,p.kind,`${armyName(s,p.to)}이 ${kindName(p.kind)}을 수락했다 — 다음 차례부터`);}
 else {addDiplomacyOpinion(s,p.from,p.to,'rejectedProposal');s.c43.cooldowns[`${p.from}|${p.to}|${p.kind}`]=s.turn+data.proposal.cooldownTurns;record(s,'REJECT',p.to,p.from,p.kind,`${armyName(s,p.to)}이 ${armyName(s,p.from)}의 ${kindName(p.kind)} 요청을 거절했다`);}
 return s;
}
export function proposeDiplomacy(s,from,to,kind,{autoPlayer=false}={}){
 const check=canProposeDiplomacy(s,from,to,kind);if(!check.ok)throw new Error(check.reason);
 const p={id:`DIP.${++s.c43.sequence}`,from,to,kind,turn:s.turn,status:'PENDING',expiresTurn:s.turn+data.proposal.responseTurns-1+(s.phase==='AI'&&to===s.playerFactionId&&!autoPlayer?1:0)};s.c43.proposals.push(p);
 record(s,'PROPOSE',from,to,kind,`${armyName(s,from)}이 ${armyName(s,to)}에 ${kindName(kind)}을 제안했다`);
 if(to!==s.playerFactionId||autoPlayer)respondDiplomacy(s,p.id,check.score>=0);
 return s;
}
export function endDiplomacyAlliance(s,from,to){
 const p=s.c43?.pairs[diplomacyPair(from,to)];if(!p||p.state!=='ALLIANCE')throw new Error('종료할 동맹이 없습니다.');
 if(p.endingAt)throw new Error('이미 동맹 종료를 통보했습니다.');
 if(s.turn-p.since<axes.trust.loss.earlyAllianceEnd.withinTurns)loseTrust(s,from,to,'earlyAllianceEnd');
 if(commonEnemy(s,from,to))loseTrust(s,from,to,'abandonAlly');
 p.endingAt=s.turn+data.alliance.endNoticeTurns;record(s,'END_NOTICE',from,to,'ALLIANCE',`${armyName(s,from)}이 ${armyName(s,to)}에 동맹 종료를 통보했다 — 다음 차례부터`);return s;
}
export function canGift(s,from,to){
 let reason='';const left=(s.c43?.cooldowns[`${from}|${to}|GIFT`]??0)-s.turn;
 if(!diplomacyEnabled(s))reason='이 지도에서는 외교를 사용할 수 없습니다.';
 else if(from===to||!s.factions[to]?.alive||!s.factions[from]?.alive)reason='선물을 보낼 상대가 없습니다.';
 else if(!diplomacyContact(s,from,to))reason='접촉한 적이 없습니다.';
 else if(left>0)reason=`선물은 ${left}차례 뒤에 다시 보낼 수 있습니다.`;
 else if(s.factions[from].prestige-(s.captiveRecruitment?.factions[from]?.reservedPrestige??0)<gift.cost)reason=`인망 ${gift.cost} 필요`;
 return {...(reason?{ok:false,reason}:{ok:true}),cost:gift.cost,effectLines:[`인망 −${gift.cost}`,`우리를 보는 마음 +${gift.modifier.value}(차례마다 ${gift.modifier.decayPerTurn}씩 줄어듦, 최대 +${gift.modifier.cap})`]};
}
function sendDiplomacyGift(s,from,to){
 const check=canGift(s,from,to);if(!check.ok)throw new Error(check.reason);
 s.factions[from].prestige-=gift.cost;addDiplomacyOpinion(s,to,from,'gift');
 s.c43.cooldowns[`${from}|${to}|GIFT`]=s.turn+gift.cooldownTurns;
 record(s,'GIFT',from,to,'GIFT',`${name(s,to)}에 선물을 보냈다 · 인망 −${gift.cost} · 우리를 보는 마음 +${gift.modifier.value}`);return s;
}
export function diplomacyCommand(s,c){
 if(!diplomacyEnabled(s))throw new Error('이 지도에서는 외교를 사용할 수 없습니다.');
 if(c.type==='DIPLO_GIFT')return sendDiplomacyGift(s,s.playerFactionId,c.factionId);
 if(c.type==='DIPLO_PROPOSE')return proposeDiplomacy(s,s.playerFactionId,c.factionId,c.kind);
 if(c.type==='DIPLO_END_ALLIANCE')return endDiplomacyAlliance(s,s.playerFactionId,c.factionId);
 const p=s.c43.proposals.find(p=>p.id===c.proposalId&&p.to===s.playerFactionId);if(!p||typeof c.accept!=='boolean')throw new Error('답변할 외교 제안이 없습니다.');
 return respondDiplomacy(s,p.id,c.accept);
}
export function finishDiplomacyPlayerTurn(s,{autoPlayer=false}={}){
 if(!diplomacyEnabled(s))return;
 for(const p of s.c43.proposals.filter(p=>p.status==='PENDING'&&p.to===s.playerFactionId&&(p.expiresTurn??p.turn)<=s.turn))respondDiplomacy(s,p.id,autoPlayer&&diplomacyAcceptance(s,p.from,p.to,p.kind).score>=0);
}
export function startDiplomacyAi(s,f,{autoPlayer=false}={}){
 if(!diplomacyEnabled(s))return;
 if(autoPlayer&&f===s.playerFactionId)finishDiplomacyPlayerTurn(s,{autoPlayer:true});
 const strongest=diplomacyStrongest(s),others=Object.keys(s.factions).filter(id=>id!==f&&s.factions[id].alive).sort();
 for(const to of others){const p=s.c43.pairs[diplomacyPair(f,to)];if(p.state==='ALLIANCE'&&(reputation(s,'threat',to)>=axes.threat.coalitionAt||diplomacyOpinion(s,f,to)<-20)&&!p.endingAt)endDiplomacyAlliance(s,f,to);}
 for(const kind of ['TRUCE','ALLIANCE'])for(const to of others.slice().sort((a,b)=>diplomacyAcceptance(s,f,b,kind).score-diplomacyAcceptance(s,f,a,kind).score||a.localeCompare(b))){
  const war=diplomacyState(s,f,to)==='WAR',eligible=kind==='TRUCE'?war&&(diplomacyStrength(s,f)<diplomacyStrength(s,to)*.8||captures(s,to,f)):f!==strongest&&to!==strongest&&diplomacyHostile(s,f,strongest)&&diplomacyHostile(s,to,strongest);
  if(eligible&&canProposeDiplomacy(s,f,to,kind).ok){proposeDiplomacy(s,f,to,kind,{autoPlayer});return;}
 }
}
export const diplomacyTerritory=(s,f,id)=>!!s.tiles[id]&&Object.values(s.cities).some(c=>c.ownerFactionId===f&&hexDistance(s.tiles[id],s.tiles[c.tileId])<=data.territoryRadius);
// Multi-source shortest exit costs use campaign terrain/roads, excluding transient occupants.
const exitCache=new WeakMap();
export function withdrawalDistances(s,id,f){
 const a=s.armies[id],signature=`${f}:${a.troopType}:${Object.values(s.cities).map(c=>`${c.tileId}:${c.ownerFactionId}`).join(';')}:${s.mapRules.blockedEdges.join(';')}:${s.turn}`;
 let cache=exitCache.get(s);if(!cache){cache=new Map();exitCache.set(s,cache);}const key=id+'|'+signature;if(cache.has(key))return cache.get(key);
 const bare={...s,c43Disabled:true,armies:{[id]:a}},world=campaignMovementWorld(bare,id),dist=new Map(),queue=[];
 for(const t of Object.values(s.tiles))if(!diplomacyTerritory(s,f,t.tileId)){dist.set(t.tileId,0);queue.push(t.tileId);}
 while(queue.length){queue.sort((a,b)=>dist.get(a)-dist.get(b)||a.localeCompare(b));const at=queue.shift(),d=dist.get(at);
  for(const n of boardNeighbors(s.tiles[at],s.tiles)){const next=tileId(n),cost=edgeTicks(world,world.armies[id],next,at);if(cost===null)continue;const value=d+cost;if(value<(dist.get(next)??Infinity)){dist.set(next,value);if(!queue.includes(next))queue.push(next);}}
 }
 cache.set(key,dist);return dist;
}
export function diplomacyMoveReason(s,id,to,from=s.armies[id]?.tileId){
 if(!diplomacyEnabled(s)||!s.armies[id]||!s.tiles[to])return '';
 const a=s.armies[id],protection=withdrawalProtection(s,id);
 for(const f of Object.keys(s.factions).filter(f=>f!==a.factionId&&diplomacyState(s,a.factionId,f)==='TRUCE')){
  if(!diplomacyTerritory(s,f,to))continue;
  if(!diplomacyTerritory(s,f,from))return '휴전 중에는 상대 영토에 들어갈 수 없습니다.';
  const distances=withdrawalDistances(s,id,f);if(!((distances.get(to)??Infinity)<(distances.get(from)??Infinity)))return '상대 영토 밖으로 철수하는 방향으로만 이동할 수 있습니다.';
 }
 if(protection&&diplomacyTerritory(s,protection.fromFactionId,to)){
  const distances=withdrawalDistances(s,id,protection.fromFactionId);if(!((distances.get(to)??Infinity)<(distances.get(from)??Infinity)))return '철수 보호 중에는 영토 밖으로만 이동할 수 있습니다.';
 }
 return '';
}
function protectWithdrawal(s,from,to){
 for(const a of Object.values(s.armies).filter(a=>a.factionId===from&&castleArmyActive(s,a)&&diplomacyTerritory(s,to,a.tileId))){
  const turns=withdrawalTurns(s,a.armyId,to);
  const duration=turns>data.withdrawal.baseTurns?turns+data.withdrawal.extraIfLonger:data.withdrawal.baseTurns;
  s.c43.protectedArmies[a.armyId]??={until:s.turn+duration-1,fromFactionId:to};
 }
}
export function withdrawalTurns(s,id,f){
 const a=s.armies[id],bare={...s,c43Disabled:true,armies:{[id]:a}},world=campaignMovementWorld(bare,id),distances=withdrawalDistances(s,id,f),max=combatMovement(s,id).max;
 let frontier=new Set([a.tileId]);const visited=new Set();
 // Each layer is one move allowance. Keep nondominated tick/tile labels, so
 // expensive edges and the one-tile formation cap cannot undercount turns.
 for(let turns=1;frontier.size&&turns<=Object.keys(s.tiles).length;turns++){
  const nextFrontier=new Set();
  for(const start of frontier){const labels=new Map([[start,[[0,0]]]]),queue=[[start,0,0]];
   while(queue.length){const [at,ticks,steps]=queue.shift();
    for(const n of boardNeighbors(s.tiles[at],s.tiles)){const to=tileId(n),cost=edgeTicks(world,world.armies[id],at,to);if(cost===null||ticks+cost>s.time.ticksPerTurn||steps+1>max||(distances.get(to)??Infinity)>=(distances.get(at)??Infinity))continue;
     if(!diplomacyTerritory(s,f,to))return turns;
     const rows=labels.get(to)??[];if(rows.some(([t,k])=>t<=ticks+cost&&k<=steps+1))continue;
     labels.set(to,[...rows.filter(([t,k])=>!(t>=ticks+cost&&k>=steps+1)),[ticks+cost,steps+1]]);queue.push([to,ticks+cost,steps+1]);if(!visited.has(to))nextFrontier.add(to);
    }
   }
  }
  for(const at of frontier)visited.add(at);frontier=nextFrontier;
 }
 return data.withdrawal.baseTurns;
}
export function startDiplomacyTurn(s){
 if(!diplomacyEnabled(s))return;
 const x=s.c43.axes,elapsed=s.turn-x.turn;
 if(elapsed>0){
  for(let t=x.turn;t<s.turn;t++){
   for(const r of x.reasons.filter(r=>!r.persistent)){const m=opinionModifiers[r.key];if(r.key==='keptAlliance'&&diplomacyState(s,r.from,r.to)==='ALLIANCE')continue;r.value=Math.sign(r.value)*Math.max(0,Math.abs(r.value)-m.decayPerTurn);r.remaining=Math.ceil(Math.abs(r.value)/m.decayPerTurn);}
   x.reasons=x.reasons.filter(r=>r.persistent||r.value!==0);
   for(const f of Object.keys(s.factions)){
    const agreements=Object.entries(s.c43.pairs).filter(([key,p])=>key.split('|').includes(f)&&p.since<=t&&(p.state==='ALLIANCE'&&(!p.endingAt||p.endingAt>t)||p.state==='TRUCE'&&p.until>=t));
    x.trust[f]=clamp(x.trust[f]+(agreements.length?agreements.length*axes.trust.gain.perAgreementTurn:Math.sign(axes.trust.start-x.trust[f])*axes.trust.decayToStart.perTurn),axes.trust.range);
    x.threat[f]=clamp(x.threat[f]-axes.threat.decayPerTurn,axes.threat.range);
    for(const [key,p] of agreements)if(p.state==='ALLIANCE')addDiplomacyOpinion(s,f,key.split('|').find(id=>id!==f),'keptAlliance');
   }
  }
  x.turn=s.turn;
 }
 for(const p of s.c43.proposals.filter(p=>p.status==='PENDING'&&s.turn>(p.expiresTurn??p.turn+data.proposal.responseTurns-1)))respondDiplomacy(s,p.id,false);
 for(const [key,p] of Object.entries(s.c43.pairs)){
  const [from,to]=key.split('|');
  if(p.pending?.at<=s.turn){const pending=p.pending,renew=p.state===pending.state;delete p.pending;p.state=pending.state;p.since=renew?p.since:s.turn;p.everAgreed=true;delete p.endingAt;
   if(p.state==='TRUCE'){p.until=(renew?Math.max(s.turn-1,p.until):s.turn-1)+data.truce.turns;if(!renew){protectWithdrawal(s,from,to);protectWithdrawal(s,to,from);}}else delete p.until;
   if(!renew&&p.state==='ALLIANCE'&&diplomacyCoalition(s,from,to)){s.c43.history.push({type:'COALITION',from,to,turn:s.turn});axisLog(s,from,to,`${armyName(s,from)}과 ${armyName(s,to)}이 팽창하는 세력을 견제할 동맹을 맺었다`);}
   record(s,'EFFECTIVE',from,to,p.state,`${armyName(s,from)}과 ${armyName(s,to)} ${kindName(p.state)} — ${p.state==='TRUCE'?`${data.truce.turns}차례(${p.until}턴까지)`:'공격 금지'}`);
  }else if(p.endingAt<=s.turn||p.state==='TRUCE'&&p.until<s.turn){const kind=p.state;x.ended[key]={turn:s.turn,kind};if(kind==='TRUCE'){addDiplomacyOpinion(s,from,to,'keptTruce');addDiplomacyOpinion(s,to,from,'keptTruce');}record(s,kind==='TRUCE'?'EXPIRE':'END',from,to,kind,`${armyName(s,from)}과 ${armyName(s,to)} ${kindName(kind)} ${kind==='TRUCE'?'만료':'종료'}`);Object.assign(p,{state:'WAR',since:s.turn});delete p.until;delete p.endingAt;}
 }
 for(const [id,p] of Object.entries(s.c43.protectedArmies))if(p.until<s.turn-1)delete s.c43.protectedArmies[id];
 refreshPersistent(s);
}
export function rememberDiplomacyCombat(s,before){
 if(!diplomacyEnabled(s)||!s.c43)return;
 const previous=s.c43.history.length;
 for(const c of Object.values(s.cities))if(before.cities[c.cityId]?.ownerFactionId===null&&c.ownerFactionId){
  const key=`${c.cityId}:${s.turn}:${c.ownerFactionId}`;
  if(!s.c43.axes.neutralCaptures.includes(key)){s.c43.axes.neutralCaptures.push(key);s.c43.axes.threat[c.ownerFactionId]=clamp(reputation(s,'threat',c.ownerFactionId)+axes.threat.gain[c.kind==='major'?'majorCity':'minorCity'],axes.threat.range);axisLog(s,c.ownerFactionId,c.ownerFactionId,`${armyName(s,c.ownerFactionId)}이 ${c.name??'성'}을 차지해 위협이 커졌다`);}
 }
 for(const log of (s.combatLog??[]).filter(l=>l.sequence>(before.battleSequence??0))){const from=s.armies[log.attackerId]?.factionId??s.cities[log.attackerId]?.ownerFactionId;if(!from)continue;const targets=new Set([s.armies[log.targetId]?.factionId,before.cities[log.cityId??log.targetId]?.ownerFactionId,...(log.units??[]).filter(u=>u.casualties>0).map(u=>s.armies[u.unitId]?.factionId)]);for(const to of targets)if(to&&to!==from&&!s.c43.history.some(e=>e.type==='ATTACK'&&e.sequence===log.sequence&&e.from===from&&e.to===to))s.c43.history.push({type:'ATTACK',from,to,turn:log.turn,sequence:log.sequence});}
 for(const c of Object.values(s.cities)){const old=before.cities[c.cityId]?.ownerFactionId,captureTurn=(s.combatLog??[]).filter(l=>l.cityId===c.cityId&&l.captureLine&&l.turn>=before.turn).at(-1)?.turn??s.turn;if(old&&c.ownerFactionId&&old!==c.ownerFactionId&&!s.c43.history.some(e=>e.type==='CAPTURE'&&e.cityId===c.cityId&&e.from===c.ownerFactionId&&e.to===old&&e.turn===captureTurn))s.c43.history.push({type:'CAPTURE',from:c.ownerFactionId,to:old,turn:captureTurn,cityId:c.cityId});}
 for(const e of s.c43.history.slice(previous)){
  if(e.type==='ATTACK'){
   addDiplomacyOpinion(s,e.to,e.from,'attackedUs');const ended=s.c43.axes.ended[diplomacyPair(e.from,e.to)];
   if(ended&&e.turn>=ended.turn&&e.turn-ended.turn<axes.trust.loss.surpriseAttack.withinTurns){loseTrust(s,e.from,e.to,'surpriseAttack');s.c43.history.push({type:'SURPRISE',from:e.from,to:e.to,turn:e.turn});}
  }else if(e.type==='CAPTURE'){
   addDiplomacyOpinion(s,e.to,e.from,'capturedOurCity',e.cityId);s.c43.axes.threat[e.from]=clamp(reputation(s,'threat',e.from)+axes.threat.gain[s.cities[e.cityId].kind==='major'?'majorCity':'minorCity'],axes.threat.range);axisLog(s,e.from,e.to,`${armyName(s,e.from)}이 ${name(s,e.to)}의 ${s.cities[e.cityId].name??'성'}을 빼앗아 위협이 커졌다`);
  }
 }
 for(const p of Object.values(s.terminal?.prisonersById??{}))if(p.disposition==='RELEASED'&&!s.c43.axes.released.includes(p.prisonerRecordId)){
  s.c43.axes.released.push(p.prisonerRecordId);
  const prior=before.terminal?.prisonersById?.[p.prisonerRecordId],closure=s.terminal.recordsById?.[p.closureRecordId];
  if(prior?.disposition!=='RELEASED'&&closure?.details.disposition!=='RECRUITED')addDiplomacyOpinion(s,p.homeFactionId,p.captorFactionId,'releasedOurOfficer',p.officerId);
 }
}
export function diplomacyView(s,f){return {
 me:{trust:reputation(s,'trust',f),threat:reputation(s,'threat',f)},
 factions:Object.keys(s.factions).filter(id=>id!==f&&s.factions[id].alive).sort().map(id=>{const p=s.c43.pairs[diplomacyPair(f,id)],truce=canProposeDiplomacy(s,f,id,'TRUCE'),alliance=canProposeDiplomacy(s,f,id,'ALLIANCE');return {factionId:id,name:name(s,id),opinionOfMe:diplomacyOpinion(s,id,f),myOpinion:diplomacyOpinion(s,f,id),opinionReasons:diplomacyOpinionReasons(s,id,f).map(r=>({text:opinionModifiers[r.key].text.replace(/C\d+\s*/g,''),value:r.value,turnsLeft:r.persistent?null:r.remaining})),trust:reputation(s,'trust',id),threat:reputation(s,'threat',id),state:p.state,...(p.state==='TRUCE'?{turnsLeft:p.until-s.turn+1}:{}),...(p.endingAt?{endingAt:p.endingAt}:{}),contact:diplomacyContact(s,f,id),canGift:canGift(s,f,id),canPropose:{TRUCE:truce,ALLIANCE:alliance},aiStance:{TRUCE:diplomacyAcceptance(s,f,id,'TRUCE'),ALLIANCE:diplomacyAcceptance(s,f,id,'ALLIANCE')}};}),
 incoming:s.c43.proposals.filter(p=>p.to===f&&p.status==='PENDING').map(p=>({proposalId:p.id,from:p.from,fromName:name(s,p.from),kind:p.kind,expiresTurn:p.expiresTurn??p.turn+data.proposal.responseTurns-1})),
 protectedArmies:Object.entries(s.c43.protectedArmies).filter(([id,p])=>s.armies[id]?.factionId===f&&p.until>=s.turn).map(([armyId,p])=>({armyId,until:p.until}))};}
export function diplomacyMetrics(s){const h=s.c43?.history??[];return {agreementsByPair:Object.fromEntries(Object.keys(s.c43?.pairs??{}).map(key=>[key,Object.fromEntries(['TRUCE','ALLIANCE'].map(kind=>[kind,h.filter(e=>e.type==='EFFECTIVE'&&e.kind===kind&&diplomacyPair(e.from,e.to)===key).length]))])),acceptances:h.filter(e=>e.type==='ACCEPT').length,coalitions:h.filter(e=>e.type==='COALITION').length,surpriseAttacks:h.filter(e=>e.type==='SURPRISE').length,factions:Object.fromEntries(Object.keys(s.factions).map(f=>[f,{trust:reputation(s,'trust',f),threat:reputation(s,'threat',f)}])),proposals:h.filter(e=>e.type==='PROPOSE').length,rejections:h.filter(e=>e.type==='REJECT').length};}
export function validateDiplomacy(s){
 if(!diplomacyEnabled(s))return;
 const d=s.c43,fail=()=>{throw new Error('외교 저장 상태가 올바르지 않습니다.');},turn=n=>Number.isSafeInteger(n)&&n>=1,obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 if(!obj(d)||!obj(d.pairs)||!Array.isArray(d.proposals)||!obj(d.cooldowns)||!obj(d.protectedArmies)||!Array.isArray(d.history)||!Number.isSafeInteger(d.sequence)||d.sequence<0)fail();
 const ids=Object.keys(s.factions).sort();if(Object.keys(d.pairs).length!==ids.length*(ids.length-1)/2)fail();
 const x=d.axes;if(!obj(x)||!Array.isArray(x.reasons)||!obj(x.trust)||!obj(x.threat)||!obj(x.ended)||!Array.isArray(x.released)||!turn(x.turn)||x.turn>s.turn)fail();
 for(const key of ['trust','threat']){if(Object.keys(x[key]).length!==ids.length)fail();for(const f of ids)if(!Number.isInteger(x[key][f])||x[key][f]<axes[key].range[0]||x[key][f]>axes[key].range[1])fail();}
 const reasons=new Set();for(const r of x.reasons){
  if(!obj(r))fail();const m=opinionModifiers[r.key],key=`${r.from}|${r.to}|${r.key}`;
  if(!s.factions[r.from]||!s.factions[r.to]||r.from===r.to||!m||reasons.has(key)||!Number.isInteger(r.value)||r.value===0||r.value<axes.opinion.range[0]||r.value>axes.opinion.range[1]||r.source!==undefined&&typeof r.source!=='string')fail();
  if(m.persistent){if(r.persistent!==true||r.remaining!==undefined)fail();}
  else {const cap=m.cap??(r.key==='capturedOurCity'?m.value*2:axes.opinion.range[m.value<0?0:1]);if(r.persistent!==undefined||Math.sign(r.value)!==Math.sign(m.value)||Math.abs(r.value)>Math.abs(cap)||r.remaining!==Math.ceil(Math.abs(r.value)/m.decayPerTurn))fail();}
  reasons.add(key);
 }
 for(const [key,e] of Object.entries(x.ended)){const [a,b,...rest]=key.split('|');if(rest.length||!s.factions[a]||!s.factions[b]||a>=b||!obj(e)||!turn(e.turn)||e.turn>s.turn||!['TRUCE','ALLIANCE'].includes(e.kind))fail();}
 if(new Set(x.released).size!==x.released.length||x.released.some(id=>typeof id!=='string'))fail();
 if(!Array.isArray(x.neutralCaptures)||new Set(x.neutralCaptures).size!==x.neutralCaptures.length||x.neutralCaptures.some(id=>typeof id!=='string'))fail();
 for(const [key,p] of Object.entries(d.pairs)){const [a,b,...rest]=key.split('|');if(rest.length||!s.factions[a]||!s.factions[b]||a>=b||!obj(p)||!Object.hasOwn(data.states,p.state)||!turn(p.since)||p.since>s.turn||typeof p.everAgreed!=='boolean'||p.state==='TRUCE'&&(!turn(p.until)||p.until<p.since)||p.endingAt!==undefined&&(p.state!=='ALLIANCE'||!turn(p.endingAt))||p.pending&&(!obj(p.pending)||!['TRUCE','ALLIANCE'].includes(p.pending.state)||!turn(p.pending.at)))fail();}
 const seen=new Set();for(const p of d.proposals){if(!obj(p)||typeof p.id!=='string'||!/^DIP\.\d+$/.test(p.id)||Number(p.id.slice(4))>d.sequence||seen.has(p.id)||!s.factions[p.from]||!s.factions[p.to]||p.from===p.to||!['TRUCE','ALLIANCE'].includes(p.kind)||!['PENDING','ACCEPTED','REJECTED'].includes(p.status)||!turn(p.turn)||p.turn>s.turn||p.expiresTurn!==undefined&&(!turn(p.expiresTurn)||p.expiresTurn<p.turn))fail();seen.add(p.id);}
 for(const [key,n] of Object.entries(d.cooldowns)){const [a,b,k,...rest]=key.split('|');if(rest.length||!s.factions[a]||!s.factions[b]||a===b||!['TRUCE','ALLIANCE','GIFT'].includes(k)||!turn(n))fail();}
 for(const [id,p] of Object.entries(d.protectedArmies))if(!s.armies[id]||!p||!s.factions[p.fromFactionId]||p.fromFactionId===s.armies[id].factionId||!turn(p.until))fail();
 for(const e of d.history)if(!obj(e)||!['ATTACK','CAPTURE','PROPOSE','ACCEPT','REJECT','END_NOTICE','EFFECTIVE','EXPIRE','END','SURPRISE','COALITION','GIFT'].includes(e.type)||!s.factions[e.from]||!s.factions[e.to]||e.from===e.to||!turn(e.turn)||e.turn>s.turn)fail();
}
