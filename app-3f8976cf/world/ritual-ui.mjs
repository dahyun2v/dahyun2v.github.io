// C273: presentation only. No engine commands or save writes.
const PREF='sg.ritual.v1';
let preferenceOverride;
export function ritualEnabled(search=globalThis.location?.search??'',storage){
 const query=new URLSearchParams(search).get('ritual');if(query!==null)return query==='v1';
 if(preferenceOverride!==undefined)return preferenceOverride;
 try{return (storage??globalThis.localStorage)?.getItem(PREF)!=='off';}catch{return true;}
}
export function setRitualEnabled(on){
 preferenceOverride=on;
 const url=new URL(location.href);url.searchParams.delete('ritual');history.replaceState(null,'',url);
 try{localStorage.setItem(PREF,on?'v1':'off');}catch{}
 document.dispatchEvent(new CustomEvent('ink:ritual-settings'));
}
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pairKey=ids=>[...ids].sort().join('|');
export function createRitualTracker({storage=()=>globalThis.sessionStorage}={}){
 let seen=new Set(),previous=null,queue=[],runKey=null;
 const add=(kind,officers,line,title)=>{if(officers.length!==2||officers.some(o=>!o?.officerId))return;const key=pairKey(officers.map(o=>o.officerId));if(seen.has(key))return;seen.add(key);try{if(runKey)storage()?.setItem(runKey,JSON.stringify([...seen]));}catch{}queue.push({key,kind,officers,line,title,barkKey:`ritual.${kind}.${key}`});};
 return {
  reset(){seen=new Set();previous=null;queue=[];},
  run(id,fresh=false){this.reset();runKey=`sg.ritual.seen.v1:${id}`;try{if(fresh)storage()?.removeItem(runKey);else{const saved=JSON.parse(storage()?.getItem(runKey)??'[]');if(Array.isArray(saved)&&saved.every(k=>typeof k==='string'))seen=new Set(saved);}}catch{}},
  observe(v,enabled){
   if(!enabled){previous=v;queue=[];return null;}
   const scene=v.relationScene;
   if(scene&&['TRUST','CLOSE','BOUND','RIVAL'].includes(scene.tier))add(scene.tier==='RIVAL'?'rival':scene.tier==='BOUND'?'bound':'bond',scene.officers,scene.title,scene.tier==='RIVAL'?'宿敵':({SWORN:'義兄弟',LORD:'君臣',FRIEND:'知己',BLOOD:'血緣',SPOUSE:'連理',MENTOR:'師弟'})[scene.kind]);
   if(previous?.factionId===v.factionId){
    const lord=v.officers?.[v.faction?.rulerId];
    for(const o of Object.values(v.officers??{})){
     const before=previous.officers?.[o.officerId];if(!before||before.allegianceFactionId!==v.factionId||o.officerId===lord?.officerId)continue;
     const enemies=v.diplomacy?.factions??[];
     const kind=before.lifeState==='ALIVE'&&o.lifeState==='DEAD'?'death':before.lifeState==='ALIVE'&&o.lifeState==='ALIVE'&&o.allegianceFactionId!==v.factionId?(enemies.some(f=>f.factionId===o.allegianceFactionId&&f.state==='WAR')?'betrayal':'departure'):null;
     if(kind&&lord)add(kind,[lord,o],`${before.name} · ${lord.name}`);
    }
   }
   previous=v;return queue.shift()??null;
  }
 };
}
// Cache both success and failure: optional presentation data must never block a card.
export function createRitualBarkLoader(fetcher=(...args)=>globalThis.fetch(...args)){
 let pending;
 return ()=>pending??=Promise.resolve().then(()=>fetcher('/data/ritual-barks-v0.1.json')).then(r=>r.ok?r.json():null).catch(()=>null);
}
const loadRitualBarks=createRitualBarkLoader();
export function ritualBarkLines(event,data){
 // 쌍 대사(pairAny)는 관계가 깊어지는 카드(bond · bound)에만 — 숙적 · 전사 · 배신 · 이별은 종류별 글을 쓴다
 const pair=data?.pairs?.[event.barkKey]??(['bond','bound'].includes(event.kind)?data?.pairAny?.[event.key]:undefined);
 if(Array.isArray(pair)&&pair.length===2){
  const lines=pair.map(row=>({speaker:event.officers.find(o=>o.officerId===row?.speaker||o.name===row?.speaker)?.name,line:row?.line}));
  if(lines.every(row=>row.speaker&&typeof row.line==='string'&&row.line.trim()))return lines;
 }
 const generic=data?.generic?.[event.kind];
 return Array.isArray(generic)&&generic.length===2&&generic.every(line=>typeof line==='string'&&line.trim())&&event.officers.length===2
  ?generic.map((line,i)=>({speaker:event.officers[i].name,line})):[];
}
const barkMarkup=lines=>lines.map(row=>`<span class="c276-bark-line"><span class="c276-speaker">${escapeHtml(row.speaker)}</span><span>${escapeHtml(row.line)}</span></span>`).join('');
export function ritualMarkup(event,art=()=>null,lines=[]){
 const titles={bond:'君臣',bound:'義兄弟',rival:'宿敵',death:'戰死',betrayal:'背信',departure:'離別'};
 const backgrounds={bond:'bond',bound:'brother',rival:'rival',death:'fallen',betrayal:'betray',departure:'bond'};
 return `<img class="c273-background" src="/assets/ui-v3/ritual/ritual-${backgrounds[event.kind]??'bond'}.webp" alt="">${event.officers.map((o,i)=>{const a=art(o.officerId);return a?.src?`<img class="c273-person c273-person-${i}" data-officer="${escapeHtml(o.officerId)}" src="${escapeHtml(a.src)}" alt="${escapeHtml(o.name)}">`:'';}).join('')}<div class="c273-center"><h1>${escapeHtml(event.title??titles[event.kind]??'君臣')}</h1><p>${escapeHtml(event.line)}</p><p class="c273-bark" data-bark-key="${escapeHtml(event.barkKey)}">${barkMarkup(lines)}</p><small>클릭 · Esc로 계속</small></div>`;
}
export function mountRitual({art,cutout,done,reduced=()=>false,loadBarks=loadRitualBarks}){
 let host=null,timer=null,active=false,focus=null;
 let barks=null;const ready=loadBarks().then(data=>{barks=data;}).catch(()=>{});
 const close=(notify=true)=>{if(!active)return;active=false;clearTimeout(timer);host?.remove();host=null;focus?.isConnected&&focus.focus();if(notify)done();};
 window.addEventListener('keydown',e=>{if(!active)return;if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();close();}e.stopImmediatePropagation();},true);
 return {busy:()=>active,close,show(event){
  if(!event||active)return;active=true;focus=document.activeElement;
  host=document.createElement('button');host.type='button';host.className='c273-ritual';host.setAttribute('aria-label',`${event.line} · 계속`);host.innerHTML=ritualMarkup(event,art);
  host.querySelector('.c273-background').onerror=e=>e.currentTarget.remove();
  host.onclick=()=>close();document.body.append(host);host.focus();
  for(const im of host.querySelectorAll('.c273-person')){const a=art(im.dataset.officer);if(a&&!a.cut)cutout(a.src).then(src=>{if(im.isConnected&&src)im.src=src;});}
  timer=setTimeout(close,reduced()?350:2200);
  const card=host;
  const applyBarks=()=>{
   if(!active||host!==card)return;
   const lines=ritualBarkLines(event,barks);if(!lines.length)return;
   card.querySelector('.c273-bark').innerHTML=barkMarkup(lines);
   card.setAttribute('aria-label',`${event.line} · ${lines.map(row=>`${row.speaker}: ${row.line}`).join(' · ')} · 계속`);
   if(!reduced()){clearTimeout(timer);timer=setTimeout(close,3200);}
  };
  if(barks)applyBarks();else void ready.then(applyBarks);
 }};
}
export function crossroadsEligible(kind,choices,enabled){return !!enabled&&(kind==='ambition'&&choices?.length===2||kind==='event'&&choices?.length>=2&&choices.length<=3&&choices.some(c=>c.id==='history')&&choices.some(c=>c.id==='twist')&&choices.every(c=>['history','twist','defer'].includes(c.id)));}
export function decorateCrossroads(host,on){
 host.classList.toggle('c273-crossroads',!!on);host.querySelector('[data-c273-or]')?.remove();
 if(on)host.insertAdjacentHTML('beforeend','<span data-c273-or aria-hidden="true">或<span> 혹은 </span></span>');
}
// All inputs are actual initial conditions, not a balance claim.
export function rulerDifficulty({cities,troops,enemies,officers,randomStart=false}){
 const strength=cities+troops/1000+officers/3-enemies;
 const stars=strength>=8?1:strength>=4?2:3;
 return {stars,strength,label:randomStart?'난이도 ★~★★★ · 시작마다 다름':`난이도 ${'★'.repeat(stars)}`};
}
export function difficultyFromView(v,{randomStart=false}={}){
 const cities=Object.values(v.ownCities??{}),armies=Object.values(v.ownArmies??{});
 const ownTiles=new Set(cities.flatMap(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])]));
 const adjacent=new Set();
 for(const city of Object.values(v.knowledge?.cities??{})){
  if(!city.ownerFactionId||city.ownerFactionId===v.factionId||!v.diplomacy?.factions?.some(f=>f.factionId===city.ownerFactionId&&f.state==='WAR'))continue;
  for(const id of [city.tileId,...(city.footprint?.gates??[]),...(city.footprint?.walls??[])]){
   const [q,r]=id.split(',').map(Number);
   if(ownTiles.has(id)||[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]].some(([dq,dr])=>ownTiles.has(`${q+dq},${r+dr}`)))adjacent.add(city.ownerFactionId);
  }
 }
 return rulerDifficulty({cities:cities.length,troops:cities.reduce((n,c)=>n+(c.reserveTroops??0),0)+armies.reduce((n,a)=>n+(a.troopCount??0),0),enemies:adjacent.size,officers:v.faction?.officerIds?.length??0,randomStart});
}
// Called only with a fresh selection preview, never with a running hidden world.
export function difficultyFromStart(s,projection,{randomStart=false}={}){
 const factionId=s.playerFactionId;
 return difficultyFromView({factionId,faction:s.factions[factionId],ownCities:Object.fromEntries(Object.entries(s.cities).filter(([,c])=>c.ownerFactionId===factionId)),ownArmies:Object.fromEntries(Object.entries(s.armies).filter(([,a])=>a.factionId===factionId)),knowledge:{cities:s.cities},diplomacy:projection.diplomacy},{randomStart});
}
