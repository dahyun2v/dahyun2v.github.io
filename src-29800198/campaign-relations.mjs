import sceneData from '../data/relation-scenes-v0.2.json' with {type:'json'};
import rivalSceneData from '../data/relation-scenes-rival-v0.1.json' with {type:'json'};
import visitTalks from '../../docs/design-data/officer-pack/visit-talks-v0.1.json' with {type:'json'};
import data from '../../docs/design-data/officer-pack/relations-v0.3.json' with {type:'json'};
import {createRng} from './rng.mjs';
import {hexDistance} from './map-primitives.mjs';

export const RELATIONS=data;
export const relationsEnabled=s=>['v2','v3'].includes(s.mapId);
export const relationKey=(a,b)=>[a,b].sort().join('|');
export const relationMonth=s=>Math.floor(s.currentDate/30);
const roster=s=>({...s.wanderers,...s.officers});
const name=(s,id)=>roster(s)[id]?.name??'장수';
const pairNames=(s,a,b)=>{const n=name(s,a),code=n.codePointAt(n.length-1);return `${n}${code>=0xAC00&&code<=0xD7A3&&(code-0xAC00)%28?'과':'와'} ${name(s,b)}`;};
const free=o=>o?.lifeState==='ALIVE'&&o.captivityState==='FREE';
const deployed=(s,a)=>a.troopCount>0&&free(s.officers[a.commanderId])&&(!s.campaignTerminalWorld||s.campaignTerminalWorld.armiesById[a.armyId]?.disposition==='ACTIVE');
const armies=(s,fid)=>Object.values(s.armies).filter(a=>a.factionId===fid&&deployed(s,a));
const pairs=ids=>ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b]));
const percent=text=>Number(text.match(/[+−－-](\d+)%/)?.[1]??0)/100;
const min=id=>data.tiers.find(t=>t.id===id).min;
const history=new Map(data.pairs.map(p=>[relationKey(p.a,p.b),p]));
export function relation(s,a,b){const r=s.relations?.[relationKey(a,b)]??{value:data.defaultValue};const tier=r.value<=data.rivalAt?{id:'RIVAL',name:'숙적'}:[...data.tiers].reverse().find(t=>r.value>=t.min);return {...r,tier:tier.id,tierName:tier.name,displayName:tier.id==='BOUND'?(data.boundNames[r.kind]??tier.name):tier.id!=='RIVAL'&&r.kind==='RIVAL'?data.kindNames.RIVAL:tier.name,grudge:!!history.get(relationKey(a,b))?.grudge,rivalEvent:tier.id==='RIVAL'?(data.rivalEvents[s.c38?.rivalEvents?.[relationKey(a,b)]?.event]?.name??null):null};}
export function initializeRelations(s,addedId=null){
 if(!relationsEnabled(s))return s;
 s.relationScenes??={queue:[],active:null,lastTurn:0};const fresh=s.relations===undefined;s.relations??={};
 // C222: old saves acquire a persistent pair ledger; an active scene was already shown.
 s.relationScenes.seen??=[];
 if(s.relationScenes.active){const e=s.relationScenes.active,key=relationKey(e.a,e.b);if(!s.relationScenes.seen.includes(key))s.relationScenes.seen.push(key);}
 s.c38??={turn:s.turn,month:relationMonth(s),hits:[],jointPairs:[],attackEvents:[],feasts:{},visits:{},aiMonths:{},moraleUsed:{},stats:{jointAttacks:0,boundGroups:0,aiFeasts:0,rivals:0},seenGroups:[],outcomes:[]};
 if(s.c38.pastLifeEncounters===undefined)s.c38.pastLifeEncounters=[];if(s.c38.rivalEvents===undefined)s.c38.rivalEvents={};if(s.c38.captiveReleases===undefined)s.c38.captiveReleases=[];if(s.c38.moraleUsed===undefined)s.c38.moraleUsed={};
 if(fresh||addedId){const os=roster(s);for(const p of data.pairs)if(os[p.a]&&os[p.b]&&(!addedId||p.a===addedId||p.b===addedId)){const key=relationKey(p.a,p.b);s.relations[key]??={value:Math.max(data.range[0],Math.min(data.range[1],p.value)),kind:p.kind};}}
 if(fresh||addedId)observeRelationGroups(s);return s;
}
export function gainRelation(s,a,b,amount){
 if(!relationsEnabled(s)||a===b||!roster(s)[a]||!roster(s)[b])return;
 initializeRelations(s);const before=relation(s,a,b),r={value:Math.max(data.range[0],Math.min(data.range[1],amount<0?Math.max(Math.min(before.value,data.rivalRule.floor),before.value+amount):before.value+amount)),...(before.kind?{kind:before.kind}:{})};
 if(r.value>=min('BOUND')&&!r.kind)r.kind='FRIEND';s.relations[relationKey(a,b)]=r;
 const after=relation(s,a,b);if(before.tier!==after.tier){s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:[a,b].some(id=>s.officers[id]?.allegianceFactionId===s.playerFactionId)?s.playerFactionId:s.officers[a]?.allegianceFactionId,text:`${pairNames(s,a,b)}의 관계가 ${after.tierName}${after.tier==='BOUND'?`(${after.displayName})`:''}${amount>0?'로 가까워졌다':'로 바뀌었다'}`});if(after.tier==='RIVAL')s.c38.stats.rivals++;}
 if(after.value>before.value&&after.tier!==before.tier&&!s.relationScenes.seen.includes(relationKey(a,b))&&[a,b].every(id=>free(s.officers[id])&&s.officers[id].allegianceFactionId===s.playerFactionId))s.relationScenes.queue.push({a,b,tier:after.tier,kind:after.kind??'FRIEND',turn:s.turn});
 observeRelationGroups(s);
}
export function relationGroups(s,fid){
 if(!relationsEnabled(s))return [];
 const ids=[...new Set(armies(s,fid).map(a=>a.commanderId))].sort(),remaining=new Set(ids),out=[];
 while(remaining.size){const members=[remaining.values().next().value];remaining.delete(members[0]);for(let i=0;i<members.length;i++)for(const id of [...remaining])if(relation(s,members[i],id).tier==='BOUND'){members.push(id);remaining.delete(id);}if(members.length>=2)out.push({members:members.sort(),stage:Math.min(4,members.length)});}
 return out;
}
export function observeRelationGroups(s){if(!relationsEnabled(s)||!s.c38)return;for(const fid of Object.keys(s.factions))for(const g of relationGroups(s,fid)){const key=fid+':'+g.members.join('|');if(!s.c38.seenGroups.includes(key)){s.c38.seenGroups.push(key);s.c38.stats.boundGroups++;}}}
const groupStage=(s,id)=>{const a=s.armies[id]??Object.values(s.armies).find(a=>a.commanderId===id&&deployed(s,a));return a?relationGroups(s,a.factionId).find(g=>g.members.includes(a.commanderId))?.stage??0:0;};
export const relationGaugeFactor=(s,id)=>groupStage(s,id)>=4?1+percent(data.boundSet.tiers['4']):1;
export const relationMoraleWeight=(s,id,w)=>groupStage(s,id)>=3?w*(1-percent(data.boundSet.tiers['3'])):w;
export function relationTrustGuard(s,id){
 if(!relationsEnabled(s))return false;const a=s.armies[id];return !!a&&armies(s,a.factionId).some(b=>b.armyId!==id&&b.commanderId!==a.commanderId&&b.morale!=='ROUTING'&&relation(s,a.commanderId,b.commanderId).value>=min('TRUST')&&hexDistance(s.tiles[a.tileId],s.tiles[b.tileId])<=2);
}
export function markRelationMorale(s,id){if(!relationsEnabled(s)||!s.c38)return;s.c38.moraleUsed[id]=s.turn;const a=s.armies[id],c30=s.c30?.factions[a?.factionId]?.armies[id];if(c30)c30.moraleUsed=true;if(a){a.c27??={};a.c27.nerveTurn=s.turn;}}
export function ignoreRelationMorale(s,id){if(!relationTrustGuard(s,id)||s.c38.moraleUsed[id]!==undefined&&s.turn-s.c38.moraleUsed[id]<data.effects.TRUST.moraleCooldownTurns)return false;markRelationMorale(s,id);return true;}
export function relationAttack(s,id,target,options={}){
 const a=s.armies[id],t=s.armies[target];let factor=1;const lines=[];if(!relationsEnabled(s)||!a)return {factor,lines};
 const support=!options.counter&&!options.reaction&&!options.pursuit&&(s.c38?.hits??[]).filter(h=>h.turn===s.turn&&h.fid===a.factionId&&h.target===target&&h.officerId!==a.commanderId).sort((x,y)=>x.officerId.localeCompare(y.officerId)).find(h=>relation(s,a.commanderId,h.officerId).value>=min('CLOSE'));
 if(support){factor*=1+percent(data.effects.CLOSE.battle);lines.push(`${pairNames(s,a.commanderId,support.officerId)}의 협공 — 피해 +${percent(data.effects.CLOSE.battle)*100}%`);}
 const stage=groupStage(s,id);if(stage>=2){factor*=1+percent(data.boundSet.tiers['2']);lines.push(`결의 ${stage}인 — 피해 +${percent(data.boundSet.tiers['2'])*100}%`);if(stage>=3)lines.push(`결의 ${stage}인 — 사기 판정 가중 −${percent(data.boundSet.tiers['3'])*100}%`);if(stage>=4)lines.push(`결의 ${stage}인 — 고유 전법 게이지 충전 +${percent(data.boundSet.tiers['4'])*100}%`);}
 if(t&&a.factionId!==t.factionId&&relation(s,a.commanderId,t.commanderId).tier==='RIVAL'){factor*=1+percent(data.effects.RIVAL.battle);lines.push(`${pairNames(s,a.commanderId,t.commanderId)}의 숙적 — 피해 +${percent(data.effects.RIVAL.battle)*100}%`);}
 return {factor,lines};
}
export function recordRelationAttack(s,id,target,options={}){
 if(!relationsEnabled(s)||options.counter||options.reaction||options.pursuit)return;
 initializeRelations(s);const a=s.armies[id];if(!a)return;const x=s.c38;
 const effect=relationAttack(s,id,target,options),event=`${s.turn}:${options.event??s.battleSequence}:${id}`;if(effect.lines.some(l=>l.includes('협공 —'))&&!x.attackEvents.includes(event)){x.attackEvents.push(event);x.stats.jointAttacks++;}
 for(const h of x.hits)if(h.turn===s.turn&&h.fid===a.factionId&&h.target===target&&h.officerId!==a.commanderId){const key=a.factionId+':'+relationKey(a.commanderId,h.officerId);if(!x.jointPairs.includes(key)){x.jointPairs.push(key);gainRelation(s,a.commanderId,h.officerId,data.gains.jointAttack.value);}}
 if(!x.hits.some(h=>h.turn===s.turn&&h.fid===a.factionId&&h.target===target&&h.officerId===a.commanderId))x.hits.push({turn:s.turn,fid:a.factionId,target,officerId:a.commanderId});
}
export function relationVictory(s,id){const a=s.armies[id];if(a)gainRelation(s,s.factions[a.factionId].rulerId,a.commanderId,data.gains.victoryWithLord.value);}
export function relationCombatResult(s,before,id,target,log,{record=true}={}){
 if(record)recordRivalScene(s,before,id,target,log);
 if(!relationsEnabled(s))return;initializeRelations(s);recordRelationCaptors(s,before,id,target);if(record&&['ATTACK','TACTIC'].includes(log.kind))pastLifeEncounter(s,id,target,before);if(record)recordRelationAttack(s,id,target,{event:log.sequence,reaction:log.kind==='OVERWATCH',pursuit:log.kind==='PURSUIT'});
 for(const [victim,killer] of [[target,id],[id,target]]){const old=before.armies[victim],now=s.armies[victim],win=s.armies[killer];if(!old||!now||!win||old.factionId===before.armies[killer]?.factionId)continue;
  const key=log.sequence+':'+victim;if(!s.c38.outcomes.includes(key)&&old.troopCount>0&&(now.troopCount===0||old.morale!=='ROUTING'&&now.morale==='ROUTING'||before.officers[old.commanderId]?.captivityState==='FREE'&&s.officers[old.commanderId]?.captivityState==='PRISONER')){s.c38.outcomes.push(key);gainRelation(s,old.commanderId,before.armies[killer].commanderId,data.gains.defeatedBy.value);relationVictory(s,killer);}}
 observeRelationGroups(s);
}
export function relationCityOfficers(s,c,{commanders=false}={}){
 const ids=Object.values(s.officers).filter(o=>free(o)&&o.allegianceFactionId===c.ownerFactionId&&o.locationRef?.kind==='CITY'&&o.locationRef.id===c.cityId).map(o=>o.officerId);
 if(free(s.officers[c.governorId])&&s.officers[c.governorId].allegianceFactionId===c.ownerFactionId)ids.push(c.governorId);
 if(commanders)ids.push(...armies(s,c.ownerFactionId).filter(a=>a.tileId===c.tileId).map(a=>a.commanderId));return [...new Set(ids)].sort();
}
export function relationJobComplete(s,c){for(const id of relationCityOfficers(s,c))if(id!==c.governorId)gainRelation(s,c.governorId,id,data.gains.jobComplete.value);}
export function relationProduction(s,c){
 if(!relationsEnabled(s))return {factor:1,lines:[]};let bonus=0,rival=false;
 for(const [a,b] of pairs(relationCityOfficers(s,c))){const r=relation(s,a,b);if(r.tier==='RIVAL')rival=true;else if(r.value>=min('CLOSE'))bonus+=percent(data.effects.CLOSE.domestic);else if(r.value>=min('TRUST'))bonus+=percent(data.effects.TRUST.domestic);}
 bonus=Math.min(percent(data.effects.CLOSE.domestic.match(/최대[^)]*/)?.[0]??''),bonus)-(rival?percent(data.effects.RIVAL.domestic):0);
 return {factor:1+bonus,lines:bonus?[`장수 관계 — 생산 ${bonus>0?'+':'−'}${Math.round(Math.abs(bonus)*100)}%`]:[]};
}
export function settleRelationMonth(s){
 if(!relationsEnabled(s))return;initializeRelations(s);const x=s.c38,m=relationMonth(s);if(x.turn!==s.turn){x.turn=s.turn;x.hits=[];x.jointPairs=[];x.attackEvents=[];x.outcomes=[];}
 if(m===x.month)return;x.month=m;x.feasts={};x.visits={};
 for(const c of Object.values(s.cities))if(c.ownerFactionId)for(const [a,b] of pairs(relationCityOfficers(s,c)))gainRelation(s,a,b,data.gains.sameCityMonth.value);
 for(const fid of Object.keys(s.factions))for(const [a,b] of pairs(armies(s,fid).map(a=>a.armyId)))if(hexDistance(s.tiles[s.armies[a].tileId],s.tiles[s.armies[b].tileId])<=2)gainRelation(s,s.armies[a].commanderId,s.armies[b].commanderId,data.gains.nearbyMonth.value);
}
export function socialReason(s,cmd,fid=s.playerFactionId,{ai=false}={}){
 if(!relationsEnabled(s))return '이 지도에서는 친목을 할 수 없습니다';
 const x=s.c38,m=relationMonth(s),f=s.factions[fid];
 if(cmd.type==='FEAST'){const c=s.cities[cmd.cityId],ids=cmd.officerIds;if(!c||c.ownerFactionId!==fid)return '내 성에서만 술자리를 열 수 있습니다';if(!Array.isArray(ids)||ids.length<2||ids.length>3||new Set(ids).size!==ids.length)return '서로 다른 장수 2~3명을 골라 주세요';if(ids.some(id=>!relationCityOfficers(s,c,{commanders:true}).includes(id)))return '그 성에 있는 장수만 함께할 수 있습니다';if(x.feasts[c.cityId]?.month===m)return '이번 달 술자리를 이미 열었습니다';if(!(ai&&f.prestige===undefined)&&(f.prestige??0)<data.gains.feast.costPrestige)return '술자리를 열 인망이 부족합니다';}
 else if(cmd.type==='VISIT'){const o=s.officers[cmd.officerId];if(!free(o)||o.allegianceFactionId!==fid||o.officerId===f.rulerId||o.locationRef?.kind!=='CITY')return '내 세력의 자유 장수를 골라 주세요';if(!Number.isInteger(cmd.choice)||data.gains.visit.values[cmd.choice]===undefined)return '대화 선택지를 골라 주세요';if(x.visits[o.officerId]?.month===m)return '이번 달에는 이미 대화했습니다';}else return '친목 명령을 골라 주세요';return '';
}
export function socialCommand(s,cmd,fid=s.playerFactionId,options={}){
 initializeRelations(s);const reason=socialReason(s,cmd,fid,options);if(reason)throw new Error(reason);const m=relationMonth(s),x=s.c38;
 if(cmd.type==='FEAST'){if(s.factions[fid].prestige!==undefined)s.factions[fid].prestige-=data.gains.feast.costPrestige;x.feasts[cmd.cityId]={month:m,factionId:fid};for(const [a,b] of pairs(cmd.officerIds))gainRelation(s,a,b,data.gains.feast.value);if(options.ai)x.stats.aiFeasts++;}
 else {x.visits[cmd.officerId]={month:m,factionId:fid};gainRelation(s,s.factions[fid].rulerId,cmd.officerId,data.gains.visit.values[cmd.choice]);}
 s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:fid,text:cmd.type==='FEAST'?`${cmd.officerIds.map(id=>name(s,id)).join('·')}의 술자리`:`${pairNames(s,s.factions[fid].rulerId,cmd.officerId)}의 대화`});return s;
}
export function aiRelationFeast(s,fid){
 if(!relationsEnabled(s)||fid===s.playerFactionId)return;initializeRelations(s);const m=relationMonth(s),x=s.c38;if(x.aiMonths[fid]===m)return;x.aiMonths[fid]=m;
 const f=s.factions[fid],c=s.cities[f.capitalCityId];if(!f.alive||c?.ownerFactionId!==fid)return;
 const ids=relationCityOfficers(s,c,{commanders:true}).sort((a,b)=>relation(s,f.rulerId,b).value-relation(s,f.rulerId,a).value||(s.officers[b].baseStats.leadership+s.officers[b].baseStats.politics)-(s.officers[a].baseStats.leadership+s.officers[a].baseStats.politics)||a.localeCompare(b));
 const selected=[];for(const id of ids)if(selected.every(other=>relation(s,id,other).value>=data.defaultValue)&&selected.length<3)selected.push(id);
 const cmd={type:'FEAST',cityId:c.cityId,officerIds:selected};if(!socialReason(s,cmd,fid,{ai:true}))socialCommand(s,cmd,fid,{ai:true});
}
export function relationsView(s,fid,knownIds=Object.keys(s.officers)){
 if(!relationsEnabled(s))return null;const os=Object.values(s.officers).filter(o=>o.allegianceFactionId===fid),lordId=s.factions[fid].rulerId,m=relationMonth(s);
 return {lordId,month:m,officers:Object.fromEntries(os.map(o=>{const list=knownIds.map(id=>s.officers[id]).filter(b=>b&&b.officerId!==o.officerId).map(b=>({officerId:b.officerId,name:b.name,...relation(s,o.officerId,b.officerId)})).sort((a,b)=>b.value-a.value||a.officerId.localeCompare(b.officerId));const top=list.slice(0,6);return [o.officerId,{lordAffinity:o.officerId===lordId?null:relation(s,lordId,o.officerId).value,relations:[...top,...list.slice(6).filter(r=>r.tier==='RIVAL')],visitUsed:s.c38.visits[o.officerId]?.month===m}];})),boundGroups:relationGroups(s,fid),feastUsed:Object.fromEntries(Object.values(s.cities).filter(c=>c.ownerFactionId===fid).map(c=>[c.cityId,s.c38.feasts[c.cityId]?.month===m]))};
}
export function validateRelations(s){
 if(!relationsEnabled(s))return;const fail=()=>{throw new Error('INVALID_CAMPAIGN_RELATIONS');},os=roster(s),x=s.c38,object=v=>v&&typeof v==='object'&&!Array.isArray(v),turn=n=>Number.isSafeInteger(n)&&n>=1&&n<=s.turn;
 const scenes=s.relationScenes;
 if(scenes?.seen!==undefined&&(!Array.isArray(scenes.seen)||new Set(scenes.seen).size!==scenes.seen.length||scenes.seen.some(k=>typeof k!=='string'||k.split('|').length!==2||!k.split('|').every(id=>os[id])||relationKey(...k.split('|'))!==k)))fail();
 const validScene=e=>object(e)&&e.a!==e.b&&os[e.a]&&os[e.b]&&(sceneData.stages[e.tier]||e.tier==='RIVAL')&&Object.hasOwn(data.kindNames,e.kind)&&turn(e.turn);
 if(!object(scenes)||!Array.isArray(scenes.queue)||scenes.queue.some(e=>!validScene(e))||scenes.active!==null&&!validScene(scenes.active)||!Number.isSafeInteger(scenes.lastTurn)||scenes.lastTurn<0||scenes.lastTurn>s.turn)fail();
 for(const key of ['pastLifeEncounters','captiveReleases'])if(!Array.isArray(x?.[key])||new Set(x[key]).size!==x[key].length||x[key].some(k=>typeof k!=='string'))fail();
 if(!object(x?.rivalEvents))fail();else for(const [key,e] of Object.entries(x.rivalEvents)){const [a,b,...rest]=key.split('|');if(rest.length||a===b||!os[a]||!os[b]||relationKey(a,b)!==key||!object(e)||!data.rivalEvents[e.event]||!turn(e.turn)||Object.keys(e).some(k=>!['event','turn'].includes(k)))fail();}
 for(const key of x.pastLifeEncounters){const p=history.get(key);if(!p?.grudge||!os[p.a]||!os[p.b])fail();}
 for(const key of x.captiveReleases)if(!s.terminal?.prisonersById[key]||s.terminal.prisonersById[key].disposition==='HELD')fail();
 if(!object(s.relations)||!object(x)||!turn(x.turn)||!Number.isSafeInteger(x.month)||x.month<0||x.month>relationMonth(s)||!Array.isArray(x.hits)||!Array.isArray(x.jointPairs)||!Array.isArray(x.seenGroups)||!Array.isArray(x.outcomes)||!object(x.stats))fail();
 for(const [key,r] of Object.entries(s.relations)){const [a,b,...rest]=key.split('|');if(rest.length||!os[a]||!os[b]||a===b||relationKey(a,b)!==key||!object(r)||!Number.isFinite(r.value)||r.value<data.range[0]||r.value>data.range[1]||r.kind!==undefined&&!Object.hasOwn(data.kindNames,r.kind)||Object.keys(r).some(k=>!['value','kind'].includes(k)))fail();}
 for(const h of x.hits)if(!object(h)||!turn(h.turn)||!s.factions[h.fid]||!os[h.officerId]||!s.armies[h.target]&&!s.cities[h.target])fail();
 for(const key of ['feasts','visits']){if(!object(x[key]))fail();for(const [id,e] of Object.entries(x[key]))if(!(key==='feasts'?s.cities[id]:os[id])||!object(e)||!Number.isSafeInteger(e.month)||e.month<0||e.month>relationMonth(s)||!s.factions[e.factionId])fail();}
 for(const key of ['aiMonths','moraleUsed']){if(!object(x[key]))fail();for(const [id,n] of Object.entries(x[key]))if(key==='aiMonths'?!s.factions[id]||!Number.isSafeInteger(n)||n<0||n>relationMonth(s):!s.armies[id]||!turn(n))fail();}
 for(const key of ['jointAttacks','boundGroups','aiFeasts','rivals'])if(!Number.isSafeInteger(x.stats[key])||x.stats[key]<0)fail();for(const key of ['jointPairs','seenGroups','outcomes','attackEvents'])if(!Array.isArray(x[key])||new Set(x[key]).size!==x[key].length||x[key].some(k=>typeof k!=='string'))fail();
}

