// @ts-check
import {fxPreferences,symImg,headOf,dockIcon327} from './hud-ink.mjs';
import {troopMatchupBrief} from './c207-info.mjs';
// 운명 드래프트 — 세력을 고른 뒤, 군주와 함께 깨어날 다섯 사람을 고르는 화면(기준 그림 final-draft).
// 규칙은 /src/campaign-officer-draft.mjs 가 맡는다(정본 SG_OFFICER_DRAFT_FACTION_GIMMICKS v0.1 §1 공통 규칙 · §2 세력 기믹). 여기는 그리기와 누르기만.
//   · 5장을 한 번에 본다 → 카드를 누르면 살펴보고(능력치), '깨운다'를 누르면 그 사람은 확정(잠금) → 남은 자리만 다시 부른다 → 다섯이 그릇(예산) 안이면 시작.
//   · 연출 "석각에서 사람으로"(2026-10-11, 사용자와 함께 다듬음 — SG DRAFT CINEMATIC v4.0 초안 + 사용자 "아주 흐린 석각 > 형태가 조금 생김 > 깨어남"):
//       군주가 부른다(세력 선택에서 넘어올 때) → 석판 다섯이 솟는다 → 아주 흐린 석각 → 부조가 선다 → 먹선 → 얼굴부터 색이 번진다 → 깨어난 후보(옅은 색)
//       깨운다 = 온전한 색 + 세력 색 붓획 + 인장, 얼굴이 아래 자리로 날아가 찍힌다 / 다시 부른다 = 색이 빠지고 돌로 돌아가 닳은 뒤 새 사람이 새겨진다
//       다섯이 차면 자리 줄이 차례로 울리고, 출정하면 여섯이 함께 선 뒤 세력 깃발이 화면을 쓸고 지도가 열린다.
//     상태는 셋: 돌(잠든 사람) · 옅은 색(깨어난 후보) · 온전한 색(인연이 정해진 사람). 등급·비용에 따른 빛은 쓰지 않는다.
//     석각 그림은 장수 그림에서 계산한 판(<그림 이름>-relief.webp, tools/design/officer-relief.py) — 같은 자세라 겹쳐 놓고 바꾼다.
//     주소에 ?fx=0 이거나 '움직임 줄이기' 설정이면 연출 없이 바로 뜬다. 연출 중 아무 데나 누르면 건너뛴다.
// @ts-ignore — 서버 주소(/src/…)로 불러오는 모듈은 타입 검사가 파일을 못 찾는다
import {createOfficerDraft, officerDraftView, lockDraftOfficer, rerollOfficerDraft, officerDraftCompanions} from '/src/campaign-officer-draft.mjs';
// @ts-ignore — browser module URL
import {createCampaign} from '/src/campaign-runtime.mjs';
// @ts-ignore — browser module URL
import {campaignOfficerGrowth} from '/src/campaign-growth.mjs';

import {engineView} from '/src/campaign-engines.mjs';
// Packaged copy of prototype/data/officer-pitch-v0.1.json; parity is tested.
import officerPitches from '/assets/ui-kit/own/screens-v6/draft/officer-pitch-v0.1.json' with {type:'json'};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
/** 카드 맨 위 한 줄: 왜 이 사람이 나타났는가(정본 §1.3 Weighted Fate 의 까닭을 플레이어 말로) */
const REASON = {
  BOND: '옛 인연이 먼저 부른다', NEED_GOVERN: '다스릴 사람이 비어 있다', NEED_COMMAND: '군을 맡길 사람이 비어 있다', NEED_MIGHT: '앞장설 사람이 비어 있다',
  NEED_INTELLECT: '꾀를 낼 사람이 비어 있다', NEED_CHARISMA: '사람을 모을 이가 비어 있다', WANDER: '떠돌다 이 땅에 닿았다',
};
/** 세력 기믹 한 줄(정본 §2 — 이 지도에 있는 세 세력) */
const GIMMICK = {
  F01: '조조 — 더 많이 보고 필요한 사람을 고른다 · 다시 부르기가 한 번 더 있다',
  F02: '유비 — 인연이 인연을 부른다 · 깨운 사람의 옛 벗이 더 잘 나타난다',
  F03: '손권 — 찾는 일을 맡긴다 · 아래 얼굴을 눌러 맡길 사람을 정하고 다시 부른다',
};
const STATS = ['지휘', '무용', '지략', '정무', '감화'];
/** 실제 출정과 같은 초기화에서 현재 가진 카드만 읽는다. 성장 후보/미보유 카드는 영입 효과로 약속하지 않는다.
 * 계산용 새 판은 표시 자료만 만들며, 진행 중인 판·드래프트 RNG·저장소를 바꾸지 않는다.
 * @param {{factionId:string,seed:number,companions:string[]}} input
 */
export function draftOfficerBriefs(input) {
  const preview = createCampaign({...input, map: 'v3', fieldArmies: false});
  return Object.fromEntries(input.companions.map((id) => {
    const growth = campaignOfficerGrowth(preview, id);
    const core = growth?.cards.find((c) => c.traitId === `${id}.unique`);
    const signature = growth?.cards.find((c) => c.traitId === growth.signature?.traitId)
      ?? growth?.cards.find((c) => c.kind === 'tactic');
    return [id, {
      engine: engineView(preview,id),
      pitch: officerPitches.pitches[id] ?? '',
      trait: core ? {name: core.name, text: core.text || '효과 설명 준비 중'} : null,
      troopType: preview.officers[id]?.troopType,
      troopTypes: preview.officers[id]?.multiTroopTrait?.troopTypes??[preview.officers[id]?.troopType],
      matchup: troopMatchupBrief(preview,id),
      tacticE: growth?.cards.find(c=>c.pilot&&c.slot==='E')??null,
      tactic: signature ? {...signature, text: signature.text || '효과 설명 준비 중'} : null,
    }];
  }));
}

