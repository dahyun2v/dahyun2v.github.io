// @ts-check
// 유니티 UI/UX 방 (Claude, 2026-10-24) — 화면 ② 지도 층 모델: 세계 그림 투영 · 칸 · 성 · 보이는 부대 · 고른 부대의 이동 범위 · 경로 · 공격 예고.
// 규칙 판정(갈 수 있는 칸 · 경로 · 예상 손실)은 모두 고도 방 호스트(tools/port/host.mjs)의 armyOptions — 엔진 그대로. 여기서는 모양만 바꾼다.
// 투영식 = 웹 map-v3.mjs 세계 그림 배치(hexCenter · size 30 · tilt .62 · land 2577×2220 · ring 624). 유니티는 q,r → (x,y) → (u,v) 를 같은 식으로 계산한다.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const Host = await import(pathToFileURL(resolve(ROOT, 'tools/port/host.mjs')).href);
const {FACTION} = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/troops.mjs')).href);
const Combat = await import(pathToFileURL(resolve(ROOT, 'prototype/src/campaign-combat.mjs')).href);
const Display = await import(pathToFileURL(resolve(ROOT, 'prototype/src/troop-display.mjs')).href);
const Hud = await import(pathToFileURL(resolve(ROOT, 'prototype/app/world/hud-ink.mjs')).href);
const SIDE_NAME = {FRONT: '정면', FLANK: '측면', REAR: '후방'};
const STATE_NAME = {ORDERED: '정돈', DISORDERED: '흐트러짐', BROKEN: '붕괴', STEADY: '안정', SHAKEN: '동요', ROUTING: '패주'};
// world.js fcResult(내보내지 않는 함수 — 같은 식): 적 잃는 비율 − 아군 잃는 비율
const fcResult = (ef, af, destroyed) => destroyed ? '격파' : ef - af > 0.15 ? '대승' : ef - af > 0.05 ? '우세' : ef - af > -0.05 ? '접전' : '불리';

/** 교전 예고 판(설계 05-forecast §5 · §6) 값 — 엔진 previewAttack + 웹 world.js forecastHtml 의 보정 글 · 형세 식을 그대로. 규칙 계산 없음. */
function forecast05(state, p, me, t) {
  const m = p.multipliers ?? {};
  const pre = (id, fb) => p.units?.find((u) => u.unitId === id)?.preBattleCount ?? fb;
  const post = (id, fb) => p.units?.find((u) => u.unitId === id)?.postBattleCount ?? fb;
  const aT = pre(me.id, me.count ?? 0), tT = p.shownTargetCount ?? pre(t.id, t.count ?? 0);
  const aAfter = Math.max(0, post(me.id, aT - (p.allyLoss ?? 0))), tAfter = Math.max(0, tT - (p.enemyLoss ?? 0));
  const res = fcResult((tT - tAfter) / Math.max(1, tT), (p.allyLoss ?? 0) / Math.max(1, aT), tAfter <= 0 || (p.eliminatedIds ?? []).includes(t.id));
  // world.js forecastHtml 보정 글(지형 · 성 · 상성 · 도하 · 협공 · 방향)
  const mods = [...new Set((p.effectLines ?? []).map((line) => line.replace(/^병종 × 지형:\s*/, '지형 — ').replace(/공격 (-?\d+)%/, (_, n) => `공격 ${Number(n) > 0 ? '+' : '−'}${Math.abs(Number(n))}%`)))];
  const terr = state.tiles?.[t.tileId]?.terrainType;
  if (m.terrain && m.terrain !== 1) mods.push(`${terr === 'forest' ? '숲' : '언덕'} 방어 ×${m.terrain}`);
  if (m.castle && m.castle !== 1) mods.push(`성 방어 ×${m.castle}`);
  if (m.matchup && m.matchup !== 1) mods.push(`상성 ${m.matchup < 1 ? '불리' : '유리'} ×${m.matchup}`);
  if (m.river && m.river !== 1) mods.push(`도하 ×${m.river}`);
  if (m.flank && m.flank !== 1) mods.push(`협공 +${Math.round((m.flank - 1) * 100)}%`);
  const sideBonus = Number.isFinite(m.side) ? Math.round((m.side - 1) * 100) : 0;
  if (sideBonus) mods.push(`${SIDE_NAME[p.side]} +${sideBonus}%`);
  // 무게 순(웹 forecastModifiers — % · × 로 잼) 뒤 % 는 말로(총괄 10-24: 개발 용어 · % 쓰지 않기 — 정도 낱말 조금 · 꽤 · 크게 = 내정 글 사다리)
  const deg = (n) => (n <= 15 ? '조금' : n <= 30 ? '꽤' : '크게');
  const words = (t) => /^(정면|측면|후방) \+\d/.test(t) ? t.replace(/ \+(\d+)%$/, (_, n) => ` · 피해 ${deg(Number(n))} 더`)
    : t.replace(/\s*([+＋−-])\s*(\d+(?:\.\d+)?)\s*%/g, (_, sg, n) => ` ${deg(Number(n))} ${sg === '+' || sg === '＋' ? '더' : '덜'}`);
  const sorted = Hud.forecastModifiers(mods.map((text) => ({text}))).map((x) => words(x.text));
  const changes = [...(p.formationChanges ?? []), ...(p.moraleChanges ?? [])].filter((c) => c.armyId === t.id);
  const ch = changes[0];
  const risk = p.formationRisk?.check ? `${Hud.chanceText462(1 - p.formationRisk.successProbability)}로 전열을 한 단계 무너뜨림`
    : p.moraleRisk?.check ? `${Hud.chanceText462(1 - p.moraleRisk.successProbability)}로 사기를 떨어뜨림` : null;
  return {
    head: `${SIDE_NAME[p.side] ?? '공격'} · ${res}`, sideKey: p.side ?? null, result: res, risk,
    me: {role: '공격자', counterText: p.counter ? null : '반격 없음', counterLoss: p.counter ? `−${Display.troopText(p.allyLoss ?? 0)}` : null, firstStrike: !!p.firstStrike,
      beforeAfter: `${Display.troopText(aT)} → ${Display.troopText(aAfter)}`, mod: sorted[0] ?? null, modMore: Math.max(0, sorted.length - 1)},
    foe: {role: '대상', loss: `−${Display.troopText(tT - tAfter)}`, beforeAfter: `${Display.troopText(tT)} → ${Display.troopText(tAfter)}`,
      change: ch ? {kind: ch.to in {ORDERED: 1, DISORDERED: 1, BROKEN: 1} ? 'formation' : 'morale', text: `${STATE_NAME[ch.from] ?? ch.from} → ${STATE_NAME[ch.to] ?? ch.to}`} : null},
  };
}
const SQRT3 = Math.sqrt(3), TILT = 0.62, SIZE = 30, LAND = [2577, 2220], RING = 624;

