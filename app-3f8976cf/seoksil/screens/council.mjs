// SC07 평정 — 목표 그림 T-sc07-council v2 구도(2026-10-09): 위 = 한 장으로 그린 장면, 아래 = 흑칠 탁자 위에 놓인 물건들.
// 탁자 위: 청동 거울(고른 안건 — 가운데 꼭지 = 안건 종류, 둘레 초상 고리 셋 = 제안한 신하) · 메달 둘(보조 명령) ·
// 목독 셋(안건 행 / 군사 후보 행) · 죽간(군사 보고·안건 내용) · 옥인(결의). 화면 표면은 모두 챗방 에셋 그림(assets/seoksil/a4),
// 코드는 배치·글자·상태만 한다. 엔진은 /src/campaign-council.mjs(C90) 그대로 — 이 모듈은 그리기와 명령만.
import {COUNCIL,councilCandidates} from '/src/campaign-council.mjs';
import {campaignDate} from '/src/campaign-map-model.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';

const KIND=COUNCIL.proposals.kinds;
const GLYPH={ATTACK_CITY:'攻',DEFEND_CITY:'守',BUILD_HUB:'補',MUSTER:'出',CITY_DEVELOP:'政',DIPLOMACY:'外',EXPLORE:'探',RECRUIT:'登'};
const A4='/assets/seoksil/a4/';
// 그림 아이콘(/assets/seoksil/icons — 목록에 있는 것만, 나머지는 한자 새김)
const ICONS=new Set(await fetch('/assets/seoksil/icons/index.json').then(r=>r.ok?r.json():[]).catch(()=>[]));
const pic=(id,glyph)=>ICONS.has(id)?`<img class="ss-pic" src="/assets/seoksil/icons/${id}.webp" alt="" aria-hidden="true">`:`<em>${glyph}</em>`;
const KIND_ICON={ATTACK_CITY:'k-attack',DEFEND_CITY:'k-defend',BUILD_HUB:'k-hub',MUSTER:'k-muster',CITY_DEVELOP:'k-develop',DIPLOMACY:'k-diplomacy',EXPLORE:'k-explore',RECRUIT:'k-recruit'};
const shortDate=turn=>campaignDate(turn).split('년 ')[1]??campaignDate(turn);
const ui=new WeakMap();