const draftTroop = type => ({militia:['sword','도'],spear:['spear','창'],bow:['bow','궁'],cavalry:['cavalry','기']})[type];
export function draftDetailMarkup(card,brief, v=null){
 if(!v) {
  const troop=draftTroop(brief?.troopType);
  return `<small class="od-reason">${esc(REASON[card?.reasonCode]??'')}</small><p tabindex="0"><b>고유 특기 · ${esc(brief?.trait?.name??'준비 중')}</b> ${esc(brief?.trait?.text??'효과 설명 준비 중')}</p><p tabindex="0"><b>고유 전법(R) · ${esc(brief?.tactic?.name??'준비 중')}</b> ${esc(brief?.tactic?.text??'효과 설명 준비 중')}</p>${brief?.tacticE?`<p tabindex="0"><b>고유 전법(E) · ${esc(brief.tacticE.name)}</b> ${esc(brief.tacticE.text)}</p>`:''}${troop?`<small title="${esc(brief?.matchup??'')}">${symImg('troops',troop[0],{size:'sm',paper:true})}${esc(brief?.matchup??troop[1])}</small>`:''}`;
 }
 const e=brief?.engine, d={name:card?.name,officer:{officerId:card?.officerId,name:card?.name},army:{commanderId:card?.officerId,troopType:brief?.troopType,engine:e}};
 const abilityRow=(kind,label,c,cls)=>{
  const tip=`od-unique-${card?.officerId}-${kind}`;
  return `<div class="od-unique-row ${cls}"><div class="od-unique-icon" tabindex="0" role="img" aria-label="${label} ${esc(c?.name??'준비 중')}" aria-describedby="${tip}">${dockIcon327(d,kind,c??{})}<aside id="${tip}" role="tooltip"><b>${label} · ${esc(c?.name??'준비 중')}</b><span>${esc(c?.text??'효과 설명 준비 중')}</span>${kind==='R'?`<small>${[Number.isFinite(c?.range)?`사거리 ${c.range}`:'',Number.isFinite(c?.gaugeCost)?`공유 게이지 ${c.gaugeCost}`:''].filter(Boolean).join(' · ')}</small>`:''}</aside></div><p><b>${label} · ${esc(c?.name??'준비 중')}</b><span>${esc(c?.text??'효과 설명 준비 중')}</span></p></div>`;
 };
 return `<div class="od-detail-title"><h2>${esc(card?.name)}</h2><span>${(brief?.troopTypes??[]).map(t=>{const x=draftTroop(t);return x?`${symImg('troops',x[0],{size:'sm'})}${x[1]}`:'';}).join(' · ')}</span><span>${e?`<img src="/assets/ui-kit/own/class-v1/${esc(e.engineId.toLowerCase())}.png" alt="">${esc(e.name)}`:''}</span></div>
 <p class="od-pitch" data-officer-pitch="${esc(card?.officerId)}" data-draft="${officerPitches.draft}">${esc(brief?.pitch)}</p>
 <ul class="od-detail-stats">${STATS.map(k=>`<li><span>${k} <b>${card?.stats?.[k]??'?'}</b></span><i><u style="width:${Math.max(0,Math.min(100,card?.stats?.[k]??0))}%"></u></i></li>`).join('')}</ul>
 <div class="od-abilities">${abilityRow('passive','고유 특기',brief?.trait,'od-trait')}
 ${abilityRow('R','고유 전법',brief?.tactic,'od-tactic')}${brief?.tacticE?`<div class="od-extra-e"><b>고유 전법(E) · ${esc(brief.tacticE.name)}</b><span>${esc(brief.tacticE.text)}</span></div>`:''}</div>`;
}
/** The one wake action belongs to the candidate strip, outside the detail panel. */
export function draftWakeMarkup(card,v){
 const shortage=Math.max(0,(card?.cost??0)-(v.budget-v.lockedCost)),blocked=card?.locked||card?.lockBlocked||v.ended;
 const label=card?.locked?'깨어남':shortage?`그릇 모자람 · ${shortage} 부족`:v.ended?'다섯 자리 가득':`${card?.name} 깨운다 · ${card?.cost}`;
 return `<button class="od-detail-wake k-btn-primary" data-wake="${esc(card?.officerId)}"${blocked?' disabled':''}>${esc(label)}</button>`;
}
const fxOn = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('fx') !== '0' && !fxPreferences.reduced(); } catch { return true; } };
const reliefOf = (/** @type {string} */ src) => src.replace(/\.\w+(\?.*)?$/, '-relief.webp');
const bustOf = (/** @type {string} */ id) => `/assets/officer-art/bust/${id}.webp`;
/** Inspection previews cost without spending it. */
export function draftBudgetMarkup(v, focus) {
  const card = v.cards.find(c => c.officerId === focus && !c.locked);
  const preview = card?.cost ?? 0, remaining = v.budget - v.lockedCost;
  const shortage = Math.max(0, preview - remaining);
  const dots = Array.from({length:v.budget}, (_,i) => `<i class="od-dot${i < v.lockedCost ? ' filled' : i < v.lockedCost + preview ? shortage ? ' shortage' : ' preview' : ''}"></i>`).join('');
  return `<span class="od-budget-total">그릇 <b>${v.lockedCost}</b> / ${v.budget}</span><span class="od-budget-dots" aria-hidden="true">${dots}</span><small class="od-budget-count">깨어난 장수 ${v.lockedCount} / ${v.slots}</small><small class="od-budget-preview${shortage ? ' shortage' : ''}">${preview ? `미리보기 +${preview}${shortage ? ` · ${shortage} 부족` : ''}` : ''}</small>`;
}

