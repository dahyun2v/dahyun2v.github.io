// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ④-2 차례 보고 카드 모델.
// 설계: docs/work-integration/20261023/screen-mockups/13-report/DESIGN.md(개발총괄 방) — 제목 = 대상 + 사건 · 상태 층 = 머리말 · 결과 줄은 엔진 차이가 있을 때만.
// 값: 앞뒤 차례의 공개 view 두 장 + 웹 함수(facilityCompletionLines · reportCardGroups) 그대로. 규칙 계산 없음 — 결과 수치는 엔진 economyForecast 의 차이.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Hud, Cards, Econ] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/hud-ink.mjs'), load('prototype/app/world/ink-cards.mjs'), load('prototype/src/campaign-economy.mjs')]);
const SCENE = {'city-lost': 'capture', 'city-taken': 'capture', asleep: 'other', awaken: 'joined', envoy: 'diplomacy', built: 'built'};
const FACILITY = Object.fromEntries(Object.entries(Econ.CITY_JOBS).map(([k, j]) => [k, j.name]));   // 웹 world.js 와 같은 이름표
const DANGER = /잃음|전사|포로|이탈|중상/;

/** 견본 장면(설계서 §5.3 시뮬레이션과 같은 방법): 고정 시작 · 수도 업에서 1차례에 둔전을 고르고 완공까지 차례를 넘긴다(사건은 '미룬다'로 자동). */
export function builtScene() {
  let s = R.createCampaign({startCities: 'fixed', factionId: 'F01', manualEndTurn: true, c31: false, council: false});
  const cid = s.factions[s.playerFactionId].capitalCityId;
  s = R.step(s, {type: 'CITY_JOB', cityId: cid, kind: 'tuntian'});
  for (let i = 0; i < 12; i++) {
    const before = R.view(s);
    s = R.step(s, {type: 'END_TURN'});
    for (let n = 0; s.phase === 'AI' && !s.gameResult && n < 500; n++) s = R.step(s, {type: 'ADVANCE_AI'});
    const after = R.view(s);
    const rows = Hud.facilityCompletionLines(before, after, FACILITY);
    if (rows.length) return {state: s, before, after, rows};
    for (let e = R.view(s).pendingEvent; e; e = R.view(s).pendingEvent) s = R.step(s, {type: 'EVENT_CHOICE', eventId: e.eventId, choiceId: e.choices.at(-1).id});
  }
  throw Error('둔전 완공 장면을 만들지 못함');
}

/** 결과 줄: 완공 = 그 성의 산출 차이(식량 · 생산, 0 이면 생략) · 성 획득 = 웹 카드 효과 글 · 그 밖 = 없음. */
function resultOf(kind, item, before, after) {
  if (kind === 'built') {
    const city = Object.values(after.ownCities ?? {}).find((c) => c.name === item.name);
    const prev = city && before.ownCities?.[city.cityId];
    if (!city || !prev) return null;
    for (const [key, label, icon] of [['food', '식량 산출', 'food'], ['production', '생산 산출', 'production']]) {
      const d = Math.round((Number(city.economyForecast?.[key]) || 0) - (Number(prev.economyForecast?.[key]) || 0));
      if (d) return {icon, label, value: `${d > 0 ? '+' : '−'}${Math.abs(d)}`, sign: Math.sign(d)};
    }
    return null;
  }
  if (kind === 'city-taken' && item.effects?.length) return {icon: 'wall', label: item.effects.join(' · '), value: '', sign: 0};
  return null;
}

/** 실제 판: 차례 넘김 전후 상태 → 카드 목록(완공 줄 = 웹 facilityCompletionLines · 다시 읽기 아님). hud-host stdio 'report' 가 쓴다. */
export function turnReport(beforeState, afterState) {
  const before = R.view(beforeState), after = R.view(afterState);
  return reportModel(before, after, Hud.facilityCompletionLines(before, after, FACILITY), {replay: false});
}

/** 카드 목록(한 차례 최대 2장 — 웹과 같음). replay = 다시 보기 줄로 연 카드(완공 큰 카드는 지금 게임에서 다시 읽기로만 열림). */
export function reportModel(before, after, rows, {replay = true} = {}) {
  const groups = Cards.reportCardGroups(before, after, rows, 2);
  const cards = groups.map((g, gi) => {
    const last = gi === groups.length - 1, first = g.items[0];
    const event = String(first.detail ?? '').split(' · ')[0];
    const title = g.kind === 'built' ? `${first.name} ${event}` : ({'city-lost': `${first.name} 잃음`, 'city-taken': `${first.name} 획득`}[g.kind] ?? `${first.name} ${event}`).trim();
    const city = Object.values(after.ownCities ?? {}).find((c) => c.name === first.name);
    const idle = g.kind === 'built' && city && !city.currentProduction;
    const result = resultOf(g.kind, first, before, after);
    const more = g.items.slice(1).map((it) => ({name: `${it.name} ${String(it.detail ?? '').split(' · ')[0]}`.trim(), result: resultOf(g.kind, it, before, after)?.value ?? ''}));
    const cityAction = ['city-lost', 'city-taken'].includes(g.kind) ? `${first.name} 보기` : null;
    return {
      kind: g.kind, header: `제${after.turn}차례 보고${replay ? ' · 다시 읽기' : ''}`,
      title: title + (g.items.length > 1 ? ` 외 ${g.items.length - 1}` : ''), danger: DANGER.test(title),
      result, more: more.slice(0, result ? 2 : 3), moreHidden: Math.max(0, more.length - (result ? 2 : 3)),
      production: idle && g.items.length === 1 ? {label: '현재 생산', state: '작업 없음'} : null,
      primary: !last ? '다음' : idle ? '생산 고르기' : cityAction ?? '지도로',
      secondary: !last || idle || cityAction ? '닫기' : null,
      // 고도 쪽이 잇는 뜻: next = 다음 보고 · production = 이 성 생산 고르기 · city = 이 성 보기 · map = 지도로(보고 끝)
      action: !last ? 'next' : idle ? 'production' : cityAction ? 'city' : 'map', cityId: city?.cityId ?? null,
      scene: `assets/ui-kit/own/screens-v4/report/scene-${SCENE[g.kind] ?? 'other'}.webp`,
    };
  });
  return {screen: 'report', turn: after.turn, cards};
}
