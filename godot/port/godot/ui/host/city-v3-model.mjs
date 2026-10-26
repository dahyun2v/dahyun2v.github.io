// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-25) — 성 화면 ③ 에 새 내정(v3) 기능 붙이기(사용자 "내정 구현은 언제 되니?" · 총괄 10-25).
// 화면 겉모습은 지금 고도 성 화면 그대로(사용자 '나머지는 냅둬'), 기능 = 웹 domestic-v3-ui.mjs(C490)와 같게:
//   위 띠 자원 여섯(곡식 · 금 · 학문 · 인망 · 병사 · 무기고) · 경고 7종 · 성 내정 10묶음(성 이름 · 등급 · 성격 / 인구 / 산출 / 지금 생산 / 장수 자리 /
//   전문인력 / 치안 / 방침(+ 미리 보기 policyPreview · 징집 목표선) / 땅 / 비상) · 세력 창고 내역(군량 · 말 사기 · 학문 카드 · 내정 Crisis 응답).
// 글 = 웹 domestic-v3-text.mjs 그대로 · 값 = 엔진 공개 view(attachDomesticV3View). 명령은 웹 data-dv3 와 같은 모양(엔진 applyDomesticV3Command 가 검증).
// 규칙 계산 없음 — 웹 warningsV3 · breakdownV3 · recruitV3 를 그대로 부른다.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {readFileSync, existsSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [UI, TextMod, Trial, Crises, Cards] = await Promise.all([
  load('prototype/app/world/domestic-v3-ui.mjs'), load('prototype/app/world/domestic-v3-text.mjs'),
  load('prototype/src/domestic-v3.mjs'), import(pathToFileURL(resolve(ROOT, 'prototype/data/domestic-v3-crises.json')).href, {with: {type: 'json'}}),
  import(pathToFileURL(resolve(ROOT, 'prototype/data/domestic-v3-learning-cards.json')).href, {with: {type: 'json'}}),
]);
const text = TextMod.default, trial = Trial.DOMESTIC_V3;
const num = UI.numberV3;
const signed = (n) => `${n >= 0 ? '+' : '−'}${num(Math.abs(n ?? 0))}`;
const fill = (s, values) => String(s).replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
const RES_ICON = {food: 'food', gold: 'gold', science: 'learning', fame: 'renown', troops: 'troops', armory: 'armory', production: 'production'};
const iconPath = (k) => ['gold', 'armory'].includes(k) ? null : `assets/ui-kit/own/sym/resources/${RES_ICON[k] ?? k}.webp`;
const glyph = (k) => (k === 'gold' ? '金' : k === 'armory' ? '武' : '');
const facilityName = (k) => text.facilities[k]?.name ?? ({office: '관청', trainingGround: '훈련소'})[k] ?? k;
const specName = (k) => ({agronomist: '농관', military: '군관'})[k] ?? text.facilities.specialistNames[k] ?? k;
const character = (k) => ({grain: '곡식', gold: '금', troops: '군사', learning: '학문', fort: '수성'})[k] ?? k;
const policyName = (k) => text.hall.policy.list[k]?.name ?? k;
// 시설 그림 = 지금 고도 성 화면이 쓰는 판(screens-v5/city) · 없으면 웹 v3 facility-art · 둘 다 없으면 null(빈 칸에 생산 아이콘)
const facilityArt = (k) => {
  if (!k) return null;
  const kind = k === 'trainingGround' ? 'barracks' : k;
  for (const p of [`assets/ui-kit/own/screens-v5/city/${kind}.webp`, `assets/facility-art/${kind}_v1.png`]) if (existsSync(resolve(ROOT, 'prototype', p))) return p;
  return null;
};

// 웹 world.js reasonText(ERROR_TEXT) — world.js 는 화면 모듈이라 부를 수 없어 그 글표만 읽어 쓴다(규칙 아님 · 오류 낱말 → 한국어).
let ERRORS = null;
export function errorText(code) {
  if (!code) return '';
  if (/[가-힣]/.test(code)) return code;
  if (code === 'NO_DAMAGED_FACILITY') return '고칠 시설이 없음';
  if (!ERRORS) {
    ERRORS = {};
    try {
      const src = readFileSync(resolve(ROOT, 'prototype/app/world/world.js'), 'utf8');
      const m = /const ERROR_TEXT=(\{.*?\});\n/s.exec(src);
      if (m) Object.assign(ERRORS, new Function(`return ${m[1]}`)());
      for (const a of src.matchAll(/^ERROR_TEXT\.(\w+)='([^']*)';$/gm)) ERRORS[a[1]] = a[2];
    } catch { /* 글표가 없으면 아래 기본 글 */ }
  }
  return ERRORS[code] ?? '조건 미충족';
}

