import data from '../data/run-modifiers-v0.1.json' with {type:'json'};

export const RUN_MODIFIERS=data;
const values=o=>Object.values(o??{});
// Independent draws never consume combat/event RNG. The only large object is
// kept off-state: structuredClone/JSON saves cannot accidentally persist it.
const starts=new WeakMap();
const draw=(s,salt,n)=>{let h=2166136261;for(const c of `${s.campaignSeed}:${salt.startsWith('weather-')?'':s.playerFactionId}:${salt}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%n;};
let services={};
export function configureRunModifiers(api){services=api;}
const log=(s,type,text,extra={})=>{const e={turn:s.turn,type,source:'C211',text,...extra};s.history.push(e);(s.administrationLog??=[]).push({...e});};
const capital=s=>s.cities[s.factions[s.playerFactionId]?.capitalCityId];
const facility=s=>({F01:'tuntian',F02:'clinic',F03:'mufu'})[s.playerFactionId];
const wanderers=s=>values(s.wanderers).filter(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&!o.allegianceFactionId&&!values(s.captiveRecruitment?.proposals).some(p=>p.targetOfficerId===o.officerId&&p.status==='NEGOTIATING')).sort((a,b)=>a.officerId.localeCompare(b.officerId));
export function initializeRunModifiers(s,{legacy=false}={}){
 if(!['v2','v3'].includes(s.mapId)||s.trialRules?.runModifiers===false||s.runModifiers)return s;
 s.runModifiers={version:1,rewind:{charges:data.rewind.chargesPerRun,last:null},blessing:{offeredIds:[],chosen:null,closed:legacy&&s.turn>=4},heaven:[],weather:legacy?[]:data.weather.windows.map(([a,b],i)=>({kind:data.weather.kinds[draw(s,`weather-kind:${i}`,data.weather.kinds.length)].id,startTurn:a+draw(s,`weather-turn:${i}`,b-a+1)})),lastTurn:legacy?s.turn:0,legacy};
 return s;
}
export function rememberRewindStart(s){if(s.phase==='PLAYER'&&!s.gameResult&&s.runModifiers)starts.set(s,structuredClone(s));return s;}
export function carryRewindStart(from,to){if(!starts.has(to)&&starts.has(from)&&from.turn===to.turn)starts.set(to,starts.get(from));return to;}
export function rewindView(s,f=s.playerFactionId){
 const charges=s.runModifiers?.rewind.charges??data.rewind.chargesPerRun;
 const reason=f!==s.playerFactionId?'플레이어만 되감을 수 있습니다.':s.gameResult?'판이 끝났습니다.':s.phase!=='PLAYER'?'상대 차례입니다.':charges<=0?'기시감을 모두 썼습니다.':!starts.has(s)?'불러온 차례에는 시작 기억이 없습니다. 다음 차례부터 쓸 수 있습니다.':null;
 return {charges,available:!reason,reason,...(s.runModifiers?.rewind.last?{last:structuredClone(s.runModifiers.rewind.last)}:{})};
}
export function rewindTurn(s,{factionId=s.playerFactionId}={}){
 const v=rewindView(s,factionId);if(!v.available)throw new Error(v.reason);
 const start=starts.get(s),next=structuredClone(start),charges=v.charges-1;
 next.runModifiers.rewind.charges=charges;
 const pool=values(next.officers).filter(o=>o.allegianceFactionId===s.playerFactionId&&o.lifeState==='ALIVE').sort((a,b)=>a.officerId.localeCompare(b.officerId));
 const o=pool[draw(next,`rewind-officer:${next.turn}`,Math.max(1,pool.length))];
 const text=data.rewind.lines[draw(next,`rewind-line:${next.turn}`,data.rewind.lines.length)].replace('{officer}',o?.name??'장수');
 next.runModifiers.rewind.last={officerId:o?.officerId??null,text,turn:next.turn};log(next,'REWIND',text,{officerId:o?.officerId??null,charges});starts.set(next,start);return next;
}
function blessingAllowed(s,b){
 const c=capital(s);if(b.effect.type==='RECRUIT_WANDERER')return !!c&&wanderers(s).length>0;
 if(b.effect.type==='FREE_UNIQUE_FACILITY')return !!c&&!!facility(s)&&!c.facilities.some(f=>f.kind===facility(s))&&(services.facilityTiles?.(s,c).length??0)>0;
 return true;
}
export function offerBlessing(s,{force=false}={}){
 const b=s.runModifiers?.blessing;if(!b||b.closed||b.chosen||s.gameResult||s.phase!=='PLAYER'||s.turn>=4||!force&&!s.ambitions?.closed)return;
 const pool=data.blessing.list.filter(b=>blessingAllowed(s,b));
 // Remove a facility/recruit offer if circumstances changed before confirmation.
 b.offeredIds=b.offeredIds.filter(id=>pool.some(p=>p.id===id));
 while(b.offeredIds.length<Math.min(data.blessing.offerCount,pool.length)){
  const left=pool.filter(p=>!b.offeredIds.includes(p.id));b.offeredIds.push(left[draw(s,`blessing:${b.offeredIds.length}`,left.length)].id);
 }
 if(!b.wandererId&&wanderers(s).length)b.wandererId=wanderers(s)[draw(s,'blessing-wanderer',wanderers(s).length)].officerId;
}
export function chooseBlessing(s,{blessingId,factionId=s.playerFactionId}={}){
 offerBlessing(s);const b=s.runModifiers?.blessing,d=data.blessing.list.find(b=>b.id===blessingId);
 if(factionId!==s.playerFactionId||s.phase!=='PLAYER'||s.gameResult||!b||b.closed||!b.offeredIds.includes(blessingId)||!d||!blessingAllowed(s,d))throw new Error('BLESSING_NOT_OFFERED');
 if(d.effect.type==='RECRUIT_WANDERER'){
  const o=s.wanderers[b.wandererId]??wanderers(s)[0],c=capital(s);b.wandererId=o.officerId;o.locationRef={kind:'CITY',id:c.cityId};
  services.adoptWanderer(s,{targetOfficerId:o.officerId,factionId:s.playerFactionId,candidateSourceRef:c.cityId,proposalId:'C211.BLESSING'});
 }else if(d.effect.type==='FREE_UNIQUE_FACILITY'){
  const c=capital(s);c.facilities.push({kind:facility(s),tileId:services.facilityTiles(s,c)[0]});s.c20.stats.facilities++;
 }else if(d.effect.type==='CARRIED_FOOD_MAX'){
  for(const a of values(s.armies).filter(a=>a.factionId===s.playerFactionId)){
   // Carry the extra starting turn of food; normal supply rules handle refills.
   const before=services.supplyMax(s,a);b.chosen=blessingId;const after=services.supplyMax(s,a);b.chosen=null;a.supplyFood=Math.min(after,(a.supplyFood??0)+after-before);
  }
 }
 b.chosen=blessingId;b.closed=true;log(s,'BLESSING',`${data.blessing.title} — ${d.title}`,{blessingId});services.updateKnowledge(s);
}
export function finishBlessingPlayerTurn(s){offerBlessing(s,{force:true});const b=s.runModifiers?.blessing;if(b&&!b.closed&&b.offeredIds.length)chooseBlessing(s,{blessingId:b.offeredIds[0]});}
export function blessingEffect(s,type){const d=data.blessing.list.find(b=>b.id===s.runModifiers?.blessing.chosen);return d?.effect.type===type?d.effect:null;}
export const blessingSight=(s,f)=>f===s.playerFactionId&&s.turn<=(blessingEffect(s,'SIGHT_BONUS')?.turns??0)?blessingEffect(s,'SIGHT_BONUS').value:0;
export function weatherView(s){
 const events=s.runModifiers?.weather??[],duration=data.weather.durationTurns;
 const e=events.find(e=>e.startTurn<=s.turn&&s.turn<e.startTurn+duration);
 return {upcoming:events.filter(e=>e.startTurn>s.turn&&e.startTurn-s.turn<=data.weather.warnTurnsAhead).map(e=>({...e})),active:e?{kind:e.kind,until:e.startTurn+duration-1}:null};
}
export const weatherKind=s=>weatherView(s).active?.kind;
export function weatherEdgeReason(s,from,to){return weatherKind(s)==='RAIN'&&s.mapRules.crossings[[from,to].sort().join('|')]==='ford'?'장마':null;}
export function heavenBonus(s,f){const awards=(s.runModifiers?.heaven??[]).filter(a=>a.factionId===f&&a.startTurn<=s.turn&&a.until>=s.turn);return {attackPct:awards.some(a=>a.kind==='favored')?data.heaven.favored.effect.attackPct:0,defensePct:awards.some(a=>a.kind==='underdog')?data.heaven.underdog.effect.defensePct:0};}
export function heavenCombat(s,attackerFaction,targetFaction){const a=heavenBonus(s,attackerFaction),t=heavenBonus(s,targetFaction);return {factor:(1+a.attackPct/100)/(1+t.defensePct/100),lines:[...(a.attackPct?[`천시 +${a.attackPct}%`]:[]),...(t.defensePct?[`역전의 기세 방어 +${t.defensePct}%`]:[])]};}
export function startRunModifierTurn(s){
 const x=s.runModifiers;if(!x||s.gameResult||x.lastTurn===s.turn)return;x.lastTurn=s.turn;
 if(!x.legacy&&data.heaven.turns.includes(s.turn)){
  const ranks=values(s.factions).filter(f=>f.alive).map(f=>{const cs=values(s.cities).filter(c=>c.ownerFactionId===f.factionId);return {f,major:cs.filter(c=>c.kind==='major').length,minor:cs.filter(c=>c.kind==='minor').length};}).sort((a,b)=>b.f.prestige-a.f.prestige||b.major-a.major||b.minor-a.minor||a.f.factionId.localeCompare(b.f.factionId));
  for(const [kind,r] of [['favored',ranks[0]],['underdog',ranks.at(-1)]])if(r){const a={kind,factionId:r.f.factionId,startTurn:s.turn,until:s.turn+data.heaven.durationTurns-1};x.heaven.push(a);log(s,'HEAVEN',`${data.heaven[kind].title} — ${r.f.name??r.f.factionId} · ${data.heaven.durationTurns}차례`,{award:a});}
 }
 for(const a of x.heaven){
  if(a.until===s.turn-1)log(s,'HEAVEN_END',`${data.heaven[a.kind].title} — ${a.factionId} 끝남`);
  if(a.kind==='underdog'&&a.startTurn<=s.turn&&a.until>=s.turn)for(const c of values(s.cities).filter(c=>c.ownerFactionId===a.factionId))c.durability=Math.min(c.durabilityMax,c.durability+data.heaven.underdog.effect.durabilityPerTurn);
 }
 for(const e of x.weather){const name=data.weather.kinds.find(k=>k.id===e.kind).title;
  if(e.startTurn-data.weather.warnTurnsAhead===s.turn)log(s,'WEATHER_WARNING',`${name} ${data.weather.warnTurnsAhead}차례 뒤`,{weather:{...e}});
  if(e.startTurn===s.turn)log(s,'WEATHER_START',`${name} 시작 · ${data.weather.durationTurns}차례`,{weather:{...e}});
  if(e.startTurn+data.weather.durationTurns===s.turn)log(s,'WEATHER_END',`${name} 끝남`,{weather:{...e}});
 }
}
export function runModifiersView(s,f){
 if(!['v2','v3'].includes(s.mapId))return {};
 const x=s.runModifiers,b=x?.blessing;
 return {rewind:rewindView(s,f),weather:weatherView(s),heaven:structuredClone((x?.heaven??[]).filter(a=>a.startTurn<=s.turn&&a.until>=s.turn)),...(f===s.playerFactionId?{blessing:{title:data.blessing.title,offered:b&&!b.closed?b.offeredIds.map(id=>{const d=data.blessing.list.find(b=>b.id===id);return {...structuredClone(d),...(d.effect.type==='RECRUIT_WANDERER'?{officerId:b.wandererId,officerName:s.wanderers[b.wandererId]?.name}:{} )};}):[],chosen:b?.chosen??null}}:{})};
}
export function validateRunModifiers(s){
 const x=s.runModifiers;if(!x)return;
 if(x.version!==1||!Number.isInteger(x.rewind?.charges)||x.rewind.charges<0||x.rewind.charges>data.rewind.chargesPerRun||!Array.isArray(x.weather)||!Array.isArray(x.heaven)||!Array.isArray(x.blessing?.offeredIds)||new Set(x.blessing.offeredIds).size!==x.blessing.offeredIds.length||x.blessing.offeredIds.some(id=>!data.blessing.list.some(b=>b.id===id))||x.blessing.chosen&&!x.blessing.offeredIds.includes(x.blessing.chosen))throw new Error('INVALID_RUN_MODIFIERS');
 for(const e of x.weather)if(!data.weather.kinds.some(k=>k.id===e.kind)||!data.weather.windows.some(([a,b])=>Number.isInteger(e.startTurn)&&e.startTurn>=a&&e.startTurn<=b))throw new Error('INVALID_RUN_WEATHER');
 for(const a of x.heaven)if(!['favored','underdog'].includes(a.kind)||!s.factions[a.factionId]||!data.heaven.turns.includes(a.startTurn)||a.until!==a.startTurn+data.heaven.durationTurns-1)throw new Error('INVALID_RUN_HEAVEN');
}
