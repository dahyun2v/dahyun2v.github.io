// @ts-check
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
const fxOn = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('fx') !== '0' && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };
const reliefOf = (/** @type {string} */ src) => src.replace(/\.\w+(\?.*)?$/, '-relief.webp');
const bustOf = (/** @type {string} */ id) => `/assets/officer-art/bust/${id}.webp`;
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
  /** @type {string|null} */ let focus = null;
  /** @type {string|null} */ let owner = null;   // 손권: 찾는 일을 맡길 사람
  /** @type {string|null} */ let woke = null;    // 방금 깨운 사람(연출 한 번)
  let note = '';
  const fx = fxOn();
  /** @type {Set<string>} */ let shown = new Set();   // 바로 앞 그림에 있던 카드 — 여기에 없던 카드만 '돌에서 깨어난다'
  let busy = false;                                    // 누름 · 다시 부르기 · 출정 연출이 도는 동안 다른 입력을 받지 않는다
  let enterUntil = 0;                                  // 등장 연출이 끝나는 시각(performance.now) — 그 전에 누르면 건너뛴다
  let wasFull = false;
  /** @type {Record<string,string>} */ const names = {};
  const root = document.createElement('div'); root.className = 'od-root'; host.replaceChildren(root);
  root.style.setProperty('--od-em', `url("/assets/ui-v3/emblems/${o.factionId}.png")`); // 깨운 카드의 붉은 인장에 찍히는 세력 문장(기준 final-draft)
  const section = () => /** @type {HTMLElement|null} */ (root.querySelector('.od'));

  const render = (/** @type {''|'first'|'reroll'} */ mode = '', d0 = 0) => {
    const v = officerDraftView(draft), g = /** @type {any} */ (v).gimmick ?? {};
    const canDelegate = o.factionId === 'F03' && v.canReroll;
    if (owner && owner !== o.ruler.id && !draft.locked.includes(owner)) owner = null;
    const lockedCards = draft.locked.map((id) => v.cards.find((c) => c.officerId === id)).filter(Boolean);
    let entering = 0;
    const cards = v.cards.map((c) => {
      const src = o.art(c.officerId), on = focus === c.officerId && !c.locked;
      names[c.officerId] = c.name;
      const fresh = fx && !c.locked && !shown.has(c.officerId);
      const stats = STATS.map((k) => `<li><span>${k}</span><i><u style="width:${Math.max(0, Math.min(100, c.stats?.[k] ?? 0))}%"></u></i><b>${c.stats?.[k] ?? '—'}</b></li>`).join('');
      const layers = fx && src ? `<i class="od-slash" aria-hidden="true"></i><img class="od-relief" src="${esc(reliefOf(src))}" alt="" aria-hidden="true" draggable="false" onerror="this.remove()"><img class="od-ink" src="${esc(src)}" alt="" aria-hidden="true" draggable="false">` : '';
      return `<div class="od-card${c.locked ? ' locked' : ''}${on ? ' focus' : ''}${c.officerId === woke ? ' woke' : ''}${c.home ? ' home' : ''}${fresh ? ' enter' : ''}"${fresh ? ` style="--i:${entering++}"` : ''} data-id="${esc(c.officerId)}" role="button" tabindex="0" aria-pressed="${c.locked}">
        <span class="od-why">${esc(REASON[c.reasonCode] ?? REASON.WANDER)}</span>
        <span class="od-art">${layers}${src ? `<img class="od-color" src="${esc(src)}" alt="${esc(c.name)}" draggable="false">` : `<b class="od-initial">${esc(String(c.name).slice(0, 1))}</b>`}</span>
        <ul class="od-stats">${stats}</ul>
        ${c.locked ? '' : `<button class="od-wake" data-wake="${esc(c.officerId)}"${c.lockBlocked ? ' disabled' : ''}>${c.lockBlocked === 'BUDGET' ? '그릇이 모자라다' : '깨운다'}</button>`}
        <span class="od-plate"><b>${esc(c.name)}</b><small>${esc(c.style ?? c.role ?? '')}</small><i class="od-cost" title="무게 ${c.cost} — 다섯의 무게 합이 그릇 안이어야 한다">${c.cost}</i>${c.locked ? '<em class="od-seal" aria-hidden="true">印</em>' : ''}</span>
      </div>`;
    }).join('');
    const slot = (id, name, cls = '') => { const src = id && o.art(id); return `<li class="${cls}${owner === id && canDelegate ? ' owner' : ''}"${id && canDelegate ? ` data-owner="${esc(id)}" role="button" tabindex="0" title="${esc(name)}에게 찾는 일을 맡긴다"` : name ? ` title="${esc(name)}"` : ''}>${src ? `<i style="--face:url(${esc(src)})"></i>` : ''}</li>`; };
    const full = draft.locked.length >= draft.slots, justFull = fx && full && !wasFull; wasFull = full;
    const slots = [slot(o.ruler.id, o.ruler.name, `ruler filled${mode === 'first' && d0 ? ' pop late' : ''}`), ...lockedCards.map((c) => slot(c.officerId, c.name, c.officerId === woke ? 'filled pop' : 'filled')), ...Array.from({length: Math.max(0, draft.slots - lockedCards.length)}, () => slot(null, ''))].join('');
    const left = Math.max(0, draft.slots - draft.locked.length);
    const dur = mode === 'reroll' ? T.fast : T.first;
    root.innerHTML = `<section class="od${fx ? ' fx' : ''}${mode === 'reroll' ? ' fast' : ''}" data-faction="${esc(o.factionId)}" style="--dur:${dur}ms;--d0:${d0}ms" aria-label="함께 깨어날 사람 고르기">
      <button class="od-back" data-act="back" title="세력을 다시 고른다">‹ 세력</button>
      <header class="od-head"><h1 id="od-title">누구와 함께 깨어나는가</h1><p>${esc(GIMMICK[o.factionId] ?? '')}</p></header>
      <p class="od-budget${v.canConfirm ? '' : ' over'}" title="다섯 사람의 무게 합이 그릇을 넘으면 시작할 수 없다(시험값)"><span>그릇</span><b>${v.shownCost}</b><i>/ ${v.budget}</i><small>깨운 사람 ${draft.locked.length} / ${draft.slots}</small></p>
      <p class="od-note">${note ? esc(note) : v.canConfirm ? (left ? '카드를 눌러 살펴보고, 데려갈 사람은 깨운다. 깨우지 않은 자리는 다시 부를 수 있다.' : '다섯을 모두 깨웠다.') : (v.canReroll ? '보이는 다섯이 그릇을 넘는다 — 가벼운 사람이 오도록 다시 부른다.' : '그릇을 넘는다.')}</p>
      <div class="od-cards">${cards}</div>
      <footer class="od-foot">
        <button class="od-reroll" id="od-reroll" data-act="reroll"${v.canReroll ? '' : ' disabled'} title="깨우지 않은 자리만 새 사람으로 바꾼다. 한 번 물린 사람은 이번에는 다시 나타나지 않는다"><b>다시 부른다</b><small>남은 기회 ${v.rerollsLeft}${g.extraRerolls ? ` (조조 +${g.extraRerolls})` : ''}</small></button>
        <ol class="od-slots${justFull ? ' full' : ''}">${slots}</ol>
        <button class="od-confirm${fx && full && v.canConfirm ? ' ready' : ''}" id="od-confirm" data-act="confirm"${v.canConfirm ? '' : ' disabled'}><b>이 다섯과 깨어난다</b></button>
      </footer>
    </section>`;
    if (fx && entering) enterUntil = performance.now() + d0 + dur + (entering - 1) * T.stagger + 250;
    if (fx && woke) fly(woke);
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
    el.animate([{...p0, opacity: 0}, {...p0, opacity: 1, offset: .14}, {...p1, opacity: 1}], {duration: T.fly + 60, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards'}).finished.then(() => el.remove(), () => el.remove());
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
    busy = true; host.removeEventListener('click', act); host.removeEventListener('keydown', key);
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
        try { o.onConfirm(companions); } finally { requestAnimationFrame(() => { flag.classList.add('out'); setTimeout(() => { flag.remove(); host.hidden = true; host.classList.remove('leaving'); }, T.sweep * .6 + 60); }); }
      }, T.sweep * .45);
    };
    const onKey = (/** @type {KeyboardEvent} */ e) => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); go(); } };
    host.addEventListener('click', go); host.addEventListener('keydown', onKey);
    section()?.focus?.();
    t1 = setTimeout(go, T.awake);
  };

  const act = async (/** @type {Event} */ e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    if (fx && performance.now() < enterUntil) { skip(); return; }
    if (busy) return;
    const wake = t.closest?.('[data-wake]');
    if (wake) {
      const id = /** @type {HTMLElement} */ (wake).dataset.wake ?? '';
      if (fx && !(/** @type {HTMLButtonElement} */ (wake).disabled)) { busy = true; wake.closest('.od-card')?.classList.add('press'); await sleep(T.press); busy = false; }
      try { draft = lockDraftOfficer(draft, id); woke = id; focus = null; o.sfx?.('confirm'); } catch (err) { note = /** @type {any} */ (err)?.code === 'DRAFT_BUDGET' ? '그릇이 모자라 이 사람은 깨울 수 없다' : '지금은 깨울 수 없다'; }
      render(); return;
    }
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
    if (a === 'confirm') { let c; try { c = officerDraftCompanions(draft); } catch { note = '그릇을 넘는다'; render(); return; } if (fx) { awaken(c); return; } close(); o.onConfirm(c); return; }
    if (a === 'back') { close(); o.onBack(); return; }
    const card = /** @type {HTMLElement|null} */ (t.closest?.('.od-card'));
    if (card && !card.classList.contains('locked')) { const id = card.dataset.id ?? null; focus = focus === id ? null : id; render(); }
  };
  const key = (/** @type {KeyboardEvent} */ e) => {
    if (fx && performance.now() < enterUntil && ['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); skip(); return; }
    if (busy) return;
    if (e.key === 'Escape') { e.preventDefault(); if (focus) { focus = null; render(); } else { close(); o.onBack(); } return; }
    if ((e.key === 'Enter' || e.key === ' ') && /** @type {HTMLElement} */ (e.target).matches?.('.od-card,[data-owner]')) { e.preventDefault(); /** @type {HTMLElement} */ (e.target).click(); }
  };
  function close() { host.removeEventListener('click', act); host.removeEventListener('keydown', key); host.hidden = true; root.innerHTML = ''; for (const el of host.querySelectorAll('.od-call,.od-sweep')) el.remove(); }
  host.addEventListener('click', act); host.addEventListener('keydown', key);
  host.hidden = false; host.classList.remove('leaving');
  const intro = fx && !!o.intro;
  render('first', intro ? T.call - 250 : 0);
  if (intro) endCall = call();
  return {close};
}