// Measured stone portraits; failed/missing assets retain the filtered original.
let stoneFiles = {};
// Only offered portraits are warmed. Reuse decoded resources across inspection,
// locking and rerolls so a rebuilt card can start its 0.8s fade immediately.
const stoneImages = new Map();
function preloadStone(src) {
  const item = stoneEntry(src); if (!item) return null;
  if (!stoneImages.has(item.src)) {
    const image = document.createElement('img');
    image.decoding = 'async'; image.loading = 'eager';
    image.width = item.size[0]; image.height = item.size[1];
    image.src = item.src; stoneImages.set(item.src, image);
  }
  return stoneImages.get(item.src);
}
export function stoneEntry(src, files = stoneFiles) {
  const id = /(?:^|\/)(G\d+)(?:[-./]|$)/.exec(String(src))?.[1];
  const item = files[id];
  return item && /^\/assets\/officer-art\/stone\/[\w.-]+\.(png|webp)$/.test(item.src) ? item : null;
}
/** Painted portraits have their own measured head; color keeps heads.json anchors. */
export function stoneHeadStyle(head) {
  if (!head?.size || !head?.head) return '';
  const [x,y,s] = head.head, [w,h] = head.size, half = s*w/2;
  const x0 = Math.max(0,Math.min(w-2*half,x*w-half)), y0 = Math.max(0,Math.min(h-2*half,y*h-half));
  return `--hx:${x};--hy:${y};--hs:${s};--ar:${w/h};--ovb-face:inset(${y0/h*100}% ${(w-x0-2*half)/w*100}% ${(h-y0-2*half)/h*100}% ${x0/w*100}%);`;
}
function hydrateStone(node) {
  const surfaces = [...(node.matches?.('.sg-stone') ? [node] : []), ...(node.querySelectorAll?.('.sg-stone') ?? [])];
  for (const surface of surfaces) {
    if (surface.dataset.stonePending) continue;
    const src = surface.querySelector('.sg-stone-face')?.getAttribute('src');
    const item = stoneEntry(src); if (!item || !headOf(src)) continue;
    surface.dataset.stonePending = '1';
    const resource = preloadStone(src);
    const attach = () => {
      if (!surface.isConnected || !resource.naturalWidth) return;
      const image = resource.cloneNode(false);
      image.className = 'sg-stone-painted'; image.alt = ''; image.setAttribute('aria-hidden','true');
      image.style.cssText = stoneHeadStyle(item.head ? item : headOf(src));
      surface.append(image); surface.classList.add('has-stone-art');
    };
    if (resource.complete) attach();
    else resource.addEventListener('load', attach, {once:true});
  }
}
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
  fetch('/assets/officer-art/stone/index.json').then(r => r.ok ? r.json() : null).then(j => {
    stoneFiles = j?.files ?? {}; hydrateStone(document.documentElement);
  }).catch(() => {});
  document.addEventListener('ink:heads', () => hydrateStone(document.documentElement));
  new MutationObserver(records => { for (const r of records) for (const node of r.addedNodes) if (node.nodeType === 1) hydrateStone(node); })
    .observe(document.documentElement,{childList:true,subtree:true});
}
/** Ruler markup is owned by world.js; adapt only its kit labels in this screen module. */
export function matchRulerLabels372(root) {
  const label = root.querySelector('#start-go span:not(.k-grain)');
  if (label && label.textContent !== '동료 고르기 →') label.textContent = '동료 고르기 →';
  const summary = root.querySelector('.c298-start-summary');
  for (const node of summary?.childNodes ?? []) {
    if (node.nodeType === 3 && node.textContent?.includes('시작 도시') && node.textContent !== '시작 도시는 판마다 무작위.') node.textContent = '시작 도시는 판마다 무작위.';
  }
  const motto = root.querySelector('.c251-start[data-faction="F01"] .c251-motto');
  if (motto?.textContent === '규격으로 묶는 천하') motto.textContent = '규약으로 묶는 천하';
  const companions = root.querySelector('.c251-features>h3:nth-of-type(2)');
  if (companions && companions.textContent !== '동료 소개') companions.textContent = '동료 소개';
  // The pre-cropped busts have unequal zoom. Full art receives the existing
  // heads.json observer's --hx/--hy/--hs anchors, just like draft portraits.
  for (const img of root.querySelectorAll?.('.c251-lords .k-medallion>img') ?? []) {
    const button = img.parentElement;
    const art = root.querySelector(`.w-lord[data-pick="${button.dataset.startPick}"] .art`);
    const src = /url\(["']?([^"')]+)/.exec(art?.getAttribute('style') ?? '')?.[1];
    if (!src) continue;
    const frame = document.createElement('span'); frame.className = 'c379-face';
    img.replaceWith(frame); frame.append(img); img.src = src;
  }
}
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined' && document.documentElement?.dataset.ui === 'kit') {
  const rulerHost = document.querySelector('#selection');
  if (rulerHost) {
    const observer = new MutationObserver(() => matchRulerLabels372(rulerHost));
    observer.observe(rulerHost, {childList: true, subtree: true});
    matchRulerLabels372(rulerHost);
  }
}
const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));
// 연출 길이(ms) — CSS 의 --dur 과 같은 값
const T = {call: 1500, first: 1900, fast: 1050, stagger: 90, leave: 560, press: 90, fly: 300, awake: 2300, sweep: 950};
/** 출정 장면에서 여섯 사람이 서는 자리(화면 대비 %): 군주 양옆 둘 · 바깥 둘 · 군주 뒤로 머리만 보이는 하나, 앞줄 가운데 군주. [가로, 머리 가운데 높이, 머리 크기] */
const AWAKE_SPOTS = [[30, 30, 13], [70, 30, 13], [13, 27, 11.5], [87, 27, 11.5], [50, 15.5, 10.5]];
const AWAKE_RULER = [50, 41, 16.5];

