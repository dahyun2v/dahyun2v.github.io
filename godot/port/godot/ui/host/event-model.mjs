// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ④ 사건 · 선택지 모델.
// 설계: docs/work-integration/20261023/screen-mockups/12-event/DESIGN.md(개발총괄 방). 값: view.pendingEvent(엔진 공개) 그대로.
// 그림: 웹 world.js 와 같은 고르기(덱 사건 = 발동 조건별 E01~E06, 위기 = CRISIS) · 흑묵판 events-ink 우선.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {existsSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, Deck] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-event-deck.mjs')]);
const WHEN_ART = {FOOD_LOW: 'E03', OFFICER_PAIR: 'E05', PLACE: 'E06', AFTER_BATTLE: 'E04', CITY_BESIEGED: 'CRISIS', CITY_CAPTURED: 'E02', TURN_START: 'E01'};
const ROUTE = {history: '역사대로', twist: '다르게', defer: '미룬다'};

function eventArt(e) {
  const crisis = e.scale === 'CRISIS';
  const k = crisis ? 'CRISIS' : e.eventId.startsWith('EV-') ? (WHEN_ART[Deck.eventDeckCard(e.eventId)?.trigger?.when] ?? 'E01') : e.eventId;
  for (const rel of [`assets/ui-v3/events-ink/${k}.webp`, `assets/ui-v3/events/${k}.webp`, `assets/event-art/${k}_v1.jpg`])
    if (existsSync(resolve(ROOT, 'prototype', rel))) return rel;
  return null;
}

/** 견본 장면: 엔진의 사건 덱 함수로 사건 하나를 이 세력에 건다(테스트 c197 의 offer 와 같은 방법 — 값은 엔진이 계산). */
export function offerEvent(state, eventId) {
  const c = Deck.eventDeckCard(eventId);
  state.c22.pending[state.playerFactionId] = {eventId, factionId: state.playerFactionId, turn: state.turn, ...Deck.resolveEventRoles(state, c, state.playerFactionId, {})};
  state.eventDeck.seen.push({eventId, turn: state.turn});
  return state;
}

export function eventModel(state) {
  const v = R.view(state), e = v.pendingEvent;
  if (!e) return null;
  const p = state.c22?.pending?.[state.playerFactionId], roles = p?.roles ?? {};
  const people = Object.entries(roles).filter(([k, id]) => typeof id === 'string' && v.officers[id] && k !== 'city').map(([k, id]) => ({
    id, name: v.officers[id].name, role: Object.values(v.ownCities).find((c) => c.governorId === id) ? '태수' : Object.values(v.ownArmies).find((a) => a.commanderId === id) ? '부대장' : id === v.faction.rulerId ? '군주' : '장수',
    art: officerArt(id), head: artHead(officerArt(id))}));
  return {
    screen: 'event', eventId: e.eventId, scale: e.scale, title: e.title, place: `${e.scale === 'CRISIS' ? '위기' : '사건'} · ${e.cityName ?? ''}`.replace(/ · $/, ''),
    text: e.text, art: eventArt(e), people: people.length ? people : (e.officerNames ?? []).map((name) => ({name, role: ''})),
    choices: e.choices.map((c, i) => ({id: c.id, key: i + 1, route: ROUTE[c.id] ?? '', label: String(c.label).replace(/^(역사대로|다르게)\s*—\s*/, ''),
      lines: previewLines(c), blocked: c.blockedReason ?? null, confirm: !!c.oath || e.scale === 'CRISIS'})),
  };
}

/** 효과 줄: 엔진 미리보기 글(contentPreview)을 줄로 나눈다 — 새 숫자를 만들지 않는다. 맹세는 '맹세 ·' 줄 + 성공/실패. */
function previewLines(c) {
  if (c.oath) {
    const parts = String(c.contentPreview ?? c.preview ?? '').split(' | ');
    const goal = parts.find((x) => x.startsWith('맹세:'))?.replace('맹세:', '맹세 ·').trim();
    const ok = parts.find((x) => x.startsWith('성공:'))?.replace('성공:', '성공 ·').trim();
    const ng = parts.find((x) => x.startsWith('실패:'))?.replace('실패:', '실패 ·').trim();
    return [goal, [ok, ng].filter(Boolean).join('   ')].filter(Boolean);
  }
  const t = String(c.actualPreview?.text ?? c.preview ?? '').trim();
  return [t && t !== '즉시: 효과 없음' ? t : '효과 없음'];
}
