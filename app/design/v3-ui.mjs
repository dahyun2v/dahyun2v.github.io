// UI v3 지도 화면 둘레(2026-10-08, Claude) — 모드 막대·세계 다이얼·보고 띠·군사 한마디·그림 목록.
// 기준: docs/work-integration/20261008/ui-v3/UI-V3-DESIGN.md. campaign.js 가 테마 v3 일 때 부른다.
// DOM 이 반쯤만 있는 시험 환경에서도 깨지지 않게, 있는 것만 만진다.

export const V3_MODES = [
  {id: 'world', glyph: '世', name: '지형', tip: '기본 지도'},
  {id: 'supply', glyph: '補', name: '보급', tip: '부대 → 보급 근원 선 · 끊김은 점선'},
  {id: 'faction', glyph: '勢', name: '세력', tip: '영역과 국경을 진하게'},
  {id: 'diplomacy', glyph: '外', name: '외교', tip: '다른 세력과의 관계(전쟁·휴전·동맹)'},
  {id: 'trace', glyph: '跡', name: '탐험', tip: '탐험지·옛 흔적만 떠오름'},
];

let manifest = null, mode = 'world';

/** 그림 목록(prototype/assets/ui-v3/manifest.json). 없으면 null — 그림 없이도 화면은 돌아간다. */
export async function loadV3Manifest() {
  try { const r = await fetch('/assets/ui-v3/manifest.json'); manifest = r.ok === false ? null : await r.json(); } catch { manifest = null; }
  return manifest;
}
const listed = () => { const m = manifest; const list = Array.isArray(m) ? m : m?.files ?? m?.assets ?? []; return list.map((f) => String(typeof f === 'string' ? f : f?.path ?? '').replace(/\\/g, '/')); };
/** assets/ui-v3/ 아래 상대 경로 → 목록에 있으면 URL, 없으면 null. */
export function v3Asset(rel) {
  // 흑묵판 우선(2026-10-10): 'events/E01.webp' → 'events-ink/E01.webp' 가 목록에 있으면 그것. ?map=paint 면 옛 그림.
  const i = rel.indexOf('/');
  if (i > 0 && inkMapTrial()) { const alt = `${rel.slice(0, i)}-ink${rel.slice(i)}`; if (listed().some((p) => p.endsWith(`ui-v3/${alt}`))) return `/assets/ui-v3/${alt}`; }
  return listed().some((p) => p.endsWith(`ui-v3/${rel}`)) ? `/assets/ui-v3/${rel}` : null;
}

/** 목록에 적힌 그림 크기 [가로, 세로] — 없으면 null. url 은 v3Asset 이 돌려준 주소 */
export function v3Size(url) {
  const m = manifest, list = Array.isArray(m) ? m : m?.files ?? m?.assets ?? [], tail = String(url ?? '').replace(/^\/assets\//, 'assets/');
  const e = tail ? list.find((f) => typeof f === 'object' && String(f?.path ?? '').replace(/\\/g, '/').endsWith(tail)) : null;
  return Array.isArray(e?.size) ? e.size : null;
}

// 흑묵 지도가 기본(2026-10-10, 사용자 "기준 그림들과 같은 비주얼이 실제 게임 화면에서"). ?map=paint 로 이전 회화 지도.
export const inkMapTrial = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('map') !== 'paint'; } catch { return true; } };
// C337: one default setting; ?map=v15 retains the untouched previous painting.
export const MAP_WORLD_DEFAULT = 'v16';
const paintedWorldVersion = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('map') || MAP_WORLD_DEFAULT; } catch { return MAP_WORLD_DEFAULT; } };
const paintedWorldSource = () => !manifest ? null : paintedWorldVersion() === 'v16' ? '/assets/ui-v3/map/v16/world.webp' : paintedWorldVersion() === 'v15' ? v3Asset('map/v15-world.webp') : null;

