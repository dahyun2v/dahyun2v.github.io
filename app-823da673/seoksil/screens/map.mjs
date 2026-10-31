// C96 SC04 M1 — 지도 그림만 map-v3, HUD는 석실 부품으로 새로 짠다.
import {view,campaignMoveOptions,CAMPAIGN_TURN_LIMIT} from '/src/campaign-runtime.mjs';
import {campaignMapModel,campaignDate} from '/src/campaign-map-model.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';
import {armyActionEnded,attackTargets,cityAttackTargets,previewAttack,previewCityAttack,previewTactic} from '/src/campaign-combat.mjs';
import {campaignTactics,hasCampaignRule,recallReason} from '/src/campaign-effects.mjs';
import {regroupReason} from '/src/campaign-morale.mjs';
import {orderEligible,orderRoute,orderHighlights,queuedOrderUnit} from '/src/campaign-orders.mjs';
import {targetTile,cycleTileUnit} from '/src/campaign-select.mjs';
import {directionToward} from '/src/campaign-abilities.mjs';
import {hubBuildReason} from '/src/campaign-supply.mjs';
import {pendingCampaignDraft} from '/src/campaign-growth.mjs';
import {cityEconomyRates,CITY_JOBS} from '/src/campaign-economy.mjs';
import {renderWorldMap,animateUnits,FACTION} from '/app/world/map-v3.mjs';
import {loadV3Manifest,v3MapOptions,v3ModeHighlights,v3Relations,V3_MODES,setV3Mode,v3Mode} from '/app/design/v3-ui.mjs';
import {createDecisionPanel,decisionTasks} from '/app/seoksil/screens/panel.mjs';

