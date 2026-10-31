import {audioBuses} from './sfx.mjs';
const escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The existing server serves this entry point. guide-ui.mjs re-exports this
// presentation API so adding the guide does not require changing its allowlist.
export const GUIDE_STORAGE_KEY='sangoku.guide.v1';
let guideData=null,guideLoad=null,guideSelection=null;
let guideCombatSeen=new WeakSet();
const missingGuideImages=new Set();
export function readGuidePreferences(storage=globalThis.localStorage){
 let value={};try{value=JSON.parse(storage?.getItem(GUIDE_STORAGE_KEY)??'{}')??{};}catch{}
 return {guideId:['G17','G08','G51'].includes(value.guideId)?value.guideId:null,speech:['on','less','off'].includes(value.speech)?value.speech:'on',seen:value.seen&&typeof value.seen==='object'?value.seen:{},dismissed:value.dismissed&&typeof value.dismissed==='object'?value.dismissed:{},run:{wins:Math.max(0,Math.floor(Number(value.run?.wins)||0)),won:value.run?.won===true}};
}
export function saveGuidePreferences(patch,storage=globalThis.localStorage){
 const next={...readGuidePreferences(storage),...patch};try{storage?.setItem(GUIDE_STORAGE_KEY,JSON.stringify(next));}catch{}return next;
}
export function guideAllows(key,prefs=readGuidePreferences()){
 return prefs.speech!=='off'&&!(prefs.speech==='less'&&key.startsWith('first.'))&&!prefs.dismissed[key];
}
export function claimGuideFirst(key,storage=globalThis.localStorage){
 const p=readGuidePreferences(storage);if(!p.guideId||!guideAllows(key,p)||p.seen[key])return false;
 saveGuidePreferences({seen:{...p.seen,[key]:true}},storage);return true;
}
export function setGuideData(data){guideData=data;}
export function loadGuideData(){
 return guideLoad??=fetch('/data/guide-v0.1.json').then(r=>{if(!r.ok)throw Error('안내자 데이터를 읽을 수 없습니다.');return r.json();}).then(data=>{setGuideData(data);return data;}).catch(error=>{guideLoad=null;throw error;});
}
export function guideCallName(run=readGuidePreferences().run){return run.won||run.wins>=15?'우리 무리':run.wins>=5?'너':'신참';}
export function formatGuideAddress(text,callName=guideCallName()){
 const final=(callName.charCodeAt(callName.length-1)-0xac00)%28;
 const consonant=final>0;
 return text.replace(/\{호칭\}(이\/가|은\/는|을\/를|아\/야|이|가|은|는|을|를|아|야)?/g,(_,particle)=>{
  const pair=particle&&[['이','가'],['은','는'],['을','를'],['아','야']].find(p=>p.includes(particle)||p.join('/')===particle);
  return callName+(pair?pair[consonant?0:1]:'');
 });
}
export function recordGuideCombat(c,units,storage=globalThis.localStorage){
 if(c.uiNotice||c.uiSelfTactic||guideCombatSeen.has(c))return;
 guideCombatSeen.add(c);
 const gone=new Set(c.eliminatedIds??[]);
 const enemyLost=units.some(u=>u.enemy&&gone.has(u.id));
 const allySurvived=units.some(u=>!u.enemy&&!gone.has(u.id));
 if(enemyLost&&allySurvived){const p=readGuidePreferences(storage);saveGuidePreferences({run:{...p.run,wins:p.run.wins+1}},storage);}
}
export function guideLine(key,id=readGuidePreferences().guideId??'G17'){
 const line=guideData?.lines?.[id]?.[key];
 return line?{...line,text:formatGuideAddress(line.text),...(line.cityText?{cityText:formatGuideAddress(line.cityText)}:{})}:undefined;
}
export function guidePortraitHtml(key,id=readGuidePreferences().guideId??'G17',expressionOverride){
 const g=guideData?.guides?.[id],line=guideLine(key,id);if(!g)return '';
 const expression=g.expressions[expressionOverride??line?.expr]??g.portrait,fallback=missingGuideImages.has(expression);
 return `<figure class="c426-portrait"><img src="${escapeHtml(fallback?g.portrait:expression)}" class="${fallback?'c426-fallback':''}" data-guide-fallback="${escapeHtml(g.portrait)}" alt=""><figcaption>${escapeHtml(g.name)}</figcaption></figure>`;
}
function bindGuideImages(host){for(const img of host.querySelectorAll?.('[data-guide-fallback]')??[])img.addEventListener('error',()=>{if(img.dataset.guideFallback){missingGuideImages.add(img.getAttribute('src'));img.classList.add('c426-fallback');img.src=img.dataset.guideFallback;delete img.dataset.guideFallback;}});}
export async function chooseGuide({document:doc=globalThis.document,force=false}={}){
 if(!force&&readGuidePreferences().guideId)return true;
 if(guideSelection)return guideSelection;
 guideSelection=(async()=>{
  const data=await loadGuideData();
  return new Promise(resolve=>{
   const host=doc.createElement('section');host.className='c426-selection';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','안내자 고르기');
   const ids=['G08','G17','G51'].filter(id=>data.guides[id]);
   // Derived alpha copies only; the data still owns the original portrait URL.
   const portrait=id=>data.guides[id].portrait.replace(/\/full\.webp$/, '/full-cut.webp');
   let selected=readGuidePreferences().guideId??'G17',voice=null,closed=false;
   const previous=doc.activeElement,voiceAvailable=new Map();
   host.innerHTML=`<header><small>새 판 · 안내자 고르기</small><h1>이 판을 곁에서 이끌 안내자</h1></header><figure class="c432-art"><img alt=""></figure><div class="c426-greeting" aria-live="polite"><h2></h2><p></p><button type="button" data-guide-voice disabled title="목소리 준비 중">▷ 목소리 듣기</button></div><div class="c426-guides" role="group" aria-label="안내자 후보">${ids.map(id=>{const g=data.guides[id];return `<button type="button" data-guide-pick="${id}" aria-pressed="false"><span class="c432-mini"><img src="${escapeHtml(portrait(id))}" alt="${escapeHtml(g.name)} 전신"><span class="c432-selected">✓ 선택됨</span></span><b>${escapeHtml(g.name)}</b></button>`;}).join('')}</div><footer>${force?'<button type="button" data-guide-cancel>돌아가기</button>':''}<button type="button" data-guide-confirm class="k-btn-primary">이 안내자와 함께</button></footer>`;
   const voiceButton=host.querySelector('[data-guide-voice]');
   const duckToken={},unsub=audioBuses.subscribe(()=>{if(voice)voice.volume=Math.min(1,audioBuses.level('voice')*4);});
   const stopVoice=()=>{if(voice){voice.pause();voice.currentTime=0;voice=null;}audioBuses.duck(duckToken,false);};
   const updateVoice=()=>{voiceButton.disabled=!voiceAvailable.get(selected);voiceButton.title=voiceButton.disabled?'목소리 준비 중':'자기소개 듣기';};
   const pick=id=>{stopVoice();selected=id;for(const b of host.querySelectorAll('[data-guide-pick]'))b.setAttribute('aria-pressed',String(b.dataset.guidePick===id));const g=data.guides[id],img=host.querySelector('.c432-art img');img.src=portrait(id);img.alt=`${g.name} 전신`;host.querySelector('.c426-greeting h2').textContent=g.name;host.querySelector('.c426-greeting p').textContent=guideLine('select.intro',id).text.replace(/\. /g,'.\n');updateVoice();};
   const finish=accepted=>{if(closed)return;closed=true;stopVoice();unsub();if(accepted)saveGuidePreferences({guideId:selected});host.remove();previous?.focus?.();if(accepted)showGuideReaction('select.pick');resolve(accepted);};
   host.addEventListener('click',e=>{const b=e.target.closest('[data-guide-pick]');if(b)pick(b.dataset.guidePick);});
   voiceButton.onclick=()=>{stopVoice();const id=selected,playing=new Audio(`/assets/audio/guide/${id}/select.intro.mp3`);voice=playing;playing.volume=Math.min(1,audioBuses.level('voice')*4);audioBuses.duck(duckToken,true);playing.addEventListener('ended',()=>{if(voice===playing)stopVoice();});playing.play().catch(()=>{if(!closed&&voice===playing){stopVoice();voiceAvailable.set(id,false);updateVoice();}});};
   host.querySelector('[data-guide-confirm]').onclick=()=>finish(true);host.querySelector('[data-guide-cancel]')?.addEventListener('click',()=>finish(false));
   host.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(force)finish(false);}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();const id=ids[(ids.indexOf(selected)+(e.key==='ArrowRight'?1:ids.length-1))%ids.length];pick(id);host.querySelector(`[data-guide-pick="${id}"]`).focus();}
    if(e.key==='Enter'&&e.target.closest('[data-guide-pick]')){e.preventDefault();e.stopPropagation();pick(e.target.closest('[data-guide-pick]').dataset.guidePick);host.querySelector('[data-guide-confirm]').focus();}
    if(e.key==='Tab'){const buttons=[...host.querySelectorAll('button')].filter(b=>!b.disabled),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first.focus();}}
   });
   doc.body.append(host);pick(selected);host.querySelector(`[data-guide-pick="${selected}"]`).focus();
   for(const id of ids)fetch(`/assets/audio/guide/${id}/select.intro.mp3`).then(r=>{voiceAvailable.set(id,r.ok&&!!r.headers.get('content-type')?.startsWith('audio/'));if(!closed&&selected===id)updateVoice();}).catch(()=>{});
  });
 })();try{return await guideSelection;}finally{guideSelection=null;}
}
export function mountGuideSettings(page){
 if(!page)return;const target=page.closest('.c261-settings')?.querySelector('[data-c261-page="2"]')??page;if(target.querySelector('.c426-settings'))return;
 const row=globalThis.document.createElement('section');row.className='c426-settings';const p=readGuidePreferences();
 row.innerHTML=`<h2>안내자</h2><button type="button" data-guide-change>안내자 바꾸기</button><label>안내자 말 <select data-guide-speech>${[['on','켬'],['less','적게'],['off','끔']].map(([v,t])=>`<option value="${v}" ${p.speech===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
 row.querySelector('[data-guide-change]').onclick=()=>chooseGuide({force:true}).catch(()=>{row.querySelector('h2').textContent='안내자 데이터를 읽지 못했습니다. 다시 시도하세요.';});
 row.querySelector('select').onchange=e=>{saveGuidePreferences({speech:e.target.value});globalThis.document.querySelector('#c426-notice')?.remove();guideNoticeBusy=false;guideQueue.length=0;globalThis.document.querySelector('#c426-reaction')?.remove();const coach=globalThis.document.querySelector('.c225-coach');if(coach)coach.hidden=e.target.value==='off';};target.append(row);
}
const guideQueue=[];let guideNoticeBusy=false;
// C436: only current public observations may warn about the ruler's city.
export function guideCapitalThreat(v){
 const loc=v.officers?.[v.faction?.rulerId]?.locationRef;
 const capital=(loc?.kind==='CITY'&&v.ownCities?.[loc.refId??loc.id])||v.ownCities?.[v.faction?.capitalCityId];
 if(!capital)return false;
 const anchors=[capital.tileId,...(capital.footprint?.gates??[])];
 const near=(a,b)=>{const x=v.tiles?.[a],y=v.tiles?.[b];return x&&y&&Math.max(Math.abs(x.q-y.q),Math.abs(x.r-y.r),Math.abs(x.q+x.r-y.q-y.r))<=1;};
 return Object.values(v.knowledge?.observedArmies??{}).some(a=>{
  const relation=v.diplomacy?.factions?.find(f=>f.factionId===a.factionId);
  return a.factionId!==v.factionId&&(!relation||relation.state==='WAR')&&
   v.knowledge.tiles[a.tileId]==='VISIBLE'&&a.troopCount>0&&a.hp!==0&&
   anchors.some(id=>near(a.tileId,id));
 });
}
export function resetGuideRun(){
 const p=readGuidePreferences(),seen={...p.seen};
 for(const key of ['greet.first','event.firstWin','event.firstCapture','event.capitalThreat'])delete seen[key];
 const draftPending=guideQueue.includes('first.draft');
 saveGuidePreferences({seen,run:{wins:0,won:false}});guideCombatSeen=new WeakSet();guideQueue.length=0;if(draftPending)guideQueue.push('first.draft');guideNoticeBusy=false;
 globalThis.document?.querySelector('#c426-notice')?.remove();
 globalThis.document?.querySelector('#c426-reaction')?.remove();
}
export function showGuideFirst(key){
 if(!guideLine(key)||!guideAllows(key)||readGuidePreferences().seen[key]||guideQueue.includes(key))return;
 guideQueue.push(key);pumpGuideNotice();
}
function pumpGuideNotice(){
 if(guideNoticeBusy||!guideQueue.length||!globalThis.document)return;
 const doc=globalThis.document;
 if(doc.querySelector('.c426-selection,.c225-active,.w-modal:not([hidden]),.modal-backdrop:not([hidden]),.c261-settings:not([hidden]),#officer-draft:not([hidden]),#c205-choice:not([hidden]),#c211-blessing:not([hidden]),#result:not([hidden])')){setTimeout(pumpGuideNotice,500);return;}
 const key=guideQueue.shift();if(!claimGuideFirst(key)){pumpGuideNotice();return;}
 guideNoticeBusy=true;const host=doc.createElement('section');host.id='c426-notice';host.className='c426-notice';host.setAttribute('role','status');
 host.innerHTML=`${guidePortraitHtml(key)}<div><b>${key==='greet.first'?'함께 깨어난 길잡이':'처음 보는 것'}</b><p>${escapeHtml(guideLine(key).text)}</p><button type="button" data-guide-close>닫기</button><label><input type="checkbox" data-guide-never>다시 보지 않기</label></div>`;
 const close=()=>{if(host.querySelector('input').checked){const p=readGuidePreferences();saveGuidePreferences({dismissed:{...p.dismissed,[key]:true}});}host.remove();guideNoticeBusy=false;pumpGuideNotice();};
 host.querySelector('button').onclick=close;doc.body.append(host);bindGuideImages(host);if(key==='greet.first')setTimeout(()=>{if(host.isConnected)close();},5000);
}
export function showGuideReaction(key,{once=false}={}){
 if(!guideLine(key)||!readGuidePreferences().guideId||!guideAllows(key)||(key!=='select.pick'&&globalThis.document?.body?.classList.contains('c225-active')))return;
 if(once&&!claimGuideFirst(key))return;
 const doc=globalThis.document;doc.querySelector('#c426-reaction')?.remove();const host=doc.createElement('aside');host.id='c426-reaction';host.setAttribute('role','status');host.innerHTML=`${guidePortraitHtml(key)}<span>${escapeHtml(guideLine(key).text)}</span>`;doc.body.append(host);bindGuideImages(host);
 globalThis.requestAnimationFrame?.(()=>{
  if(!host.isConnected)return;const anchor=doc.querySelector('#c292-result-dock')??doc.querySelector('#c260-result');if(!anchor)return;
  const r=anchor.getBoundingClientRect(),box=host.getBoundingClientRect(),width=doc.documentElement.clientWidth,height=doc.documentElement.clientHeight;
  const beside=r.right+box.width+16<=width;
  host.style.left=Math.max(8,Math.min(width-box.width-8,beside?r.right+8:r.left+(r.width-box.width)/2))+'px';
  host.style.top=Math.max(8,Math.min(height-box.height-8,beside?r.top:r.bottom+8))+'px';host.style.transform='none';
 });setTimeout(()=>host.remove(),2500);
}
export function guideEndingHtml(won){if(won){const p=readGuidePreferences();if(!p.run.won)saveGuidePreferences({run:{...p.run,won:true}});}const key=won?'event.runWin':'event.runLoss';return guideAllows(key)&&readGuidePreferences().guideId&&guideLine(key)?`<p class="c426-ending">${escapeHtml(guideData.guides[readGuidePreferences().guideId].name)} — ${escapeHtml(guideLine(key).text)}</p>`:'';}
export function prologueGuide(s){
 const p=s.prologue,army=id=>`[data-unit="${id}"]`,tile=id=>`[data-tile="${id}"]`;
 const cao=s.officers.G07.locationRef;
 const rows={
 SORTIE:['1차례 · 출진','허창을 눌러 병영 → 출진. 하후돈 · 도검병 · 병력 5,000명을 고르세요. 조조도 도검병 4,000명으로 출진시킵니다.','[data-city="west"]'],
 MOVE:['1차례 · 이동',`하후돈 부대를 고르면 이동 칸과 붉은 통제 구역이 보입니다. 표시된 칸(${p.moveTileId})으로 이동하세요.`,tile(p.moveTileId)],
 END_FIRST:['1차례 · 함께 출진',cao.kind==='ARMY'?'조조를 (-9,26) 칸으로 옮긴 뒤 차례를 끝내세요. 두 부대가 다른 방향에서 적을 마주합니다.':'허창 병영에서 조조도 도검병 4,000명으로 출진시켜 (-9,26)으로 이동하세요.',cao.kind==='ARMY'?'#end-turn':'[data-city="west"]'],
 COMBAT:['2차례 · 교전 예고와 측면','조조 부대를 선택하고 적 수비대를 가리키세요. 피해·반격과 측면 +15%를 확인한 뒤 공격하세요.',army(p.defenderId)],
 END_SECOND:['2차례 · 공격 완료','측면에서 실제로 공격했습니다. 차례를 끝내면 작은 성을 공격합니다.','#end-turn'],
 CITY:['3차례 · 성 공격','하후돈을 선택해 기억의 작은 성을 공격하세요. 수비·내구를 확인합니다. 내구 0 + 성 공격이면 함락입니다.', '[data-city="julu"]'],
 DONE:['서장 끝','출진과 병력 선택 · 이동과 통제 구역 · 교전 예고와 측면 · 성 공격과 함락',null]
 };
 const [heading,text,target]=rows[p.stage];return {heading,text,target,done:p.stage==='DONE'};
}
export function prologueHtml(s){
 const g=prologueGuide(s);
 const spoken=guideLine('tutorial.'+s.prologue.stage);
 if(spoken)g.text=s.prologue.stage==='END_FIRST'&&s.officers.G07.locationRef.kind!=='ARMY'?(spoken.cityText??spoken.text):spoken.text.replace('{moveTileId}',s.prologue.moveTileId);
 if(g.done)return `<section class="c227-prologue-end" role="dialog" aria-modal="true" aria-labelledby="c227-prologue-title"><img class="c227-cao" src="/assets/officer-art/cutout/G07.png" alt="조조"><div><h2 id="c227-prologue-title">서장 끝</h2><h3>배운 것</h3><ul><li>출진: 장수·병종·병력 선택</li><li>이동: 이동 칸과 통제 구역</li><li>교전: 피해·반격 예고와 측면 +15%</li><li>함락: 내구 0 + 성 공격</li></ul>${spoken&&guideAllows('tutorial.DONE')?`<p>${escapeHtml(g.text)}</p>`:''}<p>조조 — 이 칼의 무게가 낯설지 않군.</p><button type="button" data-prologue-main>본 판 시작</button><button type="button" data-prologue-retry>다시 하기</button></div></section>`;
 const name=guideData?.guides?.[readGuidePreferences().guideId??'G17']?.name??'안내';
 return `<section class="c225-coach" role="region" aria-label="서장 안내" title="끌어서 옮기기 · 두 번 누르면 제자리">${guidePortraitHtml('tutorial.'+s.prologue.stage)}<header><b>${g.heading}</b><button type="button" class="c225-hide" data-prologue-hide title="안내 창을 접습니다. 작은 단추로 다시 펼칩니다">접기 ▴</button></header><p>${escapeHtml(g.text)}</p><small>실제 행동을 하면 다음 안내로 이어집니다.</small><footer class="c225-actions"><button type="button" data-prologue-retry title="서장을 1차례부터 다시 시작합니다">↺ 서장 처음부터</button><button type="button" data-prologue-skip title="서장을 끝내고 본 판을 새로 시작합니다">본 판으로 건너뛰기 ▸</button></footer></section><button type="button" class="c225-reopen" data-prologue-show hidden title="끌어서 옮기기">${escapeHtml(name)} · ${g.heading} — 안내 펼치기 ▾</button>`;
}
// The player may hide the coach for the current step or drag it anywhere.
// A new step reopens it; the dragged position lasts for this browser tab.
const COACH_POS_KEY='sangoku.prologue.coachPos';
const coachUi={collapsedStage:null,pos:undefined};
function coachPos(){if(coachUi.pos===undefined){coachUi.pos=null;try{const p=JSON.parse(globalThis.sessionStorage?.getItem(COACH_POS_KEY)??'null');if(Number.isFinite(p?.left)&&Number.isFinite(p?.top))coachUi.pos=p;}catch{}}return coachUi.pos;}
function saveCoachPos(p){coachUi.pos=p;try{p?globalThis.sessionStorage?.setItem(COACH_POS_KEY,JSON.stringify(p)):globalThis.sessionStorage?.removeItem(COACH_POS_KEY);}catch{}}
function clampCoach(doc,box,{left,top}){const w=doc.documentElement.clientWidth,h=doc.documentElement.clientHeight||globalThis.innerHeight||900;return {left:Math.round(Math.max(8,Math.min(w-Math.min(box.width,w-16)-8,left))),top:Math.round(Math.max(8,Math.min(h-Math.min(box.height,h-16)-8,top)))};}
function bindCoachDrag(root,doc,refresh){
 if(root.c225Drag||!root.addEventListener)return;root.c225Drag=true;
 root.addEventListener('pointerdown',e=>{
  const handle=e.target?.closest?.('.c225-coach,.c225-reopen');
  if(e.button!==0||!handle||(e.target.closest('button')&&!e.target.closest('.c225-reopen')))return;
  const start=root.getBoundingClientRect(),x0=e.clientX,y0=e.clientY;let moved=false;
  const move=ev=>{if(!moved&&Math.hypot(ev.clientX-x0,ev.clientY-y0)<4)return;moved=true;root.classList.add('c225-dragging');const at=clampCoach(doc,root.getBoundingClientRect(),{left:start.left+ev.clientX-x0,top:start.top+ev.clientY-y0});root.style.left=at.left+'px';root.style.top=at.top+'px';root.style.right='auto';root.style.bottom='auto';};
  const up=()=>{doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);root.classList.remove('c225-dragging');if(moved){const r=root.getBoundingClientRect();saveCoachPos({left:r.left,top:r.top});root.c225Moved=true;}};
  doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',up);
 });
 // A drag that ends on the reopen chip must not also count as a click.
 root.addEventListener('click',e=>{if(root.c225Moved&&e.target?.closest?.('.c225-reopen')){e.stopImmediatePropagation();e.preventDefault();}root.c225Moved=false;},true);
 root.addEventListener('dblclick',e=>{if(e.target?.closest?.('.c225-coach')&&!e.target.closest('button')){saveCoachPos(null);refresh();}});
}
// C225b: the left rail includes danger/undo controls and may grow after movement.
export function prologuePlacement({width,coachWidth,headerBottom=0,railRight=0}){
 return {left:Math.min(Math.max(100,railRight+16),Math.max(16,width-coachWidth-16)),top:Math.max(76,headerBottom+12)};
}
export function renderPrologue(s,{document:doc=globalThis.document,navigate=url=>globalThis.location.assign(url),complete=()=>{}}={}){
 if(!s?.prologue)return;
 let root=doc.querySelector('#c225-prologue');if(!root){root=doc.createElement('aside');root.id='c225-prologue';doc.body.appendChild(root);}
 const markup=prologueHtml(s);
 if(root.c426Markup!==markup){root.innerHTML=markup;root.c426Markup=markup;bindGuideImages(root);
 root.querySelector('[data-prologue-skip]')?.addEventListener('click',()=>navigate('/world?entry=new'));
 root.querySelector('[data-prologue-main]')?.addEventListener('click',()=>navigate('/world?entry=new'));
 root.querySelector('[data-prologue-retry]')?.addEventListener('click',()=>navigate('/world?entry=prologue'));
 root.querySelector('[data-prologue-hide]')?.addEventListener('click',()=>{coachUi.collapsedStage=s.prologue.stage;renderPrologue(s,{document:doc,navigate,complete});});
 root.querySelector('[data-prologue-show]')?.addEventListener('click',()=>{coachUi.collapsedStage=null;renderPrologue(s,{document:doc,navigate,complete});});
 }
 bindCoachDrag(root,doc,()=>renderPrologue(s,{document:doc,navigate,complete}));
 if(coachUi.collapsedStage&&coachUi.collapsedStage!==s.prologue.stage)coachUi.collapsedStage=null;
 const off=readGuidePreferences().speech==='off',collapsed=coachUi.collapsedStage===s.prologue.stage;
 const coach=root.querySelector('.c225-coach');if(coach)coach.hidden=off||collapsed;
 const reopen=root.querySelector('.c225-reopen');if(reopen)reopen.hidden=off||!collapsed;
 if(root.dataset)root.dataset.collapsed=String(collapsed);
 const save=doc.querySelector('[data-fwd="#save"]');if(save){save.disabled=true;save.title='서장에서는 저장하지 않습니다';}
 root.dataset.done=String(s.prologue.stage==='DONE');
 if(s.prologue.stage==='DONE'){complete();root.style.left='0';root.style.top='0';root.style.right='0';root.style.bottom='0';return;}
 const guide=prologueGuide(s);
 // Prefer the open sortie controls over the city beneath the scene.
 const preferred=guide.target?.includes('data-city')?guide.target.replace('[data-city','#map .w-cityplate[data-city'):guide.target;
 const selectors=['#sortie-screen [data-sortie]','#city-quick:not([hidden]) [data-city-quick-action="sortie"]','[data-sortie-open]',preferred??'#c225-prologue'];
 const target=selectors.flatMap(selector=>[...doc.querySelectorAll(selector)]).find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;});
 for(const n of doc.querySelectorAll('.c225-pointed'))n.classList.remove('c225-pointed');
 target?.classList.add('c225-pointed');
 root.querySelector('.c225-arrow')?.remove?.();
 if(target){const r=target.getBoundingClientRect(),arrow=doc.createElement('img');arrow.className='c225-arrow';arrow.src='/assets/ui-v3/hud/kit-brush-arrow.png';arrow.alt='';arrow.style.left=Math.max(2,r.left-42)+'px';arrow.style.top=Math.max(50,r.top+r.height/2-14)+'px';root.appendChild(arrow);}
 root.dataset.target=guide.target??'';
 // Keep the coach in free map space, clear of the top HUD, right report and bottom commands.
 const railRight=Math.max(0,...[...doc.querySelectorAll('.nb-bookmarks,#c186-danger,#c186-undo,#c186-undo-reason')].map(n=>n.getBoundingClientRect().right));
 const at=prologuePlacement({width:doc.documentElement.clientWidth,coachWidth:root.getBoundingClientRect().width,headerBottom:doc.querySelector('.nb-state-title')?.getBoundingClientRect().bottom??0,railRight});
 // The portrait makes this box wider. Clear the resource strip and objectives
 // when they occupy the same horizontal space at the narrow breakpoint.
 const box=root.getBoundingClientRect();
 for(const node of doc.querySelectorAll('.ih-res,.nb-top-left,.c236-objectives')){
  const r=node.getBoundingClientRect();
  if(r.width>0&&r.right>at.left&&r.left<at.left+box.width&&r.bottom>at.top&&r.top<at.top+box.height)at.top=r.bottom+12;
 }
 // At 1180px the right-hand box covers the city after camera centering.
 // Use the gap below the collapsed roster and left of the objectives instead.
 if(doc.documentElement.clientWidth<=1250){
  const objectives=doc.querySelector('.c236-objectives')?.getBoundingClientRect();
  if(!objectives?.width||16+box.width+12<objectives.left){
   at.left=16;at.top=Math.max(100,...[...doc.querySelectorAll('.ih-res,.nb-top-left,.c236-command-list')].map(n=>n.getBoundingClientRect().bottom+12));
  }
 }
 if(coachPos())Object.assign(at,clampCoach(doc,box,coachPos()));
 root.style.left=at.left+'px';root.style.right='auto';root.style.top=at.top+'px';
 root.style.bottom='auto';
}
