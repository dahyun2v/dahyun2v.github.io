// @ts-check
// 유니티 UI/UX 방 (Claude, 2026-10-24) — 화면 ③ 성 / 내정 모델.
// 화면 설계: docs/work-integration/20261023/screen-mockups/10-domestic/DESIGN.md v1.2(개발총괄 방) — 규칙 · 값은 지금 게임 그대로(내정 v3 는 설계 중).
// 값: 플레이어 공개 view 의 성(ownCities) + 엔진 공개 질의(긴급 징병 예상) + 웹 화면 모듈의 읽기 함수(productionReadout · cityGrowthHint). 계산 규칙을 새로 만들지 않는다.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';
import {facilityModel} from './facility-model.mjs';
import {cityV3} from './city-v3-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Econ, Hud, City, Display] = await Promise.all([
  load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-economy.mjs'), load('prototype/app/world/hud-ink.mjs'),
  load('prototype/app/world/city-stage.mjs'), load('prototype/src/troop-display.mjs'),
]);
const POLICY = {balanced: '균형', agriculture: '농업', commerce: '상업', military: '군사', delegated: '위임'};
const num = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const signed = (n) => (!Number.isFinite(n) ? '' : n > 0 ? `+${num(n)}` : n < 0 ? `−${num(-n)}` : '0');

/** 성 장면 그림(웹 loadStageArt 와 같은 판) + 건물 자리(plate-city.json) + 시설 누름 상자(city-life). */
function stageArt(tone) {
  const art = `assets/ui-v3/scenes/plate-city${['F01', 'F03'].includes(tone) ? '-' + tone : ''}.webp`;
  const j = JSON.parse(readFileSync(resolve(ROOT, 'prototype/assets/ui-v3/scenes/plate-city.json'), 'utf8'));
  let boxes = {};
  try { boxes = JSON.parse(readFileSync(resolve(ROOT, 'prototype/assets/ui-v3/dots-1016/city-life/plate-city.json'), 'utf8')).hitBoxes ?? {}; } catch { /* 없으면 빛 없음 */ }
  const [w, h] = j.size ?? [1672, 941];
  return {art, w, h, spots: Object.fromEntries((j.buildings ?? []).map((b) => [b.id, {x: (b.anchor?.[0] ?? 0.5) * w, y: (b.anchor?.[1] ?? 0.5) * h}])), boxes};
}
/** 시설 종류 → 장면 안 자리 이름(웹 naejeongHtml 의 대응 그대로: farm → granary 자리 등). */
const SPOT_OF = {farm: 'granary', tuntian: 'residence', clinic: 'tavern', mufu: 'office'};

const DOMESTIC_CMD_FX = {CITY_TAX_ADVANCE: '다음 3턴 생산을 지금 받음 · 대가: 그 3턴 생산 0, 치안 한 단계 악화'};   // 웹 world.js:3350