// 성 미니어처: castle7_t62 와 같은 캔버스·같은 7칸 자리(C80 지시). 다르면 여기 fit 만 고친다.
const CITY_FILE = {west: 'ye', east: 'ji', south: 'nanpi', yijing: 'yijing', zhongshan: 'zhongshan', xindu: 'xindu', julu: 'julu', pingyuan: 'pingyuan'};
const CITY_FIT = {image: [1216, 832], flowerBox: [57, 171, 1102]};
const SITE_FILE = {'성소': 'shrine', '은거지': 'hermitage', '옛 진지': 'old-camp', '군마 산지': 'horse-ranch'};
// 2026-10-14: 바탕 그림(v12 · v13, 3825×3468)에 그려 넣은 성의 '앞 성벽 아래끝 가운데'(px) — 성 이름표를 여기에 붙인다.
// 그려진 성은 엔진 칸 가운데보다 20~45px 오른쪽 · 10~90px 아래에 있다(눈금 그림으로 잼: docs/work-integration/20261014/city-label/)
const BAKED_CITY_LABEL_AT = {west: [1052, 2725], east: [2286, 947], south: [2397, 1897], yijing: [1971, 1375], zhongshan: [1405, 1586], xindu: [1603, 2080], julu: [1207, 2333], pingyuan: [2273, 2246]};
const pick = (map, dir) => Object.fromEntries(Object.entries(map).map(([k, f]) => [k, v3Asset(`${dir}/${f}.png`)]).filter(([, v]) => v));
export function v3MapOptions() {
  const cityArt = {};
  for (const [id, f] of Object.entries(CITY_FILE)) { const src = v3Asset(`cities/${f}.png`); if (src) cityArt[id] = {src, fit: CITY_FIT}; }
  const troops = ['militia', 'spear', 'bow', 'cavalry'], kinds = ['farm', 'granary', 'market', 'barracks', 'workshop', 'tuntian', 'clinic', 'mufu'];
  return {
    // 흑묵 그래픽 노블 지도(10-10, 바이블 v2)가 기본, ?map=paint 면 회화 지도.
    mapArt: (inkMapTrial() ? v3Asset('map/v10-ink.webp') ?? v3Asset('map/v9-ink.webp') ?? v3Asset('map/v8-ink.webp') ?? v3Asset('map/v7-ink.webp') ?? v3Asset('map/v6-ink.webp') ?? v3Asset('map/v5-ink.webp') ?? v3Asset('map/v4-ink-trial.webp') : null) ?? v3Asset('map/v3-base-v2.webp') ?? v3Asset('map/v3-base-v2.png') ?? v3Asset('map/v3-base.webp') ?? v3Asset('map/v3-base.png'),
    // 세계 그림: 땅(2577×2220) 둘레에 놀이판 밖 지형을 624px 이어 그린 한 장(tools/design/map-ring.py). 있으면 지도가 이것으로 그려지고 땅 밖 구름 바다 대신 지형이 이어진다. ?map=paint 는 옛 그림 그대로
    // v12(2026-10-13): 성 여덟 곳을 지도 그림 안에 그려 넣은 바탕(사용자 "성이든 뭐든 지도 위에 올라가는 건 이 방법으로" — tools/design/bake-inputs.py · paste-edit.py). baked 에 적힌 성은 따로 얹는 그림을 그리지 않는다. 없으면 v11 + 얹는 성 그림
    // v13(2026-10-14): v12 + 탐험지 네 곳(성소 · 은거지 · 옛 진지 · 군마 산지)도 그려 넣음 — baked 에 탐험지 이름도 적는다(얹는 미니어처를 그리지 않는다)
    // v14(2026-10-14 반박 리뷰 3차 M6 '확대하면 펜선이 번짐'): v13 을 1.6배 해상도로(Lanczos + 선명, 내용 그대로 — tools/design/map-upres.py). 그림 비율이 같아 land · ring · cityLabelAt 그대로
    // v15(2026-10-19 사용자 "지도는 너 말대로 바꿔 봐"): 같은 땅을 덜 빽빽하게 다시 그림(평지 = 비운 한지, 숲 = 먹 덩어리, 잔 무늬 레퍼런스 수준) — ?map=v15 시험.
    // 성 여덟 곳은 같은 자리(cityLabelAt 그대로 맞음 — docs/work-integration/20261019/design-system/map-calm/), 탐험지 넷은 그림에 없어 따로 얹는다(baked 에 넣지 않음)
    // v16: C330/C337 3x4 painted tiles assembled without changing the projection or baked city labels.
    mapWorld: !inkMapTrial() ? null : paintedWorldSource() ? {src: paintedWorldSource(), ring: 624, land: [2577, 2220], baked: Object.keys(CITY_FILE), cityLabelAt: BAKED_CITY_LABEL_AT}
      : (v3Asset('map/v14-world.webp') ?? v3Asset('map/v13-world.webp')) ? {src: v3Asset('map/v14-world.webp') ?? v3Asset('map/v13-world.webp'), ring: 624, land: [2577, 2220], baked: [...Object.keys(CITY_FILE), ...Object.keys(SITE_FILE)], cityLabelAt: BAKED_CITY_LABEL_AT}
      : v3Asset('map/v12-world.webp') ? {src: v3Asset('map/v12-world.webp'), ring: 624, land: [2577, 2220], baked: Object.keys(CITY_FILE), cityLabelAt: BAKED_CITY_LABEL_AT}
      : v3Asset('map/v11-world.webp') ? {src: v3Asset('map/v11-world.webp'), ring: 624, land: [2577, 2220]} : null,
    cityArt, mode,
    unitArt: pick(Object.fromEntries(troops.map((t) => [t, t])), 'units'),
    // 병사 무리(2026-10-11, 시안 final-map-v2): 병종 × 세력 색 네 벌(tools/design/squad-sprites.py). 있으면 작은 unitArt 대신 이것을 땅 위에 그린다
    squadArt: Object.fromEntries(troops.map((t) => [t, Object.fromEntries(['red', 'green', 'blue', 'grey'].map((tone) => { const src = v3Asset(`units/squad-${t}-${tone}.webp`); return [tone, src ? {src, size: v3Size(src) ?? [520, 340]} : null]; }).filter(([, v]) => v))]).filter(([, v]) => Object.keys(v).length)),
    facilityArt: {...pick(Object.fromEntries(kinds.map((k) => [k, k])), 'facilities'), ...(v3Asset('facilities/mufu.png') ? {naval: v3Asset('facilities/mufu.png')} : {})},
    siteArt: pick(SITE_FILE, 'sites'), unknownSiteArt: v3Asset('sites/unknown.png'),
    // 지도 위 표지 그림(닷토리 B8, 기준 final-map-v2): 성 깃발·이름 판 · 부대 방패 틀·병력 판 · 포위 불길
    kit: v3Asset('hud/map-city-plate.png') ? {cityPlate: v3Asset('hud/map-city-plate.png'), unitCount: v3Asset('hud/map-unit-count.png'), siegeFire: v3Asset('hud/map-siege-fire.png'), fleet: v3Asset('hud/map-fleet.png'),
      cityFlag: pick({red: 'map-city-flag-red', green: 'map-city-flag-green', blue: 'map-city-flag-blue', grey: 'map-city-flag-grey'}, 'hud'),
      unitFrame: pick({red: 'map-unit-frame-red', green: 'map-unit-frame-green', blue: 'map-unit-frame-blue'}, 'hud')} : null,
  };
}
export const v3Mode = () => mode;
export function setV3Mode(m) { mode = V3_MODES.some((x) => x.id === m) ? m : 'world'; return mode; }

