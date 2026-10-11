// 청록산수(靑綠山水) 지도 테마 — 비단 위 군청·녹청 산과 금선 (Claude, 2026-10-07)
// map-render.mjs 가 opts.theme === 'qinglu' 일 때 부르는 그림 조각들. 순수 함수: 좌표·모델 → SVG 문자열.
// 클릭·상태 표시는 기존과 같은 클래스·data 속성을 달아 그대로 쓴다(mr-unit · plate · mr-city-banner · mr-facility …).

import {hexCenter, outlineRings} from './city-walls.mjs';

const fmt = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/** 칸마다 같은 값이 나오는 난수(다시 그려도 산 모양이 바뀌지 않게). */
function rng(q, r, salt = 0) {
  let h = (q * 374761393 + r * 668265263 + salt * 2147483647) | 0;
  return () => { h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return ((h >>> 0) % 10000) / 10000; };
}

export const Q = {
  silk: '#ece1c3', silk2: '#e2d3aa', ink: '#1d2a30', indigo: '#13242c', indigo2: '#1b323c',
  azure: '#2b6d8a', malachite: '#4f9a80', gold: '#c4a052', goldHi: '#e6cb86', cinnabar: '#b5382a',
};

const CLOUD = 'M6 26C-2 26-2 15 7 15C6 7 16 3 22 9C25 1 38 0 41 9C49 6 57 12 54 20C62 21 61 30 53 30H8C5 30 4 28 6 26Z';
const CURL = 'M20 22C17 17 23 13 27 17C29 20 25 23 23 20M36 21C34 15 42 13 44 18C45 22 40 23 39 20';

/** 청록산수용 defs: 비단·구름 무늬, 산·언덕 색, 얼굴 핀 틀, 비단 테두리(장황) 무늬. */
export function qDefs(base) {
  return `<defs>
    <pattern id="q-silk" patternUnits="userSpaceOnUse" width="512" height="512"><image href="${base}/assets/ui-art/silk_v1.png" width="512" height="512"/></pattern>
    <pattern id="q-cloud" patternUnits="userSpaceOnUse" width="132" height="84">
      <g class="q-cloud-motif"><path d="${CLOUD}"/><path class="curl" d="${CURL}"/></g>
      <g class="q-cloud-motif" transform="translate(66 42) scale(.82)"><path d="${CLOUD}"/><path class="curl" d="${CURL}"/></g>
    </pattern>
    <pattern id="q-brocade" patternUnits="userSpaceOnUse" width="14" height="14"><rect width="14" height="14" fill="#16303a"/><path d="M7 2L12 7L7 12L2 7Z" fill="none" stroke="#c4a052" stroke-opacity=".32" stroke-width=".8"/><circle cx="0" cy="0" r="1.1" fill="#c4a052" fill-opacity=".35"/><circle cx="14" cy="14" r="1.1" fill="#c4a052" fill-opacity=".35"/></pattern>
    <linearGradient id="q-peak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b5671"/><stop offset=".36" stop-color="#2b7c8c"/><stop offset=".7" stop-color="#5ca288"/><stop offset="1" stop-color="#e2d8b4"/></linearGradient>
    <linearGradient id="q-peak-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b7e9c"/><stop offset=".5" stop-color="#6cab9c"/><stop offset="1" stop-color="#e4dab8"/></linearGradient>
    <linearGradient id="q-hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b9f80"/><stop offset=".55" stop-color="#a9c393"/><stop offset="1" stop-color="#e4dab8"/></linearGradient>
    <linearGradient id="q-lit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="q-mist"><stop offset="0" stop-color="#f6f0dc" stop-opacity=".95"/><stop offset="1" stop-color="#f6f0dc" stop-opacity="0"/></radialGradient>
    <linearGradient id="q-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7482"/><stop offset="1" stop-color="#1c4c58"/></linearGradient>
    <linearGradient id="q-backdrop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14262e"/><stop offset="1" stop-color="#0b161b"/></linearGradient>
    <clipPath id="q-portrait"><circle r="12.2"/></clipPath>
  </defs>`;
}

