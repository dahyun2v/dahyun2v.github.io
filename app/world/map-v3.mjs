import {troopText} from '../../src/troop-display.mjs';
// 천하재결 지도 렌더러 v3 (Claude, 2026-10-08) — 옛 map-render.mjs 를 쓰지 않고 새로 짠다.
// 입력: campaignMapModel(view) 모델. 출력: SVG 문자열. 클릭은 data-tile / data-unit / data-city / data-prod-city / data-place.
// 층(아래→위): 땅(그린 지도 한 장, 없으면 지형 색) · 강(그림 속 강과 같은 곡선, 판정용 가는 선) · 길 · 영역 · 칸 · 안개
//            · 이동/공격 칸 · 경로 · 클릭 칸 · 시설 · 탐험지 · 성(미니어처) · 부대(무리 그림 + 장수 깃발판) · 이름판 · 효과
import {hexCenter, outlineRings} from '../design/city-walls.mjs';
import {troopLayout,troopPlateY,sampleTroop} from './troops.mjs';
import {headOf} from './hud-ink.mjs';
import supplyRules from '../../../docs/design-data/supply-v0.1.json' with {type:'json'};
import paintedWater from '../../assets/ui-v3/dots-1016/facilities/painted-water.json' with {type:'json'};

const SQRT3 = Math.sqrt(3), TILT = 0.62;
const f = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// 깃발판 얼굴: 머리만 잘라 둔 그림(bust/<ID>.webp — tools/design/bust-crops.py, 그림마다 잰 머리 상자)을 창(28×34)에 채운다.
// 전신 그림을 크게 놓고 clip-path 로 자르면 그림 전체가 부대 묶음의 상자(getBoundingClientRect)에 잡혀 화면 따라가기·작은 지도 점·자동 점검 클릭이 어긋난다.
function faceImage(src, clip = 'w-face') {
  const m = /\/officer-art\/cutout\/(G\d{2,3})[-.]/.exec(String(src ?? ''));
  if (m) return `<image href="/assets/officer-art/bust/${m[1]}.webp" x="-17" y="-17" width="34" height="34" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`;
  return `<image href="${esc(src)}" x="-26" y="-18" width="52" height="104" preserveAspectRatio="xMidYMin meet" clip-path="url(#${clip})"/>`;
}
const parse = (id) => { const [q, r] = String(id).split(',').map(Number); return {q, r}; };
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

// C153: a geometric public coverage outline; blocked routes remain in the supply readout.
export function publicSupplyTiles(tiles, cities=[], hubs=[]){
  const sources=[...cities.flatMap(c=>[c.tileId,...(c.footprint?.gates??[]),...(c.footprint?.walls??[])]),...hubs.map(h=>h.tileId)].filter(Boolean).map(parse);
  return tiles.filter(t=>sources.some(s=>hexDist(t,s)<=supplyRules.link.range));
}

export const FACTION = {
  F01: {color: '#b8433c', name: '조조', glyph: '曹'},
  F02: {color: '#4f8f73', name: '유비', glyph: '劉'},
  F03: {color: '#33709f', name: '손권', glyph: '孫'},
};
const NEUTRAL = {color: '#76776f', name: '중립', glyph: '中'};
const TROOP_GLYPH = {militia: '步', spear: '槍', bow: '弓', cavalry: '騎'};
// 지도 모델의 병종 코드(campaign-adapters troopToCampaign) → 그림·글자 이름
// engineer · mystic: 옛 초기 자료에 남은 병종 이름(엔진에서는 근접보병 · 원거리보병으로 돈다) — 그 병종의 그림으로 그린다(공병 그림은 10-13 에 지움)
const TROOP_KEY = {BT01: 'militia', BT02: 'spear', BT03: 'bow', BT04: 'cavalry', engineer: 'militia', mystic: 'bow'};
const troopKey = (u) => TROOP_KEY[u.troop] ?? u.troop;
const TERRAIN = {plain: '#5f5a47', forest: '#34432f', hill: '#6d5d42', mountain: '#47443f', water: '#24404f', unknown: '#22231f'};
const PLACE_GLYPH = {'성소': '祠', '은거지': '隱', '옛 진지': '營', '군마 산지': '馬'};
const FACILITY_GLYPH = {farm: '農', granary: '倉', market: '市', barracks: '兵', workshop: '工', tuntian: '屯', clinic: '醫', mufu: '幕', naval: '水'};
const FACILITY_NAME = {farm: '농지', granary: '곡창', market: '시장', barracks: '병영', workshop: '공방', tuntian: '둔전', clinic: '의원', mufu: '장막부', naval: '장막부'};
export const FACILITY_TONE = 'saturate(.8) brightness(.955) contrast(1.23)';
const FACILITY_FILE = {farm:'farm',granary:'granary',market:'market',workshop:'workshop',barracks:'barracks',tuntian:'tuntian',clinic:'clinic',mufu:'command-tent',naval:'command-tent'};

/** Visual placement stays within the engine tile; water tiles are never relocated to another tile. */
export function facilityPlacement(model, fc, layout, painting=null) {
  const tile=model.tiles.find(t=>`${t.q},${t.r}`===fc.tileId);
  if(!tile || ['water','river'].includes(tile.terrain??tile.terrainType))return null;
  const center=hexCenter(tile,layout), size=layout.size;
  const neighbors=model.tiles.filter(t=>hexDist(t,tile)===1&&['water','river'].includes(t.terrain??t.terrainType));
  const edges=[...(model.rivers??[]),...(model.bridges??[])].filter(e=>e.includes(fc.tileId));
  const wet=[...neighbors.map(t=>`${t.q},${t.r}`),...edges.map(e=>e.find(id=>id!==fc.tileId))];
  const normals=[...new Set(wet)].filter(Boolean).map(id=>{const p=hexCenter(parse(id),layout),dx=p.x-center.x,dy=(p.y-center.y)/TILT,d=Math.hypot(dx,dy);return {x:dx/d,y:dy/d};});
  const candidates=[{x:0,y:0},...[.10,.20,.28].flatMap(radius=>Array.from({length:12},(_,i)=>({x:Math.cos(i*Math.PI/6)*size*radius,y:Math.sin(i*Math.PI/6)*size*radius})))];
  // Conservative opaque footprint; additionally clipped to the inset ground hex when painted.
  const rx=size*.40, ry=size*.25;
  const valid=c=>[-1,1].every(sx=>[-1,1].every(sy=>{
    const x=c.x+sx*rx,y=c.y+sy*ry;
    return Math.abs(x)<=size*.75 && Math.abs(y/TILT)+Math.abs(x)/SQRT3<=size*.82 && normals.every(n=>x*n.x+y/TILT*n.y<=size*(SQRT3/2-.35));
  }));
  const charted=painting&&[paintedWater.source,...paintedWater.sameGeometry].some(name=>painting.src?.endsWith(name));
  const dry=c=>{
    if(!charted)return true;
    const [w,h]=paintedWater.size;
    // Bounds cover the delivered sheets' opaque content, including workshop roofs and smoke.
    const x0=Math.floor((center.x+c.x-size*.55-painting.x)/painting.width*w),x1=Math.ceil((center.x+c.x+size*.55-painting.x)/painting.width*w);
    const y0=Math.floor((center.y+c.y-size*.4-painting.y)/painting.height*h),y1=Math.ceil((center.y+c.y+size*.4-painting.y)/painting.height*h);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(x<0||y<0||x>=w||y>=h||paintedWater.rows[y][x]==='1')return false;
    return true;
  };
  const score=c=>normals.reduce((n,v)=>n+c.x*v.x+c.y/TILT*v.y,0);
  const at=candidates.filter(c=>valid(c)&&dry(c)).sort((a,b)=>score(a)-score(b)||Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];
  return at?{x:center.x+at.x,y:center.y+at.y,center,tileId:fc.tileId}:null;
}
const STATUS_GLYPH = {INSPIRED: '昂', SLOWED: '遲', ROOTED: '縛', CONFUSED: '惑'};