export function cityModel(state, cityId = null) {
  const v = R.view(state), c = v.ownCities[cityId ?? v.faction.capitalCityId] ?? Object.values(v.ownCities)[0];
  if (!c) return null;
  const job = (kind) => c.jobs?.find((j) => j.kind === kind) ?? null;
  const cur = c.currentProduction ? job(c.currentProduction.kind) : null, curRead = cur?.estimate ? Hud.productionReadout(cur.estimate) : null;
  const nxt = c.nextProduction ? job(c.nextProduction.kind) : null, nxtRead = nxt?.estimate ? Hud.productionReadout(nxt.estimate) : null;
  const ledger = c.foodLedger ?? {}, net = ledger.forecastNet ?? c.economyForecast?.food;
  const st = stageArt(c.ownerFactionId ?? v.factionId), spotId = c.currentProduction ? (st.spots[c.currentProduction.kind] ? c.currentProduction.kind : SPOT_OF[c.currentProduction.kind]) : null;
  const box = spotId ? st.boxes[spotId] ?? null : null;
  const gov = c.governorSlot?.officerId ?? c.governorId ?? null;
  const seats = Object.entries(c.departments ?? {}).map(([k, s]) => ({key: k, name: s.name, officer: s.officerId ? v.officers[s.officerId]?.name ?? s.officerId : null, art: s.officerId ? officerArt(s.officerId) : null, head: s.officerId ? artHead(officerArt(s.officerId)) : null}));
  const cityOfficers = Object.values(v.officers).filter((o) => o.allegianceFactionId === v.factionId && o.locationRef?.kind === 'CITY' && o.locationRef.id === c.cityId && o.officerId !== gov);
  const emergency = Econ.manpowerV2?.(state) ? Econ.emergencyConscriptionPreview(state, state.cities[c.cityId]) : null;
  const rows = [
    {key: 'food', label: '식량', value: `${num(c.foodStock)} / ${num(c.foodCapacity)}`, hint: Number.isFinite(ledger.turnsUntilEmpty) && ledger.turnsUntilEmpty !== null ? `바닥까지 ${num(ledger.turnsUntilEmpty)}차례` : '', danger: Number.isFinite(ledger.turnsUntilEmpty)},
    {key: 'reserve', label: '예비병', value: Display.troopText(c.reserveTroops ?? 0), hint: '', danger: false},
    {key: 'security', label: '치안', value: Hud.citySecurityName?.(c) ?? c.securityName ?? '—', hint: '', danger: false},
    ...(Number.isFinite(c.durability) && (c.durability < c.durabilityMax || c.besieged) ? [{key: 'wall', label: '성벽', value: `${num(c.durability)} / ${num(c.durabilityMax)}`, hint: c.besieged ? '포위 중' : '', danger: !!c.besieged}] : []),
    ...((c.woundedTroops ?? 0) > 0 ? [{key: 'wounded', label: '부상병', value: Display.troopText(c.woundedTroops), hint: '', danger: false}] : []),
  ];
  const ids = Object.keys(v.ownCities).sort((a, b) => (a === v.faction.capitalCityId ? -1 : b === v.faction.capitalCityId ? 1 : String(v.ownCities[a].name).localeCompare(String(v.ownCities[b].name), 'ko')));
  const at = ids.indexOf(c.cityId), nav = ids.length > 1 ? {prevId: ids[(at - 1 + ids.length) % ids.length], nextId: ids[(at + 1) % ids.length]} : {prevId: null, nextId: null};
  return {
    screen: 'city-domestic', cityId: c.cityId, name: c.name, ...nav, policy: `성 방침 · ${POLICY[c.domesticPolicy?.effective ?? c.domesticPolicy ?? 'balanced']} ▸`,
    facilities: facilityModel(state, v, c),
    stage: {spots: st.spots, art: st.art, w: st.w, h: st.h, light: box ? {x: box[0] + box[2] / 2, y: box[1] + box[3] / 2, rx: box[2] / 2 * 1.6, ry: box[3] / 2 * 1.6} : null},
    current: cur ? {kind: cur.kind, name: cur.name, image: `assets/ui-kit/own/screens-v5/city/${cur.kind}.webp`, turns: curRead?.turns ?? null,
      progress: cur.estimate?.cost ? Math.max(0, Math.min(1, cur.estimate.progress / cur.estimate.cost)) : 0, blocked: c.jobBlocked ?? null} : null,
    next: nxt ? {kind: nxt.kind, name: nxt.name, image: `assets/ui-kit/own/screens-v5/city/${nxt.kind}.webp`, turns: nxtRead?.turns ?? null} : null,
    population: {value: c.population, max: c.populationCapacity, growth: Number.isFinite(c.growthProgress) && c.population > 0 ? Math.max(0, Math.min(1, c.growthProgress / (c.population * 6))) : 0, hint: City.cityGrowthHint?.(c) ?? ''},
    yields: [['food', '식량', net], ['production', '생산', c.economyForecast?.production], ['learning', '학문', c.economyForecast?.science], ['renown', '인망', c.economyForecast?.prestige]]
      .filter(([, , n]) => Number.isFinite(n)).map(([key, label, n]) => ({key, label, text: signed(n), sign: Math.sign(Math.round(n))})),
    rows,
    governor: gov ? {name: v.officers[gov]?.name ?? gov, art: officerArt(gov), head: artHead(officerArt(gov))} : null,
    seats, seatHint: seats.some((s) => !s.officer) ? (cityOfficers.length ? '빈 자리를 눌러 맡기기' : '이 성에 맡길 장수 없음') /* 문구 = 설계서 10-domestic §1 표시 조건 */ : '',
    // 새 내정(v3) — 판이 trialRules.domesticV3 이면(웹 v3View) 기능 묶음 · 없으면 null(옛 내정 그대로)
    v3: cityV3(state, v, c),
    // 성 '특기'(웹 관청 특기 탭 world.js:2770 data-osec="cmds"): 내정 특기 명령 — 이름 · 효과 · 학문/인망 비용 · 막힌 까닭 · 엔진 명령 그대로(world.js:2933)
    domestic: (c.domesticCommands ?? []).map((d) => ({label: d.label, fx: DOMESTIC_CMD_FX[d.type] ?? '',
      cost: Number.isFinite(d.cost) ? `${d.resource === 'science' ? '학문' : '인망'} ${Number(d.cost).toLocaleString('ko-KR')}` : '', reason: d.blockedReason ?? null,
      command: {type: d.type, cityId: d.cityId, ...(d.resource ? {resource: d.resource} : {}), ...(d.officerId ? {officerId: d.officerId} : {})}})),
    troops: [{key: 'sortie', label: '출진'}, {key: 'transfer', label: '병력 이송'}, ...(emergency ? [{key: 'emergency', label: `긴급 징병 +${Display.troopText(emergency.amount ?? emergency.troops ?? 0)}명`, reason: emergency.blockedReason ?? emergency.reason ?? null}] : [])],
  };
}

/** 견본 장면: 엔진 명령으로 '생산 중 + 예약'(설계서 v1 기본 상태)을 만든다 — 값은 모두 엔진이 계산. */
export function withProduction(state, cityId, kind = 'farm', reserve = 'granary') {
  let s = R.step(state, {type: 'CITY_JOB', cityId, kind});
  if (reserve) s = R.step(s, {type: 'CITY_RESERVE_JOB', cityId, kind: reserve});
  return s;
}