/** 탁자(남색 옻칠) + 비단 두루마리: 장황(비단 테두리) · 금선 두 줄 · 구름 모서리. */
export function qSheet(x0, y0, x1, y1, size, full) {
  const box = (inset) => `x="${fmt(x0 + inset)}" y="${fmt(y0 + inset)}" width="${fmt(x1 - x0 - inset * 2)}" height="${fmt(y1 - y0 - inset * 2)}"`;
  const b = size * 0.62;
  const corner = (x, y, sx, sy) => `<path class="q-corner" transform="translate(${fmt(x)} ${fmt(y)}) scale(${sx} ${sy})" d="M0 22V8C0 3 3 0 8 0H22M6 22V12C6 8 8 6 12 6H22M12 16C12 13 13 12 16 12"/>`;
  const ix0 = x0 + b, iy0 = y0 + b, ix1 = x1 - b, iy1 = y1 - b;
  return `<g class="mr-backdrop q-backdrop"><rect ${full} fill="url(#q-backdrop)"/></g>` +
    `<g class="mr-sheet q-sheet"><rect class="shade" ${box(-8)} filter="url(#mr-cloud)"/><rect class="brocade" ${box(-b * 0.15)} fill="url(#q-brocade)"/>` +
    `<rect class="gold-out" ${box(-b * 0.15)}/><rect class="silk" ${box(b)} fill="url(#q-silk)"/><rect class="tint" ${box(b)}/>` +
    `<rect class="frame" ${box(b + size * 0.22)}/><rect class="frame-in" ${box(b + size * 0.34)}/>` +
    corner(ix0 + size * 0.5, iy0 + size * 0.5, 1, 1) + corner(ix1 - size * 0.5, iy0 + size * 0.5, -1, 1) +
    corner(ix0 + size * 0.5, iy1 - size * 0.5, 1, -1) + corner(ix1 - size * 0.5, iy1 - size * 0.5, -1, -1) + `</g>`;
}

