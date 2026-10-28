/* C268 sym bundle BEGIN */
// C268 shared symbols. Index snapshot is verified against sym/index.json by test-style-c268.
const SYM_FAMILIES = {"resources":["food","learning","production","renown","reserve","troops"],"global":["city","diplomacy","faction","help","map","officers","records","settings"],"actions":["attack","build","cancel","confirm","garrison","move","negotiate","next-turn","recruit","tactic","undo","wait"],"status":["done","formation-broken","formation-disordered","formation-ordered","locked","morale-broken","morale-shaken","morale-steady","ready","supply-cut","supply-full","supply-low"],"troops":["bow","cavalry","spear","sword"],"terrain":["coast","ferry","forest","mountain","plain","river","road","wall"],"lenses":["danger","faction","hide","move","supply","terrain"],"diplomacy":["alliance","friendly","hostile","negotiation","neutral","own"],"reports":["asleep","awaken","built","captured","envoy","event","lost","major-event"],"controls":["check","close","collapse","expand","info","next","prev","search","sort","warning"]};
const symEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function symUrl(family,name){
 if(!Object.hasOwn(SYM_FAMILIES,family)||!SYM_FAMILIES[family].includes(name)){console.warn(`[sym] Unknown icon: ${family}/${name}`);return null;}
 return `/assets/ui-kit/own/sym/${family}/${name}.webp`;
}
/** Decorative image next to a visible label, or labelled image for icon-only controls. */
function symImg(family,name,{size='md',label='',paper=false,className=''}={}){
 const url=symUrl(family,name),step=['xs','sm','md','lg','xl'].includes(size)?size:'md';
 if(!url)return `<span class="sg-sym-fallback">${symEscape(label||name)}</span>`;
 const markup = `<img class="sg-sym sg-sym-${step}${paper?' sg-sym-paper':''}${className?' '+symEscape(className):''}" src="${url}" alt="${symEscape(label)}"${label?'':' aria-hidden="true"'}>`;
 return paper ? `<span class="sg-sym sg-sym-${step} sg-sym-mask" style="--sg-symbol:url('${url}')"${label?` role="img" aria-label="${symEscape(label)}"`:' aria-hidden="true"'}></span>` : markup;
}
/* C268 sym bundle END */
// Self-contained presentation module. world.html embeds this source because the
// delegated scope excludes server.mjs. test-world-c254 verifies bundle parity.
const cardEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const RULE_SEEN_KEY='sg.ruleCards.seen.v1';
export function ruleCardDefinitions(c12,fire){
 return Object.fromEntries([
  ['flank','옆을 치면 더 아프다',`적이 보는 쪽의 옆 칸에서 치면 피해 +${Math.round(c12.side*100)}%.`,'마주봄|옆으로|기울어짐'],
  ['rear','등 뒤가 가장 약하다',`뒤 칸에서 치면 피해 +${Math.round(c12.rear*100)}%, 대열이 흩어지기 쉽다.`,'돌아 들어감|등 뒤|흩어짐'],
  ['approach-fire','궁병 곁을 지나가면 화살을 맞는다','궁병 옆 칸에 들어서는 순간 한 번 쏜다(작은 피해, 멈추지는 않음).','다가감|쏨|지나감'],
  ['matchup','창은 말을, 말은 칼을, 칼은 창을','이기는 상대를 치면 피해가 늘고 지는 상대에겐 준다.','도 › 창|창 › 기|기 › 도'],
  ['formation','대열은 세 단계로 무너진다','정돈 → 흐트러짐 → 붕괴. 흐트러진 부대는 더 아프게 맞는다.','정돈|흐트러짐|붕괴'],
  ['supply','보급권 밖에선 군량이 준다','보급권을 벗어나면 휴대 군량이 차례마다 닳는다.','보급권 안|밖으로|지침'],
  ['siege','성은 내구도가 0이 되어야 떨어진다',`성문에서 내구를 0으로 만들면 함락한다. 궁병의 성벽 피해는 ${Math.round(fire.archerWallRatio*100)}%.`,'붙음|깎음|함락'],
  ['fire','불은 바람을 따라 번진다',`마른 숲 · 들에 놓은 불은 바람 방향으로 확률에 따라 번진다. 불은 ${fire.fire.turns}차례 지속된다.`,'바람|불씨|번짐'],
 ].map(([id,title,text,tags])=>[id,{id,title,text,tags:tags.split('|')}]));
}
// Combat is a committed, player-involved record; bv/av are public view(state).
export function ruleCandidates(bv,av,combats=[]){
 const out=[],own=id=>!!(bv.ownArmies?.[id]||av.ownArmies?.[id]);
 for(const c of combats){
  if(!own(c.attackerId)&&!own(c.targetId))continue;
  if(c.kind==='APPROACH_FIRE')out.push('approach-fire');
  if(c.side==='FLANK')out.push('flank');
  if(c.side==='REAR')out.push('rear');
  if(c.multipliers?.matchup!=null&&c.multipliers.matchup!==1)out.push('matchup');
  if((c.formationChanges??[]).some(x=>x.to==='DISORDERED'&&(own(x.armyId)||own(c.attackerId)&&x.armyId===c.targetId)))out.push('formation');
  if(own(c.attackerId)&&['CITY','CITY_STRIKE'].includes(c.kind))out.push('siege');
 }
 for(const [id,a] of Object.entries(av.ownArmies??{})){
  const prev=bv.ownArmies?.[id]?.supply,next=a.supply;
  if(next&&(next.draining&&!prev?.draining||['CUT','STARVING'].includes(next.state)&&next.state!==prev?.state))out.push('supply');
 }
 return [...new Set(out)];
}
const REPORT_ORDER=['city-lost','city-taken','asleep','awaken','envoy','built'];
// C373 r2: presentation of public report rows only. Never consult hidden state.
export function reportPresentation373(row){
 const r=typeof row==='string'?{text:row}:row??{},text=String(r.text??r.detail??'');
 const aliases={'city-taken':'capture','city-lost':'capture',envoy:'diplomacy',awaken:'joined',asleep:'other'};
 const known=['capture','built','diplomacy','joined','news','battle','production','other'];
 const explicit=aliases[r.kind]??r.kind;
 const kind=known.includes(explicit)?explicit:
  /함락|성을 얻|성 획득|잃은 성|성을 잃/.test(text)?'capture':
  /완공|건설|시설 완료/.test(text)?'built':
  /사절|사신|외교|조약|협정|동맹|휴전|협상/.test(text)?'diplomacy':
  /합류|등용|깨어난|깨어났/.test(text)?'joined':
  /전투|교전|공격|반격|병력 −|성 내구 −/.test(text)?'battle':
  /생산|정산|수확|예비병|식량 [＋+−-]/.test(text)?'production':
  /소식|새로 본 적|성 주인/.test(text)?'news':'other';
 const labels={capture:'성 소식',built:'완공',diplomacy:'외교',joined:'합류',news:'소식',battle:'전투',production:'생산',other:'보고'};
 const parts=text.split(/\s+[·—]\s+|:\s+/),subject=parts[0]??'',rest=parts.slice(1).join(' · ');
 // Only an unambiguous completed fact produces a completion badge.
 const evidence=/(?:완공|완료|함락|실패|성공|진행 중)/.test(subject)?subject:text;
 const tentative=/(?:미완공|미완료|아직|예정|예상|예고|대기|가능|확률|경우|조건부|(?:성공|실패)\s*(?:시|하면|한다면))/.test(evidence);
 const completed=!tentative&&/(?:완공|완료|함락|얻었습니다|합류했습니다|등용했습니다|맺었습니다|도착했습니다|발효됐습니다)/.test(evidence)&&!/(?:실패|진행|제안)/.test(evidence);
 const statuses={COMPLETE:'완료',COMPLETED:'완료',DONE:'완료',SUCCESS:'성공',FAILED:'실패',FAILURE:'실패',PROGRESS:'진행',IN_PROGRESS:'진행',완료:'완료',성공:'성공',실패:'실패',진행:'진행'};
 const status=statuses[r.status]??(tentative?'':/실패/.test(evidence)?'실패':/성공(?:\s|$|[·—:])/.test(evidence)?'성공':/진행 중/.test(evidence)?'진행':completed?'완료':'');
 const suffix=status==='완료'?(kind==='capture'?(/함락/.test(rest)?'함락':''):['built','joined'].includes(kind)?labels[kind]:''):'';
 const title=String(r.title??r.name??(rest&&suffix&&!subject.includes(suffix)?`${subject} ${suffix}`:subject));
 return {kind,title,description:String(r.description??(r.name?r.detail??rest:rest)),status,text};
}
export function reportRowHtml373(row,{tag='li',heading='h3'}={}){
 const r=typeof row==='string'?{text:row}:row??{},p=reportPresentation373(r),asset='/assets/ui-kit/own/screens-v4/report/';
 const located=r.tileId||r.armyId||r.cityId;
 const title=located?`<button type="button" class="c373-report-locate" data-summary-city="${cardEsc(r.cityId??'')}" data-summary-tile="${cardEsc(r.tileId??'')}" data-summary-army="${cardEsc(r.armyId??'')}" aria-label="${cardEsc(p.text||p.title)} 보기"><strong>${cardEsc(p.title)}</strong></button>`:`<strong>${cardEsc(p.title)}</strong>`;
 const content=`<img class="c373-report-scene" src="${asset}scene-${p.kind}.webp" alt="" aria-hidden="true"><img class="c373-report-icon" src="${asset}icon-${p.kind}.webp" alt="" aria-hidden="true">${p.status?`<span class="c373-report-status" data-status="${cardEsc(p.status)}"><span>${cardEsc(p.status)}</span></span>`:''}<${heading} class="c373-report-title">${title}</${heading}>${p.description?`<p class="c373-report-description">${cardEsc(p.description)}</p>`:''}`;
 return `<${tag} class="c373-report-row" data-report-kind="${p.kind}"${!p.description?` aria-label="${cardEsc(p.text||p.title)}"`:''}>${content}</${tag}>`;
}
export function reportCardGroups(bv,av,rows=[],limit=2){
 const groups=new Map(),add=(kind,name,detail,index)=>{if(!groups.has(kind))groups.set(kind,{kind,items:[],indices:[]});const g=groups.get(kind);g.items.push({name,detail});if(index!=null)g.indices.push(index);};
 const cityIndices=new Set();
 for(const c of Object.values({...bv.ownCities,...av.ownCities})){
  const kind=!av.ownCities[c.cityId]?'city-lost':!bv.ownCities[c.cityId]?'city-taken':null;if(!kind)continue;
  const i=rows.findIndex(r=>r.cityId===c.cityId);if(i>=0)cityIndices.add(i);
  add(kind,c.name,kind==='city-lost'?'성을 잃었습니다. 우리 세력의 성에서 벗어났습니다.':'성을 얻었습니다. 우리 세력의 성이 되었습니다.',i>=0?i:null);
  const city=av.ownCities[c.cityId],item=groups.get(kind).items.at(-1);item.tileId=city?.tileId??c.tileId;item.effects=city?[Number.isFinite(city.durability)?`내구 ${city.durability}${Number.isFinite(city.durabilityMax)?'/'+city.durabilityMax:''}`:'',Number.isFinite(city.economyForecast?.food)?`다음 정산 식량 +${city.economyForecast.food}`:''].filter(Boolean):[];
 }
 rows.forEach((r,i)=>{if(cityIndices.has(i))return;const t=typeof r==='string'?r:r.text??'';
  const kind=/전사|포로|이탈|중상/.test(t)?'asleep':/합류|등용|깨어/.test(t)?'awaken':/사신|조약|협정|동맹 체결/.test(t)?'envoy':/완공|건설 완료|시설 완료/.test(t)?'built':null;
  if(kind){const parts=t.split(/ · | — |: /);add(kind,parts[0],parts.slice(1).join(' · ')||({asleep:'다음 명령을 내리기 전에 장수의 상태를 살펴보십시오.',awaken:'우리 세력의 장수 명부가 바뀌었습니다.',envoy:'외교 관계가 바뀌었습니다.',built:'도시에서 새 시설을 사용할 수 있습니다.'})[kind],i);}
 });
 return REPORT_ORDER.filter(k=>groups.has(k)).slice(0,limit).map(k=>({...groups.get(k),turn:av.turn}));
}
export function ruleCardMarkup(card){return `<section class="k-card-paper c254-paper" role="dialog" aria-modal="true" aria-labelledby="c254-title"><img src="/assets/ui-v3/rule-cards/rule-${card.id}.webp" alt="${cardEsc(card.title)} · 세 단계 그림"><div class="c254-tags">${card.tags.map(t=>`<span>${cardEsc(t)}</span>`).join('')}</div><h2 id="c254-title">${cardEsc(card.title)}</h2><p>${cardEsc(card.text)}</p><button class="k-btn k-btn-primary" data-card-next>알겠다</button></section>`;}
export function reportCardMarkup(g,last,{replay=false}={}){
 const item=g.items[0];
 const row=reportRowHtml373({text:[item.name,item.detail].filter(Boolean).join(' · '),kind:g.kind},{tag:'div',heading:'h2'}).replace('<h2 class="c373-report-title">', '<h2 id="c254-title">');
 return `<section class="k-card-paper c254-paper c373-report-paper" data-report-replay="${replay}" role="dialog" aria-modal="true" aria-labelledby="c254-title"><img class="c373-report-source" src="/assets/ui-v3/report-cards/report-${g.kind}.webp" alt="" hidden><header class="c373-report-heading">${Number.isFinite(g.turn)?`제${g.turn}차례 보고`:'차례 보고'}</header>${row}<p class="c271-report-kind">${cardEsc({'city-lost':'성 잃음','city-taken':'성 획득',asleep:'쓰러진 이름',awaken:'깨어난 이름',envoy:'외교 소식',built:'완공'}[g.kind])}${g.items.length>1?` · 외 ${g.items.length-1}`:''}</p>${g.items.length>1?`<p class="c271-report-together">함께: ${g.items.slice(1).map(x=>cardEsc(x.name)).join(" · ")}</p>`:''}${item.effects?.length?`<div class="c262-report-effects">${item.effects.map(t=>`<span>${cardEsc(t)}</span>`).join('')}</div>`:''}${g.items.length>=3?`<ul class="c262-report-list">${g.items.map(x=>`<li>${cardEsc(x.name)} · ${cardEsc(x.detail)}</li>`).join('')}</ul>`:''}<footer><button class="k-btn k-btn-primary" data-card-next>${last?(item.tileId?'그 성으로':'지도로'):'다음'}</button><button class="k-btn" data-card-close>닫기</button></footer></section>`;
}
const CARD_CSS=`
#c254-card .c271-report-kind{display:flex;align-items:center;justify-content:center;gap:var(--sg-space-2);color:var(--sg-name-on-paper);font:700 var(--sg-type-ui)/1.5 var(--sg-font-ui);margin-bottom:0}
#c254-card .c271-report-together{color:var(--sg-text-muted-light);font-size:var(--sg-type-ui)}

#c254-card[hidden],#c254-loading[hidden]{display:none!important}
#c254-card{font-family:var(--sg-font-ui);position:fixed;inset:0;z-index:11000;display:flex;align-items:center;justify-content:center;padding:0 20px;background:color-mix(in srgb,var(--sg-scrim-color) calc(var(--sg-alpha-scrim)*100%),transparent)}
#c254-card.report{align-items:center;background:color-mix(in srgb,var(--sg-scrim-color) calc(var(--sg-alpha-scrim)*100%),transparent)}
#c254-card .c254-paper{box-sizing:border-box;width:min(760px,96vw);max-height:94vh;overflow:auto;background:var(--sg-paper);color:var(--sg-ink-raised);border:1px solid var(--sg-gold-line);box-shadow:0 15px 60px #000b;padding:0 0 18px;text-align:center;animation:c254-ink var(--sg-time-panel-in) ease-out}
#c254-card.report .c254-paper{width:min(720px,94vw)}
#c254-card img:not(.sg-sym){display:block;width:100%;height:auto;aspect-ratio:3/1;object-fit:cover}
#c254-card.report img:not(.sg-sym){aspect-ratio:8/5;max-height:59vh;object-fit:contain;background:#171714}
#c254-card h2{font-family:var(--sg-font-title);font-size:var(--sg-type-name);line-height:1.4;margin:14px 22px var(--sg-space-2)}#c254-card p{font-family:var(--sg-font-ui);font-size:var(--sg-type-body);line-height:1.6;margin:var(--sg-space-2) 22px var(--sg-space-4);overflow-wrap:anywhere}
#c254-card strong{font-weight:700;color:var(--k-gold-on-paper,#7a5a1e)}#c254-card footer{display:flex;align-items:center;gap:var(--sg-space-3);justify-content:center}
#c254-card footer [data-card-close]{width:120px;min-width:120px}
#c254-card .c262-report-effects{display:flex;gap:var(--sg-space-2);justify-content:center;font:700 var(--sg-type-ui) Pretendard,sans-serif;color:var(--sg-positive-light)}
#c254-card .c262-report-effects span{min-height:28px;line-height:28px;padding:0 var(--sg-space-2);border:1px solid var(--sg-gold-line)}
#c254-card .c262-report-list{list-style:none;margin:var(--sg-space-2) 22px;padding:0;font:var(--sg-type-ui)/36px Pretendard,sans-serif;text-align:left}
#c254-card .c262-report-list li{border-bottom:1px solid color-mix(in srgb,var(--sg-gold-line) 40.000%,transparent)}
#c262-report-ticker{position:fixed;right:16px;top:124px;display:flex;flex-direction:row;gap:var(--sg-space-2);z-index:90}
#c262-report-ticker button{width:40px;height:40px;position:relative;border-radius:50%;padding:0;border:1px solid var(--sg-gold-line);background:#17201e;color:var(--sg-bone);cursor:pointer}
#c262-report-ticker img{width:100%;height:100%;object-fit:cover;border-radius:50%}
#c262-report-ticker b{position:absolute;right:0;bottom:0;background:#17201e;font:700 var(--sg-type-ui) Pretendard,sans-serif}
body:has(:is(.w-modal,.modal-backdrop,#diplo,#c226-stratagem,#city-stage,#sortie-screen,#result):not([hidden])) #c262-report-ticker{display:none}
.c254-tags{display:grid;grid-template-columns:repeat(3,1fr);font-size:var(--sg-type-ui);padding:var(--sg-space-2);border-bottom:1px solid color-mix(in srgb,var(--sg-gold-line) 40.000%,transparent)}
#c254-card button{box-sizing:border-box;width:200px;min-width:200px;margin:0;height:44px;min-height:44px;font:var(--sg-type-ui) Pretendard,sans-serif;padding:var(--sg-space-2) 28px;cursor:pointer}#c254-card button:focus-visible,#c254-loading:focus-visible{outline:3px solid #b58539;outline-offset:3px}
#c254-loading{position:fixed;inset:0;z-index:12000;background:#171714 center/cover no-repeat;color:#eee4cc;cursor:progress}
#c254-loading h1{position:absolute;right:7%;top:7%;font:56px var(--font-title,serif);text-shadow:0 2px 6px #000}
#c254-loading .c254-loading-bottom{position:absolute;bottom:5%;left:12%;right:12%;padding:22px;background:#14120ed9;text-align:center}
#c254-loading p{font-size:var(--sg-type-body);line-height:1.7;margin:0 auto 18px;max-width:1120px;overflow-wrap:anywhere}
#c254-loading progress{display:block;width:100%;height:3px;accent-color:#c9a45e;margin-bottom:18px}#c254-loading progress::-webkit-progress-bar{background:#5d5544}#c254-loading progress::-webkit-progress-value{background:#c9a45e}
#c254-loading small{font-size:var(--sg-type-ui)}#c254-loading.ready{cursor:pointer}
@keyframes c254-ink{from{opacity:0;filter:blur(5px)}to{opacity:1;filter:blur(0)}}
@media(max-height:800px){#c254-card{padding-bottom:var(--sg-space-3)}#c254-card img:not(.sg-sym){max-height:34vh;object-fit:contain;background:#171714}#c254-card.report img:not(.sg-sym){max-height:48vh}#c254-card h2{margin-top:10px}#c254-loading p{font-size:var(--sg-type-ui);line-height:1.6}#c254-loading .c254-loading-bottom{left:8%;right:8%;bottom:3%;padding:var(--sg-space-4)}}
@media(prefers-reduced-motion:reduce){#c254-card .c254-paper{animation:none}}
`;
export function createInkCards({doc=document,storage=()=>globalThis.localStorage,canShow=()=>true,onClose=()=>{},onLocate=()=>{},definitions,loadingLines}={}){
 let seen=new Set(),prefs={rules:true,reports:true};
 try{const a=JSON.parse(storage().getItem(RULE_SEEN_KEY)??'[]');if(Array.isArray(a))seen=new Set(a.filter(x=>typeof x==='string'));const p=JSON.parse(storage().getItem('sg.inkCards.preferences.v1')??'{}');prefs={rules:p.rules!==false,reports:p.reports!==false};}catch{}
 const style=doc.createElement('style');style.textContent=CARD_CSS;doc.head.append(style);
 if(!doc.querySelector('link[href="/app/kit/kit.css"]')){const l=doc.createElement('link');l.rel='stylesheet';l.href='/app/kit/kit.css';doc.head.append(l);}
 const host=doc.createElement('div');host.id='c254-card';host.hidden=true;doc.body.append(host);
 const loading=doc.createElement('section');loading.id='c254-loading';loading.hidden=true;loading.tabIndex=0;loading.setAttribute('role','dialog');loading.setAttribute('aria-label','판 불러오기');doc.body.append(loading);
 const ticker=doc.createElement('nav');ticker.id='c262-report-ticker';ticker.setAttribute('aria-label','이번 차례 보고 다시 보기');doc.body.append(ticker);
 let history=[],historyTurn=null;
 function renderTicker(){ticker.innerHTML=history.map((g,i)=>`<button class="k-medallion" data-report-reopen="${i}" aria-label="${cardEsc(g.items[0].name)} 보고 다시 보기"><img src="/assets/ui-v3/report-cards/report-${g.kind}.webp" alt=""><b>${g.items.length}</b></button>`).join('');}
 ticker.onclick=e=>{const b=e.target.closest('[data-report-reopen]'),g=history[Number(b?.dataset.reportReopen)];if(!b||!g||busy()||!canShow())return;focus=doc.activeElement;active={report:g,replay:true};host.className='w-modal report';host.innerHTML=reportCardMarkup(g,true,{replay:true});host.hidden=false;host.querySelector('button').focus();};
 let queue=[],reports=[],active=null,focus=null,timer=null,loadGeneration=0,loadReady=false;
 const persist=(key,value)=>{try{storage().setItem(key,JSON.stringify(value));}catch{}};
 const busy=()=>!host.hidden||!loading.hidden;
 function tick(){
  clearTimeout(timer);settings();if(busy())return;
  if(!queue.length&&!reports.length)return;
  if(!canShow()){timer=setTimeout(tick,150);return;}
  if(reports.length&&prefs.reports){active={report:reports.shift()};host.className='w-modal report';host.innerHTML=reportCardMarkup(active.report,!reports.length);}
  else if(queue.length&&prefs.rules){const id=queue.shift();if(seen.has(id)){tick();return;}active={rule:id};seen.add(id);persist(RULE_SEEN_KEY,[...seen]);host.className='w-modal rule';host.innerHTML=ruleCardMarkup(definitions[id]);}
  else{queue=[];reports=[];return;}
  focus=doc.activeElement;host.hidden=false;host.querySelector('button').focus();
 }
 function close(all=false,locate=false){const closed=active;if(locate&&closed?.report?.items[0]?.tileId)onLocate(closed.report.items[0].tileId);host.hidden=true;active=null;if(all)reports=[];focus?.focus?.();onClose(closed);tick();}
 host.onclick=e=>{if(e.target.closest('[data-card-close]'))close(true);else if(e.target.closest('.c254-paper'))close(false,!!active?.report&&(active.replay||!reports.length));};
 const dismissLoading=()=>{if(!loadReady||loading.hidden)return;loading.hidden=true;onClose();tick();};loading.onclick=dismissLoading;
 doc.addEventListener('keydown',e=>{if(!busy())return; // Capture before world shortcuts, including Enter = end turn.
  e.stopImmediatePropagation();if(['Enter','Escape',' '].includes(e.key)){e.preventDefault();if(!loading.hidden)dismissLoading();else close(e.key==='Escape',e.key!=='Escape'&&!!active?.report&&(active.replay||!reports.length));}
  else if(e.key==='Tab'){e.preventDefault();const buttons=[...host.querySelectorAll('button')];if(!host.hidden){const i=buttons.indexOf(doc.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}}
 },true);
 function settings(){try{const p=JSON.parse(storage().getItem('sg.inkCards.preferences.v1')??'{}');prefs={rules:p.rules!==false,reports:p.reports!==false};if(!prefs.rules)queue=[];if(!prefs.reports)reports=[];}catch{}}
 doc.addEventListener('ink:card-settings',settings);

 return {
  busy,tick,pendingReports:()=>prefs.reports&&(reports.length>0||!!active?.report),reset(){queue=[];reports=[];history=[];historyTurn=null;renderTicker();host.hidden=true;active=null;loadGeneration++;loading.hidden=true;},
  offer(ids){if(!prefs.rules)return;const id=ids.find(id=>definitions[id]&&!seen.has(id)&&!queue.includes(id));if(id)queue.push(id);},
  reports(bv,av,rows,originalRows=rows){if(historyTurn!==av.turn){history=[];historyTurn=av.turn;renderTicker();}if(!prefs.reports)return originalRows;const all=reportCardGroups(bv,av,rows,6);history=[...history,...all].slice(-6);renderTicker();const g=all.slice(0,2);reports.push(...g);const used=new Set(g.flatMap(x=>x.indices));return rows.filter((_,i)=>!used.has(i));},
  async load(factionId,name){
   const key={F01:'cao',F02:'liu',F03:'sun'}[factionId];if(!key)return;
   const gen=++loadGeneration,start=Date.now();loadReady=false;loading.classList.remove('ready');loading.style.backgroundImage=`url('/assets/ui-v3/loading/loading-${key}.webp')`;
   loading.innerHTML=`<h1>${cardEsc(name)}</h1><div class="c254-loading-bottom"><p>${cardEsc(loadingLines[key])}</p><progress max="100" value="0" aria-label="불러오기 진행"></progress><small role="status">그림과 지도를 불러오는 중</small></div>`;loading.hidden=false;loading.focus();
   const art=doc.createElement('img');art.src=`/assets/ui-v3/loading/loading-${key}.webp`;
   const assets=[art,...doc.querySelectorAll('#map img,#ink-hud img')];let done=0;
   await Promise.allSettled(assets.map(async img=>{try{await img.decode();}finally{if(gen===loadGeneration)loading.querySelector('progress').value=++done/assets.length*90;}}));
   await Promise.race([doc.fonts?.ready??Promise.resolve(),new Promise(resolve=>setTimeout(resolve,5000))]);
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,1200-(Date.now()-start))));if(gen!==loadGeneration)return;
   loading.querySelector('progress').value=100;loading.querySelector('small').textContent='누르면 시작';loadReady=true;loading.classList.add('ready');
  },
 };
}
