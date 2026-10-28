// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑧ 출진 편성 모델.
// 설계: docs/work-integration/20261023/screen-mockups/20-sortie/DESIGN.md(개발총괄 방 · 장소형).
// 값: 엔진 공개 view(성 · 장수) + 엔진 sortieTroopRange · sortieReason + 웹 city-stage planSorties(버리는 사본에서 고른 순서대로 실제 출진해 남는 예비병 · 식량 계산).
// 웹 world.js sortieRoster(내보내지 않는 지역 함수)와 같은 식을 옮겨 적었다(출처 줄 표시). 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead, selectedDock} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Roster, Stage, Display, Hud, Special, Combat, Engines, Effects] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-roster.mjs'), load('prototype/app/world/city-stage.mjs'),
  load('prototype/src/troop-display.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-special-troops.mjs'),
  load('prototype/src/campaign-combat.mjs'), load('prototype/src/campaign-engines.mjs'), load('prototype/src/campaign-effects.mjs'),
]);
/** 계통(엔진) 이름 · 기호(v4 명단 줄 — 총괄 '출진 가능 대신 계통 · 병종 기호'): 엔진 officerEngine → 정의 이름 · class-v1 그림 */
function engineOf(state, id) {
  const eid = Engines.officerEngine(state, id), e = eid ? Engines.ENGINES.find((x) => x.id === eid) : null;
  return e ? {name: e.name, icon: `assets/ui-kit/own/class-v1/${String(eid).toLowerCase()}.png`} : null;
}

/** 편성 뒤 스펙(사용자 10-25 출진 시안 v2 · 레퍼런스 RTK14 출진 부대 설정 — 부대 능력 · 진형 · 전법을 병력 막대 옆에서 바로):
 *  버리는 사본에서 고른 순서대로 실제 출진(웹 planSorties 와 같은 엔진 sortie) → 생긴 부대를 지도 독과 같은 함수(selectedDock)로 읽음.
 *  공격 · 방어 = 엔진 campaignUnitRatings(표준 부대와 견준 값) — 병력 막대 칸마다(엔진 단계 · 화면 500명) 미리 재 둠(막대를 움직이면 화면이 그 칸 값을 씀). */
