// 성 무대(CITY STAGE, 정본 §23) — 성 전경 → 건물 → 시설 장면(장수 큰 그림 + 그 시설의 명령).
// Claude 2026-10-08. 화면 연출은 Fable 시안(docs/work-integration/20261008/ui-v3/compare/fable-city-stage.html)에서 가져오고 실제 게임 상태로 채운다.
// 명령 자체는 컨트롤러의 성 창(#city-panel)을 시설 장면 오른쪽에 옮겨 붙여 그대로 쓴다(명령 처리 코드 그대로).

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// 건물: 이름·한자·기능·시설 장면에서 열 성 창 칸(pane)·선택 표식·조명
export const BUILDINGS = {
  office: {name: '관청', hanja: '官', fn: '행정 · 인사', pane: 'office', mark: 'seal', light: 'admin', sub: '가장 안쪽 높은 곳 · 성의 일을 정하는 곳'},
  residence: {name: '저택', hanja: '宅', fn: '머무는 장수 · 대화', pane: 'residence', mark: 'open', light: 'manor', sub: '조용한 안쪽 · 장수들이 머무는 곳'},
  market: {name: '시장', hanja: '市', fn: '교역 · 생산', pane: 'office', mark: 'scale', light: 'market', sub: '길이 만나는 곳'},
  granary: {name: '곡창', hanja: '倉', fn: '비축 · 배급', pane: 'office', mark: 'cong', light: 'granary', sub: '곡식 창고 구역'},
  tavern: {name: '주점', hanja: '酒', fn: '소문 · 술자리 · 재야', pane: 'tavern', mark: 'open', light: 'tavern', sub: '시장과 성문 사이 · 골목 안'},
  barracks: {name: '병영', hanja: '營', fn: '출진 · 편성', pane: 'barracks', mark: 'tally', light: 'barracks', sub: '성벽 안쪽 · 진입로 옆'},
  workshop: {name: '공방', hanja: '工', fn: '제작 · 시설', pane: 'office', mark: 'cong', light: 'granary', sub: '중심에서 조금 떨어진 곳'},
  gate: {name: '성문', hanja: '門', fn: '출입 · 성벽', pane: 'office', mark: 'pushou', light: 'gate', sub: '바깥 경계'},
};
const MARKS = {
  tally: `<svg viewBox="0 0 26 26"><path class="tl" d="M3 8.5h9.5v2.5h-2.2v4h2.2v2.5H3z"/><path class="tr" d="M23 8.5h-9.5v2.5h2.2v4h-2.2v2.5H23z"/></svg>`,
  seal: `<svg viewBox="0 0 26 26"><rect x="4" y="4" width="18" height="18"/><rect class="inner" x="9" y="9" width="8" height="8"/></svg>`,
  scale: `<svg viewBox="0 0 26 26"><path class="beam" d="M3 9h20M6 9v2M20 9v2"/><path d="M13 5v16M9 21h8"/></svg>`,
  pushou: `<svg viewBox="0 0 26 26"><circle cx="9" cy="6.5" r="1.4"/><circle cx="17" cy="6.5" r="1.4"/><path d="M8 10h10"/><circle class="ring" cx="13" cy="16" r="5"/></svg>`,
  open: `<svg viewBox="0 0 26 26"><circle class="open" cx="13" cy="13" r="8.5"/></svg>`,
  cong: `<svg viewBox="0 0 26 26"><rect x="4" y="4" width="18" height="18"/><circle cx="13" cy="13" r="4.5"/></svg>`,
};
// 그림이 없을 때 쓰는 건물 자리(지도 미니어처 1216×832 기준 발밑) — Fable 시안의 업 좌표
const FALLBACK_ANCHORS = {office: [618, 268], residence: [512, 322], market: [632, 438], granary: [852, 468], tavern: [712, 545], barracks: [626, 596], gate: [792, 656], workshop: [520, 470]};
const CITY_FILE = {west: 'ye', east: 'ji', south: 'nanpi', yijing: 'yijing', zhongshan: 'zhongshan', xindu: 'xindu', julu: 'julu', pingyuan: 'pingyuan'};
export const cityFile = (cityId) => CITY_FILE[cityId] ?? 'ye';

