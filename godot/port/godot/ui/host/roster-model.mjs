// @ts-check
// 고도 UI/UX 방 (Claude) — 화면 ⑨ 소속 장수(명부) 모델. **10-25 웹 그대로 옮김**(사용자 "소속 장수는 웹으로 나머지는 냅둬").
// 원본 = 웹 world.js rosterInk(kit 갈래 · #roster.c374-v4): 왼쪽 목록(걸러보기 넷 · 이름 찾기 · 정렬 · 열 머리 · 줄 83px) · 가운데 큰 그림 · 오른쪽 상세 판.
// 값: 엔진 공개 view(officers · social) + 엔진 socialReason(찾아간다) + 웹 hud-ink abilityName356 + 웹 c207-info 용어(밑줄 점선 — decorateTerms 와 같은 낱말).
// 웹 지역 함수(c295PublicLabel · c295TroopName · c295SearchText · c295RosterOrder · RI_FILTERS)를 그대로 옮겨 적었다. 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {existsSync, readFileSync, writeFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';
import {troopName, officerRole} from './officer-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, Rel, Info] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'),
  load('prototype/src/campaign-relations.mjs'), load('prototype/app/world/c207-info.mjs')]);
// world.js RI_STATS · 상세 판 아이콘(hud-kit.css 3080~3086 — 지휘만 ui-v3 그림 · 130% · 불투명)
const STATS = [['leadership', '지휘', 'assets/ui-v3/hud/icons/mode-faction.png', 1.3, 1], ['might', '무용', 'assets/ui-kit/own/sym/actions/attack.webp', 1, 0.86],
  ['intelligence', '지략', 'assets/ui-kit/own/sym/resources/learning.webp', 1, 0.86], ['politics', '정무', 'assets/ui-kit/own/sym/global/city.webp', 1, 0.86],
  ['charisma', '감화', 'assets/ui-kit/own/sym/global/officers.webp', 1, 0.86]];
// world.js RI_FILTERS(kit 은 앞 넷만 보임) — 분류는 역할 원문(role) 그대로
const FILTERS = [['all', '전체', () => true], ['army', '부대장', (r) => r === '부대장'], ['gov', '태수', (r) => r.startsWith('태수')], ['idle', '대기', (r) => r.startsWith('대기')]];
const PAGE = 10;   // world.js rosterPageSize
const CACHE = resolve(ROOT, 'port/godot/ui/data/roster-state-840001.json');

// world.js:1448~1453
const publicLabel = (value, fallback) => { const l = String(value ?? '').trim(); return /[가-힣]/.test(l) && !/[a-z]/.test(l) ? l : fallback; };
const searchText = (o) => [o.name, ...(o.growth?.titles ?? []).map((t) => t.name)].join(' ');
function rosterOrder(a, b, key) {
  const axis = key.replace('-asc', ''), sign = key.endsWith('-asc') ? 1 : -1;
  return (axis === 'name' ? 0 : sign * ((a.baseStats?.[axis] ?? 0) - (b.baseStats?.[axis] ?? 0))) || a.name.localeCompare(b.name, 'ko') || a.officerId.localeCompare(b.officerId);
}
const SORTS = [['name', '이름순'], ...STATS.flatMap(([k, l]) => [[k, `${l} ↓`], [`${k}-asc`, `${l} ↑`]])];