// 장면 그림 목록(없는 파일을 요청하지 않도록 목록으로 고른다). wide = 탁자 위 가로 띠용(3:1), 없으면 예전 장면을 가운데 맞춤으로.
// 좌표는 그림에 대한 % — seats = 제안 1·2·3 번째 발언자 자리, lord = 군주 얼굴, lantern = 탁자 등불
const SCENES=await fetch('/assets/seoksil/a2/scenes.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
const FALLBACK={file:'council-scene-temp.jpg',w:1012,h:858,seats:[[27,45.5],[82,47],[8.4,49],[92,49]],lord:[55.3,32],lantern:[39.8,59]};
const sceneOf=fid=>SCENES[fid+'w']??SCENES[fid]??SCENES.temp??FALLBACK;

// 초상: 머리·어깨 그림이 있으면 그대로(is-bust), 없으면 전신 그림을 CSS 로 확대
function face(ctx,id){const b=ctx.bust?.(id),src=b??ctx.face?.(id);return src?`<img src="${esc(src)}"${b?' class="is-bust"':''} alt="" loading="lazy">`:'';}
// 메달 단추 — 청동 메달 그림 위에 한 글자 표지와 아래 꼬리표
const medal=(act,glyph,label,key='',off=false,ic='')=>`<button class="cc3-medal" data-act="${act}"${off?' disabled':''}><span class="cc3-medal__face"><img src="${A4}medal.webp" alt="">${pic(ic,glyph)}</span><small>${esc(label)}${key?` <span class="ss-key">${key}</span>`:''}</small></button>`;

export function renderCouncil(root,state,ctx){
 const u=ui.get(root)??{selectedId:null,appoint:null,entered:false,stamped:null,pick:null};ui.set(root,u);
 const c=state.council,me=state.playerFactionId;
 const o=id=>state.officers[id],name=id=>o(id)?.name??'—';
 if(!c){root.innerHTML='<section class="ss-stage cc3"><p class="cc3-empty">평정이 없는 지도입니다.</p></section>';return;}
 const open=c.status==='OPEN'&&c.turn===state.turn;
 const canAppoint=open&&!c.appointmentUsed;
 const firstChoice=open&&c.candidates.length>0&&!c.appointmentUsed;
 if(u.appoint===null)u.appoint=firstChoice;
 if(!canAppoint)u.appoint=false;
 const selected=c.proposals.find(p=>p.id===u.selectedId)??null;
 const deciding=!!selected&&selected.decision===null&&open&&!u.appoint;
 const strategist=o(c.strategistId);

 // ── 거울: 고른 안건(꼭지) + 둘레 초상 고리 셋(제안한 신하 — 누르면 그 안건) ──
 const seats=(u.appoint?[]:c.proposals.slice(0,3)).map((p,i)=>{const st=p.decision;
  return `<button class="cc3-seat cc3-seat--${i}${p.id===u.selectedId?' is-speaking':''}${st?' is-done':''}" data-proposal="${esc(p.id)}" aria-label="${esc(name(p.proposerId))} — ${esc(KIND[p.kind]?.label??p.kind)}">
   <span class="cc3-seat__face">${face(ctx,p.proposerId)}</span><img class="cc3-seat__ring" src="${A4}seat-ring.webp" alt=""><b>${esc(name(p.proposerId))}</b></button>`;}).join('');
 let knob,knobSub,knobIcon='';
 if(u.appoint){knob='師';knobIcon='lead';knobSub=firstChoice?'군사를 고른다':'군사 바꾸기';}
 else if(selected){knob=GLYPH[selected.kind]??'議';knobIcon=KIND_ICON[selected.kind]??'';knobSub=`${esc(KIND[selected.kind]?.label??selected.kind)} · ${esc(shortDate(c.turn+2))}까지`;}
 else{knob='議';knobSub=open?(c.proposals.length?'안건을 고른다':'올라온 안건이 없다'):'평정 닫힘';}
 const mirror=`<div class="cc3-mirror${selected?' is-lit':''}"><img class="cc3-mirror__art" src="${A4}mirror.webp" alt="">
  <div class="cc3-knob">${pic(knobIcon,knob)}<small>${knobSub}</small></div>${seats}</div>`;

 // ── 목독 셋: 안건 행 또는 군사 후보 행 ──
 let tags='';
 if(u.appoint){
  const pool=c.candidates.length?c.candidates:councilCandidates(state).slice(0,3).map(x=>x.officerId);
  tags=pool.map(id=>{const st=o(id)?.baseStats??{};return `<button class="cc3-tag${id===u.pick?' is-picked':''}" data-pick-officer="${esc(id)}">
   <img class="cc3-tag__art" src="${A4}tag.webp" alt=""><span class="cc3-tag__face">${face(ctx,id)}</span>
   <span class="cc3-tag__text"><b>${esc(name(id))}</b><small>${id===c.strategistId?'지금 군사':'군사 후보'}</small></span>
   <span class="cc3-stats"><i title="지략">${pic('wit','略')}${st.intelligence??'—'}</i><i title="지휘">${pic('lead','統')}${st.leadership??'—'}</i><i title="정무">${pic('politics','政')}${st.politics??'—'}</i></span></button>`;}).join('');
 }else{
  tags=c.proposals.map(p=>{const k=KIND[p.kind],st=p.decision,left=Math.max(0,c.turn+2-state.turn);
   return `<button class="cc3-tag${p.id===u.selectedId?' is-picked':''}${st?' is-done':''}" data-proposal="${esc(p.id)}" aria-label="${esc(k?.label??p.kind)} — ${esc(name(p.proposerId))} 제안">
   <img class="cc3-tag__art" src="${A4}tag.webp" alt=""><span class="cc3-tag__face">${face(ctx,p.proposerId)}</span>
   <span class="cc3-tag__text"><b>${esc(name(p.proposerId))}</b><small>${esc(k?.label??p.kind)} · ${esc(p.what)}</small></span>
   <span class="cc3-stats"><i title="${esc(k?.label??'')}">${pic(KIND_ICON[p.kind]??'',GLYPH[p.kind]??'議')}</i><i title="마감까지 남은 차례">${left}</i><i class="${st==='APPROVE'?'is-sealed':st==='HOLD'?'is-held':''}" title="${st==='APPROVE'?'결의':st==='HOLD'?'보류':'아직 정하지 않음'}">${st==='APPROVE'?'<span class="ss-seal-mark"></span>':st==='HOLD'?'一':''}</i></span></button>`;}).join('')||'<p class="cc3-none">이번 달 올라온 안건이 없다.</p>';
 }

 // ── 죽간: 군사 보고 / 고른 안건 내용 ──
 const fx=COUNCIL.decision.fulfilled.effects,bx=COUNCIL.decision.broken.effects;
 let slips;
 if(u.appoint){
  slips=`<p class="cc3-label">군사</p><p class="cc3-say">${firstChoice?`첫 평정이다. 곁에서 보고하고 계책을 낼 군사를 고른다. 고르지 않으면 ${esc(name(c.strategistId))}가 맡는다.`:'군사는 평정마다 한 번 바꿀 수 있다.'}</p>
   <p class="cc3-note">지략 ${COUNCIL.strategist.foresight.intelligenceAtLeast} 이상이면 보고에 적의 다음 수를 짐작하는 한 줄이 붙는다.</p>`;
 }else if(selected){
  slips=`<p class="cc3-say">“${esc(selected.what)}”</p>
   <dl class="cc3-facts">
    <div><dt>기대</dt><dd>${esc(selected.expected)}</dd></div>
    <div><dt>위험</dt><dd>${esc(selected.risk)}</dd></div>
    <div><dt>지키면</dt><dd>${esc(name(selected.proposerId))} 경험 <span class="ss-num">+${fx.proposerExperience}</span> · 친밀 <span class="ss-num">+${fx.rulerAffinity}</span></dd></div>
    <div><dt>어기면</dt><dd>군주와 친밀 <span class="ss-num">${bx.rulerAffinity}</span></dd></div>
   </dl>`;
 }else{
  const lines=open?c.report:[c.advisorLine??'변경은 조용합니다.'];
  const foresight=i=>open&&i===lines.length-1&&lines.length>(c.reportTopicIds?.length??lines.length);
  slips=`<p class="cc3-label">${open?`군사 ${esc(strategist?.name??'')} 보고`:'군사 한마디'}</p>${lines.map((l,i)=>`<p class="cc3-line${foresight(i)?' is-foresight':''}">${esc(l)}</p>`).join('')}`;
 }

 // ── 메달 둘 + 옥인 ──
 let medals,sealOn,sealLabel,sealAct='approve';
 if(u.appoint){
  medals=medal('appoint-cancel','任',firstChoice?`${name(c.strategistId)}에게 맡긴다`:'그대로 둔다','Esc',false,'lead');
  sealOn=!!u.pick&&u.pick!==c.strategistId;sealAct='appoint';sealLabel='군사로 삼는다';
 }else if(deciding){
  medals=medal('hold','待','보류','H',false,'wait')+medal('deselect','退','물린다','Esc',false,'close');
  sealOn=true;sealLabel='결의 — 되돌릴 수 없음';
 }else if(open){
  medals=(canAppoint?medal('appoint-open','師','군사 바꾸기','',false,'lead'):'')+medal('close','罷','평정을 마친다','',false,'close');
  sealOn=false;sealLabel=selected?'이미 정한 안건':'안건을 고르면 인장을 찍는다';
 }else{
  medals=ctx.onExit?medal('exit','圖','지도로','',false,'terrain'):'';
  sealOn=false;sealLabel=c.turn===state.turn?'이번 달 평정은 끝났다':`다음 평정 ${shortDate(nextCouncilTurn(state.turn))}`;
 }

 // ── 위 띠: 결의 점 ──
 const dots=c.resolutions.map(r=>`<i class="cc3-res is-${r.status.toLowerCase()}${r.proposalId===u.stamped?' is-new':''}" title="${esc(KIND[r.kind]?.label??r.kind)} · ${esc(name(r.proposerId))} — ${r.status==='ACTIVE'?`${esc(shortDate(r.deadlineTurn))}까지`:r.status==='FULFILLED'?'지킴':'어김'}"></i>`).join('');
 u.stamped=null;

 // ── 장면 빛: 발언자 자리 ──
 const scene=sceneOf(me),speakerIdx=selected?c.proposals.indexOf(selected):-1;
 const seat=speakerIdx>=0?scene.seats[speakerIdx%scene.seats.length]:null;
 const enter=u.entered?'':' ss-enter is-first';u.entered=true;
 root.innerHTML=`<section class="ss-stage cc3${enter}" aria-label="평정">
  <header class="cc3-top">
   <span class="ss-wadang cc3-top__crest">${esc(state.factions[me].name?.[0]??'')}</span>
   <span class="cc3-top__name">${esc(state.factions[me].name??'')}<small>평정 · ${esc(campaignDate(state.turn).split(' · ')[1]??campaignDate(state.turn))}</small></span>
   <span class="cc3-top__res" aria-label="결의 ${c.resolutions.length}건">${dots||'<em>새긴 결의 없음</em>'}</span>
   ${ctx.onExit?`<button class="cc3-back" data-act="exit" title="지도로 — 평정은 열어 둔 채">지도로</button>`:''}
  </header>
  <div class="cc3-scene"><div class="cc3-scene__frame" style="--ar:${scene.w}/${scene.h};--arn:${(scene.w/scene.h).toFixed(4)}">
   <img class="cc3-scene__art" src="/assets/seoksil/a2/${esc(scene.file)}" alt="">
   <i class="cc3-glow cc3-glow--lantern" style="--x:${scene.lantern[0]}%;--y:${scene.lantern[1]}%"></i>
   <i class="cc3-scene__shade${seat?' is-speaking':''}"></i>
   ${seat?`<i class="cc3-glow cc3-glow--speaker" style="--x:${seat[0]}%;--y:${seat[1]}%"></i>`:''}
  </div></div>
  <div class="cc3-table" aria-label="안건">
   ${mirror}
   <div class="cc3-medals">${medals}</div>
   <div class="cc3-tags" role="list">${tags}</div>
   <div class="cc3-slips"><img class="cc3-slips__art" src="${A4}slips.webp" alt=""><div class="cc3-slips__text">${slips}</div></div>
   <div class="cc3-sealbox"><button class="cc3-seal" data-act="${sealAct}"${sealOn?'':' disabled'} aria-label="${esc(sealLabel)}"><img src="${A4}jade-seal.webp" alt=""></button><small>${esc(sealLabel)}</small></div>
  </div>
 </section>`;

 // ── 명령 ──
 const rerender=()=>renderCouncil(root,ctx.state(),ctx);
 const send=cmd=>{try{ctx.dispatch(cmd);return true;}catch(e){ctx.toast?.(String(e.message??e));return false;}};
 const on=(act,fn)=>root.querySelectorAll(`[data-act="${act}"]`).forEach(b=>b.onclick=fn);
 root.querySelectorAll('[data-proposal]').forEach(b=>b.onclick=()=>{u.selectedId=u.selectedId===b.dataset.proposal?null:b.dataset.proposal;rerender();});
 root.querySelectorAll('[data-pick-officer]').forEach(b=>b.onclick=()=>{u.pick=b.dataset.pickOfficer;rerender();});
 on('appoint-open',()=>{u.appoint=true;u.pick=null;u.selectedId=null;rerender();});
 on('appoint-cancel',()=>{u.appoint=false;rerender();});
 on('appoint',()=>{if(send({type:'COUNCIL_APPOINT',officerId:u.pick})){u.appoint=false;u.pick=null;}rerender();});
 on('deselect',()=>{u.selectedId=null;rerender();});
 on('hold',()=>{if(send({type:'COUNCIL_DECIDE',proposalId:u.selectedId,decision:'HOLD'}))u.selectedId=null;rerender();});
 on('approve',e=>{const b=e.currentTarget,id=u.selectedId;b.classList.add('is-pressed');b.disabled=true;
  // 옥인 누름(0.25초) → 죽간에 주사 자국 → 위 띠에 결의 점
  const mark=document.createElement('i');mark.className='ss-seal-mark is-new cc3-stamp';root.querySelector('.cc3-slips')?.append(mark);
  setTimeout(()=>{if(send({type:'COUNCIL_DECIDE',proposalId:id,decision:'APPROVE'})){u.stamped=id;u.selectedId=null;}rerender();},650);});
 on('close',()=>{send({type:'COUNCIL_CLOSE'});rerender();});
 on('exit',()=>ctx.onExit?.());
 document.onkeydown=e=>{if(!root.isConnected||e.target?.closest?.('input,textarea,select'))return;
  if(e.key==='Escape'){if(u.appoint&&canAppoint){u.appoint=false;rerender();}else if(u.selectedId){u.selectedId=null;rerender();}return;}
  if(deciding&&(e.key==='h'||e.key==='H')){root.querySelector('[data-act="hold"]')?.click();return;}
  const n=Number(e.key);if(n>=1&&n<=3)root.querySelectorAll('.cc3-tag')[n-1]?.click();};
}
export function nextCouncilTurn(turn){return turn+((3-(turn-1)%3)%3||3);}
