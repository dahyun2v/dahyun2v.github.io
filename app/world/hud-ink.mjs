// 흑묵 지도 HUD — 기준 그림 final-map-v2 를 그대로 새로 짠 화면(2026-10-10, Claude · 사용자 "고치지 말고 새로 · 카드·단추는 에셋으로").
// 판·단추·깃발·아이콘은 모두 GPT 가 기준 그림에서 한 장씩 뽑아 그린 그림(/assets/ui-v3/hud/). 코드는 자리·글자·숫자·막대 길이만.
// 게임 처리는 옛 HUD(숨김)의 단추를 그대로 누른다 — 명령 코드는 한 곳(world.js)에만 있다.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const H = '/assets/ui-v3/hud/';
const RAIL = [['world', '지형', 'mode-terrain'], ['supply', '보급', 'mode-supply'], ['faction', '세력', 'mode-faction'], ['diplomacy', '외교', 'mode-diplomacy'], ['trace', '탐험', 'mode-explore']];
const RES_ICON = {food: 'res-food', production: 'res-production', science: 'res-science', fame: 'res-fame', troops: 'res-troops', reserve: 'res-reserve'};
const ACT_ICON = {move: 'cmd-move', face: 'cmd-face', brace: 'cmd-brace', regroup: 'cmd-regroup', wait: 'cmd-wait', hub: 'cmd-hub', tactic: 'cmd-tactic', officer: 'cmd-officer', attack: 'cmd-attack', garrison: 'cmd-garrison'};
const ACT_ORDER = ['move', 'attack', 'face', 'brace', 'regroup', 'wait', 'hub', 'garrison', 'tactic'];

