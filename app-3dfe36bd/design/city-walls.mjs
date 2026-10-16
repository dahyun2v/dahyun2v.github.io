// 성 여러 칸을 하나의 성곽으로 그리는 순수 함수 (Claude, 2026-10-03)
// 지도 좌표는 map-campaign-trial 과 같다: 꼭짓점이 위인 육각형, 크기 24,
// 중심 x = ox + 24√3·(q + r/2), y = oy + 36·r.
// 반환값은 SVG 문자열 조각만 만든다 — DOM·게임 상태를 건드리지 않는다.

const SQRT3 = Math.sqrt(3);

// tilt: 바닥을 비스듬히 본 시점(문명식)으로 세로를 눌러 그리는 비율. 1이면 위에서 똑바로 본 지도.
export function hexCenter({q, r}, {size = 24, ox = 28, oy = 28, tilt = 1} = {}) {
  return {x: ox + size * SQRT3 * (q + r / 2), y: oy + size * 1.5 * r * tilt};
}

function corners(center, size, tilt = 1) {
  // 꼭짓점이 위: -90°에서 시작해 60°씩. tilt 로 세로를 누른다.
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    out.push({x: center.x + size * Math.cos(a), y: center.y + size * Math.sin(a) * tilt});
  }
  return out;
}

const key = (p) => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;

/** 여러 칸의 바깥 테두리(겹치는 변 제거)를 꼭짓점 순서대로 돌려준다. 칸이 붙어 있지 않으면 고리가 여러 개. */
export function outlineRings(tiles, layout = {}) {
  const size = layout.size ?? 24;
  const edges = new Map();
  for (const t of tiles) {
    const c = corners(hexCenter(t, layout), size, layout.tilt ?? 1);
    for (let i = 0; i < 6; i++) {
      const a = c[i], b = c[(i + 1) % 6];
      const k = [key(a), key(b)].sort().join('|');
      if (edges.has(k)) edges.delete(k); else edges.set(k, [a, b]);
    }
  }
  const next = new Map();
  for (const [a, b] of edges.values()) {
    (next.get(key(a)) ?? next.set(key(a), []).get(key(a))).push(b);
    (next.get(key(b)) ?? next.set(key(b), []).get(key(b))).push(a);
  }
  const seen = new Set(), rings = [];
  for (const [a] of edges.values()) {
    if (seen.has(key(a))) continue;
    const ring = [a];
    seen.add(key(a));
    let prev = null, cur = a;
    for (;;) {
      const cand = (next.get(key(cur)) ?? []).filter((p) => !prev || key(p) !== key(prev));
      const nxt = cand.find((p) => !seen.has(key(p))) ?? null;
      if (!nxt) break;
      ring.push(nxt); seen.add(key(nxt)); prev = cur; cur = nxt;
    }
    rings.push(ring);
  }
  return rings;
}

const fmt = (n) => Math.round(n * 10) / 10;

/**
 * 성곽 SVG 조각.
 * tiles: [{q,r,role:'CENTER'|'WALL', held?:'OWN'|'ENEMY'}]
 * opts: {factionColor, besieged, occupied, layout}
 */
