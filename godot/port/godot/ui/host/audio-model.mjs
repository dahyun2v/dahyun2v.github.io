// @ts-check
// 고도 UI/UX 방 (Claude, 2026-10-25) — 소리 신호 모델. 웹 화면의 효과음 · 배경음 규칙(prototype/app/world/sfx.mjs commandSounds · transitionSounds,
// world.js bgmScene)을 그대로 불러 명령 하나의 전후 상태에서 '낼 소리 목록'과 '지도 곡'을 고른다. 소리 규칙을 새로 만들지 않는다.
// 고도 쪽 UiAudio(port/godot/ui/common/ui_audio.gd)가 응답의 audio 를 받아 튼다. 사용자 10-25 "소리가 안 난다"(총괄 전달).
import {resolve} from '../../../../tools/port/web/shims/node-path.mjs';
import {pathToFileURL} from '../../../../tools/port/web/shims/node-url.mjs';
import {ROOT} from './hud-model.mjs';

const load = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const [R, S, MM] = await Promise.all([load('prototype/src/campaign-runtime.mjs'), load('prototype/app/world/sfx.mjs'), load('prototype/src/campaign-map-model.mjs')]);

/** 세력 이름(플레이어가 만난 세력만 — 못 만난 세력은 '알 수 없는 세력'). 웹 factionName 과 같은 'OO군'. */
export function factionLabel(state, fid) {
  const v = R.view(state), me = state.playerFactionId;
  if (fid === me) return `${state.factions[fid]?.name ?? fid}군`;
  const f = (v.diplomacy?.factions ?? []).find((x) => x.factionId === fid);
  return f && f.contact !== false ? `${f.name}군` : '알 수 없는 세력';
}

/** 차례 띠(웹 world.js showBanner 그대로): 새 차례 = 제목 campaignDate · 부제 'OO군의 차례'. */
export function turnBanner(state) {
  return {turn: state.turn, title: MM.campaignDate(state.turn), sub: `${factionLabel(state, state.playerFactionId)}의 차례`};
}

/** 지도 곡(웹 bgmScene 의 지도 부분 — 교전 8초 · 군의 · 성 · 창 여닫이는 고도 쪽이 고른다): 결말 > 위기 > 전시(보이는 적이 내 성 · 부대 5칸 안) > 평시, 지도 곡은 두 차례마다 둘째 곡. */
export function mapScene(state, v = R.view(state)) {
  const g = state.gameResult;
  if (g) return ['UNIFICATION', 'TURN_LIMIT'].includes(g.type) && (g.winnerFactionId ?? state.playerFactionId) === state.playerFactionId ? 'victory' : 'defeat';
  const ev = v.pendingEvent;
  if (ev?.scale === 'CRISIS' || ev?.eventId === 'CRISIS_HEGEMONY') return 'crisis';
  const T = state.tiles, dist = (a, b) => { const p = T[a], q = T[b]; if (!p || !q) return 99; const dq = p.q - q.q, dr = p.r - q.r; return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2; };
  const mine = [...Object.values(v.ownArmies ?? {}).map((a) => a.tileId), ...Object.values(v.ownCities ?? {}).map((c) => c.tileId)];
  const ally = new Set((v.diplomacy?.factions ?? []).filter((f) => f.state === 'ALLIANCE').map((f) => f.factionId));
  const war = Object.values(v.knowledge?.observedArmies ?? {}).some((a) => a.factionId !== state.playerFactionId && !ally.has(a.factionId) && v.knowledge.tiles?.[a.tileId] === 'VISIBLE' && mine.some((t) => dist(t, a.tileId) <= 5));
  const alt = Math.floor((state.turn ?? 0) / 2) % 2 === 1;
  return war ? (alt ? 'map-war-b' : 'map-war') : (alt ? 'map-peace-b' : 'map-peace');
}

/** 명령 하나의 소리: {sfx: [[이름, 늦춤 ms, 크기 배율]], bgm: 지도 곡, combat: 교전이 있었나}. 웹 worldSfx.command 와 같은 목록(새 차례 = settlement 소리 · 성 함락 · 결말 징 포함). */
export function commandAudio(request, before, after) {
  const combat = after.lastCombat && after.lastCombat !== before?.lastCombat ? after.lastCombat : null;
  const av = R.view(after), bv = before ? R.view(before) : null;
  const all = S.commandSounds({request, before, state: after, combat, deferImpact: false, managedFx: false, feel: false});
  const contactNames = new Set(['clash', 'arrows', 'charge', 'rout']);
  const combatFallback = combat ? all.filter(([n]) => contactNames.has(n)) : [];
  const sfx = combat ? all.filter(([n]) => !contactNames.has(n)) : all;
  const names = new Set(sfx.map(([n]) => n));
  const events = bv ? S.transitionSounds(bv, av) : [];
  if (!after.gameResult && !sfx.some(([n]) => ['rout', 'capture', 'warhorn', 'defeat-dirge', 'gong'].includes(n)) && Object.values(after.factions ?? {}).some((f) => f.alive === false && before?.factions?.[f.factionId]?.alive)) events.push('gong');
  for (const n of events) if (!names.has(n)) sfx.push([n, 0, n === 'warcry' ? 0.5 : 1]);
  // 새 차례 신호(웹 settlementAudio)는 응답 때가 아니라 '내 차례' 띠가 뜰 때 고도 TurnCue 가 낸다(보고 · 사건 · 만남 뒤 — 10-25 사용자 '내 턴이 왔다는 게 잘 인식이 안 됨')
  const turn = (after.turn ?? 0) > (before?.turn ?? 0) && !after.gameResult ? turnBanner(after) : null;
  const armies = {};
  // Only projected armies, including vanished own units needed by the outgoing animation.
  for (const v of [bv, av]) for (const a of Object.values({...v?.knowledge?.observedArmies, ...v?.ownArmies})) {
    if (a.factionId !== after.playerFactionId && v?.knowledge?.tiles?.[a.tileId] !== 'VISIBLE') continue;
    armies[a.armyId] = {officerId: a.commanderId, own: a.factionId === after.playerFactionId, troops: (a.troopCount ?? 0) * 10};
  }
  return {sfx, combatFallback, armies, voices: officerVoices(request, before, after), bgm: mapScene(after, av), combat: !!combat, ...(turn ? {turn} : {})};
}

/** UI-only events without an animation cue; own officers only. */
export function officerVoices(request, before, after) {
  const voices = [], me = after.playerFactionId;
  const a = after.armies?.[request?.armyId] ?? before?.armies?.[request?.armyId];
  if (a?.factionId === me && ['QUEUE_MOVE', 'MOVE_UNIT'].includes(request?.type)) voices.push({officerId: a.commanderId, slot: 'move'});
  const level = (s, id) => s?.campaignGrowth?.officers?.[id]?.track?.growthStates?.[id]?.level ?? 1;
  for (const [id, o] of Object.entries(after.officers ?? {})) {
    if (o.allegianceFactionId !== me) continue;
    if (before?.officers?.[id]?.allegianceFactionId !== me) voices.push({officerId: id, slot: 'recruit'});
    else if (level(after, id) > level(before, id)) voices.push({officerId: id, slot: 'levelup'});
  }
  return voices.slice(0, 1);
}