// 태수 판 바로가기 표(page-city-v2 의 네모 단추: 위 화살 · 칼 · 주머니 · 망치)
const ACT_ICON = {
  office: '<svg viewBox="0 0 24 24"><path d="M12 3l7 8h-4.5v10h-5V11H5z"/></svg>',
  barracks: '<svg viewBox="0 0 24 24"><path d="M4 3l11.5 11.5-1.6 1.6L2.4 4.6V3zM20 3h1.6v1.6L10.1 16.1l-1.6-1.6zM5.2 15.6l3.2 3.2-2.6 2.6-1.4-.2-1.6-1.6-.2-1.4zM18.8 15.6l2.6 2.6-.2 1.4-1.6 1.6-1.4.2-2.6-2.6z"/></svg>',
  market: '<svg viewBox="0 0 24 24"><path d="M9 3h6l-1.6 3.2c3.9 1.6 6.6 5.6 6.6 9.3C20 19.6 16.6 21 12 21s-8-1.4-8-5.5c0-3.7 2.7-7.7 6.6-9.3z"/></svg>',
  workshop: '<svg viewBox="0 0 24 24"><path d="M3 5.5L7.5 2l3 3-1.4 1.4 9.9 9.9-2.1 2.1-9.9-9.9L5.6 9.9zM13.5 5.5l4.5-3.5 3 3-1.4 1.4L9 17l-2.1 2.1L4.8 17 6.9 14.9l10.6-8.1z"/></svg>',
};
// 흑묵 성 화면 그림(기준 page-city-v2 에서 GPT 가 한 장씩 뽑은 판·틀·표지·아이콘 — /assets/ui-v3/hud/)
const HUD = '/assets/ui-v3/hud/';
const BUILD_ICON = {office: 'b-office', residence: 'b-residence', market: 'b-market', granary: 'res-food', tavern: 'b-tavern', barracks: 'cmd-attack', workshop: 'b-build', gate: 'cmd-garrison'};
const ACT_IC = {office: 'b-develop', barracks: 'cmd-attack', market: 'b-trade', workshop: 'b-build'};
const ic = (name) => `<img class="ic" src="${HUD}icons/${name}.png" alt="" onerror="this.style.visibility='hidden'">`;
const SIL = '<svg viewBox="0 0 11 20"><path d="M5.5 0a2.1 2.1 0 1 1 0 4.2A2.1 2.1 0 0 1 5.5 0zM2.2 6.3C2.2 5.3 3.7 4.6 5.5 4.6s3.3.7 3.3 1.7V12H7.6l-.5 8H3.9l-.5-8H2.2z"/></svg>';

/** 이 성의 사람들을 건물에 앉힌다: 관청 = 태수, 병영 = 지휘 높은 자유 장수, 주점 = 재야(없으면 감화 높은 장수), 저택 = 군주 또는 남은 장수. */
export function cityPeople(v, c) {
  const all = [...(c.freeOfficers ?? []).map((o) => v.officers[o.officerId] ?? o)];
  const gov = c.governorId ? v.officers[c.governorId] : null;
  const ruler = v.faction?.rulerOfficerId ?? v.faction?.rulerId;
  const pool = [gov, ...all].filter(Boolean).filter((o, i, a) => a.findIndex((x) => x.officerId === o.officerId) === i);
  const by = (k) => [...pool].sort((a, b) => (b.baseStats?.[k] ?? 0) - (a.baseStats?.[k] ?? 0));
  const taken = new Set(), take = (o) => { if (o) taken.add(o.officerId); return o ?? null; };
  const office = take(gov ?? by('politics')[0]);
  const barracks = take(by('leadership').find((o) => !taken.has(o.officerId)) ?? null);
  const wanderer = (c.wanderers ?? [])[0];
  const tavern = wanderer ? {...wanderer, wanderer: true} : take(by('charisma').find((o) => !taken.has(o.officerId)) ?? null);
  const residence = take(pool.find((o) => o.officerId === ruler && !taken.has(o.officerId)) ?? pool.find((o) => !taken.has(o.officerId)) ?? null);
  return {office, barracks, tavern, residence};
}

