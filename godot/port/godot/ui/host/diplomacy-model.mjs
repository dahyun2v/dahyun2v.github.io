// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-24) — 화면 ⑤ 외교 모델.
// 설계: docs/work-integration/20261023/screen-mockups/11-diplomacy/DESIGN.md(개발총괄 방, 외교 B 자리 · 인물형).
// 값: view.diplomacy(엔진 공개) + diplomacyScreenFacts(웹 외교 화면이 쓰는 공개 사실) + 웹 낱말 함수(diplomacyLikelihood · diplomacyWarLine). 규칙 계산 없음.
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {readFileSync} from '../../../../tools/port/web/shims/node-fs.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT, officerArt, artHead} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, D, Hud] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/src/campaign-diplomacy.mjs'), load('prototype/app/world/hud-ink.mjs')]);
const STATE = {WAR: '전쟁 중', TRUCE: '휴전 중', ALLIANCE: '동맹 중'};
// 외교 만남 화면(10-25 · 문명식 대면) — 시험 대사(Claude WORK_TRIAL · Argon 다시 쓰기 대상) · 신용 벌점 값(엔진 axes 그대로)
// 10-25 v0.2(장수 설계 방 · Argon — 12군주 기본 26줄 + 사연 짝 16쌍 + 공용 v0.1): 찾는 차례 = 짝(말하는>듣는) → 말하는 군주 기본 → 공용
// 10-26 v0.5(장수 설계 방 · 사용자 "굿 좋아" — base 12군주 · pair 16쌍 · common, 관계 호칭) — 형식 같음 · v0.2 는 보관
const L2 = JSON.parse(readFileSync(resolve(ROOT, 'port/godot/ui/data/diplomacy-lines-v0.5.json'), 'utf8'));
const LINES = L2.common;
const AXES = JSON.parse(readFileSync(resolve(ROOT, 'docs/design-data/diplomacy-axes-v0.1.json'), 'utf8'));
const TONE = {positive: 'positive', neutral: 'neutral', negative: 'negative'};
/** 대사 한 마디: 짝 대사는 태도마다 2줄(기억 + 지금 태도)을 두 줄로 함께 · 기본 · 공용은 한 줄(차례마다 돌아가며). speaker = 화면 속 상대 군주 세력 · listener = 플레이어 세력 */
const say = (situation, tone, turn, speaker = null, listener = null) => {
  const t = TONE[tone] ?? 'neutral';
  const pair = L2.pair?.[`${speaker}>${listener}`]?.[situation]?.[t];
  if (Array.isArray(pair) && pair.length) return pair.join(String.fromCharCode(10));
  const pick = (src) => { const list = src?.[situation]?.[t] ?? src?.[situation]?.neutral; return Array.isArray(list) && list.length ? list[(turn ?? 0) % list.length] : null; };
  return pick(L2.base?.[speaker]) ?? pick(LINES) ?? '';
};
/** 첫 만남 응답 2줄(나 → 상대) = 플레이어 군주 기본 → 공용 */
const greet = (me) => L2.base?.[me]?.greetReply ?? LINES.greetReply;
const ICON = {WAR: 'hostile', TRUCE: 'neutral', ALLIANCE: 'alliance'};

/** 외교 만남 화면(문명식) 모델 — 앞 판 diplomacyModel 위에 무대(stage)를 얹는다.
 *  mode: 'first' 첫 만남 · 'talk' 일반 대화 · 'offer' 상대가 찾아온 제안 · 'answer' 방금 낸 제안의 답 · 'betray' 동맹 끝내기 확인. 없으면 엔진 상태로 고름. */
