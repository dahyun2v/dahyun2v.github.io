// 천하재결 새 화면 컨트롤러(UI v3, 2026-10-08) — 게임 흐름 로직은 옛 campaign.js 에서 갈라 왔고, 보이는 것(마크업·지도·아이콘)은 새로 쓴다.
// 옛 화면(/campaign)은 그대로 둔다. 지도: /app/world/map-v3.mjs, 스타일: /app/world/world.css
import {orderEligible,orderRoute,routeTurns,orderHighlights,queuedOrderUnit} from '/src/campaign-orders.mjs';
import {selectionRect,rectangleSelection,toggleSelection,cycleTileUnit,targetTile} from '/src/campaign-select.mjs';
import {campaignTactics,officerEffectCards,tacticIsDamage,cardEffectPending,recallReason,hasCampaignRule,canMainAction,strengthenedValue} from '/src/campaign-effects.mjs';
import {regroupReason,campaignPath,campaignReachable} from '/src/campaign-morale.mjs';
import {TICKS_PER_TURN} from '/src/first3.mjs';
import {cityAttackTargets,previewCityAttack,previewTactic,attackTargets,previewAttack,previewDisengage,previewApproachFire,armyActionEnded,attackRange,campaignUnitRatings} from '/src/campaign-combat.mjs';
import {createCampaignCombatAudio} from '/src/campaign-combat-audio.mjs';
import {createCampaign, view, step, serialize, deserialize, CAMPAIGN_SAVE_KEY,campaignMoveOptions,CAMPAIGN_TURN_LIMIT} from '/src/campaign-runtime.mjs';
import {hexDistance} from '/src/map-primitives.mjs'; // 굶는 부대 안내(starvingAdvice)가 쓰는데 빠져 있어, 굶는 부대를 고르면 화면 오류가 났다(C132 · 2026-10-12 자동 플레이에서 발견)
import {archerAttackReason} from '/src/campaign-combat.mjs';
import {diplomacyAttackReason,diplomacyMoveReason} from '/src/campaign-diplomacy.mjs';
import {campaignHorizonText,noFieldArmyText,commandIntentText,tacticChangeText,resultReasonText,growthUseText,unfieldedOfficerNames,uncoveredShift,turnNews,overlapSelection} from '/app/world/hud-ink.mjs'; // C137 · C138
import {statsToOfficerPack,troopToCampaign} from '/src/campaign-adapters.mjs';
import {saveText,loadText,settle,saveMarkerKey} from '/src/save-store.mjs';
import {campaignSubAbility,directionToward} from '/src/campaign-abilities.mjs';
import {SPECIAL_TROOPS} from '/src/campaign-special-troops.mjs';
import {securityLabel,CITY_JOBS,cityEconomyRates,cityOccupationStatus,cityJobReason,cityJobCost} from '/src/campaign-economy.mjs';
import {DOMESTIC_RULES,COMBAT_TITLE_RULES,C33_POOL,domesticFoodAvailable,uniqueProgress,campaignShownScale} from '/src/campaign-rule-registry.mjs';
import {CAMPAIGN_RULES} from '/src/campaign-effects.mjs';
import {c31Muster} from '/src/campaign-events.mjs';
import {occupationDisplay,occupationMethodReason,OCCUPATION_METHODS} from '/src/campaign-occupation.mjs';
import {campaignCaptives,captiveRecruitmentReason} from '/src/campaign-captives.mjs';
import {UNIQUE_OFFICERS} from '/src/campaign-rule-registry.mjs';
import {cityRecruitCost} from '/src/campaign-policy.mjs';
import {c29CoreCard,c29CoreFactor} from '/src/campaign-c29.mjs';
import {c29BindingTargets} from '/src/campaign-c29.mjs';
import {xpToNextLevel} from '/src/growth-progress.mjs';
import {pendingCampaignDraft,needsTraitResolution,tacticLoadoutReason,CAMPAIGN_RARITY_NAMES,resolveTraitSpace,CAMPAIGN_TRAIT_SLOTS,CAMPAIGN_TACTIC_SLOTS} from '/src/campaign-growth.mjs';

import {renderWorldMap,animateUnits,FACTION} from '/app/world/map-v3.mjs';
import {cutout} from '/app/world/cutout.mjs';
import {createUiSfx} from '/app/world/ui-sfx.mjs';
import {C22_EVENTS} from '/src/campaign-events.mjs';
import {BUILDINGS,cityPeople,cityIssues,loadStageArt,overviewHtml,facilityHtml,cityFile} from '/app/world/city-stage.mjs';
import {mountInkHud,renderInkHud,shownTroopForecast,surpriseWarning,productionReadout,observedReinforcementLines,starvationLines,injuryReturnText,recruitmentLeadsHtml,foodSnapshot,foodTransition,combatReadout,garrisonResult,facilityCompletionLines,readableText,readableError,labelNumber,cardNumericText,clickTargetDecision,targetPreviewText,unitActionReadout} from '/app/world/hud-ink.mjs';
import {v3Asset,loadV3Manifest,v3MapOptions,v3ModeHighlights,v3Relations,setV3Mode,v3Mode,renderWorldDial,renderAdvisor,renderModeRail,resourceIcon,factionEmblem} from '/app/design/v3-ui.mjs';
const FACTION_STYLE=Object.fromEntries(Object.entries(FACTION).map(([k,v])=>[k,{...v,soft:v.color}]));
// 세력 표지: 그림 메달이 있으면 그림, 없으면 마름모 안 한 글자
const emblemHtml=(fid,cls='')=>{const src=factionEmblem(fid),s=FACTION[fid]??{color:'#76776f',glyph:'中'};return src?`<img class="emblem-art ${cls}" src="${src}" alt="">`:`<span class="crest ${cls}" style="--fc:${s.color}"><i>${s.glyph}</i></span>`;};
// 화면 테마: 기본 청록산수(qinglu). ?theme=classic 으로 예전 담채 지도 — 고른 값은 기억한다.
const THEME='v3';
// C135: developer links are opt-in.
for(const link of document.querySelectorAll('[data-dev-only]'))link.hidden=new URLSearchParams(location.search).get('dev')!=='1';
import {campaignMapModel,campaignDate} from '/src/campaign-map-model.mjs';
import {escapeUi as esc} from '/src/shared-ui.mjs';
import {createCampaignActionAudio} from '/src/campaign-action-audio.mjs';
import {createSettlementAudio} from '/src/settlement-audio.mjs';
import {createPilotAudio} from '/src/pilot-audio.mjs';
import {relation,relationCityOfficers,socialReason,RELATIONS} from '/src/campaign-relations.mjs';
import {renderCouncilWorld,councilPending,councilEscape} from '/app/world/council-world.mjs';
import {openOfficerDraft} from '/app/world/officer-draft-ui.mjs';
import {showClash} from '/app/world/clash-scene.mjs';
import {garrisonReason,musterReason} from '/src/campaign-roster.mjs';
import {hubBuildReason} from '/src/campaign-supply.mjs';
// 흑묵 그래픽 노블 스킨(2026-10-10, 스타일 바이블 v2) — ?skin=v3 으로 이전 겉모습
try{if(new URLSearchParams(location.search).get('skin')!=='v3'){document.body?.classList?.add('ink');
 // 먹 선 흔들림 필터(영토 선 등) — ink-skin.css 의 filter:url(#ink-rough)
 document.body?.insertAdjacentHTML?.('beforeend','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></svg>');}}catch{}
let achPick=null,visitTalks=null,feastPick=[],feastCity=null,visitScene=null; // C38 친목: 저택 대화 초안(visit-talks)·주점 술자리 고른 장수·열린 대화
let crisisData=null,crisisSeen=new Set(),bondsData=null,hoverSide=null,dangerMode=false,lastActedArmy=null,dangerCache=null,memoryLines={},artCatalog=null,portraits={},menuOpen=false,moveMode=false,faceMode=false,destination=null,soundSequence=0,audioGesture=false;
// 엔진 오류 코드를 플레이어 문장으로(코드는 콘솔에만)
const ERROR_TEXT={C26_COMMAND_UNAVAILABLE:'지금은 이 내정 명령을 쓸 수 없습니다.',INVALID_C26_CITY:'우리 성에서만 쓸 수 있습니다.',INVALID_ORDER_UNITS:'이미 움직였거나 행동을 마친 부대에는 이동 명령을 줄 수 없습니다.',INVALID_ORDER_DESTINATION:'갈 수 없는 칸입니다.',INVALID_CAMPAIGN_ATTACK:'지금 공격할 수 없는 대상입니다.',INVALID_CAMPAIGN_CITY_ATTACK:'지금 이 성은 공격할 수 없습니다.',INVALID_CAMPAIGN_FACE:'이동하기 전에만 정면을 돌릴 수 있습니다.',INVALID_MUSTER_OFFICER_OR_TROOP:'출진할 장수와 병종을 확인하세요.',MUSTER_RESERVE_200_REQUIRED:'예비병이 200명 이상 있어야 출진할 수 있습니다.',INVALID_WANDERER_RECRUITMENT:'지금은 등용할 수 없습니다(이미 협의 중이거나 성의 주인이 아님).',INVALID_GARRISON:'적과 붙어 있지 않은 상태로 자기 성 중심에 있어야 주둔할 수 있습니다.',MAIN_ACTION_USED:'이번 턴 행동을 이미 썼습니다.',EVENT_PENDING:'사건 카드를 먼저 정하세요.',UNIQUE_FACILITY_LIMIT:'고유 시설은 도시당 1개입니다.',UNIQUE_FACILITY_LOCKED:'다른 세력의 고유 시설입니다.',NO_DAMAGED_FACILITY:'손상된 시설이 없습니다.',MINOR_CITY_NO_FACILITIES:'작은 성에는 지을 수 없습니다.',STAR_COOLDOWN:'재사용 대기 중입니다.',STAR_UNAVAILABLE:'패주 중이라 쓸 수 없습니다.',STAR_OCCUPIED:'점령 처리 중인 성입니다.'};
const reasonText=code=>code?(/^MUSTER_RESERVE_(\d+)_REQUIRED$/.test(code)?`예비병 ${code.match(/\d+/)[0]}명 이상 필요`:/[가-힣]/.test(code)?code:ERROR_TEXT[code]??'조건 미충족'):'';
// engineer · mystic: 옛 초기 자료(조조 · 순욱 · 제갈량 · 주유)에 남은 이름 — 병종은 넷뿐이고 엔진에서는 각각 근접보병 · 원거리보병으로 돈다. 영문이 그대로 보이지 않게 그 이름으로 읽는다(닷토리 새 판 13회차 'engineer 영문')
const TROOP_LABEL={militia:'도검병',spear:'창병',bow:'궁병',cavalry:'기병',catapult:'투석기',engineer:'도검병',mystic:'궁병'};
const statLine=o=>o?.baseStats?`지휘 ${o.baseStats.leadership} · 무용 ${o.baseStats.might} · 지략 ${o.baseStats.intelligence}`:'';
ERROR_TEXT.INVALID_CAMPAIGN_TACTIC='닿지 않습니다 — 더 다가가야 합니다';
ERROR_TEXT.INVALID_CAMPAIGN_CITY_ATTACK='수비대가 성을 지키고 있습니다 — 먼저 수비대를 물리쳐야 합니다';
const errorText=e=>readableError(e,ERROR_TEXT);
const OFFICER_LABELS=Object.fromEntries(UNIQUE_OFFICERS.map(o=>[o.id,o.name]));
const RULE_LABELS=Object.fromEntries(UNIQUE_OFFICERS.flatMap(o=>[o.uniqueTrait,o.signatureTactic].filter(Boolean).flatMap(c=>(c.effects??[]).filter(e=>e.rule).map(e=>[e.rule,c.name]))));
const playerText=value=>readableText(value,OFFICER_LABELS,RULE_LABELS);
const HAN_LABELS={略圖:'작은 지도',槍:'창병',弓:'궁병',步:'도검병',騎:'기병',常:'일반',凡:'일반',良:'고급',傑:'영웅',亂:'흐트러짐',搖:'동요',惑:'혼란',潰:'패주',崩:'붕괴',守:'방어',昂:'고무',遲:'둔화',縛:'발 묶임',査:'조사',已:'완료',史:'사적',傳:'전적',像:'상적',夢:'몽적',存:'저장',讀:'불러',規:'규칙',聲:'소리',默:'소리'};
Object.assign(HAN_LABELS,{秀:'영웅',神:'신화',政:'정무',魅:'감화',武:'무용',智:'지략',統:'지휘'});
function readableLabelNode(node){
 if(node.nodeType===3){const parent=node.parentElement;if(!parent||parent.closest('script,style,.seal,.crest,.emblem,.wc-seal,.od-seal,[aria-hidden="true"]'))return;
  const text=playerText(node.nodeValue),label=HAN_LABELS[text.trim()],next=label??text;
  if(next!==node.nodeValue){node.nodeValue=next;if(label&&parent.tagName?.toLowerCase()==='text'){parent.style.fontSize='7px';if(parent.parentElement?.classList.contains('badge')){const rect=parent.parentElement.querySelector('rect');if(rect){rect.setAttribute('x',String(-Math.max(7,label.length*3.6)));rect.setAttribute('width',String(Math.max(14,label.length*7.2)));}}}}return;}
 if(node.nodeType!==1)return;
 if(node.hasAttribute('title')){const old=node.getAttribute('title'),next=playerText(old);if(next!==old)node.setAttribute('title',next);}
 for(const child of node.childNodes)readableLabelNode(child);
}
if(globalThis.MutationObserver&&document.body){
 const labels=new MutationObserver(records=>{for(const r of records){if(r.type==='childList')for(const n of r.addedNodes)readableLabelNode(n);else readableLabelNode(r.target);}});
 labels.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title']});
 readableLabelNode(document.body);
}
function wandererReason(officerId,cityId){
 if(Object.values(state.captiveRecruitment?.proposals??{}).some(p=>p.targetOfficerId===officerId&&p.status==='NEGOTIATING'))return '이미 협의 중입니다';
 if(inputLocked())return '지금은 할 수 없습니다.';
 const city=state.cities[cityId],o=state.wanderers?.[officerId];
 if(!o||o.locationRef.id!==cityId||city?.ownerFactionId!==state.playerFactionId)return '우리 성의 떠돌이 인재만 등용할 수 있습니다.';
 const cost=cityRecruitCost(state,cityId,state.playerFactionId),available=(state.factions[state.playerFactionId].prestige??0)-(state.captiveRecruitment?.factions[state.playerFactionId]?.reservedPrestige??0);
 return available<cost?errorText(`INSUFFICIENT_RECRUITMENT_PRESTIGE:${state.playerFactionId}:required=${cost}:available=${available}`):'';
}
function cardDescription(c,id,shownState=state){
 const r=shownState.campaignGrowth.officers[id],base=r.cards[c.traitId]??c;
 if(c.kind==='awakening')return playerText(c.text||'이 특기의 수치가 한 단계 오른다');
 const extra=[];
 for(const e of base.effects??[])if(e.rule?.startsWith('U_'))for(const [key,value] of Object.entries(e.params??{}))if(Number.isFinite(value)&&!['range','turns','uses','cost','at','threshold'].includes(key))extra.push({op:'DISPLAY_VALUE',value});
 const factor=c29CoreFactor(shownState,id);
 return playerText(cardNumericText({...c,effects:[...(c.effects??[]),...extra.map(e=>({...e,value:e.value*factor}))]}, {...base,effects:[...(base.effects??[]),...extra]},strengthenedValue));
}
function draftDescription(c,id){
 const r=state.campaignGrowth.officers[id];
 if(c.kind==='awakening'){
  const before=officerEffectCards(state,id).find(x=>x.traitId===r.coreId);
  if(before?.effects?.some(e=>e.rule==='U_KINGS_AIDE'))return `${playerText(c.text)} · 생산 작업 진행 ×1.3 → ×1.3 (현재 고정 효과) · 재야 장수 위치 공개 유지`;
  if(c.rule==='STEADY_UP'&&before){const preview=structuredClone(state);preview.campaignGrowth.officers[id].c29.awakenings.push({...c,level:r.track.growthStates[id].level});const after=c29CoreCard(preview,id,{...r.cards[r.coreId],rank:before.rank});
   const oldText=cardDescription(before,id),newText=cardDescription(after,id,preview),oldValues=[...oldText.matchAll(/[+−-]?\d+(?:\.\d+)?%/g)].map(x=>x[0]),newValues=[...newText.matchAll(/[+−-]?\d+(?:\.\d+)?%/g)].map(x=>x[0]);
   const changes=[...new Set(oldValues.flatMap((value,i)=>newValues[i]&&newValues[i]!==value?`${value} → ${newValues[i]}`:[]))];
   if(changes.length)return `${playerText(c.text)} · ${changes.join(' · ')}`;}
  return playerText(c.text||'이 특기의 수치가 한 단계 오른다');
 }
 const effective=c29CoreCard(state,id,{...c,rank:Math.min(5,(c.rank??0)+1)});
 const text=cardDescription(effective,id);
 const previous=c.rank?cardDescription(c29CoreCard(state,id,{...c,rank:c.rank}),id):text;
 if(previous!==text)return `${previous} → ${text}`;
 return cardEffectPending(c)?text+' · 효과 준비 중':text;
}
const FORMATION_NAME={DISORDERED:'흐트러짐',BROKEN:'붕괴'};
// C138: use registered combat pools, not names/class tags. Mixed unique rules stay unlabelled.
const GROWTH_COMBAT_RULES=[...CAMPAIGN_RULES,...COMBAT_TITLE_RULES,...C33_POOL.traits.flatMap(c=>(c.effects??[]).map(e=>e.rule).filter(Boolean)),
 'U_FEARLESS','U_SLEEPING_DRAGON','U_BENEVOLENCE','U_HERO_OF_CHAOS','U_LITTLE_CONQUEROR','U_AWE','U_FIRE_GOD','U_OLD_VIGOR','U_MARTIAL_SAINT','U_ROAR','U_BODYGUARD','U_LINKED_CAMPS','U_BELL_SOUND','U_DIVINE_ARCHER','U_FIERCE_PRIDE','U_IRON_CITADEL']; // uniqueOps + army-only combat/start hooks
const GROWTH_DOMESTIC_RULES=[...DOMESTIC_RULES,'U_KINGS_AIDE']; // uniqueProgress + uniqueRevealedWanderers
const SUB_AXES={지휘:['전열 유지','기동','전환','수습'],무용:['힘','기술','막아내기','되받기'],지략:['군재','응변','속이기','통찰'],정무:['행정','병참','인사','제도','민정'],감화:['설득','포섭','결집','중재']};
const COMBAT_SUBS=new Set(['전열 유지','전환','수습','힘','기술','막아내기','되받기','결집']);
const APTITUDE_NAME={HIGH:'높음',MEDIUM:'보통',LOW:'낮음'},TROOP_NAME={BT01:'도검병',BT02:'창병',BT03:'궁병',BT04:'기병'};
const actionAudio=createCampaignActionAudio(),settlementAudio=createSettlementAudio();
const combatAudio=createCampaignCombatAudio();
let pilotAudio=createPilotAudio();
const uiSfx=createUiSfx(()=>pilotAudio.settings);document.addEventListener?.('pointerdown',()=>uiSfx.unlock(),{passive:true});
// 효과음(소리 파일) — 창 여닫이 · 단추는 스스로 듣고, 명령의 결과는 command() 가 알려 준다(2026-10-13). 배경 음악처럼 따로 불러온다: 서버를 다시 띄우기 전(sfx.mjs 를 아직 못 주는 서버)에도 화면은 그대로 뜨고 효과음만 빠진다
let worldSfx={command(){},play(){return false;},unlock(){},attach(){},ready:0};
import('/app/world/sfx.mjs').then(m=>{worldSfx=m.createWorldSfx(()=>pilotAudio.settings);worldSfx.attach(document);if(audioGesture)worldSfx.unlock();}).catch(()=>{});
// 배경 음악 장치는 따로 불러온다 — 서버를 다시 띄우기 전(bgm.mjs 를 아직 못 주는 서버)에도 화면은 그대로 뜨고 음악만 빠진다
let bgm={scene(){},gesture(){},configure(){},deactivate(){},activate(){}},bgmWanted='title';
import('/app/world/bgm.mjs').then(m=>{bgm=m.createWorldBgm({settings:pilotAudio.settings,onStatus:(scene,st)=>{const d=document.documentElement?.dataset;if(d){d.bgm=scene??'';d.bgmState=st;}}});bgm.scene(state?bgmScene(view(state)):bgmWanted);if(audioGesture)bgm.gesture();}).catch(()=>{});
// 장수 음성(시험)도 따로 불러온다 — 못 불러오면 조용히 빠진다. 부대를 고르거나 이동·공격·전법 명령을 내릴 때, 싸움이 끝났을 때 그 부대 대장이 한마디(표시용)
let voice={say(){return false;},configure(){},deactivate(){},activate(){}};
import('/app/world/voice.mjs').then(m=>{voice=m.createWorldVoice({settings:pilotAudio.settings,onSay:info=>{const d=document.documentElement?.dataset;if(d&&info)d.voice=`${info.officerId}:${info.slot}:${info.pack}`;}});}).catch(()=>{});
function voiceCue(request,before,combat){
 const A=id=>before.armies?.[id]??state.armies?.[id],lead=id=>A(id)?.commanderId,t=request.type,a=request.armyId??request.armyIds?.[0];
 if(!a||A(a)?.factionId!==state.playerFactionId)return;
 if(t==='USE_TACTIC')voice.say(lead(a),'tactic');else if(t==='ATTACK_UNIT'||t==='ATTACK_CITY')voice.say(lead(a),'attack');else if(t==='QUEUE_MOVE'||t==='MOVE_UNIT')voice.say(lead(a),'move');
 // 싸움 뒤: 적 부대가 사라졌으면 이긴 말, 내 부대가 사라졌으면 물러나는 말(교전 연출이 끝날 즈음)
 if(combat&&combat.attackerId===a&&combat.targetId){const won=!!before.armies?.[combat.targetId]&&!state.armies?.[combat.targetId],lost=!state.armies?.[a];if(won||lost)setTimeout(()=>voice.say(lead(a),lost?'retreat':'victory'),1900);}
}
// 화면별 배경 음악 고르기(표시용): 결말 > 위기 > 교전(마지막 전투 뒤 8초) > 군의·외교 > 성(주점은 따로) > 지도 전시(보이는 적이 내 성·부대 5칸 안) > 지도 평시. 지도 곡은 두 차례마다 둘째 곡과 번갈아 든다(2026-10-13 사용자 "배경음악이랑 효과음도 촘촘하게")
let bgmHeat=0,bgmHeatTimer=null;
function bgmScene(v){
 if(!state)return 'title';
 const g=state.gameResult;
 if(g&&state.remainingTicks===null)return ['UNIFICATION','TURN_LIMIT'].includes(g.type)&&(g.winnerFactionId??state.playerFactionId)===state.playerFactionId?'victory':'defeat';
 const crisisCard=$('#crisis-modal'),ev=v.pendingEvent;
 if((crisisCard&&!crisisCard.hidden)||ev?.scale==='CRISIS'||ev?.eventId==='CRISIS_HEGEMONY')return 'crisis';
 const now=performance.now();
 if(combatAnimating){bgmHeat=now+8000;clearTimeout(bgmHeatTimer);bgmHeatTimer=setTimeout(()=>{if(state)bgm.scene(bgmScene(view(state)));},8200);}
 if(now<bgmHeat)return 'battle';
 const dp=$('#diplo');if(councilOpen||(dp&&!dp.hidden))return 'council';
 if(stage.city)return stage.fac==='tavern'?'tavern':'city';
 const T=state.tiles,dist=(a,b)=>{const p=T[a],q=T[b];if(!p||!q)return 99;const dq=p.q-q.q,dr=p.r-q.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;};
 const mine=[...Object.values(v.ownArmies??{}).map(a=>a.tileId),...Object.values(v.ownCities??{}).map(c=>c.tileId)];
 const ally=new Set((v.diplomacy?.factions??[]).filter(f=>f.state==='ALLIANCE').map(f=>f.factionId));
 const war=Object.values(v.knowledge?.observedArmies??{}).some(a=>a.factionId!==state.playerFactionId&&!ally.has(a.factionId)&&v.knowledge.tiles?.[a.tileId]==='VISIBLE'&&mine.some(t=>dist(t,a.tileId)<=5));
 const alt=Math.floor((state.turn??0)/2)%2===1;
 return war?(alt?'map-war-b':'map-war'):(alt?'map-peace-b':'map-peace');
}
// 창을 닫는 것처럼 다시 그리지 않는 동작 뒤에도 곡을 맞춘다
document.addEventListener?.('click',()=>{if(state)queueMicrotask(()=>bgm.scene(bgmScene(view(state))));});
// 초상: 채택본(adopted) 우선, 없으면 임시 Old(사용자 2026-10-04 "일단 old로넣어" — 채택 상태 변경 아님)
Promise.all([fetch('/assets/officer-art/adopted.json').then(r=>r.json()).catch(()=>({officers:[]})),fetch('/assets/officer-art/provisional-old.json').then(r=>r.json()).catch(()=>({officers:[]})),fetch('/docs/design-data/officer-pack/redesign-50-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/bonds-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/person-crisis-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/trial-51-100-v0.1.json').then(r=>r.json()).catch(()=>null),fetch('/docs/design-data/officer-pack/visit-talks-v0.1.json').then(r=>r.json()).catch(()=>null)])
 .then(([a,old,lines,bonds,crisis,more,talks])=>{bondsData=bonds;crisisData=crisis;visitTalks=talks;memoryLines={...Object.fromEntries(Object.values(lines?.officers??{}).filter(o=>o?.memorableLine).map(o=>[o.id,o.memorableLine])),...Object.fromEntries((more?.officers??[]).filter(o=>o.memoryLine).map(o=>[o.id,o.memoryLine]))};artCatalog=a;portraits={...Object.fromEntries(old.officers.map(o=>[o.officerId,o])),...Object.fromEntries(a.officers.map(o=>[o.officerId,o]))};if(state)render();}).catch(()=>{});
function unlockAudio(){audioGesture=true;actionAudio.unlock();combatAudio.unlock();settlementAudio.unlock();pilotAudio.unlock();bgm.gesture();}
const $ = selector => document.querySelector(selector);
const colors = {F01:'#d34a45', F02:'#63a88b', F03:'#3f83c5'};
let state = null;
let selectedArmyId=null,selectedArmyIds=[],orderTimer=null;
let selectedCityId=null,cityTab=null,officeTab='jobs'; // 도시 패널 탭(개요·생산·인물) — 문명7 도시 창 탭 + 카드 격자 배치
let aiTimer=null;
let selectedTacticId=null,selectedOfficerId=null,traitChoice=null;
let attackMode=false,combatAnimating=false,zoom=1,losses={},combatTimers=[],mapMargin=0;
let turnLog=[];
let recordNotices=[],newsArchive=[],currentNews=[],allNews=[],overlapPick=null; // C137: UI history only
// 끝난 판의 차례 표기: 결과가 정해질 때 엔진의 차례는 이미 다음으로 넘어가 있다(26차례에 멸망했는데 27턴으로 보였다 — 닷토리 B15). 끝난 판은 '마친 차례'를 보여 준다
const endedTurn=t=>state?.gameResult?Math.max(1,Math.min(t-1,CAMPAIGN_TURN_LIMIT)):t;
let recentCombats=[],lastFoodChange=null,lastUnitResult=null,lastFacilityResults=[]; // 이번 접속의 관측 결과만. 새 판/불러오기에서 초기화.
const START_ZOOM=1.7; // 시작 시점: 부대 얼굴·병력이 읽히는 거리(휠로 0.5~2.6). 1.35 로 넓혀 봤으나(2026-10-11) 서쪽 수도(업)는 그림 끝이라 가운데로 못 와서, 부대를 고르면 수도 이름표가 왼쪽 아래 부대 판에 가려졌다 → 되돌림
// 지도 위 움직임(렌더러 모델로 넘김): 행군 경로·공격 동작·바라보는 쪽·전투 효과. elapsed 로 다시 그려도 이어진다.
let motions={},attackAnims={},facings={},fxList=[],motionSeq=0,redrawTimer=null;
const factionName=id=>({F01:"조조군",F02:"유비군",F03:"손권군"}[id]??id);
let cameraMoving=false,cameraTimer=null;
function inputLocked(){return !$('#save-confirm')?.hidden||$('#attack-confirm')?.hidden===false||cameraMoving||(state?.orderQueue?.length>0)||combatAnimating||state?.phase==='AI'||!!(state&&pendingCampaignDraft(state));}
function scheduleOrders(){
 clearTimeout(orderTimer);
 if(!state?.gameResult&&state?.phase==='PLAYER'&&queuedOrderUnit(state)&&!combatAnimating&&!pendingCampaignDraft(state))orderTimer=setTimeout(()=>command({type:'ADVANCE_ORDER'}),Math.max(10,motionRemaining()+60));
}
function scheduleAi(){
 scheduleOrders();scheduleStrike();
 clearTimeout(aiTimer);
 if(state&&!state.gameResult&&state.phase==='AI'&&!combatAnimating)aiTimer=setTimeout(()=>command({type:'ADVANCE_AI'}),Math.max(150,motionRemaining()+60));
}
// 안개 속 전투(내 세력이 양쪽 칸 모두 못 보는 AI끼리 싸움)는 연출·화면 이동·기록 없이 넘긴다 — 숨은 정보가 새지 않게
function armyVisible(s,id){const a=s.armies[id];return !!a&&(a.factionId===s.playerFactionId||s.knowledge?.[s.playerFactionId]?.tiles?.[a.tileId]==='VISIBLE');}
function combatVisible(before,after,c){
 const f=after.playerFactionId,seen=(s,tile)=>tile&&s.knowledge?.[f]?.tiles?.[tile]==='VISIBLE';
 const tiles=[before.armies[c.attackerId]?.tileId,before.armies[c.targetId]?.tileId,c.fromTileId,before.cities?.[c.cityId]?.tileId].filter(Boolean);
 return [c.attackerId,c.targetId].some(id=>before.armies[id]?.factionId===f)||tiles.some(t=>seen(before,t)||seen(after,t));
}
// 확정 연출(정본 §24): 되돌리기 어려운 군사 명령 = 호부(虎符) 두 쪽이 맞물림 0.2초, 차례 확정 = 주사 인장
function commitFx(kind){
 const host=document.querySelector?.('#w-fx');if(!host?.animate&&!host?.classList)return;
 const L=v3Asset('ui/tally-left.png'),R=v3Asset('ui/tally-right.png'),S=v3Asset('ui/seal-2.png');
 if(kind==='tally'&&L&&R){host.innerHTML=`<div class="fx-tally"><img class="l" src="${L}" alt=""><img class="r" src="${R}" alt=""></div>`;}
 else if(kind==='seal'&&S){host.innerHTML=`<div class="fx-seal"><img src="${S}" alt=""></div>`;}
 else return;
 uiSfx.play(kind);host.hidden=false;host.classList?.remove('go');void host.offsetWidth;host.classList?.add('go');clearTimeout(commitFx.t);commitFx.t=setTimeout(()=>{host.hidden=true;host.innerHTML='';},kind==='tally'?900:800);
}
function command(request,confirmed=false) {
 if(!confirmed&&!inputLocked()&&confirmRiskyAttack(request))return; // C137: before effects or engine step
 setCommandIntent('');
 if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type)&&!inputLocked())commitFx('tally');
 if(request.type==='END_TURN'&&!inputLocked())commitFx('seal');
 const keepSel=request.type==='ADVANCE_ORDER'&&selectedArmyId?{id:selectedArmyId,menu:menuOpen}:null; // 예약 이동 자동 처리가 플레이어 선택을 풀지 않게
 if(['ATTACK_UNIT','ATTACK_CITY','BRACE','REGROUP','WAIT_UNIT','USE_TACTIC','GARRISON'].includes(request.type))lastActedArmy=request.armyId??null;
 const draftAction=['DRAFT_PICK','DRAFT_REROLL'].includes(request.type);
 if(combatAnimating||(!draftAction&&!['ADVANCE_AI','ADVANCE_ORDER'].includes(request.type)&&inputLocked()))return;
 try {
  if(!draftAction&&!['ADVANCE_AI','ADVANCE_ORDER'].includes(request.type))cancelStrike();
  const before=state;state=step(state,{...request,incremental:true});overlapPick=null;
  const bv=view(before),av=view(state),notices=[...observedReinforcementLines(bv,av),...starvationLines(bv,av)];
  for(const c of Object.values(av.ownCities)){const kind=c.currentProduction?.kind;if(!kind)continue;const old=bv.ownCities[c.cityId]?.jobs?.find(j=>j.kind===kind)?.estimate,next=c.jobs?.find(j=>j.kind===kind)?.estimate,r=productionReadout(next,old);if(r.change)notices.push(`${c.name} · ${r.change} · ${r.line}`);}
  for(const [id,a] of Object.entries(bv.ownArmies)){if((av.ownArmies[id]?.troopCount??0)>0)continue;const inj=av.officers[a.commanderId]?.injury;if(inj&&!bv.officers[a.commanderId]?.injury)notices.push(`부대가 무너졌습니다 — ${av.officers[a.commanderId]?.name??'장수'} 중상 · ${injuryReturnText(av.turn,inj)}`);}
  recordNotices=[...recordNotices,...notices.map(line=>({turn:av.turn,line}))].slice(-20);
  if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type)&&state.lastCombat?.enemyLoss>0&&state.battleSequence>before.battleSequence)state.uiFirstAttackDone=true;
  const majorCount=x=>Object.values(x.cities).filter(c=>c.kind!=='minor'&&c.ownerFactionId===x.playerFactionId).length;
  if(majorCount(before)<3&&majorCount(state)>=3)turnLog.push('큰 성 셋을 얻었습니다 — 이번 차례가 끝나면 통일입니다');
  if(request.type==='CITY_JOB'&&request.kind==='muster'){const n=musterTurns(state.cities[request.cityId]);turnLog.push(`출진 부대는 ${turnCountText(n)} 뒤 나오며, 나온 차례엔 못 움직입니다.`);}
  if(state.turn>before.turn){lastFoodChange=foodTransition(view(before),view(state));lastUnitResult=null;lastFacilityResults=facilityCompletionLines(view(before),view(state),Object.fromEntries(Object.entries(CITY_JOBS).map(([k,j])=>[k,j.name])));}
  if(request.type==='GARRISON')lastUnitResult=garrisonResult(view(before),view(state),request.armyId);
  for(const e of (state.combatLog??[]).filter(e=>e.sequence>(before.battleSequence??0))){
   if(!combatVisible(before,state,e))continue;
   const row=combatReadout(view(before),view(state),e,Object.fromEntries(campaignMapModel(view(before)).units.map(u=>[u.id,u.name])));
   if(row&&!recentCombats.some(r=>r.sequence===row.sequence))recentCombats=[...recentCombats,row].slice(-6);
   if(row&&e.tacticName){const visibleIds=Object.keys({...bv.ownArmies,...bv.knowledge.observedArmies}).filter(id=>bv.ownArmies[id]||bv.knowledge.tiles[bv.knowledge.observedArmies[id]?.tileId]==='VISIBLE');const summary=tacticChangeText(e,{ownIds:Object.keys(bv.ownArmies),visibleIds,cityTarget:!!bv.ownCities[e.targetId]||bv.knowledge.tiles[bv.knowledge.cities[e.targetId]?.tileId]==='VISIBLE'});turnLog.push(summary);row.lines.unshift(summary);}
  }
  $('#growth-error').textContent='';
  const id=`campaign:${++soundSequence}`;
  if(state.turn>before.turn){newsArchive.push(...turnLog.map(line=>({turn:before.turn,line})));turnLog=[];settlementAudio.play(id+':settlement');playStrategicCue('START',before,state,id+':start');}
  if(['MOVE_UNIT','ADVANCE_ORDER'].includes(request.type)||(request.type==='ADVANCE_AI'&&Object.values(state.armies).some(a=>a.tileId!==before.armies[a.armyId]?.tileId)))playStrategicCue('MOVE',before,state,id);
  if(request.type==='END_TURN')playStrategicCue('TURN',before,state,id);
  for(const event of (state.moraleLog??[]).slice((before.moraleLog??[]).length))if(armyVisible(state,event.armyId)||armyVisible(before,event.armyId))turnLog.push(event.text);
  const combat=state.lastCombat&&state.lastCombat.sequence!==before.lastCombat?.sequence?state.lastCombat:null;
  const movers=startMotions(before,state,combat);
  try{voiceCue(request,before,combat);}catch{} // 음성은 표시용 — 여기서 틀어져도 명령 처리는 이어 간다
  try{worldSfx.command({request,before,state,combat,visible:id=>armyVisible(state,id)||armyVisible(before,id)});}catch{} // 효과음도 표시용
  // 성 주인이 바뀌면 함락 컷인(페르소나5·림버스 붓 띠) — 내가 얻거나 잃은 성, 또는 보이는 성만
  for(const c of Object.values(state.cities)){const was=before.cities[c.cityId]?.ownerFactionId;if(was===c.ownerFactionId||!c.ownerFactionId)continue;
   if(c.ownerFactionId===state.playerFactionId||was===state.playerFactionId||view(state).knowledge.tiles[c.tileId]==='VISIBLE'){setTimeout(()=>showCutIn(`${c.name} 함락`,`${factionName(c.ownerFactionId)}군${was?` ← ${factionName(was)}군`:''}`,c.ownerFactionId),combat?1250:150);break;}}
  if(state.turn>before.turn&&!state.gameResult)showBanner(campaignDate(state.turn),`${factionName(state.playerFactionId)}의 차례`);
  else if(before.phase==='PLAYER'&&state.phase==='AI'&&!state.gameResult)showBanner('적군의 차례',Object.keys(state.factions).filter(f=>f!==state.playerFactionId).map(factionName).join(' · '));
  $('#attack-preview').hidden=true;menuOpen=false;moveMode=false;faceMode=false;attackMode=false;selectedTacticId=null;destination=null;
  if(combat&&combatVisible(before,state,combat)){$('#attack-preview').hidden=true;$('#status').textContent='공격 중…';animateCombat(before,combat,id);return;}
  if(request.type!=='MOVE_UNIT')selectedArmyId=null;
  if(keepSel&&state.armies[keepSel.id]&&!armyActionEnded(state,keepSel.id)&&state.phase==='PLAYER'){selectedArmyId=keepSel.id;selectedArmyIds=[keepSel.id];menuOpen=keepSel.menu;moveMode=true;}
  render();scheduleOrders();if(request.type==='ADVANCE_AI'&&movers[0])follow(movers[0]);scheduleAi();
  $('#status').textContent=state.phase==='AI'?(before.phase==='PLAYER'?(request.type==='END_TURN'?'AI 차례 진행 중…':'모든 부대 행동 완료 — AI 차례'):'AI 차례 진행 중…'):'명령을 선택하세요.';
  if(state.phase==='PLAYER'&&(before.phase!=='PLAYER'||state.turn>before.turn))startPlayerCamera();else autoNextUnit();
 }catch(error){$('#status').textContent=errorText(error);if(draftAction)$('#growth-error').textContent=errorText(error);}
}
function animateCityCombat(before,c,id){
 combatAnimating=true;
 const events=c.kind==='CITY_STRIKE'?(state.combatLog??[]).slice((before.combatLog??[]).length).filter(e=>e.kind==='CITY_STRIKE'):[c];
 for(const event of events){
 c=event;ruleFx(before,c);const strike=c.kind==='CITY_STRIKE',city=before.cities[c.cityId],now=performance.now();
 const from=strike?city.tileId:before.armies[c.attackerId].tileId,to=strike?before.armies[c.targetId].tileId:city.tileId;
 fxList.push({kind:strike?'volley':'siege',from,to,start:now,duration:1100});
 const cityName=before.cityDisplayNames[c.cityId]??city.name;
 turnLog.push(strike?`${cityName} 사격: 적 −${c.enemyLoss}`:`${before.officers[before.armies[c.attackerId].commanderId].name} → ${cityName}: 내구 −${c.dealt}`);
 if(strike){const u=c.units[0],oldUnit=campaignMapModel(view(before)).units.find(a=>a.id===u.unitId);losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit};
 combatTimers.push(setTimeout(()=>{losses[u.unitId]={prevCount:u.preBattleCount,postCount:u.postBattleCount,heavyLoss:false,oldUnit};combatAudio.play('BT01',id+':hit');render();},360));}
 else {attackAnims[c.attackerId]={targetTileId:to,start:now,duration:520,ranged:false};combatAudio.play('BT01',id+':hit');}
 }
 render();combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'AI 차례 진행 중…':'명령을 선택하세요.';},1600));
}
// 신화 규칙 발동 줄("[특기 이름] 설명")은 기록에 남기고 지도에 진홍 표찰로 띄운다
function ruleFx(before,c){
 const tile=before.armies[c.attackerId]?.tileId??before.cities[c.cityId]?.tileId;
 for(const line of c.effectLines??[]){const name=line.match(/\[([^\]]+)\]/)?.[1];if(!name)continue;turnLog.push(line);if(tile)fxList.push({kind:'tactic',rule:true,label:name,from:tile,to:tile,start:performance.now(),duration:1700});}
}
function animateCombat(before,c,id){
 if(c.kind==='APPROACH_FIRE'&&motionRemaining()>0){
  combatAnimating=true;const units=campaignMapModel(view(before)).units;
  for(const u of c.units)losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit:units.find(x=>x.id===u.unitId)};
  render();follow(c.targetId);combatTimers.push(setTimeout(()=>{losses={};animateCombat(before,c,id);},motionRemaining()+20));return;
 }
 ruleFx(before,c);
 if(c.kind==='TACTIC'||c.kind==='TACTIC_EFFECT')fxList.push({kind:'tactic',label:c.tacticName,from:before.armies[c.attackerId].tileId,to:before.armies[c.targetId]?.tileId??before.armies[c.attackerId].tileId,start:performance.now(),duration:1700});
 if(c.kind==='TACTIC_EFFECT'){turnLog.push(`${before.officers[before.armies[c.attackerId].commanderId].name} · 전법 ${c.tacticName}`);combatAnimating=true;render();combatTimers.push(setTimeout(()=>{combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'AI 차례 진행 중…':'명령을 선택하세요.';},1100));return;}
 if(c.kind==='CITY'||c.kind==='CITY_STRIKE'){animateCityCombat(before,c,id);return;}
 combatAnimating=true;
 const approach=c.kind==='APPROACH_FIRE',pursuit=c.kind==='PURSUIT',movementShot=pursuit||approach,attackTroop=troopToCampaign(before.armies[c.attackerId].troopType),ranged=attackTroop==='BT03'&&!pursuit;
 const leadSound=['BT03','BT04'].includes(attackTroop);
 const fromTile=before.armies[c.attackerId].tileId,targetTile=c.fromTileId??before.armies[c.targetId].tileId;
 if(leadSound)combatAudio.play(attackTroop,id+':lead',{heavyLoss:c.enemyLoss/c.units.find(u=>u.unitId===c.targetId).preBattleCount>=.3});
 const name=armyId=>before.officers[before.armies[armyId].commanderId].name;
 // 교전 장면(기준 final-battle): 내가 건 부대 대 부대 공격만, 지도 위 연출이 도는 동안 그림 한 장으로 보여 준다(누르면 넘어감 · ?clash=0 으로 끔). 결과 계산·지도 반영은 그대로
 if(!movementShot&&$('#clash')&&document.body?.classList?.contains?.('ink')&&before.armies[c.attackerId].factionId===state.playerFactionId&&new URLSearchParams(location.search).get('clash')!=='0'){const U=id=>c.units.find(u=>u.unitId===id),S=id=>({name:name(id),emblem:`/assets/ui-v3/hud/faction-banner-${before.armies[id].factionId}.png`,face:faceOf(before.armies[id].commanderId),pre:(U(id)?.preBattleCount??0)*campaignShownScale(before,id,state.playerFactionId),post:(U(id)?.postBattleCount??0)*campaignShownScale(before,id,state.playerFactionId),troop:TROOP_NAME[troopToCampaign(before.armies[id].troopType)]??''});showClash($('#clash'),{ally:S(c.attackerId),foe:S(c.targetId),counter:!!c.counter,attackerIsAlly:true});}
 turnLog.push(approach?`${name(c.attackerId)} 접근사격 → ${name(c.targetId)}: −${c.enemyLoss}`:pursuit?`${name(c.attackerId)} 추격 → ${name(c.targetId)}: −${c.enemyLoss} (교전 이탈)`:`${name(c.attackerId)} → ${name(c.targetId)}: 적 −${c.enemyLoss}, 아군 −${c.allyLoss}${c.counter?'(반격)':''}`);
 // Keep the old counts while the charge plays; committed state/vision is already updated.
 const oldUnits=campaignMapModel(view(before)).units;
 if(approach){const target=oldUnits.find(u=>u.id===c.targetId);if(target)target.tileId=targetTile;}
 for(const u of c.units)losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit:oldUnits.find(x=>x.id===u.unitId)};
 const now=performance.now();
 attackAnims[c.attackerId]={targetTileId:targetTile,start:now,duration:520,ranged};
 facings[c.attackerId]={tileId:targetTile,until:now+2300};facings[c.targetId]={tileId:fromTile,until:now+(movementShot?560:2300)};
 fxList.push({kind:ranged?'volley':attackTroop==='BT04'?'charge':'clash',from:fromTile,to:targetTile,start:now+(ranged?0:150),duration:1100});
 render();follow(c.targetId);
 const hit=(armyId,loss,counter)=>{
  const u=c.units.find(u=>u.unitId===armyId);losses[armyId]={prevCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),postCount:u.postBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),heavyLoss:loss/u.preBattleCount>=.3,oldUnit:oldUnits.find(x=>x.id===armyId),lossLabel:approach?'접근사격':pursuit&&!counter?'추격':counter?'반격':''};
  if(counter||!leadSound)combatAudio.play(troopToCampaign(before.armies[counter?c.targetId:c.attackerId].troopType),id+(counter?':counter':':hit'),{counter,heavyLoss:loss/u.preBattleCount>=.3});render();
 };
 combatTimers.push(setTimeout(()=>{hit(c.targetId,c.enemyLoss,false);if(!c.counter)delete losses[c.attackerId];},360));
 if(c.counter){
  combatTimers.push(setTimeout(()=>{const t=performance.now();attackAnims[c.targetId]={targetTileId:fromTile,start:t,duration:480,ranged:false};fxList.push({kind:'clash',from:targetTile,to:fromTile,start:t+140,duration:1000});render();},540));
  combatTimers.push(setTimeout(()=>hit(c.attackerId,c.allyLoss,true),700));
 }
 combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'모든 부대 행동 완료 — AI 차례':'명령을 선택하세요.';},movementShot?Math.max(1500,motionRemaining()+200):state.phase==='AI'?1500:2260)); // AI 차례 전투는 마무리를 짧게
}
// 움직인 부대마다 행군 경로를 기록한다(보이는 부대만). 전투로 밀려난 부대는 맞은 뒤에 움직인다.
function startMotions(before,after,combat){
 const now=performance.now(),seen=new Set();
 for(const v of [view(before),view(after)])for(const id of [...Object.keys(v.ownArmies),...Object.keys(v.knowledge.observedArmies)])seen.add(id);
 const moved=[];
 for(const a of Object.values(after.armies)){
  const from=before.armies[a.armyId]?.tileId;if(!from||from===a.tileId||!seen.has(a.armyId))continue;
  let path=null;try{path=campaignPath(before,a.armyId,a.tileId)?.pathTileIds??null;}catch{path=null;}
  if(!path||path[0]!==from||path.at(-1)!==a.tileId)path=[from,a.tileId];
  const hold=combat&&combat.kind!=='APPROACH_FIRE'?(combat.kind==='PURSUIT'&&combat.targetId===a.armyId?560:1000):0;
  motions[a.armyId]={path,start:now,hold,duration:hold+Math.min(1300,200*(path.length-1)),key:++motionSeq};
  moved.push(a.armyId);
 }
 if(moved.length)scheduleRedraw();
 return moved;
}
function motionRemaining(){const now=performance.now();return Math.max(0,...Object.values(motions).map(m=>m.start+m.duration-now));}
function overlayAnimations(model){
 const now=performance.now();
 for(const u of model.units){
  const m=motions[u.id];
  if(m){const e=now-m.start;if(e<m.duration)u.motion={path:m.path,elapsed:e,duration:m.duration,hold:m.hold,key:m.key};else delete motions[u.id];}
  const a=attackAnims[u.id];
  if(a){const e=now-a.start;if(e<a.duration)u.attack={targetTileId:a.targetTileId,elapsed:e,duration:a.duration,ranged:a.ranged};else delete attackAnims[u.id];}
  const f=facings[u.id];
  if(f){if(now<f.until)u.faceTileId=f.tileId;else delete facings[u.id];}
 }
 fxList=fxList.filter(f=>now-f.start<f.duration);
 model.fx=fxList.map(f=>({kind:f.kind,label:f.label,rule:f.rule,from:f.from,to:f.to,elapsed:now-f.start}));
}
// 행군이 끝나면 한 번 다시 그려 바라보는 쪽·교전 표시를 맞춘다(브라우저 프레임 기준, 타이머 대기열을 쓰지 않음).
function scheduleRedraw(){
 if(redrawTimer||!globalThis.requestAnimationFrame)return;
 const tick=()=>{if(motionRemaining()>0){redrawTimer=requestAnimationFrame(tick);return;}redrawTimer=null;if(state&&!combatAnimating)drawMap(view(state));};
 redrawTimer=requestAnimationFrame(tick);
}
// AI 가 화면 밖에서 움직이면 그쪽으로 부드럽게 옮겨 보여 준다.
function follow(armyId,instant=false,previewTile=null){
 const map=$('#map'),tileId=state?.armies?.[armyId]?.tileId,city=Object.values(state?.cities??{}).find(c=>c.tileId===tileId);
 const node=map.querySelector?.(`[data-unit="${armyId}"]`)??(city&&map.querySelector?.(`.w-cityplate[data-city="${city.cityId}"]`))??(tileId&&map.querySelector?.(`[data-tile="${tileId}"]`)),port=$('.viewport');
 if(!node?.getBoundingClientRect||!port?.getBoundingClientRect||!port.scrollTo)return;
 const r=node.getBoundingClientRect(),v=port.getBoundingClientRect(),m=90;
 // C137: measure the actual fixed panels after the selected unit HUD has rendered.
 const panels=[...(typeof document!=='undefined'?document.querySelectorAll?.('.nb-band,.nb-hero,.nb-sheet,.nb-more,.nb-bookmarks,.nb-map-options,.nb-news-tab,.nb-news-peek,.ih-top,.ih-medal,.ih-victory,.ih-rail,.ih-unit,.ih-readout,.ih-notice,.ih-notice-links,.ih-cmd,.ih-end,.ih-foe,.ih-food-sheet,.w-top,.w-rail,.w-dock,.w-report,.w-turn,.w-advisor,#city-panel')??[]:[])]
  .filter(n=>!n.hidden&&n.getClientRects?.().length&&(typeof getComputedStyle!=='function'||getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).opacity!=='0')).map(n=>n.getBoundingClientRect());
 if(panels.length){
  // A tilted viewport's transformed rect extends beyond the actual window.
  const visible={left:Math.max(0,v.left),top:Math.max(0,v.top),right:Math.min(globalThis.innerWidth??v.left+v.width,v.right??v.left+v.width),bottom:Math.min(globalThis.innerHeight??v.top+v.height,v.bottom??v.top+v.height)};
  visible.width=visible.right-visible.left;visible.height=visible.bottom-visible.top;
  // Perspective makes screen pixels differ from scroll pixels. Remeasure after each instant correction.
  for(let i=0;i<6;i++){let area=node.getBoundingClientRect();const extra=previewTile&&map.querySelector?.(`[data-tile="${previewTile}"]`)?.getBoundingClientRect?.();if(extra){area={left:Math.min(area.left,extra.left),right:Math.max(area.right,extra.right),top:Math.min(area.top,extra.top),bottom:Math.max(area.bottom,extra.bottom)};area.width=area.right-area.left;area.height=area.bottom-area.top;}const shift=uncoveredShift(area,visible,panels);if(!shift||(!shift.x&&!shift.y))return;
   const left=port.scrollLeft,top=port.scrollTop;
   let next={left:left-shift.x,top:top-shift.y};
   if(document.body?.classList?.contains('hud-band'))next=bandCameraPosition(port,map,next.left,next.top);
   port.scrollTo({...next,behavior:'auto'});if(port.scrollLeft===left&&port.scrollTop===top)return;
  }return;
 }
 if(r.left>=v.left+m&&r.right<=v.right-m&&r.top>=v.top+m&&r.bottom<=v.bottom-m)return;
 if(!instant)lockCamera(port);
 port.scrollTo({left:port.scrollLeft+(r.left+r.width/2)-(v.left+v.width/2),top:port.scrollTop+(r.top+r.height/2)-(v.top+v.height/2),behavior:instant?'auto':'smooth'});
}
function bandCameraPosition(port,map,left=port.scrollLeft,top=port.scrollTop){
 const svg=map.querySelector('svg'),box=svg?.viewBox?.baseVal;if(!box)return {left,top};
 // Automatic uncovering and resize stay inside land; manual map panning is unchanged.
 const margin=Number(svg.dataset.margin)||0,scale=svg.clientWidth/box.width;
 const limit=(value,current,extent,viewSize,keepEdge=false)=>{const low=margin*scale,high=(extent-margin)*scale-viewSize;if(high<low)return current;return keepEdge?Math.max(Math.min(low,current),Math.min(Math.max(high,current),value)):Math.max(low,Math.min(high,value));};
 // A capital at the southern edge already uses the rendered ring. Do not force it below the band,
 // and do not uncover farther into that ring than the current camera position.
 return {left:limit(left,port.scrollLeft,box.width,port.clientWidth),top:limit(top,port.scrollTop,box.height,port.clientHeight,true)};
}
function lockCamera(port){
 cameraMoving=true;clearTimeout(cameraTimer);let x=port.scrollLeft,y=port.scrollTop,stable=0,tries=0;
 const check=()=>{const still=x===port.scrollLeft&&y===port.scrollTop;stable=still?stable+1:0;x=port.scrollLeft;y=port.scrollTop;
  if(stable>=3||++tries>=30){cameraMoving=false;cameraTimer=null;if(state)render();positionUnitMenu();scheduleAi();return;}
  cameraTimer=setTimeout(check,40);
 };cameraTimer=setTimeout(check,40);
}
function startPlayerCamera(){
 const v=view(state),ids=Object.values(v.ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)).sort();
 if(!ids.length){centerPlayer();return;}
 selectedArmyId=ids[0];selectedArmyIds=[selectedArmyId];menuOpen=true;moveMode=true;destination=null;render();follow(selectedArmyId);positionUnitMenu();
}
// 턴이 바뀔 때 가운데에 잠깐 뜨는 붓글씨 띠.
let bannerTimer=null;
let cutInTimer=null;
function showCutIn(title,sub,factionId){
 let el=$('#cut-in');
 if(!el&&document.body?.insertAdjacentHTML){document.body.insertAdjacentHTML('beforeend','<div id="cut-in" class="cut-in" hidden></div>');el=$('#cut-in');}
 if(!el)return;const style=FACTION_STYLE[factionId]??{color:'#7d7a6a',emblem:'f-dragon'};
 el.style.setProperty('--fc',style.color);
 el.innerHTML=`<div class="stroke"></div><span class="seal">${style.glyph??'中'}</span><b>${esc(title)}</b><span class="sub">${esc(sub)}</span>`;
 el.hidden=false;el.className='cut-in';void el.offsetWidth;el.className='cut-in show';
 clearTimeout(cutInTimer);cutInTimer=setTimeout(()=>{el.hidden=true;el.className='cut-in';},1900);
}
function showBanner(title,sub){
 let el=$('#turn-banner');
 if(!el&&document.body?.insertAdjacentHTML){document.body.insertAdjacentHTML('beforeend','<div id="turn-banner" class="turn-banner" hidden></div>');el=$('#turn-banner');}
 if(!el)return;
 el.innerHTML=`<b>${esc(title)}</b><span>${esc(sub)}</span>`;el.hidden=false;el.className='turn-banner';void el.offsetWidth;el.className='turn-banner show';
 clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{el.hidden=true;el.className='turn-banner';},1700);
}
// Feed committed strategic actions into the existing action sound sequencer.
function playStrategicCue(kind,before,after,id){
 const round={roundNumber:before.turn,active:{unitId:'campaign',queue:'normal'}};
 const old={round:kind==='START'?{...round,active:null}:round,receipts:[]};
 const next={round:kind==='TURN'?{...round,active:null}:round,receipts:kind==='MOVE'?[{request:JSON.stringify({kind:'MOVE'})}]:[]};
 actionAudio.playTransition({battle:{revision:0,bundle:{frame:old}}},{battle:{revision:1,bundle:{frame:next}}},{},id);
}
// 부대 그림(병사)과 이름표(맨 위 층)가 같은 data-unit 을 단 두 노드다 — 상태 표시는 둘 다에
const unitNodes=id=>{const map=$('#map');return map.querySelectorAll?[...map.querySelectorAll(`[data-unit="${id}"]`)]:[map.querySelector(`[data-unit="${id}"]`)].filter(Boolean);};
// 특기 효과 기록: 지난 턴과 똑같은 줄(매 턴 도는 태수 효과 등)은 다시 쓰지 않는다 — 처음과 값이 바뀔 때만
function repeatFree(log,mine){const previous=new Set(log.filter(e=>e.turn===state.turn-1&&mine(e)).map(e=>e.text));return log.filter(e=>e.turn===state.turn&&mine(e)&&!previous.has(e.text)).map(e=>e.text);}
// "이번 턴" 창: 제목을 누르면 조작 안내·기록을 접는다(지도를 덜 가리게). 접힘 상태는 이 브라우저에만 기억
{const tracker=$('.tracker'),title=$('.tracker h2');let folded=false;try{folded=localStorage.getItem('sg-tracker-folded')==='1';}catch{}
 const apply=()=>{tracker?.classList?.toggle?.('folded',folded);title?.setAttribute?.('aria-expanded',String(!folded));};
 title?.addEventListener?.('click',()=>{folded=!folded;try{localStorage.setItem('sg-tracker-folded',folded?'1':'0');}catch{}apply();});apply();}
function markUnknownCounts(model){
 for(const unit of model.units){
  if(Number.isFinite(unit.count))continue;
  for(const node of unitNodes(unit.id)){
   const count=node.querySelector('.count');if(count)count.textContent='—';
   for(const bar of node.querySelectorAll('.bar,.bar-bg'))bar.style.visibility='hidden';
  }
 }
}
function render() {
  const v=view(state);
  $('#selection').hidden=true;$('#game').hidden=false;for(const s of ['#hud','#mode-rail','#w-report','#w-advisor','#w-turn','#mini-toggle'])if($(s))$(s).hidden=false;
  const shownTurn=endedTurn(v.turn);$('#turn').textContent=campaignDate(shownTurn);
  const left=CAMPAIGN_TURN_LIMIT-Math.min(v.turn,CAMPAIGN_TURN_LIMIT+1)+1;$('#turn').dataset.left='';$('#turn').title=`한 판 ${CAMPAIGN_TURN_LIMIT}턴`;
  const majors=Object.values(v.ownCities).filter(c=>c.kind!=='minor').length;
  const goal=$('#victory-guide');if(goal){goal.textContent=`큰 성 3개를 차지하고 차례를 넘기면 통일 · ${CAMPAIGN_TURN_LIMIT}차례 뒤에는 큰 성 → 작은 성 → 병력 · 내 큰 성 ${majors}/3 · ${Math.max(0,left)}차례 남음`;goal.title=`큰 성 셋을 모두 차지한 뒤 차례를 넘기면 정산 때 통일을 판정합니다.\n${CAMPAIGN_TURN_LIMIT}차례 뒤 큰 성 수로, 같으면 작은 성 · 병력 순입니다.`;}
  const locked=inputLocked();
  $('#end-turn').disabled=locked||state.remainingTicks!==null||!!state.gameResult;
  $('#save').disabled=combatAnimating||state.phase==='AI';$('#continue').disabled=locked;

  $('#result').hidden=!(state.gameResult&&state.remainingTicks===null);
  $('#map').hidden=false;
  const g=state.gameResult,won=['UNIFICATION','TURN_LIMIT'].includes(g?.type)&&(g.winnerFactionId??state.playerFactionId)===state.playerFactionId;
  $('#result-text').textContent=g?.type==='UNIFICATION'?(won?'천하 통일':'통일 — 캠페인 종료'):g?.type==='TURN_LIMIT'?(won?`${CAMPAIGN_TURN_LIMIT}턴 종료 — 승리`:`${CAMPAIGN_TURN_LIMIT}턴 종료 — ${factionName(g.winnerFactionId)} 승리`):'멸망 — 캠페인 종료';
  if(state.gameResult&&!$('#result').hidden)renderResultSummary(v,won);
  const style=FACTION_STYLE[v.factionId];$('#hud').dataset.faction=v.factionId;
  $('#faction').innerHTML=`${emblemHtml(v.factionId)}<span>${style.name}</span>`;$('#faction').style?.setProperty?.('--fc',style.color);
  const cities=Object.values(v.ownCities),sum=key=>cities.reduce((n,c)=>n+(Number(c[key])||0),0);
  // 위 자원 줄: economyForecast 는 소비 전 산출이다. 실제 재고 증감으로 표기하지 않는다.
  const fc=key=>cities.reduce((n,c)=>n+(Number(c.economyForecast?.[key])||0),0),delta=(n,icon)=>n?`<small class="d ${n>0?'up':'down'}">${icon==='food'?'산출 ':''}${n>0?'+':'−'}${Math.round(Math.abs(n))}</small>`:'';
  const research=v.research&&Number.isFinite(v.research.nextThreshold)?`${Math.round(v.research.science??0)}<i>/${v.research.nextThreshold}</i>`:null;
  $('#resources').innerHTML=[['food','식량',`${Math.round(sum('foodStock'))}${sum('foodCapacity')?`<i>/${Math.round(sum('foodCapacity'))}</i>`:''}`,fc('food'),'세력이 쌓아 둔 식량 · 도시 재고/창고 합 · 소비 전 산출 · 눌러 실제 재고 변화 확인'],['production','생산',Math.round(sum('production')),fc('production'),'도시 생산 합 · 다음 정산 산출'],...(research?[['science','과학',research,fc('science'),`연구 ${v.research.stage}단계 · 다음 단계 문턱 ${v.research.nextThreshold}`]]:[]),['fame','인망',v.faction.prestige??'—',fc('prestige'),'인망 · 다음 정산 산출'],['troops','병력',Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0),0,'부대 병력 합'],['reserve','예비',Math.round(sum('reserveTroops')),0,'도시 예비병 합']].map(([icon,label,value,d,title])=>`<span class="chip" data-res="${icon}" title="${esc(label+' — '+title)}">${resourceIcon(icon)?`<img class="ico" src="${resourceIcon(icon)}" alt="">`:`<i class="ico">${ICON_GLYPH[icon]??'·'}</i>`}<b>${value}</b>${delta(d,icon)}</span>`).join('');
  const remaining=Object.values(v.ownArmies).filter(a=>!armyActionEnded(state,a.armyId)).length;
  const idle=idleCities(v);$('#end-turn').dataset.blocker=locked?'':idle[0]?.cityId??'';$('#end-turn').classList?.toggle?.('blocked',!locked&&idle.length>0);
  $('#remaining').textContent=idle.length?'생산을 정하지 않은 성이 있습니다.':remaining?'아직 행동할 부대가 남아 있습니다.':'모든 명령을 마쳤습니다.';$('#end-turn').classList?.toggle?.('ready',!locked&&!idle.length&&!remaining);$('#summary').textContent=`${state.phase==='AI'?'AI 자동 진행':'내 차례'} · 남은 부대 ${remaining}${v.crisis?` · 위기 ${v.crisis.name}(${factionName(v.crisis.factionId)}) ${v.crisis.turnsLeft}턴${v.crisis.joined?' · 연합':''}`:''}`;
  // C137: retain dated history, but only this turn belongs in the short notice panel.
  const rows=[...(state.campaignEffects?.log??[]).filter(e=>e.factionId===state.playerFactionId),...(state.orderLog??[]),...(state.administrationLog??[]).filter(e=>!e.factionId||e.factionId===state.playerFactionId)].map(e=>({turn:e.turn,line:e.text}));
  rows.push(...(state.campaignGrowth?.log??[]).filter(e=>state.officers[e.officerId]?.allegianceFactionId===state.playerFactionId).map(e=>({turn:e.turn,line:growthLogText(e)})),...recordNotices,...turnLog.map(line=>({turn:state.turn,line})),...lastFacilityResults.map(line=>({turn:state.turn,line})),...(lastUnitResult?[{turn:state.turn,line:lastUnitResult}]:[]));
  rows.push(...Object.values(v.ownCities).filter(c=>c.besieged).map(c=>({turn:state.turn,line:`${c.name} · 성 포위 중`})),...Object.values(v.ownArmies).filter(a=>a.supply?.state==='STARVING').map(a=>({turn:state.turn,line:`${v.officers[a.commanderId]?.name??'아군'} · 군량 0 · 굶주림 위험`})));
  const seenNews=new Set(newsArchive.map(r=>`${r.turn}:${r.line}`));for(const row of rows)if(Number.isFinite(row.turn)&&row.line&&!seenNews.has(`${row.turn}:${row.line}`)){newsArchive.push(row);seenNews.add(`${row.turn}:${row.line}`);}newsArchive=newsArchive.slice(-160);
  ({current:currentNews,all:allNews}=turnNews(newsArchive,state.turn));
  $('#turn-log').innerHTML=currentNews.map(line=>`<p>${esc(line)}</p>`).join('');
  drawMap(v);
  $('#cancel-move').hidden=!moveMode||combatAnimating||!selectedArmyId||!campaignMoveOptions(state,selectedArmyId).length;
  renderUnitMenu(v);positionUnitMenu();
  renderCityPanel(v);renderCaptives();renderSetTracker(v);renderCrisis(v);renderDejaVu(v);
  // 장수 명부: 카드 격자(얼굴 크롭 · 이름 · 역할 · 잠재 · Lv·경험 · 다섯 능력치 · 특기/전법)
  if(document.body?.classList?.contains?.('ink')){$('#officers').innerHTML=rosterInk(v);rosterInkArt();}
  else $('#officers').innerHTML=Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId).map(o=>{const g=o.growth??{},role=officerRole(v,o.officerId),face=faceOf(o.officerId),st=statsToOfficerPack(o.baseStats),pct=g.nextXp?Math.round(g.xp/g.nextXp*100):100;return `<article class="ro-card" style="--fc:${FACTION_STYLE[v.factionId]?.color}"><button class="ro-face" data-officer="${esc(o.officerId)}" title="장수 정보">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</button><div class="ro-body"><header><button class="ro-name" data-officer="${esc(o.officerId)}">${esc(o.name)}</button><span class="potential" data-rank="${g.potential??''}">${g.potential??''}</span><span class="ro-lv">Lv ${g.level??1}</span></header>${role?`<p class="ro-role">${esc(role)}</p>`:''}<div class="ro-xp"><i style="width:${pct}%"></i></div><dl class="ro-stats">${Object.entries(st).map(([k,x])=>`<dt>${esc({command:'지휘',valor:'무용',intellect:'지략',politics:'정무',charisma:'감화'}[k]??k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl><p class="ro-cards">${(g.cards??[]).slice(0,4).map(c=>`<small>${c.kind==='trait'?traitChip(c,o.officerId):`${esc(c.name)} ${c.rank}단계`}</small>`).join('')}</p></div></article>`;}).join('');
  renderGrowthDraft();renderEventCard(v);renderChoiceCard(v);renderTraitChoice();renderOfficerCard();renderFactionModal();renderDiplo();renderCouncil();
  renderShell(v);
  refreshOverlapAttack();
  if(stage.city)renderStage(v);
  bgm.scene(bgmScene(v));
}
// 흑묵 명부(기준 page-roster): 왼쪽 목록(둥근 얼굴 · 세 능력 막대 · 잠재) · 가운데 큰 그림 · 오른쪽 능력·특기 판. 고른 장수 = rosterPick
let rosterPick=null,rosterFilter='all';
// 명부 필터 줄(기준 page-roster 위 단추 줄): 전체 · 부대장 · 태수 · 대기 · 지략 80↑ · 무용 80↑
const RI_FILTERS=[['all','전체','mode-roster',()=>true],['army','부대장','cmd-attack',(o,r)=>r==='부대장'],['gov','태수','b-office',(o,r)=>r.startsWith('태수')],['idle','대기','cmd-wait',(o,r)=>r.startsWith('대기')],['wit','지략 80 이상','b-book',o=>(o.baseStats?.intelligence??0)>=80],['might','무용 80 이상','cmd-brace',o=>(o.baseStats?.might??0)>=80]];
const RI_STATS=[['leadership','지휘','r'],['might','무용','o'],['intelligence','지략','b'],['politics','정무','t'],['charisma','감화','g']];
function rosterInk(v){
 const all=Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId);
 if(!all.length)return '';
 const pct=x=>Math.max(0,Math.min(100,Number(x)||0)),role=o=>officerRole(v,o.officerId)||'대기',roleText=o=>{const r=role(o);return o.officerId===state.factions?.[state.playerFactionId]?.rulerId?`군주${(r.match(/ · .+$/)??[''])[0]}`:r;}; // roleText = 화면에 적는 맡은 일(군주는 '군주 · 성'). 분류(필터)는 role 그대로
 const fil=RI_FILTERS.find(f=>f[0]===rosterFilter)??RI_FILTERS[0],shown=all.filter(o=>fil[3](o,role(o))),list=shown.length?shown:all;
 const pick=list.find(o=>o.officerId===rosterPick)??list[0];rosterPick=pick.officerId;
 const filterBar=`<nav class="ri-filter">${RI_FILTERS.map(([id,label,ic])=>`<button data-rfilter="${id}" aria-pressed="${id===fil[0]}" title="${label}"><img src="/assets/ui-v3/hud/icons/${ic}.png" alt="${label}"></button>`).join('')}</nav>`;
 const rows=list.map(o=>{const st=o.baseStats??{},face=faceOf(o.officerId),g=o.growth??{};return `<button class="ri-row${o===pick?' on':''}" data-pick="${esc(o.officerId)}"><img class="row-art" src="/assets/ui-v3/hud/roster-row.png" alt=""><span class="disc">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</span><i class="rk" data-r="${esc(roleText(o))}" aria-hidden="true"></i><span class="nm"><b>${esc(o.name)}</b><small>${esc(roleText(o))}</small></span><span class="bars">${RI_STATS.slice(0,3).map(([k,l,c])=>`<i class="${c}" title="${l} ${esc(st[k]??'')}"><u style="width:${pct(st[k])}%"></u></i>`).join('')}</span><span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential??'')}</span></button>`;}).join('');
 const g=pick.growth??{},st=pick.baseStats??{},art=fullArt(pick.officerId),xp=g.nextXp?Math.round(g.xp/g.nextXp*100):100;
 const cards=(g.cards??[]).slice(0,3).map(c=>`<div class="card${c.kind==='trait'?' trait':''}"${c.text?` title="${esc(c.text)}"`:''}><span class="ring">${esc(String(c.name??'').slice(0,1))}</span><small>${esc(c.name)}${c.rank?` ${c.rank}단계`:''}</small></div>`).join('');
 const H='/assets/ui-v3/hud/',RI_IC={leadership:'mode-faction',might:'cmd-attack',intelligence:'b-book',politics:'b-office',charisma:'b-talk'};
 const bonds=list.filter(o=>o!==pick).map(o=>({o,r:relation(state,pick.officerId,o.officerId)})).sort((a,b)=>b.r.value-a.r.value).slice(0,3);
 const inkDetail=`<div class="ri-panel"><img class="pnl" src="${H}roster-detail.png" alt=""><b class="nm">${esc(pick.name)}</b><span class="meta"><span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential??'')}</span>${esc(roleText(pick))}</span>${RI_STATS.map(([k,l,c],i)=>`<span class="st s${i+1}" title="${l} ${esc(st[k]??'—')}"><img class="ic" src="${H}icons/${RI_IC[k]}.png" alt="${l}"><i class="${c}"><u style="width:${pct(st[k])}%"></u></i><b>${esc(st[k]??'—')}</b><small>${l}</small></span>`).join('')}${Array.from({length:3},(_,i)=>{const c=g.cards?.[i];return c?`<span class="sk k${i+1}${c.kind==='trait'?' trait':''}"${c.text?` title="${esc(c.text)}"`:''}><span class="ring">${esc(String(c.name??'').slice(0,1))}</span><small>${esc(c.name)}${c.rank?` ${c.rank}`:''}</small></span>`:`<span class="sk k${i+1} empty"><small>추가 카드 없음<br>레벨업으로 획득</small></span>`;}).join('')}<span class="lv"><small>Lv</small><b>${g.level??1}</b></span><span class="xp"><small>경험 ${xp}%</small><i><u style="width:${xp}%"></u></i></span>${bonds.map(({o,r},i)=>{const f=faceOf(o.officerId);return `<span class="bd b${i+1}" title="${esc(o.name)} · ${esc(r.displayName??'')} ${r.value}"><span class="disc">${f?`<img src="${esc(f)}" alt="">`:faceFallback(o.name)}</span><small>${esc(o.name)}</small></span>`;}).join('')}</div>${(()=>{const why=pick.officerId===v.social?.lordId?'':inputLocked()?'지금은 찾아갈 수 없습니다':socialReason(state,{type:'VISIT',officerId:pick.officerId,choice:0});return pick.officerId===v.social?.lordId?'':`<button class="ri-talk ri-banner" data-talk="${esc(pick.officerId)}"${why?' disabled':''} title="${esc(why||'찾아가 이야기한다 — 군주와 친밀도가 오른다(장수마다 한 달에 한 번)')}"><img src="${H}banner-red.png" alt=""><span><img class="ic" src="${H}icons/b-talk.png" alt="">${why&&/이미/.test(why)?'이번 달 만남':'찾아간다'}</span></button>`;})()}<button class="ri-info ri-banner" data-officer="${esc(pick.officerId)}"><img src="${H}banner-teal.png" alt=""><span><img class="ic" src="${H}icons/mode-roster.png" alt="">장수 정보</span></button>`; // 찾아간다 = 시안 page-roster 의 붉은 대화 단추(2026-10-11): 저택에 가지 않고 명부에서 바로 찾아가기(규칙은 저택의 찾아가기와 같음 — socialReason VISIT)
 return `<div class="ri-list">${filterBar}${rows}${shown.length?'':'<p class="ri-none">이 조건의 장수가 없어 모두 보여 줍니다.</p>'}</div><div class="ri-art" style="--fc:${FACTION_STYLE[v.factionId]?.color??'#777'}">${art?`<img src="${esc(art.src)}" alt="${esc(pick.name)}"${art.cut?'':' data-cut="1"'}>`:''}</div>${inkDetail}<div class="ri-detail"><header><b>${esc(pick.name)}</b><span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential??'')}</span><small>Lv ${g.level??1} · ${esc(role(pick))}</small></header><dl class="ri-stats">${RI_STATS.map(([k,l,c])=>`<dt>${l}</dt><dd class="${c}"><i><u style="width:${pct(st[k])}%"></u></i><b>${esc(st[k]??'—')}</b></dd>`).join('')}</dl><div class="ri-xp"><span>경험</span><i><u style="width:${xp}%"></u></i></div><div class="ri-cards">${cards||'<p class="emp">아직 익힌 특기·전법이 없습니다.</p>'}</div><button class="ri-info" data-officer="${esc(pick.officerId)}">장수 정보 자세히</button></div>`;
}
// 명부 큰 그림: 배경 지운 사본이 없으면 화면에서 지워 쓴다(시설 장면과 같은 방식)
function rosterInkArt(){const im=$('#officers')?.querySelector?.('.ri-art img[data-cut]');if(!im)return;const src=im.getAttribute?.('src');im.style.opacity='0';cutout(src).then(u=>{if(im.isConnected){if(u)im.src=u;im.style.opacity='';}});}
// ── 성 무대(정본 §23): 성 → 건물 → 시설 장면. 명령은 성 창(#city-panel)을 시설 장면 오른쪽에 옮겨 붙여 그대로 쓴다 ──
const stage={city:null,fac:null,art:null,artFor:null,transition:0,opening:false};
// 장수 전신: 배경 지운 사본(tools/art/officer-cutouts.py, ComfyUI BiRefNet)이 있으면 그것, 없으면 원본을 화면에서 지워 씀
let CUTOUT={G05:'G05.png',G07:'G07.png',G08:'G08.png'};
// 옷 두 벌(source.json 의 alts — 사용자 2026-10-10 "조운·제갈량만 초록 옷·흰 옷 2개 버전"): 장수 정보에서 바꿔 입히고 이 브라우저에 기억한다
let SEATED={}; // 주점 탁자에 앉은 그림이 있는 장수(source.json 의 seat) — id → 파일
let COSTUMES={};const costumeOf=id=>{try{return localStorage.getItem('sangoku.costume.'+id);}catch{return null;}};
// 장수 그림 검토 보기(?art=review): 닷토리 수정본·새 안을 채택 전에 실제 화면에서 본다 — adopted.json·기본 그림은 그대로. 안이 여럿이면 &G19=2 처럼 고른다(기본 1안)
const REVIEW_ART=(()=>{try{const q=new URLSearchParams(location.search);return q.get('art')==='review'?q:null;}catch{return null;}})();
fetch('/assets/officer-art/cutout/source.json').then(r=>r.ok?r.json():null).then(async j=>{if(j){CUTOUT=Object.fromEntries(Object.entries(j).map(([id,e])=>[id,e.file??`${id}.png`]));COSTUMES=Object.fromEntries(Object.entries(j).filter(([,e])=>e.alts?.length).map(([id,e])=>[id,[{id:'base',label:e.baseLabel??'기본',file:e.file},...e.alts]]));SEATED=Object.fromEntries(Object.entries(j).filter(([,e])=>e.seat?.file).map(([id,e])=>[id,e.seat.file]));for(const [id,list] of Object.entries(COSTUMES)){const pick=list.find(x=>x.id===costumeOf(id));if(pick)CUTOUT[id]=pick.file;}
 if(REVIEW_ART){const rv=await fetch('/assets/officer-art/cutout/review.json').then(r=>r.ok?r.json():null).catch(()=>null);for(const [id,files] of Object.entries(rv?.officers??{})){const k=Math.max(1,Math.min(files.length,Number(REVIEW_ART.get(id))||1));CUTOUT[id]=files[k-1];}document.body?.classList?.add?.('art-review');}
 if(state)render();}}).catch(()=>{});
// 지도 깃발판 얼굴: 배경 지운 사본이 있으면 그것(흰 배경 대신 세력색 판 위에)
const plateFaces=()=>({...Object.fromEntries(Object.keys(CUTOUT).map(id=>[id,{path:`/assets/officer-art/cutout/${CUTOUT[id]}`}])),...Object.fromEntries(Object.entries(portraits).map(([id,p])=>[id,CUTOUT[id]?{...p,path:`/assets/officer-art/cutout/${CUTOUT[id]}`}:p]))});
// 탐험 흔적 층위 — GPT 상담 원문(20261008) 15551행 정의, 사용자 2026-10-08 "탐험 흔적의 시대와 종류에 따라 나눈다, 꿈은 현대 문화 유물 같은 것"
//   史 첫 역사에 실제로 남은 것 · 傳 연의·설화 · 像 후대 신앙·희곡·그림 · 夢 현대 문화기억(아주 드묾). 사건별 배정은 Claude 시안(표시만, 게임 효과 없음)
const TRACE_LAYERS={史:{name:'사적',desc:'첫 역사에 실제로 남은 흔적'},傳:{name:'전적',desc:'연의·설화가 만든 흔적'},像:{name:'상적',desc:'후대의 신앙·희곡·그림이 만든 흔적'},夢:{name:'몽적',desc:'어디서 온 기억인지 알 수 없는 흔적'}};
const TRACE_LAYER={E01:'像',E02:'傳',E05:'傳',E08:'史',E03:'史',E04:'史'};
// 작은 얼굴(명부·결과·막대·목록): 배경 지운 사본이 있으면 그것
const faceOf=id=>CUTOUT[id]?`/assets/officer-art/cutout/${CUTOUT[id]}`:portraits[id]?.path;
const fullArt=id=>CUTOUT[id]?{src:`/assets/officer-art/cutout/${CUTOUT[id]}`,cut:true}:portraits[id]?.path?{src:portraits[id].path,cut:false}:null;
function stageNews(v,c){
 const name=c.name,lines=[...turnLog,...(state.administrationLog??[]).filter(e=>e.turn===state.turn).map(e=>e.text),...(state.orderLog??[]).filter(e=>e.turn===state.turn).map(e=>e.text)].filter(t=>String(t).includes(name));
 const out=lines.slice(-3).map(t=>({tag:'이번 차례',text:t}));
 if(c.currentProduction?.kind)out.push({tag:'생산',text:`${CITY_JOBS[c.currentProduction.kind]?.name??c.currentProduction.kind} 진행 중`});
 if((c.wanderers??[]).length)out.push({tag:'새 인물',text:`${c.wanderers.map(o=>o.name).join('·')}이(가) 주점에 머뭅니다`});
 return out;
}
const reduceMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
// 지도 → 성: 카메라가 그 성으로 파고들며 어두워지고(0.42초) 성 무대가 살짝 물러나며 밝아진다
async function openStage(cityId,fac=null){
 const v=view(state);if(!v.ownCities[cityId])return;
 const root=$('#city-stage'),game=$('#game'),wasHidden=!!root?.hidden;
 const city=$('#map')?.querySelector?.(`.w-city[data-city="${cityId}"]`)??$('#map')?.querySelector?.(`.w-cityplate[data-city="${cityId}"]`);
 let dive=null;
 if(wasHidden&&city&&game?.animate&&!reduceMotion()){const r=city.getBoundingClientRect(),pr=game.offsetParent?.getBoundingClientRect?.()??{left:0,top:0},tl=document.body.classList.contains('tilt'),ox=pr.left+game.offsetLeft+game.offsetWidth/2,oy=pr.top+game.offsetTop+game.offsetHeight*(tl?.7:.5); // 눕힌 지도(transform)와 겹치지 않게 scale·translate 낱 속성으로 — 성 자리로 당겨 들어간다
  dive=game.animate([{scale:'1',translate:'0px 0px',filter:'brightness(1)'},{scale:'2.1',translate:`${(-1.1*(r.left+r.width/2-ox)).toFixed(0)}px ${(-1.1*(r.top+r.height/2-oy)).toFixed(0)}px`,filter:'brightness(.22)'}],{duration:420,easing:'cubic-bezier(.55,0,.8,.2)',fill:'forwards'});}
 const transition=++stage.transition;stage.opening=true;
 stage.city=cityId;stage.fac=null;selectedCityId=null;$('#city-panel').hidden=true;renderFirstSortie(v);
 const art=stage.artFor!==cityId?loadStageArt(cityId,v3Asset,view(state).ownCities?.[cityId]?.ownerFactionId??'').then(a=>{stage.art=a;stage.artFor=cityId;}):null;
 await Promise.all([dive?.finished?.catch?.(()=>{}),art]);
 if(stage.city!==cityId||stage.transition!==transition){dive?.cancel?.();return;}
 stage.opening=false;
 if(root){root.hidden=false;root.classList?.remove('push','facility','focus');}
 renderStage(view(state));
 if(dive&&root?.animate)root.animate([{opacity:0,transform:'scale(1.07)'},{opacity:1,transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.2,.7,.2,1)'});
 dive?.cancel?.();
 if(fac)setTimeout(()=>{if(stage.city===cityId&&stage.transition===transition)enterFacility(fac);},120);
}
// 성 → 지도: 무대가 옅어지고 지도가 성에서 빠져나오듯 넓어진다
function closeStage(){
 const root=$('#city-stage'),game=$('#game');stage.transition++;stage.opening=false;stage.city=null;stage.fac=null;selectedCityId=null;renderFirstSortie(view(state));
 const panel=$('#city-panel');if(panel){panel.hidden=true;document.body?.appendChild?.(panel);}
 const finish=()=>{if(root&&!stage.city){root.classList?.remove('push','facility','focus');root.hidden=true;}};
 if(root&&!root.hidden&&root.animate&&!reduceMotion()){root.animate([{opacity:1},{opacity:0,transform:'scale(1.04)'}],{duration:240,easing:'ease-in'}).finished.then(finish,finish);game?.animate?.([{scale:'1.7',filter:'brightness(.25)'},{scale:'1',filter:'brightness(1)'}],{duration:560,easing:'cubic-bezier(.2,.7,.2,1)'});}
 else finish();
 if(state)render();
}
// 성 전경 아래 띠(기준 page-city-v2): 인구 · 치안 · 식량 · 하는 일 · 성 내구 — 있는 값만 보여 준다(새 규칙 없음)
function stageGauges(c){
 const kind=c.currentProduction?.kind,job=kind?CITY_JOBS[kind]:null,prog=kind?(c.jobProgress?.[kind]??c.productionProgress??0):0,raw=state.cities[c.cityId]??{},sec=c.economyForecast?.securityLevel??c.securityLevel??0;
 return [{ic:'mode-roster',label:'인구',pct:c.populationCapacity?c.population/c.populationCapacity*100:100,text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`,tone:'teal'},
  {ic:'cmd-brace',label:'치안',pct:[100,52,16][sec]??100,text:['안정','동요','혼란'][sec]??'',tone:'red'},
  {ic:'res-food',label:'식량',pct:c.foodCapacity?c.foodStock/c.foodCapacity*100:0,text:`${cityNumber(c.foodStock)}/${cityNumber(c.foodCapacity)}`,tone:'gold'},
  {ic:'res-production',label:job?`하는 일 · ${job.name}`:'하는 일',pct:job?.cost?prog/job.cost*100:0,text:job?job.name:'쉬는 중',tone:'blue'},
  ...(Number.isFinite(raw.durability)&&raw.durabilityMax?[{ic:'cmd-garrison',label:'성 내구',pct:raw.durability/raw.durabilityMax*100,text:`${Math.round(raw.durability)}/${raw.durabilityMax}`,tone:'bone'}]:[])];
}
// 성 안(2026-10-13 배치): 오른쪽 판의 수치 표와 아래 띠의 '지금 하는 일' — 화면에 이미 있던 값만 다시 나눠 담는다
// 태수 판에는 성의 값만(사용자 2026-10-14: 태수 개인 능력치는 뺀다). 막대 두 칸 = 내구 · 식량(찬 정도가 뜻이 있는 것), 목록 = 인구 · 생산 · 치안 · 예비병 · 포위
function stageStats(c){
 const f=c.economyForecast??{},sec=f.securityLevel??c.securityLevel??0,up=n=>Number.isFinite(n)&&n>0?`+${cityNumber(n)}`:'';
 return [{ic:'mode-roster',label:'인구',text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`},
  {ic:'res-production',label:'생산',text:up(f.production)||'0'},
  {ic:'cmd-brace',label:'치안',text:['안정','동요','혼란'][sec]??'',tone:['good','warn','bad'][sec]??''},
  {ic:'res-troops',label:'예비병',text:cityNumber(c.reserveTroops??0)},
  {ic:'cmd-garrison',label:'포위',text:c.besieged?'포위 중':'없음',tone:c.besieged?'bad':''}];
}
function stageLordGauges(c){
 const raw=state.cities[c.cityId]??{},f=c.economyForecast??{},out=[];
 if(Number.isFinite(raw.durability)&&raw.durabilityMax)out.push({label:'내구',value:raw.durability,max:raw.durabilityMax,text:`${Math.round(raw.durability)}/${raw.durabilityMax}`,tone:raw.durability<raw.durabilityMax/2?'low':''});
 else out.push({label:'인구',value:c.population,max:c.populationCapacity||c.population||1,text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`});
 out.push({label:'식량',value:c.foodStock,max:c.foodCapacity||1,text:`${cityNumber(c.foodStock)}/${cityNumber(c.foodCapacity)}`,hint:Number.isFinite(f.food)&&f.food?`차례마다 ${f.food>0?'+':''}${cityNumber(f.food)}`:''});
 return out;
}
function stageJob(c){
 const kind=c.currentProduction?.kind,job=kind?CITY_JOBS[kind]:null;if(!job)return {name:'쉬는 중',pct:0,text:'생산을 고르세요',idle:true};
 const est=c.jobs?.find(j=>j.kind===kind)?.estimate,turns=est?productionReadout(est).turns:null,prog=est?.progress??c.jobProgress?.[kind]??c.productionProgress??0,cost=est?.cost??job.cost??0;
 return {name:job.name,pct:cost?prog/cost*100:0,text:turns?`${turns}차례 남음`:''};
}
function renderStage(v){
 const root=$('#city-stage'),c=v.ownCities[stage.city];if(!root?.querySelector)return;
 if(!c||!stage.art){closeStage();return;}
 const people=cityPeople(v,c),idle=!!cityProductionBadge(c)?.idle,issues=cityIssues(v,c,people,{idle});
 const over=root.querySelector('.cs-over'),la=people.office?.officerId?fullArt(people.office.officerId):null;
 if(over)over.innerHTML=overviewHtml({v,c,art:stage.art,people,issues,date:campaignDate(v.turn),facilityState:{working:c.currentProduction?.kind?CITY_JOBS[c.currentProduction.kind]?.name:null,news:stageNews(v,c),gauges:stageGauges(c),stats:stageStats(c),lordGauges:stageLordGauges(c),job:stageJob(c)},portraits:plateFaces(),emblem:emblemHtml(v.factionId),lordArt:la?.src});
 if(over&&la&&!la.cut){const im=over.querySelector('.cs-lord .art img');if(im){im.style.opacity='0';cutout(la.src).then(u=>{if(im.isConnected){if(u)im.src=u;im.style.opacity='';}});}} // 태수 판 그림: 배경 지운 사본(시설 장면과 같은 방식)
 root.style?.setProperty?.('--fc',FACTION_STYLE[v.factionId]?.color??'#777');
 fitStageShift();
 requestAnimationFrame(fitCityMarkers);
 if(stage.fac)renderFacilityScene(v,c,people);
}
// 흑묵 성 전경: 오른쪽 태수 판이 건물 표지를 가리지 않게 그림을 왼쪽으로 민다(왼쪽 끝 표지는 화면 안에 남긴다)
function fitStageShift(){
 const over=$('#city-stage')?.querySelector?.('.cs-over'),lord=over?.querySelector?.('.cs-lord'),art=stage.art;
 if(!over?.style||!art?.full)return;
 const xs=Object.values(art.spots??{}).map(s=>s.x/art.w);
 if(!lord||!xs.length||!globalThis.innerWidth){over.style.removeProperty?.('--cs-shift');return;}
 const vw=innerWidth,W=Math.max(vw,innerHeight*art.w/art.h),x0=(vw-W)/2;
 const need=x0+Math.max(...xs)*W+48-lord.getBoundingClientRect().left,room=x0+Math.min(...xs)*W-40;
 over.style.setProperty('--cs-shift',`${Math.round(Math.max(0,Math.min(need,room)))}px`);
}
// C146: 태수 판은 그대로 두고 실제로 가려지는 시설 표지만 왼쪽으로 옮긴다.
function fitCityMarkers(){
 const over=$('#city-stage')?.querySelector?.('.cs-over'),lord=over?.querySelector?.('.cs-lord.v3');if(!lord)return;
 const panel=lord.getBoundingClientRect();
 for(const spot of over.querySelectorAll('.cs-spot')){
  spot.style.translate='';
  const marker=spot.querySelector('.mk')?.getBoundingClientRect(),label=spot.querySelector('.label')?.getBoundingClientRect(),parent=spot.parentElement;
  const boxes=[marker,label].filter(r=>r?.width&&r.top<panel.bottom&&r.bottom>panel.top),right=Math.max(0,...boxes.map(r=>r.right));
  if(right>panel.left-12&&parent?.offsetWidth){const scale=parent.getBoundingClientRect().width/parent.offsetWidth;spot.style.translate=`${-Math.ceil((right-panel.left+12)/(scale||1))}px 0`;}
 }
}
globalThis.addEventListener?.('resize',()=>{if(stage.city){fitStageShift();fitCityMarkers();}});
function renderFacilityScene(v,c,people){
 const root=$('#city-stage'),host=root?.querySelector('.cs-facility');if(!host)return;
 const id=stage.fac,b=BUILDINGS[id],who=people[id]??(['market','granary','workshop','gate'].includes(id)?people.office:null);
 const art=who?.officerId?fullArt(who.officerId):null; // 재야 장수도 그림이 있으면 크게
 const portraitsFull={...(who&&art?{[who.officerId]:{full:art.src}}:{})};
 const others=[people.office,people.barracks,people.tavern,people.residence].filter(o=>o&&o!==who).slice(0,3).map(o=>({name:o.name,note:Object.entries(people).find(([,x])=>x===o)?.[0]?BUILDINGS[Object.entries(people).find(([,x])=>x===o)[0]]?.name:''}));
 const line=who?(memoryLines[who.officerId]??({office:'성의 일은 제가 살피고 있습니다.',barracks:'병사들은 언제든 나설 수 있습니다.',tavern:'이곳엔 소문이 먼저 닿습니다.',residence:'오셨습니까.'}[id]??'')):'';
 {const keep=$('#city-panel');if(keep&&host.contains?.(keep))document.body?.appendChild?.(keep);} // 다시 그릴 때 성 창이 장면과 함께 지워지지 않게(방문 대화 뒤 업무판이 비던 문제)
 host.innerHTML=facilityHtml({c,id,officer:who,line,bg:v3Asset(`city-stage/facility-${id}.webp`),art:stage.art,spot:stage.art.spots[id],portraits:portraitsFull,others});
 if(art&&!art.cut){const im=host.querySelector('.cs-officer img');if(im){im.style.opacity='0';cutout(art.src).then(u=>{if(u&&im.isConnected){im.src=u;im.style.opacity='';}});}}
 const slot=host.querySelector('.cs-commands'),panel=$('#city-panel');
 if(slot&&panel){slot.appendChild(panel);selectedCityId=stage.city;cityTab=b.pane;renderCityPanel(v);panel.hidden=false;}
}
function enterFacility(id){
 const root=$('#city-stage');if(!BUILDINGS[id]||!root)return;
 const s=stage.art?.spots?.[id],cam=root.querySelector('.cs-camera');
 if(cam&&s){cam.style.transformOrigin=`${(s.x/stage.art.w*100).toFixed(2)}% ${(s.y/stage.art.h*100).toFixed(2)}%`;cam.style.setProperty('--push',id==='office'?'2.2':'2.6');}
 stage.fac=id;root.classList?.add('push');
 renderFacilityScene(view(state),view(state).ownCities[stage.city],cityPeople(view(state),view(state).ownCities[stage.city]));
 setTimeout(()=>root.classList?.add('facility'),260);
}
function leaveFacility(){
 const root=$('#city-stage');stage.fac=null;selectedCityId=null;
 const panel=$('#city-panel');if(panel){panel.hidden=true;document.body?.appendChild?.(panel);}
 root?.classList?.remove('facility');setTimeout(()=>root?.classList?.remove('push'),120);
}
$('#city-stage')?.addEventListener('click',e=>{
 if(e.target.closest?.('.cs-world')){closeStage();return;}
 if(e.target.closest?.('.cs-back')){leaveFacility();return;}
 const entry=e.target.closest?.(':is(.cs-roster .entry,.cs-cast .face-btn,.cs-lord .act,.cs-lord .art,.cs-pulse .cs-job)[data-spot]');
 if(entry){const id=entry.dataset.spot,root=$('#city-stage'),s=stage.art?.spots?.[id],cam=root?.querySelector('.cs-camera');if(cam&&s)cam.style.transformOrigin=`${(s.x/stage.art.w*100).toFixed(2)}% ${(s.y/stage.art.h*100).toFixed(2)}%`;root?.querySelector(`.cs-spot[data-spot="${id}"]`)?.classList?.add('on');root?.classList?.add('focus');const city=stage.city,transition=stage.transition;setTimeout(()=>{if(stage.city!==city||stage.transition!==transition)return;root?.classList?.remove('focus');enterFacility(id);},520);return;}
 const spot=e.target.closest?.('.cs-spot[data-spot]');if(spot&&!stage.fac){enterFacility(spot.dataset.spot);}
});
document.addEventListener('keydown',e=>{if(e.key==='Alt'&&stage.city){$('#city-stage')?.classList?.add('alt');e.preventDefault?.();}});
document.addEventListener('keyup',e=>{if(e.key==='Alt')$('#city-stage')?.classList?.remove('alt');});
// 새 화면 둘레: 세계 다이얼 · 군사 한마디 · 모드 막대 · 보고 수(새 차례 첫 화면에서 보고가 있으면 펼침)
let reportSeenTurn=null;
// C129: guidance follows production and stops after the first attack.
const turnCountText=n=>!Number.isFinite(n)?'생산 회복 후':n===2?'두 차례':`${n}차례`;
function musterTurns(c){
 const gain=Math.round(c31Muster(state,c.ownerFactionId)*uniqueProgress(state,c,cityEconomyRates(state,c).production));
 return gain>0?Math.max(1,Math.ceil((cityJobCost(state,c,'muster')-(c.productionProgress??0)-(c.c33?.advanceProduction??0))/gain)):null;
}
function firstSortieText(v){
 if(state.uiFirstAttackDone||(state.combatLog??[]).some(e=>['ATTACK','CITY','TACTIC','JOINT_TACTIC'].includes(e.kind)&&e.enemyLoss>0&&state.armies[e.attackerId]?.factionId===state.playerFactionId))return '';
 const armies=Object.values(v.ownArmies),jobs=Object.values(v.ownCities).filter(c=>c.currentProduction?.kind==='muster');
 if(armies.some(a=>state.armies[a.armyId]?.bornTurn===state.turn))return '나온 다음 차례에 이동해 공격하십시오.';
 if(!armies.length&&jobs.length){const turns=jobs.map(c=>musterTurns(state.cities[c.cityId])).filter(n=>n!==null);return turns.length?`${turnCountText(Math.min(...turns))} 뒤 부대가 나옵니다.`:'생산이 없어 출진 준비가 중단됐습니다.';}
 if(!armies.length)return stage.city?'병영에서 출진을 지정하십시오.':'먼저 성에 들어가십시오.';
 return '';
}
function renderFirstSortie(v){const text=firstSortieText(v),p=$('#first-sortie-guide'),city=$('#city-sortie-guide');if(p){p.textContent=text;p.hidden=!text||!!stage.city;$('#status').hidden=!!text;}if(city){city.textContent=text;city.hidden=!text||!stage.city;}}
// 대상 고르기 중 위 가운데 안내 한 줄: 攻 공격 · 術 전법 · 向 방향
function renderHint(){
 const h=$('#w-hint');if(!h)return;const who=state?.officers?.[state?.armies?.[selectedArmyId]?.commanderId]?.name;let kind=null,g='',t='';
 if(selectedTacticId&&selectedArmyId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);kind='tactic';g='전법';t=`${who?who+' · ':''}${card?.name??'전법'} — 대상을 고르세요`;}
 else if(attackMode&&selectedArmyId){kind='attack';g='공격';t=`${who?who+' 부대 · ':''}공격할 적 부대나 성을 고르세요`;}
 else if(faceMode&&selectedArmyId){kind='face';g='정면';t=`${who?who+' 부대 · ':''}바라볼 쪽의 칸을 고르세요`;}
 h.hidden=!kind;if(!kind)return;h.dataset.kind=kind;h.querySelector('i').textContent=g;h.querySelector('span').textContent=t;
}
function renderShell(v){
 renderHint();renderWorldDial(v.turn);renderAdvisor(v,plateFaces());renderCampaignAdvice(v);renderFirstSortie(v);renderModeRail();
 renderHud(v);
 const lines=$('#turn-log')?.children?.length??0,count=$('#report-toggle .count');if(count)count.textContent=lines?String(lines):'';
 if(reportSeenTurn!==v.turn&&state?.phase==='PLAYER'){reportSeenTurn=v.turn;$('#w-report')?.classList?.toggle('open',lines>0);}
}
// 흑묵 지도 HUD(기준 그림 final-map-v2 를 에셋으로 새로 짬 — hud-ink.mjs). 옛 HUD 는 숨긴 채 값·단추만 빌려 쓴다. ?hud=old 면 옛 HUD
// C138: command meaning follows the existing map click decision.
let commandIntent='';
let commandIntentCache=null;
function setCommandIntent(line){
 commandIntent=line;
 if(!line)commandIntentCache=null;
 for(const node of document.querySelectorAll?.('.ih-intent,.ih-intent-full')??[]){node.textContent=line;node.title=line;}
}
function renderCampaignAdvice(v){
 const box=$('#w-advisor .say');if(!box)return;
 let line=$('#campaign-advice');if(!line){line=document.createElement('p');line.id='campaign-advice';box.append(line);}
 line.textContent=noFieldArmyText(v);line.hidden=!line.textContent;
 const status=$('#status');if(status)status.textContent=campaignHorizonText(status.textContent,v.turn,CAMPAIGN_TURN_LIMIT);
}
function showCommandIntent(tileId,cityId){
 if(!tileId||!selectedArmyId){setCommandIntent('');return;}
 if(commandIntentCache?.state===state&&commandIntentCache.armyId===selectedArmyId&&commandIntentCache.tileId===tileId&&commandIntentCache.cityId===cityId&&commandIntentCache.tactic===selectedTacticId&&commandIntentCache.face===faceMode)return;
 commandIntentCache={state,armyId:selectedArmyId,tileId,cityId,tactic:selectedTacticId,face:faceMode};
 const v=view(state),target=mapTarget(selectedArmyId,tileId,cityId),city=v.ownCities[cityId]??v.knowledge.cities[cityId];
 const enemy=v.knowledge.observedArmies[target.targetId],name=enemy?v.officers[enemy.commanderId]?.name??'적':city?.name??'가리킨 칸';
 if(selectedTacticId){const c=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId),id=c?.targets.find(id=>(state.armies[id]??state.cities[id])?.tileId===tileId);setCommandIntent(id?commandIntentText(target,{name,tactic:c.name}):'');return;}
 if(faceMode){setCommandIntent('가리킨 쪽으로 정면 변경 · 이동 대신 바라보는 쪽만 바꿈');return;}
 const ownCity=!!v.ownCities[cityId],atCity=state.armies[selectedArmyId]?.tileId===tileId;
 const to=['strike','approach'].includes(target.kind)?target.via:tileId;
 const route=['unit','city'].includes(target.kind)||ownCity&&atCity?null:orderRoute(state,selectedArmyId,to);
 const blocked=ownCity&&atCity?garrisonReason(state,selectedArmyId)?reasonText(garrisonReason(state,selectedArmyId)):'':!route&&!['unit','city','strike','approach'].includes(target.kind)?routeExplanation(selectedArmyId,to,null):'';
 setCommandIntent(commandIntentText(target,{name,ownCity,atCity,blocked,turns:route?routeTurns(state,selectedArmyId,route):null}));
}
const HUD_TONE={F01:'red',F02:'green',F03:'blue'};
let inkHudMounted=false;
let inkBandState=null;
function renderHud(v){
 const root=$('#ink-hud');if(!root||!document.body?.classList?.contains?.('ink')||new URLSearchParams(location.search).get('hud')==='old')return;
 if(!inkHudMounted){inkHudMounted=true;document.body.classList.add('ink-hud');mountInkHud(root,{has:rel=>!!v3Asset(rel)});}
 root.hidden=false;
 if(inkBandState!==state){document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));inkBandState=state;}
 const want=HUD_TONE[v.factionId]??'red',tone=v3Asset(`hud/officer-${want}.png`)?want:'red';
 const a=selectedArmyIds.length<=1?v.ownArmies[selectedArmyId]:null,bars=[];
 if(a){const max=state.armies[a.armyId]?.maxTroopCount??a.troopCount,sup=a.supply;
  bars.push({pct:max?a.troopCount/max*100:100,text:Number(a.troopCount).toLocaleString('ko-KR'),title:`병력 ${a.troopCount}/${max}`,tone:'red'});
  bars.push({pct:{STEADY:100,SHAKEN:50,ROUTING:12}[a.morale]??100,text:MORALE_NAME[a.morale]??'',title:'사기',tone:'bone'});
  if(sup)bars.push({pct:sup.max?(sup.stock??0)/sup.max*100:0,text:`${food1(sup.stock??0)}/${food1(sup.max??0)}`,title:`휴대 군량 · 보급 ${SUPPLY_LABEL[sup.state]??sup.state}${sup.model==='clock'?(sup.draining?' · 줄어드는 중':' · 보급권 안 — 줄지 않음'):''}`,tone:'teal'});}
 renderInkHud(root,{bandSelected:selectedTacticId??(faceMode?'face':attackMode?'attack':moveMode?'move':null),garrisonWhy:a?reasonText(garrisonReason(state,a.armyId)||''):'',remaining:Object.values(v.ownArmies).filter(u=>!armyActionEnded(state,u.armyId)).length,todo:councilPending(state)+(pendingCampaignDraft(state)?1:0)+(v.pendingEvent?1:0),ratings:a?campaignUnitRatings(state,a.armyId):null,bandMeta:a?`${TROOP_NAME[troopToCampaign(a.troopType)]??a.troopType} · 병력 ${a.troopCount}`:'',bandStatus:a?{morale:{text:MORALE_NAME[a.morale],warn:a.morale!=='STEADY'},formation:{text:`전열 ${FORMATION_NAME[a.formation??'ORDERED']??'정돈'}`,warn:a.formation!=='ORDERED'},supply:{text:a.supply?.stock<=0&&a.supply?.draining?'굶주림':a.supply?.draining?`${food1(a.supply.turnsLeft)}차례분 · 줄어드는 중`:'보급권 안',warn:!!a.supply?.draining}}:null,factionId:v.factionId,factionName:FACTION_STYLE[v.factionId]?.name,factionColor:FACTION_STYLE[v.factionId]?.color,tone,turn:endedTurn(v.turn),date:campaignDate(endedTurn(v.turn)),left:$('#turn')?.dataset?.left??'',mode:v3Mode(),summary:$('#summary')?.textContent,currentNews,allNews,unitBars:bars,commandIntent,food:foodSnapshot(v),foodChange:lastFoodChange,unitResult:lastUnitResult,facilityResults:lastFacilityResults,combatHistory:recentCombats,recruitmentCount:(v.revealedWanderers??[]).length,unitStatus:a?{id:a.armyId,actions:selectedActions(a.armyId),action:armyActionEnded(state,a.armyId)?'이번 턴 행동 완료':state.movedArmyIds.includes(a.armyId)?'이동함 · 주 행동 확인':'행동 가능',formation:FORMATION_NAME[a.formation??'ORDERED']??'정돈'}:null,council:councilPending(state)});
}
// 소속 장수 역할(어게인스트 더 스톰·올드 월드 초상 목록처럼 누가 어디서 무엇을 하는지 한눈에)
function officerRole(v,id){
 const army=Object.values(v.ownArmies).find(a=>a.commanderId===id);if(army)return '부대장';
 const gov=Object.values(v.ownCities).find(c=>c.governorId===id);if(gov)return `태수 · ${gov.name}`;
 const free=Object.values(v.ownCities).find(c=>(c.freeOfficers??[]).some(o=>o.officerId===id));return free?`대기 · ${free.name}`:'';
}
const RARITY_NAME=CAMPAIGN_RARITY_NAMES;
const CARD_ART_ICON={지휘:'command',무용:'valor',지략:'intellect',정무:'politics',감화:'charisma',기병:'troops',보병:'troops',궁병:'troops',창병:'troops',도검:'troops'};
function renderFactionModal(){
 const modal=$('#faction-modal');if(!modal||modal.hidden||!state)return;
 const v=view(state),p=v.policy,r=v.research,style=FACTION_STYLE[v.factionId],cityName=id=>v.ownCities[id]?.name??v.knowledge.cities[id]?.name??id;
 const own=p?.facilities?.filter(f=>f.factionId===v.factionId||p.unlocks?.some(u=>u.kind===f.kind))??[];
 $('#faction-title').innerHTML=`${esc(style.name)}군`;
 const ruler=v.faction?.rulerId,rArt=ruler?fullArt(ruler):null;
 const side=`<aside class="fx-side" style="--fc:${style.color}">${emblemHtml(v.factionId,'lg')}${rArt?`<img class="fx-ruler" src="${esc(rArt.src)}" alt="" data-cut="${rArt.cut?1:0}">`:''}<p class="fx-ruler-name">${esc(v.officers[ruler]?.name??style.name)}<small>군주</small></p><dl class="fx-nums"><dt>성</dt><dd>${Object.keys(v.ownCities).length}</dd><dt>장수</dt><dd>${Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId).length}</dd><dt>인망</dt><dd>${v.faction?.prestige??0}</dd></dl></aside>`;
 $('#faction-content').innerHTML=p?`<section class="fp-policy"><p class="fp-slot">세력 정책 · ${esc(p.slot)} 고정</p><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p></section>
 <h3>고유 시설</h3><ul class="fp-list">${own.map(f=>`<li>${UI_ICON(JOB_ICON[f.kind]??'build')}<b>${esc(f.name)}</b> <span>${esc(f.description)} · 생산 ${f.cost} 소모</span><small>${f.cityIds.length?`지을 수 있는 성: ${f.cityIds.map(id=>esc(cityName(id))).join(', ')}`:'지을 수 있는 성 없음'}</small></li>`).join('')||'<li>없음</li>'}</ul>
 ${p.unlocks?.length?`<h3>편입제국 해금</h3><ul class="fp-list">${p.unlocks.map(u=>`<li><b>${esc((p.facilities.find(f=>f.kind===u.kind)??CITY_JOBS[u.kind])?.name??u.kind)}</b> <span>${u.turn}턴 · ${u.cityIds.map(id=>esc(cityName(id))).join(', ')}</span></li>`).join('')}</ul>`:''}
 ${v.factionId==='F02'?`<h3>피란 대열</h3>${p.refugees?.length?`<ul class="fp-list">${p.refugees.map(x=>`<li><b>주민 ${x.population??0} · 예비병 ${x.reserveTroops??0}</b> <span>${(x.officerIds??[]).length?'장수 '+x.officerIds.map(id=>esc(v.officers[id]?.name??id)).join(', '):''}</span></li>`).join('')}</ul>`:'<p class="muted">없음 — 성을 잃으면 주민 절반·예비병·자유 장수가 가까운 성으로 탈출합니다.</p>'}`:''}
 ${p.actions?.length?`<h3>별의 길 행동</h3><ul class="fp-list">${p.actions.map(a=>`<li><b>${esc(v.officers[a.officerId]?.name??a.officerId)} · ${a.role==='ARMY'?'부대장':'태수'}</b> <span>${esc(a.axis)} → ${esc(a.name)}: ${esc(a.description)}</span><small>${a.canUse?'지금 쓸 수 있음':a.readyTurn>state.turn?`대기 ${a.readyTurn-state.turn}턴`:esc(reasonText(a.blockedReason))}</small></li>`).join('')}</ul>`:''}`:'<p class="muted">이 지도에서는 세력 정책이 꺼져 있습니다.</p>';
 $('#faction-content').innerHTML=`<div class="fx-grid">${side}<div class="fx-main">${$('#faction-content').innerHTML}${recruitmentLeadsHtml(v)}${diplomacySection(v)}</div></div>`;
 {const im=$('#faction-content .fx-ruler');if(im&&im.dataset.cut==='0'){im.style.opacity='0';cutout(im.getAttribute('src')).then(u=>{if(im.isConnected){im.src=u??im.src;im.style.opacity='';}});}}
 if(r)$('#faction-content .fx-main').innerHTML+=`<h3>연구</h3><p>과학 ${Math.round(r.science??0)}${Number.isFinite(r.nextThreshold)?` / 다음 문턱 ${r.nextThreshold}`:' · 모든 단계 해금'} · ${r.stage}단계</p>${r.unlocks?.length?`<p class="muted">해금: ${r.unlocks.map(u=>esc(u.name??u)).join(' · ')}</p>`:''}`;
}
$('#faction-content')?.addEventListener('click',e=>{
 const cityId=e.target.closest('[data-known-recruit-city]')?.dataset.knownRecruitCity;
 if(!cityId||!state)return;
 const v=view(state);
 if(!(v.revealedWanderers??[]).some(x=>x.cityId===cityId)||!(v.ownCities[cityId]||v.knowledge?.cities?.[cityId]))return;
 $('#faction-modal').hidden=true;openCity(cityId);
});
// C22 사건 카드(올드 월드식): 그림 · 제목 · 장소 · 글 · 선택지(결과 미리보기). 성장 Draft 가 먼저.
const EVENT_SCALE={SITUATION:'상황',EVENT:'사건',INCIDENT:'돌발',CRISIS:'위기'};
// 선택 카드 그림(닷토리 B5 여덟 장: 돌격·수비·질주·설득·보급·백성·대기·퇴각) — 사건별 짝, 표에 없는 사건은 선택지 글의 낱말로 고른다. 화면 표시만(규칙과 무관)
const EV_CARD={E01:['supply','persuade','people','wait'],E02:['supply','ride','guard'],E03:['people','supply','retreat'],E04:['people','charge','guard'],E05:['charge','persuade','wait'],E06:['ride','persuade','guard']};
const EV_CARD_WORD=[['charge',/돌격|공격|결집|선봉|싸울/],['guard',/수비|방비|지킨|방어|늦춘|다스/],['ride',/질주|나누어|추격|밀어붙|객장/],['persuade',/협약|위탁|설득|군의|연합|맡긴/],['supply',/식량|수송|군량|보급|농우/],['people',/백성|주민|받아들|함께|마을/],['retreat',/퇴각|물러|길만|버리/],['wait',/미룬|관망|대기/]];
function eventBlockedText(reason){
 const p=state.c22?.pending[state.playerFactionId],c=state.cities[p?.cityId],need=/^(식량|인망|예비병) (\d+) 필요$/.exec(reason);
 if(need){const n=Number(need[2]);if(need[1]==='식량'&&c){const now=domesticFoodAvailable(state,c),local=Math.max(0,c.foodStock-(c.reservedResources?.food??0)),scope=now===local?'이 성의':'공유 창고의';return `${scope} 쓸 수 있는 식량이 모자랍니다(필요 ${n} · 지금 ${cityNumber(now)})`;}
 if(need[1]==='예비병'&&c)return `이 성의 예비병이 모자랍니다(필요 ${n} · 지금 ${cityNumber(c.reserveTroops)})`;
 if(need[1]==='인망')return `쓸 수 있는 인망이 모자랍니다(필요 ${n} · 지금 ${cityNumber(state.factions[state.playerFactionId].prestige-(state.captiveRecruitment?.factions[state.playerFactionId]?.reservedPrestige??0))})`;
 }
 if(reason==='임명할 장수 없음')return '이 사건의 후보 중 우리 세력 소속으로 이 성에 머무는 장수가 필요합니다(살아 있고 포로·이동·부대 지휘 중이 아닌 장수).';
 return reasonText(reason);
}
function renderEventCard(v=view(state)){
 const modal=$('#event-modal');if(!modal)return;
 const e=v.pendingEvent;modal.hidden=!e||combatAnimating||!!state.gameResult||!!pendingCampaignDraft(state);if(modal.hidden)return;
 menuOpen=false;$('#unit-menu').hidden=true;
 const crisis=e.scale==='CRISIS'||e.eventId==='CRISIS_HEGEMONY';
 {const k=crisis?'CRISIS':e.eventId;$('#event-art').src=v3Asset(`events/${k}.webp`)??`/assets/event-art/${esc(k)}_v1.jpg`;}
 $('#event-scale').textContent=EVENT_SCALE[e.scale]??'사건';$('#event-scale').className='ev-scale'+(crisis?' crisis':'');
 $('#event-title').textContent=e.title;
 $('#event-place').textContent=[e.cityName,...(e.officerNames??[])].filter(Boolean).join(' · ');
 $('#event-text').textContent=e.text;
 // 흑묵(page-event): 두 사람 판 — 이 일에 얽힌 장수(없으면 군주)의 얼굴·이름·능력 셋
 {const duo=$('#event-duo');if(duo){const byName=n=>Object.values(state.officers).find(o=>o.name===n&&o.allegianceFactionId===state.playerFactionId)??Object.values(state.officers).find(o=>o.name===n);
  const gov=Object.values(v.ownCities??{}).find(c=>c.name===e.cityName)?.governorId;
  const ids=[...new Set([...(e.officerNames??[]).map(n=>byName(n)?.officerId),gov,state.factions?.[state.playerFactionId]?.rulerId].filter(Boolean))].slice(0,2);
  duo.hidden=ids.length<2;duo.innerHTML=ids.map((id,i)=>{const o=state.officers[id],st=o?.baseStats??{},f=faceOf(id);return `<span class="who w${i+1}"><span class="pic">${f?`<img src="${esc(f)}" alt="">`:''}</span><b>${esc(o?.name??'')}</b>${['leadership','might','intelligence'].map((k,j)=>`<i class="b${j+1}"><u style="width:${Math.max(0,Math.min(100,st[k]??0))}%"></u></i>`).join('')}</span>`;}).join('');}}
 // 흑묵(page-event): 선택지 = 그림 카드(창 = 선택 그림 또는 사건 그림 한 조각) + 각 카드 바로 아래 비용·효과 미리보기
 const evArt=$('#event-art').src,n=e.choices.length,fx=x=>esc(x.blockedReason?eventBlockedText(x.blockedReason):x.preview);
 $('#event-choices').style?.setProperty?.('--n',n);
 $('#event-choices').innerHTML=e.choices.map((c,i)=>{const card=v3Asset(`cards/${EV_CARD[e.eventId]?.[i]??EV_CARD_WORD.find(([,re])=>re.test(c.label))?.[0]??'wait'}.webp`);return `<button class="ev-choice${card?' has-card':''}" data-event-choice="${esc(c.id)}" title="${fx(c)}" style="--art:url(${card??evArt});--pos:${n>1?Math.round(i/(n-1)*100):50}%" ${c.blockedReason||inputLocked()?'disabled':''}><span class="ev-card-face"><span class="key">${i+1}</span><b>${esc(c.label)}</b></span><small>${fx(c)}</small></button>`;}).join('');
}
$('#event-choices')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-event-choice]')?.dataset.eventChoice,ev=state&&view(state).pendingEvent;if(!id||!ev)return;
 try{state=step(state,{type:'EVENT_CHOICE',eventId:ev.eventId,choiceId:id});$('#event-error').textContent='';render();scheduleOrders();autoNextUnit();}catch(err){$('#event-error').textContent=errorText(err);}});
// 외교(C43) — 세력 창 '외교' 칸 + 받은 제안은 선택 창. 화면은 다시 만들 예정이라 기능 확인용
function supplyDuration(n){if(!Number.isFinite(n)||n<0)return '';if(n>0&&n<0.1)return '0.1차례분 미만';return `${Number.isInteger(n)?'':'약 '}${food1(n)}차례분`;}
const SUPPLY_LABEL={SAFE:'안전',DISRUPTED:'불안',CUT:'끊김',STARVING:'굶주림'},food1=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const DIPLO_KIND={TRUCE:'휴전',ALLIANCE:'동맹'},DIPLO_STATE={WAR:'전쟁',TRUCE:'휴전',ALLIANCE:'동맹'};
const DIPLO_TEXT={TRUCE:'다음 차례부터 3차례 동안 서로 공격하지 않고 상대 땅에 새로 들어가지 않습니다. 상대 땅에 있던 부대는 철수하는 동안 보호받습니다.',ALLIANCE:'서로 공격하지 않습니다. 자동으로 함께 싸우지는 않습니다.'};
function diplomacySection(v){
 const d=v.diplomacy;if(!d)return '';
 const btn=(f,kind)=>{const c=f.canPropose?.[kind];if(!c)return '';const tip=[c.reason,...(c.effectLines??[]),Number.isFinite(c.score)?`받을 점수 ${c.score}(0 이상이면 받음)`:''].filter(Boolean).join('\n');return `<button class="btn sm" data-diplo-propose="${esc(f.factionId)}" data-kind="${kind}" ${c.ok&&!inputLocked()?'':'disabled'} title="${esc(tip)}">${DIPLO_KIND[kind]} 제안</button>`;};
 const bar=(label,val,min,max,cls='')=>{const pct=Math.max(0,Math.min(100,((val??0)-min)/(max-min)*100));return `<span class="dp-bar ${cls}"><small>${label}</small><i><b style="width:${pct.toFixed(0)}%"></b>${min<0?'<s></s>':''}</i><em>${val??'—'}</em></span>`;};
 const medal=f=>{const rf=faceOf(state.factions?.[f.factionId]?.rulerId);return `<span class="dp-medal">${rf?`<img src="${esc(rf)}" alt="">`:''}<i class="flag" style="--em:url(/assets/ui-v3/emblems/${esc(f.factionId)}.png)"></i></span>`;}; // 흑묵(page-diplomacy): 군주 둥근 메달 + 세력 깃발
 const card=f=>`<li class="dp-card" data-state="${esc(f.state)}" style="--fc:${FACTION_STYLE[f.factionId]?.color??'#777'}"><header>${medal(f)}${emblemHtml(f.factionId)}<b>${esc(f.name??FACTION_STYLE[f.factionId]?.name??f.factionId)}</b><em class="dp-state">${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}</em></header>${f.contact===false?'<p class="muted">아직 만나지 않았습니다.</p>':''}<div class="dp-bars">${bar('우리를 보는 마음',f.opinionOfMe,-100,100,'op'+((f.opinionOfMe??0)<0?' neg':''))}${bar('신용',f.trust,0,100,'tr')}${bar('위협',f.threat,0,100,'th'+((f.threat??0)>=50?' neg':''))}</div>${(f.opinionReasons??[]).length?`<ul class="dp-why">${f.opinionReasons.map(x=>`<li><span>${esc(x.text)}</span><b class="${x.value<0?'neg':''}">${x.value>0?'+':''}${x.value}</b>${Number.isFinite(x.turnsLeft)?`<small>${x.turnsLeft}차례</small>`:''}</li>`).join('')}</ul>`:''}<footer>${f.contact===false?'':f.state==='ALLIANCE'?`<button class="btn sm" data-diplo-end="${esc(f.factionId)}" ${f.endingAt||inputLocked()?'disabled':''}>동맹 종료</button>`:btn(f,'TRUCE')+btn(f,'ALLIANCE')}</footer></li>`;
 const rows=(d.factions??[]).map(card).join('');const rowsOld=(d.factions??[]).map(f=>`<li class="dp-row" data-state="${esc(f.state)}"><span class="emblem" data-faction="${esc(f.factionId)}">${FACTION[f.factionId]?.glyph??'中'}</span><b>${esc(f.name??FACTION_STYLE[f.factionId]?.name??f.factionId)}</b><em class="dp-state">${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}</em><span class="dp-acts">${f.contact===false?'<small>아직 만나지 않음</small>':`${f.state==='ALLIANCE'?`<button class="btn sm" data-diplo-end="${esc(f.factionId)}" ${f.endingAt||inputLocked()?'disabled':''}>동맹 종료</button>`:btn(f,'TRUCE')+btn(f,'ALLIANCE')}`}</span>${Number.isFinite(f.opinionOfMe)?`<div class="dp-axes"><span class="dp-op" title="이 세력이 나를 보는 마음(−100~100)">나를 보는 호감 <b class="${f.opinionOfMe>=0?'up':'down'}">${f.opinionOfMe>0?'+':''}${f.opinionOfMe}</b></span>${Number.isFinite(f.trust)?`<span title="약속을 지키면 오르고 기습·배신하면 떨어짐">신용 <b>${f.trust}</b></span>`:''}${Number.isFinite(f.threat)?`<span title="성을 빼앗을수록 오름 — 50 이상이면 다른 세력이 견제 동맹">위협 <b class="${f.threat>=50?'down':''}">${f.threat}</b></span>`:''}</div>${(f.opinionReasons??[]).length?`<ul class="dp-reasons">${f.opinionReasons.map(r=>`<li><span>${esc(r.text)}</span><b class="${r.value>=0?'up':'down'}">${r.value>0?'+':''}${r.value}</b><small>${Number.isFinite(r.turnsLeft)?`${r.turnsLeft}차례`:'계속'}</small></li>`).join('')}</ul>`:''}`:''}${['TRUCE','ALLIANCE'].map(k=>f.canPropose?.[k]?.ok&&f.canPropose[k].effectLines?.length?`<small class="dp-why">${DIPLO_KIND[k]}: ${esc(f.canPropose[k].effectLines.join(' · '))}${Number.isFinite(f.canPropose[k].score)?` → ${f.canPropose[k].score}`:''}</small>`:'').join('')}</li>`).join('');
 const prot=(d.protectedArmies??[]).length?`<p class="muted">철수 보호 중: ${d.protectedArmies.map(a=>`${esc(v.officers[v.ownArmies[a.armyId]?.commanderId]?.name??a.armyId)}(${a.until}턴까지)`).join(', ')}</p>`:'';
 const me=d.me?`<p class="dp-me">우리 신용 <b>${d.me.trust}</b> · 우리 위협 <b class="${d.me.threat>=50?'down':''}">${d.me.threat}</b> <small>(위협 50 이상이면 다른 세력들이 견제 동맹)</small></p>`:'';
 return `<h3>외교</h3>${me}<ul class="dp-cards">${rows||'<li class="muted">외교 상대 없음</li>'}</ul>${prot}<p class="muted">휴전 3차례 · 동맹은 서로 공격 금지(자동 참전 없음) · 거절되면 같은 제안은 3차례 뒤에</p>`;
}
// ── 평정(기준 final-council-v2) — 엔진 campaign-council(C90), 화면 council-world.mjs. 왼쪽 '평정' 단추로 엶 ──
let councilOpen=false;
function renderCouncil(){
 const host=$('#council');if(!host)return;host.hidden=!councilOpen||!state;if(host.hidden)return;
 const me=state.playerFactionId;
 renderCouncilWorld(host,state,{dispatch:cmd=>{state=step(state,cmd);},rerender:()=>render(),close:()=>{councilOpen=false;render();},fullArt:id=>fullArt(id),face:id=>faceOf(id),cutout,
  bg:v3Asset('city-stage/facility-council.webp')??v3Asset('city-stage/facility-office.webp'),factionColor:FACTION_STYLE[me]?.color,toast:msg=>{const s=$('#status');if(s)s.textContent=msg;}});
}
document.addEventListener?.('ink:council',()=>{if(!state)return;councilOpen=true;renderCouncil();});
document.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&councilOpen){if(councilEscape($('#council')))renderCouncil();else{councilOpen=false;renderCouncil();}}});
// ── 흑묵 외교 화면(기준 page-diplomacy): 지도 그림 위 군주 메달 · 관계 판 · 행동 카드 · 관계 막대 — 전부 그림판. 고른 세력 = diploPick ──
let diploOpen=false,diploPick=null;
const hueOfHex=hex=>{const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex??'');if(!m)return 0;const [r,g,b]=m.slice(1).map(x=>parseInt(x,16)/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return 0;const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return Math.round(h*60+360)%360;};
function renderDiplo(){
 const host=$('#diplo');if(!host)return;host.hidden=!diploOpen||!state;if(host.hidden)return;
 const v=view(state),d=v.diplomacy,H='/assets/ui-v3/hud/',IC=n=>`<img src="${H}icons/${n}.png" alt="">`;
 if(!d){host.innerHTML=`<p class="dq-msg">이 판에서는 외교가 꺼져 있습니다.</p><button class="dq-close" data-diplo-close title="닫기 (Esc)"><img src="${H}city-btn.png" alt=""><b>✕</b></button>`;return;}
 const fs=d.factions??[],pick=fs.find(f=>f.factionId===diploPick)??fs.find(f=>f.contact!==false)??fs[0];diploPick=pick?.factionId??null;
 const pc=(val,min,max)=>Math.max(0,Math.min(100,((val??0)-min)/(max-min)*100)).toFixed(0);
 const nameOf=f=>f.name??FACTION_STYLE[f.factionId]?.name??f.factionId;
 const medal=fid=>{const face=faceOf(state.factions?.[fid]?.rulerId);return `<span class="dq-medal" style="--bst:url(/assets/ui-v3/hud/faction-beast-${esc(fid)}.png)"><span class="disc">${face?`<img src="${esc(face)}" alt="">`:''}</span><img class="fr" src="${H}dip-medal.png" style="filter:hue-rotate(${(hueOfHex(FACTION_STYLE[fid]?.color)-8+360)%360}deg)" alt=""><img class="em" src="/assets/ui-v3/hud/faction-banner-${esc(fid)}.png" alt="" onerror="this.onerror=null;this.src='/assets/ui-v3/emblems/${esc(fid)}.png'"></span>`;};
 const plate=(rows,st)=>`<span class="dq-plate"><img class="pl" src="${H}dip-plate.png" alt="">${rows.map(([ic,label,val,p,cls],i)=>`<i class="ico i${i+1}">${IC(ic)}</i><i class="bar b${i+1} ${cls}" title="${label} ${val??'—'}"><u style="width:${p}%"></u></i>`).join('')}<i class="st">${st?IC(st):''}</i></span>`;
 const STATE_IC={ALLIANCE:'mode-diplomacy',TRUCE:'b-treaty',WAR:'cmd-attack'};
 const stateText=f=>`${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}`;
 const me=`<div class="dq-lord me">${medal(v.factionId)}<b class="nm">${esc(FACTION_STYLE[v.factionId]?.name??'')}<small>우리</small></b>${plate([['res-fame','인망',v.faction?.prestige??0,pc(v.faction?.prestige??0,0,100),'fm'],['cmd-brace','우리 신용',d.me?.trust,pc(d.me?.trust,0,100),'tr'],['cmd-attack','우리 위협',d.me?.threat,pc(d.me?.threat,0,100),'th']],null)}</div>`;
 const others=fs.map((f,i)=>`<button class="dq-lord p${i+1}${f===pick?' on':''}${f.contact===false?' far':''}" data-diplo-pick="${esc(f.factionId)}" data-state="${esc(f.state)}">${medal(f.factionId)}<b class="nm">${esc(nameOf(f))}<small>${f.contact===false?'아직 만나지 않음':esc(stateText(f))}</small></b>${plate([['b-heart','우리를 보는 마음',f.opinionOfMe,pc(f.opinionOfMe,-100,100),(f.opinionOfMe??0)<0?'neg':'op'],['cmd-brace','신용',f.trust,pc(f.trust,0,100),'tr'],['cmd-attack','위협',f.threat,pc(f.threat,0,100),'th']],STATE_IC[f.state])}</button>`).join('');
 const act=(kind,ic,tone)=>{const c=pick?.canPropose?.[kind];if(!c)return '';const tip=[c.reason,...(c.effectLines??[]),Number.isFinite(c.score)?`받을 점수 ${c.score}(0 이상이면 받음)`:''].filter(Boolean).join('\n');return `<button class="dq-act" data-diplo-propose="${esc(pick.factionId)}" data-kind="${kind}" ${c.ok&&!inputLocked()?'':'disabled'} title="${esc(tip)}"><img class="cd" src="${H}dip-act-${tone}.png" alt="">${IC(ic)}<span>${DIPLO_KIND[kind]} 제안</span></button>`;};
 const farAct=(kind,ic)=>`<button class="dq-act" disabled title="아직 만나지 않은 세력입니다 — 부대나 성이 닿으면 제안할 수 있습니다"><img class="cd" src="${H}dip-act-teal.png" alt="">${IC(ic)}<span>${DIPLO_KIND[kind]} 제안</span></button>`; // 만나기 전에도 무엇을 할 수 있는지는 보인다(기준 page-diplomacy 가운데 깃발 줄)
 // 가운데 깃발 줄 = 늘 네 장(시안 page-diplomacy: 선물 · 악수 · 문서 · 칼, 2026-10-11). 규칙에 있는 일만 켜진다 — 선물은 아직 규칙이 없어 꺼진 채 자리만, 칼 = 동맹 종료(동맹일 때만)
 const off=(ic,tone,label,tip)=>`<button class="dq-act" disabled title="${esc(tip)}"><img class="cd" src="${H}dip-act-${tone}.png" alt="">${IC(ic)}<span>${label}</span></button>`;
 const endAct=pick?.state==='ALLIANCE'?`<button class="dq-act" data-diplo-end="${esc(pick.factionId)}" ${pick.endingAt||inputLocked()?'disabled':''} title="동맹을 끝냅니다"><img class="cd" src="${H}dip-act-red.png" alt="">${IC('cmd-attack')}<span>동맹 종료</span></button>`:off('cmd-attack','red',pick?.state==='TRUCE'?'휴전 중':'전쟁 중',pick?.state==='TRUCE'?'휴전 중입니다 — 휴전이 끝나면 다시 싸울 수 있습니다':'지금 전쟁 상태입니다 — 동맹을 맺으면 여기서 끝낼 수 있습니다');
 const g=pick?.canGift,gift=g?`<button class="dq-act" data-diplo-gift="${esc(pick.factionId)}" ${g.ok&&!inputLocked()?'':'disabled'} title="${esc([g.reason,...(g.effectLines??[])].filter(Boolean).join('\n'))}"><img class="cd" src="${H}dip-act-teal.png" alt="">${IC('b-gift')}<span>선물</span></button>`:off('b-gift','teal','선물','선물을 보낼 상대가 없습니다'); // 선물(C59): 인망을 써서 그 세력이 우리를 보는 마음을 올린다 — 수치는 시험값(docs/design-data/diplomacy-gift-v0.1.json)
 const acts=!pick?'':pick.contact===false?gift+farAct('ALLIANCE','mode-diplomacy')+farAct('TRUCE','b-treaty').replace('dip-act-teal','dip-act-bone').replace('class="dq-act"','class="dq-act bone"')+off('cmd-attack','red','전쟁 중','아직 만나지 않은 세력입니다'):gift+(pick.state==='ALLIANCE'?off('mode-diplomacy','teal','동맹 중','지금 동맹입니다'):act('ALLIANCE','mode-diplomacy','teal')||off('mode-diplomacy','teal','동맹 제안','지금은 제안할 수 없습니다'))+(pick.state==='ALLIANCE'?off('b-treaty','bone','휴전','동맹 중에는 휴전이 필요 없습니다').replace('class="dq-act"','class="dq-act bone"'):(act('TRUCE','b-treaty','bone')||off('b-treaty','bone','휴전 제안','지금은 제안할 수 없습니다')).replace('class="dq-act"','class="dq-act bone"'))+endAct;
 const op=pick?.opinionOfMe??0,nOp=Math.min(5,Math.ceil(Math.abs(op)/20)),segOn=k=>op>0?k<5&&4-k<nOp:op<0?k>=5&&k-5<nOp:false; // 가운데에서 왼쪽 = 우호(청록), 오른쪽 = 적대(주홍)
 const meter=pick?`<div class="dq-meter"><img class="mt" src="${H}dip-meter.png" alt=""><i class="ring"><img src="/assets/ui-v3/emblems/${esc(pick.factionId)}.png" alt="" onerror="this.remove()"></i><i class="segs">${Array.from({length:10},(_,k)=>`<u class="${segOn(k)?'on':''} ${k<5?'hi':'lo'}"></u>`).join('')}</i></div><p class="dq-why"><b>${esc(nameOf(pick))}</b> · 우리를 보는 마음 <b class="${op<0?'neg':''}">${op>0?'+':''}${op}</b>${(pick.opinionReasons??[]).slice(0,4).map(x=>` · ${esc(x.text)} <b class="${x.value<0?'neg':''}">${x.value>0?'+':''}${x.value}</b>`).join('')}</p>`:'';
 const LP=[[18,36],[81.5,36],[14,72],[84.5,72],[33,76],[67,76]],links=`<svg class="dq-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${fs.map((f,i)=>f.contact===false||!LP[i]?'':`<line x1="50" y1="27" x2="${LP[i][0]}" y2="${LP[i][1]}" data-state="${esc(f.state)}" class="${f===pick?'on':''}"/>`).join('')}</svg>`; // 관계 줄(기준 page-diplomacy 점선)
 host.innerHTML=`${links}${me}${others}<div class="dq-acts">${acts}</div>${meter}<p class="dq-msg" role="status"></p><p class="dq-note">선물은 인망을 써서 우리를 보는 마음을 올린다 · 휴전 3차례 · 동맹은 서로 공격 금지(자동 참전 없음) · 거절되면 같은 제안은 3차례 뒤에</p><button class="dq-close" data-diplo-close title="닫기 (Esc)"><img src="${H}city-btn.png" alt=""><b>✕</b></button>`;
}
$('#diplo')?.addEventListener?.('click',e=>{if(!state)return;
 if(e.target.closest?.('[data-diplo-close]')){diploOpen=false;renderDiplo();return;}
 const pk=e.target.closest?.('[data-diplo-pick]');if(pk){diploPick=pk.dataset.diploPick;renderDiplo();return;}
 const b=e.target.closest?.('[data-diplo-propose],[data-diplo-end],[data-diplo-gift]');if(!b||b.disabled||inputLocked())return;
 const cmd=b.dataset.diploGift?{type:'DIPLO_GIFT',factionId:b.dataset.diploGift}:b.dataset.diploPropose?{type:'DIPLO_PROPOSE',factionId:b.dataset.diploPropose,kind:b.dataset.kind}:{type:'DIPLO_END_ALLIANCE',factionId:b.dataset.diploEnd};
 try{state=step(state,cmd);render();}catch(err){const m=$('#diplo')?.querySelector?.('.dq-msg');if(m)m.textContent=errorText(err);}});
document.addEventListener?.('ink:diplomacy',()=>{if(!state)return;diploOpen=true;renderDiplo();});
document.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&diploOpen){diploOpen=false;renderDiplo();}});
// 선택 창 — 탐험 조사 결과(C42) 등. 사건 카드 모양 재사용(화면은 다시 만들 예정이라 기능 확인용)
function pendingChoice(v){
 const d=v.turn<CAMPAIGN_TURN_LIMIT?v.diplomacy?.incoming?.[0]:null; // C137: next-turn agreement must fit the campaign
 if(d)return {kind:'외교',art:factionEmblem(d.from),artKind:'emblem',title:`${d.fromName??d.from}의 ${DIPLO_KIND[d.kind]??d.kind} 제안`,place:`다음 차례(${v.turn+1}차례)부터 적용`+(Number.isFinite(d.expiresTurn)?` · ${d.expiresTurn}차례까지 답변`:''),text:DIPLO_TEXT[d.kind]??'',choices:[{id:'yes',label:'받아들인다',preview:DIPLO_TEXT[d.kind]??''},{id:'no',label:'거절한다',preview:'같은 제안은 3차례 동안 다시 오지 않습니다'}],send:id=>({type:'DIPLO_RESPOND',proposalId:d.proposalId,accept:id==='yes'})};
 const a=v.achievements?.pending;
 if(a){
  const CAT={boost:'강화',special:'전문화',open:'개방'},card=achPick&&a.cards?.find(c=>c.cardId===achPick);
  if(card&&(card.targets?.length??0)>1)return {kind:'주요 성과',title:`${a.name} — ${card.name}`,place:'대상을 고르세요',text:card.effectLine??'',turnsLeft:a.turnsLeft,
   choices:[...card.targets.map(t=>({id:'t:'+t.id,label:t.name,preview:t.effectLine??''})),{id:'back',label:'다른 카드 보기',preview:''}],
   send:id=>{if(id==='back'){achPick=null;return null;}const tid=id.slice(2);achPick=null;return {type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:card.cardId,...(card.target==='CITY'?{cityId:tid}:{officerId:tid})};}};
  return {kind:'주요 성과',title:a.name,place:a.queued?`대기 중인 성과 ${a.queued}개 더`:'',text:'보상 하나를 고르세요. 판 안에서만 유지됩니다.',turnsLeft:a.turnsLeft,
   choices:(a.cards??[]).map(c=>({id:c.cardId,label:`${c.name} · ${CAT[c.category]??''}`,preview:c.effectLine??''})),
   send:id=>{const c=a.cards.find(x=>x.cardId===id);if(c&&(c.targets?.length??0)>1){achPick=id;return null;}const t=c?.targets?.[0];return {type:'ACHIEVEMENT_CHOICE',achievementId:a.achievementId,cardId:id,...(t?(c.target==='CITY'?{cityId:t.id}:{officerId:t.id}):{})};}};
 }
 const x=v.exploration?.pending;
 const disc=x&&(v3Asset(`discovery/${x.eventId}.webp`)??(x.eventId?null:v3Asset('discovery/unknown.webp'))); // 발견 그림이 있으면 장면, 없으면 지도 미니어처
 if(x)return {kind:'흔적을 발견했습니다',layer:TRACE_LAYER[x.eventId]??null,art:disc??v3MapOptions().siteArt?.[x.placeId]??v3Asset('sites/unknown.png'),artKind:disc?'scene':'site',title:x.name??'빈 곳',place:[x.officerName,x.placeId].filter(Boolean).join(' · '),text:x.scene??'',turnsLeft:x.turnsLeft,choices:(x.choices??[]).map(c=>({id:c.choiceId,label:c.text,preview:c.effectLine})),send:id=>({type:'EXPLORE_CHOICE',placeId:x.placeId,choiceId:id})};
 return null;
}
function renderChoiceCard(v=view(state)){
 const modal=$('#choice-modal');if(!modal)return;
 const c=state.phase==='PLAYER'&&!combatAnimating&&!state.gameResult&&!pendingCampaignDraft(state)&&!v.pendingEvent?pendingChoice(v):null;
 modal.hidden=!c;if(!c)return;
 // 흑묵: 장면 그림이 없는 선택 창(외교 제안 · 주요 성과 · 그림 없는 발견)도 사건 창과 같은 구도 — 배경 장면 + 오른쪽 먹 판. 외교는 제안한 군주의 원판, 발견은 그 자리 미니어처를 장면 위에 얹는다
 const sceneBg=document.body?.classList?.contains?.('ink')&&c.artKind!=='scene'?(c.kind==='외교'?v3Asset('scenes/diplomacy-bg.webp'):c.kind==='주요 성과'?v3Asset('scenes/chronicle-bg.webp'):v3Asset('discovery/unknown.webp')):null;
 if(modal.dataset)modal.dataset.kind=c.kind==='외교'?'diplo':c.kind==='주요 성과'?'feat':'find';
 const dipFrom=sceneBg&&c.kind==='외교'?v.diplomacy?.incoming?.[0]?.from:null,dipFace=dipFrom&&faceOf(state.factions?.[dipFrom]?.rulerId);
 const over=!sceneBg?'':dipFrom?`<span class="choice-medal" style="${dipFace?`--face:url(${esc(dipFace)});`:''}--em:url(/assets/ui-v3/emblems/${esc(dipFrom)}.png);--hue:${(hueOfHex(FACTION_STYLE[dipFrom]?.color)-8+360)%360}deg"><i class="disc"></i><i class="fr"></i><i class="em"></i></span>`:c.artKind==='site'&&c.art?`<span class="choice-prop" style="--prop:url(${esc(c.art)})"></span>`:'';
 {const card=modal.querySelector('.w-event'),fig=$('#choice-art'),art=sceneBg??c.art;card?.classList?.toggle('no-art',!art);if(fig){fig.hidden=!art;fig.className=`w-event-art choice-art ${sceneBg?'scene':c.artKind??''}`;fig.innerHTML=art?`<img src="${esc(art)}" alt="">${over}${c.layer?`<span class="trace-seal" data-layer="${c.layer}" title="${esc(TRACE_LAYERS[c.layer]?.desc??'')}">${c.layer}</span>`:''}`:'';}}
 {const k=$('#choice-kind'),L=c.layer&&TRACE_LAYERS[c.layer];if(L){k.innerHTML=`${esc(c.kind)} · <b data-layer="${c.layer}">${c.layer} ${L.name}</b>`;k.title=L.desc;}else{k.textContent=c.kind;k.title='';}}$('#choice-title').textContent=c.title;
 $('#choice-place').textContent=c.place+(Number.isFinite(c.turnsLeft)?` · ${c.turnsLeft}차례 안에 고르세요(안 고르면 첫 번째)`:'');
 $('#choice-text').textContent=c.text;
 {const n=c.choices.length,scene=sceneBg??(c.artKind==='scene'&&c.art); // 흑묵(page-event 구도): 선택 카드 창 = 장면 그림 한 조각, 각 카드 바로 아래 비용·효과 미리보기
  $('#choice-list').style?.setProperty?.('--n',n);
  $('#choice-list').innerHTML=c.choices.map((x,i)=>`<button class="ev-choice" data-choice="${esc(x.id)}" title="${esc(x.preview??'')}"${scene?` style="--art:url(${esc(scene)});--pos:${n>1?Math.round(i/(n-1)*100):50}%"`:''} ${inputLocked()?'disabled':''}><span class="ev-card-face"><span class="key">${i+1}</span><b>${esc(x.label)}</b></span><small>${esc(x.preview??'')}</small></button>`).join('');}
}
$('#choice-list')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-choice]')?.dataset.choice,c=state&&pendingChoice(view(state));if(!id||!c)return;
 try{const cmd=c.send(id);if(!cmd){renderChoiceCard(view(state));return;}state=step(state,cmd);$('#choice-error').textContent='';render();autoNextUnit();}catch(err){$('#choice-error').textContent=errorText(err);}});
function growthLogText(e){return e.kind==='awakening'?e.text.replace(/ \d+단계(?: · 효과 준비 중)?$/,' 각성'):e.text;}
function renderGrowthDraft(){
 const pending=pendingCampaignDraft(state),modal=$('#growth-modal');
 modal.hidden=!pending||combatAnimating||!!state.gameResult;if(modal.hidden)return;
 menuOpen=false;$('#unit-menu').hidden=true;$('#attack-preview').hidden=true;
 if(draftPick&&!pending.cards.some(c=>c.traitId===draftPick))draftPick=null;
 const r=state.campaignGrowth.officers[pending.officerId],level=pending.draft.contextSnapshot.levelAfter;
 const officer=state.officers[pending.officerId],face=portraits[pending.officerId]?.path;
 const collapse=recordNotices.findLast(x=>x.turn===state.turn&&x.line.includes(`${officer.name} 중상`));
 $('#growth-collapse').textContent=collapse?.line??'';$('#growth-collapse').hidden=!collapse;
 $('#growth-title').innerHTML=`<span>${esc(officer.name)} <small>Lv ${level - 1} → ${level}</small></span><span class="potential" data-rank="${esc(r.potential)}" title="이번 판 포텐">${esc(r.potential)}</span>`;
 // 레벨업 창 왼쪽 전신 그림(하데스·파이어 엠블렘·다키스트 던전 구도). 그림이 없으면 먹 실루엣.
 const line=memoryLines[pending.officerId];
 $('#growth-art').innerHTML=`${face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(officer.name,FACTION_STYLE[officer.allegianceFactionId]?.color)}</span>`}<figcaption><i class="gp-face"${faceOf(pending.officerId)?` style="--face:url(${esc(faceOf(pending.officerId))})"`:''}></i><b>${esc(officer.name)}</b><small>Lv ${level - 1} → ${level}</small><i class="gp-pot potential" data-rank="${esc(r.potential)}">${esc(r.potential)}</i>${line?`<q>${esc(line)}</q>`:''}${face?'':'<em>초상 준비 중</em>'}</figcaption>`;
 {const im=$('#growth-art img'),art=officer&&fullArt(officer.officerId);if(im&&art){im.style.opacity='0';cutout(art.src).then(u=>{if(im.isConnected){im.src=u??art.src;im.style.opacity='';}});}}
 $('#growth-status').textContent=(officer.injury?`부대가 무너졌습니다 — ${officer.name} 중상 · ${injuryReturnText(state.turn,view(state).officers[officer.officerId]?.injury)}. `:'')+(pending.draft.c29?.awakening?`고유 특기 각성 — ${pending.cards.length}갈래 중 1개를 고르세요.`:`레벨업 — ${level%5===0?'전법':'특기'} ${pending.cards.length}장 중 1장을 고르세요. ${level%5===0?'얻은 전법의 장착 상태는 장수 정보에서 확인하세요.':'같은 특기는 다시 고르면 강해집니다(최대 5단계).'}`)+(pendingStrike?' 선택을 마치면 예약한 공격을 이어갑니다(Esc 취소).':'');
 const cardUse=c=>{const v=view(state),r=state.campaignGrowth.officers[pending.officerId],base=c.kind==='awakening'&&c.rule==='STEADY_UP'?r.cards[r.coreId]:c;return growthUseText(base,{field:Object.values(v.ownArmies).some(a=>a.commanderId===pending.officerId),governor:Object.values(v.ownCities).some(city=>city.governorId===pending.officerId),domesticRules:GROWTH_DOMESTIC_RULES,combatRules:GROWTH_COMBAT_RULES});};
 const c28=pending.draft.c28,bonus=c28?.bonusRerolls??0,cardHtml=c=>`<button class="draft-card reveal${c.traitId===draftPick?' picked':''}" data-rarity="${esc(c.rarity)}" data-draft-pick="${esc(c.traitId)}"><span class="kind">${UI_ICON(c.kind==='stat'?'stat-up':['trait','tactic'].includes(c.kind)?c.kind:c.kind==='fork'?'tactic':'trait')}${(c.kind==='awakening'?`각성 · ${{steady:'정석',narrative:'서사',wild:'변칙'}[c.branch]??''}`:c.kind==='fork'?'갈래':c.modifier?'전법 변형':{stat:'능력',trait:'특기',tactic:'전법'}[c.kind]??'특기')} · <span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span></span><span class="art">${UI_ICON(c.kind==='awakening'?'trait':CARD_ART_ICON[c.classTag]??(c.kind==='stat'?'stat-up':c.kind))}</span><h3>${esc(c.name)}</h3>${cardOrigin(c)?`<span class="origin">유래 ${esc(cardOrigin(c))}</span>`:''}<p>${esc(draftDescription(c,pending.officerId))}</p>${cardUse(c)?`<p class="card-use">${esc(cardUse(c))}</p>`:''}<span class="foot"><span>${esc(c.kind==='awakening'?'고유 특기 각성':c.sourceText??c.classTag??'고유 경로')}</span><span class="tier">${c.rank?`${c.rank}단계 → ${c.rank+1}단계`:'신규'}</span></span></button>`;
 $('#growth-cards').innerHTML=pending.cards.map(c=>c28?`<div class="draft-slot" data-slot="${esc(c.slot??'')}">${c.slot?`<span class="slot-tag">${esc(c.slot)}</span>`:''}${cardHtml(c)}<button class="card-reroll" data-card-reroll="${esc(c.traitId)}" ${(c.rerollsRemaining??0)+bonus<1?'disabled':''}>다시 뽑기 · ${(c.rerollsRemaining??0)}${bonus?` (+${bonus})`:''}</button></div>`:cardHtml(c)).join('');
 const draft=pending.draft,limit=draft.rerollLimit??1;
 $('#growth-reroll').hidden=!!draft.c28;
 $('#growth-reroll').disabled=draft.rerollCount>=limit||r.track.growthStates[pending.officerId].aptitudePoints<1||draft.eligibleCandidateSnapshot.filter(c=>!draft.offeredIds.includes(c.traitId)).length<1;
 $('#growth-reroll').textContent=draft.rerollCount>=limit?'다시 뽑기 사용 완료':`다시 뽑기 · ${limit-draft.rerollCount}회`;
 // 흑묵(final-draft 아래 줄): 지금 가진 특기·전법 여섯 칸 + 확정 단추
 {const hv=$('#growth-have'),cf=$('#growth-confirm'),have=(view(state).officers?.[pending.officerId]?.growth?.cards??[]).slice(0,6);
  if(hv)hv.innerHTML=Array.from({length:6},(_,i)=>{const h=have[i];return `<li class="${h?(h.kind==='trait'?'trait':'tactic'):'empty'}"${h?` title="${esc(h.name)}${h.rank?` ${h.rank}단계`:''}"`:''}>${h?esc(String(h.name??'').slice(0,1)):''}</li>`;}).join('');
  if(cf){cf.disabled=!draftPick;cf.title=draftPick?'고른 카드로 정합니다':'카드를 먼저 고르세요';}}
}
let bindChoice=null,draftPick=null; // draftPick: 흑묵 레벨업 창에서 먼저 골라 둔 카드(확정 전)
function showBindChooser(pending,traitId){
 const r=state.campaignGrowth.officers[pending.officerId],card=r.cards[traitId],targets=c29BindingTargets(state,pending.officerId,card);
 bindChoice={draftId:pending.draft.draftId,traitId};
 $('#growth-error').innerHTML=targets.length?`<span class="bind-ask">「${esc(card.name)}」을 묶을 전법 — 그 전법 재사용 대기 +${card.params?.extraCooldown?2:1}</span>${targets.map(k=>`<button class="bind-opt" data-bind-tactic="${esc(k)}">${esc(r.cards[k]?.name??k)}</button>`).join('')}`:'묶을 수 있는 장착 전법이 없습니다.';
}
$('#growth-error').addEventListener('click',e=>{const t=e.target.closest?.('[data-bind-tactic]')?.dataset.bindTactic;if(t&&bindChoice){const b=bindChoice;bindChoice=null;command({type:'DRAFT_PICK',draftId:b.draftId,traitId:b.traitId,tacticId:t});}});
$('#growth-cards').addEventListener('click',e=>{
 const rerollId=e.target.closest('[data-card-reroll]')?.dataset.cardReroll;
 if(rerollId){const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId,traitId:rerollId});return;}
 const traitId=e.target.closest('[data-draft-pick]')?.dataset.draftPick,pending=state&&pendingCampaignDraft(state);
 if(traitId&&pending){
   if(document.body?.classList?.contains?.('ink-hud')&&$('#growth-confirm')&&draftPick!==traitId){draftPick=traitId;renderGrowthDraft();return;} // 흑묵: 먼저 고르고(밝게 뜸), 확정 단추나 같은 카드를 한 번 더 눌러 정한다
   draftPick=null;
   if(state.campaignGrowth.officers[pending.officerId]?.cards[traitId]?.modifier){showBindChooser(pending,traitId);return;}
   if(needsTraitResolution(state,pending.officerId,traitId)){traitChoice={draftId:pending.draft.draftId,officerId:pending.officerId,traitId,mode:null,selected:[],resolutions:[]};renderTraitChoice();}
   else command({type:'DRAFT_PICK',draftId:pending.draft.draftId,traitId});
 }
});
$('#growth-reroll').addEventListener('click',()=>{const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId});});
$('#growth-confirm')?.addEventListener?.('click',()=>{const b=draftPick&&[...document.querySelectorAll('#growth-cards [data-draft-pick]')].find(x=>x.dataset.draftPick===draftPick);b?.click?.();});
function cardOrigin(c){return c?.origin??c?.formerName??'';}
function traitChip(c,id){const tip=[id?cardDescription(c,id):playerText(c.text),cardOrigin(c)&&`유래 ${cardOrigin(c)}`].filter(Boolean).join(' · ');return `<span class="trait-chip${c.core?' unique':''}" data-rarity="${esc(c.rarity)}"${tip?` title="${esc(tip)}"`:''}><b>●</b>${esc(c.name)} ${c.rank}단계</span>`;}
// 한 판 결과: 날짜·턴·전투 수·남은 성, 내 장수들의 성장(포텐·Lv·특기·전법)
// 연대기 띠: 일어선 곳 · 내 세력의 사건 선택 · 얻은 성 · 위기 · 장수 칭호 · 끝
function chronicleEntries(){
 const me=state.playerFactionId,f=state.factions[me],out=[],cn=id=>state.cityDisplayNames?.[id]??state.cities[id]?.name??id;
 out.push({turn:1,kind:'start',text:`${state.officers[f?.rulerId]?.name??factionName(me)}, ${cn(f?.capitalCityId)}에서 일어서다`});
 for(const x of state.c22?.fired??[])if(x.factionId===me){const e=C22_EVENTS.find(e=>e.eventId===x.eventId),c=e?.choices.find(c=>c.id===x.choiceId);if(e)out.push({turn:x.turn,kind:'event',text:`${e.title}${c?` — ${c.label}`:''}`});}
 for(const [id,x] of Object.entries(state.c22?.captures??{}))if(x.factionId===me&&state.cities[id]?.ownerFactionId===me)out.push({turn:x.turn,kind:'city',text:`${josa(cn(id)+'을(를)')} 얻다`});
 if(state.c31?.actorId&&state.c31.startTurn)out.push({turn:state.c31.startTurn,kind:'crisis',text:`${state.officers[state.c31.actorId]?.name??''}의 ${state.c31.name??'위기'}${state.c31.resolved?` — ${state.c31.resolved==='TIMEOUT'?'지나감':'막아냄'}`:''}`});
 const titles=[];for(const [id,r] of Object.entries(state.campaignGrowth?.officers??{}))if(state.officers[id]?.allegianceFactionId===me)for(const t of r.titles??[])titles.push({turn:t.turn,kind:'title',text:`${state.officers[id].name} — ‘${t.name}’`});
 titles.sort((a,b)=>a.turn-b.turn);
 const room=Math.max(3,13-out.length),step=Math.max(1,Math.ceil(titles.length/room));out.push(...titles.filter((_,i)=>i%step===0).slice(0,room));
 const g=state.gameResult;if(g)out.push({turn:endedTurn(state.turn),kind:'end',text:g.type==='UNIFICATION'?'천하가 하나로 모이다':g.type==='TURN_LIMIT'?'판이 닫히다':'깃발이 내려지다'});
 return out.sort((a,b)=>a.turn-b.turn||(a.kind==='end')-(b.kind==='end'));
}
// 한 판 결과: 왼쪽 군주 전신 · 오른쪽 결과·세력 순위·연대기 띠·함께한 장수
function renderResultSummary(v,won){
 const box=$('#result-summary');if(!box)return;
 const g=state.gameResult,me=state.playerFactionId,style=FACTION_STYLE[me]??{},color=style.color??'#7d7a6a',modal=$('#result');
 const outcome=won?(g?.type==='UNIFICATION'?'unify':'win'):(g?.type==='UNIFICATION'||g?.type==='TURN_LIMIT')?'lose':'fall';
 modal.dataset.outcome=outcome;modal.style.setProperty('--fc',color);
 const key=v3Asset('title/key-art.webp');if(key)modal.style.setProperty('--key-art',`url(${key})`);
 $('#result-eyebrow').innerHTML=`<i>${{unify:'통일',win:'승리',lose:'패배',fall:'멸망'}[outcome]}</i><span>한 판의 끝 · ${esc(campaignDate(endedTurn(state.turn)))}</span>`;
 const ruler=state.factions[me]?.rulerId,art=ruler?fullArt(ruler):null;
 $('#result-art').innerHTML=`${emblemHtml(me,'lg')}${art?`<img class="rs-ruler" src="${esc(art.src)}" data-cut="${art.cut?1:0}" alt="">`:''}<p class="rs-ruler-name">${esc(state.officers[ruler]?.name??style.name)}<small>${esc(factionName(me))}</small></p>`;
 {const im=$('#result-art .rs-ruler');if(im&&im.dataset.cut==='0'){im.style.opacity='0';cutout(im.getAttribute('src')).then(u=>{if(im.isConnected){im.src=u??im.src;im.style.opacity='';}});}}
 const count=(fid,minor)=>Object.values(state.cities).filter(c=>c.ownerFactionId===fid&&(c.kind==='minor')===minor).length;
 const ranking=(g?.ranking??Object.keys(state.factions).map(fid=>({factionId:fid,majorCities:count(fid,false),minorCities:count(fid,true),troops:Object.values(state.armies).filter(a=>a.factionId===fid).reduce((n,a)=>n+(a.troopCount??0),0)})).sort((a,b)=>b.majorCities-a.majorCities||b.minorCities-a.minorCities||b.troops-a.troops));
 const maxT=Math.max(1,...ranking.map(r=>r.troops??0));
 const rank=`<ol class="rs-rank">${ranking.map((r,i)=>`<li class="${r.factionId===me?'me':''}" style="--fc:${FACTION_STYLE[r.factionId]?.color??'#777'}"><span class="rk-n">${i+1}</span>${emblemHtml(r.factionId)}<b>${esc(factionName(r.factionId))}</b><span class="rk-c"><em>${r.majorCities??r.cities??0}</em><small>큰 성</small></span><span class="rk-c"><em>${r.minorCities??0}</em><small>작은 성</small></span><span class="rk-t"><i><b style="width:${Math.round((r.troops??0)/maxT*100)}%"></b></i><small>병력 ${(r.troops??0).toLocaleString('ko-KR')}</small></span></li>`).join('')}</ol>`;
 const officers=Object.values(v.officers).filter(o=>o.growth&&o.allegianceFactionId===me).sort((a,b)=>b.growth.level-a.growth.level||a.name.localeCompare(b.name,'ko'));
 const titleOf=id=>(state.campaignGrowth?.officers?.[id]?.titles??[]).at(-1)?.name;
 const chron=chronicleEntries();
 // 흑묵(page-chronicle): 업적 네 칸 판 — 전투 · 성 · 장수 · 차례
 const deeds=`<ul class="rs-deeds">${[['cmd-attack','천하 교전·전법',`${state.battleSequence??0}건`],['cmd-garrison','내 성',`${Object.keys(v.ownCities).length}곳`],['mode-roster','장수',`${officers.length}명`],['cmd-wait','차례',`${endedTurn(state.turn)}턴`]].map(([ic,k,n])=>`<li><img src="/assets/ui-v3/hud/icons/${ic}.png" alt=""><span><small>${k}</small><b>${n}</b></span></li>`).join('')}</ul>`;
 // C138: city-start initial armies were disbanded before play; bornTurn marks actual musters.
 const unused=unfieldedOfficerNames(state,officers);
 const reason=resultReasonText(g,factionName);
 box.innerHTML=`<p class="rs-reason">${esc(reason)}</p>${unused.length?`<p class="rs-unused">출진하지 않은 장수: ${unused.map(esc).join(' · ')}</p>`:''}${rank}${deeds}<p class="rs-sub" title="천하 집계는 부대 교전·성 공격·사격·추격·전법·함정 등 전투 기록의 순번입니다. ">천하 교전·전법 기록 ${state.battleSequence??0}건 · 내 성 ${Object.keys(v.ownCities).length}곳${won?'':' · 다음 판에는 포텐과 카드가 달라집니다'} · <span title="같은 판 다시 하기: 주소 뒤에 ?seed=${esc(state.campaignSeed)}">시드 ${esc(state.campaignSeed)}</span></p>
 <section class="rs-chron"><h3>연대기</h3><ol class="rs-band">${chron.map(e=>`<li data-kind="${e.kind}"><span class="t">${e.turn}<small>턴</small></span><p>${esc(e.text)}</p></li>`).join('')}</ol></section>
 <section class="rs-off"><h3>함께한 장수</h3><ul class="rs-officers">${officers.slice(0,10).map(o=>{const gr=o.growth,face=faceOf(o.officerId),t=titleOf(o.officerId);return `<li style="--fc:${color}"><span class="f">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</span><div><p><b>${esc(o.name)}</b><span class="potential" data-rank="${gr.potential}">${gr.potential}</span><small>Lv ${gr.level}</small></p><p class="rs-t">${t?`‘${esc(t)}’`:(gr.cards??[]).filter(c=>c.kind==='tactic').slice(0,2).map(c=>esc(c.name)).join(' · ')}</p></div></li>`;}).join('')}</ul></section>`;
}
// 장수 카드: 초상·포텐·경험치, 능력 5개 막대, 특기 5칸(고유 먼저·빈 칸 표시), 전법 장착 3칸 + 보관함
const STAT_LABELS=['지휘','무용','지략','정무','감화'];
// C25 전기: 경력 칭호(얻은 턴·근거)와 한 일 — "레벨업에 서사"(사용자)
const TRACE_LABEL={charge:'돌격',flank:'측면 공격',rear:'후방 공격',frontHold:'정면 수비',siegeDamage:'성 내구 피해',cityDefense:'수성',pursuit:'추격',tactic:'전법',survived:'생환',routed:'패주',govTurns:'태수 턴',foodAdded:'늘린 식량',productionAdded:'늘린 생산',scienceAdded:'늘린 과학',facilitiesBuilt:'지은 시설',securityRecovered:'치안 회복',recruited:'등용',eventsDecided:'사건 결정'};
function careerSection(g){
 const titles=g.titles??[],trace=g.trace??{};if(!titles.length&&!Object.values(trace).some(Boolean))return '';
 const rows=Object.entries(trace).filter(([k,n])=>n&&TRACE_LABEL[k]).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>`<span>${TRACE_LABEL[k]} <b>${n}</b></span>`);
 const foes=Object.keys(trace).filter(k=>k.startsWith('foughtBy:')&&trace[k]).length;if(foes)rows.push(`<span>교전 상대 <b>${foes}</b>명</span>`);
 return `<section class="oc-career"><h3>전기</h3>${titles.length?`<div class="oc-titles">${titles.map(t=>`<span class="title-chip" title="${esc(t.text??'')}">「${esc(t.name)}」<small>${t.turn}턴 · ${esc(t.text??'')}</small></span>`).join('')}</div>`:'<p class="muted">아직 칭호가 없습니다.</p>'}<div class="oc-trace">${rows.join('')}</div></section>`;
}
// C30 인연·세트. 세트 진행판 = TFT 시너지 표(왼쪽 숫자 배지 + 단계 눈금), 팀업 = 마블 라이벌즈 팀업(짝끼리 금색 끈)
const officerName=id=>state?.officers?.[id]?.name??state?.wanderers?.[id]?.name??OFFICER_LABELS[id]??'장수';
function setTierSteps(id){return Object.keys(bondsData?.sets?.find(x=>x.id===id)?.tiers??{}).map(Number).sort((a,b)=>a-b);}
function renderSetTracker(v){
 const box=$('#set-tracker');if(!box)return;
 const rows=(v.setProgress??[]).filter(x=>x.count>0).sort((a,b)=>b.tier-a.tier||b.count-a.count);
 const groups=v.social?.boundGroups??[];box.hidden=!rows.length&&!groups.length;if(box.hidden){box.innerHTML='';return;}
 box.innerHTML=`${rows.length?'<h3>장수 세트</h3>':''}${rows.map(x=>{const steps=setTierSteps(x.id),set=bondsData?.sets?.find(s=>s.id===x.id),lv=x.tier>=(steps.at(-1)??99)?'max':x.tier?'on':'off';
  const tip=`${x.name} ${x.count}/${x.total}\n${(set?.members??[]).map(id=>`${(state.officers[id]?.allegianceFactionId===state.playerFactionId&&Object.values(state.armies).some(a=>a.commanderId===id&&a.factionId===state.playerFactionId))?'●':'○'} ${officerName(id)}`).join('  ')}\n${steps.map(n=>`${n<=x.tier?'▶':'·'} ${n}명: ${set?.tiers?.[n]??''}`).join('\n')}`;
  return `<div class="st-row ${lv}" title="${esc(tip)}"><span class="st-badge">${x.count}</span><span class="st-name">${esc(x.name)}</span><span class="st-steps">${steps.map(n=>`<i class="${n<=x.tier?'hit':''}">${n}</i>`).join('<b>›</b>')}</span></div>`;}).join('')}${groups.length?`<h3>결의 세트</h3>${groups.map(g=>{const fx=RELATIONS.boundSet.tiers,tip=`${g.members.map(officerName).join('·')} — 결의로 이어진 부대장 ${g.members.length}명 출진\n${Object.entries(fx).map(([n,t])=>`${Number(n)<=g.stage?'▶':'·'} ${n}명: ${t}`).join('\n')}`;
  return `<div class="st-row ${g.stage>=4?'max':'on'} bound" title="${esc(tip)}"><span class="st-badge">${g.members.length}</span><span class="st-name">${esc(g.members.map(officerName).join('·'))}</span><span class="st-steps">${Object.keys(fx).map(n=>`<i class="${Number(n)<=g.stage?'hit':''}">${n}</i>`).join('<b>›</b>')}</span></div>`;}).join('')}`:''}`;
}
function bondLinks(v){
 if(!bondsData)return [];const out=[],armyOf=id=>Object.values(v.ownArmies).find(a=>a.commanderId===id);
 for(const b of bondsData.teamUps??[]){const anchor=armyOf(b.anchor);if(!anchor)continue;
  for(const pid of b.partners??[]){const p=armyOf(pid);if(!p)continue;const on=[b.anchor,pid].some(id=>(v.officers[id]?.teamUps??[]).some(t=>t.id===b.id));if(on&&anchor.tileId!==p.tileId)out.push({from:anchor.tileId,to:p.tileId,label:b.name,armies:[anchor.armyId,p.armyId]});}}
 return out;
}
function bondChips(o){
 const t=(o?.teamUps??[]).map(x=>`<span class="bond-chip team" title="${esc(x.effect)}">${UI_ICON('charisma')}${esc(x.name)}</span>`),s=(o?.sets??[]).map(x=>`<span class="bond-chip set" title="${esc(x.effect)}">${esc(x.name)} ${x.tier}단계</span>`);
 return t.length||s.length?`<div class="um-bonds">${[...t,...s].join('')}</div>`:'';
}
function bondSection(id){
 if(!bondsData)return '';const o=view(state).officers[id];
 const mine=(bondsData.teamUps??[]).filter(b=>b.anchor===id||(b.partners??[]).includes(id)),sets=(bondsData.sets??[]).filter(x=>x.members.includes(id));if(!mine.length&&!sets.length)return '';
 const active=new Set((o?.teamUps??[]).map(x=>x.id)),tiers=Object.fromEntries((o?.sets??[]).map(x=>[x.id,x.tier])),prog=Object.fromEntries((view(state).setProgress??[]).map(x=>[x.id,x]));
 const teams=mine.map(b=>`<li class="${active.has(b.id)?'on':''}"><b>${esc(b.name)}</b> <small>${[b.anchor,...b.partners].filter(x=>x!==id).map(officerName).map(esc).join('·')}${b.range?` · ${b.range}칸 안`:''}</small>${active.has(b.id)?'<em>성립</em>':''}<p>${esc(b.text)}</p></li>`).join('');
 const setRows=sets.map(x=>{const p=prog[x.id],tier=tiers[x.id]??p?.tier??0;return `<li class="${tier?'on':''}"><b>${esc(x.name)}</b> <small>${p?`${p.count}/${p.total}`:`0/${x.members.length}`}${tier?` · ${tier}단계`:''}</small><p>${Object.entries(x.tiers).map(([n,t])=>`<span class="${Number(n)<=tier?'hit':''}">${n}명 ${esc(t)}</span>`).join('')}</p></li>`;}).join('');
 return `<section class="oc-bonds"><h3>인연 · 세트</h3>${teams?`<ul class="bond-list">${teams}</ul>`:''}${setRows?`<ul class="bond-list sets">${setRows}</ul>`:''}</section>`;
}
// C31 인물 Crisis: 등장·해결 카드(XCOM2 Chosen 등장 · 네메시스), 위 띠(토탈 워 엔드게임 위기), 지도 붉은 고리
const CRISIS_END={ROUTED:'패주시켰다',ELIMINATED:'무너뜨렸다',CAPTURED:'사로잡았다',TIMEOUT:'버텨 냈다 — 8턴이 지났다'};
const hasBatchim=w=>{const c=(w??'').charCodeAt((w??'').length-1)-0xAC00;return c>=0&&c<=11171&&c%28>0;};
const playText=t=>(t??'').replace(/\s*\(C\d+[^)]*\)/g,'').replace(/Crisis\s*를/g,'위기를').replace(/Crisis/g,'위기').replace(/AI 는/g,'AI는');
const josa=t=>(t??'').replace(/([가-힣A-Za-z0-9]+)(이\(가\)|을\(를\)|은\(는\)|과\(와\))/g,(m,w,j)=>w+(hasBatchim(w)?j[0]:j[2]));
function crisisKey(x){return `${x.actorId}:${x.startTurn}:${x.resolved?'end':'start'}`;}
function renderCrisis(v){
 const x=v.c31,pill=$('#crisis-pill'),modal=$('#crisis-modal');if(!pill||!modal)return;
 const actor=x&&state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x?.type);
 pill.hidden=!x||!!x.resolved;
 if(x&&!x.resolved){const face=faceOf(x.actorId);pill.innerHTML=`<span class="cp-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(actor?.name??'')}</span><span class="cp-text"><small>위기 인물</small><b>${esc(actor?.name??'')} — ${esc(x.name)}</b></span><span class="cp-turns">${x.turnsLeft}<small>턴</small></span>`;pill.title='위기 카드 다시 보기';}
 if(!x||!modal.hidden&&modal.dataset.key===crisisKey(x))return;
 const key=crisisKey(x);if(crisisSeen.has(key)||combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state))return;
 if(x.resolved&&(state.c31?.endTurn??-1)<state.turn-1)return;
 openCrisisCard(v);
}
function openCrisisCard(v=view(state)){
 const x=v.c31,modal=$('#crisis-modal');if(!x||!modal)return;
 const actor=state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x.type),face=portraits[x.actorId]?.path,fac=FACTION_STYLE[actor?.allegianceFactionId];
 const gauge=Math.round(state.campaignGrowth?.officers?.[x.actorId]?.c29?.gauge??0),resolver=state.c31?.resolverId&&state.officers[state.c31.resolverId];
 const name=actor?.name??'',reward=playText(crisisData?.reward?.text).replace(/\{actor\}를/g,name+(hasBatchim(name)?'을':'를')).replace(/\{actor\}/g,name);
 const title=x.resolved?(x.resolved==='TIMEOUT'?'위기가 지나갔다':'위기를 막았다'):'위기 인물 등장';
 const body=x.resolved
  ?`<p class="cr-warn">${esc(name)}의 ${esc(x.name)} — ${esc(resolver?josa(`${resolver.name}이(가) ${CRISIS_END[x.resolved]??'막았다'}`):CRISIS_END[x.resolved]??'끝났다')}</p><dl class="cr-rows">${x.resolved==='TIMEOUT'?`<dt>결과</dt><dd>${esc(fac?.name??'그 세력')} 인망 +${crisisData?.end?.timeoutFame??30}. 위기 동안의 효과는 사라지고, ${esc(josa(name+'이(가)'))} 얻은 레벨·칭호·카드는 남는다.</dd>`:`<dt>보상</dt><dd>${esc(resolver?reward.replace('해결한 플레이어 장수',resolver.name):reward)}</dd>`}</dl>`
  :`<p class="cr-warn">${esc(josa(x.warnText))}</p><dl class="cr-rows"><dt>달라지는 것</dt><dd>${esc(playText(type?.effect))}</dd><dt>막는 법</dt><dd>${esc(x.turnsLeft>Math.max(0,CAMPAIGN_TURN_LIMIT-v.turn+1)?'그 장수 부대를 패주·소멸시키거나 사로잡으면 해결 · 시간 경과만 기다리면 이번 판이 끝날 때까지 이어집니다':playText(crisisData?.end?.text))}</dd><dt>보상</dt><dd>${esc(reward)}</dd></dl><div class="cr-meter"><span class="cr-gauge"><small>고유 전법</small><i><b style="width:${Math.min(100,gauge)}%"></b></i><em>${gauge}/100</em></span><span class="cr-turns"><b>${x.turnsLeft}</b><small>턴 남음</small></span></div>`;
 const bg=v3Asset('events/CRISIS.webp'),fig=fullArt(x.actorId);
 $('#crisis-art').innerHTML=`${bg?`<img class="cr-bg" src="${esc(bg)}" alt="">`:''}${fig?`<img class="cr-fig" src="${esc(fig.src)}" data-cut="${fig.cut?1:0}" alt="">`:face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(name,fac?.color)}</span>`}<figcaption style="--fc:${fac?.color??'#a3453d'}"><small>${esc(fac?.name??'')} 세력 · Lv ${state.campaignGrowth?.officers?.[x.actorId]?.track?.growthStates?.[x.actorId]?.level??'—'}</small>${memoryLines[x.actorId]?`<q>${esc(memoryLines[x.actorId])}</q>`:''}</figcaption>`;
 {const im=$('#crisis-art .cr-fig');if(im&&im.dataset.cut==='0'){im.style.opacity='0';cutout(im.getAttribute('src')).then(u=>{if(im.isConnected){im.src=u??im.src;im.style.opacity='';}});}}
 $('#crisis-main').innerHTML=`<p class="cr-eyebrow">${title}</p><h1>${esc(name)}</h1><p class="cr-type type-${esc(x.type)}">${esc(x.name)}</p>${body}<button class="cr-go" data-crisis-close>${x.resolved?'확인':'맞선다'}</button>`;
 modal.dataset.key=crisisKey(x);modal.classList?.toggle?.('resolved',!!x.resolved);modal.hidden=false;crisisSeen.add(crisisKey(x));menuOpen=false;$('#unit-menu').hidden=true;
}
$('#crisis-modal')?.addEventListener?.('click',e=>{if(e.target.closest?.('[data-crisis-close]')||e.target.id==='crisis-modal')$('#crisis-modal').hidden=true;});
$('#crisis-pill')?.addEventListener?.('click',()=>openCrisisCard());
// C29 성장(장수 정보 창): 고유 전법 게이지 · 고유 특기 각성 · 묶인 변형 · 갈래
function c29Section(id){
 const r=state.campaignGrowth?.officers?.[id],x=r?.c29;if(!x)return '';
 const sig=Object.values(r.cards).find(c=>c.kind==='tactic'&&(c.signature||c.classTag==='고유'));
 const name=k=>esc(r.cards[k]?.name??k),branch={steady:'정석',narrative:'서사',wild:'변칙'};
 const aw=(x.awakenings??[]).map(a=>`<li><span class="aw-b">${branch[a.branch]??'각성'}</span><b>${esc(a.name)}</b><small>Lv ${a.level??''} · ${esc(a.text??'')}</small></li>`).join('');
 const binds=Object.entries(x.bindings??{}).map(([t,m])=>`<li>${name(m)} → <b>${name(t)}</b></li>`).join(''); // 저장 형식 {전법: 변형}
 const owned=r.track?.growthStates?.[id]?.ownedTraitRanks??{},lv=r.track?.growthStates?.[id]?.level??1,cost=xpToNextLevel(lv),locked=tacticLoadoutReason(state,id),xp=Math.max(r.totalXp??0,r.xp??0);
 const rebind=Object.keys(owned).filter(k=>r.cards[k]?.modifier).map(m=>{const cur=Object.entries(x.bindings??{}).find(([,v])=>v===m)?.[0],opts=c29BindingTargets(state,id,r.cards[m]).filter(t=>t!==cur);if(!opts.length)return '';const why=locked?'전투 중에는 못 바꿈':(x.xpDebt??0)>0?`경험치 빚 ${Math.ceil(x.xpDebt)} 을 먼저 갚아야 함(전투로 얻는 경험치가 빚부터 갚음)`:xp<cost?`경험치 ${cost} 필요`:'';return `<li><b>${name(m)}</b> 다시 묶기 <small>경험치 ${cost} 소모</small>${opts.map(t=>`<button class="bind-opt" data-rebind="${esc(m)}" data-rebind-tactic="${esc(t)}" ${why||inputLocked()?'disabled':''} title="${esc(why||`${r.cards[t]?.name??t} 의 재사용 대기 +1`)}">→ ${name(t)}</button>`).join('')}${why?`<em class="muted"> ${esc(why)}</em>`:''}</li>`;}).join('');
 const forks=Object.entries(x.forks??{}).map(([t,b])=>`<li>${name(t)} · 갈래 ${esc(String(b).toUpperCase())}</li>`).join('');
 const g=Math.min(100,Math.round(x.gauge??0));
 return `<section class="oc-c29"><h3>고유 전법 · 각성</h3>${sig?`<p class="sig-row"><b>${esc(sig.name)}</b><span class="sig-gauge" style="--g:${g}%">게이지 ${g}/100${g>=100?' · 사용 가능':''}</span></p>`:''}<p class="muted">고유 특기 각성 ${(x.awakenings??[]).length}/3 (Lv 4·8·12)</p>${aw?`<ul class="aw-list">${aw}</ul>`:''}${binds?`<h4>묶인 전법 변형</h4><ul class="bind-list">${binds}</ul>`:''}${rebind?`<ul class="bind-list rebind">${rebind}</ul>`:''}${forks?`<h4>전법 갈래</h4><ul class="bind-list">${forks}</ul>`:''}</section>`;
}
function renderOfficerCard(){
 const modal=$('#officer-modal'),o=selectedOfficerId&&view(state).officers[selectedOfficerId];modal.hidden=!o||!!pendingCampaignDraft(state);if(modal.hidden)return;
 const g=o.growth,reason=tacticLoadoutReason(state,o.officerId),traits=g.cards.filter(c=>c.kind==='trait'),tactics=g.cards.filter(c=>c.kind==='tactic');
 const color=FACTION_STYLE[o.allegianceFactionId]?.color??'#7d7a6a',face=fullArt(o.officerId)?.src,stats=statsToOfficerPack(o.baseStats);
 $('#officer-title').textContent=o.name;
 const ordered=[...traits.filter(c=>c.core),...traits.filter(c=>!c.core)];
 const pips=n=>`<span class="pips" aria-label="${n}단계">${'●'.repeat(Math.min(5,n))}${'○'.repeat(Math.max(0,5-n))}</span>`;
 const trait=c=>`<li class="oc-slot" data-rarity="${esc(c.rarity)}">${traitChip(c,o.officerId)}${pips(c.rank)}<small>${esc(cardDescription(c,o.officerId))}${cardEffectPending(c)?' · 효과 준비 중':''}</small></li>`;
 const slots=[...ordered.map(trait),...Array.from({length:Math.max(0,g.traitSlots-ordered.length)},()=>'<li class="oc-slot empty">빈 칸</li>')].join('');
 const button=(c,on)=>{const why=reason??(inputLocked()?'지금은 할 수 없습니다.':state.campaignGrowth.officers[o.officerId]?.c29&&c.traitId===state.campaignGrowth.officers[o.officerId].representativeId?'고유 전법은 별도 칸에서 사용합니다.':!on&&g.equippedTacticIds.length>=CAMPAIGN_TACTIC_SLOTS?'장착한 전법을 먼저 해제하세요.':'');return `<button class="btn sm" data-loadout="${esc(c.traitId)}" data-equip="${!on}" ${why?'disabled':''} title="${esc(why||'전법 장착 변경')}">${on?'해제':'장착'}</button>`;};
 const tactic=(c,on)=>`<li class="oc-tactic${on?' on':''}" data-rarity="${esc(c.rarity)}"><span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span><b>${esc(c.name)}</b>${pips(c.rank)}<em>${on?'장착 ✓':'보관'}</em>${button(c,on)}<small>${esc(cardDescription(c,o.officerId))}${cardEffectPending(c)?' · 효과 준비 중':''}</small></li>`;
 const equipped=g.equippedTacticIds.map(id=>tactics.find(c=>c.traitId===id)).filter(Boolean),stored=tactics.filter(c=>!g.equippedTacticIds.includes(c.traitId));
 $('#officer-content').innerHTML=`<div class="oc-head" style="--fc:${color}">
  <div class="oc-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}${COSTUMES[o.officerId]?`<button class="oc-costume" data-costume="${esc(o.officerId)}" title="옷 바꾸기">${esc((COSTUMES[o.officerId].find(x=>x.file===CUTOUT[o.officerId])??COSTUMES[o.officerId][0]).label)} ⇄</button>`:''}</div>
  <div class="oc-meta"><p><span class="potential" data-rank="${g.potential}" title="이번 판 포텐">${g.potential}</span> <span class="oc-lv">Lv ${g.level} · 경험치 ${g.nextXp?`${g.xp}/${g.nextXp}`:'MAX'}</span></p>
   <progress value="${g.nextXp?g.xp:1}" max="${g.nextXp??1}" aria-label="경험치"></progress>${availabilityLine(o)}
   <ul class="oc-stats">${STAT_LABELS.map(k=>`<li><span>${k}</span><i style="--v:${Math.max(0,Math.min(100,stats[k]??0))}%"></i><b>${stats[k]??'—'}</b></li>`).join('')}</ul></div></div>
 <details class="oc-sub"><summary>하위 능력치 · 병종 적성</summary><dl>${STAT_LABELS.map(axis=>`<dt>${axis}</dt><dd>${SUB_AXES[axis].map(k=>`<span${COMBAT_SUBS.has(k)?' class="cb" title="전투 계산에 쓰임"':''}>${esc(k)} <b>${campaignSubAbility(state,o.officerId,axis,k)}</b></span>`).join('')}</dd>`).join('')}<dt>병종 적성</dt><dd>${Object.entries(TROOP_NAME).map(([bt,n])=>{const v=state.campaignGrowth?.officers[o.officerId]?.pack?.troopAptitude?.[bt]??'MEDIUM';return `<span class="apt-${v.toLowerCase()}">${n} <b>${APTITUDE_NAME[v]??v}</b></span>`;}).join('')}</dd></dl><p class="muted">밑줄 = 전투 계산에 쓰이는 능력치. 적성 높음 +10% · 낮음 −10%</p></details>
 ${careerSection(g)}${c29Section(o.officerId)}${bondSection(o.officerId)}${relationSection(o.officerId)}
 <h3>특기 칸 ${g.traitCount}/${g.traitSlots}</h3><ul class="oc-slots">${slots}</ul>
 <h3>전법 장착 ${g.equippedTacticIds.length}/${CAMPAIGN_TACTIC_SLOTS}</h3><ul class="oc-tactics">${equipped.map(c=>tactic(c,true)).join('')}${Array.from({length:Math.max(0,CAMPAIGN_TACTIC_SLOTS-equipped.length)},()=>'<li class="oc-tactic empty">빈 장착 칸</li>').join('')}</ul>
 ${stored.length?`<h3>보관한 전법 ${stored.length}</h3><ul class="oc-tactics stored">${stored.map(c=>tactic(c,false)).join('')}</ul>`:''}
 ${reason?`<p class="oc-lock">${esc(reason)}</p>`:''}`;
 {const im=$('#officer-content .oc-face img'),art=fullArt(o.officerId);if(im&&art){im.style.opacity='0';cutout(art.src).then(u=>{if(im.isConnected){im.src=u??art.src;im.style.opacity='';}});}}
}
$('#officers').addEventListener('click',e=>{const rf=e.target.closest?.('[data-rfilter]');if(rf){rosterFilter=rf.dataset.rfilter;$('#officers').innerHTML=rosterInk(view(state));rosterInkArt();return;}const row=e.target.closest?.('.ri-row[data-pick]');if(row){rosterPick=row.dataset.pick;$('#officers').innerHTML=rosterInk(view(state));rosterInkArt();return;}const tk=e.target.closest?.('[data-talk]');if(tk){if(!tk.disabled&&!inputLocked()){$('#roster').hidden=true;openVisit(tk.dataset.talk);}return;}const id=e.target.closest('[data-officer]')?.dataset.officer;if(id){selectedOfficerId=id;renderOfficerCard();}});
$('#officer-close').addEventListener('click',()=>{selectedOfficerId=null;$('#officer-modal').hidden=true;});
$('#officer-content').addEventListener('click',e=>{const b=e.target.closest?.('[data-costume]');if(!b)return;const id=b.dataset.costume,list=COSTUMES[id]??[],next=list[(list.findIndex(x=>x.file===CUTOUT[id])+1)%list.length];if(!next)return;CUTOUT[id]=next.file;try{localStorage.setItem('sangoku.costume.'+id,next.id);}catch{}render();renderOfficerCard();});
$('#dejavu')?.addEventListener('click',closeDejaVu);
$('#visit-modal')?.addEventListener('click',e=>{
 if(e.target.closest('[data-visit-close]')||e.target===e.currentTarget){visitScene=null;renderVisit();return;}
 const i=e.target.closest('[data-visit-choice]')?.dataset.visitChoice;if(i!==undefined)pickVisit(Number(i));
});
document.addEventListener('keydown',e=>{if(!visitScene)return;if(e.key==='Escape'){visitScene=null;renderVisit();e.stopImmediatePropagation();}else if(/^[1-3]$/.test(e.key)){pickVisit(Number(e.key)-1);e.stopImmediatePropagation();}});
$('#officer-content').addEventListener('click',e=>{const rb=e.target.closest?.('[data-rebind]');if(rb&&!inputLocked()){command({type:'MODIFIER_REBIND',officerId:selectedOfficerId,modifierId:rb.dataset.rebind,tacticId:rb.dataset.rebindTactic});return;}const b=e.target.closest('[data-loadout]');if(b&&!inputLocked())command({type:'TACTIC_LOADOUT',officerId:selectedOfficerId,traitId:b.dataset.loadout,equip:b.dataset.equip==='true'});});
function choicePreviewState(){const preview=structuredClone(state);for(const resolution of traitChoice.resolutions)resolveTraitSpace(preview,traitChoice.officerId,resolution);return preview;}
function choiceTraits(){return officerEffectCards(choicePreviewState(),traitChoice.officerId).filter(c=>!c.core);}
function renderTraitChoice(){
 const modal=$('#trait-modal');if(traitChoice&&!pendingCampaignDraft(state))traitChoice=null;modal.hidden=!traitChoice;if(modal.hidden)return;
 $('#growth-modal').hidden=true;const mode=traitChoice.mode;
 $('#trait-status').textContent=!mode?'합치기 또는 버리기를 선택하세요. 고유특기는 보호됩니다.':mode==='merge'?'둘을 선택하세요. 먼저 고른 특기를 남깁니다.':'버릴 특기 하나를 선택하세요.';
 $('#trait-options').innerHTML=!mode?`<button class="draft-card" data-trait-mode="merge">합치기</button><button class="draft-card" data-trait-mode="discard">버리기</button>`:choiceTraits().map(c=>`<button class="draft-card" data-trait-material="${esc(c.traitId)}" aria-pressed="${traitChoice.selected.includes(c.traitId)}">${traitChip(c,traitChoice.officerId)}${traitChoice.selected.includes(c.traitId)?' ✓':''}</button>`).join('');
 if(mode==='merge'&&traitChoice.selected.length===2){const preview=choicePreviewState(),resultId=resolveTraitSpace(preview,traitChoice.officerId,{mode:'merge',keepId:traitChoice.selected[0],removeId:traitChoice.selected[1]});const result=officerEffectCards(preview,traitChoice.officerId).find(c=>c.traitId===resultId);if(result)$('#trait-status').innerHTML=`합치기 결과: ${traitChip(result,traitChoice.officerId)}`;}
 $('#trait-confirm').hidden=!mode;$('#trait-confirm').disabled=traitChoice.selected.length!==(mode==='merge'?2:1);
}
$('#trait-options').addEventListener('click',e=>{
 if(!traitChoice)return;const mode=e.target.closest('[data-trait-mode]')?.dataset.traitMode,id=e.target.closest('[data-trait-material]')?.dataset.traitMaterial;
 if(mode){traitChoice.mode=mode;traitChoice.selected=[];}
 if(id){const list=traitChoice.selected;if(list.includes(id))traitChoice.selected=list.filter(k=>k!==id);else if(list.length<(traitChoice.mode==='merge'?2:1))list.push(id);}
 renderTraitChoice();
});
$('#trait-back').addEventListener('click',()=>{if(traitChoice?.mode){traitChoice.mode=null;traitChoice.selected=[];renderTraitChoice();}else{traitChoice=null;render();}});
$('#trait-confirm').addEventListener('click',()=>{
 if(!traitChoice)return;const c=traitChoice;if(c.selected.length!==(c.mode==='merge'?2:1))return;
 c.resolutions.push(c.mode==='merge'?{mode:c.mode,keepId:c.selected[0],removeId:c.selected[1]}:{mode:c.mode,removeId:c.selected[0]});
 if(choiceTraits().length+1>=CAMPAIGN_TRAIT_SLOTS){c.mode=null;c.selected=[];renderTraitChoice();return;}
 traitChoice=null;command({type:'DRAFT_PICK',draftId:c.draftId,traitId:c.traitId,resolution:c.resolutions});
});
// 저장소: 브라우저는 IndexedDB(압축), 없으면 localStorage — 값 또는 Promise 를 돌려준다(save-store.mjs)
function savedState() {
  return settle(loadText(CAMPAIGN_SAVE_KEY), raw => raw ? deserialize(raw) : null);
}
const attempt=(fn,onError)=>{try{const r=fn();if(r&&typeof r.catch==='function')r.catch(onError);}catch(error){onError(error);}};

const cityNumber=n=>Number.isFinite(n)?Math.round(n).toLocaleString('ko-KR'):'—';
function renderCaptives() {
 let panel=document.querySelector('#captives');if(!panel)return;
 const captives=campaignCaptives(state);panel.hidden=!captives.length; // 포로가 없으면 제목도 숨김
 panel.innerHTML='<h3>포로</h3>'+captives.map(p=>`<p>${esc(p.name)} · ${esc(factionName(p.homeFactionId))}${p.negotiating?' · 등용 협의 1턴':''}</p><div class="options">${[['hold','억류'],['release','무상 석방'],['recruit','조건부 등용']].map(([action,label])=>{const reason=p.negotiating?'등용 협의 중':action==='recruit'?captiveRecruitmentReason(state,p):null;return `<button class="option" data-captive="${esc(p.prisonerId)}" data-captive-action="${action}" ${reason||inputLocked()?'disabled':''}><b>${label}</b><small>${esc(reason??(action==='recruit'?`인망 ${p.cost} 소모 · 협의 1턴 · 성공 시만 소모`:''))}</small></button>`;}).join('')}</div>`).join('');
}
$('#captives').addEventListener('click',e=>{const button=e.target.closest('[data-captive-action]');if(button&&!inputLocked())command({type:'CAPTIVE_ACTION',prisonerId:button.dataset.captive,action:button.dataset.captiveAction});});
// 치안 표시: 저장된 단계 대신 산출에 쓰는 단계(태수와 결의 짝이 같은 성이면 한 단계 위 — C39)
const citySecurity=c=>securityLabel({...c,securityLevel:c.economyForecast?.securityLevel??c.securityLevel});
// 기시감(전생의 기억) — 내 세력 장수 사건을 한 번씩 먹 띠 장면으로(엔진 view.dejaVu.recent, C41). 불러온 판의 지난 차례 것은 다시 띄우지 않음
let dejaVuSeen=null,dejaVuQueue=[],dejaVuTimer=null,dejaVuRetry=null;
function renderDejaVu(v){
 const box=$('#dejavu');if(!box)return;
 const INJ={INJURED:'중상',RETURNED:'복귀'},list=[...(v.dejaVu?.recent??[]),...(v.injury?.recent??[]).map(x=>({id:`inj:${x.kind}:${x.officerId}:${x.turn}`,officerId:x.officerId,officerName:x.officerName,name:x.kind==='INJURED'?'부대가 무너졌습니다 — 중상':INJ[x.kind]??x.kind,scene:'',line:x.line,turn:x.turn,label:x.kind==='RETURNED'?'복귀':'부상',foot:x.kind==='RETURNED'?'군주와 친밀도 +5 · 경험치 +10':injuryReturnText(v.turn,v.officers[x.officerId]?.injury)}))];
 if(!dejaVuSeen)dejaVuSeen=new Set(list.filter(x=>x.turn<state.turn).map(x=>x.id));
 for(const x of list)if(!dejaVuSeen.has(x.id)){dejaVuSeen.add(x.id);dejaVuQueue.push(x);}
 const busy=combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state)||[...document.querySelectorAll('.w-modal')].some(m=>!m.hidden);
 if(box.hidden&&dejaVuQueue.length){if(!busy)showDejaVu();else if(!dejaVuRetry)dejaVuRetry=setTimeout(()=>{dejaVuRetry=null;if(state)renderDejaVu(view(state));},700);}
}
function showDejaVu(){
 const box=$('#dejavu'),x=dejaVuQueue.shift();if(!box)return;if(!x){box.hidden=true;return;}
 const o=state.officers[x.officerId],face=faceOf(x.officerId),name=x.officerName??o?.name??'';
 box.innerHTML=`<div class="dv-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(name,FACTION_STYLE[o?.allegianceFactionId]?.color)}</div><div class="dv-text"><p class="dv-head"><small>${esc(x.label??'기시감')}</small><b>${esc(x.name)}</b><span>${esc(name)}</span></p>${x.scene?`<p class="dv-scene">${esc(x.scene)}</p>`:''}<p class="dv-line">${esc(x.line)}</p><p class="dv-foot">${esc(x.foot??`전생의 기억 조각 · 경험치 +${Number(x.xp)||15}`)}</p></div>`;
 box.hidden=false;box.classList.remove('in');void box.offsetWidth;box.classList.add('in');
 clearTimeout(dejaVuTimer);dejaVuTimer=setTimeout(closeDejaVu,10000);
}
function closeDejaVu(){clearTimeout(dejaVuTimer);const box=$('#dejavu');if(box)box.hidden=true;if(dejaVuQueue.length)setTimeout(()=>renderDejaVu(view(state)),300);}
// C38 친목 화면 — 주점 술자리·저택 대화·장수 관계. 판정·한도·문구는 엔진(campaign-relations)을 그대로 쓴다
const tierChip=r=>`<i class="tier t-${String(r.tier).toLowerCase()}${r.kind==='RIVAL'&&r.tier!=='RIVAL'?' t-feud':''}"${r.rivalEvent?` title="${esc(r.rivalEvent)}"`:''}>${esc(r.displayName??r.tierName)}</i>`;
const feastRelation=(a,b)=>{const preview={...state,relations:{...state.relations}},key=[a,b].sort().join('|'),r=relation(state,a,b),value=Math.min(RELATIONS.range[1],r.value+RELATIONS.gains.feast.value);preview.relations[key]={value,...(r.kind?{kind:r.kind}:value>=RELATIONS.tiers.find(t=>t.id==='BOUND').min?{kind:'FRIEND'}:{})};return relation(preview,a,b);};
const affBar=n=>`<span class="aff" style="--v:${Math.max(0,Math.min(100,n))}%" title="친밀도 ${n}"><i></i></span>`;
const faceChip=id=>{const p=faceOf(id),o=state.officers[id];return `<span class="soc-face">${p?`<img src="${esc(p)}" alt="">`:faceFallback(o?.name,FACTION_STYLE[o?.allegianceFactionId]?.color)}</span>`;};
let feastDone=null;
function feastHtml(v,c){
 if(!v.social)return '';
 if(feastCity!==c.cityId){feastCity=c.cityId;feastPick=[];}
 const city=state.cities[c.cityId],ids=relationCityOfficers(state,city,{commanders:true}),g=RELATIONS.gains.feast,used=v.social.feastUsed?.[c.cityId];feastPick=feastPick.filter(id=>ids.includes(id));
 const role=id=>id===v.social.lordId?'군주':id===city.governorId?'태수':Object.values(state.armies).some(a=>a.commanderId===id&&a.factionId===city.ownerFactionId)?'부대장':'';
 const reason=feastPick.length<2?'':socialReason(state,{type:'FEAST',cityId:c.cityId,officerIds:feastPick});
 const pairs=feastPick.flatMap((a,i)=>feastPick.slice(i+1).map(b=>[a,b]));
 const head=`<h3>술자리 <small>성마다 한 달에 한 번 · 함께한 모든 짝 친밀도 +${g.value} · 인망 ${g.costPrestige} 소모</small></h3>`;
 if(used)return head+(feastDone?.cityId===c.cityId&&feastDone.month===v.social.month?`<ul class="feast-pairs done">${feastDone.lines.map(x=>`<li><span>${esc(x.names)}</span><b>${x.before} → ${x.after}</b>${x.tier?`<em>${esc(x.tier)}</em>`:''}</li>`).join('')}</ul>`:'')+'<p class="feast-go"><small>이번 달 이 성의 술자리는 이미 열었습니다. 다음 달에 다시 열 수 있습니다.</small></p>';
 const seats=ids.length<2?'<p class="muted">이 성에 장수가 두 명 이상 있어야 합니다.</p>':`<ul class="feast-seats">${ids.map(id=>{const on=feastPick.includes(id);return `<li><button class="feast-seat${on?' on':''}" data-feast-pick="${esc(id)}" aria-pressed="${on}" ${!on&&feastPick.length>=3?'disabled':''}>${faceChip(id)}<i class="rk" data-r="${role(id)}" aria-hidden="true"></i><b>${esc(officerName(id))}</b><small>${role(id)}</small></button></li>`;}).join('')}</ul>`;
 const preview=pairs.length?`<ul class="feast-pairs">${pairs.map(([a,b])=>{const r=relation(state,a,b),next=feastRelation(a,b),n=next.value;return `<li><span>${esc(officerName(a))} · ${esc(officerName(b))}</span>${tierChip(r)}<b>${r.value} → ${n}</b>${next.displayName!==r.displayName?`<em>${esc(next.displayName)}</em>`:''}</li>`;}).join('')}</ul>`:'';
 const hint=ids.length<2?'':feastPick.length<2?'함께할 장수 2~3명을 고르세요.':reason;
 return `${head}${seats}${preview}${ids.length<2?'':`<p class="feast-go"><button class="btn primary" data-feast-open ${feastPick.length<2||reason?'disabled':''}>술자리 열기</button>${hint?`<small>${esc(hint)}</small>`:''}</p>`}`;
}
function openFeast(cityId){
 const ids=[...feastPick],pairs=ids.flatMap((a,i)=>ids.slice(i+1).map(b=>[a,b])),before=pairs.map(([a,b])=>relation(state,a,b)),old=state;
 command({type:'FEAST',cityId,officerIds:ids});if(state===old)return;
 feastPick=[];feastDone={cityId,month:view(state).social?.month,lines:pairs.map(([a,b],i)=>{const r=relation(state,a,b);return {names:`${officerName(a)} · ${officerName(b)}`,before:before[i].value,after:r.value,tier:r.tier!==before[i].tier?`${before[i].displayName} → ${r.displayName}`:''};})};
 renderCityPanel(view(state));
}
// 주점의 선택 줄(시안 page-tavern 의 세 줄 — 술자리 단추와 합쳐 셋, 2026-10-11): 새 규칙 없이 이미 있는 일로 들어가는 문만 둔다.
//   이야기한다 = 왼쪽에서 한 사람만 고르면 그 사람을 찾아가기(저택의 찾아가기와 같은 규칙) · 인재를 맞는다 = 떠돌이 인재 등용(아래 목록의 등용과 같은 명령)
function tavernActsHtml(v,c){
 const one=feastPick.length===1?feastPick[0]:null,why=!one?'왼쪽에서 한 사람만 고르면 찾아가 이야기할 수 있습니다':inputLocked()?'지금은 할 수 없습니다':socialReason(state,{type:'VISIT',officerId:one,choice:0}),w=(c.wanderers??[])[0];
 // 가운데 탁자에 앉은 사람(시안 page-tavern 의 가운데 인물, 2026-10-11): 이야기하려고 고른 사람, 없으면 이 성의 다른 장수 한 명 — 탁자 뒤에 앉은 것처럼 허리에서 잘라 보인다
 const host=cityPeople(v,c).tavern?.officerId,others=relationCityOfficers(state,state.cities[c.cityId]).filter(id=>id!==host&&id!==v.social?.lordId),guestId=one??others.find(id=>SEATED[id])??others[0]; // 앉은 그림이 있는 사람을 먼저 앉힌다
 const seated=guestId&&SEATED[guestId],ga=seated?{src:`/assets/officer-art/cutout/${seated}`,cut:true}:guestId?fullArt(guestId):null;
 const guest=ga?.cut?`<i class="tavern-guest${seated?' seated':''}" aria-hidden="true"><img src="${esc(ga.src)}" alt=""></i>`:'';
 return `${guest}<p class="tavern-acts"><button class="btn" ${one&&!why?`data-visit="${esc(one)}"`:'disabled'} title="${esc(why||'찾아가 이야기한다 — 군주와 친밀도가 오른다(장수마다 한 달에 한 번)')}"><img src="/assets/ui-v3/hud/icons/b-talk.png" alt=""><span>이야기한다${one?` · ${esc(officerName(one))}`:''}</span></button><button class="btn" ${w?`data-wanderer="${esc(w.officerId)}"`:''} ${!w||wandererReason(w.officerId,c.cityId)?'disabled':''} title="${esc(w?(wandererReason(w.officerId,c.cityId)||`등용 협의 1턴 · 인망 ${cityRecruitCost(state,c.cityId,state.playerFactionId)} 소모`):'이 성에 떠돌이 인재가 없습니다')}"><img src="/assets/ui-v3/hud/icons/b-treaty.png" alt=""><span>인재를 맞는다${w?` · ${esc(w.name)}`:''}</span></button></p>`;
}
function visitListHtml(v,c){
 const soc=v.social,ids=relationCityOfficers(state,state.cities[c.cityId]).filter(id=>id!==soc.lordId),g=RELATIONS.gains.visit.values;
 const rows=ids.map(id=>{const s=soc.officers[id],r=relation(state,soc.lordId,id);return `<li>${faceChip(id)}<div class="visit-who"><p><b>${esc(officerName(id))}</b>${tierChip(r)}</p>${affBar(r.value)}<small>군주와 ${r.value} · ${statLine(v.officers[id]??state.officers[id])}</small></div><button class="btn sm" data-visit="${esc(id)}" ${s?.visitUsed?'disabled':''}>${s?.visitUsed?'이번 달 만남':'찾아가기'}</button></li>`;}).join('');
 return `<h3>찾아가기 <small>장수마다 한 달에 한 번 · 군주와 친밀도 +${g[0]}~${g.at(-1)}</small></h3>${rows?`<ul class="visit-list">${rows}</ul>`:'<p class="muted">이 성에 찾아갈 장수가 없습니다.</p>'}`;
}
function relationSection(id){
 const soc=view(state).social,s=soc?.officers?.[id];if(!s)return '';
 const lord=s.lordAffinity===null?'':`<p class="oc-lord"><span>군주 ${esc(officerName(soc.lordId))}와</span>${tierChip(relation(state,soc.lordId,id))}${affBar(s.lordAffinity)}<b>${s.lordAffinity}</b></p>`;
 const rows=s.relations.filter(r=>r.officerId!==soc.lordId).map(r=>`<li class="${r.tier==='RIVAL'?'rival':''}">${faceChip(r.officerId)}<b>${esc(r.name)}${r.rivalEvent?`<em>${esc(r.rivalEvent)}</em>`:''}</b>${tierChip(r)}<small>${r.value}</small></li>`).join('');
 return `<h3>관계</h3>${lord}${rows?`<ul class="oc-rel">${rows}</ul>`:''}<p class="muted">함께 싸우고, 같은 성에서 일하고, 술자리·대화로 가까워진다. 신뢰 이상 = 사기 보호(3턴에 한 번)·생산 · 친우 이상 = 협공 · 결의 = 결의 세트. 숙적은 싸움만으로는 생기지 않고 특별한 일(전생의 원한 등)로 드물게 생긴다.</p>`;
}
// 저택 대화: 장수별 대사(visit-talks, 군주가 맞을 때) 또는 공통 대사. 군주와 친밀도로 장면(보통·신뢰·친우)을 고른다
function openVisit(id){
 const lord=view(state).social?.lordId,own=visitTalks?.officers?.[id],pack=own&&own.lord===lord?own:visitTalks?.generic;
 const r=relation(state,lord,id),min=t=>RELATIONS.tiers.find(x=>x.id===t).min,tier=r.value>=min('CLOSE')?'CLOSE':r.value>=min('TRUST')?'TRUST':'NORMAL';
 const talk=pack?.talks?.find(t=>t.tier===tier)??pack?.talks?.[0];
 if(!talk){command({type:'VISIT',officerId:id,choice:1});return;}
 const choices=[...talk.choices];for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 visitScene={id,pack,talk,choices,done:null,error:''};renderVisit();
}
function renderVisit(){
 const modal=$('#visit-modal');if(!modal)return;modal.hidden=!visitScene;if(!visitScene)return;
 const {id,pack,talk,choices,done,error}=visitScene,o=state.officers[id],lord=view(state).social?.lordId,r=relation(state,lord,id),fill=s=>String(s??'').replaceAll('{name}',o?.name??'');
 const art=portraits[id]?.path;modal.style.setProperty('--fc',FACTION_STYLE[o?.allegianceFactionId]?.color??'#7d7a6a');
 $('#visit-art').innerHTML=art?`<img src="${esc(art)}" alt="" style="opacity:0">`:faceFallback(o?.name,FACTION_STYLE[o?.allegianceFactionId]?.color);
 if(art){const im=$('#visit-art img'),cut=fullArt(id);cutout(cut?.src??art).then(u=>{if(im?.isConnected){im.src=u??art;im.style.opacity='';}});}
 {const bg=v3Asset('city-stage/facility-residence.webp');if(bg)modal.style.setProperty('--scene-bg',`url(${bg})`);}
 {const la=lord?fullArt(lord):null,lf=lord?faceOf(lord):null,of=faceOf(id),host=$('#visit-lord'),bond=$('#visit-bond'); // 흑묵(page-visit): 찾아간 군주 · 두 얼굴 사이 인연 10칸
  if(host){host.innerHTML=la&&lord!==id?`<img src="${esc(la.src)}" alt=""${la.cut?'':' style="opacity:0"'}>`:'';const im=host.querySelector('img');if(im&&!la.cut)cutout(la.src).then(u=>{if(im.isConnected){if(u)im.src=u;im.style.opacity='';}});}
  if(bond)bond.innerHTML=lord&&lord!==id?`<span class="f">${of?`<img src="${esc(of)}" alt="">`:''}</span><span class="mid">${tierChip(r)}<i class="seg">${Array.from({length:10},(_,k)=>`<u class="${k<Math.round(Math.max(0,Math.min(100,r.value))/10)?'on':''}"></u>`).join('')}</i></span><span class="f">${lf?`<img src="${esc(lf)}" alt="">`:''}</span>`:'';
  modal.style.setProperty('--visit-face',of?`url(${of})`:'none');}
 $('#visit-name').textContent=o?.name??'';
 $('#visit-rel').innerHTML=`${tierChip(r)}${affBar(r.value)}<small>군주와 ${r.value}</small>`;
 $('#visit-scene').textContent=fill(talk.scene);
 $('#visit-line').textContent=done?fill(done.reply):fill(talk.line);
 $('#visit-choices').innerHTML=error?`<p class="visit-error">${esc(error)}</p><button class="btn" data-visit-close>물러나기</button>`
  :done?`<p class="visit-gain">친밀도 +${done.after-done.before} <small>${done.before} → ${done.after}${done.tier?` · ${esc(done.tier)}`:''}</small></p>${done.bound&&pack?.bound?`<blockquote class="visit-bound">“${esc(fill(pack.bound))}”</blockquote>`:''}<button class="btn primary" data-visit-close>물러나기</button>`
  :`${choices.map((ch,i)=>`<button class="visit-choice" data-visit-choice="${i}"><b>${i+1}</b><span>${esc(fill(ch.text))}</span></button>`).join('')}<button class="btn ghost sm" data-visit-close>그냥 물러나기</button>`;
}
function pickVisit(i){
 const sc=visitScene;if(!sc||sc.done||sc.error)return;const ch=sc.choices[i];if(!ch)return;
 const lord=view(state).social?.lordId,before=relation(state,lord,sc.id),cmd={type:'VISIT',officerId:sc.id,choice:ch.gain};
 const reason=inputLocked()?'지금은 대화할 수 없습니다':socialReason(state,cmd);if(reason){sc.error=reason;renderVisit();return;}
 command(cmd);const after=relation(state,lord,sc.id);
 sc.done={reply:ch.reply,before:before.value,after:after.value,tier:after.tier!==before.tier?`${before.displayName} → ${after.displayName}`:'',bound:after.tier==='BOUND'&&before.tier!=='BOUND'};renderVisit();
}
function renderCityPanel(v) {
 const panel=$('#city-panel');
 panel.hidden=!selectedCityId;
 if(panel.hidden)return;
 const c=v.ownCities[selectedCityId]??v.knowledge.cities[selectedCityId];
 if(!c){selectedCityId=null;panel.hidden=true;return;}
 if(v.ownCities[selectedCityId]&&document.body?.classList?.contains?.('ink-hud')&&!panel.closest?.('.cs-commands')){selectedCityId=null;panel.hidden=true;return;} // 흑묵 HUD: 내 성 창은 성 화면 안에서만 — 열어 둔 남의 성을 차지했을 때 지도 위에 옛 모양 창이 남던 것
 const owner=c.ownerFactionId?factionName(c.ownerFactionId):'중립';
 const mini=v3Asset(`cities/${cityFile(selectedCityId)}.png`);
 const header=`<header class="city-head" style="--fc:${FACTION_STYLE[c.ownerFactionId]?.color??'#7d7a6a'}">${mini?`<span class="ch-mini"><img src="${esc(mini)}" alt=""></span>`:''}<div><p class="city-kind"><i></i>${{major:'큰 성',minor:'작은 성'}[c.kind]??'성'} · ${esc(owner)}</p><h2>${esc(c.name)}</h2></div><button class="w-close" data-city-close aria-label="도시 패널 닫기">×</button></header>`;
 $('#w-report')?.classList?.remove('open');
 const wanderersHtml=(list,own)=>list?.length?`<h3>재야 장수</h3><ul class="wanderers">${list.map(o=>{const f=faceOf(o.officerId);return `<li><span class="wf">${f?`<img src="${esc(f)}" alt="">`:faceFallback(o.name)}</span><div><b>${esc(o.name)}</b><small>${statLine(o)}</small></div>${own?`<button class="btn sm" data-wanderer="${esc(o.officerId)}" ${wandererReason(o.officerId,c.cityId)?'disabled':''} title="${esc(wandererReason(o.officerId,c.cityId)||`등용 협의 1턴 · 인망 ${cityRecruitCost(state,c.cityId,state.playerFactionId)} 소모`)}">등용</button>`:''}</li>`;}).join('')}</ul>${own?`<p class="muted">등용 협의 1턴 · 인망 ${cityRecruitCost(state,c.cityId,state.playerFactionId)} 소모</p>`:'<p class="muted">이 성을 차지하면 등용할 수 있습니다.</p>'}`:'';
 if(!v.ownCities[selectedCityId]){panel.innerHTML=header+`<dl class="ch-facts"><dt>소유</dt><dd>${c.ownerFactionId?esc(factionName(c.ownerFactionId)):'중립 · 소유 세력 없음'}</dd><dt>정보</dt><dd>관측한 도시 위치 · 안쪽 자원과 작업은 모름</dd></dl>${wanderersHtml(c.wanderers,false)}`;return;}
 const rates=cityEconomyRates(state,state.cities[selectedCityId]),status=cityOccupationStatus(state,state.cities[selectedCityId]);
 const occupation=occupationDisplay(state,state.cities[selectedCityId]);
 const gov=c.governorId?v.officers[c.governorId]:null,govFace=gov?faceOf(gov.officerId):null;
 const yieldsHtml=`<div class="city-yields"><span class="cy-gov">${govFace?`<img src="${esc(govFace)}" alt="">`:gov?faceFallback(gov.name):'<i>공석</i>'}<small>태수</small><b>${esc(gov?.name??'공석')}</b></span>${[['food','식량',rates.food],['build','생산',rates.production],['science','과학',rates.science],['politics','인망',rates.prestige]].map(([ic,n,x])=>`<span class="cy">${UI_ICON(ic)}<small>${n}</small><b>+${cityNumber(x)}</b></span>`).join('')}</div>`;
 const occupationOptions=['CAPTURED','OCCUPATION'].includes(occupation.stage)?`<div class="occ-box"><h3>점령 처리 방식</h3><div class="options">${Object.entries(OCCUPATION_METHODS).map(([method,label])=>{const reason=occupationMethodReason(state,state.cities[selectedCityId],method);return `<button class="option" data-occupation-method="${method}" ${reason||inputLocked()?'disabled':''}><b>${label}</b><small>${esc(reason??{conciliation:'주민 유지식량 · 1턴',military:'현역 50% 주둔 · 2턴',plunder:'재고 30% · 인망 −20 · 시설 손상 → 군정'}[method])}</small></button>`;}).join('')}</div></div>`:'';
 const governors=[...Object.values(v.officers).filter(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&o.locationRef.kind==='NONE'),...(c.freeOfficers??[]).map(o=>v.officers[o.officerId]??o)].filter((o,i,a)=>a.findIndex(x=>x.officerId===o.officerId)===i);
 const musterOfficers=[...(c.freeOfficers??[]),...(c.governorId&&!Object.values(v.ownArmies).some(a=>a.commanderId===c.governorId)&&v.officers[c.governorId]?[v.officers[c.governorId]]:[])];
 const governorSelection=occupation.stage==='NORMAL'&&governors.length?`<label>태수 후보 <select id="city-governor">${governors.map(o=>`<option value="${esc(o.officerId)}">${esc(o.name)}</option>`).join('')}</select></label><button class="btn sm" data-governor-appoint ${inputLocked()?'disabled':''}>태수 임명</button>`:'';
 const governor=v.officers[c.governorId],portrait=portraits[c.governorId]?.path;
 const armies=Object.values(v.ownArmies).filter(a=>{
  const [q,r]=a.tileId.split(',').map(Number),[cq,cr]=c.tileId.split(',').map(Number);
  return Math.max(Math.abs(q-cq),Math.abs(r-cr),Math.abs(q+r-cq-cr))<=2&&a.troopCount>0;
 });
 const jobList=c.jobs?c.jobs.filter(j=>j.blockedReason!=='UNIQUE_FACILITY_LOCKED').map(j=>[j.kind,{...CITY_JOBS[j.kind],name:j.name,cost:j.cost,estimate:j.estimate,description:j.description??CITY_JOBS[j.kind]?.description??JOB_FX[j.kind]},j.blockedReason]):Object.entries(CITY_JOBS);
 const JOB_THUMB={tuntian:'tuntian',farm:'farm',granary:'granary',workshop:'workshop',market:'market',barracks:'barracks',clinic:'clinic',muster:'barracks',recruit:'barracks',reorganize:'barracks',repair:'workshop',mufu:'mufu'};
 const optionList=jobList.map(([kind,job,reason])=>{
  const progress=kind==='reorganize'&&c.currentProduction?.kind===kind?c.productionProgress:c.jobProgress?.[kind]??0;
  const estimate=productionReadout(job.estimate??{kind,cost:job.cost,progress,gain:(c.production||rates.production)*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1)}),remaining=estimate.turns??(state.cities[c.cityId]?.c33?.taxUntil>=state.turn?'상환 종료 후 재개':'생산 회복 후 재개');
  const blocked=!!reason||kind==='farm'&&c.facilities.filter(f=>f.kind==='farm').length>=2;
  if(kind==='muster'&&!('freeOfficers' in c))return '';
  const unavailable=reason&&blocked?reasonText(reason):kind==='reorganize'&&!armies.length?'성 주변 2칸 안에 재편할 부대 없음':kind==='muster'&&!musterOfficers.length?'이 성에 출진할 장수 없음' :'';
  const thumb=v3Asset(`facilities/${JOB_THUMB[kind]??'workshop'}.png`),gface=faceOf(c.governorId); // 흑묵 업무 줄(기준 page-office): 담당 얼굴 · 시설 그림 · 칸(생산·진행·남은 턴)
  if((stage.fac==='office'&&!['muster','recruit','reorganize'].includes(kind))||(stage.fac==='barracks'&&['recruit','reorganize'].includes(kind))){
   const finish=unavailable?'시작 불가':status!=='NORMAL'?'점령 처리 중 · 중단':estimate.turns===null?remaining:`${estimate.turns}차례 남음`,finishDate=!unavailable&&status==='NORMAL'&&estimate.turns!==null?campaignDate(v.turn+estimate.turns):'';
   return `<button class="option office-job" data-city-job="${kind}" style="${thumb?`--thumb:url(${thumb});`:''}${gface?`--gface:url(${gface})`:''}" aria-pressed="${c.currentProduction?.kind===kind}" ${inputLocked()||blocked||kind==='reorganize'&&!armies.length?'disabled':''}><span class="job-main"><b>${esc(job.name)}</b><em>${esc(job.description??'')}</em>${unavailable?`<small class="job-reason">${esc(unavailable)}</small>`:''}</span><span class="job-cost"><small>생산 비용</small><strong>${cityNumber(job.cost)}</strong><small>진행 ${cityNumber(progress)} / ${cityNumber(job.cost)}</small></span><span class="job-finish"><strong>${esc(finish)}</strong><small>${finishDate?`${esc(finishDate)}<br>완료 예상`:''}</small></span></button>`;
  }
  return `<button class="option" data-city-job="${kind}" title="${esc([job.description,estimate.line].filter(Boolean).join(' · '))}" style="${thumb?`--thumb:url(${thumb});`:''}${gface?`--gface:url(${gface})`:''}" aria-pressed="${c.currentProduction?.kind===kind}" ${inputLocked()||blocked||kind==='reorganize'&&!armies.length||kind==='muster'&&!musterOfficers.length?'disabled':''}>${UI_ICON(JOB_ICON[kind]??'build')}<b>${job.name}</b>${job.description?`<em class="job-fx">${esc(job.description)}</em>`:''}<small>${unavailable?esc(unavailable):`생산 ${job.cost} · ${cityNumber(progress)}/${job.cost} · ${status==='NORMAL'?esc(estimate.line):'중단'}`}</small><span class="job-track"><i style="width:${Math.min(100,progress/job.cost*100)}%"></i></span><span class="ink-cells"><i data-k="cost" title="생산 비용">${job.cost}</i><i data-k="done" title="진행">${cityNumber(progress)}</i><i data-k="turns" title="남은 차례">${unavailable?'—':status==='NORMAL'?remaining:'—'}</i><i data-k="state" title="상태">${c.currentProduction?.kind===kind?'●':''}</i></span></button>`;
 });
 const MIL_JOBS=new Set(['muster','recruit','reorganize']),options=optionList.filter((_,k)=>!MIL_JOBS.has(jobList[k][0])).join(''),milOptions=optionList.filter((_,k)=>MIL_JOBS.has(jobList[k][0])&&jobList[k][0]!=='muster').join(''),musterOption=optionList[jobList.findIndex(j=>j[0]==='muster')]??'';
 const cause=x=>{const d=economyCauseDisplay(x);return `<div class="cause"><span${d.hint?` title="${esc(d.hint)}"`: ''}>${esc(d.label)}</span><span class="v ${x.amount>=0?'up':'down'}">${esc(d.amount)}</span></div>`;};
 const RES_NAME={food:'식량',production:'생산',science:'과학',prestige:'인망'};
 const causes=Object.entries(RES_NAME).map(([r,n])=>{const list=(c.economyCauses??[]).filter(x=>x.resource===r&&(r==='food'||x.amount));return list.length?`<p class="cause-head">${n}</p>${list.map(cause).join('')}`:'';}).join('');
 const tab=({overview:'office',jobs:'office',people:'residence'})[cityTab]??cityTab??'office',pane=(id,html)=>`<section class="city-pane" data-pane="${id}" ${tab===id?'':'hidden'}>${html}</section>`;
 const stat=(icon,label,value)=>`<span class="city-stat">${UI_ICON(icon)}<small>${label}</small><b>${value}</b></span>`;
 const stats=`<div class="city-stats">${stat('people','인구',`${c.population}${c.populationCapacity?`<i>/${c.populationCapacity}</i>`:''}`)}${stat('reserve','예비병',c.reserveTroops)}${stat('wounded','부상병',c.woundedTroops)}${stat('security','치안',citySecurity(c))}</div>`;
 const tabs=`<nav class="city-tabs" role="tablist">${[['office','관청'],['barracks','병영'],['tavern','주점'],['residence','저택']].map(([id,n])=>`<button role="tab" data-city-tab="${id}" aria-selected="${tab===id}">${n}</button>`).join('')}</nav>`;
 const working=c.currentProduction?.kind?CITY_JOBS[c.currentProduction.kind]?.name:null;
 const otab=id=>officeTab===id?'':' hidden',workJob=c.currentProduction?.kind?jobList.find(j=>j[0]===c.currentProduction.kind):null,workProg=workJob?(c.jobProgress?.[workJob[0]]??c.productionProgress??0):0;
 const officeTabs=`<nav class="office-tabs" role="tablist">${[['jobs','업무','res-production'],['cmds','특기','b-seal'],['state','형편','res-food'],['built','시설','b-office']].map(([id,n,ic])=>`<button role="tab" data-office-tab="${id}" aria-selected="${officeTab===id}"><img class="oi" src="/assets/ui-v3/hud/icons/${ic}.png" alt=""><span>${n}</span></button>`).join('')}</nav>`;
 const officeGo=`<button class="office-go" data-office-tab="jobs" title="${working?`진행 중 · ${esc(working)}`:'진행 중인 업무 없음'}"><img src="/assets/ui-v3/hud/office-hammer.png" alt=""><span>${working?`<b>${esc(working)}</b><small>${cityNumber(workProg)}/${workJob?.[1]?.cost??'—'}</small>`:'<small>쉬는 중</small>'}</span></button>`;
 panel.innerHTML=header+yieldsHtml+stats+tabs+pane('office',`${officeTabs}${officeGo}<div class="osec" data-osec="jobs"${otab('jobs')}><p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="job-columns" aria-label="업무 수치"><span data-k="cost">생산 비용</span><span data-k="done">진행</span><span data-k="turns">남은 차례</span><span data-k="state">상태</span></div><div class="options">${options}</div></div><div class="osec" data-osec="cmds"${otab('cmds')}>
 ${(c.domesticCommands??[]).length?`<h3>내정 특기 명령</h3><div class="options domestic-cmds">${c.domesticCommands.map((d,i)=>`<button class="option cmd" data-domestic="${i}" title="${esc(DOMESTIC_CMD_FX[d.type]??'')}" style="${govFace?`--gface:url(${govFace});`:''}--thumb:url(/assets/ui-v3/hud/icons/b-seal.png)" ${d.blockedReason?'disabled':''}><b>${esc(d.label)}</b>${DOMESTIC_CMD_FX[d.type]?`<em class="job-fx">${DOMESTIC_CMD_FX[d.type]}</em>`:''}<small>${Number.isFinite(d.cost)?`${d.resource==='science'?'과학':'인망'} ${cityNumber(d.cost)}`:''}${d.blockedReason?` · ${esc(d.blockedReason)}`:''}</small></button>`).join('')}</div>`:'<p class="muted">쓸 수 있는 내정 특기 명령이 없습니다.</p>'}</div><div class="osec" data-osec="state"${otab('state')}>
 <h3 class="city-sec">성 형편</h3><ol class="steps"><li class="${status==='NORMAL'?'done':'now'}">${{NORMAL:'정상',CAPTURED:'함락',OCCUPATION:'점령 처리',STABILIZING:'안정화'}[occupation.stage]}${occupation.turnsLeft?' '+occupation.turnsLeft+'턴':''}</li><li>10일 정산</li></ol>${occupationOptions}
 <p>치안 ${citySecurity(c)} · ${esc((c.securityCauses??[]).join(' · ')||'악화 원인 없음')}</p><h3>식량 ${cityNumber(c.foodStock)} / ${cityNumber(c.foodCapacity)}</h3>
 <div class="meter"><span>재고</span><span class="track"><i style="width:${Math.min(100,c.foodStock/c.foodCapacity*100)}%"></i></span><span>${cityNumber(c.foodStock)}</span></div>
 ${c.foodWarehouse?`<p class="muted">세력 공동 창고 ${cityNumber(c.foodWarehouse.stock)} / ${cityNumber(c.foodWarehouse.capacity)}</p>`:''}
 <p class="muted">이번 정산 증감 원인</p>${causes||'<p>첫 정산 전입니다.</p>'}</div><div class="osec" data-osec="built"${otab('built')}>
 ${c.specialists?`<h3>전문인력</h3><div class="city-specialists">${SPECIALISTS.map(([k,n,icon,fx])=>`<span class="spec${c.nextSpecialist===k?' next':''}" title="${esc(fx)}">${UI_ICON(icon)}<small>${n}</small><b>${c.specialists[k]??0}</b><em>${esc(fx)}</em></span>`).join('')}</div><p class="muted">3턴마다 1명 · 다음 ${esc(SPECIALISTS.find(x=>x[0]===c.nextSpecialist)?.[1]??'')} ${c.specialistTurnsLeft}턴 뒤 · 태수의 정무 하위 능력(행정·인사→관료, 병참→병참, 제도→학자, 민정→기술자)</p>`:''}
 <h3>지은 시설</h3><ul class="city-facilities">${c.facilities.map(f=>`<li>${UI_ICON(JOB_ICON[f.kind]??'build')}${CITY_JOBS[f.kind].name} · ${esc(f.tileId)}${f.disabled?' · 효과 정지':''}</li>`).join('')||'<li>없음</li>'}</ul></div>`)
 +pane('barracks',`<h3 class="barracks-title">출진 · 편성</h3><div class="barracks-scroll"><div class="barracks-readiness" aria-label="병력 현황"><p><span>예비병 <b>${cityNumber(c.reserveTroops??0)}명</b></span><span>부상병 <b>${cityNumber(c.woundedTroops??0)}명</b></span><span>주변 부대 <b>${armies.length}개</b></span>${Number.isFinite(c.foodStock)?`<button type="button" class="barracks-food-link" data-barracks-food title="관청의 식량 재고와 이번 정산 내역 보기">현지 식량 <b>${cityNumber(c.foodStock)}</b> · 내역 ›</button>`:''}</p>${barracksSupplyNote(v,selectedCityId)?`<p class="barracks-warning" title="현재 보급 출처가 이 성인 부대의 직전 정산 결과입니다. 새 부대의 출진 후 결과를 예측한 것은 아닙니다.">${esc(barracksSupplyNote(v,selectedCityId))}</p>`:'<p class="barracks-guide">출진: 장수와 예비병으로 새 부대 편성 · 모집: 예비병 충원 · 재편: 주변 부대 병종 변경</p>'}${!armies.length?'<p class="barracks-warning">재편할 부대가 없습니다. 부대를 이 성 주변 2칸 안으로 이동시키세요.</p>':''}</div><p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>${c.currentProduction?.kind==='muster'?` — ${esc(v.officers[c.currentProduction.officerId]?.name??'장수')} · ${esc(TROOP_LABEL[c.currentProduction.troopType]??c.currentProduction.troopType)}`:''}`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="options">${milOptions||'<p class="muted">이 성에서 할 수 있는 군사 일이 없습니다.</p>'}</div>
 ${musterOfficers.length?`<div class="muster-target"><label>출진 장수 <select id="city-job-officer">${musterOfficers.map(o=>{const tag=musterTag(v.officers[o.officerId]);return `<option value="${esc(o.officerId)}" ${c.currentProduction?.kind==='muster'&&c.currentProduction.officerId===o.officerId?'selected':''} ${tag?'disabled':''}>${esc(o.name)}${o.officerId===c.governorId?' (태수)':''}${tag}</option>`;}).join('')}</select></label><label>병종 <select id="city-job-muster-troop"></select></label><small id="muster-troop-info" class="muster-info"></small></div>`:('freeOfficers' in c?'<p class="muted">출진할 장수가 없습니다(부대를 맡지 않은 장수가 이 성에 있어야 함).</p>':'')}
 ${armies.length?`<div class="reorganize-target"><label>재편 부대 <select id="city-job-army">${armies.map(a=>`<option value="${esc(a.armyId)}">${esc(v.officers[a.commanderId]?.name??a.armyId)}</option>`).join('')}</select></label><label>병종 <select id="city-job-troop"></select></label></div>`:''}</div><footer class="barracks-footer"><p id="muster-selection" aria-live="polite"></p>${musterOption}</footer>`)
 +pane('tavern',`<p class="place-lede">떠돌이 인재와 소문이 모이는 곳. 마음 맞는 장수들과 술자리를 열 수도 있다.</p>${feastHtml(v,c)}${v.social?tavernActsHtml(v,c):''}<h3>떠돌이 인재</h3>${wanderersHtml(c.wanderers,true)||'<p class="muted">이 성에 재야 장수가 없습니다.</p>'}`)
 +pane('residence',`<p class="place-lede">장수들이 머무는 곳. 찾아가 이야기를 나눌 수 있다.</p><div class="city-governor">${portrait?`<img src="${esc(portrait)}" alt="${esc(governor?.name??'태수')} 초상">`:`<span class="governor-placeholder">${governor?faceFallback(governor.name,FACTION_STYLE[c.ownerFactionId]?.color):'공석'}</span>`}<div><small>태수</small><b>${esc(governor?.name??'공석')}</b><br>정무 ${governor?.baseStats.politics??'—'} · 산출 +${cityNumber(rates.bonus*100)}%</div></div>
 <div class="governor-pick">${governorSelection}</div>${c.starAction?starButton(c.starAction,`data-city-star="${esc(c.cityId)}"`):''}${v.social?visitListHtml(v,c):(c.freeOfficers??[]).length?`<h3>성의 자유 장수</h3><ul class="wanderers">${c.freeOfficers.map(o=>`<li><b>${esc(o.name)}</b> <small>${statLine(v.officers[o.officerId]??o)}</small></li>`).join('')}</ul>`:''}`);
 refreshCityTroops(v);refreshMusterTroops(v);
}
function economyCauseDisplay(x) {
 const n=Number(x.amount),absolute=Math.abs(n),rounded=Math.round(absolute*10)/10;
 const amount=!Number.isFinite(n)?'—':n===0?'0':absolute<.1?`0.1 미만 ${n>0?'증가':'감소'}`:`${n>0?'+':'−'}${rounded.toLocaleString('ko-KR')}`;
 const farm=x.resource==='food'&&x.label==='농지 산출';
 return {label:farm?'농지·기타 산출 보정':x.label,amount,hint:farm?'다른 산출 항목을 따로 표시하기 위한 조정이 포함됩니다. 음수라고 농지가 식량을 소비한다는 뜻은 아닙니다.':''};
}
function barracksSupplyNote(v,cityId) {
 if(!v.ownCities?.[cityId])return '';
 const hungry=Object.values(v.ownArmies??{}).filter(a=>a.troopCount>0&&a.supply?.sourceCityId===cityId&&a.supply.state==='STARVING'),count=hungry.length;
 // 새 군량 규칙(C145 'clock'): 굶주림은 보급권 밖에서만 생기고 새 출진 부대는 군량을 가득 싣는다
 if(count&&hungry[0].supply.model==='clock')return `이 성에 보급선을 댄 부대 ${count}개가 보급권 밖에서 굶주리고 있습니다 — 성 · 보급 거점에서 8칸 안으로 돌아오면 군량이 채워집니다.`;
 return count?`보급 연결 부대 ${count}개가 군량 부족 상태입니다. 추가 출진 전 보급을 확인하세요.`:'';
}
function musterPreparationText(t) {
 const parts=[];
 if(Number.isFinite(t?.reserveRequired))parts.push(`출진 조건: 예비병 최소 ${t.reserveRequired}명 (고정 소비량 아님)`);
 if(t?.effectLine)parts.push(t.effectLine);
 if(t?.costLine)parts.push(`대가 ${t.costLine}`);
 if(t?.blockedReason)parts.push(reasonText(t.blockedReason));
 return parts.join(' · ');
}
function refreshMusterButton() {
 const button=$('[data-city-job="muster"]'),city=state.cities[selectedCityId];
 if(!button||!city)return;
 const officerId=$('#city-job-officer')?.value,troopType=$('#city-job-muster-troop')?.value;
 const reason=cityJobReason(state,city,'muster')??musterReason(state,city,officerId,troopType||$('#city-job-muster-troop')?.options?.[0]?.value)??(!troopType?'INVALID_MUSTER_OFFICER_OR_TROOP':null);
 button.disabled=inputLocked()||!!reason;
 const summary=$('#muster-selection'),v=summary?view(state):null,c=v?.ownCities[selectedCityId],o=v?.officers[officerId];
 if(summary)summary.textContent=`${o?.name??'장수 미선택'} · ${TROOP_LABEL[troopType]??SPECIAL_TROOPS[troopType]?.displayName??troopType??'병종 미선택'} · 예비병 ${cityNumber(c?.reserveTroops??0)}명에서 편성 (완성 시 인원 확정)`;
 const text=button.querySelector('small'),turns=button.querySelector('[data-k="turns"]');
 if(text){button.dataset.readyText??=text.textContent;text.textContent=reason?reasonText(reason):button.dataset.readyText;}
 if(turns){button.dataset.readyTurns??=turns.textContent;turns.textContent=reason?'—':button.dataset.readyTurns;}
}
function refreshMusterTroops(v=view(state)){
 const id=$('#city-job-officer')?.value,select=$('#city-job-muster-troop');if(!select||!id){refreshMusterButton();return;}
 const c=v.ownCities[selectedCityId],o=v.officers[id]??c?.freeOfficers?.find(x=>x.officerId===id);
 const apt=state.campaignGrowth?.officers[id]?.pack?.troopAptitude??{},rank={HIGH:0,MEDIUM:1,LOW:2},bt={militia:'BT01',spear:'BT02',bow:'BT03',cavalry:'BT04'};
 // C24: view 의 musterOptions(특수 병종·투석기, 막힘 이유·효과·대가)가 있으면 그것으로
 const opts=c?.musterOptions?.find(m=>m.officerId===id)?.troops;
 if(opts){const pb={BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'};
  select.innerHTML=opts.filter(t=>!SPECIAL_TROOPS[t.troopType]?.factionId||SPECIAL_TROOPS[t.troopType].factionId===state.playerFactionId).map(t=>{const base=TROOP_LABEL[t.troopType],a=apt[t.parentBaseTroopId];return `<option value="${esc(t.troopType)}" ${c.currentProduction?.kind==='muster'&&c.currentProduction.officerId===id&&c.currentProduction.troopType===t.troopType&&!t.blockedReason?'selected':''} ${t.blockedReason?'disabled':''}>${esc(base??t.troopDisplayName)}${base?'':' ★'}${a==='HIGH'?' · 적성 높음':''}${t.blockedReason?' — '+esc(reasonText(t.blockedReason)):''}</option>`;}).join('');
  const info=$('#muster-troop-info');const show=()=>{const t=opts.find(x=>x.troopType===select.value);if(info)info.textContent=t?musterPreparationText(t)+(t.parentBaseTroopId==='BT03'&&t.troopType!=='catapult'?' · 원거리 병종은 일반 공격으로 성벽을 치지 못합니다(공성 전법 예외) — 성을 치려면 다른 병종과 함께':''):`출진 불가: ${reasonText(opts[0]?.blockedReason)||'가능한 병종 없음'}`;refreshMusterButton();};select.onchange=show;show();return;}
 select.innerHTML=[...(o?.allowedTroops??[])].sort((a,b)=>(rank[apt[bt[a]]]??1)-(rank[apt[bt[b]]]??1)).map(t=>`<option value="${t}">${TROOP_LABEL[t]??t}${apt[bt[t]]==='HIGH'?' · 적성 높음':''}</option>`).join('');
 select.onchange=refreshMusterButton;refreshMusterButton();
}
function refreshCityTroops(v=view(state)) {
 const army=v.ownArmies[$('#city-job-army')?.value],select=$('#city-job-troop');
 if(!select||!army)return;
 const troopName={militia:'보병',spear:'창병',bow:'궁병',cavalry:'기병',engineer:'보병',mystic:'궁병'};
 select.innerHTML=v.officers[army.commanderId].allowedTroops.map(type=>`<option value="${type}" ${type===army.troopType?'selected':''}>${troopName[type]??type}</option>`).join('');
}
$('#city-panel').addEventListener('change',e=>{if(e.target.id==='city-job-army')refreshCityTroops();if(e.target.id==='city-job-officer')refreshMusterTroops();});
$('#city-panel').addEventListener('click',e=>{
 if(e.target.closest('[data-barracks-food]')){officeTab='state';if(stage.fac){enterFacility('office');}else{cityTab='office';renderCityPanel(view(state));}return;}
 if(e.target.closest('[data-city-close]')){selectedCityId=null;$('#city-panel').hidden=true;return;}
 const starCity=e.target.closest('[data-city-star]')?.dataset.cityStar;
 if(starCity&&!inputLocked()){command({type:'STAR_ACTION',cityId:starCity});return;}
 const tabId=e.target.closest('[data-city-tab]')?.dataset.cityTab;
 if(tabId&&stage.fac&&BUILDINGS[tabId]&&tabId!==stage.fac){enterFacility(tabId);return;}
 if(tabId){cityTab=tabId;renderCityPanel(view(state));return;}
 const oTab=e.target.closest('[data-office-tab]')?.dataset.officeTab;
 if(oTab){officeTab=oTab;renderCityPanel(view(state));return;}
 const wanderer=e.target.closest('[data-wanderer]')?.dataset.wanderer;
 if(wanderer&&!inputLocked()){const why=wandererReason(wanderer,selectedCityId);if(why){$('#status').textContent=why;return;}const before=state;command({type:'WANDERER_RECRUIT',officerId:wanderer,cityId:selectedCityId});if(state!==before)$('#status').textContent='협의를 시작했습니다 — 다음 차례에 결과가 옵니다';return;}
 const pick=e.target.closest('[data-feast-pick]')?.dataset.feastPick;
 if(pick){feastPick=feastPick.includes(pick)?feastPick.filter(x=>x!==pick):[...feastPick,pick].slice(0,3);renderCityPanel(view(state));return;}
 if(e.target.closest('[data-feast-open]')&&!inputLocked()){openFeast(selectedCityId);return;}
 const visitId=e.target.closest('[data-visit]')?.dataset.visit;
 if(visitId&&!inputLocked()){openVisit(visitId);return;}
 if(e.target.closest('[data-governor-appoint]')&&!inputLocked()){command({type:'CITY_GOVERNOR',cityId:selectedCityId,officerId:$('#city-governor').value});return;}
 const di=e.target.closest('[data-domestic]')?.dataset.domestic;
 if(di!==undefined&&!inputLocked()){const d=view(state).ownCities[selectedCityId]?.domesticCommands?.[Number(di)];if(d)command({type:d.type,cityId:d.cityId,...(d.resource?{resource:d.resource}:{}),...(d.officerId?{officerId:d.officerId}:{})});return;}
 const method=e.target.closest('[data-occupation-method]')?.dataset.occupationMethod;
 if(method&&!inputLocked()){command({type:'OCCUPATION_METHOD',cityId:selectedCityId,method});return;}
 const kind=e.target.closest('[data-city-job]')?.dataset.cityJob;
 if(kind&&!inputLocked())command({type:'CITY_JOB',cityId:selectedCityId,kind,
  ...(kind==='reorganize'?{armyId:$('#city-job-army')?.value,troopType:$('#city-job-troop')?.value}:kind==='muster'?{officerId:$('#city-job-officer')?.value,troopType:$('#city-job-muster-troop')?.value}:{})});
});
function refreshContinue() {
  attempt(()=>settle(savedState(),saved=>{$('#continue').disabled = !saved;}),
    ()=>{$('#continue').disabled = true; $('#status').textContent = '저장을 읽을 수 없습니다. 기존 저장은 보존했습니다.';});
}
function resume() {
  attempt(()=>settle(savedState(),applySaved),error=>{$('#status').textContent = errorText(error);});
}
function applySaved(saved) {
  try {
    if (!saved) throw new Error('캠페인 저장이 없습니다.');
    cancelStrike();saved.manualEndTurn=true;state = saved;recordNotices=[];newsArchive=[];overlapPick=null;cancelAttackConfirmation();recentCombats=[];lastFoodChange=null;lastUnitResult=null;lastFacilityResults=[];turnLog=[];selectedArmyIds=[];scheduleOrders(); attackMode=false; selectedArmyId=null;menuOpen=false;moveMode=false;destination=null;zoom=START_ZOOM;render();centerPlayer(); scheduleAi(); $('#status').textContent = '저장된 캠페인을 이어합니다.';
  } catch (error) {$('#status').textContent = error.message;}
}
// 새 판의 시드: 주소의 ?seed= 가 있으면 그것(재현용), 브라우저에서는 매번 새로(판마다 포텐·Draft가 달라지게 — 완료 기준 3),
// 브라우저가 아닌 시험 환경은 기존 고정값
function newCampaignSeed(){
 const fixed=Number(new URLSearchParams(globalThis.location?.search??'').get('seed'));
 if(Number.isSafeInteger(fixed)&&fixed>0)return fixed;
 if(typeof window!=='undefined'&&globalThis.crypto?.getRandomValues)return 1+globalThis.crypto.getRandomValues(new Uint32Array(1))[0]%2147483646;
 return 190919;
}
for (const button of document.querySelectorAll('button[data-faction]')) {
  button.disabled = false;
  // 새 판: 세력을 고르면 먼저 운명 드래프트(함께 깨어날 다섯 사람 — 정본 SG_OFFICER_DRAFT §1)를 거친다. 주소에 ?draft=0 이면 건너뛰어 기본 동료로 시작한다(자동 점검·옛 화면용)
  const begin=(factionId,seed,companions)=>{
    cancelStrike();clearTimeout(aiTimer);clearTimeout(orderTimer);selectedArmyIds=[];attackMode=false;// 새 판은 성에서 시작한다(야전 부대 없음 — 사용자 2026-10-11 "기본적으로 2부대 출진돼 있는 거 삭제"). 주소에 ?field=1 이면 예전처럼 두 부대가 나와 있는 채로(자동 점검 도구용)
    recordNotices=[];newsArchive=[];overlapPick=null;cancelAttackConfirmation();recentCombats=[];lastFoodChange=null;lastUnitResult=null;lastFacilityResults=[];turnLog=[];
    state = createCampaign({factionId,seed,manualEndTurn:true,...(companions?{companions}:{}),...(new URLSearchParams(location.search).get('field')==='1'?{}:{fieldArmies:false})});
    selectedArmyId=null;menuOpen=false;moveMode=false;unlockAudio();zoom=START_ZOOM;render();centerPlayer(); $('#status').textContent = Object.keys(view(state).ownArmies).length?'부대를 선택해 이동 명령을 내리세요.':'나와 있는 부대가 없습니다 — 성을 눌러 들어가 병영에서 출진시키십시오.';
  };
  button.addEventListener('click', () => {
    const factionId=button.dataset.faction,seed=newCampaignSeed(),host=$('#officer-draft');
    if(!host||!document.body.classList.contains('ink')||new URLSearchParams(location.search).get('hud')==='old'||new URLSearchParams(location.search).get('draft')==='0'){begin(factionId,seed);return;}
    const card=document.querySelector(`.w-lord[data-pick="${factionId}"]`),ruler={id:/cutout\/(G\d+)/.exec(card?.querySelector('.art')?.getAttribute('style')??'')?.[1]??'',name:card?.querySelector('.plate b')?.textContent??''};
    unlockAudio();bgmWanted='draft';bgm.scene('draft'); // 석각 드래프트는 따로 든 곡(깨어남)
    openOfficerDraft(host,{factionId,seed,ruler,art:id=>fullArt(id)?.src,onConfirm:c=>begin(factionId,seed,c),onBack:()=>{bgmWanted='title';bgm.scene('title');},intro:true,sfx:name=>{try{pilotAudio.play(name==='confirm'?'select':'turn',`draft:${++soundSequence}`);}catch{}}}); // intro = '군주가 부른다' 장면부터(연출은 officer-draft-ui.mjs, ?fx=0 으로 끔)
  });
}
$('#end-turn').addEventListener('click', e => {const b=$('#end-turn').dataset.blocker;if(b&&!e?.shiftKey){openCity(b,'jobs');$('#status').textContent='생산할 작업을 고르세요 · Shift+클릭이나 Shift+Enter 로 그냥 넘기기';return;}command({type:'END_TURN'});});
function writeCampaignSave(){
  $('#save-confirm').hidden=true;$('#status').textContent='저장 중…';
  attempt(()=>settle(saveText(CAMPAIGN_SAVE_KEY,serialize(state)),r=>{refreshContinue();$('#status').textContent=`저장했습니다. 저장 칸은 하나입니다 — 이전 저장을 덮어씁니다${r?.bytes?` (${Math.max(1,Math.round(r.bytes/1024)).toLocaleString('ko-KR')}KB)`:''}`;}),()=>{$('#status').textContent='저장하지 못했습니다.';});
}
$('#save').title='저장 칸은 하나입니다 — 이전 저장을 덮어씁니다';
$('#save').addEventListener('click',()=>{
 if(!state||combatAnimating||state.phase==='AI')return;
 $('#status').textContent='저장 칸은 하나입니다 — 이전 저장을 덮어씁니다';
 attempt(()=>settle(savedState(),saved=>{if(saved){$('#save-confirm').hidden=false;$('#save-cancel').focus();}else writeCampaignSave();}),()=>{$('#status').textContent='기존 저장을 확인하지 못했습니다. 저장을 덮어쓰지 않았습니다.';});
});
$('#save-overwrite').addEventListener('click',writeCampaignSave);
$('#save-cancel').addEventListener('click',()=>{$('#save-confirm').hidden=true;$('#save').focus();});
$('#continue').addEventListener('click',resume);
$('#load-again')?.addEventListener('click',resume);
loadV3Manifest().then(()=>{const k=v3Asset('title/key-art.webp');if(k)$('#selection')?.style?.setProperty('--key-art',`url(${k})`);if(state)render();else renderModeRail();}).catch(()=>{});
$('#mode-rail')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-mode]');if(b){setV3Mode(b.dataset.mode);uiSfx.play('bell');if(state)render();return;}if(e.target.closest?.('#roster-open'))$('#roster').hidden=!$('#roster').hidden;});
$('#roster-close')?.addEventListener('click',()=>{$('#roster').hidden=true;});
$('#mini-toggle')?.addEventListener('click',()=>{$('#mini').hidden=!$('#mini').hidden;renderMini();});
function renderMini(){
 const box=$('#mini'),svg=$('#map svg'),port=$('.viewport');if(!box||box.hidden||!svg?.getBoundingClientRect||!port)return;
 // 작은 지도는 땅만 담는다(땅 밖 구름 여백 mapMargin 은 뺀다)
 const art=v3MapOptions().mapArt,W=220,r0=svg.getBoundingClientRect(),m0=mapMargin*zoom,s={x:r0.x+m0,y:r0.y+m0,width:Math.max(1,r0.width-2*m0),height:Math.max(1,r0.height-2*m0)},H=Math.round(W*s.height/Math.max(1,s.width));
 const k=W/Math.max(1,s.width),x=(port.scrollLeft-m0)*k,y=(port.scrollTop-m0)*k,w=port.clientWidth*k,h=port.clientHeight*k;
 // 성(세력색 마름모)·보이는 부대(점, 내 부대는 흰 테)
 const at=el=>{const r=el.getBoundingClientRect();return `left:${((r.x+r.width/2-s.x)*k).toFixed(1)}px;top:${((r.y+r.height/2-s.y)*k).toFixed(1)}px`;};
 const cities=[...svg.querySelectorAll('.w-city[data-city]')].map(el=>`<b class="mc" style="${at(el)};--c:${FACTION_STYLE[state?.cities?.[el.dataset.city]?.ownerFactionId]?.color??'#8f8d84'}"></b>`).join('');
 const units=[...svg.querySelectorAll('.w-unit[data-unit]')].map(el=>{const a=state?.armies?.[el.dataset.unit];return `<i class="mu${a?.factionId===state?.playerFactionId?' me':''}" style="${at(el)};--c:${FACTION_STYLE[a?.factionId]?.color??'#8f8d84'}"></i>`;}).join('');
 box.innerHTML=`<div class="mini-art" style="width:${W}px;height:${H}px;${art?`background-image:url(${art})`:''}">${cities}${units}<i class="mini-view" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></i></div>`;
}
$('#mini')?.addEventListener('click',e=>{const a=$('#mini .mini-art'),svg=$('#map svg'),port=$('.viewport');if(!a?.getBoundingClientRect||!svg)return;const r=a.getBoundingClientRect(),m0=mapMargin*zoom,k=Math.max(1,svg.getBoundingClientRect().width-2*m0)/r.width;port.scrollTo({left:(e.clientX-r.left)*k+m0-port.clientWidth/2,top:(e.clientY-r.top)*k+m0-port.clientHeight/2,behavior:'smooth'});});
$('.viewport')?.addEventListener('scroll',()=>{if(!$('#mini')?.hidden)renderMini();},{passive:true});
$('#report-toggle')?.addEventListener('click',()=>$('#w-report')?.classList?.toggle('open'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#roster').hidden=true;});
globalThis.addEventListener('storage',event => {if (event.key === CAMPAIGN_SAVE_KEY || event.key === saveMarkerKey(CAMPAIGN_SAVE_KEY) || event.key === null) refreshContinue();});
$('#status').textContent = '세력을 선택하세요.';
refreshAudio();
refreshContinue();

export function unitMenuPlacement(rect,scroll,viewport,anchor,menuHeight,targets=[]){
 const left=Math.max(8,rect.left,scroll.left),top=Math.max(8,rect.top,scroll.top),right=Math.min(viewport.width-8,rect.right,scroll.right),bottom=Math.min(viewport.height-8,rect.bottom,scroll.bottom);
 const width=Math.max(0,Math.min(280,right-left)),height=Math.max(0,bottom-top);if(width<120||height<90)return null;
 const h=Math.min(menuHeight,height),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const unit=anchor.bounds??{left:anchor.clientX-55,right:anchor.clientX+55,top:anchor.clientY-55,bottom:anchor.clientY+90};
 const obstacles=[unit,...targets],gap=12;
 const sideY=clamp(anchor.clientY-h/2,top,bottom-h);
 const candidates=[{x:unit.right+gap,y:sideY},{x:unit.left-gap-width,y:sideY},
   {x:clamp(anchor.clientX-width/2,left,right-width),y:unit.bottom+gap},
   {x:clamp(anchor.clientX-width/2,left,right-width),y:unit.top-gap-h}];
 for(const c of candidates){
   if(c.x<left||c.x+width>right||c.y<top||c.y+h>bottom)continue;
   if(obstacles.every(t=>c.x+width<=t.left||c.x>=t.right||c.y+h<=t.top||c.y>=t.bottom))return {width,maxHeight:height,left:c.x,top:c.y};
 }
 return null;
}
function positionUnitMenu(){
 const menu=$('#unit-menu'),svg=$('#map svg'),id=selectedArmyId;
 if(menu?.style)for(const k of ['left','top','width','maxHeight'])menu.style[k]='';return;
 if(!menuOpen||!svg?.getScreenCTM||!menu.getBoundingClientRect)return;
 const node=svg.querySelector(`[data-unit="${id}"]`);if(!node?.getScreenCTM())return;
 const point=svg.createSVGPoint(),anchor=point.matrixTransform(node.getScreenCTM());
 const bounds=node.getBoundingClientRect();
 const obstacles=[...attackTargets(state,id).map(target=>svg.querySelector(`[data-unit="${target}"]`)?.getBoundingClientRect()).filter(Boolean),
   ...[...svg.querySelectorAll('.mr-unit .plate')].filter(n=>n.closest('[data-unit]')?.dataset.unit!==id).map(n=>n.getBoundingClientRect()), // 자기 이름표는 붙어 있어도 된다
   ...[...svg.querySelectorAll('.mr-attack')].map(n=>n.getBoundingClientRect())]; // 공격할 수 있는 성 칸도 가리지 않게
 const placement=unitMenuPlacement(svg.getBoundingClientRect(),$('#game').getBoundingClientRect(),{width:innerWidth,height:innerHeight},{clientX:anchor.x,clientY:anchor.y,bounds},menu.offsetHeight,obstacles);
 menu.hidden=!placement;if(placement)for(const [key,value]of Object.entries(placement))menu.style[key]=value+'px';
}
function closeUnitMenu(){setCommandIntent('');selectedTacticId=null;attackMode=false;menuOpen=false;moveMode=false;faceMode=false;queueMicrotask(renderHint);destination=null;selectedArmyId=null;selectedArmyIds=[];if(state)render();}
// 부대 명령 카드 머리(레퍼런스: 삼국지14 초상 부대 · 문명6 선택 패널 · 워해머3 부대 카드) — 초상·병종·병력·사기·전열
// C21 전문인력(사용자 2026-10-04 승인 단순안): 종류·이름·아이콘·1명당 효과
const SPECIALISTS=[['artisan','기술자','build','생산 +1'],['official','관료','politics','산출 +5% · 점령 단계 −1'],['scholar','학자','science','과학 +1'],['logistician','병참','food','군량 +1']];
const JOB_ICON={muster:'troops',workshop:'build',recruit:'recruit',reorganize:'class',farm:'food',granary:'food',repair:'security',market:'gold',barracks:'troops',tuntian:'food',clinic:'wounded',mufu:'command'};
// 초상이 아직 없는 장수: 투구 쓴 반신 실루엣 + 이름 첫 글자 인장(문명·올드 월드의 빈 초상 자리처럼) — 초상 그림은 GPT 담당
const BUST=['M32 2c2 0 3 2 2 5l-1 3c7 1 11 6 12 14l2 3-1 6h-4c-1 7-5 12-10 12s-9-5-10-12h-4l-1-6 2-3c1-8 5-13 12-14l-1-3c-1-3 0-5 2-5z','M26 43v5c-10 1-17 6-19 16h50c-2-10-9-15-19-16v-5c-2 2-4 3-6 3s-4-1-6-3z'];
const faceFallback=(name,color)=>`<span class="face-fb"${color?` style="--fc:${color}"`:''}><svg viewBox="6 0 52 64" aria-hidden="true">${BUST.map(d=>`<path d="${d}"/>`).join('')}</svg><i>${esc(String(name??'').slice(0,1))}</i></span>`;
// 공격 예측 카드(파이어 엠블렘 예측 창·문명6 전투 예측·올드 월드) — 양측 병력 전→후, 결과 단계, 방향, 보정, 판정 확률
const SIDE_NAME={FRONT:'정면',FLANK:'측면',REAR:'후방'};
function fcCol(name,face,before,after,cls){const lost=Math.max(0,before-after),w=v=>Math.max(0,Math.min(100,v/Math.max(1,before)*100)).toFixed(1);return `<div class="fc-col ${cls}"><div class="fc-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(name)}</div><b>${esc(name)}</b><div class="fc-bar"><i style="width:${w(after)}%"></i><s style="width:${w(lost)}%"></s></div><small>${before} → <em>${after}</em> <span>−${lost}</span></small></div>`;}
function fcResult(ef,af,destroyed){return destroyed?['격파','win']:ef-af>0.15?['대승','win']:ef-af>0.05?['우세','good']:ef-af>-0.05?['접전','even']:['불리','bad'];}
function forecastHtml(attId,tgtId,p,title=''){
 const A=state.armies[attId],T=state.armies[tgtId],an=state.officers[A?.commanderId]?.name??'',tn=state.officers[T?.commanderId]?.name??'적';
 // 적 병력은 공격자에게 보이는 값(가짜 깃발이면 2배 — 정본 20 v3.5)으로 보여 준다
 const aT=A?.troopCount??0,tT=p.shownTargetCount??(T?.troopCount??0)*campaignShownScale(state,tgtId,state.playerFactionId),aAfter=Math.max(0,aT-(p.allyLoss??0)),tAfter=shownTroopForecast(tT,p.enemyLoss??0,campaignShownScale(state,tgtId,state.playerFactionId)).after;
 const [res,cls]=fcResult((p.enemyLoss??0)/Math.max(1,tT),(p.allyLoss??0)/Math.max(1,aT),tAfter<=0);
 const m=p.multipliers??{},mods=[...(p.effectLines??[])];
 if(m.terrain&&m.terrain!==1)mods.push(`${state.tiles[T.tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`);if(m.castle&&m.castle!==1)mods.push(`성 방어 ×${m.castle}`);if(m.matchup&&m.matchup!==1)mods.push(`상성 ${m.matchup<1?'불리':'유리'} ×${m.matchup}`);if(m.river&&m.river!==1)mods.push('도하 ×0.75');if(m.flank&&m.flank!==1)mods.push(`협공 +${Math.round((m.flank-1)*100)}%`);
 const risks=[surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===T?.factionId)?.attackWarning),p.formationRisk?.check?`적 전열 판정 — 버틸 확률 ${Math.round(p.formationRisk.successProbability*100)}%`:null,p.moraleRisk?.check?`적 사기 판정 — 버틸 확률 ${Math.round(p.moraleRisk.successProbability*100)}%`:null].filter(Boolean);
 return `<div class="fc-top">${title?`<span class="fc-title">${esc(title)}</span>`:''}<span class="fc-res" data-res="${cls}">${res}</span>${SIDE_NAME[p.side]?`<span class="fc-dir" data-side="${esc(p.side)}">${SIDE_NAME[p.side]} 공격</span>`:''}${p.counter===false?'<span class="fc-tag">반격 없음</span>':''}</div><p class="fc-sum">아군 −${p.allyLoss??0} / 적 −${p.enemyLoss??0}</p><div class="fc-vs">${fcCol(an,faceOf(A?.commanderId),aT,aAfter,'ally')}<b class="fc-x">VS</b>${fcCol(tn,faceOf(T?.commanderId),tT,tAfter,'enemy')}</div>${mods.length?`<ul class="fc-mods">${mods.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${risks.map(x=>`<p class="fc-risk">${esc(x)}</p>`).join('')}`;
}
function cityLabel(id){return document.querySelector?.(`#map .w-cityplate[data-city="${id}"] .name`)?.textContent??id;}
function setTip(tip,html,text){tip.classList?.add('forecast');tip.innerHTML=html;if(!('firstElementChild' in tip))tip.textContent=text;}
function placeTip(tip,e,w=320){
 if(globalThis.document?.body?.classList?.contains('hud-band')){
  if(tip.classList.contains('forecast')&&tip.querySelector('.fc-vs,.fc-dur,.fc-bar.wide')){
   const a=state.armies[selectedArmyId],own=tip.querySelector('.fc-vs')?'':`<div class="nb-city-ally"><img src="${esc(faceOf(a?.commanderId))}" alt=""><b>${esc(state.officers[a?.commanderId]?.name??'')}</b><small>병력 ${a?.troopCount??0} → ${a?.troopCount??0} · 예상 손실 0</small></div>`;
   const tile=targetTile(e.target,state.armies,state.cities),band=document.querySelector('.nb-band');
   document.dispatchEvent(new CustomEvent('ink:forecast',{detail:{html:own+tip.innerHTML}}));tip.hidden=true;
   if(tile&&band&&band.dataset.target!==tile){band.dataset.target=tile;requestAnimationFrame(()=>follow(selectedArmyId,true,tile));}return;
  }
  document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));const band=document.querySelector('.nb-band');if(band)delete band.dataset.target;
 }
 w=Math.max(w,tip.offsetWidth||0);const h=tip.offsetHeight||200,gap=70,right=e.clientX+gap;let left=right+w+8>innerWidth?Math.max(8,e.clientX-gap-w):right; // 대상 칸(방향 색)을 가리지 않게 옆으로. 폭·높이는 실제 창 크기(흑묵 교전 판은 320 보다 넓다 — 화면 밖으로 잘리던 것)
 const cap=tip.querySelector?.(':scope>.fc-sum:first-child')?.offsetHeight||0; // 판 위에 붙는 대상 설명 줄 — 화면 위로 잘리지 않게 그만큼 내린다
 const top=Math.max(8+(cap?cap+6:0),e.clientY>innerHeight*.5?e.clientY-h-110:Math.min(innerHeight-h-70,e.clientY-60)); // 화면 아래쪽 대상이면 창을 위로 올린다(아래 부대 판·명령 줄과 겹치지 않게)
 // 좁은 화면(1180×757): 왼쪽에 놓으면 왼쪽 아래 행동 판의 글을 덮는다(닷토리 새 판 11회차) — 대상 칸을 가리지 않는 한 오른쪽 끝에 붙인다
 if(left<right){const r=globalThis.document?.querySelector?.('.ih-readout:not([hidden])')?.getBoundingClientRect?.(),alt=innerWidth-w-8;if(r?.width&&left<r.right&&top<r.bottom&&top+h>r.top&&alt>=e.clientX+24)left=alt;}
 const box=tip.getBoundingClientRect?.(),children=box?[...(tip.querySelectorAll?.('.fc-sum,.fc-mods,.fc-risk')??[])].map(el=>el.getBoundingClientRect()):[];
 const above=box?Math.max(0,...children.map(r=>box.top-r.top)):cap+6,below=box?Math.max(0,...children.map(r=>r.bottom-box.bottom)):0;
 tip.style.top=Math.max(8+above,Math.min(top,innerHeight-h-below-8))+'px';tip.style.left=Math.min(left,Math.max(8,innerWidth-w-8))+'px';}
// 성 생산 상태(지도 이름표·턴 종료 안내용)
function cityProductionBadge(c){
 const sc=state.cities[c.cityId];if(!sc||!c.jobs)return null;
 const stage=state.occupations?.[c.cityId]?.stage;if(stage&&stage!=='NORMAL')return null;
 if(!c.currentProduction)return {idle:true};
 const kind=c.currentProduction.kind,job=c.jobs.find(j=>j.kind===kind)??{};
 return {name:job.name??CITY_JOBS[kind]?.name??kind,turns:productionReadout(job.estimate).turns};
}
function idleCities(v){return state.phase==='PLAYER'&&!state.gameResult?Object.values(v.ownCities).filter(c=>cityProductionBadge(c)?.idle):[];}
function closeProdPop(){const p=document.querySelector?.('#prod-pop');if(p)p.hidden=true;}
function openProdPop(cityId,e){
 const v=view(state),c=v.ownCities[cityId];if(!c?.jobs||!document.createElement)return false;
 let pop=document.querySelector('#prod-pop');if(!pop){pop=document.createElement('div');pop.id='prod-pop';pop.className='panel lacquer prod-pop';document.body.appendChild(pop);
  pop.addEventListener('click',ev=>{const k=ev.target.closest('[data-quick-job]')?.dataset.quickJob,more=ev.target.closest('[data-quick-more]');const id=pop.dataset.city;
   if(more){closeProdPop();openCity(id,'jobs');return;}if(k&&!inputLocked()){closeProdPop();command({type:'CITY_JOB',cityId:id,kind:k});const next=idleCities(view(state))[0];if(next&&next.cityId!==id)$('#status').textContent=`생산 선택 — 다음 성: ${next.name} (턴 종료 버튼으로 이동)`;}});}
 const sc=state.cities[cityId],rates=cityEconomyRates(state,sc);
 const items=c.jobs.filter(j=>!j.blockedReason&&!['muster','reorganize','repair'].includes(j.kind)).map(j=>{const turns=productionReadout(j.estimate).turns;return `<button data-quick-job="${esc(j.kind)}">${UI_ICON(JOB_ICON[j.kind]??'build')}<b>${esc(j.name)}</b><em>${esc(j.description??JOB_FX[j.kind]??'')}</em><small>${turns??'중단'}차례</small></button>`;}).join('');
 pop.dataset.city=cityId;pop.innerHTML=`<header><b>${esc(c.name)}</b> 생산 선택</header><div class="pp-list">${items||'<p class="muted">지금 바로 고를 작업이 없습니다.</p>'}</div><button class="pp-more" data-quick-more>출진·재편·자세히 — 성 창</button>`;
 pop.hidden=false;const r=pop.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(innerWidth-r.width-8,e.clientX-r.width/2))+'px';pop.style.top=Math.max(8,Math.min(innerHeight-r.height-8,e.clientY+14))+'px';return true;
}
function openCity(cityId,tab='jobs'){if(view(state).ownCities[cityId]){closeUnitMenu();openStage(cityId,tab==='jobs'||tab==='office'?'office':BUILDINGS[tab]?tab:null);return;}selectedCityId=cityId;cityTab=tab;closeUnitMenu();renderCityPanel(view(state));const n=$('#map').querySelector?.(`[data-city="${cityId}"]`);n?.scrollIntoView?.({block:'center',inline:'center',behavior:'smooth'});}
// 부대 행동 단축키(W·A·S·D 는 지도 이동이라 피함)
const JOB_FX={farm:'식량 +2 (도시당 2개까지)',granary:'식량 창고 +80',market:'인망 +1',barracks:'모집·재편 진행 +10%',workshop:'생산 +1 (도시당 2개까지)',recruit:'예비병 +500 (동원 한도 안)',muster:'장수와 예비병으로 새 부대 편성 · 병종별 출진 조건 확인',repair:'손상된 시설 수리',reorganize:'부대 병종 바꾸기'};
// 명령형 내정 특기: 누르기 전에 효과와 대가를 보여 준다(common-pool v0.3 문장)
const DOMESTIC_CMD_FX={CITY_TAX_ADVANCE:'다음 3턴 생산을 지금 받음 · 대가: 그 3턴 생산 0, 치안 한 단계 악화'};
const ACTION_KEYS={move:'Q',attack:'E',face:'F',brace:'B',regroup:'R',garrison:'G',wait:'Z'};
// 위험 지역(파이어 엠블렘 위험 지대·토탈워 영향권): 보이는 적이 다음 턴에 들어오거나 칠 수 있는 칸
function dangerTiles(v){
 if(dangerCache?.state===state)return dangerCache.tiles;
 const tiles=new Set(),near=id=>{const [q,r]=id.split(',').map(Number);return [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([a,b])=>`${q+a},${r+b}`).filter(t=>state.tiles[t]);};
 for(const a of Object.values(v.knowledge?.observedArmies??{})){if(v.knowledge.tiles[a.tileId]!=='VISIBLE'||a.factionId===state.playerFactionId)continue;let reach=[a.tileId];try{reach=[a.tileId,...[...campaignReachable(state,a.armyId,TICKS_PER_TURN)].map(([t])=>t)];}catch{}for(const t of reach){tiles.add(t);for(const n of near(t))tiles.add(n);}}
 dangerCache={state,tiles:[...tiles]};return dangerCache.tiles;
}
// 다음 부대 자동 선택(문명 '다음 유닛'): 방금 행동한 부대가 끝났으면 아직 움직일 부대를 고른다
function autoNextUnit(){if(lastActedArmy)setTimeout(autoNextUnitNow,60);}
function autoNextUnitNow(){
 const prev=lastActedArmy;
 if(!prev||!state||state.phase!=='PLAYER'||state.gameResult||combatAnimating||selectedArmyId||document.querySelector?.('.w-modal:not([hidden]),.modal-backdrop:not([hidden])'))return;
 lastActedArmy=null;
 if(state.armies[prev]&&!armyActionEnded(state,prev))return;
 const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)&&!state.moveOrders?.[id]).sort();if(!ids.length)return;
 const next=ids[0];selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;render();follow(next);positionUnitMenu();setTimeout(positionUnitMenu,120);
 $('#status').textContent=`다음 부대 — ${state.officers[state.armies[next].commanderId]?.name??''} (Space 다음 · Esc 놓기)`;
}
const ICON_GLYPH={move:'이동',attack:'공격',wait:'대기',security:'방어',command:'정면',cancel:'취소',info:'정보',tactic:'전법',build:'건설',recruit:'모집',pacify:'회유',martial:'군정',plunder:'약탈',city:'성',captive:'포로',potential:'포텐',levelup:'성장',trait:'특기','stat-up':'능력',class:'계열',food:'식량',production:'생산',science:'과학',fame:'인망',gold:'금',people:'인구',troops:'병력',reserve:'예비',wounded:'부상',charisma:'감화',valor:'무용',intellect:'지략',politics:'정무','end-turn':'종료',save:'저장',load:'불러'};
const UI_ICON=name=>`<i class="gi" aria-hidden="true">${ICON_GLYPH[name]??'·'}</i>`;
const MORALE_NAME={STEADY:'사기 안정',SHAKEN:'동요',ROUTING:'패주'},UNIT_TROOP_NAME={BT01:'도검병',BT02:'창병',BT03:'궁병',BT04:'기병'},UNIT_TROOP_NAME_SET=new Set(['도검병','창병','궁병','기병','보병']);
// 손권 P1 '별의 길': 가장 높은 큰 능력에 따른 행동 1개(부대장 대기 2턴·태수 3턴)
function starButton(a,attr){const wait=a.readyTurn>state.turn?a.readyTurn-state.turn:0;return `<button class="star-action" ${attr} ${a.canUse?'':'disabled'} title="${esc(a.description)}">${UI_ICON('potential')}별의 길 · ${esc(a.name)} <small>${esc(a.axis)} · ${a.canUse?esc(a.description):wait?`대기 ${wait}턴`:esc(reasonText(a.blockedReason))}</small></button>`;}
// 장수 가용성(C46) — 피로(재출진 제한만, 출진 중 효과 없음)·중상(요양)
function availabilityLine(o){
 if(!o)return '';const f=o.fatigue,inj=o.injury,parts=[];
 if(inj)parts.push(`<span class="av-inj" title="중상 — 요양이 끝나면 복귀(군주와 친밀도 +5·경험치 +10)">중상 · ${esc(injuryReturnText(state.turn,inj))}</span>`);
 if(f&&Number.isFinite(f.value))parts.push(`<span class="av-fat${f.musterBlocked?' blocked':''}" title="성 밖에서 보낸 차례·교전으로 오르고 성에서 쉬면 내림. 60 이상이면 다시 출진 못 함 — 이미 나가 있는 부대에는 효과 없음"><i style="--v:${Math.max(0,Math.min(100,f.value))}%"></i>피로 ${Math.round(f.value)}${f.levelName?` · ${esc(f.levelName)}`:''}${f.musterBlocked?` · 출진 불가${Number.isFinite(f.restTurns)&&f.restTurns>0?`(${f.restTurns}차례 쉼)`:''}`:''}</span>`);
 return parts.length?`<p class="av-line">${parts.join('')}</p>`:'';
}
const musterTag=o=>o?.injury?' — 중상 요양':o?.fatigue?.musterBlocked?` — 피로(${Number.isFinite(o.fatigue.restTurns)?o.fatigue.restTurns+'차례 쉼':'쉬어야 함'})`:'';
function unitCardHead(v,army,title){
 if(!army)return `<div class="dk-head"><div class="dk-id"><h2>${esc(title)}</h2></div></div>`;
 const face=faceOf(army.commanderId),color=FACTION_STYLE[army.factionId]?.color??'#7d7a6a';
 const tags=[MORALE_NAME[army.morale??'STEADY'],FORMATION_NAME[army.formation]?`전열 ${FORMATION_NAME[army.formation]}`:'전열 정연',army.braced?'방어 태세':null,(f=>f&&f.until>=state.turn?`진형 ${f.name}`:null)(state.armies[army.armyId]?.c33?.formation)].filter(Boolean);
 const max=state.armies[army.armyId]?.maxTroopCount??army.troopCount,ratio=max?Math.max(0,Math.min(1,army.troopCount/max)):1;
 return `<header class="dk-head" style="--fc:${color}"><div class="dk-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(title)}</div><div class="dk-id"><h2>${esc(title)}</h2><div class="dk-meta">${esc(army.troopDisplayName&&!UNIT_TROOP_NAME_SET.has(army.troopDisplayName)?`${army.troopDisplayName}(${UNIT_TROOP_NAME[troopToCampaign(army.troopType)]??''})`:UNIT_TROOP_NAME[troopToCampaign(army.troopType)]??'')} · 병력 <b>${army.troopCount}</b></div><div class="dk-bar"><i style="width:${(ratio*100).toFixed(0)}%"></i></div><div class="dk-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${bondChips(v.officers[army.commanderId])}</div></header>`;
}
function supplySourceText(sup,v){
 const city=v.ownCities?.[sup?.sourceCityId];if(!city)return '';
 const parts=[`보급 출처 ${city.name}`];
 if(Number.isFinite(city.foodStock))parts.push(`현지 식량 ${food1(city.foodStock)}`);
 if(Number.isFinite(city.foodWarehouse?.stock))parts.push(`공동 창고 ${food1(city.foodWarehouse.stock)}`);
 else parts.push(`세력 식량 합계 ${food1(foodSnapshot(v).stock)}`);
 return parts.join(' · ');
}
function tacticAvailability(c){if(c.targets?.length)return '사용 가능';if(c.waiting>0)return `재사용까지 ${c.waiting}턴`;if(c.reason==='ARCHER_ENGAGED')return '적과 붙어 있어 사격 불가';return '대상·사용 조건 확인';}
function selectedActions(id=selectedArmyId){
 const a=state.armies[id];return unitActionReadout({moveUsed:state.movedArmyIds.includes(id),canMove:!!a&&campaignMoveOptions(state,id).length>0,canMain:!!a&&canMainAction(state,id),ended:!a||armyActionEnded(state,id),routing:a?.morale==='ROUTING'});
}
function actionReadoutHtml(actions){return `<p class="ih-actions-left"><span class="${actions.move.available?'':'spent'}">${esc(actions.move.label)}</span><span class="${actions.main.available?'':'spent'}">${esc(actions.main.label)}</span></p>`;}
function starvingAdvice(army,v){
 const sup=army.supply,source=v.ownCities[sup?.sourceCityId],hub=v.hubs?.find(h=>h.hubId===sup?.sourceHubId),a=v.tiles[army.tileId];
 const near=Object.values({...v.knowledge.cities,...v.ownCities}).find(c=>{const t=v.tiles[c.tileId];return a&&t&&hexDistance(a,t)<=1;});
 if(near&&near.ownerFactionId!==v.factionId)return '내 성이 아니어서 이 성에서는 군량을 받지 못합니다 — 내 성으로 이동해 복귀하세요.';
 if(sup?.model==='clock'&&!source?.besieged)return '보급권(내 성 · 보급 거점에서 8칸) 밖에서 군량이 떨어졌습니다 — 보급권 안으로 돌아오면 다음 차례에 가득 채워집니다. 적 부대를 없애거나 성 · 적 거점을 빼앗아도 군량을 얻습니다.';
 if(sup?.linkState==='CUT'||(!source&&!hub))return '보급 연결이 끊겼습니다 — 내 성 방향으로 이동하거나 연결된 보급 거점을 이용하세요.';
 if(hub)return '보급 거점의 재고 또는 처리량이 부족합니다 — 내 성으로 이동해 복귀하거나 재고가 있는 다른 거점을 이용하세요.';
 if(source.foodStock<=0)return `${source.name}의 식량 재고가 0입니다 — 복귀하거나 식량이 있는 내 성으로 이동하세요.`;
 return `${source.name}의 식량 중 주민·예약 몫을 뺀 군량이 부족합니다 — 복귀해 예비병으로 합류하거나 식량이 있는 내 성으로 이동하세요.`;
}
function renderUnitMenu(v){
 const menu=$('#unit-menu');menu.hidden=!menuOpen;if(!menuOpen&&!selectedArmyId)return;
 if(selectedArmyIds.length>1){menu.innerHTML=`<header class="dk-head"><div class="dk-id"><h2>${selectedArmyIds.length}개 부대</h2><div class="dk-meta">함께 명령</div></div></header><div class="dk-body"><div class="dk-acts"><button data-menu="move" ${selectedArmyIds.every(id=>orderEligible(state,id))?'':'disabled'}>${UI_ICON('move')}이동(목적지 클릭)</button><button data-menu="brace" ${selectedArmyIds.every(id=>!armyActionEnded(state,id)&&canMainAction(state,id))?'':'disabled'} title="${selectedArmyIds.every(id=>!armyActionEnded(state,id)&&canMainAction(state,id))?'전체 방어':'행동을 마친 부대가 포함되어 있습니다.'}">${UI_ICON('security')}방어 태세(전체)</button><button data-menu="wait">${UI_ICON('wait')}대기(전체)</button><button data-menu="close" class="close" title="닫기">${UI_ICON('cancel')}</button></div></div>`;return;}
 const army=v.ownArmies[selectedArmyId],title=v.officers[army?.commanderId]?.name??'';
 const recall=hasCampaignRule(state,selectedArmyId,'RECALL')?`<button data-menu="recall" ${recallReason(state,selectedArmyId)?'disabled':''}>귀환${recallReason(state,selectedArmyId)?' · '+esc(recallReason(state,selectedArmyId)):''}</button>`:'';
 const controls=armyActionEnded(state,selectedArmyId)?`<p>${army?.morale==='ROUTING'?'패주 — 명령 불가':'이번 턴 행동 완료'}</p>`:
  `${campaignMoveOptions(state,selectedArmyId).length?`<button data-menu="move">${UI_ICON('move')}이동</button>`:''}${(attackTargets(state,selectedArmyId).length||cityAttackTargets(state,selectedArmyId).length)?`<button data-menu="attack">${UI_ICON('attack')}공격</button>`:''}${state.movedArmyIds.includes(selectedArmyId)?'':`<button data-menu="face" title="이동 대신 바라보는 쪽만 바꿉니다. 옆·뒤를 맞으면 피해가 커집니다.">${UI_ICON('command')}정면</button>`}<button data-menu="brace" ${!canMainAction(state,selectedArmyId)?'disabled':''} title="${canMainAction(state,selectedArmyId)?'이번 차례 방어 태세':'이번 턴 행동을 이미 썼습니다.'}">${UI_ICON('security')}방어</button>${(()=>{const gr=garrisonReason(state,selectedArmyId);return !gr?`<button data-menu="garrison" title="부대가 해산되고 병력 ${army.troopCount}이 이 성의 예비병이 됩니다">${UI_ICON('city')}복귀</button>`:gr==='ENEMY_ADJACENT'?`<button data-menu="garrison" disabled title="옆 칸에 적이 있어 성으로 들어갈 수 없습니다">${UI_ICON('city')}복귀</button>`:'';})()}<button data-menu="regroup" ${regroupReason(state,selectedArmyId)?'disabled':''} title="${esc(regroupReason(state,selectedArmyId)||'흐트러진 전열·사기를 추스릅니다')}">${UI_ICON('reserve')}재정비</button><button data-menu="wait">${UI_ICON('wait')}대기</button>`;
 const chase=!armyActionEnded(state,selectedArmyId)&&campaignMoveOptions(state,selectedArmyId).length?previewDisengage(state,selectedArmyId):null;
 const warn=chase?`<p class="warn">이동하면 추격받음 — ${esc(state.officers[state.armies[chase.pursuerId].commanderId]?.name??'적')} 예상 −${chase.dealt} ${chase.effectLines.length?' · '+esc(chase.effectLines.join(' · ')):''}</p>`:'';
 const tactics=campaignTactics(state,selectedArmyId).map(c=>`<button data-tactic="${esc(c.traitId)}" ${!c.targets.length?'disabled':''}>${UI_ICON('tactic')}${c.jointArmyIds?'<span class="joint-tag">공동</span>':''}${esc(c.name)} <small>${c.signature?(()=>{const g=Math.min(100,state.campaignGrowth?.officers?.[state.armies[selectedArmyId]?.commanderId]?.c29?.gauge??(100-(c.waiting??0)));return `<span class="sig-gauge" style="--g:${g}%">고유 · 게이지 ${Math.round(g)}/100${g>=100?' · '+esc(tacticAvailability(c)):' · 충전 중'}</span>`;})():esc(tacticAvailability(c))}${c.effects?.length?'':' · 효과 준비 중'}</small></button>`).join('');
 const fm=FORMATION_NAME[army?.formation]?`<p class="warn">전열 ${FORMATION_NAME[army.formation]} — 받는 피해 +${army.formation==='BROKEN'?30:15}%${army.formation==='BROKEN'?', 반격 불가':', 반격 절반'} · 재정비로 회복${regroupReason(state,selectedArmyId)?` — 지금은 안 됨: ${esc(regroupReason(state,selectedArmyId))}`:''}</p>`:'';
 const star=army?.starAction&&!armyActionEnded(state,selectedArmyId)?starButton(army.starAction,'data-menu="star"'):'';
 // 보급(C45): 상태 한 줄 + 보급 거점 짓기
 // 남의 성 칸(성문 · 성벽)에 선 부대는 보급선이 닿지 않는다(엔진 supplyLink: 남의 성 칸은 길이 막힘) — 포위는 휴대 군량으로 버틴다. 까닭을 글로 알린다
 const atOtherCity=!!state.armies[selectedArmyId]&&Object.values(state.cities).some(c=>c.ownerFactionId!==state.armies[selectedArmyId].factionId&&[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(state.armies[selectedArmyId].tileId));
 const sup=army?.supply,supLine=sup?`<p class="supply-line" data-supply="${esc(sup.state)}" title="${sup.model==='clock'?`보급선: 내 성 · 보급 거점까지 지나갈 수 있는 길 — 8칸 안 안전(군량이 줄지 않고 차례마다 가득 채워짐), 16칸 안 불안(차례마다 반 차례분 줄어듦), 그 밖 끊김(한 차례분 줄어듦). 적 성문에 붙은 부대는 가까워도 끊김 — 포위는 휴대 군량으로 버틴다. 휴대 군량은 ${sup.perTurn?Math.round(sup.max/sup.perTurn):5}차례분. 적 부대를 없애면 한 차례분, 성이나 적 거점을 빼앗으면 가득 얻는다. 바닥나면 굶주림(병력 손실)`:'보급선: 내 성·보급 거점까지 지나갈 수 있는 길 — 8칸 안 안전, 16칸 안 불안(성이 절반만), 그 밖 끊김(휴대 군량만). 휴대 군량이 바닥나면 굶주림'}">보급선 <b>${SUPPLY_LABEL[sup.state]??esc(sup.state)}</b> · 부대가 가진 군량 ${food1(sup.stock??0)}/${food1(sup.max??0)}${supplyDuration(sup.turnsLeft)?` (${supplyDuration(sup.turnsLeft)})`:''}${sup.model==='clock'&&sup.state!=='STARVING'?(!sup.draining?' · 보급권 안 — 줄지 않음':sup.state==='CUT'?(atOtherCity?' · 적 성에 붙어 있어 보급이 닿지 않음 — 차례마다 한 차례분씩 줄어듦':' · 차례마다 한 차례분씩 줄어듦'):sup.state==='DISRUPTED'?' · 차례마다 반 차례분씩 줄어듦':' · 줄어드는 중'):''}${sup.state!=='STARVING'&&Number.isFinite(sup.turnsLeft)&&sup.turnsLeft<1?' · 군량 바닥 — 채워지지 않으면 다음 차례 굶주림':''}${Number.isFinite(sup.distance)?` · 원천까지 ${sup.distance}칸`:''}</p>`:'';
 const hubWhy=sup&&!armyActionEnded(state,selectedArmyId)?(()=>{try{return hubBuildReason(state,state.armies[selectedArmyId]);}catch{return '';}})():null;
 const hub=hubWhy!==null?`<button data-menu="hub" ${hubWhy?'disabled':''} title="${hubWhy?esc(hubWhy)+' — ':''}이 칸에 보급 거점을 짓습니다 — 교전 없이 이번 차례를 마치면 완공, ${sup?.model==='clock'?'거점에서 8칸 안이 보급권이 되어 그 안의 부대는 군량이 줄지 않습니다':'원천에서 군량 2차례분을 옮겨 첫 재고로'}">${UI_ICON('build')}보급 거점</button>`:'';
 menu.innerHTML=`${unitCardHead(v,army,title)}<div class="dk-body"><div class="dk-info">${actionReadoutHtml(selectedActions())}${supLine}${supplySourceText(sup,v)?`<p class="supply-context">${esc(supplySourceText(sup,v))}</p>`:''}${sup?.state==='STARVING'?`<p class="warn">${esc(starvingAdvice(army,v))}</p>`:''}${(f=>f&&Number.isFinite(f.value)?`<p class="av-line"><span class="av-fat" title="나가 있는 동안은 효과 없음 — 돌아와서 다시 출진할 때 60 이상이면 막힘"><i style="--v:${Math.max(0,Math.min(100,f.value))}%"></i>피로 ${Math.round(f.value)}${f.levelName?` · ${esc(f.levelName)}`:''} · 재출진 때만 적용</span></p>`:'')(v.officers[army?.commanderId]?.fatigue)}${fm}${warn}</div><div class="dk-acts">${controls}${hub}${recall}${star}${tactics}${state.moveOrders?.[selectedArmyId]?`<button data-menu="cancel-order">${UI_ICON('cancel')}이동 취소</button>`:''}<button data-menu="officer">${UI_ICON('info')}장수</button><button data-menu="close" class="close" title="닫기 (Esc)">${UI_ICON('cancel')}</button></div></div>`;
 for(const [a,key] of Object.entries(ACTION_KEYS))menu.querySelector?.(`[data-menu="${a}"]`)?.insertAdjacentHTML?.('beforeend',`<kbd>${key}</kbd>`);
 [...(menu.querySelectorAll?.('[data-tactic]')??[])].slice(0,3).forEach((b,n)=>b.insertAdjacentHTML?.('beforeend',`<kbd>${n+1}</kbd>`));
}
$('#unit-menu').addEventListener('click',e=>{
 const action=e.target.closest('[data-menu]')?.dataset.menu;
 if(inputLocked())return;
 const tacticId=e.target.closest('[data-tactic]')?.dataset.tactic;
 if(action||tacticId)cancelStrike();
 if(tacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===tacticId);if(!card?.targets.length)return;if(card.targets.length===1&&card.targets[0]===selectedArmyId){command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:tacticId,targetId:selectedArmyId});return;}selectedTacticId=tacticId;menuOpen=false;moveMode=false;render();$('#status').textContent='전법 대상을 누르세요';return;}
 if(action==='cancel-order'){command({type:'CANCEL_MOVE',armyId:selectedArmyId});return;}
 if(selectedArmyIds.length>1&&['brace','wait'].includes(action)){const ids=[...selectedArmyIds];for(const armyId of ids)command({type:action==='brace'?'BRACE':'WAIT_UNIT',armyId});selectedArmyIds=[];return;}
 if(action==='brace'||action==='regroup'){command({type:action==='brace'?'BRACE':'REGROUP',armyId:selectedArmyId});return;}
 if(action==='recall'){command({type:'RECALL_UNIT',armyId:selectedArmyId});return;}
 if(action==='star'){command({type:'STAR_ACTION',armyId:selectedArmyId});return;}
 if(action==='garrison'){command({type:'GARRISON',armyId:selectedArmyId});return;}
 if(action==='hub'){command({type:'BUILD_HUB',armyId:selectedArmyId});return;}
 if(action==='officer'){selectedOfficerId=state.armies[selectedArmyId]?.commanderId??null;closeUnitMenu();renderOfficerCard();return;}
 if(action==='wait'){command({type:'WAIT_UNIT',armyId:selectedArmyId});return;}
 if(action==='move'){menuOpen=false;moveMode=true;render();const chase=previewDisengage(state,selectedArmyId),shot=destination?previewApproachFire(state,selectedArmyId,destination):null;$('#status').textContent='이동할 칸을 누르세요'+(chase?` · 교전 이탈 시 추격 −${chase.dealt}`:'')+(shot?` · 붙으면 접근사격 — ${state.officers[state.armies[shot.archerId].commanderId].name}, 예상 −${shot.damage}`:'');}
 if(action==='face'){menuOpen=false;moveMode=false;faceMode=true;render();$('#status').textContent='바라볼 쪽의 칸을 누르세요(Esc 취소)';return;}
 if(action==='attack'){attackMode=true;menuOpen=false;$('#unit-menu').hidden=true;$('#status').textContent='빨간 점선 공격 대상을 누르세요';renderHint();}
 if(action==='close')closeUnitMenu();
});
// 닿지 않는 적(부대·성)을 눌러도 공격한다 — 이번 차례에 칠 수 있는 자리까지 가서 바로 친다(문명식. 사용자 2026-10-11 "해당 타일에 공격할 수 있는 대상이 있으면 자동으로 공격")
let pendingStrike=null,strikeTimer=null;
// A growth choice pauses an already requested attack; it does not cancel it.
function cancelStrike(){clearTimeout(strikeTimer);strikeTimer=null;pendingStrike=null;}
function strikeExpired(p){return !state||state.gameResult||state.phase!=='PLAYER'||state.turn!==p.turn||!state.armies[p.armyId];}
function scheduleStrike(){
 clearTimeout(strikeTimer);strikeTimer=null;
 const p=pendingStrike;if(!p)return;
 if(strikeExpired(p)){cancelStrike();return;}
 if(inputLocked())return; // Animation/draft/order completion calls scheduleAi again. No polling.
 strikeTimer=setTimeout(()=>{if(pendingStrike===p)fireStrike();},Math.max(160,motionRemaining()+90));
}
const hexGap=(a,b)=>{const A=state.tiles[a],B=state.tiles[b];return A&&B?(Math.abs(A.q-B.q)+Math.abs(A.q+A.r-B.q-B.r)+Math.abs(A.r-B.r))/2:99;};
function strikePlan(armyId,tileId,cityId){
 const army=state.armies[armyId];if(!army||state.movedArmyIds.includes(armyId))return null;
 const opts=campaignMoveOptions(state,armyId);if(!opts.length)return null;
 const v=view(state),foe=v.knowledge.tiles[tileId]==='VISIBLE'?Object.values(v.knowledge.observedArmies).find(a=>a.tileId===tileId&&a.factionId!==state.playerFactionId):null;
 const city=!foe&&cityId&&state.cities[cityId]?.ownerFactionId!==state.playerFactionId?state.cities[cityId]:null;
 if(!foe&&!city)return null;
 const R=attackRange(army,state),steps=o=>o.route?.pathTileIds?.length??99;
 const cand=opts.filter(o=>foe?hexGap(o.tileId,tileId)<=R:(city.footprint?.gates??[]).includes(o.tileId)||hexGap(o.tileId,city.tileId)<=R).sort((a,b)=>steps(a)-steps(b)||hexGap(a.tileId,army.tileId)-hexGap(b.tileId,army.tileId)).slice(0,8);
 for(const o of cand){try{const sim=step(state,{type:'MOVE_UNIT',armyId,destinationTileId:o.tileId});
  if(sim.armies[armyId]?.tileId===o.tileId&&(foe?attackTargets(sim,armyId).includes(foe.armyId):cityAttackTargets(sim,armyId).includes(cityId)))return {armyId,via:o.tileId,...(foe?{targetId:foe.armyId}:{cityId})};}catch{/* 못 가는 자리 */}}
 return null;
}
// 이번 차례에는 닿지 않을 때: 칠 수 있는 자리(성문 · 적 옆 칸) 가운데 가장 가까운 곳으로 여러 차례에 걸쳐 간다
function approachTile(armyId,tileId,cityId){
 const v=view(state),foe=v.knowledge.tiles[tileId]==='VISIBLE'?Object.values(v.knowledge.observedArmies).find(a=>a.tileId===tileId&&a.factionId!==state.playerFactionId):null;
 const city=!foe&&cityId&&state.cities[cityId]?.ownerFactionId!==state.playerFactionId?state.cities[cityId]:null;
 if(!foe&&!city)return null;
 const spots=foe?Object.keys(state.tiles).filter(t=>hexGap(t,tileId)===1):(city.footprint?.gates??[]);
 let best=null,len=1e9;for(const t of spots){if(t===state.armies[armyId]?.tileId)return null;const r=orderRoute(state,armyId,t);if(r&&r.pathTileIds.length<len){best=t;len=r.pathTileIds.length;}}
 return best;
}
function fireStrike(){
 const p=pendingStrike;strikeTimer=null;if(!p)return;
 if(strikeExpired(p)){cancelStrike();return;}
 if(inputLocked())return;
 cancelStrike();
 if(p.targetId&&attackTargets(state,p.armyId).includes(p.targetId)){selectedArmyId=p.armyId;command({type:'ATTACK_UNIT',armyId:p.armyId,targetId:p.targetId});}
 else if(!p.targetId&&p.cityId&&cityAttackTargets(state,p.armyId).includes(p.cityId)){selectedArmyId=p.armyId;command({type:'ATTACK_CITY',armyId:p.armyId,cityId:p.cityId});}
 else $('#status').textContent='대상이 바뀌었습니다 — 다시 선택하세요.';
}
let targetCacheState=null,targetCacheArmy=null,targetCache=new Map();
function mapTarget(armyId,tileId,cityId){
 if(targetCacheState!==state||targetCacheArmy!==armyId){targetCacheState=state;targetCacheArmy=armyId;targetCache.clear();}
 const key=`${tileId}:${cityId??''}`;if(targetCache.has(key))return targetCache.get(key);
 const v=view(state),foes=Object.values(v.knowledge.observedArmies).filter(a=>a.tileId===tileId&&a.factionId!==state.playerFactionId&&v.knowledge.tiles[a.tileId]==='VISIBLE').sort((a,b)=>a.armyId.localeCompare(b.armyId));
 const attacks=attackTargets(state,armyId),foe=foes.find(a=>attacks.includes(a.armyId))??foes[0];
 const directEnemy=!!foe&&attacks.includes(foe.armyId),directCity=!!cityId&&cityAttackTargets(state,armyId).includes(cityId);
 const plan=!directEnemy&&!directCity?strikePlan(armyId,tileId,cityId):null;
 const approach=!directEnemy&&!directCity&&!plan&&orderEligible(state,armyId)?approachTile(armyId,tileId,cityId):null;
 const target=clickTargetDecision({selected:true,enemyId:foe?.armyId,cityId,attackableEnemy:directEnemy,attackableCity:directCity,plan,approach});
 target.wallBlocked=!!foe&&!!cityId&&!directCity;
 targetCache.set(key,target);return target;
}
function targetText(target){
 const id=target.targetId,name=state.officers[state.armies[id]?.commanderId]?.name??'적';
 return targetPreviewText(target,{name,guard:!!target.cityId&&!!id,wallBlocked:target.wallBlocked,damage:target.kind==='city'?previewCityAttack(state,selectedArmyId,target.cityId).dealt:0,ranged:troopToCampaign(state.armies[selectedArmyId]?.troopType)==='BT03',chase:target.kind==='strike'?previewDisengage(state,selectedArmyId):null});
}
// 최단 지형 경로 위의 관측한 장애물만 설명한다. 안개 속 부대는 읽지 않는다.
function routeExplanation(armyId,to,route){
 const a=state.armies[armyId],v=view(state),known=v.knowledge;if(!a||!state.tiles[to])return '갈 수 없는 칸입니다';
 const actions=selectedActions(armyId);if(!orderEligible(state,armyId))return actions.reason||'지금 이동 명령을 내릴 수 없습니다';
 if(!known.tiles[to]||known.tiles[to]==='UNEXPLORED')return '아직 살펴보지 않은 칸입니다';
 if(!route&&state.tiles[to].terrainType==='mountain')return '산은 통과할 수 없습니다 — 다른 칸을 고르십시오';
 if(!route&&state.tiles[to].terrainType==='water')return '물 위로 이동할 수 없습니다 — 건널목 쪽을 고르십시오';
 const passage=diplomacyMoveReason(state,armyId,to);if(!route&&passage)return playerText(passage);
 const queue=[[a.tileId]],visited=new Set([a.tileId]);let direct=[];
 for(let i=0;i<queue.length;i++){const path=queue[i],last=path.at(-1);if(last===to){direct=path;break;}const t=state.tiles[last];for(const [dq,dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]){const n=`${t.q+dq},${t.r+dr}`;if(state.tiles[n]&&!visited.has(n)&&known.tiles[n]&&known.tiles[n]!=='UNEXPLORED'){visited.add(n);queue.push([...path,n]);}}}
 const visible={...v.ownArmies,...known.observedArmies};
 if(route&&route.pathTileIds.length<=direct.length)return '지형과 이동 비용을 따라 갈 수 있는 길로 이동';
 for(let i=1;i<direct.length;i++){const t=direct[i],occupant=Object.values(visible).find(b=>b.armyId!==armyId&&b.tileId===t&&(b.factionId===state.playerFactionId||known.tiles[t]==='VISIBLE'));
  if(occupant)return occupant.factionId===state.playerFactionId?'아군이 서 있어 돌아가야 합니다':'적이 길을 막고 있습니다';
  const edge=[direct[i-1],t].sort().join('|');if(state.mapRules.riverEdges.includes(edge)&&(!state.mapRules.crossings[edge]||state.mapRules.crossings[edge]==='none'))return route?'강 — 건널 수 있는 곳까지 돌아갑니다':'강을 건널 수 없습니다 — 건널목 쪽을 고르십시오';
  if(state.mapRules.blockedEdges.includes(edge))return '통과할 수 없는 길입니다';
 }
 return route?'지형과 이동 비용을 따라 갈 수 있는 길로 이동':'길이 없습니다 — 다른 칸을 고르십시오';
}
// C137: normal archers cannot satisfy the gate AND ranged-distance conditions in cityAttackTargets.
function cityAttackExplanation(armyId,cityId){
 const a=state.armies[armyId],c=state.cities[cityId];if(!a||!c||c.ownerFactionId===a.factionId||cityAttackTargets(state,armyId).includes(cityId))return '';
 const treaty=diplomacyAttackReason(state,armyId,cityId);if(treaty)return treaty;
 if(archerAttackReason(state,armyId))return '붙어 있는 적 때문에 사격할 수 없습니다';
 if(!canMainAction(state,armyId))return '이번 차례 주 행동을 이미 썼습니다';
 if(troopToCampaign(a.troopType)==='BT03'&&a.troopType!=='catapult'&&!hasCampaignRule(state,armyId,'SIEGE_FROM_WALL'))return '원거리 병종은 일반 성 공격 불가 — 공성 전법이나 다른 병종을 사용하십시오';
 if(a.troopType==='catapult'&&hexGap(a.tileId,c.tileId)!==2)return '성 공격 사거리 밖입니다 — 투석기는 성 중심에서 2칸';
 return targetText(mapTarget(armyId,c.tileId,cityId))||'성 공격 위치에 닿지 않습니다 — 성문으로 이동하십시오';
}
let pendingAttack=null;
function confirmRiskyAttack(request){
 if(!['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type))return false;
 const a=state.armies[request.armyId],target=state.armies[request.targetId]??state.cities[request.cityId??request.targetId],fid=target?.factionId??target?.ownerFactionId;
 if(!a||a.factionId!==state.playerFactionId||!fid||fid===a.factionId)return false;
 if(request.type==='USE_TACTIC'&&!tacticIsDamage(campaignTactics(state,request.armyId).find(c=>c.traitId===request.traitId)??{}))return false;
 const faction=view(state).diplomacy?.factions?.find(f=>f.factionId===fid),warning=surpriseWarning(faction?.attackWarning);
 if(!warning)return false;
 pendingAttack={request:{...request},state};$('#attack-proceed').textContent=request.type==='USE_TACTIC'?'전법 사용':request.type==='ATTACK_CITY'?'성 공격 확정':'공격 확정';$('#attack-confirm-text').textContent=warning;$('#attack-confirm').hidden=false;$('#attack-cancel').focus();return true;
}
function cancelAttackConfirmation(){pendingAttack=null;$('#attack-confirm').hidden=true;}
// 지도 누르기와 '고른 부대 공격' 단추가 함께 쓴다: 다가가서 치거나, 칠 수 있는 자리로 예약 이동.
function strikeOrApproach(who,target){
 if(target.kind==='strike'){command({type:'MOVE_UNIT',armyId:who,destinationTileId:target.via});if(state.armies[who]?.tileId===target.via){pendingStrike={...target,armyId:who,turn:state.turn};$('#status').textContent='다가가서 공격합니다…';scheduleStrike();if(pendingCampaignDraft(state))renderGrowthDraft();}return;}
 if(!orderEligible(state,who)){$('#status').textContent=selectedActions(who).reason;return;}
 command({type:'QUEUE_MOVE',armyIds:[who],destinationTileId:target.via});$('#status').textContent='칠 수 있는 자리로 갑니다. 닿으면 다시 눌러 공격하세요.';
}
// C137: cycling an enemy inspects it first; the explicit button attacks the chosen unit.
function refreshOverlapAttack(){
 const button=$('#overlap-attack');if(!button)return;
 const v=view(state),target=v.knowledge?.observedArmies?.[overlapPick?.id];
 button.hidden=!(overlapPick?.count>1&&target&&v.knowledge.tiles[target.tileId]==='VISIBLE'&&target.factionId!==state.playerFactionId&&selectedArmyId);
 if(button.hidden)return;
 // 닷토리 새 판 8 · 9회차: 예고는 '다가가서 공격'인데 단추는 바로 칠 수 있을 때만 눌려, 눌러도 아무 일이 없었다 — 지도를 누를 때와 같은 판정을 쓴다.
 const direct=attackTargets(state,selectedArmyId).includes(target.armyId),near=direct?null:mapTarget(selectedArmyId,target.tileId,null);
 const kind=direct?'unit':['strike','approach'].includes(near?.kind)&&(near.targetId??target.armyId)===target.armyId?near.kind:null;
 button.textContent=`${kind==='strike'?'다가가서 공격':kind==='approach'?'칠 자리로 이동':'고른 부대 공격'} · ${v.officers[target.commanderId]?.name??'관측한 부대'}${kind?'':' — 닿지 않음'}`;button.disabled=inputLocked()||!kind;
 button.title=kind==='strike'?'이동한 뒤 고른 적 부대를 공격합니다':kind==='approach'?'칠 수 있는 자리로 예약 이동합니다':kind?'고른 적 부대를 공격합니다':'사거리 밖이고 이번 차례에 닿는 칠 자리가 없습니다';
}
$('#overlap-attack').addEventListener('click',()=>{
 const who=selectedArmyId,id=overlapPick?.id;if(!who||!id||inputLocked())return;
 if(attackTargets(state,who).includes(id)){command({type:'ATTACK_UNIT',armyId:who,targetId:id});return;}
 const foe=view(state).knowledge?.observedArmies?.[id],near=foe?mapTarget(who,foe.tileId,null):null;
 if(['strike','approach'].includes(near?.kind)&&(near.targetId??id)===id){cancelStrike();strikeOrApproach(who,near);}
});
$('#attack-cancel').addEventListener('click',()=>{cancelAttackConfirmation();$('#status').textContent='공격을 취소했습니다';});
$('#attack-proceed').addEventListener('click',()=>{const pending=pendingAttack;cancelAttackConfirmation();if(pending?.state===state)command(pending.request,true);else $('#status').textContent='대상이 바뀌었습니다 — 다시 선택하세요.';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingAttack){e.preventDefault();e.stopImmediatePropagation();cancelAttackConfirmation();$('#status').textContent='공격을 취소했습니다';}});
function mapClick(e){
 if(!state||state.gameResult||inputLocked())return;
 cancelStrike();
 const prodCity=e.target.closest?.('[data-prod-city]')?.dataset.prodCity;if(prodCity&&state.cities[prodCity]?.ownerFactionId===state.playerFactionId&&openProdPop(prodCity,e))return;
 closeProdPop();
 const tileId=targetTile(e.target,state.armies,state.cities);if(!tileId)return;
 // 이름표를 누르면 그 부대, 칸(병사 그림)을 누르면 그 칸의 내 부대를 차례로
 const v=view(state),own=Object.values(v.ownArmies),plateUnit=e.target.closest?.('.plate-top')?.dataset.unit;
 const selectable=[...own,...Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.factionId!==state.playerFactionId&&v.knowledge.tiles[a.tileId]==='VISIBLE')];
 const rects=[...($('#map').querySelectorAll?.('g.w-unit[data-unit],.plate-top[data-unit]')??[])].filter(n=>selectable.some(a=>a.armyId===n.dataset.unit)).map(n=>({id:n.dataset.unit,...(()=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()}));
 let pick=overlapSelection(selectable,tileId,{x:e.clientX,y:e.clientY},rects,overlapPick);
 // 초상(이름표)을 직접 눌렀으면 겹친 묶음의 첫 순서는 그 부대다(닷토리 B15: 적 허저의 초상을 눌렀는데 아군 감녕이 선택됨 — 묶음이 이름순이라 첫째가 아군이었다). 같은 자리를 다시 누르면 다음으로 넘어간다
 {const fresh=!overlapPick||overlapPick.key!==pick.key||Math.hypot(e.clientX-overlapPick.x,e.clientY-overlapPick.y)>8,i=pick.key.split('|').indexOf(plateUnit);if(fresh&&plateUnit&&pick.count>1&&i>=0)pick={...pick,id:plateUnit,index:i};}
 const id=pick.count>1?(own.some(a=>a.armyId===pick.id)?pick.id:null):plateUnit&&own.some(a=>a.armyId===plateUnit)?plateUnit:cycleTileUnit(own,tileId,selectedArmyId);
 overlapPick=pick.count>1?pick:null;
 const cityHit=!!e.target.closest?.('[data-city]');
 const cityId=e.target.closest?.('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===tileId)?.cityId;
 const target=selectedArmyId?mapTarget(selectedArmyId,tileId,cityId):null;
 const enemy=target?.kind==='unit'?target.targetId:null;
 if(faceMode&&selectedArmyId){const a=state.armies[selectedArmyId];if(tileId!==a.tileId){faceMode=false;command({type:'FACE',armyId:selectedArmyId,facing:directionToward(state.tiles[a.tileId],state.tiles[tileId],a.facing)});}return;}
 if(selectedArmyId&&selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);const target=card?.targets.find(id=>(state.armies[id]??state.cities[id])?.tileId===tileId);if(target){command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:selectedTacticId,targetId:target});return;}
  // 쓸 수 없는 칸을 누르면 아무 일도 없던 것(닷토리 새 판 11회차 '힘껏 베기') — 쓸 수 있는 대상을 이름으로 알려 준다
  const names=(card?.targets??[]).map(id=>state.cities[id]?.name??view(state).officers?.[state.armies[id]?.commanderId]?.name).filter(Boolean);
  $('#status').textContent=`${card?.name??'전법'} — 그 칸에는 쓸 수 없습니다. 쓸 수 있는 대상(붉게 표시): ${names.length?names.join(' · '):'지금은 없음'} · Esc 취소`;return;}
 // 예고가 뜬 대상은 누르면 실행된다(닷토리 새 판 9 · 11 · 12회차: 피해 예고가 떴는데 누르면 겹친 초상만 바뀌었다) — 누른 칸의 적을 바로 칠 수 있으면 겹친 초상 순환보다 공격이 먼저. 이름표를 직접 누른 경우는 그대로 둔다
 // 적의 초상(이름표)을 직접 눌렀고 그 적을 지금 칠 수 있으면 그 적을 친다 — 겹친 초상 넘기기보다 먼저(닷토리 B14 · B15: 피해 예고가 뜬 초상을 눌러도 실행되지 않고 성 이름을 눌러야 됐다)
 if(selectedArmyId&&!e.shiftKey&&plateUnit&&!own.some(a=>a.armyId===plateUnit)&&attackTargets(state,selectedArmyId).includes(plateUnit)){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:plateUnit});return;}
 if(selectedArmyId&&!e.shiftKey&&!plateUnit&&target?.kind==='unit'&&target.targetId){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:target.targetId});return;}
 if(pick.count>1&&!cityHit&&!e.shiftKey&&!id){render();follow(pick.id);refreshOverlapAttack();$('#status').textContent=`겹친 부대 ${pick.index+1}/${pick.count} · 다시 누르면 다음 · ${v.officers[selectable.find(a=>a.armyId===pick.id)?.commanderId]?.name??'관측한 부대'}`;return;}
 if(selectedArmyId&&cityId&&(cityHit||!id)&&!target?.targetId&&state.cities[cityId]?.ownerFactionId!==state.playerFactionId&&troopToCampaign(state.armies[selectedArmyId]?.troopType)==='BT03'&&state.armies[selectedArmyId]?.troopType!=='catapult'&&!hasCampaignRule(state,selectedArmyId,'SIEGE_FROM_WALL')){$('#status').textContent=cityAttackExplanation(selectedArmyId,cityId);return;}
 // 이름표와 성 그림은 같은 대상 판정을 사용한다.
 if(selectedArmyId&&!e.shiftKey&&target&&!(id&&!cityHit)&&['unit','city','strike','approach'].includes(target.kind)){
  if(target.kind==='unit'){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:target.targetId});return;}
  if(target.kind==='city'){command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId:target.cityId});return;}
  strikeOrApproach(selectedArmyId,target);return;
 }
 if(e.shiftKey&&id){selectedArmyIds=toggleSelection(selectedArmyIds,id);selectedArmyId=selectedArmyIds[0]??null;menuOpen=!!selectedArmyId;render();if(selectedArmyIds.includes(id))follow(id);return;}
 if(cityId&&(cityHit||!id)&&view(state).ownCities[cityId]){
  if(selectedArmyId){
   if(state.armies[selectedArmyId]?.tileId===tileId){const reason=garrisonReason(state,selectedArmyId);if(!reason)command({type:'GARRISON',armyId:selectedArmyId});else $('#status').textContent=reasonText(reason);return;}
   if(orderRoute(state,selectedArmyId,tileId))command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});else $('#status').textContent=routeExplanation(selectedArmyId,tileId,null);return;
  }
  closeUnitMenu();openStage(cityId);return;
 }
 if(cityId&&(cityHit||!id)&&selectedArmyId&&troopToCampaign(state.armies[selectedArmyId]?.troopType)==='BT03'){$('#status').textContent=cityAttackExplanation(selectedArmyId,cityId);return;}
 if(selectedArmyId&&!id&&!cityId&&!orderEligible(state,selectedArmyId)){$('#status').textContent=selectedActions().reason;return;}
 if(moveMode&&!menuOpen&&selectedArmyId&&orderRoute(state,selectedArmyId,tileId)){
  command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});return;
 }
 if(e.target.closest('[data-city]')&&cityId&&!(selectedArmyId&&cityAttackTargets(state,selectedArmyId).includes(cityId))){if(view(state).ownCities[cityId]){closeUnitMenu();openStage(cityId);return;}if(selectedCityId!==cityId)cityTab=null;selectedCityId=cityId;closeUnitMenu();renderCityPanel(view(state));return;}
 if(id){selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;destination=null;render();follow(id);if(pick.count>1)$('#status').textContent=`겹친 부대 ${pick.index+1}/${pick.count} · 다시 누르면 다음`;pilotAudio.play('select',`select:${++soundSequence}`);voice.say(state.armies[id]?.commanderId,'select');return;}
 if(selectedArmyId&&enemy){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:enemy});return;}
 if(selectedArmyId&&cityId&&cityAttackTargets(state,selectedArmyId).includes(cityId)){command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId});return;}
 if(selectedArmyId&&orderRoute(state,selectedArmyId,tileId)){command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});return;}
 if(cityId){if(view(state).ownCities[cityId]&&(!e.target.closest?.('[data-tile]')||document.body?.classList?.contains?.('ink-hud'))){closeUnitMenu();openStage(cityId);return;}if(selectedCityId!==cityId)cityTab=null;selectedCityId=cityId;closeUnitMenu();renderCityPanel(view(state));return;}
 if(selectedArmyId&&moveMode){$('#status').textContent=routeExplanation(selectedArmyId,tileId,null);return;}
 if(menuOpen)closeUnitMenu();
}
$('#map').addEventListener('click',e=>{if(suppressPanClick){suppressPanClick=false;e.preventDefault();return;}mapClick(e);});
$('#map').addEventListener('pointerover',function mapPointerOver(e){
 if(panGesture||inputLocked()||!selectedArmyId)return;
 const hoverTile=targetTile(e.target,state.armies,state.cities);
 let unit=e.target.closest('[data-unit]')?.dataset.unit??attackTargets(state,selectedArmyId).find(id=>state.armies[id].tileId===hoverTile);
 const tip=$('#attack-preview');
 if(selectedTacticId){
  const c=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);
  const city=Object.values(state.cities).find(c=>c.tileId===hoverTile),target=c?.targets.find(id=>(state.armies[id]??state.cities[id])?.tileId===hoverTile)??unit??city?.cityId;
  if(!target||!c){tip.hidden=true;return;}
  try{const p=previewTactic(state,selectedArmyId,selectedTacticId,target),title=`전법 · ${c.name}`,effects=(p.effectLines??[]).map(x=>`<li>${esc(x)}</li>`).join('');
   const cityRisk=p.cityId?surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===state.cities[p.cityId]?.ownerFactionId)?.attackWarning):'';
   const html=p.cityId?`<div class="fc-top"><span class="fc-title">${esc(title)} · ${esc(cityLabel(p.cityId))}</span></div><p class="fc-sum">내구 −${p.dealt}</p><small class="fc-dur">내구 ${state.cities[p.cityId].durability} → <em>${Math.max(0,state.cities[p.cityId].durability-p.dealt)}</em></small>${cityRisk?`<p class="fc-risk">${esc(cityRisk)}</p>`:''}`:p.effectOnly?`<div class="fc-top"><span class="fc-title">${esc(title)}</span></div>`:forecastHtml(selectedArmyId,target,p,title);
   setTip(tip,`<p class="fc-sum">${esc(tacticChangeText({...p,attackerId:selectedArmyId,targetId:target},{name:c.name,ownIds:Object.keys(view(state).ownArmies),preview:true}))}</p>`+html+((p.cityId||p.effectOnly)&&effects?`<ul class="fc-mods">${effects}</ul>`:''),p.cityId?`내구 −${p.dealt}`:title);
  }catch(error){setTip(tip,`<p class="fc-sum">${esc(errorText(error))}</p>`,errorText(error));}
  tip.hidden=false;placeTip(tip,e);return;
 }
 const cityId=e.target.closest('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===hoverTile)?.cityId;
 const target=mapTarget(selectedArmyId,hoverTile,cityId);
 if(target.kind==='unit')unit=target.targetId;
 if(['strike','approach'].includes(target.kind)){
  const route=orderRoute(state,selectedArmyId,target.via),text=targetText(target);
  if(destination!==target.via){destination=target.via;drawMap(view(state),true);}
  setTip(tip,`<p class="fc-sum">${esc(text)}</p>${route?`<small>${routeTurns(state,selectedArmyId,route)}차례 · ${esc(routeExplanation(selectedArmyId,target.via,route))}</small>`:''}`,text);tip.hidden=false;placeTip(tip,e);return;
 }
 if(target.kind==='city'){
  const p=previewCityAttack(state,selectedArmyId,cityId),diploWarn=surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===state.cities[cityId]?.ownerFactionId)?.attackWarning);setTip(tip,`<div class="fc-top"><span class="fc-title">성벽 공격 · ${esc(cityLabel(cityId))}</span><span class="fc-res" data-res="${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'win':'even'}">${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'내구 0':'공성'}</span></div><p class="fc-sum">내구 −${p.dealt}</p>${diploWarn?`<p class="fc-risk">${esc(diploWarn)}</p>`:''}<div class="fc-bar wide"><i style="width:${(Math.max(0,(state.cities[cityId].durability??0)-p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></i><s style="width:${(Math.min(state.cities[cityId].durability??0,p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></s></div><small class="fc-dur">내구 ${state.cities[cityId].durability??0} → <em>${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)}</em></small>${p.effectLines.length?`<ul class="fc-mods">${p.effectLines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`,`내구 −${p.dealt}`+(p.effectLines.length?' · '+p.effectLines.join(' · '):''));tip.hidden=false;
  placeTip(tip,e);return;
 }
 if(unit&&attackTargets(state,selectedArmyId).includes(unit)){
  const p=previewAttack(state,selectedArmyId,unit),m=p.multipliers;
  {const hs={tile:state.armies[unit].tileId,side:p.side};if(hoverSide?.tile!==hs.tile||hoverSide?.side!==hs.side){hoverSide=hs;drawMap(view(state),true);}}
  setTip(tip,`<p class="fc-sum">${esc(targetText(target))}</p>`+forecastHtml(selectedArmyId,unit,p),`아군 −${p.allyLoss} / 적 −${p.enemyLoss}`+
   (m.terrain!==1?` · ${state.tiles[state.armies[unit].tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`:'')+
   (m.castle!==1?` · 성 방어 ×${m.castle}`:'')+(m.matchup!==1?` · 상성 ${m.matchup<1?'불리':'유리'} ×${m.matchup}`:'')+(m.river!==1?' · 도하 ×0.75':'')+(m.flank!==1?` · 협공 +${Math.round((m.flank-1)*100)}%`:'')+(p.effectLines.length?' · '+p.effectLines.join(' · '):'')+
   (p.formationRisk?.check?` · 적 전열 판정(버틸 확률 ${Math.round(p.formationRisk.successProbability*100)}%)`:'')+(p.moraleRisk?.check?` · 적 사기 판정(버틸 확률 ${Math.round(p.moraleRisk.successProbability*100)}%)`:''));
  {const T=state.armies[unit],mx=T?.maxTroopCount??T?.troopCount??0,shown=p.shownTargetCount??T?.troopCount??0; // 흑묵 적 장수 판(기준 final-battle 오른쪽 위) — 보이는 병력·사기·전열만
   document.dispatchEvent?.(new CustomEvent('ink:foe',{detail:{name:state.officers[T?.commanderId]?.name??'적',face:faceOf(T?.commanderId),bars:[{pct:mx?Math.min(100,shown/mx*100):100,text:Number(shown).toLocaleString('ko-KR'),title:'보이는 병력'},{pct:{STEADY:100,SHAKEN:50,ROUTING:12}[T?.morale]??100,text:[MORALE_NAME[T?.morale??'STEADY'],FORMATION_NAME[T?.formation]?`전열 ${FORMATION_NAME[T.formation]}`:''].filter(Boolean).join(' · '),title:'사기 · 전열'}]}}));}
  tip.hidden=false;placeTip(tip,e);return;
 }
 if(cityId&&target.targetId){const text=targetText(target),risk=surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===(state.armies[target.targetId]?.factionId??state.cities[cityId]?.ownerFactionId))?.attackWarning);setTip(tip,`<p class="fc-sum">${esc(text)}</p>${risk?`<p class="fc-risk">${esc(risk)}</p>`:''}`,text);tip.hidden=false;placeTip(tip,e);return;}
 tip.hidden=true;tip.classList?.remove?.('forecast');if(hoverSide){hoverSide=null;drawMap(view(state),true);}
 const id=hoverTile;
 if(moveMode&&id){
  // Commands replace state; selection and tile changes also invalidate this entry.
  let cached=mapPointerOver.movePreview;
  if(!cached||cached.state!==state||cached.armyId!==selectedArmyId||cached.tileId!==id){
   const route=orderEligible(state,selectedArmyId)?orderRoute(state,selectedArmyId,id):null;
   cached=mapPointerOver.movePreview={state,armyId:selectedArmyId,tileId:id,route,chase:previewDisengage(state,selectedArmyId),shot:route?previewApproachFire(state,selectedArmyId,id):null};
  }
  const {route,chase,shot}=cached,warning=shot?` · 붙으면 접근사격 — ${state.officers[state.armies[shot.archerId].commanderId].name}, 예상 −${shot.damage}`:'';$('#status').textContent='이동할 칸을 누르세요'+(chase?` · 교전 이탈 시 추격 −${chase.dealt}`:'')+warning;const reason=routeExplanation(selectedArmyId,id,route);tip.textContent=(route?`전체 길 · ${routeTurns(state,selectedArmyId,route)}차례 · `:'이동 막힘 · ')+reason+warning;tip.hidden=false;placeTip(tip,e);}
 if(moveMode&&id&&id!==destination){destination=id;drawMap(view(state),true);}
});
// C138: presentation listener is separate from the existing preview/click handler.
$('#map').addEventListener('pointerover',e=>{
 if(panGesture||inputLocked()||!selectedArmyId)return;
 const tile=targetTile(e.target,state.armies,state.cities),city=e.target.closest('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===tile)?.cityId;
 showCommandIntent(tile,city);
});
$('#map').addEventListener('pointerleave',e=>{setCommandIntent('');if(document.body?.classList?.contains('hud-band')&&e.relatedTarget?.closest?.('.nb-band')&&document.querySelector('.nb-band')?.dataset.state==='forecast')return;$('#attack-preview').hidden=true;document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));if(hoverSide){hoverSide=null;if(state)drawMap(view(state),true);}});
$('#cancel-move').addEventListener('click',closeUnitMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelStrike();if(!$('#officer-modal').hidden){selectedOfficerId=null;$('#officer-modal').hidden=true;e.stopImmediatePropagation();return;} /* 장수 정보 창은 Esc 로 닫힌다(2026-10-12 — 닫기 단추로만 닫혀 다음 차례 단추를 가린 채 남았다) */ if(state&&pendingCampaignDraft(state))renderGrowthDraft();if(stage.city){e.stopImmediatePropagation();if(stage.opening)closeStage();else if(stage.fac)leaveFacility();else closeStage();return;}closeProdPop();selectedCityId=null;closeUnitMenu();$('#city-panel').hidden=true;}});
document.addEventListener('click',e=>{const bandClick=document.body?.classList?.contains('hud-band')&&e.composedPath?.().some(n=>n.id==='ink-hud');if(menuOpen&&!bandClick&&!e.target.closest('#unit-menu,.ih-unit,.nb-band,.nb-sheet,.nb-bookmarks,.nb-news-tab,.ih-notice,[data-unit],[data-tile]'))closeUnitMenu();});
globalThis.addEventListener('resize',()=>{if(state)drawMap(view(state));positionUnitMenu();if(state&&document.body?.classList?.contains('hud-band'))requestAnimationFrame(()=>{const port=$('.viewport');port.scrollTo({...bandCameraPosition(port,$('#map')),behavior:'auto'});if(selectedArmyId)follow(selectedArmyId,true);});});document.addEventListener('scroll',positionUnitMenu,true);
document.addEventListener('pointerdown',unlockAudio);
$('#mute').addEventListener('click',()=>{pilotAudio.configure({muted:!pilotAudio.settings.muted});refreshAudio();});
function refreshAudio(){pilotAudio=createPilotAudio();actionAudio.refresh();combatAudio.refresh();bgm.configure(pilotAudio.settings);voice.configure(pilotAudio.settings);$('#mute').textContent=pilotAudio.settings.muted?'默':'聲';$('#mute').title=pilotAudio.settings.muted?'소리 켜기':'소리 끄기';}
globalThis.addEventListener('storage',e=>{if(e.key===null||e.key==='sangoku-round-map-audio-v1')refreshAudio();});
globalThis.addEventListener('pagehide',()=>{actionAudio.dispose();combatAudio.dispose();bgm.deactivate();voice.deactivate();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){actionAudio.cancel();combatAudio.cancel();bgm.deactivate();voice.deactivate();}else{voice.activate();if(audioGesture)bgm.activate();}});


function centerPlayer(){
 const viewport=$('.viewport'),v=view(state);
 if(!viewport?.clientWidth)return;

 const capital=v.ownCities[v.faction.capitalCityId]??Object.values(v.ownCities)[0];
 const army=Object.values(v.ownArmies)[0];
 const node=capital?$('#map').querySelector(`.w-cityplate[data-city="${capital.cityId}"]`):army?$('#map').querySelector(`[data-unit="${army.armyId}"]`):null;
 if(!node?.getScreenCTM||!viewport?.getBoundingClientRect)return;
 const svg=$('#map svg'),point=svg.createSVGPoint();
 // City banners sit above the center by 2.05 hex radii.
 if(capital)point.y=-30*1.7;
 const target=point.matrixTransform(node.getScreenCTM()),rect=viewport.getBoundingClientRect();
 viewport.scrollLeft+=target.x-rect.left-viewport.clientWidth/2;
 viewport.scrollTop+=target.y-rect.top-viewport.clientHeight/2;
 // 시작 시점은 종이 지도가 화면을 채우게(수도가 지도 귀퉁이여도 탁자만 보이지 않게). 손으로 끌면 여백까지 갈 수 있다.
 const sheet=$('#map .mr-sheet .paper')?.getBoundingClientRect?.();
 if(sheet&&sheet.width){
  const fit=(scroll,lo,hi,size)=>scroll+(hi-lo<size?(lo+hi-size)/2:lo>0?lo:hi<size?hi-size:0);
  const r=viewport.getBoundingClientRect(),s2=$('#map .mr-sheet .paper').getBoundingClientRect();
  viewport.scrollLeft=fit(viewport.scrollLeft,s2.left-r.left,s2.right-r.left,viewport.clientWidth);
  viewport.scrollTop=fit(viewport.scrollTop,s2.top-r.top,s2.bottom-r.top,viewport.clientHeight);
 }
}
let panGesture=null,suppressPanClick=false;
const viewport=$('.viewport');
viewport.addEventListener('contextmenu',e=>e.preventDefault());
viewport.addEventListener('pointerdown',e=>{
 suppressPanClick=false;
 if(!state||![0,1,2].includes(e.button)||e.target.closest('button,#unit-menu,.tracker,.officers,.minimap,#city-panel'))return;
 // 끌기 = 지도 이동(어느 버튼이든), Shift+끌기 = 여러 부대 선택(사용자 지시 2026-10-04)
 const select=e.button===0&&e.shiftKey&&!inputLocked();
 panGesture={id:e.pointerId,button:e.button,select,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,panning:false};
});
viewport.addEventListener('pointermove',e=>{
 if(!panGesture||e.pointerId!==panGesture.id)return;
 const dx=e.clientX-panGesture.x,dy=e.clientY-panGesture.y;
 if(!panGesture.panning&&Math.hypot(dx,dy)<=6)return;
 panGesture.panning=true;suppressPanClick=true;viewport.setPointerCapture?.(e.pointerId);
 if(panGesture.select){const r=selectionRect(panGesture.x,panGesture.y,e.clientX,e.clientY),box=$('#select-box');box.hidden=false;for(const [k,v] of Object.entries(r))box.style[k]=v+'px';}
 else {viewport.style.cursor='grabbing';viewport.scrollLeft=panGesture.left-dx;viewport.scrollTop=panGesture.top-dy;}
 e.preventDefault();
});
function endPan(e){
 if(!panGesture||e.pointerId!==panGesture.id)return;
 if(panGesture.select&&panGesture.panning&&e.type!=='pointercancel'){
  const r=selectionRect(panGesture.x,panGesture.y,e.clientX??panGesture.x,e.clientY??panGesture.y);
  const units=Object.values(view(state).ownArmies).flatMap(a=>{
   const node=$('#map').querySelector(`[data-tile="${a.tileId}"]`),svg=$('#map svg');
   if(!node?.getBBox||!node.getScreenCTM||!svg?.createSVGPoint)return [];
   const b=node.getBBox(),p=svg.createSVGPoint();p.x=b.x+b.width/2;p.y=b.y+b.height/2;
   const c=p.matrixTransform(node.getScreenCTM());return [{id:a.armyId,x:c.x,y:c.y,eligible:!armyActionEnded(state,a.armyId)}];
  });
  selectedArmyIds=rectangleSelection(r,units);selectedArmyId=selectedArmyIds[0]??null;menuOpen=!!selectedArmyId;moveMode=false;render();
 }
 $('#select-box').hidden=true;
 if(viewport.hasPointerCapture?.(e.pointerId))viewport.releasePointerCapture(e.pointerId);
 if(e.type==='pointercancel')suppressPanClick=false;
 panGesture=null;viewport.style.cursor='';
}
viewport.addEventListener('pointerup',endPan);viewport.addEventListener('pointercancel',endPan);
viewport.addEventListener('click',e=>{if(suppressPanClick){suppressPanClick=false;e.preventDefault();e.stopPropagation();}});
document.addEventListener('keydown',e=>{if(!state||e.target?.closest?.('input,select,textarea'))return;const d={ArrowLeft:[-80,0],a:[-80,0],ArrowRight:[80,0],d:[80,0],ArrowUp:[0,-80],w:[0,-80],ArrowDown:[0,80],s:[0,80]}[e.key.length===1?e.key.toLowerCase():e.key];if(d){e.preventDefault();viewport.scrollLeft+=d[0];viewport.scrollTop+=d[1];}});

// Fixed SVG margin covers the viewport even at the minimum zoom; no second background.
function drawMap(v,hoverOnly=false){
 const options=selectedArmyId&&!inputLocked()?campaignMoveOptions(state,selectedArmyId):[];
 const model=campaignMapModel(v,{selectedArmyId,movedArmyIds:Object.values(state.armies).filter(a=>state.movedArmyIds.includes(a.armyId)||armyActionEnded(state,a.armyId)).map(a=>a.armyId),moveOptions:options,destination,portraits:plateFaces()});
 for(const u of model.units)u.active=!!selectedArmyId&&(selectedArmyIds.includes(u.id)||u.id===selectedArmyId)||overlapPick?.count>1&&!v.ownArmies[overlapPick.id]&&overlapPick.id===u.id;
 if(model.places){const xs=v.exploration?.places??[];model.places=model.places.map(p=>{const x=xs.find(e=>e.placeId===p.label),layer=x?.eventName?TRACE_LAYER[state.exploration?.places?.[p.label]?.eventId]??null:null;return {...p,status:x?.status,eventName:x?.eventName,layer,layerName:layer?TRACE_LAYERS[layer].name:null};});}
 model.highlights.orders=orderHighlights(state,selectedArmyIds);
 if(dangerMode)model.highlights.danger=dangerTiles(v);
 {const seen={...v.ownArmies,...(v.knowledge?.observedArmies??{})};for(const u of model.units)if(seen[u.id]?.crisis)u.crisis=seen[u.id].crisis;}
 model.highlights.links=bondLinks(v);{const bonded=new Set(model.highlights.links.flatMap(l=>l.armies));for(const u of model.units)if(bonded.has(u.id))u.bond=true;}
 model.highlights.intents=Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.nextMoveTarget&&a.nextMoveTarget!==a.tileId&&state.tiles[a.nextMoveTarget]).map(a=>({from:a.tileId,to:a.nextMoveTarget}));
 if(hoverSide&&selectedArmyId)model.highlights.side=hoverSide;
 if(moveMode&&destination&&selectedArmyId&&orderEligible(state,selectedArmyId)){const route=orderRoute(state,selectedArmyId,destination);if(route)model.highlights.orders=[{unitId:selectedArmyId,path:route.pathTileIds,turns:routeTurns(state,selectedArmyId,route)},...model.highlights.orders.filter(o=>o.unitId!==selectedArmyId)];}
 if(faceMode&&selectedArmyId){const [q,r]=state.armies[selectedArmyId].tileId.split(',').map(Number);model.highlights.move=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([dq,dr])=>`${q+dq},${r+dr}`).filter(id=>state.tiles[id]);}
 const targets=selectedArmyId&&!inputLocked()?attackTargets(state,selectedArmyId):[];
 if(selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);targets.splice(0,targets.length,...(card?.targets??[]));}
 model.highlights.attack=[...targets.map(id=>state.armies[id].tileId),...(selectedArmyId&&!inputLocked()?cityAttackTargets(state,selectedArmyId).map(id=>state.cities[id].tileId):[])];
 for(const [id,effect] of Object.entries(losses))if(effect.oldUnit&&!model.units.some(u=>u.id===id))model.units.push({...effect.oldUnit,count:0});
 for(const u of model.units){const effect=losses[u.id];if(effect){Object.assign(u,effect);u.count=effect.displayCount??effect.postCount??u.count;u.maxCount??=effect.prevCount??effect.displayCount;}}
 for(const u of model.units){const a=state.armies[u.id];if(a&&!u.enemy)u.braced=!!a.braced;}
 // 아직 행동할 수 있는 내 부대(테두리 빛) · 내 성 안 병력(성 이름판 정보 줄) — 사용자 2026-10-11
 for(const u of model.units)u.ready=state.phase==='PLAYER'&&state.armies[u.id]?.factionId===state.playerFactionId&&!armyActionEnded(state,u.id);
 for(const c of model.cities)c.attackable=!!selectedArmyId&&!inputLocked()&&['unit','city','strike','approach'].includes(mapTarget(selectedArmyId,state.cities[c.id].tileId,c.id).kind);
 for(const c of model.cities){const oc=v.ownCities?.[c.id];if(oc)c.troops=oc.reserveTroops??0;}
 overlayAnimations(model);
 for(const u of model.units){const a=state.armies[u.id];if(a&&Number.isInteger(a.facing))u.faceLeft=[2,3,4].includes(a.facing);}
 v3ModeHighlights(v,model,state);
 const margin=440; // 땅 밖으로도 화면을 옮길 수 있다 — 그 너머는 구름 바다(지도와 같이 움직이는 한 장의 세계. 사용자 2026-10-11 "월드맵은 배경이 따로 없어야 하고, 이동하면 다른 지형(안개)이 보여야 함")
 const left=viewport.scrollLeft,top=viewport.scrollTop;
 const cityBadges=Object.fromEntries(Object.values(v.ownCities??{}).map(c=>[c.cityId,cityProductionBadge(c)]).filter(([,b])=>b));
 const markup=renderWorldMap(model,{size:30,margin,cityBadges,compactLabels:globalThis.matchMedia?.("(max-width: 1320px), (max-height: 800px)").matches,...v3MapOptions(),relations:v3Relations(v)});
 if(hoverOnly){
  // 예고 때문에 이름표·칸을 교체하면 pointerdown/up 의 대상이 달라져 클릭이 사라진다.
  const svg=$('#map svg'),scratch=document.createElement('div');if(!svg)return;scratch.innerHTML=markup;
  const layers='.w-path,.w-order,.w-order-end,.w-side';svg.querySelectorAll(layers).forEach(n=>n.remove());
  for(const layer of scratch.querySelectorAll(layers))svg.insertBefore(layer,svg.querySelector('.w-hits'));
  return;
 }
 $('#map').innerHTML=markup;markUnknownCounts(model);applyZoom();animateUnits($('#map'));
 // 실제 여백은 그린 쪽이 정한다(세계 그림이 있으면 그 고리 너비). 여백이 바뀐 차례에는 그만큼 화면을 옮겨 같은 곳을 보게 한다
 const used=Number($('#map svg')?.dataset?.margin)||margin,offset=mapMargin?(used-mapMargin)*zoom:0;mapMargin=used;
 viewport.scrollLeft=left+offset;viewport.scrollTop=top+offset;
 for(const id of targets)for(const node of unitNodes(id))node.classList.add('attack-target');
 for(const u of model.units){const node=$('#map').querySelector(`[data-unit="${u.id}"]`);if(node?.insertAdjacentHTML)node;}
}
function applyZoom(){
 const svg=$('#map svg');if(!svg)return;
 const width=svg.viewBox?.baseVal?.width;
 if(width)svg.style.width=width*zoom+'px';
 svg.classList.toggle('zoom-far',zoom<.75);svg.classList.toggle('zoom-near',zoom>=1.4);
}
export function zoomScroll(left,top,x,y,from,to){return {left:(left+x)*to/from-x,top:(top+y)*to/from-y};}
let zoomTimer=null;
function zoomAt(value,x,y){
 const vb=$('#map svg')?.viewBox?.baseVal,fit=vb?.width?Math.min(viewport.clientWidth/Math.max(1,vb.width-2*mapMargin),viewport.clientHeight/Math.max(1,vb.height-2*mapMargin)):.5; // 가장 멀리 = 땅 전체가 한 화면에(땅 밖 구름 여백은 빼고 잰다)
 const cover=vb?.width?Math.max(viewport.clientWidth/vb.width,viewport.clientHeight/vb.height):.5; // 가장 멀리 보아도 그림이 화면을 다 덮게(그림 밖이 보이지 않게)
 const next=Math.max(Math.max(.5,Math.min(1,fit)),cover,Math.min(2.6,value)),from=zoom,start=performance.now(),left=viewport.scrollLeft,top=viewport.scrollTop;
 clearTimeout(zoomTimer);
 function frame(){const t=Math.min(1,(performance.now()-start)/120);zoom=from+(next-from)*t;
  applyZoom();const p=zoomScroll(left,top,x,y,from,zoom);viewport.scrollLeft=p.left;viewport.scrollTop=p.top;
  if(t<1)zoomTimer=setTimeout(frame,16);
 }frame();
}
viewport.addEventListener('wheel',e=>{if(!state||e.target.closest('.float,#city-panel,#unit-menu,.officers'))return;e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX-r.left,e.clientY-r.top);},{passive:false});
document.addEventListener('keydown',e=>{if(!state||e.target?.closest?.('input,select,textarea'))return;if(['+','=','-'].includes(e.key)){e.preventDefault();zoomAt(zoom*(e.key==='-'?1/1.12:1.12),viewport.clientWidth/2,viewport.clientHeight/2);}});
$('#mini').addEventListener('click',e=>{
 const mini=$('#mini svg'),svg=$('#map svg');if(!mini?.createSVGPoint||!svg?.createSVGPoint)return;
 const point=mini.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
 const p=point.matrixTransform(mini.getScreenCTM().inverse()),box=mini.viewBox.baseVal;
 const hits=[...svg.querySelectorAll('[data-tile]')];if(!hits.length)return;
 const b=hits.map(n=>n.getBBox()),minX=Math.min(...b.map(n=>n.x)),maxX=Math.max(...b.map(n=>n.x+n.width)),minY=Math.min(...b.map(n=>n.y)),maxY=Math.max(...b.map(n=>n.y+n.height));
 const x=minX+(p.x/box.width)*(maxX-minX),y=minY+(p.y/box.height)*(maxY-minY);
 viewport.scrollLeft=x*zoom-viewport.clientWidth/2;viewport.scrollTop=y*zoom-viewport.clientHeight/2;
});
// 규칙 도움말 창(HUD '규칙'): 지금 구현된 규칙과 시험값만 요약
$('#rules-open')?.addEventListener?.('click',()=>{$('#rules-modal').hidden=false;});
$('#rules-close')?.addEventListener?.('click',()=>{$('#rules-modal').hidden=true;});
$('#faction')?.addEventListener?.('click',()=>{if(!state)return;$('#faction-modal').hidden=false;renderFactionModal();});
$('#faction-close')?.addEventListener?.('click',()=>{$('#faction-modal').hidden=true;});
$('#faction-content')?.addEventListener?.('click',e=>{if(!state||inputLocked())return;const b=e.target.closest('[data-diplo-propose],[data-diplo-end]');if(!b)return;
 const cmd=b.dataset.diploPropose?{type:'DIPLO_PROPOSE',factionId:b.dataset.diploPropose,kind:b.dataset.kind}:{type:'DIPLO_END_ALLIANCE',factionId:b.dataset.diploEnd};
 try{state=step(state,cmd);render();renderFactionModal();}catch(err){$('#status').textContent=errorText(err);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#rules-modal')&&!$('#rules-modal').hidden)$('#rules-modal').hidden=true;});
// The band and N/Space share selection and camera behavior.
function nextBandUnit(){
 if(!state||state.gameResult||inputLocked()||state.phase!=='PLAYER')return;
 const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)).sort();if(!ids.length)return;
 const next=ids[(ids.indexOf(selectedArmyId)+1)%ids.length];
 selectedTacticId=null;overlapPick=null;attackMode=false;selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;render();follow(next);
}
document.addEventListener('ink:next-unit',nextBandUnit);
document.addEventListener('ink:uncover',()=>{if(selectedArmyId)requestAnimationFrame(()=>follow(selectedArmyId,true));});
// 키보드: N = 다음 부대(이번 턴 행동이 남은 내 부대를 차례로 골라 보여 줌), Enter = 다음 턴. 창이 떠 있거나 입력 중이면 무시
document.addEventListener('keydown',e=>{
 if(!state||state.gameResult||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,select,textarea,button,a'))return;
 if(document.querySelector('.modal-backdrop:not([hidden])'))return;
 if(e.key==='x'||e.key==='X'){e.preventDefault();dangerMode=!dangerMode;render();$('#status').textContent=dangerMode?'위험 지역 보기 — 보이는 적이 다음 턴에 닿는 칸 (X 끄기)':'위험 지역 보기 끔';return;}
 if(e.key==='n'||e.key==='N'||e.key===' '){
  e.preventDefault();nextBandUnit();
 }
 if(e.key==='Enter'&&!$('#end-turn').disabled){e.preventDefault();const b=$('#end-turn').dataset.blocker;if(b&&!e.shiftKey){openCity(b,'jobs');return;}command({type:'END_TURN'});}
 // 부대 행동 단축키: Q 이동 · E 공격 · F 정면 · B 방어 · R 재정비 · G 주둔 · Z 대기 · 1~3 전법 · Space 다음 부대
 if(selectedArmyId&&state.phase==='PLAYER'&&!inputLocked()){
  const key=e.key.length===1?e.key.toUpperCase():e.key,action=Object.entries(ACTION_KEYS).find(([,k])=>k===key)?.[0],ti=['1','2','3'].indexOf(e.key);
  if(action||ti>=0){if(!menuOpen){menuOpen=true;render();}const btn=ti>=0?[...(document.querySelectorAll?.('#unit-menu [data-tactic]')??[])][ti]:document.querySelector(`#unit-menu [data-menu="${action}"]`);if(btn&&!btn.disabled){e.preventDefault();btn.click();}}
 }
});
// 이어하기로 들어오면 모듈 끝에서 불러온다 — 위쪽에서 부르면 아래의 viewport 등이 아직 만들어지지 않아(TDZ) 끝난 판에서 오류 문구가 남았다
if (new URLSearchParams(location.search).get('entry') === 'continue') resume();
