// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑥ 장수 정보(인물 상세) 모델.
// 설계: docs/work-integration/20261023/screen-mockups/07-officer/DESIGN.md(개발총괄 방 · 인물형).
// 값: 엔진 공개 view(state).officers[id](growth · engine · baseStats) + 웹 hud-ink 공개 함수. 규칙 계산 없음.
// 웹 장수 화면(world.js renderOfficerCard · arrangeKitOfficer · c295Arrange)과 같은 출처를 쓴다. world.js 안 지역 함수
// (cardDescription · troopName · officerRole · c295PublicLabel)는 내보내지 않아 같은 식을 옮겨 적었다 — 줄마다 출처 표시.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, Effects, Adapters, Special, Registry, C29, Combat, Troops] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/src/campaign-effects.mjs'),
  load('prototype/src/campaign-adapters.mjs'), load('prototype/src/campaign-special-troops.mjs'), load('prototype/src/campaign-rule-registry.mjs'),
  load('prototype/src/campaign-c29.mjs'), load('prototype/src/campaign-combat.mjs'), load('prototype/app/world/troops.mjs'),
]);
const readJson = (rel) => { try { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8')); } catch { return {}; } };
const PITCH = readJson('prototype/data/officer-pitch-v0.1.json').pitches ?? {};

// world.js:256~258 — 장수 · 규칙 이름표(규칙 기호를 사람 글로)
const OFFICER_LABELS = Object.fromEntries(Registry.UNIQUE_OFFICERS.map((o) => [o.id, o.name]));
const RULE_LABELS = Object.fromEntries(Registry.UNIQUE_OFFICERS.flatMap((o) => [o.uniqueTrait, o.signatureTactic].filter(Boolean)
  .flatMap((c) => (c.effects ?? []).filter((e) => e.rule).map((e) => [e.rule, Hud.abilityName356(c)]))));
export const playerText = (v) => Hud.worldDisplayText(Hud.readableText(v, OFFICER_LABELS, RULE_LABELS));
// world.js:1373 — 한글 이름표만(영문 기호가 보이지 않게)
export const publicLabel = (v, fallback) => (v && /[가-힣]/.test(v) && !/[a-z]/.test(v) ? v : fallback);

// world.js:251 troopName
export function troopName(state, type) {
  const map = {engineer: state?.mapId === 'v1' ? 'militia' : 'engineer', mystic: 'bow', BT01: 'militia', BT02: 'spear', BT03: 'bow', BT04: 'cavalry'};
  return Special.troopInfo(state, map[type] ?? type)?.troopDisplayName;
}
// world.js:282 cardDescription — 수치 글(c29 게이지 말로) · 웹의 앞 뜻풀이는 뺌(사용자 10-25)
export function cardDescription(state, c, id) {
  const r = state.campaignGrowth.officers[id], base = r.cards[c.traitId] ?? c;
  if (c.kind === 'awakening') return playerText(c.text || '이 특기의 수치가 한 단계 오른다');
  const extra = [];
  for (const e of base.effects ?? []) if (e.rule?.startsWith('U_')) for (const [key, value] of Object.entries(e.params ?? {}))
    if (Number.isFinite(value) && !['range', 'turns', 'uses', 'cost', 'at', 'threshold'].includes(key)) extra.push({op: 'DISPLAY_VALUE', value});
  const factor = C29.c29CoreFactor(state, id);
  // 사용자 10-25 '군의가 뭐고 원한이 뭐고 일일이 설명할 필요 없어': 뜻풀이(한자 · 풀이 · 이름 —)는 화면에서 빼고 효과 글만(데이터는 그대로)
  const d = playerText(Hud.cardNumericText({...c, effects: [...(c.effects ?? []), ...extra.map((e) => ({...e, value: e.value * factor}))]},
    {...base, effects: [...(base.effects ?? []), ...extra]}, Effects.strengthenedValue));
  return r.c29 ? d.replace(/재사용 대기(?:시간)? 초기화|대기 초기화/g, '게이지 +20').replace(/전법 하나의 재사용 대기 \+1/g, '전법 게이지 −10')
    .replace(/재사용 대기(?:시간)?\s*([+−-])\s*(\d+)/g, (_, sign, n) => `게이지 비용 ${sign}${Number(n) * 10}`).replace(/재사용 대기(?:시간)?/g, '게이지 비용') : d;
}
// world.js:1812 officerRole
export function officerRole(v, id) {
  const own = Object.values(v.ownArmies ?? {}).find((a) => a.commanderId === id);
  if (own) return {text: '부대장', link: true, armyId: own.armyId};   // 링크 = 지도에서 이 부대(신호 army_pressed)
  const gov = Object.values(v.ownCities ?? {}).find((c) => c.governorId === id);
  if (gov) return {text: `태수 · ${gov.name}`, link: false};
  const free = Object.values(v.ownCities ?? {}).find((c) => (c.freeOfficers ?? []).some((o) => (o?.officerId ?? o) === id));   // world.js:1815 — 자유 장수는 {officerId} 묶음
  return free ? {text: `대기 · ${free.name}`, link: false} : {text: '', link: false};
}
export function iconSource(html) {
  const m = /data-source="\/([^"]+)"/.exec(html) ?? /src="\/([^"]+)"/.exec(html);
  return m ? m[1] : null;
}
const STATS = [['leadership', '지휘', 'command'], ['might', '무용', 'might'], ['intelligence', '지략', 'intellect'], ['politics', '정무', 'politics'], ['charisma', '감화', 'charisma']];

/** 장수 한 명의 상세. officerId 가 없으면 플레이어 세력 첫 부대장. */
/** 웹 world.js:2286 bondSection: 이 장수가 든 팀업(성립 여부 · 짝 · 거리 · 효과)과 세트(모인 수 · 단계 · 단계별 효과). 없으면 null. */
const BONDS = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, 'docs/design-data/officer-pack/bonds-v0.1.json'), 'utf8')); } catch { return {sets: [], teamUps: []}; } })();
function bondSection(state, v, id) {
  const o = v.officers[id], name = (x) => state.officers?.[x]?.name ?? state.wanderers?.[x]?.name ?? OFFICER_LABELS[x] ?? '장수';
  const mine = (BONDS.teamUps ?? []).filter((b) => b.anchor === id || (b.partners ?? []).includes(id)), sets = (BONDS.sets ?? []).filter((x) => x.members.includes(id));
  if (!mine.length && !sets.length) return null;
  const active = new Set((o?.teamUps ?? []).map((x) => x.id)), tiers = Object.fromEntries((o?.sets ?? []).map((x) => [x.id, x.tier])), prog = Object.fromEntries((v.setProgress ?? []).map((x) => [x.id, x]));
  return {
    teams: mine.map((b) => ({name: b.name, with: [b.anchor, ...b.partners].filter((x) => x !== id).map(name).join('·') + (b.range ? ` · ${b.range}칸 안` : ''), on: active.has(b.id), text: b.text})),
    sets: sets.map((x) => { const p = prog[x.id], tier = tiers[x.id] ?? p?.tier ?? 0;
      return {name: x.name, count: p ? `${p.count}/${p.total}` : `0/${x.members.length}`, tier, tiers: Object.entries(x.tiers).map(([n, t]) => ({n: Number(n), text: t, hit: Number(n) <= tier}))}; }),
  };
}

