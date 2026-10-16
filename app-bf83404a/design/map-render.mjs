// 전략 지도 렌더러 — "문명 + 삼국지" (Claude, 2026-10-03)
// 순수 함수: 화면용 모델 → SVG 문자열. DOM·게임 상태를 직접 읽지 않는다.
// 클릭은 기존 조작 코드와 같은 속성으로 받는다: data-tile, data-unit, data-city.
// 레이어(아래→위): 바탕 수묵 · 땅 · 지형(가장자리 번짐) · 강·길 · 국경 · 옅은 칸 선 · 안개
//                 · 이동/공격 칸 · 클릭 칸 · 시설 · 성 · 부대 · 도시 이름표

import {hexCenter, outlineRings, cityWallsSvg, ringAround} from './city-walls.mjs';
import {qDefs, qSheet, qTerrain, qCastle, qFacility, qPlate} from './qinglu-render.mjs';

const SQRT3 = Math.sqrt(3);
const fmt = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const PLACE_GLYPH = {'성소': '祠', '은거지': '隱', '옛 진지': '營', '군마 산지': '馬'};
const PLACE_STATUS = {KNOWN: '탐험 장소 — 부대가 이 칸에서 교전 없이 차례를 마치면 조사', UNKNOWN: '탐험 장소 — 부대가 이 칸에서 교전 없이 차례를 마치면 조사', INVESTIGATING: '조사 중 — 이번 정산에 끝남', PENDING: '조사 끝 — 선택 대기', RESOLVED: '해결됨'};
const parse = (id) => { const [q, r] = String(id).split(',').map(Number); return {q, r}; };

export const FACTION_STYLE = {
  F01: {color: '#b8433c', soft: '#efd2cd', emblem: 'f-dragon', name: '조조'},
  F02: {color: '#4f8f73', soft: '#d3e6dc', emblem: 'f-knot', name: '유비'},
  F03: {color: '#33709f', soft: '#cfdeea', emblem: 'f-wave', name: '손권'},
};
export const TROOP_ART = {BT01: 'infantry', BT02: 'spear_infantry', BT03: 'ranged', BT04: 'cavalry'};
// 서버 허용 목록에 squad_BT0x_v1.png 가 등록되면 true 로 바꾼다(그 전엔 기존 병사 그림 3겹).
export const SQUAD_ART_READY = true;
export const FACILITY_ART = {farm: 'farm_v1', granary: 'granary_v1', market: 'market_v1', barracks: 'barracks_v1', workshop: 'workshop_v1', tuntian: 'tuntian_v1', clinic: 'clinic_v1', mufu: 'mufu_v1', naval: 'mufu_v1'};
// 성 그림: 바닥 기울기 0.62 용으로 칸에 맞춰 만든 그림(ComfyUI) — 기울기가 다르면 기존 GPT 그림을 상자에 맞춰 얹는다.
export const CASTLE_ART = (base, tilt) => Math.abs(tilt - 0.62) < 0.01
  ? {src: `${base}/assets/map-art/castle7_t62_v1.png`, fit: {image: [1216, 832], flowerBox: [57, 171, 1102]}}
  : `${base}/assets/map-art/walled_city_v1.png`;
export const FACILITY_NAME = {farm: '농지', granary: '곡창', market: '시장', barracks: '병영', workshop: '공방', tuntian: '둔전', clinic: '의원', mufu: '장막부', naval: '장막부'};
// 작은 성: 큰 성과 같은 7칸 자리에 맞춘 소박한 요새 그림(ComfyUI, 같은 깊이 가이드) — 기울기가 다르면 큰 성 그림으로
export const FORT_ART = (base, tilt) => Math.abs(tilt - 0.62) < 0.01
  ? {src: `${base}/assets/map-art/fort7_t62_v1.png`, fit: {image: [1216, 832], flowerBox: [57, 171, 1102]}}
  : CASTLE_ART(base, tilt);
export const STATUS_NAME = {INSPIRED: '고양', SLOWED: '둔화', ROOTED: '속박', CONFUSED: '혼란'}; // DEMORALIZED 는 사기 '동요' 표시로 대신