export function niche(src,name,picked=true){return `<span class="ss-niche${picked?' is-picked':''}" aria-label="${esc(name)}"><span class="ss-niche__hatch"><span class="ss-niche__window">${src?`<img src="${esc(src)}" alt="">`:''}</span></span><span class="ss-niche__plinth" aria-hidden="true"></span></span>`;}
const KEYS={move:'Q',attack:'E',face:'F',brace:'B',regroup:'R',garrison:'G',wait:'Z'};
// 시안 C-world 의 명령 격자: 칸마다 한 글자 기호 + 이름 + 단축키(기호는 새김 글자 — 그림 아이콘은 다음 단계)
const GLYPH={move:'移',attack:'攻',face:'向',brace:'守',regroup:'整',wait:'待',garrison:'駐',hub:'補','cancel-order':'止',recall:'歸',star:'星',close:'放'};
const MODE_GLYPH={world:'世',supply:'補',faction:'勢',diplomacy:'外',trace:'跡'};
// 지도 그림: 시안 C-world 화풍으로 다시 칠한 벽 지도(C100, 지형 위치는 v3-base-v2 그대로)
const WALL_MAP='/assets/seoksil/a3/map-wall.webp';
// 석실 에셋 조립(2026-10-09, 목표 그림 T-sc04-map v2): 판·단추 표면 = 챗방 에셋(/assets/seoksil/a4), 표지 = 그림 아이콘(/assets/seoksil/icons — 아직 없는 것은 한자 새김)
const A4='/assets/seoksil/a4/';
const ICONS=new Set(await fetch('/assets/seoksil/icons/index.json').then(r=>r.ok?r.json():[]).catch(()=>[]));
const icon=(id,glyph)=>ICONS.has(id)?`<img class="ss-pic" src="/assets/seoksil/icons/${id}.webp" alt="" aria-hidden="true">`:`<i aria-hidden="true">${glyph}</i>`;
const medal=inner=>`<span class="sm-medal"><img class="sm-medal__art" src="${A4}medal.webp" alt="">${inner}</span>`;
const MODE_ICON={world:'terrain',supply:'supply-line',faction:'faction',diplomacy:'diplomacy',trace:'trace'};
const TASK_ICON={event:'falling-star',draft:'star',choice:'beacon',diplomacy:'sealed-letter',achievement:'star',captives:'notice-board',crisis:'beacon',result:'drum'};
const COUNCIL_ICON={ATTACK_CITY:'k-attack',DEFEND_CITY:'k-defend',BUILD_HUB:'k-hub',MUSTER:'k-muster',CITY_DEVELOP:'k-develop',DIPLOMACY:'k-diplomacy',EXPLORE:'k-explore',RECRUIT:'k-recruit'};
const CITY_ART=new Set(['ji','julu','nanpi','pingyuan','xindu','ye','yijing','zhongshan']); // /assets/ui-v3/cities/ 에 있는 성 그림
const MORALE_NAME={STEADY:'사기 안정',SHAKEN:'동요',ROUTING:'패주'},SUPPLY_LABEL={SAFE:'안전',DISRUPTED:'불안',CUT:'끊김',STARVING:'굶주림'};
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ko-KR'):'—';
export function mountMap(root,ctx,preselected=null){
 let selectedArmyId=preselected?.armyId??null,selectedCityId=selectedArmyId?null:preselected?.cityId??null;
 let mode=null,tacticId=null,destination=null,zoom=1.7,aiTimer=null,orderTimer=null,disposed=false,lastError='',suppressClick=false,pan=null,newsKey=null,newsTimer=null,combatUntil=0,combatTimer=null;
 let musterOfficer=preselected?.officerId??null,musterTroop=preselected?.troopType??null,jobKind=preselected?.facility??null;
 const state=()=>ctx.state(),$=sel=>root.querySelector(sel),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.innerHTML=`<section class="ss-stage sm-map" aria-label="천하 지도"><div class="sm-viewport" tabindex="0" aria-label="지도 — 드래그로 이동, 휠로 확대"><div id="ss-map"></div></div><div class="ss-lamp" aria-hidden="true"></div><header class="sm-top"><div class="sm-resources"></div><img class="sm-top__dial" src="/assets/seoksil/a4/dial.webp" alt="" aria-hidden="true"><div class="sm-date ss-num"></div><nav class="sm-top__btns"><button class="sm-round" id="save" title="저장" aria-label="저장">${medal(icon('save','存'))}</button><button class="sm-round" data-load title="처음 화면 · 불러오기" aria-label="불러오기">${medal(icon('load','讀'))}</button></nav></header><div class="sm-news ss-slip" role="status" aria-live="polite" hidden></div><aside class="sm-tasks" aria-label="처리할 일" hidden></aside><aside class="sm-progress" aria-label="진행 중" hidden><header class="sm-panel__title"><b>진행 중</b><i class="sm-dot"></i></header><ol></ol></aside><section class="sm-selection" aria-label="선택 묶음"></section><nav class="sm-modes" aria-label="지도 표시층"></nav><div class="sm-next"><button class="sm-drum" id="next-task"><img src="/assets/seoksil/a4/drum.webp" alt=""></button><span id="next-label"></span><span class="ss-key">Space</span></div><p class="sm-advisor"></p><aside class="ss-panel sm-forecast" role="tooltip" hidden></aside><div class="sm-overlay" hidden></div></section>`;
 const viewport=$('.sm-viewport'),map=$('#ss-map'),stage=$('.sm-map');
 const panel=createDecisionPanel($('.sm-overlay'),{...ctx,command,error:()=>lastError});
 // world.js 에서 옮김: inputLocked / scheduleOrders / scheduleAi / command
 function inputLocked(){const s=state();return disposed||s.phase==='AI'||!!s.gameResult||!!s.orderQueue?.length||!!pendingCampaignDraft(s)||performance.now()<combatUntil;}
 function scheduleOrders(){clearTimeout(orderTimer);const s=state();if(!disposed&&!s.gameResult&&s.phase==='PLAYER'&&queuedOrderUnit(s)&&!pendingCampaignDraft(s))orderTimer=setTimeout(()=>command({type:'ADVANCE_ORDER'},true),reduced?16:480);}
 function scheduleAi(){clearTimeout(aiTimer);scheduleOrders();if(!disposed&&!state().gameResult&&state().phase==='AI')aiTimer=setTimeout(()=>command({type:'ADVANCE_AI'},true),reduced?16:480);}
 function command(request,automatic=false){
  if(disposed)return false;
  const draft=['DRAFT_PICK','DRAFT_REROLL'].includes(request.type),decision=['EVENT_CHOICE','DIPLO_RESPOND','EXPLORE_CHOICE','CAPTIVE_ACTION','OCCUPATION_METHOD','ACHIEVEMENT_CHOICE'].includes(request.type);
  if(!automatic&&!draft&&!decision&&inputLocked())return false;
  try {const before=state(),after=ctx.dispatch(request);lastError='';mode=null;tacticId=null;destination=null;
   const combat=after.lastCombat&&after.lastCombat.sequence!==before.lastCombat?.sequence?after.lastCombat:null;
   if(combat){const v=view(after),visible=[combat.attackerId,combat.targetId].some(id=>before.armies[id]?.factionId===after.playerFactionId)||[combat.fromTileId,before.armies[combat.targetId]?.tileId,before.cities[combat.cityId]?.tileId].some(t=>v.knowledge.tiles[t]==='VISIBLE');if(visible){combatUntil=performance.now()+(reduced?0:420);news((combat.effectLines??[]).join(' · ')||`공격 · 아군 −${combat.allyLoss??0} / 적 −${combat.enemyLoss??0}`);}}
   if(after.phase==='AI'&&before.phase==='PLAYER')news('AI 차례 진행 중…');
   render(combat);scheduleAi();if(combat){clearTimeout(combatTimer);combatTimer=setTimeout(()=>{if(!disposed)render();},reduced?0:440);}return true;
  }catch(e){lastError=errorText(e);ctx.toast(lastError);return false;}
 }
 function news(text){if(!text)return;clearTimeout(newsTimer);const n=$('.sm-news');n.textContent=text;n.hidden=false;newsTimer=setTimeout(()=>{if(!disposed)n.hidden=true;},3600);}
 // world.js 에서 옮김: cityProductionBadge / idleCities / autoNextUnitNow (다음 할 일)
 function cityProductionBadge(c){const s=state(),sc=s.cities[c.cityId];if(!sc||!c.jobs)return null;const stage=s.occupations?.[c.cityId]?.stage;if(stage&&stage!=='NORMAL')return null;
  if(!c.currentProduction)return {idle:true};const kind=c.currentProduction.kind,job=c.jobs.find(j=>j.kind===kind)??CITY_JOBS[kind]??{},rates=cityEconomyRates(s,sc),progress=kind==='reorganize'?c.productionProgress??0:c.jobProgress?.[kind]??0,gain=(c.production||rates.production)*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1);
  return {name:job.name,turns:Math.max(1,Math.ceil(((job.cost??0)-progress)/Math.max(.01,gain)))};
 }
 const idleCities=v=>Object.values(v.ownCities).filter(c=>cityProductionBadge(c)?.idle);
 const remainingArmies=v=>Object.values(v.ownArmies).filter(a=>!armyActionEnded(state(),a.armyId)&&!state().moveOrders?.[a.armyId]).sort((a,b)=>a.armyId.localeCompare(b.armyId));
 function nextTask(force=false){if(inputLocked())return;const v=view(state()),pending=decisionTasks(state()).find(t=>t.id==='event'||t.id==='draft');if(pending){panel.open(pending.id);return;}
  if(!force){const list=remainingArmies(v);if(list.length){const i=list.findIndex(a=>a.armyId===selectedArmyId),a=list[(i+1)%list.length];selectArmy(a.armyId,true);return;}const c=idleCities(v)[0];if(c){selectCity(c.cityId,true);return;}}
  command({type:'END_TURN'});
 }
 function selectArmy(id,center=false){selectedArmyId=id;selectedCityId=null;mode=null;tacticId=null;destination=null;render();if(center)follow();}
 function selectCity(id,center=false){selectedCityId=id;selectedArmyId=null;mode=null;tacticId=null;musterOfficer=null;musterTroop=null;jobKind=null;render();if(center)follow();}
 function button(label,act,{key=KEYS[act],disabled=false,tip=''}={}){return `<button class="sm-tile${disabled?' is-off':''}" data-command="${act}" ${disabled?'disabled':''} title="${esc(tip||label)}">${medal(icon(act,GLYPH[act]??esc(label[0])))}<span>${esc(label)}</span>${key?`<kbd class="ss-key">${key}</kbd>`:''}</button>`;}
 // world.js 에서 옮김: renderUnitMenu / unitCardHead
 function unitCard(v){const s=state(),a=v.ownArmies[selectedArmyId];if(!a){selectedArmyId=null;return '';}
  const done=armyActionEnded(s,selectedArmyId),o=v.officers[a.commanderId],sup=a.supply,can=!inputLocked(),tactics=campaignTactics(s,selectedArmyId);
  let acts=button('이동','move',{disabled:!can||!orderEligible(s,selectedArmyId)})+button('공격','attack',{disabled:!can||done||!(attackTargets(s,selectedArmyId).length||cityAttackTargets(s,selectedArmyId).length)})+button('정면','face',{disabled:!can||done||s.movedArmyIds.includes(selectedArmyId)})+button('방어','brace',{disabled:!can||done})+button('재정비','regroup',{disabled:!can||!!regroupReason(s,selectedArmyId),tip:regroupReason(s,selectedArmyId)??''})+button('대기','wait',{disabled:!can||done});
  if(Object.values(v.ownCities).some(c=>c.tileId===a.tileId))acts+=button('주둔','garrison',{disabled:!can||done});
  if(sup){const why=hubBuildReason(s,s.armies[selectedArmyId]);acts+=button('보급 거점','hub',{disabled:!can||done||!!why,tip:why??'',key:null});}
  if(hasCampaignRule(s,selectedArmyId,'RECALL'))acts+=button('귀환','recall',{disabled:!can||!!recallReason(s,selectedArmyId),tip:recallReason(s,selectedArmyId)??'',key:null});
  if(a.starAction)acts+=button(`별의 길 · ${a.starAction.name}`,'star',{disabled:!can||done||!a.starAction.canUse,tip:a.starAction.description,key:null});
  if(s.moveOrders?.[selectedArmyId])acts+=button('이동 취소','cancel-order',{disabled:!can,key:null});
  acts+=tactics.map((c,i)=>{const gauge=Math.min(100,s.campaignGrowth?.officers?.[s.armies[selectedArmyId]?.commanderId]?.c29?.gauge??(100-(c.waiting??0))),status=c.signature?`고유 · 게이지 ${Math.round(gauge)}/100`:!c.waiting&&!c.targets.length?'대상 없음':`대기 ${c.waiting??0}턴`;return `<button class="sm-tile sm-tile--tactic${!can||!c.targets.length?' is-off':''}" data-tactic="${esc(c.traitId)}" ${!can||!c.targets.length?'disabled':''} title="${esc((c.text??'')+' · '+status)}">${medal(icon('tactic','法'))}<span>${esc(c.name)}</span><small>${esc(status)}</small><kbd class="ss-key">${i+1}</kbd></button>`;}).join('');
  const bust=ctx.bust?.(a.commanderId),face=bust??ctx.face(a.commanderId),hint=done?'이번 턴 행동 완료':mode==='move'?'이동할 칸을 누르세요':mode==='attack'?'공격할 대상을 누르세요':mode==='face'?'바라볼 칸을 누르세요':'명령을 고르세요';
  return `<div class="sm-card"><img class="sm-card__art" src="${A4}tag-tall.webp" alt=""><span class="sm-card__face">${face?`<img src="${esc(face)}"${bust?' class="is-bust"':''} alt="">`:''}</span>
   <header class="sm-card__title"><b>${esc(o?.name??'')}</b><span>${esc(TROOP_LABEL[a.troopType]??'')}</span><i class="sm-dot${done?' is-done':''}" title="${done?'행동 끝':'행동 가능'}"></i></header>
   <ul class="sm-stats"><li>${icon('troops','兵')}<span>병력</span><b class="ss-num">${fmt(a.troopCount)}</b></li><li>${icon('morale','士')}<span>사기</span><b>${esc((MORALE_NAME[a.morale]??'—').replace('사기 ',''))}</b></li><li>${icon('supply','糧')}<span>보급</span><b>${sup?`${esc(SUPPLY_LABEL[sup.state]??sup.state)} <small class="ss-num">${fmt(sup.stock)}/${fmt(sup.max)}</small>`:'—'}</b></li></ul>
   <p class="sm-card__hint">${hint}</p></div>
  <div class="sm-commands"><div class="sm-tiles">${acts}${button('놓기','close',{key:'Esc'})}</div></div>`;
 }
 // world.js 에서 옮김: renderCityPanel / refreshMusterTroops / refreshCityTroops / CITY_JOB 핸들러
 function cityCard(v){const c=v.ownCities[selectedCityId]??v.knowledge.cities[selectedCityId];if(!c){selectedCityId=null;return '';}
  const art=CITY_ART.has(c.cityId)?`<img src="/assets/ui-v3/cities/${esc(c.cityId)}.png" alt="">`:'';
  if(!v.ownCities[selectedCityId])return `<div class="sm-card"><img class="sm-card__art" src="${A4}tag-tall.webp" alt=""><span class="sm-card__thumb">${art}</span><header class="sm-card__title"><b>${esc(c.name)}</b><span>관측</span></header><p class="sm-card__hint">관측한 도시 위치 · 안쪽 자원과 작업은 모름</p></div><div class="sm-commands"><div class="sm-tiles">${button('놓기','close',{key:'Esc'})}</div></div>`;
  const s=state(),badge=cityProductionBadge(c),officers=[...(c.freeOfficers??[]),...(c.governorId&&!Object.values(v.ownArmies).some(a=>a.commanderId===c.governorId)&&v.officers[c.governorId]?[v.officers[c.governorId]]:[])],available=officers.filter(o=>!v.officers[o.officerId]?.injury&&!v.officers[o.officerId]?.fatigue?.musterBlocked);
  if(!available.some(o=>o.officerId===musterOfficer))musterOfficer=available[0]?.officerId??null;
  const troops=c.musterOptions?.find(m=>m.officerId===musterOfficer)?.troops??(v.officers[musterOfficer]?.allowedTroops??[]).map(t=>({troopType:t,troopDisplayName:t}));
  if(!troops.some(t=>t.troopType===musterTroop&&!t.blockedReason))musterTroop=troops.find(t=>!t.blockedReason)?.troopType??null;
  const armies=Object.values(v.ownArmies).filter(a=>{const [q,r]=a.tileId.split(',').map(Number),[cq,cr]=c.tileId.split(',').map(Number);return Math.max(Math.abs(q-cq),Math.abs(r-cr),Math.abs(q+r-cq-cr))<=2&&a.troopCount>0;});
  const troop=troops.find(t=>t.troopType===musterTroop),opts=(items,id,label)=>`<label>${label}<select id="${id}">${items}</select></label>`;
  const selectors=available.length?opts(available.map(o=>`<option value="${esc(o.officerId)}" ${musterOfficer===o.officerId?'selected':''}>${esc(o.name)}</option>`).join(''),'muster-officer','출진 장수')+opts(troops.map(t=>`<option value="${esc(t.troopType)}" ${musterTroop===t.troopType?'selected':''} ${t.blockedReason?'disabled':''}>${esc(t.troopDisplayName??t.troopType)}${t.blockedReason?' · '+esc(reasonText(t.blockedReason)):''}</option>`).join(''),'muster-troop','병종'):'';
  const reorganize=armies.length?opts(armies.map(a=>`<option value="${esc(a.armyId)}">${esc(v.officers[a.commanderId]?.name??'')}</option>`).join(''),'reorganize-army','재편 부대')+opts((v.officers[armies[0]?.commanderId]?.allowedTroops??[]).map(t=>`<option value="${esc(t)}">${esc(({militia:'도검병',spear:'창병',bow:'궁병',cavalry:'기병'})[t]??t)}</option>`).join(''),'reorganize-troop','병종'):'';
  const jobs=(c.jobs??[]).map(j=>`<button class="sm-tile sm-tile--job${c.currentProduction?.kind===j.kind?' is-picked':''}" data-job="${esc(j.kind)}" ${inputLocked()||j.blockedReason||j.kind==='muster'&&(!musterOfficer||!musterTroop)||j.kind==='reorganize'&&!armies.length?'disabled':''} title="${esc(j.blockedReason?reasonText(j.blockedReason):j.description??'')}">${medal(icon('job-'+j.kind,esc(j.name?.[0]??'工')))}<span>${esc(j.name)}</span><small class="ss-num">${fmt(c.jobProgress?.[j.kind]??(j.kind==='reorganize'?c.productionProgress:0))}/${fmt(j.cost)}</small></button>`).join('');
  return `<div class="sm-card"><img class="sm-card__art" src="${A4}tag-tall.webp" alt=""><span class="sm-card__thumb">${art}</span><header class="sm-card__title"><b>${esc(c.name)}</b><span>우리 성</span><i class="sm-dot${badge?.idle?'':' is-done'}" title="${badge?.idle?'생산을 고르지 않음':'생산 중'}"></i></header>
   <ul class="sm-stats"><li>${icon('food','糧')}<span>식량</span><b class="ss-num">${fmt(c.foodStock)}</b></li><li>${icon('reserve','兵')}<span>예비병</span><b class="ss-num">${fmt(c.reserveTroops)}</b></li><li>${icon('production','工')}<span>생산</span><b>${badge?.name?`${esc(badge.name)} <small>${badge.turns}턴</small>`:'고르지 않음'}</b></li></ul>
   <div class="sm-tiles sm-tiles--one">${button('놓기','close',{key:'Esc'})}</div></div><div class="sm-commands sm-city-jobs"><div class="sm-selects">${selectors}</div>${troop?.effectLine?`<p class="ss-reason">${esc(troop.effectLine)}${troop.costLine?' · '+esc(troop.costLine):''}</p>`:''}<div class="sm-tiles">${jobs}</div>${reorganize?`<div class="sm-selects">${reorganize}</div>`:''}${(c.domesticCommands??[]).map((d,i)=>`<button class="ss-btn" data-domestic="${i}" ${inputLocked()||d.blockedReason?'disabled':''} title="${esc(d.blockedReason?reasonText(d.blockedReason):d.description??'')}">${esc(d.label)} ${Number.isFinite(d.cost)?fmt(d.cost):''}</button>`).join('')}</div>`;
 }
 function render(combat=null){if(disposed)return;const s=state(),v=view(s),sum=k=>Object.values(v.ownCities).reduce((n,c)=>n+(c[k]??0),0);
  stage.dataset.turn=String(s.turn);stage.dataset.phase=s.phase;stage.dataset.selected=selectedArmyId??selectedCityId??'';
  $('.sm-resources').innerHTML=`<span class="ss-wadang" title="${esc(v.faction.name??FACTION[s.playerFactionId]?.name??'')}">${esc(FACTION[s.playerFactionId]?.glyph??'')}</span>${[['식량','food','糧',sum('foodStock')],['생산','production','工',sum('production')],['과학','science','學',v.research?.science??sum('science')],['인망','prestige','望',v.faction.prestige],['병력','troops','兵',Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0)],['예비','reserve','備',sum('reserveTroops')]].map(([k,id,g,n])=>`<span title="${k} ${fmt(n)}">${icon(id,g)}<b class="ss-num">${fmt(n)}</b></span>`).join('')}`;
  $('#save').disabled=s.phase==='AI';
  // world.js가 쓰는 v3 renderWorldDial의 계절 표시 계산.
  const season=['봄','여름','가을','겨울'][Math.floor(Math.max(0,s.turn-1)%36/9)];
  $('.sm-date').textContent=`${campaignDate(s.turn)} · ${season} · 남은 ${Math.max(0,CAMPAIGN_TURN_LIMIT-s.turn+1)}턴`;
  const councilOpen=s.council?.status==='OPEN'&&s.council.turn===s.turn;
  const tasks=decisionTasks(s),taskRows=(councilOpen?`<button class="sm-task" data-council title="평정이 열렸다">${medal(icon('notice-board','議'))}<span>평정이 열렸다</span></button>`:'')+tasks.map(t=>`<button class="sm-task" data-task="${esc(t.id)}" title="${esc(t.label)}">${medal(icon(TASK_ICON[t.id]??'notice-board',esc(t.label?.[0]??'!')))}<span>${esc(t.label)}</span></button>`).join('');
  $('.sm-tasks').innerHTML=taskRows?`<header class="sm-panel__title"><b>처리할 일</b><i class="sm-dot"></i></header>${taskRows}`:'';$('.sm-tasks').hidden=!taskRows;
  if(councilOpen&&newsKey!==s.turn){newsKey=s.turn;news('평정이 열렸다');}
  const progress=[];
  for(const [id,o] of Object.entries(s.moveOrders??{})){const a=v.ownArmies[id];if(a)progress.push({label:`행군 · ${v.officers[a.commanderId]?.name??''}`,detail:o.destinationTileId,army:id,icon:'move'});}
  for(const a of Object.values(v.ownArmies))if(attackTargets(s,a.armyId).length)progress.push({label:`교전 · ${v.officers[a.commanderId]?.name??''}`,army:a.armyId,icon:'attack'});
  for(const c of Object.values({...v.knowledge.cities,...v.ownCities}))if(c.besieged)progress.push({label:`포위 · ${c.name}`,city:c.cityId,icon:'k-attack'});
  for(const p of v.exploration?.places??[])if(p.status==='INVESTIGATING'||p.status==='PENDING')progress.push({label:`파견 · ${p.label}`,icon:'k-explore'});
  for(const r of s.council?.resolutions??[])if(r.status==='ACTIVE')progress.push({label:s.council.proposals.find(p=>p.id===r.proposalId)?.what??s.officers[r.proposerId]?.name??'',detail:`${campaignDate(r.deadlineTurn)}까지`,army:r.target.armyId,city:r.target.armyId?null:r.target.cityId,icon:COUNCIL_ICON[r.kind]});
  $('.sm-progress ol').innerHTML=progress.map(p=>`<li><button class="sm-prog" ${p.army?`data-select-army="${esc(p.army)}"`:p.city?`data-select-city="${esc(p.city)}"`:''}>${icon(p.icon??'',esc(p.label.trim()[0]??'·'))}<b>${esc(p.label)}</b>${p.detail?`<small>${esc(p.detail)}</small>`:''}</button></li>`).join('');$('.sm-progress').hidden=!progress.length;
  $('.sm-selection').innerHTML=selectedArmyId?unitCard(v):selectedCityId?cityCard(v):'';
  $('.sm-modes').innerHTML=V3_MODES.map(m=>`<button class="sm-round${v3Mode()===m.id?' is-picked':''}" data-mode="${m.id}" aria-pressed="${v3Mode()===m.id}" title="${esc(m.name)} — ${esc(m.tip)}" aria-label="${esc(m.name)}">${medal(icon(MODE_ICON[m.id]??m.id,MODE_GLYPH[m.id]??esc(m.name[0])))}</button>`).join('')+`<button class="sm-round" data-far title="멀리 보기" aria-label="멀리 보기">${medal(icon('zoom','遠'))}</button>`;
  const remaining=remainingArmies(v),idle=idleCities(v),next=remaining.length||idle.length;$('#next-label').textContent=next?'다음 할 일':'턴 종료';$('#next-task').title=next?'남은 부대 → 생산 안 고른 성':'턴 종료';$('#next-task').setAttribute('aria-label',next?'다음 할 일':'턴 종료');$('#next-task').disabled=inputLocked();
  $('.sm-advisor').textContent=(s.turn-1)%3!==0?s.council?.advisorLine??'':'';
  drawMap(v,combat);panel.sync();
  for(const n of [$('.sm-top'),$('.sm-tasks'),$('.sm-progress'),$('.sm-selection'),$('.sm-modes'),$('.sm-next'),viewport])n.inert=panel.isOpen;
 }
 // world.js 에서 옮김: drawMap (공개 view만 지도 모델에 전달)
 function drawMap(v,combat){const s=state(),options=selectedArmyId&&!inputLocked()?campaignMoveOptions(s,selectedArmyId):[],portraits=Object.fromEntries(Object.keys(v.officers).map(id=>[id,{path:ctx.face(id)}]));
  const model=campaignMapModel(v,{selectedArmyId,movedArmyIds:Object.values(v.ownArmies).filter(a=>armyActionEnded(s,a.armyId)||s.movedArmyIds.includes(a.armyId)).map(a=>a.armyId),moveOptions:mode==='move'?options:[],destination,portraits});
  model.highlights.orders=orderHighlights(s,selectedArmyId?[selectedArmyId]:[]);
  const targetIds=selectedArmyId&&!inputLocked()?tacticId?campaignTactics(s,selectedArmyId).find(c=>c.traitId===tacticId)?.targets??[]:attackTargets(s,selectedArmyId):[];
  model.highlights.attack=[...targetIds.map(id=>s.armies[id]?.tileId).filter(Boolean),...(selectedArmyId&&!inputLocked()?cityAttackTargets(s,selectedArmyId).map(id=>s.cities[id].tileId):[])];
  if(mode==='face'&&selectedArmyId){const [q,r]=s.armies[selectedArmyId].tileId.split(',').map(Number);model.highlights.move=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([dq,dr])=>`${q+dq},${r+dr}`).filter(id=>s.tiles[id]);}
  for(const u of model.units){const a=v.ownArmies[u.id];if(a){u.braced=!!a.braced;u.faceLeft=[2,3,4].includes(a.facing);}if(combat){const hit=combat.units?.find(x=>x.unitId===u.id);if(hit)u.prevCount=hit.preBattleCount;}}
  model.places=model.places?.map(p=>({...p,...(v.exploration?.places??[]).find(x=>x.placeId===p.label)}));v3ModeHighlights(v,model,s);
  const left=viewport.scrollLeft,top=viewport.scrollTop;map.innerHTML=renderWorldMap(model,{size:30,margin:92,cityBadges:Object.fromEntries(Object.values(v.ownCities).map(c=>[c.cityId,cityProductionBadge(c)]).filter(([,b])=>b)),...v3MapOptions(),mapArt:WALL_MAP,relations:v3Relations(v)});
  applyZoom();animateUnits(map,{duration:reduced?0:420});viewport.scrollLeft=left;viewport.scrollTop=top;
  // 미관측 병력은 숫자가 아니라 '?'로 표시(world.js markUnknownCounts).
  for(const u of model.units)if(!Number.isFinite(u.count)){const n=map.querySelector(`[data-unit="${CSS.escape(u.id)}"] .count text`);if(n)n.textContent='?';}
  requestAnimationFrame(updateLamp);
 }
 // world.js 에서 옮김: applyZoom / zoomScroll / zoomAt / follow / centerPlayer
 function applyZoom(){const svg=map.querySelector('svg');if(!svg)return;const vb=svg.viewBox.baseVal;svg.style.width=vb.width*zoom+'px';svg.style.height=vb.height*zoom+'px';}
 function zoomAt(value,x,y){const vb=map.querySelector('svg')?.viewBox.baseVal;if(!vb)return;const fit=Math.min(viewport.clientWidth/vb.width,viewport.clientHeight/vb.height),next=Math.max(Math.min(.5,fit),Math.min(2.6,value)),from=zoom,left=viewport.scrollLeft,top=viewport.scrollTop;zoom=next;applyZoom();viewport.scrollLeft=(left+x)*next/from-x;viewport.scrollTop=(top+y)*next/from-y;updateLamp();}
 function anchor(){if(selectedArmyId)return map.querySelector(`g[data-unit="${CSS.escape(selectedArmyId)}"][data-x]`);const id=selectedCityId??view(state()).faction.capitalCityId??Object.values(view(state()).ownCities)[0]?.cityId;return id?map.querySelector(`g[data-city="${CSS.escape(id)}"]`):null;}
 function follow(){const n=anchor();if(!n)return;const r=n.getBoundingClientRect(),v=viewport.getBoundingClientRect();viewport.scrollLeft+=r.x+r.width/2-v.x-v.width*.5;viewport.scrollTop+=r.y+r.height/2-v.y-v.height*.42;updateLamp();}
 function updateLamp(){if(disposed)return;const r=anchor()?.getBoundingClientRect(),b=stage.getBoundingClientRect();if(r){stage.style.setProperty('--lamp-x',`${r.x+r.width/2-b.x}px`);stage.style.setProperty('--lamp-y',`${r.y+r.height/2-b.y}px`);}}
 // world.js 에서 옮김: mapClick (도시 무대·장수 명부 진입 제외)
 function mapClick(e){if(inputLocked()||panel.isOpen)return;const s=state(),v=view(s),tileId=targetTile(e.target,s.armies,s.cities);if(!tileId)return;
  const own=Object.values(v.ownArmies),unit=e.target.closest('[data-unit]')?.dataset.unit,id=own.some(a=>a.armyId===unit)?unit:cycleTileUnit(own,tileId,selectedArmyId),cityId=Object.values({...v.knowledge.cities,...v.ownCities}).find(c=>c.tileId===tileId)?.cityId;
  if(mode==='face'&&selectedArmyId){const a=s.armies[selectedArmyId];if(tileId!==a.tileId)command({type:'FACE',armyId:selectedArmyId,facing:directionToward(s.tiles[a.tileId],s.tiles[tileId],a.facing)});return;}
  if(tacticId&&selectedArmyId){const c=campaignTactics(s,selectedArmyId).find(c=>c.traitId===tacticId),target=c?.targets.find(id=>s.armies[id]?.tileId===tileId);if(target)command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:tacticId,targetId:target});return;}
  if(selectedArmyId){const enemy=attackTargets(s,selectedArmyId).find(id=>s.armies[id].tileId===tileId);if(enemy){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:enemy});return;}
   if(cityId&&mode==='attack'&&cityAttackTargets(s,selectedArmyId).includes(cityId)){command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId});return;}
   if(mode==='move'&&orderRoute(s,selectedArmyId,tileId)){command({type:'QUEUE_MOVE',armyIds:[selectedArmyId],destinationTileId:tileId});return;}}
  if(e.target.closest('[data-city]')&&cityId){selectCity(cityId);return;}if(id){selectArmy(id);return;}if(cityId){selectCity(cityId);return;}
 }
 // world.js 에서 옮김: forecastHtml / placeTip (커서 옆 공개 예측)
 function forecast(e){const tip=$('.sm-forecast');if(inputLocked()||!selectedArmyId||pan){tip.hidden=true;return;}const s=state(),tile=targetTile(e.target,s.armies,s.cities),unit=attackTargets(s,selectedArmyId).find(id=>s.armies[id].tileId===tile),city=cityAttackTargets(s,selectedArmyId).find(id=>s.cities[id].tileId===tile);let p=null,label='';
  if(tacticId){const c=campaignTactics(s,selectedArmyId).find(c=>c.traitId===tacticId),target=c?.targets.find(id=>s.armies[id]?.tileId===tile);if(target){p=previewTactic(s,selectedArmyId,tacticId,target);label=c.name;}}
  else if(unit){p=previewAttack(s,selectedArmyId,unit);label=s.officers[s.armies[unit].commanderId]?.name??'';}else if(city){p=previewCityAttack(s,selectedArmyId,city);label=view(s).knowledge.cities[city]?.name??'';}
  if(!p){tip.hidden=true;return;}tip.innerHTML=`<b>${esc(label)}</b>${p.effectOnly?'':`<p class="ss-num">아군 −${fmt(p.allyLoss)} / 적 −${fmt(p.enemyLoss)}</p>`}${(p.effectLines??[]).map(t=>`<p>${esc(t)}</p>`).join('')}`;tip.hidden=false;const gap=32,w=tip.offsetWidth,h=tip.offsetHeight;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,e.clientX+gap))+'px';tip.style.top=Math.max(56,Math.min(innerHeight-h-8,e.clientY+16))+'px';
 }
 root.addEventListener('click',onClick);
 function onClick(e){const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.id==='save'){ctx.save();return;}if(b.hasAttribute('data-load')){ctx.home();return;}
  if(b.hasAttribute('data-council')){if(!inputLocked())ctx.council();return;}
  if(b.dataset.task){panel.open(b.dataset.task);renderInert();return;}
  if(b.dataset.selectArmy){selectArmy(b.dataset.selectArmy,true);return;}if(b.dataset.selectCity){selectCity(b.dataset.selectCity,true);return;}
  if(b.id==='next-task'){nextTask(e.shiftKey);return;}if(b.dataset.mode){setV3Mode(b.dataset.mode);render();return;}if(b.hasAttribute('data-far')){const vb=map.querySelector('svg')?.viewBox.baseVal;if(vb)zoomAt(Math.min(viewport.clientWidth/vb.width,viewport.clientHeight/vb.height),viewport.clientWidth/2,viewport.clientHeight/2);return;}
  if(inputLocked()||panel.isOpen)return;
  if(b.dataset.tactic){const c=campaignTactics(state(),selectedArmyId).find(c=>c.traitId===b.dataset.tactic);if(c.targets.length===1&&c.targets[0]===selectedArmyId){command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:c.traitId,targetId:selectedArmyId});return;}tacticId=c.traitId;mode=null;render();return;}
  if(b.dataset.command){const act=b.dataset.command;if(act==='close'){selectedArmyId=null;selectedCityId=null;mode=null;render();return;}if(['move','attack','face'].includes(act)){mode=act;tacticId=null;render();return;}const type={brace:'BRACE',regroup:'REGROUP',wait:'WAIT_UNIT',garrison:'GARRISON',hub:'BUILD_HUB',recall:'RECALL_UNIT',star:'STAR_ACTION','cancel-order':'CANCEL_MOVE'}[act];if(type)command({type,armyId:selectedArmyId});return;}
  if(b.dataset.job){const kind=b.dataset.job;command({type:'CITY_JOB',cityId:selectedCityId,kind,...(kind==='muster'?{officerId:musterOfficer,troopType:musterTroop}:kind==='reorganize'?{armyId:$('#reorganize-army')?.value,troopType:$('#reorganize-troop')?.value}:{})});return;}
  if(b.dataset.domestic!==undefined){const d=view(state()).ownCities[selectedCityId]?.domesticCommands[Number(b.dataset.domestic)];if(d)command({type:d.type,cityId:selectedCityId,...(d.resource?{resource:d.resource}:{}),...(d.officerId?{officerId:d.officerId}:{})});}
 }
 function renderInert(){for(const n of [$('.sm-top'),$('.sm-tasks'),$('.sm-progress'),$('.sm-selection'),$('.sm-modes'),$('.sm-next'),viewport])n.inert=panel.isOpen;}
 const inertObserver=new MutationObserver(renderInert);inertObserver.observe($('.sm-overlay'),{attributes:true,attributeFilter:['hidden']});
 const change=e=>{if(e.target.id==='muster-officer'){musterOfficer=e.target.value;musterTroop=null;render();}if(e.target.id==='muster-troop'){musterTroop=e.target.value;render();}if(e.target.id==='reorganize-army'){const a=view(state()).ownArmies[e.target.value];$('#reorganize-troop').innerHTML=(view(state()).officers[a.commanderId]?.allowedTroops??[]).map(t=>`<option value="${t}">${esc(({militia:'도검병',spear:'창병',bow:'궁병',cavalry:'기병'})[t]??t)}</option>`).join('');}};
 root.addEventListener('change',change);
 map.onclick=e=>{if(suppressClick){suppressClick=false;return;}mapClick(e);};map.onpointermove=forecast;map.onpointerleave=()=>$('.sm-forecast').hidden=true;
 viewport.onwheel=e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX-r.x,e.clientY-r.y);};
 viewport.onpointerdown=e=>{if(e.button!==0||panel.isOpen)return;pan={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false,id:e.pointerId};};
 viewport.onpointermove=e=>{if(!pan)return;const dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(Math.hypot(dx,dy)>8){pan.moved=true;viewport.setPointerCapture(e.pointerId);viewport.scrollLeft=pan.left-dx;viewport.scrollTop=pan.top-dy;updateLamp();}};
 viewport.onpointerup=e=>{if(!pan)return;suppressClick=pan.moved;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);pan=null;};viewport.onpointercancel=()=>pan=null;viewport.onscroll=updateLamp;
 document.onkeydown=e=>{if(disposed||panel.isOpen||e.target.closest('input,select,textarea'))return;if(e.key==='Escape'){selectedArmyId=null;selectedCityId=null;mode=null;tacticId=null;render();return;}if(e.code==='Space'||e.key==='Enter'){e.preventDefault();nextTask(e.shiftKey);return;}const act=Object.entries(KEYS).find(([,k])=>k===e.key.toUpperCase())?.[0];if(act){e.preventDefault();$(`[data-command="${act}"]`)?.click();return;}if(/^[1-3]$/.test(e.key))$('.sm-selection')?.querySelectorAll('[data-tactic]')[Number(e.key)-1]?.click();};
 const resize=()=>updateLamp();window.addEventListener('resize',resize);
 render();follow();scheduleAi();loadV3Manifest().then(()=>{if(!disposed){render();follow();}});
  return ()=>{disposed=true;clearTimeout(aiTimer);clearTimeout(orderTimer);clearTimeout(newsTimer);clearTimeout(combatTimer);inertObserver.disconnect();root.removeEventListener('click',onClick);root.removeEventListener('change',change);window.removeEventListener('resize',resize);document.onkeydown=null;};
}