/** 人牒: 사람이 들고 온 현안(최대 3 + 나머지 수). 게임 상태에서만 뽑는다. */
export function cityIssues(v, c, people, {idle = false} = {}) {
  const out = [], who = (o) => o?.name ?? '';
  const occ = c.occupation?.stage;
  if (occ === 'CAPTURED' || occ === 'OCCUPATION') out.push({to: 'office', by: people.office, text: '점령 처리 방식을 정해야 합니다', level: 'urgent'});
  if (idle) out.push({to: 'office', by: people.office, text: '생산할 일을 정해 주십시오', level: 'urgent'});
  if ((c.economyForecast?.food ?? 0) < 0) out.push({to: 'granary', by: people.office, text: '곳간이 줄고 있습니다', level: 'warn'});
  if ((c.securityLevel ?? 0) >= 1) out.push({to: 'office', by: people.office, text: '민심이 흔들립니다', level: 'warn'});
  if ((c.wanderers ?? []).length) out.push({to: 'tavern', by: people.tavern, text: `떠돌이 인재 ${c.wanderers.length}명이 주점에 머뭅니다`, level: 'new'});
  if ((c.musterOptions ?? []).length && (c.reserveTroops ?? 0) >= 200) out.push({to: 'barracks', by: people.barracks, text: '출진할 준비가 되었습니다', level: 'quiet'});
  if (people.residence && people.residence !== people.office) out.push({to: 'residence', by: people.residence, text: '찾아오면 이야기를 나눌 수 있습니다', level: 'quiet'});
  return out.filter((x) => x.by || x.to).map((x) => ({...x, name: who(x.by)}));
}

/** 그림·건물 위치: C82 전경(json)이 있으면 그것, 없으면 지도 미니어처 + 기본 자리. */
export async function loadStageArt(cityId, assetUrl, tone = '') {
  // 기준 시안(page-city-v2)의 그림 그대로: 시안에서 UI만 지운 판 한 장(세력 깃발 색이 다른 판이 있으면 그것)을 쓴다 — 사용자 2026-10-10 "뒤에 붙이는 그림은 시안 것 그대로". 건물 자리는 판 옆 json
  const plate = (tone && assetUrl(`scenes/plate-city-${tone}.webp`)) || assetUrl('scenes/plate-city.webp');
  if (plate) {
    try {
      const j = await fetch('/assets/ui-v3/scenes/plate-city.json').then((r) => r.json());
      const [w, h] = j.size ?? [1672, 941];
      const spots = Object.fromEntries((j.buildings ?? []).filter((b) => BUILDINGS[b.id]).map((b) => [b.id, {x: (b.anchor?.[0] ?? 0.5) * w, y: (b.anchor?.[1] ?? 0.5) * h}]));
      return {src: plate, w, h, spots, full: true, plate: true};
    } catch { /* 아래 옛 그림 */ }
  }
  const f = cityFile(cityId), img = assetUrl(`city-stage/${f}.webp`), meta = img ? `/assets/ui-v3/city-stage/${f}.json` : null; // 좌표 json 은 manifest 에 없어도 그림 옆에서 읽는다
  if (img && meta) {
    try {
      const j = await fetch(meta).then((r) => r.json());
      const [w, h] = j.size ?? [1920, 1080];
      const spots = Object.fromEntries((j.buildings ?? []).filter((b) => BUILDINGS[b.id]).map((b) => [b.id, {x: (b.anchor?.[0] ?? 0.5) * w, y: (b.anchor?.[1] ?? 0.5) * h, poly: b.poly}]));
      return {src: img, w, h, spots, full: true};
    } catch { /* 아래 기본값 */ }
  }
  const mini = assetUrl(`cities/${f}.png`);
  return {src: mini, w: 1216, h: 832, spots: Object.fromEntries(Object.entries(FALLBACK_ANCHORS).map(([k, [x, y]]) => [k, {x, y}])), full: false};
}

