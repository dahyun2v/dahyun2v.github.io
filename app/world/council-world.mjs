// 평정(council) — /world 화면판. 기준 그림 final-council-v2(2026-10-09 비주얼 디렉션): 위 = 평정 방 장면에 군사·제안한 장수들이 앉고,
// 아래 = 먹 판(왼쪽 안건 줄 · 가운데 보고/안건 내용 · 오른쪽 큰 인장 = 결의). 엔진은 /src/campaign-council.mjs(C90) 그대로 — 그리기와 명령만.
// Claude 2026-10-10. 석실 화면(seoksil/screens/council.mjs)의 흐름(군사 고르기 → 안건 고르기 → 결의/보류 → 평정 마침)을 그대로 따른다.
import {COUNCIL,councilCandidates} from '/src/campaign-council.mjs';
import {campaignDate} from '/src/campaign-map-model.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const KIND = COUNCIL.proposals.kinds;
const GLYPH = {ATTACK_CITY: '攻', DEFEND_CITY: '守', BUILD_HUB: '補', MUSTER: '出', CITY_DEVELOP: '政', DIPLOMACY: '外', EXPLORE: '探', RECRUIT: '登'};
const shortDate = (turn) => campaignDate(turn).split('년 ')[1] ?? campaignDate(turn);
const ui = new WeakMap();

/** 이번 차례에 열린 평정이 있고 아직 정하지 않은 안건 수(레일 표시용). */
export function councilPending(state) {
  const c = state?.council;
  if (!c || c.status !== 'OPEN' || c.turn !== state.turn) return 0;
  return Math.max(1, c.proposals.filter((p) => p.decision === null).length);
}

/**
 * root 에 평정 화면을 그린다.
 * ctx = {dispatch(cmd), rerender(), close(), fullArt(id) → {src,cut}, face(id) → src, cutout(src) → Promise<src>, bg, factionColor}
 */