/** 세계 그림 v16 조각(3×4) — 원본 크기 그대로(확대해도 흐리지 않게). 상자는 그림 비율(0~1). */
function worldTiles() {
  const m = JSON.parse(readFileSync(resolve(ROOT, 'prototype/assets/ui-v3/map/v16/manifest.json'), 'utf8'));
  const [W, H] = m.size;
  return {size: m.size, tiles: Object.entries(m.boxes).map(([name, [x0, y0, x1, y1]]) => ({art: `assets/ui-v3/map/v16/${name}.png`, u0: x0 / W, v0: y0 / H, u1: x1 / W, v1: y1 / H}))};
}

export function mapModel(state, {selectedArmyId = null, previewTileId = null} = {}) {
  const ps = new Host.PortSession(); ps.commit(state);
  const snap = ps.snapshot();
  const xy = ({q, r}) => ({x: SIZE * SQRT3 * (q + r / 2), y: SIZE * 1.5 * r * TILT});
  const pts = snap.map.tiles.map(xy), xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const wkx = (Math.max(...xs) - minX + SIZE * 2) / LAND[0], wky = (Math.max(...ys) - minY + SIZE * 2) / LAND[1];
  // u = ou + ku * x , v = ov + kv * y  (x,y = 웹 hexCenter 좌표, ox=oy=0)
  const ku = 1 / wkx / (LAND[0] + RING * 2), kv = 1 / wky / (LAND[1] + RING * 2);
  const proj = {size: SIZE, tilt: TILT, ou: (RING - (minX - SIZE) / wkx) / (LAND[0] + RING * 2), ov: (RING - (minY - SIZE) / wky) / (LAND[1] + RING * 2), ku, kv};
  const qr = (id) => { const [q, r] = String(id).split(',').map(Number); return {q, r}; };
  const own = new Set(snap.units.filter((u) => u.own).map((u) => u.id));
  const sel = selectedArmyId && own.has(selectedArmyId) ? selectedArmyId : snap.units.find((u) => u.own)?.id ?? null;
  const opt = sel ? ps.armyOptions(sel) : null;
  const name = (id) => snap.units.find((u) => u.id === id)?.name ?? id;
  // 미리보기 경로: 지정이 없으면 첫 대상(적) 쪽으로 가장 가까이 가는 한 차례 칸 — 견본 장면용(실제 게임은 마우스가 정함).
  let preview = opt?.move.find((m) => m.tileId === previewTileId) ?? null;
  if (!preview && opt?.move.length) {
    const target = snap.units.find((u) => !u.own && !u.remembered);
    const d = (a, b) => { const A = qr(a), B = qr(b); return (Math.abs(A.q - B.q) + Math.abs(A.r - B.r) + Math.abs(A.q + A.r - B.q - B.r)) / 2; };
    const occupied = new Set(snap.units.map((u) => u.tileId));
    preview = target ? [...opt.move].filter((m) => m.turns === 1 && !occupied.has(m.tileId) && m.path.length > 2).sort((a, b) => d(a.tileId, target.tileId) - d(b.tileId, target.tileId) || a.path.length - b.path.length)[0] ?? null : null;
  }
  return {
    world: worldTiles(), proj,
    tiles: snap.map.tiles.map((t) => ({q: t.q, r: t.r, vis: t.vis})),
    cities: snap.cities.map((c) => ({id: c.id, name: c.name, ...qr(c.center), own: c.own, capital: c.id === state.factions[state.playerFactionId]?.capitalCityId, color: FACTION[c.factionId]?.color ?? '#9a8f7a', besieged: c.besieged,
      defense: c.defense, defenseMax: c.defenseMax})),
    units: snap.units.filter((u) => !u.remembered).map((u) => ({id: u.id, name: u.name, ...qr(u.tileId), own: u.own, troop: {militia: 'sword', spear: 'spear', bow: 'bow', cavalry: 'cavalry'}[u.troop] ?? 'sword',
      countText: u.countText, color: FACTION[u.factionId]?.color ?? '#9a8f7a', art: officerArt(u.commanderId), head: artHead(officerArt(u.commanderId)), ended: u.ended, selected: u.id === sel})),
    selected: sel,
    move: opt ? opt.move.map((m) => ({...qr(m.tileId), turns: m.turns})) : [],
    path: preview ? {to: qr(preview.tileId), turns: preview.turns, steps: preview.path.map(qr), label: `${preview.turns}차례`} : null,
    attacks: opt ? opt.attackUnits.map((a) => {
      const t = snap.units.find((u) => u.id === a.targetId), me = snap.units.find((u) => u.id === sel), f = a.forecast;
      return {targetId: a.targetId, ...qr(t?.tileId), side: f?.side ?? null,
        sideText: {FRONT: '정면 공격', FLANK: '측면 공격', REAR: '후방 공격'}[f?.side] ?? '공격',
        me: {name: me?.name, art: me ? officerArt(me.commanderId) : null, head: me ? artHead(officerArt(me.commanderId)) : null, troop: me?.troopName ?? me?.troop, countText: me?.countText, lossText: f ? `−${f.allyLossText}` : '?', color: FACTION[state.playerFactionId]?.color},
        foe: {name: t?.name, art: t ? officerArt(t.commanderId) : null, head: t ? artHead(officerArt(t.commanderId)) : null, troop: t?.troopName ?? t?.troop, countText: t?.countText, lossText: f ? `−${f.enemyLossText}` : '?', color: FACTION[t?.factionId]?.color},
        counter: !!f?.counter, lines: f?.lines ?? [],
        // 05-forecast 판(공격자 → 대상 · 잃는 것 · 전후 · 보정 · 상태 변화) — 위 칸들은 옛 판 · 3D 장면 호환으로 둔다
        f05: (() => { const raw = Combat.previewAttack(state, sel, a.targetId); const A = state.armies[sel], T = state.armies[a.targetId];
          const f5 = forecast05(state, raw, {id: sel, count: A?.troopCount}, {id: a.targetId, count: T?.troopCount, tileId: T?.tileId});
          f5.me.troopKey = me ? ({militia: 'sword', spear: 'spear', bow: 'bow', cavalry: 'cavalry'}[me.troop] ?? 'sword') : 'sword';
          f5.foe.troopKey = t ? ({militia: 'sword', spear: 'spear', bow: 'bow', cavalry: 'cavalry'}[t.troop] ?? 'sword') : 'sword';
          return f5; })()};
    }) : [],
    names: Object.fromEntries(snap.units.map((u) => [u.id, name(u.id)])),
  };
}
