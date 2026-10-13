// 흑묵 지도 HUD — 기준 그림 final-map-v2 를 그대로 새로 짠 화면(2026-10-10, Claude · 사용자 "고치지 말고 새로 · 카드·단추는 에셋으로").
// 판·단추·깃발·아이콘은 모두 GPT 가 기준 그림에서 한 장씩 뽑아 그린 그림(/assets/ui-v3/hud/). 코드는 자리·글자·숫자·막대 길이만.
// 게임 처리는 옛 HUD(숨김)의 단추를 그대로 누른다 — 명령 코드는 한 곳(world.js)에만 있다.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// C132: public presentation only; no world mutation or hidden enemy details.
export function shownTroopForecast(shown, loss, scale = 1) {
  const after = Math.max(0, shown - loss * scale);
  return {after, line: `보이는 병력 ${shown} → ${after}`};
}
export function surpriseWarning(risk) {
  return risk?.turnsLeft > 0 ? `지금 치면 신용 −${Math.abs(risk.loss)}(기습) — ${risk.turnsLeft}차례 뒤부터는 깎이지 않음` : '';
}
export function productionReadout(job, previous) {
  if (!job) return {turns: null, line: '', change: ''};
  const turns = Number.isFinite(job.gain)&&job.gain > 0&&Number.isFinite(job.cost)&&Number.isFinite(job.progress) ? Math.max(1, Math.ceil(Math.max(0, job.cost - job.progress - (Number.isFinite(job.advance)?job.advance:0)) / job.gain)) : null;
  const change = previous && previous.kind === job.kind && previous.gain !== job.gain
    ? `차례당 진행 ${previous.gain} → ${job.gain} — 현재 생산량·태수 효과 반영` : '';
  return {turns, line: turns === null ? '생산이 없어 진행 중단' : `${turns}차례 남음 · 차례당 진행 ${job.gain}${job.advance ? ` · 앞당긴 생산 ${job.advance}` : ''}`, change};
}
export function observedReinforcementLines(before, after) {
  if (before.factionId !== after.factionId) return [];
  const visible = v => Object.values(v.knowledge?.observedArmies ?? {}).filter(a => v.knowledge?.tiles?.[a.tileId] === 'VISIBLE');
  const prev = new Map(visible(before).map(a => [a.armyId, a]));
  return visible(after).flatMap(a => {
    const p = prev.get(a.armyId), gain = a.troopCount - (p?.troopCount ?? a.troopCount);
    if (!(gain > 0)) return [];
    const city = Object.values({...after.knowledge?.cities, ...after.ownCities}).find(c => c.tileId === a.tileId && after.knowledge?.tiles?.[c.tileId] === 'VISIBLE');
    const name = after.officers?.[a.commanderId]?.name ?? '관측한';
    return [`${name} 부대의 보이는 병력이 늘었습니다(+${gain})${city ? ` — ${city.name}에서` : ''}`];
  });
}
export function starvationLines(before, after) {
  if (before.factionId !== after.factionId) return [];
  const seen = new Set((before.supplyLosses ?? []).map(x => x.id));
  return (after.supplyLosses ?? []).filter(x => !seen.has(x.id)).map(x => {
    const a = after.ownArmies?.[x.armyId] ?? before.ownArmies?.[x.armyId];
    return `${after.officers?.[a?.commanderId]?.name ?? '아군'} 부대 · 굶주림 손실 −${x.count}`;
  });
}
export function injuryReturnText(turn, injury) {
  return Number.isFinite(injury?.turnsLeft) ? `${injury.turnsLeft}차례 요양 · ${turn + injury.turnsLeft}차례에 복귀` : '요양 중';
}
// C127: player-facing text only; identifiers and command payloads stay unchanged.
export function labelNumber(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
  const n = Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  return String(Object.is(n, -0) ? 0 : n);
}
export function readableText(value, names = {}, rules = {}) {
  return String(value ?? '')
    .replace(/\b(?:null|undefined|NaN)\b/g, '—') // C137: absent presentation values
    .replace(/\bcatapult\b/g, '투석기')
    .replace(/\bG\d{2,3}\b/g, id => names[id] ?? '장수')
    .replace(/\b[A-Z]_[A-Z_]{3,}\b/g, id => rules[id] ?? '고유 효과')
    .replace(/[−－-]\s*[−－-](?=\d)/g, '−')
    .replace(/([+−－-]?)(\d+\.\d+)/g, (_, sign, n) => sign + labelNumber(Number(n)));
}
export function readableError(error, messages = {}) {
  const code = String(error?.message ?? error ?? '');
  const shortage = /^INSUFFICIENT_RECRUITMENT_PRESTIGE:[^:]+:required=(\d+(?:\.\d+)?):available=(\d+(?:\.\d+)?)$/.exec(code);
  if (shortage) return `인망이 ${labelNumber(Number(shortage[1]) - Number(shortage[2]))} 모자랍니다(필요 ${labelNumber(shortage[1])} · 지금 ${labelNumber(shortage[2])})`;
  if (/^DUPLICATE_ACTIVE_RECRUITMENT_TARGET(?::|$)/.test(code)) return '이미 협의 중입니다';
  if (messages[code]) return messages[code];
  if (/[가-힣]/.test(code) && !/\b[A-Z][A-Z0-9_]{2,}\b/.test(code)) return readableText(code);
  console.warn(code);
  return '지금은 할 수 없습니다.';
}
// Replace only percentage values tied to numeric effects, using the engine's scaler.
export function cardNumericText(card, base, scale) {
  const values = new Map();
  (base?.effects ?? []).forEach((e, i) => {
    const actual = card.effects?.[i];
    if (e.op !== 'RULE' && Number.isFinite(e.value) && actual && e.value !== 0)
      values.set(Math.abs(e.value), Math.abs(scale(actual.value, card.rank ?? 1)));
  });
  return String(base?.text ?? card.text ?? '').replace(/([+−-])(\d+(?:\.\d+)?)%/g,
    (all, sign, value) => values.has(Number(value)) ? `${sign}${labelNumber(values.get(Number(value)))}%` : all);
}