/** 성 전경 HTML(무대 안). art = loadStageArt 결과. */
export function overviewHtml({v, c, art, people, issues, date, facilityState = {}, portraits = {}, emblem = '', lordArt = null}) {
  const owner = c.ownerFactionId === v.factionId ? (v.faction?.name ?? '') : '';
  const fmt = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') : '—';
  const d = (n) => Number.isFinite(n) && n ? `<u class="${n > 0 ? '' : 'down'}">${n > 0 ? '+' : '−'}${Math.abs(Math.round(n))}</u>` : '';
  const sec = ['안정', '동요', '혼란'][c.securityLevel ?? 0] ?? '';
  const place = (id) => people[id] ? `<div class="cs-mark" data-spot="${id}">${SIL}<span>${esc(people[id].name)}</span>${portraits[people[id].officerId]?.path ? `<div class="face"><img src="${esc(portraits[people[id].officerId].path)}" alt=""></div>` : ''}</div>` : '';
  const spots = Object.entries(art.spots).map(([id, s]) => {
    const b = BUILDINGS[id]; if (!b) return '';
    return `<button class="cs-spot" data-spot="${id}" data-hanja="${b.hanja}" style="left:${(s.x / art.w * 100).toFixed(3)}%;top:${(s.y / art.h * 100).toFixed(3)}%" aria-label="${b.name}"><span class="mk"><img class="mk-art" src="${HUD}city-marker.png" alt="">${ic(BUILD_ICON[id] ?? 'b-office')}</span><i class="glow"></i><svg class="ring" viewBox="-60 -37 120 74"><ellipse class="full" cx="0" cy="0" rx="46" ry="28"/><path class="half" d="M-46,0 A46,28 0 0,0 46,0"/></svg><span class="label"><b>${b.name}</b><small>${b.fn}</small></span>${place(id)}</button>`;
  }).join('');
  const shown = issues.slice(0, 3), more = issues.length - shown.length;
  // 흑묵판(page-city-v2): 왼쪽 = 건물에 앉은 사람의 둥근 초상 + 건물 표(누르면 그 건물), 오른쪽 = 태수 판(큰 그림·능력 막대·건물 바로가기)
  const cast = ['office', 'barracks', 'tavern', 'residence'].filter((k) => people[k]).map((k) => {
    const o = people[k], face = portraits[o.officerId]?.path, iss = issues.find((x) => x.by === o && x.level !== 'quiet');
    return `<button class="face-btn ${iss?.level ?? ''}" data-spot="${iss?.to ?? k}" title="${esc(o.name)} · ${BUILDINGS[k].name}${iss ? ` — ${esc(iss.text)}` : ''}"><span class="disc">${face ? `<img src="${esc(face)}" alt="">` : ''}</span><img class="frame" src="${HUD}city-cast-frame.png" alt=""><span class="badge">${ic(BUILD_ICON[k])}</span><span class="tag"><b>${esc(o.name)}</b>${iss ? `<em>${esc(iss.text)}</em>` : `<small>${BUILDINGS[k].name}</small>`}</span></button>`;
  }).join('');
  const lord = people.office, st = lord?.baseStats ?? {};
  const bar = (k, label, cls) => `<i class="bar ${cls}" title="${label} ${st[k] ?? '—'}"><u style="width:${Math.max(0, Math.min(100, st[k] ?? 0))}%"></u><b>${st[k] ?? '—'}</b></i>`;
  const lordTone = {F01: 'red', F02: 'green', F03: 'blue'}[v.factionId] ?? 'red';
  const lordHtml = lord ? `<aside class="cs-lord"><img class="panel" src="${HUD}city-lord-${lordTone}.png" alt="" onerror="this.onerror=null;this.src='${HUD}city-lord-red.png'">${v.factionId ? `<img class="em" src="${HUD}faction-banner-${esc(v.factionId)}.png" alt="" onerror="this.onerror=null;this.src='/assets/ui-v3/emblems/${esc(v.factionId)}.png'">` : ''}<b class="nm">${esc(lord.name)}<small>${lord.officerId === c.governorId ? '태수' : '관청'}</small></b><div class="art">${lordArt ? `<img src="${esc(lordArt)}" alt="${esc(lord.name)}">` : ''}</div>${bar('politics', '정무', 'b1')}${bar('leadership', '지휘', 'b2')}<div class="acts">${['office', 'barracks', 'market', 'workshop'].filter((k) => art.spots[k]).map((k) => `<button class="act ${k}" data-spot="${k}" title="${BUILDINGS[k].name} · ${BUILDINGS[k].fn}"><img class="sq" src="${HUD}city-btn.png" alt="">${ic(ACT_IC[k])}<span>${BUILDINGS[k].name}</span></button>`).join('')}</div></aside>` : '';
  return `<div class="cs-stage"><img class="cs-under" src="${esc(art.src)}" alt="" aria-hidden="true"><div class="cs-fit${art.full ? ' full' : ''}${art.plate ? ' plate' : ''}" style="--ar:${(art.w / art.h).toFixed(4)}"><div class="cs-camera"><img class="cs-img" src="${esc(art.src)}" alt="" draggable="false"><i class="cs-light"></i><i class="cs-fog a"></i><i class="cs-fog b"></i><div class="cs-spots">${spots}</div></div></div><i class="cs-vignette"></i></div>
  <header class="cs-top"><div class="cell id">${emblem}<span class="name">${esc(c.name)}</span></div><div class="cell owner"><i style="background:var(--fc)"></i>${esc(owner || '우리 성')}<small>${c.kind === 'minor' ? '작은 성' : '큰 성'}</small></div><div class="cell date">${esc(date)}</div>
    <div class="cell vitals"><span>식량<b>${fmt(c.foodStock)}</b>${d(c.economyForecast?.food)}</span><span>인구<b>${fmt(c.population)}</b></span><span>예비병<b>${fmt(c.reserveTroops)}</b></span><span>치안<b>${sec}</b></span>${facilityState.working ? `<span class="role">생산 · ${esc(facilityState.working)}</span>` : ''}</div>
    <div class="cell back"><button class="cs-world" title="지도로 (Esc)">‹ 천하로</button></div></header>
  <aside class="cs-roster"><div class="panel"><h2>인첩</h2><div class="spine">${shown.map((x) => `<button class="entry ${x.level}" data-spot="${x.to}"><span class="who"><b>${esc(x.name || BUILDINGS[x.to]?.name)}</b><span class="where">${BUILDINGS[x.to]?.name ?? ''}</span></span><p><i class="issue-mark"></i>${esc(x.text)}</p></button>`).join('') || '<p class="calm">오늘은 조용합니다.</p>'}</div>${more > 0 ? `<div class="more"><b>+${more}</b> 다른 현안</div>` : ''}</div><div class="hint"><kbd>Alt</kbd>모든 건물 이름 · <kbd>Esc</kbd>천하로</div></aside>
  <nav class="cs-cast">${cast}</nav>${lordHtml}
  <footer class="cs-pulse"${(facilityState.news ?? []).length ? ` title="${esc(facilityState.news.slice(0, 4).map((n) => `${n.tag} ${n.text}`).join(' · '))}"` : ''}>${(facilityState.gauges ?? []).length ? `<ol class="cs-gauges">${facilityState.gauges.map((g) => `<li class="${esc(g.tone ?? '')}" title="${esc(g.label)} ${esc(g.text ?? '')}">${ic(g.ic)}<i><u style="width:${Math.max(0, Math.min(100, g.pct ?? 0)).toFixed(0)}%"></u></i><b>${esc(g.text ?? '')}</b></li>`).join('')}</ol>` : ''}<div class="lab"><i></i>도시 소식</div><ul>${(facilityState.news ?? []).slice(0, 4).map((n) => `<li><em>${esc(n.tag)}</em><span>${esc(n.text)}</span></li>`).join('') || '<li><span>새 소식이 없습니다.</span></li>'}</ul></footer>`;
}