/** 지도 모델에 모드별 층을 더한다(보급선·관계). */
export function v3ModeHighlights(v, model, state) {
  if (mode === 'supply') {
    const cities={...v.knowledge.cities,...v.ownCities},hubs=v.hubs??[];
    model.highlights.supply = Object.values(v.ownArmies??{}).flatMap(a=>{
      const source=cities[a.supply?.sourceCityId]??hubs.find(h=>h.hubId===a.supply?.sourceHubId);
      return source?[{from:a.tileId,to:source.tileId,state:a.supply.state}]:[];
    });
    model.highlights.supplyWarnings=Object.values(v.ownArmies??{}).filter(a=>['CUT','STARVING'].includes(a.supply?.state)).map(a=>({tileId:a.tileId,state:a.supply.state}));
  }
  return model;
}
export function v3Relations(v) {
  if (mode !== 'diplomacy') return undefined;
  return Object.fromEntries((v.diplomacy?.factions ?? []).map((f) => [f.factionId, f.state]));
}

// ── 세계 다이얼: 그림이 오면 그림, 그 전엔 코드로 그린 혼천·TLV 다이얼 ──────────────
const SEASON = ['봄', '여름', '가을', '겨울'];
function dialSvg() {
  const ticks = Array.from({length: 36}, (_, i) => { const a = (i * 10 - 90) * Math.PI / 180, r1 = i % 9 === 0 ? 40 : 43, r2 = 47; return `<line${i % 9 === 0 ? ' class="major"' : ''} x1="${50 + r1 * Math.cos(a)}" y1="${50 + r1 * Math.sin(a)}" x2="${50 + r2 * Math.cos(a)}" y2="${50 + r2 * Math.sin(a)}"/>`; }).join('');
  const arcs = [0, 1, 2, 3].map((q) => { const a0 = (q * 90 - 90 + 3) * Math.PI / 180, a1 = (q * 90 + 87 - 90) * Math.PI / 180, r = 35; return `<path class="season s${q}" d="M${50 + r * Math.cos(a0)} ${50 + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${50 + r * Math.cos(a1)} ${50 + r * Math.sin(a1)}"/>`; }).join('');
  // TLV: 가운데 사각(대지) + 네 'T' 문 + 둥근 꼭지
  const tees = [[50, 22, 50, 28], [78, 50, 72, 50], [50, 78, 50, 72], [22, 50, 28, 50]].map(([x1, y1, x2, y2]) => `<line class="tee" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('');
  return `<svg class="dial-svg" viewBox="0 0 100 100" aria-hidden="true"><circle class="rim" cx="50" cy="50" r="48"/><circle class="rim2" cx="50" cy="50" r="38.5"/><g class="ticks">${ticks}</g>${arcs}<rect class="earth" x="36" y="36" width="28" height="28"/>${tees}<circle class="boss" cx="50" cy="50" r="5"/><line class="hand" x1="50" y1="50" x2="50" y2="9"/></svg>`;
}
export function renderWorldDial(turn) {
  const dial = document.querySelector?.('#world-dial .dial'); if (!dial) return;
  const plate = v3Asset('ui/world-dial.png'), hand = v3Asset('ui/world-dial-hand.png');
  const want = plate ? 'art' : 'svg';
  if (dial.dataset?.kind !== want) {
    dial.innerHTML = plate ? `<img class="plate" src="${plate}" alt="">${hand ? `<img class="hand" src="${hand}" alt="">` : ''}` : dialSvg();
    if (dial.dataset) dial.dataset.kind = want;
  }
  const n = Math.max(0, (turn ?? 1) - 1), idx = n % 36, season = Math.floor(idx / 9);
  dial.style?.setProperty?.('--turn-angle', `${idx * 10}deg`);
  if (dial.dataset) dial.dataset.season = String(season);
  if (document.documentElement?.dataset) document.documentElement.dataset.season = String(season); // 지도 그림 계절 색(world.css)
  for (const arc of dial.querySelectorAll?.('.season') ?? []) arc.classList?.toggle?.('on', arc.classList.contains(`s${season}`));
  const label = document.querySelector?.('#world-dial .season'); if (label) label.textContent = SEASON[season];
}

// ── 군사 한마디: 지략이 가장 높은 우리 장수(군주 제외, 없으면 군주)가 지금 할 일을 말한다 ──
export function pickAdvisor(v) {
  const mine = Object.values(v.officers ?? {}).filter((o) => o.allegianceFactionId === v.factionId && o.lifeState !== 'DEAD' && o.captivityState !== 'PRISONER');
  const ruler = v.faction?.rulerOfficerId ?? v.faction?.rulerId;
  const pool = mine.filter((o) => o.officerId !== ruler);
  return (pool.length ? pool : mine).sort((a, b) => (b.baseStats?.intelligence ?? 0) - (a.baseStats?.intelligence ?? 0))[0] ?? null;
}
export function renderAdvisor(v, portraits = {}) {
  const box = document.querySelector?.('#w-advisor') ?? document.querySelector?.('#advisor'); if (!box) return;
  const o = pickAdvisor(v), face = box.querySelector?.('.face'), who = box.querySelector?.('.who');
  if (who) who.textContent = o ? `${o.name} · 군사` : '';
  const src = o && portraits[o.officerId]?.path, key = `${o?.officerId ?? ''}|${src ?? ''}`; // 초상이 늦게 들어와도 다시 그린다
  if (face && face.dataset?.id !== key) {
    face.innerHTML = src ? `<img src="${src}" alt="">` : `<b>${o?.name?.[0] ?? ''}</b>`;
    if (face.dataset) face.dataset.id = key;
  }
}

// ── 모드 막대: 그림 아이콘이 오면 쓰고, 없으면 한자 글자 ─────────────────────────
const MODE_ICON = {trace: 'chronicle'}; // 탐험 전용 아이콘이 오기 전까지 기록(원통 인장) 아이콘
export function renderModeRail() {
  const rail = document.querySelector?.('#mode-rail'); if (!rail?.querySelectorAll) return;
  for (const b of rail.querySelectorAll('[data-mode]')) {
    b.classList?.toggle?.('on', b.dataset.mode === mode);
    b.setAttribute?.('aria-pressed', String(b.dataset.mode === mode));
    const icon = v3Asset(`ui/mode-${MODE_ICON[b.dataset.mode] ?? b.dataset.mode}.png`);
    b.classList?.toggle?.('has-icon', !!icon);
    if (icon) b.style?.setProperty?.('--icon', `url("${icon}")`);
  }
}

/** 자원 칸 아이콘(그림이 오면). key = food|production|science|fame|troops|reserve */
export function resourceIcon(key) { return v3Asset(`ui/res-${key}.png`); }
export function factionEmblem(fid) { return v3Asset(`emblems/${fid}.png`); }