// world.js 에서 옮김: ERROR_TEXT / reasonText / errorText
const ERROR_TEXT={C26_COMMAND_UNAVAILABLE:'지금은 이 내정 명령을 쓸 수 없습니다.',INVALID_C26_CITY:'우리 성에서만 쓸 수 있습니다.',INVALID_ORDER_UNITS:'이미 움직였거나 행동을 마친 부대에는 이동 명령을 줄 수 없습니다.',INVALID_ORDER_DESTINATION:'갈 수 없는 칸입니다.',INVALID_CAMPAIGN_ATTACK:'지금 공격할 수 없는 대상입니다.',INVALID_CAMPAIGN_CITY_ATTACK:'지금 이 성은 공격할 수 없습니다.',INVALID_CAMPAIGN_FACE:'이동하기 전에만 정면을 돌릴 수 있습니다.',INVALID_MUSTER_OFFICER_OR_TROOP:'출진할 장수와 병종을 확인하세요.',MUSTER_RESERVE_200_REQUIRED:'예비병이 200명 이상 있어야 출진할 수 있습니다.',INVALID_WANDERER_RECRUITMENT:'지금은 등용할 수 없습니다(이미 협의 중이거나 성의 주인이 아님).',INVALID_GARRISON:'적과 붙어 있지 않은 상태로 자기 성 중심에 있어야 주둔할 수 있습니다.',MAIN_ACTION_USED:'이번 턴 행동을 이미 썼습니다.',EVENT_PENDING:'사건 카드를 먼저 정하세요.',UNIQUE_FACILITY_LIMIT:'고유 시설은 도시당 1개입니다.',UNIQUE_FACILITY_LOCKED:'다른 세력의 고유 시설입니다.',NO_DAMAGED_FACILITY:'손상된 시설이 없습니다.',MINOR_CITY_NO_FACILITIES:'작은 성에는 지을 수 없습니다.',STAR_COOLDOWN:'재사용 대기 중입니다.',STAR_UNAVAILABLE:'패주 중이라 쓸 수 없습니다.',STAR_OCCUPIED:'점령 처리 중인 성입니다.'};
const reasonText=code=>code?(/[가-힣]/.test(code)?code:ERROR_TEXT[code]??'조건 미충족'):'';
const TROOP_LABEL={militia:'보병',spear:'창병',bow:'궁병',cavalry:'기병',engineer:'공병',mystic:'술법'};
const statLine=o=>o?.baseStats?`지휘 ${o.baseStats.leadership} · 무용 ${o.baseStats.might} · 지략 ${o.baseStats.intelligence}`:'';
const errorText=e=>{const m=String(e?.message??e);if(/^[A-Z0-9_]+$/.test(m)){console.warn(m);return ERROR_TEXT[m]??'지금은 할 수 없는 명령입니다.';}return m;};