// C110: this renderer receives only the public view, never raw world/wanderer state.
export function recruitmentLeadsHtml(v) {
  const leads = v.revealedWanderers ?? [];
  if (!leads.length) return '';
  return `<section class="recruit-leads"><h3>재야 장수 소재 · ${leads.length}명</h3><p>순욱의 태수 특기로 알아낸 재야 장수입니다. 알고 있는 성은 위치를 확인할 수 있습니다.</p><ul>${leads.map(x => {
    const city = v.ownCities?.[x.cityId] ?? v.knowledge?.cities?.[x.cityId];
    return `<li><b>${esc(x.name)}</b><span>${city ? esc(city.name) : '아직 살피지 않은 성'}</span>${city ? `<button type="button" data-known-recruit-city="${esc(x.cityId)}">위치 보기</button>` : '<small>도시를 발견하면 위치를 볼 수 있습니다</small>'}</li>`;
  }).join('')}</ul></section>`;
}


// C112: presentation-only records. Inputs are the player's public views.
export function garrisonResult(before, after, armyId) {
  if (before.factionId !== after.factionId || before.turn !== after.turn) return '';
  const army=before.ownArmies?.[armyId];
  if (!army || !(army.troopCount>0) || after.ownArmies?.[armyId]?.troopCount>0) return '';
  const officer=after.officers?.[army.commanderId], location=officer?.locationRef;
  const city=location?.kind==='CITY'?after.ownCities?.[location.id]:null;
  if (!city || !before.ownCities?.[location.id]) return '';
  const added=city.reserveTroops-before.ownCities[location.id].reserveTroops;
  if (!Number.isFinite(added) || added<=0) return '';
  return `${officer.name??'장수'} · ${city.name} 복귀 — 병력 ${added}명 예비병 편입`;
}
export function facilityCompletionLines(before, after, names = {}) {
  if (before.factionId !== after.factionId || after.turn !== before.turn + 1) return [];
  const rows=[];
  for (const [id, city] of Object.entries(after.ownCities ?? {})) {
    const prev=before.ownCities?.[id], kind=prev?.currentProduction?.kind;
    if (!kind || city.currentProduction || city.jobBlocked) continue;
    const count=c=>(c.facilities??[]).filter(f=>f.kind===kind).length;
    if (count(city)>count(prev)) rows.push(`${city.name??id} · ${names[kind]??kind} 완공`);
  }
  return rows;
}
export function foodSnapshot(v) {
  const cities = Object.values(v.ownCities ?? {}), sum = key => cities.reduce((n,c)=>n+(Number(c[key])||0),0);
  return {stock:sum('foodStock'), capacity:sum('foodCapacity'), output:cities.reduce((n,c)=>n+(Number(c.economyForecast?.food)||0),0)};
}
export function foodTransition(before, after) {
  if (before.factionId !== after.factionId || after.turn <= before.turn) return null;
  const from=foodSnapshot(before).stock, to=foodSnapshot(after).stock;
  return {turn:after.turn, from, to, change:Math.round((to-from)*10)/10};
}
export function combatReadout(before, after, event, mapNames = {}) {
  const known=(v,id)=>v.ownArmies?.[id] ?? Object.values(v.knowledge?.observedArmies??{}).find(a=>a.armyId===id&&v.knowledge?.tiles?.[a.tileId]==='VISIBLE');
  const knownCity=(v,id)=>v.ownCities?.[id] ?? (v.knowledge?.tiles?.[v.knowledge?.cities?.[id]?.tileId]==='VISIBLE'?v.knowledge.cities[id]:null);
  const name=(v,id)=>{const a=known(v,id);return a?(v.officers?.[a.commanderId]?.name??mapNames[id]??'관측한 부대'):'미확인 부대';};
  const cityId=event.cityId??(event.kind.includes('TACTIC')?event.targetId:null);
  const city=knownCity(before,cityId)??knownCity(after,cityId);
  const a=known(before,event.attackerId), b=known(before,event.targetId);
  if (!a&&!b&&!city) return null;
  const kind=({CITY:'성 공격',CITY_STRIKE:'성 사격',APPROACH_FIRE:'접근사격',PURSUIT:'이탈 추격',TACTIC:'전법',TACTIC_EFFECT:'전법',OVERWATCH:'대응 사격',JOINT_TACTIC:'연계 전법'})[event.kind]??'부대 교전';
  const source=event.kind==='CITY_STRIKE'?(city?.name??'미확인 성'):name(before,event.attackerId);
  const target=city&&event.kind!=='CITY_STRIKE'?city.name:event.kind==='CITY'?'미확인 성':name(before,event.targetId??event.attackerId);
  const lines=[];
  // Exact troop changes belong only to own units. Enemy strength is never taken from raw battle units.
  for (const id of [...new Set([event.attackerId,event.targetId].filter(Boolean))]) {
    const own=before.ownArmies?.[id], visible=known(before,id);
    if (!visible) continue;
    if (own) {
      const rows=(event.units??[]).filter(u=>u.unitId===id);
      if(rows.length){const loss=rows[0].preBattleCount-rows.at(-1).postBattleCount, cause=event.kind==='CITY_STRIKE'?'성벽 사격':event.kind==='PURSUIT'?'추격(물러날 때)':event.kind==='APPROACH_FIRE'?'접근사격':id===event.attackerId&&event.counter?'반격':'적 공격';lines.push(`${name(before,id)} · 아군 병력 ${rows[0].preBattleCount} → ${rows.at(-1).postBattleCount}${loss>0?` · ${cause} −${loss}`:''}`);}
    } else {
      const damage=id===event.targetId?event.enemyLoss:event.allyLoss;
      if (Number.isFinite(damage)&&damage>0) lines.push(`${name(before,id)} · 상대 피해 ${Math.round(damage)}`);
    }
    const changes=(event.formationChanges??[]).filter(f=>f.armyId===id), labels={ORDERED:'정돈',DISORDERED:'흐트러짐',BROKEN:'붕괴'};
    if(changes.length){const from=changes[0].from,to=changes.at(-1).to;if(from!==to)lines.push(`${name(before,id)} · 전열 ${labels[from]??from} → ${labels[to]??to}`);}
  }
  if(event.kind==='CITY'||city&&event.kind.includes('TACTIC'))lines.push(`성 내구 피해 ${labelNumber(event.dealt??event.enemyLoss??0)}`);
  const nextCity=knownCity(after,cityId);
  if(city&&nextCity&&city.ownerFactionId!==nextCity.ownerFactionId)lines.push(nextCity.ownerFactionId===after.factionId?'성 함락 · 아군 점령':'성 함락 · 소유 세력 변경');
  if(event.tacticName&&a)lines.push(`사용 전법 · ${event.tacticName}`);
  if(a&&b){if(event.charge)lines.push('기병 돌격');if(event.side==='FLANK')lines.push('측면 공격');if(event.side==='REAR')lines.push('후방 공격');if(event.counter)lines.push('반격 발생');}
  return {sequence:event.sequence,turn:event.turn,title:`${source} → ${target}`,kind,lines};
}
export function combatHistoryHtml(records) {
  return records.slice(-6).reverse().map(r=>`<article><h4>${esc(r.turn)}턴 · ${esc(r.kind)}</h4><b>${esc(r.title)}</b>${r.lines.map(t=>`<p>${esc(t)}</p>`).join('')}</article>`).join('');
}

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
      <div class="ih-res"></div><section class="ih-food-sheet" hidden aria-label="식량 현황"><button data-food-close aria-label="식량 현황 닫기">×</button><div></div></section>
      <div class="ih-medal" title=""><img src="${H}medallion.png" alt=""><b class="ih-turn"></b></div>
      <div class="ih-date"><b></b><small></small></div>
      <nav class="ih-menu"><button data-fwd="#save" title="저장 칸은 하나입니다 — 이전 저장을 덮어씁니다">저장</button><button data-fwd="#load-again" title="불러오기">불러</button><button data-fwd="#rules-open" title="규칙">규칙</button><button data-fwd="#mute" title="소리">소리</button><a href="/" title="처음 화면">처음</a></nav>
    <p class="ih-victory"></p></header>
    <img class="ih-horizon" src="${H}map-horizon-band.png" alt="" onerror="this.remove()">
    <nav class="ih-rail">${RAIL.map(([m, label, ic]) => `<button class="ih-rb" data-mode="${m}" title="${label}"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon(ic, label[0])}<small>${label}</small></button>`).join('')}
      <button class="ih-rb" data-fwd="#roster-open" title="소속 장수"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-helmet', '장수')}<small>장수</small></button>
      <button class="ih-rb" data-open="council" title="평정 — 이번 달 안건"><img class="ih-ring" src="${H}btn-round.png" alt="">${icon('b-treaty', '평정')}<small>평정</small><i class="ih-badge" hidden></i></button></nav>
    <aside class="ih-notice"><img class="ih-panel" alt=""><img class="ih-flag-em" alt=""><h3>이번 차례</h3><ol class="ih-lines"></ol><div class="ih-notice-links"><section class="ih-turn-history" hidden><button type="button" data-turn-report aria-expanded="false">이번 차례 전체 소식</button><ol hidden></ol></section><button class="ih-leads" data-fwd="#faction" hidden></button><details class="ih-combat-history" hidden><summary>최근 교전</summary><small class="ih-history-hint">지도를 연 뒤 관측한 최근 6회</small><div></div></details></div></aside>
    <aside class="ih-foe" hidden><i class="pic"><img alt=""></i><img class="ih-panel" src="${H}battle-enemy.png" alt=""><b class="nm"></b><i class="bar b1"><u></u><em></em></i><i class="bar b2"><u></u><em></em></i></aside>
    <section class="ih-unit" hidden><img class="ih-panel" alt=""><img class="ih-flag-em" alt="">
      <button class="ih-face" data-act="officer" title="장수 정보"><img alt=""></button>
      <div class="ih-id"><b></b><small></small></div>
      <div class="ih-bars"><i data-k="0"><u></u><em></em></i><i data-k="1"><u></u><em></em></i><i data-k="2"><u></u><em></em></i></div>
      <div class="ih-acts"></div><div class="ih-readout" aria-label="부대 행동과 위험"></div></section>
    <nav class="ih-cmd" hidden><img class="bar" src="${H}battle-cmd.png" alt=""><span class="tac"></span><button class="atk" data-act="attack" title="공격할 적을 고릅니다">${icon('cmd-attack', '공격')}<b>공격</b></button></nav>
    <button class="ih-end" data-fwd="#end-turn" title="다음 차례 (Enter)"><img src="${H}endturn.png" alt=""><b class="ih-end-name">다음 차례</b><small></small></button>
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
  const closeFood=()=>{root.querySelector('.ih-food-sheet').hidden=true;root.querySelector('[data-food-open]')?.setAttribute('aria-expanded','false');};
  document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.ih-food-sheet,[data-food-open]'))closeFood();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.querySelector('.ih-food-sheet').hidden){closeFood();e.stopPropagation();}},true);
  root.addEventListener('click', (e) => {
    if(e.target.closest?.('[data-turn-report]')){const list=root.querySelector('.ih-turn-history ol');list.hidden=!list.hidden;e.target.closest('[data-turn-report]').setAttribute('aria-expanded',String(!list.hidden));return;}
    if(e.target.closest?.('[data-food-open],[data-food-close]')){const panel=root.querySelector('.ih-food-sheet');panel.hidden=e.target.closest?.('[data-food-close]')?true:!panel.hidden;root.querySelector('[data-food-open]')?.setAttribute('aria-expanded',String(!panel.hidden));return;}
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
    return `<${k==='food'?'button type="button" data-food-open aria-label="식량 현황" aria-expanded="'+String(!q('.ih-food-sheet').hidden)+'"':'span'} class="ih-chip" data-res="${esc(k)}" title="${esc(c.title)}">${icon(RES_ICON[k] ?? 'res-food', '·')}<b>${b?.innerHTML ?? ''}</b>${dl ? `<small class="${dl.classList.contains('down') ? 'down' : 'up'}">${esc(dl.textContent)}</small>` : ''}</${k==='food'?'button':'span'}>`;
  }).join('');
  const f=d.food??{}, change=d.foodChange, fmt=n=>Number(n??0).toLocaleString('ko-KR',{maximumFractionDigits:1});
  q('.ih-food-sheet > div').innerHTML=`<h3>식량 현황</h3><p>현재 재고 <b>${fmt(f.stock)} / ${fmt(f.capacity)}</b></p><p>다음 정산 산출 <b>+${fmt(f.output)}</b></p><p class="hint">산출량에서 시민 유지·군량·성장 소비 등이 빠져 실제 재고가 정해집니다.</p>${change?`<h4>${esc(change.turn)}턴 진입 · 실제 재고 변화</h4><p><b>${fmt(change.from)} → ${fmt(change.to)} (${change.change>0?'+':''}${fmt(change.change)})</b></p><small>차례가 바뀌는 처리 전후의 보유 도시 재고 합입니다.</small>`:'<small>차례를 넘기면 실제 재고 변화를 함께 보여줍니다.</small>'}`;
  const history=q('.ih-combat-history');history.hidden=!d.combatHistory?.length;
  const historyHtml=combatHistoryHtml(d.combatHistory??[]);
  if(history.querySelector('div').innerHTML!==historyHtml)history.querySelector('div').innerHTML=historyHtml;
  history.querySelector('summary').textContent=`최근 교전 · ${d.combatHistory?.length??0}건`;
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
  const results=[...(d.facilityResults??[]),...(d.unitResult?[d.unitResult]:[])], allLines=d.allNews??[...lines,...results], current=d.currentNews??[...lines,...results].reverse();
  const turnHistory=q('.ih-turn-history');turnHistory.hidden=!allLines.length;turnHistory.querySelector('button').textContent=`전체 소식 · ${allLines.length}건`;turnHistory.querySelector('ol').innerHTML=allLines.map(t=>`<li>${esc(t)}</li>`).join('');
  q('.ih-lines').innerHTML = (current.length ? current.slice(0,4) : [d.summary ?? '조용한 차례입니다.']).map((t) => `<li><img class="ih-li" src="${H}icons/${lineIcon(t)}.png" alt=""><span>${esc(t)}</span></li>`).join('');
  const leads = q('.ih-leads');
  leads.hidden = !d.recruitmentCount;
  leads.textContent = `재야 장수 ${d.recruitmentCount ?? 0}명 · 소재 확인`;
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
    const status = d.unitStatus;
    const info = q('.ih-readout');
    const tacticsOpen = info.dataset.unitId === String(status?.id ?? '') && !!info.querySelector('details')?.open;
    info.dataset.unitId = String(status?.id ?? '');
    info.hidden = !status;
    const warnings = [...menu.querySelectorAll('.dk-info .warn')].map(p => p.textContent);
    const supply = menu.querySelector('.supply-line')?.textContent;
    const supplyContext = menu.querySelector('.supply-context')?.textContent;
    const tactics = [...menu.querySelectorAll('[data-tactic]')].map(b => { const label = b.cloneNode(true); label.querySelectorAll('.gi,kbd').forEach(n => n.remove()); return label.textContent.replace(/\s+/g, ' ').trim(); });
    info.innerHTML = status ? `<p class="ih-state"><b>${esc(status.action)}</b>${status.actions?`<span class="ih-actions-left"><span class="${status.actions.move.available?'':'spent'}">${esc(status.actions.move.label)}</span><span class="${status.actions.main.available?'':'spent'}">${esc(status.actions.main.label)}</span></span>`:''}<span>전열 ${esc(status.formation)}</span></p>${supply ? `<p>${esc(supply)}</p>` : ''}${supplyContext ? `<p>${esc(supplyContext)}</p>` : ''}${warnings.map(t => `<p class="ih-risk">${esc(t)}</p>`).join('')}${tactics.length ? `<details${tacticsOpen ? ' open' : ''}><summary>전법 상태 · ${tactics.length}개</summary>${tactics.map(t => `<p>${esc(t)}</p>`).join('')}</details>` : ''}` : '';
    const btns = [...menu.querySelectorAll('.dk-acts button')].filter((b) => !b.classList.contains('close'));
    const acts = btns.map((b) => ({menu: b.dataset.menu ?? (b.dataset.tactic ? 'tactic' : ''), tactic: b.dataset.tactic ?? '', disabled: b.disabled, title: b.title || b.textContent.trim(), label: (b.childNodes[1]?.textContent ?? b.textContent).trim()}))
      .filter((a) => a.menu && a.menu !== 'officer' && a.menu !== 'close' && !(showCmd && (a.menu === 'attack' || a.menu === 'tactic')))
      .sort((a, b) => (ACT_ORDER.indexOf(a.menu) + 99 * (a.disabled ? 1 : 0)) - (ACT_ORDER.indexOf(b.menu) + 99 * (b.disabled ? 1 : 0))).slice(0, 6);
    q('.ih-acts').innerHTML = acts.map((a) => `<button class="ih-act" data-act="${esc(a.menu)}"${a.tactic ? ` data-tactic="${esc(a.tactic)}"` : ''}${a.disabled ? ' disabled' : ''} title="${esc(a.title)}">${icon(ACT_ICON[a.menu] ?? 'cmd-tactic', a.label[0] ?? '·')}<small>${esc(a.label.replace(/\s.*$/, ''))}</small></button>`).join('');
  }
  const end = old('#end-turn');
  q('.ih-end').disabled = !!end?.disabled;
  q('.ih-end').classList.toggle('blocked', !!end?.classList.contains('blocked'));
  q('.ih-end').classList.toggle('ready', !!end?.classList.contains('ready'));
  const goal=old('#victory-guide');q('.ih-victory').textContent=goal?.textContent??'';q('.ih-victory').title=goal?.title??'';
  q('.ih-end small').textContent = old('#remaining')?.textContent ?? '';
}
// C130: 클릭과 예고가 공유하는 화면 판정. 공격 가능 여부/경로는 엔진이 준다.
export function clickTargetDecision({selected,enemyId,cityId,attackableEnemy=false,attackableCity=false,plan=null,approach=null}) {
  if(!selected)return {kind:cityId?'info':'none',cityId};
  if(enemyId&&attackableEnemy)return {kind:'unit',targetId:enemyId,cityId};
  if(cityId&&attackableCity)return {kind:'city',cityId};
  if(plan)return {kind:'strike',...plan,cityId:plan.cityId??cityId};
  if(approach)return {kind:'approach',via:approach,targetId:enemyId,cityId};
  return {kind:cityId?'info':'none',cityId,targetId:enemyId};
}
export function targetPreviewText(target,{name='',damage=0,chase=null,ranged=false,guard=false,wallBlocked=guard}={}) {
  const wallReason=guard&&wallBlocked&&target.kind!=='city'?' · 수비대가 있어 성벽을 칠 수 없습니다':'';
  if(target.kind==='city')return `성벽 공격 — 내구 −${damage}`;
  if(target.kind==='unit')return `${guard?'수비대 ':''}${name}와 교전${wallReason}`;
  if(target.kind==='strike')return `${ranged&&chase?'물러나 쏩니다':'다가가서 공격합니다'}${chase?` — ${ranged?'물러날 때':'이동할 때'} 추격 피해 약 ${chase.dealt}`:''}${target.targetId?` · ${guard?'수비대 ':''}${name}와 교전`:''}${wallReason}`;
  if(target.kind==='approach')return `칠 수 있는 자리로 갑니다 · 도착하면 다시 눌러 ${target.targetId?`${guard?'수비대 ':''}${name}와 교전`:'성벽 공격'}${wallReason}`;
  return guard?`수비대 ${name}가 성을 지키고 있습니다 — 먼저 수비대를 물리쳐야 합니다`:'';
}
export function unitActionReadout({moveUsed=false,canMove=false,canMain=false,ended=false,routing=false}={}) {
  const reason=routing?'패주 중이라 명령을 내릴 수 없습니다':moveUsed?'이번 차례 이동을 이미 썼습니다':ended?'이번 차례 명령을 마쳤습니다':!canMove?'지금 이동할 수 있는 칸이 없습니다':'';
  return {move:{available:canMove&&!ended&&!routing,label:`이동 · ${moveUsed?'사용함':ended||routing?'불가':canMove?'가능':'불가'}`},main:{available:canMain&&!ended&&!routing,label:`주 행동(공격 · 방어 · 재정비 · 전법) · ${ended||routing?'불가':canMain?'가능':'사용함'}`},reason};
}