// ── 장수 머리 자리: 그림마다 잰 머리 상자(/assets/officer-art/cutout/heads.json ← tools/design/officer-heads.py)를 그림 요소에 달아 준다.
//    얼굴 칸·흉상 칸은 CSS 가 --ovb-*(object-view-box) 로 자르고, 큰 인물 자리는 --hx·--hy·--hs 로 머리 크기·위치를 맞춘다.
//    전에는 "위에서 8% + 2배 확대" 같은 고정 자르기라 그림마다 목·가슴이 들어갔다(사용자 2026-10-10).
let HEADS = {};
const HEAD_RE = /\/officer-art\/cutout\/([^/?#"')]+)/;
/** 장수 그림 주소 → {size:[w,h], head:[가운데x, 가운데y, 한 변/너비]} | null */
export const headOf = (src) => { const m = HEAD_RE.exec(String(src ?? '')); if (!m) return null; const n = decodeURIComponent(m[1]); return HEADS[n] ?? HEADS[n.replace(/-relief(\.\w+)$/, '$1')] ?? null; };   // 석각 판(<이름>-relief.webp)은 원본과 같은 크기라 원본의 머리 자리를 쓴다
// 머리 상자 한 변을 1 로 한 네모(가운데 기준) → inset(위 오른쪽 아래 왼쪽). 그림 밖으로 나가면 안으로 민다
function headBox(h, kx0, ky0, kx1, ky1) {
  const [W, H] = h.size, s = h.head[2] * W, cx = h.head[0] * W, cy = h.head[1] * H;
  let x0 = cx + kx0 * s, x1 = cx + kx1 * s, y0 = cy + ky0 * s, y1 = cy + ky1 * s;
  if (x0 < 0) { x1 -= x0; x0 = 0; } if (x1 > W) { x0 = Math.max(0, x0 - (x1 - W)); x1 = W; }
  if (y0 < 0) { y1 -= y0; y0 = 0; } if (y1 > H) { y0 = Math.max(0, y0 - (y1 - H)); y1 = H; }
  const p = (v) => `${(v * 100).toFixed(2)}%`;
  return `inset(${p(y0 / H)} ${p(1 - x1 / W)} ${p(1 - y1 / H)} ${p(x0 / W)})`;
}
function tagHeadImg(im) {
  const src = im.getAttribute('src') ?? ''; if (im.dataset.hdSrc === src) return; im.dataset.hdSrc = src;
  const h = headOf(src), st = im.style;
  if (!h) { delete im.dataset.hd; return; }
  st.setProperty('--hx', String(h.head[0])); st.setProperty('--hy', String(h.head[1])); st.setProperty('--hs', String(h.head[2])); st.setProperty('--ar', String(h.size[0] / h.size[1]));
  st.setProperty('--ovb-face', headBox(h, -.5, -.5, .5, .5));       // 얼굴만(정사각)
  st.setProperty('--ovb-medal', headBox(h, -.95, -.72, .95, 1.18));  // 머리 + 어깨(정사각 — 외교 원판)
  st.setProperty('--ovb-bust', headBox(h, -1.05, -.78, 1.05, 2.02)); // 흉상(3:4)
  im.dataset.hd = '1';
}
// 배경으로 얼굴을 넣는 칸(style 의 --face · --visit-face · --gface): 칸 너비 = 머리 상자 × k, 머리 가운데가 칸 세로 cy 에 오게.
//   ac = 칸의 가로÷세로(배경 위치 %는 칸 크기에 따라 달라지므로 필요). 결과는 --<이름>-size · --<이름>-pos 로 넘긴다
const BG_SLOTS = [['--face', 1, 1, .5], ['--visit-face', 1.42, .767, .4], ['--gface', 1.08, .934, .5]];
function tagHeadBg(el) {
  const key = BG_SLOTS.map(([p]) => el.style.getPropertyValue(p)).join('|'); if (el.dataset.hdBg === key) return; el.dataset.hdBg = key;
  for (const [prop, k, ac, cy] of BG_SLOTS) {
    const h = headOf(el.style.getPropertyValue(prop)); if (!h) continue;
    const [hx, hy, hs] = h.head, ar = h.size[0] / h.size[1], kx = 1 / (hs * k), ky = ac / (hs * k * ar);
    el.style.setProperty(`${prop}-size`, `${(kx * 100).toFixed(1)}% auto`);
    el.style.setProperty(`${prop}-pos`, `${((.5 - hx * kx) / (1 - kx) * 100).toFixed(2)}% ${((cy - hy * ky) / (1 - ky) * 100).toFixed(2)}%`);
  }
}
const HEAD_IMG = 'img[src*="/officer-art/cutout/"]', HEAD_BG = '[style*="face:"]';
function tagHeads(node, deep) {
  if (node.nodeType !== 1) return;
  if (node.matches(HEAD_IMG)) tagHeadImg(node); else if (node.matches(HEAD_BG)) tagHeadBg(node);
  if (deep) { for (const im of node.querySelectorAll(HEAD_IMG)) tagHeadImg(im); for (const el of node.querySelectorAll(HEAD_BG)) tagHeadBg(el); }
}
if (typeof document !== 'undefined') fetch('/assets/officer-art/cutout/heads.json').then((r) => r.ok ? r.json() : null).then((j) => {
  if (!j?.files) return;
  HEADS = j.files; tagHeads(document.documentElement, true);
  // 그려지기 전에 단다(관찰 콜백은 화면을 그리기 전에 돈다 → 깜빡임 없음). 속성 변화는 그 요소만 본다(지도 끌기 때마다 아래를 훑지 않게)
  new MutationObserver((recs) => { for (const r of recs) { if (r.type === 'childList') { for (const n of r.addedNodes) tagHeads(n, true); } else tagHeads(r.target, false); } })
    .observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style']});
  document.dispatchEvent(new CustomEvent('ink:heads'));
}).catch(() => {});

let has = () => true; // 등록된 그림만 쓰기(없으면 글자) — mount 에서 받는다
const icon = (name, glyph) => has(`hud/icons/${name}.png`) ? `<img class="ih-ico" src="${H}icons/${name}.png" alt="">` : `<em class="ih-glyph">${esc(glyph)}</em>`;

// 사건 창의 등급 줄(시안 page-event 의 둥근 아이콘 넷 — Codex 반박 리뷰 2026-10-11): 위기 · 사건 · 돌발 · 상황 가운데 지금 등급만 밝다.
//   world.js 는 등급을 글자 하나(#event-scale)로만 쓴다 → 그 글자를 읽어 옆에 줄을 그린다(world.js 는 건드리지 않음). 등급 글자가 아니면(발견 등) 줄을 숨긴다
// 깃발의 문장 = 세로로 펼친 큰 신수(hud/faction-banner-Fxx.png — 기준 그림들의 깃발). 그 그림이 없는 세력은 작은 둥근 문장
const setBanner = (img, fid) => { if (!img || img.dataset.fid === fid) return; img.dataset.fid = fid; img.onerror = () => { img.onerror = null; img.src = `/assets/ui-v3/emblems/${fid}.png`; }; img.src = `${H}faction-banner-${fid}.png`; };
// 차례 판 줄 왼쪽의 표지(기준 final-map-v2: 문서 · 망치 · 사람 · 관청) — 줄의 내용으로 고른다
const lineIcon = (t) => /생산|작업|건설|둔전|공방|농지|곡창|수리|완성|연구/.test(t) ? 'res-production' : /장수|부대|등용|포로|레벨|특기|전법|재야|인재/.test(t) ? 'mode-roster' : /성|함락|내구|공성|점령|도시/.test(t) ? 'b-office' : 'b-treaty';
const EV_SCALES = [['위기', 'cmd-attack'], ['사건', 'cmd-brace'], ['돌발', 'u-cavalry'], ['상황', 'cmd-regroup']];
function mountEventScales() {
  if (typeof MutationObserver !== 'function') return;
  for (const id of ['event-scale', 'choice-kind']) {
    const src = document.getElementById(id); if (!src || src.nextElementSibling?.classList.contains('ev-scales')) continue;
    const row = document.createElement('div'); row.className = 'ev-scales'; row.setAttribute('role', 'img'); src.after(row);
    const sync = () => {
      const now = (src.textContent ?? '').trim(), hit = EV_SCALES.some(([k]) => k === now);
      row.hidden = !hit; if (!hit) { row.innerHTML = ''; return; }
      row.setAttribute('aria-label', `등급 — ${now}`);
      row.innerHTML = EV_SCALES.map(([k, ic]) => `<i class="${k === now ? 'on' : ''}" title="${k}"><img src="${H}icons/${ic}.png" alt=""><b>${k}</b></i>`).join('');
    };
    new MutationObserver(sync).observe(src, {childList: true, characterData: true, subtree: true}); sync();
  }
}

/** HUD 뼈대를 만든다. opts.has(rel) = v3 manifest 에 그림이 있는지. */
export function mountInkHud(root, opts = {}) {
  if (opts.has) has = opts.has;
  mountEventScales();
  root.innerHTML = `<div class="ih">
    <header class="ih-top"><img class="ih-topbar" src="${H}topbar.png" alt="">
      <button class="ih-faction" data-fwd="#faction" title="세력 — 정책·외교"><img class="ih-emblem" alt=""><b></b></button>
      <div class="ih-res"></div>
      <div class="ih-medal" title=""><img src="${H}medallion.png" alt=""><b class="ih-turn"></b></div>
      <div class="ih-date"><b></b><small></small></div>
      <nav class="ih-menu"><button data-fwd="#save" title="저장">存</button><button data-fwd="#load-again" title="불러오기">讀</button><button data-fwd="#rules-open" title="규칙">規</button><button data-fwd="#mute" title="소리">聲</button><a href="/" title="처음 화면">歸</a></nav>
    </header>
    <img class="ih-horizon" src="${H}map-horizon-band.png" alt="" onerror="this.remove()">
    <nav class="ih-rail">${RAIL.map(([m, label, ic]) => `<button class="ih-rb" data-mode="${m}" title="${label}"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon(ic, label[0])}<small>${label}</small></button>`).join('')}
      <button class="ih-rb" data-fwd="#roster-open" title="소속 장수"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-helmet', '人')}<small>장수</small></button>
      <button class="ih-rb" data-open="council" title="평정 — 이번 달 안건"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-treaty', '議')}<small>평정</small><i class="ih-badge" hidden></i></button></nav>
    <aside class="ih-notice"><img class="ih-panel" alt=""><img class="ih-flag-em" alt=""><h3>이번 차례</h3><ol class="ih-lines"></ol></aside>
    <aside class="ih-foe" hidden><i class="pic"><img alt=""></i><img class="ih-panel" src="${H}battle-enemy.png" alt=""><b class="nm"></b><i class="bar b1"><u></u><em></em></i><i class="bar b2"><u></u><em></em></i></aside>
    <section class="ih-unit" hidden><img class="ih-panel" alt=""><img class="ih-flag-em" alt="">
      <button class="ih-face" data-act="officer" title="장수 정보"><img alt=""></button>
      <div class="ih-id"><b></b><small></small></div>
      <div class="ih-bars"><i data-k="0"><u></u><em></em></i><i data-k="1"><u></u><em></em></i><i data-k="2"><u></u><em></em></i></div>
      <div class="ih-acts"></div></section>
    <nav class="ih-cmd" hidden><img class="bar" src="${H}battle-cmd.png" alt=""><span class="tac"></span><button class="atk" data-act="attack" title="공격할 적을 고릅니다">${icon('cmd-attack', '攻')}<b>공격</b></button></nav>
    <button class="ih-end" data-fwd="#end-turn" title="다음 차례 (Enter)"><img src="${H}endturn.png" alt=""><small></small></button>
  </div>`;
  // 지도 눕혀 보기(기준 final-map-v2 의 비스듬한 시점): 기본으로 켠다. 끌기·확대 프레임을 재 보니 눕히지 않은 것과 같았다(tools/smoke/ink-perf.mjs). ?tilt=0 이면 끈다
  try { if (new URLSearchParams(location.search).get('tilt') !== '0') document.body.classList.add('tilt'); } catch { /* 주소를 못 읽으면 그대로 */ }
  // 적 장수 판: world.js 가 공격 예상을 띄울 때 'ink:foe' 로 알려 준다. 예상 창(#attack-preview)이 닫히면 같이 닫는다
  const foe = root.querySelector('.ih-foe'), tipEl = document.querySelector('#attack-preview');
  const foeOff = () => { if (foe && !foe.hidden) { foe.hidden = true; root.classList.remove('foe'); } };
  document.addEventListener('ink:foe', (e) => {
    const d = e.detail; if (!foe || !d) { foeOff(); return; }
    const im = foe.querySelector('.pic img'); if (d.face) im.src = d.face; im.hidden = !d.face;
    foe.querySelector('.nm').textContent = d.name ?? '';
    foe.querySelectorAll('.bar').forEach((el, i) => { const b = d.bars?.[i]; el.hidden = !b; if (!b) return; el.title = b.title ?? ''; el.querySelector('u').style.width = `${Math.max(0, Math.min(100, b.pct))}%`; el.querySelector('em').textContent = b.text ?? ''; });
    foe.hidden = false; root.classList.add('foe');
  });
  if (tipEl && typeof MutationObserver === 'function') new MutationObserver(() => { if (tipEl.hidden) foeOff(); }).observe(tipEl, {attributes: true, attributeFilter: ['hidden']});
  root.addEventListener('click', (e) => {
    const t = e.target.closest?.('[data-fwd],[data-mode],[data-act],[data-open]'); if (!t || !root.contains(t)) return;
    if (t.dataset.open) { document.dispatchEvent(new CustomEvent(`ink:${t.dataset.open}`)); return; }
    if (t.dataset.mode) { document.querySelector(`#mode-rail [data-mode="${t.dataset.mode}"]`)?.click(); if (t.dataset.mode === 'diplomacy') document.dispatchEvent(new CustomEvent('ink:diplomacy')); return; }
    if (t.dataset.act) { const sel = t.dataset.tactic ? `#unit-menu [data-tactic="${t.dataset.tactic}"]` : `#unit-menu [data-menu="${t.dataset.act}"]`; document.querySelector(sel)?.click(); return; }
    const target = document.querySelector(t.dataset.fwd); if (!target) return;
    target.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, shiftKey: e.shiftKey}));
  });
}