export function meetingModel(state, pickId = null, {mode = null} = {}) {
  const m = diplomacyModel(state, pickId);
  if (!m?.pick) return m;
  const v = R.view(state), d = v.diplomacy, p = m.pick, turn = state.turn;
  const tone = p.attitude?.tone ?? 'neutral';
  const incoming = (d.incoming ?? []).find((x) => x.from === p.id) ?? null;
  const facts = p.contact ? D.diplomacyScreenFacts(state, v.factionId, p.id) : null;
  const pair = state.c43?.pairs?.[D.diplomacyPair ? D.diplomacyPair(v.factionId, p.id) : [v.factionId, p.id].sort().join('|')];
  const result = facts?.result && (state.c43?.history ?? []).some((e) => e.turn === turn && ['ACCEPT', 'REJECT', 'GIFT'].includes(e.type)) ? facts.result : null;
  const stage = mode ?? (incoming ? 'offer' : result ? 'answer' : 'talk');
  const ruler = state.officers[state.factions[p.id]?.rulerId];
  const waiting = new Set((d.incoming ?? []).map((x) => x.from));
  const out = {...m, rows: m.rows.map((r) => ({...r, waiting: waiting.has(r.id)})), meeting: true, stage, rulerName: ruler?.name ?? p.name, factionLabel: `${p.name}군 · ${p.stateText}`, tone};
  if (stage === 'first') {
    out.line = say('first', tone, turn, p.id, v.factionId);
    const g = greet(v.factionId);
    out.replies = [{key: 'warm', text: g.warm}, {key: 'cool', text: g.cool}];
  } else if (stage === 'offer' && incoming) {
    const kind = incoming.kind;
    const t = D.diplomacyTiming(state, incoming.from, v.factionId, kind);
    out.line = say(kind === 'ALLIANCE' ? 'offerAlliance' : 'offerTruce', tone, turn, p.id, v.factionId);
    out.offer = {proposalId: incoming.proposalId, kind, title: kind === 'ALLIANCE' ? '동맹 제안' : '휴전 제안',
      meaning: kind === 'ALLIANCE' ? '다음 차례부터 서로 공격하지 않음 · 자동으로 돕지는 않음' : `다음 차례부터 ${t?.turns ?? 3}차례 서로 공격하지 않음`,
      expires: incoming.expiresTurn <= turn ? '이번 차례 안에 답하지 않으면 거절' : `${incoming.expiresTurn - turn + 1}차례 안에 답하지 않으면 거절`,
      accept: '받는다', reject: '거절한다'};
  } else if (stage === 'answer' && result) {
    out.line = say(result.type === 'ACCEPT' ? 'accept' : result.type === 'GIFT' ? 'gift' : 'reject', tone, turn, p.id, v.factionId);
    out.result = result.text;
  } else {
    out.line = say('talk', tone, turn, p.id, v.factionId);
  }
  // 동맹 중이면 '동맹 끝내기' 행 + 확인(S4) 값
  if (facts?.endAlliance && p.contact && pair?.state === 'ALLIANCE') {
    const early = pair.since !== undefined && turn - pair.since < AXES.trust.loss.earlyAllianceEnd.withinTurns;
    const trust = d.me?.trust ?? AXES.trust.start;
    out.pick.offers = [...out.pick.offers, {key: 'endAlliance', label: '동맹 끝내기', symbol: 'hostile', ok: !!facts.endAlliance.ok, effect: facts.endAlliance.ok ? '다음 차례부터 전쟁 상태' : facts.endAlliance.reason, right: early ? `신용 ${AXES.trust.loss.earlyAllianceEnd.value}` : '', detail: facts.endAlliance.effectLines.join(' · ')}];
    out.betray = {title: '동맹을 끝낸다', line: '다음 차례부터 전쟁 상태', trust: early ? `신용 ${trust} → ${Math.max(0, trust + AXES.trust.loss.earlyAllianceEnd.value)}` : null, note: early ? AXES.trust.loss.earlyAllianceEnd.text : '신용은 그대로', cancel: '그만둔다', ok: '끝낸다'};
    if (stage === 'betray') out.line = say('endNotice', tone, turn, p.id, v.factionId);
  }
  return out;
}

