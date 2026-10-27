// @ts-check
// 유니티 UI/UX 방 (Claude, 2026-10-24) — 지도 HUD 모델.
// 규칙 엔진의 플레이어 공개 view 와 엔진 공개 질의(능력치 · 전법 · 병종 Q)만 읽어 HUD 한 장에 필요한 값을 만든다.
// 아이콘 고르기 · 능력 이름은 웹 HUD 모듈(hud-ink.mjs)의 공개 함수를 그대로 빌려 웹과 같은 뜻을 유지한다(읽기만).
// 숨은 정보는 넣지 않는다: 능력치 · 전법은 내 부대만, 작은 지도는 view 의 공개 투영만.
import {advisorModel, crisisModel, choiceModel, dejaVuModel, runModel, ambitionModel, councilModel, achievementRecordsModel, captiveModel, occupationModel, visitModel, ritualModel} from './gap2-model.mjs';
import {dirname, resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {fileURLToPath, pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync, existsSync} from '../../../../tools/port/web/shims/node-fs.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Combat, Effects, MapModel, Display, Hud, Morale, Roster, Rel, Registry] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-combat.mjs'), load('prototype/src/campaign-effects.mjs'),
  load('prototype/src/campaign-map-model.mjs'), load('prototype/src/troop-display.mjs'), load('prototype/app/world/hud-ink.mjs'),
  load('prototype/src/campaign-morale.mjs'), load('prototype/src/campaign-roster.mjs'), load('prototype/src/campaign-relations.mjs'), load('prototype/src/campaign-rule-registry.mjs'),
]);
const OFFICER_LABELS = Object.fromEntries((Registry.UNIQUE_OFFICERS ?? []).map((o) => [o.id, o.name]));   // 웹 world.js:260 — 판에 없는 장수 이름
// 인연 · 세트 자료(웹 world.js:361 bondsData — 같은 파일)
const BONDS = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, 'docs/design-data/officer-pack/bonds-v0.1.json'), 'utf8')); } catch { return {sets: [], teamUps: []}; } })();

const TROOP_KEY = {BT01: 'dao', BT02: 'spear', BT03: 'bow', BT04: 'cavalry', militia: 'dao', sword: 'dao', spear: 'spear', bow: 'bow', cavalry: 'cavalry'};
const cutoutSource = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, 'prototype/assets/officer-art/cutout/source.json'), 'utf8')); } catch { return {}; } })();