export function officerModel(state, officerId = null) {
  const v = R.view(state);
  const army = (id) => Object.values(v.ownArmies ?? {}).find((a) => a.commanderId === id) ?? null;
  const id = officerId ?? Object.values(v.ownArmies ?? {})[0]?.commanderId ?? Object.keys(v.officers)[0];
  const o = v.officers[id], g = o.growth ?? {}, a = army(id);
  // 넘기기 = 같은 소속 장수(view 순서 — world.js:2284)
  const ids = Object.values(v.officers).filter((x) => x.allegianceFactionId === o.allegianceFactionId).map((x) => x.officerId);
  const index = ids.indexOf(id);
  const cards = g.cards ?? [];
  const core = cards.find((c) => c.core && c.kind === 'trait') ?? null;
  const eCard = cards.find((c) => (g.equippedTacticIds ?? []).includes(c.traitId)) ?? null;
  const rCard = cards.find((c) => c.traitId === g.signature?.traitId) ?? cards.find((c) => c.signature || c.classTag === '고유') ?? null;
  const q = Combat.TROOP_Q_RULES?.[Adapters.troopToCampaign(o.troopType)] ?? null;
  const pseudo = {officer: o, army: {troopType: o.troopType, engine: o.engine}};   // world.js:2386 — 아이콘은 가짜 부대로 고름
  const icon = (key, c) => iconSource(Hud.dockIcon327(pseudo, key, c ?? {}));
  const desc = (c) => (c ? cardDescription(state, c, id) : '');
  // 화면 글 = ' — ' 뒤 효과 글(앞의 '한자 · 뜻 · 이름'은 칸 이름과 겹침 — 설계 '같은 이름 1곳'), 전문은 풀이에
  const effect = (t) => t;   // 뜻풀이는 cardDescription 에서 이미 뺌 — 효과 글 안의 ' — '는 그대로 둠
  const qName = a?.troopQ?.name || q?.name || '병종 기술';
  const slots = [
    {key: 'Q', name: qName, icon: icon('Q', null), head: `병종 기술 · 재사용 대기 ${q?.cooldown ?? 2}차례${q?.range ? ` · 사거리 ${q.range}` : ''}`, text: '지도에서 부대를 골라 사용', cost: null},
    {key: 'W', name: publicLabel(a?.engineActions?.[0]?.name || o.engine?.name, '계통 기술'), icon: icon('W', null), head: `계통 기술 · ${publicLabel(o.engine?.name, '계통 없음')}`, text: playerText(o.engine?.judgment ?? ''), cost: null},
    {key: 'E', name: eCard ? Hud.abilityName356(eCard) : '빈 장착 칸', icon: icon('E', eCard), head: eCard ? `${eCard.classTag === '고유' || eCard.signature ? '고유' : '공용'} 전법 · 비용 ${eCard.gaugeCost ?? '-'}` : '전법 없음', text: effect(desc(eCard)), full: desc(eCard), cost: eCard?.gaugeCost ?? null},
    {key: 'R', name: rCard ? Hud.abilityName356(rCard) : '고유 전법', icon: icon('R', rCard), head: rCard ? `고유 전법 · 비용 ${rCard.gaugeCost ?? '-'}` : '', text: effect(desc(rCard)), full: desc(rCard), cost: rCard?.gaugeCost ?? null},
  ];
  const owned = g.ownedTraits ?? [];
  const reason = g.traitLoadoutReason ?? null;
  const equipped = (g.equippedTraitIds ?? []).map((k) => cards.find((c) => c.traitId === k) ?? owned.find((c) => c.traitId === k)).filter(Boolean)
    .map((c) => ({name: Hud.abilityName356(c), icon: icon('trait', c)}));
  const role = officerRole(v, id);
  const faction = Troops.FACTION?.[o.allegianceFactionId]?.name ?? '무소속';
  const art = officerArt(id);
  return {
    screen: 'officer', id, name: o.name,
    nav: {index: index + 1, total: ids.length, label: `소속 장수 ${index + 1} / ${ids.length}`, prev: index > 0, next: index < ids.length - 1, prevId: ids[index - 1] ?? null, nextId: ids[index + 1] ?? null},
    identity: {troop: publicLabel(troopName(state, o.troopType), '병종 정보 없음'), engine: publicLabel(o.engine?.name?.split(' · ')[0], '계통 없음'), faction, factionId: o.allegianceFactionId, role},
    level: {text: `Lv ${g.level ?? 1} · 경험치 ${g.nextXp ? `${g.xp ?? 0} / ${g.nextXp}` : 'MAX'}`, ratio: g.nextXp ? (g.xp ?? 0) / g.nextXp : 1},
    pitch: PITCH[id] ?? '',
    tabs: [{key: 'ability', label: '능력 · 특기 · 전법', selected: true}, {key: 'relation', label: '관계 · 인연'}, {key: 'history', label: '지난 일'}],
    bonds: bondSection(state, v, id),   // '관계 · 인연' 쪽(사용자 10-25 'TFT 처럼 장수 모으면 효과' — 웹 world.js:2286 bondSection)
    stats: STATS.map(([k, label, icon]) => ({key: k, label, icon, value: o.baseStats?.[k] ?? null})),
    core: core ? {name: Hud.abilityName356(core), text: effect(desc(core)), full: desc(core), icon: null} : null,
    slots, selectedSlot: 'R',
    gauge: {value: Math.min(100, Math.round(g.signature?.gauge ?? a?.signatureGauge ?? 0)), max: g.signature?.max ?? 100, ticks: [eCard?.gaugeCost].filter((x) => Number.isFinite(x) && x < 100)},
    traits: {equipped, slots: g.traitSlots ?? 3, owned: owned.length, locked: !!reason, reason: reason ? (/성 안/.test(reason) ? '성 안에서만 바꿀 수 있음' : String(reason).replace(/[.]$/, '')) : null},
    art, head: artHead(art), backdrop: 'res://ui/art/officer-bg.webp',   // 공통 저물녘 산자락(Codex image_gen v2 · 원본 docs/work-integration/20261024/godot-ui/art/officer-bg/v2.png 1672×941 → 1920×1080)
  };
}