/** 웹 v3 화면이 켜지는 조건(v3View): 세력 창고 · 금고 값이 있음 = trialRules.domesticV3 */
export const v3On = (v) => UI.v3View(v);

/** @param {any} v 엔진 view · @param {any} c 그 성 view(ownCities) */
export function cityV3(state, v, c) {
  if (!UI.v3View(v)) return null;
  const cmd = (p) => ({cityId: c.cityId, ...p});
  // ── 위 띠(웹 resourceChipsV3 와 같은 여섯) ──
  const cities = Object.values(v.ownCities ?? {}), l = v.learning;
  const arms = Object.entries(v.armory ?? {}).sort((a, b) => a[1] - b[1])[0];
  const danger = v.granary === 0 || (v.granaryTurnsLeft !== null && v.granaryTurnsLeft <= 3);
  const soldiers = cities.reduce((n, x) => n + (x.reserveTroops ?? 0) + (x.woundedTroops ?? 0), 0) + Object.values(v.ownArmies ?? {}).reduce((n, a) => n + a.troopCount, 0);
  const chips = [
    {key: 'food', label: text.topBar.grain.label, value: `${num(v.granary)} 석`, sub: `${signed(v.granaryNet)}${v.granaryNet < 0 && v.granaryTurnsLeft !== null ? ' · ' + v.granaryTurnsLeft + '차례' : ''}`,
      tip: danger ? `곡식이 ${v.granaryTurnsLeft ?? 0}차례 뒤 바닥` : text.topBar.grain.tooltip.split(' 지금')[0], warn: danger, down: (v.granaryNet ?? 0) < 0},
    {key: 'gold', label: text.topBar.gold.label, value: `${num(v.treasury)} 금`, sub: signed(v.treasuryNet), tip: text.topBar.gold.tooltip, warn: (v.unpaidTurns ?? 0) > 0, down: (v.treasuryNet ?? 0) < 0},
    ...(l ? [{key: 'science', label: text.topBar.learning.label, value: num(l.science), sub: `${l.learningChoice ? '● ' : ''}${l.nextThreshold === null ? '모든 카드 문턱 도달' : '다음 카드 ' + num(l.nextThreshold)}`, tip: text.topBar.learning.tooltip, warn: !!l.learningChoice, down: false}] : []),
    {key: 'fame', label: '인망', value: num(v.faction?.prestige), sub: null, tip: text.topBar.prestige.tooltip, warn: false, down: false},
    {key: 'troops', label: '병사', value: `${num(soldiers)} 명`, sub: null, tip: text.topBar.soldiers.tooltip, warn: false, down: false},
    ...(arms ? [{key: 'armory', label: '무기고', value: `${text.armory.kinds[arms[0]]?.label ?? arms[0]} ${num(arms[1])}`, sub: null, tip: text.armory.tooltip, warn: false, down: false}] : []),
  ].map((x) => ({...x, icon: iconPath(x.key), glyph: glyph(x.key)}));
  // ── 세력 창고 · 내역(웹 resourceDetailsV3) ──
  const choice = l?.learningChoice;
  const ledger = {
    title: '세력 창고 · 내역',
    lines: [
      `곡식 ${num(v.granary)} 석 · ${signed(v.granaryNet)} / 차례`,
      ...cities.flatMap((x) => [`${x.name} · ${UI.breakdownV3(x, 'food')}`,
        ...['incoming', 'outgoing'].flatMap((k) => (x.foodLedger?.[k] ?? []).map((r) => `${k === 'incoming' ? '들어옴' : '나감'} · ${r.label ?? r.kind} ${num(r.amount)} 석`))]),
      '나감: 성 안 병사 · 야전 · 성장 · 비축 채움 포함 · 순증은 다음 정산 예상',
      `금 ${num(v.treasury)} 금 · ${signed(v.treasuryNet)} / 차례 · 봉록 ${num(v.goldUpkeep?.total)} 금`,
    ],
    actions: [
      ...(v.grainBuy ? [{line: `군량 사기 · 남은 한도 ${num(v.grainBuy.remaining)} 석 · 석당 ${v.grainBuy.price} 금`, label: '군량 사기 · 100금', command: {type: 'DV3_BUY_GRAIN', gold: 100},
        disabled: v.treasury < 100 || v.grainBuy.remaining <= 0, tip: '금 100 으로 군량을 산다'}] : []),
      ...(v.armory ? [{line: Object.entries(v.armory).map(([k, n]) => `${text.armory.kinds[k]?.label ?? k} ${num(n)}`).join(' · '), label: `${text.armory.buyHorse.label} · 100금`,
        command: {type: 'DV3_BUY_HORSES', gold: 100}, disabled: v.treasury < 100, tip: text.armory.buyHorse.tooltip}] : []),
    ],
    alerts: UI.warningsV3(v).map((r) => r.line),
    learning: choice ? {title: text.learningCards.title, line: text.learningCards.line, cards: (choice.cards ?? []).map((id) => {
      const card = Cards.default.cards.find((x) => x.id === id);
      return {id, name: card?.name ?? id, text: card?.text ?? '', command: {type: 'DV3_LEARNING_PICK', cardId: id}};
    })} : null,
    crises: (v.domesticCrises ?? []).map((x) => ({id: x.id, name: x.name, text: x.text ?? '',
      choices: x.turn >= v.turn && !x.responses?.[v.factionId] ? (x.choices ?? []).map((ch) => ({label: ch.name ?? ch.text ?? ch.id, command: {type: 'DV3_CRISIS_RESPONSE', crisisId: x.id, choiceId: ch.id}})) : []})),
  };
  // ── 경고(웹 warningsV3 — 출진 무구 부족은 출진 화면 몫이라 성 화면에선 빈 목록) ──
  const warnings = UI.warningsV3(v).map((r) => r.line);
  // ── 성 묶음 ──
  const policy = c.domesticPolicy ?? {effective: 'balanced', overridden: false};
  // 이 성에 실제로 정해 둔 방침(위임 포함) — effective 는 위임을 푼 결과라 '지금' 표시는 이것으로(V1 지적)
  // 옛 값 domesticPolicy(문자)도 엔진 v3Policy 가 쓰므로 함께(V2 지적 — 엔진 domestic-v3.mjs:449 · 791 과 같은 순서)
  const rawPolicy = state.cities?.[c.cityId]?.domesticPolicyOverride ?? state.cities?.[c.cityId]?.domesticPolicy ?? null;
  const job = c.jobs?.find((j) => j.kind === c.currentProduction?.kind), e = job?.estimate;
  const nextJob = c.jobs?.find((j) => j.kind === c.nextProduction?.kind);
  const turnsLeft = e?.gain > 0 ? Math.ceil(Math.max(0, e.cost - e.progress) / e.gain) : null;
  const present = new Set([...(c.freeOfficers ?? []).map((o) => o.officerId ?? o), c.governorId, ...(c.seats ?? []).map((s) => s.officerId)].filter(Boolean));
  const seatOptions = [...present].map((id) => ({id, name: v.officers?.[id]?.name ?? id}));
  const sec = c.securityName ?? '안정';
  const secKey = sec === '혼란' ? 'chaos' : sec === '불안' ? 'uneasy' : 'stable';
  const causes = (c.securityCauses ?? []).map((x) => (typeof x === 'string' ? (text.cityView.securityCauses[x] ?? x) : x.label ?? x.kind));
  const grades = trial.grades.map((g) => ({id: g.id, name: g.name, minimum: g.minimum}));
  const top = grades[grades.length - 1].minimum;
  const pp = c.policyPreview ?? {};
  const previewLine = (k) => {
    const p = pp[k];
    if (!p) return '';
    const growth = p.growth > 0 ? `백성 +${num(p.growth)}명 · 곡식 ${num(p.growthGrain)}석` : '백성 늘리지 않음';
    return `${growth} · 징집 ${Math.round(p.recruitTarget * 1000) / 10}% · 짓는 순서 ${(p.buildOrder ?? []).map(facilityName).join(' → ')}${p.resolvesTo ? ` · 지금은 ${policyName(p.resolvesTo)}` : ''}`;
  };
  const recruit = c.recruit ? `징집 목표선 ${num(c.people * c.recruit.target)}명 · 다음 봉록 ${num(c.recruit.nextGoldUpkeep)}금 · 군량 ${num(c.recruit.nextFood)}석` : '';
  const emergencyIds = {reserve: 'EM-RESERVE', draft: 'EM-DRAFT', taxFree: 'EM-TAXFREE'};
  const emOrder = (id) => Crises.default.emergency?.orders?.find((o) => o.id === id);
  const breakdown = (k) => UI.breakdownV3(c, k);
  return {
    chips, warnings, ledger,
    title: `${c.name} · ${c.gradeName ?? c.grade}`, titleTip: text.cityView.title.tooltip,
    characters: (c.characters ?? []).map(character),
    // 2 인구 + 등급 막대(문턱 = 엔진 grades — 15만 · 25만 · 40만, 막대 끝 = 마지막 문턱 × 1.25 라 '끝 = 가득'으로 읽히지 않게)
    people: {value: c.people, cap: c.peopleCapacity, text: `${num(c.people)} / ${num(c.peopleCapacity)} 명`, growth: c.growthNext,
      growthText: `다음 차례 ${signed(c.growthNext)}${c.people >= c.peopleCapacity ? ' · 땅이 넓어지면 열림' : ''}`, tip: text.cityView.people.tooltip},
    grade: {id: c.grade, name: c.gradeName ?? c.grade, scaleMax: top * 1.25, marks: grades.filter((g) => g.minimum > 0).map((g) => ({name: g.name, at: g.minimum, label: num(g.minimum)})),
      next: grades.find((g) => g.minimum > c.people) ? (() => { const g = grades.find((x) => x.minimum > c.people); return `${g.name}까지 ${num(g.minimum - c.people)}명`; })() : '가장 높은 등급'},
    // 3 산출(웹 c490-output — 값 = outputBreakdown total · 툴팁 = breakdownV3)
    output: [['food', '곡식'], ['gold', '금'], ['production', '생산'], ['science', '학문']].map(([k, n]) => ({key: k, label: n, value: num(c.outputBreakdown?.find((r) => r.resource === k)?.total), tip: breakdown(k), icon: iconPath(k), glyph: glyph(k)})),
    // 4 지금 생산
    production: {name: job?.name ?? '쉬는 중', kind: job?.kind ?? null, art: facilityArt(job?.kind), turns: turnsLeft, progress: e?.cost ? Math.max(0, Math.min(1, e.progress / e.cost)) : 0,
      line: e?.gain > 0 ? `${turnsLeft}차례 남음` : '생산을 고르세요', next: nextJob?.name ?? null, nextKind: nextJob?.kind ?? null,
      hurry: Number.isFinite(c.hurryCost) ? {label: `${text.hall.hurry.label} · ${num(c.hurryCost)}금`, tip: text.hall.hurry.tooltip, command: cmd({type: 'DV3_HURRY'}), disabled: (v.treasury ?? 0) < c.hurryCost} : null,
      clearReserve: nextJob ? cmd({type: 'CITY_RESERVE_JOB', kind: null}) : null,
      // 다른 세력 고유 시설(UNIQUE_FACILITY_LOCKED)은 이 성에서 영영 못 지어 뺀다(옛 웹 campaign.js:670 과 같음 — v3 웹은 낱말 그대로 보였음)
      jobs: (c.jobs ?? []).filter((j) => !['muster', 'reorganize'].includes(j.kind) && j.blockedReason !== 'UNIQUE_FACILITY_LOCKED').map((j) => ({kind: j.kind, name: j.name, art: facilityArt(j.kind),
        cost: j.estimate?.cost ?? null, turns: j.estimate?.gain > 0 ? Math.ceil(Math.max(0, j.estimate.cost - j.estimate.progress) / j.estimate.gain) : null,
        note: v.domesticStandards?.includes(j.kind) ? '이미 표준 — 다른 성은 알아서 지음' : '', blocked: j.blockedReason ? errorText(j.blockedReason) : null,
        start: cmd({type: 'CITY_JOB', kind: j.kind}), reserve: cmd({type: 'CITY_RESERVE_JOB', kind: j.kind}), current: j.kind === job?.kind, reserved: j.kind === nextJob?.kind}))},
    // 5 장수 자리(관청 = 태수 · 시설마다 하나) · 고르기 = DV3_SEAT(officerId null = 자동 배치)
    seats: (c.seats ?? []).map((s) => {
      const o = s.officerId ? v.officers?.[s.officerId] : null, training = c.specialists?.[s.specialist]?.training?.find((t) => t.seat === s.kind);
      return {kind: s.kind, name: facilityName(s.kind), officerId: s.officerId ?? null, officer: o?.name ?? null, art: s.officerId ? officerArt(s.officerId) : null, head: s.officerId ? artHead(officerArt(s.officerId)) : null,
        state: s.officerId ? (s.active ? '근무' : '출진') : '빈 칸', speed: `가속 ${Math.round((s.accelerationPercent ?? 0) * 10) / 10}%`, specialist: specName(s.specialist),
        training: training?.turnsLeft === null ? '양성 멈춤' : `다음까지 ${training?.turnsLeft ?? '—'}차례`, locked: !!s.locked,
        line: text.facilities[s.kind === 'office' ? 'hall' : s.kind === 'trainingGround' ? 'barracks' : s.kind]?.seat ?? '',
        auto: cmd({type: 'DV3_SEAT', seat: s.kind, officerId: null}),
        options: seatOptions.map((x) => ({...x, command: cmd({type: 'DV3_SEAT', seat: s.kind, officerId: x.id}), current: x.id === s.officerId,
          label: x.id === s.officerId ? (s.locked ? `${x.name} · 지금(고정)` : `${x.name} · 지금 — 눌러 고정`) : x.name, disabled: x.id === s.officerId && !!s.locked}))};
    }),
    seatTip: text.cityView.officerRow.tooltip,
    // 6 전문인력
    specialists: {label: text.facilities.specialists.label, line: Object.entries(c.specialists ?? {}).map(([k, x]) => `${specName(k)} ${x.count}`).join(' · '),
      tip: `${Object.entries(c.specialists ?? {}).map(([k, x]) => `${specName(k)} ${x.count}`).join(' · ')} — ${text.facilities.specialists.tooltip}`},
    // 7 치안 + 면세
    security: {name: sec, level: c.securityLevel ?? 0, causes: causes.join(' · ') || '악화 원인 없음', effect: text.cityView.security.tooltip.effect[secKey], recover: text.cityView.security.tooltip.recover,
      taxFree: {label: text.emergency.taxFree.name, tip: text.emergency.taxFree.line, command: cmd({type: 'DV3_TAX_EXEMPT'})}},
    // 8 방침(이 성 · 기본 따름) + 미리 보기 + 징집 목표선(세력 전체)
    policy: {effective: policy.effective, name: policyName(rawPolicy ?? policy.effective), overridden: rawPolicy !== null,
      label: rawPolicy === null ? `기본(${policyName(policy.effective)})` : rawPolicy === 'delegated' ? `위임(지금 ${policyName(policy.effective)})` : policyName(rawPolicy),
      tip: text.hall.policy.tooltip,
      options: [...Object.entries(text.hall.policy.list).map(([k, x]) => ({key: k, name: x.name, line: x.line, preview: previewLine(k), command: cmd({type: 'DV3_POLICY_CITY', policy: k}), current: rawPolicy === k})),
        {key: 'default', name: '기본 따름', line: `세력 기본 방침(${policyName(v.domesticPolicyDefault ?? 'balanced')})을 따른다`, preview: '', command: cmd({type: 'DV3_POLICY_CITY', policy: null}), current: rawPolicy === null}],
      recruit, recruitLevels: [['low', '낮음'], ['normal', '보통'], ['high', '높음'], ['total', '총동원']].map(([k, n]) => ({key: k, name: `${n} · ${Math.round(trial.recruitTargets[k] * 1000) / 10}%`, command: {type: 'DV3_RECRUIT_TARGET', level: k}, current: state.factions?.[state.playerFactionId]?.recruitTarget === k}))},
    // 9 땅
    land: {line: `영역 ${(c.territory ?? []).length}칸`, tip: text.cityView.territory.tooltip,
      tiles: (c.buyableTiles ?? []).map((t) => ({tileId: t.tileId, label: `${t.tileId} · ${num(t.price)}금`, command: cmd({type: 'DV3_BUY_TILE', tileId: t.tileId}), disabled: (v.treasury ?? 0) < t.price})),
      inside: (c.resources?.resources ?? []).map((r) => r.name + (r.blocked ? ' · 멈춤' : '')).join(' · ') || '특산 없음',
      outside: (c.resources?.visibleResources ?? []).map((r) => r.name).join(' · ') || '보이는 특산 없음'},
    // 10 비상
    emergency: {label: text.cityView.emergency.label, tip: text.cityView.emergency.tooltip,
      orders: Object.entries(emergencyIds).map(([k, id]) => ({id, name: text.emergency[k].name, line: text.emergency[k].line, command: cmd({type: 'DV3_EMERGENCY', orderId: id}), cooldown: emOrder(id)?.cooldownTurns ?? null}))},
  };
}