export function ignoreBoundRout(s,id,source){
 if(!relationsEnabled(s)||!data.effects.BOUND.battle)return false;
 const a=s.armies[id];if(!a||!source||a.factionId!==source.factionId||relation(s,a.commanderId,source.commanderId).tier!=='BOUND')return false;
 const n=name(s,a.commanderId),code=n.codePointAt(n.length-1),text=`${n}${code>=0xAC00&&code<=0xD7A3&&(code-0xAC00)%28?'은':'는'} ${name(s,source.commanderId)}의 패주에도 흔들리지 않았다(결의)`;
 s.moraleLog??=[];s.moraleLog.push({turn:s.turn,armyId:id,reason:'결의',text,relationRoutIgnored:true});
 return true;
}
export function relationSecurity(s,c){
 const ids=relationsEnabled(s)&&data.effects.BOUND.domestic?relationCityOfficers(s,c):[];
 const active=ids.includes(c.governorId)&&ids.some(id=>id!==c.governorId&&relation(s,c.governorId,id).tier==='BOUND');
 return {relationSecurity:active,securityLevel:Math.max(0,(c.securityLevel??0)-(active?1:0)),securityCauses:active?['결의 짝과 함께 다스림']:[]};
}

// Events are committed after attack damage, so preview and actual damage agree.
export function rivalEvent(s,event,a,b){
 if(!relationsEnabled(s)||a===b||!roster(s)[a]||!roster(s)[b]||!data.rivalEvents[event])return false;
 initializeRelations(s);const key=relationKey(a,b),x=s.c38;if(x.rivalEvents[key])return false;
 const rng=createRng();rng.restore(s.rng.value);const roll=rng.next();s.rng.value=rng.state();s.rng.draws++;
 if(roll>=data.rivalEvents[event].chance)return false;
 x.rivalEvents[key]={event,turn:s.turn};s.relations[key]={...(s.relations[key]??{}),value:data.rivalRule.setValue};x.stats.rivals++;
 const subject=n=>{const code=n.codePointAt(n.length-1);return code>=0xAC00&&code<=0xD7A3&&(code-0xAC00)%28?'은':'는';};
 const object=n=>subject(n)==='은'?'을':'를';
 const text=data.rivalEvents[event].line.replace(/\{([ab])\}(\uC740\(\uB294\)|\uC744\(\uB97C\))?/g,(_,id,p)=>{const n=name(s,id==='a'?a:b);return n+(p?(p==='\uC740(\uB294)'?subject(n):object(n)):'');});
 s.administrationLog??=[];s.administrationLog.push({turn:s.turn,factionId:[a,b].some(id=>s.officers[id]?.allegianceFactionId===s.playerFactionId)?s.playerFactionId:s.officers[a]?.allegianceFactionId??s.officers[b]?.allegianceFactionId,text});return true;
}
export function pastLifeEncounter(s,id,target,before=s){
 if(!relationsEnabled(s))return false;const a=before.armies[id],b=before.armies[target];if(!a||!b||a.factionId===b.factionId)return false;
 const key=relationKey(a.commanderId,b.commanderId);if(!history.get(key)?.grudge)return false;initializeRelations(s);
 if(s.c38.pastLifeEncounters.includes(key))return false;s.c38.pastLifeEncounters.push(key);return rivalEvent(s,'pastLife',a.commanderId,b.commanderId);
}
export function recordRelationCaptors(s,before,id,target){
 if(!relationsEnabled(s))return;for(const p of Object.values(s.terminal?.prisonersById??{})){
  if(before.terminal?.prisonersById[p.prisonerRecordId]||before.prisonerIds?.includes(p.prisonerRecordId))continue;
  const victim=[id,target].find(i=>before.armies[i]?.commanderId===p.officerId),captor=before.armies[victim===id?target:id];
  if(!victim||!captor||captor.factionId!==p.captorFactionId)continue;
  s.terminal.recordsById[p.captureRecordId].details.captorId??=captor.commanderId;
 }
}
export function relationCaptiveReleased(s,p){
 if(!relationsEnabled(s)||p.disposition!=='RELEASED')return false;initializeRelations(s);
 if(s.c38.captiveReleases.includes(p.prisonerRecordId))return false;s.c38.captiveReleases.push(p.prisonerRecordId);
 const closure=s.terminal.recordsById[p.closureRecordId];if(closure?.details.disposition==='RECRUITED')return false;
 const captor=s.terminal.recordsById[p.captureRecordId]?.details.captorId;return captor?rivalEvent(s,'captiveRelease',captor,p.officerId):false;
}
export function settleRelationCaptiveReleases(s){if(relationsEnabled(s))for(const p of Object.values(s.terminal?.prisonersById??{}))if(p.disposition==='RELEASED')relationCaptiveReleased(s,p);}