/** 장수 그림(웹 fullArt 와 같은 순서: 오린 원화 → 흉상). prototype/ 기준 상대 경로. */
export function officerArt(id) {
  if (!id) return null;
  const cut = cutoutSource[id]?.file ?? `${id}.png`;
  if (existsSync(resolve(ROOT, 'prototype/assets/officer-art/cutout', cut))) return `assets/officer-art/cutout/${cut}`;
  if (existsSync(resolve(ROOT, `prototype/assets/officer-art/bust/${id}.webp`))) return `assets/officer-art/bust/${id}.webp`;
  return null;
}
const heads = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, 'prototype/assets/officer-art/cutout/heads.json'), 'utf8')).files; } catch { return {}; } })();
/** 원화 안 머리 상자(웹 heads.json — 얼굴 자르기 · 흉상 맞춤의 정본). {w, h, cx, cy, side} 는 그림 px. */
export function artHead(art) {
  const e = art && heads[art.split('/').pop()];
  if (!e) return null;
  const [w, h] = e.size, [hx, hy, hs] = e.head;
  return {w, h, cx: Math.round(hx * w), cy: Math.round(hy * h), side: Math.round(hs * w)};
}
/** 웹 dockIcon327 HTML 에서 원본 그림 경로만 뽑는다(같은 아이콘 고르기). */
function iconSource(html) {
  const m = /data-source="\/([^"]+)"/.exec(html) ?? /src="\/([^"]+)"/.exec(html);
  return m ? m[1] : null;
}
const dateText = (turn) => { const n = turn - 1; return `${190 + Math.floor(n / 36)}년 ${Math.floor((n % 36) / 3) + 1}월 ${['상순', '중순', '하순'][n % 3]}`; };
const signed = (n) => { const r = Math.round(n); return r > 0 ? `+${r}` : r < 0 ? `−${Math.abs(r)}` : ''; };
const num = (n) => Math.round(n).toLocaleString('en-US');

/** HUD 한 장. selectedArmyId 가 없으면 마지막 내 부대(웹 fixture 의 기본 선택과 같음). */
export function hudModel(state, {selectedArmyId = null} = {}) {
  const s = state, v = R.view(s), own = Object.values(v.ownArmies), cities = Object.values(v.ownCities);
  const sum = (k) => cities.reduce((n, c) => n + (Number(c[k]) || 0), 0), fc = (k) => cities.reduce((n, c) => n + (Number(c.economyForecast?.[k]) || 0), 0);
  const ruler = v.officers[v.faction.rulerId];
  const research = v.research && Number.isFinite(v.research.nextThreshold) ? v.research : null;
  const resources = [
    {key: 'food', label: '식량', value: num(sum('foodStock')), max: sum('foodCapacity') ? num(sum('foodCapacity')) : null, delta: signed(fc('food')), tip: `세력이 쌓아 둔 식량 · 다음 정산 산출 +${Math.round(fc('food'))}`},
    {key: 'production', label: '생산', value: num(sum('production')), max: null, delta: signed(fc('production')), tip: '도시 생산 합 · 다음 정산 산출'},
    ...(research ? [{key: 'science', label: '학문', value: num(research.science ?? 0), max: String(research.nextThreshold), delta: signed(fc('science')), tip: `연구 ${research.stage}단계 · 다음 문턱 ${research.nextThreshold}`}] : []),
    {key: 'fame', label: '인망', value: num(Math.max(0, v.faction.prestige ?? 0)), max: null, delta: signed(fc('prestige')), tip: '쓸 수 있는 인망'},
    {key: 'troops', label: '병력', value: Display.troopText(own.reduce((n, a) => n + a.troopCount, 0)), max: null, delta: '', tip: '부대 병력 합'},
    {key: 'reserve', label: '예비', value: Display.troopText(sum('reserveTroops')), max: null, delta: '', tip: '도시 예비병 합'},
  ];
  const ended = (id) => Combat.armyActionEnded(s, id), moved = (id) => (s.movedArmyIds ?? []).includes(id);
  const units = own.map((a) => ({
    id: a.armyId, officerId: a.commanderId, name: v.officers[a.commanderId]?.name ?? a.commanderId, art: officerArt(a.commanderId), head: artHead(officerArt(a.commanderId)),
    troop: TROOP_KEY[a.troopType] ?? 'dao', troopName: a.troopDisplayName ?? a.troopType, countText: Display.troopText(a.troopCount),
    status: `${moved(a.armyId) ? '이동함' : '이동 가능'} · ${ended(a.armyId) ? '행동 끝' : '주 행동 가능'}`, ended: ended(a.armyId),
  }));
  const sel = v.ownArmies[selectedArmyId ?? ''] ?? v.ownArmies[units.at(-1)?.id ?? ''] ?? null;
  const todo = Hud.factionFacilityTodo?.(v);
  const idle = cities.filter((c) => Hud.cityProductionIdle ? Hud.cityProductionIdle(c) : !c.currentProduction);   // 고를 생산 0개인 성은 '쉼'(웹과 한 규칙 — 이식 방 P0 10-26 · hud-ink cityProductionIdle 이 아직 없으면 예전 규칙)
  const remaining = units.filter((u) => !u.ended).length;
  const tasks = [
    ...(todo ? [{text: todo.text, target: todo.cityId ?? null}] : []),
    ...idle.filter((c) => c.cityId !== todo?.cityId).map((c) => ({text: `${c.name} 생산 정하기`, target: c.cityId})),
  ];
  return {
    screen: 'map-hud', protocol: 1, troopScale: Display.TROOP_DISPLAY_SCALE ?? 10,   // 병력 표시 배율(MapHud.set_army_troops 가 내부 단위를 글로) source: 'prototype/src/campaign-runtime.mjs view(플레이어 공개)', turn: v.turn, turnLimit: R.CAMPAIGN_TURN_LIMIT,
    ruler: {id: ruler?.officerId ?? null, name: ruler?.name ?? v.faction.name, art: officerArt(ruler?.officerId), head: artHead(officerArt(ruler?.officerId)), factionId: v.factionId, factionName: v.faction.name,
      date: `${dateText(v.turn)} · ${v.turn}차례 / ${R.CAMPAIGN_TURN_LIMIT}`},
    resources,
    menu: [{key: 'officers', label: '장수'}, {key: 'council', label: '평정', badge: idle.length > 0 || !!todo}, {key: 'diplomacy', label: '외교'}, {key: 'faction', label: '세력'}, {key: 'stratagem', label: '계략'}, {key: 'records', label: '기록'}],
    system: [{key: 'goal', label: '승리 조건'}, {key: 'save', label: '저장'}, {key: 'help', label: '규칙'}, {key: 'settings', label: '설정'}],
    tasks: {title: `이번 차례 · 할 일 ${tasks.length}`, items: tasks.slice(0, 3)},
    units: {title: `부대 ${units.length} · 남은 ${remaining}`, rows: units.map((u) => ({...u, selected: u.id === sel?.armyId}))},
    selected: sel ? selectedDock(s, v, sel) : null,
    sets: setTracker(s, v),   // 장수 세트 · 결의 세트 진행판(사용자 10-25 'TFT 처럼 장수 모으면 효과' — 웹 renderSetTracker)
    docks: own.map((a) => selectedDock(s, v, a)), // 목록에서 다른 부대를 고르면 화면이 바로 바꿔 그린다(같은 차례 안 값)
    end: {label: '다음 차례', remaining, ready: remaining === 0 && idle.length === 0},
    // 전법 준비(웹 world.js updateTacticReady): 내 차례일 때만 · 부대:전법 → waiting 0 이고 효과가 있음 — 고도 독이 '막 준비됨'을 붓 쓸기로 알림
    tacticReady: s.phase === 'PLAYER' ? Object.fromEntries(own.flatMap((a) => Effects.campaignTactics(s, a.armyId).map((c) => [`${a.armyId}:${c.traitId}`, c.waiting === 0 && !!c.effects?.length]))) : null,
    advisor: advisorModel(v, officerArt, artHead),
    crisis: crisisModel(s, v, officerArt, artHead),
    choice: choiceModel(s, v),
    dejaVu: dejaVuModel(s, v, officerArt, artHead),
    run: runModel(s, v, officerArt, artHead),
    ambition: ambitionModel(s, v, officerArt),
    council: councilModel(s, v, officerArt, artHead),
    achievementRecords: achievementRecordsModel(v),
    captives: captiveModel(s,v),
    occupations: occupationModel(s,v),
    visit: visitModel(s,v,officerArt,artHead),
    ritual: ritualModel(s,v,officerArt),
    minimap: minimap(v),
  };
}

/** 부대 명령 칸(웹 #unit-menu world.js:3516 · 단축키 world.js:4400 — M 이동 · A 공격 · F 정면 · B 방어 · G 복귀 · S 재정비 · H 대기):
 * 정면 = 아직 안 움직였을 때만 · 복귀 = 자기 성 중심일 때(옆에 적이면 막힘 · 아니면 칸 없음) · 방어 · 재정비 = 막히면 까닭. 내 부대 칸이라 공개 범위 안. */
function orders(s, a) {
  const id = a.armyId, main = Effects.canMainAction(s, id), gr = Roster.garrisonReason(s, id), rr = Morale.regroupReason(s, id);
  const used = '이번 턴 행동을 이미 썼습니다.';
  // 이동 = 갈 칸이 있을 때만 · 공격 = 주 행동 다 씀 / 궁병 붙잡힘('조건 미충족' — 웹 reasonText 가 ERROR_TEXT 에 없는 낱말에 쓰는 글) / 닿는 대상 없음이면 막힘
  const moveOk = (R.campaignMoveOptions?.(s, id) ?? []).length > 0;
  const atkWhy = !main ? used : Combat.archerAttackReason?.(s, id) ? '조건 미충족'
    : !((Combat.attackTargets?.(s, id) ?? []).length || (Combat.cityAttackTargets?.(s, id) ?? []).length) ? '지금 공격할 수 있는 대상이 없습니다' : '';
  return [
    ...(moveOk ? [{key: 'move', label: '이동', hotkey: 'M'}] : []),
    {key: 'attack', label: '공격', hotkey: 'A', primary: true, disabled: !!atkWhy, tip: atkWhy || '공격할 대상을 고릅니다'},
    ...((s.movedArmyIds ?? []).includes(id) ? [] : [{key: 'face', label: '정면', hotkey: 'F', tip: '이동 대신 바라보는 쪽만 바꿉니다. 옆·뒤를 맞으면 피해가 커집니다.'}]),
    {key: 'brace', label: '방어', hotkey: 'B', disabled: !main, tip: main ? '이번 차례 방어 태세' : used},
    ...(!gr ? [{key: 'garrison', label: '복귀', hotkey: 'G', tip: `부대가 해산되고 병력 ${Display.troopText(s.armies[id]?.troopCount ?? 0)}이 이 성의 예비병이 됩니다`}]
      : gr === 'ENEMY_ADJACENT' ? [{key: 'garrison', label: '복귀', hotkey: 'G', disabled: true, tip: '옆 칸에 적이 있어 성으로 들어갈 수 없습니다'}] : []),
    {key: 'regroup', label: '재정비', hotkey: 'S', disabled: !!rr, tip: rr || '흐트러진 전열·사기를 추스릅니다'},
    {key: 'wait', label: '대기', hotkey: 'H'},
  ];
}

/** 장수 세트 진행판(웹 world.js:2264 renderSetTracker — TFT 시너지 표): 세트 줄 = 배지(모인 수) · 이름 · 단계 눈금(2 › 3 › 5) · 툴팁(●출진 ○아직 · 단계 효과),
 *  결의 세트 = 결의로 이어진 부대장 무리. 둘 다 없으면 null(판 숨김). ● = 내 세력 · 내 부대장(공개 범위). */
function setTracker(s, v) {
  const name = (id) => s.officers?.[id]?.name ?? s.wanderers?.[id]?.name ?? OFFICER_LABELS[id] ?? '장수';
  const setOf = (id) => (BONDS.sets ?? []).find((x) => x.id === id);
  const steps = (id) => Object.keys(setOf(id)?.tiers ?? {}).map(Number).sort((a, b) => a - b);
  const fielded = (id) => s.officers[id]?.allegianceFactionId === s.playerFactionId && Object.values(s.armies ?? {}).some((a) => a.commanderId === id && a.factionId === s.playerFactionId);
  const rows = (v.setProgress ?? []).filter((x) => x.count > 0).sort((a, b) => b.tier - a.tier || b.count - a.count).map((x) => {
    const st = steps(x.id), set = setOf(x.id);
    return {id: x.id, name: x.name, count: x.count, total: x.total, tier: x.tier, level: x.tier >= (st.at(-1) ?? 99) ? 'max' : x.tier ? 'on' : 'off', steps: st,
      tip: `${x.name} ${x.count}/${x.total}\n${(set?.members ?? []).map((id) => `${fielded(id) ? '●' : '○'} ${name(id)}`).join('  ')}\n${st.map((n) => `${n <= x.tier ? '▶' : '·'} ${n}명: ${set?.tiers?.[n] ?? ''}`).join('\n')}`};
  });
  const fx = Rel.RELATIONS?.boundSet?.tiers ?? {};
  const groups = (v.social?.boundGroups ?? []).map((g) => ({count: g.members.length, name: g.members.map(name).join('·'), tier: g.stage, level: g.stage >= 4 ? 'max' : 'on', steps: Object.keys(fx).map(Number),
    tip: `${g.members.map(name).join('·')} — 결의로 이어진 부대장 ${g.members.length}명 출진\n${Object.entries(fx).map(([n, t]) => `${Number(n) <= g.stage ? '▶' : '·'} ${n}명: ${t}`).join('\n')}`}));
  return rows.length || groups.length ? {rows, groups} : null;
}

export function selectedDock(s, v, a) {
  const o = v.officers[a.commanderId], ratings = Combat.campaignUnitRatings(s, a.armyId) ?? {};
  const range = Combat.attackRange(s.armies[a.armyId], s);
  const tactics = Effects.campaignTactics(s, a.armyId);
  const card = (slot) => tactics.find((t) => t.slot === slot) ?? null;
  const data = {army: a, officer: o};
  const gauge = Number(a.signatureGauge ?? 0);
  const slot = (key, c, extra = {}) => {
    const short = gauge < (c?.gaugeCost ?? 0);
    return {key, traitId: c?.traitId ?? null, name: c ? Hud.abilityName356(c) : extra.name ?? '', icon: iconSource(Hud.dockIcon327(data, key, c ?? {})), cost: c?.gaugeCost ?? null,
      state: extra.state ?? (!c ? 'empty' : c.available === false || c.blockedReason || short ? 'disabled' : 'ready'),
      reason: extra.reason ?? c?.blockedReason ?? c?.reasonText ?? (short ? `게이지 ${gauge} / ${c.gaugeCost}` : null)};
  };
  const q = a.troopQ;
  return {
    id: a.armyId, officerId: a.commanderId, name: o?.name ?? a.commanderId, art: officerArt(a.commanderId), head: artHead(officerArt(a.commanderId)), troop: TROOP_KEY[a.troopType] ?? 'dao', troopName: a.troopDisplayName ?? a.troopType ?? "부대",
    countText: Display.troopText(a.troopCount), maxText: Display.troopText(Math.max(a.troopCount, a.maxTroopCount ?? a.troopCount)), countRatio: a.maxTroopCount ? a.troopCount / a.maxTroopCount : 1,
    ratings: [{key: 'attack', label: '공격', value: ratings.attack ?? null}, {key: 'defense', label: '방어', value: ratings.defense ?? null}, {key: 'mobility', label: '이동', value: ratings.mobility ?? null}, {key: 'range', label: '사거리', value: range}],
    engine: a.engine ? {name: a.engine.name, resourceName: a.engine.resourceName, resource: a.engine.resource, max: a.engine.max} : {},
    traits: dockTraits(s, v, a, data),
    bonds: [...(o?.teamUps ?? []).map((x) => ({kind: 'team', name: x.name, tip: x.effect})), ...(o?.sets ?? []).map((x) => ({kind: 'set', name: `${x.name} ${x.tier}단계`, tip: x.effect}))],   // 웹 bondChips
    klass: dockClass(v, a, o),
    gauge, gaugeMax: 100,
    qwer: [
      slot('Q', null, {name: q?.name ?? '병종 기술', state: q?.canUse ? 'ready' : 'disabled', reason: q?.canUse ? null : q?.reasonText ?? null}),
      slot('W', null, {name: a.engine?.name ?? '계통', state: (a.engine?.resource ?? 0) > 0 ? 'ready' : 'disabled', reason: a.engine ? `${a.engine.resourceName} ${a.engine.resource} / ${a.engine.max}` : null}),
      slot('E', card('E')), slot('R', card('R')),
    ],
    orders: orders(s, a),
  };
}

/**
 * 장착 특기(사용자 10-24 '장수 정보에 특기 · 오른쪽'): 고유특기 하나 + 일반특기 장착 3칸(보기만 — 바꾸기는 성 화면, 10-21 결정).
 * 고유 = view 성장 카드의 core, 장착 = 내 장수 성장 기록의 equippedTraitIds(내 부대만 — 공개 범위 안).
 */
function dockTraits(s, v, a, data) {
  const cards = v.officers[a.commanderId]?.growth?.cards ?? [];
  const core = cards.find((c) => c.core) ?? null;
  const rec = s.campaignGrowth?.officers?.[a.commanderId];
  const equipped = (rec?.equippedTraitIds ?? []).map((k) => rec.cards?.[k]).filter(Boolean).slice(0, 3);
  // 발동 표(웹 dockTraitSignals327 — 이번 차례 발동 기록 · 이번 차례 걸린 효과): 고도 독이 처음 보는 표면 칸을 한 번 번쩍임(차이 목록 '특기 발동 빛')
  const lc = s.lastCombat;
  const sig = {army: a, turn: v.turn, traitActivations: lc && (lc.turn ?? v.turn) === v.turn ? (lc.traitActivations ?? []) : []};
  const token = (c) => { try { return Hud.dockTraitSignals327(sig, c).at(-1) ?? null; } catch { return null; } };
  const card = (c, kind) => ({name: Hud.abilityName356(c), full: c.name, text: c.text ?? c.description ?? '', icon: iconSource(Hud.dockIcon327(data, kind, c)), token: token(c)});
  return {core: core ? card(core, 'passive') : null, equipped: equipped.map((c) => card(c, 'trait')), slots: 3};
}
/** 클래스(계통 엔진 · 2차 전직 · 병종 적성) — 수치 대신 말(사용자 10-24 '낮은/일정/높은'). */
const APT = {S: '아주 높음', A: '높음', B: '일정', C: '낮음', D: '낮음', E: '아주 낮음'};
function dockClass(v, a, o) {
  const e = a.engine, best = Math.max(0, ...(e?.merits ?? []).map((m) => m.count ?? 0)), goal = Math.max(1, ...(e?.merits ?? []).map((m) => m.goal ?? 3));
  const troop = a.troopType, grade = o?.aptitude?.[troop] ?? null;
  return {engine: e ? e.name.split(' · ')[0] : null, branch: e?.branchName ?? (e?.path ? e.path : '기본'), merit: e?.branchName ? '' : `실적 ${best}/${goal}`,
    merits: (e?.merits ?? []).map((m) => `${m.name} ${m.count}/${m.goal}`).join(' · '), aptitude: grade ? `적성 ${APT[grade] ?? '일정'}` : '', troopName: a.troopDisplayName ?? a.troopType ?? "부대"};
}

/**
 * 작은 지도: 세계 그림 한 장 + 공개 표지(성 · 보이는 부대)의 그림 안 비율 좌표(u, v ∈ 0~1).
 * 좌표식은 웹 map-v3.mjs 의 세계 그림 배치(hexCenter · size 30 · tilt .62 · land 2577×2220 · ring 624)와 같다.
 */
const SQRT3 = Math.sqrt(3), TILT = 0.62, SIZE = 30, LAND = [2577, 2220], RING = 624;
function minimap(v) {
  const m = MapModel.campaignMapModel(v, {});
  if (v.mapId === 'china') {
    // 중국 전역 판(C488): 그림 = 지도 방 splat 을 섞은 한 장(tools/minimap-china.py) · 공간 = 지도 방 space(칸 중심 (sqrt3*(q+r/2), 1.5r) · min -1 · 12 px/단위 · 1946×1698)
    // 작은 지도 상자(1.39:1)에 맞춰 위아래만 잘라 보임(북쪽 바깥 · 남쪽 바다 끝) — 칸 좌표는 그림 전체 기준 그대로
    const uvc = (id) => { const [q, r] = String(id).split(',').map(Number);
      return {u: +((SQRT3 * (q + r / 2) + 1) * 12 / 1946).toFixed(4), v: +((1.5 * r + 1) * 12 / 1698).toFixed(4)}; };
    return {image: 'res://ui/art/minimap-china.webp', land: {u0: 0, v0: 0.05, u1: 1, v1: 0.873}, map: 'china',
      tileToUv: {au: 12 / 1946, bu: 12 * SQRT3 / 1946, av: 12 / 1698, bv: 18 / 1698},   // u = au + bu*(q + r/2) · v = av + bv*r(소수 칸도 됨 — 카메라 모서리)
      cities: m.cities.map((x) => ({id: x.id, name: x.name, ...uvc(x.center), own: x.factionId === v.factionId, capital: x.id === v.faction.capitalCityId})),
      units: m.units.map((u) => ({id: u.id, ...uvc(u.tileId), own: !!v.ownArmies[u.id]}))};
  }
  const c = ({q, r}) => ({x: SIZE * SQRT3 * (q + r / 2), y: SIZE * 1.5 * r * TILT});
  const pts = m.tiles.map(c), xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), wkx = (Math.max(...xs) - minX + SIZE * 2) / LAND[0], wky = (Math.max(...ys) - minY + SIZE * 2) / LAND[1];
  const uv = (id) => { const [q, r] = String(id).split(',').map(Number), p = c({q, r});
    return {u: +((RING + (p.x - (minX - SIZE)) / wkx) / (LAND[0] + RING * 2)).toFixed(4), v: +((RING + (p.y - (minY - SIZE)) / wky) / (LAND[1] + RING * 2)).toFixed(4)}; };
  const landBox = {u0: RING / (LAND[0] + RING * 2), v0: RING / (LAND[1] + RING * 2), u1: (RING + LAND[0]) / (LAND[0] + RING * 2), v1: (RING + LAND[1]) / (LAND[1] + RING * 2)};
  const T = LAND[0] + RING * 2, V = LAND[1] + RING * 2;
  const tileToUv = {au: (RING + (SIZE - minX) / wkx) / T, bu: SIZE * SQRT3 / wkx / T, av: (RING + (SIZE - minY) / wky) / V, bv: SIZE * 1.5 * TILT / wky / V};   // u = au + bu*(q + r/2) · v = av + bv*r
  return {image: 'assets/ui-v3/map/v15-world.webp', land: landBox, tileToUv,
    cities: m.cities.map((x) => ({id: x.id, name: x.name, ...uv(x.center), own: x.factionId === v.factionId, capital: x.id === v.faction.capitalCityId})),
    units: m.units.map((u) => ({id: u.id, ...uv(u.tileId), own: !!v.ownArmies[u.id]}))};
}