/**
 * @param {HTMLElement} host 화면을 그릴 자리(#officer-draft)
 * @param {{factionId:string, seed:number, ruler:{id:string,name:string}, art:(id:string)=>string|undefined, onConfirm:(companions:string[])=>void, onBack:()=>void, sfx?:(name:string)=>void, intro?:boolean}} o
 *   intro: 세력 선택에서 막 넘어온 것이면 true — '군주가 부른다' 장면을 먼저 보인다
 */
export function openOfficerDraft(host, o) {
  let draft = createOfficerDraft({factionId: o.factionId, seed: o.seed});
  /** @type {string|null} */ let focus = null;let focusCleared=false;
  /** @type {string|null} */ let owner = null;   // 손권: 찾는 일을 맡길 사람
  /** @type {string|null} */ let woke = null;    // 방금 깨운 사람(연출 한 번)
  let note = '';
  let briefKey = '';
  /** @type {ReturnType<typeof draftOfficerBriefs>} */ let briefs = {};
  const fx = fxOn();
  const modern = new URLSearchParams(globalThis.location?.search ?? "").get("start") !== "old";
  const bookend = modern && document.documentElement?.dataset.ui === 'kit';
  /** @type {Set<string>} */ let shown = new Set();   // 바로 앞 그림에 있던 카드 — 여기에 없던 카드만 '돌에서 깨어난다'
  let busy = false;                                    // 누름 · 다시 부르기 · 출정 연출이 도는 동안 다른 입력을 받지 않는다
  let enterUntil = 0;                                  // 등장 연출이 끝나는 시각(performance.now) — 그 전에 누르면 건너뛴다
  let wasFull = false;
  /** @type {Record<string,string>} */ const names = {};
  const root = document.createElement('div'); root.className = modern ? `od-root c247-draft c251-draft${bookend?' c404-v6':''}` : 'od-root'; host.replaceChildren(root);
  root.style.setProperty('--od-em', `url("/assets/ui-v3/emblems/${o.factionId}.png")`); // 깨운 카드의 붉은 인장에 찍히는 세력 문장(기준 final-draft)
  const section = () => /** @type {HTMLElement|null} */ (root.querySelector('.od'));

  const render = (/** @type {''|'first'|'reroll'} */ mode = '', d0 = 0) => {
    const v = officerDraftView(draft), g = /** @type {any} */ (v).gimmick ?? {};
    const canDelegate = o.factionId === 'F03' && v.canReroll;
    if (owner && owner !== o.ruler.id && !draft.locked.includes(owner)) owner = null;
    const lockedCards = draft.locked.map((id) => v.cards.find((c) => c.officerId === id)).filter(Boolean);
    const nextKey = draft.offers.join('|');
    if (briefKey !== nextKey) {
      briefs = draftOfficerBriefs({factionId: o.factionId, seed: o.seed, companions: draft.offers});
      briefKey = nextKey;
    }
    if (modern && !focusCleared && !v.cards.some(c=>c.officerId===focus)) focus=v.cards[0]?.officerId??null;
    let entering = 0;
    const cards = v.cards.map((c) => {
      const src = o.art(c.officerId), on = focus === c.officerId;
      if (bookend && typeof MutationObserver !== 'undefined') preloadStone(src);
      const brief = briefs[c.officerId], trait = brief?.trait, tactic = brief?.tactic;
      const benefitId = `od-benefit-${c.officerId}`, detailId = `od-detail-${c.officerId}`;
      names[c.officerId] = c.name;
      const fresh = fx && !c.locked && !shown.has(c.officerId);
      const stats = STATS.map((k) => `<li><span>${k}</span><i><u style="width:${Math.max(0, Math.min(100, c.stats?.[k] ?? 0))}%"></u></i><b>${c.stats?.[k] ?? '—'}</b></li>`).join('');
      const layers = (fx || bookend) && src ? `<i class="od-slash" aria-hidden="true"></i><img class="od-relief" src="${esc(reliefOf(src))}" alt="" aria-hidden="true" draggable="false" onerror="this.remove()"><img class="od-ink" src="${esc(src)}" alt="" aria-hidden="true" draggable="false">` : '';
      const wakeButton = c.locked || v.ended ? '' : `<button class="od-wake${modern ? ' k-btn' : ''}" data-wake="${esc(c.officerId)}"${c.lockBlocked ? ' disabled title="이 사람을 깨우면 그릇을 넘는다"' : ''}>${c.lockBlocked === 'BUDGET' ? (bookend ? '모자람' : '그릇이 모자라다') : '깨운다'}</button>`;
      return `<div class="od-card${c.locked ? ' locked' : ''}${on ? ' focus' : ''}${c.officerId === woke ? ' woke' : ''}${c.home ? ' home' : ''}${fresh ? ' enter' : ''}"${fresh ? ` style="--i:${entering++}"` : ''} data-id="${esc(c.officerId)}" role="button" aria-label="${esc(c.name)} · ${c.cost}" tabindex="${!modern && v.ended ? -1 : 0}" aria-disabled="${!modern && v.ended}" aria-pressed="${c.locked}" aria-expanded="${on}" aria-controls="${modern ? 'od-shared-detail' : detailId}" aria-describedby="${modern ? 'od-shared-detail' : benefitId}">
        ${modern ? '' : `<span class="od-why">${esc(REASON[c.reasonCode] ?? REASON.WANDER)}</span>`}
        <span class="od-art${bookend ? ' sg-stone' : ''}">${bookend ? '<span class="sg-stone-surface">' : ''}${layers}${src ? `<img class="od-color" src="${esc(src)}" alt="${esc(c.name)}" draggable="false">` : `<b class="od-initial">${esc(String(c.name).slice(0, 1))}</b>`}${bookend ? '</span>' : ''}${bookend && src ? `<span class="sg-stone-features"><img class="sg-stone-face" src="${esc(src)}" alt="" aria-hidden="true" draggable="false"></span>` : ''}</span>
        ${modern ? '' : `<span class="od-benefit" id="${benefitId}"><strong>${esc(trait?.name ?? '고유 특기')}</strong><span>${esc(trait?.text ?? '효과 설명 준비 중')}</span><em>눌러서 전법·능력치 보기</em></span>
        <div class="od-details" tabindex="0" id="${detailId}"${on ? '' : ' hidden'}>
          <p><small>고유 특기 · ${esc(trait?.name ?? '준비 중')}</small>${esc(trait?.text ?? '효과 설명 준비 중')}</p>
          ${tactic ? `<p><small>시작 전법 · ${esc(tactic.name)}</small>${esc(tactic.text)}</p>` : '<p>시작 전법 설명 준비 중</p>'}
          <ul class="od-stats">${stats}</ul>
        </div>
        `}

        ${bookend ? `<span class="od-cost-stamp" data-cost="${c.cost}" aria-label="비용 ${c.cost}"><span class="od-cost-ink">${c.cost}</span></span><span class="od-cost-dots" aria-hidden="true">${'<i class="od-dot filled"></i>'.repeat(c.cost)}</span>` : ''}<span class="od-plate">${c.locked || v.ended || bookend ? '' : wakeButton}<b>${esc(c.name)}</b><small>${(brief?.troopTypes??[brief?.troopType]).map(t=>draftTroop(t)?symImg('troops',draftTroop(t)[0],{size:'sm'}):'').join('')}${esc(c.style ?? c.role ?? '')}</small><i class="od-cost"${bookend ? ' hidden' : ''} title="무게 ${c.cost} — 깨운 사람의 무게 합이 그릇 안이어야 한다">${modern ? '그릇 ' : ''}${c.cost}</i>${c.locked && !modern ? '<em class="od-seal" aria-hidden="true">印</em>' : ''}</span>
        ${modern ? `<ul class="od-card-stats" aria-label="능력치">${STATS.map(k=>`<li><span>${k}</span> <b>${c.stats?.[k] ?? '—'}</b></li>`).join('')}</ul>` : ''}
        ${c.locked && modern ? bookend ? '<em class="od-seal">고정됨</em>' : '<em class="od-seal" aria-hidden="true">✓</em>' : ''}
        ${bookend ? `<span class="c298-card-judgment">${esc(trait?.name ?? REASON[c.reasonCode] ?? REASON.WANDER)}</span>` : ''}
      </div>`;
    }).join('');
    const slot = (id, name, cls = '') => { const src = id && o.art(id); return `<li class="${cls}${modern ? ' k-medallion' : ''}${owner === id && canDelegate ? ' owner' : ''}"${id && canDelegate ? ` data-owner="${esc(id)}" role="button" tabindex="0" title="${esc(name)}에게 찾는 일을 맡긴다"` : name ? ` title="${esc(name)}"` : ''}>${src ? `<i style="--face:url(${esc(src)})"></i>` : ''}</li>`; };
    const full = v.ended, justFull = fx && full && !wasFull; wasFull = full;
    const legacySlots = [slot(o.ruler.id, o.ruler.name, `ruler filled${mode === 'first' && d0 ? ' pop late' : ''}`), ...lockedCards.map((c) => slot(c.officerId, c.name, c.officerId === woke ? 'filled pop' : 'filled')), ...Array.from({length: Math.max(0, draft.slots - lockedCards.length)}, () => slot(null, ''))].join('');
    const slots = bookend ? Array.from({length:draft.slots},(_,i)=>{const c=lockedCards[i],src=c&&o.art(c.officerId);return `<li class="od-companion${c?' filled':''}${c?.officerId===woke?' pop':''}">${c?`<button data-inspect="${esc(c.officerId)}" aria-label="${esc(c.name)} 살펴보기"><span class="od-companion-face">${src?`<img src="${esc(src)}" alt="">`:''}</span><b>${esc(c.name)}</b><small>${c.cost}</small></button>`:'<span class="od-companion-face empty" aria-hidden="true"><img src="/assets/ui-kit/own/screens-v6/draft/empty-seat.png" alt=""></span><b>—</b>'}</li>`;}).join('') : legacySlots;
    const endNote = v.endReason === 'SLOTS_FULL' ? '다섯을 모두 깨웠다' : v.ended ? `그릇이 찼다 — ${['', '한 명', '두 명', '세 명', '네 명', '다섯 명'][draft.locked.length]}과 함께 깨어난다` : '';
    const dur = mode === 'reroll' ? T.fast : T.first;
    root.innerHTML = `<section class="od${fx ? ' fx' : ''}${mode === 'reroll' ? ' fast' : ''}" data-faction="${esc(o.factionId)}" style="--dur:${dur}ms;--d0:${d0}ms" aria-label="함께 깨어날 사람 고르기">
      ${bookend ? `<figure class="c298-draft-hero">${o.art(focus) ? `<img src="${esc(o.art(focus))}" alt="">` : ''}<figcaption>${esc(v.cards.find(c=>c.officerId===focus)?.name)}</figcaption></figure>` : ''}
      <button class="od-back${modern ? ' k-btn' : ''}" data-act="back" title="세력을 다시 고른다">${symImg('controls','prev',{size:'sm'})}${modern ? '세력 고르기' : '세력'}</button>
      <header class="od-head"><h1 id="od-title"><small>새 판 2/2 · 동료 고르기</small>누구와 함께 깨어나는가</h1><p>${esc(GIMMICK[o.factionId] ?? '')}</p></header>
      <p class="od-budget" title="깨운 사람 무게 합 · 다섯까지, 다 채우지 않아도 된다(시험값)">${bookend ? draftBudgetMarkup({...v,lockedCount:draft.locked.length,slots:draft.slots},focus) : `<span>그릇</span><b>${v.lockedCost}</b><i>/ ${v.budget}</i><small>${modern ? '깨어난 장수' : '깨운 사람'} ${draft.locked.length} / ${draft.slots}</small>${modern ? '' : '<small>다섯까지 · 다 채우지 않아도 된다</small>'}`}</p>
      <p class="od-note${bookend && (endNote || note) ? ' has-message' : ''}" role="status">${esc(bookend ? (endNote || note) : endNote || note || (v.canConfirm ? '깨울 사람을 고른다 · 이대로 시작해도 된다' : '두 사람부터 시작한다(성 · 군대)'))}</p>
      <div class="od-cards">${cards}</div>
      ${bookend ? `<div class="od-draft-action" id="od-draft-action" aria-label="선택한 동료 깨우기">${draftWakeMarkup(v.cards.find(c=>c.officerId===focus),v)}</div>` : ''}
      ${modern ? `<section class="od-shared-detail k-card-paper" id="od-shared-detail" aria-live="polite">${draftDetailMarkup(v.cards.find(c=>c.officerId===focus),briefs[focus],bookend?v:null)}</section>` : ''}
      ${bookend ? `<section class="od-companions"><h2>내 동료</h2><ol class="od-companion-slots" aria-label="고른 동료">${slots}</ol></section>` : ''}
      <footer class="od-foot">
        <button class="od-reroll${modern ? ' k-btn' : ''}" id="od-reroll" data-act="reroll"${v.canReroll ? '' : ' disabled'} title="깨우지 않은 자리만 새 사람으로 바꾼다. 한 번 물린 사람은 이번에는 다시 나타나지 않는다${g.extraRerolls ? ` · 조조 추가 ${g.extraRerolls}회` : ''}"><b>${bookend ? `↻ 다시 부르기 · ${v.rerollsLeft}` : modern ? '↻ 다시 부르기' : '다시 부른다'}</b>${bookend ? '' : `<small>남은 기회 ${v.rerollsLeft}${g.extraRerolls ? ` (조조 +${g.extraRerolls})` : ''}</small>`}</button>
        <ol class="od-slots${bookend?' od-owner-slots':''}${justFull ? ' full' : ''}" aria-label="${canDelegate ? '찾는 일을 맡길 사람' : '고른 동료'}">${bookend ? (canDelegate ? slot(o.ruler.id,o.ruler.name,'ruler filled')+lockedCards.map(c=>slot(c.officerId,c.name,'filled')).join('') : '') : slots}</ol>
        <button class="od-confirm${modern ? ' k-btn-primary' : ''}${fx && full && v.canConfirm ? ' ready' : ''}" id="od-confirm" data-act="confirm" title="${v.canConfirm ? '고른 동료와 시작한다' : '두 사람부터 시작한다(성 · 군대)'}"${v.canConfirm ? '' : ' disabled'}>${modern ? '<span class="k-grain" aria-hidden="true"></span>' : ''}<b>${bookend ? '이 조합으로 시작 ›' : modern ? '이 조합으로 깨어나기 →' : '이대로 깨어난다'}</b></button>
      </footer>
    </section>`;
    if (fx && entering) enterUntil = performance.now() + d0 + dur + (entering - 1) * T.stagger + 250;
    if (fx && woke) fly(woke,null,bookend?'.od-companion.pop':'.od-slots li.pop:not(.ruler)');
    woke = null; note = ''; shown = new Set(v.cards.map((c) => c.officerId));
  };

  /** 얼굴이 아래 자리로 날아간다(자리는 도착할 때 인장처럼 찍힌다 — CSS .pop). from = 출발 자리(화면 좌표, 없으면 그 사람 카드의 머리쯤) */
  const fly = (/** @type {string} */ id, /** @type {{x:number,y:number,size:number}|null} */ from = null, target = '.od-slots li.pop:not(.ruler)') => {
    const sec = section(); if (!sec?.animate) return;
    const dst = sec.querySelector(target), b = dst?.getBoundingClientRect(), s = sec.getBoundingClientRect(); if (!b) return;
    if (!from) { const a = sec.querySelector(`.od-card[data-id="${id}"] .od-art`)?.getBoundingClientRect(); if (!a) return; from = {x: a.left + a.width / 2, y: a.top + a.height * .2, size: a.width * .46}; }
    const el = document.createElement('i'); el.className = 'od-fly'; el.style.setProperty('--face', `url(${bustOf(id)})`); sec.append(el);
    const box = (x, y, w) => ({left: `${x - s.left - w / 2}px`, top: `${y - s.top - w / 2}px`, width: `${w}px`});
    const p0 = box(from.x, from.y, from.size), p1 = box(b.left + b.width / 2, b.top + b.height / 2, b.width);
    el.animate([{...p0, opacity: 0}, {...p0, opacity: 1, offset: .14}, {...p1, opacity: 1}], {duration: T.fly, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards'}).finished.then(() => el.remove(), () => el.remove());
  };

  /** 세력 선택에서 넘어올 때: 군주가 한 걸음 나와 부른다 → 석판이 솟는다 */
  const call = () => {
    const src = o.art(o.ruler.id); if (!src) return;
    const el = document.createElement('div'); el.className = 'od-call'; el.dataset.faction = o.factionId;
    el.innerHTML = `<i class="oc-wash" aria-hidden="true"></i><figure class="oc-fig"><img src="${esc(src)}" alt="${esc(o.ruler.name)}" draggable="false"></figure>
      <div class="oc-name"><b>${esc(o.ruler.name)}</b><small>잠들었던 이름들을 부른다</small><em aria-hidden="true">印</em></div>`;
    host.append(el);
    const end = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 320); };
    setTimeout(() => {   // 군주의 얼굴이 첫 자리로
      const im = /** @type {HTMLElement|null} */ (el.querySelector('.oc-fig img')); if (!el.isConnected || !im) return;
      const r = im.getBoundingClientRect(), num = (k, d) => parseFloat(im.style.getPropertyValue(k)) || d, side = r.width * num('--hs', .2);
      fly(o.ruler.id, {x: r.left + r.width * num('--hx', .5), y: r.top + r.height * num('--hy', .1), size: side}, '.od-slots li.ruler');
    }, T.call - 420);
    setTimeout(end, T.call - 120);
    return end;
  };
  /** @type {(() => void)|undefined} */ let endCall;

  /** 연출을 건너뛴다(등장 · 부르는 장면) */
  const skip = () => { endCall?.(); section()?.classList.add('skip'); enterUntil = 0; };

  // 출정: 군주와 다섯이 함께 선다 → 세력 깃발이 화면을 쓸고 지나가는 동안 판을 연다 → 지도
  const awaken = (/** @type {string[]} */ companions) => {
    busy = true; host.removeEventListener('pointerover',inspect);host.removeEventListener('focusin',inspect);host.removeEventListener('click', act); host.removeEventListener('keydown', key);
    const fig = (id, name, spot, i, cls = '') => { const src = id && o.art(id); return `<figure class="oa-fig${cls}" style="--x:${spot[0]}%;--y:${spot[1]}%;--k:${spot[2] / 100};--i:${i}">${src ? `<img src="${esc(src)}" alt="${esc(name)}" draggable="false">` : ''}</figure>`; };
    root.innerHTML = `<section class="od od-awake" data-faction="${esc(o.factionId)}" aria-label="출정" tabindex="0">
      <i class="oa-dim" aria-hidden="true"></i>
      ${companions.slice(0, 5).map((id, i) => fig(id, names[id] ?? '', AWAKE_SPOTS[i], i)).join('')}
      ${fig(o.ruler.id, o.ruler.name, AWAKE_RULER, 5, ' ruler')}
      <i class="oa-veil" aria-hidden="true"></i>
      <header class="oa-head"><h1>다시, 천하로</h1><p>${esc(o.ruler.name)}${companions.length ? ` · ${companions.slice(0, 5).map((id) => names[id] ?? '').filter(Boolean).join(' · ')}` : ''}</p></header>
      <small class="oa-skip">누르면 바로 시작</small>
    </section>`;
    o.sfx?.('confirm');
    let gone = false;
    /** @type {any} */
    let t1 = 0;
    const go = () => {
      if (gone) return; gone = true; clearTimeout(t1); host.removeEventListener('click', go); host.removeEventListener('keydown', onKey);
      const flag = document.createElement('i'); flag.className = 'od-sweep'; flag.dataset.faction = o.factionId; host.append(flag); o.sfx?.('page');
      setTimeout(() => {                                   // 깃발이 화면을 다 덮었다 — 그 아래에서 석실을 걷고 판을 연다(무거운 계산이 가려진다)
        root.innerHTML = ''; host.classList.add('leaving');
        try { restoreSelection(); o.onConfirm(companions); } finally { requestAnimationFrame(() => { flag.classList.add('out'); setTimeout(() => { flag.remove(); host.hidden = true; host.classList.remove('leaving'); }, T.sweep * .6 + 60); }); }
      }, T.sweep * .45);
    };
    const onKey = (/** @type {KeyboardEvent} */ e) => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); go(); } };
    host.addEventListener('click', go); host.addEventListener('keydown', onKey);
    section()?.focus?.();
    t1 = setTimeout(go, T.awake);
  };

  const act = async (/** @type {Event} */ e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (fx && performance.now() < enterUntil) { skip(); if (!t.closest?.('[data-wake]')) return; }
    if (busy) return;
    const wake = t.closest?.('[data-wake]');
    if (wake) {
      const id = /** @type {HTMLElement} */ (wake).dataset.wake ?? '';
      if (!modern && fx && !(/** @type {HTMLButtonElement} */ (wake).disabled)) { busy = true; wake.closest('.od-card')?.classList.add('press'); await sleep(T.press); busy = false; }
      try { draft = lockDraftOfficer(draft, id); woke = id; focus = modern ? id : null; o.sfx?.('confirm'); } catch (err) { note = /** @type {any} */ (err)?.code === 'DRAFT_BUDGET' ? '그릇이 모자라 이 사람은 깨울 수 없다' : '지금은 깨울 수 없다'; }
      render(); if(modern) /** @type {HTMLElement|null} */ (root.querySelector(`[data-id="${id}"]`))?.focus(); return;
    }
    const inspected=t.closest?.('[data-inspect]');
    if(inspected){focus=inspected.dataset.inspect;render();root.querySelector(`[data-inspect="${focus}"]`)?.focus();return;}
    const own = t.closest?.('[data-owner]');
    if (own) { const id = /** @type {HTMLElement} */ (own).dataset.owner ?? null; owner = owner === id ? null : id; render(); return; }
    const a = /** @type {HTMLElement|null} */ (t.closest?.('[data-act]'))?.dataset.act;
    if (a === 'reroll') {
      let next; try { next = /** @type {any} */ (rerollOfficerDraft)(draft, owner ? {searchOwnerId: owner} : undefined); } catch { note = '더 부를 수 없다'; render(); return; }
      o.sfx?.('page'); focus = null;
      if (fx) {   // 남긴 사람은 그대로, 나머지는 색이 빠지고 돌로 돌아가 닳는다 → 새 사람이 새겨진다
        busy = true; for (const c of root.querySelectorAll('.od-card:not(.locked)')) c.classList.add('leaving'); root.querySelector('.od')?.classList.add('rerolling');
        await sleep(T.leave); busy = false;
      }
      draft = next; render('reroll'); return;
    }
    if (a === 'confirm') { let c; try { c = officerDraftCompanions(draft); } catch { note = '두 사람부터 시작한다(성 · 군대)'; render(); return; } if (fx) { awaken(c); return; } close(); o.onConfirm(c); return; }
    if (a === 'back') { close(); o.onBack(); return; }
    if (t.closest?.('.od-details')) return;
    const card = /** @type {HTMLElement|null} */ (t.closest?.('.od-card'));
    if (card && (modern || !officerDraftView(draft).ended)) { const id = card.dataset.id ?? null; focus = modern ? id : focus === id ? null : id; render(); /** @type {HTMLElement|null} */ (root.querySelector(`[data-id="${id}"]`))?.focus(); }
    else if(!t.closest?.('button,a,input,select,.od-shared-detail')){focus=null;focusCleared=true;render();}
  };
  const key = (/** @type {KeyboardEvent} */ e) => {
    if (fx && performance.now() < enterUntil && ['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); skip(); return; }
    if (busy) return;
    if (e.key === 'Escape') { e.preventDefault(); if (!modern && focus) { focus = null; render(); } else { close(); o.onBack(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && /** @type {HTMLElement} */ (e.target).matches?.('.od-card,[data-owner],[data-inspect]')) { e.preventDefault(); /** @type {HTMLElement} */ (e.target).click(); }
  };
  function restoreSelection() {
    if (selection) { selection.inert = selectionWasInert; if (selectionAriaHidden === null) selection.removeAttribute('aria-hidden'); else selection.setAttribute('aria-hidden', selectionAriaHidden); }
  }
  function close() {
    restoreSelection();
    if (returnFocus && 'focus' in returnFocus) /** @type {HTMLElement} */ (returnFocus).focus();
    host.removeEventListener('pointerover',inspect);host.removeEventListener('focusin',inspect); host.removeEventListener('click', act); host.removeEventListener('keydown', key); host.hidden = true; root.innerHTML = ''; for (const el of host.querySelectorAll('.od-call,.od-sweep')) el.remove(); }
  const inspect = e => {
    if(!modern || busy)return;
    const card=e.target.closest?.('.od-card');if(!card)return;
    const id=card.dataset.id;if(id===focus)return;focus=id;
    for(const c of root.querySelectorAll('.od-card')){c.classList.toggle('focus',c===card);c.setAttribute('aria-expanded',String(c===card));}
    const panel=root.querySelector('.od-shared-detail'),v=officerDraftView(draft),c=v.cards.find(c=>c.officerId===id),trait=briefs[id]?.trait;
    const hero=root.querySelector('.c298-draft-hero');if(hero)hero.innerHTML=`${o.art(id)?`<img src="${esc(o.art(id))}" alt="">`:''}<figcaption>${esc(c?.name)}</figcaption>`;
    if(panel)panel.innerHTML=draftDetailMarkup(c,briefs[id],bookend?v:null);
    const wakeAction=root.querySelector('#od-draft-action');if(bookend&&wakeAction)wakeAction.innerHTML=draftWakeMarkup(c,v);
    const budget=root.querySelector('.od-budget');if(bookend && budget)budget.innerHTML=draftBudgetMarkup({...v,lockedCount:draft.locked.length,slots:draft.slots},focus);
  };
  host.addEventListener('pointerover',inspect);host.addEventListener('focusin',inspect);
  host.addEventListener('click', act); host.addEventListener('keydown', key);
  const selection = /** @type {HTMLElement|null} */ (document.querySelector('#selection'));
  const selectionWasInert = selection?.inert ?? false;
  const selectionAriaHidden = selection?.getAttribute('aria-hidden') ?? null;
  const returnFocus = document.activeElement;
  if (selection) { selection.inert = true; selection.setAttribute('aria-hidden', 'true'); }
  host.hidden = false; host.classList.remove('leaving');
  const intro = fx && !!o.intro;
  render('first', intro ? T.call - 250 : 0);
  if (intro) endCall = call();
  /** @type {HTMLElement|null} */ (root.querySelector('.od-back'))?.focus();
  return {close};
}

// Result uses the same relief asset and odRelief/odInk frames in reverse.
export function sleepingOfficerHtml(src,name){
 return `<figure class="c286-sleeper${fxOn()?' animate':''}"><div><img class="c286-color" src="${esc(src)}" alt="${esc(name)}"><img class="c286-relief" src="${esc(reliefOf(src))}" alt="" onerror="this.remove()"><img class="c286-ink" src="${esc(src)}" alt=""><span class="sg-stone c379-sleep-stone" aria-hidden="true"><span class="sg-stone-surface"><img src="${esc(src)}" alt=""></span><span class="sg-stone-features"><img class="sg-stone-face" src="${esc(src)}" alt=""></span></span></div><figcaption>${esc(name)}<small>다시 잠듦</small></figcaption></figure>`;
}