let TILT = 1; // renderStrategicMap 이 호출마다 설정 (바닥 시점 기울기)
function hexPoints(c, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${fmt(c.x + size * Math.cos(a))},${fmt(c.y + size * Math.sin(a) * TILT)}`);
  }
  return pts.join(' ');
}
const hexPath = (c, size) => 'M' + hexPoints(c, size).replace(/ /g, 'L') + 'Z';
const ringsPath = (rings) => rings.map((ring) => 'M' + ring.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L') + 'Z').join('');
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

/** 칸의 실제 꼭짓점 6개(기울기 포함). */
function hexVerts(c, size) {
  return Array.from({length: 6}, (_, i) => { const a = (Math.PI / 180) * (60 * i - 90); return {x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) * TILT}; });
}
/** 두 칸이 실제로 공유하는 꼭짓점 2개 — 기울어진 바닥에서도 이웃 변과 끝점이 정확히 맞물린다. */
function sharedVerts(a, b, layout) {
  const va = hexVerts(hexCenter(a, layout), layout.size), vb = hexVerts(hexCenter(b, layout), layout.size);
  const common = va.filter((p) => vb.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.5));
  return common.length === 2 ? common : sharedEdge(a, b, layout);
}
/** 강 변들을 이어 물길(꼭짓점 줄)로 묶는다. 갈림길에서는 새 물길로 나뉜다. */
function riverChains(segs) {
  const key = (p) => `${Math.round(p.x * 2)}:${Math.round(p.y * 2)}`;
  const adj = new Map();
  segs.forEach((seg, i) => seg.forEach((v) => { const k = key(v); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(i); }));
  const used = new Set(), chains = [];
  const extend = (pt, out) => {
    for (;;) {
      const next = (adj.get(key(pt)) ?? []).find((i) => !used.has(i));
      if (next === undefined) return;
      used.add(next);
      const [a, b] = segs[next], far = key(a) === key(pt) ? b : a;
      out.push(far); pt = far;
    }
  };
  // 끝점(이웃 변이 하나뿐인 꼭짓점)에서 먼저 출발해야 물길이 덜 끊긴다
  const order = [...segs.keys()].sort((i, j) => Math.min(...segs[i].map((v) => adj.get(key(v)).length)) - Math.min(...segs[j].map((v) => adj.get(key(v)).length)));
  for (const i of order) {
    if (used.has(i)) continue;
    used.add(i);
    let [a, b] = segs[i];
    if (adj.get(key(b)).length === 1) [a, b] = [b, a];
    const fwd = [a, b]; extend(b, fwd);
    const back = []; extend(a, back);
    chains.push([...back.reverse(), ...fwd]);
  }
  return chains;
}
/** 꼭짓점 대신 변의 가운데를 이어 지그재그 폭을 절반으로(양 끝점은 유지). */
const edgeMids = (pts) => pts.length < 3 ? pts : [pts[0], ...pts.slice(1).map((p, i) => ({x: (p.x + pts[i].x) / 2, y: (p.y + pts[i].y) / 2})), pts.at(-1)];
/** Chaikin 모서리 깎기 — 칸 경계 지그재그를 굽이치는 물길로. 양 끝점은 그대로. */
function chaikin(pts, rounds = 3) {
  let p = pts;
  for (let k = 0; k < rounds && p.length > 2; k++) {
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (i > 0) out.push({x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25});
      if (i < p.length - 2) out.push({x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75});
    }
    out.push(p.at(-1));
    p = out;
  }
  return p;
}

/** 두 칸이 맞닿은 변의 양 끝점 (강 그리기용). */
function sharedEdge(a, b, layout) {
  const size = layout.size;
  const ca = hexCenter(a, layout), cb = hexCenter(b, layout);
  const mid = {x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2};
  const dx = cb.x - ca.x, dy = cb.y - ca.y, len = Math.hypot(dx, dy) || 1;
  const half = size / 2; // 변 길이 = size
  return [{x: mid.x - (dy / len) * half, y: mid.y + (dx / len) * half}, {x: mid.x + (dy / len) * half, y: mid.y - (dx / len) * half}];
}

/** 표시용 영역: 가장 가까운 도시(거리 3 이내)의 소유 세력. 게임 규칙에 쓰지 않는다. */
export function displayTerritory(tiles, cities, radius = 3) {
  const out = {};
  for (const t of tiles) {
    let best = null;
    for (const c of cities) {
      const d = hexDist(t, parse(c.center));
      if (d <= radius && (!best || d < best.d)) best = {d, f: c.factionId};
    }
    if (best) out[`${t.q},${t.r}`] = best.f;
  }
  return out;
}

/** 7칸 성: 중심 + 둘레 6칸. 성문 = 길이 지나는 둘레 칸 우선, 모자라면 서로 떨어진 칸. */
export function castleFootprint(centerId, {roads = [], exists = () => true} = {}) {
  const c = parse(centerId);
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const ring = dirs.map(([dq, dr]) => ({q: c.q + dq, r: c.r + dr})).filter((t) => exists(`${t.q},${t.r}`));
  const id = (t) => `${t.q},${t.r}`;
  const roadSet = new Set(roads.flatMap(([a, b]) => [a + '|' + b, b + '|' + a]));
  const gates = ring.filter((t) => roadSet.has(id(c) + '|' + id(t))).slice(0, 3);
  for (const t of ring) {
    if (gates.length >= 3) break;
    if (gates.includes(t)) continue;
    if (gates.every((g) => hexDist(g, t) >= 2)) gates.push(t);
  }
  for (const t of ring) { if (gates.length >= 3) break; if (!gates.includes(t)) gates.push(t); }
  const walls = ring.filter((t) => !gates.includes(t));
  return {center: id(c), gates: gates.map(id), walls: walls.map(id)};
}

function defs(base, layout) {
  const s = layout.size, p = Math.round(s * SQRT3 * 3.2);
  const pat = (id, file) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${p}" height="${p}"><image href="${base}/assets/terrain-art/${file}" width="${p}" height="${p}" preserveAspectRatio="xMidYMid slice"/></pattern>`;
  return `<defs>
    ${pat('mr-plain', 'plain_v1.png')}${pat('mr-forest', 'forest_v1.png')}${pat('mr-hill', 'hill_v1.png')}${pat('mr-mountain', 'mountain_v1.png')}
    <pattern id="mr-paper" patternUnits="userSpaceOnUse" width="512" height="512"><image href="${base}/assets/ui-art/paper_v1.png" width="512" height="512"/></pattern>
    <pattern id="mr-table" patternUnits="userSpaceOnUse" width="512" height="512"><image href="${base}/assets/ui-art/table_v1.png" width="512" height="512"/></pattern>
    <radialGradient id="mr-vignette" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>
    <filter id="mr-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${fmt(s * 0.32)}"/></filter>
    <filter id="mr-cloud" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${fmt(s * 0.55)}"/></filter>
    <filter id="mr-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="mr-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#2b2a24" flood-opacity=".45"/></filter>
    <clipPath id="mr-portrait"><circle r="9.5"/></clipPath>
  </defs>`;
}

/**
 * model: {tiles:[{q,r,terrain,vis}], rivers:[[idA,idB]], roads:[[idA,idB]], cities:[{id,name,factionId,center,gates?,walls?,besieged?,occupied?,population?,defense?,defenseMax?}],
 *         facilities:[{tileId,kind,disabled?}], units:[{id,factionId,tileId,name,portrait?,troop,count,maxCount,active?,moved?,enemy?,
 *                  morale?,braced?,faceTileId?,motion?,attack?,prevCount?,heavyLoss?,lossLabel?}], fx?:[{kind,from,to,elapsed}],
 *         highlights:{move:[ids],attack:[ids],path:[ids],orders?:[{unitId,path:[ids],turns}]}, territory?:{id:factionId}}
 * opts:  {size=30, base='', margin=60}
 */