export function diplomacyModel(state, pickId = null) {
  const v = R.view(state), d = v.diplomacy;
  if (!d) return null;
  const ruler = (fid) => state.factions[fid]?.rulerId;
  const order = (f) => f.contact === false ? 3 : ({ALLIANCE: 0, TRUCE: 1, WAR: 2})[f.state] ?? 2;  // 설계서: 동맹 → 휴전 → 전쟁 → 미접촉 묶음
  const rows = [...d.factions].sort((a, b) => order(a) - order(b)).map((f) => ({id: f.factionId, name: f.name, contact: f.contact !== false, state: f.state, stateText: f.contact === false ? '아직 만나지 않음' : STATE[f.state] ?? '',
    icon: f.contact === false ? null : ICON[f.state] ?? 'neutral', art: f.contact === false ? null : officerArt(ruler(f.factionId)), head: f.contact === false ? null : artHead(officerArt(ruler(f.factionId)))}));
  const pick = d.factions.find((f) => f.factionId === pickId) ?? d.factions.find((f) => f.contact !== false) ?? d.factions[0];
  const facts = pick ? D.diplomacyScreenFacts(state, v.factionId, pick.factionId) : null;
  const known = pick?.contact !== false;
  // 둘째 줄(효과) — 설계서 §7 의 글: 선물 = 엔진 효과 줄 둘째(괄호 풀이는 툴팁), 휴전 = 엔진 적용 시점(diplomacyTiming),
  // 동맹 = 엔진 allianceEffect 를 설계서가 줄인 글(두 뜻 그대로 · 쉼표 0). 막혔으면 엔진 사유 그대로.
  const timing = pick ? D.diplomacyTiming(state, v.factionId, pick.factionId, 'TRUCE') : null;
  const effectOf = (key, c) => key === 'gift' ? String(c?.effectLines?.[1] ?? c?.effectLines?.[0] ?? '').replace(/\(.*\)$/, '').trim()
    : key === 'truce' ? `다음 차례부터 ${timing?.turns ?? 3}차례` : '서로 공격하지 않음 · 자동으로 돕지는 않음';
  const offer = (key, label, symbol, c, forecast) => ({key, label, symbol, ok: !!(known && c?.ok),
    effect: known ? (c?.ok ? effectOf(key, c) : c?.reason ?? '현재 실행 불가') : '',
    right: known ? (Number.isFinite(c?.cost) ? `인망 −${c.cost}` : forecast ? `수락 예상 ${forecast.label}` : '') : '',
    detail: known ? [c?.reason, ...(c?.effectLines ?? []), ...(forecast?.reasons ?? [])].filter(Boolean).join(' · ') : '아직 만나지 않음'});
  return {
    screen: 'diplomacy',
    me: {name: v.faction?.name ?? '우리', art: officerArt(v.faction.rulerId), head: artHead(officerArt(v.faction.rulerId)), trust: d.me?.trust ?? null, threat: d.me?.threat ?? null},
    rows: rows.map((r) => ({...r, selected: r.id === pick?.factionId})),
    pick: pick ? {
      id: pick.factionId, name: pick.name, contact: known, stateText: known ? STATE[pick.state] ?? '' : '아직 만나지 않음', icon: known ? ICON[pick.state] ?? 'neutral' : null,
      warLine: known ? Hud.diplomacyWarLine(d, pick.factionId) : '',
      art: known ? officerArt(ruler(pick.factionId)) : null,
      attitude: known ? {label: facts?.attitude?.label ?? '보통', tone: facts?.attitude?.tone ?? 'neutral', value: facts?.attitude?.value ?? pick.opinionOfMe ?? null} : null,
      reasons: known ? (pick.opinionReasons ?? []).slice(0, 3).map((r) => ({text: r.text, value: r.value, turnsLeft: r.turnsLeft ?? null})) : [],
      offers: [offer('gift', '선물', 'friendly', pick.canGift, null), offer('truce', '휴전 제안', 'neutral', pick.canPropose?.TRUCE, facts?.forecasts?.TRUCE),
        offer('alliance', '동맹 제안', 'alliance', pick.canPropose?.ALLIANCE, facts?.forecasts?.ALLIANCE)],
    } : null,
  };
}
