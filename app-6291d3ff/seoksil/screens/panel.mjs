// C96 공통 결정 판. 선택 미리보기는 상태를 바꾸지 않는다.
import {view} from '/src/campaign-runtime.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';
import {pendingCampaignDraft,needsTraitResolution,resolveTraitSpace,CAMPAIGN_TRAIT_SLOTS} from '/src/campaign-growth.mjs';
import {officerEffectCards} from '/src/campaign-effects.mjs';
import {campaignCaptives,captiveRecruitmentReason} from '/src/campaign-captives.mjs';
import {occupationDisplay,occupationMethodReason,OCCUPATION_METHODS} from '/src/campaign-occupation.mjs';
const DIPLO_KIND={TRUCE:'휴전',ALLIANCE:'동맹'};
// world.js 에서 옮김: reasonText (내부 조건 코드를 화면에 노출하지 않는다)
const reasonText=code=>code?(/[가-힣]/.test(code)?code:'조건 미충족'):'';
const DIPLO_TEXT={TRUCE:'다음 차례부터 3차례 동안 서로 공격하지 않고 상대 땅에 새로 들어가지 않습니다. 상대 땅에 있던 부대는 철수하는 동안 보호받습니다.',ALLIANCE:'서로 공격하지 않습니다. 자동으로 함께 싸우지는 않습니다.'};
export function decisionTasks(s){const v=view(s),d=pendingCampaignDraft(s),out=[];
 if(s.gameResult)out.push({id:'result',label:s.gameResult.type==='UNIFICATION'?'천하 통일':'캠페인 종료'});
 if(v.pendingEvent)out.push({id:'event',label:v.pendingEvent.title});
 if(d)out.push({id:'draft',label:`${s.officers[d.officerId].name} · 레벨업`});
 if(v.exploration?.pending)out.push({id:'choice',label:v.exploration.pending.name});
 if(v.diplomacy?.incoming?.length)out.push({id:'diplomacy',label:'외교 제안'});
 if(v.achievements?.pending)out.push({id:'achievement',label:v.achievements.pending.name});
 if(campaignCaptives(s).some(p=>!p.negotiating))out.push({id:'captives',label:'포로 처분'});
 for(const c of Object.values(v.ownCities))if(['CAPTURED','OCCUPATION'].includes(occupationDisplay(s,s.cities[c.cityId]).stage))out.push({id:`occupation:${c.cityId}`,label:`${c.name} · 점령 처리`});
 if(v.c31)out.push({id:'crisis',label:v.c31.name});return out;
}
export function createDecisionPanel(host,ctx){
 let active=null,picked=null,achPick=null,trait=null,error='',returnFocus=null,previousKey=null,binding=null;
 const crisisSeen=new Set(),s=()=>ctx.state();
 const send=cmd=>{const ok=ctx.command(cmd);if(ok){active=null;picked=null;error='';}else error=ctx.error?.()??'';return ok;};
 // world.js 에서 옮김: pendingChoice (외교·성과·탐험 선택 계약)
 function pendingChoice(v,kind){
  const d=v.diplomacy?.incoming?.[0];
  if(kind==='diplomacy'&&d)return {key:d.proposalId,title:`${d.fromName??d.from}의 ${DIPLO_KIND[d.kind]} 제안`,text:DIPLO_TEXT[d.kind],condition:Number.isFinite(d.expiresTurn)?`${d.expiresTurn}턴까지 답하지 않으면 거절`:'',choices:[{id:'yes',label:'받아들인다',preview:DIPLO_TEXT[d.kind]},{id:'no',label:'거절한다',preview:'같은 제안은 3차례 동안 다시 오지 않습니다'}],send:id=>({type:'DIPLO_RESPOND',proposalId:d.proposalId,accept:id==='yes'})};
  const a=v.achievements?.pending;
  if(kind==='achievement'&&a){const card=achPick&&a.cards.find(c=>c.cardId===achPick);
   if(card)return {key:`${a.achievementId}:${achPick}`,title:`${a.name} — ${card.name}`,text:card.effectLine,choices:card.targets.map(t=>({id:t.id,label:t.name,preview:t.effectLine})),send:id=>({type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:card.cardId,...(card.target==='CITY'?{cityId:id}:{officerId:id})})};
   return {key:a.achievementId,title:a.name,text:'보상 하나를 고르세요. 판 안에서만 유지됩니다.',choices:a.cards.map(c=>({id:c.cardId,label:c.name,preview:c.effectLine})),send:id=>{const c=a.cards.find(c=>c.cardId===id);if(c.targets?.length>1){achPick=id;return null;}const t=c.targets?.[0];return {type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:id,...(t?(c.target==='CITY'?{cityId:t.id}:{officerId:t.id}):{})};}};
  }
  const x=v.exploration?.pending;
  if(kind==='choice'&&x)return {key:x.placeId,title:x.name,text:x.scene,condition:`${x.turnsLeft}차례 안에 고르세요(안 고르면 첫 번째)`,choices:x.choices.map(c=>({id:c.choiceId,label:c.text,preview:c.effectLine})),send:id=>({type:'EXPLORE_CHOICE',placeId:x.placeId,choiceId:id})};
 }
 // world.js 에서 옮김: renderEventCard / renderGrowthDraft / renderCaptives / openCrisisCard / renderResultSummary
 function description(){const state=s(),v=view(state),d=pendingCampaignDraft(state);
  if(active==='result'&&state.gameResult){const r=state.gameResult,won=['UNIFICATION','TURN_LIMIT'].includes(r.type)&&(r.winnerFactionId??state.playerFactionId)===state.playerFactionId;return {key:'result',title:r.type==='UNIFICATION'?(won?'천하 통일':'통일 — 캠페인 종료'):r.type==='TURN_LIMIT'?(won?`${state.turn-1}턴 종료 — 승리`:`${state.turn-1}턴 종료 — ${state.factions[r.winnerFactionId]?.name??''} 승리`):'멸망 — 캠페인 종료',choices:[{id:'home',label:'처음 화면'}],send:()=>{ctx.home();return null;},rows:r.ranking?.map(x=>[state.factions[x.factionId]?.name??x.factionId,x.majorCities??x.cities??''])};}
  if(active==='event'&&v.pendingEvent){const e=v.pendingEvent;return {key:e.eventId,title:e.title,text:e.text,choices:e.choices.map(c=>({id:c.id,label:c.label,preview:c.preview,blocked:reasonText(c.blockedReason)})),send:id=>({type:'EVENT_CHOICE',eventId:e.eventId,choiceId:id})};}
  if(active==='draft'&&d){const r=state.campaignGrowth.officers[d.officerId];return {key:d.draft.draftId,title:`${state.officers[d.officerId].name} · Lv ${d.draft.contextSnapshot.levelAfter}`,text:'레벨업 — 특기 또는 전법을 고르세요.',draft:d,choices:d.cards.map(c=>({id:c.traitId,label:c.name,preview:c.text,permanent:c.rank?`${c.rank}단계 → ${c.rank+1}단계`:'신규',card:c})),send:id=>({type:'DRAFT_PICK',draftId:d.draft.draftId,traitId:id}),reroll:!d.draft.c28&&d.draft.rerollCount<(d.draft.rerollLimit??1)&&r.track.growthStates[d.officerId].aptitudePoints>0&&d.draft.eligibleCandidateSnapshot.some(c=>!d.draft.offeredIds.includes(c.traitId))};}
  if(active==='captives'){const p=campaignCaptives(state).find(p=>!p.negotiating);if(!p)return null;return {key:p.prisonerId,title:`포로 · ${p.name}`,choices:[{id:'hold',label:'억류'},{id:'release',label:'무상 석방'},{id:'recruit',label:'조건부 등용',blocked:captiveRecruitmentReason(state,p),preview:'인망 50 · 협의 1턴 · 성공 시만 소비'}],send:id=>({type:'CAPTIVE_ACTION',prisonerId:p.prisonerId,action:id})};}
  if(active?.startsWith('occupation:')){const id=active.slice(11),c=state.cities[id];if(!c||!['CAPTURED','OCCUPATION'].includes(occupationDisplay(state,c).stage))return null;return {key:active,title:`${c.name} · 점령 처리 방식`,choices:Object.entries(OCCUPATION_METHODS).map(([id,label])=>({id,label,blocked:occupationMethodReason(state,c,id)})),send:method=>({type:'OCCUPATION_METHOD',cityId:id,method})};}
  if(active==='crisis'&&v.c31){const x=v.c31;return {key:`${x.actorId}:${x.startTurn}:${x.resolved}`,title:x.resolved?'위기가 지나갔다':'위기 인물 등장',text:x.warnText??x.name,condition:x.turnsLeft!==undefined?`${x.turnsLeft}턴 남음`:'',choices:[{id:'ack',label:x.resolved?'확인':'맞선다'}],send:()=>{crisisSeen.add(`${x.actorId}:${x.startTurn}:${x.resolved}`);active=null;return null;}};}
  return pendingChoice(v,active);
 }
 // world.js 에서 옮김: choicePreviewState / choiceTraits / renderTraitChoice (미리보기는 복사본만)
 function preview(){const copy=structuredClone(s());for(const r of trait?.resolutions??[])resolveTraitSpace(copy,trait.officerId,r);return copy;}
 const traits=()=>officerEffectCards(preview(),trait.officerId).filter(c=>!c.core);
 function renderTrait(){
  const mode=trait.mode,items=traits();
  let fx=!mode?'합치기 또는 버리기를 선택하세요. 고유특기는 보호됩니다.':mode==='merge'?'둘을 선택하세요. 먼저 고른 특기를 남깁니다.':'버릴 특기 하나를 선택하세요.';
  if(mode==='merge'&&trait.selected.length===2){try{const copy=preview(),id=resolveTraitSpace(copy,trait.officerId,{mode,keepId:trait.selected[0],removeId:trait.selected[1]}),c=officerEffectCards(copy,trait.officerId).find(c=>c.traitId===id);fx=`합치기 결과: ${c.name} · ${c.rank}단계`;}catch(e){fx=e.message;}}
  body('특성 정리',fx,!mode?[{id:'merge',label:'합치기'},{id:'discard',label:'버리기'}]:items.map(c=>({id:c.traitId,label:`${c.name} ${c.rank}단계`,preview:c.text})),null,{selected:trait.selected,ready:!!mode&&trait.selected.length===(mode==='merge'?2:1)});
  host.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const id=b.dataset.pick;if(!trait.mode){trait.mode=id;trait.selected=[];}else if(trait.selected.includes(id))trait.selected=trait.selected.filter(x=>x!==id);else if(trait.selected.length<(trait.mode==='merge'?2:1))trait.selected.push(id);renderTrait();});
  host.querySelector('[data-confirm]').onclick=()=>{if(trait.selected.length!==(mode==='merge'?2:1))return;const resolution=mode==='merge'?{mode,keepId:trait.selected[0],removeId:trait.selected[1]}:{mode,removeId:trait.selected[0]};
   try {const copy=preview();resolveTraitSpace(copy,trait.officerId,resolution);trait.resolutions.push(resolution);if(officerEffectCards(copy,trait.officerId).filter(c=>!c.core).length+1>=CAMPAIGN_TRAIT_SLOTS){trait.mode=null;trait.selected=[];renderTrait();return;}const t=trait;if(send({type:'DRAFT_PICK',draftId:t.draftId,traitId:t.traitId,resolution:t.resolutions})){trait=null;render();}}catch(e){ctx.toast(e.message);}
  };
 }
 function body(title,text,choices,choice,opts={}){
  const selected=opts.selected??[picked],key=choice?.key??'trait',ready=opts.ready??!!choices.find(c=>c.id===picked&&!c.blocked);
  host.hidden=false;host.innerHTML=`<section class="sm-decide" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1"><span class="ss-gui"><span class="ss-label">${esc(title)}</span></span><div class="ss-panel ss-panel--decide"><h2 class="ss-name">${esc(title)}</h2>${text?`<p>${esc(text)}</p>`:''}<div class="sm-choices${choice?.draft?' sm-draft':''}">${choices.map(c=>`<button class="${choice?.draft?'ss-panel':'ss-slip'}${selected.includes(c.id)?' is-picked':''}" data-pick="${esc(c.id)}" aria-pressed="${selected.includes(c.id)}" ${c.blocked?'disabled':''} title="${esc(c.blocked??c.preview??'')}"><b>${esc(c.label)}</b><small>${esc(c.blocked??c.preview??'')}</small></button>`).join('')}</div><dl class="ss-decide__rows">${[['효과',choices.find(c=>c.id===picked)?.preview],['비용',choices.find(c=>c.id===picked)?.cost],['조건',choices.find(c=>c.id===picked)?.blocked??choice?.condition],['영구 여부',choices.find(c=>c.id===picked)?.permanent],...(choice?.rows??[])].filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="ss-reason" role="alert">${esc(error)}</p><footer class="sm-decide-foot"><button class="ss-btn ss-btn--quiet" data-close>돌아가기 <span class="ss-key">Esc</span></button>${choice?.reroll?'<button class="ss-btn" data-reroll>다시 뽑기</button>':''}${choice?.draft?.draft.c28?choice.draft.cards.map(c=>`<button class="ss-btn" data-reroll-card="${esc(c.traitId)}" ${c.rerollsRemaining>0?'':'disabled'}>${esc(c.name)} · 다시 뽑기 ${c.rerollsRemaining??0}</button>`).join(''):''}<span class="sm-confirm"><button class="ss-seal" data-confirm aria-label="확정 — 인장을 찍는다" ${ready?'':'disabled'}></button><small>확정 <span class="ss-key">Enter</span></small></span></footer></div></section>`;
  host.querySelector('[data-close]').onclick=()=>{if(trait||binding){trait=null;binding=null;picked=null;render();}else close();};
  if(previousKey!==key){previousKey=key;host.querySelector('[role=dialog]').focus();}
 }
 function render(){if(trait){renderTrait();return;}if(binding){renderBinding();return;}if(!active){host.hidden=true;return;}
  const d=description();if(!d){close();return;}if(!d.choices.some(c=>c.id===picked))picked=null;body(d.title,d.text,d.choices,d);
  host.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{picked=b.dataset.pick;error='';render();});
  host.querySelector('[data-reroll]')?.addEventListener('click',()=>{send({type:'DRAFT_REROLL',draftId:d.draft.draft.draftId});active='draft';picked=null;render();});
  host.querySelectorAll('[data-reroll-card]').forEach(b=>b.onclick=()=>{send({type:'DRAFT_REROLL',draftId:d.draft.draft.draftId,traitId:b.dataset.rerollCard});active='draft';picked=null;render();});
  host.querySelector('[data-confirm]').onclick=()=>{
   const id=picked,c=d.choices.find(c=>c.id===id);if(!c||c.blocked)return;
   if(d.draft){const draft=d.draft;if(c.card.modifier){const targets=c.card.bindingTargets??[];if(!targets.length){error='묶을 수 있는 장착 전법이 없습니다.';render();return;}binding={draft,card:c.card,targets};picked=null;renderBinding();return;}
    if(needsTraitResolution(s(),draft.officerId,id)){trait={draftId:draft.draft.draftId,officerId:draft.officerId,traitId:id,mode:null,selected:[],resolutions:[]};renderTrait();return;}}
   const cmd=d.send(id);if(cmd)send(cmd);else picked=null;if(!s())return;render();
  };
 }
 // world.js 에서 옮김: showBindChooser
 function renderBinding(){const {draft,card,targets}=binding,r=s().campaignGrowth.officers[draft.officerId];body(card.name,card.text,targets.map(t=>({id:t,label:r.cards[t]?.name??t})),{key:`bind:${card.traitId}`});host.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{picked=b.dataset.pick;renderBinding();});host.querySelector('[data-confirm]').onclick=()=>{if(!targets.includes(picked))return;const cmd={type:'DRAFT_PICK',draftId:draft.draft.draftId,traitId:card.traitId,tacticId:picked};binding=null;if(send(cmd))render();else {binding={draft,card,targets};renderBinding();}};}
 function close(){active=null;picked=null;trait=null;binding=null;previousKey=null;host.hidden=true;returnFocus?.isConnected&&returnFocus.focus();}
 const open=id=>{returnFocus=document.activeElement;active=id;picked=null;error='';render();};
 function sync(){const state=s(),v=view(state);if(state.gameResult){if(active!=='result')open('result');else render();return;}if(active){render();return;}if(state.phase!=='PLAYER')return;
  if(pendingCampaignDraft(state))open('draft');else if(v.pendingEvent)open('event');else if(v.c31&&!crisisSeen.has(`${v.c31.actorId}:${v.c31.startTurn}:${v.c31.resolved}`))open('crisis');
 }
 host.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Enter'&&e.target===host.querySelector('[role=dialog]')){e.preventDefault();host.querySelector('[data-confirm]')?.click();}if(e.key==='Tab'){const list=[...host.querySelectorAll('button:not(:disabled)')],first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===host.querySelector('[role=dialog]'))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 return {open,sync,close,get isOpen(){return !host.hidden;}};
}