export function renderStrategicMap(model, opts = {}) {
  const size = opts.size ?? 30, base = opts.base ?? '', margin = opts.margin ?? 70;
  const tilt = TILT = opts.tilt ?? 0.62; // 성·시설·병사 그림(아이소메트릭)과 바닥 시점을 맞춤
  const useSquads = opts.squads ?? SQUAD_ART_READY; // ComfyUI 부대 무리 그림
  const Qm = opts.theme === 'qinglu'; // 청록산수 테마(qinglu-render.mjs) — 기본은 기존 그림
  const tiles = model.tiles.map((t) => ({...t, id: `${t.q},${t.r}`}));
  const raw = tiles.map((t) => hexCenter(t, {size, ox: 0, oy: 0, tilt}));
  const minX = Math.min(...raw.map((c) => c.x)) - size, minY = Math.min(...raw.map((c) => c.y)) - size * tilt - size * 2.6;
  const layout = {size, ox: margin - minX, oy: margin - minY, tilt};
  const maxX = Math.max(...raw.map((c) => c.x)) + layout.ox + size + margin;
  const maxY = Math.max(...raw.map((c) => c.y)) + layout.oy + size + margin;
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const C = (id) => hexCenter(byId.get(id) ?? parse(id), layout);
  const hl = model.highlights ?? {};

  // 바탕 + 땅
  const land = ringsPath(outlineRings(tiles, layout));
  let svg = `<svg class="sg-strategic-map${Qm ? ' q-map' : ''}" viewBox="0 0 ${fmt(maxX)} ${fmt(maxY)}" xmlns="http://www.w3.org/2000/svg">${defs(base, layout)}${Qm ? qDefs(base) : ''}`;
  const full = `x="0" y="0" width="${fmt(maxX)}" height="${fmt(maxY)}"`;
  if (!Qm) svg += `<g class="mr-backdrop"><rect ${full} fill="url(#mr-table)"/><rect ${full} fill="url(#mr-vignette)"/></g>`;
  // 탁자 위 종이 지도 한 장(크루세이더 킹즈3): 칸 바깥 여백까지 종이 + 이중 테두리 → 칸 계단이 탁자에 바로 닿지 않는다
  {
    const cs = tiles.map((t) => hexCenter(t, layout)), pad = size * 2.4;
    const x0 = Math.min(...cs.map((c) => c.x)) - pad, x1 = Math.max(...cs.map((c) => c.x)) + pad;
    const y0 = Math.min(...cs.map((c) => c.y)) - pad - size * 1.6, y1 = Math.max(...cs.map((c) => c.y)) + pad;
    const box = (inset) => `x="${fmt(x0 + inset)}" y="${fmt(y0 + inset)}" width="${fmt(x1 - x0 - inset * 2)}" height="${fmt(y1 - y0 - inset * 2)}"`;
    svg += Qm ? qSheet(x0, y0, x1, y1, size, full)
      : `<g class="mr-sheet"><rect class="shade" ${box(-6)} filter="url(#mr-cloud)"/><rect class="paper" ${box(0)} fill="url(#mr-paper)"/><rect class="frame" ${box(size * 0.45)}/><rect class="frame-in" ${box(size * 0.7)}/></g>`;
  }
  svg += `<path class="mr-land-shadow" d="${land}" filter="url(#mr-cloud)"/><path class="mr-land" d="${land}" fill="url(#${Qm ? 'q-silk' : 'mr-plain'})"/>${Qm ? `<path class="q-land-wash" d="${land}"/>` : ''}`;
  const landEdge = `<path class="mr-land-edge" d="${land}" filter="url(#mr-feather)"/>`; // 지도 가장자리 칸 계단을 먹 번짐으로 눌러 탁자와 잇는다

  // 지형: 같은 종류 칸을 묶어 번진 가장자리로 덮는다 → 칸마다 끊기지 않는 이어진 땅
  for (const kind of ['forest', 'hill', 'mountain']) {
    const group = tiles.filter((t) => t.terrain === kind);
    if (!group.length) continue;
    const shape = group.map((t) => hexPath(hexCenter(t, layout), size * 0.98)).join('');
    svg += `<mask id="mr-m-${kind}" maskUnits="userSpaceOnUse"><path d="${shape}" fill="#fff" filter="url(#mr-feather)"/></mask>`;
    svg += `<rect class="mr-terrain ${kind}${Qm ? ' q-wash' : ''}" x="0" y="0" width="${fmt(maxX)}" height="${fmt(maxY)}"${Qm ? '' : ` fill="url(#mr-${kind})"`} mask="url(#mr-m-${kind})"/>`;
  }
  if (Qm) svg += qTerrain(tiles, layout); // 봉우리·둔덕·나무(벡터)

  // 강·길
  // 강: 칸 변을 이어 한 물길로 만들고 모서리를 깎아 굽이치게(다리 변도 물길에 넣고 위에 다리를 얹는다)
  const waterEdges = [...(model.rivers ?? []), ...(model.bridges ?? [])];
  if (waterEdges.length) {
    const d = riverChains(waterEdges.map(([a, b]) => sharedVerts(parse(a), parse(b), layout)))
      .map((chain) => 'M' + chaikin(edgeMids(chain)).map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')).join('');
    svg += `<path class="mr-river-bank" d="${d}"/><path class="mr-river" d="${d}"/><path class="mr-river-glint" d="${d}"/>`;
  }
  for (const [a, b] of model.bridges ?? []) {
    const p = C(a), q = C(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    svg += `<g class="mr-bridge" transform="translate(${fmt(mx)} ${fmt(my)}) rotate(${fmt(ang)})"><rect x="${fmt(-size * 0.42)}" y="${fmt(-size * 0.13)}" width="${fmt(size * 0.84)}" height="${fmt(size * 0.26)}" rx="1.5"/><path d="M${fmt(-size * 0.42)} ${fmt(-size * 0.13)}h${fmt(size * 0.84)}M${fmt(-size * 0.42)} ${fmt(size * 0.13)}h${fmt(size * 0.84)}"/></g>`;
  }
  if (model.roads?.length) {
    const d = model.roads.map(([a, b]) => { const p = C(a), q = C(b); return `M${fmt(p.x)} ${fmt(p.y)}L${fmt(q.x)} ${fmt(q.y)}`; }).join('');
    svg += `<path class="mr-road" d="${d}"/>`;
  }

  // 국경 (문명식): 세력별 영역 옅은 칠 + 바깥 테두리 선
  const territory = model.territory ?? displayTerritory(tiles, model.cities ?? []);
  for (const [fid, style] of Object.entries(FACTION_STYLE)) {
    const owned = tiles.filter((t) => territory[t.id] === fid && t.vis !== 'UNEXPLORED');
    if (!owned.length) continue;
    const d = ringsPath(outlineRings(owned, layout));
    svg += `<path class="mr-territory-fill" d="${d}" style="fill:${style.color}"/><path class="mr-territory-edge" d="${d}" style="stroke:${style.color}"/><path class="mr-territory-inner" d="${d}" style="stroke:${style.color}"/>`;
  }

  svg += landEdge;
  // 옅은 칸 선
  svg += `<path class="mr-grid" d="${tiles.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;

  // 안개: 기억만 하는 칸은 바랜 종이, 미탐험은 수묵 구름
  const remembered = tiles.filter((t) => t.vis === 'REMEMBERED');
  if (remembered.length) svg += `<path class="mr-fog-remembered" d="${remembered.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
  const unexplored = tiles.filter((t) => t.vis === 'UNEXPLORED');
  if (unexplored.length) {
    const shape = unexplored.map((t) => hexPath(hexCenter(t, layout), size * 1.12)).join('');
    svg += `<mask id="mr-m-fog" maskUnits="userSpaceOnUse"><path d="${shape}" fill="#fff" filter="url(#mr-cloud)"/></mask>`;
    // 옛 지도(사용자 2026-10-04 "지형은 옛지도로 보여줘"): 지형이 있으면 빛바랜 갈색(색만 바꾸는 혼합) + 종이 결을 얇게 덮는다.
    // 지형을 모르면(v1) 지금처럼 빈 종이.
    const oldMap = unexplored.some((t) => t.terrain && t.terrain !== 'unknown');
    const grid = `<path class="mr-fog-grid" d="${unexplored.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
    svg += Qm
      ? `<g class="mr-fog old-map q-fog" mask="url(#mr-m-fog)"><rect class="silk" ${full} fill="url(#q-silk)"/><rect class="clouds" ${full} fill="url(#q-cloud)"/>${grid}</g>`
      : oldMap
      ? `<g class="mr-fog old-map tone" mask="url(#mr-m-fog)"><rect ${full}/></g><g class="mr-fog old-map paper" mask="url(#mr-m-fog)"><rect ${full} fill="url(#mr-paper)"/>${grid}</g>`
      : `<g class="mr-fog" mask="url(#mr-m-fog)"><rect ${full} fill="url(#mr-paper)"/>${grid}</g>`;
    svg += `<path class="mr-fog-edge" d="${ringsPath(outlineRings(unexplored, layout))}" filter="url(#mr-feather)"/>`;
  }

  // 이동·공격·경로
  const hexes = (ids, cls) => (ids ?? []).map((id) => `<path class="${cls}" d="${hexPath(C(id), size * 0.9)}"/>`).join('');
  svg += hexes(hl.danger, 'mr-danger') + hexes(hl.move, 'mr-move') + hexes(hl.attack, 'mr-attack');
  if (hl.side?.tile && C(hl.side.tile)) { const p = C(hl.side.tile), name = {FRONT: '정면', FLANK: '측면 +15%', REAR: '후방 +30%'}[hl.side.side] ?? ''; svg += `<g class="mr-side side-${esc(hl.side.side ?? '')}"><path d="${hexPath(p, size * 0.98)}"/>${name ? `<text x="${fmt(p.x)}" y="${fmt(p.y - size * 1.05)}">${name}</text>` : ''}</g>`; }
  // C30 팀업 연결선(짝끼리 금색 끈) · 적의 다음 이동 목표(붉은 점선 화살표 — Into the Breach 예고)
  for (const l of hl.links ?? []) { const a = C(l.from), z = C(l.to); if (!a || !z) continue; svg += `<g class="mr-link"><path d="M${fmt(a.x)} ${fmt(a.y)}L${fmt(z.x)} ${fmt(z.y)}"/><circle cx="${fmt((a.x + z.x) / 2)}" cy="${fmt((a.y + z.y) / 2)}" r="4"/></g>`; }
  for (const l of hl.intents ?? []) { const a = C(l.from), z = C(l.to); if (!a || !z) continue; const dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ex = z.x - ux * size * 0.5, ey = z.y - uy * size * 0.5; svg += `<g class="mr-intent"><path d="M${fmt(a.x + ux * size * 0.5)} ${fmt(a.y + uy * size * 0.5)}L${fmt(ex)} ${fmt(ey)}"/><path class="head" d="M${fmt(ex + ux * 9)} ${fmt(ey + uy * 9)}L${fmt(ex - uy * 6)} ${fmt(ey + ux * 6)}L${fmt(ex + uy * 6)} ${fmt(ey - ux * 6)}Z"/><path class="goal" d="${hexPath(z, size * 0.8)}"/></g>`; }
  if (hl.path?.length > 1) svg += `<path class="mr-path" d="M${hl.path.map((id) => { const p = C(id); return `${fmt(p.x)} ${fmt(p.y)}`; }).join('L')}"/>`;
  // 예약 이동 명령(문명식 '여기로 가'): 점선 경로 + 목적지 깃발과 남은 턴 수. highlights.orders = [{unitId, path:[tileId…], turns}]
  for (const order of hl.orders ?? []) {
    if (!order.path?.length) continue;
    const pts = order.path.map((id) => C(id)), end = pts.at(-1);
    if (pts.length > 1) svg += `<path class="mr-order-path" d="M${pts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')}"/>`;
    svg += `<g class="mr-order-flag" transform="translate(${fmt(end.x)} ${fmt(end.y)})"><path class="pole" d="M0 2V-22"/><path class="cloth" d="M0 -22L13 -18L0 -13Z"/>${order.turns > 1 ? `<g transform="translate(0 9)"><rect x="-13" y="-7" width="26" height="14" rx="7"/><text y="3.5">${order.turns}턴</text></g>` : ''}</g>`;
  }

  // 클릭 칸 (투명). 장식 레이어는 모두 pointer-events:none 이라 이 칸이 클릭을 받는다.
  svg += `<g class="mr-hits">${tiles.map((t) => `<path data-tile="${t.id}" d="${hexPath(hexCenter(t, layout), size)}"/>`).join('')}</g>`;

  // 시설
  for (const f of model.facilities ?? []) {
    const c = C(f.tileId), w = size * SQRT3 * 1.45, h = w * (1024 / 1536);
    if (Qm) { svg += qFacility(f, c, FACILITY_NAME[f.kind] ?? f.kind, size); continue; }
    svg += `<g class="mr-facility${f.disabled ? ' disabled' : ''}" transform="translate(${fmt(c.x)} ${fmt(c.y)})"><image href="${base}/assets/facility-art/${FACILITY_ART[f.kind] ?? 'barracks_v1'}.png" x="${fmt(-w / 2)}" y="${fmt(-h / 2 - size * 0.12)}" width="${fmt(w)}" height="${fmt(h)}"/><text y="${fmt(size * 0.88)}">${esc(FACILITY_NAME[f.kind] ?? f.kind)}</text></g>`;
  }

  // 탐험 장소(C42) — 글자 인장 + 이름, 상태(조사 중·선택 대기·해결)는 data-status 로
  for (const p of model.places ?? []) {
    const c = C(Array.isArray(p.at) ? p.at.join(',') : p.tileId), glyph = PLACE_GLYPH[p.label] ?? '跡';
    svg += `<g class="mr-place${Qm ? ' q-place' : ''}" data-place="${esc(p.label)}" data-status="${esc(p.status ?? 'KNOWN')}" transform="translate(${fmt(c.x)} ${fmt(c.y)})"><title>${esc(p.label)}${p.note ? ' · ' + esc(p.note) : ''}${p.eventName ? ' — ' + esc(p.eventName) : ''}
${PLACE_STATUS[p.status] ?? PLACE_STATUS.KNOWN}</title><circle class="halo" r="${fmt(size * 0.62)}"/><g transform="translate(0 ${fmt(-size * 0.1)})"><rect class="seal" x="-10.5" y="-10.5" width="21" height="21" rx="3"/><text class="glyph" y="4.8">${glyph}</text></g><text class="name" y="${fmt(size * 0.7)}">${esc(p.label)}</text></g>`;
  }

  // 성 (7칸) — 그림을 칸 모양 안에 맞춘다
  for (const city of model.cities ?? []) {
    const style = FACTION_STYLE[city.factionId] ?? {color: '#7d7a6a'};
    const fp = city.gates ? city : castleFootprint(city.center, {roads: model.roads, exists: (id) => byId.has(id)});
    const cells = [{...parse(fp.center), role: 'CENTER'}, ...fp.gates.map((id) => ({...parse(id), role: 'WALL', gate: true, held: (city.lostGates ?? []).includes(id) ? 'ENEMY' : 'OWN'})), ...fp.walls.map((id) => ({...parse(id), role: 'RAMPART'}))];
    svg += Qm ? qCastle(cells, {layout, factionColor: style.color, besieged: !!city.besieged, occupied: !!(city.occupied || (city.occupation && city.occupation.stage !== 'NORMAL')), minor: city.kind === 'minor'})
      : cityWallsSvg(cells, {factionColor: style.color, besieged: !!city.besieged, occupied: !!(city.occupied || (city.occupation && city.occupation.stage !== 'NORMAL')), layout, art: city.kind === 'minor' ? FORT_ART(base, tilt) : CASTLE_ART(base, tilt), artScale: city.kind === 'minor' ? 0.66 : 0.92});
    for (const g of fp.gates) { const c = C(g); svg += `<g class="mr-gate${(city.lostGates ?? []).includes(g) ? ' lost' : ''}" transform="translate(${fmt(c.x)} ${fmt(c.y)})" style="--fc:${style.color}"><path d="M-6 6V-3a6 6 0 0 1 12 0V6Z"/><path class="flag" d="M0 -9V-20l9 3-9 3"/></g>`; }
  }

  // 부대 (삼국지 14식): 병사 무리 + 초상 명판 + 병력 막대
  // 방향: 부대 그림은 모두 오른쪽을 본다 → 왼쪽을 봐야 하면 좌우 반전.
  //   전투 상대(faceTileId) > 이동 중(가는 쪽) > 붙은 적 쪽(패주는 반대) > 8칸 안 가장 가까운 적 > 기본
  // 움직임(모델에서 받음, elapsed 를 음수 animation-delay 로 넘겨 다시 그려도 끊기지 않는다):
  //   units[].motion = {path:[tileId…], elapsed, duration, hold}  경로를 따라 행군
  //   units[].attack = {targetTileId, elapsed, duration, ranged}  돌진(근접) · 활 당김(원거리)
  //   model.fx       = [{kind:'clash'|'charge'|'volley'|'siege', from, to, elapsed}]  부딪힘 불꽃·먼지 / 화살 일제사격 / 성 공격 투석
  const units = model.units ?? [];
  const alive = units.filter((u) => u.count !== 0);
  const cx = (id) => C(id).x;
  const sideOf = (from, to) => Math.sign(cx(to) - cx(from));
  const foesNextTo = (u) => alive.filter((o) => o.factionId !== u.factionId && hexDist(parse(u.tileId), parse(o.tileId)) === 1);
  const moving = (u) => u.motion?.path?.length > 1 && (u.motion.elapsed ?? 0) < (u.motion.duration ?? 0);
  // 정면 방향(전투 정본 20 v3.4 §1.2): units[].facing = 0~5 육각 방향(map-primitives 이웃 순서)
  const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const hexFacing = (u) => Number.isInteger(u.facing) && u.facing >= 0 && u.facing < 6;
  function facingVec(u) {
    const p = parse(u.tileId), [dq, dr] = HEX_DIRS[u.facing], a = C(u.tileId), b = C(`${p.q + dq},${p.r + dr}`);
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    return {x: dx / n, y: dy / n};
  }
  function facingOf(u) {
    if (u.faceTileId) return sideOf(u.tileId, u.faceTileId) || 1;
    if (moving(u)) { const p = u.motion.path; return sideOf(p.at(-2), p.at(-1)) || sideOf(p[0], p.at(-1)) || 1; }
    if (hexFacing(u)) { const v = facingVec(u); if (Math.abs(v.x) > 0.01) return Math.sign(v.x); }
    const away = u.morale === 'ROUTING' ? -1 : 1;
    const foes = foesNextTo(u);
    if (foes.length) return away * (Math.sign(foes.reduce((n, o) => n + cx(o.tileId) - cx(u.tileId), 0)) || 1);
    let best = null;
    const consider = (tileId) => { const d = hexDist(parse(u.tileId), parse(tileId)); if (d <= 8 && (!best || d < best.d)) best = {d, tileId}; };
    for (const o of alive) if (o.factionId !== u.factionId) consider(o.tileId);
    for (const city of model.cities ?? []) if (city.factionId !== u.factionId) consider(city.center);
    return away * ((best && sideOf(u.tileId, best.tileId)) || 1);
  }
  // 교전 표시: 붙어 있는 적 부대 쌍마다 경계에 교차한 칼
  const engaged = new Set();
  for (const u of alive) for (const o of foesNextTo(u)) {
    const key = [u.id, o.id].sort().join('|');
    if (engaged.has(key) || moving(u) || moving(o)) continue;
    engaged.add(key);
    const a = C(u.tileId), b = C(o.tileId);
    svg += `<g class="mr-engage" transform="translate(${fmt((a.x + b.x) / 2)} ${fmt((a.y + b.y) / 2 + size * 0.3)})"><circle r="6"/><path d="M-3.4 -3.4L3.4 3.4M3.4 -3.4L-3.4 3.4"/><path class="hilt" d="M-4.5 1.2L-1.2 4.5M4.5 1.2L1.2 4.5"/></g>`;
  }

  const keyframes = [];
  const unitBoxes = []; // 도시 이름표 자리 고르기용: 부대 이름표·병사 그림이 차지하는 칸(지도 좌표)
  // 부대 이름표는 맨 위 층에 따로 그린다 — 아래 줄 부대의 병사 그림·도시 이름표가 윗줄 이름표를 가리지 않게.
  // 같은 data-unit·클래스를 달아 클릭·상태 표시는 그대로, 이동 애니메이션(.mv)도 같은 키프레임을 쓴다.
  const plates = [];
  const stacks = new Map();
  for (const u of units) stacks.set(u.tileId, [...(stacks.get(u.tileId) ?? []), u.id]);
  for (const u of units) {
    const style = FACTION_STYLE[u.factionId] ?? {color: '#7d7a6a'}, base0 = C(u.tileId);
    const stack = stacks.get(u.tileId), idx = stack.indexOf(u.id), n = stack.length;
    const c = n > 1 ? {x: base0.x + (idx - (n - 1) / 2) * size * 0.75, y: base0.y} : base0;
    const plateDx = n > 1 ? -(idx - (n - 1) / 2) * size * 0.75 : 0, plateDy = idx * (Qm ? 31 : 25);
    const plateY = Qm ? size * 0.62 : size * 0.66;
    const art = `${base}/assets/troop-art/${TROOP_ART[u.troop] ?? 'infantry'}.png`, s = size * 1.05;
    if (u.count !== 0) unitBoxes.push(Qm ? {x0: base0.x - 31, x1: base0.x + 50, y0: c.y + plateY + plateDy - 16, y1: c.y + plateY + plateDy + 16} : {x0: base0.x - 28, x1: base0.x + 28, y0: c.y + size * 0.66 + plateDy - 12, y1: c.y + size * 0.66 + plateDy + 15},
      {x0: c.x - s * 0.7, x1: c.x + s * 0.7, y0: c.y - s * 1.3, y1: c.y + size * 0.3});
    const ratio = u.maxCount ? Math.max(0, Math.min(1, u.count / u.maxCount)) : 1;
    // prevCount: 방금 전 병력(공격 직후 잠깐 넘김) → 잃은 만큼을 붉은 띠로 남겼다가 줄어드는 연출
    const prevRatio = u.maxCount && Number.isFinite(u.prevCount) ? Math.max(0, Math.min(1, u.prevCount / u.maxCount)) : ratio;
    const portrait = u.portrait ? `<g clip-path="url(#mr-portrait)"><image href="${base}${u.portrait}" x="-17" y="-8.5" width="34" height="51" preserveAspectRatio="xMidYMin meet"/></g>` : `<text class="initial" y="4">${esc((u.name ?? '?').slice(0, 1))}</text>`;
    const lost = Number.isFinite(u.prevCount) && u.prevCount > u.count ? u.prevCount - u.count : 0;
    // 행군: 경로 칸 중심을 지나 최종 칸(0,0)으로 — hold 동안은 출발 칸에 머문다(추격받는 동안 등)
    let mvAttr = '';
    if (moving(u)) {
      const pts = u.motion.path.map((id) => { const p = C(id); return {x: p.x - base0.x, y: p.y - base0.y}; });
      const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = seg.reduce((a, b) => a + b, 0) || 1;
      const hold = Math.max(0, Math.min(0.85, (u.motion.hold ?? 0) / u.motion.duration));
      const at = (p) => `transform:translate(${fmt(p.x)}px,${fmt(p.y)}px)`;
      const name = `mr-mv-${String(u.id).replace(/[^A-Za-z0-9_-]/g, '_')}-${u.motion.key ?? 0}`;
      let acc = 0;
      const frames = [`0%{${at(pts[0])}}`, ...(hold ? [`${fmt(hold * 100)}%{${at(pts[0])}}`] : []),
        ...seg.map((d, i) => { acc += d; return `${fmt((hold + (1 - hold) * acc / total) * 100)}%{${at(pts[i + 1])}}`; })];
      keyframes.push(`@keyframes ${name}{${frames.join('')}}`);
      mvAttr = ` style="animation:${name} ${Math.round(u.motion.duration)}ms linear ${-Math.round(u.motion.elapsed ?? 0)}ms both"`;
    }
    // 공격 동작: 근접은 대상 쪽으로 반 칸 돌진, 원거리는 활을 당기며 살짝 물러섬
    let wrapCls = '', wrapAttr = '';
    if (u.attack && (u.attack.elapsed ?? 0) < (u.attack.duration ?? 520)) {
      const t = C(u.attack.targetTileId), k = u.attack.ranged ? -0.07 : 0.46;
      wrapCls = u.attack.ranged ? ' draw' : ' lunge';
      wrapAttr = ` style="--lx:${fmt((t.x - base0.x) * k)}px;--ly:${fmt((t.y - base0.y) * k)}px;animation-delay:${-Math.round(u.attack.elapsed ?? 0)}ms"`;
    }
    const face = facingOf(u);
    const badge = u.morale === 'ROUTING' ? ['routing', '패주'] : u.morale === 'SHAKEN' ? ['shaken', '동요'] : u.braced ? ['braced', '방어'] : null;
    const squad = useSquads
      ? `<image class="squad group" href="${base}/assets/troop-art/${u.special ? `special_${u.special}` : `squad_${TROOP_ART[u.troop] ? u.troop : 'BT01'}`}_v1.png" x="${fmt(-s * 1.02)}" y="${fmt(-s * 1.58)}" width="${fmt(s * 2.04)}" height="${fmt(s * 2.04)}"/>`
      : `<image class="squad back" href="${art}" x="${fmt(-s * 1.05)}" y="${fmt(-s * 1.25)}" width="${fmt(s * 1.1)}" height="${fmt(s * 1.1)}"/><image class="squad back" href="${art}" x="${fmt(-s * 0.05)}" y="${fmt(-s * 1.28)}" width="${fmt(s * 1.1)}" height="${fmt(s * 1.1)}"/><image class="squad" href="${art}" x="${fmt(-s * 0.72)}" y="${fmt(-s * 1.05)}" width="${fmt(s * 1.45)}" height="${fmt(s * 1.45)}"/>`;
    const formation = u.formation === 'BROKEN' ? ' formation-broken' : u.formation === 'DISORDERED' ? ' formation-disordered' : '';
    const cls = `mr-unit${u.active ? ' active' : ''}${u.moved ? ' moved' : ''}${u.enemy ? ' enemy' : ''}${lost ? ' hit' : ''}${u.heavyLoss ? ' heavy' : ''}${u.bond ? ' bonded' : ''}${u.crisis ? ' crisis' : ''}` +
      `${u.morale === 'SHAKEN' ? ' shaken' : ''}${u.morale === 'ROUTING' ? ' routing' : ''}${u.count === 0 ? ' dying' : ''}${mvAttr ? ' moving' : ''}${face < 0 ? ' face-left' : ''}${formation}`;
    // 정면 화살표: 바닥 타원 가장자리에 정면 방향 삼각형(이동 중에는 숨김)
    let arrow = '';
    if (hexFacing(u) && !mvAttr && u.count !== 0) {
      const v = facingVec(u), rx = size * 0.86, ry = size * 0.3, ax = v.x * rx, ay = size * 0.36 + v.y * ry * 1.7;
      const deg = Math.atan2(v.y * 1.7 * ry / rx, v.x) * 180 / Math.PI;
      arrow = `<g class="facing" transform="translate(${fmt(ax)} ${fmt(ay)}) rotate(${fmt(deg)})"><path d="M10 0 L-5 -7.5 L-1.5 0 L-5 7.5 Z"/></g>`;
    }
    const formationTitle = u.formation === 'BROKEN' ? '전열 붕괴' : u.formation === 'DISORDERED' ? '전열 흐트러짐' : '';
    svg += `<g class="${cls}" data-unit="${esc(u.id)}" transform="translate(${fmt(c.x)} ${fmt(c.y)})" style="--fc:${style.color}"><g class="mv"${mvAttr}>
      <ellipse class="shadow" cx="0" cy="${fmt(size * 0.36)}" rx="${fmt(size * 0.78)}" ry="${fmt(size * 0.22)}"/>
      ${u.crisis ? `<g class="crisis-mark"><ellipse class="crisis-ring" cx="0" cy="${fmt(size * 0.42)}" rx="${fmt(size * 0.86)}" ry="${fmt(size * 0.33)}"/><ellipse class="crisis-ring pulse" cx="0" cy="${fmt(size * 0.42)}" rx="${fmt(size * 0.86)}" ry="${fmt(size * 0.33)}"/></g>` : ''}
      ${u.bond ? `<ellipse class="bond-ring" cx="0" cy="${fmt(size * 0.42)}" rx="${fmt(size * 0.8)}" ry="${fmt(size * 0.3)}"/>` : ''}
      ${u.active ? `<ellipse class="ring" cx="0" cy="${fmt(size * 0.42)}" rx="${fmt(size * 0.72)}" ry="${fmt(size * 0.26)}"/>` : ''}
      <g class="squad-wrap${wrapCls}"${wrapAttr}><g class="squad-shake"><g class="squad-bob"><g class="squad-face"${face < 0 ? ' transform="scale(-1 1)"' : ''}>${squad}</g></g></g></g>
    </g></g>`;
    plates.push(`<g class="${cls} plate-top" data-unit="${esc(u.id)}" transform="translate(${fmt(c.x)} ${fmt(c.y)})" style="--fc:${style.color}"><g class="mv"${mvAttr}>
      ${arrow}${formationTitle ? `<title>${formationTitle}</title>` : ''}
      ${lost ? `<text class="dmg" x="0" y="${fmt(-size * 1.1)}">${u.lossLabel ? esc(u.lossLabel) + ' ' : ''}−${lost.toLocaleString('ko-KR')}</text>` : ''}
      <g class="plate" transform="translate(${fmt(plateDx)} ${fmt(plateY + plateDy)})"><g class="plate-in">
      ${Qm ? qPlate(u, {base, ratio, prevRatio, formation, badge, statusBadges: (u.status ?? []).filter((k) => STATUS_NAME[k]).slice(0, 2).map((k) => [k.toLowerCase(), STATUS_NAME[k]])}) : `
        <rect class="bg" x="-26" y="-10" width="52" height="20" rx="10"/>${formation ? `<rect class="fm" x="-26" y="-10" width="52" height="20" rx="10"/>` : ''}
        <g transform="translate(-16 0)"><circle class="pbg" r="10.5"/>${portrait}</g>
        <text class="name" x="-4" y="-1.5">${esc(u.name)}</text>
        <text class="count" x="-4" y="7.5">${Number(u.count ?? 0).toLocaleString('ko-KR')}</text>
        <rect class="bar-bg" x="-4" y="11" width="28" height="2.6" rx="1.3"/>${prevRatio > ratio ? `<rect class="bar-lost" x="${fmt(-4 + 28 * ratio)}" y="11" width="${fmt(28 * (prevRatio - ratio))}" height="2.6"/>` : ''}<rect class="bar" x="-4" y="11" width="${fmt(28 * ratio)}" height="2.6" rx="1.3"/>
        ${badge ? `<g class="badge ${badge[0]}" transform="translate(17 -14)"><rect x="-12" y="-6.5" width="24" height="13" rx="6.5"/><text y="3">${badge[1]}</text></g>` : ''}
        ${(u.status ?? []).filter((k) => STATUS_NAME[k]).slice(0, 2).map((k, i) => `<g class="badge st-${k.toLowerCase()}" transform="translate(${-15 + i * 25} -14)"><rect x="-12" y="-6.5" width="24" height="13" rx="6.5"/><text y="3">${STATUS_NAME[k]}</text></g>`).join('')}`}
      </g></g>
    </g></g>`);
  }
  if (keyframes.length) svg += `<style>${keyframes.join('')}</style>`;

  // 전투 효과: 근접 부딪힘(불꽃·섬광·베기·먼지) / 원거리 화살 일제사격
  for (const fx of model.fx ?? []) {
    const a = C(fx.from), b = C(fx.to), d = -Math.round(fx.elapsed ?? 0);
    const delay = (extra = 0) => ` style="animation-delay:${d + extra}ms"`;
    if (fx.kind === 'tactic') {
      // 전법: 시전 부대에 금빛 고리·빛살 + 전법 이름 붓글씨, 대상에 먹빛 터짐
      // fx.rule = 신화 규칙 발동: 같은 모양을 진홍으로(특기 이름 표찰)
      let rays = '';
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2, r1 = 9, r2 = 20 + (i % 2) * 6; rays += `<path d="M${fmt(Math.cos(ang) * r1)} ${fmt(Math.sin(ang) * r1 * 0.62)}L${fmt(Math.cos(ang) * r2)} ${fmt(Math.sin(ang) * r2 * 0.62)}"/>`; }
      const label = fx.label ? `<g class="t-label"${delay(0)}><rect x="${fmt(-String(fx.label).length * 8 - 12)}" y="-15" width="${fmt(String(fx.label).length * 16 + 24)}" height="26" rx="4"/><text y="5">${esc(fx.label)}</text></g>` : '';
      svg += `<g class="mr-fx tactic${fx.rule ? ' rule' : ''}"><g transform="translate(${fmt(a.x)} ${fmt(a.y)})"><g class="t-ring"${delay(0)}><ellipse rx="24" ry="${fmt(24 * 0.62)}"/></g><g class="t-rays"${delay(60)}>${rays}</g><g transform="translate(0 ${fmt(-size * 2.1)})">${label}</g></g>` +
        (fx.from !== fx.to ? `<g transform="translate(${fmt(b.x)} ${fmt(b.y - size * 0.45)})"><g class="t-ink"${delay(320)}><circle r="10"/><circle r="16" class="o"/></g><g class="sparks"${delay(340)}>${Array.from({length: 8}, (_, i) => { const ang = i / 8 * Math.PI * 2; return `<path d="M0 0L${fmt(Math.cos(ang) * 16)} ${fmt(Math.sin(ang) * 16)}"/>`; }).join('')}</g></g>` : '') + `</g>`;
      continue;
    }
    if (fx.kind === 'siege') {
      // 성 공격: 돌 세 개가 포물선으로 날아가 성벽에 부딪힘 → 먼지·파편
      let stones = '';
      for (let i = 0; i < 3; i++) {
        const sx = a.x + (i - 1) * 6, sy = a.y - size * 0.8, ex = b.x + (i - 1) * 9, ey = b.y - size * 0.35 + (i % 2) * 4;
        const mx = (sx + ex) / 2, my = Math.min(sy, ey) - size * 1.8;
        stones += `<circle class="stone" r="2.6" style="offset-path:path('M${fmt(sx)} ${fmt(sy)} Q${fmt(mx)} ${fmt(my)} ${fmt(ex)} ${fmt(ey)}');animation-delay:${d + i * 90}ms"/>`;
      }
      let debris = '';
      for (let i = 0; i < 7; i++) { const ang = Math.PI * (1.05 + i * 0.13), r2 = 12 + (i % 3) * 5; debris += `<path d="M0 0L${fmt(Math.cos(ang) * r2)} ${fmt(Math.sin(ang) * r2)}"/>`; }
      svg += `<g class="mr-fx siege">${stones}<g transform="translate(${fmt(b.x)} ${fmt(b.y - size * 0.35)})"><g class="dust"${delay(420)}><circle cx="-9" cy="4" r="9"/><circle cx="8" cy="6" r="10"/><circle cx="0" cy="-2" r="8"/></g><g class="debris"${delay(420)}>${debris}</g><g class="flash"${delay(400)}><circle r="8"/></g></g></g>`;
      continue;
    }
    if (fx.kind === 'volley') {
      let arrows = '';
      for (let i = 0; i < 6; i++) {
        const j = i - 2.5, sx = a.x + j * 3, sy = a.y - size * 0.95 - (i % 2) * 3, ex = b.x + j * 4.5, ey = b.y - size * 0.45 + ((i * 5) % 3 - 1) * 3;
        arrows += `<path class="arrow" pathLength="100" d="M${fmt(sx)} ${fmt(sy)}Q${fmt((sx + ex) / 2)} ${fmt(Math.min(sy, ey) - size * 1.5)} ${fmt(ex)} ${fmt(ey)}"${delay(i * 40)}/>`;
      }
      svg += `<g class="mr-fx volley">${arrows}<g transform="translate(${fmt(b.x)} ${fmt(b.y - size * 0.45)})"><g class="dust"><circle cx="-7" cy="6" r="6"${delay(360)}/><circle cx="6" cy="8" r="7"${delay(400)}/></g></g></g>`;
    } else {
      const m = {x: a.x + (b.x - a.x) * 0.56, y: a.y + (b.y - a.y) * 0.56 - size * 0.55};
      let sparks = '';
      for (let i = 0; i < 9; i++) { const ang = (i / 9) * Math.PI * 2 + 0.35, r2 = 10 + (i % 3) * 3.5; sparks += `<path d="M${fmt(Math.cos(ang) * 3)} ${fmt(Math.sin(ang) * 3)}L${fmt(Math.cos(ang) * r2)} ${fmt(Math.sin(ang) * r2)}"/>`; }
      const dust = fx.kind === 'charge' ? '<circle cx="-12" cy="14" r="9"/><circle cx="10" cy="15" r="10"/><circle cx="0" cy="10" r="8"/><circle cx="-20" cy="12" r="7"/>' : '<circle cx="-7" cy="12" r="7"/><circle cx="8" cy="13" r="8"/><circle cx="0" cy="8" r="6"/>';
      svg += `<g class="mr-fx clash${fx.kind === 'charge' ? ' charge' : ''}" transform="translate(${fmt(m.x)} ${fmt(m.y)})">
        <g class="dust"${delay(0)}>${dust}</g><g class="flash"${delay(0)}><circle r="7"/></g><g class="sparks"${delay(30)}>${sparks}</g>
        <g class="slash"><path d="M-13 -9L13 9"${delay(0)}/><path d="M13 -9L-13 9"${delay(90)}/></g></g>`;
    }
  }

  // 보급 거점(C45) — 糧 인장 + 재고 막대. 부대 그림 위·이름표 아래 층(같은 칸에 부대가 서도 보이게)
  for (const h of model.hubs ?? []) {
    const c = C(h.tileId), style = FACTION_STYLE[h.factionId] ?? {color: '#7d7a6a'}, r = h.max ? Math.max(0, Math.min(1, h.stock / h.max)) : 0;
    svg += `<g class="mr-hub${Qm ? ' q-hub' : ''}${h.linked === false ? ' cut' : ''}" data-hub="${esc(h.hubId)}" transform="translate(${fmt(c.x + size * 0.62)} ${fmt(c.y - size * 0.5)}) scale(0.85)" style="--fc:${style.color}"><title>보급 거점 · 재고 ${Math.round(h.stock ?? 0)}/${Math.round(h.max ?? 0)}${h.linked === false ? ' · 보급선 끊김(남은 재고만)' : ''}</title><g transform="translate(0 ${fmt(-size * 0.1)})"><path class="tent" d="M-13 7 L0 -11 L13 7 Z"/><text class="glyph" y="5">糧</text></g><rect class="bar-bg" x="-12" y="${fmt(size * 0.42)}" width="24" height="3.5" rx="1.5"/><rect class="bar" x="-12" y="${fmt(size * 0.42)}" width="${fmt(24 * r)}" height="3.5" rx="1.5"/></g>`;
  }

  // 도시 이름표 (문명식): 인구 · 이름 · 방어 막대 · 상태
  for (const city of model.cities ?? []) {
    const style = FACTION_STYLE[city.factionId] ?? {color: '#7d7a6a'}, c = C(city.center);
    const name = esc(city.name), w = Math.max(96, 30 + name.length * 15);
    const def = city.defenseMax ? Math.max(0, Math.min(1, (city.defense ?? city.defenseMax) / city.defenseMax)) : 1;
    const occ = city.occupation;
    const stageName = {CAPTURED: '함락', OCCUPATION: '점령 처리', STABILIZING: '안정화'}[occ?.stage] ?? (city.occupied ? '점령 처리' : '');
    const unrest = {UNREST: '불안', CHAOS: '혼란'}[city.unrest] ?? '';
    const status = city.besieged ? '포위' : stageName ? `${stageName}${Number.isFinite(occ?.turnsLeft) ? ` ${occ.turnsLeft}턴` : ''}` : unrest;
    // 이름표 자리: 성 위(기본) → 더 위 → 성 아래 중 부대 이름표·병사 그림과 겹치지 않는 첫 자리.
    // 셋 다 겹치면 기본 자리에 반투명(마우스를 올리면 진하게) — 부대를 가리지 않게
    const sw = status ? status.length * 12 + 10 : 0;
    const hits = (dy) => { const y = c.y + size * dy; return unitBoxes.some((q) => q.x1 > c.x - w / 2 && q.x0 < c.x + w / 2 + sw && q.y1 > y - 22 && q.y0 < y + 19); };
    const spot = [-2.05, -2.75, 2.3].find((dy) => !hits(dy));
    const crowded = spot === undefined;
    svg += `<g class="mr-city-banner${city.kind === 'minor' ? ' minor' : ''}${city.factionId ? '' : ' neutral'}${city.besieged ? ' besieged' : ''}${crowded ? ' crowded' : ''}${unrest && status === unrest ? ` unrest-${city.unrest.toLowerCase()}` : ''}" data-city="${esc(city.id)}" transform="translate(${fmt(c.x)} ${fmt(c.y + size * (spot ?? -2.05))})" style="--fc:${style.color}">
      ${Qm ? `<path class="cap" d="M${fmt(-w / 2 - 7)} -12L${fmt(-w / 2 + 3)} -20H${fmt(w / 2 - 3)}L${fmt(w / 2 + 7)} -12Z"/>` : ''}<rect class="bg" x="${fmt(-w / 2)}" y="-13" width="${fmt(w)}" height="26" rx="${Qm ? 2 : 13}"/>${Qm ? `<rect class="hair" x="${fmt(-w / 2 + 3)}" y="-10" width="${fmt(w - 6)}" height="20" rx="1"/>` : ''}
      <circle class="pop" cx="${fmt(-w / 2 + 13)}" cy="0" r="11"/><text class="popn${city.population == null ? ' glyph' : ''}" x="${fmt(-w / 2 + 13)}" y="4">${esc(city.population ?? (city.factionId ? FACTION_STYLE[city.factionId]?.name?.[0] ?? '' : '중'))}</text>
      <text class="name" x="${fmt(9)}" y="5">${name}</text>
      <rect class="def-bg" x="${fmt(-w / 2 + 28)}" y="15" width="${fmt(w - 40)}" height="4" rx="2"/><rect class="def" x="${fmt(-w / 2 + 28)}" y="15" width="${fmt((w - 40) * def)}" height="4" rx="2"/>
      ${status ? `<g class="status" transform="translate(${fmt(w / 2 - 2)} -12)"><rect x="-2" y="-9" width="${fmt(status.length * 12 + 10)}" height="16" rx="8"/><text x="${fmt(status.length * 6 + 3)}" y="3">${status}</text></g>` : ''}
      ${(() => { const b = opts.cityBadges?.[city.id]; if (!b) return ''; const t = b.idle ? '＋ 생산 선택' : `${b.name} · ${b.turns}턴`; const bw = t.length * 11 + 16; return `<g class="prod${b.idle ? ' idle' : ''}" data-city="${esc(city.id)}" data-prod-city="${esc(city.id)}" transform="translate(0 33)"><rect x="${fmt(-bw / 2)}" y="-10" width="${fmt(bw)}" height="19" rx="9.5"/><text x="0" y="4">${esc(t)}</text></g>`; })()}
    </g>`;
  }
  svg += `<g class="mr-plates">${plates.join('')}</g>`;
  return svg + '</svg>';
}

/** 미니맵: 지형·영역·도시·부대를 점으로. */
export function renderMinimap(model, {size = 6, theme} = {}) {
  TILT = 1;
  const tiles = model.tiles.map((t) => ({...t, id: `${t.q},${t.r}`}));
  const raw = tiles.map((t) => hexCenter(t, {size, ox: 0, oy: 0}));
  const minX = Math.min(...raw.map((c) => c.x)) - size, minY = Math.min(...raw.map((c) => c.y)) - size;
  const layout = {size, ox: 4 - minX, oy: 4 - minY};
  const maxX = Math.max(...raw.map((c) => c.x)) + layout.ox + size + 4, maxY = Math.max(...raw.map((c) => c.y)) + layout.oy + size + 4;
  const territory = model.territory ?? displayTerritory(tiles, model.cities ?? []);
  const col = theme === 'qinglu' ? {plain: '#e6d9b2', forest: '#7fae8a', hill: '#b7c28f', mountain: '#4f8a96'} : {plain: '#d9c99a', forest: '#8fa070', hill: '#c2a978', mountain: '#9a9283'};
  const oldCol = theme === 'qinglu' ? {plain: '#d9cfae', forest: '#b5bf9c', hill: '#c9c79f', mountain: '#9fb3ad'} : {plain: '#d4c39b', forest: '#a8976c', hill: '#c0a77a', mountain: '#9c8a6c'};
  let s = `<svg class="sg-minimap${theme === 'qinglu' ? ' q-mini' : ''}" viewBox="0 0 ${fmt(maxX)} ${fmt(maxY)}" xmlns="http://www.w3.org/2000/svg">`;
  for (const t of tiles) {
    const c = hexCenter(t, layout), f = territory[t.id];
    // 미탐험: 지형을 알면 옛 지도 갈색 톤, 모르면 빈 종이
    const fill = t.vis === 'UNEXPLORED' ? oldCol[t.terrain] ?? '#cdbf9c' : f && FACTION_STYLE[f] ? FACTION_STYLE[f].color : col[t.terrain] ?? col.plain;
    s += `<path d="${hexPath(c, size)}" fill="${fill}" fill-opacity="${t.vis === 'UNEXPLORED' ? 0.7 : f ? 0.6 : 0.95}"/>`;
  }
  for (const city of model.cities ?? []) { const c = hexCenter(parse(city.center), layout); s += `<rect x="${fmt(c.x - 4)}" y="${fmt(c.y - 4)}" width="8" height="8" fill="${FACTION_STYLE[city.factionId]?.color ?? '#8a8576'}" stroke="#fff" stroke-width="1.5"/>`; }
  for (const u of model.units ?? []) { const c = hexCenter(parse(u.tileId), layout); s += `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="2.6" fill="${FACTION_STYLE[u.factionId]?.color}" stroke="#fff" stroke-width=".8"/>`; }
  return s + '</svg>';
}