// C170 / C169b integration point: all map troop numbers use this formatter.
export const troopLabel = value => Number.isFinite(value) ? troopText(value) : '—';
export function mapHeadBox(h) {
  if(!h)return null;
  const [w,hgt]=h.size,s=Math.min(w,hgt,h.head[2]*w*1.25);
  return [Math.max(0,Math.min(w-s,h.head[0]*w-s/2)),Math.max(0,Math.min(hgt-s,h.head[1]*hgt-s/2)),s,s];
}
export function unitStatusMarks(u) {
  const marks=[],add=(kind,glyph,what,effect,recovery)=>marks.push({kind,glyph,text:`${what}\n효과 · ${effect}\n회복 · ${recovery}`});
  if(u.morale==='SHAKEN')add('SHAKEN','동','동요','공격 ×0.8','옆에 적이 없으면 차례 끝마다 한 단계 회복 또는 재정비');
  if(u.morale==='ROUTING')add('ROUTING','패','패주','명령 불가 · 매 차례 한 칸 물러남','옆에 적이 없으면 차례 끝에 동요로 회복');
  if(u.formation==='DISORDERED')add('DISORDERED','흐','흐트러짐','받는 피해 ×1.15 · 반격 ×0.5','옆에 적이 없으면 차례 끝에 한 단계 회복 또는 재정비');
  if(u.formation==='BROKEN')add('BROKEN','붕','붕괴','받는 피해 ×1.30 · 통제 구역 없음','옆에 적이 없으면 차례 끝에 한 단계 회복 또는 재정비');
  if(u.braced)add('BRACED','방','방어','받는 피해 ÷1.25 · 반격 ×1.2','다음 자기 차례가 시작되면 해제');
  for(const s of u.status??[]){const kind=s.kind??s;
    if(kind==='CONFUSED')add(kind,'혼','혼란','공격 · 전법 · 반격 불가',Number.isFinite(s.turnsLeft)?`${s.turnsLeft}차례 뒤 해제`:'정해진 차례 뒤 해제');
    else if(STATUS_GLYPH[kind])add(kind,STATUS_GLYPH[kind],{INSPIRED:'고무',SLOWED:'둔화',ROOTED:'발 묶임'}[kind],{INSPIRED:'공격 강화',SLOWED:'이동 감소',ROOTED:'이동 불가'}[kind],'정해진 차례 뒤 해제');
  }
  return marks;
}
export function unitCityOffsets(cities,C,size=30) {
  const offsets={};
  for(const city of cities??[]){
    const c=C(city.center);offsets[city.center]={x:size*2.3,y:size*.35};
    for(const id of city.gates??[]){const p=C(id),dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1;offsets[id]={x:dx/d*size*.6,y:dy/d*size*.6};}
  }
  return offsets;
}
function unitMarker(u) {
  const key=troopKey(u),label=u.troopName??({militia:'근접보병',spear:'장병',bow:'궁병',cavalry:'기병'}[key]??'부대');
  const box=mapHeadBox(headOf(u.portrait)),score=n=>Number.isFinite(n)?String(n):'—';
  const h=headOf(u.portrait),portrait=u.portrait&&box?`<foreignObject class="unit-head" x="34" y="4" width="13" height="13"><div xmlns="http://www.w3.org/1999/xhtml" style="width:13px;height:13px;background-image:url(&quot;${esc(u.portrait)}&quot;);background-size:${13*h.size[0]/box[2]}px ${13*h.size[1]/box[3]}px;background-position:${-13*box[0]/box[2]}px ${-13*box[1]/box[3]}px"></div></foreignObject>`:`<text class="unit-head-initial" x="40.5" y="14">${esc(String(u.name??'').slice(0,1))}</text>`;
  return `<g class="unit-marker"><title>${esc(u.name)} · ${esc(label)} · 병력 ${troopLabel(u.count)}${u.ratings?' · '+esc(u.ratings.notes?.[0]??'표준 부대 대비 평가값'):''}</title>
    <rect class="unit-flag" x="-33" y="1" width="2" height="20"/>
    <rect class="unit-counter-bg" x="-31" y="1" width="63" height="21" rx="2"/>
    <image class="unit-kind" href="/assets/ui-v3/units-ink/c170-${esc(key)}.png" x="-29" y="2" width="20" height="20"><title>${esc(label)}</title></image>
    <g class="count unit-count"><text x="10" y="17">${troopLabel(u.count)}</text></g>
    <g class="unit-specs"><title>${esc(u.ratings?.notes?.join('\n')??'적 부대의 평가값은 공개되지 않습니다')}</title><text x="0" y="28.6">공 ${score(u.ratings?.attack)} · 방 ${score(u.ratings?.defense)}</text></g>
    <g class="unit-portrait"><rect class="frame" x="34" y="4" width="13" height="13" rx="6.5"/>${portrait}</g>
    <g class="unit-status">${unitStatusMarks(u).map((s,i)=>`<g class="unit-status-mark" data-status="${s.kind}" tabindex="0" aria-label="${esc(s.text)}" transform="translate(${i*12-25} -6)"><title>${esc(s.text)}</title><rect x="-5" y="-5" width="10" height="10" rx="2"/><text y="3">${s.glyph}</text></g>`).join('')}</g>
    ${u.tacticReady?'<g class="unit-tactic"><title>사용 가능한 전법 있음</title><text x="28" y="-3">전</text></g>':''}
    <text class="uname" y="-15">${esc(u.name)}</text></g>`;
}