/** 시설 장면 HTML(명령 칸은 비워 두고 컨트롤러가 성 창을 옮겨 붙인다). */
export function facilityHtml({c, id, officer, line, bg, art, spot, portraits = {}, others = []}) {
  const b = BUILDINGS[id], full = officer && portraits[officer.officerId]?.full;
  const ox = spot ? (spot.x / art.w * 100).toFixed(2) : 50, oy = spot ? (spot.y / art.h * 100).toFixed(2) : 50;
  const scene = bg ? `<img class="cs-bg" src="${esc(bg)}" alt="">` : `<div class="cs-blur"><img src="${esc(art.src)}" alt="" style="transform-origin:${ox}% ${oy}%;transform:translate(${(50 - ox).toFixed(2)}%,${(50 - oy).toFixed(2)}%) scale(3.1)"></div>`;
  return `<div class="cs-scene light-${b.light}">${scene}<i class="l1"></i><i class="l2"></i><i class="cs-floor"></i><i class="cs-grain"></i></div>
  ${full ? `<div class="cs-officer"><img src="${esc(full)}" alt="${esc(officer.name)}"><i class="shade"></i></div>` : ''}<i class="cs-fore" aria-hidden="true"></i>
  ${officer && line ? `<p class="cs-quote">${esc(line)}</p>` : ''}
  ${officer ? `<div class="cs-nameplate"><i class="ln"></i><div><b>${esc(officer.name)}</b><span>${b.name}${officer.wanderer ? ' · 재야' : ''}</span></div></div>` : ''}
  <div class="cs-crumb"><span class="path"><b>${esc(c.name)}</b><i>›</i><b>${b.name}</b></span><span class="sep"></span><button class="cs-back">← 성 <kbd>Esc</kbd></button></div>
  <div class="cs-ftitle"><h1>${b.name}<small>${b.hanja}</small></h1><div class="sub">${b.sub}</div></div>
  <div class="cs-commands" data-mark="${b.mark}" data-fac="${id}"><span class="mk">${MARKS[b.mark]}</span></div>
  <div class="cs-others"><span class="k">이곳의 사람</span>${others.map((o) => `<span><b>${esc(o.name)}</b>${o.note ? `<i>${esc(o.note)}</i>` : ''}</span>`).join('') || '<span class="emp">맡은 장수 없음</span>'}</div>`;
}