export function cityWallsSvg(tiles, {factionColor = '#7d7a6a', besieged = false, occupied = false, layout = {}, art = null, artScale = 1.18} = {}) {
  const rings = outlineRings(tiles, layout);
  const d = rings.map((ring) => 'M' + ring.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L') + 'Z').join('');
  const cls = ['sg-city-walls', besieged ? 'besieged' : '', occupied ? 'occupied' : ''].filter(Boolean).join(' ');
  const towers = rings.flat().map((p) => `<rect class="tower" x="${fmt(p.x - 3.5)}" y="${fmt(p.y - 3.5)}" width="7" height="7" rx="1"/>`).join('');
  const lost = tiles.filter((t) => t.role === 'WALL' && t.held === 'ENEMY').map((t) => {
    const c = hexCenter(t, layout);
    return `<g class="breach" transform="translate(${fmt(c.x)} ${fmt(c.y)})"><path d="M-7 -7L7 7M7 -7L-7 7"/></g>`;
  }).join('');
  const center = tiles.find((t) => t.role === 'CENTER');
  const keep = center ? (() => { const c = hexCenter(center, layout); return `<g class="keep" transform="translate(${fmt(c.x)} ${fmt(c.y)})"><path d="M-9 6V-3L0 -9L9 -3V6Z"/><path d="M-3 6V1H3V6"/></g>`; })() : '';
  if (art) {
    // GPT 제작 성 그림(walled_city_v1.png, 1536×1024 투명 배경 아이소메트릭)을 성 전체 칸 위에 한 장으로 얹는다.
    const pts = rings.flat();
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    let img;
    if (typeof art === 'object' && art.fit) {
      // 칸에 맞춰 만든 그림: 그림 속 7칸 테두리 상자(fit.flowerBox)를 지도 위 7칸 테두리 상자에 정확히 맞춘다.
      const [fx, fy, fw] = art.fit.flowerBox, k = (maxX - minX) / fw;
      img = `<image class="art" href="${art.src}" x="${fmt(minX - fx * k)}" y="${fmt(minY - fy * k)}" width="${fmt(art.fit.image[0] * k)}" height="${fmt(art.fit.image[1] * k)}"/>`;
    } else {
      const w = (maxX - minX) * artScale, h = w * (1024 / 1536);
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      img = `<image class="art" href="${art}" x="${fmt(cx - w / 2)}" y="${fmt(cy - h / 2 - h * 0.06)}" width="${fmt(w)}" height="${fmt(h)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    let fx = '';
    if (besieged || occupied) {
      // 성 상자 안 고정 위치 3곳에 연기 기둥과 불꽃 — CSS 애니메이션(sg-ui.css .siege-fx)
      const spots = [[0.32, 0.38], [0.58, 0.3], [0.7, 0.52]];
      fx = `<g class="siege-fx">${spots.map(([fxr, fyr], i) => {
        const x = minX + (maxX - minX) * fxr, y = minY + (maxY - minY) * fyr;
        return `<g transform="translate(${fmt(x)} ${fmt(y)})" style="--d:${i * 0.7}s">${besieged ? '<ellipse class="fire" rx="5" ry="3.5"/>' : ''}<circle class="smoke s1" r="6"/><circle class="smoke s2" r="8"/><circle class="smoke s3" r="10"/></g>`;
      }).join('')}</g>`;
    }
    return `<g class="${cls} with-art" style="--wall:${factionColor}"><path class="ground" d="${d}"/><path class="footprint" d="${d}"/>${img}${fx}${lost}</g>`;
  }
  return `<g class="${cls}" style="--wall:${factionColor}"><path class="ground" d="${d}"/><path class="wall" d="${d}"/>${towers}${keep}${lost}</g>`;
}

/** 포위 판정용 도우미: 성곽 칸 중 적이 점거한 수와 함락 가능 여부(시험 규칙: 성곽 전부 + 중심 수비 소멸). */
export function siegeStatus(tiles) {
  const walls = tiles.filter((t) => t.role === 'WALL');
  const lost = walls.filter((t) => t.held === 'ENEMY').length;
  return {walls: walls.length, lost, besieged: lost > 0, breachComplete: walls.length > 0 && lost === walls.length};
}

/** 성 둘레(성 칸에 붙은 바깥 칸) 목록. 시설·농지를 놓을 후보 칸. */
export function ringAround(tiles) {
  const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const inside = new Set(tiles.map((t) => `${t.q},${t.r}`)), out = new Map();
  for (const t of tiles) for (const [dq, dr] of dirs) {
    const k = `${t.q + dq},${t.r + dr}`;
    if (!inside.has(k) && !out.has(k)) out.set(k, {q: t.q + dq, r: t.r + dr});
  }
  return [...out.values()];
}

/** 시설 그림 한 칸 (farm/granary/market/barracks, 1536×1024 투명 아이소메트릭). disabled = 적 점거로 정지. */
export function facilitySvg(tile, href, {layout = {}, label = '', disabled = false, scale = 1.55} = {}) {
  const size = layout.size ?? 24, c = hexCenter(tile, layout);
  const w = size * Math.sqrt(3) * scale, h = w * (1024 / 1536);
  const tag = label ? `<text class="label" y="${fmt(size * 0.95)}" text-anchor="middle">${label}</text>` : '';
  return `<g class="sg-facility${disabled ? ' disabled' : ''}" transform="translate(${fmt(c.x)} ${fmt(c.y)})"><image href="${href}" x="${fmt(-w / 2)}" y="${fmt(-h / 2 - size * 0.1)}" width="${fmt(w)}" height="${fmt(h)}"/>${tag}</g>`;
}