// 매끈한 곡선: 점들을 지나는 Catmull-Rom → 3차 베지어
function spline(pts, close = false) {
  const P = close ? pts : [pts[0], ...pts, pts.at(-1)];
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += `C${fmt(p1[0] + (p2[0] - p0[0]) / 6)} ${fmt(p1[1] + (p2[1] - p0[1]) / 6)} ${fmt(p2[0] - (p3[0] - p1[0]) / 6)} ${fmt(p2[1] - (p3[1] - p1[1]) / 6)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}
// 봉우리(석산): 어깨가 있는 능선 + 금선 윤곽 + 안쪽 주름(준법) + 빛 받는 왼쪽 면
function peak(x, y, W, H, r, back) {
  const j = () => r() - 0.5, sx = j() * 0.14;
  const rel = [[-1, 0], [-0.78 + j() * 0.06, 0.17 + j() * 0.06], [-0.56 + j() * 0.08, 0.38 + j() * 0.1], [-0.42 + j() * 0.06, 0.43 + j() * 0.08],
    [-0.2 + j() * 0.05, 0.74 + j() * 0.08], [sx, 1], [0.17 + j() * 0.05, 0.8 + j() * 0.08], [0.34 + j() * 0.06, 0.53 + j() * 0.1],
    [0.53 + j() * 0.06, 0.45 + j() * 0.08], [0.75 + j() * 0.05, 0.19 + j() * 0.06], [1, 0]];
  const A = ([px, py]) => [x + px * W, y - py * H];
  const outline = spline(rel.map(A));
  const fold1 = [[sx - 0.04, 0.92], [-0.16, 0.6], [-0.27, 0.3], [-0.33, 0.04]].map(A);
  const fold2 = [[sx + 0.12, 0.8], [0.24, 0.48], [0.22, 0.14]].map(A);
  const fold3 = [rel[3], [-0.52, 0.2], [-0.6, 0.03]].map(A);
  const lit = spline(rel.slice(0, 6).map(A)) + 'L' + [...fold1].reverse().map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z';
  return `<g class="q-peak${back ? ' back' : ''}"><ellipse class="q-mist" cx="${fmt(x)}" cy="${fmt(y - 1)}" rx="${fmt(W * 1.05)}" ry="${fmt(Math.max(3, H * 0.13))}" fill="url(#q-mist)"/>` +
    `<path class="body" d="${outline}Z" fill="url(#${back ? 'q-peak-b' : 'q-peak'})"/><path class="lit" d="${lit}" fill="url(#q-lit)"/>` +
    `<path class="cun" d="${spline(fold2)}${spline(fold3)}"/><path class="gilt" d="${spline(fold1)}"/><path class="ridge" d="${outline}"/></g>`;
}
// 언덕(토산): 둥근 등 두 개
function mound(x, y, W, H, r) {
  const j = () => r() - 0.5;
  const rel = [[-1, 0], [-0.72, 0.5 + j() * 0.1], [-0.36, 0.92 + j() * 0.08], [-0.04, 0.76 + j() * 0.08], [0.3, 0.96 + j() * 0.06], [0.68, 0.52 + j() * 0.1], [1, 0]];
  const d = spline(rel.map(([px, py]) => [x + px * W, y - py * H]));
  return `<g class="q-hill"><ellipse class="q-mist" cx="${fmt(x)}" cy="${fmt(y)}" rx="${fmt(W)}" ry="2.5" fill="url(#q-mist)"/><path class="body" d="${d}Z" fill="url(#q-hill)"/><path class="ridge" d="${d}"/></g>`;
}
// 산허리를 가로지르는 흰 구름 띠
function wisp(x, y, w) {
  return `<path class="q-wisp" d="M${fmt(x - w)} ${fmt(y)}C${fmt(x - w * 0.6)} ${fmt(y - 4)} ${fmt(x - w * 0.2)} ${fmt(y - 2)} ${fmt(x + w * 0.1)} ${fmt(y - 4)}C${fmt(x + w * 0.45)} ${fmt(y - 6)} ${fmt(x + w * 0.8)} ${fmt(y - 2)} ${fmt(x + w)} ${fmt(y)}C${fmt(x + w * 0.5)} ${fmt(y + 2.5)} ${fmt(x - w * 0.5)} ${fmt(y + 2.5)} ${fmt(x - w)} ${fmt(y)}Z"/>`;
}
function tree(x, y, r, s) {
  if (r() < 0.32) { // 소나무: 납작한 가지 층 셋
    return `<g class="q-tree pine"><path class="trunk" d="M${fmt(x)} ${fmt(y)}V${fmt(y - 13 * s)}"/>` +
      [[5, 6.2, 1.9], [8.6, 5, 1.7], [11.8, 3.6, 1.4]].map(([dy, rx, ry]) => `<ellipse class="layer" cx="${fmt(x)}" cy="${fmt(y - dy * s)}" rx="${fmt(rx * s)}" ry="${fmt(ry * s)}"/>`).join('') + `</g>`;
  }
  const cr = (4.6 + r() * 1.4) * s;
  return `<g class="q-tree"><path class="trunk" d="M${fmt(x)} ${fmt(y)}V${fmt(y - 6 * s)}"/><circle class="crown" cx="${fmt(x)}" cy="${fmt(y - 6 * s - cr * 0.6)}" r="${fmt(cr)}"/>` +
    `<circle class="hi" cx="${fmt(x - cr * 0.32)}" cy="${fmt(y - 6 * s - cr * 0.9)}" r="${fmt(cr * 0.48)}"/>` +
    `<circle class="dot" cx="${fmt(x + cr * 0.3)}" cy="${fmt(y - 6 * s - cr * 0.4)}" r="${fmt(cr * 0.16)}"/><circle class="dot" cx="${fmt(x - cr * 0.1)}" cy="${fmt(y - 6 * s - cr * 0.2)}" r="${fmt(cr * 0.14)}"/></g>`;
}

/** 지형 장식: 칸마다 봉우리·둔덕·나무를 그리고 앞(아래) 것이 뒤를 덮게 y 순으로 쌓는다. */
export function qTerrain(tiles, layout) {
  const size = layout.size, tilt = layout.tilt ?? 1, items = [];
  const kind = new Map(tiles.map((t) => [`${t.q},${t.r}`, t.terrain]));
  const inner = (t) => [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].every(([dq, dr]) => kind.get(`${t.q + dq},${t.r + dr}`) === 'mountain');
  for (const t of tiles) {
    if (!['mountain', 'hill', 'forest'].includes(t.terrain)) continue;
    const c = hexCenter(t, layout), r = rng(t.q, t.r, 7), y0 = c.y + size * tilt * 0.42;
    if (t.terrain === 'mountain') {
      const side = r() < 0.5 ? -1 : 1, deep = inner(t), big = r();
      // 산맥 안쪽은 크게 하나(가끔 아주 높게), 가장자리는 낮은 봉우리를 곁들여 산자락을 만든다
      if (!deep && r() < 0.55) items.push([y0 - size * 0.2, peak(c.x + side * size * 0.42, y0 - size * 0.2, size * (0.36 + r() * 0.12), size * (0.55 + r() * 0.25), r, true)]);
      const H = size * (deep ? (big < 0.22 ? 1.6 : 1.05 + r() * 0.3) : 0.82 + r() * 0.36), W = size * (0.56 + r() * 0.24);
      const px = c.x + (r() - 0.5) * size * 0.3;
      items.push([y0, peak(px, y0, W, H, r, false)]);
      if (!deep && r() < 0.35) items.push([y0 + size * 0.12, peak(c.x - side * size * 0.44, y0 + size * 0.12, size * 0.32, size * (0.4 + r() * 0.14), r, false)]);
      if (r() < 0.4) for (const k of [-1, 1]) if (r() < 0.7) { const tx = px + k * W * (0.55 + r() * 0.2), ty = y0 - size * 0.02; items.push([ty + 0.5, tree(tx, ty, () => 0.1, 0.62 + r() * 0.15)]); }
      if (deep && r() < 0.22) items.push([y0 + 1, wisp(px, y0 - H * 0.32, size * 0.95)]);
    } else if (t.terrain === 'hill') {
      items.push([y0 - size * 0.12, mound(c.x + size * 0.28, y0 - size * 0.12, size * 0.46, size * (0.34 + r() * 0.1), r)]);
      items.push([y0, mound(c.x - size * 0.22, y0, size * 0.52, size * (0.4 + r() * 0.12), r)]);
    } else {
      const n = 5 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.8, d = 0.25 + r() * 0.42;
        const x = c.x + Math.cos(a) * size * d * 0.8, y = c.y + Math.sin(a) * size * d * tilt * 0.75 + size * 0.22;
        items.push([y, tree(x, y, r, 0.9 + r() * 0.35)]);
      }
    }
  }
  items.sort((a, b) => a[0] - b[0]);
  return `<g class="q-terrain">${items.map((i) => i[1]).join('')}</g>`;
}

// ── 성: 7칸 성곽을 흙벽(앞면·윗면)으로 세우고 성문 누각·모서리 망루·궁전·민가를 얹는다 ──
function hall(x, y, s, cls = 'q-palace') {
  // 2단 기단 · 흰 벽 · 붉은 기둥 · 겹처마(위로 들린 처마끝) · 금 용마루
  const cols = Array.from({length: 5}, (_, i) => `<rect class="col" x="${fmt(x - s * 0.46 + i * s * 0.225)}" y="${fmt(y - s * 0.6)}" width="${fmt(s * 0.05)}" height="${fmt(s * 0.3)}"/>`).join('');
  const roof = (w, top, h, curl) => `M${fmt(x - w - curl)} ${fmt(top + h * 0.15)}Q${fmt(x - w)} ${fmt(top + h * 0.35)} ${fmt(x - w * 0.82)} ${fmt(top - h * 0.05)}L${fmt(x - w * 0.5)} ${fmt(top - h)}H${fmt(x + w * 0.5)}L${fmt(x + w * 0.82)} ${fmt(top - h * 0.05)}Q${fmt(x + w)} ${fmt(top + h * 0.35)} ${fmt(x + w + curl)} ${fmt(top + h * 0.15)}Q${fmt(x)} ${fmt(top + h * 0.02)} ${fmt(x - w - curl)} ${fmt(top + h * 0.15)}Z`;
  const tiles = (w, top, h) => Array.from({length: 7}, (_, i) => { const k = (i + 1) / 8, bx = x - w * 0.88 + w * 1.76 * k, tx2 = x - w * 0.5 + w * k; return `M${fmt(tx2)} ${fmt(top - h)}L${fmt(bx)} ${fmt(top)}`; }).join('');
  return `<g class="${cls}">` +
    `<rect class="base2" x="${fmt(x - s * 0.74)}" y="${fmt(y - s * 0.16)}" width="${fmt(s * 1.48)}" height="${fmt(s * 0.16)}"/>` +
    `<rect class="base" x="${fmt(x - s * 0.62)}" y="${fmt(y - s * 0.3)}" width="${fmt(s * 1.24)}" height="${fmt(s * 0.15)}"/>` +
    `<rect class="wall" x="${fmt(x - s * 0.5)}" y="${fmt(y - s * 0.62)}" width="${fmt(s)}" height="${fmt(s * 0.33)}"/>${cols}` +
    `<rect class="door" x="${fmt(x - s * 0.08)}" y="${fmt(y - s * 0.5)}" width="${fmt(s * 0.16)}" height="${fmt(s * 0.2)}"/>` +
    `<path class="roof" d="${roof(s * 0.62, y - s * 0.58, s * 0.2, s * 0.1)}"/><path class="tiles" d="${tiles(s * 0.62, y - s * 0.58, s * 0.2)}"/>` +
    `<rect class="wall up" x="${fmt(x - s * 0.32)}" y="${fmt(y - s * 0.92)}" width="${fmt(s * 0.64)}" height="${fmt(s * 0.16)}"/>` +
    `<path class="roof up" d="${roof(s * 0.48, y - s * 0.88, s * 0.24, s * 0.09)}"/><path class="tiles" d="${tiles(s * 0.48, y - s * 0.88, s * 0.24)}"/>` +
    `<path class="ridge" d="M${fmt(x - s * 0.25)} ${fmt(y - s * 1.12)}H${fmt(x + s * 0.25)}"/>` +
    `<path class="ornament" d="M${fmt(x - s * 0.27)} ${fmt(y - s * 1.12)}q-2 -4 1 -5M${fmt(x + s * 0.27)} ${fmt(y - s * 1.12)}q2 -4 -1 -5"/></g>`;
}
function house(x, y, s) {
  return `<g class="q-house"><rect class="wall" x="${fmt(x - s * 0.45)}" y="${fmt(y - s * 0.32)}" width="${fmt(s * 0.9)}" height="${fmt(s * 0.32)}"/>` +
    `<path class="roof" d="M${fmt(x - s * 0.62)} ${fmt(y - s * 0.28)}L${fmt(x - s * 0.36)} ${fmt(y - s * 0.62)}H${fmt(x + s * 0.36)}L${fmt(x + s * 0.62)} ${fmt(y - s * 0.28)}Z"/></g>`;
}
function tower(x, y, h) {
  return `<g class="q-tower"><rect class="face" x="${fmt(x - 4.5)}" y="${fmt(y - h - 5)}" width="9" height="${fmt(h + 5)}"/><rect class="top" x="${fmt(x - 5.5)}" y="${fmt(y - h - 7)}" width="11" height="3"/>` +
    `<path class="roof" d="M${fmt(x - 7.5)} ${fmt(y - h - 6.5)}Q${fmt(x - 4)} ${fmt(y - h - 8)} ${fmt(x - 3)} ${fmt(y - h - 12)}H${fmt(x + 3)}Q${fmt(x + 4)} ${fmt(y - h - 8)} ${fmt(x + 7.5)} ${fmt(y - h - 6.5)}Z"/></g>`;
}
function gatehouse(x, y, h, lost) {
  return `<g class="q-gatehouse${lost ? ' lost' : ''}"><rect class="face" x="${fmt(x - 10)}" y="${fmt(y - h - 3)}" width="20" height="${fmt(h + 3)}"/>` +
    `<path class="arch" d="M${fmt(x - 3.6)} ${fmt(y)}V${fmt(y - h * 0.5)}A3.6 3.6 0 0 1 ${fmt(x + 3.6)} ${fmt(y - h * 0.5)}V${fmt(y)}Z"/>` +
    `<rect class="pav" x="${fmt(x - 7)}" y="${fmt(y - h - 9)}" width="14" height="6"/><rect class="col" x="${fmt(x - 6)}" y="${fmt(y - h - 9)}" width="1.6" height="6"/><rect class="col" x="${fmt(x + 4.4)}" y="${fmt(y - h - 9)}" width="1.6" height="6"/>` +
    `<path class="roof" d="M${fmt(x - 13)} ${fmt(y - h - 8)}Q${fmt(x - 8)} ${fmt(y - h - 9)} ${fmt(x - 6)} ${fmt(y - h - 15)}H${fmt(x + 6)}Q${fmt(x + 8)} ${fmt(y - h - 9)} ${fmt(x + 13)} ${fmt(y - h - 8)}Z"/>` +
    (lost ? `<g class="breach" transform="translate(${fmt(x)} ${fmt(y - h * 0.4)})"><path d="M-6 -6L6 6M6 -6L-6 6"/></g>` : '') + `</g>`;
}

/** 성곽 전체. cells: [{q,r,role:'CENTER'|'WALL'|'RAMPART', gate?, held?}] */
export function qCastle(cells, {layout, factionColor = '#7d7a6a', besieged = false, occupied = false, minor = false} = {}) {
  const size = layout.size;
  const rings = outlineRings(cells, layout);
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0] ?? []);
  if (!ring.length) return '';
  const center = cells.find((t) => t.role === 'CENTER') ?? cells[0];
  const c0 = hexCenter(center, layout);
  const h = size * (minor ? 0.26 : 0.36), t = size * (minor ? 0.13 : 0.17);
  const cx = ring.reduce((n, p) => n + p.x, 0) / ring.length, cy = ring.reduce((n, p) => n + p.y, 0) / ring.length;
  const edges = ring.map((p, i) => { const q = ring[(i + 1) % ring.length], dx = q.x - p.x, dy = q.y - p.y, m = {x: (p.x + q.x) / 2, y: (p.y + q.y) / 2}; let n = {x: dy, y: -dx}; const len = Math.hypot(n.x, n.y) || 1; n = {x: n.x / len, y: n.y / len}; if (n.x * (m.x - cx) + n.y * (m.y - cy) < 0) n = {x: -n.x, y: -n.y}; return {p, q, m, n}; });
  const quad = (e, cls) => `<path class="${cls}" d="M${fmt(e.p.x)} ${fmt(e.p.y)}L${fmt(e.q.x)} ${fmt(e.q.y)}L${fmt(e.q.x)} ${fmt(e.q.y - h)}L${fmt(e.p.x)} ${fmt(e.p.y - h)}Z"/>`;
  const top = (list) => `<path class="wall-top" d="${list.map((e) => `M${fmt(e.p.x)} ${fmt(e.p.y - h)}L${fmt(e.q.x)} ${fmt(e.q.y - h)}`).join('')}" style="stroke-width:${fmt(t)}"/>` +
    `<path class="crenel" d="${list.map((e) => `M${fmt(e.p.x + e.n.x * t * 0.45)} ${fmt(e.p.y - h - 1.4 + e.n.y * t * 0.45)}L${fmt(e.q.x + e.n.x * t * 0.45)} ${fmt(e.q.y - h - 1.4 + e.n.y * t * 0.45)}`).join('')}"/>`;
  const back = edges.filter((e) => e.n.y <= 0.05), front = edges.filter((e) => e.n.y > 0.05);
  // 성문 자리: 성문 칸 중심에서 바깥쪽으로 가장 가까운 성벽 변 가운데
  const gates = cells.filter((c) => c.gate).map((g) => { const gc = hexCenter(g, layout), dx = gc.x - c0.x, dy = gc.y - c0.y, d = Math.hypot(dx, dy) || 1, aim = {x: gc.x + dx / d * size * 0.8, y: gc.y + dy / d * size * 0.8}; const e = edges.reduce((a, b) => (Math.hypot(b.m.x - aim.x, b.m.y - aim.y) < Math.hypot(a.m.x - aim.x, a.m.y - aim.y) ? b : a)); return {e, lost: g.held === 'ENEMY'}; });
  const gateEdges = new Set(gates.map((g) => g.e));
  const towerPts = ring.filter((_, i) => i % 3 === 0).filter((p) => !gates.some((g) => Math.hypot(g.e.m.x - p.x, g.e.m.y - p.y) < size * 0.45));
  // 안쪽 건물: 궁전(중심) + 성곽 칸마다 민가 둘(성문 칸 제외는 하지 않음 — 성문 누각은 벽 위에 선다)
  const bld = [[c0.y + size * 0.18, hall(c0.x, c0.y + size * 0.18, size * (minor ? 0.82 : 1.12))]];
  if (!minor) for (const cell of cells.filter((c) => c.role !== 'CENTER')) {
    const cc = hexCenter(cell, layout), r = rng(cell.q, cell.r, 3);
    for (const k of [-1, 1]) bld.push([cc.y + k * size * 0.08 + size * 0.05, house(cc.x + k * size * 0.26 + (r() - 0.5) * 4, cc.y + k * size * 0.08 + size * 0.05, size * (0.36 + r() * 0.1))]);
  }
  bld.push([c0.y + size * 0.2, `<g class="q-banners" style="--fc:${factionColor}"><path class="pole" d="M${fmt(c0.x - size * 0.78)} ${fmt(c0.y + size * 0.2)}V${fmt(c0.y - size * 0.95)}M${fmt(c0.x + size * 0.78)} ${fmt(c0.y + size * 0.2)}V${fmt(c0.y - size * 0.95)}"/>` +
    `<path class="flag" d="M${fmt(c0.x - size * 0.78)} ${fmt(c0.y - size * 0.95)}l12 3l-12 5ZM${fmt(c0.x + size * 0.78)} ${fmt(c0.y - size * 0.95)}l12 3l-12 5Z"/></g>`]);
  bld.sort((a, b) => a[0] - b[0]);
  const backTowers = towerPts.filter((p) => p.y <= cy), frontTowers = towerPts.filter((p) => p.y > cy);
  const backGates = gates.filter((g) => g.e.n.y <= 0.05), frontGates = gates.filter((g) => g.e.n.y > 0.05);
  const court = `M${ring.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')}Z`;
  const smoke = besieged ? `<g class="q-smoke">${[[-0.5, -1.4], [0.35, -1.7], [0.9, -1.2]].map(([dx, dy], i) => `<circle cx="${fmt(c0.x + dx * size)}" cy="${fmt(c0.y + dy * size)}" r="${fmt(size * (0.22 + i * 0.05))}" style="animation-delay:${i * -0.7}s"/>`).join('')}</g>` : '';
  return `<g class="sg-city-walls q-castle${minor ? ' minor' : ''}${besieged ? ' besieged' : ''}${occupied ? ' occupied' : ''}" style="--fc:${factionColor}">` +
    `<path class="court-shadow" d="${court}" transform="translate(0 3)"/><path class="court" d="${court}"/>` +
    back.map((e) => quad(e, 'inner')).join('') + top(back) + backTowers.map((p) => tower(p.x, p.y, h)).join('') + backGates.map((g) => gatehouse(g.e.m.x, g.e.m.y, h, g.lost)).join('') +
    bld.map((b) => b[1]).join('') +
    front.map((e) => quad(e, `outer${e.n.x < -0.2 ? ' lit' : e.n.x > 0.2 ? ' shade' : ''}${gateEdges.has(e) ? ' gate-wall' : ''}`)).join('') + top(front) +
    frontTowers.map((p) => tower(p.x, p.y, h)).join('') + frontGates.map((g) => gatehouse(g.e.m.x, g.e.m.y, h, g.lost)).join('') + smoke + `</g>`;
}

export const FAC_GLYPH = {farm: '田', granary: '倉', market: '市', barracks: '營', workshop: '工', tuntian: '屯', clinic: '醫', mufu: '府', naval: '船'};

/** 시설: 한자 인장 메달 + 이름. */
export function qFacility(f, c, name, size) {
  return `<g class="mr-facility q-fac${f.disabled ? ' disabled' : ''}" transform="translate(${fmt(c.x)} ${fmt(c.y)})">` +
    `<ellipse class="foot" cx="0" cy="${fmt(size * 0.32)}" rx="${fmt(size * 0.42)}" ry="${fmt(size * 0.14)}"/>` +
    `<g transform="translate(0 ${fmt(-size * 0.12)})"><circle class="ring" r="12.5"/><circle class="disc" r="10.5"/><text class="glyph" y="4.6">${FAC_GLYPH[f.kind] ?? '府'}</text></g>` +
    `<text y="${fmt(size * 0.72)}">${esc(name)}</text></g>`;
}

/** 부대 얼굴 핀: 초상 원 · 병력 고리(둘레) · 이름·병력 띠. 기존 클래스(bg·name·count·bar·bar-bg·bar-lost·badge)를 그대로 단다. */
export function qPlate(u, {base, ratio, prevRatio, formation, badge, statusBadges}) {
  const R = 15.6, C = 2 * Math.PI * R;
  const portrait = u.portrait
    ? `<g clip-path="url(#q-portrait)"><image href="${base}${u.portrait}" x="-22" y="-11" width="44" height="66" preserveAspectRatio="xMidYMin meet"/></g>`
    : `<text class="initial" y="4.5">${esc((u.name ?? '?').slice(0, 1))}</text>`;
  const count = Number.isFinite(u.count) ? Number(u.count).toLocaleString('ko-KR') : String(u.count ?? '—');
  const w = Math.max(40, String(u.name ?? '').length * 9 + count.length * 5.4 + 12);
  const arc = (from, to, cls) => `<circle class="${cls}" r="${R}" transform="rotate(-90)" stroke-dasharray="${fmt(C * Math.max(0, to - from))} ${fmt(C)}" stroke-dashoffset="${fmt(-C * from)}"/>`;
  return `<g transform="translate(-14 0)"><g class="tag"><rect class="tag-bg" x="6" y="-7.6" width="${fmt(w + 10)}" height="15.2" rx="2"/>` +
    `<text class="name" x="${fmt(19)}" y="3.3">${esc(u.name)}<tspan class="count" dx="3">${count}</tspan></text></g>` +
    `<circle class="bar-bg" r="${R}"/>${prevRatio > ratio ? arc(ratio, prevRatio, 'bar-lost') : ''}${arc(0, ratio, 'bar')}` +
    `<circle class="bg" r="13.2"/>${formation ? `<circle class="fm" r="13.2"/>` : ''}<g class="face">${portrait}</g><circle class="rim" r="12.4"/>` +
    (badge ? `<g class="badge ${badge[0]}" transform="translate(16 -15)"><rect x="-12" y="-6.5" width="24" height="13" rx="2"/><text y="3">${badge[1]}</text></g>` : '') +
    statusBadges.map(([k, label], i) => `<g class="badge st-${k}" transform="translate(${-16 + i * 25} -17)"><rect x="-12" y="-6.5" width="24" height="13" rx="2"/><text y="3">${label}</text></g>`).join('') + `</g>`;
}