// 웹 c207-info decorateTerms: 용어 낱말(긴 것 먼저)에 점선 밑줄 — 화면 글 전체가 대상. 고도는 [시작, 길이] 목록으로 받는다.
const TERM_WORDS = [...Info.GLOSSARY.entries, ...Info.STRATAGEM_GLOSSARY].flatMap((e) => [e.term, ...(e.aliases ?? [])]).sort((a, b) => b.length - a.length);
const TERM_RE = new RegExp(TERM_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const terms = (text) => [...String(text).matchAll(TERM_RE)].map((m) => [m.index, m[0].length]);

/** 웹 실측과 같은 판(web-port-fixture 'map': seed 489 · 시작 성 고정 · 바깥 부대 있음) — 조조 세력 6명 · 고른 장수 = 이름순 첫째(순욱). */
export function webRosterScene() {
  const state = R.createCampaign({factionId: 'F01', seed: 489, startCities: 'fixed', fieldArmies: true, council: false, c31: false, manualEndTurn: true});
  if (state.ambitions) state.ambitions.closed = true;
  if (state.runModifiers?.blessing) state.runModifiers.blessing.closed = true;
  state.prologue = null;
  return {state, pickId: null};
}

/** (예전 견본) 격리 AI 대 AI 판 F01 · seed 840001 을 조조 세력 11명이 될 때까지 — 쪽 넘김 · 긴 목록 확인용. data/roster-state-840001.json 에 둔다. */
export function rosterScene() {
  if (existsSync(CACHE)) return {state: R.deserialize(readFileSync(CACHE, 'utf8')), pickId: 'G04'};
  let s = R.createCampaign({factionId: 'F01', seed: 840001});
  for (let t = 0; t < 40 && !s.gameResult; t++) {
    if (Object.values(s.officers).filter((o) => o.allegianceFactionId === 'F01').length >= 11) break;
    s = R.step(s, {type: 'END_TURN', autoPlayer: true});
  }
  writeFileSync(CACHE, R.serialize(s));
  return {state: s, pickId: 'G04'};
}

/**
 * @param {any} state
 * @param {string|null|{pick?:string|null, filter?:string, sort?:string, query?:string, page?:number, pin?:string|null, locked?:boolean}} opts
 *   pick = 고른 장수(없으면 목록 첫째) · filter = all|army|gov|idle · sort = name|<능력>|<능력>-asc · query = 이름 찾기 · page = 0부터 · pin = 비교에 고정한 장수 · locked = 입력 잠김(찾아갈 수 없음)
 */
export function rosterModel(state, opts = {}) {
  const o = typeof opts === 'string' || opts == null ? {pick: opts} : opts;
  const filter = FILTERS.some((f) => f[0] === o.filter) ? o.filter : 'all';
  const sort = SORTS.some((s) => s[0] === o.sort) ? o.sort : 'name';
  const query = String(o.query ?? '');
  const v = R.view(state);
  const ruler = state.factions?.[state.playerFactionId]?.rulerId;
  const role = (x) => officerRole(v, x.officerId).text || '대기';
  // 화면 글(군주는 '군주 · 성') — 분류(걸러보기)는 role 그대로
  const roleText = (x) => { const r = publicLabel(role(x), '역할 정보 없음'); return x.officerId === ruler ? `군주${(r.match(/ · .+$/) ?? [''])[0]}` : r; };
  const all = Object.values(v.officers).filter((x) => x.allegianceFactionId === v.factionId).sort((a, b) => rosterOrder(a, b, sort));
  const fil = FILTERS.find((f) => f[0] === filter);
  const list = all.filter((x) => fil[2](role(x)) && searchText(x).includes(query.trim()));
  const pick = list.find((x) => x.officerId === o.pick) ?? list[0] ?? null;
  const showPotential = list.some((x) => x.growth?.potential != null && String(x.growth.potential).trim() !== '');
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.max(0, Math.min(Number(o.page ?? 0) || 0, pages - 1));
  const pageRows = list.slice(page * PAGE, (page + 1) * PAGE);
  const pinned = all.find((x) => x.officerId === o.pin) ?? null;
  const summary = (x) => {
    const g = x.growth ?? {}, cards = g.cards ?? [];
    const traits = cards.filter((c) => c.kind === 'trait').map((c) => Hud.abilityName356(c)).join(' · ') || '익힌 특기 없음';
    const tactics = cards.filter((c) => (g.equippedTacticIds ?? []).includes(c.traitId)).map((c) => Hud.abilityName356(c)).join(' · ') || '장착 전법 없음';
    const line = `${publicLabel(troopName(state, x.troopType), '병종 정보 없음')} · ${publicLabel(x.engine?.name, '계통 없음')}`;
    const art = officerArt(x.officerId);
    return {
      id: x.officerId, name: x.name, art, head: artHead(art), role: roleText(x), line, traits, tactics,
      stats: STATS.map(([k, label, icon, iconScale, iconAlpha]) => ({key: k, label, value: x.baseStats?.[k] ?? null, pct: Math.max(0, Math.min(100, Number(x.baseStats?.[k]) || 0)), icon, iconScale, iconAlpha})),
      terms: {role: terms(roleText(x)), line: terms(line), traits: terms(traits), tactics: terms(tactics)},
    };
  };
  let detail = null;
  if (pick) {
    const g = pick.growth ?? {};
    const lord = pick.officerId === v.social?.lordId;
    const why = lord ? '' : o.locked ? '지금은 찾아갈 수 없습니다' : (Rel.socialReason(state, {type: 'VISIT', officerId: pick.officerId, choice: 0}) || '');
    const social = v.social?.officers?.[pick.officerId];
    const bonds = (social?.relations ?? []).slice(0, 5).map((r) => `${r.name} · ${publicLabel(r.displayName, '관계 정보 없음')}`).join(' / ') || '알려진 관계가 없습니다.';
    const level = `Lv ${g.level ?? 1} · 경험치 ${g.xp ?? 0} / ${g.nextXp ?? 'MAX'}`;
    detail = {...summary(pick), level, bonds, visit: lord ? null : {ok: !why, reason: why || '찾아가 이야기한다'}};
    detail.terms.level = terms(level); detail.terms.bonds = terms(bonds);
  }
  // 비교(웹 c295-compare): 고정한 장수와 고른 장수 나란히 + 능력 차(고른 − 고정)
  const compare = pinned && pick ? {
    sides: [summary(pinned), summary(pick)],
    diff: STATS.map(([k, l]) => { const a = pick.baseStats?.[k], b = pinned.baseStats?.[k]; return `${l} ${Number.isFinite(a) && Number.isFinite(b) ? `${a - b >= 0 ? '+' : ''}${a - b}` : '?'}`; }).join(' · '),
  } : null;
  return {
    screen: 'roster', title: '소속 장수', backdrop: 'assets/ui-v3/scenes/plate-draft.webp',
    filters: FILTERS.map(([key, label]) => ({key, label, selected: key === filter})),
    sort: {key: sort, label: SORTS.find((s) => s[0] === sort)[1], options: SORTS.map(([key, label]) => ({key, label}))},
    // 웹: 전체 + 빈 찾기면 'n / m명' · '초기화' 숨김
    search: {query, placeholder: '이름·칭호 찾기', count: `${list.length} / ${all.length}명`, showCount: !(filter === 'all' && query === '')},
    columns: STATS.map(([, l]) => l), showPotential,
    rows: pageRows.map((x) => {
      const art = officerArt(x.officerId), pot = x.growth?.potential;
      return {id: x.officerId, name: x.name, role: roleText(x), art, head: artHead(art), selected: x === pick,
        stats: STATS.map(([k]) => ({value: x.baseStats?.[k] ?? null, high: (x.baseStats?.[k] ?? 0) >= 80})),
        potential: pot != null && String(pot).trim() !== '' ? String(pot) : '—', terms: {name: terms(x.name), role: terms(roleText(x))}};
    }),
    page: list.length > PAGE ? {index: page, label: `${page + 1} / ${pages}`, prev: page > 0, next: (page + 1) * PAGE < list.length} : null,
    empty: pick ? null : '맞는 장수가 없습니다. 필터를 지워 다시 찾아보세요.',
    pick: detail, pin: pinned ? pinned.officerId : null, compare,
  };
}