// C137: screen geometry and public notices only; never change game state.
export function uncoveredShift(unit, viewport, panels, gap=16) {
  const right=r=>r.right??r.left+r.width, bottom=r=>r.bottom??r.top+r.height;
  const bounds={left:viewport.left+gap,top:viewport.top+gap,right:right(viewport)-gap,bottom:bottom(viewport)-gap};
  const blocks=panels.filter(r=>r.width>0&&r.height>0&&right(r)>bounds.left&&r.left<bounds.right&&bottom(r)>bounds.top&&r.top<bounds.bottom)
    .map(r=>({left:r.left-gap,top:r.top-gap,right:right(r)+gap,bottom:bottom(r)+gap}));
  const xs=[0,bounds.left-unit.left,bounds.right-right(unit),...blocks.flatMap(r=>[r.left-right(unit),r.right-unit.left])];
  const ys=[0,bounds.top-unit.top,bounds.bottom-bottom(unit),...blocks.flatMap(r=>[r.top-bottom(unit),r.bottom-unit.top])];
  const candidates=[];
  for(const x of xs)for(const y of ys){const r={left:unit.left+x,right:right(unit)+x,top:unit.top+y,bottom:bottom(unit)+y};
    if(r.left<bounds.left||r.right>bounds.right||r.top<bounds.top||r.bottom>bounds.bottom)continue;
    if(blocks.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top))continue;
    candidates.push({x,y});
  }
  return candidates.sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y)[0]??null;
}
export function turnNews(rows, turn) {
  const risk=line=>/굶주림|포위|붕괴|무너졌|중상|상실|빼앗|군량 0/.test(line)?1:0;
  const sorted=rows.map((r,i)=>({...r,i})).sort((a,b)=>b.turn-a.turn||risk(b.line)-risk(a.line)||b.i-a.i);
  return {current:sorted.filter(r=>r.turn===turn).map(r=>r.line),all:sorted.map(r=>`${r.turn}차례 · ${r.line}`)};
}
export function overlapSelection(units, tileId, point, rectangles, previous=null) {
  let hits=units.filter(a=>a.tileId===tileId||rectangles.some(r=>r.id===a.armyId&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom)).map(a=>a.armyId).sort();
  const nearby=previous&&Math.hypot(point.x-previous.x,point.y-previous.y)<=8,old=previous?.key.split('|')??[];
  // Active flags may move on redraw. Keep the group while repeated clicks still touch it.
  if(nearby&&hits.some(id=>old.includes(id))&&old.every(id=>units.some(a=>a.armyId===id)))hits=old;
  const key=hits.join('|'),same=nearby&&previous.key===key;
  const index=same?(hits.indexOf(previous.id)+1)%hits.length:0;
  return {id:hits[index]??null,key,x:point.x,y:point.y,index,count:hits.length};
}