function corners(c, size) { return Array.from({length: 6}, (_, i) => { const a = Math.PI / 180 * (60 * i - 90); return {x: c.x + size * Math.cos(a), y: c.y + size * Math.sin(a) * TILT}; }); }
const hexPath = (c, size) => 'M' + corners(c, size).map((p) => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z';
const ringsPath = (rings) => rings.map((r) => 'M' + r.map((p) => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z').join('');

/** 강: 맞닿은 변들을 물길로 잇고 변 가운데점 + Chaikin 으로 굽이치게(tools/art/map-guide.mjs --smooth 와 같은 계산). */
export function riverPaths(edges, layout) {
  const segs = [];
  for (const [a, b] of edges) {
    const va = corners(hexCenter(parse(a), layout), layout.size), vb = corners(hexCenter(parse(b), layout), layout.size);
    const common = va.filter((p) => vb.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 0.5));
    if (common.length === 2) segs.push(common);
  }
  const k = (p) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`, adj = new Map(), sk = (p, q) => [k(p), k(q)].sort().join('|');
  for (const [p, q] of segs) for (const [x, y] of [[p, q], [q, p]]) (adj.get(k(x)) ?? adj.set(k(x), []).get(k(x))).push({p: x, q: y});
  const used = new Set(), chains = [];
  for (const start of [...[...adj.keys()].filter((key) => adj.get(key).length !== 2), ...adj.keys()]) {
    for (const first of adj.get(start) ?? []) {
      if (used.has(sk(first.p, first.q))) continue;
      const chain = [first.p, first.q]; used.add(sk(first.p, first.q));
      let cur = first.q;
      for (;;) { const list = adj.get(k(cur)) ?? []; const nxt = list.find((s) => !used.has(sk(s.p, s.q))); if (!nxt || list.length > 2) break; used.add(sk(nxt.p, nxt.q)); chain.push(nxt.q); cur = nxt.q; }
      chains.push(chain);
    }
  }
  const mids = (c) => [c[0], ...c.slice(0, -1).map((p, i) => ({x: (p.x + c[i + 1].x) / 2, y: (p.y + c[i + 1].y) / 2})), c.at(-1)];
  const chaikin = (pts) => { let r = pts; for (let i = 0; i < 3; i++) { const o = [r[0]]; for (let j = 0; j < r.length - 1; j++) { const a = r[j], b = r[j + 1]; o.push({x: a.x * .75 + b.x * .25, y: a.y * .75 + b.y * .25}, {x: a.x * .25 + b.x * .75, y: a.y * .25 + b.y * .75}); } o.push(r.at(-1)); r = o; } return r; };
  return chains.map((c) => 'M' + chaikin(mids(c)).map((p) => `${f(p.x)} ${f(p.y)}`).join('L')).join('');
}

function territoryOf(tiles, cities, radius = 3) {
  const out = {};
  for (const t of tiles) { let best = null; for (const c of cities) { if (!c.factionId) continue; const d = hexDist(t, parse(c.center)); if (d <= radius && (!best || d < best.d)) best = {d, fid: c.factionId}; } if (best) out[`${t.q},${t.r}`] = best.fid; }
  return out;
}

function defs(size) {
  return `<defs>
  <radialGradient id="w-light"><stop offset="0" stop-color="#f6ecd8" stop-opacity=".92"/><stop offset=".5" stop-color="#f6ecd8" stop-opacity=".6"/><stop offset="1" stop-color="#f6ecd8" stop-opacity="0"/></radialGradient>
  <filter id="w-feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f(size * 0.35)}"/></filter>
  <filter id="w-cloud" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f(size * 0.7)}"/></filter>
  <filter id="w-paint" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${f(size * 0.55)}"/><feGaussianBlur stdDeviation="${f(size * 0.12)}"/></filter>
  <filter id="w-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0 0.38 0 0 0 0.16 0"/></filter>
  <filter id="w-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#000" flood-opacity=".65"/></filter>
  <filter id="w-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="w-vignette" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".07"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <clipPath id="w-face"><rect x="-14" y="-17" width="28" height="34" rx="1"/></clipPath>
  <clipPath id="w-face-shield"><path d="M-14 -17H14V9L0 17L-14 9Z"/></clipPath>
  </defs>`;
}

/**
 * opts: {size, margin, mapArt, cityArt:{cityId:{src,fit}}, unitArt:{troop:src}, facilityArt:{kind:src}, siteArt:{label:src}, unknownSiteArt,
 *        mode:'world'|'supply'|'faction'|'diplomacy'|'trace', relations:{F02:'WAR'}, cityBadges:{cityId:{idle,name,turns}}}
 */
const KIT_TONE = {F01: 'red', F02: 'green', F03: 'blue'}; // 표지 그림 색(없는 세력: 깃발 = 회색, 부대 틀 = 붉은 틀)
// Transient route/facing layers share their exact markup with a full draw.
export function renderMapPreview(hl,layout){
 const size=layout.size,C=id=>hexCenter(parse(id),layout);let svg='';
 for(const mark of hl.facing??[]){const p=C(mark.tile);if(mark.arrow){const a=C(mark.from),dx=p.x-a.x,dy=p.y-a.y;svg+=`<path class="w-c186-front" d="M${f(a.x+dx*.2)} ${f(a.y+dy*.2)}L${f(a.x+dx*.72)} ${f(a.y+dy*.72)}"/>`;}else if(mark.side!=='FRONT')svg+=`<g class="w-c186-facing ${mark.side}"><path d="${hexPath(p,size*.82)}"/><text x="${f(p.x)}" y="${f(p.y)}">${mark.side==='REAR'?'뒤 +30%':'옆 +15%'}</text></g>`;}
 for(const [i,id] of (hl.waypoints??[]).entries()){const p=C(id);svg+=`<g class="w-waypoint" transform="translate(${f(p.x)} ${f(p.y)})"><circle r="9"/><text y="4">${i+1}</text></g>`;}
 if(hl.blocked?.blockedTileId){const p=C(hl.blocked.blockedTileId),text=hl.blocked.reason;svg+=`<g class="w-route-blocked"><path d="${hexPath(p,size*.94)}"/><g transform="translate(${f(p.x)} ${f(p.y-size)})"><rect x="-8" y="-16" width="${text.length*9+16}" height="23" rx="3"/><text y="0">${esc(text)}</text></g></g>`;}
  if (hl.side?.tile) { const p = C(hl.side.tile), name = {FRONT: '정면', FLANK: '옆 +15%', REAR: '뒤 +30%'}[hl.side.side] ?? ''; svg += `<g class="w-side s-${esc(hl.side.side ?? '')}"><path d="${hexPath(p, size * 0.98)}"/>${name ? `<text x="${f(p.x)}" y="${f(p.y - size * 1.0)}">${name}</text>` : ''}</g>`; }
  if (hl.path?.length > 1) svg += `<path class="w-path" d="M${hl.path.map((id) => { const p = C(id); return `${f(p.x)} ${f(p.y)}`; }).join('L')}"/>`;
  for (const o of hl.orders ?? []) {
    if (!o.path?.length) continue;
    const pts = o.path.map((id) => C(id)), end = pts.at(-1);
    if (pts.length > 1) svg += `<path class="w-order" d="M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join('L')}"/>`;
    svg += `<g class="w-order-end" transform="translate(${f(end.x)} ${f(end.y)})"><path d="M0 2V-20"/><path class="cloth" d="M0 -20L12 -16L0 -12Z"/>${o.turns > 1 ? `<text y="13">${o.turns}차례</text>` : ''}</g>`;
  }
  // 클릭 칸(투명) — 장식 층은 pointer-events:none
 return svg;
}
export function renderWorldMap(model, opts = {}) {
  const kit = opts.kit ?? null;
  const size = opts.size ?? 30;
  const tiles = model.tiles.map((t) => ({...t, id: `${t.q},${t.r}`}));
  const raw = tiles.map((t) => hexCenter(t, {size, ox: 0, oy: 0, tilt: TILT}));
  const xs = raw.map((c) => c.x), ys = raw.map((c) => c.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  // 세계 그림(땅 둘레에 놀이판 밖 지형을 이어 그린 한 장 — tools/design/map-ring.py)이 있으면 여백 = 그 고리 너비. 화면을 끝까지 옮겨도 그림 밖이 보이지 않는다
  const world = opts.mapWorld?.src ? opts.mapWorld : null;
  const wkx = world ? (maxX - minX + size * 2) / world.land[0] : 0, wky = world ? (maxY - minY + size * 2) / world.land[1] : 0;
  const margin = world ? Math.floor(Math.min(world.ring * wkx, world.ring * wky)) - 2 : (opts.margin ?? 90);
  const layout = {size, tilt: TILT, ox: margin - minX + size, oy: margin - minY + size * 2.2};
  const painting = world ? {src:world.src,x:minX-size+layout.ox-world.ring*wkx,y:minY-size+layout.oy-world.ring*wky,width:(world.land[0]+world.ring*2)*wkx,height:(world.land[1]+world.ring*2)*wky} : null;
  const W = maxX - minX + size * 2 + margin * 2, H = maxY - minY + size * 3.2 + margin * 2;
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const C = (id) => hexCenter(byId.get(id) ?? parse(id), layout);
  const hl = model.highlights ?? {}, mode = opts.mode ?? 'world';
  const land = ringsPath(outlineRings(tiles, layout));
  let svg = `<svg class="wmap mode-${esc(mode)}${world ? ' has-world' : ''}${opts.targetPicking ? ' target-picking' : ''}" data-margin="${margin}" data-ox="${layout.ox}" data-oy="${layout.oy}" data-size="${size}" viewBox="0 0 ${f(W)} ${f(H)}" xmlns="http://www.w3.org/2000/svg">${defs(size)}<defs><pattern id="c171-zoc" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="#52212655"/><path d="M0 0V8" stroke="#f29486" stroke-width="2.5"/></pattern></defs>`;
  svg += `<rect class="w-void" x="0" y="0" width="${f(W)}" height="${f(H)}"/>`;

  // 땅
  if (!world) svg += `<path class="w-land-shadow" d="${land}" filter="url(#w-cloud)"/>`;
  if (world) {
    // 땅 + 땅 밖 지형을 한 장으로. 놀이판 밖은 먹 장막으로 어둡게(가장자리는 구름처럼 번지게) — 갈 수 없는 변방
    const bx = minX - size + layout.ox, by = minY - size + layout.oy;
    svg += `<image class="w-art w-world" href="${esc(world.src)}" x="${f(bx - world.ring * wkx)}" y="${f(by - world.ring * wky)}" width="${f((world.land[0] + world.ring * 2) * wkx)}" height="${f((world.land[1] + world.ring * 2) * wky)}" preserveAspectRatio="none"/>`;
    svg += `<mask id="w-m-beyond" maskUnits="userSpaceOnUse" x="0" y="0" width="${f(W)}" height="${f(H)}"><rect x="0" y="0" width="${f(W)}" height="${f(H)}" fill="#fff"/><path d="${land}" fill="#000" stroke="#000" stroke-width="${f(size * .5)}" stroke-linejoin="round" filter="url(#w-feather)"/></mask><rect class="w-beyond" x="0" y="0" width="${f(W)}" height="${f(H)}" mask="url(#w-m-beyond)"/>`;
  } else if (opts.mapArt) {
    const bx = minX - size + layout.ox, by = minY - size + layout.oy, bw = maxX - minX + size * 2, bh = maxY - minY + size * 2;
    svg += `<mask id="w-m-land" maskUnits="userSpaceOnUse"><path d="${land}" fill="#fff" stroke="#000" stroke-width="${f(size * 1.3)}" stroke-linejoin="round" filter="url(#w-feather)"/></mask><g mask="url(#w-m-land)"><image class="w-art" href="${esc(opts.mapArt)}" x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" preserveAspectRatio="none"/></g>`;
  } else {
    // 그림이 없을 때: 지형 색 칸을 붓 자국처럼 일그러뜨린 판
    const groups = {};
    for (const t of tiles) (groups[t.terrain] ??= []).push(hexPath(hexCenter(t, layout), size * 1.04));
    svg += `<g class="w-terrain" filter="url(#w-paint)">${Object.entries(groups).map(([k, d]) => `<path d="${d.join('')}" fill="${TERRAIN[k] ?? TERRAIN.unknown}"/>`).join('')}</g>`;
    svg += `<rect x="0" y="0" width="${f(W)}" height="${f(H)}" filter="url(#w-grain)" mask="url(#w-m-land2)"/><mask id="w-m-land2" maskUnits="userSpaceOnUse"><path d="${land}" fill="#fff"/></mask>`;
  }
  svg += `<rect class="w-light" x="0" y="0" width="${f(W)}" height="${f(H)}" fill="url(#w-vignette)"/>`;

  // 강(판정선) · 다리 · 길
  const waterEdges = [...(model.rivers ?? []), ...(model.bridges ?? [])];
  if (waterEdges.length) svg += `<path class="w-river" d="${riverPaths(waterEdges, layout)}"/>`;
  for (const [a, b] of model.bridges ?? []) { const p = C(a), q = C(b), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI; svg += `<g class="w-bridge" transform="translate(${f(mx)} ${f(my)}) rotate(${f(ang)})"><rect x="${f(-size * .38)}" y="${f(-size * .1)}" width="${f(size * .76)}" height="${f(size * .2)}"/></g>`; }
  if (model.roads?.length) svg += `<path class="w-road" d="${model.roads.map(([a, b]) => { const p = C(a), q = C(b); return `M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`; }).join('')}"/>`;

  // 영역
  const territory = model.territory ?? territoryOf(tiles, model.cities ?? []);
  for (const fid of Object.keys(FACTION)) {
    const owned = tiles.filter((t) => territory[t.id] === fid && t.vis !== 'UNEXPLORED');
    if (!owned.length) continue;
    const d = ringsPath(outlineRings(owned, layout)), rel = opts.relations?.[fid] ? ` rel-${esc(opts.relations[fid])}` : '';
    svg += `<g class="w-terr${rel}" style="--fc:${FACTION[fid].color}"><path class="fill" d="${d}"/><path class="glow" d="${d}"/><path class="edge" d="${d}"/></g>`;
  }
  // 칸
  svg += `<path class="w-grid" d="${tiles.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
  // 물 위 돛배(닷토리 B8 fleet · 기준 final-map-v2 의 강 위 배): 너른 물 칸 몇 곳에만, 안개 아래에 깔린다. 꾸밈일 뿐 규칙과 무관
  if (kit?.fleet) for (const t of tiles) { if (t.terrain !== 'water' || ((t.q * 7 + t.r * 13) % 5 + 5) % 5 !== 0) continue; const c = hexCenter(t, layout); svg += `<image class="w-fleet" href="${esc(kit.fleet)}" x="${f(c.x - size * 0.95)}" y="${f(c.y - size * 0.95)}" width="${f(size * 1.9)}" height="${f(size * 1.37)}"${(t.q + t.r) % 2 ? ` transform="translate(${f(c.x * 2)} 0) scale(-1 1)"` : ''}/>`; }
  // 안개: 미탐험 = 어두운 구름, 기억 칸 = 색 빠짐
  const remembered = tiles.filter((t) => t.vis === 'REMEMBERED');
  if (remembered.length) svg += `<path class="w-fog-mem" d="${remembered.map((t) => hexPath(hexCenter(t, layout), size)).join('')}"/>`;
  const unexplored = tiles.filter((t) => t.vis === 'UNEXPLORED');
  if (unexplored.length) svg += `<mask id="w-m-fog" maskUnits="userSpaceOnUse"><path d="${unexplored.map((t) => hexPath(hexCenter(t, layout), size * 1.15)).join('')}" fill="#fff" filter="url(#w-cloud)"/></mask><rect class="w-fog" x="0" y="0" width="${f(W)}" height="${f(H)}" mask="url(#w-m-fog)"/>`;

  // 이동·공격·위험 칸, 경로, 예약, 정면, 인연선, 적 의도, 보급선
  if(opts.mode==='supply'&&opts.supplyPublic){
    const covered=publicSupplyTiles(tiles,opts.supplyPublic.cities,opts.supplyPublic.hubs);
    if(covered.length)svg+=`<path class="w-supply-boundary" d="${ringsPath(outlineRings(covered,layout))}"/>`;
  }
  const hexes = (ids, cls) => (ids ?? []).map((id) => byId.has(id) || parse(id) ? `<path class="${cls}" d="${hexPath(C(id), size * 0.92)}"/>` : '').join('');
  svg += hexes(hl.danger, 'w-danger') + hexes(hl.move, 'w-move') + hexes(hl.zoc, 'w-zoc') + hexes(hl.attack, 'w-attack');
  if(hl.move?.length)svg+=`<path class="w-move-boundary" d="${ringsPath(outlineRings(tiles.filter(t=>hl.move.includes(t.id)),layout))}"/>`;
  svg += '<defs><marker id="c186-front-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#d4c7a5"/></marker><marker id="c186-danger-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#c95f52"/></marker></defs>';
  svg += renderMapPreview({side:hl.side,facing:hl.facing},layout);
  for (const l of hl.links ?? []) { const a = C(l.from), z = C(l.to); svg += `<path class="w-link" d="M${f(a.x)} ${f(a.y)}L${f(z.x)} ${f(z.y)}"/>`; }
  for (const l of hl.intents ?? []) { const a = C(l.from), z = C(l.to), dx = z.x - a.x, dy = z.y - a.y, d = Math.hypot(dx, dy) || 1; svg += `<path class="w-intent" d="M${f(a.x + dx / d * size * .5)} ${f(a.y + dy / d * size * .5)}L${f(z.x - dx / d * size * .45)} ${f(z.y - dy / d * size * .45)}"/>`; }
  for (const l of hl.supply ?? []) { const a = C(l.from), z = C(l.to); svg += `<g class="w-supply s-${esc(String(l.state ?? '').toLowerCase())}"><path d="M${f(a.x)} ${f(a.y)}L${f(z.x)} ${f(z.y)}"/><circle cx="${f(z.x)}" cy="${f(z.y)}" r="5"/><circle class="end" cx="${f(a.x)}" cy="${f(a.y)}" r="3.5"/></g>`; }
  svg += renderMapPreview({path:hl.path,orders:hl.orders,waypoints:hl.waypoints},layout);
  svg += `<g class="w-hits">${tiles.map((t) => `<path data-tile="${t.id}" d="${hexPath(hexCenter(t, layout), size)}"/>`).join('')}</g>`;

  // 시설
  for (const [index,fc] of (model.facilities ?? []).entries()) {
    const c = facilityPlacement(model,fc,layout,painting);if(!c)continue;
    const art = FACILITY_FILE[fc.kind]?`/assets/ui-v3/dots-1016/facilities/A-${FACILITY_FILE[fc.kind]}.png`:opts.facilityArt?.[fc.kind];
    if (art) { const w = size * 1.35, h = w * 0.75, clip=`w-facility-land-${index}`; svg += `<clipPath id="${clip}"><path d="${hexPath(c.center,size*.82)}"/></clipPath><g clip-path="url(#${clip})"><g class="w-facility${fc.disabled ? ' off' : ''}${fc.constructing||fc.underConstruction?' building':''}" data-facility-tile="${esc(fc.tileId)}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${esc(FACILITY_NAME[fc.kind] ?? fc.kind)}</title><image style="filter:${FACILITY_TONE}" href="${esc(art)}" x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}"/></g></g>`; }
    else svg += `<g class="w-facility token${fc.disabled ? ' off' : ''}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${esc(FACILITY_NAME[fc.kind] ?? fc.kind)}</title><path d="${hexPath({x: 0, y: 0}, size * 0.52)}"/><text y="5">${FACILITY_GLYPH[fc.kind] ?? '工'}</text></g>`;
  }
  // 탐험지 — 모르는 곳은 안개 형체, 아는 곳은 미니어처(없으면 각인 표지)
  for (const p of model.places ?? []) {
    const c = C(Array.isArray(p.at) ? p.at.join(',') : p.tileId), status = p.status ?? 'KNOWN', unknown = status === 'UNKNOWN';
    const art = unknown ? opts.unknownSiteArt : opts.siteArt?.[p.label];
    const title = `${unknown ? '미확인 흔적' : esc(p.label)}${!unknown && p.note ? ' · ' + esc(p.note) : ''}${p.eventName ? ' — ' + esc(p.eventName) : ''}${p.layer ? ` · ${esc(p.layer)} ${esc(p.layerName ?? '')}` : ''}\n부대가 이 칸에서 교전 없이 차례를 마치면 조사`;
    svg += `<g class="w-site s-${esc(status.toLowerCase())}" data-place="${esc(p.label)}" transform="translate(${f(c.x)} ${f(c.y)})"><title>${title}</title><ellipse class="halo" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" cy="${f(size * 0.18)}"/>${status === 'KNOWN' ? `<ellipse class="beacon" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" cy="${f(size * 0.18)}"/>` : ''}`;
    const baked = !!world?.baked?.includes(p.label); // 2026-10-14: 탐험지가 지도 바탕 그림 안에 그려져 있다(v13) — 얹는 미니어처 없음, 모르는 곳만 '?' 표지
    if (art && !baked) { const w = size * 2, h = w * 0.75; svg += `<image href="${esc(art)}" x="${f(-w / 2)}" y="${f(-h * 0.62)}" width="${f(w)}" height="${f(h)}"/>`; }
    else if (!baked || unknown) svg += `<g class="mark"><rect x="-10" y="-22" width="20" height="20" transform="rotate(45 0 -12)"/><text y="-7">${unknown ? '?' : PLACE_GLYPH[p.label] ?? '跡'}</text></g>`;
    if (!unknown) svg += `<text class="name" y="${f(size * 0.78)}">${esc(p.label)}</text>`;
    if(status==='KNOWN'||status==='PENDING')svg+=`<text class="c186-site-goal" y="${f(size*1.15)}">${status==='PENDING'?'조사 중':'조사 목표'}</text>`;
    // 단계 표지: 조사 중 = 査(점선 고리 돎) · 조사 끝 = 已 인장
    if (status === 'PENDING') svg += `<g class="badge pend" transform="translate(${f(size * 0.72)} ${f(-size * 0.86)})"><circle class="spin" r="9.5"/><circle r="7"/><text y="3.6">査</text></g>`;
    if (status === 'RESOLVED') svg += `<g class="badge done"${p.layer ? ` data-layer="${esc(p.layer)}"` : ''} transform="translate(${f(size * 0.72)} ${f(-size * 0.86)})"><rect x="-7.5" y="-7.5" width="15" height="15"/><text y="3.6">${esc(p.layer ?? '已')}</text></g>`;
    svg += `</g>`;
  }

  // 발밑 빛(2026-10-13, 사용자 "진한 펜선이랑 다 같이 갈 수 있는 방법 — 부대랑 성 쪽만 좀 밝게"): 성과 부대가 선 자리 둘레의 땅만 밝힌다.
  // CSS 에서 overlay 로 섞으므로 지도의 검은 펜선은 검게 남고 들 · 숲 · 물의 바탕만 밝아진다. 성 안에 든 부대는 성의 빛으로 충분하다.
  { const cityTiles = new Set((model.cities ?? []).map((c) => c.center));
    const lights = [...(model.cities ?? []).map((c) => ({p: C(c.center), r: size * (c.kind === 'minor' ? 3.3 : 4.1), dy: -size * 0.25, k: 'city'})),
      ...(model.units ?? []).filter((u) => !cityTiles.has(u.tileId)).map((u) => ({p: C(u.tileId), r: size * 2.5, dy: -size * 0.7, k: 'unit'}))];
    svg += `<g class="w-lights">${lights.map((l) => `<ellipse class="${l.k}" cx="${f(l.p.x)}" cy="${f(l.p.y + l.dy)}" rx="${f(l.r)}" ry="${f(l.r * 0.8)}"/>`).join('')}</g>`; }
  // 성 — 7칸 자리 + 미니어처 그림(그림 속 7칸 상자를 지도 7칸 상자에 맞춤)
  const plates = [];
  const occupied = [];
  const overlaps = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  for (const city of model.cities ?? []) {
    const fs = FACTION[city.factionId] ?? NEUTRAL;
    const cells = [parse(city.center), ...(city.gates ?? []).map(parse), ...(city.walls ?? []).map(parse)];
    const rings = outlineRings(cells, layout), pts = rings.flat();
    const bx0 = Math.min(...pts.map((p) => p.x)), bx1 = Math.max(...pts.map((p) => p.x)), by0 = Math.min(...pts.map((p) => p.y));
    const art = opts.cityArt?.[city.id], baked = !!world?.baked?.includes(city.id); // baked = 성이 지도 바탕 그림 안에 그려져 있다 — 얹는 그림 없음
    svg += `<g class="w-city${baked ? ' baked' : ''}${city.attackable?' attackable':''}${city.besieged ? ' besieged' : ''}${city.neutral ? ' neutral' : ''}" data-city="${esc(city.id)}" style="--fc:${fs.color}"><path class="ground" d="${ringsPath(rings)}"/>`;
    if (baked) { /* 그림은 바탕에 있다 */ }
    else if (art?.fit) { const [fx, fy, fw] = art.fit.flowerBox, k = (bx1 - bx0) / fw; svg += `<image class="art" href="${esc(art.src)}" x="${f(bx0 - fx * k)}" y="${f(by0 - fy * k)}" width="${f(art.fit.image[0] * k)}" height="${f(art.fit.image[1] * k)}"/>`; }
    else { const c = C(city.center); svg += `<g class="w-city-fallback" transform="translate(${f(c.x)} ${f(c.y)})"><path d="${hexPath({x: 0, y: 0}, size * 1.25)}"/><path class="keep" d="M-10 4V-6L0 -13L10 -6V4Z"/></g>`; }
    for (const g of city.gates ?? []) { const c = C(g), lost = (city.lostGates ?? []).includes(g); svg += `<g class="w-gate${lost ? ' lost' : ''}" transform="translate(${f(c.x)} ${f(c.y)})"><path d="M-5 4V-2a5 5 0 0 1 10 0V4"/>${lost ? '<path class="x" d="M-4 -6L4 2M4 -6L-4 2"/>' : ''}</g>`; }
    if (city.besieged) { const c = C(city.center); svg += kit?.siegeFire ? `<image class="w-siege" href="${esc(kit.siegeFire)}" x="${f(c.x - size * 0.9)}" y="${f(c.y - size * 2.2)}" width="${f(size * 1.8)}" height="${f(size * 1.83)}"/>` : `<g class="w-smoke" transform="translate(${f(c.x)} ${f(c.y - size)})"><circle r="7"/><circle r="10" cx="8" cy="-6"/><circle r="12" cx="-6" cy="-14"/></g>`; }
    svg += `</g>`;
    // 이름판(가장 위 층): 세력 마름모 + 이름 + 내구
    const c = C(city.center), name = esc(city.name), w = kit?.cityPlate ? Math.max(50, String(city.name ?? '').length * 17 + 26) : Math.max(76, String(city.name ?? '').length * 17 + 46), def = city.defenseMax ? Math.max(0, Math.min(1, (city.defense ?? 0) / city.defenseMax)) : null;
    const b = opts.cityBadges?.[city.id], badge = b ? (() => { const t = b.idle ? '생산 선택' : b.kind==='muster'?`출진 ${b.turns??'—'}`:`${b.name} · ${b.turns??'—'}차례`; const bw = t.length * 10 + 20; return `<g class="prod${b.idle ? ' idle' : ''}${b.kind==='muster'?' muster':''}" data-city="${esc(city.id)}" data-prod-city="${esc(city.id)}" transform="translate(0 ${city.defenseMax ? 45 : 25})"><rect x="${f(-bw / 2)}" y="-9" width="${f(bw)}" height="18"/>${b.kind==='muster'?`<path class="muster-flag" d="M${f(-bw/2-7)} 12V-15l13 4-13 4"/>`:""}<text y="4">${esc(t)}</text></g>`; })() : '';
    // 성 기본 정보 줄(사용자 2026-10-11 "성에 총 병력수·내구도 등 기본 정보 — 코삼·문명처럼"): 병력(내 성 = 성 안 예비병, 남의 성 = 모름 '?') · 내구
    const iw = Math.max(w + 14, 78), infoY = def !== null ? 19 : 15;
    const info = city.defenseMax || Number.isFinite(city.troops) ? `<g class="cinfo" transform="translate(0 ${infoY})"><rect class="ci-bg" x="${f(-iw / 2)}" y="0" width="${f(iw)}" height="13.5" rx="1.5"/>`
      + `<image href="/assets/ui-v3/hud/icons/res-troops.png" x="${f(-iw / 2 + 3)}" y="1.6" width="10.5" height="10.5"/><text class="ci-t" x="${f(-iw / 2 + 15)}" y="10.2">${Number.isFinite(city.troops) ? troopLabel(city.troops) : '?'}</text>`
      + (city.defenseMax ? `<image href="/assets/ui-v3/hud/icons/cmd-garrison.png" x="${f(iw / 2 - 37)}" y="1.6" width="10.5" height="10.5"/><text class="ci-t${def !== null && def < 0.5 ? ' low' : ''}" x="${f(iw / 2 - 25)}" y="10.2">${Math.round(city.defense ?? 0)}</text>` : '') + '</g>' : '';
    // 2026-10-14 이름표 자리(사용자 "성 이름이 성의 어느 방향에 어느 정도 붙어 있는지 · 글자 크기 · 색을 레퍼런스 보고"): 바탕에 그려 넣은 성이면
    // 그려진 성벽 아래끝 가운데(world.cityLabelAt, 바탕 그림 px)에 띠 위쪽이 살짝 걸치게 — 솔 시안 04b 의 업 · RTK14 처럼 성에 붙인다. 아니면 예전 자리(칸 가운데 아래)
    const labelAt = world?.cityLabelAt?.[city.id], ribH = city.kind === 'minor' ? 21 : 24;
    const lx = labelAt ? minX - size + layout.ox - world.ring * wkx + labelAt[0] * wkx : c.x;
    const ly = labelAt ? minY - size + layout.oy - world.ring * wky + labelAt[1] * wky + ribH * 0.32 : c.y + size * (city.kind === 'minor' ? 1.35 : 1.7);
    const nameLen = String(city.name ?? '').length, ribW = ribH * (nameLen > 1 ? 3.55 : 2.6);
    // 2026-10-14 성 소유 표시(사용자 "성이 딱 봐도 중립인지, 점령된 상태인지, 누구 성인지 알 수 있게 — 레퍼런스 보고"):
    // 삼국지14 = 이름 옆 세력색 표 + 영토 색, 토탈워 삼국 = 세력 깃발 판, Old World = 세력색 경계선 → 이름 띠를 소유 세력색 먹으로(중립 = 무채색 먹),
    // 띠 왼쪽 끝에 세력 문장 원판(중립 = 회색 원판 '中'), 점령 중이면 원판 둘레에 끊긴 고리. 영토 색 · 경계는 hud-ink.css '성 소유 표시'
    const ownTone = KIT_TONE[city.factionId], sealR = ribH * 0.6, sealX = -ribW / 2 + sealR * 0.15, occupying = !!(city.occupation?.stage && city.occupation.stage !== 'NORMAL');
    const seal = !labelAt ? '' : city.factionId && FACTION[city.factionId] ? `<g class="seal${occupying ? ' occupying' : ''}" transform="translate(${f(sealX)} 0)"><image href="/assets/ui-v3/emblems/${esc(city.factionId)}.png" x="${f(-sealR)}" y="${f(-sealR)}" width="${f(sealR * 2)}" height="${f(sealR * 2)}"/>${occupying ? `<image class="occ" href="/assets/ui-v3/emblems/occupied-ring.png" x="${f(-sealR * 1.22)}" y="${f(-sealR * 1.22)}" width="${f(sealR * 2.44)}" height="${f(sealR * 2.44)}"/>` : ''}</g>`
      : `<g class="seal neutral" transform="translate(${f(sealX)} 0)"><image href="/assets/ui-v3/emblems/neutral.png" x="${f(-sealR)}" y="${f(-sealR)}" width="${f(sealR * 2)}" height="${f(sealR * 2)}"/></g>`; // 닷토리 C3 중립 문장(구름, 짐승 없음)
    const ribbon = labelAt ? `<image class="rib${ownTone ? ' owned' : ' unowned'}" href="/assets/ui-v3/ink/ribbon-${nameLen > 1 ? 2 : 1}${ownTone ? '-' + ownTone : ''}.png" x="${f(-ribW / 2)}" y="${f(-ribH / 2)}" width="${f(ribW)}" height="${f(ribH)}"/>` : '';
    if (opts.compactLabels) occupied.push({x:lx-iw/2-22,y:ly-50,w:iw+44,h:city.defenseMax?108:88});
    const status = city.besieged ? '포위' : city.unrest === 'CHAOS' ? '혼란' : city.unrest === 'UNREST' ? '동요' : city.occupation && city.occupation.stage && city.occupation.stage !== 'NORMAL' ? '점령' : '';
    plates.push(`<g class="w-cityplate${city.attackable?' attackable':''}${city.kind === 'minor' ? ' minor' : ''}${city.neutral ? ' neutral' : ''}" data-city="${esc(city.id)}" data-camera-tile="${esc(city.center)}" transform="translate(${f(lx)} ${f(ly)}) scale(.88)" style="--fc:${fs.color}">
      ${kit?.cityPlate ? `<image class="plate-art" href="${esc(kit.cityPlate)}" x="${f(-w / 2 - 5)}" y="-13.5" width="${f(w + 10)}" height="27" preserveAspectRatio="none"/>` : ''}${(() => { const fl = kit?.cityFlag?.[KIT_TONE[city.factionId] ?? 'grey']; return fl ? `<g class="cflag" transform="translate(${f(labelAt ? sealX - sealR - 7 : -w / 2 - 12)} -50)"><image href="${esc(fl)}" x="-8" y="0" width="17" height="58"/>${/^F\d\d$/.test(city.factionId ?? '') ? `<image href="/assets/ui-v3/emblems/${esc(city.factionId)}.png" x="-4.6" y="9" width="10" height="10"/>` : ''}</g>` : ''; })()}
      ${ribbon}${seal}<rect class="bg" x="${f(-w / 2)}" y="-12" width="${f(w)}" height="24"/><g class="crest" transform="translate(${f(-w / 2 + 2)} 0)"><rect x="-9" y="-9" width="18" height="18" transform="rotate(45)"/><text y="4.5">${esc(fs.glyph)}</text></g>
      <text class="name" x="${f(kit?.cityPlate ? 0 : 9)}" y="5.5">${name}</text>${def !== null ? `<rect class="def-bg" x="${f(-w / 2 + 16)}" y="14" width="${f(w - 22)}" height="3"/><rect class="def" x="${f(-w / 2 + 16)}" y="14" width="${f((w - 22) * def)}" height="3"/>` : ''}
      ${status ? `<g class="st" transform="translate(${f(w / 2 + 4)} -6)"><rect x="0" y="-9" width="34" height="17"/><text x="17" y="4">${status}</text></g>` : ''}${info}${badge}</g>`);
  }

  svg += '<g class="w-fire-ground" pointer-events="none" aria-hidden="true"></g>';
  svg += `<g class="w-plates">${plates.join('')}</g>`; // 성 이름판은 부대 아래(부대를 누르기 쉽게)
  // 부대 — 무리 그림(있으면) + 장수 깃발판(얼굴·병력) + 옥벽 고리
  const units = (model.units ?? []).filter((u) => u.count !== 0 || u.prevCount);
  const labelOffsets = new Map();
  if (opts.compactLabels && !opts.troopFormations) {
    // Reserve selected banners first; keep every portrait tethered to its actual tile.
    for (const u of [...units].sort((a,b)=>Number(!!b.active)-Number(!!a.active))) {
      const c=C(u.tileId), scale=u.active?1:.82, w=Math.max(70,String(u.name??'').length*12+20)*scale, h=72*scale;
      let best=null;
      for (let row=0;row<6;row++) for (const dx of [0,-size*1.6,size*1.6,-size*3.2,size*3.2]) {
        const dy=-size*1.5-row*h, box={x:c.x+dx-w/2,y:c.y+dy-32*scale,w,h};
        const hits=occupied.filter(b=>overlaps(box,b)).length, score=hits*10000+Math.hypot(dx,dy+size*1.5);
        if (!best || score<best.score) best={dx,dy,scale,box,score};
      }
      occupied.push(best.box);labelOffsets.set(u.id,best);
    }
    units.sort((a,b)=>Number(!!a.active)-Number(!!b.active));
  }
  const stack = {}, cityCenters = new Set((model.cities ?? []).map((c) => c.center));
  const cityTiles=new Set((model.cities??[]).flatMap(c=>[c.center,...(c.gates??[])]));
  const displayOffsets=opts.unitMarkers?unitCityOffsets(model.cities,C,size):{};
  // 그리는 순서: 위쪽 칸 먼저 → 아래쪽 칸, 성 안 부대는 맨 뒤. 성 안 부대는 깃발판만 있어서 옆 칸 병사 무리에 가리면 숫자만 남는다(2026-10-12)
  if (!opts.compactLabels) units.sort((a, b) => Number(cityCenters.has(a.tileId)) - Number(cityCenters.has(b.tileId)) || C(a.tileId).y - C(b.tileId).y);
  for (const u of units) {
    const n = (stack[u.tileId] = (stack[u.tileId] ?? -1) + 1), c = C(u.tileId), x = c.x + (opts.compactLabels?0:n * size * 0.42), y = c.y + (opts.compactLabels?0:n * size * 0.16);
    const label=labelOffsets.get(u.id);
    const inCity = (opts.unitMarkers?cityTiles:cityCenters).has(u.tileId), fs = FACTION[u.factionId] ?? NEUTRAL, art = inCity ? null : opts.unitArt?.[troopKey(u)];
    const sample=opts.troopFormations?sampleTroop({...u,displayOffsets},{x,y},C):null;
    const formation=opts.troopFormations?troopLayout(u,inCity,sample):null,footprint=formation?.bounds;
    // 병사 무리: 세력 색 천을 두른 무리를 칸 위에 크게(시안 final-map-v2). 발끝이 칸 가운데 조금 아래에 오게 놓는다
    const sq = inCity ? null : opts.squadArt?.[troopKey(u)]?.[KIT_TONE[u.factionId] ?? 'grey'], sqW = size * 3.3, sqH = sq ? sqW * sq.size[1] / sq.size[0] : 0;
    const ratio = u.maxCount ? Math.max(0, Math.min(1, (u.count ?? 0) / u.maxCount)) : 1;
    const lost = Number.isFinite(u.prevCount) && u.prevCount > u.count ? u.prevCount - u.count : 0;
    const flip = u.faceLeft ? ' scale(-1 1)' : '';
    const badges = [u.morale === 'ROUTING' ? '潰' : u.morale === 'SHAKEN' ? '搖' : '', u.formation === 'BROKEN' ? '崩' : u.formation === 'DISORDERED' ? '亂' : '', u.braced ? '守' : '', ...(u.status ?? []).map((s) => STATUS_GLYPH[s.kind ?? s] ?? '')].filter(Boolean);
    const cls = `w-unit${u.active ? ' active' : ''}${u.moved ? ' moved' : ''}${u.ready ? ' ready' : ''}${u.enemy ? ' enemy' : ''}${lost ? ' hit' : ''}${u.crisis ? ' crisis' : ''}${u.bond ? ' bonded' : ''}`;
    const offset=displayOffsets[u.tileId]??{x:0,y:0};
    svg += `<g class="${cls}" data-unit="${esc(u.id)}" data-camera-tile="${esc(u.tileId)}" data-display-offsets="${esc(JSON.stringify(displayOffsets))}"${footprint?` data-troop-anchor="1" data-troop-head="${formation.headTop}" data-troop-top="${footprint.top}" data-troop-left="${footprint.left}" data-troop-right="${footprint.right}" data-troop-bottom="${footprint.bottom}"`:''} data-x="${f(x)}" data-y="${f(y)}" transform="translate(${f(sample?.pos.x??x+offset.x)} ${f(sample?.pos.y??y+offset.y)})" style="--fc:${fs.color}">
      ${footprint?`<g visibility="hidden" pointer-events="none"><rect data-troop-project="origin" width=".01" height=".01"/><rect data-troop-project="x" x="1" width=".01" height=".01"/><rect data-troop-project="y" y="1" width=".01" height=".01"/></g>`:''}
      <ellipse class="shadow" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.72)}" ry="${f(size * 0.25)}"/>
      ${!u.enemy?`<ellipse class="ink-pick-ring" cx="0" cy="10" rx="25" ry="10"/>`:""}
      ${u.active ? `<ellipse class="bi" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}"/><ellipse class="bi-in" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.64)}" ry="${f(size * 0.22)}"/>` : !u.enemy && u.moved ? `<ellipse class="bi done" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.8)}" ry="${f(size * 0.3)}" pathLength="100"/>` : ''}
      ${u.crisis ? `<ellipse class="crisis-ring" cx="0" cy="${f(size * 0.3)}" rx="${f(size * 0.9)}" ry="${f(size * 0.34)}"/>` : ''}
      ${opts.troopFormations ? `<ellipse class="w-troops-hit" cx="0" cy="10" rx="22" ry="12"/>` : sq ? `<image class="squad big" href="${esc(sq.src)}" x="${f(-sqW / 2)}" y="${f(size * 0.62 - sqH)}" width="${f(sqW)}" height="${f(sqH)}"${flip ? ` transform="${flip.trim()}"` : ''}/>` : art ? `<image class="squad" href="${esc(art)}" x="${f(-size * 1.15)}" y="${f(-size * 1.55)}" width="${f(size * 2.3)}" height="${f(size * 2.3)}"${flip ? ` transform="${flip.trim()}"` : ''}/>` : ''}
      ${label?`<path class="w-label-tether" d="M0 0L${f(label.dx)} ${f(label.dy+30*label.scale)}" fill="none" stroke="${fs.color}" stroke-width="1.5" pointer-events="none"/>`:""}<g class="plate plate-top${inCity ? ' in-city' : ''}" data-unit="${esc(u.id)}" transform="${footprint?`translate(0 ${f(troopPlateY(formation.headTop))})`:label?`translate(${f(label.dx)} ${f(label.dy)}) scale(${label.scale})`:`translate(${inCity ? f(size * 1.3) : 0} ${f(inCity ? -size * 0.4 : -size * (sq ? 2.2 : art ? 1.55 : 1.05))})`}">
        ${opts.unitMarkers ? unitMarker(u) : `        <path class="pole" d="M0 14V${f(inCity ? size * 0.7 : size * (sq ? 1.15 : 1))}"/>
        ${/^F\d\d$/.test(u.factionId ?? '') ? `<g class="banner" transform="translate(-1 21)"><path class="cloth" d="M0 0H-17V22L-12.5 18L-8.5 22L-4.5 18L0 22Z"/><image href="/assets/ui-v3/emblems/${esc(u.factionId)}.png" x="-15" y="1" width="13" height="13"/></g>` : ''}
        ${u.tacticReady?`<g class="w-tactic-ready${u.tacticNew?' fresh':''}" transform="translate(29 5)"><rect x="-7" y="-8" width="16" height="17"/><text x="1" y="5">전</text></g>`:''}${u.active?'<g class="w-selected"><rect x="15" y="-24" width="28" height="14" rx="2"/><text x="29" y="-14">선택</text></g>':''}<g class="std" transform="scale(.82)"><g class="count k" transform="translate(0 27)"><path class="kplate" d="M-31 0L-25 -11.5H25L31 0L25 11.5H-25Z"/><text y="3.4">${troopLabel(u.count)}</text><rect class="bar-bg" x="-20" y="5.8" width="40" height="2.6"/><rect class="bar" x="-20" y="5.8" width="${f(40 * ratio)}" height="2.6"/></g>${u.ready ? '<path class="rglow" d="M-17.5 -20.5H17.5V11L0 21.5L-17.5 11Z"/>' : ''}<path class="frame" d="M-16 -19H16V10L0 19.5L-16 10Z"/>
        ${u.portrait ? faceImage(u.portrait, 'w-face-shield') : `<text class="initial" y="7">${esc(String(u.name ?? '').slice(0, 1))}</text>`}
        <g class="troop" transform="translate(-19 -19)"><rect x="-7" y="-7" width="14" height="14" transform="rotate(45)"/><text y="4">${TROOP_GLYPH[troopKey(u)] ?? '兵'}</text></g>
        ${badges.map((b, i) => `<g class="badge" transform="translate(22 ${-13 + i * 15})"><rect x="-7" y="-7" width="14" height="14"/><text y="4">${b}</text></g>`).join('')}
        </g><text class="uname" y="-23">${esc(u.name)}</text>`}
      </g>
      ${lost ? `<text class="dmg ink-damage${u.heavyLoss?' heavy':''}" style="--damage-size:${Math.min(34,19+lost/60)}px" y="${f(-size * 2.6)}">${u.lossLabel ? esc(u.lossLabel) + ' ' : ''}−${troopLabel(lost)}</text>` : ''}
    </g>`;
  }
  svg += '<g class="w-fire-layer" pointer-events="none" aria-hidden="true"></g><g class="w-ink-fx" pointer-events="none" aria-hidden="true"></g>';
  // C159: existing bitmap effects on public map tiles; decorations never intercept clicks.
  for(const fx of model.fx??[]){if(!fx.to)continue;const a=C(fx.from??fx.to),z=C(fx.to),delay=Math.max(0,fx.elapsed??0),duration=fx.duration??1100;
   if(delay>=duration)continue;
   const arrow=fx.kind==='volley',tactic=fx.kind==='tactic',x=arrow?(a.x+z.x)/2:z.x,y=arrow?(a.y+z.y)/2:z.y+8,angle=Math.atan2(z.y-a.y,z.x-a.x)*180/Math.PI;
   svg+=`<g class="w-map-fx ${esc(fx.kind)}" style="animation-duration:${duration}ms;animation-delay:-${delay}ms" transform="translate(${f(x)} ${f(y)})">`;
   if(tactic)svg+=`<ellipse class="tactic-ring" rx="29" ry="15"/><ellipse class="tactic-ring inner" rx="22" ry="10"/>`;
   else svg+=`<image href="/assets/ui-v3/units-ink/fx-${arrow?'arrow':'clash'}.png" x="${arrow?-28:-25}" y="${arrow?-4:-25}" width="${arrow?56:50}" height="${arrow?8:50}"${arrow?` transform="rotate(${f(angle)})"`:''}/>`;
   if(fx.label)svg+=`<text class="effect-label" y="-28">${esc(fx.label)}</text>`;
   svg+='</g>';
  }
  return svg + renderMapPreview({blocked:hl.blocked},layout) + '</svg>';
}

// 부대 이동: 다시 그린 뒤 지난 자리에서 새 자리로 미끄러지게(Web Animations). 순간이동 거리(12칸 이상)는 건너뜀.
const lastPos = new Map();
export function animateUnits(root, {duration = 420} = {}) {
  const seen = new Set();
  for (const g of root?.querySelectorAll?.('g.w-unit[data-unit]') ?? []) {
    const id = g.dataset.unit, x = Number(g.dataset.x), y = Number(g.dataset.y), prev = lastPos.get(id);
    seen.add(id); lastPos.set(id, {x, y});
    if (g.hasAttribute('data-troop-anchor') || !prev || (prev.x === x && prev.y === y) || Math.hypot(prev.x - x, prev.y - y) > 600 || !g.animate) continue;
    g.animate([{transform: `translate(${prev.x}px, ${prev.y}px)`}, {transform: `translate(${x}px, ${y}px)`}], {duration, easing: 'cubic-bezier(.35,.1,.25,1)'});
  }
  for (const id of [...lastPos.keys()]) if (!seen.has(id)) lastPos.delete(id);
}