export function startRelationScene(s){
 if(!relationsEnabled(s))return;initializeRelations(s);const x=s.relationScenes;if(x.lastTurn===s.turn||x.active)return;
 x.active=null;const ready=x.queue.filter(e=>!x.seen.includes(relationKey(e.a,e.b))&&e.turn<s.turn&&[e.a,e.b].every(id=>free(s.officers[id])&&s.officers[id].allegianceFactionId===s.playerFactionId));
 x.queue=x.queue.filter(e=>e.turn>=s.turn);x.lastTurn=s.turn;if(ready.length)x.active=ready[0];
 if(x.active)x.seen.push(relationKey(x.active.a,x.active.b));
 // All tier changes already have an administration record; excess scenes stay there.
}
// C222: rival encounters share the same save-backed ledger as friendly scenes.
export function recordRivalScene(s,before,id,target,log){
 if(!relationsEnabled(s)||!['ATTACK','TACTIC','JOINT_TACTIC'].includes(log.kind))return;
 const a=before.armies[id],b=before.armies[target],fid=s.playerFactionId;
 if(!a||!b||a.factionId===b.factionId||![a.factionId,b.factionId].includes(fid))return;
 const visible=x=>x.factionId===fid||before.knowledge?.[fid]?.tiles?.[x.tileId]==='VISIBLE';
 const key=relationKey(a.commanderId,b.commanderId);
 if(!visible(a)||!visible(b)||!rivalSceneData.pairs[key]?.RIVAL||relation(before,a.commanderId,b.commanderId).tier!=='RIVAL')return;
 initializeRelations(s);const x=s.relationScenes;
 if(x.seen.includes(key)||x.active)return;
 x.active={a:a.commanderId,b:b.commanderId,tier:'RIVAL',kind:'RIVAL',turn:s.turn};x.seen.push(key);
}
// The rule's main clause follows its key; parenthesized clauses name the reverse direction.
export function relationSpeechStyle(speaker,listener,kind,rules=visitTalks.speechRules){
 const style=text=>/존대/.test(text)?'honorific':/하오체/.test(text)?'hao':/반말|하게체/.test(text)?'casual':null;
 const mutual=rules[`${speaker}↔${listener}`]??rules[`${listener}↔${speaker}`];
 if(mutual)return style(mutual)??'hao';
 for(const [from,to] of [[speaker,listener],[listener,speaker]]){
  const rule=rules[`${from}→${to}`];if(!rule)continue;
  const clauses=rule.match(/\(([^)]+)\)/g)??[];
  for(const clause of clauses){const prefix=`${speaker}→${listener} `,text=clause.slice(1,-1);if(text.startsWith(prefix))return style(text.slice(prefix.length))??'hao';}
  if(from===speaker)return style(rule.split('(')[0])??'hao';
 }
 return ['BLOOD','SWORN','SPOUSE'].includes(kind)?'casual':'hao';
}
export function relationSceneView(s,fid=s.playerFactionId){
 const e=s.relationScenes?.active;if(fid!==s.playerFactionId||!e)return null;
 // v0.2: 쌍마다 친우(CLOSE) · 결의(BOUND) 장면이 따로 있다. 옛 평면 형식(title/lines)도 읽는다.
 const stage=sceneData.stages[e.tier]??sceneData.stages.NORMAL,entry=(e.tier==='RIVAL'?rivalSceneData:sceneData).pairs[relationKey(e.a,e.b)],pair=entry?.[e.tier]??(entry?.lines?entry:null),ids=pair?.speakerIds??[e.a,e.b];
 const names=ids.map(id=>name(s,id)),voice=i=>relationSpeechStyle(names[i],names[1-i],e.kind)==='casual'?'casual':'polite';
 return {...e,title:pair?.title??`${sceneData.kinds[e.kind]??stage.title} · ${stage.title}`,officers:ids.map(id=>({officerId:id,name:name(s,id)})),lines:pair?.lines??[stage[voice(0)][0],stage[voice(1)][1],sceneData.kindLines[e.kind]?.[voice(0)]??stage[voice(0)][2]]};
}
