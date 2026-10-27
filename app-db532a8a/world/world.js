import {v3View,resourceChipsV3,resourceDetailsV3,domesticScreenV3,recruitV3,numberV3,warningTrackerV3} from '/app/world/domestic-v3-ui.mjs';
import {v3ArmKind,v3ArmsPerTroop} from '/src/domestic-v3.mjs';
const observeWarnings490=warningTrackerV3();
import {josa,particle,displayKorean} from './korean-text.mjs';
import {meleePlan,meleeDamage,meleeAudioEvents} from './melee-motion.mjs';
import {chanceText462} from './hud-ink.mjs';
import {engineSelection462,engineCandidates462,pickEngineTarget462,backEngineSelection462,engineRequest462} from './hud-ink.mjs';
import {naturalRecruitment,manpowerV2,emergencyConscriptionPreview} from '/src/campaign-economy.mjs';
import './detail-d3.mjs';
import {headOf} from './hud-ink.mjs';
import {cityProductionIdle} from './hud-ink.mjs';
import {cutinTiming444,playCutin444} from './tactic-cutin.mjs';
import {abilityName356,abilityGloss356,mountDraftNames356} from './hud-ink.mjs';
import {TROOP_Q_RULES} from '/src/campaign-combat.mjs';
import {officerStats354,officerTraits354,dockIcon327} from './hud-ink.mjs';
// C327 measured color snapshot; checked against the provenance JSON.
const officerColors327 = {"G24":{"primary":"#481818","secondary":"#D89878"},"G18":{"primary":"#486858","secondary":"#C86848"},"G04":{"primary":"#583828","secondary":"#D8C8B8"},"G27":{"primary":"#283848","secondary":"#987858"},"G01":{"primary":"#382828","secondary":"#E8B8A8"},"G02":{"primary":"#383828","secondary":"#B88868"},"G03":{"primary":"#986858","secondary":"#E8B8A8"},"G05":{"primary":"#382818","secondary":"#D89878"},"G06":{"primary":"#482818","secondary":"#E8C8B8"},"G07":{"primary":"#480808","secondary":"#E8B898"},"G08":{"primary":"#482818","secondary":"#F8D8B8"},"G09":{"primary":"#A86848","secondary":"#E8B898"},"G10":{"primary":"#680808","secondary":"#F8C8A8"},"G100":{"primary":"#884828","secondary":"#D88858"},"G11":{"primary":"#382828","secondary":"#F8C8B8"},"G12":{"primary":"#381808","secondary":"#D87848"},"G13":{"primary":"#784828","secondary":"#D88868"},"G14":{"primary":"#785848","secondary":"#B8A8A8"},"G15":{"primary":"#985838","secondary":"#E8A878"},"G16":{"primary":"#985838","secondary":"#985838"},"G17":{"primary":"#582818","secondary":"#985838"},"G19":{"primary":"#381808","secondary":"#B86848"},"G20":{"primary":"#381818","secondary":"#E8A888"},"G21":{"primary":"#383828","secondary":"#C8A888"},"G22":{"primary":"#481818","secondary":"#F8D8C8"},"G23":{"primary":"#382828","secondary":"#B87858"},"G25":{"primary":"#683828","secondary":"#B87858"},"G26":{"primary":"#382828","secondary":"#E8B898"},"G28":{"primary":"#282838","secondary":"#F8C8A8"},"G29":{"primary":"#A86848","secondary":"#A86848"},"G30":{"primary":"#383828","secondary":"#A86848"},"G31":{"primary":"#885848","secondary":"#E8A888"},"G32":{"primary":"#683828","secondary":"#C88868"},"G33":{"primary":"#484858","secondary":"#E8A888"},"G34":{"primary":"#784828","secondary":"#C88858"},"G35":{"primary":"#A87858","secondary":"#A87858"},"G36":{"primary":"#382828","secondary":"#F8A878"},"G37":{"primary":"#382828","secondary":"#C89888"},"G38":{"primary":"#382818","secondary":"#C88858"},"G39":{"primary":"#986848","secondary":"#E8A878"},"G40":{"primary":"#885838","secondary":"#D89878"},"G41":{"primary":"#081848","secondary":"#D88868"},"G42":{"primary":"#381808","secondary":"#F8D8C8"},"G43":{"primary":"#A87858","secondary":"#D8A888"},"G44":{"primary":"#382818","secondary":"#D8C8B8"},"G45":{"primary":"#482818","secondary":"#986848"},"G46":{"primary":"#382818","secondary":"#A86848"},"G47":{"primary":"#584838","secondary":"#D89878"},"G48":{"primary":"#A86848","secondary":"#A86848"},"G49":{"primary":"#481818","secondary":"#F8B898"},"G50":{"primary":"#382828","secondary":"#B87858"},"G51":{"primary":"#784838","secondary":"#D89878"},"G52":{"primary":"#382818","secondary":"#F8F8E8"},"G53":{"primary":"#986858","secondary":"#E8B898"},"G54":{"primary":"#985838","secondary":"#985838"},"G55":{"primary":"#A88878","secondary":"#E8C8B8"},"G56":{"primary":"#583828","secondary":"#B87858"},"G57":{"primary":"#483838","secondary":"#988878"},"G58":{"primary":"#583828","secondary":"#C89878"},"G59":{"primary":"#985838","secondary":"#E8A878"},"G60":{"primary":"#484838","secondary":"#D8A888"},"G61":{"primary":"#885838","secondary":"#F8B888"},"G62":{"primary":"#887868","secondary":"#F8E8C8"},"G63":{"primary":"#986848","secondary":"#986848"},"G64":{"primary":"#684838","secondary":"#D8A888"},"G65":{"primary":"#483828","secondary":"#F8E8D8"},"G66":{"primary":"#885838","secondary":"#E8A878"},"G67":{"primary":"#384858","secondary":"#B89878"},"G68":{"primary":"#A88868","secondary":"#D8B898"},"G69":{"primary":"#584838","secondary":"#C89878"},"G70":{"primary":"#A86848","secondary":"#F8E8E8"},"G71":{"primary":"#784828","secondary":"#D89878"},"G72":{"primary":"#986848","secondary":"#D89868"},"G73":{"primary":"#684838","secondary":"#987858"},"G74":{"primary":"#985838","secondary":"#E8A878"},"G75":{"primary":"#985838","secondary":"#985838"},"G76":{"primary":"#885838","secondary":"#D8A888"},"G77":{"primary":"#685848","secondary":"#C88868"},"G78":{"primary":"#483838","secondary":"#C88868"},"G79":{"primary":"#685848","secondary":"#A86848"},"G80":{"primary":"#382818","secondary":"#D89878"},"G81":{"primary":"#584838","secondary":"#D8A888"},"G82":{"primary":"#382828","secondary":"#D89878"},"G83":{"primary":"#483828","secondary":"#E8B898"},"G84":{"primary":"#583828","secondary":"#D8D8D8"},"G85":{"primary":"#483838","secondary":"#E8D8C8"},"G86":{"primary":"#382828","secondary":"#C88868"},"G87":{"primary":"#887868","secondary":"#988878"},"G88":{"primary":"#482818","secondary":"#E8D8C8"},"G89":{"primary":"#382818","secondary":"#E8B898"},"G90":{"primary":"#784838","secondary":"#E8C8B8"},"G91":{"primary":"#382828","secondary":"#D8A898"},"G92":{"primary":"#887868","secondary":"#A8A8A8"},"G93":{"primary":"#985838","secondary":"#E89868"},"G94":{"primary":"#382828","secondary":"#A86848"},"G95":{"primary":"#A86848","secondary":"#C88868"},"G96":{"primary":"#786858","secondary":"#E8D8C8"},"G97":{"primary":"#886858","secondary":"#E8B898"},"G98":{"primary":"#383828","secondary":"#F8F8E8"},"G99":{"primary":"#483828","secondary":"#986848"}};
import {traitLoadoutButtonHtml,traitLoadoutPanelHtml,draftTraitUseText} from './hud-ink.mjs';
import {mountBookendResult298,mountResultV4374} from './hud-ink.mjs';
import {tooltipPlacement290,miniCameraRect290,syncKitHudLayout290,compactForecastPlacement352} from './hud-ink.mjs';
import {createRunEndMemory,runEndRecords,runEndReplayHtml,runEndLossHtml} from './hud-ink.mjs';
import {sleepingOfficerHtml} from './officer-draft-ui.mjs';
const c286Memory=createRunEndMemory();
let c286ReplayTimer=null;
import {createOfficerVoiceLoader,officerIntroHtml,officerMomentVoice,officerMomentHtml} from './hud-ink.mjs';
import {campaignTacticsView,campaignTacticsWorld} from '/src/campaign-ai-tactics.mjs';
import {ritualEnabled,createRitualTracker,mountRitual,crossroadsEligible,decorateCrossroads,difficultyFromStart} from '/app/world/ritual-ui.mjs';
import {symImg} from './hud-ink.mjs';
import {eventChoiceMarkup297,mountReportPresentation297,eventNeedsConfirmation,eventTextHtml,eventCostLines,publicWorldNews,factionComparisonHtml,diplomacyWarLine} from './hud-ink.mjs';
import {eventDeckCard} from '/src/campaign-event-deck.mjs';
import {updateWorldMap370,updateMapInteraction462,settleMapUnits386,mapInfoModel,syncCityLabelEdges,syncMapReadability,forecastPlacement,mountPlaceNameSetting} from './map-v3.mjs';
globalThis.document?.addEventListener('ink:settings-mounted',e=>mountPlaceNameSetting(e.detail));
import {CAMPAIGN_RETREAT_FATE_RULES} from '/src/campaign-retreat-fate-adjudicator.mjs';
import {mountHelpPanel,saveSlotSummary} from './hud-ink.mjs';
import {combatResultText,C260_COMBAT,resultSceneHtml,battleResultDock292} from './hud-ink.mjs';
import {promotionCardsMarkup} from './hud-ink.mjs';
import {lodDetail} from './troops.mjs';
import {renderEngineMapLayer} from '/app/design/map-render.mjs';
import {updateCampaignKnowledge as updateC229Knowledge} from '/src/campaign-vision.mjs';
import {createPrologue,stepPrologue as step,isPrologue,observePrologue,finishPrologue} from '/src/campaign-prologue.mjs';
import {renderPrologue,loadGuideData,chooseGuide,readGuidePreferences,mountGuideSettings,showGuideFirst,showGuideReaction,guideEndingHtml,resetGuideRun,recordGuideCombat,guideCapitalThreat} from './prologue-ui.mjs';
loadGuideData().catch(()=>{});
document.addEventListener('ink:settings-mounted',e=>mountGuideSettings(e.detail));
let stratagemUi=null;
function initialInfoLens291(ui){return ui==='kit'?null:'danger';}
let infoLens=initialInfoLens291(document.documentElement.dataset.ui);
function exitInfoLens(){infoLens=null;dangerMode=false;setV3Mode('world');if(state)render();}
function toggleDangerLens(){dangerMode=!(infoLens==='danger'||dangerMode);setV3Mode('world');infoLens=dangerMode?'danger':null;render();}
// C258: one front-panel predicate shared by all map lens decorations.
// City-stage/domestic integrations can use this without changing lens state.
function mapOverlayOpen(){
 return [...document.querySelectorAll('.w-modal:not([hidden]),[role="dialog"]:not(#city-quick):not(.w-sheet),#selection:not([hidden]),#city-stage:not([hidden]),#sortie-screen:not([hidden]),#officer-draft:not([hidden]),#result:not([hidden]),#rules:not([hidden]),.nb-settings:not([hidden]),.nb-sheet:not([hidden]),.w-council:not([hidden])')].some(node=>node.getClientRects().length>0);
}
function syncMapOverlay(){
 // Settlement changes map markers and the result dock, never modal coverage.
 if(settlementOverlayPaused394)return;
 const open=String(mapOverlayOpen());
 if(document.body.dataset.mapOverlay!==open)document.body.dataset.mapOverlay=open;
}
let settlementOverlayPaused394=false;
// 10-23 성능: 지도 안(svg) 표지 class 변경마다 겹침 판정(강제 레이아웃)이 돌던 것을 막고, 한 프레임에 한 번만 판정한다.
let mapOverlayFrame=null;
new MutationObserver(records=>{
 if(mapOverlayFrame!==null)return;
 if(records.every(r=>r.target?.closest?.('#map svg')))return;
 mapOverlayFrame=requestAnimationFrame(()=>{mapOverlayFrame=null;syncMapOverlay();});
}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
syncMapOverlay();
let c290LensMode=null,c290LensUntil=0,c290LensTimer=null,c290LegendOpen=false;
function renderInfoLens(){
 const mode=v3Mode()!=='world'?v3Mode():infoLens;
 let panel=$('#c248-lens');
 if(!panel){panel=document.createElement('section');panel.id='c248-lens';panel.setAttribute('aria-label','지도 보기 범례');document.body.append(panel);}
 panel.hidden=!mode||combatAnimating||document.body.dataset.c260Forecast==='true';document.body.classList.toggle('c248-lens-active',!!mode);
 if(!mode){c290LensMode=null;return;}
 const name={world:'지형',supply:'보급',faction:'세력',diplomacy:'외교',trace:'탐험',danger:'위험',compare:'세력 비교'}[mode];
 panel.innerHTML=`<p class="c248-lens-title">${name} 보기 — 오른쪽 클릭: 선택 취소 · Esc 로 나가기</p><aside class="c248-lens-key"><b>${name} 범례</b><ul>${mode==='compare'?'<li>'+factionComparisonHtml(view(state))+'</li>':lensLegendHtml(mode)}</ul><button data-c248-lens-close>기본 보기</button></aside>`;
 if(document.documentElement.dataset.ui==='kit'){
  if(c290LensMode!==mode){c290LensMode=mode;c290LensUntil=Date.now()+1500;c290LegendOpen=false;}
  const title=panel.querySelector('.c248-lens-title');title.textContent=`${name} 보기 · Esc로 기본 보기`;title.hidden=Date.now()>=c290LensUntil;
  clearTimeout(c290LensTimer);if(!title.hidden)c290LensTimer=setTimeout(()=>{title.hidden=true;},Math.max(0,c290LensUntil-Date.now()));
  const key=panel.querySelector('.c248-lens-key');key.classList.toggle('c290-open',c290LegendOpen);
  key.querySelector('b').outerHTML=`<button class="c290-legend-toggle" aria-expanded="${c290LegendOpen}">${name} 범례 ${c290LegendOpen?'접기':'펼치기'}</button>`;
  key.querySelector('.c290-legend-toggle').onclick=e=>{e.stopPropagation();c290LegendOpen=!c290LegendOpen;key.classList.toggle('c290-open',c290LegendOpen);e.currentTarget.setAttribute('aria-expanded',String(c290LegendOpen));e.currentTarget.textContent=`${name} 범례 ${c290LegendOpen?'접기':'펼치기'}`;document.dispatchEvent(new CustomEvent('ink:uncover'));};
 }
 panel.querySelector('[data-c248-lens-close]').onclick=e=>{e.stopPropagation();exitInfoLens();};
}
function clearMapLosses(){document.querySelectorAll('.c248-map-loss').forEach(n=>n.remove());}
function showMapLosses(targetId,p,city=false){
 if(document.documentElement?.dataset.ui==='kit')return;
 clearMapLosses();
 if(typeof zoom!=='undefined'&&mapLabelDetail(zoom)==='far')return;
 const badge=(id,loss,ally=false)=>{
  if(!Number.isFinite(loss)||loss<=0)return;
  const node=$('#map').querySelector(`[data-unit="${id}"] .plate-top, [data-unit="${id}"] .lod-face, .w-cityplate[data-city="${id}"], [data-unit="${id}"]`);
  if(!node)return;const box=node.getBoundingClientRect(),port=viewport.getBoundingClientRect();
  if(box.right<port.left||box.left>port.right||box.bottom<port.top||box.top>port.bottom)return;
  const label=document.createElement('div');label.className='c248-map-loss'+(ally?' ally':'');
  label.style.left=`${box.left+box.width/2}px`;label.style.top=`${Math.max(port.top+24,box.top-24)}px`;
  const scale=typeof campaignShownScale==='function'&&typeof state!=='undefined'?campaignShownScale(state,targetId,state.playerFactionId):1;
  const seal=!ally&&!city?(p.enemyLoss*scale>=p.shownTargetCount?'破':p.formationRisk?.check&&p.formationRisk.successProbability<.5?'崩':p.moraleRisk?.check&&p.moraleRisk.successProbability<.5?'潰':''):'';
  const side=document.documentElement?.dataset.ui!=='kit'&&!ally&&{FLANK:'옆',REAR:'뒤'}[p.side];
  label.innerHTML=`−${city&&!ally?esc(loss):troopText(loss)}${side?` <small>${side}</small>`:''}${seal?` <b class="c266-map-seal">${seal}</b>`:''}`;
  label.setAttribute('aria-label',`${ally?'우리 부대':'대상'} 예상 ${city&&!ally?'내구':'병력'} 손실 ${city&&!ally?loss:troopText(loss)}`);document.body.append(label);
 };
 badge(targetId,city?p.dealt:p.enemyLoss);if(p.counter!==false)badge(selectedArmyId,p.allyLoss,true);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(infoLens||v3Mode()!=='world')&&!document.querySelector('#diplo:not([hidden]),#c226-stratagem:not([hidden]),.w-modal:not([hidden]),.modal-backdrop:not([hidden]),.c261-settings:not([hidden])')){e.preventDefault();e.stopImmediatePropagation();exitInfoLens();}},true);
document.addEventListener('click',e=>{if(!e.target.closest?.('[data-mode="compare"]'))return;e.preventDefault();e.stopImmediatePropagation();setV3Mode('world');infoLens='compare';dangerMode=false;if(state){render();renderInfoLens();}},true);
document.addEventListener('ink:forecast',e=>{document.body.dataset.c260Forecast=String(!!e.detail);const lens=$('#c248-lens');if(lens)lens.hidden=!!e.detail||combatAnimating||!infoLens;});
function confirmKitForecast(){
 if(inputLocked()||!selectedArmyId)return;
 if(typeof selectedTacticId!=='undefined'&&selectedTacticId){confirmTacticForecast();return;}
 const tile=document.querySelector('.nb-band')?.dataset.target;if(!tile)return;
 const city=Object.values(state.cities).find(c=>c.tileId===tile)?.cityId,t=mapTarget(selectedArmyId,tile,city);
 if(t.kind==='unit')command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:t.targetId});
 else if(t.kind==='city')command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId:t.cityId});
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-c266-tactic]')){const tile=document.querySelector('.nb-band')?.dataset.target;selectedTacticId=e.target.closest('[data-c266-tactic]').dataset.c266Tactic;const target=tile&&tacticTargetAt(tile);if(target){tacticForecast=prepareTacticForecast(target);const html=tacticForecastHtml(tacticForecast);document.dispatchEvent(new CustomEvent('ink:forecast',{detail:{html}}));}return;}
 if(e.target.closest('[data-c266-normal]')&&selectedTacticId){const id=tacticForecast?.request.targetId;selectedTacticId=null;tacticForecast=null;if(id&&attackTargets(state,selectedArmyId).includes(id)){document.dispatchEvent(new CustomEvent('ink:forecast',{detail:{html:forecastHtml(selectedArmyId,id,previewAttack(state,selectedArmyId,id))}}));}return;}
 if(e.target.closest('[data-c260-attack]'))confirmKitForecast();
 if(e.target.closest('[data-c260-cancel]'))cancelKitForecast362();
});

function cancelKitForecast362(){
 cancelAttackConfirmation();clearTacticForecast();selectedTacticId=null;attackMode=false;hoverSide=null;
 clearMapLosses();setCommandIntent('');if(state)render();
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.body.dataset.c260Forecast==='true'&&(document.documentElement?.dataset.ui!=='kit'||e.target.closest('.c260-forecast'))&&!e.target.closest('button,input,select,textarea')){e.preventDefault();e.stopImmediatePropagation();confirmKitForecast();}});
import {engineStatusMarkup,stratagemPanelHtml,worldDisplayText,outcomeOddsHtml,diplomacyLikelihoodHtml,diplomacyReasonsHtml,diplomacyReasonPlacement,diplomacyKitHtml} from './hud-ink.mjs';
import {combatBonusLabels,productionCompletions,saveAvailability,updateBestRecord,resultHistoryHtml,resultChronicleRows,turnSummaryHtml,foodLedgerTotals,publicEnemyIntents,commandLimitText,characterHistoryHtml,reserveTransferLines} from './hud-ink.mjs';
import {reserveTransferReason,swapReason,C214} from '/src/campaign-engine-gaps.mjs';
import {citySupplyRoute} from '/src/campaign-supply.mjs';
import {fxPreferences,mapFeelEnabled,shouldShowTacticCutin,factionOpeningLine,factionFacilityTodo,cityCaptureThreatHtml} from './hud-ink.mjs';
import {reinforcementText,cityReinforcementText} from './hud-ink.mjs';
import {oathBandHtml,twistHistoryHtml,readRecentEventIds,writeRecentEventIds} from './hud-ink.mjs';
import {ambitionScreenOffer,ambitionCardsHtml,ambitionBandHtml,ambitionEndingHtml,readCampaignLegacy,writeCampaignLegacy,C190_SEALS} from './hud-ink.mjs';
import {AMBITIONS} from '/src/campaign-ambitions.mjs';
import {renderRunModifiers} from './c211-run-ui.mjs';
import {levelupReadout,levelupQueue,levelupArtCategory,LEVELUP_ASSETS,levelupUpgradeText,fatigueLineText} from '/app/world/hud-ink.mjs';
// 천하재결 새 화면 컨트롤러(UI v3, 2026-10-08) — 게임 흐름 로직은 옛 campaign.js 에서 갈라 왔고, 보이는 것(마크업·지도·아이콘)은 새로 쓴다.
// 옛 화면(/campaign)은 그대로 둔다. 지도: /app/world/map-v3.mjs, 스타일: /app/world/world.css
import {orderEligible,orderRoutes,routeTurns,orderHighlights,queuedOrderUnit,waypointRoute,visibleControlZones} from '/src/campaign-orders.mjs';
import {selectionRect,rectangleSelection,toggleSelection,cycleTileUnit,targetTile} from '/src/campaign-select.mjs';
import {campaignTactics,officerEffectCards,tacticIsDamage,cardEffectPending,cardTroopReady,recallReason,hasCampaignRule,canMainAction,strengthenedValue} from '/src/campaign-effects.mjs';
import {C31_DATA} from '/src/campaign-events.mjs';
import {crisisRewardText,diplomacyTimingText,taxAdvanceLines} from '/app/world/hud-ink.mjs';
import {regroupReason,campaignPath} from '/src/campaign-morale.mjs';
import {previewAttackThreat,cityAttackTargets,previewCityAttack,previewTactic,tacticFailureReason,attackTargets,previewAttack,previewDisengage,previewApproachFire,armyActionEnded,attackRange,campaignUnitRatings,campaignDangerTiles} from '/src/campaign-combat.mjs';
import {createCampaignCombatAudio} from '/src/campaign-combat-audio.mjs';
import {createCampaign, view, serialize, deserialize, CAMPAIGN_SAVE_KEY,addCampaignOfficer,campaignMoveOptions,CAMPAIGN_TURN_LIMIT} from '/src/campaign-runtime.mjs';
import {getFactionView} from '/src/knowledge.mjs';
import {troopPlateY,troopScreenMatrix} from '/app/world/troops.mjs';
import {hexDistance} from '/src/map-primitives.mjs'; // 굶는 부대 안내(starvingAdvice)가 쓰는데 빠져 있어, 굶는 부대를 고르면 화면 오류가 났다(C132 · 2026-10-12 자동 플레이에서 발견)
import {archerAttackReason} from '/src/campaign-combat.mjs';
import {diplomacyAttackReason,diplomacyMoveReason,diplomacyTiming,diplomacyScreenFacts} from '/src/campaign-diplomacy.mjs';
import {campaignHorizonText,noFieldArmyText,commandIntentText,tacticChangeText,resultReasonText,growthUseText,unfieldedOfficerNames,uncoveredShift,turnNews,overlapSelection} from '/app/world/hud-ink.mjs'; // C137 · C138
import {statsToOfficerPack,troopToCampaign} from '/src/campaign-adapters.mjs';
import {saveText,loadText,settle,saveMarkerKey} from '/src/save-store.mjs';
import {campaignSubAbility,directionToward,C12} from '/src/campaign-abilities.mjs';
import {C182} from '/src/campaign-rule-registry.mjs';
import {C193,SPECIAL_TROOPS,troopInfo,platformState,platformAttackReason} from '/src/campaign-special-troops.mjs';
import {platformActionReason} from '/src/campaign-effects.mjs';
import {troopText,troopDelta,TROOP_DISPLAY_SCALE} from '/src/troop-display.mjs';
import {CAREER_DATA} from '/src/campaign-career.mjs';
import {movementUndoReason,playerTurnSummary,campaignResultScore,titleProgress,facingTiles,tacticTargetsHtml,mechanicMap418,tileTactic418} from '/app/world/hud-ink.mjs';
import {securityLabel,CITY_JOBS,cityEconomyRates,cityOccupationStatus,cityJobReason} from '/src/campaign-economy.mjs';
import {DOMESTIC_RULES,COMBAT_TITLE_RULES,C33_POOL,domesticFoodAvailable,campaignShownScale} from '/src/campaign-rule-registry.mjs';
import {CAMPAIGN_RULES} from '/src/campaign-effects.mjs';
import {occupationDisplay,occupationMethodReason,OCCUPATION_METHODS} from '/src/campaign-occupation.mjs';
import {campaignCaptives,captiveRecruitmentReason,captiveActionPreview} from '/src/campaign-captives.mjs';
import {UNIQUE_OFFICERS} from '/src/campaign-rule-registry.mjs';
import {cityRecruitCost,cityRecruitQuote} from '/src/campaign-policy.mjs';
import {c29CoreCard,c29CoreFactor} from '/src/campaign-c29.mjs';
import {c29AiChoice,c29BindingTargets} from '/src/campaign-c29.mjs';
import {xpToNextLevel} from '/src/growth-progress.mjs';
import {rankCampaignAiDraft,pendingCampaignDraft,needsTraitResolution,tacticLoadoutReason,CAMPAIGN_RARITY_NAMES,resolveTraitSpace,CAMPAIGN_TRAIT_SLOTS,CAMPAIGN_TACTIC_SLOTS} from '/src/campaign-growth.mjs';

import {renderWorldMap,renderMapPreview,animateUnits,FACTION,prepareFeelContact,prepareFeelVolley,prepareFeelWall,lensLegendHtml} from '/app/world/map-v3.mjs';
import {C190_ART,mapLabelDetail,cityPublicReadout,cityQuickHtml,cityQuickPlacement,cityQuickIntent} from '/app/world/hud-ink.mjs';
// C155: old art remains usable until the new presentation module is served.
let troopLayer=null;
Object.defineProperty(globalThis,'__c255FiguresStats',{configurable:true,get:()=>troopLayer?.stats.figures});
let fxInk=null,chargeDust=()=>{};
import('/app/world/fx-ink.mjs').then(m=>{chargeDust=m.drawChargeDust;fxInk=m.createInkFx({root:$('#map'),viewport:$('.viewport'),sfx:()=>worldSfx,reduced:()=>reduceMotion()||aiPresentationMs(100)===0,shake:()=>fxPreferences.shake(),camera:{get:()=>({zoom,left:viewport.scrollLeft,top:viewport.scrollTop}),set:c=>{zoom=c.zoom;applyZoom();viewport.scrollLeft=c.left;viewport.scrollTop=c.top;}}});if(state)render();}).catch(e=>console.warn('C177 FX module unavailable (server route required):',e.message));
if(new URLSearchParams(location.search).get('troops')!=='old')import('/app/world/troops.mjs').then(async m=>{await loadV3Manifest();troopLayer=m.createTroopLayer({asset:v3Asset});troopLayer.setChargeDust((...args)=>chargeDust(...args));if(state)render();}).catch(e=>console.warn('C155 troop layer unavailable:',e.message));
import {cutout} from '/app/world/cutout.mjs';

import {C22_EVENTS} from '/src/campaign-events.mjs';
import {mountCityLife} from '/app/world/city-life.mjs';
import {BUILDINGS,cityPeople,cityIssues,loadStageArt,overviewHtml,facilityHtml,cityFile,cityFacilityRoles,sortieHtml,planSorties,sortieTroopOptionsHtml,naejeongHtml,domesticIntent,domesticJobExtra,bindCityAudit,JOB_FX,recommendCityJob,researchUnlockHint} from '/app/world/city-stage.mjs';
import {combatScreenNews,combatEffectLines,windHtml} from '/app/world/hud-ink.mjs';
import {recruitmentReasonHtml,captivePreviewHtml,relationSceneHtml,tacticFaceMarkup,mountInkHud,renderInkHud,shownTroopForecast,surpriseWarning,productionReadout,observedReinforcementLines,starvationLines,injuryReturnText,recruitmentLeadsHtml,foodSnapshot,foodTransition,combatReadout,garrisonResult,facilityCompletionLines,readableText,readableError,foodExhaustion,labelNumber,cardNumericText,clickTargetDecision,targetPreviewText,unitActionReadout} from '/app/world/hud-ink.mjs';
import {v3Asset,loadV3Manifest,v3MapOptions,v3ModeHighlights,v3Relations,setV3Mode,v3Mode,renderWorldDial,renderAdvisor,renderModeRail,resourceIcon,factionEmblem} from '/app/design/v3-ui.mjs';
const FACTION_STYLE=Object.fromEntries(Object.entries(FACTION).map(([k,v])=>[k,{...v,soft:v.color}]));
// 세력 표지: 그림 메달이 있으면 그림, 없으면 마름모 안 한 글자
const emblemHtml=(fid,cls='')=>{const src=factionEmblem(fid),s=FACTION[fid]??{color:'#76776f',glyph:'中'};return src?`<img class="emblem-art ${cls}" src="${src}" alt="">`:`<span class="crest ${cls}" style="--fc:${s.color}"><i>${s.glyph}</i></span>`;};
// 화면 테마: 기본 청록산수(qinglu). ?theme=classic 으로 예전 담채 지도 — 고른 값은 기억한다.
const THEME='v3';
// C135: developer links are opt-in.
for(const link of document.querySelectorAll('[data-dev-only]'))link.hidden=new URLSearchParams(location.search).get('dev')!=='1';
import {campaignMapModel,campaignDate} from '/src/campaign-map-model.mjs';
import {escapeUi} from '/src/shared-ui.mjs';
const esc=value=>escapeUi(worldDisplayText(value));
import {createCampaignActionAudio} from '/src/campaign-action-audio.mjs';
import {createPilotAudio} from '/src/pilot-audio.mjs';
import {relation,relationCityOfficers,socialReason,RELATIONS} from '/src/campaign-relations.mjs';
import {renderCouncilWorld,councilPending,councilEscape} from '/app/world/council-world.mjs';
import {openOfficerDraft} from '/app/world/officer-draft-ui.mjs';
import {showClash} from '/app/world/clash-scene.mjs';
import {garrisonReason,sortieReason,sortie,sortieTroopRange} from '/src/campaign-roster.mjs';
import {combatFireAt} from '/src/campaign-rule-registry.mjs';
import supplyRules from '/docs/design-data/supply-v0.1.json' with {type:'json'};
import {hubBuildReason} from '/src/campaign-supply.mjs';
// 흑묵 그래픽 노블 스킨(2026-10-10, 스타일 바이블 v2) — ?skin=v3 으로 이전 겉모습
try{if(new URLSearchParams(location.search).get('skin')!=='v3'){document.body?.classList?.add('ink');
 // 먹 선 흔들림 필터(영토 선 등) — ink-skin.css 의 filter:url(#ink-rough)
 document.body?.insertAdjacentHTML?.('beforeend','<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></svg>');}}catch{}
let achPick=null,visitTalks=null,feastPick=[],feastCity=null,visitScene=null; // C38 친목: 저택 대화 초안(visit-talks)·주점 술자리 고른 장수·열린 대화
// C222: every relationship scene now comes from the persistent engine ledger.
function c216Scene(){const v=view(state);return !combatAnimating&&!v.pendingEvent&&!pendingCampaignDraft(state)&&!pendingChoice(v)&&!state.gameResult?v.relationScene:null;}
function openReserveTransfer(fromCityId,toCityId=null,count=null){
 const v=view(state),from=v.ownCities[fromCityId];if(!from||inputLocked())return;
 const cities=Object.values(v.ownCities).filter(c=>c.cityId!==fromCityId),max=Math.floor(from.reserveTroops/C214.reserveUnit)*C214.reserveUnit;
 const option=c=>{const reason=reserveTransferReason(state,{fromCityId,toCityId:c.cityId,count:C214.reserveUnit});return {...c,reason};},options=cities.map(option);
 const target=options.find(c=>c.cityId===toCityId)??options.find(c=>!c.reason)??options[0];
 const n=Math.min(max,Math.max(C214.reserveUnit,count??C214.reserveUnit)),request={type:'TRANSFER_RESERVES',fromCityId,toCityId:target?.cityId,count:n};
 const reason=target?reserveTransferReason(state,request):'받을 내 성이 없습니다.';
 const route=target&&!reason?citySupplyRoute(state,state.cities[fromCityId],state.cities[target.cityId]):null;
 const turns=route?C214.transferTurns[route.length-1<=C214.transferOneTurnDistance?0:1]:null;
 let root=$('#c216-transfer');if(!root){root=document.createElement('div');root.id='c216-transfer';root.className='modal-backdrop';document.body.appendChild(root);}
 root.innerHTML=`<section class="panel lacquer" role="dialog" aria-modal="true" aria-label="병력 이송"><h2>${esc(from.name)} · 병력 이송</h2><label>받을 성 <select id="c216-transfer-city">${options.map(c=>`<option value="${esc(c.cityId)}" ${c.cityId===target?.cityId?'selected':''} ${c.reason?'disabled':''}>${esc(c.name)}${c.reason?' · '+esc(c.reason):''}</option>`).join('')}</select></label><label>보낼 예비병 <b>${troopText(n)}</b><input id="c216-transfer-count" type="range" min="1000" max="${Math.max(1000,max*TROOP_DISPLAY_SCALE)}" step="1000" value="${n*TROOP_DISPLAY_SCALE}" ${max<C214.reserveUnit?'disabled':''}></label><p role="status">${esc(reason??`${turns}차례 뒤 도착`)}</p><button class="btn primary" data-transfer-send ${reason?'disabled':''} title="${esc(reason??'보내기')}">보내기</button> <button class="btn" data-transfer-close>닫기</button></section>`;
 root.onchange=e=>{if(e.target.matches('select'))openReserveTransfer(fromCityId,$('#c216-transfer-city').value,Number($('#c216-transfer-count').value)/TROOP_DISPLAY_SCALE);};
 root.oninput=e=>{if(e.target.matches('input')){request.count=Number(e.target.value)/TROOP_DISPLAY_SCALE;root.querySelector('label b').textContent=troopText(request.count);const why=target?reserveTransferReason(state,request):reason,button=root.querySelector('[data-transfer-send]');button.disabled=!!why;button.title=why??'보내기';root.querySelector('[role="status"]').textContent=why??`${turns}차례 뒤 도착`;}};
 root.onclick=e=>{if(e.target.closest('[data-transfer-close]'))root.remove();if(e.target.closest('[data-transfer-send]')&&!reserveTransferReason(state,request)){root.remove();command(request);}};
}
function renderC216MapNotes(v){
 const svg=$('#map svg');if(!svg)return;
 const badge=(selector,text,cls)=>{const host=svg.querySelector(selector);if(!host)return;const node=document.createElementNS('http://www.w3.org/2000/svg','text');node.setAttribute('class',cls);node.setAttribute('y','-42');node.setAttribute('text-anchor','middle');node.textContent=text;host.appendChild(node);};
 for(const t of (v.reserveTransfers??[]).filter(t=>t.state!=='ARRIVED'))badge(`.w-cityplate[data-city="${t.toCityId}"]`,`예비병 ${troopText(t.count)} · ${t.state==='BLOCKED'?'막힘':Math.max(0,t.arrivalTurn-v.turn)+'차례'}`,'c216-transfer-note');
 if(dangerMode)for(const id of new Set((v.enemyIntents??[]).filter(i=>v.knowledge.observedArmies[i.armyId]&&v.knowledge.tiles[v.knowledge.observedArmies[i.armyId].tileId]==='VISIBLE').map(i=>i.targetId))){
  if(v.ownArmies[id])badge(`.w-unit[data-unit="${id}"]`,'노림','c216-intent-note');
  else if(v.ownCities[id])badge(`.w-cityplate[data-city="${id}"]`,'노림','c216-intent-note');
 }
}
// The action stays in the hover panel so the adjacent ally is still clickable.
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-reserve-transfer]');if(b){e.preventDefault();e.stopPropagation();openReserveTransfer(b.dataset.reserveTransfer);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#c216-transfer')){e.preventDefault();e.stopImmediatePropagation();$('#c216-transfer').remove();}},true);
let sortieUi=null;
let crisisData=null,crisisSeen=new Set(),bondsData=null,hoverSide=null,dangerMode=infoLens==='danger',lastActedArmy=null,dangerCache=null,memoryLines={},artCatalog=null,portraits={},menuOpen=false,moveMode=false,faceMode=false,destination=null,soundSequence=0,audioGesture=false;
// 엔진 오류 코드를 플레이어 문장으로(코드는 콘솔에만)
const ERROR_TEXT={C26_COMMAND_UNAVAILABLE:'지금은 이 내정 명령을 쓸 수 없습니다.',INVALID_C26_CITY:'우리 성에서만 쓸 수 있습니다.',INVALID_ORDER_UNITS:'이미 움직였거나 행동을 마친 부대에는 이동 명령을 줄 수 없습니다.',INVALID_ORDER_DESTINATION:'갈 수 없는 칸입니다.',INVALID_CAMPAIGN_ATTACK:'지금 공격할 수 없는 대상입니다.',INVALID_CAMPAIGN_CITY_ATTACK:'지금 이 성은 공격할 수 없습니다.',INVALID_CAMPAIGN_FACE:'이동하기 전에만 정면을 돌릴 수 있습니다.',INVALID_MUSTER_OFFICER_OR_TROOP:'출진할 장수와 병종을 확인하세요.',MUSTER_RESERVE_200_REQUIRED:`예비병이 ${troopText(200)}명 이상 있어야 출진할 수 있습니다.`,INVALID_WANDERER_RECRUITMENT:'지금은 등용할 수 없습니다(이미 협의 중이거나 성의 주인이 아님).',INVALID_GARRISON:'적과 붙어 있지 않은 상태로 자기 성 중심에 있어야 주둔할 수 있습니다.',MAIN_ACTION_USED:'이번 턴 행동을 이미 썼습니다.',EVENT_PENDING:'사건 카드를 먼저 정하세요.',UNIQUE_FACILITY_LIMIT:'고유 시설은 도시당 1개입니다.',UNIQUE_FACILITY_LOCKED:'다른 세력의 고유 시설입니다.',NO_DAMAGED_FACILITY:'손상된 시설이 없습니다.',MINOR_CITY_NO_FACILITIES:'작은 성에는 지을 수 없습니다.',STAR_COOLDOWN:'재사용 대기 중입니다.',STAR_UNAVAILABLE:'패주 중이라 쓸 수 없습니다.',STAR_OCCUPIED:'점령 처리 중인 성입니다.'};
const reasonText=code=>code?(/^MUSTER_RESERVE_(\d+)_REQUIRED$/.test(code)?`예비병 ${troopText(Number(code.match(/\d+/)[0]))}명 이상 필요`:/[가-힣]/.test(code)?code:ERROR_TEXT[code]??'조건 미충족'):'';
// engineer · mystic: 옛 초기 자료(조조 · 순욱 · 제갈량 · 주유)에 남은 이름 — 병종은 넷뿐이고 엔진에서는 각각 근접보병 · 원거리보병으로 돈다. 영문이 그대로 보이지 않게 그 이름으로 읽는다(닷토리 새 판 13회차 'engineer 영문')
const troopName=type=>troopInfo(state,({engineer:state?.mapId==='v1'?'militia':'engineer',mystic:'bow',BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'})[type]??type).troopDisplayName;
const statLine=o=>o?.baseStats?`지휘 ${o.baseStats.leadership} · 무용 ${o.baseStats.might} · 지략 ${o.baseStats.intelligence}`:'';
ERROR_TEXT.INVALID_CAMPAIGN_TACTIC='닿지 않습니다 — 더 다가가야 합니다';
ERROR_TEXT.INVALID_CAMPAIGN_CITY_ATTACK='수비대가 성을 지키고 있습니다 — 먼저 수비대를 물리쳐야 합니다';
const errorText=e=>readableError(e,ERROR_TEXT);
const OFFICER_LABELS=Object.fromEntries(UNIQUE_OFFICERS.map(o=>[o.id,o.name]));
const RULE_LABELS=Object.fromEntries(UNIQUE_OFFICERS.flatMap(o=>[o.uniqueTrait,o.signatureTactic].filter(Boolean).flatMap(c=>(c.effects??[]).filter(e=>e.rule).map(e=>[e.rule,abilityName356(c)]))));
const playerText=value=>worldDisplayText(readableText(value,OFFICER_LABELS,RULE_LABELS));
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
 const cost=cityRecruitCost(state,cityId,state.playerFactionId,officerId),available=(state.factions[state.playerFactionId].prestige??0)-(state.captiveRecruitment?.factions[state.playerFactionId]?.reservedPrestige??0);
 return available<cost?errorText(`INSUFFICIENT_RECRUITMENT_PRESTIGE:${state.playerFactionId}:required=${cost}:available=${available}`):'';
}
function cardDescription(c,id,shownState=state){
 const r=shownState.campaignGrowth.officers[id],base=r.cards[c.traitId]??c;
 if(c.kind==='awakening')return playerText(c.text||'이 특기의 수치가 한 단계 오른다');
 const extra=[];
 for(const e of base.effects??[])if(e.rule?.startsWith('U_'))for(const [key,value] of Object.entries(e.params??{}))if(Number.isFinite(value)&&!['range','turns','uses','cost','at','threshold'].includes(key))extra.push({op:'DISPLAY_VALUE',value});
 const factor=c29CoreFactor(shownState,id);
 const description=abilityGloss356(c)+' — '+playerText(cardNumericText({...c,effects:[...(c.effects??[]),...extra.map(e=>({...e,value:e.value*factor}))]}, {...base,effects:[...(base.effects??[]),...extra]},strengthenedValue));
 return r.c29?description.replace(/재사용 대기(?:시간)? 초기화|대기 초기화/g,'게이지 +20').replace(/전법 하나의 재사용 대기 \+1/g,'전법 게이지 −10').replace(/재사용 대기(?:시간)?\s*([+−-])\s*(\d+)/g,(_,sign,n)=>`게이지 비용 ${sign}${Number(n)*10}`).replace(/재사용 대기(?:시간)?/g,'게이지 비용'):description;
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
 const text=c.rank?levelupUpgradeText(c,card=>cardDescription(c29CoreCard(state,id,card),id)):cardDescription(c29CoreCard(state,id,{...c,rank:1}),id);
 return text+(cardEffectPending(c)?' · 효과 준비 중':'');
}
const FORMATION_NAME={DISORDERED:'흐트러짐',BROKEN:'붕괴'};
// C138: use registered combat pools, not names/class tags. Mixed unique rules stay unlabelled.
const GROWTH_COMBAT_RULES=[...CAMPAIGN_RULES,...COMBAT_TITLE_RULES,...C33_POOL.traits.flatMap(c=>(c.effects??[]).map(e=>e.rule).filter(Boolean)),
 'U_FEARLESS','U_SLEEPING_DRAGON','U_BENEVOLENCE','U_HERO_OF_CHAOS','U_LITTLE_CONQUEROR','U_AWE','U_FIRE_GOD','U_OLD_VIGOR','U_MARTIAL_SAINT','U_ROAR','U_BODYGUARD','U_LINKED_CAMPS','U_BELL_SOUND','U_DIVINE_ARCHER','U_FIERCE_PRIDE','U_IRON_CITADEL']; // uniqueOps + army-only combat/start hooks
const GROWTH_DOMESTIC_RULES=[...DOMESTIC_RULES,'U_KINGS_AIDE']; // uniqueProgress + uniqueRevealedWanderers
const SUB_AXES={지휘:['전열 유지','기동','전환','수습'],무용:['힘','기술','막아내기','되받기'],지략:['군재','응변','속이기','통찰'],정무:['행정','병참','인사','제도','민정'],감화:['설득','포섭','결집','중재']};
const COMBAT_SUBS=new Set(['전열 유지','전환','수습','힘','기술','막아내기','되받기','결집']);

const actionAudio=createCampaignActionAudio(),settlementAudio={unlock(){worldSfx.unlock();},play(id){worldSfx.once('settlement',id);}};
const combatAudio=createCampaignCombatAudio();
let pilotAudio=createPilotAudio();

// 효과음(소리 파일) — 창 여닫이 · 단추는 스스로 듣고, 명령의 결과는 command() 가 알려 준다(2026-10-13). 배경 음악처럼 따로 불러온다: 서버를 다시 띄우기 전(sfx.mjs 를 아직 못 주는 서버)에도 화면은 그대로 뜨고 효과음만 빠진다
let worldSfx={once(){},command(){},play(){return false;},unlock(){},attach(){},startLoop(){return false;},stopLoop(){},refresh(){},dispose(){},ready:0};
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
let officerVoiceData=null;
const loadOfficerVoice=createOfficerVoiceLoader();
loadOfficerVoice().then(data=>{officerVoiceData=data;if(state&&selectedOfficerId)renderOfficerCard();});
// C260: transient UI only; committed public combat records supply the text.
let c260ResultUntil=0,c260ResultTimer=null,c260PendingResult=null;
function dismissCombatResult(){document.querySelector?.('#c292-result-dock')?.remove?.();delete document.body.dataset.c260Result;c260ResultUntil=0;clearTimeout(c260ResultTimer);document.querySelector('#c260-result')?.remove();}
function showCombatResult(c,units){
 dismissCombatResult();document.querySelector('#c266-progress')?.remove();
 const text=c.uiSelfTactic?`${abilityName356({name:c.tacticName})} · ${c.uiTacticEffect}`:combatResultText(c,units);if(!text)return;
 if(typeof reactGuideCombat426==='function')reactGuideCombat426(c,units);
 const line=document.createElement('p');line.id='c260-result';line.setAttribute('role','status');line.textContent=text;document.body.append(line);
 if(c.uiSelfTactic)line.className='c424-self-tactic';
 const actor=units.find(u=>u.id===c.attackerId);
 if(actor?.portrait&&line.prepend){const img=document.createElement('img');img.src=actor.portrait;img.alt=actor.name;img.className='c266-result-face';line.prepend(img);line.title=text;line.style.pointerEvents='auto';line.onclick=()=>follow(c.attackerId,true);}
 if(!c.uiNotice&&(c.captureLine||c.eliminatedIds?.length||c.uiFates?.length||officerMomentVoice(c,units,officerVoiceData)?.kind==='rout')&&document.documentElement.dataset.ui==='kit'&&fxPreferences.value.cutin!=='off')showC266Moment(c,actor,text,units);
 if(!c.uiSelfTactic&&document.documentElement.dataset.ui==='kit'&&document.querySelector?.('#ink-hud')?.insertAdjacentHTML){document.querySelector('#c266-progress')?.remove();document.querySelector('#c292-result-dock')?.remove();const cityId=c.cityId??(state.cities[c.targetId]?c.targetId:null),v=view(state),uiCity=v.ownCities[cityId]??v.knowledge.cities[cityId];document.querySelector('#ink-hud').insertAdjacentHTML('beforeend',`<div id="c292-result-dock">${battleResultDock292({...c,uiCity},units)}</div>`);}
 const kitResult=!!document.querySelector?.('#c292-result-dock')?.querySelector,major=!!c.captureLine||!!c.uiFates?.length||!!c.eliminatedIds?.length||!!c.moraleChanges?.length||!!c.formationChanges?.length;const resultMs=kitResult?(major?3200:1800):C260_COMBAT.resultMs;
 document.body.dataset.c260Result='true';c260ResultUntil=performance.now()+resultMs;
 c260ResultTimer=setTimeout(()=>{dismissCombatResult();inkCards?.tick();},resultMs);
}
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(c260ResultUntil){dismissCombatResult();inkCards?.tick();}},true);
// C254: generated, route-independent card module is installed by world.html.
let c254TurnStart=null;
const c261RuleTriggers=new Map();
let openingTicket486=0;
async function finishOpening486(ready,ticket){
 await ready;
 // load() resolves after decoding/fonts/minimum hold; its existing click handler
 // owns cleanup and input release. Never dismiss a newer run's loading screen.
 if(ticket===openingTicket486)$('#c254-loading.ready')?.click();
}
const inkCards=globalThis.__c254Module?.createInkCards({
 definitions:globalThis.__c254Module.ruleCardDefinitions(C12,C182),loadingLines:globalThis.__c254LoadingLines,
 onLocate:tileId=>{panToTile(tileId);if(document.documentElement?.dataset.ui==='kit'){const marker=$('#map')?.querySelector(`[data-tile="${tileId}"]`);if(marker){marker.classList.add('c261-trigger');if(reduceMotion())marker.style.animation='none';setTimeout(()=>{marker.classList.remove('c261-trigger');marker.style.animation='';},1000);}}},
 canShow:()=>performance.now()>=c260ResultUntil&&!!state&&state.phase==='PLAYER'&&!state.gameResult&&!selectedTacticId&&!combatAnimating&&!cameraMoving&&!motionRemaining()&&!state.orderQueue?.length&&!pendingCampaignDraft(state)&&!c216Scene()&&!view(state).pendingEvent&&!view(state).relationScene&&!pendingChoice(view(state))&&!document.querySelector('.w-modal:not([hidden]),.modal-backdrop:not([hidden]),#c205-choice:not([hidden]),#c211-blessing:not([hidden]),#tactic-cutin:not([hidden])')&&!(document.documentElement?.dataset.ui==='kit'&&document.querySelector('.c273-ritual')),
 onClose:closed=>{if(state){render();scheduleOrders();scheduleAi();const id=c261RuleTriggers.get(closed?.rule);if(id){const el=$('#map').querySelector(`[data-tile="${id}"]`);if(el){el.classList.add('c261-trigger');if(new URLSearchParams(location.search).get('fx')==='0'||reduceMotion())el.style.animation='none';setTimeout(()=>{el.classList.remove('c261-trigger');el.style.animation='';},1000);}}}},
});
mountReportPresentation297();
let c207Info=null,c207Tracker=null,c207BarkTimer=null,c207BarkActive=null;
let selectedArmyId=null,selectedArmyIds=[],orderTimer=null;
let selectedCityId=null,cityTab=null,officeTab='jobs'; // 도시 패널 탭(개요·생산·인물) — 문명7 도시 창 탭 + 카드 격자 배치
let aiTimer=null;
let selectedTacticId=null,selectedOfficerId=null,traitChoice=null;
let tacticForecast=null; // The preview owns the exact request; selection changes cannot rewrite it.
let attackMode=false,combatAnimating=false,zoom=1,losses={},combatTimers=[],mapMargin=0;
let turnLog=[];
let recordNotices=[],newsArchive=[],currentNews=[],allNews=[],overlapPick=null; // C137: UI history only
// 끝난 판의 차례 표기: 결과가 정해질 때 엔진의 차례는 이미 다음으로 넘어가 있다(26차례에 멸망했는데 27턴으로 보였다 — 닷토리 B15). 끝난 판은 '마친 차례'를 보여 준다
const endedTurn=t=>state?.gameResult?Math.max(1,Math.min(t-1,CAMPAIGN_TURN_LIMIT)):t;
let recentCombats=[],lastFoodChange=null,lastUnitResult=null,lastFacilityResults=[]; // 이번 접속의 관측 결과만. 새 판/불러오기에서 초기화.
// C341: 1920px mockup walls: Yijing ~240px, Nanpi ~330px (art at 0.64).
// Label sizing remains owned by C289; only the camera changes.
const START_ZOOM=new URLSearchParams(location.search).get('hud')==='old'?1.7:2.3;
function cameraZoomKey(){return `sangoku.camera-zoom.v1:${state.scenarioId}:${state.campaignSeed}:${state.playerFactionId}`;}
function playerCameraZoom(reset=false){
 try{
  const key=cameraZoomKey();
  if(reset){localStorage.removeItem(key);return START_ZOOM;}
  const value=Number(localStorage.getItem(key));
  if(Number.isFinite(value)&&value>=.5&&value<=2.6)return value;
 }catch{}
 return START_ZOOM;
}
function rememberCameraZoom(value){try{localStorage.setItem(cameraZoomKey(),String(value));}catch{}}
// 지도 위 움직임(렌더러 모델로 넘김): 행군 경로·공격 동작·바라보는 쪽·전투 효과. elapsed 로 다시 그려도 이어진다.
let motions={},attackAnims={},facings={},fxList=[],motionSeq=0,redrawTimer=null;
const factionName=id=>({F01:"조조군",F02:"유비군",F03:"손권군"}[id]??id);
let cameraMoving=false,cameraTimer=null;
function inputLocked(){return (typeof c273Ritual!=='undefined'&&c273Ritual?.busy())||!!document.querySelector('.c261-settings:not([hidden]),#rules-modal:not([hidden])')||(typeof inkCards!=='undefined'&&inkCards?.busy())||$('#c212-rewind-confirm')?.hidden===false||$('#c211-blessing')?.hidden===false||$('#c205-choice')?.hidden===false||$('#c197-event-result')?.hidden===false||!$('#save-confirm')?.hidden||$('#attack-confirm')?.hidden===false||cameraMoving||(state?.orderQueue?.length>0)||combatAnimating||state?.phase==='AI'||!!(state&&pendingCampaignDraft(state))||!!(state&&c216Scene());}
function scheduleOrders(){
 clearTimeout(orderTimer);if(state&&c216Scene())return;
 if(!state?.gameResult&&state?.phase==='PLAYER'&&queuedOrderUnit(state)&&!combatAnimating&&!pendingCampaignDraft(state))orderTimer=setTimeout(()=>command({type:'ADVANCE_ORDER'}),Math.max(10,motionRemaining()+60));
}
function scheduleAi(){
 scheduleOrders();scheduleStrike();
 clearTimeout(aiTimer);if(state&&c216Scene())return;
 // The result remains readable in its dock/log while the next enemy acts.
 // Its 1.8/3.2s display lifetime must not become another AI simulation wait.
 if(state?.phase!=='AI'&&document.documentElement?.dataset.ui==='kit'&&c260ResultUntil>performance.now()){aiTimer=setTimeout(scheduleAi,c260ResultUntil-performance.now()+16);return;}
 if(state&&!state.gameResult&&state.phase==='AI'&&!combatAnimating)aiTimer=setTimeout(()=>command({type:'ADVANCE_AI'}),typeof aiMapFrame486==='undefined'&&motionRemaining()>0?motionRemaining()+aiPresentationMs(60):0);
}
// C486: measure the current camera before command feedback writes to the DOM.
// Tile boxes share one SVG matrix and viewport read for this command.
let aiScreen486=null,aiMotionBudget486=1200;
function readAiScreen486(){
 const svg=$('#map svg'),port=$('.viewport'),matrix=svg?.getScreenCTM?.(),bounds=port?.getBoundingClientRect?.(),tiles=new Map();
 return tileId=>{
  if(tiles.has(tileId))return tiles.get(tileId);
  const node=svg?.querySelector?.(`.w-hits [data-tile="${tileId}"]`),box=node?.getBBox?.();
  // Missing geometry must not hide a potentially visible action.
  if(!matrix||!bounds||!box)return true;
  const points=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y])=>({x:matrix.a*x+matrix.c*y+matrix.e,y:matrix.b*x+matrix.d*y+matrix.f}));
  const visible=Math.max(...points.map(p=>p.x))>=bounds.left&&Math.min(...points.map(p=>p.x))<=bounds.right&&Math.max(...points.map(p=>p.y))>=bounds.top&&Math.min(...points.map(p=>p.y))<=bounds.bottom;
  tiles.set(tileId,visible);return visible;
 };
}
function presentAiCombat486(before,after,c){
 if(!combatVisible(before,after,c))return false;
 if(before.phase!=='AI'||!aiScreen486)return true;
 if([c.attackerId,c.targetId].some(id=>before.armies[id]?.factionId===after.playerFactionId)||[c.cityId,c.targetId].some(id=>before.cities[id]?.ownerFactionId===after.playerFactionId))return true;
 return [before.armies[c.attackerId]?.tileId,before.armies[c.targetId]?.tileId,before.cities[c.cityId??c.targetId]?.tileId,c.fromTileId].filter(Boolean).some(aiScreen486);
}
function paintAiStep486(movers,attention=false){
 // Quiet enemy steps retain all feedback/records; only the latest state is painted.
 // A turn boundary or combat uses render() directly and always flushes immediately.
 if(state.phase==='AI'&&!state.gameResult&&!attention){if(movers.length&&typeof queueAiMap486==='function')queueAiMap486();return;}
 render();
}
// 안개 속 전투(내 세력이 양쪽 칸 모두 못 보는 AI끼리 싸움)는 연출·화면 이동·기록 없이 넘긴다 — 숨은 정보가 새지 않게
function armyVisible(s,id){const a=s.armies[id];return !!a&&(a.factionId===s.playerFactionId||s.knowledge?.[s.playerFactionId]?.tiles?.[a.tileId]==='VISIBLE');}
function combatVisible(before,after,c){
 const f=after.playerFactionId,seen=(s,tile)=>tile&&s.knowledge?.[f]?.tiles?.[tile]==='VISIBLE';
 const tiles=[before.armies[c.attackerId]?.tileId,before.armies[c.targetId]?.tileId,c.fromTileId,before.cities?.[c.cityId]?.tileId].filter(Boolean);
 return [c.attackerId,c.targetId].some(id=>before.armies[id]?.factionId===f)||tiles.some(t=>seen(before,t)||seen(after,t));
}
let aiMapFrame486=null;
function queueAiMap486(){
 if(aiMapFrame486!==null)return;
 aiMapFrame486=requestAnimationFrame(()=>{
  aiMapFrame486=null;
  // The latest committed state owns this frame, never a queued intermediate state.
  if(state?.phase==='AI'&&!combatAnimating)drawMap(view(state));
 });
}
// 확정 연출(정본 §24): 되돌리기 어려운 군사 명령 = 호부(虎符) 두 쪽이 맞물림 0.2초, 차례 확정 = 주사 인장
function commitFx(kind){
 const host=document.querySelector?.('#w-fx');if(!host?.animate&&!host?.classList)return;
 const L=v3Asset('ui/tally-left.png'),R=v3Asset('ui/tally-right.png'),S=v3Asset('ui/seal-2.png');
 if(kind==='tally'&&L&&R){host.innerHTML=`<div class="fx-tally"><img class="l" src="${L}" alt=""><img class="r" src="${R}" alt=""></div>`;}
 else if(kind==='seal'&&S){host.innerHTML=`<div class="fx-seal"><img src="${S}" alt=""></div>`;}
 else return;
 worldSfx.play('select');host.hidden=false;host.classList?.remove('go');void host.offsetWidth;host.classList?.add('go');clearTimeout(commitFx.t);commitFx.t=setTimeout(()=>{host.hidden=true;host.innerHTML='';},document.documentElement.dataset.ui==='kit'?400:kind==='tally'?900:800);
}
// 실행 = 인장: 공격 · 전법을 내리면 아래 군령 띠에 주사 인장이 찍힌다(모양은 hud-ink.css 의 .nb-band.stamp). 움직임 줄이기 설정이면 건너뛴다
// C159: presentation state stays outside campaign state and saves.
let tacticReadySeen=new Map(), tacticReadyPending=new Set(), tacticCutSeen=new Set();
function inkToast(text,{kind='decision',duration=4000}={}){
 const host=document.querySelector('#ink-toasts');if(!host)return;
 const row=document.createElement('div');row.className='ink-toast';row.dataset.kind=kind;const parts=String(text).split(/ · | — /);row.innerHTML=`<b>${esc(parts.shift())}</b>${parts.length?`<span>${esc(parts.join(' · '))}</span>`:''}`;
 if(document.documentElement.dataset.ui==='kit')host.replaceChildren();host.append(row);while(host.children.length>2)host.firstElementChild.remove();setTimeout(()=>row.remove(),duration);
}
// Show the new capital after opening choices, when the map can actually be seen.
let startCityNoticeSequence=0;
function announceStartCity(){
 const sequence=++startCityNoticeSequence,seed=state.campaignSeed,fid=state.playerFactionId;
 const show=()=>{
  if(sequence!==startCityNoticeSequence||!state||state.campaignSeed!==seed||state.playerFactionId!==fid||state.turn!==1)return;
  if(document.querySelector('#c205-choice:not([hidden]),#c211-blessing:not([hidden]),.w-modal:not([hidden]),.modal-backdrop:not([hidden])')||inkCards?.busy()||(typeof c273Ritual!=='undefined'&&c273Ritual?.busy())){setTimeout(show,200);return;}
  const v=view(state),capital=v.ownCities[v.faction.capitalCityId];
  centerPlayer();inkToast(`이번 판 시작: ${capital?.name??v.faction.capitalCityId}`);showGuideFirst('greet.first');
 };
 setTimeout(show,200);
}
function dismissTransientUi(){
 clearTimeout(dejaVuTimer);clearTimeout(dejaVuRetry);dejaVuRetry=null;dejaVuQueue=[];
 const echo=$('#dejavu');if(echo)echo.hidden=true;
 document.querySelector('#ink-toasts')?.replaceChildren();
}
new MutationObserver(records=>{
 if(records.some(r=>r.target instanceof HTMLElement&&!r.target.hidden&&r.target.matches('.w-modal,.modal-backdrop,#city-stage,#sortie-screen,#c226-stratagem')))dismissTransientUi();
}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
function cityCommitSeal(cityId,kind){
 if(reduceMotion())return;
 // Claude 10-15: 성 화면(관청 · 빠른 생산 창)에서 고르면 지도 위 성 자리가 아니라 고른 줄에 찍는다 — 지도 자리는 성 화면에 가려 엉뚱한 곳(태수 그림 위)에 찍혔다
 const job=kind&&[...document.querySelectorAll(`[data-city-job="${kind}"],[data-quick-job="${kind}"]`)].find(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight;});
 const node=job??document.querySelector(`#map .w-cityplate[data-city="${cityId}"]`);if(!node)return;
 const r=node.getBoundingClientRect(),label=job?null:(node.querySelector('.plate-art')??node.querySelector('.name'))?.getBoundingClientRect(),seal=document.createElement('img'),size=job?Math.max(64,r.height*1.15):Math.max(88,(label?.height||r.height)*1.5);seal.className='ink-city-seal';seal.src='/assets/ui-v3/ui/seal-2.png';seal.alt='';seal.style.width=seal.style.height=size+'px';seal.style.left=(job?r.right-size*.75:r.left+r.width/2)+'px';seal.style.top=(r.top+r.height/2)+'px';document.body.append(seal);setTimeout(()=>seal.remove(),800);
}
function decisionFeedback(request,before,after){
 const c=after.cities[request.cityId],a=before.armies[request.armyId],name=id=>after.officers[id]?.name??before.officers[id]?.name??'장수';
 if(request.type==='CITY_JOB'){
  inkToast(`${c.name} · 생산 — ${CITY_JOBS[request.kind]?.name??request.kind}`);requestAnimationFrame(()=>cityCommitSeal(request.cityId,request.kind));
 }else if(request.type==='SORTIE'){
  const unit=Object.values(after.armies).find(a=>!before.armies[a.armyId]&&a.commanderId===request.officerId);
  inkToast(`${name(request.officerId)} · ${troopName(unit.troopType)} ${troopText(unit.troopCount)}명 출진`);
  requestAnimationFrame(()=>cityCommitSeal(request.cityId));
 }else if(request.type==='CITY_GOVERNOR')inkToast(`${c.name} · 태수 — ${request.officerId?name(request.officerId):'공석'}`);
 else if(request.type==='GARRISON')inkToast(garrisonResult(view(before),view(after),request.armyId)||`${name(a?.commanderId)} · 복귀 완료`);
 else if(request.type==='RECALL_UNIT')inkToast(`${name(a?.commanderId)} · 귀환 완료`);
 else if(request.type==='DISENGAGE')inkToast(after.lastDisengage?.text??'이탈 사격');
 else if(request.type==='EQUIP_TRAITS')inkToast(`${name(request.officerId)} · 특기 장착 변경`);
 else if(request.type==='TACTIC_LOADOUT')inkToast(`${name(request.officerId)} · 전법 ${request.equip?'장착':'해제'}`);
}
function tacticButtonState(card,armyId){
 if(card.slot)return `data-cooldown="0" data-cost="${card.gaugeCost}" data-gauge="${card.gauge}" class="tactic-face${card.canUse?'':' cooling'}"`;
 const a=state.armies[armyId],cooldown=Math.max(0,(a?.tacticReadyTurns?.[card.traitId]??0)-state.turn),gauge=card.signature?Math.min(100,state.campaignGrowth?.officers?.[a?.commanderId]?.c29?.gauge??0):null;
 return `data-cooldown="${cooldown}"${gauge===null?'':` data-gauge="${gauge}"`} class="tactic-face${card.waiting?' cooling':''}"${gauge===null?'':` style="--tactic-gauge:${gauge}%"`}`;
}
function updateTacticReady(model){
 const live=new Set();
 for(const u of model.units){if(u.enemy)continue;const cards=campaignTactics(state,u.id);u.tacticReady=cards.some(c=>c.canUse);u.tacticNew=false;
  if(state.phase!=='PLAYER')continue;
  for(const c of cards){const key=u.id+':'+c.traitId,ready=c.waiting===0&&!!c.effects?.length;live.add(key);const was=tacticReadySeen.get(key);
   if(state.phase==='PLAYER'&&ready&&was===false)tacticReadyPending.add(key);if(!ready)tacticReadyPending.delete(key);tacticReadySeen.set(key,ready);
   if(tacticReadyPending.has(key)){u.tacticNew=true;if(selectedArmyId===u.id&&menuOpen){requestAnimationFrame(()=>{for(const b of document.querySelectorAll(`[data-tactic="${c.traitId}"]`)){b.classList.add('tactic-ready-flash');setTimeout(()=>b.classList.remove('tactic-ready-flash'),600);}worldSfx.play('brush');});tacticReadyPending.delete(key);}}
  }
 }
 for(const key of tacticReadySeen.keys())if(state.phase==='PLAYER'&&!live.has(key)){tacticReadySeen.delete(key);tacticReadyPending.delete(key);}
}
function showTacticCutIn(officerId,tacticName,factionId,onDone=()=>{},tacticKey=tacticName,kind='R',targetRect=null){
 const host=document.querySelector('#tactic-cutin');if(!host){onDone();return;}
 const ai=factionId!==state.playerFactionId,repeated=tacticCutSeen.has(officerId);
 const timing=cutinTiming444({kind,repeated,ai,speed:fxPreferences.value.aiSpeed,reduced:reduceMotion(),off:fxPreferences.value.cutin==='off'});
 if(!timing.total||!shouldShowTacticCutin(fxPreferences.value.cutin,tacticCutSeen,tacticKey)){onDone();return;}
 tacticCutSeen.add(officerId);const art=fullArt(officerId)?.src??faceOf(officerId);
 playCutin444(host,{officerId,kind,timing,art,head:headOf(art),title:abilityName356({name:tacticName}),identity:[view(state).officers[officerId]?.name??officerId,factionName(factionId)].filter(Boolean).join(' \u00b7 '),factionId,targetRect},onDone);
}
function impactFeedback({from,to,loss=0,charge=false,counter=false,kind='clash',label='',silent=false}){
 if(kind==='tactic'&&typeof fxInk!=='undefined'&&fxInk)return; // C177 plays one shared impact for all affected tiles.
 if(!silent&&kind!=='tactic')worldSfx.play(counter?'counter':kind==='volley'?'arrows':kind==='siege'?'siege':charge?'charge':'clash',{gain:1});
 fxList.push({kind,from,to,label,start:performance.now(),duration:700});
 if(reduceMotion())return;
 troopLayer?.freeze(charge?110:70);
 const map=document.querySelector('#map'),a=document.querySelector(`#map .w-hits [data-tile="${from}"]`),b=document.querySelector(`#map .w-hits [data-tile="${to}"]`),ar=a?.getBoundingClientRect(),br=b?.getBoundingClientRect();
 const dx=(br?.left??1)-(ar?.left??0),dy=(br?.top??0)-(ar?.top??0),d=Math.hypot(dx,dy)||1,k=Math.min(8,3+loss/100)*(counter?.5:1);
 if(!fxPreferences.shake())return;
 map?.animate?.([{translate:'0px 0px'},{translate:`${dx/d*k}px ${dy/d*k}px`},{translate:`${-dx/d*k*.5}px ${-dy/d*k*.5}px`},{translate:'0px 0px'}],{duration:180,easing:'ease-out'});
}
function bandStamp(){const b=globalThis.document?.querySelector?.('body.hud-band .nb-band');if(!b||reduceMotion())return;b.classList.remove('stamp');void b.offsetWidth;b.classList.add('stamp');setTimeout(()=>b.classList.remove('stamp'),document.documentElement.dataset.ui==='kit'?400:640);}
let moveUndo=null,queuedUndoStart=null,rivalTurnBaseline=null,turnSummaryPending=null,inspectedArmyId=null;
function trackBatchCommand(before,after,request){
 const bv=view(before),av=view(after);
 const c261Combats=(after.combatLog??[]).filter(c=>c.sequence>(before.battleSequence??0));
 const c261Rules=globalThis.__c254Module?.ruleCandidates(bv,av,c261Combats)??[];
 // Preview markup must stay side-effect free: a modal here would destroy the
 // hover-owned tactic decision on close. Teach fire after a public own combat.
 if(c261Combats.some(c=>c.fire&&(bv.ownArmies[c.attackerId]||av.ownArmies[c.attackerId])))c261Rules.push('fire');
 for(const id of c261Rules){const own=Object.entries(av.ownArmies??{}).find(([aid,a])=>id==='supply'&&a.supply?.draining&&!bv.ownArmies?.[aid]?.supply?.draining)?.[1],c=c261Combats.find(c=>globalThis.__c254Module.ruleCandidates(bv,av,[c]).includes(id));const tile=own?.tileId??av.ownArmies?.[c?.attackerId]?.tileId??av.knowledge?.observedArmies?.[c?.attackerId]?.tileId??av.ownArmies?.[c?.targetId]?.tileId;if(tile)c261RuleTriggers.set(id,tile);}
 inkCards?.offer(c261Rules);
 if(request.type==='QUEUE_MOVE'&&request.armyIds?.length===1)queuedUndoStart={before,armyId:request.armyIds[0]};
 else if(request.type!=='ADVANCE_ORDER')queuedUndoStart=null;
 const queued=request.type==='ADVANCE_ORDER'?queuedUndoStart:null;
 const moveRequest=queued?{type:'MOVE_UNIT',armyId:queued.armyId}:request,start=queued?.before??before;
 moveUndo=moveRequest.type==='MOVE_UNIT'?{before:start,after,armyId:moveRequest.armyId,reason:movementUndoReason(start,after,moveRequest,view(start),av)}:null;
 if(queued&&!after.orderQueue?.length)queuedUndoStart=null;
 if(before.turn!==after.turn||before.phase!==after.phase)dismissTransientUi();
 if(before.phase==='PLAYER'&&after.phase==='AI')rivalTurnBaseline=before;
 if(rivalTurnBaseline&&after.phase==='PLAYER'&&!after.gameResult){
  const base=rivalTurnBaseline;
  const records=(after.administrationLog??[]).slice((base.administrationLog??[]).length).filter(e=>!e.factionId||e.factionId===av.factionId);
  const names=Object.fromEntries([...campaignMapModel(view(base)).units,...campaignMapModel(av).units].map(a=>[a.id,a.name]));
  const rows=playerTurnSummary(view(base),av,records,(after.combatLog??[]).filter(e=>e.sequence>(base.battleSequence??0)),names,true);
  const oathRows=(av.oaths??[]).filter(o=>o.resolvedTurn>=base.turn&&['SUCCESS','FAILED'].includes(o.status)).map(o=>`맹세 ${o.status==='SUCCESS'?'성공':'실패'} — ${o.title}: ${o.result?.text??''}`);rows.unshift(...oathRows.filter(row=>!rows.some(r=>(typeof r==='string'?r:r.text)===row)));
  rows.push(...reserveTransferLines(av),...publicWorldNews(view(base),av));
  const opening=c254TurnStart??base,openingView=view(opening);
  const reportRows=[...rows];
  for(const e of (after.administrationLog??[]).slice((opening.administrationLog??[]).length).filter(e=>!e.factionId||e.factionId===av.factionId))if(e.text&&!reportRows.some(r=>(typeof r==='string'?r:r.text).includes(e.text)))reportRows.push({text:e.text,cityId:e.cityId});
  for(const line of facilityCompletionLines(openingView,av,Object.fromEntries(Object.entries(CITY_JOBS).map(([k,j])=>[k,j.name]))))if(!reportRows.some(r=>(typeof r==='string'?r:r.text).includes(line.text??line)))reportRows.push(typeof line==='string'?{text:line}:line);
  for(const [id,o] of Object.entries(av.officers??{})){
   const old=openingView.officers?.[id],mine=o.allegianceFactionId===av.factionId,was=old?.allegianceFactionId===av.factionId;
   if(mine&&!was)reportRows.push({text:`${o.name} 합류 · 우리 세력의 장수가 되었습니다.`});
   else if(was&&(!mine||o.lifeState==='DEAD'&&old.lifeState!=='DEAD'||o.captivityState==='PRISONER'&&old.captivityState!=='PRISONER'||o.injury&&!old.injury))reportRows.push({text:`${o.name} ${!mine?'이탈':o.lifeState==='DEAD'?'전사':o.captivityState==='PRISONER'?'포로':'중상'} · 장수의 상태가 바뀌었습니다.`});
  }
  for(const f of av.diplomacy?.factions??[]){const old=openingView.diplomacy?.factions?.find(x=>x.factionId===f.factionId);if(old&&old.state!==f.state&&['TRUCE','ALLIANCE'].includes(f.state))reportRows.push({text:`${f.name} 조약 · ${f.state==='ALLIANCE'?'동맹을 맺었습니다.':'휴전이 발효됐습니다.'}`});}
  for(const e of av.diplomacy?.incoming??[])if(!(openingView.diplomacy?.incoming??[]).some(x=>JSON.stringify(x)===JSON.stringify(e)))reportRows.push({text:`외교 사신 · ${e.text??e.label??'새 외교 제안이 도착했습니다.'}`});
  const remaining=inkCards?.reports(openingView,av,reportRows,rows)??rows;
  turnSummaryPending=remaining.length?remaining:null;c254TurnStart=after;rivalTurnBaseline=null;
  if(!rows.length)inkToast(`${av.turn}차례 — 별일 없음`,{kind:'quiet-turn',duration:1200});
 }
}
function undoMovement(){
 if(!moveUndo||moveUndo.reason||moveUndo.after!==state||inputLocked())return;
 clearTimeout(orderTimer);clearTimeout(aiTimer);cancelStrike();
 const {before,armyId}=moveUndo;state=before;moveUndo=null;dangerCache=null;overlapPick=null;
 motions={};selectedArmyId=armyId;selectedArmyIds=[armyId];menuOpen=true;moveMode=true;destination=null;
 render();follow(armyId,true);$('#status').textContent='이동을 무르었습니다';
}
function renderBatchUi(v){
 const rail=document.querySelector('#ink-hud .c236-map-switches')??$('#mode-rail');if(!rail)return;
 if(!$('#c186-danger')){
  rail.insertAdjacentHTML('beforeend','<button id="c186-danger" type="button">위험</button><button id="c186-undo" type="button">무르기 · Z</button><small id="c186-undo-reason"></small><p id="c186-map-guide"></p><div id="c186-capture-links"></div>');
  $('#c186-danger').onclick=toggleDangerLens;$('#c186-undo').onclick=undoMovement;
 }
 const undoHost=document.querySelector('#ink-hud .c236-undo');if(undoHost)for(const id of ['c186-undo','c186-undo-reason'])undoHost.append($('#'+id));
 const danger=$('#c186-danger');danger.setAttribute('aria-pressed',String(dangerMode));danger.textContent=`위험 ${dangerMode?'켬':'끔'}`;danger.title=Array.isArray(v.enemyIntents)?'보이는 적의 이동·공격 가능 범위 · 점선은 공개된 적의 노림':'보이는 적의 이동·공격 가능 범위 · 점선은 공격 가능한 내 대상 (실제 AI 계획 아님)';
 const why=moveUndo?.after===state?moveUndo.reason:'무를 이동 없음',undo=$('#c186-undo');undo.disabled=!!why||inputLocked();undo.title=why||'방금 이동한 부대를 이동 전 상태로';$('#c186-undo-reason').textContent=moveUndo?.after===state&&why?why:'';
 const trace=v3Mode()==='trace';$('#c186-map-guide').hidden=!trace;$('#c186-map-guide').innerHTML='탐험 보기 · 흔적을 살피기 쉽게 부대·성 표식은 숨김<br>점선 원 + 돋보기 = 조사 목표 · 뼈색 테 = 이동 칸 <button type="button" id="c191-trace-back">돌아가기(Esc)</button>';$('#c191-trace-back').onclick=()=>{setV3Mode('world');render();};
 const captured=Object.values(v.ownCities).filter(c=>['CAPTURED','OCCUPATION'].includes(c.occupation?.stage));
 $('#c186-capture-links').innerHTML=captured.map(c=>`<button data-c186-occupation="${esc(c.cityId)}">${esc(c.name)} 점령 · 회유 / 군정</button>`).join('');
 for(const b of $('#c186-capture-links').querySelectorAll('button'))b.onclick=()=>{officeTab='state';openCity(b.dataset.c186Occupation,'office');};
 let summary=$('#c186-turn-summary');if(!summary){document.body.insertAdjacentHTML('beforeend','<div id="c186-turn-summary" class="modal-backdrop" hidden><section class="panel lacquer" role="dialog" aria-modal="true" aria-labelledby="c186-summary-title"><h2 id="c186-summary-title">내 차례 · 지난 상대 차례</h2><ul></ul><button class="btn" type="button">지도로</button></section></div>');summary=$('#c186-turn-summary');summary.querySelector('button').onclick=()=>{turnSummaryPending=null;summary.hidden=true;};}
 const memory=state.turn===1&&!c205MemorySeen?(v.openingMemory??[]).join(' '):'';
 summary.querySelector('button').onclick=()=>{turnSummaryPending=null;c205MemorySeen=true;summary.hidden=true;render();};
 summary.hidden=(typeof inkCards!=='undefined'&&!!inkCards?.pendingReports())||!!state.prologue||$('#c205-choice')?.hidden===false||$('#c197-event-result')?.hidden===false||(!turnSummaryPending&&!memory)||state.phase!=='PLAYER'||!!v.pendingEvent||!!v.relationScene||!!pendingCampaignDraft(state)||!!pendingChoice(v)||combatAnimating;
 if(!summary.hidden){if(document.documentElement?.dataset.ui==='kit')summary.querySelector('h2').textContent=`제${v.turn}차례 보고`;const rows=[...(turnSummaryPending??[])];summary.querySelector('ul').innerHTML=(memory?`<li class="c205-memory">${esc(memory)}</li>`:'')+turnSummaryHtml(rows,document.documentElement?.dataset.ui==='kit'?3:5);
  for(const b of summary.querySelectorAll('[data-summary-tile]'))b.onclick=()=>{const now=view(state),a=now.ownArmies[b.dataset.summaryArmy]??now.knowledge?.observedArmies?.[b.dataset.summaryArmy],c=now.ownCities[b.dataset.summaryCity]??now.knowledge?.cities?.[b.dataset.summaryCity],tile=a?.tileId??c?.tileId??b.dataset.summaryTile;summary.hidden=true;turnSummaryPending=null;c205MemorySeen=true;if(a&&now.knowledge?.tiles?.[a.tileId]==='VISIBLE')follow(a.armyId,true);else if(tile)panToTile(tile);};
 }
}
function command(request,confirmed=false) {
 flushCombatSettlement394();
 if(typeof inkCards!=='undefined'&&inkCards?.busy())return;
 if(request.type==='END_TURN'&&document.documentElement?.dataset.ui==='kit'&&document.body.dataset.c260Forecast==='true')return;
 if(request.type==='END_TURN'&&!request.autoPlayer&&!inputLocked()){const a=Object.values(view(state).ownArmies).find(a=>a.sample4PassTargets?.length);if(a&&openSample4Pass(a.armyId))return;}
 // A relation scene is an acknowledgement only; dismiss it without touching animation or orders.
 if(request.type==='CLOSE_RELATION_SCENE'){if(view(state).relationScene)state=step(state,request);render();scheduleOrders();scheduleAi();return;}
 if(!confirmed&&!inputLocked()&&confirmRiskyAttack(request))return; // C137: before effects or engine step
 if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request?.type))bandStamp();
 setCommandIntent('');
 if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type)&&!inputLocked())commitFx('tally');
 if(request.type==='END_TURN'&&!inputLocked())commitFx('seal');
 const keepSel=request.type==='ADVANCE_ORDER'&&selectedArmyId?{id:selectedArmyId,menu:menuOpen}:null; // 예약 이동 자동 처리가 플레이어 선택을 풀지 않게
 if(['ATTACK_UNIT','ATTACK_CITY','BRACE','REGROUP','WAIT_UNIT','USE_TACTIC','GARRISON'].includes(request.type))lastActedArmy=request.armyId??null;
 const draftAction=['DRAFT_PICK','DRAFT_REROLL'].includes(request.type);
 if(combatAnimating||(!draftAction&&!['ADVANCE_AI','ADVANCE_ORDER'].includes(request.type)&&inputLocked()))return;
 if(['ATTACK_UNIT','ATTACK_CITY','MOVE_UNIT','QUEUE_MOVE'].includes(request.type)){
  const v=view(state),armyId=request.armyId??request.armyIds?.[0],tile=request.destinationTileId??v.knowledge.observedArmies?.[request.targetId]?.tileId??v.knowledge.cities?.[request.cityId]?.tileId;
  if(armyId&&tile)follow(armyId,true,null,tile);
 }
 try {
  if(!draftAction&&!['ADVANCE_AI','ADVANCE_ORDER'].includes(request.type))cancelStrike();
  if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type))captureC266Forecast();
  if(typeof readAiScreen486==='function'){
   aiScreen486=state.phase==='AI'?(aiScreen486??readAiScreen486()):null;
   if(state.phase!=='AI')aiMotionBudget486=1200;
  }
  const before=state;state=step(state,{...request,incremental:true});const actionCommitted=performance.now();overlapPick=null;
  if(typeof aiScreen486==='function'){
   // Finish all action geometry reads before feedback starts writing. Subsequent
   // motion/combat/follow decisions reuse these boxes even if the map is repainted.
   for(const a of Object.values(state.armies))if(before.armies[a.armyId]?.tileId!==a.tileId){aiScreen486(before.armies[a.armyId]?.tileId);aiScreen486(a.tileId);}
   const c=state.lastCombat;
   if(c&&c.sequence!==before.lastCombat?.sequence)for(const tile of [before.armies[c.attackerId]?.tileId,before.armies[c.targetId]?.tileId,before.cities[c.cityId??c.targetId]?.tileId,c.fromTileId].filter(Boolean))aiScreen486(tile);
  }
  trackBatchCommand(before,state,request);
  diplomacyFeedback(before,state);
  try{decisionFeedback(request,before,state);}catch(e){console.warn('C159 decision feedback:',e);}
  const bv=view(before),av=view(state),notices=[...observedReinforcementLines(bv,av),...starvationLines(bv,av),...taxAdvanceLines(bv,av)];
  if(request.type==='TRANSFER_RESERVES')inkToast(reserveTransferLines(av).at(-1)?.text??'예비병을 보냈습니다.');
  if(request.type==='SWAP_ARMIES'){const names=[request.armyId,request.otherArmyId].map(id=>bv.officers[bv.ownArmies[id]?.commanderId]?.name??'아군');const text=`자리 바꿈 — ${names.join(' ↔ ')} · 두 부대 이동 사용`;inkToast(text);turnLog.push(text);}
  rememberMapOwnership(before,state,av);
  for(const c of Object.values(av.ownCities)){const kind=c.currentProduction?.kind;if(!kind)continue;const old=bv.ownCities[c.cityId]?.jobs?.find(j=>j.kind===kind)?.estimate,next=c.jobs?.find(j=>j.kind===kind)?.estimate,r=productionReadout(next,old);if(r.change)notices.push(`${c.name} · ${r.change} · ${r.line}`);}
  for(const [id,a] of Object.entries(bv.ownArmies)){if((av.ownArmies[id]?.troopCount??0)>0)continue;const inj=av.officers[a.commanderId]?.injury;if(inj&&!bv.officers[a.commanderId]?.injury)notices.push(`부대가 무너졌습니다 — ${av.officers[a.commanderId]?.name??'장수'} 중상 · ${injuryReturnText(av.turn,inj)}`);}
  const combatNews=combatScreenNews(bv,av);notices.push(...combatNews.map(e=>e.line));
  for(const e of combatNews)if(e.contact)showContactNotice(e);
  recordNotices=[...recordNotices,...notices.map(line=>({turn:av.turn,line}))].slice(-20);
  if(['ATTACK_UNIT','ATTACK_CITY','USE_TACTIC'].includes(request.type)&&state.lastCombat?.enemyLoss>0&&state.battleSequence>before.battleSequence)state.uiFirstAttackDone=true;
  const majorCount=x=>Object.values(x.cities).filter(c=>c.kind!=='minor'&&c.ownerFactionId===x.playerFactionId).length;
  if(majorCount(before)<3&&majorCount(state)>=3)turnLog.push('큰 성 셋을 얻었습니다 — 이번 차례가 끝나면 통일입니다');
  showProductionCompletions(bv,av);
  if(state.turn>before.turn){lastFoodChange=foodTransition(view(before),view(state));lastUnitResult=null;lastFacilityResults=facilityCompletionLines(view(before),view(state),Object.fromEntries(Object.entries(CITY_JOBS).map(([k,j])=>[k,j.name])));}
  if(request.type==='GARRISON')lastUnitResult=garrisonResult(view(before),view(state),request.armyId);
  for(const e of (state.combatLog??[]).filter(e=>e.sequence>(before.battleSequence??0))){
   if(!combatVisible(before,state,e))continue;
   const row=combatReadout(view(before),view(state),e,Object.fromEntries(campaignMapModel(view(before)).units.map(u=>[u.id,u.name])));
   if(row&&!recentCombats.some(r=>r.sequence===row.sequence))recentCombats=[...recentCombats,row].slice(-6);
   if(row&&e.tacticName){const visibleIds=Object.keys({...bv.ownArmies,...bv.knowledge.observedArmies}).filter(id=>bv.ownArmies[id]||bv.knowledge.tiles[bv.knowledge.observedArmies[id]?.tileId]==='VISIBLE');const summary=tacticChangeText(e,{names:Object.fromEntries(campaignMapModel(bv).units.map(u=>[u.id,u.name])),ownIds:Object.keys(bv.ownArmies),visibleIds,cityTarget:!!bv.ownCities[e.targetId]||bv.knowledge.tiles[bv.knowledge.cities[e.targetId]?.tileId]==='VISIBLE'});turnLog.push(summary);row.lines.unshift(summary);}
  }
  $('#growth-error').textContent='';
  const id=`campaign:${++soundSequence}`;
  if(state.turn>before.turn){/* 같은 소식이 두 번 뜨던 것(닷토리 여러 판 · C148 조사): 화면이 이미 보관한 줄을 차례가 넘어갈 때 한 번 더 넣었다 — 없는 줄만 넣는다 */{const seen=new Set(newsArchive.map(r=>`${r.turn}:${r.line}`));for(const line of turnLog){const k=`${before.turn}:${line}`;if(!seen.has(k)){newsArchive.push({turn:before.turn,line});seen.add(k);}}}turnLog=[];settlementAudio.play(id+':settlement');}
  // C454: worldSfx.command owns movement.
  // C454: settlementAudio owns the turn cue
  for(const event of (state.moraleLog??[]).slice((before.moraleLog??[]).length))if(armyVisible(state,event.armyId)||armyVisible(before,event.armyId))turnLog.push(event.text);
  const combat=state.lastCombat&&state.lastCombat.sequence!==before.lastCombat?.sequence?state.lastCombat:null;
  if(combat&&typeof mapFeelEnabled==='function'&&mapFeelEnabled()&&combatVisible(before,state,combat)){
   const log=globalThis.__feelLog??=[];log.push({eventId:id,actionCommitted,T:null,firstNumber:null,audioCalls:[],presentation:combat.tacticName||['CITY','CITY_STRIKE','TACTIC_EFFECT'].includes(combat.kind)?'legacy-special':'map-v1'});if(log.length>256)log.splice(0,log.length-256);
  }
  const movers=startMotions(before,state,combat);
  try{voiceCue(request,before,combat);}catch{} // 음성은 표시용 — 여기서 틀어져도 명령 처리는 이어 간다
  try{worldSfx.command({request,before,state,combat,beforeView:bv,afterView:av,deferImpact:true,feel:typeof mapFeelEnabled==='function'&&mapFeelEnabled(),managedFx:typeof fxInk!=='undefined'&&!!fxInk,visible:id=>armyVisible(state,id)||armyVisible(before,id)});}catch{} // 효과음도 표시용
  // 성 주인이 바뀌면 함락 컷인(페르소나5·림버스 붓 띠) — 내가 얻거나 잃은 성, 또는 보이는 성만
  for(const c of Object.values(state.cities)){const was=before.cities[c.cityId]?.ownerFactionId;if(was===c.ownerFactionId||!c.ownerFactionId)continue;
   if(c.ownerFactionId===state.playerFactionId||was===state.playerFactionId||view(state).knowledge.tiles[c.tileId]==='VISIBLE'){setTimeout(()=>showCutIn(`${c.name} 함락`,`${factionName(c.ownerFactionId)}군${was?` ← ${factionName(was)}군`:''}`,c.ownerFactionId),combat?1250:150);break;}}
  if(state.turn>before.turn&&!state.gameResult)showBanner(campaignDate(state.turn),`${factionName(state.playerFactionId)}의 차례`);
  else if(before.phase==='PLAYER'&&state.phase==='AI'&&!state.gameResult)showBanner('적군의 차례',Object.keys(state.factions).filter(f=>f!==state.playerFactionId).map(factionName).join(' · '));
  $('#attack-preview').hidden=true;menuOpen=false;moveMode=false;faceMode=false;attackMode=false;selectedTacticId=null;destination=null;
  const presentCombat=combat&&(typeof presentAiCombat486==='function'?presentAiCombat486(before,state,combat):combatVisible(before,state,combat));
  if(presentCombat&&before.phase==='AI'&&fxPreferences.value.aiSpeed==='instant'){animateCombat(before,combat,id);return;}
  if(presentCombat){$('#attack-preview').hidden=true;$('#status').textContent='공격 중…';if(!!combat.tacticName){combatAnimating=true;const a=before.armies[combat.attackerId],cast=()=>showTacticCutIn(a.commanderId,combat.tacticName,a.factionId,()=>animateCombat(before,combat,id),combat.tacticId,campaignTactics(before,combat.attackerId).find(c=>c.traitId===combat.tacticId)?.slot==='R'||campaignTactics(before,combat.attackerId).find(c=>c.traitId===combat.tacticId)?.signature?'R':'E',document.querySelector(`#map .w-hits [data-tile="${before.armies[combat.targetId]?.tileId??before.cities[combat.cityId]?.tileId??''}"]`)?.getBoundingClientRect());if(typeof fxInk!=='undefined'&&fxInk)fxInk.prepareTactic(before,state,combat,cast);else cast();render();}else animateCombat(before,combat,id);return;}
  if(request.type!=='MOVE_UNIT')selectedArmyId=null;
  if(request.type==='SORTIE'){
   const unit=Object.values(state.armies).find(a=>!before.armies[a.armyId]&&a.commanderId===request.officerId);
   if(sortieUi){
    sortieUi.sequence++;sortieUi.deployed.push(unit.armyId);sortieUi.selections=sortieUi.selections.filter(r=>r.officerId!==request.officerId);renderSortie();return;

   }
   closeStage();selectedArmyId=unit.armyId;selectedArmyIds=[unit.armyId];menuOpen=true;moveMode=true;
   render();follow(unit.armyId,true);$('#status').textContent='출진 완료 — 목적지를 눌러 이동하세요.';return;
  }
  if(keepSel&&state.armies[keepSel.id]&&!armyActionEnded(state,keepSel.id)&&state.phase==='PLAYER'){selectedArmyId=keepSel.id;selectedArmyIds=[keepSel.id];menuOpen=keepSel.menu;moveMode=true;}
  // Select the new turn's army before drawing: startPlayerCamera already renders.
  // Previously this drew an unselected map and immediately drew it again.
  const playerTurn=state.phase==='PLAYER'&&(before.phase!=='PLAYER'||state.turn>before.turn);
  if(playerTurn&&before.phase==='AI'){motions={};if(typeof aiMapFrame486!=='undefined'&&aiMapFrame486!==null){cancelAnimationFrame(aiMapFrame486);aiMapFrame486=null;}}
  if(playerTurn)startPlayerCamera();else{if(before.phase==='AI'&&typeof paintAiStep486==='function')paintAiStep486(movers,av.pendingEvent||av.relationScene||pendingCampaignDraft(state));else render();if(movers[0]&&state.phase!=='AI')follow(movers[0],true);}
  scheduleOrders();scheduleAi();
  $('#status').textContent=state.phase==='AI'?(before.phase==='PLAYER'?(request.type==='END_TURN'?'다른 세력이 움직이는 중…':'모든 부대 행동 완료 — 다른 세력의 차례'):'다른 세력이 움직이는 중…'):'명령을 선택하세요.';
  if(!playerTurn&&request.type==='WAIT_UNIT'&&bv.ownArmies[request.armyId]?.sample4PassTargets?.includes(request.targetId)){selectedArmyId=request.targetId;selectedArmyIds=[request.targetId];menuOpen=true;render();follow(request.targetId,true);$('#status').textContent='왕좌지재 · '+(av.officers[av.ownArmies[request.targetId].commanderId]?.name??'아군')+': 일반공격 · Q · W 한 번 더';}else if(!playerTurn)autoNextUnit();
 }catch(error){$('#status').textContent=errorText(error);if(request.type==='SORTIE'&&$('#muster-selection'))$('#muster-selection').textContent=errorText(error);if(draftAction)$('#growth-error').textContent=errorText(error);}
}
function showProductionCompletions(before,after){
 const rows=productionCompletions(before,after,Object.fromEntries(Object.entries(CITY_JOBS).map(([k,j])=>[k,j.name])));
 if(!rows.length)return;
 let host=$('#c215-completions');if(!host){host=document.createElement('section');host.id='c215-completions';host.setAttribute('aria-label','생산 완료');host.setAttribute('aria-live','polite');document.body.appendChild(host);}
 host.innerHTML+=rows.map(r=>`<div><button type="button" data-city="${esc(r.cityId)}">${esc(r.text)}</button><button type="button" data-dismiss aria-label="완공 알림 닫기">×</button></div>`).join('');
 host.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-dismiss')){b.parentElement.remove();return;}if(inputLocked()||state.phase!=='PLAYER'){ $('#status').textContent='내 차례에 다음 생산을 고를 수 있습니다.';return;}openProdPop(b.dataset.city,e,reasonText);b.parentElement.remove();};
}
function showContactNotice(e){
 const tile=$('#map')?.querySelector(`.w-hits [data-tile="${e.tileId}"]`),r=tile?.getBoundingClientRect();
 if(!r)return;const n=document.createElement('div');n.className='c206-contact';n.textContent=e.line;n.setAttribute('role','status');n.style.left=`${Math.max(8,Math.min(innerWidth-300,r.left+r.width/2-140))}px`;n.style.top=`${Math.max(8,r.top-38)}px`;document.body.appendChild(n);setTimeout(()=>n.remove(),2200);
}
function animateCityCombat(before,c,id){
 const presentMs=ms=>aiPresentationMs(ms,before.phase);
 combatAnimating=true;
 const events=c.kind==='CITY_STRIKE'?(state.combatLog??[]).slice((before.combatLog??[]).length).filter(e=>e.kind==='CITY_STRIKE'):[c];
 for(const event of events){
 c=event;ruleFx(before,c);const strike=c.kind==='CITY_STRIKE',city=before.cities[c.cityId],now=performance.now();
 const from=strike?city.tileId:before.armies[c.attackerId].tileId,to=strike?before.armies[c.targetId].tileId:city.tileId;
 fxList.push({kind:strike?'volley':'siege',from,to,start:now,duration:1100});
 const cityName=before.cityDisplayNames[c.cityId]??city.name;
 turnLog.push(strike?`${cityName} 사격: 적 −${troopText(c.enemyLoss)}`:`${before.officers[before.armies[c.attackerId].commanderId].name} → ${cityName}: 내구 −${c.dealt}`);
 if(strike){worldSfx.play('bow-release',{layers:false});worldSfx.play('volley-air',{delay:presentMs(160),layers:false});const u=c.units[0],oldUnit=campaignMapModel(view(before)).units.find(a=>a.id===u.unitId);losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit};
 combatTimers.push(setTimeout(()=>{losses[u.unitId]={prevCount:u.preBattleCount,postCount:u.postBattleCount,heavyLoss:false,oldUnit,impactFrom:from};impactFeedback({from,to,loss:c.enemyLoss,kind:'volley'});render();},presentMs(360)));}
 else {attackAnims[c.attackerId]={targetTileId:to,start:now,duration:presentMs(520),ranged:false};combatTimers.push(setTimeout(()=>{impactFeedback({from,to,loss:c.dealt,kind:'siege',label:`내구 −${c.dealt}`});render();prepareFeelWall($('#map'),to,reduceMotion())();},presentMs(360)));}
 }
 render();combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'다른 세력이 움직이는 중…':'명령을 선택하세요.';},presentMs(1600)));
}
// 신화 규칙 발동 줄("[특기 이름] 설명")은 기록에 남기고 지도에 진홍 표찰로 띄운다
function ruleFx(before,c){
 const publicRecord=view(state).combatFeedback?.find(r=>r.sequence===c.sequence);
 const publicBefore=view(before);
 const impacts=new Map();
 for(const r of publicRecord?.appliedTactics??[]){
  const own=publicBefore.ownArmies?.[r.targetId]??publicBefore.ownCities?.[r.targetId];
  const target=own??publicBefore.knowledge?.observedArmies?.[r.targetId]??publicBefore.knowledge?.cities?.[r.targetId];
  if(!target||!own&&publicBefore.knowledge?.tiles?.[target.tileId]!=='VISIBLE')continue;
  const hitTile=(r.targetId===c.targetId?c.fromTileId:null)??target.tileId;
  if(!own&&publicBefore.knowledge?.tiles?.[hitTile]!=='VISIBLE')continue;
  const bonus=combatBonusLabels({appliedTactics:[r]});
  if(hitTile&&bonus.length)impacts.set(hitTile,[...new Set([...(impacts.get(hitTile)??[]),...bonus])]);
 }
 for(const [hitTile,bonus] of impacts)fxList.push({kind:'tactic',rule:true,label:bonus.join(' · '),from:hitTile,to:hitTile,start:performance.now(),duration:1700});
 const tile=before.armies[c.attackerId]?.tileId??before.cities[c.cityId]?.tileId;
 for(const line of c.effectLines??[]){const name=line.match(/\[([^\]]+)\]/)?.[1];if(!name)continue;turnLog.push(line);if(tile)fxList.push({kind:'tactic',rule:true,label:name,from:tile,to:tile,start:performance.now(),duration:1700});}
}
function animateTacticEffect(before,c,id){
 const presentMs=ms=>aiPresentationMs(ms,before.phase);
 combatAnimating=true;const oldUnits=campaignMapModel(view(before)).units,from=before.armies[c.attackerId].tileId,to=before.armies[c.targetId]?.tileId??before.cities[c.targetId]?.tileId??(before.tiles[c.targetId]?c.targetId:from);
 const changed=oldUnits.filter(u=>before.armies[u.id]&&(before.armies[u.id].troopCount??0)>(state.armies[u.id]?.troopCount??0));
 for(const u of changed)losses[u.id]={displayCount:u.count,oldUnit:u};
 const card=campaignTactics(before,c.attackerId).find(t=>t.traitId===c.tacticId),detail=card?cardDescription(card,before.armies[c.attackerId].commanderId,before):'';
 fxList.push({kind:'tactic',from,to,label:detail||c.effectLines?.join(' · ')||c.tacticName,start:performance.now(),duration:1400});
 turnLog.push(`${before.officers[before.armies[c.attackerId].commanderId].name} · 전법 ${abilityName356({name:c.tacticName})}`);render();
 combatTimers.push(setTimeout(()=>{
  fxInk?.impactTactic(before,state,c);
  for(const u of changed){const pre=u.count,post=(state.armies[u.id]?.troopCount??0)*campaignShownScale(before,u.id,state.playerFactionId),loss=pre-post;
   losses[u.id]={prevCount:pre,postCount:post,oldUnit:u,heavyLoss:loss/Math.max(1,pre)>=.3,impactFrom:from};impactFeedback({from,to:before.armies[u.id].tileId,loss,charge:!!c.charge,kind:'tactic'});
  }
  if(c.cityId&&c.dealt>0)impactFeedback({from,to:before.cities[c.cityId].tileId,loss:c.dealt,kind:'siege',silent:true,label:`내구 −${c.dealt}`});
  for(const u of oldUnits){const heal=(state.armies[u.id]?.troopCount??0)-(before.armies[u.id]?.troopCount??0);if(heal>0)fxList.push({kind:'tactic',from:u.tileId,to:u.tileId,label:`병력 ${troopDelta(heal)}`,start:performance.now(),duration:1100});}
  render();
 },presentMs(360)));
 combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;fxInk?.finishCamera();selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'다른 세력이 움직이는 중…':'명령을 선택하세요.';},presentMs(1500)));
}
// C252: one animation frame owns each actual exchange. State is already committed;
// only the public map's pre/post counts are held until contact.
function animateMapFeel(before,c,id,oldUnits,{ranged,fromTile,targetTile}){
 const epoch292=typeof presentationEpoch292==='undefined'?0:presentationEpoch292;
 const snapshot=state,now=performance.now(),reduced=reduceMotion(),brake=troopToCampaign(before.armies[c.attackerId].troopType)==='BT04'&&troopToCampaign(before.armies[c.targetId].troopType)==='BT02';
 const main=globalThis.__feelLog?.find(e=>e.eventId===id),contact=ranged?220:c.charge?250:180;
 const origin=c.kind==='APPROACH_FIRE'?now:(main?.actionCommitted??now),phases=[],applied=new Set();
 const sound=(name,eventId,gain=1)=>worldSfx.play(name,{gain,layers:false,eventId});
 const pose=(armyId,to,start,hitAt,isCounter=false)=>{
  const attack={targetTileId:to,start,duration:hitAt+160,ranged:!isCounter&&ranged,charge:!isCounter&&!!c.charge,feel:true,contact:hitAt,hitstopMs:reduced?0:isCounter?40:c.charge?65:50,reduced,brake:!isCounter&&brake};
  attackAnims[armyId]=attack;facings[armyId]={tileId:to,until:start+hitAt+180};
  troopLayer?.feelPose?.(armyId,attack);
 };
 pose(c.attackerId,targetTile,origin,contact);
 if(main)Object.assign(main,{presentationStart:now,contactPlanned:origin+contact,actionType:ranged?'bow':c.charge?'charge':c.kind});
 const prepare=(armyId,from,eventId,T,counter=false)=>{
  const u=c.units.find(u=>u.unitId===armyId);if(!u)return;
  const row=globalThis.__feelLog?.find(e=>e.eventId===eventId),scale=campaignShownScale(before,armyId,state.playerFactionId),actual=u.preBattleCount-u.postBattleCount;
  const rout=(c.moraleChanges??[]).some(e=>e.armyId===armyId&&e.to==='ROUTING')||(c.formationChanges??[]).some(e=>e.armyId===armyId&&e.to==='BROKEN');
  const removed=(c.eliminatedIds??[]).includes(armyId),retreat=!!state.armies[armyId]&&before.armies[armyId].tileId!==state.armies[armyId].tileId;
  if(row)Object.assign(row,{T,contactPlanned:T,targetId:armyId,pre:u.preBattleCount,post:u.postBattleCount,routTriggered:rout?T:null,retreatStart:null,unitRemoved:removed?T:null,routReason:rout?'result flag':removed?'eliminated':'no routing/broken transition'});

  const effect={prevCount:u.preBattleCount*scale,postCount:u.postBattleCount*scale,oldUnit:oldUnits.find(x=>x.id===armyId),impactFrom:from,heavyLoss:false,feelHit:{eventId,start:T,elapsed:0,from,reduced,hitstopMs:reduced?0:counter?40:c.charge?65:50,decisive:removed||rout,halfRecoil:reduced||!fxPreferences.shake(),counter,charge:!counter&&!!c.charge,kind:!counter&&ranged?'bow':brake?'spear':!counter&&c.charge?'charge':'clash',side:counter?'FRONT':c.side,cause:counter?'':(c.effectLines??[]).find(s=>/^(측면|후방) \+/.test(s))??'',rout},lossLabel:counter?'반격':c.kind==='APPROACH_FIRE'?'접근사격':''};

  const unit=oldUnits.find(x=>x.id===armyId),paint=unit?prepareFeelContact($('#map'),unit,effect):()=>false;
  phases.push({at:T,run:()=>{
   if(applied.has(eventId))return;applied.add(eventId);
   const frameStarted=performance.now();losses[armyId]=effect;
   if(retreat&&motions[armyId]){const m=motions[armyId],travel=m.duration-m.hold;m.start=T+100;m.duration=travel;m.hold=0;effect.motion={path:m.path,elapsed:frameStarted-m.start,duration:m.duration,hold:0,key:m.key};phases.push({at:T+100,run:()=>{if(row)row.retreatStart=performance.now();}});}
   const shown=paint();troopLayer?.feelContact?.(armyId,effect);c266Contact(c,armyId,actual/Math.max(1,u.preBattleCount));
   if(row){row.impactCallback=frameStarted;row.hpDisplay=shown?performance.now():null;row.firstNumber=shown&&actual>0?performance.now():null;row.firstNumberFrame=row.firstNumber;row.frameStarted=frameStarted;}
   sound(counter?'counter':ranged?'arrows':c.charge?'charge':'clash',eventId,1);
   if(removed&&!rout)sound('warcry',eventId,.22); // C423 keep voices below the contact transient
   if(rout)sound('rout',eventId,.5);
   if(fxPreferences.shake())$('#map')?.animate?.([{translate:'0px 0px'},{translate:`${counter?1:c.charge?4:ranged?1:2}px 0px`},{translate:'0px 0px'}],{duration:counter?40:c.charge?80:55});
   if(row)Object.assign(row,{frameFinished:performance.now(),shakePx:fxPreferences.shake()?(counter?1:c.charge?4:ranged?1:2):0,hitstopMs:effect.feelHit.hitstopMs});
   globalThis.__reelEvent?.('feel-impact',{eventId,T,frameStarted});
  }});
 };
 // All clocks are registered before any expensive work; contact never renders the world.
 prepare(c.targetId,fromTile,id,origin+contact);
 if(ranged){
  const volley=prepareFeelVolley($('#map'),fromTile,targetTile,contact-110);
  phases.push({at:origin+45,run:()=>sound('bow-release',id,1)},{at:origin+110,run:()=>{sound('volley-air',id,1);volley();}});
 }else if(c.charge){sound('hoof',id,1);}
 if(c.counter){
  const counterId=id+':counter';if(main){main.counterEventId=counterId;globalThis.__feelLog.push({eventId:counterId,parentEventId:id,actionCommitted:main.actionCommitted,T:null,firstNumber:null,audioCalls:[]});}
  phases.push({at:origin+contact+110,run:()=>pose(c.targetId,fromTile,origin+contact+110,60,true)});
  prepare(c.attackerId,targetTile,counterId,origin+contact+170,true);
 }
 // C281: keep major outcomes readable, but finish ordinary kit exchanges by 550ms.
 const kit=globalThis.document?.documentElement?.dataset.ui==='kit';
 const major=!!c.captureLine||(c.uiFates??[]).some(x=>x.includes('사로잡음'))||(c.eliminatedIds??[]).length>0||(c.moraleChanges??[]).some(x=>x.to==='ROUTING')||(c.formationChanges??[]).some(x=>x.to==='BROKEN');
 const endAt=kit&&!major?origin+550:origin+contact+(c.counter?170:0)+(kit?900:330);
 if(main)Object.assign(main,{presentationEndPlanned:endAt,majorMoment:major});
 phases.push({at:endAt,run:()=>{
  // C292 keep the dock until committed result replaces it.
  losses={};delete attackAnims[c.attackerId];delete attackAnims[c.targetId];combatTimers=[];combatAnimating=false;selectedArmyId=null;
  if(main)main.presentationEnd=performance.now();
  // Select first so settling does not rebuild the map twice.
  if(kit&&!major)renderCombatSettlement386();
  else if(!autoNextUnitNow())render();
  if(main)main.resultRendered=performance.now();scheduleAi();
 }});
 const tick=()=>{
  if(state!==snapshot||typeof presentationEpoch292!=='undefined'&&epoch292!==presentationEpoch292)return;
  phases.sort((a,b)=>a.at-b.at);
  while(phases.length&&phases[0].at<=performance.now())phases.shift().run();
  // Contact deadlines must not wait for the next expensive map paint.
  if(phases.length){phases.sort((a,b)=>a.at-b.at);combatTimers.push(setTimeout(tick,Math.max(0,phases[0].at-performance.now())));}
 };
 phases.sort((a,b)=>a.at-b.at);combatTimers.push(setTimeout(tick,Math.max(0,phases[0].at-performance.now())));
}
// C465: committed results are revealed in beats; this function never steps rules.
function animateMapMelee465(before,c,id,oldUnits,{fromTile,targetTile}){
 const snapshot=state,epoch=presentationEpoch292,options={ai:before.phase==='AI',reduced:reduceMotion()},plan=meleePlan(options);let start=performance.now();const audioGroup=`melee465:${id}`;
 const totals=new Map(c.units.map(u=>[u.unitId,Math.max(0,u.preBattleCount-u.postBattleCount)]));
 const audioEvents=meleeAudioEvents(plan);let audioIndex=0;
 let done=false,lastPart=0,safety486=null,frame486=null;
 const input486=typeof window!=='undefined'?window:document;
 const sound=event=>{if(!document.hidden&&!reduceMotion())worldSfx.play(event.name,{...event,group:audioGroup,layers:false});};
 const reveal=(time,skip=false)=>{
  for(const u of c.units){const scale=campaignShownScale(before,u.unitId,state.playerFactionId),total=totals.get(u.unitId),prior=lastPart?meleeDamage(total,plan,plan.hits[lastPart-1]):0,next=meleeDamage(total,plan,time,{skip});
   losses[u.unitId]={displayCount:(u.preBattleCount-next)*scale,prevCount:(u.preBattleCount-prior)*scale,postCount:(u.preBattleCount-next)*scale,oldUnit:oldUnits.find(x=>x.id===u.unitId),impactFrom:u.unitId===c.targetId?fromTile:targetTile};
  }
 };
 const finish=()=>{if(done)return;done=true;if(safety486!==null)clearTimeout(safety486);if(frame486!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame486);input486.removeEventListener('click',skip,true);input486.removeEventListener('keydown',skip,true);document.removeEventListener('visibilitychange',hidden);worldSfx.stopGroup(audioGroup);
  if(state!==snapshot||presentationEpoch292!==epoch)return;
  losses={};delete attackAnims[c.attackerId];delete attackAnims[c.targetId];combatAnimating=false;combatTimers=[];fxInk?.finishCamera();selectedArmyId=null;
  if(state===snapshot&&presentationEpoch292===epoch){try{render();}finally{scheduleAi();autoNextUnit();}}
 };
 const skip=e=>{if(done)return;if(e.type==='keydown'&&e.code!=='Space'&&e.key!==' ')return;e.preventDefault();e.stopImmediatePropagation();reveal(plan.duration,true);finish();};
 const hidden=()=>{if(document.hidden)worldSfx.stopGroup(audioGroup);};
 for(const [armyId,to,defending] of [[c.attackerId,targetTile,false],[c.targetId,fromTile,true]]){
  attackAnims[armyId]={targetTileId:to,start,duration:plan.duration,ranged:false,melee465:options,defending};facings[armyId]={tileId:to,until:start+plan.duration};
 }
 // Window capture precedes modal document handlers that can consume Space.
 // Arm input and the one wall-clock deadline before expensive presentation work.
 input486.addEventListener('click',skip,true);input486.addEventListener('keydown',skip,true);document.addEventListener('visibilitychange',hidden);
 if(typeof setTimeout==='function'){safety486=setTimeout(finish,plan.duration);combatTimers.push(safety486);}
 reveal(-1);render();follow(c.attackerId,true,null,targetTile);for(const armyId of [c.attackerId,c.targetId]){attackAnims[armyId].start=start;facings[armyId].until=start+plan.duration;troopLayer?.feelPose?.(armyId,attackAnims[armyId]);}const dock=$('#c266-progress');if(dock)dock.setAttribute('data-melee465-start',String(start));
 const tick=()=>{if(done)return;if(state!==snapshot||presentationEpoch292!==epoch){finish();return;}
  const age=performance.now()-start,part=plan.hits.filter(t=>t<=age).length;
  if(part>lastPart){reveal(age);lastPart=part;
   const root=$('#map');root?.querySelectorAll('.feel-contact,.ink-damage').forEach(n=>n.remove());
   for(const unit of c.units){const effect=losses[unit.unitId],old=oldUnits.find(u=>u.id===unit.unitId);troopLayer?.meleeContact465?.(unit.unitId,effect);
    if(root&&old){const node=root.querySelector(`.w-unit[data-unit="${unit.unitId}"]`);node?.querySelectorAll('.feel-contact').forEach(n=>n.remove());
     prepareFeelContact(root,old,{...effect,feelHit:{eventId:`${id}:${part}`,reduced:true}})();
     const flag=node?.querySelector('.lod-banner,.lod-tag,.plate-top');for(const label of node?.querySelectorAll('.ink-damage')??[]){label.setAttribute('y',String(Math.min(-90,(flag?.getBBox?.().y??-70)-24)));label.style.setProperty('font-size','22px','important');label.style.setProperty('animation','none','important');}
    }
   }
   const dock=$('#c266-progress');if(dock){dock.setAttribute('data-melee465-start',String(start));const head=dock.querySelector('header');if(head)head.textContent=`근접 공방 · ${part} / ${plan.beats}합`;}

  }
  while(audioIndex<audioEvents.length&&audioEvents[audioIndex].at<=age)sound(audioEvents[audioIndex++]);
  if(document.hidden||reduceMotion())worldSfx.stopGroup(audioGroup);
  if(age>=plan.duration){finish();return;}frame486=requestAnimationFrame(tick);
 };frame486=requestAnimationFrame(tick);
}
function showC266Moment(c,actor,text,units=[]){
 let panel=$('#c266-moment');if(!panel){panel=document.createElement('aside');panel.id='c266-moment';document.body.append(panel);}
 const voice=officerMomentVoice(c,units,officerVoiceData);
 const title=c.uiFates?.some(x=>x.includes('사로잡음'))?'擒':c.captureLine?'陷':voice?.kind==='rout'?'退':'破';
 panel.innerHTML=resultSceneHtml({name:actor?.name,face:actor?.portrait,title,text});
 if(voice)panel.querySelector('.c266-result-dialogue').insertAdjacentHTML('beforeend',officerMomentHtml(voice));
 panel.hidden=false;panel.onclick=()=>panel.hidden=true;setTimeout(()=>panel.hidden=true,1800);
}
let c266ForecastCopy=null;
function captureC266Forecast(){c266ForecastCopy=document.documentElement.dataset.ui==='kit'?document.querySelector('.c260-forecast')?.cloneNode(true):null;}
function c266BeginForecast(){
 if(!c266ForecastCopy)return;const panel=c266ForecastCopy;c266ForecastCopy=null;
 panel.id='c266-progress';panel.dataset.battleStage='contact';const stage=panel.querySelector('.c292-stage');if(stage)stage.textContent='교전 중';panel.querySelectorAll('.nb-preview-loss small').forEach(n=>n.textContent='접촉 대기');panel.querySelectorAll('.nb-preview-loss strong').forEach(n=>n.textContent='—');panel.setAttribute('aria-label','교전 진행');panel.querySelectorAll('button').forEach(b=>b.disabled=true);$('#ink-hud').append(panel);
}
function c266SettleForecast(c,armyId){
 const panel=$('#c266-progress');if(!panel)return;const side=armyId===c.attackerId?'ally':'enemy',row=c.units?.find(x=>x.unitId===armyId),col=panel.querySelector(`.nb-preview-${side}`);if(!row||!col)return;
 const counts=col.querySelector('.nb-preview-count'),shown=Number(counts.textContent.match(/([\d,]+)\s*→/)?.[1]?.replaceAll(',','')),scale=shown&&row.preBattleCount?shown/row.preBattleCount:10;const finish=Math.round(row.postBattleCount*scale);counts.textContent=finish.toLocaleString('ko-KR');const actualLoss=col.querySelector('.nb-preview-loss strong'),lossLabel=col.querySelector('.nb-preview-loss small');if(actualLoss)actualLoss.textContent='−'+Math.round(Math.max(0,row.preBattleCount-row.postBattleCount)*scale).toLocaleString('ko-KR');if(lossLabel)lossLabel.textContent='확정 병력 손실';
 if(!reduceMotion()){const from=Math.round(row.preBattleCount*scale),start=performance.now();const tick=()=>{if(!panel.isConnected)return;const t=Math.min(1,(performance.now()-start)/200);counts.textContent=Math.round(from+(finish-from)*(1-(1-t)**3)).toLocaleString('ko-KR');if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}
 col.querySelectorAll('.nb-soldiers .lost').forEach(n=>n.classList.add('c266-fallen'));
 const nums=[...panel.querySelectorAll('.nb-preview-count')].map(n=>Number(n.textContent.replaceAll(',',''))||0),bar=panel.querySelector('.c260-balance i');if(bar)bar.style.width=`${nums[0]+nums[1]?nums[0]/(nums[0]+nums[1])*100:50}%`;
 // C292 result replaces this dock when the complete exchange settles.
}
function c266Contact(c,armyId,lossFraction){
 const node=$('#map')?.querySelector?.(`[data-unit="${armyId}"]`);if(!node)return;
 c266SettleForecast(c,armyId);
 if(lossFraction===0){const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('class','c266-turn-label');label.setAttribute('y','-24');label.textContent='막힘';node.querySelector('.plate-top')?.append(label);setTimeout(()=>label.remove(),420);}
 if((c.eliminatedIds??[]).includes(armyId)){
  const label=document.createElementNS('http://www.w3.org/2000/svg','text'),name=c260PendingResult?.units.find(u=>u.id===armyId)?.name??'부대',captured=c260PendingResult?.c.uiFates?.some(x=>x.includes('사로잡음'));
  label.setAttribute('class','c266-outcome-seal');label.setAttribute('y','-48');label.textContent=`${captured?'擒':'破'} ${name} ${captured?'사로잡음':'격파'}`;node.querySelector('.plate-top')?.append(label);setTimeout(()=>label.remove(),1200);
 }

 const changes=[...(c.moraleChanges??[]),...(c.formationChanges??[])].filter(x=>x.armyId===armyId),status=node.querySelector('.unit-status');
 if(status&&changes.length){const glyph={SHAKEN:'搖',ROUTING:'潰',DISORDERED:'亂',BROKEN:'崩'},to=changes.find(x=>x.to==='ROUTING')?.to??changes.at(-1).to;if(glyph[to])status.innerHTML=`<g class="unit-status-mark" transform="translate(34 -7)"><rect x="-9" y="-9" width="18" height="18" fill="#a8322a"/><text y="5">${glyph[to]}</text></g>`;}
 if(changes.some(x=>x.to==='ROUTING')){const trail=document.createElementNS('http://www.w3.org/2000/svg','g');trail.classList.add('c266-retreat-trail');trail.innerHTML='<circle cx="-8" cy="0" r="2"/><circle cx="-18" cy="4" r="2"/><circle cx="-28" cy="8" r="2"/>';node.append(trail);setTimeout(()=>trail.remove(),800);}

 if(lossFraction>=.2){node.classList.add('c266-heavy');setTimeout(()=>node.classList.remove('c266-heavy'),1000);}
 if([...(c.moraleChanges??[]),...(c.formationChanges??[])].some(x=>x.armyId===armyId)){node.classList.add('c266-state-hit');node.querySelector('.unit-status')?.animate?.([{transform:'scale(1.4)'},{transform:'scale(1)'}],{duration:130});}
 if(c.facingTurned&&armyId===c.targetId)setTimeout(()=>{facings[armyId]={tileId:state.armies[c.attackerId]?.tileId,until:performance.now()+1000};node.classList.add('c266-turned');const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('y','-24');text.setAttribute('class','c266-turn-label');text.textContent='돌아섬';node.querySelector('.plate-top')?.append(text);setTimeout(()=>text.remove(),1000);},260);
}
function animateCombat(before,c,id,prepared=false){
 const selfTactic=!!c.tacticName&&c.attackerId===c.targetId;
 if(!prepared){
 if(selfTactic){c266ForecastCopy=null;document.querySelector('#c266-progress')?.remove();}else c266BeginForecast();
 {clearMapLosses();document.body.dataset.c260Combat='true';
 const bv=view(before),av=view(state),uiMerits=[],uiFates=[],uiCapturedIds=[];
 for(const a of Object.values(bv.ownArmies)){
  const next=av.ownArmies[a.armyId]?.engine;
  for(const m of next?.merits??[]){const old=a.engine?.merits?.find(x=>x.id===m.id)?.count??0;if(m.count>old)uiMerits.push({name:m.name,gain:m.count-old,count:m.count,goal:m.goal});}
 }
 for(const row of c.units??[]){const u=campaignMapModel(bv).units.find(u=>u.id===row.unitId);if(!u)continue;const a=bv.ownArmies[row.unitId]??bv.knowledge.observedArmies[row.unitId],old=bv.officers[a?.commanderId],o=av.officers[a?.commanderId];if(o?.captivityState==='PRISONER'&&old?.captivityState!=='PRISONER'){uiFates.push(`${o.name} 사로잡음`);uiCapturedIds.push(row.unitId);}else if(o?.injury&&!old?.injury)uiFates.push(`${o.name} 중상`);}
 const card=selfTactic?campaignTactics(before,c.attackerId).find(t=>t.traitId===c.tacticId):null;
 const uiTacticEffect=selfTactic?(card?.text||(card?cardDescription(card,before.armies[c.attackerId].commanderId,before):'')||c.effectLines?.filter(Boolean).join(' · ')||'전법 발동'):null;
 c260PendingResult={c:{...c,uiMerits,uiFates,uiCapturedIds,uiSelfTactic:selfTactic,uiTacticEffect},units:campaignMapModel(bv).units.map(u=>{const a=bv.ownArmies[u.id]??bv.knowledge.observedArmies[u.id],o=bv.officers[a?.commanderId];return {...u,portrait:faceOf(a?.commanderId),engineId:o?.engine?.engineId,isRuler:!!o&&before.factions[o.allegianceFactionId]?.rulerId===o.officerId};})};}
 if(!selfTactic&&document.documentElement?.dataset?.ui==='kit'&&!$('#c266-progress')){
  const panel=document.createElement('section');panel.id='c266-progress';panel.className='c260-forecast c292-battle-dock';panel.dataset.battleStage='contact';
  const visible=[c.attackerId,c.targetId].flatMap(id=>{const u=c260PendingResult.units.find(u=>u.id===id);return u?[u]:[];});
  panel.innerHTML=`<header class="c260-forecast-head"><span class="c292-stage">교전 중</span><b>${c.tacticName?esc(abilityName356({name:c.tacticName})):c.cityId?'성 공격':'공격 → 반격'}</b></header><div class="c260-duel">${visible.map((u,i)=>`<section class="nb-preview-${i?'enemy':'ally'}"><span class="nb-preview-portrait">${u.portrait?`<img src="${esc(u.portrait)}" alt="">`:''}</span><div class="nb-preview-values"><b>${esc(u.name)}</b><p class="nb-preview-count">${troopText(u.count)}</p><small>확정 결과 대기</small></div></section>`).join('')}</div>`;$('#ink-hud').append(panel);
 }
 }
 const presentMs=ms=>aiPresentationMs(ms,before.phase);
 if(before.phase==='AI'&&fxPreferences.value.aiSpeed==='instant'){const entry=globalThis.__feelLog?.find(e=>e.eventId===id);if(entry)Object.assign(entry,{skipped:true,reason:'AI instant preference'});combatAnimating=false;losses={};motions={};fxInk?.finishCamera();render();scheduleAi();return;}
 if(c.kind==='APPROACH_FIRE'&&motionRemaining()>0){
  combatAnimating=true;const units=campaignMapModel(view(before)).units;
  for(const u of c.units)losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit:units.find(x=>x.id===u.unitId)};
  const snapshot=state,epoch292=presentationEpoch292;
  render();follow(c.targetId,true,null,before.armies[c.attackerId]?.tileId);combatTimers.push(setTimeout(()=>{if(state!==snapshot||epoch292!==presentationEpoch292)return;losses={};animateCombat(before,c,id,true);},motionRemaining()+20));return;
 }
 // Leave charges, shooting, tactics and the optional painted clash on their existing paths.
 // 전법 · 돌격 · 사격 경로에서는 아래 근접 판별을 아예 하지 않는다(그 경로에 필요 없는 이름을 부르지 않게).
 const meleeCandidate=!c.tacticName&&!c.charge&&!['APPROACH_FIRE','PURSUIT','TACTIC_EFFECT','CITY','CITY_STRIKE'].includes(c.kind);
 const meleeTroop=meleeCandidate?troopToCampaign(before.armies[c.attackerId]?.troopType):null;
 const paintedClash=meleeCandidate&&!(typeof mapFeelEnabled==='function'&&mapFeelEnabled())&&$('#clash')&&document.body?.classList?.contains('ink')&&before.armies[c.attackerId]?.factionId===state.playerFactionId&&new URLSearchParams(location.search).get('clash')!=='0';
 if(meleeCandidate&&!paintedClash&&['BT01','BT02','BT04'].includes(meleeTroop)){
  combatAnimating=true;animateMapMelee465(before,c,id,campaignMapModel(view(before)).units,{fromTile:before.armies[c.attackerId].tileId,targetTile:before.armies[c.targetId].tileId});return;
 }
 if(typeof mapFeelEnabled==='function'&&mapFeelEnabled()&&!c.tacticName&&!['TACTIC_EFFECT','CITY','CITY_STRIKE'].includes(c.kind)){
  combatAnimating=true;
  const fromTile=before.armies[c.attackerId].tileId,targetTile=c.fromTileId??before.armies[c.targetId].tileId;
  const oldUnits=campaignMapModel(view(before)).units;
  if(c.kind==='APPROACH_FIRE'){const target=oldUnits.find(u=>u.id===c.targetId);if(target)target.tileId=targetTile;}
  const ranged=(troopToCampaign(before.armies[c.attackerId].troopType)==='BT03'||before.armies[c.attackerId].troopType==='horseArcher'&&hexGap(fromTile,targetTile)>1)&&c.kind!=='PURSUIT';
  animateMapFeel(before,c,id,oldUnits,{ranged,fromTile,targetTile});return;
 }
 ruleFx(before,c);
 if(c.tacticName)fxList.push({kind:'tactic',label:abilityName356({name:c.tacticName}),from:before.armies[c.attackerId].tileId,to:before.armies[c.targetId]?.tileId??before.cities[c.targetId]?.tileId??(before.tiles[c.targetId]?c.targetId:before.armies[c.attackerId].tileId),start:performance.now(),duration:1700});
 if(c.kind==='TACTIC_EFFECT'){animateTacticEffect(before,c,id);return;}
 if(c.kind==='CITY'||c.kind==='CITY_STRIKE'){animateCityCombat(before,c,id);return;}
 combatAnimating=true;
 const approach=c.kind==='APPROACH_FIRE',pursuit=c.kind==='PURSUIT',movementShot=pursuit||approach,attackTroop=troopToCampaign(before.armies[c.attackerId].troopType),ranged=(attackTroop==='BT03'||before.armies[c.attackerId].troopType==='horseArcher'&&hexGap(before.armies[c.attackerId].tileId,before.armies[c.targetId].tileId)>1)&&!pursuit;
 const feel=typeof mapFeelEnabled==='function'&&mapFeelEnabled();
 if(ranged&&!c.tacticName){worldSfx.play('bow-release',{layers:false});worldSfx.play('volley-air',{delay:presentMs(160),layers:false});}
 else if(c.charge&&!c.tacticName)worldSfx.play('hoof',{layers:false});
 const fromTile=before.armies[c.attackerId].tileId,targetTile=c.fromTileId??before.armies[c.targetId].tileId;
 // C454: contact owned by impactFeedback / animateMapFeel
 const name=armyId=>before.officers[before.armies[armyId].commanderId].name;
 // 교전 장면(기준 final-battle): 내가 건 부대 대 부대 공격만, 지도 위 연출이 도는 동안 그림 한 장으로 보여 준다(누르면 넘어감 · ?clash=0 으로 끔). 결과 계산·지도 반영은 그대로
 if(!feel&&!movementShot&&$('#clash')&&document.body?.classList?.contains?.('ink')&&before.armies[c.attackerId].factionId===state.playerFactionId&&new URLSearchParams(location.search).get('clash')!=='0'){const U=id=>c.units.find(u=>u.unitId===id),S=id=>({name:name(id),emblem:`/assets/ui-v3/hud/faction-banner-${before.armies[id].factionId}.png`,face:faceOf(before.armies[id].commanderId),pre:(U(id)?.preBattleCount??0)*TROOP_DISPLAY_SCALE*campaignShownScale(before,id,state.playerFactionId),post:(U(id)?.postBattleCount??0)*TROOP_DISPLAY_SCALE*campaignShownScale(before,id,state.playerFactionId),troop:troopName(before.armies[id].troopType)});showClash($('#clash'),{ally:S(c.attackerId),foe:S(c.targetId),counter:!!c.counter,attackerIsAlly:true});}
 turnLog.push(approach?`${name(c.attackerId)} 접근사격 → ${name(c.targetId)}: −${troopText(c.enemyLoss)}`:pursuit?`${name(c.attackerId)} 추격 → ${name(c.targetId)}: −${troopText(c.enemyLoss)} (교전 이탈)`:`${name(c.attackerId)} → ${name(c.targetId)}: 적 −${troopText(c.enemyLoss)}, 아군 −${troopText(c.allyLoss)}${c.counter?'(반격)':''}`);
 // Keep the old counts while the charge plays; committed state/vision is already updated.
 const oldUnits=campaignMapModel(view(before)).units;
 if(approach){const target=oldUnits.find(u=>u.id===c.targetId);if(target)target.tileId=targetTile;}
 for(const u of c.units)losses[u.unitId]={displayCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),oldUnit:oldUnits.find(x=>x.id===u.unitId)};
 const now=performance.now(),melee=!ranged&&!movementShot&&!reduceMotion();
 attackAnims[c.attackerId]={targetTileId:targetTile,start:now,duration:presentMs(melee?1880:520),ranged,charge:!!c.charge,melee};
 if(melee)attackAnims[c.targetId]={targetTileId:fromTile,start:now,duration:presentMs(1880),ranged:false,melee:true,defending:true};
 facings[c.attackerId]={tileId:targetTile,until:now+2300};facings[c.targetId]={tileId:fromTile,until:now+(movementShot?560:2300)};
 fxList.push({kind:ranged?'volley':attackTroop==='BT04'?'charge':'clash',from:fromTile,to:targetTile,start:now+(ranged?0:150),duration:1100});
 render();if(!c.tacticName)follow(c.attackerId,true,null,targetTile);   // C177: 전법은 fx-ink 카메라가 맡음
 const hit=(armyId,loss,counter,part=1)=>{   // C171: 근접은 part 1~3 으로 나눠 끈덕진 난전
  const u=c.units.find(u=>u.unitId===armyId);losses[armyId]={prevCount:u.preBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),postCount:u.postBattleCount*campaignShownScale(before,u.unitId,state.playerFactionId),heavyLoss:loss/u.preBattleCount>=.3,oldUnit:oldUnits.find(x=>x.id===armyId),impactFrom:counter?targetTile:fromTile,lossLabel:approach?'접근사격':pursuit&&!counter?'추격':counter?'반격':''};
  if(c.tacticName&&!counter&&part===1)fxInk?.impactTactic(before,state,c);
  if(melee){
   const scale=campaignShownScale(before,armyId,state.playerFactionId),pre=u.preBattleCount*scale,total=(u.preBattleCount-u.postBattleCount)*scale;
   const cuts=[0,Math.floor(total/3),Math.floor(total*2/3),total];
   Object.assign(losses[armyId],{prevCount:pre-cuts[part-1],postCount:pre-cuts[part],heavyLoss:false});
   if(part===1&&!counter)impactFeedback({from:fromTile,to:targetTile,loss:cuts[1],charge:!!c.charge,silent:!!c.tacticName});
   else {if(part===1&&counter)worldSfx.play('counter');fxList.push({kind:'clash',from:counter?targetTile:fromTile,to:counter?fromTile:targetTile,start:performance.now(),duration:250});}
  }else impactFeedback({from:counter?targetTile:fromTile,to:counter?fromTile:targetTile,loss,charge:!!c.charge&&!counter,counter,kind:c.tacticName&&!counter?'tactic':ranged&&!counter?'volley':'clash'});
  render();
 };
 combatTimers.push(setTimeout(()=>{hit(c.targetId,c.enemyLoss,false);if(!c.counter)delete losses[c.attackerId];},presentMs(360)));
 if(melee){
  for(const [part,delay] of [[2,820],[3,1300]])combatTimers.push(setTimeout(()=>{hit(c.targetId,c.enemyLoss,false,part);if(c.counter)hit(c.attackerId,c.allyLoss,true,part);render();},presentMs(delay)));
 }
 if(c.counter){
  if(!melee)combatTimers.push(setTimeout(()=>{const t=performance.now();attackAnims[c.targetId]={targetTileId:fromTile,start:t,duration:presentMs(480),ranged:false};fxList.push({kind:'clash',from:targetTile,to:fromTile,start:t+140,duration:1000});render();},presentMs(540)));
  combatTimers.push(setTimeout(()=>hit(c.attackerId,c.allyLoss,true),700));
 }
 combatTimers.push(setTimeout(()=>{losses={};combatTimers=[];combatAnimating=false;fxInk?.finishCamera();selectedArmyId=null;render();scheduleAi();autoNextUnit();$('#status').textContent=state.phase==='AI'?'모든 부대 행동 완료 — 다른 세력의 차례':'명령을 선택하세요.';},presentMs(movementShot?Math.max(1500,motionRemaining()+200):state.phase==='AI'?(melee?1980:1500):2260))); // AI 차례 전투는 마무리를 짧게(근접 난전은 조금 길게)
}
// 움직인 부대마다 행군 경로를 기록한다(보이는 부대만). 전투로 밀려난 부대는 맞은 뒤에 움직인다.
function startMotions(before,after,combat){
 const presentMs=ms=>aiPresentationMs(ms,before.phase);
 const now=performance.now(),seen=new Set();
 for(const v of [view(before),view(after)])for(const id of [...Object.keys(v.ownArmies),...Object.keys(v.knowledge.observedArmies).filter(id=>v.knowledge.tiles[v.knowledge.observedArmies[id].tileId]==='VISIBLE')])seen.add(id);
 const moved=[];
 const batchedAi=before.phase==='AI'&&typeof aiScreen486==='function';
 const aiDuration=batchedAi?Math.min(120,aiMotionBudget486):null;
 for(const a of Object.values(after.armies)){
  const from=before.armies[a.armyId]?.tileId;if(!from||from===a.tileId||!seen.has(a.armyId))continue;
  if(batchedAi&&(!aiDuration||(!aiScreen486(from)&&!aiScreen486(a.tileId))))continue;
  let path=a.currentOrder?.pathTileIds?.slice(0,(a.currentOrder.currentPathIndex??0)+1)??null;try{path??=campaignPath(before,a.armyId,a.tileId)?.pathTileIds??null;}catch{path=null;}
  if(!path||path[0]!==from||path.at(-1)!==a.tileId)path=[from,a.tileId];
  const hold=combat&&combat.kind!=='APPROACH_FIRE'?(combat.kind==='PURSUIT'&&combat.targetId===a.armyId?560:1000):0;
  motions[a.armyId]={path,start:now,hold:presentMs(hold),duration:presentMs(hold+Math.min(1300,200*(path.length-1))),key:++motionSeq};
  if(batchedAi&&!combat){motions[a.armyId].hold=0;motions[a.armyId].duration=Math.min(motions[a.armyId].duration,aiDuration);}
  moved.push(a.armyId);
 }
 if(batchedAi&&moved.length&&!combat)aiMotionBudget486=Math.max(0,aiMotionBudget486-aiDuration);
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
  if(a){const e=now-a.start;if(e<a.duration)u.attack={targetTileId:a.targetTileId,elapsed:e,duration:a.duration,ranged:a.ranged,charge:!!a.charge,melee:!!a.melee,melee465:a.melee465,defending:!!a.defending,feel:a.feel,contact:a.contact,reduced:a.reduced,brake:a.brake};else delete attackAnims[u.id];}
  if(u.feelHit)u.feelHit={...u.feelHit,elapsed:now-u.feelHit.start};
  const f=facings[u.id];
  if(f){if(now<f.until)u.faceTileId=f.tileId;else delete facings[u.id];}
 }
 fxList=fxList.filter(f=>now-f.start<f.duration);
 model.fx=fxList.filter(f=>now>=f.start&&(!reduceMotion()||f.kind==='tactic'||f.label)).map(f=>({kind:f.kind,label:f.label,rule:f.rule,from:f.from,to:f.to,elapsed:now-f.start,duration:f.duration}));
}
// 행군이 끝나면 한 번 다시 그려 바라보는 쪽·교전 표시를 맞춘다(브라우저 프레임 기준, 타이머 대기열을 쓰지 않음).
function scheduleRedraw(){
 if(redrawTimer||!globalThis.requestAnimationFrame)return;
 const tick=()=>{if(motionRemaining()>0){redrawTimer=requestAnimationFrame(tick);return;}redrawTimer=null;if(state&&!combatAnimating){if(state.phase==='AI'&&typeof queueAiMap486==='function'){queueAiMap486();return;}const armyId=selectedArmyId??Object.keys(motions).find(id=>armyVisible(state,id));drawMap(view(state));if(armyId)follow(armyId,true);}};
 redrawTimer=requestAnimationFrame(tick);
}
// AI 가 화면 밖에서 움직이면 그쪽으로 부드럽게 옮겨 보여 준다.
function follow(armyId,instant=false,previewTile=null,targetTileId=null,selectionOnly=false){
 if(typeof aiFollowSuspended292!=='undefined'&&aiFollowSuspended292&&state?.phase==='AI')return;
 if(globalThis.document?.body?.classList?.contains('hud-band')&&previewTile)return; // C157: hover never pans.
 if(state?.phase==='AI'&&typeof aiScreen486==='function'&&!aiScreen486(state.armies[armyId]?.tileId))return;
 if(typeof bandFocusMoving!=='undefined'&&bandFocusMoving)return; // Initial composition owns the camera until it settles.
 const map=$('#map'),tileId=state?.armies?.[armyId]?.tileId,city=Object.values(state?.cities??{}).find(c=>c.tileId===tileId);
 const node=map.querySelector?.(`[data-unit="${armyId}"]`)??(city&&map.querySelector?.(`.w-cityplate[data-city="${city.cityId}"]`))??(tileId&&map.querySelector?.(`[data-tile="${tileId}"]`)),port=$('.viewport');
 if(!node?.getBoundingClientRect||!port?.getBoundingClientRect||!port.scrollTo)return;
 const r=node.getBoundingClientRect(),v=port.getBoundingClientRect(),m=90;
 const {panels,visible}=mapSafeArea(port,previewTile);
 if(panels.length){
  // Perspective makes screen pixels differ from scroll pixels. Remeasure after each instant correction.
  for(let i=0;i<14;i++){let area=armyScreenBounds(node);const goal=selectionOnly?null:targetTileId??(globalThis.document?.body?.classList?.contains('hud-band')?armyCameraTarget(armyId):null);const extra=goal&&targetScreenBounds(map,goal);if(extra){area={left:Math.min(area.left,extra.left),right:Math.max(area.right,extra.right),top:Math.min(area.top,extra.top),bottom:Math.max(area.bottom,extra.bottom)};area.width=area.right-area.left;area.height=area.bottom-area.top;}const shift=uncoveredShift(area,visible,panels);if(!shift){if(goal&&zoom>.6&&!(document.documentElement?.dataset.ui==='kit'&&state?.phase==='AI')){zoom=Math.max(.6,zoom*.86);applyZoom();continue;}return;}if(!shift.x&&!shift.y)return;
   const left=port.scrollLeft,top=port.scrollTop;
   const matrix=map.querySelector?.('svg')?.getScreenCTM?.(),delta=matrix?screenScrollDelta(matrix,shift.x,shift.y,zoom):shift;
   let next={left:left-delta.x,top:top-delta.y};
   if(document.body?.classList?.contains('hud-band'))next=bandCameraPosition(port,map,next.left,next.top,true);
   port.scrollTo({...next,behavior:'auto'});if(port.scrollLeft===left&&port.scrollTop===top)return;
  }return;
 }
 if(r.left>=v.left+m&&r.right<=v.right-m&&r.top>=v.top+m&&r.bottom<=v.bottom-m)return;
 if(!instant)lockCamera(port);
 port.scrollTo({left:port.scrollLeft+(r.left+r.width/2)-(v.left+v.width/2),top:port.scrollTop+(r.top+r.height/2)-(v.top+v.height/2),behavior:instant?'auto':'smooth'});
}
// C222: summary locations can be cities or a last publicly observed tile.
function panToTile(tileId){
 if(globalThis.document?.documentElement?.dataset?.ui==='kit'){uncoverMapTile(tileId);return;}
 const node=$('#map').querySelector(`[data-tile="${tileId}"]`),port=$('.viewport');
 if(!node||!port)return;const r=node.getBoundingClientRect(),p=port.getBoundingClientRect();
 port.scrollTo({left:port.scrollLeft+r.left+r.width/2-p.left-p.width/2,top:port.scrollTop+r.top+r.height/2-p.top-p.height/2,behavior:'smooth'});lockCamera(port);
}
function bandCameraPosition(port,map,left=port.scrollLeft,top=port.scrollTop,allowRing=false){
 const svg=map.querySelector('svg'),box=svg?.viewBox?.baseVal;if(!box)return {left,top};
 // Automatic uncovering and resize stay inside land; manual map panning is unchanged.
 const margin=Number(svg.dataset.margin)||0,scale=svg.clientWidth/box.width;
 // C165: uncovering a unit may use the painted ring, but never leave the world image.
 if(allowRing)return {left:Math.max(0,Math.min(box.width*scale-port.clientWidth,left)),top:Math.max(0,Math.min(box.height*scale-port.clientHeight,top))};
 const limit=(value,current,extent,viewSize,keepEdge=false)=>{const low=margin*scale,high=(extent-margin)*scale-viewSize;if(high<low)return current;return keepEdge?Math.max(Math.min(low,current),Math.min(Math.max(high,current),value)):Math.max(low,Math.min(high,value));};
 // A capital at the southern edge already uses the rendered ring. Do not force it below the band,
 // and do not uncover farther into that ring than the current camera position.
 return {left:limit(left,port.scrollLeft,box.width,port.clientWidth),top:limit(top,port.scrollTop,box.height,port.clientHeight,true)};
}
// C165b: restore the initial C164 focus; later switches use C165 safe-region uncovering.
let bandFocusSnapshot=null,bandFocusArmy=null,bandFocusMode=null,bandFocusMoving=false;
let bandFocusTimer=null,bandPreviewPointer=null;
// Initial selection and the explicit Attack button retain the established composition.
function frameBandArmy(armyId,x,y,previewTile=null){
 const svg=$('#map svg'),node=$('#map').querySelector(`.w-unit[data-unit="${armyId}"]`);
 if(!svg?.createSVGPoint||!node?.getScreenCTM)return;
 for(let i=0;i<4;i++){
  const plate=node.querySelector?.(':scope > .plate-top'),r=plate?.getBoundingClientRect?.();
  const p=r?.width?{x:r.left+r.width/2,y:r.top+r.height/2}:svg.createSVGPoint().matrixTransform(node.getScreenCTM());
  if(previewTile){
   const v=view(state),foe=Object.values(v.knowledge?.observedArmies??{}).find(a=>a.armyId!==armyId&&a.tileId===previewTile),face=foe&&$('#map').querySelector(`.w-unit[data-unit="${foe.armyId}"] > .plate-top`),fr=face?.getBoundingClientRect?.();
   const other=$('#map').querySelector(`[data-tile="${previewTile}"]`);
   if(fr?.width){p.x=(p.x+fr.left+fr.width/2)/2;p.y=(p.y+fr.top+fr.height/2)/2;}
   else if(other?.getBBox){const b=other.getBBox(),q=svg.createSVGPoint();q.x=b.x+b.width/2;q.y=b.y+b.height/2;const t=q.matrixTransform(other.getScreenCTM());p.x=(p.x+t.x)/2;p.y=(p.y+t.y)/2;}
  }
  const delta=screenScrollDelta(svg.getScreenCTM(),p.x-innerWidth*x,p.y-innerHeight*y,zoom);
  viewport.scrollLeft+=delta.x;viewport.scrollTop+=delta.y;
 }
}
function syncBandFocus(armyId,mode,restoreOnClear=true){
 // C236: selection changes information, never zoom. Only uncover an offscreen unit.
 const changed=bandFocusArmy!==armyId;
 bandFocusArmy=armyId;bandFocusMode=mode;bandPreviewPointer=null;
 clearTimeout(bandFocusTimer);bandFocusMoving=false;
 if(armyId&&changed){
  const r=$('#map').querySelector(`.w-unit[data-unit="${armyId}"] > .plate-top`)?.getBoundingClientRect?.();
  if(r&&(globalThis.document?.documentElement?.dataset?.ui==='kit'||r.left<0||r.top<74||r.right>innerWidth||r.bottom>innerHeight))follow(armyId,true,null,null,true);
 }
}
function frameBandContext(armyId,mode){
 const v=view(state),a=v.ownArmies?.[armyId],at=v.tiles?.[a?.tileId];
 const city=at&&Object.values(v.ownCities??{}).filter(c=>v.tiles[c.tileId]&&hexDistance(at,v.tiles[c.tileId])<=4).sort((a,b)=>hexDistance(at,v.tiles[a.tileId])-hexDistance(at,v.tiles[b.tileId]))[0];
 const node=city&&$('#map').querySelector(`.w-cityplate[data-city="${city.cityId}"] .name`),svg=$('#map svg');
 if(!node?.getBoundingClientRect){frameBandArmy(armyId,mode==='supply'?.385:.44,mode==='supply'?.48:.54);return;}
 for(let i=0;i<4;i++){
  const r=node.getBoundingClientRect(),delta=screenScrollDelta(svg.getScreenCTM(),r.left+r.width/2-innerWidth*(mode==='supply'?.43:.41),r.top+r.height/2-innerHeight*(mode==='supply'?.64:.77),zoom);
  viewport.scrollLeft+=delta.x;viewport.scrollTop+=delta.y;
 }
 // Unit visibility takes precedence over the castle composition. A distant plate
 // or a plate behind either upper panel falls back to the clear central map area.
 const plate=$('#map').querySelector(`.w-unit[data-unit="${armyId}"] > .plate-top`),r=plate?.getBoundingClientRect?.();
 if(r&&(r.left<innerWidth*.14||r.right>innerWidth*.74||r.top<innerHeight*.18||r.bottom>innerHeight*.75))frameBandArmy(armyId,.44,.46);
}
function frameBandAttack(armyId){
 clearTimeout(bandFocusTimer);bandFocusMoving=false;
 zoom=bandFocusSnapshot?.zoom??zoom;applyZoom();
 const v=view(state),target=attackTargets(state,armyId)[0]??cityAttackTargets(state,armyId)[0];
 const tile=target&&(v.knowledge.observedArmies[target]?.tileId??v.knowledge.cities[target]?.tileId);
 // Frame once on the attack button; hovering must never move the camera.
 // A short viewport needs extra headroom above the fixed forecast band.
 frameBandArmy(armyId,.45,innerHeight>=850?.38:.24,tile);
 follow(armyId,true,null,tile);
}
function armyCameraTarget(armyId){
 const v=view(state),a=v.ownArmies?.[armyId]??v.knowledge?.observedArmies?.[armyId];
 const strike=pendingStrike?.armyId===armyId?pendingStrike:null;
 if(strike)return v.knowledge.observedArmies[strike.targetId]?.tileId??v.knowledge.cities[strike.cityId]?.tileId;
 const order=orderHighlights(state,[armyId]).find(o=>o.unitId===armyId);
 return (armyId===selectedArmyId&&moveMode?destination:null)??a?.attack?.targetTileId??order?.path?.at(-1)??null;
}
function armyScreenBounds(node){
 if(!node.hasAttribute?.('data-troop-anchor'))return node.getBoundingClientRect();
 const m=troopScreenMatrix(node,{x:0,y:0},node.getScreenCTM()),d=node.dataset;
 const points=[[+d.troopLeft,+d.troopTop],[+d.troopRight,+d.troopTop],[+d.troopLeft,+d.troopBottom],[+d.troopRight,+d.troopBottom]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}));
 const plate=node.querySelector('.plate-top .count')?.getBoundingClientRect(),face=node.querySelector('.plate-top .frame')?.getBoundingClientRect();
 const rects=[plate,face].filter(r=>r?.width);
 const left=Math.min(...points.map(p=>p.x),...rects.map(r=>r.left)),right=Math.max(...points.map(p=>p.x),...rects.map(r=>r.right)),top=Math.min(...points.map(p=>p.y),...rects.map(r=>r.top)),bottom=Math.max(...points.map(p=>p.y),...rects.map(r=>r.bottom));
 return {left,right,top,bottom,width:right-left,height:bottom-top};
}
function targetScreenBounds(map,tileId){
 const nodes=[...(map.querySelectorAll?.(`[data-camera-tile="${tileId}"]`)??[])];
 const rects=nodes.map(n=>n.classList.contains('w-unit')?armyScreenBounds(n):n.getBoundingClientRect());
 const tile=map.querySelector?.(`.w-hits [data-tile="${tileId}"]`)?.getBoundingClientRect?.();if(tile)rects.push(tile);
 if(!rects.length)return null;
 const left=Math.min(...rects.map(r=>r.left)),right=Math.max(...rects.map(r=>r.right)),top=Math.min(...rects.map(r=>r.top)),bottom=Math.max(...rects.map(r=>r.bottom));
 return {left,right,top,bottom,width:right-left,height:bottom-top};
}
// C287: a safe map region is the visible viewport minus the painted HUD rectangles.
// Keep individual rectangles: the empty centre must not become one large blocked box.
function mapSafeArea(port,previewTile=null){
 const v=port.getBoundingClientRect();
 const visible={left:Math.max(0,v.left),top:Math.max(0,v.top),right:Math.min(globalThis.innerWidth??v.left+v.width,v.right??v.left+v.width),bottom:Math.min(globalThis.innerHeight??v.top+v.height,v.bottom??v.top+v.height)};
 visible.width=visible.right-visible.left;visible.height=visible.bottom-visible.top;
 const kit=globalThis.document?.documentElement?.dataset?.ui==='kit';
 const selector=kit?'.nb-top-left,.ih-res,.ih-menu,.ih-medal,.c253-national,.c248-lens-title,.c248-lens-key,.ih-food-sheet,.ih-foe,.c236-command-list,.c236-objectives,.c236-map-switches,.c236-layer-key,.c236-undo,.w-mini,.nb-selected,.nb-supply,.nb-more,.nb-sheet,.nb-settings,.nb-band:not([data-state="rest"]):not([data-state="forecast"]),.nb-hero,.nb-identity,.nb-order-row>button,.c279-command-preview,.ih-end,.city-quick,#city-panel,#c226-stratagem,.c260-forecast':'.c236-command-list,.c236-objectives,.c236-map-switches,.nb-selected,.nb-supply,.nb-supply-portrait,.nb-state-title,.nb-advisor-box,.nb-band,.nb-hero,.nb-sheet,.nb-more,.nb-bookmarks,.nb-map-options,.nb-news-tab,.nb-news-peek,.ih-top,.ih-medal,.ih-victory,.ih-rail,.ih-unit,.ih-readout,.ih-notice,.ih-notice-links,.ih-cmd,.ih-end,.ih-foe,.ih-food-sheet,.w-top,.w-rail,.w-dock,.w-report,.w-turn,.w-advisor,#city-panel';
 const panels=[...(globalThis.document?.querySelectorAll?.(selector)??[])]
  .filter(n=>!n.hidden&&n.getClientRects?.().length&&(typeof getComputedStyle!=='function'||getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).opacity!=='0'))
  .filter(n=>!(previewTile&&n.matches?.('.nb-band[data-state="forecast"]')))
  .map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
 return {visible,panels};
}
function uncoverMapTile(tileId){
 if(globalThis.document?.documentElement?.dataset?.ui!=='kit'||!tileId)return;
 const map=$('#map'),port=$('.viewport');if(!port?.scrollTo)return;
 for(let i=0;i<14;i++){
  const area=targetScreenBounds(map,tileId);if(!area)return;
  const {visible,panels}=mapSafeArea(port),shift=uncoveredShift(area,visible,panels);
  if(!shift||!shift.x&&!shift.y)return;
  const left=port.scrollLeft,top=port.scrollTop,matrix=map.querySelector('svg')?.getScreenCTM?.();
  const delta=matrix?screenScrollDelta(matrix,shift.x,shift.y,zoom):shift;
  const next=bandCameraPosition(port,map,left-delta.x,top-delta.y,true);
  port.scrollTo({...next,behavior:'auto'});
  if(port.scrollLeft===left&&port.scrollTop===top)return;
 }
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
 clearTimeout(zoomTimer);clearTimeout(bandFocusTimer);bandFocusMoving=false;bandFocusSnapshot=null;bandFocusArmy=null;bandFocusMode=null;
 zoom=playerCameraZoom();
 if(!ids.length){render();centerPlayer();return;}
 selectedArmyId=ids[0];selectedArmyIds=[selectedArmyId];menuOpen=true;moveMode=true;destination=null;render();centerPlayer();positionUnitMenu();
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
 el.dataset.c262Grand=String(/천시|계절|기시감.*되감/.test(title));el.innerHTML=`<b>${esc(title)}</b><span>${esc(sub)}</span>`;el.hidden=false;el.className='turn-banner';void el.offsetWidth;el.className='turn-banner show';
 clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{el.hidden=true;el.className='turn-banner';},1700);
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
  if(Number.isFinite(unit.count)||unit.remembered)continue;
  for(const node of unitNodes(unit.id)){
   const count=node.querySelector('.count');if(count)count.textContent='—';
   for(const bar of node.querySelectorAll('.bar,.bar-bg'))bar.style.visibility='hidden';
  }
 }
}
let aiFollowSuspended292=false,presentationEpoch292=0;
function syncBattleControls292(){
 if(document.documentElement.dataset.ui!=='kit')return;
 let panel=document.querySelector('.c292-ai-controls');
 if(!panel){panel=document.createElement('nav');panel.className='c292-ai-controls';panel.setAttribute('aria-label','적 차례 연출');document.body.append(panel);panel.addEventListener('click',e=>{const speed=e.target.closest('[data-c292-speed]')?.dataset.c292Speed;if(speed){fxPreferences.update({aiSpeed:speed});if(speed==='instant'&&combatAnimating&&c260PendingResult){presentationEpoch292++;for(const timer of combatTimers)clearTimeout(timer);combatTimers=[];losses={};motions={};attackAnims={};combatAnimating=false;fxInk?.finishCamera();render();scheduleAi();}syncBattleControls292();}if(e.target.closest('[data-c292-pin]')){aiFollowSuspended292=!aiFollowSuspended292;syncBattleControls292();}if(e.target.closest('[data-c292-return]')&&c260PendingResult){aiFollowSuspended292=false;follow(c260PendingResult.c.attackerId,true,null,state.armies[c260PendingResult.c.targetId]?.tileId);}});}
 if(state.phase!=='AI')aiFollowSuspended292=false;panel.hidden=state.phase!=='AI';
 panel.innerHTML=`<span>적 차례</span>${[['normal','보통'],['fast','빠르게'],['instant','건너뛰기']].map(([id,text])=>`<button data-c292-speed="${id}" aria-pressed="${fxPreferences.value.aiSpeed===id}">${text}</button>`).join('')}<button data-c292-pin aria-pressed="${aiFollowSuspended292}">지도 고정</button><button data-c292-return>교전으로</button>`;
}
// Keep the result and commands on the critical path. Rebuild geography, labels
// and hidden panels in a task after two presentation opportunities.
let settlementFrame386=0,settlementPending394=null;
function flushCombatSettlement394(){
 const pending=settlementPending394;if(!pending)return;
 settlementPending394=null;settlementOverlayPaused394=false;
 if(pending.ticket!==settlementFrame386||state!==pending.snapshot||presentationEpoch292!==pending.epoch||combatAnimating)return;
 render();if(selectedArmyId)follow(selectedArmyId,true,null,null,true);
}
function renderCombatSettlement386(){
 const snapshot=state,epoch=presentationEpoch292;
 settlementOverlayPaused394=true;
 if(c260PendingResult){const {c,units}=c260PendingResult;c260PendingResult=null;delete document.body.dataset.c260Combat;showCombatResult(c,units);}
 autoNextUnitNow(()=>{},false);
 const v=view(state),model=campaignMapModel(v,{selectedArmyId,portraits:plateFaces()});
 for(const u of model.units){u.active=!!selectedArmyId&&(selectedArmyIds.includes(u.id)||u.id===selectedArmyId);u.actionEnded=!!v.ownArmies[u.id]&&armyActionEnded(state,u.id);u.moved=state.movedArmyIds.includes(u.id)||armyActionEnded(state,u.id);u.ready=state.phase==='PLAYER'&&!!v.ownArmies[u.id]&&!u.actionEnded;}
 settleMapUnits386($('#map'),model.units);
 $('#save').disabled=state.phase==='AI';$('#continue').disabled=inputLocked();
 $('#end-turn').disabled=inputLocked()||state.remainingTicks!==null||!!state.gameResult;
 renderUnitMenu(v);positionUnitMenu();
 const pending={ticket:++settlementFrame386,snapshot,epoch};
 settlementPending394=pending;
 // rAF callbacks run before paint. Even the second one must stay cheap: start
 // the full pass in a subsequent task, after that frame can be presented.
 requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>{
  if(settlementPending394===pending)flushCombatSettlement394();
 },0)));
}
function render() {
 if(typeof aiScreen486!=='undefined')aiScreen486=null;
 if(enginePicker462&&enginePicker462.stamp!==state){enginePicker462=null;document.body.classList.remove('c462-w-picking');document.querySelector('.c231-engine-picker')?.remove();}
 ++settlementFrame386;settlementPending394=null;settlementOverlayPaused394=false;
 c286Memory.observe(state);
 if(c260PendingResult&&!combatAnimating){const {c,units}=c260PendingResult;c260PendingResult=null;delete document.body.dataset.c260Combat;showCombatResult(c,units);}
  const v=view(state);
  for(const warning of observeWarnings490(v)){recordNotices.push({turn:v.turn,line:warning.line});}
  observeGuideWorld426(v);
  syncBattleControls292();
  renderAmbitionUi(v);
  $('#selection').hidden=true;$('#game').hidden=false;for(const s of ['#hud','#mode-rail','#w-report','#w-advisor','#w-turn','#mini-toggle'])if($(s))$(s).hidden=false;
  const shownTurn=endedTurn(v.turn);$('#turn').textContent=campaignDate(shownTurn);$('#turn').insertAdjacentHTML('beforeend',windHtml(v.combatWeather));
  const left=CAMPAIGN_TURN_LIMIT-Math.min(v.turn,CAMPAIGN_TURN_LIMIT+1)+1;$('#turn').dataset.left='';$('#turn').title=`한 판 ${CAMPAIGN_TURN_LIMIT}턴`;
  const majors=Object.values(v.ownCities).filter(c=>c.kind!=='minor').length;
  const goal=$('#victory-guide');if(goal){goal.textContent=`큰 성 3개를 차지하고 차례를 넘기면 통일 · ${CAMPAIGN_TURN_LIMIT}차례 뒤에는 큰 성 → 작은 성 → 병력 · 내 큰 성 ${majors}/3 · ${Math.max(0,left)}차례 남음`;goal.title=`큰 성 셋을 모두 차지한 뒤 차례를 넘기면 정산 때 통일이 결정됩니다.\n${CAMPAIGN_TURN_LIMIT}차례 뒤 큰 성 수로, 같으면 작은 성 · 병력 순입니다.`;}
  const locked=inputLocked();
  $('#end-turn').disabled=locked||state.remainingTicks!==null||!!state.gameResult;
  $('#save').disabled=combatAnimating||state.phase==='AI';$('#continue').disabled=locked;

  $('#result').hidden=!(state.gameResult&&state.remainingTicks===null);
  $('#map').hidden=false;
  const g=state.gameResult,won=['UNIFICATION','TURN_LIMIT'].includes(g?.type)&&(g.winnerFactionId??state.playerFactionId)===state.playerFactionId;
  $('#result-text').textContent=g?.type==='UNIFICATION'?(won?'천하 통일':'통일 — 캠페인 종료'):g?.type==='TURN_LIMIT'?(won?`${CAMPAIGN_TURN_LIMIT}차례 종료 — 승리`:`${CAMPAIGN_TURN_LIMIT}차례 종료 — ${factionName(g.winnerFactionId)} 승리`):'멸망 — 캠페인 종료';
  if(state.gameResult&&!$('#result').hidden){renderResultSummary(v,won);$('#result .c426-ending')?.remove();$('#result .rs-go')?.insertAdjacentHTML('beforebegin',guideEndingHtml(won));}
  const style=FACTION_STYLE[v.factionId];$('#hud').dataset.faction=v.factionId;
  $('#faction').innerHTML=`${emblemHtml(v.factionId)}<span>${style.name}</span>`;$('#faction').style?.setProperty?.('--fc',style.color);
  const cities=Object.values(v.ownCities),sum=key=>cities.reduce((n,c)=>n+(Number(c[key])||0),0);
  // C222: 식량은 공개 장부의 예상 순증, 나머지는 소비 전 산출.
  const fc=key=>cities.reduce((n,c)=>n+(Number(c.economyForecast?.[key])||0),0),delta=(n,icon)=>n||icon==='food'?`<small class="d ${n>=0?'up':'down'}">${icon==='food'?'순증 ':''}${n>=0?'+':'−'}${Math.round(Math.abs(n))}</small>`:'';
  const research=v.research&&Number.isFinite(v.research.nextThreshold)?`${Math.round(v.research.science??0)}<i>/${v.research.nextThreshold}</i>`:null;
  if(v3View(v))$('#resources').innerHTML=resourceChipsV3(v);
  else $('#resources').innerHTML=[['food','식량',`${Math.round(sum('foodStock'))}${sum('foodCapacity')?`<i>/${Math.round(sum('foodCapacity'))}</i>`:''}`,foodLedgerTotals(v).net,`세력이 쌓아 둔 식량 · 산출 +${fc('food')} · 직전 들어옴 +${foodLedgerTotals(v).incoming} / 나감 −${foodLedgerTotals(v).outgoing} · 순증은 현재 산출·유지비 예상`],['production','생산',Math.round(sum('production')),fc('production'),'도시 생산 합 · 다음 정산 산출'],...(research?[['science','학문',research,fc('science'),`연구 ${v.research.stage}단계 · 다음 단계 문턱 ${v.research.nextThreshold} → ${researchUnlockHint(state,v)}`]]:[]),['fame','인망',Math.max(0,(v.faction.prestige??0)-(state.captiveRecruitment?.factions[v.factionId]?.reservedPrestige??0)),fc('prestige'),`쓸 수 있는 인망 · 보유 ${v.faction.prestige??0} / 등용 협의 예약 ${state.captiveRecruitment?.factions[v.factionId]?.reservedPrestige??0} · 다음 정산 산출`],['troops','병력',Object.values(v.ownArmies).reduce((n,a)=>n+a.troopCount,0),0,'부대 병력 합'],['reserve','예비',Math.round(sum('reserveTroops')),manpowerV2(state)?cities.reduce((n,c)=>n+naturalRecruitment(state,state.cities[c.cityId]).amount,0)*TROOP_DISPLAY_SCALE:0,'도시 예비병 합 · 자연 징집 / 차례']].map(([icon,label,value,d,title])=>`<span class="chip" data-res="${icon}" title="${esc(label+' — '+title)}">${resourceIcon(icon)?`<img class="ico" src="${resourceIcon(icon)}" alt="">`:`<i class="ico">${ICON_GLYPH[icon]??'·'}</i>`}<b>${['troops','reserve'].includes(icon)?troopText(value):value}</b>${delta(d,icon)}</span>`).join('');
  const remaining=Object.values(v.ownArmies).filter(a=>!armyActionEnded(state,a.armyId)).length;
  const idle=idleCities(v);$('#end-turn').dataset.blocker=locked?'':idle[0]?.cityId??'';$('#end-turn').classList?.toggle?.('blocked',!locked&&idle.length>0);
  $('#remaining').textContent=idle.length?'생산을 정하지 않은 성이 있습니다 · Shift+누름으로 넘김':remaining?'아직 행동할 부대가 남아 있습니다.':'모든 명령을 마쳤습니다.';$('#end-turn').classList?.toggle?.('ready',!locked&&!idle.length&&!remaining);$('#summary').textContent=`${state.phase==='AI'?'다른 세력이 움직이는 중':'내 차례'} · 남은 부대 ${remaining}${v.crisis?` · 위기 ${v.crisis.name}(${factionName(v.crisis.factionId)}) ${v.crisis.turnsLeft}턴${v.crisis.joined?' · 연합':''}`:''}`;
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
  else $('#officers').innerHTML=Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId).map(o=>{const g=o.growth??{},role=officerRole(v,o.officerId),face=faceOf(o.officerId),st=statsToOfficerPack(o.baseStats),pct=g.nextXp?Math.round(g.xp/g.nextXp*100):100;return `<article class="ro-card" style="--fc:${FACTION_STYLE[v.factionId]?.color}"><button class="ro-face" data-officer="${esc(o.officerId)}" title="장수 정보">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</button><div class="ro-body"><header><button class="ro-name" data-officer="${esc(o.officerId)}">${esc(o.name)}</button><span class="potential" data-rank="${g.potential??''}">${g.potential??''}</span><span class="ro-lv">Lv ${g.level??1}</span></header>${role?`<p class="ro-role">${esc(role)}</p>`:''}<div class="ro-xp"><i style="width:${pct}%"></i></div><dl class="ro-stats">${Object.entries(st).map(([k,x])=>`<dt>${esc({command:'지휘',valor:'무용',intellect:'지략',politics:'정무',charisma:'감화'}[k]??k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl><p class="ro-cards">${(g.cards??[]).slice(0,4).map(c=>`<small>${c.kind==='trait'?traitChip(c,o.officerId):`${esc(abilityName356(c))} ${c.rank}단계`}</small>`).join('')}</p></div></article>`;}).join('');
  renderVisit();renderGrowthDraft();renderEventCard(v);renderChoiceCard(v);renderTraitChoice();renderOfficerCard();renderFactionModal();renderDiplo();renderCouncil();
  renderShell(v);
  if(isPrologue(state)){document.body.classList.add('c225-active');renderPrologue(state,{complete:()=>finishPrologue(()=>globalThis.localStorage)});$('#save').disabled=true;$('#load-again').disabled=true;}
  if(typeof renderRunModifiers==='function')renderRunModifiers(v,{phase:state.phase,face:faceOf,locked:combatAnimating,choose:id=>{state=step(state,{type:'CHOOSE_BLESSING',blessingId:id});worldSfx.play('select');render();scheduleOrders();scheduleAi();},rewind:()=>{state=step(state,{type:'REWIND_TURN'});dismissCombatResult();c260PendingResult=null;inkCards?.reset();c254TurnStart=state;resetAmbitionUi();moveUndo=null;queuedUndoStart=null;c197ResultSeen=null;draftPick=null;motions={};attackAnims={};fxList=[];rivalTurnBaseline=null;turnSummaryPending=null;recordNotices=[];recentCombats=[];lastUnitResult=null;lastFoodChange=null;lastFacilityResults=[];$('#c215-completions')?.remove();turnLog=[];newsArchive=[];selectedArmyId=null;selectedArmyIds=[];moveMode=false;attackMode=false;cancelAttackConfirmation();c207Tracker=c207Info?.createSituationTracker()??null;worldSfx.play('select');render();scheduleOrders();scheduleAi();}});
  refreshOverlapAttack();
  if(stage.city)renderStage(v);
  bgm.scene(bgmScene(v));
}
// 흑묵 명부(기준 page-roster): 왼쪽 목록(둥근 얼굴 · 세 능력 막대 · 잠재) · 가운데 큰 그림 · 오른쪽 능력·특기 판. 고른 장수 = rosterPick
let rosterPick=null,rosterFilter='all',rosterSort='name',rosterQuery='',rosterPage=0;
let c295Compare=null,c295RosterIds=[],c295DetailIds=null;
const rosterPageSize=10;
// 명부 필터 줄(기준 page-roster 위 단추 줄): 전체 · 부대장 · 태수 · 대기 · 지략 80↑ · 무용 80↑
const RI_FILTERS=[['all','전체','mode-roster',()=>true],['army','부대장','cmd-attack',(o,r)=>r==='부대장'],['gov','태수','b-office',(o,r)=>r.startsWith('태수')],['idle','대기','cmd-wait',(o,r)=>r.startsWith('대기')],['wit','지략 80 이상','b-book',o=>(o.baseStats?.intelligence??0)>=80],['might','무용 80 이상','cmd-brace',o=>(o.baseStats?.might??0)>=80]];
const RI_STATS=[['leadership','지휘','r'],['might','무용','o'],['intelligence','지략','b'],['politics','정무','t'],['charisma','감화','g']];
function rosterInk(v){
 const kit=document.documentElement.dataset.ui==='kit';
 if(kit)document.querySelector?.('#roster')?.classList?.add('c374-v4'); // C374: GPT v4 roster layout (hud-kit.css)
 const all=Object.values(v.officers).filter(o=>o.allegianceFactionId===v.factionId);
 if(kit)all.sort((a,b)=>c295RosterOrder(a,b,rosterSort));
 if(!all.length)return '';
 const pct=x=>Math.max(0,Math.min(100,Number(x)||0)),role=o=>officerRole(v,o.officerId)||'대기',roleText=o=>{const r=kit?c295PublicLabel(role(o),'역할 정보 없음'):role(o);return o.officerId===state.factions?.[state.playerFactionId]?.rulerId?`군주${(r.match(/ · .+$/)??[''])[0]}`:r;}; // roleText = 화면에 적는 맡은 일(군주는 '군주 · 성'). 분류(필터)는 role 그대로
 const fil=RI_FILTERS.find(f=>f[0]===rosterFilter)??RI_FILTERS[0],shown=all.filter(o=>fil[3](o,role(o))&&(!kit||c295SearchText(o).includes(rosterQuery.trim()))),list=kit?shown:(shown.length?shown:all);
 const pick=list.find(o=>o.officerId===rosterPick)??list[0];if(pick)rosterPick=pick.officerId;
 if(kit)c295RosterIds=list.map(o=>o.officerId);
 const showPotential=!kit||list.some(o=>o.growth?.potential!=null&&String(o.growth.potential).trim()!=='');
 const filterBar=kit?`<nav class="ri-filter" aria-label="장수 걸러보기">${RI_FILTERS.slice(0,4).map(([id,label])=>`<button class="k-tab" data-rfilter="${id}" aria-pressed="${id===fil[0]}">${label}</button>`).join('')}<button class="k-btn" data-rsort>${rosterSort==='name'?'이름순':'지휘순'}</button></nav><div class="c258-columns" data-potential="${showPotential}"><span>이름 · 역할</span>${RI_STATS.map(([,l])=>`<span>${l}</span>`).join('')}${showPotential?'<span>포텐</span>':''}</div><label class="c295-sort">정렬 <select data-c295-sort>${[['name','이름순'],...RI_STATS.flatMap(([k,l])=>[[k,l+' ↓'],[k+'-asc',l+' ↑']])].map(([k,l])=>`<option value="${k}" ${rosterSort===k?'selected':''}>${l}</option>`).join('')}</select></label>`:`<nav class="ri-filter">${RI_FILTERS.map(([id,label,ic])=>`<button data-rfilter="${id}" aria-pressed="${id===fil[0]}" title="${label}"><img src="/assets/ui-v3/hud/icons/${ic}.png" alt="${label}"></button>`).join('')}</nav>`;
 const search=kit?`<div class="c270-roster-search"><label>이름 찾기 <input data-roster-search aria-label="이름 찾기" placeholder="이름·칭호 찾기" value="${esc(rosterQuery)}"></label><span>${shown.length} / ${all.length}명</span><button data-roster-reset>초기화</button></div>`:'';
 rosterPage=Math.max(0,Math.min(rosterPage,Math.ceil(list.length/rosterPageSize)-1));
 const pageRows=kit?list.slice(rosterPage*rosterPageSize,(rosterPage+1)*rosterPageSize):list;
 const pageNav=kit&&list.length>rosterPageSize?`<nav class="c270-roster-pages" aria-label="명부 쪽"><button data-roster-page="-1" ${rosterPage===0?'disabled':''}>이전</button><span>${rosterPage+1} / ${Math.ceil(list.length/rosterPageSize)}</span><button data-roster-page="1" ${(rosterPage+1)*rosterPageSize>=list.length?'disabled':''}>다음</button></nav>`:'';
 if(!pick)return `<div class="ri-list">${filterBar}${search}<p class="ri-none">맞는 장수가 없습니다. 필터를 지워 다시 찾아보세요.</p></div>`;
 const rows=pageRows.map(o=>{const st=o.baseStats??{},face=faceOf(o.officerId),g=o.growth??{};return `<button class="ri-row${o===pick?' on':''}" data-pick="${esc(o.officerId)}"${kit?` data-potential="${showPotential}"`:''}><img class="row-art" src="/assets/ui-v3/hud/roster-row.png" alt=""><span class="disc">${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}</span><i class="rk" data-r="${esc(roleText(o))}" aria-hidden="true"></i><span class="nm"><b>${esc(o.name)}</b><small>${esc(roleText(o))}</small></span><span class="bars">${(kit?RI_STATS:RI_STATS.slice(0,3)).map(([k,l,c])=>`<i class="${c}" title="${l} ${esc(st[k]??'')}">${kit?`<b class="${st[k]>=80?'high':''}">${esc(st[k]??'?')}</b>`:''}<u style="width:${pct(st[k])}%"></u></i>`).join('')}</span>${showPotential?`<span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential!=null&&String(g.potential).trim()!==''?g.potential:(kit?'—':''))}</span>`:''}</button>`;}).join('');
 const g=pick.growth??{},st=pick.baseStats??{},art=fullArt(pick.officerId),xp=g.nextXp?Math.round(g.xp/g.nextXp*100):100;
 const cards=(g.cards??[]).slice(0,3).map(c=>`<div class="card${c.kind==='trait'?' trait':''}"${c.text?` title="${esc(c.text)}"`:''}><span class="ring">${esc(String(abilityName356(c)).slice(0,1))}</span><small>${esc(abilityName356(c))}${c.rank?` ${c.rank}단계`:''}</small></div>`).join('');
 if(kit){
  const pinned=all.find(x=>x.officerId===c295Compare);
  const why=pick.officerId===v.social?.lordId?'':inputLocked()?'지금은 찾아갈 수 없습니다':socialReason(state,{type:'VISIT',officerId:pick.officerId,choice:0});
  const social=v.social?.officers?.[pick.officerId],bonds=(social?.relations??[]).slice(0,5).map(r=>`${r.name} · ${c295PublicLabel(r.displayName,'관계 정보 없음')}`).join(' / ');
  const summary=x=>`${pinned&&faceOf(x.officerId)?`<img class="c295-compare-face" width="48" height="48" src="${esc(faceOf(x.officerId))}" alt="">`:''}<h2>${esc(x.name)}</h2><p>${esc(roleText(x))}</p><p>${esc(c295TroopName(x.troopType))} · ${esc(c295PublicLabel(x.engine?.name,'계통 없음'))}</p><dl>${RI_STATS.map(([k,l])=>`<div data-stat="${k}" style="--v:${pct(x.baseStats?.[k])}%"><span>${l}</span><i class="c374-bar" aria-hidden="true"><u></u></i><b>${esc(x.baseStats?.[k]??'?')}</b></div>`).join('')}</dl><h3>일반특기 · 고유특기</h3><p>${esc((x.growth?.cards??[]).filter(c=>c.kind==='trait').map(c=>abilityName356(c)).join(' · ')||'익힌 특기 없음')}</p><h3>장착 전법</h3><p>${esc((x.growth?.cards??[]).filter(c=>x.growth?.equippedTacticIds?.includes(c.traitId)).map(c=>abilityName356(c)).join(' · ')||'장착 전법 없음')}</p>`;
  const compare=pinned?`<header><h2>장수 비교</h2><button data-c295-unpin>비교 닫기</button></header><div class="c295-compare">${[pinned,pick].map(x=>`<section>${summary(x)}</section>`).join('')}</div><p>${RI_STATS.map(([k,l])=>{const a=pick.baseStats?.[k],b=pinned.baseStats?.[k];return `${l} ${Number.isFinite(a)&&Number.isFinite(b)?`${a-b>=0?'+':''}${a-b}`:'?'}`;}).join(' · ')}</p>`:summary(pick);
  return `<div class="ri-list">${filterBar}${search}<div class="c295-rows">${rows}</div>${pageNav}</div><div class="ri-art">${art?`<img src="${esc(art.src)}" alt="${esc(pick.name)}"${art.cut?'':' data-cut="1"'}>`:''}</div><section class="c295-preview${pinned?' c295-comparing':''}">${compare}<p>Lv ${g.level??1} · 경험치 ${esc(g.xp??0)} / ${esc(g.nextXp??'MAX')}</p><h3>관계</h3><p data-c374-bonds title="${esc(bonds)}">${esc(bonds||'알려진 관계가 없습니다.')}</p>${pick.officerId===v.social?.lordId?'':`<button data-talk="${esc(pick.officerId)}" ${why?'disabled':''} title="${esc(why||'찾아가 이야기한다')}">찾아간다</button>`}<button data-c295-pin="${esc(pick.officerId)}">비교에 고정</button><button data-officer="${esc(pick.officerId)}">장수 정보</button></section>`;
 }
 const H='/assets/ui-v3/hud/',RI_IC={leadership:'mode-faction',might:'cmd-attack',intelligence:'b-book',politics:'b-office',charisma:'b-talk'};
 const bonds=list.filter(o=>o!==pick).map(o=>({o,r:relation(state,pick.officerId,o.officerId)})).sort((a,b)=>b.r.value-a.r.value).slice(0,3);
 const inkDetail=`<div class="ri-panel k-panel-ink"><img class="pnl" src="${H}roster-detail.png" alt=""><b class="nm">${esc(pick.name)}</b><span class="meta"><span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential??'')}</span>${esc(roleText(pick))}</span>${RI_STATS.map(([k,l,c],i)=>`<span class="st s${i+1}" title="${l} ${esc(st[k]??'—')}"><img class="ic" src="${H}icons/${RI_IC[k]}.png" alt="${l}"><i class="${c}"><u style="width:${pct(st[k])}%"></u></i><b>${esc(st[k]??'—')}</b><small>${l}</small></span>`).join('')}${Array.from({length:3},(_,i)=>{const c=g.cards?.[i];return c?`<span class="sk k${i+1}${c.kind==='trait'?' trait':''}"${c.text?` title="${esc(c.text)}"`:''}><span class="ring">${esc(String(c.name??'').slice(0,1))}</span><small>${esc(c.name)}${c.rank?` ${c.rank}`:''}</small></span>`:`<span class="sk k${i+1} empty"><small>추가 카드 없음<br>레벨업으로 획득</small></span>`;}).join('')}<span class="lv"><small>Lv</small><b>${g.level??1}</b></span><span class="xp"><small>경험 ${xp}%</small><i><u style="width:${xp}%"></u></i></span>${bonds.map(({o,r},i)=>{const f=faceOf(o.officerId);return `<span class="bd b${i+1}" title="${esc(o.name)} · ${esc(r.displayName??'')} ${r.value}"><span class="disc">${f?`<img src="${esc(f)}" alt="">`:faceFallback(o.name)}</span><small>${esc(o.name)}</small></span>`;}).join('')}</div>${(()=>{const why=pick.officerId===v.social?.lordId?'':inputLocked()?'지금은 찾아갈 수 없습니다':socialReason(state,{type:'VISIT',officerId:pick.officerId,choice:0});return pick.officerId===v.social?.lordId?'':`<button class="ri-talk ri-banner" data-talk="${esc(pick.officerId)}"${why?' disabled':''} title="${esc(why||'찾아가 이야기한다 — 군주와 친밀도가 오른다(장수마다 한 달에 한 번)')}"><img src="${H}banner-red.png" alt=""><span><img class="ic" src="${H}icons/b-talk.png" alt="">${why&&/이미/.test(why)?'이번 달 만남':'찾아간다'}</span></button>`;})()}<button class="ri-info ri-banner" data-officer="${esc(pick.officerId)}"><img src="${H}banner-teal.png" alt=""><span><img class="ic" src="${H}icons/mode-roster.png" alt="">장수 정보</span></button>`; // 찾아간다 = 시안 page-roster 의 붉은 대화 단추(2026-10-11): 저택에 가지 않고 명부에서 바로 찾아가기(규칙은 저택의 찾아가기와 같음 — socialReason VISIT)
 return `<div class="ri-list">${filterBar}${search}${rows}${pageNav}${shown.length?'':'<p class="ri-none">이 조건의 장수가 없어 모두 보여 줍니다.</p>'}</div><div class="ri-art" style="--fc:${FACTION_STYLE[v.factionId]?.color??'#777'}">${art?`<img src="${esc(art.src)}" alt="${esc(pick.name)}"${art.cut?'':' data-cut="1"'}>`:''}</div>${inkDetail}<div class="ri-detail"><header><b>${esc(pick.name)}</b><span class="pot" data-rank="${esc(g.potential??'')}">${esc(g.potential??'')}</span><small>Lv ${g.level??1} · ${esc(role(pick))}</small></header><dl class="ri-stats">${RI_STATS.map(([k,l,c])=>`<dt>${l}</dt><dd class="${c}"><i><u style="width:${pct(st[k])}%"></u></i><b>${esc(st[k]??'—')}</b></dd>`).join('')}</dl><div class="ri-xp"><span>경험</span><i><u style="width:${xp}%"></u></i></div><div class="ri-cards">${cards||'<p class="emp">아직 익힌 특기·전법이 없습니다.</p>'}</div><button class="ri-info" data-officer="${esc(pick.officerId)}">장수 정보 자세히</button></div>`;
}
// C295: presentation queries use only the supplied public roster.
function c295PublicLabel(value,fallback){const label=String(value??'').trim();return /[가-힣]/.test(label)&&!/[a-z]/.test(label)?label:fallback;}
function c295TroopName(type){return c295PublicLabel(typeof troopName==='function'?troopName(type):null,'병종 정보 없음');}
function c295SearchText(o){return [o.name,...(o.growth?.titles??[]).map(t=>t.name)].join(' ');}
function c295RosterOrder(a,b,key){
 const axis=key.replace('-asc',''),sign=key.endsWith('-asc')?1:-1;
 return (axis==='name'?0:sign*((a.baseStats?.[axis]??0)-(b.baseStats?.[axis]??0)))||a.name.localeCompare(b.name,'ko')||a.officerId.localeCompare(b.officerId);
}
// 명부 큰 그림: 배경 지운 사본이 없으면 화면에서 지워 쓴다(시설 장면과 같은 방식)
function rosterInkArt(){const im=$('#officers')?.querySelector?.('.ri-art img[data-cut]');if(!im)return;const src=im.getAttribute?.('src');im.style.opacity='0';cutout(src).then(u=>{if(im.isConnected){if(u)im.src=u;im.style.opacity='';}});}
// ── 성 무대(정본 §23): 성 → 건물 → 시설 장면. 명령은 성 창(#city-panel)을 시설 장면 오른쪽에 옮겨 붙여 그대로 쓴다 ──
const stage={city:null,fac:null,art:null,artFor:null,transition:0,opening:false};
const naejeongUi={city:null,facility:null,department:null,transferOfficer:null,jobs:false,policy:false,personnel:false,influence:false,job:null,error:''};
function renderNaejeong(v,c,host){
 if(naejeongUi.city!==c.cityId)Object.assign(naejeongUi,{city:c.cityId,facility:null,department:null,transferOfficer:null,jobs:false,policy:false,personnel:false,influence:false,job:null,error:''});
 const panel=$('#city-panel');if(panel){panel.hidden=true;document.body?.appendChild?.(panel);}selectedCityId=null;
 const scroll=[...host.querySelectorAll?.('.c294-work,.nj-job-grid,.nj-departments')??[]].map(n=>[n.className,n.scrollTop]);
 host.innerHTML=v3View(v)?domesticScreenV3({v,c,face:faceOf,locked:inputLocked(),selectedJob:naejeongUi.job,error:naejeongUi.error}):naejeongHtml({state,v,c,art:stage.art,ui:{...naejeongUi,locked:inputLocked()},face:faceOf,reasonText,date:campaignDate(v.turn)});
 if(!v3View(v)&&document.documentElement?.dataset?.ui==='kit'){
  host.querySelector('.c294-workspace')?.insertAdjacentHTML('afterbegin',`<h2 class="c343-city-title">${esc(c.name)} · 내정</h2>`);
  const facility=kind=>['tuntian','farm','granary','market','barracks','workshop','clinic','mufu','naval'].includes(kind)?`/assets/facility-art/${kind}_v1.png`:null;
  for(const card of host.querySelectorAll('.nj-job-card')){const src=facility(card.dataset.njJob);if(src)card.querySelector('img').src=src;}
  for(const [selector,kind] of [['.c294-current',c.currentProduction?.kind],['.c294-next',c.nextProduction?.kind],['.c294-selection',naejeongUi.job]]){
   const src=facility(kind);if(src)host.querySelector(selector)?.insertAdjacentHTML('afterbegin',`<img class="c347-facility" src="${src}" alt="">`);
  }
  const estimate=c.jobs?.find(j=>j.kind===c.currentProduction?.kind)?.estimate;
  if(estimate?.cost>0)host.querySelector('.c294-current')?.insertAdjacentHTML('beforeend',`<progress class="c347-production-progress" aria-label="현재 생산 진척" value="${Math.max(0,Math.min(estimate.cost,estimate.progress??0))}" max="${estimate.cost}"></progress>`);
 }
 for(const [cls,top] of scroll){const n=host.getElementsByClassName?.(cls)?.[0];if(n)n.scrollTop=top;}
}
function naejeongClick(e){
 const conscription=e.target.closest?.('[data-emergency-conscription]');
 if(conscription?.dataset.emergencyConscription){const cityId=conscription.dataset.emergencyConscription,c=state.cities[cityId],p=emergencyConscriptionPreview(state,c);if(!inputLocked()&&!p.reason&&confirm(`긴급 징병 +${troopText(p.amount)}명 / 인구 −1(최소 1) / 치안 → ${['민심 불안','혼란'][c.securityLevel??0]} / 3차례 징집 정지 / 5차례 뒤 재사용`))command({type:'CITY_JOB',cityId,kind:'emergency_conscription'});return;}
 const b=e.target.closest?.('[data-nj-policy-toggle],[data-nj-personnel],[data-nj-department],[data-nj-facility],[data-nj-unselect],[data-nj-dismiss],[data-nj-appoint],[data-nj-clear],[data-nj-transfer-officer],[data-nj-transfer],[data-nj-policy],[data-nj-priority],[data-nj-influence],[data-nj-jobs],[data-nj-reserve],[data-nj-start],[data-nj-cancel-reserve],[data-nj-build],[data-nj-legacy],[data-nj-job],[data-nj-army-choice],[data-nj-troop-choice]');
 if(!b||b.disabled)return false;
 const d=b.dataset,c=view(state).ownCities[stage.city];if(!c)return true;
 naejeongUi.error='';let request=null;
 if('njPolicyToggle'in d){naejeongUi.policy=!naejeongUi.policy;naejeongUi.jobs=false;naejeongUi.personnel=false;naejeongUi.department=null;naejeongUi.transferOfficer=null;}
 if('njPersonnel'in d){naejeongUi.personnel=!naejeongUi.personnel;naejeongUi.policy=false;naejeongUi.jobs=false;naejeongUi.department=null;naejeongUi.transferOfficer=null;}
 if('njJob'in d)naejeongUi.job=d.njJob;
 if('njArmyChoice'in d)naejeongUi.armyId=d.njArmyChoice;
 if('njTroopChoice'in d)naejeongUi.troopType=d.njTroopChoice;
 if('njDepartment'in d){naejeongUi.department=d.njDepartment;naejeongUi.transferOfficer=null;naejeongUi.jobs=false;}
 if('njFacility'in d)naejeongUi.facility=d.njFacility;
 if('njUnselect'in d)naejeongUi.facility=null;
 if('njDismiss'in d)Object.assign(naejeongUi,{department:null,transferOfficer:null,jobs:false,policy:false,personnel:false});
 if('njAppoint'in d||'njClear'in d){request=domesticIntent(c.cityId,'department',d.njAppoint??null,{department:naejeongUi.department});naejeongUi.department=null;}
 if('njTransferOfficer'in d){naejeongUi.transferOfficer=d.njTransferOfficer;naejeongUi.jobs=false;}
 if('njTransfer'in d){request=domesticIntent(c.cityId,'transfer',d.njTransfer,{officerId:naejeongUi.transferOfficer});naejeongUi.transferOfficer=null;naejeongUi.department=null;}
 if('njPolicy'in d){request=domesticIntent(c.cityId,'policy',d.njPolicy);naejeongUi.policy=false;}
 if('njPriority'in d)request=domesticIntent(c.cityId,'priority',!c.foodPriority);
 if('njInfluence'in d)naejeongUi.influence=!naejeongUi.influence;
 if('njJobs'in d){naejeongUi.policy=false;naejeongUi.jobs=true;naejeongUi.department=null;naejeongUi.transferOfficer=null;naejeongUi.job??=c.jobs.find(j=>!['muster','reorganize'].includes(j.kind))?.kind;}
 if(state.trialRules?.domesticV3===true&&('njReserve'in d||'njStart'in d))naejeongUi.job=e.target.closest('.c490-screen')?.querySelector('[data-c490-job]')?.value??naejeongUi.job;
 if('njReserve'in d||'njStart'in d){request=domesticIntent(c.cityId,'njReserve'in d?'reserve':'job',naejeongUi.job,domesticJobExtra(view(state),naejeongUi));naejeongUi.jobs=false;}
 if('njCancelReserve'in d)request=domesticIntent(c.cityId,'reserve',null);
 if('njBuild'in d)request=domesticIntent(c.cityId,'job',d.njBuild);
 if('njLegacy'in d){officeTab=d.njLegacy;renderFacilityScene(view(state),c,cityPeople(view(state),c));return true;}
 if(request&&!inputLocked()){try{step(state,request);command(request);}catch(error){naejeongUi.error=`${reasonText(error.message)} (${error.message})`;}}
 renderFacilityScene(view(state),view(state).ownCities[stage.city],cityPeople(view(state),view(state).ownCities[stage.city]));return true;
}
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
const reduceMotion=()=>fxPreferences.reduced();
const aiPresentationMs=(ms,phase=state?.phase)=>document.documentElement?.dataset.ui==='kit'&&phase==='AI'&&fxPreferences.value.aiSpeed==='fast'?Math.round(ms*.5):fxPreferences.duration(ms,phase==='AI');
function syncMotionSetting(){document.documentElement.dataset.reduceMotion=String(reduceMotion());}
syncMotionSetting();globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change',syncMotionSetting);
document.addEventListener('ink:fx-settings',()=>{syncMotionSetting();if(state)scheduleAi();});
// 지도 → 성: 카메라가 그 성으로 파고들며 어두워지고(0.42초) 성 무대가 살짝 물러나며 밝아진다
async function openStage(cityId,fac=null){
 document.dispatchEvent(new Event('map:leave-scene'));
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
function closeStage({immediate=false}={}){
 closeSortie();
 const returnCity=stage.city;
 const root=$('#city-stage'),game=$('#game');stage.transition++;stage.opening=false;stage.city=null;stage.fac=null;selectedCityId=null;renderFirstSortie(view(state));
 const panel=$('#city-panel');if(panel){panel.hidden=true;document.body?.appendChild?.(panel);}
 const finish=()=>{if(root&&!stage.city){root.classList?.remove('push','facility','focus');root.hidden=true;}};
 if(!immediate&&root&&!root.hidden&&root.animate&&!reduceMotion()){root.animate([{opacity:1},{opacity:0,transform:'scale(1.04)'}],{duration:240,easing:'ease-in'}).finished.then(finish,finish);game?.animate?.([{scale:'1.7',filter:'brightness(.25)'},{scale:'1',filter:'brightness(1)'}],{duration:560,easing:'cubic-bezier(.2,.7,.2,1)'});}
 else finish();
 if(document.documentElement?.dataset?.ui==='kit'&&returnCity)selectedCityId=returnCity;
 if(state)render();
}
// 성 전경 아래 띠(기준 page-city-v2): 인구 · 치안 · 식량 · 하는 일 · 성 내구 — 있는 값만 보여 준다(새 규칙 없음)
function stageGauges(c){
 if(state.trialRules?.domesticV3)return [{ic:'mode-roster',label:'인구',pct:Math.min(100,c.people/c.peopleCapacity*100),text:`${numberV3(c.people)} / ${numberV3(c.peopleCapacity)}`},{ic:'cmd-brace',label:'치안',pct:[100,50,0][c.securityLevel??0],text:c.securityName},{ic:'res-food',label:'세력 곡식',pct:100,text:`${numberV3(view(state).granary)} 석`}];
 const kind=c.currentProduction?.kind,job=kind?CITY_JOBS[kind]:null,prog=kind?(c.jobProgress?.[kind]??c.productionProgress??0):0,raw=state.cities[c.cityId]??{},sec=c.economyForecast?.securityLevel??c.securityLevel??0;
 return [{ic:'mode-roster',label:'인구',pct:c.populationCapacity?c.population/c.populationCapacity*100:100,text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`,tone:'teal'},
  {ic:'cmd-brace',label:'치안',pct:[100,52,16][sec]??100,text:['안정','민심 불안','혼란'][sec]??'',tone:'red'},
  {ic:'res-food',label:'식량',pct:c.foodCapacity?c.foodStock/c.foodCapacity*100:0,text:`${cityNumber(c.foodStock)}/${cityNumber(c.foodCapacity)}`,tone:'gold'},
  {ic:'res-production',label:job?`하는 일 · ${job.name}`:'하는 일',pct:job?.cost?prog/job.cost*100:0,text:job?job.name:'쉬는 중',tone:'blue'},
  ...(Number.isFinite(raw.durability)&&raw.durabilityMax?[{ic:'cmd-garrison',label:'성 내구',pct:raw.durability/raw.durabilityMax*100,text:`${Math.round(raw.durability)}/${raw.durabilityMax}`,tone:'bone'}]:[])];
}
// 성 안(2026-10-13 배치): 오른쪽 판의 수치 표와 아래 띠의 '지금 하는 일' — 화면에 이미 있던 값만 다시 나눠 담는다
// 태수 판에는 성의 값만(사용자 2026-10-14: 태수 개인 능력치는 뺀다). 막대 두 칸 = 내구 · 식량(찬 정도가 뜻이 있는 것), 목록 = 인구 · 생산 · 치안 · 예비병 · 포위
function stageStats(c){
 if(state.trialRules?.domesticV3)return [{ic:'mode-roster',label:'인구',text:`${numberV3(c.people)} / ${numberV3(c.peopleCapacity)}`},{ic:'cmd-brace',label:'치안',text:c.securityName},{ic:'res-production',label:'등급',text:c.gradeName}];
 const f=c.economyForecast??{},sec=f.securityLevel??c.securityLevel??0,up=n=>Number.isFinite(n)&&n>0?`+${cityNumber(n)}`:'';
 return [{ic:'mode-roster',label:'인구',text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`},
  {ic:'res-production',label:'생산',text:up(f.production)||'0'},
  {ic:'cmd-brace',label:'치안',text:['안정','민심 불안','혼란'][sec]??'',tone:['good','warn','bad'][sec]??''},
  {ic:'res-troops',label:'예비병',text:troopText(c.reserveTroops??0)},
  {ic:'cmd-garrison',label:'포위',text:c.besieged?'포위 중':'없음',tone:c.besieged?'bad':''}];
}
function stageLordGauges(c){
 if(state.trialRules?.domesticV3)return [{label:'인구',value:c.people,max:c.peopleCapacity,text:`${numberV3(c.people)} / ${numberV3(c.peopleCapacity)}`}];
 const raw=state.cities[c.cityId]??{},f=c.economyForecast??{},out=[];
 if(Number.isFinite(raw.durability)&&raw.durabilityMax)out.push({label:'내구',value:raw.durability,max:raw.durabilityMax,text:`${Math.round(raw.durability)}/${raw.durabilityMax}`,tone:raw.durability<raw.durabilityMax/2?'low':''});
 else out.push({label:'인구',value:c.population,max:c.populationCapacity||c.population||1,text:`${c.population}${c.populationCapacity?`/${c.populationCapacity}`:''}`});
 out.push({label:'식량',value:c.foodStock,max:c.foodCapacity||1,text:`${cityNumber(c.foodStock)}/${cityNumber(c.foodCapacity)}`,hint:Number.isFinite(f.food)&&f.food?`차례마다 ${f.food>0?'+':''}${cityNumber(f.food)}`:''});
 return out;
}
function stageJob(c){
 const kind=c.currentProduction?.kind,job=kind?CITY_JOBS[kind]:null;if(!job)return {name:'쉬는 중',pct:0,text:'생산을 고르세요',idle:true};
 const est=c.jobs?.find(j=>j.kind===kind)?.estimate,turns=est?productionReadout(est).turns:null,prog=est?.progress??c.jobProgress?.[kind]??c.productionProgress??0,cost=est?.cost??job.cost??0;
 return {name:job.name,ic:`D2:${kind}`,pct:cost?prog/cost*100:0,text:turns?`${turns}차례 남음`:''};
}
function renderStage(v){
 const root=$('#city-stage'),c=v.ownCities[stage.city];if(!root?.querySelector)return;
 if(!c||!stage.art){closeStage();return;}
 const people=cityPeople(v,c),idle=!!cityProductionBadge(c)?.idle,issues=cityIssues(v,c,people,{idle});
 const over=root.querySelector('.cs-over'),la=people.office?.officerId?fullArt(people.office.officerId):null;
 if(over)over.innerHTML=overviewHtml({state,v,c,art:stage.art,people,issues,date:campaignDate(v.turn),facilityState:{recommendation:recommendCityJob(state,c.cityId),working:c.currentProduction?.kind?CITY_JOBS[c.currentProduction.kind]?.name:null,news:stageNews(v,c),gauges:stageGauges(c),stats:stageStats(c),lordGauges:stageLordGauges(c),job:stageJob(c),roles:cityFacilityRoles(state,c.cityId)},portraits:plateFaces(),emblem:emblemHtml(v.factionId),lordArt:la?.src});
 for(const row of root.querySelectorAll('.cs-cast .face-btn')){
  const id=people[row.dataset.spot]?.officerId??Object.values(people).find(o=>o?.name===row.querySelector('.tag b')?.textContent)?.officerId;
  const f=v.officers[id]?.fatigue,text=fatigueLineText(f);if(text)row.querySelector('.tag')?.insertAdjacentHTML('beforeend',`<small class="c191-fatigue${f.musterBlocked?' blocked':''}">${esc(text)}</small>`);
 }
 mountCityLife(root);
 if(over&&la&&!la.cut){const im=over.querySelector('.cs-lord .art img');if(im){im.style.opacity='0';cutout(la.src).then(u=>{if(im.isConnected){if(u)im.src=u;im.style.opacity='';}});}} // 태수 판 그림: 배경 지운 사본(시설 장면과 같은 방식)
 root.style?.setProperty?.('--fc',FACTION_STYLE[v.factionId]?.color??'#777');
 fitStageShift();
 requestAnimationFrame(fitCityMarkers);
 if(stage.fac)renderFacilityScene(v,c,people);
 if(sortieUi)renderSortie();
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
 for(const spot of over.querySelectorAll('.cs-decoration')){
  spot.style.translate='';
  const marker=spot.querySelector('.mk')?.getBoundingClientRect(),label=spot.querySelector('.label')?.getBoundingClientRect(),parent=spot.parentElement;
  const boxes=[marker,label].filter(r=>r?.width&&r.top<panel.bottom&&r.bottom>panel.top),right=Math.max(0,...boxes.map(r=>r.right));
  if(right>panel.left-12&&parent?.offsetWidth){const scale=parent.getBoundingClientRect().width/parent.offsetWidth;spot.style.translate=`${-Math.ceil((right-panel.left+12)/(scale||1))}px 0`;}
 }
}
globalThis.addEventListener?.('resize',()=>{if(stage.city){fitStageShift();fitCityMarkers();}});
function renderFacilityScene(v,c,people){
 const root=$('#city-stage'),host=root?.querySelector('.cs-facility');if(!host)return;
 if(stage.fac==='office'&&c.departments&&!['state','cmds'].includes(officeTab)){renderNaejeong(v,c,host);return;}
 const id=stage.fac,b=BUILDINGS[id],who=people[id]??(['market','granary','workshop','gate'].includes(id)?people.office:null);
 const art=who?.officerId?fullArt(who.officerId):null; // 재야 장수도 그림이 있으면 크게
 const portraitsFull={...(who&&art?{[who.officerId]:{full:art.src}}:{})};
 const others=[people.office,people.barracks,people.tavern,people.residence].filter(o=>o&&o!==who).slice(0,3).map(o=>({name:o.name,note:Object.entries(people).find(([,x])=>x===o)?.[0]?BUILDINGS[Object.entries(people).find(([,x])=>x===o)[0]]?.name:''}));
 const line=who?(memoryLines[who.officerId]??({office:'성의 일은 제가 살피고 있습니다.',barracks:'병사들은 언제든 나설 수 있습니다.',tavern:'이곳엔 소문이 먼저 닿습니다.',residence:'오셨습니까.'}[id]??'')):'';
 {const keep=$('#city-panel');if(keep&&host.contains?.(keep))document.body?.appendChild?.(keep);} // 다시 그릴 때 성 창이 장면과 함께 지워지지 않게(방문 대화 뒤 업무판이 비던 문제)
 host.innerHTML=facilityHtml({state,v,c,id,officer:who,line,bg:v3Asset(`city-stage/facility-${id}.webp`),art:stage.art,spot:stage.art.spots[id],portraits:portraitsFull,others,roles:cityFacilityRoles(state,c.cityId)});
 if(id==='office'&&c.departments)host.insertAdjacentHTML('beforeend','<button class="nj-return" data-nj-legacy="jobs">내정 장부로</button>');
 if(art&&!art.cut){const im=host.querySelector('.cs-officer img');if(im){im.style.opacity='0';cutout(art.src).then(u=>{if(u&&im.isConnected){im.src=u;im.style.opacity='';}});}}
 const slot=host.querySelector('.cs-commands'),panel=$('#city-panel');
 if(slot&&panel){slot.appendChild(panel);selectedCityId=stage.city;cityTab=b.pane;renderCityPanel(v);panel.hidden=false;}
}
function enterFacility(id){
 if(document.documentElement?.dataset?.ui==='kit'&&['granary','market','workshop','gate'].includes(id)){Object.assign(naejeongUi,{city:stage.city,facility:id==='gate'?'repair':id,department:null,transferOfficer:null,jobs:false});id='office';officeTab='jobs';}
 const root=$('#city-stage');if(!BUILDINGS[id]||!root)return;
 const s=stage.art?.spots?.[id],cam=root.querySelector('.cs-camera');
 if(cam&&s){cam.style.transformOrigin=`${(s.x/stage.art.w*100).toFixed(2)}% ${(s.y/stage.art.h*100).toFixed(2)}%`;cam.style.setProperty('--push',id==='office'?'2.2':'2.6');}
 stage.fac=id;root.classList?.add('push');
 renderFacilityScene(view(state),view(state).ownCities[stage.city],cityPeople(view(state),view(state).ownCities[stage.city]));
 setTimeout(()=>root.classList?.add('facility'),260);
}
function leaveFacility(){
 const root=$('#city-stage');stage.fac=null;selectedCityId=null;officeTab='jobs';
 const panel=$('#city-panel');if(panel){panel.hidden=true;document.body?.appendChild?.(panel);}
 root?.classList?.remove('facility');setTimeout(()=>root?.classList?.remove('push'),120);
}
bindCityAudit($('#city-stage'),{
 isOpen:()=>!!stage.city&&!stage.opening&&(!stage.fac||stage.fac==='office'||stage.fac==='barracks'&&document.documentElement?.dataset?.ui==='kit'),
 navigate:async id=>{if(inputLocked()||stage.opening)return;if(document.documentElement?.dataset?.ui==='kit'&&!view(state).ownCities[id]){const list=$('#city-stage .c294-city-list');if(list){list.open=true;list.insertAdjacentHTML('beforeend','<p role="status">이 성은 더 이상 관리할 수 없습니다.</p>');}return;}const previousFacility=stage.fac,domestic=stage.fac==='office',keep=domestic?{...naejeongUi,city:id}:null;await openStage(id);if(stage.city!==id)return;if(domestic){if(document.documentElement?.dataset?.ui==='kit')Object.assign(naejeongUi,keep);officeTab='jobs';enterFacility('office');}else if(previousFacility==='barracks'&&document.documentElement?.dataset?.ui==='kit')enterFacility('barracks');if(!reduceMotion())$('#city-stage')?.animate?.([{translate:'24px 0',opacity:.7},{translate:'0 0',opacity:1}],{duration:160});},
 appoint:seat=>{const c=view(state).ownCities[stage.city];if(!c||inputLocked())return;Object.assign(naejeongUi,{city:c.cityId,department:seat,transferOfficer:null,jobs:false});officeTab='jobs';enterFacility('office');}
});
$('#city-stage')?.addEventListener('click',e=>{
 if(naejeongClick(e))return;
 const mode=e.target.closest?.('[data-city-mode]')?.dataset.cityMode;
 if(mode){if(mode==='overview')leaveFacility();else if(mode==='military')enterFacility('barracks');else{officeTab='jobs';naejeongUi.city=stage.city;if(mode==='production')naejeongUi.jobs=true;enterFacility('office');}return;}
 if(e.target.closest?.('.cs-world')){closeStage();return;}
 if(e.target.closest?.('.cs-back')){leaveFacility();return;}
 const entry=e.target.closest?.(':is(.cs-roster .entry,.cs-cast .face-btn,.cs-lord .act,.cs-lord .art,.cs-pulse .cs-job,.cs-pulse .cs-kit-produce)[data-spot]');
 if(entry){const id=entry.dataset.spot,root=$('#city-stage'),s=stage.art?.spots?.[id],cam=root?.querySelector('.cs-camera');if(cam&&s)cam.style.transformOrigin=`${(s.x/stage.art.w*100).toFixed(2)}% ${(s.y/stage.art.h*100).toFixed(2)}%`;root?.querySelector(`.cs-spot[data-spot="${id}"]`)?.classList?.add('on');root?.classList?.add('focus');const city=stage.city,transition=stage.transition;setTimeout(()=>{if(stage.city!==city||stage.transition!==transition)return;root?.classList?.remove('focus');enterFacility(id);},520);return;}
 const spot=e.target.closest?.('.cs-spot[data-spot]');if(spot&&!stage.fac){enterFacility(spot.dataset.spot);}
});
$('#city-stage')?.addEventListener('change',e=>{
 const c=view(state).ownCities[stage.city];if(!c)return;
 if(e.target.matches?.('[data-nj-auto]'))command(domesticIntent(c.cityId,'auto',e.target.checked));
 if(e.target.matches?.('[data-nj-job-select]')){naejeongUi.job=e.target.value;renderFacilityScene(view(state),c,cityPeople(view(state),c));}
 if(e.target.matches?.('[data-nj-army],[data-nj-troop]')){naejeongUi[e.target.matches('[data-nj-army]')?'armyId':'troopType']=e.target.value;renderFacilityScene(view(state),c,cityPeople(view(state),c));}
});
document.addEventListener('keydown',e=>{if(e.key==='Alt'&&stage.city){$('#city-stage')?.classList?.add('alt');e.preventDefault?.();}});
document.addEventListener('keyup',e=>{if(e.key==='Alt')$('#city-stage')?.classList?.remove('alt');});
// 새 화면 둘레: 세계 다이얼 · 군사 한마디 · 모드 막대 · 보고 수(새 차례 첫 화면에서 보고가 있으면 펼침)
let reportSeenTurn=null;
// C129: guidance follows production and stops after the first attack.
function firstSortieText(v){
 if(state.uiFirstAttackDone||(state.combatLog??[]).some(e=>['ATTACK','CITY','TACTIC','JOINT_TACTIC'].includes(e.kind)&&e.enemyLoss>0&&state.armies[e.attackerId]?.factionId===state.playerFactionId))return '';
 const armies=Object.values(v.ownArmies);
 if(armies.some(a=>state.armies[a.armyId]?.bornTurn===state.turn))return '출진했습니다. 목적지를 눌러 바로 이동하십시오.';
 if(!armies.length)return stage.city?'병영에서 출진하면 바로 성문 앞에 나옵니다.':'먼저 성에 들어가십시오.';
 return '';
}
function renderFirstSortie(v){const text=firstSortieText(v),p=$('#first-sortie-guide'),city=$('#city-sortie-guide');if(p){p.textContent=text;p.hidden=!text||!!stage.city;$('#status').hidden=!!text;}if(city){city.textContent=text;city.hidden=!text||!stage.city;}}
// 대상 고르기 중 위 가운데 안내 한 줄: 攻 공격 · 術 전법 · 向 방향
function renderHint(){
 const h=$('#w-hint');if(!h)return;const who=state?.officers?.[state?.armies?.[selectedArmyId]?.commanderId]?.name;let kind=null,g='',t='';
 if(pendingStrike){kind='attack';g='공격';t=strikeNotice(pendingStrike);}
 else if(selectedTacticId&&selectedArmyId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);kind='tactic';g='전법';t=`${who?who+' · ':''}${abilityName356(card)||'전법'} — 대상을 고르세요`;}
 else if(attackMode&&selectedArmyId){kind='attack';g='공격';t=`${who?who+' 부대 · ':''}공격할 적 부대나 성을 고르세요`;}
 else if(faceMode&&selectedArmyId){kind='face';g='정면';t=`${who?who+' 부대 · ':''}바라볼 쪽의 칸을 고르세요`;}
 h.hidden=!kind;if(!kind)return;h.dataset.kind=kind;h.querySelector('i').textContent=g;h.querySelector('span').textContent=t;
}
function renderShell(v){
 renderHint();renderWorldDial(v.turn);renderAdvisor(v,plateFaces());renderCampaignAdvice(v);renderFirstSortie(v);renderModeRail();
 renderSituationAdvice(v);
 renderHud(v);renderBatchUi(v);
 inkCards?.tick();
 if($('#c205-choice')?.hidden===false)for(const id of ['event-modal','choice-modal','growth-modal','visit-modal','c197-event-result','c186-turn-summary']){const el=$('#'+id);if(el)el.hidden=true;}
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
function renderSituationAdvice(v){
 if(!c207Tracker)return;const bark=c207Tracker.update(v),box=$('#w-advisor');if(!box)return;
 if(c207BarkActive!==bark){clearTimeout(c207BarkTimer);c207BarkTimer=null;c207BarkActive=bark;}
 let line=$('#c207-situation');if(!line){line=document.createElement('p');line.id='c207-situation';line.setAttribute('role','status');box.querySelector('.say')?.append(line);}
 line.hidden=!bark;box.classList.toggle('c207-speaking',!!bark);if(!bark)return;
 line.textContent=bark.line;line.dataset.event=bark.event;
 const o=v.officers[bark.speakerId],face=faceOf(bark.speakerId),host=box.querySelector('.face'),who=box.querySelector('.who');
 if(who)who.textContent=`${o?.name??officerName(bark.speakerId)} · 군사`;
 if(host){host.innerHTML=face?`<img src="${esc(face)}" alt="${esc(o?.name??'군사')}">`:faceFallback(o?.name??'군사');host.dataset.id='c207:'+bark.speakerId;}
 // Presentation acknowledgement bypasses action/animation handling and repaint recursion.
 c207Tracker.displayed(request=>{state=step(state,request);});
 if(c207Tracker.pending&&!c207BarkTimer){const tracker=c207Tracker;c207BarkTimer=setTimeout(()=>{
  c207BarkTimer=null;if(state&&c207Tracker===tracker&&c207BarkActive===bark){tracker.advance();renderSituationAdvice(view(state));renderHud(view(state));}
 },7000);}
}
function showCommandIntent(tileId,cityId){
 if(!tileId||!selectedArmyId){setCommandIntent('');return;}
 if(commandIntentCache?.state===state&&commandIntentCache.armyId===selectedArmyId&&commandIntentCache.tileId===tileId&&commandIntentCache.cityId===cityId&&commandIntentCache.tactic===selectedTacticId&&commandIntentCache.face===faceMode)return;
 commandIntentCache={state,armyId:selectedArmyId,tileId,cityId,tactic:selectedTacticId,face:faceMode};
 const v=view(state),target=mapTarget(selectedArmyId,tileId,cityId),city=v.ownCities[cityId]??v.knowledge.cities[cityId];
 const enemy=v.knowledge.observedArmies[target.targetId],name=enemy?v.officers[enemy.commanderId]?.name??'적':city?.name??'가리킨 칸';
 if(selectedTacticId){const c=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId),id=c?.targets.find(id=>(state.armies[id]??state.cities[id])?.tileId===tileId);setCommandIntent(id?commandIntentText(target,{name,tactic:abilityName356(c)}):'');return;}
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
  bars.push({pct:max?a.troopCount/max*100:100,text:troopText(a.troopCount),title:`병력 ${troopText(a.troopCount)}/${troopText(max)}`,tone:'red'});
  bars.push({pct:{STEADY:100,SHAKEN:50,ROUTING:12}[a.morale]??100,text:MORALE_NAME[a.morale]??'',title:'사기',tone:'bone'});
  if(sup)bars.push({pct:sup.max?(sup.stock??0)/sup.max*100:0,text:`${food1(sup.stock??0)}/${food1(sup.max??0)}`,title:`휴대 군량 · 보급 ${SUPPLY_LABEL[sup.state]??sup.state}${sup.model==='clock'?(sup.draining?' · 줄어드는 중':' · 보급권 안 — 줄지 않음'):''}`,tone:'teal'});}
 renderInkHud(root,{unitDock:c300DockData(v),commandRows:commandScreenRows(v),selectedCity:cityQuickId,combatWeather:{...v.combatWeather,active:v.weather?.active},turnLimit:CAMPAIGN_TURN_LIMIT,supplyRange:supplyRules.link.range,unitEngine:a?.engine??null,unitTroops:a?.troopCount,unitReinforcement:a?reinforcementText(a.nextReinforcement,v.ownCities):null,unitLocation:a?(Object.values({...v.knowledge.cities,...v.ownCities}).find(c=>c.tileId===a.tileId||c.footprint?.gates?.includes(a.tileId)||c.footprint?.walls?.includes(a.tileId))?.name??({plain:'평지',forest:'숲',hill:'언덕',mountain:'산',water:'물'})[v.tiles[a.tileId]?.terrainType]??'지형'):null,foodModel:state.trialRules?.foodModel,bandSupply:a?{name:v.officers[a.commanderId]?.name??'',supply:a.supply,label:SUPPLY_LABEL[a.supply?.state]??'보급 정보 없음',source:v.ownCities[a.supply?.sourceCityId],hub:v.hubs?.find(h=>h.hubId===a.supply?.sourceHubId),context:supplySourceText(a.supply,v),blocked:a.supply?.state==='CUT'?(Object.values(v.knowledge?.cities??{}).some(c=>c.cityId!==a.supply?.sourceCityId&&c.ownerFactionId!==v.factionId&&(c.tileId===a.tileId||c.gates?.includes(a.tileId)||c.walls?.includes(a.tileId)))?'적 성에 붙어 있어 보급이 닿지 않음':'길이 끊겨 휴대 군량으로 버팀'):a.supply?.state==='STARVING'?'군량 바닥 · 굶주림 위험':''}:null,todoLines:bandTodoLines(state,v),bandSelected:selectedTacticId??(faceMode?'face':attackMode?'attack':moveMode?'move':null),garrisonWhy:a?reasonText(garrisonReason(state,a.armyId)||''):'',remaining:Object.values(v.ownArmies).filter(u=>!armyActionEnded(state,u.armyId)).length,todo:councilPending(state)+(pendingCampaignDraft(state)?1:0)+(v.pendingEvent?1:0),ratings:a?campaignUnitRatings(state,a.armyId):null,bandMeta:a?`${troopName(a.troopType)} · ${a.engine?.name??'계통 없음'} · 병력 ${troopText(a.troopCount)}`:'',bandStatus:a?{morale:{text:MORALE_NAME[a.morale],warn:a.morale!=='STEADY'},formation:{text:`전열 ${FORMATION_NAME[a.formation??'ORDERED']??'정돈'}`,warn:a.formation!=='ORDERED'},supply:{text:a.supply?.stock<=0&&a.supply?.draining?'굶주림':a.supply?.draining?`${food1(a.supply.turnsLeft)}차례분 · 줄어드는 중`:'보급권 안',warn:!!a.supply?.draining}}:null,factionId:v.factionId,factionName:FACTION_STYLE[v.factionId]?.name,factionColor:FACTION_STYLE[v.factionId]?.color,tone,turn:endedTurn(v.turn),date:campaignDate(endedTurn(v.turn)),left:$('#turn')?.dataset?.left??'',mode:['danger','compare'].includes(infoLens)?infoLens:v3Mode(),summary:$('#summary')?.textContent,currentNews,allNews,unitBars:bars,commandIntent,food:v3View(v)?null:foodSnapshot(v),foodView:v,foodChange:lastFoodChange,unitResult:lastUnitResult,facilityResults:lastFacilityResults,combatHistory:recentCombats,recruitmentCount:(v.revealedWanderers??[]).length,unitStatus:a?{id:a.armyId,actions:selectedActions(a.armyId),action:armyActionEnded(state,a.armyId)?'이번 턴 행동 완료':state.movedArmyIds.includes(a.armyId)?'이동함 · 주 행동 확인':'행동 가능',formation:[FORMATION_NAME[a.formation??'ORDERED']??'정돈',a.stratagemText].filter(Boolean).join(' · ')}:null,council:councilPending(state)});
 syncPlatformBand(root,a?.armyId);
 syncBandFocus(a?.armyId??null,v3Mode(),false);
}
// C149: reuse the same player council text already shown in the council UI.
function bandTodoLines(s,v){
 const armies=Object.values(v.ownArmies??{}).filter(a=>a.troopCount>0),reserve=Object.values(v.ownCities??{}).reduce((n,c)=>n+(c.reserveTroops??0),0),rows=[];
 const facility=factionFacilityTodo(v);if(facility)rows.push(facility);
 if(!armies.length&&reserve>0)rows.push({action:'sortie',cityId:Object.values(v.ownCities??{}).find(c=>c.reserveTroops>0)?.cityId,text:`출진 — 예비병 ${troopText(reserve)}명은 싸우지 않습니다. 성 병영에서 부대를 내세요`});
 const capital=v.ownCities?.[v.faction?.capitalCityId],at=capital&&v.tiles?.[capital.tileId];
 if(at&&!armies.some(a=>a.tileId===capital.tileId)){
  const foes=Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.factionId!==v.factionId&&a.troopCount>0&&v.knowledge.tiles[a.tileId]==='VISIBLE'&&v.tiles?.[a.tileId]&&hexDistance(at,v.tiles[a.tileId])<=3);
  if(foes.length){const names=new Map(campaignMapModel(v).units.map(u=>[u.id,u.name]));rows.push({action:'capital',cityId:capital.cityId,text:`수도 방어 — 적 ${foes.map(a=>v.officers?.[a.commanderId]?.name??names.get(a.armyId)??'부대').join(' · ')}이(가) 가까이 왔습니다. 수도에 부대가 없습니다`});}
 }
 for(const r of s.council?.resolutions??[]){
  if(r.status!=='ACTIVE'||!['CITY_DEVELOP','RECRUIT'].includes(r.kind))continue;
  const target=r.target,city=v.ownCities?.[target.cityId]??(r.kind==='RECRUIT'?v.knowledge?.cities?.[target.cityId]:null);if(!city)continue;
  rows.push({action:r.kind==='CITY_DEVELOP'?'production':'recruit',cityId:city.cityId,text:r.kind==='CITY_DEVELOP'?`${v.officers[r.proposerId]?.name??'결의'} · ${city.name}에 ${particle(CITY_JOBS[target.facility]?.name??'시설','을/를')} 세운다 — 생산 바꾸기`:`등용 결의 · ${city.name} 주점에서 ${particle(v.officers[target.officerId]?.name??'재야 장수','을/를')} 부르세요`});
 }
 if(councilPending(s)){const pending=s.council.proposals.filter(p=>p.decision===null);rows.push(...pending.map(p=>({action:p.kind==='CITY_DEVELOP'?'production':p.kind==='RECRUIT'?'recruit':'council',cityId:p.target?.cityId,text:`${v.officers[p.proposerId]?.name??'평정'} · ${josa(p.what)}`})));rows.push({action:'council',text:'평정 · 이번 달 안건 마무리'});
}
 if(pendingCampaignDraft(s))rows.push({action:'growth',text:'장수 성장 · 선택 대기'});
 if(v.pendingEvent)rows.push({action:'event',text:'사건 · 선택 대기'});
 return rows;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-c271-task]');if(!b||!state)return;const action=b.dataset.c271Task;if(action==='council'){councilOpen=true;renderCouncil();}else if(action==='growth')renderGrowthDraft();else if(action==='event')renderEventCard(view(state));else{const v=view(state),city=v.ownCities[b.dataset.c271City]??v.knowledge?.cities?.[b.dataset.c271City];if(city){panToTile(city.tileId);if(action==='production')openProdPop(city.cityId,e,reasonText);else if(action==='recruit'){if(v.ownCities[city.cityId])openStage(city.cityId,'tavern');else{openCity(city.cityId);$('#status').textContent=`${city.name}을 차지한 뒤 주점에서 재야 장수를 부르세요.`;}}else openCity(city.cityId);}}});
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
 ${v.factionId==='F02'?`<h3>피란 대열</h3>${p.refugees?.length?`<ul class="fp-list">${p.refugees.map(x=>`<li><b>주민 ${x.population??0} · 예비병 ${troopText(x.reserveTroops??0)}</b> <span>${(x.officerIds??[]).length?'장수 '+x.officerIds.map(id=>esc(v.officers[id]?.name??id)).join(', '):''}</span></li>`).join('')}</ul>`:'<p class="muted">없음 — 성을 잃으면 주민 절반·예비병·자유 장수가 가까운 성으로 탈출합니다.</p>'}`:''}
 ${p.actions?.length?`<h3>별의 길 행동</h3><ul class="fp-list">${p.actions.map(a=>`<li><b>${esc(v.officers[a.officerId]?.name??a.officerId)} · ${a.role==='ARMY'?'부대장':'태수'}</b> <span>${esc(a.axis)} → ${esc(a.name)}: ${esc(a.description)}</span><small>${a.canUse?'지금 쓸 수 있음':a.readyTurn>state.turn?`대기 ${a.readyTurn-state.turn}턴`:esc(reasonText(a.blockedReason))}</small></li>`).join('')}</ul>`:''}`:'<p class="muted">이 지도에서는 세력 정책이 꺼져 있습니다.</p>';
 $('#faction-content').innerHTML=`<div class="fx-grid">${side}<div class="fx-main">${$('#faction-content').innerHTML}${recruitmentLeadsHtml(v)}${diplomacySection(v)}</div></div>`;
 {const im=$('#faction-content .fx-ruler');if(im&&im.dataset.cut==='0'){im.style.opacity='0';cutout(im.getAttribute('src')).then(u=>{if(im.isConnected){im.src=u??im.src;im.style.opacity='';}});}}
 if(v3View(v))$('#faction-content .fx-main').innerHTML+=resourceDetailsV3(v);
 else if(r)$('#faction-content .fx-main').innerHTML+=`<h3>연구</h3><p>학문 ${Math.round(r.science??0)}${Number.isFinite(r.nextThreshold)?` / 다음 문턱 ${r.nextThreshold}`:' · 모든 단계 해금'} · ${r.stage}단계</p>${r.unlocks?.length?`<p class="muted">해금: ${r.unlocks.map(u=>esc(u.name??u)).join(' · ')}</p>`:''}`;
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
let c205Deferred=false,c205Pick=null,c205OfferKey=null,c205MemorySeen=false;
let c205Stamped=new Set();
function resetAmbitionUi(){c205Deferred=false;c205Pick=null;c205OfferKey=null;c205MemorySeen=false;c205Stamped=new Set();}
function closeAmbitionUi(){
 if(ambitionScreenOffer(view(state),c205Deferred,state.phase)?.kind!=='ambition')return;
 c205Deferred=true;c205Pick=null;render();scheduleOrders();scheduleAi();
}
function chooseAmbitionUi(id){
 const offer=ambitionScreenOffer(view(state),c205Deferred,state.phase);if(!offer)return;
 if(id!==null&&!offer.choices.some(c=>c.id===id))return;
 try{state=step(state,offer.kind==='ambition'?{type:'CHOOSE_AMBITION',ambitionId:id}:{type:'CHOOSE_ORDER',orderId:id});c205Pick=null;render();scheduleOrders();scheduleAi();}
 catch(error){$('#c205-error').textContent=errorText(error);}
}
function renderAmbitionUi(v){
 let modal=$('#c205-choice');
 if(!modal){
  document.body.insertAdjacentHTML('beforeend','<div id="c205-choice" class="w-modal" hidden><section class="c205-sheet" role="dialog" aria-modal="true" aria-labelledby="c205-title"><figure class="c205-ruler"></figure><div class="c205-main"><header><h1 id="c205-title"></h1><span class="c205-faction-seal"></span><button type="button" data-c205-close aria-label="닫고 나중에 뜻 고르기">나중에 고르기 ×</button></header><p class="c205-intro"></p><div class="c205-cards"></div><footer><button type="button" data-c205-confirm disabled>카드를 고르세요</button><button type="button" data-c205-skip></button></footer><p id="c205-error" role="status"></p></div></section></div>');
  modal=$('#c205-choice');
  modal.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-c205-pick')&&typeof crossroadsEligible==='function'&&typeof ritualEnabled==='function'&&crossroadsEligible(modal.dataset.kind,ambitionScreenOffer(view(state),c205Deferred,state.phase)?.choices,ritualEnabled())){chooseAmbitionUi(b.dataset.c205Pick);return;}
   if(b.hasAttribute('data-c205-pick')){c205Pick=b.dataset.c205Pick;renderAmbitionUi(view(state));modal.querySelector(`[data-c205-pick="${c205Pick}"]`)?.focus();}
   else if(b.hasAttribute('data-c205-confirm'))chooseAmbitionUi(c205Pick);
   else if(b.hasAttribute('data-c205-skip'))chooseAmbitionUi(null);
   else if(b.hasAttribute('data-c205-close'))closeAmbitionUi();
  });
 }
 const offer=combatAnimating?null:ambitionScreenOffer(v,c205Deferred,state.phase),wasHidden=modal.hidden;
 modal.hidden=!offer;
 if(offer){
  const changed=c205OfferKey!==offer.key;if(changed){c205OfferKey=offer.key;c205Pick=null;$('#c205-error').textContent='';}
  if(!offer.choices.some(c=>c.id===c205Pick))c205Pick=null;
  modal.dataset.kind=offer.kind;$('#c205-title').textContent=offer.title;
  const ruler=state.factions[v.factionId]?.rulerId,art=fullArt(ruler),seal=C190_SEALS[v.factionId];
  const figure=modal.querySelector('.c205-ruler'),src=art?.src??'';
  if(figure.dataset.src!==src){figure.dataset.src=src;figure.innerHTML=src?`<img src="${esc(src)}" alt="${esc(state.officers[ruler]?.name)}">`:'';}
  modal.querySelector('.c205-faction-seal').innerHTML=seal?`<img src="${C190_ART[seal.art]}" alt="${esc(factionName(v.factionId))}">`:'';
  modal.querySelector('[data-c205-close]').hidden=offer.kind!=='ambition';
  modal.querySelector('.c205-intro').textContent=offer.kind==='ambition'?`이번 생에는 무엇을 다르게 할 것인가 · ${v.ambition.chooseUntilTurn}차례까지 고를 수 있습니다`:`${v.orders.offer.deadline}차례 말까지 · 하나를 고르거나 이번 군령을 넘기세요`;
  const faces=Object.fromEntries(offer.choices.flatMap(c=>c.goal?.officers??[c.goal?.officer]).filter(Boolean).map(id=>[id,faceOf(id)]));
  modal.querySelector('.c205-cards').innerHTML=ambitionCardsHtml(offer,c205Pick,faces,AMBITIONS.orders.rewards);
  if(typeof decorateCrossroads==='function'&&typeof crossroadsEligible==='function'&&typeof ritualEnabled==='function')decorateCrossroads(modal.querySelector('.c205-cards'),crossroadsEligible(offer.kind,offer.choices,ritualEnabled()));
  const confirm=modal.querySelector('[data-c205-confirm]');confirm.disabled=!c205Pick;confirm.textContent=c205Pick?'선택 확정':'카드를 고르세요';
  modal.querySelector('[data-c205-skip]').textContent=offer.skipLabel;
  if(wasHidden||changed)modal.querySelector('[data-c205-pick]')?.focus();
 }
 let bands=$('#c205-bands');if(!bands){document.body.insertAdjacentHTML('beforeend','<div id="c205-bands"><aside id="c205-band" aria-label="뜻과 군령"></aside></div>');bands=$('#c205-bands');}
 const oath=$('#c197-oath-band');if(oath&&oath.parentElement!==bands)bands.prepend(oath);
 const band=$('#c205-band'),html=ambitionBandHtml({...v,turnLimit:CAMPAIGN_TURN_LIMIT}),open=[...band.querySelectorAll('details[open]')].map(d=>d.dataset.c205Detail);
 if(band.dataset.html!==html){band.innerHTML=html;band.dataset.html=html;for(const d of band.querySelectorAll('details')){d.open=open.includes(d.dataset.c205Detail);if(d.classList.contains('c205-achieved')&&!c205Stamped.has(d.dataset.c205Detail)){d.classList.add('c205-stamp');c205Stamped.add(d.dataset.c205Detail);}}}
 band.hidden=!html||!!v.gameResult;
 const reopen=band.querySelector('[data-c205-reopen]');if(reopen)reopen.onclick=()=>{c205Deferred=false;render();};
}
document.addEventListener('keydown',e=>{
 const modal=$('#c205-choice');if(!modal||modal.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeAmbitionUi();}
 if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not([disabled]):not([hidden])')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
},true);
function eventBlockedText(reason){
 const p=state.c22?.pending[state.playerFactionId],c=state.cities[p?.roles?.city??p?.cityId],need=/^(식량|인망|예비병) (\d+) 필요$/.exec(reason);
 if(need){const n=Number(need[2]);if(need[1]==='식량'&&c){const now=domesticFoodAvailable(state,c),local=Math.max(0,c.foodStock-(c.reservedResources?.food??0)),scope=now===local?'이 성의':'공유 창고의';return `${scope} 쓸 수 있는 식량이 모자랍니다(필요 ${n} · 지금 ${cityNumber(now)})`;}
 if(need[1]==='예비병'&&c)return `이 성의 예비병이 모자랍니다(필요 ${troopText(n)} · 지금 ${troopText(c.reserveTroops)})`;
 if(need[1]==='인망')return `쓸 수 있는 인망이 모자랍니다(필요 ${n} · 지금 ${cityNumber(state.factions[state.playerFactionId].prestige-(state.captiveRecruitment?.factions[state.playerFactionId]?.reservedPrestige??0))})`;
 }
 if(reason==='임명할 장수 없음')return '이 사건의 후보 중 우리 세력 소속으로 이 성에 머무는 장수가 필요합니다(살아 있고 포로·이동·부대 지휘 중이 아닌 장수).';
 return reasonText(reason);
}
document.addEventListener('keydown',e=>{const modal=$('#event-modal');if(!state||!modal||modal.hidden)return;if(document.querySelector?.('#save-confirm:not([hidden])'))return;if(document.documentElement?.dataset.ui==='kit'&&document.querySelector?.('#c254-card:not([hidden]),.c273-ritual'))return;if(e.target.closest('input,textarea,select'))return;e.stopImmediatePropagation();if(e.repeat&&document.documentElement?.dataset.ui==='kit'){e.preventDefault();return;}if(/^[1-3]$/.test(e.key)){e.preventDefault();if(!modal.classList.contains('c271-peeking'))modal.querySelectorAll('[data-event-choice]')[Number(e.key)-1]?.click();}else if(e.key==='Enter'){e.preventDefault();if(!modal.classList.contains('c271-peeking'))modal.querySelector('[data-event-confirm]:not([disabled])')?.click();}else if(e.key==='Escape'&&modal.classList.contains('c271-peeking')){e.preventDefault();modal.querySelector('[data-c271-peek]')?.click();}else if(e.key==='Escape'){e.preventDefault();modal.querySelector('[data-event-back]')?.click();}},true);
let c262EventPick=null;
function renderEventCard(v=view(state)){
 renderEventDeckUi(v);
 const modal=$('#event-modal');if(!modal)return;
 const kit=typeof document!=='undefined'&&document.documentElement?.dataset.ui==='kit';
 modal.classList.toggle?.('c297-event',kit);
 const e=v.pendingEvent;if(typeof crossroadsEligible==='function'&&typeof ritualEnabled==='function')modal.classList.toggle('c273-event',crossroadsEligible('event',e?.choices,ritualEnabled()));modal.hidden=!e||combatAnimating||!!state.gameResult||!!pendingCampaignDraft(state);if(modal.hidden)return;
 menuOpen=false;$('#unit-menu').hidden=true;
 const crisis=e.scale==='CRISIS'||e.eventId==='CRISIS_HEGEMONY';
 if(c262EventPick?.eventId!==e.eventId||!e.choices.some(c=>c.id===c262EventPick?.choiceId&&!c.blockedReason))c262EventPick=null;
 {const when=eventDeckCard(e.eventId)?.trigger?.when,k=crisis?'CRISIS':e.eventId.startsWith('EV-')?({FOOD_LOW:'E03',OFFICER_PAIR:'E05',PLACE:'E06',AFTER_BATTLE:'E04',CITY_BESIEGED:'CRISIS',CITY_CAPTURED:'E02',TURN_START:'E01'}[when]??'E01'):e.eventId;$('#event-art').src=v3Asset(`events/${k}.webp`)??`/assets/event-art/${esc(k)}_v1.jpg`;}
 $('#event-scale').textContent=(EVENT_SCALE[e.scale]??'사건')+(e.eventId.startsWith('EV-ECHO-')?' · 메아리':'');$('#event-scale').className='ev-scale'+(crisis?' crisis':'');
 $('#event-title').textContent=e.title;
 $('#event-place').textContent=[e.cityName,...(e.officerNames??[]),eventDeckCard(e.eventId)?.requiresTwist?.length?'이어짐':''].filter(Boolean).join(' · ');
 $('#event-text').innerHTML=eventTextHtml(e.text,e);
 let peek=modal.querySelector('[data-c271-peek]');if(!peek){peek=document.createElement('button');peek.className='k-btn c271-peek';peek.dataset.c271Peek='';peek.textContent='지도 보기';peek.onclick=()=>{const on=modal.classList.toggle('c271-peeking');peek.textContent=on?'사건으로':'지도 보기';peek.setAttribute('aria-pressed',String(on));};modal.append(peek);}
 if(modal.dataset.c271Event!==e.eventId){modal.dataset.c271Event=e.eventId;modal.classList.remove('c271-peeking');peek.textContent='지도 보기';peek.setAttribute('aria-pressed','false');}
 // 흑묵(page-event): 두 사람 판 — 이 일에 얽힌 장수(없으면 군주)의 얼굴·이름·능력 셋
 {const duo=$('#event-duo');if(duo){const own=Object.values(v.officers??{}),gov=Object.values(v.ownCities??{}).find(c=>c.name===e.cityName)?.governorId;
  const ids=[...new Set([...(e.officerNames??[]).map(n=>own.find(o=>o.name===n)?.officerId),gov].filter(Boolean))].slice(0,2);
  duo.hidden=!ids.length;duo.innerHTML=ids.map((id,i)=>{const o=v.officers[id],f=faceOf(id);return `<span class="who w${i+1}"><span class="pic">${f?`<img src="${esc(f)}" alt="">`:''}</span><b>${esc(o?.name??'')}</b><small>${esc(officerRole(v,id)||'장수')}</small></span>`;}).join('');}}

 // 흑묵(page-event): 선택지 = 그림 카드(창 = 선택 그림 또는 사건 그림 한 조각) + 각 카드 바로 아래 비용·효과 미리보기
 const evArt=$('#event-art').src,n=e.choices.length,fx=x=>esc(x.blockedReason?eventBlockedText(x.blockedReason):Number.isFinite(x.oath?.deadline)?x.preview.replace(/\(\d+차례 말까지\)/g,`(${x.oath.deadline}차례 안)`):x.preview);
 $('#event-choices').style?.setProperty?.('--n',n);
 $('#event-choices').innerHTML=kit?eventChoiceMarkup297(e,{locked:inputLocked(),selected:c262EventPick?.choiceId}):e.choices.map((c,i)=>{const card=v3Asset(`cards/${EV_CARD[e.eventId]?.[i]??EV_CARD_WORD.find(([,re])=>re.test(c.label))?.[0]??'wait'}.webp`),route=({history:'역사대로',twist:'다르게',defer:'미룬다'})[c.id],label=route?c.label.replace(/^(역사대로|다르게)\s*[—–-]\s*/,''):c.label;return `<button class="ev-choice${card?' has-card':''}" data-event-choice="${esc(c.id)}" aria-label="${esc(c.label)}" title="${fx(c)}" style="--art:url(${card??evArt});--pos:${n>1?Math.round(i/(n-1)*100):50}%" ${c.blockedReason||inputLocked()?'disabled':''}><span class="ev-card-face"><span class="key">${i+1}</span><b><span>${esc(label)}</span></b></span><small>${route?`<strong class="c197-route">${route}</strong>`:''}${Number.isFinite(c.oath?.deadline)?`<strong class="c271-deadline">${c.oath.deadline}차례 안</strong>`:''}${[...eventCostLines(c).map(esc),...fx(c).split(/\s*\|\s*|\s+·\s+/)].map(t=>`<span class="c262-effect ${/실패|소모|감소|잃/.test(t)?'loss':/성공|획득|증가|얻/.test(t)?'gain':''}">${t}</span>`).join('')}</small></button>`;}).join('');
 if(!kit&&typeof decorateCrossroads==='function'&&typeof crossroadsEligible==='function'&&typeof ritualEnabled==='function')decorateCrossroads($('#event-choices'),crossroadsEligible('event',e.choices,ritualEnabled()));
 if(!kit&&(crisis||e.choices.some(c=>eventNeedsConfirmation(e,c)))){$('#event-choices').insertAdjacentHTML('beforeend',`<button class="k-btn k-btn-primary c262-event-confirm" data-event-confirm ${c262EventPick?'':'disabled'}>이대로</button>`);for(const b of $('#event-choices').querySelectorAll('[data-event-choice]'))b.setAttribute('aria-pressed',String(b.dataset.eventChoice===c262EventPick?.choiceId));}
}

let c197ResultSeen=null;
function renderEventDeckUi(v){
 if(!state.prologue&&state.eventDeck)writeRecentEventIds(undefined,v.eventDeckSeen??[]);
 let band=$('#c197-oath-band');if(!band){document.body.insertAdjacentHTML('beforeend','<aside id="c197-oath-band" aria-label="맹세"></aside>');band=$('#c197-oath-band');}
 band.innerHTML=oathBandHtml(v.oaths);band.hidden=!band.innerHTML||!!state.gameResult;
 let result=$('#c197-event-result');if(!result){document.body.insertAdjacentHTML('beforeend','<div id="c197-event-result" class="modal-backdrop" hidden><section class="panel k-card-paper" role="dialog" aria-modal="true" aria-labelledby="c197-result-title"><h2 id="c197-result-title"></h2><p class="c197-effect"></p><p class="c197-dejavu"></p><button class="btn" type="button">지도로</button></section></div>');result=$('#c197-event-result');}
 const e=v.eventResult,key=e?`${e.eventId}.${e.turn}`:null;result.hidden=!e||c197ResultSeen===key||!!v.pendingEvent||combatAnimating||!!state.gameResult;
 if(!result.hidden){$('#c197-result-title').textContent=e.title;result.querySelector('.c197-effect').textContent=displayKorean(e.text);result.querySelector('.c197-dejavu').textContent=e.dejaVu?`기시감: ${e.dejaVu}`:'';result.querySelector('button').onclick=()=>{c197ResultSeen=key;result.hidden=true;render();};}
}

$('#event-choices')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-event-choice]')?.dataset.eventChoice,ev=state&&view(state).pendingEvent;if(!ev||e.target.closest('button')?.disabled)return;if(e.target.closest('[data-event-back]')){const previous=c262EventPick?.choiceId;c262EventPick=null;renderEventCard();$('#event-choices').querySelector(`[data-event-choice="${previous}"]`)?.focus();return;}const confirm=!!e.target.closest('[data-event-confirm]'),crisis=eventNeedsConfirmation(ev,ev.choices.find(c=>c.id===id));if(crisis&&!confirm&&id){c262EventPick={eventId:ev.eventId,choiceId:id};renderEventCard();if(document.documentElement?.dataset.ui==='kit')$('#event-choices [data-event-confirm]')?.focus();return;}const choiceId=confirm?c262EventPick?.choiceId:id;if(!choiceId||!ev.choices.some(c=>c.id===choiceId&&!c.blockedReason)||confirm&&c262EventPick?.eventId!==ev.eventId)return;
 try{state=step(state,{type:'EVENT_CHOICE',eventId:ev.eventId,choiceId});c262EventPick=null;$('#event-error').textContent='';render();scheduleOrders();autoNextUnit();}catch(err){$('#event-error').textContent=errorText(err);}});
// 외교(C43) — 세력 창 '외교' 칸 + 받은 제안은 선택 창. 화면은 다시 만들 예정이라 기능 확인용
function supplyDuration(n){if(!Number.isFinite(n)||n<0)return '';if(n>0&&n<0.1)return '0.1차례분 미만';return `${Number.isInteger(n)?'':'약 '}${food1(n)}차례분`;}
const SUPPLY_LABEL={SAFE:'안전',DISRUPTED:'불안',CUT:'끊김',STARVING:'굶주림'},food1=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const DIPLO_KIND={TRUCE:'휴전',ALLIANCE:'동맹'},DIPLO_STATE={WAR:'전쟁',TRUCE:'휴전',ALLIANCE:'동맹'};
function diplomacyFeedback(before,after){
 const old=before.c43?.history?.length??0;for(const e of (after.c43?.history??[]).slice(old)){if(e.type!=='ACCEPT'||e.kind!=='TRUCE'||![e.from,e.to].includes(after.playerFactionId))continue;const other=e.from===after.playerFactionId?e.to:e.from,line='휴전 수락 — '+diplomacyTimingText(diplomacyTiming(after,after.playerFactionId,other));$('#status').textContent=line;inkToast(line);recordNotices=[...recordNotices,{turn:after.turn,line}].slice(-20);}
}
const DIPLO_TEXT={TRUCE:'다음 차례부터 3차례 동안 서로 공격하지 않고 상대 땅에 새로 들어가지 않습니다. 상대 땅에 있던 부대는 철수하는 동안 보호받습니다.',ALLIANCE:'서로 공격하지 않습니다. 자동으로 함께 싸우지는 않습니다.'};
function diplomacySection(v){
 const d=v.diplomacy;if(!d)return '';
 const btn=(f,kind)=>{const c=f.canPropose?.[kind];if(!c)return '';const tip=[kind==='TRUCE'?diplomacyTimingText(diplomacyTiming(state,v.factionId,f.factionId,kind)):'',c.reason,...(c.effectLines??[]),Number.isFinite(c.score)?`받을 점수 ${c.score}(0 이상이면 받음)`:''].filter(Boolean).join('\n');return `<button class="btn sm" data-diplo-propose="${esc(f.factionId)}" data-kind="${kind}" ${c.ok&&!inputLocked()?'':'disabled'} title="${esc(tip)}">${DIPLO_KIND[kind]} 제안</button>`;};
 const bar=(label,val,min,max,cls='')=>{const pct=Math.max(0,Math.min(100,((val??0)-min)/(max-min)*100));return `<span class="dp-bar ${cls}"><small>${label}</small><i><b style="width:${pct.toFixed(0)}%"></b>${min<0?'<s></s>':''}</i><em>${val??'—'}</em></span>`;};
 const medal=f=>{const rf=faceOf(state.factions?.[f.factionId]?.rulerId);return `<span class="dp-medal">${rf?`<img src="${esc(rf)}" alt="">`:''}<i class="flag" style="--em:url(/assets/ui-v3/emblems/${esc(f.factionId)}.png)"></i></span>`;}; // 흑묵(page-diplomacy): 군주 둥근 메달 + 세력 깃발
 const card=f=>`<li class="dp-card" data-state="${esc(f.state)}" style="--fc:${FACTION_STYLE[f.factionId]?.color??'#777'}"><header>${medal(f)}${emblemHtml(f.factionId)}<b>${esc(f.name??FACTION_STYLE[f.factionId]?.name??f.factionId)}</b><em class="dp-state">${diplomacyTiming(state,v.factionId,f.factionId).pending?'합의'+' · '+diplomacyTimingText(diplomacyTiming(state,v.factionId,f.factionId))+' · ':''}${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}</em></header>${f.contact===false?'<p class="muted">아직 만나지 않았습니다.</p>':''}<div class="dp-bars">${bar('우리를 보는 마음',f.opinionOfMe,-100,100,'op'+((f.opinionOfMe??0)<0?' neg':''))}${bar('신용',f.trust,0,100,'tr')}${bar('위협',f.threat,0,100,'th'+((f.threat??0)>=50?' neg':''))}</div>${(f.opinionReasons??[]).length?`<ul class="dp-why">${f.opinionReasons.map(x=>`<li><span>${esc(x.text)}</span><b class="${x.value<0?'neg':''}">${x.value>0?'+':''}${x.value}</b>${Number.isFinite(x.turnsLeft)?`<small>${x.turnsLeft}차례</small>`:''}</li>`).join('')}</ul>`:''}<footer>${f.contact===false?'':f.state==='ALLIANCE'?`<button class="btn sm" data-diplo-end="${esc(f.factionId)}" ${f.endingAt||inputLocked()?'disabled':''}>동맹 종료</button>`:btn(f,'TRUCE')+btn(f,'ALLIANCE')}</footer></li>`;
 const rows=(d.factions??[]).map(card).join('');const rowsOld=(d.factions??[]).map(f=>`<li class="dp-row" data-state="${esc(f.state)}"><span class="emblem" data-faction="${esc(f.factionId)}">${FACTION[f.factionId]?.glyph??'中'}</span><b>${esc(f.name??FACTION_STYLE[f.factionId]?.name??f.factionId)}</b><em class="dp-state">${diplomacyTiming(state,v.factionId,f.factionId).pending?'합의'+' · '+diplomacyTimingText(diplomacyTiming(state,v.factionId,f.factionId))+' · ':''}${DIPLO_STATE[f.state]??f.state}${Number.isFinite(f.turnsLeft)?` ${f.turnsLeft}차례`:''}${f.endingAt?` · ${f.endingAt}턴 종료`:''}</em><span class="dp-acts">${f.contact===false?'<small>아직 만나지 않음</small>':`${f.state==='ALLIANCE'?`<button class="btn sm" data-diplo-end="${esc(f.factionId)}" ${f.endingAt||inputLocked()?'disabled':''}>동맹 종료</button>`:btn(f,'TRUCE')+btn(f,'ALLIANCE')}`}</span>${Number.isFinite(f.opinionOfMe)?`<div class="dp-axes"><span class="dp-op" title="이 세력이 나를 보는 마음(−100~100)">나를 보는 호감 <b class="${f.opinionOfMe>=0?'up':'down'}">${f.opinionOfMe>0?'+':''}${f.opinionOfMe}</b></span>${Number.isFinite(f.trust)?`<span title="약속을 지키면 오르고 기습·배신하면 떨어짐">신용 <b>${f.trust}</b></span>`:''}${Number.isFinite(f.threat)?`<span title="성을 빼앗을수록 오름 — 50 이상이면 다른 세력이 견제 동맹">위협 <b class="${f.threat>=50?'down':''}">${f.threat}</b></span>`:''}</div>${(f.opinionReasons??[]).length?`<ul class="dp-reasons">${f.opinionReasons.map(r=>`<li><span>${esc(r.text)}</span><b class="${r.value>=0?'up':'down'}">${r.value>0?'+':''}${r.value}</b><small>${Number.isFinite(r.turnsLeft)?`${r.turnsLeft}차례`:'계속'}</small></li>`).join('')}</ul>`:''}`:''}${['TRUCE','ALLIANCE'].map(k=>f.canPropose?.[k]?.ok&&f.canPropose[k].effectLines?.length?`<small class="dp-why">${DIPLO_KIND[k]}: ${esc(f.canPropose[k].effectLines.join(' · '))}${Number.isFinite(f.canPropose[k].score)?` → ${f.canPropose[k].score}`:''}</small>`:'').join('')}</li>`).join('');
 const prot=(d.protectedArmies??[]).length?`<p class="muted">철수 보호 중: ${d.protectedArmies.map(a=>`${esc(v.officers[v.ownArmies[a.armyId]?.commanderId]?.name??a.armyId)}(${a.until}턴까지)`).join(', ')}</p>`:'';
 const me=d.me?`<p class="dp-me">우리 신용 <b>${d.me.trust}</b> · 우리 위협 <b class="${d.me.threat>=50?'down':''}">${d.me.threat}</b> <small>(위협 50 이상이면 다른 세력들이 견제 동맹)</small></p>`:'';
 return `<h3>외교</h3>${me}<ul class="dp-cards">${rows||'<li class="muted">외교 상대 없음</li>'}</ul>${prot}<p class="muted">휴전은 다음 차례부터 3차례 · 동맹은 서로 공격 금지(자동 참전 없음) · 거절되면 같은 제안은 3차례 뒤에</p>`;
}
// ── 평정(기준 final-council-v2) — 엔진 campaign-council(C90), 화면 council-world.mjs. 왼쪽 '평정' 단추로 엶 ──
let councilOpen=false;
function renderCouncil(){
 const host=$('#council');if(!host)return;host.hidden=!councilOpen||!state;if(host.hidden)return;
 const me=state.playerFactionId;
 renderCouncilWorld(host,state,{dispatch:cmd=>{state=step(state,cmd);},rerender:()=>render(),close:()=>{councilOpen=false;render();},fullArt:id=>fullArt(id),face:id=>faceOf(id),cutout,followResolution:r=>{if(r.kind==='CITY_DEVELOP')openProdPop(r.target.cityId,null,reasonText);else{const v=view(state),c=v.ownCities[r.target.cityId]??v.knowledge?.cities?.[r.target.cityId];if(v.ownCities[r.target.cityId])openStage(r.target.cityId,'tavern');else if(c){panToTile(c.tileId);openCity(c.cityId);$('#status').textContent=`${c.name}을 차지한 뒤 주점에서 재야 장수를 부르세요.`;}}},
  bg:v3Asset('city-stage/facility-council.webp')??v3Asset('city-stage/facility-office.webp'),factionColor:FACTION_STYLE[me]?.color,toast:msg=>{const s=$('#status');if(s)s.textContent=msg;}});
}
document.addEventListener?.('ink:council',()=>{if(!state)return;councilOpen=true;renderCouncil();});
document.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&councilOpen){if(councilEscape($('#council')))renderCouncil();else{councilOpen=false;renderCouncil();}}});
// ── 흑묵 외교 화면(기준 page-diplomacy): 지도 그림 위 군주 메달 · 관계 판 · 행동 카드 · 관계 막대 — 전부 그림판. 고른 세력 = diploPick ──
let diploOpen=false,diploPick=null;
const hueOfHex=hex=>{const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex??'');if(!m)return 0;const [r,g,b]=m.slice(1).map(x=>parseInt(x,16)/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return 0;const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return Math.round(h*60+360)%360;};
let c262DiplomacyReply=null;
function renderDiplo(){
 const host=$('#diplo');if(!host)return;host.hidden=!diploOpen||!state;if(host.hidden)return;
 const v=view(state),d=v.diplomacy;
 const close='<button class="k-btn dq-close" data-diplo-close>닫기 · Esc</button>';
 if(!d){host.innerHTML='<p>이 판에서는 외교가 꺼져 있습니다.</p>'+close;return;}
 const fs=d.factions??[],pick=fs.find(f=>f.factionId===diploPick)??fs.find(f=>f.contact!==false)??fs[0];diploPick=pick?.factionId??null;
 const nameOf=f=>f.name??FACTION_STYLE[f.factionId]?.name??f.factionId;
 const portrait=fid=>fullArt(state.factions?.[fid]?.rulerId)?.src;
 const medal=(fid,size)=>`<span class="k-medallion c262-medal" style="--size:${size}px">${faceOf(state.factions?.[fid]?.rulerId)?`<img src="${esc(faceOf(state.factions?.[fid]?.rulerId))}" alt="">`:''}</span>`;
 const stateText=f=>f.contact===false?'아직 만나지 않음':`${DIPLO_STATE[f.state]??f.state}${diplomacyTiming(state,v.factionId,f.factionId).pending?' · '+diplomacyTimingText(diplomacyTiming(state,v.factionId,f.factionId)):''}${Number.isFinite(f.turnsLeft)?' · '+f.turnsLeft+'차례 남음':''}${Number.isFinite(f.endingAt)?` · ${f.endingAt}차례에 종료`:''}`;
 const offer=(label,attr,c,odds,subtitle)=>`<button class="k-btn dq-act${c?.ok?'':' k-disabled'}" ${attr} ${c?.ok&&!inputLocked()?'':'disabled'} title="${esc([c?.reason,...(c?.effectLines??[])].filter(Boolean).join(' · '))}"><span>${label}<small>${esc(c?.reason||subtitle||(c?.effectLines??[]).join(' · ')||'조건 없음')}</small></span>${diplomacyLikelihoodHtml(odds)}</button>`;
 const act=(kind)=>offer(`${DIPLO_KIND[kind]} 제안`,`data-diplo-propose="${esc(pick.factionId)}" data-kind="${kind}"`,pick.contact===false?{reason:'아직 만나지 않음'}:pick.canPropose?.[kind],pick.contact===false?null:pick.aiStance?.[kind]??pick.canPropose?.[kind],kind==='TRUCE'?diplomacyTimingText(diplomacyTiming(state,v.factionId,pick.factionId,kind)):DIPLO_TEXT.ALLIANCE);
 const adviserId=Object.values(v.ownCities??{}).map(c=>c.governorId).find(id=>v.officers?.[id]);
 const adviser=adviserId?v.officers[adviserId]:null;
 const advice=pick?.contact===false?'먼저 상대와 접촉해야 합니다.':pick?.aiStance?Object.entries(pick.aiStance).filter(([,c])=>Number.isFinite(c.score)).map(([k,c])=>`${DIPLO_KIND[k]} ${c.score>=0?'수락 예상':'거절 예상'}`).join(' · '):'아직 판단할 정보가 없습니다.';
 const op=pick?.contact===false?null:pick?.opinionOfMe;
 const attitude=op==null?'미접촉':op>=20?'우호':op<=-20?'적대':'보통';
 const kit=document.documentElement?.dataset?.ui==='kit';
 if(kit)host.innerHTML=diplomacyKitHtml(v,pick,{nameOf,medal,portrait,locked:inputLocked(),facts:pick?diplomacyScreenFacts(state,v.factionId,pick.factionId):null,timings:Object.fromEntries(fs.map(f=>[f.factionId,diplomacyTiming(state,v.factionId,f.factionId)])),reply:c262DiplomacyReply?.state===state&&c262DiplomacyReply.factionId===pick?.factionId?c262DiplomacyReply:null});
 else host.innerHTML=`<h1>외교</h1><aside class="c262-factions k-panel-ink"><header>${medal(v.factionId,88)}<b>${esc(FACTION_STYLE[v.factionId]?.name??'우리')}</b></header><p class="c271-reputation">신용 ${esc(v.diplomacy?.me?.trust??'—')} · 위협 ${esc(v.diplomacy?.me?.threat??'—')} · 인망 ${esc(v.faction?.prestige??'—')}</p>${fs.map(f=>`<button class="c262-faction${f===pick?' on':''}${f.contact===false?' far':''}" data-diplo-pick="${esc(f.factionId)}" data-state="${esc(f.state)}">${f.contact===false?'':medal(f.factionId,48)}<span><b>${esc(nameOf(f))}</b><small>${esc(stateText(f))}</small>${f.contact===false?'':`<meter min="-100" max="100" value="${esc(f.opinionOfMe??0)}" aria-label="우리를 보는 마음"></meter>`}</span></button>`).join('')}</aside>${pick?`<main class="c262-negotiation"><h2>${esc(nameOf(pick))}</h2><p class="c262-relation">${esc(stateText(pick))}</p><p class="c279-war">${esc(diplomacyWarLine(d,pick.factionId))}</p><section class="c262-attitude k-panel-ink" data-tone="${op==null?'neutral':op>=20?'positive':op<=-20?'negative':'neutral'}"><h3>${attitude}</h3><div class="c262-opinion"><meter min="-100" max="100" value="${op??0}" aria-label="우리를 보는 마음"></meter><b>${op==null?'—':op>0?'+'+op:op}</b></div>${diplomacyReasonsHtml(pick)}</section><div class="dq-acts">${offer('선물',`data-diplo-gift="${esc(pick.factionId)}"`,pick.contact===false?{reason:'아직 만나지 않음'}:pick.canGift,null,Number.isFinite(pick.canGift?.cost)?`인망 ${pick.canGift.cost}`:'')}${act('TRUCE')}${act('ALLIANCE')}${pick.state==='ALLIANCE'?offer('동맹 종료',`data-diplo-end="${esc(pick.factionId)}"`,{ok:pick.state==='ALLIANCE'&&!pick.endingAt,reason:pick.state==='ALLIANCE'?'동맹을 끝냅니다':DIPLO_STATE[pick.state]},null):''}</div><p class="c262-advice">${adviser&&faceOf(adviserId)?`<span class="c262-medal" style="--size:48px"><img src="${esc(faceOf(adviserId))}" alt=""></span>`:''}${esc(adviser?.name??'조언')}: ${esc(advice)}</p><p class="dq-msg" role="status"></p></main><div class="c262-counterpart">${portrait(pick.factionId)&&pick.contact!==false?`<img src="${esc(portrait(pick.factionId))}" alt="${esc(nameOf(pick))}">`:''}</div><p class="k-card-paper c262-dialog">${esc(c262DiplomacyReply?.state===state&&c262DiplomacyReply.factionId===pick.factionId?c262DiplomacyReply.text:pick.contact===false?'아직 서로 만나지 않았습니다.':`${nameOf(pick)} 세력과 마주했습니다.`)}</p>`:''}${close}`;
 const im=host.querySelector('.c262-counterpart>img'),art=pick&&fullArt(state.factions?.[pick.factionId]?.rulerId);if(im&&art&&!art.cut)cutout(art.src).then(src=>{if(src&&im.isConnected)im.src=src;});
}
$('#diplo')?.addEventListener?.('click',e=>{if(!state)return;
 if(e.target.closest?.('[data-diplo-close]')){diploOpen=false;renderDiplo();return;}
 const pk=e.target.closest?.('[data-diplo-pick]');if(pk){if(diploPick!==pk.dataset.diploPick)c262DiplomacyReply=null;diploPick=pk.dataset.diploPick;renderDiplo();return;}
 const b=e.target.closest?.('[data-diplo-propose],[data-diplo-end],[data-diplo-gift]');if(!b||b.disabled||inputLocked())return;
 const cmd=b.dataset.diploGift?{type:'DIPLO_GIFT',factionId:b.dataset.diploGift}:b.dataset.diploPropose?{type:'DIPLO_PROPOSE',factionId:b.dataset.diploPropose,kind:b.dataset.kind}:{type:'DIPLO_END_ALLIANCE',factionId:b.dataset.diploEnd};
 if(cmd.type==='DIPLO_END_ALLIANCE'&&!globalThis.confirm('동맹을 종료합니다. 신용이 줄고 다음 차례부터 전쟁 상태가 됩니다. 계속할까요?'))return;
 try{const before=state;state=step(state,cmd);
  if(document.documentElement?.dataset?.ui==='kit'){const result=diplomacyScreenFacts(state,state.playerFactionId,cmd.factionId).result;c262DiplomacyReply={state,factionId:cmd.factionId,text:result?.text??'명령을 처리했습니다.',type:result?.type};}
  else{const after=view(state).diplomacy?.factions.find(f=>f.factionId===cmd.factionId),accepted=after?.state===cmd.kind||diplomacyTiming(state,state.playerFactionId,cmd.factionId,cmd.kind).pending;c262DiplomacyReply={state,factionId:cmd.factionId,text:cmd.type==='DIPLO_GIFT'?'선물을 전했습니다.':cmd.type==='DIPLO_END_ALLIANCE'?'동맹 종료를 알렸습니다.':`${DIPLO_KIND[cmd.kind]} 제안을 ${accepted?'받아들였습니다.':'거절했습니다.'}`};}
  diplomacyFeedback(before,state);render();}catch(err){const m=$('#diplo')?.querySelector?.('.dq-msg');if(m)m.textContent=errorText(err);}});
// Focus reads the public offer explanation without adding an execution step.
function c296ExplainOffer(e){const row=e.target.closest?.('[data-c296-summary]'),summary=$('#diplo')?.querySelector('.c296-offer-summary');if(row&&summary)summary.textContent=row.dataset.c296Summary;}
$('#diplo')?.addEventListener?.('focusin',c296ExplainOffer);
$('#diplo')?.addEventListener?.('pointerover',c296ExplainOffer);
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
  $('#choice-list').innerHTML=c.choices.map((x,i)=>`<button class="ev-choice" data-choice="${esc(x.id)}" title="${esc(x.preview??'')}"${scene?` style="--art:url(${esc(scene)});--pos:${n>1?Math.round(i/(n-1)*100):50}%"`:''} ${inputLocked()?'disabled':''}><span class="ev-card-face"><span class="key">${i+1}</span><b>${esc(x.label)}</b></span><small>${esc(x.preview??'').split(/\s*\|\s*/).map(t=>`<span class="c262-effect">${t}</span>`).join('')}</small></button>`).join('');}
}
$('#choice-list')?.addEventListener?.('click',e=>{const id=e.target.closest('[data-choice]')?.dataset.choice,c=state&&pendingChoice(view(state));if(!id||!c)return;
 try{const cmd=c.send(id);if(!cmd){renderChoiceCard(view(state));return;}const before=state;state=step(state,cmd);diplomacyFeedback(before,state);$('#choice-error').textContent='';render();autoNextUnit();}catch(err){$('#choice-error').textContent=errorText(err);}});
function growthLogText(e){return e.kind==='awakening'?e.text.replace(/ \d+단계(?: · 효과 준비 중)?$/,' 각성'):e.text;}
const c282GrowthPicks=new Map();
function growthQueue(){return Object.entries(state.campaignGrowth?.officers??{}).flatMap(([id,r])=>{const p=pendingCampaignDraft({...state,campaignGrowth:{...state.campaignGrowth,officers:{[id]:r}}});return p?[p]:[];});}
function growthRecommendation(p){const r=state.campaignGrowth.officers[p.officerId];return p.draft.promotion?p.cards[0]?.traitId:c29AiChoice(r,p.draft,rankCampaignAiDraft(r,p.draft.offeredIds))??p.cards[0]?.traitId;}
function growthPlan(p){
 const traitId=c282GrowthPicks.get(p.draft.draftId)??growthRecommendation(p),r=state.campaignGrowth.officers[p.officerId];
 const preview=structuredClone(state),resolution=[],notes=[];
 while(needsTraitResolution(preview,p.officerId,traitId)){
  const traits=officerEffectCards(preview,p.officerId).filter(c=>!c.core).sort((a,b)=>a.rank-b.rank||a.traitId.localeCompare(b.traitId));if(traits.length<2)break;
  const merge={mode:'merge',keepId:traits[0].traitId,removeId:traits[1].traitId};notes.push(`${traits[0].name} + ${traits[1].name} 합치기`);resolution.push(merge);resolveTraitSpace(preview,p.officerId,merge);
 }
 const tacticId=r.cards[traitId]?.modifier?c29BindingTargets(state,p.officerId,r.cards[traitId])[0]:undefined;
 if(tacticId)notes.push(`${r.cards[tacticId]?.name??tacticId}에 묶기`);
 return {type:'DRAFT_PICK',draftId:p.draft.draftId,traitId,resolution,tacticId,notes};
}
function applyGrowthQueue(){
 const seen=new Set();
 for(let i=0;i<100;i++){
  const pending=pendingCampaignDraft(state);if(!pending||seen.has(pending.draft.draftId))break;seen.add(pending.draft.draftId);
  const {notes,...request}=growthPlan(pending),before=state;draftPick=null;command(request);if(state===before)break;c282GrowthPicks.delete(pending.draft.draftId);
 }
}
function renderGrowthDraft(){
 const pending=pendingCampaignDraft(state),modal=$('#growth-modal');
 modal.hidden=!pending||combatAnimating||!!state.gameResult;if(modal.hidden)return;
 if(typeof showGuideFirst==='function')showGuideFirst(pending.draft?.promotion?'first.promotion':'first.draft');
 menuOpen=false;$('#unit-menu').hidden=true;$('#attack-preview').hidden=true;
 if(draftPick&&!pending.cards.some(c=>c.traitId===draftPick))draftPick=null;
 const r=state.campaignGrowth.officers[pending.officerId],level=pending.draft.contextSnapshot.levelAfter;
 const officer=state.officers[pending.officerId],face=fullArt(pending.officerId)?.src??portraits[pending.officerId]?.path;
 const growth=levelupReadout(state.campaignGrowth.log,pending.officerId,state.turn,level);
 for(const [key,url] of Object.entries(LEVELUP_ASSETS.parts))modal.style.setProperty(`--levelup-${key}`,`url("${url}")`);
 if(!$('#growth-stat-strip'))$('#growth-title').insertAdjacentHTML('afterend','<div id="growth-stat-strip"></div><p id="growth-reason"></p><div id="growth-queue"></div>');
 const statNames={leadership:'지휘',might:'무용',strength:'무용',intelligence:'지략',politics:'정무',charisma:'감화'};
 $('#growth-stat-strip').innerHTML=growth.stats.map(v=>`<div class="levelup-stat" data-stat="${esc(v.key)}"><b>${esc(statNames[v.key]??v.key)}</b><span class="before">${v.before}</span><span class="arrow">→</span><strong>${v.after}</strong><em>+${v.delta}</em></div>`).join('');
 $('#growth-stat-strip').hidden=!growth.stats.length;
 $('#growth-reason').textContent=growth.reason;$('#growth-reason').hidden=!growth.reason;
 $('#growth-queue').innerHTML=`<span>${esc(levelupQueue(state,pending.officerId))}</span><button type="button" id="growth-auto">자동 고르기</button>`;
 const queue=growthQueue();
 $('#growth-queue').insertAdjacentHTML('beforeend',`<div class="c282-growth-list">${queue.map(p=>{const pick=c282GrowthPicks.get(p.draft.draftId)??growthRecommendation(p),plan=growthPlan(p);return `<fieldset><legend>${esc(state.officers[p.officerId].name)}</legend>${p.cards.map(c=>`<button data-c282-draft="${esc(p.draft.draftId)}" data-c282-pick="${esc(c.traitId)}" aria-pressed="${pick===c.traitId}">${esc(c.name)}${growthRecommendation(p)===c.traitId?' · 추천':''}</button>`).join('')}${plan.notes.length?`<small>${esc(plan.notes.join(' · '))}</small>`:''}</fieldset>`;}).join('')}</div>${queue.length>1?'<button id="growth-all">모두 추천대로</button>':''}`);
 $('#growth-all')?.addEventListener('click',applyGrowthQueue);
 for(const b of $('#growth-queue').querySelectorAll('[data-c282-pick]'))b.onclick=()=>{c282GrowthPicks.set(b.dataset.c282Draft,b.dataset.c282Pick);if(b.dataset.c282Draft===pending.draft.draftId)draftPick=b.dataset.c282Pick;renderGrowthDraft();};
 $('#growth-auto').onclick=()=>{if(pending.draft.promotion){draftPick=pending.cards[0].traitId;renderGrowthDraft();return;}draftPick=c29AiChoice(r,pending.draft,rankCampaignAiDraft(r,pending.draft.offeredIds))??null;renderGrowthDraft();};
 let later=$('#growth-later');if(!later){later=document.createElement('button');later.id='growth-later';later.textContent='나중에';$('#growth-reroll').after(later);}
 later.hidden=!pending.draft.promotion;later.onclick=()=>{draftPick=null;command({type:'DRAFT_PICK',draftId:pending.draft.draftId,traitId:'LATER'});};
 if(pending.draft.promotion){
  $('#growth-title').textContent='2차 전직';$('#growth-status').textContent='실적을 채운 갈래를 고르세요. 선택은 이번 판 끝까지 고정됩니다.';
  $('#growth-art').innerHTML=face?`<img src="${esc(face)}" alt="${esc(officer.name)}">`:'';
  $('#growth-collapse').hidden=true;$('#growth-reroll').hidden=true;
  $('#growth-cards').innerHTML=promotionCardsMarkup(pending,draftPick);
  const cf=$('#growth-confirm');if(cf){cf.disabled=!draftPick;cf.querySelector('span').textContent=draftPick?'전직 선택 확정':'카드를 고르세요';}
  return;
 }
 const collapse=recordNotices.findLast(x=>x.turn===state.turn&&x.line.includes(`${officer.name} 중상`));
 $('#growth-collapse').textContent=collapse?.line??'';$('#growth-collapse').hidden=!collapse;
 $('#growth-title').textContent=pending.draft.c29?.awakening?`각성 · Lv ${level}`:`성장 · Lv ${growth.before} → ${growth.after}`;
 // 레벨업 창 왼쪽 전신 그림(하데스·파이어 엠블렘·다키스트 던전 구도). 그림이 없으면 먹 실루엣.
 const line=memoryLines[pending.officerId];
 $('#growth-art').innerHTML=`${face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(officer.name,FACTION_STYLE[officer.allegianceFactionId]?.color)}</span>`}<figcaption><i class="gp-face"${faceOf(pending.officerId)?` style="--face:url(${esc(faceOf(pending.officerId))})"`:''}></i><b>${esc(officer.name)}</b><small>Lv ${growth.before} → ${growth.after}</small><i class="gp-pot potential" data-rank="${esc(r.potential)}">${esc(r.potential)}</i>${line?`<q>${esc(line)}</q>`:''}${face?'':'<em>초상 준비 중</em>'}</figcaption>`;
 {const im=$('#growth-art img'),art=officer&&fullArt(officer.officerId);if(im&&art){im.style.opacity='0';cutout(art.src).then(u=>{if(im.isConnected){im.src=u??art.src;im.style.opacity='';}});}}
 $('#growth-status').textContent=(officer.injury?`부대가 무너졌습니다 — ${officer.name} 중상 · ${injuryReturnText(state.turn,view(state).officers[officer.officerId]?.injury)}. `:'')+(pending.draft.c29?.awakening?`고유 특기 각성 — ${pending.cards.length}갈래 중 1개를 고르세요.`:`레벨업 — ${level%5===0?'전법':'특기'} ${pending.cards.length}장 중 1장을 고르세요. ${level%5===0?'얻은 전법의 장착 상태는 장수 정보에서 확인하세요.':'보유에 추가 · 빈 칸이 있으면 자동 장착합니다. 같은 특기는 최대 5단계까지 강해집니다.'}`)+(pendingStrike?' 선택을 마치면 예약한 공격을 이어갑니다(Esc 취소).':'');
 const cardUse=c=>{const traitUse=draftTraitUseText(c,view(state).officers[pending.officerId]?.growth);if(traitUse)return traitUse;const v=view(state),r=state.campaignGrowth.officers[pending.officerId],base=c.kind==='awakening'&&c.rule==='STEADY_UP'?r.cards[r.coreId]:c,a=Object.values(v.ownArmies).find(a=>a.commanderId===pending.officerId);return growthUseText(base,{field:!!a,troopReady:!!a&&cardTroopReady(state,a.armyId,base),governor:Object.values(v.ownCities).some(city=>city.governorId===pending.officerId),domesticRules:GROWTH_DOMESTIC_RULES,combatRules:GROWTH_COMBAT_RULES});};
 const orderRerolls=view(state).orders?.rerolls??0;
 const c28=pending.draft.c28,bonus=c28?.bonusRerolls??0,cardHtml=c=>`<button class="draft-card reveal${c.traitId===draftPick?' picked':''}" data-rarity="${esc(c.rarity)}" data-draft-pick="${esc(c.traitId)}" aria-pressed="${c.traitId===draftPick}"><span class="kind">${UI_ICON(c.kind==='stat'?'stat-up':['trait','tactic'].includes(c.kind)?c.kind:c.kind==='fork'?'tactic':'trait')}${(c.kind==='awakening'?`각성 · ${{steady:'정석',narrative:'서사',wild:'변칙'}[c.branch]??''}`:c.kind==='fork'?'갈래':c.modifier?'전법 변형':{stat:'능력',trait:'특기',tactic:'전법'}[c.kind]??'특기')} · <span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span></span><span class="art"><img src="${LEVELUP_ASSETS.art[levelupArtCategory(c)]}" alt="" data-art-category="${levelupArtCategory(c)}"></span><span class="c191-select-seal" aria-hidden="true">${c.traitId===draftPick?'선택':''}</span><h3${String(c.name??"").length>9?' data-long':''}>${esc(abilityName356(c))}</h3>${cardOrigin(c)?`<span class="origin">유래 ${esc(cardOrigin(c))}</span>`:''}<p>${esc(draftDescription(c,pending.officerId))}</p>${cardUse(c)?`<p class="card-use">${esc(cardUse(c))}</p>`:''}<span class="foot"><span>${esc(c.kind==='awakening'?'고유 특기 각성':c.sourceText??c.classTag??'고유 경로')}</span><span class="tier">${c.rank?`${c.rank}단계 → ${c.rank+1}단계`:'신규'}</span></span></button>`;
 $('#growth-cards').innerHTML=pending.cards.map(c=>c28?`<div class="draft-slot" data-slot="${esc(c.slot??'')}">${c.slot?`<span class="slot-tag">${esc(c.slot)}</span>`:''}${cardHtml(c)}<button class="card-reroll" data-card-reroll="${esc(c.traitId)}" ${(c.rerollsRemaining??0)+bonus+orderRerolls<1?'disabled':''}>다시 뽑기 · ${(c.rerollsRemaining??0)}${bonus?` (+${bonus})`:''}${orderRerolls?` · 군령 +${orderRerolls}`:''}</button></div>`:cardHtml(c)).join('');
 const draft=pending.draft,limit=draft.rerollLimit??1;
 $('#growth-reroll').hidden=!!draft.c28;
 $('#growth-reroll').disabled=(!orderRerolls&&(draft.rerollCount>=limit||r.track.growthStates[pending.officerId].aptitudePoints<1))||draft.eligibleCandidateSnapshot.filter(c=>!draft.offeredIds.includes(c.traitId)).length<1;
 $('#growth-reroll').textContent=(draft.rerollCount>=limit?'다시 뽑기 사용 완료':`다시 뽑기 · ${limit-draft.rerollCount}회`)+(orderRerolls?` · 군령 +${orderRerolls}`:'');
 // 흑묵(final-draft 아래 줄): 지금 가진 특기·전법 여섯 칸 + 확정 단추
 {const hv=$('#growth-have'),cf=$('#growth-confirm'),have=(view(state).officers?.[pending.officerId]?.growth?.cards??[]).slice(0,6);
  if(hv)hv.innerHTML=Array.from({length:6},(_,i)=>{const h=have[i];return `<li class="${h?(h.kind==='trait'?'trait':'tactic'):'empty'}"${h?` title="${esc(h.name)}${h.rank?` ${h.rank}단계`:''}"`:''}>${h?esc(String(h.name??'').slice(0,1)):''}</li>`;}).join('');
  if(cf){cf.querySelector('span').textContent=draftPick?`${pending.cards.find(c=>c.traitId===draftPick)?.name??''} 선택 확정`:'카드를 고르세요';cf.disabled=!draftPick;cf.title=draftPick?'고른 카드로 정합니다':'카드를 먼저 고르세요';}}
}
let bindChoice=null,draftPick=null; // draftPick: 흑묵 레벨업 창에서 먼저 골라 둔 카드(확정 전)
function showBindChooser(pending,traitId){
 const r=state.campaignGrowth.officers[pending.officerId],card=r.cards[traitId],targets=c29BindingTargets(state,pending.officerId,card);
 bindChoice={draftId:pending.draft.draftId,traitId};
 $('#growth-error').innerHTML=targets.length?`<span class="bind-ask">「${esc(abilityName356(card))}」을 묶을 전법 — 그 전법 비용 +${card.params?.extraCooldown?20:10}(시험값)</span>${targets.map(k=>`<button class="bind-opt" data-bind-tactic="${esc(k)}">${esc(abilityName356(r.cards[k])||k)}</button>`).join('')}`:'묶을 수 있는 장착 전법이 없습니다.';
}
$('#growth-error').addEventListener('click',e=>{const t=e.target.closest?.('[data-bind-tactic]')?.dataset.bindTactic;if(t&&bindChoice){const b=bindChoice;bindChoice=null;command({type:'DRAFT_PICK',draftId:b.draftId,traitId:b.traitId,tacticId:t});}});
$('#growth-cards').addEventListener('click',e=>{
 const rerollId=e.target.closest('[data-card-reroll]')?.dataset.cardReroll;
 if(rerollId){const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId,traitId:rerollId});return;}
 const traitId=e.target.closest('[data-draft-pick]')?.dataset.draftPick,pending=state&&pendingCampaignDraft(state);
 if(traitId&&pending){
   if(document.body?.classList?.contains?.('ink-hud')&&$('#growth-confirm')&&draftPick!==traitId){draftPick=traitId;renderGrowthDraft();return;} // 흑묵: 먼저 고르고(밝게 뜸), 확정 단추나 같은 카드를 한 번 더 눌러 정한다
   commitGrowthPick(traitId,pending.draft.draftId);
 }
});
$('#growth-reroll').addEventListener('click',()=>{const pending=state&&pendingCampaignDraft(state);if(pending)command({type:'DRAFT_REROLL',draftId:pending.draft.draftId});});
function commitGrowthPick(traitId,draftId){
 const pending=state&&pendingCampaignDraft(state);
 if(!pending||pending.draft.draftId!==draftId||!pending.cards.some(c=>c.traitId===traitId))return;
 if(state.campaignGrowth.officers[pending.officerId]?.cards[traitId]?.modifier){showBindChooser(pending,traitId);return;}
 const before=state,previousPick=draftPick;draftPick=null;command({type:'DRAFT_PICK',draftId,traitId});
 if(state!==before)c282GrowthPicks.delete(draftId);else draftPick=previousPick;
}
$('#growth-confirm')?.addEventListener?.('click',()=>{const pending=state&&pendingCampaignDraft(state);if(draftPick&&pending)commitGrowthPick(draftPick,pending.draft.draftId);});
function cardOrigin(c){return c?.origin??c?.formerName??'';}
const C270_STAT_SYMS={지휘:['lenses','faction'],무용:['actions','attack'],지략:['resources','learning'],정무:['global','city'],감화:['global','diplomacy']};
const C270_ENGINE_SYMS={MAENG:['actions','attack'],GANG:['actions','garrison'],HOWI:['status','supply-full'],TU:['troops','spear'],JANGGUN:['lenses','faction'],CHAEK:['resources','learning'],CHUKSEONG:['actions','build'],CHEOK:['controls','search'],JEONNONG:['resources','food'],GUKSA:['global','diplomacy']};
function traitChip(c,id){const tip=[id?cardDescription(c,id):playerText(c.text),cardOrigin(c)&&`유래 ${cardOrigin(c)}`].filter(Boolean).join(' · ');return `<span class="trait-chip${c.core?' unique':''}" data-rarity="${esc(c.rarity)}"${tip?` title="${esc(tip)}"`:''}>${c.classTag?`<span title="${esc(c.classTag)} 계열 특기">${symImg(...(C270_STAT_SYMS[Array.isArray(c.classTag)?c.classTag[0]:c.classTag]??['global','officers']),{size:'sm'})}</span>`:'<b>●</b>'}${esc(abilityName356(c))} ${c.core?'':c.rank+'단계'}</span>`;}
// 한 판 결과: 날짜·턴·전투 수·남은 성, 내 장수들의 성장(포텐·Lv·특기·전법)
// 연대기 띠: 일어선 곳 · 내 세력의 사건 선택 · 얻은 성 · 위기 · 장수 칭호 · 끝
function chronicleEntries(){
 const me=state.playerFactionId,f=state.factions[me],out=[],cn=id=>state.cityDisplayNames?.[id]??state.cities[id]?.name??id;
 out.push({turn:1,kind:'start',text:`${state.officers[f?.rulerId]?.name??factionName(me)}, ${cn(f?.startCapitalCityId??f?.capitalCityId)}에서 일어서다`});
 for(const x of state.c22?.fired??[])if(x.factionId===me){const e=C22_EVENTS.find(e=>e.eventId===x.eventId),c=e?.choices.find(c=>c.id===x.choiceId);if(e)out.push({turn:x.turn,kind:'event',text:`${e.title}${c?` — ${c.label}`:''}`});}
 for(const [id,x] of Object.entries(state.c22?.captures??{}))if(x.factionId===me&&state.cities[id]?.ownerFactionId===me)out.push({turn:x.turn,kind:'city',text:`${josa(cn(id)+'을(를)')} 얻다`});
 if(state.c31?.actorId&&state.c31.startTurn)out.push({turn:state.c31.startTurn,kind:'crisis',text:`${state.officers[state.c31.actorId]?.name??''}의 ${state.c31.name??'위기'}${state.c31.resolved?` — ${state.c31.resolved==='TIMEOUT'?'지나감':'막아냄'}`:''}`});
 const titles=[];for(const [id,r] of Object.entries(state.campaignGrowth?.officers??{}))if(state.officers[id]?.allegianceFactionId===me)for(const t of r.titles??[])titles.push({turn:t.turn,kind:'title',text:`${state.officers[id].name} — ‘${t.name}’`});
 titles.sort((a,b)=>a.turn-b.turn);
 const room=Math.max(3,13-out.length),step=Math.max(1,Math.ceil(titles.length/room));out.push(...titles.filter((_,i)=>i%step===0).slice(0,room));
 const g=state.gameResult;if(g)out.push({turn:endedTurn(state.turn),kind:'end',text:g.type==='UNIFICATION'?'천하가 하나로 모이다':g.type==='TURN_LIMIT'?'판이 닫히다':'깃발이 내려지다'});
 out.push(...resultChronicleRows(view(state).gameResult,endedTurn(state.turn)));
 return out.sort((a,b)=>a.turn-b.turn||(a.kind==='end')-(b.kind==='end'));
}
// 한 판 결과: 왼쪽 군주 전신 · 오른쪽 결과·세력 순위·연대기 띠·함께한 장수
function c286MountResult(box,officers){
 const record=runEndRecords(state,c286Memory);
 const chronPanel=box.querySelector('.rs-chron');
 if(!record.sessionOnly)chronPanel.dataset.complete='true';
 const cityRows=Object.values(state.cities).map(c=>({...c,...state.tiles[c.tileId],cityId:c.cityId,name:state.cityDisplayNames?.[c.cityId]??c.name}));
 chronPanel.insertAdjacentHTML('beforeend',runEndReplayHtml(record.frames,cityRows,Object.fromEntries(Object.entries(FACTION_STYLE).map(([id,f])=>[id,f.color])),record.sessionOnly)+runEndLossHtml(record.losses,faceOf));
 const replay=chronPanel.querySelector('.c286-replay'),loss=chronPanel.querySelector('.c286-loss'),band=chronPanel.querySelector('.rs-band');
 replay.hidden=true;loss.hidden=true;
 const reduced=new URLSearchParams(location.search).get('fx')==='0'||fxPreferences.reduced();
 const seek=replay.querySelector('input'),toggle=replay.querySelector('button');
 const stop=()=>{clearInterval(c286ReplayTimer);c286ReplayTimer=null;toggle.textContent='재생';};
 const draw=i=>{const frame=record.frames[i];if(!frame)return;seek.value=String(i);replay.querySelector('output').textContent=`${frame.turn}차례`;for(const dot of replay.querySelectorAll('[data-replay-city]')){dot.setAttribute('fill',FACTION_STYLE[frame.owners[dot.dataset.replayCity]]?.color??'#777');dot.setAttribute('stroke',frame.events.some(e=>e.cityId===dot.dataset.replayCity)?'#e9e1cf':'none');}};
 seek.disabled=reduced;toggle.disabled=reduced||record.frames.length<2;
 seek.oninput=()=>{stop();draw(Number(seek.value));};
 toggle.onclick=()=>{if(c286ReplayTimer){stop();return;}let i=Number(seek.value);if(i>=record.frames.length-1)i=0;draw(i);toggle.textContent='멈춤';c286ReplayTimer=setInterval(()=>{if(!replay.isConnected||replay.hidden||++i>=record.frames.length){stop();return;}draw(i);},8000/Math.max(1,record.frames.length-1));};
 replay.querySelectorAll('[data-replay-frame]').forEach(b=>{b.disabled=reduced;b.onclick=()=>{stop();draw(Number(b.dataset.replayFrame));};});
 chronPanel.querySelectorAll('[data-run-tab]').forEach(b=>b.onclick=()=>{stop();const tab=b.dataset.runTab;band.hidden=tab!=='chron';chronPanel.querySelector('h3').hidden=tab!=='chron';replay.hidden=tab!=='replay';loss.hidden=tab!=='loss';});
 const sleepers=officers.map(o=>{const a=fullArt(o.officerId);return a?sleepingOfficerHtml(a.src,o.name):'';}).join('');
 const companions=$('#result .c271-companions');if(companions)companions.innerHTML=`<h3>함께한 장수</h3><div class="c286-sleepers">${sleepers}</div>`;
}
function renderResultSummary(v,won){
 if(isPrologue(state))return;
 const box=$('#result-summary');if(!box)return;
 $('#c215-completions')?.remove();
 writeCampaignLegacy(undefined,v.gameResult);
 const c286Key=`${state.campaignSeed}.${state.playerFactionId}.${state.turn}`;
 if(box.dataset.c286Key===c286Key)return;
 box.dataset.c286Key=c286Key;
 const g=state.gameResult,me=state.playerFactionId,style=FACTION_STYLE[me]??{},color=style.color??'#7d7a6a',modal=$('#result');
 const outcome=won?(g?.type==='UNIFICATION'?'unify':'win'):(g?.type==='UNIFICATION'||g?.type==='TURN_LIMIT')?'lose':'fall';
 modal.dataset.outcome=outcome;modal.style.setProperty('--fc',color);
 const key=v3Asset('title/key-art.webp');if(key)modal.style.setProperty('--key-art',`url(${key})`);
 $('#result-eyebrow').innerHTML=`<i class="k-medallion">${{unify:'統',win:'勝',lose:'敗',fall:'亡'}[outcome]}</i><span>190년 1월 – ${esc(campaignDate(endedTurn(state.turn)).replace(/^.*? · /,''))} · ${endedTurn(state.turn)}차례</span>`;
 const ruler=state.factions[me]?.rulerId,art=ruler?fullArt(ruler):null;
 $('#result-art').innerHTML=`${emblemHtml(me,'lg')}${art?`<img class="rs-ruler" src="${esc(art.src)}" data-cut="${art.cut?1:0}" alt="">`:''}<p class="rs-ruler-name">${esc(state.officers[ruler]?.name??style.name)}<small>${esc(factionName(me))}</small></p>`;
 if(art&&!art.cut){const im=$('#result-art .rs-ruler');if(im){im.style.opacity='0';cutout(art.src).then(src=>{if(im.isConnected){if(src)im.src=src;im.style.opacity='';}});}}
 const count=(fid,minor)=>Object.values(state.cities).filter(c=>c.ownerFactionId===fid&&(c.kind==='minor')===minor).length;
 const ranking=(g?.ranking??Object.keys(state.factions).map(fid=>({factionId:fid,majorCities:count(fid,false),minorCities:count(fid,true),troops:(tb=>tb?tb.field+tb.reserve:Object.values(state.armies).filter(a=>a.factionId===fid).reduce((n,a)=>n+(a.troopCount??0),0))(view(state).gameResult?.troopBreakdownByFactionId?.[fid])})).sort((a,b)=>b.majorCities-a.majorCities||b.minorCities-a.minorCities||b.troops-a.troops));
 const maxT=Math.max(1,...ranking.map(r=>r.troops??0));
 const rank=`<ol class="rs-rank">${ranking.map((r,i)=>`<li class="${r.factionId===me?'me':''}" style="--fc:${FACTION_STYLE[r.factionId]?.color??'#777'}"><span class="rk-n">${i+1}</span>${emblemHtml(r.factionId)}<b>${esc(factionName(r.factionId))}</b><span class="rk-c"><em>${r.majorCities??r.cities??0}</em><small>큰 성</small></span><span class="rk-c"><em>${r.minorCities??0}</em><small>작은 성</small></span><span class="rk-t"><i><b style="width:${Math.round((r.troops??0)/maxT*100)}%"></b></i><small>병력 ${troopText(r.troops??0)}</small></span></li>`).join('')}</ol>`;
 const officers=Object.values(v.officers).filter(o=>o.growth&&o.allegianceFactionId===me).sort((a,b)=>b.growth.level-a.growth.level||a.name.localeCompare(b.name,'ko'));
 const titleOf=id=>(state.campaignGrowth?.officers?.[id]?.titles??[]).at(-1)?.name;
 const chron=chronicleEntries(),shownChron=chron.length<=6?chron:[chron[0],...Array.from({length:4},(_,i)=>chron[Math.round((i+1)*(chron.length-1)/5)]),chron.at(-1)],score=campaignResultScore(v,won,CAMPAIGN_TURN_LIMIT);
 let storage;try{storage=globalThis.localStorage;}catch{}
 const recordKey=`${state.campaignSeed}.${me}.${state.turn}.${score.total}`;
 if(modal.dataset.c271RecordKey!==recordKey){modal.dataset.c271RecordKey=recordKey;modal.dataset.c271Record='';try{const old=JSON.parse(storage?.getItem('sangoku.best.v1')??'{}')[me];if(storage)modal.dataset.c271Record=!Number.isFinite(old?.score)?'첫 기록':score.total>old.score||score.total===old.score&&endedTurn(state.turn)<old.turn?'새 기록':'';}catch{}}
 const best=updateBestRecord(storage,me,score.total,endedTurn(state.turn));
 // C138: city-start initial armies were disbanded before play; bornTurn marks actual musters.
 const unused=unfieldedOfficerNames(state,officers);
 const reason=resultReasonText(g,factionName);
 const twistRows=v.twistHistory??[],titles=officers.flatMap(o=>o.growth?.titles??[]);
 const facts=[...score.parts.filter(([label])=>!['병력 1,000명당','승리 시 남은 차례','비틀린 역사'].includes(label)).map(([label,n])=>[label,n,'']),['병력',troopText(Object.values(v.ownArmies??{}).reduce((n,a)=>n+(a.troopCount??0),0)+Object.values(v.ownCities??{}).reduce((n,c)=>n+(c.reserveTroops??0),0)), ''],['교전',`${state.battleSequence??0}회`,''],['함께한 장수',`${officers.length}명`,''],['비틀린 역사',twistRows.length,twistRows.map(t=>`${t.turn}차례 · ${t.title}`).join(' · ')||'역사대로 걸었다'],['얻은 칭호',titles.length,titles.map(t=>t.name).join(' · ')]];
 const portraitList=officers.slice(0,8).map(o=>{const f=faceOf(o.officerId);return `<span class="k-medallion c271-companion${unused.includes(o.name)?' unused':''}" title="${esc(`${o.name} · Lv ${o.growth.level}${titleOf(o.officerId)?' · '+titleOf(o.officerId):''}`)}">${f?`<img src="${esc(f)}" alt="${esc(o.name)}">`:esc(o.name)}</span>`;}).join('');
 $('#result .c271-companions')?.remove();$('#result .rs-main').insertAdjacentHTML('beforeend',`<aside class="c271-companions"><h3>함께한 장수</h3>${portraitList}${officers.length>8?`<span>+${officers.length-8}</span>`:''}</aside>`);
 const legacy=v.gameResult?.legacy,finished=legacy?.runsFinished;
 box.innerHTML=`<p class="rs-reason">${esc(reason)}</p><section class="c186-score k-card-paper"><table class="c261-stats"><tbody>${facts.map(([label,n,tip])=>`<tr title="${esc(tip)}"><th>${esc(label)}</th><td>${esc(n)}</td></tr>`).join('')}<tr title="${esc(score.parts.map(([label,n,w])=>`${label} ${n} × ${w} = ${n*w}`).join(' · '))}"><th>점수</th><td>${score.total.toLocaleString('ko-KR')}</td></tr></tbody></table><p>최고 ${best.score.toLocaleString('ko-KR')} · ${best.turn}차례 ${modal.dataset.c271Record?`<b class="c271-record">${modal.dataset.c271Record}</b>`:''}</p></section>${rank}
 <section class="rs-chron"><nav class="c286-tabs"><button data-run-tab="chron">연대기</button><button data-run-tab="replay">판도 재생</button><button data-run-tab="loss">명부</button></nav><h3>연대기</h3><ol class="rs-band">${shownChron.map(e=>`<li data-kind="${e.kind}"><span class="t">${e.turn}<small>차례</small></span><p>${esc(e.text)}</p></li>`).join('')}</ol></section>
 <details class="rs-off"><summary>함께한 장수 · ${officers.length}명 / 업적 · 기록</summary><div class="c261-result-details"><ol class="c271-full-chron">${chron.map(e=>`<li>${e.turn}<small>차례</small> · ${esc(e.text)}</li>`).join('')}</ol><ul class="rs-officers">${officers.map(o=>`<li>${esc(o.name)} · Lv ${o.growth.level}${titleOf(o.officerId)?` · ${esc(titleOf(o.officerId))}`:''}</li>`).join('')}</ul>${resultHistoryHtml(v.gameResult?.history)}${ambitionEndingHtml(v.gameResult)}${twistHistoryHtml(v.twistHistory,v.oaths)}${unused.length?`<p>출진하지 않은 장수: ${unused.map(esc).join(' · ')}</p>`:''}<p>시드 ${esc(state.campaignSeed)} <button id="c186-retry">같은 시드로 다시</button> <label>새 시드 <input id="c215-seed" type="number" min="0" max="4294967295" step="1" value="${esc(state.campaignSeed)}"></label> <button id="c215-seed-start">이 시드로 시작</button><small id="c215-seed-error" role="status"></small></p></div></details>
 <section class="c261-progress"><span>${Number.isFinite(finished)?`기억에 남은 판 ${finished}회`:'다음 판에 남는 것'}</span><span>${esc((v.gameResult?.unlocksEarned??[]).map(u=>u.line).join(' · ')||'기시감 · 천시 · 누적 성장 수치 없음')}</span></section>`;
 if(box.querySelector){c286MountResult(box,officers);if(document.documentElement.dataset.ui==='kit')mountBookendResult298(box),mountResultV4374(box);}
 const next=$('#result .rs-go'),unlocks=v.gameResult?.unlocksEarned??[];next.onclick=null;next.textContent='다음 판';
 if(unlocks.length)next.onclick=e=>{e.preventDefault();let page=0;const show=()=>{let panel=$('#c261-unlocks');if(!panel){panel=document.createElement('section');panel.id='c261-unlocks';panel.className='c261-unlocks';$('#result .rs-main').append(panel);}panel.innerHTML=`<h2>깨어난 기억</h2><div>${unlocks.slice(page*3,page*3+3).map(u=>{const def=AMBITIONS.unlocks.list.find(d=>d.id===u.id),src=def?.officer?faceOf(def.officer):`/assets/ui-v3/chronicle/${u.id.startsWith('U-EV-')?'event':'start'}.webp`;return `<article class="k-card-paper">${src?`<img src="${esc(src)}" alt="">`:''}<h3>${esc(def?.officer?u.line.replace(/^다음 판부터 /,'').replace(/[이가] 재야에 나타난다\.$/,''):u.id.startsWith('U-EV-')?'메아리 사건':'기억')}</h3><p>${esc(u.line)}</p></article>`;}).join('')}</div><p>${page+1} / ${Math.ceil(unlocks.length/3)} · 다음 판부터 이어집니다</p>`;};show();next.textContent='계속';next.onclick=event=>{if((page+1)*3<unlocks.length){event.preventDefault();page++;show();}};};
 $('#c215-seed-start').onclick=()=>{const n=Number($('#c215-seed').value);if(!$('#c215-seed').value.trim()||!Number.isInteger(n)||n<0||n>4294967295){$('#c215-seed-error').textContent='0~4294967295 사이 정수를 넣으세요.';return;}const url=new URL(location.href);url.searchParams.set('entry','new');url.searchParams.set('seed',String(n));url.searchParams.set('retryFaction',state.playerFactionId);location.assign(url.href);};
 $('#c186-retry').onclick=()=>{const url=new URL(location.href);url.searchParams.set('entry','new');url.searchParams.set('seed',String(state.campaignSeed));url.searchParams.set('retryFaction',state.playerFactionId);location.assign(url.href);};
}
// 장수 카드: 초상·포텐·경험치, 능력 5개 막대, 특기 5칸(고유 먼저·빈 칸 표시), 전법 장착 3칸 + 보관함
const STAT_LABELS=['지휘','무용','지략','정무','감화'];
// C25 전기: 경력 칭호(얻은 턴·근거)와 한 일 — "레벨업에 서사"(사용자)
const TRACE_LABEL={charge:'돌격',flank:'측면 공격',rear:'후방 공격',frontHold:'정면 수비',siegeDamage:'성 내구 피해',cityDefense:'수성',pursuit:'추격',tactic:'전법',survived:'생환',routed:'패주',govTurns:'태수 턴',foodAdded:'늘린 식량',productionAdded:'늘린 생산',scienceAdded:'늘린 학문',facilitiesBuilt:'지은 시설',securityRecovered:'치안 회복',recruited:'등용',eventsDecided:'사건 결정'};
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
const CRISIS_END={ROUTED:'패주시켰다',ELIMINATED:'무너뜨렸다',CAPTURED:'사로잡았다',TIMEOUT:'버텨 냈다 — 8차례가 지났다'};
const playText=t=>(t??'').replace(/\s*\(C\d+[^)]*\)/g,'').replace(/Crisis\s*를/g,'위기를').replace(/Crisis/g,'위기').replace(/AI 는/g,'AI는').replace(/(\d+)턴(이|을|은|과)?/g,(_,n,j)=>n+'차례'+({이:'가',을:'를',은:'는',과:'와'}[j]??''));
function crisisKey(x){return `${x.actorId}:${x.startTurn}:${x.resolved?'end':'start'}`;}
function renderCrisis(v){
 const x=v.c31&&{...v.c31,warnText:playText(v.c31.warnText)},pill=$('#crisis-pill'),modal=$('#crisis-modal');if(!pill||!modal)return;
 const actor=x&&state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x?.type);
 pill.hidden=!x||!!x.resolved;
 if(x&&!x.resolved){const face=faceOf(x.actorId);pill.innerHTML=`<span class="cp-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(actor?.name??'')}</span><span class="cp-text"><small>위기 인물</small><b>${esc(actor?.name??'')} — ${esc(x.name)}</b></span><span class="cp-turns">${x.turnsLeft}<small>차례</small></span>`;const advice=document.createElement('small');advice.className='c206-crisis-advice';advice.textContent=x.warnText;pill.querySelector('.cp-text').appendChild(advice);pill.title=x.warnText;}
 if(!x||!modal.hidden&&modal.dataset.key===crisisKey(x))return;
 const key=crisisKey(x);if(crisisSeen.has(key)||combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state))return;
 if(x.resolved&&(state.c31?.endTurn??-1)<state.turn-1)return;
 openCrisisCard(v);
}
function openCrisisCard(v=view(state)){
 const x=v.c31&&{...v.c31,warnText:playText(v.c31.warnText)},modal=$('#crisis-modal');if(!x||!modal)return;
 const actor=state.officers[x.actorId],type=crisisData?.types?.find(t=>t.id===x.type),face=portraits[x.actorId]?.path,fac=FACTION_STYLE[actor?.allegianceFactionId];
 const gauge=Math.round(state.campaignGrowth?.officers?.[x.actorId]?.c29?.gauge??0),resolver=state.c31?.resolverId&&state.officers[state.c31.resolverId];
 const playerResolved=!!x.resolved&&x.resolved!=='TIMEOUT'&&resolver?.allegianceFactionId===v.factionId,timeoutFaction=FACTION_STYLE[x.factionId];
 const name=actor?.name??'',reward=crisisRewardText(C31_DATA,name);
 const title=x.resolved?(x.resolved==='TIMEOUT'?'위기가 지나갔다':'위기를 막았다'):'위기 인물 등장';
 const body=x.resolved
  ?`<p class="cr-warn">${esc(name)}의 ${esc(x.name)} — ${esc(resolver?josa(`${resolver.name}이(가) ${CRISIS_END[x.resolved]??'막았다'}`):CRISIS_END[x.resolved]??'끝났다')}</p><dl class="cr-rows">${x.resolved==='TIMEOUT'?`<dt>결과</dt><dd>${esc(timeoutFaction?.name??'위기 세력')} 인망 +${C31_DATA.end.timeoutFame}. 위기 동안의 효과는 사라지고, ${esc(josa(name+'이(가)'))} 얻은 레벨·칭호·카드는 남는다.</dd>`:`<dt>보상</dt><dd>${esc(playerResolved?reward.replace('해결한 플레이어 장수',resolver.name):resolver?`${resolver.name}의 세력이 해결했습니다 — 우리 세력에는 해결 보상이 지급되지 않습니다`:'해결한 플레이어 장수가 없어 우리 세력에는 해결 보상이 지급되지 않습니다')}</dd>`}</dl>`
  :`<p class="cr-warn">${esc(playText(x.warnText))}</p><dl class="cr-rows"><dt>달라지는 것</dt><dd>${esc(playText(x.type==='RAMPAGE'?x.warnText:type?.effect))}</dd><dt>막는 법</dt><dd><strong>그 장수 부대를 무너뜨리거나 사로잡으면 막는다</strong><br>${esc(x.turnsLeft>Math.max(0,CAMPAIGN_TURN_LIMIT-v.turn+1)?'그 장수 부대를 패주·소멸시키거나 사로잡으면 해결 · 시간 경과만 기다리면 이번 판이 끝날 때까지 이어집니다':playText(crisisData?.end?.text))}</dd><dt>보상</dt><dd>${esc(reward)}</dd></dl><div class="cr-meter"><span class="cr-gauge"><small>고유 전법</small><i><b style="width:${Math.min(100,gauge)}%"></b></i><em>${gauge}/100</em></span><span class="cr-turns"><b>${x.turnsLeft}</b><small>차례 남음</small></span></div>`;
 const bg=v3Asset('events/CRISIS.webp'),fig=fullArt(x.actorId);
 $('#crisis-art').innerHTML=`${bg?`<img class="cr-bg" src="${esc(bg)}" alt="">`:''}${fig?`<img class="cr-fig" src="${esc(fig.src)}" data-cut="${fig.cut?1:0}" alt="">`:face?`<img src="${esc(face)}" alt="">`:`<span class="art-fallback">${faceFallback(name,fac?.color)}</span>`}<figcaption style="--fc:${fac?.color??'#a3453d'}"><small>${esc(fac?.name??'')} 세력 · Lv ${state.campaignGrowth?.officers?.[x.actorId]?.track?.growthStates?.[x.actorId]?.level??'—'}</small>${memoryLines[x.actorId]?`<q>${esc(memoryLines[x.actorId])}</q>`:''}</figcaption>`;
 {const im=$('#crisis-art .cr-fig');if(im&&im.dataset.cut==='0'){im.style.opacity='0';cutout(im.getAttribute('src')).then(u=>{if(im.isConnected){im.src=u??im.src;im.style.opacity='';}});}}
 $('#crisis-main').innerHTML=`<p class="cr-eyebrow">${title}</p><h1>${esc(name)}</h1><p class="cr-type type-${esc(x.type)}">${esc(x.name)}</p>${body}<button class="cr-go" data-crisis-close>${x.resolved?'확인':'알겠다'}</button>`;
 modal.dataset.key=crisisKey(x);modal.classList?.toggle?.('resolved',!!x.resolved);modal.hidden=false;crisisSeen.add(crisisKey(x));menuOpen=false;$('#unit-menu').hidden=true;
}
$('#crisis-modal')?.addEventListener?.('click',e=>{if(e.target.closest?.('[data-crisis-close]')||e.target.id==='crisis-modal')$('#crisis-modal').hidden=true;});
$('#crisis-pill')?.addEventListener?.('click',()=>openCrisisCard());
// C29 성장(장수 정보 창): 고유 전법 게이지 · 고유 특기 각성 · 묶인 변형 · 갈래
function c29Section(id){
 const r=state.campaignGrowth?.officers?.[id],x=r?.c29;if(!x)return '';
 const sig=Object.values(r.cards).find(c=>c.kind==='tactic'&&(c.signature||c.classTag==='고유'));
 const name=k=>esc(abilityName356(r.cards[k])||k),branch={steady:'정석',narrative:'서사',wild:'변칙'};
 const aw=(x.awakenings??[]).map(a=>`<li><span class="aw-b">${branch[a.branch]??'각성'}</span><b>${esc(a.name)}</b><small>Lv ${a.level??''} · ${esc(a.text??'')}</small></li>`).join('');
 const binds=Object.entries(x.bindings??{}).map(([t,m])=>`<li>${name(m)} → <b>${name(t)}</b></li>`).join(''); // 저장 형식 {전법: 변형}
 const owned=r.track?.growthStates?.[id]?.ownedTraitRanks??{},lv=r.track?.growthStates?.[id]?.level??1,cost=xpToNextLevel(lv),locked=tacticLoadoutReason(state,id),xp=Math.max(r.totalXp??0,r.xp??0);
 const rebind=Object.keys(owned).filter(k=>r.cards[k]?.modifier).map(m=>{const cur=Object.entries(x.bindings??{}).find(([,v])=>v===m)?.[0],opts=c29BindingTargets(state,id,r.cards[m]).filter(t=>t!==cur);if(!opts.length)return '';const why=locked?'전투 중에는 못 바꿈':(x.xpDebt??0)>0?`경험치 빚 ${Math.ceil(x.xpDebt)} 을 먼저 갚아야 함(전투로 얻는 경험치가 빚부터 갚음)`:xp<cost?`경험치 ${cost} 필요`:'';return `<li><b>${name(m)}</b> 다시 묶기 <small>경험치 ${cost} 소모</small>${opts.map(t=>`<button class="bind-opt" data-rebind="${esc(m)}" data-rebind-tactic="${esc(t)}" ${why||inputLocked()?'disabled':''} title="${esc(why||`${r.cards[t]?.name??t} 비용 +10(시험값)`)}">→ ${name(t)}</button>`).join('')}${why?`<em class="muted"> ${esc(why)}</em>`:''}</li>`;}).join('');
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
 const slots=[...ordered.map(trait),...Array.from({length:Math.max(0,g.traitSlots-traits.filter(c=>!c.core).length)},()=>'<li class="oc-slot empty">빈 칸</li>')].join('');
 const button=(c,on)=>{const why=reason??(inputLocked()?'지금은 할 수 없습니다.':state.campaignGrowth.officers[o.officerId]?.c29&&c.traitId===state.campaignGrowth.officers[o.officerId].representativeId?'고유 전법은 별도 칸에서 사용합니다.':!g.signature&&!on&&g.equippedTacticIds.length>=CAMPAIGN_TACTIC_SLOTS?'장착한 전법을 먼저 해제하세요.':'');return `<button class="btn sm" data-loadout="${esc(c.traitId)}" data-equip="${!on}" ${why?'disabled':''} title="${esc(why||'전법 장착 변경')}">${on?'해제':'장착'}</button>`;};
 const tactic=(c,on)=>`<li class="oc-tactic${on?' on':''}" data-rarity="${esc(c.rarity)}"><span class="grade" data-rarity="${esc(c.rarity)}">${RARITY_NAME[c.rarity]??esc(c.rarity)}</span><b>${esc(abilityName356(c))}</b>${pips(c.rank)}<em>${on?'장착 ✓':'보관'}</em>${button(c,on)}<small>${esc(cardDescription(c,o.officerId))}${cardEffectPending(c)?' · 효과 준비 중':''}</small></li>`;
 const equipped=g.equippedTacticIds.map(id=>tactics.find(c=>c.traitId===id)).filter(Boolean),stored=tactics.filter(c=>!g.equippedTacticIds.includes(c.traitId)&&(!g.signature||c.traitId!==g.signature.traitId));
 $('#officer-content').innerHTML=`<div class="oc-head" style="--fc:${color}">
  <div class="oc-face">${engineStatusMarkup(o.engine)}${face?`<img src="${esc(face)}" alt="">`:faceFallback(o.name)}${COSTUMES[o.officerId]?`<button class="oc-costume" data-costume="${esc(o.officerId)}" title="옷 바꾸기">${esc((COSTUMES[o.officerId].find(x=>x.file===CUTOUT[o.officerId])??COSTUMES[o.officerId][0]).label)} ⇄</button>`:''}</div>
  <div class="oc-meta"><p>${esc(troopName(o.troopType))} · ${esc(o.engine?.name??'계통 없음')}</p><p><span class="potential" data-rank="${g.potential}" title="포텐 = 이번 판에서 이 장수가 얼마나 크게 자라는가, 판마다 다시 뽑힘">${g.potential}</span> <span class="oc-lv">Lv ${g.level} · 경험치 ${g.nextXp?`${g.xp}/${g.nextXp}`:'MAX'}</span></p>
   <progress value="${g.nextXp?g.xp:1}" max="${g.nextXp??1}" aria-label="경험치"></progress>${availabilityLine(o)}
   <ul class="oc-stats">${STAT_LABELS.map(k=>`<li><span>${symImg(...C270_STAT_SYMS[k],{size:'sm'})}${k}</span><i style="--v:${Math.max(0,Math.min(100,stats[k]??0))}%"></i><b>${stats[k]??'—'}</b></li>`).join('')}</ul></div></div>
 <details class="oc-sub"><summary>하위 능력치 · 병종</summary><dl>${STAT_LABELS.map(axis=>`<dt>${axis}</dt><dd>${SUB_AXES[axis].map(k=>`<span${COMBAT_SUBS.has(k)?' class="cb" title="전투 계산에 쓰임"':''}>${esc(k)} <b>${campaignSubAbility(state,o.officerId,axis,k)}</b></span>`).join('')}</dd>`).join('')}<dt>병종</dt><dd>${esc((o.multiTroopTrait?.troopTypes??[o.troopType]).map(troopName).join(' · '))}${o.multiTroopTrait?' · 겸병':''}</dd></dl><p class="muted">밑줄 = 전투 계산에 쓰이는 능력치.</p></details>
 ${careerSection(g)}${titleProgress(g,CAREER_DATA.titles).map(t=>`<p class="c186-title-progress">다음 칭호 「${esc(t.name)}」 · ${esc(t.text)} · ${t.parts.map(p=>`${Math.min(p.value,p.target)}/${p.target}`).join(' · ')}</p>`).join('')}${c29Section(o.officerId)}${bondSection(o.officerId)}${relationSection(o.officerId)}${officerIntroHtml(officerVoiceData,o.officerId)}${characterHistoryHtml(view(state),o.officerId)}
 <h3>특기 칸 · 고유 1 + 장착 ${g.equippedTraitIds?.length??0}/${g.traitSlots}</h3><ul class="oc-slots">${slots}</ul><div class="c311-owned"><p>보유 일반특기 ${g.ownedTraits?.length??0}</p>${g.traitLoadoutReason?'':traitLoadoutButtonHtml(o)}<p>${esc((g.ownedTraits??[]).map(c=>abilityName356(c)).join(' · ')||'보유 일반특기 없음')}</p></div>
 <h3>${g.signature?'R 고유 · E 1칸(출진 전 바꾸기)':`전법 장착 ${g.equippedTacticIds.length}/${CAMPAIGN_TACTIC_SLOTS}`}</h3><ul class="oc-tactics">${equipped.map(c=>tactic(c,true)).join('')}${Array.from({length:Math.max(0,(g.signature?1:CAMPAIGN_TACTIC_SLOTS)-equipped.length)},()=>'<li class="oc-tactic empty">빈 장착 칸</li>').join('')}</ul>
 ${stored.length?`<h3>보관한 전법 ${stored.length}</h3><ul class="oc-tactics stored">${stored.map(c=>tactic(c,false)).join('')}</ul>`:''}
 ${reason?`<p class="oc-lock">${esc(reason==='TACTIC_LOADOUT_DEPLOYED'?'출진 중에는 E 전법을 바꿀 수 없습니다.':reason)}</p>`:''}`;
 if(document.documentElement.dataset.ui==='kit')arrangeKitOfficer(o);
 {const im=$('#officer-content .oc-face img:not(.c347-beast)'),art=fullArt(o.officerId);if(im&&art){im.style.opacity='0';cutout(art.src).then(u=>{if(im.isConnected){im.src=u??art.src;im.style.opacity='';}});}}
}
let officerTab='ability',officerSkill='Q';
const c295OfficerTrail=[];
function arrangeKitOfficer(o){
 const root=$('#officer-content'),v=view(state),g=o.growth;
 if($('#roster').hidden||c295DetailIds&&!c295DetailIds.includes(o.officerId))c295DetailIds=null;
 const take=selector=>root.querySelector(selector);
 const face=take('.oc-face'),meta=take('.oc-meta'),stats=take('.oc-stats');
 const engine=take('.c230-engine'),costume=take('.oc-costume');
 const sections=[...root.children].filter(n=>!n.matches('.oc-head'));
 const shell=document.createElement('div');shell.className='c258-sheet';
 const own=Object.values(v.officers).filter(x=>x.allegianceFactionId===o.allegianceFactionId);
 const ids=c295DetailIds?.filter(id=>v.officers[id])??own.map(x=>x.officerId),index=ids.indexOf(o.officerId);
 const start=Math.max(0,Math.min(index-3,ids.length-7)),faceRoster=ids.slice(start,start+7).map(id=>v.officers[id]);
 shell.innerHTML=`<nav class="c258-officer-nav" aria-label="장수 넘기기"><span>${c295DetailIds?'검색 결과':'소속 장수'} ${index+1}/${ids.length}</span><button data-onav="-1" ${index<=0?'disabled title="첫 장수입니다"':''} aria-label="이전 장수">◀</button><button data-onav="1" ${index>=ids.length-1?'disabled title="마지막 장수입니다"':''} aria-label="다음 장수">▶</button></nav><nav class="c258-tabs" role="tablist">${[['ability','능력 · 특기 · 전법'],['relations','관계 · 인연'],['history','지난 일']].map(([id,label])=>`<button class="k-tab" role="tab" data-otab="${id}" aria-selected="${officerTab===id}">${label}</button>`).join('')}</nav><section class="c258-middle"></section><section class="c258-right"></section><nav class="c258-faces" aria-label="소속 장수">${faceRoster.map(x=>`<button data-onav-id="${esc(x.officerId)}" aria-label="${esc(x.name)}" aria-pressed="${x.officerId===o.officerId}"><img src="${esc(faceOf(x.officerId)??'')}" alt="${esc(x.name)}"></button>`).join('')}</nav>`;
 const middle=shell.querySelector('.c258-middle'),right=shell.querySelector('.c258-right');
 root.replaceChildren(face,shell);
 meta.querySelector('.oc-stats')?.remove();middle.append(meta);
 if(costume)meta.append(costume);
 const page=(id,host)=>{const el=document.createElement('div');el.className='c258-page';el.dataset.opage=id;el.hidden=officerTab!==id;host.append(el);return el;};
 const ability=page('ability',middle),rel=page('relations',middle),history=page('history',middle),abilities=page('ability',right),relations=page('relations',right),chronicle=page('history',right);
 ability.append(stats);if(engine)ability.append(engine);
 const promotion=pendingCampaignDraft(state);if(promotion?.draft?.promotion&&promotion.officerId===o.officerId)ability.insertAdjacentHTML('beforeend','<button class="k-btn" data-c270-promotion>전직</button>');
 let nextTarget=ability;
 for(const node of sections){
  if(node.matches('.bond-section,.oc-bonds,.bond-list')||node.querySelector?.('.bond-list')){rel.append(node);continue;}
  if(node.matches('.oc-rel')||node.querySelector?.('.oc-rel')){relations.append(node);continue;}
  if(node.matches('h3')){
   if(node.textContent.startsWith('관계'))nextTarget=relations;
   else if(node.textContent.startsWith('특기 칸'))nextTarget=abilities;
   else if(/전법|R 고유/.test(node.textContent))nextTarget=abilities;
   else nextTarget=chronicle;
  }
  if(node.matches('.c280-intro,.c216-history,.oc-career,.c186-title-progress')){history.append(node);continue;}
  if(node.matches('.oc-c29')){node.dataset.oskillExtra='R';node.hidden=officerSkill!=='R';abilities.append(node);continue;}
  nextTarget.append(node);
 }
 const slots=abilities.querySelector('.oc-slots');
 if(slots){
  const title=[...abilities.querySelectorAll('h3')].find(n=>n.textContent.startsWith('특기 칸'));if(title)title.textContent='일반특기 · 장착 3칸';
  const unique=[...slots.children].filter(n=>n.querySelector('.unique'));
  if(unique.length){const section=document.createElement('ul');section.className='c258-unique';section.append(...unique);abilities.prepend(section);}
  while(slots.children.length>3&&slots.lastElementChild.matches('.empty'))slots.lastElementChild.remove();
  while(slots.children.length<3)slots.insertAdjacentHTML('beforeend','<li class="oc-slot empty">? ?</li>');
 }
 const army=Object.values(v.ownArmies).find(a=>a.commanderId===o.officerId);
 const actions=army?.engineActions??[];
 const signature=g.cards.find(c=>c.traitId===g.signature?.traitId)||g.cards.find(c=>c.signature||c.classTag==='고유');
 const q=TROOP_Q_RULES[troopToCampaign(o.troopType)];
 const skills=[['Q',army?.troopQ?.name||q?.name||`${c295TroopName(o.troopType)} 기술`,q?`병종 공통 기술 · 재사용 대기 ${q.cooldown}차례${q.range?` · 사거리 ${q.range}`:''}. 지도에서 부대를 골라 사용합니다.`:'병종 기술 정보 없음'],['W',c295PublicLabel(actions[0]?.name||o.engine?.name,'계통 기술'),o.engine?.judgment||'계통 기술 정보 없음'],['E',abilityName356(g.cards.find(c=>g.equippedTacticIds.includes(c.traitId)))||'빈 장착 칸',g.cards.filter(c=>g.equippedTacticIds.includes(c.traitId)).map(c=>cardDescription(c,o.officerId)).join(' · ')||'아래에서 보관 전법을 바꿀 수 있습니다.'],['R',abilityName356(signature)||'고유 전법 없음',signature?cardDescription(signature,o.officerId):'고유 전법 정보 없음']];
 const skillsBox=document.createElement('section');skillsBox.className='c258-skills';
 skillsBox.innerHTML=`<div role="tablist" aria-label="전법">${skills.map(([key,name])=>`<button data-oskill="${key}" aria-selected="${officerSkill===key}" title="${esc(name)}"><i class="k-medallion" data-rarity="${key==='E'?g.cards.find(c=>g.equippedTacticIds.includes(c.traitId))?.rarity??'':''}">${key==='R'?`<img src="/assets/officer-art/bust/${esc(o.officerId)}.webp" alt="">`:key==='Q'?symImg('troops',({BT01:'sword',BT02:'spear',BT03:'bow',BT04:'cavalry'})[troopToCampaign(o.troopType)],{size:'lg'}):key==='W'?symImg(...(C270_ENGINE_SYMS[o.engine?.engineId]??['global','officers']),{size:'lg'}):esc(abilityName356(g.cards.find(c=>g.equippedTacticIds.includes(c.traitId))).slice(0,1)||'·')}</i><small>${key}</small><b>${esc(name)}</b></button>`).join('')}</div>${skills.map(([key,,text])=>`<p title="${esc(text)}" data-oskill-description="${key}" ${officerSkill===key?'':'hidden'}>${esc(text)}</p>`).join('')}`;
 const uniqueBlock=abilities.querySelector('.c258-unique');if(uniqueBlock)uniqueBlock.after(skillsBox);else abilities.prepend(skillsBox);
 for(const node of [...abilities.children]){if(node.matches('.oc-tactics,.oc-lock')||node.matches('h3')&&/전법|R 고유/.test(node.textContent)){node.dataset.oskillExtra='E';node.hidden=officerSkill!=='E';}}
 const latest=g.titles?.at(-1);if(latest){const title=latest;if(title)meta.insertAdjacentHTML('afterbegin',`<span class="c270-title" title="${esc(title.text)}">「${esc(title.name)}」</span>`);}
 meta.insertAdjacentHTML('beforeend',`<button class="k-btn c270-location" data-officer-location="${esc(o.officerId)}" title="지도에서 보기">${esc(officerRole(v,o.officerId)||'자리 정보 없음')}</button>`);
 for(const key of ['E','R']){
  const nodes=[...abilities.querySelectorAll(`[data-oskill-extra="${key}"]`)];if(!nodes.length)continue;
  const extra=document.createElement('section');extra.className='c270-skill-extra';extra.hidden=officerSkill!==key;extra.dataset.oskillExtra=key;
  extra.append(...nodes);skillsBox.after(extra);
 }

 // Each long collection is paged inside its column, never a vertical scroll.
 c295Arrange(root,meta,stats,engine,ability,abilities,rel,relations,history,chronicle);
}
function c295Arrange(root,meta,stats,engine,ability,abilities,rel,relations,history,chronicle){
 root.classList.add('c295-officer','c354-officer');
 const shell=root.querySelector('.c258-sheet'),v=view(state),identity=v.officers[selectedOfficerId],g=identity.growth;
 meta.classList.add('c295-header');shell.append(meta);
 meta.querySelector('p').textContent=[c295TroopName(identity.troopType),c295PublicLabel(identity.engine?.name,'계통 없음'),FACTION_STYLE[identity.allegianceFactionId]?.name??'무소속'].join(' · ');
 const faction=identity.allegianceFactionId;
 if(faction&&FACTION_STYLE[faction])root.querySelector('.oc-face')?.insertAdjacentHTML('afterbegin',`<img class="c347-beast" src="/assets/ui-v3/emblems/${esc(faction)}.png" alt="${esc(FACTION_STYLE[faction].name)} 신수 깃발">`);
 if(c295OfficerTrail.length){const back=document.createElement('button');back.textContent='이전 인물로';back.className='c295-back';back.onclick=c295ReturnRelative;shell.querySelector('.c258-officer-nav').prepend(back);}
 const intro=history.querySelector('.c280-intro');if(intro){
  for(const paragraph of intro.querySelectorAll('p'))paragraph.textContent=paragraph.textContent.trim().replace(/^[“”"]+|[“”"]+$/g,'').replace(/\s+/g,' ');
  meta.append(intro);
 }
 const body=document.createElement('div');body.className='c295-body';shell.append(body);
 for(const pane of [ability,rel,history]){pane.classList.add('c295-pane');body.append(pane);}
 rel.append(relations);history.append(chronicle);if(engine)history.prepend(engine);
 // Keep relation navigation on the relationship tab, using projected links only.
 const social=v.social,links=(social?.officers?.[selectedOfficerId]?.relations??[]).filter(r=>r.officerId!==social.lordId);
 [...relations.querySelectorAll('.oc-rel li')].forEach((row,i)=>{const target=links[i]?.officerId;if(!v.officers[target]?.growth)return;row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label',links[i].name+' 정보');row.onclick=()=>{c295OfficerTrail.push({id:selectedOfficerId,ids:c295DetailIds});selectedOfficerId=target;renderOfficerCard();};row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}};});
 const skills=abilities.querySelector('.c258-skills');
 const core=g.cards.find(c=>c.core&&c.kind==='trait');
 const passive=document.createElement('button');passive.dataset.oskill='unique';passive.title=abilityName356(core)||'고유특기 없음';passive.setAttribute('aria-selected',String(officerSkill==='unique'));
 passive.innerHTML=`<i class="k-medallion">${symImg('global','officers',{size:'lg'})}</i><small>고유</small><b>${esc(passive.title)}</b>`;
 skills.querySelector('[role="tablist"]').prepend(passive);
 skills.querySelector('[role="tablist"]').setAttribute('aria-label','고유특기와 QWER');
 const description=document.createElement('section');description.className='c354-description';description.setAttribute('aria-label','선택한 기술 설명');
 const selected=skills.querySelector(`[data-oskill="${officerSkill}"]`);
 description.innerHTML=`<h3>${esc(selected?.title??passive.title)}</h3>`;
 if(officerSkill==='unique')description.insertAdjacentHTML('beforeend',`<p>${esc(core?cardDescription(core,identity.officerId):'고유특기 정보 없음')}</p>`);
 else {const node=skills.querySelector(`[data-oskill-description="${officerSkill}"]`);if(node)description.append(node);}
 if(officerSkill==='E'&&['이간','이호경식'].includes(selected?.title))description.insertAdjacentHTML('afterbegin','<div class="c347-skill-scene" aria-hidden="true"></div>');
 const effect=description.querySelector('[data-oskill-description]');
 if(effect){
  const text=effect.textContent,split=text.indexOf('서로 붙은');
  if(split>0){const condition=document.createElement('p');condition.className='c357-condition';condition.textContent=text.slice(0,split).replace(/^.*?—\s*/, '').replace(/[,·\s]+$/,'');effect.title=text;effect.textContent=text.slice(split).replace(/효과\([^)]*\)/,'효과');effect.before(condition);}
 }
 // Existing E loadout controls stay reachable without the redundant E/R category rows.
 if(officerSkill==='E'){
  const lists=[...abilities.querySelectorAll('.oc-tactics,.oc-lock')];
  if(lists.length){const change=document.createElement('details');change.className='c354-tactics';change.innerHTML='<summary>전법 바꾸기</summary>';for(const n of lists){n.hidden=false;change.append(n);}description.append(change);}
 }
 if(officerSkill==='R'){
  const extra=abilities.querySelector('.oc-c29');
  if(extra){extra.hidden=false;extra.querySelector('h3')?.remove();const detail=document.createElement('details');detail.className='c354-tactics';detail.innerHTML='<summary>각성 · 전법 변형</summary>';detail.append(extra);description.append(detail);}
 }
 for(const node of skills.querySelectorAll('[data-oskill-description]'))node.remove();
 for(const button of skills.querySelectorAll('[data-oskill]')){
  const key=button.dataset.oskill,name=button.title;
  const card=key==='unique'?core:key==='R'?g.cards.find(c=>c.traitId===g.signature?.traitId):g.cards.find(c=>g.equippedTacticIds.includes(c.traitId));
  button.querySelector('.k-medallion').innerHTML=dockIcon327({officer:identity,army:{troopType:identity.troopType,engine:identity.engine}},key==='unique'?'passive':key,card??{});
  const art=key==='Q'&&troopToCampaign(identity.troopType)==='BT02'?'spear':key==='W'&&identity.engine?.engineId==='GUKSA'?'scroll':(key==='E'&&['이간','이호경식'].includes(name))?'tigers':key==='R'&&identity.officerId==='G04'?'throne':key==='unique'&&identity.officerId==='G04'?'throne':null;
  if(art)button.querySelector('.k-medallion')?.insertAdjacentHTML('afterbegin',`<span class="c347-skill-paint" data-art="${art}" aria-hidden="true"></span>`);
 }
 // campaignSubAbility is the existing engine readout, with no duplicated stat rules.
 const major=statsToOfficerPack(identity.baseStats),sub=Object.fromEntries(STAT_LABELS.map(axis=>[axis,Object.fromEntries(SUB_AXES[axis].map(key=>[key,campaignSubAbility(state,identity.officerId,axis,key)]))]));
 ability.replaceChildren(skills,description);
 ability.insertAdjacentHTML('beforeend',officerStats354(major,sub)+officerTraits354(identity,inputLocked()));
 const faces=shell.querySelector('.c258-faces');rel.append(faces);
 for(const pane of [rel,history])if(!pane.textContent.trim())pane.textContent=pane===rel?'알려진 관계가 없습니다.':'아직 지난 일이 없습니다.';
}

function c295ReturnRelative(){const previous=c295OfficerTrail.pop();if(!previous)return;selectedOfficerId=previous.id;c295DetailIds=previous.ids;renderOfficerCard();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#officer-modal').hidden&&c295OfficerTrail.length){e.preventDefault();e.stopImmediatePropagation();c295ReturnRelative();}},true);
$('#officer-modal').addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&e.target.closest('[data-oskill="E"]')){e.preventDefault();officerSkill='E';renderOfficerCard();$('#officer-content').querySelector('[data-loadout]')?.focus();}});
function paginateOfficerColumn(host){
 const nodes=[...host.children];if(!nodes.length)return;
 const column=host.parentElement,reference=column.querySelector('.c258-page:not([hidden])');
 const top=(reference??host).getBoundingClientRect().top;
 const capacity=Math.max(160,column.getBoundingClientRect().bottom-top-48),pages=[];let current=[],height=0;
 const blocks=[];
 const split=node=>{
  if(node.matches('section:not(.c280-intro)')){for(const child of [...node.children])split(child);return;}
  if(node.matches('ul')){
   const rows=[...node.children],step=node.matches('.oc-rel')?2:1;
   for(let i=0;i<rows.length;i+=step){const group=node.cloneNode(false);group.append(...rows.slice(i,i+step));blocks.push(group);}return;
  }
  blocks.push(node);
 };
 for(const node of nodes)split(node);
 for(const part of blocks){
  const estimate=Math.max(40,part.getBoundingClientRect().height||Math.ceil(part.textContent.length/32)*24+32);
  if(current.length&&height+estimate>capacity){pages.push(current);current=[];height=0;}
  current.push(part);height+=estimate;
 }
 if(current.length)pages.push(current);if(pages.length<2){host.replaceChildren(...(pages[0]??[]));return;}
 host.replaceChildren();let index=0;
 const body=document.createElement('div'),nav=document.createElement('nav');nav.className='c258-pager';
 const show=()=>{body.replaceChildren(...pages[index]);nav.innerHTML=`<button data-page-step="-1" ${index?'':'disabled'}>이전</button><span>${index+1} / ${pages.length}</span><button data-page-step="1" ${index<pages.length-1?'':'disabled'}>다음</button>`;};
 nav.onclick=e=>{const b=e.target.closest('[data-page-step]');if(b&&!b.disabled){index+=Number(b.dataset.pageStep);show();}};
 host.append(body,nav);show();
}
$('#officer-content').addEventListener('click',e=>{
 const trait=e.target.closest('[data-c354-trait]');
 if(trait){
  const o=view(state).officers[selectedOfficerId],g=o?.growth;
  if(!g||g.traitLoadoutReason||inputLocked()||trait.disabled)return;
  const id=trait.dataset.c354Trait;if(!g.ownedTraits?.some(c=>c.traitId===id))return;
  const ids=[...(g.equippedTraitIds??[])],on=ids.includes(id);
  if(!on&&ids.length>=3){inkToast('바꿀 장착 특기를 먼저 해제하세요.');return;}
  command({type:'EQUIP_TRAITS',officerId:o.officerId,traitIds:on?ids.filter(x=>x!==id):[...ids,id]});renderOfficerCard();return;
 }
 const tab=e.target.closest('[data-otab]');if(tab){officerTab=tab.dataset.otab;renderOfficerCard();return;}
 if(e.target.closest('[data-c270-promotion]')){selectedOfficerId=null;$('#officer-modal').hidden=true;renderGrowthDraft();return;}
 const location=e.target.closest('[data-officer-location]');if(location){const v=view(state),id=location.dataset.officerLocation,army=Object.values(v.ownArmies).find(a=>a.commanderId===id),city=Object.values(v.ownCities).find(c=>c.governorId===id||(c.freeOfficers??[]).some(o=>o.officerId===id));if(army||city){selectedOfficerId=null;$('#officer-modal').hidden=true;$('#roster').hidden=true;selectCommandRow(army?'unit':'city',army?.armyId??city?.cityId);}return;}
 const skill=e.target.closest('[data-oskill]');if(skill){officerSkill=skill.dataset.oskill;renderOfficerCard();return;}
 const nav=e.target.closest('[data-onav],[data-onav-id]');if(!nav)return;
 if(nav.disabled)return;const v=view(state),o=v.officers[selectedOfficerId],ids=c295DetailIds?.filter(id=>v.officers[id])??Object.values(v.officers).filter(x=>x.allegianceFactionId===o.allegianceFactionId).map(x=>x.officerId);
 selectedOfficerId=nav.dataset.onavId??ids[ids.indexOf(selectedOfficerId)+Number(nav.dataset.onav)];renderOfficerCard();
});
document.addEventListener('keydown',e=>{
 if(document.documentElement.dataset.ui!=='kit'||$('#officer-modal').hidden||!['ArrowLeft','ArrowRight'].includes(e.key)||e.isComposing||e.target.closest('input,select,textarea,[role=slider],[contenteditable=true],dialog'))return;
 e.preventDefault();$('#officer-content [data-onav="'+(e.key==='ArrowLeft'?'-1':'1')+'"]').click();
});
function refreshC270Roster(){const host=$('#officers'),scroll=host.querySelector('.ri-list')?.scrollTop??0;host.innerHTML=rosterInk(view(state));const list=host.querySelector('.ri-list');if(list)list.scrollTop=scroll;rosterInkArt();}
$('#officers').addEventListener('change',e=>{if(e.target.matches('[data-c295-sort]')){rosterSort=e.target.value;rosterPage=0;refreshC270Roster();}});
$('#officers').addEventListener('click',e=>{const pin=e.target.closest('[data-c295-pin]');if(pin){c295Compare=pin.dataset.c295Pin;refreshC270Roster();}if(e.target.closest('[data-c295-unpin]')){c295Compare=null;refreshC270Roster();}});
$('#officers').addEventListener('input',e=>{if(!e.target.matches('[data-roster-search]')||e.isComposing)return;const start=e.target.selectionStart;rosterQuery=e.target.value;rosterPage=0;refreshC270Roster();const input=$('#officers').querySelector('[data-roster-search]');input?.focus();input?.setSelectionRange(start,start);});
$('#officers').addEventListener('compositionend',e=>{if(e.target.matches('[data-roster-search]'))e.target.dispatchEvent(new Event('input',{bubbles:true}));});
$('#officers').addEventListener('click',e=>{const page=e.target.closest('[data-roster-page]');if(page&&!page.disabled){rosterPage+=Number(page.dataset.rosterPage);refreshC270Roster();$('#officers').querySelector('[data-roster-page]')?.focus();}if(e.target.closest('[data-roster-reset]')){rosterQuery='';rosterFilter='all';rosterPage=0;refreshC270Roster();$('#officers').querySelector('[data-roster-search]')?.focus();}});
$('#officers').addEventListener('click',e=>{if(e.target.closest?.('[data-rsort]')){rosterSort=rosterSort==='name'?'leadership':'name';$('#officers').innerHTML=rosterInk(view(state));rosterInkArt();return;}const rf=e.target.closest?.('[data-rfilter]');if(rf){rosterFilter=rf.dataset.rfilter;rosterPage=0;$('#officers').innerHTML=rosterInk(view(state));rosterInkArt();return;}const row=e.target.closest?.('.ri-row[data-pick]');if(row){rosterPick=row.dataset.pick;refreshC270Roster();$('#officers').querySelector(`.ri-row[data-pick="${rosterPick}"]`)?.focus();return;}const tk=e.target.closest?.('[data-talk]');if(tk){if(!tk.disabled&&!inputLocked()){$('#roster').hidden=true;openVisit(tk.dataset.talk);}return;}const id=e.target.closest('[data-officer]')?.dataset.officer;if(id){officerTab='ability';c295OfficerTrail.length=0;c295DetailIds=c295RosterIds.includes(id)?[...c295RosterIds]:null;selectedOfficerId=id;renderOfficerCard();}});
function closeOfficerDetail362(){
 c295OfficerTrail.length=0;selectedOfficerId=null;$('#officer-modal').hidden=true;
 // The roster stays mounted, preserving its query, page, comparison and selection.
 if(!$('#roster').hidden)$('#officers').querySelector('[data-officer]')?.focus();
}
$('#officer-close').addEventListener('click',closeOfficerDetail362);
$('#officer-content').addEventListener('click',e=>{const b=e.target.closest?.('[data-costume]');if(!b)return;const id=b.dataset.costume,list=COSTUMES[id]??[],next=list[(list.findIndex(x=>x.file===CUTOUT[id])+1)%list.length];if(!next)return;CUTOUT[id]=next.file;try{localStorage.setItem('sangoku.costume.'+id,next.id);}catch{}render();renderOfficerCard();});
$('#dejavu')?.addEventListener('click',closeDejaVu);
$('#visit-modal')?.addEventListener('click',e=>{
 if(c216Scene()){if(e.target.closest('[data-relation-next]'))command({type:'CLOSE_RELATION_SCENE'});return;}
 if(e.target.closest('[data-visit-close]')||e.target===e.currentTarget){visitScene=null;renderVisit();return;}
 const i=e.target.closest('[data-visit-choice]')?.dataset.visitChoice;if(i!==undefined)pickVisit(Number(i));
});
document.addEventListener('keydown',e=>{if(state&&c216Scene()){e.stopImmediatePropagation();if(e.key==='Escape'||e.key==='Enter'||e.key===' '){e.preventDefault();command({type:'CLOSE_RELATION_SCENE'});}return;}if(!visitScene)return;if(e.key==='Escape'){visitScene=null;renderVisit();e.stopImmediatePropagation();}else if(/^[1-3]$/.test(e.key)){pickVisit(Number(e.key)-1);e.stopImmediatePropagation();}});
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
 panel.innerHTML='<h3>포로</h3>'+captives.map(p=>`<p>${esc(p.name)} · ${esc(factionName(p.homeFactionId))}${p.negotiating?' · 등용 협의 1차례':''}</p>${recruitmentReasonHtml(p)}<div class="options c192-captive-options">${[['hold','억류'],['release','무상 석방'],['recruit','조건부 등용']].map(([action,label])=>{const preview=captiveActionPreview(state,p.prisonerId,action),reason=p.negotiating?'등용 협의 중':action==='recruit'?captiveRecruitmentReason(state,p):null;return `<div><button class="option" data-captive="${esc(p.prisonerId)}" data-captive-action="${action}" ${reason||inputLocked()?'disabled':''}><b>${label}</b></button>${captivePreviewHtml(preview)}</div>`;}).join('')}</div>`).join('');
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
 const busy=combatAnimating||state.phase!=='PLAYER'||v.pendingEvent||pendingCampaignDraft(state)||[...document.querySelectorAll('.w-modal,.modal-backdrop,#city-stage,#sortie-screen,#c226-stratagem')].some(m=>!m.hidden);
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
 const seats=ids.length<2?'<p class="muted">이 성에 장수가 두 명 이상 있어야 합니다.</p>':`<ul class="feast-seats">${ids.map(id=>{const on=feastPick.includes(id);return `<li><button class="feast-seat${on?' on':''}" data-feast-pick="${esc(id)}" aria-pressed="${on}" ${!on&&feastPick.length>=3?'disabled':''}>${faceChip(id)}<i class="rk" data-r="${role(id)}" aria-hidden="true"></i><b>${esc(officerName(id))}</b><small>${role(id)}</small></button>${traitLoadoutButtonHtml(v.officers[id])}</li>`;}).join('')}</ul>`;
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
 return `${guest}<p class="tavern-acts"><button class="btn" ${one&&!why?`data-visit="${esc(one)}"`:'disabled'} title="${esc(why||'찾아가 이야기한다 — 군주와 친밀도가 오른다(장수마다 한 달에 한 번)')}"><img src="/assets/ui-v3/hud/icons/b-talk.png" alt=""><span>이야기한다${one?` · ${esc(officerName(one))}`:''}</span></button><button class="btn" ${w?`data-wanderer="${esc(w.officerId)}"`:''} ${!w||wandererReason(w.officerId,c.cityId)?'disabled':''} title="${esc(w?(wandererReason(w.officerId,c.cityId)||`등용 협의 1턴 · 인망 ${cityRecruitCost(state,c.cityId,state.playerFactionId,w.officerId)} 소모`):'이 성에 떠돌이 인재가 없습니다')}"><img src="/assets/ui-v3/hud/icons/b-treaty.png" alt=""><span>인재를 맞는다${w?` · ${esc(w.name)}`:''}${w?recruitmentReasonHtml(cityRecruitQuote(state,c.cityId,state.playerFactionId,w.officerId)):''}</span></button></p>`;
}
function visitListHtml(v,c){
 const soc=v.social,ids=relationCityOfficers(state,state.cities[c.cityId]).filter(id=>id!==soc.lordId),g=RELATIONS.gains.visit.values;
 const rows=ids.map(id=>{const s=soc.officers[id],r=relation(state,soc.lordId,id);return `<li>${faceChip(id)}<div class="visit-who"><p><b>${esc(officerName(id))}</b>${tierChip(r)}</p>${affBar(r.value)}<small>군주와 ${r.value} · ${statLine(v.officers[id]??state.officers[id])}</small>${availabilityLine(v.officers[id])}</div>${traitLoadoutButtonHtml(v.officers[id])}<button class="btn sm" data-visit="${esc(id)}" ${s?.visitUsed?'disabled':''}>${s?.visitUsed?'이번 달 만남':'찾아가기'}</button></li>`;}).join('');
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
const c273Tracker=createRitualTracker();
const c273Ritual=mountRitual({art:id=>fullArt(id),cutout:src=>cutout(src),done:()=>{render();scheduleOrders();scheduleAi();},reduced:()=>reduceMotion()});
function renderVisit(){
 const modal=$('#visit-modal');if(!modal)return;const relationScene=c216Scene();
 if(typeof c273Ritual!=='undefined'&&typeof c273Tracker!=='undefined'&&typeof ritualEnabled==='function'){
  if(!c273Ritual.busy()){const event=c273Tracker.observe({...view(state),relationScene},ritualEnabled());if(event)c273Ritual.show(event);}
  if(c273Ritual.busy()){modal.hidden=true;return;}
 }
 modal.classList.toggle('c192-relation-scene',!!relationScene);if(relationScene){renderRelationScene(relationScene);return;}modal.hidden=!visitScene;if(!visitScene)return;
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
function renderRelationScene(scene){
 if(['CLOSE','BOUND'].includes(scene.tier))worldSfx.once('guqin',`${state.campaignSeed}:${state.turn}`);
 const modal=$('#visit-modal');modal.hidden=false;modal.setAttribute('aria-label','관계 장면');
 const [a,b]=scene.officers,paint=(host,id)=>{const f=fullArt(id),src=f?.src??faceOf(id);host.innerHTML=src?`<img src="${esc(src)}" alt="${esc(officerName(id))}">`:faceFallback(officerName(id));if(f&&!f.cut){const im=host.querySelector('img');cutout(src).then(u=>{if(im?.isConnected&&u)im.src=u;});}};
 paint($('#visit-art'),a.officerId);paint($('#visit-lord'),b.officerId);
 const face=faceOf(a.officerId);modal.style.setProperty('--visit-face',face?`url(${face})`:'none');
 $('#visit-name').textContent=scene.officers.map(o=>o.name).join(' · ');
 $('#visit-rel').textContent=RELATIONS.tiers.find(t=>t.id===scene.tier)?.name??'관계';
 $('#visit-bond').innerHTML='';$('#visit-scene').textContent='';$('#visit-line').textContent='';
 $('#visit-choices').innerHTML=relationSceneHtml(scene);
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
 const wanderersHtml=(list,own)=>list?.length?`<h3>재야 장수</h3><ul class="wanderers">${list.map(o=>{const f=faceOf(o.officerId);return `<li><span class="wf">${f?`<img src="${esc(f)}" alt="">`:faceFallback(o.name)}</span><div><b>${esc(o.name)}</b><small>${statLine(o)}</small>${own?recruitmentReasonHtml(cityRecruitQuote(state,c.cityId,state.playerFactionId,o.officerId)):""}</div>${own?`<button class="btn sm" data-wanderer="${esc(o.officerId)}" ${wandererReason(o.officerId,c.cityId)?'disabled':''} title="${esc(wandererReason(o.officerId,c.cityId)||`등용 협의 1턴 · 인망 ${cityRecruitCost(state,c.cityId,state.playerFactionId,o.officerId)} 소모`)}">등용</button>`:''}</li>`;}).join('')}</ul>${own?`<p class="muted">등용 협의 1차례 · 성공 시만 인망 소모</p>`:'<p class="muted">이 성을 차지하면 등용할 수 있습니다.</p>'}`:'';
 if(!v.ownCities[selectedCityId]){panel.innerHTML=header+`<dl class="ch-facts"><dt>소유</dt><dd>${c.ownerFactionId?esc(factionName(c.ownerFactionId)):'중립 · 소유 세력 없음'}</dd><dt>정보</dt><dd>관측한 도시 위치 · 안쪽 자원과 작업은 모름</dd></dl>${wanderersHtml(c.wanderers,false)}`;return;}
 const rates=cityEconomyRates(state,state.cities[selectedCityId]),status=cityOccupationStatus(state,state.cities[selectedCityId]);
 const occupation=occupationDisplay(state,state.cities[selectedCityId]);
 const gov=c.governorId?v.officers[c.governorId]:null,govFace=gov?faceOf(gov.officerId):null;
 const yieldsHtml=`<div class="city-yields"><span class="cy-gov">${govFace?`<img src="${esc(govFace)}" alt="">`:gov?faceFallback(gov.name):'<i>공석</i>'}<small>태수</small><b>${esc(gov?.name??'공석')}</b></span>${[['food','식량',rates.food],['build','생산',rates.production],['science','학문',rates.science],['politics','인망',rates.prestige]].map(([ic,n,x])=>`<span class="cy">${UI_ICON(ic)}<small>${n}</small><b>+${cityNumber(x)}</b></span>`).join('')}</div>`;
 const occupationOptions=['CAPTURED','OCCUPATION'].includes(occupation.stage)?`<div class="occ-box"><h3>점령 처리 방식</h3><div class="options">${Object.entries(OCCUPATION_METHODS).map(([method,label])=>{const reason=occupationMethodReason(state,state.cities[selectedCityId],method);return `<button class="option" data-occupation-method="${method}" ${reason||inputLocked()?'disabled':''}><b>${label}</b><small>${esc(reason??{conciliation:'주민 유지식량 · 1턴',military:'현역 50% 주둔 · 2턴',plunder:'재고 30% · 인망 −20 · 시설 손상 → 군정'}[method])}</small></button>`;}).join('')}</div></div>`:'';
 const governors=[...Object.values(v.officers).filter(o=>o.lifeState==='ALIVE'&&o.captivityState==='FREE'&&o.travelState==='STATIONARY'&&o.locationRef.kind==='NONE'),...(c.freeOfficers??[]).map(o=>v.officers[o.officerId]??o)].filter((o,i,a)=>a.findIndex(x=>x.officerId===o.officerId)===i);
 const musterOfficers=[...(c.freeOfficers??[]),...(c.governorId&&!Object.values(v.ownArmies).some(a=>a.commanderId===c.governorId)&&v.officers[c.governorId]?[v.officers[c.governorId]]:[])];
 const governorSelection=occupation.stage==='NORMAL'&&governors.length?`<label>태수 후보 <select id="city-governor">${governors.map(o=>`<option value="${esc(o.officerId)}">${esc(o.name)}</option>`).join('')}</select></label><button class="btn sm" data-governor-appoint ${inputLocked()?'disabled':''}>태수 임명</button>`:'';
 const governor=v.officers[c.governorId],portrait=portraits[c.governorId]?.path;
 const armies=Object.values(v.ownArmies).filter(a=>{
  const [q,r]=a.tileId.split(',').map(Number),[cq,cr]=c.tileId.split(',').map(Number);
  return Math.max(Math.abs(q-cq),Math.abs(r-cr),Math.abs(q+r-cq-cr))<=2&&a.troopCount>0;
 });
 const jobList=c.jobs?c.jobs.map(j=>[j.kind,{...CITY_JOBS[j.kind],name:j.name,cost:j.cost,estimate:j.estimate,description:j.kind==='recruit'?JOB_FX.recruit:j.description??CITY_JOBS[j.kind]?.description??JOB_FX[j.kind]},j.blockedReason]):Object.entries(CITY_JOBS);
 const JOB_THUMB={tuntian:'tuntian',farm:'farm',granary:'granary',workshop:'workshop',market:'market',barracks:'barracks',clinic:'clinic',muster:'barracks',recruit:'barracks',reorganize:'barracks',repair:'workshop',mufu:'mufu'};
 const optionList=jobList.map(([kind,job,reason])=>{
  const progress=kind==='reorganize'&&c.currentProduction?.kind===kind?c.productionProgress:c.jobProgress?.[kind]??0;
  const estimateJob=job.estimate??{kind,cost:job.cost,progress,gain:(c.production||rates.production)*(['recruit','reorganize'].includes(kind)?1+rates.workBonus:1)},estimate=productionReadout(estimateJob),remaining=estimate.turns??(estimateJob.gain===0&&estimateJob.progress+(estimateJob.advance??0)<estimateJob.cost&&state.cities[c.cityId]?.c33?.taxUntil>=state.turn?'상환 종료 후 재개':'생산 회복 후 재개');
  const blocked=!!reason||kind==='farm'&&c.facilities.filter(f=>f.kind==='farm').length>=2;
  if(kind==='muster')return '';
  const unavailable=reason&&blocked?reasonText(reason):kind==='reorganize'&&!armies.length?'성 주변 2칸 안에 재편할 부대 없음':kind==='muster'&&!musterOfficers.length?'이 성에 출진할 장수 없음' :'';
  const thumb=v3Asset(`facilities/${JOB_THUMB[kind]??'workshop'}.png`),gface=faceOf(c.governorId); // 흑묵 업무 줄(기준 page-office): 담당 얼굴 · 시설 그림 · 칸(생산·진행·남은 턴)
  if((stage.fac==='office'&&!['muster','recruit','reorganize'].includes(kind))||(stage.fac==='barracks'&&['recruit','reorganize'].includes(kind))){
   const finish=unavailable?'시작 불가':status!=='NORMAL'?'점령 처리 중 · 중단':estimate.turns===null?remaining:`${estimate.turns}차례 남음`,finishDate=!unavailable&&status==='NORMAL'&&estimate.turns!==null?campaignDate(v.turn+estimate.turns):'';
   return `<button class="option office-job" data-city-job="${kind}" style="${thumb?`--thumb:url(${thumb});`:''}${gface?`--gface:url(${gface})`:''}" aria-pressed="${c.currentProduction?.kind===kind}" ${inputLocked()||blocked||kind==='reorganize'&&!armies.length?'disabled':''}><span class="job-main"><b>${esc(job.name)}</b><em>${esc(job.description??'')}</em>${unavailable?`<small class="job-reason">${esc(unavailable)}</small>`:''}</span><span class="job-cost"><small>생산 비용</small><strong>${cityNumber(job.cost)}</strong><small>진행 ${cityNumber(progress)} / ${cityNumber(job.cost)}</small></span><span class="job-finish"><strong>${esc(finish)}</strong><small>${finishDate?`${esc(finishDate)}<br>완료 예상`:''}</small></span></button>`;
  }
  return `<button class="option" data-city-job="${kind}" title="${esc([job.description,estimate.line].filter(Boolean).join(' · '))}" style="${thumb?`--thumb:url(${thumb});`:''}${gface?`--gface:url(${gface})`:''}" aria-pressed="${c.currentProduction?.kind===kind}" ${inputLocked()||blocked||kind==='reorganize'&&!armies.length||kind==='muster'&&!musterOfficers.length?'disabled':''}>${UI_ICON(JOB_ICON[kind]??'build')}<b>${job.name}</b>${job.description?`<em class="job-fx">${esc(job.description)}</em>`:''}<small>${unavailable?esc(unavailable):`생산 ${job.cost} · ${cityNumber(progress)}/${job.cost} · ${status==='NORMAL'?esc(estimate.line):'중단'}`}</small><span class="job-track"><i style="width:${Math.min(100,progress/job.cost*100)}%"></i></span><span class="ink-cells"><i data-k="cost" title="생산 비용">${job.cost}</i><i data-k="done" title="진행">${cityNumber(progress)}</i><i data-k="turns" title="남은 차례">${unavailable?'—':status==='NORMAL'?remaining:'—'}</i><i data-k="state" title="상태">${c.currentProduction?.kind===kind?'●':''}</i></span></button>`;
 });
 const MIL_JOBS=new Set(['muster','recruit','reorganize']),options=optionList.filter((_,k)=>!MIL_JOBS.has(jobList[k][0])).join(''),milOptions=optionList.filter((_,k)=>MIL_JOBS.has(jobList[k][0])&&jobList[k][0]!=='muster').join(''),musterOption='<button type="button" class="option" data-sortie-open><b>출진</b><small>누르면 바로 출진 · 같은 차례에 여러 부대 가능</small></button>';
 const cause=x=>{const d=economyCauseDisplay(x);return `<div class="cause"><span${d.hint?` title="${esc(d.hint)}"`: ''}>${esc(d.label)}</span><span class="v ${x.amount>=0?'up':'down'}">${esc(d.amount)}</span></div>`;};
 const RES_NAME={food:'식량',production:'생산',science:'학문',prestige:'인망'};
 const causes=Object.entries(RES_NAME).map(([r,n])=>{const list=(c.economyCauses??[]).filter(x=>x.resource===r&&(r==='food'||x.amount));return list.length?`<p class="cause-head">${n}</p>${list.map(cause).join('')}`:'';}).join('');
 const tab=({overview:'office',jobs:'office',people:'residence'})[cityTab]??cityTab??'office',pane=(id,html)=>`<section class="city-pane" data-pane="${id}" ${tab===id?'':'hidden'}>${html}</section>`;
 const stat=(icon,label,value)=>`<span class="city-stat">${UI_ICON(icon)}<small>${label}</small><b>${value}</b></span>`;
 const stats=`<div class="city-stats">${stat('people','인구',`${c.population}${c.populationCapacity?`<i>/${c.populationCapacity}</i>`:''}`)}${stat('reserve','예비병',troopText(c.reserveTroops))}${stat('wounded','부상병',troopText(c.woundedTroops))}${stat('security','치안',citySecurity(c))}</div>`;
 const tabs=`<nav class="city-tabs" role="tablist">${[['office','관청'],['barracks','병영'],['tavern','주점'],['residence','저택']].map(([id,n])=>`<button role="tab" data-city-tab="${id}" aria-selected="${tab===id}">${n}</button>`).join('')}</nav>`;
 const working=c.currentProduction?.kind?CITY_JOBS[c.currentProduction.kind]?.name:null;
 const otab=id=>officeTab===id?'':' hidden',workJob=c.currentProduction?.kind?jobList.find(j=>j[0]===c.currentProduction.kind):null,workProg=workJob?(c.jobProgress?.[workJob[0]]??c.productionProgress??0):0;
 const officeTabs=`<nav class="office-tabs" role="tablist">${[['jobs','업무','res-production'],['cmds','특기','b-seal'],['state','형편','res-food'],['built','시설','b-office']].map(([id,n,ic])=>`<button role="tab" data-office-tab="${id}" aria-selected="${officeTab===id}"><img class="oi" src="/assets/ui-v3/hud/icons/${ic}.png" alt=""><span>${n}</span></button>`).join('')}</nav>`;
 const occupationGuide=occupationOptions?'<p class="occupation-guide">점령 정책은 관청의 형편 탭에서 정하세요. <button type="button" class="btn sm" data-office-tab="state">형편 · 점령 정책 열기</button></p>':'';
 const officeGo=`<button class="office-go" data-office-tab="jobs" title="${working?`진행 중 · ${esc(working)}`:'진행 중인 업무 없음'}"><img src="/assets/ui-v3/hud/office-hammer.png" alt=""><span>${working?`<b>${esc(working)}</b><small>${cityNumber(workProg)}/${workJob?.[1]?.cost??'—'}</small>`:'<small>쉬는 중</small>'}</span></button>`;
 panel.innerHTML=header+yieldsHtml+stats+tabs+pane('office',`${officeTabs}${officeGo}<div class="osec" data-osec="jobs"${otab('jobs')}>${occupationGuide}<p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="job-columns" aria-label="업무 수치"><span data-k="cost">생산 비용</span><span data-k="done">진행</span><span data-k="turns">남은 차례</span><span data-k="state">상태</span></div><div class="options">${options}</div></div><div class="osec" data-osec="cmds"${otab('cmds')}>${occupationGuide}
 ${(c.domesticCommands??[]).length?`<h3>내정 특기 명령</h3><div class="options domestic-cmds">${c.domesticCommands.map((d,i)=>`<button class="option cmd" data-domestic="${i}" title="${esc(DOMESTIC_CMD_FX[d.type]??'')}" style="${govFace?`--gface:url(${govFace});`:''}--thumb:url(/assets/ui-v3/hud/icons/b-seal.png)" ${d.blockedReason?'disabled':''}><b>${esc(d.label)}</b>${DOMESTIC_CMD_FX[d.type]?`<em class="job-fx">${DOMESTIC_CMD_FX[d.type]}</em>`:''}<small>${Number.isFinite(d.cost)?`${d.resource==='science'?'학문':'인망'} ${cityNumber(d.cost)}`:''}${d.blockedReason?` · ${esc(d.blockedReason)}`:''}</small></button>`).join('')}</div>`:'<p class="muted">쓸 수 있는 내정 특기 명령이 없습니다.</p>'}</div><div class="osec" data-osec="state"${otab('state')}>
 ${occupationGuide}<h3 class="city-sec">성 형편</h3><ol class="steps"><li class="${status==='NORMAL'?'done':'now'}">${{NORMAL:'정상',CAPTURED:'함락',OCCUPATION:'점령 처리',STABILIZING:'안정화'}[occupation.stage]}${occupation.turnsLeft?' '+occupation.turnsLeft+'턴':''}</li><li>10일 정산</li></ol>${occupationOptions}
 <p>치안 ${citySecurity(c)} · ${esc((c.securityCauses??[]).join(' · ')||'악화 원인 없음')}</p><h3>식량 ${cityNumber(c.foodStock)} / ${cityNumber(c.foodCapacity)}</h3>
 <div class="meter"><span>재고</span><span class="track"><i style="width:${Math.min(100,c.foodStock/c.foodCapacity*100)}%"></i></span><span>${cityNumber(c.foodStock)}</span></div>
 ${c.foodWarehouse?`<p class="muted">세력 공동 창고 ${cityNumber(c.foodWarehouse.stock)} / ${cityNumber(c.foodWarehouse.capacity)}</p>`:''}
 <p class="muted">이번 정산 증감 원인</p>${causes||'<p>첫 정산 전입니다.</p>'}</div><div class="osec" data-osec="built"${otab('built')}>
 ${c.specialists?`<h3>전문인력</h3><div class="city-specialists">${SPECIALISTS.map(([k,n,icon,fx])=>`<span class="spec${c.nextSpecialist===k?' next':''}" title="${esc(fx)}">${UI_ICON(icon)}<small>${n}</small><b>${c.specialists[k]??0}</b><em>${esc(fx)}</em></span>`).join('')}</div><p class="muted">3턴마다 1명 · 다음 ${esc(SPECIALISTS.find(x=>x[0]===c.nextSpecialist)?.[1]??'')} ${c.specialistTurnsLeft}턴 뒤 · 태수의 정무 하위 능력(행정·인사→관료, 병참→병참, 제도→학자, 민정→기술자)</p>`:''}
 <h3>지은 시설</h3><ul class="city-facilities">${c.facilities.map(f=>`<li>${UI_ICON(JOB_ICON[f.kind]??'build')}${CITY_JOBS[f.kind].name} · ${esc(f.tileId)}${f.disabled?' · 효과 정지':''}</li>`).join('')||'<li>없음</li>'}</ul></div>`)
 +pane('barracks',`<h3 class="barracks-title">출진 · 편성</h3><div class="barracks-scroll"><div class="barracks-readiness" aria-label="병력 현황"><p><span>예비병 <b>${troopText(c.reserveTroops??0)}명</b></span><span>부상병 <b>${troopText(c.woundedTroops??0)}명</b></span><span>주변 부대 <b>${armies.length}개</b></span>${!v3View(v)&&Number.isFinite(c.foodStock)?`<button type="button" class="barracks-food-link" data-barracks-food title="관청의 식량 재고와 이번 정산 내역 보기">현지 식량 <b>${cityNumber(c.foodStock)}</b> · 내역 ›</button>`:''}</p><p class="c195-reinforcement">${esc(cityReinforcementText(c))}</p>${Object.values(c.specialReserves??{}).some(n=>n>0)?`<p class="c195-reinforcement">${esc('특수 예비 · '+Object.entries(c.specialReserves).filter(([,n])=>n>0).map(([type,n])=>`${troopName(type)} ${troopText(n)}`).join(' · '))}</p>`:''}${barracksSupplyNote(v,selectedCityId)?`<p class="barracks-warning" title="현재 보급 출처가 이 성인 부대의 직전 정산 결과입니다. 새 부대의 출진 후 결과를 예측한 것은 아닙니다.">${esc(barracksSupplyNote(v,selectedCityId))}</p>`:'<p class="barracks-guide">출진: 장수 한 명이 한 부대를 이끌고 즉시 출진 · 모집: 예비병 충원 · 재편: 겸병 장수의 병종 변경</p>'}${!armies.length?'<p class="barracks-warning">재편할 부대가 없습니다. 부대를 이 성 주변 2칸 안으로 이동시키세요.</p>':''}</div><p class="city-working">${working?`진행 중 · <b>${esc(working)}</b>`:'진행 중인 작업 없음'} <small>한 번에 1개 · 작업별 진행도 보존${c.jobBlocked?' · '+esc(c.jobBlocked):''}</small></p><div class="options">${milOptions||'<p class="muted">이 성에서 할 수 있는 군사 일이 없습니다.</p>'}</div>

 ${armies.length?`<div class="reorganize-target"><label>재편 부대 <select id="city-job-army">${armies.map(a=>`<option value="${esc(a.armyId)}">${esc(v.officers[a.commanderId]?.name??a.armyId)}</option>`).join('')}</select></label><label>병종 <select id="city-job-troop"></select></label></div>`:''}</div><footer class="barracks-footer">${musterOption}</footer>`)
 +pane('tavern',`<p class="place-lede">떠돌이 인재와 소문이 모이는 곳. 마음 맞는 장수들과 술자리를 열 수도 있다.</p>${feastHtml(v,c)}${v.social?tavernActsHtml(v,c):''}<h3>떠돌이 인재</h3>${wanderersHtml(c.wanderers,true)||'<p class="muted">이 성에 재야 장수가 없습니다.</p>'}`)
 +pane('residence',`<p class="place-lede">장수들이 머무는 곳. 찾아가 이야기를 나눌 수 있다.</p><div class="city-governor">${portrait?`<img src="${esc(portrait)}" alt="${esc(governor?.name??'태수')} 초상">`:`<span class="governor-placeholder">${governor?faceFallback(governor.name,FACTION_STYLE[c.ownerFactionId]?.color):'공석'}</span>`}<div><small>태수</small><b>${esc(governor?.name??'공석')}</b><br>정무 ${governor?.baseStats.politics??'—'} · 산출 +${cityNumber(rates.bonus*100)}%</div></div>
 <div class="governor-pick">${governorSelection}${traitLoadoutButtonHtml(v.officers[c.governorId])}</div>${c.starAction?starButton(c.starAction,`data-city-star="${esc(c.cityId)}"`):''}${v.social?visitListHtml(v,c):(c.freeOfficers??[]).length?`<h3>성의 자유 장수</h3><ul class="wanderers">${c.freeOfficers.map(o=>`<li><b>${esc(o.name)}</b> <small>${statLine(v.officers[o.officerId]??o)}</small>${availabilityLine(v.officers[o.officerId])}${traitLoadoutButtonHtml(v.officers[o.officerId])}</li>`).join('')}</ul>`:''}`);
 if(v3View(v)){const office=panel.querySelector('[data-pane=office]');if(office)office.innerHTML=domesticScreenV3({v,c,face:faceOf,locked:inputLocked(),selectedJob:naejeongUi.job,error:naejeongUi.error});panel.querySelector('.barracks-title')?.insertAdjacentHTML('afterend',recruitV3(c));}
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
function sortieRoster(v,c){
 if(!c)return [];
 const ids=[...(c.freeOfficers??[]).map(o=>o.officerId),...(c.governorId?[c.governorId]:[])];
 return [...new Set(ids)].map(id=>{const o=v.officers[id],type=o.troopType,r=sortieTroopRange(state,state.cities[c.cityId],type);
  return {...o,troops:musterTroopChoices(v,c,id),reason:sortieReason(state,{cityId:c.cityId,officerId:id,troopType:type,troopCount:r.min})?.message,troopName:troopName(type),status:`${id===c.governorId?'태수 · ':''}${fatigueLineText(o.fatigue)||'출진 가능'}`};});
}
function openSortie(){
 sortieUi={cityId:selectedCityId,officerId:null,selections:[],sequence:0,deployed:[]};renderSortie();
 $('#city-panel').hidden=true;
 $('#sortie-screen [data-sortie-officer]:not([disabled])')?.focus();
}
function closeSortie(){
 const root=$('#sortie-screen');if(root)root.remove();sortieUi=null;
}
function renderSortie(){
 if(!sortieUi)return;
 const v=view(state),c=v.ownCities[sortieUi.cityId];if(!c){closeSortie();return;}
 selectedCityId=c.cityId;
 const roster=sortieRoster(v,c),o=roster.find(o=>o.officerId===sortieUi.officerId)??roster.find(o=>!o.reason)??roster[0];
 sortieUi.officerId=o?.officerId;
 const plan=planSorties(state,c.cityId,sortieUi.selections);
 if(v3View(v))for(const row of plan.rows){const kind=v3ArmKind(row.troopType),cap=Math.floor((v.armory?.[kind]??0)/v3ArmsPerTroop(state,v.factionId,row.troopType)/50)*50;if(cap<Math.min(row.range.commandLimit,c.reserveTroops??0))row.armoryWarning=`${({spear:'창',blade:'도검',bow:'활',horse:'말'})[kind]} 부족 — ${numberV3(cap)}명까지 나갈 수 있다 · 공방${kind==='horse'?' · 말 사기':''}`;}
 let root=$('#sortie-screen');if(!root){root=document.createElement('section');root.id='sortie-screen';root.className='u3-sortie';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','출진 편성');document.body.appendChild(root);bindSortie(root);}
 root.innerHTML=sortieHtml({city:c,officer:o,art:o?fullArt(o.officerId)?.src:null,roster,plan,sequence:sortieUi.sequence,deployedNames:sortieUi.deployed.map(id=>v.officers[v.ownArmies[id]?.commanderId]?.name).filter(Boolean),face:faceOf,error:sortieUi.error});
 if(v3View(v))for(const row of plan.rows)if(row.armoryWarning){const warning=document.createElement('p');warning.className='c490-danger';warning.textContent=row.armoryWarning;root.querySelector(`[data-formation="${row.officerId}"]`)?.append(warning);}
 for(const select of root.querySelectorAll('select'))select.setAttribute('data-no-glossary','');
 for(const row of root.querySelectorAll('[data-sortie-officer]'))row.insertAdjacentHTML('afterend',traitLoadoutButtonHtml(v.officers[row.dataset.sortieOfficer]));
 for(const row of plan.rows)if(v.officers[row.officerId]?.engine?.path==='GUKSA.GEUNSIN'){
  const select=document.createElement('select');select.dataset.sortieTrust=row.officerId;select.setAttribute('aria-label','출진 신임');
  select.innerHTML='<option value="">신임 대상 고르기</option>'+Object.values(v.ownArmies).filter(a=>a.troopCount>0&&a.morale!=='ROUTING').map(a=>`<option value="${esc(a.armyId)}" ${a.armyId===row.trustArmyId?'selected':''}>${esc(v.officers[a.commanderId]?.name??a.armyId)}</option>`).join('');
  root.querySelector(`[data-formation="${row.officerId}"]`)?.append(select);
 }
}

function updateSortieAllocation(root){
 const plan=planSorties(state,sortieUi.cityId,sortieUi.selections);
 for(const row of plan.rows){const node=root.querySelector(`[data-formation="${row.officerId}"]`);if(!node)continue;
  const slider=node.querySelector('input[type=range]');slider.min=String(row.count===0?0:row.range.min);slider.max=String(row.count===0?0:row.range.max);slider.value=String(row.count);slider.disabled=row.count===0;
  node.querySelector('output').textContent=troopText(row.count);node.querySelector('small.refusal').textContent=row.reason??`최대 ${troopText(row.range.max)}명 · 500명 단위 조절`;
 }
 for(const [key,value] of Object.entries({units:plan.units,total:troopText(plan.total),remaining:troopText(plan.remaining),food:plan.food}))root.querySelector(`[data-sortie-total="${key}"]`).textContent=value;
 root.querySelector('[data-sortie]').disabled=!plan.units;
}
function bindSortie(root){
 root.addEventListener('input',e=>{const row=sortieUi.selections.find(r=>r.officerId===e.target.dataset.sortieStrength);if(row){row.count=Number(e.target.value);updateSortieAllocation(root);}});
 root.addEventListener('change',e=>{
  const id=e.target.dataset.sortieType??e.target.dataset.sortieStrength??e.target.dataset.sortieTrust,row=sortieUi.selections.find(r=>r.officerId===id);if(!row)return;
  if(e.target.dataset.sortieType){row.troopType=e.target.value;row.count=null;}
  if(e.target.dataset.sortieStrength)row.count=Number(e.target.value);
  if(e.target.dataset.sortieTrust)row.trustArmyId=e.target.value;
  renderSortie();
 });
 root.addEventListener('click',async e=>{
  e.stopPropagation();if(!sortieUi||sortieUi.running)return;
  if(e.target.closest('[data-sortie-close]')){closeSortie();renderCityPanel(view(state));return;}
  if(e.target.closest('[data-sortie-map]')){const ids=[...sortieUi.deployed];closeStage({immediate:true});selectedCityId=null;selectedArmyIds=ids;selectedArmyId=ids[0]??null;menuOpen=true;moveMode=true;render();if(ids[0])follow(ids[0],true);return;}
  const officer=e.target.closest('[data-sortie-officer]');if(officer&&!officer.disabled){const id=officer.dataset.sortieOfficer;sortieUi.officerId=id;const i=sortieUi.selections.findIndex(r=>r.officerId===id);if(i>=0)sortieUi.selections.splice(i,1);else sortieUi.selections.push({officerId:id,count:null});sortieUi.error=null;renderSortie();return;}
  if(e.target.closest('[data-sortie]')&&!e.target.closest('[data-sortie]').disabled&&!inputLocked()){
   const ui=sortieUi,plan=planSorties(state,ui.cityId,ui.selections);ui.running=true;ui.error=null;
   for(const row of plan.rows){
    if(row.reason||row.count<=0)continue;
    const reason=sortieReason(state,row.request)?.message;if(reason){ui.error=reason;break;}
    const before=state;await command(row.request);
    if(state===before){ui.error=$('#status').textContent;break;}
   }
   ui.running=false;if(sortieUi===ui)renderSortie();
  }
 });
}
document.addEventListener('keydown',e=>{if(!sortieUi||traitLoadoutUi)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeSortie();renderCityPanel(view(state));}},true);
// Public engine options own the troop identity and personnel range.
function musterTroopChoices(v,c,officerId){
 const o=v.officers[officerId],types=o?.multiTroopTrait?.troopTypes??[o?.troopType];
 return (c?.musterOptions?.find(m=>m.officerId===officerId)?.troops??[]).filter(t=>types.includes(t.parentTroopType??t.troopType));
}
function sortieRequest(){
 return {type:'SORTIE',...($('#sortie-trust')?.value?{trustArmyId:$('#sortie-trust').value}:{}),cityId:selectedCityId,officerId:$('#city-job-officer')?.value,troopType:$('#city-job-muster-troop')?.value,troopCount:Number($('#city-sortie-count')?.value)/TROOP_DISPLAY_SCALE};
}
function refreshMusterButton(){
 if(sortieUi){const root=$('#sortie-screen');if(root)updateSortieAllocation(root);return;}
 const button=$('[data-sortie]');if(!button)return;
 const request=sortieRequest(),reason=sortieReason(state,request)?.message;
 button.disabled=inputLocked()||!!reason;
 const o=view(state).officers[request.officerId],summary=$('#muster-selection');

 if(summary)summary.textContent=reason??`${o?.name??'장수 미선택'} · ${troopName(request.troopType)} ${troopText(request.troopCount)}명 · 즉시 출진`;
}
function refreshMusterRange(v=view(state)){
 const c=v.ownCities[selectedCityId],id=$('#city-job-officer')?.value,select=$('#city-job-muster-troop'),count=$('#city-sortie-count'),info=$('#muster-troop-info');
 const t=musterTroopChoices(v,c,id).find(t=>t.troopType===select?.value),range=t?.troopCountRange;
 if(count){count.disabled=!range;count.min=String((range?.min??0)*TROOP_DISPLAY_SCALE);count.max=String((range?.max??0)*TROOP_DISPLAY_SCALE);count.step=String((range?.step??1)*TROOP_DISPLAY_SCALE);count.value=count.max;}
 if(info)info.textContent=range?[commandLimitText(range),`병력 ${troopText(range.min)}~${troopText(range.max)}명 · ${troopText(range.step)}명 단위${v.officers[id]?.multiTroopTrait?' · 겸병':''}`,t.effectLine,t.costLine,t.blockedReason].filter(Boolean).join(' / '):'출진 가능한 병종이 없습니다.';
 refreshMusterButton();
}
function refreshMusterTroops(v=view(state)){
 const id=$('#city-job-officer')?.value,select=$('#city-job-muster-troop');if(!select){refreshMusterButton();return;}
 const o=v.officers[id],opts=musterTroopChoices(v,v.ownCities[selectedCityId],id);
 select.setAttribute('data-no-glossary','');
 select.innerHTML=sortieTroopOptionsHtml(opts,select.value);
 select.disabled=opts.length<2;select.title=o?.multiTroopTrait?'겸병 · 병종과 편성 선택':'같은 병종 계열의 편성 선택';
 select.onchange=()=>refreshMusterRange();refreshMusterRange(v);
}
function refreshCityTroops(v=view(state)){
 const army=v.ownArmies[$('#city-job-army')?.value],select=$('#city-job-troop');if(!select||!army)return;
 const o=v.officers[army.commanderId];
 select.innerHTML=(o.multiTroopTrait?.troopTypes??[o.troopType]).map(type=>`<option value="${esc(type)}" ${type===army.troopType?'selected':''}>${esc(troopName(type))}</option>`).join('');
 select.disabled=!o.multiTroopTrait;
}
$('#city-panel').addEventListener('input',e=>{if(e.target.id==='city-sortie-count')refreshMusterButton();});
$('#city-panel').addEventListener('change',e=>{if(e.target.id==='city-job-army')refreshCityTroops();if(e.target.id==='city-job-officer')refreshMusterTroops();});
$('#city-panel').addEventListener('click',e=>{
 const countStep=e.target.closest('[data-sortie-count]')?.dataset.sortieCount;
 if(countStep&&!inputLocked()){const input=$('#city-sortie-count');if(input&&!input.disabled){input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+Number(countStep)*Number(input.step))));refreshMusterButton();}return;}
 if(e.target.closest('[data-sortie-open]')&&!inputLocked()){e.stopPropagation();openSortie();return;}
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
  ...(kind==='reorganize'?{armyId:$('#city-job-army')?.value,troopType:$('#city-job-troop')?.value}:{})});
});
function refreshContinue() {
 let hint=$('#c215-continue-summary');if(!hint){hint=document.createElement('small');hint.id='c215-continue-summary';$('#continue').after(hint);}
 attempt(()=>settle(loadText(CAMPAIGN_SAVE_KEY),raw=>{const result=saveAvailability(raw,deserialize);$('#continue').disabled=!result.saved;hint.textContent=result.text;}),()=>{$('#continue').disabled=true;hint.textContent='저장을 읽을 수 없음';});
}
function resume() {
 if(typeof state!=='undefined'&&state?.prologue)return;
  attempt(()=>settle(savedState(),applySaved),error=>{$('#status').textContent = '이어하기 실패 — 기존 저장은 보존했습니다. 오류: '+window.__bootErrorLine(error);});
}
function applySaved(saved) {
  try {
    if (!saved) throw new Error('캠페인 저장이 없습니다.');
    dismissCombatResult();c260PendingResult=null;inkCards?.reset();c254TurnStart=saved;
    c207Tracker=c207Info?.createSituationTracker()??null;
    fxInk?.reset();if(typeof c273Ritual!=='undefined')c273Ritual.close(false);if(typeof c273Tracker!=='undefined')c273Tracker.run(`${saved.campaignSeed}:${saved.playerFactionId}`);resetAmbitionUi();
    const resumedResult=view(saved).eventResult;c205MemorySeen=true;c197ResultSeen=resumedResult?`${resumedResult.eventId}.${resumedResult.turn}`:null;
    tacticReadySeen.clear();tacticReadyPending.clear();tacticCutSeen.clear();cancelStrike();saved.manualEndTurn=true;state = saved;moveUndo=null;queuedUndoStart=null;rivalTurnBaseline=null;turnSummaryPending=null;inspectedArmyId=null;recordNotices=[];newsArchive=[];overlapPick=null;cancelAttackConfirmation();recentCombats=[];lastFoodChange=null;lastUnitResult=null;lastFacilityResults=[];$('#c215-completions')?.remove();turnLog=[];selectedArmyIds=[];scheduleOrders(); attackMode=false; selectedArmyId=null;menuOpen=false;moveMode=false;destination=null;bandFocusSnapshot=null;bandFocusArmy=null;bandFocusMode=null;clearTimeout(bandFocusTimer);bandFocusMoving=false;zoom=playerCameraZoom();render();centerPlayer(); scheduleAi(); $('#status').textContent = '저장된 캠페인을 이어합니다.';
    // Loading a save must not replay the new-campaign opening.
  } catch (error) {$('#status').textContent = '이어하기 실패 — 기존 저장은 보존했습니다. 오류: '+window.__bootErrorLine(error);}
}
// 새 판의 시드: 주소의 ?seed= 가 있으면 그것(재현용), 브라우저에서는 매번 새로(판마다 포텐·Draft가 달라지게 — 완료 기준 3),
// 브라우저가 아닌 시험 환경은 기존 고정값
function newCampaignSeed(){
 const fixed=Number(new URLSearchParams(globalThis.location?.search??'').get('seed'));
 if(Number.isSafeInteger(fixed)&&fixed>0)return fixed;
 if(typeof window!=='undefined'&&globalThis.crypto?.getRandomValues)return 1+globalThis.crypto.getRandomValues(new Uint32Array(1))[0]%2147483646;
 return 190919;
}
for(const card of document.querySelectorAll('.w-lord[data-pick]')){const line=document.createElement('span');line.className='c210-faction-line';line.textContent=factionOpeningLine(card.dataset.pick);card.append(line);}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-c210-facility]');if(!b||!state||inputLocked())return;const todo=factionFacilityTodo(view(state));if(todo?.cityId!==b.dataset.c210Facility)return;openProdPop(todo.cityId,e,reasonText);});
// C247: presentation previews use fresh public views; never touch the active campaign or saves.
if(document.documentElement.dataset.start==='map'){
 const selection=$('#selection'),go=$('#start-go');
 const cards=[...selection.querySelectorAll('.w-lord[data-pick]')];
 const starts=cards.map(card=>{const factionId=card.dataset.pick,initial=createCampaign({map:'v3',factionId,seed:190923,fieldArmies:false}),preview=view(initial);return {factionId,preview,card,name:card.querySelector('.plate b').textContent,art:card.querySelector('.art').getAttribute('style'),cities:Object.values(preview.ownCities)};});
 const pane=document.createElement('div');pane.className='c247-start';
 pane.innerHTML=`<header class="c247-head"><a href="/">← 처음 화면</a><small>새 판 1/2 · 세력 고르기</small><h1>누구의 천하로 시작하는가</h1><p>역사가 끝난 뒤, 이름들이 다시 사람이 되었다</p></header><div class="c247-body"><nav class="c247-list" aria-label="시작 세력">${starts.map(x=>`<button data-start-pick="${x.factionId}" style="--fc:${FACTION_STYLE[x.factionId].color}"><img src="/assets/ui-v3/emblems/${x.factionId}.png" alt=""><b>${esc(x.name)}</b><small>시작 성 ${x.cities.length}</small><i>✓</i></button>`).join('')}</nav><div class="c247-map" aria-label="실제 시작 지도"></div><aside class="c247-ruler"></aside></div><footer class="c247-footer"><p class="c247-summary"></p><small>1 세력 → 2 장수</small><div class="c247-go"></div></footer>`;
 selection.append(pane);pane.querySelector('.c247-go').append(go);
 let ready=false;
 const positionFlags=()=>{
  const map=pane.querySelector('.c247-map'),box=map.getBoundingClientRect();
  for(const flag of map.querySelectorAll('.c247-map-flag')){
   const plate=map.querySelector(`.w-cityplate[data-city="${flag.dataset.city}"]`),matrix=plate?.getScreenCTM();if(!matrix)continue;
   const point=new DOMPoint(0,0).matrixTransform(matrix);flag.style.left=`${point.x-box.left}px`;flag.style.top=`${point.y-box.top}px`;
  }
 };
 new ResizeObserver(positionFlags).observe(pane.querySelector('.c247-map'));
 const pick=fid=>{
  const x=starts.find(x=>x.factionId===fid);if(!x)return;
  x.card.click();pane.dataset.faction=fid;pane.style.setProperty('--fc',FACTION_STYLE[fid].color);
  for(const b of pane.querySelectorAll('[data-start-pick]')){b.classList.toggle('on',b.dataset.startPick===fid);b.setAttribute('aria-pressed',String(b.dataset.startPick===fid));}
  pane.querySelector('.c247-ruler').innerHTML=`<div class="c247-ruler-art" style="${x.art}"></div><h2>${emblemHtml(fid)}${esc(x.name)}</h2><p>시작 성 · ${x.cities.map(c=>esc(c.name)).join(' · ')}</p><p>시작 장수 · ${x.preview.faction.officerIds?.length??Object.keys(x.preview.officers).length}명</p><p>${esc(factionOpeningLine(fid))}</p>`;
  pane.querySelector('.c247-summary').textContent=`${x.name} · ${x.cities.map(c=>c.name).join(' · ')}에서 시작`;
  go.querySelector('span').textContent=`${x.name}로 장수 고르기 →`;go.title='선택한 세력으로 장수 고르기';
  if(!ready)return;
  const model=campaignMapModel(x.preview);model.units=[];model.facilities=[];model.places=[];model.hubs=[];model.engineMap={structures:[],warnings:[]};
  const allCities=starts.flatMap(s=>campaignMapModel(s.preview).cities.filter(c=>s.cities.some(o=>o.cityId===c.id)));
  model.cities=[...new Map([...model.cities,...allCities].map(c=>[c.id,c])).values()];
  model.tiles=model.tiles.map(t=>({...t,vis:'VISIBLE'}));
  const options=v3MapOptions();options.mapWorld={...options.mapWorld,src:'/assets/ui-v3/map/v14-world.webp',ring:624,land:[2577,2220],baked:model.cities.map(c=>c.id)};
  pane.querySelector('.c247-map').innerHTML=renderWorldMap(model,{...options,mode:'faction'});
  for(const el of pane.querySelectorAll('.c247-map [data-city]')){
   const city=model.cities.find(c=>c.id===el.dataset.city),selectable=starts.some(s=>s.factionId===city?.factionId);
   if(selectable){el.dataset.startPick=city.factionId;el.classList.toggle('on',city.factionId===fid);if(el.classList.contains('w-cityplate')){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',`${starts.find(s=>s.factionId===city.factionId).name} 고르기 · ${city.name}`);el.setAttribute('aria-pressed',String(city.factionId===fid));}}
  }
  for(const el of pane.querySelectorAll('.w-terr'))el.classList.toggle('c247-owned',el.style.getPropertyValue('--fc')===FACTION_STYLE[fid].color);
  const home=model.cities.find(c=>c.id===x.preview.faction.capitalCityId),distance=c=>{const [q,r]=home.center.split(',').map(Number),[cq,cr]=c.center.split(',').map(Number);return hexDistance({q,r},{q:cq,r:cr});};
  const nearby=model.cities.filter(c=>c.factionId&&c.factionId!==fid).sort((a,b)=>distance(a)-distance(b))[0];
  for(const other of starts){
   const city=other.cities.find(c=>c.cityId===other.preview.faction.capitalCityId)??other.cities[0],flag=document.createElement('button');flag.className=`c247-map-flag${other.factionId===fid?' on':''}`;flag.dataset.startPick=other.factionId;flag.dataset.city=city.cityId;flag.setAttribute('aria-label',`${other.name} 고르기 · ${city.name}`);flag.setAttribute('aria-pressed',String(other.factionId===fid));
   flag.innerHTML=`<img src="/assets/ui-v3/emblems/${other.factionId}.png" alt=""><span>${other.factionId===fid||city.cityId===nearby?.id?esc(city.name):''}</span>`;pane.querySelector('.c247-map').append(flag);
  }
  for(const plate of pane.querySelectorAll('.w-cityplate')){plate.setAttribute('aria-hidden','true');plate.removeAttribute('tabindex');plate.removeAttribute('role');}
  for(const tile of pane.querySelectorAll('.w-tile')){tile.setAttribute('aria-hidden','true');tile.removeAttribute('tabindex');}
  positionFlags();
 };
 pane.addEventListener('click',e=>{const b=e.target.closest('[data-start-pick]');if(b)pick(b.dataset.startPick);});
 pane.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('.w-cityplate[data-start-pick]')){e.preventDefault();pick(e.target.dataset.startPick);pane.querySelector(`.w-cityplate[data-start-pick="${pane.dataset.faction}"]`)?.focus();}});
 pick('F01');;loadV3Manifest().then(()=>{ready=true;pick(pane.dataset.faction);});
}
// C251: ruler selection has no starting geography. These fresh public previews
// describe the current roster and abilities without changing the eventual run.
if(document.documentElement.dataset.start==='civ'){
 // C489: militia previews used an unpublished filename; reuse the existing F01 sword art.
function soldierPreviewPath(type,factionId){return `/assets/troop-art/soldiers/${type==='militia'?'sword':type??'cavalry'}-1-${type==='militia'?'F01':factionId}.webp`;}

 const selection=$('#selection'),go=$('#start-go');
 const starts=[...selection.querySelectorAll('.w-lord[data-pick]')].map(card=>{
  const factionId=card.dataset.pick,initial=createCampaign({map:'v3',factionId,seed:190923,fieldArmies:false}),preview=view(initial);
  return {factionId,preview,initial,card,ruler:preview.officers[preview.faction.rulerId],art:card.querySelector('.art').getAttribute('style'),motto:card.querySelector('small').textContent};
 });
 const pane=document.createElement('div');pane.className='c251-start';
 pane.innerHTML=`<aside class="c251-hero" aria-label="고른 군주"></aside><main class="c251-choice"><header><small>새 판 1/2 · 군주 고르기</small><h1>누구의 천하로 시작하는가</h1><p>역사가 끝난 뒤, 이름들이 다시 사람이 되었다</p></header><nav class="c251-lords" aria-label="군주 고르기">${starts.map(x=>`<div><button class="k-medallion" style="--d:120" data-start-pick="${x.factionId}" aria-label="${esc(x.ruler.name)} 고르기"><img src="${esc(`/assets/officer-art/bust/${x.ruler.officerId}.webp`)}" alt=""></button><b>${esc(x.ruler.name)}</b></div>`).join('')}</nav><div class="c251-identity" aria-live="polite"></div><div class="c298-start-summary">시작 도시는 판마다 무작위 · 다음은 동료 고르기</div><div class="c251-go"></div></main><aside class="c251-features" aria-live="polite"></aside>`;
 selection.append(pane);pane.querySelector('.c251-go').append(go);
 go.className='k-btn-primary';
 const home=selection.querySelector('.w-select-foot a[href="/"]');home.className='k-btn';home.textContent='← 처음 화면';
 $('#continue').className='k-btn';
 const pick=fid=>{
  const x=starts.find(x=>x.factionId===fid);if(!x)return;
  pane.dataset.faction=fid;x.card.click();
  for(const b of pane.querySelectorAll('[data-start-pick]')){const on=b.dataset.startPick===fid;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));}
  const ruler=x.ruler,trait=ruler.growth?.cards?.find(c=>c.traitId===`${ruler.officerId}.unique`),policy=x.preview.policy;
  pane.querySelector('.c251-hero').innerHTML=`<div class="c251-art" style="${x.art}" aria-hidden="true"></div>`;
  // No difficulty rating is projected by the campaign: never invent a star score.
  pane.querySelector('.c251-identity').innerHTML=`<div class="c251-lord-text"><div class="c251-name-row"><img class="c270-emblem" src="/assets/ui-v3/emblems/${fid}.png" alt="${esc(x.preview.faction.name)}"><h2>${esc(ruler.name)}</h2>${trait?.origin?`<span class="c251-title">${esc(trait.origin)}</span>`:''}</div><h3 class="c251-motto">${esc(x.motto)}</h3><p class="c251-bio">${esc([ruler.rolePrimary,ruler.roleSecondary].filter(Boolean).join(' · '))}<br>${esc(factionOpeningLine(fid))}</p><details class="c270-unique"><summary>고유 특기 · ${esc(abilityName356(trait))}</summary><p>${esc(abilityGloss356(trait)+' — '+(ruler.uniqueTrait?.effect??trait?.text??''))}</p></details><div class="c251-lord-trait"><h3>군주 특기</h3>${trait?`<b>${esc(abilityName356(trait))}</b><p>${esc(abilityGloss356(trait)+' — '+trait.text)}</p>`:''}</div></div>`;
  if(typeof ritualEnabled==='function'&&typeof difficultyFromStart==='function'&&ritualEnabled())pane.querySelector('.c251-identity').insertAdjacentHTML('beforeend',`<p class="c273-difficulty">${esc(difficultyFromStart(x.initial,x.preview).label)}</p>`);
  if(document.documentElement.dataset.ui==='kit'){const summary=pane.querySelector('.c298-start-summary'),difficulty=pane.querySelector('.c273-difficulty');summary.querySelector('.c273-difficulty')?.remove();if(difficulty)summary.append(difficulty);}
  const facility=policy?.facilities?.find(f=>f.factionId===fid),specials=Object.values(SPECIAL_TROOPS).filter(t=>t.factionId===fid);
  const feature=(icon,name,text)=>`<li ${icon==='troops'?'tabindex="0"':''}><span class="c251-feature-icon" aria-hidden="true">${{build:'築',policy:'令',troops:'兵'}[icon]}</span><div><b>${esc(name)}</b><p>${esc(text)}</p>${icon==='troops'?`<div class="c270-troop-preview">${specials.map(t=>`<img src="${soldierPreviewPath(t.parent,fid)}" alt=""><p>${esc(t.name)} · ${esc(t.effectLine)}</p>`).join('')}</div>`:''}</div></li>`;
  const officers=x.preview.faction.officerIds.filter(id=>id!==ruler.officerId).slice(0,5).map(id=>x.preview.officers[id]).filter(Boolean);
  pane.querySelector('.c251-features').innerHTML=`<h3>세력 특기</h3><ul>${facility?feature('build',facility.name,facility.description):''}${policy?feature('policy',policy.name,policy.description):''}${specials.length?feature('troops',specials.map(t=>t.name).join(' · '),specials.map(t=>`${t.name}: ${t.effectLine}`).join(' / ')):''}</ul><h3>이름난 인물 · 세력 소개</h3><p>시작 동료는 다음 단계에서 고릅니다.</p><div class="c251-officers">${officers.map(o=>`<figure><img src="${esc(`/assets/officer-art/bust/${o.officerId}.webp`)}" alt=""><figcaption>${esc(o.name)}</figcaption></figure>`).join('')}</div>`;
  const finalConsonant=(ruler.name.charCodeAt(ruler.name.length-1)-0xac00)%28;
  go.innerHTML=`<span class="k-grain" aria-hidden="true"></span><span>${esc(ruler.name)}${finalConsonant&&finalConsonant!==8?'으로':'로'} 동료 고르기 →</span>`;
 };
 pane.addEventListener('click',e=>{const b=e.target.closest('[data-start-pick]');if(b)pick(b.dataset.startPick);});
 // Existing retry/start handlers also select the original card.
 for(const x of starts)x.card.addEventListener('click',()=>{if(pane.dataset.faction!==x.factionId)pick(x.factionId);});
 document.addEventListener?.('ink:ritual-settings',()=>pick(pane.dataset.faction));
 pick('F01');
 if(typeof CAMPAIGN_TURN_LIMIT!=='undefined')pane.querySelector(document.documentElement.dataset.ui==='kit'?'.c298-start-summary':'.c251-go').insertAdjacentHTML('afterbegin',`<p class="c270-victory">큰 성을 모두 차지하고 차례를 넘기면 통일 · ${CAMPAIGN_TURN_LIMIT}차례 뒤 성 · 병력 순으로 결정</p>`);
}
for (const button of document.querySelectorAll('button[data-faction]')) {
  button.disabled = false;
  // 새 판: 세력을 고르면 먼저 운명 드래프트(함께 깨어날 다섯 사람 — 정본 SG_OFFICER_DRAFT §1)를 거친다. 주소에 ?draft=0 이면 건너뛰어 기본 동료로 시작한다(자동 점검·옛 화면용)
  const begin=(factionId,seed,companions)=>{
    resetGuideRun();
    dismissCombatResult();c260PendingResult=null;inkCards?.reset();
    c207Tracker=c207Info?.createSituationTracker()??null;
    fxInk?.reset();
    cancelStrike();clearTimeout(aiTimer);clearTimeout(orderTimer);selectedArmyIds=[];attackMode=false;// 새 판은 성에서 시작한다(야전 부대 없음 — 사용자 2026-10-11 "기본적으로 2부대 출진돼 있는 거 삭제"). 주소에 ?field=1 이면 예전처럼 두 부대가 나와 있는 채로(자동 점검 도구용)
    recordNotices=[];newsArchive=[];overlapPick=null;cancelAttackConfirmation();recentCombats=[];lastFoodChange=null;lastUnitResult=null;lastFacilityResults=[];$('#c215-completions')?.remove();turnLog=[];
    moveUndo=null;queuedUndoStart=null;rivalTurnBaseline=null;turnSummaryPending=null;inspectedArmyId=null;c197ResultSeen=null;if(typeof c273Ritual!=='undefined')c273Ritual.close(false);if(typeof c273Tracker!=='undefined')c273Tracker.reset();resetAmbitionUi();
    state = createCampaign({factionId,seed,manualEndTurn:true,recentEventIds:readRecentEventIds(),...readCampaignLegacy(),...(companions?{companions}:{}),...(new URLSearchParams(location.search).get('field')==='1'?{}:{fieldArmies:false}),...(new URLSearchParams(location.search).get('trial')==='v3'?{trialRules:{domesticV3:true}}:{})}); // ?trial=v3 = 새 내정 시험 판(숨김 진입점 · 10-24 사용자 답 전)
    if(typeof c273Tracker!=='undefined')c273Tracker.run(`${state.campaignSeed}:${state.playerFactionId}`,true);
    c254TurnStart=state;
    tacticReadySeen.clear();tacticReadyPending.clear();tacticCutSeen.clear();selectedArmyId=null;menuOpen=false;moveMode=false;unlockAudio();bandFocusSnapshot=null;bandFocusArmy=null;bandFocusMode=null;clearTimeout(bandFocusTimer);bandFocusMoving=false;zoom=playerCameraZoom(true);render();centerPlayer();announceStartCity(); $('#status').textContent = Object.keys(view(state).ownArmies).length?'부대를 선택해 이동 명령을 내리세요.':'나와 있는 부대가 없습니다 — 성을 눌러 들어가 병영에서 출진시키십시오.';
    finishOpening486(inkCards?.load(factionId,factionName(factionId)),++openingTicket486).catch(e=>console.warn('C486 opening:',e));
  };
  button.addEventListener('click', () => {
    const factionId=button.dataset.faction,seed=newCampaignSeed(),host=$('#officer-draft');
    if(!host||!document.body.classList.contains('ink')||new URLSearchParams(location.search).get('hud')==='old'||new URLSearchParams(location.search).get('draft')==='0'){begin(factionId,seed);return;}
    const card=document.querySelector(`.w-lord[data-pick="${factionId}"]`),ruler={id:/cutout\/(G\d+)/.exec(card?.querySelector('.art')?.getAttribute('style')??'')?.[1]??'',name:card?.querySelector('.plate b')?.textContent??''};
    unlockAudio();bgmWanted='draft';bgm.scene('draft'); // 석각 드래프트는 따로 든 곡(깨어남)
    openOfficerDraft(host,{factionId,seed,ruler,art:id=>fullArt(id)?.src,onConfirm:c=>begin(factionId,seed,c),onBack:()=>{bgmWanted='title';bgm.scene('title');},intro:true,sfx:name=>{try{worldSfx.play(name==='confirm'?'select':'paper-open');}catch{}}}); // intro = '군주가 부른다' 장면부터(연출은 officer-draft-ui.mjs, ?fx=0 으로 끔)
    mountDraftNames356(host);showGuideFirst('first.draft');
  });
}
$('#end-turn').addEventListener('click', e => {const b=$('#end-turn').dataset.blocker;if(b&&!e?.shiftKey){openCity(b,'jobs');$('#status').textContent='생산할 작업을 고르세요 · Shift+클릭이나 Shift+Enter 로 그냥 넘기기';return;}command({type:'END_TURN'});});
function closeSaveConfirmation(){
 $('#save-confirm').hidden=true;
 if(state)renderEventCard(view(state));
 $('#save').focus();
}
// 저장 확인창이 최상위일 때 Esc는 그 창만 닫고, 사건 선택 잠금을 다시 계산한다.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#save-confirm').hidden){e.preventDefault();e.stopImmediatePropagation();closeSaveConfirmation();}},true);
function writeCampaignSave(){
 if(isPrologue(state))return;
  closeSaveConfirmation();$('#status').textContent='저장 중…';
  attempt(()=>settle(saveText(CAMPAIGN_SAVE_KEY,serialize(state)),r=>{refreshContinue();worldSfx.play('stamp');$('#status').textContent=`저장했습니다. 저장 칸은 하나입니다 — 이전 저장을 덮어씁니다${r?.bytes?` (${Math.max(1,Math.round(r.bytes/1024)).toLocaleString('ko-KR')}KB)`:''}`;}),()=>{$('#status').textContent='저장하지 못했습니다.';});
}
$('#save').title='저장 칸은 하나입니다 — 이전 저장을 덮어씁니다';
$('#save').addEventListener('click',()=>{
 if(!state||isPrologue(state)||combatAnimating||state.phase==='AI')return;
 $('#status').textContent='저장 칸은 하나입니다 — 이전 저장을 덮어씁니다';
 attempt(()=>settle(savedState(),saved=>{if(saved){let summary=$('#save-slot-summary');if(!summary){summary=document.createElement('p');summary.id='save-slot-summary';$('#save-confirm-title').after(summary);}let stamp;try{stamp=localStorage.getItem(saveMarkerKey(CAMPAIGN_SAVE_KEY));}catch{}summary.innerHTML=emblemHtml(saved.playerFactionId)+`<span>${esc(saveSlotSummary(saved,campaignDate(endedTurn(saved.turn)),stamp))}</span>`;$('#save-confirm').hidden=false;$('#save-cancel').focus();}else writeCampaignSave();}),()=>{$('#status').textContent='기존 저장을 확인하지 못했습니다. 저장을 덮어쓰지 않았습니다.';});
});
$('#save-overwrite').addEventListener('click',writeCampaignSave);
$('#save-cancel').addEventListener('click',closeSaveConfirmation);
$('#continue').addEventListener('click',resume);
$('#load-again')?.addEventListener('click',resume);
loadV3Manifest().then(()=>{const k=v3Asset('title/key-art.webp');if(k)$('#selection')?.style?.setProperty('--key-art',`url(${k})`);if(state)render();else renderModeRail();}).catch(()=>{});
$('#mode-rail')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-mode]');if(b){e.stopPropagation();setV3Mode(b.dataset.mode==='compare'?'world':b.dataset.mode);infoLens=b.dataset.mode;dangerMode=false;worldSfx.play('select');if(state)render();return;}if(e.target.closest?.('#roster-open'))$('#roster').hidden=!$('#roster').hidden;});
$('#roster-close')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();$('#roster').hidden=true;document.querySelector('#ink-hud .ih-menu [data-fwd="#roster-open"]')?.focus();});
$('#mini-toggle')?.addEventListener('click',()=>{$('#mini').hidden=!$('#mini').hidden;renderMini();});
function renderMini(){
 const box=$('#mini'),svg=$('#map svg'),port=$('.viewport');if(!box||box.hidden||!svg?.getBoundingClientRect||!port)return;
 // 작은 지도는 땅만 담는다(땅 밖 구름 여백 mapMargin 은 뺀다)
 const kit=document.documentElement.dataset.ui==='kit',art=v3MapOptions().mapArt,W=kit?246:220,r0=svg.getBoundingClientRect(),m0=mapMargin*zoom,s={x:r0.x+m0,y:r0.y+m0,width:Math.max(1,r0.width-2*m0),height:Math.max(1,r0.height-2*m0)},H=Math.round(W*s.height/Math.max(1,s.width));
 const k=W/Math.max(1,s.width),pr=port.getBoundingClientRect(),camera=miniCameraRect290(W,H,{x:(pr.left-s.x)*k,y:(pr.top-s.y)*k,width:port.clientWidth*k,height:port.clientHeight*k});
 const x=kit?camera.x:(port.scrollLeft-m0)*k,y=kit?camera.y:(port.scrollTop-m0)*k,w=kit?camera.width:port.clientWidth*k,h=kit?camera.height:port.clientHeight*k;
 if(kit){document.documentElement.style.setProperty('--c290-mini-height',`${H+2}px`);box.style.height=`${H+2}px`;syncKitHudLayout290();}
 // 성(세력색 마름모)·보이는 부대(점, 내 부대는 흰 테)
 const at=el=>{const r=el.getBoundingClientRect();return `left:${((r.x+r.width/2-s.x)*k).toFixed(1)}px;top:${((r.y+r.height/2-s.y)*k).toFixed(1)}px`;};
 const mv=view(state),mc={...mv.knowledge.cities,...mv.ownCities},ma={...mv.knowledge.observedArmies,...mv.ownArmies};
 const cities=[...svg.querySelectorAll('.w-city[data-city]')].map(el=>`<b class="mc" style="${at(el)};--c:${FACTION_STYLE[mc[el.dataset.city]?.ownerFactionId]?.color??'#8f8d84'}"></b>`).join('');
 const units=[...svg.querySelectorAll('.w-unit[data-unit]')].map(el=>{const a=ma[el.dataset.unit];if(!a||a.factionId!==mv.factionId&&mv.knowledge.tiles[a.tileId]!=='VISIBLE')return '';return `<i class="mu${a?.factionId===mv.factionId?' me':''}" style="${at(el)};--c:${FACTION_STYLE[a?.factionId]?.color??'#8f8d84'}"></i>`;}).join('');
 box.innerHTML=`<div class="mini-art" style="width:${W}px;height:${H}px;${art?`background-image:url(${art})`:''}">${cities}${units}<i class="mini-view" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></i></div>`;
}
$('#mini')?.addEventListener('click',e=>{const a=$('#mini .mini-art'),svg=$('#map svg'),port=$('.viewport');if(!a?.getBoundingClientRect||!svg)return;const r=a.getBoundingClientRect(),m0=mapMargin*zoom,k=Math.max(1,svg.getBoundingClientRect().width-2*m0)/r.width;port.scrollTo({left:(e.clientX-r.left)*k+m0-port.clientWidth/2,top:(e.clientY-r.top)*k+m0-port.clientHeight/2,behavior:'smooth'});});
// 10-23 성능: 스크롤마다 작은 지도를 통째로 다시 그리지 않고, 멈춘 뒤 한 번만.
let miniSettle=null;
$('.viewport')?.addEventListener('scroll',()=>{if($('#mini')?.hidden)return;clearTimeout(miniSettle);miniSettle=setTimeout(renderMini,120);},{passive:true});
$('#report-toggle')?.addEventListener('click',()=>$('#w-report')?.classList?.toggle('open'));
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(!$('#officer-modal').hidden){closeOfficerDetail362();e.preventDefault();e.stopImmediatePropagation();return;}
 if(!$('#roster').hidden){$('#roster').hidden=true;e.preventDefault();e.stopImmediatePropagation();}
 else if(document.body.dataset.c260Forecast==='true'&&!pendingAttack&&!document.querySelector('.w-modal:not([hidden]),.modal-backdrop:not([hidden]),.c261-settings:not([hidden]),#c226-stratagem:not([hidden])')){cancelKitForecast362();e.preventDefault();e.stopImmediatePropagation();}
},true);
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
function closeUnitMenu(){c300QPick=null;if(enginePicker462){enginePicker462=null;document.body.classList.remove('c462-w-picking');document.querySelector('.c231-engine-picker')?.remove();}clearTacticForecast();if(document.body?.classList?.contains('hud-band'))syncBandFocus(null,v3Mode());setCommandIntent('');selectedTacticId=null;attackMode=false;menuOpen=false;moveMode=false;faceMode=false;queueMicrotask(renderHint);destination=null;selectedArmyId=null;selectedArmyIds=[];if(state)render();}
// 부대 명령 카드 머리(레퍼런스: 삼국지14 초상 부대 · 문명6 선택 패널 · 워해머3 부대 카드) — 초상·병종·병력·사기·전열
// C21 전문인력(사용자 2026-10-04 승인 단순안): 종류·이름·아이콘·1명당 효과
const SPECIALISTS=[['artisan','기술자','build','생산 +1'],['official','관료','politics','산출 +5% · 점령 단계 −1'],['scholar','학자','science','학문 +1'],['logistician','병참','food','군량 +1']];
const JOB_ICON={muster:'troops',workshop:'build',recruit:'recruit',reorganize:'class',farm:'food',granary:'food',repair:'security',market:'gold',barracks:'troops',tuntian:'food',clinic:'wounded',mufu:'command'};
// 초상이 아직 없는 장수: 투구 쓴 반신 실루엣 + 이름 첫 글자 인장(문명·올드 월드의 빈 초상 자리처럼) — 초상 그림은 GPT 담당
const BUST=['M32 2c2 0 3 2 2 5l-1 3c7 1 11 6 12 14l2 3-1 6h-4c-1 7-5 12-10 12s-9-5-10-12h-4l-1-6 2-3c1-8 5-13 12-14l-1-3c-1-3 0-5 2-5z','M26 43v5c-10 1-17 6-19 16h50c-2-10-9-15-19-16v-5c-2 2-4 3-6 3s-4-1-6-3z'];
const faceFallback=(name,color)=>`<span class="face-fb"${color?` style="--fc:${color}"`:''}><svg viewBox="6 0 52 64" aria-hidden="true">${BUST.map(d=>`<path d="${d}"/>`).join('')}</svg><i>${esc(String(name??'').slice(0,1))}</i></span>`;
// 공격 예측 카드(파이어 엠블렘 예측 창·문명6 전투 예측·올드 월드) — 양측 병력 전→후, 결과 단계, 방향, 보정, 판정 확률
const SIDE_NAME={FRONT:'정면',FLANK:'측면',REAR:'후방'};
function fcCol(name,face,before,after,cls,detail=''){const lost=Math.max(0,before-after),w=v=>Math.max(0,Math.min(100,v/Math.max(1,before)*100)).toFixed(1);return `<div class="fc-col ${cls}"><div class="fc-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(name)}</div><b>${esc(name)}</b>${detail}<div class="fc-bar"><i style="width:${w(after)}%"></i><s style="width:${w(lost)}%"></s></div><small>${troopText(before)} → <em>${troopText(after)}</em> <span>−${troopText(lost)}</span></small></div>`;}
function fcResult(ef,af,destroyed){return destroyed?['격파','win']:ef-af>0.15?['대승','win']:ef-af>0.05?['우세','good']:ef-af>-0.05?['접전','even']:['불리','bad'];}
function forecastPublic(a,m={},enemy=false,p={}){
 if(!a)return '';
 const troop={BT01:'도',BT02:'창',BT03:'궁',BT04:'기'}[troopToCampaign(a.troopType)]??'병종';
 const stateText=[{SHAKEN:'搖 동요',ROUTING:'潰 패주'}[a.morale],{DISORDERED:'亂 흐트러짐',BROKEN:'崩 붕괴'}[a.formation]].filter(Boolean).join(' · ');
 const advantage=m.matchup&&m.matchup!==1?(m.matchup>1?'▲':'▼'):'';
 const seal=enemy?(p.destroyed?'破':p.formationRisk?.check&&p.formationRisk.successProbability<.5?'崩':p.moraleRisk?.check&&p.moraleRisk.successProbability<.5?'潰':''):'';
 return `<div class="c266-public"><span class="c266-troop">${esc(troop)} ${enemy?'':advantage}</span>${stateText?` · ${esc(stateText)}`:''}${seal?`<b class="c266-risk-seal" title="${p.destroyed?'이 공격으로 격파':'버틸 확률 50% 미만'}">${seal}</b>`:''}</div>`;
}
function forecastTacticSwitch(attId,tgtId){
 if(selectedTacticId)return '';
 const cards=campaignTactics(state,attId).filter(c=>['E','R'].includes(c.slot)&&tacticIsDamage(c));
 return `<nav class="c266-tactic-switch" aria-label="공격 방식"><button data-c266-normal aria-pressed="true">보통</button>${cards.map(c=>`<button data-c266-tactic="${esc(c.traitId)}" ${!c.canUse||!c.targets?.includes(tgtId)?'disabled':''} title="${esc(c.reason||'전법 예고로 전환')}">${esc(c.slot+' '+abilityName356(c))} ${esc(c.gauge??'')}/${esc(c.gaugeCost??'')}</button>`).join('')}</nav>`;
}
function forecastHtml(attId,tgtId,p,title=''){
 if(p.side==='FLANK'&&typeof showGuideFirst==='function')showGuideFirst('first.flank');
 // C173 may report AOE damage in enemyLoss. The portrait belongs to one target;
 // use its row here and leave aggregate losses in the target list below.
 if(Array.isArray(p.targetLosses))p={...p,enemyLoss:p.targetLosses.find(r=>r.targetId===tgtId)?.loss??0,allyLoss:p.targetLosses.find(r=>r.targetId===attId)?.loss??0};
 const publicView=view(state),visible={...publicView.knowledge.observedArmies,...publicView.ownArmies};
 const A=visible[attId],T=visible[tgtId],an=publicView.officers[A?.commanderId]?.name??'',tn=publicView.officers[T?.commanderId]?.name??'적';
 // 적 병력은 공격자에게 보이는 값(가짜 깃발이면 2배 — 정본 20 v3.5)으로 보여 준다
 const aT=A?.troopCount??0,tT=p.shownTargetCount??T?.troopCount??0,aAfter=Math.max(0,aT-(p.allyLoss??0)),tAfter=shownTroopForecast(tT,p.enemyLoss??0,campaignShownScale(state,tgtId,state.playerFactionId)).after;
 const [res,cls]=fcResult((tT-tAfter)/Math.max(1,tT),(p.allyLoss??0)/Math.max(1,aT),tAfter<=0);
 const m=p.multipliers??{},mods=[...new Set((p.effectLines??[]).map(line=>line.replace(/^병종 × 지형:\s*/, '지형 — ').replace(/공격 (-?\d+)%/,(_,n)=>`공격 ${Number(n)>0?'+':'−'}${Math.abs(Number(n))}%`).replace(/궁병 성 공격 — 성벽 내구 피해 ×0\.5/,'성벽 피해 절반')))];
 if(m.terrain&&m.terrain!==1)mods.push(`${publicView.tiles[T.tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`);if(m.castle&&m.castle!==1)mods.push(`성 방어 ×${m.castle}`);if(m.matchup&&m.matchup!==1)mods.push(`상성 ${m.matchup<1?'불리':'유리'} ×${m.matchup}`);if(m.river&&m.river!==1)mods.push(`도하 ×${m.river}`);if(m.flank&&m.flank!==1)mods.push(`협공 +${Math.round((m.flank-1)*100)}%`);
 const sideBonus=Number.isFinite(m.side)?Math.round((m.side-1)*100):0;
 const cleanMods=mods.filter(x=>! /^(측면|후방) \+/.test(x));if(sideBonus)cleanMods.push(`${SIDE_NAME[p.side]} +${sideBonus}%`);
 const capture=CAMPAIGN_RETREAT_FATE_RULES.blockedFateBasisPoints.captured,captureChance=(capture[1]-capture[0])/100;
 const verdictHelp=`적 ${Math.round((tT-tAfter)/Math.max(1,tT)*100)}% · 아군 ${Math.round((p.allyLoss??0)/Math.max(1,aT)*100)}% 잃음${tAfter<=0?' · 격파 뒤 퇴로가 없으면 사로잡을 확률 '+captureChance+'%':''} · ${res}가 예상됩니다`;
 const risks=[surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===T?.factionId)?.attackWarning),p.formationRisk?.check?'적 전열을 무너뜨림':null,p.moraleRisk?.check?`적 사기가 떨어질 수 있음(${chanceText462(1-p.moraleRisk.successProbability)})`:null].filter(Boolean);
 return `<small class="fc-terrain">${esc(({plain:'평지',forest:'숲',hill:'언덕',mountain:'산',water:'물'})[view(state).tiles[T?.tileId]?.terrainType]??'지형')} · 방어 ×${m.terrain??1}</small><div class="fc-top">${title?`<span class="fc-title">${esc(title)}</span>`:''}<span class="fc-res" data-res="${cls}" title="${esc(verdictHelp)}">${res}</span>${SIDE_NAME[p.side]?`<span class="fc-dir" data-side="${esc(p.side)}"><svg class="c266-direction" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2L17 6V14L10 18L3 14V6Z"/><path d="${p.side==='REAR'?'M10 19V11M7 14L10 11L13 14':p.side==='FLANK'?'M19 10H11M14 7L11 10L14 13':'M10 0V9M7 6L10 9L13 6'}"/></svg>${SIDE_NAME[p.side]}${sideBonus?` +${sideBonus}%`:p.side==='FRONT'?'':' 공격'}</span>`:''}${p.counter===false?'<span class="fc-tag">반격 없음</span>':''}</div><small class="fc-counter">${p.firstStrike?'먼저 반격':'반격'}${p.reflect?' · 창벽 반사':''}</small><p class="fc-sum">아군 −${troopText(p.allyLoss??0)} / 적 −${troopText(p.enemyLoss??0)}</p><div class="fc-vs" data-ally-color="${esc(FACTION_STYLE[A?.factionId]?.color??'#817966')}" data-enemy-color="${esc(FACTION_STYLE[T?.factionId]?.color??'#817966')}">${fcCol(an,faceOf(A?.commanderId),aT,aAfter,'ally',forecastPublic(A,m))}<b class="fc-x">VS</b>${fcCol(tn,faceOf(T?.commanderId),tT,tAfter,'enemy',forecastPublic(T,m,true,{...p,destroyed:tAfter<=0}))}</div>${cleanMods.length?`<ul class="fc-mods">${cleanMods.map(x=>`<li data-side="${/방어|도하|방어 태세/.test(x)?'enemy':'ally'}">${esc(x)}</li>`).join('')}</ul>`:''}${risks.map(x=>`<p class="fc-risk">${esc(x)}</p>`).join('')}${forecastTacticSwitch(attId,tgtId)}`;
}
function cityLabel(id){return document.querySelector?.(`#map .w-cityplate[data-city="${id}"] .name`)?.textContent??id;}
function setTip(tip,html,text){tacticForecast=null;tip.classList?.add('forecast');tip.innerHTML=html;if(!('firstElementChild' in tip))tip.textContent=text;}
// Reserve one thin line immediately above the band. Prefer the widest clear
// horizontal interval; if labels fill it, omit the guide rather than cover them.
function bandGuidePlacement(width,top,height,markers){
 const margin=12,gap=6,minWidth=Math.min(220,width*.3),wanted=Math.min(width*.46,720);
 let intervals=[[Math.max(margin,width*.12),width-margin]];
 for(const r of markers){
  if(r.bottom<=top||r.top>=top+height)continue;
  intervals=intervals.flatMap(([l,h])=>r.right+gap<=l||r.left-gap>=h?[[l,h]]:[[l,Math.max(l,r.left-gap)],[Math.min(h,r.right+gap),h]]).filter(([l,h])=>h-l>=minWidth);
 }
 const slot=intervals.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];
 if(!slot)return null;
 const w=Math.min(wanted,slot[1]-slot[0]),left=Math.max(slot[0],Math.min((width-w)/2,slot[1]-w));
 return {left,top,width:w};
}
function placeBandGuide(tip,refresh=false){
 if(!refresh&&!tip.querySelector?.('#c216-swap')){const full=tip.textContent.trim(),first=tip.firstChild?.textContent?.trim()||full;
  tip.title=full;tip.textContent=first;
 }
 const band=document.querySelector('.nb-band'),r=band?.getBoundingClientRect(),height=tip.querySelector?.('#c216-swap')?48:28;
 const top=Math.min(r?.height?r.top:innerHeight*.835,innerHeight*.835)-height-6;
 const markers=[...document.querySelectorAll('#map .w-cityplate,#map .w-unit>.plate-top,#map .w-site>.name')].map(n=>n.getBoundingClientRect());
 const p=bandGuidePlacement(innerWidth,top,height,markers);
 tip.hidden=!p;if(!p)return;
 tip.style.setProperty('--guide-left',p.left+'px');tip.style.setProperty('--guide-top',p.top+'px');tip.style.setProperty('--guide-width',p.width+'px');
}
// C281: move the fixed forecast to the opposite side of the aimed tile.
function placeC281Forecast(tile){
 const kit=document.documentElement?.dataset.ui==='kit';
 const panel=document.querySelector('.c260-forecast');if(!panel||panel.id==='c266-progress')return;
 const map=$('#map'),goal=targetScreenBounds(map,tile);if(!goal)return;
 const actor=map.querySelector(`.w-unit[data-unit="${selectedArmyId}"] > .plate-top`)?.getBoundingClientRect();
 const obstacles=[...document.querySelectorAll('.c327-dock,.nb-selected,.nb-order-row,.nb-more,.c236-command-list,.c236-objectives,#mini,.ih-res,.ih-end,#city-quick')].filter(n=>!n.hidden&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect());
 const box=panel.getBoundingClientRect(),p=kit?compactForecastPlacement352(innerWidth,innerHeight,box,goal,[actor,...obstacles].filter(Boolean)):forecastPlacement(innerWidth,innerHeight,box,[goal,actor].filter(Boolean));
 panel.style.setProperty('left',p.left+'px','important');panel.style.setProperty('top',p.top+'px','important');panel.style.setProperty('bottom','auto','important');
}
globalThis.addEventListener?.('resize',()=>{const tile=document.querySelector('.nb-band')?.dataset.target;if(tile)placeC281Forecast(tile);});
document.addEventListener('ink:forecast',e=>{if(e.detail)requestAnimationFrame(()=>{const tile=document.querySelector('.nb-band')?.dataset.target;if(tile)placeC281Forecast(tile);});});
function placeKitTooltip290(tip,x,y){
 const obstacles=[...document.querySelectorAll('.ih-end,.c248-lens-key,.c236-layer-key,.w-mini,.nb-selected,.city-quick,.c236-objectives,.c236-command-list,#map .w-cityplate.selected,#map .w-unit.selected,#map .c289-city[data-selected="true"] .c284-city-material')].filter(n=>!n.hidden&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').map(n=>n.getBoundingClientRect());
 const box=tip.getBoundingClientRect(),at=tooltipPlacement290(innerWidth,innerHeight,box,{x,y},obstacles);
 tip.style.left=at.left+'px';tip.style.top=at.top+'px';
}
function placeTip(tip,e,w=320){
 if(globalThis.document?.body?.classList?.contains('hud-band')){
  if(tip.classList.contains('forecast')&&tip.querySelector('.fc-vs,.fc-dur,.fc-bar.wide,.fc-command')){
   const a=state.armies[selectedArmyId],cityId=Object.values(state.cities).find(c=>c.tileId===targetTile(e.target,state.armies,state.cities))?.cityId,cityP=cityId&&cityAttackTargets(state,selectedArmyId).includes(cityId)?previewCityAttack(state,selectedArmyId,cityId):null,cityLoss=cityP?.allyLoss??0,own=tip.querySelector('.fc-vs')?'':`<div class="nb-city-ally"><img src="${esc(faceOf(a?.commanderId))}" alt=""><b>${esc(state.officers[a?.commanderId]?.name??'')}</b><small>병력 ${troopText(a?.troopCount??0)} → ${troopText(Math.max(0,(a?.troopCount??0)-cityLoss))} · 예상 손실 ${troopText(cityLoss)}</small></div>`;
   const tile=targetTile(e.target,state.armies,state.cities),band=document.querySelector('.nb-band');
   document.dispatchEvent(new CustomEvent('ink:forecast',{detail:{html:own+tip.innerHTML}}));tip.hidden=true;
   if(document.documentElement?.dataset.ui==='kit'&&tile){hoverSide={...(hoverSide??{}),tile};drawMapPreview();}
   if(tile&&band&&band.dataset.target!==tile){band.dataset.target=tile;bandPreviewPointer={x:e.clientX,y:e.clientY};if(document.documentElement?.dataset.ui!=='kit')requestAnimationFrame(()=>follow(selectedArmyId,true,tile));}
   if(tile)requestAnimationFrame(()=>placeC281Forecast(tile));return;
  }
  document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));const band=document.querySelector('.nb-band');if(band)delete band.dataset.target;
  tip.classList.remove('forecast');placeBandGuide(tip);return;
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
 if(!c.currentProduction)return cityProductionIdle(c)?{idle:true}:null;   // 고를 작업이 없는 성 = 쉼(다음 차례를 막지 않음 — P0 10-26)
 const kind=c.currentProduction.kind,job=c.jobs.find(j=>j.kind===kind)??{};
 return {kind,name:job.name??CITY_JOBS[kind]?.name??kind,turns:productionReadout(job.estimate).turns,progress:job.estimate?.progress,cost:job.estimate?.cost};
}
function idleCities(v){return !state.prologue&&state.phase==='PLAYER'&&!state.gameResult&&state.turn<CAMPAIGN_TURN_LIMIT?Object.values(v.ownCities).filter(c=>cityProductionBadge(c)?.idle):[];}
function closeProdPop(){const p=document.querySelector?.('#prod-pop');if(p)p.hidden=true;}
// C190: transient map UI only; never serialized or sourced from raw foreign cities.
let cityQuickId=null;
function closeCityQuick(){cityQuickId=null;const p=$('#city-quick'),line=$('#city-quick-link');if(p)p.hidden=true;if(line)line.hidden=true;}
function placeCityQuick(){
 if(!cityQuickId)return;
 if(document.documentElement.dataset.ui==='kit'){const p=$('#city-quick');if(p){p.style.removeProperty('left');p.style.removeProperty('top');}const link=$('#city-quick-link');if(link)link.hidden=true;return;}
 const p=$('#city-quick'),map=$('#map'),city=map?.querySelector(`.w-city[data-city="${cityQuickId}"] .ground`),label=map?.querySelector(`.w-cityplate[data-city="${cityQuickId}"] .name`);
 if(!p||!city||!label){closeCityQuick();return;}
 const a=city.getBoundingClientRect(),b=label.getBoundingClientRect(),r={left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)};
 if(r.right<0||r.left>innerWidth||r.bottom<60||r.top>innerHeight){closeCityQuick();return;}
 const avoid=[...document.querySelectorAll('#ink-hud .nb-state,#ink-hud .nb-selected,.ih-end')].filter(n=>!n.hidden&&getComputedStyle(n).display!=='none').map(n=>n.getBoundingClientRect());
 const l0=document.documentElement?.dataset.ui==='l0',kit=document.documentElement?.dataset.ui==='kit',size=l0||kit?p.getBoundingClientRect():{width:280,height:220};
 if(l0)avoid.push(...[...document.querySelectorAll('.c236-command-list,.c236-objectives,.c236-map-switches')].map(n=>n.getBoundingClientRect()));
 const at=cityQuickPlacement(r,innerWidth,innerHeight,avoid,size);p.style.left=at.left+'px';p.style.top=at.top+'px';
 const line=$('#city-quick-link'),x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
 line?.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 line?.querySelector('path')?.setAttribute('d',`M${x} ${y}L${Math.max(at.left,Math.min(at.left+size.width,x))} ${Math.max(at.top,Math.min(at.top+size.height,y))}`);
}
function openCityQuick(cityId){
 const v=view(state),c=cityPublicReadout(v,cityId,cityProductionBadge(v.ownCities?.[cityId]??{}));if(!c)return false;
 if(c.governor)c.governor.face=faceOf(c.governor.id);
 closeProdPop();let p=$('#city-quick');
 if(!p){
  p=document.createElement('section');p.id='city-quick';p.className='city-quick';p.setAttribute('role','dialog');p.setAttribute('aria-label','성 빠른 명령');document.body.appendChild(p);
  p.style.setProperty('--cq-panel',`url("${C190_ART.panel}")`);
  if(C190_ART.btn)p.style.setProperty('--cq-btn',`url("${C190_ART.btn}")`);
  if(C190_ART.btnRed)p.style.setProperty('--cq-btn-red',`url("${C190_ART.btnRed}")`);
  const link=document.createElementNS('http://www.w3.org/2000/svg','svg');link.id='city-quick-link';link.innerHTML='<path/>';document.body.appendChild(link);
  p.addEventListener('click',e=>{
   const action=e.target.closest('[data-stratagem-quick]')?.dataset.stratagemQuick!==undefined?'stratagem':e.target.closest('[data-city-quick-action]')?.dataset.cityQuickAction,id=cityQuickId;
   if(!action||!id||inputLocked()||!view(state).ownCities[id])return;
   closeCityQuick();
   if(action==='stratagem')openStratagem(id);
   else if(action==='sortie')openStage(id,'barracks');
   else if(action==='production')openProdPop(id,e,reasonText);
   else if(action==='office')openCity(id,'office');
   else if(action==='enter')openStage(id);
  });
 }
 cityQuickId=cityId;p.dataset.city=cityId;p.classList.toggle('foreign',!c.own);p.classList.toggle('besieged',c.besieged);p.innerHTML=cityQuickHtml(c,{kit:document.documentElement?.dataset?.ui==='kit'});p.hidden=false;$('#city-quick-link').hidden=false;placeCityQuick();if(document.documentElement?.dataset?.ui==='kit'){uncoverMapTile((v.ownCities[cityId]??v.knowledge?.cities?.[cityId])?.tileId);placeCityQuick();}return true;
}
document.addEventListener('pointerdown',e=>{if(cityQuickId&&!e.target.closest?.('#city-quick,.c236-map-switches,.c236-layer-key,#mode-rail [data-mode]'))closeCityQuick();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&cityQuickId){closeCityQuick();e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('resize',placeCityQuick);
function openProdPop(cityId,e,explain=code=>code){
 const v=view(state),c=v.ownCities[cityId];if(!c?.jobs||!document.createElement)return false;
 let pop=document.querySelector('#prod-pop');if(!pop){pop=document.createElement('div');pop.id='prod-pop';pop.className='panel lacquer prod-pop';document.body.appendChild(pop);
  pop.addEventListener('click',ev=>{const k=ev.target.closest('[data-quick-job]')?.dataset.quickJob,more=ev.target.closest('[data-quick-more]');const id=pop.dataset.city;
   if(more){closeProdPop();openCity(id,'jobs');return;}if(k&&!inputLocked()){closeProdPop();command({type:'CITY_JOB',cityId:id,kind:k});const next=idleCities(view(state))[0];if(next&&next.cityId!==id)$('#status').textContent=`생산 선택 — 다음 성: ${next.name} (턴 종료 버튼으로 이동)`;}});}
 const sc=state.cities[cityId],rates=cityEconomyRates(state,sc);
 const available=[],blocked=[];
 for(const j of c.jobs){const turns=productionReadout(j.estimate).turns,why=j.blockedReason??(['muster','reorganize'].includes(j.kind)?'성 창에서 장수와 병종을 선택하세요':inputLocked()?'지금은 생산을 정할 수 없습니다':'');const card=`<button data-quick-job="${esc(j.kind)}" ${why?'disabled':''} title="${esc(explain(why))}">${UI_ICON(JOB_ICON[j.kind]??'build')}<b>${esc(j.name)}</b><em>${esc(j.description??JOB_FX[j.kind]??'')}</em><small>${why?esc(explain(why)):`${turns??'중단'}차례`}</small></button>`;(why?blocked:available).push(card);}
 const items=available.join('')+(blocked.length?`<details class="c489-blocked"><summary>못 짓는 것 ${blocked.length}</summary>${blocked.join('')}</details>`:'');
 pop.dataset.city=cityId;pop.innerHTML=`<header><b>${esc(c.name)}</b> 생산 선택</header><div class="pp-list">${items||'<p class="muted">지금 바로 고를 작업이 없습니다.</p>'}</div><button class="pp-more" data-quick-more>출진·재편·자세히 — 성 창</button>`;
 pop.hidden=false;const r=pop.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(innerWidth-r.width-8,(e?.clientX??innerWidth/2)-r.width/2))+'px';pop.style.top=Math.max(8,Math.min(innerHeight-r.height-8,(e?.clientY??innerHeight/3)+14))+'px';return true;
}
function openCity(cityId,tab='jobs'){if(view(state).ownCities[cityId]){closeUnitMenu();openStage(cityId,tab==='jobs'||tab==='office'?'office':BUILDINGS[tab]?tab:null);return;}selectedCityId=cityId;cityTab=tab;closeUnitMenu();renderCityPanel(view(state));const n=$('#map').querySelector?.(`[data-city="${cityId}"]`);n?.scrollIntoView?.({block:'center',inline:'center',behavior:'smooth'});}
// C300: QWER 능력 고정. 부대 선택 중 지도 이동은 방향키 사용.
// 명령형 내정 특기: 누르기 전에 효과와 대가를 보여 준다(common-pool v0.3 문장)
const DOMESTIC_CMD_FX={CITY_TAX_ADVANCE:'다음 3턴 생산을 지금 받음 · 대가: 그 3턴 생산 0, 치안 한 단계 악화'};
const ACTION_KEYS={troopQ:'Q',engine:'W',tacticE:'E',tacticR:'R',move:'M',attack:'A',face:'F',brace:'B',regroup:'S',garrison:'G',wait:'H'};
// 위험 지역(파이어 엠블렘 위험 지대·토탈워 영향권): 보이는 적이 다음 턴에 들어오거나 칠 수 있는 칸
function dangerTiles(v){
 if(dangerCache?.state===state)return dangerCache.tiles;
 const tiles=campaignDangerTiles(state,v.factionId),intents=[],targets=[...Object.values(v.ownArmies),...Object.values(v.ownCities)];
 for(const a of Object.values(v.knowledge?.observedArmies??{})){
  if(v.knowledge.tiles[a.tileId]!=='VISIBLE'||a.factionId===state.playerFactionId)continue;
  // Ask the same public engine calculation for this source's arrows as for the overlay.
  const k=state.knowledge[v.factionId],publicSource={...state,knowledge:{...state.knowledge,[v.factionId]:{...k,observedArmies:{[a.armyId]:a}}}};
  const area=new Set(campaignDangerTiles(publicSource,v.factionId));
  for(const t of targets)if(!diplomacyAttackReason(state,a.armyId,t.armyId??t.cityId)&&[t.tileId,...(t.footprint?.gates??[]),...(t.footprint?.walls??[])].some(id=>area.has(id)))intents.push({from:a.tileId,to:t.tileId});
 }
 dangerCache={state,tiles,intents};return dangerCache.tiles;
}
// 다음 부대 자동 선택(문명 '다음 유닛'): 방금 행동한 부대가 끝났으면 아직 움직일 부대를 고른다
function autoNextUnit(){if(lastActedArmy)setTimeout(autoNextUnitNow,60);}
function autoNextUnitNow(paint=render,focus=true){
 // Timer callbacks pass no arguments; only the settlement path supplies paint.
 if(typeof paint!=='function')paint=render;
 const prev=lastActedArmy;
 if(!prev||!state||state.phase!=='PLAYER'||state.gameResult||combatAnimating||selectedArmyId||document.querySelector?.('.w-modal:not([hidden]),.modal-backdrop:not([hidden])'))return;
 lastActedArmy=null;
 if(state.armies[prev]&&!armyActionEnded(state,prev))return;
 const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)&&!state.moveOrders?.[id]).sort();if(!ids.length)return;
 const next=ids[0];selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;paint();if(focus){follow(next,true,null,null,true);positionUnitMenu();setTimeout(positionUnitMenu,120);}
 $('#status').textContent=`다음 부대 — ${state.officers[state.armies[next].commanderId]?.name??''} (Space 다음 · Esc 놓기)`;
 return true;
}
const ICON_GLYPH={move:'이동',attack:'공격',wait:'대기',security:'방어',command:'정면',cancel:'취소',info:'정보',tactic:'전법',build:'건설',recruit:'모집',pacify:'회유',martial:'군정',plunder:'약탈',city:'성',captive:'포로',potential:'포텐',levelup:'성장',trait:'특기','stat-up':'능력',class:'계열',food:'식량',production:'생산',science:'학문',fame:'인망',gold:'금',people:'인구',troops:'병력',reserve:'예비',wounded:'부상',charisma:'감화',valor:'무용',intellect:'지략',politics:'정무','end-turn':'종료',save:'저장',load:'불러'};
const UI_ICON=name=>`<i class="gi" aria-hidden="true">${ICON_GLYPH[name]??'·'}</i>`;
const MORALE_NAME={STEADY:'사기 안정',SHAKEN:'동요',ROUTING:'패주'};
// 손권 P1 '별의 길': 가장 높은 큰 능력에 따른 행동 1개(부대장 대기 2턴·태수 3턴)
function starButton(a,attr){const wait=a.readyTurn>state.turn?a.readyTurn-state.turn:0;return `<button class="star-action" ${attr} ${a.canUse?'':'disabled'} title="${esc(a.description)}">${UI_ICON('potential')}별의 길 · ${esc(a.name)} <small>${esc(a.axis)} · ${a.canUse?esc(a.description):wait?`대기 ${wait}턴`:esc(reasonText(a.blockedReason))}</small></button>`;}
// 장수 가용성(C46) — 피로(재출진 제한만, 출진 중 효과 없음)·중상(요양)
function availabilityLine(o){
 if(!o)return '';const f=o.fatigue,inj=o.injury,parts=[];
 if(inj)parts.push(`<span class="av-inj" title="중상 — 요양이 끝나면 복귀(군주와 친밀도 +5·경험치 +10)">중상 · ${esc(injuryReturnText(state.turn,inj))}</span>`);
 if(fatigueLineText(f))parts.push(`<span class="av-fat${f.musterBlocked?' blocked':''}" title="이미 출진한 부대에는 효과 없음">${esc(fatigueLineText(f))}</span>`);
 return parts.length?`<p class="av-line">${parts.join('')}</p>`:'';
}
const musterTag=o=>o?.injury?' — 중상 요양':o?.fatigue?.musterBlocked?` — ${fatigueLineText(o.fatigue)}`:'';
function unitCardHead(v,army,title){
 if(!army)return `<div class="dk-head"><div class="dk-id"><h2>${esc(title)}</h2></div></div>`;
 const face=faceOf(army.commanderId),color=FACTION_STYLE[army.factionId]?.color??'#7d7a6a';
 const tags=[MORALE_NAME[army.morale??'STEADY'],FORMATION_NAME[army.formation]?`전열 ${FORMATION_NAME[army.formation]}`:'전열 정연',army.braced?'방어 태세':null,(f=>f&&f.until>=state.turn?`진형 ${f.name}`:null)(state.armies[army.armyId]?.c33?.formation)].filter(Boolean);
 const max=state.armies[army.armyId]?.maxTroopCount??army.troopCount,ratio=max?Math.max(0,Math.min(1,army.troopCount/max)):1;
 return `<header class="dk-head" style="--fc:${color}"><div class="dk-face">${face?`<img src="${esc(face)}" alt="">`:faceFallback(title)}</div><div class="dk-id"><h2>${esc(title)}</h2><div class="dk-meta">${esc(troopName(army.troopType))} · 병력 <b>${troopText(army.troopCount)}</b></div><div class="dk-bar"><i style="width:${(ratio*100).toFixed(0)}%"></i></div><div class="dk-engine">${engineStatusMarkup(army.engine)}</div><div class="dk-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${bondChips(v.officers[army.commanderId])}</div></header>`;
}
function supplySourceText(sup,v){
 const city=v.ownCities?.[sup?.sourceCityId];if(!city)return '';
 const parts=[`보급 출처 ${city.name}`];
 if(Number.isFinite(city.foodStock))parts.push(`현지 식량 ${food1(city.foodStock)}`);
 if(Number.isFinite(city.foodWarehouse?.stock))parts.push(`공동 창고 ${food1(city.foodWarehouse.stock)}`);
 else parts.push(`세력 식량 합계 ${food1(foodSnapshot(v).stock)}`);
 return parts.join(' · ');
}
function tacticAvailability(c){const gloss=abilityGloss356(c);return [gloss,tacticAvailability356(c)].filter(Boolean).join(' · ');}
function tacticAvailability356(c){if(c.reasonText)return c.reasonText;if(c.reason)return reasonText(c.reason);if(c.targets?.length)return '사용 가능';if(c.waiting>0)return `재사용까지 ${c.waiting}턴`;return '대상·사용 조건 확인';}
let c279JudgmentCache=null;
function commandJudgments(mainAvailable=true){
 if(c279JudgmentCache?.state===state&&c279JudgmentCache.id===selectedArmyId)return c279JudgmentCache.lines;
 const lines={},id=selectedArmyId,v=view(state),a=v.ownArmies[id];if(!a)return lines;
 if(!mainAvailable||state.phase!=='PLAYER'||state.gameResult||state.endedArmyIds?.includes(id))return lines;
 for(const [key,type] of [['brace','BRACE'],['regroup','REGROUP']]){try{
  const next=step(state,{type,armyId:id}),b=view(next).ownArmies[id];
  const before=campaignUnitRatings(state,id),after=campaignUnitRatings(next,id);
  lines[key]=key==='brace'?`표준 방어 ${before.defense} → ${after.defense}`:`${MORALE_NAME[a.morale]} → ${MORALE_NAME[b.morale]} · 전열 ${FORMATION_NAME[a.formation]} → ${FORMATION_NAME[b.formation]}`;
 }catch(e){lines[key]=errorText(e);}}
 const probe=campaignTacticsWorld(state,campaignTacticsView(state,v.factionId)),risk=probe&&previewDisengage(probe,id);
 lines.move=!campaignMoveOptions(state,id).length?'이동할 수 있는 칸 없음':risk?`후퇴 시 추격 −${troopText(risk.dealt)}`:'후퇴 시 공개된 추격 위험 없음';
 c279JudgmentCache={state,id,lines};return lines;
}
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
function platformButton(armyId){
 const a=state.armies[armyId];
 if(a?.troopType==='engineer'){const reason=view(state).ownArmies[armyId]?.repairCityReason;return `<button class="platform-command" data-menu="repair_city" ${reason?'disabled':''} title="${esc(reason||'보수 — 주 행동 1회 · 내구 +15')}">보수</button>${reason?`<small class="platform-reason">${esc(reason)}</small>`:''}`;}
 if(a?.troopType!=='catapult')return '';
 const type=platformState(a)==='DEPLOYED'?'STOW':'DEPLOY',reason=platformActionReason(state,armyId,type),label=type==='DEPLOY'?'전개':'거두기';
 return `<button class="platform-command" data-menu="${type.toLowerCase()}" ${reason?'disabled':''} title="${esc(reason||`${label} — 주 행동 1회`)}">${label}</button>${reason?`<small class="platform-reason">${esc(reason)}</small>`:''}`;
}
function platformCommand(action){
 if(action==='repair_city'){if(!view(state).ownArmies[selectedArmyId]?.repairCityReason)command({type:'REPAIR_CITY',armyId:selectedArmyId});return true;}
 if(!['deploy','stow'].includes(action))return false;
 const type=action.toUpperCase();if(platformActionReason(state,selectedArmyId,type))return true;
 command({type,armyId:selectedArmyId});return true;
}
// The current HUD copies a fixed list of legacy commands. Extend only this
// unit's band and its stored return-from-forecast markup, using its existing
// data-act delegation and button styling.
function syncPlatformBand(root,armyId){
 const band=root.querySelector('.nb-band');if(!band||!armyId)return;
 const html=platformButton(armyId).replace('data-menu=','data-act=');if(!html)return;
 const marker='<div class="nb-order-row">';
 if(band._unitHtml?.includes(marker))band._unitHtml=band._unitHtml.replace(marker,marker+html);
 if(band.dataset.state!=='forecast'){
  const row=band.querySelector('.nb-order-row');if(!row)return;
  row.querySelectorAll('.platform-command,.platform-reason').forEach(n=>n.remove());
  row.insertAdjacentHTML('afterbegin',html);
 }
}
function platformRangeTiles(v,armyId){
 const a=v.ownArmies[armyId];if(platformState(a)!=='DEPLOYED')return [];
 return Object.keys(v.tiles).filter(id=>v.knowledge.tiles[id]!=='UNEXPLORED'&&hexDistance(v.tiles[a.tileId],v.tiles[id])<=C193.catapult.range);
}
let c300QPick=null;
function c300QCard(){
 if(!c300QPick||c300QPick.armyId!==selectedArmyId||c300QPick.stamp!==state||selectedArmyIds.length>1){c300QPick=null;return null;}
 return view(state).ownArmies[selectedArmyId]?.troopQ??null;
}
function c300DockData(v){
 const army=v.ownArmies[selectedArmyId];
 if(!army){const seen=v.knowledge?.observedArmies?.[inspectedArmyId];if(!seen||v.knowledge.tiles[seen.tileId]!=='VISIBLE')return null;return {enemy:true,count:1,army:{commanderId:seen.commanderId,troopCount:seen.troopCount},name:v.officers[seen.commanderId]?.name??'관측한 적',face:faceOf(seen.commanderId),troops:seen.troopCount,morale:MORALE_NAME[seen.morale],formation:FORMATION_NAME[seen.formation]};}
 const ids=selectedArmyIds.length>1?selectedArmyIds:[selectedArmyId],many=ids.length>1;
 const officer=v.officers[army.commanderId],risks=moveMode&&destination?routeRisks(movementPreview(destination)):[];
 // Existing engine queries on the public board; this is a standard comparison, not opponent damage.
 const publicWorld=many?null:campaignTacticsWorld(state,campaignTacticsView(state,v.factionId));
 const ratings=publicWorld?campaignUnitRatings(publicWorld,selectedArmyId):null;
 if(ratings)ratings.range=attackRange(army,publicWorld);
 const baseline=publicWorld?structuredClone(publicWorld):null;
 if(baseline){const a=baseline.armies[selectedArmyId];a.morale='STEADY';a.formation='ORDERED';a.braced=false;a.effectStates=[];a.statusEffects=[];}
 const baseRatings=baseline?campaignUnitRatings(baseline,selectedArmyId):null;
 const ratingDeltas=ratings&&baseRatings?Object.fromEntries(['attack','defense','mobility'].map(k=>[k,ratings[k]-baseRatings[k]])):null;
 if(ratingDeltas){ratingDeltas.range=ratings.range-attackRange(army);ratings.notes.push('증감: 사기·전열·방어 태세·공개 효과 목록을 제외한 표준 비교 / 사거리: 병종 기본 대비. 현 지형 보정은 이 비교값에 포함되지 않음');}
 return {army,officer,ratings,ratingDeltas,turn:v.turn,traitActivations:recentCombats.filter(r=>r.turn===v.turn).flatMap(r=>r.traitActivations??[]),color:officerColors327[army.commanderId],risks,count:ids.length,name:v.officers[army.commanderId]?.name??'',face:faceOf(army.commanderId),bust:`/assets/officer-art/bust/${army.commanderId}.webp`,type:troopName(army.troopType),troops:ids.reduce((n,id)=>n+(v.ownArmies[id]?.troopCount??0),0),max:many?null:campaignMapModel(v).units.find(u=>u.id===selectedArmyId)?.maxCount,actions:selectedActions(),mode:state.phase==='PLAYER'&&!inputLocked(),morale:MORALE_NAME[army.morale],formation:FORMATION_NAME[army.formation]??'정연',cards:many?[]:campaignTactics(state,selectedArmyId).map(c=>({...c,waiting:Number.isFinite(c.gaugeCost)?c.cooldown??0:c.waiting,consumesMain:true})),selected:c300QCard()?'troop-q':selectedTacticId??(faceMode?'face':attackMode?'attack':moveMode?'move':null)};
}
function c327SyncDockRisk(preview){
 const dock=document.querySelector('.c327-dock:not(.c327-enemy)');if(!dock)return;
 const risks=moveMode?routeRisks(preview):[];
 dock.classList.toggle('c327-danger',risks.length>0);dock.title=risks.map(r=>r.kind).join(' · ');
}
function c300BeginQ(){
 const card=view(state).ownArmies[selectedArmyId]?.troopQ;
 if(selectedArmyIds.length>1||!card?.canUse)return;
 cancelStrike();clearTacticForecast();selectedTacticId=null;attackMode=false;faceMode=false;moveMode=false;
 c300QPick={armyId:selectedArmyId,stamp:state};menuOpen=true;render();$('#status').textContent=card.name+' — 대상을 고르세요 (Esc 취소)';
}
function c300QTile(target){return typeof target==='string'?target:target?.targetTileId??target?.tileId;}
function c300QPreview(tileId,e){
 const card=c300QCard();if(!card)return false;
 const target=card.targets?.find(t=>c300QTile(t)===tileId),tip=$('#attack-preview');
 if(!target){tip.hidden=true;return true;}
 const preview=(typeof target==='object'?target.preview:null)??card.preview?.[tileId]??card.preview;
 const lines=typeof preview==='string'?[preview]:Array.isArray(preview)?preview:preview?.effectLines??preview?.lines??[preview?.description,preview?.text,Number.isFinite(preview?.dealt)?`예상 피해 ${troopText(preview.dealt)}`:null,Number.isFinite(preview?.allyLoss)?`예상 아군 손실 ${troopText(preview.allyLoss)}`:null].filter(Boolean);
 setTip(tip,`<div class="fc-top"><span class="fc-title">${esc(card.name)}</span></div><p class="fc-sum">${esc(tileId)} · 대상 선택</p>${lines.map(x=>`<p>${esc(x)}</p>`).join('')}`,card.name);
 tip.hidden=false;placeTip(tip,e);return true;
}
function renderUnitMenu(v){
 const menu=$('#unit-menu');menu.hidden=!menuOpen;if(!menuOpen&&!selectedArmyId)return;
 if(selectedArmyIds.length>1){menu.innerHTML=`<header class="dk-head"><div class="dk-id"><h2>${selectedArmyIds.length}개 부대</h2><div class="dk-meta">함께 명령</div></div></header><div class="dk-body"><div class="dk-acts"><button data-menu="move" ${selectedArmyIds.every(id=>orderEligible(state,id))?'':'disabled'}>${UI_ICON('move')}이동<kbd>M</kbd></button><button data-menu="brace" ${selectedArmyIds.every(id=>!armyActionEnded(state,id)&&canMainAction(state,id))?'':'disabled'} title="${selectedArmyIds.every(id=>!armyActionEnded(state,id)&&canMainAction(state,id))?'전체 방어':'행동을 마친 부대가 포함되어 있습니다.'}">${UI_ICON('security')}방어<kbd>B</kbd></button><button data-menu="wait">${UI_ICON('wait')}대기<kbd>H</kbd></button><button data-menu="close" class="close" title="닫기">${UI_ICON('cancel')}</button></div></div>`;return;}
 const army=v.ownArmies[selectedArmyId],title=v.officers[army?.commanderId]?.name??'';
 const recall=hasCampaignRule(state,selectedArmyId,'RECALL')?`<button data-menu="recall" ${recallReason(state,selectedArmyId)?'disabled':''}>귀환${recallReason(state,selectedArmyId)?' · '+esc(recallReason(state,selectedArmyId)):''}</button>`:'';
 const controls=armyActionEnded(state,selectedArmyId)?`<p>${army?.morale==='ROUTING'?'패주 — 명령 불가':'이번 턴 행동 완료'}</p>`:
  `${campaignMoveOptions(state,selectedArmyId).length?`<button data-menu="move">${UI_ICON('move')}이동</button>`:''}${(()=>{const why=!canMainAction(state,selectedArmyId)?ERROR_TEXT.MAIN_ACTION_USED:archerAttackReason(state,selectedArmyId)?reasonText(archerAttackReason(state,selectedArmyId)):!(attackTargets(state,selectedArmyId).length||cityAttackTargets(state,selectedArmyId).length)?'지금 공격할 수 있는 대상이 없습니다':'';return `<button data-menu="attack" ${why?'disabled':''} title="${esc(why||'공격할 대상을 고릅니다')}">${UI_ICON('attack')}공격</button>`;})()}${state.movedArmyIds.includes(selectedArmyId)?'':`<button data-menu="face" title="이동 대신 바라보는 쪽만 바꿉니다. 옆·뒤를 맞으면 피해가 커집니다.">${UI_ICON('command')}정면</button>`}<button data-menu="brace" ${!canMainAction(state,selectedArmyId)?'disabled':''} title="${canMainAction(state,selectedArmyId)?'이번 차례 방어 태세':ERROR_TEXT.MAIN_ACTION_USED}">${UI_ICON('security')}방어</button>${(()=>{const gr=garrisonReason(state,selectedArmyId);return !gr?`<button data-menu="garrison" title="부대가 해산되고 병력 ${troopText(army.troopCount)}이 이 성의 예비병이 됩니다">${UI_ICON('city')}복귀</button>`:gr==='ENEMY_ADJACENT'?`<button data-menu="garrison" disabled title="옆 칸에 적이 있어 성으로 들어갈 수 없습니다">${UI_ICON('city')}복귀</button>`:'';})()}<button data-menu="regroup" ${regroupReason(state,selectedArmyId)?'disabled':''} title="${esc(regroupReason(state,selectedArmyId)||'흐트러진 전열·사기를 추스릅니다')}">${UI_ICON('reserve')}재정비</button><button data-menu="wait">${UI_ICON('wait')}대기</button>`;
 const chase=!armyActionEnded(state,selectedArmyId)&&campaignMoveOptions(state,selectedArmyId).length?previewDisengage(state,selectedArmyId):null;
 const warn=chase?`<p class="warn">이동하면 추격받음 — ${esc(state.officers[state.armies[chase.pursuerId].commanderId]?.name??'적')} 예상 −${troopText(chase.dealt)} ${chase.effectLines.length?' · '+esc(chase.effectLines.join(' · ')):''}</p>`:'';
 const legacyTactics=campaignTactics(state,selectedArmyId).map(c=>`<button data-tactic="${esc(c.traitId)}" ${tacticButtonState(c,selectedArmyId)} ${!c.canUse?'disabled':''} title="${esc(tacticAvailability(c))}">${UI_ICON('tactic')}${tacticFaceMarkup(Math.max(0,(army.tacticReadyTurns?.[c.traitId]??0)-state.turn),c.signature?Math.min(100,state.campaignGrowth?.officers?.[army.commanderId]?.c29?.gauge??0):null)}${c.jointArmyIds?'<span class="joint-tag">공동</span>':''}${esc(abilityName356(c))} <small>${c.signature?(()=>{const g=Math.min(100,state.campaignGrowth?.officers?.[state.armies[selectedArmyId]?.commanderId]?.c29?.gauge??(100-(c.waiting??0)));return `<span class="sig-gauge" style="--g:${g}%">고유 · 게이지 ${Math.round(g)}/100${g>=100?' · '+esc(tacticAvailability(c)):' · 충전 중'}</span>`;})():esc(tacticAvailability(c))}${c.effects?.length?'':' · 효과 준비 중'}</small></button>`).join('');
 const liveTactics=campaignTactics(state,selectedArmyId).sort((a,b)=>Number(a.slot==='R')-Number(b.slot==='R'));
 if(liveTactics.some(c=>c.canUse&&c.effects?.some(e=>['FIRE_ATTACK','FIRE_ARROW','INFERNO'].includes(e.rule))))inkCards?.offer(['fire']);
 const tactics=liveTactics.some(c=>c.slot)?(liveTactics.some(c=>c.slot==='E')?'':'<button disabled title="보유 공용 전법을 출진 전에 장착하세요">E 빈 전법 칸</button>')+liveTactics.map(c=>`<button data-tactic="${esc(c.traitId)}" ${tacticButtonState(c,selectedArmyId)} ${c.canUse?'':'disabled'} title="${esc([abilityGloss356(c),c.reasonText||'대상을 고릅니다'].filter(Boolean).join(' · '))}">${UI_ICON('tactic')}${c.slot}${c.signatureE?' 고유':''} ${esc(abilityName356(c))} · ${c.gaugeCost}<small>${esc(c.reasonText||'사용 가능')}</small>${tacticFaceMarkup(0,c.gauge,c.gaugeCost)}</button>`).join(''):legacyTactics;
 const engineButton=army?.engine?`<button data-menu="engine"  title="${esc((army.engineActions??[]).map(o=>o.name+(o.reasonText?' — '+o.reasonText:'')).join(' · '))}">W ${esc((army.engineActions??[]).map(o=>o.name).join(' / '))}</button>`:'';
 const disengage=army?.disengage?.options?.length?`<button data-menu="disengage">이탈 사격</button>`:'';

 const fm=FORMATION_NAME[army?.formation]?`<p class="warn">전열 ${FORMATION_NAME[army.formation]} — 받는 피해 +${army.formation==='BROKEN'?30:15}%${army.formation==='BROKEN'?', 반격 불가':', 반격 절반'} · 재정비로 회복${regroupReason(state,selectedArmyId)?` — 지금은 안 됨: ${esc(regroupReason(state,selectedArmyId))}`:''}</p>`:'';
 const star=army?.starAction&&!armyActionEnded(state,selectedArmyId)?starButton(army.starAction,'data-menu="star"'):'';
 // 보급(C45): 상태 한 줄 + 보급 거점 짓기
 // 남의 성 칸(성문 · 성벽)에 선 부대는 보급선이 닿지 않는다(엔진 supplyLink: 남의 성 칸은 길이 막힘) — 포위는 휴대 군량으로 버틴다. 까닭을 글로 알린다
 const atOtherCity=!!state.armies[selectedArmyId]&&Object.values(state.cities).some(c=>c.ownerFactionId!==state.armies[selectedArmyId].factionId&&[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])].includes(state.armies[selectedArmyId].tileId));
 const sup=army?.supply,supLine=sup?`<p class="supply-line" data-supply="${esc(sup.state)}" title="${sup.model==='clock'?`보급선: 내 성 · 보급 거점까지 지나갈 수 있는 길 — 8칸 안 안전(군량이 줄지 않고 차례마다 가득 채워짐), 16칸 안 불안(차례마다 반 차례분 줄어듦), 그 밖 끊김(한 차례분 줄어듦). 적 성문에 붙은 부대는 가까워도 끊김 — 포위는 휴대 군량으로 버틴다. 휴대 군량은 ${sup.perTurn?Math.round(sup.max/sup.perTurn):5}차례분. 적 부대를 없애면 한 차례분, 성이나 적 거점을 빼앗으면 가득 얻는다. 바닥나면 굶주림(병력 손실)`:'보급선: 내 성·보급 거점까지 지나갈 수 있는 길 — 8칸 안 안전, 16칸 안 불안(성이 절반만), 그 밖 끊김(휴대 군량만). 휴대 군량이 바닥나면 굶주림'}">보급선 <b>${SUPPLY_LABEL[sup.state]??esc(sup.state)}</b> · 부대가 가진 군량 ${food1(sup.stock??0)}/${food1(sup.max??0)}${supplyDuration(sup.turnsLeft)?` (${supplyDuration(sup.turnsLeft)})`:''}${sup.model==='clock'&&sup.state!=='STARVING'?(!sup.draining?' · 보급권 안 — 줄지 않음':sup.state==='CUT'?(atOtherCity?' · 적 성에 붙어 있어 보급이 닿지 않음 — 차례마다 한 차례분씩 줄어듦':' · 차례마다 한 차례분씩 줄어듦'):sup.state==='DISRUPTED'?' · 차례마다 반 차례분씩 줄어듦':' · 줄어드는 중'):''}${sup.state!=='STARVING'&&Number.isFinite(sup.turnsLeft)&&sup.turnsLeft<1?' · 군량 바닥 — 채워지지 않으면 다음 차례 굶주림':''}${Number.isFinite(sup.distance)?` · 원천까지 ${sup.distance}칸`:''}</p>`:'';
 const hubWhy=sup&&!armyActionEnded(state,selectedArmyId)?(()=>{try{return hubBuildReason(state,state.armies[selectedArmyId]);}catch{return '';}})():null;
 const hub=hubWhy!==null?`<button data-menu="hub" ${hubWhy?'disabled':''} title="${hubWhy?esc(hubWhy)+' — ':''}이 칸에 보급 거점을 짓습니다 — 교전 없이 이번 차례를 마치면 완공, ${sup?.model==='clock'?'거점에서 8칸 안이 보급권이 되어 그 안의 부대는 군량이 줄지 않습니다':'원천에서 군량 2차례분을 옮겨 첫 재고로'}">${UI_ICON('build')}보급 거점</button>`:'';
 const judgments=commandJudgments(canMainAction(state,selectedArmyId));
 menu.innerHTML=`${unitCardHead(v,army,title)}<div class="dk-body"><div class="dk-info">${actionReadoutHtml(selectedActions())}${supLine}${supplySourceText(sup,v)?`<p class="supply-context">${esc(supplySourceText(sup,v))}</p>`:''}${sup?.state==='STARVING'?`<p class="warn">${esc(starvingAdvice(army,v))}</p>`:''}${fm}${warn}</div><div class="dk-acts">${controls}<button data-menu="troop-q" ${army?.troopQ?.canUse?'':'disabled'}>병종 Q<kbd>Q</kbd></button>${engineButton}${disengage}${platformButton(selectedArmyId)}${hub}${recall}${star}${tactics}${state.moveOrders?.[selectedArmyId]?`<button data-menu="cancel-order">${UI_ICON('cancel')}이동 취소</button>`:''}<button data-menu="officer">${UI_ICON('info')}장수</button><button data-menu="close" class="close" title="닫기 (Esc)">${UI_ICON('cancel')}</button></div></div>`;
 for(const b of menu.querySelectorAll('[data-menu]'))if(judgments[b.dataset.menu]){b.dataset.judgment=judgments[b.dataset.menu];b.insertAdjacentHTML('beforeend',`<small class="c279-command-result">${esc(judgments[b.dataset.menu])}</small>`);}
 for(const [a,key] of Object.entries(ACTION_KEYS))menu.querySelector?.(`[data-menu="${a}"]`)?.insertAdjacentHTML?.('beforeend',`<kbd>${key}</kbd>`);
 [...(menu.querySelectorAll?.('[data-tactic]')??[])].slice(0,3).forEach((b,n)=>b.insertAdjacentHTML?.('beforeend',`<kbd>${n+1}</kbd>`));
}
$('#unit-menu').addEventListener('click',e=>{
 const action=e.target.closest('[data-menu]')?.dataset.menu;
 if(inputLocked())return;
 if(action==='troop-q'){c300BeginQ();return;}
 if(action==='engine'){c300QPick=null;openEngineAction();return;}
 if(action==='disengage'){
  const who=selectedArmyId,selectedState=state,publicView=view(state),options=publicView.ownArmies[who]?.disengage?.options??[];
  const panel=document.createElement('div');panel.className='c229-disengage';
  panel.innerHTML='<b>이탈 사격 — 방향 고르기</b><button data-c229-mode="PUSH"> 밀기</button><button data-c229-mode="RETREAT">물러나기</button><div class="c229-targets"></div><button data-c229-cancel>취소</button>';
  panel.addEventListener('click',e=>e.stopPropagation());panel.tabIndex=-1;panel.onkeydown=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();panel.remove();}};panel.querySelector('[data-c229-cancel]').onclick=()=>panel.remove();
  panel.querySelectorAll('[data-c229-mode]').forEach(b=>{b.disabled=!options.some(o=>o.mode===b.dataset.c229Mode);b.onclick=()=>{const targets=panel.querySelector('.c229-targets');targets.replaceChildren();for(const o of options.filter(o=>o.mode===b.dataset.c229Mode)){const target=document.createElement('button');const enemy=publicView.knowledge.observedArmies[o.targetId];target.textContent=`${publicView.officers[enemy?.commanderId]?.name??'맞닿은 적'} · ${enemy?.tileId??''}`;target.onclick=()=>{panel.remove();if(state!==selectedState){$('#status').textContent='상황이 바뀌었습니다 — 이탈 사격을 다시 고르세요.';return;}command({type:'DISENGAGE',armyId:who,targetId:o.targetId,mode:o.mode});};targets.append(target);}};});
  document.querySelector('.c229-disengage')?.remove();document.body.append(panel);panel.focus();return;
 }
 if(platformCommand(action))return;
 const tacticId=e.target.closest('[data-tactic]')?.dataset.tactic;
 if(action||tacticId){c300QPick=null;cancelStrike();}
 if(action||tacticId){clearTacticForecast();if(action)selectedTacticId=null;}
 if(tacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===tacticId);if(!card?.canUse){$('#status').textContent=card?tacticAvailability(card):'전법을 고르세요';return;}if(card.targets.length===1&&card.targets[0]===selectedArmyId){command({type:'USE_TACTIC',armyId:selectedArmyId,traitId:tacticId,targetId:selectedArmyId});return;}selectedTacticId=tacticId;menuOpen=false;moveMode=false;faceMode=false;attackMode=false;render();$('#status').textContent='전법 대상을 누르세요';return;}
 if(action==='cancel-order'){command({type:'CANCEL_MOVE',armyId:selectedArmyId});return;}
 if(selectedArmyIds.length>1&&['brace','wait'].includes(action)){const ids=[...selectedArmyIds];for(const armyId of ids)command({type:action==='brace'?'BRACE':'WAIT_UNIT',armyId});selectedArmyIds=[];return;}
 if(action==='brace'||action==='regroup'){command({type:action==='brace'?'BRACE':'REGROUP',armyId:selectedArmyId});return;}
 if(action==='recall'){command({type:'RECALL_UNIT',armyId:selectedArmyId});return;}
 if(action==='star'){command({type:'STAR_ACTION',armyId:selectedArmyId});return;}
 if(action==='garrison'){command({type:'GARRISON',armyId:selectedArmyId});return;}
 if(action==='hub'){command({type:'BUILD_HUB',armyId:selectedArmyId});return;}
 if(action==='officer'){selectedOfficerId=state.armies[selectedArmyId]?.commanderId??null;closeUnitMenu();renderOfficerCard();return;}
 if(action==='wait'){if(openSample4Pass(selectedArmyId))return;command({type:'WAIT_UNIT',armyId:selectedArmyId});return;}
 if(action==='move'){menuOpen=false;moveMode=true;render();const publicProbe=campaignTacticsWorld(state,campaignTacticsView(state,state.playerFactionId)),chase=publicProbe?previewDisengage(publicProbe,selectedArmyId):null,shot=destination&&publicProbe?previewApproachFire(publicProbe,selectedArmyId,destination):null;$('#status').textContent='이동할 칸을 누르세요'+(chase?` · 교전 이탈 시 추격 −${troopText(chase.dealt)}`:'')+(shot?` · 붙으면 접근사격 — ${(view(state).officers[view(state).knowledge.observedArmies[shot.archerId]?.commanderId]?.name??'보이는 궁병')}, 예상 −${troopText(shot.damage)}`:'');}
 if(action==='face'){menuOpen=false;moveMode=false;faceMode=true;render();$('#status').textContent='바라볼 쪽의 칸을 누르세요(Esc 취소)';return;}
 if(action==='attack'){attackMode=true;menuOpen=false;$('#unit-menu').hidden=true;$('#status').textContent='빨간 점선 공격 대상을 누르세요';renderHint();render();if(document.body?.classList?.contains('hud-band'))frameBandAttack(selectedArmyId);} // C158: wide 06 composition once on Attack; hover never reframes the map.
 if(action==='close')closeUnitMenu();
});
// 닿지 않는 적(부대·성)을 눌러도 공격한다 — 이번 차례에 칠 수 있는 자리까지 가서 바로 친다(문명식. 사용자 2026-10-11 "해당 타일에 공격할 수 있는 대상이 있으면 자동으로 공격")
let pendingStrike=null,strikeTimer=null;
// A growth choice pauses an already requested attack; it does not cancel it.
function cancelStrike(){clearTimeout(strikeTimer);strikeTimer=null;pendingStrike=null;}
function strikeNotice(p){return `다가가서 공격합니다 — ${p.via} 칸으로 이동 뒤 자동 공격`;}
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
 if(platformState(army)==='STOWED')return null;
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
 const army=state.armies[armyId];if(!army)return null;
 const stowed=platformState(army)==='STOWED',catapult=army.troopType==='catapult';
 if(stowed&&foe)return null;
 // A stowed platform previews movement only. Probe deployed legality without changing state.
 const occupied=new Set([...Object.values(v.ownArmies),...Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE')].filter(a=>a.armyId!==armyId).map(a=>a.tileId));
 const spots=foe?Object.keys(state.tiles).filter(t=>hexGap(t,tileId)===1):Object.keys(state.tiles).filter(t=>!occupied.has(t)&&(catapult?hexGap(t,city.tileId)<=C193.catapult.range:(city.footprint?.gates??[]).includes(t)||hexGap(t,city.tileId)===2)&&cityAttackTargets({...state,armies:{...state.armies,[armyId]:{...army,tileId:t,...(stowed?{platformState:'DEPLOYED'}:{})}}},armyId).includes(cityId));
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
 if(cityId&&state.cities[cityId]?.ownerFactionId!==state.armies[armyId]?.factionId&&platformState(state.armies[armyId])==='STOWED')target.deploymentReason=`투석기는 전개해야 칠 수 있음 — 성에서 ${C193.catapult.range}칸 안으로 옮긴 뒤 다음 차례 전개`;
 targetCache.set(key,target);return target;
}
function targetText(target){
 const id=target.targetId,name=state.officers[state.armies[id]?.commanderId]?.name??'적';
 return targetPreviewText(target,{name,guard:!!target.cityId&&!!id,wallBlocked:target.wallBlocked,damage:target.kind==='city'?previewCityAttack(state,selectedArmyId,target.cityId).dealt:0,ranged:troopToCampaign(state.armies[selectedArmyId]?.troopType)==='BT03',chase:target.kind==='strike'?previewDisengage(state,selectedArmyId):null});
}
// 최단 지형 경로 위의 관측한 장애물만 설명한다. 안개 속 부대는 읽지 않는다.
function routeFordTiles(route){
 const path=route?.pathTileIds??[],tiles=new Set();
 // v2/v3의 건널 수 있는 강 경계는 공개 지도 bridges에 있고 이동 규칙의 막힌 강 경계에서는 빠져 있다.
 const passages=new Set(['v2','v3'].includes(state.mapId)?(campaignMapModel(view(state)).bridges??[]).map(e=>[...e].sort().join('|')):[]);
 for(let i=1;i<path.length;i++){const edge=[path[i-1],path[i]].sort().join('|');if(passages.has(edge)||state.mapRules.crossings?.[edge]==='ford'&&state.mapRules.riverEdges.includes(edge)){tiles.add(path[i-1]);tiles.add(path[i]);}}
 return [...tiles];
}
// 칸 그림은 그대로 두고, 현재 경로가 실제 건너는 여울만 경로 층에 얹는다.
function renderRouteFords(svg,route){
 const geometry=routeFordTiles(route).flatMap(id=>{const hit=svg.querySelector(`[data-tile="${id}"]`);return hit?.getBBox?[{d:hit.getAttribute('d'),box:hit.getBBox()}]:[];});
 svg.querySelectorAll('.w-route-ford').forEach(n=>n.remove());
 for(const {d,box:b} of geometry){
  const x=b.x+b.width/2,y=b.y+b.height/2;
  const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.setAttribute('class','w-route-ford');layer.setAttribute('pointer-events','none');
  layer.innerHTML=`<path d="${d}" fill="#d6ba6638" stroke="#ffe1a1" stroke-width="2.5"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#fff0c5" stroke="#191713" stroke-width="3" paint-order="stroke" font-size="12">여울</text>`;
  svg.insertBefore(layer,svg.querySelector('.w-hits'));
 }
}
let moveDraft={state:null,armyId:null,points:[]};
function draftPoints(){
 if(moveDraft.state!==state||moveDraft.armyId!==selectedArmyId)moveDraft={state,armyId:selectedArmyId,points:[]};
 return moveDraft.points;
}
function movementPreview(to){
 const points=draftPoints(),start=state.armies[selectedArmyId]?.tileId;
 if(!points.length&&to===start)return {ok:true,pathTileIds:[start],totalTicks:0};
 return waypointRoute(state,selectedArmyId,[...points,...(to?[to]:[])]);
}
function sizeRouteWarnings(svg){
 if(!svg)return;
 const scale=Math.hypot(svg.getScreenCTM()?.a??1,svg.getScreenCTM()?.b??0)||1;
 for(const g of svg.querySelectorAll('.c279-path-risk,.c291-route-chip,.c291-route-warning')){const base=g.getAttribute('transform').split(' scale(')[0];g.setAttribute('transform',base+` scale(${1/scale})`);}
}
function routeRisks(route){
 if(!route?.ok||route.pathTileIds?.length<2)return [];
 const probe=campaignTacticsWorld(state,campaignTacticsView(state,state.playerFactionId));if(!probe)return [];
 const chase=previewDisengage(probe,selectedArmyId),shot=previewApproachFire(probe,selectedArmyId,route.pathTileIds.at(-1));
 return [...(chase?[{kind:'추격',loss:chase.dealt,tileId:route.pathTileIds[0]}]:[]),...(shot?[{kind:'접근사격',loss:shot.damage,tileId:route.pathTileIds.at(-1)}]:[])];
}
function routeExplanation(armyId,to,route){
 const result=armyId===selectedArmyId?movementPreview(to):waypointRoute(state,armyId,[to]);
 return result.ok?'이번 차례 이동 가능 · Shift+누르기: 경유 · Esc/우클릭: 하나 취소'+(routeFordTiles(result).length?' · 여울 건넘':''):playerText(result.reason);
}
function undoWaypoint(){
 if(!state||!selectedArmyId||!draftPoints().length)return false;
 draftPoints().pop();destination=draftPoints().at(-1)??null;drawMapPreview();$('#status').textContent='경유 칸 하나를 취소했습니다';return true;
}
function handleWaypointClick(e,to){
 if(!selectedArmyId||!moveMode||faceMode||attackMode||selectedTacticId)return false;
 const points=draftPoints();
 if(!(e.shiftKey||e.altKey||points.length))return false;
 const preview=movementPreview(to);destination=to;
 if(typeof follow==='function')follow(selectedArmyId,true,null,to);
 if(!preview.ok){$('#status').textContent=playerText(preview.reason);drawMapPreview();return true;}
 if(e.shiftKey||e.altKey){if(points.at(-1)!==to)points.push(to);$('#status').textContent='경유 '+points.length+' · 마지막 칸을 누르면 출발 · Esc/우클릭: 하나 취소';drawMapPreview();return true;}
 command({type:'MOVE_UNIT',armyId:selectedArmyId,destinationTileId:to,path:preview.pathTileIds});return true;
}
// C137: normal archers cannot satisfy the gate AND ranged-distance conditions in cityAttackTargets.
function cityAttackExplanation(armyId,cityId){
 const a=state.armies[armyId],c=state.cities[cityId];if(!a||!c||c.ownerFactionId===a.factionId||cityAttackTargets(state,armyId).includes(cityId))return '';
 const treaty=diplomacyAttackReason(state,armyId,cityId);if(treaty)return treaty;
 if(archerAttackReason(state,armyId))return '붙어 있는 적 때문에 사격할 수 없습니다';
 if(!canMainAction(state,armyId))return '이번 차례 주 행동을 이미 썼습니다';
 if(platformAttackReason(state,armyId))return `투석기는 전개해야 칠 수 있음 — 성에서 ${C193.catapult.range}칸 안으로 옮긴 뒤 다음 차례 전개`;
 if(troopToCampaign(a.troopType)==='BT03'&&a.troopType!=='catapult'&&!hasCampaignRule(state,armyId,'SIEGE_FROM_WALL'))return '원거리 병종은 일반 성 공격 불가 — 공성 전법이나 다른 병종을 사용하십시오';
 if(a.troopType==='catapult'&&hexGap(a.tileId,c.tileId)>attackRange(a,state))return `성 공격 사거리 밖입니다 — 전개한 투석기는 성 중심에서 ${attackRange(a,state)}칸`;
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
 if(target.kind==='strike'){command({type:'MOVE_UNIT',armyId:who,destinationTileId:target.via});if(state.armies[who]?.tileId===target.via){pendingStrike={...target,armyId:who,turn:state.turn};attackMode=false;$('#attack-preview').hidden=true;document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));setCommandIntent(strikeNotice(pendingStrike));$('#status').textContent=strikeNotice(pendingStrike);renderHint();follow(who,true);scheduleStrike();if(pendingCampaignDraft(state))renderGrowthDraft();}return;}
 if(!orderEligible(state,who)){$('#status').textContent=selectedActions(who).reason;return;}
 command({type:'QUEUE_MOVE',armyIds:[who],destinationTileId:target.via});$('#status').textContent=target.deploymentReason||'칠 수 있는 자리로 갑니다. 닿으면 다시 눌러 공격하세요.';
}
// C137: cycling an enemy inspects it first; the explicit button attacks the chosen unit.
function renderOverlapChoices(v){
 let panel=$('#c266-overlap');
 if(!panel){panel=document.createElement('nav');panel.id='c266-overlap';panel.setAttribute('aria-label','겹친 부대 고르기');document.body.append(panel);
  panel.addEventListener('click',e=>{const id=e.target.closest('[data-c266-unit]')?.dataset.c266Unit;if(!id||inputLocked()||!view(state).ownArmies[id])return;e.stopPropagation();selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;selectedTacticId=null;attackMode=false;render();follow(id,true,null,null,true);});}
 const ids=overlapPick?.count>1?overlapPick.key.split('|'):[];
 panel.hidden=!ids.length;if(panel.hidden)return;
 panel.innerHTML='<b>겹친 부대 고르기</b>'+ids.map(id=>{const a=v.ownArmies[id]??v.knowledge.observedArmies[id];if(!a)return '';return `<button data-c266-unit="${esc(id)}" ${v.ownArmies[id]?'':'disabled'} aria-pressed="${id===selectedArmyId}">${esc(v.officers[a.commanderId]?.name??'관측한 부대')} · ${forecastPublic(a)} · ${troopText(a.troopCount??a.shownTroopCount??0)}</button>`;}).join('');
}
function publicFacingLabel(v,target,tile,side){
 if(side==='FRONT')return '정면';
 const known={...v.knowledge.observedArmies,...v.ownArmies},source=Object.values(known).find(a=>a.factionId!==target.factionId&&(v.ownArmies[a.armyId]||v.knowledge.tiles[a.tileId]==='VISIBLE'));
 if(!source)return side==='REAR'?'뒤':'옆';
 const probe=structuredClone(state);probe.armies[source.armyId].tileId=tile;
 try{const p=previewAttackThreat(probe,source.armyId,target.armyId),n=Math.round(((p.multipliers?.side??1)-1)*100);return (side==='REAR'?'뒤':'옆')+(n?' +'+n+'%':'');}catch{return side==='REAR'?'뒤':'옆';}
}
function renderCombatAdvantages(v){
 if(!selectedArmyId||!attackMode||combatAnimating||mapLabelDetail(zoom)==='far')return;
 for(const id of attackTargets(state,selectedArmyId)){
  const p=previewAttack(state,selectedArmyId,id),m=p.multipliers?.matchup;if(!m||m===1)continue;
  const node=$('#map').querySelector(`[data-unit="${id}"] .plate-top`);if(!node)continue;
  const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('class','c266-advantage');t.setAttribute('x','48');t.setAttribute('y','-12');t.textContent=m>1?'▲':'▼';node.append(t);
 }
}
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
document.addEventListener('click',e=>{if(e.target.closest?.('[data-tactic-confirm]'))confirmTacticForecast();if(e.target.closest?.('[data-tactic-cancel]'))cancelKitForecast362();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pendingAttack){e.preventDefault();e.stopImmediatePropagation();cancelAttackConfirmation();$('#status').textContent='공격을 취소했습니다';}});
// Shared by hover, portrait clicks and tile clicks, including units on a city centre.
function clearTacticForecast(){
 const hadForecast462=!!(tacticForecast||bandPreviewPointer);
 tacticForecast=null;bandPreviewPointer=null;$('#attack-preview').hidden=true;
 document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));
 const band=document.querySelector('.nb-band');if(band)delete band.dataset.target;
 if(hadForecast462&&state?.trialRules?.mechanics==='v2')drawMapPreview();
}
function tacticTargetAt(tileId,unitId,cityId){
 const v=view(state),card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);
 if(tileTactic418(card)&&card.targets.includes(tileId))return tileId;
 const armies={...v.ownArmies,...Object.fromEntries(Object.entries(v.knowledge.observedArmies).filter(([,a])=>v.knowledge.tiles[a.tileId]==='VISIBLE'))};
 if(unitId&&armies[unitId]?.tileId===tileId)return unitId;
 return card?.targets.find(id=>armies[id]?.tileId===tileId)
  ??card?.targets.find(id=>(v.ownCities[id]??v.knowledge.cities[id])?.tileId===tileId)
  ??Object.values(armies).find(a=>a.tileId===tileId)?.armyId
  ??cityId??Object.values({...v.knowledge.cities,...v.ownCities}).find(c=>c.tileId===tileId)?.cityId;
}
function prepareTacticForecast(targetId){
 const request=Object.freeze({type:'USE_TACTIC',armyId:selectedArmyId,traitId:selectedTacticId,targetId});
 const card=campaignTactics(state,request.armyId).find(c=>c.traitId===request.traitId),v=view(state);
 const a=v.ownArmies[targetId]??(v.knowledge.tiles[v.knowledge.observedArmies[targetId]?.tileId]==='VISIBLE'?v.knowledge.observedArmies[targetId]:null);
 const c=v.ownCities[targetId]??v.knowledge.cities[targetId];
 const tile=tileTactic418(card)&&card.targets.includes(targetId)&&v.knowledge.tiles[targetId]==='VISIBLE';
 const label=tile?`전법 · ${card.name} → 칸 ${targetId}`:`전법 · ${card?.name??'장착 전법 없음'} → ${a?'부대':'성'} · ${a?(state.officers[a.commanderId]?.name??'관측한 부대'):(c?.name??'대상 없음')}`;
 let reason=tacticFailureReason(state,request.armyId,request.traitId,targetId),preview=null;
 if(!a&&!c&&!tile)reason='관측한 대상을 다시 고르세요.';
 if(!reason)try{preview=previewTactic(state,request.armyId,request.traitId,targetId);if(tile)preview={...preview,effectOnly:true};}catch(error){reason=errorText(error);}
 return {state,request,preview,reason,label};
}
function tacticForecastHtml(f){
 const fire=!f.reason&&f.preview?.fire,o=view(state).officers[state.armies[selectedArmyId]?.commanderId];
 const card=campaignTactics(state,f.request.armyId).find(c=>c.traitId===f.request.traitId),cost=globalThis.document?.documentElement?.dataset.ui==='kit'&&Number.isFinite(card?.gaugeCost)?`<p class="c292-tactic-cost">게이지 ${card.gauge} → ${Math.max(0,card.gauge-card.gaugeCost)} · 비용 ${card.gaugeCost}</p>`:'';
 const comparison=!f.reason&&f.preview&&state.armies[f.request.targetId]&&typeof forecastHtml==='function'?forecastHtml(f.request.armyId,f.request.targetId,f.preview):'';
 const affected=f.preview?.targetLosses?.filter(r=>r.loss>0)??[],friendly=affected.some(r=>view(state).ownArmies[r.targetId]),fireTurns=f.preview?.fire&&card?.effects?.some(e=>e.rule==='FIRE_ATTACK')?C182.fire.turns:null;
 const summary=globalThis.document?.documentElement?.dataset.ui==='kit'?`<p class="c292-effects-summary">${affected.length?`피해 대상 ${affected.length}부대${friendly?' · ⚠ 아군 포함':''}`:'대상·효과는 계산 근거 참조'}${fireTurns?` · 불 ${fireTurns}차례 · 진입 불가`:''}</p>`:'';
 const details=globalThis.document?.documentElement?.dataset.ui==='kit'?`<section class="c292-tactic-effects">${(f.preview?.effectLines??[]).map(line=>`<p>${esc(line)}</p>`).join('')}</section>`:'';
 return `${cost}${summary}${details}${comparison}${comparison?'<nav class="c266-tactic-switch"><button data-c266-normal>보통 공격으로</button></nav>':''}${fire?`<p class="c248-executor"><img src="${esc(faceOf(o?.officerId)??'')}" alt="실행 장수">${esc(o?.name)} · 지략 ${esc(o?.baseStats?.intelligence??'?')}</p>${globalThis.document?.documentElement?.dataset.ui==='kit'?'':outcomeOddsHtml({chance:100})}`:''}<p class="fc-command">${esc(f.label)}</p>${f.reason?`<p class="fc-risk">${esc(f.reason)}</p>`:''}<button type="button" class="fc-tactic-confirm" data-tactic-confirm ${f.reason?'disabled style="opacity:.45"':''} title="${esc(f.reason||f.label)}">전법 확정</button>`;
}
function confirmTacticForecast(){
 const f=tacticForecast;if(!f||inputLocked())return;
 if(f.state!==state||f.request.armyId!==selectedArmyId||f.request.traitId!==selectedTacticId){tacticForecast=null;$('#status').textContent='대상이 바뀌었습니다 — 전법 예고를 다시 확인하세요.';return;}
 const current=prepareTacticForecast(f.request.targetId);
 if(current.reason){tacticForecast=current;$('#status').textContent=current.reason;return;}
 tacticForecast=null;command({...f.request});
}
function mapClick(e){
 if(!state||state.gameResult||inputLocked())return;
 if(typeof enginePicker462!=='undefined'&&enginePicker462){pickEngineMap462(e);return;}
 cancelStrike();
 const prodCity=e.target.closest?.('[data-prod-city]')?.dataset.prodCity;if(!selectedArmyId&&prodCity&&state.cities[prodCity]?.ownerFactionId===state.playerFactionId&&openProdPop(prodCity,e,reasonText))return;
 closeProdPop();
 const tileId=targetTile(e.target,state.armies,state.cities);if(!tileId){if(globalThis.document?.body?.classList?.contains('hud-band')&&menuOpen)closeUnitMenu();return;}
 if(typeof c300QCard==='function'&&c300QCard()){const card=c300QCard();if(card.canUse&&card.targets?.some(t=>c300QTile(t)===tileId)){const armyId=selectedArmyId;c300QPick=null;clearTacticForecast();command({type:'USE_TROOP_Q',armyId,targetTileId:tileId});}return;}
 if((e.altKey||e.shiftKey&&!e.target.closest?.('[data-unit]')||moveDraft.state===state&&moveDraft.armyId===selectedArmyId&&moveDraft.points.length)&&handleWaypointClick(e,tileId))return;
 // 이름표를 누르면 그 부대, 칸(병사 그림)을 누르면 그 칸의 내 부대를 차례로
 const v=view(state),own=Object.values(v.ownArmies),plateUnit=e.target.closest?.('[data-unit]')?.dataset.unit;
 const selectable=[...own,...Object.values(v.knowledge?.observedArmies??{}).filter(a=>a.factionId!==state.playerFactionId&&v.knowledge.tiles[a.tileId]==='VISIBLE')];
 const rects=[...($('#map').querySelectorAll?.('g.w-unit[data-unit],.plate-top[data-unit]')??[])].filter(n=>selectable.some(a=>a.armyId===n.dataset.unit)).map(n=>({id:n.dataset.unit,...(()=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()}));
 let pick=overlapSelection(selectable,tileId,{x:e.clientX,y:e.clientY},rects,overlapPick);
 inspectedArmyId=plateUnit??pick.id??null;
 // 초상(이름표)을 직접 눌렀으면 겹친 묶음의 첫 순서는 그 부대다(닷토리 B15: 적 허저의 초상을 눌렀는데 아군 감녕이 선택됨 — 묶음이 이름순이라 첫째가 아군이었다). 같은 자리를 다시 누르면 다음으로 넘어간다
 {const fresh=!overlapPick||overlapPick.key!==pick.key||Math.hypot(e.clientX-overlapPick.x,e.clientY-overlapPick.y)>8,i=pick.key.split('|').indexOf(plateUnit);if(fresh&&plateUnit&&pick.count>1&&i>=0)pick={...pick,id:plateUnit,index:i};}
 const id=plateUnit&&own.some(a=>a.armyId===plateUnit)?plateUnit:pick.count>1?(own.some(a=>a.armyId===pick.id)?pick.id:null):cycleTileUnit(own,tileId,selectedArmyId);
 overlapPick=pick.count>1?pick:null;
 const cityHit=!!e.target.closest?.('[data-city]');
 const cityId=e.target.closest?.('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===tileId)?.cityId;
 const target=selectedArmyId?mapTarget(selectedArmyId,tileId,cityId):null;
 const enemy=target?.kind==='unit'?target.targetId:null;
 if(faceMode&&selectedArmyId){const a=state.armies[selectedArmyId];if(tileId!==a.tileId){faceMode=false;command({type:'FACE',armyId:selectedArmyId,facing:directionToward(state.tiles[a.tileId],state.tiles[tileId],a.facing)});}return;}
 if(selectedArmyId&&selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);const target=tacticTargetAt(tileId,plateUnit,cityId);if(target&&card?.targets.includes(target)){tacticForecast=prepareTacticForecast(target);confirmTacticForecast();return;}
  if(target){const why=tacticFailureReason(state,selectedArmyId,selectedTacticId,target);if(why){$('#status').textContent=reasonText(why);return;}}
  if(tileTactic418(card)){$('#status').textContent=`${card.name} — 표시된 칸 ${card.targets.length}곳 중 하나를 고르세요 · Esc 취소`;return;}
  // 쓸 수 없는 칸을 누르면 아무 일도 없던 것(닷토리 새 판 11회차 '힘껏 베기') — 쓸 수 있는 대상을 이름으로 알려 준다
  const names=(card?.targets??[]).map(id=>state.cities[id]?.name??view(state).officers?.[state.armies[id]?.commanderId]?.name).filter(Boolean);
  $('#status').textContent=`${card?.name??'전법'} — 그 칸에는 쓸 수 없습니다. 쓸 수 있는 대상(붉게 표시): ${names.length?names.join(' · '):'지금은 없음'} · Esc 취소`;return;}
 if(id&&own.some(a=>a.armyId===id&&a.tileId===tileId)&&!attackMode&&!faceMode&&!selectedTacticId&&!e.shiftKey&&!cityHit&&(!plateUnit||own.some(a=>a.armyId===plateUnit))){selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;destination=null;render();follow(id,true,null,null,true);if(pick.count>1)$('#status').textContent=`겹친 부대 ${pick.index+1}/${pick.count} · 다시 누르면 다음`;worldSfx.play('select');voice.say(state.armies[id]?.commanderId,'select');return;}
 // 예고가 뜬 대상은 누르면 실행된다(닷토리 새 판 9 · 11 · 12회차: 피해 예고가 떴는데 누르면 겹친 초상만 바뀌었다) — 누른 칸의 적을 바로 칠 수 있으면 겹친 초상 순환보다 공격이 먼저. 이름표를 직접 누른 경우는 그대로 둔다
 // 적의 초상(이름표)을 직접 눌렀고 그 적을 지금 칠 수 있으면 그 적을 친다 — 겹친 초상 넘기기보다 먼저(닷토리 B14 · B15: 피해 예고가 뜬 초상을 눌러도 실행되지 않고 성 이름을 눌러야 됐다)
 if(selectedArmyId&&!e.shiftKey&&plateUnit&&!own.some(a=>a.armyId===plateUnit)&&attackTargets(state,selectedArmyId).includes(plateUnit)){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:plateUnit});return;}
 if(selectedArmyId&&!e.shiftKey&&!plateUnit&&target?.kind==='unit'&&target.targetId){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:target.targetId});return;}
 if(plateUnit&&!own.some(a=>a.armyId===plateUnit)&&!selectedArmyId){render();$('#status').textContent='관측한 적 · 옆 +15% / 뒤 +30% · 성 안 수비와 특기로 보너스가 달라질 수 있음';return;}
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
 if(id){selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;destination=null;render();follow(id,true,null,null,true);if(pick.count>1)$('#status').textContent=`겹친 부대 ${pick.index+1}/${pick.count} · 다시 누르면 다음`;worldSfx.play('select');voice.say(state.armies[id]?.commanderId,'select');return;}
 if(selectedArmyId&&enemy){command({type:'ATTACK_UNIT',armyId:selectedArmyId,targetId:enemy});return;}
 if(selectedArmyId&&cityId&&cityAttackTargets(state,selectedArmyId).includes(cityId)){command({type:'ATTACK_CITY',armyId:selectedArmyId,cityId});return;}
 if(selectedArmyId&&orderRoute(state,selectedArmyId,tileId)){command({type:'QUEUE_MOVE',armyIds:selectedArmyIds.length?selectedArmyIds:[selectedArmyId],destinationTileId:tileId});return;}
 if(cityId){if(view(state).ownCities[cityId]&&(!e.target.closest?.('[data-tile]')||document.body?.classList?.contains?.('ink-hud'))){closeUnitMenu();openStage(cityId);return;}if(selectedCityId!==cityId)cityTab=null;selectedCityId=cityId;closeUnitMenu();renderCityPanel(view(state));return;}
 if(selectedArmyId&&moveMode){$('#status').textContent=routeExplanation(selectedArmyId,tileId,null);return;}
 if(menuOpen)closeUnitMenu();
}
function c190MapClick(e){
 if(typeof enginePicker462!=='undefined'&&enginePicker462){mapClick(e);return;}
 const memoryTile=e.target.closest?.('[data-memory-tile]')?.dataset.memoryTile;
 if(memoryTile){destination=memoryTile;const status=e.currentTarget?.ownerDocument?.getElementById('status');if(status)status.textContent='기억한 위치 · 현재 적 위치는 알 수 없습니다';return;}
 if(typeof stratagemUi!=='undefined'&&stratagemUi){chooseStratagemTarget(e);return;}
 if(!state||state.gameResult||inputLocked())return;
 const tile=targetTile(e.target,state.armies,state.cities),city=e.target.closest?.('[data-city]')?.dataset.city??Object.values(view(state).ownCities).find(c=>c.tileId===tile)?.cityId;
 // City quick routing must not consume a unit click on the same tile.
 if(!e.target.closest?.('[data-unit]')?.dataset.unit&&cityQuickIntent(selectedArmyId,city)==='quick'&&openCityQuick(city))return;
 closeCityQuick();mapClick(e);
}
$('#map').addEventListener('click',e=>{if(suppressPanClick){suppressPanClick=false;e.preventDefault();return;}c190MapClick(e);});
$('#map').addEventListener('pointerover',function mapPointerOver(e){
 if(typeof enginePicker462!=='undefined'&&enginePicker462)return;
 if(e.target.closest?.('[data-memory-tile]'))return;
 if(typeof pendingStrike!=='undefined'&&pendingStrike){$('#status').textContent=strikeNotice(pendingStrike);renderHint();return;}
 if(panGesture||inputLocked())return;
 if((infoLens==='danger'||dangerMode)&&selectedArmyId&&!attackMode&&!selectedTacticId){
  const id=e.target.closest?.('[data-unit]')?.dataset.unit,v=view(state),enemy=v.knowledge.observedArmies[id];
  if(enemy&&v.knowledge.tiles[enemy.tileId]==='VISIBLE'&&enemy.factionId!==v.factionId)try{const p=previewAttackThreat(state,id,selectedArmyId);const tip=$('#attack-preview');tip.classList.remove('forecast');tip.textContent=`내게 오면 −${troopText(p.enemyLoss)}`;tip.hidden=false;placeTip(tip,e);return;}catch{}
 }
 if(!selectedArmyId)return;
 if(globalThis.document?.body?.classList?.contains('hud-band')&&bandPreviewPointer&&document.querySelector('.nb-band')?.dataset.state==='forecast'&&e.clientX===bandPreviewPointer.x&&e.clientY===bandPreviewPointer.y)return;
 clearMapLosses();
 const hoverTile=targetTile(e.target,state.armies,state.cities);
 if(c300QPreview(hoverTile,e))return;
 let unit=e.target.closest('[data-unit]')?.dataset.unit??attackTargets(state,selectedArmyId).find(id=>state.armies[id].tileId===hoverTile);
 const tip=$('#attack-preview');
 if(document.documentElement.dataset.ui==='kit'&&moveMode&&!attackMode&&!selectedTacticId&&unit){
  const v=view(state),foe=campaignMapModel(v).units.find(u=>u.id===unit&&u.enemy&&v.knowledge.tiles[u.tileId]==='VISIBLE');
  if(foe){document.dispatchEvent(new CustomEvent('ink:foe',{detail:{name:foe.name,face:faceOf(foe.officerId??v.knowledge.observedArmies[unit]?.commanderId),bars:[{pct:100,text:`병력 ${troopText(foe.count)}`},{pct:100,text:`사기 ${MORALE_NAME[foe.morale]??foe.morale??'—'}`}]}}));return;}
 }
 if(document.documentElement.dataset.ui==='kit')document.dispatchEvent(new CustomEvent('ink:foe',{detail:null}));
 if(selectedTacticId){
  const c=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);
  const target=tacticTargetAt(hoverTile,e.target.closest('[data-unit]')?.dataset.unit,e.target.closest('[data-city]')?.dataset.city);
  if(!target||!c){tacticForecast=null;tip.hidden=true;document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));if(c?.pilot)drawMapPreview();return;}
  const f=prepareTacticForecast(target);
  if(f.reason){setTip(tip,tacticForecastHtml(f),f.reason);tacticForecast=f;if(c.pilot)drawMapPreview();tip.hidden=false;placeTip(tip,e);return;}
  try{const p=f.preview,title=`전법 · ${abilityName356(c)}`,effects=(p.effectLines??[]).map(x=>`<li>${esc(x)}</li>`).join('');
   const cityRisk=p.cityId?surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===state.cities[p.cityId]?.ownerFactionId)?.attackWarning):'';
   const html=p.cityId?`<div class="fc-top"><span class="fc-title">${esc(title)} · ${esc(cityLabel(p.cityId))}</span></div><p class="fc-sum">내구 −${p.dealt}</p><small class="fc-dur">내구 ${state.cities[p.cityId].durability} → <em>${Math.max(0,state.cities[p.cityId].durability-p.dealt)}</em></small>${cityRisk?`<p class="fc-risk">${esc(cityRisk)}</p>`:''}${cityCaptureThreatHtml(view(state),p.cityId)}`:p.effectOnly?`<div class="fc-top"><span class="fc-title">${esc(title)}</span></div>`:forecastHtml(selectedArmyId,target,p,title);
   const v=view(state),names=Object.fromEntries(campaignMapModel(v).units.map(a=>[a.id,a.name]));
   const scales=Object.fromEntries(Object.values(v.knowledge.observedArmies).filter(a=>v.knowledge.tiles[a.tileId]==='VISIBLE').map(a=>[a.armyId,campaignShownScale(state,a.armyId,v.factionId)]));
   setTip(tip,`<p class="fc-sum">${esc(tacticChangeText({...p,attackerId:selectedArmyId,targetId:target},{name:abilityName356(c),names,ownIds:Object.keys(v.ownArmies),preview:true}))}</p>`+html+((p.cityId||p.effectOnly)&&effects?`<ul class="fc-mods">${effects}</ul>`:'')+tacticTargetsHtml(p,v,names,scales)+tacticForecastHtml(f),p.cityId?`내구 −${p.dealt}`:title);tacticForecast=f;if(c.pilot)drawMapPreview();
  }catch(error){setTip(tip,`<p class="fc-sum">${esc(errorText(error))}</p>`,errorText(error));}
  tip.hidden=false;placeTip(tip,e);return;
 }
 const cityId=e.target.closest('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===hoverTile)?.cityId;
 const target=mapTarget(selectedArmyId,hoverTile,cityId);
 if(target.kind==='unit')unit=target.targetId;
 if(['strike','approach'].includes(target.kind)){
  const route=orderRoute(state,selectedArmyId,target.via),text=targetText(target);
  if(destination!==target.via){destination=target.via;drawMap(null,true);}
  setTip(tip,`<p class="fc-sum">${esc(text)}</p>${route?`<small>${routeTurns(state,selectedArmyId,route)}차례 · ${esc(routeExplanation(selectedArmyId,target.via,route))}</small>`:''}`,text);tip.hidden=false;placeTip(tip,e);return;
 }
 if(target.kind==='city'){
  const p=previewCityAttack(state,selectedArmyId,cityId);showMapLosses(cityId,p,true);const diploWarn=surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===state.cities[cityId]?.ownerFactionId)?.attackWarning);setTip(tip,`<div class="fc-top"><span class="fc-title">성벽 공격 · ${esc(cityLabel(cityId))}</span><span class="fc-res" data-res="${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'win':'even'}">${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)<=0?'내구 0':'공성'}</span></div><p class="fc-sum">내구 −${p.dealt}</p>${diploWarn?`<p class="fc-risk">${esc(diploWarn)}</p>`:''}<div class="fc-bar wide"><i style="width:${(Math.max(0,(state.cities[cityId].durability??0)-p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></i><s style="width:${(Math.min(state.cities[cityId].durability??0,p.dealt)/Math.max(1,state.cities[cityId].durabilityMax??1)*100).toFixed(1)}%"></s></div><small class="fc-dur">내구 ${state.cities[cityId].durability??0} → <em>${Math.max(0,(state.cities[cityId].durability??0)-p.dealt)}</em></small>${cityCaptureThreatHtml(view(state),cityId)}${p.effectLines.length?`<ul class="fc-mods">${combatEffectLines(p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`,`내구 −${p.dealt}`+(p.effectLines.length?' · '+p.effectLines.join(' · '):''));tip.hidden=false;
  placeTip(tip,e);return;
 }
 if(unit&&attackTargets(state,selectedArmyId).includes(unit)){
  const p=previewAttack(state,selectedArmyId,unit),m=p.multipliers;
  if(isPrologue(state)&&unit===state.prologue.defenderId)state=observePrologue(state,{preview:true,flank:p.side==='FLANK'});
  {const hs={tile:state.armies[unit].tileId,side:p.side,label:(p.side==='REAR'?'뒤':p.side==='FLANK'?'옆':'정면')+(p.multipliers?.side>1?' +'+Math.round((p.multipliers.side-1)*100)+'%':'')};if(hoverSide?.tile!==hs.tile||hoverSide?.side!==hs.side){hoverSide=hs;drawMap(null,true);}}
  showMapLosses(unit,p);
  setTip(tip,`<p class="fc-sum">${esc(targetText(target))}</p>`+forecastHtml(selectedArmyId,unit,p),`아군 −${troopText(p.allyLoss)} / 적 −${troopText(p.enemyLoss)}`+
   (m.terrain!==1?` · ${state.tiles[state.armies[unit].tileId].terrainType==='forest'?'숲':'언덕'} 방어 ×${m.terrain}`:'')+
   (m.castle!==1?` · 성 방어 ×${m.castle}`:'')+(m.matchup!==1?` · 상성 ${m.matchup<1?'불리':'유리'} ×${m.matchup}`:'')+(m.river!==1?' · 도하 ×0.75':'')+(m.flank!==1?` · 협공 +${Math.round((m.flank-1)*100)}%`:'')+(p.effectLines.length?' · '+p.effectLines.join(' · '):'')+
   (p.formationRisk?.check?' · 적 전열을 무너뜨림':'')+(p.moraleRisk?.check?` · 적 사기가 떨어질 수 있음(${chanceText462(1-p.moraleRisk.successProbability)})`:''));
  {const T=state.armies[unit],mx=T?.maxTroopCount??T?.troopCount??0,shown=p.shownTargetCount??T?.troopCount??0; // 흑묵 적 장수 판(기준 final-battle 오른쪽 위) — 보이는 병력·사기·전열만
   document.dispatchEvent?.(new CustomEvent('ink:foe',{detail:{name:state.officers[T?.commanderId]?.name??'적',face:faceOf(T?.commanderId),bars:[{pct:mx?Math.min(100,shown/mx*100):100,text:troopText(shown),title:'보이는 병력'},{pct:{STEADY:100,SHAKEN:50,ROUTING:12}[T?.morale]??100,text:[MORALE_NAME[T?.morale??'STEADY'],FORMATION_NAME[T?.formation]?`전열 ${FORMATION_NAME[T.formation]}`:''].filter(Boolean).join(' · '),title:'사기 · 전열'}]}}));}
  tip.hidden=false;placeTip(tip,e);return;
 }
 if(cityId&&target.targetId){const text=targetText(target),risk=surpriseWarning(view(state).diplomacy?.factions?.find(f=>f.factionId===(state.armies[target.targetId]?.factionId??state.cities[cityId]?.ownerFactionId))?.attackWarning);setTip(tip,`<p class="fc-sum">${esc(text)}</p>${risk?`<p class="fc-risk">${esc(risk)}</p>`:''}`,text);tip.hidden=false;placeTip(tip,e);return;}
 tip.hidden=true;tip.classList?.remove?.('forecast');if(hoverSide){hoverSide=null;drawMap(null,true);}
 const id=hoverTile;
 if(cityId&&view(state).ownCities[cityId]&&state.armies[selectedArmyId]?.tileId===hoverTile){const why=garrisonReason(state,selectedArmyId);tip.textContent=commandIntentText({kind:'move'},{name:view(state).ownCities[cityId].name,ownCity:true,atCity:true,blocked:why?reasonText(why):''});tip.hidden=false;placeTip(tip,e);return;}
 if(moveMode&&id){
  // Commands replace state; selection and tile changes also invalidate this entry.
  let cached=mapPointerOver.movePreview;
  if(!cached||cached.state!==state||cached.armyId!==selectedArmyId||cached.tileId!==id){
   const route=orderEligible(state,selectedArmyId)?orderRoute(state,selectedArmyId,id):null;
   const publicProbe=campaignTacticsWorld(state,campaignTacticsView(state,state.playerFactionId));
   cached=mapPointerOver.movePreview={state,armyId:selectedArmyId,tileId:id,route,chase:publicProbe?previewDisengage(publicProbe,selectedArmyId):null,shot:route&&publicProbe?previewApproachFire(publicProbe,selectedArmyId,id):null};
  }
  // C169b: 병력은 보이는 숫자(troopText), C171: 까닭 글은 routeExplanation 하나가 만듦
  const {route,chase,shot}=cached,warning=shot?` · 붙으면 접근사격 — ${(view(state).officers[view(state).knowledge.observedArmies[shot.archerId]?.commanderId]?.name??'보이는 궁병')}, 예상 −${troopText(shot.damage)}`:'';$('#status').textContent='이동할 칸을 누르세요'+(chase?` · 교전 이탈 시 추격 −${troopText(chase.dealt)}`:'')+warning;tip.textContent=routeExplanation(selectedArmyId,id,route)+warning;tip.hidden=document.body.classList.contains('hud-band')&&!route;if(!tip.hidden)placeTip(tip,e);}
 if(moveMode&&id&&id!==destination){destination=id;drawMap(null,true);}
});
// C138: presentation listener is separate from the existing preview/click handler.
$('#map').addEventListener('pointerover',e=>{
 if(panGesture||inputLocked())return;
 if((infoLens==='danger'||dangerMode)&&selectedArmyId&&!attackMode&&!selectedTacticId){
  const id=e.target.closest?.('[data-unit]')?.dataset.unit,v=view(state),enemy=v.knowledge.observedArmies[id];
  if(enemy&&v.knowledge.tiles[enemy.tileId]==='VISIBLE'&&enemy.factionId!==v.factionId)try{const p=previewAttackThreat(state,id,selectedArmyId);const tip=$('#attack-preview');tip.classList.remove('forecast');tip.textContent=`내게 오면 −${troopText(p.enemyLoss)}`;tip.hidden=false;placeTip(tip,e);return;}catch{}
 }
 if(!selectedArmyId)return;
 const tile=targetTile(e.target,state.armies,state.cities),city=e.target.closest('[data-city]')?.dataset.city??Object.values(state.cities).find(c=>c.tileId===tile)?.cityId;
 showCommandIntent(tile,city);
 if(moveMode&&tile&&orderEligible(state,selectedArmyId)){
  const target=mapTarget(selectedArmyId,tile,city),to=['strike','approach'].includes(target.kind)?target.via:tile;
  if(routeFordTiles(orderRoute(state,selectedArmyId,to)).length){
   if(commandIntent&&!commandIntent.includes('여울 건넘'))setCommandIntent(commandIntent+' · 여울 건넘');
   const tip=$('#attack-preview');if(!tip.hidden&&!tip.textContent.includes('여울 건넘')){const note=document.createElement('p');note.textContent='여울 건넘 — 표시된 건널목을 지나는 실제 이동 경로';tip.append(note);placeTip(tip,e);}
   if(!$('#status').textContent.includes('여울 건넘'))$('#status').textContent+=' · 여울 건넘';
  }
 }
});
$('#map').addEventListener('pointerleave',e=>{if(document.documentElement.dataset.ui==='kit')document.dispatchEvent(new CustomEvent('ink:foe',{detail:null}));clearMapLosses();if(e.relatedTarget?.closest?.('#attack-preview')&&$('#c216-swap'))return;setCommandIntent('');if(document.body?.classList?.contains('hud-band')&&(e.relatedTarget?.closest?.('#attack-preview,.c352-card')||(e.relatedTarget?.closest?.('.nb-band')&&document.querySelector('.nb-band')?.dataset.state==='forecast')))return;$('#attack-preview').hidden=true;document.dispatchEvent(new CustomEvent('ink:forecast',{detail:null}));if(hoverSide){hoverSide=null;if(state)drawMap(null,true);}});
$('#cancel-move').addEventListener('click',closeUnitMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(undoWaypoint()){e.preventDefault();e.stopImmediatePropagation();return;}cancelStrike();if(!$('#officer-modal').hidden){c295OfficerTrail.length=0;selectedOfficerId=null;$('#officer-modal').hidden=true;e.stopImmediatePropagation();return;} /* 장수 정보 창은 Esc 로 닫힌다(2026-10-12 — 닫기 단추로만 닫혀 다음 차례 단추를 가린 채 남았다) */ if(state&&pendingCampaignDraft(state))renderGrowthDraft();if(stage.city){e.stopImmediatePropagation();if(stage.opening)closeStage();else if(stage.fac==='office'&&document.documentElement?.dataset?.ui==='kit'){if(naejeongUi.jobs||naejeongUi.department||naejeongUi.transferOfficer||naejeongUi.policy||naejeongUi.personnel){Object.assign(naejeongUi,{jobs:false,department:null,transferOfficer:null,policy:false,personnel:false});renderFacilityScene(view(state),view(state).ownCities[stage.city],cityPeople(view(state),view(state).ownCities[stage.city]));}else closeStage();}else if(stage.fac)leaveFacility();else closeStage();return;}closeProdPop();selectedCityId=null;closeUnitMenu();$('#city-panel').hidden=true;}});
document.addEventListener('click',e=>{const bandClick=document.body?.classList?.contains('hud-band')&&e.composedPath?.().some(n=>n.id==='ink-hud'),cardClick=e.composedPath?.().some(n=>n.id==='c254-card'||n.id==='c254-loading');if(menuOpen&&!cardClick&&!bandClick&&!e.target.closest('#unit-menu,.ih-unit,.nb-band,.nb-sheet,.nb-bookmarks,.nb-news-tab,.ih-notice,[data-unit],[data-tile]'))closeUnitMenu();});
let c269LabelFrame=0;
document.addEventListener('scroll',()=>{if(!c269LabelFrame)c269LabelFrame=requestAnimationFrame(()=>{c269LabelFrame=0;syncCityLabelEdges($('#map'),$('.viewport'));});},true);
globalThis.addEventListener('resize',()=>{if(state)drawMap(view(state));positionUnitMenu();if(state&&document.body?.classList?.contains('hud-band'))requestAnimationFrame(()=>{const port=$('.viewport');port.scrollTo({...bandCameraPosition(port,$('#map')),behavior:'auto'});if(selectedArmyId&&!attackMode){bandFocusMode=null;syncBandFocus(selectedArmyId,v3Mode());}});});document.addEventListener('scroll',()=>{positionUnitMenu();const tip=$('#attack-preview');if(!tip.hidden&&document.body?.classList?.contains('hud-band')&&!tip.classList.contains('forecast'))placeBandGuide(tip,true);},true);
document.addEventListener('pointerdown',unlockAudio);
$('#mute').addEventListener('click',()=>{pilotAudio.configure({muted:!pilotAudio.settings.muted});refreshAudio();});
function refreshAudio(){pilotAudio=createPilotAudio();actionAudio.refresh();combatAudio.refresh();bgm.configure(pilotAudio.settings);voice.configure(pilotAudio.settings);worldSfx.refresh();$('#mute').textContent=pilotAudio.settings.muted?'默':'聲';$('#mute').title=pilotAudio.settings.muted?'소리 켜기':'소리 끄기';}
globalThis.addEventListener('storage',e=>{if(e.key===null||e.key==='sangoku-round-map-audio-v1')refreshAudio();});
globalThis.addEventListener('pagehide',()=>{worldSfx.dispose();actionAudio.dispose();combatAudio.dispose();bgm.deactivate();voice.deactivate();});
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
 if(document.body.classList.contains('hud-band')){
  // The tilted viewport extends past the window. Frame in actual screen coordinates.
  for(let i=0;i<4;i++){
   const p=point.matrixTransform(node.getScreenCTM()),m=svg.getScreenCTM();
   const kit=document.documentElement.dataset.ui==='kit';
   const delta=screenScrollDelta(m,p.x-innerWidth*(kit?.5:.36),p.y-innerHeight*(kit?.48:.64),zoom);
   viewport.scrollLeft+=delta.x;viewport.scrollTop+=delta.y;
  }
  return;
 }
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
viewport.addEventListener('scroll',clearMapLosses);
function cancelMapInput(e){
 if(e.defaultPrevented)return; // A foreground panel owns its own cancellation.
 e.preventDefault();
 if(suppressPanClick||panGesture?.panning||!state)return;
 if(pendingAttack){cancelAttackConfirmation();render();return;}
 if(inputLocked())return;
 if(undoWaypoint())return;
 cancelStrike();closeProdPop();closeCityQuick();selectedCityId=null;
 closeUnitMenu();$('#city-panel').hidden=true;clearMapLosses();
}
viewport.addEventListener('contextmenu',cancelMapInput);
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
 if(document.documentElement.dataset.ui==='kit'&&state.phase==='AI'){aiFollowSuspended292=true;syncBattleControls292();}
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
document.addEventListener('keydown',e=>{if(!state||e.target?.closest?.('input,select,textarea'))return;if(selectedArmyId&&['q','w','e','r','a','s'].includes(e.key.toLowerCase()))return;const d={ArrowLeft:[-80,0],a:[-80,0],ArrowRight:[80,0],d:[80,0],ArrowUp:[0,-80],w:[0,-80],ArrowDown:[0,80],s:[0,80]}[e.key.length===1?e.key.toLowerCase():e.key];if(d){e.preventDefault();viewport.scrollLeft+=d[0];viewport.scrollTop+=d[1];}});

// Fixed SVG margin covers the viewport even at the minimum zoom; no second background.
let cityOwnershipState=null,cityOwnershipView=null;
let c264CompletionTurn=null;const c264CompletionShown=new Set();
const cityOwnershipEvents=new WeakMap();
function rememberMapOwnership(before,after,v){
 const known=new Map(cityOwnershipEvents.get(before)??[]);
 for(const c of Object.values(after.cities)){
  const was=before.cities[c.cityId]?.ownerFactionId;
  if(v.knowledge.tiles[c.tileId]==='VISIBLE')known.delete(c.cityId);
  // Losing one's own city is public even when its vision disappears immediately.
  if(was!==c.ownerFactionId&&(was===v.factionId||c.ownerFactionId===v.factionId||v.knowledge.tiles[c.tileId]==='VISIBLE'))known.set(c.cityId,c.ownerFactionId);
 }
 cityOwnershipEvents.set(after,known);
}
function refreshMapOwnership(model,publicView,events=new Map()){
 const cities={...publicView.knowledge.cities,...publicView.ownCities};
 for(const c of model.cities){const live=cities[c.id];if(!live)continue;const owner=events.has(c.id)?events.get(c.id):live.ownerFactionId;c.factionId=owner;c.ownerFactionId=owner;c.neutral=owner===null;}
}
// Commands/load replace state; selection switches the tree. Never persisted.
let routeSnapshot=null,routeTrees=new Map(),previewFrame=null;
function orderRoute(snapshot,id,to){
 if(routeSnapshot!==snapshot){routeTrees=new Map();routeSnapshot=snapshot;}
 if(!routeTrees.has(id))routeTrees.set(id,orderRoutes(snapshot,id));
 return routeTrees.get(id).get(to)??null;
}
function scheduleMapPreview(){
 if(previewFrame!==null)return;
 previewFrame=requestAnimationFrame(()=>{previewFrame=null;if(state)drawMapPreview();});
}
let mapSnapshot462=null,mapPresentation462=null;
function drawMap(v,hoverOnly=false){
 if(hoverOnly){scheduleMapPreview();return;}
 const options=selectedArmyId&&!inputLocked()?campaignMoveOptions(state,selectedArmyId):[];
 if(selectedArmyId&&orderEligible(state,selectedArmyId))orderRoute(state,selectedArmyId,state.armies[selectedArmyId].tileId);
 const model=campaignMapModel(v,{selectedArmyId,movedArmyIds:Object.values(state.armies).filter(a=>state.movedArmyIds.includes(a.armyId)||armyActionEnded(state,a.armyId)).map(a=>a.armyId),moveOptions:options,destination,portraits:plateFaces()});
 if(cityOwnershipState!==state){cityOwnershipState=state;cityOwnershipView=getFactionView(state);}
 refreshMapOwnership(model,cityOwnershipView,cityOwnershipEvents.get(state));
 model.fords=Object.entries(state.mapRules.crossings??{}).filter(([edge,kind])=>kind==='ford'&&state.mapRules.riverEdges.includes(edge)).map(([edge])=>edge.split('|')).filter(edge=>edge.every(id=>v.knowledge.tiles[id]&&v.knowledge.tiles[id]!=='UNEXPLORED'));
 mapInfoModel(model,v);
 // Only own public records receive the existing own-unit comparison rating.
 for(const u of model.units){const a=v.ownArmies[u.id];if(a){u.braced=!!a.braced;u.ratings=campaignUnitRatings(state,u.id);}}
 for(const u of model.units)u.active=!!selectedArmyId&&(selectedArmyIds.includes(u.id)||u.id===selectedArmyId)||overlapPick?.count>1&&!v.ownArmies[overlapPick.id]&&overlapPick.id===u.id;
 if(model.places){const xs=v.exploration?.places??[];model.places=model.places.map(p=>{const x=xs.find(e=>e.placeId===p.label),layer=x?.eventName?TRACE_LAYER[state.exploration?.places?.[p.label]?.eventId]??null:null;return {...p,status:x?.status,eventName:x?.eventName,layer,layerName:layer?TRACE_LAYERS[layer].name:null};});}
 model.highlights.orders=orderHighlights(state,selectedArmyIds);
 model.highlights.platformRange=platformRangeTiles(v,selectedArmyId);
 for(const u of model.units)u.platformState=({...v.ownArmies,...v.knowledge.observedArmies})[u.id]?.platformState;
 if(selectedArmyId&&!inputLocked()&&moveMode){
  model.highlights.zoc=visibleControlZones(state,selectedArmyId);
  const points=draftPoints(),preview=destination||points.length?movementPreview(destination):null;
  c327SyncDockRisk(preview);
  model.highlights.waypoints=points;
  if(preview){model.highlights.path=preview.pathTileIds;model.highlights.pathTurns=routeTurns(state,selectedArmyId,preview);model.highlights.pathOk=preview.ok;model.highlights.pathRisk=routeRisks(preview);model.highlights.blocked=preview.ok?null:preview;}
 }
 if(dangerMode||infoLens==='danger')model.highlights.danger=dangerTiles(v);
 {const seen={...v.ownArmies,...(v.knowledge?.observedArmies??{})};for(const u of model.units)if(seen[u.id]?.crisis)u.crisis=seen[u.id].crisis;}
 model.highlights.links=bondLinks(v);{const bonded=new Set(model.highlights.links.flatMap(l=>l.armies));for(const u of model.units)if(bonded.has(u.id))u.bond=true;}
 model.highlights.intents=(dangerMode||infoLens==='danger')?publicEnemyIntents(v,dangerCache?.intents??[]):[];
 const seenUnit=selectedArmyId?v.ownArmies[selectedArmyId]:v.knowledge.observedArmies[inspectedArmyId];
 if(seenUnit&&(v.ownArmies[seenUnit.armyId]||v.knowledge.tiles[seenUnit.tileId]==='VISIBLE'))model.highlights.facing=facingTiles(seenUnit,new Set(Object.keys(v.tiles).filter(id=>v.knowledge.tiles[id]!=='UNEXPLORED'))).map(x=>({...x,from:seenUnit.tileId,label:publicFacingLabel(v,seenUnit,x.tile,x.side)}));
 if(hoverSide&&selectedArmyId)model.highlights.side={...hoverSide,from:v.ownArmies[selectedArmyId]?.tileId,ranged:troopToCampaign(v.ownArmies[selectedArmyId]?.troopType)==='BT03'};

 if(faceMode&&selectedArmyId){const [q,r]=state.armies[selectedArmyId].tileId.split(',').map(Number);model.highlights.move=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([dq,dr])=>`${q+dq},${r+dr}`).filter(id=>state.tiles[id]);}
 const targets=selectedArmyId&&!inputLocked()?attackTargets(state,selectedArmyId):[];
 if(selectedTacticId){const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);targets.splice(0,targets.length,...(card?.targets??[]));}
 model.highlights.attack=[...targets.map(id=>(state.armies[id]??state.cities[id])?.tileId).filter(Boolean),...(selectedArmyId&&!inputLocked()?cityAttackTargets(state,selectedArmyId).map(id=>state.cities[id].tileId):[])];
 if(c300QCard()){model.highlights.move=[];model.highlights.attack=c300QCard().targets.map(c300QTile).filter(Boolean);}
 if(stratagemUi){const o=v.stratagems.find(o=>o.officerId===stratagemUi.officerId),c=v.ownCities[stratagemUi.cityId];model.highlights.move=c?Object.keys(v.tiles).filter(id=>v.knowledge.tiles[id]!=='UNEXPLORED'&&hexDistance(v.tiles[c.tileId],v.tiles[id])<=stratagemUi.range):[];model.highlights.attack=(o?.choices??[]).filter(p=>p.cmd.kind===stratagemUi.kind).map(p=>p.tileId);}
 for(const [id,effect] of Object.entries(losses))if(effect.oldUnit&&!model.units.some(u=>u.id===id))model.units.push({...effect.oldUnit,count:0});
 for(const u of model.units){const effect=losses[u.id];if(effect){Object.assign(u,effect);u.count=effect.displayCount??effect.postCount??u.count;u.maxCount??=effect.prevCount??effect.displayCount;}}
 for(const u of model.units){const a=state.armies[u.id];if(a&&!u.enemy)u.braced=!!a.braced;}
 // 아직 행동할 수 있는 내 부대(테두리 빛) · 내 성 안 병력(성 이름판 정보 줄) — 사용자 2026-10-11
 for(const u of model.units)u.actionEnded=!!v.ownArmies[u.id]&&armyActionEnded(state,u.id);
 for(const u of model.units)u.ready=state.phase==='PLAYER'&&state.armies[u.id]?.factionId===state.playerFactionId&&!armyActionEnded(state,u.id);
 for(const c of model.cities)c.attackable=!!selectedArmyId&&!inputLocked()&&['unit','city','strike','approach'].includes(mapTarget(selectedArmyId,state.cities[c.id].tileId,c.id).kind);
 for(const c of model.cities){const publicCity=cityPublicReadout(v,c.id,cityProductionBadge(v.ownCities?.[c.id]??{}));if(publicCity)Object.assign(c,publicCity);}
 for(const u of model.units){u.side=v.ownArmies[u.id]?'ally':v.diplomacy?.factions?.find(f=>f.factionId===u.factionId)?.state==='ALLIANCE'?'allied':'enemy';u.remembered=!!u.enemy&&v.knowledge.tiles[u.tileId]!=='VISIBLE';}
 updateTacticReady(model);
 overlayAnimations(model);
 for(const u of model.units){const a=state.armies[u.id];if(a&&Number.isInteger(a.facing))u.faceLeft=[2,3,4].includes(a.facing);}
 v3ModeHighlights(v,model,state);
 const margin=440; // 땅 밖으로도 화면을 옮길 수 있다 — 그 너머는 구름 바다(지도와 같이 움직이는 한 장의 세계. 사용자 2026-10-11 "월드맵은 배경이 따로 없어야 하고, 이동하면 다른 지형(안개)이 보여야 함")
 const left=viewport.scrollLeft,top=viewport.scrollTop;
 document.body.dataset.c260Move=String(document.documentElement.dataset.ui==='kit'&&moveMode);
 const cityBadges=Object.fromEntries(Object.values(v.ownCities??{}).map(c=>[c.cityId,cityProductionBadge(c)]).filter(([,b])=>b));
 if(c264CompletionTurn!==v.turn){c264CompletionTurn=v.turn;c264CompletionShown.clear();}
 for(const c of Object.values(v.ownCities??{}))if(cityBadges[c.cityId]&&!c264CompletionShown.has(c.cityId)&&lastFacilityResults.some(line=>line.startsWith(`${c.name} · `))){cityBadges[c.cityId].completed=true;c264CompletionShown.add(c.cityId);}

 model.highlights.mech418=mechanicHighlights418();
 model.highlights.tacticTiles=tacticTiles292();
 model.highlights.blockedTextInBand=document.body.classList.contains('hud-band');
 if(enginePicker462){model.highlights.move=[];model.highlights.attack=[];model.highlights.facing=[];model.highlights.zoc=[];}
 const presentation462=JSON.stringify([v3MapOptions(),infoLens,dangerMode,!!troopLayer,innerWidth,innerHeight]);
 const picking462=!!selectedArmyId&&(attackMode||!!selectedTacticId||!!c300QCard()||!!enginePicker462);
 const stable462=mapSnapshot462===state&&mapPresentation462===presentation462&&document.documentElement.dataset.ui==='kit'&&!combatAnimating&&!Object.keys(losses).length;
 if(stable462&&$('#map svg .c462-interaction')){
  $('#map svg').querySelectorAll('.c418-mech,.c292-impact-area,.c292-target,.w-path,.w-order,.w-order-end,.w-side,.w-waypoint,.w-route-blocked,.c243-path-end,.c260-path-cost,.c279-path-risk,.c291-route-chip,.c291-route-warning').forEach(n=>{if(!n.closest('.c462-interaction'))n.remove();});
  updateMapInteraction462($('#map svg'),model,{dangerLens:dangerMode||infoLens==='danger',targetPicking:picking462});
  renderOverlapChoices(v);renderCombatAdvantages(v);markUnknownCounts(model);
  for(const id of targets)for(const node of unitNodes(id))node.classList.add('attack-target');
  renderEnginePickerMap462();frameEngineTargets462();scheduleMapLayout462(false);return;
 }
 mapSnapshot462=state;mapPresentation462=presentation462;
 const markup=renderWorldMap(model,{size:30,margin,cityBadges,terrainLens:infoLens==='world',targetPicking:!!selectedArmyId&&(attackMode||!!selectedTacticId||!!c300QCard()),dangerLens:dangerMode||infoLens==='danger',unitMarkers:new URLSearchParams(location.search).get('hud')!=='old',troopFormations:!!troopLayer,unitsLod:new URLSearchParams(location.search).get('units')==='lod',supplyPublic:new URLSearchParams(location.search).get('hud')==='old'?null:{cities:Object.values(v.ownCities??{}),hubs:(v.hubs??[]).filter(h=>h.factionId===v.factionId)},compactLabels:globalThis.matchMedia?.("(max-width: 1320px), (max-height: 800px)").matches,...v3MapOptions(),relations:v3Relations(v)});
 clearMapLosses();updateWorldMap370($('#map'),markup);renderInfoLens();{const svg=$('#map svg');if(svg)svg.insertAdjacentHTML('beforeend',renderEngineMapLayer(model,{size:Number(svg.dataset.size),tilt:.62,ox:Number(svg.dataset.ox),oy:Number(svg.dataset.oy)}));}renderOverlapChoices(v);renderCombatAdvantages(v);renderStratagemLabels(v);renderC216MapNotes(v);markUnknownCounts(model);for(const id of targets)for(const node of unitNodes(id))node.classList.add('attack-target');applyZoom();renderEnginePickerMap462();animateUnits($('#map'));
 troopLayer?.sync($('#map'),model);
 fxInk?.sync(v,v.knowledge.tiles);
 renderRouteFords($('#map svg'),moveMode&&destination&&selectedArmyId?orderRoute(state,selectedArmyId,destination):null);
 // 실제 여백은 그린 쪽이 정한다(세계 그림이 있으면 그 고리 너비). 여백이 바뀐 차례에는 그만큼 화면을 옮겨 같은 곳을 보게 한다
 const used=Number($('#map svg')?.dataset?.margin)||margin,offset=mapMargin?(used-mapMargin)*zoom:0;mapMargin=used;
 viewport.scrollLeft=left+offset;viewport.scrollTop=top+offset;
 for(const u of model.units){const node=$('#map').querySelector(`[data-unit="${u.id}"]`);if(node?.insertAdjacentHTML)node;}
}
function mechanicHighlights418(){
 const card=selectedArmyId&&campaignTactics(state,selectedArmyId).find(c=>c.traitId===selectedTacticId);
 return mechanicMap418(state,view(state),selectedArmyId,card,tacticForecast?.request?.targetId);
}
function tacticTiles292(){
 if(document.documentElement.dataset.ui!=='kit'||!tacticForecast?.preview)return [];
 const v=view(state);return (tacticForecast.preview.targetLosses??[]).flatMap(row=>{
  const own=v.ownArmies[row.targetId],seen=v.knowledge.observedArmies[row.targetId],a=own??(seen&&v.knowledge.tiles[seen.tileId]==='VISIBLE'?seen:null);
  return a&&row.loss>0?[{tile:a.tileId,own:!!own}]:[];
 });
}
function drawMapPreview(){
 const svg=$('#map svg');if(!svg)return;
 const route=moveMode&&destination&&selectedArmyId&&orderEligible(state,selectedArmyId)?orderRoute(state,selectedArmyId,destination):null;
 const orders=orderHighlights(state,selectedArmyIds);
 if(route)orders.splice(0,orders.length,{unitId:selectedArmyId,path:route.pathTileIds,turns:routeTurns(state,selectedArmyId,route)},...orders.filter(o=>o.unitId!==selectedArmyId));
 const layout={size:Number(svg.dataset.size),tilt:.62,ox:Number(svg.dataset.ox),oy:Number(svg.dataset.oy)};
 const preview=selectedArmyId&&moveMode&&!inputLocked()&&(destination||draftPoints().length)?movementPreview(destination):null;
 c327SyncDockRisk(preview);
 const scratch=document.createElementNS('http://www.w3.org/2000/svg','svg');scratch.innerHTML=renderMapPreview({mech418:mechanicHighlights418(),tacticTiles:tacticTiles292(),blockedTextInBand:document.body.classList.contains('hud-band'),orders:preview?[]:orders,side:selectedArmyId&&hoverSide?{...hoverSide,from:view(state).ownArmies[selectedArmyId]?.tileId,ranged:troopToCampaign(view(state).ownArmies[selectedArmyId]?.troopType)==='BT03'}:null,path:preview?.pathTileIds??[],pathTurns:preview?routeTurns(state,selectedArmyId,preview):null,pathOk:preview?.ok,pathRisk:typeof routeRisks==='function'?routeRisks(preview):[],pathUncertain:preview?.pathTileIds?.some(id=>view(state).knowledge.tiles[id]==='UNEXPLORED'),waypoints:selectedArmyId?draftPoints():[],blocked:preview?.ok?null:preview},layout);
 svg.querySelectorAll('.c418-mech,.c292-impact-area,.c292-target,.w-path,.w-order,.w-order-end,.w-side,.w-waypoint,.w-route-blocked,.c243-path-end,.c260-path-cost,.c279-path-risk,.c291-route-chip,.c291-route-warning').forEach(n=>n.remove());
 for(const layer of [...scratch.children]){if(layer.classList.contains('w-route-blocked'))svg.append(layer);else svg.insertBefore(layer,svg.querySelector('.w-hits'));}
 scheduleMapLayout462(false);
 if(document.querySelector('.c352-card')){const tile=document.querySelector('.nb-band')?.dataset.target;if(tile)placeC281Forecast(tile);}
 renderRouteFords(svg,route);
}
let lodNear=null;
let mapLayoutFrame462=null,mapLayoutFull462=false;
function scheduleMapLayout462(full=true){
 mapLayoutFull462 ||= full;if(mapLayoutFrame462!==null)return;
 mapLayoutFrame462=requestAnimationFrame(()=>{mapLayoutFrame462=null;const full=mapLayoutFull462;mapLayoutFull462=false;const svg=$('#map svg');if(!svg)return;
  if(full){placeCityQuick();syncCityLabelEdges($('#map'),viewport);}
  if(typeof sizeRouteWarnings==='function')sizeRouteWarnings(svg);
  syncMapReadability(svg,viewport,!full);
 });
}
function applyZoom(){
 if(typeof aiScreen486!=='undefined')aiScreen486=null;
 const svg=$('#map svg');if(!svg)return;
 const width=svg.viewBox?.baseVal?.width;
 if(width)svg.style.width=width*zoom+'px';
 const lod=new URLSearchParams(location.search).get('units')==='lod';
 const near=lodDetail(zoom,lodNear??zoom>=2);
 if(lod)lodNear=near;
 if(lod){
  svg.dataset.lodNear=String(near);svg.classList.add('units-lod');svg.classList.toggle('lod-close',near);
  for(const plate of svg.querySelectorAll('.plate-top:has(.lod-marker)')){
   plate.setAttribute('transform','translate(0 0)');
   const marker=plate.querySelector('.lod-marker');marker.removeAttribute('transform');
   const box=marker.querySelector(near?'.lod-soldiers':'.lod-ring-art').getBoundingClientRect(),screenScale=innerHeight/1080;
   // Cancel the map's foreshortening so portraits and rings remain round on screen.
   if(box.width>0&&box.height>0)marker.setAttribute('transform',`scale(${(near?76:78)*screenScale/box.width} ${(near?70:81)*screenScale/box.height})`);
  }
 }
 const far=mapLabelDetail(zoom)==='far';
 svg.classList.toggle('zoom-far',far);svg.classList.toggle('zoom-near',!far);
 svg.classList.toggle('units-far',far);
 // Wrap visual children, retaining the original placement, data target and hit extent.
 // The protected map renderer and label CSS remain untouched.
 if(document.body.classList.contains('hud-band')){
  const scale=mapLabelScale(zoom);
  const labelReads=[];
  for(const label of svg.querySelectorAll('.w-unit>.plate-top,.w-cityplate,.w-site>.name,.w-site>.c264-site-disc')){
   if(lod&&label.querySelector('.lod-marker'))continue;
   if(label.tagName.toLowerCase()==='text'){
    const x=Number(label.getAttribute('x')??0),y=Number(label.getAttribute('y')??0);
    label.setAttribute('transform',`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`);
    labelReads.push({label,x,y});continue;
   }
   let art=label.querySelector(':scope>.c153-label-art');
   if(!art){art=document.createElementNS('http://www.w3.org/2000/svg','g');art.classList.add('c153-label-art');while(label.firstChild)art.append(label.firstChild);label.append(art);}
   art.setAttribute('transform',`scale(${scale})`);
   labelReads.push({label,art,counter:art.querySelector('.c190-marker .unit-counter-bg,.c190-city-band .city-band-bg,.c264-site-disc circle')});
  }
  // Read the baseline geometry together; writing each label before reading the
  // next used to force a complete SVG layout once per label.
  const labelWrites=labelReads.map(row=>({...row,box:(row.art?row.counter:row.label)?.getBoundingClientRect(),width:row.counter?.getBBox().width}));
  for(const {label,art,x,y,box,width} of labelWrites){
   if(!art){if(box?.height>0)label.setAttribute('transform',`translate(${x} ${y}) scale(${scale*12/box.height}) translate(${-x} ${-y})`);continue;}
   const labelScale=box?.width>0?scale*width/box.width:scale;
   art.setAttribute('transform',`scale(${labelScale})`);
   const unit=label.parentElement;if(label.classList.contains('plate-top')&&unit.hasAttribute('data-troop-top'))label.setAttribute('transform',`translate(0 ${troopPlateY(Number(unit.dataset.troopHead),labelScale)})`);
  }
 }
 scheduleMapLayout462();
 if(document.querySelector('.c352-card')){const tile=document.querySelector('.nb-band')?.dataset.target;if(tile)placeC281Forecast(tile);}
}
export function mapLabelScale(value){return value>1.7?1.7/value:1;}
// Panning changes the map perspective even at the same zoom. Coalesce label
// sizing and the castle connector into one frame after scrolling settles.
let c190LabelFrame=null;
// 10-23 성능: 끄는 동안 매 프레임 applyZoom(이름표 전부 다시 재기)을 돌리면 프레임이 160ms 까지 멈췄다 — 스크롤이 멈춘 뒤 한 번만.
let c190LabelSettle=null;
viewport.addEventListener('scroll',()=>{aiScreen486=null;clearTimeout(c190LabelSettle);c190LabelSettle=setTimeout(()=>{if(c190LabelFrame!==null)return;c190LabelFrame=requestAnimationFrame(()=>{c190LabelFrame=null;if(state)applyZoom();});},120);},{passive:true});
export function screenScrollDelta(m,x,y,z){const det=m.a*m.d-m.b*m.c;return Math.abs(det)<1e-8?{x:0,y:0}:{x:(m.d*x-m.c*y)*z/det,y:(m.a*y-m.b*x)*z/det};}
export function zoomScroll(left,top,x,y,from,to){return {left:(left+x)*to/from-x,top:(top+y)*to/from-y};}
let zoomTimer=null;
function zoomAt(value,x,y){
 clearTimeout(bandFocusTimer);bandFocusMoving=false;
 const vb=$('#map svg')?.viewBox?.baseVal,fit=vb?.width?Math.min(viewport.clientWidth/Math.max(1,vb.width-2*mapMargin),viewport.clientHeight/Math.max(1,vb.height-2*mapMargin)):.5; // 가장 멀리 = 땅 전체가 한 화면에(땅 밖 구름 여백은 빼고 잰다)
 const cover=vb?.width?Math.max(viewport.clientWidth/vb.width,viewport.clientHeight/vb.height):.5; // 가장 멀리 보아도 그림이 화면을 다 덮게(그림 밖이 보이지 않게)
 const next=Math.max(Math.max(.5,Math.min(1,fit)),cover,Math.min(2.6,value)),from=zoom,start=performance.now(),left=viewport.scrollLeft,top=viewport.scrollTop;
 clearTimeout(zoomTimer);rememberCameraZoom(next);
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
// C207 loads independently so an owner-pending server allowlist never blocks play.
import('/app/world/c207-info.mjs').then(info=>{
 c207Info=info;c207Tracker=info.createSituationTracker();
 const rules=$('#rules-modal dl');if(rules)rules.insertAdjacentHTML('beforeend','<dt>용어 사전 · 시험값</dt><dd>용어에 초점을 두면 무엇 · 효과 · 푸는 법을 볼 수 있습니다.</dd>'+info.rulesGlossaryHtml());
 info.mountGlossary();if(state)renderSituationAdvice(view(state));
 const map=$('#map'),tip=document.createElement('aside');tip.id='c207-tile-info';tip.className='c207-glossary';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 let timer=null,hover=null,point=null,stamp=null;
 const hide=()=>{clearTimeout(timer);hover=null;tip.hidden=true;};
 const scheduleTileInfo=e=>{
  if(!state||stage.city||stage.opening||panGesture||e.target.closest?.('[data-unit],[data-city]')){hide();return;}
  const id=e.target.closest?.('[data-tile]')?.dataset.tile;if(!id){hide();return;}if(hover===id&&stamp===state)return;
  hide();hover=id;stamp=state;const rect=e.target.getBoundingClientRect();point={x:e.clientX??rect.x+rect.width/2,y:e.clientY??rect.y+rect.height/2};
  timer=setTimeout(()=>{if(!state||stage.city||stage.opening||state!==stamp||hover!==id||panGesture||inputLocked())return;const readout=info.tileReadout(state,view(state),id,selectedArmyId);if(!readout)return;{
   const route=selectedArmyId?orderRoute(state,selectedArmyId,id):null;
   readout.lines=readout.lines.map(line=>/^이동 비용/.test(line)&&selectedArmyId?route?`이동 ${routeTurns(state,selectedArmyId,route)}차례 · ${route.pathTileIds.length-1}칸`:'이동 · 경로 없음':line);
  }tip.innerHTML=info.tileHtml(readout);info.decorateTerms(tip);tip.dataset.tile=id;tip.hidden=false;const r=tip.getBoundingClientRect();tip.style.left=`${Math.max(8,Math.min(point.x+16,innerWidth-r.width-8))}px`;tip.style.top=`${Math.max(8,Math.min(point.y+18,innerHeight-r.height-8))}px`;if(document.documentElement.dataset.ui==='kit')placeKitTooltip290(tip,point.x,point.y);},info.TILE_HOVER_MS);
 };
 map.addEventListener('pointerover',scheduleTileInfo);map.addEventListener('focusin',scheduleTileInfo);
 map.addEventListener('focusout',e=>{if(!e.relatedTarget?.closest?.('#c207-tile-info,.c207-glossary'))hide();});
 map.addEventListener('pointerleave',e=>{if(document.activeElement?.closest?.('#map [data-tile]'))return;clearTimeout(timer);if(!e.relatedTarget?.closest?.('#c207-tile-info'))hide();});
 tip.addEventListener('pointerleave',e=>{if(!e.relatedTarget?.closest?.('.c207-glossary'))hide();});
 const reposition=()=>{hide();const target=document.activeElement;if(target?.closest?.('#map [data-tile]'))requestAnimationFrame(()=>scheduleTileInfo({target}));};
 document.addEventListener('map:leave-scene',hide);
 map.addEventListener('pointerdown',hide);map.addEventListener('wheel',hide);document.addEventListener('scroll',reposition,true);globalThis.addEventListener('resize',reposition);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
}).catch(error=>{console.warn('C207 정보 UI 로드 보류:',error.message);});
// 규칙 도움말 창(HUD '규칙'): 지금 구현된 규칙과 시험값만 요약
$('#rules-open')?.addEventListener?.('click',()=>{
 const modal=$('#rules-modal'),panel=modal.querySelector('section');if(!panel.classList.contains('c261-help')){
 const entries=[...panel.querySelectorAll('dt')].map(dt=>({name:dt.textContent,html:dt.nextElementSibling?.innerHTML??''}));
 const defs=globalThis.__c254Module?.ruleCardDefinitions(C12,C182)??{};for(const card of Object.values(defs))entries.push({name:card.title,html:esc(card.text),art:card.id});
 mountHelpPanel(panel,entries,()=>{modal.hidden=true;$('#rules-open').focus();});
 }modal.hidden=false;panel.querySelector('input').focus();
});
$('#rules-close')?.addEventListener?.('click',()=>{$('#rules-modal').hidden=true;});
$('#faction')?.addEventListener?.('click',()=>{if(!state)return;$('#faction-modal').hidden=false;renderFactionModal();});
$('#faction-close')?.addEventListener?.('click',()=>{$('#faction-modal').hidden=true;});
$('#faction-content')?.addEventListener?.('click',e=>{if(!state||inputLocked())return;const b=e.target.closest('[data-diplo-propose],[data-diplo-end]');if(!b)return;
 const cmd=b.dataset.diploPropose?{type:'DIPLO_PROPOSE',factionId:b.dataset.diploPropose,kind:b.dataset.kind}:{type:'DIPLO_END_ALLIANCE',factionId:b.dataset.diploEnd};
 try{const before=state;state=step(state,cmd);diplomacyFeedback(before,state);render();renderFactionModal();}catch(err){$('#status').textContent=errorText(err);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#rules-modal')&&!$('#rules-modal').hidden)$('#rules-modal').hidden=true;});
// C236: list presentation is built from the player's projection. Rules stay in engine queries.
function commandScreenRows(v){
 const units=Object.values(v.ownArmies).sort((a,b)=>a.armyId.localeCompare(b.armyId)).map(a=>{
  const actions=selectedActions(a.armyId),sup=a.supply;
  const risk=sup?.stock<=0&&sup?.draining?'군량 바닥':a.morale!=='STEADY'?`사기 ${MORALE_NAME[a.morale]}`:a.formation==='BROKEN'?'전열 붕괴':sup?.draining?`군량 ${food1(sup.turnsLeft)}차례`:'위험 없음';
  return {id:a.armyId,name:v.officers[a.commanderId]?.name??a.armyId,face:faceOf(a.commanderId),type:({BT01:'militia',BT02:'spear',BT03:'bow',BT04:'cavalry'})[troopToCampaign(a.troopType)],typeName:troopName(a.troopType),troops:a.troopCount,actions,promotionReady:!a.engine?.path&&a.engine?.merits?.some(m=>m.count>=m.goal),ended:armyActionEnded(state,a.armyId),risk};
 });
 const cities=Object.values(v.ownCities).sort((a,b)=>a.cityId.localeCompare(b.cityId)).map(c=>({id:c.cityId,name:c.name,face:faceOf(c.governorId),governor:v.officers[c.governorId]?.name??'태수 공석',production:cityProductionBadge(c),food:foodExhaustion({ownCities:{[c.cityId]:c}}),threat:c.besieged?'포위 중':(v.enemyIntents??[]).some(i=>i.targetId===c.cityId)?'적의 목표':'위협 없음'}));
 return {units,cities};
}
function selectCommandRow(kind,id){
 if(!state||inputLocked()||stage.city)return;
 const v=view(state);
 if(kind==='city'){if(!v.ownCities[id])return;closeUnitMenu();const n=$('#map').querySelector(`.w-cityplate[data-city="${id}"]`);if(document.documentElement?.dataset?.ui!=='kit')n?.scrollIntoView?.({block:'center',inline:'center',behavior:'auto'});openCityQuick(id);renderHud(v);return;}
 if(!v.ownArmies[id])return;
 closeCityQuick();selectedTacticId=null;cancelStrike();overlapPick=null;attackMode=false;selectedArmyId=id;selectedArmyIds=[id];menuOpen=true;moveMode=true;destination=null;render();follow(id,true,null,null,true);
}
document.addEventListener('ink:command-select',e=>selectCommandRow(e.detail.kind,e.detail.id));
// The band and N/Space share selection and camera behavior.
function nextBandUnit(){
 if(!state||state.gameResult||inputLocked()||state.phase!=='PLAYER')return;
 const ids=Object.values(view(state).ownArmies).map(a=>a.armyId).filter(id=>!armyActionEnded(state,id)).sort();if(!ids.length)return;
 const next=ids[(ids.indexOf(selectedArmyId)+1)%ids.length];
 selectedTacticId=null;overlapPick=null;attackMode=false;selectedArmyId=next;selectedArmyIds=[next];menuOpen=true;moveMode=true;destination=null;render();follow(next,true,null,null,true);
}
document.addEventListener('ink:next-unit',nextBandUnit);
document.addEventListener('ink:uncover',()=>{closeProdPop();closeCityQuick();if(selectedArmyId)requestAnimationFrame(()=>follow(selectedArmyId,true));});
// 키보드: N = 다음 부대(이번 턴 행동이 남은 내 부대를 차례로 골라 보여 줌), Enter = 다음 턴. 창이 떠 있거나 입력 중이면 무시
document.addEventListener('keydown',e=>{
 if(!state||state.gameResult||e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,select,textarea,button,a'))return;
 if(document.querySelector('.modal-backdrop:not([hidden])'))return;
 if(e.key==='z'||e.key==='Z'){e.preventDefault();undoMovement();return;}
 if(e.key==='x'||e.key==='X'){e.preventDefault();toggleDangerLens();$('#status').textContent=dangerMode?'위험 지역 보기 — 보이는 적이 다음 턴에 닿는 칸 (X 끄기)':'위험 지역 보기 끔';return;}
 if(e.key==='n'||e.key==='N'||e.key===' '){
  e.preventDefault();nextBandUnit();
 }
 if(e.key==='Enter'&&document.body.dataset.c260Forecast!=='true'&&!$('#end-turn').disabled){e.preventDefault();const b=$('#end-turn').dataset.blocker;if(b&&!e.shiftKey){openCity(b,'jobs');return;}command({type:'END_TURN'});}
 // 부대 행동: Q 병종 · W 엔진 · E 전법 · R 고유 전법 · M 이동 · A 공격 · F 정면 · B 방어 · S 재정비 · G 복귀 · H 대기
 if(selectedArmyId&&state.phase==='PLAYER'&&!inputLocked()&&!e.repeat){
  const key=e.key.length===1?e.key.toUpperCase():e.key;
  if(['Q','W','E','R'].includes(key)&&selectedArmyIds.length>1)return;
  if(key==='W'){const b=document.querySelector('.c300-slot[data-ability="W"] button');if(b){if(!b.disabled){e.preventDefault();b.click();}return;}}
  if(['E','R'].includes(key)){const card=campaignTactics(state,selectedArmyId).find(c=>c.slot===key||!c.slot&&(key==='R'?c.signature:!c.signature));if(!card)return;if(!menuOpen){menuOpen=true;render();}const btn=[...document.querySelectorAll('#unit-menu [data-tactic]')].find(b=>b.dataset.tactic===card.traitId);if(btn&&!btn.disabled){e.preventDefault();btn.click();}return;}
  const action=key==='Q'?'troop-q':Object.entries(ACTION_KEYS).find(([,k])=>k===key)?.[0],ti=['1','2','3'].indexOf(e.key);
  if(action||ti>=0){if(!menuOpen){menuOpen=true;render();}const btn=ti>=0?[...(document.querySelectorAll?.('#unit-menu [data-tactic]')??[])][ti]:document.querySelector(`#unit-menu [data-menu="${action}"]`);if(btn&&!btn.disabled){e.preventDefault();btn.click();}}

 }
});
// 이어하기로 들어오면 모듈 끝에서 불러온다 — 위쪽에서 부르면 아래의 viewport 등이 아직 만들어지지 않아(TDZ) 끝난 판에서 오류 문구가 남았다
document.addEventListener('ink:heads',()=>{if(state)drawMap(view(state));});
if (new URLSearchParams(location.search).get('entry') === 'continue') resume();

$('#map').addEventListener('pointermove',e=>{
 if(!state||panGesture?.panning)return;const tile=targetTile(e.target,state.armies,state.cities),own=Object.values(view(state).ownArmies),id=own.find(a=>a.tileId===tile)?.armyId;
 $('#map').classList.toggle('friendly-hover',!!id);for(const n of $('#map').querySelectorAll('.w-unit'))n.classList.toggle('hovered',own.some(a=>a.armyId===n.dataset.unit&&a.tileId===tile));
});
$('#map').addEventListener('pointerleave',()=>{$('#map').classList.remove('friendly-hover');for(const n of $('#map').querySelectorAll('.hovered'))n.classList.remove('hovered');});

$('#map').addEventListener('pointerover',e=>{
 const otherArmyId=e.target.closest?.('[data-unit]')?.dataset.unit,v=state&&view(state),a=v?.ownArmies?.[selectedArmyId],b=v?.ownArmies?.[otherArmyId];
 if(!a||!b||a===b||hexDistance(v.tiles[a.tileId],v.tiles[b.tileId])!==1||inputLocked())return;
 const why=swapReason(state,{armyId:a.armyId,otherArmyId}),tip=$('#attack-preview');
 tip.innerHTML=`<p>${esc(v.officers[b.commanderId]?.name??'아군')} · ${esc(why??'서로 이동을 써서 자리를 바꿉니다')}</p><button class="btn sm" id="c216-swap" ${why?'disabled':''} title="${esc(why??'자리 바꾸기')}">자리 바꾸기</button>`;
 tip.classList.remove('forecast');tip.title=why??'서로 이동을 써서 자리를 바꿉니다';tip.hidden=false;placeTip(tip,e);tip.querySelector('button').onclick=()=>command({type:'SWAP_ARMIES',armyId:a.armyId,otherArmyId});
});

$('#map').addEventListener('click',e=>{
 if(!e.altKey||!selectedArmyId||inputLocked())return;
 const id=e.target.closest?.('[data-unit]')?.dataset.unit;if(!id||!view(state).ownArmies[id]||id===selectedArmyId)return;
 e.preventDefault();e.stopImmediatePropagation();command({type:'SWAP_ARMIES',armyId:selectedArmyId,otherArmyId:id});
},true);


// C186 retry uses the existing faction-start path.
{const retry=new URLSearchParams(location.search).get('retryFaction'),card=retry?document.querySelector(`#selection .w-lord[data-pick="${CSS.escape(retry)}"]`):null;if(card){card.click();$('#start-go').click();}}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&v3Mode()==='trace'){setV3Mode('world');if(state)render();}});

window.__worldReady=true;document.getElementById('boot-failsafe')?.remove();


let c266StratagemReturn=null,c266StratagemTimer=null;
function closeStratagemCamera(){
 clearTimeout(c266StratagemTimer);if(!c266StratagemReturn)return;
 const {left,top,result}=c266StratagemReturn;c266StratagemReturn=null;
 $('.viewport').scrollTo({left,top,behavior:reduceMotion()?'auto':'smooth'});
 showCombatResult({captureLine:result.text,uiNotice:true,attackerId:'stratagem'},[{id:'stratagem',name:result.text.split(' · ')[0],portrait:faceOf(result.officerId)}]);
}
function c266StratagemCamera(result){
 const v=view(state),a=v.ownArmies[result.targetId]??v.knowledge.observedArmies[result.targetId]??v.ownCities[result.targetId]??v.knowledge.cities[result.targetId];
 const node=a&&$('#map').querySelector(`[data-tile="${a.tileId}"]`),port=$('.viewport');if(!node)return;
 c266StratagemReturn={left:port.scrollLeft,top:port.scrollTop,result};
 const r=node.getBoundingClientRect();port.scrollTo({left:port.scrollLeft+r.left+r.width/2-innerWidth*.75,top:port.scrollTop+r.top+r.height/2-innerHeight*.35,behavior:reduceMotion()?'auto':'smooth'});
 c266StratagemTimer=setTimeout(()=>$('#c226-stratagem [data-stratagem-close]')?.click(),4000);
}
document.addEventListener('keydown',e=>{const panel=$('#c226-stratagem');if(!panel||panel.hidden)return;if(e.key==='Enter'&&!e.target.closest('button')){e.preventDefault();e.stopImmediatePropagation();panel.querySelector('[data-stratagem-execute]:not(:disabled),[data-stratagem-close]')?.click();}else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();panel.querySelector('[data-stratagem-close]')?.click();}},true);
document.addEventListener('contextmenu',e=>{const panel=$('#c226-stratagem');if(panel&&!panel.hidden){e.preventDefault();panel.querySelector('[data-stratagem-close]')?.click();}},true);
function openStratagem(cityId){
 stratagemUi={cityId,range:0};let panel=$('#c226-stratagem');
 if(!panel){panel=document.createElement('section');panel.id='c226-stratagem';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','계략');document.body.append(panel);
 panel.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown'].includes(e.key)||!e.target.matches('[data-stratagem-officer]'))return;const rows=[...panel.querySelectorAll('[data-stratagem-officer]:not(:disabled)')],i=rows.indexOf(e.target);e.preventDefault();rows[(i+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length]?.focus();});
 panel.addEventListener('click',e=>{if(e.target.closest('[data-stratagem-more]')&&stratagemUi){stratagemUi.showAll=!stratagemUi.showAll;drawStratagem();return;}const who=e.target.closest('[data-stratagem-officer]');if(who&&stratagemUi&&!who.disabled){stratagemUi.officerId=who.dataset.stratagemOfficer;stratagemUi.kind=null;stratagemUi.commandKey=null;drawStratagem();render();panel.querySelector(`[data-stratagem-officer="${stratagemUi.officerId}"]`)?.focus();return;}const kind=e.target.closest('[data-stratagem-kind]')?.dataset.stratagemKind;if(stratagemUi&&(kind||e.target.closest('[data-stratagem-repick]'))){stratagemUi.kind=kind??null;stratagemUi.commandKey=null;drawStratagem();render();return;}if(e.target.closest('[data-stratagem-close]')){closeStratagemCamera();stratagemUi=null;panel.hidden=true;render();return;}if(e.target.closest('[data-stratagem-execute]')&&stratagemUi&&!inputLocked()){const p=view(state).stratagems.flatMap(o=>o.choices).find(p=>JSON.stringify(p.cmd)===stratagemUi.commandKey);if(!p)return;const before=state;command(p.cmd);if(state!==before){stratagemUi=null;c266StratagemCamera(view(state).stratagemLog.at(-1));panel.dataset.stage='result';panel.innerHTML=stratagemPanelHtml([],{},view(state).stratagemLog.at(-1),stratagemFaces());render();}}});}
 drawStratagem();panel.hidden=false;render();
}
function stratagemFaces(){return Object.fromEntries(Object.keys(view(state).officers).map(id=>[id,faceOf(id)]));}
function drawStratagem(){if(!stratagemUi)return;const v=view(state);stratagemUi.range=v.stratagemRange;const target=v.stratagems.flatMap(o=>o.choices).find(p=>JSON.stringify(p.cmd)===stratagemUi.commandKey),foe=target&&(v.knowledge.cities[target.cmd.targetCityId]??v.knowledge.observedArmies[target.cmd.targetArmyId]);stratagemUi.exposureText=v.diplomacy&&foe?'들키면 — 내 세력의 공개 위협 +10(외교)':'';$('#c226-stratagem').dataset.stage=stratagemUi.kind?'target':'cards';$('#c226-stratagem').innerHTML=stratagemPanelHtml(v.stratagems.filter(o=>o.cityId===stratagemUi.cityId),stratagemUi,null,stratagemFaces());}
function chooseStratagemTarget(e){if(!stratagemUi||inputLocked())return;const v=view(state),tile=targetTile(e.target,{...v.knowledge.observedArmies,...v.ownArmies},{...v.knowledge.cities,...v.ownCities}),p=v.stratagems.find(o=>o.officerId===stratagemUi.officerId)?.choices.find(p=>p.cmd.kind===stratagemUi.kind&&p.tileId===tile);if(p){stratagemUi.commandKey=JSON.stringify(p.cmd);drawStratagem();uncoverMapTile(tile);}else $('#status').textContent='밝게 표시한 대상만 고를 수 있습니다';}

function renderStratagemLabels(v){
 if(stratagemUi){
  // Reuse the map renderer's union outline, removing every filled range hex.
  const map=$('#map');map.querySelectorAll('.w-move').forEach(n=>n.remove());
  map.querySelector('.w-move-boundary')?.setAttribute('class','c226-range-boundary');
  map.querySelectorAll('.w-attack').forEach(n=>n.setAttribute('class','c226-target-border'));
  const choices=v.stratagems.find(o=>o.officerId===stratagemUi.officerId)?.choices??[];
  for(const id of new Set(choices.filter(p=>p.cmd.kind===stratagemUi.kind).map(p=>p.tileId))){
   const hit=map.querySelector(`[data-tile="${id}"]`);if(!hit)continue;
   const svg=map.querySelector('svg'),label=document.createElementNS('http://www.w3.org/2000/svg','text');
   const cityId=choices.find(p=>p.tileId===id&&p.cmd.kind===stratagemUi.kind)?.cmd.targetCityId,cityLabel=cityId?map.querySelector(`.w-cityplate[data-city="${cityId}"]`):null;
   const rect=(cityLabel??hit).getBoundingClientRect(),point=svg.createSVGPoint();point.x=rect.left+rect.width/2;point.y=rect.top-12;
   const at=point.matrixTransform(svg.getScreenCTM().inverse()),bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
   bg.setAttribute('class','c262-target-bg');bg.setAttribute('x',String(at.x-25));bg.setAttribute('y',String(at.y-19));bg.setAttribute('width','50');bg.setAttribute('height','27');
   label.setAttribute('class','c226-target-marker');label.setAttribute('x',String(at.x));label.setAttribute('y',String(at.y));label.textContent='대상';const m=svg.getScreenCTM(),scale=Math.hypot(m.a,m.b)||1,transform=`translate(${at.x} ${at.y}) scale(${1/scale}) translate(${-at.x} ${-at.y})`;label.style.setProperty('font-size','15px','important');for(const n of [bg,label])n.setAttribute('transform',transform);svg.append(bg,label);
  }
 }

 const seen={...v.knowledge.cities,...v.ownCities,...v.knowledge.observedArmies,...v.ownArmies};
 for(const x of Object.values(seen)){const food=x.supply?.stock??x.supplyFood,shortage=Number.isFinite(food)&&food<=0;const status=[x.stratagemText,shortage?'飢 군량 부족':null,...(x.engine?.statuses??[])].filter(Boolean).join(' · ');if(!status)continue;const selector=x.cityId?`.w-cityplate[data-city="${x.cityId}"]`:`.w-unit[data-unit="${x.armyId}"]>.plate-top`,node=$('#map').querySelector(selector);if(!node)continue;const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('class','c226-map-effect');text.setAttribute('text-anchor','middle');text.setAttribute('y',String(node.getBBox().y+node.getBBox().height+14));text.textContent=(x.cityId&&x.stratagemText?'謠 ':'')+status;if(shortage){text.classList.add('c266-shortage');text.setAttribute('y',String(node.getBBox().y-24));text.setAttribute('paint-order','stroke');text.setAttribute('stroke','var(--sg-ink-deep)');text.setAttribute('stroke-width','8');text.setAttribute('stroke-linejoin','round');}node.append(text);}
}

// C225: start only after all map and UI bindings have initialized.
if(new URLSearchParams(location.search).get('entry')==='prologue'){
 const start=()=>{resetGuideRun();state=createPrologue();zoom=START_ZOOM;render();centerPlayer();};
 loadGuideData().then(()=>chooseGuide()).then(start).catch(()=>{const notice=document.createElement('p');notice.className='c426-load-error';notice.textContent='안내자 데이터를 읽지 못했습니다.';const retry=document.createElement('button');retry.textContent='다시 시도';retry.onclick=()=>location.reload();notice.append(retry);document.body.append(notice);});
}

document.addEventListener('click',()=>{if(isPrologue(state))requestAnimationFrame(()=>renderPrologue(state,{complete:()=>finishPrologue(()=>globalThis.localStorage)}));});
// C225: scene transitions build their controls after the original click.
if(typeof MutationObserver!=='undefined'){
const c225SceneObserver=new MutationObserver(records=>{if(!isPrologue(state))return;const root=$('#c225-prologue');if(records.some(r=>!root?.contains(r.target)))renderPrologue(state,{complete:()=>finishPrologue(()=>globalThis.localStorage)});});
c225SceneObserver.observe(document.body,{childList:true,subtree:true});
}

// C225: keep the first city in view when checking another window size.
window.addEventListener?.('resize',()=>{if(isPrologue(state)&&state.prologue.stage==='SORTIE'&&!stage.city)requestAnimationFrame(centerPlayer);});

// Opt-in, unsaved C229 interaction fixture. Ordinary games never enter this branch.
if(new URLSearchParams(location.search).get('c229fixture')==='1'){
 state=createCampaign({map:'v2',seed:901,fieldArmies:true,manualEndTurn:true,council:false,c31:false,c37:false,c42:false,c43:false,c46:false});
 state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 const who='U-F01-G24',foe='U-F02-G02',r=state.campaignGrowth.officers.G24;
 for(const t of Object.values(state.tiles))t.terrainType='plain';state.mapRules.blockedEdges=[];state.mapRules.riverEdges=[];
 state.armies[who].tileId='6,3';state.armies[foe].tileId='7,3';state.armies[who].troopType='bow';state.officers.G24.allowedTroops=[...new Set([...state.officers.G24.allowedTroops,'bow'])];state.officers.G24.aptitude.bow='A';
 const key=Object.keys(r.cards).find(k=>r.cards[k].id==='CTA-05');r.track.growthStates.G24.ownedTraitRanks[key]=1;r.equippedTacticIds=[key];r.c29.gauge=55;
 updateC229Knowledge(state);selectedArmyId=who;selectedArmyIds=[who];menuOpen=true;$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();
}

var enginePicker462=null;
function closeEnginePicker462(){
 enginePicker462=null;document.body.classList.remove('c462-w-picking');document.querySelector('.c231-engine-picker')?.remove();
 if(state)drawMap(view(state));
}
function engineTile462(id,v=view(state)){
 return (v.ownArmies[id]??v.knowledge.observedArmies[id]??v.ownCities[id]??v.knowledge.cities[id]??v.engineMap?.structures.find(t=>t.id===id))?.tileId??(v.tiles[id]?id:null);
}
function renderEnginePickerMap462(){
 const svg=$('#map svg');svg?.querySelector('.c462-w-targets')?.remove();
 svg?.classList.toggle('target-picking',!!enginePicker462?.pick||attackMode||!!selectedTacticId);
 if(!svg||!enginePicker462?.pick)return;
 const {pick}=enginePicker462,v=view(state),size=Number(svg.dataset.size),ox=Number(svg.dataset.ox),oy=Number(svg.dataset.oy);
 const candidates=engineCandidates462(pick),ids=[...new Set([...candidates,...pick.order,...(pick.center?[pick.center]:[])])];
 let markup='';
 for(const id of ids){
  const tile=engineTile462(id,v);if(!tile)continue;const [q,r]=tile.split(',').map(Number),x=ox+size*Math.sqrt(3)*(q+r/2),y=oy+size*1.5*r*.62;
  const points=Array.from({length:6},(_,i)=>{const a=(60*i-30)*Math.PI/180;return `${x+size*.92*Math.cos(a)},${y+size*.92*Math.sin(a)*.62}`;}).join(' ');
  const index=pick.order.indexOf(id),chance=pick.action.targetChances?.[id],label=[index>=0?String(index+1):'',chance!==undefined?chanceText462(chance):'',pick.center===id?'중심':''].filter(Boolean).join(' · ');
  markup+=`<g class="c462-w-target${index>=0||pick.center===id?' chosen':''}${pick.cursor>=0&&candidates[pick.cursor]===id?' keyboard':''}" data-w-target="${esc(id)}" data-tile="${esc(tile)}"><polygon class="w-attack" points="${points}"/>${label?`<text x="${x}" y="${y+4}" text-anchor="middle">${label}</text>`:''}</g>`;
 }
 svg.insertAdjacentHTML('beforeend',`<g class="c462-w-targets">${markup}</g>`);svg.classList.add('target-picking');
}
function frameEngineTargets462(){
 const ui=enginePicker462,svg=$('#map svg'),panel=document.querySelector('.c231-engine-picker');if(!ui||!svg||!panel)return;
 const dock=document.querySelector('.c335-dock'),dr=dock?.getBoundingClientRect();
 const bottom=Math.min(innerHeight-20,dr?.height?dr.top-8:innerHeight-150);
 panel.style.setProperty('--c462-bottom',`${innerHeight-bottom}px`);
 const key=ui.pick?`${ui.pick.action.action}:${ui.pick.center??''}`:'menu';if(ui.frameKey===key)return;ui.frameKey=key;
 const nodes=[...svg.querySelectorAll('.c462-w-target polygon')];if(!nodes.length)return;
 const port=viewport.getBoundingClientRect(),resources=document.querySelector('.ih-res')?.getBoundingClientRect(),area={left:Math.max(24,port.left+24),right:Math.min(innerWidth-24,port.right-24),top:Math.max(160,(resources?.bottom??0)+24,port.top+24),bottom:bottom-panel.getBoundingClientRect().height-24};
 for(let i=0;i<4;i++){
  const rects=nodes.map(n=>n.getBoundingClientRect()),left=Math.min(...rects.map(r=>r.left)),right=Math.max(...rects.map(r=>r.right)),top=Math.min(...rects.map(r=>r.top)),base=Math.max(...rects.map(r=>r.bottom));
  const factor=Math.min(1,(area.right-area.left)/Math.max(1,right-left),(area.bottom-area.top)/Math.max(1,base-top));
  if(factor<.98){zoom=Math.max(.35,zoom*factor*.95);applyZoom();continue;}
  viewport.scrollLeft+=(left+right-area.left-area.right)/2;viewport.scrollTop+=(top+base-area.top-area.bottom)/2;break;
 }
}
globalThis.addEventListener('resize',()=>{if(enginePicker462){enginePicker462.frameKey=null;requestAnimationFrame(frameEngineTargets462);}});
function refreshEnginePicker462(){
 const ui=enginePicker462;if(!ui)return;
 if(ui.stamp!==state){closeEnginePicker462();$('#status').textContent='상황이 바뀌었습니다 — W를 다시 고르세요.';return;}
 const panel=document.querySelector('.c231-engine-picker'),p=ui.pick;
 panel.querySelector('p').textContent=!p?'행동을 고르세요':p.center?`이웃 두 칸을 고르세요 · ${p.order.length}/2`:p.action.action==='FLURRY'?'지도에서 누른 순서대로 연타합니다':p.action.action==='INTIMIDATE'?'지도에서 위압 대상을 고르세요':'지도에서 표시된 대상 칸이나 부대를 고르세요';
 const confirm=panel.querySelector('[data-c462-confirm]');confirm.disabled=!p||!engineRequest462(p,ui.who);confirm.textContent=p?.center?'이 범위로 예고':'확인';
 renderEnginePickerMap462();frameEngineTargets462();scheduleMapLayout462(false);
}
function pickEngineMap462(e){
 const ui=enginePicker462;if(!ui?.pick)return;
 if(ui.stamp!==state){closeEnginePicker462();return;}
 const tile=targetTile(e.target,state.armies,state.cities),direct=e.target.closest?.('[data-w-target],[data-unit],[data-city]'),id=direct?.dataset.wTarget??direct?.dataset.unit??direct?.dataset.city;
 const candidates=engineCandidates462(ui.pick),target=candidates.includes(id)?id:candidates.find(id=>engineTile462(id)===tile);
 if(target&&pickEngineTarget462(ui.pick,target))refreshEnginePicker462();
}
function openEngineAction(){
 if(enginePicker462)closeEnginePicker462();
 const who=selectedArmyId,stamp=state,v=view(state),a=v.ownArmies[who];if(!a?.engine)return;
 const actions=[...a.engineActions??[],...(a.structureTargets?.length?[{action:'ATTACK_STRUCTURE',name:'구조물 공격',canUse:true,targets:a.structureTargets}]:[])];
 const neighbors=Object.fromEntries(Object.keys(v.tiles).map(center=>[center,Object.keys(v.tiles).filter(id=>hexDistance(v.tiles[center],v.tiles[id])===1).sort()]));
 overlapPick=null;renderOverlapChoices(v);document.querySelectorAll('.c207-glossary').forEach(t=>{t.hidden=true;});document.querySelectorAll('.c300-tooltip.open').forEach(t=>t.classList.remove('open'));
 enginePicker462={who,stamp,pick:null};document.body.classList.add('c462-w-picking');clearTacticForecast();selectedTacticId=null;attackMode=false;moveMode=false;faceMode=false;
 const panel=document.createElement('div');panel.className='c229-disengage c231-engine-picker';panel.tabIndex=-1;panel.addEventListener('click',e=>e.stopPropagation());
 panel.innerHTML='<b>W 계통 행동</b><div class="c231-choices"></div><p aria-live="polite"></p><button data-c462-confirm disabled>확인</button><button data-c231-cancel>취소 · Esc</button>';
 const choose=o=>{enginePicker462.pick=engineSelection462(o,a.engine.resource,neighbors);panel.querySelector('.c231-choices').hidden=true;refreshEnginePicker462();};
 for(const o of actions){const button=document.createElement('button');button.textContent=o.name;button.disabled=!o.canUse;button.title=o.reasonText??'';button.onclick=()=>choose(o);panel.querySelector('.c231-choices').append(button);}
 panel.querySelector('[data-c231-cancel]').onclick=closeEnginePicker462;
 panel.querySelector('[data-c462-confirm]').onclick=()=>{const ui=enginePicker462;if(!ui||ui.stamp!==state){closeEnginePicker462();return;}const request=ui.pick&&engineRequest462(ui.pick,ui.who);if(request){closeEnginePicker462();command(request);}};
 document.querySelector('.c231-engine-picker')?.remove();document.body.append(panel);panel.focus();
 if(actions.length===1&&actions[0].canUse)choose(actions[0]);else refreshEnginePicker462();
 drawMap(view(state));
}
document.addEventListener('keydown',e=>{
 if(!enginePicker462||!['Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key)||e.target.closest?.('input,textarea,select'))return;
 e.preventDefault();e.stopImmediatePropagation();const ui=enginePicker462,p=ui.pick;
 if(e.key==='Escape'){
  if(p&&backEngineSelection462(p)){refreshEnginePicker462();return;}
  if(p){ui.pick=null;document.querySelector('.c231-choices').hidden=false;drawMap(view(state));refreshEnginePicker462();return;}
  closeEnginePicker462();return;
 }
 if(!p)return;
 const ids=engineCandidates462(p);if(!ids.length)return;
 if(e.key==='Enter'){if(p.cursor>=0){pickEngineTarget462(p,ids[p.cursor]);p.cursor=-1;refreshEnginePicker462();}else document.querySelector('[data-c462-confirm]:not(:disabled)')?.click();return;}
 p.cursor=(p.cursor+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+ids.length)%ids.length;refreshEnginePicker462();
},true);
// Opt-in unsaved C231 browser interaction fixture; no local saves are read/written.
if(new URLSearchParams(location.search).get('c231fixture')==='1'){
 state=createCampaign({map:'v2',seed:901,manualEndTurn:true,council:false,c31:false,c42:false,c43:false,c46:false});
 state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 const who='U-F01-G24',foe='U-F02-G02';
 for(const t of Object.values(state.tiles))t.terrainType='plain';state.mapRules.blockedEdges=[];state.mapRules.riverEdges=[];
 state.armies[who].tileId='6,3';state.armies[foe].tileId='7,3';state.armies[who].troopType='militia';state.armies[who].c50.resource=3;
 state.officers.G24.allowedTroops=[...new Set([...state.officers.G24.allowedTroops,'militia'])];state.officers.G24.aptitude.militia='A';
 updateC229Knowledge(state);selectedArmyId=who;selectedArmyIds=[who];menuOpen=true;$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();
}

// Opt-in unsaved C232 construction fixture, using the normal officer/sortie path.
if(['1','warning'].includes(new URLSearchParams(location.search).get('c232fixture'))){
 state=createCampaign({map:'v2',seed:901,manualEndTurn:true,council:false,c31:false,c42:false,c43:false,c46:false});
 const warning=new URLSearchParams(location.search).get('c232fixture')==='warning';
 if(!warning){state=addCampaignOfficer(state,'G89',{factionId:'F01',cityId:'west'});state=sortie(state,{cityId:'west',officerId:'G89',troopType:'militia',troopCount:200});}
 const a=Object.values(state.armies).find(a=>a.commanderId===(warning?'G07':'G89'));a.c50.resource=warning?2:3;
 state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 selectedArmyId=a.armyId;selectedArmyIds=[a.armyId];menuOpen=true;$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();
}

// Unsaved promotion fixture: the existing W fixture supplies a valid campaign.
if(new URLSearchParams(location.search).get('c233fixture')==='1'){
 state=structuredClone(state);
 const a=Object.values(state.armies).find(a=>a.factionId===state.playerFactionId&&a.c50?.engineId==='MAENG')??Object.values(state.armies).find(a=>a.factionId===state.playerFactionId);
 const x=state.campaignGrowth.officers[a.commanderId].c50,b=view(state).ownArmies[a.armyId].engine.merits[0];
 x.merits[b.id]=3;x.promotion={level:2,branches:[b.id]};render();
}

// C234 opt-in unsaved ability fixture, using the existing officer/sortie path.
if(new URLSearchParams(location.search).get('c234fixture')==='1'){
 state=createCampaign({map:'v2',seed:901,manualEndTurn:true,council:false,c31:false,c42:false,c43:false,c46:false});
 state=addCampaignOfficer(state,'G56',{factionId:'F01',cityId:'west'});
 state=sortie(state,{cityId:'west',officerId:'G56',troopType:'cavalry',troopCount:200});
 const a=Object.values(state.armies).find(a=>a.commanderId==='G56');
 for(const t of Object.values(state.tiles))t.terrainType='plain';state.mapRules.blockedEdges=[];state.mapRules.riverEdges=[];
 a.tileId='6,3';state.armies['U-F02-G02'].tileId='7,3';state.armies['U-F02-G05'].tileId='5,3';
 state.campaignGrowth.officers.G56.c29.gauge=100;state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 updateC229Knowledge(state);selectedArmyId=a.armyId;selectedArmyIds=[a.armyId];menuOpen=true;$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();
}

function openSample4Pass(who){
 const v=view(state),targets=v.ownArmies[who]?.sample4PassTargets??[];if(!targets.length)return false;
 const stamp=state,panel=document.createElement('div');panel.className='c229-disengage';panel.tabIndex=-1;
 panel.innerHTML='<b>왕좌지재 · 행동을 넘길 아군</b><div class="c234-pass-choices"></div><button data-sample4-cancel>취소 · Esc</button>';
 for(const targetId of targets){const button=document.createElement('button');button.dataset.sample4Pass=targetId;button.textContent=(v.officers[v.ownArmies[targetId].commanderId]?.name??'아군')+'에게 행동 넘기기';button.onclick=()=>{panel.remove();if(stamp!==state){$('#status').textContent='상황이 바뀌었습니다 — 대기를 다시 고르세요.';return;}command({type:'WAIT_UNIT',armyId:who,targetId});};panel.querySelector('.c234-pass-choices').append(button);}
 panel.querySelector('[data-sample4-cancel]').onclick=()=>panel.remove();panel.onkeydown=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();panel.remove();}};
 document.body.append(panel);panel.focus();return true;
}

// C248 opt-in, unsaved information fixture. Uses normal panel controls and public previews.
if(new URLSearchParams(location.search).get('c248fixture')==='1'){
 state=createCampaign({council:false,c31:false,c42:false,c46:false,manualEndTurn:true});
 state.armies['U-F01-G24'].tileId='-11,29';state.armies['U-F01-G07'].tileId='-9,25';
 state.armies['U-F02-G05'].tileId='-10,29';state.armies['U-F02-G05'].morale='STEADY';state.armies['U-F02-G05'].facing=1;
 state.cities.julu.ownerFactionId='F02';state.factions.F02.ownedCityIds.push('julu');
 state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 updateC229Knowledge(state);selectedArmyId=null;selectedArmyIds=[];$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();openStratagem('west');
 // User-authorized R2 capture handle; it only changes UI and calls the live preview/drawing path.
 window.__c248HoverTarget=targetId=>{
  const city=!!state.cities[targetId],armyId=city?'U-F01-G07':'U-F01-G24';
  if(!(city?cityAttackTargets(state,armyId):attackTargets(state,armyId)).includes(targetId))return false;
  stratagemUi=null;closeStratagemCamera();$('#c226-stratagem').hidden=true;diploOpen=false;infoLens=null;dangerMode=false;setV3Mode('world');
  selectedArmyId=armyId;selectedArmyIds=[armyId];selectedTacticId=null;menuOpen=true;attackMode=true;moveMode=false;
  const p=city?previewCityAttack(state,armyId,targetId):previewAttack(state,armyId,targetId);
  hoverSide=city?null:{tile:state.armies[targetId].tileId,side:p.side};render();frameBandArmy(armyId,.5,.48,(state.cities[targetId]??state.armies[targetId]).tileId);
  requestAnimationFrame(()=>requestAnimationFrame(()=>showMapLosses(targetId,p,city)));
  return {side:p.side,enemyLoss:city?p.dealt:p.enemyLoss,allyLoss:p.allyLoss,counter:p.counter};
 };
 const controls=document.createElement('aside');controls.className='c248-fixture-controls';controls.setAttribute('aria-label','C248 검증 손잡이');
 controls.innerHTML='<small>C248 검증 손잡이</small><button data-c248-preview="U-F02-G05">부대 손실 예고</button><button data-c248-preview="julu">성 손실 예고</button>';
 controls.onclick=e=>{const id=e.target.closest('[data-c248-preview]')?.dataset.c248Preview;if(id){e.stopPropagation();window.__c248HoverTarget(id);}};document.body.append(controls);
}

if(new URLSearchParams(location.search).get('c234fixture')==='pass'){
 state=createCampaign({map:'v2',seed:901,manualEndTurn:true,council:false,c31:false,c42:false,c43:false,c46:false});
 state=sortie(state,{cityId:'west',officerId:'G04',troopType:'spear',troopCount:200});
 const a=Object.values(state.armies).find(a=>a.commanderId==='G04'),ally=state.armies['U-F01-G07'];
 for(const t of Object.values(state.tiles))t.terrainType='plain';state.mapRules.blockedEdges=[];state.mapRules.riverEdges=[];
 a.tileId='6,3';ally.tileId='5,3';ally.mainActionTurn=state.turn;ally.mainActionCount=1;state.endedArmyIds.push(ally.armyId);
 state.armies['U-F02-G02'].tileId='9,3';state.armies['U-F02-G05'].tileId='10,3';
 state.ambitions.closed=true;state.runModifiers.blessing.closed=true;state.turnSummary=null;
 updateC229Knowledge(state);selectedArmyId=a.armyId;selectedArmyIds=[a.armyId];menuOpen=true;$('#selection').hidden=true;zoom=START_ZOOM;render();centerPlayer();
}

// C261: settings audio uses the existing shared audio preference.
document.addEventListener('ink:audio-settings',refreshAudio);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('#result').hidden&&!e.target.closest('input,button,a,summary')){e.preventDefault();e.stopImmediatePropagation();$('#result .rs-go').click();}},true);

// C273 assets are requested only by the opt-in presentation.
function c273Sync(){const on=ritualEnabled();if(on&&!document.querySelector('[data-c273-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/app/world/ritual.css';link.dataset.c273Style='';document.head.append(link);}if(!on)c273Ritual.close();if(state)render();}
document.addEventListener('ink:ritual-settings',c273Sync);
c273Sync();

// C300: common shortcut wording for help and settings.
const c300Keys='Q 병종 기술 · W 계통 엔진 · E 전법 · R 고유 전법 · M 이동 · A 공격 · F 정면 · B 방어 · S 재정비 · G 복귀 · H 대기';
const c300Help=document.querySelector('#rules-modal dd');if(c300Help)c300Help.textContent+=' · '+c300Keys;

// C311: presentation state only. The engine validates every submitted loadout.
let traitLoadoutUi=null;
function renderTraitLoadout(){
 let panel=document.querySelector('#c311-trait-loadout');
 if(!traitLoadoutUi){panel?.remove();return;}
 const o=view(state).officers[traitLoadoutUi.officerId];if(!o){traitLoadoutUi=null;panel?.remove();return;}
 if(!panel){panel=document.createElement('section');panel.id='c311-trait-loadout';panel.className='c311-trait-loadout';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','특기 바꾸기');document.body.append(panel);}
 panel.innerHTML=traitLoadoutPanelHtml(o,traitLoadoutUi.traitIds);
}
document.addEventListener('click',e=>{
 const open=e.target.closest('[data-trait-loadout]');
 if(open&&!open.disabled){e.stopPropagation();const o=view(state).officers[open.dataset.traitLoadout];if(!o||o.growth.traitLoadoutReason)return;traitLoadoutUi={officerId:o.officerId,traitIds:[...(o.growth.equippedTraitIds??[])],...(open.closest?.('.c327-dock')?{dockArmyId:selectedArmyId}:{})};renderTraitLoadout();document.querySelector('#c311-trait-loadout button')?.focus();return;}
 const panel=e.target.closest('#c311-trait-loadout');if(!panel||!traitLoadoutUi)return;e.stopPropagation();
 if(e.target.closest('[data-trait-close]')){traitLoadoutUi=null;renderTraitLoadout();return;}
 const pick=e.target.closest('[data-trait-toggle]');
 if(pick){const id=pick.dataset.traitToggle,ids=traitLoadoutUi.traitIds,index=ids.indexOf(id),limit=view(state).officers[traitLoadoutUi.officerId].growth.traitSlots;if(index>=0)ids.splice(index,1);else if(ids.length<limit)ids.push(id);renderTraitLoadout();return;}
 if(e.target.closest('[data-trait-apply]')){const dockArmyId=traitLoadoutUi.dockArmyId;command({type:'EQUIP_TRAITS',officerId:traitLoadoutUi.officerId,traitIds:[...traitLoadoutUi.traitIds]});traitLoadoutUi=null;renderTraitLoadout();if(dockArmyId&&view(state).ownArmies[dockArmyId]){selectedArmyId=dockArmyId;selectedArmyIds=[dockArmyId];menuOpen=true;render();}if(sortieUi)renderSortie();}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&traitLoadoutUi){e.stopImmediatePropagation();traitLoadoutUi=null;renderTraitLoadout();}},true);

// Flush before selection/menu handlers as well as engine commands. These capture
// listeners also cover keyboard commands whose handlers read current map DOM.
document.addEventListener('click',flushCombatSettlement394,true);
document.addEventListener('keydown',flushCombatSettlement394,true);

// C426: all guide observations use the same public view as the screen.
let guidePublic426=null,guideProbeQueued426=false,guideStartReplay426=false;
function observeGuideWorld426(v){
 if(state.prologue)return;
 if(guideCapitalThreat(v))showGuideReaction('event.capitalThreat',{once:true});
 if(v.heaven?.length)showGuideFirst('first.tianshi');
 const current={seed:state.campaignSeed,faction:v.factionId,cities:new Set(Object.keys(v.ownCities)),officers:new Set(v.faction.officerIds??[])};
 const old=guidePublic426;guidePublic426=current;
 if(old&&old.seed===current.seed&&old.faction===current.faction){
  if([...old.cities].some(id=>!current.cities.has(id)))showGuideReaction('event.cityLost');
  else if([...old.officers].some(id=>!current.officers.has(id)))showGuideReaction('event.officerLost');
 }
 for(const army of Object.values(v.ownArmies??{})){
  if(army.formation&&army.formation!=='ORDERED')showGuideFirst('first.line');
  if(army.morale&&army.morale!=='STEADY')showGuideFirst('first.morale');
 }
}
function reactGuideCombat426(c,units){
 if(!state.prologue)recordGuideCombat(c,units);
 if(c.uiNotice||c.uiSelfTactic)return;
 const actor=units.find(u=>u.id===c.attackerId),mine=actor&&!actor.enemy;
 if(!mine)return;
 if(c.uiCapturedIds?.some(id=>units.find(u=>u.id===id)?.enemy))showGuideReaction('event.officerCaptured');
 else if(c.captureLine)showGuideReaction('event.firstCapture',{once:true});
 else if(c.eliminatedIds?.some(id=>units.find(u=>u.id===id)?.enemy))showGuideReaction('event.firstWin',{once:true});
}
function probeGuideUi426(){
 guideProbeQueued426=false;if(!state||isPrologue(state))return;
 const visible=selector=>[...document.querySelectorAll(selector)].some(n=>n.getClientRects().length);
 if(visible('.w-move-boundary,.w-move'))showGuideFirst('first.zoc');
 if(visible('[data-gauge="100"],.tactic-face[data-gauge="100"]'))showGuideFirst('first.gauge');
 if(visible('#officer-draft:not([hidden]),#growth-modal:not([hidden])'))showGuideFirst('first.draft');
 if(visible('.fc-dur'))showGuideFirst('first.capture');
 if(visible('.ih-food-sheet:not([hidden])'))showGuideFirst('first.food');
 if(visible('#dejavu:not([hidden]),#c212-rewind-confirm:not([hidden])'))showGuideFirst('first.dejavu');
}
document.addEventListener('click',e=>{
 if(!state||isPrologue(state)||!selectedArmyId)return;
 const b=e.target.closest('[data-tactic],[data-c266-tactic]');if(!b)return;
 const card=campaignTactics(state,selectedArmyId).find(c=>c.traitId===(b.dataset.tactic??b.dataset.c266Tactic));
 if(card?.slot==='E')showGuideFirst('first.tacticE');
 else if(card?.slot==='R'||card?.signature)showGuideFirst('first.tacticR');
},true);
document.addEventListener('click',e=>{
 const button=e.target.closest('button[data-faction]');
 if(!button||guideStartReplay426||readGuidePreferences().guideId)return;
 e.preventDefault();e.stopImmediatePropagation();
 chooseGuide().then(accepted=>{if(accepted){guideStartReplay426=true;try{button.click();}finally{guideStartReplay426=false;}}}).catch(()=>{button.title='안내자 데이터를 읽지 못했습니다. 다시 눌러 주세요.';});
},true);
new MutationObserver(records=>{
 if(guideProbeQueued426||records.every(r=>r.target.closest?.('#c426-notice,#c426-reaction,#c225-prologue,.c426-selection')))return;
 guideProbeQueued426=true;requestAnimationFrame(probeGuideUi426);
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-gauge']});

// C490: v3 commands use the existing command/error/notification path.
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-dv3]');
 if(button&&!button.disabled&&!inputLocked()&&state.trialRules?.domesticV3){
  const request=JSON.parse(button.dataset.dv3),row=button.closest('.c490-seat');
  if(request.type==='DV3_SEAT'&&row)request.officerId=row.querySelector('select').value||null;
  command(request);return;
 }
 if(e.target.closest?.('[data-c490-map]'))closeStage();
 if(e.target.closest?.('[data-dv3-open]')){const local=e.target.closest('.c490-screen')?.querySelector('.c490-local-ledger');if(local)local.open=!local.open;else document.querySelector('#ink-hud [data-food-open]')?.click();}
});