/** 매 render 뒤: 옛 HUD 에 그려진 값을 읽어 새 HUD 에 옮긴다(처리 규칙은 하나). d = world.js 가 주는 세력·차례 정보. */
export function renderInkHud(root, d) {
  const q = (s) => root.querySelector(s), old = (s) => document.querySelector(s);
  const color = d.factionColor ?? '#a8352a', tone = d.tone ?? 'red';
  root.style.setProperty('--fc', color);
  q('.ih-faction .ih-emblem').src = `/assets/ui-v3/emblems/${d.factionId}.png`;
  q('.ih-faction b').textContent = d.factionName ?? '';
  // 자원: 옛 위 띠 칩(값·증감·설명)을 그대로
  q('.ih-res').innerHTML = [...document.querySelectorAll('#resources .chip')].map((c) => {
    const k = c.dataset.res, b = c.querySelector('b'), dl = c.querySelector('small.d');
    return `<span class="ih-chip" data-res="${esc(k)}" title="${esc(c.title)}">${icon(RES_ICON[k] ?? 'res-food', '·')}<b>${b?.innerHTML ?? ''}</b>${dl ? `<small class="${dl.classList.contains('down') ? 'down' : 'up'}">${esc(dl.textContent)}</small>` : ''}</span>`;
  }).join('');
  q('.ih-turn').textContent = d.turn ?? '';
  q('.ih-medal').title = d.left ?? '';
  q('.ih-date b').textContent = d.date ?? ''; q('.ih-date small').textContent = d.left ?? '';
  for (const b of root.querySelectorAll('.ih-rb[data-mode]')) b.classList.toggle('on', b.dataset.mode === d.mode);
  { const cb = q('.ih-rb[data-open="council"] .ih-badge'); if (cb) { cb.hidden = !d.council; cb.textContent = d.council || ''; } }
  // 이번 차례(보고) — 마지막 4줄
  const lines = [...document.querySelectorAll('#turn-log p')].map((p) => p.textContent.replace(/(\d+\.\d)\d{2,}/g, '$1')).filter(Boolean); // 긴 소수(0.436782)는 한 자리로
  q('.ih-notice .ih-panel').src = `${H}notice-${tone}.png`;
  setBanner(q('.ih-notice .ih-flag-em'), d.factionId);
  document.body.style.setProperty('--my-banner', `url("${H}faction-banner-${d.factionId}.png")`); // 깃발에 세로로 펼치는 신수(방문 말 판의 좁은 깃발)
  document.body.style.setProperty('--my-beast', `url("${H}faction-beast-${d.factionId}.png")`); // 깃발에 펼치는 큰 신수(방문 말 판)
  document.body.style.setProperty('--my-em', `url("/assets/ui-v3/emblems/${d.factionId}.png")`); // 내 세력 문장 — 방문 말 판의 깃발 · 사건 등급 줄의 넷째 표지(CSS)
  q('.ih-lines').innerHTML = (lines.length ? lines.slice(-4) : [d.summary ?? '조용한 차례입니다.']).map((t) => `<li><img class="ih-li" src="${H}icons/${lineIcon(t)}.png" alt=""><span>${esc(t)}</span></li>`).join('');
  // 고른 부대: 옛 부대 판(#unit-menu)을 읽는다
  const menu = old('#unit-menu'), unit = q('.ih-unit');
  const showUnit = !!menu && !menu.hidden && !!menu.querySelector('.dk-id');
  unit.hidden = !showUnit;
  // 명령 줄: 옛 부대 판의 공격·전법 단추를 읽는다
  const cmd = q('.ih-cmd'), atkOld = showUnit ? menu.querySelector('[data-menu="attack"]') : null, tacOld = showUnit ? [...menu.querySelectorAll('.dk-acts [data-tactic], [data-tactic]')].filter((b, i, a) => a.indexOf(b) === i).slice(0, 3) : [];
  const showCmd = !!cmd && ((!!atkOld && !atkOld.disabled) || tacOld.some((b) => !b.disabled));
  if (cmd) { cmd.hidden = !showCmd; root.classList.toggle('cmd', showCmd); }
  if (showCmd) {
    cmd.querySelector('.atk').disabled = !atkOld || atkOld.disabled;
    cmd.querySelector('.tac').innerHTML = tacOld.map((b, i) => { const name = (b.childNodes.length ? [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('') : b.textContent).trim() || b.textContent.trim(); return `<button class="ring r${i + 1}" data-act="tactic" data-tactic="${esc(b.dataset.tactic)}"${b.disabled ? ' disabled' : ''} title="${esc(b.title || b.textContent.trim())}">${icon('cmd-tactic', name[0] ?? '·')}<small>${esc(name.slice(0, 4))}</small></button>`; }).join('');
  }
  if (showUnit) {
    q('.ih-unit .ih-panel').src = `${H}officer-${tone}.png`;
    setBanner(q('.ih-unit .ih-flag-em'), d.factionId);
    const face = menu.querySelector('.dk-face img'); q('.ih-face img').src = face?.src ?? ''; q('.ih-face').classList.toggle('empty', !face);
    q('.ih-id b').textContent = menu.querySelector('.dk-id h2')?.textContent ?? '';
    q('.ih-id small').textContent = menu.querySelector('.dk-meta')?.textContent ?? '';
    const bars = d.unitBars ?? [];
    root.querySelectorAll('.ih-bars i').forEach((el, i) => { const b = bars[i]; el.hidden = !b; if (!b) return; el.title = b.title ?? ''; el.querySelector('u').style.width = `${Math.max(0, Math.min(100, b.pct))}%`; el.querySelector('em').textContent = b.text ?? ''; el.dataset.tone = b.tone ?? ''; });
    const btns = [...menu.querySelectorAll('.dk-acts button')].filter((b) => !b.classList.contains('close'));
    const acts = btns.map((b) => ({menu: b.dataset.menu ?? (b.dataset.tactic ? 'tactic' : ''), tactic: b.dataset.tactic ?? '', disabled: b.disabled, title: b.title || b.textContent.trim(), label: (b.childNodes[1]?.textContent ?? b.textContent).trim()}))
      .filter((a) => a.menu && a.menu !== 'officer' && a.menu !== 'close' && !(showCmd && (a.menu === 'attack' || a.menu === 'tactic')))
      .sort((a, b) => (ACT_ORDER.indexOf(a.menu) + 99 * (a.disabled ? 1 : 0)) - (ACT_ORDER.indexOf(b.menu) + 99 * (b.disabled ? 1 : 0))).slice(0, 6);
    q('.ih-acts').innerHTML = acts.map((a) => `<button class="ih-act" data-act="${esc(a.menu)}"${a.tactic ? ` data-tactic="${esc(a.tactic)}"` : ''}${a.disabled ? ' disabled' : ''} title="${esc(a.title)}">${icon(ACT_ICON[a.menu] ?? 'cmd-tactic', a.label[0] ?? '·')}<small>${esc(a.label.replace(/\s.*$/, ''))}</small></button>`).join('');
  }
  const end = old('#end-turn');
  q('.ih-end').disabled = !!end?.disabled;
  q('.ih-end').classList.toggle('blocked', !!end?.classList.contains('blocked'));
  q('.ih-end small').textContent = old('#remaining')?.textContent ?? '';
}