export function renderCouncilWorld(root, state, ctx) {
  const u = ui.get(root) ?? {selectedId: null, appoint: null, pick: null};
  ui.set(root, u);
  const c = state.council, me = state.playerFactionId;
  const o = (id) => state.officers[id], name = (id) => o(id)?.name ?? '—';
  if (!c) { root.innerHTML = '<section class="wc"><p class="wc-empty">평정이 없는 지도입니다.</p></section>'; return; }
  const open = c.status === 'OPEN' && c.turn === state.turn;
  const canAppoint = open && !c.appointmentUsed;
  const firstChoice = open && c.candidates.length > 0 && !c.appointmentUsed;
  if (u.appoint === null) u.appoint = firstChoice;
  if (!canAppoint) u.appoint = false;
  const selected = c.proposals.find((p) => p.id === u.selectedId) ?? null;
  const deciding = !!selected && selected.decision === null && open && !u.appoint;
  const strategist = o(c.strategistId);
  const ruler = state.factions[me]?.rulerId;

  // ── 장면 위 사람들: 군사(왼쪽 앞) · 제안한 장수(오른쪽 앞 · 왼쪽 뒤 · 오른쪽 뒤). 군주는 그리지 않는다 — 플레이어가 군주이고, 화면은 군주 자리에서 탁자를 내려다보는 눈이다(사용자 2026-10-10 "플레이어=군주잖아", 기준 final-council-v2) ──
  const lead = u.appoint ? (u.pick ?? c.strategistId) : c.strategistId;   // 오른쪽 앞자리: 군사(고르는 중에는 지금 고른 후보)
  const others = u.appoint ? (c.candidates.length ? c.candidates : councilCandidates(state).slice(0, 3).map((x) => x.officerId)) : c.proposals.slice(0, 3).map((p) => p.proposerId);
  const cast = [{id: lead, seat: 'r1'}, ...[...new Set(others)].filter((id) => id !== lead).slice(0, 3).map((id, i) => ({id, seat: ['l1', 'l2', 'r2'][i]}))]
    .filter((x) => x.id && o(x.id));
  const speaking = selected ? selected.proposerId : lead;
  const figures = cast.map(({id, seat}) => {
    const art = ctx.fullArt?.(id);
    return art ? `<figure class="wc-fig wc-fig--${seat}${id === speaking ? ' is-speaking' : ''}" data-fig="${esc(id)}"><img src="${esc(art.src)}" alt="${esc(name(id))}"${art.cut ? '' : ' data-cut="1" style="opacity:0"'}><figcaption>${esc(name(id))}${id === c.strategistId ? '<small>군사</small>' : id === ruler ? '<small>군주</small>' : ''}</figcaption></figure>` : '';
  }).join('');

  // ── 왼쪽 안건 줄 / 군사 후보 줄 ──
  let rows;
  if (u.appoint) {
    const pool = c.candidates.length ? c.candidates : councilCandidates(state).slice(0, 3).map((x) => x.officerId);
    rows = pool.map((id) => { const st = o(id)?.baseStats ?? {}; const f = ctx.face?.(id);
      return `<button class="wc-row${id === (u.pick ?? c.strategistId) ? ' is-picked' : ''}" data-pick-officer="${esc(id)}"><span class="wc-ic">師</span><span class="wc-face">${f ? `<img src="${esc(f)}" alt="">` : ''}</span><span class="wc-tx"><b>${esc(name(id))}</b><small>${id === c.strategistId ? '지금 군사' : '군사 후보'} · 지략 ${st.intelligence ?? '—'} · 지휘 ${st.leadership ?? '—'} · 정무 ${st.politics ?? '—'}</small></span></button>`; }).join('');
  } else {
    rows = c.proposals.map((p) => { const k = KIND[p.kind], st = p.decision, f = ctx.face?.(p.proposerId);
      return `<button class="wc-row${p.id === u.selectedId ? ' is-picked' : ''}${st ? ' is-done' : ''}" data-proposal="${esc(p.id)}"><span class="wc-ic" data-kind="${esc(p.kind)}">${GLYPH[p.kind] ?? '議'}</span><span class="wc-face">${f ? `<img src="${esc(f)}" alt="">` : ''}</span><span class="wc-tx"><b>${esc(k?.label ?? p.kind)} <em>${esc(name(p.proposerId))}</em></b><small>${esc(p.what)}</small></span><span class="wc-st ${st === 'APPROVE' ? 'ok' : st === 'HOLD' ? 'hold' : ''}">${st === 'APPROVE' ? '결의' : st === 'HOLD' ? '보류' : ''}</span></button>`; }).join('') || '<p class="wc-none">올라온 안건이 없습니다.</p>';
  }

  // ── 가운데: 군사 보고 / 고른 안건 ──
  const fx = COUNCIL.decision.fulfilled.effects, bx = COUNCIL.decision.broken.effects;
  let detail;
  if (u.appoint) {
    detail = `<h3>군사</h3><p class="wc-say">${firstChoice ? `첫 평정이다. 곁에서 보고하고 계책을 낼 군사를 고른다. 고르지 않으면 ${esc(name(c.strategistId))}이(가) 맡는다.` : '군사는 평정마다 한 번 바꿀 수 있다.'}</p><p class="wc-note">지략 ${COUNCIL.strategist.foresight.intelligenceAtLeast} 이상이면 보고에 적의 다음 수를 짐작하는 한 줄이 붙는다.</p>`;
  } else if (selected) {
    detail = `<h3>${esc(KIND[selected.kind]?.label ?? selected.kind)} <small>${esc(name(selected.proposerId))} · ${esc(shortDate(c.turn + 2))}까지</small></h3><p class="wc-say">“${esc(selected.what)}”</p>
      <dl class="wc-facts"><div><dt>기대</dt><dd>${esc(selected.expected)}</dd></div><div><dt>위험</dt><dd>${esc(selected.risk)}</dd></div>
      <div><dt>지키면</dt><dd>${esc(name(selected.proposerId))} 경험 +${fx.proposerExperience} · 친밀 +${fx.rulerAffinity}</dd></div><div><dt>어기면</dt><dd>군주와 친밀 ${bx.rulerAffinity}</dd></div></dl>`;
  } else {
    const lines = open ? c.report : [c.advisorLine ?? '변경은 조용합니다.'];
    detail = `<h3>${open ? `군사 ${esc(strategist?.name ?? '')}의 보고` : '군사 한마디'}</h3>${lines.map((l) => `<p class="wc-line">${esc(l)}</p>`).join('') || '<p class="wc-line">보고할 것이 없습니다.</p>'}`;
  }

  // ── 오른쪽: 큰 인장 + 작은 단추 ──
  let sealOn = false, sealLabel, sealAct = 'approve', small = '';
  const btn = (act, label) => `<button class="wc-btn" data-act="${act}">${esc(label)}</button>`;
  if (u.appoint) {
    // 첫 평정: 지금 군사가 기본으로 골라져 있고(줄이 붉게), 인장을 누르면 그대로 맡긴다 — 인장이 꺼진 채 작은 단추만 살아 있던 것을 바꿈(시안 final-council-v2: 인장이 결정의 자리, 2026-10-11)
    const keep = !u.pick || u.pick === c.strategistId;
    if (firstChoice && keep) { sealOn = true; sealAct = 'appoint-cancel'; sealLabel = `${name(c.strategistId)}에게 맡긴다`; }
    else { small = btn('appoint-cancel', firstChoice ? `${name(c.strategistId)}에게 맡긴다` : '그대로 둔다'); sealOn = !keep; sealAct = 'appoint'; sealLabel = '군사로 삼는다'; }
  } else if (deciding) {
    small = btn('hold', '보류') + btn('deselect', '물린다');
    sealOn = true; sealLabel = '결의 — 되돌릴 수 없음';
  } else if (open) {
    small = (canAppoint ? btn('appoint-open', '군사 바꾸기') : '') + btn('close-council', '평정을 마친다');
    sealLabel = selected ? '이미 정한 안건' : '안건을 고르면 인장을 찍는다';
  } else {
    sealLabel = '이번 달 평정은 끝났다';
  }
  const dots = c.resolutions.map((r) => `<i class="wc-res is-${r.status.toLowerCase()}" title="${esc(KIND[r.kind]?.label ?? r.kind)} · ${esc(name(r.proposerId))} — ${r.status === 'ACTIVE' ? `${esc(shortDate(r.deadlineTurn))}까지` : r.status === 'FULFILLED' ? '지킴' : '어김'}"></i>`).join('');

  root.innerHTML = `<section class="wc" style="--council-bg:url(${esc(ctx.bg ?? '')});--fc:${esc(ctx.factionColor ?? '#777')}" aria-label="평정">
    <div class="wc-scene"><i class="wc-shade"></i>${figures}</div>
    <header class="wc-top"><b>평정</b><span>${esc(state.factions[me]?.name ?? '')} · ${esc(campaignDate(state.turn))}</span><span class="wc-dots" title="결의">${dots}</span><button class="wc-exit" data-act="exit" title="지도로 — 평정은 열어 둔 채 (Esc)">지도로</button></header>
    <div class="wc-panel">
      <div class="wc-list" role="list">${rows}</div>
      <div class="wc-detail">${detail}</div>
      <div class="wc-sealbox"><button class="wc-seal" data-act="${sealAct}"${sealOn ? '' : ' disabled'} aria-label="${esc(sealLabel)}"><span>印</span></button><small>${esc(sealLabel)}</small><div class="wc-small">${small}</div></div>
      <nav class="wc-tools" aria-label="평정 도구"><button class="wc-tool" data-act="${u.appoint ? 'appoint-cancel' : 'appoint-open'}"${u.appoint || canAppoint ? '' : ' disabled'} title="${u.appoint ? '군사 고르기를 닫는다' : '군사 바꾸기'}"${u.appoint ? ' aria-pressed="true"' : ''}><img src="/assets/ui-v3/hud/icons/b-gear.png" alt="군사 바꾸기"></button><button class="wc-tool" data-act="who" title="자리에 앉은 사람 — 명부를 연다"><img src="/assets/ui-v3/hud/icons/mode-roster.png" alt="참석자"></button></nav>
    </div>
  </section>`;
  for (const im of root.querySelectorAll('.wc-fig img[data-cut]')) ctx.cutout?.(im.getAttribute('src')).then((s) => { if (im.isConnected) { if (s) im.src = s; im.style.opacity = ''; } });

  // ── 명령 ──
  const rerender = () => ctx.rerender();
  const send = (cmd) => { try { ctx.dispatch(cmd); return true; } catch (e) { ctx.toast?.(String(e?.message ?? e)); return false; } };
  const on = (act, fn) => root.querySelectorAll(`[data-act="${act}"]`).forEach((b) => { b.onclick = fn; });
  root.querySelectorAll('[data-proposal]').forEach((b) => { b.onclick = () => { u.selectedId = u.selectedId === b.dataset.proposal ? null : b.dataset.proposal; rerender(); }; });
  root.querySelectorAll('[data-pick-officer]').forEach((b) => { b.onclick = () => { u.pick = b.dataset.pickOfficer; rerender(); }; });
  on('appoint-open', () => { u.appoint = true; u.pick = null; u.selectedId = null; rerender(); });
  on('appoint-cancel', () => { u.appoint = false; rerender(); });
  on('appoint', () => { if (send({type: 'COUNCIL_APPOINT', officerId: u.pick})) { u.appoint = false; u.pick = null; } rerender(); });
  on('deselect', () => { u.selectedId = null; rerender(); });
  on('hold', () => { if (send({type: 'COUNCIL_DECIDE', proposalId: u.selectedId, decision: 'HOLD'})) u.selectedId = null; rerender(); });
  on('approve', (e) => { const b = e.currentTarget, id = u.selectedId; b.classList.add('is-pressed'); b.disabled = true;
    setTimeout(() => { if (send({type: 'COUNCIL_DECIDE', proposalId: id, decision: 'APPROVE'})) u.selectedId = null; rerender(); }, 450); });
  on('close-council', () => { send({type: 'COUNCIL_CLOSE'}); ctx.close?.(); });
  on('exit', () => ctx.close?.());
  on('who', () => { ctx.close?.(); document.querySelector('#roster-open')?.click(); });   // 참석자 = 명부(평정은 열어 둔 채 닫힌다 — 다시 열면 그대로)
}

/** Esc: 고른 안건/군사 고르기를 먼저 물리고, 아무것도 없으면 false(화면 닫기). */
export function councilEscape(root) {
  const u = ui.get(root); if (!u) return false;
  if (u.appoint && u.pick) { u.pick = null; return true; }
  if (u.selectedId) { u.selectedId = null; return true; }
  return false;
}