function formationSpecs(state, cityId, rows) {
  const out = {};
  for (const r of rows) {
    if (r.reason || !r.count) continue;
    const copy = structuredClone(state);   // 줄마다 따로(한 사본에 둘째 부대부터는 공개 view 에 안 잡힘) — 그 장수만 이 병력으로 출진
    try { Roster.sortie(copy, r.request); } catch { continue; }
    const id = copy.officers[r.officerId]?.locationRef?.id, a = copy.armies[id];
    const v = R.view(copy), va = v.ownArmies[id];
    if (!a || !va) continue;
    const d = selectedDock(copy, v, va);
    const byCount = {}, save = [a.troopCount, a.maxTroopCount];
    const lo = r.range.min, hi = r.range.max, step = Math.max(1, r.range.step ?? 50), counts = new Set([lo, hi]);
    for (let n = lo; n <= hi; n += step) counts.add(n);
    for (const n of counts) { a.troopCount = n; a.maxTroopCount = Math.max(n, save[1]); const q = Combat.campaignUnitRatings(copy, id) ?? {}; byCount[n] = {attack: q.attack ?? null, defense: q.defense ?? null, text: t(n)}; }
    [a.troopCount, a.maxTroopCount] = save;
    const titles = copy.campaignGrowth?.officers?.[r.officerId]?.titles ?? [];
    const q = (k) => d.qwer.find((x) => x.key === k);
    const tc = Effects.campaignTactics(copy, id) ?? [];
    const text = (k) => String(tc.find((c) => c.slot === k)?.text ?? '');
    out[r.officerId] = {
      title: titles.at(-1)?.name ? `「${titles.at(-1).name}」` : '',
      byCount, klass: [d.klass?.engine, d.klass?.branch].filter(Boolean).join(' · '),
      core: d.traits?.core?.name ?? null, equipped: (d.traits?.equipped ?? []).map((t) => t.name), slots: d.traits?.slots ?? 3,
      tactics: ['E', 'R'].map((k) => ({key: k, name: q(k)?.name || '—', icon: q(k)?.icon ?? null, cost: q(k)?.cost ?? null, empty: !q(k)?.traitId,
        text: text(k), summary: plainSummary(text(k))})),   // v12 요약 한 줄 = 효과 글 첫 문장을 말로(% 없이 — 사용자 원칙) · 툴팁 = 전체 글(수치 그대로)
      // v4: 특기 칩 = 지도 독과 같은 아이콘 + 전체 이름(줄이지 않음) · 고유 먼저
      traits: [...(d.traits?.core ? [{...d.traits.core, core: true}] : []), ...(d.traits?.equipped ?? []).map((x) => ({...x, core: false}))].map((x) => ({name: x.full ?? x.name, icon: x.icon ?? null, text: x.text ?? '', core: x.core})),
      troopIcon: TROOP_KEY[a.troopType] ?? TROOP_KEY[Special.parentTroop(a.troopType)] ?? 'dao',   // 특수 병종 = 부모 병종 기호(C516)
      // v12(사용자 10-27): 장수 칸 = 계통(전직했을 때만 전직 이름) · 교전에 쓰는 능력 셋 · W 그림 / 부대 칸 = 병종 · 이동 · 사거리 · Q(병종 기호 툴팁)
      klassName: d.klass?.branch && d.klass.branch !== '기본' ? d.klass.branch : (d.klass?.engine ?? ''),
      w: q('W') ? {name: q('W').name, icon: q('W').icon ?? null} : null,
      q: q('Q')?.name ?? '',
      move: (d.ratings ?? []).find((x) => x.key === 'mobility')?.value ?? null,
      range: (d.ratings ?? []).find((x) => x.key === 'range')?.value ?? null,
    };
  }
  return out;
}
/** 요약 줄: 첫 문장 · '+40%' 같은 수치는 말로('크게 늘어남') · '30% 확률'은 '낮은/일정/높은 확률'(사용자 10-23 '개발 용어 · % 쓰지 않기') */
function plainSummary(txt) {
  const first = String(txt ?? '').split(/[.。]/)[0].trim();
  const batchim = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  return first
    .replace(/(\d+(?:\.\d+)?)\s*%\s*확률/g, (_, n) => `${Number(n) <= 30 ? '낮은' : Number(n) <= 60 ? '일정' : '높은'} 확률`)
    .replace(/([가-힣]+)\s*([+−-])\s*(\d+(?:\.\d+)?)\s*%p?/g, (_, w, sg, n) => `${w}${batchim(w) ? '이' : '가'} ${Number(n) >= 30 ? '크게 ' : Number(n) <= 10 ? '조금 ' : ''}${sg === '+' ? '늘어남' : '줄어듦'}`)
    .replace(/\s*\d+(?:\.\d+)?\s*%p?/g, '');
}
const TROOP_KEY = {BT01: 'dao', BT02: 'spear', BT03: 'bow', BT04: 'cavalry', militia: 'dao', sword: 'dao', spear: 'spear', bow: 'bow', cavalry: 'cavalry'};
const t = (n) => Display.troopText(n);

/** 견본(설계 §6 기본 · c457 r2 장면 값): 새 판 · 바깥 부대 없음(조조 · 장료가 업 안) · 업 예비병 25,000 · 조인 쉬는 중(2차례) · 조조 2,000 / 허저 5,000 / 장료 5,000 고름 · 보는 장수 = 장료. */
export function sortieScene() {
  const s = R.createCampaign({startCities: 'fixed', factionId: 'F01', fieldArmies: false, manualEndTurn: true, c31: false, council: false});
  const cid = s.factions[s.playerFactionId].capitalCityId;
  const lots = s.personnel.lots.filter((l) => l.nodeId === cid && l.kind !== 'WOUNDED' && !l.identity?.specialTroopId);
  const add = 2500 - lots.reduce((n, l) => n + l.count, 0);
  lots[0].count += add; s.personnel.initialPersonnel += add; s.cities[cid].reserveTroops = 2500;   // 병력 보존 장부도 같이(엔진 PERSONNEL_CONSERVATION)
  s.officers.G34.restUntilTurn = s.turn + 2;                                              // 엔진 쉬는 중 규칙 그대로(campaign-fatigue restUntilTurn)
  return {state: s, cityId: cid, selections: [{officerId: 'G07', count: 200}, {officerId: 'G25', count: 500}, {officerId: 'G24', count: 500}], viewId: 'G24'};
}

