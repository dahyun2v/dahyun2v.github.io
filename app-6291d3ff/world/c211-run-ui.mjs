import {LEVELUP_ASSETS} from './hud-ink.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weatherName=k=>({RAIN:'장마',COLD:'한파'})[k]??k;
export function runStatusText(v){return [
 ...(v.weather?.upcoming??[]).map(e=>`${weatherName(e.kind)} ${e.startTurn-v.turn}차례 뒤`),
 ...(v.weather?.active?[`${weatherName(v.weather.active.kind)} 중 ${v.weather.active.until-v.turn+1}차례 남음`]:[]),
 ...(v.heaven??[]).map(a=>`${a.kind==='favored'?'천시':'역전의 기세'} — ${{F01:'조조',F02:'유비',F03:'손권'}[a.factionId]??a.factionId} ${a.until-v.turn+1}차례`)
].join(' · ');}
export function blessingCardsHtml(v,pick,face=()=>null){return (v.blessing?.offered??[]).map(b=>{
 const key=({CARRIED_FOOD_MAX:'grain',SIGHT_BONUS:'banner',FREE_UNIQUE_FACILITY:'seal'})[b.effect.type],art=key?LEVELUP_ASSETS.art[key]:face(b.officerId);
 return `<button type="button" class="draft-card${pick===b.id?' picked':''}" data-c211-pick="${esc(b.id)}" aria-pressed="${pick===b.id}"><span class="kind">출발 축복</span><span class="art"${b.officerId?' data-c211-portrait':''}>${art?`<img src="${esc(art)}" alt="${esc(b.officerName??'')}">`:''}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p>${b.officerName?`<span class="foot">${esc(b.officerName)}</span>`:''}</button>`;
}).join('');}
let pick=null,offerKey=null;
function rewindConfirmation(doc,v,rewind,disabled){
 let panel=doc.querySelector('#c212-rewind-confirm');
 if(!panel){
  doc.body.insertAdjacentHTML('beforeend',`<div id="c212-rewind-confirm" class="w-modal" hidden><section role="dialog" aria-modal="true" aria-labelledby="c212-rewind-title" aria-describedby="c212-rewind-text"><h2 id="c212-rewind-title">기시감</h2><p id="c212-rewind-text"></p><footer><button id="c212-rewind-accept" type="button">되돌리기</button><button id="c212-rewind-cancel" type="button">그만두기</button></footer><p id="c212-rewind-error" role="status"></p></section></div>`);
  panel=doc.querySelector('#c212-rewind-confirm');
  // Capture before map shortcuts, even if focus moves outside the sheet.
  doc.defaultView?.addEventListener('keydown',e=>{if(!panel.hidden)panel.onkeydown(e);},true);
 }
 const close=()=>{panel.hidden=true;doc.querySelector('#c211-rewind')?.focus();};
 const key=`${v.factionId}:${v.turn}:${v.rewind?.charges??0}`;
 if(!panel.hidden&&(disabled||panel.dataset.snapshot!==key))close();
 panel.querySelector('#c212-rewind-text').textContent=`이번 차례 처음으로 되돌립니다 — 남은 기시감 ${v.rewind?.charges??0}`;
 const accept=()=>{
  if(panel.hidden||disabled)return;
  close();
  try{rewind();}catch(err){panel.hidden=false;panel.querySelector('#c212-rewind-error').textContent=err.message;panel.querySelector('#c212-rewind-cancel').focus();}
 };
 panel.querySelector('#c212-rewind-accept').onclick=accept;
 panel.querySelector('#c212-rewind-cancel').onclick=close;
 panel.onkeydown=e=>{
  e.stopImmediatePropagation();
  if(e.key==='Escape'){e.preventDefault();close();}
  else if(e.key==='Enter'){e.preventDefault();if(!e.repeat)accept();}
  else if(e.key==='Tab'){e.preventDefault();const first=panel.querySelector('#c212-rewind-accept'),last=panel.querySelector('#c212-rewind-cancel');(doc.activeElement===first?last:doc.activeElement===last?first:e.shiftKey?last:first).focus();}
 };
 return ()=>{if(disabled)return;panel.dataset.snapshot=key;panel.querySelector('#c212-rewind-error').textContent='';panel.hidden=false;panel.querySelector('#c212-rewind-accept').focus();};
}
export function renderRunModifiers(v,{phase,choose,rewind,face=()=>null,locked=false,doc=document}={}){
 let modal=doc.querySelector('#c211-blessing');
 if(!modal){
  doc.body.insertAdjacentHTML('beforeend',`<style id="c211-style">
  #c211-blessing{z-index:205}#c211-blessing .c211-sheet{width:min(1000px,96vw);max-height:94vh;overflow:auto;padding:30px;background:#24231e url('${LEVELUP_ASSETS.background}') center/cover;color:#f2e3be;border:1px solid #9b8559;box-shadow:0 20px 80px #000c}#c211-blessing h1{font-size:28px;margin:0 0 10px}#c211-blessing .c211-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:20px 0}#c211-blessing .draft-card{position:relative;min-height:330px;padding:16px;background:#24231ee8 url('${LEVELUP_ASSETS.parts.card}') center/100% 100%;color:inherit;border:1px solid #8b7853;text-align:left;cursor:pointer}#c211-blessing .draft-card.picked{outline:3px solid #d5b665;background-image:url('${LEVELUP_ASSETS.parts['card-on']}')}#c211-blessing .art{display:block;height:160px;text-align:center}#c211-blessing .art img{height:100%;max-width:100%;object-fit:contain}#c211-blessing p{font-size:15px;line-height:1.6}#c211-blessing footer{text-align:right}#c211-confirm{padding:12px 36px;font:inherit;background:#a3382c;color:#f4e6c7;border:1px solid #c9985d}#c211-confirm:disabled{opacity:.5}.c211-status{font-size:13px;line-height:1.5;display:block;color:#e3c78a;max-width:540px}#c211-rewind{font:inherit;font-size:13px;padding:4px 9px;margin-left:8px;background:#252721;color:#f0d49b;border:1px solid #8b7853;cursor:pointer}#c211-rewind:disabled{opacity:.45;cursor:default}#c211-memory{font-size:14px;color:#edd9aa}@media(max-width:700px){#c211-blessing .c211-sheet{padding:16px}#c211-blessing .c211-cards{gap:8px}#c211-blessing .draft-card{padding:10px;min-height:290px}#c211-blessing .art{height:110px}#c211-blessing h3{font-size:17px}}
  #c211-blessing h1,#c211-blessing .c211-sheet>p{color:#fff1cd;text-shadow:0 1px 3px #000,0 0 12px #000}#c211-blessing .draft-card{padding:24px}#c211-blessing .draft-card h3{font-size:19px;line-height:1.4;margin:12px 0}#c211-blessing .draft-card p{margin:0;overflow-wrap:anywhere}#c211-blessing [data-c211-portrait]{overflow:hidden}#c211-blessing [data-c211-portrait] img{width:100%;object-fit:cover;object-position:50% 15%}
  </style><div id="c211-blessing" class="w-modal" hidden><section class="c211-sheet" role="dialog" aria-modal="true" aria-labelledby="c211-title"><h1 id="c211-title"></h1><p>이번 생을 함께 시작할 하나를 고르세요.</p><div class="c211-cards"></div><footer><button id="c211-confirm" type="button" disabled>카드를 고르세요</button></footer><p id="c211-error" role="status"></p></section></div>`);
  modal=doc.querySelector('#c211-blessing');
 }
 const offered=phase==='PLAYER'&&!v.gameResult&&!locked&&v.blessing?.offered?.length&&!v.ambition?.canChoose;
 const wasHidden=modal.hidden;modal.hidden=!offered;
 if(offered){
  const key=`${v.factionId}:${v.turn}:${v.blessing.offered.map(b=>b.id).join(',')}`;if(key!==offerKey){offerKey=key;pick=null;}
  modal.querySelector('#c211-title').textContent=v.blessing.title;
  modal.querySelector('.c211-cards').innerHTML=blessingCardsHtml(v,pick,face);
  const confirm=modal.querySelector('#c211-confirm');confirm.disabled=!pick;confirm.textContent=pick?'이것을 손에 쥐고 깨어난다':'카드를 고르세요';
  modal.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.c211Pick){pick=b.dataset.c211Pick;renderRunModifiers(v,{phase,choose,rewind,face,locked,doc});modal.querySelector(`[data-c211-pick="${pick}"]`)?.focus();}else if(b.id==='c211-confirm'&&pick){try{choose(pick);}catch(err){modal.querySelector('#c211-error').textContent=err.message;}}};
  if(wasHidden)modal.querySelector('[data-c211-pick]')?.focus();
  modal.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not([disabled])')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus();}}};
 }
 for(const host of [doc.querySelector('#turn'),doc.querySelector('.ih-date')].filter(Boolean)){
  let status=host.querySelector('.c211-status');if(!status){status=doc.createElement('span');status.className='c211-status';host.append(status);}status.textContent=runStatusText(v);
 }
 const host=doc.querySelector('.ih-date')??doc.querySelector('#turn');
 const rewindDisabled=!v.rewind?.available||locked||phase!=='PLAYER'||!!v.gameResult||!!offered;
 const openRewind=rewindConfirmation(doc,v,rewind,rewindDisabled);
 if(host){let button=doc.querySelector('#c211-rewind');if(!button){button=doc.createElement('button');button.id='c211-rewind';button.type='button';host.append(button);}button.textContent=`기시감 ${v.rewind?.charges??0}`;button.disabled=rewindDisabled;button.title=v.rewind?.reason??'이번 차례 처음으로';button.onclick=openRewind;}
 const memory=v.rewind?.last?.turn===v.turn?v.rewind.last:null,advisor=doc.querySelector('#w-advisor');
 if(advisor){let line=doc.querySelector('#c211-memory');if(!line){line=doc.createElement('p');line.id='c211-memory';advisor.querySelector('.say')?.append(line);}line.hidden=!memory;line.textContent=memory?.text??'';if(memory){const portrait=face(memory.officerId),f=advisor.querySelector('.face'),who=advisor.querySelector('.who');if(f&&portrait)f.innerHTML=`<img src="${esc(portrait)}" alt="${esc(v.officers[memory.officerId]?.name??'장수')}">`;if(who)who.textContent=v.officers[memory.officerId]?.name??'장수';for(const box of doc.querySelectorAll('.nb-advisor-box')){const text=box.querySelector('p'),img=box.querySelector('img');if(text)text.textContent=memory.text;if(img&&portrait)img.src=portrait;}}}
}