/** 웹 실측과 같은 판(port/godot/ui/tools/web-port-fixture.mjs 'sortie') — kind: web(조조) · web-empty · web-two(조조 · 허저) */
export function webSortieScene(kind = 'web') {
  const s = R.createCampaign({factionId: 'F01', seed: 489, startCities: 'fixed', fieldArmies: false, council: false, c31: false, manualEndTurn: true});
  const cid = s.factions[s.playerFactionId].capitalCityId;
  const selections = kind === 'web-empty' ? [] : kind === 'web-two' ? [{officerId: 'G07', count: null}, {officerId: 'G25', count: null}] : [{officerId: 'G07', count: null}];
  return {state: s, cityId: cid, selections, viewId: null};
}

export function sortieModel(state, cityId, selections, viewId = null) {
  const v = R.view(state), c = v.ownCities[cityId];
  // world.js sortieRoster: 자유 장수 + 태수
  const ids = [...new Set([...(c.freeOfficers ?? []).map((o) => o.officerId), ...(c.governorId ? [c.governorId] : [])])];
  const plan = Stage.planSorties(state, cityId, selections);
  const picked = new Map(plan.rows.map((r, i) => [r.officerId, {...r, order: i + 1}]));
  const rows = ids.map((id) => {
    const o = v.officers[id], type = o.troopType;
    const r = Roster.sortieTroopRange(state, state.cities[cityId], type, id);
    const reason = Roster.sortieReason(state, {cityId, officerId: id, troopType: type, troopCount: r.min})?.message ?? null;
    const status = [id === c.governorId ? '태수' : '', Hud.fatigueLineText(o.fatigue)].filter(Boolean).join(' · ');
    const p = picked.get(id);
    const troopName = Special.troopInfo(state, type)?.troopDisplayName ?? '';
    return {id, name: o.name, art: officerArt(id), head: artHead(officerArt(id)), troop: TROOP_KEY[type] ?? TROOP_KEY[Special.parentTroop(type)] ?? 'dao', troopName,
      selected: !!p, order: p?.order ?? null, countText: p ? t(p.count) : null, count: p?.count ?? null,
      range: p ? {min: p.range.min, max: p.range.max, step: p.range.step, minText: t(p.range.min), maxText: t(p.range.max)} : null,
      troopLabel: `기본 · ${troopName}`, rowReason: p?.reason ?? null,
      status, disabled: !!reason && !p, reason: !p ? reason : null};
  });
  // 정렬(설계 §10): 고른 행(고른 순서) → 고르지 않은 행(출진 가능 → 태수 → 불가)
  const rank = (r) => (r.disabled ? 2 : r.status.startsWith('태수') ? 1 : 0);
  const sorted = [...rows.filter((r) => r.selected).sort((a, b) => a.order - b.order), ...rows.filter((r) => !r.selected).sort((a, b) => rank(a) - rank(b))];
  const view = viewId ?? sorted.find((r) => !r.disabled)?.id ?? sorted[0]?.id;
  const vr = sorted.find((r) => r.id === view);
  const first = plan.rows[0];
  return {
    screen: 'sortie', title: '출진 편성', place: `${c.name} 병영`, cityId,
    viewId: view, viewed: vr ? {id: vr.id, name: vr.name, art: vr.art, head: vr.head} : null,
    rows: sorted.map((r) => ({...r, viewing: r.id === view, expanded: r.id === view && r.selected})),
    totals: plan.rows.length ? {total: t(plan.total), food: Number(plan.food).toFixed(1)} : null,
    reserve: {before: t(c.reserveTroops), after: plan.rows.length ? t(plan.remaining) : null},
    sortie: {ok: plan.rows.length > 0 && !first?.reason, reason: !plan.rows.length ? '함께 나갈 장수를 고르세요' : first?.reason ?? null},
    tabs: [{key: 'all', label: '전체', selected: true}, {key: 'cavalry'}, {key: 'spear'}, {key: 'bow'}, {key: 'dao'}],
    web: webSortie(state, cityId, selections, viewId),
  };
}

// ---- 10-25 웹 그대로(사용자 "출진 편성 화면은 예전 것이 더 나은 듯"): world.js renderSortie · city-stage sortieHtml 과 같은 글 · 순서 ----
// world.js musterTroopChoices — 이 장수가 고를 수 있는 병종(엔진 musterOptions)
function musterTroopChoices(v, c, officerId) {
  const o = v.officers[officerId], types = o?.multiTroopTrait?.troopTypes ?? [o?.troopType];
  return (c?.musterOptions?.find((m) => m.officerId === officerId)?.troops ?? []).filter((x) => types.includes(x.parentTroopType ?? x.troopType));
}
const TONE = {F01: 'red', F02: 'green', F03: 'blue'};
export function webSortie(state, cityId, selections, viewId = null) {
  const v = R.view(state), c = v.ownCities[cityId];
  const ids = [...new Set([...(c.freeOfficers ?? []).map((o) => o.officerId), ...(c.governorId ? [c.governorId] : [])])];
  const plan = Stage.planSorties(state, cityId, selections);
  const roster = ids.map((id) => {
    const o = v.officers[id], type = o.troopType, r = Roster.sortieTroopRange(state, state.cities[cityId], type, id);   // 장수 ID = 칭호 상한 보너스(리뷰 v12-1)
    const b = o.baseStats ?? {};
    const reason = Roster.sortieReason(state, {cityId, officerId: id, troopType: type, troopCount: r.min})?.message ?? null;
    const on = plan.rows.some((p) => p.officerId === id);
    const eng = engineOf(state, id);
    return {id, name: o.name, face: officerArt(id), head: artHead(officerArt(id)), troopName: Special.troopInfo(state, type)?.troopDisplayName ?? '', on, disabled: !!reason && !on,
      squad: Stage.sortieSquadPath(type, TONE[c.ownerFactionId] ?? 'grey').replace(/^\//, ''),
      troop: TROOP_KEY[type] ?? TROOP_KEY[Special.parentTroop(type)] ?? 'dao', klass: eng?.name ?? '', klassIcon: eng?.icon ?? null, order: on ? plan.rows.findIndex((p) => p.officerId === id) + 1 : null,
      // v12: 장수 능력 다섯 그대로(사용자 10-27 '정치 · 매력도 하위 스탯은 전투랑 연동' — 정본 20 §10: 하위 능력치가 교전식에 들어감, 예 사기 판정 = 지휘 + 감화-결집)
      stats: [['leadership', '통솔'], ['might', '무력'], ['intelligence', '지력'], ['politics', '정치'], ['charisma', '매력']].map(([key, label]) => ({key, label, value: b[key] ?? null})),
      range: {min: r.min, max: r.max, step: r.step ?? 50},
      warn: reason ?? (Hud.fatigueLineText(o.fatigue) || ''),   // v4: 못 나갈 때(이유) · 피로가 있을 때만 셋째 줄
      line: reason ?? `${id === c.governorId ? '태수 · ' : ''}${Hud.fatigueLineText(o.fatigue) || '출진 가능'}`, refusal: !!reason,
      trait: o.growth ? {ok: !o.growth.traitLoadoutReason, tip: o.growth.traitLoadoutReason ?? '보유 일반특기에서 장착할 특기를 고릅니다'} : null};
  });
  const last = selections.length ? selections[selections.length - 1].officerId : null;
  const view = viewId ?? last ?? roster.find((r) => !r.disabled)?.id ?? roster[0]?.id;
  const specs = formationSpecs(state, cityId, plan.rows);
  // v12: 아직 안 넣은 장수도 줄 끝 부대 칸 · 왼쪽 카드에 값이 필요 — 남는 예비병 안에서 낼 수 있는 최대 병력으로 버리는 사본 출진
  const extra = [];
  for (const row of roster) {
    if (row.on || row.disabled) continue;
    const mx = row.range.max;   // 줄 값 = 지휘 상한(원래 판 기준) · 남는 예비병이 모자라면 막지 않고 알림만(앞 부대 병력을 줄이면 넣을 수 있음)
    row.short = (plan.remaining ?? mx) < row.range.min;
    const st = Math.max(1, row.range.step ?? 50), now = Math.min(mx, plan.remaining ?? mx);
    row.maxNow = row.short ? mx : row.range.min + Math.floor((now - row.range.min) / st) * st;   // 넣으면 실제로 받는 병력(남는 예비병 안 · 단계 맞춤)
    row.maxText = t(row.maxNow);
    if (row.short) row.warn = '남는 예비병이 모자람 — 앞 부대 병력을 줄이세요';
    extra.push({officerId: row.id, count: mx, reason: null, range: {min: row.range.min, max: mx, step: row.range.step},
      request: {cityId, officerId: row.id, troopType: v.officers[row.id].troopType, troopCount: mx}});
  }
  Object.assign(specs, formationSpecs(state, cityId, extra));
  for (const row of roster) {
    if (!row.disabled || specs[row.id]) continue;
    try {   // 쉬는 중(restUntilTurn) · 태수만 지움 — 부상 · 피로 장부는 건드리지 않음(엔진 불변식) · 실패하면 계통만
      const copy = structuredClone(state), o = copy.officers[row.id], c2 = copy.cities[cityId];
      delete o.restUntilTurn;
      if (c2.governorId === row.id) c2.governorId = null;
      const rr = Roster.sortieTroopRange(copy, c2, o.troopType, row.id);
      // 예비병이 모자라도 보기는 되게(리뷰 v12-2): 사본에만 최소 병력만큼 예비병을 더함(엔진 병력 보존 장부도 같이 — sortieScene 과 같은 법)
      const lots = copy.personnel?.lots?.filter((l) => l.nodeId === cityId && l.kind !== 'WOUNDED' && !l.identity?.specialTroopId) ?? [];
      if (lots.length) { lots[0].count += rr.min; copy.personnel.initialPersonnel += rr.min; c2.reserveTroops = (c2.reserveTroops ?? 0) + rr.min; }
      Object.assign(specs, formationSpecs(copy, cityId, [{officerId: row.id, count: rr.min, reason: null, range: {min: rr.min, max: rr.min, step: rr.step ?? 50},
        request: {cityId, officerId: row.id, troopType: o.troopType, troopCount: rr.min}}]));
    } catch { /* 보기용 — 계통만 아래에서 */ }
    if (!specs[row.id]) { const eng = engineOf(state, row.id); specs[row.id] = {klassName: eng?.name ?? '', tactics: [], traits: [], byCount: {}, w: null, q: '', move: null, range: null}; }
    specs[row.id].previewOnly = true;   // 못 나가는 장수 — 카드는 보이되 부대 값은 안 씀
  }
  for (const row of roster) { row.spec = specs[row.id] ?? null; if (row.on) { const p = plan.rows.find((x) => x.officerId === row.id); row.countText = t(p.count); row.maxText = t(p.range.max); } }
  const formations = plan.rows.map((r) => {
    const troops = musterTroopChoices(v, c, r.officerId);
    return {id: r.officerId, name: v.officers[r.officerId]?.name ?? r.officerId, face: officerArt(r.officerId), head: artHead(officerArt(r.officerId)), troopType: r.troopType,
      options: troops.map((x) => ({type: x.troopType, label: `${x.troopType === x.parentTroopType ? `기본 · ${x.troopDisplayName}` : x.troopDisplayName}${x.blockedReason ? ` · ${x.blockedReason}` : ''}`, disabled: !!x.blockedReason})),
      count: r.count, countText: t(r.count), min: r.count === 0 ? 0 : r.range.min, max: r.count === 0 ? 0 : r.range.max, step: r.range.step ?? 50,
      note: r.reason ?? `최대 ${t(r.range.max)}명 · 500명 단위 조절`,
      squad: Stage.sortieSquadPath(r.troopType, TONE[c.ownerFactionId] ?? 'grey').replace(/^\//, ''),
      troopName: troops.find((x) => x.troopType === r.troopType)?.troopDisplayName ?? Special.troopInfo(state, r.troopType)?.troopDisplayName ?? '',
      spec: specs[r.officerId] ?? null};
  });
  const units = plan.units ?? plan.rows.filter((r) => !r.reason && r.count > 0).length;
  return {
    head: `${c.name} 병영 · 출진 편성`, close: '병영으로 돌아가기 ×', title: '출진 편성', sequence: '함께 나갈 장수를 고르세요',
    art: view ? officerArt(view) : null, viewId: view, formations, roster, rosterCount: `${roster.length}명`,
    totals: {units: String(units), total: t(plan.total), remaining: t(plan.remaining), food: String(plan.food)}, go: units > 0,
    note: '고른 순서대로 즉시 출진 · 이번 차례에 이동 가능',
    bg: 'assets/ui-v3/city-stage-ink/facility-barracks.webp',
  };
}
